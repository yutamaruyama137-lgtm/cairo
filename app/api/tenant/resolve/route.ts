import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// middlewareからのみ呼ばれる内部APIエンドポイント
export async function GET(req: NextRequest) {
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
