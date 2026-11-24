/**
 * The flick's decision (spec 4.3) as a pure function: every threshold, both directions, the velocity
 * rule, the second finger, the tap, and what the ink and the drawer show at a distance.
 */
import { describe, expect, it } from 'vitest';
import { ARM_AT, COMMIT_DOWN, COMMIT_UP, FAST_DOWN, FAST_DOWN_SPEED, FAST_UP, FAST_UP_SPEED, FOLLOW_MAX, armedAt, drawerOf, drawerStep, followOf, inkOf, isTap, releaseOf, velocityOf } from './flick';

const up = (d: number, v = 0) => releaseOf({ dy: -d, vy: -v, cancelled: false });
const down = (d: number, v = 0) => releaseOf({ dy: d, vy: v, cancelled: false });

describe('the flick (4.3)', () => {
  it('uses 4.3’s numbers', () => {
    expect([ARM_AT, COMMIT_UP, FAST_UP, FAST_UP_SPEED, COMMIT_DOWN, FAST_DOWN, FAST_DOWN_SPEED]).toEqual([40, 90, 48, 0.8, 90, 24, 0.5]);
  });

  it('signs at 90 pt up at any speed, not at 89.9', () => {
    expect(up(90)).toBe('sign');
    expect(up(140)).toBe('sign');
    expect(up(89.9)).toBe('spring');
    expect(up(89.9, 0.79)).toBe('spring');
  });

  it('signs a fast flick: 48 pt up at 0.8 pt/ms, not slower, not shorter', () => {
    expect(up(48, 0.8)).toBe('sign');
    expect(up(60, 2)).toBe('sign');
    expect(up(48, 0.79)).toBe('spring');
    expect(up(47.9, 3)).toBe('spring');
  });

  it('studies at 90 pt down, or 24 pt at 0.5 pt/ms: the cheap no is the shorter pull', () => {
    expect(down(90)).toBe('refuse');
    expect(down(89.9)).toBe('spring');
    expect(down(24, 0.5)).toBe('refuse');
    expect(down(24, 0.49)).toBe('spring');
    expect(down(23.9, 2)).toBe('spring');
    // signing asks more than refusing at the same distance and speed
    expect(down(48, 0.6)).toBe('refuse');
    expect(up(48, 0.6)).toBe('spring');
  });

  it('a velocity against the direction never commits a short move', () => {
    expect(releaseOf({ dy: -60, vy: 1, cancelled: false })).toBe('spring');
    expect(releaseOf({ dy: 30, vy: -1, cancelled: false })).toBe('spring');
  });

  it('a second finger cancels whatever the distance', () => {
    expect(releaseOf({ dy: -200, vy: -5, cancelled: true })).toBe('spring');
    expect(releaseOf({ dy: 200, vy: 5, cancelled: true })).toBe('spring');
  });

  it('nonsense input springs back', () => {
    expect(releaseOf({ dy: NaN, vy: 0, cancelled: false })).toBe('spring');
    expect(releaseOf({ dy: -100, vy: NaN, cancelled: false })).toBe('sign');
  });

  it('arms a side from 40 pt', () => {
    expect(armedAt(-39.9)).toBeNull();
    expect(armedAt(-40)).toBe('sign');
    expect(armedAt(40)).toBe('refuse');
    expect(armedAt(0)).toBeNull();
  });

  it('a tap is a touch that hardly moved and lifted soon', () => {
    expect(isTap(0, 100)).toBe(true);
    expect(isTap(8, 350)).toBe(true);
    expect(isTap(9, 100)).toBe(false);
    expect(isTap(2, 400)).toBe(false);
  });

  it('the ink writes from 40 pt up and is whole at 90; the drawer likewise down', () => {
    expect(inkOf(-40)).toBe(0);
    expect(inkOf(-65)).toBeCloseTo(0.5, 9);
    expect(inkOf(-90)).toBe(1);
    expect(inkOf(-200)).toBe(1);
    expect(inkOf(60)).toBe(0);
    expect(drawerOf(40)).toBe(0);
    expect(drawerOf(65)).toBeCloseTo(0.5, 9);
    expect(drawerOf(90)).toBe(1);
    expect(drawerOf(-90)).toBe(0);
    expect(drawerStep(0, 6)).toBe(0);
    expect(drawerStep(1, 6)).toBe(5);
    expect(drawerStep(0.5, 6)).toBe(3);
  });

  it('the paper follows the finger, then resists; vertical only', () => {
    expect(followOf(50)).toBe(50);
    expect(followOf(-FOLLOW_MAX)).toBe(-FOLLOW_MAX);
    expect(followOf(FOLLOW_MAX + 40)).toBe(FOLLOW_MAX + 20);
    expect(followOf(-(FOLLOW_MAX + 40))).toBe(-(FOLLOW_MAX + 20));
  });

  it('velocity comes from the last 80 ms of samples', () => {
    expect(velocityOf([])).toBe(0);
    expect(velocityOf([{ y: 0, t: 0 }])).toBe(0);
    expect(velocityOf([{ y: 0, t: 0 }, { y: -40, t: 50 }])).toBeCloseTo(-0.8, 9);
    // an old slow part of the drag does not dilute the flick at its end
    expect(velocityOf([{ y: 0, t: 0 }, { y: -10, t: 500 }, { y: -30, t: 520 }, { y: -60, t: 550 }])).toBeCloseTo(-50 / 50, 9);
    // samples at the same instant give no velocity, not infinity
    expect(velocityOf([{ y: 0, t: 10 }, { y: -40, t: 10 }])).toBe(0);
  });

  it('an end-to-end gesture: a slow push to 60 pt springs back, a quick one signs', () => {
    const slow = [{ y: 300, t: 0 }, { y: 280, t: 100 }, { y: 260, t: 200 }, { y: 240, t: 300 }];
    expect(releaseOf({ dy: 240 - 300, vy: velocityOf(slow), cancelled: false })).toBe('spring');
    const quick = [{ y: 300, t: 0 }, { y: 270, t: 20 }, { y: 240, t: 40 }];
    expect(releaseOf({ dy: 240 - 300, vy: velocityOf(quick), cancelled: false })).toBe('sign');
  });
});
