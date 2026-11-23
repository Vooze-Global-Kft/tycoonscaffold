/**
 * When to remind a player who has left the game (local notifications: src/services/reminders.ts
 * schedules them when the app goes to the background and cancels them when it comes back; the
 * words are the game's own). Pure: time comes in as `now`, like everywhere in the engine.
 *
 * Two reminders at most per absence, and none at night:
 * - `awayFull`: the moment the game stops earning while away (the offline cap), only when it
 *   earns anything on its own;
 * - `later`: once, a few days on, for a player who has not come back.
 * Neither is an offer: a reminder never names a price or a deal (docs/design/research/policy.md 2).
 */
import type { GameConfig } from '../config/schema';
import { incomePerSecond } from './economy';
import { engineFor } from './mode';
import type { GameState } from './types';

export type ReminderKind = 'awayFull' | 'later';

export interface Reminder {
  kind: ReminderKind;
  /** Epoch ms. Always later than the `now` it was computed at, and never inside the quiet hours. */
  at: number;
}

export const REMINDER_RULES = {
  /** No reminders before the player has played this long: someone who opened the game once is left alone. */
  minPlaySeconds: 120,
  /** An offline cap shorter than this is not worth a notification. */
  minCapSeconds: 30 * 60,
  /** The second reminder, this long after leaving. */
  laterHours: 72,
  /** Local hours [from, to) in which nothing is delivered; a reminder due then waits for `to`. */
  quietFromHour: 21,
  quietToHour: 9,
} as const;

/** Seconds of absence after which the game stops earning. */
export function awayCapSeconds(cfg: GameConfig, state: GameState): number {
  const own = engineFor(cfg)?.awayCapSeconds;
  const cap = own ? own(cfg, state) : cfg.economy.offline.maxHours * 3600;
  return Number.isFinite(cap) && cap > 0 ? cap : 0;
}

/**
 * `at` moved out of the quiet hours of the device's own time zone: a time from 21:00 waits for
 * 9:00 the next morning, a time before 9:00 for 9:00 the same day. Any other time is unchanged.
 */
export function daytime(at: number): number {
  const d = new Date(at);
  const hour = d.getHours();
  const { quietFromHour, quietToHour } = REMINDER_RULES;
  if (hour >= quietToHour && hour < quietFromHour) return at;
  const day = d.getDate() + (hour >= quietFromHour ? 1 : 0);
  return new Date(d.getFullYear(), d.getMonth(), day, quietToHour, 0, 0, 0).getTime();
}

/** The reminders to schedule for a player leaving at `now`, earliest first. Empty for a game barely played. */
export function remindersFor(cfg: GameConfig, state: GameState, now: number): Reminder[] {
  if (!(state.stats.playSeconds >= REMINDER_RULES.minPlaySeconds)) return [];
  const out: Reminder[] = [];
  const cap = awayCapSeconds(cfg, state);
  if (cap >= REMINDER_RULES.minCapSeconds && incomePerSecond(cfg, state, now) > 0) out.push({ kind: 'awayFull', at: daytime(now + cap * 1000) });
  const later = daytime(now + REMINDER_RULES.laterHours * 3600_000);
  // Never two on one morning: the second one only when it is clearly after the first.
  if (out.length === 0 || later - out[0].at >= 12 * 3600_000) out.push({ kind: 'later', at: later });
  return out;
}
