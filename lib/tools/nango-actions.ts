/**
 * lib/tools/nango-actions.ts
 *
 * Nango proxy を使った外部サービス連携ツール。
 * triggerAction（カスタムスクリプト）ではなく proxy（直接API呼び出し）で動作。
 * Slack / Gmail / Notion 対応。
 */

import type { ToolDefinition } from "@/lib/agents/base";
import { nango } from "@/lib/nango";

// ========================================
// ツール定義
// ========================================

export const postToSlackTool: ToolDefinition = {
  name: "post_to_slack",
  description:
    "Slack のチャンネルにメッセージを投稿する。" +
    "社内通知・進捗報告・成果物の共有など、チームへの連絡が必要な場合に使う。",
  input_schema: {
    type: "object",
    properties: {
      channel: { type: "string", description: "投稿先チャンネル名（例: general, 営業チーム）またはチャンネルID" },
      message: { type: "string", description: "投稿するメッセージ内容（Slack mrkdwn形式可）" },
    },
    required: ["channel", "message"],
  },
};

export const sendGmailTool: ToolDefinition = {
  name: "send_gmail",
  description:
    "Gmail でメールを送信する。" +
    "営業メール・フォローアップ・請求書送付など、実際のメール送信が必要な場合に使う。",
  input_schema: {
    type: "object",
    properties: {
      to: { type: "string", description: "送信先メールアドレス（複数はカンマ区切り）" },
      subject: { type: "string", description: "件名" },
      body: { type: "string", description: "メール本文（プレーンテキスト）" },
    },
    required: ["to", "subject", "body"],
  },
};

export const createNotionPageTool: ToolDefinition = {
  name: "create_notion_page",
  description:
    "Notion にページを作成する。" +
    "議事録・提案書・メモ・報告書など、Notionへの保存が必要な場合に使う。",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "ページタイトル" },
      content: { type: "string", description: "ページ本文（Markdown形式）" },
      parent_page_id: { type: "string", description: "親ページID（省略時はワークスペースルートに作成）" },
    },
    required: ["title", "content"],
  },
};

export const saveToGoogleDriveTool: ToolDefinition = {
  name: "save_to_google_drive",
  description:
    "コンテンツを Google ドキュメントとして Google Drive に保存する。",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "ドキュメントのタイトル" },
      content: { type: "string", description: "保存するコンテンツ（Markdownまたはプレーンテキスト）" },
    },
    required: ["title", "content"],
  },
};

export const NANGO_TOOLS: ToolDefinition[] = [
  postToSlackTool,
  sendGmailTool,
  createNotionPageTool,
  saveToGoogleDriveTool,
];

// ========================================
// 接続ID自動解決
// ========================================

/**
 * インテグレーション名からNangoの接続IDを自動取得する。
 * ユーザーがNangoダッシュボードで直接接続した場合でも動作する。
 */
async function resolveConnectionId(providerConfigKey: string): Promise<string> {
  if (!nango) throw new Error("Nango が設定されていません。");

  const res = await nango.listConnections();
  const connections = res.connections ?? [];

  // provider_config_key が部分一致するものを探す（gmail, google-mail 等の表記ゆれ対応）
  const match = connections.find(
    (c: { provider_config_key?: string; connection_id: string }) =>
      c.provider_config_key?.toLowerCase().includes(providerConfigKey.toLowerCase())
  );

  if (!match) {
    throw new Error(
      `${providerConfigKey} の接続が見つかりません。/admin/integrations から連携してください。`
    );
  }

  return (match as { connection_id: string }).connection_id;
}

function getNangoClient() {
  if (!nango) throw new Error("Nango が設定されていません。NANGO_SECRET_KEY を設定してください。");
  return nango;
}

// ========================================
// ツール実行
// ========================================

export async function executePostToSlack(
  input: Record<string, string>
): Promise<string> {
  try {
    const client = getNangoClient();
    const connectionId = await resolveConnectionId("slack");

    const res = await client.proxy({
      method: "POST",
      endpoint: "/api/chat.postMessage",
      providerConfigKey: "slack",
      connectionId,
      data: {
        channel: input.channel.startsWith("#") ? input.channel : `#${input.channel}`,
        text: input.message,
      },
    });

    const data = res.data as { ok?: boolean; error?: string };
    if (!data.ok) throw new Error(data.error ?? "Slack APIエラー");

    return `✅ Slackに投稿しました。\nチャンネル: #${input.channel}`;
  } catch (err) {
    return `Slack投稿に失敗しました: ${err instanceof Error ? err.message : "不明なエラー"}`;
  }
}

export async function executeSendGmail(
  input: Record<string, string>
): Promise<string> {
  try {
    const client = getNangoClient();
    const connectionId = await resolveConnectionId("gmail");

    // RFC 2822 形式でエンコード
    const rawEmail = [
      `To: ${input.to}`,
      `Subject: =?UTF-8?B?${Buffer.from(input.subject).toString("base64")}?=`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      Buffer.from(input.body).toString("base64"),
    ].join("\r\n");

    const base64Email = Buffer.from(rawEmail)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await client.proxy({
      method: "POST",
      endpoint: "/gmail/v1/users/me/messages/send",
      providerConfigKey: "gmail",
      connectionId,
      data: { raw: base64Email },
    });

    return `✅ メールを送信しました。\n宛先: ${input.to}\n件名: ${input.subject}`;
  } catch (err) {
    return `メール送信に失敗しました: ${err instanceof Error ? err.message : "不明なエラー"}`;
  }
}

export async function executeCreateNotionPage(
  input: Record<string, string>
): Promise<string> {
  try {
    const client = getNangoClient();
    const connectionId = await resolveConnectionId("notion");

    // Markdownを簡易的にNotionブロックに変換
    const blocks = input.content
      .split("\n")
      .filter((line) => line.trim())
      .slice(0, 100) // Notionの1リクエスト上限
      .map((line) => {
        if (line.startsWith("# "))
          return { object: "block", type: "heading_1", heading_1: { rich_text: [{ type: "text", text: { content: line.slice(2) } }] } };
        if (line.startsWith("## "))
          return { object: "block", type: "heading_2", heading_2: { rich_text: [{ type: "text", text: { content: line.slice(3) } }] } };
        if (line.startsWith("### "))
          return { object: "block", type: "heading_3", heading_3: { rich_text: [{ type: "text", text: { content: line.slice(4) } }] } };
        if (line.startsWith("- ") || line.startsWith("* "))
          return { object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ type: "text", text: { content: line.slice(2) } }] } };
        return { object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: line } }] } };
      });

    const pageData: Record<string, unknown> = {
      properties: {
        title: [{ text: { content: input.title } }],
      },
      children: blocks,
    };

    if (input.parent_page_id) {
      pageData.parent = { type: "page_id", page_id: input.parent_page_id };
    } else {
      // ワークスペースのルートに作成（検索して最初のページを親にする）
      const searchRes = await client.proxy({
        method: "POST",
        endpoint: "/v1/search",
        providerConfigKey: "notion",
        connectionId,
        data: { filter: { property: "object", value: "page" }, page_size: 1 },
      });
      const pages = (searchRes.data as { results?: Array<{ id: string }> })?.results ?? [];
      if (pages.length > 0) {
        pageData.parent = { type: "page_id", page_id: pages[0].id };
      } else {
        throw new Error("Notionに既存ページが見つかりません。parent_page_id を指定してください。");
      }
    }

    const res = await client.proxy({
      method: "POST",
      endpoint: "/v1/pages",
      providerConfigKey: "notion",
      connectionId,
      data: pageData,
    });

    const page = res.data as { url?: string; id?: string };
    return `✅ Notionページを作成しました。\nタイトル: ${input.title}${page.url ? `\nURL: ${page.url}` : ""}`;
  } catch (err) {
    return `Notionページ作成に失敗しました: ${err instanceof Error ? err.message : "不明なエラー"}`;
  }
}

export async function executeSaveToGoogleDrive(
  input: Record<string, string>
): Promise<string> {
  try {
    const client = getNangoClient();
    const connectionId = await resolveConnectionId("google-drive");

    // Google Docs APIでドキュメント作成
    const res = await client.proxy({
      method: "POST",
      endpoint: "/v1/documents",
      providerConfigKey: "google-drive",
      connectionId,
      data: { title: input.title },
    });

    const doc = res.data as { documentId?: string };
    const docId = doc.documentId;
    if (!docId) throw new Error("ドキュメントIDが取得できませんでした");

    // コンテンツを挿入
    await client.proxy({
      method: "POST",
      endpoint: `/v1/documents/${docId}:batchUpdate`,
      providerConfigKey: "google-drive",
      connectionId,
      data: {
        requests: [{
          insertText: {
            location: { index: 1 },
            text: input.content,
          },
        }],
      },
    });

    return `✅ Google Driveに保存しました。\nタイトル: ${input.title}\nURL: https://docs.google.com/document/d/${docId}`;
  } catch (err) {
    return `Google Drive保存に失敗しました: ${err instanceof Error ? err.message : "不明なエラー"}`;
  }
}
