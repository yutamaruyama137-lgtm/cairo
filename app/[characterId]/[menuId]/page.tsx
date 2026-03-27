"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import MenuForm from "@/components/MenuForm";
import ResultDisplay from "@/components/ResultDisplay";
import { getCharacter } from "@/data/characters";
import { getMenu } from "@/data/menus";

interface Props {
  params: { characterId: string; menuId: string };
}

export default function MenuExecutePage({ params }: Props) {
  const character = getCharacter(params.characterId);
  const menu = getMenu(params.menuId);

  if (!character || !menu || menu.characterId !== character.id) {
    notFound();
  }

  const [isLoading, setIsLoading] = useState(false);
  const [output, setOutput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (inputs: Record<string, string>) => {
    setIsLoading(true);
    setOutput("");
    setError("");
    setIsDone(false);
    setIsStreaming(true);

    try {
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuId: menu.id, inputs }),
      });

      if (!response.ok) throw new Error("実行に失敗しました");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("ストリームの読み取りに失敗しました");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        setOutput((prev) => prev + text);
      }

      setIsDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleReset = () => {
    setOutput("");
    setIsDone(false);
    setError("");
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFFDF7" }}>
      <Header
        title={menu.title}
        backHref={`/${character.id}`}
      />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* メニューヘッダー */}
        <div className="bg-white rounded-2xl shadow-soft p-5 mb-6">
          <div className="flex items-center gap-3">
            <div className={`${character.lightColor} w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0`}>
              {menu.icon}
            </div>
            <div>
              <div className="text-lg font-black text-gray-800">{menu.title}</div>
              <div className="text-sm text-gray-500 mt-0.5">{menu.description}</div>
            </div>
          </div>

          <div className={`mt-4 flex items-center gap-2 text-xs ${character.textColor} ${character.lightColor} px-3 py-2 rounded-xl w-fit`}>
            <span>⏱</span>
            <span>
              {menu.estimatedSeconds < 60
                ? `約${menu.estimatedSeconds}秒で完成します`
                : `約${Math.round(menu.estimatedSeconds / 60)}分で完成します`}
            </span>
          </div>
        </div>

        {/* フォームまたは結果 */}
        {!isDone && !output ? (
          <div className="bg-white rounded-2xl shadow-soft p-6">
            <h2 className="text-base font-bold text-gray-700 mb-5">
              📝 情報を入力してください
            </h2>
            <MenuForm
              menu={menu}
              character={character}
              onSubmit={handleSubmit}
              isLoading={isLoading}
            />
          </div>
        ) : (
          <ResultDisplay
            output={output}
            character={character}
            outputLabel={menu.outputLabel}
            isStreaming={isStreaming}
            onReset={handleReset}
          />
        )}

        {/* エラー表示 */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600">
            ⚠️ {error}
            <button
              onClick={handleReset}
              className="ml-3 underline hover:no-underline"
            >
              もう一度試す
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
