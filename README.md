# すみれ手帖

宝塚歌劇ファン向けの非公式PWA（タカラット試算・初観劇ガイド・観劇手帖）。ビルド不要の静的サイト。

- `rules.js` … タカラット制度の数値（出典・確認日つき）。制度が変わったらここだけ直す
- `calc.js` … 計算ロジック（DOM非依存）
- `app.js` … 画面
- `gas/Code.gs` … 会員登録・リマインドメール（Google Apps Script）
- `docs/PLAN.md` … 90日計画 / `docs/SETUP.md` … 公開手順

```
npm test                    # 計算ロジックのテスト
python3 -m http.server 8000 # ローカル確認
```
