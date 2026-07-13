# UnitC シフト管理（TrainerHub）

公開URL: https://unitc-shift-manager.vercel.app

7名分のシフト・稼働ログを全員で共有できるツール。元は1ファイル完結のプロトタイプ（`window.storage` を使用）だったものを、Vercelにデプロイしたうえで実データを共有できるよう構成し直したもの。

## 構成

- `index.html` — フロントエンド（見た目・操作はプロトタイプのまま）
- `api/members.js` — サーバーレスAPI。メンバーごとのデータを Vercel Edge Config に保存/取得する
- データはメンバーID単位（`member_<id>`）で保存されるため、1人の保存が他メンバーのデータを上書きすることはない

## 必要な環境変数（Vercelプロジェクト設定）

- `VERCEL_API_TOKEN` — Edge Config への読み書きに使うVercel APIトークン（Settings → Environment Variables で設定。値そのものはこのリポジトリには含めない）

`EDGE_CONFIG_ID` と `TEAM_ID` は秘密情報ではないため `api/members.js` 内に定数として直書きしている。

## 再デプロイ

`index.html` / `api/members.js` を変更したら、Vercelプロジェクト `unitc-shift-manager` に再デプロイする。
