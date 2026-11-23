/**
 * Time away as a closed form (spec 2.9 with Decision M26): minders' sales and the gears' shelves
 * over t′, the away report (Decision M8: the mode's own sheet), the income readings, and the
 * board-frozen event stepping the closed form is checked against (gate 9, M26).
 *
 * Package MECHANICS (docs/design/market-build-plan.md).
 *
 * What moves while away (2.9): only the minders' sale clocks and the gears' drop clocks, each
 * re-phased to within one interval of the game clock; the game clock itself does not move, and
 * refills, the Parade, ad cooldowns, `releaseAt`, the till and the undo chip keep their times. The
 * board never changes: every due drop goes to its shelf (its tier drawn from the drop stream, as a
 * drop in play draws it); with the shelf full, the gear waits. On return a shelf that was empty
 * releases at once and then at the 0.5 s cadence (a shelf that was waiting for a freed cell keeps
 * waiting: the board did not change).
 *
 * Rounding (M19): each minder sale is `saleAmount` (rounded as the till takes it in play); the
 * earnings shown and granted are `roundCoins` of their sum, once.
 */
import { drawDropTier, runSale } from './events';
import { currentMods } from './lanterns';
import { EPS, mergeParams, recentRate, roundCoins, saleAmount, saleInterval } from './params';
import { CHAINS, type AwayReport, type MergeConfig, type MergeGame, type MergeState } from './types';

/** Away seconds by the shared guard: t = (now − max(lastSavedAt, stats.clockHigh)) / 1000 (time already paid is never paid again). */
export function awaySeconds(g: MergeGame, now: number): number {
  const from = Math.max(g.lastSavedAt ?? 0, g.stats.clockHigh ?? 0);
  const t = (now - from) / 1000;
  return Number.isFinite(t) && t > 0 ? t : 0;
}

/** What one absence of t′ seconds does, before rounding: the counts and the re-phased clocks. */
interface AwayResult {
  m: MergeState;
  sales: { c: number; goods: number; coins: number }[];
  shelved: { c: number; goods: number }[];
  waiting: number[];
  /** Σ sales × saleAmount, unrounded (each sale is already a whole amount). */
  coins: number;
}

const setChain = (m: MergeState, c: number, patch: Partial<MergeState['chains'][number]>): MergeState => ({ ...m, chains: m.chains.map((ch, i) => (i === c ? { ...ch, ...patch } : ch)) });

/**
 * The closed form of 2.9 over t′ seconds: for each hired minder d = nextSaleAt − clock and
 * sales = t′ ≥ d ? 1 + floor((t′ − d)/Q) : 0; for each open gear that does not wait, n drops the
 * same way with nextPopAt and T, shelf = min(cap, shelf + n) with the tiers drawn from the drop
 * stream, waiting when more were due than the shelf holds. The re-phased clock is the last due
 * time + one interval − t′, accumulated as the event stepping accumulates it (so both give the
 * same number to the last bit).
 */
function closedForm(cfg: MergeConfig, g: MergeGame, tp: number): AwayResult {
  let m = g.merge;
  const clock = g.stats.playSeconds ?? 0;
  const mods = currentMods(cfg, m);
  const Q = saleInterval(cfg, mods);
  const T = cfg.merge.gear.interval;
  const out: AwayResult = { m, sales: [], shelved: [], waiting: [], coins: 0 };
  for (let c = 0; c < CHAINS; c++) {
    const ch = m.chains[c];
    if (!ch?.open) continue;
    if (ch.minder > 0) {
      const d = ch.nextSaleAt - clock;
      const sales = tp + EPS >= d ? 1 + Math.floor((tp - d) / Q + EPS) : 0;
      if (sales > 0) {
        const coins = saleAmount(cfg, g, c);
        let next = ch.nextSaleAt;
        for (let i = 0; i < sales; i++) next += Q;
        m = setChain(m, c, { nextSaleAt: next - tp });
        out.sales.push({ c, goods: sales, coins: sales * coins });
        out.coins += sales * coins;
      }
    }
    if (!ch.waiting) {
      const d = ch.nextPopAt - clock;
      const n = tp + EPS >= d ? 1 + Math.floor((tp - d) / T + EPS) : 0;
      if (n > 0) {
        const room = Math.max(0, mods.shelfCap - ch.shelf.length);
        const put = Math.min(n, room);
        const shelf = ch.shelf.slice();
        let drawn = m.draws.drop[c] ?? 0;
        for (let i = 0; i < put; i++) shelf.push(drawDropTier(cfg, m, mods, c, drawn++));
        let patch: Partial<MergeState['chains'][number]> = { shelf };
        if (n > room) {
          patch.waiting = true;
          out.waiting.push(c);
        } else {
          let next = ch.nextPopAt;
          for (let i = 0; i < n; i++) next += T;
          patch.nextPopAt = next - tp;
        }
        if (put > 0 && ch.shelf.length === 0) patch = { ...patch, releaseAt: clock, blockedAt: null };
        m = setChain(m, c, patch);
        m = { ...m, draws: { ...m.draws, drop: m.draws.drop.map((v, i) => (i === c ? drawn : v)) }, mstats: { ...m.mstats, drops: m.mstats.drops + put } };
        if (put > 0) out.shelved.push({ c, goods: put });
      }
    }
  }
  return { ...out, m };
}

/**
 * The same absence by event stepping with the board frozen (M26): every drop and sale due in
 * (clock, clock + t′] runs in time order with the queue's tie rule, a drop going only to the shelf
 * (or the gear waiting), a sale adding to the away earnings instead of the till; then the two
 * clocks are shifted back by t′. For the cross-check of gate 9 (src/engine/merge/offline.test.ts,
 * the bot); the app uses the closed form.
 */
export function awayByEvents(cfg: MergeConfig, g: MergeGame, tp: number): AwayResult {
  const clock = g.stats.playSeconds ?? 0;
  const end = clock + tp;
  let x = g;
  const sales = new Map<number, { goods: number; coins: number }>();
  const shelved = new Map<number, number>();
  const wasEmpty = g.merge.chains.map((ch) => ch.shelf.length === 0);
  let coins = 0;
  // Only drops and sales run while away; ties as the queue breaks them (drop before sale, lower index first).
  for (let guard = 0; guard < 10_000_000; guard++) {
    let best: { at: number; kind: 0 | 1; c: number } | null = null;
    for (let c = 0; c < CHAINS; c++) {
      const ch = x.merge.chains[c];
      if (!ch.open) continue;
      if (!ch.waiting && ch.nextPopAt <= end + EPS && (!best || ch.nextPopAt < best.at || (ch.nextPopAt === best.at && (0 < best.kind || (best.kind === 0 && c < best.c))))) best = { at: ch.nextPopAt, kind: 0, c };
      if (ch.minder > 0 && ch.nextSaleAt <= end + EPS && (!best || ch.nextSaleAt < best.at || (ch.nextSaleAt === best.at && best.kind === 1 && c < best.c))) best = { at: ch.nextSaleAt, kind: 1, c };
    }
    if (!best) break;
    if (best.kind === 0) {
      const before = x.merge.chains[best.c].shelf.length;
      x = stepDrop(cfg, x, best.c, best.at);
      if (x.merge.chains[best.c].shelf.length > before) shelved.set(best.c, (shelved.get(best.c) ?? 0) + 1);
    } else {
      const r = runSale(cfg, x, best.c, best.at, undefined, false);
      x = r.g;
      coins += r.coins;
      const s = sales.get(best.c) ?? { goods: 0, coins: 0 };
      sales.set(best.c, { goods: s.goods + 1, coins: s.coins + r.coins });
    }
  }
  let m = x.merge;
  const waiting: number[] = [];
  for (let c = 0; c < CHAINS; c++) {
    const ch = m.chains[c];
    const was = g.merge.chains[c];
    if (!ch.open) continue;
    const patch: Partial<MergeState['chains'][number]> = {};
    if (ch.minder > 0 && sales.has(c)) patch.nextSaleAt = ch.nextSaleAt - tp;
    if (ch.waiting && !was.waiting) waiting.push(c);
    else if (!ch.waiting && ch.nextPopAt !== was.nextPopAt) patch.nextPopAt = ch.nextPopAt - tp;
    if (wasEmpty[c] && ch.shelf.length > 0) Object.assign(patch, { releaseAt: clock, blockedAt: null });
    m = setChain(m, c, patch);
  }
  return {
    m,
    sales: [...sales.entries()].sort((a, b) => a[0] - b[0]).map(([c, s]) => ({ c, goods: s.goods, coins: s.coins })),
    shelved: [...shelved.entries()].sort((a, b) => a[0] - b[0]).map(([c, goods]) => ({ c, goods })),
    waiting,
    coins,
  };
}

/** One frozen-board drop at time t: to the shelf, or the gear waits (2.4 event 1 with no room). */
function stepDrop(cfg: MergeConfig, g: MergeGame, c: number, t: number): MergeGame {
  const m = g.merge;
  const ch = m.chains[c];
  const mods = currentMods(cfg, m);
  if (ch.shelf.length >= mods.shelfCap) return { ...g, merge: setChain(m, c, { waiting: true }) };
  const n = m.draws.drop[c] ?? 0;
  const k = drawDropTier(cfg, m, mods, c, n);
  const mm = setChain(m, c, { shelf: ch.shelf.concat(k), nextPopAt: t + cfg.merge.gear.interval });
  return { ...g, merge: { ...mm, draws: { ...mm.draws, drop: mm.draws.drop.map((v, i) => (i === c ? n + 1 : v)) }, mstats: { ...mm.mstats, drops: mm.mstats.drops + 1 } } };
}

/**
 * EngineMode.offline (2.9): t = (now − max(lastSavedAt, stats.clockHigh)) / 1000, t′ = min(t, cap)
 * (the cap 4 h, +2 h with lantern 6, +4 h with Late Hours: `mergeParams().awayCap`); the earnings
 * to grant (NOT added to cash: the store grants them with `E.grantCash`, × 1.5 with the ad), the
 * game with the minders' and gears' clocks re-phased and the shelves filled, and the report.
 * Nothing happens for t ≤ 0 (the same game comes back).
 */
export function mergeOffline(cfg: MergeConfig, g: MergeGame, now: number): { seconds: number; earnings: number; game: MergeGame; report?: AwayReport } {
  const t = awaySeconds(g, now);
  if (t <= 0) return { seconds: 0, earnings: 0, game: g };
  const tp = Math.min(t, mergeParams(cfg, g).awayCap);
  const r = closedForm(cfg, g, tp);
  const earnings = roundCoins(cfg, r.coins);
  const report: AwayReport = { seconds: t, effective: tp, sales: r.sales, earnings, shelved: r.shelved, waiting: r.waiting };
  return { seconds: t, earnings, game: { ...g, merge: r.m }, report };
}

/** The closed form over t′ seconds, for the cross-check against `awayByEvents` (offline.test.ts, the bot). */
export function awayClosedForm(cfg: MergeConfig, g: MergeGame, tp: number): AwayResult {
  return closedForm(cfg, g, tp);
}

/** income(): the minder rate, coins per s, as the till takes it (each sale rounded, M19) (2.9). */
export function mergeIncome(cfg: MergeConfig, g: MergeGame): number {
  const mods = currentMods(cfg, g.merge);
  const Q = saleInterval(cfg, mods);
  let rate = 0;
  for (let c = 0; c < CHAINS; c++) rate += saleAmount(cfg, g, c) / Q;
  return rate;
}

/** activeIncome(): the `recent` ticket rate plus the minder rate (2.9). */
export function mergeActiveIncome(cfg: MergeConfig, g: MergeGame): number {
  return recentRate(g) + mergeIncome(cfg, g);
}

const isReport = (r: unknown): r is AwayReport => !!r && typeof r === 'object' && Array.isArray((r as AwayReport).sales) && Array.isArray((r as AwayReport).shelved);

/** EngineMode.reportAlone: true when the shelves were filled with no minder selling (2.9: "Your gear filled its shelves."). */
export function awayReportAlone(report: unknown): boolean {
  if (!isReport(report)) return false;
  return report.sales.length === 0 && report.shelved.some((s) => s.goods > 0);
}

/**
 * EngineMode.mergeReport: two reports of one absence (a resume while the first is still on screen)
 * as one: the times, the sales, the shelf goods and the earnings added, the waiting gears of both.
 */
export function mergeAwayReports(older: unknown, newer: unknown): unknown {
  if (!isReport(older)) return newer ?? older;
  if (!isReport(newer)) return older;
  const add = <T extends { c: number }>(a: T[], b: T[], f: (x: T, y: T) => T) => {
    const map = new Map<number, T>();
    for (const x of a) map.set(x.c, x);
    for (const y of b) map.set(y.c, map.has(y.c) ? f(map.get(y.c)!, y) : y);
    return [...map.values()].sort((x, y) => x.c - y.c);
  };
  const merged: AwayReport = {
    seconds: older.seconds + newer.seconds,
    effective: older.effective + newer.effective,
    sales: add(older.sales, newer.sales, (x, y) => ({ c: x.c, goods: x.goods + y.goods, coins: x.coins + y.coins })),
    earnings: older.earnings + newer.earnings,
    shelved: add(older.shelved, newer.shelved, (x, y) => ({ c: x.c, goods: x.goods + y.goods })),
    waiting: [...new Set([...older.waiting, ...newer.waiting])].sort((a, b) => a - b),
  };
  return merged;
}
