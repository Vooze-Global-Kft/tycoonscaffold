/**
 * The Festival ticket of each season (spec 2.8 with decisions M21, M25 and M37): its lines, a line
 * landing, what the filled Festival gives, and the season close's gate.
 *
 * Seam: create.ts `startSeason` calls `festivalFor`; when a dropped good matches an unfilled
 * Festival line, drop.ts finds the line, sets `filled`, consumes the good, appends the
 * `festivalLine` event and calls `festivalLineFilled`. `canCloseSeason` is the shared store's gate
 * of the close (`EngineMode.canPrestige`, M21: the Festival alone allows it).
 *
 * Decision M25: season 1's Festival is a table row like the others (`festival[0]`), tuned by
 * scripts/content/build-night.py; a season past the last row uses the last row.
 * Decision M37: the Festival pays NO coins. Filling its last line gives `festivalSparks` Lucky
 * Sparks (3; 5 with lantern 18), the season's street piece (a screen's) and the right to close.
 */
import type { Good, MergeConfig, MergeEvent, MergeGame } from './types';
import { currentMods } from './lanterns';

/** The Festival's goods of a 0-based season, in table order (M25: season 1 is row 0; past the last row, the last row). */
export function festivalFor(cfg: MergeConfig, season: number): Good[] {
  const table = cfg.merge.festival;
  const row = table[Math.min(Math.max(0, Math.floor(season)), table.length - 1)];
  return row.map((l) => ({ c: l.chain, k: l.tier }));
}

/** What filling the Festival gives now (M37), for the Season scroll and the banner: Lucky Sparks, never coins. */
export function festivalGift(cfg: MergeConfig, g: MergeGame): { sparks: number } {
  return { sparks: currentMods(cfg, g.merge).festivalSparks };
}

/**
 * Line `line` of the Festival was just filled by the player (drop.ts set `filled` and consumed the
 * good). When it was the last unfilled line: gives the Lucky Sparks of `festivalGift` (M37), sets
 * `filledAt` to the game clock (which enables "Close the season"), and appends `festivalDone`.
 * Returns the same object when nothing happens: a bad index, a line not marked filled, other lines
 * still open, or the Festival already filled.
 */
export function festivalLineFilled(cfg: MergeConfig, g: MergeGame, line: number, events?: MergeEvent[]): MergeGame {
  const f = g.merge.festival;
  if (f.filledAt !== null) return g;
  if (!Number.isInteger(line) || line < 0 || line >= f.lines.length || !f.lines[line].filled) return g;
  if (f.lines.some((l) => !l.filled)) return g;
  const { sparks } = festivalGift(cfg, g);
  const out: MergeGame = { ...g, merge: { ...g.merge, luckySparks: g.merge.luckySparks + sparks, festival: { ...f, filledAt: g.stats.playSeconds } } };
  events?.push({ type: 'festivalDone', sparks });
  return out;
}

/**
 * Whether "Close the season" is enabled: the Festival is filled (2.11, M21), i.e. its last line
 * landed (`filledAt` set by `festivalLineFilled`). The shared store's prestige gate reads it through
 * `EngineMode.canPrestige` (src/engine/mergeMode.ts).
 */
export function canCloseSeason(cfg: MergeConfig, g: MergeGame): boolean {
  void cfg;
  return g.merge.festival.filledAt !== null;
}
