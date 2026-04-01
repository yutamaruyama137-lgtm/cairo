# CAIRO — 開発ロードマップ

**最終更新:** 2026-04-01

---

## 全体進捗

```
Phase 1  ✅ 完了     MVP — 6体AI社員・24メニュー・Vercel本番稼働
Phase 2  🔜 進行中   認証・DB基盤 — Supabase + Google認証 + マルチテナント
Phase 3  🔮 予定     Agentic化 — Tool Use + マルチエージェント
Phase 4  🔮 予定     外部連携・拡張 — Slack / LINE / 管理コンソール
```

---

## Phase 1 — MVP ✅ 完了

**目標:** AIを使ったことがない人でも使えるプロトタイプ

### 実装済み機能

- [x] 6体のAI社員キャラクター（JARVIS）
- [x] 24種類の仕事メニュー
- [x] チャット形式UI（メニュー選択 → フォーム入力 → 結果表示）
- [x] Claude APIストリーミング出力（SSE）
- [x] HTMLプレビュー機能（iframe srcDoc）
- [x] Vercel本番デプロイ（https://cairo.vercel.app/）
- [x] アバター画像（SVG）
- [x] モックレスポンス（APIキー未設定時）

---

## Phase 2 — 認証・DB基盤 🔜 最優先

**目標:** マルチテナント対応・ユーザー管理・実行履歴の記録

**担当:** 小川（開発）

### タスク一覧

#### 2-1. Supabase セットアップ

- [ ] Supabase プロジェクト作成
- [ ] 環境変数設定（`.env.local` に追加）
- [ ] DBスキーマ作成（[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) 参照）
  - [ ] `tenants` テーブル
  - [ ] `users` テーブル
  - [ ] `menu_executions` テーブル
  - [ ] `api_usage_logs` テーブル
- [ ] RLSポリシー設定（テナント間データ分離）
- [ ] `lib/db/` の TODO を実装に切り替える

#### 2-2. 認証（NextAuth.js v5）

- [ ] `npm install next-auth@beta` インストール
- [ ] `lib/auth.ts` 作成（Auth.js設定）
- [ ] `app/api/auth/[...nextauth]/route.ts` 作成
- [ ] Google OAuth アプリ設定（Google Cloud Console）
- [ ] `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` 環境変数設定
- [ ] ログインページ（`app/login/page.tsx`）
- [ ] `middleware.ts` で認証ガード実装
- [ ] ヘッダーにログイン状態表示

#### 2-3. マルチテナント対応

- [ ] `middleware.ts` でサブドメイン → tenantId変換
- [ ] `lib/db/tenants.ts` のSupabase移行実装
- [ ] Vercelでサブドメインワイルドカード設定（`*.cairo-ai.com`）
- [ ] テナント別カスタマイズUI（管理画面）

#### 2-4. 実行履歴

- [ ] `/api/execute` 実行時に `menu_executions` に保存
- [ ] マイページ（`app/dashboard/page.tsx`）
- [ ] 実行履歴一覧表示
- [ ] 過去の出力を再表示する機能

#### 2-5. 料金プラン制限

- [ ] `tenant_settings` にプラン情報を保存
- [ ] 月間実行回数のカウント実装
- [ ] 上限に達したときのエラーUI

---

## Phase 3 — Agentic化 🔮

**目標:** AI社員が自律的にツールを使い、複数エージェントが連携して複雑な仕事をこなす

**担当:** 斎藤（AI・エージェント開発）

### タスク一覧

#### 3-1. Tool Use 実装

- [ ] `lib/tools/knowledge.ts` — RAG検索ツール
  - Supabase pgvector でテナントの知識ベースを検索
- [ ] `lib/tools/company.ts` — 会社情報取得ツール
  - テナント固有の情報をプロンプトに注入
- [ ] `lib/tools/output.ts` — 結果保存ツール
  - Supabase に中間出力を保存（マルチエージェント連携用）
- [ ] `lib/tools/web_search.ts` — Web検索ツール（任意）

#### 3-2. 各エージェント実装

- [ ] `lib/agents/jin.ts` — 営業部エージェント（Tool Use対応）
- [ ] `lib/agents/ai.ts` — 経理部エージェント
- [ ] `lib/agents/rin.ts` — 法務部エージェント
- [ ] `lib/agents/vi.ts` — 技術部エージェント
- [ ] `lib/agents/iori.ts` — マーケ部エージェント
- [ ] `lib/agents/saki.ts` — 総務部エージェント

#### 3-3. Orchestrator 実装

- [ ] `lib/orchestrator.ts` — Director Agent本実装
  - ユーザーの依頼を解析して適切なエージェントに委託
  - 複数エージェントの並列・直列実行
  - Supabase にタスクログを保存
- [ ] `lib/workflows/engine.ts` — ワークフロー実行エンジン
  - `config/tenants/*.json` のワークフロー定義を実行
  - 条件分岐（`nextIf`）対応
- [ ] `app/api/agent/run/route.ts` — Agentic APIの本実装

#### 3-4. ナレッジベース

- [ ] テナントごとのドキュメントアップロード機能
- [ ] Supabase pgvector でベクトル検索
- [ ] ナレッジベースをAI社員が参照してより精度の高い回答を生成

---

## Phase 4 — 外部連携・拡張 🔮

**目標:** 他のツールとシームレスに連携し、より多くの企業に使ってもらえる製品にする

### 4-1. Slack連携

- [ ] Slack Bot 作成（`@CAIRO` メンション）
- [ ] Slack からメニュー実行
- [ ] 実行結果を Slack スレッドに返信

### 4-2. LINE WORKS連携

- [ ] LINE WORKS Bot 登録
- [ ] トーク画面からメニュー実行

### 4-3. X（Twitter）API連携

- [ ] `iori-sns` メニューの出力を X に直接投稿するボタン
- [ ] X API v2 OAuth 2.0 PKCE 実装

### 4-4. Canva API連携

- [ ] `iori-banner` メニューの指示書から Canva デザインを自動生成

### 4-5. 管理コンソール

- [ ] テナント管理画面（`app/admin/`）
  - ユーザー追加・削除
  - メニューのON/OFF
  - AI社員の名前・ペルソナカスタマイズ
- [ ] 利用状況ダッシュボード
  - 月間実行回数
  - 節約時間の推定
  - コスト分析

### 4-6. ノーコードメニュービルダー

- [ ] テナント独自のメニューを管理画面から作成
- [ ] プロンプトテンプレートの視覚的エディタ
- [ ] 入力フィールドのドラッグ&ドロップ設定

---

## 長期ビジョン

### CAIRO v2.0 イメージ

```
従来（Phase 1-2）:
  ユーザー → メニュー選択 → フォーム入力 → 1回のAI実行 → 結果表示

Agentic（Phase 3〜）:
  ユーザー → 「〇〇の件、対応して」と指示
    → AI社員が自律的に調査・考慮・作成
    → 複数AI社員が連携（例：営業が提案書作成 → 法務がリスクチェック → 経理が費用計算）
    → まとめてユーザーに報告
```

### 市場展開

| 時期 | マイルストーン |
|---|---|
| 2026 Q2 | Phase 2完了・βテスト開始（渋谷共栄会・藤沢市商店街） |
| 2026 Q3 | 正式リリース・料金プラン開始 |
| 2026 Q4 | Phase 3（Agentic化）完了 |
| 2027 Q1 | Slack/LINE連携・API提供開始 |
| 2027 Q2 | 管理コンソール・ノーコードビルダー |

---

*最終更新: 2026-04-01*
