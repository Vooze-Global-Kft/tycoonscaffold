/**
 * The working context of one transition (an action, a tick, a jump, an away pass) and the market clock
 * (yard-stage1.md 2.8, 2.14, S14). Owner: rules-sim.
 *
 * Every transition works on a DRAFT: the salvage state deep-copied once (`clone`), changed in place by
 * the rule modules, and returned as a new game (`finish`). The caller's state is never touched: a
 * refusal returns the caller's object itself.
 */
import type { SalvageContent } from '../../config/schema.salvage';
import { marketDay } from './board';
import { lotPrice } from './content';
import { roundMoney } from './money';
import type { SalvageConfig, SalvageEvent, SalvageGame, SalvageState, Ticket } from './types';

const DAY_MS = 86_400_000;

/** A deep copy of plain data (objects and arrays; numbers, strings, booleans and null as they are). */
export function clone<T>(x: T): T {
  if (x === null || typeof x !== 'object') return x;
  if (Array.isArray(x)) {
    const out = new Array(x.length);
    for (let i = 0; i < x.length; i++) out[i] = clone(x[i]);
    return out as unknown as T;
  }
  const out: Record<string, unknown> = {};
  for (const k in x as Record<string, unknown>) out[k] = clone((x as Record<string, unknown>)[k]);
  return out as T;
}

/** What an away pass gathers for its card (2.16). */
export interface AwayAcc {
  lines: Record<string, { g: number; money: number }>;
  money: number;
  supplied0: number;
  loads: number;
  deliveries: number;
  passed: string[];
}

export interface Ctx {
  cfg: SalvageConfig;
  c: SalvageContent;
  s: SalvageState;
  cash: number;
  earned: number;
  ev: SalvageEvent[];
  /** False in the away pass: no boss acts, no foreman, the hand stripper idle (2.16). */
  live: boolean;
  /** Market ms at yard second `s.t` (moves with the yard clock inside a transition). */
  ms0: number;
  t0: number;
  away: AwayAcc | null;
  /** Something the checks read changed (counts, supplied, owned, crew): run them at this instant's end. */
  dirty: boolean;
  /** Prices met in this transition (a pure function of the day: memoised here only). */
  prices: Map<string, number>;
  /** Yard second the checks last ran (the away pass runs them at most every CHECK_EVERY_S). */
  checkedAt: number;
}

/** In the away pass the instant's checks run at most this often (yard seconds), and at its end. */
export const CHECK_EVERY_S = 5;

export function begin(cfg: SalvageConfig, g: SalvageGame, events: SalvageEvent[] | undefined, live = true): Ctx {
  const s = clone(g.salvage);
  if (!s.counts) s.counts = {};
  return { cfg, c: cfg.salvage, s, cash: g.cash, earned: 0, ev: events ?? [], live, ms0: s.clock.highMs, t0: s.t, away: null, dirty: true, prices: new Map(), checkedAt: -Infinity };
}

/** The new game from a draft: cash, lifetime earnings and the salvage state. */
export function finish(g: SalvageGame, x: Ctx, playDt = 0): SalvageGame {
  return {
    ...g,
    cash: roundMoney(x.cash),
    lifetimeEarnings: roundMoney((g.lifetimeEarnings ?? 0) + x.earned),
    stats: playDt > 0 ? { ...g.stats, playSeconds: g.stats.playSeconds + playDt } : g.stats,
    salvage: x.s,
  };
}

/** Market ms at yard second t inside a transition (the yard clock and the market clock move together). */
export function msAt(x: Ctx, t: number): number {
  return x.ms0 + (t - x.t0) * 1000;
}

/** The market day at yard second t. */
export function dayAt(x: Ctx, t: number): number {
  return marketDay(x.c, msAt(x, t));
}

/** The yard second of the next day boundary after the draft's current day. */
export function nextDayAt(x: Ctx): number {
  const nextMs = x.c.board.epochMs + (x.s.clock.day + 1) * DAY_MS;
  return x.s.t + Math.max(0, (nextMs - msAt(x, x.s.t)) / 1000);
}

/** Money in (2.3: only collected lots, Sell's set-aside lots when collected, and deliveries): cash, the income buckets, lifetime. */
export function earn(x: Ctx, amount: number, t: number): void {
  const a = roundMoney(amount);
  if (a <= 0) return;
  x.cash = roundMoney(x.cash + a);
  x.earned += a;
  x.dirty = true;
  const inc = x.s.income;
  const minute = Math.floor(t / 60);
  if (minute > inc.minute) {
    const shift = Math.min(inc.buckets.length, minute - inc.minute);
    inc.buckets = [...inc.buckets.slice(shift), ...new Array(shift).fill(0)];
    inc.minute = minute;
  }
  inc.buckets[inc.buckets.length - 1] = roundMoney(inc.buckets[inc.buckets.length - 1] + a);
  if (x.away) x.away.money = roundMoney(x.away.money + a);
}

/** Money out (a purchase, a load's price): never below zero (the checks refuse first). */
export function spend(x: Ctx, amount: number): void {
  x.cash = roundMoney(x.cash - roundMoney(amount));
  x.dirty = true;
}

/** One more of a counter the goals read. */
export function count(x: Ctx, key: string, n = 1): void {
  const c = x.s.counts!;
  c[key] = (c[key] ?? 0) + n;
  x.dirty = true;
}

/** Print a ticket into the history (the last 50) and return it numbered. */
export function printTicket<T extends Ticket>(x: Ctx, t: T): T {
  x.s.tickets.push(t);
  if (x.s.tickets.length > 50) x.s.tickets.splice(0, x.s.tickets.length - 50);
  return t;
}

/** The next ticket number and the base fields of a ticket printed at yard second t. */
export function ticketBase(x: Ctx, t: number): { no: number; at: number; day: number } {
  const no = x.s.ticketNo;
  x.s.ticketNo = no + 1;
  return { no, at: t, day: dayAt(x, t) };
}

/** A presence sample counts while it is fresh (2.1: older than feel.staleS = backgrounded = no boss). */
export function bossFresh(x: Ctx, t: number): boolean {
  return x.live && x.s.presenceAt >= 0 && t - x.s.presenceAt <= x.c.feel.staleS + 1e-9;
}

// ---------------------------------------------------------------------------------------- the foreman (2.6)

const BOOST_EPS = 1e-6;

/**
 * Is the foreman's boost on at yard second t (2.6, master 3.4)? Live play only (never away), the boss
 * worked within the last `foreman.windowS`, the day's `minutesPerDay` not used up, someone to boost
 * (a crew member). The same condition the frame's vest meter reads (frame.ts).
 */
export function boostOn(x: Ctx, t: number): boolean {
  const f = x.c.foreman;
  const fm = x.s.foreman;
  if (!x.live || f.boost <= 0 || fm.lastWorkAt < 0 || fm.day !== x.s.clock.day || x.s.crew.length === 0) return false;
  return t - fm.lastWorkAt < f.windowS - BOOST_EPS && fm.used_s < f.minutesPerDay * 60 - BOOST_EPS;
}

/** The rate factor of crew and machines at t: 1 + foreman.boost while the boost is on, else 1. */
export function boostFactor(x: Ctx, t: number): number {
  return boostOn(x, t) ? 1 + x.c.foreman.boost : 1;
}

/** The yard second the boost ends (the `boostEnd` event; derived, never saved), or null when it is off. */
export function boostEndsAt(x: Ctx): number | null {
  const t = x.s.t;
  if (!boostOn(x, t)) return null;
  const fm = x.s.foreman;
  return Math.min(fm.lastWorkAt + x.c.foreman.windowS, t + (x.c.foreman.minutesPerDay * 60 - fm.used_s));
}

/** Count the boost's seconds from the draft's clock to `to` (the boost is constant between events). */
export function accrueBoost(x: Ctx, to: number): void {
  const t = x.s.t;
  if (to <= t || !boostOn(x, t)) return;
  const fm = x.s.foreman;
  fm.used_s = Math.min(x.c.foreman.minutesPerDay * 60, fm.used_s + (to - t));
}

/** How long the boss has stood still at yard second t (0 while moving), from the last sample. */
export function standingFor(x: Ctx, t: number): number {
  const p = x.s.presence;
  if (p.moving) return 0;
  return p.standingFor + Math.max(0, t - x.s.presenceAt);
}

/** A lot's price of a grade on day D (content.ts lotPrice), memoised for the transition. */
export function priceAt(x: Ctx, grade: string, day: number): number {
  const k = `${grade}|${day}`;
  let p = x.prices.get(k);
  if (p === undefined) {
    p = lotPrice(x.c, grade, day);
    x.prices.set(k, p);
  }
  return p;
}
