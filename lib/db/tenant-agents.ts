import { supabaseAdmin } from "@/lib/supabase";
import { characters } from "@/data/characters";
import type { AICharacter } from "@/types";

/**
 * テナントで有効なAI社員一覧を取得する。
 * tenant_agents テーブルの is_enabled=true のエージェントだけ返す。
 * custom_name が設定されていれば名前を上書きする。
 */
export async function getTenantAgents(tenantId: string): Promise<AICharacter[]> {
  const { data, error } = await supabaseAdmin
    .from("tenant_agents")
    .select("agent_id, is_enabled, custom_name")
    .eq("tenant_id", tenantId)
    .eq("is_enabled", true);

  // DBエラー時は全エージェントをフォールバックで返す
  if (error || !data) return characters;

  const enabledIds = new Set(data.map((row: { agent_id: string }) => row.agent_id));
  const nameOverrides = Object.fromEntries(
    data.map((row: { agent_id: string; custom_name: string | null }) => [row.agent_id, row.custom_name])
  );

  return characters
    .filter((c) => enabledIds.has(c.id))
    .map((c) => ({
      ...c,
      name: nameOverrides[c.id] ?? c.name,
    }));
}
