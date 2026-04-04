# ROAR 実装ロードマップ
> YOOMの代替品「ROAR」— 日本語特化ノーコード自動化ツール（iPaaS）

---

## プロダクトビジョン

**「やりたいことを日本語で書くだけで、アプリ間の自動化が完成する」**

### YOOMとの差別化
| 観点 | YOOM | ROAR |
|---|---|---|
| ターゲット | 日本の非エンジニア | 同上（日本語特化を徹底） |
| AI生成 | あり | Claude APIで高品質な日本語対応 |
| インフラ | 独自 | Vercel（低コスト・高速リリース） |
| 価格 | 高め | 競争力ある価格設定 |

---

## 技術スタック

```
フロントエンド・バックエンド
  └── Next.js App Router（Vercel）

データベース・認証
  └── Supabase（PostgreSQL + Auth + Realtime）

OAuth・トークン管理
  └── Nango Cloud（Slack / Gmail / 将来の拡張）

ワークフロー実行エンジン
  └── Inngest（サーバーレス対応・リトライ内蔵）

AIエンジン
  └── Claude API（Anthropic）

UIコンポーネント
  └── shadcn/ui + Tailwind CSS

ワークフロービルダーキャンバス
  └── React Flow
```

---

## フェーズ概要

| フェーズ | 名称 | 期間目安 | ゴール |
|---|---|---|---|
| Phase 1 | MVP | 4〜5週間 | Slack/Gmail手動ワークフローが動く |
| Phase 2 | Beta | 3〜4週間 | AI生成・テンプレート・自動トリガー |
| Phase 3 | GA | 3〜4週間 | 課金・監視・本番耐性 |

---

## データベーススキーマ（Supabase）

```sql
-- ============================================
-- ユーザー・組織
-- ============================================

-- Supabase Auth と連携するユーザープロフィール
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  locale TEXT DEFAULT 'ja',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 組織・チーム単位の管理
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ワークスペースのメンバーシップ
CREATE TABLE workspace_members (
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  PRIMARY KEY (workspace_id, user_id)
);

-- ============================================
-- コネクション（OAuth）
-- ============================================

-- Nango で管理する OAuth 接続情報
CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  provider TEXT NOT NULL,             -- 'slack' | 'gmail'
  nango_connection_id TEXT NOT NULL,  -- Nango側のconnection ID
  display_name TEXT,                  -- ユーザーが付けた名前
  status TEXT DEFAULT 'active' CHECK (status IN ('active','revoked','error')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ワークフロー定義
-- ============================================

CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT false,
  trigger_type TEXT NOT NULL,         -- 'webhook' | 'schedule' | 'manual' | 'event'
  trigger_config JSONB DEFAULT '{}',  -- cron式、webhook URL等
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ワークフローの各ステップ（ノード）
CREATE TABLE workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  step_type TEXT NOT NULL,            -- 'action' | 'condition' | 'loop' | 'delay'
  provider TEXT,                      -- 'slack' | 'gmail'
  action_key TEXT,                    -- 'send_message' | 'send_email'
  config JSONB DEFAULT '{}',
  input_mapping JSONB DEFAULT '{}',   -- 前ステップの出力をマッピング
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ステップ間の接続（条件分岐対応）
CREATE TABLE workflow_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  source_step_id UUID REFERENCES workflow_steps(id) ON DELETE CASCADE,
  target_step_id UUID REFERENCES workflow_steps(id) ON DELETE CASCADE,
  condition JSONB,
  edge_order INT DEFAULT 0
);

-- ============================================
-- テンプレート
-- ============================================

CREATE TABLE workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,                      -- 'sales' | 'hr' | 'marketing'
  icon_url TEXT,
  definition JSONB NOT NULL,
  required_providers TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT true,
  usage_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 実行履歴
-- ============================================

CREATE TABLE workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running','completed','failed','cancelled')),
  trigger_data JSONB,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  inngest_run_id TEXT
);

CREATE TABLE workflow_step_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  step_id UUID REFERENCES workflow_steps(id),
  step_order INT,
  status TEXT NOT NULL CHECK (status IN ('running','completed','failed','skipped')),
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INT
);
```

---

## Phase 1: MVP（4〜5週間）

### 目標
手動トリガーでSlackにメッセージを送る・Gmailでメールを送るが最小限のGUIで動作する。

---

### 1-1. プロジェクト初期化（Week 1前半）

#### タスク一覧

**[ ] 1-1-1. Next.jsプロジェクト作成**
```bash
cd /c/Users/youta/Downloads/ROAR
npx create-next-app@latest roar --typescript --tailwind --app --src-dir
cd roar
```

**[ ] 1-1-2. 依存パッケージインストール**
```bash
# コア
npm install @supabase/ssr @supabase/supabase-js
npm install inngest
npm install @nangohq/node
npm install @anthropic-ai/sdk

# UI
npm install reactflow
npm install zod
npx shadcn@latest init

# shadcn コンポーネント
npx shadcn@latest add button input label card badge dialog sheet tabs toast
```

**[ ] 1-1-3. ディレクトリ構造作成**
```
src/
  app/
    (auth)/
      login/page.tsx
      signup/page.tsx
    (dashboard)/
      layout.tsx
      page.tsx
      workflows/
        page.tsx
        new/page.tsx
        [id]/edit/page.tsx
      connections/page.tsx
      templates/page.tsx
      runs/
        page.tsx
        [id]/page.tsx
      settings/page.tsx
    api/
      inngest/route.ts
      workflows/route.ts
      workflows/[id]/route.ts
      workflows/[id]/trigger/route.ts
      connections/route.ts
      templates/route.ts
      ai/generate/route.ts
      webhooks/[workflowId]/route.ts
  lib/
    supabase/
      client.ts
      server.ts
      admin.ts
      types.ts
    inngest/
      client.ts
      functions/execute-workflow.ts
    nango/client.ts
    engine/
      executor.ts
      variable-resolver.ts
    providers/
      types.ts
      registry.ts
      slack/index.ts
      gmail/index.ts
    ai/
      client.ts
      prompts/workflow-generator.ts
      validator.ts
  components/
    workflow-builder/
      Canvas.tsx
      StepConfigPanel.tsx
      nodes/
      AiGenerateDialog.tsx
    ui/
    onboarding/
  types/
    workflow.ts
    provider.ts
supabase/
  migrations/
    001_initial_schema.sql
    002_run_tables.sql
  seed.sql
```

**[ ] 1-1-4. 環境変数設定**
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
NANGO_SECRET_KEY=xxx
NEXT_PUBLIC_NANGO_PUBLIC_KEY=xxx
ANTHROPIC_API_KEY=xxx
INNGEST_EVENT_KEY=xxx
INNGEST_SIGNING_KEY=xxx
```

**[ ] 1-1-5. Supabaseプロジェクト作成・マイグレーション実行**
- supabase.com でプロジェクト作成
- `supabase/migrations/001_initial_schema.sql` を実行
- RLSポリシー設定

---

### 1-2. 認証フロー（Week 1後半）

**[ ] 1-2-1. Supabase Authセットアップ**
- `src/lib/supabase/client.ts` — ブラウザ用クライアント
- `src/lib/supabase/server.ts` — サーバー用クライアント（cookies）
- `src/lib/supabase/admin.ts` — service_role用（Inngest内で使用）

**[ ] 1-2-2. ログイン・サインアップページ**
- メール/パスワード認証
- ログイン後は `/workflows` にリダイレクト

**[ ] 1-2-3. ミドルウェア設定**
- `src/middleware.ts` で未認証ユーザーを `/login` にリダイレクト

**[ ] 1-2-4. profilesテーブル自動挿入**
- Supabase Database Functionで `auth.users` 挿入時に `profiles` も自動作成

---

### 1-3. コネクション管理（Week 2前半）

**[ ] 1-3-1. Nango Cloudセットアップ**
- `nango.dev` でアカウント作成
- Slack Integration作成（スコープ: `chat:write`, `channels:read`, `users:read`）
- Gmail Integration作成（スコープ: `gmail.send`, `gmail.readonly`）

**[ ] 1-3-2. コネクション管理画面**
- `src/app/(dashboard)/connections/page.tsx`
- 接続済みサービス一覧
- 「接続する」ボタン → Nango connectUI() 起動 → OAuth完了 → DBに保存

**[ ] 1-3-3. Nangoプロキシラッパー**
- `src/lib/nango/client.ts`
- Nango Proxy APIを使ってSlack/Gmail APIを呼び出すユーティリティ
- トークンリフレッシュはNangoが自動処理（自前管理不要）

---

### 1-4. プロバイダー定義（Week 2後半）

**[ ] 1-4-1. プロバイダーインターフェース**
```typescript
// src/lib/providers/types.ts
interface ProviderDefinition {
  key: string
  displayName: string
  icon: string
  actions: ActionDefinition[]
}

interface ActionDefinition {
  key: string
  displayName: string
  description: string
  inputSchema: ZodSchema
  execute: (input: any, nangoConnectionId: string) => Promise<any>
}
```

**[ ] 1-4-2. Slackプロバイダー**
- `src/lib/providers/slack/index.ts`
- Actions: `send_message`（チャンネルにメッセージ送信）、`list_channels`

**[ ] 1-4-3. Gmailプロバイダー**
- `src/lib/providers/gmail/index.ts`
- Actions: `send_email`（メール送信）、`list_messages`
- 注意: Gmail APIのMIMEエンコーディング（RFC 2822形式 + Base64）

**[ ] 1-4-4. プロバイダーレジストリ**
- `src/lib/providers/registry.ts`
- 全プロバイダーを登録・`key`で検索できる仕組み

---

### 1-5. ワークフロー実行エンジン（Week 3前半）

**[ ] 1-5-1. Inngestセットアップ**
- `src/lib/inngest/client.ts`
- `src/app/api/inngest/route.ts` — serveハンドラー

**[ ] 1-5-2. 実行エンジン（コア）**
- `src/lib/engine/executor.ts`
- workflow_stepsを順番に実行
- `input_mapping`でステップ間データ受け渡し（`{{step1.output.xxx}}`）
- 各ステップを `inngest.step.run()` でラップ（リトライ管理）
- 実行結果を `workflow_step_logs` に記録

**[ ] 1-5-3. テンプレート変数リゾルバー**
- `src/lib/engine/variable-resolver.ts`
- `{{step1.output.channel_id}}` を実際の値に置換

**[ ] 1-5-4. 手動トリガーAPI**
- `src/app/api/workflows/[id]/trigger/route.ts`
- POST → Inngestにイベント送信 → `workflow_runs`レコード作成

---

### 1-6. ワークフロービルダーGUI（Week 3後半〜Week 4）

**[ ] 1-6-1. React Flowキャンバス**
- `src/components/workflow-builder/Canvas.tsx`
- カスタムノード: TriggerNode（開始）、ActionNode（アクション）
- ドラッグ＆ドロップでノード配置
- エッジ（矢印）でノード接続

**[ ] 1-6-2. ステップ設定パネル**
- `src/components/workflow-builder/StepConfigPanel.tsx`
- ノードクリック → サイドパネル表示
- プロバイダー選択 → アクション選択 → パラメータ入力（Zodスキーマから動的フォーム生成）
- コネクション選択ドロップダウン

**[ ] 1-6-3. ワークフロー保存・CRUD API**
- `src/app/api/workflows/route.ts` — GET（一覧）, POST（作成）
- `src/app/api/workflows/[id]/route.ts` — GET, PUT, DELETE
- ビルダーの状態を `workflows` + `workflow_steps` + `workflow_edges` に永続化

**[ ] 1-6-4. ワークフロー一覧ダッシュボード**
- `src/app/(dashboard)/workflows/page.tsx`
- カード表示、新規作成ボタン、有効/無効トグル、手動実行ボタン

---

### 1-7. 実行履歴（Week 4後半）

**[ ] 1-7-1. 実行履歴一覧**
- `src/app/(dashboard)/runs/page.tsx`
- 時系列表示、ステータスバッジ（成功/失敗/実行中）

**[ ] 1-7-2. 実行詳細・ステップログ**
- `src/app/(dashboard)/runs/[id]/page.tsx`
- 各ステップの入出力データ、所要時間、エラーメッセージ
- JSONビューアーで入出力確認

---

### Phase 1 完了チェックリスト

- [ ] メール/パスワードでサインアップ・ログインできる
- [ ] Slack / Gmail のOAuth接続がワンクリックで完了する
- [ ] GUIでワークフローを作成・保存できる
- [ ] 手動トリガーでワークフローが実行される
- [ ] Slackにメッセージが送信される
- [ ] Gmailでメールが送信される
- [ ] 実行履歴とステップログが表示される
- [ ] Vercelにデプロイされ動作する

---

## Phase 2: Beta（3〜4週間）

### 2-1. AI ワークフロー自動生成

**[ ] 2-1-1. Claude APIクライアント**
- `src/lib/ai/client.ts`
- ストリーミング対応

**[ ] 2-1-2. プロンプト設計**
- `src/lib/ai/prompts/workflow-generator.ts`
- 日本語入力 → ワークフロー定義JSON を生成
- システムプロンプトに利用可能プロバイダー・アクション一覧を注入
- Few-shot examples（日本語指示 → JSON）

**[ ] 2-1-3. AI生成UI**
- `src/components/workflow-builder/AiGenerateDialog.tsx`
- テキストエリア → 「生成」ボタン → ストリーミングプレビュー → ビルダーに反映

**[ ] 2-1-4. AI出力バリデーション**
- Zodスキーマでバリデーション → エラー時リトライ（最大3回）

---

### 2-2. テンプレート機能

**[ ] 2-2-1. テンプレートCRUD API**

**[ ] 2-2-2. 初期テンプレート（日本語）**
- 「Slackの特定チャンネルのメッセージをGmailに転送」
- 「毎朝9時にSlackにリマインダーを送信」
- 「Gmailの特定メールをSlackに通知」
- 5〜10個用意

**[ ] 2-2-3. テンプレートギャラリーUI**
- カテゴリ別一覧
- 「このテンプレートを使う」→ビルダーにインポート
- 未接続プロバイダーがあれば接続を促す導線

---

### 2-3. 自動トリガー

**[ ] 2-3-1. Webhookトリガー**
- `src/app/api/webhooks/[workflowId]/route.ts`
- 各ワークフローに一意のWebhook URLを発行

**[ ] 2-3-2. スケジュールトリガー（Cron）**
- 1分間隔のポーリング関数でcron式を評価 → 対象ワークフローを起動
- UIで「毎日9:00」「毎週月曜」等を選択 → cron式に変換

---

### 2-4. UX改善

**[ ] 2-4-1. オンボーディングフロー**
- 初回ログイン時のステップバイステップガイド
- ① ワークスペース作成 → ② コネクション接続 → ③ テンプレートから初回ワークフロー作成

**[ ] 2-4-2. 日本語ローカライゼーション徹底**

**[ ] 2-4-3. レスポンシブ対応**

---

## Phase 3: GA（3〜4週間）

### 3-1. エラー耐性・信頼性
- [ ] リトライ・指数バックオフ強化
- [ ] エラー通知（失敗時にメール/Slack通知）
- [ ] レート制限（Vercel KV使用）

### 3-2. 監視・オブザーバビリティ
- [ ] Vercel Analytics + カスタムイベント
- [ ] Sentry統合（エラートラッキング）

### 3-3. 課金基盤
- [ ] Stripe統合
- [ ] プラン設計:
  - Free: 月100実行、2コネクション
  - Pro: 月5,000実行、無制限コネクション
  - Team: Pro + チーム機能
- [ ] 使用量トラッキング

### 3-4. セキュリティ強化
- [ ] RLSポリシー全テーブル再確認
- [ ] API Routes認証チェック漏れ確認
- [ ] Webhook署名検証
- [ ] CSRF / XSS対策

---

## 技術的な落とし穴・注意事項

### 🔴 HIGH RISK

**1. Inngestの動的Cron問題**
- 問題: `createFunction` はコード内で静的定義が必要。ユーザーが動的にcronを設定できない
- 対策: 1分間隔の「スケジューラー関数」を1つだけ定義し、`workflows`テーブルをポーリング

**2. Claude API出力の不安定性**
- 問題: JSON出力要求でもマークダウンや説明文が混入する場合がある
- 対策: Zodバリデーション + リトライループ（最大3回）

**3. セキュリティ（RLS設計ミス）**
- 問題: RLSポリシーの設計ミスはデータ漏洩に直結
- 対策: 全テーブルでRLS有効化、`workspace_id`ベースのポリシー設計

### 🟡 MEDIUM RISK

**4. Vercelの10秒タイムアウト（Hobbyプラン）**
- 問題: 長いワークフロー実行がAPI Route内で完了しない
- 対策: Inngestに処理委託、API Routeは即座にレスポンスを返す非同期パターン

**5. Gmail APIのMIME複雑さ**
- 問題: RFC 2822形式 + Base64エンコード、日本語件名は `=?UTF-8?B?...?=` が必要
- 対策: nodemailerの `MailComposer` で抽象化

**6. ワークフローデータ受け渡し（テンプレート変数）**
- 問題: `{{step1.output.channel_id}}` のネスト解決が複雑
- 対策: lodash `_.get()` 相当のドットアクセスパーサーを使用

**7. Supabase RLS と Inngest（service_role問題）**
- 問題: Inngest関数はサーバーサイドのためRLSをbypassするキーが必要
- 対策: Inngest関数内では `service_role` クライアント、API Routesでは `anon` キー

---

## 環境変数一覧

```bash
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Nango
NANGO_SECRET_KEY=
NEXT_PUBLIC_NANGO_PUBLIC_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Inngest
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 参考リポジトリ・ドキュメント

- Nango ドキュメント: https://docs.nango.dev
- Inngest ドキュメント: https://www.inngest.com/docs
- React Flow ドキュメント: https://reactflow.dev
- Supabase Auth with Next.js: https://supabase.com/docs/guides/auth/server-side/nextjs
- shadcn/ui: https://ui.shadcn.com

---

## 進捗トラッキング

### Phase 1
- [x] ロードマップ作成
- [ ] Next.jsプロジェクト初期化
- [ ] 依存パッケージインストール
- [ ] Supabaseプロジェクト作成
- [ ] 認証フロー実装
- [ ] Nango Cloudセットアップ
- [ ] コネクション管理画面
- [ ] Slackプロバイダー
- [ ] Gmailプロバイダー
- [ ] Inngestセットアップ
- [ ] 実行エンジン
- [ ] ワークフロービルダーGUI
- [ ] 実行履歴
- [ ] Vercelデプロイ

### Phase 2
- [ ] AI自動生成
- [ ] テンプレート機能
- [ ] 自動トリガー
- [ ] UX改善

### Phase 3
- [ ] エラー耐性
- [ ] 監視
- [ ] 課金
- [ ] セキュリティ強化
