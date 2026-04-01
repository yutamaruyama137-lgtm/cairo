/**
 * lib/agents/base.ts
 *
 * AI社員エージェントのベース型定義。
 * Phase 3（Tool Use / マルチエージェント）実装時に使用する。
 *
 * 現在の状態: 型定義のみ。実装はPhase 3で行う。
 * 現在のデータは data/characters.ts に入っている。
 */

// ========================================
// テナント設定型（Supabase移行後に使う）
// ========================================
export interface TenantConfig {
  tenantId: string;
  name: string;
  subdomain: string;
  // Phase 2でSupabaseから取得する
  customSystemPromptSuffix?: string; // 会社固有の追加指示
  knowledgeBaseId?: string;          // RAG用ナレッジベースID
  features: string[];                // 有効な機能フラグ
}

// ========================================
// ツール定義型（Claude Tool Use用）
// ========================================
export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
}

// ========================================
// エージェント定義型
// ========================================
export interface AgentDefinition {
  id: string;         // "jin", "ai", "rin", "vi", "iori", "saki"
  name: string;       // 表示名「ジン」
  department: string; // 「営業部」
  role: string;       // 「営業のプロ」
  emoji: string;      // 「💼」

  /**
   * システムプロンプトを生成する。
   * テナント設定があれば会社固有の指示を追加する。
   * Phase 2以降: tenantConfigはSupabaseから取得される。
   */
  getSystemPrompt: (tenantConfig?: TenantConfig) => string;

  /**
   * このエージェントが使えるツール一覧。
   * Phase 3で実装する。現在は空配列。
   */
  tools: ToolDefinition[];
}

// ========================================
// エージェント実行コンテキスト
// ========================================
export interface AgentContext {
  taskId: string;           // タスクID（ログ・追跡用）
  tenantConfig: TenantConfig;
  conversationHistory: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  previousStepOutput?: string; // マルチエージェント時の前ステップ出力
}

// ========================================
// エージェント実行結果
// ========================================
export interface AgentResult {
  agentId: string;
  output: string;
  toolCallsMade: string[]; // 使用したツール名
  tokensUsed?: number;
}
