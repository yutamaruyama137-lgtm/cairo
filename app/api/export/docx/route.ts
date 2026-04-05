export const maxDuration = 60;

/**
 * app/api/export/docx/route.ts
 *
 * POST { content, type? }
 * → 提案書 / 請求書 / レポートを .docx として返す
 */

import { NextRequest, NextResponse } from "next/server";
import {
  generateProposalDocx,
  generateInvoiceDocx,
  generateMinutesDocx,
  generateReportDocx,
  detectDocumentType,
} from "@/lib/docx-generators";

export async function POST(req: NextRequest) {
  try {
    const { content, type, filename } = await req.json() as {
      content: string;
      type?: "invoice" | "proposal" | "minutes" | "report" | "auto";
      filename?: string;
    };

    if (!content) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const docType = (!type || type === "auto") ? detectDocumentType(content) : type;

    let buffer: Buffer;
    switch (docType) {
      case "invoice":
        buffer = await generateInvoiceDocx(content);
        break;
      case "proposal":
        buffer = await generateProposalDocx(content);
        break;
      case "minutes":
        buffer = await generateMinutesDocx(content);
        break;
      default:
        buffer = await generateReportDocx(content);
    }

    const safeFilename = (filename ?? `${docType}-${new Date().toISOString().slice(0, 10)}`).replace(/[^\w\-\.]/g, "_");

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(safeFilename)}.docx`,
      },
    });
  } catch (err) {
    console.error("[export/docx]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "生成に失敗しました" },
      { status: 500 }
    );
  }
}
