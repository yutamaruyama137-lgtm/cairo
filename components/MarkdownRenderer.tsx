"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";
import { useState } from "react";

interface Props {
  content: string;
  showActions?: boolean;
}

export default function MarkdownRenderer({ content, showActions = false }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      {showActions && content.length > 10 && (
        <div className="absolute top-0 right-0 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            onClick={handleCopy}
            className="text-xs bg-white border border-gray-200 text-gray-500 hover:text-gray-700 rounded-lg px-2.5 py-1 shadow-sm transition-colors"
          >
            {copied ? "✓ コピー" : "コピー"}
          </button>
        </div>
      )}
      <div className="prose prose-sm max-w-none
        prose-p:my-1.5 prose-p:leading-relaxed
        prose-headings:mt-4 prose-headings:mb-2 prose-headings:font-black
        prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
        prose-ul:my-1.5 prose-ol:my-1.5
        prose-li:my-0.5
        prose-code:bg-gray-100 prose-code:text-rose-600 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200 prose-pre:rounded-xl prose-pre:p-4 prose-pre:my-3
        prose-blockquote:border-l-4 prose-blockquote:border-blue-200 prose-blockquote:pl-4 prose-blockquote:text-gray-600 prose-blockquote:not-italic
        prose-table:w-full prose-th:bg-gray-50 prose-th:font-bold
        prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
        prose-strong:font-black prose-strong:text-gray-800
      ">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
