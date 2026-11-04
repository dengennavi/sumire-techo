import test from "node:test";
import assert from "node:assert/strict";
import { RULES } from "../rules.js";
import { calc, planTo, nextAggregation, stageOf } from "../calc.js";

test("ステージ境界値", () => {
  const s = (t) => stageOf(t, RULES).id;
  assert.equal(s(0), "white");
  assert.equal(s(299), "white");
  assert.equal(s(300), "bronze");
  assert.equal(s(1999), "bronze");
  assert.equal(s(2000), "silver");
  assert.equal(s(2499), "silver");
  assert.equal(s(2500), "gold");
});

test("友の会入会のみ → ブロンズ", () => {
  const r = calc({ tomoJoin: true }, RULES);
  assert.equal(r.total, 300);
  assert.equal(r.stage.id, "bronze");
  assert.equal(r.next.id, "silver");
  assert.equal(r.toNext, 1700);
});

test("チケット上限1,000（10万円）", () => {
  assert.equal(calc({ ticketYen: 99999 }, RULES).total, 999);
  assert.equal(calc({ ticketYen: 100000 }, RULES).total, 1000);
  assert.equal(calc({ ticketYen: 500000 }, RULES).total, 1000);
  assert.ok(calc({ ticketYen: 500000 }, RULES).groups.ticket.capped);
});

test("キャトルレーヴは店舗＋オンライン合算で上限1,000", () => {
  assert.equal(calc({ quatreStoreYen: 80000, quatreOnlineYen: 80000 }, RULES).total, 1000);
  assert.equal(calc({ quatreStoreYen: 150, quatreOnlineYen: 50 }, RULES).total, 2);
});

test("継続年数は×10で上限100", () => {
  assert.equal(calc({ tomoYears: 3 }, RULES).total, 30);
  assert.equal(calc({ tomoYears: 25 }, RULES).total, 100);
});

test("共通ID＋は最大12か月", () => {
  assert.equal(calc({ idPlusMonths: 12 }, RULES).total, 84);
  assert.equal(calc({ idPlusMonths: 99 }, RULES).total, 84);
});

test("友の会・ID＋・チケット・グッズを全部上限まで使っても2,484でゴールドに届かない", () => {
  const base = { tomoJoin: true, tomoYears: 10, idPlusMonths: 12, ticketYen: 100000, quatreStoreYen: 100000 };
  const r0 = calc(base, RULES);
  assert.equal(r0.total, 2484);
  assert.equal(r0.stage.id, "silver");
  const r = calc({ ...base, squareMonths: 4 }, RULES); // タカスク月額で+20
  assert.equal(r.total, 2504);
  assert.equal(r.stage.id, "gold");
  assert.equal(r.next, null);
});

test("予定購入は上限グループに合算", () => {
  const r = calc({ ticketYen: 90000 }, RULES, { ticketYen: 50000 });
  assert.equal(r.total, 1000);
});

test("逆算：上限の残りを超える場合は単独不可", () => {
  const r = calc({ tomoJoin: true, ticketYen: 95000 }, RULES); // 1250
  const p = planTo(r, RULES.stages[2], RULES); // silver 2000 → 750不足
  assert.equal(p.need, 750);
  assert.equal(p.ticketOnly, null); // 残り50ptしかない
  assert.equal(p.quatreOnly, 75000);
  assert.equal(p.combinedPossible, true);
});

test("逆算：両方上限でも届かない", () => {
  const r = calc({ ticketYen: 100000, quatreStoreYen: 100000 }, RULES); // 2000
  const p = planTo(r, RULES.stages[3], RULES);
  assert.equal(p.need, 500);
  assert.equal(p.combinedPossible, false);
});

test("次の集計日", () => {
  const a = nextAggregation(new Date(2026, 10, 4), RULES);
  assert.equal(a.date.toDateString(), new Date(2026, 11, 31).toDateString());
  assert.equal(a.days, 57);
  assert.equal(a.effective.toDateString(), new Date(2027, 0, 15).toDateString());
  assert.equal(a.onlineShipBy.toDateString(), new Date(2026, 10, 30).toDateString());
  const b = nextAggregation(new Date(2027, 0, 5), RULES);
  assert.equal(b.date.toDateString(), new Date(2027, 2, 31).toDateString());
  assert.equal(b.isYearEnd, true);
  assert.equal(b.effective.toDateString(), new Date(2027, 3, 15).toDateString());
  const c = nextAggregation(new Date(2026, 5, 30), RULES);
  assert.equal(c.days, 0);
});
