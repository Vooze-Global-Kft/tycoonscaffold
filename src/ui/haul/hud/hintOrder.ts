/** The order of the map's hints (errata 55). Pure; tested in ./hintOrder.test.ts. */
import type * as H from '../../../engine/haul';

/**
 * Errata 55's order: the tutorial step; hold full (swipe); a rich seam (drag); an idle drone
 * (drag); no active contract; an unused free flare; then the rest (the autopilot, the Salvage and
 * Fitting Bay buttons) in the rules' order.
 */
export function hintRank(h: H.HaulHint, seamSlots: readonly number[]): number {
  if (h.step > 0) return 0;
  if (h.kind === 'swipe') return 1;
  if (h.kind === 'drag' && seamSlots.some((s) => h.to === `rock:${s}`)) return 2;
  if (h.kind === 'drag') return 3;
  if (h.key === 'bay:counter') return 4;
  if (h.key === 'bay:flare') return 5;
  return 6;
}

/** `hints` in errata 55's order (stable: equal ranks keep the rules' order). */
export function orderHints(hints: readonly H.HaulHint[], seamSlots: readonly number[]): H.HaulHint[] {
  return hints
    .map((h, i) => ({ h, i, r: hintRank(h, seamSlots) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.h);
}
