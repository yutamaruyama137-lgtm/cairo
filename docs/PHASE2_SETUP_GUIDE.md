# CAIRO — Phase 2 詳細セットアップ手順書

**最終更新:** 2026-04-04  
**対象:** 小川（開発担当）  
**目標:** 今日中にDB・認証・テナント別エージェント構成・実行履歴まで繋げる

---

## 現在の進捗

```
✅ 2-1: Supabaseプロジェクト作成・環境変数設定
✅ 2-2: NextAuth + Google OAuth + ログインページ + ミドルウェア
⬜ 2-1: DBスキーマ作成（← 今日ここから）
⬜ 2-1: RLSポリシー設定
⬜ 2-1: lib/db/ 実装切り替え
⬜ 2-2: ヘッダーにログイン状態表示
⬜ 2-3: テナント別エージェント構成（tenant_agents）
⬜ 2-4: 実行履歴（menu_executions に保存）
⬜ 2-4: マイページ（dashboard）
```

---

## テーブル構成（5テーブル）

| テーブル | 役割 |
|---|---|
| `tenants` | サブドメインと会社情報 |
| `tenant_agents` | テナントごとのAI社員ON/OFF・名前・プロンプトカスタマイズ |
| `users` | ログインユーザー（テナントに紐づく） |
| `menu_executions` | メニュー実行履歴 |
| `api_usage_logs` | Claude API使用量ログ |

---

## STEP 1 — SupabaseでDBスキーマを作成する

### 1-1. Supabase SQL Editorを開く

1. https://supabase.com/dashboard にアクセス
2. プロジェクトを選択
3. 左メニュー → **SQL Editor** をクリック
4. 「New query」をクリック

### 1-2. テーブルを作成する（SQLをそのまま貼って実行）

以下のSQLを **まとめてコピー** して SQL Editor に貼り付け、「Run」ボタンを押す。

```sql
-- ============================================================
-- CAIRO Phase 2 — 初期スキーマ（5テーブル）
-- ============================================================

-- 1. tenants（契約企業）
CREATE TABLE IF NOT EXISTS tenants (
  id                       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subdomain                TEXT UNIQUE NOT NULL,
  name                     TEXT NOT NULL,
  plan                     TEXT NOT NULL DEFAULT 'starter',
  primary_color            TEXT DEFAULT '#e63946',
  monthly_execution_limit  INTEGER,
  is_active                BOOLEAN DEFAULT true,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- 2. tenant_agents（テナントごとのAI社員設定）
CREATE TABLE IF NOT EXISTS tenant_agents (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id             TEXT NOT NULL,
  is_enabled           BOOLEAN DEFAULT true,
  custom_name          TEXT,
  system_prompt_suffix TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, agent_id)
);

-- 3. users（テナント内ユーザー）
CREATE TABLE IF NOT EXISTS users (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email             TEXT NOT NULL,
  name              TEXT,
  role              TEXT NOT NULL DEFAULT 'member',
  auth_provider     TEXT,
  auth_provider_id  TEXT,
  last_login_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

-- 4. menu_executions（メニュー実行履歴）
CREATE TABLE IF NOT EXISTS menu_executions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  menu_id       TEXT NOT NULL,
  character_id  TEXT NOT NULL,
  inputs        JSONB NOT NULL,
  output        TEXT,
  tokens_used   INTEGER,
  duration_ms   INTEGER,
  status        TEXT DEFAULT 'completed',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 5. api_usage_logs（Claude API使用量）
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  execution_id    UUID REFERENCES menu_executions(id) ON DELETE SET NULL,
  model           TEXT NOT NULL,
  input_tokens    INTEGER NOT NULL DEFAULT 0,
  output_tokens   INTEGER NOT NULL DEFAULT 0,
  estimated_cost  DECIMAL(10, 6),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス（検索高速化）
CREATE INDEX IF NOT EXISTS idx_tenant_agents_tenant_id    ON tenant_agents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id            ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_menu_executions_tenant_id  ON menu_executions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_menu_executions_user_id    ON menu_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_menu_executions_created_at ON menu_executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_tenant_id        ON api_usage_logs(tenant_id);
```

### 1-3. 初期データを投入する

新しいクエリを作成して以下を実行：

```sql
-- デフォルトテナント（固定UUID — コードと一致させること）
INSERT INTO tenants (id, subdomain, name, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'app', 'CAIRO デモ', 'enterprise')
ON CONFLICT (id) DO NOTHING;

-- デフォルトテナントの AI社員を全員有効化
INSERT INTO tenant_agents (tenant_id, agent_id, is_enabled) VALUES
  ('00000000-0000-0000-0000-000000000001', 'jin',  true),
  ('00000000-0000-0000-0000-000000000001', 'ai',   true),
  ('00000000-0000-0000-0000-000000000001', 'rin',  true),
  ('00000000-0000-0000-0000-000000000001', 'vi',   true),
  ('00000000-0000-0000-0000-000000000001', 'iori', true),
  ('00000000-0000-0000-0000-000000000001', 'saki', true)
ON CONFLICT (tenant_id, agent_id) DO NOTHING;
```

### 1-4. 確認

左メニュー → **Table Editor** で以下を確認：
- `tenants` ✅（1行：CAIRO デモ）
- `tenant_agents` ✅（6行：jin/ai/rin/vi/iori/saki）
- `users` ✅（0行）
- `menu_executions` ✅（0行）
- `api_usage_logs` ✅（0行）

---

## STEP 2 — RLSポリシーを設定する

SQL Editorで以下を実行。

```sql
-- RLSを有効化
ALTER TABLE tenants         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_agents   ENABLE ROW LEVEL SECURITY;
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs  ENABLE ROW LEVEL SECURITY;

-- service_role（バックエンド）はすべてのデータにアクセス可能
CREATE POLICY "service_role_all" ON tenants         FOR ALL USING (true);
CREATE POLICY "service_role_all" ON tenant_agents   FOR ALL USING (true);
CREATE POLICY "service_role_all" ON users           FOR ALL USING (true);
CREATE POLICY "service_role_all" ON menu_executions FOR ALL USING (true);
CREATE POLICY "service_role_all" ON api_usage_logs  FOR ALL USING (true);
```

> **補足:** バックエンドは `SUPABASE_SERVICE_ROLE_KEY` を使うので現段階は全許可。
> Phase 3以降でフロントから直接アクセスする場合に絞り込む。

---

## STEP 3 — コードを動かす（JARVISに実装してもらう）

SQL実行が終わったら **「STEP 3 進めて」** と話しかけるだけでOK。

以下を実装します：

### 3-1. `lib/auth.ts` — セッションにユーザーIDを含める
- ログイン時に `users` テーブルへ保存
- `session.user.id` でユーザーIDを取れるように

### 3-2. `lib/db/users.ts` — ユーザー取得関数
- メールアドレスからユーザー情報を取得

### 3-3. `lib/db/tenant-agents.ts` — テナント別エージェント取得
- `tenant_agents` テーブルからそのテナントで有効なAI社員一覧を取得
- `data/characters.ts` の静的データと結合して返す

### 3-4. `app/api/execute/route.ts` — 実行時にmenu_executionsへ保存
- メニュー実行のたびにDBに記録

### 3-5. ヘッダーにログイン状態表示
- ユーザー名・アイコン表示
- ログアウトボタン追加

### 3-6. `app/dashboard/page.tsx` — マイページ
- 自分の実行履歴一覧を表示

---

## STEP 4 — 動作確認チェックリスト

```
□ ログインするとJARVIS BOTのトップが開く
□ ヘッダーにGoogleアカウントの名前が表示される
□ メニューを実行すると menu_executions にレコードが追加される
  （Supabase Table Editor で確認）
□ /dashboard でその履歴が見られる
□ ログアウトすると /login にリダイレクトされる
```

---

## 新規テナントを追加するときの手順（運用）

サブドメインで別の会社を追加したい場合は以下のSQLを実行するだけ：

```sql
-- 例：渋谷共栄会を追加
INSERT INTO tenants (subdomain, name, plan, primary_color)
VALUES ('shibuya', '渋谷共栄会', 'standard', '#e63946');

-- 追加したテナントのIDを確認して tenant_agents を設定
-- （使わせるAI社員だけ is_enabled = true にする）
INSERT INTO tenant_agents (tenant_id, agent_id, is_enabled)
SELECT id, 'jin',  true FROM tenants WHERE subdomain = 'shibuya'
UNION ALL
SELECT id, 'iori', true FROM tenants WHERE subdomain = 'shibuya';
-- ↑ この会社はジンとイオリだけ使える設定の例
```

---

## 今日の作業順序まとめ

```
[あなた]  STEP 1: SupabaseでSQL実行（1-2 → 1-3）
[あなた]  STEP 2: RLSポリシーSQL実行
[JARVIS]  STEP 3: コード実装（「STEP 3 進めて」と話しかける）
[あなた]  STEP 4: 動作確認
```

---

*この手順書はJARVISが作成。STEP 1・2のSQL実行後、「STEP 3 進めて」と声をかけてください。*
