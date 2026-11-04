// タカラット制度の設定ファイル（計算ロジックから分離）
// 制度改定時はこのファイルだけ直す。必ず source を見て checkedAt を更新すること。
export const RULES = {
  version: "2026-11",
  checkedAt: "2026-11-04",
  source: "https://kageki.hankyu.co.jp/customer-program/",
  yenPerPt: 100,
  // ステージ基準（公式ページ画像 chart.webp で確認）
  stages: [
    { id: "white", name: "ホワイト", min: 0, benefit: "カスタマープログラム対象公演の「第3抽選」に申込可（友の会会員）" },
    { id: "bronze", name: "ブロンズ", min: 300, benefit: "対象公演「第3抽選」に申込可／タカスク無料視聴クーポン 年1本" },
    { id: "silver", name: "シルバー", min: 2000, benefit: "対象公演「第2〜第3抽選」に申込可／タカスク無料視聴 年3本" },
    { id: "gold", name: "ゴールド", min: 2500, benefit: "対象公演「第1〜第3抽選」に申込可／タカスク無料視聴 年5本／宝塚歌劇の殿堂フリーパス" },
  ],
  // 上限（同じ capKey の項目は合算して上限判定）
  caps: { tomoYears: 100, ticket: 1000, quatre: 1000, squareRental: 1000, paper: 400, gallery: 1000 },
  items: [
    { id: "tomoJoin", label: "宝塚友の会に入会している", type: "flag", pt: 300, note: "入会時に300。毎年3月末のリセット対象外（退会まで有効）" },
    { id: "tomoYears", label: "友の会の継続年数", type: "count", unit: "年", ptPer: 10, capKey: "tomoYears", note: "継続年数×10（上限100）。毎年4月に加算" },
    { id: "idPlusMonths", label: "共通ID＋ の利用月数（今年度）", type: "count", unit: "か月", ptPer: 7, max: 12, note: "月7。入会・継続の翌日に加算" },
    { id: "ticketYen", label: "Webチケットサービス 購入額", type: "yen", capKey: "ticket", note: "100円→1、上限1,000（10万円）。申込ではなく購入が対象。観劇日の翌日以降に加算" },
    { id: "quatreStoreYen", label: "キャトルレーヴ 店舗", type: "yen", capKey: "quatre", note: "会員証（Pocket）提示が必要。購入日の翌日に加算。オンラインと合算で上限1,000" },
    { id: "quatreOnlineYen", label: "キャトルレーヴ オンライン", type: "yen", capKey: "quatre", note: "発送日の1か月後以降に加算。送料・手数料・eGiftは対象外" },
    { id: "squareMonths", label: "タカスク 月額プラン 利用月数", type: "count", unit: "か月", ptPer: 5, max: 12, adv: true, note: "月5" },
    { id: "squareRentalYen", label: "タカスク レンタル", type: "yen", capKey: "squareRental", adv: true, note: "上限1,000" },
    { id: "paperYen", label: "定期購読（紙版）", type: "yen", capKey: "paper", adv: true, note: "上限400（4万円）" },
    { id: "ebooksYen", label: "ebooksタカラヅカ 定期購読", type: "yen", adv: true, note: "上限の記載なし" },
    { id: "skyYen", label: "タカラヅカ・スカイ・ステージ", type: "yen", adv: true, note: "マイページから申請が必要。3・6・9・12月下旬に加算" },
    { id: "galleryYen", label: "My Gallery コイン購入", type: "yen", capKey: "gallery", adv: true, note: "上限1,000" },
  ],
  // 集計日（月, 日）と、その後のステージ反映日
  aggregations: [[6, 30], [9, 30], [12, 31], [3, 31]],
  effectiveDay: 15,
};
