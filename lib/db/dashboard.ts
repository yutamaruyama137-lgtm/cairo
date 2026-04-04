/**
 * lib/db/dashboard.ts
 *
 * 削減時間ダッシュボード用のDB集計クエリ。
 * menu_executions テーブルの実行履歴を集計し、
 * menus.ts の humanMinutes と掛け合わせて削減時間を計算する。
 */

import { supabaseAdmin } from "@/lib/supabase";

export interface ExecutionStat {
  menu_id: string;
  character_id: string;
  count: number;
}

export interface MonthlyTrend {
  month: string;   // "2026-03" 形式
  count: number;
  label: string;   // "3月" 表示用
}

export interface DashboardStats {
  allTime: ExecutionStat[];
  thisMonth: ExecutionStat[];
  trend: MonthlyTrend[];  // 直近6ヶ月
}

/** テナントの実行統計を取得する */
export async function getDashboardStats(tenantId: string): Promise<DashboardStats> {
  const [allTimeRes, thisMonthRes, trendRes] = await Promise.all([
    // 全期間の集計
    supabaseAdmin
      .from("menu_executions")
      .select("menu_id, character_id")
      .eq("tenant_id", tenantId)
      .eq("status", "completed"),

    // 今月の集計
    supabaseAdmin
      .from("menu_executions")
      .select("menu_id, character_id")
      .eq("tenant_id", tenantId)
      .eq("status", "completed")
      .gte("created_at", getMonthStart(0)),

    // 直近6ヶ月のトレンド（月ごとの実行回数）
    supabaseAdmin
      .from("menu_executions")
      .select("created_at")
      .eq("tenant_id", tenantId)
      .eq("status", "completed")
      .gte("created_at", getMonthStart(5)),
  ]);

  const allTime = groupByMenuAndChar(allTimeRes.data ?? []);
  const thisMonth = groupByMenuAndChar(thisMonthRes.data ?? []);
  const trend = buildTrend(trendRes.data ?? []);

  return { allTime, thisMonth, trend };
}

// ── ヘルパー ──────────────────────────────────────────────

function groupByMenuAndChar(
  rows: Array<{ menu_id: string; character_id: string }>
): ExecutionStat[] {
  const map = new Map<string, ExecutionStat>();
  for (const row of rows) {
    const key = `${row.menu_id}::${row.character_id}`;
    const existing = map.get(key);
    if (existing) {
      existing.count++;
    } else {
      map.set(key, { menu_id: row.menu_id, character_id: row.character_id, count: 1 });
    }
  }
  return Array.from(map.values());
}

function buildTrend(rows: Array<{ created_at: string }>): MonthlyTrend[] {
  const countMap = new Map<string, number>();

  // 直近6ヶ月のキーを初期化（0件でも表示するため）
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    countMap.set(key, 0);
  }

  for (const row of rows) {
    const d = new Date(row.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    countMap.set(key, (countMap.get(key) ?? 0) + 1);
  }

  return Array.from(countMap.entries()).map(([month, count]) => ({
    month,
    count,
    label: `${parseInt(month.split("-")[1])}月`,
  }));
}

/** n ヶ月前の月初 ISO 文字列を返す（0 = 今月）*/
function getMonthStart(monthsAgo: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - monthsAgo);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
