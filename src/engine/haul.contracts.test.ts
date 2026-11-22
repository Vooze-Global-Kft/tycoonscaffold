/**
 * The contract rule (section 2.6, Decision 40): a contract's units over its L launches follow what
 * the station can put into one launch of its ores, between the routes as they are and the routes a
 * player sets for it, held by two bounds: never free (above L launches as the routes are, by the
 * margin) and always reachable (at most the first launch as it is plus L − 1 routed ones).
 */
import { describe, expect, it } from 'vitest';
import * as H from './haul';
import { contractOf, haulFixtures, haulTestConfig, run, shaped } from './fixtures/haul';

type Run = H.HaulGame & { haul: H.HaulState };
const cfg = haulTestConfig();
const C = cfg.haul.contracts;
/** No unlock and no autopilot surprises: contracts set by hand. */
const quietCfg = haulTestConfig({ contracts: { ...C, unlockLaunches: 1e9 } });

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

  it('every contract obeys both bounds of Decision 40: never free, always reachable (with the widening)', () => {
    const g = station();
    const p = H.haulParams(cfg, g);
    const st = H.contractStation(cfg, p, g.haul);
    const rings = H.claimedRings(cfg, g.haul);
    const L = C.launches;
    let routedFor = 0;
    for (let k = 1; k <= 300; k++) {
      const c = H.contractAt(cfg, g.haul.seed, k, rings, p.F, null, st);
      // Every ore is on a rock the station has now.
      for (const w of c.wants) expect(g.haul.slots.some((s) => s.claimed && s.respawnAt === null && s.ore === w.ore)).toBe(true);
      const ores = c.wants.map((w) => w.ore);
      const r = st.reach(ores);
      const wide = st.reach(ores, { share: C.maxShare, last: true });
      c.wants.forEach((w, i) => {
        // Never free: more than L launches with the routes as they are deliver.
        expect(w.units).toBeGreaterThanOrEqual(Math.ceil(L * r.now[i] * (1 + C.margin) - 1e-9));
        expect(w.units).toBeGreaterThan(L * r.now[i]);
        // Always reachable: the first launch as it is, then L − 1 routed (at most the widest routing).
        expect(w.units).toBeLessThanOrEqual(Math.floor(r.now[i] + (L - 1) * wide.routed[i] + 1e-9));
        if (w.units <= Math.floor(r.now[i] + (L - 1) * r.routed[i] + 1e-9)) routedFor++;
      });
      expect(c.wants.reduce((a, w) => a + w.units, 0)).toBeLessThanOrEqual(L * p.F);
      // Same inputs, same contract.
      expect(H.contractAt(cfg, g.haul.seed, k, rings, p.F, null, st)).toEqual(c);
    }
    // Most are reachable with the default share already.
    expect(routedFor).toBeGreaterThan(150);
  });

  it('the λ draw follows the reach range: units = L now + λ (L − 1)(routed − now) where no bound clamps it', () => {
    const g = station();
    const p = H.haulParams(cfg, g);
    const st = H.contractStation(cfg, p, g.haul);
    const rings = H.claimedRings(cfg, g.haul);
    const L = C.launches;
    let seen = 0;
    for (let k = 1; k <= 120; k++) {
      const c = H.contractAt(cfg, g.haul.seed, k, rings, p.F, null, st);
      if (c.wants.length !== 1) continue;
      const r = st.reach([c.wants[0].ore]);
      const lo = Math.ceil(L * r.now[0] * (1 + C.margin) - 1e-9);
      const hi = Math.floor(r.now[0] + (L - 1) * r.routed[0] + 1e-9);
      const u = c.wants[0].units;
      if (!(u > lo && u < hi) || (L - 1) * (r.routed[0] - r.now[0]) < 20) continue;
      const lambda = (u - L * r.now[0]) / ((L - 1) * (r.routed[0] - r.now[0]));
      expect(lambda).toBeGreaterThan(C.reach[0] - 0.05);
      expect(lambda).toBeLessThan(C.reach[1] + 0.05);
      seen++;
    }
    expect(seen).toBeGreaterThan(5);
  });

  it('a station with a single ore gets a quota contract: L F U(quota), the multiplier lowered (Decision 40)', () => {
    const g = shaped(cfg, 4242, { slots: [0, 1], haulers: [3, 2], idle: 0 });
    const p = H.haulParams(cfg, g);
    expect(new Set(g.haul.slots.filter((s) => s.claimed).map((s) => s.ore)).size).toBe(1);
    const st = H.contractStation(cfg, p, g.haul);
    for (let k = 1; k <= 40; k++) {
      const c = H.contractAt(cfg, g.haul.seed, k, [0], p.F, null, st);
      expect(c.wants).toHaveLength(1);
      const u = c.wants[0].units;
      expect(u).toBeGreaterThanOrEqual(Math.round(C.launches * p.F * C.quota[0]) - 1);
      expect(u).toBeLessThanOrEqual(Math.round(C.launches * p.F * C.quota[1]) + 1);
      expect(c.mult).toBeGreaterThanOrEqual(C.quotaMinMult - 1e-9);
      expect(c.mult).toBeLessThanOrEqual(C.mult[0] + C.jitter - C.quotaMultCut + 1e-9);
    }
  });

  it('a contract drawn in play uses the station (warp-out replacements and the opening board)', () => {
    const g0 = haulFixtures(cfg).midGame;
    const p = H.haulParams(cfg, g0);
    // The board of a mid-game run: no contract asks for more than its launches can carry.
    for (const c of g0.haul.contracts.board) expect(c.wants.reduce((a, w) => a + w.units, 0)).toBeLessThanOrEqual(C.launches * p.F);
    // Play on: every new contract fits its launches and asks only for ores on rocks now.
    let checked = 0;
    run(cfg, g0, 600, 1, (s, ev) => {
      for (const e of ev) {
        if (e.type !== 'contractNew') continue;
        const q = H.haulParams(cfg, s);
        expect(e.contract.wants.reduce((a, w) => a + w.units, 0)).toBeLessThanOrEqual(C.launches * q.F);
        for (const w of e.contract.wants) expect(s.haul.slots.some((x) => x.claimed && x.ore === w.ore)).toBe(true);
        checked++;
      }
    });
    expect(checked).toBeGreaterThan(5);
  }, 60_000);

  it('a board never shows the same buyer twice (panels, mid preset)', () => {
    run(cfg, haulFixtures(cfg).midGame, 900, 1, (s) => {
      const b = s.haul.contracts.board;
      expect(new Set(b.map((c) => c.buyer)).size).toBe(b.length);
    });
  }, 60_000);

  it('a later galaxy opens its board from the new run’s station', () => {
    const { afterJump } = haulFixtures(cfg);
    const p = H.haulParams(cfg, afterJump);
    expect(afterJump.haul.contracts.unlocked).toBe(true);
    const st = H.contractStation(cfg, p, afterJump.haul);
    const rings = H.claimedRings(cfg, afterJump.haul);
    const board = afterJump.haul.contracts.board;
    board.forEach((c, i) => {
      if (c.k === 0) return;
      expect(c).toEqual(H.contractAt(cfg, afterJump.haul.seed, c.k, rings, p.F, afterJump.haul.trait, st, board.slice(0, i).map((b) => b.buyer)));
    });
    // One call per buyer on the board.
    expect(new Set(board.map((c) => c.buyer)).size).toBe(board.length);
  }, 60_000);

  it('the fixture set is built per config (a second config gets its own states)', () => {
    const other = haulTestConfig({ contracts: { ...C, lifetime: 4 } });
    expect(haulFixtures(other).fresh).not.toBe(haulFixtures(cfg).fresh);
    expect(haulFixtures(cfg).fresh).toBe(haulFixtures(cfg).fresh);
  }, 120_000);
});

describe('Decision 53: the day shift doubles the first contracts met in each shift', () => {
  const day0 = Date.UTC(2026, 10, 22, 9);
  const H16 = 16 * 3600 * 1000;
  it('a shift starts on the first call; a new one only on a new day and 16 h after the last started', () => {
    const g = shaped(cfg, 3, { slots: [0] });
    const a = H.haulShift(cfg, g, day0, '2026-11-22');
    expect(a.haulStats.shift).toEqual({ day: '2026-11-22', startedAt: day0, met: 0 });
    const met2 = { ...a, haulStats: { ...a.haulStats, shift: { ...a.haulStats.shift!, met: 2 } } };
    // Same day: nothing changes.
    expect(H.haulShift(cfg, met2, day0 + 10 * 3600 * 1000, '2026-11-22')).toBe(met2);
    // New day, but less than 16 h (a moved clock or a late night): nothing changes.
    expect(H.haulShift(cfg, met2, day0 + H16 - 1, '2026-11-23')).toBe(met2);
    // A clock moved backwards: nothing changes.
    expect(H.haulShift(cfg, met2, day0 - 3 * 86_400_000, '2026-11-19')).toBe(met2);
    const b = H.haulShift(cfg, met2, day0 + H16, '2026-11-23');
    expect(b.haulStats.shift).toEqual({ day: '2026-11-23', startedAt: day0 + H16, met: 0 });
    expect(H.shiftView(cfg, met2)).toEqual({ left: 1, of: 3, mult: 2 });
  });

  it('the first 3 contracts met in a shift pay their bonus twice; the 4th once; a Jump keeps the count', () => {
    let g = H.haulShift(cfg, shaped(quietCfg, 3, { slots: [0], haulers: [1] }), day0, '2026-11-22') as Run;
    const bonuses: { bonus: number; shift: boolean; fixed: number }[] = [];
    for (let i = 0; i < 4; i++) {
      const c = contractOf(10 + i, 'kade', [['iron', 3]], 1.6, 6, true);
      g = { ...g, haul: { ...g.haul, hold: { iron: 3 }, freighter: { ...g.haul.freighter, phase: 'docked', t: 0 }, contracts: { unlocked: true, board: [c], next: 20 + i, active: 0 } } };
      const fixed = H.contractBonus(quietCfg, H.haulParams(quietCfg, g), c);
      const views = H.contractViews(quietCfg, H.haulParams(quietCfg, g), g.haul, g.haulStats);
      expect(views[0].shift).toBe(i < 3);
      g = H.launch(quietCfg, g) as Run;
      const ev: H.HaulEvent[] = [];
      g = H.advanceHaul(quietCfg, g, 3, 0, ev) as Run;
      const m = ev.find((e) => e.type === 'contractMet');
      if (m && m.type === 'contractMet') bonuses.push({ bonus: m.bonus, shift: m.shift, fixed });
    }
    expect(bonuses).toHaveLength(4);
    bonuses.forEach((b, i) => {
      expect(b.shift).toBe(i < 3);
      expect(b.bonus).toBeCloseTo(b.fixed * (i < 3 ? 2 : 1), 9);
    });
    expect(g.haulStats.shift?.met).toBe(3);
    expect(H.shiftView(quietCfg, g).left).toBe(0);
  });
});

describe('saves before Decision 40 and damaged boards (rules-8)', () => {
  it('an old save: the active contract becomes the taken one, others are offers, nothing delivered', () => {
    const g = station();
    const p = H.haulParams(cfg, g);
    const board = H.openBoard(cfg, g.haul, p.F, p).board.map((c) => ({ k: c.k, buyer: c.buyer, wants: c.wants.map((w) => ({ ore: w.ore, units: w.units })), mult: c.mult, launchesLeft: 4 }));
    const raw = JSON.parse(JSON.stringify({ ...g, haul: { ...g.haul, contracts: { unlocked: true, board, next: 9, active: 1 } } }));
    const out = H.reconcileHaul(cfg, raw, raw) as Run;
    const b = out.haul.contracts.board;
    expect(b.map((c) => c.taken)).toEqual([false, true, false]);
    expect(out.haul.contracts.active).toBe(1);
    expect(b[1].launchesLeft).toBe(4);
    for (const c of b) for (const w of c.wants) expect(w.got).toBe(0);
  });

  it('two taken contracts in a damaged save: only the first stays taken; active points at it', () => {
    const g = station();
    const board = [contractOf(3, 'kade', [['iron', 30]], 1.6, 6, true), contractOf(4, 'corvo', [['iron', 30]], 1.6, 6, true), contractOf(5, 'oriel', [['iron', 30]], 1.6, 6)];
    const raw = JSON.parse(JSON.stringify({ ...g, haul: { ...g.haul, contracts: { unlocked: true, board, next: 6, active: 2 } } }));
    const out = H.reconcileHaul(cfg, raw, raw) as Run;
    expect(out.haul.contracts.board.filter((c) => c.taken)).toHaveLength(1);
    expect(out.haul.contracts.board.length).toBe(C.board);
    expect(out.haul.contracts.active).toBe(0);
  });
});
