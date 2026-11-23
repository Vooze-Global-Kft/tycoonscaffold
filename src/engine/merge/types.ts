/**
 * The merge rules' types (Night Market, docs/design/market-design.md sections 2.3 to 2.11, with the
 * lead's decisions of section 11: no Pocket anywhere, Decision M5). Pure types and a few constants;
 * the functions are in the files beside this one and are reached only through the public index
 * src/engine/merge.ts.
 *
 * `MergeConfig` is the shared GameConfig plus the parsed `merge` block; `MergeGame` is the shared
 * GameState plus `merge` (as haul's `haul`). Coins are the shared `cash`, changed only through the
 * one clamp `commitCash` (src/engine/merge/actions.ts); the lifetime clock is the shared
 * `stats.playSeconds`, which the tick adds itself. Purchases are the shared `entitlements.products`.
 *
 * Indexing: chains 0 to 5 (Grill 0 ... Puffs 5), tiers 1 to 8, board cells i = row × 7 + col with
 * row 0 next to the street, seasons 0-based. Every time in this state is game-clock seconds
 * (`stats.playSeconds`) unless its comment says "season clock" (playSeconds − seasonStartedAt).
 *
 * Written by the skeleton. Owned afterwards by the rules package MECHANICS; a change to a seam type
 * (the ones the ORDERS files produce or read) is agreed with ORDERS first
 * (docs/design/market-build-plan.md, "The seam").
 */
import type { GameConfig } from '../../config/schema';
import type { MergeContent } from '../../config/schema.merge';
import type { GameState } from '../types';

export type { MergeContent };

/** The shared config with the parsed `merge` block (src/engine/mergeMode.ts `withMergeContent`). */
export type MergeConfig = GameConfig & { merge: MergeContent };

// ----------------------------------------------------------------------------- goods and the board

/** A good: chain c (0 to 5) at tier k (1 to 8). */
export interface Good {
  c: number;
  k: number;
}

/** One board cell: empty, a good, a shutter not yet opened, or a block the season's shape removes. */
export type Cell = null | Good | 'shutter' | 'block';

/** Board size (spec 2.2): 7 columns by 8 rows, 56 cells. */
export const BOARD_COLS = 7;
export const BOARD_ROWS = 8;
export const BOARD_CELLS = BOARD_COLS * BOARD_ROWS;
/** Chains and tiers (v1: 6 by 8). */
export const CHAINS = 6;
export const TIERS = 8;
/** MAX_TICK: one tick advances at most this many seconds (spec 2.4, as haul). */
export const MAX_TICK = 3600;

// ----------------------------------------------------------------------------- chains

/** One stall and its gear, shelf and minder (spec 2.3 `chains[c]`). */
export interface ChainState {
  /** The stall is open this season. */
  open: boolean;
  /** Gear level L (1 to 40; Decision M28: 40 is the top). */
  gear: number;
  /** Stall level M (1 to 31). */
  stall: number;
  /** Minder level K, 0 = none hired (1 to 4). */
  minder: number;
  /**
   * The shelf: the tiers of the drops waiting for room, oldest first (spec 2.3 `charges` is its
   * length). Tiers are kept because `missing()` counts the shelf's goods (2.7) and a release places
   * the tier that was drawn (skeleton decision: a charge is a drawn good, not a bare count).
   */
  shelf: number[];
  /** The gear waits: its shelf was full at a drop; no next drop until a release restarts it (2.4 event 1). */
  waiting: boolean;
  /** The next drop (game clock); meaningless while `waiting` or closed. */
  nextPopAt: number;
  /** The next shelf release (game clock), or null with an empty shelf or while it waits for room (`blockedAt`). */
  releaseAt: number | null;
  /** A release found no room at this time (game clock): retried at the first `freedAt` after it (2.4). Null when not blocked. */
  blockedAt: number | null;
  /** The minder's next sale (game clock); meaningless with no minder. */
  nextSaleAt: number;
  /** best_c: the highest tier of this chain made this season: it rises only when a good is placed or merged, and is set to maxPop when the chain opens or a season starts (2.3, Decision M32). 0 while closed. */
  best: number;
  /** Seasoned gear steps earned (2.11), kept across seasons. */
  seasoned: number;
}

// ----------------------------------------------------------------------------- tickets and counters

/** One line of a ticket: the exact good it asks for. Only `filled` ever changes (2.3). */
export interface TicketLine {
  c: number;
  k: number;
  filled: boolean;
  /** A stretch line at best_c + 1, shown NEW (2.7). Fixed at the draw. */
  stretch?: boolean;
}

/** A paper order ticket (spec 2.3, 2.7). Its price is never stored: it is always the current P (`ticketPrice`). */
export interface Ticket {
  /** Unique within a save (a running count). */
  id: number;
  lines: TicketLine[];
  /** The Paper Dragon Parade's gold ticket (pays × the Parade multiplier). */
  gold: boolean;
  /** Who holds it: an index into `merge.tickets.customers` and a coat colour (0 .. coats − 1); the dragon when gold. */
  customer: number;
  coat: number;
  /** One of the scripted opening tickets of 2.7 (exempt from bound (d) only). */
  scripted?: boolean;
}

/** A counter at the street (spec 2.3 `counters`): 2 to 4 of them. */
export interface Counter {
  ticket: Ticket | null;
  /** The next draw (game clock) while empty; null while it holds a ticket, or while it waits (`blockedAt`, or the script). */
  refillAt: number | null;
  /** "Setting up…": a draw found no ticket at this time (game clock); redrawn at the first `changedAt` after it (2.4; 2.7 fallback step 4, M32). */
  blockedAt: number | null;
  /** "Not tonight" is ready again at this time (game clock). */
  notTonightAt: number;
}

/** The scripted start of 2.7 (first season of a new game only). */
export type OpeningScript = 'fox' | 'hedgehog' | 'done';

// ----------------------------------------------------------------------------- Festival, gift boxes

/** The season's Festival ticket (spec 2.8). */
export interface FestivalState {
  lines: TicketLine[];
  /** When its last line landed (game clock), null until then. Closing the season is allowed from then on. */
  filledAt: number | null;
}

/** One slot of a gift box, fixed when the box is earned (spec 5.5). */
export type GiftSlot = { kind: 'coins' } | { kind: 'good'; good: Good } | { kind: 'spark' };

/** A gift box (spec 2.3 `gift.boxes`): its coin amount and slots fixed when earned. */
export interface GiftBox {
  /** The coins of each coin slot (coinPace × U at the earning). */
  coins: number;
  slots: GiftSlot[];
}

export interface GiftState {
  /** Earned, unopened, oldest first. They wait without limit and survive a season close. */
  boxes: GiftBox[];
  /** Paid tickets still needed for the next box. */
  ticketsToBox: number;
  /** Goods from opened boxes waiting for room, in order (2.4 event 3); `missing()` counts them as goods at hand (2.7). */
  pendingGoods: Good[];
  /** The next pending good's placement (game clock), or null with none or while blocked. */
  nextAt: number | null;
  /** A placement found no room at this time (game clock); retried at the first `freedAt` after it. */
  blockedAt: number | null;
}

/** The Basket's undo chip (spec 2.5): the sold good, its reserved cell and the refund to take back. */
export interface BasketUndo {
  cell: number;
  good: Good;
  refund: number;
  /** The chip expires at this time (game clock); the reserved cell is then freed (the sale stands). */
  until: number;
}

// ----------------------------------------------------------------------------- lanterns, ads, stats

/**
 * Lifetime counters the lantern feats read (spec 5.3). Kept across seasons. Who counts each (the
 * seam, docs/design/market-build-plan.md): MECHANICS counts what happens on the board, ORDERS what
 * happens to tickets and seasons, each before it calls the other side's hook.
 */
export interface Feats {
  /** Paid tickets, the Parade's included. ORDERS, in lanterns.ts `onTicketPaid`. */
  tickets: number;
  /** Paid tickets of 3 lines or more. ORDERS, in `onTicketPaid`. */
  threeLineTickets: number;
  /** Paid Parade (gold) tickets. ORDERS, in `onTicketPaid`. */
  parades: number;
  /** Lifetime merges: also the Lucky stream's position n (2.3). MECHANICS, in drop.ts, before `onMerged`. */
  merges: number;
  /** ORDERS, in season.ts `closeSeason`. */
  seasonsClosed: number;
  /** Tier 8 goods made in the current season (lantern 20). MECHANICS, in drop.ts, at every tier 8 a merge makes (not only the first); reset by `startSeason`. */
  tier8sThisSeason: number;
}

/**
 * The rewarded ads of spec 5.7 that the mode grants itself (the away ad is the report's, M8):
 * "Fill one line", "Gear rush" and "Call the dragon" (Decision M14: brings the Parade now when none
 * is out). With the Quiet Evening product (kind skipAds, M13) the shared ads service gives the
 * reward with no video (`ads.skipRewarded`); the rules do not know about it.
 */
export type MergeAdKind = 'fillLine' | 'gearRush' | 'callDragon';

/**
 * The five ways coins enter (spec 2.3 with Decision M37: paid tickets, gift-box coin slots, the
 * till, Basket sales and the away report; gate 8 asserts every trace has no other), and the two
 * ways they leave ('undo' takes a Basket sale back, 'spend' pays a purchase). `commitCash` books
 * every change under one of these, so a test can read where coins came from.
 */
export type CoinSource = 'ticket' | 'gift' | 'till' | 'basket' | 'away' | 'undo' | 'spend';

/** Counters for the bot, the tests and the reports (not shown as a system). Kept across seasons unless noted. */
export interface MergeStats {
  /** Coins booked per source (lifetime); `spend` and `undo` are negative. */
  coins: Record<CoinSource, number>;
  drops: number;
  luckies: number;
  basketSales: number;
  /** Tickets drawn and the draws that fell back to "Setting up…" (gate 4). */
  ticketsDrawn: number;
  setups: number;
  notTonights: number;
  giftBoxesOpened: number;
  /** Paid tickets this season (resets at the close). */
  ticketsThisSeason: number;
}

/**
 * Ticket coins of the last five minutes: 60 buckets of 5 s of game clock (2.3 `recent`; R_t of
 * 2.10), PER CHAIN, because 2.10's stall-level gain needs "the chain's ticket coins in recent".
 * A paid ticket books its coins to the chains of its lines in proportion to each line's value
 * (MECHANICS, drop.ts); the total is the sum over chains (params.ts `recentCoins`).
 */
export interface RecentCoins {
  /** floor(clock / 5) of the newest bucket, `coins[c][59]`. */
  at: number;
  /** coins[c][j]: chain c's ticket coins in bucket j (6 rows of 60, oldest first). */
  coins: number[][];
}

/** The random sites of 2.3; each draws `rngMix4(seed, site, n, x)` with its own counter n. */
export const SITE = { drop: 1, ticket: 2, lucky: 3, gift: 4, shutter: 5, parade: 6 } as const;
export type StreamSite = keyof typeof SITE;

/** One counter per random site (2.3 `draws`): drops per chain (n = that chain's drops), the others global. The Lucky stream uses `feats.merges`. */
export interface Draws {
  drop: number[];
  ticket: number;
  gift: number;
  shutter: number;
  parade: number;
}

// ----------------------------------------------------------------------------- the state

/** The merge mode's state on the shared GameState, under `merge` (spec 2.3). Pocket: none (M5). */
export interface MergeState {
  seed: number;
  draws: Draws;
  /** 0-based season; season 1 on screen is 0. */
  season: number;
  /** stats.playSeconds when the season started (season clock = playSeconds − seasonStartedAt). */
  seasonStartedAt: number;
  /** Minder coins not yet in the purse (2.4 event 5). */
  till: number;
  /** The next till roll (game clock): each whole minute of the season clock. */
  tillAt: number;
  /** 56 cells, i = row × 7 + col. */
  board: Cell[];
  /** Shutters opened per group (0 to the group's size), kept across seasons. */
  shuttersOpened: number[];
  chains: ChainState[];
  counters: Counter[];
  /** The next ticket id. */
  nextTicketId: number;
  script: OpeningScript;
  festival: FestivalState;
  /** The next Parade is due at this season-clock time; a gold ticket out means none is drawn (2.7). */
  paradeAt: number;
  gift: GiftState;
  luckySparks: number;
  basketUndo: BasketUndo | null;
  /** The Ladder Book: book[c][k − 1] is true once (c, k) was ever made (all time). */
  book: boolean[][];
  /** Lit lanterns (1 to 20), in the order lit. Forever. */
  lanterns: number[];
  feats: Feats;
  /** Each rewarded ad is ready from this time (game clock; M10: cooldowns run on the play clock). */
  ads: Record<MergeAdKind, number>;
  recent: RecentCoins;
  /** The last time a cell was freed by an expiry or a player action (game clock; 2.4 retries). */
  freedAt: number;
  /** The last time the board changed (game clock; 2.4 retries of an empty counter). */
  changedAt: number;
  mstats: MergeStats;
}

/** The shared GameState of a merge game. `merge` is absent only in a save that has not been reconciled. */
export type MergeGame = GameState & { merge: MergeState };

// ----------------------------------------------------------------------------- the tick (2.4)

/**
 * The kinds of the tick's event queue, in the tie order of 2.4: events run strictly in time order,
 * ties broken by (time, kind, index) in this order.
 */
export const EVENT_KINDS = ['drop', 'release', 'giftGood', 'sale', 'till', 'refill', 'parade', 'expiry'] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

/** One due event of the queue: its time (game clock), kind and index (a chain, a counter, ...). */
export interface QueuedEvent {
  at: number;
  kind: EventKind;
  index: number;
}

/**
 * What happened during a tick or an action, for sounds (src/modes/merge/fx.ts), effects and the
 * bot. The rules append to the `events` list a caller passes in; they never play anything.
 */
export type MergeEvent =
  | { type: 'drop'; c: number; k: number; cell: number }
  | { type: 'shelved'; c: number; k: number }
  | { type: 'gearWaiting'; c: number }
  | { type: 'released'; c: number; k: number; cell: number }
  | { type: 'giftGoodPlaced'; good: Good; cell: number }
  | { type: 'sale'; c: number; coins: number }
  | { type: 'tillRoll'; coins: number }
  | { type: 'ticketDrawn'; counter: number; ticket: Ticket }
  | { type: 'settingUp'; counter: number }
  | { type: 'paradeArrive'; counter: number }
  | { type: 'undoExpired'; cell: number }
  | { type: 'merge'; cell: number; made: Good; lucky: boolean; spark: boolean }
  | { type: 'discovery'; good: Good }
  | { type: 'move'; from: number; to: number }
  | { type: 'swap'; from: number; to: number }
  | { type: 'return'; from: number }
  | { type: 'lineFill'; counter: number; line: number }
  | { type: 'ticketShake'; counter: number }
  | { type: 'ticketPaid'; counter: number; ticket: Ticket; coins: number }
  | { type: 'festivalLine'; line: number }
  | { type: 'festivalDone'; sparks: number }
  | { type: 'basketSell'; cell: number; good: Good; coins: number }
  | { type: 'undo'; cell: number }
  | { type: 'shutterOpen'; group: number; cell: number; good: Good | null }
  | { type: 'stallOpen'; c: number }
  | { type: 'gearLevel'; c: number; level: number; baseStep: boolean }
  | { type: 'stallLevel'; c: number; level: number }
  | { type: 'minderHire'; c: number }
  | { type: 'minderLevel'; c: number; level: number }
  | { type: 'giftEarned'; box: number }
  | { type: 'giftOpened'; box: GiftBox }
  | { type: 'lanternLit'; n: number }
  | { type: 'notTonight'; counter: number }
  | { type: 'adGranted'; kind: MergeAdKind }
  | { type: 'seasonClosed'; season: number };

// ----------------------------------------------------------------------------- player actions (2.5)

/**
 * Where a drag or a tap-tap ends (spec 2.5's table, resolved at the finger point, M9). A cell holds
 * a good, is empty, a shutter or a block (the rules tell which); `none` is the street background, a
 * stall front, a bar or outside the canvas. No Pocket target (M5).
 */
export type DropTarget = { kind: 'cell'; cell: number } | { kind: 'counter'; counter: number } | { kind: 'festival' } | { kind: 'basket' } | { kind: 'none' };

/**
 * The hit test's number for a target (a worklet returns plain numbers, spec 4.3; `decodeTarget`
 * turns it back): a cell is its index 0 to 55, a counter TARGET_COUNTER + its index, the Festival
 * banner TARGET_FESTIVAL, the Basket TARGET_BASKET, nothing TARGET_NONE.
 */
export type TargetCode = number;
export const TARGET_NONE = -1;
export const TARGET_COUNTER = 100;
export const TARGET_FESTIVAL = 200;
export const TARGET_BASKET = 201;

/** What a drop did (the screens shake a ticket, outline, play a key). `return` changed nothing. */
export type DropResult =
  | { kind: 'merge'; cell: number; made: Good; lucky: boolean; spark: boolean; discovered: Good[] }
  | { kind: 'move'; cell: number }
  | { kind: 'swap'; cell: number }
  | { kind: 'lineFill'; counter: number; line: number; paid: number | null }
  | { kind: 'ticketShake'; counter: number }
  | { kind: 'festivalFill'; line: number; done: boolean }
  | { kind: 'basket'; coins: number }
  | { kind: 'return'; reason: 'sameCell' | 'tierMax' | 'closedCell' | 'noTarget' | 'noGood' | 'noLine' | 'reserved' };

/** `dropAt`'s answer: the new game (the same object when the drop changed nothing) and what happened. */
export interface DropOutcome {
  game: MergeGame;
  result: DropResult;
}

// ----------------------------------------------------------------------------- derived values (2.3)

/**
 * Every number a lantern (5.3 with M5) or a season character (2.11) can change, in ONE object:
 * lanterns.ts and season.ts produce it, params.ts consumes it. `neutralMods(cfg)` is the value with
 * no lantern lit and no character (every field from the config). Precedence (2.3): when a season
 * character and a lantern change the same number, the better one applies; they never stack.
 */
export interface Mods {
  /** Counters at the street (2; 3 with lantern 1; 4 with lantern 4). */
  counters: number;
  /** Basket sale share (0.25; 0.4 with lantern 2). */
  basketShare: number;
  /** Shelf size (6; 8 with lantern 3). */
  shelfCap: number;
  /** Parade interval, s of season clock (600; 480 with lantern 5; 300 Market day: the better, shorter one). */
  paradeEvery: number;
  /** Extra away hours from lanterns (0; +2 with lantern 6). Late Hours is a product, not a mod (`awayCap`). */
  awayHours: number;
  /** Lucky: 1 in this many merges (25; 20 with lantern 7; 16 with lantern 16; 12 Fireflies: the better, smaller one). */
  luckyOdds: number;
  /** Chains open at a season's start besides the Grill (lantern 8: Tea). */
  startOpen: number[];
  /** Seasoned steps a chain can hold (3; +1 with lantern 9). */
  seasonedMax: number;
  /** The Parade's pay multiplier (2; 2.5 with lantern 10). */
  paradeMultiplier: number;
  /** Minders start each season hired (lantern 11). */
  mindersStartHired: boolean;
  /** Added to every gear's ripe chance p (0; 0.05 with lantern 12; 0.15 Warm gear: the better one). */
  ripeAdd: number;
  /** Added to β (0; 0.1 with lantern 13 or the Harvest season, not both). */
  betaAdd: number;
  /** The share of 3-line draws, or null for the configured odds (Harvest: 0.25). */
  threeLineShare: number | null;
  /** Gift box slots (3; 4 with lantern 14, M5). */
  giftSlots: number;
  /** Minder sale interval multiplier (1; 0.8 with lantern 15; 0.67 Late crowd: the better, smaller one). */
  minderIntervalMult: number;
  /** Tiers a Lucky Spark adds (1; 2 with lantern 17). */
  sparkTiers: number;
  /** Lucky Sparks the filled Festival gives (3; 5 with lantern 18; Decision M37: no coins). */
  festivalSparks: number;
  /** Paid tickets per gift box (N = gift.every, tuned 15 to 40, start 25; a fifth sooner with lantern 19, Decision M24). */
  giftEvery: number;
  /** Multiplier on all ticket pay (1; 1.05 with lantern 20: "lanternPay"). */
  ticketPay: number;
}

/** A chain's derived numbers (spec 2.2, 2.3) at the current state. */
export interface ChainParams {
  c: number;
  open: boolean;
  /** r_c = v_c / 5. */
  r: number;
  /** v_c, the tier-1 value before the stall bonus. */
  v: number;
  /** Base tier b and ripe chance p (all bonuses, at most ripeMax); maxPop = b + (p > 0 ? 1 : 0). */
  base: number;
  ripe: number;
  maxPop: number;
  /** S_c, the stall bonus. */
  stallBonus: number;
  /** value(c, k) for k = 1 to 8 at index k − 1 (lanternPay included). */
  values: number[];
  /** h_c = min(K + 1, b_c + 1), the minder's house tier, or 0 with no minder; and what holds it back. */
  houseTier: number;
  heldBy: 'minder' | 'gear' | null;
  /** The minder's sale interval Q (with mods) and its coins per s. */
  saleInterval: number;
  minderRate: number;
  /** Loose_c: chain-c goods on the board with b ≤ k ≤ b + 1. */
  loose: number;
  /** The next purchases' prices, or null at the maximum (or not allowed now: the next stall only). */
  gearCost: number | null;
  stallCost: number | null;
  minderCost: number | null;
  /** The cost to open this stall (null when open, or not the next one, or not this season). */
  openCost: number | null;
}

/** `mergeParams(cfg, state)` (spec 2.3): every derived value the rules, the screens and the bot read. */
export interface MergeParams {
  mods: Mods;
  chains: ChainParams[];
  /** β with mods. */
  beta: number;
  /** O: cells neither shutter nor block. F: open cells empty and not reserved by an undo chip. */
  O: number;
  F: number;
  /** U, the pace unit: Σ over open chains of value(c, max(2, best_c − 1)). */
  U: number;
  /** Σ minder rates, coins per s. */
  minderRate: number;
  /** The next shutter of each group: its cost and whether its condition holds, or null when the group is done. */
  shutters: ({ n: number; cell: number; cost: number; allowed: boolean } | null)[];
  /** The familiar-faces factor F_s of this season. */
  familiar: number;
  /** The away cap in seconds (with lantern 6 and Late Hours). */
  awayCap: number;
}

// ----------------------------------------------------------------------------- advice, away, hints

/** What `advice` proposes (spec 2.10): the single next goal. */
export type AdviceKind = 'gear' | 'stall' | 'minderHire' | 'minderLevel' | 'openStall' | 'shutter' | 'lantern' | 'festival' | 'basket' | 'fillTicket';

/** `advice(cfg, state)`'s result: what, for which chain or group, the price, the gain per s and the wait. */
export interface Advice {
  kind: AdviceKind;
  /** The chain (gear, stall, minders, open stall), the shutter group, or the lantern number; else null. */
  target: number | null;
  /** Coins it costs (0 for a lantern feat, the Festival, the Basket or a ticket). */
  cost: number;
  /** Income gained per s (0 when it is not a purchase). */
  gain: number;
  /** max(0, cost − cash) / R in s, or null when R = 0 (no estimate shown). */
  wait: number | null;
  /** The ranking score (lowest wins); Infinity for the non-purchase goals. */
  score: number;
}

/** The away report (spec 2.9, Decision M8: the mode's own sheet). */
export interface AwayReport {
  /** Time away and the part that counted (t and t′). */
  seconds: number;
  effective: number;
  /**
   * House goods each minder sold, and their coins. The per-minder `coins` are the unrounded sums of
   * whole sales: they do NOT add up to `earnings`, which is rounded once (M19). Never print them as
   * amounts (a screen prints `goods` per minder and `earnings` as the total); they are for the bot.
   */
  sales: { c: number; goods: number; coins: number }[];
  /** What is shown and granted: roundCoins of the sum of every sale, once (M19). */
  earnings: number;
  /** Goods each gear put on its shelf while away; the chains whose gear now waits. */
  shelved: { c: number; goods: number }[];
  waiting: number[];
}

/** A hint of the timed script and the idle firefly (spec 3.1): what to point at, by target key (src/ui/hints/targets.ts). */
export interface MergeHint {
  id: string;
  kind: 'drag' | 'point';
  /** Target keys: a drag from `from` to `to`, a point at `to`. */
  from?: string;
  to: string;
  /** The strings.ts key of the goal-line text, when the hint names a goal. */
  text?: string;
}

/** The result of `missing()` (spec 2.7): the basic units still needed per line, in input order (pops: `popsNeeded`). */
export interface MissingResult {
  /** Basic units (tier-1 goods) still needed by each line after the lines taken before it. */
  units: number[];
}

/** A drawn ticket (or none) and how many values of the ticket stream the draw used. */
export interface DrawOutcome {
  ticket: Ticket | null;
  /** Ticket-stream values consumed (the caller advances `draws.ticket` by this). */
  used: number;
}
