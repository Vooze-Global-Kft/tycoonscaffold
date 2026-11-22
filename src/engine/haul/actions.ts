/**
 * Player actions (section 2.5). Each takes the game and returns the new game, or the same object
 * unchanged when the action is not allowed (so `next === state` means "refused"). Pass `events`
 * to collect what happened.
 */
import { equip } from '../loadout';
import { affordable, autopilotCost, droneCapFor, capacityCost, claimCost, droneCost, EPS, engineCost, freighterCost, holdTotal, rigCost, ringOf, slotTable } from './params';
import { drawContract } from './trade';
import { commit, doLaunch, draftOf, draftParams, dropGuest, grantPod, landOnSeam, seamAt, seamDuration, updateMarks, warmUp, type Draft } from './tick';
import type { AutopilotPolicy, HaulConfig, HaulEvent, HaulGame, HaulState } from './types';

type Run = HaulGame & { haul: HaulState };

function run(g: HaulGame): g is Run {
  return !!g.haul;
}

function slotOk(h: HaulState, slot: number): boolean {
  return Number.isInteger(slot) && slot >= 0 && slot < h.slots.length && h.slots[slot].claimed;
}

function finish(cfg: HaulConfig, d: Draft): HaulGame {
  updateMarks(cfg, d, draftParams(cfg, d));
  return commit(d);
}

function pay(d: Draft, cost: number): void {
  d.g = { ...d.g, cash: Math.max(0, d.g.cash - cost) };
}

/**
 * A drone arrives on `slot`: warm-up (and `delivered` restarts) if the route was empty; on an active
 * seam it pushes its origin and may count a seam drag (errata 16, see `landOnSeam`).
 */
function arrive(cfg: HaulConfig, d: Draft, slot: number, origin: number): void {
  const h = d.h;
  warmUp(cfg, draftParams(cfg, d), h, slot);
  h.slots[slot].haulers += 1;
  landOnSeam(d, slot, origin);
}

/** Assign an idle drone from the rack to a claimed slot (drag, flick or tap-tap). Free. */
export function assignDrone(cfg: HaulConfig, g: HaulGame, slot: number, events?: HaulEvent[]): HaulGame {
  if (!run(g) || !slotOk(g.haul, slot) || g.haul.idle < 1) return g;
  const d = draftOf(g, events);
  d.h.idle -= 1;
  arrive(cfg, d, slot, -1);
  return finish(cfg, d);
}

/** Move one drone from route `from` to slot `to`. Onto a seam: `from` becomes a guest's origin. Free. */
export function moveDrone(cfg: HaulConfig, g: HaulGame, from: number, to: number, events?: HaulEvent[]): HaulGame {
  if (!run(g) || from === to || !slotOk(g.haul, from) || !slotOk(g.haul, to) || g.haul.slots[from].haulers < 1) return g;
  const d = draftOf(g, events);
  d.h.slots[from].haulers -= 1;
  dropGuest(d.h, from);
  arrive(cfg, d, to, from);
  return finish(cfg, d);
}

/** Recall one drone from a route to the rack. Free. */
export function recallDrone(cfg: HaulConfig, g: HaulGame, slot: number, events?: HaulEvent[]): HaulGame {
  if (!run(g) || !slotOk(g.haul, slot) || g.haul.slots[slot].haulers < 1) return g;
  const d = draftOf(g, events);
  d.h.slots[slot].haulers -= 1;
  dropGuest(d.h, slot);
  d.h.idle += 1;
  return finish(cfg, d);
}

/** True when the player may launch now: docked, and at least 1 unit in the hold. */
export function canLaunch(g: HaulGame): boolean {
  return !!g.haul && g.haul.freighter.phase === 'docked' && holdTotal(g.haul) >= 1 - EPS;
}

/** Launch (the swipe): the freighter loads and climbs; it is paid at the warp-out. */
export function launch(cfg: HaulConfig, g: HaulGame, events?: HaulEvent[]): HaulGame {
  if (!run(g) || !canLaunch(g)) return g;
  const d = draftOf(g, events);
  doLaunch(cfg, d, draftParams(cfg, d), false);
  return finish(cfg, d);
}

/** Rig upgrade on a claimed slot: one level per tap. Counts toward `stats.levelsBought`. */
export function upgradeRig(cfg: HaulConfig, g: HaulGame, slot: number, events?: HaulEvent[]): HaulGame {
  if (!run(g) || !slotOk(g.haul, slot)) return g;
  const cost = rigCost(cfg, g, slot);
  if (!affordable(g.cash, cost)) return g;
  const d = draftOf(g, events);
  pay(d, cost);
  const s = d.h.slots[slot];
  // The current rock keeps its seconds of life (life counts seconds at the rig's current rate); a later rock gets the new tier's life.
  s.rigLevel += 1;
  d.stats.levelsBought += 1;
  return finish(cfg, d);
}

/**
 * Claim a slot: the rig starts at level 1 and rock 0 drifts in after 1.5 s (an `arrive` event).
 * The first ring-2 claim of the game gives a Scrap Pod.
 */
export function claimSlot(cfg: HaulConfig, g: HaulGame, slot: number, events?: HaulEvent[]): HaulGame {
  if (!run(g)) return g;
  const cost = claimCost(cfg, g, slot);
  if (!affordable(g.cash, cost)) return g;
  const d = draftOf(g, events);
  pay(d, cost);
  const h = d.h;
  d.haulStats.bestRing = Math.max(d.haulStats.bestRing ?? 1, ringOf(cfg, slot) + 1);
  h.slots[slot] = { ...h.slots[slot], claimed: true, rigLevel: 1, haulers: 0, rockN: -1, ore: '', bonanza: false, life: 0, pile: 0, full: false, respawnAt: h.clock + CLAIM_DRIFT, routeFrom: h.clock, delivered: 0 };
  h.counters.claims += 1;
  d.stats.claims += 1;
  const claimed = h.slots.filter((s) => s.claimed).length;
  d.haulStats.bestClaimed = Math.max(d.haulStats.bestClaimed, claimed);
  d.events?.push({ type: 'claim', slot });
  if (slotTable(cfg)[slot].ring === 1 && !d.haulStats.ring2Pod) {
    d.haulStats.ring2Pod = true;
    grantPod(cfg, d, cfg.haul.pods.scrap, 'ring2');
  }
  return finish(cfg, d);
}

/** Seconds a claimed slot's first rock takes to drift in. */
export const CLAIM_DRIFT = 1.5;

/** Buy a drone (up to the drone cap): it parks idle on the rack for the player to place. */
export function buyDrone(cfg: HaulConfig, g: HaulGame, events?: HaulEvent[]): HaulGame {
  if (!run(g)) return g;
  const cost = droneCost(cfg, g);
  if (!affordable(g.cash, cost)) return g;
  const d = draftOf(g, events);
  pay(d, cost);
  d.h.fleet.drones += 1;
  d.h.idle += 1;
  return finish(cfg, d);
}

/** Drone capacity +1 level. */
export function buyCapacity(cfg: HaulConfig, g: HaulGame, events?: HaulEvent[]): HaulGame {
  if (!run(g)) return g;
  const cost = capacityCost(cfg, g);
  if (!affordable(g.cash, cost)) return g;
  const d = draftOf(g, events);
  pay(d, cost);
  d.h.fleet.capLevel += 1;
  return finish(cfg, d);
}

/** Drone engines +1 level (until the speed multiplier reaches its cap). */
export function buyEngine(cfg: HaulConfig, g: HaulGame, events?: HaulEvent[]): HaulGame {
  if (!run(g)) return g;
  const cost = engineCost(cfg, g);
  if (!affordable(g.cash, cost)) return g;
  const d = draftOf(g, events);
  pay(d, cost);
  d.h.fleet.engineLevel += 1;
  return finish(cfg, d);
}

/** Freighter +1 level (capacity F, away time, the drawing). */
export function buyFreighter(cfg: HaulConfig, g: HaulGame, events?: HaulEvent[]): HaulGame {
  if (!run(g)) return g;
  const cost = freighterCost(cfg, g);
  if (!affordable(g.cash, cost)) return g;
  const d = draftOf(g, events);
  pay(d, cost);
  d.h.freighter.level += 1;
  return finish(cfg, d);
}

/** Bring the Dock Autopilot online (policy `full`). */
export function buyAutopilot(cfg: HaulConfig, g: HaulGame, events?: HaulEvent[]): HaulGame {
  if (!run(g)) return g;
  const cost = autopilotCost(cfg, g);
  if (!affordable(g.cash, cost)) return g;
  const d = draftOf(g, events);
  pay(d, cost);
  d.h.autopilot = { online: true, policy: d.h.autopilot.policy };
  d.haulStats.autopilotSeen = true;
  return finish(cfg, d);
}

/** Set the autopilot policy (free; allowed before it is online, so the chip remembers the choice). */
export function setPolicy(cfg: HaulConfig, g: HaulGame, policy: AutopilotPolicy): HaulGame {
  if (!run(g) || (policy !== 'full' && policy !== 'contract') || g.haul.autopilot.policy === policy) return g;
  const d = draftOf(g);
  d.h.autopilot.policy = policy;
  return finish(cfg, d);
}

/**
 * Take the contract at board `index` (Decision 40), or none (`null`). At most one contract is taken:
 * picking another offer, or none, while one is taken DROPS the taken one (it leaves the board, the
 * next from the stream takes its place, `contractLapsed {wasActive: true, dropped: true}`); the
 * screens ask for a second tap before a drop that loses progress. The picked offer gets
 * `launches` launches. Picking the taken one again changes nothing. Nothing else ever picks,
 * except contract 0 at the unlock.
 */
export function pickContract(cfg: HaulConfig, g: HaulGame, index: number | null, events?: HaulEvent[]): HaulGame {
  if (!run(g) || !g.haul.contracts.unlocked) return g;
  if (index !== null && !(Number.isInteger(index) && index >= 0 && index < g.haul.contracts.board.length)) return g;
  const cur = g.haul.contracts.active;
  const curTaken = cur !== null && !!g.haul.contracts.board[cur]?.taken;
  if (cur === index && (index === null || curTaken)) return g;
  if (index === null && !curTaken && cur === null) return g;
  const d = draftOf(g, events);
  const C = d.h.contracts;
  if (cur !== null && C.board[cur]?.taken && cur !== index) {
    const dropped = C.board[cur];
    d.events?.push({ type: 'contractLapsed', contract: dropped, wasActive: true, dropped: true });
    const next = drawContract(cfg, d.h, draftParams(cfg, d).F, draftParams(cfg, d));
    C.board[cur] = next.contract;
    C.next = next.next;
    d.events?.push({ type: 'contractNew', contract: next.contract, index: cur });
  }
  C.active = null;
  if (index !== null) {
    const c = C.board[index];
    c.taken = true;
    c.launchesLeft = cfg.haul.contracts.launches;
    c.wants = c.wants.map((w) => ({ ...w, got: 0 }));
    C.active = index;
  }
  return finish(cfg, d);
}

/**
 * Starts a new day shift when one is due (Decision 53): the calendar day `day` (the player's local
 * date, e.g. "2026-11-22") differs from the shift's and at least `haul.shift.minHours` hours passed
 * since it started at wall time `now` (ms). The first call starts the first shift. The store calls
 * this when the game opens, resumes and at each new day; returns the same game when nothing changes.
 */
export function haulShift(cfg: HaulConfig, g: HaulGame, now: number, day: string): HaulGame {
  if (!Number.isFinite(now) || typeof day !== 'string' || !day) return g;
  const s = g.haulStats.shift;
  if (s && (s.day === day || now - s.startedAt < cfg.haul.shift.minHours * 3600 * 1000)) return g;
  return { ...g, haulStats: { ...g.haulStats, shift: { day, startedAt: now, met: 0 } } };
}

/** What the Comms panel shows for the day shift: contracts left that pay twice, of how many (Decision 53). */
export function shiftView(cfg: HaulConfig, g: HaulGame): { left: number; of: number; mult: number } {
  const of = cfg.haul.shift.contracts;
  const met = g.haulStats.shift?.met ?? of;
  return { left: Math.max(0, of - met), of, mult: cfg.haul.shift.mult };
}

/** True when a flare can go onto `slot` now: a charge, a claimed rock with life left (errata 34) and no seam, no flare seam running. */
export function canFlare(g: HaulGame, slot: number): boolean {
  const h = g.haul;
  if (!h || h.flare.charges < 1 || !slotOk(h, slot)) return false;
  const s = h.slots[slot];
  if (s.respawnAt !== null || s.rockN < 0 || !(s.life > 0)) return false;
  if (h.flare.slot !== null && h.flare.until > h.clock) return false;
  return seamAt(h, slot) === null;
}

/** Survey Flare: starts a rich seam on `slot` now (same length and effect as a natural one); the natural schedule does not move. */
export function useFlare(cfg: HaulConfig, g: HaulGame, slot: number, events?: HaulEvent[]): HaulGame {
  if (!run(g) || !canFlare(g, slot)) return g;
  const d = draftOf(g, events);
  const h = d.h;
  h.flare = { ...h.flare, charges: h.flare.charges - 1, slot, until: h.clock + seamDuration(cfg, g), guests: [], peak: 0 };
  d.events?.push({ type: 'vein', slot, flare: true });
  return finish(cfg, d);
}

/** Whether a rewarded-ad flare charge may be granted now (`day` = economy.dayKey(now)). */
export function canAdFlare(cfg: HaulConfig, g: HaulGame, day: string, now: number): boolean {
  const f = g.haul?.flare;
  if (!f) return false;
  const today = f.adDay === day ? f.adsToday : 0;
  return f.charges < cfg.haul.flare.maxCharges && today < cfg.haul.flare.adsPerDay && now >= f.adNextAt;
}

/** Grants a flare charge after a rewarded ad (3 a day, 20 min apart, never above `flare.maxCharges`: errata 33). The store passes `day` = economy.dayKey(now). */
export function grantAdFlare(cfg: HaulConfig, g: HaulGame, day: string, now: number, events?: HaulEvent[]): HaulGame {
  if (!run(g) || !canAdFlare(cfg, g, day, now)) return g;
  const d = draftOf(g, events);
  const f = d.h.flare;
  f.adsToday = (f.adDay === day ? f.adsToday : 0) + 1;
  f.adDay = day;
  f.adNextAt = now + cfg.haul.flare.adGapMinutes * 60_000;
  f.charges = Math.min(cfg.haul.flare.maxCharges, f.charges + 1);
  d.events?.push({ type: 'flareCharge', charges: f.charges });
  return finish(cfg, d);
}

/** Fit a module into socket `i`, or empty it (null). Free and instant (section 5.1). */
export function fitModule(cfg: HaulConfig, g: HaulGame, i: number, cardId: string | null): HaulGame {
  return equip(cfg, g, i, cardId);
}

/**
 * Acknowledge a finished transmission (Comms): counts `stats.transmissionsAcked`, and every
 * `pods.transmissionsEvery`th gives a Derelict Cache. The mission reward itself is the shared claim.
 */
export function ackTransmission(cfg: HaulConfig, g: HaulGame, events?: HaulEvent[]): HaulGame {
  if (!run(g)) {
    // Between galaxies (a pending Jump) there is no run, but the count and the cache still apply.
    const n = g.stats.transmissionsAcked + 1;
    const pod = cfg.haul.pods.derelict;
    const give = n % cfg.haul.pods.transmissionsEvery === 0 && cfg.meta.chests.some((c) => c.id === pod);
    const chests = give ? { ...g.chests, owned: { ...g.chests.owned, [pod]: (g.chests.owned[pod] ?? 0) + 1 } } : g.chests;
    events?.push(...(give ? [{ type: 'podEarned' as const, pod, reason: 'transmissions' as const }] : []));
    return { ...g, chests, stats: { ...g.stats, transmissionsAcked: n } };
  }
  const d = draftOf(g, events);
  d.stats.transmissionsAcked += 1;
  if (d.stats.transmissionsAcked % cfg.haul.pods.transmissionsEvery === 0) grantPod(cfg, d, cfg.haul.pods.derelict, 'transmissions');
  return commit(d);
}

/** Marks a limited hint as shown once more this run (the store calls it when a hint first appears). */
export function markHintShown(g: HaulGame, key: string): HaulGame {
  if (!g.haul) return g;
  return { ...g, haul: { ...g.haul, hintsShown: { ...g.haul.hintsShown, [key]: (g.haul.hintsShown[key] ?? 0) + 1 } } };
}

/**
 * Hangar Expansion bought (or restored) during a run (section 5.4): its start drones join the run at
 * once, idle on the rack, never above the new drone cap, once per run (`flags.hangarDrones`; a run
 * that started with the product owned already has them, see `createHaul`). Refused (same object)
 * for another product, a product not owned, no run, or a second time.
 */
export function grantHangarDrones(cfg: HaulConfig, g: HaulGame, productId: string): HaulGame {
  const hangar = cfg.haul.hangar;
  const h = g.haul;
  if (!hangar || hangar.product !== productId || !h || h.flags.hangarDrones) return g;
  const products = g.entitlements?.products ?? [];
  if (!products.includes(productId)) return g;
  const cap = droneCapFor(cfg, h.galaxy, products);
  const add = Math.max(0, Math.min(hangar.startDrones, cap - h.fleet.drones));
  return {
    ...g,
    haul: {
      ...h,
      flags: { ...h.flags, hangarDrones: true },
      fleet: { ...h.fleet, drones: h.fleet.drones + add },
      idle: h.idle + add,
      marks: add > 0 && h.marks.idleSince === null ? { ...h.marks, idleSince: h.clock } : h.marks,
    },
  };
}
