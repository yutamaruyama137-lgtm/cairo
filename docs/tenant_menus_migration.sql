-- ============================================================
-- tenant_menus マイグレーション
-- テナントごとのカスタムメニューをSupabaseで管理する
-- ============================================================

-- テーブル作成
CREATE TABLE IF NOT EXISTS tenant_menus (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  menu_id           TEXT NOT NULL,                  -- "reqs-01" など（テナント内でユニーク）
  character_id      TEXT NOT NULL,                  -- "jin" | "ai" | "rin" | "vi" | "iori" | "saki"
  title             TEXT NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  icon              TEXT NOT NULL DEFAULT '📝',
  estimated_seconds INTEGER NOT NULL DEFAULT 30,
  human_minutes     INTEGER NOT NULL DEFAULT 30,    -- 人間がやると何分かかるか（ダッシュボード用）
  category          TEXT NOT NULL DEFAULT '文書作成', -- 文書作成/分析・調査/コミュニケーション/相談・アドバイス/事務処理
  inputs            JSONB NOT NULL DEFAULT '[]',    -- MenuInput[] の配列
  prompt_template   TEXT NOT NULL DEFAULT '',       -- {{変数名}} 形式のプロンプトテンプレート
  knowledge_sources TEXT[] DEFAULT '{}',            -- 参照するナレッジソース名の配列
  output_label      TEXT NOT NULL DEFAULT '成果物',
  is_enabled        BOOLEAN DEFAULT true,
  sort_order        INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, menu_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_tenant_menus_tenant_id       ON tenant_menus(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_menus_character_id    ON tenant_menus(tenant_id, character_id);
CREATE INDEX IF NOT EXISTS idx_tenant_menus_enabled         ON tenant_menus(tenant_id, is_enabled);

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_tenant_menus_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenant_menus_updated_at
  BEFORE UPDATE ON tenant_menus
  FOR EACH ROW EXECUTE FUNCTION update_tenant_menus_updated_at();

-- RLS（Row Level Security）
ALTER TABLE tenant_menus ENABLE ROW LEVEL SECURITY;

-- service_role（バックエンド）は全操作可能
CREATE POLICY "service_role_all" ON tenant_menus
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- inputs カラムの JSON 構造（参考）
-- ============================================================
-- [
--   {
--     "key": "変数名",
--     "label": "ラベル",
--     "type": "text" | "textarea" | "select",
--     "placeholder": "例：〇〇",
--     "required": true,
--     "options": ["選択肢1", "選択肢2"],   -- type: "select" のみ
--     "helpText": "補足説明"               -- 任意
--   }
-- ]
