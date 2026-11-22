/**
 * The haul hint source (section 3): which hint comes next, decided from state alone, so a faster
 * or slower player still gets the right one. Six guided steps, then the rules after the tutorial.
 * Target keys are those of section 3 (`rock:<slot>`, `drone:rack`, `bay:launch`, ...).
 */
import { affordable, autopilotCost, claimCost, droneCost, EPS, haulParams, holdTotal, rigCost } from './params';
import type { HaulConfig, HaulGame, HaulHint, HaulState } from './types';

type Run = HaulGame & { haul: HaulState };

/** Seconds an idle drone waits on the rack before the drag hint. */
export const IDLE_HINT_SECONDS = 10;
/** Seconds the hold is full (no autopilot) before the swipe hint, after the tutorial. */
export const HOLD_HINT_SECONDS = 4;
/** Seconds without an active contract before the board hint. */
export const CONTRACT_HINT_SECONDS = 30;
/** Seconds a free flare charge waits before the flare hint. */
export const FLARE_HINT_SECONDS = 600;
/**
 * Seconds a guided step keeps the pointer after the hold fills before the swipe hint goes first
 * (Decision 44: a guided step keeps the pointer for its first 10 s even if the hold fills).
 */
export const GUIDED_PRIORITY_SECONDS = 10;
/** Limited hints show at most this many times per run. */
export const LIMITED_HINTS = 3;

/**
 * The claimed slot (with a rock or about to get one) where one more drone adds the most value:
 * `[min(r, (n+1)c/trip) − min(r, n c/trip)] × price` (the bot's rule, section 8). Null when none.
 */
export function bestSlotForDrone(cfg: HaulConfig, g: HaulGame): number | null {
  if (!g.haul) return null;
  const p = haulParams(cfg, g as Run);
  let best: number | null = null;
  let bestV = -1;
  g.haul.slots.forEach((s, i) => {
    if (!s.claimed) return;
    const sp = p.slots[i];
    const r = sp.r > 0 ? sp.r : sp.rb0;
    const gain = (Math.min(r, ((s.haulers + 1) * sp.c) / sp.trip) - Math.min(r, (s.haulers * sp.c) / sp.trip)) * (sp.price || p.prices[cfg.haul.ores[0].id] || 0);
    if (gain > bestV + 1e-12) {
      bestV = gain;
      best = i;
    }
  });
  return best;
}

/** The route with the most drones (ties: the lowest slot), excluding `except`; null when no route has drones. */
export function busiestRoute(h: HaulState, except: number | null = null): number | null {
  let best: number | null = null;
  h.slots.forEach((s, i) => {
    if (!s.claimed || i === except || s.haulers <= 0) return;
    if (best === null || s.haulers > h.slots[best].haulers) best = i;
  });
  return best;
}

const drag = (from: string, to: string, step: number): HaulHint => ({ kind: 'drag', key: to, route: [], row: null, from, to, step });
const point = (key: string, step: number, route: string[] = [], limit?: number): HaulHint => ({ kind: 'point', key, route, row: null, step, limit });

/**
 * Every hint that applies now, most urgent first (the shared HintSource's `ask`). The UI shows the
 * first one, waits for open sheets, and calls markHintShown for hints with a `limit`.
 */
export function hintsFor(cfg: HaulConfig, g: HaulGame): HaulHint[] {
  const h = g.haul;
  if (!h) return [];
  const p = haulParams(cfg, g as Run);
  const out: HaulHint[] = [];
  const full = holdTotal(h) >= p.F - EPS;
  const docked = h.freighter.phase === 'docked';
  const tutorial = !h.flags.tutorialDone && h.galaxy === 0;
  const s0 = h.slots[0];
  const s1 = h.slots[1];
  if (tutorial) {
    // Decision 44: each guided purchase raises income, in this order.
    const guided: HaulHint[] = [];
    // 1: send the first drone.
    if (g.stats.launches === 0 && s0.haulers === 0 && h.idle > 0) guided.push(drag('drone:rack', 'rock:0', 1));
    // 3: claim the second rock (the ghost slot, then its confirm chip).
    if (g.stats.launches >= 1 && s1 && !s1.claimed && affordable(g.cash, claimCost(cfg, g as Run, 1))) guided.push(point('slot:1', 3));
    // 4: buy a drone for it (when no drone is free for the new rock).
    const needs = !!s1?.claimed && s1.respawnAt === null && s1.haulers === 0;
    if (needs && h.idle === 0 && s0.haulers <= 1 && affordable(g.cash, droneCost(cfg, g as Run))) guided.push(point('station:buyDrone', 4, ['station']));
    // 5: tap the drone, then the new rock (or, with no drone on the rack, move one from the first rock).
    if (needs && h.idle > 0) guided.push({ kind: 'tapTap', key: 'rock:1', route: [], row: null, from: 'drone:rack', to: 'rock:1', step: 5 });
    else if (needs && s0.haulers >= 2) guided.push(drag('chip:0', 'rock:1', 5));
    // 6: upgrade a rig, once both rocks are worked (the first rig level ends the guided steps).
    const rigUp = h.slots.some((x) => x.claimed && x.rigLevel > 1);
    if (s1?.claimed && s1.haulers > 0 && !rigUp && affordable(g.cash, rigCost(cfg, g as Run, 0))) guided.push(point('rig:upgrade', 6, ['rock:0']));
    // 2: clear the pad. A guided step keeps the pointer for the first GUIDED_PRIORITY_SECONDS after the
    // hold fills; after that the swipe goes first (the station earns nothing while the pad is full).
    const swipe: HaulHint | null = full && docked && !h.autopilot.online ? { kind: 'swipe', key: 'bay:launch', route: [], row: null, zone: 'bay:launch', step: 2 } : null;
    const fullFor = h.marks.holdFullSince === null ? 0 : h.clock - h.marks.holdFullSince;
    if (swipe && guided.length > 0 && fullFor < GUIDED_PRIORITY_SECONDS) out.push(...guided, swipe);
    else out.push(...(swipe ? [swipe] : []), ...guided);
  }
  // Every rich seam: drag from the busiest route to it (until a drone is on it).
  for (const seam of [h.vein, h.flare]) {
    if (seam.slot === null || seam.until <= h.clock || seam.guests.length > 0) continue;
    const from = busiestRoute(h, seam.slot);
    if (from !== null) out.push(drag(`chip:${from}`, `rock:${seam.slot}`, 0));
    else if (h.idle > 0) out.push(drag('drone:rack', `rock:${seam.slot}`, 0));
  }
  if (!tutorial) {
    if (h.marks.holdFullSince !== null && h.clock - h.marks.holdFullSince >= HOLD_HINT_SECONDS && docked) out.push({ kind: 'swipe', key: 'bay:launch', route: [], row: null, zone: 'bay:launch', step: 0 });
    if (h.idle > 0 && h.marks.idleSince !== null && h.clock - h.marks.idleSince >= IDLE_HINT_SECONDS) {
      const best = bestSlotForDrone(cfg, g);
      if (best !== null) out.push(drag('drone:rack', `rock:${best}`, 0));
    }
  }
  if (!h.autopilot.online && (h.flags.tutorialDone || g.stats.launches >= 4) && affordable(g.cash, autopilotCost(cfg, g as Run))) out.push(point('station:autopilot', 0, ['station']));
  const limited = (key: string) => (h.hintsShown[key] ?? 0) < LIMITED_HINTS;
  if (h.marks.noContractSince !== null && h.clock - h.marks.noContractSince >= CONTRACT_HINT_SECONDS && limited('bay:counter')) out.push(point('bay:counter', 0, [], LIMITED_HINTS));
  if (h.marks.flareReadySince !== null && h.clock - h.marks.flareReadySince >= FLARE_HINT_SECONDS && limited('bay:flare')) out.push(point('bay:flare', 0, [], LIMITED_HINTS));
  if (!tutorial) {
    const pods = Object.values(g.chests.owned).reduce((a, b) => a + (b > 0 ? b : 0), 0);
    if (pods > 0 && g.stats.chestsOpened === 0 && (h.hintsShown['button:salvage'] ?? 0) < 1) out.push(point('button:salvage', 0, [], 1));
    if (g.stats.chestsOpened > 0 && g.loadout.sockets.every((x) => x === null) && (h.hintsShown['button:fitting'] ?? 0) < 1) out.push(point('button:fitting', 0, [], 1));
  }
  return out;
}

/** The one hint to show now (the first of `hintsFor`), or null. */
export function nextHint(cfg: HaulConfig, g: HaulGame): HaulHint | null {
  return hintsFor(cfg, g)[0] ?? null;
}

/** A stable key for a hint (for "is this a new hint" checks). */
export function hintKey(h: HaulHint): string {
  return `${h.kind}:${h.from ?? ''}>${h.key}`;
}
