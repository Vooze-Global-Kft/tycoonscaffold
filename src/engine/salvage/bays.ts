/**
 * Bays, Hold, Sell's set-aside, reservations (yard-stage1.md 2.3). Owner: rules-sim.
 * A bay's `g` holds every gram in it: set-aside grams (`aside`) and reserved grams (`forCrucible_g`,
 * `forDeal_g`) are parts of `g`, never extra.
 */
import type { Ctx } from './clock';
import { resolveGrams } from './money';
import type { BayState } from './types';

export function bayOf(x: Ctx, grade: string): BayState {
  let b = x.s.bays[grade];
  if (!b) {
    b = { g: 0, n: 0, held: false, aside: [], forCrucible_g: 0, forDeal_g: 0 };
    x.s.bays[grade] = b;
  }
  return b;
}

export const asideOf = (b: BayState): number => b.aside.reduce((a, x) => a + x.g, 0);

/** Grams of a bay not reserved and not set aside (what Sell and the round may take). */
export function freeOf(b: BayState): number {
  return Math.max(0, b.g - asideOf(b) - b.forCrucible_g - b.forDeal_g);
}

/** A bay's capacity, grams (content `bays.<grade>` kg; none = unbounded). */
export function capOf(x: Ctx, grade: string): number {
  const kg = x.c.bays[grade];
  return kg === undefined ? Infinity : kg * 1000;
}

/**
 * What the merchant's round may take from a bay now (2.3), resolved down to 0.1 kg per part: an unheld
 * bay its free grams; a held bay its set-aside grams and the free grams above its capacity.
 */
export function collectable(x: Ctx, grade: string): { free: number; aside: number } {
  const b = x.s.bays[grade];
  if (!b) return { free: 0, aside: 0 };
  const aside = resolveDown(asideOf(b));
  const free = b.held ? resolveDown(Math.max(0, freeOf(b) - Math.max(0, capOf(x, grade) - asideOf(b) - b.forCrucible_g - b.forDeal_g))) : resolveDown(freeOf(b));
  return { free, aside };
}

/** Grams resolved DOWN to whole 0.1 kg steps (a lot takes whole steps, 2.2). */
export function resolveDown(g: number): number {
  return Math.floor(Math.max(0, g) / 100 + 1e-9) * 100;
}

/** The deal's reserve fills first from cast iron weighed in (2.9), then the crucible's (2.5). */
export function reserveOnWeighIn(x: Ctx, grade: string): void {
  const b = bayOf(x, grade);
  const d = x.s.deal;
  if (d.phase === 'running' && grade === x.c.deal.grade) {
    const want = Math.max(0, d.q_g - b.forDeal_g);
    b.forDeal_g += Math.min(want, Math.max(0, b.g - asideOf(b) - b.forCrucible_g - b.forDeal_g));
  }
}

void resolveGrams;
