/// <reference types="node" />
/**
 * Second pass over the haul rules: one test for every ruling of the errata list (sections "Rules"
 * and "Rules, continued", plus 71 and 72) that changes behaviour and is not already pinned by
 * haul.audit.test.ts. Item numbers are the errata's.
 */
import { describe, expect, it } from 'vitest';
import * as H from './haul';
import { conservationError, contractOf, freshHaulGame, haulFixtures, haulTestConfig, run, shaped } from './fixtures/haul';

type Run = H.HaulGame & { haul: H.HaulState };
const cfg = haulTestConfig();
const NOW = 1_800_000_000_000;
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const quiet = haulTestConfig({
  contracts: { ...cfg.haul.contracts, unlockLaunches: 1e9 },
  seam: { ...cfg.haul.seam, first: 1e12 },
  flare: { ...cfg.haul.flare, firstAt: 1e12 },
});

function edit(g: Run, f: (h: H.HaulState, g: Run) => void): Run {
  const c = clone(g);
  f(c.haul, c);
  return c;
}

/** A board with contracts on it (unlocked) for slot 0 iron. */
function withBoard(g: Run, board: H.Contract[], active: number | null): Run {
  return edit(g, (h) => {
    h.contracts = { unlocked: true, board, next: 50, active };
  });
}

describe('12, 13, 14: contract multiplier, payout fixed at launch, order at the warp-out', () => {
  it('12: the condition term A(contractAdd) is 0 without a condition and +0.3 with Long Haul', () => {
    const g = shaped(cfg, 3, { slots: [0] });
    const c = contractOf(1, 'kade', [['iron', 4]], 1.6, 6, true);
    const p = H.haulParams(cfg, g);
    expect(p.contractAdd).toBe(0);
    // 4 iron completing at x1.6, not full: 4 × 1 at the warp-out plus the bonus 4 × 1 × 0.6 = 6.4 in all
    // (Decision 40: the contract's own units are paid at M' over its life; a literal T(x) = 1 would give 10.4).
    const r = H.payoutFor(p, { iron: 4 }, c, 0);
    expect(r.payout + r.bonus).toBeCloseTo(6.4, 12);
    const lh = edit(g, (h) => {
      h.trait = 'longhaul';
    });
    const pl = H.haulParams(cfg, lh);
    expect(pl.contractAdd).toBeCloseTo(0.3, 12);
    const rl = H.payoutFor(pl, { iron: 4 }, c, 0);
    expect(rl.payout + rl.bonus).toBeCloseTo(4 * 1.9, 12);
  });

  it('13: dropping the taken contract during the climb: the flight is paid at plain prices, no bonus; the new pick stays taken (Decision 40)', () => {
    const board: H.Contract[] = [contractOf(1, 'kade', [['iron', 4]], 1.6, 6, true), contractOf(2, 'corvo', [['iron', 2]], 3, 12)];
    let g = withBoard(
      edit(shaped(quiet, 3, { slots: [0] }), (h) => {
        h.hold = { iron: 5 };
        h.counters.drilled += 5;
      }),
      board,
      0,
    );
    g = H.launch(quiet, g) as Run;
    expect(g.haul.freighter.contract).toBe(1);
    expect(g.haul.freighter.met).toBe(true);
    expect(g.haul.freighter.payout).toBeCloseTo(4 + 1 * 1.1, 12);
    expect(g.haul.freighter.bonus).toBeCloseTo(4 * 0.6, 12);
    expect(g.haul.freighter.plain).toBeCloseTo(5, 12);
    g = H.pickContract(quiet, g, 1) as Run;
    const cash = g.cash;
    const ev: H.HaulEvent[] = [];
    g = H.advanceHaul(quiet, g, 3, NOW, ev) as Run;
    expect(g.cash - cash).toBeCloseTo(5, 12);
    expect(ev.some((e) => e.type === 'contractMet')).toBe(false);
    expect(ev.find((e) => e.type === 'warp')).toMatchObject({ met: false, bonus: 0 });
    // The flight was not loaded for the new pick: it neither counts toward it nor uses one of its launches.
    expect(g.haul.contracts.active).toBe(1);
    expect(g.haul.contracts.board[1]).toMatchObject({ k: 2, taken: true, launchesLeft: quiet.haul.contracts.launches });
    expect(g.haul.contracts.board[1].wants[0].got).toBe(0);
  });

  it('14: met on its last launch it is met and replaced, not lapsed; offers lose one and at 0 are replaced silently', () => {
    const board: H.Contract[] = [contractOf(1, 'kade', [['iron', 3]], 1.6, 1, true), contractOf(2, 'corvo', [['copper', 3]], 1.9, 1), contractOf(3, 'oriel', [['copper', 3]], 1.9, 4)];
    let g = withBoard(
      edit(shaped(quiet, 3, { slots: [0] }), (h) => {
        h.hold = { iron: 4 };
        h.counters.drilled += 4;
      }),
      board,
      0,
    );
    g = H.launch(quiet, g) as Run;
    const ev: H.HaulEvent[] = [];
    g = H.advanceHaul(quiet, g, 3, NOW, ev) as Run;
    const types = ev.map((e) => e.type).filter((t) => t.startsWith('contract') || t === 'warp');
    expect(types).toEqual(['warp', 'contractProgress', 'contractMet', 'contractNew', 'contractNew']);
    const b = g.haul.contracts.board;
    expect(b[0]).toMatchObject({ k: 50, taken: false, launchesLeft: quiet.haul.contracts.offerLaunches });
    expect(b[1]).toMatchObject({ k: 51, taken: false, launchesLeft: quiet.haul.contracts.offerLaunches });
    expect(b[2].launchesLeft).toBe(3);
    expect(g.haul.contracts.active).toBeNull();
    expect(g.stats.contractsMet).toBe(1);
  });
});

describe('15, 16: two seam records, guests as a stack', () => {
  it('15: a flare seam and a natural seam run side by side; the natural pick skips the flare slot', () => {
    let g = edit(shaped(quiet, 4, { slots: [0, 2], haulers: [1, 1] }), (h) => {
      h.flare.charges = 1;
      h.vein.nextAt = 1;
    });
    g = H.useFlare(quiet, g, 2) as Run;
    expect(g.haul.flare.slot).toBe(2);
    g = H.advanceHaul(quiet, g, 2, NOW) as Run;
    // Ring 2 weighs 2 against ring 1's 1, but the flare holds slot 2: the natural seam takes slot 0.
    expect(g.haul.vein.slot).toBe(0);
    expect(g.haul.flare.slot).toBe(2);
    const p = H.haulParams(quiet, g);
    expect(p.slots[0].seam && p.slots[2].seam).toBe(true);
    expect(H.canFlare({ ...g, haul: { ...g.haul, flare: { ...g.haul.flare, charges: 1, slot: null } } }, 0)).toBe(false);
  });

  it('16: lent drones: the stack records rack and route origins, departures pop the newest, the end returns newest first', () => {
    let g = edit(shaped(quiet, 4, { slots: [0, 1, 2], haulers: [2, 0, 1], idle: 1 }), (h) => {
      h.vein = { ...h.vein, slot: 2, until: 30, guests: [], peak: 0, nextAt: 1e9 };
    });
    g = H.assignDrone(quiet, g, 2) as Run; // from the rack
    g = H.moveDrone(quiet, g, 0, 2) as Run; // from route 0
    g = H.moveDrone(quiet, g, 0, 2) as Run; // route 0 is now empty
    expect(g.haul.vein.guests).toEqual([-1, 0, 0]);
    expect(g.stats.seamDrags).toBe(3);
    g = H.recallDrone(quiet, g, 2) as Run; // pops the newest (0)
    expect(g.haul.vein.guests).toEqual([-1, 0]);
    expect(g.haul.idle).toBe(1);
    const ev: H.HaulEvent[] = [];
    g = H.advanceHaul(quiet, g, 31, NOW, ev) as Run;
    expect(ev.some((e) => e.type === 'veinEnd' && e.slot === 2 && !e.flare)).toBe(true);
    // Back: one to route 0 (which had none: warm-up again, delivered restarts), one to the rack.
    expect(g.haul.slots[0].haulers).toBe(1);
    expect(g.haul.slots[2].haulers).toBe(1);
    expect(g.haul.idle).toBe(2);
    expect(g.haul.slots[0].haulers + g.haul.slots[2].haulers + g.haul.idle).toBe(g.haul.fleet.drones);
    expect(g.haul.vein.guests).toEqual([]);
  });
});

describe('17: the Jump flow', () => {
  const late = () => haulFixtures(cfg).late;

  it('preview, confirm (cores in, run ends), spend, pick, then the run is built with every node bought', () => {
    const g = late();
    const preview = H.jumpPreview(cfg, g);
    expect(preview.canJump).toBe(true);
    const gain = preview.gain;
    const c = H.confirmJump(cfg, g, NOW) as H.HaulGame;
    expect(c.haul).toBeNull();
    expect(c.prestigePoints).toBe(g.prestigePoints + gain);
    expect(c.cash).toBe(0);
    expect(c.haulStats.pendingJump?.offers).toEqual(preview.offers);
    expect(H.confirmJump(cfg, c, NOW)).toBe(c); // one pending Jump at a time
    expect(H.advanceHaul(cfg, c, 1, NOW)).toBe(c); // nothing runs between galaxies
    // A restart in the spend step comes back to it.
    const reloaded = H.reconcileHaul(cfg, c as never, clone(c));
    expect(reloaded.haul).toBeNull();
    expect(reloaded.haulStats.pendingJump).toEqual(c.haulStats.pendingJump);
    let s = H.buyStarNode(cfg, c, 'preload');
    s = H.buyStarNode(cfg, s, 'afterburner');
    expect(H.startGalaxy(cfg, s, NOW, 'not-offered')).toBe(s);
    const pick = preview.offers[1];
    const started = H.startGalaxy(cfg, s, NOW, pick) as Run;
    expect(started.haul.galaxy).toBe(1);
    expect(started.haul.trait).toBe(pick);
    expect(started.haul.autopilot.online).toBe(true);
    expect(started.haul.slots[1].claimed).toBe(true);
    expect(started.haulStats.jumps).toBe(1);
    expect(started.haulStats.pendingJump).toBeNull();
    // 25: from galaxy 1 the board opens at the run start with contract 0 active.
    expect(started.haul.contracts.unlocked).toBe(true);
    expect(started.haul.contracts.active).toBe(0);
    expect(started.haul.contracts.board[0].k).toBe(0);
    // The one-call form gives the same run.
    const oneCall = H.prestigeHaul(cfg, g, NOW, pick, ['preload', 'afterburner']) as Run;
    expect(oneCall.haul).toEqual(started.haul);
    expect(oneCall.starMap).toEqual(started.starMap);
  }, 120_000);

  it('mid-run nodes: Prospect acts at once, Systems Preload only at the next run start', () => {
    const g = { ...shaped(cfg, 3, { slots: [0] }), prestigePoints: 100 } as Run;
    const before = H.haulParams(cfg, g).bonanzaChance;
    const a = H.buyStarNode(cfg, g, 'prospect') as Run;
    expect(H.haulParams(cfg, a).bonanzaChance).toBeGreaterThan(before);
    const b = H.buyStarNode(cfg, a, 'preload') as Run;
    expect(b.haul.autopilot.online).toBe(false);
  });

  it('23: a launch lost to a Jump while climbing is never counted', () => {
    let g = late();
    g = edit(g, (h) => {
      h.hold = { iron: 3 };
      h.freighter = { ...h.freighter, phase: 'docked', t: 0, cargo: {} };
      h.counters.drilled += 3;
    });
    g = H.launch(cfg, g) as Run;
    const launches = g.stats.launches;
    const offers = H.offersFor(cfg, g.metaSeed, g.haulStats.jumps, g.haul.trait);
    const j = H.prestigeHaul(cfg, g, NOW, offers[0]);
    expect(j.stats.launches).toBe(launches);
  }, 120_000);
});

describe('19, 24, 28, 29: rocks, unloads, claims', () => {
  it('19: after a seam the pile above its cap drains and the rig drills nothing negative', () => {
    let g = edit(shaped(quiet, 3, { slots: [0], haulers: [1] }), (h) => {
      h.slots[0].pile = 25; // normal cap 15
      h.slots[0].life = 100;
      h.counters.drilled += 25;
    });
    const life0 = g.haul.slots[0].life;
    g = H.advanceHaul(quiet, g, 2, NOW) as Run;
    expect(g.haul.slots[0].life).toBe(life0);
    expect(conservationError(g)).toBeLessThan(1e-9);
  });

  it('24: on the tutorial path the first unload band comes at about 0:12 (4 units after the first delivery)', () => {
    let g = run(cfg, freshHaulGame(cfg, 7), 4);
    g = H.assignDrone(cfg, g, 0) as Run;
    let at = -1;
    run(cfg, g, 12, 0.05, (s, ev) => {
      if (at < 0 && ev.some((e) => e.type === 'unload')) at = s.haul.clock;
    });
    expect(at).toBeGreaterThan(11.5);
    expect(at).toBeLessThan(12.3);
  });

  it('28: a claim waits 1.5 s with rockN −1, then rock 0 arrives through the respawn step', () => {
    let g = { ...freshHaulGame(cfg, 9), cash: 1000 } as Run;
    g = H.claimSlot(cfg, g, 1) as Run;
    expect(g.haul.slots[1].rockN).toBe(-1);
    expect(g.haul.slots[1].respawnAt).toBeCloseTo(1.5, 12);
    expect(H.claimedRings(cfg, g.haul)).toEqual([0]); // the drifting rock is not "present" yet
    const ev: H.HaulEvent[] = [];
    g = H.advanceHaul(cfg, g, 2, NOW, ev) as Run;
    expect(ev.some((e) => e.type === 'arrive' && e.slot === 1 && !e.oreChanged)).toBe(true);
    expect(g.haul.slots[1].rockN).toBe(0);
  });

  it('29: ghost slots are the unclaimed slots up to one ring past the highest claimed', () => {
    const g = freshHaulGame(cfg, 9);
    expect(H.ghostSlots(cfg, g)).toEqual([1, 2, 3, 4]);
    const s = H.claimSlot(cfg, { ...g, cash: 1e9 }, 3) as Run;
    expect(H.ghostSlots(cfg, s)).toEqual([1, 2, 4, 5, 6, 7]);
    expect(H.claimCost(cfg, s, 7)).toBeLessThan(Infinity);
    expect(H.claimCost(cfg, s, 8)).toBe(Infinity);
  });
});

describe('21, 22: lifetime flags for the story triggers', () => {
  it('bestRing, contractsSeen and autopilotSeen are set when they happen and survive a Jump', () => {
    let g = { ...freshHaulGame(cfg, 9), cash: 1e9 } as Run;
    expect(g.haulStats).toMatchObject({ bestRing: 1, contractsSeen: false, autopilotSeen: false });
    g = H.claimSlot(cfg, g, 2) as Run;
    expect(g.haulStats.bestRing).toBe(2);
    g = H.buyAutopilot(cfg, g) as Run;
    expect(g.haulStats.autopilotSeen).toBe(true);
    const f = haulFixtures(cfg);
    expect(f.minute3.haulStats.contractsSeen).toBe(true);
    expect(f.afterJump.haulStats).toMatchObject({ bestRing: 5, contractsSeen: true, autopilotSeen: true });
  }, 120_000);

  it('22: "Jump ready" needs jumpReadyCores; the Jump itself needs 1', () => {
    const g = freshHaulGame(cfg, 9);
    const one = { ...g, lifetimeEarnings: cfg.economy.prestige.threshold / 25 } as Run; // 5 × sqrt(1/25) = 1 core
    expect(H.jumpPreview(cfg, one)).toMatchObject({ gain: 1, canJump: true, ready: false });
    const many = { ...g, lifetimeEarnings: cfg.economy.prestige.threshold * 16 } as Run; // 20 cores
    expect(H.jumpPreview(cfg, many)).toMatchObject({ gain: 20, ready: true });
  });
});

describe('33, 35: flare timer, unfit capacity', () => {
  it('33: the free timer waits while a charge is held', () => {
    let g = edit(shaped(quiet, 3, { slots: [0], haulers: [1], autopilot: true }), (h) => {
      h.flare = { ...h.flare, charges: 0, nextFreeAt: 100 };
    });
    g = H.grantAdFlare(quiet, g, 'd1', NOW) as Run; // an ad charge at clock 0, 100 s left on the timer
    g = run(quiet, g, 500, 1);
    expect(g.haul.flare.charges).toBe(1);
    expect(g.haul.flare.nextFreeAt - g.haul.clock).toBeCloseTo(100, 6);
    g = H.useFlare(quiet, g, 0) as Run;
    g = run(quiet, g, 101, 1);
    expect(g.haul.flare.charges).toBe(1);
  });

  it('35: after an unfit the hold keeps its units, deliveries stop while it is at or above F, a launch takes F', () => {
    let g = edit(shaped(quiet, 3, { slots: [0], haulers: [3] }), (h) => {
      h.hold = { iron: 14 };
      h.counters.drilled += 14;
    });
    const hauled = g.haul.counters.hauled;
    g = H.advanceHaul(quiet, g, 5, NOW) as Run;
    expect(H.holdTotal(g.haul)).toBe(14);
    expect(g.haul.counters.hauled).toBe(hauled);
    g = H.launch(quiet, g) as Run;
    expect(H.sumUnits(g.haul.freighter.cargo)).toBe(12);
    expect(H.holdTotal(g.haul)).toBeCloseTo(2, 12);
  });
});

describe('36: offline freighter, short and long gaps', () => {
  const docked = (s: Run) => s.haul.freighter.phase === 'docked';

  it('a short gap moves the freighter by the seconds away: no early docking, no shipping before it docks', () => {
    let g = run(cfg, shaped(cfg, 3, { slots: [0, 1], haulers: [3, 3], rig: [6, 6], autopilot: true }), 30, 0.25);
    for (let i = 0; i < 400 && g.haul.freighter.phase !== 'away'; i++) g = H.advanceHaul(cfg, g, 0.05, NOW) as Run;
    const t = g.haul.freighter.t;
    const r = H.fastForward(cfg, g, 3, 0.45);
    const h = (r.game as Run).haul;
    expect(h.freighter.phase).toBe('away');
    expect(h.freighter.t).toBeCloseTo(t - 3, 9);
    expect(r.report.credits).toBe(0);
    expect(r.report.launches).toBe(0);
    // The routes keep filling the hold, at most what 3 × 0.45 s of hauling moves.
    const p = H.haulParams(cfg, g);
    const most = p.slots[0].h * 1.35 + p.slots[1].h * 1.35;
    expect(H.holdTotal(h) - H.holdTotal(g.haul)).toBeLessThanOrEqual(most + 1e-9);
    expect(conservationError(r.game as Run)).toBeLessThan(1e-9);
  });

  it('a climbing freighter is paid once, as IN FLIGHT, when its climb ends in the gap; its contract is the warp-out’s', () => {
    let g = withBoard(
      edit(shaped(quiet, 3, { slots: [0], haulers: [1], autopilot: true }), (h) => {
        h.hold = { iron: 5 };
        h.counters.drilled += 5;
      }),
      [contractOf(1, 'kade', [['iron', 4]], 1.6, 6, true), contractOf(2, 'corvo', [['iron', 9]], 1.6, 6)],
      0,
    );
    g = H.launch(quiet, g) as Run;
    const stored = g.haul.freighter.payout + (g.haul.freighter.bonus ?? 0);
    expect(g.haul.freighter.bonus).toBeGreaterThan(0);
    const r = H.fastForward(quiet, g, 3600, 0.45);
    const out = r.game as Run;
    expect(r.report.inFlight).toBeCloseTo(stored, 12);
    expect(out.cash - g.cash).toBeCloseTo(stored, 12);
    expect(out.stats.launches - g.stats.launches).toBe(1 + r.report.launches);
    // The warp-out met contract 1 and replaced it; the offline shipping counted no contract down
    // (the offer lost one launch at the in-flight warp-out only).
    expect(out.haul.contracts.board[0].k).not.toBe(1);
    expect(out.haul.contracts.board[1].launchesLeft).toBe(5);
    expect(docked(out)).toBe(true);
  });

  it('without the autopilot a 1 s gap moves only what 0.45 s of hauling moves (no instant full hold)', () => {
    const g = edit(shaped(cfg, 3, { slots: [0], haulers: [2] }), (h) => {
      h.slots[0].routeFrom = 0;
      h.slots[0].pile = 10;
      h.counters.drilled += 10;
    });
    const p = H.haulParams(cfg, g);
    const r = H.fastForward(cfg, g, 1, 0.45);
    expect(H.holdTotal((r.game as Run).haul)).toBeCloseTo(p.slots[0].h * 0.45, 9);
    expect(r.report.noAutopilot).toBe(true);
  });

  it('the offline shipping rate keeps the full bonus (18) and never beats play over an hour', () => {
    const g = haulFixtures(cfg).midGame;
    const p = H.haulParams(cfg, g);
    const r = H.fastForward(cfg, g, 3600, 1);
    const value = Object.entries(r.report.unitsByOre).reduce((a, [o, n]) => a + n * p.prices[o], 0);
    expect(r.report.credits).toBeCloseTo(value * p.fullBonus * p.G, 6);
  }, 120_000);
});

describe('Hangar Expansion bought during a run (5.4)', () => {
  const c = haulTestConfig();
  it('adds its start drones once, idle, never above the cap; a run that started with it gets none more', () => {
    const g = freshHaulGame(c, 31);
    expect(H.grantHangarDrones(c, g, 'space_hangar')).toBe(g); // not owned
    const owned = { ...g, entitlements: { ...g.entitlements, products: ['space_hangar'] } };
    const a = H.grantHangarDrones(c, owned, 'space_hangar') as typeof g;
    expect(a.haul.fleet.drones).toBe(g.haul.fleet.drones + 2);
    expect(a.haul.idle).toBe(g.haul.idle + 2);
    expect(a.haul.flags.hangarDrones).toBe(true);
    expect(H.grantHangarDrones(c, a, 'space_hangar')).toBe(a); // once per run
    expect(H.grantHangarDrones(c, owned, 'space_other')).toBe(owned);
    // At the cap: nothing above it.
    const full = { ...owned, haul: { ...owned.haul, fleet: { ...owned.haul.fleet, drones: 29 } } };
    expect((H.grantHangarDrones(c, full, 'space_hangar') as typeof g).haul.fleet.drones).toBe(30);
    // A run built with the product owned already had them.
    const h = H.createHaul(c, 5, 0, null, { levels: {}, spent: 0 }, { bestClaimed: 1 }, { products: ['space_hangar'] });
    expect(h.flags.hangarDrones).toBe(true);
    expect(H.grantHangarDrones(c, { ...owned, haul: h }, 'space_hangar')).toEqual({ ...owned, haul: h });
  });
});
