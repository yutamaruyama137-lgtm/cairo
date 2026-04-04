import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, DEFAULT_TENANT_ID } from "@/lib/auth";
import { streamText } from "@/lib/claude";
import { getMenu } from "@/data/menus";
import { getCharacter } from "@/data/characters";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserByEmail } from "@/lib/db/users";
import { ExecuteRequest } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body: ExecuteRequest = await req.json();
    const { menuId, inputs } = body;

    // メニューとキャラクターを取得
    const menu = getMenu(menuId);
    if (!menu) {
      return Response.json({ error: "メニューが見つかりません" }, { status: 404 });
    }
    const character = getCharacter(menu.characterId);
    if (!character) {
      return Response.json({ error: "キャラクターが見つかりません" }, { status: 404 });
    }

    // セッションからユーザーIDを取得
    const session = await getServerSession(authOptions);
    console.log("[execute] session email:", session?.user?.email ?? "none");
    let userId: string | null = null;
    if (session?.user?.email) {
      const dbUser = await getUserByEmail(session.user.email, DEFAULT_TENANT_ID);
      console.log("[execute] dbUser:", dbUser);
      userId = dbUser?.id ?? null;
    }

    // プロンプトテンプレートに入力値を埋め込む
    let userPrompt = menu.promptTemplate;
    for (const [key, value] of Object.entries(inputs)) {
      userPrompt = userPrompt.replaceAll(`{{${key}}}`, value || "（未入力）");
    }

    // システムプロンプト（キャラクター設定）
    const systemPrompt = `あなたはAI社員「${character.name}」です。${character.department}の担当です。
役割：${character.role}

【行動指針】
- 入力された情報をもとに、すぐに使える品質の成果物を出力する
- 曖昧な表現を避け、具体的に記述する
- 日本のビジネス慣習を理解した内容にする
- マークダウン形式で、見やすく整理して出力する
- 「〜かもしれません」より「〜です」と断言する

${character.greeting}`;

    const startedAt = Date.now();
    const outputChunks: string[] = [];

    // ストリーミングレスポンスを返す（出力を収集しながら）
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamText({ systemPrompt, userPrompt })) {
            outputChunks.push(chunk);
            controller.enqueue(new TextEncoder().encode(chunk));
          }
          controller.close();

          // ストリーム完了後にDBへ保存
          console.log("[execute] saving to DB, userId:", userId, "menuId:", menuId);
          const { error: dbError } = await supabaseAdmin
            .from("menu_executions")
            .insert({
              tenant_id: DEFAULT_TENANT_ID,
              user_id: userId,
              menu_id: menuId,
              character_id: menu.characterId,
              inputs,
              output: outputChunks.join(""),
              duration_ms: Date.now() - startedAt,
              status: "completed",
            });
          if (dbError) {
            console.error("[execute] DB save error:", dbError);
          } else {
            console.log("[execute] DB save success");
          }
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Execute API error:", error);
    return Response.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
