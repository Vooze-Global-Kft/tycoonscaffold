/**
 * The yard's sprite atlas: every placeholder drawing of ./draw.ts baked ONCE into one image (under 2048
 * pixels a side; the density drops in steps of 0.25 until it fits), so the whole yard (props, wrecks,
 * the machine, the truck, the worker, the helpers, rings and carried pieces) is drawn by ONE Skia
 * `Atlas` call a frame (./YardView.tsx). Baked behind the loading screen for the window's density and
 * kept for the life of the app (never freed: a mounted canvas may still draw it).
 *
 * A sprite is six numbers in `rects` (x, y, w, h in atlas pixels; ax, ay its anchor inside them, the
 * footprint centre on the ground), found by name through `index`. Pure Skia (no React).
 */
import { ClipOp, Skia, type SkCanvas, type SkImage } from '@shopify/react-native-skia';
import { WORLD_LABELS } from '../strings';
import { DIRS, WALK_FRAMES, crate, machine, pawn, piece, pile, ring, truck, wall, wreck, wreckPieces, type View3q } from './draw';
import type { YardLayout } from './yard';
import type { SalvageProp } from '../../../config/schema.salvage';

/** Every phone GPU takes a 2048 x 2048 texture. */
export const MAX_SIDE = 2048;
const PAD = 2;
/** Headings of the truck's sprites (a three-quarter view cannot simply rotate a picture). */
export const TRUCK_HEADINGS = 8;
/** Steps of the cut ring. */
export const RING_STEPS = 8;
/** The radius the ring sprites are baked at, metres (scaled per wreck). */
export const RING_R = 1;
export const WORKER_VEST = '#F28C28';
export const HELPER_VEST = '#3D7FD6';

export interface Def {
  name: string;
  /** Bounds in points round the anchor: left and top are negative. */
  l: number;
  t: number;
  r: number;
  b: number;
  draw: (c: SkCanvas) => void;
}

export interface SpriteSheet {
  image: SkImage;
  density: number;
  width: number;
  height: number;
  names: string[];
  index: Record<string, number>;
  /** Six numbers per sprite: x, y, w, h, ax, ay (pixels). */
  rects: number[];
}

/** The signature that makes two props share a sprite. */
export const propSig = (p: SalvageProp) => `${p.kind}-${p.shape}-${p.w}-${p.d}-${p.h}-${p.r}`;

/** The sprite list for a yard. Names are stable: ./frameLoop.ts and the art package rely on them. */
export function atlasDefs(y: YardLayout): Def[] {
  const v: View3q = { ppm: y.ppm, tilt: y.tilt, lift: y.lift };
  const P = y.ppm;
  const defs: Def[] = [];
  const box = (name: string, hw: number, hd: number, h: number, draw: (c: SkCanvas) => void, extra = 0.6) =>
    defs.push({ name, l: -(hw + extra) * P, r: (hw + extra) * P, t: -(h * y.lift + hd * y.tilt + extra) * P - 8, b: (hd * y.tilt + extra) * P + 4, draw });
  for (const [who, vest] of [['worker', WORKER_VEST], ['helper', HELPER_VEST]] as const)
    DIRS.forEach((dir, di) => {
      for (let f = 0; f < WALK_FRAMES; f++) box(`${who}-${di}-${f}`, 0.4, 0.4, 1.95, (c) => pawn(c, v, dir, f, vest), 0.1);
    });
  for (let k = 0; k < TRUCK_HEADINGS; k++) box(`truck-${k}`, 1.8, 1.8, 1.6, (c) => truck(c, v, (k / TRUCK_HEADINGS) * Math.PI * 2, WORLD_LABELS.truck), 0.2);
  box('piece', 0.3, 0.3, 0.35, (c) => piece(c, v), 0.05);
  for (let k = 0; k <= RING_STEPS; k++) box(`ring-${k}`, RING_R, RING_R, 0, (c) => ring(c, v, RING_R, k, RING_STEPS, '#FFD34D'), 0.15);
  box('mark', RING_R, RING_R, 0, (c) => ring(c, v, RING_R, RING_STEPS, RING_STEPS, '#FFFFFF'), 0.15);
  const seen = new Set<string>();
  for (const p of y.props) {
    const sig = propSig(p);
    if (seen.has(sig) || p.kind === 'truck') continue;
    seen.add(sig);
    const hw = p.shape === 'circle' ? p.r : p.w / 2;
    const hd = p.shape === 'circle' ? p.r : p.d / 2;
    const name = `prop-${sig}`;
    if (p.kind === 'wreck') {
      box(name, hw, hd, p.h + 0.3, (c) => wreck(c, v, p.w, p.d, p.h, WORLD_LABELS.wreck));
      box(`pieces-${sig}`, hw, hd, 0.6, (c) => wreckPieces(c, v, p.w, p.d));
    } else if (p.kind === 'machine') box(name, hw, hd, p.h, (c) => machine(c, v, p.w, p.d, p.h, WORLD_LABELS.machine));
    else if (p.kind === 'wall') box(name, hw, hd, p.h, (c) => wall(c, v, p.w, p.d, p.h));
    else if (p.kind === 'pile') box(name, hw, hd, p.h, (c) => pile(c, v, hw, p.h));
    else box(name, hw, hd, p.h, (c) => crate(c, v, p.shape === 'circle' ? p.r * 2 : p.w, p.shape === 'circle' ? p.r * 2 : p.d, p.h));
  }
  return defs;
}

/** Shelf packing, tallest first, at `density` pixels a point, MAX_SIDE wide. */
function pack(defs: Def[], density: number) {
  const items = defs.map((d) => ({ d, w: Math.ceil((d.r - d.l) * density) + PAD * 2, h: Math.ceil((d.b - d.t) * density) + PAD * 2 })).sort((a, b) => b.h - a.h || b.w - a.w);
  let x = 0;
  let y = 0;
  let shelf = 0;
  let width = 0;
  const placed: { d: Def; x: number; y: number; w: number; h: number }[] = [];
  for (const it of items) {
    if (x + it.w > MAX_SIDE) {
      x = 0;
      y += shelf;
      shelf = 0;
    }
    placed.push({ d: it.d, x, y, w: it.w, h: it.h });
    x += it.w;
    width = Math.max(width, x);
    shelf = Math.max(shelf, it.h);
  }
  return { placed, width, height: y + shelf };
}

/** The atlas's size at a density without baking (tests): the density lowered by 0.25 until it fits MAX_SIDE. */
export function atlasSize(defs: Def[], want: number): { density: number; width: number; height: number } {
  let density = Math.max(1, Math.min(3, want));
  let p = pack(defs, density);
  while (p.height > MAX_SIDE && density > 1) {
    density = Math.max(1, density - 0.25);
    p = pack(defs, density);
  }
  return { density, width: p.width, height: p.height };
}

/**
 * Draws into a w x h image, the way Orbit Haulers' atlas does on the owner's phone (src/ui/haul/art/atlas.ts):
 * a CPU raster surface first (Skia.Surface.Make), its snapshot drawn by any canvas on any thread. Only
 * when no raster surface can be made, a GPU offscreen surface, copied to the CPU by makeNonTextureImage
 * (a texture of the JavaScript thread's GPU context must never reach the UI thread's canvas: when the copy
 * fails, the bake fails). The surface and an intermediate snapshot are disposed after the copy; the image
 * returned is kept for the life of the app. Null when nothing could be made.
 */
export function bakeImage(w: number, h: number, draw: (c: SkCanvas) => void): SkImage | null {
  const raster = Skia.Surface.Make(w, h);
  const surface = raster ?? Skia.Surface.MakeOffscreen(w, h);
  if (!surface) return null;
  try {
    draw(surface.getCanvas());
    surface.flush();
    const snap = surface.makeImageSnapshot();
    if (raster) return snap;
    const copy = snap.makeNonTextureImage();
    snap.dispose();
    return copy ?? null;
  } finally {
    surface.dispose();
  }
}

/** Bakes the atlas of a yard at a density. Null when no image could be made. */
export function bakeSheet(y: YardLayout, want: number): SpriteSheet | null {
  const defs = atlasDefs(y);
  const { density } = atlasSize(defs, want);
  const { placed, width, height } = pack(defs, density);
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const names: string[] = [];
  const index: Record<string, number> = {};
  const rects: number[] = [];
  const image = bakeImage(w, h, (c) => {
    c.clear(Skia.Color('#00000000'));
    for (const p of placed) {
      const ax = PAD - p.d.l * density;
      const ay = PAD - p.d.t * density;
      c.save();
      c.clipRect({ x: p.x, y: p.y, width: p.w, height: p.h }, ClipOp.Intersect, true);
      c.translate(p.x + ax, p.y + ay);
      c.scale(density, density);
      p.d.draw(c);
      c.restore();
      index[p.d.name] = names.length;
      names.push(p.d.name);
      rects.push(p.x, p.y, p.w, p.h, ax, ay);
    }
  });
  if (!image) return null;
  return { image, density, width: w, height: h, names, index, rects };
}
