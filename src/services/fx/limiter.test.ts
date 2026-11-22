import { describe, expect, it } from 'vitest';
import { RateLimiter } from './limiter';

describe('RateLimiter', () => {
  it('lets the first hit through and drops repeats inside the interval', () => {
    const limiter = new RateLimiter();
    expect(limiter.allow('coin', 70, 1000)).toBe(true);
    expect(limiter.allow('coin', 70, 1001)).toBe(false);
    expect(limiter.allow('coin', 70, 1069)).toBe(false);
    expect(limiter.allow('coin', 70, 1070)).toBe(true);
  });

  it('measures from the last hit that was let through, not from dropped ones', () => {
    const limiter = new RateLimiter();
    expect(limiter.allow('tap', 100, 0)).toBe(true);
    expect(limiter.allow('tap', 100, 60)).toBe(false);
    // 100 ms after the accepted hit at 0, even though one was dropped at 60.
    expect(limiter.allow('tap', 100, 100)).toBe(true);
  });

  it('keeps every key apart', () => {
    const limiter = new RateLimiter();
    expect(limiter.allow('coin', 500, 0)).toBe(true);
    expect(limiter.allow('cash', 500, 1)).toBe(true);
    expect(limiter.allow('coin', 500, 2)).toBe(false);
  });

  it('an interval of zero never blocks', () => {
    const limiter = new RateLimiter();
    expect(limiter.allow('x', 0, 5)).toBe(true);
    expect(limiter.allow('x', 0, 5)).toBe(true);
  });

  it('does not lock a key out when the clock jumps backwards', () => {
    const limiter = new RateLimiter();
    expect(limiter.allow('door', 1200, 50_000)).toBe(true);
    expect(limiter.allow('door', 1200, 10)).toBe(true);
    expect(limiter.allow('door', 1200, 20)).toBe(false);
  });

  it('reset forgets everything', () => {
    const limiter = new RateLimiter();
    limiter.allow('bell', 120, 0);
    limiter.reset();
    expect(limiter.allow('bell', 120, 1)).toBe(true);
  });
});
