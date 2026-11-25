/**
 * Salvage mode rules (the scrapyard's first yard, docs/design/yard-stage1.md version 2): THE ONE PUBLIC
 * INDEX of src/engine/salvage/*. The store actions (src/modes/salvage/actions.ts), the engine mode
 * (src/engine/salvageMode.ts), the screens (src/ui/salvage) and the bots import the rules from here only.
 *
 * THE CONTRACT, VERSION 2: every public function has its FINAL signature. Bodies marked
 * "// STUB(hour 0)" serve the frozen states and never throw while rendering: a tick advances the clocks
 * and nothing else; an action reports the refusal `notBuilt` and returns the same state (presence only
 * stores the sample); a selector returns the shape with what the state already holds. Real: the
 * formatters, the board's prices, positions, nextEvent, noteSeen, the frame, the table, the top bar,
 * the process board, the goal list, incomeRate.
 *
 * Pure TypeScript, deterministic: time comes in as arguments (`dt`; `clock` = YARD seconds,
 * `g.salvage.t`; `now` = device epoch ms); randomness only from counter hashes of `content.worldSeed`.
 * No React, no Math.random, no Date.now. A screen never computes a price, a rate, a mass or a time
 * itself: it asks here (AGENTS.md).
 *
 * WHO OWNS WHAT BEHIND IT (BUILD.md): rules-sim writes every function that CHANGES state (the tick,
 * time away, the actions, create, reconcile), rules-book every one that only READS it (selectors,
 * prices, formatters, positions are shared). This file is the rules lead's: the two join here.
 */
import type { GameConfig } from '../config/schema';
import type { GameState } from './types';
import { dayWord as dayWordOf, marketDay as marketDayOf, marketTime as marketTimeOf, priceOf as priceOfGrade, secondsToNextDay } from './salvage/board';
import { cardOf as cardOfData, goalListOf, goalOf, processBoardOf, tableOf, topBarOf } from './salvage/cards';
import { createSalvage as createGame, freshSalvage as freshState, reconcileSalvage as reconcileGame } from './salvage/create';
import { frameOf, skipLabelOf } from './salvage/frame';
import {
  bayPos as bayPosOf,
  circlePos as circlePosOf,
  lanePath as lanePathOf,
  machinePos as machinePosOf,
  pileNear as pileNearOf,
  piecePos as piecePosOf,
  placeNear as placeNearOf,
  pointOf,
  skipZone as skipZoneOf,
  spotPos as spotPosOf,
  thingNear as thingNearOf,
  thingPos as thingPosOf,
} from './salvage/positions';
import type {
  Advice,
  AwayCard,
  CardData,
  CardKind,
  CardRef,
  CrewRole,
  DealTerms,
  FrameTable,
  GoalLine,
  GradeId,
  Goal,
  GroundPiece,
  Heading,
  IndustryTable,
  LevelTarget,
  MachineId,
  PileKey,
  PlaceId,
  Presence,
  PriceBoard,
  ProcessBoardRows,
  QueuedEvent,
  RecipeId,
  RefusalKey,
  SalvageConfig,
  SalvageEvent,
  SalvageGame,
  SalvageState,
  SellShown,
  ShopKey,
  SkipLabel,
  Spot,
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
export { fmtDay, fmtDuration, fmtHours, fmtKg, fmtMass, fmtMoney, fmtPct, fmtPrice, fmtRank, fmtRate, fmtTonnes, resolveGrams, roundMoney } from './salvage/money';
export { boardX, hash01 } from './salvage/board';
export { rivalGrams } from './salvage/cards';
export { stockThings } from './salvage/create';
export { loadFamily, pieceAt, specIndex, toolFor } from './salvage/frame';

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
 * One tick (2.14): advances the state by `dt` seconds of live play (at most `away.gapS`; a longer gap
 * goes to the away pass first, 2.14 step 1) and reports the typed events in the order they happened.
 * It adds dt to BOTH `salvage.t` (yard seconds) and `stats.playSeconds` (time played; only here).
 * STUB(hour 0): the clocks advance; nothing else happens.
 */
export function advanceSalvage(cfg: SalvageConfig, g: SalvageGame, dt: number, now: number, events?: SalvageEvent[]): SalvageGame {
  // STUB(hour 0)
  const step = Math.max(0, Math.min(Math.max(MAX_TICK, cfg.salvage.away.gapS), Number.isFinite(dt) ? dt : 0));
  const s = g.salvage;
  const highMs = Math.max(s.clock.highMs + step * 1000, now);
  const day = marketDayOf(cfg.salvage, highMs);
  if (day !== s.clock.day) events?.push({ type: 'day', day });
  return { ...g, stats: { ...g.stats, playSeconds: g.stats.playSeconds + step }, salvage: { ...s, t: s.t + step, clock: { ...s.clock, highMs, day } } };
}

/** The same tick as a value: `{game, events}` (2.14's `tick(content, state, dt, now) → {state, events}`). */
export function tick(cfg: SalvageConfig, g: SalvageGame, dt: number, now: number): { game: SalvageGame; events: SalvageEvent[] } {
  const events: SalvageEvent[] = [];
  return { game: advanceSalvage(cfg, g, dt, now, events), events };
}

/**
 * Time away (2.16): the same `advance` without the boss, capped at awayCap_h (Night watch: the second),
 * measured from max(lastSavedAt, clockHigh). It advances `salvage.t` (never `stats.playSeconds`),
 * bumps `epoch`, pays every collection into `game.cash` through money.ts and leaves the away card in
 * `salvage.away` (THE ONLY away card: the shell shows it).
 * MONEY IS PAID ONCE: `earnings` is ALWAYS 0 and `report` always undefined, because the shared store
 * grants `earnings` on top (paysOnCompute) and shows its own popup from `report`
 * (src/state/store.ts); the cash is already in the returned game.
 * STUB(hour 0): measures the absence, earns nothing, moves nothing.
 */
export function salvageOffline(cfg: SalvageConfig, g: SalvageGame, now: number): { seconds: number; earnings: 0; game: SalvageGame; report: undefined } {
  // STUB(hour 0)
  const raw = (now - Math.max(g.lastSavedAt, g.stats.clockHigh ?? 0, g.salvage.clock.highMs)) / 1000;
  const seconds = Number.isFinite(raw) && raw > 0 ? Math.min(raw, awayCapS(cfg, g)) : 0;
  return { seconds, earnings: 0, game: g, report: undefined };
}

/**
 * The next dated event (E17): the minimum over the state's dated fields (act.endsAt, crew legs, the
 * driver's trip, machines' pieces, the crucible, the round, the drop-off, skips filling, purchases
 * arriving, the next day boundary). The queue is DERIVED: nothing else is saved. A jump is
 * advance(g, nextEvent(g).at). Machines' piece ends are rules-sim's (STUB(hour 0): not listed).
 */
export function nextEvent(cfg: SalvageConfig, g: SalvageGame): QueuedEvent | null {
  const s = g.salvage;
  const out: QueuedEvent[] = [];
  const add = (at: number | null | undefined, kind: QueuedEvent['kind'], ref = '') => {
    if (at !== null && at !== undefined && Number.isFinite(at) && at >= s.t - 1e-6) out.push({ at, kind, ref });
  };
  add(s.act.endsAt, 'act');
  for (const m of s.crew) if (m.t1 > m.t0) add(m.t1, 'crewLeg', m.id);
  if (s.truck.trip) add(s.truck.trip.endsAt, 'driverLeg', s.truck.trip.partner);
  add(s.machines.crucible.endsAt, 'crucible');
  add(s.merchant.endsAt, 'round');
  add(s.dropoff.nextAt, 'dropoffArrival');
  for (const [pid, p] of Object.entries(s.partners)) for (const sk of p.skips) if (sk.phase === 'filling') add(sk.fullAt, 'skipFull', `${pid}.${sk.slot}`);
  for (const a of s.arriving) add(a.at, 'arrival', a.item);
  const nextDayMs = cfg.salvage.board.epochMs + (s.clock.day + 1) * 86_400_000;
  add(s.t + Math.max(0, (nextDayMs - s.clock.highMs) / 1000), 'day');
  out.sort((a, b) => a.at - b.at || a.kind.localeCompare(b.kind) || a.ref.localeCompare(b.ref));
  return out[0] ?? null;
}

/** The away cap, seconds: awayCap_h[0], or [1] with the Night watch. */
export function awayCapS(cfg: SalvageConfig, g: SalvageGame): number {
  return (g.salvage.owned.includes('night') ? cfg.salvage.awayCap_h[1] : cfg.salvage.awayCap_h[0]) * 3600;
}

/**
 * incomeRate (2.13): § collected (collections and deal deliveries) in the last five minutes of yard
 * time ÷ 5, § A MINUTE (the advice line prices against cash + advice.minutes × incomeRate). Real.
 */
export function incomeRate(cfg: SalvageConfig, g: SalvageGame): number {
  void cfg;
  const inc = g.salvage.income;
  const now = Math.floor(g.salvage.t / 60);
  const age = Math.max(0, now - inc.minute);
  const kept = inc.buckets.slice(Math.min(inc.buckets.length, age));
  return kept.reduce((a, x) => a + x, 0) / 5;
}

/** Income § a SECOND for the shared store while played (EngineMode.activeIncome): incomeRate / 60. */
export function activeIncomeRate(cfg: SalvageConfig, g: SalvageGame): number {
  return incomeRate(cfg, g) / 60;
}

/** Income § a second the shared store shows as steady (EngineMode.income): the same measure (the yard has no separate idle rate). */
export function steadyIncomeRate(cfg: SalvageConfig, g: SalvageGame): number {
  return incomeRate(cfg, g) / 60;
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

/** The thing within `reach` of the boss, measured from its footprint's edge (`objects.<id>.size`), or null (D12: one function for the rules, the frame and the bots). */
export function thingNear(cfg: SalvageConfig, g: SalvageGame, x: number, y: number, reach = cfg.salvage.reach.work): string | null {
  return thingNearOf(cfg.salvage, g.salvage.things, x, y, reach);
}

/** Ground pieces within `reach`, nearest first. */
export function pileNear(cfg: SalvageConfig, g: SalvageGame, x: number, y: number, reach = cfg.salvage.reach.pickup): GroundPiece[] {
  return pileNearOf(cfg.salvage, g.salvage.pieces, g.salvage.things, x, y, reach);
}

/** A crew leg's end in metres. */
export function spotPos(cfg: SalvageConfig, g: SalvageGame, spot: Spot): { x: number; y: number } {
  return spotPosOf(cfg.salvage, spot, g.salvage.things, g.salvage.truck);
}

/** Where a grade's bay stands (content, fixed order: never by the order grades were first weighed). */
export function bayPos(cfg: SalvageConfig, grade: GradeId): { x: number; y: number } {
  return bayPosOf(cfg.salvage, grade);
}

/** Where a machine stands (both strippers on the stripper pad). */
export function machinePos(cfg: SalvageConfig, id: MachineId): { x: number; y: number } {
  return machinePosOf(cfg.salvage, id);
}

/** The n-th chalk circle. */
export function circlePos(cfg: SalvageConfig, n: number): { x: number; y: number; r: number } {
  return circlePosOf(cfg.salvage, n);
}

/** A partner's skip zone for a slot (on the lane, at its rule distance). The hook rule and FrameSkip use it. */
export function skipZone(cfg: SalvageConfig, partner: PartnerId, slot: number): { x: number; y: number; w: number; d: number } {
  return skipZoneOf(cfg.salvage, partner, slot);
}

/** The drive from a point through the gate to a partner's skip zone (waypoints). */
export function lanePath(cfg: SalvageConfig, from: { x: number; y: number }, partner: PartnerId, slot = 0): { x: number; y: number }[] {
  return lanePathOf(cfg.salvage, from, partner, slot);
}

// ============================================================================ actions (2.15)

const refuse = (g: SalvageGame, events: SalvageEvent[] | undefined, key: RefusalKey, args: TxtArgs = {}): SalvageGame => {
  events?.push({ type: 'refused', key, args, retry: null });
  return g;
};

/**
 * The screen's presence sample (at most ten a second; at least every staleS/2 in the foreground, under
 * overlays too). Starts, continues and cancels the boss's act and reports its events (Presence's doc).
 * Returns the same object when nothing changed. STUB(hour 0): stores the sample only.
 */
export function setPresence(cfg: SalvageConfig, g: SalvageGame, p: Presence, clock: number, events?: SalvageEvent[]): SalvageGame {
  // STUB(hour 0)
  void events;
  const s = g.salvage;
  const q = s.presence;
  const heading = Number.isFinite(p.heading) ? Math.floor(p.heading as number) : (q.heading ?? 0);
  const same = q.x === p.x && q.y === p.y && q.driving === p.driving && q.moving === p.moving && heading === q.heading && Math.abs(q.standingFor - p.standingFor) < 0.05;
  if (same && clock - s.presenceAt < cfg.salvage.feel.staleS / 2) return g;
  return { ...g, salvage: { ...s, presence: { x: p.x, y: p.y, driving: !!p.driving, moving: !!p.moving, standingFor: Math.max(0, p.standingFor || 0), heading }, presenceAt: clock } };
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
export function setHold(cfg: SalvageConfig, g: SalvageGame, grade: GradeId, on: boolean, clock: number, events?: SalvageEvent[]): SalvageGame {
  void cfg;
  void grade;
  void on;
  void clock;
  // STUB(hour 0)
  return refuse(g, events, 'notBuilt');
}

/** Sell a held bay's stock at the price shown (set aside for the next round); a changed day re-asks ("priceUpdated"). STUB(hour 0). */
export function sell(cfg: SalvageConfig, g: SalvageGame, grade: GradeId, shown: SellShown, now: number, clock: number, events?: SalvageEvent[]): SalvageGame {
  void cfg;
  void grade;
  void shown;
  void now;
  void clock;
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
export function setFromBays(cfg: SalvageConfig, g: SalvageGame, on: boolean, clock: number, events?: SalvageEvent[]): SalvageGame {
  void cfg;
  void on;
  void clock;
  // STUB(hour 0)
  return refuse(g, events, 'notBuilt');
}

/** Sign the supply deal on the terms the card showed. STUB(hour 0). */
export function signDeal(cfg: SalvageConfig, g: SalvageGame, shownTerms: DealTerms, now: number, clock: number, events?: SalvageEvent[]): SalvageGame {
  void cfg;
  void shownTerms;
  void now;
  void clock;
  // STUB(hour 0)
  return refuse(g, events, 'notBuilt');
}

/** The deal card's Not now (the goal may be skipped). STUB(hour 0). */
export function declineDeal(cfg: SalvageConfig, g: SalvageGame, clock: number, events?: SalvageEvent[]): SalvageGame {
  void cfg;
  void clock;
  // STUB(hour 0)
  return refuse(g, events, 'notBuilt');
}

/** "Step out" of the truck: its stopped place and heading (from the world; null: the last presence) become rules state; refused `stopFirst` while it moves. STUB(hour 0). */
export function stepOut(cfg: SalvageConfig, g: SalvageGame, at: { x: number; y: number; heading: Heading } | null, clock: number, events?: SalvageEvent[]): SalvageGame {
  void cfg;
  void at;
  void clock;
  // STUB(hour 0)
  return refuse(g, events, 'notBuilt');
}

/** The goal card's Not now on an optional goal (refused `nothing` when it is not the current optional goal). Real. */
export function skipGoal(cfg: SalvageConfig, g: SalvageGame, id: string, clock: number, events?: SalvageEvent[]): SalvageGame {
  void clock;
  const cur = goalOf(cfg.salvage, g);
  if (!cur || cur.id !== id || !cur.optional) return refuse(g, events, 'nothing');
  return { ...g, salvage: { ...g.salvage, goals: { ...g.salvage.goals, skipped: [...g.salvage.goals.skipped, id] } } };
}

/** The screen saw a place's label or opened a card (every "first time" text reads `seen`). Same object when already seen. Real. */
export function noteSeen(cfg: SalvageConfig, g: SalvageGame, seen: { place?: PlaceId; card?: CardKind }, clock: number): SalvageGame {
  void cfg;
  void clock;
  const s = g.salvage;
  const addPlace = seen.place !== undefined && !s.seen.places.includes(seen.place);
  const addCard = seen.card !== undefined && !s.seen.cards.includes(seen.card);
  if (!addPlace && !addCard) return g;
  return { ...g, salvage: { ...s, seen: { places: addPlace ? [...s.seen.places, seen.place as string] : s.seen.places, cards: addCard ? [...s.seen.cards, seen.card as CardKind] : s.seen.cards } } };
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

/** The price board (4.4): today's rows, five days, day words, Hold and Sell; the first opening's hint while `seen.cards` lacks 'board'. STUB(hour 0): the rows of the bays with today's prices, no Sell. */
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
    aside_g: b.aside.reduce((a, x) => a + x.g, 0),
    hold: { label: { key: 'card.hold' as const }, action: { act: 'setHold' as const, grade, on: !b.held }, refusal: null },
    sell: null,
  }));
  const hint = g.salvage.seen.cards.includes('board') ? null : { key: 'board.firstHint' as const, args: {} };
  return { day, nextInS: secondsToNextDay(cfg.salvage, ms), rows, hint };
}

/**
 * The label of a partner's skip the truck would take: the skip full LONGEST (smallest fullAt), else
 * the one that fills first (2.7, the lead's ruling). `clock` is the yard second. STUB(hour 0): the
 * filling countdown only, no cash or floor refusal.
 */
export function skipLabel(cfg: SalvageConfig, g: SalvageGame, partner: PartnerId, clock: number): SkipLabel | null {
  // STUB(hour 0)
  void clock;
  const all = skipLabels(cfg, g, partner);
  return all.filter((l) => l.state !== 'filling').sort((a, b) => a.fullAt - b.fullAt)[0] ?? all.sort((a, b) => a.fullAt - b.fullAt)[0] ?? null;
}

/** Every skip in rotation of a partner (the Partners tab), slot order. */
export function skipLabels(cfg: SalvageConfig, g: SalvageGame, partner: PartnerId): SkipLabel[] {
  const p = g.salvage.partners[partner];
  if (!p) return [];
  return p.skips.map((sk) => skipLabelOf(cfg.salvage, g, partner, sk.slot)).filter((x): x is SkipLabel => !!x);
}

/**
 * E19's reserve: the price of a skip full within advice.reserveS that the driver can fetch ("kept for
 * the next load: §x" on the rota); the advice line and the bots never spend below it; it refuses
 * nothing. Derived (never saved). STUB(hour 0): 0.
 */
export function reserve(cfg: SalvageConfig, g: SalvageGame): number {
  void cfg;
  void g;
  // STUB(hour 0)
  return 0;
}

/** The tickets of the history, newest last (at most 50). */
export function tickets(g: SalvageGame): readonly Ticket[] {
  return g.salvage.tickets;
}

/** The goal card, or null after the last goal: the first goal of content neither done nor skipped (by id). STUB(hour 0): no done test, no meter. */
export function nextGoal(cfg: SalvageConfig, g: SalvageGame): Goal | null {
  return goalOf(cfg.salvage, g);
}

/** The clipboard's goal list: every goal with its state (done ticked). */
export function goalList(cfg: SalvageConfig, g: SalvageGame): GoalLine[] {
  return goalListOf(cfg.salvage, g);
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
