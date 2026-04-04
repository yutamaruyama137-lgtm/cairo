"use client";

import { useRouter } from "next/navigation";

interface BackButtonProps {
  label?: string;
}

export default function BackButton({ label = "← 戻る" }: BackButtonProps) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
    >
      {label}
    </button>
  );
}
