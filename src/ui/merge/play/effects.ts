/**
 * The play canvas's moments (spec 4.2, 3.1): short tweens of atlas sprites driven by ONE frame
 * callback on the UI thread (./usePlayAnim.ts). The JavaScript thread only appends a description
 * (a `Tween`, plain numbers and a sprite id) to a queue it writes as one shared value; the UI thread
 * stamps each tween's start on the first frame that sees it and draws it until it ends. So nothing
 * per frame crosses threads, no React render happens per frame, and an effect never blocks input
 * (the board's state has already changed when its beat plays).
 *
 * The beats are composed from tweens in ./beats.ts from the rules' events. Kinds:
 * - K_SPRITE: an atlas sprite (layer 0: items, layer 1: fx) moving from (x0, y0) to (x1, y1) along
 *   an arc, scaling a0 → a1 (drawn points / design points), fading o0 → o1, turning `spin` radians;
 * - K_ARRIVE, K_SHAKE: a counter's customer stepping up, a wrong ticket's shake (counter j = x0);
 * - K_PAID: a paid ticket's FILLED stamp over its snapshot (slot = x0).
 */
import { fxSlow } from './devSlow';

export const K_SPRITE = 0;
export const K_ARRIVE = 1;
export const K_SHAKE = 2;
export const K_PAID = 3;

/** Easing curves. */
export const E_LINEAR = 0;
export const E_OUT = 1;
export const E_BACK = 2;
export const E_INOUT = 3;

export interface Tween {
  id: number;
  k: number;
  /** 0: the items atlas (goods), 1: the fx atlas. */
  layer: number;
  s: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  a0: number;
  a1: number;
  o0: number;
  o1: number;
  /** Points lifted at the middle of the path (up is positive). */
  arc: number;
  spin: number;
  ease: number;
  /** Seconds: wait, move, then stay at the end for `hold`. */
  delay: number;
  d: number;
  hold: number;
}

export const NO_TWEENS: Tween[] = [];

/** Total life of a tween, s. */
export function tweenLife(t: Pick<Tween, 'delay' | 'd' | 'hold'>): number {
  'worklet';
  return t.delay + t.d + t.hold;
}

export function ease(kind: number, u: number): number {
  'worklet';
  const v = Math.min(1, Math.max(0, u));
  if (kind === E_OUT) return 1 - (1 - v) * (1 - v) * (1 - v);
  if (kind === E_BACK) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(v - 1, 3) + c1 * Math.pow(v - 1, 2);
  }
  if (kind === E_INOUT) return v * v * (3 - 2 * v);
  return v;
}

/** A tween's state at `age` seconds after its start: null before its delay or after its life. */
export function tweenAt(t: Tween, age: number): { x: number; y: number; a: number; o: number; r: number; u: number } | null {
  'worklet';
  if (age < t.delay || age > t.delay + t.d + t.hold) return null;
  const raw = t.d > 0 ? Math.min(1, (age - t.delay) / t.d) : 1;
  const e = ease(t.ease, raw);
  const x = t.x0 + (t.x1 - t.x0) * e;
  const y = t.y0 + (t.y1 - t.y0) * e - Math.sin(Math.min(1, raw) * Math.PI) * t.arc;
  const a = t.a0 + (t.a1 - t.a0) * e;
  // Opacity follows time, not the overshooting curve.
  const o = t.o0 + (t.o1 - t.o0) * raw;
  return { x, y, a, o, r: t.spin * e, u: raw };
}

/**
 * The JavaScript side's queue: `push` appends tweens (all stamped by the same UI frame when pushed
 * together), keeps only those that can still be running, and hands the list to `write` (the
 * shared value's setter). Ids only grow.
 */
export class TweenQueue {
  private list: { t: Tween; until: number }[] = [];
  private next = 1;
  constructor(
    private readonly write: (list: Tween[]) => void,
    private readonly now: () => number = () => Date.now() / 1000,
    private readonly max = 72,
  ) {}

  push(tweens: Omit<Tween, 'id'>[]): void {
    if (tweens.length === 0) return;
    const t = this.now();
    // A tween may start a frame or two late on the UI thread: keep it a second past its life.
    this.list = this.list.filter((e) => e.until > t);
    for (const raw of tweens) {
      const tw = fxSlow === 1 ? raw : { ...raw, delay: raw.delay * fxSlow, d: raw.d * fxSlow, hold: raw.hold * fxSlow };
      this.list.push({ t: { ...tw, id: this.next++ }, until: t + tweenLife(tw) + 1 });
    }
    if (this.list.length > this.max) this.list = this.list.slice(this.list.length - this.max);
    this.write(this.list.map((e) => e.t));
  }

  /** Tweens still listed (tests). */
  size(): number {
    return this.list.length;
  }
}

/** A sprite tween with defaults: no arc, no spin, ease out, full opacity, no delay or hold. */
export function sprite(layer: 0 | 1, s: string, from: { x: number; y: number }, to: { x: number; y: number }, d: number, o: Partial<Omit<Tween, 'id' | 'k' | 'layer' | 's' | 'x0' | 'y0' | 'x1' | 'y1' | 'd'>> = {}): Omit<Tween, 'id'> {
  return { k: K_SPRITE, layer, s, x0: from.x, y0: from.y, x1: to.x, y1: to.y, d, a0: o.a0 ?? 1, a1: o.a1 ?? o.a0 ?? 1, o0: o.o0 ?? 1, o1: o.o1 ?? o.o0 ?? 1, arc: o.arc ?? 0, spin: o.spin ?? 0, ease: o.ease ?? E_OUT, delay: o.delay ?? 0, hold: o.hold ?? 0 };
}

/** A counter tween (arrive or shake) or a paid slot: `index` in x0. */
export function marker(k: number, index: number, d: number, delay = 0): Omit<Tween, 'id'> {
  return { k, layer: 0, s: '', x0: index, y0: 0, x1: index, y1: 0, d, a0: 1, a1: 1, o0: 1, o1: 1, arc: 0, spin: 0, ease: E_LINEAR, delay, hold: 0 };
}
