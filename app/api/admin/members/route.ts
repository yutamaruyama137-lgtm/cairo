/**
 * app/api/admin/members/route.ts
 *
 * メンバー管理API（管理者のみ）。
 * GET    → メンバー一覧 + 招待一覧
 * POST   → 招待追加
 * DELETE → 招待取消 or メンバー削除
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getTenantMembers,
  getPendingInvites,
  inviteMember,
  cancelInvite,
  removeMember,
} from "@/lib/db/members";

function getSessionTenant(session: Session | null) {
  return session?.user?.tenantId ?? null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const tenantId = getSessionTenant(session);
  if (!session || !tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "管理者のみ操作できます" }, { status: 403 });

  const [members, invites] = await Promise.all([
    getTenantMembers(tenantId),
    getPendingInvites(tenantId),
  ]);

  return NextResponse.json({ members, invites });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const tenantId = getSessionTenant(session);
  if (!session || !tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "管理者のみ操作できます" }, { status: 403 });

  const { email, role = "member" } = await req.json();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "有効なメールアドレスを入力してください" }, { status: 400 });
  }
  if (!["admin", "member"].includes(role)) {
    return NextResponse.json({ error: "role は admin または member にしてください" }, { status: 400 });
  }

  try {
    await inviteMember(tenantId, email.toLowerCase(), role, session.user.id);
    return NextResponse.json({ message: "招待しました", email });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "招待に失敗しました" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const tenantId = getSessionTenant(session);
  if (!session || !tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "管理者のみ操作できます" }, { status: 403 });

  const { type, id } = await req.json();

  try {
    if (type === "invite") {
      await cancelInvite(tenantId, id);
      return NextResponse.json({ message: "招待を取り消しました" });
    }
    if (type === "member") {
      // 自分自身は削除不可
      if (id === session.user.id) {
        return NextResponse.json({ error: "自分自身は削除できません" }, { status: 400 });
      }
      await removeMember(tenantId, id);
      return NextResponse.json({ message: "メンバーを削除しました" });
    }
    return NextResponse.json({ error: "type が不正です" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "操作に失敗しました" },
      { status: 500 }
    );
  }
}
