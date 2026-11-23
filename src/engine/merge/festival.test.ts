/**
 * The Festival (spec 2.8, 10.2, decisions M21 and M25): seasons 1 to 10 buildable line by line
 * from their opening board, the purse paid once (×2 with lantern 18), the close's gate.
 * Package ORDERS. The modifiers are read through `currentMods` (META's lanterns.ts), mocked here so
 * the lantern-18 case does not depend on META's unfinished body.
 */
import { describe, expect, it, vi } from 'vitest';
import { mergeFixtures, mergeTestConfig } from '../fixtures/merge';
import { canCloseSeason, festivalFor, festivalLineFilled, festivalPurse } from './festival';
import { mergeParams, roundCoins } from './params';
import { seasonRow } from './season';
import type { MergeConfig, MergeEvent, MergeGame, Mods } from './types';

const modsOverride: { value: Partial<Mods> | null } = { value: null };
vi.mock('./lanterns', async (orig) => {
  const actual = await orig<typeof import('./lanterns')>();
  return {
    ...actual,
    currentMods: (cfg: MergeConfig, m: MergeGame['merge']) => (modsOverride.value ? { ...actual.neutralMods(cfg), ...modsOverride.value } : actual.currentMods(cfg, m)),
  };
});

const cfg = mergeTestConfig();

/** The cells a season's shape blocks (2.11): the moon gate's stones, the hearth's four braziers. Independent of season.ts's unfinished openingBoard. */
function blockedCells(c: MergeConfig, season: number): number {
  const shape = seasonRow(c, season).shape;
  return shape === 'moonGate' ? c.merge.seasons.moonGateCells.length : shape === 'hearth' ? 4 : 0;
}

/** Builds tier k from drops of tier b one at a time, merging every pair at once: the most goods held at the same time. */
function maxHeld(k: number, b: number): number {
  const held = new Array(10).fill(0);
  let most = 0;
  for (let drops = 0; drops < Math.pow(2, k - b); drops++) {
    held[b]++;
    let t = b;
    most = Math.max(most, held.reduce((a, n) => a + n, 0));
    while (t < k && held[t] === 2) {
      held[t] = 0;
      held[t + 1]++;
      t++;
    }
  }
  expect(held[k]).toBe(1);
  return most;
}

describe('the Festival table (2.8, M25)', () => {
  it('seasons 1 to 10 are buildable line by line from the opening board', () => {
    const R = cfg.merge.tickets.spareCells;
    const openStart = cfg.merge.board.open.length;
    for (let s = 0; s < 10; s++) {
      const lines = festivalFor(cfg, s);
      // M25 (season 1) and 2.8 (season 3 on): 4 to 6 lines; season 2 has season 1's and one more.
      expect(lines.length, `season ${s + 1}`).toBeGreaterThanOrEqual(4);
      expect(lines.length, `season ${s + 1}`).toBeLessThanOrEqual(6);
      // O_start: the cells open at a first start (no shutter opened yet, the worst case) less the shape's blocks.
      const O = openStart - blockedCells(cfg, s);
      const F = O - cfg.merge.seasons.openingGoods;
      for (const l of lines) {
        // A chain that can be opened that season.
        expect(cfg.merge.chains[l.c].fromSeason, `season ${s + 1} chain ${l.c}`).toBeLessThanOrEqual(s);
        expect(l.k).toBeGreaterThanOrEqual(1);
        expect(l.k).toBeLessThanOrEqual(8);
        // b_start = 1, the lowest a chain can start at (no seasoned steps): the most cells a line needs.
        const need = maxHeld(l.k, 1);
        expect(need).toBe(l.k - 1 + 1);
        expect(need, `season ${s + 1} line (${l.c}, ${l.k}): cells(k) ≤ O_start − R`).toBeLessThanOrEqual(O - R);
        expect(need).toBeLessThanOrEqual(F);
      }
    }
  });

  it('the sum of tiers never falls from one season to the next; past the last row, the last row', () => {
    let prev = 0;
    for (let s = 0; s < 12; s++) {
      const sum = festivalFor(cfg, s).reduce((a, l) => a + l.k, 0);
      expect(sum).toBeGreaterThanOrEqual(prev);
      prev = sum;
    }
    const last = cfg.merge.festival.length - 1;
    expect(festivalFor(cfg, last + 5)).toEqual(festivalFor(cfg, last));
    expect(festivalFor(cfg, -1)).toEqual(festivalFor(cfg, 0));
  });

  it('season 2 asks for season 1 and a Puffs line at tier 3 to 5 (2.8)', () => {
    const s1 = festivalFor(cfg, 0);
    const s2 = festivalFor(cfg, 1);
    for (const l of s1) expect(s2).toContainEqual(l);
    const puffs = s2.filter((l) => l.c === 5);
    expect(puffs.length).toBe(1);
    expect(puffs[0].k).toBeGreaterThanOrEqual(3);
    expect(puffs[0].k).toBeLessThanOrEqual(5);
  });
});

/** The near-Festival fixture with every line but `open` filled. */
function allBut(open: number[]): MergeGame {
  const g = mergeFixtures(cfg).festivalNear;
  const lines = g.merge.festival.lines.map((l, i) => ({ ...l, filled: !open.includes(i) }));
  return { ...g, merge: { ...g.merge, festival: { lines, filledAt: null } } };
}

describe('festivalLineFilled and the purse (2.8, 2.3)', () => {
  it('pays the purse once, when the last line lands, through commitCash', () => {
    modsOverride.value = null;
    const g = allBut([]);
    expect(canCloseSeason(cfg, g)).toBe(false);
    const purse = festivalPurse(cfg, g);
    expect(purse).toBe(roundCoins(cfg, cfg.merge.festivalPace * mergeParams(cfg, g).U));
    expect(purse).toBeGreaterThan(0);
    const events: MergeEvent[] = [];
    const paid = festivalLineFilled(cfg, g, 3, events);
    expect(paid.cash).toBe(g.cash + purse);
    expect(paid.merge.mstats.coins.festival).toBe(g.merge.mstats.coins.festival + purse);
    expect(paid.merge.festival.filledAt).toBe(g.stats.playSeconds);
    expect(events).toEqual([{ type: 'festivalDone', coins: purse }]);
    expect(canCloseSeason(cfg, paid)).toBe(true);
    // Once: any later call is refused with the same object.
    for (let i = 0; i < 4; i++) expect(festivalLineFilled(cfg, paid, i)).toBe(paid);
  });

  it('pays nothing while a line is open, for a line not marked filled, or a bad index', () => {
    modsOverride.value = null;
    const g = allBut([2]);
    expect(festivalLineFilled(cfg, g, 1)).toBe(g);
    expect(festivalLineFilled(cfg, g, 2)).toBe(g);
    expect(festivalLineFilled(cfg, g, 9)).toBe(g);
    expect(festivalLineFilled(cfg, g, -1)).toBe(g);
    expect(festivalLineFilled(cfg, g, 1.5)).toBe(g);
    expect(canCloseSeason(cfg, g)).toBe(false);
  });

  it('the purse doubles with lantern 18 (mods.festivalPurseMult) and is rounded once', () => {
    const g = allBut([]);
    modsOverride.value = { festivalPurseMult: 2 };
    const U = mergeParams(cfg, g).U;
    const purse = festivalPurse(cfg, g);
    expect(purse).toBe(roundCoins(cfg, cfg.merge.festivalPace * U * 2));
    expect(festivalLineFilled(cfg, g, 0).cash).toBe(g.cash + purse);
    modsOverride.value = null;
  });
});
