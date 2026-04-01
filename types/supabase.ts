/**
 * types/supabase.ts
 *
 * Phase 2（Supabase導入）時に使うDB型定義。
 * 現在はまだ使用していない。構造を先に定義しておく。
 *
 * Phase 2実装時:
 * npx supabase gen types typescript --project-id <project_id> > types/supabase.ts
 * で自動生成した型と統合する。
 */

// ========================================
// テナント（会社）
// ========================================

export interface Tenant {
  tenant_id: string;             // uuid
  name: string;                  // "渋谷共栄会"
  subdomain: string;             // "shibuya"
  logo_url: string | null;
  primary_color: string;         // "#E8232A"
  features: string[];            // ["chat", "menus", "html_preview"]
  plan: "starter" | "standard" | "enterprise";
  monthly_execution_limit: number | null;
  created_at: string;
}

// ========================================
// テナント内のユーザー
// ========================================

export interface TenantUser {
  user_id: string;               // uuid (Supabase Auth と連携)
  tenant_id: string;
  email: string;
  role: "admin" | "member";
  created_at: string;
}

// ========================================
// AI社員設定（会社ごとにカスタマイズ）
// ========================================

export interface TenantAgent {
  id: string;                    // uuid
  tenant_id: string;
  agent_key: string;             // "jin" | "ai" | "rin" | "vi" | "iori" | "saki"
  name_override: string | null;  // カスタム名 "田中さん（営業）"
  system_prompt_suffix: string;  // 会社固有の追加指示
  tools_enabled: string[];       // 使えるツール一覧
  is_enabled: boolean;
}

// ========================================
// メニュー定義（既存 data/menus.ts の移行先）
// ========================================

export interface Menu {
  menu_id: string;               // "jin-proposal" など
  tenant_id: string | null;      // null = 全テナント共通
  character_id: string;          // "jin"
  title: string;
  description: string;
  icon: string;
  estimated_seconds: number;
  inputs: MenuInputField[];      // jsonb
  prompt_template: string;
  output_label: string;
  is_active: boolean;
}

export interface MenuInputField {
  key: string;
  label: string;
  type: "text" | "textarea" | "select";
  placeholder: string;
  required: boolean;
  options?: string[];
  helpText?: string;
}

// ========================================
// ワークフロー定義
// ========================================

export interface WorkflowRecord {
  workflow_id: string;           // uuid
  tenant_id: string;
  name: string;
  trigger_keywords: string[];
  steps: unknown;                // jsonb (lib/workflows/types.ts の WorkflowStep[])
  is_active: boolean;
  created_at: string;
}

// ========================================
// タスク実行記録
// ========================================

export type TaskStatus = "pending" | "running" | "completed" | "failed";

export interface Task {
  task_id: string;               // uuid
  tenant_id: string;
  user_id: string;
  workflow_id: string | null;    // null = 単発実行
  menu_id: string | null;        // 単発実行時のメニューID
  status: TaskStatus;
  current_step: number;
  context: unknown;              // jsonb: ステップ間のデータ
  final_output: string | null;
  tokens_used: number;
  started_at: string;
  completed_at: string | null;
}

// ========================================
// タスクのステップログ
// ========================================

export interface TaskLog {
  log_id: string;                // uuid
  task_id: string;
  step_index: number;
  agent_key: string;
  action: string;
  input_context: unknown;        // jsonb
  output: string;
  tool_calls_made: string[];     // 使ったツール名
  tokens_used: number;
  duration_ms: number;
  created_at: string;
}

// ========================================
// API使用量ログ
// ========================================

export interface ApiUsageLog {
  log_id: string;                // uuid
  tenant_id: string;
  user_id: string;
  model: string;                 // "claude-sonnet-4-6"
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  created_at: string;
}

// ========================================
// ナレッジベース（RAG用）
// ========================================

export interface KnowledgeChunk {
  id: string;                    // uuid
  tenant_id: string;
  filename: string;
  chunk_index: number;
  chunk_text: string;
  embedding: number[];           // vector(1536) - pgvector
  metadata: unknown;             // jsonb
  created_at: string;
}
