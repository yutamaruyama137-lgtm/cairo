"use client";

/**
 * app/admin/integrations/page.tsx
 *
 * 外部サービス連携管理画面。
 * Phase 3: Nango を使った OAuth 連携の管理。
 */

import { useState, useEffect } from "react";
import Link from "next/link";

interface ServiceConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  integration: string;
  color: string;
}

const SERVICES: ServiceConfig[] = [
  {
    id: "gmail",
    name: "Gmail",
    description: "AI社員がメールを直接送信できるようになります",
    icon: "📧",
    integration: "gmail",
    color: "bg-red-50 border-red-200",
  },
  {
    id: "slack",
    name: "Slack",
    description: "AI社員がSlackチャンネルに直接投稿できるようになります",
    icon: "💬",
    integration: "slack",
    color: "bg-purple-50 border-purple-200",
  },
  {
    id: "google-drive",
    name: "Google Drive",
    description: "成果物をGoogleドキュメントとして自動保存できます",
    icon: "📁",
    integration: "google-drive",
    color: "bg-blue-50 border-blue-200",
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "AI社員が自動でカレンダーに予定を登録できます",
    icon: "📅",
    integration: "google-calendar",
    color: "bg-green-50 border-green-200",
  },
  {
    id: "notion",
    name: "Notion",
    description: "会議メモ・議事録をNotionページに自動保存できます",
    icon: "📝",
    integration: "notion",
    color: "bg-gray-50 border-gray-200",
  },
];

export default function IntegrationsPage() {
  const [connectedIntegrations, setConnectedIntegrations] = useState<string[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [nangoAvailable, setNangoAvailable] = useState(true);

  useEffect(() => {
    fetchConnections();
  }, []);

  async function fetchConnections() {
    try {
      const res = await fetch("/api/nango/connect");
      if (!res.ok) {
        setNangoAvailable(false);
        return;
      }
      const data = await res.json() as { connections: string[] };
      setConnectedIntegrations(data.connections ?? []);
    } catch {
      setNangoAvailable(false);
    }
  }

  async function handleConnect(service: ServiceConfig) {
    setConnecting(service.id);
    try {
      const res = await fetch("/api/nango/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integration: service.integration }),
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        alert(`連携の開始に失敗しました: ${err.error ?? "不明なエラー"}`);
        return;
      }

      const { token } = await res.json() as { token: string };

      // Nango Connect UI を開く
      if (typeof window !== "undefined") {
        const nangoConnectUrl = `https://connect.nango.dev?token=${encodeURIComponent(token)}`;
        const popup = window.open(nangoConnectUrl, "nango-connect", "width=500,height=700,scrollbars=yes");

        // ポップアップが閉じたら接続状態を更新
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            fetchConnections();
          }
        }, 1000);
      }
    } catch (err) {
      alert(`エラーが発生しました: ${err instanceof Error ? err.message : "不明なエラー"}`);
    } finally {
      setConnecting(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link
            href="/admin"
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            ← 管理パネル
          </Link>
          <span className="text-gray-300">/</span>
          <span className="font-black text-gray-800">外部サービス連携</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* ヘッダー説明 */}
        <div>
          <h1 className="text-2xl font-black text-gray-800">外部サービス連携</h1>
          <p className="text-gray-500 mt-2">
            AI社員が直接外部サービスを操作できるように連携を設定します。
            連携することで、メール送信・Slack投稿・ドキュメント保存などが自動化されます。
          </p>
        </div>

        {/* Nango 未設定の警告 */}
        {!nangoAvailable && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5">
            <p className="text-yellow-800 font-bold text-sm">
              ⚠️ 外部連携機能が未設定です
            </p>
            <p className="text-yellow-700 text-sm mt-1">
              <code className="bg-yellow-100 px-1 rounded">NANGO_SECRET_KEY</code> 環境変数を設定してください。
              Nango のダッシュボードから取得できます。
            </p>
            <a
              href="https://nango.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-700 text-sm underline mt-2 inline-block"
            >
              Nango ダッシュボードへ →
            </a>
          </div>
        )}

        {/* サービスカード一覧 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SERVICES.map((service) => {
            const isConnected = connectedIntegrations.includes(service.integration);
            const isConnecting = connecting === service.id;

            return (
              <div
                key={service.id}
                className={`bg-white rounded-2xl border ${service.color} p-5 flex items-start gap-4`}
              >
                <div className="text-3xl flex-shrink-0">{service.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-black text-gray-800">{service.name}</h3>
                    {isConnected && (
                      <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                        連携済み
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-3">{service.description}</p>
                  <button
                    onClick={() => handleConnect(service)}
                    disabled={isConnecting || !nangoAvailable}
                    className={`text-sm font-bold px-4 py-2 rounded-xl transition-colors ${
                      isConnected
                        ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        : "bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    }`}
                  >
                    {isConnecting
                      ? "接続中..."
                      : isConnected
                        ? "再連携する"
                        : "連携する →"
                    }
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* 使い方ガイド */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-black text-gray-800 mb-3">連携後の使い方</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex gap-2">
              <span className="text-blue-500 flex-shrink-0">•</span>
              連携後はチャット画面でAI社員に直接指示できます。例: 「この提案書をGoogleドライブに保存して」
            </li>
            <li className="flex gap-2">
              <span className="text-blue-500 flex-shrink-0">•</span>
              AI社員が自動的に適切なツールを選択して外部サービスを操作します
            </li>
            <li className="flex gap-2">
              <span className="text-blue-500 flex-shrink-0">•</span>
              連携は各ユーザーごとに設定します。他のメンバーとは独立して管理されます
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
