/**
 * Which leaderboards a build can use and which scores are worth sending. Pure, so it can be
 * tested; the native calls are src/services/boards.ts.
 */
import type { Leaderboard } from '../config/schema';

export type BoardPlatform = 'ios' | 'android' | 'web';

/** A board as this platform knows it. */
export interface PlatformBoard {
  key: string;
  metric: string;
  /** The platform's own leaderboard id. */
  id: string;
}

/** The game's boards that have an id on this platform, in the order of game.json (the first is the one the button opens). */
export function boardsFor(boards: readonly Leaderboard[] | undefined, platform: BoardPlatform): PlatformBoard[] {
  const out: PlatformBoard[] = [];
  for (const b of boards ?? []) {
    const id = platform === 'ios' ? b.iosId : platform === 'android' ? b.androidId : undefined;
    if (id) out.push({ key: b.key, metric: b.metric, id });
  }
  return out;
}

/**
 * The scores to send now: one per board whose figure is above the last one sent (every figure is
 * a counter that only rises, so an equal or lower value is never news). A board whose metric the
 * game does not have sends nothing.
 */
export function scoresToSend(boards: readonly PlatformBoard[], scores: Readonly<Record<string, number>>, sent: Readonly<Record<string, number>>): { board: PlatformBoard; score: number }[] {
  const out: { board: PlatformBoard; score: number }[] = [];
  for (const board of boards) {
    const score = scores[board.metric];
    if (typeof score !== 'number' || !Number.isSafeInteger(score) || score <= 0) continue;
    if (score > (sent[board.key] ?? 0)) out.push({ board, score });
  }
  return out;
}
