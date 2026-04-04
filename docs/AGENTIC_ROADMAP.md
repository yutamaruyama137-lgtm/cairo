# CAIRO Agentic AI ロードマップ

**作成:** 2026-04-04  
**担当:** JARVIS (REQS Lab AI秘書)

---

## 概要

CAIRO の AI 社員を「1ショット生成」から「自律エージェント」へ進化させる 3 フェーズの実装計画。
各フェーズは独立してデプロイ可能で、下位互換性を維持しながら段階的に拡張する。

---

## Phase 1: Tool Use 基盤（完了）

### 目的
Claude に「ツール」を渡し、必要な情報を自律的に取得・活用できるようにする。

### 実装済みツール
| ツール名 | 概要 |
|---|---|
| `search_knowledge` | 社内ナレッジベースをベクトル検索 / テキスト検索 |
| `get_company_info` | テナントの設定・プラン・AI社員一覧を取得 |
| `save_output` | 成果物を保存して次の AI 社員に引き継ぐ |
| `web_search` | Brave Search API（または DuckDuckGo）で最新情報を取得 |
| `get_current_date` | 現在の日時を取得（外部依存なし） |

### アーキテクチャ
```
User → app/api/agent/run/route.ts
         └── orchestrateStream()         ← lib/orchestrator.ts
               └── Tool Use ループ (最大5ステップ)
                     ├── executeTool("search_knowledge", ...)
                     ├── executeTool("get_company_info", ...)
                     ├── executeTool("web_search", ...)
                     └── executeTool("get_current_date", ...)
```

### バグ修正
- `app/api/agent/run/route.ts` で `DEFAULT_TENANT_ID` ハードコードを修正
- セッションの `tenantId` を使用するよう変更

---

## Phase 2: マルチエージェント連携（完了）

### 目的
AI 社員同士が互いに作業を委託し合えるようにする。
例: ジン（営業）が作った提案書をリン（法務）がリスクチェックする。

### 実装済み機能

#### 6体のエージェント定義 (`lib/agents/index.ts`)
| ID | 名前 | 専門分野 |
|---|---|---|
| `jin` | ジン | 営業部 / 提案書・営業メール・議事録 |
| `ai` | アイ | 経理部 / 請求書・経費・資金繰り |
| `rin` | リン | 法務部 / 契約書・リスクチェック |
| `vi` | ヴィ | IT部 / AI選定・システム分析 |
| `iori` | イオリ | 広報部 / Noteブログ・プレスリリース |
| `saki` | サキ | 総務部 / 補助金・マニュアル・スケジュール |

#### `delegate_to_agent` ツール
```typescript
// 使用例: ジンが法務レビューをリンに依頼
{
  "name": "delegate_to_agent",
  "agent_id": "rin",
  "task": "この提案書に含まれるリスクをチェックしてください",
  "context": "提案書の全文..."
}
```

- **無限再帰防止**: `MAX_DELEGATION_DEPTH = 2` でネストを制限
- **SSE イベント**: `🤝 **rin（リン）** に依頼中...` をリアルタイム表示
- **サブエージェント**: 独立した Anthropic API コールで実行（コンテキスト隔離）

### アーキテクチャ
```
User → orchestrateStream()
         └── Tool Use ループ
               ├── search_knowledge, web_search, etc.
               └── delegate_to_agent(agentId, task, context)
                     └── executeDelegateToAgent()
                           ├── lib/agents/index.ts からエージェント定義を取得
                           ├── 新規 Anthropic APIコール（サブエージェントのシステムプロンプト）
                           └── 結果をメインエージェントに返す
```

---

## Phase 3: Nango 外部連携（完了）

### 目的
Gmail・Slack・Google Drive・Google Calendar などの外部サービスと連携し、
AI 社員が実際にメール送信・Slack 投稿・ドキュメント保存を行えるようにする。

### 使用技術
- **Nango** (https://nango.dev): OAuth 接続管理サービス
  - テナントごとの接続情報を管理
  - トークンの自動リフレッシュ
  - `connectionId = ${tenantId}-${userId}`

### 実装済みツール (`lib/tools/nango-actions.ts`)
| ツール名 | 連携先 | 機能 |
|---|---|---|
| `send_gmail` | Gmail | メール送信 |
| `post_to_slack` | Slack | チャンネルへの投稿 |
| `save_to_google_drive` | Google Drive | Google ドキュメントとして保存 |
| `create_calendar_event` | Google Calendar | 予定の作成 |

### 管理 UI (`app/admin/integrations/page.tsx`)
- 外部サービス連携の一覧表示
- Nango Connect UI への誘導
- 連携状態の確認・解除

### API エンドポイント
| エンドポイント | 概要 |
|---|---|
| `POST /api/nango/connect` | Nango セッショントークン発行 |
| `GET /api/nango/connect` | 有効な連携一覧を取得 |
| `POST /api/nango/webhook` | Nango からの Webhook 受信 |

### アーキテクチャ
```
User → orchestrateStream()
         └── Tool Use ループ
               └── send_gmail / post_to_slack / etc.
                     └── lib/tools/nango-actions.ts
                           └── nango.triggerAction() または nango.proxy()
                                 └── Nango SaaS → Gmail API / Slack API / etc.

Admin UI → /admin/integrations
             └── POST /api/nango/connect → Nango Connect UI
             └── GET /api/nango/connect → 連携済みサービス一覧
```

---

## 環境変数

```env
# Phase 1-2 (必須)
ANTHROPIC_API_KEY=sk-ant-...

# Phase 3 (Nango連携)
NANGO_SECRET_KEY=nango-sk-...       # Nango ダッシュボードから取得

# Web検索 (任意・なければ DuckDuckGo フォールバック)
BRAVE_API_KEY=BSA-...
```

---

## ファイル一覧

```
lib/
├── agents/
│   ├── base.ts          ← 型定義
│   └── index.ts         ← 6体のエージェント定義 (Phase 2)
├── tools/
│   ├── index.ts         ← 全ツール定義・executeTool()
│   └── nango-actions.ts ← 外部連携ツール (Phase 3)
├── orchestrator.ts      ← Tool Use ループ
└── nango.ts             ← Nango クライアント (Phase 3)

app/
├── admin/
│   └── integrations/
│       └── page.tsx     ← 外部連携管理 UI (Phase 3)
└── api/
    ├── agent/run/route.ts
    └── nango/
        ├── connect/route.ts   ← セッション発行 (Phase 3)
        └── webhook/route.ts   ← Webhook 受信 (Phase 3)

docs/
└── AGENTIC_ROADMAP.md   ← このファイル
```

---

*最終更新: 2026-04-04 by JARVIS*
