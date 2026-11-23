/**
 * The Festival ticket of each season (spec 2.8): its lines, a line landing, the purse.
 *
 * Package ORDERS (docs/design/market-build-plan.md). Seam: MECHANICS calls `festivalFor` (create()
 * and the season's start) and, when a dropped good matches an unfilled Festival line (drop.ts finds
 * the line and consumes the good), `festivalLineFilled`; the last line pays the purse through
 * `commitCash` (./actions.ts) with source 'festival'.
 *
 * Skeleton bodies: `festivalFor` is built (a read of the table; a season past the last row uses the
 * last row: a skeleton decision for ORDERS to confirm); `festivalLineFilled` returns the state
 * unchanged; `canCloseSeason` is built; `festivalPurse` throws notBuilt('festivalPurse').
 */
import { notBuilt } from './notBuilt';
import type { Good, MergeConfig, MergeEvent, MergeGame } from './types';

/** The Festival's goods of a 0-based season, in table order. Built. */
export function festivalFor(cfg: MergeConfig, season: number): Good[] {
  const table = cfg.merge.festival;
  const row = table[Math.min(Math.max(0, season), table.length - 1)];
  return row.map((l) => ({ c: l.chain, k: l.tier }));
}

/**
 * Line `line` of the Festival was just filled by the player (drop.ts set `filled`). The last line
 * pays the purse (festivalPace × U, × the lantern-18 mod), sets `filledAt`, enables the close.
 * ORDERS. Skeleton: returns the state unchanged.
 */
export function festivalLineFilled(cfg: MergeConfig, g: MergeGame, line: number, events?: MergeEvent[]): MergeGame {
  void cfg;
  void line;
  void events;
  return g;
}

/** The Festival purse if its last line landed now: festivalPace × U × mods.festivalPurseMult (2.3). ORDERS. Skeleton: throws notBuilt('festivalPurse'). */
export function festivalPurse(cfg: MergeConfig, g: MergeGame): number {
  void cfg;
  void g;
  throw notBuilt('festivalPurse');
}

/**
 * Whether "Close the season" is enabled: the Festival is filled (2.11), i.e. its last line landed
 * (`filledAt` set by `festivalLineFilled`). The shared store's prestige gate reads it through
 * `EngineMode.canPrestige` (src/engine/mergeMode.ts). ORDERS. Built (one line, so the store's gate
 * works before ORDERS writes the close).
 */
export function canCloseSeason(cfg: MergeConfig, g: MergeGame): boolean {
  void cfg;
  return g.merge.festival.filledAt !== null;
}
