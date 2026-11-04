/**
 * すみれ手帖 会員登録API（Google Apps Script / 無料）
 * スプレッドシートに紐づけて「ウェブアプリ」としてデプロイ（実行ユーザー: 自分 / アクセス: 全員）
 * 列: 登録日時 | No | ニックネーム | メール | 組 | 紹介元 | 配信停止 | トークン
 */
const SHEET = "members";
const APP_URL = ""; // 公開サイトのURL
const NOTICE_DAYS_BEFORE = 7;
const AGGREGATIONS = [[6, 30], [9, 30], [12, 31], [3, 31]];

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET);
  if (!sh) {
    sh = ss.insertSheet(SHEET);
    sh.appendRow(["登録日時", "No", "ニックネーム", "メール", "組", "紹介元", "配信停止", "トークン"]);
  }
  return sh;
}
const json_ = (o) => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);

function doGet(e) {
  const p = e.parameter || {};
  const sh = sheet_();
  if (p.action === "count") return json_({ count: Math.max(0, sh.getLastRow() - 1) });
  if (p.action === "unsub" && p.t) {
    const rows = sh.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) if (rows[i][7] === p.t) { sh.getRange(i + 1, 7).setValue("停止"); break; }
    return HtmlService.createHtmlOutput("<p style='font:16px sans-serif;padding:24px'>配信を停止しました。ご利用ありがとうございました。</p>");
  }
  return json_({ ok: true });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const b = JSON.parse(e.postData.contents || "{}");
    const email = String(b.email || "").trim().toLowerCase();
    const nickname = String(b.nickname || "").trim().slice(0, 20);
    if (!b.consent) return json_({ ok: false, error: "規約への同意が必要です" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !nickname) return json_({ ok: false, error: "入力内容を確認してください" });
    const sh = sheet_();
    const rows = sh.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) if (rows[i][3] === email) return json_({ ok: true, no: rows[i][1], existing: true });
    const no = rows.length; // ヘッダー行を除いた通し番号
    const token = Utilities.getUuid();
    sh.appendRow([new Date(), no, nickname, email, String(b.troupe || ""), String(b.ref || ""), "", token]);
    welcome_(email, nickname, no, token);
    return json_({ ok: true, no });
  } finally {
    lock.releaseLock();
  }
}

function unsubUrl_(token) { return ScriptApp.getService().getUrl() + "?action=unsub&t=" + token; }

function welcome_(email, nickname, no, token) {
  const n = ("00" + no).slice(-3);
  MailApp.sendEmail({
    to: email,
    subject: `【すみれ手帖】創立メンバー No.${n} へようこそ`,
    body: `${nickname} さん

すみれ手帖にご登録いただきありがとうございます。
あなたは創立メンバー No.${n} です。

・タカラット集計日の約${NOTICE_DAYS_BEFORE}日前にお知らせをお送りします
・ご要望・不具合はこのメールに返信してください

▼アプリ
${APP_URL}

※すみれ手帖は個人運営の非公式ツールです。宝塚歌劇団・阪急電鉄とは関係ありません。
配信停止：${unsubUrl_(token)}
`,
  });
}

/** 毎日1回のトリガーで実行：集計日の7日前ならお知らせ */
function dailyReminder() {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const target = new Date(t); target.setDate(t.getDate() + NOTICE_DAYS_BEFORE);
  const hit = AGGREGATIONS.some(([m, d]) => target.getMonth() + 1 === m && target.getDate() === d);
  if (!hit) return;
  const m = target.getMonth() + 1, d = target.getDate();
  const isYearEnd = m === 3;
  const rows = sheet_().getDataRange().getValues().slice(1).filter((r) => r[3] && r[6] !== "停止");
  rows.forEach((r) => {
    MailApp.sendEmail({
      to: r[3],
      subject: `【すみれ手帖】タカラット集計日（${m}/${d}）まであと${NOTICE_DAYS_BEFORE}日`,
      body: `${r[2]} さん

次のタカラット集計日は ${m}/${d} です。${isYearEnd ? "\n今回は年度末。3月末でタカラットはリセットされます（友の会入会分を除く）。" : ""}

加算タイミングの目安
・チケット：観劇日の翌日以降に加算
・キャトルレーヴ店舗：購入日の翌日（会員証の提示が必要）
・キャトルレーヴオンライン：発送日の約1か月後 → 今からの注文は次回集計になる可能性大

ステージで当選確率は変わりませんが、対象公演で申し込める抽選回が変わります。
あと何ptか、試算はこちら：
${APP_URL}#calc

※概算です。正確な値は公式マイページでご確認ください。
配信停止：${unsubUrl_(r[7])}
`,
    });
  });
}

/** 初回に1度だけ手動実行：毎朝9時のトリガーを作る */
function setupTrigger() {
  ScriptApp.getProjectTriggers().forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("dailyReminder").timeBased().everyDays(1).atHour(9).create();
}
