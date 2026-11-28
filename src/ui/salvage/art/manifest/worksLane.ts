/**
 * Manifest part "worksLane" (sheet D; drawn by ART-LANE in ../worksLane.draw.ts): the lane drawn on to 520 m from the
 * works' opening: the garage's and the plumber's sites (content map.works.lane garage_m, plumbing_m) and the bridge's new
 * sign face. Sheet B's lane art stays the first yard's.
 *
 * C-ART (PLAN2 2.7, batch 0b) put every entry in with its final id, group, sheet, frames and anchor; ART-LANE (batch 1b)
 * replaced the placeholders with the drawings and measured the bounds from their ink. Ids, frames, headings and anchors are
 * C-ART's; the plumber's footprint became 14 x 8 like the garage's (the lane's hedge leaves a 14 m gap round a site,
 * actors.ts laneItems). Anchor: the footprint's centre on the ground; the site's south edge on the lane's north edge (see
 * worksLane.draw.ts' head for the layout and the strip kept clear for the skip zone). No words in a sprite: each site's
 * fascia carries the partner's mark and a blank face, its `sign` slot, where the caller writes the register's name; the
 * axle sign's lower half is blank, its `value` slot, for the limit. Nothing dark is drawn.
 * Checked by src/ui/salvage/art/sheets.hash.test.ts (every frame inside its box; C and D fit 2048 x 2048 at density 2),
 * scripts/art/works/works-lane.ts (the sheet, the bounds, the blank slots, the clear skip strip) and budget-D.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import type { View3q } from '../pen';
import { SITE, axleValueSlot, drawAxleSign, drawGarageSite, drawPlumbingSite, garageSignSlot, plumbingSignSlot } from '../worksLane.draw';
import type { Bounds, WorksEntry, WorksSheet } from './index';

type Draw = (c: SkCanvas, v: View3q, frame: number, heading: number) => void;
const B = (x: number, y: number, w: number, h: number): Bounds => ({ x, y, w, h });
const V: View3q = { ppm: 40, tilt: 0.7, lift: Math.sqrt(1 - 0.49) };

// MEASURED BOUNDS (ink at the baked size plus a 2 pt margin: `npx tsx scripts/art/yard-sheets.ts <dir> works-lane` prints
// this table and says FAIL when a drawing leaves it; WRITE_BOUNDS=1 writes it here)
// prettier-ignore
const MEASURED: Record<string, [number, number, number, number]> = {
};
// END MEASURED BOUNDS

/** Bake scales (drawScale 1/k): the sites as the first yard's lane (plant.ts LANE 0.5); the sign at full size (its pictogram is small). */
const SITE_K = 0.5;
const SIGN_K = 1;

/** One lane entry: drawn at true size scaled by k, bounds measured at that size (`fallback` in true-size points until then). */
function ln(id: string, fp: [number, number], k: number, fallback: Bounds, draw: Draw, slots: Record<string, Bounds>): WorksEntry {
  const m = MEASURED[id];
  const scaled: Draw =
    k === 1
      ? draw
      : (c, v, f, h) => {
          c.save();
          c.scale(k, k);
          draw(c, v, f, h);
          c.restore();
        };
  return {
    id,
    group: 'lane',
    sheet: S,
    footprint: { w: fp[0], d: fp[1] },
    bounds: m ? B(m[0], m[1], m[2], m[3]) : B(Math.floor(fallback.x * k), Math.floor(fallback.y * k), Math.ceil(fallback.w * k) + 1, Math.ceil(fallback.h * k) + 1),
    frames: ['idle'],
    headings: 1,
    ...(k !== 1 ? { drawScale: 1 / k } : {}),
    slots: Object.fromEntries(Object.entries(slots).map(([n, b]) => [n, B(b.x * k, b.y * k, b.w * k, b.h * k)])),
    draw: scaled,
  };
}

const S: WorksSheet = 'D';
const box4 = ([x, y, w, h]: [number, number, number, number]): Bounds => B(x, y, w, h);

/**
 * The bridge partners' sites past the bridge and the bridge's axle-weight sign.
 *
 * HOW THE WORLD DRAWS THEM (WLD-GROUND): each site once, at x = the gate + its lane distance, y = the lane's centre - half
 * the lane's width - SITE.d / 2 (its south edge on the lane's north edge); no lane.sign.partner board for these two (the
 * name goes on the fascia's `sign` slot); the hedge left out within 7 m of the site's x, as for the first yard's sites. The
 * axle sign stands where the first yard's lane.sign.limit stands (the bridge - 3, north verge) and REPLACES it from the
 * works' opening (one sprite or the other, never both); the limit's words in its `value` slot.
 */
export const WORKS_LANE: WorksEntry[] = [
  // the garage: a clad workshop with two roller bays (a car on the lift), tyre stacks, a customer's car on the forecourt
  ln('lane.site.garage', [SITE.w, SITE.d], SITE_K, B(-300, -260, 640, 420), (c, v) => drawGarageSite(c, v), { sign: box4(garageSignSlot(V)) }),
  // the plumber: a rendered trade unit, a rack of stacked pipe, radiators and a bath waiting, the van on the yard
  ln('lane.site.plumbing', [SITE.w, SITE.d], SITE_K, B(-300, -260, 640, 420), (c, v) => drawPlumbingSite(c, v), { sign: box4(plumbingSignSlot(V)) }),
  // the axle-weight sign (T9): the roundel with the axle pictogram; the limit ("10 t") is the caller's, in `value`
  ln('lane.sign.axle10t', [0.6, 0.2], SIGN_K, B(-20, -110, 50, 120), (c, v) => drawAxleSign(c, v), { value: box4(axleValueSlot(V)) }),
];
