/**
 * Plays the catalogue's vibration patterns: a list of pulses with pauses (in
 * milliseconds) between them. Pure scheduling; the platform call that makes
 * the phone move is passed in, and time comes from a Clock.
 *
 * The rules that keep haptics pleasant when events arrive in bursts:
 *
 * 1. One pattern at a time. A new pattern cancels whatever is left of the
 *    older one.
 * 2. A global minimum gap between pulses. A pattern that arrives too soon
 *    after the last pulse starts late by the difference, unless it opens
 *    with a stronger pulse than the one just played (a button's tick followed
 *    at once by "buy" should feel like one firm tap, not two).
 * 3. A lone tick ('select', 'soft', 'light') is the kind of thing that fires
 *    many times a second. It is dropped when it arrives inside the gap, and
 *    it never interrupts a longer pattern that is still playing.
 */
import type { Clock } from './clock';
import { systemClock } from './clock';
import type { HapticStep } from './catalog';

export type HapticPulse = Exclude<HapticStep, number>;

/** How much a pulse stands out. Weight 1 pulses are "ticks". */
const WEIGHT: Record<HapticPulse, number> = {
  select: 1,
  soft: 1,
  light: 1,
  rigid: 2,
  medium: 2,
  heavy: 3,
  warning: 4,
  success: 4,
  error: 4,
};

export interface PatternOptions {
  /** Shortest time between two pulses of different patterns. */
  minGapMs: number;
  /** Two pulses of one pattern are never closer than this, even with no pause written between them. */
  minStepMs?: number;
  clock?: Clock;
}

interface Beat {
  at: number;
  pulse: HapticPulse;
}

/** Turns `['heavy', 80, 'success']` into pulses with start times: heavy at 0, success at 80. */
export function timeline(steps: readonly HapticStep[], minStepMs: number): Beat[] {
  const beats: Beat[] = [];
  let at = 0;
  let pause = 0;
  for (const step of steps) {
    if (typeof step === 'number') {
      if (Number.isFinite(step) && step > 0) pause += step;
      continue;
    }
    if (!(step in WEIGHT)) continue; // not a pulse we know: skip it rather than throw
    // A pause before the first pulse is kept as written; later pulses are at least minStepMs apart.
    at += beats.length === 0 ? pause : Math.max(pause, minStepMs);
    beats.push({ at, pulse: step });
    pause = 0;
  }
  return beats;
}

export class PatternPlayer {
  private timers = new Set<unknown>();
  private lastPulseAt = -Infinity;
  private lastWeight = 0;
  private readonly minGapMs: number;
  private readonly minStepMs: number;
  private readonly clock: Clock;

  constructor(
    private fire: (pulse: HapticPulse) => void,
    options: PatternOptions,
  ) {
    this.minGapMs = options.minGapMs;
    this.minStepMs = options.minStepMs ?? 30;
    this.clock = options.clock ?? systemClock;
  }

  /** True while pulses of the current pattern are still waiting to fire. */
  get busy(): boolean {
    return this.timers.size > 0;
  }

  /** Starts a pattern. Returns false when it was dropped (empty, or a tick that came too soon). */
  play(steps: readonly HapticStep[]): boolean {
    const beats = timeline(steps, this.minStepMs);
    if (beats.length === 0) return false;
    const now = this.clock.now();
    const sinceLast = now - this.lastPulseAt;
    const first = WEIGHT[beats[0].pulse];

    if (beats.length === 1 && first <= 1) {
      if (this.busy || sinceLast < this.minGapMs) return false;
    } else {
      this.cancel();
    }

    const wait = first > this.lastWeight ? 0 : Math.max(0, this.minGapMs - sinceLast);
    for (const beat of beats) this.schedule(beat.pulse, wait + beat.at);
    return true;
  }

  /** Drops the pulses that have not fired yet. */
  cancel(): void {
    for (const timer of this.timers) this.clock.clearTimeout(timer);
    this.timers.clear();
  }

  private schedule(pulse: HapticPulse, delay: number): void {
    if (delay <= 0) {
      this.emit(pulse);
      return;
    }
    const timer = this.clock.setTimeout(() => {
      this.timers.delete(timer);
      this.emit(pulse);
    }, delay);
    this.timers.add(timer);
  }

  private emit(pulse: HapticPulse): void {
    this.lastPulseAt = this.clock.now();
    this.lastWeight = WEIGHT[pulse];
    try {
      this.fire(pulse);
    } catch {
      // A failed vibration must never reach game code.
    }
  }
}
