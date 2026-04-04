/**
 * app/api/knowledge/upload/route.ts
 *
 * ナレッジドキュメントのアップロードAPI。
 * ファイルをチャンク分割 → ベクトル化 → Supabase保存。
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionTenantId } from "@/lib/tenant";
import { extractTextFromFile, chunkText, isSupportedFileType } from "@/lib/document-processor";
import { generateEmbeddings } from "@/lib/embeddings";
import { insertKnowledgeChunks, getKnowledgeSources } from "@/lib/db/knowledge";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_SOURCES_PER_TENANT = 50;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const tenantId = getSessionTenantId(session);

  // ソース数の上限チェック
  const existingSources = await getKnowledgeSources(tenantId);
  if (existingSources.length >= MAX_SOURCES_PER_TENANT) {
    return NextResponse.json(
      { error: `ナレッジソースは最大${MAX_SOURCES_PER_TENANT}件までです` },
      { status: 400 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "フォームデータの解析に失敗しました" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 400 });
  }

  // ファイル形式チェック
  if (!isSupportedFileType(file.name)) {
    return NextResponse.json(
      { error: "対応形式: .txt, .md, .csv のみアップロード可能です" },
      { status: 400 }
    );
  }

  // ファイルサイズチェック
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "ファイルサイズは5MB以内にしてください" },
      { status: 400 }
    );
  }

  // 同名ファイルの重複チェック
  const isDuplicate = existingSources.some((s) => s.source_name === file.name);
  if (isDuplicate) {
    return NextResponse.json(
      { error: `「${file.name}」はすでに登録されています。削除してから再アップロードしてください` },
      { status: 400 }
    );
  }

  // テキスト抽出 → チャンク分割
  const rawText = await file.text();
  const text = extractTextFromFile(rawText, file.name);
  const chunks = chunkText(text);

  if (chunks.length === 0) {
    return NextResponse.json(
      { error: "ファイルのテキストが空です" },
      { status: 400 }
    );
  }

  // ベクトル化（OPENAI_API_KEY があれば）
  const embeddings = await generateEmbeddings(chunks.map((c) => c.content));
  const vectorized = embeddings.some((e) => e !== null);

  // DBに保存
  try {
    await insertKnowledgeChunks(tenantId, file.name, chunks, embeddings);
  } catch (err) {
    console.error("[knowledge/upload] DB error:", err);
    return NextResponse.json(
      { error: "保存中にエラーが発生しました" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "アップロード完了",
    sourceName: file.name,
    chunkCount: chunks.length,
    vectorized,
    searchMode: vectorized ? "vector" : "text",
  });
}
