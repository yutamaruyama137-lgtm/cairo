/**
 * lib/document-processor.ts
 *
 * アップロードされたドキュメントをRAG用チャンクに分割する。
 * 対応形式: .txt / .md / .csv
 */

export interface DocumentChunk {
  content: string;
  chunkIndex: number;
  totalChunks: number;
}

// チャンクサイズと重複幅
const CHUNK_SIZE = 800;      // 1チャンクの最大文字数
const CHUNK_OVERLAP = 100;   // 前後チャンクとの重複文字数

/**
 * テキストを CHUNK_SIZE 文字ごとに分割する。
 * 文の途中で切らないよう、句読点・改行を優先して区切り位置を調整する。
 */
export function chunkText(text: string): DocumentChunk[] {
  const cleaned = text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (cleaned.length === 0) return [];

  if (cleaned.length <= CHUNK_SIZE) {
    return [{ content: cleaned, chunkIndex: 0, totalChunks: 1 }];
  }

  const rawChunks: string[] = [];
  let start = 0;

  while (start < cleaned.length) {
    const end = start + CHUNK_SIZE;
    let chunk = cleaned.slice(start, end);

    // 文の途中で切らないよう最後の区切り文字を探す
    if (end < cleaned.length) {
      const breakPoints = ["\n", "。", "．", ". ", "! ", "? ", "！", "？"];
      let bestBreak = -1;
      const minBreak = Math.floor(CHUNK_SIZE * 0.5);

      for (const bp of breakPoints) {
        const pos = chunk.lastIndexOf(bp);
        if (pos > minBreak && pos > bestBreak) bestBreak = pos + bp.length;
      }

      if (bestBreak > 0) {
        chunk = chunk.slice(0, bestBreak);
      }
    }

    const trimmed = chunk.trim();
    if (trimmed.length > 0) rawChunks.push(trimmed);

    // 次の開始位置: チャンク長 - オーバーラップ
    start += Math.max(chunk.length - CHUNK_OVERLAP, 1);
  }

  return rawChunks.map((content, i) => ({
    content,
    chunkIndex: i,
    totalChunks: rawChunks.length,
  }));
}

/**
 * ファイル形式に応じてテキストを前処理する。
 * - .md: コードブロック・HTMLタグ・リンクURLを除去
 * - .csv: カンマ区切りをスペースに変換
 * - .txt: そのまま
 */
export function extractTextFromFile(content: string, filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "txt";

  if (ext === "md") {
    return content
      .replace(/```[\s\S]*?```/g, "")         // コードブロック除去
      .replace(/`[^`\n]+`/g, "")              // インラインコード除去
      .replace(/<[^>]+>/g, "")               // HTMLタグ除去
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [テキスト](URL) → テキスト
      .replace(/^#{1,6}\s/gm, "")             // 見出しマーカー除去
      .replace(/\*\*([^*]+)\*\*/g, "$1")      // **太字** → テキスト
      .replace(/\*([^*]+)\*/g, "$1")          // *斜体* → テキスト
      .trim();
  }

  if (ext === "csv") {
    // ヘッダー行を先頭に保持しつつ各行をスペース区切りに変換
    return content
      .split("\n")
      .map((line) =>
        line
          .split(",")
          .map((cell) => cell.replace(/^"|"$/g, "").trim())
          .join(" ")
      )
      .join("\n");
  }

  // .txt: そのまま返す
  return content;
}

/** 対応するファイル拡張子かチェックする */
export function isSupportedFileType(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return ["txt", "md", "csv"].includes(ext);
}
