/**
 * A new merge game and a loaded save (spec 2.3, the scripted start of 2.7).
 *
 * Package MECHANICS (docs/design/market-build-plan.md). Seam: reads ORDERS's `openingBoard`
 * (./season.ts), `festivalFor` (./festival.ts), `scriptedTicket` (./draw.ts) and `currentMods`
 * (./lanterns.ts).
 *
 * Skeleton bodies: `createMerge` and `withMergeFields` are built: a valid fresh state by 2.3 with
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
import { openingBoard } from './season';
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

/** A fresh merge state for a game whose clock reads `clock` (stats.playSeconds) and whose shared seed is `seed`. */
export function createMerge(cfg: MergeConfig, clock: number, seed: number): MergeState {
  const m = cfg.merge;
  const shutterCells = new Set(m.board.shutterGroups.flatMap((g) => g.cells));
  const board = Array.from({ length: BOARD_CELLS }, (_, i) => (shutterCells.has(i) ? ('shutter' as const) : null));
  const chains: ChainState[] = Array.from({ length: CHAINS }, (_, c) => ({
    open: c === 0,
    gear: 1,
    stall: 1,
    minder: 0,
    shelf: [],
    waiting: false,
    nextPopAt: clock + m.gear.interval,
    releaseAt: null,
    blockedAt: null,
    nextSaleAt: clock + m.minders.interval,
    // best_c of an open chain is its maxPop (its own drops count as made, 2.3): level 1 drops tier 1 only.
    best: c === 0 ? 1 : 0,
    seasoned: 0,
  }));
  const counters: Counter[] = Array.from({ length: m.tickets.counters }, () => ({ ticket: null, refillAt: null, blockedAt: null, notTonightAt: clock }));
  // 2.7: the fox at counter 1 holds a Twin Skewer ticket; counter 2's hedgehog steps up at the first merge.
  counters[0] = { ...counters[0], ticket: scriptedTicket(cfg, 'fox', 0) };
  const book = Array.from({ length: CHAINS }, () => Array.from({ length: TIERS }, () => false));
  // The opening Pepper Skewers are the Grill's own drops: made, so stamped (skeleton decision, 2.3 best_c).
  book[0][0] = true;
  let state: MergeState = {
    seed: rngMix(seed >>> 0, 0x6d657267),
    draws: { drop: Array.from({ length: CHAINS }, () => 0), ticket: 0, gift: 0, shutter: 0, parade: 0 },
    season: 0,
    seasonStartedAt: clock,
    till: 0,
    tillAt: clock + m.minders.tillRoll,
    board,
    shuttersOpened: m.board.shutterGroups.map(() => 0),
    chains,
    counters,
    nextTicketId: 1,
    script: 'fox',
    festival: { lines: festivalFor(cfg, 0).map((g) => ({ c: g.c, k: g.k, filled: false })), filledAt: null },
    paradeAt: m.parade.first,
    gift: { boxes: [], ticketsToBox: m.gift.every, pendingGoods: [], nextAt: null, blockedAt: null },
    luckySparks: 0,
    basketUndo: null,
    book,
    lanterns: [],
    feats: { tickets: 0, threeLineTickets: 0, parades: 0, merges: 0, seasonsClosed: 0, tier8sThisSeason: 0 },
    ads: { fillLine: clock, gearRush: clock },
    recent: { at: Math.floor(clock / 5), coins: Array.from({ length: 60 }, () => 0) },
    freedAt: clock,
    changedAt: clock,
    mstats: zeroStats(),
  };
  state = { ...state, gift: { ...state.gift, ticketsToBox: currentMods(cfg, state).giftEvery } };
  const opening = openingBoard(cfg, state, 0);
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
