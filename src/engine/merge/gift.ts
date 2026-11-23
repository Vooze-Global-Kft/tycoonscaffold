/**
 * Gift boxes (spec 5.5): earned one per `giftEvery` paid tickets, contents fixed when earned from the
 * gift stream, opened by the player, their goods placed as room allows.
 *
 * Package ORDERS (docs/design/market-build-plan.md). Seam: MECHANICS calls `countGiftTicket` when a
 * ticket pays (before lanterns.ts `onTicketPaid`); it places the pending goods itself (2.4 event 3)
 * with board.ts `placeGood`; `openGiftBox` is a player action (src/modes/merge/actions.ts); coins go
 * through `commitCash` with source 'gift'.
 *
 * Skeleton bodies: `countGiftTicket` and `openGiftBox` return the state unchanged; `giftOdds`
 * throws notBuilt('giftOdds').
 */
import { notBuilt } from './notBuilt';
import type { MergeConfig, MergeEvent, MergeGame } from './types';

/** One paid ticket toward the next box; at zero a box is earned with its contents fixed now. ORDERS. Skeleton: returns the state unchanged. */
export function countGiftTicket(cfg: MergeConfig, g: MergeGame, events?: MergeEvent[]): MergeGame {
  void cfg;
  void events;
  return g;
}

/** Opens the oldest box: coins now, goods into `pendingGoods`, Sparks counted (the store saves at once after it). ORDERS. Skeleton: returns the state unchanged. */
export function openGiftBox(cfg: MergeConfig, g: MergeGame, events?: MergeEvent[]): MergeGame {
  void cfg;
  void events;
  return g;
}

/** What the box sheet prints before the tap (5.5): the slot odds and the coin amount of the next box. ORDERS. Skeleton: throws notBuilt('giftOdds'). */
export function giftOdds(cfg: MergeConfig, g: MergeGame): { coins: number; good: number; spark: number; coinAmount: number } {
  void cfg;
  void g;
  throw notBuilt('giftOdds');
}
