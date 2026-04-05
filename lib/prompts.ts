/**
 * lib/prompts.ts
 *
 * 3層プロンプト構造のユーティリティ。
 *
 * Layer 1: キャラクタープロンプト（/prompts/characters/{id}.md）
 *   → AIキャラクターの専門知識・判断基準・NG例・口調
 *
 * Layer 2: スキルプロンプト（/prompts/skills/{skillKey}.md）
 *   → タスク固有の出力形式・品質基準・チェックリスト
 *
 * Layer 3: テナント固有カスタム（Supabase: system_prompt_suffix）
 *   → 会社名・業種・固有の言い回し等（既存のSupabase管理を継続）
 */

import fs from "fs";
import path from "path";

const PROMPTS_DIR = path.join(process.cwd(), "prompts");

/**
 * メニューIDからスキルキーを抽出する
 * 例: "jin-proposal" → "proposal"
 * 例: "ai-cashflow" → "cashflow"
 * 例: "rin-lawcheck" → "lawcheck"
 */
export function extractSkillKey(menuId: string): string {
  const parts = menuId.split("-");
  // 先頭のキャラクターIDを除いた残りをスキルキーとする
  return parts.slice(1).join("-");
}

/**
 * Layer 1: キャラクタープロンプトを取得する
 * ファイルが存在しない場合は空文字を返す
 */
export function getCharacterPrompt(characterId: string): string {
  const filePath = path.join(PROMPTS_DIR, "characters", `${characterId}.md`);
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    console.warn(`[prompts] Character prompt not found: ${characterId}`);
    return "";
  }
}

/**
 * Layer 2: スキルプロンプトを取得する
 * menuId からスキルキーを抽出してファイルを読み込む
 * ファイルが存在しない場合は空文字を返す
 */
export function getSkillPrompt(menuId: string): string {
  const skillKey = extractSkillKey(menuId);
  const filePath = path.join(PROMPTS_DIR, "skills", `${skillKey}.md`);
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    console.warn(`[prompts] Skill prompt not found: ${skillKey} (menuId: ${menuId})`);
    return "";
  }
}

/**
 * 3層プロンプトを結合してシステムプロンプトを構築する
 *
 * @param characterId - キャラクターID（例: "jin"）
 * @param menuId - メニューID（例: "jin-proposal"）
 * @param tenantSuffix - Supabaseから取得したテナント固有の追加指示（Layer 3）
 * @param outputFormat - 出力フォーマット指定（Supabase管理）
 */
export function buildLayeredSystemPrompt({
  characterId,
  menuId,
  tenantSuffix,
  outputFormat = "markdown",
}: {
  characterId: string;
  menuId?: string;
  tenantSuffix?: string | null;
  outputFormat?: string;
}): string {
  const layers: string[] = [];

  // Layer 1: キャラクタープロンプト
  const characterPrompt = getCharacterPrompt(characterId);
  if (characterPrompt) {
    layers.push(characterPrompt);
  } else {
    // フォールバック: キャラクタープロンプトが存在しない場合の最低限の定義
    layers.push(`あなたはAI社員です。ユーザーの業務を丁寧・正確にサポートしてください。`);
  }

  // Layer 2: スキルプロンプト（menuIdがある場合）
  if (menuId) {
    const skillPrompt = getSkillPrompt(menuId);
    if (skillPrompt) {
      layers.push(`---\n\n## 今回のタスク\n\n${skillPrompt}`);
    }
  }

  // 出力フォーマット指示
  const formatInstructions: Record<string, string> = {
    markdown: "出力はMarkdown形式で見やすく整形してください。",
    bullet: "出力は箇条書き（- または ・）で整理してください。",
    table: "出力はできるかぎり表形式（Markdownテーブル）で整理してください。",
    plain: "出力はプレーンテキストで、装飾なしで記述してください。",
  };
  const formatInstruction = formatInstructions[outputFormat] ?? formatInstructions.markdown;
  layers.push(`## 出力形式\n\n${formatInstruction}`);

  // Layer 3: テナント固有カスタム（Supabaseから取得）
  if (tenantSuffix) {
    layers.push(`---\n\n## この会社固有の追加指示\n\n${tenantSuffix}`);
  }

  return layers.join("\n\n");
}
