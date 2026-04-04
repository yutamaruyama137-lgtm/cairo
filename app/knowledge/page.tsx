"use client";

/**
 * app/knowledge/page.tsx
 *
 * ナレッジベース管理ページ。
 * - ドキュメントのアップロード（.txt / .md / .csv）
 * - 登録済みソースの一覧表示・削除
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface KnowledgeSource {
  source_name: string;
  chunk_count: number;
  created_at: string;
}

interface UploadResult {
  message: string;
  sourceName: string;
  chunkCount: number;
  vectorized: boolean;
  searchMode: "vector" | "text";
}

export default function KnowledgePage() {
  const router = useRouter();
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [vectorSearchEnabled, setVectorSearchEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingSource, setDeletingSource] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ソース一覧を取得
  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch("/api/knowledge/sources");
      if (res.ok) {
        const data = await res.json();
        setSources(data.sources ?? []);
        setVectorSearchEnabled(data.vectorSearchEnabled ?? false);
      }
    } catch {
      // サイレントに失敗
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  // ファイルアップロード処理
  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadResult(null);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/knowledge/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error ?? "アップロードに失敗しました");
        return;
      }

      setUploadResult(data as UploadResult);
      await fetchSources();
    } catch {
      setUploadError("通信エラーが発生しました");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ドラッグ&ドロップ
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  // ソース削除
  const handleDelete = async (sourceName: string) => {
    if (!confirm(`「${sourceName}」を削除しますか？`)) return;
    setDeletingSource(sourceName);
    try {
      const res = await fetch("/api/knowledge/sources", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceName }),
      });
      if (res.ok) {
        setSources((prev) => prev.filter((s) => s.source_name !== sourceName));
      }
    } catch {
      alert("削除に失敗しました");
    } finally {
      setDeletingSource(null);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

  const totalChunks = sources.reduce((sum, s) => sum + s.chunk_count, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              ← 戻る
            </button>
            <span className="text-gray-300">/</span>
            <span className="font-black text-gray-800">ナレッジベース</span>
          </div>
          {/* 検索モードバッジ */}
          <div
            className={`text-xs px-3 py-1 rounded-full font-medium ${
              vectorSearchEnabled
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {vectorSearchEnabled ? "ベクトル検索 ON" : "テキスト検索（フォールバック）"}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* 説明カード */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
          <h2 className="font-bold text-blue-900 mb-1">ナレッジベースとは？</h2>
          <p className="text-sm text-blue-800 leading-relaxed">
            会社のドキュメント（規約・FAQ・商品カタログ等）をアップロードすると、AI社員が
            <strong>「search_knowledge」ツール</strong>
            でそのデータを参照しながら回答できるようになります。
            <br />
            {vectorSearchEnabled
              ? "現在はベクトル検索（セマンティック検索）が有効です。意味の近い文章を精度高く検索できます。"
              : "OPENAI_API_KEY を設定するとベクトル検索（より高精度）が有効になります。"}
          </p>
        </div>

        {/* 統計 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
            <p className="text-3xl font-black text-gray-800">{sources.length}</p>
            <p className="text-sm text-gray-500 mt-1">登録ドキュメント数</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
            <p className="text-3xl font-black text-gray-800">{totalChunks}</p>
            <p className="text-sm text-gray-500 mt-1">総チャンク数</p>
          </div>
        </div>

        {/* アップロードエリア */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-black text-gray-800 text-lg mb-4">ドキュメントを追加</h2>

          {/* ドラッグ&ドロップ */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
              dragOver
                ? "border-blue-400 bg-blue-50"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="text-4xl mb-3">📄</div>
            <p className="font-medium text-gray-700">
              {uploading ? "アップロード中..." : "ファイルをドロップ または クリックして選択"}
            </p>
            <p className="text-xs text-gray-400 mt-2">.txt / .md / .csv 対応 ・ 最大 5MB</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
          />

          {/* アップロード中 */}
          {uploading && (
            <div className="mt-4 flex items-center gap-3 text-sm text-gray-600">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              テキスト抽出・チャンク分割・ベクトル化処理中...
            </div>
          )}

          {/* 成功 */}
          {uploadResult && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="font-bold text-green-800">アップロード完了</p>
              <p className="text-sm text-green-700 mt-1">
                <strong>{uploadResult.sourceName}</strong> を{" "}
                <strong>{uploadResult.chunkCount} チャンク</strong>に分割して保存しました。
                <br />
                検索モード:{" "}
                {uploadResult.vectorized ? "ベクトル検索（高精度）" : "テキスト検索"}
              </p>
            </div>
          )}

          {/* エラー */}
          {uploadError && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="font-bold text-red-700">エラー</p>
              <p className="text-sm text-red-600 mt-1">{uploadError}</p>
            </div>
          )}
        </div>

        {/* ソース一覧 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-black text-gray-800 text-lg mb-4">
            登録済みドキュメント
            {sources.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-400">
                （{sources.length} 件）
              </span>
            )}
          </h2>

          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">読み込み中...</div>
          ) : sources.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-gray-400 text-sm">まだドキュメントが登録されていません</p>
              <p className="text-gray-300 text-xs mt-1">上のエリアからアップロードしてください</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {sources.map((source) => (
                <div
                  key={source.source_name}
                  className="flex items-center justify-between py-3 group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {source.source_name.endsWith(".md")
                        ? "📝"
                        : source.source_name.endsWith(".csv")
                        ? "📊"
                        : "📄"}
                    </span>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">
                        {source.source_name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {source.chunk_count} チャンク ・ {formatDate(source.created_at)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(source.source_name)}
                    disabled={deletingSource === source.source_name}
                    className="opacity-0 group-hover:opacity-100 text-xs text-red-500 hover:text-red-700 transition-all px-3 py-1 rounded-lg hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingSource === source.source_name ? "削除中..." : "削除"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* OPENAI_API_KEY の案内 */}
        {!vectorSearchEnabled && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5">
            <p className="font-bold text-yellow-800 mb-1">ベクトル検索を有効にするには</p>
            <p className="text-sm text-yellow-700 leading-relaxed">
              <code className="bg-yellow-100 px-1 rounded">OPENAI_API_KEY</code> を
              <code className="bg-yellow-100 px-1 rounded">.env.local</code>（ローカル）と
              Vercel の環境変数に追加してください。
              <br />
              OpenAI の{" "}
              <strong>text-embedding-3-small</strong> モデルを使用します（低コスト）。
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
