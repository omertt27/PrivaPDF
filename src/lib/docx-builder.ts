// docx-builder.ts — builds .docx entirely in the browser using docx-js
// No server, no upload — pure client-side document generation

import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  Packer,
  AlignmentType,
  BorderStyle,
  WidthType,
} from "docx";

export interface TextBlock {
  type: "heading" | "paragraph" | "table" | "list_item" | "page_break";
  text?: string;
  level?: 1 | 2 | 3;
  rows?: string[][];
}

export interface ProcessedPage {
  pageNum: number;
  blocks: TextBlock[];
}

function buildTable(rows: string[][]): Table {
  if (!rows.length) return new Table({ rows: [] });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((row, rowIdx) =>
      new TableRow({
        tableHeader: rowIdx === 0,
        children: row.map(
          (cell) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: cell,
                      bold: rowIdx === 0,
                      size: 20,
                    }),
                  ],
                }),
              ],
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
              },
            })
        ),
      })
    ),
  });
}

function blockToParagraph(block: TextBlock): Paragraph | Table | null {
  if (block.type === "heading") {
    const levelMap: Record<number, typeof HeadingLevel[keyof typeof HeadingLevel]> = {
      1: HeadingLevel.HEADING_1,
      2: HeadingLevel.HEADING_2,
      3: HeadingLevel.HEADING_3,
    };
    return new Paragraph({
      text: block.text || "",
      heading: levelMap[block.level || 1],
      spacing: { before: 240, after: 120 },
    });
  }

  if (block.type === "table" && block.rows) {
    return buildTable(block.rows);
  }

  if (block.type === "list_item") {
    return new Paragraph({
      children: [new TextRun({ text: `• ${block.text || ""}`, size: 22 })],
      spacing: { before: 60, after: 60 },
      indent: { left: 360 },
    });
  }

  if (block.type === "page_break") {
    return new Paragraph({ pageBreakBefore: true, text: "" });
  }

  // Default: paragraph
  return new Paragraph({
    children: [new TextRun({ text: block.text || "", size: 22 })],
    spacing: { before: 80, after: 80 },
    alignment: AlignmentType.JUSTIFIED,
  });
}

export async function buildDocx(
  pages: ProcessedPage[],
  fileName: string = "converted"
): Promise<void> {
  const children: (Paragraph | Table)[] = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];

    // Add page break between pages (except before first page)
    if (i > 0) {
      children.push(new Paragraph({ pageBreakBefore: true, text: "" }));
    }

    for (const block of page.blocks) {
      const element = blockToParagraph(block);
      if (element) children.push(element as Paragraph | Table);
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
    styles: {
      paragraphStyles: [
        {
          id: "Normal",
          name: "Normal",
          run: { font: "Calibri", size: 22 },
        },
      ],
    },
  });

  // Generate blob entirely in browser
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${fileName.replace(/\.pdf$/i, "")}.docx`);
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Fast text-path parser ─────────────────────────────────────────────────────
// For text-based PDFs — no AI needed, fast structural heuristics
export function parseTextBlocks(rawText: string): TextBlock[] {
  const lines = rawText.split(/\s{2,}|\n/).map((l) => l.trim()).filter(Boolean);
  const blocks: TextBlock[] = [];

  for (const line of lines) {
    // Heuristic: ALL CAPS + short = likely a heading
    if (line.length < 80 && line === line.toUpperCase() && line.length > 3) {
      blocks.push({ type: "heading", text: line, level: 1 });
    }
    // Heuristic: starts with bullet/dash/number
    else if (/^[-•*]\s/.test(line) || /^\d+[.)]\s/.test(line)) {
      blocks.push({ type: "list_item", text: line.replace(/^[-•*\d.)]+\s*/, "") });
    }
    // Default paragraph
    else {
      blocks.push({ type: "paragraph", text: line });
    }
  }

  return blocks;
}
