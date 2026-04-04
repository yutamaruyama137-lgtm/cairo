"use client";

import { useState } from "react";
import type { AICharacter } from "@/types";
import type { TenantAgentConfig } from "@/lib/db/admin";

interface Props {
  character: AICharacter;
  config: TenantAgentConfig | null;
  tenantId: string;
}

const OUTPUT_FORMATS = [
  { value: "markdown", label: "Markdown（標準）" },
  { value: "bullet",   label: "箇条書き" },
  { value: "table",    label: "表形式" },
  { value: "plain",    label: "プレーンテキスト" },
];

export default function AdminAgentCard({ character, config, tenantId }: Props) {
  const [isEnabled, setIsEnabled]     = useState(config?.is_enabled ?? true);
  const [customName, setCustomName]   = useState(config?.custom_name ?? "");
  const [prompt, setPrompt]           = useState(config?.custom_system_prompt ?? "");
  const [format, setFormat]           = useState(config?.output_format ?? "markdown");
  const [expanded, setExpanded]       = useState(false);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/agent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: character.id,
          is_enabled: isEnabled,
          custom_name: customName || null,
          custom_system_prompt: prompt || null,
          output_format: format,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden transition-all ${isEnabled ? "border-gray-100" : "border-gray-100 opacity-60"}`}>
      {/* ヘッダー */}
      <div className={`bg-gradient-to-r ${character.gradientFrom} ${character.gradientTo} px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/avatars/${character.id}.svg`} alt={character.name} width={36} height={36} className="rounded-full border-2 border-white/40" />
          <div className="text-white">
            <div className="font-black text-sm">{customName || character.name}</div>
            <div className="text-xs opacity-80">{character.department}</div>
          </div>
        </div>
        {/* ON/OFFトグル */}
        <button
          onClick={() => setIsEnabled(!isEnabled)}
          className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${isEnabled ? "bg-white/30" : "bg-black/20"}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isEnabled ? "translate-x-5" : "translate-x-1"}`} />
        </button>
      </div>

      {/* 設定エリア */}
      <div className="p-4 space-y-3">
        {/* カスタム名 */}
        <div>
          <label className="text-xs font-bold text-gray-500 block mb-1">表示名（空欄でデフォルト）</label>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder={character.name}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400 transition-colors"
          />
        </div>

        {/* 出力フォーマット */}
        <div>
          <label className="text-xs font-bold text-gray-500 block mb-1">出力フォーマット</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400 transition-colors"
          >
            {OUTPUT_FORMATS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        {/* プロンプト設定（展開式） */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={`transition-transform ${expanded ? "rotate-90" : ""}`}>
            <path d="M9 18l6-6-6-6" />
          </svg>
          プロンプトカスタマイズ
        </button>

        {expanded && (
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">
              追加プロンプト（この会社固有の指示）
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`例：必ず${character.department}の視点で回答してください。当社の商品名は「〇〇」です。`}
              rows={4}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-blue-400 transition-colors"
            />
          </div>
        )}

        {/* 保存ボタン */}
        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full text-sm font-bold py-2 rounded-xl transition-colors ${
            saved
              ? "bg-green-500 text-white"
              : "bg-gray-800 hover:bg-gray-900 text-white disabled:opacity-50"
          }`}
        >
          {saving ? "保存中..." : saved ? "✓ 保存しました" : "保存"}
        </button>
      </div>
    </div>
  );
}
