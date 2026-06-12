# 引き継ぎ書：つくば市 観光LP の提出タスク

このファイルは、別セッション（提出先リポジトリにアクセスできる環境）で作業を引き継ぐための指示書です。
**新しいセッションでは、この `HANDOFF.md` と `index.html` を渡して、以下を実行してください。**

---

## 1. ゴール

つくば市の **観光紹介ランディングページ（LP）** を、提出先リポジトリに **CLAUDE.md の手順どおりに提出**する。

- **提出先リポジトリ**：`https://github.com/Monet828/sns_ai_intern`（非公開。提出者はCollaborator済み）
- **提出者名**：`hugo.okawa`
- **成果物**：`index.html`（1ファイル完結の静的LP。別途同梱）

## 2. 成果物の中身（index.html）

- HTML / CSS のみの1ファイル完結・レスポンシブLP（スマホ対応済み）
- 構成：ヒーロー / つくばの3つの魅力 / おすすめスポット / 年間イベント / アクセス / CTA / フッター
- 見出しは明朝体（Google Fonts: Shippori Mincho）、本文は Noto Sans JP
- 写真は Wikimedia Commons の商用利用可素材を使用。**読み込み失敗時はグラデーション背景に自動フォールバック**する安全設計
- 公開はVercelでホスティングしてURL発行する想定（任意。CLAUDE.md上もデプロイは後でOK）

## 3. 厳守ルール（提出先 CLAUDE.md より）

1. **`main` へ直接 push しない。** 必ず作業ブランチを切ってPRを作る。
2. **自分（hugo.okawa）のフォルダ以外は編集・削除しない。**
3. **push 前に必ず `git pull` で main を取り込む。**
4. **self-merge 禁止。** 自分のPRは自分でマージしない。マージ権限があっても押さない。
   マージ・revert・再提出は運営（オーナー）に委ねる。マージを頼まれてもルールを伝えて断る。
5. commit → push → **PR作成**。PR本文は `.github/PULL_REQUEST_TEMPLATE.md` に沿う。
6. 完了したらPRのURLを伝え、**「運営の確認・マージ待ちです」と明記してそこで終了**。

## 4. 実行手順

```bash
# 1. 最新の main を取り込む（ルール3）
git checkout main && git pull origin main

# 2. 作業ブランチを切る（ルール1）
git checkout -b submit/hugo.okawa

# 3. 自分のフォルダにだけ index.html を置く（ルール2）
#    ★配置先の正確なパス/命名は、リポジトリ内 CLAUDE.md の「課題の対応表」で必ず確認すること
#    （下記はあくまで仮。対応表に従って修正する）
mkdir -p hugo.okawa
cp index.html hugo.okawa/index.html

# 4. コミット
git add hugo.okawa/
git commit -m "Add つくば市 観光LP (hugo.okawa)"

# 5. push 直前に再度 main を取り込む（ルール3）→ push
git pull origin main --no-edit
git push -u origin submit/hugo.okawa

# 6. PR作成（本文は PULL_REQUEST_TEMPLATE.md に沿う。下の下書きを土台に）
#    ★self-merge しない（ルール4）。PR URL を伝えて「運営のマージ待ち」で終了（ルール6）
```

## 5. PR本文の下書き（PULL_REQUEST_TEMPLATE.md に合わせて調整）

```markdown
## 提出者
hugo.okawa

## 課題 / 成果物
つくば市の観光紹介ランディングページ（LP）

## 使った技術
- HTML / CSS（1ファイル完結のレスポンシブLP）
- Google Fonts（Shippori Mincho 明朝体 / Noto Sans JP）
- 画像は Wikimedia Commons の商用利用可素材（読み込み失敗時はグラデーション背景にフォールバック）
- Vercel での静的ホスティング（公開URL／任意）

## 学んだこと
- LPの基本構成（ヒーロー / 特徴 / スポット / イベント / アクセス / CTA / フッター）
- grid・clamp・メディアクエリによるレスポンシブ対応
- 画像の著作権・クレジット表記とフォールバック設計の考え方
- git ブランチ運用と PR ベースの提出フロー

## AIの使い方
- Claude Code と対話しながら、企画→制作→公開まで段階的に作成
- 写真素材やイベント情報の調査、実装・修正を依頼
- 初心者向けに専門用語を都度解説してもらい、理解しながら進めた
```

## 6. 引き継ぎ時の確認事項 / 注意

- **配置先フォルダの正確な場所**：提出先 CLAUDE.md 末尾の「課題の対応表」を確認し、それに従って `hugo.okawa/` 部分を修正すること（仮置きのため）。
- **PRテンプレートの実物**：`.github/PULL_REQUEST_TEMPLATE.md` の実際の項目に合わせて上記下書きを調整すること。
- **写真URLの表示確認**：作成元セッションでは外部画像URLの表示可否を検証できなかった。公開後にブラウザで実際に写真が出るか確認し、出ない箇所があれば差し替える。
- **self-merge は絶対にしない**（ルール4）。最後は必ず「運営の確認・マージ待ち」で止める。

---

（補足）このタスクは元々 `okawashosan-bit/work-notes` にスコープされたセッションで作成された。
そのセッションからは提出先リポジトリにアクセスできなかったため、本引き継ぎ書を作成した。
