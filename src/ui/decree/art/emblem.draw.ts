/**
 * The Republic of Middling's emblem (decision D12): a pair of giant ribbon-cutting scissors over a
 * folded napkin (its founding law was written on one, 7.1) on a beige field. No stripes, stars,
 * eagles, seals, crowns, shields or buildings; no goose. Held against real flags, seals and
 * well-known marks: a plain rounded-square field (never a shield or a roundel with a legend), the
 * scissors drawn open with oval finger rings (no crossed-tools heraldry: they are open and point
 * up), the napkin a folded triangle with a stitched hem. Also the loading card ("The Republic of
 * Middling. Proudly Adequate.", the words the caller's) and the "signature" screenshot template's
 * pieces (7.9): the violet handwritten caption with a nib flourish on a translucent baize band.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { DESK, alpha, mix } from './palette';
import { drawLetters, lettersWidth } from './letters';
import { LINE, at, builder, circle, clip, dashed, dropShadow, fill, hatch, line, nibPath, oval, poly, rect, rrect, sampleCurve, shape, stroke, washed, type Box } from './pen';

/** The giant ribbon scissors, open, points up, centred, about 2·r tall. `blade`/`ring` colours. */
export function drawGiantScissors(c: SkCanvas, r = 40, o: { open?: number; ribbon?: boolean } = {}): void {
  const k = r / 40;
  const open = o.open ?? 22;
  at(c, 0, 0, k, 0, (q) => {
    const half = (deg: number, mirror: number) =>
      at(q, 0, 4, 1, deg, (z) => {
        // blade
        const blade = builder()
          .moveTo(0, 0)
          .lineTo(-1.4 * mirror, -6)
          .quadTo(-3.6 * mirror, -24, -1.2 * mirror, -40)
          .quadTo(0.6 * mirror, -42, 1.2 * mirror, -39)
          .quadTo(2.8 * mirror, -20, 2.6 * mirror, 0)
          .close()
          .build();
        washed(z, blade, mix(DESK.slatePale, DESK.white, 0.4), DESK.slateLight, 1.4 * mirror, 0, 1.4);
        z.drawPath(line(0.6 * mirror, -4, 0.2 * mirror, -36), stroke(alpha(DESK.white, 0.8), 1));
        // shank and ring (brass, a big oval loop)
        washed(z, rrect(-2.2, 0, 4.4, 10, 1.6), DESK.brass, DESK.brassDeep, 0.8, 0.8, 1.2);
        const ring = builder().addOval({ x: -9 + mirror * 3, y: 9, width: 18, height: 22 }).build();
        const hole = builder().addOval({ x: -5.4 + mirror * 3, y: 13, width: 10.8, height: 14 }).build();
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

/** The folded napkin (a triangle fold with a stitched hem), centred, about 2·r wide. */
export function drawNapkin(c: SkCanvas, r = 40): void {
  const k = r / 40;
  at(c, 0, 0, k, 0, (q) => {
    const back = poly([-40, -6, 40, -6, 0, 30]);
    washed(q, back, DESK.napkin, DESK.paperShade, 0, 2, 1.4);
    const fold = poly([-40, -6, 40, -6, 0, 8]);
    washed(q, fold, DESK.white, DESK.paperShade, 0, -1.6, 1.2);
    q.drawPath(poly([-33, -2, 33, -2, 0, 24], true), dashed(DESK.slateLight, 0.9, 2.2, 1.8));
    // a few lines of the founding law, in violet, on the napkin
    for (let i = 0; i < 3; i++) q.drawPath(line(-14 + i * 4, 12 + i * 4, 14 - i * 4, 12 + i * 4), stroke(alpha(DESK.violet, 0.7), 1.1));
  });
}

/** The emblem: beige rounded field, napkin, scissors over it. Centred, `r` the half side (40 = an 80 pt emblem). */
export function drawEmblem(c: SkCanvas, r = 40): void {
  const k = r / 40;
  at(c, 0, 0, k, 0, (q) => {
    const field = rrect(-40, -40, 80, 80, 14);
    dropShadow(q, field, 1.6, 2.4, 0.3);
    washed(q, field, DESK.beige, DESK.beigeDeep, 1.6, 1.6, 1.6);
    q.drawPath(rrect(-35, -35, 70, 70, 10), stroke(alpha(DESK.beigeDeep, 0.9), 1));
    at(q, 0, 10, 0.62, 0, (z) => drawNapkin(z, 40));
    at(q, 0, -2, 0.72, 0, (z) => drawGiantScissors(z, 40));
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
  const e = Math.min(w, h) * 0.26;
  at(c, w / 2, h * 0.36, e / 40, 0, (q) => drawEmblem(q, 40));
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
