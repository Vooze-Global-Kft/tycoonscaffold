/**
 * Merge states for tests, screens, the dev presets and the bot (spec 8.1 step 5: "screens build
 * against typed interfaces and fixtures with no number of their own"). Hand-made on top of the
 * rules' own fresh state, every one checked by `fixtureProblems` (the invariants a reachable state
 * keeps: cells and shutters, best tiers and the Ladder Book, ticket lines inside (a) and (d1),
 * counters and lanterns, shelves): src/engine/mergeMode.test.ts runs it on all of them.
 * - `fresh`: a new game at 0:00 (2.7's scripted start: 4 Pepper Skewers, the fox's ticket).
 * - `minute3`: about 3:00 in: Grill and Tea open, 2 shutters opened, lantern 1 lit (3 counters).
 * - `minute10`: about 10:00 in: three stalls, two minders, 38 cells, a Parade ticket out, a gift box waiting.
 * - `festivalNear`: about 2:40 in: five stalls, every shutter open, 4 counters, 3 of 4 Festival lines filled.
 *
 * The config is the specification's starting content (src/config/schema.merge.ts) on the frozen
 * shared fixture `base-game.json`; it never reads the shipped game.json. Web only like the haul
 * fixtures (scripts/lib/modes.js WEB_ONLY): the presets reach it, phones never do.
 *
 * Written by the skeleton; owned afterwards by the rules package MECHANICS (the numbers package may
 * add bot-played states beside these).
 */
import { GameConfigSchema } from '../../config/schema';
import { MERGE_STARTING_CONTENT, MergeSchema, type MergeContentInput } from '../../config/schema.merge';
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

interface Shape {
  clock: number;
  cash: number;
  chains: { c: number; gear: number; stall: number; minder: number; best: number; shelf?: number[] }[];
  /** Shutters opened per group. */
  shutters: number[];
  goods: [number, R.Good][];
  counters: (R.TicketLine[] | null)[];
  /** Index of the counter holding the Parade's gold ticket, if any. */
  gold?: number;
  lanterns: number[];
  feats: Partial<R.Feats>;
  festivalFilled?: number[];
  giftBoxes?: R.GiftBox[];
  ticketsToBox?: number;
}

function build(cfg: R.MergeConfig, s: Shape): R.MergeGame {
  const g0 = freshState(cfg);
  const m0 = g0.merge;
  const board = m0.board.map((c) => (c === 'shutter' ? 'shutter' : null)) as R.Cell[];
  cfg.merge.board.shutterGroups.forEach((grp, i) => grp.cells.slice(0, s.shutters[i]).forEach((cell) => (board[cell] = null)));
  for (const [cell, good] of s.goods) board[cell] = good;
  const chains = m0.chains.map((ch, c) => {
    const spec = s.chains.find((x) => x.c === c);
    if (!spec) return ch;
    return { ...ch, open: true, gear: spec.gear, stall: spec.stall, minder: spec.minder, best: spec.best, shelf: spec.shelf ?? [], nextPopAt: s.clock + 2, nextSaleAt: s.clock + 7, releaseAt: spec.shelf?.length ? s.clock + 0.5 : null };
  });
  const book = m0.book.map((row, c) => row.map((_, k) => k + 1 <= chains[c].best));
  let id = 1;
  const counters: R.Counter[] = s.counters.map((lines, j) => ({
    ticket: lines ? { id: id++, lines, gold: s.gold === j, customer: j % cfg.merge.tickets.customers.length, coat: j % cfg.merge.tickets.coats } : null,
    refillAt: lines ? null : s.clock + 2,
    blockedAt: null,
    notTonightAt: s.clock,
  }));
  const festival = { lines: m0.festival.lines.map((l, i) => ({ ...l, filled: !!s.festivalFilled?.includes(i) })), filledAt: null };
  const merge: R.MergeState = {
    ...m0,
    board,
    shuttersOpened: s.shutters.slice(),
    chains,
    counters,
    nextTicketId: id,
    script: 'done',
    festival,
    paradeAt: s.gold !== undefined ? cfg.merge.parade.first : s.clock + 120,
    gift: { ...m0.gift, boxes: s.giftBoxes ?? [], ticketsToBox: s.ticketsToBox ?? m0.gift.ticketsToBox },
    book,
    lanterns: s.lanterns.slice(),
    feats: { ...m0.feats, ...s.feats },
    tillAt: Math.ceil((s.clock + 1) / 60) * 60,
    ads: { fillLine: s.clock, gearRush: s.clock },
    recent: { at: Math.floor(s.clock / 5), coins: m0.recent.coins.slice() },
    freedAt: s.clock,
    changedAt: s.clock,
  };
  return { ...g0, cash: s.cash, runEarnings: s.cash * 3, lifetimeEarnings: s.cash * 3, stats: { ...g0.stats, playSeconds: s.clock }, merge };
}

const line = (c: number, k: number, filled = false): R.TicketLine => ({ c, k, filled });

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
 * A check for fixtures and tests, not a rule: the rules packages add invariants as they build them.
 */
export function fixtureProblems(cfg: R.MergeConfig, g: R.MergeGame): string[] {
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
      else if (!t.scripted && l.k < baseOf(cfg, ch.gear) + 1) out.push(`counter ${j}: line (${l.c}, ${l.k}) breaks (d1)`);
    }
  });
  if (gold > 1) out.push(`${gold} gold tickets out`);
  if ('pocket' in (m as unknown as Record<string, unknown>)) out.push('a Pocket field (cut by Decision M5)');
  return out;
}
