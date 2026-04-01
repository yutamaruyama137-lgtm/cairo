# lib/workflows/ — ワークフローエンジン

## 役割

会社ごとに異なる業務フロー（経費精算・提案書作成など）を
JSONで定義し、複数AI社員を順番に（または並列に）実行するエンジン。

## 現在の状態

**Phase 3実装待ち。型定義のみ。**

## ワークフローとは

```json
{
  "tenantId": "shibuya",
  "workflowId": "expense-approval",
  "name": "経費精算フロー",
  "steps": [
    { "step": 1, "agent": "saki", "action": "validate_expense",
      "nextIf": { "amount >= 50000": "step3", "default": "step2" } },
    { "step": 2, "id": "step2", "agent": "ai", "action": "generate_journal" },
    { "step": 3, "id": "step3", "agent": "jin", "action": "draft_approval" }
  ]
}
```

このJSONを `engine.ts` が読んで、各ステップのAI社員を順番に呼び出す。

## Phase 3実装時にやること

1. `types.ts` の型定義に従ってワークフローJSONを設計
2. `engine.ts` でステップを順番に実行するロジックを実装
3. 各ステップの出力を次のステップのコンテキストとして引き渡す
4. ステップ間の条件分岐（nextIf）を実装
5. 並列実行（parallel: true）のステップに対応
6. 進捗を Supabase tasks テーブルに保存

## 設定の保存場所

Phase 1: `config/tenants/` の JSON ファイルに書く
Phase 2以降: Supabase の `workflows` テーブルに保存
