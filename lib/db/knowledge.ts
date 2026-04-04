/**
 * lib/db/knowledge.ts
 *
 * ナレッジベースDBアクセス層。
 * - pgvector が使えれば（OPENAI_API_KEY 設定時）ベクトル検索
 * - 未設定時は ilike によるテキスト検索にフォールバック
 */

import { supabaseAdmin } from "@/lib/supabase";

// ========================================
// 型定義
// ========================================

export interface KnowledgeChunk {
  id: string;
  source_name: string;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
  similarity?: number;
}

export interface KnowledgeSource {
  source_name: string;
  chunk_count: number;
  created_at: string;
}

// ========================================
// 書き込み
// ========================================

/**
 * チャンクをDBに挿入する（50件ずつバッチ処理）。
 * embedding が null のチャンクはベクトルなし（テキスト検索のみ）で保存される。
 */
export async function insertKnowledgeChunks(
  tenantId: string,
  sourceName: string,
  chunks: Array<{ content: string; chunkIndex: number; totalChunks: number }>,
  embeddings: (number[] | null)[]
): Promise<void> {
  const rows = chunks.map((chunk, i) => ({
    tenant_id: tenantId,
    source_name: sourceName,
    content: chunk.content,
    // Supabase PostgREST は vector 型を配列 JSON として受け取る
    embedding: embeddings[i] ?? null,
    metadata: {
      chunk_index: chunk.chunkIndex,
      total_chunks: chunk.totalChunks,
    },
  }));

  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await supabaseAdmin
      .from("knowledge_chunks")
      .insert(rows.slice(i, i + BATCH));
    if (error) {
      throw new Error(`ナレッジ挿入エラー (batch ${i}): ${error.message}`);
    }
  }
}

// ========================================
// 検索
// ========================================

/**
 * pgvector ベクトル検索（OPENAI_API_KEY 必須）。
 * Supabase RPC `search_knowledge_vector` を呼ぶ。
 */
export async function searchKnowledgeVector(
  tenantId: string,
  queryEmbedding: number[],
  limit = 5
): Promise<KnowledgeChunk[]> {
  const { data, error } = await supabaseAdmin.rpc("search_knowledge_vector", {
    p_tenant_id: tenantId,
    p_embedding: queryEmbedding,
    p_limit: limit,
  });

  if (error) {
    console.error("[knowledge] vector search error:", error.message);
    return [];
  }
  return (data as KnowledgeChunk[]) ?? [];
}

/**
 * ilike によるテキスト検索フォールバック。
 * OPENAI_API_KEY がなくても動く。
 */
export async function searchKnowledgeText(
  tenantId: string,
  query: string,
  limit = 5
): Promise<KnowledgeChunk[]> {
  // SQLインジェクション対策: Supabase のパラメータバインディングに渡す前に長さを制限
  const safeQuery = query.slice(0, 200).replace(/[%_\\]/g, (c) => `\\${c}`);

  const { data, error } = await supabaseAdmin
    .from("knowledge_chunks")
    .select("id, source_name, content, metadata, created_at")
    .eq("tenant_id", tenantId)
    .ilike("content", `%${safeQuery}%`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[knowledge] text search error:", error.message);
    return [];
  }
  return (data as KnowledgeChunk[]) ?? [];
}

// ========================================
// ソース管理
// ========================================

/** テナントのナレッジソース一覧を取得する */
export async function getKnowledgeSources(tenantId: string): Promise<KnowledgeSource[]> {
  const { data, error } = await supabaseAdmin
    .from("knowledge_chunks")
    .select("source_name, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  // source_name でグループ化してカウント（最古の created_at を代表値に）
  const sourceMap = new Map<string, { count: number; created_at: string }>();
  for (const row of data as Array<{ source_name: string; created_at: string }>) {
    const existing = sourceMap.get(row.source_name);
    if (!existing) {
      sourceMap.set(row.source_name, { count: 1, created_at: row.created_at });
    } else {
      existing.count++;
      // 最新の日時を保持
      if (row.created_at > existing.created_at) {
        existing.created_at = row.created_at;
      }
    }
  }

  return Array.from(sourceMap.entries()).map(([name, { count, created_at }]) => ({
    source_name: name,
    chunk_count: count,
    created_at,
  }));
}

/** ソース名に紐づく全チャンクを削除する */
export async function deleteKnowledgeSource(
  tenantId: string,
  sourceName: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("knowledge_chunks")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("source_name", sourceName);

  if (error) {
    throw new Error(`ナレッジ削除エラー: ${error.message}`);
  }
}

/** テナントの全ナレッジを削除する（管理者用） */
export async function deleteAllKnowledge(tenantId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("knowledge_chunks")
    .delete()
    .eq("tenant_id", tenantId);

  if (error) {
    throw new Error(`全ナレッジ削除エラー: ${error.message}`);
  }
}
