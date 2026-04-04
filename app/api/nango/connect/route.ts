/**
 * app/api/nango/connect/route.ts
 *
 * POST: Nango セッショントークンを発行する（Connect UI 起動用）
 * GET:  このテナントの有効な連携一覧を返す
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, DEFAULT_TENANT_ID } from "@/lib/auth";
import { nango } from "@/lib/nango";

export async function POST(req: NextRequest) {
  if (!nango) {
    return NextResponse.json(
      { error: "Nango が設定されていません。NANGO_SECRET_KEY 環境変数を設定してください。" },
      { status: 503 }
    );
  }

  try {
    const session = await getServerSession(authOptions);
    const tenantId = session?.user?.tenantId ?? DEFAULT_TENANT_ID;
    const userId = session?.user?.id ?? "anonymous";

    const body = await req.json() as { integration?: string };
    const { integration } = body;
    if (!integration) {
      return NextResponse.json({ error: "integration は必須です" }, { status: 400 });
    }

    const connectionId = `${tenantId}-${userId}`;

    // allowed_integrations を指定すると Nango 側に未設定の場合 400 になるため外す
    // Nango Connect UI 側でプロバイダーを選択させる
    const sessionParams: Parameters<typeof nango.createConnectSession>[0] = {
      end_user: {
        id: connectionId,
        display_name: session?.user?.name ?? userId,
        email: session?.user?.email ?? undefined,
      },
    };

    const token = await nango.createConnectSession(sessionParams);

    const tokenValue = typeof token === "string" ? token : (token as { data?: { token?: string }; token?: string })?.data?.token ?? (token as { token?: string })?.token;

    if (!tokenValue) {
      console.error("[nango/connect] unexpected token shape:", JSON.stringify(token));
      return NextResponse.json({ error: "セッショントークンの取得に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ token: tokenValue, connectionId });
  } catch (err) {
    console.error("[nango/connect] POST error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  if (!nango) {
    return NextResponse.json({ connections: [] });
  }

  try {
    const session = await getServerSession(authOptions);
    const tenantId = session?.user?.tenantId ?? DEFAULT_TENANT_ID;
    const userId = session?.user?.id ?? "anonymous";
    const connectionId = `${tenantId}-${userId}`;

    const connectionsResponse = await nango.listConnections();
    const allConnections = (connectionsResponse as { connections?: Array<{ connection_id: string; provider_config_key?: string }> }).connections ?? [];

    const myConnections = allConnections.filter(
      (c) => c.connection_id === connectionId
    );

    const integrationIds = myConnections.map((c) => c.provider_config_key ?? "");

    return NextResponse.json({ connections: integrationIds, connectionId });
  } catch (err) {
    console.error("[nango/connect] GET error:", err);
    return NextResponse.json({ connections: [] });
  }
}
