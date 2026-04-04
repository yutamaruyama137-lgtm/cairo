/**
 * app/api/admin/menus/route.ts
 *
 * テナントメニュー管理API（管理者のみ）。
 * GET  → メニュー一覧
 * POST → メニュー作成
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listTenantMenus, upsertTenantMenu } from "@/lib/db/menus";
import { getKnowledgeSources } from "@/lib/db/knowledge";

export async function GET() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId ?? null;
  if (!session || !tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "管理者のみ操作できます" }, { status: 403 });

  try {
    const [menus, sources] = await Promise.all([
      listTenantMenus(tenantId),
      getKnowledgeSources(tenantId),
    ]);
    return NextResponse.json({ menus, knowledgeSources: sources.map((s) => s.source_name) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId ?? null;
  if (!session || !tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "管理者のみ操作できます" }, { status: 403 });

  try {
    const body = await req.json();
    const { menu_id, character_id, title, description, icon, estimated_seconds, human_minutes,
            category, inputs, prompt_template, knowledge_sources, output_label, is_enabled, sort_order } = body;

    if (!menu_id || !character_id || !title || !prompt_template) {
      return NextResponse.json({ error: "menu_id, character_id, title, prompt_template は必須です" }, { status: 400 });
    }

    const menu = await upsertTenantMenu(tenantId, {
      menu_id,
      character_id,
      title,
      description: description ?? "",
      icon: icon ?? "📝",
      estimated_seconds: estimated_seconds ?? 30,
      human_minutes: human_minutes ?? 30,
      category: category ?? "文書作成",
      inputs: inputs ?? [],
      prompt_template,
      knowledge_sources: knowledge_sources ?? [],
      output_label: output_label ?? "成果物",
      is_enabled: is_enabled ?? true,
      sort_order: sort_order ?? 0,
    });

    return NextResponse.json({ menu });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "作成に失敗しました" }, { status: 500 });
  }
}
