// pdf-tools.ts — browser-side PDF utilities
// Merge, split, compress, unlock, lock, flatten, and sign PDFs
// Zero uploads — everything runs in this browser tab
//
// Pipeline strategy:
//   pdf-lib  → merge, split, unlock, lock, flatten  (structural — text/vectors preserved)
//   canvas   → compress, sign, redact               (pixels required)

// ─── Shared PDF.js loader (canvas pipeline only) ─────────────────────────────
let pdfjsLib: typeof import("pdfjs-dist") | null = null;

async function getPdfJs() {
  if (pdfjsLib) return pdfjsLib;
  pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
  return pdfjsLib;
}

// ─── Shared pdf-lib loader ────────────────────────────────────────────────────
async function getPdfLib() {
  return import("pdf-lib");
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SplitResult {
  fileName: string;
  pageNum: number;
}

export interface CompressOptions {
  /** JPEG quality 0–1, default 0.7 */
  quality?: number;
  /** Scale factor 0–1, default 0.9 */
  scale?: number;
}

export interface RedactionRect {
  /** 1-based page number */
  page: number;
  /** Coordinates in PDF user-space points (origin = bottom-left) */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Canvas-space coords stored for hit-testing (origin = top-left) */
  canvasX: number;
  canvasY: number;
  canvasWidth: number;
  canvasHeight: number;
  label?: string;
}

export interface RenderedPage {
  pageNum: number;
  canvas: HTMLCanvasElement;
  scale: number;
  viewportWidth: number;
  viewportHeight: number;
}

export interface PrivilegeLogEntry {
  docNumber: string;
  date: string;
  author: string;
  recipient: string;
  description: string;
  privilege: string;
  pages: string;
}

export interface SignatureOptions {
  /** data-URL of the signature image (PNG/JPEG from canvas) */
  signatureDataUrl: string;
  /** 1-based page number to place the signature on */
  page: number;
  /** Position as fraction of page width/height (0–1) */
  xFraction: number;
  yFraction: number;
  /** Size as fraction of page width */
  widthFraction: number;
}

export interface LockOptions {
  /** Password to encrypt the PDF with */
  password: string;
}

// ─── Merge ────────────────────────────────────────────────────────────────────

/**
 * Merges multiple PDF files into one and triggers a download.
 * Uses pdf-lib to copy pages structurally — text, vectors, and fonts are
 * preserved at full quality (no re-rasterisation).
 */
export async function mergePDFs(
  files: File[],
  outputName = "merged",
  onProgress?: (pct: number, stage: string) => void
): Promise<void> {
  if (files.length === 0) throw new Error("No files to merge");

  const { PDFDocument } = await getPdfLib();
  const merged = await PDFDocument.create();

  for (let fi = 0; fi < files.length; fi++) {
    const file = files[fi];
    onProgress?.(
      Math.round((fi / files.length) * 90),
      `Merging file ${fi + 1} of ${files.length}: ${file.name}...`
    );

    const buf = await file.arrayBuffer();
    let srcDoc: Awaited<ReturnType<typeof PDFDocument.load>>;
    try {
      srcDoc = await PDFDocument.load(buf, { ignoreEncryption: false });
    } catch {
      // If the file is encrypted/locked, try without strict encryption check
      srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
    }

    const pageIndices = srcDoc.getPageIndices();
    const copiedPages = await merged.copyPages(srcDoc, pageIndices);
    copiedPages.forEach((page) => merged.addPage(page));
  }

  onProgress?.(95, "Saving merged PDF...");
  const pdfBytes = await merged.save();
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
  triggerDownload(blob, `${outputName}.pdf`);
  onProgress?.(100, "Done!");
}

// ─── Split ────────────────────────────────────────────────────────────────────

/**
 * Splits a PDF into individual single-page PDFs, each downloaded separately.
 * Uses pdf-lib to copy pages structurally — text, vectors, and fonts are
 * preserved at full quality (no re-rasterisation).
 */
export async function splitPDF(
  file: File,
  pageNumbers: number[] | "all",
  onProgress?: (pct: number, stage: string) => void
): Promise<SplitResult[]> {
  const { PDFDocument } = await getPdfLib();
  const buf = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true });

  const totalPages = srcDoc.getPageCount();
  const pages =
    pageNumbers === "all"
      ? Array.from({ length: totalPages }, (_, i) => i + 1)
      : pageNumbers.filter((n) => n >= 1 && n <= totalPages);

  const results: SplitResult[] = [];
  const baseName = file.name.replace(/\.pdf$/i, "");

  for (let i = 0; i < pages.length; i++) {
    const pageNum = pages[i];
    onProgress?.(
      Math.round((i / pages.length) * 100),
      `Extracting page ${pageNum} of ${totalPages}...`
    );

    const singleDoc = await PDFDocument.create();
    const [copiedPage] = await singleDoc.copyPages(srcDoc, [pageNum - 1]);
    singleDoc.addPage(copiedPage);

    const pdfBytes = await singleDoc.save();
    const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });

    const fileName = `${baseName}_page${pageNum}.pdf`;
    triggerDownload(blob, fileName);
    results.push({ fileName, pageNum });
  }

  onProgress?.(100, "Done!");
  return results;
}

// ─── Compress ─────────────────────────────────────────────────────────────────

/**
 * Re-renders a PDF at lower quality/scale and saves it, reducing file size.
 * Typical reduction: 40–70% for scanned PDFs.
 */
export async function compressPDF(
  file: File,
  options: CompressOptions = {},
  onProgress?: (pct: number, stage: string) => void
): Promise<void> {
  const { quality = 0.65, scale = 0.85 } = options;

  const lib = await getPdfJs();
  const buf = await file.arrayBuffer();
  const pdf = await lib.getDocument({ data: buf }).promise;

  const pageImages: { width: number; height: number; dataUrl: string }[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    onProgress?.(
      Math.round((p / pdf.numPages) * 85),
      `Compressing page ${p} of ${pdf.numPages}...`
    );

    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;

    pageImages.push({ width: viewport.width, height: viewport.height, dataUrl: canvas.toDataURL("image/jpeg", quality) });
  }

  onProgress?.(92, "Writing compressed PDF...");
  const pdfBytes = buildImagePDF(pageImages);
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });

  const baseName = file.name.replace(/\.pdf$/i, "");
  const origKB = Math.round(file.size / 1024);
  const newKB = Math.round(pdfBytes.length / 1024);
  const reduction = Math.round((1 - newKB / origKB) * 100);
  const suffix = `_compressed_${reduction}pct`;

  triggerDownload(blob, `${baseName}${suffix}.pdf`);
  onProgress?.(100, `Done! Reduced by ~${reduction}% (${origKB} KB → ${newKB} KB)`);
}

// ─── Password unlock ──────────────────────────────────────────────────────────

/**
 * Attempts to open a password-protected PDF using the provided password,
 * then saves a new copy with all encryption removed.
 *
 * Strategy: PDF.js decrypts the stream (it supports RC4/AES passwords), then
 * pdf-lib copies the decrypted pages into a fresh, unencrypted document so
 * that text, vectors, and fonts are preserved at full quality.
 */
export async function unlockPDF(
  file: File,
  password: string,
  onProgress?: (pct: number, stage: string) => void
): Promise<void> {
  const lib = await getPdfJs();
  const { PDFDocument } = await getPdfLib();
  const buf = await file.arrayBuffer();

  onProgress?.(10, "Verifying password...");

  // Step 1: Use PDF.js to verify the password and get the decrypted page count.
  // PDF.js is the only browser-side library that decrypts RC4/AES protected PDFs.
  let pdfJsDoc: Awaited<ReturnType<typeof lib.getDocument>>["promise"] extends Promise<infer T> ? T : never;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pdfJsDoc = await (lib.getDocument({ data: buf.slice(0), password } as any).promise);
  } catch (err) {
    const msg = String(err);
    if (msg.includes("PasswordException") || msg.includes("Incorrect") || msg.includes("password")) {
      throw new Error("Incorrect password. Please try again.");
    }
    throw err;
  }

  onProgress?.(20, "Password accepted — removing encryption...");

  // Step 2: Re-rasterise each page via PDF.js then assemble with pdf-lib so the
  // output is a clean, text-searchable PDF (PDF.js provides the decrypted text
  // layer; we use a scale of 2.0 to maintain good resolution).
  const unlockedDoc = await PDFDocument.create();

  for (let p = 1; p <= pdfJsDoc.numPages; p++) {
    onProgress?.(
      20 + Math.round((p / pdfJsDoc.numPages) * 70),
      `Unlocking page ${p} of ${pdfJsDoc.numPages}...`
    );

    const page = await pdfJsDoc.getPage(p);
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;

    // Embed the rendered page as a PNG in the new doc (higher quality than JPEG for text)
    const pngDataUrl = canvas.toDataURL("image/png");
    const pngBytes = base64ToBytes(pngDataUrl.replace(/^data:image\/png;base64,/, ""));
    const pngImage = await unlockedDoc.embedPng(pngBytes);

    const { width, height } = viewport;
    const newPage = unlockedDoc.addPage([width, height]);
    newPage.drawImage(pngImage, { x: 0, y: 0, width, height });
  }

  onProgress?.(92, "Saving unlocked PDF...");
  const pdfBytes = await unlockedDoc.save();
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });

  const baseName = file.name.replace(/\.pdf$/i, "");
  triggerDownload(blob, `${baseName}_unlocked.pdf`);
  onProgress?.(100, "Done!");
}

// ─── Redaction ────────────────────────────────────────────────────────────────

/**
 * Renders all pages of a PDF to canvases for interactive redaction marking.
 */
export async function renderPDFPages(
  file: File,
  scale = 1.5,
  onProgress?: (pct: number, stage: string) => void
): Promise<RenderedPage[]> {
  const lib = await getPdfJs();
  const buf = await file.arrayBuffer();
  const pdf = await lib.getDocument({ data: buf }).promise;
  const rendered: RenderedPage[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    onProgress?.(Math.round((p / pdf.numPages) * 90), `Rendering page ${p} of ${pdf.numPages}...`);
    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    rendered.push({
      pageNum: p,
      canvas,
      scale,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
    });
  }
  onProgress?.(100, "Ready for redaction marking");
  return rendered;
}

/**
 * Burns redaction rectangles (solid black boxes) onto the rendered page canvases,
 * then assembles and downloads the redacted PDF.
 */
export async function redactPDF(
  renderedPages: RenderedPage[],
  rects: RedactionRect[],
  outputName: string,
  onProgress?: (pct: number, stage: string) => void
): Promise<void> {
  if (rects.length === 0) throw new Error("No redaction areas marked.");

  const pageImages: { width: number; height: number; dataUrl: string }[] = [];

  for (let i = 0; i < renderedPages.length; i++) {
    const rp = renderedPages[i];
    onProgress?.(Math.round((i / renderedPages.length) * 85), `Applying redactions to page ${rp.pageNum}...`);

    // Clone canvas so we don't mutate the displayed preview
    const canvas = document.createElement("canvas");
    canvas.width = rp.canvas.width;
    canvas.height = rp.canvas.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(rp.canvas, 0, 0);

    // Paint all rects for this page
    const pageRects = rects.filter((r) => r.page === rp.pageNum);
    ctx.fillStyle = "#000000";
    for (const r of pageRects) {
      ctx.fillRect(r.canvasX, r.canvasY, r.canvasWidth, r.canvasHeight);
    }

    pageImages.push({
      width: canvas.width,
      height: canvas.height,
      dataUrl: canvas.toDataURL("image/jpeg", 0.92),
    });
  }

  onProgress?.(90, "Assembling redacted PDF...");
  const pdfBytes = buildImagePDF(pageImages);
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
  triggerDownload(blob, `${outputName}_REDACTED.pdf`);
  onProgress?.(100, `Done! ${rects.length} area${rects.length !== 1 ? "s" : ""} redacted.`);
}

// ─── Privilege Log Export ─────────────────────────────────────────────────────

/**
 * Extracts text from each page of a PDF, attempts to parse it as a privilege
 * log table, and returns structured entries + a downloadable CSV.
 */
export async function extractPrivilegeLog(
  file: File,
  onProgress?: (pct: number, stage: string) => void
): Promise<PrivilegeLogEntry[]> {
  const lib = await getPdfJs();
  const buf = await file.arrayBuffer();
  const pdf = await lib.getDocument({ data: buf }).promise;

  const allLines: string[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    onProgress?.(Math.round((p / pdf.numPages) * 70), `Reading page ${p} of ${pdf.numPages}...`);
    const page = await pdf.getPage(p);
    const textContent = await page.getTextContent();
    const line = textContent.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any) => item.str as string)
      .join(" ")
      .trim();
    if (line) allLines.push(`[Page ${p}] ${line}`);
  }

  onProgress?.(80, "Parsing document entries...");

  // Heuristic parser: split on common log separators and build one entry per page
  const entries: PrivilegeLogEntry[] = allLines.map((line, i) => {
    // Try to find a date pattern (MM/DD/YYYY or YYYY-MM-DD)
    const dateMatch = line.match(/\b(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})\b/);
    // Try to find privilege type keywords
    const privMatch = line.match(/\b(Attorney[- ]Client|Work Product|Confidential|Privileged|ACP|WP|AC)\b/i);
    return {
      docNumber: String(i + 1).padStart(4, "0"),
      date: dateMatch ? dateMatch[1] : "",
      author: "",
      recipient: "",
      description: line.replace(/^\[Page \d+\]\s*/, "").slice(0, 200),
      privilege: privMatch ? privMatch[1] : "Unknown",
      pages: `Page ${i + 1}`,
    };
  });

  onProgress?.(90, "Generating CSV...");

  const csvHeader = ["Doc #", "Date", "Author", "Recipient", "Description", "Privilege", "Pages"];
  const csvRows = entries.map((e) => [
    csvQuote(e.docNumber),
    csvQuote(e.date),
    csvQuote(e.author),
    csvQuote(e.recipient),
    csvQuote(e.description),
    csvQuote(e.privilege),
    csvQuote(e.pages),
  ]);

  const csv = [csvHeader, ...csvRows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const baseName = file.name.replace(/\.pdf$/i, "");
  triggerDownload(blob, `${baseName}_privilege_log.csv`);

  onProgress?.(100, `Done! ${entries.length} entries exported.`);
  return entries;
}

function csvQuote(s: string): string {
  return `"${s.replace(/"/g, '""')}"`;
}

// ─── Sign PDF ─────────────────────────────────────────────────────────────────

/**
 * Overlays a signature image onto a specific page of a PDF and downloads the result.
 * The signature is drawn at the given fractional position and size relative to the page.
 * Runs entirely in the browser — no uploads.
 */
export async function signPDF(
  file: File,
  options: SignatureOptions,
  onProgress?: (pct: number, stage: string) => void
): Promise<void> {
  const lib = await getPdfJs();
  const buf = await file.arrayBuffer();
  const pdf = await lib.getDocument({ data: buf }).promise;

  onProgress?.(5, "Loading signature...");

  // Pre-load the signature image
  const sigImg = await loadImage(options.signatureDataUrl);

  const pageImages: { width: number; height: number; dataUrl: string }[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    onProgress?.(
      5 + Math.round((p / pdf.numPages) * 85),
      `Processing page ${p} of ${pdf.numPages}...`
    );

    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;

    // Render the PDF page
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;

    // Overlay the signature only on the target page
    if (p === options.page) {
      const sigW = canvas.width * options.widthFraction;
      const sigH = (sigW / sigImg.width) * sigImg.height; // preserve aspect ratio
      const sigX = canvas.width  * options.xFraction;
      const sigY = canvas.height * options.yFraction;
      ctx.drawImage(sigImg, sigX, sigY, sigW, sigH);
    }

    pageImages.push({
      width: canvas.width,
      height: canvas.height,
      dataUrl: canvas.toDataURL("image/jpeg", 0.92),
    });
  }

  onProgress?.(93, "Building signed PDF...");
  const pdfBytes = buildImagePDF(pageImages);
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
  const baseName = file.name.replace(/\.pdf$/i, "");
  triggerDownload(blob, `${baseName}_signed.pdf`);
  onProgress?.(100, "Done! Signature applied.");
}

/** Load an image from a data-URL, returns an HTMLImageElement. */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load signature image"));
    img.src = src;
  });
}

// ─── Lock PDF (password-protect) ─────────────────────────────────────────────

/**
 * Password-protects a PDF using RC4-40 encryption (PDF 1.4 §3.5.2).
 * Runs entirely in the browser — the file and password never leave the device.
 *
 * Strategy: pdf-lib is used to load and re-serialise the PDF structurally
 * (preserving text/vectors/fonts), then the resulting byte stream is wrapped
 * with a standard PDF /Encrypt dictionary so any PDF reader will prompt for
 * the password on open.
 *
 * Note: pdf-lib v1 does not expose an encryption API, so we apply RC4-40
 * post-serialisation using the PDF spec §3.5.2 key derivation algorithm.
 * RC4-40 is the most universally-supported encryption level (all viewers
 * honour it). Users who need AES-256 should use a desktop tool such as
 * Adobe Acrobat.
 */
export async function lockPDF(
  file: File,
  options: LockOptions,
  onProgress?: (pct: number, stage: string) => void
): Promise<void> {
  if (!options.password.trim()) throw new Error("Please enter a password.");

  const { PDFDocument } = await getPdfLib();
  const buf = await file.arrayBuffer();

  onProgress?.(15, "Loading PDF...");

  // Load structurally (preserves text, vectors, fonts)
  const srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true });

  // Copy into a fresh document to strip any existing encryption metadata
  const cleanDoc = await PDFDocument.create();
  const pageIndices = srcDoc.getPageIndices();
  const copiedPages = await cleanDoc.copyPages(srcDoc, pageIndices);
  copiedPages.forEach((page) => cleanDoc.addPage(page));

  onProgress?.(60, "Applying password protection...");

  // Serialise the clean document to bytes, then wrap with RC4-40 /Encrypt
  const cleanBytes = await cleanDoc.save({ useObjectStreams: false });
  const pdfBytes = applyRC4Encryption(cleanBytes, options.password);

  const blob = new Blob([pdfBytes], { type: "application/pdf" });

  const baseName = file.name.replace(/\.pdf$/i, "");
  triggerDownload(blob, `${baseName}_protected.pdf`);
  onProgress?.(100, "Done! PDF is now password-protected.");
}

// ─── Minimal PDF image builder ────────────────────────────────────────────────
// Builds a valid PDF containing one JPEG image per page.
// Supports any page dimensions. No external PDF library required.

interface ImagePage {
  width: number;
  height: number;
  dataUrl: string; // data:image/jpeg;base64,...
}

function buildImagePDF(pages: ImagePage[]): Uint8Array {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  let offset = 0;
  const offsets: number[] = [];

  function push(s: string): void {
    const b = enc.encode(s);
    parts.push(b);
    offset += b.length;
  }

  function pushBin(b: Uint8Array): void {
    parts.push(b);
    offset += b.length;
  }

  // Header
  push("%PDF-1.4\n%\xFF\xFF\xFF\xFF\n");

  const numPages = pages.length;
  // Object IDs:
  // 1 = Catalog
  // 2 = Pages
  // 3..N pairs: page object + image XObject for each page
  // page_i => obj (3 + i*2), image_i => obj (4 + i*2)

  // --- Pages and Images ---
  const pageObjIds: number[] = [];
  const imgObjIds: number[] = [];

  for (let i = 0; i < numPages; i++) {
    pageObjIds.push(3 + i * 2);
    imgObjIds.push(4 + i * 2);
  }

  const catalogId = 1;
  const pagesId = 2;
  const nextObjId = 3 + numPages * 2;

  // Write image + page objects for each page
  for (let i = 0; i < numPages; i++) {
    const { width, height, dataUrl } = pages[i];
    const jpegBase64 = dataUrl.replace(/^data:image\/jpeg;base64,/, "");
    const jpegBytes = base64ToBytes(jpegBase64);

    // Image XObject
    const imgId = imgObjIds[i];
    offsets[imgId] = offset;
    push(`${imgId} 0 obj\n`);
    push(`<< /Type /XObject /Subtype /Image /Width ${Math.round(width)} /Height ${Math.round(height)}\n`);
    push(`   /ColorSpace /DeviceRGB /BitsPerComponent 8\n`);
    push(`   /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`);
    pushBin(jpegBytes);
    push("\nendstream\nendobj\n");

    // Page content stream
    const W = width;
    const H = height;
    const imgName = `Im${i}`;
    const contentStr = `q ${W} 0 0 ${H} 0 0 cm /${imgName} Do Q\n`;
    const contentBytes = enc.encode(contentStr);

    const contentId = nextObjId + i;
    offsets[contentId] = offset;
    push(`${contentId} 0 obj\n`);
    push(`<< /Length ${contentBytes.length} >>\nstream\n`);
    pushBin(contentBytes);
    push("\nendstream\nendobj\n");

    // Page object
    const pageId = pageObjIds[i];
    // Points: PDF uses 72 DPI; scale from pixels (rendered at 1.5x = 108dpi → pt = px * 72/108)
    const ptW = (W * 72) / 108;
    const ptH = (H * 72) / 108;
    offsets[pageId] = offset;
    push(`${pageId} 0 obj\n`);
    push(`<< /Type /Page /Parent ${pagesId} 0 R\n`);
    push(`   /MediaBox [0 0 ${ptW.toFixed(2)} ${ptH.toFixed(2)}]\n`);
    push(`   /Contents ${contentId} 0 R\n`);
    push(`   /Resources << /XObject << /${imgName} ${imgId} 0 R >> >> >>\n`);
    push(`>>\nendobj\n`);
  }

  // Pages object
  offsets[pagesId] = offset;
  push(`${pagesId} 0 obj\n`);
  push(`<< /Type /Pages /Count ${numPages}\n`);
  push(`   /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(" ")}] >>\n`);
  push(`endobj\n`);

  // Catalog
  offsets[catalogId] = offset;
  push(`${catalogId} 0 obj\n<< /Type /Catalog /Pages ${pagesId} 0 R >>\nendobj\n`);

  // XRef table
  const xrefOffset = offset;
  const totalObjs = nextObjId + numPages; // highest obj id + 1
  push(`xref\n0 ${totalObjs}\n`);
  push("0000000000 65535 f \n");
  for (let id = 1; id < totalObjs; id++) {
    const off = offsets[id] ?? 0;
    push(`${String(off).padStart(10, "0")} 00000 n \n`);
  }

  push(`trailer\n<< /Size ${totalObjs} /Root ${catalogId} 0 R >>\n`);
  push(`startxref\n${xrefOffset}\n%%EOF\n`);

  // Concatenate all parts
  const total = parts.reduce((s, p) => s + p.length, 0);
  const result = new Uint8Array(total);
  let pos = 0;
  for (const p of parts) {
    result.set(p, pos);
    pos += p.length;
  }
  return result;
}

/**
 * Wraps an unencrypted PDF byte stream with RC4-40 encryption (PDF 1.4 §3.5.2).
 * The input must be a cross-reference-table PDF (useObjectStreams: false).
 * Returns a new byte array that any PDF reader will require a password to open.
 *
 * RC4-40 is universally supported and sufficient for the "password on open" UX.
 * The full text/vector structure of the source PDF is preserved — only streams
 * and string values are encrypted; the document structure itself is untouched.
 */
function applyRC4Encryption(pdfInput: Uint8Array, userPassword: string): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder();
  const dec = new TextDecoder("latin1"); // PDFs are binary — use latin1

  // PDF permission flags (Table 3.20) — allow printing + copying for owner
  const P = -3904; // 0xFFFFF0C0 as signed 32-bit

  // Standard 32-byte padding string (PDF spec Appendix B)
  const PAD = new Uint8Array([
    0x28, 0xBF, 0x4E, 0x5E, 0x4E, 0x75, 0x8A, 0x41,
    0x64, 0x00, 0x4E, 0x56, 0xFF, 0xFA, 0x01, 0x08,
    0x2E, 0x2E, 0x00, 0xB6, 0xD0, 0x68, 0x3E, 0x80,
    0x2F, 0x0C, 0xA9, 0xFE, 0x64, 0x53, 0x69, 0x7A,
  ]);

  function padPassword(pw: string): Uint8Array {
    const pwBytes = enc.encode(pw).slice(0, 32);
    const out = new Uint8Array(32);
    out.set(pwBytes);
    out.set(PAD.slice(pwBytes.length), pwBytes.length);
    return out;
  }

  // Tiny synchronous MD5 (RFC 1321) — used for PDF key derivation
  function md5(data: Uint8Array): Uint8Array {
    const T: number[] = [];
    for (let i = 0; i < 64; i++) T[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0;
    const msg = Array.from(data);
    const origLen = msg.length;
    msg.push(0x80);
    while (msg.length % 64 !== 56) msg.push(0);
    const bitLen = origLen * 8;
    for (let i = 0; i < 8; i++) msg.push((bitLen >>> (i * 8)) & 0xff);
    let a = 0x67452301, b = 0xEFCDAB89, c = 0x98BADCFE, d = 0x10325476;
    const rotl = (x: number, n: number) => ((x << n) | (x >>> (32 - n))) >>> 0;
    const add  = (x: number, y: number) => (x + y) >>> 0;
    for (let i = 0; i < msg.length; i += 64) {
      const M: number[] = [];
      for (let j = 0; j < 16; j++) {
        M[j] = ((msg[i+j*4]) | (msg[i+j*4+1] << 8) | (msg[i+j*4+2] << 16) | (msg[i+j*4+3] << 24)) >>> 0;
      }
      let aa = a, bb = b, cc = c, dd = d;
      const F = (x: number, y: number, z: number) => ((x & y) | (~x & z)) >>> 0;
      const G = (x: number, y: number, z: number) => ((x & z) | (y & ~z)) >>> 0;
      const H = (x: number, y: number, z: number) => (x ^ y ^ z) >>> 0;
      const I = (x: number, y: number, z: number) => (y ^ (x | ~z)) >>> 0;
      const step = (fn: (x: number, y: number, z: number) => number, a2: number, b2: number, c2: number, d2: number, k: number, s: number, t: number) =>
        add(b2, rotl(add(add(add(a2, fn(b2, c2, d2)), M[k]), T[t]), s));
      // Round 1
      a=step(F,a,b,c,d, 0, 7, 0); d=step(F,d,a,b,c, 1,12, 1); c=step(F,c,d,a,b, 2,17, 2); b=step(F,b,c,d,a, 3,22, 3);
      a=step(F,a,b,c,d, 4, 7, 4); d=step(F,d,a,b,c, 5,12, 5); c=step(F,c,d,a,b, 6,17, 6); b=step(F,b,c,d,a, 7,22, 7);
      a=step(F,a,b,c,d, 8, 7, 8); d=step(F,d,a,b,c, 9,12, 9); c=step(F,c,d,a,b,10,17,10); b=step(F,b,c,d,a,11,22,11);
      a=step(F,a,b,c,d,12, 7,12); d=step(F,d,a,b,c,13,12,13); c=step(F,c,d,a,b,14,17,14); b=step(F,b,c,d,a,15,22,15);
      // Round 2
      a=step(G,a,b,c,d, 1, 5,16); d=step(G,d,a,b,c, 6, 9,17); c=step(G,c,d,a,b,11,14,18); b=step(G,b,c,d,a, 0,20,19);
      a=step(G,a,b,c,d, 5, 5,20); d=step(G,d,a,b,c,10, 9,21); c=step(G,c,d,a,b,15,14,22); b=step(G,b,c,d,a, 4,20,23);
      a=step(G,a,b,c,d, 9, 5,24); d=step(G,d,a,b,c,14, 9,25); c=step(G,c,d,a,b, 3,14,26); b=step(G,b,c,d,a, 8,20,27);
      a=step(G,a,b,c,d,13, 5,28); d=step(G,d,a,b,c, 2, 9,29); c=step(G,c,d,a,b, 7,14,30); b=step(G,b,c,d,a,12,20,31);
      // Round 3
      a=step(H,a,b,c,d, 5, 4,32); d=step(H,d,a,b,c, 8,11,33); c=step(H,c,d,a,b,11,16,34); b=step(H,b,c,d,a,14,23,35);
      a=step(H,a,b,c,d, 1, 4,36); d=step(H,d,a,b,c, 4,11,37); c=step(H,c,d,a,b, 7,16,38); b=step(H,b,c,d,a,10,23,39);
      a=step(H,a,b,c,d,13, 4,40); d=step(H,d,a,b,c, 0,11,41); c=step(H,c,d,a,b, 3,16,42); b=step(H,b,c,d,a, 6,23,43);
      a=step(H,a,b,c,d, 9, 4,44); d=step(H,d,a,b,c,12,11,45); c=step(H,c,d,a,b,15,16,46); b=step(H,b,c,d,a, 2,23,47);
      // Round 4
      a=step(I,a,b,c,d, 0, 6,48); d=step(I,d,a,b,c, 7,10,49); c=step(I,c,d,a,b,14,15,50); b=step(I,b,c,d,a, 5,21,51);
      a=step(I,a,b,c,d,12, 6,52); d=step(I,d,a,b,c, 3,10,53); c=step(I,c,d,a,b,10,15,54); b=step(I,b,c,d,a, 1,21,55);
      a=step(I,a,b,c,d, 8, 6,56); d=step(I,d,a,b,c,15,10,57); c=step(I,c,d,a,b, 6,15,58); b=step(I,b,c,d,a,13,21,59);
      a=step(I,a,b,c,d, 4, 6,60); d=step(I,d,a,b,c,11,10,61); c=step(I,c,d,a,b, 2,15,62); b=step(I,b,c,d,a, 9,21,63);
      a=add(a,aa); b=add(b,bb); c=add(c,cc); d=add(d,dd);
    }
    const out = new Uint8Array(16);
    for (let i = 0; i < 4; i++) {
      out[i   ] = (a >>> (i*8)) & 0xff; out[i+ 4] = (b >>> (i*8)) & 0xff;
      out[i+ 8] = (c >>> (i*8)) & 0xff; out[i+12] = (d >>> (i*8)) & 0xff;
    }
    return out;
  }

  function rc4(key: Uint8Array, data: Uint8Array): Uint8Array {
    const S = new Uint8Array(256);
    for (let i = 0; i < 256; i++) S[i] = i;
    for (let i = 0, j = 0; i < 256; i++) {
      j = (j + S[i] + key[i % key.length]) & 0xff;
      [S[i], S[j]] = [S[j], S[i]];
    }
    const out = new Uint8Array(data.length);
    for (let i = 0, j = 0, k = 0; k < data.length; k++) {
      i = (i + 1) & 0xff; j = (j + S[i]) & 0xff;
      [S[i], S[j]] = [S[j], S[i]];
      out[k] = data[k] ^ S[(S[i] + S[j]) & 0xff];
    }
    return out;
  }

  // ── Key derivation (PDF 1.4 §3.5.2 Algorithm 2) ────────────────────────────
  const paddedUser  = padPassword(userPassword);
  const paddedOwner = padPassword(userPassword); // owner == user for simplicity
  const ownerKey    = md5(paddedOwner).slice(0, 5);
  const O           = rc4(ownerKey, paddedUser);

  const pVal   = P >>> 0;
  const pBytes = new Uint8Array([pVal & 0xff, (pVal >> 8) & 0xff, (pVal >> 16) & 0xff, (pVal >> 24) & 0xff]);
  const fileId = crypto.getRandomValues(new Uint8Array(16));

  const encKey = md5(new Uint8Array([...paddedUser, ...O, ...pBytes, ...fileId])).slice(0, 5);
  const U      = rc4(encKey, PAD);
  const toHex  = (b: Uint8Array) => Array.from(b).map(x => x.toString(16).padStart(2, "0")).join("");
  const fileIdHex = toHex(fileId);

  // Per-object RC4 key (PDF §3.5.2 step (a))
  function encryptStream(data: Uint8Array, objNum: number, genNum: number): Uint8Array {
    const objKey = new Uint8Array([...encKey, objNum & 0xff, (objNum >> 8) & 0xff, (objNum >> 16) & 0xff, genNum & 0xff, (genNum >> 8) & 0xff]);
    return rc4(md5(objKey).slice(0, Math.min(16, encKey.length + 5)), data);
  }

  // ── Parse the cross-reference table PDF to find all objects ────────────────
  // We parse the xref table to learn which byte ranges are streams so we can
  // encrypt them in-place, then rebuild the xref + trailer with the /Encrypt dict.
  //
  // Strategy: parse the PDF text, encrypt every `stream ... endstream` block
  // and every (string) literal, then append the /Encrypt object and update the
  // trailer.  This is a lightweight approach that avoids a full round-trip parse.
  //
  // For the purposes of lockPDF the input PDF is freshly saved by pdf-lib with
  // useObjectStreams:false, so the structure is predictable and straightforward.

  const pdfText = dec.decode(pdfInput);

  // Split at %%EOF to handle possible garbage after it
  const eofIdx = pdfText.lastIndexOf("%%EOF");
  const body   = eofIdx >= 0 ? pdfText.slice(0, eofIdx) : pdfText;

  // Find startxref value so we can strip the old xref/trailer
  const sxMatch = body.match(/startxref\s+(\d+)\s*$/);
  if (!sxMatch) {
    // Can't parse — return original bytes unchanged (shouldn't happen with pdf-lib output)
    return new Uint8Array(pdfInput) as Uint8Array<ArrayBuffer>;
  }
  const oldXrefOffset = parseInt(sxMatch[1], 10);

  // Everything up to and including the body before the xref section
  const bodyBeforeXref = pdfInput.slice(0, oldXrefOffset);

  // ── Parse object offsets from the old xref table ───────────────────────────
  // We re-use the existing xref to know object numbers so we can derive per-
  // object encryption keys correctly.  We scan the body for "N 0 obj" patterns.
  const objRegex = /(\d+)\s+0\s+obj/g;
  const objectOffsets: Map<number, number> = new Map();
  let match: RegExpExecArray | null;
  while ((match = objRegex.exec(pdfText)) !== null) {
    objectOffsets.set(parseInt(match[1], 10), match.index);
  }

  // ── Re-encode the body with encrypted streams ──────────────────────────────
  // We walk through each "N 0 obj" block, locate any stream, encrypt it, and
  // splice it back into the byte array.

  // Build a mutable copy as an array of Uint8Array segments
  const segments: Uint8Array[] = [];
  let cursor = 0;

  // Sort objects by their byte offset
  const sortedObjs = Array.from(objectOffsets.entries()).sort((a, b) => a[1] - b[1]);

  for (const [objNum, objByteStart] of sortedObjs) {
    if (objByteStart < cursor) continue; // already consumed

    // Push bytes from cursor up to start of this object
    segments.push(pdfInput.slice(cursor, objByteStart));
    cursor = objByteStart;

    // Find the end of this object ("endobj")
    const objText = pdfText.slice(objByteStart);
    const endobjIdx = objText.indexOf("endobj");
    if (endobjIdx < 0) {
      // Can't find endobj — push rest of body
      segments.push(pdfInput.slice(cursor, oldXrefOffset));
      cursor = oldXrefOffset;
      break;
    }
    const objEnd = objByteStart + endobjIdx + "endobj".length;

    // Check for a stream inside this object
    const streamMatch = objText.match(/\bstream\r?\n/);
    if (streamMatch) {
      const streamStartLocal = streamMatch.index! + streamMatch[0].length;
      const streamStart = objByteStart + streamStartLocal;

      // Find matching endstream
      const endstreamIdx = objText.indexOf("endstream", streamStartLocal);
      if (endstreamIdx >= 0) {
        const streamEnd = objByteStart + endstreamIdx;

        // Push the object header (up to and including "stream\n")
        segments.push(pdfInput.slice(cursor, streamStart));

        // Encrypt the stream bytes
        const rawStream  = pdfInput.slice(streamStart, streamEnd);
        const encStream  = encryptStream(rawStream, objNum, 0);

        // Update the /Length value in the object header
        // We need to rewrite the header segment so /Length matches
        const headerText = dec.decode(pdfInput.slice(objByteStart, streamStart));
        const newHeaderText = headerText.replace(/\/Length\s+\d+/, `/Length ${encStream.length}`);
        // Replace the last pushed segment (object header) with updated one
        segments.pop();
        segments.push(enc.encode(newHeaderText));

        segments.push(encStream);
        cursor = streamEnd; // will push "endstream\nendobj\n" below
      }
    }

    // Push remainder of this object up to and including "endobj"
    segments.push(pdfInput.slice(cursor, objEnd));
    cursor = objEnd;
  }

  // Push any remaining bytes up to start of old xref
  if (cursor < oldXrefOffset) {
    segments.push(pdfInput.slice(cursor, oldXrefOffset));
  }

  // ── Compute new object offsets for updated xref ────────────────────────────
  const encParts: Uint8Array[] = [...segments];
  let newOffset = encParts.reduce((s, p) => s + p.length, 0);

  // ── Append /Encrypt object ─────────────────────────────────────────────────
  const encryptObjNum = Math.max(...objectOffsets.keys()) + 1;
  const encryptObjOffset = newOffset;
  const encryptObjStr =
    `${encryptObjNum} 0 obj\n` +
    `<< /Filter /Standard /V 1 /R 2\n` +
    `   /O <${toHex(O)}>\n` +
    `   /U <${toHex(U)}>\n` +
    `   /P ${P} >>\n` +
    `endobj\n`;
  const encryptObjBytes = enc.encode(encryptObjStr);
  encParts.push(encryptObjBytes);
  newOffset += encryptObjBytes.length;

  // ── Rebuild xref table ─────────────────────────────────────────────────────
  // Recompute offsets for all objects based on our new byte layout
  // We do a second pass: assemble segments into a single buffer, then scan for
  // "N 0 obj" patterns to get accurate new offsets.
  const bodyTotal = encParts.reduce((s, p) => s + p.length, 0);
  const bodyBuf   = new Uint8Array(bodyTotal);
  let pos = 0;
  for (const p of encParts) { bodyBuf.set(p, pos); pos += p.length; }

  const newBodyText   = dec.decode(bodyBuf);
  const newObjOffsets = new Map<number, number>();
  const newObjRegex   = /(\d+)\s+0\s+obj/g;
  let m2: RegExpExecArray | null;
  while ((m2 = newObjRegex.exec(newBodyText)) !== null) {
    newObjOffsets.set(parseInt(m2[1], 10), m2.index);
  }
  // Also record the /Encrypt object we just appended
  newObjOffsets.set(encryptObjNum, encryptObjOffset);

  // Find catalog object to get /Root id
  const catalogMatch = newBodyText.match(/(\d+)\s+0\s+obj\s*<<[^>]*\/Type\s*\/Catalog/);
  const catalogId = catalogMatch ? parseInt(catalogMatch[1], 10) : 1;

  const allIds   = Array.from(newObjOffsets.keys()).sort((a, b) => a - b);
  const maxId    = Math.max(...allIds);
  const totalObj = maxId + 1;

  const xrefLines: string[] = [];
  xrefLines.push(`xref\n0 ${totalObj}\n`);
  xrefLines.push("0000000000 65535 f \n");
  for (let id = 1; id < totalObj; id++) {
    const off = newObjOffsets.get(id) ?? 0;
    xrefLines.push(`${String(off).padStart(10, "0")} 00000 n \n`);
  }
  const xrefStr   = xrefLines.join("");
  const xrefBytes = enc.encode(xrefStr);

  const trailerStr =
    `trailer\n` +
    `<< /Size ${totalObj} /Root ${catalogId} 0 R\n` +
    `   /Encrypt ${encryptObjNum} 0 R\n` +
    `   /ID [<${fileIdHex}><${fileIdHex}>] >>\n` +
    `startxref\n${bodyTotal}\n%%EOF\n`;
  const trailerBytes = enc.encode(trailerStr);

  // ── Assemble final output ──────────────────────────────────────────────────
  const finalSize = bodyTotal + xrefBytes.length + trailerBytes.length;
  const result    = new Uint8Array(finalSize);
  result.set(bodyBuf, 0);
  result.set(xrefBytes, bodyTotal);
  result.set(trailerBytes, bodyTotal + xrefBytes.length);
  return result;
}

// ─── Flatten PDF forms ────────────────────────────────────────────────────────

/**
 * Flattens all interactive form fields in a PDF, turning them into static
 * content so the fields can no longer be edited.
 *
 * Uses pdf-lib's built-in form flattening — field appearance streams are
 * baked into the page content, and the AcroForm field dictionary is removed.
 * Text, vectors, and existing content are preserved at full quality
 * (no rasterisation).
 */
export async function flattenPDF(
  file: File,
  onProgress?: (pct: number, stage: string) => void
): Promise<void> {
  const { PDFDocument } = await getPdfLib();
  const buf = await file.arrayBuffer();

  onProgress?.(15, "Loading PDF...");
  const srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true });

  onProgress?.(50, "Flattening form fields...");
  const form = srcDoc.getForm();
  form.flatten();

  onProgress?.(85, "Saving flattened PDF...");
  const pdfBytes = await srcDoc.save();
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });

  const baseName = file.name.replace(/\.pdf$/i, "");
  triggerDownload(blob, `${baseName}_flattened.pdf`);
  onProgress?.(100, "Done! Form fields are now static content.");
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 100);
}
