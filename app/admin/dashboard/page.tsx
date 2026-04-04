export const dynamic = "force-dynamic";

/**
 * app/admin/dashboard/page.tsx
 *
 * 削減時間ダッシュボード（管理者専用）。
 * メニューごとの human_minutes と実行回数から削減時間を集計して表示する。
 */

import { getServerSession } from "next-auth";
import { authOptions, DEFAULT_TENANT_ID } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { getDashboardStats } from "@/lib/db/dashboard";
import { menus } from "@/data/menus";
import { characters } from "@/data/characters";
import type { MenuCategory } from "@/types";

// ── カテゴリ設定 ───────────────────────────────────────────
const CATEGORY_CONFIG: Record<MenuCategory, { color: string; bg: string; emoji: string }> = {
  "文書作成":       { color: "text-blue-700",   bg: "bg-blue-100",   emoji: "📝" },
  "分析・調査":     { color: "text-purple-700",  bg: "bg-purple-100", emoji: "🔍" },
  "コミュニケーション": { color: "text-rose-700",   bg: "bg-rose-100",   emoji: "💬" },
  "相談・アドバイス": { color: "text-green-700",  bg: "bg-green-100",  emoji: "💡" },
  "事務処理":       { color: "text-amber-700",   bg: "bg-amber-100",  emoji: "📋" },
};

// メニューIDをキーとした lookup マップ
const menuMap = Object.fromEntries(menus.map((m) => [m.id, m]));
const charMap = Object.fromEntries(characters.map((c) => [c.id, c]));

// キャラクターIDをカラー（Tailwind bg）にマッピング
const CHAR_COLORS: Record<string, string> = {
  jin:  "bg-orange-500",
  ai:   "bg-blue-500",
  rin:  "bg-purple-500",
  vi:   "bg-teal-500",
  iori: "bg-rose-500",
  saki: "bg-amber-500",
};
const CHAR_TEXT: Record<string, string> = {
  jin:  "text-orange-600",
  ai:   "text-blue-600",
  rin:  "text-purple-600",
  vi:   "text-teal-600",
  iori: "text-rose-600",
  saki: "text-amber-600",
};
const CHAR_BG: Record<string, string> = {
  jin:  "bg-orange-50",
  ai:   "bg-blue-50",
  rin:  "bg-purple-50",
  vi:   "bg-teal-50",
  iori: "bg-rose-50",
  saki: "bg-amber-50",
};

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}分`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}時間${m}分` : `${h}時間`;
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const tenantId = DEFAULT_TENANT_ID;
  const stats = await getDashboardStats(tenantId);

  // ── 集計計算 ────────────────────────────────────────────

  // 全期間: メニューIDごとの削減分数
  const allTimeSavedByMenu = new Map<string, number>();
  let totalSavedMinutesAllTime = 0;
  let totalExecutionsAllTime = 0;

  for (const stat of stats.allTime) {
    const menu = menuMap[stat.menu_id];
    if (!menu) continue;
    const saved = menu.humanMinutes * stat.count;
    allTimeSavedByMenu.set(stat.menu_id, (allTimeSavedByMenu.get(stat.menu_id) ?? 0) + saved);
    totalSavedMinutesAllTime += saved;
    totalExecutionsAllTime += stat.count;
  }

  // 今月: キャラクター別削減分数
  const thisMonthByChar = new Map<string, { savedMinutes: number; count: number }>();
  let totalSavedMinutesThisMonth = 0;
  let totalExecutionsThisMonth = 0;

  for (const stat of stats.thisMonth) {
    const menu = menuMap[stat.menu_id];
    if (!menu) continue;
    const saved = menu.humanMinutes * stat.count;
    const charId = stat.character_id;
    const existing = thisMonthByChar.get(charId);
    if (existing) {
      existing.savedMinutes += saved;
      existing.count += stat.count;
    } else {
      thisMonthByChar.set(charId, { savedMinutes: saved, count: stat.count });
    }
    totalSavedMinutesThisMonth += saved;
    totalExecutionsThisMonth += stat.count;
  }

  // カテゴリ別使用回数（今月）
  const thisMonthByCategory = new Map<MenuCategory, number>();
  for (const stat of stats.thisMonth) {
    const menu = menuMap[stat.menu_id];
    if (!menu) continue;
    const cat = menu.category as MenuCategory;
    thisMonthByCategory.set(cat, (thisMonthByCategory.get(cat) ?? 0) + stat.count);
  }

  // TOP10 メニュー（全期間削減時間順）
  const topMenus = Array.from(allTimeSavedByMenu.entries())
    .map(([menuId, savedMinutes]) => ({ menuId, savedMinutes, menu: menuMap[menuId] }))
    .filter((x) => x.menu)
    .sort((a, b) => b.savedMinutes - a.savedMinutes)
    .slice(0, 10);

  // キャラクター別最大削減時間（棒グラフの基準値）
  const maxCharSaved = Math.max(...Array.from(thisMonthByChar.values()).map((v) => v.savedMinutes), 1);

  // カテゴリ合計（棒グラフ用）
  const totalCategoryCount = Math.max(
    Array.from(thisMonthByCategory.values()).reduce((a, b) => a + b, 0),
    1
  );

  // トレンド最大値（棒グラフ用）
  const maxTrend = Math.max(...stats.trend.map((t) => t.count), 1);

  // 最も活躍したAI社員（今月）
  const topCharEntry = Array.from(thisMonthByChar.entries()).sort((a, b) => b[1].savedMinutes - a[1].savedMinutes)[0];
  const topChar = topCharEntry ? charMap[topCharEntry[0]] : null;

  // 最も使われたメニュー（今月）
  const topMenuEntry = stats.thisMonth.reduce<typeof stats.thisMonth[0] | null>(
    (best, cur) => (!best || cur.count > best.count ? cur : best),
    null
  );
  const topMenu = topMenuEntry ? menuMap[topMenuEntry.menu_id] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton href="/admin" label="← 管理画面" />
            <span className="text-gray-300">/</span>
            <span className="font-black text-gray-800">削減時間ダッシュボード</span>
          </div>
          <span className="text-xs text-gray-400">Admin only</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* ── KPI カード ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="今月の削減時間"
            value={formatTime(totalSavedMinutesThisMonth)}
            sub={`${totalExecutionsThisMonth}回の実行`}
            accent="blue"
          />
          <KpiCard
            label="累計削減時間"
            value={formatTime(totalSavedMinutesAllTime)}
            sub={`累計${totalExecutionsAllTime}回`}
            accent="green"
          />
          <KpiCard
            label="今月のMVP社員"
            value={topChar ? `${topChar.emoji} ${topChar.name}` : "—"}
            sub={topChar && topCharEntry ? `${formatTime(topCharEntry[1].savedMinutes)}削減` : "まだデータなし"}
            accent="purple"
          />
          <KpiCard
            label="今月の人気メニュー"
            value={topMenu ? `${topMenu.icon} ${topMenu.title}` : "—"}
            sub={topMenuEntry ? `${topMenuEntry.count}回使用` : "まだデータなし"}
            accent="orange"
          />
        </div>

        {/* ── AI社員別 削減時間（今月）── */}
        <Section title="AI社員別 削減時間（今月）" subtitle="各AI社員が何時間分の業務を代替したか">
          {characters.length === 0 || totalExecutionsThisMonth === 0 ? (
            <EmptyState text="今月の実行データがありません" />
          ) : (
            <div className="space-y-4">
              {characters.map((char) => {
                const data = thisMonthByChar.get(char.id);
                const saved = data?.savedMinutes ?? 0;
                const count = data?.count ?? 0;
                const pct = Math.round((saved / maxCharSaved) * 100);
                return (
                  <div key={char.id} className="flex items-center gap-4">
                    <div className={`w-24 text-right text-sm font-bold ${CHAR_TEXT[char.id] ?? "text-gray-600"}`}>
                      {char.emoji} {char.name}
                    </div>
                    <div className="flex-1 flex items-center gap-3">
                      <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${CHAR_COLORS[char.id] ?? "bg-gray-400"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="w-32 text-sm text-gray-700 font-medium">
                        {saved > 0 ? formatTime(saved) : "—"}
                      </div>
                      <div className="w-16 text-xs text-gray-400 text-right">
                        {count > 0 ? `${count}回` : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* ── カテゴリ別 能力使用率（今月）── */}
        <Section title="能力カテゴリ別 使用率（今月）" subtitle="どの能力が最も活用されているか">
          {totalExecutionsThisMonth === 0 ? (
            <EmptyState text="今月の実行データがありません" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Object.keys(CATEGORY_CONFIG) as MenuCategory[]).map((cat) => {
                const count = thisMonthByCategory.get(cat) ?? 0;
                const pct = Math.round((count / totalCategoryCount) * 100);
                const cfg = CATEGORY_CONFIG[cat];
                return (
                  <div key={cat} className={`rounded-xl p-4 ${cfg.bg}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-bold ${cfg.color}`}>
                        {cfg.emoji} {cat}
                      </span>
                      <span className={`text-sm font-black ${cfg.color}`}>{pct}%</span>
                    </div>
                    <div className="bg-white bg-opacity-60 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${cfg.color.replace("text-", "bg-")}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className={`text-xs mt-1 ${cfg.color} opacity-70`}>{count}回使用</p>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* ── TOP10 メニュー（累計削減時間）── */}
        <Section title="メニュー別 累計削減時間 TOP 10" subtitle="累計で最も時間を削減したメニュー">
          {topMenus.length === 0 ? (
            <EmptyState text="まだ実行データがありません" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    <th className="text-left pb-3 w-8">#</th>
                    <th className="text-left pb-3">メニュー</th>
                    <th className="text-left pb-3">担当AI社員</th>
                    <th className="text-left pb-3">カテゴリ</th>
                    <th className="text-right pb-3">1回あたり</th>
                    <th className="text-right pb-3">実行回数</th>
                    <th className="text-right pb-3 font-bold">累計削減時間</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {topMenus.map(({ menuId, savedMinutes, menu }, i) => {
                    const char = charMap[menu.characterId];
                    const allTimeStat = stats.allTime.find((s) => s.menu_id === menuId);
                    const execCount = allTimeStat?.count ?? 0;
                    const catCfg = CATEGORY_CONFIG[menu.category as MenuCategory];
                    return (
                      <tr key={menuId} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 text-gray-300 font-bold">{i + 1}</td>
                        <td className="py-3 font-medium text-gray-800">
                          {menu.icon} {menu.title}
                        </td>
                        <td className="py-3">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${CHAR_BG[char?.id ?? ""] ?? "bg-gray-100"} ${CHAR_TEXT[char?.id ?? ""] ?? "text-gray-600"}`}>
                            {char?.emoji} {char?.name ?? menu.characterId}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${catCfg?.bg ?? "bg-gray-100"} ${catCfg?.color ?? "text-gray-600"}`}>
                            {menu.category}
                          </span>
                        </td>
                        <td className="py-3 text-right text-gray-500">{formatTime(menu.humanMinutes)}</td>
                        <td className="py-3 text-right text-gray-500">{execCount}回</td>
                        <td className="py-3 text-right font-black text-gray-800">{formatTime(savedMinutes)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* ── 月別実行回数トレンド ── */}
        <Section title="月別実行回数（直近6ヶ月）" subtitle="AI社員の活用頻度の推移">
          {stats.trend.every((t) => t.count === 0) ? (
            <EmptyState text="まだ実行データがありません" />
          ) : (
            <div className="flex items-end gap-3 h-40">
              {stats.trend.map((t) => {
                const pct = Math.round((t.count / maxTrend) * 100);
                return (
                  <div key={t.month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-bold text-gray-600">{t.count > 0 ? t.count : ""}</span>
                    <div className="w-full bg-gray-100 rounded-t-lg overflow-hidden" style={{ height: "100px" }}>
                      <div
                        className="w-full bg-blue-400 rounded-t-lg transition-all"
                        style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{t.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* ── 計算根拠の注記 ── */}
        <div className="text-xs text-gray-400 bg-white rounded-xl border border-gray-100 p-4">
          <p className="font-bold mb-1">削減時間の算出方法</p>
          <p>各メニューに設定された「人間が同じ作業を行った場合の目安時間」× 実行回数で算出しています。</p>
          <p className="mt-1">目安時間はメニューごとに設定（例：提案書=120分、契約書=180分）。実際の削減時間は個人差があります。</p>
        </div>
      </main>
    </div>
  );
}

// ── UI コンポーネント ────────────────────────────────────────

function KpiCard({
  label, value, sub, accent,
}: {
  label: string; value: string; sub: string; accent: "blue" | "green" | "purple" | "orange";
}) {
  const colors = {
    blue:   "from-blue-500 to-blue-600",
    green:  "from-green-500 to-green-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600",
  };
  return (
    <div className={`bg-gradient-to-br ${colors[accent]} rounded-2xl p-5 text-white`}>
      <p className="text-xs font-medium opacity-80 mb-2">{label}</p>
      <p className="text-2xl font-black leading-tight">{value}</p>
      <p className="text-xs opacity-70 mt-1">{sub}</p>
    </div>
  );
}

function Section({ title, subtitle, children }: {
  title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="mb-5">
        <h2 className="font-black text-gray-800 text-lg">{title}</h2>
        <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-10">
      <p className="text-4xl mb-2">📊</p>
      <p className="text-gray-400 text-sm">{text}</p>
      <p className="text-gray-300 text-xs mt-1">AIメニューを使うとデータが蓄積されます</p>
    </div>
  );
}
