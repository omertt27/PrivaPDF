// pdf-tools.ts — browser-side PDF utilities
// Merge, split, compress, and unlock password-protected PDFs
// Zero uploads — everything runs in this browser tab

// ─── Shared PDF.js loader ─────────────────────────────────────────────────────
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

// ─── Merge ────────────────────────────────────────────────────────────────────

/**
 * Merges multiple PDF files into one and triggers a download.
 * Uses canvas rendering to re-paint each page into a new PDF via a minimal
 * PDF byte writer (no third-party PDF manipulation lib needed).
 */
export async function mergePDFs(
  files: File[],
  outputName = "merged",
  onProgress?: (pct: number, stage: string) => void
): Promise<void> {
  if (files.length === 0) throw new Error("No files to merge");

  const lib = await getPdfJs();
  const pageImages: { width: number; height: number; dataUrl: string }[] = [];
  let totalPages = 0;
  let processedPages = 0;

  // Step 1: Render every page of every PDF to an image
  for (let fi = 0; fi < files.length; fi++) {
    const file = files[fi];
    onProgress?.(
      Math.round((fi / files.length) * 60),
      `Reading file ${fi + 1} of ${files.length}: ${file.name}...`
    );

    const buf = await file.arrayBuffer();
    const pdf = await lib.getDocument({ data: buf }).promise;
    totalPages += pdf.numPages;

    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const viewport = page.getViewport({ scale: 1.5 });

      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      pageImages.push({ width: viewport.width, height: viewport.height, dataUrl: canvas.toDataURL("image/jpeg", 0.9) });

      processedPages++;
      onProgress?.(
        Math.round(60 + (processedPages / Math.max(totalPages, 1)) * 30),
        `Rendering page ${processedPages} of ${totalPages}...`
      );
    }
  }

  onProgress?.(92, "Assembling merged PDF...");
  const pdfBytes = buildImagePDF(pageImages);
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
  triggerDownload(blob, `${outputName}.pdf`);
  onProgress?.(100, "Done!");
}

// ─── Split ────────────────────────────────────────────────────────────────────

/**
 * Splits a PDF into individual single-page PDFs, each downloaded separately.
 */
export async function splitPDF(
  file: File,
  pageNumbers: number[] | "all",
  onProgress?: (pct: number, stage: string) => void
): Promise<SplitResult[]> {
  const lib = await getPdfJs();
  const buf = await file.arrayBuffer();
  const pdf = await lib.getDocument({ data: buf }).promise;

  const pages =
    pageNumbers === "all"
      ? Array.from({ length: pdf.numPages }, (_, i) => i + 1)
      : pageNumbers.filter((n) => n >= 1 && n <= pdf.numPages);

  const results: SplitResult[] = [];
  const baseName = file.name.replace(/\.pdf$/i, "");

  for (let i = 0; i < pages.length; i++) {
    const pageNum = pages[i];
    onProgress?.(
      Math.round((i / pages.length) * 100),
      `Extracting page ${pageNum} of ${pdf.numPages}...`
    );

    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    const pdfBytes = buildImagePDF([{ width: viewport.width, height: viewport.height, dataUrl }]);
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
 * then re-renders it to a new unlocked PDF.
 */
export async function unlockPDF(
  file: File,
  password: string,
  onProgress?: (pct: number, stage: string) => void
): Promise<void> {
  const lib = await getPdfJs();
  const buf = await file.arrayBuffer();

  onProgress?.(5, "Verifying password...");

  let pdf: Awaited<ReturnType<typeof lib.getDocument>>["promise"] extends Promise<infer T> ? T : never;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pdf = await (lib.getDocument({ data: buf, password } as any).promise);
  } catch (err) {
    const msg = String(err);
    if (msg.includes("PasswordException") || msg.includes("Incorrect")) {
      throw new Error("Incorrect password. Please try again.");
    }
    throw err;
  }

  onProgress?.(15, "Password accepted — rendering pages...");

  const pageImages: { width: number; height: number; dataUrl: string }[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    onProgress?.(
      15 + Math.round((p / pdf.numPages) * 75),
      `Unlocking page ${p} of ${pdf.numPages}...`
    );

    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;

    pageImages.push({ width: viewport.width, height: viewport.height, dataUrl: canvas.toDataURL("image/jpeg", 0.92) });
  }

  onProgress?.(92, "Writing unlocked PDF...");
  const pdfBytes = buildImagePDF(pageImages);
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
