/**
 * Merge states for tests, screens, the dev presets and the bot (spec 8.1 step 5: "screens build
 * against typed interfaces and fixtures with no number of their own"). Hand-made on top of the
 * rules' own fresh state, every one checked by `fixtureProblems` (the invariants a reachable state
 * keeps: cells and shutters, best tiers and the Ladder Book, ticket lines inside (a) and (d1),
 * counters and lanterns, shelves): src/engine/mergeMode.test.ts runs it on all of them.
 * - `fresh`: a new game at 0:00 (2.7's scripted start: 6 Pepper Skewers, Decision M18, the fox's ticket).
 * - `minute3`: about 3:00 in: Grill and Tea open, 2 shutters opened, lantern 1 lit (3 counters).
 * - `minute10`: about 10:00 in: three stalls, two minders, 38 cells, a Parade ticket out, a gift box waiting.
 * - `festivalNear`: about 2:40 in: five stalls, every shutter open, 4 counters, 3 of 4 Festival lines filled.
 *
 * The config is the specification's starting content (src/config/merge.content.ts) on the frozen
 * shared fixture `base-game.json`; it never reads the shipped game.json. Web only like the haul
 * fixtures (scripts/lib/modes.js WEB_ONLY): the presets reach it, phones never do.
 *
 * `mergeState(cfg, description)` builds any other mid-game state from a short description (open
 * chains and levels, goods on the board, tickets, lanterns, gift boxes): for the rules' tests, the
 * screens' previews and the bot.
 *
 * Written by the skeleton; owned afterwards by the rules package MECHANICS (the numbers package may
 * add bot-played states beside these).
 */
import { GameConfigSchema } from '../../config/schema';
import { MERGE_STARTING_CONTENT } from '../../config/merge.content';
import { MergeSchema, type MergeContentInput } from '../../config/schema.merge';
import * as R from '../merge';
import type { GameState } from '../types';
import baseGame from './base-game.json';

/** A fixed epoch for fixtures (23 Nov 2026, 12:00 UTC). */
export const FIXTURE_NOW = Date.UTC(2026, 10, 23, 12, 0, 0);

/** The test config: the shared fields of the frozen fixture, mode "merge", the starting merge content with `overrides` (shallow per top-level key). */
export function mergeTestConfig(overrides: Partial<MergeContentInput> = {}): R.MergeConfig {
  const raw = { ...(baseGame as Record<string, unknown>), mode: 'merge', soundPack: null, businesses: [], upgrades: [] };
  const cfg = GameConfigSchema.parse(raw);
  cfg.economy.prestige = { ...cfg.economy.prestige, bonusPerPoint: 0 };
  cfg.economy.startingCash = 0;
  const merge = MergeSchema.parse(JSON.parse(JSON.stringify({ ...MERGE_STARTING_CONTENT, ...overrides })));
  return { ...cfg, merge } as R.MergeConfig;
}

/** A shared state shaped like economy.createInitialState's, without importing economy.ts. */
export function baseGameState(now: number, seed = 12345): GameState {
  return {
    version: 2,
    cash: 0,
    gems: 0,
    runEarnings: 0,
    lifetimeEarnings: 0,
    prestigePoints: 0,
    prestigeCount: 0,
    venues: {},
    activeVenue: 'main',
    upgrades: [],
    boostUntil: 0,
    rush: { until: 0, readyAt: 0 },
    storySeen: [],
    entitlements: { noAds: false, skipRewarded: false, products: [], multipliers: {} },
    daily: { lastClaimDay: null, streak: 0 },
    cards: {},
    chests: { owned: {}, freeAnchor: 0, freeClaimed: 0, adDay: null, adCount: 0, adNextAt: 0, sinceEpic: 0, sinceLegendary: 0, seed: seed ^ 0x4348, opened: {} },
    missions: { slots: [], completed: {}, total: 0, day: null, doneToday: 0 },
    deals: {},
    dailyShop: { day: null, offerIds: [], bought: [] },
    rng: seed >>> 0,
    stats: { taps: 0, adsWatched: 0, playSeconds: 0, firstOpenAt: now, served: 0, levelsBought: 0, hires: 0, chestsOpened: 0, bonusCaught: 0, rushes: 0, sessions: 0, venuesEver: 1, clockHigh: now },
    lastSavedAt: now,
  };
}

/** A new merge game (the rules' own create). */
export function freshState(cfg: R.MergeConfig = mergeTestConfig(), seed = 12345, now = FIXTURE_NOW): R.MergeGame {
  return R.withMergeFields(cfg, baseGameState(now, seed));
}

// ------------------------------------------------------------------------- building hand-made states

const g8 = (c: number, k: number): R.Good => ({ c, k });
const baseOf = (cfg: R.MergeConfig, level: number) => Math.min(cfg.merge.gear.maxBase, 1 + Math.floor((level - 1) / cfg.merge.gear.step));

/** A ticket line in short form: [chain, tier] or [chain, tier, filled]; or a full TicketLine. */
export type LineDesc = [number, number] | [number, number, boolean] | R.TicketLine;

/**
 * A mid-game state in a few words, for the rules' tests, the screens and the bot (`mergeState`).
 * Everything left out takes the fresh game's value (the clock 0, no cash, the Grill alone at
 * level 1, the first season, nothing lit). Chains not listed stay closed; a listed chain is open.
 */
export interface MergeDesc {
  /** Game clock (stats.playSeconds) and the season clock's start (default: the season started at 0). */
  clock?: number;
  seasonStartedAt?: number;
  season?: number;
  cash?: number;
  seed?: number;
  /** Open chains: gear, stall and minder levels (default 1, 1, 0), best (default: maxPop, raised to the highest good of the chain on the board), shelf tiers, a waiting gear, seasoned steps. */
  chains?: { c: number; gear?: number; stall?: number; minder?: number; best?: number; shelf?: number[]; waiting?: boolean; seasoned?: number }[];
  /** Shutters opened per group (default none). */
  shutters?: number[];
  /** Goods on the board: [cell, good] or [cell, chain, tier]. With `goods` given the opening goods go. */
  goods?: ([number, R.Good] | [number, number, number])[];
  /** Cells the season's shape blocks. */
  blocks?: number[];
  /** Tickets per counter (null: empty and drawing after 2 s); padded with empty counters to the count the lanterns allow. */
  counters?: (LineDesc[] | null)[];
  /** The counter whose ticket is the Parade's gold one. */
  gold?: number;
  lanterns?: number[];
  feats?: Partial<R.Feats>;
  /** Festival lines already filled (indices), or true for all (sets filledAt to the clock). */
  festivalFilled?: number[] | true;
  giftBoxes?: R.GiftBox[];
  ticketsToBox?: number;
  pendingGoods?: R.Good[];
  luckySparks?: number;
  till?: number;
  /** The opening script's stage (default 'done'). */
  script?: R.OpeningScript;
  /** Owned products (`entitlements.products`). */
  products?: string[];
}

const toLine = (l: LineDesc): R.TicketLine => (Array.isArray(l) ? { c: l[0], k: l[1], filled: !!l[2] } : { ...l });

/**
 * Builds the state a description gives (see `MergeDesc`), on top of the rules' own fresh state, so
 * every field the rules keep is present and consistent: clocks one interval ahead, shelves that
 * release, empty counters that draw, the Ladder Book holding every tier up to each best. Check the
 * result with `fixtureProblems` when the description is new.
 */
export function mergeState(cfg: R.MergeConfig, d: MergeDesc): R.MergeGame {
  const clock = d.clock ?? 0;
  const g0 = freshState(cfg, d.seed ?? 12345);
  const m0 = g0.merge;
  const shutters = d.shutters ?? cfg.merge.board.shutterGroups.map(() => 0);
  const board = m0.board.map((c) => (c === 'shutter' ? 'shutter' : d.goods ? null : c)) as R.Cell[];
  cfg.merge.board.shutterGroups.forEach((grp, i) => grp.cells.slice(0, shutters[i] ?? 0).forEach((cell) => (board[cell] = null)));
  for (const b of d.blocks ?? []) if (board[b] !== 'shutter') board[b] = 'block';
  const goods: [number, R.Good][] = (d.goods ?? []).map((x) => (x.length === 3 ? [x[0], g8(x[1], x[2])] : [x[0], { ...x[1] }]));
  for (const [cell, good] of goods) board[cell] = good;
  const specs = d.chains ?? [{ c: 0 }];
  const neutral = R.currentMods(cfg, m0);
  const chains = m0.chains.map((ch, c) => {
    const spec = specs.find((x) => x.c === c);
    if (!spec) return c === 0 && !d.chains ? { ...ch, nextPopAt: clock + 2, nextSaleAt: clock + 7 } : { ...ch, open: false, best: 0, shelf: [], waiting: false };
    const gear = spec.gear ?? 1;
    const top = goods.filter(([, gd]) => gd.c === c).reduce((a, [, gd]) => Math.max(a, gd.k), 0);
    const shelf = spec.shelf ?? [];
    return {
      ...ch,
      open: true,
      gear,
      stall: spec.stall ?? 1,
      minder: spec.minder ?? 0,
      best: Math.max(spec.best ?? R.maxPopAt(cfg, neutral, gear), top, ...shelf),
      shelf,
      waiting: !!spec.waiting,
      seasoned: spec.seasoned ?? 0,
      nextPopAt: clock + 2,
      nextSaleAt: clock + 7,
      releaseAt: shelf.length ? clock + 0.5 : null,
      blockedAt: null,
    };
  });
  const book = m0.book.map((row, c) => row.map((_, k) => k + 1 <= chains[c].best));
  let id = 1;
  const lanterns = d.lanterns ?? [];
  const allowed = lanterns.includes(4) ? 4 : lanterns.includes(1) ? 3 : cfg.merge.tickets.counters;
  const descs = (d.counters ?? []).slice();
  while (descs.length < allowed) descs.push(null);
  const counters: R.Counter[] = descs.map((lines, j) => ({
    ticket: lines ? { id: id++, lines: lines.map(toLine), gold: d.gold === j, customer: j % cfg.merge.tickets.customers.length, coat: j % cfg.merge.tickets.coats } : null,
    refillAt: lines ? null : clock + 2,
    blockedAt: null,
    notTonightAt: clock,
  }));
  const seasonStartedAt = d.seasonStartedAt ?? 0;
  const allFilled = d.festivalFilled === true;
  const festival = { lines: m0.festival.lines.map((l, i) => ({ ...l, filled: allFilled || (Array.isArray(d.festivalFilled) && d.festivalFilled.includes(i)) })), filledAt: allFilled ? clock : null };
  const pendingGoods = d.pendingGoods ?? [];
  const merge: R.MergeState = {
    ...m0,
    season: d.season ?? 0,
    seasonStartedAt,
    till: d.till ?? 0,
    tillAt: seasonStartedAt + 60 * (Math.floor((clock - seasonStartedAt) / 60) + 1),
    board,
    shuttersOpened: shutters.slice(),
    chains,
    counters,
    nextTicketId: id,
    script: d.script ?? 'done',
    festival,
    paradeAt: d.gold !== undefined ? cfg.merge.parade.first : Math.max(cfg.merge.parade.first, clock - seasonStartedAt + 120),
    gift: { ...m0.gift, boxes: d.giftBoxes ?? [], ticketsToBox: d.ticketsToBox ?? m0.gift.ticketsToBox, pendingGoods, nextAt: pendingGoods.length ? clock : null, blockedAt: null },
    luckySparks: d.luckySparks ?? 0,
    book,
    lanterns: lanterns.slice(),
    feats: { ...m0.feats, ...d.feats },
    ads: { fillLine: clock, gearRush: clock, callDragon: clock },
    recent: { at: Math.floor(clock / 5), coins: m0.recent.coins.map((row) => row.slice()) },
    freedAt: clock,
    changedAt: clock,
  };
  const cash = d.cash ?? 0;
  return {
    ...g0,
    cash,
    runEarnings: cash * 3,
    lifetimeEarnings: cash * 3,
    entitlements: { ...g0.entitlements, products: (d.products ?? []).slice() },
    stats: { ...g0.stats, playSeconds: clock },
    merge,
  };
}

const line = (c: number, k: number, filled = false): R.TicketLine => ({ c, k, filled });

/** The skeleton's name for `mergeState` with the fixtures' shape. */
function build(cfg: R.MergeConfig, s: MergeDesc): R.MergeGame {
  return mergeState(cfg, s);
}

/** The hand-made states (see the file comment). Built from `cfg` (default: the starting content). */
export function mergeFixtures(cfg: R.MergeConfig = mergeTestConfig()) {
  const fresh = freshState(cfg);
  const minute3 = build(cfg, {
    clock: 180,
    cash: 64,
    chains: [
      { c: 0, gear: 3, stall: 1, minder: 0, best: 4 },
      { c: 1, gear: 1, stall: 1, minder: 0, best: 1 },
    ],
    shutters: [2, 0, 0, 0],
    goods: [[17, g8(0, 1)], [16, g8(0, 2)], [18, g8(0, 2)], [15, g8(0, 3)], [24, g8(1, 1)], [44, g8(0, 1)]],
    counters: [[line(0, 3)], [line(1, 2)], [line(0, 4), line(0, 2, true)]],
    lanterns: [1],
    feats: { tickets: 8, merges: 22 },
    ticketsToBox: 2,
  });
  const minute10 = build(cfg, {
    clock: 600,
    cash: 410,
    chains: [
      { c: 0, gear: 5, stall: 2, minder: 1, best: 5, shelf: [1] },
      { c: 1, gear: 5, stall: 3, minder: 1, best: 5 },
      { c: 2, gear: 3, stall: 2, minder: 0, best: 3 },
    ],
    shutters: [6, 2, 0, 0],
    goods: [[14, g8(0, 2)], [15, g8(0, 3)], [16, g8(0, 1)], [17, g8(1, 2)], [18, g8(1, 3)], [19, g8(2, 1)], [23, g8(2, 2)], [21, g8(0, 4)], [22, g8(1, 1)], [30, g8(2, 1)], [45, g8(1, 4)]],
    counters: [[line(0, 4)], [line(1, 4), line(0, 3)], [line(2, 3), line(1, 5), line(0, 5)]],
    gold: 2,
    lanterns: [1, 2],
    feats: { tickets: 30, merges: 140, parades: 0 },
    giftBoxes: [{ coins: 90, slots: [{ kind: 'coins' }, { kind: 'good', good: g8(0, 3) }, { kind: 'spark' }] }],
    ticketsToBox: 10,
  });
  const festivalNear = build(cfg, {
    clock: 9600,
    cash: 182_000,
    chains: [
      { c: 0, gear: 24, stall: 14, minder: 4, best: 8 },
      { c: 1, gear: 21, stall: 12, minder: 4, best: 8 },
      { c: 2, gear: 14, stall: 9, minder: 3, best: 6 },
      { c: 3, gear: 11, stall: 5, minder: 2, best: 6 },
      { c: 4, gear: 3, stall: 2, minder: 1, best: 4 },
    ],
    shutters: [6, 8, 6, 6],
    goods: [[0, g8(4, 1)], [1, g8(4, 2)], [8, g8(4, 3)], [14, g8(3, 3)], [15, g8(3, 4)], [16, g8(2, 4)], [17, g8(2, 3)], [22, g8(1, 6)], [23, g8(0, 6)], [29, g8(4, 2)]],
    counters: [[line(4, 3)], [line(3, 5), line(2, 5)], [line(0, 7)], [line(1, 7), line(4, 4)]],
    lanterns: [1, 2, 3, 4, 5, 6, 14],
    feats: { tickets: 410, merges: 2600, parades: 14 },
    festivalFilled: [0, 1, 2],
  });
  return { fresh, minute3, minute10, festivalNear };
}

/**
 * What a reachable state keeps, as a list of broken invariants ([] = valid): 56 cells; open cells
 * and shutters as `shuttersOpened` says; goods of open chains only, at tiers 1 to 8, never above
 * best; the Ladder Book holds every tier up to each best; counters as the lit lanterns allow;
 * every unfilled ticket line inside bound (a) (k ≤ min(8, best + 1)) and (d1) (k ≥ b + 1) unless the
 * ticket is scripted; at most one gold ticket; shelves within their cap; no Pocket field (M5).
 * With `afterPlay` the draw-time bound (d1) is not checked (a gear level bought after the draw may
 * lift the base tier under a waiting line, which is a reachable state). A check for fixtures and
 * tests, not a rule: the rules packages add invariants as they build them.
 */
export function fixtureProblems(cfg: R.MergeConfig, g: R.MergeGame, opts: { afterPlay?: boolean } = {}): string[] {
  const out: string[] = [];
  const m = g.merge;
  const mc = cfg.merge;
  if (m.board.length !== R.BOARD_CELLS) out.push(`board has ${m.board.length} cells`);
  mc.board.shutterGroups.forEach((grp, i) => {
    grp.cells.forEach((cell, n) => {
      const shut = m.board[cell] === 'shutter';
      if (n < m.shuttersOpened[i] && shut) out.push(`shutter ${cell} of group ${i} is counted open but shut`);
      if (n >= m.shuttersOpened[i] && !shut) out.push(`cell ${cell} of group ${i} is open but not counted`);
    });
  });
  m.board.forEach((cell, i) => {
    if (!R.isGood(cell)) return;
    const ch = m.chains[cell.c];
    if (!ch?.open) out.push(`cell ${i}: a good of closed chain ${cell.c}`);
    if (cell.k < 1 || cell.k > 8) out.push(`cell ${i}: tier ${cell.k}`);
    if (ch && cell.k > ch.best) out.push(`cell ${i}: tier ${cell.k} above best ${ch.best} of chain ${cell.c}`);
  });
  m.chains.forEach((ch, c) => {
    for (let k = 1; k <= ch.best; k++) if (!m.book[c][k - 1]) out.push(`book misses chain ${c} tier ${k} (best ${ch.best})`);
    if (ch.shelf.length > (m.lanterns.includes(3) ? 8 : mc.gear.shelf)) out.push(`chain ${c}: shelf of ${ch.shelf.length}`);
    if (!ch.open && (ch.best !== 0 || ch.shelf.length)) out.push(`closed chain ${c} has a best tier or a shelf`);
  });
  const counters = m.lanterns.includes(4) ? 4 : m.lanterns.includes(1) ? 3 : mc.tickets.counters;
  if (m.counters.length !== counters) out.push(`${m.counters.length} counters, lanterns allow ${counters}`);
  let gold = 0;
  m.counters.forEach((ctr, j) => {
    const t = ctr.ticket;
    if (!t) return;
    if (t.gold) gold++;
    if (t.lines.length < 1 || t.lines.length > 3) out.push(`counter ${j}: ${t.lines.length} lines`);
    for (const l of t.lines) {
      if (l.filled) continue;
      const ch = m.chains[l.c];
      if (!ch?.open) out.push(`counter ${j}: a line of closed chain ${l.c}`);
      else if (l.k > Math.min(8, ch.best + 1)) out.push(`counter ${j}: line (${l.c}, ${l.k}) breaks (a), best ${ch.best}`);
      // (d1) holds at the draw; a gear level bought later may lift the base under a waiting line, so after play it is not an invariant.
      else if (!opts.afterPlay && !t.scripted && l.k < baseOf(cfg, ch.gear) + 1) out.push(`counter ${j}: line (${l.c}, ${l.k}) breaks (d1)`);
    }
  });
  if (gold > 1) out.push(`${gold} gold tickets out`);
  // The clocks a running state keeps (the tick's queue never stalls on them).
  const clock = g.stats.playSeconds ?? 0;
  m.chains.forEach((ch, c) => {
    if (!ch.open) return;
    if (ch.shelf.length && ch.releaseAt === null && ch.blockedAt === null) out.push(`chain ${c}: a shelf with no release and no block`);
    if (ch.waiting && ch.shelf.length < (m.lanterns.includes(3) ? 8 : mc.gear.shelf)) out.push(`chain ${c}: waiting with room on its shelf`);
    if (![ch.nextPopAt, ch.nextSaleAt].every(Number.isFinite)) out.push(`chain ${c}: a clock that is not a number`);
    if (ch.gear < 1 || ch.gear > mc.costs.gearMaxLevel) out.push(`chain ${c}: gear level ${ch.gear}`);
  });
  m.counters.forEach((ctr, j) => {
    if (!ctr.ticket && ctr.refillAt === null && ctr.blockedAt === null && !(m.script !== 'done' && j === 1)) out.push(`counter ${j}: empty with no draw coming`);
  });
  const ids = m.counters.flatMap((ctr) => (ctr.ticket ? [ctr.ticket.id] : []));
  if (new Set(ids).size !== ids.length) out.push('two tickets share an id');
  if (ids.some((x) => x >= m.nextTicketId)) out.push('a ticket id at or above nextTicketId');
  if (m.basketUndo && m.board[m.basketUndo.cell] !== null) out.push('the undo chip reserves a cell that is not empty');
  if (m.gift.pendingGoods.length && m.gift.nextAt === null && m.gift.blockedAt === null) out.push('pending gift goods with no placement coming');
  if (!Number.isFinite(g.cash) || g.cash < 0) out.push(`cash ${g.cash}`);
  if (m.tillAt <= clock - mc.minders.tillRoll) out.push('the till roll is more than a minute late');
  if ('pocket' in (m as unknown as Record<string, unknown>)) out.push('a Pocket field (cut by Decision M5)');
  return out;
}

// ------------------------------------------------------------------------- the drop table of 2.5

/** One row of 2.5's drop table as a situation: a state, the dragged (or armed) cell, the target's code, what must happen. */
export interface DropRow {
  name: string;
  game: R.MergeGame;
  from: number;
  /** The hit test's number for the target (types.ts TargetCode), as the drag and the tap-tap both hand it over. */
  code: R.TargetCode;
  kind: R.DropResult['kind'];
  reason?: Extract<R.DropResult, { kind: 'return' }>['reason'];
}

/**
 * Every row of the drop table of 2.5 (without the Pocket, M5) as a situation, for
 * src/engine/merge/drop.test.ts (the drag: the hit test's code into `dropAt`) and
 * src/modes/merge/wiring.test.ts (the tap-tap: arm a cell, tap a target, the store's `dropAt`).
 * A second finger cancels the drag in the screens: no drop happens, so it has no row here.
 */
export function dropRows(cfg: R.MergeConfig): DropRow[] {
  const c = R.cellAt;
  const base = (extra: Partial<MergeDesc> = {}) =>
    mergeState(cfg, {
      clock: 200,
      cash: 1000,
      chains: [{ c: 0, gear: 3, best: 8 }, { c: 1, gear: 1, best: 4 }],
      goods: [
        [c(2, 0), 0, 1],
        [c(2, 1), 0, 1],
        [c(2, 2), 0, 2],
        [c(2, 3), 1, 3],
        [c(3, 0), 0, 8],
        [c(3, 1), 0, 8],
        [c(3, 2), 0, 4],
      ],
      counters: [[[0, 2], [0, 4]], [[1, 4]]],
      festivalFilled: [],
      ...extra,
    });
  const g = base();
  const fest = g.merge.festival.lines[0];
  const withFestGood = base({ goods: [[c(4, 4), fest.c, fest.k], [c(2, 0), 0, 1]] });
  const withBlock = { ...g, merge: { ...g.merge, board: g.merge.board.map((x, i) => (i === c(5, 5) ? ('block' as const) : x)) } };
  const reserved = { ...g, merge: { ...g.merge, board: g.merge.board.map((x, i) => (i === c(5, 0) ? null : x)), basketUndo: { cell: c(5, 0), good: { c: 0, k: 1 }, refund: 1, until: 203 } } };
  return [
    { name: 'an identical good below tier 8: merge', game: g, from: c(2, 0), code: c(2, 1), kind: 'merge' },
    { name: 'an empty open cell: move', game: g, from: c(2, 0), code: c(4, 0), kind: 'move' },
    { name: 'a different good: swap', game: g, from: c(2, 0), code: c(2, 3), kind: 'swap' },
    { name: 'a ticket with an unfilled line of exactly (c, k): the line fills', game: g, from: c(2, 2), code: R.TARGET_COUNTER, kind: 'lineFill' },
    { name: 'a ticket with no matching line: the ticket shakes', game: g, from: c(2, 0), code: R.TARGET_COUNTER + 1, kind: 'ticketShake' },
    { name: 'the Festival banner with an unfilled line of exactly (c, k): the line fills', game: withFestGood, from: c(4, 4), code: R.TARGET_FESTIVAL, kind: 'festivalFill' },
    { name: 'the Festival banner with no matching line: returns', game: g, from: c(2, 0), code: R.TARGET_FESTIVAL, kind: 'return', reason: 'noLine' },
    { name: 'the Basket: sold, an undo chip', game: g, from: c(2, 0), code: R.TARGET_BASKET, kind: 'basket' },
    { name: 'a tier 8 on a tier 8: returns', game: g, from: c(3, 0), code: c(3, 1), kind: 'return', reason: 'tierMax' },
    { name: 'a shutter: returns', game: g, from: c(2, 0), code: c(7, 0), kind: 'return', reason: 'closedCell' },
    { name: 'a block: returns', game: withBlock, from: c(2, 0), code: c(5, 5), kind: 'return', reason: 'closedCell' },
    { name: 'the cell an undo chip reserves: returns', game: reserved, from: c(2, 0), code: c(5, 0), kind: 'return', reason: 'reserved' },
    { name: 'the street background, a stall front, a bar or outside: returns', game: g, from: c(2, 0), code: R.TARGET_NONE, kind: 'return', reason: 'noTarget' },
    { name: 'an empty counter: returns', game: base({ counters: [[[0, 2]], null] }), from: c(2, 0), code: R.TARGET_COUNTER + 1, kind: 'return', reason: 'noTarget' },
    { name: 'its own cell: returns', game: g, from: c(2, 0), code: c(2, 0), kind: 'return', reason: 'sameCell' },
    { name: 'from an empty cell: returns', game: g, from: c(4, 0), code: c(2, 0), kind: 'return', reason: 'noGood' },
  ];
}

// ------------------------------------------------------------------------- a scripted player for long runs

/** A small deterministic PRNG for tests and previews (never the rules' streams). */
export function testPrng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * One action of a simple player (not the balance bot): with `pick` (a number in [0, 1) from the
 * caller's PRNG) it tries, in a mix, a delivery of a good some line wants, the lowest merge, any
 * purchase or button of 2.5, a Basket sale (and sometimes its undo), "Not tonight", a rewarded
 * ad's reward, a gift box, the season close. Every call goes through the rules' public index, so a
 * long run of it exercises every path by which cash and the board change. Returns the new game
 * (the same object when the chosen action was refused).
 */
export function playOnce(cfg: R.MergeConfig, g: R.MergeGame, pick: number, events?: R.MergeEvent[], opts: { close?: (g: R.MergeGame) => R.MergeGame } = {}): R.MergeGame {
  const m = g.merge;
  const cells = m.board.map((x, i) => [i, x] as const).filter(([, x]) => R.isGood(x)) as [number, R.Good][];
  const r = pick;
  const nth = <T,>(xs: readonly T[], u: number) => xs[Math.min(xs.length - 1, Math.floor(u * xs.length))];
  const u = (r * 997) % 1;
  if (r < 0.45) {
    // Deliver first, then merge the lowest pair.
    for (const [i] of cells) {
      const t = R.targetsFor(cfg, g, i).find((code) => code >= R.TARGET_COUNTER);
      if (t !== undefined) return R.dropAt(cfg, g, i, R.decodeTarget(t), events).game;
    }
    let best: [number, number, number] | null = null;
    for (const [i, x] of cells) {
      const t = R.targetsFor(cfg, g, i).find((code) => code < R.BOARD_CELLS);
      if (t !== undefined && (!best || x.k < best[2])) best = [i, t, x.k];
    }
    if (best) return R.dropAt(cfg, g, best[0], { kind: 'cell', cell: best[1] }, events).game;
    return g;
  }
  if (r < 0.7) {
    const c = Math.floor(u * R.CHAINS);
    const buys = [R.levelGear, R.levelStall, R.hireMinder, R.levelMinder, R.openStall];
    const f = nth(buys, (u * 31) % 1);
    const x = f(cfg, g, c, events);
    return x !== g ? x : R.openShutter(cfg, g, Math.floor(((u * 7) % 1) * 4), events);
  }
  if (r < 0.76 && cells.length) {
    const [i] = nth(cells, u);
    const sold = R.dropAt(cfg, g, i, { kind: 'basket' }, events).game;
    return u < 0.3 ? R.undoBasket(cfg, sold, events) : sold;
  }
  if (r < 0.8 && cells.length > 1) {
    const [a] = nth(cells, u);
    const [b] = nth(cells, (u * 13) % 1);
    return R.dropAt(cfg, g, a, { kind: 'cell', cell: b }, events).game;
  }
  if (r < 0.83) return R.notTonight(cfg, g, Math.floor(u * m.counters.length), events);
  if (r < 0.86) {
    const kind = nth(['fillLine', 'gearRush', 'callDragon'] as const, u);
    return R.grantAd(cfg, g, kind, undefined, events);
  }
  if (r < 0.9) return R.openGiftBox(cfg, g, events);
  if (r < 0.92 && opts.close && R.canCloseSeason(cfg, g)) return opts.close(g);
  if (r < 0.95) {
    // An empty cell move (the board's own moves).
    const empty = R.freeCells(m);
    if (cells.length && empty.length) return R.dropAt(cfg, g, nth(cells, u)[0], { kind: 'cell', cell: nth(empty, (u * 3) % 1) }, events).game;
  }
  return g;
}
