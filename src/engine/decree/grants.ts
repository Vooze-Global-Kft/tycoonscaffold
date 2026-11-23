/**
 * Rewarded ads, products and the Standing Order (5.10, 5.11, 2.6 "the grants of 5.11"). Package P1b
 * (docs/design/office-build-plan.md; a file the skeleton added beside 9.2's list, because 2.6's grants
 * have no other home).
 *
 * Ads (optional, from a button, play-clock cooldowns, a failed load loses nothing): the away
 * report's +50 % (the store pays it: EngineMode.offlineAdMultiplier); Check the Sofa (+40 s of B once
 * a term); Call the Spin Doctor (ends "Say nothing", scandal.ts `endScandal`); Send a Courier (ends a
 * boycott, strike.ts `endStrike`); Open the Doors (fills the in-tray, draw.ts `fillTray`; 15 min play
 * cooldown). Nothing is offered from the call to the end of election night. Products (D11, five):
 * Junior Clerk on Duty (the Standing Order from the first day), Long Lunch (+2 h away cap), two
 * cosmetics (looks only), Private Secretary (the shared skipAds kind; the rules never read it). None
 * touches a mood, the poll or the count (H10).
 * The Standing Order (governor term 2, or day one with Junior Clerk on Duty; a Ledger switch):
 * Cuthbert Wimble buys the advised level while you play when cash ≥ 3 × its price plus the reserve;
 * never while away (tick.ts calls `standingOrderStep`).
 */
import { notBuilt } from './notBuilt';
import type { DecreeAdKind, DecreeConfig, DecreeEvent, DecreeGame } from './types';

/** Whether the ad `kind` may be offered now (phase, cooldown, once a term, something to end). Skeleton: throws notBuilt. */
export function canWatchAd(cfg: DecreeConfig, g: DecreeGame, kind: DecreeAdKind): boolean {
  return notBuilt('canWatchAd');
}

/** The ad's grant after the video completed; the same object when it is not allowed now. Skeleton: throws notBuilt. */
export function grantAd(cfg: DecreeConfig, g: DecreeGame, kind: DecreeAdKind, events: DecreeEvent[]): DecreeGame {
  return notBuilt('grantAd');
}

/** A non-consumable just recorded (EngineMode.entitle): nothing of the run changes now (Long Lunch is read at the next absence, Junior Clerk on Duty by setStandingOrder). Built: the same object. */
export function entitleDecree(cfg: DecreeConfig, g: DecreeGame, productId: string): DecreeGame {
  return g;
}

/** 2.6 `setStandingOrder(on)`; the same object before governor term 2. Skeleton: throws notBuilt. */
export function setStandingOrder(cfg: DecreeConfig, g: DecreeGame, on: boolean): DecreeGame {
  return notBuilt('setStandingOrder');
}

/** The Standing Order's purchase this tick, if any (tick.ts). Skeleton: throws notBuilt. */
export function standingOrderStep(cfg: DecreeConfig, g: DecreeGame, events: DecreeEvent[]): DecreeGame {
  return notBuilt('standingOrderStep');
}

/** The face picked on the loading card (3.1); the same object once one is picked. Skeleton: throws notBuilt. */
export function pickFace(cfg: DecreeConfig, g: DecreeGame, face: string): DecreeGame {
  return notBuilt('pickFace');
}
