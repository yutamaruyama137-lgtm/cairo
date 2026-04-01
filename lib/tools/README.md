# lib/tools/ — Claude Tool Use 定義

## 役割

Claude API の Tool Use（関数呼び出し）で使うツールを定義するディレクトリ。
ここでツールを定義することで、AI社員が「調べる・書く・保存する」などの行動を取れるようになる。

## 現在の状態

**Phase 3実装待ち。スタブのみ。**

## ツール設計方針

```
knowledge.ts  → Supabase pgvectorでナレッジ検索（RAG）
company.ts    → テナント設定・会社情報の取得
output.ts     → 生成物の保存・次のエージェントへの受け渡し
```

## Phase 3実装時にやること

各ツールは以下の形式で定義する：

```typescript
// ツール定義（Claude APIに渡すスキーマ）
export const searchKnowledgeTool = {
  name: "search_knowledge",
  description: "会社のナレッジベースから関連情報を検索する",
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "検索クエリ" },
      tenant_id: { type: "string", description: "テナントID" },
    },
    required: ["query", "tenant_id"],
  },
};

// ツール実行関数（Claude がツールを呼んだ時に実行される）
export async function executeSearchKnowledge(input: {
  query: string;
  tenant_id: string;
}): Promise<string> {
  // Supabase pgvector でベクトル検索
  // ...
  return "検索結果テキスト";
}
```

## Agenticループの中でのツール実行フロー

```
1. Claude が tool_use レスポンスを返す
2. app/api/agent/run/route.ts がツール名を見る
3. ここの executeXxx() 関数を呼ぶ
4. 結果を tool_result として Claude に返す
5. Claude が次の行動を決める
```
