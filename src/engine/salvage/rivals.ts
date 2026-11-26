/**
 * Rivals and the rank rows (yard-stage1.md 2.11, S17, D19, E24, E27). READS state only (owner:
 * rules-book). Each rival's tonnes are a pure function of the market days since the player's start,
 * T_i(d) = T0 × (1 + g_day × min(d, 40)) (E27). Rivals are passed in list order (rival.1 first); a
 * passed rival NEVER passes back: as the guard of S17 the k-th rival below the player shows at most
 * (1 − 0.03 k) of the player's tonnes, and every printed figure differs from its neighbours'.
 */
import type { SalvageContent } from '../../config/schema.salvage';
import { rangeChips, rungsOf } from './ladder';
import { tonnesStep_g } from './money';
import type { IndustryTable, RivalId, SalvageConfig, SalvageGame, TableRow } from './types';

/** A rival's tonnes on market day d since the player's start, grams (E27). */
export function rivalGrams(c: SalvageContent, i: number, d: number): number {
  const r = c.rivals.list[i];
  if (!r) return 0;
  return Math.round(r.T0_t * 1e6 * (1 + r.g_day * Math.min(Math.max(0, d), 40)));
}

/** Market days since the player's start (the rivals' d). */
export function rivalDay(g: SalvageGame): number {
  return Math.max(0, g.salvage.clock.day - g.salvage.clock.startDay);
}

/**
 * How many rivals the player has passed now: from `prev` (the state's `ladder.passed`, never less), the
 * next rival in list order is passed while the player's supplied grams exceed its tonnes. The rules
 * call this at their checks (2.12 step 6) and emit `passed` for each index in [prev, result).
 */
export function passedCount(c: SalvageContent, supplied_g: number, d: number, prev: number): number {
  let n = Math.max(0, Math.min(prev, c.rivals.list.length));
  while (n < c.rivals.list.length && supplied_g > rivalGrams(c, n, d)) n++;
  return n;
}

/** The facade's form for the rules-sim: the new passed count of the state. */
export function passedNow(cfg: SalvageConfig, g: SalvageGame): number {
  return passedCount(cfg.salvage, g.salvage.ladder.supplied_g, rivalDay(g), g.salvage.ladder.passed);
}

/** The grams of one printed step of a tonnes figure (money.ts fmtTonnes: 0.01 t below 10 t, 0.1 t below 100 t, whole tonnes from it). */
function unitOf(gr: number): number {
  return tonnesStep_g(gr);
}
const floorTo = (gr: number, u: number) => Math.floor(gr / u) * u;
const ceilTo = (gr: number, u: number) => Math.ceil(gr / u) * u;
const roundTo = (gr: number, u: number) => Math.round(gr / u) * u;

/**
 * The tonnes each row PRINTS, grams, already at its printed step (so two rows never print the same):
 * the player's own supplied grams; above him the rivals not yet passed, each at least one printed
 * step above the row below; below him the passed rivals, the k-th at most (1 − 0.03 k) of the
 * player's tonnes and at least one printed step below the row above (never below 0).
 */
export function shownTonnes(c: SalvageContent, supplied_g: number, d: number, passed: number): { you: number; rivals: number[] } {
  const n = c.rivals.list.length;
  const p = Math.max(0, Math.min(passed, n));
  const you = roundTo(Math.max(0, supplied_g), unitOf(supplied_g));
  const out = new Array<number>(n).fill(0);
  let below = you;
  for (let i = p - 1, k = 1; i >= 0; i--, k++) {
    const raw = rivalGrams(c, i, d);
    const cap = (1 - 0.03 * k) * supplied_g;
    const u = unitOf(Math.min(raw, cap));
    const v = Math.min(floorTo(raw, u), floorTo(cap, u), below - unitOf(below));
    out[i] = Math.max(0, v);
    below = out[i];
  }
  let above = you;
  for (let i = p; i < n; i++) {
    const raw = rivalGrams(c, i, d);
    const u = unitOf(raw);
    const v = Math.max(ceilTo(raw, u), above + unitOf(above));
    out[i] = v;
    above = v;
  }
  return { you, rivals: out };
}

/**
 * The 26 rank rows (2.11): the rivals not yet passed above the player (most tonnes first), the
 * player's row (pinned by the screen), the passed rivals below. Rank = position. Rivals are
 * "simulated"; names and chips by register id.
 */
export function rankRows(c: SalvageContent, g: SalvageGame): TableRow[] {
  const s = g.salvage;
  const d = rivalDay(g);
  const passed = passedCount(c, s.ladder.supplied_g, d, s.ladder.passed);
  const shown = shownTonnes(c, s.ladder.supplied_g, d, passed);
  const row = (i: number): TableRow => {
    const r = c.rivals.list[i];
    return { rank: 0, id: r.id, name: r.id, chip: `${r.id}.chip`, tonnes_g: shown.rivals[i], simulated: true, logo: r.sprite ?? null };
  };
  const above: TableRow[] = [];
  for (let i = c.rivals.list.length - 1; i >= passed; i--) above.push(row(i));
  const below: TableRow[] = [];
  for (let i = passed - 1; i >= 0; i--) below.push(row(i));
  const you: TableRow = { rank: 0, id: 'you', name: 'homeYard', chip: 'homeYard', tonnes_g: shown.you, simulated: false, logo: null };
  return [...above, you, ...below].map((r, i) => ({ ...r, rank: i + 1 }));
}

/** The industry table (2.11): rows, the player's rank, the next rival up and the grams still needed, nine rungs, range chips. */
export function tableOf(c: SalvageContent, g: SalvageGame): IndustryTable {
  const s = g.salvage;
  const rows = rankRows(c, g);
  const rank = rows.findIndex((r) => r.id === 'you') + 1;
  const above = rows[rank - 2];
  const next = above ? { rival: above.id as RivalId, name: above.name, chip: above.chip, need_g: Math.max(1, above.tonnes_g - s.ladder.supplied_g + 1) } : null;
  const rungs = rungsOf(c).map((r) => ({ ...r, current: r.n === s.ladder.rung, open: r.n <= s.ladder.rung }));
  return { rows, rank, next, rungs, range: rangeChips(c, s.ladder.worth, s.ladder.rung) };
}

/** Facade `industryTable(cfg, g)`. */
export function industryTable(cfg: SalvageConfig, g: SalvageGame): IndustryTable {
  return tableOf(cfg.salvage, g);
}

/** The rival passed last (for "25th of 26 · passed {rival}"), or null. */
export function lastPassed(c: SalvageContent, g: SalvageGame): RivalId | null {
  const n = passedCount(c, g.salvage.ladder.supplied_g, rivalDay(g), g.salvage.ladder.passed);
  return n > 0 ? (c.rivals.list[n - 1]?.id ?? null) : null;
}
