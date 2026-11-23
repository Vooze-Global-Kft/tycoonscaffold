/**
 * The bigger office (2.12, `EngineMode.prestige` and `canPrestige`). Package P1b
 * (docs/design/office-build-plan.md).
 *
 * `canPrestige` is true only on the result sheet after a win meeting both requirements (Name
 * Recognition and the record of the office below). Resets: treasury to the transition fund (30 s of
 * the old B); the new office's ministries (ministry 0 at level 1); clubs at 50 + min(5, floor(NR/20));
 * gossip, boycotts, scandal, day, campaign, losses; tray and asideTray back to the deck unseen
 * (draw.ts `returnToDeck`, P1a). Carries: Name Recognition; ministers (each runs the new office's
 * ministry of their club); monuments; scrapbook and seen texts; due follow-ups; purchases; the Office
 * wall with the old town's photograph and levels.
 */
import { notBuilt } from './notBuilt';
import type { DecreeConfig, DecreeEvent, DecreeGame, MoveSheet } from './types';

/** What the move sheet lists under "Resets" and "Stays" (ids the strings name). */
export const MOVE_RESETS = ['treasury', 'ministries', 'moods', 'gossip', 'boycotts', 'scandal', 'day', 'campaign', 'losses', 'tray'] as const;
export const MOVE_STAYS = ['nr', 'ministers', 'monuments', 'scrapbook', 'followUps', 'purchases', 'wall'] as const;

/** Whether the move up may happen now (the result sheet after a win with both requirements met). Skeleton: throws notBuilt. */
export function canMoveUp(cfg: DecreeConfig, g: DecreeGame): boolean {
  return notBuilt('canMoveUp');
}

/** The move to the next office (2.12); the same object when not allowed. `now` is wall ms (only lastSavedAt takes it). Skeleton: throws notBuilt. */
export function moveUp(cfg: DecreeConfig, g: DecreeGame, now: number, events: DecreeEvent[]): DecreeGame {
  return notBuilt('moveUp');
}

/** The move sheet (2.12): Resets, Stays, Next, and when the new income passes the old (advice). Skeleton: throws notBuilt. */
export function moveSheet(cfg: DecreeConfig, g: DecreeGame): MoveSheet | null {
  return notBuilt('moveSheet');
}
