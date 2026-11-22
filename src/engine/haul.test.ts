/// <reference types="node" />
/**
 * Haul engine rules: section 10.2 tests 1 to 5, 8, 9, 13, the worked numbers of 2.12 and the
 * autopilot policies. Offline (6, 7) in haul.offline.test.ts, the Jump and Star Map (10 to 12) in
 * haul.jump.test.ts, the random-action property test in haul.property.test.ts.
 */
import { describe, expect, it } from 'vitest';
import * as H from './haul';
import { conservationError, freshHaulGame, haulTestConfig, playFor, playerStep, run, shaped } from './fixtures/haul';

type Run = H.HaulGame & { haul: H.HaulState };
const cfg = haulTestConfig();
const NOW = 1_800_000_000_000;

const noContracts = haulTestConfig({ contracts: { ...cfg.haul.contracts, unlockLaunches: 1e9 } });
const quiet = haulTestConfig({
  contracts: { ...cfg.haul.contracts, unlockLaunches: 1e9 },
  seam: { ...cfg.haul.seam, first: 1e12 },
  flare: { ...cfg.haul.flare, firstAt: 1e12 },
});

describe('2.12 worked numbers (tutorial path)', () => {
  it('follows from the formulas', () => {
    const g = freshHaulGame(cfg, 7);
    const p = H.haulParams(cfg, g);
    expect(g.cash).toBe(0);
    expect(g.haul.slots[0].ore).toBe('iron');
    expect(p.slots[0].rb).toBeCloseTo(0.6, 12);
    expect(p.slots[0].cap).toBe(15); // pile 8/15
    expect(g.haul.slots[0].pile).toBe(8);
    expect(g.haul.idle).toBe(1);
    expect(p.F).toBe(12);
    expect(p.slots[0].trip).toBeCloseTo(5.2, 12); // 2 x 1.00 / 0.5 + 1.2
    expect(p.slots[0].c).toBe(4);
    // 0:04 drag the drone onto T-1: h = 4 / 5.2 = 0.77/s, first delivery at 0:06.6.
    let s = run(cfg, g, 4);
    s = H.assignDrone(cfg, s, 0) as Run;
    expect(H.haulParams(cfg, s).slots[0].h).toBeCloseTo(0.769, 3);
    expect(s.haul.slots[0].routeFrom).toBeCloseTo(6.6, 9);
    // 0:22: the hold is full (12 / 0.769 after 6.6 s).
    let fullAt = -1;
    s = run(cfg, s, 20, 0.1, (x) => {
      if (fullAt < 0 && H.holdTotal(x.haul) >= 12 - 1e-9) fullAt = x.haul.clock;
    });
    expect(fullAt).toBeGreaterThan(21.5);
    expect(fullAt).toBeLessThan(22.6);
    // Swipe at 0:24: 12 x ₵1 x 1.1 = ₵13.2 at the warp-out, 2.5 s later.
    s = H.launch(cfg, s) as Run;
    expect(s.haul.freighter.payout).toBeCloseTo(13.2, 9);
    let paid = 0;
    s = run(cfg, s, 2.5, 0.1, (_, ev) => ev.forEach((e) => e.type === 'warp' && (paid += e.payout)));
    expect(paid).toBeCloseTo(13.2, 9);
    // Freighter cycle 2.5 + 8 + 2 = 12.5 s.
    const q = H.haulParams(cfg, s);
    expect(q.climb + q.away + q.land).toBe(12.5);
    // Drone 2 costs ₵10; slot 1 costs 13 x 1.6 = ₵20.8 (shown ₵21).
    expect(H.droneCost(cfg, s)).toBe(10);
    expect(H.claimCost(cfg, s, 1)).toBeCloseTo(20.8, 9);
    // Autopilot ₵90.
    expect(H.autopilotCost(cfg, s)).toBe(90);
  }, 60_000);

  it('contract 0 met: (10 x 1.5 + 2 x 1.1) x 1.1 = ₵18.92', () => {
    const g = shaped(cfg, 1, { slots: [0, 1], haulers: [1, 1] });
    const p = H.haulParams(cfg, g);
    const c0 = H.contractAt(cfg, g.haul.seed, 0, [0], p.F, null);
    expect(c0).toMatchObject({ k: 0, buyer: 'halden', wants: [{ ore: 'iron', units: 10 }], mult: 1.5, launchesLeft: 6 });
    const { payout, met } = H.payoutFor(p, { iron: 12 }, c0, 0);
    expect(met).toBe(true);
    expect(payout).toBeCloseTo(18.92, 9);
  }, 60_000);

  it('prices of section 2.5', () => {
    const g = shaped(cfg, 1, { slots: [0, 2, 5, 8, 10], rig: [1, 1, 3, 1, 1] });
    expect(H.rigCost(cfg, g, 0)).toBe(3);
    expect(H.rigCost(cfg, g, 2)).toBe(120); // ring 2 L1: 3 x 40
    expect(H.rigCost(cfg, g, 5)).toBeCloseTo(3 * 1600 * 1.6 * 1.6, 6);
    expect(H.claimCost(cfg, g, 3)).toBeCloseTo(13 * 20 * 1.6, 9);
    expect(H.claimCost(cfg, g, 0)).toBe(Infinity);
    expect(H.capacityCost(cfg, g)).toBe(30);
    expect(H.engineCost(cfg, g)).toBe(60);
    expect(H.freighterCost(cfg, g)).toBe(15);
    // Engines stop at the x4 speed cap (level 39).
    const e = { ...g, haul: { ...g.haul, fleet: { ...g.haul.fleet, engineLevel: 39 } } };
    expect(H.engineMult(cfg, 39)).toBe(4);
    expect(H.engineCost(cfg, e)).toBe(Infinity);
    expect(H.engineCost(cfg, { ...e, haul: { ...e.haul, fleet: { ...e.haul.fleet, engineLevel: 38 } } })).toBeLessThan(Infinity);
  }, 60_000);

  it('rig tiers: x2 at 4, 10, 20, 35, then x1.5 every 15 levels', () => {
    expect(H.rigTier(cfg, 3).drill).toBe(1);
    expect(H.rigTier(cfg, 4).drill).toBe(2);
    expect(H.rigTier(cfg, 10)).toMatchObject({ drill: 4, life: 1.5 });
    expect(H.rigTier(cfg, 20)).toMatchObject({ drill: 8, seamWeight: 3 });
    expect(H.rigTier(cfg, 35)).toMatchObject({ drill: 16, pileCap: 2 });
    expect(H.rigTier(cfg, 49).drill).toBe(16);
    expect(H.rigTier(cfg, 50).drill).toBe(24);
    expect(H.rigTier(cfg, 65).drill).toBe(36);
  }, 60_000);

  it('freighter capacity, away times and the drone cap', () => {
    expect(H.freighterCapacity(cfg, 1, 0, null)).toBe(12);
    expect(H.freighterCapacity(cfg, 2, 0, null)).toBe(17);
    expect(H.freighterCapacity(cfg, 4, 0, null)).toBe(36); // the Station sheet's "L4 · holds 36"
    expect(H.awayBase(cfg, 9)).toBe(8);
    expect(H.awayBase(cfg, 10)).toBe(12);
    expect(H.awayBase(cfg, 25)).toBe(16);
    expect(H.droneCapFor(cfg, 0, [])).toBe(24);
    expect(H.droneCapFor(cfg, 1, [])).toBe(28);
    expect(H.droneCapFor(cfg, 1, ['space_hangar'])).toBe(34);
  }, 60_000);
});

describe('1. determinism', () => {
  it('the same config, state and dt sequence give a bit-identical state', () => {
    const a = playFor(cfg, freshHaulGame(cfg, 99), 400);
    const b = playFor(cfg, freshHaulGame(cfg, 99), 400);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const c = playFor(cfg, freshHaulGame(cfg, 100), 400);
    expect(JSON.stringify(a.haul)).not.toBe(JSON.stringify(c.haul));
  }, 60_000);

  it('600 s in 0.1 s steps and in 1 s steps differ by under 0.5 % in cash and units hauled', () => {
    for (const policy of ['full', 'contract'] as const) {
      for (const seed of [1, 2, 3]) {
        const g0 = shaped(cfg, seed, { slots: [0, 1, 2, 3], haulers: [2, 2, 3, 2], rig: [6, 5, 3, 2], autopilot: true, policy, capLevel: 3, freighter: 6 });
        const go = (dt: number) => {
          let s = g0;
          for (let t = 0; t < 600; t++) {
            // The same decisions at the same whole seconds in both runs.
            if (s.haul.contracts.unlocked && s.haul.contracts.active === null) s = H.pickContract(cfg, s, t % 3) as Run;
            if (t === 200) s = H.moveDrone(cfg, s, 2, 1) as Run;
            if (t === 400 && s.haul.vein.slot !== null) s = H.moveDrone(cfg, s, 0, s.haul.vein.slot) as Run;
            for (let k = 0; k < Math.round(1 / dt); k++) s = H.advanceHaul(cfg, s, dt, NOW) as Run;
          }
          return s;
        };
        const a = go(0.1);
        const b = go(1);
        const rel = (x: number, y: number) => Math.abs(x - y) / Math.max(1, Math.abs(y));
        expect(a.lifetimeEarnings).toBeGreaterThan(1000);
        expect(rel(a.lifetimeEarnings, b.lifetimeEarnings)).toBeLessThan(0.005);
        expect(rel(a.stats.hauled, b.stats.hauled)).toBeLessThan(0.005);
      }
    }
  }, 60_000);
});

describe('2. conservation and 3. caps', () => {
  it('drilled = piles + hold + cargo + shipped at every step (Overflow Chute included)', () => {
    let g = shaped(cfg, 3, { slots: [0, 1, 2, 3], haulers: [1, 3, 0, 2], rig: [5, 1, 4, 1], autopilot: true });
    g = { ...g, cards: { chute: { level: 3, copies: 0 } } };
    g = H.fitModule(cfg, g, 0, 'chute') as Run;
    expect(g.loadout.sockets[0]).toBe('chute');
    let spilled = false;
    run(cfg, g, 900, 0.37, (s) => {
      expect(conservationError(s)).toBeLessThan(1e-9);
      if (s.haul.slots[2].full) spilled = true;
    });
    expect(spilled).toBe(true);
  }, 60_000);

  it('piles stay under cap (except the post-seam drain), the hold under F, nothing negative', () => {
    const g = shaped(cfg, 4, { slots: [0, 1, 2, 3, 4], haulers: [1, 1, 2, 0, 5], rig: [10, 4, 1, 20, 1], autopilot: true, policy: 'contract' });
    run(cfg, g, 1800, 1, (s) => {
      const p = H.haulParams(cfg, s);
      expect(H.holdTotal(s.haul)).toBeLessThanOrEqual(p.F + 1e-9);
      s.haul.slots.forEach((sl, i) => {
        expect(sl.pile).toBeGreaterThanOrEqual(0);
        expect(sl.life).toBeGreaterThanOrEqual(0);
        if (sl.claimed) expect(sl.pile).toBeLessThanOrEqual(Math.max(p.slots[i].cap, p.slots[i].cap * cfg.haul.seam.pileCap) + 1e-6);
      });
    });
  }, 60_000);

  it('no NaN with values near 1e300 or with dt of 0, negative, NaN or Infinity', () => {
    const g = shaped(cfg, 5, { slots: [0, 1], haulers: [2, 2], rig: [400, 400], capLevel: 600, freighter: 900, autopilot: true });
    const big = { ...g, cash: 1e300, lifetimeEarnings: 1e300, runEarnings: 1e300 };
    for (const dt of [0, -1, NaN, Infinity, -Infinity]) expect(H.advanceHaul(cfg, big, dt, NOW)).toBe(big);
    const after = run(cfg, big, 60, 1);
    const check = (x: unknown): void => {
      if (typeof x === 'number') expect(Number.isNaN(x)).toBe(false);
      else if (x && typeof x === 'object') Object.values(x).forEach(check);
    };
    check(after);
    expect(after.cash).toBeLessThanOrEqual(Number.MAX_VALUE);
  }, 60_000);

  it('"full" means Σ hold ≥ F − 1e-9', () => {
    const g = shaped(cfg, 6, { slots: [0], autopilot: true });
    const p = H.haulParams(cfg, g);
    const almost = { ...g, haul: { ...g.haul, hold: { iron: p.F - 1e-10 } } };
    expect(H.autopilotWants(p, almost.haul)).toBe(true);
    const short = { ...g, haul: { ...g.haul, hold: { iron: p.F - 1e-6 } } };
    expect(H.autopilotWants(p, short.haul)).toBe(false);
  }, 60_000);
});

describe('4. rock stream', () => {
  it('rockAt does not depend on player actions', () => {
    const a = playFor(cfg, freshHaulGame(cfg, 11), 900);
    // Replaying the stream from the seed gives the rocks the game drilled.
    a.haul.slots.forEach((s, i) => {
      if (!s.claimed || s.rockN < 0 || s.respawnAt !== null) return;
      const r = H.rockAt(cfg, a.haul.seed, i, s.rockN, null, a.starMap);
      expect(s.ore).toBe(r.ore);
      expect(s.bonanza).toBe(r.bonanza);
    });
    expect(H.rockAt(cfg, 5, 3, 7, null, undefined)).toEqual(H.rockAt(cfg, 5, 3, 7, null, undefined));
  }, 60_000);

  it('a rock crumbles exactly when life and pile are 0, respawns after 6 s, drones stay', () => {
    const g = shaped(cfg, 12, { slots: [0], haulers: [3] });
    const g2 = { ...g, haul: { ...g.haul, slots: g.haul.slots.map((s, i) => (i === 0 ? { ...s, life: 2, pile: 0 } : s)) } };
    let crumbledAt = -1;
    let arrivedAt = -1;
    run(noContracts, g2, 20, 0.1, (s, ev) => {
      for (const e of ev) {
        if (e.type === 'depleted') {
          crumbledAt = s.haul.clock;
          expect(s.haul.slots[0].life).toBe(0);
          expect(s.haul.slots[0].pile).toBe(0);
          expect(s.haul.slots[0].haulers).toBe(3);
        }
        if (e.type === 'arrive') arrivedAt = s.haul.clock;
      }
      // Launch by hand so the hold never blocks the drones.
      if (H.canLaunch(s) && H.holdTotal(s.haul) >= 6) Object.assign(s, H.launch(cfg, s));
    });
    expect(crumbledAt).toBeGreaterThan(0);
    expect(arrivedAt - crumbledAt).toBeCloseTo(6, 6);
  }, 60_000);

  it('the bonanza share over 100,000 rocks matches its formula within 0.5 points', () => {
    for (const prospect of [0, 10]) {
      const starMap = { levels: { prospect }, spent: 0 };
      const chance = H.bonanzaChance(cfg, starMap);
      expect(chance).toBeCloseTo(1 - 0.96 * Math.pow(0.94, prospect), 12);
      let n = 0;
      for (let k = 0; k < 100_000; k++) if (H.rockAt(cfg, 77, k % 12, Math.floor(k / 12), null, starMap).bonanza) n++;
      expect(Math.abs(n / 100_000 - chance)).toBeLessThan(0.005);
    }
  }, 60_000);

  it('a bonanza rock drills x2 and lives x1.5; Deep Bore multiplies life on arrival', () => {
    const g = shaped(cfg, 3, { slots: [0], rig: [10] });
    let seedFound = -1;
    for (let n = 0; n < 2000 && seedFound < 0; n++) if (H.rockAt(cfg, g.haul.seed, 0, n, null, undefined).bonanza) seedFound = n;
    const r = H.rockAt(cfg, g.haul.seed, 0, seedFound, null, undefined);
    expect(r.life).toBeGreaterThanOrEqual(150 * 1.5);
    expect(r.life).toBeLessThanOrEqual(240 * 1.5);
    const s = H.placeRock(cfg, g.haul, 0, g.haul.slots[0], seedFound, g.starMap);
    expect(s.life).toBeCloseTo(r.life * 1.5, 9);
    const p = H.haulParams(cfg, { ...g, haul: { ...g.haul, slots: g.haul.slots.map((x, i) => (i === 0 ? s : x)) } });
    expect(p.slots[0].rb).toBeCloseTo(p.slots[0].rb0 * 2, 12);
  }, 60_000);
});

describe('5. contracts', () => {
  it('always meetable from claimed rings; units and multipliers in range', () => {
    for (let k = 1; k < 3000; k++) {
      const rings = [[0], [0, 1], [0, 1, 2], [0, 2, 4], [0, 1, 2, 3, 4]][k % 5];
      const F = 12 + (k % 200);
      const c = H.contractAt(cfg, 1234, k, rings, F, k % 3 === 0 ? 'frost' : null);
      for (const w of c.wants) expect(rings.some((r) => (H.ringWeights(cfg, r, k % 3 === 0 ? 'frost' : null).weights[H.ringWeights(cfg, r, null).ores.indexOf(w.ore)] ?? 0) > 0)).toBe(true);
      const total = c.wants.reduce((a, w) => a + w.units, 0);
      // No station given: λ × F in all, λ in the reach range (section 2.6).
      expect(total).toBeGreaterThanOrEqual(Math.max(c.wants.length, Math.round(F * cfg.haul.contracts.reach[0]) - 1));
      expect(total).toBeLessThanOrEqual(Math.round(F * cfg.haul.contracts.reach[1]) + 1);
      expect(c.wants.length === 1 || c.wants[0].ore !== c.wants[1].ore).toBe(true);
      expect(c.mult).toBeGreaterThanOrEqual(1.5 - 1e-9);
      expect(c.mult).toBeLessThanOrEqual(3.1 + 1e-9);
      expect(Math.round(c.mult * 10) / 10).toBeCloseTo(c.mult, 12);
      expect(c.launchesLeft).toBe(6);
    }
    expect(H.contractAt(cfg, 1, 0, [0], 7, null).wants[0].units).toBe(7); // min(10, F)
    expect(H.contractAt(cfg, 1, 0, [0], 400, null).wants[0].units).toBe(10);
  }, 60_000);

  it('the met rule, M′ on contract units only, the fee on the rest, the full bonus only at F', () => {
    const g = shaped(cfg, 2, { slots: [0, 2], freighter: 3 });
    const g24 = { ...g, entitlements: g.entitlements };
    const p = { ...H.haulParams(cfg, g24), F: 24 }; // a hold of 24 for round numbers
    const c: H.Contract = { k: 9, buyer: 'corvo', wants: [{ ore: 'copper', units: 5 }, { ore: 'iron', units: 4 }], mult: 2.2, launchesLeft: 3 };
    expect(H.contractMet({ copper: 5, iron: 3 }, c)).toBe(false);
    expect(H.contractMet({ copper: 5, iron: 4 }, c)).toBe(true);
    // Met, not full: copper 6 (5 counted), iron 4.
    const met = H.payoutFor(p, { copper: 6, iron: 4 }, c, 0);
    expect(met.met).toBe(true);
    expect(met.payout).toBeCloseTo(5 * 5 * 2.2 + 4 * 1 * 2.2 + 1 * 5 * 1.1, 9);
    // Unmet: plain prices.
    expect(H.payoutFor(p, { copper: 4, iron: 4 }, c, 0).payout).toBeCloseTo(4 * 5 + 4, 9);
    // Full (24 units): x1.1.
    expect(H.payoutFor(p, { iron: 24 }, null, 0).payout).toBeCloseTo(24 * 1.1, 9);
    expect(H.payoutFor(p, { iron: 24 - 1e-6 }, null, 0).payout).toBeCloseTo((24 - 1e-6), 9);
    // Keeper: +X % on the whole cargo.
    expect(H.payoutFor(p, { iron: 10 }, null, 0.2).payout).toBeCloseTo(12, 9);
  }, 60_000);

  it('loading takes the wanted ores first, then the rest by price', () => {
    const g = shaped(cfg, 2, { slots: [0] });
    const p = H.haulParams(cfg, g); // F = 12
    const c: H.Contract = { k: 3, buyer: 'kade', wants: [{ ore: 'iron', units: 5 }], mult: 1.6, launchesLeft: 6 };
    const { cargo, hold } = H.loadCargo(cfg, p, { iron: 9, copper: 4, ice: 2 }, c);
    expect(cargo).toEqual({ iron: 6, ice: 2, copper: 4 });
    expect(hold).toEqual({ iron: 3 });
  }, 60_000);

  it('contractGain equals the difference of two payouts (errata 26: hold plus the missing units)', () => {
    const g = shaped(cfg, 2, { slots: [0, 2] });
    const h: H.HaulState = { ...g.haul, hold: { iron: 7, copper: 3 }, contracts: { unlocked: true, active: null, next: 3, board: [{ k: 1, buyer: 'corvo', wants: [{ ore: 'copper', units: 5 }], mult: 1.9, launchesLeft: 6 }] } };
    const p = H.haulParams(cfg, { ...g, haul: h });
    const c = h.contracts.board[0];
    // cargo' = the loading rule on the hold plus the 2 missing copper (the total stays under F = 12).
    const { cargo } = H.loadCargo(cfg, p, { iron: 7, copper: 5 }, c);
    const gain = H.contractGain(cfg, p, h, 0);
    expect(gain).toBeCloseTo(H.payoutFor(p, cargo, c, 0, true).payout - H.payoutFor(p, cargo, null, 0).payout, 12);
    expect(gain).toBeGreaterThan(0);
    expect(H.contractMissing(h, 0)).toEqual([{ ore: 'copper', units: 2 }]);
  }, 60_000);

  it('unlock at the first warp-out with 4 launches and 90 s; lifetimes count every warp-out; lapses; pods every 4th met', () => {
    let g = shaped(cfg, 8, { slots: [0, 1], haulers: [2, 2] });
    let unlockedAt = -1;
    const lapsed: H.Contract[] = [];
    let launches = 0;
    let warps = 0;
    g = run(cfg, g, 400, 0.5, (s, ev) => {
      for (const e of ev) {
        if (e.type === 'contractsUnlocked') unlockedAt = s.haul.clock;
        if (e.type === 'contractLapsed') lapsed.push(e.contract);
        if (e.type === 'warp') warps++;
      }
      if (H.canLaunch(s) && H.holdTotal(s.haul) >= H.haulParams(cfg, s).F - 1e-9) {
        Object.assign(s, H.launch(cfg, s));
        launches++;
      }
      if (unlockedAt > 0 && s.haul.contracts.active !== null && s.haul.contracts.board[s.haul.contracts.active].k === 0) {
        // Never meet anything after contract 0: keep the pick on a contract the slot 0/1 iron cannot meet.
      }
    });
    expect(unlockedAt).toBeGreaterThanOrEqual(90);
    expect(launches).toBeGreaterThanOrEqual(4);
    expect(warps).toBeGreaterThan(6);
    // Every lapsed contract had all its launches used.
    for (const c of lapsed) expect(c.launchesLeft).toBe(0);
  }, 60_000);

  it('a lapsed active contract leaves active = null; a met one is replaced and the player picks again', () => {
    const g = shaped(cfg, 9, { slots: [0], haulers: [0] });
    const board: H.Contract[] = [
      { k: 1, buyer: 'corvo', wants: [{ ore: 'copper', units: 5 }], mult: 1.9, launchesLeft: 1 },
      { k: 2, buyer: 'kade', wants: [{ ore: 'iron', units: 3 }], mult: 1.6, launchesLeft: 4 },
      { k: 3, buyer: 'oriel', wants: [{ ore: 'iron', units: 3 }], mult: 1.6, launchesLeft: 4 },
    ];
    const base = { ...g, haul: { ...g.haul, hold: { iron: 5 }, contracts: { unlocked: true, board, next: 4, active: 0 as number | null } } };
    const ev: H.HaulEvent[] = [];
    let s = H.launch(cfg, base, ev) as Run;
    s = run(cfg, s, 3, 0.5, (_, e) => ev.push(...e));
    expect(ev.some((e) => e.type === 'contractLapsed' && e.wasActive)).toBe(true);
    expect(s.haul.contracts.active).toBeNull();
    expect(s.haul.contracts.board[0].k).toBe(4);
    expect(s.haul.contracts.board[1].launchesLeft).toBe(3);
    // Now meet contract index 1.
    s = run(cfg, H.pickContract(cfg, s, 1) as Run, 11, 0.5);
    s = { ...s, haul: { ...s.haul, hold: { iron: 4 } } };
    const ev2: H.HaulEvent[] = [];
    s = H.launch(cfg, s, ev2) as Run;
    s = run(cfg, s, 3, 0.5, (_, e) => ev2.push(...e));
    expect(ev2.some((e) => e.type === 'contractMet')).toBe(true);
    expect(s.haul.contracts.active).toBeNull();
    expect(s.haul.contracts.board[1].k).toBe(5);
    expect(s.stats.contractsMet).toBe(1);
  }, 60_000);

  it('a Scrap Pod at every 4th lifetime contract met', () => {
    const g = shaped(cfg, 9, { slots: [0] });
    let s: Run = { ...g, stats: { ...g.stats, contractsMet: 3 } };
    const board: H.Contract[] = [{ k: 1, buyer: 'corvo', wants: [{ ore: 'iron', units: 2 }], mult: 1.6, launchesLeft: 6 }];
    s = { ...s, haul: { ...s.haul, hold: { iron: 3 }, contracts: { unlocked: true, board, next: 2, active: 0 } } };
    s = run(cfg, H.launch(cfg, s) as Run, 3, 0.5);
    expect(s.stats.contractsMet).toBe(4);
    expect(s.chests.owned.scrap).toBe(1);
  }, 60_000);
});

describe('autopilot policies', () => {
  it('full ships only full holds; contract ships when the active contract is met', () => {
    const g = shaped(noContracts, 13, { slots: [0, 1], haulers: [2, 2], autopilot: true, policy: 'full' });
    const fills: number[] = [];
    run(noContracts, g, 300, 0.5, (_, ev) => ev.forEach((e) => e.type === 'launch' && fills.push(H.sumUnits(e.cargo))));
    expect(fills.length).toBeGreaterThan(5);
    for (const f of fills) expect(f).toBeCloseTo(12, 6);
    // contract: met at 3 iron, launches long before full.
    const board: H.Contract[] = [{ k: 1, buyer: 'kade', wants: [{ ore: 'iron', units: 3 }], mult: 1.6, launchesLeft: 99 }];
    const c = { ...g, haul: { ...g.haul, autopilot: { online: true, policy: 'contract' as const }, contracts: { unlocked: true, board, next: 2, active: 0 } } };
    const fills2: number[] = [];
    run(noContracts, c, 30, 0.1, (_, ev) => ev.forEach((e) => e.type === 'launch' && fills2.push(H.sumUnits(e.cargo))));
    expect(fills2[0]).toBeGreaterThanOrEqual(3 - 1e-9);
    expect(fills2[0]).toBeLessThan(4);
    // With no active contract, `contract` acts like `full`.
    const none = { ...c, haul: { ...c.haul, contracts: { ...c.haul.contracts, active: null } } };
    const fills3: number[] = [];
    run(noContracts, none, 60, 0.5, (_, ev) => ev.forEach((e) => e.type === 'launch' && fills3.push(H.sumUnits(e.cargo))));
    for (const f of fills3) expect(f).toBeCloseTo(12, 6);
  }, 60_000);

  it('without the autopilot a full hold stops delivery', () => {
    const g = shaped(noContracts, 14, { slots: [0], haulers: [3] });
    const s = run(noContracts, g, 120, 1);
    expect(H.holdTotal(s.haul)).toBeCloseTo(12, 9);
    expect(s.haul.freighter.phase).toBe('docked');
    expect(s.lifetimeEarnings).toBe(0);
    expect(s.haul.marks.holdFullSince).not.toBeNull();
  }, 60_000);
});

describe('8. hold sharing', () => {
  it('with the hold nearly full, the free space splits in proportion to demand', () => {
    const g = shaped(noContracts, 15, { slots: [0, 1], haulers: [1, 3], rig: [20, 20] });
    const h = { ...g.haul, hold: { iron: 12 - 0.4 }, slots: g.haul.slots.map((s) => ({ ...s, pile: s.claimed ? 14 : 0, routeFrom: 0 })) };
    const before = { ...g, haul: h };
    const after = H.advanceHaul(noContracts, before, 0.25, NOW) as Run;
    const d0 = after.haul.slots[0].delivered;
    const d1 = after.haul.slots[1].delivered;
    expect(d0 + d1).toBeCloseTo(0.4, 9);
    expect(d1 / d0).toBeCloseTo(3, 9);
  }, 60_000);
});

describe('9. rich seams and the flare', () => {
  it('the first seam at 360 × T(interval); intervals in range; only on claimed slots with a rock', () => {
    for (const trait of [null, 'storms']) {
      const c = haulTestConfig({ contracts: { ...cfg.haul.contracts, unlockLaunches: 1e9 } });
      const g0 = shaped(c, 16, { slots: [0, 1, 2], haulers: [1, 1, 1], autopilot: true });
      const g = { ...g0, haul: { ...g0.haul, trait, vein: { ...g0.haul.vein, nextAt: 360 * H.T(c, trait, 'interval') } } };
      const starts: number[] = [];
      const ends: number[] = [];
      run(c, g, 2400, 1, (s, ev) =>
        ev.forEach((e) => {
          if (e.type === 'vein' && !e.flare) {
            starts.push(s.haul.clock);
            expect(s.haul.slots[e.slot].claimed).toBe(true);
            expect(s.haul.slots[e.slot].respawnAt).toBeNull();
          }
          if (e.type === 'veinEnd' && !e.flare) ends.push(s.haul.clock);
        }),
      );
      const f = H.T(c, trait, 'interval');
      expect(starts[0]).toBeGreaterThanOrEqual(360 * f - 1e-6);
      expect(starts[0]).toBeLessThan(360 * f + 1);
      for (let i = 1; i < starts.length; i++) {
        const gap = starts[i] - ends[i - 1];
        expect(gap).toBeGreaterThanOrEqual(90 * f - 1);
        expect(gap).toBeLessThanOrEqual(150 * f + 1);
        expect(ends[i - 1] - starts[i - 1]).toBeCloseTo(40, 0);
      }
      expect(starts.length).toBeGreaterThan(trait ? 12 : 8);
    }
    // createHaul applies T(interval) to the first seam.
    const fresh = H.createHaul(cfg, 1, 1, 'storms', { levels: {}, spent: 0 }, { bestClaimed: 1 }, { products: [] });
    expect(fresh.vein.nextAt).toBe(180);
  }, 60_000);

  it('a seam drills x3 with pile cap x2; drones dragged onto it return when it ends', () => {
    const g = shaped(noContracts, 17, { slots: [0, 1, 2], haulers: [3, 2, 1], autopilot: true });
    const start = { ...g, haul: { ...g.haul, vein: { ...g.haul.vein, nextAt: 0 } } };
    let s = H.advanceHaul(noContracts, start, 0.1, NOW) as Run;
    const slot = s.haul.vein.slot!;
    expect(slot).not.toBeNull();
    const p = H.haulParams(noContracts, s);
    expect(p.slots[slot].r).toBeCloseTo(p.slots[slot].rb * 3, 12);
    const from = [0, 1, 2].find((i) => i !== slot && s.haul.slots[i].haulers > 0)!;
    const nFrom = s.haul.slots[from].haulers;
    const nSeam = s.haul.slots[slot].haulers;
    s = H.moveDrone(noContracts, s, from, slot) as Run;
    s = H.recallDrone(noContracts, s, from) as Run;
    s = H.assignDrone(noContracts, s, slot) as Run; // from the rack
    expect(s.haul.vein.guests).toEqual([from, -1]);
    expect(s.stats.seamDrags).toBe(2);
    s = run(noContracts, s, 45, 0.5);
    expect(s.haul.vein.slot).toBeNull();
    expect(s.haul.slots[slot].haulers).toBe(nSeam);
    expect(s.haul.slots[from].haulers).toBe(nFrom - 1); // one moved, one recalled, the guest came back
    expect(s.haul.idle).toBe(1);
  }, 60_000);

  it('a flare starts a seam now, not on a seam rock, and does not move the natural schedule', () => {
    const g = shaped(noContracts, 18, { slots: [0, 1], haulers: [1, 1], autopilot: true });
    const charged = { ...g, haul: { ...g.haul, flare: { ...g.haul.flare, charges: 1 } } };
    const nextAt = charged.haul.vein.nextAt;
    const ev: H.HaulEvent[] = [];
    const f = H.useFlare(noContracts, charged, 1, ev) as Run;
    expect(ev).toContainEqual({ type: 'vein', slot: 1, flare: true });
    expect(f.haul.flare.charges).toBe(0);
    expect(f.haul.vein.nextAt).toBe(nextAt);
    expect(H.haulParams(noContracts, f).slots[1].seam).toBe(true);
    expect(H.useFlare(noContracts, { ...f, haul: { ...f.haul, flare: { ...f.haul.flare, charges: 1 } } }, 1)).not.toBe(f); // a second charge...
    expect(H.canFlare({ ...f, haul: { ...f.haul, flare: { ...f.haul.flare, charges: 1 } } }, 1)).toBe(false); // ...but not on a seam rock
    const later = run(noContracts, f, 45, 0.5);
    expect(later.haul.flare.slot).toBeNull();
  }, 60_000);

  it('the free flare charge: first at 10:00 of play, one per 30 min, stored 1; ad charges 3 a day, 20 min apart', () => {
    const c = haulTestConfig({ contracts: { ...cfg.haul.contracts, unlockLaunches: 1e9 }, seam: { ...cfg.haul.seam, first: 1e12 } });
    const g = shaped(c, 19, { slots: [0], haulers: [1], autopilot: true });
    let s = run(c, g, 599, 1);
    expect(s.haul.flare.charges).toBe(0);
    s = run(c, s, 2, 1);
    expect(s.haul.flare.charges).toBe(1);
    s = run(c, s, 3600, 10);
    expect(s.haul.flare.charges).toBe(1);
    const day = '2026-11-22';
    let a = H.grantAdFlare(c, s, day, NOW) as Run;
    expect(a.haul.flare.charges).toBe(2);
    expect(H.grantAdFlare(c, a, day, NOW + 60_000)).toBe(a);
    a = H.grantAdFlare(c, a, day, NOW + 20 * 60_000) as Run;
    a = H.grantAdFlare(c, a, day, NOW + 40 * 60_000) as Run;
    expect(a.haul.flare.charges).toBe(4);
    expect(H.canAdFlare(c, a, day, NOW + 80 * 60_000)).toBe(false);
    // Errata 33: charges never exceed 4, so even a new day's ad waits until a charge is used.
    expect(H.canAdFlare(c, a, '2026-11-23', NOW + 80 * 60_000)).toBe(false);
    expect(H.grantAdFlare(c, a, '2026-11-23', NOW + 80 * 60_000)).toBe(a);
    const used = H.useFlare(c, a, 0) as Run;
    expect(used.haul.flare.charges).toBe(3);
    expect(H.canAdFlare(c, used, '2026-11-23', NOW + 80 * 60_000)).toBe(true);
  }, 60_000);
});

describe('player actions', () => {
  it('assign, move and recall keep the drone count; warm-up only for an empty route', () => {
    let g = shaped(cfg, 20, { slots: [0, 1], haulers: [2, 0], idle: 2 });
    g = run(cfg, g, 10);
    const t = g.haul.clock;
    const s1 = H.assignDrone(cfg, g, 1) as Run;
    expect(s1.haul.slots[1].routeFrom).toBeCloseTo(t + 2 + 0.6, 9);
    const s2 = H.assignDrone(cfg, run(cfg, s1, 5), 1) as Run;
    expect(s2.haul.slots[1].routeFrom).toBeCloseTo(t + 2.6, 9); // not reset
    const s3 = H.moveDrone(cfg, s2, 0, 1) as Run;
    const s4 = H.recallDrone(cfg, s3, 1) as Run;
    const count = (x: Run) => x.haul.idle + x.haul.slots.reduce((a, s) => a + s.haulers, 0);
    for (const x of [s1, s2, s3, s4]) expect(count(x)).toBe(4);
    expect(H.assignDrone(cfg, { ...s4, haul: { ...s4.haul, idle: 0 } }, 1).haul!.idle).toBe(0);
    expect(H.moveDrone(cfg, s4, 5, 0)).toBe(s4); // unclaimed source
    expect(H.assignDrone(cfg, s4, 7)).toBe(s4); // unclaimed target
  }, 60_000);

  it('claims: the rock drifts in after 1.5 s; the first ring-2 claim gives one Scrap Pod per game', () => {
    let g = shaped(cfg, 21, { slots: [0] });
    g = { ...g, cash: 1e6 };
    const ev: H.HaulEvent[] = [];
    let s = H.claimSlot(cfg, g, 2, ev) as Run;
    expect(ev.some((e) => e.type === 'podEarned' && e.reason === 'ring2')).toBe(true);
    expect(s.chests.owned.scrap).toBe(1);
    expect(s.haul.slots[2].respawnAt).toBeCloseTo(s.haul.clock + 1.5, 9);
    s = H.claimSlot(cfg, s, 3) as Run;
    expect(s.chests.owned.scrap).toBe(1);
    expect(s.stats.claims).toBe(2);
    expect(s.haulStats.bestClaimed).toBe(3);
    const arrived: H.HaulEvent[] = [];
    s = run(cfg, s, 2, 0.5, (_, e) => arrived.push(...e));
    expect(arrived.filter((e) => e.type === 'arrive').length).toBe(2);
    expect(s.haul.slots[2].rockN).toBe(0);
    expect(s.haul.slots[2].ore).toBe(H.rockAt(cfg, s.haul.seed, 2, 0, null, s.starMap).ore);
  }, 60_000);

  it('refused actions return the same object', () => {
    const g = shaped(cfg, 22, { slots: [0] });
    expect(H.buyDrone(cfg, g)).toBe(g);
    expect(H.upgradeRig(cfg, g, 0)).toBe(g);
    expect(H.launch(cfg, g)).toBe(g);
    expect(H.pickContract(cfg, g, 0)).toBe(g);
    const rich = { ...g, cash: 1e9, haul: { ...g.haul, fleet: { ...g.haul.fleet, drones: 24 } } };
    expect(H.buyDrone(cfg, rich)).toBe(rich); // at the cap
    const bought = H.buyAutopilot(cfg, rich) as Run;
    expect(bought.haul.autopilot.online).toBe(true);
    expect(H.buyAutopilot(cfg, bought)).toBe(bought);
  }, 60_000);
});

describe('13. first session', () => {
  it('the scripted player reaches its first payout by 0:35 and the autopilot by 3:30', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      let g = freshHaulGame(cfg, seed);
      let firstPay = -1;
      let autopilot = -1;
      for (let t = 0; t < 240 && autopilot < 0; t++) {
        g = playerStep(cfg, g);
        const ev: H.HaulEvent[] = [];
        g = H.advanceHaul(cfg, g, 1, NOW, ev) as Run;
        if (firstPay < 0 && ev.some((e) => e.type === 'warp')) firstPay = g.haul.clock;
        if (g.haul.autopilot.online) autopilot = g.haul.clock;
      }
      expect(firstPay).toBeGreaterThan(0);
      expect(firstPay).toBeLessThanOrEqual(35);
      expect(autopilot).toBeGreaterThan(0);
      expect(autopilot).toBeLessThanOrEqual(210);
    }
  }, 60_000);
});

describe('hints (section 3)', () => {
  it('the six guided steps follow the state', () => {
    let g = freshHaulGame(cfg, 30);
    expect(H.nextHint(cfg, g)).toMatchObject({ kind: 'drag', from: 'drone:rack', to: 'rock:0', step: 1 });
    g = H.assignDrone(cfg, g, 0) as Run;
    g = run(cfg, g, 20, 0.5);
    expect(H.nextHint(cfg, g)).toMatchObject({ kind: 'swipe', zone: 'bay:launch', step: 2 });
    g = run(cfg, H.launch(cfg, g) as Run, 3, 0.5);
    expect(H.nextHint(cfg, g)).toMatchObject({ kind: 'point', key: 'station:buyDrone', route: ['station'], step: 3 });
    g = H.buyDrone(cfg, g) as Run;
    expect(H.nextHint(cfg, g)).toMatchObject({ kind: 'tapTap', from: 'drone:rack', to: 'rock:0', step: 4 });
    g = H.assignDrone(cfg, g, 0) as Run;
    g = { ...g, cash: 25 };
    expect(H.nextHint(cfg, g)).toMatchObject({ kind: 'point', key: 'slot:1', step: 5 });
    g = run(cfg, H.claimSlot(cfg, g, 1) as Run, 2, 0.5);
    expect(H.hintsFor(cfg, g).find((h) => h.step === 6)).toMatchObject({ kind: 'drag', from: 'chip:0', to: 'rock:1' });
    const ev: H.HaulEvent[] = [];
    g = H.moveDrone(cfg, g, 0, 1, ev) as Run;
    expect(ev).toContainEqual({ type: 'tutorialDone' });
    expect(H.hintsFor(cfg, g).some((h) => h.step > 0)).toBe(false);
  }, 60_000);

  it('after the tutorial: idle drone 10 s, seams, hold full 4 s, no contract 30 s (at most 3 per run)', () => {
    let g = shaped(cfg, 31, { slots: [0, 1], haulers: [1, 1], idle: 1 });
    g = { ...g, haul: { ...g.haul, flags: { tutorialDone: true }, marks: { ...g.haul.marks, idleSince: null } } };
    g = run(noContracts, g, 9);
    expect(H.hintsFor(cfg, g).some((h) => h.from === 'drone:rack')).toBe(false);
    g = run(noContracts, g, 2);
    expect(H.hintsFor(cfg, g).some((h) => h.kind === 'drag' && h.from === 'drone:rack')).toBe(true);
    const seam = { ...g, haul: { ...g.haul, vein: { ...g.haul.vein, slot: 1, until: g.haul.clock + 30 } } };
    expect(H.nextHint(cfg, seam)).toMatchObject({ kind: 'drag', from: 'chip:0', to: 'rock:1' });
    const noC: Run = { ...g, haul: { ...g.haul, contracts: { unlocked: true, board: [], next: 0, active: null }, marks: { ...g.haul.marks, noContractSince: g.haul.clock - 31 } } };
    expect(H.hintsFor(cfg, noC).some((h) => h.key === 'bay:counter')).toBe(true);
    let shown: Run = noC;
    for (let i = 0; i < 3; i++) shown = H.markHintShown(shown, 'bay:counter') as Run;
    expect(H.hintsFor(cfg, shown).some((h) => h.key === 'bay:counter')).toBe(false);
  }, 60_000);
});
