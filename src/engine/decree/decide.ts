/**
 * Decide, take back, commit, and the order of operations of 2.17. Package P1a
 * (docs/design/office-build-plan.md).
 *
 * Sign is refused while cash < cost; refuse is always possible and free. A signed day paper rests
 * 2 s on the out-tray (`pending`), where a tap takes it back unchanged; it commits after 2 s, at a tap
 * elsewhere or when the app goes to the background. Refusals and slips commit at once. Commit
 * applies `shown` exactly and runs 2.17; the next paper lands after it. Forms are checked at commit:
 * a requisition or slip whose level is no longer `drawnLevel` leaves as "Already done", with no
 * effect; at the cap, "No longer needed".
 *
 * SEAM: `commitItem` IS 2.17: one function calling named steps of both rules packages, in order.
 * Each step is owned by the file named beside it; neither side reorders it without the other.
 */
import { notBuilt } from './notBuilt';
import { landNext } from './draw';
import { scheduleFollowUp } from './followup';
import { checkScandal, countDownScandal } from './scandal';
import { checkStrikes, countDownStrikes } from './strike';
import { checkTermEnd, countDay } from './term';
import { DAY_KINDS, type Choice, type DecreeConfig, type DecreeEvent, type DecreeGame, type DeskItem } from './types';

/**
 * The player's choice on the desk item at play clock `clock` (2.6 `decide(choice)`): a refused
 * sign returns the same object; a signed day paper goes to `pending`; everything else commits now
 * (`commitItem`). Skeleton: throws notBuilt.
 */
export function decide(cfg: DecreeConfig, g: DecreeGame, choice: Choice, clock: number, events: DecreeEvent[]): DecreeGame {
  return notBuilt('decide');
}

/** A tap on the out-tray inside the 2 s: the pending paper back on the desk exactly as it was (H3). Skeleton: throws notBuilt. */
export function takeBack(cfg: DecreeConfig, g: DecreeGame, clock: number, events: DecreeEvent[]): DecreeGame {
  return notBuilt('takeBack');
}

/** The pending paper commits now (its 2 s passed, a tap elsewhere, the app to the background); the same object when none is pending. Skeleton: throws notBuilt. */
export function commitPending(cfg: DecreeConfig, g: DecreeGame, clock: number, events: DecreeEvent[]): DecreeGame {
  return notBuilt('commitPending');
}

/** Applies `shown` of `choice` exactly (H1): moods, cash through commitCash, gossip, levels, appointments, exits, campaign points; a stale form leaves with no effect. Skeleton: throws notBuilt. */
export function applyShown(cfg: DecreeConfig, g: DecreeGame, item: DeskItem, choice: Choice, events: DecreeEvent[]): DecreeGame {
  return notBuilt('applyShown');
}

/** Whether an item counts as a day (2.17 step 2): a paper of a day kind; never a campaign paper, a rally or a slip. Built. */
export function isDay(item: DeskItem): boolean {
  return item.type === 'paper' && DAY_KINDS.includes(item.paper.kind);
}

/**
 * The commit of `item` with `choice` and everything 2.17 runs after it, in this order:
 * (1) apply `shown` (decide.ts `applyShown`, P1a), schedule any follow-up (followup.ts, P1a);
 * (2) for a day paper only: day += 1 and decisions ever += 1 (term.ts `countDay`, P1b), boycott
 *     counters −1 (strike.ts, P1a), the "Say nothing" counter −1, quiet and gossip decay (scandal.ts, P1a);
 * (3) the boycott check, then the gossip and scandal check (strike.ts, scandal.ts, P1a);
 * (4) at day D the run-up starts (term.ts `checkTermEnd`, P1b);
 * (5) the next paper lands, or the slip's 1.0 s starts (draw.ts `landNext`, P1a).
 * Built as the order (the steps it calls throw notBuilt until their packages write them).
 */
export function commitItem(cfg: DecreeConfig, g: DecreeGame, item: DeskItem, choice: Choice, clock: number, events: DecreeEvent[]): DecreeGame {
  // (1)
  let s = applyShown(cfg, g, item, choice, events);
  if (item.type === 'paper') s = scheduleFollowUp(cfg, s, item, choice, events);
  // (2)
  if (isDay(item)) {
    const gained = item.type === 'paper' && item.shown[choice].some((e) => e.type === 'gossip' && e.delta > 0);
    s = countDay(cfg, s);
    s = countDownStrikes(cfg, s, events);
    s = countDownScandal(cfg, s, gained, events);
  }
  // (3)
  s = checkStrikes(cfg, s, events);
  s = checkScandal(cfg, s, events);
  // (4)
  s = checkTermEnd(cfg, s, events);
  // (5)
  return landNext(cfg, s, clock, events);
}
