"use client";

/**
 * lib/export.ts
 * Markdown → .docx / .csv エクスポートユーティリティ
 */

import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Packer,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from "docx";

// ── インラインテキストのパース（**bold** / *italic*）────────────────────────
function parseInline(text: string): TextRun[] {
  const runs: TextRun[] = [];
  // **bold** と *italic* を処理
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/);
  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**")) {
      runs.push(new TextRun({ text: part.slice(2, -2), bold: true }));
    } else if (part.startsWith("*") && part.endsWith("*")) {
      runs.push(new TextRun({ text: part.slice(1, -1), italics: true }));
    } else if (part) {
      runs.push(new TextRun({ text: part }));
    }
  }
  return runs.length > 0 ? runs : [new TextRun({ text: "" })];
}

// ── Markdown テーブルのパース ────────────────────────────────────────────────
function parseMarkdownTable(block: string): { headers: string[]; rows: string[][] } | null {
  const lines = block.trim().split("\n").filter((l) => l.includes("|"));
  if (lines.length < 3) return null;

  const parseRow = (line: string) =>
    line
      .split("|")
      .map((c) => c.trim())
      .filter((_, i, arr) => i > 0 && i < arr.length - 1);

  const headers = parseRow(lines[0]);
  const rows = lines.slice(2).map(parseRow);
  return { headers, rows };
}

// ── .docx ダウンロード ───────────────────────────────────────────────────────
export async function downloadAsDocx(content: string, filename = "output") {
  const lines = content.split("\n");
  const children: (Paragraph | Table)[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // テーブルブロックをまとめて処理
    if (line.includes("|") && i + 1 < lines.length && lines[i + 1].includes("---")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const parsed = parseMarkdownTable(tableLines.join("\n"));
      if (parsed) {
        const allRows = [parsed.headers, ...parsed.rows];
        const table = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: allRows.map((row, rowIdx) =>
            new TableRow({
              children: row.map(
                (cell) =>
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: cell, bold: rowIdx === 0 })],
                      }),
                    ],
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 1 },
                      bottom: { style: BorderStyle.SINGLE, size: 1 },
                      left: { style: BorderStyle.SINGLE, size: 1 },
                      right: { style: BorderStyle.SINGLE, size: 1 },
                    },
                  })
              ),
            })
          ),
        });
        children.push(table);
        children.push(new Paragraph({ text: "" }));
        continue;
      }
    }

    if (line.startsWith("# ")) {
      children.push(new Paragraph({ text: line.slice(2), heading: HeadingLevel.HEADING_1 }));
    } else if (line.startsWith("## ")) {
      children.push(new Paragraph({ text: line.slice(3), heading: HeadingLevel.HEADING_2 }));
    } else if (line.startsWith("### ")) {
      children.push(new Paragraph({ text: line.slice(4), heading: HeadingLevel.HEADING_3 }));
    } else if (line.startsWith("#### ")) {
      children.push(new Paragraph({ text: line.slice(5), heading: HeadingLevel.HEADING_4 }));
    } else if (/^[-*] /.test(line)) {
      children.push(new Paragraph({ children: parseInline(line.slice(2)), bullet: { level: 0 } }));
    } else if (/^  [-*] /.test(line)) {
      children.push(new Paragraph({ children: parseInline(line.slice(4)), bullet: { level: 1 } }));
    } else if (/^\d+\. /.test(line)) {
      children.push(
        new Paragraph({ children: parseInline(line.replace(/^\d+\. /, "")), bullet: { level: 0 } })
      );
    } else if (line === "" || line === "---") {
      children.push(new Paragraph({ text: "" }));
    } else {
      children.push(new Paragraph({ children: parseInline(line) }));
    }

    i++;
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── .csv ダウンロード（テーブルを優先、なければ行ごとにCSV化）────────────────
export function downloadAsCsv(content: string, filename = "output") {
  // テーブルを探す
  const tableMatch = content.match(/(\|.+\|\n\|[-| :]+\|\n(?:\|.+\|\n?)*)/);
  if (tableMatch) {
    const parsed = parseMarkdownTable(tableMatch[0]);
    if (parsed) {
      const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
      const csvLines = [
        parsed.headers.map(escape).join(","),
        ...parsed.rows.map((row) => row.map(escape).join(",")),
      ];
      const blob = new Blob(["\uFEFF" + csvLines.join("\n")], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
  }

  // テーブルなし → 行ごとにCSV
  const lines = content
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => `"${l.replace(/"/g, '""')}"`)
    .join("\n");
  const blob = new Blob(["\uFEFF" + lines], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
