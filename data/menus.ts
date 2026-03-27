import { MenuItem } from "@/types";

export const menus: MenuItem[] = [
  // ===== 成瀬（営業部）=====
  {
    id: "jin-minutes",
    characterId: "jin",
    title: "議事録を作る",
    description: "会議の内容を整理して、きれいな議事録を作成します",
    icon: "📝",
    estimatedSeconds: 30,
    inputs: [
      { key: "date", label: "会議の日付", type: "text", placeholder: "例：2026年3月27日", required: true },
      { key: "attendees", label: "参加者", type: "text", placeholder: "例：田中、鈴木、山田", required: true },
      { key: "agenda", label: "話し合った内容", type: "textarea", placeholder: "会議で話し合ったことを、箇条書きでも構いません", required: true },
      { key: "decisions", label: "決まったこと", type: "textarea", placeholder: "会議で決まったことを教えてください", required: false, helpText: "決まったことがあれば入力してください" },
    ],
    promptTemplate: `以下の情報をもとに、きれいな議事録を作成してください。

会議日: {{date}}
参加者: {{attendees}}
話し合った内容: {{agenda}}
決定事項: {{decisions}}

【出力形式】
- 日時・参加者を冒頭に記載
- 議題ごとに整理
- 決定事項を明確に記載
- 次回アクションを列挙
読みやすいマークダウン形式で出力してください。`,
    outputLabel: "議事録",
  },
  {
    id: "jin-proposal",
    characterId: "jin",
    title: "提案書を作る",
    description: "お客様への提案書を自動で作成します",
    icon: "📋",
    estimatedSeconds: 45,
    inputs: [
      { key: "company", label: "お客様の会社名", type: "text", placeholder: "例：株式会社〇〇", required: true },
      { key: "problem", label: "お客様のお悩み・課題", type: "textarea", placeholder: "例：人手不足で業務が回らない、売上が伸び悩んでいる", required: true },
      { key: "service", label: "提案したいサービス・商品", type: "text", placeholder: "例：業務効率化AIツール", required: true },
      { key: "price", label: "費用感", type: "text", placeholder: "例：月額10万円〜", required: false },
    ],
    promptTemplate: `以下の情報をもとに、丁寧でわかりやすい提案書を作成してください。

提案先: {{company}}
課題・悩み: {{problem}}
提案サービス: {{service}}
費用: {{price}}

【構成】
1. はじめに（現状の課題整理）
2. 解決策のご提案
3. 期待される効果
4. 費用・スケジュール
5. まとめ

読みやすいマークダウン形式で出力してください。`,
    outputLabel: "提案書",
  },
  {
    id: "jin-email",
    characterId: "jin",
    title: "営業メールを書く",
    description: "お客様への営業メールを作成します",
    icon: "✉️",
    estimatedSeconds: 20,
    inputs: [
      { key: "recipient", label: "送り先のお名前・会社名", type: "text", placeholder: "例：株式会社〇〇 田中様", required: true },
      { key: "purpose", label: "メールの目的", type: "select", placeholder: "", required: true, options: ["初回ご挨拶", "提案のご案内", "お礼・フォローアップ", "アポイントのお願い", "資料送付のご案内"] },
      { key: "points", label: "伝えたいポイント", type: "textarea", placeholder: "例：新しいサービスを紹介したい、先日の商談のお礼", required: true },
    ],
    promptTemplate: `以下の情報をもとに、丁寧でビジネスらしい営業メールを作成してください。

送り先: {{recipient}}
目的: {{purpose}}
伝えたいポイント: {{points}}

件名と本文を含めて、すぐに送れる形式で出力してください。`,
    outputLabel: "営業メール",
  },
  {
    id: "jin-research",
    characterId: "jin",
    title: "営業先を調べる",
    description: "訪問予定の会社について調査レポートを作成します",
    icon: "🔍",
    estimatedSeconds: 40,
    inputs: [
      { key: "company", label: "調べたい会社名", type: "text", placeholder: "例：株式会社〇〇", required: true },
      { key: "industry", label: "業種", type: "text", placeholder: "例：飲食業、製造業、小売業", required: true },
      { key: "purpose", label: "訪問の目的", type: "textarea", placeholder: "例：新サービスを提案したい、既存契約の更新", required: true },
    ],
    promptTemplate: `営業訪問に向けて、以下の会社の調査レポートを作成してください。

会社名: {{company}}
業種: {{industry}}
訪問目的: {{purpose}}

【調査項目】
1. 想定される課題・ニーズ
2. 業界のトレンド・状況
3. 提案のポイント
4. 想定される質問と回答
5. アポイントで確認すべきこと

実践的で役立つ内容を出力してください。`,
    outputLabel: "営業先調査レポート",
  },

  // ===== 正木（経理部）=====
  {
    id: "ai-voucher",
    characterId: "ai",
    title: "証憑を読み取る",
    description: "領収書・請求書の内容を整理して仕訳を作成します",
    icon: "🧾",
    estimatedSeconds: 25,
    inputs: [
      { key: "content", label: "証憑の内容", type: "textarea", placeholder: "例：〇〇株式会社 請求書 2026年3月分 ソフトウェアライセンス料 50,000円", required: true, helpText: "証憑に書いてある内容をそのまま入力してください" },
      { key: "date", label: "日付", type: "text", placeholder: "例：2026年3月27日", required: true },
    ],
    promptTemplate: `以下の証憑情報をもとに、会計仕訳を作成してください。

証憑内容: {{content}}
日付: {{date}}

【出力内容】
- 仕訳（借方・貸方・金額・摘要）
- 勘定科目の説明
- 注意点があれば記載

わかりやすい形式で出力してください。`,
    outputLabel: "仕訳データ",
  },
  {
    id: "ai-cashflow",
    characterId: "ai",
    title: "資金繰りを予測する",
    description: "今後の資金繰り予測レポートを作成します",
    icon: "💰",
    estimatedSeconds: 40,
    inputs: [
      { key: "current_balance", label: "現在の預金残高", type: "text", placeholder: "例：500万円", required: true },
      { key: "monthly_income", label: "月の収入予定", type: "textarea", placeholder: "例：売上入金 200万円（3月末）、補助金 50万円（4月初旬）", required: true },
      { key: "monthly_expense", label: "月の支出予定", type: "textarea", placeholder: "例：家賃 30万円、人件費 150万円、仕入れ 80万円", required: true },
      { key: "period", label: "予測期間", type: "select", placeholder: "", required: true, options: ["1ヶ月", "3ヶ月", "6ヶ月"] },
    ],
    promptTemplate: `以下の情報をもとに資金繰り予測レポートを作成してください。

現在の残高: {{current_balance}}
収入予定: {{monthly_income}}
支出予定: {{monthly_expense}}
予測期間: {{period}}

【出力内容】
- 月別の収支予測表
- 資金ショートのリスク分析
- 改善提案

わかりやすい表形式で出力してください。`,
    outputLabel: "資金繰り予測レポート",
  },
  {
    id: "ai-journal",
    characterId: "ai",
    title: "仕訳を作成する",
    description: "取引内容を入力するだけで仕訳を作成します",
    icon: "📒",
    estimatedSeconds: 20,
    inputs: [
      { key: "transaction", label: "取引の内容", type: "textarea", placeholder: "例：事務所の家賃30万円を銀行振込で支払った", required: true },
      { key: "amount", label: "金額", type: "text", placeholder: "例：300,000円", required: true },
      { key: "date", label: "取引日", type: "text", placeholder: "例：2026年3月27日", required: true },
    ],
    promptTemplate: `以下の取引について仕訳を作成してください。

取引内容: {{transaction}}
金額: {{amount}}
取引日: {{date}}

【出力形式】
借方: [勘定科目] [金額]
貸方: [勘定科目] [金額]
摘要: [内容]
消費税: [該当する場合]
注意事項: [あれば]`,
    outputLabel: "仕訳",
  },
  {
    id: "ai-alert",
    characterId: "ai",
    title: "異常値をチェックする",
    description: "経費や売上データの異常値を検出・分析します",
    icon: "⚠️",
    estimatedSeconds: 30,
    inputs: [
      { key: "data", label: "チェックしたいデータ", type: "textarea", placeholder: "例：1月売上100万、2月売上95万、3月売上200万、4月売上98万", required: true },
      { key: "category", label: "データの種類", type: "select", placeholder: "", required: true, options: ["売上", "経費", "利益", "在庫", "その他"] },
    ],
    promptTemplate: `以下のデータを分析し、異常値や注目すべき変動を報告してください。

データ: {{data}}
種類: {{category}}

【分析内容】
- 異常値・外れ値の検出
- 変動の原因として考えられること
- 注意すべきポイント
- 推奨アクション

わかりやすく報告してください。`,
    outputLabel: "異常値分析レポート",
  },

  // ===== 守谷（法務部）=====
  {
    id: "rin-contract",
    characterId: "rin",
    title: "契約書を作る",
    description: "契約書の草案を自動作成します",
    icon: "📄",
    estimatedSeconds: 50,
    inputs: [
      { key: "contract_type", label: "契約の種類", type: "select", placeholder: "", required: true, options: ["業務委託契約", "秘密保持契約（NDA）", "売買契約", "賃貸借契約", "雇用契約", "その他"] },
      { key: "party_a", label: "甲（依頼側）の名前・会社名", type: "text", placeholder: "例：株式会社〇〇", required: true },
      { key: "party_b", label: "乙（受託側）の名前・会社名", type: "text", placeholder: "例：株式会社△△", required: true },
      { key: "content", label: "契約の内容・条件", type: "textarea", placeholder: "例：Webサイト制作を委託する。期間は3ヶ月、報酬は50万円", required: true },
    ],
    promptTemplate: `以下の情報をもとに{{contract_type}}の草案を作成してください。

甲: {{party_a}}
乙: {{party_b}}
契約内容: {{content}}

一般的な{{contract_type}}に必要な条項を含めた草案を出力してください。
※これは参考草案です。正式締結前に弁護士にご確認ください。`,
    outputLabel: "契約書草案",
  },
  {
    id: "rin-risk",
    characterId: "rin",
    title: "リスクをチェックする",
    description: "契約書や文書のリスクを確認します",
    icon: "🛡️",
    estimatedSeconds: 40,
    inputs: [
      { key: "document", label: "チェックしたい文書の内容", type: "textarea", placeholder: "契約書や文書の内容をここに貼り付けてください", required: true },
      { key: "concern", label: "特に心配なこと", type: "textarea", placeholder: "例：解約条件が不明確、損害賠償の範囲が心配", required: false },
    ],
    promptTemplate: `以下の文書についてリスクチェックを行ってください。

文書内容:
{{document}}

特に心配な点: {{concern}}

【チェック項目】
- 不利な条件・条項はないか
- 曖昧な表現はないか
- 抜けている重要事項はないか
- 修正を推奨する箇所

わかりやすく説明してください。`,
    outputLabel: "リスクチェックレポート",
  },
  {
    id: "rin-legal",
    characterId: "rin",
    title: "法的相談をする",
    description: "法的な疑問・悩みに回答します",
    icon: "💬",
    estimatedSeconds: 35,
    inputs: [
      { key: "question", label: "相談したい内容", type: "textarea", placeholder: "例：アルバイトを急に解雇したい場合、どんな手続きが必要ですか？", required: true },
      { key: "situation", label: "状況の詳細", type: "textarea", placeholder: "詳しい状況があれば教えてください", required: false },
    ],
    promptTemplate: `以下の法的相談に回答してください。

相談内容: {{question}}
状況: {{situation}}

【回答形式】
- 一般的な法律上のポイント
- 注意すべき点
- 推奨するアクション
- 専門家への相談が必要なケース

※一般的な情報提供であり、法律相談ではありません。重要な判断は弁護士にご相談ください。`,
    outputLabel: "法的相談の回答",
  },
  {
    id: "rin-lawcheck",
    characterId: "rin",
    title: "法令の変更を確認する",
    description: "関連する法令の改正・変更点を確認します",
    icon: "📰",
    estimatedSeconds: 30,
    inputs: [
      { key: "law_area", label: "確認したい法令の分野", type: "select", placeholder: "", required: true, options: ["労働法・雇用関係", "税法・会計", "個人情報保護法", "消費者契約法", "会社法", "IT・情報セキュリティ関連", "その他"] },
      { key: "business", label: "事業の内容", type: "text", placeholder: "例：飲食店経営、EC通販、人材派遣", required: true },
    ],
    promptTemplate: `{{law_area}}に関する最近の主要な法改正・変更点を教えてください。

事業内容: {{business}}

【出力内容】
- 主要な法改正の内容（わかりやすく）
- 事業への影響
- 対応が必要なこと
- 対応期限

中小企業の経営者が理解できるようにわかりやすく説明してください。`,
    outputLabel: "法令変更確認レポート",
  },

  // ===== 工藤（技術部）=====
  {
    id: "vi-webdesign",
    characterId: "vi",
    title: "Webデザインを考える",
    description: "Webサイトのデザイン案・構成を提案します",
    icon: "🎨",
    estimatedSeconds: 35,
    inputs: [
      { key: "business_type", label: "お店・事業の種類", type: "text", placeholder: "例：美容院、カフェ、税理士事務所", required: true },
      { key: "target", label: "ターゲットのお客様", type: "text", placeholder: "例：30〜50代の主婦、20代の若者", required: true },
      { key: "purpose", label: "Webサイトで達成したいこと", type: "textarea", placeholder: "例：予約を増やしたい、会社の信頼感を上げたい", required: true },
      { key: "image", label: "目指すイメージ", type: "text", placeholder: "例：温かみのある、プロフェッショナルな、シンプルで清潔感のある", required: false },
    ],
    promptTemplate: `以下の条件でWebサイトのデザイン案を提案してください。

業種: {{business_type}}
ターゲット: {{target}}
目的: {{purpose}}
イメージ: {{image}}

【提案内容】
- カラーパレット（3色程度）
- フォント・文字スタイルの方向性
- トップページの構成案
- 必要なページ一覧
- 参考になるデザインの特徴

具体的でわかりやすく提案してください。`,
    outputLabel: "Webデザイン提案書",
  },
  {
    id: "vi-website",
    characterId: "vi",
    title: "Webサイトを相談する",
    description: "Webサイト制作に必要なことを整理します",
    icon: "🌐",
    estimatedSeconds: 30,
    inputs: [
      { key: "purpose", label: "Webサイトを作る目的", type: "textarea", placeholder: "例：お店の紹介ページが欲しい、ネット予約できるようにしたい", required: true },
      { key: "budget", label: "おおよその予算", type: "select", placeholder: "", required: true, options: ["〜10万円", "10〜30万円", "30〜100万円", "100万円以上", "まだ決めていない"] },
      { key: "timeline", label: "いつまでに必要か", type: "text", placeholder: "例：3ヶ月後、来年の春まで", required: false },
    ],
    promptTemplate: `以下の条件でWebサイト制作の相談に回答してください。

目的: {{purpose}}
予算: {{budget}}
期限: {{timeline}}

【回答内容】
- おすすめの制作方法（WordPressなど）
- 必要な機能・ページ
- 費用の目安
- 制作の流れ・スケジュール
- 注意点・よくある失敗

初心者にもわかりやすく説明してください。`,
    outputLabel: "Webサイト相談レポート",
  },
  {
    id: "vi-app",
    characterId: "vi",
    title: "アプリ開発を相談する",
    description: "アプリのアイデアを整理して開発方針を提案します",
    icon: "📱",
    estimatedSeconds: 40,
    inputs: [
      { key: "idea", label: "作りたいアプリのアイデア", type: "textarea", placeholder: "例：スタッフのシフト管理アプリ、お客様向けポイントカードアプリ", required: true },
      { key: "users", label: "使う人（ユーザー）", type: "text", placeholder: "例：スタッフ10名、お客様100名", required: true },
      { key: "budget", label: "おおよその予算", type: "select", placeholder: "", required: true, options: ["〜30万円", "30〜100万円", "100〜300万円", "300万円以上", "未定"] },
    ],
    promptTemplate: `以下のアプリ開発について相談に回答してください。

アイデア: {{idea}}
ユーザー: {{users}}
予算: {{budget}}

【回答内容】
- アプリの機能整理（必須・あったら良い）
- 開発方法の選択肢
- 費用・期間の目安
- 成功のポイント
- 次のステップ

実践的なアドバイスをしてください。`,
    outputLabel: "アプリ開発相談レポート",
  },
  {
    id: "vi-it",
    characterId: "vi",
    title: "IT相談をする",
    description: "ITツール・デジタル化について相談できます",
    icon: "💡",
    estimatedSeconds: 25,
    inputs: [
      { key: "problem", label: "困っていること・相談したいこと", type: "textarea", placeholder: "例：紙の管理をデジタル化したい、セキュリティが心配、どのソフトを使えばいい？", required: true },
      { key: "current", label: "現在使っているIT環境", type: "text", placeholder: "例：Excelとメールのみ、特になし", required: false },
    ],
    promptTemplate: `以下のIT相談に回答してください。

悩み・相談: {{problem}}
現在の環境: {{current}}

【回答内容】
- 課題の整理
- おすすめの解決策・ツール
- 費用の目安
- 導入のポイント
- 注意事項

小規模事業者でも実践できる現実的な提案をしてください。`,
    outputLabel: "ITアドバイス",
  },

  // ===== 広瀬（マーケ部）=====
  {
    id: "iori-idea",
    characterId: "iori",
    title: "アイデアを出す",
    description: "集客・販促・企画のアイデアをたくさん出します",
    icon: "💡",
    estimatedSeconds: 25,
    inputs: [
      { key: "business", label: "お店・事業の内容", type: "text", placeholder: "例：地域の和食レストラン", required: true },
      { key: "goal", label: "達成したいこと", type: "textarea", placeholder: "例：新規のお客様を増やしたい、リピート率を上げたい", required: true },
      { key: "budget", label: "使える予算", type: "select", placeholder: "", required: true, options: ["ほぼゼロ（無料施策のみ）", "〜3万円", "3〜10万円", "10万円以上"] },
    ],
    promptTemplate: `以下の条件で集客・販促のアイデアを提案してください。

事業: {{business}}
目標: {{goal}}
予算: {{budget}}

【提案内容】
- すぐできるアイデア5個
- 中期的なアイデア3個
- それぞれの期待効果と具体的な方法

実践的で、今すぐ始められるものを中心に提案してください。`,
    outputLabel: "集客アイデア集",
  },
  {
    id: "iori-flyer",
    characterId: "iori",
    title: "チラシ文案を作る",
    description: "チラシ・ポスター・DM の文章を作成します",
    icon: "📰",
    estimatedSeconds: 30,
    inputs: [
      { key: "purpose", label: "チラシの目的", type: "text", placeholder: "例：新メニューのお知らせ、セールの告知", required: true },
      { key: "target", label: "配る相手", type: "text", placeholder: "例：近所の方、40〜60代の女性", required: true },
      { key: "message", label: "一番伝えたいこと", type: "textarea", placeholder: "例：新しいランチメニューが始まります。1,000円でボリューム満点！", required: true },
      { key: "cta", label: "してほしい行動", type: "text", placeholder: "例：来店してほしい、電話で予約してほしい", required: true },
    ],
    promptTemplate: `以下の条件でチラシ文案を作成してください。

目的: {{purpose}}
対象者: {{target}}
メッセージ: {{message}}
行動してほしいこと: {{cta}}

【出力内容】
- キャッチコピー（3案）
- 本文テキスト
- 小見出し
- CTA文（行動喚起の文章）

読む人の心が動く、温かみのある文章にしてください。`,
    outputLabel: "チラシ文案",
  },
  {
    id: "iori-banner",
    characterId: "iori",
    title: "バナー画像を指示する",
    description: "バナー・画像の制作指示書を作成します",
    icon: "🖼️",
    estimatedSeconds: 20,
    inputs: [
      { key: "purpose", label: "バナーの使い道", type: "select", placeholder: "", required: true, options: ["WebサイトのTOPバナー", "SNS投稿用画像", "広告バナー", "ヘッダー画像", "サムネイル"] },
      { key: "message", label: "バナーで伝えたいこと", type: "text", placeholder: "例：春の新メニュー登場！", required: true },
      { key: "image_style", label: "イメージ・雰囲気", type: "text", placeholder: "例：温かみのある、明るい、和風、シンプル", required: true },
    ],
    promptTemplate: `以下の条件でバナー画像の制作指示書を作成してください。

用途: {{purpose}}
メッセージ: {{message}}
雰囲気: {{image_style}}

【制作指示書の内容】
- サイズ・比率の推奨
- 配色案（カラーコード含む）
- レイアウト構成
- フォント・テキストの指示
- 画像・イラストの方向性
- デザイナーへの伝言ポイント

デザイナーに渡せる具体的な指示書にしてください。`,
    outputLabel: "バナー制作指示書",
  },
  {
    id: "iori-sns",
    characterId: "iori",
    title: "SNS投稿文を作る",
    description: "Instagram・X・Facebookの投稿文を作成します",
    icon: "📱",
    estimatedSeconds: 20,
    inputs: [
      { key: "platform", label: "投稿するSNS", type: "select", placeholder: "", required: true, options: ["Instagram", "X（Twitter）", "Facebook", "LINE公式アカウント"] },
      { key: "topic", label: "投稿したい内容・トピック", type: "textarea", placeholder: "例：新商品が入荷した、スタッフを紹介したい、お知らせがある", required: true },
      { key: "tone", label: "雰囲気・トーン", type: "select", placeholder: "", required: false, options: ["フレンドリー・親しみやすい", "プロフェッショナル", "楽しい・ポップ", "温かみのある"] },
    ],
    promptTemplate: `以下の条件で{{platform}}の投稿文を3案作成してください。

投稿内容: {{topic}}
トーン: {{tone}}

各案について：
- 本文テキスト
- ハッシュタグ（5〜10個）
- 絵文字の使い方

{{platform}}のユーザーに響く、エンゲージメントが高まる投稿文にしてください。`,
    outputLabel: "SNS投稿文",
  },

  // ===== 神谷（総務部）=====
  {
    id: "saki-rules",
    characterId: "saki",
    title: "社内規程を調べる",
    description: "就業規則・社内規程について回答します",
    icon: "📚",
    estimatedSeconds: 25,
    inputs: [
      { key: "question", label: "知りたいこと・質問", type: "textarea", placeholder: "例：有給休暇は何日取れますか？残業代の計算方法は？", required: true },
      { key: "situation", label: "どんな状況で知りたいか", type: "textarea", placeholder: "例：来月から育児休暇を取りたい、急に体調不良で休む場合", required: false },
    ],
    promptTemplate: `以下の社内規程に関する質問に回答してください。

質問: {{question}}
状況: {{situation}}

【回答形式】
- 一般的なルール・手続きの説明
- 必要な書類・申請方法
- 注意すべきポイント
- 問い合わせ先の提案

一般的な会社のルールに基づいて、わかりやすく説明してください。`,
    outputLabel: "社内規程の回答",
  },
  {
    id: "saki-expense",
    characterId: "saki",
    title: "経費精算を案内する",
    description: "経費精算の手続き・書き方を案内します",
    icon: "💳",
    estimatedSeconds: 20,
    inputs: [
      { key: "expense_type", label: "経費の種類", type: "select", placeholder: "", required: true, options: ["交通費", "接待・会食費", "消耗品費", "通信費", "研修・書籍費", "その他"] },
      { key: "amount", label: "金額", type: "text", placeholder: "例：5,400円", required: true },
      { key: "purpose", label: "使用目的", type: "text", placeholder: "例：取引先との打ち合わせ交通費", required: true },
    ],
    promptTemplate: `以下の経費精算について案内してください。

経費種類: {{expense_type}}
金額: {{amount}}
目的: {{purpose}}

【案内内容】
- 精算手続きの流れ
- 必要な書類・レシート
- 記入例（精算書の書き方）
- 注意点・よくある間違い

わかりやすいステップ形式で案内してください。`,
    outputLabel: "経費精算案内",
  },
  {
    id: "saki-notice",
    characterId: "saki",
    title: "社内通知文を作る",
    description: "社内メールや掲示物の通知文を作成します",
    icon: "📣",
    estimatedSeconds: 20,
    inputs: [
      { key: "notice_type", label: "通知の種類", type: "select", placeholder: "", required: true, options: ["行事・イベントのお知らせ", "ルール変更のお知らせ", "注意喚起", "募集・案内", "お礼・感謝", "その他"] },
      { key: "content", label: "伝えたい内容", type: "textarea", placeholder: "例：来週月曜日に防災訓練があります。全員参加必須です。", required: true },
      { key: "deadline", label: "期限・日時", type: "text", placeholder: "例：3月31日まで、来週月曜日 10時", required: false },
    ],
    promptTemplate: `以下の内容で社内通知文を作成してください。

通知種類: {{notice_type}}
内容: {{content}}
期限・日時: {{deadline}}

【出力形式】
- 件名
- 本文（わかりやすく・簡潔に）
- 注意事項（あれば）

全社員が読んでわかる、親しみやすい文章にしてください。`,
    outputLabel: "社内通知文",
  },
  {
    id: "saki-manual",
    characterId: "saki",
    title: "マニュアルを作る",
    description: "業務マニュアルをわかりやすく作成します",
    icon: "📖",
    estimatedSeconds: 45,
    inputs: [
      { key: "task", label: "マニュアルにする業務", type: "text", placeholder: "例：レジの締め作業、新入社員の入社手続き", required: true },
      { key: "audience", label: "マニュアルを使う人", type: "text", placeholder: "例：新入社員、パートタイムスタッフ", required: true },
      { key: "steps", label: "大まかな手順・ポイント", type: "textarea", placeholder: "例：1. 金庫を開ける 2. 現金を数える 3. 記録する...", required: true },
    ],
    promptTemplate: `以下の業務のマニュアルを作成してください。

業務内容: {{task}}
対象者: {{audience}}
手順・ポイント: {{steps}}

【マニュアルの構成】
- 目的・概要
- 必要なもの・準備
- 手順（番号付きで詳しく）
- 注意事項・よくあるミス
- 困ったときの対処法

誰が読んでもわかる、やさしい言葉で作成してください。`,
    outputLabel: "業務マニュアル",
  },
];

export function getMenusByCharacter(characterId: string): MenuItem[] {
  return menus.filter((m) => m.characterId === characterId);
}

export function getMenu(menuId: string): MenuItem | undefined {
  return menus.find((m) => m.id === menuId);
}
