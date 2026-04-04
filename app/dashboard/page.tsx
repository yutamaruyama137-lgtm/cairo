export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions, DEFAULT_TENANT_ID } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserByEmail } from "@/lib/db/users";
import Link from "next/link";
import { redirect } from "next/navigation";

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

const CHARACTER_LABELS: Record<string, { name: string; color: string }> = {
  jin:  { name: "ジン",   color: "bg-orange-100 text-orange-700" },
  ai:   { name: "アイ",   color: "bg-blue-100 text-blue-700" },
  rin:  { name: "リン",   color: "bg-purple-100 text-purple-700" },
  vi:   { name: "ヴィ",   color: "bg-teal-100 text-teal-700" },
  iori: { name: "イオリ", color: "bg-rose-100 text-rose-700" },
  saki: { name: "サキ",   color: "bg-amber-100 text-amber-700" },
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const dbUser = await getUserByEmail(session.user.email, DEFAULT_TENANT_ID);

  let executions: Execution[] = [];
  if (dbUser) {
    const { data } = await supabaseAdmin
      .from("menu_executions")
      .select("id, menu_id, character_id, inputs, output, duration_ms, status, created_at")
      .eq("user_id", dbUser.id)
      .order("created_at", { ascending: false })
      .limit(50);
    executions = (data ?? []) as Execution[];
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1">
              {["J","A","R","V","I","S"].map((letter, i) => {
                const colors = [
                  "bg-orange-500","bg-blue-500","bg-purple-500",
                  "bg-teal-500","bg-rose-500","bg-amber-500",
                ];
                return (
                  <div key={letter} className={`w-6 h-6 ${colors[i]} rounded-md flex items-center justify-center text-white font-black text-xs`}>
                    {letter}
                  </div>
                );
              })}
            </Link>
            <span className="text-sm font-bold text-gray-500">/ 実行履歴</span>
          </div>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            ← トップへ
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-black text-gray-800">実行履歴</h1>
          <p className="text-sm text-gray-500 mt-1">{session.user.name} さんの過去の実行記録</p>
        </div>

        {executions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <p className="text-gray-400 text-sm">まだ実行履歴がありません</p>
            <Link
              href="/"
              className="inline-block mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors"
            >
              AI社員に仕事を頼む
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {executions.map((exec) => {
              const char = CHARACTER_LABELS[exec.character_id];
              const date = new Date(exec.created_at);
              const dateStr = `${date.getFullYear()}/${String(date.getMonth()+1).padStart(2,"0")}/${String(date.getDate()).padStart(2,"0")} ${String(date.getHours()).padStart(2,"0")}:${String(date.getMinutes()).padStart(2,"0")}`;

              return (
                <div key={exec.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      {char && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${char.color}`}>
                          {char.name}
                        </span>
                      )}
                      <span className="text-sm font-bold text-gray-700">{exec.menu_id}</span>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{dateStr}</span>
                  </div>

                  {exec.output && (
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">
                      {exec.output}
                    </p>
                  )}

                  {exec.duration_ms && (
                    <p className="text-xs text-gray-300 mt-2">{(exec.duration_ms / 1000).toFixed(1)}秒</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
