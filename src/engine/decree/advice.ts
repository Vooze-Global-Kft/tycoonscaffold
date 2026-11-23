/**
 * Advice and the goal line (2.16). Package P1b (docs/design/office-build-plan.md).
 *
 * `advice(cfg, g)` (pure) picks one goal for the bot, the slip and the goal line:
 * score = max(0, cost − cash + reserve)/I + cost/Δincome over levels, openings and the monument
 * (Δincome 0.02 × I); while the record is short, a level's score is divided by 1.5. It also offers the
 * call when the reader would call (8.2), and during a boycott or scandal the free exit and the ad. The
 * goal line shows words, price and "about 20 s / 2 min / 1 h" in at most 34 characters (lint).
 *
 * SEAM: slips.ts (P1a) takes `advice(...).slip`; it reads params.ts (P1a) prices and slips.ts `reserve`.
 */
import { notBuilt } from './notBuilt';
import type { About, AdviceResult, DecreeConfig, DecreeGame, Goal } from './types';

/** The one goal of 2.16. Skeleton: throws notBuilt. */
export function advice(cfg: DecreeConfig, g: DecreeGame): AdviceResult {
  return notBuilt('advice');
}

/** The goal line's goal (4.1): advice's, as the screen prints it. Skeleton: throws notBuilt. */
export function goalLine(cfg: DecreeConfig, g: DecreeGame): Goal {
  return notBuilt('goalLine');
}

/** A time as the goal line and slips print it: "about 20 s / 2 min / 1 h" (2.16), rounded by the rules. Skeleton: throws notBuilt. */
export function about(seconds: number): About {
  return notBuilt('about');
}
