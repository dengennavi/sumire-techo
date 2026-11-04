/**
 * 任意：LINE公式アカウントの友だち数をサイトに表示するための中継（Google Apps Script / 無料）
 * トークンをサイトに出さないためにGASを挟む。
 * 1. LINE Developers で Messaging API チャネルのアクセストークン（長期）を発行
 * 2. GAS「プロジェクトの設定 → スクリプトプロパティ」に LINE_TOKEN を登録
 * 3. ウェブアプリとしてデプロイ（実行: 自分 / アクセス: 全員）→ URLを config.js の countUrl へ
 * ※LINEの統計は前日分までしか取れないため「昨日時点」の数。
 */
function doGet() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get("count");
  if (hit) return out_({ count: Number(hit), cached: true });
  const token = PropertiesService.getScriptProperties().getProperty("LINE_TOKEN");
  const d = new Date(Date.now() - 86400000);
  const ymd = Utilities.formatDate(d, "Asia/Tokyo", "yyyyMMdd");
  const res = UrlFetchApp.fetch("https://api.line.me/v2/bot/insight/followers?date=" + ymd, {
    headers: { Authorization: "Bearer " + token }, muteHttpExceptions: true,
  });
  const j = JSON.parse(res.getContentText() || "{}");
  if (j.status !== "ready") return out_({ count: null, status: j.status || "error" });
  const count = Math.max(0, (j.followers || 0) - (j.blocks || 0)); // ブロックを除いた有効友だち数
  cache.put("count", String(count), 3600);
  return out_({ count });
}
const out_ = (o) => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
