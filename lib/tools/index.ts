/**
 * lib/tools/index.ts
 *
 * Claude Tool Use で使うツール一覧。
 * Phase 3実装時にここに追加していく。
 *
 * 現在の状態: スタブ（空）。Phase 3で実装する。
 */

import type { ToolDefinition } from "@/lib/agents/base";

// ========================================
// ツール定義スタブ（Phase 3で実装）
// ========================================

/**
 * ナレッジ検索ツール
 * Supabase pgvector でRAG検索を行う
 * Phase 3実装時: knowledge.ts に本実装を書く
 */
export const searchKnowledgeTool: ToolDefinition = {
  name: "search_knowledge",
  description:
    "会社のナレッジベース（規約・FAQ・過去事例など）から関連情報を検索する。" +
    "提案書作成や経費精算フローの確認などに使う。",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "検索したい内容。具体的なキーワードや質問文で指定する",
      },
      category: {
        type: "string",
        description:
          "検索カテゴリ: 'rules'（規約）, 'faq'（FAQ）, 'cases'（事例）, 'all'（全て）",
      },
    },
    required: ["query"],
  },
};

/**
 * 会社情報取得ツール
 * テナント設定・会社固有ルールを取得する
 * Phase 3実装時: company.ts に本実装を書く
 */
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
        description:
          "取得する情報の種類: 'rules'（社内ルール）, 'members'（メンバー）, 'settings'（基本設定）",
      },
    },
    required: ["info_type"],
  },
};

/**
 * 結果保存ツール
 * 生成した成果物をDBに保存し、次のエージェントに受け渡す
 * Phase 3実装時: output.ts に本実装を書く
 */
export const saveOutputTool: ToolDefinition = {
  name: "save_output",
  description:
    "生成した成果物（提案書・報告書など）を保存し、次のAI社員に引き継ぐ。" +
    "マルチエージェントフローでステップ間のデータを受け渡すときに使う。",
  input_schema: {
    type: "object",
    properties: {
      output_type: {
        type: "string",
        description: "成果物の種類: 'proposal'（提案書）, 'report'（報告書）, 'draft'（下書き）など",
      },
      content: {
        type: "string",
        description: "保存する成果物のテキスト内容",
      },
      next_agent: {
        type: "string",
        description: "次に処理するエージェントID（省略時はフロー終了）",
      },
    },
    required: ["output_type", "content"],
  },
};

// ========================================
// 全ツールをまとめてエクスポート
// ========================================

/** Phase 3で実際に Claude API に渡すツール一覧 */
export const ALL_TOOLS: ToolDefinition[] = [
  searchKnowledgeTool,
  getCompanyInfoTool,
  saveOutputTool,
];

// ========================================
// ツール実行関数（Phase 3で本実装）
// ========================================

/**
 * ツール名からツール実行関数を呼び出す
 * app/api/agent/run/route.ts から呼ばれる
 *
 * @param toolName - Claude が選択したツール名
 * @param toolInput - ツールへの入力
 * @param tenantId  - テナントID
 * @returns ツールの実行結果テキスト
 */
export async function executeTool(
  toolName: string,
  toolInput: Record<string, string>,
  tenantId: string
): Promise<string> {
  switch (toolName) {
    case "search_knowledge":
      // TODO Phase 3: Supabase pgvector でベクトル検索
      return `[search_knowledge スタブ] クエリ: ${toolInput.query} / テナント: ${tenantId}`;

    case "get_company_info":
      // TODO Phase 3: Supabase から会社設定を取得
      return `[get_company_info スタブ] 種類: ${toolInput.info_type} / テナント: ${tenantId}`;

    case "save_output":
      // TODO Phase 3: Supabase tasks テーブルに保存
      return `[save_output スタブ] 種類: ${toolInput.output_type} を保存しました`;

    default:
      throw new Error(`未知のツール: ${toolName}`);
  }
}
