/// <reference types="node" />
/**
 * Section 10.2 tests 6 (rates against a simulation) and 7 (fastForward against a 2 h simulation),
 * plus computeOffline for haul.
 */
import { describe, expect, it } from 'vitest';
import * as H from './haul';
import { conservationError, FIXTURE_NOW, haulFixtures, haulTestConfig, run, shaped } from './fixtures/haul';

type Run = H.HaulGame & { haul: H.HaulState };
const base = haulTestConfig();
/** Contracts off, no seams, no flares: what the closed forms model. */
const quiet = haulTestConfig({
  contracts: { ...base.haul.contracts, unlockLaunches: 1e9 },
  seam: { ...base.haul.seam, first: 1e12 },
  flare: { ...base.haul.flare, firstAt: 1e12 },
});

/** Station shapes that bind on different limits: drill-bound, haul-bound, freighter-bound, mixed rings. */
const SHAPES: Parameters<typeof shaped>[2][] = [
  { slots: [0, 1], haulers: [2, 1], rig: [3, 2], autopilot: true, freighter: 5 },
  { slots: [0, 1, 2, 3], haulers: [1, 1, 2, 1], rig: [8, 8, 4, 4], autopilot: true, freighter: 8, capLevel: 2 },
  { slots: [0, 1, 2, 3, 4, 5], haulers: [2, 2, 3, 3, 3, 4], rig: [10, 10, 6, 6, 5, 3], autopilot: true, freighter: 9, capLevel: 6, engineLevel: 5 },
  { slots: [0, 1, 2], haulers: [4, 4, 4], rig: [4, 4, 4], autopilot: true, freighter: 1 },
];

describe('6. rates vs simulation', () => {
  it('autopilot full, contracts off, no seams: the mean over 20 seeds of 30 min is within 5 % of activeRate × 1800', () => {
    for (const shape of SHAPES) {
      let sim = 0;
      let rate = 0;
      for (let seed = 1; seed <= 20; seed++) {
        const g = shaped(quiet, seed, shape);
        rate += H.haulIncome(quiet, g) * 1800;
        const end = run(quiet, g, 1800, 1);
        sim += end.lifetimeEarnings;
      }
      expect(Math.abs(sim / rate - 1)).toBeLessThan(0.05);
    }
  }, 120_000);

  it('steadyRate is 0 without the autopilot and activeRate is not', () => {
    const g = shaped(quiet, 1, { ...SHAPES[1], autopilot: false });
    const p = H.haulParams(quiet, g);
    expect(H.activeRate(quiet, p, g.haul)).toBeGreaterThan(0);
    expect(H.steadyRate(quiet, p, g.haul)).toBe(0);
    const on = { ...g, haul: { ...g.haul, autopilot: { online: true, policy: 'full' as const } } };
    expect(H.steadyRate(quiet, H.haulParams(quiet, on), on.haul)).toBe(H.activeRate(quiet, p, g.haul));
  });

  it('a route without drones or an unclaimed slot adds nothing', () => {
    const a = shaped(quiet, 1, { slots: [0, 1], haulers: [2, 0], autopilot: true });
    const b = shaped(quiet, 1, { slots: [0], haulers: [2], autopilot: true });
    expect(H.haulIncome(quiet, a)).toBeCloseTo(H.haulIncome(quiet, b), 12);
  });
});

describe('7. fastForward', () => {
  it('for 20 seeds matches a 2 h simulation within 1 dried rock per slot and 5 % in credits', () => {
    SHAPES.forEach((shape, k) => {
      // Shape 2 sits on the edge of the freighter share (one route's q/h within 3 % of λ): there the
      // simulation throttles that route a little and the walk can be up to 2 rocks ahead (notes).
      const rockTolerance = k === 2 ? 2 : 1;
      let simCredits = 0;
      let ffCredits = 0;
      for (let seed = 1; seed <= 20; seed++) {
        const g = shaped(quiet, seed, shape);
        const sim = run(quiet, g, 7200, 1);
        const ff = H.fastForward(quiet, g, 7200, 1);
        simCredits += sim.lifetimeEarnings;
        ffCredits += ff.report.credits;
        const ffGame = ff.game as Run;
        g.haul.slots.forEach((s, i) => {
          if (!s.claimed) return;
          expect(Math.abs(ffGame.haul.slots[i].rockN - sim.haul.slots[i].rockN)).toBeLessThanOrEqual(rockTolerance);
        });
        expect(Math.abs(ff.report.rocksDry - sim.haul.counters.depleted)).toBeLessThanOrEqual(shape!.slots.length * rockTolerance);
        expect(ffGame.haul.clock).toBe(g.haul.clock);
        expect(conservationError(ffGame)).toBeLessThan(1e-9);
      }
      expect(Math.abs(ffCredits / simCredits - 1)).toBeLessThan(0.05);
    });
  }, 240_000);

  it('a climbing freighter warps out once (in flight), the hold ships, the freighter ends docked', () => {
    const g = shaped(quiet, 3, { slots: [0, 1], haulers: [2, 2], autopilot: true });
    let s: Run = { ...g, haul: { ...g.haul, hold: { iron: 12 } }, };
    s = { ...s, haul: { ...s.haul, counters: { ...s.haul.counters, drilled: s.haul.counters.drilled + 12 } } };
    s = H.launch(quiet, s) as Run;
    expect(s.haul.freighter.phase).toBe('climb');
    const payout = s.haul.freighter.payout;
    const cashBefore = s.cash;
    const ff = H.fastForward(quiet, s, 600, 0.45);
    expect(ff.report.inFlight).toBeCloseTo(payout, 9);
    expect(ff.game.cash).toBeCloseTo(cashBefore + payout, 9); // in flight added once; offline credits are not
    const h = (ff.game as Run).haul;
    expect(h.freighter.phase).toBe('docked');
    expect(H.holdTotal(h)).toBe(0);
    // Running it again on the result adds no second in-flight payout.
    expect(H.fastForward(quiet, ff.game, 600, 0.45).report.inFlight).toBe(0);
  });

  it('without the autopilot: hold to F, piles to cap, no credits; the time is capped at maxHours', () => {
    const g = shaped(quiet, 4, { slots: [0, 1], haulers: [1, 1], autopilot: false });
    const ff = H.fastForward(quiet, g, 99 * 3600, 1);
    expect(ff.report.noAutopilot).toBe(true);
    expect(ff.report.credits).toBe(0);
    expect(ff.report.seconds).toBe(6 * 3600);
    const h = (ff.game as Run).haul;
    const p = H.haulParams(quiet, ff.game as Run);
    expect(H.holdTotal(h)).toBeCloseTo(p.F, 9);
    expect(h.slots[0].pile).toBeCloseTo(p.slots[0].cap, 9);
    expect(conservationError(ff.game as Run)).toBeLessThan(1e-9);
  });

  it('dried rocks count in the lifetime stats with their Scrap Pods; warm-ups and respawns are rebased', () => {
    const g = shaped(quiet, 5, { slots: [0, 1, 2], haulers: [3, 3, 3], rig: [6, 6, 4], autopilot: true, freighter: 8 });
    const ff = H.fastForward(quiet, { ...g, stats: { ...g.stats, depleted: 5 } }, 6 * 3600, 0.45);
    const out = ff.game as Run;
    expect(ff.report.rocksDry).toBeGreaterThan(10);
    expect(out.stats.depleted).toBe(5 + ff.report.rocksDry);
    expect(out.chests.owned.scrap ?? 0).toBe(Math.floor(out.stats.depleted / 6));
    expect(ff.report.pods).toBe(out.chests.owned.scrap ?? 0);
    for (const s of out.haul.slots) {
      if (!s.claimed) continue;
      expect(s.routeFrom).toBeLessThanOrEqual(out.haul.clock);
      if (s.respawnAt !== null) expect(s.respawnAt - out.haul.clock).toBeLessThanOrEqual(6 + 1e-9);
    }
    // Offline never beats play: credits per effective second stay at what play earns from the same state.
    const play = run(quiet, g, ff.report.effective, 1);
    expect(ff.report.credits / ff.report.effective).toBeLessThanOrEqual((play.lifetimeEarnings / ff.report.effective) * 1.02);
  }, 60_000);
});

describe('haulOffline', () => {
  it('counts from the last save, caps at maxHours, efficiency at most 0.45', () => {
    const cfg = haulTestConfig({ contracts: { ...base.haul.contracts, unlockLaunches: 1e9 } });
    cfg.economy.offline.efficiency = 0.9;
    const g = shaped(cfg, 6, { slots: [0, 1], haulers: [2, 2], autopilot: true });
    const saved = { ...g, lastSavedAt: 1_000_000, stats: { ...g.stats, clockHigh: 1_000_000 } };
    const r = H.haulOffline(cfg, saved, 1_000_000 + 10 * 3600 * 1000);
    expect(r.seconds).toBe(6 * 3600);
    expect(r.report.effective).toBeCloseTo(6 * 3600 * 0.45, 6);
    expect(r.earnings).toBe(r.report.credits);
    expect(r.earnings).toBeGreaterThan(0);
    // Clock moved back: nothing.
    expect(H.haulOffline(cfg, saved, 500_000).seconds).toBe(0);
    // Offline credits per hour vs active play per hour at the same state: at most 0.45.
    const perHourOff = r.earnings / 6;
    const perHourOn = H.haulIncome(cfg, g) * 3600;
    expect(perHourOff / perHourOn).toBeLessThanOrEqual(0.45 * 1.05);
  });
});

// 2.11 "offline never beats play", checked on reachable states (contracts and seams on, the game's
// own config): an hour away pays at most efficiency × what the same station earns in an hour of play
// with nobody touching it (plus 10 % for the rock streams' variance), so it never beats play. It is
// not bounded by efficiency × activeRate: activeRate prices each ring at its weight-averaged ore,
// while the hour away ships the rocks that are really there (a rich far-ring rock under a heavy route
// pays up to about 1.35 × efficiency × activeRate). That is the rock stream, not a leak.
describe('2.11 offline never beats play (fixture states)', () => {
  const fx = haulFixtures(base);
  for (const name of ['minute3', 'midGame', 'late', 'afterJump'] as const) {
    it(`${name}: an hour away ≤ efficiency × an hour of untouched play`, () => {
      let g = fx[name];
      if (!g.haul.autopilot.online) g = { ...g, haul: { ...g.haul, autopilot: { ...g.haul.autopilot, online: true } } };
      // Idle drones (a fresh run after a Jump) go out first, as a player would before leaving.
      for (let k = 0; k < 60 && g.haul.idle > 0; k++) {
        const best = H.bestSlotForDrone(base, g);
        if (best === null) break;
        g = H.assignDrone(base, g, best) as Run;
      }
      const now = FIXTURE_NOW + 10 * 3600_000;
      const snap = { ...g, lastSavedAt: now, stats: { ...g.stats, clockHigh: now } } as Run;
      const off = H.haulOffline(base, snap, now + 3600_000);
      const eff = Math.min(0.45, base.economy.offline.efficiency);
      let earned = 0;
      run(base, g, 3600, 1, (_, ev) => ev.forEach((e) => e.type === 'warp' && (earned += e.payout)));
      expect(off.earnings).toBeGreaterThan(0);
      expect(off.earnings).toBeLessThanOrEqual(eff * earned * 1.1);
      expect(off.earnings).toBeLessThan(earned);
      const ar = H.haulIncome(base, g) * 3600;
      expect(off.earnings).toBeLessThanOrEqual(eff * ar * 1.5);
    }, 60_000);
  }
});
