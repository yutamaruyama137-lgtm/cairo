/**
 * lib/tools/nango-actions.ts
 *
 * Nango を使った外部サービス連携ツール。
 * Phase 3: Gmail / Slack / Google Drive / Google Calendar
 *
 * NANGO_SECRET_KEY が設定されていない場合はすべてのツールがエラーを返す。
 */

import type { ToolDefinition } from "@/lib/agents/base";
import { nango } from "@/lib/nango";

// ========================================
// ツール定義
// ========================================

export const sendGmailTool: ToolDefinition = {
  name: "send_gmail",
  description:
    "Gmail でメールを送信する。" +
    "営業メール・請求書送付・ご案内メールなど、実際のメール送信が必要な場合に使う。",
  input_schema: {
    type: "object",
    properties: {
      to: { type: "string", description: "送信先メールアドレス（複数の場合はカンマ区切り）" },
      subject: { type: "string", description: "件名" },
      body: { type: "string", description: "メール本文（プレーンテキストまたはHTML）" },
      connection_id: { type: "string", description: "Nango の connectionId（省略時は自動設定）" },
    },
    required: ["to", "subject", "body"],
  },
};

export const postToSlackTool: ToolDefinition = {
  name: "post_to_slack",
  description:
    "Slack のチャンネルにメッセージを投稿する。" +
    "社内通知・進捗報告・アラートなど、チームへの共有が必要な場合に使う。",
  input_schema: {
    type: "object",
    properties: {
      channel: { type: "string", description: "投稿先チャンネル名（例: #general, #営業チーム）" },
      message: { type: "string", description: "投稿するメッセージ内容" },
      connection_id: { type: "string", description: "Nango の connectionId（省略時は自動設定）" },
    },
    required: ["channel", "message"],
  },
};

export const saveToGoogleDriveTool: ToolDefinition = {
  name: "save_to_google_drive",
  description:
    "コンテンツを Google ドキュメントとして Google Drive に保存する。" +
    "提案書・報告書・議事録など、ドキュメントとして保存・共有が必要な場合に使う。",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "ドキュメントのタイトル" },
      content: { type: "string", description: "保存するコンテンツ（Markdownまたはプレーンテキスト）" },
      folder_id: { type: "string", description: "保存先フォルダID（省略時はルートフォルダ）" },
      connection_id: { type: "string", description: "Nango の connectionId（省略時は自動設定）" },
    },
    required: ["title", "content"],
  },
};

export const createCalendarEventTool: ToolDefinition = {
  name: "create_calendar_event",
  description:
    "Google Calendar に予定を作成する。" +
    "会議・打ち合わせ・締め切りなど、カレンダーへの登録が必要な場合に使う。",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "予定のタイトル" },
      start_datetime: { type: "string", description: "開始日時（ISO 8601形式: 2026-04-10T14:00:00+09:00）" },
      end_datetime: { type: "string", description: "終了日時（ISO 8601形式: 2026-04-10T15:00:00+09:00）" },
      description: { type: "string", description: "予定の詳細・メモ（省略可）" },
      attendees: { type: "string", description: "参加者のメールアドレス（カンマ区切り、省略可）" },
      connection_id: { type: "string", description: "Nango の connectionId（省略時は自動設定）" },
    },
    required: ["title", "start_datetime", "end_datetime"],
  },
};

export const NANGO_TOOLS: ToolDefinition[] = [
  sendGmailTool,
  postToSlackTool,
  saveToGoogleDriveTool,
  createCalendarEventTool,
];

// ========================================
// ツール実行関数
// ========================================

function getNangoClient() {
  if (!nango) {
    throw new Error("Nango が設定されていません。NANGO_SECRET_KEY 環境変数を設定してください。");
  }
  return nango;
}

export async function executeSendGmail(
  input: Record<string, string>,
  tenantId: string,
  userId?: string
): Promise<string> {
  try {
    const client = getNangoClient();
    const connectionId = input.connection_id ?? `${tenantId}-${userId ?? "default"}`;

    await client.triggerAction("gmail", connectionId, "send-email", {
      to: input.to.split(",").map((e: string) => e.trim()),
      subject: input.subject,
      body: input.body,
    });

    return `メールを送信しました。\n宛先: ${input.to}\n件名: ${input.subject}`;
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラー";
    return `メール送信に失敗しました: ${message}`;
  }
}

export async function executePostToSlack(
  input: Record<string, string>,
  tenantId: string,
  userId?: string
): Promise<string> {
  try {
    const client = getNangoClient();
    const connectionId = input.connection_id ?? `${tenantId}-${userId ?? "default"}`;

    await client.triggerAction("slack", connectionId, "post-message", {
      channel: input.channel,
      text: input.message,
    });

    return `Slack に投稿しました。\nチャンネル: ${input.channel}`;
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラー";
    return `Slack 投稿に失敗しました: ${message}`;
  }
}

export async function executeSaveToGoogleDrive(
  input: Record<string, string>,
  tenantId: string,
  userId?: string
): Promise<string> {
  try {
    const client = getNangoClient();
    const connectionId = input.connection_id ?? `${tenantId}-${userId ?? "default"}`;

    const result = await client.triggerAction("google-drive", connectionId, "create-document", {
      title: input.title,
      content: input.content,
      folderId: input.folder_id ?? null,
    }) as { documentId?: string; url?: string };

    const url = result?.url ?? result?.documentId ? `https://docs.google.com/document/d/${result.documentId}` : "";
    return `Google Drive に保存しました。\nタイトル: ${input.title}${url ? `\nURL: ${url}` : ""}`;
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラー";
    return `Google Drive への保存に失敗しました: ${message}`;
  }
}

export async function executeCreateCalendarEvent(
  input: Record<string, string>,
  tenantId: string,
  userId?: string
): Promise<string> {
  try {
    const client = getNangoClient();
    const connectionId = input.connection_id ?? `${tenantId}-${userId ?? "default"}`;

    const attendeeList = input.attendees
      ? input.attendees.split(",").map((e: string) => ({ email: e.trim() }))
      : [];

    await client.triggerAction("google-calendar", connectionId, "create-event", {
      title: input.title,
      startDateTime: input.start_datetime,
      endDateTime: input.end_datetime,
      description: input.description ?? "",
      attendees: attendeeList,
    });

    return `Google Calendar に予定を作成しました。\nタイトル: ${input.title}\n開始: ${input.start_datetime}\n終了: ${input.end_datetime}`;
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラー";
    return `カレンダー予定の作成に失敗しました: ${message}`;
  }
}
