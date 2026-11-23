/**
 * Determinism (spec 8.3 gate 14, 10.2 `determinism.test.ts`): the same seed gives a byte-identical
 * one-hour trace, ticked at 10 Hz and stepped from event to event (the way the bot runs), with a
 * scripted player acting every 1.5 s of play in both; a different seed gives a different game.
 *
 * The trace is the list of every event the rules reported plus a hash of the whole state at every
 * action (and the final state itself). At 10 Hz the clock moves to i/10 s exactly; event to event it
 * moves to the next queued event (`nextMergeStop`) or the next action time, whichever comes first.
 */
import { describe, expect, it } from 'vitest';
import { freshState, mergeTestConfig, playOnce, testPrng } from '../fixtures/merge';
import * as R from '../merge';

const cfg = mergeTestConfig();
const HOUR = 3600;
const ACT = 1.5;

/** FNV-1a of a string, for compact snapshots. */
function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(16);
}

interface Trace {
  events: string;
  snapshots: string[];
  final: string;
  cash: number;
}

function run(seed: number, mode: '10hz' | 'events'): Trace {
  let g = freshState(cfg, seed);
  const rnd = testPrng(seed ^ 0x5eed);
  const events: R.MergeEvent[] = [];
  const snapshots: string[] = [];
  let nextAct = ACT;
  let ticks = 0;
  const act = () => {
    g = playOnce(cfg, g, rnd(), events);
    snapshots.push(hash(JSON.stringify(g)));
    nextAct = ACT * (snapshots.length + 1);
  };
  if (mode === '10hz') {
    for (let i = 1; i <= HOUR * 10; i++) {
      const target = i / 10;
      g = R.advanceMerge(cfg, g, target - g.stats.playSeconds, 0, events);
      ticks++;
      if (g.stats.playSeconds !== target) throw new Error(`10 Hz clock ${g.stats.playSeconds} is not ${target}`);
      if (target === nextAct) act();
    }
  } else {
    while (g.stats.playSeconds < HOUR) {
      const stop = R.nextMergeStop(cfg, g);
      const target = Math.min(HOUR, nextAct, stop ?? Infinity);
      g = R.advanceMerge(cfg, g, target - g.stats.playSeconds, 0, events);
      ticks++;
      if (g.stats.playSeconds !== target) throw new Error(`event clock ${g.stats.playSeconds} is not ${target}`);
      if (target === nextAct && target <= HOUR) act();
    }
  }
  void ticks;
  return { events: JSON.stringify(events), snapshots, final: JSON.stringify(g), cash: g.cash };
}

describe('determinism (gate 14)', () => {
  it('the same seed gives a byte-identical 1-hour trace at 10 Hz and event to event', () => {
    const a = run(12345, '10hz');
    const b = run(12345, 'events');
    expect(a.snapshots.length).toBe(HOUR / ACT);
    expect(b.snapshots).toEqual(a.snapshots);
    expect(b.events).toBe(a.events);
    expect(b.final).toBe(a.final);
    // It is a real hour of play: tickets paid, purchases made, a Parade.
    const ev = JSON.parse(a.events) as R.MergeEvent[];
    expect(ev.filter((e) => e.type === 'ticketPaid').length).toBeGreaterThan(100);
    expect(ev.some((e) => e.type === 'stallOpen')).toBe(true);
    expect(a.cash).toBeGreaterThanOrEqual(0);
  }, 120_000);

  it('a second run of one seed is byte-identical; another seed differs', () => {
    const a = run(4, 'events');
    expect(run(4, 'events')).toEqual(a);
    expect(run(99, 'events').final).not.toBe(a.final);
  }, 120_000);
});
