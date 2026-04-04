import { supabaseAdmin } from "@/lib/supabase";

export interface DbUser {
  id: string;
  tenant_id: string;
  email: string;
  name: string | null;
  role: "admin" | "member";
}

/**
 * メールアドレスとテナントIDからユーザーを取得する
 */
export async function getUserByEmail(
  email: string,
  tenantId: string
): Promise<DbUser | null> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, tenant_id, email, name, role")
    .eq("email", email)
    .eq("tenant_id", tenantId)
    .single();

  if (error || !data) return null;
  return data as DbUser;
}
