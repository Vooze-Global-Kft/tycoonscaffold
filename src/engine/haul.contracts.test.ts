/**
 * The contract rule (section 2.6, Decisions 40 and 56): a contract's units over its L launches follow
 * what the station really ships: one ore raised by a drawn share over it, a second one held, never
 * below the routes as they are, never more than L holds.
 */
import { describe, expect, it } from 'vitest';
import * as H from './haul';
import { contractOf, handBasis, haulFixtures, haulTestConfig, run, shaped } from './fixtures/haul';

type Run = H.HaulGame & { haul: H.HaulState };
const cfg = haulTestConfig();
const C = cfg.haul.contracts;
/** No unlock and no autopilot surprises: contracts set by hand. */
const quietCfg = haulTestConfig({ contracts: { ...C, unlockLaunches: 1e9 } });

/** Ring 1 (iron) with many drones, ring 2 (slots 2 to 4) with one each, ring 3 slot 5 with one. */
function station(): Run {
  return shaped(cfg, 4242, { slots: [0, 1, 2, 3, 5], haulers: [6, 6, 1, 1, 1], rig: [10, 10, 4, 4, 4], capLevel: 3, freighter: 8, autopilot: true, policy: 'contract', idle: 0 });
}

// Rewritten for Decision 56: contracts are drawn from what the station really ships (`recent`, the
// steady figure until three launches are measured), not from a routed estimate ("reach"), so the
// tests of Decision 40's bounds and λ became tests of the raise, the hold and the never-free floor.
describe('contract units follow what the station really ships (Decision 56)', () => {
  it('the steady figure: F × r_o / R from the routes as they are, at most F in all, pure', () => {
    const g = station();
    const p = H.haulParams(cfg, g);
    const st = H.steadyPerLaunch(p, g.haul);
    const sum = Object.values(st.perLaunch).reduce((a, x) => a + x, 0);
    expect(sum).toBeCloseTo(p.F, 6);
    let R = 0;
    g.haul.slots.forEach((s, i) => {
      if (s.claimed && s.haulers > 0) R += Math.min(p.slots[i].rb, (s.haulers * p.slots[i].cBase) / p.slots[i].trip);
    });
    expect(st.rate).toBeCloseTo(R, 9);
    expect(g.haul.slots.map((s) => s.haulers)).toEqual([6, 6, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0]);
  });

  it('every offer raises one ore over what it ships and the routes as they are; a second ore is held; never more than L holds', () => {
    const g = station();
    const p = H.haulParams(cfg, g);
    const b = H.contractBasis(cfg, p, g.haul);
    const L = C.launches;
    let two = 0;
    for (let k = 1; k <= 300; k++) {
      const c = H.contractAt(cfg, g.haul.seed, k, b);
      // Every ore is on a rock the station has now.
      for (const w of c.wants) expect(g.haul.slots.some((s) => s.claimed && s.respawnAt === null && s.ore === w.ore)).toBe(true);
      const w0 = c.wants[0];
      // Never free: more than L launches of what it ships and of the routes as they are.
      expect(w0.units).toBeGreaterThan(L * b.recent[w0.ore]);
      expect(w0.units).toBeGreaterThan(L * b.steady[w0.ore]);
      if (c.wants.length > 1) {
        two++;
        const w1 = c.wants[1];
        expect(w1.units).toBeGreaterThanOrEqual(Math.round(L * b.recent[w1.ore] * C.holdShare[0]) - 1);
        expect(w1.units).toBeLessThanOrEqual(Math.round(L * b.recent[w1.ore] * C.holdShare[1]) + 1);
      }
      expect(c.wants.reduce((a, w) => a + w.units, 0)).toBeLessThanOrEqual(L * p.F);
      // Same inputs, same contract.
      expect(H.contractAt(cfg, g.haul.seed, k, b)).toEqual(c);
    }
    expect(two).toBeGreaterThan(30);
  });

  it('the raise is drawn from the raise range where nothing clamps it, and a harder contract pays more', () => {
    const b = handBasis(cfg, { iron: 60, copper: 40 });
    const L = C.launches;
    let seen = 0;
    for (let k = 1; k <= 120; k++) {
      const c = H.contractAt(cfg, 5, k, b);
      if (c.wants.length !== 1) continue;
      const w = c.wants[0];
      const g = w.units / (L * b.recent[w.ore]) - 1;
      expect(g).toBeGreaterThan(C.raise[0] - 0.02);
      expect(g).toBeLessThan(C.raise[1] + 0.02);
      seen++;
    }
    expect(seen).toBeGreaterThan(40);
  });

  it('a station that ships a single ore gets a quota contract: L F U(quota), the multiplier lowered (Decision 40)', () => {
    const g = shaped(cfg, 4242, { slots: [0, 1], haulers: [3, 2], idle: 0 });
    const p = H.haulParams(cfg, g);
    expect(new Set(g.haul.slots.filter((s) => s.claimed).map((s) => s.ore)).size).toBe(1);
    const b = H.contractBasis(cfg, p, g.haul);
    for (let k = 1; k <= 40; k++) {
      const c = H.contractAt(cfg, g.haul.seed, k, b);
      expect(c.wants).toHaveLength(1);
      const u = c.wants[0].units;
      expect(u).toBeGreaterThanOrEqual(Math.round(C.launches * p.F * C.quota[0]) - 1);
      expect(u).toBeLessThanOrEqual(Math.round(C.launches * p.F * C.quota[1]) + 1);
      expect(c.mult).toBeGreaterThanOrEqual(C.quotaMinMult - 1e-9);
      expect(c.mult).toBeLessThanOrEqual(C.mult[0] + C.jitter - C.quotaMultCut + 1e-9);
    }
  });

  it('an ore under a tenth of a launch\'s value, or one that already fills the launch, is not asked for', () => {
    // Iron is nearly every unit (no room to rise); titanium is a trace (worth nothing to the bonus).
    const b = handBasis(cfg, { iron: 90, copper: 30, titanium: 0.001 });
    for (let k = 1; k <= 200; k++) for (const w of H.contractAt(cfg, 8, k, b).wants) expect(w.ore).not.toBe('titanium');
    const full = handBasis(cfg, { iron: 95, copper: 5 });
    for (let k = 1; k <= 200; k++) expect(H.contractAt(cfg, 8, k, full).wants[0].ore).toBe('copper');
  });

  it('no offer pays a bonus under minBonusSeconds of the station\'s income', () => {
    const g = station();
    const p = H.haulParams(cfg, g);
    const b = H.contractBasis(cfg, p, g.haul);
    for (let k = 1; k <= 200; k++) expect(H.contractBonus(cfg, p, H.contractAt(cfg, g.haul.seed, k, b))).toBeGreaterThanOrEqual(C.minBonusSeconds * b.income * 0.999);
  });

  it('the offers of a board want different ores when the station has more than one to ask for', () => {
    const b = handBasis(cfg, { iron: 50, copper: 30, ice: 20 });
    for (let j = 0; j < 30; j++) {
      const ores: string[] = [];
      for (let i = 0; i < 3; i++) {
        const c = H.contractAt(cfg, 11, 1 + j * 3 + i, b, [], ores);
        if (i < 2) expect(ores).not.toContain(c.wants[0].ore);
        for (const w of c.wants) if (!ores.includes(w.ore)) ores.push(w.ore);
      }
      expect(ores.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('a contract drawn in play uses the station (warp-out replacements and the opening board)', () => {
    const g0 = haulFixtures(cfg).midGame;
    const p = H.haulParams(cfg, g0);
    for (const c of g0.haul.contracts.board) expect(c.wants.reduce((a, w) => a + w.units, 0)).toBeLessThanOrEqual(C.launches * p.F);
    let checked = 0;
    run(cfg, g0, 600, 1, (s, ev) => {
      for (const e of ev) {
        if (e.type !== 'contractNew') continue;
        const q = H.haulParams(cfg, s);
        expect(e.contract.wants.reduce((a, w) => a + w.units, 0)).toBeLessThanOrEqual(C.launches * q.F + 1);
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

  // Decision 56: from galaxy 2 on there is no fixed first contract; the board opens with ordinary
  // offers once three launches of the new run are measured.
  it('a later galaxy opens its board with ordinary offers after three launches', () => {
    const { afterJump } = haulFixtures(cfg);
    expect(afterJump.haul.contracts.unlocked).toBe(false);
    let opened: Run | null = null;
    let warps = 0;
    run(cfg, { ...afterJump, haul: { ...afterJump.haul, autopilot: { online: true, policy: 'full' }, idle: 0, slots: afterJump.haul.slots.map((s, i) => (i === 0 ? { ...s, haulers: s.haulers + afterJump.haul.idle } : s)) } }, 900, 1, (s, ev) => {
      for (const e of ev) {
        if (e.type === 'warp') warps++;
        if (e.type === 'contractsUnlocked' && !opened) opened = s;
      }
    });
    expect(opened, 'unlocked').toBeTruthy();
    const o = opened as unknown as Run;
    expect(o.haul.contracts.measured).toBe(3);
    expect(o.haul.contracts.board).toHaveLength(C.board);
    expect(o.haul.contracts.board.some((c) => c.taken || c.k === 0)).toBe(false);
    expect(o.haul.contracts.active).toBeNull();
    expect(new Set(o.haul.contracts.board.map((c) => c.buyer)).size).toBe(C.board);
    expect(warps).toBeGreaterThanOrEqual(3);
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
    // rules-8 (finishing round): taken now, an old save's active contract gets the full launches.
    expect(b[1].launchesLeft).toBe(C.launches);
    for (const c of b) for (const w of c.wants) expect(w.got).toBe(0);
  });

  it('two taken contracts in a damaged save: only the first stays taken; active points at it', () => {
    const g = station();
    const board = [contractOf(3, 'kade', [['iron', 30]], 1.6, 6, true), contractOf(4, 'corvo', [['iron', 30]], 1.6, 6, true), contractOf(5, 'oriel', [['iron', 30]], 1.6, 6)];
    const raw = JSON.parse(JSON.stringify({ ...g, haul: { ...g.haul, contracts: { unlocked: true, board, next: 6, active: 2 } } }));
    const out = H.reconcileHaul(cfg, raw, raw) as Run;
    expect(out.haul.contracts.board.filter((c) => c.taken)).toHaveLength(1);
    // Decision 56: the place of the second taken one stays empty until the next warp-out.
    expect(out.haul.contracts.board.map((c) => c.k)).toEqual([3, 5]);
    expect(out.haul.contracts.active).toBe(0);
  });
});
