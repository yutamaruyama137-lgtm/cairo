-- ============================================================
-- CAIRO オンボーディング・マルチテナント対応マイグレーション
-- Supabase SQL Editor で実行してください
-- ============================================================

-- 1. users.tenant_id を NULL 許可（オンボーディング未完了ユーザー用）
ALTER TABLE users ALTER COLUMN tenant_id DROP NOT NULL;

-- 2. users に role 列を追加（'admin' | 'member'）
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member';

-- 3. テナント招待テーブル
--    管理者がメールを追加 → そのメールでログインすると自動でテナントに参加
CREATE TABLE IF NOT EXISTS tenant_invites (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'member',
  invited_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

-- 4. RLS
ALTER TABLE tenant_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_invites_service_role" ON tenant_invites
  USING (true) WITH CHECK (true);

-- 5. インデックス
CREATE INDEX IF NOT EXISTS tenant_invites_email_idx ON tenant_invites(email);
CREATE INDEX IF NOT EXISTS users_role_idx ON users(tenant_id, role);

-- ============================================================
-- 確認クエリ
-- ============================================================
-- SELECT column_name, is_nullable FROM information_schema.columns
--   WHERE table_name = 'users' AND column_name IN ('tenant_id', 'role');
-- SELECT * FROM tenant_invites LIMIT 5;
