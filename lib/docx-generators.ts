/**
 * lib/docx-generators.ts
 *
 * 提案書・議事録・請求書・レポートの docx 生成ロジック（サーバーサイド専用）
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
        heading: HeadingLevel.HEADING_1,
        children: [bold(line.slice(3), 26, "1a1a2e")],
        border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "3b82f6" } },
        spacing: { before: 400, after: 180 },
      }));
    } else if (line.startsWith("### ")) {
      blocks.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [bold(line.slice(4), 23, "374151")],
        spacing: { before: 280, after: 100 },
      }));
    } else if (line.startsWith("#### ")) {
      blocks.push(new Paragraph({
        heading: HeadingLevel.HEADING_3,
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

/**
 * AIが出力する提案書Markdown（下記構造）をdocx化する
 *
 * # 〇〇株式会社 様へのご提案
 * ## 1. 現状の課題
 * ### 課題の根本原因
 * ## 2. ご提案内容
 * ## 3. 期待される効果   ← テーブルあり
 * ## 4. 導入ステップ    ← 番号付き
 * ## 5. 費用・条件
 * ## 6. まとめ
 */
export async function generateProposalDocx(content: string): Promise<Buffer> {
  const lines = content.split("\n");

  // ── タイトルと会社名の抽出 ────────────────────────────────────
  let fullTitle = "ご提案書";
  let companyName = "";
  let bodyStart = 0;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("# ")) {
      fullTitle = lines[i].slice(2).trim();
      bodyStart = i + 1;
      // 「〇〇株式会社 様へのご提案」から会社名を抽出
      const match = fullTitle.match(/^(.+?)\s*様へのご提案/);
      if (match) {
        companyName = match[1].trim();
      }
      break;
    }
  }

  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric", month: "long", day: "numeric",
  });

  // ── 本文をセクション単位に分割 ────────────────────────────────
  const bodyLines = lines.slice(bodyStart);
  const proposalSections = parseProposalSections(bodyLines);

  // ── カバーページ children ──────────────────────────────────────
  const coverChildren: Paragraph[] = [
    spacer(2000, 0),

    // アクセントバー（上線）
    new Paragraph({
      children: [new TextRun({ text: "", size: 4 })],
      border: { top: { style: BorderStyle.THICK, size: 16, color: "3b82f6" } },
      spacing: { before: 0, after: 600 },
    }),

    // ラベル「ご提案書」
    new Paragraph({
      children: [new TextRun({ text: "ご 提 案 書", size: 28, color: "3b82f6", bold: true })],
      alignment: AlignmentType.LEFT,
      spacing: { before: 0, after: 320 },
    }),

    // 会社名（大きく）
    ...(companyName ? [
      new Paragraph({
        children: [bold(`${companyName} 様`, 52, "1a1a2e")],
        alignment: AlignmentType.LEFT,
        spacing: { before: 0, after: 200 },
      }),
    ] : []),

    // サブタイトル（全体タイトル）
    new Paragraph({
      children: [normal(fullTitle, 26, "6b7280")],
      alignment: AlignmentType.LEFT,
      spacing: { before: 0, after: 600 },
    }),

    // 区切り線
    new Paragraph({
      children: [new TextRun({ text: "", size: 2 })],
      border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "e5e7eb" } },
      spacing: { before: 0, after: 400 },
    }),

    // 提案日
    new Paragraph({
      children: [gray(`提案日：${today}`, 22)],
      alignment: AlignmentType.LEFT,
      spacing: { before: 0, after: 120 },
    }),

    // ページブレーク
    new Paragraph({ text: "", children: [new PageBreak()] }),
  ];

  // ── 本文 children ──────────────────────────────────────────────
  const bodyChildren: (Paragraph | Table)[] = [];

  if (proposalSections.length === 0) {
    // セクションが見つからない場合のフォールバック
    bodyChildren.push(...markdownToBlocks(content));
  } else {
    for (const section of proposalSections) {
      // セクションヘッダーブロック
      bodyChildren.push(...buildProposalSectionHeader(section.heading));

      // セクション本文のパース（種別で処理を分岐）
      const sectionType = detectSectionType(section.heading);

      if (sectionType === "effect") {
        // 「期待される効果」— テーブルを含む可能性あり
        bodyChildren.push(...buildEffectSection(section.body));
      } else if (sectionType === "steps") {
        // 「導入ステップ」— 番号付きタイムライン風
        bodyChildren.push(...buildStepsSection(section.body));
      } else {
        // その他セクション — 汎用変換
        bodyChildren.push(...markdownToBlocks(section.body));
      }

      bodyChildren.push(spacer(160, 0));
    }
  }

  // ── Document 組み立て ──────────────────────────────────────────
  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "游明朝", size: 22, color: "374151" } },
      },
    },
    sections: [
      // カバーページ（フッターなし）
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
        children: coverChildren,
      },

      // 本文（ヘッダー・フッターあり）
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
              children: [
                ...(companyName ? [gray(`${companyName} 様 | `, 18)] : []),
                gray(fullTitle, 18),
              ],
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
        children: bodyChildren,
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

// ── 提案書パーサー：## セクション単位に分割 ──────────────────────

interface ProposalSection {
  heading: string;
  body: string;
}

function parseProposalSections(lines: string[]): ProposalSection[] {
  const sections: ProposalSection[] = [];
  let currentHeading = "";
  let currentBody: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (currentHeading || currentBody.length > 0) {
        sections.push({ heading: currentHeading, body: currentBody.join("\n") });
      }
      currentHeading = line.slice(3).trim();
      currentBody = [];
    } else {
      currentBody.push(line);
    }
  }

  if (currentHeading || currentBody.length > 0) {
    sections.push({ heading: currentHeading, body: currentBody.join("\n") });
  }

  return sections;
}

// ── セクション種別判定 ────────────────────────────────────────────

type SectionType = "effect" | "steps" | "generic";

function detectSectionType(heading: string): SectionType {
  if (/効果|成果|インパクト|KPI/.test(heading)) return "effect";
  if (/ステップ|スケジュール|ロードマップ|導入|フェーズ/.test(heading)) return "steps";
  return "generic";
}

// ── セクションヘッダーブロック（番号を大きく表示） ────────────────

function buildProposalSectionHeader(heading: string): Paragraph[] {
  // 「1. 現状の課題」→ num="1." / title="現状の課題"
  const match = heading.match(/^(\d+\.\s*)(.+)$/);
  if (match) {
    const num = match[1].trim();
    const title = match[2].trim();
    return [
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({ text: num + " ", bold: true, size: 36, color: "3b82f6" }),
          new TextRun({ text: title, bold: true, size: 30, color: "1a1a2e" }),
        ],
        border: {
          bottom: { style: BorderStyle.THICK, size: 4, color: "3b82f6" },
        },
        spacing: { before: 480, after: 200 },
      }),
    ];
  }

  // 番号なしヘッダー
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [bold(heading, 28, "1a1a2e")],
      border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "3b82f6" } },
      spacing: { before: 480, after: 200 },
    }),
  ];
}

// ── 「期待される効果」セクション ─────────────────────────────────
// テーブルはストライプ付き、その他はmarkdownToBlocks

function buildEffectSection(body: string): (Paragraph | Table)[] {
  const blocks: (Paragraph | Table)[] = [];
  const lines = body.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.includes("|") && i + 1 < lines.length && lines[i + 1].includes("---")) {
      // テーブル行を収集
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const table = buildEffectTable(tableLines);
      if (table) { blocks.push(table); blocks.push(spacer(120, 80)); }
      continue;
    }

    // テーブル以外は汎用変換
    const remaining = lines.slice(i).join("\n");
    const nextTableIdx = lines.slice(i).findIndex((l, idx) => l.includes("|") && lines[i + idx + 1]?.includes("---"));
    const chunk = nextTableIdx > 0
      ? lines.slice(i, i + nextTableIdx).join("\n")
      : remaining;

    blocks.push(...markdownToBlocks(chunk));
    i += nextTableIdx > 0 ? nextTableIdx : lines.length - i;
  }

  return blocks;
}

function buildEffectTable(tableLines: string[]): Table | null {
  const filtered = tableLines.filter((l) => l.includes("|"));
  if (filtered.length < 3) return null;

  const parseRow = (line: string) =>
    line.split("|").map((c) => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);

  const headers = parseRow(filtered[0]);
  const rows = filtered.slice(2).map(parseRow);

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [3000, 2400, 2400],
    rows: [
      // ヘッダー行
      new TableRow({
        children: headers.map((h) =>
          new TableCell({
            shading: { type: ShadingType.SOLID, color: "1e3a5f", fill: "1e3a5f" },
            children: [new Paragraph({
              children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 21 })],
              alignment: AlignmentType.CENTER,
              spacing: { before: 100, after: 100 },
            })],
            margins: { top: 100, bottom: 100, left: 120, right: 120 },
            borders: {
              top: { style: BorderStyle.NONE, size: 0 },
              bottom: { style: BorderStyle.SINGLE, size: 2, color: "3b82f6" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "1e3a5f" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "1e3a5f" },
            },
          })
        ),
      }),
      // データ行
      ...rows.map((row, rowIdx) =>
        new TableRow({
          children: row.map((cell, colIdx) =>
            new TableCell({
              shading: rowIdx % 2 === 1
                ? { type: ShadingType.SOLID, color: "f0f7ff", fill: "f0f7ff" }
                : undefined,
              children: [new Paragraph({
                children: [new TextRun({
                  text: cell,
                  bold: colIdx === 0,
                  color: colIdx === 0 ? "1a1a2e" : "374151",
                  size: 20,
                })],
                alignment: colIdx === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
                spacing: { before: 80, after: 80 },
              })],
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
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
    ],
  });
}

// ── 「導入ステップ」セクション ───────────────────────────────────
// 番号付きリストをシンプルな段落として出力

function buildStepsSection(body: string): (Paragraph | Table)[] {
  const blocks: (Paragraph | Table)[] = [];
  const lines = body.split("\n");

  for (const line of lines) {
    // ### サブ見出し
    if (line.startsWith("### ")) {
      blocks.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [bold(line.slice(4), 22, "374151")],
        spacing: { before: 240, after: 80 },
      }));
      continue;
    }

    // 番号付きリスト（1. / 2. ...）→ シンプルなParagraphとして出力
    const numMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (numMatch) {
      const stepNum = numMatch[1];
      const stepText = numMatch[2];
      blocks.push(new Paragraph({
        children: [
          new TextRun({ text: `${stepNum}. `, bold: true, size: 22, color: "3b82f6" }),
          ...parseInline(stepText, 22, "1a1a2e"),
        ],
        spacing: { before: 120, after: 80 },
        indent: { left: 200 },
      }));
      continue;
    }

    // ハイフンリスト（インデントあり）
    if (/^  [-*] /.test(line)) {
      blocks.push(new Paragraph({
        children: parseInline(line.slice(4), 20, "6b7280"),
        bullet: { level: 1 },
        spacing: { before: 30, after: 30 },
      }));
      continue;
    }

    // 空行
    if (line.trim() === "" || line === "---") {
      blocks.push(spacer(60, 40));
      continue;
    }

    // その他テキスト
    if (line.trim()) {
      blocks.push(new Paragraph({
        children: parseInline(line, 20, "6b7280"),
        spacing: { before: 40, after: 40 },
        alignment: AlignmentType.JUSTIFIED,
      }));
    }
  }

  return blocks;
}

// ────────────────────────────────────────────────────────────────
// 議事録生成
// ────────────────────────────────────────────────────────────────

/**
 * AIが出力する議事録Markdown（下記構造）をdocx化する
 *
 * # 議事録
 * **日時**: YYYY年MM月DD日
 * **参加者**: 〇〇、△△
 * ## アジェンダ
 * ## 議事内容
 * ### 1. [議題名]
 * ## 決定事項
 * - ✅ ...
 * ## ネクストアクション
 * | # | アクション | 担当 | 期日 |
 * ## 次回会議
 */
export async function generateMinutesDocx(content: string): Promise<Buffer> {
  const lines = content.split("\n");

  // ── タイトル・メタ情報の抽出 ────────────────────────────────────
  let docTitle = "議事録";
  let dateValue = "";
  let attendees = "";
  let bodyStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("# ")) {
      docTitle = line.slice(2).trim();
      bodyStart = i + 1;
    }
    const dateMatch = line.match(/\*\*日時\*\*[：:]\s*(.+)/);
    if (dateMatch) { dateValue = dateMatch[1].trim(); bodyStart = Math.max(bodyStart, i + 1); }
    const attendeeMatch = line.match(/\*\*参加者\*\*[：:]\s*(.+)/);
    if (attendeeMatch) { attendees = attendeeMatch[1].trim(); bodyStart = Math.max(bodyStart, i + 1); }
    if (i > 10) break; // メタ情報はファイル冒頭にある前提
  }

  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric", month: "long", day: "numeric",
  });
  const displayDate = dateValue || today;

  // ── 本文をセクション単位に分割 ────────────────────────────────
  const bodyLines = lines.slice(bodyStart);
  const minutesSections = parseProposalSections(bodyLines); // 同じロジックを再利用

  // ── 本文 children 組み立て ──────────────────────────────────────
  const bodyChildren: (Paragraph | Table)[] = [];

  // ヘッダー部：タイトル・日時・参加者をParagraphで配置（テーブル不要）
  bodyChildren.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [bold(docTitle, 36, "1a1a2e")],
    border: { bottom: { style: BorderStyle.THICK, size: 8, color: "3b82f6" } },
    spacing: { before: 0, after: 200 },
  }));
  bodyChildren.push(new Paragraph({
    children: [normal(`日時: ${displayDate}`, 22, "374151")],
    spacing: { before: 80, after: 60 },
  }));
  bodyChildren.push(new Paragraph({
    children: [normal(`参加者: ${attendees || "—"}`, 22, "374151")],
    spacing: { before: 0, after: 200 },
  }));
  bodyChildren.push(spacer(100, 100));

  for (const section of minutesSections) {
    const sectionType = detectMinutesSectionType(section.heading);

    // セクション見出し
    bodyChildren.push(buildMinutesSectionHeading(section.heading));

    if (sectionType === "decisions") {
      bodyChildren.push(...buildDecisionsSection(section.body));
    } else if (sectionType === "actions") {
      bodyChildren.push(...buildNextActionsSection(section.body));
    } else {
      bodyChildren.push(...markdownToBlocks(section.body));
    }

    bodyChildren.push(spacer(120, 0));
  }

  // ── Document 組み立て ──────────────────────────────────────────
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
      headers: {
        default: new Header({
          children: [new Paragraph({
            children: [
              gray(docTitle, 18),
              gray("　|　", 18),
              gray(displayDate, 18),
            ],
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
      children: bodyChildren,
    }],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

// ── 議事録セクション種別判定 ─────────────────────────────────────

type MinutesSectionType = "decisions" | "actions" | "generic";

function detectMinutesSectionType(heading: string): MinutesSectionType {
  if (/決定|合意|承認/.test(heading)) return "decisions";
  if (/ネクストアクション|アクション|TODO|次のステップ|担当/.test(heading)) return "actions";
  return "generic";
}

// ── 議事録セクション見出し ────────────────────────────────────────

function buildMinutesSectionHeading(heading: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [bold(heading, 26, "1a1a2e")],
    border: {
      left: { style: BorderStyle.THICK, size: 8, color: "3b82f6" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "e5e7eb" },
    },
    spacing: { before: 400, after: 180 },
    indent: { left: 200 },
  });
}

// ── 「決定事項」セクション（✅ アイコン付きリスト） ───────────────

function buildDecisionsSection(body: string): Paragraph[] {
  const blocks: Paragraph[] = [];
  const lines = body.split("\n");

  for (const line of lines) {
    if (line.trim() === "" || line === "---") {
      blocks.push(spacer(40, 40));
      continue;
    }

    // ✅ アイコンが既に含まれる行
    const hasCheck = /^[-*]\s*✅/.test(line) || /^✅/.test(line.trim());
    // ハイフンリスト
    const isBullet = /^[-*] /.test(line);

    if (hasCheck || isBullet) {
      // ✅ を除いたテキスト
      const rawText = line.replace(/^[-*]\s*/, "").replace(/^✅\s*/, "").trim();
      blocks.push(new Paragraph({
        children: [
          new TextRun({ text: "✅  ", size: 22, color: "16a34a" }),
          ...parseInline(rawText, 22, "1a1a2e"),
        ],
        spacing: { before: 100, after: 100 },
        indent: { left: 200 },
      }));
    } else if (line.trim()) {
      blocks.push(new Paragraph({
        children: parseInline(line.trim()),
        spacing: { before: 60, after: 60 },
      }));
    }
  }

  return blocks;
}

// ── 「ネクストアクション」セクション（ストライプ表） ─────────────

function buildNextActionsSection(body: string): (Paragraph | Table)[] {
  const blocks: (Paragraph | Table)[] = [];
  const lines = body.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // テーブル検出
    if (line.includes("|") && i + 1 < lines.length && lines[i + 1].includes("---")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const table = buildActionsTable(tableLines);
      if (table) { blocks.push(table); blocks.push(spacer(100, 80)); }
      continue;
    }

    if (line.trim() === "" || line === "---") {
      blocks.push(spacer(40, 40));
    } else if (line.trim()) {
      blocks.push(new Paragraph({
        children: parseInline(line.trim()),
        spacing: { before: 60, after: 60 },
      }));
    }
    i++;
  }

  return blocks;
}

function buildActionsTable(tableLines: string[]): Table | null {
  const filtered = tableLines.filter((l) => l.includes("|"));
  if (filtered.length < 3) return null;

  const parseRow = (line: string) =>
    line.split("|").map((c) => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);

  const headers = parseRow(filtered[0]);
  const rows = filtered.slice(2).map(parseRow);

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [400, 4000, 1600, 1600],
    rows: [
      // ヘッダー行
      new TableRow({
        children: headers.map((h) =>
          new TableCell({
            shading: { type: ShadingType.SOLID, color: "374151", fill: "374151" },
            children: [new Paragraph({
              children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 20 })],
              alignment: AlignmentType.CENTER,
              spacing: { before: 80, after: 80 },
            })],
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            borders: {
              top: { style: BorderStyle.NONE, size: 0 },
              bottom: { style: BorderStyle.SINGLE, size: 2, color: "3b82f6" },
              left: { style: BorderStyle.NONE, size: 0 },
              right: { style: BorderStyle.SINGLE, size: 1, color: "4b5563" },
            },
          })
        ),
      }),
      // データ行
      ...rows.map((row, rowIdx) =>
        new TableRow({
          children: row.map((cell, colIdx) => {
            const isStripe = rowIdx % 2 === 1;
            return new TableCell({
              shading: isStripe
                ? { type: ShadingType.SOLID, color: "f9fafb", fill: "f9fafb" }
                : undefined,
              children: [new Paragraph({
                children: [new TextRun({
                  text: cell,
                  size: 20,
                  bold: colIdx === 1,   // アクション列を太字
                  color: colIdx === 0 ? "9ca3af" : "374151",
                })],
                alignment: colIdx === 0 ? AlignmentType.CENTER : AlignmentType.LEFT,
                spacing: { before: 80, after: 80 },
              })],
              margins: { top: 80, bottom: 80, left: 100, right: 100 },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: "e5e7eb" },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: "e5e7eb" },
                left: { style: BorderStyle.NONE, size: 0 },
                right: { style: BorderStyle.SINGLE, size: 1, color: "e5e7eb" },
              },
            });
          }),
        })
      ),
    ],
  });
}

// ────────────────────────────────────────────────────────────────
// 請求書生成（現状維持）
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
// テーブルヘルパー（請求書用）
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

export function detectDocumentType(content: string): "invoice" | "proposal" | "minutes" | "report" {
  if (/請求書|invoice|請求番号|支払期限|合計金額/.test(content)) return "invoice";
  if (/議事録|アジェンダ|決定事項|ネクストアクション|参加者/.test(content)) return "minutes";
  if (/提案書|proposal|課題|ソリューション|見積/.test(content)) return "proposal";
  return "report";
}

// InvoiceData と ProposalData は上部の interface 定義で export 済み
