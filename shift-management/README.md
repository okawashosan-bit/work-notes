# UnitC シフト管理（TrainerHub）

公開URL: https://unitc-shift-manager.vercel.app

7名分のシフト・稼働ログを全員で共有できるツール。元は1ファイル完結のプロトタイプ（`window.storage` を使用）だったものを、Vercelにデプロイし、実データを全員で共有できるよう構成し直したもの。

## 構成

- `index.html` — フロントエンド（見た目・操作はプロトタイプのまま維持）
- `api/members.js` — サーバーレスAPI。メンバーごとのデータを Vercel Edge Config に保存/取得する
  - データはメンバーID単位（`member_<id>`）で保存されるため、1人の保存が他メンバーのデータを上書きすることはない
  - 保存領域（Edge Config ストア `unitc-shift-store`）は、初回アクセス時に自動生成される（手動セットアップ不要）
- `package.json` — 依存なしの最小構成

## データの流れ

1. ブラウザが `GET /api/members` で全員分のシフトを取得
2. 「セーブ」ボタンで `POST /api/members`（選択中メンバー分のみ）を送信
3. サーバーレス関数が Vercel Edge Config に読み書きし、全員に共有される
4. 「🔄 最新を取得」で他メンバーの最新データを再取得できる

## 環境変数（Vercelプロジェクト設定）

- `VERCEL_API_TOKEN` — Edge Config への読み書きに使うVercel APIトークン
  - このリポジトリのコードは環境変数から読む。トークンの値はコミットしない。

## 再デプロイ

`index.html` / `api/members.js` を変更したら、Vercelプロジェクト `unitc-shift-manager` に再デプロイする。

## 注意

- ログイン機能はなく、URLを知っていれば誰でも閲覧・編集できる（社内共有用）。アクセス制限が必要な場合は別途認証の追加が必要。
- Edge Config は少人数・低頻度更新向け。7名のシフト用途では十分。
