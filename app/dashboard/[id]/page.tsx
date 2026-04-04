export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions, DEFAULT_TENANT_ID } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserByEmail } from "@/lib/db/users";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import ExecutionDetail from "./ExecutionDetail";

interface PageProps {
  params: { id: string };
}

export default async function ExecutionDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const dbUser = await getUserByEmail(session.user.email, DEFAULT_TENANT_ID);
  if (!dbUser) redirect("/login");

  const { data: execution } = await supabaseAdmin
    .from("menu_executions")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", dbUser.id)
    .single();

  if (!execution) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            ← 実行履歴に戻る
          </Link>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8">
        <ExecutionDetail execution={execution} />
      </main>
    </div>
  );
}
