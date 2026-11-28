/**
 * Manifest part "worksStore" (sheet C; drawn by ART-STORE in ../worksStore.draw.ts): the works bunkers (worksBays,
 * x -35 to -2, eleven 3 m lock-block bunkers) and their heaps for the grades a sold flow makes (bzs, ss, ssu, shred), the
 * lean-to roof, the works stillages' layers (bzi, cui, bzd) and big bags (dust), and the roofs over the stillages.
 *
 * C-ART (PLAN2 2.7, batch 0b) put every entry in with its final id, group, sheet, frames and anchor; ART-STORE (batch 0e)
 * replaced the placeholders with the drawings and measured the bounds from their ink. Ids, frames, headings and anchors
 * are C-ART's; the heaps' footprint became 2.2 x 3.1 (the bunker's inner width; a depth that sorts a heap just after its
 * bunker at the same anchor: see WORKS_STORE). Anchor: the footprint's centre on the ground. No words in a sprite: the
 * bunker's plate is blank, its `code` slot is where the caller paints a SOLD grade's code. Nothing of a dark item (a
 * machine or grade that is not sold) is drawn: there is no heap, layer or look for one.
 * Checked by src/ui/salvage/art/sheets.hash.test.ts (every frame inside its box; C and D fit 2048 x 2048 at density 2),
 * scripts/art/works/works-store.ts (the sheet, the bounds, the blank plate, no dark grade) and budget-C.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import type { View3q } from '../pen';
import {
  BUNKER_HEAPS,
  FIRST_STILLAGES_ROOF,
  LEANTO,
  STILLAGES_ROOF,
  WORKS_LAYERS,
  bunkerPlate,
  drawBigBags,
  drawBunker,
  drawBunkerHeap,
  drawCanopy,
  drawWorksLayer,
} from '../worksStore.draw';
import type { Bounds, WorksEntry, WorksSheet } from './index';

type Draw = (c: SkCanvas, v: View3q, frame: number, heading: number) => void;
const B = (x: number, y: number, w: number, h: number): Bounds => ({ x, y, w, h });
const V: View3q = { ppm: 40, tilt: 0.7, lift: Math.sqrt(1 - 0.49) };

// MEASURED BOUNDS (ink at the baked size plus a 2 pt margin: `npx tsx scripts/art/yard-sheets.ts <dir> works-store` prints
// this table and says FAIL when a drawing leaves it; paste its lines here after changing a drawing)
// prettier-ignore
const MEASURED: Record<string, [number, number, number, number]> = {
  'works.bunker': [-60, -60, 138, 93],
  'plant.heap.bzs': [-24, -20, 50, 42],
  'plant.heap.ss': [-24, -20, 50, 42],
  'plant.heap.ssu': [-24, -21, 50, 43],
  'plant.heap.shred': [-24, -22, 50, 44],
  'works.leanto.roof': [-100, -75, 213, 98],
  'works.stillages.roof': [-71, -75, 142, 98],
  'stillages.roof': [-76, -60, 165, 78],
  'works.stillage.layer.bzi': [-22, -23, 44, 33],
  'works.stillage.layer.cui': [-21, -25, 44, 36],
  'works.stillage.layer.bzd': [-27, -21, 52, 26],
  'works.bigbags': [-22, -32, 58, 46],
};
// END MEASURED BOUNDS

/** Bake scales (drawScale 1/k): the bunkers as the first yard's bays (0.75), heaps 0.5, roofs 0.4 (C-ART's budget, errata 5). */
const BUNKER_K = 0.75;
const HEAP_K = 0.5;
const ROOF_K = 0.4;
const BAGS_K = 0.75;

/**
 * One works store entry: the drawing at true size scaled by k (drawScale 1/k), its bounds measured from its ink at that
 * size (MEASURED; `fallback`, in true-size points, until measured), its slots in true-size points scaled by k.
 */
function st(
  id: string,
  group: string,
  fp: [number, number],
  frames: readonly string[],
  k: number,
  fallback: Bounds,
  draw: Draw,
  slots?: Record<string, Bounds>,
): WorksEntry {
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
  const sk = slots && Object.fromEntries(Object.entries(slots).map(([n, b]) => [n, B(b.x * k, b.y * k, b.w * k, b.h * k)]));
  return {
    id,
    group,
    sheet: S,
    footprint: { w: fp[0], d: fp[1] },
    bounds: m ? B(m[0], m[1], m[2], m[3]) : B(Math.floor(fallback.x * k), Math.floor(fallback.y * k), Math.ceil(fallback.w * k) + 1, Math.ceil(fallback.h * k) + 1),
    frames,
    headings: 1,
    ...(k !== 1 ? { drawScale: 1 / k } : {}),
    ...(sk ? { slots: sk } : {}),
    draw: scaled,
  };
}

const S: WorksSheet = 'C';
const one = ['idle'] as const;

/** The code plate's slot on the bunker's back wall (true size: the first yard's plate, 40 x 16 points, plant.bay's `code`). */
const PLATE_SLOT = (() => {
  const [x, y] = bunkerPlate(V);
  return B(x - 20, y - 8, 40, 16);
})();

/**
 * The works' bunkers and stillages, their heaps and layers, and the roofs over what feeds a hall (world 1.2).
 *
 * HOW THE WORLD DRAWS THEM (WLD-PLANT): a bunker at each of worksBays' eleven 3 m slots (x0 + 1.5 + 3 i, its centre y);
 * a sold grade's heap (part or full by share; NOTHING for an empty bunker or a grade that is not sold) at THE BUNKER'S
 * OWN ANCHOR: its footprint (2.2 x 3.1) sorts it just after its bunker (south edge 1.55 m against 1.5), so it lies in front
 * of the back wall and between the dividers, whose faces it never covers; the code plate's words in the bunker's `code`
 * slot only for a sold grade (the plate is drawn blank). A works stillage is the first yard's plant.stillage cage, one or
 * two works.stillage.layer.<grade> (the second STILLAGE_LAYER_DY up) and plant.stillage.front, at one anchor; big bags
 * stand alone at their slot. Each roof at its content rect's centre (worksTable.ts worksRoofSpots).
 */
export const WORKS_STORE: WorksEntry[] = [
  // one 3 m lock-block bunker of worksBays (eleven side by side, 1.2 m of blocks); its blank code plate's slot is `code`
  st('works.bunker', 'plant', [3, 3], one, BUNKER_K, B(-95, -100, 210, 165), (c, v) => drawBunker(c, v), { code: PLATE_SLOT }),
  // the heaps of the four grades a SOLD flow brings to a bunker (an empty bunker draws no heap): part, full by share
  ...BUNKER_HEAPS.map((g) => st(`plant.heap.${g}`, 'heap', [2.2, 3.1], ['part', 'full'], HEAP_K, B(-55, -90, 120, 125), (c, v, f) => drawBunkerHeap(c, v, g, f === 1))),
  // the lean-to roof over the bunkers x -35 to -23 (map.works.roofs worksBays.roof 12 x 3.4); see-through under it
  st('works.leanto.roof', 'roof', [12, 3.4], one, ROOF_K, B(-250, -200, 520, 260), (c, v) => drawCanopy(c, v, LEANTO)),
  // the works stillages' roof (map.works.roofs worksStillages.roof 8.4 x 3.4)
  st('works.stillages.roof', 'roof', [8.4, 3.4], one, ROOF_K, B(-180, -200, 380, 260), (c, v) => drawCanopy(c, v, STILLAGES_ROOF)),
  // the first yard's stillage block, roofed from the works' opening (stillages.roof 9 x 2.5; T5: what feeds a hall is covered)
  st('stillages.roof', 'roof', [9, 2.5], one, ROOF_K, B(-195, -170, 410, 220), (c, v) => drawCanopy(c, v, FIRST_STILLAGES_ROOF)),
  // a stillage's layer of pieces (as plant.stillage.layer.bri): bronze ingot (notched, stamped), refined copper ingot, bronze dross
  ...WORKS_LAYERS.map((g) => st(`works.stillage.layer.${g}`, 'plant', [1.2, 1], one, 1, B(-30, -40, 64, 55), (c, v) => drawWorksLayer(c, v, g))),
  // zinc filter dust in big bags on a pallet (never an open heap, T3): one bag, two bags
  st('works.bigbags', 'plant', [1.4, 1.2], ['one', 'two'], BAGS_K, B(-40, -75, 95, 100), (c, v, f) => drawBigBags(c, v, f === 1)),
];

/** For the part's sheet and tests: where the bunker's plate is, at the baked size (the `code` slot). */
export const BUNKER_PLATE_SLOT = (): Bounds => B(PLATE_SLOT.x * BUNKER_K, PLATE_SLOT.y * BUNKER_K, PLATE_SLOT.w * BUNKER_K, PLATE_SLOT.h * BUNKER_K);
