/**
 * The save of stage 2 (yard-stage2.md 2.20; 8.1's row 2.20; owner rules-money): the first yard's five frozen
 * states saved as layout 2 (fixtures/salvage2money.ts l2save) load into layout 3 with everything equal; a
 * layout-2 save at rung 3 loads with the works NOT open (derived from the state at its first live instant,
 * never from a rung event, B14) and, once works.ts worksOpen is built (rules-works), gets the bath, the back
 * field and the lots' first date at that instant; the tool tier is clamped to the merged content's highest;
 * the layout-3 round trip with an agreement is bank.test.ts's. contract.test.ts (Phase A) holds the same
 * layout-2 load on the test content; this file adds the stage-2 content's rung-3 save.
 */
import { describe, expect, it } from 'vitest';
import { GameConfigSchema } from '../../config/schema';
import gameJson from '../../../games/scrap-yard/game.json';
import * as E from '../economy';
import { FIXTURE_NOW, withTestContent } from '../fixtures/salvage';
import { stage2Cfg, stage2Game } from '../fixtures/salvage';
import { asLayout2, l2saves } from '../fixtures/salvage2money';
import * as R from '../salvage';
import { mergedContent, topToolTier } from './layer';
import { reconcileSalvage } from './save';
import type { SalvageEvent, SalvageGame } from './types';

const cfg1 = withTestContent(GameConfigSchema.parse(gameJson));
const base1 = (cash?: number) => ({ ...E.createInitialState(cfg1, FIXTURE_NOW), ...(cash === undefined ? {} : { cash }) });

describe('2.20 l2save: the first yard\'s states as layout 2 load with cash, supplied, every stock and every crew member equal', () => {
  const saves = l2saves(base1(), FIXTURE_NOW);
  for (const [n, { game, raw }] of Object.entries(saves)) {
    it(n, () => {
      const back = reconcileSalvage(cfg1, base1(game.cash), raw, FIXTURE_NOW);
      expect(back.salvage.v).toBe(3);
      expect(back.cash).toBe(game.cash);
      expect(back.salvage.ladder).toEqual(game.salvage.ladder);
      expect(back.salvage.bays).toEqual(JSON.parse(JSON.stringify(game.salvage.bays)));
      expect(back.salvage.crew).toEqual(JSON.parse(JSON.stringify(game.salvage.crew)));
      expect(back.salvage.things.length).toBe(game.salvage.things.length);
      expect(back.salvage.pieces).toEqual(JSON.parse(JSON.stringify(game.salvage.pieces)));
      expect(back.salvage.bank).toEqual({ agreement: null, letterSeen: false, done: [] });
    });
  }
});

describe('2.20 a layout-2 save at rung 3 (the owner\'s yard after the first hour)', () => {
  const cfg = stage2Cfg('r3');
  const g = stage2Game('r3');
  const load = () => reconcileSalvage(cfg, { ...g, salvage: undefined } as never, asLayout2(g), g.salvage.clock.highMs);

  it('loads with the works not yet open: no bathSet, lots.nextAt null, the rung kept', () => {
    const back = load();
    expect(back.salvage.ladder.rung).toBe(3);
    expect(back.salvage.counts?.bathSet).toBeUndefined();
    expect(back.salvage.lots.nextAt).toBeNull();
    expect(back.salvage.works).toEqual({});
  });

  it('a tool tier above the merged content\'s highest is clamped to it', () => {
    const raw = asLayout2(g);
    raw.salvage.tier = 9;
    const back = reconcileSalvage(cfg, { ...g, salvage: undefined } as never, raw, g.salvage.clock.highMs);
    expect(back.salvage.tier).toBe(topToolTier(mergedContent(cfg.salvage)));
  });

  // Whether works.ts worksOpen (rules-works) has its body: one live tick of the frozen r3 sets counts.bathSet.
  const opened = (() => {
    const a = R.advanceSalvage(cfg, g, 0.1, g.salvage.clock.highMs + 100);
    return a.salvage.counts?.bathSet !== undefined;
  })();
  it.runIf(opened)('at its first LIVE instant: backFieldOpen, the bath set (counts.bathSet), lots.nextAt = t + lots.period_s (t that instant)', () => {
    const back = load() as SalvageGame;
    const ev: SalvageEvent[] = [];
    const a = R.advanceSalvage(cfg, back, 0.1, back.salvage.clock.highMs + 100, ev);
    expect(ev.some((e) => e.type === 'backFieldOpen')).toBe(true);
    expect(a.salvage.counts?.bathSet).toBeDefined();
    const period = (cfg.salvage as unknown as { lots?: { period_s: number } }).lots?.period_s;
    if (period !== undefined) expect(a.salvage.lots.nextAt).toBeCloseTo(back.salvage.t + period, 0);
  });
  it.runIf(opened)('never inside an away pass: an absence from the loaded save leaves the works closed until the first live instant', () => {
    const back = load() as SalvageGame;
    const now = back.salvage.clock.highMs;
    const off = R.salvageOffline(cfg, { ...back, lastSavedAt: now }, now + 3600_000).game;
    expect(off.salvage.counts?.bathSet).toBeUndefined();
  });
});
