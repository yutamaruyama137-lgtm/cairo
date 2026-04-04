"use client";

/**
 * app/admin/members/page.tsx
 *
 * メンバー管理ページ（管理者のみ）。
 * - 参加済みメンバーの一覧・削除
 * - メールアドレスで招待（招待済みのメールでログインすると自動参加）
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import BackButton from "@/components/BackButton";

interface Member {
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "member";
  last_login_at: string | null;
}

interface Invite {
  id: string;
  email: string;
  role: "admin" | "member";
  created_at: string;
}

export default function MembersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviting, setInviting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchMembers = useCallback(async () => {
    const res = await fetch("/api/admin/members");
    if (res.ok) {
      const data = await res.json();
      setMembers(data.members ?? []);
      setInvites(data.invites ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // 管理者以外はリダイレクト
  useEffect(() => {
    if (session && session.user.role !== "admin") router.replace("/");
  }, [session, router]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    const res = await fetch("/api/admin/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast("success", `${inviteEmail} を招待しました`);
      setInviteEmail("");
      await fetchMembers();
    } else {
      showToast("error", data.error ?? "招待に失敗しました");
    }
    setInviting(false);
  };

  const handleDelete = async (type: "invite" | "member", id: string, label: string) => {
    if (!confirm(`「${label}」を${type === "invite" ? "招待取消" : "削除"}しますか？`)) return;
    const res = await fetch("/api/admin/members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast("success", data.message);
      await fetchMembers();
    } else {
      showToast("error", data.error ?? "操作に失敗しました");
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("ja-JP", { month: "2-digit", day: "2-digit", year: "numeric" });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton />
            <span className="text-gray-300">/</span>
            <span className="font-black text-gray-800">メンバー管理</span>
          </div>
          <span className="text-xs bg-orange-100 text-orange-600 font-bold px-2 py-1 rounded-full">
            管理者のみ
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* トースト */}
        {toast && (
          <div className={`px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
            toast.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}>
            {toast.type === "success" ? "✅" : "❌"} {toast.message}
          </div>
        )}

        {/* 招待フォーム */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-black text-gray-800 text-lg mb-1">メンバーを招待</h2>
          <p className="text-sm text-gray-400 mb-5">
            招待したいメールアドレスを登録してください。そのメールでログインすると自動的にこのテナントに参加します。
          </p>
          <form onSubmit={handleInvite} className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-bold text-gray-500 mb-1 block">メールアドレス</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="example@company.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">ロール</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "admin" | "member")}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 bg-white"
              >
                <option value="member">メンバー</option>
                <option value="admin">管理者</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={inviting || !inviteEmail.trim()}
              className="bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              {inviting ? "招待中..." : "招待する"}
            </button>
          </form>
        </div>

        {/* 招待中リスト */}
        {invites.length > 0 && (
          <div className="bg-white rounded-2xl border border-yellow-200 p-6">
            <h2 className="font-black text-gray-800 mb-4">
              招待中（承認待ち）
              <span className="ml-2 text-sm font-normal text-gray-400">{invites.length} 件</span>
            </h2>
            <div className="divide-y divide-gray-50">
              {invites.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-3 group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-sm">
                      ✉️
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{inv.email}</p>
                      <p className="text-xs text-gray-400">招待日: {formatDate(inv.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <RoleBadge role={inv.role} />
                    <button
                      onClick={() => handleDelete("invite", inv.id, inv.email)}
                      className="opacity-0 group-hover:opacity-100 text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-all"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 参加済みメンバー */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-black text-gray-800 text-lg mb-4">
            参加中のメンバー
            <span className="ml-2 text-sm font-normal text-gray-400">{members.length} 名</span>
          </h2>
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">読み込み中...</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">メンバーがいません</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {members.map((member) => {
                const isMe = member.id === session?.user?.id;
                return (
                  <div key={member.id} className="flex items-center justify-between py-3 group">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-base font-bold text-gray-500">
                        {(member.name ?? member.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">
                          {member.name ?? "(名前なし)"}
                          {isMe && <span className="ml-1.5 text-xs text-blue-500 font-normal">あなた</span>}
                        </p>
                        <p className="text-xs text-gray-400">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-gray-300 hidden group-hover:block">
                        最終ログイン: {formatDate(member.last_login_at)}
                      </p>
                      <RoleBadge role={member.role} />
                      {!isMe && (
                        <button
                          onClick={() => handleDelete("member", member.id, member.email)}
                          className="opacity-0 group-hover:opacity-100 text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-all"
                        >
                          削除
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function RoleBadge({ role }: { role: "admin" | "member" }) {
  return (
    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
      role === "admin"
        ? "bg-orange-100 text-orange-600"
        : "bg-gray-100 text-gray-500"
    }`}>
      {role === "admin" ? "管理者" : "メンバー"}
    </span>
  );
}
