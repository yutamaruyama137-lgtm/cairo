"use client";

import { useState } from "react";
import { downloadAsCsv } from "@/lib/export";
import MarkdownRenderer from "./MarkdownRenderer";

interface Props {
  content: string;
  isStreaming?: boolean;
  onClose: () => void;
}

function getTitle(doc: string): string {
  const match = doc.match(/^#{1,3} (.+)/m);
  return match?.[1] ?? "ドキュメント";
}

function detectType(content: string): { label: string; icon: string } {
  if (/請求書|invoice|請求番号|支払期限|合計金額/.test(content)) return { label: "請求書", icon: "🧾" };
  if (/提案書|proposal|課題|ソリューション|見積/.test(content)) return { label: "提案書", icon: "📋" };
  return { label: "ドキュメント", icon: "📄" };
}

export default function ArtifactPanel({ content, isStreaming = false, onClose }: Props) {
  const [downloading, setDownloading] = useState(false);
  const filename = getTitle(content).slice(0, 40) || `output-${new Date().toISOString().slice(0, 10)}`;
  const title = getTitle(content);
  const { label, icon } = detectType(content);

  async function handleDownloadDocx() {
    setDownloading(true);
    try {
      const res = await fetch("/api/export/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, type: "auto", filename }),
      });
      if (!res.ok) throw new Error("生成に失敗しました");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "ダウンロードに失敗しました");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base flex-shrink-0">{icon}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-blue-500 uppercase tracking-wide">{label}</span>
              {isStreaming && (
                <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              )}
            </div>
            <p className="text-sm font-bold text-gray-800 truncate leading-tight">{title}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
          {!isStreaming && (
            <>
              <button
                onClick={() => navigator.clipboard.writeText(content)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
              >
                コピー
              </button>
              <button
                onClick={handleDownloadDocx}
                disabled={downloading}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors font-medium disabled:opacity-50"
                title="Word (.docx) でダウンロード"
              >
                {downloading ? "生成中..." : "Word"}
              </button>
              <button
                onClick={() => downloadAsCsv(content, filename)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-green-200 text-green-600 bg-green-50 hover:bg-green-100 transition-colors font-medium"
                title="Excel (.csv) でダウンロード"
              >
                Excel
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="ml-1 text-gray-400 hover:text-gray-600 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-base leading-none"
          >
            ✕
          </button>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {content ? (
          <MarkdownRenderer content={content} showActions={false} />
        ) : (
          <div className="flex items-center gap-2 text-sm text-gray-400 pt-4">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-400 rounded-full animate-spin" />
            生成中...
          </div>
        )}
        {isStreaming && content && (
          <span className="inline-block w-2 h-4 bg-blue-400 ml-0.5 animate-pulse rounded-sm" />
        )}
      </div>
    </div>
  );
}
