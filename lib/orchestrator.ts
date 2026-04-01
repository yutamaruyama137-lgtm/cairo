/**
 * lib/orchestrator.ts
 *
 * マルチエージェントオーケストレーター。
 * ゴールを受け取り、最適なAI社員を選んでタスクを実行する「指揮者」。
 *
 * 現在の状態: スタブ（骨格のみ）。Phase 3で本実装する。
 *
 * Phase 3実装時にやること:
 * 1. Director Claude を Tool Use モードで呼び出す
 * 2. Directorがツールを使って会社情報・ワークフロー定義を取得
 * 3. 適切なエージェントを選択・呼び出す
 * 4. 結果を統合してユーザーに返す
 * 5. タスク状態を Supabase に保存
 */

import type { TenantConfig } from "@/lib/agents/base";

// ========================================
// 型定義
// ========================================

export interface OrchestratorInput {
  goal: string;                   // ユーザーのゴール「提案書を作りたい」
  tenantConfig: TenantConfig;     // テナント設定
  userId: string;                 // ユーザーID
  conversationHistory?: Array<{   // 会話履歴（マルチターン対応）
    role: "user" | "assistant";
    content: string;
  }>;
}

export interface OrchestratorResult {
  taskId: string;
  finalOutput: string;            // 最終的なアウトプット
  agentsInvolved: string[];       // 使用したエージェントのID一覧
  stepCount: number;              // 実行したステップ数
}

// ========================================
// オーケストレーター（Phase 3で本実装）
// ========================================

/**
 * メインのオーケストレーション関数。
 * ゴールを受け取り、複数AI社員を連携させて実行する。
 *
 * TODO Phase 3:
 * - Director Agent (Claude) を Tool Use モードで起動
 * - Director がワークフロー定義を取得し、各エージェントに指示
 * - 並列実行可能なステップは Promise.all で並列処理
 * - 各ステップの結果を context として引き継ぐ
 * - Supabase の tasks テーブルに進捗を随時保存
 */
export async function orchestrate(
  input: OrchestratorInput
): Promise<OrchestratorResult> {
  // TODO: Phase 3で実装
  throw new Error(
    "orchestrate() は Phase 3で実装予定です。" +
    "現在は app/api/execute/route.ts の1ショット実行を使用してください。"
  );
}

/**
 * ワークフロー定義に基づいてステップを順番に実行する。
 * lib/workflows/engine.ts に移動する可能性あり。
 *
 * TODO Phase 3で実装
 */
// async function executeWorkflowSteps(...) {}

/**
 * 複数エージェントを並列実行する。
 *
 * TODO Phase 3で実装
 */
// async function executeAgentsInParallel(...) {}
