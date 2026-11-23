/**
 * The player's drop (spec 2.5): `dropAt(fromCell, target)` resolved at the finger point (M9), for a
 * drag and for tap-tap alike, and the targets an armed good would accept.
 *
 * Package MECHANICS (docs/design/market-build-plan.md). Seam: a merge calls ORDERS's `onMerged`
 * and, for a first (c, k), `onTierMade` (./lanterns.ts); the last line of a ticket pays through
 * `commitCash` and then calls `countGiftTicket` (./gift.ts) and `onTicketPaid` (./lanterns.ts); a
 * Festival line calls `festivalLineFilled` (./festival.ts).
 *
 * Skeleton bodies: `decodeTarget` is built (the screens' hit test needs it); `dropAt` and
 * `targetsFor` throw notBuilt('<name>').
 */
import { notBuilt } from './notBuilt';
import { BOARD_CELLS, TARGET_BASKET, TARGET_COUNTER, TARGET_FESTIVAL, type DropOutcome, type DropTarget, type MergeConfig, type MergeEvent, type MergeGame, type TargetCode } from './types';

/** The hit test's number back to a target (types.ts TargetCode). Built. */
export function decodeTarget(code: TargetCode): DropTarget {
  if (Number.isInteger(code) && code >= 0 && code < BOARD_CELLS) return { kind: 'cell', cell: code };
  if (Number.isInteger(code) && code >= TARGET_COUNTER && code < TARGET_COUNTER + 4) return { kind: 'counter', counter: code - TARGET_COUNTER };
  if (code === TARGET_FESTIVAL) return { kind: 'festival' };
  if (code === TARGET_BASKET) return { kind: 'basket' };
  return { kind: 'none' };
}

/**
 * Drops the good of `from` on `target` (every row of 2.5's table: merge with Lucky and Sparks,
 * move, swap, a ticket line or a shake, a Festival line, the Basket with its undo chip, return).
 * A refused drop returns the same game object with a `return` result. MECHANICS. Skeleton: throws
 * notBuilt('dropAt').
 */
export function dropAt(cfg: MergeConfig, g: MergeGame, from: number, target: DropTarget, events?: MergeEvent[]): DropOutcome {
  void cfg;
  void g;
  void from;
  void target;
  void events;
  throw notBuilt('dropAt');
}

/** The targets that would accept the good of `from` now (the glow while armed or dragging, 4.2). MECHANICS. Skeleton: throws notBuilt('targetsFor'). */
export function targetsFor(cfg: MergeConfig, g: MergeGame, from: number): TargetCode[] {
  void cfg;
  void g;
  void from;
  throw notBuilt('targetsFor');
}
