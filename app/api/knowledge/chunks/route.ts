/**
 * app/api/knowledge/chunks/route.ts
 *
 * 特定ソースのチャンク一覧を取得するAPI。
 * GET /api/knowledge/chunks?source=ファイル名
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionTenantId } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  const sourceName = req.nextUrl.searchParams.get("source");
  if (!sourceName) return NextResponse.json({ error: "source パラメータが必要です" }, { status: 400 });

  const tenantId = getSessionTenantId(session);

  const { data, error } = await supabaseAdmin
    .from("knowledge_chunks")
    .select("id, content, metadata, created_at")
    .eq("tenant_id", tenantId)
    .eq("source_name", sourceName)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ chunks: data ?? [] });
}
