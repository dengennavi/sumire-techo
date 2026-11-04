# すみれ手帖

宝塚歌劇ファン向けの非公式PWA（タカラット試算・初観劇ガイド・観劇手帖）。ビルド不要の静的サイト。

- 公開: https://dengennavi.github.io/sumire-techo/ （main に push で反映。更新時は sw.js の VERSION を上げる）
- LINE公式アカウント: @454lqgkx（友だち数＝会員数）

- `rules.js` … タカラット制度の数値（出典・確認日つき）。制度が変わったらここだけ直す
- `calc.js` … 計算ロジック（DOM非依存）
- `app.js` … 画面
- `gas/line-count.gs` … （任意）LINE友だち数の表示用中継
- `docs/LINE_MESSAGES.md` … LINE予約配信の文面
- `docs/PLAN.md` … 90日計画 / `docs/SETUP.md` … 公開手順

```
npm test                    # 計算ロジックのテスト
python3 -m http.server 8000 # ローカル確認
```
