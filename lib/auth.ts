import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { supabaseAdmin } from "@/lib/supabase";

// Phase 2デフォルトテナント（DATABASE_SCHEMA.md の初期Seedに対応）
export const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;

      try {
        await supabaseAdmin.from("users").upsert(
          {
            email: user.email,
            name: user.name ?? null,
            tenant_id: DEFAULT_TENANT_ID,
            auth_provider: account?.provider ?? "google",
            auth_provider_id: account?.providerAccountId ?? null,
            last_login_at: new Date().toISOString(),
          },
          { onConflict: "tenant_id,email" }
        );
      } catch (error) {
        console.warn("[auth] Supabase upsert skipped:", error);
      }

      return true;
    },
    async jwt({ token, user, account }) {
      // 初回サインイン時にSupabaseのユーザーIDをトークンに保存
      if (account && user?.email) {
        try {
          const { data } = await supabaseAdmin
            .from("users")
            .select("id")
            .eq("email", user.email)
            .eq("tenant_id", DEFAULT_TENANT_ID)
            .single();
          if (data) token.userId = data.id;
        } catch {
          // DB未セットアップ時はスキップ
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) session.user.id = token.userId;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
