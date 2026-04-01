# lib/db/ — データアクセス抽象化レイヤー

## 役割

データの取得・保存を抽象化する。
呼び出し側（app/api/, lib/agents/ など）はここを通してデータを取得する。
実装の中身が「静的ファイル」から「Supabase」に変わっても、呼び出し側のコードは変えなくていい。

## 設計方針

```
Phase 1（現在）: data/characters.ts, data/menus.ts から取得
Phase 2以降:     Supabase から取得

呼び出し側はずっと同じ:
  import { getTenantConfig } from "@/lib/db/tenants"
  const config = await getTenantConfig("shibuya")
```

## ファイル一覧

| ファイル | 役割 |
|---|---|
| index.ts | エントリーポイント。全DB操作をまとめてexport |
| tenants.ts | テナント（会社）情報の取得・更新 |
| menus.ts | メニュー定義の取得 |
| tasks.ts | タスクの作成・状態更新・ログ保存 |

## Phase 2実装時にやること

1. Supabase クライアントを `lib/db/client.ts` に作成
2. 各ファイルの実装を `data/` からの取得から Supabase クエリに切り替える
3. 既存の `data/characters.ts` と `data/menus.ts` はSupabaseへの移行後に削除

## 重要：現在の状態

**現在はスタブ（骨格のみ）。**
実際のデータは引き続き `data/characters.ts` と `data/menus.ts` から取得している。
Phase 2で Supabase に移行する。
