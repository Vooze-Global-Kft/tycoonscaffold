/**
 * The away card's marks (owner1-hud; the owner's review, point 6): the small signs at the left of a docket
 * row that is not a grade (a grade row uses pieces.draw `gradePictogram`) and not one of the two partners
 * the lane already marks (lane.draw `partnerMark`). Flat fills in the yard's palette with an ink edge,
 * no letters (yard-style 8 and 11: no real mark, no coin, no crest). Each is drawn in a square of side s
 * whose top-left is (x, y), like `gradePictogram`.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { YARD } from './palette';
import { fill, oval, poly, rect, rrect, segment, stroke } from './pen';
import { gradePictogram } from './pieces.draw';
import { partnerMark } from './lane.draw';

export type DocketMark =
  | { grade: string }
  | { partner: string }
  /** The supply deal's delivery: an ingot on the foundry's pallet. */
  | { sign: 'deal' }
  /** A sale at the gate (the Yard sale): a price tag on its string. */
  | { sign: 'gate' }
  /** The reclaimer's van: a box van side. */
  | { sign: 'van' }
  /** The bank's share: a riveted plate (the bank's register note: a rivet sign, no coin, no crest). */
  | { sign: 'bank' }
  /** A skip of a partner without a lane mark: a skip's side in its red. */
  | { sign: 'skip' };

const INK = YARD.ink;

/** One mark of the docket, s points square, top-left (x, y). */
export function docketMark(c: SkCanvas, m: DocketMark, x: number, y: number, s: number): void {
  if ('grade' in m) {
    gradePictogram(c, m.grade, x, y, s);
    return;
  }
  if ('partner' in m) {
    if (m.partner === 'partnerDemolition') partnerMark(c, x + s / 2, y + s / 2, s, 'demolition');
    else if (m.partner === 'partnerFarm') partnerMark(c, x + s / 2, y + s / 2, s, 'farm');
    else skip(c, x, y, s);
    return;
  }
  const k = s / 16;
  const w = 1.1 * Math.max(0.8, k);
  switch (m.sign) {
    case 'skip':
      skip(c, x, y, s);
      return;
    case 'deal': {
      // a pallet's two boards and a notched ingot on them, in brass
      c.drawPath(rect(x + 1 * k, y + 12 * k, 14 * k, 2.4 * k), fill(YARD.rustLight));
      c.drawPath(rect(x + 1 * k, y + 12 * k, 14 * k, 2.4 * k), stroke(INK, w));
      const ingot = poly([x + 3 * k, y + 11.5 * k, x + 13 * k, y + 11.5 * k, x + 11.5 * k, y + 6 * k, x + 4.5 * k, y + 6 * k]);
      c.drawPath(ingot, fill(YARD.brass));
      c.drawPath(ingot, stroke(INK, w));
      c.drawPath(segment(x + 8 * k, y + 6 * k, x + 8 * k, y + 11.5 * k), stroke(INK, 0.7 * w));
      return;
    }
    case 'gate': {
      // a paper price tag with its eyelet and string
      const tag = poly([x + 5 * k, y + 3 * k, x + 14 * k, y + 3 * k, x + 14 * k, y + 13 * k, x + 5 * k, y + 13 * k, x + 2 * k, y + 8 * k]);
      c.drawPath(tag, fill(YARD.paper));
      c.drawPath(tag, stroke(INK, w));
      c.drawPath(oval(x + 5.5 * k, y + 8 * k, 1.2 * k, 1.2 * k), stroke(INK, 0.8 * w));
      c.drawPath(segment(x + 4.6 * k, y + 8 * k, x + 0.5 * k, y + 2 * k), stroke(INK, 0.8 * w));
      c.drawPath(rect(x + 8 * k, y + 6 * k, 4 * k, 1.4 * k), fill(YARD.hivisDark));
      c.drawPath(rect(x + 8 * k, y + 9 * k, 3 * k, 1.4 * k), fill(INK));
      return;
    }
    case 'van': {
      // a box van's side: body, cab, two wheels
      c.drawPath(rrect(x + 1 * k, y + 3.5 * k, 9.5 * k, 8 * k, 1 * k), fill(YARD.enamel));
      c.drawPath(rrect(x + 1 * k, y + 3.5 * k, 9.5 * k, 8 * k, 1 * k), stroke(INK, w));
      const cab = poly([x + 10.5 * k, y + 5.5 * k, x + 13.5 * k, y + 5.5 * k, x + 15 * k, y + 8.5 * k, x + 15 * k, y + 11.5 * k, x + 10.5 * k, y + 11.5 * k]);
      c.drawPath(cab, fill(YARD.machine));
      c.drawPath(cab, stroke(INK, w));
      for (const wx of [4, 12.5]) {
        c.drawPath(oval(x + wx * k, y + 12.5 * k, 1.9 * k, 1.9 * k), fill(INK));
        c.drawPath(oval(x + wx * k, y + 12.5 * k, 0.7 * k, 0.7 * k), fill(YARD.galvanised));
      }
      return;
    }
    case 'bank': {
      // a riveted steel plate with a mill-wheel of six spokes, in the stamp's blue
      c.drawPath(rrect(x + 1 * k, y + 2 * k, 14 * k, 12 * k, 1.5 * k), fill(YARD.galvanised));
      c.drawPath(rrect(x + 1 * k, y + 2 * k, 14 * k, 12 * k, 1.5 * k), stroke(INK, w));
      for (const [rx, ry] of [[3, 4], [13, 4], [3, 12], [13, 12]]) c.drawPath(oval(x + rx * k, y + ry * k, 0.7 * k, 0.7 * k), fill(INK));
      const cx = x + 8 * k;
      const cy = y + 8 * k;
      c.drawPath(oval(cx, cy, 3.6 * k, 3.6 * k), stroke(YARD.stampBlue, 1.2 * w));
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        c.drawPath(segment(cx, cy, cx + Math.cos(a) * 3.6 * k, cy + Math.sin(a) * 3.6 * k), stroke(YARD.stampBlue, 0.8 * w));
      }
      return;
    }
  }
}

function skip(c: SkCanvas, x: number, y: number, s: number): void {
  const k = s / 16;
  const w = 1.1 * Math.max(0.8, k);
  const body = poly([x + 1 * k, y + 5 * k, x + 15 * k, y + 5 * k, x + 13 * k, y + 13 * k, x + 3 * k, y + 13 * k]);
  c.drawPath(body, fill(YARD.skip));
  c.drawPath(body, stroke(INK, w));
  c.drawPath(rect(x + 0.5 * k, y + 3.6 * k, 15 * k, 1.6 * k), fill(INK));
  c.drawPath(segment(x + 5 * k, y + 7 * k, x + 5 * k, y + 11.5 * k), stroke(YARD.rust, w));
  c.drawPath(segment(x + 11 * k, y + 7 * k, x + 11 * k, y + 11.5 * k), stroke(YARD.rust, w));
}
