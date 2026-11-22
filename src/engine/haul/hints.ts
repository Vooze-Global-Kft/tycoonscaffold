/**
 * The haul hint source (section 3): which hint comes next, decided from state alone, so a faster
 * or slower player still gets the right one. Six guided steps, then the rules after the tutorial.
 * Target keys are those of section 3 (`rock:<slot>`, `drone:rack`, `bay:launch`, ...).
 */
import { advisedPurchase, bestSlotForDrone, rankPurchases, type RankedPurchase } from './advice';
import { haulIncome } from './rates';
import { affordable, autopilotCost, claimCost, droneCost, fillsFreighter, haulParams, holdTotal, rigCost } from './params';
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
 * Decision 57: after the guided steps, in the first ADVICE_UNTIL seconds of galaxy 1, a purchase that
 * raises the income line by at least ADVICE_GAIN is named once the player has bought nothing for
 * ADVICE_IDLE_SECONDS, at most ADVICE_MAX times a run and never the purchase made last.
 */
export const ADVICE_IDLE_SECONDS = 40;
export const ADVICE_UNTIL = 900;
export const ADVICE_GAIN = 0.15;
export const ADVICE_MAX = 6;

/** The hint target of a purchase key of advice.ts ('drone', 'rig 2', 'claim 3', ...): the control and its opener. */
export function adviceTarget(key: string): { key: string; route: string[] } | null {
  const [what, n] = key.split(' ');
  if (what === 'drone') return { key: 'station:buyDrone', route: ['station'] };
  if (what === 'capacity' || what === 'engine' || what === 'freighter') return { key: `station:${what}`, route: ['station'] };
  if (what === 'rig' && n !== undefined) return { key: 'rig:upgrade', route: [`rock:${n}`] };
  if (what === 'claim' && n !== undefined) return { key: `slot:${n}`, route: [] };
  return null;
}

/** Every key an advice hint can carry (their `hintsShown` counts add up to the run's ADVICE_MAX). */
const isAdviceKey = (k: string) => k === 'rig:upgrade' || k.startsWith('slot:') || (k.startsWith('station:') && k !== 'station:autopilot');

/**
 * The marks of the last purchase of the run, when the rules keep them (`marks.boughtAt`: run clock of
 * the last level, claim or drone bought; `marks.lastBuy`: its advice.ts key). Without them no advice
 * shows: "bought nothing for 40 s" cannot be read from the state.
 */
function lastPurchase(h: HaulState): { at: number; key: string | null } | null {
  const m = h.marks as HaulState['marks'] & { boughtAt?: number | null; lastBuy?: string | null };
  if (m.boughtAt === undefined) return null;
  return { at: m.boughtAt ?? 0, key: m.lastBuy ?? null };
}

/**
 * Decision 57's purchase to name (Decision 64: the limit is named by what it really gives). The best
 * single purchase that raises the income line by `minGain` (advice.ts), else the limit that binds:
 * when a station is freighter-bound (or drone- or capacity-bound) no single purchase pays alone, and a
 * rig level or a drone only pays with one level of that partner. Then the partner is named, valued
 * with the purchase it opens (in play the first freighter level raised the line 3.21 to 4.57 while it
 * read +2 % alone), when both are affordable together and the pair gains `minGain`. Never `skip`.
 */
export function limitPurchase(cfg: HaulConfig, g: Run, minGain = ADVICE_GAIN, skip: string | null = null): RankedPurchase | null {
  const single = advisedPurchase(cfg, g, minGain, skip);
  if (single) return single;
  const before = haulIncome(cfg, g);
  if (!(before > 0)) return null;
  for (const o of rankPurchases(cfg, g)) {
    const q = o.bundle;
    if (!q || q.key === skip || !affordable(g.cash, o.total) || !(o.gain >= minGain * before)) continue;
    return { ...q, total: q.cost, gain: o.gain, score: o.score };
  }
  return null;
}

/** Decision 57's hint now, or null. */
export function adviceHint(cfg: HaulConfig, g: HaulGame): HaulHint | null {
  const h = g.haul;
  if (!h || h.galaxy !== 0 || !h.flags.tutorialDone || h.clock >= ADVICE_UNTIL) return null;
  const last = lastPurchase(h);
  if (!last || h.clock - last.at < ADVICE_IDLE_SECONDS) return null;
  const shown = Object.entries(h.hintsShown).reduce((a, [k, n]) => a + (isAdviceKey(k) ? n : 0), 0);
  if (shown >= ADVICE_MAX) return null;
  const pick = limitPurchase(cfg, g as Run, ADVICE_GAIN, last.key);
  const target = pick ? adviceTarget(pick.key) : null;
  return target ? { kind: 'point', key: target.key, route: target.route, row: null, step: 0, limit: ADVICE_MAX } : null;
}

export { bestSlotForDrone } from './advice';

/** The route with the most drones (ties: the lowest slot), excluding `except`; null when no route has drones. */
export function busiestRoute(h: HaulState, except: number | null = null): number | null {
  let best: number | null = null;
  h.slots.forEach((s, i) => {
    if (!s.claimed || i === except || s.haulers <= 0) return;
    if (best === null || s.haulers > h.slots[best].haulers) best = i;
  });
  return best;
}

/** The claimed slot whose rock has the most life left (ties: the lowest slot); null when no claimed slot has a rock. */
export function longestLifeSlot(h: HaulState): number | null {
  let best: number | null = null;
  h.slots.forEach((s, i) => {
    if (!s.claimed || s.respawnAt !== null || s.rockN < 0 || !(s.life > 0)) return;
    if (best === null || s.life > h.slots[best].life + 1e-9) best = i;
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
  const full = fillsFreighter(holdTotal(h), p.F);
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
    // Decision 58: it points at the claimed rig whose rock has the longest life left, so the guided
    // level is not spent on a rock about to dry (the level stays with the slot either way).
    const longest = longestLifeSlot(h);
    if (s1?.claimed && s1.haulers > 0 && !rigUp && longest !== null && affordable(g.cash, rigCost(cfg, g as Run, longest))) guided.push(point('rig:upgrade', 6, [`rock:${longest}`]));
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
    const advice = adviceHint(cfg, g);
    if (advice) out.push(advice);
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
