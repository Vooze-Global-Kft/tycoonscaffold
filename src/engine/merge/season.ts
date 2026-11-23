/**
 * Seasons (spec 2.11 with Decisions M18, M21, M25 and M28): the table, shapes and characters, the
 * opening board, seasoned gear, familiar faces, and closing a season (`EngineMode.prestige`).
 *
 * Package META (docs/design/market-build-plan.md names ORDERS for these seam functions; the lead
 * gave this file to META). Seam: MECHANICS calls `openingBoard` (its `startSeason`: the goods to
 * place and the cells the shape blocks); lanterns.ts `currentMods` reads `seasonMods`; params.ts
 * reads `familiarFactor` and create.ts `seasonedStartLevel`. `closeSeason` counts the seasoned
 * steps and `seasonsClosed`, resets the coins on the shared state, lights the lanterns of the close,
 * then builds the next season with MECHANICS's `startSeason` (./create.ts).
 *
 * The reset and stay lists of 2.11 are data here (`SEASON_RESETS`, `SEASON_STAYS`), with every
 * other field of the state named in `SEASON_BOOKKEEPING`: the Season scroll shows the first two
 * (its words are the screens' strings, by id), and season.test.ts checks the state against all
 * three field by field, so a field added later cannot slip through unlisted.
 */
import type { SeasonRow } from '../../config/schema.merge';
import { startSeason } from './create';
import { canCloseSeason } from './festival';
import { checkLanterns, currentMods } from './lanterns';
import { BOARD_COLS, BOARD_ROWS, type Good, type MergeConfig, type MergeEvent, type MergeGame, type MergeState, type Mods } from './types';

// ----------------------------------------------------------------------------- the table (2.11)

/** The table row of a 0-based season: rows in order, then from `repeatFrom` on round again (season 17 on screen = season 2). */
export function seasonRow(cfg: MergeConfig, season: number): SeasonRow {
  const { table, repeatFrom } = cfg.merge.seasons;
  const s = Math.max(0, Math.floor(season));
  if (s < table.length) return table[s];
  const loop = Math.max(1, table.length - repeatFrom);
  return table[repeatFrom + ((s - repeatFrom) % loop)];
}

/** What the season's character changes (2.11), only the fields it changes; lanterns.ts applies the precedence of 2.3. */
export function seasonMods(cfg: MergeConfig, season: number): Partial<Mods> {
  const k = cfg.merge.seasons;
  switch (seasonRow(cfg, season).character) {
    case 'fireflies':
      return { luckyOdds: k.fireflies.luckyOdds };
    case 'harvest':
      return { threeLineShare: k.harvest.threeLineShare, betaAdd: k.harvest.betaAdd };
    case 'warmGear':
      return { ripeAdd: k.warmGear.ripeAdd };
    case 'lateCrowd':
      return { minderIntervalMult: k.lateCrowd.minderIntervalMult };
    case 'marketDay':
      return { paradeEvery: k.marketDay.paradeEvery };
    default:
      return {};
  }
}

// ----------------------------------------------------------------------------- the opening board

const CORNERS: readonly [number, number][] = [
  [0, 0],
  [0, BOARD_COLS - 1],
  [BOARD_ROWS - 1, 0],
  [BOARD_ROWS - 1, BOARD_COLS - 1],
];

/** A cell the shape may turn into a block: open (not a shutter, not already a block). */
const openCell = (m: Pick<MergeState, 'board'>, i: number) => m.board[i] !== 'shutter' && m.board[i] !== 'block';

/** The hearth's braziers: for each board corner the open cell nearest it (squared distance, then index), never a shutter. */
export function hearthCells(m: Pick<MergeState, 'board'>): number[] {
  const out: number[] = [];
  for (const [r0, c0] of CORNERS) {
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < m.board.length; i++) {
      if (!openCell(m, i) || out.includes(i)) continue;
      const d = (Math.floor(i / BOARD_COLS) - r0) ** 2 + ((i % BOARD_COLS) - c0) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best >= 0) out.push(best);
  }
  return out;
}

/**
 * A season's opening board (2.11, M18): `openingGoods` goods of the Grill at its starting base tier
 * (placed by MECHANICS by the drop-cell rule, in order), and the cells its shape turns into blocks
 * (the moon gate's stones on its always-open cells; the hearth's braziers on the open cell nearest
 * each corner; never a shutter). `m` is the new season's state with its chains already reset
 * (MECHANICS's `startSeason` calls this after the chains and before placing).
 */
export function openingBoard(cfg: MergeConfig, m: MergeState, season: number): { goods: Good[]; blocks: number[] } {
  const { maxBase, step } = cfg.merge.gear;
  const gear = m.chains[0]?.gear ?? 1;
  const k = Math.min(maxBase, 1 + Math.floor((Math.max(1, gear) - 1) / step));
  const goods = Array.from({ length: cfg.merge.seasons.openingGoods }, () => ({ c: 0, k }));
  const shape = seasonRow(cfg, season).shape;
  const blocks = shape === 'moonGate' ? cfg.merge.seasons.moonGateCells.filter((i) => openCell(m, i)) : shape === 'hearth' ? hearthCells(m) : [];
  return { goods, blocks };
}

// ----------------------------------------------------------------------------- what carries over

/**
 * A chain's gear level at a season's start: 1 + N × steps (2.11) with N = the gear step s
 * (Decision M25), at most the top gear level (M28). `steps` is already capped by `mods.seasonedMax`
 * (the caller's, MECHANICS's `startSeason`).
 */
export function seasonedStartLevel(cfg: MergeConfig, steps: number): number {
  return Math.min(cfg.merge.costs.gearMaxLevel, 1 + cfg.merge.gear.step * Math.max(0, Math.floor(steps)));
}

/** F_s = familiarBase^min(seasons closed, familiarMax) (2.11): 1 in the first season. */
export function familiarFactor(cfg: MergeConfig, seasonsClosed: number): number {
  const { familiarBase, familiarMax } = cfg.merge.seasons;
  return Math.pow(familiarBase, Math.min(Math.max(0, seasonsClosed), familiarMax));
}

/** The seasoned steps each chain holds after closing a season now: one more for each chain that reached `stepTier` this season, up to `mods.seasonedMax`. */
export function seasonedAfterClose(cfg: MergeConfig, m: MergeState): number[] {
  const max = currentMods(cfg, m).seasonedMax;
  return m.chains.map((ch) => (ch.best >= cfg.merge.seasons.stepTier ? Math.min(max, ch.seasoned + 1) : ch.seasoned));
}

// ----------------------------------------------------------------------------- the lists of 2.11

/** An item of the Season scroll's lists: its id (the screens' strings key it) and the state fields it covers. */
export interface SeasonListItem {
  id: string;
  /** Paths: `cash`, `merge.till`, `merge.chains[].gear` (every chain), `merge.board:goods` (the cells holding goods). */
  fields: readonly string[];
}

/** "Resets: coins, goods on the board, gear, stall and minder levels, stalls, best tiers, shelves, tickets, the till." (2.11) */
export const SEASON_RESETS: readonly SeasonListItem[] = [
  { id: 'coins', fields: ['cash', 'runEarnings'] },
  { id: 'goods', fields: ['merge.board:goods'] },
  { id: 'gearLevels', fields: ['merge.chains[].gear'] },
  { id: 'stallLevels', fields: ['merge.chains[].stall'] },
  { id: 'minderLevels', fields: ['merge.chains[].minder'] },
  { id: 'stalls', fields: ['merge.chains[].open'] },
  { id: 'bestTiers', fields: ['merge.chains[].best'] },
  { id: 'shelves', fields: ['merge.chains[].shelf', 'merge.chains[].waiting'] },
  { id: 'tickets', fields: ['merge.counters'] },
  { id: 'till', fields: ['merge.till'] },
];

/** "Stays: board space, lanterns, the Ladder Book, unopened gift boxes, goods waiting for room, Lucky Sparks, purchases, seasoned gear." (2.11; no Pocket, M5) */
export const SEASON_STAYS: readonly SeasonListItem[] = [
  { id: 'boardSpace', fields: ['merge.shuttersOpened', 'merge.board:shutters'] },
  { id: 'lanterns', fields: ['merge.lanterns'] },
  { id: 'ladderBook', fields: ['merge.book'] },
  { id: 'giftBoxes', fields: ['merge.gift.boxes'] },
  { id: 'pendingGoods', fields: ['merge.gift.pendingGoods'] },
  { id: 'luckySparks', fields: ['merge.luckySparks'] },
  { id: 'purchases', fields: ['entitlements'] },
  { id: 'seasonedGear', fields: ['merge.chains[].seasoned'] },
];

/**
 * Every other field of the merge state, and what a close does to it: `kept` (as it was), `counted`
 * (kept and counted on: the season number, seasons closed), or `restarted` (the new season's own
 * clocks, counters and Festival; the shape's blocks). Not shown to the player; listed so the test
 * can prove the two lists above plus this one name every field.
 */
export const SEASON_BOOKKEEPING: Readonly<Record<string, 'kept' | 'counted' | 'restarted'>> = {
  'merge.seed': 'kept',
  'merge.draws': 'kept',
  'merge.season': 'counted',
  'merge.seasonStartedAt': 'restarted',
  'merge.tillAt': 'restarted',
  'merge.board:blocks': 'restarted',
  'merge.chains[].nextPopAt': 'restarted',
  'merge.chains[].releaseAt': 'restarted',
  'merge.chains[].blockedAt': 'restarted',
  'merge.chains[].nextSaleAt': 'restarted',
  'merge.nextTicketId': 'kept',
  'merge.script': 'restarted',
  'merge.festival': 'restarted',
  'merge.paradeAt': 'restarted',
  'merge.gift.ticketsToBox': 'kept',
  'merge.gift.nextAt': 'restarted',
  'merge.gift.blockedAt': 'restarted',
  'merge.basketUndo': 'restarted',
  'merge.feats': 'counted',
  'merge.ads': 'kept',
  'merge.recent': 'restarted',
  'merge.freedAt': 'restarted',
  'merge.changedAt': 'restarted',
  'merge.mstats': 'kept',
};

// ----------------------------------------------------------------------------- closing (2.11)

/**
 * Closes the season (2.11, M21), refused (the same object) until the Festival is filled; always the
 * player's choice, and the next season is not chosen. `now` is the store's wall clock (ms, the wall time
 * of the caller): only `lastSavedAt` takes it; every season time is the game clock
 * (`stats.playSeconds`). In order: each chain that reached tier 6
 * earns a seasoned step (up to the limit, +1 with lantern 9); `seasonsClosed` and the shared
 * `prestigeCount` count on; the coins reset (cash to the configured start, `runEarnings` 0);
 * `basketUndo` is cleared; the lanterns of the close light now (8, 15, 18), so Tea opens from the
 * next season's first second; MECHANICS's `startSeason` builds the next season (its lists of resets
 * and stays: 2.11 exactly); `checkLanterns` again; `seasonClosed`. Pending gift goods of a chain not
 * yet open wait for it (MECHANICS's placement).
 */
export function closeSeason(cfg: MergeConfig, g: MergeGame, now: number, events?: MergeEvent[]): MergeGame {
  if (!canCloseSeason(cfg, g)) return g;
  const m = g.merge;
  const clock = g.stats.playSeconds;
  const seasoned = seasonedAfterClose(cfg, m);
  const closing: MergeState = {
    ...m,
    chains: m.chains.map((ch, c) => ({ ...ch, seasoned: seasoned[c] })),
    feats: { ...m.feats, seasonsClosed: m.feats.seasonsClosed + 1 },
    basketUndo: null,
  };
  // The coins reset directly (not through commitCash: a reset is no source of 2.3 and no spend).
  const lastSavedAt = Number.isFinite(now) && now > 0 ? now : g.lastSavedAt;
  let out: MergeGame = { ...g, cash: Math.max(0, cfg.economy.startingCash ?? 0), runEarnings: 0, prestigeCount: g.prestigeCount + 1, lastSavedAt, merge: closing };
  out = checkLanterns(cfg, out, clock, events);
  out = { ...out, merge: { ...startSeason(cfg, out.merge, m.season + 1, clock), basketUndo: null } };
  out = checkLanterns(cfg, out, clock, events);
  events?.push({ type: 'seasonClosed', season: m.season });
  return out;
}
