# REQS Lab テナント実装手順書

**作成日:** 2026-04-04
**対象:** CAIRO — REQSテナントのメニュー・プロンプト設計と実装

---

## 0. この手順書の目的

REQSがCAIROを自社用ツールとして使うための「テナント設定・業務メニュー・プロンプト管理」を
ゼロから構築する手順をまとめる。

---

## 1. プロンプトの3層構造（最重要）

CAIRO上で「文書を生成する」とき、AIには以下の3つが合成されて渡される。

```
═══════════════════════════════════════════════════════
  Claude に渡るプロンプト全体像
═══════════════════════════════════════════════════════

【システムプロンプト】
  ① キャラクター設定（固定）
     → data/characters.ts
     → 「ジンです。営業部担当です。役割：〜」

  + ② テナント固有トンマナ（テナントごとに変わる）
     → Supabase: tenant_agents.system_prompt_suffix
     → 「REQSの文体・スタイル・会社情報・禁止表現」

【ユーザープロンプト】
  ③ 業務指示プロンプト（メニューごとに変わる）
     → data/menus.ts の promptTemplate
     → 「提案書を作れ。構成は〜。フォーマットは〜。」

  + ④ ユーザーが入力した値
     → フォーム（会社名・課題・金額など）

═══════════════════════════════════════════════════════
```

### 各層の役割まとめ

| 層 | 何を書くか | 保存場所 | 変更頻度 |
|---|---|---|---|
| ① キャラクター | AI社員の人格・口調 | `data/characters.ts` | ほぼ変えない |
| ② **トンマナ** | REQSの文体・会社情報・禁止事項 | Supabase `tenant_agents` | 月1回程度 |
| ③ **業務プロンプト** | 「提案書を作る」「請求書を作る」の詳細指示 | `data/menus.ts` | 改善のたびに更新 |
| ④ ユーザー入力 | 案件ごとの具体的情報 | フォーム（毎回入力） | 毎回 |

---

## 2. ② トンマナ（system_prompt_suffix）の書き方

### REQSトンマナ設定例

管理画面（`/admin`）またはSupabase直接で設定する内容：

```
【会社情報】
- 会社名: REQS Lab（レックスラボ）
- 代表: 丸山侑太
- 事業内容: AI導入支援・SaaS開発・中小企業向けAI活用コンサルティング
- ターゲット: 中小企業・商店街・スタートアップ

【文体・トンマナ】
- 文体: です・ます調で統一。体言止め禁止。
- トーン: 誠実・論理的・行動指向。難しい言葉を使わず、平易な日本語で書く。
- 構成: 結論を先に書く（PREP法）。見出しは短く。
- 数字: 必ず根拠を添える。「約〇〇%向上」より「〇〇社中〇〇社が効果を実感」。

【禁止事項】
- 過度な敬語（「〜させていただきます」の乱用）禁止
- 「〜かもしれません」「〜と思われます」などの曖昧表現禁止
- 箇条書きの乱発禁止（説明が必要な箇所は文章で書く）
- 英語カタカナ語の多用禁止（使う場合は日本語訳を添える）

【品質基準】
- 「今すぐクライアントに送れるか」を基準にする
- 具体性: 抽象的な提案ではなく、数字・期間・担当者を明記する
- 長さ: A4換算で2〜3ページ相当が目安
```

### 設定方法（2通り）

**方法A: 管理画面から設定（推奨）**
1. `https://cairo-zybd.vercel.app/admin` を開く
2. 対象のAI社員を選択
3. 「カスタムプロンプト」欄に上記を入力
4. 保存

**方法B: Supabase SQL Editorから直接設定**
```sql
UPDATE tenant_agents
SET system_prompt_suffix = '【会社情報】...'  -- 上記の内容をここに
WHERE tenant_id = '（REQSのUUID）'
  AND agent_id = 'jin';  -- 対象のAI社員ID
```

---

## 3. ③ 業務プロンプト（promptTemplate）の書き方

### REQSが必要な15メニュー一覧

#### 💼 営業・クライアント対応（characterId: "jin"）

| menu_id | タイトル | 入力項目 |
|---|---|---|
| `reqs-invoice` | 請求書・見積書作成 | 宛先・サービス内容・金額・支払期限 |
| `reqs-proposal` | 提案書・企画書作成 | 課題・提案内容・期待効果・費用感 |
| `reqs-followup` | 商談後フォローアップメール | 商談日・相手先・話した内容・次のアクション |
| `reqs-contract-check` | 契約書チェック・修正案提示 | 契約書テキスト・確認したい観点 |

#### 📝 コンテンツ・メディア（characterId: "iori"）

| menu_id | タイトル | 入力項目 |
|---|---|---|
| `reqs-note` | Note記事の構成・執筆 | テーマ・ターゲット読者・伝えたいメッセージ |
| `reqs-podcast` | ポッドキャスト台本作成 | テーマ・ゲスト情報・尺（分）・構成メモ |
| `reqs-press` | プレスリリース作成 | 発表内容・背景・会社情報・配信日 |

#### 🤖 AI導入コンサル業務（characterId: "vi"）

| menu_id | タイトル | 入力項目 |
|---|---|---|
| `reqs-hearing` | ヒアリングシート・事前質問票作成 | 業種・課題・ヒアリング目的 |
| `reqs-ai-report` | AI導入診断レポート自動生成 | 業種・業務課題・現状のIT環境・予算感 |
| `reqs-tool-compare` | ツール比較・技術選定資料作成 | 比較したいツール・選定軸・利用シーン |
| `reqs-subsidy` | 補助金・助成金情報の収集・整理 | 業種・企業規模・導入したいもの |

#### 🏢 社内オペレーション（characterId: "ai"）

| menu_id | タイトル | 入力項目 |
|---|---|---|
| `reqs-agenda` | 週次・月次MTGアジェンダ作成 | MTG種別・参加者・前回の積み残し・今週のトピック |
| `reqs-manual` | マニュアル・手順書作成 | 業務名・手順の概要・注意点 |
| `reqs-billing` | 請求書発行・送付・管理 | 取引先・金額・発行月・支払い期限 |
| `reqs-monthly` | 月次収支サマリー自動作成 | 月・収入項目・支出項目・メモ |

---

### promptTemplateの書き方原則

**良いプロンプトの構造：**

```
① 役割宣言（何を作るのか）
② 入力情報の受け取り（{{変数名}}で埋め込む）
③ 出力構成の指定（見出し・順序）
④ フォーマット指定（マークダウン/表/文章）
⑤ 品質基準（「今すぐ使えるレベルで」など）
```

**例：提案書プロンプト**

```
以下の情報をもとに、REQS Labとしての提案書を作成してください。

【案件情報】
提案先: {{company}}
クライアントの課題: {{problem}}
提案内容: {{service}}
費用感: {{price}}

【出力構成】
1. エグゼクティブサマリー（3行以内）
2. 現状の課題整理
3. REQS Labの提案（具体的な解決策）
4. 期待される効果（数値目標を含む）
5. 実施スケジュール（フェーズ別）
6. 費用・契約形態
7. 次のアクション

【品質基準】
- 今日クライアントに送付できるレベルで作成すること
- 抽象的な提案禁止。具体的な施策・期間・担当を明記すること
- マークダウン形式で出力すること
```

---

## 4. 実装ステップ（作業順）

### Step 1: SupabaseにREQSテナントを作成

Supabase Dashboard → SQL Editor で実行：

```sql
-- REQSテナント作成
INSERT INTO tenants (subdomain, name, plan, monthly_execution_limit, is_active)
VALUES ('reqs', 'REQS Lab', 'enterprise', NULL, true)
RETURNING id;
-- → 返ってきたUUIDをメモする（以降 REQS_TENANT_ID と呼ぶ）
```

### Step 2: REQSのAI社員設定を登録

```sql
-- AI社員6体をREQSテナントに登録（REQS_TENANT_IDを実際のUUIDに置き換える）
INSERT INTO tenant_agents (tenant_id, agent_id, is_enabled, system_prompt_suffix)
VALUES
  ('REQS_TENANT_ID', 'jin',  true, ''),  -- 営業担当
  ('REQS_TENANT_ID', 'ai',   true, ''),  -- 経理担当
  ('REQS_TENANT_ID', 'rin',  true, ''),  -- 法務担当
  ('REQS_TENANT_ID', 'vi',   true, ''),  -- 技術・AIコンサル担当
  ('REQS_TENANT_ID', 'iori', true, ''),  -- コンテンツ担当
  ('REQS_TENANT_ID', 'saki', true, '');  -- その他担当
```

### Step 3: execute routeにトンマナ注入ロジックを追加

**現状の問題点：**
`app/api/execute/route.ts` は `tenant_agents.system_prompt_suffix` を
参照していない。ここを修正する必要がある。

**修正内容（app/api/execute/route.ts）：**

```typescript
// 追加: tenant_agentsからsystem_prompt_suffixを取得
const { data: agentConfig } = await supabaseAdmin
  .from("tenant_agents")
  .select("system_prompt_suffix")
  .eq("tenant_id", tenantId)
  .eq("agent_id", menu.characterId)
  .single();

const tonmana = agentConfig?.system_prompt_suffix ?? "";

// systemPromptにトンマナを追加
const systemPrompt = `あなたはAI社員「${character.name}」です。${character.department}の担当です。
役割：${character.role}

【行動指針】
- 入力された情報をもとに、すぐに使える品質の成果物を出力する
- 曖昧な表現を避け、具体的に記述する
- 日本のビジネス慣習を理解した内容にする
- マークダウン形式で、見やすく整理して出力する

${tonmana}

${character.greeting}`;
```

### Step 4: data/menus.tsにREQSメニューを追加

上記「3. 業務プロンプト一覧」の15メニューを `data/menus.ts` に追記する。

各メニューの形式：

```typescript
{
  id: "reqs-proposal",
  characterId: "jin",
  title: "提案書・企画書作成",
  description: "REQSとしてのクライアント向け提案書を作成します",
  icon: "📋",
  estimatedSeconds: 45,
  humanMinutes: 120,
  category: "営業・クライアント対応",
  inputs: [
    { key: "company", label: "提案先の会社名", type: "text", required: true },
    { key: "problem", label: "クライアントの課題", type: "textarea", required: true },
    { key: "service", label: "提案内容", type: "textarea", required: true },
    { key: "price", label: "費用感", type: "text", required: false },
  ],
  promptTemplate: `以下の情報をもとに、REQS Labとしての提案書を作成してください。
...（上記「良いプロンプトの例」の内容）`,
  outputLabel: "提案書",
},
```

### Step 5: 管理画面でトンマナを設定

1. `https://cairo-zybd.vercel.app/admin` を開く
2. 各AI社員のカスタムプロンプト欄に「2. トンマナ設定例」の内容を入力
3. AI社員ごとに役割に応じたトンマナを設定（営業用・技術用など微調整）

### Step 6: 動作確認

1. ローカル（`npm run dev`）でメニューが表示されるか確認
2. 実際にメニューを実行してREQSのトンマナが反映されているか確認
3. 問題なければ `git push` → Vercel自動デプロイ

---

## 5. 今後の拡張（Phase 3以降）

現状はメニューのプロンプトを `data/menus.ts`（コード）に書いているが、
将来的にはSupabaseの `menus` テーブルに移行して、
管理画面から編集できるようにする。

```
現状（Phase 2）:
  promptTemplate → data/menus.ts（コードを変更してデプロイ必要）

将来（Phase 3〜）:
  promptTemplate → Supabase menus テーブル（管理画面からリアルタイム編集可能）
```

**menus テーブル（追加予定）：**

```sql
CREATE TABLE menus (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        UUID REFERENCES tenants(id),   -- NULLは全テナント共通
  menu_id          TEXT NOT NULL,
  character_id     TEXT NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT,
  prompt_template  TEXT NOT NULL,                 -- ← ここにプロンプトを保存
  inputs_schema    JSONB NOT NULL,
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, menu_id)
);
```

---

## 6. ファイル変更サマリー

| ファイル | 変更内容 | タイミング |
|---|---|---|
| `app/api/execute/route.ts` | トンマナ注入ロジック追加 | Step 3 |
| `data/menus.ts` | REQSの15メニュー追加 | Step 4 |
| Supabase `tenants` | REQSテナント行を追加 | Step 1 |
| Supabase `tenant_agents` | REQS×6エージェント行を追加 | Step 2 |
| Supabase `tenant_agents.system_prompt_suffix` | REQSトンマナ文字列を設定 | Step 5 |

---

*作成: JARVIS (REQS Lab AI秘書) — 2026-04-04*
