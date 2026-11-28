/**
 * Manifest part "worksHallParts" (sheet C; drawn by ART-HALLPARTS in ../hallParts.draw.ts): each hall's bag-house
 * filter (housing, duct, a slim stack with a faint heat shimmer, never smoke; still / shimmer), the moulds on its apron
 * (tinted per instance), the charge box at its door (empty / part / full), the covered slag skips and the sealed drums.
 *
 * C-ART (PLAN2 2.7, batch 0b) put every entry in with its FINAL id, group, sheet, footprint (metres), frames (by name, in
 * order), headings, mirrorWest, tint, drawScale (baked at k of true size: drawScale 1/k) and slots, and a LABELLED
 * PLACEHOLDER (`wk` below: the footprint on the ground, the baked box, the entry's name in stencil, a dot per frame, a
 * red mark towards the heading). The art package that owns this file replaces each draw with the drawing, measures the
 * bounds from its ink (as plant.ts does), and keeps ids, frames, headings and anchors: the world (worksTable.ts) is built
 * on them. Anchor: the footprint's centre on the ground (the first yard's code: a vehicle's too). No words in a sprite:
 * the slots say where the caller's go. Nothing of a dark item (a machine or grade that is not sold) is drawn.
 * Checked by src/ui/salvage/art/sheets.hash.test.ts (every frame at every baked heading inside its box; C and D fit
 * 2048 x 2048 at density 2) and budgeted by `npx tsx scripts/art/yard-sheets.ts <out> budget-C budget-D`.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { MOULD_TINT, drawCharge, drawDrums, drawFilter, drawMoulds, drawSlagSkip, drumsLabel, type HallKind } from '../hallParts.draw';
import type { View3q } from '../pen';
import type { Bounds, WorksEntry, WorksSheet } from './index';

// -----------------------------------------------------------------------------------------------------
// ART-HALLPARTS (batch 0e): every entry is DRAWN (../hallParts.draw.ts); the placeholder kit is gone. Ids, groups, sheet,
// footprints, frames, headings, tint and drawScale are C-ART's, unchanged. Bounds are MEASURED from the ink at the baked
// size (MEASURED below, printed by `MEASURE=1 npx tsx scripts/art/yard-sheets.ts <out> works-hall-parts`), the fall-back
// box only for an id missing from the table.
// -----------------------------------------------------------------------------------------------------
type Draw = (c: SkCanvas, v: View3q, frame: number, heading: number) => void;
const PPM = 40;
const TILT = 0.7;
const LIFT = Math.sqrt(1 - TILT * TILT);
const B = (x: number, y: number, w: number, h: number): Bounds => ({ x, y, w, h });

interface Spec {
  /** height in metres (the fall-back box's top) */
  h: number;
  /** baked at k of true size (drawScale 1/k), as the first yard's statics (plant.ts `entry`) */
  k?: number;
  tint?: string;
  /** slots in points round the anchor at TRUE size [x, y, w, h] (scaled by k into the baked box) */
  slots?: Record<string, readonly [number, number, number, number]>;
}

/** The box (points round the anchor, baked at k) of a footprint w x d m standing h m high, for every heading it turns to. */
function boxOf(w: number, d: number, h: number, k: number, turns: boolean, sunOn: boolean): Bounds {
  const hw = turns ? Math.hypot(w, d) / 2 : w / 2;
  const hd = turns ? hw : d / 2;
  const sun = sunOn ? Math.min(h * 0.42, 0.8) : 0;
  const x0 = -hw * PPM - 2;
  const x1 = (hw + sun) * PPM + 2;
  const y0 = -(hd * TILT + h * LIFT) * PPM - 2;
  const y1 = (hd * TILT + 0.1) * PPM + 2;
  const fx = Math.floor(x0 * k);
  const fy = Math.floor(y0 * k);
  return B(fx, fy, Math.ceil(x1 * k) - fx, Math.ceil(y1 * k) - fy);
}

// BEGIN MEASURED BOUNDS (baked size, points round the anchor: the ink of every frame plus 2 pt; printed by the sheet script)
const MEASURED: Readonly<Record<string, readonly [number, number, number, number]>> = {
  'works.hall.rotary.filter': [-35, -120, 95, 143],
  'works.hall.rotary.moulds': [-56, -22, 112, 34],
  'works.hall.rotary.charge': [-23, -25, 55, 39],
  'works.hall.induction.filter': [-30, -98, 76, 117],
  'works.hall.induction.moulds': [-44, -22, 88, 34],
  'works.hall.induction.charge': [-23, -28, 55, 42],
  'works.hall.copper.filter': [-40, -120, 105, 147],
  'works.hall.copper.moulds': [-44, -22, 88, 34],
  'works.hall.copper.charge': [-23, -25, 55, 39],
  'works.slagSkip.rotary': [-29, -34, 72, 50],
  'works.slagSkip.induction': [-25, -23, 57, 36],
  'works.slagSkip.copper': [-21, -35, 47, 50],
  'works.drums': [-21, -27, 56, 38],
};
// END MEASURED BOUNDS

/** One drawn works entry: C-ART's id, frames and footprint; the drawing baked at k (drawScale 1/k); measured bounds. */
function part(id: string, fp: [number, number], frames: readonly string[], s: Spec, draw: Draw): WorksEntry {
  const k = s.k ?? 1;
  const m = MEASURED[id];
  // the fall-back: C-ART's box with a generous margin (only until the table holds the id)
  const f = boxOf(fp[0], fp[1], s.h, k, false, true);
  const bounds = m ? B(m[0], m[1], m[2], m[3]) : B(f.x - 12, f.y - 24, f.w + 24, f.h + 36);
  const slots = s.slots && Object.fromEntries(Object.entries(s.slots).map(([n, [x, y, w, h]]) => [n, B(x * k, y * k, w * k, h * k)]));
  return {
    id,
    group: 'plant',
    sheet: S,
    footprint: { w: fp[0], d: fp[1] },
    bounds,
    frames,
    headings: 1,
    ...(s.tint ? { tint: s.tint } : {}),
    ...(k !== 1 ? { drawScale: 1 / k } : {}),
    ...(slots ? { slots } : {}),
    draw:
      k === 1
        ? draw
        : (c, v, fr, h) => {
            c.save();
            c.scale(k, k);
            draw(c, v, fr, h);
            c.restore();
          },
  };
}

const S: WorksSheet = 'C';
const PARTS_OF = (hall: HallKind, fp: { filter: [number, number]; moulds: [number, number]; h: number }): WorksEntry[] => [
  // the bag-house filter beside the hall's west wall: still / shimmer (heats or pours: a heat haze, never smoke; the lamp lit)
  part(`works.hall.${hall}.filter`, fp.filter, ['still', 'shimmer'], { h: fp.h, k: 0.5 }, (c, v, f) => drawFilter(c, v, hall, f)),
  // 'empty' is the mould on dry sand in its own colours; 'full' (cold) and 'shimmer' (cooling: domed, unnotched, a haze) are
  // the INGOTS ONLY, baked near white, laid over 'empty' at the same anchor and modulated per instance by coolingColour
  part(`works.hall.${hall}.moulds`, fp.moulds, ['empty', 'full', 'shimmer'], { h: 0.4, k: 0.6, tint: MOULD_TINT }, (c, v, f) => drawMoulds(c, v, hall, f)),
  // the charge box at the door: what is charged is shown by its fill (D3), with the charged grade's own pieces; it stands dry
  part(`works.hall.${hall}.charge`, [1.6, 1.2], ['empty', 'part', 'full'], { h: 1, k: 0.6 }, (c, v, f) => drawCharge(c, v, hall, f)),
];

/** The drums' label slot at true size (points round the anchor), scaled by the entry's k in `part`. */
const LABEL = drumsLabel({ ppm: 40, tilt: TILT, lift: LIFT });

/** Each hall's filter, moulds, charge box and slag skip; the depollution bay's sealed drums (world 1.2). */
export const WORKS_HALL_PARTS: WorksEntry[] = [
  ...PARTS_OF('rotary', { filter: [3.5, 4], moulds: [4, 1], h: 6 }),
  ...PARTS_OF('induction', { filter: [3, 3], moulds: [3, 1], h: 5 }),
  ...PARTS_OF('copper', { filter: [4, 4], moulds: [3, 1], h: 6 }),
  // covered slag skips by each hall (static: no state carries a fill): the salt-slag skip, the dross pan, the slag pot
  part('works.slagSkip.rotary', [1.6, 1], ['idle'], { h: 1, k: 0.75 }, (c, v) => drawSlagSkip(c, v, 'rotary')),
  part('works.slagSkip.induction', [1.2, 0.8], ['idle'], { h: 0.6, k: 0.75 }, (c, v) => drawSlagSkip(c, v, 'induction')),
  part('works.slagSkip.copper', [1.2, 1.2], ['idle'], { h: 1, k: 0.75 }, (c, v) => drawSlagSkip(c, v, 'copper')),
  // sealed, labelled drums on a spill pallet at the depollution bay (the label is a slot: the caller's words)
  part('works.drums', [1.2, 0.6], ['idle'], { h: 0.9, k: 0.75, slots: { label: LABEL } }, (c, v) => drawDrums(c, v)),
];
