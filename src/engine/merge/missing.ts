/**
 * `missing(lines, goods)` (spec 2.7): what a set of lines still needs after the goods at hand,
 * pure and exported; the draw's bounds (b) and (d2) and the exact solver test read it.
 *
 * Package ORDERS (docs/design/market-build-plan.md). MECHANICS does not call it.
 *
 * Skeleton bodies: every function throws notBuilt('<name>').
 */
import { notBuilt } from './notBuilt';
import type { Good, MergeState, MissingResult } from './types';

/**
 * Lines are taken highest tier first; each takes its chain's goods of tier ≤ k greedily from the
 * highest tier while they fit in 2^(k−1) basic units, removes them, and returns the units still
 * needed (in the lines' input order). ORDERS. Skeleton: throws notBuilt('missing').
 */
export function missing(lines: readonly Pick<Good, 'c' | 'k'>[], goods: readonly Good[]): MissingResult {
  void lines;
  void goods;
  throw notBuilt('missing');
}

/** Pops needed for `units` of a chain with base tier b: ceil(units / 2^(b − 1)) (spec 2.7). ORDERS. Skeleton: throws notBuilt('popsNeeded'). */
export function popsNeeded(units: number, base: number): number {
  void units;
  void base;
  throw notBuilt('popsNeeded');
}

/** The goods at hand for `missing()`: the board, the shelves and the pending gift goods (spec 2.7, 5.5). ORDERS. Skeleton: throws notBuilt('goodsAtHand'). */
export function goodsAtHand(m: MergeState): Good[] {
  void m;
  throw notBuilt('goodsAtHand');
}
