/**
 * Player actions (section 2.5). Each takes the game and returns the new game, or the same object
 * unchanged when the action is not allowed (so `next === state` means "refused"). Pass `events`
 * to collect what happened.
 */
import { equip } from '../loadout';
import { affordable, autopilotCost, capacityCost, claimCost, droneCost, EPS, engineCost, freighterCost, holdTotal, rigCost, slotTable } from './params';
import { commit, doLaunch, draftOf, draftParams, dropGuest, grantPod, seamAt, seamDuration, updateMarks, warmUp, type Draft } from './tick';
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

/** A drone arrives on `slot`: warm-up if the route was empty; a guest of the seam if the slot has one. */
function arrive(cfg: HaulConfig, d: Draft, slot: number, origin: number): void {
  const h = d.h;
  warmUp(cfg, draftParams(cfg, d), h, slot);
  h.slots[slot].haulers += 1;
  const seam = seamAt(h, slot);
  if (seam) {
    seam.guests.push(origin);
    d.stats.seamDrags += 1;
  }
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
  return finish(cfg, d);
}

/** Set the autopilot policy (free; allowed before it is online, so the chip remembers the choice). */
export function setPolicy(cfg: HaulConfig, g: HaulGame, policy: AutopilotPolicy): HaulGame {
  if (!run(g) || (policy !== 'full' && policy !== 'contract') || g.haul.autopilot.policy === policy) return g;
  const d = draftOf(g);
  d.h.autopilot.policy = policy;
  return finish(cfg, d);
}

/** Pick the active contract by board index (null clears the pick). Nothing else ever picks, except contract 0 at the unlock. */
export function pickContract(cfg: HaulConfig, g: HaulGame, index: number | null): HaulGame {
  if (!run(g) || !g.haul.contracts.unlocked) return g;
  if (index !== null && !(Number.isInteger(index) && index >= 0 && index < g.haul.contracts.board.length)) return g;
  if (g.haul.contracts.active === index) return g;
  const d = draftOf(g);
  d.h.contracts.active = index;
  return finish(cfg, d);
}

/** True when a flare can go onto `slot` now: a charge, a claimed rock without a seam, no flare seam running. */
export function canFlare(g: HaulGame, slot: number): boolean {
  const h = g.haul;
  if (!h || h.flare.charges < 1 || !slotOk(h, slot)) return false;
  const s = h.slots[slot];
  if (s.respawnAt !== null || s.rockN < 0) return false;
  if (h.flare.slot !== null && h.flare.until > h.clock) return false;
  return seamAt(h, slot) === null;
}

/** Survey Flare: starts a rich seam on `slot` now (same length and effect as a natural one); the natural schedule does not move. */
export function useFlare(cfg: HaulConfig, g: HaulGame, slot: number, events?: HaulEvent[]): HaulGame {
  if (!run(g) || !canFlare(g, slot)) return g;
  const d = draftOf(g, events);
  const h = d.h;
  h.flare = { ...h.flare, charges: h.flare.charges - 1, slot, until: h.clock + seamDuration(cfg, g), guests: [] };
  d.events?.push({ type: 'vein', slot, flare: true });
  return finish(cfg, d);
}

/** Whether a rewarded-ad flare charge may be granted now (`day` = economy.dayKey(now)). */
export function canAdFlare(cfg: HaulConfig, g: HaulGame, day: string, now: number): boolean {
  const f = g.haul?.flare;
  if (!f) return false;
  const today = f.adDay === day ? f.adsToday : 0;
  return today < cfg.haul.flare.adsPerDay && now >= f.adNextAt;
}

/** Grants a flare charge after a rewarded ad (3 a day, 20 min apart). The store passes `day` = economy.dayKey(now). */
export function grantAdFlare(cfg: HaulConfig, g: HaulGame, day: string, now: number, events?: HaulEvent[]): HaulGame {
  if (!run(g) || !canAdFlare(cfg, g, day, now)) return g;
  const d = draftOf(g, events);
  const f = d.h.flare;
  f.adsToday = (f.adDay === day ? f.adsToday : 0) + 1;
  f.adDay = day;
  f.adNextAt = now + cfg.haul.flare.adGapMinutes * 60_000;
  f.charges += 1;
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
    const n = g.stats.transmissionsAcked + 1;
    return { ...g, stats: { ...g.stats, transmissionsAcked: n } };
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
