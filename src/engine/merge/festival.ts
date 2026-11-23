/**
 * The Festival ticket of each season (spec 2.8 with decisions M21 and M25): its lines, a line
 * landing, the purse, and the season close's gate.
 *
 * Package ORDERS (docs/design/market-build-plan.md). Seam: MECHANICS calls `festivalFor` (the
 * season's start, create.ts `startSeason`) and, when a dropped good matches an unfilled Festival
 * line (drop.ts finds the line, sets `filled`, consumes the good and appends the `festivalLine`
 * event), `festivalLineFilled`; the last line pays the purse through `commitCash` (./actions.ts)
 * with source 'festival'. `canCloseSeason` is the shared store's gate of the close
 * (`EngineMode.canPrestige`, M21: the Festival alone allows it).
 *
 * Decision M25: season 1's Festival is a table row like the others (`festival[0]`), tuned by
 * scripts/content/build-night.py; a season past the last row uses the last row.
 */
import { commitCash } from './actions';
import { mergeParams, roundCoins } from './params';
import type { Good, MergeConfig, MergeEvent, MergeGame } from './types';

/** The Festival's goods of a 0-based season, in table order (M25: season 1 is row 0; past the last row, the last row). ORDERS. */
export function festivalFor(cfg: MergeConfig, season: number): Good[] {
  const table = cfg.merge.festival;
  const row = table[Math.min(Math.max(0, Math.floor(season)), table.length - 1)];
  return row.map((l) => ({ c: l.chain, k: l.tier }));
}

/**
 * The Festival purse if its last line landed now: festivalPace × U × mods.festivalPurseMult
 * (2.3; ×2 with lantern 18), rounded once by the coin rule (M19). ORDERS.
 */
export function festivalPurse(cfg: MergeConfig, g: MergeGame): number {
  const P = mergeParams(cfg, g);
  return roundCoins(cfg, cfg.merge.festivalPace * P.U * P.mods.festivalPurseMult);
}

/**
 * Line `line` of the Festival was just filled by the player (drop.ts set `filled` and consumed the
 * good). When it was the last unfilled line: pays the purse once (`commitCash`, 'festival'), sets
 * `filledAt` to the game clock (which enables "Close the season"), and appends `festivalDone`.
 * Returns the same object when nothing is paid: a bad index, a line not marked filled, other lines
 * still open, or the Festival already paid. ORDERS.
 */
export function festivalLineFilled(cfg: MergeConfig, g: MergeGame, line: number, events?: MergeEvent[]): MergeGame {
  const f = g.merge.festival;
  if (f.filledAt !== null) return g;
  if (!Number.isInteger(line) || line < 0 || line >= f.lines.length || !f.lines[line].filled) return g;
  if (f.lines.some((l) => !l.filled)) return g;
  const coins = festivalPurse(cfg, g);
  const paid = commitCash(g, coins, 'festival');
  const out: MergeGame = { ...paid, merge: { ...paid.merge, festival: { ...f, filledAt: g.stats.playSeconds } } };
  events?.push({ type: 'festivalDone', coins });
  return out;
}

/**
 * Whether "Close the season" is enabled: the Festival is filled (2.11, M21), i.e. its last line
 * landed (`filledAt` set by `festivalLineFilled`). The shared store's prestige gate reads it through
 * `EngineMode.canPrestige` (src/engine/mergeMode.ts). ORDERS.
 */
export function canCloseSeason(cfg: MergeConfig, g: MergeGame): boolean {
  void cfg;
  return g.merge.festival.filledAt !== null;
}
