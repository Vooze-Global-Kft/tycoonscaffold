/**
 * The six stall fronts (spec 4.2, 4.5): awning, posts, a sign with the chain's glyph, the counter and
 * the gear on it, in three awning states (the stall's levels 5, 10 and 20 redraw the awning, 2.2:
 * 0 = plain cloth, 1 = scalloped with a lantern, 2 = double scallops, tassels, brass finials and two
 * lanterns), and the blue silk variant with moon lanterns that the cosmetic purchase switches on
 * (M13). A closed stall (not open yet) is the same front with its shutter down and the awning furled.
 *
 * Design box: 60 x 40 pt, origin at its centre (`STALL_W`, `STALL_H`), drawn 52 to 60 pt wide on
 * the street. The right part of the counter (x 6 to 28) is left free for the minder and the till,
 * which the play canvas draws on top (`STALL_MINDER`, `STALL_TILL`, `STALL_BADGE`, `STALL_PIP`).
 * Silk (M13): a deep night-blue silk with a moon crest and a string of moon lanterns in every awning
 * state; the valance keeps the stall's own colour so the six fronts stay told apart.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { drawFinial, drawGear } from './gear.draw';
import { drawGlyph } from './goods.draw';
import { drawLantern } from './lantern.draw';
import { CHAIN, CHAIN_IDS, NIGHT, alpha, mix, shade, type ChainId } from './palette';
import { INK, builder, circle, clip, fill, line, lit, poly, rrect, scallops, shape, stroke } from './pen';

export const STALL_W = 60;
export const STALL_H = 40;
export type Awning = 0 | 1 | 2;
export const AWNINGS: readonly Awning[] = [0, 1, 2];

/** Anchor points inside the front (origin at its centre): where the play canvas draws the rest. */
/** The minder: the fx atlas's `minder-head-<chain>` (a head only, `size` pt square) centred here. */
export const STALL_MINDER = { x: 13.5, y: 3.6, size: 20 };
export const STALL_TILL = { x: 24.5, y: 11.5 };
export const STALL_BADGE = { x: -21, y: -1 };
export const STALL_PIP = { x: -24.5, y: -9 };

/**
 * Which awning a stall level shows. Spec 2.2 names three redraws (levels 5, 10, 20) but 4.5 bakes
 * three awning states; until the lead settles it: levels 1 to 4 plain, 5 to 9 scalloped, 10 and up
 * double (level 20 draws the same as 10). See the art handover notes.
 */
export function awningFor(stallLevel: number): Awning {
  return stallLevel >= 10 ? 2 : stallLevel >= 5 ? 1 : 0;
}

export interface StallOptions {
  awning?: Awning;
  /** The cosmetic purchase: blue silk awnings and moon lanterns (M13). */
  silk?: boolean;
  /** Not open yet: shutter down, awning furled, no gear. */
  closed?: boolean;
}

function stripes(c: SkCanvas, x0: number, x1: number, y0: number, y1: number, a: string, b: string, n: number): void {
  const w = (x1 - x0) / n;
  for (let i = 0; i < n; i++) c.drawPath(poly([x0 + i * w, y0, x0 + (i + 1) * w, y0, x0 + (i + 1) * w + 1.2, y1, x0 + i * w + 1.2, y1]), fill(i % 2 ? b : a));
}

const SILK_SHEEN = '#9DB0EA';

export function drawStallFront(c: SkCanvas, chain: ChainId | number, o: StallOptions = {}): void {
  const id = typeof chain === 'number' ? CHAIN_IDS[chain] : chain;
  const col = CHAIN[id];
  const awn = o.awning ?? 0;
  const silk = !!o.silk && !o.closed;
  const cloth = silk ? NIGHT.silk : col.awning;
  const clothShade = silk ? NIGHT.silkDeep : col.awningShade;
  const clothLight = silk ? NIGHT.silkLight : NIGHT.paperLight;
  // The valance (the awning's lower edge) keeps the chain's colour, silk or not.
  const valance = col.awning;
  const valanceShade = col.awningShade;

  // Back wall: a dark indigo booth lit warm from the counter.
  const wall = rrect(-27, -12, 54, 31, 2);
  c.drawPath(wall, fill(mix(NIGHT.indigoLift, NIGHT.wood, 0.25)));
  c.save();
  clip(c, wall);
  c.drawPath(rrect(-27, 2, 54, 20, 0), fill(alpha(NIGHT.amber, 0.14)));
  for (let x = -20; x < 27; x += 9) c.drawPath(line(x, -12, x, 20), stroke(alpha(INK, 0.35), 0.7));
  c.restore();
  // Posts.
  for (const x of [-27, 27]) {
    const post = rrect(x - 2, -14, 4, 33, 1.2);
    lit(c, post, NIGHT.woodDeep, NIGHT.wood, -0.6, 0, 0.9);
  }

  // Sign: a paper plaque with the chain's glyph.
  if (!o.closed) {
    c.drawPath(line(-6, -10, -6, -7.5), stroke(INK, 0.7));
    c.drawPath(line(6, -10, 6, -7.5), stroke(INK, 0.7));
    shape(c, rrect(-9, -7.6, 18, 11, 2), NIGHT.paperLight, 0.9);
    c.save();
    c.translate(0, -2.1);
    drawGlyph(c, id, 0.42);
    c.restore();
  }

  // Counter.
  const top = rrect(-29, 10, 58, 4, 1.4);
  lit(c, top, NIGHT.woodDeep, NIGHT.woodLight, 0, -1, 0.9);
  c.drawPath(rrect(-27, 14, 54, 5.2, 0), fill(NIGHT.woodDeep));
  c.drawPath(line(-27, 19.2, 27, 19.2), stroke(INK, 0.9));
  c.drawPath(rrect(-26, 15.2, 52, 3, 1), fill(alpha(valance, 0.9)));

  if (o.closed) {
    // A cloth curtain down over the booth, in folds, in a dark shade of the stall's own colour.
    const curtain = rrect(-25, -12, 50, 22, 1);
    const base = mix(valanceShade, NIGHT.indigo, 0.45);
    c.drawPath(curtain, fill(base));
    c.save();
    clip(c, curtain);
    for (let x = -25; x < 25; x += 6.25) {
      c.drawPath(rrect(x + 0.6, -12, 3.2, 22, 1.6), fill(alpha(mix(valance, NIGHT.indigo, 0.25), 0.7)));
      c.drawPath(line(x + 5.4, -12, x + 5.4, 10), stroke(alpha(NIGHT.indigoDeep, 0.6), 0.8));
    }
    c.restore();
    c.drawPath(curtain, stroke(INK, 0.9));
    // A paper tag with the chain's glyph hangs on the curtain: which stall will open here.
    shape(c, rrect(-5.4, -3.6, 10.8, 8.4, 1.6), NIGHT.paper, 0.8);
    c.save();
    c.translate(0, 0.6);
    drawGlyph(c, id, 0.3);
    c.restore();
  } else {
    // The gear on the counter, left of centre.
    c.save();
    c.translate(-12.5, 3.4);
    drawGear(c, id, 0.42);
    c.restore();
  }

  // Awning (everything within x -29.5..29.5, y -20..20: the atlas cell's edge stays clear).
  const yTop = -17.6;
  if (o.closed) {
    // Furled: the cloth rolled up tight on its rod, tied in two places.
    const roll = rrect(-29, yTop - 0.6, 58, 6.4, 3.2);
    lit(c, roll, valanceShade, valance, 0, -1.2, 0.9);
    for (let x = -24; x < 28; x += 8) c.drawPath(line(x, yTop, x - 1.4, yTop + 5), stroke(alpha(NIGHT.paperLight, 0.45), 1.2));
    for (const x of [-15, 15]) shape(c, rrect(x - 1.1, yTop - 1.2, 2.2, 7.6, 1), NIGHT.brass, 0.6);
    return;
  }
  const W = 29.4;
  const depth = awn === 0 ? 8 : 7;
  const body = builder().moveTo(-W + 0.8, yTop + 2).lineTo(W - 0.8, yTop + 2).lineTo(W, yTop + 2 + depth).lineTo(-W, yTop + 2 + depth).close().build();
  c.save();
  clip(c, body);
  if (silk) {
    // Silk: one deep night-blue cloth with soft diagonal sheen and a crescent moon crest.
    c.drawPath(body, fill(cloth));
    for (let x = -36; x < 36; x += 9) c.drawPath(poly([x, yTop + 2, x + 3.4, yTop + 2, x + 7.4, yTop + 2 + depth, x + 4, yTop + 2 + depth]), fill(alpha(SILK_SHEEN, 0.28)));
  } else stripes(c, -W - 1, W + 1, yTop + 2, yTop + 2 + depth, cloth, clothLight, 8);
  c.drawPath(rrect(-W - 1, yTop + 1, 2 * W + 2, 2.4, 0), fill(alpha(INK, 0.25)));
  c.restore();
  c.drawPath(body, stroke(INK, 0.9));
  if (silk) {
    const my = yTop + 2 + depth / 2 + 0.4;
    c.drawPath(circle(0, my, 2.6), fill(NIGHT.moon));
    c.drawPath(circle(1.2, my - 0.8, 2.2), fill(cloth));
  }
  const yEdge = yTop + 2 + depth;
  if (awn === 0) {
    c.drawPath(rrect(-W, yEdge - 0.6, 2 * W, 2.4, 1), fill(valance));
    c.drawPath(rrect(-W, yEdge - 0.6, 2 * W, 2.4, 1), stroke(INK, 0.7));
  } else {
    const n = 8;
    const sc = builder();
    const w = (2 * W) / n;
    sc.moveTo(-W, yEdge);
    for (let i = 0; i < n; i++) sc.quadTo(-W + w * (i + 0.5), yEdge + 6.4, -W + w * (i + 1), yEdge);
    sc.close();
    const scal = sc.build();
    c.drawPath(scal, fill(valance));
    c.drawPath(scal, stroke(INK, 0.8));
    c.drawPath(scallops(-W, W, yEdge + 0.8, n, 1.6), stroke(alpha(silk ? NIGHT.moon : clothLight, 0.7), 0.8));
  }
  // Brass rod.
  c.drawPath(line(-W, yTop + 2, W, yTop + 2), stroke(INK, 2.6));
  c.drawPath(line(-W, yTop + 2, W, yTop + 2), stroke(NIGHT.brass, 1.3));
  if (awn === 2) {
    // A second, shorter layer of scallops in the shade colour, tassels and finials.
    const n = 6;
    const w = 48 / n;
    const sc = builder();
    sc.moveTo(-24, yTop + 2);
    for (let i = 0; i < n; i++) sc.quadTo(-24 + w * (i + 0.5), yTop + 8.6, -24 + w * (i + 1), yTop + 2);
    sc.close();
    c.drawPath(sc.build(), fill(silk ? valanceShade : clothShade));
    c.drawPath(sc.build(), stroke(INK, 0.7));
    for (let i = 0; i <= 8; i += 2) {
      const x = -W + 1 + ((2 * W - 2) / 8) * i;
      c.drawPath(line(x, yEdge, x, yEdge + 4), stroke(NIGHT.brass, 0.9));
      c.drawPath(rrect(x - 0.9, yEdge + 3.6, 1.8, 2.4, 0.8), fill(NIGHT.brassLight));
    }
    drawFinial(c, -W + 0.6, yTop + 2.4);
    drawFinial(c, W - 0.6, yTop + 2.4);
  }
  if (silk) {
    // Moon lanterns on a string under the awning, in every state: the purchase's own sign.
    const y = yEdge + (awn === 0 ? 2.6 : 6.2);
    c.drawPath(builder().moveTo(-W + 2, y).quadTo(0, y + 4, W - 2, y).build(), stroke(alpha(NIGHT.moon, 0.7), 0.6));
    for (const x of [-18, 0, 18]) {
      c.save();
      c.translate(x, y + (1 - (x / 18) ** 2) * 2 + 3.4);
      drawLantern(c, 2.4, { look: 'moon', cord: 1, glow: 0.8, tassel: false });
      c.restore();
    }
  } else if (awn >= 1) {
    const spots = awn === 1 ? [22] : [-22, 22];
    for (const x of spots) {
      c.save();
      c.translate(x, yEdge + 9);
      drawLantern(c, 2.9, { look: 'lit', cord: 1.6, glow: 0.8 });
      c.restore();
    }
  }
  void shade;
}
