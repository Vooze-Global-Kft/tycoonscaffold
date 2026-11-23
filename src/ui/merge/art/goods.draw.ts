/**
 * The 48 goods (spec 2.2, 4.2, 9.2 P4): six chains of eight tiers, drawn as ONE base glyph per chain
 * and ONE dressing per tier, the same eight dressings in every chain, so a player learns them once:
 *
 *   1 the glyph · 2 a pair · 3 a glaze (the pair coated over its top half, one drip, a gloss line)
 *   4 a ribbon (a bundle of three, tied) · 5 on a plate · 6 plate and garnish (dark rim, a ring of
 *   leaves) · 7 a lantern halo behind · 8 an indigo lacquer board with a brass rim round the cell
 *
 * From tier 5 the three glyphs stay at the same large size (about 70 % of the cell); each tier adds
 * a frame AROUND and BEHIND them, so the chain is read first at every tier
 *
 * Every good carries a tier pip (1 to 8 dots, grouped by four) on a dark plate: tier never relies on
 * colour. Glyphs differ by silhouette first (diagonal skewer, cup with handle and leaf, pleated bun,
 * round berry with leaves, wide bowl with chopsticks, tall twisted puff knot), colour second.
 *
 * Coordinates: points, origin at the centre of a 48 pt square (`GOOD_BOX` half size 24), the size a
 * board cell of 47 to 51 pt draws. Pure Skia.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { CHAIN, CHAIN_IDS, NIGHT, alpha, shade, type ChainId } from './palette';
import {
  INK,
  INK_W,
  arc,
  clip,
  coat,
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

/**
 * Puffs: a tall twisted choux knot (wide base, spiral ridges rising to a curled tip) with sesame
 * seeds. Its silhouette is a tall cone, never a cluster of round blobs (the Sweets berry is round).
 */
function puff(c: SkCanvas): void {
  const col = CHAIN.puffs;
  const body = builder()
    .moveTo(-10.4, 7.2)
    .cubicTo(-11.6, 1, -7.6, -3.4, -4.6, -6.2)
    .cubicTo(-2.4, -8.4, -1.6, -11.4, 1.6, -12.6)
    .cubicTo(3.4, -13.2, 4.6, -11.6, 3.4, -10.4)
    .cubicTo(5.6, -8, 9.8, -3.6, 10.6, 1.4)
    .cubicTo(11.2, 4.6, 10.6, 6.6, 9.6, 7.6)
    .quadTo(0, 10, -10.4, 7.2)
    .close()
    .build();
  lit(c, body, col.shade, col.main, -1.3, -1.2);
  c.save();
  clip(c, body);
  // Spiral ridges climbing round the knot.
  for (const [y0, y1, d] of [[6.4, 0.6, 1], [1.8, -4.6, 1], [-2.8, -9, 1]] as const) {
    c.drawPath(curve([[-11, y0], [-2, y0 - 2.6 * d], [11, y1]]), stroke(shade(col.shade, -0.18), 1.1));
    c.drawPath(curve([[-11, y0 - 1.3], [-2, y0 - 3.9 * d], [11, y1 - 1.3]]), stroke(alpha(col.light, 0.9), 0.9));
  }
  c.restore();
  c.drawPath(body, stroke(INK, INK_W));
  for (const [x, y, r] of [[-5.6, 3.6, 20], [-1.4, 5.4, -30], [4.4, 2.6, 40], [6.6, 5.4, -10], [-2.6, -3.2, 60], [2.6, -6.4, -40]] as const) {
    at(c, x, y, 1, r, (k) => k.drawPath(oval(0, 0, 0.65, 1.1), fill(col.accent)));
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

/**
 * Each chain's glaze (tier 3): a coat that follows the glyph's own outline, picked to change the
 * glyph's lightness strongly (a pale coat on a dark glyph, a dark one on a pale glyph), so tier 3
 * reads in greyscale too: honey on the skewer, milk on the tea, soy on the bun, dark chocolate on the berry,
 * golden broth on the bowl, dark caramel on the puff (its sesame seeds show through).
 */
export const GLAZE: Record<ChainId, string> = {
  grill: '#FFE08A',
  tea: '#F6F1E6',
  steamer: '#B9772F',
  sweets: '#4E2A2E',
  noodles: '#F2D27A',
  puffs: '#6E3F17',
};

/** A drop shadow under a group: a soft dark ellipse. */
function groundShadow(c: SkCanvas, y: number, rx: number, ry: number): void {
  c.drawPath(oval(0, y, rx, ry), fill(alpha(NIGHT.tealDeep, 0.55)));
}

function one(c: SkCanvas, g: G): void {
  groundShadow(c, 15.5, 13, 3);
  at(c, 0, -1.5, 1.5, 0, g);
}

const PAIR: [number, number][] = [
  [-6.6, -2.4],
  [6.6, 2.2],
];

function pair(c: SkCanvas, g: G): void {
  groundShadow(c, 15.5, 17, 3.2);
  for (const [x, y] of PAIR) at(c, x, y, 1.08, 0, g);
}

/** The glaze's mask in glyph space: everything above a wavy rim at y about -0.5, with one drip. */
const GLAZE_MASK = (() => {
  const b = builder().moveTo(-16.0, -20.0).lineTo(16.0, -20.0).lineTo(16.0, 0.6);
  b.quadTo(11.0, 3.4, 7.0, 1.2).quadTo(5.0, 0.4, 4.4, 2.8).quadTo(4.2, 8.2, 2.6, 8.4).quadTo(1.0, 8.2, 0.9, 2.8);
  b.quadTo(0.4, 0.2, -3.0, 2.2).quadTo(-8.0, 4.2, -12.0, 1.2).lineTo(-16.0, 0.8).close();
  return b.build();
})();
const GLAZE_RIM = (() => {
  const b = builder().moveTo(-16.0, 0.8);
  b.lineTo(-12.0, 1.2).quadTo(-8.0, 4.2, -3.0, 2.2).quadTo(0.4, 0.2, 0.9, 2.8).quadTo(1.0, 8.2, 2.6, 8.4).quadTo(4.2, 8.2, 4.4, 2.8).quadTo(5.0, 0.4, 7.0, 1.2).quadTo(11.0, 3.4, 16.0, 0.6);
  return b.build();
})();

/** Glaze: the pair, each coated over its top half (the coat hugs the glyph), one drip, a white gloss line. */
function glazed(c: SkCanvas, g: G, id: ChainId): void {
  groundShadow(c, 15.5, 17, 3.2);
  const col = GLAZE[id];
  for (const [x, y] of PAIR) {
    at(c, x, y, 1.08, 0, (q) => {
      coat(q, g, GLAZE_MASK, alpha(col, 0.88), GLAZE_RIM, shade(col, -0.45), 1.1);
      gloss(q, -2.2, -2.4, 6.2, 0.95, 200, 60, 1.5);
    });
  }
}

function three(c: SkCanvas, g: G, s: number, y = 0): void {
  at(c, -7.2, y + 1.4, s, -14, g);
  at(c, 7.2, y + 1.4, s, 14, g);
  at(c, 0, y - 2.6, s * 1.05, 0, g);
}

/** Ribbon: three glyphs bundled and tied with a band and a red bow. */
function ribbon(c: SkCanvas, g: G): void {
  groundShadow(c, 16, 17, 3.2);
  three(c, g, 1);
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

/** The serving: tiers 5 to 8 all show the same three glyphs at the same large size (the chain stays readable); only the frame round them grows. */
const SERVE_S = 1.02;
const SERVE_Y = -3;
const PLATE = { rx: 21.5, ry: 7.4, y: 10 };

/** The plate under the serving: pale (tier 5) or with the dark brass-dotted rim (tiers 6 to 8). */
function plate(c: SkCanvas, rim: boolean): void {
  const { rx, ry, y } = PLATE;
  c.drawPath(oval(0, y + 1.6, rx, ry), fill(alpha(NIGHT.tealDeep, 0.6)));
  const outer = oval(0, y, rx, ry);
  if (rim) {
    c.drawPath(outer, fill(NIGHT.indigoMid));
    c.drawPath(outer, stroke(INK, 1.2));
    c.drawPath(oval(0, y - 0.5, rx - 4.6, ry - 2.6), fill(NIGHT.indigoLift));
    c.drawPath(oval(0, y - 0.5, rx - 4.6, ry - 2.6), stroke(alpha(NIGHT.brass, 0.8), 0.8));
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      c.drawPath(circle(Math.cos(a) * (rx - 2.3), y + Math.sin(a) * (ry - 1.3), 0.8), fill(NIGHT.brassLight));
    }
  } else {
    c.drawPath(outer, fill(NIGHT.paperLight));
    c.drawPath(outer, stroke(INK, 1.2));
    c.drawPath(oval(0, y - 0.4, rx - 5, ry - 2.8), stroke(alpha(NIGHT.paperEdge, 0.9), 1));
  }
}

/** Garnish (tier 6 on): a ring of leaf sprigs round the back of the plate and a big sprig at each end, behind the food. */
function garnish(c: SkCanvas): void {
  const { rx, ry, y } = PLATE;
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (1.02 + (0.96 * i) / 8);
    const x = Math.cos(a) * (rx - 2.6);
    const yy = y + Math.sin(a) * (ry + 2.6) - 1;
    at(c, x, yy, 1.15, (a * 180) / Math.PI + 90, (k) => shape(k, blob([[0, 2.4], [2.3, -0.4], [0, -4.2], [-2.3, -0.4]], 1), i % 2 ? NIGHT.leafDeep : NIGHT.leaf, 0.8));
  }
  for (const sgn of [-1, 1]) {
    for (const [dx, dy, r] of [[0, 0, 70], [-1.6, -3.4, 35], [-1.4, 3, 105]] as const) {
      at(c, sgn * (rx - 4.6 + dx), y - 1 + dy, 1.15, sgn * r, (k) => shape(k, blob([[0, 2.4], [2.3, -0.4], [0, -4.2], [-2.3, -0.4]], 1), NIGHT.leaf, 0.8));
    }
  }
}

/** The lantern halo (tier 7 on): a warm disc of light and a thin ring behind the serving. */
function halo(c: SkCanvas, r = 20.5): void {
  c.drawPath(circle(0, -2, r), fill(alpha(NIGHT.amber, 0.55)));
  glow(c, 0, -2, r, NIGHT.flame, 0.9);
  c.drawPath(circle(0, -2, r), stroke(alpha(NIGHT.flame, 0.95), 1.4));
  c.drawPath(circle(0, -2, r - 3.2), stroke(alpha(NIGHT.amberPale, 0.6), 0.9));
  for (const [x, y, k] of [[-15.6, -14.6, 2.6], [15.8, -13.6, 2.2], [-18.6, 0.4, 1.7], [18.4, 1.4, 1.9]] as const) sparkle(c, x, y, k, NIGHT.white);
}

/** The indigo lacquer board with a brass rim (tier 8): a frame round the whole cell, behind the serving. */
function lacquer(c: SkCanvas): void {
  const b = rrect(-22.4, -22, 44.8, 41, 6);
  c.drawPath(rrect(-22.4, -21, 44.8, 41, 6), fill(alpha(INK, 0.7)));
  c.drawPath(b, fill(NIGHT.indigo));
  c.drawPath(b, stroke(NIGHT.brass, 3));
  c.drawPath(b, stroke(INK, 0.6));
  c.drawPath(rrect(-19.4, -19.4, 38.8, 35.2, 4), stroke(alpha(NIGHT.brassLight, 0.8), 0.9));
  for (const [x, y] of [[-19.4, -19.4], [19.4, -19.4], [-19.4, 15.8], [19.4, 15.8]] as const) {
    c.drawPath(circle(x, y, 1.9), fill(NIGHT.brassLight));
    c.drawPath(circle(x, y, 1.9), stroke(INK, 0.7));
  }
  c.drawPath(line(-15, -20.6, 6, -20.6), stroke(alpha(NIGHT.white, 0.4), 1));
}

// ---------------------------------------------------------------------------
// Tier pip
// ---------------------------------------------------------------------------

const PIP_R = 1.75;
const PIP_STEP = 4.2;
const PIP_GROUP = 2;
const PIP_H = 6.4;

/** Width of a tier pip in points. */
export function tierPipWidth(tier: number): number {
  const k = Math.max(1, Math.min(8, tier));
  return (k - 1) * PIP_STEP + (k > 4 ? PIP_GROUP : 0) + PIP_R * 2 + 3.4;
}

/**
 * The tier pip: `tier` paper-white dots of 3.5 pt (grouped by four) on a dark plate, centred on
 * (x, y). `scale` grows it for small icons where the dots must stay countable.
 */
export function drawTierPip(c: SkCanvas, tier: number, x = 0, y = 0, scale = 1): void {
  const k = Math.max(1, Math.min(8, Math.round(tier)));
  const w = tierPipWidth(k);
  at(c, x, y, scale, 0, (q) => {
    q.drawPath(rrect(-w / 2, -PIP_H / 2, w, PIP_H, PIP_H / 2), fill(alpha(INK, 0.85)));
    let px = -w / 2 + 1.7 + PIP_R;
    for (let i = 0; i < k; i++) {
      q.drawPath(circle(px, 0, PIP_R), fill(NIGHT.paperLight));
      px += PIP_STEP + (i === 3 ? PIP_GROUP : 0);
    }
  });
}

/** Where the pip sits inside a good's square (centre). */
export const PIP_Y = 20.4;

// ---------------------------------------------------------------------------
// A good
// ---------------------------------------------------------------------------

export interface GoodOptions {
  /** Draw the tier pip (default true). */
  pip?: boolean;
  /**
   * Draw as one flat colour (the Ladder Book's silhouette of the next good): the glyph
   * arrangement only, never the plate, halo or board, so the chain is what the shape tells.
   */
  silhouette?: string;
}

/** One good, centred on the origin, in the 48 pt square. */
export function drawGood(c: SkCanvas, chain: ChainId | number, tier: number, o: GoodOptions = {}): void {
  const id = typeof chain === 'number' ? CHAIN_IDS[chain] : chain;
  const k = Math.max(1, Math.min(TIERS, Math.round(tier)));
  const g = GLYPH[id];
  const frame = !o.silhouette;
  const body = (q: SkCanvas) => {
    switch (k) {
      case 1:
        one(q, g);
        break;
      case 2:
        pair(q, g);
        break;
      case 3:
        glazed(q, g, id);
        break;
      case 4:
        ribbon(q, g);
        break;
      default:
        if (frame) {
          if (k >= 8) lacquer(q);
          if (k >= 7) halo(q);
          if (k >= 6) garnish(q);
          plate(q, k >= 6);
        }
        three(q, g, SERVE_S, SERVE_Y);
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
