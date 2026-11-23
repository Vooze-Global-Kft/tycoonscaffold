/**
 * Lantern Row app icon (spec 7.4): a glowing ticket lantern over two merging skewers on indigo. The
 * ticket leads: a paper order ticket (clip, three line rows with ticks, price box, torn hem) that
 * bulges into a lit paper lantern; below it two Pepper Skewers meet in a spark. Drawn from the art
 * kit's own pieces (src/ui/merge/art). Pure Skia: require() it inside scripts/art/headless.ts.
 * Everything draws into a 1024 x 1024 square (points = pixels at scale 1).
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { drawGlyph } from '../../../src/ui/merge/art/goods.draw';
import { NIGHT, alpha } from '../../../src/ui/merge/art/palette';
import { at, builder, circle, clip, fill, glow, line, linearPaint, rrect, sparkle, stroke, INK } from '../../../src/ui/merge/art/pen';

export const S = 1024;

/** The indigo night behind: gradient, a warm glow behind the lantern, a few stars. */
export function drawNightBackdrop(c: SkCanvas): void {
  c.drawRect({ x: 0, y: 0, width: S, height: S }, linearPaint(0, 0, 0, S, ['#2A2F62', NIGHT.indigo, '#121530'], [0, 0.5, 1]));
  glow(c, 512, 430, 560, NIGHT.amber, 0.42);
  for (const [x, y, r] of [[120, 150, 6], [250, 80, 4], [880, 140, 5], [930, 420, 4], [90, 520, 4], [800, 60, 3.5]] as const) {
    glow(c, x, y, r * 4, NIGHT.white, 0.3);
    c.drawPath(circle(x, y, r), fill(alpha(NIGHT.white, 0.85)));
  }
}

/** The ticket lantern centred on (cx, cy), `k` its scale (1 = 400 px wide). */
export function drawTicketLantern(c: SkCanvas, cx: number, cy: number, k = 1): void {
  at(c, cx, cy, k, 0, (q) => {
    const top = -250;
    const bot = 230;
    // Cord and clip.
    q.drawPath(line(0, top - 120, 0, top - 10), stroke(INK, 14));
    glow(q, 0, 0, 430, NIGHT.amber, 0.55);
    const b = builder();
    b.moveTo(-150, top);
    b.lineTo(150, top);
    b.cubicTo(235, top + 120, 235, bot - 120, 150, bot);
    const n = 10;
    for (let i = 1; i <= n; i++) b.lineTo(150 - (300 / n) * i, bot + (i % 2 ? 26 : 0));
    b.cubicTo(-235, bot - 120, -235, top + 120, -150, top);
    b.close();
    const body = b.build();
    q.save();
    q.translate(10, 16);
    q.drawPath(body, fill(alpha(INK, 0.45)));
    q.restore();
    q.drawPath(body, fill(NIGHT.amberPale));
    q.save();
    clip(q, body);
    glow(q, 0, -10, 300, NIGHT.amber, 1);
    glow(q, 0, -30, 150, NIGHT.flame, 0.9);
    // Lantern pleats across the paper.
    for (let y = top + 52; y < bot; y += 58) q.drawPath(builder().moveTo(-240, y).quadTo(0, y + 26, 240, y).build(), stroke(alpha(NIGHT.amberDeep, 0.45), 6));
    q.restore();
    q.drawPath(body, stroke(INK, 16));
    // Brass caps top and bottom of the lantern shape.
    q.drawPath(rrect(-170, top - 34, 340, 44, 18), fill(NIGHT.brass));
    q.drawPath(rrect(-170, top - 34, 340, 44, 18), stroke(INK, 12));
    q.drawPath(rrect(-46, top - 62, 92, 36, 12), fill(NIGHT.brassLight));
    q.drawPath(rrect(-46, top - 62, 92, 36, 12), stroke(INK, 10));
    // Ticket rows: a chip, a line, a tick.
    for (let i = 0; i < 3; i++) {
      const y = top + 80 + i * 92;
      q.drawPath(circle(-92, y, 22), fill(i === 1 ? '#6FAE5A' : NIGHT.amberDeep));
      q.drawPath(circle(-92, y, 22), stroke(INK, 8));
      q.drawPath(rrect(-50, y - 11, 110, 22, 11), fill(alpha(NIGHT.ink, 0.55)));
      if (i < 2) {
        const t = builder().moveTo(82, y).lineTo(100, y + 20).lineTo(134, y - 22).build();
        q.drawPath(t, stroke(INK, 22));
        q.drawPath(t, stroke('#6FAE5A', 12));
      }
    }
    // Price box.
    q.drawPath(rrect(-110, bot - 72, 220, 52, 18), fill(alpha(NIGHT.brass, 0.4)));
    q.drawPath(rrect(-110, bot - 72, 220, 52, 18), stroke(NIGHT.brassDeep, 10));
    q.drawPath(circle(-40, bot - 46, 12), fill(NIGHT.brassDeep));
    q.drawPath(rrect(-16, bot - 54, 70, 16, 8), fill(alpha(NIGHT.ink, 0.55)));
  });
}

/** Two Pepper Skewers meeting in a spark, centred on (cx, cy), `k` the glyph scale. */
export function drawMergingSkewers(c: SkCanvas, cx: number, cy: number, k = 12): void {
  at(c, cx - k * 8, cy, k, 0, (q) => drawGlyph(q, 0));
  at(c, cx + k * 8, cy, k, -90, (q) => drawGlyph(q, 0));
  glow(c, cx, cy - k * 4, k * 9, NIGHT.flame, 0.8);
  sparkle(c, cx, cy - k * 4, k * 5, NIGHT.white);
  sparkle(c, cx, cy - k * 4, k * 2.6, NIGHT.flame);
}

export interface NightIconOptions {
  /** Draw the indigo backdrop (false for the adaptive and splash layers). */
  backdrop?: boolean;
}

export function drawNightIcon(c: SkCanvas, o: NightIconOptions = {}): void {
  if (o.backdrop !== false) drawNightBackdrop(c);
  drawTicketLantern(c, 512, 420, 1.05);
  drawMergingSkewers(c, 512, 845, 11);
}

/** The chosen set: full-bleed icon, adaptive layer (subject in the central 66 %), splash (the same subject, transparent). */
export const drawChosenIcon = (c: SkCanvas) => drawNightIcon(c);
export const drawChosenAdaptive = (c: SkCanvas) =>
  at(c, 512, 512, 0.6, 0, (q) => {
    q.translate(-512, -512);
    drawNightIcon(q, { backdrop: false });
  });
export const drawChosenSplash = drawChosenAdaptive;
