/**
 * Gossip and the scandal (2.8). Package P1a (docs/design/office-build-plan.md).
 *
 * Gossip rises only by printed effects (never by low approval: no spiral); after `quietDecay`
 * decisions without a gain it falls by 1 (Wendeline Hush's desk rule: after 6). When a commit
 * brings it to G_max with no scandal running, the front page goes on top: sign "Apologise on the
 * steps" (every club −3, one chip, gossip to 0); refuse "Say nothing" (I × 0.8 for 10 decided
 * papers, then gossip 0; the call stays open). "Call the Spin Doctor" ends it now. A scandal running
 * at the term's last day ends.
 *
 * SEAM: `countDownScandal` and `checkScandal` are steps 2 and 3 of 2.17 (called by decide.ts
 * `commitItem`); `sayNothingFactor` is what params.ts multiplies I by; `endScandal` is called by the
 * Spin Doctor ad (./grants.ts, P1b) and the new term (./term.ts, P1b).
 */
import { notBuilt } from './notBuilt';
import type { DecreeConfig, DecreeEvent, DecreeGame, Factors } from './types';

/** I's factor while "Say nothing" runs (2.4: 0.8, with the sayNothing factors of A Gentle Week and Osric Tamp), else 1. Built for the skeleton: 1 when none runs, else the plain factor (the factors are P1a's to apply). */
export function sayNothingFactor(cfg: DecreeConfig, g: DecreeGame, factors: Factors): number {
  return g.decree.scandal ? cfg.decree.scandal.sayNothingFactor : 1;
}

/** 2.17 step 2 for a day paper: the "Say nothing" counter −1 (ending it at 0 with gossip 0), quiet + 1 and the gossip decay. Skeleton: throws notBuilt. */
export function countDownScandal(cfg: DecreeConfig, g: DecreeGame, gained: boolean, events: DecreeEvent[]): DecreeGame {
  return notBuilt('countDownScandal');
}

/** 2.17 step 3: at G_max with no scandal running, the front page goes on top of the tray. Skeleton: throws notBuilt. */
export function checkScandal(cfg: DecreeConfig, g: DecreeGame, events: DecreeEvent[]): DecreeGame {
  return notBuilt('checkScandal');
}

/** Ends "Say nothing" now (the Spin Doctor ad, the term's last day): gossip 0, no mood change. Skeleton: throws notBuilt. */
export function endScandal(cfg: DecreeConfig, g: DecreeGame, how: 'ad' | 'term', events: DecreeEvent[]): DecreeGame {
  return notBuilt('endScandal');
}
