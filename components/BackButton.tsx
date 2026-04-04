"use client";

import Link from "next/link";

interface BackButtonProps {
  href: string;   // 明示的な遷移先（router.back() は使わない）
  label?: string;
}

export default function BackButton({ href, label = "← 戻る" }: BackButtonProps) {
  return (
    <Link
      href={href}
      className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
    >
      {label}
    </Link>
  );
}
