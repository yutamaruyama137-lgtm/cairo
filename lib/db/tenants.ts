/**
 * lib/db/tenants.ts
 *
 * テナント（会社）情報の取得・更新。
 *
 * Phase 1（現在）: config/tenants/*.json から取得
 * Phase 2以降:     Supabase tenants テーブルから取得
 *
 * 呼び出し方:
 *   import { getTenantConfig } from "@/lib/db/tenants"
 *   const config = await getTenantConfig("shibuya")
 */

import type { TenantConfig } from "@/lib/agents/base";

// ========================================
// Phase 1: JSONファイルから取得（現在の実装）
// ========================================

/**
 * テナント設定を取得する。
 * Phase 1: config/tenants/{tenantId}.json から読む
 * Phase 2: Supabase tenants テーブルから取得に切り替える
 */
export async function getTenantConfig(
  tenantId: string = "default"
): Promise<TenantConfig> {
  // TODO Phase 2: 下記をSupabaseクエリに切り替える
  // const { data } = await supabase
  //   .from("tenants")
  //   .select("*")
  //   .eq("tenant_id", tenantId)
  //   .single();

  // Phase 1: デフォルト設定を返す
  const defaultConfig: TenantConfig = {
    tenantId: "default",
    name: "JARVIS BOT",
    subdomain: "app",
    features: ["chat", "menus", "html_preview"],
    customSystemPromptSuffix: "",
    knowledgeBaseId: undefined,
  };

  return defaultConfig;
}

/**
 * サブドメインからテナントIDを特定する。
 * Phase 2実装時: ミドルウェアでサブドメイン検出に使う
 *
 * 例: shibuya.jarvis-bot.com → "shibuya"
 */
export function extractTenantIdFromSubdomain(hostname: string): string {
  const parts = hostname.split(".");
  if (parts.length >= 3) {
    return parts[0]; // "shibuya"
  }
  return "default";
}

// ========================================
// Phase 2以降で実装する関数（TODO）
// ========================================

/**
 * TODO Phase 2: Supabase に新しいテナントを作成
 */
// export async function createTenant(data: Omit<TenantConfig, "tenantId">): Promise<TenantConfig> {}

/**
 * TODO Phase 2: テナント設定を更新
 */
// export async function updateTenantConfig(tenantId: string, updates: Partial<TenantConfig>): Promise<void> {}
