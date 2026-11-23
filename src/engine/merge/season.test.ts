/**
 * Seasons (spec 2.11 with M18, M21, M25, M28; tests of 10.2): the two lists exactly, field by
 * field; refused before the Festival; the 16 rows and the repeat; braziers only on open cells;
 * precedence; seasoned gear; familiar faces; pending gift goods kept; the undo chip cleared.
 * Package META. Uses MECHANICS's built `startSeason` and fixtures; no stub of another package is
 * relied on for a result.
 */
import { describe, expect, it } from 'vitest';
import { freshState, mergeFixtures, mergeTestConfig } from '../fixtures/merge';
import { currentMods, neutralMods } from './lanterns';
import { maxPopAt } from './params';
import { closeSeason, familiarFactor, hearthCells, openingBoard, SEASON_BOOKKEEPING, SEASON_RESETS, SEASON_STAYS, seasonedAfterClose, seasonedStartLevel, seasonMods, seasonRow } from './season';
import { isGood } from './board';
import type { MergeEvent, MergeGame } from './types';

const cfg = mergeTestConfig();

/** A state whose Festival is filled, with something in every field the lists name. */
function closable(): MergeGame {
  const g = mergeFixtures(cfg).festivalNear;
  const m = g.merge;
  const chains = m.chains.map((ch, c) => (c === 0 ? { ...ch, shelf: [1, 2], waiting: true, seasoned: 1 } : c === 2 ? { ...ch, seasoned: 3 } : ch));
  const free = m.board.findIndex((cell) => cell === null);
  return {
    ...g,
    entitlements: { ...g.entitlements, products: ['night_awnings', 'night_late_hours'] },
    merge: {
      ...m,
      chains,
      till: 55,
      festival: { lines: m.festival.lines.map((l) => ({ ...l, filled: true })), filledAt: 9000 },
      gift: { ...m.gift, boxes: [{ coins: 90, slots: [{ kind: 'coins' }, { kind: 'spark' }, { kind: 'good', good: { c: 1, k: 4 } }] }], pendingGoods: [{ c: 4, k: 3 }, { c: 5, k: 2 }], ticketsToBox: 7 },
      luckySparks: 2,
      basketUndo: { cell: free, good: { c: 0, k: 2 }, refund: 3, until: 9603 },
      feats: { ...m.feats, tier8sThisSeason: 3 },
      ads: { fillLine: 9700, gearRush: 9800, callDragon: 9900 },
    },
  };
}

/** Every field path of the state the lists must cover (the shared fields the lists name, and every field of `merge`). */
function statePaths(g: MergeGame): string[] {
  const out = ['cash', 'runEarnings', 'entitlements'];
  for (const key of Object.keys(g.merge)) {
    if (key === 'chains') for (const k of Object.keys(g.merge.chains[0])) out.push(`merge.chains[].${k}`);
    else if (key === 'gift') for (const k of Object.keys(g.merge.gift)) out.push(`merge.gift.${k}`);
    else if (key === 'board') out.push('merge.board:goods', 'merge.board:shutters', 'merge.board:blocks');
    else out.push(`merge.${key}`);
  }
  return out;
}

/** The value at a list path. */
function at(g: MergeGame, path: string): unknown {
  if (path.startsWith('merge.board:')) {
    const what = path.split(':')[1];
    return g.merge.board.map((cell, i) => ({ i, cell })).filter(({ cell }) => (what === 'goods' ? isGood(cell) : cell === (what === 'shutters' ? 'shutter' : 'block')));
  }
  if (path.startsWith('merge.chains[].')) {
    const k = path.slice('merge.chains[].'.length) as keyof MergeGame['merge']['chains'][number];
    return g.merge.chains.map((ch) => ch[k]);
  }
  return path.split('.').reduce<unknown>((v, p) => (v as Record<string, unknown>)?.[p], g);
}

describe('season close (2.11)', () => {
  it('is refused (the same object) until the Festival is filled', () => {
    const g = mergeFixtures(cfg).festivalNear;
    expect(g.merge.festival.filledAt).toBeNull();
    const events: MergeEvent[] = [];
    expect(closeSeason(cfg, g, 0, events)).toBe(g);
    expect(events).toEqual([]);
    const fresh = freshState(cfg);
    expect(closeSeason(cfg, fresh, 0)).toBe(fresh);
  });

  it('the resets, stays and bookkeeping lists name every field exactly once', () => {
    const before = closable();
    const after = closeSeason(cfg, before, 0);
    const listed = [...SEASON_RESETS.flatMap((x) => x.fields), ...SEASON_STAYS.flatMap((x) => x.fields), ...Object.keys(SEASON_BOOKKEEPING)];
    const paths = [...new Set([...statePaths(before), ...statePaths(after)])].sort();
    for (const p of paths) expect(listed.filter((x) => x === p), `field ${p} must be in exactly one list`).toHaveLength(1);
    for (const p of listed) expect(paths, `listed field ${p} must exist`).toContain(p);
    expect(new Set(listed).size).toBe(listed.length);
    // The Season scroll's items, in 2.11's order (no Pocket, M5).
    expect(SEASON_RESETS.map((x) => x.id)).toEqual(['coins', 'goods', 'gearLevels', 'stallLevels', 'minderLevels', 'stalls', 'bestTiers', 'shelves', 'tickets', 'till']);
    expect(SEASON_STAYS.map((x) => x.id)).toEqual(['boardSpace', 'lanterns', 'ladderBook', 'giftBoxes', 'pendingGoods', 'luckySparks', 'purchases', 'seasonedGear']);
  });

  it('resets exactly the "Resets" list, field by field', () => {
    const before = closable();
    const after = closeSeason(cfg, before, 0);
    const mods = currentMods(cfg, after.merge);
    expect(after).not.toBe(before);
    expect(after.cash).toBe(0);
    expect(after.runEarnings).toBe(0);
    expect(after.merge.till).toBe(0);
    // Goods on the board: only the opening goods of 2.11 / M18, the Grill at its starting base tier.
    const goods = at(after, 'merge.board:goods') as { cell: { c: number; k: number } }[];
    const opening = openingBoard(cfg, after.merge, after.merge.season).goods;
    expect(goods.map((x) => x.cell)).toEqual(opening);
    expect(goods).toHaveLength(cfg.merge.seasons.openingGoods);
    after.merge.chains.forEach((ch, c) => {
      const steps = Math.min(ch.seasoned, mods.seasonedMax);
      expect(ch.gear, `gear ${c}`).toBe(seasonedStartLevel(cfg, steps));
      expect(ch.stall).toBe(1);
      // Lantern 11 (every minder of the season hired) lights at this close too: minders start hired.
      expect(ch.minder).toBe(ch.open && mods.mindersStartHired ? 1 : 0);
      // Lantern 8 lit by this close: Tea opens with the Grill.
      expect(ch.open, `open ${c}`).toBe(c === 0 || c === 1);
      expect(ch.best).toBe(ch.open ? maxPopAt(cfg, mods, ch.gear) : 0);
      expect(ch.shelf).toEqual([]);
      expect(ch.waiting).toBe(false);
    });
    for (const ct of after.merge.counters) expect(ct.ticket).toBeNull();
  });

  it('keeps exactly the "Stays" list, field by field', () => {
    const before = closable();
    const after = closeSeason(cfg, before, 0);
    for (const item of SEASON_STAYS) {
      for (const f of item.fields) {
        if (f === 'merge.chains[].seasoned') expect(at(after, f)).toEqual(seasonedAfterClose(cfg, before.merge));
        else if (f === 'merge.lanterns') expect((at(after, f) as number[]).slice(0, before.merge.lanterns.length)).toEqual(before.merge.lanterns);
        else expect(at(after, f), f).toEqual(at(before, f));
      }
    }
    // Pending gift goods are kept even of a chain not open next season (Puffs here): they wait for it.
    expect(after.merge.gift.pendingGoods).toEqual([{ c: 4, k: 3 }, { c: 5, k: 2 }]);
    expect(after.merge.gift.boxes).toHaveLength(1);
    expect(after.merge.luckySparks).toBe(2);
  });

  it('bookkeeping: kept fields are kept, counted ones count on; the undo chip is cleared', () => {
    const before = closable();
    const events: MergeEvent[] = [];
    const after = closeSeason(cfg, before, 0, events);
    for (const [f, how] of Object.entries(SEASON_BOOKKEEPING)) if (how === 'kept') expect(at(after, f), f).toEqual(at(before, f));
    expect(after.merge.season).toBe(before.merge.season + 1);
    expect(after.merge.feats.seasonsClosed).toBe(before.merge.feats.seasonsClosed + 1);
    expect(after.merge.feats.tier8sThisSeason).toBe(0);
    expect(after.merge.feats.tickets).toBe(before.merge.feats.tickets);
    expect(after.merge.basketUndo).toBeNull();
    expect(after.merge.seasonStartedAt).toBe(before.stats.playSeconds);
    expect(after.prestigeCount).toBe(before.prestigeCount + 1);
    expect(after.merge.festival.filledAt).toBeNull();
    expect(events.filter((e) => e.type === 'seasonClosed')).toEqual([{ type: 'seasonClosed', season: 0 }]);
    expect(events).toContainEqual({ type: 'lanternLit', n: 8 });
    expect(events).toContainEqual({ type: 'lanternLit', n: 11 });
  });
});

describe('the season table (2.11)', () => {
  const names = ['Spring Lanterns', 'Summer Fireflies', 'Autumn Moon', 'Winter Embers', 'Second Spring', 'Second Summer', 'Second Autumn', 'Second Winter', 'Third Spring', 'Third Summer', 'Third Autumn', 'Third Winter', 'Fourth Spring', 'Fourth Summer', 'Fourth Autumn', 'Fourth Winter'];
  const shapes = ['rectangle', 'rectangle', 'moonGate', 'hearth', 'rectangle', 'moonGate', 'hearth', 'rectangle', 'moonGate', 'hearth', 'rectangle', 'moonGate', 'hearth', 'rectangle', 'moonGate', 'hearth'];
  const chars = ['none', 'fireflies', 'harvest', 'warmGear', 'lateCrowd', 'marketDay', 'fireflies', 'harvest', 'warmGear', 'lateCrowd', 'marketDay', 'fireflies', 'harvest', 'warmGear', 'lateCrowd', 'marketDay'];

  it('holds the 16 rows of 2.11, and seasons 2 to 16 use each of the 15 pairs once', () => {
    for (let s = 0; s < 16; s++) expect(seasonRow(cfg, s)).toEqual({ name: names[s], shape: shapes[s], character: chars[s] });
    const pairs = new Set(shapes.slice(1).map((sh, i) => `${sh}/${chars[i + 1]}`));
    expect(pairs.size).toBe(15);
  });

  it('repeats from season 2 from season 17 on', () => {
    for (let s = 16; s < 50; s++) expect(seasonRow(cfg, s)).toEqual(seasonRow(cfg, 1 + ((s - 1) % 15)));
    expect(seasonRow(cfg, 16).name).toBe('Summer Fireflies');
  });

  it('each character changes its numbers and nothing else', () => {
    const k = cfg.merge.seasons;
    expect(seasonMods(cfg, 0)).toEqual({});
    expect(seasonMods(cfg, 1)).toEqual({ luckyOdds: k.fireflies.luckyOdds });
    expect(seasonMods(cfg, 2)).toEqual({ threeLineShare: k.harvest.threeLineShare, betaAdd: k.harvest.betaAdd });
    expect(seasonMods(cfg, 3)).toEqual({ ripeAdd: k.warmGear.ripeAdd });
    expect(seasonMods(cfg, 4)).toEqual({ minderIntervalMult: k.lateCrowd.minderIntervalMult });
    expect(seasonMods(cfg, 5)).toEqual({ paradeEvery: k.marketDay.paradeEvery });
  });
});

describe('precedence (2.3): the better one, never both', () => {
  const at = (season: number, lanterns: number[]) => currentMods(cfg, { season, lanterns });
  it('season character against lantern', () => {
    expect(at(1, [7]).luckyOdds).toBe(12); // Fireflies 12 beats lantern 7's 20
    expect(at(1, [7, 16]).luckyOdds).toBe(12);
    expect(at(0, [7, 16]).luckyOdds).toBe(16); // two lanterns: the better
    expect(at(3, [12]).ripeAdd).toBeCloseTo(0.15); // Warm gear 0.15, not 0.2
    expect(at(0, [12]).ripeAdd).toBeCloseTo(0.05);
    expect(at(2, [13]).betaAdd).toBeCloseTo(0.1); // Harvest and lantern 13: 0.1, not 0.2
    expect(at(4, [15]).minderIntervalMult).toBeCloseTo(0.67);
    expect(at(5, [5]).paradeEvery).toBe(300);
    expect(at(6, [5]).paradeEvery).toBe(480);
    expect(at(0, []).paradeEvery).toBe(neutralMods(cfg).paradeEvery);
  });
});

describe('the opening board (2.11, M18)', () => {
  it('holds openingGoods goods of the Grill at its starting base tier', () => {
    const g = freshState(cfg);
    expect(openingBoard(cfg, g.merge, 0).goods).toEqual(Array.from({ length: cfg.merge.seasons.openingGoods }, () => ({ c: 0, k: 1 })));
    const seasoned = { ...g.merge, chains: g.merge.chains.map((ch, c) => (c === 0 ? { ...ch, gear: 1 + cfg.merge.gear.step } : ch)) };
    expect(openingBoard(cfg, seasoned, 1).goods.every((x) => x.c === 0 && x.k === 2)).toBe(true);
  });

  it('puts braziers only on open cells, the one nearest each corner', () => {
    const g = freshState(cfg);
    const hearth = 3;
    expect(seasonRow(cfg, hearth).shape).toBe('hearth');
    const { blocks } = openingBoard(cfg, g.merge, hearth);
    expect(blocks).toEqual([14, 19, 42, 47]); // (2,0), (2,5), (6,0), (6,5) on the first board
    for (const i of blocks) expect(g.merge.board[i]).not.toBe('shutter');
    // Every shutter open: the corners themselves.
    const full = { ...g.merge, board: g.merge.board.map(() => null) };
    expect(hearthCells(full)).toEqual([0, 6, 49, 55]);
    // Through the season's start: blocks only where the board was open, shutters untouched.
    const next = closeSeason(cfg, closable(), 0);
    expect(next.merge.board.filter((c) => c === 'block')).toHaveLength(0); // season 2 is a rectangle
  });

  it('the moon gate blocks its two stones; the rectangle nothing', () => {
    const g = freshState(cfg);
    expect(openingBoard(cfg, g.merge, 2).blocks).toEqual(cfg.merge.seasons.moonGateCells);
    expect(openingBoard(cfg, g.merge, 0).blocks).toEqual([]);
    expect(openingBoard(cfg, g.merge, 1).blocks).toEqual([]);
  });
});

describe('seasoned gear and familiar faces (2.11, M25, M28)', () => {
  it('starts at 1 + N × steps with N = the gear step s, at most the top level', () => {
    for (let steps = 0; steps <= 5; steps++) expect(seasonedStartLevel(cfg, steps)).toBe(Math.min(cfg.merge.costs.gearMaxLevel, 1 + cfg.merge.gear.step * steps));
    const c8 = mergeTestConfig({ gear: { ...cfg.merge.gear, step: 8 } });
    expect(seasonedStartLevel(c8, 2)).toBe(17);
    expect(seasonedStartLevel(cfg, 99)).toBe(cfg.merge.costs.gearMaxLevel);
  });

  it('a chain earns a step per closed season in which it reached tier 6, up to the limit (+1 with lantern 9)', () => {
    const g = closable();
    const max = cfg.merge.seasons.maxSteps;
    const atMax = { ...g.merge, chains: g.merge.chains.map((ch) => ({ ...ch, seasoned: max })) };
    expect(seasonedAfterClose(cfg, atMax).slice(0, 5)).toEqual([max, max, max, max, max]);
    const with9 = { ...atMax, lanterns: [...atMax.lanterns, 9] };
    // Grill 8, Tea 8, Steamer 6, Sweets 6 reached tier 6; Noodles (best 4) did not.
    expect(seasonedAfterClose(cfg, with9).slice(0, 5)).toEqual([max + 1, max + 1, max + 1, max + 1, max]);
    expect(seasonedAfterClose(cfg, g.merge).slice(0, 5)).toEqual([2, 1, Math.min(max, 4), 1, 0]);
  });

  it('familiar faces: F_s = base^min(seasons closed, max)', () => {
    const { familiarBase, familiarMax } = cfg.merge.seasons;
    expect(familiarFactor(cfg, 0)).toBe(1);
    for (let n = 1; n <= 8; n++) expect(familiarFactor(cfg, n)).toBeCloseTo(familiarBase ** Math.min(n, familiarMax), 12);
  });
});
