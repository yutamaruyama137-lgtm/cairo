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
  AlignmentType,
  PageBreak,
  ShadingType,
  convertInchesToTwip,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
} from "docx";

// ── インラインテキストのパース（**bold** / *italic*）────────────────────────
function parseInline(text: string, baseOptions?: { color?: string; size?: number }): TextRun[] {
  const runs: TextRun[] = [];
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/);
  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**")) {
      runs.push(new TextRun({ text: part.slice(2, -2), bold: true, ...baseOptions }));
    } else if (part.startsWith("*") && part.endsWith("*")) {
      runs.push(new TextRun({ text: part.slice(1, -1), italics: true, ...baseOptions }));
    } else if (part) {
      runs.push(new TextRun({ text: part, ...baseOptions }));
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

// ── タイトル抽出 ─────────────────────────────────────────────────────────────
function extractTitle(content: string): { title: string; rest: string } {
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("# ")) {
      return {
        title: lines[i].slice(2).trim(),
        rest: lines.slice(i + 1).join("\n"),
      };
    }
  }
  return { title: "ドキュメント", rest: content };
}

// ── 提案書スタイルの .docx ダウンロード ─────────────────────────────────────
export async function downloadAsDocx(content: string, filename = "output") {
  const { title, rest } = extractTitle(content);
  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const bodyChildren: (Paragraph | Table)[] = [];

  // ── 本文パース ──
  const lines = rest.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // テーブルブロック
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
                    shading: rowIdx === 0
                      ? { type: ShadingType.SOLID, color: "1a1a2e", fill: "1a1a2e" }
                      : rowIdx % 2 === 0
                        ? { type: ShadingType.SOLID, color: "f8f9fa", fill: "f8f9fa" }
                        : undefined,
                    children: [
                      new Paragraph({
                        children: [new TextRun({
                          text: cell,
                          bold: rowIdx === 0,
                          color: rowIdx === 0 ? "FFFFFF" : "2d2d2d",
                          size: 20,
                        })],
                        spacing: { before: 60, after: 60 },
                      }),
                    ],
                    margins: { top: 60, bottom: 60, left: 100, right: 100 },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 1, color: "e0e0e0" },
                      bottom: { style: BorderStyle.SINGLE, size: 1, color: "e0e0e0" },
                      left: { style: BorderStyle.SINGLE, size: 1, color: "e0e0e0" },
                      right: { style: BorderStyle.SINGLE, size: 1, color: "e0e0e0" },
                    },
                  })
              ),
            })
          ),
        });
        bodyChildren.push(table);
        bodyChildren.push(new Paragraph({ text: "" }));
        continue;
      }
    }

    if (line.startsWith("## ")) {
      // H2: アクセントライン付きセクション見出し
      bodyChildren.push(new Paragraph({ text: "", spacing: { before: 200 } }));
      bodyChildren.push(
        new Paragraph({
          children: [new TextRun({ text: line.slice(3), bold: true, size: 28, color: "1a1a2e" })],
          border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: "3b82f6" } },
          spacing: { before: 400, after: 200 },
        })
      );
    } else if (line.startsWith("### ")) {
      bodyChildren.push(
        new Paragraph({
          children: [new TextRun({ text: line.slice(4), bold: true, size: 24, color: "374151" })],
          spacing: { before: 300, after: 120 },
        })
      );
    } else if (line.startsWith("#### ")) {
      bodyChildren.push(
        new Paragraph({
          children: [new TextRun({ text: line.slice(5), bold: true, size: 22, color: "6b7280" })],
          spacing: { before: 200, after: 80 },
        })
      );
    } else if (/^[-*] /.test(line)) {
      bodyChildren.push(
        new Paragraph({
          children: parseInline(line.slice(2), { size: 22, color: "374151" }),
          bullet: { level: 0 },
          spacing: { before: 60, after: 60 },
        })
      );
    } else if (/^  [-*] /.test(line)) {
      bodyChildren.push(
        new Paragraph({
          children: parseInline(line.slice(4), { size: 20, color: "6b7280" }),
          bullet: { level: 1 },
          spacing: { before: 40, after: 40 },
        })
      );
    } else if (/^\d+\. /.test(line)) {
      bodyChildren.push(
        new Paragraph({
          children: parseInline(line.replace(/^\d+\. /, ""), { size: 22, color: "374151" }),
          bullet: { level: 0 },
          spacing: { before: 60, after: 60 },
        })
      );
    } else if (line === "" || line === "---") {
      bodyChildren.push(new Paragraph({ text: "", spacing: { before: 80, after: 80 } }));
    } else {
      bodyChildren.push(
        new Paragraph({
          children: parseInline(line, { size: 22, color: "374151" }),
          spacing: { before: 60, after: 60 },
          alignment: AlignmentType.JUSTIFIED,
        })
      );
    }

    i++;
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "游明朝", size: 22, color: "374151" },
        },
      },
    },
    sections: [
      {
        // ── カバーページ ──
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1.2),
              bottom: convertInchesToTwip(1.2),
              left: convertInchesToTwip(1.4),
              right: convertInchesToTwip(1.4),
            },
          },
        },
        children: [
          // 上部スペース
          new Paragraph({ text: "", spacing: { before: 2000 } }),
          new Paragraph({ text: "", spacing: { before: 2000 } }),
          new Paragraph({ text: "", spacing: { before: 2000 } }),

          // タイトル
          new Paragraph({
            children: [new TextRun({ text: title, bold: true, size: 52, color: "1a1a2e" })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 800, after: 400 },
            border: {
              bottom: { style: BorderStyle.THICK, size: 6, color: "3b82f6" },
            },
          }),

          // サブライン
          new Paragraph({
            children: [new TextRun({ text: today, size: 24, color: "6b7280" })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 200 },
          }),

          new Paragraph({ text: "", children: [new PageBreak()] }),
        ],
      },
      {
        // ── 本文 ──
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1.0),
              bottom: convertInchesToTwip(1.0),
              left: convertInchesToTwip(1.2),
              right: convertInchesToTwip(1.2),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: title, size: 18, color: "9ca3af" }),
                ],
                alignment: AlignmentType.RIGHT,
                border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "e5e7eb" } },
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "9ca3af" }),
                  new TextRun({ text: " / ", size: 18, color: "9ca3af" }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: "9ca3af" }),
                ],
                alignment: AlignmentType.CENTER,
                border: { top: { style: BorderStyle.SINGLE, size: 1, color: "e5e7eb" } },
              }),
            ],
          }),
        },
        children: bodyChildren,
      },
    ],
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
