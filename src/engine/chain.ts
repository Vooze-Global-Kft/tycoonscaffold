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

/**
 * Largest slice of time simulated in one go. Inside a slice, workers only see goods that were on the
 * buffer at its start and guests only see deliveries made earlier in it, so long slices would bias
 * throughput: a tick is cut into slices of at most this length...
 */
const MAX_STEP = 0.25;
/**
 * ...up to this many (a tick of about 17 minutes at full resolution; longer ticks use longer slices,
 * which costs a little accuracy but never loses time or value). Ticks in the app are at most a few
 * seconds even during a rush; only tools pass longer ones.
 */
const MAX_SUBSTEPS = 4096;
/** Shortest round trip the chain simulates; shorter configured trips run at this speed (rates agree). */
export const MIN_TRIP_SECONDS = 0.05;
/**
 * A guest ignores crumbs smaller than this fraction of the smaller of a tray and a portion. It only
 * exists to stop guests eating float dust left by subtraction; it must stay far below one tray, or
 * guests would sit next to real food when portions are much bigger than trays.
 */
const DUST = 1e-9;

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

// ---------------------------------------------------------------- params

/**
 * The params the chain really runs on: NaN, negative or zero values from a broken config or an
 * overflow become safe ones (no capacity, no spend, the shortest trip), so a bad number can never
 * poison the buffers or spin the loops. The rate functions use the same values, so the steady-state
 * maths always matches the simulation.
 */
export function saneParams(p: ChainParams): ChainParams {
  const capacity = p.capacity > 0 ? Math.min(p.capacity, Number.MAX_VALUE) : 0;
  const spend = p.spend > 0 ? Math.min(p.spend, Number.MAX_VALUE) : 0;
  const tripSeconds = p.tripSeconds >= MIN_TRIP_SECONDS ? p.tripSeconds : MIN_TRIP_SECONDS;
  const serveSeconds = p.serveSeconds >= 0 ? p.serveSeconds : 0;
  if (capacity === p.capacity && spend === p.spend && tripSeconds === p.tripSeconds && serveSeconds === p.serveSeconds) return p;
  return { capacity, tripSeconds, transportAuto: p.transportAuto, spend, serveSeconds };
}

// ---------------------------------------------------------------- rates

/** Value per second the transport stage can move when the buffer never runs dry. */
export function transportRate(p: ChainParams, workers: number): number {
  const q = saneParams(p);
  return (Math.max(0, workers) * q.capacity) / q.tripSeconds;
}

export function seatCycleSeconds(p: ChainParams): number {
  return SEAT.gap + SEAT.arriving + saneParams(p).serveSeconds + SEAT.leaving;
}

/** Value per second the sales stage can absorb when the served buffer never runs dry. */
export function salesRate(p: ChainParams, seats: number): number {
  return (Math.max(0, seats) * saneParams(p).spend) / seatCycleSeconds(p);
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

/**
 * Deterministic 0..1 value from an integer; staggers guests so they don't all arrive in step.
 * Integer maths only: Math.sin is not guaranteed to give the same bits on every JS engine.
 */
function hash01(n: number): number {
  let x = (n | 0) ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

/** The pause before seat `seat` gets its next guest, fixed by the guest who sat there last (so it never changes mid-wait). */
function seatGapSeconds(seat: number, lastGuest: number): number {
  return SEAT.gap * (0.6 + 0.8 * hash01(lastGuest * 7 + seat * 13 + 1));
}

interface Pools {
  buffer: number;
  served: number;
  guests: number;
  paid: number;
  /** Guests who paid during this call. */
  payers: number;
  /** Smallest amount a guest bothers to take. */
  crumb: number;
}

/** Enough loop passes to finish every phase that fits in `h` seconds when the shortest full cycle lasts `cycle` seconds. */
function guardFor(h: number, cycle: number): number {
  return 8 + 6 * Math.ceil(h / cycle);
}

function stepWorker(w: TransportWorker, i: number, p: ChainParams, dt: number, pools: Pools, events?: ChainEvent[]): TransportWorker {
  let { phase, t, carry } = w;
  let left = dt;
  // Each pass either waits, finishes a phase or uses up the time. The guard only stops a runaway loop:
  // it allows every phase that fits in dt (a fixed 16 used to drop the rest of the tick when trips were
  // short or ticks long, so the chain ran slower than its advertised rate).
  const guard = guardFor(dt, Math.min(p.tripSeconds, ENTER_SECONDS));
  for (let pass = 0; pass < guard && left > 0; pass++) {
    if (phase === 'idle') {
      if (!p.transportAuto) break;
      phase = 'loading';
      t = 0;
    }
    if (phase === 'loading' && t === 0 && carry === 0) {
      // The load is taken at the start of loading. With nothing to carry (or no room), the worker waits at the buffer.
      if (pools.buffer <= 0 || p.capacity <= 0) break;
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
      if (carry > 0) events?.push({ type: 'unload', worker: i, amount: carry });
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
  const guard = guardFor(dt, SEAT.gap * 0.6 + SEAT.arriving + SEAT.leaving);
  for (let pass = 0; pass < guard && left > 0; pass++) {
    if (phase === 'waiting') {
      if (p.spend <= 0 || pools.served <= 0 || pools.served < pools.crumb) break;
      amount = Math.min(p.spend, pools.served);
      pools.served -= amount;
      events?.push({ type: 'served', seat: i, amount });
      phase = 'eating';
      t = 0;
    }
    const dur =
      phase === 'empty' ? seatGapSeconds(i, guest) : phase === 'arriving' ? SEAT.arriving : phase === 'eating' ? p.serveSeconds : SEAT.leaving;
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
      pools.payers += 1;
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
 * finished during this tick. Returns the new chain, the value guests paid
 * (before any global multiplier) and how many guests paid. Pass an array as
 * `events` to collect what happened, for sounds and effects.
 *
 * A dt or inflow that is NaN, infinite or negative is treated as 0, so a bad
 * number from the caller can never poison the saved chain.
 */
export function advanceChain(
  chain: ChainState,
  params: ChainParams,
  dt: number,
  inflow: number,
  events?: ChainEvent[],
): { chain: ChainState; paid: number; guestsPaid: number } {
  const add = inflow > 0 && inflow < Infinity ? inflow : 0;
  if (!(dt > 0 && dt < Infinity)) {
    return add > 0 ? { chain: { ...chain, buffer: chain.buffer + add }, paid: 0, guestsPaid: 0 } : { chain, paid: 0, guestsPaid: 0 };
  }
  const p = saneParams(params);
  const steps = Math.min(MAX_SUBSTEPS, Math.max(1, Math.ceil(dt / MAX_STEP)));
  const h = dt / steps;
  const tray = p.capacity > 0 ? Math.min(p.capacity, p.spend > 0 ? p.spend : p.capacity) : p.spend;
  const pools: Pools = { buffer: chain.buffer, served: chain.served, guests: chain.guests, paid: 0, payers: 0, crumb: tray * DUST };
  let workers = chain.workers;
  let seats = chain.seats;
  const share = add / steps;
  for (let k = 0; k < steps; k++) {
    pools.buffer += share;
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
    guestsPaid: pools.payers,
  };
}

// ---------------------------------------------------------------- repair

const WORKER_PHASES: readonly WorkerPhase[] = ['entering', 'idle', 'loading', 'toSales', 'unloading', 'toBuffer'];
const SEAT_PHASES: readonly SeatPhase[] = ['empty', 'arriving', 'waiting', 'eating', 'leaving'];

/** A finite number >= 0, or 0. */
function amountOf(x: unknown): number {
  return typeof x === 'number' && x >= 0 && x < Infinity ? x : 0;
}
function progressOf(x: unknown): number {
  return typeof x === 'number' && x >= 0 && x < 1 ? x : 0;
}

function workerOk(w: unknown): w is TransportWorker {
  if (typeof w !== 'object' || w === null) return false;
  const x = w as TransportWorker;
  return WORKER_PHASES.includes(x.phase) && progressOf(x.t) === x.t && amountOf(x.carry) === x.carry;
}

function seatOk(s: unknown): s is Seat {
  if (typeof s !== 'object' || s === null) return false;
  const x = s as Seat;
  return (
    SEAT_PHASES.includes(x.phase) &&
    progressOf(x.t) === x.t &&
    amountOf(x.amount) === x.amount &&
    (x.amount === 0 || x.phase === 'eating') &&
    Number.isInteger(x.guest) &&
    x.guest >= 0
  );
}

/**
 * Makes a chain from a save exactly `workers` x `seats` big and structurally sound: broken
 * numbers become 0, unknown phases restart, and the value held by workers and seats that are
 * removed (or by a seat that is not eating) goes back to the buffer or the served counter, so
 * nothing is lost or invented. Returns the same object when it is already fine.
 */
export function fitChain(chain: ChainState, workers: number, seats: number): ChainState {
  const src = (typeof chain === 'object' && chain !== null ? chain : {}) as Partial<ChainState>;
  const inW: unknown[] = Array.isArray(src.workers) ? src.workers : [];
  const inS: unknown[] = Array.isArray(src.seats) ? src.seats : [];
  const nW = Math.max(0, Math.floor(workers) || 0);
  const nS = Math.max(0, Math.floor(seats) || 0);
  const guests = Number.isInteger(src.guests) && (src.guests as number) >= 0 ? (src.guests as number) : 0;
  if (
    inW.length === nW &&
    inS.length === nS &&
    amountOf(src.buffer) === src.buffer &&
    amountOf(src.served) === src.served &&
    guests === src.guests &&
    inW.every(workerOk) &&
    inS.every(seatOk)
  ) {
    return chain;
  }
  let buffer = amountOf(src.buffer);
  let served = amountOf(src.served);
  const w: TransportWorker[] = [];
  inW.forEach((raw, i) => {
    const x = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<TransportWorker>;
    const carry = amountOf(x.carry);
    if (i >= nW) {
      buffer += carry;
      return;
    }
    w.push(WORKER_PHASES.includes(x.phase as WorkerPhase) ? { phase: x.phase as WorkerPhase, t: progressOf(x.t), carry } : { phase: 'idle', t: 0, carry });
  });
  while (w.length < nW) w.push({ phase: inW.length === 0 && w.length === 0 ? 'idle' : 'entering', t: 0, carry: 0 });
  const s: Seat[] = [];
  inS.forEach((raw, i) => {
    const x = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<Seat>;
    const amount = amountOf(x.amount);
    const phase = SEAT_PHASES.includes(x.phase as SeatPhase) ? (x.phase as SeatPhase) : 'empty';
    if (i >= nS || phase !== 'eating') {
      served += amount;
      if (i >= nS) return;
      s.push({ phase, t: progressOf(x.t), amount: 0, guest: Number.isInteger(x.guest) && (x.guest as number) >= 0 ? (x.guest as number) : 0 });
      return;
    }
    s.push({ phase, t: progressOf(x.t), amount, guest: Number.isInteger(x.guest) && (x.guest as number) >= 0 ? (x.guest as number) : 0 });
  });
  while (s.length < nS) s.push({ phase: 'empty', t: 0, amount: 0, guest: 0 });
  return { ...src, buffer, served, workers: w, seats: s, guests } as ChainState;
}
