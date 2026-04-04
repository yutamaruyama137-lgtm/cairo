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
import { characters } from "@/data/characters";

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const FORMAT_INSTRUCTIONS: Record<string, string> = {
  markdown: "Markdownで見やすく整形して出力してください。",
  bullet:   "箇条書き（- または ・）で整理して出力してください。",
  table:    "できるかぎり表形式（Markdownテーブル）で出力してください。",
  plain:    "プレーンテキストで、装飾なしで出力してください。",
};

export interface AgenticInput {
  goal: string;
  characterId: string;
  tenantId: string;
  userId?: string;
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
        const character = characters.find((c) => c.id === input.characterId) ?? characters[0];

        // 出力フォーマット指示
        const formatInstruction = FORMAT_INSTRUCTIONS[agentConfig?.output_format ?? "markdown"];

        // システムプロンプト組み立て
        const systemPrompt = buildSystemPrompt(character, agentConfig?.custom_system_prompt ?? null, formatInstruction);

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

        while (stepCount < MAX_STEPS) {
          stepCount++;

          const response = await client.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 4096,
            system: systemPrompt,
            tools: ALL_TOOLS as Anthropic.Tool[],
            messages: loopMessages,
          });

          // ツール呼び出しがある場合
          const toolUseBlocks = response.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
          );

          if (toolUseBlocks.length > 0) {
            // ツール使用をユーザーに通知
            for (const toolBlock of toolUseBlocks) {
              enqueue(`\n🔧 **${toolBlock.name}** を実行中...\n`);
              toolCallsMade.push(toolBlock.name);
            }

            // ツールを実行して結果を収集
            const toolResults: Anthropic.ToolResultBlockParam[] = [];
            for (const toolBlock of toolUseBlocks) {
              const result = await executeTool(
                toolBlock.name,
                toolBlock.input as Record<string, string>,
                input.tenantId
              );
              toolResults.push({
                type: "tool_result",
                tool_use_id: toolBlock.id,
                content: result,
              });
            }

            // 会話に追加してループ継続
            loopMessages = [
              ...loopMessages,
              { role: "assistant", content: response.content },
              { role: "user", content: toolResults },
            ];
            continue;
          }

          // テキスト応答を取得してストリーム
          const textBlock = response.content.find(
            (b): b is Anthropic.TextBlock => b.type === "text"
          );
          if (textBlock) {
            enqueue(textBlock.text);
          }

          // DBに保存（fire and forget）
          if (input.userId) {
            supabaseAdmin.from("menu_executions").insert({
              tenant_id: input.tenantId,
              user_id: input.userId,
              menu_id: `${input.characterId}-agentic`,
              character_id: input.characterId,
              inputs: { goal: input.goal },
              output: textBlock?.text ?? "",
              status: "completed",
            }).then(({ error }) => {
              if (error) console.error("[orchestrator] DB save error:", error);
            });
          }

          break;
        }
      } catch (err) {
        enqueue(`\nエラーが発生しました: ${err instanceof Error ? err.message : "Unknown error"}`);
      } finally {
        controller.close();
      }
    },
  });
}

function buildSystemPrompt(
  character: { name: string; department: string; role: string; description: string; greeting: string },
  customPrompt: string | null,
  formatInstruction: string
): string {
  let prompt = `あなたは「${character.name}」です。${character.department}の${character.role}として、ユーザーの仕事をサポートするAI社員です。

【プロフィール】
- 名前: ${character.name}
- 所属: ${character.department}
- 役割: ${character.role}
- 専門: ${character.description}

【行動指針】
- 常に日本語で応答してください
- フレンドリーで親切な口調を保ちつつ、専門的な回答をしてください
- 回答は具体的で実用的にしてください
- ${formatInstruction}
- 必要に応じてツール（get_company_info, search_knowledge）を使って会社の情報を確認してから回答してください
- ツールを使う場合は結果を解釈して、そのまま返すのではなく文章に組み込んでください`;

  if (customPrompt) {
    prompt += `\n\n【この会社固有の指示】\n${customPrompt}`;
  }

  return prompt;
}
