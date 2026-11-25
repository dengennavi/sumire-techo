// 宝塚歌劇公式ニュース一覧のHTMLから、チケット・抽選のお知らせを拾う（DOM非依存）

export const NEWS_URL = 'https://kageki.hankyu.co.jp/news/index.html';
const BASE = 'https://kageki.hankyu.co.jp';

const INCLUDE = /抽選|先行販売|前売|チケット発売|一般発売|追加販売|当日券/;
const EXCLUDE = /不正転売|検挙/;

function decode(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

// 全お知らせを [{id, url, date, title}] で返す
export function parseNews(html) {
  const items = [];
  const re = /<a href="(\/news\/[^"]+\.html)"[^>]*>\s*<div class="item[^"]*">([\s\S]*?)<\/a>/g;
  let m;
  while ((m = re.exec(html))) {
    const [, path, body] = m;
    const date = (body.match(/<span class="date">([^<]+)<\/span>/) || [])[1];
    const title = (body.match(/<span class="txt">([\s\S]*?)<\/span>/) || [])[1];
    if (!date || !title) continue;
    items.push({ id: path, url: BASE + path, date: date.trim(), title: decode(title.replace(/<[^>]*>/g, '')) });
  }
  return items;
}

export function isTicketNews(item) {
  return INCLUDE.test(item.title) && !EXCLUDE.test(item.title);
}

// LINEに送る文面（1回の送信にまとめる。通数は人数で数えるので、まとめても1人1通）
export function buildMessage(items) {
  const lines = ['【すみれ手帖】宝塚公式にチケットのお知らせが出ました', ''];
  for (const it of items.slice(0, 5)) {
    lines.push(`■${it.date}`, it.title, it.url, '');
  }
  if (items.length > 5) lines.push(`ほか${items.length - 5}件`, '');
  lines.push('申込方法・期間は必ずリンク先の公式ページで確かめてください（すみれ手帖は非公式です）');
  return lines.join('\n').slice(0, 4900);
}
