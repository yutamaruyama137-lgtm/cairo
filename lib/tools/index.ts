/**
 * lib/tools/index.ts
 *
 * Claude Tool Use で使うツール一覧と実行関数。
 * Phase 1: search_knowledge / get_company_info / save_output / web_search / get_current_date
 * Phase 2: delegate_to_agent
 * Phase 3: Nango 外部連携ツール (send_gmail / post_to_slack / save_to_google_drive / create_calendar_event)
 */

import Anthropic from "@anthropic-ai/sdk";
import type { ToolDefinition } from "@/lib/agents/base";
import { supabaseAdmin } from "@/lib/supabase";
import { generateEmbedding } from "@/lib/embeddings";
import { searchKnowledgeVector, searchKnowledgeText } from "@/lib/db/knowledge";
import { getAgent } from "@/lib/agents/index";
import {
  NANGO_TOOLS,
  executeSendGmail,
  executePostToSlack,
  executeSaveToGoogleDrive,
  executeCreateCalendarEvent,
} from "@/lib/tools/nango-actions";

// ========================================
// Phase 1: ツール定義
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

export const webSearchTool: ToolDefinition = {
  name: "web_search",
  description:
    "Web検索で最新の情報を取得する。" +
    "市場動向・競合情報・法改正・補助金情報など、インターネットの最新情報が必要な場合に使う。",
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "検索クエリ（日本語可）" },
    },
    required: ["query"],
  },
};

export const getCurrentDateTool: ToolDefinition = {
  name: "get_current_date",
  description:
    "現在の日時を取得する。" +
    "日付や曜日の確認、期限計算、今月・今年の判断が必要な場合に使う。",
  input_schema: {
    type: "object",
    properties: {},
    required: [],
  },
};

// ========================================
// Phase 2: delegate_to_agent ツール定義
// ========================================

export const delegateToAgentTool: ToolDefinition = {
  name: "delegate_to_agent",
  description:
    "別のAI社員（サブエージェント）に作業を依頼する。" +
    "自分の専門外の作業や並行処理が必要な場合に使う。",
  input_schema: {
    type: "object",
    properties: {
      agent_id: {
        type: "string",
        description: "依頼先のAI社員ID: jin（営業） / ai（経理） / rin（法務） / vi（IT） / iori（広報） / saki（総務）",
      },
      task: { type: "string", description: "依頼する具体的な作業内容" },
      context: { type: "string", description: "作業に必要な背景情報・入力データ" },
    },
    required: ["agent_id", "task"],
  },
};

// ========================================
// 全ツールのエクスポート
// ========================================

const BASE_TOOLS: ToolDefinition[] = [
  searchKnowledgeTool,
  getCompanyInfoTool,
  saveOutputTool,
  webSearchTool,
  getCurrentDateTool,
  delegateToAgentTool,
];

// Nango ツールは NANGO_SECRET_KEY が設定されている場合のみ追加
const nangoToolsEnabled = !!process.env.NANGO_SECRET_KEY;

export const ALL_TOOLS: ToolDefinition[] = nangoToolsEnabled
  ? [...BASE_TOOLS, ...NANGO_TOOLS]
  : BASE_TOOLS;

// delegate_to_agent の無限再帰を防ぐ用のツールリスト（delegate_to_agent を除外）
export const TOOLS_WITHOUT_DELEGATION: ToolDefinition[] = ALL_TOOLS.filter(
  (t) => t.name !== "delegate_to_agent"
);

// ========================================
// ツール実行関数
// ========================================

export async function executeTool(
  toolName: string,
  toolInput: Record<string, string>,
  tenantId: string,
  userId?: string
): Promise<string> {
  switch (toolName) {
    case "search_knowledge":
      return await executeSearchKnowledge(toolInput.query, toolInput.category ?? "all", tenantId);

    case "get_company_info":
      return await executeGetCompanyInfo(toolInput.info_type, tenantId);

    case "save_output":
      return `成果物「${toolInput.output_type}」を保存しました。内容: ${toolInput.content.slice(0, 100)}...`;

    case "web_search":
      return await executeWebSearch(toolInput.query);

    case "get_current_date":
      return executeGetCurrentDate();

    case "delegate_to_agent":
      return await executeDelegateToAgent(
        toolInput.agent_id,
        toolInput.task,
        toolInput.context ?? "",
        tenantId
      );

    // Phase 3: Nango ツール
    case "send_gmail":
      return await executeSendGmail(toolInput, tenantId, userId);

    case "post_to_slack":
      return await executePostToSlack(toolInput, tenantId, userId);

    case "save_to_google_drive":
      return await executeSaveToGoogleDrive(toolInput, tenantId, userId);

    case "create_calendar_event":
      return await executeCreateCalendarEvent(toolInput, tenantId, userId);

    default:
      throw new Error(`未知のツール: ${toolName}`);
  }
}

// ========================================
// 各ツール実装
// ========================================

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
  let knowledgeResults: Array<{ source_name: string; content: string }> = [];

  const embedding = await generateEmbedding(query);
  if (embedding) {
    knowledgeResults = await searchKnowledgeVector(tenantId, embedding, 5);
  }

  if (knowledgeResults.length === 0) {
    knowledgeResults = await searchKnowledgeText(tenantId, query, 5);
  }

  if (knowledgeResults.length > 0) {
    return knowledgeResults
      .map((r) => `【${r.source_name}】\n${r.content}`)
      .join("\n\n---\n\n");
  }

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

async function executeWebSearch(query: string): Promise<string> {
  const braveApiKey = process.env.BRAVE_API_KEY;

  // Brave Search API を使う（API キーがある場合）
  if (braveApiKey) {
    try {
      const encodedQuery = encodeURIComponent(query);
      const res = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodedQuery}&count=5&lang=ja`,
        {
          headers: {
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
            "X-Subscription-Token": braveApiKey,
          },
        }
      );

      if (!res.ok) {
        throw new Error(`Brave Search API エラー: ${res.status}`);
      }

      const data = await res.json() as {
        web?: {
          results?: Array<{ title: string; url: string; description?: string }>;
        };
      };

      const results = data?.web?.results ?? [];
      if (results.length === 0) {
        return `「${query}」の検索結果が見つかりませんでした。`;
      }

      return results
        .slice(0, 5)
        .map((r, i) => `${i + 1}. **${r.title}**\n${r.url}\n${r.description ?? ""}`)
        .join("\n\n");
    } catch (err) {
      console.warn("[web_search] Brave Search API エラー:", err);
      // フォールバックへ
    }
  }

  // DuckDuckGo Instant Answer API（フォールバック）
  try {
    const encodedQuery = encodeURIComponent(query);
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`,
      { headers: { "Accept": "application/json" } }
    );

    if (!res.ok) {
      throw new Error(`DuckDuckGo API エラー: ${res.status}`);
    }

    const data = await res.json() as {
      AbstractText?: string;
      AbstractURL?: string;
      RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>;
    };

    const parts: string[] = [];

    if (data.AbstractText) {
      parts.push(`**概要:**\n${data.AbstractText}`);
      if (data.AbstractURL) {
        parts.push(`出典: ${data.AbstractURL}`);
      }
    }

    const related = data.RelatedTopics?.slice(0, 3) ?? [];
    if (related.length > 0) {
      parts.push(
        "**関連情報:**\n" +
          related
            .filter((r) => r.Text)
            .map((r) => `- ${r.Text}${r.FirstURL ? ` (${r.FirstURL})` : ""}`)
            .join("\n")
      );
    }

    if (parts.length === 0) {
      return `「${query}」について、Web検索で直接的な情報は取得できませんでした。より具体的なキーワードで再検索するか、ナレッジベースをご確認ください。`;
    }

    return parts.join("\n\n");
  } catch (err) {
    return `Web検索でエラーが発生しました: ${err instanceof Error ? err.message : "不明なエラー"}`;
  }
}

function executeGetCurrentDate(): string {
  const now = new Date();

  // JST (UTC+9)
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);

  const year = jst.getUTCFullYear();
  const month = jst.getUTCMonth() + 1;
  const day = jst.getUTCDate();
  const hours = jst.getUTCHours();
  const minutes = jst.getUTCMinutes();

  const dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][jst.getUTCDay()];

  return JSON.stringify({
    日付: `${year}年${month}月${day}日（${dayOfWeek}曜日）`,
    時刻: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} JST`,
    ISO: jst.toISOString().replace("Z", "+09:00"),
    年: year,
    月: month,
    日: day,
    曜日: `${dayOfWeek}曜日`,
  }, null, 2);
}

// ========================================
// Phase 2: delegate_to_agent 実装
// ========================================

// 無限再帰防止の最大委託深度
const MAX_DELEGATION_DEPTH = 2;

// 現在の委託深度を追跡（セッション内）
let currentDelegationDepth = 0;

const anthropicClient = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export async function executeDelegateToAgent(
  agentId: string,
  task: string,
  context: string,
  tenantId: string
): Promise<string> {
  if (!anthropicClient) {
    return "（デモモード）APIキーが設定されていないため、エージェント委託を実行できません。";
  }

  if (currentDelegationDepth >= MAX_DELEGATION_DEPTH) {
    return `委託の最大深度（${MAX_DELEGATION_DEPTH}）に達しました。これ以上のサブエージェント委託はできません。`;
  }

  const agent = getAgent(agentId);
  if (!agent) {
    return `エージェント「${agentId}」が見つかりません。有効なID: jin / ai / rin / vi / iori / saki`;
  }

  currentDelegationDepth++;

  try {
    const userMessage = context
      ? `【依頼内容】\n${task}\n\n【背景情報・入力データ】\n${context}`
      : `【依頼内容】\n${task}`;

    // サブエージェントのツールリスト（delegate_to_agent を除外して無限再帰を防ぐ）
    const subAgentTools = TOOLS_WITHOUT_DELEGATION as Anthropic.Tool[];

    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: userMessage },
    ];

    // サブエージェントの Tool Use ループ（最大3ステップ）
    let loopMessages = [...messages];
    let stepCount = 0;
    const MAX_STEPS = 3;

    while (stepCount < MAX_STEPS) {
      stepCount++;

      const response = await anthropicClient.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: agent.systemPrompt,
        tools: subAgentTools,
        messages: loopMessages,
      });

      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      if (toolUseBlocks.length > 0) {
        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const toolBlock of toolUseBlocks) {
          const result = await executeTool(
            toolBlock.name,
            toolBlock.input as Record<string, string>,
            tenantId
          );
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolBlock.id,
            content: result,
          });
        }

        loopMessages = [
          ...loopMessages,
          { role: "assistant", content: response.content },
          { role: "user", content: toolResults },
        ];
        continue;
      }

      const textBlock = response.content.find(
        (b): b is Anthropic.TextBlock => b.type === "text"
      );

      if (textBlock) {
        return `【${agent.nameJa}（${agent.department}）からの回答】\n\n${textBlock.text}`;
      }

      break;
    }

    return `${agent.nameJa}（${agent.department}）からの応答を取得できませんでした。`;
  } catch (err) {
    return `${agent.nameJa}への委託中にエラーが発生しました: ${err instanceof Error ? err.message : "不明なエラー"}`;
  } finally {
    currentDelegationDepth--;
  }
}
