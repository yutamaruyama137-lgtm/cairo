export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, DEFAULT_TENANT_ID } from "@/lib/auth";
import { getUserByEmail } from "@/lib/db/users";
import { checkRateLimit } from "@/lib/rate-limit";
import { orchestrateStream } from "@/lib/orchestrator";

export async function POST(req: NextRequest) {
  try {
    const { goal, characterId, conversationHistory } = await req.json();

    if (!goal || !characterId) {
      return NextResponse.json({ error: "goal と characterId は必須です" }, { status: 400 });
    }

    // セッションからテナントIDを取得（フォールバック: DEFAULT_TENANT_ID）
    const session = await getServerSession(authOptions);
    const tenantId = session?.user?.tenantId ?? DEFAULT_TENANT_ID;

    // 月間実行回数チェック
    const rateLimit = await checkRateLimit(tenantId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "rate_limit_exceeded",
          message: `今月の実行回数上限（${rateLimit.limit}回）に達しました。`,
          used: rateLimit.used,
          limit: rateLimit.limit,
        },
        { status: 429 }
      );
    }

    // ユーザーID取得
    let userId: string | undefined;
    if (session?.user?.email) {
      const dbUser = await getUserByEmail(session.user.email, tenantId);
      userId = dbUser?.id;
    }

    // Agenticストリーム実行
    const stream = orchestrateStream({
      goal,
      characterId,
      tenantId,
      userId,
      conversationHistory,
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("[agent/run] error:", err);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
