/**
 * A small deterministic player for the rules-term tests (tick.split, determinism, coins, term, move,
 * offline): it decides what lies on the desk a fixed hand after it landed, takes slips, calls the
 * election on the first allowed day with a majority, counts, ends election night and moves up when it
 * may. Its coin is its own (rngMix4 on the test's seed and the decisions so far), never a rules site,
 * so it never changes what the rules draw. It reaches the rules only through the public index. Not
 * shipped (no app file imports it).
 *
 * Time: every clock the runner stops at is a multiple of `DT` (13/128 s, about 10 Hz, a dyadic step so
 * the play clock sums exactly), and the player acts only at such a stop. `runTicks` steps DT at a time
 * (the 10 Hz run); `runEvents` jumps from stop to stop (the next decision, or the first grid time at or
 * after the rules' own `nextStop`). Both act at the same grid times, so by tick(a + b) = tick(a) then
 * tick(b) they must give the same trace byte for byte (determinism.test.ts).
 */
import { rngMix4 } from '../rng';
import * as R from '../decree';

/** The grid step of the runners: 13/128 s (about 10 Hz), exact in binary. */
export const DT = 13 / 128;

/** The first grid time at or after `t`. */
export function gridAt(t: number): number {
  return Math.ceil(t / DT - 1e-9) * DT;
}

export interface Hand {
  /** Seconds after landing before a paper is decided. */
  paper: number;
  /** Seconds after landing before a slip is taken. */
  slip: number;
  /** The player's coin seed; `sign` the chance of signing an affordable day paper. */
  seed: number;
  sign: number;
  /** Whether slips are taken (else put back). */
  slips: boolean;
}

export const HAND: Hand = { paper: 6, slip: 1.5, seed: 77, sign: 0.5, slips: true };

export interface TraceRow {
  t: number;
  act: string;
  cash: number;
  digest: string;
}

/** A short digest of the decree state and the shared fields the rules change (for traces). */
export function digest(g: R.DecreeGame): string {
  return JSON.stringify([g.cash, g.runEarnings, g.lifetimeEarnings, g.stats.playSeconds, g.prestigeCount, g.decree]);
}

/** When the player would act on the current state (Infinity when it waits for the rules). */
export function dueAt(cfg: R.DecreeConfig, g: R.DecreeGame, hand: Hand = HAND): number {
  const d = g.decree;
  const clock = g.stats.playSeconds;
  if (d.phase === 'count' || d.phase === 'result') return clock;
  if (R.canCount(cfg, g)) return clock;
  if (d.pending) return Infinity;
  if (d.desk) return d.desk.landedAt + (d.desk.type === 'slip' ? hand.slip : hand.paper);
  if (R.callNow(cfg, g)) return clock;
  return Infinity;
}

/** The player's one action now, or the same state when it has nothing to do. */
export function act(cfg: R.DecreeConfig, g: R.DecreeGame, events: R.DecreeEvent[], hand: Hand = HAND): { g: R.DecreeGame; act: string } {
  const d = g.decree;
  const clock = g.stats.playSeconds;
  if (d.phase === 'count') return { g: R.endElectionNight(cfg, g), act: 'night' };
  if (d.phase === 'result') {
    const up = R.canMoveUp(cfg, g);
    return { g: R.chooseAfterResult(cfg, g, up ? 'moveUp' : 'stay', 1_800_000_000_000 + clock * 1000, events), act: up ? 'moveUp' : 'stay' };
  }
  if (R.canCount(cfg, g)) return { g: R.countVotes(cfg, g, events), act: 'count' };
  if (d.pending) return { g, act: '' };
  if (d.desk && clock >= d.desk.landedAt + (d.desk.type === 'slip' ? hand.slip : hand.paper) - 1e-9) {
    if (d.desk.type === 'slip') {
      const up = hand.slips ? R.decide(cfg, g, 'sign', clock, events) : g;
      return up !== g ? { g: up, act: 'slip' } : { g: R.decide(cfg, g, 'refuse', clock, events), act: 'slipBack' };
    }
    const coin = rngMix4(hand.seed, 9, d.stats.decisions + d.stats.daysEver * 0 + d.drawerCount * 7, Math.floor(clock * 8)) / 4294967296;
    if (coin < hand.sign) {
      const s = R.decide(cfg, g, 'sign', clock, events);
      if (s !== g) return { g: s, act: 'sign' };
    }
    return { g: R.decide(cfg, g, 'refuse', clock, events), act: 'refuse' };
  }
  if (!d.desk && R.callNow(cfg, g)) return { g: R.callElection(cfg, g, clock, events), act: 'call' };
  return { g, act: '' };
}

/** Every action due now, until the player has nothing more to do at this moment (at most 50). */
function actAll(cfg: R.DecreeConfig, g: R.DecreeGame, events: R.DecreeEvent[], trace: TraceRow[] | null, hand: Hand): R.DecreeGame {
  let s = g;
  for (let k = 0; k < 50; k++) {
    const r = act(cfg, s, events, hand);
    if (r.g === s) break;
    s = r.g;
    if (trace) trace.push({ t: s.stats.playSeconds, act: r.act, cash: s.cash, digest: digest(s) });
  }
  return s;
}

/** The 10 Hz run: DT at a time for `seconds`, the player acting at every stop. */
export function runTicks(cfg: R.DecreeConfig, g: R.DecreeGame, seconds: number, opts: { hand?: Hand; trace?: TraceRow[]; events?: R.DecreeEvent[] } = {}): R.DecreeGame {
  const hand = opts.hand ?? HAND;
  const events = opts.events ?? [];
  const end = gridAt(g.stats.playSeconds + seconds);
  let s = actAll(cfg, g, events, opts.trace ?? null, hand);
  while (s.stats.playSeconds < end - 1e-9) {
    const next = Math.min(end, gridAt(s.stats.playSeconds + DT * 0.5));
    s = R.advanceDecree(cfg, s, next - s.stats.playSeconds, 0, events);
    s = actAll(cfg, s, events, opts.trace ?? null, hand);
  }
  return s;
}

/** The event-to-event run: from stop to stop (the next decision or the first grid time at or after the rules' next stop). */
export function runEvents(cfg: R.DecreeConfig, g: R.DecreeGame, seconds: number, opts: { hand?: Hand; trace?: TraceRow[]; events?: R.DecreeEvent[] } = {}): R.DecreeGame {
  const hand = opts.hand ?? HAND;
  const events = opts.events ?? [];
  const end = gridAt(g.stats.playSeconds + seconds);
  let s = actAll(cfg, g, events, opts.trace ?? null, hand);
  while (s.stats.playSeconds < end - 1e-9) {
    const clock = s.stats.playSeconds;
    const stop = R.nextStop(cfg, s);
    const due = dueAt(cfg, s, hand);
    let next = Math.min(end, stop === null ? Infinity : gridAt(stop), gridAt(due));
    if (!(next > clock + 1e-9)) next = Math.min(end, gridAt(clock + DT * 0.5));
    s = R.advanceDecree(cfg, s, next - clock, 0, events);
    s = actAll(cfg, s, events, opts.trace ?? null, hand);
  }
  return s;
}
