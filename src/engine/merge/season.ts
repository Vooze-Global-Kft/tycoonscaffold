/**
 * Seasons (spec 2.11): the table, shapes and characters, the opening board, seasoned gear, familiar
 * faces, and closing a season (`EngineMode.prestige`).
 *
 * Package ORDERS (docs/design/market-build-plan.md). Seam: MECHANICS calls `openingBoard` (create()
 * and the season's start: the goods to place and the cells the shape blocks) and `seasonMods` is
 * read by lanterns.ts `currentMods`; `seasonedStartLevel` and `familiarFactor` are read by
 * params.ts (gear levels at a season's start, stall-opening costs).
 *
 * Skeleton bodies: `seasonRow` is built (a read of the table with its repeat); `seasonMods`
 * returns {} (no character changes anything yet); `openingBoard` returns season 1's board (the
 * rectangle, `openingGoods` Grill goods of tier 1, no blocks) for every season; `closeSeason`
 * returns the state unchanged (refused); `seasonedStartLevel` and `familiarFactor` are built
 * (closed forms of 2.11, so MECHANICS's stall costs and season start can run without ORDERS).
 * `closeSeason` builds the next season's state with MECHANICS's `startSeason` (./create.ts), after
 * it has counted the seasoned steps, `feats.seasonsClosed` and reset the coins.
 */
import type { SeasonRow } from '../../config/schema.merge';
import type { Good, MergeConfig, MergeEvent, MergeGame, MergeState, Mods } from './types';

/** The table row of a 0-based season: rows in order, then from `repeatFrom` on round again. Built. */
export function seasonRow(cfg: MergeConfig, season: number): SeasonRow {
  const { table, repeatFrom } = cfg.merge.seasons;
  if (season < table.length) return table[Math.max(0, season)];
  const loop = table.length - repeatFrom;
  return table[repeatFrom + ((season - repeatFrom) % Math.max(1, loop))];
}

/** What the season's character changes (2.11): only the fields it changes. ORDERS. Skeleton: returns {}. */
export function seasonMods(cfg: MergeConfig, season: number): Partial<Mods> {
  void cfg;
  void season;
  return {};
}

/**
 * A season's opening board: the goods to place (by the drop-cell rule, in order) and the cells its
 * shape turns into blocks (the moon gate's stones, the hearth's braziers on the open cell nearest
 * each corner, never a shutter). ORDERS. Skeleton: season 1's board for every season.
 */
export function openingBoard(cfg: MergeConfig, m: MergeState, season: number): { goods: Good[]; blocks: number[] } {
  void m;
  void season;
  return { goods: Array.from({ length: cfg.merge.seasons.openingGoods }, () => ({ c: 0, k: 1 })), blocks: [] };
}

/**
 * Closes the season (spec 2.11), refused (same object) until the Festival is filled: resets and
 * keeps exactly the lists of 2.11 (no Pocket, M5), clears `basketUndo`, starts the next season's
 * board, Festival and character. ORDERS. Skeleton: returns the state unchanged.
 */
export function closeSeason(cfg: MergeConfig, g: MergeGame, now: number, events?: MergeEvent[]): MergeGame {
  void cfg;
  void now;
  void events;
  return g;
}

/**
 * A chain's gear level at a season's start: 1 + N × steps (2.11), at most the top gear level.
 * `steps` is the chain's seasoned steps already capped by `mods.seasonedMax` (the caller's,
 * MECHANICS's `startSeason`). ORDERS. Built.
 */
export function seasonedStartLevel(cfg: MergeConfig, steps: number): number {
  return Math.min(cfg.merge.costs.gearMaxLevel, 1 + cfg.merge.seasons.levelsPerStep * Math.max(0, Math.floor(steps)));
}

/** F_s = familiarBase^min(seasons closed, familiarMax) (2.11): 1 in the first season. ORDERS. Built. */
export function familiarFactor(cfg: MergeConfig, seasonsClosed: number): number {
  const { familiarBase, familiarMax } = cfg.merge.seasons;
  return Math.pow(familiarBase, Math.min(Math.max(0, seasonsClosed), familiarMax));
}
