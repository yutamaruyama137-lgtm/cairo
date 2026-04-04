export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions, DEFAULT_TENANT_ID } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTenantAgentConfigs, getTenantDetail } from "@/lib/db/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { characters } from "@/data/characters";
import Link from "next/link";
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
            <Link href="/chat" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              ← チャットに戻る
            </Link>
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
