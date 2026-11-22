/**
 * The toolkit behind every code-drawn prop (moved out of src/ui/sim/art/props.tsx so the shared
 * pieces and the restaurant's props draw with one set of helpers and one picture cache):
 * the palette, animated inputs, per-frame matrices, the art cache and the recording helpers.
 * Nothing here is specific to a game.
 */
import { BlendMode, Skia, TileMode, select, type SharedValueSelector, type SkCanvas, type SkPath, type SkPicture } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { startMapper, stopMapper, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { OUTLINE, Pen, alpha, arc, blob, builder, circle, done, ellipse, line, luma, merged, mix, outlineFor, poly, record, rrect, skColor, type ShapeOpts } from './draw';
import type { ArtPalette } from './types';

/** Screen pixels per drawing unit at `scale = 1`: a round adult stands about 50 px tall. */
export const UNIT = 0.52;

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

/** The default trattoria colours. */
export const DEFAULT_PALETTE: ArtPalette = {
  outline: OUTLINE,
  primary: '#E63946',
  accent: '#FFC93C',
  wood: '#C98B4A',
  metal: '#D5DCE5',
  stone: '#F2DCBB',
  glow: '#FF9A2E',
  cloth: '#FFFBF2',
  wall: '#BFE3D5',
  floorA: '#FBEBD2',
  floorB: '#F1D9B5',
};

/** A full palette from a few overrides: `makePalette({ primary: '#6C5CE7', wall: '#2B2D42' })`. */
export function makePalette(overrides?: Partial<ArtPalette> | null): ArtPalette {
  return { ...DEFAULT_PALETTE, ...(overrides ?? {}) };
}

export function usePalette(palette: Partial<ArtPalette> | undefined): [ArtPalette, string] {
  const key = palette ? JSON.stringify(palette) : '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => [makePalette(palette), key], [key]);
}

export const INK = '#3A2416';
export const WHITE = '#FFFFFF';
export const dark = (c: string, t: number) => mix(c, '#000000', t);
export const tint = (c: string, t: number) => mix(c, '#FFFFFF', t);

// ---------------------------------------------------------------------------
// Plumbing: values, matrices, the per-prop rig, the picture cache
// ---------------------------------------------------------------------------

/** A plain value or a Reanimated shared value. */
export type Anim<T> = T | SharedValue<T>;

export function isShared(v: unknown): v is SharedValue<unknown> {
  return typeof v === 'object' && v !== null && (v as { _isReanimatedSharedValue?: boolean })._isReanimatedSharedValue === true;
}

/** One 3x3 matrix, row-major. */
export type Mat = number[];
export type Mats<K extends string> = Record<K, Mat>;

export function makeMats<K extends string>(keys: readonly K[]): Mats<K> {
  const r = {} as Mats<K>;
  for (const k of keys) r[k] = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  return r;
}

/** o = translate(tx, ty) * rotate(rot) * scale(sx, sy) */
export function put(o: Mat, tx: number, ty: number, rot: number, sx: number, sy: number) {
  'worklet';
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  o[0] = c * sx;
  o[1] = -s * sy;
  o[2] = tx;
  o[3] = s * sx;
  o[4] = c * sy;
  o[5] = ty;
}

/** Shows a part at (tx, ty) with size `s`; 0 hides it. */
export function pop(o: Mat, tx: number, ty: number, rot: number, s: number) {
  'worklet';
  if (s < 0.015) {
    o[0] = 0;
    o[1] = 0;
    o[3] = 0;
    o[4] = 0;
    return;
  }
  put(o, tx, ty, rot, s, s);
}

export function clamp01(x: number) {
  'worklet';
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export function ease(x: number) {
  'worklet';
  const t = x < 0 ? 0 : x > 1 ? 1 : x;
  return t * t * (3 - 2 * t);
}

/** 0..1 with a little overshoot at the end: things that pop in. */
export function backOut(x: number) {
  'worklet';
  const t = (x < 0 ? 0 : x > 1 ? 1 : x) - 1;
  return 1 + t * t * (2.6 * t + 1.6);
}

/** 0 at the ends, 1 in the middle: fades something in and out over a 0..1 life. */
export function life(u: number, fadeIn: number, fadeOut: number) {
  'worklet';
  if (u <= 0 || u >= 1) return 0;
  const a = u / fadeIn;
  const b = (1 - u) / fadeOut;
  const m = a < b ? a : b;
  return m > 1 ? 1 : m;
}

export function frac(x: number) {
  'worklet';
  return x - Math.floor(x);
}

/** Reads a number that may be a shared value. Usable on both threads. */
export function num(v: Anim<number>): number {
  'worklet';
  return typeof v === 'number' ? v : v.value;
}

/** Reads an on/off or 0..1 input that may be a shared value. */
export function level(v: Anim<number | boolean>): number {
  'worklet';
  const r = typeof v === 'object' ? v.value : v;
  return r === true ? 1 : r === false ? 0 : r;
}

/** Seconds since the previous frame (0 on the first), and remembers the clock in `mem[0]`. */
export function tick(mem: number[], clock: number): number {
  'worklet';
  const first = mem[0] !== mem[0];
  let dt = first ? 0 : clock - mem[0];
  mem[0] = clock;
  if (dt < 0) dt = 0;
  if (dt > 100) dt = 100;
  return dt;
}

/** Moves `mem[i]` towards `target` with time constant `tau` (ms); jumps there on the first frame. */
export function approach(mem: number[], i: number, target: number, dt: number, tau: number): number {
  'worklet';
  const v = mem[i];
  if (v !== v) mem[i] = target;
  else if (dt > 0) {
    const n = v + (target - v) * (1 - Math.exp(-dt / tau));
    // Snap when close, so a settled prop stops changing (and can skip its frames).
    mem[i] = Math.abs(target - n) < 1e-3 ? target : n;
  }
  return mem[i];
}

/**
 * Milliseconds since the trigger last changed (a large number if it never did).
 * Uses `mem[i]` for the last trigger value and `mem[i + 1]` for the start time.
 */
export function sinceBump(mem: number[], i: number, trigger: number, clock: number): number {
  'worklet';
  if (mem[i] !== mem[i]) {
    mem[i] = trigger;
    mem[i + 1] = -1e9;
  } else if (mem[i] !== trigger) {
    mem[i] = trigger;
    mem[i + 1] = clock;
  }
  return clock - mem[i + 1];
}

export interface RigMem<K extends string> {
  flip: number;
  a: Mats<K>;
  b: Mats<K>;
  mem: number[];
}

export const MEM_SIZE = 12;
export const freshMem = () => Array.from({ length: MEM_SIZE }, () => NaN);

/**
 * The matrices of one prop, recomputed on the UI thread whenever one of the
 * shared values in `deps` changes. `step` is a worklet that fills the matrices
 * in place; `mem` is its scratch memory between frames (NaN until first written).
 * `deps` lists everything `step` closes over, like the dependencies of an effect.
 * A `step` may return `false` (before writing anything) to say nothing changed since the
 * previous frame: the matrices on screen are kept and nothing is redrawn for this prop.
 */
export function useRig<K extends string>(keys: readonly K[], step: (o: Mats<K>, mem: number[]) => void | false, deps: readonly unknown[]): Record<K, SharedValueSelector<Mat>> {
  // The first frame is worked out here so nothing flashes in unplaced.
  const [first] = useState<Mats<K>>(() => {
    const o = makeMats(keys);
    step(o, freshMem());
    return o;
  });
  const rig = useSharedValue<Mats<K>>(first);
  const state = useSharedValue<RigMem<K>>({ flip: 0, a: makeMats(keys), b: makeMats(keys), mem: freshMem() });
  useEffect(() => {
    const id = startMapper(
      () => {
        'worklet';
        // The state object lives on the UI thread and is updated in place.
        const st = state.value;
        const o = st.flip === 0 ? st.a : st.b;
        if (step(o, st.mem) === false) return;
        st.flip = 1 - st.flip;
        rig.value = o;
      },
      deps.filter(isShared),
      [rig as SharedValue<unknown>],
    );
    return () => stopMapper(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return useMemo(() => {
    const out = {} as Record<K, SharedValueSelector<Mat>>;
    for (const k of keys) out[k] = select(rig, k);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rig]);
}

export const ROOT_KEYS = ['root'] as const;

/** The matrix that places a prop drawn in units of `unit` pixels at (x, y). `flip` -1 mirrors it. */
export function useRoot(x: Anim<number>, y: Anim<number>, scale: Anim<number>, unit: number, flip: Anim<number> = 1): SharedValueSelector<Mat> {
  return useRig(
    ROOT_KEYS,
    (o) => {
      'worklet';
      const k = unit * num(scale);
      put(o.root, num(x), num(y), 0, k * (num(flip) < 0 ? -1 : 1), k);
    },
    [x, y, scale, unit, flip],
  ).root;
}

// --- pictures are cached by what they show, and freed when nothing uses them ---

export interface CacheEntry {
  art: object;
  refs: number;
  touched: number;
}
export const ART = new Map<string, CacheEntry>();
export const ART_KEEP = 48;

export function disposeArt(art: object) {
  for (const v of Object.values(art)) {
    const list = Array.isArray(v) ? v : [v];
    for (const item of list) {
      const d = item as { dispose?: () => void; pic?: { dispose?: () => void } } | null;
      if (d && typeof d.dispose === 'function') d.dispose();
      else if (d && d.pic && typeof d.pic.dispose === 'function') d.pic.dispose();
    }
  }
}

export function sweepArt() {
  if (ART.size <= ART_KEEP) return;
  const now = Date.now();
  for (const [k, e] of ART) {
    if (e.refs <= 0 && now - e.touched > 5000) {
      disposeArt(e.art);
      ART.delete(k);
    }
  }
}

/** Drawings for `key`, built once and shared by every prop that shows the same thing. */
export function useArt<T extends object>(key: string, build: () => T): T {
  const art = useMemo(() => {
    let e = ART.get(key);
    if (!e) {
      e = { art: build(), refs: 0, touched: Date.now() };
      ART.set(key, e);
    }
    e.touched = Date.now();
    return e.art as T;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    const e = ART.get(key);
    if (e) e.refs++;
    return () => {
      const cur = ART.get(key);
      if (cur) {
        cur.refs--;
        cur.touched = Date.now();
      }
      sweepArt();
    };
  }, [key]);
  return art;
}

// ---------------------------------------------------------------------------
// Drawing helpers shared by the props
// ---------------------------------------------------------------------------

export const rc = (x: number, y: number, w: number, h: number) => ({ x, y, width: w, height: h });

/** A doorway shape: straight sides and a round top. `baseY` is the bottom, `h` the full height. */
export function archPath(cx: number, baseY: number, hw: number, h: number): SkPath {
  const b = builder();
  const top = baseY - h;
  b.moveTo(cx - hw, baseY);
  b.lineTo(cx - hw, top + hw);
  b.arcToOval(rc(cx - hw, top, hw * 2, hw * 2), 180, 180, false);
  b.lineTo(cx + hw, baseY);
  b.close();
  return done(b);
}

/** A flame: a teardrop with its base at the origin, `h` tall. */
export function flamePath(w: number, h: number, lean = 0): SkPath {
  return blob([[0, 0], [-w * 0.5, -h * 0.16], [-w * 0.42, -h * 0.5], [lean * w - w * 0.08, -h, 0], [w * 0.36, -h * 0.55], [w * 0.5, -h * 0.18]]);
}

/** A soft round glow recorded with a radial gradient: bright in the middle, gone at radius `r`. */
export function softGlow(p: Pen, cx: number, cy: number, rx: number, ry: number, color: string, strength = 1, core = WHITE) {
  p.at(
    cx,
    cy,
    () => p.radial(circle(0, 0, rx), 0, 0, rx, [alpha(mix(color, core, 0.55), 0.95 * strength), alpha(color, 0.55 * strength), alpha(color, 0)], [0, 0.45, 1]),
    0,
    1,
    ry / rx,
  );
}

/** A little cloud: steam, smoke, frost. Centred on the origin, about 2r wide. */
export function drawPuff(p: Pen, r: number, color: string, outline: string) {
  const cloud = merged(circle(-r * 0.45, r * 0.12, r * 0.62), circle(r * 0.42, r * 0.16, r * 0.58), circle(0, -r * 0.3, r * 0.68));
  p.shape(cloud, color, { ow: 1.7, outline, shade: r * 0.2, shadeColor: mix(color, outline, 0.14) });
}

/**
 * The soft shadow a box-shaped prop casts on the floor around its base (stations, the pass, the door),
 * the same warm ink at about the strength of a character's shadow. `hw` is half the base width.
 */
export function baseShadow(p: Pen, hw: number, depth = 8) {
  p.fill(rrect(-hw - 4, -depth * 0.45, hw * 2 + 8, depth, depth / 2), alpha(INK, 0.09));
  p.fill(rrect(-hw, -depth * 0.3, hw * 2, depth * 0.7, depth * 0.35), alpha(INK, 0.11));
}

/** A padlock, centred on its body. About 26 x 32 units. */
export function drawPadlock(p: Pen, body = '#FFC93C', metal = '#C9D1DB') {
  const sh = arc(0, -9, 7.5, 9, 180, 180);
  p.stroke(sh, INK, 8.6);
  p.stroke(sh, metal, 4.2);
  p.stroke(line(-7.5, -9, -7.5, -4), INK, 8.6, true);
  p.stroke(line(7.5, -9, 7.5, -4), INK, 8.6, true);
  p.stroke(line(-7.5, -9, -7.5, -4), metal, 4.2, true);
  p.stroke(line(7.5, -9, 7.5, -4), metal, 4.2, true);
  p.shape(rrect(-12.5, -6, 25, 21, 5.5), body, { ow: 2.8, shade: 2.6, light: 1.6 });
  p.dot(0, 2.6, 3.1, INK);
  p.fill(poly([[-1.9, 3.4], [1.9, 3.4], [2.8, 10], [-2.8, 10]]), INK);
}

/**
 * Maps every colour to a light, desaturated tone pulled towards the wall: the "not bought yet" look.
 * Quiet on purpose, so the working stations and the actors keep the eye; only the padlock stays in colour.
 */
export function lockedTint(wall: string): (c: string) => string {
  const dim = mix('#8F8790', wall, 0.45);
  const lit = mix('#E4DEDC', wall, 0.45);
  return (c: string) => {
    const a = c.length > 7 ? c.slice(7) : '';
    return mix(dim, lit, luma(c.slice(0, 7))) + a;
  };
}

/** A pen that recolours everything drawn through it. */
export class TintPen extends Pen {
  private map: (c: string) => string;
  constructor(canvas: SkCanvas, map: (c: string) => string, outline: string, ow: number) {
    super(canvas, outline, ow);
    this.map = map;
  }
  fill(path: SkPath, color: string) {
    super.fill(path, this.map(color));
  }
  stroke(path: SkPath, color: string, width: number, butt = false) {
    super.stroke(path, this.map(color), width, butt);
  }
  dot(cx: number, cy: number, r: number, color: string) {
    super.dot(cx, cy, r, this.map(color));
  }
  glow(path: SkPath, color: string, sigma: number) {
    super.glow(path, this.map(color), sigma);
  }
  gradient(path: SkPath, x0: number, y0: number, x1: number, y1: number, colors: string[], pos: number[] | null = null) {
    super.gradient(path, x0, y0, x1, y1, colors.map(this.map), pos);
  }
  radial(path: SkPath, cx: number, cy: number, r: number, colors: string[], pos: number[] | null = null) {
    super.radial(path, cx, cy, r, colors.map(this.map), pos);
  }
}

/** Records a drawing with every colour passed through `map`. */
export function recordTinted(draw: (p: Pen) => void, map: (c: string) => string, outline: string, ow = 3.4): SkPicture {
  return rec(
    (base) => {
      const p = new TintPen(base.c, map, outline, ow);
      try {
        draw(p);
      } finally {
        p.dispose();
      }
    },
    outline,
    ow,
  );
}

/** Paints and shaders made while recording; freed once the picture is finished (WASM memory is not garbage collected). */
export let litter: { dispose(): void }[] = [];

/** `record` from the drawing kit, plus cleanup of what the helpers below allocate. */
export function rec(draw: (p: Pen) => void, outline = OUTLINE, ow = 3.4): SkPicture {
  const outer = litter;
  litter = [];
  try {
    return record(draw, outline, ow);
  } finally {
    for (const t of litter) t.dispose();
    litter = outer;
  }
}

/** Fills `path` with a radial gradient that adds light to what is under it (glows, shine). */
export function addLight(p: Pen, path: SkPath, cx: number, cy: number, r: number, colors: string[], pos: number[] | null = null) {
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setBlendMode(BlendMode.Screen);
  const sh = Skia.Shader.MakeRadialGradient({ x: cx, y: cy }, r, colors.map(skColor), pos, TileMode.Clamp);
  paint.setShader(sh);
  p.c.drawPath(path, paint);
  litter.push(sh, paint);
}

/** `Pen.shape`, with `inside` drawn clipped to the shape before the outline goes on. */
export function shapeWith(p: Pen, path: SkPath, color: string, inside: () => void, o: ShapeOpts = {}) {
  p.shape(path, color, { ...o, ow: 0 });
  p.clipped(path, inside);
  const ow = o.ow ?? p.ow;
  if (ow > 0) p.stroke(path, o.outline ?? outlineFor(color, p.outline), ow);
}

/** A rod, pipe or pole: a line with an outline around it. */
export function rod(p: Pen, path: SkPath, color: string, width: number, ow = 1.5) {
  p.stroke(path, outlineFor(color, p.outline), width + ow * 2);
  p.stroke(path, color, width);
}

/** A cog wheel centred on the origin. */
export function gearPath(r: number, teeth: number, depth: number): SkPath {
  const b = builder();
  const n = teeth * 4;
  for (let i = 0; i < n; i++) {
    const a = ((i - 0.5) * Math.PI * 2) / n;
    const rr = i % 4 < 2 ? r : r - depth;
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (i === 0) b.moveTo(x, y);
    else b.lineTo(x, y);
  }
  b.close();
  return done(b);
}

/** A soft floor shadow under something that stands or lands (two stacked ellipses). */
export function drawShadow(p: Pen, rx = 16, ry = 4.6, strength = 1) {
  p.fill(ellipse(0, 0, rx, ry), alpha('#3A2416', 0.13 * strength));
  p.fill(ellipse(0, 0, rx * 0.72, ry * 0.7), alpha('#3A2416', 0.13 * strength));
}
