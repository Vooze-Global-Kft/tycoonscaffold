/**
 * What one tick does (section 2.4): `advanceHaul` cuts dt into steps of at most 0.25 s, each ending
 * early at a freighter phase change, rock depletion, respawn, warm-up end, seam start or end, flare
 * refill or (with the autopilot on `full`) the hold filling, so 10 Hz and 1 s ticks agree. Per step:
 * hold sharing, drilling and hauling, the Overflow Chute, crumbling, respawns, the freighter, rich
 * seams, unlocks and flare charges. The engine is rate-based: no drone is simulated.
 *
 * Internals work on a private copy of the run (mutated in place, then returned as new state), the
 * way the existing engine treats a draft; callers never see a half-updated state.
 */
import { hashString } from '../rng';
import { placeRock } from './create';
import { EPS, MAX_CASH, fillsFreighter, haulParams, holdTotal, rngMix4, roll, sumUnits, T, starLevel } from './params';
import { activeContract, boardPlaces, contractBasis, drawContract, loadCargo, noteShipped, openBoard, payoutFor, refloorOffers, resizeOrders, shiftDoubles, steadyPerLaunch, topUpBoard, wantLeft } from './trade';
import type { HaulConfig, HaulEvent, HaulGame, HaulParams, HaulState, SeamState } from './types';

/** Longest step of the rate model. */
export const STEP = 0.25;
/** Longest dt one call simulates (longer gaps go through fastForward). */
export const MAX_TICK = 3600;

type Run = HaulGame & { haul: HaulState };

/** Mutable working set of one tick or action. */
export interface Draft {
  g: Run;
  h: HaulState;
  earned: number;
  stats: Run['stats'];
  chests: Run['chests'];
  haulStats: Run['haulStats'];
  events: HaulEvent[] | undefined;
}

/** Copies the parts of a run a tick or action may change. */
export function draftOf(g: Run, events?: HaulEvent[]): Draft {
  const s = g.haul;
  const h: HaulState = {
    ...s,
    slots: s.slots.map((x) => ({ ...x })),
    fleet: { ...s.fleet },
    hold: { ...s.hold },
    freighter: { ...s.freighter, cargo: { ...s.freighter.cargo } },
    autopilot: { ...s.autopilot },
    contracts: { ...s.contracts, board: s.contracts.board.map((c) => ({ ...c, wants: c.wants.map((w) => ({ ...w })) })) },
    vein: { ...s.vein, guests: [...s.vein.guests] },
    flare: { ...s.flare, guests: [...s.flare.guests] },
    flags: { ...s.flags },
    hintsShown: { ...s.hintsShown },
    marks: { ...s.marks },
    counters: { ...s.counters },
  };
  return { g, h, earned: 0, stats: { ...g.stats }, chests: { ...g.chests, owned: { ...g.chests.owned } }, haulStats: { ...g.haulStats }, events };
}

/** Builds the new state from a draft (cash added through the same clamp as economy.earn). */
export function commit(d: Draft): Run {
  const add = Math.min(Math.max(0, d.earned), MAX_CASH);
  const g = d.g;
  return {
    ...g,
    cash: add > 0 ? Math.min(g.cash + add, MAX_CASH) : g.cash,
    runEarnings: add > 0 ? Math.min(g.runEarnings + add, MAX_CASH) : g.runEarnings,
    lifetimeEarnings: add > 0 ? Math.min(g.lifetimeEarnings + add, MAX_CASH) : g.lifetimeEarnings,
    stats: d.stats,
    chests: d.chests,
    haulStats: d.haulStats,
    haul: d.h,
  };
}

/** Params of the draft's current run. */
export function draftParams(cfg: HaulConfig, d: Draft): HaulParams {
  return haulParams(cfg, { ...d.g, starMap: d.g.starMap, haul: d.h });
}

/** Adds a pod (a chest of meta.chests) to the inventory. Unknown ids are ignored. */
export function grantPod(cfg: HaulConfig, d: Draft, pod: string, reason: Extract<HaulEvent, { type: 'podEarned' }>['reason']): void {
  if (!cfg.meta.chests.some((c) => c.id === pod)) return;
  d.chests.owned[pod] = (d.chests.owned[pod] ?? 0) + 1;
  d.events?.push({ type: 'podEarned', pod, reason });
}

/**
 * Warm-up of a route that had no drones: first delivery after one outbound leg and the load time.
 * `delivered` restarts too, so the first `unload` band comes c units after the first delivery
 * (errata 24: units since the rock arrived or since the route went from 0 to 1 drone).
 */
export function warmUp(cfg: HaulConfig, p: HaulParams, h: HaulState, slot: number): void {
  const s = h.slots[slot];
  if (s.haulers === 0) {
    s.routeFrom = h.clock + p.slots[slot].distance / p.v + cfg.haul.drone.loadSeconds;
    s.delivered = 0;
  }
}

/** The seam (natural or flare) that is active on a slot, or null. */
export function seamAt(h: HaulState, slot: number): SeamState | null {
  if (h.vein.slot === slot && h.vein.until > h.clock) return h.vein;
  if (h.flare.slot === slot && h.flare.until > h.clock) return h.flare;
  return null;
}

/** A drone left a seam slot during the seam (moved or recalled): pop the last guest entry (errata 16). */
export function dropGuest(h: HaulState, slot: number): void {
  const seam = seamAt(h, slot);
  if (seam && seam.guests.length > 0) seam.guests.pop();
  // Never more entries than drones (an old save, a seam that just ended).
  for (const x of [h.vein, h.flare]) if (x.slot === slot && x.guests.length > h.slots[slot].haulers) x.guests.length = h.slots[slot].haulers;
}

/**
 * A drone landed on `slot` from `origin` (-1 = the rack). On an active seam it pushes its origin
 * (errata 16) and counts `stats.seamDrags` only when the stack grows past the largest size it has
 * reached during this seam, so moving the same drone off and back counts once.
 */
export function landOnSeam(d: Draft, slot: number, origin: number): void {
  const seam = seamAt(d.h, slot);
  if (!seam) return;
  seam.guests.push(origin);
  if (seam.guests.length > (seam.peak ?? 0)) {
    seam.peak = seam.guests.length;
    d.stats.seamDrags += 1;
  }
}

/**
 * A seam ended (its time ran out, or its rock crumbled): the guests go back newest first, one drone
 * per entry and at most the slot's drones, each to its origin route (warm-up where the origin had
 * none) or to the rack.
 */
export function endSeam(cfg: HaulConfig, d: Draft, p: HaulParams, seam: SeamState, flare: boolean): void {
  const h = d.h;
  const slot = seam.slot;
  if (slot === null) return;
  const s = h.slots[slot];
  for (let k = seam.guests.length - 1; k >= 0; k--) {
    const origin = seam.guests[k];
    if (s.haulers <= 0) break;
    s.haulers -= 1;
    const o = origin >= 0 ? h.slots[origin] : undefined;
    if (o && o.claimed && origin !== slot) {
      warmUp(cfg, p, h, origin);
      o.haulers += 1;
    } else h.idle += 1;
  }
  seam.guests = [];
  seam.peak = 0;
  seam.slot = null;
  d.events?.push({ type: 'veinEnd', slot, flare });
}

/** Seam length: duration + senseDuration × S(Seam Sense). */
export function seamDuration(cfg: HaulConfig, g: HaulGame): number {
  return cfg.haul.seam.duration + cfg.haul.seam.senseDuration * starLevel(cfg, g.starMap, 'seamSense');
}

/**
 * Launch: loads the cargo (section 2.6), prices it, moves Contract Keeper's bonus, starts the climb.
 * The freighter stores the taken contract the cargo was loaded for, what of the cargo counts toward
 * it (`toward`), whether this launch completes it (`met`, Decision 40), the away time, the payout
 * (with the current keeper and the full bonus), the payout without the delivery fee (`plain`) and
 * the contract bonus; the warp-out pays exactly that (errata 13). Launches are counted at the
 * warp-out (errata 23).
 */
export function doLaunch(cfg: HaulConfig, d: Draft, p: HaulParams, auto: boolean): void {
  const h = d.h;
  const contract = activeContract(h);
  const taken = contract && contract.taken ? contract : null;
  const { cargo, hold } = loadCargo(cfg, p, h.hold, taken);
  const { payout, met, plain, bonus, toward } = payoutFor(p, cargo, taken, h.keeper);
  h.hold = hold;
  h.keeper = met && p.keeperValue > 0 ? p.keeperValue : 0;
  h.freighter = { ...h.freighter, phase: 'climb', t: p.climb, cargo, payout, met, away: met ? p.awayMet : p.away, contract: taken ? taken.k : null, toward, bonus, plain };
  d.events?.push({ type: 'launch', cargo: { ...cargo }, auto });
}

/**
 * The warp-out (errata 14, Decision 40), in order: 1. count the launch; 2. if the cargo was loaded
 * for the contract that is still taken, its `toward` units are added to the wants' `got`
 * (`contractProgress`); when that completes it, the contract bonus is paid (twice in the day shift,
 * Decision 53), `contractMet`, it is replaced in place by the next from the stream and `active =
 * null`; otherwise it loses a launch and at 0 lapses (`contractLapsed`, nothing taken back) and is
 * replaced. A cargo loaded for a contract dropped in flight is paid without the delivery fee. A
 * warp-out whose cargo was loaded before the contract was taken does not count for or against it.
 * 3. Every offer loses one launch of its offer life and at 0 is replaced silently (`contractNew`).
 * 4. A place left empty by a drop gets a new offer (`contractNew`, Decision 56). Before all of that the
 * cargo is counted into the station's `recent` average (Decision 56). Then the contract unlock check
 * (galaxy 1: launches and clock; later galaxies: three launches measured, no fixed first contract). The `warp` event carries the whole payout, the bonus included.
 */
export function warpOut(cfg: HaulConfig, d: Draft, p: HaulParams): void {
  const h = d.h;
  const f = h.freighter;
  h.counters.shipped += sumUnits(f.cargo);
  h.counters.launches += 1;
  d.stats.launches += 1;
  // Decision 56: the station remembers what it ships (before any draw of this warp-out).
  noteShipped(cfg, h, f.cargo, steadyPerLaunch(p, h).perLaunch);
  const C = h.contracts;
  let pay = f.payout;
  let bonus = 0;
  let met = false;
  const later: HaulEvent[] = [];
  if (C.unlocked) {
    const fresh = new Set<number>();
    // A place whose replacement finds nothing to ask (Decision 56, `offerAt`) is removed after the loop.
    const gone = new Set<number>();
    // Decision 64: a station that ships one ore has one buyer; a place that comes free beyond it stays empty.
    // One basis for every draw of this warp-out (it reads the routes and `recent`, not the board).
    const basis = contractBasis(cfg, p, h);
    const places = boardPlaces(cfg, basis);
    const replace = (i: number) => {
      fresh.add(i);
      if (C.board.length - gone.size > places) {
        gone.add(i);
        return;
      }
      const next = drawContract(cfg, h, p.F, p, basis);
      C.next = next.next;
      if (!next.contract) {
        gone.add(i);
        return;
      }
      C.board[i] = next.contract;
      C.next = next.next;
      later.push({ type: 'contractNew', contract: next.contract, index: i });
    };
    const ti = C.active !== null && C.board[C.active]?.taken ? C.active : -1;
    const c = ti >= 0 ? C.board[ti] : null;
    if (f.contract !== null && (!c || c.k !== f.contract)) pay = f.plain ?? f.payout;
    if (c && f.contract === c.k) {
      const toward = f.toward ?? {};
      const added: { ore: string; units: number }[] = [];
      for (const w of c.wants) {
        const n = Math.min(toward[w.ore] ?? 0, Math.max(0, w.units - (w.got ?? 0)));
        if (n > 0) {
          w.got = (w.got ?? 0) + n;
          added.push({ ore: w.ore, units: n });
        }
      }
      if (added.length) later.push({ type: 'contractProgress', contract: { ...c, wants: c.wants.map((w) => ({ ...w })) }, added });
      if (c.wants.every((w) => wantLeft(w) === 0)) {
        const shift = shiftDoubles(cfg, d.haulStats);
        bonus = (f.bonus ?? 0) * (shift ? cfg.haul.shift.mult : 1);
        if (shift && d.haulStats.shift) d.haulStats.shift = { ...d.haulStats.shift, met: d.haulStats.shift.met + 1 };
        met = true;
        h.counters.contractsMet += 1;
        d.stats.contractsMet += 1;
        later.push({ type: 'contractMet', contract: c, bonus, shift });
        C.active = null;
        if (d.stats.contractsMet % cfg.haul.pods.contractsEvery === 0) grantPod(cfg, d, cfg.haul.pods.scrap, 'contracts');
        replace(ti);
      } else {
        // A cargo priced as completing that did not (rounding at the edge): paid without the fee.
        if (f.met) pay = f.plain ?? f.payout;
        c.launchesLeft -= 1;
        if (c.launchesLeft <= 0) {
          C.active = null;
          later.push({ type: 'contractLapsed', contract: c, wasActive: true });
          replace(ti);
        }
      }
    }
    for (let i = 0; i < C.board.length; i++) {
      if (fresh.has(i)) continue;
      const o = C.board[i];
      if (o.taken) continue;
      o.launchesLeft -= 1;
      if (o.launchesLeft > 0) continue;
      replace(i);
    }
    if (gone.size) {
      const keep = C.board.filter((_, i) => !gone.has(i));
      const activeC = C.active !== null ? C.board[C.active] : null;
      C.board = keep;
      C.active = activeC && !gone.has(C.active as number) ? keep.indexOf(activeC) : null;
      // Indexes of the new offers' events follow the shorter board.
      for (const e of later) if (e.type === 'contractNew') e.index = C.board.indexOf(e.contract);
    }
    // A place left empty by a drop (Decision 56) gets its offer now.
    for (const i of topUpBoard(cfg, h, p, basis)) later.push({ type: 'contractNew', contract: C.board[i], index: i });
    // Decision 64: no green offers (an offer the routes now meet untouched asks the never-free floor).
    refloorOffers(cfg, p, h);
    // (An offer the refloor took off the board was never offered: its event goes, the others follow the board.)
    for (let i = later.length - 1; i >= 0; i--) {
      const e = later[i];
      if (e.type !== 'contractNew') continue;
      const at = C.board.indexOf(e.contract);
      if (at < 0) later.splice(i, 1);
      else e.index = at;
    }
  } else if (h.galaxy > 0 ? (C.measured ?? 0) >= 3 : d.stats.launches >= cfg.haul.contracts.unlockLaunches && h.clock >= cfg.haul.contracts.unlockClock - EPS) {
    // From galaxy 2 on the board opens with ordinary offers once three launches are measured (Decision 56).
    h.contracts = openBoard(cfg, h, p.F, p);
    d.haulStats.contractsSeen = true;
    later.push({ type: 'contractsUnlocked' });
  }
  d.earned += pay + bonus;
  d.events?.push({ type: 'warp', payout: pay + bonus, met, cargo: { ...f.cargo }, bonus });
  for (const e of later) d.events?.push(e);
  h.freighter = { ...f, phase: 'away', t: f.away, cargo: {}, payout: 0, toward: {}, bonus: 0, plain: 0 };
}

/**
 * The autopilot's launch rule (section 2.4 step 5, Decision 40): `full` launches at a full hold;
 * `contract` also launches when the hold already holds everything the taken contract still needs.
 */
export function autopilotWants(p: HaulParams, h: HaulState): boolean {
  if (!h.autopilot.online || h.freighter.phase !== 'docked') return false;
  const total = holdTotal(h);
  if (!(total > EPS)) return false;
  if (fillsFreighter(total, p.F)) return true;
  if (h.autopilot.policy !== 'contract') return false;
  const c = activeContract(h);
  // Whole units: the autopilot waits for the last half unit rather than rely on the tolerance.
  return !!c && c.taken && c.wants.every((w) => (h.hold[w.ore] ?? 0) >= w.units - (w.got ?? 0) - EPS);
}

function stepBound(p: HaulParams, h: HaulState, flareMax: number): number {
  let b = STEP;
  const clock = h.clock;
  const consider = (x: number) => {
    if (x > 1e-7 && x < b) b = x;
  };
  let sumH = 0;
  const slots = h.slots;
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    if (!s.claimed) continue;
    if (s.respawnAt !== null) {
      consider(s.respawnAt - clock);
      continue;
    }
    const sp = p.slots[i];
    if (s.haulers > 0) consider(s.routeFrom - clock);
    if (s.life > 0 && sp.r > 0) consider(s.life);
    else if (s.pile > 0 && sp.h > 0 && clock >= s.routeFrom) consider(s.pile / sp.h);
    if (clock >= s.routeFrom) sumH += sp.h;
  }
  if (h.freighter.phase !== 'docked') consider(h.freighter.t);
  if (h.vein.slot === null) consider(h.vein.nextAt - clock);
  else consider(h.vein.until - clock);
  if (h.flare.slot !== null) consider(h.flare.until - clock);
  if (h.flare.charges < flareMax) consider(h.flare.nextFreeAt - clock);
  if (h.autopilot.online && h.freighter.phase === 'docked' && sumH > 0) consider((p.F - holdTotal(h)) / sumH);
  return b;
}

/** Below this, life and piles count as 0 (errata 19). */
const ZERO = 1e-9;

let scratch = { want: new Float64Array(0), pot: new Float64Array(0), outs: new Float64Array(0) };
function scratchFor(n: number) {
  if (scratch.want.length < n) scratch = { want: new Float64Array(n), pot: new Float64Array(n), outs: new Float64Array(n) };
  return scratch;
}

/**
 * Drilling and hauling over `s` seconds with the current params (section 2.4 steps 3 and 4, errata
 * 19): `drillable = life > 0 ? min(r s, life r) : 0`, `avail = pile + drillable`,
 * `drilledNow = max(0, min(drillable, cap − pile + out))`. Event `dry` when a rock's life reaches 0
 * with ore still on its pile.
 */
function flow(cfg: HaulConfig, d: Draft, p: HaulParams, s: number): void {
  const h = d.h;
  const n = h.slots.length;
  const { want, pot, outs } = scratchFor(n);
  let sumWant = 0;
  for (let i = 0; i < n; i++) {
    want[i] = 0;
    pot[i] = 0;
    outs[i] = 0;
    const sl = h.slots[i];
    if (!sl.claimed || sl.respawnAt !== null || sl.rockN < 0) continue;
    const sp = p.slots[i];
    pot[i] = sl.life > 0 ? Math.min(sp.r * s, sl.life * sp.r) : 0;
    const avail = sl.pile + pot[i];
    want[i] = h.clock >= sl.routeFrom - EPS ? Math.min(sp.h * s, avail) : 0;
    sumWant += want[i];
  }
  const total0 = holdTotal(h);
  const free = Math.max(0, p.F - total0);
  const share = sumWant > 0 ? Math.min(1, free / sumWant) : 0;
  let inHold = total0;
  for (let i = 0; i < n; i++) {
    const sl = h.slots[i];
    if (!sl.claimed || sl.respawnAt !== null || sl.rockN < 0) continue;
    const sp = p.slots[i];
    const out = want[i] * share;
    outs[i] = out;
    const lifeBefore = sl.life;
    const drilled = sl.life > 0 && sp.r > 0 ? Math.max(0, Math.min(pot[i], sp.cap - sl.pile + out)) : 0;
    sl.pile = Math.max(0, sl.pile + drilled - out);
    if (drilled > 0) sl.life = Math.max(0, sl.life - drilled / sp.r);
    if (sl.life <= ZERO) sl.life = 0;
    if (sl.pile <= ZERO) sl.pile = 0;
    if (lifeBefore > 0 && sl.life === 0 && sl.pile > 0) d.events?.push({ type: 'dry', slot: i });
    h.counters.drilled += drilled;
    inHold += out;
  }
  // Overflow Chute: a pile at cap spills `spill × r × s` straight into the hold, if it has room after the routes.
  if (p.spill > 0) {
    for (let i = 0; i < n; i++) {
      const sl = h.slots[i];
      const sp = p.slots[i];
      if (!sl.claimed || sl.respawnAt !== null || sl.rockN < 0 || !(sl.life > 0) || !(sp.r > 0)) continue;
      if (sl.pile < sp.cap - EPS) continue;
      const extra = Math.max(0, Math.min(p.spill * sp.r * s, sl.life * sp.r, p.F - inHold));
      if (!(extra > 0)) continue;
      sl.life = Math.max(0, sl.life - extra / sp.r);
      if (sl.life <= ZERO) {
        sl.life = 0;
        d.events?.push({ type: 'dry', slot: i });
      }
      h.counters.drilled += extra;
      outs[i] += extra;
      inHold += extra;
    }
  }
  for (let i = 0; i < n; i++) {
    const sl = h.slots[i];
    if (!sl.claimed || sl.respawnAt !== null || sl.rockN < 0) continue;
    const sp = p.slots[i];
    const out = outs[i];
    if (out > 0) {
      h.hold[sl.ore] = (h.hold[sl.ore] ?? 0) + out;
      const before = sp.c > 0 ? Math.floor(sl.delivered / sp.c + EPS) : 0;
      sl.delivered += out;
      const after = sp.c > 0 ? Math.floor(sl.delivered / sp.c + EPS) : 0;
      for (let k = 0; k < Math.min(4, after - before); k++) d.events?.push({ type: 'unload', slot: i, units: sp.c });
      h.counters.hauled += out;
      d.stats.hauled += out;
    }
    const full = sl.pile >= sp.cap - 1e-9 && want[i] < sp.r * s;
    if (full && !sl.full) d.events?.push({ type: 'pileFull', slot: i });
    if (full) sl.full = true;
    else if (sl.pile < sp.cap - 1e-9) sl.full = false;
  }
}

/**
 * Time events at the end of a step: crumbles (ending a seam on that rock: errata 16), respawns,
 * freighter phases, seams, flare charges, marks. `p` is the params the step ran with; returns the
 * params for the next step, rebuilt only when an event changed them (the long catch-up tick
 * depends on this: params are O(slots) to build).
 */
function timeEvents(cfg: HaulConfig, d: Draft, s: number, p0: HaulParams): HaulParams {
  const h = d.h;
  const H = cfg.haul;
  let p = p0;
  let dirty = false;
  const fresh = () => {
    if (dirty) {
      p = draftParams(cfg, d);
      dirty = false;
    }
    return p;
  };
  // Crumble: life and pile at 0.
  for (let i = 0; i < h.slots.length; i++) {
    const sl = h.slots[i];
    if (!sl.claimed || sl.respawnAt !== null || sl.rockN < 0) continue;
    if (sl.life <= ZERO && sl.pile <= ZERO) {
      sl.life = 0;
      sl.pile = 0;
      sl.full = false;
      sl.respawnAt = h.clock + H.respawnSeconds;
      h.counters.depleted += 1;
      d.stats.depleted += 1;
      d.events?.push({ type: 'depleted', slot: i });
      if (d.stats.depleted % H.pods.depletedEvery === 0) grantPod(cfg, d, H.pods.scrap, 'depleted');
      // A seam on this rock ends at once; a natural seam's next roll counts from now.
      if (h.vein.slot === i) {
        const interval = Math.max(0, h.vein.nextAt - h.vein.until);
        endSeam(cfg, d, p, h.vein, false);
        h.vein.until = h.clock;
        h.vein.nextAt = h.clock + interval;
      }
      if (h.flare.slot === i) {
        endSeam(cfg, d, p, h.flare, true);
        h.flare.until = h.clock;
      }
      dirty = true;
    }
  }
  // Respawns (and the first rock after a claim).
  for (let i = 0; i < h.slots.length; i++) {
    const sl = h.slots[i];
    if (!sl.claimed || sl.respawnAt === null || sl.respawnAt > h.clock + EPS) continue;
    const oldOre = sl.ore;
    const first = sl.rockN < 0;
    const next = placeRock(cfg, h, i, sl, sl.rockN + 1, d.g.starMap);
    h.slots[i] = next;
    d.events?.push({ type: 'arrive', slot: i, ore: next.ore, bonanza: next.bonanza, oreChanged: !first && next.ore !== oldOre });
    dirty = true;
  }
  // Freighter phases.
  const f = h.freighter;
  if (f.phase !== 'docked') {
    f.t -= s;
    for (let guard = 0; guard < 4 && h.freighter.phase !== 'docked' && h.freighter.t <= EPS; guard++) {
      const fr = h.freighter;
      const left = fr.t;
      if (fr.phase === 'climb') {
        warpOut(cfg, d, fresh());
        h.freighter.t += left;
        dirty = true;
      } else if (fr.phase === 'away') {
        h.freighter = { ...fr, phase: 'land', t: fresh().land + left };
        d.events?.push({ type: 'land' });
      } else {
        h.freighter = { ...fr, phase: 'docked', t: 0, met: false, away: 0, contract: null };
        d.events?.push({ type: 'docked' });
      }
    }
  }
  if (autopilotWants(fresh(), h)) doLaunch(cfg, d, p, true);
  // Seams.
  if (h.vein.slot !== null && h.clock >= h.vein.until - EPS) {
    endSeam(cfg, d, fresh(), h.vein, false);
    dirty = true;
  }
  if (h.flare.slot !== null && h.clock >= h.flare.until - EPS) {
    endSeam(cfg, d, fresh(), h.flare, true);
    dirty = true;
  }
  if (h.vein.slot === null && h.clock >= h.vein.nextAt - EPS) {
    const pp = fresh();
    const cand: number[] = [];
    const weights: number[] = [];
    h.slots.forEach((sl, i) => {
      if (!sl.claimed || sl.respawnAt !== null || sl.rockN < 0 || !(sl.life > 0) || h.flare.slot === i) return;
      cand.push(i);
      weights.push((pp.slots[i].ring + 1) * pp.slots[i].tierSeamWeight);
    });
    if (cand.length) {
      const hv = hashString('vein');
      const pick = cand[weightedIndex(rngMix4(h.seed, hv, h.vein.count, 0), weights)];
      const until = h.clock + seamDuration(cfg, d.g);
      const iv = H.seam.interval;
      const interval = (iv[0] + (iv[1] - iv[0]) * roll(rngMix4(h.seed, hv, h.vein.count, 1))) * T(cfg, h.trait, 'interval') - H.seam.senseInterval * starLevel(cfg, d.g.starMap, 'seamSense');
      h.vein = { ...h.vein, slot: pick, until, guests: [], peak: 0, nextAt: until + Math.max(H.seam.minInterval, interval), count: h.vein.count + 1 };
      d.events?.push({ type: 'vein', slot: pick, flare: false });
      dirty = true;
    } else {
      // No rock with life left (errata 34): no seam now; try again later, the count unchanged.
      h.vein.nextAt = h.clock + H.seam.retrySeconds;
    }
  }
  // Free flare charge (errata 33): the timer runs only while fewer than `maxStored` charges are held
  // (one, so: only at 0 charges); while charges are held it waits.
  if (h.flare.charges < H.flare.maxStored) {
    if (h.clock >= h.flare.nextFreeAt - EPS) {
      h.flare.charges = Math.min(H.flare.maxCharges, h.flare.charges + 1);
      h.flare.nextFreeAt = h.clock + H.flare.refillSeconds;
      d.events?.push({ type: 'flareCharge', charges: h.flare.charges });
    }
  } else h.flare.nextFreeAt += s;
  updateMarks(cfg, d, fresh());
  return fresh();
}

function weightedIndex(seed: number, weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let x = roll(seed) * total;
  for (let i = 0; i < weights.length; i++) {
    if (x < weights[i]) return i;
    x -= weights[i];
  }
  return weights.length - 1;
}

/** Hint timers and once-per-run flags (section 3), and the lifetime story flags (errata 21). */
export function updateMarks(cfg: HaulConfig, d: Draft, p: HaulParams): void {
  const h = d.h;
  const m = h.marks;
  m.idleSince = h.idle > 0 ? (m.idleSince ?? h.clock) : null;
  const full = fillsFreighter(holdTotal(h), p.F);
  if (full && !h.autopilot.online) {
    if (m.holdFullSince === null) d.events?.push({ type: 'holdFull' });
    m.holdFullSince = m.holdFullSince ?? h.clock;
  } else m.holdFullSince = null;
  m.noContractSince = h.contracts.unlocked && h.contracts.active === null ? (m.noContractSince ?? h.clock) : null;
  m.flareReadySince = h.flare.charges > 0 ? (m.flareReadySince ?? h.clock) : null;
  // Decision 44: the guided steps end with the sixth (a rig upgraded once both rocks are worked).
  const bothWorked = (h.slots[1]?.claimed ?? false) && h.slots[1].haulers > 0;
  if (!h.flags.tutorialDone && (h.galaxy > 0 || h.autopilot.online || (bothWorked && h.slots.some((x) => x.claimed && x.rigLevel > 1)))) {
    h.flags.tutorialDone = true;
    d.events?.push({ type: 'tutorialDone' });
  }
  if (h.autopilot.online && !d.haulStats.autopilotSeen) d.haulStats.autopilotSeen = true;
  if (h.contracts.unlocked && !d.haulStats.contractsSeen) d.haulStats.contractsSeen = true;
}

/**
 * Advances a haul run by `dt` seconds of play (the 10 Hz app tick, the 1 s bot tick). `now` is
 * the wall clock in epoch ms (only for symmetry with economy.tick; the run's own clock is play
 * time). Pass `events` to collect what happened. A dt of 0, negative, NaN or Infinity changes
 * nothing; a dt over MAX_TICK is cut to MAX_TICK. Adds dt to `stats.playSeconds` (the shared tick
 * must not add it again for haul games).
 */
export function advanceHaul(cfg: HaulConfig, g: HaulGame, dt: number, now: number, events?: HaulEvent[]): HaulGame {
  void now;
  if (!g.haul || !(dt > 0) || !Number.isFinite(dt)) return g;
  const d = draftOf(g as Run, events);
  const flareMax = cfg.haul.flare.maxStored;
  let rest = Math.min(dt, MAX_TICK);
  let p = draftParams(cfg, d);
  resizeOrders(d.h, p.F, d.events, cfg);
  for (let guard = 0; rest > 1e-12 && guard < 200_000; guard++) {
    const s = Math.min(rest, Math.max(1e-6, stepBound(p, d.h, flareMax)));
    flow(cfg, d, p, s);
    d.h.clock += s;
    rest -= s;
    p = timeEvents(cfg, d, s, p);
  }
  d.stats.playSeconds += Math.min(dt, MAX_TICK);
  return commit(d);
}
