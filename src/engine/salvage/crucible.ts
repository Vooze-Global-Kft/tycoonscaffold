/**
 * The crucible (yard-stage1.md 2.5, 2.12, S11, E22): mass only. "Take from bays" moves the recipe's
 * input from the bays into the pot while no heat runs and reserves it while one does; a carrier's piece
 * of the input melts in whole if it fits; a heat starts when the pot is full or at lastFeedAt +
 * start_idle with charge + heel ≥ start_share × pot; it lasts s_per_kg × the new metal's kg; the first
 * heat ever waits at "ready" until the boss is within first_wait_m; ingots and dross go to the tray, the
 * heel stays. Owner: rules-sim.
 */
import { asideOf, bayOf } from './bays';
import { bossFresh, count, type Ctx } from './clock';
import { machineInputs } from './content';
import { pointOf } from './positions';
import type { CrucibleState, Piece } from './types';
import { routeOf } from './works';

/**
 * Stage 2 (2.8.1, B8; rules-works): a grade whose route names another station, or 'bay', is not the crucible's
 * to take from its bay (a grade is reserved by one station at a time). With no plate and no route set (the
 * first yard) nothing is ever routed away, and the crucible behaves exactly as before.
 */
function routedAway(x: Ctx, grade: string): boolean {
  const s = x.s;
  let any = false;
  for (const _ in s.works) {
    any = true;
    break;
  }
  if (!any) for (const _ in s.routes) {
    any = true;
    break;
  }
  if (!any) return false;
  const r = routeOf(x, grade);
  return r !== null && r !== 'crucible';
}

type Recipe = readonly [string | readonly string[], string, number, string];

export function recipeOf(x: Ctx): Recipe | null {
  return (x.c.machines.crucible.recipes[x.s.machines.crucible.recipe] as Recipe | undefined) ?? null;
}

/** The pot, grams: pot × (1 + lev × (L − 1)), heel included. */
export function potCap_g(x: Ctx): number {
  const cr = x.s.machines.crucible;
  const d = x.c.machines.crucible;
  return d.pot * 1000 * (1 + d.lev * Math.max(0, cr.level - 1));
}

/** R1: the charge by input grade (what a recipe change hands back to each bay). */
function addCharge(cr: CrucibleState, grade: string, g: number): void {
  const by = (cr.chargeBy ??= {});
  by[grade] = (by[grade] ?? 0) + g;
}

const busy = (phase: string) => phase === 'heating' || phase === 'ready' || phase === 'pouring';

/** Reserve or move the input from the bays (Take from bays), then date the idle start. */
export function crucibleFromBays(x: Ctx, t: number): void {
  const cr = x.s.machines.crucible;
  if (!cr.owned) return;
  const inputs = machineInputs(x.c, x.s, 'crucible');
  const cap = potCap_g(x);
  if (busy(cr.phase)) {
    // Reserve up to one pot for the next charge (the round never takes reserved grams).
    let room = Math.max(0, cap - cr.heel_g);
    for (const g of Object.keys(x.s.bays)) {
      const b = x.s.bays[g];
      if (!inputs.includes(g) || !cr.fromBays || routedAway(x, g)) {
        b.forCrucible_g = 0;
        continue;
      }
      const free = Math.max(0, b.g - asideOf(b) - b.forDeal_g);
      b.forCrucible_g = Math.min(free, room);
      room -= b.forCrucible_g;
    }
    return;
  }
  if (cr.fromBays) {
    let room = Math.max(0, cap - cr.charge_g - cr.heel_g);
    for (const g of inputs) {
      const b = x.s.bays[g];
      if (!b || room <= 0 || routedAway(x, g)) continue;
      const free = Math.max(0, b.g - asideOf(b) - b.forDeal_g);
      const take = Math.min(free, room);
      if (take <= 0) continue;
      b.g -= take;
      b.forCrucible_g = 0;
      cr.charge_g += take;
      addCharge(cr, g, take);
      room -= take;
      cr.lastFeedAt = t;
    }
  }
  // engine6: the bays walked in their own order without a copy of their keys (no key is added or deleted here); the phase is
  // not busy here (the busy case returned above and nothing since changes it), so the busy test is not asked per bay.
  const bays = x.s.bays;
  for (const g in bays) if (bays[g].forCrucible_g) bays[g].forCrucible_g = 0;
  settle(x, t);
}

/** Melt a carried piece of the input in whole if it fits; true when it went in. */
export function meltPiece(x: Ctx, p: Piece, by: string, t: number): boolean {
  const cr = x.s.machines.crucible;
  if (!cr.owned || busy(cr.phase)) return false;
  if (!machineInputs(x.c, x.s, 'crucible').includes(p.grade)) return false;
  if (cr.charge_g + cr.heel_g + p.g > potCap_g(x)) return false;
  cr.charge_g += p.g;
  addCharge(cr, p.grade, p.g);
  cr.lastFeedAt = t;
  x.ev.push({ type: 'feed', machine: 'crucible', piece: p.uid, grade: p.grade, g: p.g, by });
  settle(x, t);
  return true;
}

/** After a change of charge: start a full pot now, else date the idle start. */
function settle(x: Ctx, t: number): void {
  const cr = x.s.machines.crucible;
  if (busy(cr.phase)) return;
  const cap = potCap_g(x);
  const d = x.c.machines.crucible;
  if (cr.charge_g <= 0) {
    if (cr.phase !== 'empty' && cr.phase !== 'cooling') {
      cr.phase = 'empty';
      cr.phaseSince = t;
    }
    cr.endsAt = null;
    return;
  }
  if (cr.charge_g + cr.heel_g >= cap - 1e-6) {
    heatStart(x, t);
    return;
  }
  if (cr.phase !== 'filling') {
    cr.phase = 'filling';
    cr.phaseSince = t;
  }
  cr.endsAt = cr.charge_g + cr.heel_g >= d.start_share * cap ? Math.max(t, cr.lastFeedAt + d.start_idle) : null;
}

function heatStart(x: Ctx, t: number): void {
  const cr = x.s.machines.crucible;
  cr.phase = 'heating';
  cr.phaseSince = t;
  cr.endsAt = t + x.c.machines.crucible.s_per_kg * (cr.charge_g / 1000);
  cr.status = 'working';
  x.ev.push({ type: 'heatStart', recipe: cr.recipe, g: cr.charge_g });
  crucibleFromBays(x, t);
}

/** Is the boss within first_wait_m of the crucible (the first pour waits for him)? */
function bossNear(x: Ctx, t: number): boolean {
  if (!bossFresh(x, t) || x.s.truck.by === 'boss') return false;
  const p = pointOf(x.c, 'crucible');
  return Math.hypot(x.s.presence.x - p.x, x.s.presence.y - p.y) <= x.c.machines.crucible.first_wait_m;
}

/** The crucible's dated event at t (crucible.endsAt): the idle start, the heat's end. */
export function crucibleEvent(x: Ctx, t: number): void {
  const cr = x.s.machines.crucible;
  if (cr.phase === 'filling') {
    heatStart(x, t);
    return;
  }
  if (cr.phase === 'heating') {
    if (!cr.firstPoured) {
      cr.phase = 'ready';
      cr.phaseSince = t;
      cr.endsAt = null;
      x.ev.push({ type: 'readyToPour' });
      crucibleCheckReady(x, t);
      return;
    }
    pour(x, t, x.s.crew.find((m) => m.role === 'hand')?.id ?? 'crucible');
  }
}

/** The first heat at "ready": pour when the boss comes within first_wait_m. */
export function crucibleCheckReady(x: Ctx, t: number): void {
  const cr = x.s.machines.crucible;
  if (cr.phase === 'ready' && bossNear(x, t)) pour(x, t, 'boss');
}

/**
 * Pour (2.12): dross = round((1 − yield) × charge), metal = charge − dross + heel, n = floor(metal / ingot),
 * the heel keeps the rest. `refill` false (a recipe change, R1): the pot is NOT refilled from the bays
 * here, so the old recipe's input never goes in under the new recipe's output.
 */
export function pour(x: Ctx, t: number, by: string, wholeHeel = false, refill = true): void {
  const cr = x.s.machines.crucible;
  const rec = recipeOf(x);
  if (!rec) return;
  const [, out, yld, drossG] = rec;
  const dross = Math.round((1 - yld) * cr.charge_g);
  const metal = cr.charge_g - dross + cr.heel_g;
  const ingot = x.c.machines.crucible.ingot_kg * 1000;
  const n = wholeHeel ? 0 : Math.floor(metal / ingot + 1e-9);
  const toTray = wholeHeel ? metal : n * ingot;
  cr.heel_g = metal - toTray;
  cr.tray_g[out] = (cr.tray_g[out] ?? 0) + toTray;
  if (dross > 0) cr.tray_g[drossG] = (cr.tray_g[drossG] ?? 0) + dross;
  const first = !cr.firstPoured;
  cr.firstPoured = true;
  cr.charge_g = 0;
  cr.chargeBy = {};
  cr.phase = 'cooling';
  cr.phaseSince = t;
  cr.endsAt = null;
  cr.status = 'idle';
  cr.cooling = { grade: out, n, short_g: wholeHeel ? toTray : 0, since: t, by };
  if (toTray > 0) count(x, `made:${out}`);
  count(x, 'poured');
  count(x, 'worked:crucible');
  x.ev.push({ type: 'pour', ingots: n, grade: out, short_g: wholeHeel ? toTray : 0, dross_g: dross, first, by });
  if (refill) crucibleFromBays(x, t);
}

/** Bay grams the crucible's Take from bays holds (charged or reserved): the goal `charged:crucible`. */
export function crucibleCharged(x: Ctx): boolean {
  const cr = x.s.machines.crucible;
  if (!cr.owned) return false;
  if (cr.charge_g > 0 || cr.phase === 'heating' || cr.phase === 'ready') return true;
  return Object.values(x.s.bays).some((b) => b.forCrucible_g > 0);
}

void bayOf;
