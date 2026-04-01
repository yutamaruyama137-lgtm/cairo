# CAIRO — Supabase DBスキーマ設計書

**最終更新:** 2026-04-01
**対象フェーズ:** Phase 2〜

---

## 概要

CAIROはマルチテナント型SaaSです。すべてのテーブルは `tenant_id` でデータを分離します。
Row Level Security（RLS）を使って、テナント間のデータが絶対に混ざらないようにします。

---

## テーブル一覧

| テーブル | 説明 | Phase |
|---|---|---|
| `tenants` | 契約企業（テナント）情報 | 2 |
| `users` | テナント内ユーザー | 2 |
| `tenant_agents` | テナントごとのAI社員カスタマイズ | 2 |
| `menu_executions` | メニュー実行履歴 | 2 |
| `api_usage_logs` | Claude API使用量ログ | 2 |
| `knowledge_chunks` | テナントのナレッジベース（RAG用） | 3 |
| `workflows` | ワークフロー定義 | 3 |
| `workflow_instances` | ワークフロー実行インスタンス | 3 |
| `tasks` | マルチエージェントタスク | 3 |
| `task_logs` | タスク実行ログ | 3 |

---

## テーブル定義

### tenants — 契約企業

```sql
CREATE TABLE tenants (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subdomain    TEXT UNIQUE NOT NULL,           -- "shibuya", "attranic" など
  name         TEXT NOT NULL,                  -- 表示名
  plan         TEXT NOT NULL DEFAULT 'starter', -- 'starter' | 'standard' | 'enterprise'
  primary_color TEXT DEFAULT '#e63946',
  monthly_execution_limit INTEGER,             -- NULLは無制限
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
```

### users — テナント内ユーザー

```sql
CREATE TABLE users (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  name         TEXT,
  role         TEXT NOT NULL DEFAULT 'member', -- 'admin' | 'member'
  auth_provider TEXT,                          -- 'google' | 'email'
  auth_provider_id TEXT,                       -- Google OAuth sub
  last_login_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);
```

### tenant_agents — AI社員カスタマイズ

```sql
CREATE TABLE tenant_agents (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id             TEXT NOT NULL,           -- 'jin' | 'ai' | 'rin' | 'vi' | 'iori' | 'saki'
  is_enabled           BOOLEAN DEFAULT true,
  custom_name          TEXT,                    -- 上書き名（nullは元の名前を使用）
  system_prompt_suffix TEXT,                    -- テナント固有の追加指示
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, agent_id)
);
```

### menu_executions — メニュー実行履歴

```sql
CREATE TABLE menu_executions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  menu_id      TEXT NOT NULL,                  -- "jin-proposal" など
  character_id TEXT NOT NULL,                  -- "jin" など
  inputs       JSONB NOT NULL,                 -- フォーム入力値
  output       TEXT,                           -- 生成されたテキスト
  tokens_used  INTEGER,                        -- Claude API使用トークン数
  duration_ms  INTEGER,                        -- 実行時間（ミリ秒）
  status       TEXT DEFAULT 'completed',       -- 'running' | 'completed' | 'failed'
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

### api_usage_logs — Claude API使用量ログ

```sql
CREATE TABLE api_usage_logs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  execution_id    UUID REFERENCES menu_executions(id) ON DELETE SET NULL,
  model           TEXT NOT NULL,               -- 'claude-sonnet-4-6' など
  input_tokens    INTEGER NOT NULL DEFAULT 0,
  output_tokens   INTEGER NOT NULL DEFAULT 0,
  estimated_cost  DECIMAL(10, 6),              -- 推定コスト（USD）
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### knowledge_chunks — ナレッジベース（Phase 3・RAG用）

```sql
-- pgvector拡張が必要
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE knowledge_chunks (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_name  TEXT NOT NULL,                  -- ドキュメント名
  content      TEXT NOT NULL,                  -- チャンクテキスト
  embedding    vector(1536),                   -- ベクトル埋め込み
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ベクトル検索用インデックス
CREATE INDEX ON knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

### workflows — ワークフロー定義（Phase 3）

```sql
CREATE TABLE workflows (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  workflow_id       TEXT NOT NULL,             -- "expense-approval" など
  name              TEXT NOT NULL,
  trigger_keywords  TEXT[] DEFAULT '{}',
  steps             JSONB NOT NULL,            -- WorkflowStep[]
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, workflow_id)
);
```

### tasks — マルチエージェントタスク（Phase 3）

```sql
CREATE TABLE tasks (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  workflow_id  UUID REFERENCES workflows(id) ON DELETE SET NULL,
  goal         TEXT NOT NULL,                  -- ユーザーの依頼内容
  status       TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'running' | 'completed' | 'failed'
  agents_involved TEXT[] DEFAULT '{}',         -- 関わったエージェントのID
  final_output TEXT,
  context      JSONB DEFAULT '{}',             -- 中間データ
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

### task_logs — タスク実行ログ（Phase 3）

```sql
CREATE TABLE task_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  agent_id    TEXT NOT NULL,                   -- どのエージェントの出力か
  step        INTEGER NOT NULL,
  input       TEXT,
  output      TEXT,
  tool_calls  JSONB DEFAULT '[]',
  tokens_used INTEGER,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Row Level Security（RLS）ポリシー

**重要:** すべてのテーブルにRLSを有効化し、テナント間のデータ分離を保証する。

```sql
-- tenants: 自分のテナントのみ参照可能
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenants_isolation" ON tenants
  USING (id = auth.jwt() ->> 'tenant_id'::uuid);

-- users: 同じテナントのユーザーのみ参照可能
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_isolation" ON users
  USING (tenant_id = auth.jwt() ->> 'tenant_id'::uuid);

-- menu_executions: 同じテナントの実行履歴のみ参照可能
ALTER TABLE menu_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "executions_isolation" ON menu_executions
  USING (tenant_id = auth.jwt() ->> 'tenant_id'::uuid);

-- 他のテーブルも同様に設定する
```

---

## インデックス

```sql
-- 実行履歴の検索を高速化
CREATE INDEX idx_menu_executions_tenant_id ON menu_executions(tenant_id);
CREATE INDEX idx_menu_executions_created_at ON menu_executions(created_at DESC);
CREATE INDEX idx_menu_executions_menu_id ON menu_executions(menu_id);

-- API使用量の集計を高速化
CREATE INDEX idx_api_usage_tenant_id ON api_usage_logs(tenant_id);
CREATE INDEX idx_api_usage_created_at ON api_usage_logs(created_at);
```

---

## マイグレーション手順（Phase 2作業時）

```bash
# 1. Supabase CLIをインストール
npm install -g supabase

# 2. ローカルでSupabaseを起動（オプション）
supabase init
supabase start

# 3. マイグレーションファイルを作成
supabase migration new create_initial_tables

# 4. マイグレーションを実行
supabase db push

# 5. 型定義を生成（types/supabase.ts を更新）
supabase gen types typescript --local > types/supabase.ts
```

---

## 初期データ（Seed）

```sql
-- デフォルトテナント
INSERT INTO tenants (id, subdomain, name, plan) VALUES
  ('00000000-0000-0000-0000-000000000001', 'app', 'CAIRO デモ', 'enterprise');

-- デモAI社員設定
INSERT INTO tenant_agents (tenant_id, agent_id, is_enabled) VALUES
  ('00000000-0000-0000-0000-000000000001', 'jin', true),
  ('00000000-0000-0000-0000-000000000001', 'ai', true),
  ('00000000-0000-0000-0000-000000000001', 'rin', true),
  ('00000000-0000-0000-0000-000000000001', 'vi', true),
  ('00000000-0000-0000-0000-000000000001', 'iori', true),
  ('00000000-0000-0000-0000-000000000001', 'saki', true);
```

---

*最終更新: 2026-04-01*
