"use client";

/**
 * app/onboarding/page.tsx
 *
 * 初回ログイン時のオンボーディング画面。
 * テナント（会社）を持っていないユーザーがここで会社を作成する。
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function OnboardingPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: companyName.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "エラーが発生しました");
        return;
      }

      // セッションを強制更新（JWTにtenantIdを反映させる）してからリダイレクト
      await update();
      router.replace("/");
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* ロゴ */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-1">
            {["J","A","R","V","I","S"].map((letter, i) => {
              const colors = [
                "bg-orange-500","bg-blue-500","bg-purple-500",
                "bg-teal-500","bg-rose-500","bg-amber-500",
              ];
              return (
                <div
                  key={letter}
                  className={`w-9 h-9 ${colors[i]} rounded-xl flex items-center justify-center text-white font-black text-base`}
                >
                  {letter}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
          {/* ウェルカムメッセージ */}
          <div className="text-center mb-8">
            <p className="text-2xl font-black text-gray-800 mb-2">
              ようこそ！🎉
            </p>
            <p className="text-gray-500 text-sm">
              {session?.user?.name ?? session?.user?.email} さん
            </p>
            <p className="text-gray-400 text-sm mt-3 leading-relaxed">
              まず、あなたの会社を作成しましょう。<br />
              AI社員たちがすぐに働き始めます。
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                会社名・チーム名
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="例：株式会社〇〇、△△商店"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                maxLength={50}
                required
              />
              <p className="text-xs text-gray-400 mt-1">あとから変更できます</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !companyName.trim()}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-3.5 rounded-xl transition-colors text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  作成中...
                </span>
              ) : (
                "会社を作成して始める →"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          AI社員があなたの会社専用に設定されます
        </p>
      </div>
    </div>
  );
}
