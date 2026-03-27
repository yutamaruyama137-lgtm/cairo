import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JARVIS BOT — AI社員サービス by REQS Lab",
  description: "仕事メニューから選ぶだけ。あなたの会社に、今日からAI社員を。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen" style={{ backgroundColor: "#FFFDF7" }}>
        {children}
      </body>
    </html>
  );
}
