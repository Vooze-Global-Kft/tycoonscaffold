/**
 * When the system's rating prompt may be asked for. Pure, so it can be tested; the prompt itself is
 * src/services/review.ts. The system decides whether it really appears (Apple shows it at most three
 * times a year), so these rules only keep the request for players who have settled in, at a moment
 * they have just been given something.
 */
export const REVIEW_RULES = {
  /** Play sessions before the first request. */
  minSessions: 5,
  /** Time played before the first request. */
  minPlaySeconds: 45 * 60,
  /** Days since the first launch. */
  minDaysSinceFirstOpen: 3,
  /** Days between two requests. */
  daysBetween: 120,
  /** Requests ever made by one install. */
  maxAsks: 3,
} as const;

const DAY_MS = 86_400_000;

export function shouldAskForReview(stats: { sessions: number; playSeconds: number; firstOpenAt: number }, asks: readonly number[], now: number): boolean {
  const r = REVIEW_RULES;
  if (!(stats.sessions >= r.minSessions) || !(stats.playSeconds >= r.minPlaySeconds)) return false;
  if (!(now - stats.firstOpenAt >= r.minDaysSinceFirstOpen * DAY_MS)) return false;
  if (asks.length >= r.maxAsks) return false;
  const last = asks.length ? Math.max(...asks) : null;
  // A last request in the future (the clock was moved) counts as just made.
  return last === null || now - last >= r.daysBetween * DAY_MS;
}
