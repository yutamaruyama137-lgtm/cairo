"use client";

/**
 * app/admin/menus/page.tsx
 *
 * メニュー管理画面。
 * テナント専用メニューの一覧・追加・編集・削除ができる。
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { characters } from "@/data/characters";
import type { TenantMenuRow } from "@/lib/db/menus";
import type { MenuInput, MenuCategory } from "@/types";

const CATEGORIES: MenuCategory[] = ["文書作成", "分析・調査", "コミュニケーション", "相談・アドバイス", "事務処理"];
const INPUT_TYPES = ["text", "textarea", "select"] as const;

// ========================================
// 空のメニューフォーム初期値
// ========================================
function emptyForm() {
  return {
    menu_id: "",
    character_id: "jin",
    title: "",
    description: "",
    icon: "📝",
    estimated_seconds: 30,
    human_minutes: 30,
    category: "文書作成" as MenuCategory,
    inputs: [] as MenuInput[],
    prompt_template: "",
    system_prompt_override: "" as string,
    knowledge_sources: [] as string[],
    output_label: "成果物",
    is_enabled: true,
    sort_order: 0,
  };
}

// ========================================
// メインページ
// ========================================
export default function AdminMenusPage() {
  const [menus, setMenus] = useState<TenantMenuRow[]>([]);
  const [knowledgeSources, setKnowledgeSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<TenantMenuRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterChar, setFilterChar] = useState<string>("all");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const fetchMenus = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/menus");
    if (res.ok) {
      const data = await res.json();
      setMenus(data.menus ?? []);
      setKnowledgeSources(data.knowledgeSources ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchMenus(); }, [fetchMenus]);

  // フォームを開く（新規 or 編集）
  function openNew() {
    setEditTarget(null);
    setForm(emptyForm());
    setError(null);
    setShowAdvanced(false);
    setShowForm(true);
  }

  function openEdit(menu: TenantMenuRow) {
    setEditTarget(menu);
    setForm({
      menu_id: menu.menu_id,
      character_id: menu.character_id,
      title: menu.title,
      description: menu.description,
      icon: menu.icon,
      estimated_seconds: menu.estimated_seconds,
      human_minutes: menu.human_minutes,
      category: menu.category as MenuCategory,
      inputs: menu.inputs ?? [],
      prompt_template: menu.prompt_template,
      system_prompt_override: menu.system_prompt_override ?? "",
      knowledge_sources: menu.knowledge_sources ?? [],
      output_label: menu.output_label,
      is_enabled: menu.is_enabled,
      sort_order: menu.sort_order,
    });
    setError(null);
    setShowAdvanced(!!(menu.system_prompt_override));
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.menu_id.trim() || !form.title.trim() || !form.prompt_template.trim()) {
      setError("メニューID・タイトル・プロンプトは必須です");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editTarget) {
        // 更新
        const res = await fetch(`/api/admin/menus/${editTarget.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      } else {
        // 新規作成
        const res = await fetch("/api/admin/menus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      }
      setShowForm(false);
      await fetchMenus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(menu: TenantMenuRow) {
    if (!confirm(`「${menu.title}」を削除しますか？`)) return;
    await fetch(`/api/admin/menus/${menu.id}`, { method: "DELETE" });
    await fetchMenus();
  }

  // 入力フィールド操作
  function addInput() {
    setForm((f) => ({
      ...f,
      inputs: [...f.inputs, { key: "", label: "", type: "text", placeholder: "", required: true }],
    }));
  }

  function updateInput(i: number, patch: Partial<MenuInput>) {
    setForm((f) => {
      const next = [...f.inputs];
      next[i] = { ...next[i], ...patch };
      return { ...f, inputs: next };
    });
  }

  function removeInput(i: number) {
    setForm((f) => ({ ...f, inputs: f.inputs.filter((_, idx) => idx !== i) }));
  }

  // ナレッジソース選択
  function toggleSource(name: string) {
    setForm((f) => {
      const cur = f.knowledge_sources;
      return { ...f, knowledge_sources: cur.includes(name) ? cur.filter((s) => s !== name) : [...cur, name] };
    });
  }

  const filteredMenus = filterChar === "all" ? menus : menus.filter((m) => m.character_id === filterChar);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-600">← 管理画面</Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-black text-gray-800">メニュー管理</span>
          </div>
          <button
            onClick={openNew}
            className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
          >
            ＋ メニューを追加
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* フィルター */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setFilterChar("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${filterChar === "all" ? "bg-gray-800 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            全員 ({menus.length})
          </button>
          {characters.map((c) => {
            const count = menus.filter((m) => m.character_id === c.id).length;
            return (
              <button
                key={c.id}
                onClick={() => setFilterChar(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${filterChar === c.id ? `${c.color} text-white` : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
              >
                {c.name} ({count})
              </button>
            );
          })}
        </div>

        {/* メニュー一覧 */}
        {loading ? (
          <div className="text-center py-20 text-gray-400 text-sm">読み込み中...</div>
        ) : filteredMenus.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <p className="text-gray-400 text-sm mb-4">まだメニューがありません</p>
            <button onClick={openNew} className="text-blue-500 text-sm font-bold hover:underline">
              ＋ 最初のメニューを追加する
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMenus.map((menu) => {
              const char = characters.find((c) => c.id === menu.character_id);
              return (
                <div key={menu.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
                  <div className={`${char?.lightColor ?? "bg-gray-50"} w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0`}>
                    {menu.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-gray-800">{menu.title}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${char?.lightColor ?? "bg-gray-100"} ${char?.textColor ?? "text-gray-600"}`}>
                        {char?.name ?? menu.character_id}
                      </span>
                      <span className="text-xs text-gray-400">{menu.category}</span>
                      {!menu.is_enabled && (
                        <span className="text-xs bg-red-50 text-red-400 px-2 py-0.5 rounded-full font-bold">非表示</span>
                      )}
                      {menu.knowledge_sources?.length > 0 && (
                        <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-bold">
                          📚 {menu.knowledge_sources.length}件参照
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{menu.description}</p>
                    <p className="text-xs text-gray-300 mt-1 font-mono truncate">ID: {menu.menu_id}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEdit(menu)}
                      className="text-xs font-bold text-blue-500 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(menu)}
                      className="text-xs font-bold text-red-400 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      削除
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 追加・編集モーダル */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-auto">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-800">
                {editTarget ? "メニューを編集" : "メニューを追加"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            <div className="px-8 py-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{error}</div>
              )}

              {/* 基本情報 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">メニューID <span className="text-red-400">*</span></label>
                  <input
                    value={form.menu_id}
                    onChange={(e) => setForm((f) => ({ ...f, menu_id: e.target.value }))}
                    placeholder="例：reqs-01"
                    disabled={!!editTarget}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 disabled:bg-gray-50 font-mono"
                  />
                  <p className="text-xs text-gray-400 mt-0.5">半角英数字・ハイフン（変更不可）</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">担当AI社員</label>
                  <select
                    value={form.character_id}
                    onChange={(e) => setForm((f) => ({ ...f, character_id: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                  >
                    {characters.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}（{c.department}）</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">タイトル <span className="text-red-400">*</span></label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="例：採用要件書を作る"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">アイコン（絵文字）</label>
                  <input
                    value={form.icon}
                    onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                    placeholder="📝"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 text-center text-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">説明文</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="例：採用要件を整理して、求人票の原稿を作成します"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">カテゴリ</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as MenuCategory }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">AI処理時間（秒）</label>
                  <input
                    type="number"
                    value={form.estimated_seconds}
                    onChange={(e) => setForm((f) => ({ ...f, estimated_seconds: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">人間の作業時間（分）</label>
                  <input
                    type="number"
                    value={form.human_minutes}
                    onChange={(e) => setForm((f) => ({ ...f, human_minutes: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              {/* 入力フィールド定義 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-700">入力フィールド</label>
                  <button
                    onClick={addInput}
                    className="text-xs font-bold text-blue-500 hover:text-blue-700"
                  >
                    ＋ フィールドを追加
                  </button>
                </div>
                {form.inputs.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-3 bg-gray-50 rounded-xl">
                    フィールドなし（プロンプトに変数なしで使う場合）
                  </p>
                )}
                <div className="space-y-3">
                  {form.inputs.map((input, i) => (
                    <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-500">フィールド {i + 1}</span>
                        <button onClick={() => removeInput(i)} className="text-xs text-red-400 hover:text-red-600">削除</button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">変数名（key）</label>
                          <input
                            value={input.key}
                            onChange={(e) => updateInput(i, { key: e.target.value })}
                            placeholder="例：company_name"
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-400 font-mono"
                          />
                          <p className="text-xs text-gray-300 mt-0.5">プロンプトで {'{{key}}'} として使用</p>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">ラベル</label>
                          <input
                            value={input.label}
                            onChange={(e) => updateInput(i, { label: e.target.value })}
                            placeholder="例：会社名"
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-400"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">入力タイプ</label>
                          <select
                            value={input.type}
                            onChange={(e) => updateInput(i, { type: e.target.value as "text" | "textarea" | "select" })}
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-400"
                          >
                            {INPUT_TYPES.map((t) => (
                              <option key={t} value={t}>{t === "text" ? "1行テキスト" : t === "textarea" ? "複数行テキスト" : "選択肢"}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">プレースホルダー</label>
                          <input
                            value={input.placeholder}
                            onChange={(e) => updateInput(i, { placeholder: e.target.value })}
                            placeholder="例：株式会社〇〇"
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-400"
                          />
                        </div>
                      </div>
                      {input.type === "select" && (
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">選択肢（改行区切り）</label>
                          <textarea
                            value={(input.options ?? []).join("\n")}
                            onChange={(e) => updateInput(i, { options: e.target.value.split("\n").filter(Boolean) })}
                            rows={3}
                            placeholder={"選択肢1\n選択肢2\n選択肢3"}
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-400 font-mono"
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`req-${i}`}
                          checked={input.required}
                          onChange={(e) => updateInput(i, { required: e.target.checked })}
                          className="w-3 h-3"
                        />
                        <label htmlFor={`req-${i}`} className="text-xs text-gray-500">必須項目</label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* プロンプトテンプレート */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  プロンプトテンプレート <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={form.prompt_template}
                  onChange={(e) => setForm((f) => ({ ...f, prompt_template: e.target.value }))}
                  rows={10}
                  placeholder={"以下の情報をもとに〇〇を作成してください。\n\n会社名: {{company_name}}\n課題: {{issue}}\n\n【出力形式】\n..."}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 font-mono leading-relaxed"
                />
                <p className="text-xs text-gray-400 mt-1">
                  入力フィールドの変数名を {'{{key}}'} 形式で埋め込めます
                </p>
              </div>

              {/* 高度な設定（システムプロンプト） */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <span className="text-xs font-bold text-gray-600">
                    🔧 高度な設定（システムプロンプトの上書き）
                    {form.system_prompt_override && <span className="ml-2 text-blue-500">● 設定済み</span>}
                  </span>
                  <span className="text-gray-400 text-xs">{showAdvanced ? "▲" : "▼"}</span>
                </button>
                {showAdvanced && (
                  <div className="px-4 py-4 space-y-2">
                    <p className="text-xs text-gray-500 leading-relaxed">
                      空白の場合はAI社員のデフォルト設定を使用します。入力すると、このメニュー専用のシステムプロンプトに完全に上書きされます。
                    </p>
                    <textarea
                      value={form.system_prompt_override}
                      onChange={(e) => setForm((f) => ({ ...f, system_prompt_override: e.target.value }))}
                      rows={8}
                      placeholder={"例：あなたは法律の専門家です。以下の契約書を厳密にレビューし...\n\n（空白 = AI社員のデフォルト設定を使用）"}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 font-mono leading-relaxed"
                    />
                  </div>
                )}
              </div>

              {/* 参照ナレッジソース */}
              {knowledgeSources.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    参照するナレッジファイル
                    <span className="ml-1 font-normal text-gray-400">（チェックしたファイルの内容がプロンプトに自動で追加されます）</span>
                  </label>
                  <div className="space-y-2">
                    {knowledgeSources.map((name) => (
                      <label key={name} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={form.knowledge_sources.includes(name)}
                          onChange={() => toggleSource(name)}
                          className="w-4 h-4 rounded accent-blue-500"
                        />
                        <span className="text-sm text-gray-700 group-hover:text-blue-600">📄 {name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">出力ラベル</label>
                  <input
                    value={form.output_label}
                    onChange={(e) => setForm((f) => ({ ...f, output_label: e.target.value }))}
                    placeholder="例：採用要件書"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">表示順</label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_enabled"
                  checked={form.is_enabled}
                  onChange={(e) => setForm((f) => ({ ...f, is_enabled: e.target.checked }))}
                  className="w-4 h-4 rounded accent-blue-500"
                />
                <label htmlFor="is_enabled" className="text-sm text-gray-700">このメニューを有効にする</label>
              </div>
            </div>

            <div className="px-8 py-5 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white transition-colors"
              >
                {saving ? "保存中..." : editTarget ? "変更を保存" : "メニューを追加"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
