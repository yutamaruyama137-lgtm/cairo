import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

/**
 * ホスト名からサブドメインを抽出する。
 * 例: shibuya.cairo-ai.com → "shibuya"
 * 例: localhost → null（デフォルトテナント使用）
 */
function extractSubdomain(hostname: string): string | null {
  // localhost・IPアドレスはデフォルトテナント
  if (hostname.startsWith("localhost") || /^\d+\.\d+\.\d+\.\d+/.test(hostname)) {
    return null;
  }
  const parts = hostname.split(".");
  // example.com（2セグメント）はデフォルト、sub.example.com（3+）はサブドメイン
  if (parts.length <= 2) return null;
  return parts[0];
}

export default withAuth(
  async function middleware(req: NextRequest) {
    const hostname = req.headers.get("host") ?? "localhost";
    const subdomain = extractSubdomain(hostname);

    // ローカル開発: ?tenant=shibuya でテナント切り替え可能
    const tenantParam = req.nextUrl.searchParams.get("tenant");
    const resolvedSubdomain = tenantParam ?? subdomain;

    let tenantId = DEFAULT_TENANT_ID;

    // サブドメインがある場合はSupabaseで解決
    if (resolvedSubdomain) {
      try {
        const internalSecret = process.env.INTERNAL_API_SECRET ?? "";
        const res = await fetch(
          `${req.nextUrl.origin}/api/tenant/resolve?subdomain=${resolvedSubdomain}`,
          { headers: { "x-internal-secret": internalSecret } }
        );
        if (res.ok) {
          const json = await res.json();
          if (json.tenantId) tenantId = json.tenantId;
        }
      } catch {
        // 解決失敗時はデフォルトテナント
      }
    }

    const response = NextResponse.next();
    response.headers.set("x-tenant-id", tenantId);
    return response;
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

// login・api/auth・_next・public以外の全ルートを保護する
export const config = {
  matcher: ["/((?!login|api/auth|api/tenant|_next|public).*)"],
};
