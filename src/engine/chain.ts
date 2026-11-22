/**
 * The production chain behind sim mode, as pure functions.
 *
 *   stations --(inflow)--> buffer --> transport workers --> served --> seats --> paid
 *   [kitchen]              [the pass]  [waiters]                        [guests at tables]
 *
 * Value moves as plain numbers. Each worker and seat is only a phase plus a
 * progress value (0..1); the UI turns that into positions and animation. No
 * randomness, no clocks: the same inputs always give the same outputs, so the
 * chain is unit-tested in Node and identical on every device.
 *
 * Nothing is ever lost: buffers are unbounded, so a slow stage just builds a
 * backlog that flushes when the player fixes the bottleneck.
 */

export type WorkerPhase = 'entering' | 'idle' | 'loading' | 'toSales' | 'unloading' | 'toBuffer';

export interface TransportWorker {
  phase: WorkerPhase;
  /** Progress through the phase, 0..1. */
  t: number;
  /** Value on the tray. */
  carry: number;
}

export type SeatPhase = 'empty' | 'arriving' | 'waiting' | 'eating' | 'leaving';

export interface Seat {
  phase: SeatPhase;
  t: number;
  /** Value on this guest's plate (paid when they finish). */
  amount: number;
  /** A number that identifies the guest; the UI derives their look from it. */
  guest: number;
}

export interface ChainState {
  /** Finished goods waiting to be carried [dishes on the pass]. */
  buffer: number;
  /** Goods delivered to the sales area, not yet taken by a guest. */
  served: number;
  workers: TransportWorker[];
  seats: Seat[];
  /** Guests seated so far; the source of guest ids. */
  guests: number;
}

/** The numbers the chain runs on this tick. Derived from levels and multipliers by the caller. */
export interface ChainParams {
  /** Value one worker carries per trip. */
  capacity: number;
  /** Seconds for a full round trip (load, walk, unload, walk back). */
  tripSeconds: number;
  /** True once the transport automation hire is bought; otherwise idle workers wait for the bell. */
  transportAuto: boolean;
  /** Value one guest takes from the served buffer. */
  spend: number;
  /** Seconds a guest spends eating. */
  serveSeconds: number;
}

export type ChainEvent =
  | { type: 'load'; worker: number; amount: number }
  | { type: 'unload'; worker: number; amount: number }
  | { type: 'arrive'; seat: number; guest: number }
  | { type: 'served'; seat: number; amount: number }
  | { type: 'pay'; seat: number; amount: number }
  | { type: 'leave'; seat: number };

/** How a round trip divides up, as fractions of `tripSeconds`. The UI uses the same split to place workers. */
export const TRIP = { loading: 0.1, toSales: 0.4, unloading: 0.1, toBuffer: 0.4 } as const;
/** Fixed seat timings in seconds: the pause before the next guest, the walk in and the walk out. */
export const SEAT = { gap: 0.6, arriving: 1.6, leaving: 1.2 } as const;
/** Seconds a newly hired worker takes to walk in from the door. */
export const ENTER_SECONDS = 1.8;

/** Largest slice of time simulated in one go; longer ticks are split so no phase is skipped unfairly. */
const MAX_STEP = 0.25;
const MAX_SUBSTEPS = 24;
/** A guest ignores crumbs smaller than this fraction of a full portion (avoids eating float dust). */
const DUST = 1e-6;

export function createChain(workers: number, seats: number): ChainState {
  return {
    buffer: 0,
    served: 0,
    workers: Array.from({ length: workers }, () => ({ phase: 'idle' as WorkerPhase, t: 0, carry: 0 })),
    seats: Array.from({ length: seats }, () => ({ phase: 'empty' as SeatPhase, t: 0, amount: 0, guest: 0 })),
    guests: 0,
  };
}

/** Grows (never shrinks) the worker and seat lists. New workers walk in from the door; new seats start empty. */
export function resizeChain(chain: ChainState, workers: number, seats: number): ChainState {
  if (workers <= chain.workers.length && seats <= chain.seats.length) return chain;
  const w = chain.workers.slice();
  while (w.length < workers) w.push({ phase: 'entering', t: 0, carry: 0 });
  const s = chain.seats.slice();
  while (s.length < seats) s.push({ phase: 'empty', t: 0, amount: 0, guest: 0 });
  return { ...chain, workers: w, seats: s };
}

/** Sends every idle worker on a trip [ringing the service bell]. Returns the same object if nobody was idle. */
export function ringBell(chain: ChainState): ChainState {
  if (!chain.workers.some((w) => w.phase === 'idle')) return chain;
  return { ...chain, workers: chain.workers.map((w) => (w.phase === 'idle' ? { ...w, phase: 'loading' as WorkerPhase, t: 0 } : w)) };
}

export function idleWorkers(chain: ChainState): number {
  return chain.workers.reduce((n, w) => n + (w.phase === 'idle' ? 1 : 0), 0);
}

// ---------------------------------------------------------------- rates

/** Value per second the transport stage can move when the buffer never runs dry. */
export function transportRate(p: ChainParams, workers: number): number {
  return (workers * p.capacity) / p.tripSeconds;
}

export function seatCycleSeconds(p: ChainParams): number {
  return SEAT.gap + SEAT.arriving + p.serveSeconds + SEAT.leaving;
}

/** Value per second the sales stage can absorb when the served buffer never runs dry. */
export function salesRate(p: ChainParams, seats: number): number {
  return (seats * p.spend) / seatCycleSeconds(p);
}

export type Stage = 'production' | 'transport' | 'sales';

/** Steady-state throughput of the whole chain and which stage limits it. */
export function chainThroughput(
  productionRate: number,
  p: ChainParams,
  workers: number,
  seats: number,
): { rate: number; bottleneck: Stage; production: number; transport: number; sales: number } {
  const transport = p.transportAuto ? transportRate(p, workers) : 0;
  const sales = salesRate(p, seats);
  const rate = Math.min(productionRate, transport, sales);
  const bottleneck: Stage = rate === productionRate ? 'production' : rate === transport ? 'transport' : 'sales';
  return { rate, bottleneck, production: productionRate, transport, sales };
}

/** Everything currently inside the chain (not yet paid). Used by tests and the backlog display. */
export function valueInChain(chain: ChainState): number {
  let v = chain.buffer + chain.served;
  for (const w of chain.workers) v += w.carry;
  for (const s of chain.seats) v += s.amount;
  return v;
}

// ---------------------------------------------------------------- simulation

function workerPhaseSeconds(phase: WorkerPhase, p: ChainParams): number {
  switch (phase) {
    case 'entering':
      return ENTER_SECONDS;
    case 'loading':
      return TRIP.loading * p.tripSeconds;
    case 'toSales':
      return TRIP.toSales * p.tripSeconds;
    case 'unloading':
      return TRIP.unloading * p.tripSeconds;
    case 'toBuffer':
      return TRIP.toBuffer * p.tripSeconds;
    case 'idle':
      return Infinity;
  }
}

/** Deterministic 0..1 value from an integer; staggers guests so they don't all arrive in step. */
function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

function seatGapSeconds(seat: number, guests: number): number {
  return SEAT.gap * (0.6 + 0.8 * hash01(guests * 7 + seat * 13 + 1));
}

interface Pools {
  buffer: number;
  served: number;
  guests: number;
  paid: number;
}

function stepWorker(w: TransportWorker, i: number, p: ChainParams, dt: number, pools: Pools, events?: ChainEvent[]): TransportWorker {
  let { phase, t, carry } = w;
  let left = dt;
  // Each pass either waits, finishes a phase or uses up the time; 16 passes covers many full trips per step.
  for (let guard = 0; guard < 16 && left > 0; guard++) {
    if (phase === 'idle') {
      if (!p.transportAuto) break;
      phase = 'loading';
      t = 0;
    }
    if (phase === 'loading' && t === 0 && carry === 0) {
      // The load is taken at the start of loading. With nothing to carry, the worker waits at the buffer.
      if (pools.buffer <= 0) break;
      carry = Math.min(p.capacity, pools.buffer);
      pools.buffer -= carry;
      events?.push({ type: 'load', worker: i, amount: carry });
    }
    const dur = workerPhaseSeconds(phase, p);
    const need = (1 - t) * dur;
    if (left < need) {
      t += left / dur;
      left = 0;
      break;
    }
    left -= need;
    t = 0;
    if (phase === 'entering') phase = 'idle';
    else if (phase === 'loading') phase = 'toSales';
    else if (phase === 'toSales') phase = 'unloading';
    else if (phase === 'unloading') {
      pools.served += carry;
      events?.push({ type: 'unload', worker: i, amount: carry });
      carry = 0;
      phase = 'toBuffer';
    } else if (phase === 'toBuffer') phase = 'idle';
  }
  if (phase === w.phase && t === w.t && carry === w.carry) return w;
  return { phase, t, carry };
}

function stepSeat(s: Seat, i: number, p: ChainParams, dt: number, pools: Pools, events?: ChainEvent[]): Seat {
  let { phase, t, amount, guest } = s;
  let left = dt;
  for (let guard = 0; guard < 16 && left > 0; guard++) {
    if (phase === 'waiting') {
      if (pools.served < p.spend * DUST || pools.served <= 0) break;
      amount = Math.min(p.spend, pools.served);
      pools.served -= amount;
      events?.push({ type: 'served', seat: i, amount });
      phase = 'eating';
      t = 0;
    }
    const dur =
      phase === 'empty' ? seatGapSeconds(i, pools.guests) : phase === 'arriving' ? SEAT.arriving : phase === 'eating' ? p.serveSeconds : SEAT.leaving;
    const need = (1 - t) * dur;
    if (left < need) {
      t += left / dur;
      left = 0;
      break;
    }
    left -= need;
    t = 0;
    if (phase === 'empty') {
      pools.guests += 1;
      guest = pools.guests;
      phase = 'arriving';
      events?.push({ type: 'arrive', seat: i, guest });
    } else if (phase === 'arriving') phase = 'waiting';
    else if (phase === 'eating') {
      pools.paid += amount;
      events?.push({ type: 'pay', seat: i, amount });
      amount = 0;
      phase = 'leaving';
    } else if (phase === 'leaving') {
      events?.push({ type: 'leave', seat: i });
      phase = 'empty';
    }
  }
  if (phase === s.phase && t === s.t && amount === s.amount && guest === s.guest) return s;
  return { phase, t, amount, guest };
}

/**
 * Advances the chain by `dt` seconds. `inflow` is the value the stations
 * finished during this tick. Returns the new chain and the value guests paid
 * (before any global multiplier). Pass an array as `events` to collect what
 * happened, for sounds and effects.
 */
export function advanceChain(
  chain: ChainState,
  p: ChainParams,
  dt: number,
  inflow: number,
  events?: ChainEvent[],
): { chain: ChainState; paid: number } {
  if (!(dt > 0)) {
    return inflow > 0 ? { chain: { ...chain, buffer: chain.buffer + inflow }, paid: 0 } : { chain, paid: 0 };
  }
  const steps = Math.min(MAX_SUBSTEPS, Math.max(1, Math.ceil(dt / MAX_STEP)));
  const h = dt / steps;
  const pools: Pools = { buffer: chain.buffer, served: chain.served, guests: chain.guests, paid: 0 };
  let workers = chain.workers;
  let seats = chain.seats;
  for (let k = 0; k < steps; k++) {
    pools.buffer += inflow / steps;
    let nextWorkers: TransportWorker[] | null = null;
    for (let i = 0; i < workers.length; i++) {
      const w = stepWorker(workers[i], i, p, h, pools, events);
      if (w !== workers[i]) (nextWorkers ??= workers.slice())[i] = w;
    }
    if (nextWorkers) workers = nextWorkers;
    let nextSeats: Seat[] | null = null;
    for (let i = 0; i < seats.length; i++) {
      const s = stepSeat(seats[i], i, p, h, pools, events);
      if (s !== seats[i]) (nextSeats ??= seats.slice())[i] = s;
    }
    if (nextSeats) seats = nextSeats;
  }
  return {
    chain: { buffer: pools.buffer, served: pools.served, workers, seats, guests: pools.guests },
    paid: pools.paid,
  };
}
