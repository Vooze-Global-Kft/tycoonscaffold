/**
 * The player's purchases and buttons (spec 2.5, 2.7, 5.7) and the one clamp through which cash
 * changes (`commitCash`, spec 2.3: coins enter only through the six sources).
 *
 * Package MECHANICS (docs/design/market-build-plan.md). Seam: ORDERS calls `commitCash` for the
 * Festival purse ('festival') and gift-box coins ('gift'); nothing else changes `cash`.
 * The store actions (src/modes/merge/actions.ts) call these through src/engine/merge.ts; each
 * returns the same object when refused (the store then plays `ui_denied`).
 *
 * After every purchase (openStall, levelGear, levelStall, hireMinder, levelMinder, openShutter)
 * MECHANICS calls ORDERS's `checkLanterns` (lanterns 11 and 14 are feats of purchases).
 *
 * Skeleton bodies: `commitCash` is built; every action returns the state unchanged (refused);
 * `canWatchAd` throws notBuilt('canWatchAd').
 */
import { MAX_CASH } from './params';
import { notBuilt } from './notBuilt';
import type { CoinSource, MergeAdKind, MergeConfig, MergeEvent, MergeGame } from './types';

/**
 * The one way cash changes: adds `delta` (negative to spend), clamped to [0, MAX_CASH], booked
 * under `source` in `mstats.coins`; income also counts in `runEarnings` and `lifetimeEarnings`.
 * Returns the same object for a zero or non-finite delta, and for a spend the purse cannot cover.
 * Built (small; MECHANICS owns and tests it).
 */
export function commitCash(g: MergeGame, delta: number, source: CoinSource): MergeGame {
  if (!Number.isFinite(delta) || delta === 0) return g;
  if (delta < 0 && g.cash + delta < -1e-9) return g;
  const cash = Math.min(MAX_CASH, Math.max(0, g.cash + delta));
  const gain = delta > 0 ? Math.min(delta, MAX_CASH) : 0;
  const coins = { ...g.merge.mstats.coins, [source]: g.merge.mstats.coins[source] + delta };
  return {
    ...g,
    cash,
    runEarnings: gain > 0 ? Math.min(MAX_CASH, g.runEarnings + gain) : g.runEarnings,
    lifetimeEarnings: gain > 0 ? Math.min(MAX_CASH, g.lifetimeEarnings + gain) : g.lifetimeEarnings,
    merge: { ...g.merge, mstats: { ...g.merge.mstats, coins } },
  };
}

/** Opens stall c, only the next chain, at 100 × 12^(c−1) × F_s (2.2); best_c = maxPop. MECHANICS. Skeleton: unchanged (refused). */
export function openStall(cfg: MergeConfig, g: MergeGame, c: number, events?: MergeEvent[]): MergeGame {
  void cfg;
  void c;
  void events;
  return g;
}

/** Gear level L → L + 1 of chain c (2.2): finer drops, never faster. MECHANICS. Skeleton: unchanged (refused). */
export function levelGear(cfg: MergeConfig, g: MergeGame, c: number, events?: MergeEvent[]): MergeGame {
  void cfg;
  void c;
  void events;
  return g;
}

/** Stall level M → M + 1 of chain c (2.2): the stall bonus. MECHANICS. Skeleton: unchanged (refused). */
export function levelStall(cfg: MergeConfig, g: MergeGame, c: number, events?: MergeEvent[]): MergeGame {
  void cfg;
  void c;
  void events;
  return g;
}

/** Hires chain c's minder (2.2). MECHANICS. Skeleton: unchanged (refused). */
export function hireMinder(cfg: MergeConfig, g: MergeGame, c: number, events?: MergeEvent[]): MergeGame {
  void cfg;
  void c;
  void events;
  return g;
}

/** Minder level K → K + 1 of chain c (2.2). MECHANICS. Skeleton: unchanged (refused). */
export function levelMinder(cfg: MergeConfig, g: MergeGame, c: number, events?: MergeEvent[]): MergeGame {
  void cfg;
  void c;
  void events;
  return g;
}

/** Opens the next shutter of `group` when its condition holds (2.2); every third holds a good. MECHANICS. Skeleton: unchanged (refused). */
export function openShutter(cfg: MergeConfig, g: MergeGame, group: number, events?: MergeEvent[]): MergeGame {
  void cfg;
  void group;
  void events;
  return g;
}

/** "Not tonight" at `counter` (2.7): free, cooldown per counter; filled lines return as goods (board.ts `roomFor`, then `placeGood`); refused when there is no room; sending off the gold ticket restarts the Parade clock (2.7). MECHANICS. Skeleton: unchanged (refused). */
export function notTonight(cfg: MergeConfig, g: MergeGame, counter: number, events?: MergeEvent[]): MergeGame {
  void cfg;
  void counter;
  void events;
  return g;
}

/** The Basket's undo (2.5): the good back to its reserved cell, the refund taken back; refused when cash < refund or after any purchase. MECHANICS. Skeleton: unchanged (refused). */
export function undoBasket(cfg: MergeConfig, g: MergeGame, events?: MergeEvent[]): MergeGame {
  void cfg;
  void events;
  return g;
}

/** Whether the rewarded ad `kind` can be offered now (its cooldown on the play clock; "Fill one line" needs a ticket with 2 or more unfilled lines; "Call the dragon" needs no Parade out). MECHANICS. Skeleton: throws notBuilt('canWatchAd'). */
export function canWatchAd(cfg: MergeConfig, g: MergeGame, kind: MergeAdKind, counter?: number): boolean {
  void cfg;
  void g;
  void kind;
  void counter;
  throw notBuilt('canWatchAd');
}

/**
 * The rewarded ad's reward, after the ad (5.7; with Quiet Evening, kind skipAds, the shared ads
 * service skips the video, Decision M13): "Fill one line" fills the cheapest unfilled line of
 * `counter`'s ticket, never the last; "Gear rush" drops up to 6 base-tier goods per open gear into
 * free cells (ignoring the loose cap, never beyond F); "Call the dragon" (M14) draws the Parade now
 * at an empty counter when none is out (the Parade clock restarts as after any Parade; ORDERS's
 * `drawParade`). Starts the cooldown (play clock, M10). MECHANICS. Skeleton: unchanged (refused).
 */
export function grantAd(cfg: MergeConfig, g: MergeGame, kind: MergeAdKind, counter?: number, events?: MergeEvent[]): MergeGame {
  void cfg;
  void kind;
  void counter;
  void events;
  return g;
}

/**
 * A lantern was just lit (ORDERS's `checkLanterns` lit it and recorded it in `lanterns`): the
 * effects on state MECHANICS owns, at game clock `clock` (5.3 with M5): lanterns 1 and 4 append an
 * empty counter (refill due after `refillDelay`), lantern 3 grows the shelf so a waiting gear
 * restarts (`nextPopAt` = clock + T). Every other lantern changes only a number read through
 * `currentMods`, or a part ORDERS owns (gift slots and `ticketsToBox` for lantern 19: ORDERS
 * adjusts them in `checkLanterns`), so it changes nothing here. MECHANICS. Skeleton: unchanged.
 */
export function applyLantern(cfg: MergeConfig, g: MergeGame, n: number, clock: number, events?: MergeEvent[]): MergeGame {
  void cfg;
  void n;
  void clock;
  void events;
  return g;
}

/**
 * EngineMode.entitle: a product just recorded (5.7, M13). Late Hours: the away cap grows now
 * (`mergeParams().awayCap` reads the product, so nothing in the state changes). Awnings: looks
 * only. Quiet Evening: the shared skipAds kind, handled by the shared store. MECHANICS. Skeleton:
 * unchanged (which is also the answer for all three products as specified).
 */
export function entitleMerge(cfg: MergeConfig, g: MergeGame, productId: string): MergeGame {
  void cfg;
  void productId;
  return g;
}
