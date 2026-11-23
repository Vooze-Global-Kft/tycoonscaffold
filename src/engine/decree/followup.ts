/**
 * Follow-ups and clippings (2.7 step 3, 5.4, 7.6). Package P1a (docs/design/office-build-plan.md).
 *
 * A chain is a set-up (a comic or scripted paper) and one follow-up per branch; the outcome that
 * schedules one prints ↩; a sticky note announces it one paper ahead ("Next: the pumpkin is back.").
 * A follow-up is due `delay` decisions ever after its set-up's commit (delay drawn at the draw, site
 * followDelay), drawn earliest first, never without its decided set-up; each follow-up's two choices
 * end the chain in a clipping. Due follow-ups carry across a move (2.12), sized at their own draw.
 *
 * SEAM: `scheduleFollowUp` is step 1 of 2.17 (decide.ts `commitItem`); `dueFollowUp` and
 * `followUpPaper` are step (3) of the draw (draw.ts).
 */
import { notBuilt } from './notBuilt';
import type { Choice, DecreeConfig, DecreeEvent, DecreeGame, DeskItem, FollowUp, Paper } from './types';

/** 2.17 step 1: the committed outcome's follow-up into `followUps` (dueAt in decisions ever); a follow-up's own commit adds its clipping. Skeleton: throws notBuilt. */
export function scheduleFollowUp(cfg: DecreeConfig, g: DecreeGame, item: DeskItem & { type: 'paper' }, choice: Choice, events: DecreeEvent[]): DecreeGame {
  return notBuilt('scheduleFollowUp');
}

/** The earliest follow-up past its dueAt, or null (2.7 step 3). Skeleton: throws notBuilt. */
export function dueFollowUp(cfg: DecreeConfig, g: DecreeGame): FollowUp | null {
  return notBuilt('dueFollowUp');
}

/** The follow-up's paper, sized at its own draw (its archetype's base effects). Skeleton: throws notBuilt. */
export function followUpPaper(cfg: DecreeConfig, g: DecreeGame, f: FollowUp): { paper: Paper; g: DecreeGame } {
  return notBuilt('followUpPaper');
}

/** The sticky note's follow-up one paper ahead ("Next: the pumpkin is back."), or null. Skeleton: throws notBuilt. */
export function stickyNote(cfg: DecreeConfig, g: DecreeGame): { chainId: string; visitor: string } | null {
  return notBuilt('stickyNote');
}
