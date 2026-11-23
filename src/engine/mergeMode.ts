/**
 * The merge engine as an engine mode (src/engine/mode.ts): how the shared engine functions reach
 * the merge rules (src/engine/merge.ts, the rules' public index) without importing them.
 *
 * Merge mode only (scripts/lib/modes.js lists this file with the merge folders): the merge mode
 * entry (src/modes/merge/index.tsx) installs it, so only a merge game's bundle carries the merge
 * rules. Pure TypeScript, no React. Written by the skeleton; owned afterwards by the rules package
 * MECHANICS (docs/design/market-build-plan.md).
 */
import type { GameConfig } from '../config/schema';
import { MergeSchema } from '../config/schema.merge';
import * as R from './merge';
import type { EngineMode } from './mode';
import type { GameState } from './types';

/**
 * A merge game's config with its `merge` block parsed by the merge schema (defaults filled in).
 * The shared schema keeps the block opaque (src/config/schema.ts), so every reader of a merge game's
 * data goes through this once: the mode entry at install, the game-data lint, the Node tools.
 * Throws with the schema's message when the block is invalid or missing. Other configs come back
 * as they are.
 */
export function withMergeContent(cfg: GameConfig): GameConfig {
  if (cfg.mode !== 'merge') return cfg;
  if (!cfg.merge) throw new Error('mode is "merge" but there is no "merge" block');
  const r = MergeSchema.safeParse(cfg.merge);
  if (!r.success) throw new Error(`the "merge" block is invalid:\n${r.error.message}`);
  return { ...cfg, merge: r.data as unknown as Record<string, unknown> };
}

const asGame = (g: GameState) => g as R.MergeGame;
const asState = (g: R.MergeGame) => g as GameState;
/** A save of a merge game always has `merge` after reconcile; a bare shared state (a test) gets one. */
const run = (cfg: R.MergeConfig, g: GameState): R.MergeGame => (asGame(g).merge ? asGame(g) : R.withMergeFields(cfg, g));

export const mergeEngineMode: EngineMode = {
  id: 'merge',
  saveTag: 'merge1',
  config: withMergeContent,
  create: (cfg, base) => (R.isMerge(cfg) ? asState(R.withMergeFields(cfg, base)) : base),
  reconcile: (cfg, base, raw) => {
    if (!R.isMerge(cfg)) return base;
    try {
      return asState(R.reconcileMerge(cfg, base, raw));
    } catch {
      // Never throws (EngineMode contract): a save the rules cannot read starts afresh.
      return asState(R.withMergeFields(cfg, base));
    }
  },
  tick: (cfg, state, dt, now, events) => (R.isMerge(cfg) ? asState(R.advanceMerge(cfg, run(cfg, state), dt, now, events as R.MergeEvent[] | undefined)) : state),
  income: (cfg, state) => (R.isMerge(cfg) ? R.mergeIncome(cfg, run(cfg, state)) : 0),
  activeIncome: (cfg, state) => (R.isMerge(cfg) ? R.mergeActiveIncome(cfg, run(cfg, state)) : 0),
  offline: (cfg, state, now) => {
    if (!R.isMerge(cfg)) return { seconds: 0, earnings: 0, game: state };
    const r = R.mergeOffline(cfg, run(cfg, state), now);
    return { seconds: r.seconds, earnings: r.earnings, game: asState(r.game), report: r.report };
  },
  // Closing the season (2.11): refused (the same object) until the Festival is filled; no choice (the next season is not chosen).
  prestige: (cfg, state, now) => (R.isMerge(cfg) ? asState(R.closeSeason(cfg, run(cfg, state), now)) : state),
  // The store's prestige gate (a merge game earns no prestige points): the Festival is filled (2.11).
  canPrestige: (cfg, state) => R.isMerge(cfg) && R.canCloseSeason(cfg, run(cfg, state)),
  entitle: (cfg, state, productId) => (R.isMerge(cfg) ? asState(R.entitleMerge(cfg, run(cfg, state), productId)) : state),
  mergeReport: R.mergeAwayReports,
  reportAlone: R.awayReportAlone,
  // Decision M8: the away report's ad adds merge.ads.awayBonus (+50 %), not a double.
  offlineAdMultiplier: (cfg) => 1 + (R.isMerge(cfg) ? cfg.merge.ads.awayBonus : 0.5),
  // Decision M19: the away payout with the ad is rounded by the one rule, so the report's figure is the figure paid.
  roundPayout: (cfg, amount) => (R.isMerge(cfg) ? R.roundCoins(cfg, amount) : amount),
};
