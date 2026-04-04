export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getServerSession } from "next-auth";
import { authOptions, DEFAULT_TENANT_ID } from "@/lib/auth";
import { getUserByEmail } from "@/lib/db/users";
import { buildLayeredSystemPrompt } from "@/lib/prompts";
import { supabaseAdmin } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rate-limit";
import { getTenantAgentConfigs } from "@/lib/db/admin";
import { getCharacter } from "@/data/characters";

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      characterId,
      messages,
      skillId,
    }: {
      characterId: string;
      messages: { role: "user" | "assistant"; content: string }[];
      skillId?: string;
    } = body;

    const character = getCharacter(characterId);
    if (!character) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    // テナントのエージェント設定（カスタムプロンプト・出力フォーマット）を取得
    const agentConfigs = await getTenantAgentConfigs(DEFAULT_TENANT_ID);
    const agentConfig = agentConfigs.find((c) => c.agent_id === characterId);

    // 3層構造でシステムプロンプトを構築
    // Layer 1: キャラクタープロンプト（/prompts/characters/）
    // Layer 2: スキルプロンプト（/prompts/skills/）← skillId があるときのみ
    // Layer 3: テナント固有カスタム（Supabase custom_system_prompt）
    const systemPrompt = buildLayeredSystemPrompt({
      characterId,
      menuId: skillId,
      tenantSuffix: agentConfig?.custom_system_prompt ?? null,
      outputFormat: agentConfig?.output_format ?? "markdown",
    });

    // 月間実行回数チェック
    const rateLimit = await checkRateLimit(DEFAULT_TENANT_ID);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "rate_limit_exceeded",
          message: `今月の実行回数上限（${rateLimit.limit}回）に達しました。プランのアップグレードをご検討ください。`,
          used: rateLimit.used,
          limit: rateLimit.limit,
          plan: rateLimit.plan,
        },
        { status: 429 }
      );
    }

    // セッションからユーザーIDを取得
    const session = await getServerSession(authOptions);
    let userId: string | null = null;
    if (session?.user?.email) {
      const dbUser = await getUserByEmail(session.user.email, DEFAULT_TENANT_ID);
      userId = dbUser?.id ?? null;
    }

    const startedAt = Date.now();
    const outputChunks: string[] = [];
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          if (client) {
            const claudeStream = await client.messages.stream({
              model: "claude-sonnet-4-6",
              max_tokens: 4096,
              system: systemPrompt,
              messages: messages,
            });

            for await (const chunk of claudeStream) {
              if (
                chunk.type === "content_block_delta" &&
                chunk.delta.type === "text_delta"
              ) {
                outputChunks.push(chunk.delta.text);
                controller.enqueue(encoder.encode(chunk.delta.text));
              }
            }
          } else {
            const mock = `${character.name}です！（デモモード）\n\nAPIキーを設定すると実際のAI応答が返ります。\n\`.env.local\` に \`ANTHROPIC_API_KEY\` を設定してください。`;
            outputChunks.push(mock);
            controller.enqueue(encoder.encode(mock));
          }
        } catch (err) {
          const errMsg = `エラーが発生しました: ${err instanceof Error ? err.message : "Unknown error"}`;
          controller.enqueue(encoder.encode(errMsg));
        } finally {
          controller.close();

          // DB保存
          const { error: dbError } = await supabaseAdmin
            .from("menu_executions")
            .insert({
              tenant_id: DEFAULT_TENANT_ID,
              user_id: userId,
              menu_id: skillId ?? `${characterId}-chat`,
              character_id: characterId,
              inputs: { message: lastUserMessage },
              output: outputChunks.join(""),
              duration_ms: Date.now() - startedAt,
              status: "completed",
            });
          if (dbError) console.error("[chat] DB save error:", dbError);
          else console.log("[chat] DB save success, userId:", userId);
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
  }
}

// buildSystemPrompt は buildLayeredSystemPrompt（lib/prompts.ts）に移行しました。
// 3層構造: キャラクタープロンプト + スキルプロンプト + テナント固有カスタム
