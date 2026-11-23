import { describe, expect, it } from 'vitest';
import { REVIEW_RULES, shouldAskForReview } from './reviewRule';

const DAY = 86_400_000;
const NOW = 1_800_000_000_000;
const settled = { sessions: 8, playSeconds: 2 * 3600, firstOpenAt: NOW - 10 * DAY };

describe('when the rating prompt may be asked for', () => {
  it('asks a player who has settled in and was never asked', () => {
    expect(shouldAskForReview(settled, [], NOW)).toBe(true);
  });

  it('leaves a new player alone: too few sessions, too little play, or too soon after the first launch', () => {
    expect(shouldAskForReview({ ...settled, sessions: REVIEW_RULES.minSessions - 1 }, [], NOW)).toBe(false);
    expect(shouldAskForReview({ ...settled, playSeconds: REVIEW_RULES.minPlaySeconds - 1 }, [], NOW)).toBe(false);
    expect(shouldAskForReview({ ...settled, firstOpenAt: NOW - 2 * DAY }, [], NOW)).toBe(false);
  });

  it('waits 120 days between two requests', () => {
    expect(shouldAskForReview(settled, [NOW - 119 * DAY], NOW)).toBe(false);
    expect(shouldAskForReview(settled, [NOW - 120 * DAY], NOW)).toBe(true);
    // The latest request counts, whatever the order.
    expect(shouldAskForReview(settled, [NOW - 10 * DAY, NOW - 400 * DAY], NOW)).toBe(false);
  });

  it('never asks a fourth time', () => {
    expect(shouldAskForReview(settled, [NOW - 900 * DAY, NOW - 600 * DAY, NOW - 300 * DAY], NOW)).toBe(false);
  });

  it('treats a request dated in the future (a moved clock) as just made', () => {
    expect(shouldAskForReview(settled, [NOW + 5 * DAY], NOW)).toBe(false);
  });

  it('is false on broken numbers', () => {
    expect(shouldAskForReview({ sessions: NaN, playSeconds: NaN, firstOpenAt: NaN }, [], NOW)).toBe(false);
  });
});
