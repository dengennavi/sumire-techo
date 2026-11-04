import { RULES } from "./rules.js";
import { calc, planTo, nextAggregation } from "./calc.js";
import { CONFIG } from "./config.js";

// ---------- 保存（端末内のみ） ----------
const KEY = "sumire-techo-v1";
const defaults = { troupe: "sora", calc: { tomoJoin: true }, plan: {}, log: [], checklist: {}, customItems: [], line: null };
let S = load();
function load() {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return { ...defaults }; }
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} }

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const yen = (v) => Number(v).toLocaleString("ja-JP") + "円";
const num = (v) => Number(v).toLocaleString("ja-JP");
const md = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
const todayStr = () => new Date().toLocaleDateString("sv-SE");
const TROUPES = { hana: "花組", tsuki: "月組", yuki: "雪組", hoshi: "星組", sora: "宙組" };

// ---------- テーマ ----------
function applyTheme() {
  document.documentElement.dataset.t = S.troupe;
  document.querySelectorAll(".troupes button").forEach((b) => b.setAttribute("aria-checked", b.dataset.t === S.troupe));
  const c = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  $('meta[name="theme-color"]').content = c;
}
document.querySelectorAll(".troupes button").forEach((b) => b.setAttribute("role", "radio"));
$(".troupes").addEventListener("click", (e) => {
  const t = e.target.closest("button")?.dataset.t; if (!t) return;
  S.troupe = t; save(); applyTheme();
});
$("#rulesInfo").innerHTML = `計算ルール：<a href="${RULES.source}" target="_blank" rel="noopener">公式カスタマープログラム</a>を ${RULES.checkedAt} に確認した内容に基づきます（v${RULES.version}）。`;

// ---------- ルーティング ----------
const views = { home, calc: calcView, log: logView, guide, day: dayView, member, backup };
function route() {
  const v = (location.hash.slice(1) || "home").split("?")[0];
  const fn = views[v] || home;
  $("#app").innerHTML = "";
  fn($("#app"));
  document.querySelectorAll(".tabs a").forEach((a) => (a.dataset.v === v ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
  window.scrollTo(0, 0);
}
addEventListener("hashchange", route);

// ---------- ホーム ----------
function home(el) {
  const a = nextAggregation(new Date(), RULES);
  const r = calc(S.calc, RULES);
  const todayPlan = S.log.find((x) => x.date === todayStr() && x.planned);
  el.innerHTML = `
    ${todayPlan ? `<a class="btn" href="#day" style="margin-bottom:12px">今日は観劇の日！ 当日モードを開く</a>` : ""}
    <div class="card count">
      <div class="muted">次のタカラット集計日</div>
      <div><span class="big">${a.days}</span> 日後 <b>（${a.date.getFullYear()}/${md(a.date)}）</b></div>
      <div class="small muted">ステージ反映 ${md(a.effective)}（予定）${a.isYearEnd ? "／<b>年度末：3月末でタカラットはリセット（友の会入会分を除く）</b>" : ""}</div>
    </div>
    <h1>今日は何をしますか？</h1>
    <div class="choices">
      <a class="choice" href="#guide"><i>☆</i><span><b>はじめて観劇する</b><span class="muted">チケットの取り方・持ち物・マナー・用語</span></span></a>
      <a class="choice" href="#calc"><i>◆</i><span><b>タカラットを試算する</b><span class="muted">いま <span class="badge st-${r.stage.id}">${r.stage.name}</span> 相当 ${num(r.total)}pt${r.next ? `／${r.next.name}まであと${num(r.toNext)}pt` : ""}</span></span></a>
      <a class="choice" href="#log"><i>✎</i><span><b>観劇手帖をひらく</b><span class="muted">予定と記録 ${S.log.length}件（端末内のみ保存）</span></span></a>
    </div>
    ${memberCta()}
  `;
  fillCounter(el);
}
function memberCta() {
  if (S.line?.added) return `<div class="card"><b>LINEで集計日のお知らせを受け取り中</b> <span class="muted small">${esc(S.line.nickname || "")}</span><div class="row"><a class="btn sm ghost" href="#member">創立メンバー証を見る</a></div></div>`;
  return `<div class="card"><b>創立メンバー 100名募集中</b><div class="muted small">LINEで友だち追加すると、タカラット集計日の約1週間前にお知らせが届きます。無料・ブロックで即解除。<span data-counter></span></div><div class="row" style="margin-top:8px"><a class="btn" href="#member">LINEで受け取る</a></div></div>`;
}
async function fillCounter(el) {
  const slot = el.querySelector("[data-counter]"); if (!slot || !CONFIG.countUrl) return;
  try {
    const j = await (await fetch(CONFIG.countUrl)).json();
    if (j.count != null) slot.innerHTML = ` <b>残り ${Math.max(0, CONFIG.memberGoal - j.count)} 枠</b>`;
  } catch {}
}

// ---------- 試算 ----------
function calcView(el) {
  const a = nextAggregation(new Date(), RULES);
  const basic = RULES.items.filter((i) => !i.adv), adv = RULES.items.filter((i) => i.adv);
  const field = (it) => {
    const v = S.calc[it.id] ?? "";
    if (it.type === "flag") return `<label class="check"><input type="checkbox" data-k="${it.id}" ${v ? "checked" : ""}><span>${it.label}<br><span class="muted small">${it.note}</span></span></label>`;
    const presets = it.type === "yen" ? `<div class="row">${[5000, 10000, 30000].map((p) => `<button class="chip" data-add="${it.id}" data-v="${p}">+${num(p)}</button>`).join("")}<button class="chip" data-add="${it.id}" data-v="0">クリア</button></div>` : "";
    return `<label for="f-${it.id}">${it.label}${it.type === "yen" ? "（円）" : `（${it.unit}）`}</label>
      <input id="f-${it.id}" type="number" inputmode="numeric" min="0" data-k="${it.id}" value="${esc(v)}" placeholder="0">
      ${presets}<div class="muted small">${it.note}</div>`;
  };
  el.innerHTML = `
    <h1>タカラット試算</h1>
    <p class="muted small">今年度（${a.fiscalYear}年4月〜${a.fiscalYear + 1}年3月）の利用額を入れると即時に計算します。入力は端末内にだけ保存され、外部に送信されません。</p>
    <div class="card" id="result"></div>
    <div class="card">
      <h2 style="margin-top:0">1. 会員情報</h2>${basic.filter((i) => i.type !== "yen").map(field).join("")}
      <h2>2. 今年度の購入額（加算済みの分）</h2>${basic.filter((i) => i.type === "yen").map(field).join("")}
      <details><summary>その他のサービス（タカスク・定期購読など）</summary>${adv.map(field).join("")}</details>
    </div>
    <div class="card">
      <h2 style="margin-top:0">3. 次の集計（${md(a.date)}）までの予定</h2>
      <label for="p-t">これから買うチケット（円）</label><input id="p-t" type="number" inputmode="numeric" min="0" data-p="ticketYen" value="${esc(S.plan.ticketYen ?? "")}" placeholder="0">
      <div class="muted small">観劇日の翌日に加算 → <b>${md(a.ticketBy)}までに観劇</b>する分が目安</div>
      <label for="p-q">これから買うグッズ（円）</label><input id="p-q" type="number" inputmode="numeric" min="0" data-p="quatreYen" value="${esc(S.plan.quatreYen ?? "")}" placeholder="0">
      <div class="muted small">店舗は${md(a.storeBy)}まで／<b>オンラインは発送の約1か月後に加算</b>（${md(a.onlineShipBy)}頃までの発送が目安）</div>
      <label for="mp">マイページの現在のタカラット（任意・照合用）</label><input id="mp" type="number" inputmode="numeric" min="0" data-m value="${esc(S.calc.mypagePt ?? "")}" placeholder="例: 1250">
    </div>
    <div class="mini" id="mini"></div>
    <div class="warn small">ステージによる<b>チケット当選確率の変動はありません</b>（公式明記）。ステージで変わるのは、カスタマープログラム対象公演で<b>申し込める抽選回</b>や特典です。購入額の端数処理は取引ごとに異なる場合があり、実際の値とずれることがあります。</div>
  `;
  const render = () => {
    const now = calc(S.calc, RULES), fc = calc(S.calc, RULES, S.plan);
    const hasPlan = (Number(S.plan.ticketYen) || 0) + (Number(S.plan.quatreYen) || 0) > 0;
    const r = hasPlan ? fc : now;
    const max = 2500, pct = Math.min(100, (r.total / max) * 100);
    const targets = RULES.stages.filter((s) => s.min > r.total);
    const mp = Number(S.calc.mypagePt);
    $("#mini").innerHTML = `<b>${num(r.total)}pt</b> <span class="badge st-${r.stage.id}">${r.stage.name}</span> ${r.next ? `<span class="small">${r.next.name}まであと${num(r.toNext)}pt</span>` : ""}`;
    $("#result").innerHTML = `
      <div class="muted">${hasPlan ? `${md(a.date)} 集計時の予測` : "現在の概算"}</div>
      <div><span class="big">${num(r.total)}</span> pt <span class="badge st-${r.stage.id}">${r.stage.name}</span></div>
      <div class="bar" aria-hidden="true"><div style="width:${pct}%;--stage:var(--${r.stage.id})"></div></div>
      <div class="ticks"><span>0</span><span>ブロンズ300</span><span>シルバー2,000</span><span>ゴールド2,500</span></div>
      ${hasPlan ? `<div class="small muted">予定なしの場合：${num(now.total)}pt（${now.stage.name}）</div>` : ""}
      <p class="small">${r.stage.benefit}</p>
      ${targets.map((t) => planHtml(planTo(r, t, RULES))).join("") || `<p><b>最上位ステージ相当です。</b></p>`}
      ${mp ? `<div class="warn small">マイページ ${num(mp)}pt との差：${mp - now.total >= 0 ? "+" : ""}${num(mp - now.total)}pt。${mp < now.total ? "加算待ち（観劇前・発送待ち等）の可能性があります。" : "入力漏れがないか確認してください。"}</div>` : ""}
      <details><summary>内訳</summary><table>${r.lines.filter((l) => l.raw > 0).map((l) => `<tr><td>${esc(l.label)}</td><td class="num">${num(l.pt)}${l.cap != null ? ` / ${num(l.cap)}` : ""}${l.capped ? " 上限" : ""}</td></tr>`).join("") || "<tr><td>まだ入力がありません</td></tr>"}</table></details>
    `;
  };
  const planHtml = (p) => `
    <div class="card" style="margin:8px 0;background:var(--soft);border:0">
      <b>${p.target.name}まで あと ${num(p.need)}pt（${yen(p.yen)}分）</b>
      <div class="small">チケットだけなら：${p.ticketOnly != null ? yen(p.ticketOnly) : `上限のため不可（残り枠${yen(p.ticketRoomYen)}）`}<br>
      グッズだけなら：${p.quatreOnly != null ? yen(p.quatreOnly) : `上限のため不可（残り枠${yen(p.quatreRoomYen)}）`}
      ${!p.combinedPossible ? `<br><b>チケット＋グッズの上限内では届きません。</b>共通ID＋（月7）やタカスク月額（月5）などが必要です。` : ""}</div>
    </div>`;
  el.addEventListener("input", (e) => {
    const t = e.target;
    if (t.dataset.k) S.calc[t.dataset.k] = t.type === "checkbox" ? t.checked : t.value;
    if (t.dataset.p) S.plan[t.dataset.p] = t.value;
    if ("m" in t.dataset) S.calc.mypagePt = t.value;
    save(); render();
  });
  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-add]"); if (!b) return;
    const k = b.dataset.add, v = Number(b.dataset.v);
    S.calc[k] = v === 0 ? "" : (Number(S.calc[k]) || 0) + v;
    $(`#f-${k}`).value = S.calc[k]; save(); render();
  });
  render();
}

// ---------- 観劇手帖 ----------
function logView(el) {
  const thisYear = String(new Date().getFullYear());
  const done = S.log.filter((x) => !x.planned);
  const yearDone = done.filter((x) => x.date?.startsWith(thisYear));
  const byT = {}; yearDone.forEach((x) => x.troupe && (byT[x.troupe] = (byT[x.troupe] || 0) + 1));
  const top = Object.entries(byT).sort((a, b) => b[1] - a[1])[0];
  const list = [...S.log].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  el.innerHTML = `
    <h1>観劇手帖</h1>
    <p class="muted small">あなただけの記録です。端末内に保存され、誰にも公開されません。</p>
    <div class="card"><b>${thisYear}年の観劇：${yearDone.length}回</b>${top ? `<div class="muted small">いちばん多く観た組：${TROUPES[top[0]] || top[0]}（${top[1]}回）</div>` : ""}</div>
    <div class="card">
      <h2 style="margin-top:0">予定・記録を追加</h2>
      <form id="f">
        <label class="check"><input type="checkbox" name="planned"><span>これから観る予定（当日モードが使えます）</span></label>
        <label>観劇日</label><input type="date" name="date" required value="${todayStr()}">
        <label>公演名</label><input type="text" name="title" placeholder="例：〇〇〇（自由入力）">
        <label>組</label><select name="troupe"><option value="">—</option>${Object.entries(TROUPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}<option value="other">専科・その他</option></select>
        <label>劇場</label><select name="theater"><option>宝塚大劇場</option><option>東京宝塚劇場</option><option>宝塚バウホール</option><option>その他</option></select>
        <label>座席（任意）</label><input type="text" name="seat" placeholder="例：1階 12列">
        <label>チケット代（任意）</label><input type="number" inputmode="numeric" name="price" placeholder="0">
        <label>メモ（任意）</label><textarea name="memo" placeholder="好きだった場面、また観たいところ"></textarea>
        <div style="margin-top:12px"><button class="btn">保存</button></div>
      </form>
    </div>
    <h2>記録一覧</h2>
    <div class="card">${list.map((x) => `<div class="entry"><b>${esc(x.date)} ${x.planned ? "【予定】" : ""}${esc(x.title || "（公演名なし）")}</b><span class="muted small">${esc(TROUPES[x.troupe] || "")} ${esc(x.theater || "")} ${esc(x.seat || "")}${x.price ? "／" + yen(x.price) : ""}</span>${x.memo ? `<div class="small">${esc(x.memo)}</div>` : ""}<div class="row">${x.planned ? `<button class="chip" data-done="${x.id}">観た！記録にする</button>` : ""}<button class="chip" data-del="${x.id}">削除</button></div></div>`).join("") || `<p class="muted">まだありません</p>`}</div>
    <a class="btn ghost" href="#backup">データのバックアップ・復元</a>
  `;
  $("#f", el).addEventListener("submit", (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    S.log.push({ id: crypto.randomUUID?.() || String(Date.now()), ...f, planned: !!f.planned });
    save(); route();
  });
  el.addEventListener("click", (e) => {
    const d = e.target.dataset;
    if (d.del && confirm("この記録を削除しますか？")) { S.log = S.log.filter((x) => x.id !== d.del); save(); route(); }
    if (d.done) { const x = S.log.find((x) => x.id === d.done); x.planned = false; save(); route(); }
  });
}

function backup(el) {
  el.innerHTML = `
    <h1>バックアップ・復元</h1>
    <div class="warn small">データはこの端末のブラウザ内だけにあります。機種変更・ブラウザのデータ削除・iPhoneのSafariで長期間開かなかった場合などに消えることがあります。定期的に書き出してください。</div>
    <div class="card"><button class="btn" id="ex">ファイルに書き出す</button><div class="row"><button class="chip" id="cp">テキストでコピー</button></div></div>
    <div class="card"><label>ファイルから復元</label><input type="file" id="im" accept="application/json,.json">
    <label>テキストから復元</label><textarea id="tx" placeholder="コピーしたテキストを貼り付け"></textarea><div style="margin-top:8px"><button class="btn ghost" id="tr">復元する</button></div></div>`;
  const data = () => JSON.stringify({ app: "sumire-techo", v: 1, exportedAt: new Date().toISOString(), data: S });
  $("#ex").onclick = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([data()], { type: "application/json" })); a.download = `sumire-techo-${todayStr()}.json`; a.click(); };
  $("#cp").onclick = async () => { try { await navigator.clipboard.writeText(data()); alert("コピーしました"); } catch { $("#tx").value = data(); } };
  const restore = (txt) => { try { const j = JSON.parse(txt); if (j.app !== "sumire-techo") throw 0; if (!confirm("現在のデータを上書きして復元しますか？")) return; S = { ...defaults, ...j.data }; save(); applyTheme(); alert("復元しました"); location.hash = "#home"; } catch { alert("読み込めませんでした"); } };
  $("#im").onchange = async (e) => restore(await e.target.files[0].text());
  $("#tr").onclick = () => restore($("#tx").value);
}

// ---------- 初観劇ガイド ----------
const STEPS = [
  ["公演を選ぶ", "宝塚は5つの組（花・月・雪・星・宙）と専科で構成。大劇場公演は多くが「お芝居＋ショー」の二本立てで、初めてでも楽しみやすい構成です。迷ったら日程が合うものでOK。"],
  ["チケットを取る", "主な入手先は、公式のWebチケットサービス（一般前売・先着）、宝塚友の会（会員向け先行抽選）、各プレイガイド。転売サイトでの購入は避け、公式リセールなど正規の方法を使いましょう。"],
  ["前日までに準備", "チケット（QR・発券）、劇場までの行き方、開演時刻を確認。オペラグラス（双眼鏡）があると表情まで見えて楽しさが倍増します。"],
  ["当日：開演30分前には到着", "開場は開演の少し前から。ロビーのショップ（キャトルレーヴ）や公演プログラムを見る時間も取ると余裕が出ます。"],
  ["上演中", "お芝居→休憩（30分程度）→ショーが基本。スマホは電源を切ってかばんへ。休憩中にお手洗いが混むので早めに。"],
  ["終演後", "感想は忘れないうちに観劇手帖へ。SNSに書くときは、まだ観ていない人へのネタバレに配慮を。"],
];
const MANNERS = [
  "上演中はスマホの電源を切る（光・振動・通知音も迷惑になります）",
  "撮影・録音・録画は禁止",
  "前のめりにならない。背もたれに背中をつけて、後ろの方の視界を守る",
  "帽子・大きな髪飾り・高く結んだ髪は後ろの視界を遮るので控えめに",
  "上演中のおしゃべり・飲食・荷物のガサガサ音を控える",
  "香水は控えめに（客席は密集しています）",
  "拍手や手拍子は周りに合わせればOK",
  "劇場ごとのルールは公式の案内を確認",
];
const GLOSSARY = [
  ["男役・娘役", "宝塚では女性のみの劇団員が、男性役（男役）と女性役（娘役）を演じます。"],
  ["トップスター", "各組の主演を務める男役。相手役の娘役は「トップ娘役」。"],
  ["組", "花・月・雪・星・宙の5組。それぞれ独自のカラーや雰囲気があります。"],
  ["専科", "特定の組に属さず、さまざまな組の公演に出演するメンバー。"],
  ["二本立て", "お芝居とショー（レビュー）の2本を一度に上演する形式。"],
  ["大階段", "ショーのフィナーレに登場する大きな階段。華やかなパレードはここから。"],
  ["銀橋（ぎんきょう）", "オーケストラピットと客席の間にある細い通路状の舞台。出演者がすぐ近くを通ります。"],
  ["羽根", "フィナーレでトップスターなどが背負う大きな羽根飾り。"],
  ["新人公演", "入団年数の浅い生徒が本公演と同じ演目を演じる特別公演。"],
  ["初日・千秋楽", "公演の初日と最終日。千秋楽は「楽（らく）」とも。"],
  ["ムラ", "宝塚大劇場（宝塚市）のある地域をファンが親しみを込めて呼ぶ言い方。"],
  ["生徒", "劇団員のこと。宝塚音楽学校の卒業生で、在団中は「生徒」と呼ばれます。"],
];
const BASE_ITEMS = ["チケット（QR表示 or 発券済み）", "スマートフォン（充電済み）", "財布・交通系ICカード", "オペラグラス（あれば）", "ハンカチ・ティッシュ", "羽織るもの（客席は冷えることも）", "劇場までのアクセス確認"];

function guide(el) {
  el.innerHTML = `
    <h1>はじめての観劇ガイド</h1>
    <a class="btn" href="#day">観劇当日モード（持ち物チェック）</a>
    <h2>当日までの流れ</h2>
    <div class="card">${STEPS.map(([t, d], i) => `<h3>${i + 1}. ${t}</h3><p class="small" style="margin:0">${d}</p>`).join("")}</div>
    <h2>観劇マナー</h2>
    <div class="card"><ul class="small" style="padding-left:20px;margin:0">${MANNERS.map((m) => `<li>${m}</li>`).join("")}</ul></div>
    <h2>用語ミニ辞典</h2>
    <div class="card"><dl class="small" style="margin:0">${GLOSSARY.map(([t, d]) => `<dt>${t}</dt><dd>${d}</dd>`).join("")}</dl></div>
    <p class="muted small">公演・チケット・劇場の最新情報は必ず公式サイトでご確認ください。</p>`;
}

function dayView(el) {
  const items = [...BASE_ITEMS, ...S.customItems];
  const today = todayStr();
  const c = (S.checklist[today] ||= {});
  const done = items.filter((x) => c[x]).length;
  const plan = S.log.find((x) => x.date === today);
  el.innerHTML = `
    <div class="dayMode">
      <h1>観劇当日モード</h1>
      ${plan ? `<p><b>${esc(plan.title || "今日の公演")}</b><br><span class="muted">${esc(plan.theater || "")} ${esc(plan.seat || "")}</span></p>` : ""}
      <div class="card"><div class="muted">出発前チェック ${done}/${items.length}</div>
      ${items.map((x) => `<label class="check ${c[x] ? "done" : ""}"><input type="checkbox" data-i="${esc(x)}" ${c[x] ? "checked" : ""}><span>${esc(x)}</span></label>`).join("")}
      <div class="row" style="margin-top:10px"><input type="text" id="ni" placeholder="持ち物を追加" style="flex:1"><button class="btn sm" id="na">追加</button></div></div>
      <div class="card"><b>開演前にもう一度</b><ul style="padding-left:22px;margin:6px 0 0"><li>スマホの電源を切る</li><li>背もたれに背中をつける</li><li>撮影・録音はしない</li></ul></div>
    </div>`;
  el.addEventListener("change", (e) => { const i = e.target.dataset.i; if (i == null) return; c[i] = e.target.checked; save(); route(); });
  $("#na").onclick = () => { const v = $("#ni").value.trim(); if (v && !S.customItems.includes(v)) { S.customItems.push(v); save(); route(); } };
}

// ---------- 会員（LINE公式アカウント） ----------
function member(el) {
  const ready = !!CONFIG.lineAddUrl;
  const qr = CONFIG.lineBasicId ? `https://qr-official.line.me/sid/L/${encodeURIComponent(CONFIG.lineBasicId.replace(/^@/, ""))}.png` : "";
  el.innerHTML = `
    <h1>創立メンバー（無料）</h1>
    <div class="card">
      <p style="margin-top:0"><b>LINEで友だち追加するだけ。先着100名の「創立メンバー」を募集しています。</b></p>
      <ul class="small" style="padding-left:20px">
        <li>タカラット<b>集計日の約1週間前</b>にお知らせ（年4回＋締切が近いときだけ）</li>
        <li>オンライン購入の加算タイミングなど、知らないと損する締切情報</li>
        <li>新機能を先に試せる・要望をLINEで直接届けられる</li>
      </ul>
      <p class="muted small" style="margin:0">試算や観劇手帖の内容はLINEにも運営にも送られません。配信が不要になったらブロックするだけで止まります。</p>
    </div>
    ${ready ? `
      <a class="btn" id="add" href="${esc(CONFIG.lineAddUrl)}" target="_blank" rel="noopener" style="background:#06c755;color:#fff">LINEで友だち追加</a>
      ${qr ? `<div class="card" style="text-align:center"><div class="muted small">パソコンの方はスマホで読み取り</div><img src="${qr}" alt="LINE友だち追加QRコード" width="180" height="180" loading="lazy"></div>` : ""}
    ` : `<div class="warn">LINEでの受付を準備中です。もうしばらくお待ちください。</div>`}
    <div id="card"></div>`;
  $("#add", el)?.addEventListener("click", () => { S.line = { ...(S.line || {}), added: true }; save(); setTimeout(() => renderCard($("#card")), 300); });
  if (S.line?.added) renderCard($("#card", el));
}

function renderCard(box) {
  if (!box) return;
  const m = S.line || {};
  const url = CONFIG.siteUrl || location.origin + location.pathname;
  const text = `すみれ手帖の創立メンバーになりました。タカラットの試算と観劇手帖が使える非公式ツール（無料・ログイン不要）`;
  box.innerHTML = `
    <h2>創立メンバー証</h2>
    <p class="muted small">友だち追加ありがとうございます。シェア用の画像を作れます（この端末の中だけで作成）。</p>
    <label>カードに入れる名前（任意）</label><input type="text" id="nick" maxlength="16" value="${esc(m.nickname || "")}" placeholder="ニックネーム">
    <canvas id="cv" width="1080" height="680" aria-label="創立メンバー証" style="margin-top:12px"></canvas>
    <div class="row" style="margin-top:12px">
      <button class="btn sm" id="sh">画像を保存・シェア</button>
      <a class="btn sm ghost" target="_blank" rel="noopener" href="https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=${encodeURIComponent(CONFIG.hashtag)}">Xでシェア</a>
    </div>`;
  const cv = $("#cv", box), g = cv.getContext("2d");
  const draw = () => {
    const ac = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    const grd = g.createLinearGradient(0, 0, 1080, 680); grd.addColorStop(0, ac); grd.addColorStop(1, "#1f1a24");
    g.fillStyle = grd; g.fillRect(0, 0, 1080, 680);
    g.strokeStyle = "rgba(255,255,255,.5)"; g.lineWidth = 3; g.strokeRect(36, 36, 1008, 608);
    g.fillStyle = "#fff"; g.font = "700 44px system-ui,sans-serif"; g.fillText("✦ すみれ手帖", 80, 130);
    g.font = "600 32px system-ui,sans-serif"; g.fillText("FOUNDING MEMBER", 80, 270);
    g.font = "800 110px system-ui,sans-serif"; g.fillText("創立メンバー", 80, 400);
    g.font = "600 48px system-ui,sans-serif"; g.fillText(S.line?.nickname || "", 80, 510);
    g.font = "400 30px system-ui,sans-serif"; g.fillText((TROUPES[S.troupe] ? TROUPES[S.troupe] + "カラー ・ " : "") + "非公式ファンツール", 80, 590);
  };
  draw();
  $("#nick", box).addEventListener("input", (e) => { S.line = { ...(S.line || {}), nickname: e.target.value }; save(); draw(); });
  $("#sh", box).onclick = () => cv.toBlob(async (b) => {
    const file = new File([b], "sumire-founding-member.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], text }); return; } catch {} }
    const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = file.name; a.click();
  });
}


// ---------- 起動 ----------
applyTheme();
route();
if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js");
