# CAIRO — Claude Code 開発ガイド

**最終更新:** 2026-04-01
**本番URL:** https://cairo.vercel.app/
**リポジトリ:** https://github.com/yutamaruyama137-lgtm/cairo

---

## このプロジェクトについて

REQS Lab が開発する「AI社員 SaaS」。
中小企業・商店街向けに、会社専用のAI社員（6体）を提供するWebアプリ。
Next.js 14 + Claude API（claude-sonnet-4-6）+ Vercel 構成。

詳細は以下のドキュメントを参照：
- [製品仕様書](docs/PRODUCT_SPEC.md) — サービス概要・競合分析・料金プラン
- [技術アーキテクチャ](docs/ARCHITECTURE.md) — システム設計・API設計
- [ロードマップ](docs/ROADMAP.md) — Phase別の開発計画
- [DBスキーマ](docs/DATABASE_SCHEMA.md) — Supabaseのテーブル設計
- [開発ガイド](docs/DEVELOPMENT_GUIDE.md) — 環境構築・Git運用・デプロイ

---

## 現在の実装フェーズ

```
Phase 1 ✅ 完了
  - 6体のAI社員・24メニュー実装
  - チャットUI + ストリーミング出力（SSE）
  - HTMLプレビュー機能（iframe srcDoc）
  - Vercel本番デプロイ済み

Phase 2 🔜 最優先
  - Supabase導入（tenants / users / menu_executions テーブル）
  - NextAuth.js v5 でGoogleログイン実装
  - data/characters.ts → Supabase: tenant_agents に移行
  - data/menus.ts → Supabase: menus に移行
  - サブドメイン対応（shibuya.cairo-ai.com など）
  - middleware.ts でテナント判定

Phase 3 🔮 Agentic化
  - lib/tools/ のツール実装（現在スタブ）
  - lib/orchestrator.ts の本実装（Director Agent）
  - lib/agents/ の各エージェントにTool Use追加
  - マルチエージェント連携フロー

Phase 4 🔮 外部連携
  - Slack / LINE WORKS連携
  - X API連携（SNS投稿直接送信）
  - 管理コンソール
```

---

## ファイル構成

```
cairo/
│
├── CLAUDE.md                     ← このファイル（Claude Codeへの指示）
├── README.md                     ← プロジェクト概要・クイックスタート
├── CONTRIBUTING.md               ← 共同開発ルール・PRガイドライン
│
├── app/                          ← Next.js App Router
│   ├── page.tsx                  ← トップ（AI社員一覧）
│   ├── layout.tsx                ← グローバルレイアウト
│   ├── [characterId]/
│   │   └── page.tsx              ← AI社員の仕事メニュー一覧
│   ├── chat/page.tsx             ← チャット・メニュー実行画面
│   ├── admin/page.tsx            ← 管理画面（Phase 2〜）
│   └── api/
│       ├── execute/route.ts      ← ✅ メニュー実行API（現在のメイン）
│       ├── chat/route.ts         ← チャットAPI
│       └── agent/run/route.ts   ← 🔜 Phase 3: Agenticループ
│
├── components/                   ← UIコンポーネント
│   ├── CharacterCard.tsx
│   ├── CharacterAvatar.tsx
│   ├── MenuCard.tsx
│   ├── MenuForm.tsx              ← 入力フォーム（動的生成）
│   └── ResultDisplay.tsx         ← 結果表示（MD + HTMLプレビュー）
│
├── data/                         ← ⚠️ 静的データ（Phase 2でSupabase移行）
│   ├── characters.ts             ← 6体のAI社員定義 → Supabase: tenant_agents
│   └── menus.ts                  ← 24メニュー定義 → Supabase: menus
│
├── lib/                          ← コアロジック
│   ├── claude.ts                 ← ✅ Claude APIラッパー
│   ├── cn.ts                     ← Tailwindクラス結合ユーティリティ
│   ├── db/                       ← 🔜 Phase 2: DBアクセス抽象化レイヤー
│   │   ├── index.ts
│   │   ├── tenants.ts
│   │   ├── menus.ts
│   │   └── tasks.ts
│   ├── agents/                   ← 🔮 Phase 3: 各AI社員のエージェント設定
│   │   ├── base.ts               ← ベース型定義
│   │   └── jin.ts / ai.ts / ...  ← 各エージェント（TODO）
│   ├── tools/                    ← 🔮 Phase 3: Claude Tool Use定義
│   │   ├── index.ts
│   │   ├── knowledge.ts          ← RAG検索ツール
│   │   └── ...
│   ├── workflows/                ← 🔮 Phase 3: ワークフローエンジン
│   │   ├── types.ts
│   │   └── engine.ts
│   └── orchestrator.ts           ← 🔮 Phase 3: マルチエージェント指揮
│
├── config/
│   └── tenants/                  ← テナント設定JSON（Phase 2でSupabase移行）
│       ├── default.json
│       └── attranic.json
│
├── types/
│   ├── index.ts                  ← ✅ 現在の型定義
│   └── supabase.ts               ← 🔜 Phase 2: Supabase型定義（準備済み）
│
├── public/
│   └── avatars/                  ← 6体のSVGアバター
│
└── docs/                         ← ドキュメント
    ├── PRODUCT_SPEC.md
    ├── ARCHITECTURE.md
    ├── ROADMAP.md
    ├── DATABASE_SCHEMA.md
    └── DEVELOPMENT_GUIDE.md
```

---

## Claude Codeへの実装ルール

### 1. データアクセスは lib/db/ を経由する

```typescript
// NG: data/ を直接 import する
import { characters } from '@/data/characters';

// OK: lib/db/ を経由（将来のSupabase移行で壊れない）
import { getCharacters } from '@/lib/db';
```

`data/` は現在の静的データ定義。Phase 2でSupabaseに移行する。
コードを追加するときは必ず「Supabase移行後も動く設計」にすること。

### 2. Claude APIはストリーミングで呼ぶ

```typescript
// NG: generateText() は使わない（UX悪化）
const result = await generateText({ systemPrompt, userPrompt });

// OK: streamText() を使う
for await (const chunk of streamText({ systemPrompt, userPrompt })) {
  // ストリーミング出力
}
```

### 3. テナントIDを常に意識する

```typescript
// すべての処理で tenant_id を持たせる
const execution = {
  tenant_id: tenantId,  // 必須
  menu_id: menuId,
  inputs: inputs,
  // ...
};
```

### 4. 新しいAPIは app/api/ に追加する

Agenticな処理は `app/api/agent/run/route.ts` に実装する。

### 5. Phase 3スタブは変更しない

`lib/agents/`, `lib/tools/`, `lib/workflows/`, `lib/orchestrator.ts` のスタブは
Phase 3の設計意図が込められているため、Phase 2作業中は構造を変えない。
TODOコメントを実装に切り替えるだけでよい。

---

## 環境変数

```env
# 必須（Phase 1）
ANTHROPIC_API_KEY=sk-ant-...

# Phase 2 以降
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=https://cairo.vercel.app
NEXT_PUBLIC_APP_URL=https://cairo.vercel.app
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

# Phase 3 以降
SLACK_BOT_TOKEN=xoxb-...
X_API_KEY=...
```

---

## よく使うコマンド

```bash
npm run dev          # 開発サーバー（localhost:3000）
npx tsc --noEmit     # 型チェック
npm run lint         # ESLintチェック
npm run build        # ビルド確認
git push origin main  # 本番デプロイ（Vercel自動）
```

---

## 設計の大原則

1. **データとコードを分離する** — `data/` の内容はいつでもDBに移せる形で書く
2. **テナントを意識する** — すべての処理で `tenant_id` を持たせる
3. **Agenticへの拡張を前提にする** — 1ショット処理でも将来 `lib/agents/` を経由する設計に
4. **ストリーミングファースト** — ユーザーは待てない。必ずSSEで返す

---

*このCLAUDE.mdはJARVIS（REQS Lab AI秘書）が整備した。変更時はこのファイルも更新すること。*
