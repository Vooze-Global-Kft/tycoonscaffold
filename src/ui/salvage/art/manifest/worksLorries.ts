/**
 * Manifest part "worksLorries" (sheet D; drawn by ART-LORRIES in ../lorries.draw.ts): one vehicle family "crane
 * lorry", a flatbed with a loader crane (never a tow truck, yard-style 11): the garage's recovery truck setting a car on
 * the depollution bay's apron, and the heavy lorry bringing an oversize piece to the pad. Drawn only once its arrival
 * lands in the rules (D2: FIX-PASS writes the arrivals; WLD-VEHICLES2 draws them).
 *
 * ART-LORRIES (batch 1a) drew them (../lorries.draw.ts): ids, sheet and headings are C-ART's; frames of vehicle.cranelorry
 * grew from ['stowed'] to ['stowed', 'car', 'piece'] (a load on the deck while driving is baked into the body, so the cab
 * covers it at the southern headings: one sprite, never two in the wrong order); footprints are the drawn outlines.
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
import { CRANE_FRAMES, LORRY, LORRY_BASE, LORRY_DRIVE, LORRY_RIGGED, LOAD_FRAMES, drawLorryCrane, drawLorryDriving, drawLorryLoadFrame } from '../lorries.draw';
import { YARD } from '../palette';
import { fill, rect, type View3q } from '../pen';
import type { Bounds, WorksEntry, WorksSheet } from './index';

type Draw = (c: SkCanvas, v: View3q, frame: number, heading: number) => void;
const B = (x: number, y: number, w: number, h: number): Bounds => ({ x, y, w, h });
/** The cell of a heading the entry is never drawn at (the crane entry is used facing east and west only): a dot. */
const TINY = B(-3, -3, 6, 6);

// MEASURED BOUNDS (ink at the baked size plus a 2 pt margin, one box per BAKED heading:
// `flock /tmp/itf-heavy.lock npx tsx scripts/art/yard-sheets.ts <dir> works-lorries` prints this table and says FAIL when
// a drawing leaves it; WRITE_BOUNDS=1 writes it here)
// prettier-ignore
const MEASURED: Record<string, [number, number, number, number][]> = {
  'vehicle.cranelorry': [[-23, -52, 46, 87], [-52, -52, 104, 83], [-55, -39, 110, 53], [-52, -58, 104, 89], [-23, -59, 46, 94]],
  'vehicle.cranelorry.crane': [[-55, -74, 110, 100]],
  'vehicle.cranelorry.load': [[-29, -33, 58, 46]],
};
// END MEASURED BOUNDS

/** Bake scales (drawScale 1/k): the lorry as the first yard's hook-lift (TRUCK_K 0.38), the loads as its vehicles (0.45). */
export const LORRY_K = 0.38;
export const LOAD_K = 0.45;

const scaled =
  (k: number, draw: Draw): Draw =>
  (c, v, f, h) => {
    c.save();
    c.scale(k, k);
    draw(c, v, f, h);
    c.restore();
  };

const union = (bs: readonly Bounds[]): Bounds => {
  const x = Math.min(...bs.map((b) => b.x));
  const y = Math.min(...bs.map((b) => b.y));
  return B(x, y, Math.max(...bs.map((b) => b.x + b.w)) - x, Math.max(...bs.map((b) => b.y + b.h)) - y);
};

const measured = (id: string, n: number, fallback: Bounds): Bounds[] => {
  const m = MEASURED[id];
  return m && m.length === n ? m.map(([x, y, w, h]) => B(x, y, w, h)) : Array.from({ length: n }, () => fallback);
};

const S: WorksSheet = 'D';

const driveBoxes = measured('vehicle.cranelorry', 5, B(-80, -90, 160, 150));
const craneBox = measured('vehicle.cranelorry.crane', 1, B(-80, -110, 160, 200))[0];
const craneBoxes = [TINY, craneBox, TINY];
const loadBoxes = measured('vehicle.cranelorry.load', 1, B(-40, -50, 80, 80));

/** The crane lorry family: the garage's recovery truck and the heavy lorry (ArrivalKind recovery, lowLoader). */
export const WORKS_LORRIES: WorksEntry[] = [
  // driving, crane stowed: 8 headings (s ... n baked, west mirrored); frames: the deck empty, a car on it in its wheel-lift
  // frame (the garage's), a sheeted piece on bearers in its sling (the heavy lorry's). Body and crane baked near white
  // and modulated per sender (lorries.draw LORRY_TINTS); the load is not (it is drawn in its own colours under the tint).
  {
    id: 'vehicle.cranelorry',
    group: 'vehicle',
    sheet: S,
    footprint: { w: LORRY.len, d: LORRY.wid },
    bounds: union(driveBoxes),
    boundsByHeading: driveBoxes,
    frames: LORRY_DRIVE,
    headings: 8,
    mirrorWest: true,
    tint: LORRY_BASE,
    drawScale: 1 / LORRY_K,
    draw: scaled(LORRY_K, (c, v, f, h) => drawLorryDriving(c, v, f, h)),
  },
  // standing at its stop on the works road facing east (west mirrored; south and north TINY, never drawn): outriggers down
  // before any lift, the crane swinging the load to the north side (3) or the south side (3), the hook lifted clear after
  // the load is set down. The load is vehicle.cranelorry.load drawn at lorries.draw CRANE_LOAD[frame] in the order
  // LOAD_ORDER[frame] (before: north of the lorry; after: on the deck, over it, or south of it).
  {
    id: 'vehicle.cranelorry.crane',
    group: 'vehicle',
    sheet: S,
    footprint: { w: LORRY_RIGGED.len, d: LORRY_RIGGED.wid },
    bounds: craneBox,
    boundsByHeading: craneBoxes,
    frames: CRANE_FRAMES,
    headings: 4,
    mirrorWest: true,
    tint: LORRY_BASE,
    drawScale: 1 / LORRY_K,
    draw: (c, v, f, h) => (h === 1 ? scaled(LORRY_K, (cc, vv, ff) => drawLorryCrane(cc, vv, ff))(c, v, f, h) : c.drawPath(rect(-2, -2, 4, 4), fill(YARD.hivisDark))),
  },
  // what the standing lorry carries (its base centre at the anchor, facing east): a car in its wheel-lift frame, under a
  // cover or open; a piece sheeted on bearers in its sling; or (obj-open) the sling alone, drawn AFTER the world's
  // thing.<obj> sprite at the same place (an open piece is its own sprite)
  {
    id: 'vehicle.cranelorry.load',
    group: 'vehicle',
    sheet: S,
    footprint: { w: 2.9, d: 1.8 },
    bounds: loadBoxes[0],
    frames: LOAD_FRAMES,
    headings: 1,
    drawScale: 1 / LOAD_K,
    draw: scaled(LOAD_K, (c, v, f) => drawLorryLoadFrame(c, v, f)),
  },
];
