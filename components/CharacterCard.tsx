"use client";

import Link from "next/link";
import { AICharacter } from "@/types";
import CharacterAvatar from "@/components/CharacterAvatar";

interface CharacterCardProps {
  character: AICharacter;
  menuCount?: number;
  isSelected?: boolean;
}

export default function CharacterCard({
  character,
  menuCount = 4,
  isSelected = false,
}: CharacterCardProps) {
  return (
    <Link href={`/${character.id}`} className="block group">
      <div
        className={`
          flex flex-col items-center p-4 rounded-2xl cursor-pointer transition-all duration-200
          ${isSelected
            ? `${character.lightColor} ${character.borderColor} border-2`
            : "hover:bg-gray-50 border-2 border-transparent"
          }
        `}
      >
        {/* SVGアバター */}
        <div className="relative mb-3">
          <div className="shadow-md group-hover:shadow-lg transition-shadow duration-200 rounded-full">
            <CharacterAvatar
              characterId={character.id}
              name={character.name}
              size={80}
            />
          </div>
        </div>

        {/* 名前 */}
        <div className="text-center">
          <div className="text-base font-black text-gray-800">{character.name}</div>
          <div className={`text-xs font-bold ${character.textColor} mt-0.5`}>
            {character.department}
          </div>
          <div className="text-xs text-gray-400 mt-1">{menuCount}メニュー</div>
        </div>
      </div>
    </Link>
  );
}
