import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PatternPlayer, timeline, type HapticPulse } from './pattern';
import { testClock } from './testkit';

const T0 = 1_700_000_000_000;

/** A player that records `pulse@ms since T0`. */
function setup(minGapMs = 80) {
  const fired: string[] = [];
  const player = new PatternPlayer((pulse: HapticPulse) => fired.push(`${pulse}@${Date.now() - T0}`), {
    minGapMs,
    clock: testClock,
  });
  return { fired, player };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('timeline', () => {
  it('numbers are pauses between the pulses around them', () => {
    expect(timeline(['heavy', 80, 'success'], 30)).toEqual([
      { at: 0, pulse: 'heavy' },
      { at: 80, pulse: 'success' },
    ]);
    expect(timeline(['heavy', 120, 'heavy', 120, 'heavy', 200, 'success'], 30).map((b) => b.at)).toEqual([0, 120, 240, 440]);
  });
  it('adds up consecutive pauses and keeps a pause before the first pulse', () => {
    expect(timeline([50, 50, 'light', 10, 20, 'medium'], 30).map((b) => b.at)).toEqual([100, 130]);
  });
  it('never puts two pulses of one pattern closer than the minimum step', () => {
    expect(timeline(['medium', 'medium', 5, 'light'], 30).map((b) => b.at)).toEqual([0, 30, 60]);
  });
  it('ignores trailing pauses, bad numbers and unknown steps', () => {
    expect(timeline(['light', 500], 30)).toEqual([{ at: 0, pulse: 'light' }]);
    expect(timeline([Number.NaN, -20, 'light'], 30)).toEqual([{ at: 0, pulse: 'light' }]);
    expect(timeline(['thump' as never, 40, 'light'], 30)).toEqual([{ at: 40, pulse: 'light' }]);
    expect(timeline([], 30)).toEqual([]);
    expect(timeline([100, 200], 30)).toEqual([]);
  });
});

describe('PatternPlayer', () => {
  it('plays a pattern on schedule', () => {
    const { fired, player } = setup();
    expect(player.play(['heavy', 120, 'heavy', 120, 'heavy', 200, 'success'])).toBe(true);
    expect(fired).toEqual(['heavy@0']);
    expect(player.busy).toBe(true);
    vi.advanceTimersByTime(119);
    expect(fired).toEqual(['heavy@0']);
    vi.advanceTimersByTime(1);
    expect(fired).toEqual(['heavy@0', 'heavy@120']);
    vi.advanceTimersByTime(1000);
    expect(fired).toEqual(['heavy@0', 'heavy@120', 'heavy@240', 'success@440']);
    expect(player.busy).toBe(false);
  });

  it('an empty pattern does nothing', () => {
    const { fired, player } = setup();
    expect(player.play([])).toBe(false);
    expect(player.play([40, 40])).toBe(false);
    expect(fired).toEqual([]);
  });

  it('a new pattern cancels the rest of an older one', () => {
    const { fired, player } = setup();
    player.play(['heavy', 100, 'heavy', 100, 'success']);
    vi.advanceTimersByTime(150);
    expect(fired).toEqual(['heavy@0', 'heavy@100']);
    player.play(['medium', 60, 'medium']);
    vi.advanceTimersByTime(1000);
    // The older pattern's 'success' at 200 never fires. The new one waits out the gap after heavy@100.
    expect(fired).toEqual(['heavy@0', 'heavy@100', 'medium@180', 'medium@240']);
  });

  it('fast ticks never buzz continuously: one per gap, the rest are dropped', () => {
    const { fired, player } = setup(80);
    for (let t = 0; t < 400; t += 20) {
      player.play(['light']);
      vi.advanceTimersByTime(20);
    }
    expect(fired).toEqual(['light@0', 'light@80', 'light@160', 'light@240', 'light@320']);
  });

  it('a dropped tick is not queued for later', () => {
    const { fired, player } = setup(80);
    player.play(['light']);
    vi.advanceTimersByTime(10);
    expect(player.play(['select'])).toBe(false);
    vi.advanceTimersByTime(500);
    expect(fired).toEqual(['light@0']);
    expect(player.busy).toBe(false);
  });

  it('a lone tick never interrupts a longer pattern that is still playing', () => {
    const { fired, player } = setup(80);
    player.play(['heavy', 200, 'heavy', 200, 'success']);
    vi.advanceTimersByTime(100);
    expect(player.play(['light'])).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(fired).toEqual(['heavy@0', 'heavy@200', 'success@400']);
  });

  it('a stronger pulse right after a tick fires at once (a button tick, then the action)', () => {
    const { fired, player } = setup(80);
    player.play(['select']);
    vi.advanceTimersByTime(5);
    player.play(['medium']);
    expect(fired).toEqual(['select@0', 'medium@5']);
    vi.advanceTimersByTime(5);
    player.play(['success']);
    expect(fired).toEqual(['select@0', 'medium@5', 'success@10']);
  });

  it('pulses of the same strength are spaced by the gap, and the newest one wins', () => {
    const { fired, player } = setup(80);
    player.play(['medium']);
    vi.advanceTimersByTime(30);
    player.play(['medium']); // would fire at 80
    vi.advanceTimersByTime(20);
    player.play(['medium']); // replaces it, still at 80
    vi.advanceTimersByTime(500);
    expect(fired).toEqual(['medium@0', 'medium@80']);
  });

  it('a multi-pulse pattern that arrives inside the gap starts late, in one piece', () => {
    const { fired, player } = setup(80);
    player.play(['heavy']);
    vi.advanceTimersByTime(30);
    player.play(['medium', 40, 'light']);
    vi.advanceTimersByTime(500);
    expect(fired).toEqual(['heavy@0', 'medium@80', 'light@120']);
  });

  it('after the gap everything fires immediately again', () => {
    const { fired, player } = setup(80);
    player.play(['success']);
    vi.advanceTimersByTime(80);
    player.play(['light']);
    expect(fired).toEqual(['success@0', 'light@80']);
  });

  it('cancel drops what has not fired yet', () => {
    const { fired, player } = setup();
    player.play(['light', 50, 'light', 50, 'light', 50, 'medium']);
    vi.advanceTimersByTime(60);
    player.cancel();
    expect(player.busy).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(fired).toEqual(['light@0', 'light@50']);
  });

  it('keeps a leading pause, so a pulse can land on the hit of a sound', () => {
    const { fired, player } = setup();
    player.play([150, 'heavy']);
    expect(fired).toEqual([]);
    vi.advanceTimersByTime(150);
    expect(fired).toEqual(['heavy@150']);
  });

  it('survives a platform call that throws', () => {
    let calls = 0;
    const player = new PatternPlayer(
      () => {
        calls++;
        throw new Error('no vibrator');
      },
      { minGapMs: 80, clock: testClock },
    );
    expect(() => player.play(['heavy', 50, 'heavy'])).not.toThrow();
    expect(() => vi.advanceTimersByTime(100)).not.toThrow();
    expect(calls).toBe(2);
  });
});
