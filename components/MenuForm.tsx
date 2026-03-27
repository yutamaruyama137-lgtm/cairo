"use client";

import { useState } from "react";
import { MenuItem, AICharacter, MenuInput } from "@/types";
import { cn } from "@/lib/cn";

interface MenuFormProps {
  menu: MenuItem;
  character: AICharacter;
  onSubmit: (inputs: Record<string, string>) => void;
  isLoading: boolean;
}

interface FieldProps {
  input: MenuInput;
  value: string;
  onChange: (value: string) => void;
  character: AICharacter;
}

function FormField({ input, value, onChange, character }: FieldProps) {
  const baseClass = `w-full text-base border-2 rounded-xl px-4 py-3 transition-colors focus:outline-none focus:ring-0`;
  const normalBorder = "border-gray-200";
  const focusBorder = `focus:${character.borderColor}`;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-gray-700">
        {input.label}
        {input.required && (
          <span className={`ml-1 text-xs ${character.textColor} font-normal`}>（必須）</span>
        )}
      </label>

      {input.type === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={input.placeholder}
          required={input.required}
          rows={4}
          className={cn(baseClass, normalBorder, focusBorder, "resize-none leading-relaxed")}
        />
      ) : input.type === "select" && input.options ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={input.required}
          className={cn(baseClass, normalBorder, focusBorder, "bg-white cursor-pointer")}
        >
          <option value="">選んでください</option>
          {input.options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={input.placeholder}
          required={input.required}
          className={cn(baseClass, normalBorder, focusBorder)}
        />
      )}

      {input.helpText && (
        <p className="text-xs text-gray-400">{input.helpText}</p>
      )}
    </div>
  );
}

export default function MenuForm({ menu, character, onSubmit, isLoading }: MenuFormProps) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(menu.inputs.map((i) => [i.key, ""]))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  const allRequiredFilled = menu.inputs
    .filter((i) => i.required)
    .every((i) => values[i.key]?.trim());

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {menu.inputs.map((input) => (
        <FormField
          key={input.key}
          input={input}
          value={values[input.key] || ""}
          onChange={(val) => setValues((prev) => ({ ...prev, [input.key]: val }))}
          character={character}
        />
      ))}

      <button
        type="submit"
        disabled={!allRequiredFilled || isLoading}
        className={cn(
          "w-full py-4 px-6 rounded-2xl text-lg font-black text-white transition-all duration-200",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          character.color,
          !isLoading && allRequiredFilled && "hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
        )}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            {character.name}が考えています...
          </span>
        ) : (
          `${character.name}に頼む ✨`
        )}
      </button>
    </form>
  );
}
