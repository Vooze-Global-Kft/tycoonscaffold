/**
 * The sprite atlas of the field's frame loop (section 4.3 "Frame loop", "Budget"): every moving
 * sprite baked once into ONE image at a pixel density, with a table of named rectangles and
 * anchors, for a single Skia `Atlas` draw per frame.
 *
 *   const atlas = bakeAtlas({ density: PixelRatio.get(), freighter: { hull: 1, segments: 0 } });
 *   // sprite `s = atlas.sprites['drone-copper']`: src rect s.rect (pixels); place it with
 *   // RSXform(scale * cos(a), scale * sin(a), tx, ty) where scale = sizeFactor / atlas.density
 *   // and (tx, ty) = position − rotated (s.ax, s.ay) * scale (see `spriteXform`).
 *
 * Pure Skia (no React): runs in the app and in Node. Rebake only when the density or the
 * freighter changes, and never dispose an image a mounted canvas may still draw.
 */
import { ClipOp, Skia, type SkCanvas, type SkImage, type SkRect } from '@shopify/react-native-skia';
import { DRONE_BOX, drawDrone, drawThrusterFlame } from './drone.draw';
import { drawFreighter, drawFreighterFlame, freighterSize, type HullId } from './freighter.draw';
import { drawCreditGlyph } from './fx.draw';
import { ORE_IDS } from './palette';
import { ROCK_SHAPES, drawBonanzaOverlay, drawChunk, drawDryGlow, drawDryRock, drawRockBody, drawRockCracks, drawShard, rockBox } from './rock.draw';
import { drawDrillHead } from './rig.draw';

/** Rock radius the atlas bakes at; scale by r / ATLAS_ROCK_R for smaller rocks. */
export const ATLAS_ROCK_R = 26;
/** Drill head radius the atlas bakes at; scale by r / ATLAS_HEAD_R (rigHeads gives r). */
export const ATLAS_HEAD_R = 5.6;

export interface Sprite {
  /** Source rectangle in the atlas image, pixels. */
  rect: SkRect;
  /** Anchor (the sprite's origin: rock centre, drone centre...) inside the rect, pixels from its top left. */
  ax: number;
  ay: number;
}

export interface AtlasOptions {
  /** Pixels per point (1 to 3). */
  density: number;
  /** Include this freighter and its flame frames ('freighter', 'freighter-flame-0..2'). */
  freighter?: { hull: HullId; segments: number };
}

export interface HaulAtlas {
  image: SkImage;
  density: number;
  sprites: Record<string, Sprite>;
  /** Image size in pixels. */
  width: number;
  height: number;
}

interface Def {
  name: string;
  /** Half extents in points around the origin. */
  hw: number;
  hh: number;
  draw: (c: SkCanvas) => void;
}

/** The sprite list, by name. Names are stable; the README lists them. */
export function atlasDefs(o: Pick<AtlasOptions, 'freighter'> = {}): Def[] {
  const defs: Def[] = [];
  const db = DRONE_BOX;
  for (const ore of ORE_IDS) {
    defs.push({ name: `drone-${ore}`, hw: db, hh: db, draw: (c) => drawDrone(c, { ore }) });
    defs.push({ name: `drone-${ore}-empty`, hw: db, hh: db, draw: (c) => drawDrone(c, { ore, loaded: false }) });
  }
  defs.push({ name: 'drone-idle', hw: db, hh: db, draw: (c) => drawDrone(c, { ore: null, loaded: false }) });
  [0.35, 0.7, 1].forEach((k, i) => defs.push({ name: `flame-${i}`, hw: 19, hh: 9, draw: (c) => drawThrusterFlame(c, k) }));
  const rb = rockBox(ATLAS_ROCK_R);
  for (let s = 0; s < ROCK_SHAPES; s++) {
    for (const ore of ORE_IDS) defs.push({ name: `rock-${s}-${ore}`, hw: rb, hh: rb, draw: (c) => drawRockBody(c, { shape: s, ore }) });
    defs.push({ name: `bonanza-${s}`, hw: rb, hh: rb, draw: (c) => drawBonanzaOverlay(c, s) });
    defs.push({ name: `crack1-${s}`, hw: rb, hh: rb, draw: (c) => drawRockCracks(c, s, 1) });
    defs.push({ name: `crack2-${s}`, hw: rb, hh: rb, draw: (c) => drawRockCracks(c, s, 2) });
    defs.push({ name: `dry-${s}`, hw: rb, hh: rb, draw: (c) => drawDryRock(c, s) });
    defs.push({ name: `dryglow-${s}`, hw: rb, hh: rb, draw: (c) => drawDryGlow(c, s) });
  }
  defs.push({ name: 'drill', hw: 7, hh: 7, draw: (c) => drawDrillHead(c, ATLAS_HEAD_R) });
  for (const ore of ORE_IDS) {
    defs.push({ name: `chunk-${ore}`, hw: 8, hh: 8, draw: (c) => drawChunk(c, ore) });
    for (let i = 0; i < 8; i++) defs.push({ name: `shard-${ore}-${i}`, hw: 5, hh: 5, draw: (c) => drawShard(c, ore, i) });
  }
  defs.push({ name: 'credit', hw: 10, hh: 10, draw: (c) => drawCreditGlyph(c) });
  if (o.freighter) {
    const { hull, segments } = o.freighter;
    const sz = freighterSize(hull, segments);
    const hw = sz.w / 2 + 6;
    const hh = sz.h / 2 + 6;
    defs.push({ name: 'freighter', hw, hh, draw: (c) => drawFreighter(c, { hull, segments }) });
    // Flames hang below the stern: their own sprites with the same origin (the freighter centre).
    [0.35, 0.7, 1].forEach((k, i) => defs.push({ name: `freighter-flame-${i}`, hw, hh: hh + 20, draw: (c) => drawFreighterFlame(c, hull, segments, k) }));
  }
  return defs;
}

const PAD = 2;
const MAX_W = 2048;

/** Bakes the atlas. Returns null if no surface could be made. */
export function bakeAtlas(o: AtlasOptions): HaulAtlas | null {
  const density = Math.max(1, Math.min(3, o.density));
  const defs = atlasDefs(o);
  // Shelf packing, tallest first.
  const items = defs
    .map((d) => ({ d, w: Math.ceil(d.hw * 2 * density) + PAD * 2, h: Math.ceil(d.hh * 2 * density) + PAD * 2 }))
    .sort((a, b) => b.h - a.h || b.w - a.w);
  let x = 0;
  let y = 0;
  let shelf = 0;
  let width = 0;
  const placed: { d: Def; x: number; y: number; w: number; h: number }[] = [];
  for (const it of items) {
    if (x + it.w > MAX_W) {
      x = 0;
      y += shelf;
      shelf = 0;
    }
    placed.push({ d: it.d, x, y, w: it.w, h: it.h });
    x += it.w;
    width = Math.max(width, x);
    shelf = Math.max(shelf, it.h);
  }
  const height = y + shelf;
  const surface = Skia.Surface.Make(width, height) ?? Skia.Surface.MakeOffscreen(width, height);
  if (!surface) return null;
  const c = surface.getCanvas();
  c.clear(Skia.Color('#00000000'));
  const sprites: Record<string, Sprite> = {};
  for (const p of placed) {
    const ax = PAD + p.d.hw * density;
    const ay = PAD + p.d.hh * density;
    c.save();
    c.clipRect({ x: p.x, y: p.y, width: p.w, height: p.h }, ClipOp.Intersect, true);
    c.translate(p.x + ax, p.y + ay);
    c.scale(density, density);
    p.d.draw(c);
    c.restore();
    sprites[p.d.name] = { rect: { x: p.x, y: p.y, width: p.w, height: p.h }, ax, ay };
  }
  surface.flush();
  const image = surface.makeImageSnapshot();
  return { image, density, sprites, width, height };
}

/**
 * The RSXform numbers for a sprite placed with its anchor at (x, y), turned `angle` radians,
 * at `size` times its point size. Returns [scos, ssin, tx, ty] for Skia.RSXform(...). Plain maths,
 * marked as a worklet so the frame loop may call it.
 */
export function spriteXform(s: Sprite, density: number, x: number, y: number, angle: number, size = 1): [number, number, number, number] {
  'worklet';
  const k = size / density;
  const sc = k * Math.cos(angle);
  const ss = k * Math.sin(angle);
  return [sc, ss, x - (sc * s.ax - ss * s.ay), y - (ss * s.ax + sc * s.ay)];
}
