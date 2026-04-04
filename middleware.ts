export { default } from "next-auth/middleware";

// login・api/auth・_next・public以外の全ルートを保護する
export const config = {
  matcher: ["/((?!login|api/auth|_next|public).*)"],
};
