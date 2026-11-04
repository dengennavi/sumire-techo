# 公開手順（すべて無料）

## 1. 運営用Gmailを作る（推奨）
個人のアドレスが会員に見えないよう、運営用のGoogleアカウントを作る。以下はそのアカウントで作業。

## 2. 会員登録API（Google Apps Script）
1. Googleスプレッドシートを新規作成（名前：すみれ手帖 会員）
2. 拡張機能 → Apps Script → `gas/Code.gs` の中身を貼り付け、`APP_URL` に公開URLを入れて保存
3. デプロイ → 新しいデプロイ → 種類「ウェブアプリ」／実行ユーザー「自分」／アクセス「全員」→ デプロイ（権限を許可）
4. 表示された `https://script.google.com/macros/s/…/exec` を `config.js` の `gasUrl` に入れる
5. エディタで関数 `setupTrigger` を1回実行（毎朝9時のリマインダーが有効になる）

## 3. サイト公開（GitHub Pages）
`config.js` の `siteUrl` を入れて push → リポジトリ Settings → Pages → main / root

## 4. 公開後チェック
- スマホで開いて「ホーム画面に追加」
- 自分で会員登録 → No.001 とウェルカムメールが届くか
- 機内モードで開けるか（オフライン）
