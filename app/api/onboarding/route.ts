/**
 * app/api/onboarding/route.ts
 *
 * 会社（テナント）の新規作成API。
 * 初回ログインユーザーが会社名を入力して実行する。
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

function generateSubdomain(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30) || "company";
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  // すでにテナントがある場合はスキップ
  if (session.user.tenantId) {
    return NextResponse.json({ error: "すでに会社に参加しています" }, { status: 400 });
  }

  let body: { companyName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }

  const companyName = body.companyName?.trim();
  if (!companyName || companyName.length < 1 || companyName.length > 50) {
    return NextResponse.json({ error: "会社名は1〜50文字で入力してください" }, { status: 400 });
  }

  // サブドメインの重複チェック＆ユニーク化
  let subdomain = generateSubdomain(companyName);
  let attempt = 0;
  while (true) {
    const candidate = attempt === 0 ? subdomain : `${subdomain}-${attempt}`;
    const { data: existing } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("subdomain", candidate)
      .maybeSingle();
    if (!existing) { subdomain = candidate; break; }
    attempt++;
    if (attempt > 99) {
      subdomain = `company-${Date.now()}`;
      break;
    }
  }

  // トランザクション的に: テナント作成 → AI社員初期設定 → ユーザー更新
  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from("tenants")
    .insert({
      subdomain,
      name: companyName,
      plan: "starter",
    })
    .select("id")
    .single();

  if (tenantError || !tenant) {
    console.error("[onboarding] tenant create error:", tenantError);
    return NextResponse.json({ error: "会社の作成に失敗しました" }, { status: 500 });
  }

  // デフォルトのAI社員設定を作成
  const agentIds = ["jin", "ai", "rin", "vi", "iori", "saki"];
  await supabaseAdmin.from("tenant_agents").insert(
    agentIds.map((agentId) => ({
      tenant_id: tenant.id,
      agent_id: agentId,
      is_enabled: true,
    }))
  );

  // ユーザーをこのテナントの管理者にする
  const { error: userError } = await supabaseAdmin
    .from("users")
    .update({ tenant_id: tenant.id, role: "admin" })
    .eq("email", session.user.email);

  if (userError) {
    console.error("[onboarding] user update error:", userError);
    // テナントをロールバック
    await supabaseAdmin.from("tenants").delete().eq("id", tenant.id);
    return NextResponse.json({ error: "ユーザー設定に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({
    message: "会社を作成しました",
    tenantId: tenant.id,
    companyName,
  });
}
