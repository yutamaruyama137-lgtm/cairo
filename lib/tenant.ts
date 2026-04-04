/**
 * lib/tenant.ts
 *
 * セッションから tenantId を取得するヘルパー。
 * APIルートで DEFAULT_TENANT_ID を直接使う代わりにこれを使う。
 */

import { Session } from "next-auth";
import { DEFAULT_TENANT_ID } from "@/lib/auth";

/**
 * セッションのtenantIdを返す。
 * 未設定（オンボーディング前）の場合はDEFAULT_TENANT_IDにフォールバック。
 */
export function getSessionTenantId(session: Session | null): string {
  return session?.user?.tenantId ?? DEFAULT_TENANT_ID;
}

/** 管理者かどうかを確認する */
export function isAdmin(session: Session | null): boolean {
  return session?.user?.role === "admin";
}
