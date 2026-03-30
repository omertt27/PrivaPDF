// pdf-parser.ts — runs on main thread (PDF.js is lightweight, no AI)
// Handles both text extraction and image rendering per page

export interface ParsedPage {
  pageNum: number;
  text: string;
  imageData: string; // base64 PNG of the rendered page
  hasText: boolean; // true = text PDF, false = scanned/image PDF
  wordCount: number;
}

export interface PDFParseResult {
  pages: ParsedPage[];
  totalPages: number;
  isTextBased: boolean; // true if 80%+ of pages have embedded text
  fileName: string;
}

let pdfjsLib: typeof import("pdfjs-dist") | null = null;

async function getPdfJs() {
  if (pdfjsLib) return pdfjsLib;
  pdfjsLib = await import("pdfjs-dist");
  // Use the bundled local worker — avoids CDN dependency so the app works offline
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
  return pdfjsLib;
}

export async function parsePDF(
  file: File,
  onProgress?: (percent: number, stage: string) => void
): Promise<PDFParseResult> {
  const lib = await getPdfJs();

  onProgress?.(5, "Loading PDF...");
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await lib.getDocument({ data: arrayBuffer }).promise;

  const pages: ParsedPage[] = [];
  let textPageCount = 0;

  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress?.(5 + Math.round((i / pdf.numPages) * 70), `Parsing page ${i} of ${pdf.numPages}...`);

    const page = await pdf.getPage(i);

    // ── Text extraction ──────────────────────────────────────────
    const textContent = await page.getTextContent();
    const text = textContent.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any) => item.str)
      .join(" ")
      .trim();
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const hasText = wordCount > 20; // >20 words = embedded text
    if (hasText) textPageCount++;

    // ── Page image rendering (for AI analysis or preview) ────────
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    const imageData = canvas.toDataURL("image/jpeg", 0.85); // JPEG saves ~60% size vs PNG

    pages.push({ pageNum: i, text, imageData, hasText, wordCount });
  }

  onProgress?.(80, "Analysis complete");

  const textRatio = textPageCount / pdf.numPages;
  const isTextBased = textRatio >= 0.5; // If ≥50% pages have text → text-based

  return {
    pages,
    totalPages: pdf.numPages,
    isTextBased,
    fileName: file.name,
  };
}
