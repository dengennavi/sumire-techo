// 宝塚公式ニュースを見に行き、新しいチケット・抽選のお知らせがあればLINE友だち全員に送る。
// 使い方:
//   node scripts/watch-news.mjs --seed     今あるお知らせを「既読」にするだけ（送らない）
//   node scripts/watch-news.mjs --dry-run  送る文面を表示するだけ
//   LINE_CHANNEL_ID=... LINE_CHANNEL_SECRET=... node scripts/watch-news.mjs  本番（GitHub Actions から1時間ごと）
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { NEWS_URL, parseNews, isTicketNews, buildMessage } from './news-parse.mjs';

const STATE = new URL('../data/news-seen.json', import.meta.url);
const args = new Set(process.argv.slice(2));
const seed = args.has('--seed');
const dryRun = args.has('--dry-run');

async function loadSeen() {
  try { return JSON.parse(await readFile(STATE, 'utf8')); } catch { return null; }
}

async function saveSeen(ids) {
  await mkdir(dirname(STATE.pathname), { recursive: true });
  await writeFile(STATE, JSON.stringify({ updated: new Date().toISOString(), seen: [...ids].sort() }, null, 1) + '\n');
}

// 鍵：LINE_CHANNEL_ID と LINE_CHANNEL_SECRET から15分だけ使える鍵をその都度作る（長期トークンがあればそれを使う）
let token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
async function getToken() {
  if (token) return token;
  const { LINE_CHANNEL_ID: id, LINE_CHANNEL_SECRET: secret } = process.env;
  if (!id || !secret) return null;
  const res = await fetch('https://api.line.me/oauth2/v3/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: id, client_secret: secret }),
  });
  if (!res.ok) throw new Error(`LINE token ${res.status}: ${await res.text()}`);
  return (token = (await res.json()).access_token);
}

async function line(path, init = {}) {
  const res = await fetch('https://api.line.me' + path, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`LINE ${path} ${res.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}

const res = await fetch(NEWS_URL, { headers: { 'User-Agent': 'sumire-techo-news-watch (+https://dengennavi.github.io/sumire-techo/)' } });
if (!res.ok) throw new Error(`news ${res.status}`);
const all = parseNews(await res.text());
if (all.length < 10) throw new Error(`お知らせが${all.length}件しか取れない。公式ページの作りが変わった可能性`);

const state = await loadSeen();
const seen = new Set(state?.seen ?? []);
const fresh = all.filter((it) => !seen.has(it.id) && isTicketNews(it));
console.log(`取得${all.length}件 / 新しいチケットのお知らせ${fresh.length}件`);

if (seed || !state) {
  await saveSeen(all.map((it) => it.id));
  console.log('既読として保存（送信なし）');
  process.exit(0);
}

if (fresh.length) {
  const text = buildMessage(fresh);
  console.log('---\n' + text + '\n---');
  if (dryRun) process.exit(0);
  if (!(await getToken())) {
    // 鍵の登録前は失敗にしない（毎時の失敗メールを出さない）。既読にもせず、登録後に送る
    console.log('LINEの鍵が未登録なので送らない');
    process.exit(0);
  }
  const quota = await line('/v2/bot/message/quota');
  const used = await line('/v2/bot/message/quota/consumption');
  console.log(`今月の通数: ${used.totalUsage} / ${quota.value ?? '無制限'}`);
  try {
    await line('/v2/bot/message/broadcast', { method: 'POST', body: JSON.stringify({ messages: [{ type: 'text', text }] }) });
    console.log('LINEに送信した');
  } catch (e) {
    // 上限超えなどで送れなくても、同じお知らせを毎時送り直さないよう既読にする
    console.error('送信できなかった: ' + e.message);
    process.exitCode = 1;
  }
}

if (!dryRun) await saveSeen([...seen, ...all.map((it) => it.id)]);
