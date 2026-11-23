/**
 * The rules' hints (spec 3.1): the timed opening script and the idle firefly, as target keys of
 * src/ui/hints/targets.ts. Pure: a function of the state; the screens (src/ui/merge/hints.ts, the
 * hints package) order and draw them.
 *
 * Package ORDERS (docs/design/market-build-plan.md).
 *
 * Skeleton bodies: `hintsFor` throws notBuilt('hintsFor').
 */
import { notBuilt } from './notBuilt';
import type { MergeConfig, MergeGame, MergeHint } from './types';

/** Every hint that applies now, most urgent first. ORDERS. Skeleton: throws notBuilt('hintsFor'). */
export function hintsFor(cfg: MergeConfig, g: MergeGame): MergeHint[] {
  void cfg;
  void g;
  throw notBuilt('hintsFor');
}
