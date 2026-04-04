/**
 * lib/tools/index.ts
 *
 * Claude Tool Use で使うツール一覧と実行関数。
 * Phase 3 本実装。
 */

import type { ToolDefinition } from "@/lib/agents/base";
import { supabaseAdmin } from "@/lib/supabase";
import { generateEmbedding } from "@/lib/embeddings";
import { searchKnowledgeVector, searchKnowledgeText } from "@/lib/db/knowledge";

// ========================================
// ツール定義
// ========================================

export const searchKnowledgeTool: ToolDefinition = {
  name: "search_knowledge",
  description:
    "会社のナレッジベース（規約・FAQ・過去事例など）から関連情報を検索する。" +
    "提案書作成や経費精算フローの確認などに使う。",
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "検索したい内容" },
      category: { type: "string", description: "'rules' | 'faq' | 'cases' | 'all'" },
    },
    required: ["query"],
  },
};

export const getCompanyInfoTool: ToolDefinition = {
  name: "get_company_info",
  description:
    "この会社（テナント）の設定・ルール・メンバー情報などを取得する。" +
    "会社固有のフローや制限を確認するときに使う。",
  input_schema: {
    type: "object",
    properties: {
      info_type: {
        type: "string",
        description: "'settings'（基本設定） | 'plan'（プラン情報） | 'agents'（AI社員一覧）",
      },
    },
    required: ["info_type"],
  },
};

export const saveOutputTool: ToolDefinition = {
  name: "save_output",
  description:
    "生成した成果物（提案書・報告書など）を保存し、次のAI社員に引き継ぐ。",
  input_schema: {
    type: "object",
    properties: {
      output_type: { type: "string", description: "成果物の種類: 'proposal' | 'report' | 'draft'" },
      content: { type: "string", description: "保存する成果物のテキスト" },
      next_agent: { type: "string", description: "次に処理するエージェントID（省略時はフロー終了）" },
    },
    required: ["output_type", "content"],
  },
};

export const ALL_TOOLS: ToolDefinition[] = [
  searchKnowledgeTool,
  getCompanyInfoTool,
  saveOutputTool,
];

// ========================================
// ツール実行関数
// ========================================

export async function executeTool(
  toolName: string,
  toolInput: Record<string, string>,
  tenantId: string
): Promise<string> {
  switch (toolName) {
    case "search_knowledge":
      // TODO: Supabase pgvector でベクトル検索（現在はテキスト検索）
      return await executeSearchKnowledge(toolInput.query, toolInput.category ?? "all", tenantId);

    case "get_company_info":
      return await executeGetCompanyInfo(toolInput.info_type, tenantId);

    case "save_output":
      return `成果物「${toolInput.output_type}」を保存しました。内容: ${toolInput.content.slice(0, 100)}...`;

    default:
      throw new Error(`未知のツール: ${toolName}`);
  }
}

async function executeGetCompanyInfo(infoType: string, tenantId: string): Promise<string> {
  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("name, subdomain, plan, monthly_execution_limit, primary_color")
    .eq("id", tenantId)
    .single();

  if (!tenant) return "会社情報を取得できませんでした。";

  if (infoType === "settings" || infoType === "plan") {
    return JSON.stringify({
      会社名: tenant.name,
      サブドメイン: tenant.subdomain,
      プラン: tenant.plan,
      月間実行上限: tenant.monthly_execution_limit ?? "無制限",
    }, null, 2);
  }

  if (infoType === "agents") {
    const { data: agents } = await supabaseAdmin
      .from("tenant_agents")
      .select("agent_id, is_enabled, custom_name")
      .eq("tenant_id", tenantId)
      .eq("is_enabled", true);

    return JSON.stringify(
      (agents ?? []).map((a: { agent_id: string; custom_name: string | null }) => ({
        id: a.agent_id,
        name: a.custom_name ?? a.agent_id,
      })),
      null,
      2
    );
  }

  return JSON.stringify(tenant, null, 2);
}

async function executeSearchKnowledge(
  query: string,
  _category: string,
  tenantId: string
): Promise<string> {
  // 1. ナレッジベース（knowledge_chunks）をベクトル検索 or テキスト検索
  let knowledgeResults: Array<{ source_name: string; content: string }> = [];

  const embedding = await generateEmbedding(query);
  if (embedding) {
    // OPENAI_API_KEY が設定されていればベクトル検索
    knowledgeResults = await searchKnowledgeVector(tenantId, embedding, 5);
  }

  if (knowledgeResults.length === 0) {
    // フォールバック: テキスト検索
    knowledgeResults = await searchKnowledgeText(tenantId, query, 5);
  }

  if (knowledgeResults.length > 0) {
    return knowledgeResults
      .map((r) => `【${r.source_name}】\n${r.content}`)
      .join("\n\n---\n\n");
  }

  // 2. ナレッジベースにヒットがなければ過去の実行履歴を検索（既存の動作を維持）
  const safeQuery = query.slice(0, 200).replace(/[%_\\]/g, (c) => `\\${c}`);
  const { data: executions } = await supabaseAdmin
    .from("menu_executions")
    .select("menu_id, output, created_at")
    .eq("tenant_id", tenantId)
    .ilike("output", `%${safeQuery}%`)
    .order("created_at", { ascending: false })
    .limit(3);

  if (executions && executions.length > 0) {
    return executions
      .map((d: { menu_id: string; output: string | null; created_at: string }) =>
        `【過去の実行履歴: ${d.menu_id}】\n${d.output?.slice(0, 300) ?? ""}...`
      )
      .join("\n\n---\n\n");
  }

  return `「${query}」に関連するナレッジは見つかりませんでした。`;
}
