/**
 * The atlases (spec 4.5): every picture the play canvas draws many times, baked ONCE from code into
 * an image under 2,048 px a side, with a table of named rectangles and anchors, for one Skia `Atlas`
 * draw per atlas per frame. Never free an atlas image while a canvas may still draw it.
 *
 *   items    64 sprites in an 8 x 8 grid of 48 pt squares (144 px at 3 px a point, plus a 2 px
 *            transparent border each: 148 px cells, 1,184 px square): the 48 goods (with their tier
 *            pip), 6 gear icons, the cell tile, the shutter and the next shutter, the moon gate's top
 *            and bottom halves, the brazier, the Basket, the Lucky Spark, the gift bag (3, 4).
 *   animals  25 busts in a 5 x 5 grid of 160 px (+ border: 164 px cells, 820 px): 18 customers,
 *            6 minders, the dragon.
 *   stalls   6 chains x (3 awnings, 3 silk awnings, closed) at 288 x 192 px (60 x 40 pt at 4.8 px
 *            a point; + border: 292 x 196): 1,752 x 1,372 px. The spec's 1,728 x 576 is the first
 *            three rows; the silk rows (M13) and the closed row are added in the same image.
 *   fx       the fourth atlas, shelf-packed: coin, flying lantern, the six fold frames, firefly (and
 *            3 wing frames) and trail piece, tier pips 1 to 8, season particles, the waiting pip,
 *            till levels, match glow, armed ring and target outline at 48 pt, the Festival lantern
 *            lit and unlit, the loading wire's lantern lit and unlit, the FILLED stamp (no word),
 *            the merge puff, Lucky flash, tier-8 burst and drop rise, the NEW tag, and each minder's
 *            head at the stall front's size.
 *
 * Every sprite's rect includes its transparent border; nothing is drawn past it (art.test.ts
 * checks each rect's edge pixels), so linear sampling at any scale never picks up a neighbour.
 *
 * Usage (the play canvas; see README "Per frame"):
 *   const items = mergeAtlas('items', PixelRatio.get());     // cached for the app's life: never bakeAtlas
 *   const s = items.sprites[goodSprite(c, k)];              // goodSprite & co. are worklets
 *   // Skia <Atlas image={items.image} sprites={[s.rect]} transforms={[Skia.RSXform(...spriteXform(s, items.density, x, y, 0, cell / 48))]} />
 * A sprite's anchor (ax, ay) is its design origin (the centre of a good, a bust, a stall front).
 * Draw with linear sampling (the <Atlas> default); the stalls are baked at 4.8 px a point so a
 * 52 to 60 pt front on a 3x phone is a 0.54 to 0.63 downscale: pass PixelRatio.get() as density
 * to bake them at the device's own density (atlasSize caps it) and draw near 1:1.
 *
 * Pure Skia (no React): runs in the app and in Node (scripts/art/merge-sheets.ts).
 */
import { ClipOp, Skia, type SkCanvas, type SkImage, type SkRect } from '@shopify/react-native-skia';
import { BEAST_BOX, FIREFLY_WINGS, MINDERS, drawCustomer, drawDragon, drawFirefly, drawMinder, drawMinderHead, drawTrailPiece } from './animals.draw';
import { drawLantern } from './lantern.draw';
import { drawGear, drawTill, drawWaitingPip } from './gear.draw';
import { GOOD_BOX, drawGood, drawTierPip, tierPipHeight, tierPipWidth } from './goods.draw';
import { CHAIN_IDS, COATS, CUSTOMER_SPECIES } from './palette';
import { PARTICLES, drawParticle } from './spokes.draw';
import { STALL_H, STALL_MINDER, STALL_W, drawStallFront, type Awning } from './stalls.draw';
import {
  FOLD_FRAMES,
  drawArmedRing,
  drawBasket,
  drawBrazier,
  drawCellTile,
  drawCoin,
  drawFestivalLantern,
  drawFlyingLantern,
  drawGiftBag,
  drawLuckySpark,
  drawMatchGlow,
  drawShutter,
  drawMoonGateHalf,
  drawFilledStamp,
  drawEffect,
  EFFECTS,
  drawNewTag,
  drawTargetOutline,
  drawTicketFold,
  foldExtent,
} from './street.draw';

export type AtlasKind = 'items' | 'animals' | 'stalls' | 'fx';
export const ATLAS_KINDS: readonly AtlasKind[] = ['items', 'animals', 'stalls', 'fx'];

/** Pixels per point each atlas is specified at (spec 4.5); a lower device density bakes smaller. */
export const SPEC_DENSITY: Record<AtlasKind, number> = { items: 3, animals: 3, stalls: 4.8, fx: 3 };
export const MAX_SIDE = 2048;

export interface Sprite {
  /** Source rectangle in the atlas image, pixels. */
  rect: SkRect;
  /** The anchor (the design origin) inside the rect, pixels from its top left. */
  ax: number;
  ay: number;
}

export interface MergeAtlas {
  kind: AtlasKind;
  image: SkImage;
  /** Pixels per point actually used. */
  density: number;
  sprites: Record<string, Sprite>;
  width: number;
  height: number;
}

interface Def {
  name: string;
  /** Half extents in points round the origin. */
  hw: number;
  hh: number;
  draw: (c: SkCanvas) => void;
}

// ---------------------------------------------------------------------------
// Sprite ids
// ---------------------------------------------------------------------------

/** The items atlas id of a good: chain index 0..5, tier 1..8. */
export function goodSprite(c: number, k: number): string {
  'worklet';
  return `good-${CHAIN_IDS[c]}-${k}`;
}
export function gearSprite(c: number): string {
  'worklet';
  return `gear-${CHAIN_IDS[c]}`;
}
/** The animals atlas id of a customer (species from `merge.tickets.customers`, coat 0..2). */
export function customerSprite(species: string, coat: number): string {
  'worklet';
  return `customer-${species}-${coat}`;
}
export function minderSprite(c: number): string {
  'worklet';
  return `minder-${CHAIN_IDS[c]}`;
}
/** The fx atlas id of a minder's head at the stall front's size (STALL_MINDER.size pt): the stall draws this, never the 160 px bust scaled down. */
export function minderHeadSprite(c: number): string {
  'worklet';
  return `minder-head-${CHAIN_IDS[c]}`;
}
/** The stalls atlas id of a front: chain index, awning 0..2 (`awningFor(level)`), silk, closed. */
export function stallSprite(c: number, awning: Awning, silk = false, closed = false): string {
  'worklet';
  return closed ? `stall-${CHAIN_IDS[c]}-closed` : `stall-${CHAIN_IDS[c]}-${awning}${silk ? '-silk' : ''}`;
}

/** The ids of the items atlas besides the goods and gear. */
export const ITEM_PROPS = ['cell', 'shutter', 'shutter-next', 'block-gate-top', 'block-gate-bottom', 'block-brazier', 'basket', 'spark', 'giftbag-3', 'giftbag-4'] as const;

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------

export function atlasDefs(kind: AtlasKind): Def[] {
  const d: Def[] = [];
  const G = GOOD_BOX;
  if (kind === 'items') {
    for (let c = 0; c < CHAIN_IDS.length; c++) for (let k = 1; k <= 8; k++) d.push({ name: goodSprite(c, k), hw: G, hh: G, draw: (q) => drawGood(q, c, k) });
    for (let c = 0; c < CHAIN_IDS.length; c++) d.push({ name: gearSprite(c), hw: G, hh: G, draw: (q) => drawGear(q, c) });
    const s = G * 2;
    d.push({ name: 'cell', hw: G, hh: G, draw: (q) => drawCellTile(q, s) });
    d.push({ name: 'shutter', hw: G, hh: G, draw: (q) => drawShutter(q, s) });
    d.push({ name: 'shutter-next', hw: G, hh: G, draw: (q) => drawShutter(q, s, { next: true }) });
    d.push({ name: 'block-gate-top', hw: G, hh: G, draw: (q) => drawMoonGateHalf(q, s, 'top') });
    d.push({ name: 'block-gate-bottom', hw: G, hh: G, draw: (q) => drawMoonGateHalf(q, s, 'bottom') });
    d.push({ name: 'block-brazier', hw: G, hh: G, draw: (q) => drawBrazier(q, s) });
    d.push({ name: 'basket', hw: G, hh: G, draw: (q) => drawBasket(q, s) });
    d.push({ name: 'spark', hw: G, hh: G, draw: (q) => drawLuckySpark(q, 14) });
    d.push({ name: 'giftbag-3', hw: G, hh: G, draw: (q) => drawGiftBag(q, 3, s) });
    d.push({ name: 'giftbag-4', hw: G, hh: G, draw: (q) => drawGiftBag(q, 4, s) });
  } else if (kind === 'animals') {
    const B = BEAST_BOX;
    for (const sp of CUSTOMER_SPECIES) for (let k = 0; k < COATS; k++) d.push({ name: customerSprite(sp, k), hw: B, hh: B, draw: (q) => drawCustomer(q, sp, k) });
    for (const m of MINDERS) d.push({ name: minderSprite(m.chain), hw: B, hh: B, draw: (q) => drawMinder(q, m.chain) });
    d.push({ name: 'dragon', hw: B, hh: B, draw: (q) => drawDragon(q) });
  } else if (kind === 'stalls') {
    const hw = STALL_W / 2;
    const hh = STALL_H / 2;
    for (const silk of [false, true]) for (const a of [0, 1, 2] as const) for (let c = 0; c < CHAIN_IDS.length; c++) d.push({ name: stallSprite(c, a, silk), hw, hh, draw: (q) => drawStallFront(q, c, { awning: a, silk }) });
    for (let c = 0; c < CHAIN_IDS.length; c++) d.push({ name: stallSprite(c, 0, false, true), hw, hh, draw: (q) => drawStallFront(q, c, { closed: true }) });
  } else {
    d.push({ name: 'coin', hw: 7.5, hh: 7.5, draw: (q) => drawCoin(q, 6) });
    d.push({ name: 'lantern-fly', hw: 22.5, hh: 22.5, draw: (q) => drawFlyingLantern(q, 7) });
    for (let f = 0; f < FOLD_FRAMES; f++) {
      const e = foldExtent(f);
      d.push({ name: `fold-${f}`, hw: e.hw, hh: e.hh, draw: (q) => drawTicketFold(q, f, 64, 96) });
    }
    d.push({ name: 'firefly', hw: 19, hh: 19, draw: (q) => drawFirefly(q) });
    for (let w = 0; w < FIREFLY_WINGS; w++) d.push({ name: `firefly-${w}`, hw: 19, hh: 19, draw: (q) => drawFirefly(q, 1, w / (FIREFLY_WINGS - 1)) });
    d.push({ name: 'trail', hw: 6, hh: 6, draw: (q) => drawTrailPiece(q) });
    for (let k = 1; k <= 8; k++) d.push({ name: `pip-${k}`, hw: tierPipWidth(k) / 2 + 0.5, hh: tierPipHeight(k) / 2 + 0.6, draw: (q) => drawTierPip(q, k) });
    for (const p of PARTICLES) d.push({ name: `particle-${p}`, hw: 6, hh: 6, draw: (q) => drawParticle(q, p) });
    d.push({ name: 'waiting', hw: 6, hh: 6, draw: (q) => drawWaitingPip(q) });
    for (let k = 0; k < 5; k++) d.push({ name: `till-${k}`, hw: 8, hh: 11, draw: (q) => drawTill(q, k) });
    d.push({ name: 'match', hw: 30, hh: 30, draw: (q) => drawMatchGlow(q, G * 2 - 2) });
    d.push({ name: 'armed', hw: 28, hh: 28, draw: (q) => drawArmedRing(q, G * 2 - 2) });
    d.push({ name: 'target', hw: G, hh: G, draw: (q) => drawTargetOutline(q, G * 2 - 2) });
    d.push({ name: 'festival-lit', hw: 23, hh: 23, draw: (q) => drawFestivalLantern(q, true) });
    d.push({ name: 'festival-unlit', hw: 23, hh: 23, draw: (q) => drawFestivalLantern(q, false) });
    d.push({ name: 'wire-lit', hw: 38, hh: 38, draw: (q) => drawLantern(q, 12, { look: 'lit', glow: 1, cord: 7.2 }) });
    d.push({ name: 'wire-unlit', hw: 13.5, hh: 26, draw: (q) => drawLantern(q, 12, { look: 'unlit', cord: 7.2 }) });
    d.push({ name: 'stamp', hw: 22, hh: 22, draw: (q) => drawFilledStamp(q, 18) });
    for (const e of EFFECTS) d.push({ name: `fx-${e}`, hw: 26, hh: 26, draw: (q) => drawEffect(q, e) });
    d.push({ name: 'new-tag', hw: 12, hh: 6, draw: (q) => drawNewTag(q) });
    for (const m of MINDERS) d.push({ name: minderHeadSprite(m.chain), hw: STALL_MINDER.size / 2, hh: STALL_MINDER.size / 2, draw: (q) => drawMinderHead(q, m.chain, STALL_MINDER.size) });
  }
  return d;
}

/** Grid atlases: columns, and the cell size in points (the design box). Fx is shelf-packed. */
const GRID: Partial<Record<AtlasKind, { cols: number; w: number; h: number }>> = {
  items: { cols: 8, w: GOOD_BOX * 2, h: GOOD_BOX * 2 },
  animals: { cols: 5, w: BEAST_BOX * 2, h: BEAST_BOX * 2 },
  stalls: { cols: 6, w: STALL_W, h: STALL_H },
};

interface Placed {
  d: Def;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Transparent pixels round every sprite (both grid and shelf atlases): neighbours never bleed in under linear sampling. */
const PAD = 2;

function layout(kind: AtlasKind, density: number): { placed: Placed[]; width: number; height: number } {
  const defs = atlasDefs(kind);
  const grid = GRID[kind];
  if (grid) {
    const cw = Math.round(grid.w * density) + PAD * 2;
    const ch = Math.round(grid.h * density) + PAD * 2;
    const placed = defs.map((d, i) => ({ d, x: (i % grid.cols) * cw, y: Math.floor(i / grid.cols) * ch, w: cw, h: ch }));
    return { placed, width: grid.cols * cw, height: Math.ceil(defs.length / grid.cols) * ch };
  }
  // Shelf packing, tallest first.
  const items = defs
    .map((d) => ({ d, w: Math.ceil(d.hw * 2 * density) + PAD * 2, h: Math.ceil(d.hh * 2 * density) + PAD * 2 }))
    .sort((a, b) => b.h - a.h || b.w - a.w);
  let x = 0;
  let y = 0;
  let shelf = 0;
  let width = 0;
  const placed: Placed[] = [];
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

/**
 * The atlas's size at a density, without baking (tests and the size check). The density used is the
 * asked one (default the spec's), capped at the spec's and lowered in steps of 0.25 until the
 * image fits MAX_SIDE x MAX_SIDE.
 */
export function atlasSize(kind: AtlasKind, density: number = SPEC_DENSITY[kind]): { density: number; width: number; height: number } {
  let d = Math.max(1, Math.min(SPEC_DENSITY[kind], density));
  let l = layout(kind, d);
  while ((l.width > MAX_SIDE || l.height > MAX_SIDE) && d > 1) {
    d = Math.max(1, d - 0.25);
    l = layout(kind, d);
  }
  return { density: d, width: l.width, height: l.height };
}

/** Bakes one atlas (null if no surface could be made). Consumers call `mergeAtlas`, which caches; this bakes anew every call (sheets, tests). */
export function bakeAtlas(kind: AtlasKind, density: number = SPEC_DENSITY[kind]): MergeAtlas | null {
  const { density: dd } = atlasSize(kind, density);
  const { placed, width, height } = layout(kind, dd);
  const surface = Skia.Surface.Make(width, height) ?? Skia.Surface.MakeOffscreen(width, height);
  if (!surface) return null;
  const c = surface.getCanvas();
  c.clear(Skia.Color('#00000000'));
  const sprites: Record<string, Sprite> = {};
  for (const p of placed) {
    const ax = p.w / 2;
    const ay = p.h / 2;
    c.save();
    c.clipRect({ x: p.x, y: p.y, width: p.w, height: p.h }, ClipOp.Intersect, true);
    c.translate(p.x + ax, p.y + ay);
    c.scale(dd, dd);
    p.d.draw(c);
    c.restore();
    sprites[p.d.name] = { rect: { x: p.x, y: p.y, width: p.w, height: p.h }, ax, ay };
  }
  surface.flush();
  const image = surface.makeImageSnapshot();
  surface.dispose();
  return { kind, image, density: dd, sprites, width, height };
}

const baked = new Map<string, MergeAtlas>();

/**
 * THE way a consumer gets an atlas: baked once per (kind, density) for the life of the app and
 * never freed (a canvas may draw it at any moment), so the play canvas, the loading screen, the
 * spokes and the firefly share one copy and a remount bakes nothing. Call it outside render
 * (useMemo or module scope); null only if no surface could be made (nothing is cached then).
 */
export function mergeAtlas(kind: AtlasKind, density: number = SPEC_DENSITY[kind]): MergeAtlas | null {
  const d = atlasSize(kind, density).density;
  const key = `${kind}@${d}`;
  const hit = baked.get(key);
  if (hit) return hit;
  const a = bakeAtlas(kind, d);
  if (a) baked.set(key, a);
  return a;
}

/** The sprite ids of an atlas, in its order (tests and the README). */
export function spriteIds(kind: AtlasKind): string[] {
  return atlasDefs(kind).map((d) => d.name);
}

/**
 * RSXform numbers for a sprite drawn with its anchor at (x, y), turned `angle` radians, at `size`
 * times its point size: [scos, ssin, tx, ty] for Skia.RSXform(...). Plain maths, a worklet.
 */
export function spriteXform(s: Sprite, density: number, x: number, y: number, angle: number, size = 1): [number, number, number, number] {
  'worklet';
  const k = size / density;
  const sc = k * Math.cos(angle);
  const ss = k * Math.sin(angle);
  return [sc, ss, x - (sc * s.ax - ss * s.ay), y - (ss * s.ax + sc * s.ay)];
}
