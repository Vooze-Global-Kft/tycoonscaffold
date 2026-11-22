/**
 * The contract rule (section 2.6 as revised at integration): a contract's units follow what the
 * station can put into one launch of its ores, between the routes as they are and the routes a
 * player sets for it, so a contract is neither met without doing anything nor out of reach.
 */
import { describe, expect, it } from 'vitest';
import * as H from './haul';
import { haulFixtures, haulTestConfig, run, shaped } from './fixtures/haul';

type Run = H.HaulGame & { haul: H.HaulState };
const cfg = haulTestConfig();
const C = cfg.haul.contracts;

/** Ring 1 (iron) with many drones, ring 2 (slots 2 to 4) with one each, ring 3 slot 5 with one. */
function station(): Run {
  return shaped(cfg, 4242, { slots: [0, 1, 2, 3, 5], haulers: [6, 6, 1, 1, 1], rig: [10, 10, 4, 4, 4], capLevel: 3, freighter: 8, autopilot: true, policy: 'contract', idle: 0 });
}

describe('contract units follow what the station can deliver', () => {
  it('reach: the routed share is above the share as routed, and both are at most F', () => {
    const g = station();
    const p = H.haulParams(cfg, g);
    const st = H.contractStation(cfg, p, g.haul);
    const far = g.haul.slots[5].ore;
    const r = st.reach([far]);
    expect(r.now[0]).toBeGreaterThan(0);
    expect(r.routed[0]).toBeGreaterThan(r.now[0] * 1.5);
    expect(r.routed[0]).toBeLessThanOrEqual(p.F + 1e-9);
    const two = st.reach([g.haul.slots[0].ore, far]);
    expect(two.now[0] + two.now[1]).toBeLessThanOrEqual(p.F + 1e-9);
    expect(two.routed[0] + two.routed[1]).toBeLessThanOrEqual(p.F + 1e-9);
    // Pure: the station is not changed by asking.
    expect(g.haul.slots.map((s) => s.haulers)).toEqual([6, 6, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0]);
  });

  it('every contract sits between the hold as routed and the hold routed for it, within [minUnits, F]', () => {
    const g = station();
    const p = H.haulParams(cfg, g);
    const st = H.contractStation(cfg, p, g.haul);
    const rings = H.claimedRings(cfg, g.haul);
    let between = 0;
    for (let k = 1; k <= 300; k++) {
      const c = H.contractAt(cfg, g.haul.seed, k, rings, p.F, null, st);
      const total = c.wants.reduce((a, w) => a + w.units, 0);
      expect(total).toBeGreaterThanOrEqual(Math.min(C.minUnits, Math.floor(p.F)));
      expect(total).toBeLessThanOrEqual(Math.floor(p.F));
      // Every ore is on a rock the station has now.
      for (const w of c.wants) expect(g.haul.slots.some((s) => s.claimed && s.respawnAt === null && s.ore === w.ore)).toBe(true);
      const r = st.reach(c.wants.map((w) => w.ore));
      c.wants.forEach((w, i) => {
        expect(w.units).toBeLessThanOrEqual(Math.ceil(r.routed[i]) + 1);
        if (r.routed[i] - r.now[i] > 4) {
          expect(w.units).toBeGreaterThan(r.now[i]);
          between++;
        }
      });
      // Same inputs, same contract.
      expect(H.contractAt(cfg, g.haul.seed, k, rings, p.F, null, st)).toEqual(c);
    }
    expect(between).toBeGreaterThan(100);
  });

  it('the λ draw follows the reach range: units = now + λ (routed − now)', () => {
    const g = station();
    const p = H.haulParams(cfg, g);
    const st = H.contractStation(cfg, p, g.haul);
    const rings = H.claimedRings(cfg, g.haul);
    for (let k = 1; k <= 60; k++) {
      const c = H.contractAt(cfg, g.haul.seed, k, rings, p.F, null, st);
      if (c.wants.length !== 1) continue;
      const r = st.reach([c.wants[0].ore]);
      if (r.routed[0] - r.now[0] < 6) continue;
      const lambda = (c.wants[0].units - r.now[0]) / (r.routed[0] - r.now[0]);
      expect(lambda).toBeGreaterThan(C.reach[0] - 0.1);
      expect(lambda).toBeLessThan(C.reach[1] + 0.1);
    }
  });

  it('a contract drawn in play uses the station (warp-out replacements and the opening board)', () => {
    const g0 = haulFixtures(cfg).midGame;
    const p = H.haulParams(cfg, g0);
    // The board of a mid-game run: no contract asks for more than F.
    for (const c of g0.haul.contracts.board) expect(c.wants.reduce((a, w) => a + w.units, 0)).toBeLessThanOrEqual(Math.floor(p.F));
    // Play on: every new contract fits the freighter and asks only for ores on rocks now.
    let checked = 0;
    run(cfg, g0, 600, 1, (s, ev) => {
      for (const e of ev) {
        if (e.type !== 'contractNew') continue;
        const q = H.haulParams(cfg, s);
        expect(e.contract.wants.reduce((a, w) => a + w.units, 0)).toBeLessThanOrEqual(Math.floor(q.F));
        checked++;
      }
    });
    expect(checked).toBeGreaterThan(5);
  }, 60_000);

  it('a later galaxy opens its board from the new run’s station', () => {
    const { afterJump } = haulFixtures(cfg);
    const p = H.haulParams(cfg, afterJump);
    expect(afterJump.haul.contracts.unlocked).toBe(true);
    const st = H.contractStation(cfg, p, afterJump.haul);
    const rings = H.claimedRings(cfg, afterJump.haul);
    afterJump.haul.contracts.board.forEach((c) => {
      if (c.k === 0) return;
      expect(c).toEqual(H.contractAt(cfg, afterJump.haul.seed, c.k, rings, p.F, afterJump.haul.trait, st));
    });
  }, 60_000);

  it('the fixture set is built per config (a second config gets its own states)', () => {
    const other = haulTestConfig({ contracts: { ...C, lifetime: 4 } });
    expect(haulFixtures(other).fresh).not.toBe(haulFixtures(cfg).fresh);
    expect(haulFixtures(cfg).fresh).toBe(haulFixtures(cfg).fresh);
  }, 120_000);
});
