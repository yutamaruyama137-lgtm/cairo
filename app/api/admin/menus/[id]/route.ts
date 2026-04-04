/**
 * app/api/admin/menus/[id]/route.ts
 *
 * 個別メニューの更新・削除API（管理者のみ）。
 * PUT    → メニュー更新
 * DELETE → メニュー削除
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateTenantMenu, deleteTenantMenu } from "@/lib/db/menus";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId ?? null;
  if (!session || !tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "管理者のみ操作できます" }, { status: 403 });

  try {
    const body = await req.json();
    const menu = await updateTenantMenu(tenantId, params.id, body);
    return NextResponse.json({ menu });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId ?? null;
  if (!session || !tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "管理者のみ操作できます" }, { status: 403 });

  try {
    await deleteTenantMenu(tenantId, params.id);
    return NextResponse.json({ message: "削除しました" });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "削除に失敗しました" }, { status: 500 });
  }
}
