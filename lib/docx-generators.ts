/**
 * lib/docx-generators.ts
 *
 * 提案書・請求書・レポートの docx 生成ロジック（サーバーサイド専用）
 */

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, BorderStyle, ShadingType,
  Header, Footer, PageNumber, PageBreak, convertInchesToTwip,
} from "docx";

// ────────────────────────────────────────────────────────────────
// 型定義
// ────────────────────────────────────────────────────────────────

export interface InvoiceData {
  invoice_number: string;
  date: string;
  due_date: string;
  issuer_name: string;
  issuer_address?: string;
  client_name: string;
  client_address?: string;
  items: Array<{ name: string; qty: string; unit_price: string; amount: string }>;
  subtotal: string;
  tax: string;
  total: string;
  notes?: string;
}

export interface ProposalData {
  title: string;
  company?: string;
  date: string;
  prepared_by?: string;
  sections: Array<{ heading: string; body: string }>;
}

// ────────────────────────────────────────────────────────────────
// 共通ユーティリティ
// ────────────────────────────────────────────────────────────────

function bold(text: string, size = 22, color = "1a1a2e"): TextRun {
  return new TextRun({ text, bold: true, size, color });
}
function normal(text: string, size = 22, color = "374151"): TextRun {
  return new TextRun({ text, size, color });
}
function gray(text: string, size = 18): TextRun {
  return new TextRun({ text, size, color: "9ca3af" });
}

function spacer(before = 200, after = 200): Paragraph {
  return new Paragraph({ text: "", spacing: { before, after } });
}

function parseInline(text: string, size = 22, color = "374151"): TextRun[] {
  const runs: TextRun[] = [];
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/);
  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**")) {
      runs.push(new TextRun({ text: part.slice(2, -2), bold: true, size, color }));
    } else if (part.startsWith("*") && part.endsWith("*")) {
      runs.push(new TextRun({ text: part.slice(1, -1), italics: true, size, color }));
    } else if (part) {
      runs.push(new TextRun({ text: part, size, color }));
    }
  }
  return runs.length > 0 ? runs : [new TextRun({ text: "", size })];
}

// Markdown → Paragraph[]
function markdownToBlocks(md: string): (Paragraph | Table)[] {
  const blocks: (Paragraph | Table)[] = [];
  const lines = md.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // テーブル
    if (line.includes("|") && i + 1 < lines.length && lines[i + 1].includes("---")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const table = parseMarkdownTableBlock(tableLines.join("\n"));
      if (table) { blocks.push(table); blocks.push(spacer(80, 80)); continue; }
    }

    if (line.startsWith("## ")) {
      blocks.push(new Paragraph({
        children: [bold(line.slice(3), 26, "1a1a2e")],
        border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "3b82f6" } },
        spacing: { before: 400, after: 180 },
      }));
    } else if (line.startsWith("### ")) {
      blocks.push(new Paragraph({
        children: [bold(line.slice(4), 23, "374151")],
        spacing: { before: 280, after: 100 },
      }));
    } else if (line.startsWith("#### ")) {
      blocks.push(new Paragraph({
        children: [bold(line.slice(5), 21, "6b7280")],
        spacing: { before: 160, after: 80 },
      }));
    } else if (/^[-*] /.test(line)) {
      blocks.push(new Paragraph({
        children: parseInline(line.slice(2)),
        bullet: { level: 0 },
        spacing: { before: 40, after: 40 },
      }));
    } else if (/^  [-*] /.test(line)) {
      blocks.push(new Paragraph({
        children: parseInline(line.slice(4), 20, "6b7280"),
        bullet: { level: 1 },
        spacing: { before: 30, after: 30 },
      }));
    } else if (line === "" || line === "---") {
      blocks.push(spacer(60, 60));
    } else if (line.trim()) {
      blocks.push(new Paragraph({
        children: parseInline(line),
        spacing: { before: 60, after: 60 },
        alignment: AlignmentType.JUSTIFIED,
      }));
    }

    i++;
  }

  return blocks;
}

function parseMarkdownTableBlock(block: string): Table | null {
  const lines = block.trim().split("\n").filter((l) => l.includes("|"));
  if (lines.length < 3) return null;

  const parseRow = (line: string) =>
    line.split("|").map((c) => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);

  const headers = parseRow(lines[0]);
  const rows = lines.slice(2).map(parseRow);
  const allRows = [headers, ...rows];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: allRows.map((row, rowIdx) =>
      new TableRow({
        children: row.map((cell) =>
          new TableCell({
            shading: rowIdx === 0
              ? { type: ShadingType.SOLID, color: "1e3a5f", fill: "1e3a5f" }
              : rowIdx % 2 === 0
                ? { type: ShadingType.SOLID, color: "f1f5f9", fill: "f1f5f9" }
                : undefined,
            children: [new Paragraph({
              children: [new TextRun({ text: cell, bold: rowIdx === 0, color: rowIdx === 0 ? "FFFFFF" : "374151", size: 20 })],
              spacing: { before: 60, after: 60 },
            })],
            margins: { top: 60, bottom: 60, left: 100, right: 100 },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "e2e8f0" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "e2e8f0" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "e2e8f0" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "e2e8f0" },
            },
          })
        ),
      })
    ),
  });
}

// ────────────────────────────────────────────────────────────────
// 提案書生成
// ────────────────────────────────────────────────────────────────

export async function generateProposalDocx(content: string): Promise<Buffer> {
  const lines = content.split("\n");

  // タイトル抽出
  let title = "提案書";
  let bodyStart = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("# ")) { title = lines[i].slice(2).trim(); bodyStart = i + 1; break; }
  }

  const today = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
  const bodyContent = lines.slice(bodyStart).join("\n");
  const bodyBlocks = markdownToBlocks(bodyContent);

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "游明朝", size: 22, color: "374151" } },
      },
    },
    sections: [
      // ── カバーページ ──────────────────────────────────────────
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1.5),
              bottom: convertInchesToTwip(1.5),
              left: convertInchesToTwip(1.5),
              right: convertInchesToTwip(1.5),
            },
          },
        },
        children: [
          spacer(2400, 0),

          // アクセントライン
          new Paragraph({
            children: [new TextRun({ text: "", size: 4 })],
            border: { top: { style: BorderStyle.THICK, size: 12, color: "3b82f6" } },
            spacing: { before: 0, after: 400 },
          }),

          // メインタイトル
          new Paragraph({
            children: [bold(title, 56, "1a1a2e")],
            alignment: AlignmentType.LEFT,
            spacing: { before: 0, after: 600 },
          }),

          // 区切り線
          new Paragraph({
            children: [new TextRun({ text: "", size: 2 })],
            border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "e5e7eb" } },
            spacing: { before: 0, after: 400 },
          }),

          // 日付
          new Paragraph({
            children: [gray(`作成日：${today}`, 22)],
            alignment: AlignmentType.LEFT,
            spacing: { before: 0, after: 200 },
          }),

          new Paragraph({ text: "", children: [new PageBreak()] }),
        ],
      },

      // ── 本文 ─────────────────────────────────────────────────
      {
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
            children: [new Paragraph({
              children: [gray(title, 18)],
              alignment: AlignmentType.RIGHT,
              border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "e5e7eb" } },
            })],
          }),
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              children: [
                gray("- ", 18),
                new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "9ca3af" }),
                gray(" -", 18),
              ],
              alignment: AlignmentType.CENTER,
              border: { top: { style: BorderStyle.SINGLE, size: 1, color: "e5e7eb" } },
            })],
          }),
        },
        children: bodyBlocks,
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

// ────────────────────────────────────────────────────────────────
// 請求書生成
// ────────────────────────────────────────────────────────────────

export async function generateInvoiceDocx(content: string): Promise<Buffer> {
  const data = parseInvoiceContent(content);
  const today = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });

  // 明細テーブル
  const itemRows = data.items.map((item, idx) =>
    new TableRow({
      children: [
        tableCell(item.name, idx % 2 === 0),
        tableCell(item.qty, idx % 2 === 0, AlignmentType.CENTER),
        tableCell(item.unit_price, idx % 2 === 0, AlignmentType.RIGHT),
        tableCell(item.amount, idx % 2 === 0, AlignmentType.RIGHT),
      ],
    })
  );

  // 合計行
  const totalRows = [
    summaryRow("小計", data.subtotal),
    summaryRow("消費税（10%）", data.tax),
    summaryRow("合計金額", data.total, true),
  ];

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "游明朝", size: 22, color: "374151" } },
      },
    },
    sections: [{
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
      children: [
        // ── ヘッダー：請求書タイトル ──
        new Paragraph({
          children: [bold("請求書", 48, "1a1a2e")],
          alignment: AlignmentType.LEFT,
          border: { bottom: { style: BorderStyle.THICK, size: 8, color: "3b82f6" } },
          spacing: { before: 0, after: 400 },
        }),

        // ── 請求番号・日付 ──
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            metaRow("請求番号", data.invoice_number, "請求日", data.date || today),
            metaRow("支払期限", data.due_date, "発行者", data.issuer_name),
          ],
          borders: tableBordersNone(),
        }),

        spacer(400, 400),

        // ── 請求先 ──
        new Paragraph({
          children: [bold("請求先", 20, "6b7280")],
          spacing: { before: 0, after: 80 },
        }),
        new Paragraph({
          children: [bold(`${data.client_name} 御中`, 28, "1a1a2e")],
          spacing: { before: 0, after: 60 },
        }),
        ...(data.client_address ? [new Paragraph({ children: [normal(data.client_address, 20)], spacing: { before: 0, after: 0 } })] : []),

        spacer(400, 200),

        // ── 明細タイトル ──
        new Paragraph({
          children: [bold("ご請求明細", 22, "1a1a2e")],
          border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "3b82f6" } },
          spacing: { before: 0, after: 200 },
        }),

        // ── 明細テーブル ──
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          columnWidths: [5000, 1200, 2000, 2000],
          rows: [
            // ヘッダー行
            new TableRow({
              children: [
                headerCell("品目・内容"),
                headerCell("数量", AlignmentType.CENTER),
                headerCell("単価", AlignmentType.RIGHT),
                headerCell("金額", AlignmentType.RIGHT),
              ],
            }),
            ...itemRows,
          ],
        }),

        spacer(200, 0),

        // ── 合計 ──
        new Table({
          width: { size: 40, type: WidthType.PERCENTAGE },
          columnWidths: [2400, 2400],
          rows: totalRows,
          float: { horizontalAnchor: "text", absoluteHorizontalPosition: convertInchesToTwip(4.5) },
        }),

        spacer(600, 200),

        // ── 備考 ──
        ...(data.notes ? [
          new Paragraph({
            children: [bold("備考", 20, "6b7280")],
            border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "e5e7eb" } },
            spacing: { before: 400, after: 120 },
          }),
          new Paragraph({ children: [normal(data.notes, 20, "6b7280")], spacing: { before: 0, after: 0 } }),
        ] : []),

        spacer(600, 0),

        // ── 振込先 ──
        new Paragraph({
          children: [bold("お振込先", 20, "6b7280")],
          border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "e5e7eb" } },
          spacing: { before: 0, after: 160 },
        }),
        new Paragraph({
          children: [normal("※ 振込先の銀行情報をご記入ください", 20, "9ca3af")],
          spacing: { before: 0, after: 60 },
        }),
      ],
    }],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

// ────────────────────────────────────────────────────────────────
// 汎用レポート生成
// ────────────────────────────────────────────────────────────────

export async function generateReportDocx(content: string): Promise<Buffer> {
  // 提案書と同じ構造をベースにシンプル版
  return generateProposalDocx(content);
}

// ────────────────────────────────────────────────────────────────
// 請求書コンテンツパーサー
// ────────────────────────────────────────────────────────────────

function parseInvoiceContent(content: string): InvoiceData {
  const get = (pattern: RegExp) => content.match(pattern)?.[1]?.trim() ?? "";

  // 明細テーブルをパース
  const tableMatch = content.match(/\|.+\|\n\|[-| :]+\|\n((?:\|.+\|\n?)*)/);
  const items: InvoiceData["items"] = [];

  if (tableMatch) {
    const rows = tableMatch[0]
      .split("\n")
      .filter((l) => l.includes("|"))
      .slice(2); // ヘッダー行と区切り行をスキップ

    for (const row of rows) {
      const cols = row.split("|").map((c) => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
      if (cols.length >= 4) {
        items.push({ name: cols[0], qty: cols[1], unit_price: cols[2], amount: cols[3] });
      } else if (cols.length === 3) {
        items.push({ name: cols[0], qty: "1", unit_price: cols[1], amount: cols[2] });
      }
    }
  }

  if (items.length === 0) {
    items.push({ name: "（明細なし）", qty: "-", unit_price: "-", amount: "-" });
  }

  return {
    invoice_number: get(/請求番号[：:]\s*([^\n]+)/),
    date: get(/請求日[：:]\s*([^\n]+)/),
    due_date: get(/支払期限[：:]\s*([^\n]+)/),
    issuer_name: get(/発行者[：:]\s*([^\n]+)/) || get(/発行元[：:]\s*([^\n]+)/) || "",
    issuer_address: get(/発行者住所[：:]\s*([^\n]+)/),
    client_name: get(/請求先[：:]\s*([^\n]+)/) || get(/宛先[：:]\s*([^\n]+)/) || "お客様",
    client_address: get(/住所[：:]\s*([^\n]+)/),
    items,
    subtotal: get(/小計[：:]\s*([^\n]+)/),
    tax: get(/消費税[：:（(][^）)]*[）)]?\s*([^\n]+)/) || get(/税額[：:]\s*([^\n]+)/),
    total: get(/合計[：:]\s*([^\n]+)/) || get(/請求金額[：:]\s*([^\n]+)/),
    notes: get(/備考[：:]\s*([^\n]+)/),
  };
}

// ────────────────────────────────────────────────────────────────
// テーブルヘルパー
// ────────────────────────────────────────────────────────────────

function tableCell(text: string, striped: boolean, align: typeof AlignmentType[keyof typeof AlignmentType] = AlignmentType.LEFT): TableCell {
  return new TableCell({
    shading: striped ? { type: ShadingType.SOLID, color: "f8fafc", fill: "f8fafc" } : undefined,
    children: [new Paragraph({
      children: [normal(text, 20)],
      alignment: align,
      spacing: { before: 80, after: 80 },
    })],
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "e2e8f0" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "e2e8f0" },
      left: { style: BorderStyle.NONE, size: 0 },
      right: { style: BorderStyle.NONE, size: 0 },
    },
  });
}

function headerCell(text: string, align: typeof AlignmentType[keyof typeof AlignmentType] = AlignmentType.LEFT): TableCell {
  return new TableCell({
    shading: { type: ShadingType.SOLID, color: "1e3a5f", fill: "1e3a5f" },
    children: [new Paragraph({
      children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 20 })],
      alignment: align,
      spacing: { before: 100, after: 100 },
    })],
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    borders: {
      top: { style: BorderStyle.NONE, size: 0 },
      bottom: { style: BorderStyle.NONE, size: 0 },
      left: { style: BorderStyle.NONE, size: 0 },
      right: { style: BorderStyle.NONE, size: 0 },
    },
  });
}

function summaryRow(label: string, value: string, highlight = false): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        shading: highlight ? { type: ShadingType.SOLID, color: "1e3a5f", fill: "1e3a5f" } : undefined,
        children: [new Paragraph({
          children: [new TextRun({ text: label, bold: highlight, color: highlight ? "FFFFFF" : "6b7280", size: 20 })],
          alignment: AlignmentType.RIGHT,
          spacing: { before: 80, after: 80 },
        })],
        margins: { top: 80, bottom: 80, left: 100, right: 100 },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: "e2e8f0" },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "e2e8f0" },
          left: { style: BorderStyle.NONE, size: 0 },
          right: { style: BorderStyle.NONE, size: 0 },
        },
      }),
      new TableCell({
        shading: highlight ? { type: ShadingType.SOLID, color: "1e3a5f", fill: "1e3a5f" } : undefined,
        children: [new Paragraph({
          children: [new TextRun({ text: value || "-", bold: true, color: highlight ? "FFFFFF" : "1a1a2e", size: highlight ? 24 : 20 })],
          alignment: AlignmentType.RIGHT,
          spacing: { before: 80, after: 80 },
        })],
        margins: { top: 80, bottom: 80, left: 100, right: 100 },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: "e2e8f0" },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "e2e8f0" },
          left: { style: BorderStyle.NONE, size: 0 },
          right: { style: BorderStyle.NONE, size: 0 },
        },
      }),
    ],
  });
}

function metaRow(label1: string, value1: string, label2: string, value2: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ children: [gray(label1, 18)], spacing: { before: 40, after: 0 } })],
        borders: tableBordersNone(),
      }),
      new TableCell({
        children: [new Paragraph({ children: [bold(value1, 20)], spacing: { before: 40, after: 0 } })],
        borders: tableBordersNone(),
      }),
      new TableCell({
        children: [new Paragraph({ children: [gray(label2, 18)], spacing: { before: 40, after: 0 } })],
        borders: tableBordersNone(),
      }),
      new TableCell({
        children: [new Paragraph({ children: [bold(value2, 20)], spacing: { before: 40, after: 0 } })],
        borders: tableBordersNone(),
      }),
    ],
  });
}

function tableBordersNone() {
  return {
    top: { style: BorderStyle.NONE, size: 0 },
    bottom: { style: BorderStyle.NONE, size: 0 },
    left: { style: BorderStyle.NONE, size: 0 },
    right: { style: BorderStyle.NONE, size: 0 },
  };
}

// ────────────────────────────────────────────────────────────────
// ドキュメントタイプ自動検出
// ────────────────────────────────────────────────────────────────

export function detectDocumentType(content: string): "invoice" | "proposal" | "report" {
  const lower = content.toLowerCase();
  if (/請求書|invoice|請求番号|支払期限|合計金額/.test(lower)) return "invoice";
  if (/提案書|proposal|課題|ソリューション|見積/.test(lower)) return "proposal";
  return "report";
}
