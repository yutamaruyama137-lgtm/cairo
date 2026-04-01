# CONTRIBUTING — 共同開発ガイドライン

このドキュメントはCAIROの共同開発に参加するすべてのメンバーへの指針です。
コードを書く前に必ず読んでください。

---

## ブランチ戦略

### ブランチ構成

```
main（旧 master）     本番環境（Vercel自動デプロイ）
  └── develop         統合ブランチ（レビュー待ちのコードが集まる）
       ├── feature/*  新機能開発
       ├── fix/*      バグ修正
       └── chore/*    設定・ドキュメント変更
```

### ブランチ命名規則

```bash
# 新機能
feature/phase2-supabase-setup
feature/phase2-google-auth
feature/phase2-tenant-management

# バグ修正
fix/streaming-timeout
fix/menu-form-validation

# 設定・ドキュメント
chore/update-env-example
chore/add-roadmap-doc
```

---

## PR（プルリクエスト）ルール

### 1. PRの粒度

- **1PR = 1つの機能・修正**
- 複数の機能を1つのPRに混ぜない
- レビュアーが30分以内でレビューできるサイズにする

### 2. PRタイトル

```
[Phase2] Supabaseプロジェクト初期設定・テーブル作成
[Fix] ストリーミング途中でタイムアウトする問題を修正
[Chore] .env.local.example にPhase3の環境変数を追記
```

### 3. PRの説明

以下のテンプレートを使う：

```markdown
## 変更内容
- Supabaseプロジェクトを作成してmigrationsを追加
- tenants / users / menu_executions テーブルを設計

## 動作確認
- [ ] ローカルでnpm run devが起動する
- [ ] TypeScriptエラーなし（npx tsc --noEmit）
- [ ] 対象機能が期待通り動作する

## レビューで見てほしいポイント
- RLSポリシーの設計が正しいか確認してほしい
```

### 4. マージフロー

```
feature/* → develop（squash merge）
develop → main（通常merge、リリース時）
```

- `main` への直接pushは禁止
- `develop` へのPRは最低1名のレビュー承認が必要
- `main` へのPRは丸山侑太の承認が必要

---

## 開発環境セットアップ

詳細は [docs/DEVELOPMENT_GUIDE.md](docs/DEVELOPMENT_GUIDE.md) を参照。

```bash
git clone https://github.com/yutamaruyama137-lgtm/cairo.git
cd cairo
npm install
cp .env.local.example .env.local
# .env.local を編集
npm run dev
```

---

## コードスタイル

### TypeScript

- `any` 型は使わない。`unknown` を使うか型を定義する
- すべての関数に戻り値の型を明示する
- 型定義は `types/` フォルダに集約する

### コンポーネント設計

- コンポーネントは `components/` に配置
- 1ファイル = 1コンポーネント
- `'use client'` は最小限に。サーバーコンポーネントを優先する

### API設計

- 新しいAPIエンドポイントは `app/api/` に追加
- レスポンスは必ずストリーミング（`streamText()` を使う）
- エラーは適切なHTTPステータスコードで返す

### データアクセス

```typescript
// NG: data/ を直接importする
import { characters } from '@/data/characters'

// OK: lib/db/ を経由する（将来のSupabase移行に対応）
import { getCharacters } from '@/lib/db'
```

---

## コミットメッセージ

[Conventional Commits](https://www.conventionalcommits.org/) に準拠：

```
feat: Supabase テナントテーブルを追加
fix: メニューフォームのバリデーションエラーを修正
chore: package.json の依存関係を更新
docs: ロードマップを更新
refactor: Claude APIラッパーをストリーミング専用に整理
```

---

## テスト

現在（Phase 1-2）はユニットテストは任意。以下を必ず確認してから PR を出す：

- [ ] `npm run build` が成功する
- [ ] `npx tsc --noEmit` でTypeScriptエラーなし
- [ ] `npm run lint` でESLintエラーなし
- [ ] ローカルで動作確認済み

Phase 3 以降はテスト自動化を導入予定。

---

## 質問・相談

- コードに関する質問 → GitHubのIssueに書く
- 緊急のバグ → Slackの `#cairo-dev` チャンネルに報告
- 設計相談 → 丸山侑太（Yuta）に相談

---

*最終更新: 2026-04-01*
