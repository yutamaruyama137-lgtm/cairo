/**
 * lib/orchestrator.ts
 *
 * マルチエージェントオーケストレーター。
 * Phase 3 本実装 — Claude Tool Use で動く。
 *
 * フロー:
 * 1. ユーザーのゴールとキャラクター設定でClaudeを呼び出す（Tool Use有効）
 * 2. Claude がツールを呼んだら executeTool() で実行し、結果をClaudeに返す
 * 3. テキスト応答が出るまでループ
 * 4. ストリーミングで結果を返す
 */

import Anthropic from "@anthropic-ai/sdk";
import { ALL_TOOLS, executeTool } from "@/lib/tools";
import { supabaseAdmin } from "@/lib/supabase";
import { getTenantAgentConfigs } from "@/lib/db/admin";
import { getAgent } from "@/lib/agents/index";
import { buildLayeredSystemPrompt } from "@/lib/prompts";

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export interface AgenticInput {
  goal: string;
  characterId: string;
  tenantId: string;
  userId?: string;
  skillId?: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}

/**
 * ストリーミング対応のAgentic実行。
 * ReadableStreamを返すのでそのままResponseに渡せる。
 */
export function orchestrateStream(input: AgenticInput): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const enqueue = (text: string) => controller.enqueue(encoder.encode(text));

      try {
        if (!client) {
          enqueue("（デモモード）APIキーが設定されていません。");
          controller.close();
          return;
        }

        // テナントのエージェント設定を取得
        const agentConfigs = await getTenantAgentConfigs(input.tenantId);
        const agentConfig = agentConfigs.find((c) => c.agent_id === input.characterId);

        // 3層プロンプト構造でシステムプロンプトを組み立て
        const systemPrompt = buildLayeredSystemPrompt({
          characterId: input.characterId,
          menuId: input.skillId,
          tenantSuffix: agentConfig?.custom_system_prompt ?? null,
          outputFormat: agentConfig?.output_format ?? "markdown",
        });

        // 会話履歴 + 今回のゴール
        const messages: Anthropic.MessageParam[] = [
          ...(input.conversationHistory ?? []).map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          { role: "user", content: input.goal },
        ];

        // Tool Useループ
        let loopMessages = [...messages];
        let stepCount = 0;
        const MAX_STEPS = 5;
        const toolCallsMade: string[] = [];
        let finalOutputText = "";

        while (stepCount < MAX_STEPS) {
          stepCount++;

          // ストリーミングでClaudeを呼び出す
          const claudeStream = client.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 8192,
            system: systemPrompt,
            tools: ALL_TOOLS as Anthropic.Tool[],
            messages: loopMessages,
          });

          let fullText = "";

          // テキストデルタをリアルタイムでストリーミング
          for await (const event of claudeStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              enqueue(event.delta.text);
              fullText += event.delta.text;
            }
          }

          // ストリーム完了後にfinalMessageを取得してツール呼び出しを確認
          const finalMessage = await claudeStream.finalMessage();

          const toolUseBlocks = finalMessage.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
          );

          if (toolUseBlocks.length > 0) {
            // ツール使用をユーザーに通知
            for (const toolBlock of toolUseBlocks) {
              if (toolBlock.name === "delegate_to_agent") {
                const delegateInput = toolBlock.input as Record<string, string>;
                const agentId = delegateInput.agent_id ?? "";
                const agentSpec = getAgent(agentId);
                const agentLabel = agentSpec
                  ? `${agentSpec.nameJa}（${agentSpec.department}）`
                  : agentId;
                enqueue(`\n🤝 **${agentLabel}** に依頼中...\n`);
              } else {
                enqueue(`\n🔧 **${toolBlock.name}** を実行中...\n`);
              }
              toolCallsMade.push(toolBlock.name);
            }

            // ツールを実行して結果を収集
            const toolResults: Anthropic.ToolResultBlockParam[] = [];
            for (const toolBlock of toolUseBlocks) {
              const result = await executeTool(
                toolBlock.name,
                toolBlock.input as Record<string, string>,
                input.tenantId,
                input.userId
              );

              // 委託完了の通知
              if (toolBlock.name === "delegate_to_agent") {
                const delegateInput = toolBlock.input as Record<string, string>;
                const agentId = delegateInput.agent_id ?? "";
                const agentSpec = getAgent(agentId);
                const agentLabel = agentSpec
                  ? `${agentSpec.nameJa}（${agentSpec.department}）`
                  : agentId;
                enqueue(`\n✅ **${agentLabel}** から回答を受信\n`);
              }

              toolResults.push({
                type: "tool_result",
                tool_use_id: toolBlock.id,
                content: result,
              });
            }

            // 会話に追加してループ継続
            loopMessages = [
              ...loopMessages,
              { role: "assistant", content: finalMessage.content },
              { role: "user", content: toolResults },
            ];
            continue;
          }

          // テキスト応答を記録（既にストリーミング済み）
          finalOutputText = fullText;

          // DBに保存（fire and forget）
          if (input.userId) {
            supabaseAdmin.from("menu_executions").insert({
              tenant_id: input.tenantId,
              user_id: input.userId,
              menu_id: input.skillId ?? `${input.characterId}-agentic`,
              character_id: input.characterId,
              inputs: { goal: input.goal },
              output: finalOutputText,
              status: "completed",
            }).then(({ error }) => {
              if (error) console.error("[orchestrator] DB save error:", error);
            });
          }

          break;
        }

        // MAX_STEPS を使い切ってもテキスト応答がなかった場合
        if (stepCount >= MAX_STEPS && !finalOutputText) {
          enqueue("\n（最大ステップ数に達しました。処理を終了します。）");
        }
      } catch (err) {
        enqueue(`\nエラーが発生しました: ${err instanceof Error ? err.message : "Unknown error"}`);
      } finally {
        controller.close();
      }
    },
  });
}
