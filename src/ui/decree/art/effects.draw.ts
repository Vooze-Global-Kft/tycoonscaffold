/**
 * The effect icons a paper's strips print (office-design.md 2.7, 4.2): coin, gossip, approval,
 * every club, level, minister, boycott, scandal, comes back (↩), the small flag, plus the ends of a
 * boycott and of a scandal, the Name Recognition rosette and the record, and the two chips of the
 * top bar (approval, gossip). Each in a box of ±12 (a 24 pt icon), centred, readable at 18 pt and in
 * greyscale. Mustard is money only; brick only boycott and scandal.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { CLUB, DESK, alpha } from './palette';
import { drawPattern, drawSmallFlag } from './clubs.draw';
import { LINE, arc, at, builder, circle, clip, fill, line, oval, poly, rect, rrect, shape, star, stroke, washed } from './pen';

export const EFFECT_IDS = ['coin', 'gossip', 'approval', 'every', 'level', 'minister', 'boycott', 'boycott_end', 'scandal', 'scandal_end', 'returns', 'flag', 'nr', 'record', 'district', 'nochange'] as const;
export type EffectId = (typeof EFFECT_IDS)[number];

/** The dib: a mustard coin with a milled rim and a pair of ribbon scissors struck on it. */
export function drawCoin(c: SkCanvas, r = 10): void {
  const k = r / 10;
  at(c, 0, 0, k, 0, (q) => {
    shape(q, circle(0.8, 1, 10), DESK.mustardDeep, 0);
    washed(q, circle(0, 0, 10), DESK.mustard, DESK.mustardDeep, 1.4, 1.4, 1);
    q.drawPath(circle(0, 0, 7.4), stroke(DESK.mustardDeep, 1));
    // struck mark: a tiny scissors (the emblem), no letters
    q.drawPath(line(-3.4, -3.4, 2.6, 2.6), stroke(DESK.mustardDeep, 1.4));
    q.drawPath(line(3.4, -3.4, -2.6, 2.6), stroke(DESK.mustardDeep, 1.4));
    q.drawPath(circle(-3.4, 4, 1.7), stroke(DESK.mustardDeep, 1.1));
    q.drawPath(circle(3.4, 4, 1.7), stroke(DESK.mustardDeep, 1.1));
    q.drawPath(builder().moveTo(-6, -4.8).quadTo(-4.6, -6.6, -2.4, -7.2).build(), stroke(alpha(DESK.white, 0.7), 1.1));
  });
}

/** Gossip: two overlapping speech bubbles, the front one with a scribble of talk. */
export function drawGossip(c: SkCanvas): void {
  const back = builder().addRRect({ rect: { x: -1, y: -10, width: 12, height: 9 }, rx: 4, ry: 4 }).moveTo(7, -1.4).lineTo(9.6, 2.6).lineTo(4, -1.2).build();
  shape(c, back, DESK.slatePale, 1);
  const front = builder().addRRect({ rect: { x: -11, y: -5, width: 15, height: 11 }, rx: 5, ry: 5 }).moveTo(-7, 5.6).lineTo(-9.6, 10).lineTo(-3, 5.8).build();
  shape(c, front, DESK.paperLight, 1);
  c.drawPath(builder().moveTo(-8, -0.6).quadTo(-6.6, -2.4, -5.2, -0.6).quadTo(-3.8, 1.2, -2.4, -0.6).quadTo(-1, -2.4, 0.6, -0.6).build(), stroke(DESK.slateDeep, 1.2));
  c.drawPath(line(-8, 2.4, -2, 2.4), stroke(DESK.slateDeep, 1.1));
}

/** Approval: a half-dial with its needle (the weighted average of the clubs' moods). */
export function drawApproval(c: SkCanvas, value = 62): void {
  const dial = builder().moveTo(-11, 4).arcToOval({ x: -11, y: -7, width: 22, height: 22 }, 180, 180, false).close().build();
  shape(c, dial, DESK.paperLight, 1);
  c.drawPath(arc(0, 4, 8.4, 180, 180 * (value / 100)), stroke(DESK.violet, 2.4, false));
  c.drawPath(arc(0, 4, 8.4, 180 + 180 * (value / 100), 180 * (1 - value / 100)), stroke(DESK.slatePale, 2.4, false));
  const a = Math.PI * (1 + value / 100);
  c.drawPath(line(0, 4, Math.cos(a) * 8.6, 4 + Math.sin(a) * 8.6), stroke(LINE, 1.6));
  c.drawPath(circle(0, 4, 1.8), fill(DESK.brass));
  c.drawPath(circle(0, 4, 1.8), stroke(LINE, 0.6));
  c.drawPath(line(-11, 4, 11, 4), stroke(LINE, 1));
}

/** Every club: three small patterned discs together (one chip for "every club"). */
export function drawEvery(c: SkCanvas): void {
  const spots: [number, number, 'bus' | 'shops' | 'veg'][] = [
    [-5, 3.8, 'bus'],
    [5, 3.8, 'veg'],
    [0, -4.6, 'shops'],
  ];
  for (const [x, y, id] of spots) {
    const d = circle(x, y, 5.4);
    drawPattern(c, d, id, 0.7, DESK.slate, DESK.slatePale);
    c.drawPath(d, stroke(LINE, 1));
  }
  void CLUB;
}

/** +1 level: three stacked storey blocks and an up chevron (brass). */
export function drawLevel(c: SkCanvas): void {
  for (let i = 0; i < 3; i++) washed(c, rrect(-8 + i * 1.2, 6 - i * 5, 11 - i * 2.4, 4.6, 0.8), i === 2 ? DESK.brassLight : DESK.paperShade, i === 2 ? DESK.brass : DESK.slateLight, 0.8, 0.8, 0.9);
  c.drawPath(poly([4.2, -2, 8, -8.4, 11.8, -2], false), stroke(DESK.violet, 2.2));
  c.drawPath(line(8, -8, 8, 6), stroke(DESK.violet, 2.2));
}

/** A minister appointed: a small portrait frame with a rosette pinned to its corner. */
export function drawMinister(c: SkCanvas): void {
  washed(c, rrect(-9, -10, 14, 18, 1.6), DESK.paperLight, DESK.paperShade, 1, 1, 1);
  c.drawPath(rrect(-9, -10, 14, 18, 1.6), stroke(DESK.brassDeep, 2));
  c.drawPath(oval(-2, -4, 3, 3.6), fill(DESK.slateLight));
  c.drawPath(builder().moveTo(-7.4, 6.6).quadTo(-2, -2, 3.4, 6.6).close().build(), fill(DESK.slateLight));
  drawRosette(c, 6.2, 5.4, 5);
}

/** A rosette (Name Recognition; election night's held district). */
export function drawRosette(c: SkCanvas, x: number, y: number, r: number, col: string = DESK.violet): void {
  at(c, x, y, r / 6, 0, (q) => {
    shape(q, poly([-3, 2, -5, 10, -2, 8.4, -0.6, 10.6, 0, 2]), col, 0.6);
    shape(q, poly([3, 2, 5, 10, 2, 8.4, 0.6, 10.6, 0, 2]), alpha(col, 0.85), 0.6);
    shape(q, star(0, 0, 6, 4.6, 12), col, 0.7);
    q.drawPath(circle(0, 0, 3.4), fill(DESK.paperLight));
    q.drawPath(circle(0, 0, 3.4), stroke(LINE, 0.6));
    q.drawPath(circle(0, 0, 1.6), fill(DESK.brass));
  });
}

/** Boycott: a picket board on its stick, the board in brick (one of brick's two words). */
export function drawPicket(c: SkCanvas, ended = false): void {
  c.drawPath(rect(-1.2, -1, 2.4, 12), fill(DESK.walnut));
  c.drawPath(rect(-1.2, -1, 2.4, 12), stroke(LINE, 0.8));
  shape(c, rrect(-10, -10.4, 20, 11.4, 1.2), ended ? DESK.slatePale : DESK.paperLight, 1);
  c.drawPath(rrect(-8.4, -8.6, 16.8, 3, 0.6), fill(ended ? DESK.slate : DESK.brick));
  c.drawPath(rrect(-8.4, -4.2, 12, 2.4, 0.6), fill(ended ? DESK.slate : DESK.brick));
  if (ended) {
    c.drawPath(poly([2, 5, 5, 8.4, 11, 1.6], false), stroke(DESK.paperLight, 4.2));
    c.drawPath(poly([2, 5, 5, 8.4, 11, 1.6], false), stroke(DESK.violet, 2.2));
  }
}

/** Scandal: a folded newspaper with a brick headline bar and a photo box. */
export function drawScandal(c: SkCanvas, ended = false): void {
  at(c, 0, 0, 1, -8, (q) => {
    shape(q, poly([-10, -9, 10, -9, 10, 9, -10, 9]), DESK.paperLight, 1);
    q.drawPath(line(0, -9, 0, 9), stroke(alpha(LINE, 0.35), 0.6));
    q.drawPath(rrect(-8, -7, 16, 3.6, 0.5), fill(ended ? DESK.slate : DESK.brick));
    q.drawPath(rect(-8, -1.6, 7, 7), fill(DESK.slatePale));
    q.drawPath(rect(-8, -1.6, 7, 7), stroke(LINE, 0.6));
    for (let i = 0; i < 3; i++) q.drawPath(line(1.6, -0.8 + i * 2.8, 8, -0.8 + i * 2.8), stroke(DESK.slateLight, 1.1));
  });
  if (ended) {
    c.drawPath(poly([1, 6, 4, 9.4, 11, 2], false), stroke(DESK.paperLight, 4.2));
    c.drawPath(poly([1, 6, 4, 9.4, 11, 2], false), stroke(DESK.violet, 2.2));
  }
}

/** ↩ comes back: a hooked arrow in violet ink. */
export function drawReturns(c: SkCanvas): void {
  const p = builder().moveTo(9, 8).lineTo(9, 0).quadTo(9, -6, 3, -6).lineTo(-6, -6).build();
  c.drawPath(p, stroke(DESK.violet, 3));
  c.drawPath(poly([-4.6, -11, -11, -6, -4.6, -1]), fill(DESK.violet));
}

/** The record (levels in all): a little clothbound ledger with a brass corner. */
export function drawRecord(c: SkCanvas): void {
  washed(c, rrect(-8, -10, 16, 20, 1.4), DESK.violetDeep, DESK.violetDeep, 0, 0, 1);
  c.drawPath(rect(-8, -10, 3, 20), fill(alpha(LINE, 0.4)));
  c.drawPath(rrect(-2, -5, 8, 5, 0.6), fill(DESK.paperLight));
  c.drawPath(poly([4, 10, 8, 6, 8, 10]), fill(DESK.brass));
}

/** A district chip's badge: a pinned map fragment with a violet hatched patch. */
export function drawDistrict(c: SkCanvas): void {
  const p = builder().moveTo(-9, -6).lineTo(-2, -9).lineTo(8, -6).lineTo(10, 4).lineTo(2, 9).lineTo(-8, 6).close().build();
  shape(c, p, DESK.paperLight, 1);
  c.save();
  clip(c, p);
  for (let x = -14; x < 14; x += 2.4) c.drawPath(line(x, 10, x + 12, -10), stroke(DESK.violet, 0.9));
  c.restore();
  c.drawPath(p, stroke(DESK.violetDeep, 1.4));
  c.drawPath(circle(-2, -9, 2.2), fill(DESK.brass));
  c.drawPath(circle(-2, -9, 2.2), stroke(LINE, 0.6));
}

/** "No change": a short level dash between two ticks, in slate. */
export function drawNoChange(c: SkCanvas): void {
  c.drawPath(line(-8, 0, 8, 0), stroke(DESK.slate, 2.4));
  c.drawPath(line(-8, -4, -8, 4), stroke(DESK.slate, 1.4));
  c.drawPath(line(8, -4, 8, 4), stroke(DESK.slate, 1.4));
}

/** Any effect icon by id, in ±12. */
export function drawEffect(c: SkCanvas, id: EffectId): void {
  switch (id) {
    case 'coin':
      return drawCoin(c, 10);
    case 'gossip':
      return drawGossip(c);
    case 'approval':
      return drawApproval(c);
    case 'every':
      return drawEvery(c);
    case 'level':
      return drawLevel(c);
    case 'minister':
      return drawMinister(c);
    case 'boycott':
      return drawPicket(c);
    case 'boycott_end':
      return drawPicket(c, true);
    case 'scandal':
      return drawScandal(c);
    case 'scandal_end':
      return drawScandal(c, true);
    case 'returns':
      return drawReturns(c);
    case 'flag':
      return at(c, 0, 0, 2, 0, (q) => drawSmallFlag(q, 1));
    case 'nr':
      return drawRosette(c, 0, -2, 10);
    case 'record':
      return drawRecord(c);
    case 'district':
      return drawDistrict(c);
    case 'nochange':
      return drawNoChange(c);
  }
}

/**
 * A chip's ground (4.2: an icon and a resulting value, ≤ 151 pt): a rounded paper lozenge, w x h,
 * from its top left; violet edge on the SIGN strip, slate on REFUSE. The icon and the digits are the
 * caller's. `wide` chips are the same shape.
 */
export function drawChip(c: SkCanvas, w: number, h: number, side: 'sign' | 'refuse' | 'bar' = 'sign'): void {
  const p = rrect(0.5, 0.5, w - 1, h - 1, h / 2);
  const edge = side === 'sign' ? DESK.violetLight : side === 'refuse' ? DESK.slateLight : DESK.paperEdge;
  c.drawPath(p, fill(side === 'bar' ? alpha(DESK.paperLight, 0.95) : DESK.white));
  c.drawPath(p, stroke(edge, 1));
}

/** The top bar's approval chip ground with its dial (w x h from top left; the words are the caller's). */
export function drawApprovalChip(c: SkCanvas, w: number, h: number, value = 62): void {
  drawChip(c, w, h, 'bar');
  at(c, h / 2 + 2, h / 2, (h * 0.72) / 24, 0, (q) => drawApproval(q, value));
}

/** The top bar's gossip chip ground with its bubbles and `n` of `max` pips (w x h from top left). */
export function drawGossipChip(c: SkCanvas, w: number, h: number, n = 2, max = 5): void {
  drawChip(c, w, h, 'bar');
  at(c, h * 0.42 + 2, h / 2, (h * 0.6) / 24, 0, drawGossip);
  const x0 = h * 0.84 + 2;
  const gap = Math.min(6, (w - x0 - 4) / max);
  for (let i = 0; i < max; i++) {
    const full = i < n;
    const near = n >= max - 1 && full;
    c.drawPath(circle(x0 + i * gap + gap / 2, h / 2, Math.min(2.2, gap * 0.42)), fill(full ? (near ? DESK.violet : DESK.slateDeep) : DESK.slateLight));
  }
  void oval;
}
