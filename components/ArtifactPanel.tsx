"use client";

import { useState, useEffect, useRef } from "react";
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
  if (/議事録|meeting|参加者|決定事項/.test(content)) return { label: "議事録", icon: "📝" };
  if (/レポート|report|分析|調査/.test(content)) return { label: "レポート", icon: "📊" };
  return { label: "ドキュメント", icon: "📄" };
}

export default function ArtifactPanel({ content, isStreaming = false, onClose }: Props) {
  const [docxUrl, setDocxUrl] = useState<string | null>(null);
  const [docxFilename, setDocxFilename] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const generatedRef = useRef(false);

  const title = getTitle(content);
  const { label, icon } = detectType(content);
  const filename = title.slice(0, 40).replace(/[^\w\-\u3000-\u9fff\u30a0-\u30ff\u3040-\u309f]/g, "_") || `output-${new Date().toISOString().slice(0, 10)}`;

  // ストリーミング完了時に自動でdocx生成
  useEffect(() => {
    if (isStreaming || !content || content.length < 50 || generatedRef.current) return;
    generatedRef.current = true;
    generateDocx();
  }, [isStreaming, content]); // eslint-disable-line react-hooks/exhaustive-deps

  async function generateDocx() {
    setGenerating(true);
    setGenerateError(false);
    try {
      const res = await fetch("/api/export/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, type: "auto", filename }),
      });
      if (!res.ok) throw new Error("生成失敗");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setDocxUrl(url);
      setDocxFilename(`${filename}.docx`);
    } catch {
      setGenerateError(true);
    } finally {
      setGenerating(false);
    }
  }

  function handleDownload() {
    if (!docxUrl) return;
    const a = document.createElement("a");
    a.href = docxUrl;
    a.download = docxFilename;
    a.click();
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
        <button
          onClick={onClose}
          className="ml-3 text-gray-400 hover:text-gray-600 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-base"
        >
          ✕
        </button>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-y-auto flex flex-col">

        {/* ── Wordダウンロード（プライマリアクション）── */}
        {!isStreaming && (
          <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
            {generating ? (
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-blue-700">Word形式に変換中...</p>
                  <p className="text-xs text-blue-400 mt-0.5">書式・レイアウトを整えています</p>
                </div>
              </div>
            ) : generateError ? (
              <div className="space-y-2">
                <p className="text-xs text-red-500">Word生成に失敗しました</p>
                <button
                  onClick={() => { generatedRef.current = false; generateDocx(); }}
                  className="text-sm px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                >
                  再試行
                </button>
              </div>
            ) : docxUrl ? (
              <div className="space-y-2">
                <button
                  onClick={handleDownload}
                  className="w-full flex items-center justify-center gap-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-sm"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Word (.docx) をダウンロード
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(content)}
                    className="flex-1 text-xs py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    テキストをコピー
                  </button>
                  <button
                    onClick={() => downloadAsCsv(content, filename)}
                    className="flex-1 text-xs py-1.5 rounded-lg border border-green-200 text-green-600 bg-green-50 hover:bg-green-100 transition-colors"
                  >
                    Excel (.csv)
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* ── テキストプレビュー（折りたたみ）── */}
        <div className="flex-1 overflow-y-auto">
          <button
            onClick={() => setPreviewOpen(!previewOpen)}
            className="w-full flex items-center justify-between px-5 py-3 text-xs font-bold text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors border-b border-gray-50"
          >
            <span>テキストプレビュー</span>
            <span>{previewOpen ? "▲" : "▼"}</span>
          </button>

          {(previewOpen || isStreaming) && (
            <div className="px-6 py-5">
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
          )}
        </div>
      </div>
    </div>
  );
}
