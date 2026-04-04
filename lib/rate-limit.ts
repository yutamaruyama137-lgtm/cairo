/**
 * lib/rate-limit.ts
 *
 * テナントの月間実行回数制限チェック。
 * プラン別デフォルト上限：
 *   starter    → 100回/月
 *   standard   → 1,000回/月
 *   enterprise → 無制限（null）
 *
 * tenantsテーブルの monthly_execution_limit が設定されている場合はそちらを優先。
 */

import { supabaseAdmin } from "@/lib/supabase";

const PLAN_LIMITS: Record<string, number | null> = {
  starter: 100,
  standard: 1000,
  enterprise: null, // 無制限
};

export interface RateLimitResult {
  allowed: boolean;
  used: number;
  limit: number | null;
  plan: string;
}

export async function checkRateLimit(tenantId: string): Promise<RateLimitResult> {
  // テナント情報を取得
  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("plan, monthly_execution_limit")
    .eq("id", tenantId)
    .single();

  const plan = tenant?.plan ?? "starter";
  const limit =
    tenant?.monthly_execution_limit !== undefined && tenant?.monthly_execution_limit !== null
      ? tenant.monthly_execution_limit
      : PLAN_LIMITS[plan] ?? 100;

  // 無制限プラン
  if (limit === null) {
    return { allowed: true, used: 0, limit: null, plan };
  }

  // 今月の実行回数を集計
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count } = await supabaseAdmin
    .from("menu_executions")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .gte("created_at", startOfMonth.toISOString());

  const used = count ?? 0;
  return { allowed: used < limit, used, limit, plan };
}
