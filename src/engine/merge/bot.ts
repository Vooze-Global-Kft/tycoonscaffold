/**
 * The balance bot of the merge mode (Night Market; docs/design/market-design.md section 8 with the
 * lead's decisions M2, M3, M6, M22 to M27): the bots of 8.2 playing the real rules through the same
 * functions a screen calls, the trace of everything a gate reads, and the measurement of every gate
 * of 8.3 as a pure function over a trace.
 *
 * Used by `scripts/content/merge-bot.ts` (the command line), `scripts/content/build-night.py` (the
 * tuner, through `--json`), the merge branch of `scripts/validate.ts`, and the web presets
 * (`src/modes/merge/presets.web.ts`, which play the active bot to a moment and keep its state).
 * No Node import, no clock, no Math.random: web only (scripts/lib/modes.js WEB_ONLY).
 *
 * The one rule of this file: the bot acts ONLY through the public interface a screen calls
 * (src/engine/merge.ts): `dropAt` with targets (a merge is a drop on an identical good, a delivery a
 * drop on a counter or the Festival banner, a sale a drop on the Basket), the purchases, the buttons
 * (`notTonight`, `undoBasket`, `openGiftBox`, `closeSeason`, `canWatchAd`/`grantAd`) and, between its
 * actions, `advanceMerge`. It sees only what the screen shows: the board, the tickets, the Festival,
 * the prices of `mergeParams`, and what `advice` names; never the shelves or the pending gift goods
 * (it cannot drag them). It reads state only to decide and to measure; it never writes state except
 * the shared fields a closed app changes (the save time and the clock guard, for time away), and the
 * away coins, which the shared store grants (`E.grantCash`) and the bot books with `commitCash`
 * under 'away' (the build plan's note on gate 8).
 *
 * How the active bot plays (the prototype's `Bot.active_step`, ported line by line; 8.2): one action
 * per `act` s (1.5 by default; the lead wants every conclusion at 1.5 and at 2.5), `sheet` s after an
 * action that opens a sheet (a purchase, a gift box, Not tonight, the season close). Each slot it
 * does the first of:
 *   0. close the season if the Festival is filled (the box hoarder opens its boxes first);
 *   1. deliver a board good that matches an open line: the Festival first, then a line that completes
 *      its ticket, then a gold ticket, then the highest tier;
 *   (habit "notTonight": send off a ticket with no filled line that the board cannot finish);
 *   2. buy what `advice` names, if affordable;
 *   (habit "sellBuyUndo": sell a spare good to reach the advised price, buy, then try the undo);
 *   3. open a gift box;
 *   4. merge the lowest pair among the board goods allocated (greedy, highest tier first) to the open
 *      line nearest completion: tickets ordered by missing pops, then the Festival lines;
 *   5. merge the lowest pair on the board (ties: the higher chain);
 *   6. only with no free cell and no pair: sell in the Basket an unwanted tier 8 (M22), else the
 *      lowest-value good no line wants.
 * Lazy: delivers, buys the cheapest affordable thing, opens boxes, merges the lowest pair. Deliver-
 * only (M26: started from the active bot's state at minute 3): delivers, buys by advice, opens boxes,
 * never merges. Passive: 5 sessions a day of 8 minutes with the active policy, the away ad taken.
 * Check-in: every 4 h, collects (no ad), buys by advice for 2 minutes, never drags. Idle: nothing.
 *
 * Time: the bot steps the game from action to action with one `advanceMerge` per slot (event to
 * event inside it), splitting only where it must see a state: just before and at each counter's
 * refill (so every draw is checked against the board it was drawn on), and at the marks it keeps.
 * `hz: 10` cuts every step to 0.1 s instead (gate 14 compares the two).
 *
 * Owned by the numbers and bot package (docs/design/market-build-plan.md).
 */
import * as R from '../merge';

// ============================================================================================
// options and the trace
// ============================================================================================

export type BotKind = 'active' | 'lazy' | 'deliver' | 'passive' | 'checkin' | 'idle';

/** The four adversarial habits of 8.2, switches on the active bot (M6). */
export interface BotHabits {
  /** "Not tonight" whenever ready, on a ticket with no filled line the board cannot finish. */
  notTonight?: boolean;
  /** Gift boxes hoarded until just before the season close. */
  hoardBoxes?: boolean;
  /** Sell a spare good in the Basket to reach the advised price, buy, then try the undo. */
  sellBuyUndo?: boolean;
  /** The device clock moved 15 min forward before every ad, and 4 h forward, back and forward again once an hour. */
  clockJumps?: boolean;
}

export interface BotOptions {
  kind?: BotKind;
  /** The shared seed of the new game (the rules derive their own from it). */
  seed?: number;
  /** Play hours to run (active, lazy, deliver, idle), counted on the game clock. */
  hours?: number;
  /** Days of the passive and check-in bots (wall clock). */
  days?: number;
  /** Seconds per action (M30: 2.0 is the reference, 1.5 and 2.5 beside it), and after an action that opens a sheet (default act + 1). */
  act?: number;
  sheet?: number;
  /** Stop once this many seasons are closed (active and passive). */
  seasons?: number;
  habits?: BotHabits;
  /** A state to start from (the deliver-only bot starts from the active bot's minute 3, M26). */
  start?: R.MergeGame;
  /** The wall clock (ms) of the start; a fixed epoch by default. */
  wall0?: number;
  /** Game-clock seconds at which to keep the state (`run.states`). */
  keepAt?: number[];
  /** Game-clock seconds at which to measure 1 h away with the ad (gate 9), with and without Late Hours. */
  awayAt?: number[];
  /** Time away measured at each `awayAt` (s; 3600 by default). */
  awaySeconds?: number;
  /** 0: one advance per action (event to event inside it); 10: steps of 0.1 s (gate 14). */
  hz?: number;
  /** The shared fresh state to build on (the app's createInitialState); the rules' own shape by default. */
  base?: (cfg: R.MergeConfig, seed: number, wall: number) => R.MergeGame;
  /** Called after every action and step (the web presets stop at a moment). Return true to stop. */
  stop?: (g: R.MergeGame) => boolean;
}

export interface TicketRecord {
  id: number;
  season: number;
  counter: number;
  lines: { c: number; k: number }[];
  gold: boolean;
  scripted: boolean;
  /** Game clock of the draw and of the payment (null while open or sent off). */
  drawn: number;
  filled: number | null;
  /** The price shown at the draw, the highest shown since, the last shown before payment, the coins paid. */
  shown: number;
  maxShown: number;
  lastShown: number;
  paid: number | null;
  /** A Basket sale happened while this ticket was open (gate 4's "needed a Basket sale", as the prototype counts it). */
  basket: boolean;
  /** Sent off with Not tonight. */
  sentOff: boolean;
  /** Bounds of 2.7 this draw broke on the state it was drawn on, by ORDERS's own `checkBounds` ('a', 'b', 'bH', 'c', 'd'), and 'priceFell'. */
  broken: string[];
  /** The same bounds as the bot reads the text itself (`drawBreaks`): a second opinion, reported, never a gate. */
  ownReading: string[];
}

export interface CoinEntry {
  t: number;
  source: R.CoinSource | 'unbooked';
  amount: number;
}

/** Per step of the run, the state at its start held for `dt` seconds (gates 4 and 5). */
export interface Samples {
  t: number[];
  dt: number[];
  /** Bit 0: F = 0; bit 1: deadlock (F = 0, no merge, no delivery); bits 2 + c: chain c's gear waits; bits 8 + c: c is one of the two highest open chains. */
  f: number[];
  /** Counters, and counters showing "Setting up…". */
  n: number[];
  su: number[];
}

export interface AwayProbe {
  /** Game clock of the probe, Late Hours or not. */
  t: number;
  late: boolean;
  seconds: number;
  /** Earnings with the away ad (× 1 + awayBonus), as the shared store grants them. */
  earnings: number;
  /** Gate 9's cross-check: the closed form against stepping the same time with no player. */
  cross: { ok: boolean; compared: string[]; detail: string[] };
}

export interface SeasonRecord {
  season: number;
  start: number;
  /** Season-clock seconds of each stall's opening (index = chain). */
  stalls: (number | null)[];
  festival: number | null;
  closed: number | null;
}

export interface Trace {
  kind: BotKind;
  seed: number;
  act: number;
  sheet: number;
  habits: BotHabits;
  /** Game clock at the start and at the end. */
  t0: number;
  t1: number;
  /** Each action slot of minutes 0 to 11: its time and whether a useful action was available (M3). */
  slots: { t: number; useful: boolean }[];
  /** Every action taken: its time and what. */
  actions: { t: number; what: string }[];
  purchases: { t: number; kind: string; c: number; cost: number; season: number }[];
  tickets: TicketRecord[];
  coins: CoinEntry[];
  samples: Samples;
  /** Something new (3.3's definition), and first-time tiers of a season. */
  novelty: { t: number; what: string }[];
  firstTiers: { t: number; c: number; k: number; season: number }[];
  seasons: SeasonRecord[];
  lanterns: { t: number; n: number }[];
  gifts: { earned: number[]; opened: number[]; slots: { coins: number; good: number; spark: number } };
  /** Odds of gate 13: observed against expected. */
  odds: { merges: number; luckies: number; luckyExpected: number; drops: number; ripe: number; ripeExpected: number };
  goodsMade: number;
  basketSales: number;
  notTonights: number;
  setups: number;
  away: AwayProbe[];
  /** Passive and check-in: the sessions (day, game clock at their start and end). */
  sessions: { day: number; t0: number; t1: number }[];
  /** Passive: seconds an advised purchase was affordable and not bought, and session seconds. */
  affordableUnbought: number;
  sessionSeconds: number;
  /** A refused action the bot expected to work (a sign the bot and the rules disagree). */
  refused: { t: number; what: string }[];
  /** The clock-jump habit: coins paid by the returns after the first of each forward-back-forward cycle (must be 0), and the ads granted. */
  jumps: { cycles: number; repaid: number; grants: Record<string, number> };
}

export interface BotRun {
  trace: Trace;
  game: R.MergeGame;
  /** States kept at `keepAt` (game clock → state). */
  states: Record<number, R.MergeGame>;
}

// ============================================================================================
// the public interface, with the two optional seams (requests.md)
// ============================================================================================

/** M19's one rounding rule, the function the screens print with. */
export const roundCoins = R.roundCoins;
const PURCHASES: readonly R.AdviceKind[] = ['gear', 'stall', 'minderHire', 'minderLevel', 'openStall', 'shutter'];
/** What the goal line names (`advice`, 2.10), split: the purchase it names, or the other goal (M31's Festival good, M33's Basket). */
export function goalLine(cfg: R.MergeConfig, g: R.MergeGame): { purchase: R.Advice | null; other: R.Advice | null } {
  const a = R.advice(cfg, g);
  if (!a) return { purchase: null, other: null };
  return PURCHASES.includes(a.kind) ? { purchase: a, other: null } : { purchase: null, other: a };
}
/** The purchase the goal line names (the bot "buys by advice()"), or null. */
export function advisedPurchase(cfg: R.MergeConfig, g: R.MergeGame): R.Advice | null {
  return goalLine(cfg, g).purchase;
}

/** A fixed epoch (23 Nov 2026, 12:00 UTC) so a run is the same on every machine. */
export const BOT_EPOCH = 1795435200000;

/** The shared fresh state the bot plays (as economy.createInitialState gives it, without importing economy). */
export function botBaseGame(cfg: R.MergeConfig, seed: number, wall: number): R.MergeGame {
  const base = {
    version: 2,
    cash: cfg.economy?.startingCash ?? 0,
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
    stats: { taps: 0, adsWatched: 0, playSeconds: 0, firstOpenAt: wall, served: 0, levelsBought: 0, hires: 0, chestsOpened: 0, bonusCaught: 0, rushes: 0, sessions: 0, venuesEver: 1, clockHigh: wall },
    lastSavedAt: wall,
  } as unknown as R.MergeGame;
  return R.withMergeFields(cfg, base);
}

// ============================================================================================
// what the bot sees: the board
// ============================================================================================

/** The board's goods: counts cnt[c][k] and their cells (ascending), k 1 to 8 (index 0 unused). */
export interface BoardView {
  cnt: number[][];
  cells: number[][][];
}

export function boardView(m: Pick<R.MergeState, 'board'>): BoardView {
  const cnt = Array.from({ length: R.CHAINS }, () => Array.from({ length: R.TIERS + 1 }, () => 0));
  const cells = Array.from({ length: R.CHAINS }, () => Array.from({ length: R.TIERS + 1 }, () => [] as number[]));
  m.board.forEach((cell, i) => {
    if (cell && typeof cell === 'object' && cell.c >= 0 && cell.c < R.CHAINS && cell.k >= 1 && cell.k <= R.TIERS) {
      cnt[cell.c][cell.k]++;
      cells[cell.c][cell.k].push(i);
    }
  });
  return { cnt, cells };
}

export function anyMerge(v: BoardView): boolean {
  for (let c = 0; c < R.CHAINS; c++) for (let k = 1; k < R.TIERS; k++) if (v.cnt[c][k] >= 2) return true;
  return false;
}

/** Lines the bot can see: each counter's unfilled lines, and the Festival's (open chains only). */
interface OpenLine {
  where: 'counter' | 'festival';
  i: number;
  li: number;
  c: number;
  k: number;
}

function ticketLines(m: R.MergeState): { i: number; t: R.Ticket; lines: { c: number; k: number; li: number }[] }[] {
  const out: { i: number; t: R.Ticket; lines: { c: number; k: number; li: number }[] }[] = [];
  m.counters.forEach((ct, i) => {
    if (!ct.ticket) return;
    const lines = ct.ticket.lines.map((l, li) => ({ c: l.c, k: l.k, li, filled: l.filled })).filter((l) => !l.filled);
    if (lines.length) out.push({ i, t: ct.ticket, lines });
  });
  return out;
}

export function deliveries(m: R.MergeState, v: BoardView): OpenLine[] {
  const out: OpenLine[] = [];
  for (const { i, lines } of ticketLines(m)) for (const l of lines) if (v.cnt[l.c][l.k] > 0) out.push({ where: 'counter', i, li: l.li, c: l.c, k: l.k });
  m.festival.lines.forEach((l, li) => {
    if (!l.filled && v.cnt[l.c]?.[l.k] > 0) out.push({ where: 'festival', i: -1, li, c: l.c, k: l.k });
  });
  return out;
}

/** The prototype's `choose_delivery`: the Festival first, then a line that completes its ticket, then gold, then the highest tier. */
export function chooseDelivery(m: R.MergeState, v: BoardView): OpenLine | null {
  const dl = deliveries(m, v);
  if (!dl.length) return null;
  const key = (d: OpenLine): number[] => {
    if (d.where === 'festival') return [-1, 0, 0];
    const t = m.counters[d.i].ticket as R.Ticket;
    const left = t.lines.filter((x) => !x.filled).length;
    return [left === 1 ? 0 : 1, t.gold ? -1 : 0, -d.k];
  };
  let best = dl[0];
  let bk = key(best);
  for (const d of dl.slice(1)) {
    const k = key(d);
    if (k[0] < bk[0] || (k[0] === bk[0] && (k[1] < bk[1] || (k[1] === bk[1] && k[2] < bk[2])))) {
      best = d;
      bk = k;
    }
  }
  return best;
}

/** Joint greedy allocation of board goods to lines, in order: each line takes its chain's goods of tier ≤ k, highest first, while they fit (the prototype's `allocation`). */
export function allocation(cnt: number[][], lines: readonly { c: number; k: number }[], base: readonly number[]): { alloc: Map<number, number>; pops: number }[] {
  const g = cnt.map((row) => row.slice());
  return lines.map(({ c, k }) => {
    let need = 2 ** (k - 1);
    const alloc = new Map<number, number>();
    for (let j = k; j >= 1 && need > 0; j--) {
      const u = 2 ** (j - 1);
      const take = Math.min(g[c][j], Math.floor(need / u));
      if (take > 0) {
        g[c][j] -= take;
        need -= take * u;
        alloc.set(j, take);
      }
    }
    const b = Math.max(1, base[c] ?? 1);
    return { alloc, pops: Math.ceil(need / 2 ** (b - 1)) };
  });
}

const byTierDesc = <T extends { k: number }>(xs: T[]) => xs.slice().sort((a, b) => b.k - a.k);

/** Tickets with unfilled lines, nearest completion first (missing pops, gold first, counter). */
function ticketOrder(m: R.MergeState, v: BoardView, base: readonly number[]): { c: number; k: number }[][] {
  const rows = ticketLines(m).map(({ i, t, lines }) => {
    const ls = byTierDesc(lines);
    const pops = allocation(v.cnt, ls, base).reduce((a, x) => a + x.pops, 0);
    return { pops, gold: t.gold ? -1 : 0, i, ls };
  });
  rows.sort((a, b) => a.pops - b.pops || a.gold - b.gold || a.i - b.i);
  return rows.map((r) => r.ls);
}

/** The lines the bot works toward, in order: the tickets nearest completion first, then the Festival; `festivalLine` (the goal line's Festival good, M31) first of all. */
function wantedSeq(m: R.MergeState, v: BoardView, base: readonly number[], festivalLine: number | null = null): { c: number; k: number }[] {
  const seq: { c: number; k: number }[] = [];
  const fl = festivalLine !== null ? m.festival.lines[festivalLine] : undefined;
  if (fl && !fl.filled && m.chains[fl.c]?.open) seq.push({ c: fl.c, k: fl.k });
  for (const ls of ticketOrder(m, v, base)) seq.push(...ls);
  m.festival.lines.forEach((l, i) => {
    if (!l.filled && m.chains[l.c]?.open && i !== festivalLine) seq.push({ c: l.c, k: l.k });
  });
  return seq;
}

/** The lowest pair on the path to the line nearest completion (tickets, then the Festival; the goal line's Festival good first when it names one, M31). */
export function pathMerge(m: R.MergeState, v: BoardView, base: readonly number[], festivalLine: number | null = null): { c: number; k: number } | null {
  const seq = wantedSeq(m, v, base, festivalLine);
  const al = allocation(v.cnt, seq, base);
  for (let i = 0; i < al.length; i++) {
    const pairs = [...al[i].alloc.entries()].filter(([j, n]) => n >= 2 && j < R.TIERS).map(([j]) => j).sort((a, b) => a - b);
    if (pairs.length) return { c: seq[i].c, k: pairs[0] };
  }
  return null;
}

/** The lowest pair on the board, ties to the higher chain. */
export function lowestPair(v: BoardView): { c: number; k: number } | null {
  let best: { c: number; k: number } | null = null;
  for (let c = 0; c < R.CHAINS; c++) {
    for (let k = 1; k < R.TIERS; k++) {
      if (v.cnt[c][k] >= 2) {
        if (!best || k < best.k || (k === best.k && c > best.c)) best = { c, k };
        break;
      }
    }
  }
  return best;
}

/** The good to sell (M22): an unwanted tier 8 first, then the lowest-value good no line wants; with none unwanted, the lowest value. */
export function basketChoice(m: R.MergeState, v: BoardView, base: readonly number[], values: readonly (readonly number[])[]): { c: number; k: number } | null {
  const used = new Map<number, number>();
  const seq = wantedSeq(m, v, base);
  allocation(v.cnt, seq, base).forEach((a, i) => {
    for (const [j, n] of a.alloc) used.set(seq[i].c * 16 + j, (used.get(seq[i].c * 16 + j) ?? 0) + n);
  });
  const pick = (spareOnly: boolean) => {
    let best: { c: number; k: number; key: number[] } | null = null;
    for (let c = 0; c < R.CHAINS; c++) {
      for (let k = 1; k <= R.TIERS; k++) {
        const have = v.cnt[c][k] - (spareOnly ? used.get(c * 16 + k) ?? 0 : 0);
        if (have <= 0) continue;
        const key = [k === R.TIERS ? 0 : 1, values[c]?.[k - 1] ?? 0];
        if (!best || key[0] < best.key[0] || (key[0] === best.key[0] && key[1] < best.key[1])) best = { c, k, key };
      }
    }
    return best ? { c: best.c, k: best.k } : null;
  };
  return pick(true) ?? pick(false);
}

// ============================================================================================
// the runner
// ============================================================================================

const EVENT_LIMIT = 1e-6;
/**
 * The bot acts just after every event due at its action time: it advances to t + ACT_AFTER, so an
 * event at exactly t (a drop every T s, a refill) has run in either stepping, whatever the float sums
 * of the clock (gate 14 compares event-to-event and 10 Hz runs).
 */
const ACT_AFTER = 1e-7;

export function emptyTrace(kind: BotKind, seed: number, act: number, sheet: number, habits: BotHabits, t0: number): Trace {
  return {
    kind,
    seed,
    act,
    sheet,
    habits,
    t0,
    t1: t0,
    slots: [],
    actions: [],
    purchases: [],
    tickets: [],
    coins: [],
    samples: { t: [], dt: [], f: [], n: [], su: [] },
    novelty: [],
    firstTiers: [],
    seasons: [],
    lanterns: [],
    gifts: { earned: [], opened: [], slots: { coins: 0, good: 0, spark: 0 } },
    odds: { merges: 0, luckies: 0, luckyExpected: 0, drops: 0, ripe: 0, ripeExpected: 0 },
    goodsMade: 0,
    basketSales: 0,
    notTonights: 0,
    setups: 0,
    away: [],
    sessions: [],
    affordableUnbought: 0,
    sessionSeconds: 0,
    refused: [],
    jumps: { cycles: 0, repaid: 0, grants: {} },
  };
}

const SOURCES: R.CoinSource[] = ['ticket', 'festival', 'gift', 'till', 'basket', 'away', 'undo', 'spend'];

/** One bot run's machinery: the game, the wall clock, the trace and the bookkeeping. */
class Runner {
  g: R.MergeGame;
  wall: number;
  readonly tr: Trace;
  readonly states: Record<number, R.MergeGame> = {};
  private readonly byId = new Map<number, TicketRecord>();
  private keep: number[];
  private awayAt: number[];
  private shutterGroupsSeen = new Set<number>();
  private festReach = new Set<string>();
  private hired = new Set<string>();
  sold = false;

  constructor(
    readonly cfg: R.MergeConfig,
    readonly o: Required<Pick<BotOptions, 'act' | 'sheet' | 'hz' | 'awaySeconds'>> & BotOptions,
    kind: BotKind,
    g: R.MergeGame,
    wall: number,
  ) {
    this.g = g;
    this.wall = wall;
    this.tr = emptyTrace(kind, o.seed ?? 12345, o.act, o.sheet, o.habits ?? {}, this.clock);
    this.keep = (o.keepAt ?? []).slice().sort((a, b) => a - b).filter((t) => t >= this.clock - EVENT_LIMIT);
    this.awayAt = (o.awayAt ?? []).slice().sort((a, b) => a - b).filter((t) => t >= this.clock - EVENT_LIMIT);
    g.merge.shuttersOpened.forEach((n, i) => n > 0 && this.shutterGroupsSeen.add(i));
    this.openSeason();
    // Tickets already out (the scripted fox, or a start state's): recorded as drawn now.
    for (const [i, ct] of g.merge.counters.entries()) if (ct.ticket) this.recordTicket(ct.ticket, i, g, null, this.clock);
  }

  get clock(): number {
    return this.g.stats.playSeconds;
  }
  get m(): R.MergeState {
    return this.g.merge;
  }

  private openSeason() {
    const m = this.m;
    this.tr.seasons.push({ season: m.season, start: m.seasonStartedAt, stalls: m.chains.map((ch, c) => (ch.open && c > 0 ? this.clock - m.seasonStartedAt : null)), festival: null, closed: null });
    this.festReach.clear();
    this.hired.clear();
  }
  private get season(): SeasonRecord {
    return this.tr.seasons[this.tr.seasons.length - 1];
  }

  /** `pre`: the state the draw saw (a step's start, split just before the refill; after an action, the action's result). */
  private recordTicket(t: R.Ticket, counter: number, post: R.MergeGame, pre: R.MergeGame | null, at: number) {
    if (this.byId.has(t.id)) return;
    const shown = roundCoins(this.cfg, R.ticketPrice(this.cfg, post, t));
    const rec: TicketRecord = {
      id: t.id,
      season: post.merge.season,
      counter,
      lines: t.lines.map((l) => ({ c: l.c, k: l.k })),
      gold: t.gold,
      scripted: !!t.scripted,
      drawn: at,
      filled: null,
      shown,
      maxShown: shown,
      lastShown: shown,
      paid: null,
      basket: false,
      sentOff: false,
      broken: pre ? orderBreaks(this.cfg, pre, counter, t) : [],
      ownReading: pre ? drawBreaks(this.cfg, pre, t) : [],
    };
    this.byId.set(t.id, rec);
    this.tr.tickets.push(rec);
  }

  /** Everything a step or an action changed: events, coins, best tiers, prices. */
  private account(pre: R.MergeGame, post: R.MergeGame, ev: R.MergeEvent[], at: number, preParams: R.MergeParams | null, drawnOn: R.MergeGame = pre) {
    const cfg = this.cfg;
    const tr = this.tr;
    const newSeason = post.merge.season !== pre.merge.season;
    for (const e of ev) {
      switch (e.type) {
        case 'drop':
        case 'shelved': {
          tr.odds.drops++;
          tr.goodsMade++;
          const ch = preParams?.chains[e.c];
          if (ch) {
            if (e.k > ch.base) tr.odds.ripe++;
            tr.odds.ripeExpected += ch.ripe;
          }
          break;
        }
        case 'ticketDrawn':
          this.recordTicket(e.ticket, e.counter, post, drawnOn, at);
          break;
        case 'settingUp':
          tr.setups++;
          break;
        case 'paradeArrive':
          tr.novelty.push({ t: at, what: 'parade' });
          break;
        case 'merge': {
          tr.odds.merges++;
          tr.goodsMade++;
          const from = e.made.k - (e.lucky ? 2 : 1) - (e.spark ? preParams?.mods.sparkTiers ?? 1 : 0);
          if (!e.spark && from >= 1 && from <= R.TIERS - 2) {
            tr.odds.luckyExpected += 1 / (preParams?.mods.luckyOdds ?? cfg.merge.merges.luckyOdds);
            if (e.lucky) tr.odds.luckies++;
          }
          break;
        }
        case 'ticketPaid': {
          const rec = this.byId.get(e.ticket.id);
          if (rec) {
            rec.filled = at;
            rec.paid = e.coins;
          }
          break;
        }
        case 'lanternLit': {
          tr.lanterns.push({ t: at, n: e.n });
          if (cfg.merge.lanterns.find((l) => l.n === e.n)?.isNew) tr.novelty.push({ t: at, what: `lantern${e.n}` });
          break;
        }
        case 'giftEarned':
          tr.gifts.earned.push(at);
          break;
        case 'giftOpened':
          tr.gifts.opened.push(at);
          for (const s of e.box.slots) tr.gifts.slots[s.kind === 'coins' ? 'coins' : s.kind === 'good' ? 'good' : 'spark']++;
          break;
        case 'stallOpen':
          tr.novelty.push({ t: at, what: `stall${e.c}` });
          break;
        case 'gearLevel':
          if (e.baseStep) tr.novelty.push({ t: at, what: `baseStep${e.c}` });
          break;
        case 'minderHire':
          tr.novelty.push({ t: at, what: `minder${e.c}` });
          break;
        case 'shutterOpen':
          if (!this.shutterGroupsSeen.has(e.group)) {
            this.shutterGroupsSeen.add(e.group);
            tr.novelty.push({ t: at, what: `shutterGroup${e.group}` });
          }
          break;
        case 'festivalLine':
          tr.novelty.push({ t: at, what: 'festivalLine' });
          break;
        case 'festivalDone':
          if (!newSeason) this.season.festival = at - pre.merge.seasonStartedAt;
          break;
        case 'basketSell':
          tr.basketSales++;
          for (const ct of pre.merge.counters) {
            const rec = ct.ticket ? this.byId.get(ct.ticket.id) : undefined;
            if (rec) rec.basket = true;
          }
          break;
        case 'notTonight': {
          tr.notTonights++;
          const t = pre.merge.counters[e.counter]?.ticket;
          const rec = t && this.byId.get(t.id);
          if (rec) rec.sentOff = true;
          break;
        }
        default:
          break;
      }
    }
    // Festival purse may arrive without a festivalDone event in an early body: filledAt is the truth.
    if (!newSeason && pre.merge.festival.filledAt === null && post.merge.festival.filledAt !== null && this.season.festival === null) this.season.festival = post.merge.festival.filledAt - post.merge.seasonStartedAt;
    // Coins: every change of cash must be booked under a source (gate 8).
    const a = pre.merge.mstats.coins;
    const b = post.merge.mstats.coins;
    let booked = 0;
    for (const s of SOURCES) {
      const d = (b[s] ?? 0) - (a[s] ?? 0);
      if (Math.abs(d) > 1e-9) {
        tr.coins.push({ t: at, source: s, amount: d });
        booked += d;
      }
    }
    if (!newSeason) {
      const diff = post.cash - pre.cash - booked;
      if (diff > 1e-6 * Math.max(1, Math.abs(post.cash))) tr.coins.push({ t: at, source: 'unbooked', amount: diff });
    }
    // First-time tiers of the season (best rose), stall openings, minders, Festival lines in reach.
    if (newSeason) {
      this.season.closed = at - pre.merge.seasonStartedAt;
      tr.novelty.push({ t: at, what: 'season' });
      this.openSeason();
    } else {
      post.merge.chains.forEach((ch, c) => {
        const was = pre.merge.chains[c];
        if (ch.open && !was.open) {
          if (this.season.stalls[c] === null) this.season.stalls[c] = at - post.merge.seasonStartedAt;
          if (!ev.some((e) => e.type === 'stallOpen')) tr.novelty.push({ t: at, what: `stall${c}` });
        }
        // A first-time tier: a (c, k) stamped in the Ladder Book now (first ever, as the prototype counts it).
        for (let k = 1; k <= R.TIERS; k++) {
          if (post.merge.book[c]?.[k - 1] && !pre.merge.book[c]?.[k - 1]) {
            tr.firstTiers.push({ t: at, c, k, season: post.merge.season });
            tr.novelty.push({ t: at, what: `tier${c}.${k}` });
          }
        }
        if (ch.minder > 0 && !this.hired.has(`${c}`)) {
          this.hired.add(`${c}`);
          if (was.minder === 0 && !ev.some((e) => e.type === 'minderHire')) tr.novelty.push({ t: at, what: `minder${c}` });
        }
      });
      post.merge.festival.lines.forEach((l, i) => {
        const key = `${i}`;
        if (!l.filled && !this.festReach.has(key) && post.merge.chains[l.c]?.open && post.merge.chains[l.c].best >= l.k - 1) {
          this.festReach.add(key);
          tr.novelty.push({ t: at, what: 'festivalReach' });
        }
      });
    }
    // Prices shown on the open tickets: never fall after the draw (M26), and the paid one is the last shown.
    for (const ct of post.merge.counters) {
      if (!ct.ticket) continue;
      const rec = this.byId.get(ct.ticket.id);
      if (!rec) continue;
      const shown = roundCoins(cfg, R.ticketPrice(cfg, post, ct.ticket));
      rec.lastShown = shown;
      if (shown > rec.maxShown) rec.maxShown = shown;
      if (shown < rec.maxShown - 1e-9 && !rec.broken.includes('priceFell')) rec.broken.push('priceFell');
    }
  }

  private sample(pre: R.MergeGame, dt: number) {
    const m = pre.merge;
    const v = boardView(m);
    const F = R.freeCells(m).length;
    let f = 0;
    if (F === 0) {
      f |= 1;
      if (!anyMerge(v) && deliveries(m, v).length === 0) f |= 2;
    }
    const open = m.chains.map((ch, c) => (ch.open ? c : -1)).filter((c) => c >= 0);
    const top2 = open.slice(-2);
    for (const c of open) if (m.chains[c].waiting) f |= 1 << (2 + c);
    for (const c of top2) f |= 1 << (8 + c);
    const s = this.tr.samples;
    s.t.push(this.clock);
    s.dt.push(dt);
    s.f.push(f);
    s.n.push(m.counters.length);
    s.su.push(m.counters.filter((ct) => !ct.ticket && ct.blockedAt !== null).length);
  }

  /** Advances the game clock to `t`, splitting at every refill (a draw is checked on the state it was drawn on) and at the kept marks. */
  advanceTo(t: number) {
    let guard = 0;
    while (this.clock < t - 1e-9) {
      if (++guard > 1e7) throw new Error('merge bot: the clock does not move (advanceMerge returned the same clock)');
      const now = this.clock;
      let to = t;
      if (this.o.hz > 0) to = Math.min(to, now + 1 / this.o.hz);
      for (const ct of this.m.counters) {
        if (!ct.ticket && ct.refillAt !== null) {
          if (ct.refillAt - EVENT_LIMIT > now + EVENT_LIMIT && ct.refillAt - EVENT_LIMIT < to) to = ct.refillAt - EVENT_LIMIT;
          else if (ct.refillAt > now + EVENT_LIMIT / 2 && ct.refillAt < to) to = ct.refillAt;
        }
      }
      if (this.keep.length && this.keep[0] > now + EVENT_LIMIT && this.keep[0] < to) to = this.keep[0];
      if (this.awayAt.length && this.awayAt[0] > now + EVENT_LIMIT && this.awayAt[0] < to) to = this.awayAt[0];
      const dt = to - now;
      const pre = this.g;
      const preParams = R.mergeParams(this.cfg, pre);
      this.sample(pre, dt);
      const ev: R.MergeEvent[] = [];
      const post = R.advanceMerge(this.cfg, pre, dt, this.wall + dt * 1000, ev);
      if (post.stats.playSeconds <= now) throw new Error(`merge bot: advanceMerge(${dt}) did not move the clock from ${now}`);
      this.wall += (post.stats.playSeconds - now) * 1000;
      this.g = post;
      this.account(pre, post, ev, this.clock, preParams);
      this.marks();
    }
  }

  private marks() {
    while (this.keep.length && this.keep[0] <= this.clock + EVENT_LIMIT) this.states[this.keep.shift() as number] = this.g;
    while (this.awayAt.length && this.awayAt[0] <= this.clock + EVENT_LIMIT) {
      this.awayAt.shift();
      for (const late of [false, true]) this.tr.away.push(awayProbe(this.cfg, this.g, this.wall, this.o.awaySeconds, late));
    }
  }

  /** Applies a player action; false (and nothing changes) when the rules refused it. */
  apply(what: string, fn: (g: R.MergeGame, ev: R.MergeEvent[]) => R.MergeGame, expect = true): boolean {
    const pre = this.g;
    const preParams = R.mergeParams(this.cfg, pre);
    const ev: R.MergeEvent[] = [];
    const post = fn(pre, ev);
    if (post === pre) {
      if (expect) this.tr.refused.push({ t: this.clock, what });
      return false;
    }
    this.g = post;
    this.tr.actions.push({ t: this.clock, what });
    // A ticket an action draws (the scripted hedgehog after the first merge, a refill after Not tonight) sees the action's result.
    this.account(pre, post, ev, this.clock, preParams, post);
    return true;
  }

  drop(what: string, from: number, target: R.DropTarget, expect = true): boolean {
    return this.apply(
      what,
      (g, ev) => {
        const out = R.dropAt(this.cfg, g, from, target, ev);
        return out.result.kind === 'return' ? g : out.game;
      },
      expect,
    );
  }

  buy(a: R.Advice): boolean {
    const cfg = this.cfg;
    const c = a.target ?? 0;
    const cash = this.g.cash;
    const fns: Record<string, (g: R.MergeGame, ev: R.MergeEvent[]) => R.MergeGame> = {
      gear: (g, ev) => R.levelGear(cfg, g, c, ev),
      stall: (g, ev) => R.levelStall(cfg, g, c, ev),
      minderHire: (g, ev) => R.hireMinder(cfg, g, c, ev),
      minderLevel: (g, ev) => R.levelMinder(cfg, g, c, ev),
      openStall: (g, ev) => R.openStall(cfg, g, c, ev),
      shutter: (g, ev) => R.openShutter(cfg, g, c, ev),
    };
    const fn = fns[a.kind];
    if (!fn) return false;
    const season = this.m.season;
    if (!this.apply(`buy:${a.kind}:${c}`, fn)) return false;
    this.tr.purchases.push({ t: this.clock, kind: a.kind, c, cost: cash - this.g.cash, season });
    return true;
  }

  view(): { v: BoardView; P: R.MergeParams; base: number[]; values: number[][] } {
    const P = R.mergeParams(this.cfg, this.g);
    return { v: boardView(this.m), P, base: P.chains.map((ch) => ch.base), values: P.chains.map((ch) => ch.values) };
  }

  deliver(d: OpenLine): boolean {
    const v = boardView(this.m);
    const cell = v.cells[d.c][d.k][0];
    if (cell === undefined) return false;
    return this.drop(d.where === 'festival' ? 'festival' : 'deliver', cell, d.where === 'festival' ? { kind: 'festival' } : { kind: 'counter', counter: d.i });
  }

  merge(c: number, k: number): boolean {
    const cells = boardView(this.m).cells[c][k];
    if (cells.length < 2) return false;
    return this.drop('merge', cells[cells.length - 1], { kind: 'cell', cell: cells[0] });
  }

  basket(c: number, k: number): boolean {
    const cells = boardView(this.m).cells[c][k];
    if (!cells.length) return false;
    return this.drop('basket', cells[cells.length - 1], { kind: 'basket' });
  }

  openBox(): boolean {
    return this.apply('giftBox', (g, ev) => R.openGiftBox(this.cfg, g, ev));
  }

  close(): boolean {
    return this.apply('closeSeason', (g, ev) => R.closeSeason(this.cfg, g, this.wall, ev));
  }

  /** Time away (wall seconds): the app was closed; on return the shared store grants the closed form's earnings (× the ad). */
  away(seconds: number, ad: boolean) {
    const g0: R.MergeGame = { ...this.g, lastSavedAt: this.wall, stats: { ...this.g.stats, clockHigh: Math.max(this.g.stats.clockHigh ?? 0, this.wall) } };
    this.wall += seconds * 1000;
    this.returnAt(g0, ad);
  }

  /** The app opens at the current wall clock on top of `g0` (saved earlier); returns the coins granted. */
  returnAt(g0: R.MergeGame, ad: boolean): number {
    const r = R.mergeOffline(this.cfg, g0, this.wall);
    let g = r.game;
    const pay = r.earnings * (ad ? 1 + this.cfg.merge.ads.awayBonus : 1);
    if (pay > 0) g = R.commitCash(g, roundCoins(this.cfg, pay), 'away');
    g = { ...g, lastSavedAt: this.wall, stats: { ...g.stats, clockHigh: Math.max(g.stats.clockHigh ?? 0, this.wall) } };
    const pre = this.g;
    this.g = g;
    this.account(pre, g, [], this.clock, null);
    return g.cash - g0.cash;
  }

  finish(): BotRun {
    this.tr.t1 = this.clock;
    return { trace: this.tr, game: this.g, states: this.states };
  }
}

// ============================================================================================
// the bounds of 2.7, as the bot reads them on the state a ticket was drawn on (gate 4)
// ============================================================================================

/** The bounds a drawn ticket breaks on `pre`, by the rules' own check (ORDERS's `checkBounds`, the one the draw uses). */
export function orderBreaks(cfg: R.MergeConfig, pre: R.MergeGame, counter: number, t: R.Ticket): string[] {
  const f = R.checkBounds(cfg, pre, counter, t.lines.map((l) => ({ c: l.c, k: l.k })), { parade: t.gold, scripted: !!t.scripted });
  const out: string[] = [];
  if (f.a) out.push('a');
  if (f.bOutput) out.push('b');
  if (f.bHand) out.push('bH');
  if (f.c) out.push('c');
  if (f.d) out.push('d');
  return out;
}

/**
 * Which bounds of 2.7 (with M4: (d) is (d1) only) a drawn ticket breaks on `pre`, the state just
 * before its draw: (a) every line k ≤ min(8, best_c + 1); (d) k ≥ b_c + 1 (scripted tickets are
 * exempt); (c) Σ over the unfilled lines of every open ticket, this one included, of k − b_c + 1,
 * + Σ_c min(λ, Loose_c) + R ≤ O; (b) per chain on the ticket, the pops `missing()` says this ticket
 * and every open ticket's unfilled lines on that chain still need × T/(1 + p_c) ≤ W, and the hand
 * actions Σ (goods used + pops − 1 merges + 1 delivery) ≤ H ("bH"); the Parade with its own W and H.
 * (b) needs ORDERS's `missing` and `goodsAtHand`; while they are not built it is not checked.
 */
export function drawBreaks(cfg: R.MergeConfig, pre: R.MergeGame, t: R.Ticket): string[] {
  const out: string[] = [];
  const P = R.mergeParams(cfg, pre);
  const m = pre.merge;
  for (const l of t.lines) {
    const ch = P.chains[l.c];
    const best = m.chains[l.c]?.best ?? 0;
    if (!ch || !m.chains[l.c].open || l.k > Math.min(R.TIERS, best + 1) || l.k < 1) out.push('a');
    else if (!t.scripted && l.k < ch.base + 1) out.push('d');
  }
  const others = m.counters.filter((ct) => ct.ticket && ct.ticket.id !== t.id).flatMap((ct) => (ct.ticket as R.Ticket).lines.filter((l) => !l.filled));
  const all = [...others, ...t.lines];
  const lam = cfg.merge.gear.looseCap;
  let cells = cfg.merge.tickets.spareCells;
  for (const l of all) cells += l.k - (P.chains[l.c]?.base ?? 1) + 1;
  for (const ch of P.chains) if (ch.open) cells += Math.min(lam, ch.loose);
  if (cells > P.O) out.push('c');
  try {
    const goods = R.goodsAtHand(m);
    const lines = [...others.map((l) => ({ c: l.c, k: l.k })), ...t.lines.map((l) => ({ c: l.c, k: l.k }))];
    const units = R.missing(lines, goods).units;
    const W = t.gold ? cfg.merge.parade.outputWindow : cfg.merge.tickets.outputWindow;
    const H = t.gold ? cfg.merge.parade.handActions : cfg.merge.tickets.handActions;
    const T = cfg.merge.gear.interval;
    for (const c of new Set(t.lines.map((l) => l.c))) {
      const ch = P.chains[c];
      let pops = 0;
      lines.forEach((l, i) => l.c === c && (pops += R.popsNeeded(units[i], ch.base)));
      if ((pops * T) / (1 + ch.ripe) > W + 1e-9) out.push('b');
    }
    // The hand bound of this ticket alone: per line, (goods used + pops − 1) merges + 1 delivery,
    // the goods at hand allocated highest tier first (the allocation `missing` describes).
    const cnt = Array.from({ length: R.CHAINS }, () => Array.from({ length: R.TIERS + 1 }, () => 0));
    for (const gd of goods) if (gd.c >= 0 && gd.c < R.CHAINS && gd.k >= 1 && gd.k <= R.TIERS) cnt[gd.c][gd.k]++;
    const mineLines = byTierDesc(t.lines.map((l) => ({ c: l.c, k: l.k })));
    let hand = 0;
    allocation(cnt, mineLines, P.chains.map((ch) => ch.base)).forEach((a) => {
      let used = 0;
      for (const n of a.alloc.values()) used += n;
      hand += used + a.pops - 1 + 1;
    });
    if (hand > H + 1e-9) out.push('bH');
  } catch (e) {
    if (!(e instanceof R.NotBuiltError)) throw e;
  }
  return [...new Set(out)];
}

// ============================================================================================
// time away: the probe of gate 9
// ============================================================================================

/**
 * 1 h away (or `seconds`) from `g` at wall `wall`, with the ad, with or without Late Hours; and
 * gate 9's cross-check: the closed form against stepping the same time with no player (M26: the
 * board frozen; the bot cannot freeze it through the interface, so charges are compared only when
 * stepping placed nothing on the board): each minder's sales, and every next-event offset.
 */
export function awayProbe(cfg: R.MergeConfig, g: R.MergeGame, wall: number, seconds: number, late: boolean): AwayProbe {
  let base: R.MergeGame = { ...g, lastSavedAt: wall, stats: { ...g.stats, clockHigh: wall } };
  if (late && !base.entitlements.products.includes(cfg.merge.products.lateHours)) base = { ...base, entitlements: { ...base.entitlements, products: [...base.entitlements.products, cfg.merge.products.lateHours] } };
  const r = R.mergeOffline(cfg, base, wall + seconds * 1000);
  const earnings = r.earnings * (1 + cfg.merge.ads.awayBonus);
  const compared: string[] = [];
  const detail: string[] = [];
  const eff = r.report?.effective ?? Math.min(seconds, R.mergeParams(cfg, base).awayCap);
  if (eff > 0) {
    let s = base;
    const ev: R.MergeEvent[] = [];
    let left = eff;
    while (left > EVENT_LIMIT) {
      const dt = Math.min(left, R.MAX_TICK);
      s = R.advanceMerge(cfg, s, dt, wall + (eff - left + dt) * 1000, ev);
      left -= dt;
    }
    const clock = g.stats.playSeconds;
    const placed = ev.some((e) => e.type === 'drop' || e.type === 'released' || e.type === 'giftGoodPlaced');
    g.merge.chains.forEach((ch, c) => {
      if (!ch.open) return;
      const salesStep = ev.filter((e) => e.type === 'sale' && e.c === c).length;
      const salesClosed = r.report?.sales.find((x) => x.c === c)?.goods ?? 0;
      if (ch.minder > 0) {
        compared.push(`sales${c}`, `nextSale${c}`);
        if (salesStep !== salesClosed) detail.push(`chain ${c}: ${salesClosed} sales in the closed form, ${salesStep} stepped`);
        const offC = r.game.merge.chains[c].nextSaleAt - clock;
        const offS = s.merge.chains[c].nextSaleAt - (clock + eff);
        if (Math.abs(offC - offS) > 1e-6) detail.push(`chain ${c}: next sale ${offC.toFixed(3)} s after the clock in the closed form, ${offS.toFixed(3)} s stepped`);
      }
      if (!placed) {
        compared.push(`shelf${c}`, `waiting${c}`);
        if (r.game.merge.chains[c].shelf.length !== s.merge.chains[c].shelf.length) detail.push(`chain ${c}: shelf ${r.game.merge.chains[c].shelf.length} closed, ${s.merge.chains[c].shelf.length} stepped`);
        if (r.game.merge.chains[c].waiting !== s.merge.chains[c].waiting) detail.push(`chain ${c}: waiting ${r.game.merge.chains[c].waiting} closed, ${s.merge.chains[c].waiting} stepped`);
        if (!s.merge.chains[c].waiting) {
          const offC = r.game.merge.chains[c].nextPopAt - clock;
          const offS = s.merge.chains[c].nextPopAt - (clock + eff);
          if (Math.abs(offC - offS) > 1e-6) detail.push(`chain ${c}: next drop ${offC.toFixed(3)} s closed, ${offS.toFixed(3)} s stepped`);
        }
      }
    });
    if (r.game.cash !== g.cash) detail.push('the closed form changed cash (it must only return earnings)');
    if (r.game.stats.playSeconds !== g.stats.playSeconds) detail.push('the closed form moved the game clock');
  }
  return { t: g.stats.playSeconds, late, seconds, earnings, cross: { ok: detail.length === 0, compared, detail } };
}

// ============================================================================================
// the bots' decisions (one call = one action slot; returns its seconds, or null when nothing useful exists)
// ============================================================================================

function activeStep(r: Runner, opt: { measure: boolean }): number | null {
  const { o } = r;
  const h = o.habits ?? {};
  const cfg = r.cfg;
  let { v, base, values } = r.view();
  const goal = goalLine(cfg, r.g);
  const adv = goal.purchase;
  const affordable = !!adv && r.g.cash >= adv.cost;
  // M31: when the goal line names the Festival's missing good, the bot works toward it first.
  const festivalLine = goal.other?.kind === 'festival' && goal.other.target !== null ? goal.other.target : null;
  if (opt.measure && r.clock < 660) r.tr.slots.push({ t: r.clock, useful: anyMerge(v) || deliveries(r.m, v).length > 0 || affordable });
  if (affordable) r.tr.affordableUnbought += o.act;
  // 0. close the season once the Festival is filled (the hoarder opens its boxes first)
  if (R.canCloseSeason(cfg, r.g)) {
    if (h.hoardBoxes && r.m.gift.boxes.length) {
      r.openBox();
      return o.sheet;
    }
    if (r.close()) return o.sheet;
  }
  // 1. deliver any good matching an open line
  const d = chooseDelivery(r.m, v);
  if (d && r.deliver(d)) return o.act;
  // habit: Not tonight whenever ready on a ticket with no filled line the board cannot finish
  if (h.notTonight) {
    for (const [i, ct] of r.m.counters.entries()) {
      const t = ct.ticket;
      if (!t || r.clock < ct.notTonightAt || t.lines.some((l) => l.filled)) continue;
      if (allocation(v.cnt, byTierDesc(t.lines.map((l) => ({ c: l.c, k: l.k }))), base).some((x) => x.pops > 0)) {
        if (r.apply('notTonight', (g, ev) => R.notTonight(cfg, g, i, ev), false)) return o.sheet;
      }
    }
  }
  // habit: the device clock moved 15 min forward before an ad (ad cooldowns run on the play clock, M10)
  if (h.clockJumps) {
    for (const kind of ['gearRush', 'callDragon'] as R.MergeAdKind[]) {
      if (R.canWatchAd(cfg, r.g, kind)) {
        r.wall += 15 * 60 * 1000;
        if (r.apply(`ad:${kind}`, (g, ev) => R.grantAd(cfg, g, kind, undefined, ev), false)) {
          r.tr.jumps.grants[kind] = (r.tr.jumps.grants[kind] ?? 0) + 1;
          return o.sheet;
        }
      }
    }
  }
  // 2. buy by advice when affordable
  if (adv && affordable) {
    if (r.buy(adv)) {
      r.tr.affordableUnbought -= o.act;
      if (h.sellBuyUndo && r.sold) {
        r.apply('undo', (g, ev) => R.undoBasket(cfg, g, ev), false);
        r.sold = false;
      }
      return o.sheet;
    }
  }
  // habit: sell a spare good to reach the advised purchase (then buy, then try the undo)
  if (h.sellBuyUndo && adv && r.g.cash < adv.cost) {
    const spare = basketChoice(r.m, v, base, values);
    if (spare) {
      const share = R.mergeParams(cfg, r.g).mods.basketShare;
      if (r.g.cash + share * (values[spare.c]?.[spare.k - 1] ?? 0) >= adv.cost && r.basket(spare.c, spare.k)) {
        r.sold = true;
        return o.act;
      }
    }
  }
  // 3. open gift boxes at once
  if (r.m.gift.boxes.length && !h.hoardBoxes && r.openBox()) return o.sheet;
  ({ v, base, values } = r.view());
  // 4. merge the lowest pair on the path to the line nearest completion
  const pm = pathMerge(r.m, v, base, festivalLine);
  if (pm && r.merge(pm.c, pm.k)) return o.act;
  // 5. merge any lowest pair
  const lp = lowestPair(v);
  if (lp && r.merge(lp.c, lp.k)) return o.act;
  // 6. the Basket, only with no free cell and no pair
  if (R.freeCells(r.m).length === 0 && !lp) {
    const bc = basketChoice(r.m, v, base, values);
    if (bc && r.basket(bc.c, bc.k)) return o.act;
  }
  return null;
}

function lazyStep(r: Runner): number | null {
  const cfg = r.cfg;
  const { v, P, base, values } = r.view();
  const dl = deliveries(r.m, v).sort((a, b) => Number(a.where === 'festival') - Number(b.where === 'festival'));
  if (dl.length && r.deliver(dl[0])) return r.o.act;
  if (R.canCloseSeason(cfg, r.g) && r.close()) return r.o.sheet;
  // the cheapest affordable purchase
  const cands: R.Advice[] = [];
  P.chains.forEach((ch, c) => {
    const add = (kind: R.AdviceKind, cost: number | null) => cost !== null && cost <= r.g.cash && cands.push({ kind, target: c, cost, gain: 0, wait: 0, score: cost });
    add('gear', ch.gearCost);
    add('stall', ch.stallCost);
    add(r.m.chains[c].minder === 0 ? 'minderHire' : 'minderLevel', ch.minderCost);
    add('openStall', ch.openCost);
  });
  P.shutters.forEach((s, grp) => s && s.allowed && s.cost <= r.g.cash && cands.push({ kind: 'shutter', target: grp, cost: s.cost, gain: 0, wait: 0, score: s.cost }));
  if (cands.length) {
    cands.sort((a, b) => a.cost - b.cost);
    if (r.buy(cands[0])) return r.o.sheet;
  }
  if (r.m.gift.boxes.length && r.openBox()) return r.o.sheet;
  const lp = lowestPair(v);
  if (lp && r.merge(lp.c, lp.k)) return r.o.act;
  if (R.freeCells(r.m).length === 0) {
    const bc = basketChoice(r.m, v, base, values);
    if (bc && r.basket(bc.c, bc.k)) return r.o.act;
  }
  return null;
}

function deliverStep(r: Runner): number | null {
  const { v } = r.view();
  const dl = deliveries(r.m, v).sort((a, b) => Number(a.where === 'festival') - Number(b.where === 'festival'));
  if (dl.length && r.deliver(dl[0])) return r.o.act;
  const adv = advisedPurchase(r.cfg, r.g);
  if (adv && r.g.cash >= adv.cost && r.buy(adv)) return r.o.sheet;
  if (r.m.gift.boxes.length && r.openBox()) return r.o.sheet;
  return null;
}

function checkinStep(r: Runner): number | null {
  const adv = advisedPurchase(r.cfg, r.g);
  if (adv && r.g.cash >= adv.cost && r.buy(adv)) return r.o.sheet;
  if (r.m.gift.boxes.length && r.openBox()) return r.o.sheet;
  return null;
}

/** Plays `step` from now to game clock `until` (the prototype's run_active), or until `stop`. */
function playUntil(r: Runner, until: number, step: () => number | null, stop?: () => boolean): void {
  let t = r.clock + r.o.act;
  while (t <= until + EVENT_LIMIT) {
    r.advanceTo(t + ACT_AFTER);
    if (stop?.() || r.o.stop?.(r.g)) return;
    const dur = step();
    if (r.o.stop?.(r.g)) return;
    t = r.clock + (dur ?? r.o.act);
  }
  r.advanceTo(until);
}

// ============================================================================================
// one bot run
// ============================================================================================

/** Runs one bot (8.2 with M6). Throws the rules' NotBuiltError at the first rule that is not built yet. */
export function runMergeBot(cfg: R.MergeConfig, opts: BotOptions = {}): BotRun {
  const kind = opts.kind ?? 'active';
  const act = opts.act ?? 2;
  const o = { ...opts, act, sheet: opts.sheet ?? act + 1, hz: opts.hz ?? 0, awaySeconds: opts.awaySeconds ?? 3600 };
  const seed = opts.seed ?? 12345;
  const wall0 = opts.wall0 ?? BOT_EPOCH;
  const g0 = opts.start ?? (opts.base ?? botBaseGame)(cfg, seed, wall0);
  const wall = opts.start ? Math.max(wall0, opts.start.lastSavedAt ?? wall0) : wall0;
  const r = new Runner(cfg, o, kind, g0, wall);
  const hours = opts.hours ?? 3;
  const until = r.clock + hours * 3600;
  const seasonsDone = () => opts.seasons !== undefined && r.m.feats.seasonsClosed >= opts.seasons;
  if (kind === 'idle') {
    playUntil(r, until, () => null);
    return r.finish();
  }
  if (kind === 'passive' || kind === 'checkin') {
    const days = opts.days ?? (kind === 'passive' ? 21 : 1);
    const starts = kind === 'passive' ? [8, 11.5, 15, 18.5, 22] : [0, 4, 8, 12, 16, 20];
    const length = kind === 'passive' ? 480 : 120;
    let lastEnd: number | null = null;
    for (let day = 0; day < days && !seasonsDone(); day++) {
      for (const hStart of starts) {
        const wt = wall0 + (day * 24 + hStart) * 3600 * 1000;
        if (lastEnd !== null) r.away((wt - lastEnd) / 1000, kind === 'passive');
        else r.wall = wt;
        const t0 = r.clock;
        playUntil(r, t0 + length, () => (kind === 'passive' ? activeStep(r, { measure: false }) : checkinStep(r)), seasonsDone);
        r.tr.sessions.push({ day: day + 1, t0, t1: r.clock });
        r.tr.sessionSeconds += r.clock - t0;
        lastEnd = r.wall;
        if (seasonsDone()) break;
      }
    }
    return r.finish();
  }
  const step = kind === 'lazy' ? () => lazyStep(r) : kind === 'deliver' ? () => deliverStep(r) : () => activeStep(r, { measure: true });
  // The clock-jump habit: 4 h forward, back and forward again, once an hour of play (paid once at most).
  if (kind === 'active' && opts.habits?.clockJumps) {
    for (let h = 1; h * 3600 <= until - r.clock + 3600 && !seasonsDone(); h++) {
      playUntil(r, Math.min(until, r.tr.t0 + h * 3600), step, seasonsDone);
      if (r.clock >= until - EVENT_LIMIT) break;
      const saved: R.MergeGame = { ...r.g, lastSavedAt: r.wall, stats: { ...r.g.stats, clockHigh: Math.max(r.g.stats.clockHigh ?? 0, r.wall) } };
      // Forward 4 h (paid once, as any real absence), back to the true time, forward again: the
      // shared guard (stats.clockHigh) must pay nothing for the second and third opening.
      const back = r.wall;
      r.wall = back + 4 * 3600 * 1000;
      r.returnAt(saved, false);
      r.wall = back;
      r.tr.jumps.repaid += r.returnAt({ ...r.g, lastSavedAt: back }, false);
      r.wall = back + 4 * 3600 * 1000;
      r.tr.jumps.repaid += r.returnAt({ ...r.g, lastSavedAt: back }, false);
      r.tr.jumps.cycles++;
    }
    playUntil(r, until, step, seasonsDone);
    return r.finish();
  }
  playUntil(r, until, step, seasonsDone);
  return r.finish();
}

// ============================================================================================
// measurements: pure functions over a trace (8.3 with M2, M3, M23 to M26)
// ============================================================================================

export function quantile(xs: readonly number[], q: number): number {
  if (!xs.length) return NaN;
  const s = xs.slice().sort((a, b) => a - b);
  const i = (s.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return s[lo] + (s[hi] - s[lo]) * (i - lo);
}
export const median = (xs: readonly number[]) => quantile(xs, 0.5);

/** Coins that entered in [a, b) (game clock), by source; away excluded unless asked. */
export function coinsBySource(tr: Trace, a = -Infinity, b = Infinity): Partial<Record<CoinEntry['source'], number>> {
  const out: Partial<Record<CoinEntry['source'], number>> = {};
  for (const e of tr.coins) if (e.t >= a && e.t < b && e.amount > 0 && e.source !== 'spend' && e.source !== 'undo') out[e.source] = (out[e.source] ?? 0) + e.amount;
  // The undo takes back a Basket sale: net it out of the Basket.
  for (const e of tr.coins) if (e.t >= a && e.t < b && e.source === 'undo') out.basket = (out.basket ?? 0) + e.amount;
  return out;
}

/** Income in [a, b): every source but spending, away excluded (the active play's own coins). */
export function income(tr: Trace, a: number, b: number, withAway = false): number {
  const s = coinsBySource(tr, a, b);
  let sum = 0;
  for (const [k, v] of Object.entries(s)) if (withAway || k !== 'away') sum += v as number;
  return sum;
}

/** Gate 1: the first ticket paid (game clock from the start). */
export function firstTicketPaid(tr: Trace): number {
  const ts = tr.tickets.filter((t) => t.filled !== null).map((t) => (t.filled as number) - tr.t0);
  return ts.length ? Math.min(...ts) : Infinity;
}

/** Gate 1: the gaps between paying moments (a ticket or a purchase) in [t0, t0 + span]. */
export function payingGaps(tr: Trace, span = 600): { median: number; p90: number; max: number; purchases: number } {
  const end = tr.t0 + span;
  const moments = [...tr.tickets.filter((t) => t.filled !== null && (t.filled as number) <= end).map((t) => t.filled as number), ...tr.purchases.filter((p) => p.t <= end).map((p) => p.t)].sort((a, b) => a - b);
  const gaps: number[] = [];
  let last = tr.t0;
  for (const m of moments) {
    gaps.push(m - last);
    last = m;
  }
  gaps.push(end - last);
  return { median: median(gaps), p90: quantile(gaps, 0.9), max: Math.max(...gaps), purchases: tr.purchases.filter((p) => p.t <= end).length };
}

/** M3: useful actions available per minute for minutes 0 to 9, and the longest wait with none in minutes 0 to 10. */
export function usefulPerMinute(tr: Trace): { perMinute: number[]; longestWait: number } {
  const per = Array.from({ length: 10 }, () => 0);
  for (const s of tr.slots) {
    const m = Math.floor((s.t - tr.t0) / 60);
    if (s.useful && m >= 0 && m < 10) per[m]++;
  }
  let longest = 0;
  let start: number | null = null;
  for (const s of tr.slots) {
    if (s.t - tr.t0 >= 600) break;
    if (!s.useful && start === null) start = s.t;
    if (s.useful && start !== null) {
      longest = Math.max(longest, s.t - start);
      start = null;
    }
  }
  if (start !== null) longest = Math.max(longest, Math.min(tr.t0 + 600, tr.slots[tr.slots.length - 1]?.t ?? start) - start + tr.act);
  return { perMinute: per, longestWait: longest };
}

/** Gate 2 and 8.5: each stall's opening in season `season` (season clock, s), by chain. */
export function stallTimes(tr: Trace, season = 0): (number | null)[] {
  return tr.seasons.find((s) => s.season === season)?.stalls ?? [];
}

/** Gate 3: fill times (filled − drawn) of the ordinary tickets paid in [a, b) of `season`. */
export function fillTimes(tr: Trace, a: number, b: number, season: number | null = 0, gold = false): number[] {
  return tr.tickets.filter((t) => t.filled !== null && t.filled >= a && t.filled < b && t.gold === gold && !t.scripted && (season === null || t.season === season)).map((t) => (t.filled as number) - t.drawn);
}

/** Gate 3 with M26: after every gear purchase up to `until`, the median fill of the next `n` tickets ≤ `ratio` × that of the previous `n`. */
export function gearFillCheck(tr: Trace, until: number, n = 30, ratio = 1.3): { bad: number; total: number } {
  const tk = tr.tickets.filter((t) => t.filled !== null && !t.gold && !t.scripted && (t.filled as number) <= until).sort((a, b) => (a.filled as number) - (b.filled as number));
  let bad = 0;
  let total = 0;
  for (const p of tr.purchases) {
    if (p.kind !== 'gear' || p.t > until) continue;
    const prev = tk.filter((t) => (t.filled as number) <= p.t).slice(-n).map((t) => (t.filled as number) - t.drawn);
    const next = tk.filter((t) => t.drawn >= p.t).slice(0, n).map((t) => (t.filled as number) - t.drawn);
    if (prev.length === n && next.length === n) {
      total++;
      if (median(next) > ratio * median(prev)) bad++;
    }
  }
  return { bad, total };
}

/** Time shares over [a, b) of the samples: F = 0, deadlock, "Setting up…" per counter-second, the two highest open chains' gears waiting, and each chain's. */
export function boardShares(tr: Trace, a: number, b: number): { f0: number; deadlock: number; setup: number; waitTop2: number; waitChain: number[] } {
  const s = tr.samples;
  let tot = 0;
  let f0 = 0;
  let dl = 0;
  let cs = 0;
  let su = 0;
  let w2 = 0;
  const wc = Array.from({ length: R.CHAINS }, () => 0);
  for (let i = 0; i < s.t.length; i++) {
    const t0 = Math.max(a, s.t[i]);
    const t1 = Math.min(b, s.t[i] + s.dt[i]);
    const dt = t1 - t0;
    if (dt <= 0) continue;
    const f = s.f[i];
    tot += dt;
    if (f & 1) f0 += dt;
    if (f & 2) dl += dt;
    cs += s.n[i] * dt;
    su += s.su[i] * dt;
    let top = 0;
    let waitTop = 0;
    for (let c = 0; c < R.CHAINS; c++) {
      if (f & (1 << (2 + c))) wc[c] += dt;
      if (f & (1 << (8 + c))) {
        top++;
        if (f & (1 << (2 + c))) waitTop++;
      }
    }
    if (top) w2 += (dt * waitTop) / top;
  }
  const q = (x: number) => (tot > 0 ? x / tot : NaN);
  return { f0: q(f0), deadlock: q(dl), setup: cs > 0 ? su / cs : NaN, waitTop2: q(w2), waitChain: wc.map(q) };
}

/** The longest gap between times in [a, b] (both ends count as times). */
export function maxGap(ts: readonly number[], a: number, b: number): number {
  const xs = [a, ...ts.filter((t) => t > a && t <= b).sort((x, y) => x - y), b];
  let g = 0;
  for (let i = 1; i < xs.length; i++) g = Math.max(g, xs[i] - xs[i - 1]);
  return g;
}

/** Gate 6: the longest gap without something new, and without a first-time tier. */
export function noveltyGaps(tr: Trace): { gap30: number; gap3h: number; tierGapH1: number; tierGapH13: number } {
  const t0 = tr.t0;
  const nov = tr.novelty.map((n) => n.t - t0);
  const tiers = tr.firstTiers.map((n) => n.t - t0);
  return { gap30: maxGap(nov, 0, 1800), gap3h: maxGap(nov, 0, 10800), tierGapH1: maxGap(tiers, 0, 3600), tierGapH13: maxGap(tiers, 3600, 10800) };
}

/** Gate 7: coins per bot action in each of hours 1 to `hours`. */
export function valuePerAction(tr: Trace, hours = 3): number[] {
  return Array.from({ length: hours }, (_, h) => {
    const a = tr.t0 + h * 3600;
    const b = a + 3600;
    const n = tr.actions.filter((x) => x.t >= a && x.t < b).length;
    return income(tr, a, b) / Math.max(1, n);
  });
}

/** Gate 8: shares of the coins in the window X ± half (game clock from the start). */
export function shareAt(tr: Trace, X: number, half = 300): { ticket: number; minder: number; gift: number; rate: number } {
  const a = tr.t0 + Math.max(0, X - half);
  const b = tr.t0 + X + half;
  const s = coinsBySource(tr, a, b);
  const all = income(tr, a, b);
  const q = (x: number | undefined) => (all > 0 ? (x ?? 0) / all : NaN);
  return { ticket: q(s.ticket), minder: q(s.till), gift: q(s.gift), rate: all / (b - a) };
}

/** Coins per second at minute m (window ± 1 min). */
export function coinsPerSecond(tr: Trace, minutes = [1, 3, 5, 10, 30, 60, 120, 180]): Record<number, number> {
  const out: Record<number, number> = {};
  for (const m of minutes) {
    const X = tr.t0 + m * 60;
    const a = Math.max(tr.t0, X - 60);
    out[m] = income(tr, a, X + 60) / (X + 60 - a);
  }
  return out;
}

/** M24: gift coins as a share of the coins of [t0, t0 + span], and boxes earned per hour. */
export function giftShare(tr: Trace, span = 10800): { coinShare: number; boxesPerHour: number } {
  const all = income(tr, tr.t0, tr.t0 + span);
  const gift = coinsBySource(tr, tr.t0, tr.t0 + span).gift ?? 0;
  const hours = Math.min(span, tr.t1 - tr.t0) / 3600;
  return { coinShare: all > 0 ? gift / all : NaN, boxesPerHour: hours > 0 ? tr.gifts.earned.filter((t) => t < tr.t0 + span).length / hours : NaN };
}

/** Gate 9: each probe's earnings with the ad over 1 h of active play around it (rate of X ± 5 min). */
export function awayRatios(tr: Trace): { t: number; late: boolean; ratio: number; cross: boolean; detail: string[] }[] {
  return tr.away.map((p) => {
    const rate = shareAt(tr, p.t - tr.t0).rate;
    return { t: p.t - tr.t0, late: p.late, ratio: rate > 0 ? p.earnings / (rate * p.seconds) : NaN, cross: p.cross.ok, detail: p.cross.detail };
  });
}

/** Gate 8 (hard part): coins entered only through the six named sources (no unbooked change of cash). */
export function unbookedCoins(tr: Trace): { count: number; amount: number } {
  const u = tr.coins.filter((e) => e.source === 'unbooked');
  return { count: u.length, amount: u.reduce((a, e) => a + e.amount, 0) };
}

/** Gate 4 (hard parts) over the tickets of [a, b): bounds broken at the draw, shown price ≠ paid, price fell, Basket-touched. */
export function honesty(tr: Trace, a = -Infinity, b = Infinity): { broken: number; byBound: Record<string, number>; shownNotPaid: number; priceFell: number; basketTickets: number; drawn: number } {
  const byBound: Record<string, number> = {};
  let broken = 0;
  let shownNotPaid = 0;
  let fell = 0;
  let basket = 0;
  let drawn = 0;
  for (const t of tr.tickets) {
    if (t.drawn < a || t.drawn >= b) continue;
    drawn++;
    const bounds = t.broken.filter((x) => x !== 'priceFell');
    if (bounds.length) broken++;
    for (const x of bounds) byBound[x] = (byBound[x] ?? 0) + 1;
    if (t.broken.includes('priceFell')) fell++;
    if (t.paid !== null && Math.abs(t.paid - t.lastShown) > 1e-6 * Math.max(1, t.lastShown)) shownNotPaid++;
    if (t.paid !== null && t.basket) basket++;
  }
  return { broken, byBound, shownNotPaid, priceFell: fell, basketTickets: basket, drawn };
}

/** Gate 13: observed against printed odds; ok within ±0.5 points, or 3 standard errors while the sample is under 100k. */
export function oddsCheck(tr: Trace): { name: string; n: number; observed: number; expected: number; ok: boolean }[] {
  const row = (name: string, n: number, hits: number, exp: number) => {
    const p = n > 0 ? exp / n : NaN;
    const obs = n > 0 ? hits / n : NaN;
    const tol = Math.max(0.005, n < 100000 && n > 0 ? 3 * Math.sqrt((p * (1 - p)) / n) : 0);
    return { name, n, observed: obs, expected: p, ok: n === 0 || Math.abs(obs - p) <= tol };
  };
  const g = tr.gifts.slots;
  const slots = g.coins + g.good + g.spark;
  return [
    row('Lucky merges', tr.odds.merges, tr.odds.luckies, tr.odds.luckyExpected),
    row('ripe drops', tr.odds.drops, tr.odds.ripe, tr.odds.ripeExpected),
    row('gift slots: coins', slots, g.coins, slots * 0.5),
    row('gift slots: a good', slots, g.good, slots * 0.35),
    row('gift slots: a Lucky Spark', slots, g.spark, slots * 0.15),
  ];
}

/** 8.5: the season-time table (season clock, minutes): each stall's opening and the Festival. */
export function seasonTable(tr: Trace): { season: number; stalls: (number | null)[]; festival: number | null; closed: number | null; startH: number }[] {
  const m = (x: number | null) => (x === null ? null : x / 60);
  return tr.seasons.map((s) => ({ season: s.season + 1, stalls: s.stalls.map(m), festival: m(s.festival), closed: m(s.closed), startH: (s.start - tr.t0) / 3600 }));
}

/** The passive bot's days: the day of each first stall opening and of the first Festival (season 1), seasons closed by days 7 and 21, and the affordable-unbought share. */
export function passiveDays(tr: Trace): { steamer: number | null; sweets: number | null; noodles: number | null; festival: number | null; seasons7: number; seasons21: number; affordableUnbought: number } {
  const dayOf = (t: number | null) => {
    if (t === null) return null;
    const s = tr.sessions.find((x) => t >= x.t0 - EVENT_LIMIT && t <= x.t1 + EVENT_LIMIT);
    return s ? s.day : null;
  };
  const s0 = tr.seasons.find((s) => s.season === 0);
  const at = (c: number) => (s0 && s0.stalls[c] !== null ? s0.start + (s0.stalls[c] as number) : null);
  const closedBy = (day: number) => {
    const end = tr.sessions.filter((x) => x.day <= day).pop()?.t1 ?? -Infinity;
    return tr.seasons.filter((s) => s.closed !== null && s.start + (s.closed as number) <= end + EVENT_LIMIT).length;
  };
  return {
    steamer: dayOf(at(2)),
    sweets: dayOf(at(3)),
    noodles: dayOf(at(4)),
    festival: dayOf(s0 && s0.festival !== null ? s0.start + s0.festival : null),
    seasons7: closedBy(7),
    seasons21: closedBy(21),
    affordableUnbought: tr.sessionSeconds > 0 ? tr.affordableUnbought / tr.sessionSeconds : NaN,
  };
}

// ============================================================================================
// all runs of one seed, and evaluate
// ============================================================================================

export interface GateRow {
  /** Gate number and name ("4 Setting up share"). */
  name: string;
  /** hard: fails a build (M2); aim: tuned toward, a warning until the lead makes it a guard; report: shown only. */
  kind: 'hard' | 'aim' | 'report';
  aim: string;
  value: number | string | null;
  ok: boolean;
  /** For the tuner: the measured number and its band (null: no bound on that side). */
  num?: number | null;
  lo?: number | null;
  hi?: number | null;
}

export interface AllOptions {
  seed: number;
  act?: number;
  sheet?: number;
  /** Hours of the active run (it also stops after `seasons` closes). */
  hours?: number;
  seasons?: number;
  /** Days of the passive bot; 0 skips it. */
  passiveDays?: number;
  /** Skip the adversaries, the other bots or the determinism check (quick tuning runs). */
  adversaries?: boolean;
  others?: boolean;
  determinism?: number;
  base?: BotOptions['base'];
}

export interface AllRuns {
  seed: number;
  active: Trace;
  lazy?: Trace;
  deliver?: Trace;
  idle?: Trace;
  checkin?: Trace;
  passive?: Trace;
  adversaries?: Record<string, Trace>;
  /** Gate 14: whether two event-to-event runs and a 10 Hz run of the first minutes gave the same trace. */
  determinism?: { minutes: number; sameTwice: boolean; same10Hz: boolean; firstDiff: string | null };
  states: Record<number, R.MergeGame>;
}

/** The away marks of gate 9: minutes 30, 60, 120 and every 2 h after, up to `hours`. */
export function awayMarks(hours: number): number[] {
  const out = [1800, 3600, 7200];
  for (let t = 14400; t <= hours * 3600; t += 7200) out.push(t);
  return out.filter((t) => t <= hours * 3600);
}

/** A trace as canonical text (numbers to 9 significant digits, so 10 Hz and event-to-event float sums compare). */
export function canonicalTrace(tr: Trace): string {
  return JSON.stringify(tr, (_k, v) => (typeof v === 'number' ? (Number.isFinite(v) ? Number(v.toPrecision(9)) : String(v)) : v));
}

/**
 * What gate 14 compares between event-to-event and 10 Hz stepping: every action with its time, every
 * purchase, every ticket (lines, when paid, what paid) and the final state. Not the trace's own
 * bookkeeping times (coins and samples are stamped at the end of each step, and 10 Hz has more steps).
 */
export function playKey(run: BotRun): string {
  const tr = run.trace;
  return canonicalTrace({
    actions: tr.actions,
    purchases: tr.purchases,
    tickets: tr.tickets.map((t) => ({ id: t.id, lines: t.lines, gold: t.gold, filled: t.filled, paid: t.paid })),
    cash: run.game.cash,
    merge: run.game.merge,
  } as unknown as Trace);
}

function firstDifference(a: string, b: string): string | null {
  if (a === b) return null;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  return `at character ${i}: …${a.slice(Math.max(0, i - 60), i + 40)}… against …${b.slice(Math.max(0, i - 60), i + 40)}…`;
}

/** Every bot run one seed needs for `evaluate`. Throws NotBuiltError at the first unbuilt rule. */
export function runAll(cfg: R.MergeConfig, o: AllOptions): AllRuns {
  const act = o.act ?? 2;
  const sheet = o.sheet ?? act + 1;
  const hours = o.hours ?? 12;
  const common = { seed: o.seed, act, sheet, base: o.base };
  const active = runMergeBot(cfg, { ...common, kind: 'active', hours, seasons: o.seasons, keepAt: [180, 600, 3600, 9000], awayAt: awayMarks(Math.min(hours, 12)) });
  const out: AllRuns = { seed: o.seed, active: active.trace, states: active.states };
  if (o.others !== false) {
    out.lazy = runMergeBot(cfg, { ...common, kind: 'lazy', hours: 1 }).trace;
    const m3 = active.states[180];
    out.deliver = m3 ? runMergeBot(cfg, { ...common, kind: 'deliver', start: m3, hours: (3600 - m3.stats.playSeconds) / 3600 }).trace : undefined;
    out.idle = runMergeBot(cfg, { ...common, kind: 'idle', hours: 1 }).trace;
    out.checkin = runMergeBot(cfg, { ...common, kind: 'checkin', days: 1 }).trace;
  }
  if ((o.passiveDays ?? 21) > 0) out.passive = runMergeBot(cfg, { ...common, kind: 'passive', days: o.passiveDays ?? 21, seasons: o.seasons }).trace;
  if (o.adversaries !== false) {
    out.adversaries = {};
    for (const h of ['notTonight', 'hoardBoxes', 'sellBuyUndo', 'clockJumps'] as const) out.adversaries[h] = runMergeBot(cfg, { ...common, kind: 'active', hours: 3, seasons: 1, habits: { [h]: true } }).trace;
  }
  if ((o.determinism ?? 10) > 0) {
    const minutes = o.determinism ?? 10;
    const r1 = runMergeBot(cfg, { ...common, hours: minutes / 60 });
    const a = canonicalTrace(r1.trace);
    const b = canonicalTrace(runMergeBot(cfg, { ...common, hours: minutes / 60 }).trace);
    const a0 = playKey(r1);
    const c = playKey(runMergeBot(cfg, { ...common, hours: minutes / 60, hz: 10 }));
    out.determinism = { minutes, sameTwice: a === b, same10Hz: a0 === c, firstDiff: firstDifference(a, b) ?? firstDifference(a0, c) };
  }
  return out;
}

const within = (x: number, lo: number, hi: number) => Number.isFinite(x) && x >= lo - 1e-9 && x <= hi + 1e-9;
const fmt = (x: number | null | undefined, d = 1): string => (x === null || x === undefined || !Number.isFinite(x) ? String(x) : Math.abs(x) >= 1e5 ? x.toPrecision(3) : x.toFixed(d));
const min = (s: number) => s / 60;

/** Every gate of 8.3 (with M2, M3, M23 to M26) on one seed's runs: name, kind, aim, measured value, ok. */
export function evaluate(cfg: R.MergeConfig, all: AllRuns): GateRow[] {
  const rows: GateRow[] = [];
  const row = (name: string, kind: GateRow['kind'], aim: string, value: GateRow['value'], ok: boolean, num?: number | null, lo?: number | null, hi?: number | null) =>
    rows.push(num === undefined ? { name, kind, aim, value, ok } : { name, kind, aim, value, ok, num: Number.isFinite(num as number) ? num : null, lo: lo ?? null, hi: hi ?? null });
  const A = all.active;
  const t0 = A.t0;
  // ---- gate 1 (aims) and M3
  const first = firstTicketPaid(A);
  row('1 first ticket paid (s)', 'aim', '≤ 15', fmt(first), first <= 15, first, null, 15);
  const gaps = payingGaps(A);
  row('1 gap between paying moments, minutes 0-10: median (s)', 'aim', '≤ 30', fmt(gaps.median), gaps.median <= 30, gaps.median, null, 30);
  row('1 gap p90 (s)', 'aim', '≤ 50', fmt(gaps.p90), gaps.p90 <= 50, gaps.p90, null, 50);
  row('1 gap max (s)', 'aim', '≤ 60', fmt(gaps.max), gaps.max <= 60, gaps.max, null, 60);
  row('1 purchases in minutes 0-10', 'aim', '≥ 12', gaps.purchases, gaps.purchases >= 12, gaps.purchases, 12, null);
  const u = usefulPerMinute(A);
  const u19 = u.perMinute.slice(1);
  row('M3 useful actions a minute, minutes 1-9 (lowest)', 'aim', '≥ 16 on every seed (≥ 20 at the median seed: across seeds)', `${Math.min(...u19)} [${u.perMinute.join(' ')}]`, Math.min(...u19) >= 16, Math.min(...u19), 16, null);
  row('M3 longest wait with nothing useful, minutes 0-10 (s)', 'aim', '≤ 10', fmt(u.longestWait), u.longestWait <= 10, u.longestWait, null, 10);
  // ---- gate 2 (M23 aims)
  const st = stallTimes(A, 0);
  const windows: [number, string, number, number][] = [
    [1, 'Tea', 0.75, 1.5],
    [2, 'Steamer', 5, 9],
    [3, 'Sweets', 18, 30],
    [4, 'Noodles', 60, 90],
  ];
  for (const [c, name, lo, hi] of windows) {
    const x = st[c] ?? null;
    row(`2 ${name} stall opens (min)`, 'aim', `${lo} to ${hi}`, x === null ? 'never' : fmt(min(x), 2), x !== null && within(min(x), lo, hi), x === null ? 1e9 : min(x), lo, hi);
  }
  // ---- gate 3 (aims)
  const ft = fillTimes(A, t0, t0 + 3600);
  row('3 ticket fill time, hour 1: median (s)', 'aim', '20 to 60', fmt(median(ft)), within(median(ft), 20, 60), median(ft), 20, 60);
  row('3 ticket fill time, hour 1: p90 (s)', 'aim', '≤ 120', fmt(quantile(ft, 0.9)), quantile(ft, 0.9) <= 120, quantile(ft, 0.9), null, 120);
  const pf = fillTimes(A, t0, t0 + 10800, null, true);
  row('3 Parade fill time, hours 0-3: median (min)', 'aim', '≤ 4', pf.length ? fmt(min(median(pf)), 2) : 'no Parade', pf.length > 0 && median(pf) <= 240, pf.length ? min(median(pf)) : null, null, 4);
  const gf = gearFillCheck(A, t0 + 10800);
  row('3 gear purchases followed by slower tickets (M26: 30 each side, × 1.3)', 'aim', '0', `${gf.bad} of ${gf.total}`, gf.bad === 0, gf.total ? gf.bad / gf.total : 0, null, 0);
  // ---- gate 4 (hard)
  const hon = honesty(A);
  const firstBad = A.tickets.find((t) => t.broken.some((x) => x !== 'priceFell'));
  row('4 tickets breaking a bound of 2.7 at the draw (checkBounds on the state it was drawn on)', 'hard', '0', `${hon.broken} of ${hon.drawn}${firstBad ? ` (${Object.entries(hon.byBound).map(([k, v]) => `${k}: ${v}`).join(', ')}; first: ticket ${firstBad.id} at counter ${firstBad.counter + 1}, ${fmt(firstBad.drawn, 2)} s, ${firstBad.lines.map((l) => `${l.c}.${l.k}`).join('+')})` : ''}`, hon.broken === 0);
  const own = A.tickets.filter((t) => t.ownReading.join() !== t.broken.filter((x) => x !== 'priceFell').join());
  row('report: draws where the bot\'s own reading of 2.7 disagrees with checkBounds', 'report', '0 (a second opinion)', own.length ? `${own.length}: first ticket ${own[0].id} at ${fmt(own[0].drawn)} s, ${own[0].lines.map((l) => `${l.c}.${l.k}`).join('+')}, own [${own[0].ownReading.join(',')}] rules [${own[0].broken.join(',')}]` : 0, true);
  row('4 tickets the active bot finished after a Basket sale', 'hard', '0', hon.basketTickets, hon.basketTickets === 0);
  row('4 tickets whose paid price differs from the shown one', 'hard', '0', hon.shownNotPaid, hon.shownNotPaid === 0);
  row('4 tickets whose shown price fell after the draw (M26)', 'hard', '0', hon.priceFell, hon.priceFell === 0);
  const b3 = boardShares(A, t0, t0 + 10800);
  row('4 "Setting up…" share of counter-seconds, hours 0-3', 'hard', '≤ 1 %', fmt(b3.setup * 100, 2) + ' %', b3.setup <= 0.01);
  if (all.idle) row('4 tickets the idle bot filled (1 h)', 'hard', '0', all.idle.tickets.filter((t) => t.filled !== null).length, all.idle.tickets.every((t) => t.filled === null));
  if (all.checkin) row('4 tickets the check-in bot filled (1 day)', 'hard', '0', all.checkin.tickets.filter((t) => t.filled !== null).length, all.checkin.tickets.every((t) => t.filled === null));
  if (all.deliver) {
    const a3 = all.deliver.t0;
    const ratio = income(all.deliver, a3, t0 + 3600) / Math.max(1e-9, income(A, a3, t0 + 3600));
    row('4 deliver-only bot / active bot, minute 3 to hour 1 (M26)', 'hard', '≤ 0.20', fmt(ratio, 3), ratio <= 0.2);
  }
  // ---- gate 5 (aims)
  const b10 = boardShares(A, t0, t0 + 600);
  row('5 board full (F = 0), hours 0-3', 'aim', '≤ 15 %', fmt(b3.f0 * 100) + ' %', b3.f0 <= 0.15, b3.f0, null, 0.15);
  row('5 board full (F = 0), minutes 0-10', 'aim', '≤ 3 %', fmt(b10.f0 * 100) + ' %', b10.f0 <= 0.03, b10.f0, null, 0.03);
  row('5 deadlock (F = 0, no merge, no delivery), hours 0-3', 'aim', '≤ 2 %', fmt(b3.deadlock * 100) + ' %', b3.deadlock <= 0.02, b3.deadlock, null, 0.02);
  const made = A.goodsMade;
  row('5 Basket sales / goods made', 'aim', '≤ 5 %', fmt((A.basketSales / Math.max(1, made)) * 100, 2) + ' %', A.basketSales / Math.max(1, made) <= 0.05, A.basketSales / Math.max(1, made), null, 0.05);
  row('5 the two highest open chains\' gears waiting, hours 0-3', 'aim', '≤ 20 %', `${fmt(b3.waitTop2 * 100)} % (per chain ${b3.waitChain.map((w) => fmt(w * 100, 0)).join('/')} %)`, b3.waitTop2 <= 0.2, b3.waitTop2, null, 0.2);
  // ---- gate 6 (aims)
  const nv = noveltyGaps(A);
  row('6 longest gap without something new, minutes 0-30 (min)', 'aim', '≤ 3', fmt(min(nv.gap30), 2), nv.gap30 <= 180, min(nv.gap30), null, 3);
  row('6 longest gap without something new, hours 0-3 (min)', 'aim', '≤ 20', fmt(min(nv.gap3h), 2), nv.gap3h <= 1200, min(nv.gap3h), null, 20);
  row('6 longest gap without a first-time tier, hour 1 (min)', 'aim', '≤ 6', fmt(min(nv.tierGapH1), 2), nv.tierGapH1 <= 360, min(nv.tierGapH1), null, 6);
  row('6 longest gap without a first-time tier, hours 1-3 (min)', 'aim', '≤ 15', fmt(min(nv.tierGapH13), 2), nv.tierGapH13 <= 900, min(nv.tierGapH13), null, 15);
  // ---- gate 7 (aim)
  const vpa = valuePerAction(A);
  const r21 = vpa[1] / vpa[0];
  const r32 = vpa[2] / vpa[1];
  row('7 value per bot action, hour 2 / hour 1 and hour 3 / hour 2', 'aim', '≥ 3 each', `${fmt(r21, 2)} / ${fmt(r32, 2)} (${vpa.map((x) => fmt(x, 1)).join(', ')} c an action)`, r21 >= 3 && r32 >= 3, Math.min(r21, r32), 3, null);
  // ---- gate 8 (hard: sources; aims: shares; M24)
  const ub = unbookedCoins(A);
  const traces = [A, all.lazy, all.deliver, all.idle, all.checkin, all.passive, ...Object.values(all.adversaries ?? {})].filter(Boolean) as Trace[];
  const ubAll = traces.reduce((a, tr) => a + unbookedCoins(tr).count, 0);
  row('8 coins only from the six sources of 2.3 (cash changes not booked, every trace)', 'hard', '0', `${ubAll}${ub.count ? ` (active: ${ub.count}, ${fmt(ub.amount)} c)` : ''}`, ubAll === 0);
  const src10 = coinsBySource(A, t0, t0 + 600);
  const inc10 = income(A, t0, t0 + 600);
  row('8 tickets / all coins, minutes 0-10', 'aim', '≥ 60 %', fmt(((src10.ticket ?? 0) / inc10) * 100) + ' %', (src10.ticket ?? 0) / inc10 >= 0.6, (src10.ticket ?? 0) / inc10, 0.6, null);
  for (const X of [10, 60, 180]) {
    const s = shareAt(A, X * 60);
    row(`8 tickets / all coins at minute ${X} (± 5 min)`, 'aim', '≥ 60 %', fmt(s.ticket * 100) + ' %', s.ticket >= 0.6, s.ticket, 0.6, null);
  }
  for (const [X, lo, hi] of [[10, 0.08, 0.25], [30, 0.2, 0.35], [60, 0.2, 0.35], [180, 0.2, 0.35]] as const) {
    const s = shareAt(A, X * 60);
    row(`8 minder share at minute ${X} (± 5 min)`, 'aim', `${lo * 100} to ${hi * 100} %`, fmt(s.minder * 100) + ' %', within(s.minder, lo, hi), s.minder, lo, hi);
  }
  const gs = giftShare(A);
  row('8 gift coins / coins of hours 0-3 (M24)', 'aim', '≤ 15 %', fmt(gs.coinShare * 100) + ' %', gs.coinShare <= 0.15, gs.coinShare, null, 0.15);
  row('8 gift boxes an hour, hours 0-3 (M24)', 'aim', '6 to 12', fmt(gs.boxesPerHour), within(gs.boxesPerHour, 6, 12), gs.boxesPerHour, 6, 12);
  // ---- gate 9 (hard: cross-check; aim: the band)
  const aw = awayRatios(A);
  const crossBad = aw.filter((x) => !x.cross);
  row('9 closed form = event stepping (minder sales, offsets, shelves where comparable)', 'hard', 'every probe', crossBad.length ? `${crossBad.length} of ${aw.length} differ: ${crossBad[0].detail.slice(0, 2).join('; ')}` : `${aw.length} probes agree`, crossBad.length === 0);
  for (const x of aw) row(`9 1 h away with the ad / 1 h of play at minute ${fmt(min(x.t), 0)}${x.late ? ' (Late Hours)' : ''}`, 'aim', '0.25 to 0.6', fmt(x.ratio, 3), within(x.ratio, 0.25, 0.6), x.ratio, 0.25, 0.6);
  // ---- gate 10 (aims, M25)
  const seasons = A.seasons;
  const s1 = seasons.find((s) => s.season === 0)?.festival ?? null;
  row('10 season 1 Festival filled, active (min)', 'aim', '100 to 160', s1 === null ? 'never' : fmt(min(s1)), s1 !== null && within(min(s1), 100, 160), s1 === null ? 1e9 : min(s1), 100, 160);
  const s2 = seasons.find((s) => s.season === 1);
  if (s1 !== null && s2) {
    const n1 = seasons[0].stalls[4];
    const n2 = s2.stalls[4];
    row('10 season 2 Noodles / season 1 Noodles', 'aim', '≤ 0.6', n1 && n2 !== null ? fmt(n2 / n1, 2) : 'never', !!n1 && n2 !== null && n2 / n1 <= 0.6, n1 && n2 !== null ? n2 / n1 : null, null, 0.6);
    row('10 season 2 Festival / season 1 Festival (Puffs open)', 'aim', '0.8 to 1.1', s2.festival !== null ? `${fmt(s2.festival / s1, 2)}${s2.stalls[5] === null ? ' (Puffs never opened)' : ''}` : 'never', s2.festival !== null && s2.stalls[5] !== null && within(s2.festival / s1, 0.8, 1.1), s2.festival !== null ? s2.festival / s1 : null, 0.8, 1.1);
    const later = seasons.filter((s) => s.season >= 2 && s.season <= 9);
    if (later.length) {
      const bad = later.filter((s, i) => s.festival === null || !within(s.festival / s1, 0.5, 0.9) || (i > 0 && later[i - 1].festival !== null && s.festival > 1.1 * (later[i - 1].festival as number)));
      row('10 seasons 3-10 each 50-90 % of season 1, none 10 % longer than the one before', 'aim', 'every season', later.map((s) => (s.festival === null ? '-' : fmt(s.festival / s1, 2))).join(' '), bad.length === 0 && later.length >= 8);
    }
  }
  // ---- gate 11 (aims) and the passive Festival of gate 10
  if (all.passive) {
    const p = passiveDays(all.passive);
    row('10/11 passive: season 1 Festival on day', 'aim', '2 or 3', p.festival ?? 'never', p.festival !== null && within(p.festival, 2, 3));
    row('11 passive: Steamer on day', 'aim', '1', p.steamer ?? 'never', p.steamer === 1);
    row('11 passive: Sweets on day', 'aim', '1 or 2', p.sweets ?? 'never', p.sweets !== null && p.sweets <= 2);
    row('11 passive: Noodles on day', 'aim', '2', p.noodles ?? 'never', p.noodles === 2);
    row('11 passive: advised purchase affordable but unbought', 'aim', '≤ 30 % of session time', fmt(p.affordableUnbought * 100) + ' %', p.affordableUnbought <= 0.3);
    row('11 passive: seasons closed by day 7 / day 21 (soft)', 'report', '4 to 8 by day 21', `${p.seasons7} / ${p.seasons21}`, true);
  }
  // ---- gate 12 (hard): each habit within 5 % of the active bot's income over hours 0-3, or refused by a rule
  if (all.adversaries) {
    const base3 = income(A, t0, t0 + 10800);
    for (const [h, tr] of Object.entries(all.adversaries)) {
      const ratio = income(tr, tr.t0, tr.t0 + 10800) / Math.max(1e-9, base3);
      if (h === 'clockJumps') {
        // The clock habit: the back and second-forward openings pay nothing, and no ad is granted more often than its play-clock cooldown allows (M10).
        const play = tr.t1 - tr.t0;
        const over = Object.entries(tr.jumps.grants).filter(([k, n]) => n > Math.floor(play / Math.max(1, adCooldown(cfg, k))) + 1);
        row('12 adversary "clockJumps": repaid absences / ads beyond their cooldown', 'hard', '0 / 0', `${fmt(tr.jumps.repaid)} c over ${tr.jumps.cycles} cycles / ${over.length ? over.map(([k, n]) => `${k} ${n}`).join(', ') : '0'}`, tr.jumps.repaid <= 0 && over.length === 0);
      } else if (h === 'sellBuyUndo') {
        const undone = tr.actions.filter((x) => x.what === 'undo').length;
        row('12 adversary "sellBuyUndo": income / the active bot\'s (undo after a purchase refused)', 'hard', '≤ 1.05, or every undo refused', `${fmt(ratio, 3)} (${undone} undo accepted)`, ratio <= 1.05 || undone === 0);
      } else row(`12 adversary "${h}": income of hours 0-3 / the active bot's`, 'hard', '≤ 1.05', fmt(ratio, 3), ratio <= 1.05);
    }
  }
  // ---- gate 13 (hard)
  for (const x of oddsCheck(A)) row(`13 odds: ${x.name}`, 'hard', '± 0.5 points of the printed odds (3 standard errors under 100k draws)', x.n ? `${fmt(x.observed * 100, 2)} % against ${fmt(x.expected * 100, 2)} % over ${x.n}` : 'none drawn', x.ok);
  // ---- gate 14 (hard)
  if (all.determinism) {
    const d = all.determinism;
    row(`14 determinism: the same seed twice, and at 10 Hz (${d.minutes} min)`, 'hard', 'identical', d.sameTwice && d.same10Hz ? 'identical' : `differs: ${d.firstDiff}`, d.sameTwice && d.same10Hz);
  }
  // ---- gate 15 (aim)
  if (all.lazy) {
    const ratio = income(all.lazy, all.lazy.t0, all.lazy.t0 + 3600) / Math.max(1e-9, income(A, t0, t0 + 3600));
    row('15 lazy bot / active bot, hour 1', 'aim', '0.4 to 0.7', fmt(ratio, 3), within(ratio, 0.4, 0.7), ratio, 0.4, 0.7);
  }
  // ---- reported (8.4 soft)
  row('report: Not tonight use (share of tickets)', 'report', '≤ 10 %', fmt((A.notTonights / Math.max(1, A.tickets.length)) * 100) + ' %', true);
  row('report: lanterns an hour, hours 1-3', 'report', '≥ 1', fmt(A.lanterns.filter((l) => l.t >= t0 + 3600 && l.t < t0 + 10800).length / 2), true);
  if (all.checkin && all.passive) {
    const day1 = all.passive.sessions.filter((s) => s.day === 1);
    const end1 = day1.length ? day1[day1.length - 1].t1 : all.passive.t0;
    const ratio = income(all.checkin, -Infinity, Infinity, true) / Math.max(1e-9, income(all.passive, -Infinity, end1 + EVENT_LIMIT, true));
    row('report: check-in coins a day / the passive bot\'s day 1', 'report', '0.15 to 0.4', fmt(ratio, 3), true);
  }
  if (A.refused.length) row('report: actions the rules refused that the bot expected to work', 'report', '0', `${A.refused.length} (first: ${A.refused[0].what} at ${fmt(A.refused[0].t)} s)`, true);
  return rows;
}

function adCooldown(cfg: R.MergeConfig, kind: string): number {
  const a = cfg.merge.ads;
  return kind === 'gearRush' ? a.gearRushCooldown : kind === 'callDragon' ? a.callDragonCooldown : a.fillLineCooldown;
}

/** The across-seed aims (M3, M25): useful actions at the median seed ≥ 20 a minute; the slowest season 1 ≤ 1.6 × the fastest. */
export function acrossSeeds(perSeed: { seed: number; useful: number[]; season1: number | null }[]): GateRow[] {
  const rows: GateRow[] = [];
  const mins = Array.from({ length: 9 }, (_, i) => median(perSeed.map((s) => s.useful[i + 1] ?? 0)));
  const lowest = Math.min(...mins);
  rows.push({ name: 'M3 useful actions a minute, minutes 1-9, at the median seed (lowest minute)', kind: 'aim', aim: '≥ 20', value: lowest, ok: lowest >= 20 });
  const s1 = perSeed.map((s) => s.season1).filter((x): x is number => x !== null);
  const ratio = s1.length === perSeed.length && s1.length ? Math.max(...s1) / Math.min(...s1) : NaN;
  rows.push({ name: '10 season 1 Festival: slowest seed / fastest seed (M25)', kind: 'aim', aim: '≤ 1.6', value: Number.isFinite(ratio) ? Number(ratio.toFixed(3)) : 'a seed never filled it', ok: ratio <= 1.6 });
  return rows;
}

/** The facts of one seed that `acrossSeeds` and the tables need, small enough for one JSON line. */
export function seedSummary(all: AllRuns): { seed: number; useful: number[]; season1: number | null; seasons: ReturnType<typeof seasonTable>; cps: Record<number, number>; sources3h: ReturnType<typeof coinsBySource>; passive: ReturnType<typeof passiveDays> | null } {
  const A = all.active;
  return {
    seed: all.seed,
    useful: usefulPerMinute(A).perMinute,
    season1: A.seasons.find((s) => s.season === 0)?.festival ?? null,
    seasons: seasonTable(A),
    cps: coinsPerSecond(A),
    sources3h: coinsBySource(A, A.t0, A.t0 + 10800),
    passive: all.passive ? passiveDays(all.passive) : null,
  };
}

/** The worked tables of 2.12 (the first ten minutes), from the active trace: per window, what happened, coins spent, c/s. */
export function firstTenMinutes(tr: Trace): { from: number; to: number; events: string[]; spent: number; cps: number }[] {
  const marks = [0, 30, 60, 120, 180, 240, 300, 360, 420, 480, 540, 600];
  const out: { from: number; to: number; events: string[]; spent: number; cps: number }[] = [];
  for (let i = 1; i < marks.length; i++) {
    const a = tr.t0 + marks[i - 1];
    const b = tr.t0 + marks[i];
    const events = [
      ...tr.purchases.filter((p) => p.t >= a && p.t < b).map((p) => `${p.kind} ${p.c} (${p.cost})`),
      ...tr.tickets.filter((t) => t.filled !== null && t.filled >= a && t.filled < b).map((t) => `ticket ${t.lines.map((l) => `${l.c}.${l.k}`).join('+')} +${t.paid}`),
      ...tr.novelty.filter((n) => n.t >= a && n.t < b && !n.what.startsWith('stall') && !n.what.startsWith('minder')).map((n) => n.what),
    ];
    const spent = tr.purchases.filter((p) => p.t >= a && p.t < b).reduce((s, p) => s + p.cost, 0);
    out.push({ from: marks[i - 1], to: marks[i], events, spent, cps: income(tr, a, b) / (b - a) });
  }
  return out;
}

/** The worked table of 3.3 (hours one to three): what was new in each window of the active trace. */
export function hoursOneToThree(tr: Trace): { from: number; to: number; events: string[] }[] {
  const w = [30, 50, 70, 100, 120, 150, 210];
  const out: { from: number; to: number; events: string[] }[] = [];
  for (let i = 1; i < w.length; i++) {
    const a = tr.t0 + w[i - 1] * 60;
    const b = tr.t0 + w[i] * 60;
    out.push({ from: w[i - 1], to: w[i], events: [...new Set(tr.novelty.filter((n) => n.t >= a && n.t < b).map((n) => n.what))] });
  }
  return out;
}
