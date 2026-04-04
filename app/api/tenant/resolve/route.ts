import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

// middlewareからのみ呼ばれる内部APIエンドポイント
export async function GET(req: NextRequest) {
  // 内部シークレットで外部からの直接アクセスを防ぐ
  if (INTERNAL_SECRET) {
    const authHeader = req.headers.get("x-internal-secret");
    if (authHeader !== INTERNAL_SECRET) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const subdomain = req.nextUrl.searchParams.get("subdomain");
  if (!subdomain) {
    return NextResponse.json({ tenantId: null }, { status: 400 });
  }

  const { data } = await supabaseAdmin
    .from("tenants")
    .select("id")
    .eq("subdomain", subdomain)
    .eq("is_active", true)
    .single();

  return NextResponse.json({ tenantId: data?.id ?? null });
}
