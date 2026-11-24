/**
 * Determinism (spec 10.2 `determinism`, H3): the same seed gives a byte-identical one-hour trace at
 * about 10 Hz and event to event, and twice in a row. A small player of its own (testPlay.ts) decides
 * every paper a fixed hand after it landed, takes slips, calls, counts and moves up; both runners stop
 * only at the same grid of play times, so the rules alone decide what happens between. Frozen test
 * content only (lesson 4).
 */
import { describe, expect, it } from 'vitest';
import * as R from '../decree';
import { decreeTestConfig, freshState } from '../fixtures/decree';
import { runEvents, runTicks, type TraceRow } from './testPlay';

const cfg = decreeTestConfig();
const HOUR = 3600;

describe('the same seed, the same trace (H3)', () => {
  it('one hour from a fresh game: about 10 Hz and event to event give the byte-identical trace and state', { timeout: 60_000 }, () => {
    const g = freshState(cfg, 2026);
    const t1: TraceRow[] = [];
    const t2: TraceRow[] = [];
    const e1: R.DecreeEvent[] = [];
    const e2: R.DecreeEvent[] = [];
    const a = runTicks(cfg, g, HOUR, { trace: t1, events: e1 });
    const b = runEvents(cfg, g, HOUR, { trace: t2, events: e2 });
    // The run did something worth comparing: many decisions, slips, an election.
    expect(t1.filter((r) => r.act === 'sign' || r.act === 'refuse').length).toBeGreaterThan(150);
    expect(t1.some((r) => r.act === 'slip')).toBe(true);
    expect(t1.some((r) => r.act === 'count')).toBe(true);
    expect(t2.length).toBe(t1.length);
    for (let i = 0; i < t1.length; i++) if (t1[i].digest !== t2[i].digest) expect({ i, ...t2[i] }).toEqual({ i, ...t1[i] });
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    expect(JSON.stringify(e2)).toBe(JSON.stringify(e1));
  });

  it('twice in a row, and another seed differs', () => {
    const run = (seed: number) => {
      const tr: TraceRow[] = [];
      const s = runEvents(cfg, freshState(cfg, seed), 1200, { trace: tr });
      return JSON.stringify([s, tr]);
    };
    expect(run(7)).toBe(run(7));
    expect(run(7)).not.toBe(run(8));
  });
});
