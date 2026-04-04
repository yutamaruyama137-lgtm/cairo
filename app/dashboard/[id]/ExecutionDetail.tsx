"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState } from "react";

const CHARACTER_LABELS: Record<string, { name: string; color: string }> = {
  jin:  { name: "ジン（営業部）",   color: "bg-orange-100 text-orange-700" },
  ai:   { name: "アイ（経理部）",   color: "bg-blue-100 text-blue-700" },
  rin:  { name: "リン（法務部）",   color: "bg-purple-100 text-purple-700" },
  vi:   { name: "ヴィ（技術部）",   color: "bg-teal-100 text-teal-700" },
  iori: { name: "イオリ（マーケ部）", color: "bg-rose-100 text-rose-700" },
  saki: { name: "サキ（総務部）",   color: "bg-amber-100 text-amber-700" },
};

interface Execution {
  id: string;
  menu_id: string;
  character_id: string;
  inputs: Record<string, string>;
  output: string | null;
  duration_ms: number | null;
  status: string;
  created_at: string;
}

export default function ExecutionDetail({ execution }: { execution: Execution }) {
  const [copied, setCopied] = useState(false);
  const char = CHARACTER_LABELS[execution.character_id];
  const date = new Date(execution.created_at);
  const dateStr = date.toLocaleString("ja-JP");

  const handleCopy = () => {
    navigator.clipboard.writeText(execution.output ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([execution.output ?? ""], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${execution.menu_id}-${execution.id.slice(0, 8)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* メタ情報 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {char && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${char.color}`}>
                {char.name}
              </span>
            )}
            <span className="text-sm font-bold text-gray-700">{execution.menu_id}</span>
          </div>
          <span className="text-xs text-gray-400">{dateStr}</span>
        </div>
        {execution.duration_ms && (
          <p className="text-xs text-gray-400">実行時間: {(execution.duration_ms / 1000).toFixed(1)}秒</p>
        )}
        {/* 入力内容 */}
        {execution.inputs && Object.keys(execution.inputs).length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-50">
            <p className="text-xs font-bold text-gray-500 mb-2">入力内容</p>
            {Object.entries(execution.inputs).map(([key, value]) => (
              <div key={key} className="text-xs text-gray-600 mb-1">
                <span className="font-medium">{key}:</span> {value}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 出力 */}
      {execution.output && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-700">出力結果</p>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors flex items-center gap-1"
              >
                {copied ? "✓ コピー済み" : "コピー"}
              </button>
              <button
                onClick={handleDownload}
                className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors flex items-center gap-1"
              >
                .md でダウンロード
              </button>
            </div>
          </div>
          <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:mt-3 prose-headings:mb-1">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {execution.output}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
