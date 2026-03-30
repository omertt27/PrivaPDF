// txt-builder.ts — exports PDF content as plain text
// Preserves basic structure (headings, lists) with ASCII decoration

import type { ProcessedPage, TextBlock } from "./docx-builder";

export function buildTxt(pages: ProcessedPage[], baseName: string): void {
  const lines: string[] = [];

  for (const page of pages) {
    lines.push(`\n${"═".repeat(60)}`);
    lines.push(`  PAGE ${page.pageNum}`);
    lines.push(`${"═".repeat(60)}\n`);

    for (const block of page.blocks) {
      lines.push(...blockToLines(block));
    }
  }

  const text = lines.join("\n").trim();
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  triggerDownload(blob, `${baseName}.txt`);
}

function blockToLines(block: TextBlock): string[] {
  switch (block.type) {
    case "heading": {
      const prefix = "#".repeat(block.level || 1) + " ";
      const underline = (block.level || 1) === 1 ? "─".repeat(Math.min(60, (block.text || "").length + 2)) : "";
      return underline
        ? [`\n${prefix}${block.text}`, underline, ""]
        : [`\n${prefix}${block.text}`, ""];
    }

    case "paragraph":
      return [`${block.text || ""}`, ""];

    case "list_item":
      return [`  • ${block.text || ""}`];

    case "table": {
      if (!block.rows || block.rows.length === 0) return [];
      const rows = block.rows;

      // Compute column widths
      const colCount = Math.max(...rows.map((r) => r.length));
      const widths: number[] = Array(colCount).fill(0);
      for (const row of rows) {
        for (let c = 0; c < colCount; c++) {
          widths[c] = Math.max(widths[c], (row[c] || "").length);
        }
      }

      const separator = "+" + widths.map((w) => "-".repeat(w + 2)).join("+") + "+";
      const tableLines: string[] = [separator];

      rows.forEach((row, ri) => {
        const cells = Array(colCount)
          .fill(0)
          .map((_, c) => " " + (row[c] || "").padEnd(widths[c]) + " ");
        tableLines.push("|" + cells.join("|") + "|");
        if (ri === 0) tableLines.push(separator); // header divider
      });

      tableLines.push(separator);
      return ["", ...tableLines, ""];
    }

    case "page_break":
      return [];

    default:
      return [block.text || ""];
  }
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 100);
}
