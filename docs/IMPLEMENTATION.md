# CAIRO — 実装サマリー

**最終更新:** 2026-04-03  
**対象フェーズ:** Phase 2 完了 / Phase 3 基盤実装

---

## 実装した内容の全体像

```
Phase 2: 認証・DB基盤
  ├── Supabase セットアップ（5テーブル + RLS）
  ├── NextAuth.js v4 + Google OAuth
  ├── マルチテナント対応（サブドメイン判定）
  ├── 実行履歴の保存・表示
  ├── 月間実行回数制限（プラン別）
  ├── MarkdownRenderer（シンタックスハイライト付き）
  └── テナント管理画面（管理パネル）

Phase 3 基盤: Agentic化
  ├── Tool Use 実装（3ツール）
  ├── Orchestratorループ（最大5ステップ）
  └── チャット画面の Agenticモードトグル
```

---

## 変更ファイル一覧

### 新規作成

| ファイル | 役割 |
|---|---|
| `lib/supabase.ts` | Supabaseクライアント（anon / service_role） |
| `lib/auth.ts` | NextAuth.js 設定（Google OAuth + Supabase連携） |
| `lib/tenant-context.ts` | テナントID解決・TTLキャッシュ |
| `lib/rate-limit.ts` | 月間実行回数チェック（プラン別上限） |
| `lib/tools/index.ts` | Tool Use定義と実行関数（3ツール） |
| `lib/orchestrator.ts` | Agenticループ（Tool Use + ストリーミング） |
| `lib/db/users.ts` | ユーザーDBアクセス |
| `lib/db/tenant-agents.ts` | テナント別AI社員取得 |
| `lib/db/admin.ts` | 管理パネル用DBアクセス |
| `app/login/page.tsx` | ログインページ（Google認証） |
| `app/dashboard/page.tsx` | 実行履歴一覧 |
| `app/dashboard/[id]/page.tsx` | 実行履歴詳細（Server Component） |
| `app/dashboard/[id]/ExecutionDetail.tsx` | 実行履歴詳細（Client Component） |
| `app/admin/page.tsx` | テナント管理画面（Server Component） |
| `app/admin/AdminAgentCard.tsx` | AI社員設定カード（Client Component） |
| `app/api/agent/run/route.ts` | Agentic実行API |
| `app/api/admin/agent/route.ts` | AI社員設定更新API |
| `app/api/tenant/resolve/route.ts` | テナントID解決内部API |
| `components/MarkdownRenderer.tsx` | Markdown+シンタックスハイライト表示 |
| `components/UserMenu.tsx` | ヘッダーのユーザーメニュー |
| `components/AuthProvider.tsx` | NextAuth SessionProvider |
| `types/next-auth.d.ts` | NextAuth型拡張（Session.user.id） |

### 主要な更新

| ファイル | 変更内容 |
|---|---|
| `middleware.ts` | withAuth + サブドメイン→テナントID変換 |
| `app/layout.tsx` | AuthProvider追加 |
| `app/api/chat/route.ts` | DB保存・レート制限・カスタムプロンプト対応 |
| `app/api/execute/route.ts` | レート制限追加・PII console.log削除 |
| `app/chat/page.tsx` | MarkdownRenderer + Agenticモードトグル |
| `next.config.mjs` | Google画像ホスト許可 |
| `docs/ROADMAP.md` | Phase 2完了・Phase 3進行中に更新 |

---

## DBスキーマ

詳細は [PHASE2_SETUP_GUIDE.md](PHASE2_SETUP_GUIDE.md) 参照。

```sql
tenants              -- テナント（会社）
tenant_agents        -- テナント別AI社員設定
users                -- ユーザー
menu_executions      -- 実行履歴
api_usage_logs       -- API使用量ログ
```

### tenant_agents 追加カラム（要確認）

以下のカラムが追加されている前提でコードが動いている。**未実行の場合はSupabaseで実行すること。**

```sql
ALTER TABLE tenant_agents
  ADD COLUMN IF NOT EXISTS custom_system_prompt text,
  ADD COLUMN IF NOT EXISTS output_format        text DEFAULT 'markdown',
  ADD COLUMN IF NOT EXISTS flow_config          jsonb;
```

---

## 環境変数

`.env.local` に以下を設定すること。

```env
# 必須（Phase 1）
ANTHROPIC_API_KEY=sk-ant-...

# Phase 2
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXTAUTH_SECRET=（openssl rand -base64 32 で生成）
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

# Phase 2 セキュリティ（推奨）
INTERNAL_API_SECRET=（openssl rand -base64 32 で生成）
```

---

## 確認チェックリスト

### 必須（これが通らないと動かない）

- [×] Supabase の SQL を全部実行したか（PHASE2_SETUP_GUIDE.md 参照）
- [×] `tenant_agents` の追加カラム（custom_system_prompt, output_format, flow_config）を ALTER TABLE で追加したか
- [×] `.env.local` に全環境変数を設定したか
- [×] Google Cloud Console で OAuth クライアントの リダイレクトURI に `http://localhost:3000/api/auth/callback/google` を追加したか
- [×] Supabase の `tenants` テーブルにデフォルトテナント（id = `00000000-0000-0000-0000-000000000001`）が存在するか

### 推奨（本番デプロイ前）

- [×] `INTERNAL_API_SECRET` 環境変数を設定する（`/api/tenant/resolve` の保護）
- [ ] Vercel に環境変数を設定する（`NEXTAUTH_URL` は本番URLに変更）
- [ ] Vercel でワイルドカードドメイン `*.cairo-ai.com` を設定する（マルチテナント）
- [ ] Google Cloud Console で本番URLのリダイレクトURIを追加する

---

## 主要フロー

### チャット（通常モード）

```
user → POST /api/chat
  → checkRateLimit（429 if over）
  → getTenantAgentConfigs（カスタムプロンプト取得）
  → buildSystemPrompt（キャラクター + カスタム + フォーマット）
  → Claude API ストリーミング
  → stream → クライアントへ
  → finally: menu_executions に保存
```

### チャット（Agenticモード ⚡）

```
user → POST /api/agent/run
  → checkRateLimit（429 if over）
  → orchestrateStream()
    → Tool Useループ（最大5ステップ）
      → Claude API（tools付き）
      → tool_use blocks → executeTool()
        → get_company_info: Supabaseからテナント情報取得
        → search_knowledge: menu_executions から全文検索
        → save_output: 成果物テキストを返す
      → ループ継続 or テキスト応答でbreak
    → stream → クライアントへ
    → menu_executions に保存
```

### テナント解決

```
リクエスト → middleware
  → ホスト名からサブドメイン抽出
  → ?tenant=xxx（ローカル開発用）
  → /api/tenant/resolve?subdomain=xxx
    → Supabaseで tenants テーブル検索
    → tenantId を返す
  → x-tenant-id ヘッダーをセット
```

---

## 既知の制限・今後の課題

### Phase 3 残タスク

| タスク | 状態 |
|---|---|
| pgvector によるベクトル検索 | 未着手（現在はテキスト検索で代替） |
| Web検索ツール（Brave Search等） | 未着手 |
| 複数エージェント連携（営業→法務→経理） | 未着手 |
| ワークフローエンジン（条件分岐） | 未着手 |
| ナレッジベース（ドキュメントアップロード） | 未着手 |

### アーキテクチャ上の注意点

1. **テナントキャッシュ**: `lib/tenant-context.ts` のTTLキャッシュはインメモリのため、Vercel Serverless では複数インスタンス間で共有されない。本番では Redis/KV等に移行が望ましい。

2. **DEFAULT_TENANT_ID の重複**: `lib/auth.ts` と `middleware.ts` に同じUUIDが定義されている。将来的には `lib/auth.ts` の export 1箇所に統合する。

3. **管理者権限**: 現在は「ログイン済みなら誰でも `/admin` にアクセス可能」。本番では users テーブルに `role` カラムを追加してロールチェックを実装する。

---

*このドキュメントはCAIRO Phase 2〜3 実装後に作成。*
