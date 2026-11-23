/**
 * `advanceMerge` (spec 2.4): what one tick does. The store calls the engine mode's tick about ten
 * times a second; dt is cut to MAX_TICK; the tick runs the event queue (./events.ts) over
 * (clock, clock + dt] and adds `stats.playSeconds` itself.
 *
 * Package MECHANICS (docs/design/market-build-plan.md).
 *
 * Skeleton body: advances the clocks only (stats.playSeconds += dt, cut to [0, MAX_TICK]); no
 * event runs, so nothing drops, sells or refills yet.
 */
import { MAX_TICK, type MergeConfig, type MergeEvent, type MergeGame } from './types';

/** Advances the game by `dt` seconds of play. Pure. Skeleton: the clocks only. */
export function advanceMerge(cfg: MergeConfig, g: MergeGame, dt: number, now: number, events?: MergeEvent[]): MergeGame {
  void cfg;
  void now;
  void events;
  const step = Math.min(MAX_TICK, Math.max(0, Number.isFinite(dt) ? dt : 0));
  if (step <= 0) return g;
  return { ...g, stats: { ...g.stats, playSeconds: (g.stats.playSeconds ?? 0) + step } };
}
