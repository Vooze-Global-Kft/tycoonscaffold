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
import { EPS, MAX_CASH, haulParams, holdTotal, rngMix4, roll, sumUnits, T, starLevel } from './params';
import { activeContract, contractMet, drawContract, loadCargo, openBoard, payoutFor } from './trade';
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

/** Warm-up of a route that had no drones: first delivery after one outbound leg and the load time. */
export function warmUp(cfg: HaulConfig, p: HaulParams, h: HaulState, slot: number): void {
  const s = h.slots[slot];
  if (s.haulers === 0) s.routeFrom = h.clock + p.slots[slot].distance / p.v + cfg.haul.drone.loadSeconds;
}

/** The seam (natural or flare) that is active on a slot, or null. */
export function seamAt(h: HaulState, slot: number): SeamState | null {
  if (h.vein.slot === slot && h.vein.until > h.clock) return h.vein;
  if (h.flare.slot === slot && h.flare.until > h.clock) return h.flare;
  return null;
}

/** A drone left a seam slot: drop its guest entry if the slot now has fewer drones than guests. */
export function dropGuest(h: HaulState, slot: number): void {
  for (const seam of [h.vein, h.flare]) {
    if (seam.slot === slot && seam.guests.length > h.slots[slot].haulers) seam.guests.pop();
  }
}

/** A seam ended: each guest drone goes back to its origin route (or the rack); warm-up where the origin had none. */
function endSeam(cfg: HaulConfig, d: Draft, p: HaulParams, seam: SeamState, flare: boolean): void {
  const h = d.h;
  const slot = seam.slot;
  if (slot === null) return;
  const s = h.slots[slot];
  for (const origin of seam.guests) {
    if (s.haulers <= 0) break;
    s.haulers -= 1;
    const o = origin >= 0 ? h.slots[origin] : undefined;
    if (o && o.claimed && origin !== slot) {
      warmUp(cfg, p, h, origin);
      o.haulers += 1;
    } else h.idle += 1;
  }
  seam.guests = [];
  seam.slot = null;
  d.events?.push({ type: 'veinEnd', slot, flare });
}

/** Seam length: duration + senseDuration × S(Seam Sense). */
export function seamDuration(cfg: HaulConfig, g: HaulGame): number {
  return cfg.haul.seam.duration + cfg.haul.seam.senseDuration * starLevel(cfg, g.starMap, 'seamSense');
}

/** Launch: loads the cargo (section 2.6), prices it, moves Contract Keeper's bonus, starts the climb. */
export function doLaunch(cfg: HaulConfig, d: Draft, p: HaulParams, auto: boolean): void {
  const h = d.h;
  const contract = activeContract(h);
  const { cargo, hold } = loadCargo(cfg, p, h.hold, contract);
  const { payout, met } = payoutFor(p, cargo, contract, h.keeper);
  h.hold = hold;
  h.keeper = met && p.keeperValue > 0 ? p.keeperValue : 0;
  h.freighter = { ...h.freighter, phase: 'climb', t: p.climb, cargo, payout, met, away: met ? p.awayMet : p.away, contract: contract ? contract.k : null };
  h.counters.launches += 1;
  d.stats.launches += 1;
  d.events?.push({ type: 'launch', cargo: { ...cargo }, auto });
}

/** The warp-out: payout, contract lifetimes, the met contract's replacement, lapses, the contract unlock. */
export function warpOut(cfg: HaulConfig, d: Draft, p: HaulParams): void {
  const h = d.h;
  const f = h.freighter;
  d.earned += f.payout;
  h.counters.shipped += sumUnits(f.cargo);
  d.events?.push({ type: 'warp', payout: f.payout, met: f.met, cargo: { ...f.cargo } });
  const C = h.contracts;
  if (C.unlocked) {
    for (const c of C.board) c.launchesLeft -= 1;
    const replace = (i: number) => {
      const next = drawContract(cfg, h, p.F);
      C.board[i] = next.contract;
      C.next = next.next;
      d.events?.push({ type: 'contractNew', contract: next.contract, index: i });
    };
    if (f.met && f.contract !== null) {
      const i = C.board.findIndex((c) => c.k === f.contract);
      if (i >= 0) {
        const done = C.board[i];
        h.counters.contractsMet += 1;
        d.stats.contractsMet += 1;
        d.events?.push({ type: 'contractMet', contract: done });
        if (C.active === i) C.active = null;
        replace(i);
        if (d.stats.contractsMet % cfg.haul.pods.contractsEvery === 0) grantPod(cfg, d, cfg.haul.pods.scrap, 'contracts');
      }
    }
    for (let i = 0; i < C.board.length; i++) {
      const c = C.board[i];
      if (c.launchesLeft > 0) continue;
      const wasActive = C.active === i;
      if (wasActive) C.active = null;
      d.events?.push({ type: 'contractLapsed', contract: c, wasActive });
      replace(i);
    }
  } else if (d.stats.launches >= cfg.haul.contracts.unlockLaunches && h.clock >= cfg.haul.contracts.unlockClock - EPS) {
    h.contracts = openBoard(cfg, h, p.F);
    d.events?.push({ type: 'contractsUnlocked' });
  }
  h.freighter = { ...f, phase: 'away', t: f.away, cargo: {}, payout: 0 };
}

/** The autopilot's launch rule (section 2.4 step 5). */
export function autopilotWants(p: HaulParams, h: HaulState): boolean {
  if (!h.autopilot.online || h.freighter.phase !== 'docked') return false;
  const total = holdTotal(h);
  if (!(total > EPS)) return false;
  if (total >= p.F - EPS) return true;
  if (h.autopilot.policy !== 'contract') return false;
  const c = activeContract(h);
  return !!c && contractMet(h.hold, c);
}

function stepBound(p: HaulParams, h: HaulState, flareMax: number): number {
  let b = STEP;
  const clock = h.clock;
  const consider = (x: number) => {
    if (x > 1e-7 && x < b) b = x;
  };
  let sumH = 0;
  h.slots.forEach((s, i) => {
    if (!s.claimed) return;
    if (s.respawnAt !== null) return consider(s.respawnAt - clock);
    const sp = p.slots[i];
    if (s.haulers > 0) consider(s.routeFrom - clock);
    if (s.life > 0 && sp.r > 0) consider(s.life);
    else if (s.pile > 0 && sp.h > 0 && clock >= s.routeFrom) consider(s.pile / sp.h);
    if (clock >= s.routeFrom) sumH += sp.h;
  });
  if (h.freighter.phase !== 'docked') consider(h.freighter.t);
  if (h.vein.slot === null) consider(h.vein.nextAt - clock);
  else consider(h.vein.until - clock);
  if (h.flare.slot !== null) consider(h.flare.until - clock);
  if (h.flare.charges < flareMax) consider(h.flare.nextFreeAt - clock);
  if (h.autopilot.online && h.freighter.phase === 'docked' && sumH > 0) consider((p.F - holdTotal(h)) / sumH);
  return b;
}

/** Drilling and hauling over `s` seconds with the current params (section 2.4 steps 3 and 4). */
function flow(cfg: HaulConfig, d: Draft, p: HaulParams, s: number): void {
  const h = d.h;
  const n = h.slots.length;
  const want = new Array<number>(n).fill(0);
  const pot = new Array<number>(n).fill(0);
  let sumWant = 0;
  for (let i = 0; i < n; i++) {
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
  const outs = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    const sl = h.slots[i];
    if (!sl.claimed || sl.respawnAt !== null || sl.rockN < 0) continue;
    const sp = p.slots[i];
    const out = want[i] * share;
    outs[i] = out;
    const drilled = sl.life > 0 && sp.r > 0 ? Math.max(0, Math.min(pot[i], sp.cap - sl.pile + out)) : 0;
    sl.pile = Math.max(0, sl.pile + drilled - out);
    if (drilled > 0) sl.life = Math.max(0, sl.life - drilled / sp.r);
    if (sl.life < 1e-12) sl.life = 0;
    if (sl.pile < 1e-12) sl.pile = 0;
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
      if (sl.life < 1e-12) sl.life = 0;
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

/** Time events at the end of a step: crumbles, respawns, freighter phases, seams, flare charges, marks. */
function timeEvents(cfg: HaulConfig, d: Draft, s: number): void {
  const h = d.h;
  const H = cfg.haul;
  let p = draftParams(cfg, d);
  let dirty = false;
  // Crumble: life and pile at 0.
  h.slots.forEach((sl, i) => {
    if (!sl.claimed || sl.respawnAt !== null || sl.rockN < 0) return;
    if (sl.life <= 0 && sl.pile <= 0) {
      sl.life = 0;
      sl.pile = 0;
      sl.full = false;
      sl.respawnAt = h.clock + H.respawnSeconds;
      h.counters.depleted += 1;
      d.stats.depleted += 1;
      d.events?.push({ type: 'depleted', slot: i });
      if (d.stats.depleted % H.pods.depletedEvery === 0) grantPod(cfg, d, H.pods.scrap, 'depleted');
      dirty = true;
    }
  });
  // Respawns (and the first rock after a claim).
  h.slots.forEach((sl, i) => {
    if (!sl.claimed || sl.respawnAt === null || sl.respawnAt > h.clock + EPS) return;
    const oldOre = sl.ore;
    const first = sl.rockN < 0;
    const next = placeRock(cfg, h, i, sl, sl.rockN + 1, d.g.starMap);
    h.slots[i] = next;
    d.events?.push({ type: 'arrive', slot: i, ore: next.ore, bonanza: next.bonanza, oreChanged: !first && next.ore !== oldOre });
    dirty = true;
  });
  if (dirty) p = draftParams(cfg, d);
  // Freighter phases.
  const f = h.freighter;
  if (f.phase !== 'docked') {
    f.t -= s;
    for (let guard = 0; guard < 4 && h.freighter.phase !== 'docked' && h.freighter.t <= EPS; guard++) {
      const fr = h.freighter;
      const left = fr.t;
      if (fr.phase === 'climb') {
        warpOut(cfg, d, p);
        h.freighter.t += left;
        p = draftParams(cfg, d);
      } else if (fr.phase === 'away') {
        h.freighter = { ...fr, phase: 'land', t: p.land + left };
        d.events?.push({ type: 'land' });
      } else {
        h.freighter = { ...fr, phase: 'docked', t: 0, met: false, away: 0, contract: null };
        d.events?.push({ type: 'docked' });
      }
    }
  }
  if (autopilotWants(p, h)) {
    doLaunch(cfg, d, p, true);
    p = draftParams(cfg, d);
  }
  // Seams.
  if (h.vein.slot !== null && h.clock >= h.vein.until - EPS) {
    endSeam(cfg, d, p, h.vein, false);
    p = draftParams(cfg, d);
  }
  if (h.flare.slot !== null && h.clock >= h.flare.until - EPS) {
    endSeam(cfg, d, p, h.flare, true);
    p = draftParams(cfg, d);
  }
  if (h.vein.slot === null && h.clock >= h.vein.nextAt - EPS) {
    const cand: number[] = [];
    const weights: number[] = [];
    h.slots.forEach((sl, i) => {
      if (!sl.claimed || sl.respawnAt !== null || sl.rockN < 0 || h.flare.slot === i) return;
      cand.push(i);
      weights.push((p.slots[i].ring + 1) * p.slots[i].tierSeamWeight);
    });
    if (cand.length) {
      const hv = hashString('vein');
      const pick = cand[weightedIndex(rngMix4(h.seed, hv, h.vein.count, 0), weights)];
      const until = h.clock + seamDuration(cfg, d.g);
      const iv = H.seam.interval;
      const interval = (iv[0] + (iv[1] - iv[0]) * roll(rngMix4(h.seed, hv, h.vein.count, 1))) * T(cfg, h.trait, 'interval') - H.seam.senseInterval * starLevel(cfg, d.g.starMap, 'seamSense');
      h.vein = { ...h.vein, slot: pick, until, guests: [], nextAt: until + Math.max(H.seam.minInterval, interval), count: h.vein.count + 1 };
      d.events?.push({ type: 'vein', slot: pick, flare: false });
    }
  }
  // Free flare charge: one per refill period of play, stored up to maxStored; the timer waits while full.
  if (h.flare.charges < H.flare.maxStored) {
    if (h.clock >= h.flare.nextFreeAt - EPS) {
      h.flare.charges += 1;
      h.flare.nextFreeAt = h.clock + H.flare.refillSeconds;
      d.events?.push({ type: 'flareCharge', charges: h.flare.charges });
    }
  } else h.flare.nextFreeAt = Math.max(h.flare.nextFreeAt, h.clock + H.flare.refillSeconds);
  updateMarks(cfg, d, p);
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

/** Hint timers and once-per-run flags (section 3). */
export function updateMarks(cfg: HaulConfig, d: Draft, p: HaulParams): void {
  const h = d.h;
  const m = h.marks;
  m.idleSince = h.idle > 0 ? (m.idleSince ?? h.clock) : null;
  const full = holdTotal(h) >= p.F - EPS;
  if (full && !h.autopilot.online) {
    if (m.holdFullSince === null) d.events?.push({ type: 'holdFull' });
    m.holdFullSince = m.holdFullSince ?? h.clock;
  } else m.holdFullSince = null;
  m.noContractSince = h.contracts.unlocked && h.contracts.active === null ? (m.noContractSince ?? h.clock) : null;
  m.flareReadySince = h.flare.charges > 0 ? (m.flareReadySince ?? h.clock) : null;
  if (!h.flags.tutorialDone && (h.galaxy > 0 || h.autopilot.online || ((h.slots[1]?.claimed ?? false) && h.slots[1].haulers > 0))) {
    h.flags.tutorialDone = true;
    d.events?.push({ type: 'tutorialDone' });
  }
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
  for (let guard = 0; rest > 1e-12 && guard < 200_000; guard++) {
    const p = draftParams(cfg, d);
    const s = Math.min(rest, Math.max(1e-6, stepBound(p, d.h, flareMax)));
    flow(cfg, d, p, s);
    d.h.clock += s;
    rest -= s;
    timeEvents(cfg, d, s);
  }
  d.stats.playSeconds += Math.min(dt, MAX_TICK);
  return commit(d);
}

