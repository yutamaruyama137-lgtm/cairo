/**
 * lib/db/admin.ts
 *
 * 管理画面用のDB操作。
 * テナントのAI社員設定（tenant_agents）の読み書き。
 */

import { supabaseAdmin } from "@/lib/supabase";

export interface TenantAgentConfig {
  id: string;
  tenant_id: string;
  agent_id: string;
  is_enabled: boolean;
  custom_name: string | null;
  custom_system_prompt: string | null;
  output_format: string;
  flow_config: Record<string, unknown>;
}

/** テナントの全エージェント設定を取得 */
export async function getTenantAgentConfigs(tenantId: string): Promise<TenantAgentConfig[]> {
  const { data, error } = await supabaseAdmin
    .from("tenant_agents")
    .select("id, tenant_id, agent_id, is_enabled, custom_name, custom_system_prompt, output_format, flow_config")
    .eq("tenant_id", tenantId)
    .order("agent_id");

  if (error || !data) return [];
  return data as TenantAgentConfig[];
}

/** エージェント設定を更新 */
export async function updateTenantAgentConfig(
  tenantId: string,
  agentId: string,
  updates: Partial<Pick<TenantAgentConfig, "is_enabled" | "custom_name" | "custom_system_prompt" | "output_format" | "flow_config">>
): Promise<void> {
  await supabaseAdmin
    .from("tenant_agents")
    .update(updates)
    .eq("tenant_id", tenantId)
    .eq("agent_id", agentId);
}

/** テナント情報を取得 */
export async function getTenantDetail(tenantId: string) {
  const { data } = await supabaseAdmin
    .from("tenants")
    .select("id, name, subdomain, plan, monthly_execution_limit, primary_color, is_active")
    .eq("id", tenantId)
    .single();
  return data;
}
