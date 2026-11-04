// タカラット概算ロジック（DOM非依存。node:test でテスト可能）
const n = (v) => Math.max(0, Number(v) || 0);

export function calc(input, rules, extra = {}) {
  const groups = {}; // key -> { yen, pt }
  const lines = [];
  for (const it of rules.items) {
    const key = it.capKey || it.id;
    let v = n(input[it.id]);
    if (it.id === "ticketYen") v += n(extra.ticketYen);
    if (it.id === "quatreOnlineYen") v += n(extra.quatreYen);
    const g = (groups[key] ||= { yen: 0, raw: 0, items: [] });
    g.items.push(it);
    if (it.type === "yen") g.yen += v;
    else if (it.type === "count") g.raw += Math.min(v, it.max ?? Infinity) * it.ptPer;
    else if (it.type === "flag") g.raw += input[it.id] ? it.pt : 0;
  }
  let total = 0;
  for (const [key, g] of Object.entries(groups)) {
    const raw = g.raw + Math.floor(g.yen / rules.yenPerPt);
    const cap = rules.caps[key];
    const pt = cap != null ? Math.min(raw, cap) : raw;
    total += pt;
    lines.push({ key, label: g.items.map((i) => i.label).join("＋"), pt, raw, cap, capped: cap != null && raw >= cap });
  }
  const stage = stageOf(total, rules);
  const next = rules.stages.find((s) => s.min > total) || null;
  return { total, lines, groups: Object.fromEntries(lines.map((l) => [l.key, l])), stage, next, toNext: next ? next.min - total : 0 };
}

export function stageOf(total, rules) {
  return [...rules.stages].reverse().find((s) => total >= s.min);
}

// 目標ステージまでの不足と、上限を考慮した必要額
export function planTo(result, target, rules) {
  const need = Math.max(0, target.min - result.total);
  const room = (k) => {
    const l = result.groups[k];
    return l && l.cap != null ? Math.max(0, l.cap - l.pt) : Infinity;
  };
  const tRoom = room("ticket"), qRoom = room("quatre");
  const yen = need * rules.yenPerPt;
  return {
    target, need, yen,
    ticketOnly: need <= tRoom ? yen : null,
    quatreOnly: need <= qRoom ? yen : null,
    combinedPossible: need <= tRoom + qRoom,
    ticketRoomYen: tRoom * rules.yenPerPt,
    quatreRoomYen: qRoom * rules.yenPerPt,
  };
}

const d0 = (y, m, d) => new Date(y, m - 1, d);
const dayDiff = (a, b) => Math.round((b - a) / 86400000);

// 次の集計日・締切の目安
export function nextAggregation(today, rules) {
  const t = d0(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const list = [];
  for (const y of [t.getFullYear() - 1, t.getFullYear(), t.getFullYear() + 1])
    for (const [m, d] of rules.aggregations) list.push(d0(y, m, d));
  list.sort((a, b) => a - b);
  const agg = list.find((x) => x >= t);
  const m = agg.getMonth() + 1;
  const eff = d0(agg.getFullYear() + (m === 12 ? 1 : 0), (m % 12) + 1, rules.effectiveDay);
  const dayBefore = new Date(agg); dayBefore.setDate(agg.getDate() - 1);
  const onlineShip = d0(agg.getFullYear(), m, 0); // 前月末
  const fy = agg.getMonth() + 1 >= 4 ? agg.getFullYear() : agg.getFullYear() - 1;
  return { date: agg, days: dayDiff(t, agg), effective: eff, ticketBy: dayBefore, storeBy: dayBefore, onlineShipBy: onlineShip, isYearEnd: m === 3, fiscalYear: fy };
}

export function fiscalYearOf(date) {
  return date.getMonth() + 1 >= 4 ? date.getFullYear() : date.getFullYear() - 1;
}
