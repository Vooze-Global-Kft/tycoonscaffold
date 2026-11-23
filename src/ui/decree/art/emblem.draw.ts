/**
 * The Republic of Middling's emblem (decision D12): a pair of giant ribbon-cutting scissors over a
 * folded napkin (its founding law was written on one, 7.1) on a beige field. No stripes, stars,
 * eagles, seals, crowns, shields or buildings; no goose. Held against real flags, seals and
 * well-known marks: an upright oval cartouche with small scroll ends (never a shield, a seal ring or
 * a roundel with a legend; not a rounded square, which reads as an app tile), the scissors drawn
 * open with oval finger rings (no crossed-tools heraldry: they are open and point up) over the
 * ribbon they have just cut, the napkin a folded triangle with a tucked corner and no lines. Also the loading card ("The Republic of
 * Middling. Proudly Adequate.", the words the caller's) and the "signature" screenshot template's
 * pieces (7.9): the violet handwritten caption with a nib flourish on a translucent baize band.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { DESK, alpha, mix } from './palette';
import { drawLetters, lettersWidth } from './letters';
import { LINE, at, builder, circle, clip, dashed, dropShadow, fill, hatch, line, nibPath, oval, poly, rect, rrect, sampleCurve, shape, stroke, washed, type Box } from './pen';

/** The giant ribbon scissors, open, points up, centred, about 2·r tall. `blade`/`ring` colours. */
export function drawGiantScissors(c: SkCanvas, r = 40, o: { open?: number; ribbon?: boolean; chunky?: number } = {}): void {
  const k = r / 40;
  const open = o.open ?? 22;
  // `chunky` widens the blades and thickens the rings (the app icon: at least 3 px a blade at 60 px)
  const b = o.chunky ?? 1;
  at(c, 0, 0, k, 0, (q) => {
    const half = (deg: number, mirror: number) =>
      at(q, 0, 4, 1, deg, (z) => {
        // blade
        const blade = builder()
          .moveTo(0, 0)
          .lineTo(-1.4 * mirror * b, -6)
          .quadTo(-3.6 * mirror * b, -24, -1.2 * mirror * b, -40)
          .quadTo(0.6 * mirror, -42, 1.2 * mirror * b, -39)
          .quadTo(2.8 * mirror * b, -20, 2.6 * mirror * b, 0)
          .close()
          .build();
        washed(z, blade, mix(DESK.slatePale, DESK.white, 0.4), DESK.slateLight, 1.4 * mirror, 0, 1.4);
        z.drawPath(line(0.6 * mirror, -4, 0.2 * mirror, -36), stroke(alpha(DESK.white, 0.8), 1));
        // shank and ring (brass, a big oval loop)
        washed(z, rrect(-2.2, 0, 4.4, 10, 1.6), DESK.brass, DESK.brassDeep, 0.8, 0.8, 1.2);
        const ring = builder().addOval({ x: -9 + mirror * 3, y: 9, width: 18, height: 22 }).build();
        const t = 3.6 * b;
        const hole = builder().addOval({ x: -9 + t + mirror * 3, y: 9 + t, width: 18 - 2 * t, height: 22 - 2 * t }).build();
        const loop = builder().addPath(ring).addPath(hole).setFillType(1).build();
        washed(z, loop, DESK.brass, DESK.brassDeep, 1.4, 1.4, 1.4);
      });
    half(-open / 2, 1);
    half(open / 2, -1);
    // the pivot screw
    q.drawPath(circle(0, 4, 3.4), fill(DESK.brassLight));
    q.drawPath(circle(0, 4, 3.4), stroke(LINE, 1.2));
    q.drawPath(line(-2, 4, 2, 4), stroke(LINE, 1));
    if (o.ribbon) {
      // a short violet ribbon caught between the blades, its tails fluttering
      const rb = builder().moveTo(-34, -18).quadTo(-14, -24, 0, -20).quadTo(14, -16, 34, -22).lineTo(34, -14).quadTo(14, -8, 0, -12).quadTo(-14, -16, -34, -10).close().build();
      washed(q, rb, DESK.violet, DESK.violetDeep, 0, 1.6, 1.2);
      q.drawPath(poly([-34, -18, -42, -20, -38, -14, -42, -8, -34, -10]), fill(DESK.violetDeep));
      q.drawPath(poly([34, -22, 42, -24, 38, -18, 42, -12, 34, -14]), fill(DESK.violetDeep));
    }
  });
}

/**
 * The folded napkin: a square folded into a triangle (apex up), its lower right corner tucked under
 * (a small darker fold shows), soft shading along the fold; no ruled lines, no writing. Centred,
 * about 2·r wide.
 */
export function drawNapkin(c: SkCanvas, r = 40): void {
  const k = r / 40;
  at(c, 0, 0, k, 0, (q) => {
    // the triangle with its right corner tucked: the base stops short and turns up under the cloth
    const cloth = builder().moveTo(0, -26).lineTo(40, 20).lineTo(26, 22).lineTo(-40, 22).close().build();
    dropShadow(q, cloth, 1.2, 1.8, 0.25);
    washed(q, cloth, DESK.napkin, DESK.paperShade, 0, 2.4, 1.4);
    // the tucked corner: a small darker triangle where the cloth folds under
    q.drawPath(poly([26, 22, 40, 20, 30, 13]), fill(mix(DESK.paperShade, DESK.slateLight, 0.35)));
    q.drawPath(poly([26, 22, 40, 20, 30, 13]), stroke(alpha(LINE, 0.6), 0.9));
    // the top layer's edge (the fold is a square folded once: the top layer stops a little short)
    q.drawPath(builder().moveTo(-34, 16).lineTo(0, -20).lineTo(24, 6).build(), stroke(alpha(DESK.slateLight, 0.8), 1));
    q.drawPath(builder().moveTo(-6, 8).quadTo(2, 0, 4, -10).build(), stroke(alpha(DESK.white, 0.8), 1.4));
  });
}

/** A violet ribbon cut in two: its halves fall away left and right from a gap at x = 0, each with a cut end. Centred, about 2·r wide. */
export function drawCutRibbon(c: SkCanvas, r = 40): void {
  const k = r / 40;
  at(c, 0, 0, k, 0, (q) => {
    const half = (m: number) => {
      const p = builder()
        .moveTo(-40 * m, 2)
        .quadTo(-24 * m, -6, -5 * m, -2)
        .lineTo(-3 * m, 6)
        .quadTo(-24 * m, 2, -40 * m, 10)
        .close()
        .build();
      washed(q, p, DESK.violet, DESK.violetDeep, 0, 1.4, 1.2);
      // the swallow-tail at the outer end
      q.drawPath(poly([-40 * m, 2, -46 * m, 1, -42 * m, 6, -46 * m, 11, -40 * m, 10]), fill(DESK.violetDeep));
      // the fresh cut: a short slanted edge with a few loose threads
      q.drawPath(line(-5 * m, -2, -3 * m, 6), stroke(DESK.violetLight, 1));
      for (const t of [0.2, 0.55, 0.85]) q.drawPath(line(-5 * m + 2 * m * t, -2 + 8 * t, -1.6 * m + 2 * m * t, -1 + 8 * t), stroke(alpha(DESK.violetDeep, 0.8), 0.6));
    };
    at(q, -7, 2, 1, -26, () => half(1));
    at(q, 7, 2, 1, 26, () => half(-1));
  });
}

/**
 * The emblem: an upright oval cartouche of the beige field with a fine double border and four small
 * scroll ends (no shield, no seal ring, no legend, no stars); inside, the folded napkin low, the
 * giant scissors standing open over it, and the violet ribbon they have just cut falling away from
 * the blades. Centred; `r` the half width (40 = an 80 x 100 pt emblem).
 */
export function drawEmblem(c: SkCanvas, r = 40): void {
  const k = r / 40;
  at(c, 0, 0, k, 0, (q) => {
    // the scroll ends of the cartouche (behind the oval)
    for (const [x, y, deg] of [
      [0, -50, 0],
      [0, 50, 180],
      [-40, 0, 270],
      [40, 0, 90],
    ] as const)
      at(q, x, y, 1, deg, (z) => {
        const scroll = builder().moveTo(-9, 4).quadTo(-10, -4, -4, -5).quadTo(0, -2, 0, -6).quadTo(0, -2, 4, -5).quadTo(10, -4, 9, 4).close().build();
        washed(z, scroll, DESK.beige, DESK.beigeDeep, 0.8, 0.8, 1.1);
        z.drawPath(circle(-5.4, -0.6, 1.6), stroke(alpha(LINE, 0.7), 0.8));
        z.drawPath(circle(5.4, -0.6, 1.6), stroke(alpha(LINE, 0.7), 0.8));
      });
    const field = oval(0, 0, 38, 48);
    dropShadow(q, field, 1.6, 2.4, 0.3);
    washed(q, field, DESK.beige, DESK.beigeDeep, 1.6, 1.6, 1.6);
    q.drawPath(oval(0, 0, 33.5, 43.5), stroke(alpha(DESK.beigeDeep, 0.95), 1));
    q.save();
    clip(q, oval(0, 0, 33, 43));
    at(q, 0, 22, 0.62, 0, (z) => drawNapkin(z, 40));
    at(q, 0, -4, 0.78, 0, (z) => drawGiantScissors(z, 40, { open: 34 }));
    at(q, 0, -20, 0.7, 0, (z) => drawCutRibbon(z, 40));
    q.restore();
  });
}

// ---------------------------------------------------------------------------
// The loading card
// ---------------------------------------------------------------------------

/**
 * The loading card (3.1): a card of the pale paper on the baize, the emblem, the motto in violet
 * hand lettering (`title`, `motto`: the caller's words, e.g. "THE REPUBLIC OF MIDDLING" and "PROUDLY
 * ADEQUATE"), a violet rule, and a fine slate border. w x h from top left.
 */
export function drawLoadingCard(c: SkCanvas, w: number, h: number, title = '', motto = ''): void {
  dropShadow(c, rrect(0, 0, w, h, 6), 2, 3, 0.35);
  washed(c, rrect(0, 0, w, h, 6), DESK.paperLight, DESK.paperShade, 1.4, 1.4, 1);
  c.drawPath(rrect(8, 8, w - 16, h - 16, 4), stroke(alpha(DESK.slate, 0.6), 0.8));
  const e = Math.min(w * 0.22, h * 0.15);
  at(c, w / 2, h * 0.34, e / 40, 0, (q) => drawEmblem(q, 40));
  if (title) {
    const size = Math.min(16, (w - 40) / Math.max(1, lettersWidth(title, { size: 1, tracking: 0.12 })));
    drawLetters(c, title, w / 2 - lettersWidth(title, { size, tracking: 0.12 }) / 2, h * 0.68, { size, style: 'print', color: DESK.line, tracking: 0.12, weight: 0.12 });
  }
  c.drawPath(line(w * 0.28, h * 0.73, w * 0.72, h * 0.73), stroke(DESK.violet, 1.2));
  if (motto) {
    const size = Math.min(22, (w - 40) / Math.max(1, lettersWidth(motto, { size: 1, tracking: 0.1 })));
    drawLetters(c, motto, w / 2 - lettersWidth(motto, { size, tracking: 0.1 }) / 2 - size * 0.1, h * 0.84, { size, style: 'nib', color: DESK.violet, tracking: 0.1, seed: 4 });
  }
}

// ---------------------------------------------------------------------------
// The "signature" screenshot template (7.9)
// ---------------------------------------------------------------------------

/** The translucent baize band along the screenshot's bottom left (w x h from top left), with a fine brass rule at its top. */
export function drawCaptionBand(c: SkCanvas, w: number, h: number): void {
  c.drawPath(rect(0, 0, w, h), fill(alpha(DESK.baize, 0.84)));
  c.save();
  clip(c, rect(0, 0, w, h));
  hatch(c, rect(0, 0, w, h), alpha(DESK.baizeLift, 0.3), 3, 0.5, 45);
  c.restore();
  c.drawPath(line(0, 0.8, w, 0.8), stroke(alpha(DESK.brassLight, 0.8), 1.2));
}

/**
 * The handwritten violet caption with a pen-nib flourish: `lines` (one or two, the caller's words),
 * left-aligned at (x, y) = the first line's baseline-left, cap height `size`. On the baize band the
 * ink is the pale violet (DESK.violetPale) so it reads; on paper, pass DESK.violet. Returns the box drawn.
 */
export function drawCaption(c: SkCanvas, lines: string[], x: number, y: number, size: number, color: string = DESK.violetPale): Box {
  let w = 0;
  lines.forEach((t, i) => {
    w = Math.max(w, drawLetters(c, t, x, y + i * size * 1.45, { size, style: 'nib', color, seed: 11 + i, weight: 0.15 }));
  });
  // the flourish: a swash under the last line ending in a nib flick
  const by = y + (lines.length - 1) * size * 1.45 + size * 0.42;
  const pts = sampleCurve(
    [
      [x - size * 0.2, by + size * 0.1],
      [x + w * 0.35, by + size * 0.28],
      [x + w * 0.8, by],
      [x + w + size * 0.3, by - size * 0.55],
      [x + w + size * 0.1, by - size * 0.2],
      [x + w + size * 0.9, by - size * 0.9],
    ],
    1.2,
  );
  c.drawPath(nibPath(pts, size * 0.16, -38), fill(color));
  drawNibMark(c, x + w + size * 1.25, by - size * 1.2, size * 0.5, color);
  return { x, y: y - size, w: w + size * 1.6, h: lines.length * size * 1.45 + size * 0.5 };
}

/** A small pen nib (the flourish's end), pointing down-left, centred, `s` tall. */
export function drawNibMark(c: SkCanvas, x: number, y: number, s: number, color: string = DESK.violetPale): void {
  at(c, x, y, s / 12, 40, (q) => {
    const nib = builder().moveTo(0, 6).quadTo(3.6, 0, 3.4, -6).lineTo(-3.4, -6).quadTo(-3.6, 0, 0, 6).close().build();
    shape(q, nib, color, 0);
    q.drawPath(line(0, 4.6, 0, -2), stroke(alpha(DESK.baizeDeep, 0.8), 0.8));
    q.drawPath(circle(0, -2.4, 0.9), fill(alpha(DESK.baizeDeep, 0.8)));
    q.drawPath(rect(-3.6, -9, 7.2, 3), fill(color));
  });
}

void oval;
