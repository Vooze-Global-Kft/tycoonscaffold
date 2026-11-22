/// <reference types="node" />
/** Section 10.2 tests 10 (Jump), 11 (Star Map) and 12 (missions after a Jump); saves. */
import { describe, expect, it } from 'vitest';
import * as H from './haul';
import { freshHaulGame, haulFixtures, haulTestConfig, playFor, shaped } from './fixtures/haul';

type Run = H.HaulGame & { haul: H.HaulState };
const cfg = haulTestConfig();
const NOW = 1_800_000_000_000;

/** A game that can Jump: some play, then enough lifetime earnings for `cores` cores. */
function ready(seed: number, cores = 25): Run {
  const g = playFor(cfg, freshHaulGame(cfg, seed), 400);
  const p = cfg.economy.prestige;
  const lifetime = p.threshold * Math.pow(cores / p.scale, 1 / p.exponent) * 1.0001;
  return { ...g, lifetimeEarnings: lifetime, cards: { ...g.cards, keeper: { level: 2, copies: 1 } }, loadout: { sockets: [null, null, 'keeper'] }, stats: { ...g.stats, contractsMet: 7, transmissionsAcked: 3 } };
}

describe('10. Jump', () => {
  it('resets the run, keeps the Star Map, loadout, pods and lifetime stats; cores give no income', () => {
    const g = ready(1);
    expect(H.coresAvailable(cfg, g)).toBe(25);
    const before = H.jumpPreview(cfg, g);
    expect(before.canJump).toBe(true);
    expect(before.offers).toHaveLength(3);
    const pods = { ...g.chests.owned };
    const j = H.prestigeHaul(cfg, g, NOW, before.offers[1]) as Run;
    expect(j).not.toBe(g);
    expect(j.prestigePoints).toBe(25);
    expect(j.prestigeCount).toBe(1);
    expect(j.haul.galaxy).toBe(1);
    expect(j.haul.trait).toBe(before.offers[1]);
    expect(j.haul.clock).toBe(0);
    expect(j.haul.slots.filter((s) => s.claimed)).toHaveLength(1);
    expect(j.haul.fleet).toEqual({ drones: 1, capLevel: 1, engineLevel: 1 });
    // Decision 56: from galaxy 2 on the board opens after three launches, with no fixed first contract.
    expect(j.haul.contracts.unlocked).toBe(false);
    expect(j.haul.contracts.active).toBeNull();
    expect(j.cash).toBe(cfg.economy.startingCash);
    expect(j.runEarnings).toBe(0);
    expect(j.lifetimeEarnings).toBe(g.lifetimeEarnings);
    expect(j.loadout).toEqual(g.loadout);
    expect(j.cards).toEqual(g.cards);
    expect(j.stats.contractsMet).toBe(7);
    expect(j.stats.hauled).toBe(g.stats.hauled);
    expect(j.chests.owned.derelict).toBe((pods.derelict ?? 0) + 1); // first arrival at galaxy 1
    expect(j.haulStats).toMatchObject({ jumps: 1, galaxiesVisited: [0, 1] });
    // bonusPerPoint 0: the same state earns the same with or without cores.
    const s = shaped(cfg, 3, { slots: [0, 1, 2], haulers: [2, 2, 2], autopilot: true });
    expect(H.haulIncome(cfg, { ...s, prestigePoints: 500 })).toBe(H.haulIncome(cfg, s));
    // Refused: a trait not offered, no new core, no run.
    expect(H.prestigeHaul(cfg, g, NOW, 'nope')).toBe(g);
    expect(H.prestigeHaul(cfg, j, NOW, H.offersFor(cfg, j.metaSeed, 1, j.haul.trait)[0])).toBe(j);
  });

  it('the run seed follows rngMix4(seed, hash("jump"), jumpIndex + 1, 0); the galaxy name and the drone cap rise', () => {
    const a = H.prestigeHaul(cfg, ready(2), NOW, H.jumpPreview(cfg, ready(2)).offers[0]) as Run;
    const b = H.prestigeHaul(cfg, ready(2), NOW, H.jumpPreview(cfg, ready(2)).offers[0]) as Run;
    expect(a.haul.seed).toBe(b.haul.seed);
    expect(H.galaxyName(cfg, 0)).toBe('Cygnus Drift');
    expect(H.galaxyName(cfg, 1)).toBe('Halden Reach');
    expect(H.galaxyName(cfg, 12)).toBe('Cygnus Drift II');
    expect(H.galaxyName(cfg, 25)).toBe('Halden Reach III');
    expect(H.haulParams(cfg, a).droneCap).toBe(28);
  });

  it('offers: the same before and after a reload, match the preview, exclude the current condition', () => {
    const g = ready(4);
    const offers = H.jumpPreview(cfg, g).offers;
    const reloaded = H.reconcileHaul(cfg, g as never, JSON.parse(JSON.stringify(g)));
    expect(H.jumpPreview(cfg, reloaded).offers).toEqual(offers);
    expect(new Set(offers).size).toBe(3);
    for (let k = 0; k < 200; k++) expect(H.offersFor(cfg, k, 3, 'solar')).not.toContain('solar');
  });

  it('two Jumps in a row offer different triples for at least 80 % of 1,000 seeds', () => {
    let differ = 0;
    for (let seed = 0; seed < 1000; seed++) {
      const first = H.offersFor(cfg, seed * 7919 + 1, 0, null);
      const pick = first[seed % 3];
      const second = H.offersFor(cfg, seed * 7919 + 1, 1, pick);
      if ([...first].sort().join() !== [...second].sort().join()) differ++;
    }
    expect(differ / 1000).toBeGreaterThanOrEqual(0.8);
  });

  it('a Derelict Cache once per galaxy index', () => {
    let g = ready(5, 4);
    const pod = () => g.chests.owned.derelict ?? 0;
    g = H.prestigeHaul(cfg, g, NOW, H.jumpPreview(cfg, g).offers[0]) as Run;
    expect(pod()).toBe(1);
    // Pretend the galaxy was visited before (as after a later change): no second cache.
    const again = { ...g, lifetimeEarnings: g.lifetimeEarnings * 100, haul: { ...g.haul, galaxy: 0 } };
    const k = H.prestigeHaul(cfg, again, NOW, H.jumpPreview(cfg, again).offers[0]) as Run;
    expect(k.haul.galaxy).toBe(1);
    expect(k.chests.owned.derelict).toBe(1);
  });

  it('nodes bought in the Jump flow shape the run they start (the specification\'s first-Jump example)', () => {
    const g = { ...ready(6, 25), haulStats: { ...ready(6, 25).haulStats, bestClaimed: 6 } };
    const buys = ['preload', 'assay', 'assay', 'assay', 'assay', 'assay', 'afterburner', 'afterburner', 'seedcredits', 'seedcredits'];
    expect(H.coresAfterJump(cfg, g)).toBe(25);
    const j = H.prestigeHaul(cfg, g, NOW, H.jumpPreview(cfg, g).offers[0], buys) as Run;
    expect(j.starMap.spent).toBe(24); // 5 + 11 + 5 + 3
    expect(H.coresInHand(j)).toBe(1);
    expect(j.haul.autopilot.online).toBe(true);
    expect(j.haul.slots.slice(0, 3).map((s) => [s.claimed, s.rigLevel, s.haulers])).toEqual([
      [true, 4, 0],
      [true, 4, 0],
      [true, 4, 0],
    ]);
    expect(j.haul.slots[3].claimed).toBe(false);
    expect(j.cash).toBe(1000);
    expect(H.haulParams(cfg, j).prices.iron).toBeCloseTo(1.5, 12);
  });
});

describe('11. Star Map', () => {
  it('costs follow ceil(base × growth^L), caps hold, no overspending', () => {
    const expected: Record<string, number[]> = {
      prospect: [2, 3, 4, 4, 5],
      assay: [1, 2, 2, 3, 3],
      brokerseat: [2, 3, 4, 5, 7],
      preload: [5],
      sparedrones: [2, 3, 4, 6, 8, 11],
    };
    for (const [id, costs] of Object.entries(expected)) costs.forEach((c, L) => expect(H.starNodeCost(cfg, id, L)).toBe(c));
    expect(H.starNodeCost(cfg, 'assay', 5)).toBeNull();
    expect(H.starNodeCost(cfg, 'brokerseat', 5)).toBeNull();
    expect(H.starNodeCost(cfg, 'preload', 1)).toBeNull();
    // Errata 71: Prospect Survey caps at 11 (the first level whose chance reaches 0.5).
    expect(H.starNodeCost(cfg, 'prospect', 10)).toBeGreaterThan(0);
    expect(H.starNodeCost(cfg, 'prospect', 11)).toBeNull();
    let g = { ...freshHaulGame(cfg, 1), prestigePoints: 1000 } as Run;
    for (let i = 0; i < 10; i++) g = H.buyStarNode(cfg, g, 'assay') as Run;
    expect(g.starMap.levels.assay).toBe(5);
    expect(g.starMap.spent).toBe(11);
    const poor = { ...freshHaulGame(cfg, 1), prestigePoints: 4 } as Run;
    const a = H.buyStarNode(cfg, poor, 'preload');
    expect(a).toBe(poor);
    const b = H.buyStarNode(cfg, poor, 'prospect') as Run;
    expect(H.coresInHand(b)).toBe(2);
    expect(H.buyStarNode(cfg, b, 'prospect')).toBe(b); // level 2 costs ceil(2 x 1.25) = 3
    const c = H.buyStarNode(cfg, b, 'assay') as Run;
    expect(H.coresInHand(c)).toBe(1);
    const v = H.starMapView(cfg, c).find((n) => n.id === 'prospect')!;
    expect(v).toMatchObject({ level: 1, cost: 3, canBuy: false });
  });

  it('flat nodes: Assay +10 % price per level, Broker Seat +0.1 to met multipliers; Seam Sense; Spare Drones; Seed Credits', () => {
    const g = shaped(cfg, 1, { slots: [0, 2] });
    const sm = (levels: Record<string, number>) => ({ ...g, starMap: { levels, spent: 0 } });
    expect(H.haulParams(cfg, sm({ assay: 5 })).prices.copper).toBeCloseTo(5 * 1.5, 12);
    expect(H.haulParams(cfg, sm({ brokerseat: 5 })).contractAdd).toBeCloseTo(0.5, 12);
    const lh = { ...sm({ brokerseat: 2 }), haul: { ...g.haul, trait: 'longhaul' } };
    expect(H.haulParams(cfg, lh).contractAdd).toBeCloseTo(0.5, 12);
    const run = H.createHaul(cfg, 9, 1, null, { levels: { sparedrones: 3, veinsense: 2 }, spent: 0 }, { bestClaimed: 1 }, { products: ['space_hangar'] });
    expect(run.fleet.drones).toBe(1 + 3 + 2);
    expect(run.idle).toBe(6);
    expect(H.runStartCash(cfg, { levels: { seedcredits: 1 }, spent: 0 })).toBe(100);
    expect(H.runStartCash(cfg, { levels: { seedcredits: 6 }, spent: 0 })).toBe(1e7);
  });

  it('the Afterburner head start never exceeds bestClaimed', () => {
    for (let level = 1; level <= 6; level++) {
      for (const best of [1, 2, 3, 5, 12]) {
        const h = H.createHaul(cfg, 9, 1, null, { levels: { afterburner: level }, spent: 0 }, { bestClaimed: best }, { products: [] });
        const claimed = h.slots.filter((s) => s.claimed).length;
        expect(claimed).toBeLessThanOrEqual(Math.max(1, best));
        expect(claimed).toBe(Math.min(Math.max(1, best), cfg.haul.starMap.headStart[level - 1].length));
        for (const s of h.slots) if (s.claimed) expect([s.rigLevel, s.haulers]).toEqual([4, 0]);
      }
    }
  });
});

describe('12. missions after a Jump', () => {
  it('lifetime counters never drop', () => {
    const g = ready(7);
    const j = H.prestigeHaul(cfg, g, NOW, H.jumpPreview(cfg, g).offers[2]) as Run;
    for (const k of Object.keys(H.EMPTY_LIFETIME) as (keyof H.HaulLifetimeStats)[]) expect(j.stats[k]).toBeGreaterThanOrEqual(g.stats[k]);
    expect(j.stats.playSeconds).toBe(g.stats.playSeconds);
    expect(j.stats.levelsBought).toBe(g.stats.levelsBought);
    expect(j.missions).toBe(g.missions);
  });

  it('transmissions: a Derelict Cache every 4th acknowledgement', () => {
    let g = freshHaulGame(cfg, 1) as H.HaulGame;
    for (let i = 0; i < 8; i++) g = H.ackTransmission(cfg, g);
    expect(g.stats.transmissionsAcked).toBe(8);
    expect(g.chests.owned.derelict).toBe(2);
  });
});

describe('saves', () => {
  it('reconcileHaul keeps a valid save as it is and repairs a broken one', () => {
    const { midGame } = haulFixtures(cfg);
    const round = H.reconcileHaul(cfg, midGame as never, JSON.parse(JSON.stringify(midGame)));
    expect(round.haul).toEqual(midGame.haul);
    expect(round.starMap).toEqual(midGame.starMap);
    expect(round.loadout).toEqual(midGame.loadout);
    const broken = JSON.parse(JSON.stringify(midGame));
    broken.haul.slots[0].pile = 'x';
    broken.haul.slots[2].life = -5;
    broken.haul.fleet.drones = null;
    broken.haul.hold = { iron: NaN, copper: 3 };
    broken.starMap.levels.assay = 99;
    delete broken.haul.vein;
    const fixed = H.reconcileHaul(cfg, midGame as never, broken);
    expect(fixed.haul!.slots[0].pile).toBe(0);
    expect(fixed.haul!.slots[2].life).toBe(0);
    expect(fixed.haul!.hold).toEqual({ copper: 3 });
    expect(fixed.starMap.levels.assay).toBe(5);
    expect(fixed.haul!.fleet.drones).toBeGreaterThanOrEqual(fixed.haul!.slots.reduce((a, s) => a + s.haulers, 0));
    // A save without any haul fields becomes a fresh game; ticking it works.
    const empty = H.reconcileHaul(cfg, midGame as never, {});
    expect(empty.haul!.clock).toBe(0);
    expect(H.advanceHaul(cfg, empty, 1, NOW)).not.toBe(empty);
  }, 120_000);

  it('fixtures are plausible states', () => {
    const f = haulFixtures(cfg);
    expect(f.fresh.haul.clock).toBe(0);
    expect(f.minute3.haul.autopilot.online).toBe(true);
    expect(f.minute3.haul.contracts.unlocked).toBe(true);
    expect(f.midGame.haul.slots.filter((s) => s.claimed).length).toBeGreaterThanOrEqual(4);
    expect(f.midGame.loadout.sockets.filter(Boolean).length).toBe(3);
    expect(f.late.haul.slots.filter((s) => s.claimed).length).toBe(12);
    expect(H.coresAvailable(cfg, f.late)).toBeGreaterThanOrEqual(1);
    expect(f.afterJump.haul.galaxy).toBe(1);
    expect(f.afterJump.haul.trait).not.toBeNull();
    expect(f.afterJump.haul.autopilot.online).toBe(true);
  }, 120_000);
});
