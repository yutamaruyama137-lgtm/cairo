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
  try {
    if (!nango) {
      return NextResponse.json(
        { error: "Nango が設定されていません。NANGO_SECRET_KEY 環境変数を設定してください。" },
        { status: 503 }
      );
    }

    const session = await getServerSession(authOptions);
    const tenantId = session?.user?.tenantId ?? DEFAULT_TENANT_ID;
    const userId = session?.user?.id ?? "anonymous";

    const { integration } = await req.json();
    if (!integration) {
      return NextResponse.json({ error: "integration は必須です" }, { status: 400 });
    }

    const connectionId = `${tenantId}-${userId}`;

    // Nango セッショントークンを発行
    const token = await nango.createConnectSession({
      end_user: {
        id: connectionId,
        display_name: session?.user?.name ?? userId,
        email: session?.user?.email ?? undefined,
      },
      allowed_integrations: [integration],
    });

    return NextResponse.json({ token: token.data.token, connectionId });
  } catch (err) {
    console.error("[nango/connect] POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    if (!nango) {
      return NextResponse.json({ connections: [] });
    }

    const session = await getServerSession(authOptions);
    const tenantId = session?.user?.tenantId ?? DEFAULT_TENANT_ID;
    const userId = session?.user?.id ?? "anonymous";
    const connectionId = `${tenantId}-${userId}`;

    // Nango から連携一覧を取得
    const connectionsResponse = await nango.listConnections();
    const allConnections = connectionsResponse.connections ?? [];

    // このテナント・ユーザーの連携のみフィルタリング
    const myConnections = allConnections.filter(
      (c: { connection_id: string; provider_config_key?: string }) =>
        c.connection_id === connectionId
    );

    const integrationIds = myConnections.map(
      (c: { connection_id: string; provider_config_key?: string }) => c.provider_config_key ?? ""
    );

    return NextResponse.json({ connections: integrationIds, connectionId });
  } catch (err) {
    console.error("[nango/connect] GET error:", err);
    return NextResponse.json({ connections: [] });
  }
}
