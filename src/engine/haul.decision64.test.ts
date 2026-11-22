/**
 * Decision 64, "the board never lies": the cap of an offer's units and the eligibility of an ore
 * whose routes dried, pace figures that count a rock only while it lives (`dries`), no green and no
 * dominated offers, one buyer on a one-ore station, firstLife in every galaxy (haul.contracts.test.ts)
 * and the hand's allowance in the income line of a station without the autopilot.
 */
import { describe, expect, it } from 'vitest';
import * as H from './haul';
import { contractOf, handBasis, haulFixtures, haulTestConfig, run, shaped } from './fixtures/haul';

type Run = H.HaulGame & { haul: H.HaulState };
const cfg = haulTestConfig();
const C = cfg.haul.contracts;
const L = C.launches;

/** Ring 1 (iron) with many drones, ring 2 (slots 2 to 4) with one each, ring 3 slot 5 with one. */
function station(): Run {
  return shaped(cfg, 4242, { slots: [0, 1, 2, 3, 5], haulers: [6, 6, 1, 1, 1], rig: [10, 10, 4, 4, 4], capLevel: 3, freighter: 8, autopilot: true, policy: 'contract', idle: 0 });
}

/** The views of `offers` put on a copy of `g`'s board as untaken offers. */
function viewsOf(g: Run, offers: H.Contract[]): H.ContractView[] {
  const p = H.haulParams(cfg, g);
  const h: H.HaulState = { ...g.haul, contracts: { ...g.haul.contracts, unlocked: true, board: offers.map((c) => ({ ...c, taken: false })), active: null } };
  return H.contractViews(cfg, p, h);
}

/** Stations of the shared fixtures plus the hand-made one. */
function stations(): Run[] {
  const fx = haulFixtures(cfg);
  return [station(), fx.midGame as Run, fx.late as Run];
}

describe('Decision 64: an offer is capped by what the routes can do', () => {
  it('no drawn offer needs more than raise.hi (plus a small margin) on the board, and none is drawn on pace', () => {
    for (const g of stations()) {
      const p = H.haulParams(cfg, g);
      const b = H.contractBasis(cfg, p, g.haul);
      for (let k = 1; k <= 120; k++) {
        const c = H.contractAt(cfg, g.haul.seed, k, b);
        const [v] = viewsOf(g, [c]);
        expect(v.raise).toBeLessThanOrEqual(C.raise[1] + 0.05);
        // A one-ore station's quota is the only offer that may be met by full holds.
        if (!H.shipsOneOre(cfg, b)) expect(v.onPace).toBe(false);
      }
    }
  });

  it('an ore whose routes now ship less than half its recent figure is not asked for (its rocks dried)', () => {
    // Iron shipped 300 a launch lately; its routes now carry 40 (the 383K IRON · NEEDS +1108 % offer).
    const b = handBasis(cfg, { iron: 300, copper: 200 }, { steady: { iron: 40, copper: 460 }, lasting: { iron: 40, copper: 460 }, ringOf: { iron: 0, copper: 1 } });
    for (let k = 1; k <= 200; k++) {
      const c = H.contractAt(cfg, 9, k, b);
      expect(c.wants[0].ore).toBe('copper');
      for (const w of c.wants) expect(w.units).toBeLessThanOrEqual(Math.floor(L * (b.lasting?.[w.ore] ?? 0) * (1 + C.raise[1])));
    }
  });

  it('units never exceed L × the lasting figure × (1 + raise.hi), however high recent is', () => {
    const b = handBasis(cfg, { iron: 100, copper: 100 }, { steady: { iron: 100, copper: 100 }, lasting: { iron: 60, copper: 100 } });
    for (let k = 1; k <= 200; k++) {
      const c = H.contractAt(cfg, 5, k, b);
      for (const w of c.wants) expect(w.units).toBeLessThanOrEqual(Math.floor(L * (b.lasting?.[w.ore] ?? 0) * (1 + C.raise[1])));
    }
  });
});

describe('Decision 64: the pace figures count a rock only while it lives', () => {
  it('a route counts for the launches its rock still feeds; the other ores fill the hold after it; `dries` names it', () => {
    const g = station();
    const p = H.haulParams(cfg, g);
    const full = H.routeSchedule(cfg, p, g.haul, L);
    // Slot 0 (iron) has 1.5 launches of ore left.
    const s0 = g.haul.slots[0];
    expect(full.byLaunch[s0.ore][0]).toBeGreaterThan(0);
    const h: H.HaulState = JSON.parse(JSON.stringify(g.haul));
    const x0 = Math.min(p.slots[0].rb, (h.slots[0].haulers * p.slots[0].cBase) / p.slots[0].trip);
    const R = H.steadyPerLaunch(p, h).rate;
    const units0 = 1.5 * ((p.F * x0) / R);
    h.slots[0].pile = 0;
    h.slots[0].life = units0 / p.slots[0].r;
    const sch = H.routeSchedule(cfg, p, h, L);
    const plain = H.steadyPerLaunch(p, h).perLaunch;
    // Every launch still carries at most one hold.
    for (let k = 0; k < L; k++) expect(Object.values(sch.byLaunch).reduce((a, xs) => a + xs[k], 0)).toBeLessThanOrEqual(p.F + 1e-6);
    // The ore of the dying route loses what slot 0 cannot bring after 1.5 launches.
    expect(sch.perLaunch[s0.ore]).toBeLessThan(plain[s0.ore] - 0.5 * ((p.F * x0) / R));
    expect(sch.first[s0.ore]?.slot).toBe(0);
    expect(sch.first[s0.ore]!.seconds).toBeGreaterThan(sch.intervals[0]);
    expect(sch.first[s0.ore]!.seconds).toBeLessThan(sch.intervals[0] + sch.intervals[1]);
    // The view of an iron offer says so, and a rock-blind ON PACE is gone.
    const units = Math.ceil(L * plain[s0.ore]);
    const v = H.contractViews(cfg, p, { ...h, contracts: { unlocked: true, board: [contractOf(5, 'kade', [[s0.ore, units]], 1.3, 6)], next: 6, active: null } })[0];
    expect(v.onPace).toBe(false);
    expect(v.wants[0].dries?.slot).toBe(0);
    // Rocks that outlive the launches: no `dries`.
    const v2 = H.contractViews(cfg, p, { ...g.haul, contracts: { unlocked: true, board: [contractOf(5, 'kade', [[s0.ore, 1]], 1.3, 6)], next: 6, active: null } })[0];
    if (full.first[s0.ore] === undefined) expect(v2.wants[0].dries).toBeNull();
  });

  it('the draw prefers ores whose rocks last the contract', () => {
    const b = handBasis(cfg, { iron: 100, copper: 100 }, { steady: { iron: 100, copper: 100 }, lasting: { iron: 70, copper: 100 } });
    let copper = 0;
    for (let k = 1; k <= 100; k++) if (H.contractAt(cfg, 3, k, b).wants[0].ore === 'copper') copper++;
    expect(copper).toBe(100);
  });
});

describe('Decision 64: no green and no dominated offers', () => {
  it('an untaken offer the routes now meet untouched is resized to the never-free floor at the next warp-out', () => {
    const g0 = station();
    const p = H.haulParams(cfg, g0);
    const st = H.routeSchedule(cfg, p, g0.haul, L).perLaunch;
    const ore = Object.keys(st).sort((a, b) => st[b] - st[a])[0];
    const green = contractOf(7, 'kade', [[ore, Math.max(1, Math.floor(L * st[ore] * 0.5))]], 1.3, 9);
    const g: Run = { ...g0, haul: { ...g0.haul, contracts: { ...g0.haul.contracts, unlocked: true, board: [green], next: 8, active: null, sizedF: p.F, measured: 0 } } };
    expect(viewsOf(g, [green])[0].onPace).toBe(true);
    let seen = false;
    const out = run(cfg, g, 120, 0.5, (_s, ev) => {
      if (ev.some((e) => e.type === 'warp')) seen = true;
    });
    expect(seen).toBe(true);
    const still = out.haul.contracts.board.find((c) => c.k === 7);
    if (still) {
      const v = H.contractViews(cfg, H.haulParams(cfg, out), out.haul).find((x) => x.contract.k === 7)!;
      expect(v.onPace).toBe(false);
    }
  });

  it('two offers that want the same ores never ask raises closer than raiseGap, and the larger order pays more', () => {
    for (const g of stations()) {
      const p = H.haulParams(cfg, g);
      const b = H.contractBasis(cfg, p, g.haul);
      if (H.shipsOneOre(cfg, b)) continue;
      for (let j = 0; j < 40; j++) {
        const board: H.Contract[] = [];
        for (let i = 0; i < C.board; i++) {
          const c = H.contractAt(cfg, g.haul.seed, 500 + j * 3 + i, b, board.map((x) => x.buyer), [...new Set(board.flatMap((x) => x.wants.map((w) => w.ore)))], H.rivalsOf(cfg, b, board));
          board.push(c);
        }
        const r = H.rivalsOf(cfg, b, board);
        for (let x = 0; x < r.length; x++)
          for (let y = x + 1; y < r.length; y++) {
            if ([...r[x].ores].sort().join() !== [...r[y].ores].sort().join()) continue;
            expect(Math.abs(r[x].raise - r[y].raise)).toBeGreaterThanOrEqual(C.raiseGap - 0.02);
            const [lo, hi] = r[x].raise < r[y].raise ? [r[x], r[y]] : [r[y], r[x]];
            expect(hi.bonus).toBeGreaterThan(lo.bonus);
          }
      }
    }
  });
});

describe('Decision 64: one buyer on a one-ore station', () => {
  it('the board of a station that ships one ore holds one contract, and boardNote says a second ore brings more', () => {
    // Galaxy 2 (no fixed first contract), iron only.
    const g0 = shaped(cfg, 77, { slots: [0, 1], haulers: [3, 3], autopilot: true });
    const g: Run = { ...g0, haul: { ...g0.haul, galaxy: 1 } };
    const p = H.haulParams(cfg, g);
    const board = H.openBoard(cfg, g.haul, p.F, p);
    expect(board.board).toHaveLength(1);
    const g2: Run = { ...g, haul: { ...g.haul, contracts: board } };
    expect(H.boardNote(cfg, g2)).toBe('secondOre');
    // A few warp-outs later it is still one buyer.
    const later = run(cfg, g2, 200, 0.5);
    if (H.shipsOneOre(cfg, H.contractBasis(cfg, H.haulParams(cfg, later), later.haul))) expect(later.haul.contracts.board.length).toBeLessThanOrEqual(1);
    // A station shipping several ores fills every place, and boardNote is null.
    const s = station();
    const q = H.haulParams(cfg, s);
    const full = H.openBoard(cfg, s.haul, q.F, q);
    expect(full.board).toHaveLength(C.board);
    expect(H.boardNote(cfg, { ...s, haul: { ...s.haul, contracts: full } })).toBeNull();
  });

  it('in galaxy 1 the board opens with the fixed first contract alone on a one-ore station', () => {
    const g = shaped(cfg, 77, { slots: [0, 1], haulers: [3, 3] });
    const p = H.haulParams(cfg, g);
    const b = H.openBoard(cfg, g.haul, p.F, p);
    expect(b.board).toHaveLength(1);
    expect(b.board[0].taken).toBe(true);
    expect(b.active).toBe(0);
  });
});

describe('Decision 64: the income line counts the hand', () => {
  it('without the autopilot the freighter cycle includes haul.freighter.manualAllowance seconds', () => {
    const on = shaped(cfg, 4242, { slots: [0, 1], haulers: [20, 20], rig: [20, 20], autopilot: true });
    const off: Run = { ...on, haul: { ...on.haul, autopilot: { online: false, policy: 'full' } } };
    const p = H.haulParams(cfg, on);
    const a = cfg.haul.freighter.manualAllowance;
    expect(a).toBe(3);
    expect(H.manualCycleExtra(cfg, off.haul)).toBe(a);
    expect(H.manualCycleExtra(cfg, on.haul)).toBe(0);
    expect(H.freighterRate(p, a)).toBeCloseTo(p.F / (p.climb + p.away + p.land + a), 9);
    const rOn = H.activeRate(cfg, p, on.haul);
    const rOff = H.activeRate(cfg, p, off.haul);
    // Freighter-bound station: the line falls by the cycle's ratio.
    expect(rOff).toBeLessThan(rOn);
    expect(rOff / rOn).toBeCloseTo((p.climb + p.away + p.land) / (p.climb + p.away + p.land + a), 2);
    const zero = haulTestConfig({ freighter: { ...cfg.haul.freighter, manualAllowance: 0 } });
    expect(H.activeRate(zero, H.haulParams(zero, off), off.haul)).toBeCloseTo(rOn, 6);
  });
});
