"use client";

import { downloadAsDocx, downloadAsCsv } from "@/lib/export";
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

export default function ArtifactPanel({ content, isStreaming = false, onClose }: Props) {
  const filename = `output-${new Date().toISOString().slice(0, 10)}`;
  const title = getTitle(content);

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base flex-shrink-0">📄</span>
          <span className="text-sm font-bold text-gray-800 truncate">{title}</span>
          {isStreaming && (
            <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          )}
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
                onClick={() => downloadAsDocx(content, filename)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors font-medium"
                title="Google Docs / Word で開けます"
              >
                Word
              </button>
              <button
                onClick={() => downloadAsCsv(content, filename)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-green-200 text-green-600 bg-green-50 hover:bg-green-100 transition-colors font-medium"
                title="Excel で開けます"
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
