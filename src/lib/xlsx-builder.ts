// xlsx-builder.ts — builds .xlsx (Excel) entirely in the browser using SheetJS
// No server, no upload — pure client-side spreadsheet generation

import type { ProcessedPage, TextBlock } from "./docx-builder";

/**
 * Extracts tables from all processed pages and writes each table to a
 * separate worksheet. Non-table text is collected on a "Text" sheet.
 */
export async function buildXlsx(pages: ProcessedPage[], baseName: string): Promise<void> {
  // Lazy import to keep initial bundle small
  const XLSX = await import("xlsx");

  const workbook = XLSX.utils.book_new();
  let tableIndex = 0;
  const textRows: string[][] = [];

  for (const page of pages) {
    for (const block of page.blocks) {
      if (block.type === "table" && block.rows && block.rows.length > 0) {
        tableIndex++;
        const ws = XLSX.utils.aoa_to_sheet(block.rows);

        // Style header row bold (SheetJS CE supports basic cell formatting)
        const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
        for (let C = range.s.c; C <= range.e.c; C++) {
          const addr = XLSX.utils.encode_cell({ r: 0, c: C });
          if (!ws[addr]) continue;
          ws[addr].s = { font: { bold: true } };
        }

        // Auto column widths
        const colWidths = block.rows[0].map((_, ci) =>
          Math.min(
            40,
            Math.max(
              10,
              ...block.rows!.map((row) => (row[ci] || "").toString().length + 2)
            )
          )
        );
        ws["!cols"] = colWidths.map((w) => ({ wch: w }));

        XLSX.utils.book_append_sheet(workbook, ws, `Table ${tableIndex}`);
      } else if (block.type !== "page_break" && block.text) {
        // Collect text blocks → "Text" sheet
        const prefix =
          block.type === "heading"
            ? `${"#".repeat(block.level || 1)} `
            : block.type === "list_item"
            ? "• "
            : "";
        textRows.push([`Page ${page.pageNum}`, prefix + block.text]);
      }
    }
  }

  // Always include a Text sheet so the file isn't empty
  if (textRows.length > 0) {
    const textWs = XLSX.utils.aoa_to_sheet([["Page", "Content"], ...textRows]);
    textWs["!cols"] = [{ wch: 8 }, { wch: 80 }];
    // Make header bold
    ["A1", "B1"].forEach((addr) => {
      if (textWs[addr]) textWs[addr].s = { font: { bold: true } };
    });
    XLSX.utils.book_append_sheet(workbook, textWs, "Text Content");
  }

  if (tableIndex === 0 && textRows.length === 0) {
    // Fallback: empty sheet with a message
    const ws = XLSX.utils.aoa_to_sheet([["No extractable content found in this PDF."]]);
    XLSX.utils.book_append_sheet(workbook, ws, "Sheet1");
  }

  // Write and trigger download
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerDownload(blob, `${baseName}.xlsx`);
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
