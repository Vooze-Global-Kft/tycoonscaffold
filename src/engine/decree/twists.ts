/**
 * New things each term and the Factors object (2.14, 2.17 "Twist and minister factors apply to the
 * base Δ before sizing, never after"). Package P1b (docs/design/office-build-plan.md).
 *
 * Every new term in a seat opens one new thing, told on the result sheet: the mayor's terms 2 to 4
 * and the governor's 2 to 5 (then repeating) one twist each; the president a Grand Project at terms
 * 2, 4, 6, 8, 10, one of 10 twists at terms 3, 5, 7, 9, 11 to 16, the 45 pairs at 17 to 61 and the 120
 * triples at 62 to 181, in fixed orders; from 182 "A Quiet Term". Composition: mix twists add, every
 * other factor multiplies, also with minister factors; the validator checks every base |Δ| ≤ 10.
 *
 * SEAM (the ONE Factors object): `deskFactors(cfg, g)` = the twists running this term combined with
 * the appointed ministers' rules (./ministers.ts `ministerFactors`), neutral by default; params.ts
 * reads it for the mixes, τ and G_max, size.ts for every base effect and price (`factorFor`), the
 * strips for the initials. Nothing else multiplies a base effect.
 */
import { notBuilt } from './notBuilt';
import type { ClubIx, DecreeConfig, DecreeGame, FactorTarget, FactorValue, Factors, OfficeIx } from './types';

/** The neutral Factors: no mix change, no factor (7 zeros, enough for every office). Built. */
export function neutralFactors(): Factors {
  return { mixAdd: [0, 0, 0, 0, 0, 0, 0], list: [] };
}

/** Two Factors as one (2.14: mix adds add, every other factor stays a list entry and multiplies). Skeleton: throws notBuilt. */
export function combineFactors(a: Factors, b: Factors): Factors {
  return notBuilt('combineFactors');
}

/** The combined mul and add on `target` for a paper of club `club` (null: a target of no club), and who put them there. Skeleton: throws notBuilt. */
export function factorFor(f: Factors, target: FactorTarget, club: ClubIx | null): FactorValue {
  return notBuilt('factorFor');
}

/** The twists running this term as Factors. Skeleton: throws notBuilt. */
export function twistFactors(cfg: DecreeConfig, g: DecreeGame): Factors {
  return notBuilt('twistFactors');
}

/**
 * The ONE Factors object of the current state: twists combined with ministers. Skeleton: returns
 * `neutralFactors()` (no twist runs and no minister is appointed in any state the skeleton makes);
 * P1b replaces the body with combineFactors(twistFactors, ministerFactors).
 */
export function deskFactors(cfg: DecreeConfig, g: DecreeGame): Factors {
  return neutralFactors();
}

/** The new thing term `term` of office `office` opens (twist ids, a Grand Project id, or 'quiet_term'), for the result sheet and newTerm. Skeleton: throws notBuilt. */
export function newThingAt(cfg: DecreeConfig, office: OfficeIx, term: number): { twists: string[]; grandProject: string | null; quiet: boolean } {
  return notBuilt('newThingAt');
}

/** The validator's composition check (2.14): every term to 181, every base |Δ| ≤ 10 with every minister; problems as text. Skeleton: throws notBuilt. */
export function compositionProblems(cfg: DecreeConfig): string[] {
  return notBuilt('compositionProblems');
}
