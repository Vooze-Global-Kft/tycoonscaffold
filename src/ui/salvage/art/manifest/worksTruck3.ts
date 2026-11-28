/**
 * Manifest part "worksTruck3" (sheet D; drawn by ART-TRUCK3 in ../truck3.draw.ts): the three-axle hook-lift, the
 * one truck's body once truckBridge is owned (2.20, D1: no second truck): a longer cab and three axles, driving in 8
 * headings, the hook and tip frames at the headings it stands at for them (east and west), and the garage's and the
 * plumber's skip loads, trial and full.
 *
 * ART-TRUCK3 (batch 1a) drew it: the placeholders of C-ART are gone; ids, groups, sheet D, frames (by name, in order),
 * headings, mirrorWest and the bake scale are C-ART's. The bounds are MEASURED on the drawing (ink + 2 pt at the baked size,
 * `MEASURE=1 npx tsx scripts/art/yard-sheets.ts <out> works-truck3` prints the table below). Bake scales: the truck at the
 * first yard's TRUCK_K (0.38), its loads at the first yard's VEHICLE_K (0.45), so both trucks and both skips' loads stand at
 * one density beside each other. Anchor: the truck's footprint centre on the ground, the hook and tip frames too (the world
 * draws them at the truck's own place: no jump from driving to hooking). Footprint: the truck's true ground outline
 * (6.2 x 2.4 m) for the body, the bare body, the hook and the tip pictures (C-ART had 8.5 m for the hook, centred on the
 * truck and skip together: the hook picture's anchor is the truck's, and the skip on the ground behind it is in the
 * picture's measured bounds, which the world turns into its vehicle box).
 * Checked by src/ui/salvage/art/sheets.hash.test.ts (every frame at every baked heading inside its box; C and D fit
 * 2048 x 2048 at density 2) and judged on `npx tsx scripts/art/yard-sheets.ts <out> works-truck3 budget-D`.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { YARD } from '../palette';
import { fill, rect, type View3q } from '../pen';
import {
  BRIDGE,
  BRIDGE_HOOK_FRAMES,
  BRIDGE_LOADS,
  BRIDGE_TIP_FRAMES,
  drawBridgeHook,
  drawBridgeLoad,
  drawBridgeTip,
  drawBridgeTruck,
  headingRad,
} from '../truck3.draw';
import type { Bounds, WorksEntry, WorksSheet } from './index';

type Draw = (c: SkCanvas, v: View3q, frame: number, heading: number) => void;
const B = (x: number, y: number, w: number, h: number): Bounds => ({ x, y, w, h });
/** The cell of a heading the entry is never drawn at (a 4-heading entry used only east and west): a dot. */
const TINY = B(-3, -3, 6, 6);
const tiny: Draw = (c) => c.drawPath(rect(-2, -2, 4, 4), fill(YARD.hivisDark));

/** The truck bakes at the first yard's TRUCK_K (manifest/people.ts), its skip loads at the first yard's VEHICLE_K. */
export const TRUCK3_K = 0.38;
export const TRUCK3_LOAD_K = 0.45;

// boxes measured on the BAKED drawing (points round the anchor at the bake scale, ink + 2 pt), per baked heading
/* MEASURED-START */
const BOX: Record<string, Bounds[]> = {
  'vehicle.truckBridge': [B(-21, -56, 42, 88), B(-48, -54, 97, 84), B(-49, -41, 99, 56), B(-47, -56, 96, 87), B(-21, -56, 42, 89)],
  'vehicle.truckBridge.bare': [B(-21, -46, 42, 78), B(-48, -45, 97, 75), B(-49, -41, 99, 56), B(-47, -56, 96, 87), B(-21, -56, 42, 89)],
  'vehicle.truckBridge.hook': [B(-114, -41, 164, 56)],
  'vehicle.truckBridge.tip': [B(-67, -59, 117, 74)],
  'vehicle.skip.load.bridge': [B(-18, -13, 36, 21)],
};
/* MEASURED-END */

const union = (bs: readonly Bounds[]): Bounds => {
  const x0 = Math.min(...bs.map((b) => b.x));
  const y0 = Math.min(...bs.map((b) => b.y));
  const x1 = Math.max(...bs.map((b) => b.x + b.w));
  const y1 = Math.max(...bs.map((b) => b.y + b.h));
  return B(x0, y0, x1 - x0, y1 - y0);
};

const baked = (k: number, draw: Draw): Draw => (c, v, f, h) => {
  c.save();
  c.scale(k, k);
  draw(c, v, f, h);
  c.restore();
};

/** A driving body: 8 headings, 0..4 baked, 5..7 the mirrors of 3..1 (the first yard's rule). */
function driving(id: string, frame: string, skip: 'on' | 'none'): WorksEntry {
  const bh = BOX[id];
  return {
    id,
    group: 'vehicle',
    sheet: S,
    footprint: { w: BRIDGE.len, d: BRIDGE.wid },
    bounds: union(bh),
    boundsByHeading: bh,
    frames: [frame],
    headings: 8,
    mirrorWest: true,
    drawScale: 1 / TRUCK3_K,
    draw: baked(TRUCK3_K, (c, v, _f, h) => drawBridgeTruck(c, v, headingRad(h), { skip })),
  };
}

/** A standing picture at east only (baked heading 1 of 4; west is its mirror; south and north are TINY, never drawn). */
function eastOnly(id: string, frames: readonly string[], draw: Draw): WorksEntry {
  const b = BOX[id][0];
  return {
    id,
    group: 'vehicle',
    sheet: S,
    footprint: { w: BRIDGE.len, d: BRIDGE.wid },
    bounds: b,
    boundsByHeading: [TINY, b, TINY],
    frames,
    headings: 4,
    mirrorWest: true,
    drawScale: 1 / TRUCK3_K,
    draw: (c, v, f, h) => (h === 1 ? baked(TRUCK3_K, draw)(c, v, f, h) : tiny(c, v, f, h)),
  };
}

const S: WorksSheet = 'D';

/** The one truck's second body: the three-axle hook-lift (FrameTruck.model 'truckBridge'), and its partners' loads. */
export const WORKS_TRUCK3: WorksEntry[] = [
  // driving, its skip on: 8 headings (west mirrored)
  driving('vehicle.truckBridge', 'drive', 'on'),
  // driving with no skip
  driving('vehicle.truckBridge.bare', 'drive', 'none'),
  // the skip pulled on (hook1 -> hook4) and set off (hook4 -> hook1) at a partner's site, on the lane: east baked, west mirrored
  eastOnly('vehicle.truckBridge.hook', ['hook1', 'hook2', 'hook3', 'hook4'], (c, v, f) => drawBridgeHook(c, v, BRIDGE_HOOK_FRAMES[f])),
  // tipping at the floor's stop (heading west there: east baked, west mirrored)
  eastOnly('vehicle.truckBridge.tip', ['tip1', 'tip2', 'tip3'], (c, v, f) => drawBridgeTip(c, v, BRIDGE_TIP_FRAMES[f])),
  // the bridge partners' skip loads (as vehicle.skip.load's frames farm-trial ...): drawn into the skip's open top
  {
    id: 'vehicle.skip.load.bridge',
    group: 'vehicle',
    sheet: S,
    footprint: { w: 1.6, d: 1 },
    bounds: BOX['vehicle.skip.load.bridge'][0],
    frames: ['garage-trial', 'garage-full', 'plumbing-trial', 'plumbing-full'],
    headings: 1,
    drawScale: 1 / TRUCK3_LOAD_K,
    draw: baked(TRUCK3_LOAD_K, (c, v, f) => drawBridgeLoad(c, v, BRIDGE_LOADS[f])),
  },
];
