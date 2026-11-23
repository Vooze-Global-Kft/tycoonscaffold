/**
 * `advice(cfg, state)` (spec 2.10): the single next goal, for the bot and the goal line.
 *
 * Package ORDERS (docs/design/market-build-plan.md). Reads params.ts (`mergeParams`, costs) and
 * lanterns.ts (`featProgress`).
 *
 * Skeleton bodies: `advice` and `incomeRate` throw notBuilt('<name>').
 */
import { notBuilt } from './notBuilt';
import type { Advice, MergeConfig, MergeGame } from './types';

/** The lowest-score purchase (or the Festival, a lantern feat, the Basket) with its price, gain and wait. null when there is nothing to do. ORDERS. Skeleton: throws notBuilt('advice'). */
export function advice(cfg: MergeConfig, g: MergeGame): Advice | null {
  void cfg;
  void g;
  throw notBuilt('advice');
}

/** R = R_t + R_m: the `recent` ticket coins ÷ min(300, season clock), plus the minder rate (2.10). ORDERS. Skeleton: throws notBuilt('incomeRate'). */
export function incomeRate(cfg: MergeConfig, g: MergeGame): number {
  void cfg;
  void g;
  throw notBuilt('incomeRate');
}
