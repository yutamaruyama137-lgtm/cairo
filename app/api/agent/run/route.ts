/**
 * app/api/agent/run/route.ts
 *
 * Phase 3: Agenticループ実行エンドポイント。
 * 現在はスタブ（501 Not Implemented を返す）。
 *
 * Phase 3実装時にやること:
 * 1. リクエストからゴールとテナントIDを受け取る
 * 2. lib/orchestrator.ts の orchestrate() を呼び出す
 * 3. 進捗をSSEでリアルタイムにストリーミング返却する
 * 4. 各エージェントがTool Useを使い、ツールを実行する
 * 5. 最終結果をDBに保存する
 *
 * リクエスト形式（Phase 3実装後）:
 * POST /api/agent/run
 * {
 *   "goal": "ソコイク商店の提案書を作りたい",
 *   "tenantId": "shibuya",
 *   "conversationHistory": []
 * }
 *
 * レスポンス形式（SSEストリーミング）:
 * data: {"type": "agent_start", "agentId": "iori", "step": 1}
 * data: {"type": "text_chunk", "text": "調査中..."}
 * data: {"type": "agent_complete", "agentId": "iori", "step": 1}
 * data: {"type": "agent_start", "agentId": "jin", "step": 2}
 * ...
 * data: {"type": "done", "taskId": "xxx"}
 */

import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  // Phase 3実装まではスタブとして501を返す
  return Response.json(
    {
      error: "このエンドポイントはPhase 3（Agentic実装）で有効になります。",
      hint: "現在は POST /api/execute を使用してください。",
      phase: 3,
      status: "not_implemented",
    },
    { status: 501 }
  );
}

/**
 * TODO Phase 3: 実際の実装
 *
 * export async function POST(req: NextRequest) {
 *   const { goal, tenantId, conversationHistory } = await req.json();
 *
 *   // テナント設定を取得
 *   const tenantConfig = await getTenantConfig(tenantId);
 *
 *   // SSEストリームを作成
 *   const stream = new ReadableStream({
 *     async start(controller) {
 *       const send = (data: object) => {
 *         controller.enqueue(
 *           new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)
 *         );
 *       };
 *
 *       try {
 *         // オーケストレーターを起動
 *         const result = await orchestrate({
 *           goal,
 *           tenantConfig,
 *           userId: "anonymous",
 *           conversationHistory,
 *           onProgress: (event) => send(event),  // 進捗をSSEで送信
 *         });
 *
 *         send({ type: "done", taskId: result.taskId });
 *         controller.close();
 *       } catch (error) {
 *         send({ type: "error", message: String(error) });
 *         controller.error(error);
 *       }
 *     },
 *   });
 *
 *   return new Response(stream, {
 *     headers: {
 *       "Content-Type": "text/event-stream",
 *       "Cache-Control": "no-cache",
 *       "Connection": "keep-alive",
 *     },
 *   });
 * }
 */
