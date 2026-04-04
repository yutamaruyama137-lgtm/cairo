# CAIRO — 開発・Git運用ガイド

**最終更新:** 2026-04-01

このガイドはCAIROの開発に参加するメンバー向けです。
環境構築・Git運用・デプロイ手順を説明します。

---

## 1. 開発環境のセットアップ

### 前提条件

| ツール | バージョン | 確認コマンド |
|---|---|---|
| Node.js | 18.x 以上 | `node -v` |
| npm | 9.x 以上 | `npm -v` |
| Git | 任意 | `git --version` |

### セットアップ手順

```bash
# 1. リポジトリをクローン
git clone https://github.com/yutamaruyama137-lgtm/cairo.git
cd cairo

# 2. 依存関係をインストール
npm install

# 3. 環境変数を設定
cp .env.local.example .env.local
# → .env.local を編集（次のセクション参照）

# 4. 開発サーバーを起動
npm run dev
# → http://localhost:3000 で動作確認
```

### 環境変数の設定

`.env.local` を開いて最低限 `ANTHROPIC_API_KEY` を設定する：

```env
# 必須（これだけあれば動く）
ANTHROPIC_API_KEY=sk-ant-api03-...

# Phase 2 以降（今は設定不要）
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

> **APIキーなしでも動作します。** 未設定の場合、モックレスポンスが返されます（開発・確認用途に使えます）。

---

## 2. よく使うコマンド

```bash
# 開発サーバー起動
npm run dev

# TypeScript 型チェック
npx tsc --noEmit

# ESLint チェック
npm run lint

# ビルド確認（本番と同じ）
npm run build

# ビルド後のサーバー起動
npm run start
```

---

## 3. Git 運用ルール

### ブランチ構成

```
main        ← 本番環境（Vercel自動デプロイ）
  └── develop    ← 統合ブランチ
       ├── feature/xxx   ← 機能開発
       ├── fix/xxx       ← バグ修正
       └── chore/xxx     ← 設定・ドキュメント変更
```

### 日々の開発フロー

```bash
# 1. develop から作業ブランチを作成
git checkout develop
git pull origin develop
git checkout -b feature/phase2-supabase-setup

# 2. 開発・コミット
git add <変更ファイル>
git commit -m "feat: Supabase テナントテーブルを追加"

# 3. プッシュ
git push origin feature/phase2-supabase-setup

# 4. GitHub でPRを作成（develop へのPR）
# → CONTRIBUTING.md のPRテンプレートを使う
```

### コミットメッセージの形式

```
feat: 新機能を追加
fix: バグを修正
chore: 設定変更・ドキュメント更新
refactor: リファクタリング（動作変更なし）
test: テストの追加・変更
```

例：
```
feat: Supabase テナントテーブルを追加
fix: チャット画面でストリーミングが途中で止まる問題を修正
chore: .env.local.example にPhase2の環境変数を追記
```

### マージルール

| From | To | ルール |
|---|---|---|
| `feature/*` | `develop` | squash merge / 1名レビュー必須 |
| `fix/*` | `develop` | squash merge / 1名レビュー必須 |
| `develop` | `main` | 通常merge / 丸山侑太の承認必須 |

**`main` への直接pushは禁止。**

---

## 4. デプロイ

### 本番デプロイ（Vercel）

```bash
# main にマージされると自動デプロイされる
git checkout main
git merge develop
git push origin main
# → Vercel が自動でビルド・デプロイ
# → https://cairo-zybd.vercel.app/ で反映確認
```

### Vercel の確認

- ダッシュボード: https://vercel.com/dashboard
- デプロイログ: Vercel ダッシュボード → CAIRO プロジェクト → Deployments

### 環境変数の設定（Vercel）

本番環境の環境変数は `.env.local` ではなく Vercel ダッシュボードで設定する：

1. Vercel ダッシュボード → CAIRO プロジェクト → Settings → Environment Variables
2. `ANTHROPIC_API_KEY` などを追加
3. 再デプロイ（Deploy ボタン）

---

## 5. コード規約

### TypeScript

```typescript
// NG: any型を使わない
const data: any = response;

// OK: 型を定義する
const data: MenuItem = response;

// NG: 戻り値の型を省略しない
async function fetchMenu(id: string) {

// OK: 戻り値の型を明示する
async function fetchMenu(id: string): Promise<MenuItem> {
```

### データアクセス

```typescript
// NG: data/ を直接importする（Supabase移行時に困る）
import { characters } from '@/data/characters';

// OK: lib/db/ を経由する（抽象化されている）
import { getCharacters } from '@/lib/db';
```

### API ルート

```typescript
// NG: 非ストリーミングで返す
return NextResponse.json({ output: result });

// OK: ストリーミングで返す（UX向上のため）
return new Response(stream, {
  headers: { 'Content-Type': 'text/plain; charset=utf-8' }
});
```

### コンポーネント

- `'use client'` は最小限に（サーバーコンポーネント優先）
- 1ファイル = 1コンポーネント
- コンポーネント名はPascalCase: `MenuForm.tsx`

---

## 6. よくある問題と解決策

### Q: `npm run dev` でエラーが出る

```bash
# node_modules を削除して再インストール
rm -rf node_modules
npm install
```

### Q: TypeScript エラーが大量に出る

```bash
# 型チェックで詳細を確認
npx tsc --noEmit

# 多くの場合は import 文の誤りか型定義の欠落
```

### Q: Claude API が動かない

1. `.env.local` に `ANTHROPIC_API_KEY` が設定されているか確認
2. APIキーが `sk-ant-` で始まっているか確認
3. APIキーの権限・クレジット残高を確認（https://console.anthropic.com/）
4. 未設定の場合はモックレスポンスが返るので開発は続けられる

### Q: Vercel デプロイが失敗する

1. Vercel ダッシュボードのビルドログを確認
2. `npm run build` がローカルで成功するか確認
3. 環境変数が Vercel に設定されているか確認

---

## 7. 開発環境のディレクトリ構成（参考）

```
# REQS-CC-company（親リポジトリ）での位置
REQS-CC-company/
└── dev/
    └── cairo/   ← このリポジトリ

# 独立リポジトリとして使う場合
cairo/            ← このディレクトリがリポジトリルート
```

将来的に `REQS-CC-company/dev/cairo/` から独立して `cairo/` として独立リポジトリ化予定。

---

## 8. 連絡先・相談先

| 内容 | 連絡先 |
|---|---|
| コード・技術的な質問 | GitHub Issues |
| 緊急バグ | Slack `#cairo-dev` |
| 設計・要件の相談 | 丸山侑太（Yuta） |
| AI・エージェント設計 | 斎藤 |
| 開発・DX全般 | 小川 |

---

*最終更新: 2026-04-01*
