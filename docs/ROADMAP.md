# CAIRO — 開発ロードマップ

**最終更新:** 2026-04-01

---

## 全体進捗

```
Phase 1  ✅ 完了     MVP — 6体AI社員・24メニュー・Vercel本番稼働
Phase 2  ✅ 完了     認証・DB基盤 — Supabase + Google認証 + マルチテナント + 管理画面
Phase 3  🔜 進行中   Agentic化 — Tool Use 本実装・Orchestrator稼働
Phase 4  🔮 予定     外部連携・拡張 — Slack / LINE / 管理コンソール拡張
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
- [x] Vercel本番デプロイ（https://cairo-zybd.vercel.app/）
- [x] アバター画像（SVG）
- [x] モックレスポンス（APIキー未設定時）

---

## Phase 2 — 認証・DB基盤 🔜 最優先

**目標:** マルチテナント対応・ユーザー管理・実行履歴の記録

**担当:** 小川（開発）

### タスク一覧

#### 2-1. Supabase セットアップ

- [x] Supabase プロジェクト作成
- [x] 環境変数設定（`.env.local` に追加）
- [x] DBスキーマ作成（[PHASE2_SETUP_GUIDE.md](PHASE2_SETUP_GUIDE.md) 参照）
  - [x] `tenants` テーブル
  - [x] `tenant_agents` テーブル（テナント別エージェント構成）
  - [x] `users` テーブル
  - [x] `menu_executions` テーブル
  - [x] `api_usage_logs` テーブル
- [x] RLSポリシー設定（テナント間データ分離）
- [x] `lib/db/` の TODO を実装に切り替える（tenant_agents 含む）

#### 2-2. 認証（NextAuth.js v5）

- [x] `npm install next-auth@beta` インストール（v4.24.13 既存）
- [x] `lib/auth.ts` 作成（Auth.js設定）
- [x] `app/api/auth/[...nextauth]/route.ts` 作成
- [x] Google OAuth アプリ設定（Google Cloud Console）
- [x] `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` 環境変数設定
- [x] `NEXTAUTH_SECRET` 生成・設定
- [x] ログインページ（`app/login/page.tsx`）
- [x] `middleware.ts` で認証ガード実装（全ルート保護）
- [x] ヘッダーにログイン状態表示（UserMenu コンポーネント）

#### 2-3. マルチテナント対応

- [x] `middleware.ts` でサブドメイン → tenantId変換（`?tenant=xxx` ローカル切り替え対応）
- [x] `lib/tenant-context.ts` 実装（テナントID解決・TTLキャッシュ）
- [x] `lib/db/tenant-agents.ts` 実装（テナント別AI社員取得）
- [ ] Vercelでサブドメインワイルドカード設定（`*.cairo-ai.com`）← 本番デプロイ時に設定

#### 2-4. 実行履歴

- [x] `/api/chat` 実行時に `menu_executions` に保存（チャット統合済み）
- [x] マイページ（`app/dashboard/page.tsx`）
- [x] 実行履歴一覧表示
- [x] 過去の出力を再表示する機能（`app/dashboard/[id]/page.tsx`）
- [x] コピー・.mdダウンロードボタン

#### 2-5. 料金プラン制限

- [x] `lib/rate-limit.ts` 実装（starter=100/standard=1000/enterprise=無制限）
- [x] 月間実行回数のカウント実装
- [x] 上限に達したときの429エラーレスポンス
- [x] ダッシュボードに今月の利用状況表示

#### 2-6. レスポンス品質改善（新）

- [x] `components/MarkdownRenderer.tsx` — シンタックスハイライト対応
- [x] コピー・.mdダウンロードボタン（ホバー時表示）
- [x] 出力フォーマット選択（markdown/箇条書き/表形式/plain）

#### 2-7. テナント管理画面（新）

- [x] `app/admin/page.tsx` 全面刷新（Supabaseベース）
- [x] AI社員ON/OFF・カスタム名・プロンプト・出力フォーマットをGUIで設定
- [x] `lib/db/admin.ts` + `/api/admin/agent` PATCH エンドポイント

---

## Phase 3 — Agentic化 🔮

**目標:** AI社員が自律的にツールを使い、複数エージェントが連携して複雑な仕事をこなす

**担当:** 斎藤（AI・エージェント開発）

### タスク一覧

#### 3-1. Tool Use 実装

- [x] `lib/tools/index.ts` — get_company_info・search_knowledge・save_output 実装
- [x] get_company_info — Supabaseから会社設定をリアルタイム取得
- [x] search_knowledge — 過去の実行履歴からテキスト検索（pgvector移行予定）
- [ ] pgvectorによるベクトル検索（3-4で実装）
- [ ] Web検索ツール（Brave Search API等）

#### 3-2. エージェントシステム

- [x] `lib/orchestrator.ts` — Tool Useループ実装（最大5ステップ）
- [x] テナント別カスタムプロンプト・出力フォーマットを自動適用
- [x] `app/api/agent/run/route.ts` — Agentic API 本実装（ストリーミング）
- [x] チャット画面に ⚡ Agenticモードトグルボタン追加
- [ ] 複数エージェント連携（営業→法務→経理など）← 次フェーズ

#### 3-3. ワークフローエンジン

- [ ] `lib/workflows/engine.ts` — ワークフロー実行エンジン（条件分岐対応）
- [ ] ワークフロー定義のGUI作成（管理画面から設定）

#### 3-4. ナレッジベース

- [ ] テナントごとのドキュメントアップロード機能
- [ ] Supabase pgvector でベクトル検索（現在はテキスト検索で代替）
- [ ] ナレッジベースをAI社員が参照して精度の高い回答を生成

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
