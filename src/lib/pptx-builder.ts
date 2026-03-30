// pptx-builder.ts — builds .pptx entirely in the browser using PptxGenJS
// No server, no upload — pure client-side presentation generation

import type { ProcessedPage, TextBlock } from "./docx-builder";

// Slide dimensions (widescreen 16:9 default)
const SLIDE_W = 10; // inches
const SLIDE_H = 5.625; // inches

// Brand palette (matches PrivaPDF CSS vars)
const COLORS = {
  ink: "0F0E0D",
  muted: "6B6760",
  accent: "1A472A",
  accentLight: "E8F0EB",
  border: "D8D4CC",
  paper: "FAF8F4",
  white: "FFFFFF",
};

interface SlideBlock {
  type: "title" | "heading" | "body" | "bullet" | "table";
  text?: string;
  level?: number;
  rows?: string[][];
}

/** Groups page blocks into logical slides (one slide per page, or split on h1 headings) */
function paginateBlocks(page: ProcessedPage): SlideBlock[][] {
  const slides: SlideBlock[][] = [[]];

  for (const block of page.blocks) {
    if (block.type === "page_break") {
      slides.push([]);
      continue;
    }

    // A heading-level-1 starts a new slide (except if first block on slide)
    if (block.type === "heading" && block.level === 1 && slides[slides.length - 1].length > 0) {
      slides.push([]);
    }

    const current = slides[slides.length - 1];

    if (block.type === "heading") {
      current.push({ type: block.level === 1 ? "title" : "heading", text: block.text || "", level: block.level });
    } else if (block.type === "list_item") {
      current.push({ type: "bullet", text: block.text || "" });
    } else if (block.type === "table" && block.rows) {
      current.push({ type: "table", rows: block.rows });
    } else if (block.type === "paragraph" && block.text) {
      current.push({ type: "body", text: block.text });
    }
  }

  return slides.filter((s) => s.length > 0);
}

export async function buildPptx(pages: ProcessedPage[], baseName: string): Promise<void> {
  // Lazy import — keep initial bundle small
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();

  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "PrivaPDF";
  pptx.title = baseName;

  // ── Title slide ───────────────────────────────────────────────────────────
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: COLORS.ink };

  titleSlide.addText(baseName, {
    x: 0.8, y: 1.8, w: 8.4, h: 1.4,
    fontSize: 40,
    bold: true,
    color: COLORS.white,
    fontFace: "Georgia",
    align: "left",
  });

  titleSlide.addText("Converted by PrivaPDF · Your file never left your device", {
    x: 0.8, y: 3.4, w: 8.4, h: 0.4,
    fontSize: 12,
    color: "8DB89A",
    fontFace: "Calibri",
    align: "left",
  });

  // ── Content slides ────────────────────────────────────────────────────────
  for (const page of pages) {
    const slideGroups = paginateBlocks(page);

    for (const blocks of slideGroups) {
      const slide = pptx.addSlide();
      slide.background = { color: COLORS.paper };

      // Left accent bar
      slide.addShape("rect" as Parameters<typeof slide.addShape>[0], {
        x: 0, y: 0, w: 0.06, h: SLIDE_H,
        fill: { color: COLORS.accent },
        line: { color: COLORS.accent, width: 0 },
      });

      let cursorY = 0.45;

      for (const block of blocks) {
        if (cursorY > SLIDE_H - 0.5) break; // don't overflow the slide

        if (block.type === "title") {
          slide.addText(truncate(block.text || "", 100), {
            x: 0.35, y: cursorY, w: 9.3, h: 0.75,
            fontSize: 28, bold: true,
            color: COLORS.ink,
            fontFace: "Georgia",
          });
          cursorY += 0.9;

          // Thin green underline
          slide.addShape("line" as Parameters<typeof slide.addShape>[0], {
            x: 0.35, y: cursorY - 0.08, w: 9.3, h: 0,
            line: { color: COLORS.accent, width: 1.5 },
          });
          cursorY += 0.12;

        } else if (block.type === "heading") {
          slide.addText(truncate(block.text || "", 120), {
            x: 0.35, y: cursorY, w: 9.3, h: 0.5,
            fontSize: 18, bold: true,
            color: COLORS.accent,
            fontFace: "Calibri",
          });
          cursorY += 0.62;

        } else if (block.type === "body") {
          const lines = wrapText(block.text || "", 110);
          const lineH = 0.27;
          slide.addText(lines.join("\n"), {
            x: 0.35, y: cursorY, w: 9.3, h: lines.length * lineH + 0.1,
            fontSize: 12,
            color: COLORS.muted,
            fontFace: "Calibri",
          });
          cursorY += lines.length * lineH + 0.2;

        } else if (block.type === "bullet") {
          slide.addText("• " + truncate(block.text || "", 120), {
            x: 0.55, y: cursorY, w: 9.1, h: 0.32,
            fontSize: 12,
            color: COLORS.ink,
            fontFace: "Calibri",
          });
          cursorY += 0.38;

        } else if (block.type === "table" && block.rows && block.rows.length > 0) {
          const rows = block.rows;
          const colCount = Math.max(...rows.map((r) => r.length));
          const colW = Math.min(2.8, 9.0 / colCount);
          const tableH = Math.min(rows.length * 0.32, SLIDE_H - cursorY - 0.3);

          slide.addTable(
            rows.map((row, ri) =>
              Array(colCount).fill(null).map((_, ci) => ({
                text: row[ci] || "",
                options: {
                  fontSize: 10,
                  bold: ri === 0,
                  color: ri === 0 ? COLORS.white : COLORS.ink,
                  fill: { color: ri === 0 ? COLORS.accent : ri % 2 === 0 ? COLORS.paper : COLORS.accentLight },
                  border: [
                    { pt: 0.5, color: COLORS.border },
                    { pt: 0.5, color: COLORS.border },
                    { pt: 0.5, color: COLORS.border },
                    { pt: 0.5, color: COLORS.border },
                  ],
                  align: "left" as const,
                  valign: "middle" as const,
                },
              }))
            ),
            {
              x: 0.35, y: cursorY, w: colCount * colW, h: tableH,
              rowH: 0.32,
            }
          );

          cursorY += tableH + 0.2;
        }
      }

      // Page number footer
      slide.addText(`Page ${page.pageNum}`, {
        x: 8.5, y: 5.2, w: 1.3, h: 0.25,
        fontSize: 9, color: COLORS.border, align: "right",
      });
    }
  }

  // Write and download
  const blob = await pptx.write({ outputType: "blob" }) as Blob;
  triggerDownload(blob, `${baseName}.pptx`);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

function wrapText(str: string, maxChars: number): string[] {
  const words = str.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if ((line + " " + word).trim().length > maxChars) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = (line + " " + word).trim();
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [str];
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
