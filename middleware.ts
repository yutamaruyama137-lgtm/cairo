import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

function extractSubdomain(hostname: string): string | null {
  if (hostname.startsWith("localhost") || /^\d+\.\d+\.\d+\.\d+/.test(hostname)) return null;
  const parts = hostname.split(".");
  if (parts.length <= 2) return null;
  return parts[0];
}

export default withAuth(
  async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const token = (req as NextRequest & { nextauth?: { token?: { tenantId?: string | null; userId?: string } } }).nextauth?.token;

    // テナントなし（未オンボーディング）→ /onboarding へリダイレクト
    // オンボーディングページ自体はスキップ
    if (pathname !== "/onboarding" && token?.userId && token?.tenantId === null) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    // テナントID の決定（優先順: サブドメイン > セッション > デフォルト）
    const hostname = req.headers.get("host") ?? "localhost";
    const subdomain = extractSubdomain(hostname);
    const tenantParam = req.nextUrl.searchParams.get("tenant");
    const resolvedSubdomain = tenantParam ?? subdomain;

    let tenantId = (token?.tenantId as string | null) ?? DEFAULT_TENANT_ID;

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
        // 解決失敗時はセッションのテナントを使用
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

export const config = {
  matcher: ["/((?!login|api/auth|api/tenant|_next|public).*)"],
};
