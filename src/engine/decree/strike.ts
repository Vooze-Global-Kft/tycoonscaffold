/**
 * Boycotts, the strike named for what it is (2.8). Package P1a (docs/design/office-build-plan.md).
 *
 * After a commit, any club below 20 whose strike is armed boycotts its ministries (s_i = 0); its
 * picket slogan (none twice a term) hangs on its Ledger row and its spokesperson's grievance goes on
 * top of the tray (it may exceed the cap by 1). Sign "Return the scissors": 20 s of B, the club +10
 * (fixed), the boycott ends. Refuse "Keep the scissors": it runs 8 more decided papers, then ends with
 * no mood change (D6). It ends at once when the club reaches 25 by any means; it re-arms at 30.
 * "Send a Courier" ends it now with no mood change.
 *
 * SEAM: `countDownStrikes` and `checkStrikes` are steps 2 and 3 of 2.17 (decide.ts `commitItem`);
 * `endStrike` is called by the Courier ad (./grants.ts, P1b) and by the new term's halfway reset
 * (./term.ts, P1b: "any boycott whose club is now 25 or more ends").
 */
import { notBuilt } from './notBuilt';
import type { ClubIx, DecreeConfig, DecreeEvent, DecreeGame } from './types';

/** 2.17 step 2 for a day paper: every running boycott's counter −1 (ending at 0 with no mood change). Skeleton: throws notBuilt. */
export function countDownStrikes(cfg: DecreeConfig, g: DecreeGame, events: DecreeEvent[]): DecreeGame {
  return notBuilt('countDownStrikes');
}

/** 2.17 step 3: boycotts that end (club at 25), re-arm (at 30) or start (below 20, armed; grievance on top). Skeleton: throws notBuilt. */
export function checkStrikes(cfg: DecreeConfig, g: DecreeGame, events: DecreeEvent[]): DecreeGame {
  return notBuilt('checkStrikes');
}

/** Ends club g's boycott now (the Courier ad, a mood of 25 at a new term). Skeleton: throws notBuilt. */
export function endStrike(cfg: DecreeConfig, g: DecreeGame, club: ClubIx, how: 'ad' | 'mood' | 'term', events: DecreeEvent[]): DecreeGame {
  return notBuilt('endStrike');
}
