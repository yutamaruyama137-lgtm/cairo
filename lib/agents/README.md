# lib/agents/ — AI社員エージェント定義

## 役割

各AI社員（ジン・アイ・リン・ヴィ・イオリ・サキ）のエージェント設定を管理するディレクトリ。

## 現在の状態

**Phase 3実装待ち。** 現在はスタブ（骨格のみ）。

実際のデータは `data/characters.ts` に入っているが、
Phase 3でTool Useを追加するタイミングでここに移行する。

## 設計方針

各エージェントファイルは以下を export する：

```typescript
export const JinAgent = {
  id: "jin",
  name: "ジン",
  department: "営業部",
  // Supabase移行後はDBから取得するが、型はここで定義
  getSystemPrompt: (tenantConfig?: TenantConfig) => string,
  tools: ToolDefinition[],  // Phase 3: Tool Useで使うツール群
}
```

## Phase 3実装時にやること

1. `base.ts` の `AgentDefinition` 型に従って各エージェントファイルを実装
2. `lib/orchestrator.ts` からこのディレクトリのエージェントを呼び出す
3. 各エージェントに `tools` を定義（`lib/tools/` のツールを使う）
4. Supabase移行後は `getSystemPrompt()` の中で `lib/db/tenants.ts` を参照する

## ファイル一覧

| ファイル | 状態 | 担当AI社員 |
|---|---|---|
| base.ts | 🔜 TODO | ベース型定義 |
| jin.ts | 🔜 TODO | 営業部・ジン |
| ai.ts | 🔜 TODO | 経理部・アイ |
| rin.ts | 🔜 TODO | 法務部・リン |
| vi.ts | 🔜 TODO | 技術部・ヴィ |
| iori.ts | 🔜 TODO | マーケ部・イオリ |
| saki.ts | 🔜 TODO | 総務部・サキ |
