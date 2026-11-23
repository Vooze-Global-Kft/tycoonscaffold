/**
 * A new merge game and a loaded save (spec 2.3, the scripted start of 2.7).
 *
 * Package MECHANICS (docs/design/market-build-plan.md). Seam: reads ORDERS's `openingBoard`
 * (./season.ts), `festivalFor` (./festival.ts), `scriptedTicket` (./draw.ts) and `currentMods`
 * (./lanterns.ts).
 *
 * Seam: `startSeason` is what ORDERS's `closeSeason` calls to build the next season.
 *
 * Skeleton bodies: `startSeason`, `createMerge` and `withMergeFields` are built: a valid fresh state by 2.3 with
 * the scripted start (30 open cells, 4 Pepper Skewers by the drop-cell rule, the fox's Twin Skewer
 * ticket at counter 1, counter 2 waiting for the first merge). `reconcileMerge` is built to the
 * minimum of "never throws": a save whose `merge` has the shape of this version is kept as it is
 * (with `basketUndo` cleared, 2.5), anything else starts afresh. Its real repair (field by field,
 * clamps, a save of an older shape) is MECHANICS's.
 */
import type { GameState } from '../types';
import { rngMix } from '../rng';
import { placeGood } from './board';
import { scriptedTicket } from './draw';
import { festivalFor } from './festival';
import { currentMods } from './lanterns';
import { baseTier, maxPopAt, RECENT_BUCKET, RECENT_BUCKETS } from './params';
import { openingBoard, seasonedStartLevel } from './season';
import { BOARD_CELLS, CHAINS, TIERS, type ChainState, type Counter, type MergeConfig, type MergeGame, type MergeState, type MergeStats } from './types';

const zeroStats = (): MergeStats => ({
  coins: { ticket: 0, festival: 0, gift: 0, till: 0, basket: 0, away: 0, undo: 0, spend: 0 },
  drops: 0,
  luckies: 0,
  basketSales: 0,
  ticketsDrawn: 0,
  setups: 0,
  notTonights: 0,
  giftBoxesOpened: 0,
  ticketsThisSeason: 0,
});

/**
 * The start of season `season` at game clock `clock` (spec 2.11), on top of a state whose kept
 * parts are already right: resets exactly 2.11's "Resets" list (goods on the board, gear, stall
 * and minder levels, stalls, best tiers, shelves, tickets, the till) and the season's own clocks
 * and counters; keeps its "Stays" list (board space and opened shutters, lanterns, the Ladder Book,
 * unopened gift boxes, goods waiting for room, Lucky Sparks, seasoned gear; purchases and coins are
 * on the shared state, not here). The new season's shape (`openingBoard`'s blocks), opening goods,
 * Festival and the modifiers of its character and the lit lanterns (`currentMods`) apply.
 * `basketUndo` is cleared. `script` becomes 'done' (the scripted start is the first game's only:
 * createMerge sets it). Coins are the caller's: ORDERS's `closeSeason` resets `cash` with
 * the shared state, counts `seasonsClosed` and the seasoned steps first, then calls this.
 * MECHANICS. Built (create() uses it for season 0).
 */
export function startSeason(cfg: MergeConfig, prev: MergeState, season: number, clock: number): MergeState {
  const m = cfg.merge;
  let state: MergeState = { ...prev, season, seasonStartedAt: clock };
  const mods = currentMods(cfg, state);
  const open = (c: number) => c === 0 || (mods.startOpen.includes(c) && season >= m.chains[c].fromSeason);
  const chains: ChainState[] = prev.chains.map((ch, c) => {
    const gear = seasonedStartLevel(cfg, Math.min(ch.seasoned, mods.seasonedMax));
    const isOpen = open(c);
    return {
      open: isOpen,
      gear,
      stall: 1,
      minder: isOpen && mods.mindersStartHired ? 1 : 0,
      shelf: [],
      waiting: false,
      nextPopAt: clock + m.gear.interval,
      releaseAt: null,
      blockedAt: null,
      nextSaleAt: clock + m.minders.interval * mods.minderIntervalMult,
      // best_c of an open chain is its maxPop (its own drops count as made, 2.3).
      best: isOpen ? maxPopAt(cfg, mods, gear) : 0,
      seasoned: ch.seasoned,
    };
  });
  // The shape's blocks of the season before go; shutters stay as they are (opened ones are cells).
  const board = prev.board.map((cell) => (cell === 'shutter' ? cell : null));
  const counters: Counter[] = Array.from({ length: mods.counters }, () => ({ ticket: null, refillAt: clock + m.tickets.refillDelay, blockedAt: null, notTonightAt: clock }));
  state = {
    ...state,
    till: 0,
    tillAt: clock + m.minders.tillRoll,
    board,
    chains,
    counters,
    script: 'done',
    festival: { lines: festivalFor(cfg, season).map((g) => ({ c: g.c, k: g.k, filled: false })), filledAt: null },
    paradeAt: m.parade.first,
    gift: { ...prev.gift, nextAt: prev.gift.pendingGoods.length ? clock + m.gear.release : null, blockedAt: null },
    basketUndo: null,
    feats: { ...prev.feats, tier8sThisSeason: 0 },
    recent: { at: Math.floor(clock / RECENT_BUCKET), coins: Array.from({ length: CHAINS }, () => Array.from({ length: RECENT_BUCKETS }, () => 0)) },
    freedAt: clock,
    changedAt: clock,
    mstats: { ...prev.mstats, ticketsThisSeason: 0 },
  };
  // An open chain's own drops count as made (2.3): the tiers b to maxPop are stamped in the Ladder Book.
  const book = state.book.map((row) => row.slice());
  chains.forEach((ch, c) => {
    if (ch.open) for (let k = baseTier(cfg, ch.gear); k <= ch.best; k++) book[c][k - 1] = true;
  });
  state = { ...state, book };
  const opening = openingBoard(cfg, state, season);
  if (opening.blocks.length) {
    const b = state.board.slice();
    for (const i of opening.blocks) if (b[i] === null) b[i] = 'block';
    state = { ...state, board: b };
  }
  for (const good of opening.goods) {
    const placed = placeGood(state, good, clock);
    if (placed) state = placed.m;
  }
  return state;
}

/**
 * A fresh merge state for a game whose clock reads `clock` (stats.playSeconds) and whose shared
 * seed is `seed`: the kept parts empty, then `startSeason(…, 0, clock)`, then the scripted start
 * of 2.7 (the fox's Twin Skewer ticket at counter 1; counter 2 waits for the first merge, when the
 * hedgehog steps up). Built.
 */
export function createMerge(cfg: MergeConfig, clock: number, seed: number): MergeState {
  const m = cfg.merge;
  const shutterCells = new Set(m.board.shutterGroups.flatMap((g) => g.cells));
  const empty: MergeState = {
    seed: rngMix(seed >>> 0, 0x6d657267),
    draws: { drop: Array.from({ length: CHAINS }, () => 0), ticket: 0, gift: 0, shutter: 0, parade: 0 },
    season: 0,
    seasonStartedAt: clock,
    till: 0,
    tillAt: clock,
    board: Array.from({ length: BOARD_CELLS }, (_, i) => (shutterCells.has(i) ? ('shutter' as const) : null)),
    shuttersOpened: m.board.shutterGroups.map(() => 0),
    chains: Array.from({ length: CHAINS }, () => ({ open: false, gear: 1, stall: 1, minder: 0, shelf: [], waiting: false, nextPopAt: clock, releaseAt: null, blockedAt: null, nextSaleAt: clock, best: 0, seasoned: 0 })),
    counters: [],
    nextTicketId: 1,
    script: 'fox',
    festival: { lines: [], filledAt: null },
    paradeAt: m.parade.first,
    gift: { boxes: [], ticketsToBox: m.gift.every, pendingGoods: [], nextAt: null, blockedAt: null },
    luckySparks: 0,
    basketUndo: null,
    book: Array.from({ length: CHAINS }, () => Array.from({ length: TIERS }, () => false)),
    lanterns: [],
    feats: { tickets: 0, threeLineTickets: 0, parades: 0, merges: 0, seasonsClosed: 0, tier8sThisSeason: 0 },
    ads: { fillLine: clock, gearRush: clock, callDragon: clock },
    recent: { at: Math.floor(clock / RECENT_BUCKET), coins: [] },
    freedAt: clock,
    changedAt: clock,
    mstats: zeroStats(),
  };
  let state = startSeason(cfg, empty, 0, clock);
  state = { ...state, gift: { ...state.gift, ticketsToBox: currentMods(cfg, state).giftEvery } };
  // 2.7: the fox at counter 1 holds a Twin Skewer ticket; counter 2's hedgehog steps up at the first merge.
  const counters = state.counters.map((ct) => ({ ...ct, refillAt: null }));
  counters[0] = { ...counters[0], ticket: scriptedTicket(cfg, 'fox', 0) };
  return { ...state, counters, script: 'fox' };
}

/** EngineMode.create: the shared fresh state (economy.createInitialState) with `merge` added. Built. */
export function withMergeFields(cfg: MergeConfig, base: GameState): MergeGame {
  return { ...base, merge: createMerge(cfg, base.stats.playSeconds ?? 0, base.rng ?? 0) };
}

/** Whether a saved `merge` has this version's shape (the skeleton's minimum; MECHANICS replaces it with a field-by-field repair). */
function looksCurrent(x: unknown): x is MergeState {
  const m = x as Partial<MergeState> | null;
  return !!m && typeof m === 'object' && Array.isArray(m.board) && m.board.length === BOARD_CELLS && Array.isArray(m.chains) && m.chains.length === CHAINS && Array.isArray(m.counters) && typeof m.seed === 'number' && !!m.festival && !!m.gift && !!m.draws;
}

/**
 * EngineMode.reconcile: a loaded save on top of the reconciled shared fields (`base`). Never
 * throws. Skeleton: keeps a current-shaped `merge` (basketUndo cleared, 2.5), else a fresh one.
 */
export function reconcileMerge(cfg: MergeConfig, base: GameState, raw: unknown): MergeGame {
  try {
    const saved = (raw as { merge?: unknown } | null)?.merge;
    if (looksCurrent(saved)) return { ...base, merge: { ...saved, basketUndo: null } };
  } catch {
    // fall through to a fresh state
  }
  return withMergeFields(cfg, base);
}
