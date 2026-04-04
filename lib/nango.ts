/**
 * lib/nango.ts
 *
 * Nango クライアントのシングルトン。
 * NANGO_SECRET_KEY が設定されていない場合は null を返す。
 * Phase 3: 外部サービス連携 (Gmail, Slack, Google Drive, Google Calendar)
 */

import { Nango } from "@nangohq/node";

export const nango = process.env.NANGO_SECRET_KEY
  ? new Nango({ secretKey: process.env.NANGO_SECRET_KEY })
  : null;
