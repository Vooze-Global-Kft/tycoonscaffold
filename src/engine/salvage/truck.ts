/**
 * The hook-lift truck (yard-stage1.md 2.7, 2.12 "Driver"): driven by the boss (entered by walking into
 * it, left with Step out) or by the driver on a trip of dated phases (walk, out, hook, back, weigh, tip,
 * park). Hook: in the skip zone with the skip full, cash for its price and floor room for all of it, a
 * ring of handle_s, then the price is paid and an empty skip goes down. A load that cannot be tipped is
 * never paid for. Weigh-in on the weighbridge (gross, tare, net), then tip onto the tipping floor.
 * Owner: rules-sim.
 */
import { capOf } from './bays';
import { boostFactor, count, printTicket, spend, standingFor, ticketBase, type Ctx } from './clock';
import { laneM, legM, routeM, driverRoundF, pieceCount, pieceSpec } from './content';
import { atPlace } from './machines';
import { resolveGrams, roundMoney } from './money';
import { contentsMass_g, fullestSkip, pickFromRung, ratedLoadNet, setSkipDown } from './partners';
import { drivePath, pathSplit, pointOf, skipZone, stopOf, tripPhaseEnd } from './positions';
import { floorMass_g, floorSlot } from './things';
import { bossSees, planAhead, RUN_EPS } from './group';
import { tipDivert } from './crate';
import { landBody } from './works';
import { loadRanks } from './rate';
import type { CrewMember, RefusalKey, ThingState, TripPhase, TxtArgs } from './types';
import type { SalvageContent } from '../../config/schema.salvage';

/**
 * Grams still in a thing of `obj` with `cut` pieces off (waste and the pieces left), memoised per content
 * object (a pure function of the content): the hook's floor check runs at every instant the idle driver
 * waits for room (finding R3), and walking the piece specs each time was a fifth of an away pass.
 */
const REMAIN = new WeakMap<SalvageContent, Map<string, number[]>>();
function remainingRows(c: SalvageContent): Map<string, number[]> {
  let byObj = REMAIN.get(c);
  if (!byObj) REMAIN.set(c, (byObj = new Map()));
  return byObj;
}
function remainingRow(c: SalvageContent, byObj: Map<string, number[]>, obj: string): number[] {
  let row = byObj.get(obj);
  if (!row) {
    const o = c.objects[obj];
    const n = o ? pieceCount(c, obj) : 0;
    row = new Array(n + 1).fill(0);
    if (o) {
      row[n] = o.waste_g;
      for (let k = n - 1; k >= 0; k--) row[k] = row[k + 1] + (pieceSpec(c, obj, k)?.g ?? 0);
    } else row = [];
    byObj.set(obj, row);
  }
  return row;
}

/** Grams on the tipping floor: things.ts floorMass_g exactly, with the per-thing sum memoised (R3). */
export function floorGrams(x: Ctx): number {
  const byObj = remainingRows(x.c);
  let g = 0;
  const things = x.s.things;
  for (let i = 0; i < things.length; i++) {
    const th = things[i];
    if (th.at.at !== 'floor') continue;
    const row = remainingRow(x.c, byObj, th.obj);
    if (row.length) g += row[th.cut < 0 ? 0 : th.cut >= row.length ? row.length - 1 : th.cut];
  }
  const pieces = x.s.pieces;
  for (let i = 0; i < pieces.length; i++) if (pieces[i].pile === 'floor') g += pieces[i].g;
  return g;
}
void floorMass_g;

void capOf;

/** The partner whose skip zone (any slot) the point lies in, or null. */
function zoneAt(x: Ctx, px: number, py: number): string | null {
  for (const [id, ps] of Object.entries(x.s.partners)) {
    if (!x.c.partners[id]) continue;
    const n = Math.max(1, ps.skips.length);
    for (let slot = 0; slot < n; slot++) {
      const z = skipZone(x.c, id, slot);
      const m = x.c.truck.radius + x.c.reach.place;
      if (Math.abs(px - z.x) <= z.w / 2 + m && Math.abs(py - z.y) <= z.d / 2 + m) return id;
    }
  }
  return null;
}

/** Why the truck cannot hook a partner's skip now (2.7's label reasons), or null. `earmark` counts the driver's held cash. */
export function hookRefusal(x: Ctx, partner: string, forDriver = false, floor?: { g: number | null }): RefusalKey | null {
  const ps = x.s.partners[partner];
  if (!ps?.open) return 'noTruck';
  if (x.s.truck.skip) return 'nothing';
  const sk = fullestSkip(x, partner);
  if (!sk) return 'filling';
  const held = forDriver ? 0 : (x.s.truck.earmark?.money ?? 0);
  if (sk.price > x.cash - held + 1e-9) return 'loadCash';
  const heldFloor = forDriver ? 0 : (x.s.truck.earmark?.floor_g ?? 0);
  // The floor's grams once per caller (the idle driver asks for every partner at one instant, R3).
  let fg: number;
  if (floor) fg = floor.g ??= floorGrams(x);
  else fg = floorGrams(x);
  if (fg + heldFloor + sk.mass_g > x.c.floorRoom_kg * 1000) return 'floor';
  return null;
}

/** The hook is done (boss or driver): pay, take the skip, an empty skip goes down. */
function hookNow(x: Ctx, partner: string, by: 'boss' | 'driver', t: number): boolean {
  const sk = fullestSkip(x, partner);
  if (!sk) return false;
  const tr = x.s.truck;
  tr.earmark = null;
  spend(x, sk.price);
  if (x.away) {
    const b = (x.away.bought[partner] ??= { n: 0, spent: 0 });
    b.n += 1;
    b.spent = roundMoney(b.spent + sk.price);
  }
  tr.skip = { partner, slot: sk.slot, contents: { ...sk.contents }, mass_g: sk.mass_g, price: sk.price, trial: sk.trial, weighed: false };
  const ps = x.s.partners[partner];
  if (sk.trial) ps.trialUsed = true;
  x.ev.push({ type: 'hook', partner, slot: sk.slot, price: sk.price, by });
  setSkipDown(x, partner, sk.slot, t);
  return true;
}

/** The weighbridge's skip ticket (2.2): gross and tare each rounded to the bridge step, net their difference. */
function bridgeWeigh(x: Ctx, t: number): void {
  const tr = x.s.truck;
  const sk = tr.skip;
  if (!sk || sk.weighed) return;
  const tare = resolveGrams(((x.c.truck.tare_kg ?? 0) + (x.c.truck.skipTare_kg ?? 0)) * 1000, 'bridge');
  const gross = resolveGrams(tare + sk.mass_g, 'bridge');
  const ticket = printTicket(x, { ...ticketBase(x, t), kind: 'skipWeighIn' as const, partner: sk.partner, trial: sk.trial, gross_g: gross, tare_g: tare, net_g: gross - tare, paid: sk.price, things: Object.entries(sk.contents).map(([obj, n]) => ({ obj, n })) });
  sk.weighed = true;
  x.ev.push({ type: 'bridgeWeighIn', ticket });
}

/** Tip onto the floor: every thing of the skip on a floor slot (uids f<n>). */
function tipNow(x: Ctx, t: number): void {
  const tr = x.s.truck;
  const sk = tr.skip;
  if (!sk) return;
  // Stage 2 (2.9; s2a-fix): a load that is not a skip (the flatrack's car, the closed battery box) lands at its
  // own place (works.ts landBody; the stub never does): the trip then ends as a tip does, with no floor slot.
  if (landBody(x, sk, t)) {
    tr.skip = null;
    count(x, `fetched:${sk.partner}`);
    if (x.away) x.away.loads += 1;
    x.ev.push({ type: 'tip', partner: sk.partner, things: 0 });
    return;
  }
  let things = 0;
  // floorSlot's first free slot for each thing in turn, from one look at the floor.
  const used = new Set<number>();
  for (const q of x.s.things) if (q.at.at === 'floor') used.add((q.at as { slot: number }).slot);
  let slot = 0;
  for (const [obj, n] of Object.entries(sk.contents)) {
    for (let i = 0; i < n; i++) {
      const k = (x.s.counts!.floorThings ?? 0) + 1;
      x.s.counts!.floorThings = k;
      // Stage 2 (2.10.2): a share of a tipped load goes to the crate instead of the floor (crate.ts tipDivert;
      // the stub never diverts). A diverted thing takes no floor slot.
      const divert = tipDivert(x, { uid: `f${k}`, obj }, sk.partner, t);
      if (divert) {
        x.s.things.push({ uid: `f${k}`, obj, at: divert, cut: 0, progress: 0, by: null } as unknown as ThingState);
        things++;
        continue;
      }
      while (used.has(slot)) slot++;
      used.add(slot);
      x.s.things.push({ uid: `f${k}`, obj, at: { at: 'floor', slot }, cut: 0, progress: 0, by: null });
      things++;
    }
  }
  void floorSlot;
  tr.skip = null;
  count(x, `fetched:${sk.partner}`);
  if (x.away) x.away.loads += 1;
  x.ev.push({ type: 'tip', partner: sk.partner, things });
  void t;
}

/** owner1 T3: seconds the boss's own hook takes (content truck.bossHandle_s, else handle_s). */
export function bossHandleS(c: SalvageContent): number {
  return c.truck.bossHandle_s ?? c.truck.handle_s;
}

/** The boss drives (2.7): the truck goes where he drives it; hook, weigh and tip by standing still at their places. */
export function truckBossStep(x: Ctx, t: number): void {
  const s = x.s;
  const p = s.presence;
  const tr = s.truck;
  tr.x = p.x;
  tr.y = p.y;
  if (p.heading !== undefined) tr.heading = p.heading;
  const a = s.act;
  const still = !p.moving;
  if (a.endsAt !== null && (a.kind === 'hook' || a.kind === 'weigh' || a.kind === 'tip')) {
    if (still) return;
    // Moving restarts the ring.
    tr.hookSince = null;
    s.act = { kind: 'drive', target: null, since: t, endsAt: null };
  }
  if (!still) {
    if (s.act.target) s.act = { kind: 'drive', target: null, since: t, endsAt: null };
    return;
  }
  const stood = standingFor(x, t);
  if (stood < x.c.feel.workDelay) return;
  const zone = zoneAt(x, p.x, p.y);
  if (zone && !tr.skip) {
    const why = hookRefusal(x, zone);
    if (why) {
      if (s.act.target !== `refused.${zone}`) {
        const sk = fullestSkip(x, zone);
        const args: TxtArgs = why === 'loadCash' && sk ? { x: { money: sk.price - x.cash } } : why === 'floor' && sk ? { kg: { mass_g: sk.mass_g } } : {};
        x.ev.push({ type: 'refused', key: why, args, retry: null });
        s.act = { kind: 'drive', target: `refused.${zone}`, since: t, endsAt: null };
      }
      return;
    }
    const sk = fullestSkip(x, zone)!;
    tr.hookSince = t;
    // owner1 T3: the boss hooks in truck.bossHandle_s (the hired driver's handle_s stays).
    const hs = bossHandleS(x.c);
    s.act = { kind: 'hook', target: zone, since: t, endsAt: t + hs };
    x.ev.push({ type: 'hookRing', partner: zone, slot: sk.slot, t0: t, t1: t + hs });
    return;
  }
  if (tr.skip && !tr.skip.weighed && atPlace(x, 'weighbridge', p.x, p.y, x.c.reach.place + x.c.truck.radius)) {
    s.act = { kind: 'weigh', target: 'weighbridge', since: t, endsAt: t + x.c.weigh_s };
    return;
  }
  if (tr.skip && atPlace(x, 'floor', p.x, p.y, x.c.reach.place + x.c.truck.radius)) {
    if (!tr.skip.weighed) {
      if (s.act.target !== 'refused.floor') {
        x.ev.push({ type: 'refused', key: 'weighFirst', args: {}, retry: null });
        s.act = { kind: 'drive', target: 'refused.floor', since: t, endsAt: null };
      }
      return;
    }
    s.act = { kind: 'tip', target: 'floor', since: t, endsAt: t + x.c.truck.handle_s };
  }
}

/** A boss act of the truck ends. */
export function truckBossActEnd(x: Ctx, kind: string, t: number): void {
  const s = x.s;
  if (kind === 'hook' && s.act.target) {
    if (!hookRefusal(x, s.act.target)) hookNow(x, s.act.target, 'boss', t);
  } else if (kind === 'weigh') bridgeWeigh(x, t);
  else if (kind === 'tip') tipNow(x, t);
  s.truck.hookSince = null;
  s.act = { kind: s.truck.by === 'boss' ? 'drive' : 'none', target: null, since: t, endsAt: null };
}

/** Step out (2.15): the truck's stopped place and heading become state. */
export function leaveTruck(x: Ctx, at: { x: number; y: number; heading: number } | null, t: number): void {
  const tr = x.s.truck;
  if (at) {
    tr.x = at.x;
    tr.y = at.y;
    tr.heading = at.heading;
  }
  // owner1 T2: stepping out with a skip aboard not yet weighed or tipped says the load's next step (a toast).
  if (tr.by === 'boss' && tr.skip && x.c.truck.yardV !== undefined) x.ev.push({ type: 'refused', key: tr.skip.weighed ? 'toFloor' : 'toWeighbridge', args: {}, retry: null });
  tr.by = null;
  tr.hookSince = null;
  // Entering is disarmed until he has walked away from it (hand.ts bossStep; the world's rule, 17:30).
  x.s.counts!['truck:out'] = 1;
  x.s.act = { kind: 'none', target: null, since: t, endsAt: null };
  x.ev.push({ type: 'leaveTruck' });
}

// ---------------------------------------------------------------------------------------- the driver

/** The driver's level factor F (E31a: his whole round, driving and handling, is shortened by it). */
function driverF(x: Ctx): number {
  return driverRoundF(x.c, x.s.crew.find((m) => m.role === 'driver')?.level ?? 1);
}

/** The driver's truck speed, m/s: truck.v × driverFactor × F × the foreman's boost. */
function driverV(x: Ctx): number {
  return x.c.truck.v * x.c.truck.driverFactor * driverF(x) * boostFactor(x, x.s.t);
}

const pt = (x: Ctx, id: string) => pointOf(x.c, id);

/** owner1 V3: is the yard's speed limit on (content truck.yardV)? Off: the first yard's trips, bit for bit. */
const yardLimit = (x: Ctx): boolean => x.c.truck.yardV !== undefined;

/** The drive of a path at the trip's speeds, seconds (V3: each segment at its side of the fence's speed). */
function driveS(x: Ctx, path: { x: number; y: number }[], sp: { vy: number; vl: number }): number {
  const L = pathSplit(x.c, path);
  return L.yard / sp.vy + L.lane / sp.vl;
}

/**
 * owner1 V3: a driver's trip speeds, fixed at its departure from `from`: inside the fence min(truck.yardV, his speed);
 * on the lane the speed that makes the trip's drive last what it did at his one speed (routeM's park-gate, gate-
 * weighbridge, weighbridge-floor and floor-park and the lane twice, at driverV), so the trip's total, at every level and
 * boost, is unchanged; at most truck.laneMaxF times his speed (a trip that starts far from the park may then last longer).
 */
function tripSpeeds(x: Ctx, from: { x: number; y: number }, partner: string, slot: number): { vy: number; vl: number } {
  const c = x.c;
  const v = driverV(x);
  const vy = Math.min(c.truck.yardV ?? v, v);
  const gate = pt(x, 'gate');
  const D = (routeM(c, 'park', 'gate', from, gate) + 2 * laneM(c, partner) + routeM(c, 'gate', 'weighbridge') + routeM(c, 'weighbridge', 'floor') + routeM(c, 'floor', 'park')) / v;
  let yard = 0;
  let lane = 0;
  let at = from;
  for (const ph of ['out', 'back', 'tip', 'park']) {
    const end = tripPhaseEnd(c, ph, partner, slot, at);
    const L = pathSplit(c, drivePath(c, at, end));
    yard += L.yard;
    lane += L.lane;
    at = end;
  }
  if (lane <= 0) return { vy, vl: v };
  const laneT = Math.max(D - yard / vy, lane / (v * (c.truck.laneMaxF ?? 4)));
  return { vy, vl: lane / laneT };
}

/** The trip's speeds (its own, else, for a save made before them, computed now from the park). */
function speedsOf(x: Ctx): { vy: number; vl: number } {
  const trip = x.s.truck.trip!;
  return trip.speeds ?? (trip.speeds = tripSpeeds(x, pt(x, 'park'), trip.partner, trip.slot));
}

/** owner1 V1 to V3: the drive of a phase from where the truck stands to the phase's end (tripPhaseEnd), seconds. */
function phaseDrive(x: Ctx, phase: string, from: { x: number; y: number }): number {
  const trip = x.s.truck.trip!;
  const end = tripPhaseEnd(x.c, phase, trip.partner, trip.slot, from);
  if (Math.hypot(end.x - from.x, end.y - from.y) < 1e-6) return 0;
  return driveS(x, drivePath(x.c, from, end), speedsOf(x));
}

/** May the idle driver depart now (2.12)? The partner whose skip has been full longest, cash and room allowing; earmarked at departure. */
export function driverDepart(x: Ctx, t: number): boolean {
  const s = x.s;
  const tr = s.truck;
  const d = s.crew.find((m) => m.role === 'driver' && m.job === 'idle' && m.phase === 'wait' && m.t1 <= t + 1e-6);
  if (!d || !tr.owned || tr.by !== null || tr.trip || s.arriving.some((a) => a.item === 'truck')) return false;
  // R2: a loaded truck the boss left (Step out with a skip on it): the driver walks to it and finishes the
  // weigh-in and the tip (live and away), as driverTakesOver does for a truck the boss was driving.
  if (tr.skip) return driverFinishes(x, d, t);
  let best: { partner: string; fullAt: number; price: number; mass: number } | null = null;
  const floor = { g: null as number | null };
  if (s.ladder.rung >= pickFromRung(x.c)) best = bestLoad(x, floor);
  else
    for (const id in s.partners) {
      if (!x.c.partners[id]) continue;
      const sk = fullestSkip(x, id);
      if (!sk || hookRefusal(x, id, false, floor)) continue;
      if (!best || sk.fullAt < best.fullAt) best = { partner: id, fullAt: sk.fullAt, price: sk.price, mass: sk.mass_g };
    }
  if (!best) return false;
  const sk = fullestSkip(x, best.partner)!;
  tr.earmark = { money: best.price, floor_g: best.mass };
  const from = { x: d.to && 'xy' in d.to ? d.to.xy[0] : pt(x, 'scalehouse').x, y: d.to && 'xy' in d.to ? d.to.xy[1] : pt(x, 'scalehouse').y };
  const walk = legM(x.c, from, { x: tr.x, y: tr.y }) / x.c.crew.hand.v / driverF(x);
  tr.trip = { partner: best.partner, slot: sk.slot, phase: 'walk', t0: t, endsAt: t + walk };
  if (yardLimit(x)) tr.trip.speeds = tripSpeeds(x, { x: tr.x, y: tr.y }, best.partner, sk.slot);
  d.job = 'drive';
  d.phase = 'wait';
  d.from = { xy: [from.x, from.y] };
  d.to = { truck: true };
  d.t0 = t;
  d.t1 = t;
  tr.by = 'driver';
  x.ev.push({ type: 'crewLeg', id: d.id, job: 'drive', from: d.from, to: d.to, t0: t, t1: t + walk });
  // 2.1: with no boss within sight of the truck, the partner's skip zone or the floor, the whole trip is
  // planned now with one dated end (its phases replayed at their planned times when it lands).
  const z = skipZone(x.c, best.partner, sk.slot);
  if (planAhead(x) && !bossSees(x, t, [{ x: tr.x, y: tr.y }, { x: z.x, y: z.y }], ['floor'])) planTrip(x, t);
  return true;
}

/**
 * RULING2.md 16.1 (b) to (e) with 16.5's rank, from rung `truck.pickFromRung`: the load the hired driver departs for.
 * Every open partner with a full skip is ranked by its rated net a load over the time the load costs the yard's
 * slowest step (rate.ts loadRanks: the truck's round trip, its cutting over the cutters, its carrying over the hands;
 * from the content and the yard's assets, cached on rated income's asset key; without a replay, the net alone); equal
 * ranks: the skip full longest, then the partner's id. He takes the best-ranked one the yard can pay for whose load
 * fits the tipping floor (b); while a BETTER-ranked partner has a full skip the yard can pay for that does not fit,
 * he takes nothing and waits: the floor's room is kept for the load that pays best (c). A skip the yard cannot pay
 * for blocks nobody (e; Hold's rule 14.6 is bays.ts holdRelease's, unchanged), nor does one heavier than the whole
 * floor (it could never fit: no dead end). Null: wait.
 */
function bestLoad(x: Ctx, floor: { g: number | null }): { partner: string; fullAt: number; price: number; mass: number } | null {
  const top = rankTop(x, floor);
  return top && top.fits ? { partner: top.partner, fullAt: top.fullAt, price: top.price, mass: top.mass } : null;
}

/** bestLoad's best-ranked full skip among those that may block (payable; fits now: `fits`), or null. */
function rankTop(x: Ctx, floor: { g: number | null }): { partner: string; fullAt: number; price: number; mass: number; net: number; fits: boolean } | null {
  const s = x.s;
  let top: { partner: string; fullAt: number; price: number; mass: number; net: number; fits: boolean } | null = null;
  let ranks: Readonly<Record<string, number>> | null | undefined;
  for (const id in s.partners) {
    if (!x.c.partners[id]) continue;
    const sk = fullestSkip(x, id);
    if (!sk) continue;
    const why = hookRefusal(x, id, false, floor);
    // 'floor' is asked after the cash: such a skip is one the yard can pay for that does not fit now.
    const blocks = why === 'floor' && sk.mass_g <= x.c.floorRoom_kg * 1000;
    if (why && !blocks) continue;
    if (ranks === undefined) ranks = loadRanks(x.c, s);
    const net = ranks ? (ranks[id] ?? -Infinity) : ratedLoadNet(x.c, id);
    if (!top || net > top.net || (net === top.net && (sk.fullAt < top.fullAt || (sk.fullAt === top.fullAt && id < top.partner)))) top = { partner: id, fullAt: sk.fullAt, price: sk.price, mass: sk.mass_g, net, fits: !why };
  }
  return top;
}

/**
 * RULING2.md 16.6 (the card's reason; no words here): is this partner's full skip one the hired driver leaves standing
 * because he keeps the tipping floor's room for a better-ranked load that does not fit yet (16.1 c)? True only from
 * truck.pickFromRung, with the driver hired and idle, the truck owned and free, this skip payable and fitting, and the
 * best-ranked skip another partner's that does not fit. A read: nothing is changed.
 */
export function keptForBetter(c: SalvageContent, g: { cash: number; salvage: Ctx['s'] }, partner: string): boolean {
  const s = g.salvage;
  if (s.ladder.rung < pickFromRung(c) || !s.truck.owned || s.truck.by !== null || s.truck.trip || s.truck.skip) return false;
  if (!s.crew.some((m) => m.role === 'driver' && m.job === 'idle')) return false;
  const x = { c, s, cash: g.cash } as unknown as Ctx;
  const floor = { g: null as number | null };
  if (!fullestSkip(x, partner) || hookRefusal(x, partner, false, floor)) return false;
  const top = rankTop(x, floor);
  return !!top && !top.fits && top.partner !== partner;
}

const PHASES: TripPhase[] = ['walk', 'out', 'hook', 'back', 'weigh', 'tip', 'park'];

/** Each phase's end of the trip just begun (walk .. park), with the durations driverLegEnd gives them at departure. */
function planTrip(x: Ctx, t: number): void {
  const tr = x.s.truck;
  const trip = tr.trip!;
  const v = driverV(x);
  const F = driverF(x);
  const gate = pt(x, 'gate');
  const e: number[] = [trip.endsAt];
  const add = (dur: number) => e.push(e[e.length - 1] + Math.max(0, dur));
  if (yardLimit(x)) {
    // V1 to V3: each phase's drive along its own path, from where the previous one ended.
    const z = skipZone(x.c, trip.partner, trip.slot);
    const wb = stopOf(x.c, 'weighbridge');
    const fl = stopOf(x.c, 'floor');
    add(phaseDrive(x, 'out', { x: tr.x, y: tr.y }));
    add(x.c.truck.handle_s / F);
    add(phaseDrive(x, 'back', { x: z.x, y: z.y }));
    add(x.c.weigh_s / F);
    add(phaseDrive(x, 'tip', wb) + x.c.truck.handle_s / F);
    add(phaseDrive(x, 'park', fl));
    trip.plan = { t0: t, ends: e, x: tr.x, y: tr.y };
    void v;
    return;
  }
  add((routeM(x.c, 'park', 'gate', { x: tr.x, y: tr.y }, gate) + laneM(x.c, trip.partner)) / v);
  add(x.c.truck.handle_s / F);
  add((laneM(x.c, trip.partner) + routeM(x.c, 'gate', 'weighbridge')) / v);
  add(x.c.weigh_s / F);
  add(routeM(x.c, 'weighbridge', 'floor') / v + x.c.truck.handle_s / F);
  add(routeM(x.c, 'floor', 'park') / v);
  trip.plan = { t0: t, ends: e, x: tr.x, y: tr.y };
}

/**
 * Replay a planned trip's phases whose end is at or before `upto` at their planned instants (the hook
 * paid, the empty skip set down at the hook's time, the bridge ticket at the weigh's end, the load
 * tipped); the trip goes on leg by leg in the phase under way, or ends parked. A skip set down by the
 * replay that would already be full fills at the landing (it cannot be dated before now).
 */
function replayTrip(x: Ctx, upto: number): void {
  const tr = x.s.truck;
  const trip = tr.trip;
  const plan = trip?.plan;
  if (!trip || !plan) return;
  delete trip.plan;
  tr.x = plan.x;
  tr.y = plan.y;
  trip.phase = 'walk';
  trip.t0 = plan.t0;
  trip.endsAt = plan.ends[0];
  const partner = trip.partner;
  for (let i = 0; i < PHASES.length; i++) {
    const te = plan.ends[i];
    if (te > upto + RUN_EPS) break;
    driverLegEnd(x, te);
    if (!tr.trip) break;
    tr.trip.t0 = te;
    tr.trip.endsAt = plan.ends[i + 1] ?? te;
  }
  const now = x.s.t;
  for (const sk of x.s.partners[partner]?.skips ?? []) if (sk.phase === 'filling' && sk.fullAt < now - RUN_EPS) sk.fullAt = now;
}

/** 2.1: OPEN the truck's planned trip when the boss comes within sight of it (hand.ts bossStep). */
export function openTripInSight(x: Ctx, t: number): void {
  const trip = x.s.truck.trip;
  if (!trip?.plan) return;
  const z = skipZone(x.c, trip.partner, trip.slot);
  if (bossSees(x, t, [{ x: trip.plan.x, y: trip.plan.y }, { x: z.x, y: z.y }], ['floor'])) replayTrip(x, t);
}

/** The phase of a planned trip under way at the draft's clock, in the truck's shown fields (the frame's; tick.ts after every advance). */
export function showTrip(x: Ctx): void {
  const tr = x.s.truck;
  const trip = tr.trip;
  const plan = trip?.plan;
  if (!trip || !plan) return;
  const t = x.s.t;
  let i = plan.ends.findIndex((e) => e > t + RUN_EPS);
  if (i < 0) i = plan.ends.length - 1;
  trip.phase = PHASES[i];
  trip.t0 = i === 0 ? plan.t0 : plan.ends[i - 1];
  trip.endsAt = plan.ends[i];
  const z = skipZone(x.c, trip.partner, trip.slot);
  // Where the truck stands at the phase's start (V1: back starts at the skip, tip on the weighbridge's stop, park at the floor's stop).
  const at = yardLimit(x)
    ? i <= 1 ? { x: plan.x, y: plan.y } : i <= 3 ? { x: z.x, y: z.y } : i <= 5 ? stopOf(x.c, 'weighbridge') : stopOf(x.c, 'floor')
    : i <= 1 ? { x: plan.x, y: plan.y } : i === 2 ? { x: z.x, y: z.y } : i === 3 ? pt(x, 'gate') : i === 4 ? pt(x, 'weighbridge') : pt(x, 'floor');
  tr.x = at.x;
  tr.y = at.y;
}

/** The dated end of the truck's trip: a planned trip's last phase, else the phase's own end. */
export function tripEndsAt(trip: NonNullable<Ctx['s']['truck']['trip']>): number {
  return trip.plan ? trip.plan.ends[trip.plan.ends.length - 1] : trip.endsAt;
}

/** R2: the idle driver takes a loaded, parked truck: walk to it, drive to the weighbridge (or, weighed, on to the floor). */
function driverFinishes(x: Ctx, d: CrewMember, t: number): boolean {
  const tr = x.s.truck;
  const sk = tr.skip;
  if (!sk) return false;
  const from = { x: d.to && 'xy' in d.to ? d.to.xy[0] : pt(x, 'scalehouse').x, y: d.to && 'xy' in d.to ? d.to.xy[1] : pt(x, 'scalehouse').y };
  const walk = legM(x.c, from, { x: tr.x, y: tr.y }) / x.c.crew.hand.v / driverF(x);
  let drive = legM(x.c, { x: tr.x, y: tr.y }, pt(x, 'weighbridge')) / driverV(x);
  // V1, V3: along the drive line to the weighbridge's stop, at the yard's speed (no lane: this trip may last longer).
  const sp = yardLimit(x) ? { vy: Math.min(x.c.truck.yardV!, driverV(x)), vl: driverV(x) } : null;
  if (sp) drive = driveS(x, drivePath(x.c, { x: tr.x, y: tr.y }, stopOf(x.c, 'weighbridge')), sp);
  tr.trip = { partner: sk.partner, slot: sk.slot, phase: sk.weighed ? 'weigh' : 'back', t0: t, endsAt: t + walk + drive, ...(sp ? { speeds: sp } : {}) };
  tr.earmark = null;
  d.job = 'drive';
  d.phase = 'wait';
  d.from = { xy: [from.x, from.y] };
  d.to = { truck: true };
  d.t0 = t;
  d.t1 = t;
  tr.by = 'driver';
  x.ev.push({ type: 'crewLeg', id: d.id, job: 'drive', from: d.from, to: d.to, t0: t, t1: t + walk });
  return true;
}

/** The driver's trip changes phase at t (truck.trip.endsAt). */
export function driverLegEnd(x: Ctx, t: number): void {
  const s = x.s;
  const tr = s.truck;
  const trip = tr.trip;
  if (!trip) return;
  if (trip.plan) {
    replayTrip(x, Infinity);
    return;
  }
  const v = driverV(x);
  const F = driverF(x);
  const gate = pt(x, 'gate');
  const z = skipZone(x.c, trip.partner, trip.slot);
  const next = (phase: typeof trip.phase, dur: number, at?: { x: number; y: number }) => {
    if (at) {
      tr.x = at.x;
      tr.y = at.y;
    }
    trip.phase = phase;
    trip.t0 = t;
    trip.endsAt = t + Math.max(0, dur);
  };
  if (yardLimit(x)) {
    // owner1 V1 to V3: each phase drives its own path from where the truck stands (the frame draws the same path).
    const here = { x: tr.x, y: tr.y };
    const wb = stopOf(x.c, 'weighbridge');
    const fl = stopOf(x.c, 'floor');
    switch (trip.phase) {
      case 'walk':
        next('out', phaseDrive(x, 'out', here));
        return;
      case 'out':
        next('hook', x.c.truck.handle_s / F, { x: z.x, y: z.y });
        return;
      case 'hook':
        if (!hookNow(x, trip.partner, 'driver', t)) tr.earmark = null;
        next('back', phaseDrive(x, 'back', { x: z.x, y: z.y }), { x: z.x, y: z.y });
        return;
      case 'back':
        next('weigh', x.c.weigh_s / F, wb);
        return;
      case 'weigh':
        bridgeWeigh(x, t);
        next('tip', phaseDrive(x, 'tip', wb) + x.c.truck.handle_s / F, wb);
        return;
      case 'tip':
        tipNow(x, t);
        next('park', phaseDrive(x, 'park', fl), fl);
        return;
      case 'park':
        break;
    }
  }
  switch (trip.phase) {
    case 'walk':
      next('out', (routeM(x.c, 'park', 'gate', { x: tr.x, y: tr.y }, gate) + laneM(x.c, trip.partner)) / v);
      return;
    case 'out':
      next('hook', x.c.truck.handle_s / F, { x: z.x, y: z.y });
      return;
    case 'hook': {
      // The earmark guaranteed the price and the room; a skip taken meanwhile (it cannot be) ends the trip empty.
      if (!hookNow(x, trip.partner, 'driver', t)) tr.earmark = null;
      next('back', (laneM(x.c, trip.partner) + routeM(x.c, 'gate', 'weighbridge')) / v, { x: gate.x, y: gate.y });
      return;
    }
    case 'back':
      next('weigh', x.c.weigh_s / F, pt(x, 'weighbridge'));
      return;
    case 'weigh':
      bridgeWeigh(x, t);
      next('tip', routeM(x.c, 'weighbridge', 'floor') / v + x.c.truck.handle_s / F, pt(x, 'floor'));
      return;
    case 'tip':
      tipNow(x, t);
      next('park', routeM(x.c, 'floor', 'park') / v, pt(x, 'floor'));
      return;
    case 'park': {
      const park = pt(x, 'park');
      tr.x = park.x;
      tr.y = park.y;
      tr.trip = null;
      tr.by = null;
      const d = s.crew.find((m) => m.role === 'driver');
      if (d) {
        d.job = 'idle';
        d.phase = 'wait';
        d.from = { xy: [park.x, park.y] };
        d.to = { xy: [park.x, park.y] };
        d.t0 = t;
        d.t1 = t;
      }
    }
  }
}

/** The boss left a loaded truck when going away (2.16): the driver (when hired) finishes the weigh-in and the tip. */
export function driverTakesOver(x: Ctx, t: number): void {
  const tr = x.s.truck;
  if (tr.by !== 'boss') return;
  tr.by = null;
  x.s.act = { kind: 'none', target: null, since: t, endsAt: null };
  const d = x.s.crew.find((m) => m.role === 'driver');
  if (!d || !tr.skip) return;
  tr.by = 'driver';
  d.job = 'drive';
  if (yardLimit(x)) {
    const sp = { vy: Math.min(x.c.truck.yardV!, driverV(x)), vl: driverV(x) };
    const drive = driveS(x, drivePath(x.c, { x: tr.x, y: tr.y }, stopOf(x.c, 'weighbridge')), sp);
    tr.trip = { partner: tr.skip.partner, slot: tr.skip.slot, phase: tr.skip.weighed ? 'weigh' : 'back', t0: t, endsAt: t + drive, speeds: sp };
    return;
  }
  tr.trip = { partner: tr.skip.partner, slot: tr.skip.slot, phase: tr.skip.weighed ? 'weigh' : 'back', t0: t, endsAt: t + legM(x.c, { x: tr.x, y: tr.y }, pt(x, 'weighbridge')) / driverV(x) };
}

void contentsMass_g;
