import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNews, isTicketNews, buildMessage } from '../scripts/news-parse.mjs';

const html = `
<a href="/news/20261125_004.html" target="_self">
  <div class="item 2026/11/25">
    <div class="head"><span class="date">2026.11.25</span><span class="tag"></span></div>
    <div class="body"><span class="txt">＜宝塚友の会 チケット先行販売「第1抽選方式」＞宙組 宝塚大劇場公演『The London Way』</span></div>
  </div>
</a>
<a href="/news/20261022_001.html" target="_self">
  <div class="item 2026/10/22">
    <div class="head"><span class="date">2026.10.22</span></div>
    <div class="body"><span class="txt">チケット不正転売禁止法違反による検挙事案について</span></div>
  </div>
</a>
<a href="/news/20261120_002.html" target="_self">
  <div class="item 2026/11/20">
    <div class="head"><span class="date">2026.11.20</span></div>
    <div class="body"><span class="txt">花組 新人公演の配役について &amp; お知らせ</span></div>
  </div>
</a>`;

test('お知らせを拾う', () => {
  const items = parseNews(html);
  assert.equal(items.length, 3);
  assert.equal(items[0].url, 'https://kageki.hankyu.co.jp/news/20261125_004.html');
  assert.equal(items[0].date, '2026.11.25');
  assert.equal(items[2].title, '花組 新人公演の配役について & お知らせ');
});

test('チケットのお知らせだけ通す（不正転売の注意は除く）', () => {
  const hits = parseNews(html).filter(isTicketNews).map((it) => it.id);
  assert.deepEqual(hits, ['/news/20261125_004.html']);
});

test('文面に見出しとリンクが入る', () => {
  const text = buildMessage(parseNews(html).filter(isTicketNews));
  assert.match(text, /The London Way/);
  assert.match(text, /20261125_004\.html/);
});
