/**
 * `missing(lines, goods)` (spec 2.7, 10.2): hand-worked cases of the greedy; optimality against
 * the exact solver over 10^4 small boards is in ./solver.test.ts. Package ORDERS.
 */
import { describe, expect, it } from 'vitest';
import { freshState, mergeTestConfig } from '../fixtures/merge';
import { goodsAtHand, missing, missingDetail, popsNeeded } from './missing';
import type { Good } from './types';

const g = (c: number, k: number): Good => ({ c, k });

describe('missing() (2.7)', () => {
  it('takes goods of tier ≤ k greedily from the highest tier while they fit in 2^(k−1) units', () => {
    // A Skewer Bundle (grill 4, 8 units) from a Glazed (4), a Twin (2) and two Peppers (1 + 1).
    expect(missing([g(0, 4)], [g(0, 3), g(0, 2), g(0, 1), g(0, 1)]).units).toEqual([0]);
    // Same chain, but with a Skewer Fan on the board: tier 5 is above the line, never taken.
    expect(missing([g(0, 4)], [g(0, 5), g(0, 2)]).units).toEqual([6]);
    // A good that does not fit what is left is skipped, a smaller one is taken.
    expect(missingDetail([g(0, 3)], [g(0, 3), g(0, 3), g(0, 1)])).toEqual({ units: [0], used: [1] });
    // Other chains are not used.
    expect(missing([g(1, 3)], [g(0, 3), g(0, 2)]).units).toEqual([4]);
  });

  it('takes lines highest tier first, then in input order, each from what the ones before left', () => {
    // The tier 4 takes the Glazed first; the tier 3 asked first gets nothing.
    expect(missing([g(0, 3), g(0, 4)], [g(0, 3)]).units).toEqual([4, 4]);
    // Equal tiers: the first in input order takes the good.
    expect(missing([g(0, 3), g(0, 3)], [g(0, 3)]).units).toEqual([0, 4]);
  });

  it('pops = ceil(units / 2^(b − 1)), and 0 for nothing needed', () => {
    expect(popsNeeded(0, 1)).toBe(0);
    expect(popsNeeded(-1, 3)).toBe(0);
    expect(popsNeeded(5, 1)).toBe(5);
    expect(popsNeeded(5, 2)).toBe(3);
    expect(popsNeeded(8, 4)).toBe(1);
    expect(popsNeeded(3, 3)).toBe(1);
  });

  it('is pure: the inputs are not changed', () => {
    const lines = [g(0, 3)];
    const goods = [g(0, 2), g(0, 2)];
    const copy = JSON.stringify({ lines, goods });
    missing(lines, goods);
    expect(JSON.stringify({ lines, goods })).toBe(copy);
  });

  it('the goods at hand are the board, the shelves and the pending gift goods', () => {
    const cfg = mergeTestConfig();
    const s = freshState(cfg);
    const chains = s.merge.chains.map((ch, c) => (c === 0 ? { ...ch, shelf: [1, 2] } : ch));
    const m = { ...s.merge, chains, gift: { ...s.merge.gift, pendingGoods: [g(0, 3)] } };
    const onBoard = s.merge.board.filter((x) => x !== null && typeof x === 'object').length;
    const at = goodsAtHand(m);
    expect(at.length).toBe(onBoard + 3);
    expect(at.slice(onBoard)).toEqual([g(0, 1), g(0, 2), g(0, 3)]);
  });
});
