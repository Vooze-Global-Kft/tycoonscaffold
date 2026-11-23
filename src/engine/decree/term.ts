/**
 * The term, the call, the run-up and the result (2.10, 2.14's new thing a term, 2.17 at a call and
 * at a new term). Package P1b (docs/design/office-build-plan.md).
 *
 * Ribbon "Day 41/80 · NR 9/10 · Lv 52/80"; from day C the button "Call the election · poll 4 of 5".
 * Calling needs day ≥ C and phase governing; at day D the run-up starts by itself. The run-up: the
 * desk paper, if ordinary, and the waiting ordinary papers go aside (draw.ts `setAside`, P1a); a
 * settlement or front page stays on top and is decided first; K campaign papers arrive τ apart (the
 * first at once, draw.ts `drawCampaignPaper`), then the rally (`drawRally`). No ad and no product
 * from the call to the end of election night. The count is the poll (count.ts). After a win NR +=
 * O × (3 + held), + 2 × O for a sweep; after a loss NR += O, losses += 1, "Acting". A new term: day 0;
 * moods halfway back to 50 (rounded toward 50); gossip and campaign points 0; asideTray back
 * (`restoreAside`); then any boycott whose club is now 25 or more ends (strike.ts `endStrike`, P1a); a
 * monument offered; the office's next new thing (twists.ts `newThingAt`).
 *
 * SEAM: `countDay` and `checkTermEnd` are steps 2 and 4 of 2.17 (decide.ts `commitItem`, P1a).
 */
import { notBuilt } from './notBuilt';
import type { DecreeConfig, DecreeEvent, DecreeGame, MoveChoice, ResultSheet, TermRibbon } from './types';

/** 2.17 step 2 for a day paper: day += 1 and decisions ever += 1 (what follow-ups and returns count). Skeleton: throws notBuilt. */
export function countDay(cfg: DecreeConfig, g: DecreeGame): DecreeGame {
  return notBuilt('countDay');
}

/** 2.17 step 4: at day D the run-up starts by itself. Skeleton: throws notBuilt. */
export function checkTermEnd(cfg: DecreeConfig, g: DecreeGame, events: DecreeEvent[]): DecreeGame {
  return notBuilt('checkTermEnd');
}

/** Whether the election may be called now (day ≥ C, phase governing). Skeleton: throws notBuilt. */
export function canCall(cfg: DecreeConfig, g: DecreeGame): boolean {
  return notBuilt('canCall');
}

/** 2.6 `callElection()`: starts the run-up (2.10, 2.17 "At a call"); the same object when not allowed. Skeleton: throws notBuilt. */
export function callElection(cfg: DecreeConfig, g: DecreeGame, clock: number, events: DecreeEvent[]): DecreeGame {
  return notBuilt('callElection');
}

/** 2.6 `countVotes()`: after the rally, the count (count.ts `count`) into `count` and phase `count`, then `result` when election night ends. Skeleton: throws notBuilt. */
export function countVotes(cfg: DecreeConfig, g: DecreeGame, events: DecreeEvent[]): DecreeGame {
  return notBuilt('countVotes');
}

/** 2.6 `chooseAfterWin(moveUp | stay)` and the only choice after a loss ('stay'): a new term here (`newTerm`) or the move (move.ts `moveUp`). Skeleton: throws notBuilt. */
export function chooseAfterResult(cfg: DecreeConfig, g: DecreeGame, choice: MoveChoice, now: number, events: DecreeEvent[]): DecreeGame {
  return notBuilt('chooseAfterResult');
}

/** A new term in the same seat (2.10 "A new term in the seat", 2.17 "At a new term"). Skeleton: throws notBuilt. */
export function newTerm(cfg: DecreeConfig, g: DecreeGame, events: DecreeEvent[]): DecreeGame {
  return notBuilt('newTerm');
}

/** The term ribbon's values (4.1). Skeleton: throws notBuilt. */
export function termRibbon(cfg: DecreeConfig, g: DecreeGame): TermRibbon {
  return notBuilt('termRibbon');
}

/** The result sheet after the count (2.10), or null outside phase result. Skeleton: throws notBuilt. */
export function resultSheet(cfg: DecreeConfig, g: DecreeGame): ResultSheet | null {
  return notBuilt('resultSheet');
}
