import { describe, expect, it } from 'vitest';
import {
  advanceChain,
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
