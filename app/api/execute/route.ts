export const maxDuration = 60;

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, DEFAULT_TENANT_ID } from "@/lib/auth";
import { streamText } from "@/lib/claude";
import { getMenu } from "@/data/menus";
import { getCharacter } from "@/data/characters";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserByEmail } from "@/lib/db/users";
import { checkRateLimit } from "@/lib/rate-limit";
import { getTenantMenu, rowToMenuItem } from "@/lib/db/menus";
import { buildLayeredSystemPrompt } from "@/lib/prompts";
import { searchKnowledgeVector, searchKnowledgeText } from "@/lib/db/knowledge";
import { generateEmbedding } from "@/lib/embeddings";
import { ExecuteRequest } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body: ExecuteRequest = await req.json();
    const { menuId, inputs } = body;

    // セッション・テナントIDを取得
    const session = await getServerSession(authOptions);
    const tenantId = session?.user?.tenantId ?? DEFAULT_TENANT_ID;

    // ① DB のテナントメニューを優先して取得、なければ静的メニューにフォールバック
    let menu;
    let knowledgeSources: string[] = [];

    const dbMenuRow = await getTenantMenu(tenantId, menuId).catch(() => null);
    if (dbMenuRow) {
      const converted = rowToMenuItem(dbMenuRow);
      menu = converted;
      knowledgeSources = converted.knowledgeSources;
    } else {
      // 静的メニューにフォールバック
      const staticMenu = getMenu(menuId);
      if (!staticMenu) {
        return Response.json({ error: "メニューが見つかりません" }, { status: 404 });
      }
      menu = staticMenu;
    }

    const character = getCharacter(menu.characterId);
    if (!character) {
      return Response.json({ error: "キャラクターが見つかりません" }, { status: 404 });
    }

    // 月間実行回数チェック
    const rateLimit = await checkRateLimit(tenantId);
    if (!rateLimit.allowed) {
      return Response.json(
        {
          error: "rate_limit_exceeded",
          message: `今月の実行回数上限（${rateLimit.limit}回）に達しました。プランのアップグレードをご検討ください。`,
          used: rateLimit.used,
          limit: rateLimit.limit,
        },
        { status: 429 }
      );
    }

    // ユーザーIDを取得
    let userId: string | null = null;
    if (session?.user?.email) {
      const dbUser = await getUserByEmail(session.user.email, tenantId);
      userId = dbUser?.id ?? null;
    }

    // プロンプトテンプレートに入力値を埋め込む
    let userPrompt = menu.promptTemplate;
    for (const [key, value] of Object.entries(inputs)) {
      userPrompt = userPrompt.replaceAll(`{{${key}}}`, value || "（未入力）");
    }

    // ② 参照ナレッジを自動取得して userPrompt に注入
    if (knowledgeSources.length > 0) {
      try {
        // 指定されたソースのチャンクをソース名で取得
        const { data: chunks } = await supabaseAdmin
          .from("knowledge_chunks")
          .select("content, source_name")
          .eq("tenant_id", tenantId)
          .in("source_name", knowledgeSources)
          .order("created_at", { ascending: true })
          .limit(20);

        if (chunks && chunks.length > 0) {
          const knowledgeText = chunks
            .map((c: { source_name: string; content: string }) => `【${c.source_name}】\n${c.content}`)
            .join("\n\n---\n\n");
          userPrompt = `【参考情報】\n${knowledgeText}\n\n---\n\n${userPrompt}`;
        }
      } catch (e) {
        console.warn("[execute] knowledge fetch error:", e);
      }
    }

    // Layer 3: テナント固有のカスタム指示をSupabaseから取得
    const { data: agentConfig } = await supabaseAdmin
      .from("tenant_agents")
      .select("system_prompt_suffix")
      .eq("tenant_id", tenantId)
      .eq("agent_id", menu.characterId)
      .single();
    const tenantSuffix = agentConfig?.system_prompt_suffix ?? null;

    // システムプロンプト構築:
    // - DBにオーバーライドがある場合はそれを使用（テナント完全カスタム）
    // - それ以外は3層構造（キャラクター + スキル + テナント固有）で構築
    const systemPrompt = dbMenuRow?.system_prompt_override
      ? dbMenuRow.system_prompt_override + (tenantSuffix ? `\n\n---\n\n## この会社固有の追加指示\n\n${tenantSuffix}` : "")
      : buildLayeredSystemPrompt({
          characterId: menu.characterId,
          menuId,
          tenantSuffix,
          outputFormat: "markdown",
        });

    const startedAt = Date.now();
    const outputChunks: string[] = [];

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamText({ systemPrompt, userPrompt })) {
            outputChunks.push(chunk);
            controller.enqueue(new TextEncoder().encode(chunk));
          }
          controller.close();

          // 完了後にDBへ保存
          const { error: dbError } = await supabaseAdmin
            .from("menu_executions")
            .insert({
              tenant_id: tenantId,
              user_id: userId,
              menu_id: menuId,
              character_id: menu.characterId,
              inputs,
              output: outputChunks.join(""),
              duration_ms: Date.now() - startedAt,
              status: "completed",
            });
          if (dbError) console.error("[execute] DB save error:", dbError);
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
