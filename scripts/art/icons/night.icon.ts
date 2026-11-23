/**
 * Lantern Row app icon (spec 7.4): a glowing ticket lantern over two merging skewers on indigo. The
 * ticket leads: a paper order ticket (clip, three line rows with ticks, price box, torn hem) that
 * bulges into a lit paper lantern; below it two Pepper Skewers meet in a spark. Drawn from the art
 * kit's own pieces (src/ui/merge/art). Revision 2 (art review): the ticket lantern fills about 70 %
 * of the height, the skewers are twice as large and cross in front of its base, and the night has
 * no stars (a dusk gradient, so it does not echo Orbit's starry icon). Pure Skia: require() it inside scripts/art/headless.ts.
 * Everything draws into a 1024 x 1024 square (points = pixels at scale 1).
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { drawGlyph } from '../../../src/ui/merge/art/goods.draw';
import { NIGHT, alpha } from '../../../src/ui/merge/art/palette';
import { at, builder, circle, clip, fill, glow, line, linearPaint, rrect, sparkle, stroke, INK } from '../../../src/ui/merge/art/pen';

export const S = 1024;

/** The dusk behind: indigo at the top to deep teal at the bottom, a warm lantern glow; no stars (that is Orbit's sky). */
export function drawNightBackdrop(c: SkCanvas): void {
  c.drawRect({ x: 0, y: 0, width: S, height: S }, linearPaint(0, 0, 0, S, ['#2B2D66', NIGHT.indigo, '#16364A', NIGHT.teal], [0, 0.35, 0.75, 1]));
  glow(c, 512, 470, 620, NIGHT.amber, 0.5);
}

/**
 * The ticket lantern centred on (cx, cy), `k` its scale (1 = about 470 wide, 560 tall): a paper
 * order ticket that bulges into a lit lantern, brass caps, pleats, a torn hem, and TWO bold order
 * rows (a skewer, a cup: goods, not a checklist) with one tick.
 */
export function drawTicketLantern(c: SkCanvas, cx: number, cy: number, k = 1): void {
  at(c, cx, cy, k, 0, (q) => {
    const top = -250;
    const bot = 250;
    glow(q, 0, 0, 430, NIGHT.amber, 0.6);
    const b = builder();
    b.moveTo(-140, top);
    b.lineTo(140, top);
    b.cubicTo(250, top + 110, 250, bot - 110, 140, bot);
    const n = 10;
    for (let i = 1; i <= n; i++) b.lineTo(140 - (280 / n) * i, bot + (i % 2 ? 28 : 0));
    b.cubicTo(-250, bot - 110, -250, top + 110, -140, top);
    b.close();
    const body = b.build();
    q.save();
    q.translate(10, 16);
    q.drawPath(body, fill(alpha(INK, 0.45)));
    q.restore();
    // Lit from within: deep amber at the rim, a bright flame-white core (a barrel or a list does not glow).
    q.drawPath(body, fill(NIGHT.amberDeep));
    q.save();
    clip(q, body);
    glow(q, 0, -10, 300, NIGHT.amber, 1);
    glow(q, 0, -10, 300, NIGHT.amber, 1);
    glow(q, 0, -20, 220, NIGHT.flame, 1);
    glow(q, 0, -20, 120, '#FFFFFF', 0.7);
    // Paper pleats bowing round the light.
    for (let y = top + 70; y < bot - 20; y += 70) q.drawPath(builder().moveTo(-250, y).quadTo(0, y + 30, 250, y).build(), stroke(alpha(NIGHT.amberDeep, 0.35), 5));
    q.restore();
    q.drawPath(body, stroke(INK, 18));
    // Brass caps.
    q.drawPath(rrect(-160, top - 36, 320, 48, 20), fill(NIGHT.brass));
    q.drawPath(rrect(-160, top - 36, 320, 48, 20), stroke(INK, 13));
    q.drawPath(rrect(-44, top - 70, 88, 40, 14), fill(NIGHT.brassLight));
    q.drawPath(rrect(-44, top - 70, 88, 40, 14), stroke(INK, 11));
    // Two order rows: a good's picture on a paper chip, a bold line, and one tick.
    for (let i = 0; i < 2; i++) {
      const y = top + 120 + i * 130;
      q.drawPath(circle(-88, y, 50), fill(NIGHT.paperLight));
      q.drawPath(circle(-88, y, 50), stroke(INK, 10));
      at(q, -88, y + 2, 3.4, 0, (z) => drawGlyph(z, i === 0 ? 0 : 1));
      q.drawPath(rrect(-22, y - 15, 120, 30, 15), fill(alpha(NIGHT.ink, 0.6)));
      if (i === 0) {
        const t = builder().moveTo(106, y - 4).lineTo(128, y + 22).lineTo(168, y - 30).build();
        q.drawPath(t, stroke(INK, 30));
        q.drawPath(t, stroke('#6FAE5A', 16));
      }
    }
  });
}

/** Two Pepper Skewers crossing in a spark, centred on (cx, cy), `k` the glyph scale. */
export function drawMergingSkewers(c: SkCanvas, cx: number, cy: number, k = 20): void {
  glow(c, cx, cy, k * 13, NIGHT.flame, 0.55);
  at(c, cx, cy, k, 0, (q) => drawGlyph(q, 0));
  at(c, cx, cy, k, -90, (q) => drawGlyph(q, 0));
  sparkle(c, cx, cy - k * 1.2, k * 6, NIGHT.white);
  sparkle(c, cx, cy - k * 1.2, k * 3.2, NIGHT.flame);
}

export interface NightIconOptions {
  /** Draw the dusk backdrop (false for the adaptive and splash layers). */
  backdrop?: boolean;
}

export function drawNightIcon(c: SkCanvas, o: NightIconOptions = {}): void {
  if (o.backdrop !== false) drawNightBackdrop(c);
  drawTicketLantern(c, 512, 430, 1.28);
  drawMergingSkewers(c, 512, 790, 19);
}

/** The chosen set: full-bleed icon, adaptive layer (subject in the central 66 %), splash (the same subject, transparent). */
export const drawChosenIcon = (c: SkCanvas) => drawNightIcon(c);
export const drawChosenAdaptive = (c: SkCanvas) =>
  at(c, 512, 512, ADAPTIVE_SCALE, 0, (q) => {
    q.translate(-512, -512);
    drawNightIcon(q, { backdrop: false });
  });
export const drawChosenSplash = drawChosenAdaptive;
const ADAPTIVE_SCALE = 0.5;
