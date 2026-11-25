/**
 * World marks (yard-stage1.md 6.1 "Effects and interface"): the work ring round the thing being worked,
 * the soft shadow under a piece arcing onto the carry frame, the hi-vis chevron over the goal's target
 * and its edge arrow, the pour's light pool, the chalk drop circle, and the blank padlock chip a locked
 * pad wears (its words are the caller's). Anchored at their centre on the ground (marks) or at the
 * point they mark (chevron, chip).
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { YARD } from './palette';
import { arcPath, builder, fill, hash01, oval, poly, radial, rrect, segment, stroke, type View3q } from './pen';
import { padlock } from './ui.draw';

const INK = YARD.ink;

/** The work ring's radius as baked, metres (the world scales it to the thing). */
export const RING_R = 0.5;

/**
 * The work ring on the ground: a dark translucent track and a hi-vis arc filled k of n clockwise from
 * north, with a light lip so it reads on pale concrete as well as on dark asphalt.
 */
export function drawWorkRing(c: SkCanvas, v: View3q, k: number, n: number, r = RING_R): void {
  const rx = r * v.ppm;
  const ry = r * v.ppm * v.tilt;
  c.drawPath(oval(0, 0, rx, ry), stroke(INK, 6, 0.28));
  c.drawPath(oval(0, 0, rx, ry), stroke('#FFFFFF', 1, 0.5));
  if (k > 0) {
    const sweep = (360 * Math.min(k, n)) / n;
    c.drawPath(arcPath(0, 0, rx, ry, -90, sweep), stroke(INK, 5.4));
    c.drawPath(arcPath(0, 0, rx, ry, -90, sweep), stroke(YARD.hivis, 3.4));
  }
}

/** The soft shadow of a piece in flight (drawn on the ground under the arc, scaled by height). */
export function drawPickupShadow(c: SkCanvas, v: View3q): void {
  const rx = 0.22 * v.ppm;
  const ry = rx * v.tilt;
  c.drawPath(oval(0, 0, rx, ry), fill(YARD.shadow, 0.16));
  c.drawPath(oval(0, 0, rx * 0.6, ry * 0.6), fill(YARD.shadow, 0.16));
}

/** The chevron over the goal's target: a hi-vis down-pointing chevron with an ink edge; frame 1 a little lower. Tip at (0, 0). */
export function drawChevron(c: SkCanvas, frame = 0): void {
  const y = frame ? 3 : 0;
  const p = poly([-11, -16 + y, 0, -6 + y, 11, -16 + y, 11, -9 + y, 0, 1 + y, -11, -9 + y]);
  c.drawPath(oval(0, 9, 6, 2), fill(YARD.shadow, 0.25));
  c.save();
  c.translate(1.5, 2);
  c.drawPath(p, fill(INK, 0.25));
  c.restore();
  c.drawPath(p, fill(YARD.hivis));
  c.drawPath(p, stroke(INK, 1.4));
  c.drawPath(segment(-8, -13 + y, 0, -5 + y), stroke(YARD.hivisLight, 1.2));
}

/** The edge arrow when the goal is off screen: points east from (0, 0) (the world turns it). */
export function drawEdgeArrow(c: SkCanvas): void {
  c.drawPath(oval(0, 0, 14, 14), fill(YARD.paper));
  c.drawPath(oval(0, 0, 14, 14), stroke(INK, 1.4));
  const p = poly([-7, -6, 2, -6, 2, -10, 10, 0, 2, 10, 2, 6, -7, 6]);
  c.drawPath(p, fill(YARD.hivis));
  c.drawPath(p, stroke(INK, 1.2));
}

/** The pour's warm light on the ground, baked small (the world draws it at POUR_LIGHT_SCALE). */
export const POUR_LIGHT_SCALE = 3;
export function drawPourLight(c: SkCanvas, v: View3q): void {
  const rx = (2.4 * v.ppm) / POUR_LIGHT_SCALE;
  const ry = (1.3 * v.ppm * v.tilt) / POUR_LIGHT_SCALE;
  c.save();
  c.scale(1, ry / rx);
  c.drawPath(oval(0, 0, rx, rx), radial(0, 0, rx, ['rgba(255,176,80,0.55)', 'rgba(255,190,90,0)']));
  c.restore();
}

/** A chalk drop circle (where the boss leaves pieces for the yard hand): a hand-drawn double ring and a cross. 1.8 m. */
export function drawChalkCircle(c: SkCanvas, v: View3q): void {
  const rx = 0.9 * v.ppm;
  const ry = 0.9 * v.ppm * v.tilt;
  const b = builder();
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * Math.PI * 2.08;
    const w = 1 + (hash01(i, 3) - 0.5) * 0.05;
    const x = Math.cos(a) * rx * w;
    const y = Math.sin(a) * ry * w;
    if (i === 0) b.moveTo(x, y);
    else b.lineTo(x, y);
  }
  c.drawPath(b.build(), stroke('#FFFFFF', 2.2, 0.75));
  c.drawPath(oval(1, 0.5, rx * 0.9, ry * 0.9), stroke('#FFFFFF', 0.9, 0.45));
  c.drawPath(segment(-6, -3, 6, 3), stroke('#FFFFFF', 1.8, 0.7));
  c.drawPath(segment(-6, 3, 6, -3), stroke('#FFFFFF', 1.8, 0.7));
}

/**
 * The padlock chip a locked pad or thing wears (blank: the caller writes the condition and the price to
 * the right of the padlock): paper, ink edge, a hard drop, a pointer down to (0, 0). 120 x 34 points.
 */
export const PADLOCK_CHIP = { w: 120, h: 34 };
export function drawPadlockChip(c: SkCanvas): void {
  const { w, h } = PADLOCK_CHIP;
  const x = -w / 2;
  const y = -h - 8;
  c.drawPath(rrect(x + 2, y + 3, w, h, 7), fill(INK, 0.3));
  c.drawPath(rrect(x, y, w, h, 7), fill(YARD.paper));
  c.drawPath(rrect(x, y, w, h, 7), stroke(INK, 1.3));
  c.drawPath(poly([-6, y + h, 0, y + h + 7, 6, y + h]), fill(YARD.paper));
  c.drawPath(builder().moveTo(-6, y + h).lineTo(0, y + h + 7).lineTo(6, y + h).build(), stroke(INK, 1.3));
  c.drawPath(rrect(x + 5, y + 5, h - 10, h - 10, 5), fill(INK));
  padlock(c, x + 5 + (h - 10) / 2, y + h / 2, 9, YARD.hivis);
}

// ---------------------------------------------------------------------------
// Effects (yard-stage1.md 6.1): sparks, dust, the torch's flame, the coin. Baked in a few frames each
// and drawn at the work point (anchor) by the world; light only, never fire made fun (yard-style 11).
// ---------------------------------------------------------------------------

/** A fan of grinder or torch sparks thrown east-down from the anchor: short bright streaks, never four-point stars. frame 0..2. */
export function drawSparks(c: SkCanvas, frame = 0): void {
  for (let i = 0; i < 9; i++) {
    const a = -0.5 + hash01(i, frame, 31) * 1.5;
    const r0 = 3 + hash01(i, frame, 32) * 4;
    const r1 = r0 + 6 + hash01(i, frame, 33) * 10;
    const col = i % 3 === 0 ? YARD.glowWhite : YARD.spark;
    c.drawPath(segment(Math.cos(a) * r0, Math.sin(a) * r0, Math.cos(a) * r1, Math.sin(a) * r1 + 2), stroke(col, 1.2));
  }
  c.drawPath(oval(0, 0, 3.5, 3), radial(0, 0, 5, [YARD.glowWhite, 'rgba(255,230,128,0)']));
}

/** A puff of dust where a sledge lands or a piece drops: three soft grey lobes, growing and fading over frames 0..2. */
export function drawDust(c: SkCanvas, frame = 0): void {
  const k = 1 + frame * 0.45;
  const a = 0.5 - frame * 0.14;
  for (let i = 0; i < 4; i++) {
    const x = (i - 1.5) * 6 * k;
    const y = -3 * k - hash01(i, 41) * 4 * k;
    c.drawPath(oval(x, y, 6 * k, 4 * k), fill('#BDB7AA', a));
  }
}

/** The cutting torch's flame at its nozzle: a short blue-white cone with a bright core (frames 0, 1 flicker). */
export function drawFlame(c: SkCanvas, frame = 0): void {
  const l = frame ? 11 : 9;
  c.drawPath(poly([0, -2.4, l, -0.6, l + 1.5, 0, l, 0.6, 0, 2.4]), fill('#8FC8FF', 0.85));
  c.drawPath(poly([0, -1.2, l * 0.55, -0.3, l * 0.6, 0, l * 0.55, 0.3, 0, 1.2]), fill(YARD.glowWhite));
}

/** One scrip coin flying to the cash chip (the § as two stacked S strokes is the interface's; here a plain disc with a rim). */
export function drawCoin(c: SkCanvas): void {
  c.drawPath(oval(0, 0, 6, 6), fill(YARD.hivis));
  c.drawPath(oval(0, 0, 6, 6), stroke(INK, 1.2));
  c.drawPath(oval(0, 0, 4, 4), stroke(YARD.hivisDark, 1));
  c.drawPath(segment(-2.2, -3.2, -2.8, -1.2), stroke('#FFFFFF', 1, 0.7));
}
