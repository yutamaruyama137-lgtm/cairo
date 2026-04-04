/**
 * app/api/knowledge/sources/route.ts
 *
 * ナレッジソースの一覧取得・削除API。
 * GET  /api/knowledge/sources       → ソース一覧
 * DELETE /api/knowledge/sources     → ソース削除（body: { sourceName }）
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionTenantId } from "@/lib/tenant";
import { getKnowledgeSources, deleteKnowledgeSource } from "@/lib/db/knowledge";
import { isEmbeddingEnabled } from "@/lib/embeddings";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const tenantId = getSessionTenantId(session);
  const sources = await getKnowledgeSources(tenantId);

  return NextResponse.json({
    sources,
    vectorSearchEnabled: isEmbeddingEnabled(),
  });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  let body: { sourceName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストボディが不正です" }, { status: 400 });
  }

  if (!body.sourceName) {
    return NextResponse.json({ error: "sourceName が必要です" }, { status: 400 });
  }

  const tenantId = getSessionTenantId(session);

  try {
    await deleteKnowledgeSource(tenantId, body.sourceName);
  } catch (err) {
    console.error("[knowledge/sources] delete error:", err);
    return NextResponse.json({ error: "削除中にエラーが発生しました" }, { status: 500 });
  }

  return NextResponse.json({ message: "削除完了", sourceName: body.sourceName });
}
