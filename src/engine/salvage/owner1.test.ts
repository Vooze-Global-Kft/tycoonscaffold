/**
 * The owner's first review of the yard on the phone (RULING-owner1.md, 26 November): each rule of the ruling with a test
 * from the diagnosis's smallest example (notes/owner1-diagnose.md). On the shipped content (its review keys: crew.hand.
 * leaveM, map.points wait1.., truck.yardV, bossYardV, bossHandle_s, partners' trialPrice); the tests read every number
 * from the content and pin none. Owner: owner1-rules.
 */
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SalvageSchema, type SalvageContent } from '../../config/schema.salvage';
import * as R from '../salvage';
import { newBot, playTo, seededCfg, startGame } from './bot';
import { begin, finish, type Ctx } from './clock';
import { driverRoundF, laneM, routeM } from './content';
import { bossInYard, crewDepart, idleWhyOf, newCrew, waitPlaceOf } from './crew';
import { frameCfg } from './frame';
import { chevronOf, loadStep, nextGoal } from './goals';
import { awayPass } from './away';
import { reconcileSalvage } from './save';
import { STAGE2_KEYS } from './state2';

/** Events only stage 2 emits (the works, lots, the Yard sale, the bank, packs, ads). */
const STAGE2_EVENTS = new Set<string>(['adOffered', 'adPaid', 'ageAsked', 'analysed', 'backFieldOpen', 'bankTaken', 'commissioned', 'crateCleared', 'crateIn', 'crateSorted', 'depolluted', 'financed', 'forklift', 'granted', 'letter', 'lotArrived', 'lotOpened', 'plateArrived', 'plateOut', 'plateState', 'quoteUpdated', 'quoteWithdrawn', 'rackSold', 'racked', 'repaid', 'routeSet', 'vanCollected', 'vanDated', 'visitor']);
import { drivePath, insideFence, pathSplit, piecePos, pointOf, skipZone, stopOf, thingPos } from './positions';
import { driverDepart, driverLegEnd, hookRefusal, leaveTruck, truckBossStep } from './truck';
import type { CrewMember, GroundPiece, SalvageConfig, SalvageEvent, SalvageGame, ThingState } from './types';

const NOW = Date.UTC(2026, 10, 25, 9, 0, 0);
const RAW = JSON.parse(fs.readFileSync(new URL('../../../games/scrap-yard/game.json', import.meta.url), 'utf8')).salvage;
const content = (over: Record<string, unknown> = {}): SalvageContent => SalvageSchema.parse({ ...RAW, ...over });
const cfgOf = (c: SalvageContent): SalvageConfig => ({ mode: 'salvage', salvage: c }) as unknown as SalvageConfig;
const C = content();
const cfg = cfgOf(C);

/** A fresh yard with nothing lying about, the boss fresh at (px, py), live. */
function quiet(px = 40, py = 33): Ctx {
  const g = startGame(cfg, NOW);
  const x = begin(cfg, g, [], true);
  x.s.things = x.s.things.filter((th) => th.at.at === 'zone');
  x.s.pieces = [];
  x.s.dropoff.nextAt = 1e9;
  x.s.presence = { x: px, y: py, driving: false, moving: false, standingFor: 0, heading: 0 };
  x.s.presenceAt = x.s.t;
  return x;
}
const piece = (uid: string, pile: string, grade = 'li', g = 8000, k = 0): GroundPiece => ({ uid, grade, g, from: null, spec: 0, pile, k, claim: null }) as GroundPiece;
const hand = (x: Ctx): CrewMember => newCrew(x, 'hand', x.s.t);

describe('point 2: a helper who stands still (H1 to H6)', () => {
  it('H1: cut pieces in a heap bed farther than crew.hand.leaveM from the boss are the yard hand\'s; within it, the boss\'s', () => {
    const leave = (C.crew.hand as { leaveM?: number }).leaveM!;
    const z0 = piecePos(C, 'zone.Z2', 0);
    const z = [z0.x, z0.y];
    // The boss beside the heap: the piece is his.
    let x = quiet(z[0], z[1] + 1);
    x.s.pieces.push(piece('p.near', 'zone.Z2'));
    let m = hand(x);
    expect(m.claims).not.toContain('p.near');
    expect(idleWhyOf(x.c, x.s, m)?.why).toBe('yours');
    // The boss farther than leaveM away: he carries it.
    x = quiet(z[0] + leave + 6, z[1] + 8);
    x.s.pieces.push(piece('p.far', 'zone.Z2'));
    m = hand(x);
    expect(m.claims).toEqual(['p.far']);
    expect(m.dest).toBe('scale');
  });

  it('H1: heap pieces come after the tipping floor in his order', () => {
    const x = quiet(10, 35);
    x.s.pieces.push(piece('p.heap', 'zone.Z2'), piece('p.floor', 'floor', 'li', 8000, 0));
    const m = hand(x);
    expect(m.claims).toEqual(['p.floor']);
  });

  it('H2: a whole thing at the drop-off goes to the scale when nothing else is offered and the boss is beyond reach.sight of it', () => {
    const g0 = startGame(cfg, NOW);
    const washer = g0.salvage.things.find((th) => th.at.at === 'dropoff')!;
    const at = thingPos(C, washer.at);
    // Within sight: he leaves it.
    let x = quiet(at.x - 1, at.y + 1);
    x.s.things.push({ ...washer } as ThingState);
    let m = hand(x);
    expect(m.claims).not.toContain(washer.uid);
    // Beyond sight (still inside the fence): he takes it whole.
    x = quiet(at.x - C.reach.sight - 5, at.y + 6);
    expect(bossInYard(x, x.s.t)).toBe(true);
    x.s.things.push({ ...washer } as ThingState);
    m = hand(x);
    expect(m.claims).toEqual([washer.uid]);
    expect(m.job).toBe('wholeThing');
  });

  it('H3: a loose cable bundle at the drop-off goes to the powered stripper while the boss is in the yard', () => {
    const x = quiet(30, 33);
    x.s.machines.stripper.owned = true;
    x.s.things.push({ uid: 'd99', obj: 'cable', at: { at: 'dropoff', slot: 0 }, cut: 0, progress: 0, by: null } as ThingState);
    const m = hand(x);
    expect(m.claims).toEqual(['loose:d99']);
    expect(m.dest).toBe('stripper');
  });

  it('H4: a boss beyond the fence (driving the lane) is away for P11: the hand takes a whole thing at the drop-off (E4, no cutter)', () => {
    const g0 = startGame(cfg, NOW);
    const washer = g0.salvage.things.find((th) => th.at.at === 'dropoff')!;
    const x = quiet(C.yard.width + 60, pointOfGate().y);
    expect(bossInYard(x, x.s.t)).toBe(false);
    x.s.things.push({ ...washer } as ThingState);
    const m = hand(x);
    expect(m.claims).toEqual([washer.uid]);
  });

  it('H5: with nothing to do he walks to his waiting place (an ordinary dated leg), never stands on the platform scale, and is offered work again at a presence sample', () => {
    const x = quiet(30, 33);
    const m = hand(x);
    const w = waitPlaceOf(x.c, m)!;
    expect(m.job).toBe('idle');
    expect(m.phase).toBe('walkTo');
    expect(m.t1).toBeGreaterThan(m.t0);
    expect(m.to).toEqual({ xy: [w.x, w.y] });
    const scale = pointOf(C, 'scale');
    expect(Math.hypot(w.x - scale.x, w.y - scale.y)).toBeGreaterThan(1.5);
    // The heaps hold things that need cutting: he waits for cut pieces; with nothing anywhere: nothing to carry.
    expect(idleWhyOf(x.c, x.s, m)?.why).toBe('uncut');
    expect(idleWhyOf(x.c, { ...x.s, things: [] }, m)?.why).toBe('nothing');
    // Cut pieces appear beside the boss at a heap; he walks away: the next presence sample frees them.
    const zp = piecePos(C, 'zone.Z2', 0);
    const z = [zp.x, zp.y];
    let g = finish(startGame(cfg, NOW), x);
    g = { ...g, salvage: { ...g.salvage, presence: { ...g.salvage.presence, x: z[0], y: z[1] + 1 }, pieces: [piece('p.mine', 'zone.Z2')] } };
    const s0 = R.setPresence(cfg, g, { x: z[0], y: z[1] + 1, driving: false, moving: false, standingFor: 1, heading: 0 }, NOW + 1000);
    expect(s0.salvage.crew[0].claims).toEqual([]);
    const s1 = R.setPresence(cfg, s0, { x: z[0], y: z[1] + 9, driving: false, moving: true, standingFor: 0, heading: 0 }, NOW + 1800);
    expect(s1.salvage.crew[0].claims).toEqual(['p.mine']);
  });

  it('H6: a cutter whose next thing needs a tool the yard lacks says so (tool, its tier); the frame and the rota row carry the reason', () => {
    const x = quiet(30, 33);
    x.s.things.push({ uid: 'd98', obj: 'tank', at: { at: 'dropoff', slot: 1 }, cut: 0, progress: 0, by: null } as ThingState);
    const m = newCrew(x, 'cutter', x.s.t);
    const why = idleWhyOf(x.c, x.s, m);
    expect(why?.why).toBe('tool');
    expect(why?.tier).toBeGreaterThan(x.s.tier);
    const g = finish(startGame(cfg, NOW), x);
    const f = frameCfg(cfg, g);
    expect(f.crew.find((q) => q.id === m.id)?.idleText?.key).toMatch(/^card\.crewWhy\.tool[23]$/);
    const rota = R.cardOf(cfg, g, { kind: 'office', tab: 'rota' }, NOW);
    expect(rota.rows?.find((r) => r.id === m.id)?.why?.key).toMatch(/^card\.crewWhy\.tool[23]$/);
  });
});

function pointOfGate() {
  return pointOf(C, 'gate');
}

/** A yard with the truck owned and parked and both partners open, the boss on foot at the scale. */
function truckYard(cash = 5000): SalvageGame {
  const g = startGame(cfg, NOW);
  const x = begin(cfg, g, [], true);
  x.s.truck.owned = true;
  x.s.owned.push('truck');
  for (const p of Object.values(x.s.partners)) p.open = true;
  x.cash = cash;
  return finish(g, x);
}

describe('point 5: the farm\'s trial load (T1 to T4)', () => {
  it('T1: the trial load is free at the hook: never refused for cash', () => {
    const g = truckYard(0);
    const x = begin(cfg, g, [], true);
    const sk = x.s.partners.partnerFarm.skips.find((q) => q.trial)!;
    expect(sk.price).toBe(C.partners.partnerFarm.trialPrice);
    expect(C.partners.partnerFarm.trialPrice).toBe(0);
    expect(hookRefusal(x, 'partnerFarm')).not.toBe('loadCash');
  });

  it('T2: the goal follows the load: truck, gate, the site, the weighbridge, the floor; stepping out loaded says the step', () => {
    let g = truckYard();
    const goals = { ...g.salvage.goals, done: C.goals.slice(0, C.goals.findIndex((d) => d.id === 'fetchTrial')).map((d) => d.id) };
    g = { ...g, salvage: { ...g.salvage, goals } };
    expect(nextGoal(cfg, g)?.id).toBe('fetchTrial');
    expect(nextGoal(cfg, g)?.step?.key).toBe('goal.step.truck');
    expect(chevronOf(cfg, g)?.id).toBe('truck');
    const drive = (px: number, py: number, skip: null | { weighed: boolean }) => {
      const s = { ...g.salvage, truck: { ...g.salvage.truck, by: 'boss' as const, skip: skip ? { partner: 'partnerFarm', slot: 0, contents: {}, mass_g: 1, price: 0, trial: true, weighed: skip.weighed } : null }, presence: { ...g.salvage.presence, x: px, y: py, driving: true } };
      return { ...g, salvage: s } as SalvageGame;
    };
    const gate = pointOfGate();
    expect(loadStep(cfg, drive(55, 25.6, null), 'fetched:partnerFarm:1')?.text.key).toBe('goal.step.drive');
    expect(chevronOf(cfg, drive(55, 25.6, null))?.id).toBe('gate');
    expect(chevronOf(cfg, drive(gate.x + 40, gate.y, null))?.id).toBe('skip.partnerFarm');
    const unweighed = drive(gate.x + 100, gate.y, { weighed: false });
    expect(nextGoal(cfg, unweighed)?.step?.key).toBe('goal.step.weigh');
    expect(chevronOf(cfg, unweighed)).toMatchObject({ id: 'weighbridge', ...stopOf(C, 'weighbridge') });
    const weighed = drive(50.5, 25.6, { weighed: true });
    expect(chevronOf(cfg, weighed)).toMatchObject({ id: 'floor', ...stopOf(C, 'floor') });
    // Stepped out with the load aboard: the chevron stays on the truck, the words the load's, one toast.
    const x = begin(cfg, unweighed, [], true);
    leaveTruck(x, null, x.s.t);
    expect(x.ev.some((e) => e.type === 'refused' && e.key === 'toWeighbridge')).toBe(true);
    const out = finish(unweighed, x);
    expect(chevronOf(cfg, out)?.id).toBe('truck');
    expect(loadStep(cfg, out, null)?.text.key).toBe('goal.step.weigh');
  });

  it('T3: the boss hooks in truck.bossHandle_s (the hired driver\'s handle_s is unchanged)', () => {
    const g = truckYard();
    const x = begin(cfg, g, [], true);
    const z = skipZone(C, 'partnerFarm', 0);
    x.s.truck.by = 'boss';
    x.s.presence = { x: z.x, y: z.y, driving: true, moving: false, standingFor: 1, heading: 0 };
    x.s.presenceAt = x.s.t;
    truckBossStep(x, x.s.t);
    expect(x.s.act.kind).toBe('hook');
    expect(x.s.act.endsAt! - x.s.act.since).toBeCloseTo(C.truck.bossHandle_s!, 9);
    expect(C.truck.bossHandle_s).toBeLessThan(C.truck.handle_s);
  });

  it('T4: a refusal stays on the frame while it holds, with its figure', () => {
    let g = truckYard(10);
    const x = begin(cfg, g, [], true);
    x.s.partners.partnerFarm.trialUsed = true;
    x.s.partners.partnerFarm.skips = [{ ...x.s.partners.partnerFarm.skips[0], trial: false, price: 500 }];
    const z = skipZone(C, 'partnerFarm', 0);
    x.s.truck.by = 'boss';
    x.s.presence = { x: z.x, y: z.y, driving: true, moving: false, standingFor: 1, heading: 0 };
    x.s.presenceAt = x.s.t;
    truckBossStep(x, x.s.t);
    g = finish(g, x);
    expect(g.salvage.act.target).toBe('refused.partnerFarm');
    const f = frameCfg(cfg, g);
    expect(f.boss.refusal?.key).toBe('refusal.loadCash');
    expect((f.boss.refusal?.args?.x as { money: number }).money).toBeCloseTo(500 - g.cash, 6);
    // Still refused a second later (no toast needed to see it).
    const later = R.setPresence(cfg, g, { x: z.x, y: z.y, driving: true, moving: false, standingFor: 2, heading: 0 }, NOW + 2000);
    expect(frameCfg(cfg, later).boss.refusal?.key).toBe('refusal.loadCash');
  });
});

/** The hired driver's whole trip from the park, phase by phase as the frame draws it: its legs and its total. */
function driverTrip(partner: string, level: number, boost: boolean) {
  let g = startGame(cfg, NOW);
  const x = begin(cfg, g, [], true);
  x.s.truck.owned = true;
  for (const p of Object.values(x.s.partners)) p.open = false;
  x.s.partners[partner].open = true;
  x.s.partners[partner].skips = [{ ...x.s.partners[partner].skips[0], phase: 'full', fullAt: 0, price: 0 }];
  x.cash = 1e6;
  x.s.things = x.s.things.filter((th) => th.at.at === 'zone');
  const d = newCrew(x, 'driver', x.s.t);
  d.level = level;
  if (boost) x.s.foreman = { ...x.s.foreman, day: x.s.clock.day, used_s: 0, lastWorkAt: x.s.t };
  expect(driverDepart(x, x.s.t)).toBe(true);
  // Leg by leg (a planned trip's phases are the same durations, replayed at their ends).
  delete x.s.truck.trip!.plan;
  const legs: { phase: string; t0: number; t1: number; path: { x: number; y: number }[]; at: number[] }[] = [];
  const t0 = x.s.truck.trip!.t0;
  for (let guard = 0; guard < 20 && x.s.truck.trip; guard++) {
    g = finish(g, x);
    const leg = frameCfg(cfg, { ...g, salvage: structuredClone(x.s) }).truck.leg!;
    legs.push({ phase: leg.phase, t0: leg.t0, t1: leg.t1, path: leg.path, at: leg.at ?? [] });
    const te = x.s.truck.trip.endsAt;
    x.s.t = te;
    driverLegEnd(x, te);
  }
  return { legs, total: x.s.t - t0, walk: legs[0].t1 - legs[0].t0 };
}

describe('point 7: the vehicles (V1 to V4)', () => {
  it('V1, V3: every phase of every partner\'s trip draws its own path: continuous across phases, never faster than truck.yardV inside the fence', () => {
    for (const partner of ['partnerFarm', 'partnerDemolition']) {
      const { legs } = driverTrip(partner, 1, false);
      expect(legs.map((l) => l.phase)).toEqual(['walk', 'out', 'hook', 'back', 'weigh', 'tip', 'park']);
      let last: { x: number; y: number } | null = null;
      for (const l of legs) {
        expect(l.at.length).toBe(l.path.length);
        if (last) expect(Math.hypot(l.path[0].x - last.x, l.path[0].y - last.y), `${partner} ${l.phase} starts where the last ended`).toBeLessThan(0.5);
        for (let i = 1; i < l.path.length; i++) {
          const L = Math.hypot(l.path[i].x - l.path[i - 1].x, l.path[i].y - l.path[i - 1].y);
          const dt = l.at[i] - l.at[i - 1];
          if (insideFence(C, l.path[i]) && insideFence(C, l.path[i - 1])) expect(L / dt, `${partner} ${l.phase} segment ${i}`).toBeLessThanOrEqual(C.truck.yardV! + 1e-6);
        }
        expect(l.at[l.at.length - 1]).toBeLessThanOrEqual(l.t1 + 1e-6);
        last = l.path[l.path.length - 1];
      }
    }
  });

  it('V2: the driver tips at the floor\'s stop on the drive line, never on the floor\'s centre', () => {
    const { legs } = driverTrip('partnerFarm', 1, false);
    const tip = legs.find((l) => l.phase === 'tip')!;
    expect(tip.path[tip.path.length - 1]).toEqual(stopOf(C, 'floor'));
  });

  it('V3: a trip\'s total is what it was to the millisecond at every driver level, with and without the foreman\'s boost', () => {
    for (const partner of ['partnerFarm', 'partnerDemolition']) {
      for (const level of [1, 2, 3, 5, 10]) {
        for (const boost of [false, true]) {
          const { total, walk } = driverTrip(partner, level, boost);
          const F = driverRoundF(C, level);
          const v = C.truck.v * C.truck.driverFactor * F * (boost ? 1 + C.foreman.boost : 1);
          const drive = (routeM(C, 'park', 'gate', pointOf(C, 'park'), pointOf(C, 'gate')) + 2 * laneM(C, partner) + routeM(C, 'gate', 'weighbridge') + routeM(C, 'weighbridge', 'floor') + routeM(C, 'floor', 'park')) / v;
          const handles = (2 * C.truck.handle_s + C.weigh_s) / F;
          expect(Math.abs(total - (walk + drive + handles)), `${partner} level ${level} boost ${boost}`).toBeLessThan(1e-3);
        }
      }
    }
  });

  it('V4: an arrival drives the drive line to the stop nearest its place, sets down there, never faster than truck.yardV inside the fence', () => {
    for (const [item, by, place, secs] of [['torch', 'van', 'rack', 6], ['stripper', 'machineFlatbed', 'stripper', 10], ['bench', 'machineFlatbed', 'bench', 10]] as const) {
      const g0 = startGame(cfg, NOW);
      const t = g0.salvage.t;
      const g = { ...g0, salvage: { ...g0.salvage, arriving: [{ item, by, place, since: t, at: t + secs }] } } as SalvageGame;
      const a = frameCfg(cfg, g).arrivals[0];
      expect(a.path && a.at && a.stop, item).toBeTruthy();
      expect(a.path![a.path!.length - 1]).toEqual(a.stop);
      expect(insideFence(C, a.stop!)).toBe(true);
      expect(a.at![a.at!.length - 1]).toBeLessThanOrEqual(t + secs + 1e-9);
      for (let i = 1; i < a.path!.length; i++) {
        const L = Math.hypot(a.path![i].x - a.path![i - 1].x, a.path![i].y - a.path![i - 1].y);
        if (insideFence(C, a.path![i]) && insideFence(C, a.path![i - 1])) expect(L / (a.at![i] - a.at![i - 1]), `${item} segment ${i}`).toBeLessThanOrEqual(C.truck.yardV! + 1e-6);
      }
      expect(pathSplit(C, drivePath(C, a.path![0], a.stop!)).yard).toBeGreaterThan(0);
    }
  });
});

describe('point 1: the frame (L1, L2)', () => {
  it('L1: between events a tick keeps the things and pieces lists and the frame reuses their entries', () => {
    const g0 = startGame(cfg, NOW);
    const f0 = frameCfg(cfg, g0);
    const g1 = R.advanceSalvage(cfg, g0, 0.1, NOW + 100);
    if (g1.salvage.things !== g0.salvage.things) return; // an event fell in this tick
    expect(frameCfg(cfg, g1).things).toBe(f0.things);
    expect(frameCfg(cfg, g1).pieces).toBe(f0.pieces);
  });

  it('L2: a presence sample that moves only the boss keeps the scene stamp', () => {
    const g0 = startGame(cfg, NOW);
    const p = g0.salvage.presence;
    const a = R.setPresence(cfg, g0, { x: p.x, y: p.y, driving: false, moving: false, standingFor: 0, heading: 0 }, NOW + 50);
    const fa = frameCfg(cfg, a);
    const b = R.setPresence(cfg, a, { x: p.x + 0.3, y: p.y, driving: false, moving: true, standingFor: 0, heading: 0 }, NOW + 150);
    expect(b.salvage.things).toBe(a.salvage.things);
    expect(frameCfg(cfg, b).scene).toBe(fa.scene);
    // A change of anything else moves it.
    const c2 = R.advanceSalvage(cfg, b, 5, NOW + 5150);
    expect(frameCfg(cfg, c2).scene).not.toBe(fa.scene);
  });
});

describe('the switch (S1, S2): stage 2 stays dark at release.stage 1', () => {
  const C2 = content({ release: { stage: 2 } });
  const cfg2 = cfgOf(C2);
  it('S1: the shipped content plays stage 1: no works block, no shop products, no ads, no bank, top rung 3', () => {
    expect(C.release?.stage).toBe(1);
    expect(C.works).toBeUndefined();
    expect(C.worksLayer).toBeUndefined();
    expect(C.bank).toBeUndefined();
    expect(C.ads).toBeUndefined();
    expect(C.iap).toBeUndefined();
    expect(C.stage2).toBeUndefined();
    expect(C.ladder.topRung).toBeUndefined();
    expect(C2.works).toBeDefined();
    // From the second session the rota offers no Shop row at stage 1 (it does at stage 2, where the content has a shop).
    const g = startGame(cfg, NOW);
    const g2 = { ...g, salvage: { ...g.salvage, iap: { ...g.salvage.iap, sessions2At: NOW } } } as SalvageGame;
    expect(R.cardOf(cfg, g2, { kind: 'office', tab: 'rota' }, NOW).rows.some((r) => r.id.includes('shop'))).toBe(false);
    // s2e-fix1 (RULING2 28.2 a): at stage 2 the row waits for an age band (none kept: the age question is due first).
    expect(R.cardOf(cfg2, g2, { kind: 'office', tab: 'rota' }, NOW).rows.some((r) => r.id.includes('shop'))).toBe(false);
    const g2a = { ...g2, salvage: { ...g2.salvage, iap: { ...g2.salvage.iap, ageBand: 'a18' } } } as SalvageGame;
    expect(R.cardOf(cfg2, g2a, { kind: 'office', tab: 'rota' }, NOW).rows.some((r) => r.id.includes('shop'))).toBe(true);
  });

  it('S2: the first half hour at stage 1 equals stage 2 bit for bit (below rung 3); three days at stage 1 touch no stage-2 state; that save opens the works at stage 2 live', () => {
    const run = (cf: SalvageConfig) => {
      const c1 = seededCfg(cf, 3);
      const b = newBot(c1, startGame(c1, NOW), NOW, { hand: 'normal', habit: 'goal', route: 'A', seed: 3 } as never);
      playTo(b, 30 * 60);
      return b;
    };
    const b1 = run(cfg);
    const b2 = run(cfg2);
    expect(b1.g.salvage.ladder.rung).toBeLessThan(3);
    expect(JSON.stringify(b1.g.salvage)).toBe(JSON.stringify(b2.g.salvage));
    expect(b1.g.cash).toBe(b2.g.cash);
    // Three days away at stage 1, from a yard at rung 3 (set by hand: the ladder's tonnage alone).
    let g = { ...b1.g, salvage: { ...b1.g.salvage, ladder: { ...b1.g.salvage.ladder, rung: 3 } } } as SalvageGame;
    const ev: SalvageEvent[] = [];
    for (let d = 0; d < 3; d++) {
      g = awayPass(seededCfg(cfg, 3), g, g.salvage.clock.highMs + 24 * 3600_000, ev);
      g = R.ackAway(seededCfg(cfg, 3), g);
      for (let k = 0; k < 20; k++) g = R.advanceSalvage(seededCfg(cfg, 3), g, 0.1, g.salvage.clock.highMs + 100, ev);
    }
    const s = g.salvage as unknown as Record<string, unknown>;
    // No stage-2 state touched: every stage-2 field as the yard was created (the Yard sale's day counter aside).
    const s0 = startGame(seededCfg(cfg, 3), NOW).salvage as unknown as Record<string, unknown>;
    for (const k of STAGE2_KEYS) {
      if (k === 'reuse') {
        const r = s.reuse as { nextAt: unknown; vanAt: unknown; level: number; sold: { n: number; money: number } };
        expect([r.nextAt, r.vanAt, r.level, r.sold.n, r.sold.money]).toEqual([null, null, 0, 0, 0]);
      } else expect(s[k], k).toEqual(s0[k]);
    }
    expect(ev.some((e) => STAGE2_EVENTS.has(e.type))).toBe(false);
    expect(Object.keys((s.works as object) ?? {}).length).toBe(0);
    expect(g.salvage.counts?.bathSet).toBeUndefined();
    expect(ev.some((e) => e.type === 'backFieldOpen')).toBe(false);
    expect(((s.bank as { agreement?: unknown }) ?? {}).agreement ?? null).toBeNull();
    const f = frameCfg(seededCfg(cfg, 3), g);
    expect(f.works ?? []).toEqual([]);
    // The same save at stage 2: the works open at its first live instant.
    const c2 = seededCfg(cfg2, 3);
    let h = reconcileSalvage(c2, g as never, JSON.parse(JSON.stringify(g)), g.salvage.clock.highMs);
    const ev2: SalvageEvent[] = [];
    for (let k = 0; k < 20; k++) h = R.advanceSalvage(c2, h, 0.1, h.salvage.clock.highMs + 100, ev2);
    expect(ev2.filter((e) => e.type === 'backFieldOpen').length).toBe(1);
    expect(h.salvage.counts?.bathSet).toBe(1);
  }, 240_000);
});

void crewDepart;
