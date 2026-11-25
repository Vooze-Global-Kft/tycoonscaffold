/**
 * Salvage mode rules (the scrapyard's first yard, docs/design/yard-stage1.md version 2): THE ONE PUBLIC
 * INDEX of src/engine/salvage/*. The store actions (src/modes/salvage/actions.ts), the engine mode
 * (src/engine/salvageMode.ts), the screens (src/ui/salvage) and the bots import the rules from here only.
 *
 * HOUR 0 (section 9): every public function has its FINAL signature. Bodies marked "// STUB(hour 0)"
 * serve the frozen states and never throw while rendering: a tick advances the clock and nothing else;
 * an action reports the refusal `notBuilt` and returns the same state (presence only stores the
 * sample); a selector returns the shape with what the state already holds. The formatters, the board's
 * prices, positions, the frame, the table and the process board are real.
 *
 * Pure TypeScript, deterministic: time comes in as arguments (`dt`, `clock` = play seconds, `now` =
 * device epoch ms); randomness only from counter hashes of `content.worldSeed`. No React, no
 * Math.random, no Date.now. A screen never computes a price, a rate, a mass or a time itself: it asks
 * here (AGENTS.md).
 */
import type { GameConfig } from '../config/schema';
import type { GameState } from './types';
import { dayWord as dayWordOf, marketDay as marketDayOf, marketTime as marketTimeOf, priceOf as priceOfGrade, secondsToNextDay } from './salvage/board';
import { cardOf as cardOfData, goalOf, processBoardOf, tableOf, topBarOf } from './salvage/cards';
import { createSalvage as createGame, freshSalvage as freshState, reconcileSalvage as reconcileGame } from './salvage/create';
import { frameOf } from './salvage/frame';
import { piecePos as piecePosOf, placeNear as placeNearOf, pointOf, thingPos as thingPosOf } from './salvage/positions';
import type {
  Advice,
  AwayCard,
  CardData,
  CardRef,
  CrewRole,
  DealTerms,
  FrameTable,
  GradeId,
  Goal,
  IndustryTable,
  LevelTarget,
  PileKey,
  Presence,
  PriceBoard,
  ProcessBoardRows,
  RecipeId,
  RefusalKey,
  SalvageConfig,
  SalvageEvent,
  SalvageGame,
  SalvageState,
  SellShown,
  ShopKey,
  SkipLabel,
  ThingAt,
  Ticket,
  TopBar,
  TxtArgs,
  PartnerId,
} from './salvage/types';
import { MAX_TICK } from './salvage/types';

export type * from './salvage/types';
export { MAX_TICK, REFUSAL_KEYS, SAVE_TAG, TEXT_KEYS } from './salvage/types';
export { NotBuiltError } from './salvage/notBuilt';
export { fmtDuration, fmtMass, fmtMoney, fmtPct, fmtPrice, fmtRank, resolveGrams, roundMoney } from './salvage/money';
export { boardX, hash01 } from './salvage/board';
export { rivalGrams, rivalNameId } from './salvage/cards';
export { stockThings } from './salvage/create';

// ============================================================================ the config and the state

/** True for a config of mode "salvage" whose block was parsed (src/engine/salvageMode.ts `config`). */
export function isSalvage(cfg: GameConfig): cfg is SalvageConfig {
  const s = cfg.salvage as { grades?: unknown; map?: unknown } | undefined;
  return cfg.mode === 'salvage' && !!s && typeof s.grades === 'object' && typeof s.map === 'object';
}

/** A fresh salvage state at device time `now` (epoch ms): the full yard of E1. */
export function freshSalvage(cfg: SalvageConfig, now: number): SalvageState {
  return freshState(cfg.salvage, now);
}

/** The shared state with a fresh salvage state. */
export function createSalvage(cfg: SalvageConfig, base: GameState, now: number): SalvageGame {
  return createGame(cfg, base, now);
}

/** A loaded save repaired against the content; never throws for readable input (salvageMode catches the rest). */
export function reconcileSalvage(cfg: SalvageConfig, base: GameState, raw: unknown, now: number): SalvageGame {
  return reconcileGame(cfg, base, raw, now);
}

/** The state, with `salvage` made when a bare shared state (a test) has none. */
export function withSalvageFields(cfg: SalvageConfig, g: GameState, now = 0): SalvageGame {
  const s = g as SalvageGame;
  return s.salvage ? s : createSalvage(cfg, g, now);
}

// ============================================================================ time (2.8, 2.12, 2.14, 2.16)

/**
 * One tick (2.14): advances the state by `dt` seconds (at most MAX_TICK; the store's longer gaps go to
 * the away pass) and reports the typed events. It adds `stats.playSeconds` itself (EngineMode).
 * STUB(hour 0): the play clock and the market clock's high mark advance; nothing else happens.
 */
export function advanceSalvage(cfg: SalvageConfig, g: SalvageGame, dt: number, now: number, events?: SalvageEvent[]): SalvageGame {
  // STUB(hour 0)
  const step = Math.max(0, Math.min(MAX_TICK, Number.isFinite(dt) ? dt : 0));
  const s = g.salvage;
  const highMs = Math.max(s.clock.highMs + step * 1000, now);
  const day = marketDayOf(cfg.salvage, highMs);
  if (day !== s.clock.day) events?.push({ type: 'day', day });
  return { ...g, stats: { ...g.stats, playSeconds: g.stats.playSeconds + step }, salvage: { ...s, clock: { ...s.clock, highMs, day } } };
}

/** The same tick as a value: `{game, events}` (2.14's `tick(content, state, dt, now) → {state, events}`). */
export function tick(cfg: SalvageConfig, g: SalvageGame, dt: number, now: number): { game: SalvageGame; events: SalvageEvent[] } {
  const events: SalvageEvent[] = [];
  return { game: advanceSalvage(cfg, g, dt, now, events), events };
}

/**
 * Time away (2.16): the same engine without the boss, capped at awayCap_h (Night watch: the second),
 * measured from max(lastSavedAt, clockHigh). Returns the earnings (paid when computed: paysOnCompute),
 * the advanced game with its away card waiting, and the card as the report.
 * STUB(hour 0): measures the absence, earns nothing, moves nothing.
 */
export function salvageOffline(cfg: SalvageConfig, g: SalvageGame, now: number): { seconds: number; earnings: number; game: SalvageGame; report: AwayCard | null } {
  // STUB(hour 0)
  const raw = (now - Math.max(g.lastSavedAt, g.stats.clockHigh ?? 0, g.salvage.clock.highMs)) / 1000;
  const seconds = Number.isFinite(raw) && raw > 0 ? Math.min(raw, awayCapS(cfg, g)) : 0;
  return { seconds, earnings: 0, game: g, report: null };
}

/** The away cap, seconds: awayCap_h[0], or [1] with the Night watch. */
export function awayCapS(cfg: SalvageConfig, g: SalvageGame): number {
  return (g.salvage.owned.includes('night') ? cfg.salvage.awayCap_h[1] : cfg.salvage.awayCap_h[0]) * 3600;
}

/** Steady income § a second without the boss (the rate engine's; EngineMode.income). STUB(hour 0): 0. */
export function incomeRate(cfg: SalvageConfig, g: SalvageGame): number {
  void cfg;
  void g;
  // STUB(hour 0)
  return 0;
}

/** Income § a second while played: the steady rate plus the boss's collected sales of the last five minutes (2.10). STUB(hour 0): 0. */
export function activeIncomeRate(cfg: SalvageConfig, g: SalvageGame): number {
  void cfg;
  void g;
  // STUB(hour 0)
  return 0;
}

/** Rated capacity R, t/h: the rate engine's throughput of the assets with full feed and no boss (2.11). STUB(hour 0): 0. */
export function ratedCapacity(cfg: SalvageConfig, g: SalvageGame): number {
  void cfg;
  void g;
  // STUB(hour 0)
  return 0;
}

/** The market time t_m, epoch ms (never behind the saved high mark). */
export function marketTime(g: SalvageGame, now: number): number {
  return marketTimeOf(g, now);
}

/** Market day D of a market time (ms). */
export function marketDay(cfg: SalvageConfig, ms: number): number {
  return marketDayOf(cfg.salvage, ms);
}

/** The posted price of a grade on market day D, § a kilogram (2.8; pure in D). */
export function priceOf(cfg: SalvageConfig, grade: GradeId, day: number): number {
  return priceOfGrade(cfg.salvage, grade, day);
}

/** The day word of a grade on day D: low, usual, high. */
export function dayWord(cfg: SalvageConfig, grade: GradeId, day: number): 'low' | 'usual' | 'high' {
  return dayWordOf(cfg.salvage, grade, day);
}

// ============================================================================ positions (S9, S19, S23)

/** Where a whole thing stands, metres. */
export function thingPos(cfg: SalvageConfig, at: ThingAt): { x: number; y: number } {
  return thingPosOf(cfg.salvage, at);
}

/** Where the k-th piece of a pile lies, metres (one function for the rules, the frame, the screen and the bots). */
export function piecePos(cfg: SalvageConfig, pile: PileKey, k: number, thingAt?: (uid: string) => ThingAt | null): { x: number; y: number } {
  return piecePosOf(cfg.salvage, pile, k, thingAt);
}

/** A map point, metres. */
export function point(cfg: SalvageConfig, id: string): { x: number; y: number } {
  return pointOf(cfg.salvage, id);
}

/** The place with a card the boss stands at (within reach.place of its footprint), or null: "Open" shows there. */
export function placeNear(cfg: SalvageConfig, x: number, y: number): string | null {
  return placeNearOf(cfg.salvage, x, y);
}

// ============================================================================ actions (2.15)

const refuse = (g: SalvageGame, events: SalvageEvent[] | undefined, key: RefusalKey, args: TxtArgs = {}): SalvageGame => {
  events?.push({ type: 'refused', key, args });
  return g;
};

/** The screen's presence sample (at most ten a second). Returns the same object when nothing changed. STUB(hour 0): stores the sample only. */
export function setPresence(cfg: SalvageConfig, g: SalvageGame, p: Presence, clock: number): SalvageGame {
  // STUB(hour 0)
  const s = g.salvage;
  const q = s.presence;
  const same = q.x === p.x && q.y === p.y && q.driving === p.driving && q.moving === p.moving && Math.abs(q.standingFor - p.standingFor) < 0.05;
  if (same && clock - s.presenceAt < cfg.salvage.feel.staleS / 2) return g;
  return { ...g, salvage: { ...s, presence: { x: p.x, y: p.y, driving: !!p.driving, moving: !!p.moving, standingFor: Math.max(0, p.standingFor || 0) }, presenceAt: clock } };
}

/** Buy a tool, carrier, machine, the truck, a recipe or the Night watch at the price the card showed. STUB(hour 0). */
export function buy(cfg: SalvageConfig, g: SalvageGame, item: ShopKey, shownPrice: number, clock: number, events?: SalvageEvent[]): SalvageGame {
  void cfg;
  void item;
  void shownPrice;
  void clock;
  // STUB(hour 0)
  return refuse(g, events, 'notBuilt');
}

/** Hire a crew member of a role at the price the rota showed. STUB(hour 0). */
export function hire(cfg: SalvageConfig, g: SalvageGame, role: CrewRole, shownPrice: number, clock: number, events?: SalvageEvent[]): SalvageGame {
  void cfg;
  void role;
  void shownPrice;
  void clock;
  // STUB(hour 0)
  return refuse(g, events, 'notBuilt');
}

/** Buy the next level of a crew member or a machine at the price shown. STUB(hour 0). */
export function level(cfg: SalvageConfig, g: SalvageGame, target: LevelTarget, shownPrice: number, clock: number, events?: SalvageEvent[]): SalvageGame {
  void cfg;
  void target;
  void shownPrice;
  void clock;
  // STUB(hour 0)
  return refuse(g, events, 'notBuilt');
}

/** Keep a bay off the merchant's round, or release it (free). STUB(hour 0). */
export function setHold(cfg: SalvageConfig, g: SalvageGame, grade: GradeId, on: boolean, events?: SalvageEvent[]): SalvageGame {
  void cfg;
  void grade;
  void on;
  // STUB(hour 0)
  return refuse(g, events, 'notBuilt');
}

/** Sell a held bay's stock at the price shown (set aside for the next round); a changed day re-asks ("priceUpdated"). STUB(hour 0). */
export function sell(cfg: SalvageConfig, g: SalvageGame, grade: GradeId, shown: SellShown, now: number, events?: SalvageEvent[]): SalvageGame {
  void cfg;
  void grade;
  void shown;
  void now;
  // STUB(hour 0)
  return refuse(g, events, 'notBuilt');
}

/** Change the crucible's recipe; with a heel, first `confirmHeel` (refusal "confirmHeel" asks); refused during a heat. STUB(hour 0). */
export function setRecipe(cfg: SalvageConfig, g: SalvageGame, recipe: RecipeId, confirmHeel: boolean, clock: number, events?: SalvageEvent[]): SalvageGame {
  void cfg;
  void recipe;
  void confirmHeel;
  void clock;
  // STUB(hour 0)
  return refuse(g, events, 'notBuilt');
}

/** "Take from bays" on the crucible's card. STUB(hour 0). */
export function setFromBays(cfg: SalvageConfig, g: SalvageGame, on: boolean, events?: SalvageEvent[]): SalvageGame {
  void cfg;
  void on;
  // STUB(hour 0)
  return refuse(g, events, 'notBuilt');
}

/** Sign the supply deal on the terms the card showed. STUB(hour 0). */
export function signDeal(cfg: SalvageConfig, g: SalvageGame, shownTerms: DealTerms, now: number, events?: SalvageEvent[]): SalvageGame {
  void cfg;
  void shownTerms;
  void now;
  // STUB(hour 0)
  return refuse(g, events, 'notBuilt');
}

/** The deal card's Not now (the goal may be skipped). STUB(hour 0). */
export function declineDeal(cfg: SalvageConfig, g: SalvageGame, events?: SalvageEvent[]): SalvageGame {
  void cfg;
  // STUB(hour 0)
  return refuse(g, events, 'notBuilt');
}

/** "Step out" of the truck (the truck's stopped place becomes rules state). STUB(hour 0). */
export function stepOut(cfg: SalvageConfig, g: SalvageGame, clock: number, events?: SalvageEvent[]): SalvageGame {
  void cfg;
  void clock;
  // STUB(hour 0)
  return refuse(g, events, 'notBuilt');
}

/** The away card's OK: the card goes (its money was paid when computed). */
export function ackAway(cfg: SalvageConfig, g: SalvageGame): SalvageGame {
  void cfg;
  if (!g.salvage.away) return g;
  return { ...g, salvage: { ...g.salvage, away: null } };
}

// ============================================================================ prices of purchases (2.11, E2)

/** The price a card shows for a shop item now (payback-priced in content), or null when it is not for sale (owned, gated, unknown). STUB(hour 0): the content price unless owned. */
export function shopPrice(cfg: SalvageConfig, g: SalvageGame, item: ShopKey): number | null {
  // STUB(hour 0)
  const it = cfg.salvage.shop.find((i) => i.key === item);
  if (!it || g.salvage.owned.includes(item)) return null;
  return it.price;
}

/** The price of the next level of a crew member or a machine, or null at the top level. STUB(hour 0): null. */
export function levelPrice(cfg: SalvageConfig, g: SalvageGame, target: LevelTarget): number | null {
  void cfg;
  void g;
  void target;
  // STUB(hour 0)
  return null;
}

// ============================================================================ selectors (what the screens print)

/** Everything the world draws (types.ts FrameTable). */
export function frame(cfg: SalvageConfig, g: SalvageGame): FrameTable {
  return frameOf(cfg.salvage, g);
}

/** The top bar: cash, the ladder chip, carry. */
export function topBar(cfg: SalvageConfig, g: SalvageGame): TopBar {
  return topBarOf(cfg.salvage, g);
}

/** The card of a place or an overlay, as data (each row with its exact price and refusal). STUB(hour 0): kind and title, no rows. */
export function cardOf(cfg: SalvageConfig, g: SalvageGame, ref: CardRef, now: number): CardData {
  void now;
  return cardOfData(cfg.salvage, g, ref);
}

/** The price board (4.4): today's rows, five days, day words, Hold and Sell. STUB(hour 0): the rows of the bays with today's prices, no buttons' refusals. */
export function priceBoard(cfg: SalvageConfig, g: SalvageGame, now: number): PriceBoard {
  // STUB(hour 0)
  const ms = marketTime(g, now);
  const day = marketDay(cfg, ms);
  const rows = Object.entries(g.salvage.bays).map(([grade, b]) => ({
    grade,
    icon: cfg.salvage.grades[grade]?.sprite ?? 'piece.unknown',
    price: priceOf(cfg, grade, day),
    days: [4, 3, 2, 1, 0].map((k) => priceOf(cfg, grade, day - k)),
    pbar: cfg.salvage.grades[grade]?.pbar ?? 0,
    word: dayWord(cfg, grade, day),
    bay_g: b.g,
    held: b.held,
    reserved_g: b.forCrucible_g + b.forDeal_g,
    hold: { label: { key: 'card.hold' as const }, action: { act: 'setHold' as const, grade, on: !b.held }, refusal: null },
    sell: null,
  }));
  return { day, nextInS: secondsToNextDay(cfg.salvage, ms), rows, hint: null };
}

/** The skip label of a partner (2.7). STUB(hour 0): contents and price from the state, no refusal computed. */
export function skipLabel(cfg: SalvageConfig, g: SalvageGame, partner: PartnerId, clock: number): SkipLabel | null {
  // STUB(hour 0)
  const p = g.salvage.partners[partner];
  if (!p) return null;
  const things = Object.entries(p.skip.contents).map(([obj, n]) => {
    const o = cfg.salvage.objects[obj];
    return { obj, n, grade: o?.whole ?? o?.pieces[0]?.[0] ?? '', g: (o?.gross_g ?? 0) * n };
  });
  const state = p.skip.phase === 'filling' ? 'filling' : p.skip.trial ? 'trial' : 'full';
  return { partner, state, net_g: p.skip.mass_g, things, price: p.skip.price, refusal: null, fullInS: p.skip.phase === 'filling' ? Math.max(0, p.skip.fullAt - clock) : null };
}

/** The tickets of the history, newest last (at most 50). */
export function tickets(g: SalvageGame): readonly Ticket[] {
  return g.salvage.tickets;
}

/** The goal card's line, or null after the last goal. STUB(hour 0): by index, no done test. */
export function nextGoal(cfg: SalvageConfig, g: SalvageGame): Goal | null {
  return goalOf(cfg.salvage, g);
}

/** The advice line (2.10), or null. STUB(hour 0): null. */
export function advice(cfg: SalvageConfig, g: SalvageGame, now: number): Advice | null {
  void cfg;
  void g;
  void now;
  // STUB(hour 0)
  return null;
}

/** The industry table (2.11). */
export function industryTable(cfg: SalvageConfig, g: SalvageGame): IndustryTable {
  return tableOf(cfg.salvage, g);
}

/** The process board (2.5, 4.5). */
export function processBoard(cfg: SalvageConfig, g: SalvageGame): ProcessBoardRows {
  return processBoardOf(cfg.salvage, g);
}

/** The waiting away card, or null. */
export function awayCard(g: SalvageGame): AwayCard | null {
  return g.salvage.away;
}
