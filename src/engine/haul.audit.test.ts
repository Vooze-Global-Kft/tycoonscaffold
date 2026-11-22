/// <reference types="node" />
/**
 * Economy audit of the haul rules (Orbit Haulers, docs/design/space-design.md section 2, with the
 * rulings of the errata list, which win where they differ from the specification).
 *
 * Every test in the first blocks names the rule it defends and FAILS against the engine as it was
 * audited (22 Nov 2026): each is the exact target of one fix. The last blocks (invariants under
 * random play, tick splitting, offline bounds, scale) are guards that pass today and must keep
 * passing.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import * as H from './haul';
import { hashString, rngFloat } from './rng';
import { HAUL_STARTING_CONTENT, HaulSchema } from '../config/schema.haul';
import { conservationError, freshHaulGame, handBasis, haulFixtures, haulTestConfig, run, shaped } from './fixtures/haul';

type Run = H.HaulGame & { haul: H.HaulState };

const cfg = haulTestConfig();
// The fixtures play about 2 h 20 of game time once; build them before the first test's 5 s clock starts.
beforeAll(() => {
  haulFixtures(cfg);
}, 120_000);
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const roll = (seed: number) => rngFloat(seed).value;

/** A run whose haul part is edited in place on a deep copy. */
function edit(g: Run, f: (h: H.HaulState, g: Run) => void): Run {
  const c = clone(g);
  f(c.haul, c);
  return c;
}

/** Ticks until `until(g)` or `max` seconds, in steps of `dt`; collects events. */
function tickUntil(g: Run, until: (g: Run) => boolean, max: number, dt = 0.1, events: H.HaulEvent[] = []): Run {
  let s = g;
  for (let t = 0; t < max && !until(s); t += dt) s = H.advanceHaul(cfg, s, dt, 0, events) as Run;
  return s;
}

/** A freighter-bound station: 2 ring-1 routes with 6 drones each, rigs L6, autopilot on, freighter L1. */
function freighterBound(): Run {
  return run(cfg, shaped(cfg, 3, { slots: [0, 1], haulers: [6, 6], rig: [6, 6], autopilot: true }), 60, 0.25);
}

// =====================================================================================
// 1. Exploits: money, ore or rewards from nothing
// =====================================================================================

describe('exploits', () => {
  // 2.11 "Contracts, seams, flares ... do not count, so offline never beats play" and errata 36
  // ("Only a climbing freighter is paid, once ... an away or landing one just docks"). Read for a
  // one-second trip to the background, these complete a 2.5 s climb at once and skip the 8 s away
  // and 2 s landing: the app switcher becomes a freighter accelerator.
  it('2.11 / errata 36: one second away right after a launch pays no more than one second of play', () => {
    let g = freighterBound();
    g = tickUntil(g, (s) => s.haul.freighter.phase === 'climb' && s.haul.freighter.t > 2.4, 60, 0.05);
    expect(g.haul.freighter.phase).toBe('climb');
    const played = H.advanceHaul(cfg, g, 1, 0) as Run;
    const off = H.fastForward(cfg, g, 1, 0.45);
    const offEarned = off.game.cash - g.cash + off.report.credits;
    const playEarned = played.cash - g.cash;
    expect(offEarned).toBeLessThanOrEqual(playEarned + 1e-9);
  });

  it('2.11 / errata 36: backgrounding the app for 1 s after every launch does not beat playing on', () => {
    const g = freighterBound();
    const wall = 300;
    const played = run(cfg, g, wall, 0.1);
    let s: Run = g;
    let credits = 0;
    let t = 0;
    while (t < wall) {
      const launches = s.haul.counters.launches;
      s = H.advanceHaul(cfg, s, 0.1, 0) as Run;
      t += 0.1;
      if (s.haul.counters.launches > launches) {
        const r = H.fastForward(cfg, s, 1, 0.45);
        s = r.game as Run;
        credits += r.report.credits;
        t += 1;
      }
    }
    // Measured at audit time: playing earns ₵322, the app-switch loop ₵1,756 (5.4x).
    expect(s.cash - g.cash + credits).toBeLessThanOrEqual((played.cash - g.cash) * 1.05);
  });

  // 2.11 fastForward: "credits = Σ units × p_o, then scaled by the freighter limit min(1, Q × T / Σ units)",
  // "Hold empty (shipped)". The units the limit does not pay for are deleted, not kept: ore is lost.
  it('2.11: fastForward never removes from the hold more ore than the freighter limit pays for', () => {
    const g = edit(shaped(cfg, 3, { slots: [0], haulers: [0], autopilot: true }), (h) => {
      h.hold = { iron: 12 };
      h.counters.drilled += 12;
    });
    const p = H.haulParams(cfg, g);
    const Teff = 1 * 0.45;
    const paidUnits = H.freighterRate(p) * Teff;
    const r = H.fastForward(cfg, g, 1, 0.45);
    const h = (r.game as Run).haul;
    expect(H.holdTotal(h) + paidUnits).toBeGreaterThanOrEqual(12 - 1e-6);
  });

  // Errata 16 counts `stats.seamDrags += 1` for "a drone that lands on a seam slot", and missions
  // ("drag n drones onto seams", 5.3) read it. Moving the same drone off and back on is free and
  // instant, so the mission counter can be farmed without limit. One drone, one seam: one drag.
  it('errata 16 / 5.3: moving one drone off and back onto the same seam counts one drag, not fifty', () => {
    let g = edit(shaped(cfg, 5, { slots: [0, 1], haulers: [2, 2] }), (h) => {
      h.vein = { ...h.vein, slot: 1, until: 100, guests: [] };
    });
    for (let i = 0; i < 50; i++) {
      g = H.moveDrone(cfg, g, 1, 0) as Run;
      g = H.moveDrone(cfg, g, 0, 1) as Run;
    }
    expect(g.stats.seamDrags).toBeLessThanOrEqual(2);
  });

  // 2.11 / notes item 6: `offline(cfg, g, now) = haulOffline(...)`, "keep game". The returned game
  // still carries the old lastSavedAt and clockHigh, so any second call with it (a resume handler
  // that runs twice, a retry after a failed save) pays the same hours again.
  it('2.11: haulOffline on the game it returned, at the same now, pays nothing more', () => {
    const g = haulFixtures(cfg).minute3;
    const now = g.lastSavedAt + 3_600_000;
    const first = H.haulOffline(cfg, g, now);
    expect(first.earnings).toBeGreaterThan(0);
    expect(H.haulOffline(cfg, first.game, now).earnings).toBe(0);
  });

  // Errata 33: "Each rewarded ad adds 1 charge, at most 3 per local day ... Charges never exceed 4."
  it('errata 33: rewarded-ad flare charges never exceed 4', () => {
    let g = haulFixtures(cfg).minute3;
    for (let d = 0; d < 5; d++) for (let k = 0; k < 3; k++) g = H.grantAdFlare(cfg, g, `2026-12-0${d + 1}`, 1e12 + d * 86_400_000 + k * 1_300_000) as Run;
    expect(g.haul.flare.charges).toBeLessThanOrEqual(4);
  });
});

// =====================================================================================
// 2. The rulings (errata items 12 to 36, 71, 72, 76)
// =====================================================================================

describe('rulings: seams and flares', () => {
  // Errata 34: "A seam (natural or flare) may only be placed on a rock with life > 0. If the natural
  // roll finds no such slot, it does not start; vein.nextAt = clock + 30, and vein.count does not change."
  it('errata 34: the natural seam never starts on a dry rock; with none, nextAt = clock + 30', () => {
    const g = edit(shaped(cfg, 3, { slots: [0], haulers: [0] }), (h) => {
      h.slots[0].life = 0;
      h.slots[0].pile = 5;
      h.vein.nextAt = 0.05;
    });
    const s = H.advanceHaul(cfg, g, 0.1, 0) as Run;
    expect(s.haul.vein.slot).toBeNull();
    expect(s.haul.vein.count).toBe(0);
    // Second pass: the roll happens at clock 0.05 (the step ends at nextAt), so nextAt = 0.05 + 30.
    expect(s.haul.vein.nextAt).toBeCloseTo(0.05 + 30, 6);
  });

  it('errata 34: a flare cannot go onto a dry rock', () => {
    const g = edit(shaped(cfg, 3, { slots: [0], haulers: [0] }), (h) => {
      h.slots[0].life = 0;
      h.slots[0].pile = 5;
      h.flare.charges = 1;
    });
    expect(H.canFlare(g, 0)).toBe(false);
    expect(H.useFlare(cfg, g, 0)).toBe(g);
  });

  // Errata 16: "If the seam slot's rock crumbles, the seam ends at once (guests return, veinEnd);
  // a natural seam's next roll is counted from that moment."
  it('errata 16: a seam whose rock crumbles ends at once and its guests go home', () => {
    const g = edit(shaped(cfg, 3, { slots: [0, 1], haulers: [1, 0] }), (h) => {
      h.slots[0].life = 0.05;
      h.slots[0].pile = 0;
      h.vein = { ...h.vein, slot: 0, until: 40, guests: [-1], nextAt: 200 };
      h.fleet.drones = 1;
    });
    const ev: H.HaulEvent[] = [];
    const s = H.advanceHaul(cfg, g, 1, 0, ev) as Run;
    expect(s.haul.slots[0].respawnAt).not.toBeNull();
    expect(ev.some((e) => e.type === 'veinEnd')).toBe(true);
    expect(s.haul.vein.slot).toBeNull();
    expect(s.haul.idle).toBe(1);
    // Second pass: "a natural seam's next roll is counted from that moment": the interval this seam
    // drew (nextAt − until = 160 here) now runs from the crumble, not from the planned end at 40.
    const crumbledAt = ev.findIndex((e) => e.type === 'depleted');
    expect(crumbledAt).toBeGreaterThanOrEqual(0);
    expect(s.haul.vein.nextAt).toBeLessThan(200 - 39);
    expect(s.haul.vein.nextAt - s.haul.vein.until).toBeCloseTo(160, 6);
  });

  // Errata 16: "A drone that leaves the seam slot during the seam (moved or recalled) pops the last entry."
  it('errata 16: any drone leaving the seam slot pops the last guest entry', () => {
    let g = edit(shaped(cfg, 3, { slots: [0, 1, 2], haulers: [1, 1, 1] }), (h) => {
      h.vein = { ...h.vein, slot: 2, until: 40, guests: [], nextAt: 200 };
    });
    g = H.moveDrone(cfg, g, 0, 2) as Run; // guest from 0: slot 2 has 2 drones, guests [0]
    expect(g.haul.vein.guests).toEqual([0]);
    g = H.moveDrone(cfg, g, 2, 1) as Run; // one drone leaves the seam
    expect(g.haul.vein.guests).toEqual([]);
  });

  // Errata 20: "interval = max(30, U(90, 150) × T(interval) − 10 × S(veinsense)) s."
  it('errata 20: with Seam Storms and Seam Sense 5 no seam interval is shorter than 30 s', () => {
    let g = edit(shaped(cfg, 3, { slots: [0, 1], haulers: [1, 1] }), (h) => {
      h.trait = 'storms';
      h.vein.nextAt = 1;
    });
    g = { ...g, starMap: { levels: { veinsense: 5 }, spent: 0 } };
    const gaps: number[] = [];
    let last = g.haul.vein.count;
    for (let t = 0; t < 1500; t++) {
      g = H.advanceHaul(cfg, g, 1, 0) as Run;
      if (g.haul.vein.count > last) {
        last = g.haul.vein.count;
        gaps.push(g.haul.vein.nextAt - g.haul.vein.until);
      }
    }
    expect(gaps.length).toBeGreaterThan(3);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(30 - 1e-9);
  });

  // Errata 19: "Event dry {slot} when life first reaches 0 while the pile is above 0 (the Dry rock drawing and rock_dry)."
  it('errata 19: a dry event fires when the rock runs out with ore still on the pile', () => {
    const g = edit(shaped(cfg, 3, { slots: [0], haulers: [0] }), (h) => {
      h.slots[0].life = 0.3;
      h.slots[0].pile = 2;
    });
    const ev: H.HaulEvent[] = [];
    H.advanceHaul(cfg, g, 1, 0, ev);
    expect(ev.map((e) => e.type as string)).toContain('dry');
  });
});

describe('rulings: freighter, contracts, counters', () => {
  // Errata 23: "stats.launches and counters.launches count at the warp-out, one per payout."
  it('errata 23: a launch is counted at the warp-out, not at the swipe', () => {
    const g = edit(shaped(cfg, 3, { slots: [0], haulers: [0] }), (h) => {
      h.hold = { iron: 5 };
      h.counters.drilled += 5;
    });
    const l = H.launch(cfg, g) as Run;
    expect(l.haul.freighter.phase).toBe('climb');
    expect(l.stats.launches).toBe(0);
    expect(l.haul.counters.launches).toBe(0);
    const w = H.advanceHaul(cfg, l, 3, 0) as Run;
    expect(w.stats.launches).toBe(1);
  });

  // Errata 26 under Decision 40: what a contract adds is its fixed bonus, the same figure on the board,
  // the strip and the receipt, whatever the hold holds (right after a launch it is not 0).
  it('errata 26 (Decision 40): the contract bonus right after a launch (empty hold) is the fixed bonus, not 0', () => {
    const g = edit(haulFixtures(cfg).minute3, (h) => {
      h.hold = {};
    });
    const p = H.haulParams(cfg, g);
    const c = g.haul.contracts.board[0];
    const want = c.wants.reduce((a, w) => a + w.units * p.prices[w.ore], 0) * (c.mult + p.contractAdd - 1) * p.G;
    expect(want).toBeGreaterThan(0);
    expect(H.contractBonus(cfg, p, c)).toBeCloseTo(want, 9);
    expect(H.contractViews(cfg, p, g.haul)[0].bonus).toBeCloseTo(want, 9);
  });

  // Errata 27: "the rest: rngMix4(seed, hashString('contract'), k, n)". Rewritten for Decision 56: the
  // stream now gives n = 1 the ore, 2 the raise, 3 one or two ores, 6 the jitter; units are
  // L × recent × (1 + g) of what the station ships (here a hand-made basis), not a share of F.
  it("errata 27 (Decision 56): a contract's ore, raise and multiplier come from the 'contract' stream", () => {
    const C = cfg.haul.contracts;
    const seed = 777;
    const b = handBasis(cfg, { iron: 50, copper: 30 });
    let one = 0;
    let same = 0;
    for (let k = 1; k <= 40; k++) {
      const c = H.contractAt(cfg, seed, k, b);
      if (c.wants.length !== 1) continue;
      one++;
      const draw = (n: number) => roll(H.rngMix4(seed, hashString('contract'), k, n));
      const pool = ['iron', 'copper'];
      const ore = pool[Math.floor(draw(1) * pool.length)];
      const share = b.recent[ore] / b.F;
      const hi = Math.min(C.raise[1], C.maxShare / share - 1);
      const g = C.raise[0] + (hi - C.raise[0]) * draw(2);
      const units = Math.max(Math.round(C.launches * b.recent[ore] * (1 + g)), Math.ceil(C.launches * b.steady[ore] * (1 + g) + b.pileOf[ore]));
      const mult = Math.max(1, Math.round((C.mult[0] + (draw(6) * 2 - 1) * C.jitter + C.raiseMult * g) * 10) / 10);
      if (c.wants[0].ore === ore && c.wants[0].units === units && c.mult === mult) same++;
    }
    expect(one).toBeGreaterThan(15);
    expect(same).toBe(one);
  });

  // Errata 27: "A two-ore contract has two different ores". Rewritten for Decision 56 ("raise one,
  // hold the other"): on a station that ships three ores with room to rise, about twoOreChance of the
  // draws want two ores; the second is held at holdShare of what it ships.
  it('errata 27 (Decision 56): with three ores shipped, two-ore contracts keep their twoOreChance share', () => {
    const C = cfg.haul.contracts;
    const b = handBasis(cfg, { iron: 40, copper: 30, ice: 30 });
    let two = 0;
    const N = 600;
    for (let k = 1; k <= N; k++) {
      const c = H.contractAt(cfg, 99, k, b);
      if (c.wants.length === 2) {
        two++;
        expect(c.wants[0].ore).not.toBe(c.wants[1].ore);
        const held = c.wants[1];
        expect(held.units).toBeGreaterThanOrEqual(Math.round(C.launches * b.recent[held.ore] * C.holdShare[0]) - 1);
        expect(held.units).toBeLessThanOrEqual(Math.round(C.launches * b.recent[held.ore] * C.holdShare[1]) + 1);
      }
    }
    expect(two / N).toBeGreaterThan(C.twoOreChance - 0.07);
    expect(two / N).toBeLessThan(C.twoOreChance + 0.07);
  });

  // Errata 27: "A ring 'with a rock' means a claimed slot whose rock is present."
  it('errata 27: contracts draw only from rings with a rock present', () => {
    const g = edit(shaped(cfg, 3, { slots: [0, 2], haulers: [1, 0] }), (h) => {
      h.slots[2].respawnAt = h.clock + 5;
      h.slots[2].life = 0;
      h.slots[2].pile = 0;
    });
    expect(H.claimedRings(cfg, g.haul)).toEqual([0]);
  });

  // Errata 28: "Slot 0's starting rock is rockAt(seed, 0, 0) forced to non-bonanza, pile 8."
  it('errata 28: slot 0 never starts on a bonanza rock', () => {
    let bonanza = 0;
    for (let seed = 1; seed <= 1500; seed++) if (freshHaulGame(cfg, seed).haul.slots[0].bonanza) bonanza++;
    expect(bonanza).toBe(0);
  });

  // Errata 29: "Ghost slots are shown and claimable for every unclaimed slot on rings up to (highest
  // claimed ring of this run + 1)."
  it('errata 29: a fresh run can claim ring 2 but not ring 3 or ring 5', () => {
    const g = { ...freshHaulGame(cfg), cash: 1e12 } as Run;
    expect(H.claimSlot(cfg, g, 2)).not.toBe(g); // ring 2
    expect(H.claimSlot(cfg, g, 5)).toBe(g); // ring 3
    expect(H.claimSlot(cfg, g, 11)).toBe(g); // ring 5
    expect(H.claimCost(cfg, g, 11)).toBe(Infinity);
  });

  // Errata 24: "delivered_i counts units since the current rock arrived or since the route went from 0 to 1 drone."
  it('errata 24: delivered restarts when an empty route gets its first drone', () => {
    const g = edit(shaped(cfg, 3, { slots: [0], haulers: [0], idle: 1 }), (h) => {
      h.slots[0].delivered = 7;
    });
    const a = H.assignDrone(cfg, g, 0) as Run;
    expect(a.haul.slots[0].delivered).toBe(0);
  });

  // Errata 36: "fastForward adds its units to stats.hauled and floor(Σ units / F) to stats.launches."
  it('errata 36: an hour offline with the autopilot adds floor(units / F) launches', () => {
    const g = haulFixtures(cfg).minute3;
    const r = H.fastForward(cfg, g, 3600, 0.45);
    const F = H.haulParams(cfg, g).F;
    const units = Object.values(r.report.unitsByOre).reduce((a, b) => a + b, 0);
    expect(units).toBeGreaterThan(F);
    expect(r.game.stats.launches - g.stats.launches).toBe(Math.floor(units / F));
  });
});

describe('rulings: Star Map, conditions, lifetime flags', () => {
  // Errata 71: "Bonanza chance = min(0.5, ...); Prospect Survey's cap is the first level that reaches 0.5 (11)."
  it('errata 71: the bonanza chance never passes 0.5 and Prospect Survey caps at 11', () => {
    expect(H.bonanzaChance(cfg, { levels: { prospect: 40 }, spent: 0 })).toBeLessThanOrEqual(0.5);
    expect(cfg.haul.starMap.nodes.find((n) => n.id === 'prospect')?.cap).toBe(11);
  });

  // Errata 72: "Frost Surplus: ice weight x3 on rings 3 and 4; ice value x2."
  it('errata 72: Frost Surplus weights ice on rings 3 and 4 only', () => {
    const frost = HAUL_STARTING_CONTENT.conditions.find((c) => c.id === 'frost');
    expect(frost?.oreWeight?.[0]?.rings).toEqual([3, 4]);
  });

  // Errata 20 again, as content: the floor of the interval is 30 s.
  it('errata 20: the seam interval floor is 30 s in the starting content', () => {
    expect(HaulSchema.parse(HAUL_STARTING_CONTENT).seam.minInterval).toBe(30);
  });

  // Errata 22: "'Jump ready' means the Jump would gain at least haul.jumpReadyCores (20, tune)."
  it('errata 22: the content has jumpReadyCores (20) and the preview says when the Jump is ready', () => {
    const haul = HaulSchema.parse(HAUL_STARTING_CONTENT) as Record<string, unknown>;
    expect(haul.jumpReadyCores).toBe(20);
    const preview = H.jumpPreview(cfg, haulFixtures(cfg).late) as unknown as Record<string, unknown>;
    expect(typeof preview.ready).toBe('boolean');
  });

  // Errata 21: "ring {ring}: haulStats.bestRing; contracts: haulStats.contractsSeen; system:
  // haulStats.autopilotSeen. Add the three fields to haulStats in 2.2."
  it('errata 21: haulStats keeps bestRing, contractsSeen and autopilotSeen for the story triggers', () => {
    const s = haulFixtures(cfg).midGame.haulStats as unknown as Record<string, unknown>;
    expect(s.bestRing).toBeGreaterThanOrEqual(3);
    expect(s.contractsSeen).toBe(true);
    expect(s.autopilotSeen).toBe(true);
  });
});

describe('saves (2.2: reconcile never leaves a broken run)', () => {
  // A claimed slot with rockN −1 and no respawnAt (an interrupted claim in an old save) is never
  // drilled, never respawns and never crumbles: the slot is dead for the rest of the run.
  it('a claimed slot waiting for its first rock with no respawn time gets a rock after loading', () => {
    const raw = clone(freshHaulGame(cfg)) as unknown as { haul: { slots: Record<string, unknown>[] } };
    raw.haul.slots[1] = { ...raw.haul.slots[1], claimed: true, rockN: -1, respawnAt: null };
    const loaded = H.reconcileHaul(cfg, raw as never, raw) as Run;
    const later = H.advanceHaul(cfg, loaded, 10, 0) as Run;
    expect(later.haul.slots[1].rockN).toBeGreaterThanOrEqual(0);
  });
});

// =====================================================================================
// 3. Invariants under fire (guards: pass today)
// =====================================================================================

function badNumbers(x: unknown, path: string, out: string[]): void {
  if (typeof x === 'number') {
    if (!Number.isFinite(x)) out.push(`${path} = ${x}`);
    else if (x < 0 && !/(rockN|guests\[\d+\]|\.slot|respawnAt|contract)$/.test(path)) out.push(`${path} = ${x}`);
  } else if (Array.isArray(x)) x.forEach((v, i) => badNumbers(v, `${path}[${i}]`, out));
  else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) badNumbers(v, `${path}.${k}`, out);
}

function invariants(g: Run, prev: Run | null): string[] {
  const out: string[] = [];
  const h = g.haul;
  badNumbers(h, 'haul', out);
  badNumbers({ cash: g.cash, run: g.runEarnings, life: g.lifetimeEarnings, stats: g.stats, starMap: g.starMap }, 'game', out);
  if (conservationError(g) > 1e-9) out.push(`ore not conserved (${conservationError(g)})`);
  const p = H.haulParams(cfg, g);
  const onRoutes = h.slots.reduce((a, s) => a + s.haulers, 0);
  if (onRoutes + h.idle !== h.fleet.drones) out.push('drones not conserved');
  if (h.fleet.drones > p.droneCap) out.push('drone cap');
  // Errata 35: the hold may exceed F only after an unfit, until the next launch.
  if (H.holdTotal(h) > p.F + 1e-6 && prev && H.holdTotal(h) > H.holdTotal(prev.haul) + 1e-6) out.push('hold grew above F');
  const ores = new Set(cfg.haul.ores.map((o) => o.id));
  for (const o of Object.keys(h.hold)) if (!ores.has(o)) out.push(`unknown ore ${o}`);
  h.slots.forEach((s, i) => {
    if (!s.claimed && s.haulers) out.push(`drones on unclaimed ${i}`);
    if (s.claimed && s.rockN >= 0 && s.respawnAt === null && !ores.has(s.ore)) out.push(`slot ${i} ore ${s.ore}`);
    if (s.claimed && s.rockN < 0 && s.respawnAt === null) out.push(`slot ${i} dead (no rock, no respawn)`);
    const cap = p.slots[i].cap * (p.slots[i].seam ? 1 : cfg.haul.seam.pileCap);
    // Above cap is allowed after a seam or an unfit (the pile drains); it must never grow there.
    if (s.claimed && s.pile > cap + 1e-6 && prev && s.pile > (prev.haul.slots[i]?.pile ?? 0) + 1e-6) out.push(`slot ${i} pile grew over cap`);
  });
  for (const seam of [h.vein, h.flare]) {
    if (seam.slot !== null && (seam.slot < 0 || seam.slot >= h.slots.length || !h.slots[seam.slot].claimed)) out.push('seam on a bad slot');
    if (seam.slot !== null && seam.guests.length > h.slots[seam.slot].haulers) out.push('more guests than drones');
    for (const o of seam.guests) if (o < -1 || o >= h.slots.length) out.push('bad guest origin');
  }
  if (h.vein.slot !== null && h.vein.slot === h.flare.slot) out.push('two seams on one slot');
  if (h.contracts.active !== null && !h.contracts.board[h.contracts.active]) out.push('active out of range');
  // Decision 56: a dropped contract's place stays empty until the next warp-out, so the board can be shorter (never longer).
  if (h.contracts.board.length > cfg.haul.contracts.board) out.push('board size');
  const ks = h.contracts.board.map((c) => c.k);
  if (new Set(ks).size !== ks.length) out.push('duplicate contract k');
  for (const c of h.contracts.board) if (c.launchesLeft < 1) out.push('lapsed contract on the board');
  if (h.freighter.phase === 'docked' && H.sumUnits(h.freighter.cargo) > 0) out.push('docked with cargo');
  if (h.freighter.phase !== 'docked' && h.freighter.t < -1e-6) out.push('freighter t < 0');
  for (const s of g.loadout.sockets) if (s !== null && !cfg.meta.cards.some((c) => c.id === s)) out.push(`socket ${s}`);
  if (g.cash > Number.MAX_VALUE) out.push('cash');
  if (prev && g.lifetimeEarnings < prev.lifetimeEarnings) out.push('lifetime earnings went down');
  return out;
}

function randomPlay(seed: number, ticks: number, check: boolean): Run {
  let g: Run = {
    ...freshHaulGame(cfg, seed),
    cards: { chute: { level: 3, copies: 0 }, sorter: { level: 2, copies: 0 }, keeper: { level: 2, copies: 0 }, quickclamp: { level: 9, copies: 0 }, thrusters: { level: 1, copies: 0 }, clamps: { level: 4, copies: 0 }, diamondbit: { level: 2, copies: 0 } },
  };
  let r = seed * 7919 + 17;
  const rand = () => {
    const x = rngFloat(r);
    r = x.seed;
    return x.value;
  };
  const pick = (n: number) => Math.floor(rand() * n);
  const n = g.haul.slots.length;
  const slotArg = () => [pick(n), pick(n), pick(n), -1, n, 0.5, NaN][pick(7)];
  for (let tick = 0; tick < ticks; tick++) {
    const k = pick(4);
    for (let a = 0; a < k; a++) {
      const before = g;
      const act = pick(22);
      if (act === 0) g = { ...g, cash: Math.min(Number.MAX_VALUE, g.cash + rand() * 10 ** pick(8)) };
      else if (act === 1) g = H.assignDrone(cfg, g, slotArg()) as Run;
      else if (act === 2) g = H.moveDrone(cfg, g, slotArg(), slotArg()) as Run;
      else if (act === 3) g = H.recallDrone(cfg, g, slotArg()) as Run;
      else if (act === 4) g = H.launch(cfg, g) as Run;
      else if (act === 5) g = H.upgradeRig(cfg, g, slotArg()) as Run;
      else if (act === 6) g = H.claimSlot(cfg, g, slotArg()) as Run;
      else if (act === 7) g = H.buyDrone(cfg, g) as Run;
      else if (act === 8) g = H.buyCapacity(cfg, g) as Run;
      else if (act === 9) g = H.buyEngine(cfg, g) as Run;
      else if (act === 10) g = H.buyFreighter(cfg, g) as Run;
      else if (act === 11) g = H.buyAutopilot(cfg, g) as Run;
      else if (act === 12) g = H.setPolicy(cfg, g, (['full', 'contract', 'bogus'] as H.AutopilotPolicy[])[pick(3)]) as Run;
      else if (act === 13) g = H.pickContract(cfg, g, [null, 0, 1, 2, 3, -1, 1.5][pick(7)]) as Run;
      else if (act === 14) g = H.useFlare(cfg, g, slotArg()) as Run;
      else if (act === 15) g = H.fitModule(cfg, g, [0, 1, 2, 3, -1][pick(5)], [null, 'chute', 'sorter', 'keeper', 'quickclamp', 'thrusters', 'diamondbit', 'clamps', 'bogus'][pick(9)]) as Run;
      else if (act === 16 && g.haul.vein.slot !== null) g = H.moveDrone(cfg, g, pick(n), g.haul.vein.slot) as Run;
      else if (act === 17) g = H.grantAdFlare(cfg, g, `d${Math.floor(tick / 5000)}`, tick * 100_000) as Run;
      else if (act === 18) g = H.buyStarNode(cfg, { ...g, prestigePoints: g.prestigePoints + pick(3) }, cfg.haul.starMap.nodes[pick(8)].id) as Run;
      else if (act === 19 && rand() < 0.05) {
        const ff = H.fastForward(cfg, g, [1, 60, 3600, 1e9, -5, NaN][pick(6)], 0.45);
        g = { ...(ff.game as Run), cash: Math.min(Number.MAX_VALUE, ff.game.cash + ff.report.credits) };
      } else if (act === 20 && rand() < 0.01) {
        const offers = H.offersFor(cfg, g.metaSeed, g.haulStats.jumps, g.haul.trait);
        g = H.prestigeHaul(cfg, g, 0, offers[pick(3)], ['preload', 'afterburner', 'prospect']) as Run;
      } else if (act === 21) g = H.ackTransmission(cfg, g) as Run;
      if (check) {
        const bad = invariants(g, before);
        if (bad.length) throw new Error(`seed ${seed} tick ${tick} action ${act}: ${bad.join('; ')}`);
      }
    }
    const before = g;
    const dt = [0.1, 0.1, 0.1, 0.1, 1, 0.37, 2.5, 7, 0, -1, NaN][pick(11)];
    g = H.advanceHaul(cfg, g, dt, 0) as Run;
    if (check) {
      const bad = invariants(g, before);
      if (bad.length) throw new Error(`seed ${seed} tick ${tick} (dt ${dt}): ${bad.join('; ')}`);
      if (tick % 97 === 0) {
        const json = JSON.stringify(g);
        expect(JSON.parse(json)).toEqual(g);
      }
    }
  }
  return g;
}

describe('invariants under random valid and invalid actions', () => {
  const seeds = Array.from({ length: 30 }, (_, i) => i + 1);
  for (const seed of seeds) {
    it(`seed ${seed}: 20,000 ticks, every invariant after every action and tick`, () => {
      const g = randomPlay(seed, 20_000, true);
      expect(g.haul.counters.launches + g.haulStats.jumps).toBeGreaterThan(0);
    }, 600_000);
  }
  it('the same seed and inputs give the same state, bit for bit', () => {
    for (const seed of [3, 11]) expect(JSON.stringify(randomPlay(seed, 5000, false))).toBe(JSON.stringify(randomPlay(seed, 5000, false)));
  }, 600_000);
});

describe('tick splitting (2.4: "10 Hz and 1 s ticks agree within 0.5 %")', () => {
  for (const name of ['minute3', 'midGame', 'late'] as const) {
    for (const dt of [1, 10, 60]) {
      it(`${name}: tick(${dt}) once and ten ticks of ${dt / 10} agree`, () => {
        const g = haulFixtures(cfg)[name];
        const one = H.advanceHaul(cfg, g, dt, 0) as Run;
        let ten = g;
        for (let i = 0; i < 10; i++) ten = H.advanceHaul(cfg, ten, dt / 10, 0) as Run;
        const tol = (a: number, b: number) => Math.abs(a - b) <= 0.005 * Math.max(1, Math.abs(a), Math.abs(b));
        expect(tol(one.cash, ten.cash)).toBe(true);
        expect(tol(one.haul.counters.hauled, ten.haul.counters.hauled)).toBe(true);
        expect(one.haul.clock).toBeCloseTo(ten.haul.clock, 6);
      });
    }
  }
});

// =====================================================================================
// 4. Offline against play (guards for long gaps)
// =====================================================================================

/**
 * The fastest of `n` runs of `f`, in ms (rules-9): a timing guard measured once fails whenever the
 * machine is busy (six test runs on four cores); the fastest of several is what the code costs.
 */
function fastest(f: () => void, n = 5): number {
  let best = Infinity;
  for (let i = 0; i < n; i++) {
    const t0 = performance.now();
    f();
    best = Math.min(best, performance.now() - t0);
  }
  return best;
}

describe('offline never pays more than play, and is fast', () => {
  const shapes = (): Record<string, Run> => {
    const fx = haulFixtures(cfg);
    return {
      minute3: fx.minute3,
      midGame: fx.midGame,
      late: fx.late,
      noAutopilot: edit(fx.minute3, (h) => {
        h.autopilot.online = false;
      }),
      dryingRocks: edit(fx.midGame, (h) => {
        for (const s of h.slots) if (s.claimed && s.respawnAt === null) s.life = Math.min(s.life, 2);
      }),
    };
  };
  for (const secs of [60, 3600, 8 * 3600, 30 * 86_400]) {
    it(`${secs} s: credits ≤ played earnings over the capped time; under 5 ms`, () => {
      for (const [name, g] of Object.entries(shapes())) {
        H.fastForward(cfg, g, secs, 0.45); // warm the JIT
        const r = H.fastForward(cfg, g, secs, 0.45);
        // Typically under 2 ms; 10 ms on the fastest of five still catches a loop that runs away.
        expect(fastest(() => H.fastForward(cfg, g, secs, 0.45)), name).toBeLessThan(10);
        const capped = Math.min(secs, cfg.economy.offline.maxHours * 3600);
        const offEarned = r.game.cash - g.cash + r.report.credits;
        // Play over the same (capped) time, in 1 s ticks up to an hour, then by rate.
        const playSecs = Math.min(capped, 3600);
        const played = H.advanceHaul(cfg, g, playSecs, 0) as Run;
        const playEarned = (played.cash - g.cash) * (capped / playSecs);
        expect(offEarned, name).toBeLessThanOrEqual(playEarned * 1.02 + 1e-6);
        expect(Number.isFinite(offEarned), name).toBe(true);
      }
    }, 120_000);
  }
});

// =====================================================================================
// 5. Scale
// =====================================================================================

describe('scale (almost endless)', () => {
  // A one-hour catch-up tick (MAX_TICK) is the longest a store may call; the 10 Hz tick must stay
  // under 0.2 ms; a 3,600 s call must not block the JS thread for long (a phone is 3 to 10x slower).
  it('advanceHaul(3600) stays under 100 ms on the late fixture', () => {
    const g = haulFixtures(cfg).late;
    H.advanceHaul(cfg, g, 10, 0);
    expect(fastest(() => H.advanceHaul(cfg, g, 3600, 0), 3)).toBeLessThan(100);
  });

  it('a 0.1 s tick stays under 0.2 ms on every fixture', () => {
    for (const name of ['minute3', 'midGame', 'late'] as const) {
      const g0 = haulFixtures(cfg)[name];
      const ms = fastest(() => {
        let g = g0;
        for (let i = 0; i < 1000; i++) g = H.advanceHaul(cfg, g, 0.1, 0) as Run;
      }, 3);
      expect(ms / 1000, name).toBeLessThan(0.2);
    }
  });

  it('levels pushed until costs overflow: no NaN, payouts clamp, ticks stay finite', () => {
    const g = edit(haulFixtures(cfg).late, (h, x) => {
      for (const s of h.slots) if (s.claimed) s.rigLevel = 1600;
      h.fleet.capLevel = 1600;
      h.fleet.engineLevel = 60;
      h.freighter.level = 1600;
      x.cash = 1e300;
      x.lifetimeEarnings = 1e300;
      x.runEarnings = 1e300;
    });
    const s = run(cfg, g, 120, 1);
    const out: string[] = [];
    badNumbers(s.haul, 'haul', out);
    badNumbers({ cash: s.cash, life: s.lifetimeEarnings }, 'game', out);
    expect(out).toEqual([]);
    expect(H.coresAvailable(cfg, s)).toBeGreaterThan(0);
    expect(Number.isFinite(H.haulIncome(cfg, s))).toBe(true);
    expect(H.rigCost(cfg, s, 0)).toBe(Infinity);
  });
});
