/**
 * lib/db/menus.ts
 *
 * tenant_menus テーブルのDBアクセス層。
 * テナントごとのカスタムメニューを管理する。
 */

import { supabaseAdmin } from "@/lib/supabase";
import type { MenuItem, MenuInput, MenuCategory } from "@/types";

// ========================================
// 型定義
// ========================================

/** DBから取得した生データ */
export interface TenantMenuRow {
  id: string;
  tenant_id: string;
  menu_id: string;
  character_id: string;
  title: string;
  description: string;
  icon: string;
  estimated_seconds: number;
  human_minutes: number;
  category: string;
  inputs: MenuInput[];
  prompt_template: string;
  knowledge_sources: string[];
  output_label: string;
  is_enabled: boolean;
  sort_order: number;
  system_prompt_override: string | null;
  created_at: string;
  updated_at: string;
}

/** メニュー作成・更新用の入力型 */
export interface TenantMenuInput {
  menu_id: string;
  character_id: string;
  title: string;
  description: string;
  icon: string;
  estimated_seconds: number;
  human_minutes: number;
  category: MenuCategory;
  inputs: MenuInput[];
  prompt_template: string;
  knowledge_sources: string[];
  output_label: string;
  is_enabled?: boolean;
  sort_order?: number;
  system_prompt_override?: string | null;
}

// ========================================
// 変換ユーティリティ
// ========================================

/** DBの行を MenuItem 型に変換（execute API などで使いやすくするため） */
export function rowToMenuItem(row: TenantMenuRow): MenuItem & { knowledgeSources: string[] } {
  return {
    id: row.menu_id,
    characterId: row.character_id,
    title: row.title,
    description: row.description,
    icon: row.icon,
    estimatedSeconds: row.estimated_seconds,
    humanMinutes: row.human_minutes,
    category: row.category as MenuCategory,
    inputs: row.inputs,
    promptTemplate: row.prompt_template,
    outputLabel: row.output_label,
    knowledgeSources: row.knowledge_sources ?? [],
  };
}

// ========================================
// 読み取り
// ========================================

/** テナントの全メニューを取得（sort_order 順） */
export async function listTenantMenus(tenantId: string): Promise<TenantMenuRow[]> {
  const { data, error } = await supabaseAdmin
    .from("tenant_menus")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/** キャラクターIDでフィルタしてメニューを取得 */
export async function getTenantMenusByCharacter(
  tenantId: string,
  characterId: string
): Promise<TenantMenuRow[]> {
  const { data, error } = await supabaseAdmin
    .from("tenant_menus")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("character_id", characterId)
    .eq("is_enabled", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/** menu_id で単一メニューを取得 */
export async function getTenantMenu(
  tenantId: string,
  menuId: string
): Promise<TenantMenuRow | null> {
  const { data, error } = await supabaseAdmin
    .from("tenant_menus")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("menu_id", menuId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// ========================================
// 書き込み
// ========================================

/** メニューを作成または更新（menu_id が重複したら上書き） */
export async function upsertTenantMenu(
  tenantId: string,
  input: TenantMenuInput
): Promise<TenantMenuRow> {
  const { data, error } = await supabaseAdmin
    .from("tenant_menus")
    .upsert(
      {
        tenant_id: tenantId,
        menu_id: input.menu_id,
        character_id: input.character_id,
        title: input.title,
        description: input.description,
        icon: input.icon,
        estimated_seconds: input.estimated_seconds,
        human_minutes: input.human_minutes,
        category: input.category,
        inputs: input.inputs,
        prompt_template: input.prompt_template,
        knowledge_sources: input.knowledge_sources,
        output_label: input.output_label,
        is_enabled: input.is_enabled ?? true,
        sort_order: input.sort_order ?? 0,
        system_prompt_override: input.system_prompt_override ?? null,
      },
      { onConflict: "tenant_id,menu_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** UUID（PK）でメニューを更新 */
export async function updateTenantMenu(
  tenantId: string,
  id: string,
  input: Partial<TenantMenuInput>
): Promise<TenantMenuRow> {
  const updateData: Record<string, unknown> = {};
  if (input.character_id !== undefined)    updateData.character_id    = input.character_id;
  if (input.title !== undefined)           updateData.title           = input.title;
  if (input.description !== undefined)     updateData.description     = input.description;
  if (input.icon !== undefined)            updateData.icon            = input.icon;
  if (input.estimated_seconds !== undefined) updateData.estimated_seconds = input.estimated_seconds;
  if (input.human_minutes !== undefined)   updateData.human_minutes   = input.human_minutes;
  if (input.category !== undefined)        updateData.category        = input.category;
  if (input.inputs !== undefined)          updateData.inputs          = input.inputs;
  if (input.prompt_template !== undefined) updateData.prompt_template = input.prompt_template;
  if (input.knowledge_sources !== undefined) updateData.knowledge_sources = input.knowledge_sources;
  if (input.output_label !== undefined)    updateData.output_label    = input.output_label;
  if (input.is_enabled !== undefined)      updateData.is_enabled      = input.is_enabled;
  if (input.sort_order !== undefined)      updateData.sort_order      = input.sort_order;
  if (input.system_prompt_override !== undefined) updateData.system_prompt_override = input.system_prompt_override;

  const { data, error } = await supabaseAdmin
    .from("tenant_menus")
    .update(updateData)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** UUID（PK）でメニューを削除 */
export async function deleteTenantMenu(tenantId: string, id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("tenant_menus")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) throw error;
}
