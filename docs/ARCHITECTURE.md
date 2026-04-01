# CAIRO — 技術アーキテクチャ設計書

**最終更新:** 2026-04-01
**本番URL:** https://cairo.vercel.app/
**リポジトリ:** https://github.com/yutamaruyama137-lgtm/cairo

---

## 1. システム全体図

```
┌─────────────────────────────────────────────────────────────┐
│                      CAIRO — 全体構成                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ユーザー（ブラウザ）                                         │
│       │                                                     │
│       ▼                                                     │
│  【フロントエンド】 Next.js 14 App Router                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  app/                                                │   │
│  │  ├── page.tsx         ホーム（AI社員一覧）             │   │
│  │  ├── [characterId]/   AI社員個別ページ                 │   │
│  │  ├── chat/            チャット・メニュー実行画面        │   │
│  │  └── admin/           管理画面（Phase 2〜）            │   │
│  │                                                      │   │
│  │  components/                                         │   │
│  │  ├── CharacterCard    AI社員カード                    │   │
│  │  ├── MenuForm         入力フォーム（動的生成）          │   │
│  │  └── ResultDisplay    結果表示（MD + HTMLプレビュー）   │   │
│  └──────────────────────────────────────────────────────┘   │
│       │                                                     │
│       ▼ POST /api/execute（SSE）                            │
│  【バックエンド】 Next.js API Routes                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  app/api/execute/route.ts     メニュー実行API         │   │
│  │  app/api/chat/route.ts        自由チャットAPI         │   │
│  │  app/api/agent/run/route.ts   Agenticループ（Phase 3）│   │
│  └──────────────────────────────────────────────────────┘   │
│       │                                                     │
│       ▼                                                     │
│  【Claude API】 claude-sonnet-4-6                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  lib/claude.ts                                       │   │
│  │  ├── streamText()   ストリーミング生成（推奨）          │   │
│  │  └── generateText() 通常生成                          │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  【データ】 静的ファイル → Phase 2でSupabase移行              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  data/characters.ts   6体のAI社員定義                 │   │
│  │  data/menus.ts        24メニュー定義                   │   │
│  │  config/tenants/      テナント設定JSON                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  【インフラ】 Vercel                                          │
│  ├── GitHub main ブランチ → 自動デプロイ                     │
│  └── 環境変数: ANTHROPIC_API_KEY                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 技術スタック

### 現在（Phase 1）

| 項目 | 技術 | 状態 |
|------|------|------|
| フレームワーク | Next.js 14（App Router） | ✅ 稼働中 |
| スタイリング | Tailwind CSS | ✅ 稼働中 |
| Markdownレンダリング | react-markdown + remark-gfm | ✅ 稼働中 |
| AI | Anthropic SDK（claude-sonnet-4-6） | ✅ 稼働中 |
| ストリーミング | ReadableStream / SSE | ✅ 稼働中 |
| HTMLプレビュー | iframe srcDoc | ✅ 稼働中 |
| デプロイ | Vercel | ✅ 稼働中 |

### Phase 2 追加予定

| 項目 | 技術 | 状態 |
|------|------|------|
| 認証 | NextAuth.js v5（Auth.js） | ❌ 未実装 |
| DB | Supabase（PostgreSQL） | ❌ 未実装 |
| ORM | Prisma（検討中）or Supabase Client | ❌ 未決定 |
| ミドルウェア | Next.js middleware.ts（テナント判定） | ❌ 未実装 |

---

## 3. ファイル構成

```
cairo/
├── app/
│   ├── layout.tsx              # グローバルレイアウト・メタデータ
│   ├── globals.css             # グローバルCSS
│   ├── page.tsx                # ホームページ（AI社員一覧）
│   ├── not-found.tsx           # 404
│   ├── [characterId]/
│   │   └── page.tsx            # AI社員個別ページ
│   ├── chat/
│   │   └── page.tsx            # チャット + メニュー実行画面
│   ├── admin/
│   │   └── page.tsx            # 管理画面（Phase 2〜）
│   └── api/
│       ├── execute/
│       │   └── route.ts        # POST /api/execute（現在のメイン）
│       ├── chat/
│       │   └── route.ts        # POST /api/chat
│       └── agent/
│           └── run/
│               └── route.ts    # POST /api/agent/run（Phase 3）
│
├── components/
│   ├── CharacterAvatar.tsx     # アバター画像表示
│   ├── CharacterCard.tsx       # AI社員カード（ホームページ）
│   ├── Header.tsx              # ページヘッダー
│   ├── MenuCard.tsx            # メニューカード
│   ├── MenuForm.tsx            # 入力フォーム（動的生成）
│   └── ResultDisplay.tsx       # 結果表示（MD + HTMLプレビュー）
│
├── data/                       # ⚠️ 静的データ（Phase 2でSupabase移行）
│   ├── characters.ts           # 6体のAI社員定義
│   └── menus.ts                # 24メニュー定義・プロンプトテンプレート
│
├── lib/
│   ├── claude.ts               # Claude APIラッパー
│   ├── cn.ts                   # Tailwindクラス結合ユーティリティ
│   ├── db/                     # DBアクセス抽象化（Phase 2〜）
│   │   ├── index.ts
│   │   ├── tenants.ts
│   │   ├── menus.ts
│   │   └── tasks.ts
│   ├── agents/                 # AI社員エージェント定義（Phase 3〜）
│   │   ├── base.ts
│   │   ├── jin.ts
│   │   ├── ai.ts
│   │   ├── rin.ts
│   │   ├── vi.ts
│   │   ├── iori.ts
│   │   └── saki.ts
│   ├── tools/                  # Claude Tool Use定義（Phase 3〜）
│   │   ├── index.ts
│   │   ├── knowledge.ts
│   │   ├── company.ts
│   │   └── output.ts
│   ├── workflows/              # ワークフローエンジン（Phase 3〜）
│   │   ├── types.ts
│   │   └── engine.ts
│   └── orchestrator.ts         # マルチエージェント指揮（Phase 3〜）
│
├── config/
│   └── tenants/
│       ├── default.json        # デフォルトテナント設定
│       └── attranic.json       # デモテナント例（Attranic Inc.）
│
├── types/
│   ├── index.ts                # 現在の型定義
│   └── supabase.ts             # Phase 2 Supabase型定義
│
└── public/
    └── avatars/                # 6体のSVGアバター
```

---

## 4. 主要な型定義

```typescript
// AI社員キャラクター
interface AICharacter {
  id: string;           // "jin", "ai", "rin", "vi", "iori", "saki"
  name: string;         // "ジン", "アイ" など
  nameEn: string;       // "J", "A", "R", "V", "I", "S"
  department: string;
  role: string;
  color: string;        // Tailwind: "bg-orange-500"
  lightColor: string;
  borderColor: string;
  textColor: string;
  gradientFrom: string;
  gradientTo: string;
  emoji: string;
  description: string;
  greeting: string;
}

// メニュー入力フィールド
interface MenuInput {
  key: string;
  label: string;
  type: "text" | "textarea" | "select";
  placeholder: string;
  required: boolean;
  options?: string[];
  helpText?: string;
}

// 仕事メニュー
interface MenuItem {
  id: string;           // "jin-minutes", "vi-webdesign" など
  characterId: string;
  title: string;
  description: string;
  icon: string;
  estimatedSeconds: number;
  inputs: MenuInput[];
  promptTemplate: string;   // {{key}} でプレースホルダー置換
  outputLabel: string;
}
```

---

## 5. API設計

### POST /api/execute

**リクエスト:**
```json
{
  "menuId": "jin-proposal",
  "inputs": {
    "company": "株式会社〇〇",
    "problem": "人手不足で業務が回らない",
    "service": "AI業務効率化ツール",
    "price": "月額10万円〜"
  }
}
```

**レスポンス:** `text/plain; charset=utf-8`（SSEストリーミング）

**システムプロンプト構成:**
```
あなたはAI社員「{character.name}」です。{character.department}の担当です。
役割：{character.role}

【行動指針】
- 入力された情報をもとに、すぐに使える品質の成果物を出力する
- 曖昧な表現を避け、具体的に記述する
- 日本のビジネス慣習を理解した内容にする
- マークダウン形式で、見やすく整理して出力する
- 「〜かもしれません」より「〜です」と断言する

{character.greeting}
```

### POST /api/chat

**リクエスト:**
```json
{
  "characterId": "jin",
  "messages": [
    { "role": "user", "content": "提案書の件で相談があります" }
  ]
}
```

**レスポンス:** SSEストリーミング

---

## 6. HTMLプレビュー機能

`ResultDisplay.tsx` にHTML自動検知 + iframeプレビューを実装。

```typescript
function isHTML(text: string): boolean {
  return /<!DOCTYPE\s+html/i.test(text) || /<html[\s>]/i.test(text);
}
```

**動作フロー:**
1. Claudeの出力が `<!DOCTYPE html` または `<html` で始まる場合に自動検知
2. ストリーミング完了後、ヘッダーに「プレビュー / コード」タブを表示
3. プレビュータブ：`<iframe srcDoc={output} sandbox="allow-scripts allow-same-origin" />`
4. コードタブ：生HTMLを `<pre>` で表示
5. ヴィ（技術部）の「Webデザインを考える」が主なユースケース

---

## 7. テナントアーキテクチャ（Phase 2〜）

### マルチテナント設計

```
サブドメイン形式:
  app.cairo-ai.com         → デフォルトテナント
  shibuya.cairo-ai.com     → 渋谷共栄会テナント
  fujisawa.cairo-ai.com    → 藤沢市商店街テナント
  attranic.cairo-ai.com    → Attranic Inc.テナント
```

**テナント判定フロー:**
1. `middleware.ts` でリクエストのホスト名を解析
2. サブドメイン → `tenantId` に変換
3. `lib/db/tenants.ts` でテナント設定を取得（Phase 1: JSON / Phase 2: Supabase）
4. テナント設定をページコンポーネントに注入

**テナントごとのカスタマイズ項目:**
- AI社員の名前上書き（例：ジン → Alex）
- システムプロンプトの追加指示
- 有効・無効にするメニュー
- ブランドカラー
- 月間実行回数制限

---

## 8. Agenticアーキテクチャ（Phase 3）

### Director-Worker パターン

```
ユーザー入力
    │
    ▼
Orchestrator（Director）
lib/orchestrator.ts
    │
    ├── Agent: ジン（営業）    lib/agents/jin.ts
    │   └── Tools: 検索・保存
    │
    ├── Agent: アイ（経理）    lib/agents/ai.ts
    │   └── Tools: 計算・保存
    │
    └── Agent: リン（法務）    lib/agents/rin.ts
        └── Tools: 検索・保存
```

**Tool Use定義（予定）:**
- `searchKnowledge` — RAG検索（Supabase pgvector）
- `getCompanyInfo` — テナントの会社情報取得
- `saveOutput` — 実行結果をDBに保存
- `callExternalAPI` — 外部API連携（Slack / X など）

---

## 9. 環境変数

```env
# Phase 1（必須）
ANTHROPIC_API_KEY=sk-ant-...

# Phase 2（Supabase）
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Phase 2（NextAuth.js 認証）
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=https://cairo.vercel.app
NEXT_PUBLIC_APP_URL=https://cairo.vercel.app
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

# Phase 3（外部連携）
SLACK_BOT_TOKEN=xoxb-...
X_API_KEY=...
X_API_SECRET=...
CANVA_API_KEY=...
```

---

## 10. デプロイ・開発フロー

```bash
# ローカル開発
npm run dev          # localhost:3000

# 型チェック
npx tsc --noEmit

# 本番デプロイ
git push origin main   # Vercelが自動ビルド・デプロイ
```

**ブランチ戦略:**
```
main     → Vercel本番自動デプロイ
develop  → 統合ブランチ（PRのマージ先）
feature/* → 機能開発ブランチ
```

詳細は [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md) を参照。

---

*最終更新: 2026-04-01*
