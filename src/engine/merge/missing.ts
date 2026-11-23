/**
 * `missing(lines, goods)` (spec 2.7): what a set of lines still needs after the goods at hand,
 * pure and exported. Since decision M4 (bound (d) is (d1) only) it serves bound (b) of the draw
 * (./draw.ts), the advice and the hints; it no longer serves a bound of its own.
 *
 * Package ORDERS (docs/design/market-build-plan.md). MECHANICS does not call it.
 *
 * Why the greedy is exact: every good of tier t holds 2^(t−1) basic units, and only two identical
 * goods merge. Taking a line's goods from the highest tier down while each still fits in the
 * 2^(k−1) units the line holds is the greedy of a binary number system, which never overshoots
 * and leaves the least still needed; the exact solver test (./solver.test.ts) checks it against a
 * brute force over every merge sequence. A taken good below the gear's base tier may be useless
 * (nothing of its tier will ever drop to pair it), but it only ever lowers the units by less than
 * one drop, so `popsNeeded` (a ceiling) is still the exact number of drops.
 */
import type { Good, MergeState, MissingResult } from './types';

/** `missing()` with the goods each line took, for the hand bound (b) of the draw. ORDERS. */
export interface MissingDetail extends MissingResult {
  /** Goods taken from the pool by each line (input order). */
  used: number[];
}

/**
 * Lines are taken highest tier first (ties in input order); each takes its chain's goods of tier
 * ≤ k greedily from the highest tier while they fit in 2^(k−1) basic units, removes them from the
 * pool, and leaves the units still needed. Results are in the lines' input order. Pure.
 */
export function missingDetail(lines: readonly Pick<Good, 'c' | 'k'>[], goods: readonly Good[]): MissingDetail {
  // pool[c][t]: goods of chain c at tier t (1 to 8) still in the pool.
  const pool = new Map<number, number[]>();
  for (const g of goods) {
    if (!(g.k >= 1 && g.k <= 8)) continue;
    let row = pool.get(g.c);
    if (!row) pool.set(g.c, (row = [0, 0, 0, 0, 0, 0, 0, 0, 0]));
    row[g.k]++;
  }
  const order = lines.map((_, i) => i).sort((a, b) => lines[b].k - lines[a].k || a - b);
  const units = lines.map(() => 0);
  const used = lines.map(() => 0);
  for (const i of order) {
    const { c, k } = lines[i];
    let need = Math.pow(2, Math.max(0, Math.min(8, k) - 1));
    const row = pool.get(c);
    if (row) {
      for (let t = Math.min(8, k); t >= 1 && need > 0; t--) {
        const size = Math.pow(2, t - 1);
        if (row[t] === 0 || size > need) continue;
        const take = Math.min(row[t], Math.floor(need / size));
        row[t] -= take;
        need -= take * size;
        used[i] += take;
      }
    }
    units[i] = need;
  }
  return { units, used };
}

/** `missing(lines, goods)` of spec 2.7: the basic units each line still needs, in input order. Pure. ORDERS. */
export function missing(lines: readonly Pick<Good, 'c' | 'k'>[], goods: readonly Good[]): MissingResult {
  return { units: missingDetail(lines, goods).units };
}

/** Pops needed for `units` of a chain with base tier b: ceil(units / 2^(b − 1)) (spec 2.7); 0 for no units. ORDERS. */
export function popsNeeded(units: number, base: number): number {
  if (!(units > 0)) return 0;
  return Math.ceil(units / Math.pow(2, Math.max(1, Math.floor(base)) - 1) - 1e-9);
}

/** The goods at hand for `missing()`: the board, the shelves and the pending gift goods (spec 2.7, 5.5). ORDERS. */
export function goodsAtHand(m: Pick<MergeState, 'board' | 'chains' | 'gift'>): Good[] {
  const out: Good[] = [];
  for (const cell of m.board) if (cell !== null && typeof cell === 'object') out.push({ c: cell.c, k: cell.k });
  m.chains.forEach((ch, c) => {
    for (const k of ch.shelf) out.push({ c, k });
  });
  for (const g of m.gift.pendingGoods) out.push({ c: g.c, k: g.k });
  return out;
}
