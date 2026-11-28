/**
 * A HALL'S HEAT AS THE WORLD AND THE CARD BOTH READ IT (PLAN2 2.1 `HeatView`; C-FRAMEWORKS, batch 0b). ONE pure function
 * of the content and the state: the frame's `FrameWorks.heat` (frameWorks.ts) and the card's `WorksCard.heat`
 * (cardsWorks.ts, C-CARDS-a) are the SAME object shape made here, so the furnace in the world and the furnace window on
 * the card can never disagree (lesson 13: the rules decide, the screen follows).
 *
 * The phase is the rules' (`WorksState.heat.phase`, halls.ts), with ONE picture-only phase laid over it exactly as the
 * first yard's crucible does (frame.ts pourShown): a hall pours in one instant (halls.ts pour: heating or ready ->
 * cooling, then it charges again at that instant), and the picture shows the pour for frame.ts POUR_LOOK_S after it,
 * unless a new heat has already started (the rules' heating or ready wins). Nothing of the rules waits on it.
 *
 * Every span is a dated span of the rules: heating [phaseSince, endsAt]; ready [phaseSince, endsAt] (endsAt is the
 * self-pour, halls.ts hallApply: phaseSince + works.selfCommission_s); filling [phaseSince, endsAt] once a start is dated
 * (lastFeedAt + batch.start_idle), else null; the pour [cooling.since, cooling.since + POUR_LOOK_S]. A look therefore
 * holds for its whole span and changes only when the rules' state changes.
 *
 * `hallWhy` is the hall's standing reason in words (s2c-plan-world 2.4), from the rules' own predicates: the first heat
 * at ready ("Pours by itself in {t}"), a charge short of its start ("Charge {a} / {b}"), a start the cash cannot pay
 * (halls.ts heatStart: status 'waiting'), the recipe's bays empty, a recipe kept by a tap. Null while it heats or pours.
 */
import type { SalvageContent } from '../../config/schema.salvage';
import { POUR_LOOK_S } from './frame';
import { reagentCostOf } from './works';
import type { HeatView, PlateId, SalvageState, Txt, TextKey, WorksState } from './types';

type S = Pick<SalvageState, 'works' | 't' | 'bays'>;

/** A hall's charge, grams: batch.kg × (1 + lev × (L − 1)) (halls.ts hallCap_g's rule, read without a Ctx). */
function capOf(c: SalvageContent, id: PlateId, w: WorksState): number {
  const d = c.works?.plates[id];
  if (!d?.batch) return 0;
  return d.batch.kg * 1000 * (1 + d.lev * Math.max(0, w.level - 1));
}

/** Is the picture's pour on at t: the instant pour plus POUR_LOOK_S, while no new heat has started (frame.ts pourShown's rule for a hall). */
export function hallPourShown(w: Pick<WorksState, 'heat'>, t: number): boolean {
  const h = w.heat;
  if (!h) return false;
  if (h.phase === 'pouring') return true;
  if (h.phase === 'heating' || h.phase === 'ready') return false;
  const since = h.cooling?.since;
  return since !== undefined && t >= since - 1e-9 && t - since < POUR_LOOK_S;
}

/**
 * The heat of hall `plate` at yard second t (default the state's), or null when the plate is not a running hall. The
 * same object for the frame and the card (see the head of this file).
 */
export function heatView(c: SalvageContent, s: S, plate: PlateId, t: number = s.t): HeatView | null {
  const w = s.works[plate];
  const d = c.works?.plates[plate];
  const h = w?.heat;
  if (!w || !h || !d?.batch || w.phase !== 'running') return null;
  const cap_g = capOf(c, plate, w);
  let chargeGrade: string | null = null;
  let most = 0;
  for (const g in h.chargeBy ?? {}) {
    const v = h.chargeBy![g];
    if (v > most + 1e-9) (most = v), (chargeGrade = g);
  }
  const pour = hallPourShown(w, t);
  const cool = h.cooling;
  const pourSpan = cool?.since !== undefined ? { t0: cool.since, t1: cool.since + POUR_LOOK_S } : null;
  let phase: HeatView['phase'];
  let span: HeatView['span'] = null;
  let selfPourAt: number | null = null;
  let pourer: HeatView['pourer'] = null;
  if (pour) {
    phase = 'pour';
    span = pourSpan;
    pourer = cool?.by === 'boss' ? 'boss' : 'self';
  } else if (h.phase === 'heating') {
    phase = 'heating';
    span = h.endsAt !== null ? { t0: h.phaseSince, t1: h.endsAt } : null;
  } else if (h.phase === 'ready') {
    phase = 'ready';
    span = h.endsAt !== null ? { t0: h.phaseSince, t1: h.endsAt } : null;
    selfPourAt = h.endsAt;
    // The first heat waits at "Ready to pour" for the boss (halls.ts bossNear), then pours by itself at endsAt.
    pourer = 'boss';
  } else if (h.phase === 'filling') {
    phase = 'filling';
    span = h.endsAt !== null ? { t0: h.phaseSince, t1: h.endsAt } : null;
  } else if (h.phase === 'cooling') {
    phase = 'cooling';
  } else phase = 'empty';
  // The ingots of the last pour (the rules' `cooling` record, kept until the next pour): from the pour on.
  const ingots = cool && cool.since !== undefined && (phase === 'pour' || phase === 'cooling') ? { grade: cool.grade, n: cool.n, span: pourSpan } : null;
  return {
    phase,
    recipe: h.recipe || null,
    chosenBy: h.pinned ? 'you' : 'hall',
    charge_g: h.charge_g,
    cap_g,
    chargeGrade,
    span,
    firstPoured: h.firstPoured,
    selfPourAt,
    pourer,
    ingots,
  };
}

/**
 * The hall's standing reason (s2c-plan-world 2.4) for its view `v` at yard second t, or null while it heats or pours.
 * `cash` the yard's cash (a heat whose reagents it cannot pay waits: halls.ts heatStart).
 */
export function hallWhy(c: SalvageContent, s: S, cash: number, plate: PlateId, v: HeatView, t: number = s.t): Txt | null {
  if (v.phase === 'heating' || v.phase === 'pour') return null;
  const w = s.works[plate];
  const h = w?.heat;
  const d = c.works?.plates[plate];
  if (!w || !h || !d?.batch) return null;
  if (v.phase === 'ready') return { key: 'plate.works.selfPour' as TextKey, args: { t: { secs: Math.max(0, Math.ceil((v.selfPourAt ?? t) - t - 1e-9)) } } };
  const rec = d.recipes?.[h.recipe];
  if (v.phase === 'filling' && w.status === 'waiting' && rec) {
    const cost = reagentCostOf(rec.reagents, h.charge_g);
    if (cost > cash + 1e-9) return { key: 'refusal.cash' as TextKey, args: { x: { money: cost - cash } } };
  }
  if (v.phase === 'filling') {
    const start = d.batch.start_share * v.cap_g;
    const b = h.charge_g + h.heel_g < start - 1e-6 ? start : v.cap_g;
    return { key: 'plate.works.charge' as TextKey, args: { a: { mass_g: h.charge_g + h.heel_g, step: 'lot' }, b: { mass_g: b, step: 'lot' } } };
  }
  // Empty (or the last pour's ingots cooled and nothing to charge).
  if (h.pinned && rec) return { key: 'plate.works.keptShort' as TextKey, args: { recipe: { text: `recipe.${h.recipe}` as TextKey } } };
  const first = rec?.in[0] ?? null;
  if (!first) return null;
  const empty = (rec?.in ?? []).every((g) => (s.bays[g]?.g ?? 0) <= 0);
  return empty ? { key: 'plate.works.baysEmpty' as TextKey, args: { grade: { grade: first } } } : { key: 'plate.works.waiting' as TextKey, args: { grade: { grade: first } } };
}
