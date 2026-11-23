/**
 * The head of every person (spec 1.2, 7.3): a long oval (about 1.4 times taller than wide), dot
 * eyes under heavy brows, and the feature parts. Every part here takes the geometry of the head
 * shape and the hair colour, and NONE of them takes the skin tone: the tone is only the colour of
 * the skin wash, chosen by the caller (`Wash`). That is the tone-independence rule in code.
 *
 * Coordinates: the bust's design box is 100 x 125 units; the head sits at x = 50 with its crown at
 * y = 28 (`HEAD_TOP`). The cut-outs draw the same head through a transform.
 */
import type { SkCanvas, SkPath } from '@shopify/react-native-skia';
import { HAIR, alpha, arc, blob, builder, circle, curve, fill, hatch, ink, intersect, line, mix, oval, poly, sideOf, stroke, wash, type HairColour, type Pen } from './ink';

export const HEAD_X = 50;
export const HEAD_TOP = 28;

/** The washes of one person: skin (two flat washes) and hair. Supplied by the caller; parts never pick them. */
export interface Wash {
  skin: string;
  skinDeep: string;
  hair: string;
}

export interface HeadGeo {
  cx: number;
  top: number;
  /** Height crown to chin, and half width at the cheekbones. */
  h: number;
  hw: number;
  chin: number;
  path: SkPath;
  browY: number;
  eyeY: number;
  eyeDx: number;
  noseY: number;
  mouthY: number;
  earY: number;
}

// ---------------------------------------------------------------------------
// Head shapes
// ---------------------------------------------------------------------------

interface HeadShape {
  /** Half width at the cheekbones, height (ratio h / (2 hw) stays 1.36 to 1.5). */
  hw: number;
  h: number;
  /** Width of the temples, the jaw and the chin as fractions of hw. */
  t: number;
  j: number;
  chin: number;
}

export const HEADS = {
  egg: { hw: 16.5, h: 47, t: 0.98, j: 0.72, chin: 0.34 },
  pear: { hw: 16.5, h: 46, t: 0.84, j: 0.98, chin: 0.56 },
  long: { hw: 15.2, h: 46, t: 0.94, j: 0.82, chin: 0.42 },
  square: { hw: 17, h: 47, t: 0.95, j: 0.94, chin: 0.62 },
  heart: { hw: 17, h: 47, t: 1.02, j: 0.66, chin: 0.2 },
  soft: { hw: 17.4, h: 48, t: 0.9, j: 0.84, chin: 0.48 },
} satisfies Record<string, HeadShape>;
export type HeadId = keyof typeof HEADS;

export function headGeo(id: HeadId, cx = HEAD_X, top = HEAD_TOP): HeadGeo {
  const s = HEADS[id];
  const { hw, h } = s;
  const L: [number, number][] = [
    [cx - hw * s.t * 0.62, top + h * 0.04],
    [cx - hw * s.t, top + h * 0.24],
    [cx - hw, top + h * 0.47],
    [cx - hw * s.j, top + h * 0.74],
    [cx - hw * s.chin, top + h * 0.95],
  ];
  const R = L.map(([x, y]) => [cx + (cx - x), y] as [number, number]).reverse();
  const path = blob([[cx, top], ...L, [cx, top + h], ...R], 1);
  return {
    cx,
    top,
    h,
    hw,
    chin: top + h,
    path,
    browY: top + h * 0.41,
    eyeY: top + h * 0.48,
    eyeDx: hw * 0.42,
    noseY: top + h * 0.63,
    mouthY: top + h * 0.79,
    earY: top + h * 0.52,
  };
}

/** The ears (drawn before the head, so the head's outline crosses their root). */
export function drawEars(c: SkCanvas, pen: Pen, g: HeadGeo, w: Wash): void {
  for (const s of [-1, 1]) {
    const x = g.cx + s * (g.hw - 0.6);
    const ear = oval(x + s * 1.6, g.earY, 3.2, 5.4);
    wash(c, pen, ear, w.skin, 0.9);
    c.drawPath(arc(x + s * 1.6, g.earY, 1.6, 3.2, s > 0 ? -80 : 100, 160), stroke(alpha(pen.ink, 0.7), 0.6));
  }
}

/** The face wash, its outline and its shadow side (hatching right of the cheek, under the hair). */
export function drawFace(c: SkCanvas, pen: Pen, g: HeadGeo, w: Wash): void {
  wash(c, pen, g.path, w.skin, 1.15);
  hatch(c, pen, g.path, { within: sideOf(g.cx + g.hw * 0.5, g.cx + g.hw * 0.28, g.top, g.chin + 2, true, 3), a: 0.42 });
}

// ---------------------------------------------------------------------------
// Eyes, brows, noses, mouths: ink parts (no tone)
// ---------------------------------------------------------------------------

type FeatureDraw = (c: SkCanvas, pen: Pen, g: HeadGeo, w: Wash) => void;

function dots(c: SkCanvas, pen: Pen, g: HeadGeo, dx: number, r: number): void {
  for (const s of [-1, 1]) c.drawPath(circle(g.cx + s * dx, g.eyeY, r), fill(pen.ink));
}

export const EYES = {
  dot: (c, pen, g) => dots(c, pen, g, g.eyeDx, 1.45),
  lidded: (c, pen, g) => {
    dots(c, pen, g, g.eyeDx, 1.35);
    for (const s of [-1, 1]) c.drawPath(arc(g.cx + s * g.eyeDx, g.eyeY + 0.4, 2.6, 2.2, 200, 140), stroke(pen.ink, 0.75 * pen.weight));
  },
  close: (c, pen, g) => dots(c, pen, g, g.eyeDx * 0.82, 1.4),
  crinkle: (c, pen, g) => {
    dots(c, pen, g, g.eyeDx, 1.4);
    for (const s of [-1, 1]) c.drawPath(arc(g.cx + s * g.eyeDx, g.eyeY + 0.6, 2.4, 1.6, 20, 140), stroke(alpha(pen.ink, 0.8), 0.55 * pen.weight));
  },
  wide: (c, pen, g) => dots(c, pen, g, g.eyeDx * 1.12, 1.5),
} satisfies Record<string, FeatureDraw>;
export type EyesId = keyof typeof EYES;

/** A heavy brow: a tapered filled stroke from inner (x0, y0) through a peak to the outer end. */
function brow(c: SkCanvas, color: string, pts: [number, number][], thick: number): void {
  // Thick at the inner end, tapering outward: a closed shape around the centre line.
  const top: [number, number][] = [];
  const bot: [number, number][] = [];
  pts.forEach(([x, y], i) => {
    const k = thick * (1 - (i / (pts.length - 1)) * 0.55);
    top.push([x, y - k / 2]);
    bot.push([x, y + k / 2]);
  });
  c.drawPath(blob([...top, ...bot.reverse()], 0.8), fill(color));
}

function brows(c: SkCanvas, pen: Pen, g: HeadGeo, w: Wash, inner: number, peak: number, outer: number, thick = 2.7, span = 1): void {
  const color = mix(w.hair, pen.ink, 0.5);
  for (const s of [-1, 1]) {
    const x0 = g.cx + s * g.eyeDx * 0.35;
    const x2 = g.cx + s * g.eyeDx * (1.55 * span);
    const x1 = (x0 + x2) / 2;
    brow(c, color, [[x0, g.browY + inner], [x1, g.browY + peak], [x2, g.browY + outer]], thick);
  }
}

export const BROWS = {
  level: (c, pen, g, w) => brows(c, pen, g, w, 0, -0.3, 0.3),
  arched: (c, pen, g, w) => brows(c, pen, g, w, 0.4, -1.4, 0.6, 2.4),
  bushy: (c, pen, g, w) => brows(c, pen, g, w, 0, -0.6, 0.2, 3.6, 1.05),
  worried: (c, pen, g, w) => brows(c, pen, g, w, -1.3, -0.3, 0.9, 2.5),
  stern: (c, pen, g, w) => brows(c, pen, g, w, 0.8, -0.2, -0.4, 2.9),
  quizzical: (c, pen, g, w) => {
    const color = mix(w.hair, pen.ink, 0.5);
    const l = g.cx - g.eyeDx;
    const r = g.cx + g.eyeDx;
    brow(c, color, [[g.cx - g.eyeDx * 0.35, g.browY], [l, g.browY - 0.3], [g.cx - g.eyeDx * 1.55, g.browY + 0.4]], 2.7);
    brow(c, color, [[g.cx + g.eyeDx * 0.35, g.browY - 0.6], [r, g.browY - 2.6], [g.cx + g.eyeDx * 1.55, g.browY - 1.2]], 2.7);
  },
} satisfies Record<string, FeatureDraw>;
export type BrowsId = keyof typeof BROWS;

export const NOSES = {
  button: (c, pen, g, w) => {
    const y = g.noseY;
    c.drawPath(oval(g.cx + 0.8, y, 2.4, 2), fill(w.skinDeep));
    ink(c, pen, arc(g.cx + 0.5, y, 2.6, 2.1, 20, 170), 0.85);
  },
  straight: (c, pen, g) => {
    ink(c, pen, curve([[g.cx + 0.6, g.eyeY + 1.5], [g.cx + 1.6, g.noseY - 1], [g.cx + 2.6, g.noseY + 1.2], [g.cx - 0.6, g.noseY + 1.6]]), 0.85);
  },
  long: (c, pen, g) => {
    ink(c, pen, curve([[g.cx + 0.4, g.eyeY + 0.5], [g.cx + 1.6, g.noseY], [g.cx + 3.2, g.noseY + 2.8], [g.cx + 0.6, g.noseY + 3.3], [g.cx - 1.2, g.noseY + 2.4]]), 0.85);
  },
  bulb: (c, pen, g, w) => {
    const y = g.noseY + 0.6;
    c.drawPath(circle(g.cx + 0.6, y, 3.4), fill(w.skinDeep));
    ink(c, pen, curve([[g.cx + 0.4, g.eyeY + 2], [g.cx + 1.2, y - 3]]), 0.8);
    ink(c, pen, arc(g.cx + 0.6, y, 3.4, 3.2, -40, 260), 0.85);
  },
  pointed: (c, pen, g) => {
    ink(c, pen, poly([g.cx + 0.3, g.eyeY + 1.5, g.cx + 3.6, g.noseY + 1.6, g.cx - 0.2, g.noseY + 2.2], false), 0.85);
  },
  snub: (c, pen, g, w) => {
    const y = g.noseY - 0.4;
    c.drawPath(oval(g.cx + 0.4, y + 0.6, 2.8, 1.6), fill(w.skinDeep));
    ink(c, pen, curve([[g.cx - 2.4, y + 1.6], [g.cx + 0.2, y + 2.4], [g.cx + 2.8, y + 0.8], [g.cx + 1.6, y - 2]]), 0.85);
  },
} satisfies Record<string, FeatureDraw>;
export type NoseId = keyof typeof NOSES;

export const MOUTHS = {
  smile: (c, pen, g) => ink(c, pen, arc(g.cx, g.mouthY - 2.2, 4.6, 2.6, 25, 130), 0.95),
  flat: (c, pen, g) => ink(c, pen, curve([[g.cx - 4, g.mouthY], [g.cx, g.mouthY + 0.4], [g.cx + 4, g.mouthY - 0.2]]), 0.95),
  smirk: (c, pen, g) => ink(c, pen, curve([[g.cx - 3.8, g.mouthY + 0.4], [g.cx + 1, g.mouthY + 0.6], [g.cx + 4.4, g.mouthY - 1.4]]), 0.95),
  o: (c, pen, g, w) => {
    const p = oval(g.cx, g.mouthY, 1.8, 2.2);
    c.drawPath(p, fill(mix(w.skinDeep, pen.ink, 0.5)));
    ink(c, pen, p, 0.75);
  },
  grin: (c, pen, g, w) => {
    const p = builder().moveTo(g.cx - 5, g.mouthY - 1).quadTo(g.cx, g.mouthY + 5, g.cx + 5, g.mouthY - 1).close().build();
    c.drawPath(p, fill('#F4F1EA'));
    c.drawPath(line(g.cx - 4.6, g.mouthY - 0.2, g.cx + 4.6, g.mouthY - 0.2), stroke(alpha(w.skinDeep, 0.9), 0.5));
    ink(c, pen, p, 0.9);
  },
  pursed: (c, pen, g, w) => {
    c.drawPath(oval(g.cx, g.mouthY, 2.6, 1.2), fill(w.skinDeep));
    ink(c, pen, curve([[g.cx - 2.6, g.mouthY], [g.cx, g.mouthY - 0.8], [g.cx + 2.6, g.mouthY]]), 0.8);
  },
} satisfies Record<string, FeatureDraw>;
export type MouthId = keyof typeof MOUTHS;

/** Moustaches and beards, in the hair colour. */
export const FACIAL = {
  none: () => undefined,
  brush: (c, pen, g, w) => {
    const y = g.mouthY - 3.4;
    const p = blob([[g.cx - 5.6, y + 1.6], [g.cx - 3, y - 1.2], [g.cx, y - 0.6], [g.cx + 3, y - 1.2], [g.cx + 5.6, y + 1.6], [g.cx, y + 1.8]], 0.9);
    wash(c, pen, p, w.hair, 0.7);
  },
  curl: (c, pen, g, w) => {
    const y = g.mouthY - 3;
    for (const s of [-1, 1]) {
      const p = blob([[g.cx, y - 0.8], [g.cx + s * 4, y - 1.2], [g.cx + s * 7.4, y - 0.4], [g.cx + s * 8.6, y - 3], [g.cx + s * 8.8, y], [g.cx + s * 5, y + 1.8], [g.cx, y + 1.2]], 0.8);
      wash(c, pen, p, w.hair, 0.6);
    }
  },
  beard: (c, pen, g, w) => {
    const top = g.top + g.h * 0.6;
    const region = intersect(g.path, builder().addRect({ x: g.cx - 40, y: top, width: 80, height: 60 }).build());
    const fuller = blob([[g.cx - g.hw * 0.96, top], [g.cx - g.hw * 0.86, g.top + g.h * 0.86], [g.cx, g.chin + 4.5], [g.cx + g.hw * 0.86, g.top + g.h * 0.86], [g.cx + g.hw * 0.96, top], [g.cx + g.hw * 0.5, top + 4], [g.cx, top + 5], [g.cx - g.hw * 0.5, top + 4]], 1);
    void region;
    wash(c, pen, fuller, w.hair, 0.8);
    hatch(c, pen, fuller, { within: sideOf(g.cx + 3, g.cx + 2, top, g.chin + 6), a: 0.45 });
    // The mouth shows through.
    c.drawPath(oval(g.cx, g.mouthY, 4.4, 1.9), fill(w.skin));
  },
  goatee: (c, pen, g, w) => {
    const p = blob([[g.cx - 3.2, g.mouthY + 2.4], [g.cx + 3.2, g.mouthY + 2.4], [g.cx + 2, g.chin + 2.4], [g.cx - 2, g.chin + 2.4]], 0.9);
    wash(c, pen, p, w.hair, 0.7);
    FACIAL.brush(c, pen, g, w);
  },
  sideburns: (c, pen, g, w) => {
    for (const s of [-1, 1]) {
      const x = g.cx + s * g.hw;
      const p = poly([x, g.top + g.h * 0.36, x - s * 3.2, g.top + g.h * 0.36, x - s * 3.4, g.top + g.h * 0.66, x - s * 0.6, g.top + g.h * 0.7]);
      const r = intersect(p, g.path);
      c.drawPath(r, fill(w.hair));
    }
  },
} satisfies Record<string, FeatureDraw>;
export type FacialId = keyof typeof FACIAL;

export const GLASSES = {
  none: () => undefined,
  round: (c, pen, g) => {
    for (const s of [-1, 1]) {
      const p = circle(g.cx + s * g.eyeDx, g.eyeY, 4.3);
      c.drawPath(p, fill(alpha('#FFFFFF', 0.25)));
      ink(c, pen, p, 0.8);
    }
    ink(c, pen, arc(g.cx, g.eyeY + 0.6, g.eyeDx - 4.3, 1.6, 200, 140), 0.7);
  },
  half: (c, pen, g) => {
    for (const s of [-1, 1]) {
      const x = g.cx + s * g.eyeDx;
      const p = builder().moveTo(x - 4.4, g.eyeY + 1.2).lineTo(x + 4.4, g.eyeY + 1.2).quadTo(x + 4.2, g.eyeY + 5, x, g.eyeY + 5).quadTo(x - 4.2, g.eyeY + 5, x - 4.4, g.eyeY + 1.2).close().build();
      c.drawPath(p, fill(alpha('#FFFFFF', 0.25)));
      ink(c, pen, p, 0.8);
    }
    ink(c, pen, line(g.cx - g.eyeDx + 4.4, g.eyeY + 1.6, g.cx + g.eyeDx - 4.4, g.eyeY + 1.6), 0.7);
  },
  square: (c, pen, g) => {
    for (const s of [-1, 1]) {
      const x = g.cx + s * g.eyeDx;
      const p = builder().addRRect({ rect: { x: x - 4.8, y: g.eyeY - 3.4, width: 9.6, height: 7 }, rx: 1.4, ry: 1.4 }).build();
      c.drawPath(p, fill(alpha('#FFFFFF', 0.22)));
      ink(c, pen, p, 1.05);
    }
    ink(c, pen, line(g.cx - g.eyeDx + 4.8, g.eyeY - 1, g.cx + g.eyeDx - 4.8, g.eyeY - 1), 0.9);
  },
  cat: (c, pen, g) => {
    for (const s of [-1, 1]) {
      const x = g.cx + s * g.eyeDx;
      const p = blob([[x - s * 4.2, g.eyeY - 1.6], [x + s * 1, g.eyeY - 3], [x + s * 5.6, g.eyeY - 4.2], [x + s * 4, g.eyeY + 2.4], [x - s * 0.6, g.eyeY + 3.6], [x - s * 4.2, g.eyeY + 1.8]], 0.7);
      c.drawPath(p, fill(alpha('#FFFFFF', 0.22)));
      ink(c, pen, p, 1.0);
    }
    ink(c, pen, line(g.cx - g.eyeDx + 4.2, g.eyeY - 1, g.cx + g.eyeDx - 4.2, g.eyeY - 1), 0.8);
  },
} satisfies Record<string, FeatureDraw>;
export type GlassesId = keyof typeof GLASSES;

/** Small extras on the face: none of them a mark of any group. */
export const EXTRAS = {
  none: () => undefined,
  freckles: (c, pen, g) => {
    const p = fill(alpha(pen.ink, 0.45));
    for (const [dx, dy] of [[-8, 4.2], [-6, 5.4], [-9.4, 6], [8, 4.2], [6.2, 5.6], [9.2, 6.2]]) c.drawPath(circle(g.cx + dx, g.eyeY + dy, 0.45), p);
  },
  earrings: (c, pen, g) => {
    for (const s of [-1, 1]) {
      const p = circle(g.cx + s * (g.hw + 1.4), g.earY + 6.4, 1.3);
      c.drawPath(p, fill('#EDE9E0'));
      ink(c, pen, p, 0.5);
    }
  },
  pencil: (c, pen, g) => {
    // A pencil behind the right ear.
    const x = g.cx + g.hw + 1;
    const p = poly([x - 3, g.earY - 7, x + 5, g.earY - 3, x + 4.2, g.earY - 1.8, x - 3.8, g.earY - 5.8]);
    c.drawPath(p, fill('#D9B95A'));
    ink(c, pen, p, 0.6);
  },
  cheeks: (c, pen, g, w) => {
    for (const s of [-1, 1]) c.drawPath(oval(g.cx + s * g.eyeDx * 1.2, g.eyeY + 7.5, 3.4, 2), fill(alpha(w.skinDeep, 0.9)));
  },
} satisfies Record<string, FeatureDraw>;
export type ExtraId = keyof typeof EXTRAS;

// ---------------------------------------------------------------------------
// Hair (back layer behind the head, front layer over it)
// ---------------------------------------------------------------------------

interface HairDef {
  back?: (g: HeadGeo) => SkPath;
  front?: (g: HeadGeo) => SkPath;
  /** A few ink strands over the front (texture lines, the same direction for every style). */
  strands?: (g: HeadGeo) => [number, number][][];
}

const cap = (g: HeadGeo, hairline: number, lift: number, sideDrop: number, widen = 1.6): SkPath => {
  const { cx, top, hw, h } = g;
  return blob(
    [
      [cx, top - lift],
      [cx - hw * 0.7, top - lift * 0.6 + 1],
      [cx - hw - widen, top + h * 0.2],
      [cx - hw - widen * 0.6, top + h * sideDrop],
      [cx - hw + 2.4, top + h * sideDrop],
      [cx - hw * 0.6, top + h * hairline],
      [cx, top + h * hairline - 1],
      [cx + hw * 0.6, top + h * hairline],
      [cx + hw - 2.4, top + h * sideDrop],
      [cx + hw + widen * 0.6, top + h * sideDrop],
      [cx + hw + widen, top + h * 0.2],
      [cx + hw * 0.7, top - lift * 0.6 + 1],
    ],
    0.9,
  );
};

export const HAIRS = {
  bald: {
    front: (g) => {
      // A clean pate with a gentle shine line only (drawn as strands).
      return builder().build();
    },
    strands: (g) => [[[g.cx - g.hw * 0.5, g.top + 6], [g.cx - g.hw * 0.2, g.top + 3.2]]],
  },
  fringe: {
    // Bald on top, a soft fringe of hair above the ears and round the back.
    front: (g) => {
      const { cx, top, hw, h } = g;
      const side = (s: number) =>
        blob([[cx + s * (hw + 1.8), top + h * 0.22], [cx + s * (hw + 3.2), top + h * 0.38], [cx + s * (hw + 1.4), top + h * 0.5], [cx + s * (hw - 2.2), top + h * 0.44], [cx + s * (hw - 2.4), top + h * 0.28]], 0.9);
      return builder().addPath(side(-1)).addPath(side(1)).build();
    },
  },
  part: {
    front: (g) => {
      const { cx, top, hw, h } = g;
      return blob(
        [
          [cx - 5, top - 3],
          [cx - hw * 0.9, top + 1],
          [cx - hw - 2, top + h * 0.22],
          [cx - hw - 1.4, top + h * 0.4],
          [cx - hw + 2.2, top + h * 0.38],
          [cx - hw * 0.5, top + h * 0.16],
          [cx - 4, top + h * 0.1],
          [cx + hw * 0.5, top + h * 0.26],
          [cx + hw - 2, top + h * 0.36],
          [cx + hw + 1.6, top + h * 0.36],
          [cx + hw + 1.6, top + h * 0.14],
          [cx + hw * 0.6, top - 2.6],
        ],
        0.9,
      );
    },
    strands: (g) => [
      [[g.cx - 4, g.top - 1], [g.cx + g.hw * 0.4, g.top + 2], [g.cx + g.hw * 0.9, g.top + 7]],
      [[g.cx - 4, g.top + 2], [g.cx - g.hw * 0.6, g.top + 4.5]],
    ],
  },
  crop: {
    front: (g) => cap(g, 0.17, 2.6, 0.36, 1.2),
    strands: (g) => [[[g.cx - g.hw * 0.6, g.top + 1.5], [g.cx + g.hw * 0.4, g.top + 1]]],
  },
  quiff: {
    front: (g) => {
      const { cx, top, hw, h } = g;
      return blob(
        [
          [cx - 2, top - 12],
          [cx - hw * 0.75, top - 6],
          [cx - hw - 1.6, top + h * 0.18],
          [cx - hw - 1, top + h * 0.38],
          [cx - hw + 2.2, top + h * 0.36],
          [cx - hw * 0.5, top + h * 0.15],
          [cx + hw * 0.5, top + h * 0.15],
          [cx + hw - 2, top + h * 0.36],
          [cx + hw + 1.4, top + h * 0.36],
          [cx + hw + 1.6, top + h * 0.1],
          [cx + hw * 0.7, top - 6],
          [cx + 6, top - 12.5],
        ],
        0.9,
      );
    },
    strands: (g) => [
      [[g.cx - g.hw * 0.5, g.top + 2], [g.cx - 1, g.top - 8], [g.cx + 6, g.top - 11]],
      [[g.cx + 1, g.top + 2], [g.cx + 4, g.top - 6]],
    ],
  },
  bob: {
    back: (g) => {
      const { cx, top, hw, h } = g;
      return blob([[cx, top - 4], [cx - hw - 4, top + h * 0.2], [cx - hw - 5, top + h * 0.6], [cx - hw - 2, top + h * 0.8], [cx + hw + 2, top + h * 0.8], [cx + hw + 5, top + h * 0.6], [cx + hw + 4, top + h * 0.2]], 0.9);
    },
    front: (g) => {
      const { cx, top, hw, h } = g;
      return blob([[cx, top - 4], [cx - hw - 3.6, top + h * 0.2], [cx - hw - 1, top + h * 0.3], [cx - hw * 0.5, top + h * 0.26], [cx + hw * 0.5, top + h * 0.26], [cx + hw + 1, top + h * 0.3], [cx + hw + 3.6, top + h * 0.2]], 0.9);
    },
    strands: (g) => [[[g.cx + g.hw + 2, g.top + g.h * 0.4], [g.cx + g.hw + 3, g.top + g.h * 0.7]]],
  },
  bun: {
    back: (g) => circle(g.cx, g.top - 6.5, 7.4),
    front: (g) => cap(g, 0.13, 1.6, 0.34, 1),
    strands: (g) => [
      [[g.cx - g.hw * 0.6, g.top + 5], [g.cx - 2, g.top - 1]],
      [[g.cx + g.hw * 0.6, g.top + 5], [g.cx + 2, g.top - 1]],
    ],
  },
  long: {
    back: (g) => {
      const { cx, top, hw, h } = g;
      return blob([[cx, top - 4], [cx - hw - 4, top + h * 0.2], [cx - hw - 6, top + h * 0.8], [cx - hw - 7, top + h * 1.22], [cx + hw + 7, top + h * 1.22], [cx + hw + 6, top + h * 0.8], [cx + hw + 4, top + h * 0.2]], 0.9);
    },
    front: (g) => {
      const { cx, top, hw, h } = g;
      return blob([[cx + 1, top - 4], [cx - hw - 3, top + h * 0.18], [cx - hw - 1.4, top + h * 0.46], [cx - hw + 1.6, top + h * 0.3], [cx - 1, top + h * 0.1], [cx + hw - 1.6, top + h * 0.3], [cx + hw + 1.4, top + h * 0.46], [cx + hw + 3, top + h * 0.18]], 0.9);
    },
    strands: (g) => [
      [[g.cx + g.hw + 3, g.top + g.h * 0.5], [g.cx + g.hw + 5, g.top + g.h * 1.1]],
      [[g.cx - g.hw - 3, g.top + g.h * 0.55], [g.cx - g.hw - 5, g.top + g.h * 1.1]],
    ],
  },
  swept: {
    back: (g) => {
      const { cx, top, hw, h } = g;
      return blob([[cx + 2, top - 5], [cx - hw - 1, top + h * 0.1], [cx - hw - 2.6, top + h * 0.42], [cx + hw + 2.6, top + h * 0.42], [cx + hw + 3, top + h * 0.08]], 0.9);
    },
    front: (g) => cap(g, 0.08, 4.4, 0.3, 2),
    strands: (g) => [
      [[g.cx - g.hw * 0.7, g.top + 2.5], [g.cx, g.top - 3], [g.cx + g.hw * 0.8, g.top + 1]],
      [[g.cx - g.hw * 0.4, g.top + 4.5], [g.cx + g.hw * 0.4, g.top]],
    ],
  },
  cloud: {
    // A full round cloud of curls, wider than the head.
    back: (g) => {
      const { cx, top, hw, h } = g;
      const b = builder();
      const n = 14;
      for (let i = 0; i < n; i++) {
        const a = Math.PI * (0.9 + (1.2 * i) / (n - 1));
        b.addCircle(cx + Math.cos(a) * (hw + 6), top + h * 0.32 + Math.sin(a) * (h * 0.36 + 1), 5.2);
      }
      b.addOval({ x: cx - hw - 7, y: top - 9, width: (hw + 7) * 2, height: h * 0.8 });
      return b.build();
    },
    front: (g) => {
      const { cx, top, hw, h } = g;
      const b = builder();
      for (let i = 0; i < 7; i++) b.addCircle(cx - hw * 0.9 + (i * hw * 1.8) / 6, top + h * 0.1 + (i % 2) * 1.6, 4.2);
      b.addOval({ x: cx - hw - 2, y: top - 6, width: (hw + 2) * 2, height: h * 0.24 });
      return b.build();
    },
  },
  curly: {
    // Short curls, close to the head.
    front: (g) => {
      const { cx, top, hw, h } = g;
      const b = builder();
      const n = 11;
      for (let i = 0; i < n; i++) {
        const a = Math.PI * (1.05 + (0.9 * i) / (n - 1));
        b.addCircle(cx + Math.cos(a) * (hw + 0.4), top + h * 0.24 + Math.sin(a) * (h * 0.27), 3.6);
      }
      b.addOval({ x: cx - hw + 1, y: top - 2, width: (hw - 1) * 2, height: h * 0.22 });
      return b.build();
    },
  },
  waves: {
    back: (g) => {
      const { cx, top, hw, h } = g;
      return blob([[cx, top - 5], [cx - hw - 5, top + h * 0.18], [cx - hw - 7, top + h * 0.5], [cx - hw - 4, top + h * 0.72], [cx - hw - 8, top + h * 0.95], [cx + hw + 8, top + h * 0.95], [cx + hw + 4, top + h * 0.72], [cx + hw + 7, top + h * 0.5], [cx + hw + 5, top + h * 0.18]], 1);
    },
    front: (g) => {
      const { cx, top, hw, h } = g;
      return blob([[cx - 4, top - 4.6], [cx - hw - 4, top + h * 0.16], [cx - hw - 1, top + h * 0.38], [cx - hw * 0.4, top + h * 0.16], [cx + hw * 0.1, top + h * 0.12], [cx + hw + 0.4, top + h * 0.34], [cx + hw + 3.8, top + h * 0.16], [cx + hw * 0.5, top - 3.4]], 0.9);
    },
    strands: (g) => [
      [[g.cx - g.hw - 5, g.top + g.h * 0.55], [g.cx - g.hw - 3, g.top + g.h * 0.7], [g.cx - g.hw - 6, g.top + g.h * 0.85]],
      [[g.cx + g.hw + 5, g.top + g.h * 0.55], [g.cx + g.hw + 3, g.top + g.h * 0.7], [g.cx + g.hw + 6, g.top + g.h * 0.85]],
    ],
  },
  beehive: {
    back: (g) => oval(g.cx, g.top - 6, g.hw + 3.4, 15),
    front: (g) => {
      const { cx, top, hw, h } = g;
      return blob([[cx - 2, top - 18], [cx - hw - 3.6, top - 3], [cx - hw - 2, top + h * 0.3], [cx - hw + 1.6, top + h * 0.28], [cx - hw * 0.2, top + h * 0.12], [cx + hw - 1.6, top + h * 0.28], [cx + hw + 2, top + h * 0.3], [cx + hw + 3.6, top - 3]], 0.9);
    },
    strands: (g) => [
      [[g.cx - g.hw * 0.7, g.top + 4], [g.cx - 2, g.top - 10], [g.cx + g.hw * 0.6, g.top - 14]],
      [[g.cx - g.hw * 0.2, g.top + 6], [g.cx + 4, g.top - 4]],
    ],
  },
  ponytail: {
    back: (g) => {
      const { cx, top, hw, h } = g;
      return blob([[cx + hw - 2, top + h * 0.06], [cx + hw + 7, top + h * 0.12], [cx + hw + 9, top + h * 0.5], [cx + hw + 5, top + h * 0.82], [cx + hw + 2, top + h * 0.5], [cx + hw, top + h * 0.2]], 0.9);
    },
    front: (g) => cap(g, 0.15, 2.4, 0.3, 1.4),
    strands: (g) => [[[g.cx + g.hw + 4, g.top + g.h * 0.2], [g.cx + g.hw + 6, g.top + g.h * 0.6]]],
  },
  pixie: {
    front: (g) => {
      const { cx, top, hw, h } = g;
      return blob([[cx, top - 3.4], [cx - hw - 2, top + h * 0.14], [cx - hw - 1, top + h * 0.42], [cx - hw + 2, top + h * 0.38], [cx - hw * 0.4, top + h * 0.26], [cx + hw * 0.6, top + h * 0.12], [cx + hw + 1.2, top + h * 0.32], [cx + hw + 2.4, top + h * 0.12]], 0.9);
    },
    strands: (g) => [[[g.cx - g.hw * 0.7, g.top + g.h * 0.22], [g.cx + g.hw * 0.2, g.top + 3], [g.cx + g.hw * 0.8, g.top + 2]]],
  },
  wisps: {
    // Thin hair combed across a high crown, full at the sides.
    front: (g) => {
      const { cx, top, hw, h } = g;
      const left = blob([[cx - hw - 2.4, top + h * 0.2], [cx - hw - 2.6, top + h * 0.46], [cx - hw + 2, top + h * 0.4], [cx - hw + 2.4, top + h * 0.2]], 0.9);
      const right = blob([[cx + hw + 2.4, top + h * 0.2], [cx + hw + 2.6, top + h * 0.46], [cx + hw - 2, top + h * 0.4], [cx + hw - 2.4, top + h * 0.2]], 0.9);
      return builder().addPath(left).addPath(right).build();
    },
    strands: (g) => [
      [[g.cx - g.hw - 1, g.top + g.h * 0.2], [g.cx - 3, g.top - 0.6], [g.cx + g.hw * 0.8, g.top + 3]],
      [[g.cx - g.hw + 1, g.top + g.h * 0.24], [g.cx, g.top + 1.6], [g.cx + g.hw, g.top + g.h * 0.16]],
    ],
  },
} satisfies Record<string, HairDef>;
export type HairId = keyof typeof HAIRS;

export function drawHairBack(c: SkCanvas, pen: Pen, g: HeadGeo, id: HairId, w: Wash): void {
  const d = HAIRS[id] as HairDef;
  if (!d.back) return;
  const p = d.back(g);
  wash(c, pen, p, w.hair, 1);
  hatch(c, pen, p, { within: sideOf(g.cx + 2, g.cx + 4, g.top - 30, g.top + 90), a: 0.4 });
}

export function drawHairFront(c: SkCanvas, pen: Pen, g: HeadGeo, id: HairId, w: Wash): void {
  const d = HAIRS[id] as HairDef;
  if (d.front) {
    const p = d.front(g);
    if (!p.isEmpty()) {
      wash(c, pen, p, w.hair, 1);
      hatch(c, pen, p, { within: sideOf(g.cx + 3, g.cx + 5, g.top - 30, g.top + 90), a: 0.4 });
    }
  }
  for (const s of d.strands?.(g) ?? []) {
    const onBald = id === 'bald';
    c.drawPath(curve(s), stroke(alpha(onBald ? '#FFFFFF' : pen.ink, onBald ? 0.55 : 0.55), onBald ? 1.2 : 0.6 * pen.weight));
  }
}

/** Hair colour with the Office wall's ageing: 0 as drawn, 1 a little grey, 2 greyer (never white-out). */
export function agedHair(colour: HairColour, age: number): string {
  const t = [0, 0.38, 0.68][Math.max(0, Math.min(2, age))];
  return mix(HAIR[colour], colour === 'white' ? HAIR.white : HAIR.grey, t);
}

/** Gentle lines of age (Office wall): a crinkle at each eye, then a soft line at the brow. Never unkind. */
export function drawAge(c: SkCanvas, pen: Pen, g: HeadGeo, age: number): void {
  if (age < 1) return;
  const p = stroke(alpha(pen.ink, 0.5), 0.5);
  for (const s of [-1, 1]) {
    const x = g.cx + s * (g.eyeDx + 3.6);
    c.drawPath(line(x, g.eyeY - 0.4, x + s * 1.8, g.eyeY - 1.2), p);
    c.drawPath(line(x, g.eyeY + 0.8, x + s * 1.8, g.eyeY + 1.6), p);
  }
  if (age >= 2) {
    c.drawPath(curve([[g.cx - 5, g.browY - 5], [g.cx, g.browY - 5.6], [g.cx + 5, g.browY - 5]]), p);
    for (const s of [-1, 1]) c.drawPath(curve([[g.cx + s * 4.2, g.noseY + 1.5], [g.cx + s * 5.4, g.mouthY - 1]]), p);
  }
}

/** The whole face in order, given the geometry: ears, face, extras, eyes, brows, nose, facial hair, mouth, glasses. */
export interface FaceParts {
  eyes: EyesId;
  brows: BrowsId;
  nose: NoseId;
  mouth: MouthId;
  facial: FacialId;
  glasses: GlassesId;
  extra: ExtraId;
}

export function drawFeatures(c: SkCanvas, pen: Pen, g: HeadGeo, f: FaceParts, w: Wash, age = 0): void {
  if (f.extra !== 'earrings' && f.extra !== 'pencil') EXTRAS[f.extra](c, pen, g, w);
  EYES[f.eyes](c, pen, g, w);
  BROWS[f.brows](c, pen, g, w);
  drawAge(c, pen, g, age);
  NOSES[f.nose](c, pen, g, w);
  FACIAL[f.facial](c, pen, g, w);
  MOUTHS[f.mouth](c, pen, g, w);
  GLASSES[f.glasses](c, pen, g, w);
}

/** Extras that sit outside the face (earrings, a pencil behind the ear): drawn after the hair. */
export function drawOuterExtras(c: SkCanvas, pen: Pen, g: HeadGeo, f: FaceParts, w: Wash): void {
  if (f.extra === 'earrings' || f.extra === 'pencil') EXTRAS[f.extra](c, pen, g, w);
}
