import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getServerSession } from "next-auth";
import { authOptions, DEFAULT_TENANT_ID } from "@/lib/auth";
import { getUserByEmail } from "@/lib/db/users";
import { supabaseAdmin } from "@/lib/supabase";
import { getCharacter } from "@/data/characters";
import { getMenu } from "@/data/menus";

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

    const skill = skillId ? getMenu(skillId) : undefined;
    const systemPrompt = buildSystemPrompt(character, skill);

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

type CharacterType = ReturnType<typeof getCharacter>;
type SkillType = ReturnType<typeof getMenu>;

function buildSystemPrompt(character: CharacterType, skill?: SkillType): string {
  if (!character) return "";

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
- 必要に応じてMarkdown形式で見やすく構造化してください
- 長い出力が必要な場合は、ステップを分けてわかりやすく説明してください`;

  if (skill) {
    prompt += `\n\n【現在のタスクモード: ${skill.title}】\n${skill.description}\nこのモードでは特に「${skill.title}」に特化した高品質な出力を心がけてください。`;
  }

  return prompt;
}
