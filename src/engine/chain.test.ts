import { describe, expect, it } from 'vitest';
import {
  advanceChain,
  fitChain,
  chainThroughput,
  createChain,
  idleWorkers,
  resizeChain,
  ringBell,
  salesRate,
  seatCycleSeconds,
  transportRate,
  valueInChain,
  type ChainEvent,
  type ChainParams,
  type ChainState,
} from './chain';

const base: ChainParams = { capacity: 20, tripSeconds: 6, transportAuto: true, spend: 10, serveSeconds: 4 };

/** Runs the chain with a constant production rate and returns totals. */
function run(p: ChainParams, productionRate: number, seconds: number, opts: { workers?: number; seats?: number; dt?: number; chain?: ChainState } = {}) {
  const dt = opts.dt ?? 0.1;
  let chain = opts.chain ?? createChain(opts.workers ?? 2, opts.seats ?? 4);
  let paid = 0;
  let produced = 0;
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i++) {
    const inflow = productionRate * dt;
    produced += inflow;
    const r = advanceChain(chain, p, dt, inflow);
    chain = r.chain;
    paid += r.paid;
  }
  return { chain, paid, produced };
}

describe('conservation', () => {
  it.each([
    ['production-limited', 1, { workers: 3, seats: 6 }],
    ['transport-limited', 50, { workers: 1, seats: 8 }],
    ['sales-limited', 50, { workers: 6, seats: 1 }],
  ])('%s: everything produced is either still in the chain or paid', (_name, rate, shape) => {
    const { chain, paid, produced } = run(base, rate, 300, shape);
    expect(valueInChain(chain) + paid).toBeCloseTo(produced, 6);
  });

  it('holds with long, irregular ticks', () => {
    let chain = createChain(3, 5);
    let paid = 0;
    let produced = 0;
    const dts = [0.016, 0.9, 3, 0.1, 7.5, 0.25, 30, 0.05];
    for (let i = 0; i < 200; i++) {
      const dt = dts[i % dts.length];
      const inflow = 12 * dt;
      produced += inflow;
      const r = advanceChain(chain, base, dt, inflow);
      chain = r.chain;
      paid += r.paid;
    }
    expect(valueInChain(chain) + paid).toBeCloseTo(produced, 5);
    expect(chain.buffer).toBeGreaterThanOrEqual(0);
    expect(chain.served).toBeGreaterThanOrEqual(0);
  });
});

describe('steady state', () => {
  // After a warm-up, income per second should settle at the slowest stage.
  const cases: [string, number, { workers: number; seats: number }][] = [
    ['production is the bottleneck', 2, { workers: 3, seats: 6 }],
    ['transport is the bottleneck', 40, { workers: 2, seats: 12 }],
    ['sales is the bottleneck', 40, { workers: 8, seats: 2 }],
  ];
  it.each(cases)('%s', (_name, rate, shape) => {
    const expected = chainThroughput(rate, base, shape.workers, shape.seats);
    const warm = run(base, rate, 120, shape);
    const { paid } = run(base, rate, 1200, { ...shape, chain: warm.chain });
    expect(paid / 1200 / expected.rate).toBeGreaterThan(0.97);
    expect(paid / 1200 / expected.rate).toBeLessThan(1.03);
  });

  it('names the limiting stage', () => {
    expect(chainThroughput(2, base, 3, 6).bottleneck).toBe('production');
    expect(chainThroughput(40, base, 2, 12).bottleneck).toBe('transport');
    expect(chainThroughput(40, base, 8, 2).bottleneck).toBe('sales');
    expect(transportRate(base, 2)).toBeCloseTo((2 * 20) / 6);
    expect(salesRate(base, 2)).toBeCloseTo((2 * 10) / seatCycleSeconds(base));
  });

  it('a backlog flushes once the bottleneck is fixed', () => {
    // Starved of transport, goods pile up on the buffer...
    const slow = run(base, 30, 200, { workers: 1, seats: 12 });
    expect(slow.chain.buffer).toBeGreaterThan(1000);
    // ...then more workers clear it faster than production alone would.
    const grown = resizeChain(slow.chain, 12, 12);
    const fast = run({ ...base, spend: 100 }, 30, 120, { chain: grown });
    expect(fast.paid / 120).toBeGreaterThan(30);
  });
});

describe('manual transport', () => {
  const manual = { ...base, transportAuto: false };
  it('workers wait for the bell, do one trip, then wait again', () => {
    let { chain, paid } = run(manual, 5, 30, { workers: 2, seats: 4 });
    expect(paid).toBe(0);
    expect(idleWorkers(chain)).toBe(2);
    expect(chain.buffer).toBeCloseTo(150, 6);

    chain = ringBell(chain);
    expect(idleWorkers(chain)).toBe(0);
    const after = run(manual, 0, 60, { chain });
    // Both trays were delivered (2 x capacity) and eaten, and the workers are idle again.
    expect(after.paid).toBeCloseTo(40, 6);
    expect(idleWorkers(after.chain)).toBe(2);
    expect(after.chain.buffer).toBeCloseTo(110, 6);
  });

  it('ringing with nobody idle changes nothing', () => {
    const chain = ringBell(createChain(1, 1));
    expect(ringBell(chain)).toBe(chain);
  });

  it('transport counts as zero income until automated', () => {
    expect(chainThroughput(5, manual, 2, 4).rate).toBe(0);
  });
});

describe('determinism', () => {
  it('same inputs, same outputs', () => {
    const a = run(base, 7, 90, { workers: 3, seats: 5 });
    const b = run(base, 7, 90, { workers: 3, seats: 5 });
    expect(a.chain).toEqual(b.chain);
    expect(a.paid).toBe(b.paid);
  });

  it('tick size barely matters', () => {
    const fine = run(base, 7, 600, { workers: 3, seats: 5, dt: 0.05 });
    const coarse = run(base, 7, 600, { workers: 3, seats: 5, dt: 1 });
    expect(coarse.paid / fine.paid).toBeGreaterThan(0.97);
    expect(coarse.paid / fine.paid).toBeLessThan(1.03);
  });

  it('does not mutate its input', () => {
    const chain = createChain(2, 2);
    const snapshot = JSON.stringify(chain);
    advanceChain(chain, base, 5, 100);
    expect(JSON.stringify(chain)).toBe(snapshot);
  });

  it('returns the same object when nothing can happen', () => {
    const idle = createChain(1, 0);
    const r = advanceChain(idle, { ...base, transportAuto: false }, 1, 0);
    expect(r.chain.workers).toBe(idle.workers);
  });
});

describe('events and growth', () => {
  it('reports the life of a guest in order', () => {
    const events: ChainEvent[] = [];
    let chain = createChain(1, 1);
    for (let i = 0; i < 400; i++) chain = advanceChain(chain, base, 0.1, 1, events).chain;
    const seatEvents = events.filter((e) => 'seat' in e).map((e) => e.type);
    expect(seatEvents.slice(0, 4)).toEqual(['arrive', 'served', 'pay', 'leave']);
    const loads = events.filter((e) => e.type === 'load');
    const unloads = events.filter((e) => e.type === 'unload');
    expect(loads.length).toBeGreaterThan(0);
    expect(unloads.length).toBeGreaterThanOrEqual(loads.length - 1);
    // Guest ids count up from 1.
    const arrivals = events.filter((e): e is Extract<ChainEvent, { type: 'arrive' }> => e.type === 'arrive').map((e) => e.guest);
    expect(arrivals).toEqual(arrivals.map((_, i) => i + 1));
  });

  it('new workers walk in before they start working; new seats start empty', () => {
    const chain = resizeChain(createChain(1, 1), 3, 4);
    expect(chain.workers.map((w) => w.phase)).toEqual(['idle', 'entering', 'entering']);
    expect(chain.seats).toHaveLength(4);
    const later = advanceChain(chain, base, 3, 500).chain;
    expect(later.workers.every((w) => w.phase !== 'entering')).toBe(true);
    // Never shrinks.
    expect(resizeChain(chain, 1, 1)).toBe(chain);
  });

  it('guests take partial portions when food is scarce, so nothing waits forever', () => {
    // A trickle far below one full portion still gets eaten and paid for.
    const { paid, produced, chain } = run({ ...base, spend: 1e6 }, 0.5, 600, { workers: 1, seats: 2 });
    expect(paid).toBeGreaterThan(produced * 0.9);
    expect(valueInChain(chain) + paid).toBeCloseTo(produced, 6);
  });

  it('survives huge numbers', () => {
    const big = { ...base, capacity: 1e290, spend: 1e289 };
    const { paid, chain } = run(big, 1e288, 60, { workers: 2, seats: 4 });
    expect(Number.isFinite(paid)).toBe(true);
    expect(Number.isFinite(valueInChain(chain))).toBe(true);
    expect(paid).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------- adversarial review (docs/design/engine-review.md)

describe('review: tick length and fast phases', () => {
  /** Transport-limited shape: one worker, plenty of seats and spend. */
  const transportBound = (p: ChainParams) => ({ ...p, spend: 1e9 });

  it.each([0.001, 0.016, 0.25, 1, 6, 60, 600, 3600])('throughput does not depend on a tick of %s s (C1)', (dt) => {
    const p = transportBound(base);
    // 1 ms ticks are slow to run for an hour; 10 minutes is plenty for them.
    const seconds = dt < 0.01 ? 600 : Math.max(3600, dt * 2);
    const { paid } = run(p, 50, seconds, { workers: 1, seats: 50, dt });
    expect(paid / seconds / transportRate(p, 1)).toBeGreaterThan(0.97);
    expect(paid / seconds / transportRate(p, 1)).toBeLessThan(1.01);
    // CPU-bound (600 000 ticks at 1 ms): give it room on a loaded machine (review C7).
  }, 30_000);

  it.each([0.016, 0.1, 1])('very short trips still reach the advertised transport rate (tick %s s) (C1)', (dt) => {
    const p = transportBound({ ...base, tripSeconds: 0.01 });
    const { paid } = run(p, 1e7, 300, { workers: 1, seats: 400, dt });
    expect(paid / 300 / transportRate(p, 1)).toBeGreaterThan(0.97);
    expect(paid / 300 / transportRate(p, 1)).toBeLessThan(1.01);
  });

  it('a high rush multiplier (x50 on a 1 s tick) loses no time (C1)', () => {
    const p = transportBound(base);
    const { paid } = run(p, 500, 50 * 600, { workers: 1, seats: 50, dt: 50 });
    expect(paid / (50 * 600) / transportRate(p, 1)).toBeGreaterThan(0.97);
  });

  it('huge phase lengths park the value instead of losing it', () => {
    const p = { ...base, tripSeconds: 1e12, serveSeconds: 1e12 };
    const { chain, paid, produced } = run(p, 3, 120, { workers: 2, seats: 2 });
    expect(paid).toBe(0);
    expect(valueInChain(chain)).toBeCloseTo(produced, 6);
  });
});

describe('review: hostile inputs (C2)', () => {
  const finiteChain = (c: ChainState) =>
    [c.buffer, c.served, c.guests, ...c.workers.flatMap((w) => [w.t, w.carry]), ...c.seats.flatMap((s) => [s.t, s.amount, s.guest])].every(
      (x) => Number.isFinite(x) && x >= 0,
    );

  it.each([NaN, Infinity, -Infinity, -5])('an inflow of %s is ignored', (inflow) => {
    const start = { ...createChain(2, 2), buffer: 10 };
    const r = advanceChain(start, base, 0.1, inflow);
    expect(finiteChain(r.chain)).toBe(true);
    expect(r.chain.buffer).toBeLessThanOrEqual(10);
    expect(valueInChain(r.chain) + r.paid).toBeCloseTo(10, 9);
  });

  it.each([NaN, Infinity, -1, 0])('a tick of %s s changes nothing but the buffer', (dt) => {
    const start = { ...createChain(2, 2), buffer: 10 };
    const r = advanceChain(start, base, dt, 1);
    expect(r.chain.workers).toBe(start.workers);
    expect(r.chain.seats).toBe(start.seats);
    expect(r.chain.guests).toBe(0);
    expect(r.chain.buffer).toBe(11);
  });

  it.each([
    ['NaN trip', { tripSeconds: NaN }],
    ['zero trip', { tripSeconds: 0 }],
    ['negative trip', { tripSeconds: -3 }],
    ['NaN serve', { serveSeconds: NaN }],
    ['zero serve', { serveSeconds: 0 }],
    ['NaN capacity', { capacity: NaN }],
    ['negative capacity', { capacity: -4 }],
    ['Infinity capacity', { capacity: Infinity }],
    ['NaN spend', { spend: NaN }],
    ['negative spend', { spend: -1 }],
  ])('%s keeps every number finite and conserves value', (_name, patch) => {
    const p = { ...base, ...patch } as ChainParams;
    const { chain, paid, produced } = run(p, 5, 60, { workers: 2, seats: 3 });
    expect(finiteChain(chain)).toBe(true);
    expect(Number.isFinite(paid)).toBe(true);
    expect(valueInChain(chain) + paid).toBeCloseTo(produced, 6);
  });

  it('the rate functions agree with the simulation for degenerate params', () => {
    for (const patch of [{ tripSeconds: 0 }, { tripSeconds: NaN }, { capacity: NaN }, { spend: -1 }, { serveSeconds: NaN }]) {
      const p = { ...base, ...patch } as ChainParams;
      const t = chainThroughput(5, p, 2, 3);
      expect(Number.isFinite(t.rate)).toBe(true);
      expect(t.rate).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('review: zero stages', () => {
  it('capacity 0: workers wait at the buffer instead of making empty trips, and report nothing', () => {
    const events: ChainEvent[] = [];
    let chain: ChainState = { ...createChain(2, 2), buffer: 100 };
    for (let i = 0; i < 100; i++) chain = advanceChain(chain, { ...base, capacity: 0 }, 0.1, 1, events).chain;
    expect(events.filter((e) => e.type === 'load' || e.type === 'unload')).toEqual([]);
    expect(chain.buffer).toBeCloseTo(200, 9);
  });

  it('spend 0: guests never take an empty plate', () => {
    const events: ChainEvent[] = [];
    let chain: ChainState = { ...createChain(1, 2), served: 50 };
    for (let i = 0; i < 300; i++) chain = advanceChain(chain, { ...base, spend: 0 }, 0.1, 0, events).chain;
    expect(events.some((e) => (e.type === 'served' || e.type === 'pay') && e.amount === 0)).toBe(false);
    expect(chain.served).toBeCloseTo(50, 9);
  });

  it('zero workers and zero seats hold everything in the buffer', () => {
    const { chain, paid, produced } = run(base, 3, 60, { workers: 0, seats: 0 });
    expect(paid).toBe(0);
    expect(chain.buffer).toBeCloseTo(produced, 9);
  });
});

describe('review: events', () => {
  it('every load is unloaded, every serving is paid, and each seat follows arrive > served > pay > leave', () => {
    const events: ChainEvent[] = [];
    let chain = createChain(3, 4);
    const dts = [0.016, 0.1, 2.5, 0.05, 7];
    for (let i = 0; i < 600; i++) chain = advanceChain(chain, base, dts[i % dts.length], 6 * dts[i % dts.length], events).chain;
    // Drain: no more inflow until everything is paid.
    for (let i = 0; i < 2000; i++) chain = advanceChain(chain, base, 0.5, 0, events).chain;
    const sum = (type: ChainEvent['type']) => events.filter((e) => e.type === type).reduce((a, e) => a + ('amount' in e ? e.amount : 0), 0);
    expect(sum('unload')).toBeCloseTo(sum('load'), 6);
    expect(sum('pay')).toBeCloseTo(sum('served'), 6);
    expect(events.filter((e) => e.type === 'pay').length).toBe(events.filter((e) => e.type === 'served').length);
    const order = ['arrive', 'served', 'pay', 'leave'];
    for (let s = 0; s < 4; s++) {
      const seq = events.filter((e) => 'seat' in e && e.seat === s).map((e) => e.type);
      seq.forEach((type, i) => {
        if (i > 0) expect(order.indexOf(type)).toBe((order.indexOf(seq[i - 1]) + 1) % 4);
      });
    }
  });

  it('advanceChain reports how many guests paid', () => {
    const events: ChainEvent[] = [];
    let chain = createChain(2, 3);
    let guests = 0;
    for (let i = 0; i < 300; i++) {
      const r = advanceChain(chain, base, 0.2, 2, events);
      chain = r.chain;
      guests += r.guestsPaid;
    }
    expect(guests).toBe(events.filter((e) => e.type === 'pay').length);
    expect(guests).toBeGreaterThan(0);
  });
});

describe('review: fitChain (C3)', () => {
  it('trims a save with too many workers and seats without losing their value', () => {
    const chain: ChainState = {
      ...createChain(0, 0),
      workers: Array.from({ length: 50 }, () => ({ phase: 'toSales' as const, t: 0.5, carry: 2 })),
      seats: Array.from({ length: 40 }, (_, i) => ({ phase: 'eating' as const, t: 0.5, amount: 1, guest: i + 1 })),
    };
    const fitted = fitChain(chain, 3, 4);
    expect(fitted.workers).toHaveLength(3);
    expect(fitted.seats).toHaveLength(4);
    expect(valueInChain(fitted)).toBeCloseTo(valueInChain(chain), 9);
  });

  it('grows like resizeChain and returns the same object when the size is right', () => {
    const chain = createChain(2, 2);
    expect(fitChain(chain, 2, 2)).toBe(chain);
    expect(fitChain(chain, 3, 2).workers[2].phase).toBe('entering');
  });

  it('repairs broken workers and seats from a hostile save', () => {
    const chain = {
      buffer: NaN,
      served: -4,
      guests: 'x',
      workers: [{ phase: 'flying', t: NaN, carry: -1 }, null, { phase: 'toSales', t: 0.5, carry: 3 }],
      seats: 'nope',
    } as unknown as ChainState;
    const fitted = fitChain(chain, 2, 2);
    expect(fitted.workers).toHaveLength(2);
    expect(fitted.seats).toHaveLength(2);
    expect(fitted.buffer).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(valueInChain(fitted))).toBe(true);
    // The worker that was really carrying something keeps its value (moved to the buffer when trimmed).
    expect(valueInChain(fitted)).toBeCloseTo(3, 9);
  });
});
