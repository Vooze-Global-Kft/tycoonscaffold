/**
 * Hats and clothes of the cast (spec 7.3). No uniform, no religious or uniform headwear, no crown,
 * no national dress: every hat is an ordinary civilian hat a hobbyist might wear. Clothes take a
 * cloth colour and an accent from the look; none takes the skin tone.
 */
import type { SkCanvas, SkPath } from '@shopify/react-native-skia';
import type { HeadGeo } from './head';
import { CLOTH, alpha, blob, builder, circle, curve, fill, hatch, ink, line, mix, oval, poly, rrect, sideOf, stroke, wash, type Cloth, type Pen } from './ink';

// ---------------------------------------------------------------------------
// Hats (head coordinates; drawn over the hair)
// ---------------------------------------------------------------------------

type HatDraw = (c: SkCanvas, pen: Pen, g: HeadGeo, colour: string, accent: string) => void;

function shadeRight(c: SkCanvas, pen: Pen, p: SkPath, g: HeadGeo): void {
  hatch(c, pen, p, { within: sideOf(g.cx + 4, g.cx + 6, g.top - 40, g.top + 40), a: 0.45 });
}

export const HATS = {
  none: () => undefined,
  bowler: (c, pen, g, col) => {
    const y = g.top + g.h * 0.1;
    const brim = blob([[g.cx - g.hw - 6, y + 1.5], [g.cx, y - 1], [g.cx + g.hw + 6, y + 1.5], [g.cx + g.hw + 4, y + 3.6], [g.cx, y + 2.2], [g.cx - g.hw - 4, y + 3.6]], 0.8);
    const crown = blob([[g.cx - g.hw + 0.6, y + 1], [g.cx - g.hw + 1, y - 9], [g.cx, y - 14], [g.cx + g.hw - 1, y - 9], [g.cx + g.hw - 0.6, y + 1]], 0.9);
    wash(c, pen, crown, col);
    shadeRight(c, pen, crown, g);
    c.drawPath(poly([g.cx - g.hw + 0.8, y - 2.4, g.cx + g.hw - 0.8, y - 2.4, g.cx + g.hw - 0.6, y + 0.6, g.cx - g.hw + 0.6, y + 0.6]), fill(mix(col, pen.ink, 0.45)));
    wash(c, pen, brim, col);
  },
  flatcap: (c, pen, g, col) => {
    const y = g.top + g.h * 0.12;
    const p = blob([[g.cx - g.hw - 2.4, y + 2], [g.cx - g.hw - 1, y - 6], [g.cx + 2, y - 9], [g.cx + g.hw + 3, y - 6], [g.cx + g.hw + 9, y + 0.6], [g.cx + g.hw + 4, y + 3], [g.cx, y + 2.6]], 0.9);
    wash(c, pen, p, col);
    shadeRight(c, pen, p, g);
    ink(c, pen, curve([[g.cx - g.hw, y - 1], [g.cx + 4, y - 2.6], [g.cx + g.hw + 7, y + 0.8]]), 0.7);
  },
  boater: (c, pen, g, col, acc) => {
    const y = g.top + g.h * 0.08;
    const brim = oval(g.cx, y + 1, g.hw + 9, 3.2);
    const crown = poly([g.cx - g.hw + 0.4, y + 1, g.cx - g.hw + 1, y - 8.5, g.cx + g.hw - 1, y - 8.5, g.cx + g.hw - 0.4, y + 1]);
    wash(c, pen, brim, col);
    wash(c, pen, crown, col);
    c.drawPath(poly([g.cx - g.hw + 0.5, y - 3.4, g.cx + g.hw - 0.5, y - 3.4, g.cx + g.hw - 0.4, y + 0.4, g.cx - g.hw + 0.4, y + 0.4]), fill(acc));
    for (let i = 0; i < 4; i++) c.drawPath(line(g.cx - g.hw - 6 + i * 3, y + 0.4, g.cx - g.hw - 4 + i * 3, y + 2), stroke(alpha(pen.ink, 0.35), 0.4));
    shadeRight(c, pen, crown, g);
  },
  cloche: (c, pen, g, col, acc) => {
    const y = g.top + g.h * 0.26;
    const p = blob([[g.cx - g.hw - 3.4, y + 1.6], [g.cx - g.hw - 2.4, y - 10], [g.cx, y - 18], [g.cx + g.hw + 2.4, y - 10], [g.cx + g.hw + 3.4, y + 1.6], [g.cx, y - 1.6]], 0.9);
    wash(c, pen, p, col);
    shadeRight(c, pen, p, g);
    const band = curve([[g.cx - g.hw - 2.4, y - 3], [g.cx, y - 6], [g.cx + g.hw + 2.4, y - 3]]);
    c.drawPath(band, stroke(acc, 2.2));
    const flower = circle(g.cx - g.hw + 1, y - 4.4, 2.4);
    wash(c, pen, flower, acc, 0.6);
  },
  bucket: (c, pen, g, col) => {
    const y = g.top + g.h * 0.16;
    const crown = poly([g.cx - g.hw + 0.4, y, g.cx - g.hw + 2, y - 10, g.cx + g.hw - 2, y - 10, g.cx + g.hw - 0.4, y]);
    const brim = poly([g.cx - g.hw - 4, y + 4.2, g.cx - g.hw + 0.4, y - 0.6, g.cx + g.hw - 0.4, y - 0.6, g.cx + g.hw + 4, y + 4.2]);
    wash(c, pen, crown, col);
    shadeRight(c, pen, crown, g);
    wash(c, pen, brim, col);
    for (let i = 0; i < 3; i++) c.drawPath(curve([[g.cx - g.hw - 2.2, y + 1.4 + i], [g.cx, y + 0.2 + i], [g.cx + g.hw + 2.2, y + 1.4 + i]]), stroke(alpha(pen.ink, 0.35), 0.35));
  },
  bobble: (c, pen, g, col, acc) => {
    const y = g.top + g.h * 0.2;
    const p = blob([[g.cx - g.hw - 2, y + 1], [g.cx - g.hw - 1.2, y - 9], [g.cx, y - 15], [g.cx + g.hw + 1.2, y - 9], [g.cx + g.hw + 2, y + 1]], 0.9);
    wash(c, pen, p, col);
    for (let x = -g.hw + 2; x < g.hw; x += 4) c.drawPath(line(g.cx + x, y - 1, g.cx + x * 0.8, y - 11), stroke(alpha(pen.ink, 0.3), 0.5));
    wash(c, pen, rrect(g.cx - g.hw - 2.4, y - 3, (g.hw + 2.4) * 2, 5, 2), acc);
    wash(c, pen, circle(g.cx, y - 16.4, 3.4), acc);
  },
  trilby: (c, pen, g, col, acc) => {
    const y = g.top + g.h * 0.1;
    const brim = blob([[g.cx - g.hw - 6, y + 2.4], [g.cx, y - 0.4], [g.cx + g.hw + 7, y + 0.6], [g.cx + g.hw + 4, y + 3.4], [g.cx, y + 2.6]], 0.8);
    const crown = blob([[g.cx - g.hw + 0.8, y + 0.6], [g.cx - g.hw + 1.6, y - 9], [g.cx - 3, y - 12], [g.cx, y - 10], [g.cx + 3, y - 12.4], [g.cx + g.hw - 1.4, y - 9], [g.cx + g.hw - 0.4, y + 0.6]], 0.7);
    wash(c, pen, crown, col);
    shadeRight(c, pen, crown, g);
    c.drawPath(poly([g.cx - g.hw + 0.8, y - 3, g.cx + g.hw - 0.6, y - 3, g.cx + g.hw - 0.5, y + 0.4, g.cx - g.hw + 0.8, y + 0.4]), fill(acc));
    wash(c, pen, brim, col);
  },
  beret: (c, pen, g, col) => {
    const y = g.top + g.h * 0.12;
    const p = blob([[g.cx - g.hw - 4, y + 1.4], [g.cx - g.hw, y - 7], [g.cx + 4, y - 10], [g.cx + g.hw + 6, y - 5], [g.cx + g.hw + 4, y + 1.4], [g.cx, y + 2.4]], 0.9);
    wash(c, pen, p, col);
    shadeRight(c, pen, p, g);
    ink(c, pen, line(g.cx + 3, y - 10, g.cx + 4, y - 12.4), 1);
  },
  /** Councillor Plumb's hat (her hobby): broad brim, a heap of cloth flowers. */
  flowers: (c, pen, g, col, acc) => {
    const y = g.top + g.h * 0.1;
    const brim = oval(g.cx + 1, y + 1, g.hw + 14, 4.4);
    const crown = blob([[g.cx - g.hw + 0.6, y + 1], [g.cx - g.hw + 1.4, y - 8], [g.cx, y - 11], [g.cx + g.hw - 1.4, y - 8], [g.cx + g.hw - 0.6, y + 1]], 0.9);
    wash(c, pen, brim, col);
    wash(c, pen, crown, col);
    shadeRight(c, pen, crown, g);
    const flowers: [number, number, number, string][] = [
      [-g.hw + 2, -7, 3.6, acc],
      [-g.hw + 7, -11, 3.2, '#EDE9E0'],
      [-g.hw + 12, -8, 3.4, mix(acc, '#FFFFFF', 0.4)],
      [-g.hw - 3, -2, 3, '#EDE9E0'],
      [-g.hw + 16, -12, 2.6, acc],
    ];
    for (const [dx, dy, r, colr] of flowers) {
      wash(c, pen, circle(g.cx + dx, y + dy, r), colr, 0.6);
      c.drawPath(circle(g.cx + dx, y + dy, r * 0.32), fill(alpha(pen.ink, 0.6)));
    }
    ink(c, pen, curve([[g.cx + g.hw + 4, y - 2], [g.cx + g.hw + 10, y - 14], [g.cx + g.hw + 6, y - 20]]), 0.8);
  },
  /** Tobias Slake's: a hat with a smaller hat on it. */
  hatOnHat: (c, pen, g, col, acc) => {
    const y = g.top + g.h * 0.1;
    const brim = oval(g.cx, y + 1.4, g.hw + 6, 2.8);
    const crown = poly([g.cx - g.hw + 1.4, y + 1.4, g.cx - g.hw + 2.4, y - 9, g.cx + g.hw - 2.4, y - 9, g.cx + g.hw - 1.4, y + 1.4]);
    wash(c, pen, brim, col);
    wash(c, pen, crown, col);
    shadeRight(c, pen, crown, g);
    c.drawPath(poly([g.cx - g.hw + 1.6, y - 2.4, g.cx + g.hw - 1.6, y - 2.4, g.cx + g.hw - 1.4, y + 0.6, g.cx - g.hw + 1.4, y + 0.6]), fill(acc));
    const y2 = y - 9;
    wash(c, pen, oval(g.cx + 2, y2, 7, 1.6), acc);
    wash(c, pen, poly([g.cx - 2.4, y2, g.cx - 1.8, y2 - 6, g.cx + 5.8, y2 - 6, g.cx + 6.4, y2]), acc);
    c.drawPath(poly([g.cx - 2, y2 - 1.6, g.cx + 6, y2 - 1.6, g.cx + 6.2, y2, g.cx - 2.2, y2]), fill(col));
  },
} satisfies Record<string, HatDraw>;
export type HatId = keyof typeof HATS;

// ---------------------------------------------------------------------------
// Garments (bust coordinates: 100 x 125, the neck at x = 50)
// ---------------------------------------------------------------------------

export interface GarmentCtx {
  cx: number;
  /** y of the neck's base (where the collar sits). */
  neckY: number;
  cloth: string;
  accent: string;
  shirt: string;
}

type GarmentDraw = (c: SkCanvas, pen: Pen, k: GarmentCtx) => void;

/** The torso: shoulders sloping out from the neck to the oval's edge. */
export function torso(cx: number, y: number, slope = 1): SkPath {
  return builder()
    .moveTo(cx - 8, y - 2)
    .cubicTo(cx - 24, y - 1, cx - 38 * slope, y + 4, cx - 44, y + 18)
    .lineTo(cx - 52, 132)
    .lineTo(cx + 52, 132)
    .lineTo(cx + 44, y + 18)
    .cubicTo(cx + 38 * slope, y + 4, cx + 24, y - 1, cx + 8, y - 2)
    .close()
    .build();
}

function body(c: SkCanvas, pen: Pen, k: GarmentCtx): SkPath {
  const t = torso(k.cx, k.neckY);
  wash(c, pen, t, k.cloth, 1.2);
  hatch(c, pen, t, { within: sideOf(k.cx + 16, k.cx + 22, k.neckY - 10, 140, true, 4), a: 0.42 });
  return t;
}

function vOpening(cx: number, y: number, depth: number, w = 8): SkPath {
  return poly([cx - w, y - 2, cx + w, y - 2, cx, y + depth]);
}

export const GARMENTS = {
  suit: (c, pen, k) => {
    body(c, pen, k);
    const v = vOpening(k.cx, k.neckY, 22, 9);
    wash(c, pen, v, k.shirt, 0.9);
    const tie = poly([k.cx - 1.8, k.neckY + 1, k.cx + 1.8, k.neckY + 1, k.cx + 3, k.neckY + 18, k.cx, k.neckY + 21, k.cx - 3, k.neckY + 18]);
    wash(c, pen, tie, k.accent, 0.8);
    wash(c, pen, poly([k.cx - 2.4, k.neckY - 1.4, k.cx + 2.4, k.neckY - 1.4, k.cx + 1.8, k.neckY + 2, k.cx - 1.8, k.neckY + 2]), k.accent, 0.7);
    for (const s of [-1, 1]) ink(c, pen, poly([k.cx + s * 9, k.neckY - 2, k.cx + s * 14, k.neckY + 10, k.cx + s * 4, k.neckY + 14, k.cx + s * 1.2, k.neckY + 22], false), 0.8);
  },
  cardigan: (c, pen, k) => {
    body(c, pen, k);
    const v = vOpening(k.cx, k.neckY, 26, 7);
    wash(c, pen, v, k.accent, 0.9);
    for (const s of [-1, 1]) wash(c, pen, poly([k.cx, k.neckY + 1, k.cx + s * 7, k.neckY - 3, k.cx + s * 6, k.neckY + 3]), k.shirt, 0.7);
    for (let i = 0; i < 2; i++) wash(c, pen, circle(k.cx + 1.6, k.neckY + 30 + i * 7, 1.1), k.shirt, 0.5);
    ink(c, pen, line(k.cx, k.neckY + 26, k.cx, 130), 0.7);
  },
  turtleneck: (c, pen, k) => {
    body(c, pen, k);
    const roll = rrect(k.cx - 9, k.neckY - 8, 18, 10, 3.6);
    wash(c, pen, roll, mix(k.cloth, '#FFFFFF', 0.12), 1);
    for (let x = -6; x <= 6; x += 3) c.drawPath(line(k.cx + x, k.neckY - 7, k.cx + x, k.neckY + 1), stroke(alpha(pen.ink, 0.35), 0.45));
  },
  bow: (c, pen, k) => {
    body(c, pen, k);
    const neck = builder().moveTo(k.cx - 10, k.neckY - 2).quadTo(k.cx, k.neckY + 9, k.cx + 10, k.neckY - 2).close().build();
    wash(c, pen, neck, k.shirt, 0.8);
    for (const s of [-1, 1]) wash(c, pen, blob([[k.cx, k.neckY + 4], [k.cx + s * 7, k.neckY + 0.6], [k.cx + s * 7.4, k.neckY + 7.4]], 0.7), k.accent, 0.7);
    for (const s of [-1, 1]) wash(c, pen, poly([k.cx, k.neckY + 4.6, k.cx + s * 3.6, k.neckY + 15, k.cx + s * 1, k.neckY + 15.6]), k.accent, 0.6);
    wash(c, pen, circle(k.cx, k.neckY + 4.2, 1.8), k.accent, 0.6);
  },
  waistcoat: (c, pen, k) => {
    const t = torso(k.cx, k.neckY);
    wash(c, pen, t, k.shirt, 1.2);
    hatch(c, pen, t, { within: sideOf(k.cx + 16, k.cx + 22, k.neckY - 10, 140, true, 4), a: 0.3 });
    const vest = poly([k.cx - 21, k.neckY + 4, k.cx - 6, k.neckY + 4, k.cx, k.neckY + 20, k.cx + 6, k.neckY + 4, k.cx + 21, k.neckY + 4, k.cx + 24, 132, k.cx - 24, 132]);
    wash(c, pen, vest, k.cloth, 1);
    hatch(c, pen, vest, { within: sideOf(k.cx + 10, k.cx + 14, k.neckY, 140), a: 0.4 });
    for (let i = 0; i < 2; i++) wash(c, pen, circle(k.cx + 1.4, k.neckY + 26 + i * 7, 1.1), CLOTH.ochre, 0.5);
    for (const s of [-1, 1]) wash(c, pen, poly([k.cx, k.neckY + 2.4, k.cx + s * 4.8, k.neckY - 0.6, k.cx + s * 4.8, k.neckY + 4.4]), k.accent, 0.7);
    wash(c, pen, circle(k.cx, k.neckY + 2, 1.4), k.accent, 0.5);
  },
  jumper: (c, pen, k) => {
    body(c, pen, k);
    const neck = builder().moveTo(k.cx - 10, k.neckY - 2).quadTo(k.cx, k.neckY + 7, k.cx + 10, k.neckY - 2).close().build();
    wash(c, pen, neck, k.shirt, 0.8);
    for (const s of [-1, 1]) wash(c, pen, poly([k.cx, k.neckY + 3, k.cx + s * 8, k.neckY - 1.6, k.cx + s * 6.4, k.neckY + 6.4]), k.shirt, 0.7);
    c.drawPath(builder().moveTo(k.cx - 11, k.neckY - 1).quadTo(k.cx, k.neckY + 9, k.cx + 11, k.neckY - 1).build(), stroke(mix(k.cloth, pen.ink, 0.3), 2.4));
    for (let y = k.neckY + 20; y < 130; y += 6) c.drawPath(line(k.cx - 40, y, k.cx + 40, y), stroke(alpha(pen.ink, 0.16), 0.5));
  },
  scarf: (c, pen, k) => {
    body(c, pen, k);
    const band = builder().moveTo(k.cx - 11, k.neckY - 6).quadTo(k.cx, k.neckY + 2, k.cx + 11, k.neckY - 6).lineTo(k.cx + 12, k.neckY + 1).quadTo(k.cx, k.neckY + 9, k.cx - 12, k.neckY + 1).close().build();
    wash(c, pen, band, k.accent, 1);
    const tail = poly([k.cx - 6, k.neckY + 4, k.cx - 1, k.neckY + 5, k.cx - 2, k.neckY + 30, k.cx - 9, k.neckY + 29]);
    wash(c, pen, tail, k.accent, 0.9);
    for (const y of [k.neckY + 24, k.neckY + 27]) c.drawPath(line(k.cx - 8.6, y, k.cx - 2, y + 0.6), stroke(alpha(pen.ink, 0.5), 0.6));
  },
  pearls: (c, pen, k) => {
    body(c, pen, k);
    const neck = builder().moveTo(k.cx - 14, k.neckY - 2).quadTo(k.cx, k.neckY + 12, k.cx + 14, k.neckY - 2).close().build();
    c.drawPath(neck, fill(k.shirt));
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const x = k.cx - 10 + 20 * t;
      const y = k.neckY + 1 + Math.sin(t * Math.PI) * 6.4;
      wash(c, pen, circle(x, y, 1.15), '#F1EEE6', 0.4);
    }
  },
  coat: (c, pen, k) => {
    body(c, pen, k);
    // A raised overcoat collar either side of the neck.
    for (const s of [-1, 1]) {
      const p = poly([k.cx + s * 5, k.neckY + 4, k.cx + s * 9, k.neckY - 9, k.cx + s * 18, k.neckY - 1, k.cx + s * 12, k.neckY + 14]);
      wash(c, pen, p, mix(k.cloth, '#FFFFFF', 0.1), 0.9);
    }
    wash(c, pen, vOpening(k.cx, k.neckY + 2, 10, 5), k.accent, 0.8);
    for (let i = 0; i < 2; i++) wash(c, pen, circle(k.cx + 7, k.neckY + 22 + i * 9, 1.4), mix(k.cloth, pen.ink, 0.4), 0.5);
  },
} satisfies Record<string, GarmentDraw>;
export type GarmentId = keyof typeof GARMENTS;

export function clothHex(id: Cloth): string {
  return CLOTH[id];
}

/** The neck between head and garment (in the skin's washes; shaded under the chin). */
export function drawNeck(c: SkCanvas, pen: Pen, cx: number, chinY: number, neckY: number, skin: string, w = 6.6): void {
  const p = builder()
    .moveTo(cx - w, chinY - 8)
    .lineTo(cx - w - 0.6, neckY + 2)
    .quadTo(cx, neckY + 6, cx + w + 0.6, neckY + 2)
    .lineTo(cx + w, chinY - 8)
    .close()
    .build();
  wash(c, pen, p, skin, 1);
  hatch(c, pen, p, { within: blob([[cx - 20, chinY - 6], [cx + 20, chinY - 6], [cx + 20, chinY + 4], [cx - 20, chinY + 3]], 0.6), a: 0.5 });
  void oval;
}
