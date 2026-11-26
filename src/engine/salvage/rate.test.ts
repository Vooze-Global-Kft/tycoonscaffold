/**
 * Rated income I (stage 2 2.3; RULING2.md 2.1, 10.6, section 12 I1 to I6; ECONOMY E38), on the frozen
 * test content: no tuned number is pinned. I is NET, a pure function of the yard's ASSETS (never of cash,
 * stock, prices of the day, recent sales or a switch the player can flip), 0 before the first yard hand,
 * bounded by what feeds the yard (I3), and it never falls when an asset is added. The gate against the
 * bots' measured away income is scripts/content/yard-bot.ts --only income (real content). Owner: engine2-income.
 */
import { describe, expect, it } from 'vitest';
import { FIXTURE_NOW, FIXTURE_STATES, SALVAGE_TEST, fixtureGame } from '../fixtures/salvage';
import * as R from '../salvage';
import { ratedIncome, ratedTerms, stockValue } from './rate';
import type { SalvageConfig, SalvageGame, SalvageState } from './types';

const cfg = { mode: 'salvage', salvage: SALVAGE_TEST } as unknown as SalvageConfig;
const C = SALVAGE_TEST;
const base = { cash: 0, lifetimeEarnings: 0, lastSavedAt: FIXTURE_NOW, stats: { playSeconds: 0, clockHigh: FIXTURE_NOW } } as never;
const game = (n: 'fresh' | 'm5' | 'm15' | 'm30' | 'back'): SalvageGame => fixtureGame(n, base, FIXTURE_NOW);
const I = (s: SalvageState) => ratedIncome(C, s);
const withCrew = (s: SalvageState, f: (m: SalvageState['crew'][number]) => void): SalvageState => {
  const t = structuredClone(s);
  for (const m of t.crew) f(m);
  return t;
};

describe('rated income I (2.3)', () => {
  it('is 0 before the first yard hand, and above 0 once the yard has one', () => {
    expect(FIXTURE_STATES.fresh.salvage.crew.some((m) => m.role === 'hand')).toBe(false);
    expect(I(game('fresh').salvage)).toBe(0);
    for (const n of ['m15', 'm30'] as const) {
      const s = game(n).salvage;
      expect(s.crew.some((m) => m.role === 'hand')).toBe(true);
      expect(I(s)).toBeGreaterThan(0);
    }
  });

  it('is NET: the sales at usual prices less the loads bought, and the facade gives the same figure', () => {
    const g = game('m30');
    const T = ratedTerms(C, g.salvage);
    expect(T.I).toBeCloseTo(T.sales - T.spent, 1);
    expect(R.ratedIncome(cfg, g)).toBe(T.I);
    expect(R.ratedTerms(cfg, g).I).toBe(T.I);
    for (const [id, n] of Object.entries(T.loads)) {
      const p = C.partners[id];
      expect(n).toBeLessThanOrEqual((3600 * Math.max(1, g.salvage.partners[id].level)) / p.fill_s + 1e-9);
    }
  });

  it('reads no switch, no cash, no stock and no day: Hold, Take from bays, the recipe, cash, the bays, the floor and the market day change nothing', () => {
    const s = game('m30').salvage;
    const i0 = I(s);
    const held = structuredClone(s);
    for (const b of Object.values(held.bays)) b.held = !b.held;
    expect(I(held)).toBe(i0);
    const cr = structuredClone(s);
    cr.machines.crucible.fromBays = !cr.machines.crucible.fromBays;
    cr.machines.crucible.recipe = cr.machines.crucible.recipe === 'brass' ? 'alu' : 'brass';
    expect(I(cr)).toBe(i0);
    const empty = structuredClone(s);
    for (const b of Object.values(empty.bays)) b.g = 0;
    empty.things = empty.things.filter((t) => t.at.at === 'zone');
    empty.pieces = [];
    empty.clock.day += 17;
    expect(I(empty)).toBe(i0);
    // Cash is not in the function's inputs at all (the game's cash lives outside the salvage state).
    expect(R.ratedIncome(cfg, { ...game('m30'), cash: 1e9 })).toBe(i0);
  });

  it('never falls when an asset is added: a level of a yard hand, a cutter or the driver, a partner level', () => {
    const s = game('m30').salvage;
    const i0 = I(s);
    for (const role of ['hand', 'cutter', 'driver'] as const) {
      expect(I(withCrew(s, (m) => (m.role === role ? (m.level += 3) : undefined)))).toBeGreaterThanOrEqual(i0 - 1e-6);
    }
    const p = structuredClone(s);
    for (const ps of Object.values(p.partners)) if (ps.open) ps.level += 1;
    expect(I(p)).toBeGreaterThanOrEqual(i0 - 1e-6);
  });

  it('is bounded by what feeds the yard (I3): past the feed, more capacity adds nothing', () => {
    const s = game('m30').salvage;
    const big = withCrew(s, (m) => (m.level = 60));
    const T = ratedTerms(C, big);
    expect(T.bind).toBe('feed');
    const bigger = withCrew(s, (m) => (m.level = 90));
    expect(I(bigger)).toBeCloseTo(T.I, 6);
  });

  it('names the step that binds and each step’s seconds an hour', () => {
    const T = ratedTerms(C, game('m30').salvage);
    expect(['feed', 'cut', 'carry', 'truck']).toContain(T.bind);
    expect(T.carry.have).toBe(3600 * game('m30').salvage.crew.filter((m) => m.role === 'hand').length);
    expect(T.cut.need).toBeGreaterThanOrEqual(0);
  });
});

describe('stock at usual prices (the gate G, 2.3.3)', () => {
  it('is a pure function of the state: the bays at p̄, nothing for an empty yard', () => {
    const s = structuredClone(game('fresh').salvage);
    s.things = s.things.filter((t) => t.at.at === 'zone');
    s.pieces = [];
    expect(stockValue(C, s)).toBe(0);
    const grade = Object.keys(C.grades).find((g) => C.grades[g].family !== 'pm')!;
    s.bays[grade] = { g: 2000, n: 0, held: false, aside: [], forCrucible_g: 0, forDeal_g: 0 };
    expect(stockValue(C, s)).toBeCloseTo(2 * C.grades[grade].pbar, 2);
  });
});
