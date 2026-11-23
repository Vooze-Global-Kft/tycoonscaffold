/**
 * Ministers (2.9, 7.3). Package P1b (docs/design/office-build-plan.md).
 *
 * Nine ministers arrive as applications in a fixed order, the next undelivered one at days 9, 30
 * and 60 of any term until all have come. Sign appoints; refuse sends them away and the same
 * application returns 30 papers later, in any office. Each runs their club's ministry in every office
 * and brings one desk rule, a factor on one parameter printed as their initials on every paper it
 * touches ("DP ×0.9"). Never bought, never random, never ranked.
 *
 * SEAM: `nextApplication` is what the draw's step (4) asks (draw.ts, P1a: "what the draw needs from
 * the term"); `ministerFactors` goes into the ONE Factors object (./twists.ts `deskFactors`); the
 * appoint effect of an application is applied by decide.ts (P1a) `applyShown` through `appoint`, its
 * refusal through `sendAway`; slips.ts `ledger` (P1a) reads `cabinet` for each row's minister. D21:
 * the next application is the next undelivered minister whose club the current office has.
 */
import { notBuilt } from './notBuilt';
import type { DecreeConfig, DecreeEvent, DecreeGame, Factors } from './types';

/** The minister whose application is due now (day 9, 30 or 60 of any term, or a return 30 papers after a refusal), or null. Skeleton: throws notBuilt. */
export function nextApplication(cfg: DecreeConfig, g: DecreeGame): string | null {
  return notBuilt('nextApplication');
}

/** The appointed ministers' desk rules as Factors (club-scoped to their ministry's club). Skeleton: throws notBuilt. */
export function ministerFactors(cfg: DecreeConfig, g: DecreeGame): Factors {
  return notBuilt('ministerFactors');
}

/** Appoints `minister` (the application's sign effect). Skeleton: throws notBuilt. */
export function appoint(cfg: DecreeConfig, g: DecreeGame, minister: string, events: DecreeEvent[]): DecreeGame {
  return notBuilt('appoint');
}

/** Sends `minister` away (the refusal): the application returns returnAfter decisions later. Skeleton: throws notBuilt. */
export function sendAway(cfg: DecreeConfig, g: DecreeGame, minister: string): DecreeGame {
  return notBuilt('sendAway');
}

/** The Cabinet (4.4): each seat's minister, ministry, desk rule and terms served, in order; empty places dotted. Skeleton: throws notBuilt. */
export function cabinet(cfg: DecreeConfig, g: DecreeGame): { minister: string; appointed: boolean; ministry: number | null; termsServed: number; initials: string }[] {
  return notBuilt('cabinet');
}
