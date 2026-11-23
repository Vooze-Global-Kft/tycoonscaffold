/**
 * Election night's paper cut-outs (spec 1.2, 4.4): the Counting Clerk and each rival as a tall flat
 * figure, the head one sixth of the body, cut from paper with a white edge and mounted on a stick;
 * and the band in silhouette. The same head parts as the busts (no hatching: flat washes only).
 *
 * Design box of a figure: 120 x 340 units (`CUTOUT_W`, `CUTOUT_H`): crown at y = 28, feet at
 * y = 310 (six heads of 47), the stick below. `drawCutout(canvas, castId, box, options)` fits it into
 * `box`. `drawBand(canvas, box, options)`: four players in one colour, 240 x 180 units.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { drawHeadOf, washOf } from './bust.draw';
import { lookOf, type Look } from './cast';
import { HEAD_TOP, drawHairBack, headGeo } from './head';
import { CLOTH, GREY_MATRIX, P, at, blob, builder, circle, fill, filtered, flat, mix, oval, poly, rrect, wash, type Pen } from './ink';
import { PROPS, type PropDef } from './props';
import type { BustBox } from './bust.draw';

export const CUTOUT_W = 120;
export const CUTOUT_H = 340;
export const BAND_W = 240;
export const BAND_H = 180;

const FLAT_PEN: Pen = { ink: P.ink, hatch: false, weight: 1.35 };
/** Head height (crown to chin) of every head shape is 46 to 48: the figure is six of them. */
const HEAD_H = 47;
const FEET_Y = HEAD_TOP + HEAD_H * 6;
const CX = 60;

function figure(c: SkCanvas, look: Look): void {
  const pen = FLAT_PEN;
  const w = washOf(look);
  const g = headGeo(look.head, 50, HEAD_TOP);
  const coat = CLOTH[look.cloth];
  const legs = mix(coat, P.ink, 0.45);
  const shoulderY = g.chin + 10;
  // Long hair falls behind the coat.
  at(c, CX - 50, 0, 1, 0, (q) => drawHairBack(q, pen, g, look.hair, w));
  // Legs and shoes.
  for (const s of [-1, 1]) {
    wash(c, pen, rrect(CX + s * 9 - 6, 200, 12, FEET_Y - 206, 3), legs, 1);
    wash(c, pen, blob([[CX + s * 9 - 6, FEET_Y - 7], [CX + s * 9 + 6 + s * 3, FEET_Y - 7], [CX + s * 9 + 7 + s * 5, FEET_Y], [CX + s * 9 - 7, FEET_Y]], 0.6), '#3A2A22', 0.8);
  }
  // Arms (sleeves) behind the coat, hands below.
  for (const s of [-1, 1]) {
    const arm = poly([CX + s * 22, shoulderY + 2, CX + s * 31, shoulderY + 8, CX + s * 33, 186, CX + s * 24, 186]);
    wash(c, pen, arm, mix(coat, P.ink, 0.12), 1);
    wash(c, pen, oval(CX + s * 28.5, 191, 5, 6), w.skin, 0.9);
  }
  // The coat: shoulders, a straight body, to the knee.
  const body = builder()
    .moveTo(CX - 7, shoulderY - 3)
    .cubicTo(CX - 18, shoulderY - 2, CX - 26, shoulderY, CX - 27, shoulderY + 12)
    .lineTo(CX - 24, 222)
    .lineTo(CX + 24, 222)
    .lineTo(CX + 27, shoulderY + 12)
    .cubicTo(CX + 26, shoulderY, CX + 18, shoulderY - 2, CX + 7, shoulderY - 3)
    .close()
    .build();
  // The neck, then the coat over it.
  wash(c, pen, rrect(CX - 6, g.chin - 8, 12, 16, 3), w.skin, 1);
  wash(c, pen, body, coat, 1.1);
  // Collar opening in the accent and buttons down the front.
  wash(c, pen, poly([CX - 8, shoulderY - 3, CX + 8, shoulderY - 3, CX, shoulderY + 16]), CLOTH[look.accent], 0.9);
  for (let i = 0; i < 3; i++) c.drawPath(circle(CX + 3.5, shoulderY + 26 + i * 18, 1.6), fill(mix(coat, P.ink, 0.5)));
  // The head, the same parts as the bust (at the bust's design x of 50, shifted to the figure's centre).
  at(c, CX - 50, 0, 1, 0, (q) => drawHeadOf(q, pen, look, w));
  // The prop: at the right hand, on the chest (the spoon) or on the shoulder (the pigeon).
  if (look.prop !== 'none') {
    const def = PROPS[look.prop] as PropDef;
    const acc = CLOTH[look.propAccent];
    if (look.prop === 'spoon') at(c, CX - 8, shoulderY + 18, 1.2, -10, (q) => def.draw(q, pen, acc));
    else if (look.prop === 'pigeon') at(c, CX + 24, shoulderY - 6, 1.1, 0, (q) => def.draw(q, pen, acc));
    else if (look.prop === 'chair') at(c, CX + 44, 252, 0.62, 0, (q) => def.draw(q, pen, acc));
    else if (look.prop === 'rosette') at(c, CX - 14, shoulderY + 20, 1, 0, (q) => def.draw(q, pen, acc));
    else at(c, CX + 32, 192, 1.25, 0, (q) => def.draw(q, pen, acc));
  }
}

function stick(c: SkCanvas): void {
  wash(c, FLAT_PEN, rrect(CX - 3.5, FEET_Y - 70, 7, CUTOUT_H - (FEET_Y - 70) - 2, 1.5), '#B08A5E', 1);
}

/** The whole cut-out in design units (120 x 340): stick, white paper edge, flat figure. */
export function drawCutoutLook(c: SkCanvas, look: Look, o: { greyscale?: boolean } = {}): void {
  const body = (q: SkCanvas) => {
    stick(q);
    // The paper edge: the figure flattened to white and grown by drawing it round a small circle.
    const edge = 3.2;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      flat(q, P.white, (z) => at(z, Math.cos(a) * edge, Math.sin(a) * edge, 1, 0, (y) => figure(y, look)));
    }
    figure(q, look);
  };
  if (o.greyscale) filtered(c, GREY_MATRIX, body);
  else body(c);
}

export function drawCutout(canvas: SkCanvas, castId: string, box: BustBox, options: { greyscale?: boolean } = {}): boolean {
  const look = lookOf(castId);
  if (!look) return false;
  const s = Math.min(box.width / CUTOUT_W, box.height / CUTOUT_H);
  canvas.save();
  canvas.translate(box.x + (box.width - CUTOUT_W * s) / 2, box.y + (box.height - CUTOUT_H * s) / 2);
  canvas.scale(s, s);
  drawCutoutLook(canvas, look, options);
  canvas.restore();
  return true;
}

// ---------------------------------------------------------------------------
// The band in silhouette (240 x 180): tuba, drum, trombone, cornet
// ---------------------------------------------------------------------------

function player(c: SkCanvas, x: number, col: string, kind: 'tuba' | 'drum' | 'trombone' | 'cornet'): void {
  const p = fill(col);
  const top = 20;
  const hh = 26; // head height: the figure is six heads (156) tall, feet at 176
  c.drawPath(oval(x, top + hh / 2, hh * 0.36, hh / 2), p);
  // Peaked bandstand cap? No: a plain round bandsman's hat would read as uniform. Bare heads.
  c.drawPath(rrect(x - 4, top + hh - 2, 8, 8, 2), p);
  c.drawPath(
    builder()
      .moveTo(x - 16, top + hh + 10)
      .quadTo(x, top + hh + 2, x + 16, top + hh + 10)
      .lineTo(x + 14, 120)
      .lineTo(x - 14, 120)
      .close()
      .build(),
    p,
  );
  for (const s of [-1, 1]) c.drawPath(rrect(x + s * 7 - 5, 118, 10, 56, 3), p);
  for (const s of [-1, 1]) c.drawPath(oval(x + s * 8 + s * 2, 174, 8, 3.4), p);
  if (kind === 'tuba') {
    const coil = builder().addCircle(x, 82, 18).build();
    c.drawPath(coil, p);
    c.drawPath(builder().moveTo(x - 8, 70).quadTo(x - 16, 40, x - 30, 22).lineTo(x - 4, 14).quadTo(x - 6, 44, x + 4, 66).close().build(), p);
    c.drawPath(oval(x - 17, 18, 14, 5.4), p);
  } else if (kind === 'drum') {
    c.drawPath(rrect(x - 20, 84, 40, 28, 4), p);
    for (const s of [-1, 1]) c.drawPath(builder().moveTo(x + s * 10, 70).lineTo(x + s * 24, 54).lineTo(x + s * 26, 56).lineTo(x + s * 12, 72).close().build(), p);
  } else if (kind === 'trombone') {
    c.drawPath(rrect(x, top + hh - 1, 46, 3.4, 1.4), p);
    c.drawPath(rrect(x + 4, top + hh + 9, 50, 3.4, 1.4), p);
    c.drawPath(rrect(x + 50, top + hh - 1, 3.4, 13.4, 1.4), p);
    c.drawPath(builder().moveTo(x + 8, top + hh + 1).lineTo(x - 20, top + hh - 10).lineTo(x - 20, top + hh + 12).close().build(), p);
  } else {
    c.drawPath(rrect(x + 4, top + hh + 1, 18, 3, 1), p);
    c.drawPath(builder().moveTo(x + 20, top + hh + 2.5).lineTo(x + 32, top + hh - 5).lineTo(x + 32, top + hh + 10).close().build(), p);
    c.drawPath(rrect(x + 6, top + hh + 1, 10, 9, 3), p);
  }
}

/** The band of "The Middling March" in silhouette (one colour; default the chalk board's deep shade). */
export function drawBand(canvas: SkCanvas, box: BustBox, o: { color?: string } = {}): void {
  const col = o.color ?? '#1B2021';
  const s = Math.min(box.width / BAND_W, box.height / BAND_H);
  canvas.save();
  canvas.translate(box.x + (box.width - BAND_W * s) / 2, box.y + (box.height - BAND_H * s) / 2);
  canvas.scale(s, s);
  player(canvas, 40, col, 'tuba');
  player(canvas, 98, col, 'drum');
  player(canvas, 150, col, 'trombone');
  player(canvas, 206, col, 'cornet');
  canvas.restore();
}
