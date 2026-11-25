/**
 * The truck and the presence sample (findings R2, R7, P10), frozen test content. Owner: rules-sim-a.
 * R2: a loaded truck the boss left by Step out is finished by the hired driver (live and away).
 * R7: a presence sample is clamped (standingFor, inside the yard and lane, no faster than truck.bossV,
 * driving only while the boss holds the truck).
 */
import { describe, expect, it } from 'vitest';
import { FIXTURE_NOW, SALVAGE_TEST } from '../fixtures/salvage';
import * as R from '../salvage';
import { hand, stand, standUntil, walkTo } from './play';
import type { SalvageConfig, SalvageEvent, SalvageGame } from './types';

const cfg = { mode: 'salvage', salvage: SALVAGE_TEST } as unknown as SalvageConfig;
const C = SALVAGE_TEST;
const base = (cash = 0) => ({ cash, lifetimeEarnings: 0, lastSavedAt: FIXTURE_NOW, stats: { playSeconds: 0, clockHigh: FIXTURE_NOW } }) as never;
const fresh = (cash = 0): SalvageGame => R.createSalvage(cfg, base(cash), FIXTURE_NOW);
const price = (g: SalvageGame, k: string) => R.shopPrice(cfg, g, k) ?? 0;

/** Drive to the farm, hook, and (when `weigh`) weigh on the bridge; the boss stays in the truck. */
function driveAndHook(weigh: boolean) {
  let g = fresh(5000);
  for (const item of ['sack', 'sledge', 'trolley', 'truck']) g = R.buy(cfg, g, item, price(g, item), g.salvage.t);
  g = R.jump(cfg, g, g.salvage.t + 60);
  const h = hand(cfg, g, FIXTURE_NOW + 60_000);
  const tr = h.g.salvage.truck;
  walkTo(h, tr.x, tr.y);
  stand(h, 0.5);
  expect(h.g.salvage.truck.by).toBe('boss');
  const z = R.skipZone(cfg, 'partnerFarm', 0);
  walkTo(h, z.x, z.y, 9);
  standUntil(h, (q) => !!q.salvage.truck.skip, 60);
  expect(h.g.salvage.truck.skip).not.toBeNull();
  if (weigh) {
    const wb = R.point(cfg, 'weighbridge');
    walkTo(h, wb.x, wb.y, 9);
    standUntil(h, (q) => !!q.salvage.truck.skip?.weighed, 30);
  }
  return h;
}

function hireDriver(g: SalvageGame): SalvageGame {
  const ch = [...C.shop, ...C.dayOneList].find((i) => i.key === 'driver')!;
  const g1 = R.hire(cfg, { ...g, cash: g.cash + 10_000 }, 'driver', R.shopPrice(cfg, { ...g, cash: g.cash + 10_000 }, 'driver') ?? ch.price, g.salvage.t);
  expect(g1.salvage.crew.some((m) => m.role === 'driver')).toBe(true);
  return g1;
}

describe('a loaded truck left by Step out (R2)', () => {
  for (const weigh of [true, false])
    it(`${weigh ? 'weighed' : 'unweighed'}: the hired driver tips it within five minutes (live)`, () => {
      const h = driveAndHook(weigh);
      const ev: SalvageEvent[] = [];
      let g = R.stepOut(cfg, h.g, null, h.g.salvage.t, ev);
      expect(g.salvage.truck.by).toBeNull();
      expect(g.salvage.truck.skip).not.toBeNull();
      g = hireDriver(g);
      const tipped0 = g.salvage.counts?.['fetched:partnerFarm'] ?? 0;
      g = R.jump(cfg, g, g.salvage.t + 300, ev);
      expect(g.salvage.truck.skip).toBeNull();
      expect(g.salvage.counts?.['fetched:partnerFarm'] ?? 0).toBe(tipped0 + 1);
      // Weighed exactly once: one skip ticket for this load.
      expect(g.salvage.tickets.filter((t) => t.kind === 'skipWeighIn').length).toBe(1);
    });

  it('away: the driver finishes it and goes on fetching', () => {
    const h = driveAndHook(true);
    let g = R.stepOut(cfg, h.g, null, h.g.salvage.t);
    g = hireDriver(g);
    g = { ...g, lastSavedAt: g.salvage.clock.highMs };
    const out = R.salvageOffline(cfg, g, g.salvage.clock.highMs + 2 * 3600_000).game;
    expect(out.salvage.truck.skip === null || out.salvage.truck.trip !== null).toBe(true);
    expect(out.salvage.counts?.['fetched:partnerFarm'] ?? 0).toBeGreaterThan(1);
  });
});

describe('the presence sample is clamped (R7, P10)', () => {
  const g = fresh(1000);
  it('standingFor is finite and at most an hour', () => {
    const p = R.setPresence(cfg, g, { x: 10, y: 10, moving: false, driving: false, standingFor: Infinity, heading: 0 }, 0);
    expect(Number.isFinite(p.salvage.presence.standingFor)).toBe(true);
    expect(p.salvage.presence.standingFor).toBeLessThanOrEqual(3600);
    expect(JSON.parse(JSON.stringify(p.salvage)).presence.standingFor).toBe(p.salvage.presence.standingFor);
  });
  it('a position far outside the yard is not accepted', () => {
    const p = R.setPresence(cfg, g, { x: 1e9, y: -1e9, moving: false, driving: false, standingFor: 0, heading: 0 }, 0);
    expect(p.salvage.presence.x).toBeLessThanOrEqual(C.yard.width + Math.max(...Object.values(C.map.lane)) + 40);
    expect(p.salvage.presence.y).toBeGreaterThanOrEqual(0);
  });
  it('driving is kept only while the boss holds the truck', () => {
    const p = R.setPresence(cfg, g, { x: 10, y: 10, moving: false, driving: true, standingFor: 0, heading: 0 }, 0);
    expect(p.salvage.presence.driving).toBe(false);
  });
  it('a sample moves at most truck.bossV × dt (and a step of slack) from the last', () => {
    const p0 = R.setPresence(cfg, g, { x: 10, y: 10, moving: true, driving: false, standingFor: 0, heading: 0 }, 1);
    const p1 = R.setPresence(cfg, p0, { x: 10 + 500, y: 10, moving: true, driving: false, standingFor: 0, heading: 0 }, 2);
    const v = C.truck.bossV ?? C.truck.v;
    const moved = Math.hypot(p1.salvage.presence.x - 10, p1.salvage.presence.y - 10);
    expect(moved).toBeLessThanOrEqual(v * 1 + 3 + 1e-9);
    expect(moved).toBeGreaterThanOrEqual(v * 1);
  });
});
