/**
 * lib/db/members.ts
 *
 * テナントメンバー管理DBアクセス。
 */

import { supabaseAdmin } from "@/lib/supabase";

export interface TenantMember {
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "member";
  last_login_at: string | null;
  created_at: string;
}

export interface TenantInvite {
  id: string;
  email: string;
  role: "admin" | "member";
  created_at: string;
}

/** テナントの参加済みメンバー一覧 */
export async function getTenantMembers(tenantId: string): Promise<TenantMember[]> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, email, name, role, last_login_at, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data as TenantMember[];
}

/** 未承認の招待一覧 */
export async function getPendingInvites(tenantId: string): Promise<TenantInvite[]> {
  const { data, error } = await supabaseAdmin
    .from("tenant_invites")
    .select("id, email, role, created_at")
    .eq("tenant_id", tenantId)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as TenantInvite[];
}

/** メンバーを招待する（メールアドレスを登録） */
export async function inviteMember(
  tenantId: string,
  email: string,
  role: "admin" | "member",
  invitedById: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("tenant_invites")
    .upsert(
      { tenant_id: tenantId, email, role, invited_by: invitedById, accepted_at: null },
      { onConflict: "tenant_id,email" }
    );
  if (error) throw new Error(`招待エラー: ${error.message}`);
}

/** 招待を取り消す */
export async function cancelInvite(tenantId: string, inviteId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("tenant_invites")
    .delete()
    .eq("id", inviteId)
    .eq("tenant_id", tenantId);
  if (error) throw new Error(`招待取消エラー: ${error.message}`);
}

/** メンバーをテナントから削除する */
export async function removeMember(tenantId: string, userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("users")
    .update({ tenant_id: null, role: "member" })
    .eq("id", userId)
    .eq("tenant_id", tenantId);
  if (error) throw new Error(`メンバー削除エラー: ${error.message}`);
}

/** メンバーのロールを変更する */
export async function updateMemberRole(
  tenantId: string,
  userId: string,
  role: "admin" | "member"
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("users")
    .update({ role })
    .eq("id", userId)
    .eq("tenant_id", tenantId);
  if (error) throw new Error(`ロール変更エラー: ${error.message}`);
}
