export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions, DEFAULT_TENANT_ID } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTenantAgentConfigs, getTenantDetail } from "@/lib/db/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { characters } from "@/data/characters";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import AdminAgentCard from "./AdminAgentCard";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [tenant, agentConfigs, rateLimit] = await Promise.all([
    getTenantDetail(DEFAULT_TENANT_ID),
    getTenantAgentConfigs(DEFAULT_TENANT_ID),
    checkRateLimit(DEFAULT_TENANT_ID),
  ]);

  // agent_id → config のマップ
  const configMap = Object.fromEntries(agentConfigs.map((c) => [c.agent_id, c]));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton href="/" label="← トップ" />
            <span className="text-gray-300">/</span>
            <span className="font-black text-gray-800">管理パネル</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* テナント情報 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-black text-gray-800 text-lg mb-4">テナント情報</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">会社名</p>
              <p className="font-bold text-gray-800">{tenant?.name ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">プラン</p>
              <p className="font-bold text-gray-800 capitalize">{tenant?.plan ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">今月の実行回数</p>
              <p className="font-bold text-gray-800">
                {rateLimit.used}
                {rateLimit.limit !== null && <span className="text-gray-400 font-normal"> / {rateLimit.limit}</span>}
                {rateLimit.limit === null && <span className="text-gray-400 font-normal"> （無制限）</span>}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">サブドメイン</p>
              <p className="font-bold text-gray-800">{tenant?.subdomain ?? "-"}</p>
            </div>
          </div>
        </div>

        {/* ダッシュボードへのリンク */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 flex items-center justify-between text-white">
          <div>
            <h2 className="font-black text-lg">削減時間ダッシュボード</h2>
            <p className="text-sm opacity-80 mt-1">
              AI社員が何時間分の業務を代替したか・どの能力が使われているかを可視化
            </p>
          </div>
          <Link
            href="/admin/dashboard"
            className="bg-white text-blue-600 text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-colors whitespace-nowrap"
          >
            見る →
          </Link>
        </div>

        {/* メンバー管理 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-center justify-between">
          <div>
            <h2 className="font-black text-gray-800 text-lg">メンバー管理</h2>
            <p className="text-sm text-gray-500 mt-1">
              メンバーの追加・削除・招待ができます
            </p>
          </div>
          <Link
            href="/admin/members"
            className="bg-gray-900 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-gray-700 transition-colors whitespace-nowrap"
          >
            管理する →
          </Link>
        </div>

        {/* メニュー管理 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-center justify-between">
          <div>
            <h2 className="font-black text-gray-800 text-lg">メニュー管理</h2>
            <p className="text-sm text-gray-500 mt-1">
              AI社員の仕事メニューを追加・編集・削除できます。プロンプトやナレッジ参照も設定可能
            </p>
          </div>
          <Link
            href="/admin/menus"
            className="bg-blue-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-blue-600 transition-colors whitespace-nowrap"
          >
            管理する →
          </Link>
        </div>

        {/* ナレッジベースへのリンク */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-center justify-between">
          <div>
            <h2 className="font-black text-gray-800 text-lg">ナレッジベース</h2>
            <p className="text-sm text-gray-500 mt-1">
              社内ドキュメントをアップロードしてAI社員に会社の知識を学習させます
            </p>
          </div>
          <Link
            href="/knowledge"
            className="bg-gray-900 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-gray-700 transition-colors whitespace-nowrap"
          >
            管理する →
          </Link>
        </div>

        {/* 外部連携 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-center justify-between">
          <div>
            <h2 className="font-black text-gray-800 text-lg">外部サービス連携</h2>
            <p className="text-sm text-gray-500 mt-1">
              Gmail・Slack・Google Drive・Google Calendarと連携してAI社員の自動化範囲を拡張します
            </p>
          </div>
          <Link
            href="/admin/integrations"
            className="bg-indigo-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors whitespace-nowrap"
          >
            設定する →
          </Link>
        </div>

        {/* AI社員設定 */}
        <div>
          <h2 className="font-black text-gray-800 text-lg mb-2">AI社員設定</h2>
          <p className="text-sm text-gray-500 mb-5">
            各AI社員のON/OFF・カスタム名・プロンプト・出力フォーマットを設定できます。
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {characters.map((char) => (
              <AdminAgentCard
                key={char.id}
                character={char}
                config={configMap[char.id] ?? null}
                tenantId={DEFAULT_TENANT_ID}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
