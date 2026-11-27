/**
 * THE FURNACE HALLS (stage 2, docs/design/yard-stage2.md 2.8): the rotary hall and the induction hall (each
 * bought with its filter) and the lead smelter: the crucible's heat generalised to a plate (`WorksState.heat`),
 * charged by "Take from bays" by mass from covered bays only, reagents paid at a heat's start, the first pour
 * waiting for the boss. The first yard's crucible stays in crucible.ts. Owner: rules-works (Phase B).
 *
 * PHASE A STUB (engine2-hooks, 26 November): no hall exists. The loop does not call this file: works.ts
 * dates and applies the queue kind `hall` (works.ts worksDated / worksApply) and calls in here.
 *
 * EVERY DATE a body writes for the queue is at least the yard second t it is written at (s2a-fix): the loop never
 * applies a date before s.t (tick.ts drops it), so a date in the past stops the feature for ever; a saved one is
 * clamped to the save's clock (state2.ts repairStage2).
 */
import { asideOf, bayOf, takeGrams } from './bays';
import { bossFresh, count, heard, numberBays, spend, type Ctx } from './clock';
import { plateDef } from './content';
import { pointOf } from './positions';
import { routesChanged } from './memo';
import type { HeatState, PlateId, WorksState } from './types';
import { plateIds, reagentCostOf, routeOf, routeUnder, type DatedAdd } from './works';

// THE RULE AS BUILT (rules-works, wave 1; 2.8 and S11 of the first yard, generalised from crucible.ts):
// 1. A running hall with "Take from bays" (on by default) charges itself, whenever no heat runs, from the bays of
//    its recipe's inputs WHOSE ROUTE NAMES IT (works.ts routeOf), in the recipe's order, up to its charge
//    batch.kg × (1 + lev × (L − 1)); a bay gives its grams not set aside, not reserved for the deal or the
//    crucible and not reserved for another station. (That a hall draws only from covered bays is the content's
//    check, 3.6 (8).)
// 2. A heat starts when the charge is full, or at the last feed + batch.start_idle with at least
//    batch.start_share of a charge in. Its reagents (Σ kg a kg × kg × § a kg, rounded once) are paid at that
//    instant; while the cash cannot pay them the hall waits, full or not, and tries again at every later instant.
//    A heat lasts batch.s.
// 3. The hall's FIRST heat ever waits at "Ready to pour" for the boss (within machines.crucible.first_wait_m of
//    its plot, live only) and pours by itself works.selfCommission_s after it became ready, present or away the
//    same. Later heats pour at their end.
// 4. A pour puts floor(share × charge) of each recipe output into its grade's bay (the belt weigher: no tray, no
//    ticket); the rest of the charge is waste (the reagents' own mass is not counted in the yard's mass). The hall
//    then charges again from its bays. No heel is kept.
// 5. s2g-halls (RULING2.md 29.1): A HALL CHOOSES ITS OWN RECIPE. A hall with several recipes whose recipe no tap pinned
//    (`heat.pinned` absent, the default of every hall and of every save before the rule) takes, at each heat's start
//    (the first gram of a new charge, rule 1), the recipe hallPick names: the one whose charge from the bays now adds the
//    most worth for that heat (its outputs at usual prices less the charge as it would sell, less its reagents), one that
//    reaches a heat's start before one that does not, ties by the content's order; with nothing to charge it stays as it
//    is. While it chooses it also keeps, for its next heat, the input of each recipe richer a kilogram than the one it is
//    on (works.ts hallRecipeFor: routed and reserved to it as any input), so the richer input is not sold by the round
//    while a poorer heat runs. A tapped recipe (actionsWorks.ts setPlateRecipe) holds, heat after heat, until "Let the hall
//    choose" (letHallChoose). The first yard's crucible is not a hall: unchanged.

type Recipe = NonNullable<ReturnType<typeof plateDef>>['recipes'] extends infer R ? (R extends Record<string, infer V> ? V : never) : never;

export const hallBusy = (phase: HeatState['phase']): boolean => phase === 'heating' || phase === 'ready' || phase === 'pouring';

function recipeOf(x: Ctx, id: PlateId, h: HeatState): Recipe | null {
  return (plateDef(x.c, id)?.recipes?.[h.recipe] as Recipe | undefined) ?? null;
}

/** A hall's charge, grams: batch.kg × (1 + lev × (L − 1)). */
export function hallCap_g(x: Ctx, id: PlateId, w: WorksState): number {
  const d = plateDef(x.c, id);
  if (!d?.batch) return 0;
  return d.batch.kg * 1000 * (1 + d.lev * Math.max(0, w.level - 1));
}

/** Grams of a bay a station may take now: not set aside, not the deal's, not the crucible's, not reserved for another station. */
export function bayAvailFor(x: Ctx, grade: string, station: string): number {
  const b = x.s.bays[grade];
  if (!b) return 0;
  let other = 0;
  for (const k in b.reserved ?? {}) if (k !== station) other += b.reserved![k];
  return Math.max(0, b.g - asideOf(b) - b.forDeal_g - b.forCrucible_g - other);
}

/** Every hall's dated end: a filling hall's idle start, a heat's end, a first heat's self-pour (kind `hall`). */
export function hallsDated(x: Ctx, add: DatedAdd<'hall'>): void {
  const ws = x.s.works;
  for (const id in ws) {
    const h = ws[id].heat;
    if (h && ws[id].phase === 'running') add(h.endsAt, 'hall', id);
  }
}

/** Grams takeGrams would give of a bay for `want` grams (whole units only for a grade counted in units), the bay unchanged. */
function wouldTake(x: Ctx, grade: string, want: number): number {
  const b = x.s.bays[grade];
  if (!b || want <= 0) return 0;
  if (x.c.wholeUnits_kg[grade] !== undefined && b.n > 0) {
    const per = b.g / b.n;
    const k = Math.min(b.n, Math.floor(want / per + 1e-9));
    if (k <= 0) return 0;
    return k === b.n ? b.g : Math.round(k * per);
  }
  return Math.max(0, Math.min(Math.floor(want), b.g));
}

/**
 * s2g-halls (RULING2.md 29.1): the recipe an EMPTY hall that chooses charges next, or null to stay as it is. For each
 * recipe in the content's order: the charge rule 1 would take under it now (its inputs whose route would name the hall,
 * works.ts routeUnder; grams not set aside, the deal's, the crucible's or another station's), and the worth that heat
 * adds: its outputs at usual prices (floor(share × charge), as the pour credits them) less what the charge would sell for
 * as it is, less its reagents (the waste carrier costs nothing in the rules). A recipe whose charge reaches a heat's start
 * (start_share × the charge) is chosen before one that does not; then the most worth; ties by the content's order. Null
 * when no recipe can take a gram, or the hall has one recipe. Reads the state, changes nothing.
 */
export function hallPick(x: Ctx, id: PlateId, w: WorksState): string | null {
  const d = plateDef(x.c, id);
  const h = w.heat;
  const recs = d?.recipes;
  if (!d?.batch || !h || !recs) return null;
  const keys = Object.keys(recs);
  if (keys.length < 2) return null;
  const pbar = (g: string) => x.c.grades[g]?.pbar ?? 0;
  const cap = hallCap_g(x, id, w);
  const need = d.batch.start_share * cap;
  let best: string | null = null;
  let bFill = false;
  let bWorth = -Infinity;
  for (const r of keys) {
    const rec = recs[r] as Recipe;
    const hall = { id, recipe: r };
    let room = Math.max(0, cap - h.heel_g);
    let charge = 0;
    let worth = 0;
    for (const g of rec.in) {
      if (room <= 0) break;
      const avail = bayAvailFor(x, g, id);
      if (avail <= 0 || routeUnder(x, g, hall) !== id) continue;
      const take = wouldTake(x, g, Math.min(avail, room));
      if (take <= 0) continue;
      charge += take;
      room -= take;
      worth -= (take / 1000) * pbar(g);
    }
    if (charge <= 0) continue;
    for (const [o, sh] of rec.out) if (x.c.grades[o]) worth += (Math.floor(sh * charge + 1e-6) / 1000) * pbar(o);
    worth -= reagentCostOf(rec.reagents, charge);
    const fill = charge + h.heel_g >= need - 1e-6;
    if (best === null || (fill && !bFill) || (fill === bFill && worth > bWorth + 1e-9)) {
      best = r;
      bFill = fill;
      bWorth = worth;
    }
  }
  return best;
}

/** Charge from the bays while no heat runs (rule 1), then start or date the heat (rule 2). */
export function hallFromBays(x: Ctx, id: PlateId, t: number): void {
  const w = x.s.works[id];
  const h = w?.heat;
  if (!w || !h || w.phase !== 'running' || hallBusy(h.phase)) return;
  // s2g-halls (RULING2.md 29.1): a hall that chooses (no tap pinned its recipe) takes, at each heat's start (its first
  // gram of a new charge), the recipe that adds the most worth for that heat from what its bays hold (hallPick).
  if (h.fromBays && !h.pinned && h.charge_g <= 0 && h.heel_g <= 0) {
    const r = hallPick(x, id, w);
    if (r !== null && r !== h.recipe) {
      h.recipe = r;
      h.chargeBy = {};
      routesChanged(x);
      if (heard(x)) x.ev.push({ type: 'recipe', recipe: r, heelPoured: false, plate: id });
    }
  }
  const rec = recipeOf(x, id, h);
  if (!rec) return;
  if (h.fromBays) {
    let room = Math.max(0, hallCap_g(x, id, w) - h.charge_g - h.heel_g);
    for (const g of rec.in) {
      if (room <= 0) break;
      if (routeOf(x, g) !== id) continue;
      const take = takeGrams(x, g, Math.min(bayAvailFor(x, g, id), room));
      if (take <= 0) continue;
      h.charge_g += take;
      const by = (h.chargeBy ??= {});
      by[g] = (by[g] ?? 0) + take;
      room -= take;
      h.lastFeedAt = t;
    }
  }
  settle(x, id, w, h, t);
}

function settle(x: Ctx, id: PlateId, w: WorksState, h: HeatState, t: number): void {
  const d = plateDef(x.c, id)!;
  const cap = hallCap_g(x, id, w);
  if (h.charge_g <= 0) {
    if (h.phase === 'filling') {
      h.phase = 'empty';
      h.phaseSince = t;
    }
    h.endsAt = null;
    return;
  }
  if (h.charge_g + h.heel_g >= cap - 1e-6) {
    heatStart(x, id, w, h, t);
    return;
  }
  if (h.phase !== 'filling') {
    h.phase = 'filling';
    h.phaseSince = t;
  }
  if (h.charge_g + h.heel_g < d.batch!.start_share * cap) {
    h.endsAt = null;
    return;
  }
  const due = h.lastFeedAt + d.batch!.start_idle;
  // Due now (or a heat that waited for its reagents' cash): start it at this instant, never a date at t itself
  // (a start the cash cannot pay leaves no date, and is tried again at the next instant's departures).
  if (due <= t + 1e-9) heatStart(x, id, w, h, t);
  else h.endsAt = due;
}

/** A heat starts (rule 2): its reagents are paid now, or it waits while the cash cannot pay them. */
function heatStart(x: Ctx, id: PlateId, w: WorksState, h: HeatState, t: number): void {
  const d = plateDef(x.c, id)!;
  const rec = recipeOf(x, id, h)!;
  const cost = reagentCostOf(rec.reagents, h.charge_g);
  if (cost > 0 && x.cash < cost) {
    if (h.phase !== 'filling') {
      h.phase = 'filling';
      h.phaseSince = t;
    }
    h.endsAt = null;
    if (w.status !== 'waiting') {
      w.status = 'waiting';
      w.since = t;
    }
    return;
  }
  if (cost > 0) spend(x, cost);
  h.phase = 'heating';
  h.phaseSince = t;
  h.endsAt = t + d.batch!.s;
  w.status = 'working';
  x.ev.push({ type: 'heatStart', recipe: h.recipe, g: h.charge_g, plate: id });
}

/** Is the boss within first_wait_m of a hall's plot (the first pour waits for him; live only)? */
function bossNear(x: Ctx, id: PlateId, t: number): boolean {
  if (!x.live || !bossFresh(x, t) || x.s.truck.by === 'boss' || x.s.presence.driving) return false;
  const p = pointOf(x.c, plateDef(x.c, id)!.plot);
  return Math.hypot(x.s.presence.x - p.x, x.s.presence.y - p.y) <= x.c.machines.crucible.first_wait_m;
}

/** A hall's dated event at its instant t: the idle start, a heat's end, a first heat's self-pour. */
export function hallApply(x: Ctx, id: PlateId, t: number): void {
  const w = x.s.works[id];
  const h = w?.heat;
  if (!w || !h || w.phase !== 'running') return;
  if (h.phase === 'filling') {
    heatStart(x, id, w, h, t);
    return;
  }
  if (h.phase === 'heating') {
    if (!h.firstPoured) {
      h.phase = 'ready';
      h.phaseSince = t;
      h.endsAt = t + (x.c.works?.selfCommission_s ?? 0);
      x.ev.push({ type: 'readyToPour', plate: id });
      if (bossNear(x, id, t)) pour(x, id, t, 'boss');
      return;
    }
    pour(x, id, t, id);
    return;
  }
  if (h.phase === 'ready') pour(x, id, t, id);
}

/** The first heat of any hall at "Ready to pour" pours when the boss comes near (hand.ts bossStep through works.ts worksAct). */
export function hallCheckReady(x: Ctx, t: number): void {
  for (const id of plateIds(x)) {
    const h = x.s.works[id]?.heat;
    if (h && h.phase === 'ready' && bossNear(x, id, t)) pour(x, id, t, 'boss');
  }
}

/** A pour (rule 4): each output into its bay, the rest waste; then the hall charges again. */
export function pour(x: Ctx, id: PlateId, t: number, by: string): void {
  const w = x.s.works[id];
  const h = w.heat!;
  const rec = recipeOf(x, id, h);
  if (!rec) return;
  let outSum = 0;
  let main = '';
  let mainG = 0;
  let second = 0;
  rec.out.forEach(([g, sh], i) => {
    if (!x.c.grades[g]) return;
    const n = Math.floor(sh * h.charge_g + 1e-6);
    if (n <= 0) return;
    bayOf(x, g).g += n;
    outSum += n;
    count(x, `made:${g}`);
    if (i === 0) {
      main = g;
      mainG = n;
    } else if (i === 1) second = n;
  });
  x.s.waste_g += h.charge_g - outSum;
  // A bay's first stock is numbered at the instant it gets it (as a weigh-in and a bay-fed plate's piece do), never at
  // a transition's end: a bay poured into and emptied inside one jump was numbered by a tick only (s2-fix-works:
  // joined.test.ts r4 and u13, 'bay#: 25 vs 23', once the crane no longer moved there).
  numberBays(x);
  const first = !h.firstPoured;
  h.firstPoured = true;
  h.charge_g = 0;
  h.chargeBy = {};
  h.phase = 'cooling';
  h.phaseSince = t;
  h.endsAt = null;
  h.cooling = { grade: main, n: 0, short_g: 0, since: t, by };
  w.status = 'idle';
  count(x, `poured:${id}`);
  count(x, `worked:${id}`);
  x.ev.push({ type: 'pour', ingots: 0, grade: main, short_g: 0, dross_g: second, first, by, plate: id });
  void mainG;
  hallFromBays(x, id, t);
}

/** Every hall's reserve on its routed bays (works.ts refreshReserves asks): its charge. */
export function hallReserve(x: Ctx, id: PlateId, w: WorksState): number {
  return w.heat?.fromBays ? hallCap_g(x, id, w) : 0;
}

/** Keep the first yard's own import list honest (the crucible's file is the model of this one). */
void bayOf;
