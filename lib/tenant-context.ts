/**
 * lib/tenant-context.ts
 *
 * APIルート・サーバーコンポーネントからtenantIdを取得するユーティリティ。
 * middlewareが x-tenant-id ヘッダーを注入するので、ここで読み取る。
 */

import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";

export const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

export interface TenantInfo {
  id: string;
  subdomain: string;
  name: string;
  plan: "starter" | "standard" | "enterprise";
  monthly_execution_limit: number | null;
  primary_color: string;
}

/** リクエストヘッダーからtenantIdを取得する（サーバーコンポーネント・APIルート共通）*/
export function getTenantId(): string {
  try {
    const headersList = headers();
    return headersList.get("x-tenant-id") ?? DEFAULT_TENANT_ID;
  } catch {
    return DEFAULT_TENANT_ID;
  }
}

/** tenantIdからテナント情報をSupabaseで取得（TTLキャッシュ付き）*/
const cache = new Map<string, { data: TenantInfo; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5分

export async function getTenantInfo(tenantId: string): Promise<TenantInfo | null> {
  const now = Date.now();
  const cached = cache.get(tenantId);
  if (cached && cached.expiresAt > now) return cached.data;

  const { data, error } = await supabaseAdmin
    .from("tenants")
    .select("id, subdomain, name, plan, monthly_execution_limit, primary_color")
    .eq("id", tenantId)
    .single();

  if (error || !data) return null;

  cache.set(tenantId, { data: data as TenantInfo, expiresAt: now + CACHE_TTL_MS });
  return data as TenantInfo;
}

/** サブドメインからtenantIdを解決する（middlewareで使用）*/
export async function resolveTenantBySubdomain(subdomain: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("tenants")
    .select("id")
    .eq("subdomain", subdomain)
    .eq("is_active", true)
    .single();

  return data?.id ?? null;
}
