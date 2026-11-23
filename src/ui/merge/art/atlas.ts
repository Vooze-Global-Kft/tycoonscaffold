/**
 * The atlases (spec 4.5): every picture the play canvas draws many times, baked ONCE from code into
 * an image under 2,048 px a side, with a table of named rectangles and anchors, for one Skia `Atlas`
 * draw per atlas per frame. Never free an atlas image while a canvas may still draw it.
 *
 *   items    64 sprites in an 8 x 8 grid of 48 pt squares (144 px at 3 px a point = 1,152 px):
 *            the 48 goods (with their tier pip), 6 gear icons, the cell tile, the shutter and the
 *            next shutter, the two season blocks, the Basket, the Lucky Spark, the gift bag (3, 4).
 *   animals  25 busts in a 5 x 5 grid of 160 px (800 px): 18 customers, 6 minders, the dragon.
 *   stalls   6 chains x (3 awnings, 3 silk awnings, closed) at 288 x 192 px (60 x 40 pt at 4.8 px
 *            a point): 1,728 x 1,344 px. The spec's 1,728 x 576 is the first three rows; the silk
 *            rows (M13) and the closed row are added in the same image.
 *   fx       the fourth atlas, shelf-packed: coin, flying lantern, the six fold frames, firefly and
 *            trail piece, tier pips 1 to 8, season particles, the waiting pip, till levels, match
 *            glow, armed ring and target outline at 48 pt, the Festival lantern lit and unlit.
 *
 * Usage (the play canvas):
 *   const items = bakeAtlas('items', PixelRatio.get());      // once; keep it while mounted
 *   const s = items.sprites[goodSprite(c, k)];
 *   // Skia <Atlas image={items.image} sprites={[s.rect]} transforms={[Skia.RSXform(...spriteXform(s, items.density, x, y, 0, cell / 48))]} />
 * A sprite's anchor (ax, ay) is its design origin (the centre of a good, a bust, a stall front).
 *
 * Pure Skia (no React): runs in the app and in Node (scripts/art/merge-sheets.ts).
 */
import { ClipOp, Skia, type SkCanvas, type SkImage, type SkRect } from '@shopify/react-native-skia';
import { BEAST_BOX, MINDERS, drawCustomer, drawDragon, drawFirefly, drawMinder, drawTrailPiece } from './animals.draw';
import { drawGear, drawTill, drawWaitingPip } from './gear.draw';
import { GOOD_BOX, drawGood, drawTierPip, tierPipWidth } from './goods.draw';
import { CHAIN_IDS, COATS, CUSTOMER_SPECIES } from './palette';
import { PARTICLES, drawParticle } from './spokes.draw';
import { STALL_H, STALL_W, drawStallFront, type Awning } from './stalls.draw';
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
  drawStoneGate,
  drawTargetOutline,
  drawTicketFold,
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
  return `good-${CHAIN_IDS[c]}-${k}`;
}
export function gearSprite(c: number): string {
  return `gear-${CHAIN_IDS[c]}`;
}
/** The animals atlas id of a customer (species from `merge.tickets.customers`, coat 0..2). */
export function customerSprite(species: string, coat: number): string {
  return `customer-${species}-${coat}`;
}
export function minderSprite(c: number): string {
  return `minder-${CHAIN_IDS[c]}`;
}
/** The stalls atlas id of a front: chain index, awning 0..2 (`awningFor(level)`), silk, closed. */
export function stallSprite(c: number, awning: Awning, silk = false, closed = false): string {
  return closed ? `stall-${CHAIN_IDS[c]}-closed` : `stall-${CHAIN_IDS[c]}-${awning}${silk ? '-silk' : ''}`;
}

/** The ids of the items atlas besides the goods and gear. */
export const ITEM_PROPS = ['cell', 'shutter', 'shutter-next', 'block-gate', 'block-brazier', 'basket', 'spark', 'giftbag-3', 'giftbag-4'] as const;

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
    d.push({ name: 'block-gate', hw: G, hh: G, draw: (q) => drawStoneGate(q, s) });
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
    d.push({ name: 'lantern-fly', hw: 22, hh: 26, draw: (q) => drawFlyingLantern(q, 7) });
    for (let f = 0; f < FOLD_FRAMES; f++) d.push({ name: `fold-${f}`, hw: 35, hh: 50, draw: (q) => drawTicketFold(q, f, 64, 96) });
    d.push({ name: 'firefly', hw: 17, hh: 17, draw: (q) => drawFirefly(q) });
    d.push({ name: 'trail', hw: 6, hh: 6, draw: (q) => drawTrailPiece(q) });
    for (let k = 1; k <= 8; k++) d.push({ name: `pip-${k}`, hw: tierPipWidth(k) / 2 + 0.5, hh: 3.2, draw: (q) => drawTierPip(q, k) });
    for (const p of PARTICLES) d.push({ name: `particle-${p}`, hw: 6, hh: 6, draw: (q) => drawParticle(q, p) });
    d.push({ name: 'waiting', hw: 6, hh: 6, draw: (q) => drawWaitingPip(q) });
    for (let k = 0; k < 5; k++) d.push({ name: `till-${k}`, hw: 7.5, hh: 9.5, draw: (q) => drawTill(q, k) });
    d.push({ name: 'match', hw: G, hh: G, draw: (q) => drawMatchGlow(q, G * 2 - 2) });
    d.push({ name: 'armed', hw: G, hh: G, draw: (q) => drawArmedRing(q, G * 2 - 2) });
    d.push({ name: 'target', hw: G, hh: G, draw: (q) => drawTargetOutline(q, G * 2 - 2) });
    d.push({ name: 'festival-lit', hw: 12, hh: 14, draw: (q) => drawFestivalLantern(q, true) });
    d.push({ name: 'festival-unlit', hw: 12, hh: 14, draw: (q) => drawFestivalLantern(q, false) });
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

const PAD = 2;

function layout(kind: AtlasKind, density: number): { placed: Placed[]; width: number; height: number } {
  const defs = atlasDefs(kind);
  const grid = GRID[kind];
  if (grid) {
    const cw = Math.round(grid.w * density);
    const ch = Math.round(grid.h * density);
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

/** Bakes one atlas (null if no surface could be made). Call once and keep the result while any canvas may draw it. */
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
  return { kind, image, density: dd, sprites, width, height };
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
