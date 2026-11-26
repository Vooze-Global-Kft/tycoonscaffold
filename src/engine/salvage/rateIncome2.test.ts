/**
 * Rated income I after its calibration step (engine2-income2; RULING2.md 14.10; stage 2 2.3), on the frozen
 * test content: no tuned number is pinned. The cache by assets (a card's read every 500 ms costs a lookup and
 * gives what a fresh computation gives), the terms beside the gate's table, and the walk of every purchase,
 * hire and level one step up from the five frozen played states. The gate against the bots' away income on
 * the real content is scripts/content/yard-bot.ts --only income. Owner: engine2-income2.
 */
import { describe, expect, it } from 'vitest';
import { FIXTURE_NOW, SALVAGE_TEST, fixtureGame } from '../fixtures/salvage';
import * as R from '../salvage';
import { begin, finish } from './clock';
import { buyCheck, hireCheck, levelCheck } from './ladder';
import { own, ratedIncome, ratedTerms } from './rate';
import type { SalvageConfig, SalvageGame, SalvageState } from './types';

const cfg = { mode: 'salvage', salvage: SALVAGE_TEST } as unknown as SalvageConfig;
const C = SALVAGE_TEST;
const base = { cash: 0, lifetimeEarnings: 0, lastSavedAt: FIXTURE_NOW, stats: { playSeconds: 0, clockHigh: FIXTURE_NOW } } as never;
const NAMES = ['fresh', 'm5', 'm15', 'm30', 'back'] as const;
const game = (n: (typeof NAMES)[number]): SalvageGame => fixtureGame(n, base, FIXTURE_NOW);
/** I computed on a content object the cache has never seen (the same content, a new object): no cache hit. */
const fresh = (s: SalvageState) => ratedTerms({ ...C }, s);

/** A purchase lands at once (its arrival), so that the walk sees the asset it bought. */
function land(g: SalvageGame): SalvageGame {
  if (!g.salvage.arriving.length) return g;
  const x = begin(cfg, g, [], false);
  for (const a of [...x.s.arriving]) own(x, a.item, x.s.t);
  x.s.arriving = [];
  return finish(g, x);
}

/** Every purchase, hire and level the rules sell one step up from `g` (cash lifted so that each is for sale). */
function steps(g0: SalvageGame): { name: string; g: SalvageGame }[] {
  const g = { ...g0, cash: 1e12 };
  const t = g.salvage.t;
  const out: { name: string; g: SalvageGame }[] = [];
  const push = (name: string, h: SalvageGame) => {
    if (h !== g) out.push({ name, g: land(h) });
  };
  for (const role of ['hand', 'cutter', 'driver'] as const) {
    const ch = hireCheck(cfg, g, role);
    if (ch.price !== null && !ch.refusal) push(`hire ${role}`, R.hire(cfg, g, role, ch.price, t));
  }
  for (const m of g.salvage.crew) {
    const ck = levelCheck(cfg, g, { kind: 'crew', id: m.id });
    if (ck.price !== null && !ck.refusal) push(`level ${m.id}`, R.level(cfg, g, { kind: 'crew', id: m.id }, ck.price, t));
  }
  for (const id of ['stripper', 'bench', 'crucible', 'hand_stripper'] as const) {
    const ck = levelCheck(cfg, g, { kind: 'machine', machine: id });
    if (ck.price !== null && !ck.refusal) push(`level ${id}`, R.level(cfg, g, { kind: 'machine', machine: id }, ck.price, t));
  }
  for (const pid of Object.keys(g.salvage.partners)) {
    const ck = levelCheck(cfg, g, { kind: 'partner', partner: pid });
    if (ck.price !== null && !ck.refusal) push(`level ${pid}`, R.level(cfg, g, { kind: 'partner', partner: pid }, ck.price, t));
  }
  for (const it of [...C.shop, ...C.dayOneList]) {
    if (it.kind === 'crew') continue;
    const ck = buyCheck(cfg, g, it.key as never);
    if (ck.price !== null && !ck.refusal) push(`buy ${it.key}`, R.buy(cfg, g, it.key as never, ck.price, t));
  }
  return out;
}

describe('rated income I, calibrated (engine2-income2)', () => {
  it('is cached by the assets: the same assets give what a fresh computation gives, and a copy the caller may change', () => {
    const s = game('m30').salvage;
    const a = ratedTerms(C, s);
    const b = ratedTerms(C, s);
    expect(b).toEqual(a);
    expect(b).not.toBe(a);
    a.loads.x = 99;
    a.carryBy.scale = -1;
    expect(ratedTerms(C, s)).toEqual(b);
    expect(fresh(s)).toEqual(b);
    // Stock, cash, the floor, the day and the switches are not in the key and do not move I.
    const other = structuredClone(s);
    other.pieces = [];
    other.clock.day += 3;
    for (const bay of Object.values(other.bays)) bay.held = !bay.held;
    expect(ratedTerms(C, other)).toEqual(b);
  });

  it('a change of any asset is a new key: after each step the cached I is the fresh I', () => {
    for (const n of NAMES) for (const st of steps(game(n))) {
      expect(ratedTerms(C, st.g.salvage), `${n} ${st.name}`).toEqual(fresh(st.g.salvage));
    }
    const s = structuredClone(game('m30').salvage);
    const i0 = ratedIncome(C, s);
    s.counts = { ...(s.counts ?? {}), poured: 0 };
    const unpoured = ratedIncome(C, s);
    expect(unpoured).toBe(fresh(s).I);
    void i0;
  });

  it('is 0 before the first yard hand, on every frozen state without one', () => {
    for (const n of NAMES) {
      const s = game(n).salvage;
      if (s.crew.some((m) => m.role === 'hand')) continue;
      expect(ratedIncome(C, s), n).toBe(0);
    }
    const s = structuredClone(game('m30').salvage);
    s.crew = s.crew.filter((m) => m.role !== 'hand');
    expect(ratedIncome(C, s)).toBe(0);
  });

  it('never falls by one purchase, hire or level from the five frozen played states (the test content)', () => {
    let n = 0;
    const falls: string[] = [];
    for (const name of NAMES) {
      const g = land({ ...game(name), cash: 1e12 });
      const i0 = ratedIncome(C, g.salvage);
      for (const st of steps(g)) {
        n++;
        const i1 = ratedIncome(C, st.g.salvage);
        if (i1 < i0 - 1e-6) falls.push(`${name} ${st.name}: ${i0} -> ${i1}`);
      }
    }
    expect(n).toBeGreaterThan(20);
    expect(falls).toEqual([]);
  });

  it('gives the terms beside the gate’s table: trips, kg a trip, grades sold, machines’ hours, the truck and the floor', () => {
    const T = ratedTerms(C, game('m30').salvage);
    const d = T.detail!;
    expect(d).toBeDefined();
    for (const k of ['scale', 'whole', 'feed', 'tray'] as const) {
      expect(d.trips[k]).toBeGreaterThanOrEqual(0);
      expect(T.carryBy[k]).toBeGreaterThanOrEqual(0);
    }
    if (d.trips.scale > 0) expect(d.kgTrip).toBeGreaterThan(0);
    expect(d.kgTrip).toBeLessThanOrEqual(C.crew.hand.load + 1e-9);
    expect(d.truckShare).toBeGreaterThanOrEqual(0);
    expect(d.truckShare).toBeLessThanOrEqual(1 + 1e-9);
    expect(d.floorKg).toBeLessThanOrEqual(C.floorRoom_kg + 1e-6);
    expect(d.carryUse).toBeLessThanOrEqual(1 + 1e-6);
    for (const h of Object.values(d.machH)) expect(h).toBeLessThanOrEqual(1 + 1e-9);
    // What is sold is worth the sales at usual prices (the converter aside: by the unit).
    expect(Object.values(d.kgBy).reduce((a, q) => a + q, 0)).toBeGreaterThan(0);
  });
});
