"use client";

import { useState } from "react";
import { AICharacter } from "@/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ResultDisplayProps {
  output: string;
  character: AICharacter;
  outputLabel: string;
  isStreaming?: boolean;
  onReset: () => void;
}

export default function ResultDisplay({
  output,
  character,
  outputLabel,
  isStreaming = false,
  onReset,
}: ResultDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className={`${character.lightColor} rounded-2xl p-4 flex items-center gap-3`}>
        <div className={`${character.color} w-10 h-10 rounded-xl flex items-center justify-center text-xl text-white shadow-sm`}>
          {character.emoji}
        </div>
        <div>
          <div className={`text-xs font-bold ${character.textColor}`}>{character.name}より</div>
          <div className="text-sm font-bold text-gray-700">
            {outputLabel}ができました {isStreaming ? "" : "✅"}
          </div>
        </div>
        {isStreaming && (
          <div className="ml-auto">
            <div className={`w-2 h-2 ${character.color} rounded-full animate-pulse`}/>
          </div>
        )}
      </div>

      {/* 出力内容 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-soft p-6">
        <div className={`prose prose-sm max-w-none text-gray-700 leading-relaxed ${isStreaming ? "cursor-blink" : ""}`}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {output}
          </ReactMarkdown>
        </div>
      </div>

      {/* アクションボタン */}
      {!isStreaming && (
        <div className="flex gap-3">
          <button
            onClick={handleCopy}
            className="flex-1 py-3 px-4 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            {copied ? "✅ コピーしました" : "📋 コピーする"}
          </button>
          <button
            onClick={onReset}
            className={`flex-1 py-3 px-4 rounded-xl ${character.lightColor} ${character.textColor} text-sm font-bold hover:opacity-80 transition-colors flex items-center justify-center gap-2 border-2 ${character.borderColor}`}
          >
            🔄 もう一度
          </button>
        </div>
      )}
    </div>
  );
}
