/**
 * lib/workflows/types.ts
 *
 * ワークフロー（会社固有の業務フロー）の型定義。
 * Phase 3のワークフローエンジン実装時に使用する。
 *
 * 現在の状態: 型定義のみ。エンジン（engine.ts）はPhase 3で実装。
 */

// ========================================
// ワークフロー定義
// ========================================

/** ワークフローの1ステップ */
export interface WorkflowStep {
  step: number;           // ステップ番号
  id?: string;            // ステップID（nextIfで参照するための名前）
  agent: string;          // 担当AI社員ID: "jin" | "ai" | "rin" | "vi" | "iori" | "saki"
  action: string;         // 実行するアクション名（自由記述、プロンプトに反映される）
  parallel?: boolean;     // true の場合、前ステップと並列実行

  /** 条件分岐。条件式をキー、次ステップIDを値に持つ */
  nextIf?: Record<string, string>; // 例: { "amount >= 50000": "manager_approval", "default": "journal" }

  /** 次のステップID（条件なしの場合） */
  next?: string;

  /** 出力形式の指定 */
  outputFormat?: "markdown" | "json" | "excel" | "pdf";
}

/** ワークフロー全体の定義 */
export interface WorkflowDefinition {
  tenantId: string;          // どの会社のフローか
  workflowId: string;        // ユニークID
  name: string;              // 表示名「経費精算フロー」
  description?: string;      // 説明
  triggerKeywords: string[]; // このフローを起動するキーワード「経費」「精算」など
  steps: WorkflowStep[];
  isActive: boolean;
}

// ========================================
// ワークフロー実行状態
// ========================================

export type WorkflowStatus = "pending" | "running" | "completed" | "failed";

/** 実行中のワークフローインスタンス */
export interface WorkflowInstance {
  instanceId: string;            // 実行ごとのユニークID
  workflowId: string;
  tenantId: string;
  userId: string;
  status: WorkflowStatus;
  currentStep: number;
  context: Record<string, unknown>; // ステップ間で受け渡すデータ
  stepOutputs: Record<string, string>; // 各ステップの出力（stepId → output）
  startedAt: string;             // ISO 8601
  completedAt?: string;
}

// ========================================
// Phase 2以降のSupabaseスキーマ対応型
// ========================================

/**
 * Supabase workflows テーブルの行型
 * Phase 2実装時に supabase gen types typescript で自動生成される型と合わせる
 */
export interface WorkflowRecord {
  workflow_id: string;
  tenant_id: string;
  name: string;
  trigger_keywords: string[];
  steps: WorkflowStep[]; // jsonb
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
