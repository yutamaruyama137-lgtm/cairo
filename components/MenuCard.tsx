"use client";

import Link from "next/link";
import { MenuItem, AICharacter } from "@/types";

interface MenuCardProps {
  menu: MenuItem;
  character: AICharacter;
}

function formatSeconds(seconds: number): string {
  if (seconds < 60) return `約${seconds}秒`;
  return `約${Math.round(seconds / 60)}分`;
}

export default function MenuCard({ menu, character }: MenuCardProps) {
  return (
    <Link href={`/${character.id}/${menu.id}`} className="block group">
      <div className={`bg-white rounded-2xl border-2 ${character.borderColor} p-5 hover:${character.lightColor} transition-all duration-200 cursor-pointer`}>
        <div className="flex items-start gap-4">
          <div className={`${character.lightColor} w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0`}>
            {menu.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-bold text-gray-800 leading-tight">{menu.title}</h3>
              <span className={`text-xs ${character.textColor} ${character.lightColor} px-2 py-0.5 rounded-full flex-shrink-0 font-medium`}>
                {formatSeconds(menu.estimatedSeconds)}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{menu.description}</p>
          </div>
        </div>
        <div className={`mt-3 text-right text-sm font-bold ${character.textColor} opacity-0 group-hover:opacity-100 transition-opacity`}>
          このメニューを使う →
        </div>
      </div>
    </Link>
  );
}
