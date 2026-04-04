-- ============================================================
-- CAIRO Phase 3 — ナレッジベース（RAG）マイグレーション
-- Supabase SQL Editor で実行してください
-- ============================================================

-- 1. pgvector 拡張を有効化
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. knowledge_chunks テーブル
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_name  TEXT NOT NULL,
  content      TEXT NOT NULL,
  embedding    vector(1536),             -- OpenAI text-embedding-3-small の次元数
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 3. インデックス
-- ベクトル検索用（embeddingが揃ってから有効化する）
-- lists はチャンク総数の sqrt 程度が目安。100 はスモールスタート向け
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx
  ON knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- テキスト検索高速化
CREATE INDEX IF NOT EXISTS knowledge_chunks_tenant_idx ON knowledge_chunks(tenant_id);
CREATE INDEX IF NOT EXISTS knowledge_chunks_source_idx  ON knowledge_chunks(tenant_id, source_name);

-- 4. RLS（Row Level Security）
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- service_role（バックエンド）は全操作可能
CREATE POLICY "knowledge_chunks_service_role" ON knowledge_chunks
  USING (true)
  WITH CHECK (true);

-- 5. ベクトル検索 RPC 関数
--    Supabase JS クライアントから supabaseAdmin.rpc('search_knowledge_vector', ...) で呼ぶ
CREATE OR REPLACE FUNCTION search_knowledge_vector(
  p_tenant_id  UUID,
  p_embedding  vector(1536),
  p_limit      INTEGER DEFAULT 5
)
RETURNS TABLE (
  id          UUID,
  source_name TEXT,
  content     TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ,
  similarity  FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    source_name,
    content,
    metadata,
    created_at,
    1 - (embedding <=> p_embedding) AS similarity
  FROM knowledge_chunks
  WHERE tenant_id = p_tenant_id
    AND embedding IS NOT NULL
  ORDER BY embedding <=> p_embedding
  LIMIT p_limit;
$$;

-- ============================================================
-- 確認クエリ（実行後に動作確認用）
-- ============================================================
-- SELECT COUNT(*) FROM knowledge_chunks;
-- SELECT * FROM knowledge_chunks LIMIT 5;
