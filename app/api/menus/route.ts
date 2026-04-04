/**
 * app/api/menus/route.ts
 *
 * ログイン済みユーザー向けのメニュー取得API（ロール問わず）。
 * GET /api/menus?characterId=xxx
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantMenusByCharacter } from "@/lib/db/menus";
import { getMenusByCharacter } from "@/data/menus";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const characterId = req.nextUrl.searchParams.get("characterId");
  if (!characterId) return NextResponse.json({ error: "characterId is required" }, { status: 400 });

  const tenantId = session.user.tenantId ?? null;

  // DBメニューを優先、なければ静的データにフォールバック
  if (tenantId) {
    try {
      const rows = await getTenantMenusByCharacter(tenantId, characterId);
      if (rows.length > 0) {
        const menus = rows.map((r) => ({
          id: r.menu_id,
          title: r.title,
          icon: r.icon,
        }));
        return NextResponse.json({ menus });
      }
    } catch {
      // フォールバック
    }
  }

  // 静的データ
  const staticMenus = getMenusByCharacter(characterId).map((m) => ({
    id: m.id,
    title: m.title,
    icon: m.icon,
  }));
  return NextResponse.json({ menus: staticMenus });
}
