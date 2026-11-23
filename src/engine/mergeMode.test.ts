/**
 * The merge engine mode (src/engine/mergeMode.ts) and what the skeleton's rules already hold
 * (spec 10.2 `mergeMode.test.ts`): create (2.3 with 2.7's scripted start), reconcile from a broken
 * save, the save tag, `config` rejecting an invalid block, `offlineAdMultiplier`, the clocks of the
 * tick, the shared engine delegating to it for merge configs only, the schema's ranges and the
 * fixtures' invariants. The rules packages extend this file; the `todo` entries are theirs.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pizza from '../../games/pizza-empire/game.json';
import { GameConfigSchema } from '../config/schema';
import { MERGE_STARTING_CONTENT, MergeSchema, RANGES, lintMerge, valueAt } from '../config/schema.merge';
import * as E from './economy';
import { FIXTURE_NOW, baseGameState, fixtureProblems, freshState, mergeFixtures, mergeTestConfig } from './fixtures/merge';
import * as R from './merge';
import { MERGE_SHARED_SOUNDS, mergeEngineMode, withMergeContent } from './mergeMode';
import { engineFor, installEngineMode } from './mode';
import type { GameState } from './types';

const cfg = mergeTestConfig();
const pizzaCfg = GameConfigSchema.parse(pizza);

describe('the merge engine mode', () => {
  it('is mode "merge" with its own save tag', () => {
    expect(mergeEngineMode.id).toBe('merge');
    expect(mergeEngineMode.saveTag).toBe('merge1');
  });

  it('config parses the opaque block with its defaults and throws on an invalid or missing one', () => {
    const raw = { ...cfg, merge: JSON.parse(JSON.stringify(MERGE_STARTING_CONTENT)) };
    delete (raw.merge as Record<string, unknown>).basket;
    const parsed = withMergeContent(raw as never) as R.MergeConfig;
    expect(parsed.merge.basket).toEqual({ share: 0.25, undoSeconds: 4 });
    const broken = { ...cfg, merge: { ...JSON.parse(JSON.stringify(MERGE_STARTING_CONTENT)), chains: [] } };
    expect(() => withMergeContent(broken as never)).toThrow(/"merge" block is invalid/);
    expect(() => withMergeContent({ ...cfg, merge: undefined } as never)).toThrow(/no "merge" block/);
    expect(withMergeContent(pizzaCfg)).toBe(pizzaCfg);
  });

  it('offlineAdMultiplier is 1.5 (Decision M8: "Watch ad: +50 %")', () => {
    expect(mergeEngineMode.offlineAdMultiplier!(cfg)).toBe(1.5);
  });

  it('hands the shared store keys to keys of its own fx table', async () => {
    const { FX } = await import('../services/fx/catalog.merge');
    for (const key of Object.values(MERGE_SHARED_SOUNDS)) expect(Object.keys(FX)).toContain(key);
  });
});

describe('create (spec 2.3, 2.7)', () => {
  const g = freshState(cfg);
  const m = g.merge;

  it('opens 30 cells (columns 0 to 5, rows 2 to 6) and shuts the other 26', () => {
    expect(m.board).toHaveLength(56);
    expect(m.board.filter((c) => c === 'shutter')).toHaveLength(26);
    for (let row = 2; row <= 6; row++) for (let col = 0; col <= 5; col++) expect(m.board[R.cellAt(row, col)]).not.toBe('shutter');
    expect(m.shuttersOpened).toEqual([0, 0, 0, 0]);
  });

  it('puts 4 Pepper Skewers by the drop-cell rule (one stall: anchor column 3, the street row first)', () => {
    const goods = m.board.map((c, i) => [i, c] as const).filter(([, c]) => R.isGood(c));
    expect(goods).toEqual([
      [R.cellAt(2, 1), { c: 0, k: 1 }],
      [R.cellAt(2, 2), { c: 0, k: 1 }],
      [R.cellAt(2, 3), { c: 0, k: 1 }],
      [R.cellAt(2, 4), { c: 0, k: 1 }],
    ]);
  });

  it("the fox's Twin Skewer ticket at counter 1; counter 2 waits for the first merge", () => {
    expect(m.counters).toHaveLength(2);
    expect(m.counters[0].ticket).toMatchObject({ lines: [{ c: 0, k: 2, filled: false }], gold: false, scripted: true, customer: 0 });
    expect(m.counters[1]).toMatchObject({ ticket: null, refillAt: null });
    expect(m.script).toBe('fox');
  });

  it('the Grill is open at level 1 with best = maxPop = 1; the other stalls are closed', () => {
    expect(m.chains[0]).toMatchObject({ open: true, gear: 1, stall: 1, minder: 0, best: 1, shelf: [], waiting: false });
    expect(m.chains.slice(1).every((ch) => !ch.open && ch.best === 0)).toBe(true);
  });

  it("season 1's Festival, the first Parade at 360 s, no coins, no lanterns, no Pocket (M5)", () => {
    expect(m.festival.lines.map(({ c, k }) => [c, k])).toEqual([
      [0, 8],
      [1, 8],
      [2, 6],
      [4, 5],
    ]);
    expect(m.festival.filledAt).toBeNull();
    expect(m.paradeAt).toBe(360);
    expect(g.cash).toBe(0);
    expect(m.lanterns).toEqual([]);
    expect(m.gift.ticketsToBox).toBe(10);
    expect('pocket' in m).toBe(false);
  });

  it('is deterministic for a seed and different across seeds', () => {
    expect(freshState(cfg, 7)).toEqual(freshState(cfg, 7));
    expect(freshState(cfg, 7).merge.seed).not.toBe(freshState(cfg, 8).merge.seed);
  });

  it('every fixture keeps the invariants of a reachable state', () => {
    for (const [name, f] of Object.entries(mergeFixtures(cfg))) expect(fixtureProblems(cfg, f), name).toEqual([]);
  });
});

describe('reconcile', () => {
  const base = baseGameState(FIXTURE_NOW);

  it('never throws: a broken or foreign save starts afresh', () => {
    for (const raw of [null, undefined, 42, 'x', {}, { merge: null }, { merge: { board: [1, 2] } }, { merge: { ...freshState(cfg).merge, chains: 'no' } }]) {
      const g = mergeEngineMode.reconcile(cfg, base, raw) as R.MergeGame;
      expect(g.merge.board).toHaveLength(56);
      expect(fixtureProblems(cfg, g)).toEqual([]);
    }
  });

  it('keeps a current save and clears the Basket undo chip (2.5)', () => {
    const { minute10 } = mergeFixtures(cfg);
    const saved = { ...minute10, merge: { ...minute10.merge, basketUndo: { cell: 40, good: { c: 0, k: 1 }, refund: 1, until: 999 } } };
    const g = mergeEngineMode.reconcile(cfg, base, JSON.parse(JSON.stringify(saved))) as R.MergeGame;
    expect(g.merge.basketUndo).toBeNull();
    expect(g.merge.board).toEqual(minute10.merge.board);
  });
});

describe('tick (skeleton: the clocks only)', () => {
  it('adds stats.playSeconds itself, cut to MAX_TICK, and splits exactly', () => {
    const g = freshState(cfg);
    const t = (s: GameState, dt: number) => mergeEngineMode.tick(cfg, s, dt, FIXTURE_NOW);
    expect(t(g, 2.5).stats.playSeconds).toBe(2.5);
    expect(t(g, 99_999).stats.playSeconds).toBe(R.MAX_TICK);
    expect(t(g, -1)).toBe(g);
    expect(t(t(g, 1.25), 0.75)).toEqual(t(g, 2));
  });

  it('income and activeIncome are finite and never negative', () => {
    for (const f of Object.values(mergeFixtures(cfg))) {
      expect(mergeEngineMode.income(cfg, f, FIXTURE_NOW)).toBeGreaterThanOrEqual(0);
      expect(mergeEngineMode.activeIncome(cfg, f, FIXTURE_NOW)).toBeGreaterThanOrEqual(0);
    }
  });

  it('offline adds nothing to cash and keeps the time already paid', () => {
    const g = mergeFixtures(cfg).minute10;
    const r = mergeEngineMode.offline(cfg, g, FIXTURE_NOW + 3600_000);
    expect(r.earnings).toBeGreaterThanOrEqual(0);
    expect((r.game as R.MergeGame).cash).toBe(g.cash);
  });

  it('closing the season is refused (the same object) while the Festival is not filled', () => {
    const g = mergeFixtures(cfg).festivalNear;
    expect(mergeEngineMode.prestige(cfg, g, FIXTURE_NOW)).toBe(g);
  });

  it.todo('tick runs every event kind of 2.4 and tick(a + b) = tick(a) then tick(b) over random splits (MECHANICS, tick.split.test.ts)');
  it.todo('entitle for Late Hours: +4 h away cap and every "Watch ad" at once, applied now (MECHANICS, 5.7)');
  it.todo('income = the minder rate; activeIncome = the recent ticket rate + the minder rate (MECHANICS, 2.9)');
  it.todo('reportAlone is true when shelves filled with no minder hired (MECHANICS, 2.9)');
});

describe('the shared engine delegates to it for merge configs only', () => {
  beforeAll(() => installEngineMode(mergeEngineMode));
  afterAll(() => installEngineMode(null));

  it('dispatches by mode', () => {
    expect(engineFor(cfg)).toBe(mergeEngineMode);
    expect(engineFor(pizzaCfg)).toBeNull();
  });

  it('createInitialState, reconcileState and tick run the merge rules', () => {
    const g = E.createInitialState(cfg, FIXTURE_NOW) as R.MergeGame;
    expect(g.merge.counters[0].ticket?.scripted).toBe(true);
    const back = E.reconcileState(cfg, JSON.parse(JSON.stringify(g)), FIXTURE_NOW) as R.MergeGame;
    expect(back.merge.board).toEqual(g.merge.board);
    const later = E.tick(cfg, g, 1, FIXTURE_NOW + 1000) as R.MergeGame;
    expect(later.stats.playSeconds).toBeCloseTo(1, 9);
    expect(later.merge.board).toEqual(g.merge.board);
  });
});

describe('the merge schema (src/config/schema.merge.ts)', () => {
  const parsed = MergeSchema.parse(JSON.parse(JSON.stringify(MERGE_STARTING_CONTENT)));

  it('every (tune) default sits inside its range, and the starting content lints clean', () => {
    for (const r of RANGES) {
      const v = valueAt(parsed, r.path);
      expect(typeof v, r.path).toBe('number');
      expect(v as number, r.path).toBeGreaterThanOrEqual(r.low);
      expect(v as number, r.path).toBeLessThanOrEqual(r.high);
    }
    expect(lintMerge(parsed)).toEqual([]);
  });

  it('holds the 20 lanterns with Decision M5 (14: a fourth gift-box slot, 16: Lucky 1 in 16) and no Pocket', () => {
    expect(parsed.lanterns.map((l) => l.n)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(parsed.lanterns[13]).toMatchObject({ effect: { type: 'giftSlots', value: 4 }, isNew: true });
    expect(parsed.lanterns[15].effect).toEqual({ type: 'luckyOdds', value: 16 });
    expect(JSON.stringify(parsed)).not.toMatch(/pocket/i);
  });

  it("has the chains' names of 2.2 and the Grill's values 5, 12, 29, 69, 166, 398, 955, 2,293", () => {
    expect(parsed.chains.map((c) => c.gear)).toEqual(['Ember Grill', 'Copper Urn', 'Bamboo Steamer', 'Sugar Pan', 'Noodle Wok', 'Lantern Pan']);
    expect(parsed.chains[0].tiers[7]).toBe('Dragon Grill Board');
    // value(c, k) is not rounded (2.3); 2.2 prints the Grill's values to a whole coin. Its 955 and 2,293 are
    // 955.5 and 2,293.5 cut down while 28.8 is printed 29, so the check allows the printed rounding.
    const grill = Array.from({ length: 8 }, (_, k) => parsed.values.base * parsed.values.tierGrowth ** k);
    [5, 12, 29, 69, 166, 398, 955, 2293].forEach((printed, k) => expect(Math.abs(grill[k] - printed), `tier ${k + 1}`).toBeLessThan(0.52));
  });

  it('a range breach is a lint problem, never silently accepted', () => {
    expect(lintMerge({ ...parsed, gear: { ...parsed.gear, interval: 3 } }).join('\n')).toMatch(/gear\.interval = 3 is outside its range 4 to 6/);
  });
});
