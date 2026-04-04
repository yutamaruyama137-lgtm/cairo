/**
 * app/api/nango/webhook/route.ts
 *
 * POST: Nango からの Webhook を受信する。
 * - connection_created: 連携成立
 * - token_refresh_success / token_refresh_failed: トークン更新
 *
 * Nango ダッシュボードで Webhook URL を設定: https://your-domain/api/nango/webhook
 */

import { NextRequest, NextResponse } from "next/server";

interface NangoWebhookPayload {
  type: string;
  connectionId?: string;
  providerConfigKey?: string;
  provider?: string;
  environment?: string;
  success?: boolean;
  error?: string;
}

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as NangoWebhookPayload;

    console.log("[nango/webhook] Received:", payload.type, {
      connectionId: payload.connectionId,
      integration: payload.providerConfigKey,
    });

    switch (payload.type) {
      case "connection_created":
        console.log(
          `[nango/webhook] 連携成立: ${payload.providerConfigKey} / connectionId: ${payload.connectionId}`
        );
        // 必要であれば Supabase に連携状態を保存する
        // await supabaseAdmin.from("nango_connections").upsert({ ... });
        break;

      case "token_refresh_success":
        console.log(
          `[nango/webhook] トークン更新成功: ${payload.providerConfigKey} / connectionId: ${payload.connectionId}`
        );
        break;

      case "token_refresh_failed":
        console.error(
          `[nango/webhook] トークン更新失敗: ${payload.providerConfigKey} / connectionId: ${payload.connectionId}`,
          payload.error
        );
        break;

      default:
        console.log(`[nango/webhook] 未処理のイベント: ${payload.type}`);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[nango/webhook] エラー:", err);
    return NextResponse.json({ error: "Webhook 処理中にエラーが発生しました" }, { status: 500 });
  }
}
