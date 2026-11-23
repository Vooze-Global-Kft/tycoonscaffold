/**
 * The exact solver of spec 2.7 and 10.2 (test only): a brute force over every merge sequence on
 * small boards, against which `missing()` is checked for optimality, and the fast exact check (a
 * binary carry tier by tier) that the draw's property test uses on large states.
 *
 * The problem, per chain: a pool of goods (tiers), the lines asking for this chain, and a gear
 * whose drops are of base tier b. A move is either a drop (one more good of tier b, cost 1) or a
 * merge of two identical goods below tier 8 (cost 0). The lines are fillable once the pool holds
 * every line's good at the same time (a delivery only removes a good, so delivering early never
 * helps). The answer is the least number of drops. Lucky merges and ripe drops can only help, so
 * the bound counts neither (2.7: conservative on purpose).
 *
 * Package ORDERS. No Math.random: cases come from the shared seeded generator (src/engine/rng.ts).
 */
import { describe, expect, it } from 'vitest';
import { rngFloat } from '../rng';
import { missing, missingDetail, popsNeeded } from './missing';
import type { Good } from './types';

/** Exact: 0-1 breadth-first search over pools (tier counts), drops cost 1 and merges 0. Infinity when impossible. */
export function exactMinDrops(goods: readonly number[], lines: readonly number[], base: number): number {
  const K = Math.max(...lines);
  const demand = new Array(K + 1).fill(0);
  for (const k of lines) demand[k]++;
  const start = new Array(K + 1).fill(0);
  for (const t of goods) if (t <= K) start[t]++;
  const unitsOf = (s: number[]) => s.reduce((a, n, t) => a + n * Math.pow(2, t - 1), 0);
  const cap = unitsOf(start) + lines.reduce((a, k) => a + Math.pow(2, k - 1), 0) + Math.pow(2, base - 1);
  const done = (s: number[]) => s.every((n, t) => n >= demand[t]);
  const key = (s: number[]) => s.join(',');
  const dist = new Map<string, number>();
  const deque: { s: number[]; d: number }[] = [{ s: start, d: 0 }];
  dist.set(key(start), 0);
  let head = 0;
  // A simple 0-1 BFS with a two-ended array: 0-cost moves go to the front.
  const front: { s: number[]; d: number }[] = [];
  while (front.length || head < deque.length) {
    const cur = front.length ? front.pop()! : deque[head++];
    if ((dist.get(key(cur.s)) ?? Infinity) < cur.d) continue;
    if (done(cur.s)) return cur.d;
    for (let t = 1; t < Math.min(K, 8); t++) {
      if (cur.s[t] < 2) continue;
      const n = cur.s.slice();
      n[t] -= 2;
      n[t + 1] += 1;
      const kk = key(n);
      if ((dist.get(kk) ?? Infinity) > cur.d) {
        dist.set(kk, cur.d);
        front.push({ s: n, d: cur.d });
      }
    }
    if (base <= K) {
      const n = cur.s.slice();
      n[base] += 1;
      if (unitsOf(n) <= cap) {
        const kk = key(n);
        if ((dist.get(kk) ?? Infinity) > cur.d + 1) {
          dist.set(kk, cur.d + 1);
          deque.push({ s: n, d: cur.d + 1 });
        }
      }
    }
  }
  return Infinity;
}

/** Fast and exact: is the pool plus `drops` goods of tier `base` enough? Tier by tier, the demand of a tier is taken first and the rest merge in pairs. */
export function carryFeasible(goods: readonly number[], lines: readonly number[], base: number, drops: number): boolean {
  const n = new Array(10).fill(0);
  const d = new Array(10).fill(0);
  for (const t of goods) n[t]++;
  for (const k of lines) d[k]++;
  n[base] += drops;
  let carry = 0;
  for (let t = 1; t <= 8; t++) {
    const a = n[t] + carry;
    if (a < d[t]) return false;
    carry = t < 8 ? Math.floor((a - d[t]) / 2) : 0;
  }
  return true;
}

/** The least drops by the fast check (Infinity when no number of drops is enough). */
export function carryMinDrops(goods: readonly number[], lines: readonly number[], base: number): number {
  const limit = lines.reduce((a, k) => a + Math.ceil(Math.pow(2, k - 1) / Math.pow(2, base - 1)), 0) + 1;
  for (let p = 0; p <= limit; p++) if (carryFeasible(goods, lines, base, p)) return p;
  return Infinity;
}

/** missing()'s answer in drops for one chain: Σ over the lines of ceil(units / 2^(b − 1)). */
function missingDrops(goods: readonly number[], lines: readonly number[], base: number): number {
  const det = missingDetail(
    lines.map((k) => ({ c: 0, k })),
    goods.map((k): Good => ({ c: 0, k })),
  );
  return det.units.reduce((a, u) => a + popsNeeded(u, base), 0);
}

function gen(seed: number) {
  let s = seed >>> 0;
  return () => {
    const r = rngFloat(s);
    s = r.seed;
    return r.value;
  };
}

describe('the exact solver (2.7, 10.2)', () => {
  it('agrees with hand-worked cases', () => {
    // Two Pepper Skewers make a Twin Skewer: no drop.
    expect(exactMinDrops([1, 1], [2], 1)).toBe(0);
    // The scripted opening (M18): a Twin (2) and a Glazed (4) need exactly 6 Pepper Skewers.
    expect(exactMinDrops([1, 1, 1, 1, 1, 1], [2, 3], 1)).toBe(0);
    expect(exactMinDrops([1, 1, 1, 1, 1], [2, 3], 1)).toBe(1);
    // A lone tier 1 below base 2 is useless: a tier 3 still needs 2 drops of tier 2.
    expect(exactMinDrops([1], [3], 2)).toBe(2);
    expect(exactMinDrops([1, 1], [3], 2)).toBe(1);
    // A tier 4 asked with a tier 4 at hand: nothing.
    expect(exactMinDrops([4], [4], 1)).toBe(0);
    // A good above the line is useless.
    expect(exactMinDrops([5], [4], 3)).toBe(2);
  });

  it('missing() is optimal and the fast check is exact on 10^4 small boards', () => {
    const rand = gen(20261123);
    let cases = 0;
    let nonZero = 0;
    for (let i = 0; i < 10_000; i++) {
      const base = 1 + Math.floor(rand() * 3);
      const nGoods = Math.floor(rand() * 7);
      const goods: number[] = [];
      for (let j = 0; j < nGoods; j++) goods.push(1 + Math.floor(rand() * 5));
      const nLines = 1 + Math.floor(rand() * 3);
      const lines: number[] = [];
      // Lines as the draw makes them: at least one tier above the base (bound (d1)), at most tier 5 here
      // (and one case in ten a line at the base tier, which (d1) forbids but missing() must still get right).
      for (let j = 0; j < nLines; j++) {
        const lo = rand() < 0.1 ? base : base + 1;
        lines.push(Math.min(6, lo + Math.floor(rand() * Math.max(1, 6 - lo))));
      }
      const exact = exactMinDrops(goods, lines, base);
      const fast = carryMinDrops(goods, lines, base);
      const ours = missingDrops(goods, lines, base);
      if (exact !== ours || exact !== fast) {
        throw new Error(`case ${i}: goods ${goods} lines ${lines} base ${base}: exact ${exact}, fast ${fast}, missing ${ours}`);
      }
      cases++;
      if (exact > 0) nonZero++;
    }
    expect(cases).toBe(10_000);
    // The cases are not all trivial.
    expect(nonZero).toBeGreaterThan(5_000);
  }, 120_000);

  it('missing() keeps chains apart and returns units in the input order', () => {
    const goods: Good[] = [
      { c: 0, k: 2 },
      { c: 1, k: 2 },
      { c: 1, k: 2 },
    ];
    expect(missing([{ c: 0, k: 3 }, { c: 1, k: 3 }], goods).units).toEqual([2, 0]);
  });
});
