import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { supabaseAdmin } from "@/lib/supabase";

// フォールバック用（未オンボーディングユーザーのみ）
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
        // 1. 招待メールに該当するか確認
        const { data: invite } = await supabaseAdmin
          .from("tenant_invites")
          .select("tenant_id, role")
          .eq("email", user.email)
          .is("accepted_at", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        // 2. 既存ユーザーを確認
        const { data: existingUser } = await supabaseAdmin
          .from("users")
          .select("id, tenant_id, role")
          .eq("email", user.email)
          .maybeSingle();

        if (existingUser) {
          // 招待があり、まだテナント未設定またはデフォルトテナントなら招待のテナントに移す
          if (invite && (!existingUser.tenant_id || existingUser.tenant_id === DEFAULT_TENANT_ID)) {
            await supabaseAdmin
              .from("users")
              .update({
                tenant_id: invite.tenant_id,
                role: invite.role,
                last_login_at: new Date().toISOString(),
              })
              .eq("id", existingUser.id);

            // 招待を承認済みにする
            await supabaseAdmin
              .from("tenant_invites")
              .update({ accepted_at: new Date().toISOString() })
              .eq("tenant_id", invite.tenant_id)
              .eq("email", user.email);
          } else {
            await supabaseAdmin
              .from("users")
              .update({ last_login_at: new Date().toISOString() })
              .eq("id", existingUser.id);
          }
        } else {
          // 新規ユーザー: 招待があればそのテナントに、なければテナントなし（onboarding へ）
          await supabaseAdmin.from("users").insert({
            email: user.email,
            name: user.name ?? null,
            tenant_id: invite?.tenant_id ?? null,
            role: invite?.role ?? "admin", // 招待なし＝自分で会社を作る管理者候補
            auth_provider: account?.provider ?? "google",
            auth_provider_id: account?.providerAccountId ?? null,
            last_login_at: new Date().toISOString(),
          });

          // 招待がある場合は承認済みにする
          if (invite) {
            await supabaseAdmin
              .from("tenant_invites")
              .update({ accepted_at: new Date().toISOString() })
              .eq("tenant_id", invite.tenant_id)
              .eq("email", user.email);
          }
        }
      } catch (error) {
        console.warn("[auth] signIn error:", error);
      }

      return true;
    },

    async jwt({ token, user, account, trigger }) {
      // 初回サインイン時
      if (account && user?.email) {
        try {
          const { data } = await supabaseAdmin
            .from("users")
            .select("id, tenant_id, role")
            .eq("email", user.email)
            .maybeSingle();

          token.userId = data?.id ?? undefined;
          token.tenantId = data?.tenant_id ?? null;
          token.role = data?.role ?? "member";
        } catch {
          token.tenantId = null;
        }
      }

      // update() が呼ばれたとき（オンボーディング完了後など）はDBから再取得
      if (trigger === "update" && token.userId) {
        try {
          const { data } = await supabaseAdmin
            .from("users")
            .select("tenant_id, role")
            .eq("id", token.userId as string)
            .maybeSingle();

          token.tenantId = data?.tenant_id ?? null;
          token.role = data?.role ?? "member";
        } catch {
          // 再取得失敗時は現在の値を維持
        }
      }

      // 古いトークン（tenantId フィールドなし）の対応
      if (token.userId && token.tenantId === undefined) {
        try {
          const { data } = await supabaseAdmin
            .from("users")
            .select("tenant_id, role")
            .eq("id", token.userId as string)
            .maybeSingle();

          token.tenantId = data?.tenant_id ?? null;
          token.role = data?.role ?? "member";
        } catch {
          token.tenantId = null;
        }
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = token.userId ?? "";
      session.user.tenantId = token.tenantId ?? null;
      session.user.role = token.role ?? "member";
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
