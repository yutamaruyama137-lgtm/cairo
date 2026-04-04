/**
 * lib/embeddings.ts
 *
 * テキストをベクトル埋め込みに変換する。
 * OPENAI_API_KEY が設定されていれば OpenAI text-embedding-3-small を使用（1536次元）。
 * 未設定の場合は null を返し、呼び出し元がテキスト検索にフォールバックする。
 */

const OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";
const OPENAI_EMBEDDING_URL = "https://api.openai.com/v1/embeddings";
const MAX_INPUT_CHARS = 8000; // OpenAI の安全なトークン上限に対応する文字数目安

/**
 * 1件のテキストをベクトルに変換する。
 * OPENAI_API_KEY が未設定の場合は null を返す。
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(OPENAI_EMBEDDING_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_EMBEDDING_MODEL,
        input: text.slice(0, MAX_INPUT_CHARS),
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[embeddings] OpenAI API error:", err);
      return null;
    }

    const data = await response.json() as { data: Array<{ embedding: number[] }> };
    return data.data[0].embedding;
  } catch (err) {
    console.error("[embeddings] fetch error:", err);
    return null;
  }
}

/**
 * 複数テキストを一括でベクトルに変換する（バッチ処理）。
 * OPENAI_API_KEY が未設定の場合は全部 null の配列を返す。
 */
export async function generateEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return texts.map(() => null);

  // OpenAI は1リクエストあたり2048件まで。20件ずつバッチ処理する。
  const BATCH_SIZE = 20;
  const results: (number[] | null)[] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    try {
      const response = await fetch(OPENAI_EMBEDDING_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: OPENAI_EMBEDDING_MODEL,
          input: batch.map((t) => t.slice(0, MAX_INPUT_CHARS)),
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error("[embeddings] OpenAI batch error:", err);
        results.push(...batch.map(() => null));
        continue;
      }

      const data = await response.json() as { data: Array<{ embedding: number[]; index: number }> };
      // index 順に並べ直して追加
      const sorted = data.data.sort((a, b) => a.index - b.index);
      results.push(...sorted.map((d) => d.embedding));
    } catch (err) {
      console.error("[embeddings] batch fetch error:", err);
      results.push(...batch.map(() => null));
    }
  }

  return results;
}

/** OPENAI_API_KEY が設定されているかどうかを確認する */
export function isEmbeddingEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}
