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
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { drawFinial, drawGear } from './gear.draw';
import { drawGlyph } from './goods.draw';
import { drawLantern } from './lantern.draw';
import { CHAIN, CHAIN_IDS, NIGHT, alpha, mix, shade, type ChainId } from './palette';
import { INK, builder, clip, fill, line, lit, poly, rrect, scallops, shape, stroke } from './pen';

export const STALL_W = 60;
export const STALL_H = 40;
export type Awning = 0 | 1 | 2;
export const AWNINGS: readonly Awning[] = [0, 1, 2];

/** Anchor points inside the front (origin at its centre): where the play canvas draws the rest. */
export const STALL_MINDER = { x: 13, y: 7, size: 18 };
export const STALL_TILL = { x: 24.5, y: 11.5 };
export const STALL_BADGE = { x: -21, y: -1 };
export const STALL_PIP = { x: -24.5, y: -9 };

/** Which awning a stall level shows (levels 5, 10 and 20 redraw it, 2.2). */
export function awningFor(stallLevel: number): Awning {
  return stallLevel >= 20 ? 2 : stallLevel >= 10 ? 1 : 0;
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

export function drawStallFront(c: SkCanvas, chain: ChainId | number, o: StallOptions = {}): void {
  const id = typeof chain === 'number' ? CHAIN_IDS[chain] : chain;
  const col = CHAIN[id];
  const awn = o.awning ?? 0;
  const silk = !!o.silk;
  const cloth = silk ? NIGHT.silk : col.awning;
  const clothShade = silk ? NIGHT.silkDeep : col.awningShade;
  const clothLight = silk ? NIGHT.silkLight : NIGHT.paperLight;
  const lanternLook = silk ? 'moon' : 'lit';

  // Back wall: a dark indigo booth lit warm from the counter.
  const wall = rrect(-27, -12, 54, 32, 2);
  c.drawPath(wall, fill(mix(NIGHT.indigoLift, NIGHT.wood, 0.25)));
  c.save();
  clip(c, wall);
  c.drawPath(rrect(-27, 2, 54, 20, 0), fill(alpha(NIGHT.amber, 0.14)));
  for (let x = -20; x < 27; x += 9) c.drawPath(line(x, -12, x, 20), stroke(alpha(INK, 0.35), 0.7));
  c.restore();
  // Posts.
  for (const x of [-27, 27]) {
    const post = rrect(x - 2, -14, 4, 34, 1.2);
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
  c.drawPath(rrect(-27, 14, 54, 6, 0), fill(NIGHT.woodDeep));
  c.drawPath(line(-27, 20, 27, 20), stroke(INK, 1));
  c.drawPath(rrect(-26, 15.4, 52, 3.4, 1), fill(alpha(cloth, 0.85)));

  if (o.closed) {
    // Shutter down over the booth.
    const sh = rrect(-25, -12, 50, 22, 1);
    c.drawPath(sh, fill(NIGHT.stoneDeep));
    for (let y = -10; y < 10; y += 3.2) c.drawPath(line(-25, y, 25, y), stroke(alpha(NIGHT.stoneLight, 0.5), 0.8));
    c.drawPath(sh, stroke(INK, 0.9));
    shape(c, rrect(-3.5, 6, 7, 2.4, 1), NIGHT.brass, 0.7);
  } else {
    // The gear on the counter, left of centre.
    c.save();
    c.translate(-12.5, 3.4);
    drawGear(c, id, 0.36);
    c.restore();
  }

  // Awning.
  const yTop = -20;
  if (o.closed) {
    const roll = rrect(-29, yTop + 1, 58, 6, 3);
    lit(c, roll, clothShade, cloth, 0, -1.2, 0.9);
    for (let x = -24; x < 28; x += 8) c.drawPath(line(x, yTop + 1.6, x - 1.4, yTop + 6.4), stroke(alpha(clothLight, 0.7), 1.4));
    return;
  }
  const depth = awn === 0 ? 8 : 7;
  const body = builder().moveTo(-30, yTop + 2).lineTo(30, yTop + 2).lineTo(31, yTop + 2 + depth).lineTo(-31, yTop + 2 + depth).close().build();
  c.save();
  clip(c, body);
  stripes(c, -32, 33, yTop + 2, yTop + 2 + depth, cloth, clothLight, 8);
  c.drawPath(rrect(-32, yTop + 1, 64, 2.4, 0), fill(alpha(INK, 0.25)));
  c.restore();
  c.drawPath(body, stroke(INK, 0.9));
  const yEdge = yTop + 2 + depth;
  if (awn === 0) {
    c.drawPath(rrect(-31, yEdge - 0.6, 62, 2.2, 1), fill(clothShade));
    c.drawPath(rrect(-31, yEdge - 0.6, 62, 2.2, 1), stroke(INK, 0.7));
  } else {
    const n = 8;
    const sc = builder();
    const w = 62 / n;
    sc.moveTo(-31, yEdge);
    for (let i = 0; i < n; i++) sc.quadTo(-31 + w * (i + 0.5), yEdge + 6.4, -31 + w * (i + 1), yEdge);
    sc.close();
    const scal = sc.build();
    c.drawPath(scal, fill(cloth));
    c.drawPath(scal, stroke(INK, 0.8));
    c.drawPath(scallops(-31, 31, yEdge + 0.8, n, 1.6), stroke(alpha(clothLight, 0.7), 0.8));
  }
  // Brass rod.
  c.drawPath(line(-31, yTop + 2, 31, yTop + 2), stroke(INK, 2.6));
  c.drawPath(line(-31, yTop + 2, 31, yTop + 2), stroke(NIGHT.brass, 1.3));
  if (awn === 2) {
    // A second, shorter layer of scallops in the shade colour, tassels and finials.
    const n = 6;
    const w = 50 / n;
    const sc = builder();
    sc.moveTo(-25, yTop + 2);
    for (let i = 0; i < n; i++) sc.quadTo(-25 + w * (i + 0.5), yTop + 8.6, -25 + w * (i + 1), yTop + 2);
    sc.close();
    c.drawPath(sc.build(), fill(clothShade));
    c.drawPath(sc.build(), stroke(INK, 0.7));
    for (let i = 0; i <= 8; i += 2) {
      const x = -31 + (62 / 8) * i;
      c.drawPath(line(x, yEdge, x, yEdge + 4), stroke(NIGHT.brass, 0.9));
      c.drawPath(rrect(x - 0.9, yEdge + 3.6, 1.8, 2.4, 0.8), fill(NIGHT.brassLight));
    }
    drawFinial(c, -31, yTop + 1);
    drawFinial(c, 31, yTop + 1);
  }
  if (awn >= 1) {
    const spots = awn === 1 ? [22] : [-22, 22];
    for (const x of spots) {
      c.save();
      c.translate(x, yEdge + 9);
      drawLantern(c, 2.9, { look: lanternLook, cord: 1.6, glow: 0.8 });
      c.restore();
    }
  } else if (silk) {
    c.save();
    c.translate(22, yEdge + 8);
    drawLantern(c, 2.6, { look: 'moon', cord: 1.4, glow: 0.7 });
    c.restore();
  }
  void shade;
}
