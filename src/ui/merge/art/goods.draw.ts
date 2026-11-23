/**
 * The 48 goods (spec 2.2, 4.2, 9.2 P4): six chains of eight tiers, drawn as ONE base glyph per chain
 * and ONE dressing per tier, the same eight dressings in every chain, so a player learns them once:
 *
 *   1 the glyph · 2 a pair · 3 a glaze (drizzle and shine) · 4 a ribbon (a bundle of three, tied)
 *   5 on a plate · 6 plate and garnish (dark rim, leaves) · 7 a lantern halo · 8 an indigo lacquer
 *   board with a brass rim
 *
 * Every good carries a tier pip (1 to 8 dots, grouped by four) on a dark plate: tier never relies on
 * colour. Glyphs differ by silhouette first (diagonal skewer, cup with handle and leaf, pleated bun,
 * round berry with leaves, wide bowl with chopsticks, three-lobed puff), colour second.
 *
 * Coordinates: points, origin at the centre of a 48 pt square (`GOOD_BOX` half size 24), the size a
 * board cell of 47 to 51 pt draws. Pure Skia.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { CHAIN, CHAIN_IDS, NIGHT, alpha, shade, type ChainId } from './palette';
import {
  INK,
  arc,
  at,
  blob,
  builder,
  circle,
  curve,
  fill,
  flat,
  gloss,
  glow,
  line,
  lit,
  oval,
  poly,
  rrect,
  shape,
  sparkle,
  stroke,
  union,
} from './pen';

/** Half size of a good's square, in points (48 pt square). */
export const GOOD_BOX = 24;
export const TIERS = 8;

/** The eight dressings, in tier order (README, spec 9.2 P4). */
export const DRESSINGS = ['glyph', 'pair', 'glaze', 'ribbon', 'plate', 'garnish', 'halo', 'lacquer'] as const;

// ---------------------------------------------------------------------------
// The six base glyphs (about 20 pt across at scale 1, centred on the origin)
// ---------------------------------------------------------------------------

/** Grill: a skewer on the diagonal, three chunks (meat, pepper, meat) with char marks. */
function skewer(c: SkCanvas): void {
  const col = CHAIN.grill;
  const stick = line(-10, 10, 10.5, -10.5);
  c.drawPath(stick, stroke(INK, 3.6));
  c.drawPath(stick, stroke(NIGHT.bamboo, 1.7));
  const chunks: [number, string, string][] = [
    [-5.6, col.main, col.light],
    [0, col.accent, shade(col.accent, 0.35)],
    [5.6, col.main, col.light],
  ];
  for (const [d, base, top] of chunks) {
    const x = -0.8 + d * 0.707;
    const y = 0.8 - d * 0.707;
    at(c, x, y, 1, 45, (k) => {
      const p = rrect(-3.6, -3.4, 7.2, 6.8, 2.2);
      lit(k, p, base, top, -0.9, -1.1);
      k.drawPath(line(-1.6, -1.4, -1.6, 1.4), stroke(alpha(INK, 0.5), 0.8));
      k.drawPath(line(1.2, -1.4, 1.2, 1.4), stroke(alpha(INK, 0.5), 0.8));
    });
  }
}

/** Tea: a round cup with a handle, tea in the rim, a leaf rising up-left, a steam curl up-right. */
function cup(c: SkCanvas): void {
  const col = CHAIN.tea;
  c.drawPath(oval(0, 8.2, 8.6, 1.8), fill(shade(NIGHT.paperShade, -0.1)));
  c.drawPath(oval(0, 8.2, 8.6, 1.8), stroke(INK, 1));
  const handle = circle(7.6, 1.6, 2.9);
  c.drawPath(handle, stroke(INK, 3.3));
  c.drawPath(handle, stroke(col.main, 1.5));
  const body = builder().moveTo(-7.6, -3).lineTo(7.6, -3).quadTo(7.4, 7.8, 0, 7.8).quadTo(-7.4, 7.8, -7.6, -3).close().build();
  lit(c, body, col.shade, col.main, -1.4, -0.6);
  c.drawPath(line(-6.6, 2.3, 6.6, 2.3), stroke(alpha(NIGHT.white, 0.55), 1.1));
  c.drawPath(oval(0, -3, 7.6, 1.9), fill(col.accent));
  c.drawPath(oval(0, -3, 7.6, 1.9), stroke(INK, 1.1));
  // The leaf.
  const leaf = blob([[-2.4, -3.4], [-6.2, -6.8], [-6.6, -11], [-3, -9], [-1.2, -5.4]], 1);
  shape(c, leaf, NIGHT.leaf, 1);
  c.drawPath(line(-2.2, -3.8, -5.4, -9.4), stroke(NIGHT.leafDeep, 0.7));
  c.drawPath(curve([[2.4, -5], [4.2, -7.6], [2.6, -9.6], [4.4, -12]]), stroke(alpha(NIGHT.white, 0.8), 1.2));
}

/** Steamer: a pleated steamed bun on a bamboo mat. */
function bun(c: SkCanvas): void {
  const col = CHAIN.steamer;
  c.drawPath(oval(0, 6.4, 10, 2.2), fill(NIGHT.bamboo));
  c.drawPath(oval(0, 6.4, 10, 2.2), stroke(INK, 1));
  for (const x of [-5, 0, 5]) c.drawPath(line(x, 4.6, x, 8.2), stroke(alpha(NIGHT.bambooDeep, 0.8), 0.7));
  const body = builder().moveTo(-9, 5).cubicTo(-9.4, -2.6, -4, -7.6, 0, -8).cubicTo(4, -7.6, 9.4, -2.6, 9, 5).quadTo(0, 8, -9, 5).close().build();
  lit(c, body, col.shade, col.main, -1.2, -1.2);
  for (const [x1, y1] of [[-6, 1.4], [-2.4, 2.6], [2.4, 2.6], [6, 1.4]] as const) c.drawPath(curve([[0, -7], [x1 * 0.55, (y1 - 7) / 2 - 0.6], [x1, y1]]), stroke(shade(col.shade, -0.12), 0.9));
  c.drawPath(circle(0, -7.6, 1.7), fill(col.main));
  c.drawPath(circle(0, -7.6, 1.7), stroke(INK, 0.9));
}

/** Sweets: a round candied berry with a leafy cap, seeds and a sugar sparkle. */
function berry(c: SkCanvas): void {
  const col = CHAIN.sweets;
  const body = blob([[0, -5.2], [6.4, -3.2], [7.4, 2.6], [3.6, 7.6], [-3.6, 7.6], [-7.4, 2.6], [-6.4, -3.2]], 1);
  lit(c, body, col.shade, col.main, -1.3, -1.3);
  for (const [x, y] of [[-3, 0], [1, -1.5], [3.6, 2.4], [-1, 3.6], [-4.4, 4], [1.4, 5.6]] as const) c.drawPath(oval(x, y, 0.55, 0.85), fill(alpha(NIGHT.amberPale, 0.85)));
  gloss(c, -1.6, 1, 4.4, 0.85, 195, 65, 1.3);
  for (const deg of [-55, 0, 55]) {
    at(c, 0, -5, 1, deg, (k) => shape(k, blob([[0, 0], [2.2, -2.4], [0, -5.4], [-2.2, -2.4]], 1), NIGHT.leaf, 0.9));
  }
  sparkle(c, 6.4, -6.2, 2.4, NIGHT.white);
}

/** Noodles: a wide blue bowl with a yellow noodle mound and chopsticks up-right. */
function bowl(c: SkCanvas): void {
  const col = CHAIN.noodles;
  for (const [x0, y0, x1, y1] of [[0, -1, 7.8, -11], [2.6, -0.4, 10.2, -9.2]] as const) {
    c.drawPath(line(x0, y0, x1, y1), stroke(INK, 2.6));
    c.drawPath(line(x0, y0, x1, y1), stroke(NIGHT.woodLight, 1.1));
  }
  const mound = blob([[-8.4, -0.6], [-5, -4.4], [0, -5.6], [5, -4.4], [8.4, -0.6]], 1);
  shape(c, mound, col.accent, 1);
  for (const y of [-3.4, -1.6]) c.drawPath(curve([[-6, y], [-3, y - 1.2], [0, y], [3, y - 1.2], [6, y]]), stroke(shade(col.accent, -0.3), 0.8));
  c.drawPath(rrect(-3.8, 7.2, 7.6, 2, 0.8), fill(col.shade));
  c.drawPath(rrect(-3.8, 7.2, 7.6, 2, 0.8), stroke(INK, 0.9));
  const body = builder().moveTo(-10, -0.6).lineTo(10, -0.6).quadTo(9.4, 8, 0, 8).quadTo(-9.4, 8, -10, -0.6).close().build();
  lit(c, body, col.shade, col.main, -1.2, -1);
  for (const x of [-5.6, -1.9, 1.9, 5.6]) c.drawPath(circle(x, 2.8, 0.95), fill(alpha(NIGHT.white, 0.85)));
}

/** Puffs: three golden lobes (two below, one on top) with sesame seeds and a swirl. */
function puff(c: SkCanvas): void {
  const col = CHAIN.puffs;
  const body = union(circle(-4.4, 3, 5), circle(4.4, 3, 5), circle(0, -2.6, 5.6));
  lit(c, body, col.shade, col.main, -1.2, -1.3);
  c.drawPath(arc(0, -2.6, 2.6, 180, 250), stroke(shade(col.shade, -0.1), 0.9));
  for (const [x, y, r] of [[-5, 2.2, 20], [-2.6, 5.2, -30], [3.4, 1.8, 40], [5.6, 4.8, -10], [-1.6, -5, 60], [2.2, -4.4, -40]] as const) {
    at(c, x, y, 1, r, (k) => k.drawPath(oval(0, 0, 0.6, 1.05), fill(col.accent)));
  }
}

const GLYPH: Record<ChainId, (c: SkCanvas) => void> = { grill: skewer, tea: cup, steamer: bun, sweets: berry, noodles: bowl, puffs: puff };

/** The chain's base glyph at its design size (about 20 pt), centred on the origin. */
export function drawGlyph(c: SkCanvas, chain: ChainId | number, s = 1): void {
  const id = typeof chain === 'number' ? CHAIN_IDS[chain] : chain;
  at(c, 0, 0, s, 0, GLYPH[id]);
}

// ---------------------------------------------------------------------------
// The eight dressings
// ---------------------------------------------------------------------------

type G = (c: SkCanvas) => void;

/** A drop shadow under a group: a soft dark ellipse. */
function groundShadow(c: SkCanvas, y: number, rx: number, ry: number): void {
  c.drawPath(oval(0, y, rx, ry), fill(alpha(NIGHT.tealDeep, 0.55)));
}

function one(c: SkCanvas, g: G): void {
  groundShadow(c, 15.5, 13, 3);
  at(c, 0, -1.5, 1.5, 0, g);
}

function pair(c: SkCanvas, g: G): void {
  groundShadow(c, 15.5, 17, 3.2);
  at(c, -6.6, -2.4, 1.08, 0, g);
  at(c, 6.6, 2.2, 1.08, 0, g);
}

/** Glaze: an amber drizzle over the pair, drips and three sparkles. */
function glaze(c: SkCanvas): void {
  const d = curve([[-15, -4], [-9, -9], [-3, -2], [3, -7], [9, 0], [15, -4]]);
  c.drawPath(d, stroke(INK, 4.8));
  c.drawPath(d, stroke(NIGHT.amber, 3.2));
  c.drawPath(d, stroke(alpha(NIGHT.flame, 0.95), 1.2));
  for (const [x, y, h] of [[-9, -8.4, 3], [-3, -2.4, 4.2], [9, 0, 5]] as const) {
    const drip = builder().moveTo(x - 1.2, y).quadTo(x - 1.1, y + h, x, y + h + 1.2).quadTo(x + 1.1, y + h, x + 1.2, y).close().build();
    shape(c, drip, NIGHT.amber, 0.9);
  }
  sparkle(c, -13, -13, 4, NIGHT.white);
  sparkle(c, 13, -11.5, 3.4, NIGHT.white);
  sparkle(c, 1, 12.5, 3, NIGHT.flame);
  sparkle(c, 15, 8, 2.4, NIGHT.flame);
}

function three(c: SkCanvas, g: G, s: number, y = 0): void {
  at(c, -7.2, y + 1.4, s, -14, g);
  at(c, 7.2, y + 1.4, s, 14, g);
  at(c, 0, y - 2.6, s * 1.05, 0, g);
}

/** Ribbon: three glyphs bundled and tied with a band and a red bow. */
function ribbon(c: SkCanvas, g: G): void {
  groundShadow(c, 16, 17, 3.2);
  three(c, g, 0.96);
  const band = builder().moveTo(-15, 6.6).quadTo(0, 10.6, 15, 6.6).build();
  c.drawPath(band, stroke(INK, 4.4));
  c.drawPath(band, stroke(NIGHT.paperLight, 2.6));
  // The bow: two loops, a knot, two tails (the red accent of a good).
  for (const sgn of [-1, 1]) {
    const loop = blob([[0, 8.4], [sgn * 5.6, 5.2], [sgn * 6.4, 9.8], [sgn * 2, 10.6]], 1);
    shape(c, loop, NIGHT.red, 1);
    const tail = poly([sgn * 1, 9.6, sgn * 4.6, 15.4, sgn * 2.4, 15.8, sgn * 0.2, 11]);
    shape(c, tail, NIGHT.redDeep, 0.9);
  }
  c.drawPath(circle(0, 9.2, 1.9), fill(NIGHT.red));
  c.drawPath(circle(0, 9.2, 1.9), stroke(INK, 1));
}

/** The plate: a pale round plate seen at an angle (tier 5); `rim` gives it the dark patterned rim of tier 6. */
function plate(c: SkCanvas, rim: boolean, rx = 19, ry = 7, y = 7.5): void {
  c.drawPath(oval(0, y + 1.6, rx, ry), fill(alpha(NIGHT.tealDeep, 0.6)));
  const outer = oval(0, y, rx, ry);
  if (rim) {
    c.drawPath(outer, fill(NIGHT.indigoMid));
    c.drawPath(outer, stroke(INK, 1.2));
    c.drawPath(oval(0, y - 0.5, rx - 4.2, ry - 2.4), fill(NIGHT.paperLight));
    c.drawPath(oval(0, y - 0.5, rx - 4.2, ry - 2.4), stroke(alpha(INK, 0.6), 0.8));
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      c.drawPath(circle(Math.cos(a) * (rx - 2.1), y + Math.sin(a) * (ry - 1.2), 0.75), fill(NIGHT.brassLight));
    }
  } else {
    c.drawPath(outer, fill(NIGHT.paperLight));
    c.drawPath(outer, stroke(INK, 1.2));
    c.drawPath(oval(0, y - 0.4, rx - 4.6, ry - 2.6), stroke(alpha(NIGHT.paperEdge, 0.9), 1));
  }
}

/** Garnish: leafy sprigs at both sides and a pinch of flakes. */
function garnish(c: SkCanvas, y = 4): void {
  for (const sgn of [-1, 1]) {
    for (const [dx, dy, r] of [[14.2, 0, 32], [11.2, -4.6, 62], [16.4, -4.8, 12]] as const) {
      at(c, sgn * dx, y + dy, 1, sgn * r, (k) => shape(k, blob([[0, 2.6], [2.4, 0], [0, -3.6], [-2.4, 0]], 1), NIGHT.leaf, 0.9));
    }
  }
  for (const [x, y2] of [[-4, -12], [3, -13.4], [6.4, -10.6]] as const) c.drawPath(circle(x, y + y2 + 4, 0.9), fill(NIGHT.amberPale));
}

/** The lantern halo: a warm disc of light, a ring and short rays behind the dish. */
function halo(c: SkCanvas, r = 22.5): void {
  glow(c, 0, -1, r + 1.5, NIGHT.amber, 0.95);
  c.drawPath(circle(0, -1, r - 3.4), stroke(alpha(NIGHT.flame, 0.95), 1.6));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.13;
    c.drawPath(line(Math.cos(a) * (r - 1.2), -1 + Math.sin(a) * (r - 1.2), Math.cos(a) * (r + 0.6), -1 + Math.sin(a) * (r + 0.6)), stroke(alpha(NIGHT.flame, 0.9), 1.3));
  }
}

/** The indigo lacquer board with a brass rim, corner studs and a gloss line. */
function lacquer(c: SkCanvas): void {
  const b = rrect(-22, -20.5, 44, 38, 6);
  c.drawPath(rrect(-22, -19, 44, 38, 6), fill(alpha(INK, 0.7)));
  c.drawPath(b, fill(NIGHT.indigo));
  c.drawPath(b, stroke(NIGHT.brass, 2.4));
  c.drawPath(b, stroke(INK, 0.6));
  c.drawPath(rrect(-18.6, -17.1, 37.2, 31.2, 4), stroke(alpha(NIGHT.brassLight, 0.75), 0.8));
  for (const [x, y] of [[-18.6, -17], [18.6, -17], [-18.6, 14], [18.6, 14]] as const) {
    c.drawPath(circle(x, y, 1.7), fill(NIGHT.brassLight));
    c.drawPath(circle(x, y, 1.7), stroke(INK, 0.7));
  }
  c.drawPath(line(-15, -18.6, 6, -18.6), stroke(alpha(NIGHT.white, 0.35), 1));
}

/** The dish of tiers 6 and 7: the rimmed plate, three glyphs, garnish. */
function dish(c: SkCanvas, g: G, s = 0.88): void {
  plate(c, true);
  three(c, g, s, -1.5);
  garnish(c);
}

// ---------------------------------------------------------------------------
// Tier pip
// ---------------------------------------------------------------------------

const PIP_R = 1.45;
const PIP_STEP = 3.5;
const PIP_GROUP = 1.9;

/** Width of a tier pip in points. */
export function tierPipWidth(tier: number): number {
  const k = Math.max(1, Math.min(8, tier));
  return (k - 1) * PIP_STEP + (k > 4 ? PIP_GROUP : 0) + PIP_R * 2 + 3.2;
}

/**
 * The tier pip: `tier` paper-white dots (grouped by four) on a dark plate, centred on (x, y).
 * `scale` grows it for small icons where the dots must stay countable.
 */
export function drawTierPip(c: SkCanvas, tier: number, x = 0, y = 0, scale = 1): void {
  const k = Math.max(1, Math.min(8, Math.round(tier)));
  const w = tierPipWidth(k);
  at(c, x, y, scale, 0, (q) => {
    q.drawPath(rrect(-w / 2, -2.6, w, 5.2, 2.6), fill(alpha(INK, 0.82)));
    let px = -w / 2 + 1.6 + PIP_R;
    for (let i = 0; i < k; i++) {
      q.drawPath(circle(px, 0, PIP_R), fill(NIGHT.paperLight));
      px += PIP_STEP + (i === 3 ? PIP_GROUP : 0);
    }
  });
}

/** Where the pip sits inside a good's square (centre). */
export const PIP_Y = 20.2;

// ---------------------------------------------------------------------------
// A good
// ---------------------------------------------------------------------------

export interface GoodOptions {
  /** Draw the tier pip (default true). */
  pip?: boolean;
  /** Draw as one flat colour (the Ladder Book's silhouette of the next good). */
  silhouette?: string;
}

/** One good, centred on the origin, in the 48 pt square. */
export function drawGood(c: SkCanvas, chain: ChainId | number, tier: number, o: GoodOptions = {}): void {
  const id = typeof chain === 'number' ? CHAIN_IDS[chain] : chain;
  const k = Math.max(1, Math.min(TIERS, Math.round(tier)));
  const g = GLYPH[id];
  const body = (q: SkCanvas) => {
    switch (k) {
      case 1:
        one(q, g);
        break;
      case 2:
        pair(q, g);
        break;
      case 3:
        pair(q, g);
        glaze(q);
        break;
      case 4:
        ribbon(q, g);
        break;
      case 5:
        plate(q, false);
        three(q, g, 0.9, -1.5);
        break;
      case 6:
        dish(q, g);
        break;
      case 7:
        halo(q);
        dish(q, g);
        break;
      default:
        lacquer(q);
        at(q, 0, -1, 0.86, 0, (r) => {
          halo(r, 17);
          dish(r, g, 0.86);
        });
    }
  };
  if (o.silhouette) flat(c, o.silhouette, body);
  else body(c);
  if (o.pip !== false) drawTierPip(c, k, 0, PIP_Y);
}

/** Every good as [chain index, tier], in data order (48). */
export function allGoods(): [number, number][] {
  const out: [number, number][] = [];
  for (let c = 0; c < CHAIN_IDS.length; c++) for (let k = 1; k <= TIERS; k++) out.push([c, k]);
  return out;
}
