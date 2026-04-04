# CAIRO — AI社員 SaaS

> 仕事メニューから選ぶだけ。あなたの会社に、今日からAI社員を。

**本番URL:** https://cairo-zybd.vercel.app/
**リポジトリ:** https://github.com/yutamaruyama137-lgtm/cairo
**開発元:** [REQS Lab](https://reqs-lab.com)

---

## 概要

CAIROは中小企業・商店街向けの「AI社員 SaaS」です。
6体のAI社員が24種類の業務メニューをこなします。フォームに入力するだけで、議事録・提案書・契約書・SNS投稿文などをAIが生成します。

### AI社員一覧（JARVIS）

| # | 名前 | 部門 | 役割 |
|---|------|------|------|
| J | ジン | 営業部 | 営業のプロ |
| A | アイ | 経理部 | 数字のスペシャリスト |
| R | リン | 法務部 | 法務の番人 |
| V | ヴィ | 技術部 | ITのエキスパート |
| I | イオリ | マーケ部 | アイデアのプロ |
| S | サキ | 総務部 | 社内の何でも屋 |

---

## 技術スタック

| 項目 | 技術 |
|------|------|
| フレームワーク | Next.js 14（App Router） |
| スタイリング | Tailwind CSS |
| AI | Anthropic Claude API（claude-sonnet-4-6） |
| ストリーミング | ReadableStream / SSE |
| デプロイ | Vercel |
| DB（Phase 2〜） | Supabase（PostgreSQL） |
| 認証（Phase 2〜） | NextAuth.js v5（Auth.js） |

---

## クイックスタート

### 1. リポジトリをクローン

```bash
git clone https://github.com/yutamaruyama137-lgtm/cairo.git
cd cairo
```

### 2. 依存関係をインストール

```bash
npm install
```

### 3. 環境変数を設定

```bash
cp .env.local.example .env.local
# .env.local を編集して ANTHROPIC_API_KEY を設定
```

### 4. 開発サーバーを起動

```bash
npm run dev
# → http://localhost:3000
```

> **APIキーなしでも動作します。** `ANTHROPIC_API_KEY` が未設定の場合、モックレスポンスが返されます。

---

## ディレクトリ構成

```
cairo/
├── app/                    # Next.js App Router
│   ├── page.tsx            # ホーム（AI社員一覧）
│   ├── [characterId]/      # AI社員個別ページ
│   ├── chat/               # チャット・メニュー実行画面
│   ├── admin/              # 管理画面（Phase 2〜）
│   └── api/
│       ├── execute/        # メニュー実行API（実装済み）
│       ├── chat/           # チャットAPI（実装済み）
│       └── agent/run/      # Agenticループ（Phase 3〜）
│
├── components/             # UIコンポーネント
├── data/                   # 静的データ定義（Phase 2でSupabase移行）
│   ├── characters.ts       # 6体のAI社員定義
│   └── menus.ts            # 24メニュー定義
│
├── lib/
│   ├── claude.ts           # Claude APIラッパー
│   ├── db/                 # DBアクセス抽象化（Phase 2〜）
│   ├── agents/             # AI社員エージェント定義（Phase 3〜）
│   ├── tools/              # Claude Tool Use定義（Phase 3〜）
│   ├── workflows/          # ワークフローエンジン（Phase 3〜）
│   └── orchestrator.ts     # マルチエージェント指揮（Phase 3〜）
│
├── config/tenants/         # テナント設定JSON（Phase 2でSupabase移行）
├── types/                  # TypeScript型定義
├── public/avatars/         # AI社員SVGアバター
│
├── docs/                   # ドキュメント
│   ├── PRODUCT_SPEC.md     # 製品仕様定義書
│   ├── ARCHITECTURE.md     # 技術アーキテクチャ
│   ├── ROADMAP.md          # 開発ロードマップ
│   ├── DATABASE_SCHEMA.md  # Supabase DBスキーマ設計
│   └── DEVELOPMENT_GUIDE.md # 開発・Git運用ガイド
│
├── CLAUDE.md               # Claude Code向け開発ガイド
├── CONTRIBUTING.md         # 共同開発ガイドライン
└── .env.local.example      # 環境変数テンプレート
```

---

## ドキュメント

| ドキュメント | 内容 |
|---|---|
| [製品仕様](docs/PRODUCT_SPEC.md) | サービス概要・競合分析・料金プラン |
| [アーキテクチャ](docs/ARCHITECTURE.md) | 技術設計・API設計・コンポーネント設計 |
| [ロードマップ](docs/ROADMAP.md) | Phase別の開発計画・タスク一覧 |
| [DBスキーマ](docs/DATABASE_SCHEMA.md) | Supabaseのテーブル設計 |
| [開発ガイド](docs/DEVELOPMENT_GUIDE.md) | 環境構築・Git運用・デプロイ手順 |
| [コントリビュート](CONTRIBUTING.md) | PRルール・コードスタイル・レビュー基準 |

---

## 開発フェーズ

```
Phase 1  ✅ 完了    MVP — 6体AI社員・24メニュー・SSEストリーミング・Vercel本番稼働
Phase 2  🔜 進行中  認証・DB — Supabase + Google認証 + マルチテナント
Phase 3  🔮 予定    Agentic化 — Tool Use + マルチエージェント
Phase 4  🔮 予定    外部連携 — Slack / LINE / X API
```

詳細は [ROADMAP.md](docs/ROADMAP.md) を参照。

---

## 開発に参加する

[CONTRIBUTING.md](CONTRIBUTING.md) を読んでから始めてください。

**担当メンバー:**
- 小川 — 開発・DX全般
- 斎藤 — AI・エージェント開発
- 丸山侑太（Yuta） — JARVIS設計・要件定義

---

## ライセンス

REQS Lab プロプライエタリ。無断複製・転用禁止。

---

*REQS Lab © 2026*
