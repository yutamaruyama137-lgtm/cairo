// Claude API のラッパー
// 環境変数 ANTHROPIC_API_KEY が設定されれば本番稼働します

import Anthropic from "@anthropic-ai/sdk";

// TODO: 本番環境では実際のAPIキーを .env.local に設定してください
const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export interface ClaudeParams {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
}

/**
 * Claude API を呼び出してテキストを生成する
 * APIキーが未設定の場合はモックレスポンスを返す
 */
export async function generateText(params: ClaudeParams): Promise<string> {
  const { systemPrompt, userPrompt, maxTokens = 4096 } = params;

  // APIキーが設定されている場合は本番Claude APIを使用
  if (client) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const content = response.content[0];
    if (content.type === "text") {
      return content.text;
    }
    throw new Error("Unexpected response type from Claude API");
  }

  // デモ用モックレスポンス（APIキー未設定時）
  return generateMockResponse(userPrompt);
}

/**
 * ストリーミングでClaude APIを呼び出す
 */
export async function* streamText(params: ClaudeParams): AsyncGenerator<string> {
  const { systemPrompt, userPrompt, maxTokens = 4096 } = params;

  if (client) {
    const stream = await client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    for await (const chunk of stream) {
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta"
      ) {
        yield chunk.delta.text;
      }
    }
  } else {
    // モックのストリーミング（デモ用）
    const mockText = generateMockResponse(userPrompt);
    const words = mockText.split("");
    for (const char of words) {
      yield char;
      await new Promise((r) => setTimeout(r, 15));
    }
  }
}

/**
 * デモ用モックレスポンスを生成
 */
function generateMockResponse(prompt: string): string {
  return `# デモ出力

> ⚠️ これはデモ表示です。実際のAI出力を見るには、\`.env.local\` に \`ANTHROPIC_API_KEY\` を設定してください。

---

## 入力内容の確認

${prompt.substring(0, 200)}...

---

## サンプル出力

JARVIS BOTが生成する実際のコンテンツはここに表示されます。

**セットアップ手順：**

1. \`.env.local.example\` を \`.env.local\` にコピー
2. [Anthropic Console](https://console.anthropic.com/) でAPIキーを取得
3. \`ANTHROPIC_API_KEY=sk-ant-...\` を設定
4. \`npm run dev\` で再起動

---

*JARVIS BOT by REQS Lab — AI社員サービス*`;
}
