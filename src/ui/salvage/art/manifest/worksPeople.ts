/**
 * Manifest part "worksPeople" (sheet D; drawn by ART-PEOPLE in ../visitors.draw.ts and, for the boss's tool, an
 * additive tool in ../people.draw.ts): visitors of the Yard sale (only inside the railed public bay), the boss's plasma and
 * analyse poses (Pose 'plasma' | 'analyse'), the reclamation dealer's van, the plasma unit on its rack.
 *
 * ART-PEOPLE (batch 1b) drew them (../visitors.draw.ts; the boss's two poses are ../people.draw.ts with its additive option
 * `tool`): ids, sheet, headings and anchors are C-ART's; the visitor's frames grew from C-ART's six by push (4) and carry
 * (4), appended; the boss's poses bake s, e and n only (1 and 3 are TINY: the actor table asks h x 2); bounds are measured.
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
import { YARD } from '../palette';
import { fill, rect, type View3q } from '../pen';
import { VISITOR_BASE, VISITOR_FRAMES, drawBossAnalyse, drawBossPlasma, drawDealerVan, drawPlasmaRack, drawVisitor, vanHeadingRad, visitorPoseOf } from '../visitors.draw';
import type { Bounds, WorksEntry, WorksSheet } from './index';

type Draw = (c: SkCanvas, v: View3q, frame: number, heading: number) => void;
const B = (x: number, y: number, w: number, h: number): Bounds => ({ x, y, w, h });
/** The cell of a heading the entry is never drawn at (the boss's works poses are asked at s, e, n only): a dot. */
const TINY = B(-3, -3, 6, 6);
const tiny: Draw = (c) => c.drawPath(rect(-2, -2, 4, 4), fill(YARD.hivisDark));

// MEASURED BOUNDS (ink at the baked size plus a 2 pt margin, one box per BAKED heading; TINY cells listed as [-3, -3, 6, 6]:
// `flock /tmp/itf-heavy.lock npx tsx scripts/art/yard-sheets.ts <dir> works-people` prints this table and says FAIL when
// a drawing leaves it; WRITE_BOUNDS=1 writes it here)
// prettier-ignore
const MEASURED: Record<string, [number, number, number, number][]> = {
};
// END MEASURED BOUNDS

/** The dealer's van bakes as the first yard's vans (people.ts VEHICLE_K). */
export const DEALER_VAN_K = 0.45;

const union = (bs: readonly Bounds[]): Bounds => {
  const real = bs.filter((b) => b !== TINY && !(b.w === 6 && b.h === 6 && b.x === -3));
  const xs = real.length ? real : bs;
  const x = Math.min(...xs.map((b) => b.x));
  const y = Math.min(...xs.map((b) => b.y));
  return B(x, y, Math.max(...xs.map((b) => b.x + b.w)) - x, Math.max(...xs.map((b) => b.y + b.h)) - y);
};
const measured = (id: string, n: number, fallback: Bounds[]): Bounds[] => {
  const m = MEASURED[id];
  return m && m.length === n ? m.map(([x, y, w, h]) => B(x, y, w, h)) : fallback;
};
const scaled =
  (k: number, draw: Draw): Draw =>
  (c, v, f, h) => {
    c.save();
    c.scale(k, k);
    draw(c, v, f, h);
    c.restore();
  };

const S: WorksSheet = 'D';
/** The 8-scheme's baked headings 0 s, 2 e, 4 n as a person's direction (1 and 3 are TINY for the boss's poses). */
const DIR8: Record<number, 's' | 'e' | 'n'> = { 0: 's', 2: 'e', 4: 'n' };

const PERSON_FB = [B(-24, -64, 48, 70), B(-24, -64, 48, 70), B(-24, -64, 48, 70), B(-24, -64, 48, 70), B(-24, -64, 48, 70)];
const visitorBoxes = measured('person.visitor', 5, PERSON_FB);
const plasmaBoxes = measured('person.boss.plasma', 5, [B(-40, -66, 80, 80), TINY, B(-40, -66, 80, 80), TINY, B(-40, -66, 80, 80)]);
const analyseBoxes = measured('person.boss.analyse', 5, [B(-24, -60, 48, 66), TINY, B(-24, -60, 48, 66), TINY, B(-24, -60, 48, 66)]);
const vanBoxes = measured('vehicle.van.dealer', 3, [B(-40, -50, 80, 70), B(-60, -50, 120, 70), B(-40, -50, 80, 70)]);
const rackBox = measured('works.plasma.rack', 1, [B(-24, -50, 48, 60)]);

/** Visitors, the boss's new poses, the dealer's van and the plasma unit's rack. */
export const WORKS_PEOPLE: WorksEntry[] = [
  // a member of the public (no vest, no hard hat): jacket baked near white and tinted per visitor (visitors.draw
  // VISITOR_TINTS; the dealer's two people DEALER_TINT); walk 4, stand, pay (C-ART's six) and, appended, push 4 (a sack
  // truck's grip: the first yard's carrier.sack at CARRIER_AHEAD) and carry 4 (a boxed buy in both arms, baked in);
  // 8 headings, s se e ne n baked from one turned body, west mirrored
  {
    id: 'person.visitor',
    group: 'person',
    sheet: S,
    footprint: { w: 0.6, d: 0.5 },
    bounds: union(visitorBoxes),
    boundsByHeading: visitorBoxes,
    frames: VISITOR_FRAMES,
    headings: 8,
    mirrorWest: true,
    tint: VISITOR_BASE,
    draw: (c, v, f, h) => {
      const { pose, step } = visitorPoseOf(f);
      drawVisitor(c, v, h, pose, step);
    },
  },
  // the boss with the plasma cutter (dark visor down; the lead to the unit on its trolley beside him; a bright arc point
  // and a short fan of molten spray): cut1, cut2 at s, e, n (the actor table asks 8-scheme h x 2: 0, 2, 4, and 6 mirrored)
  {
    id: 'person.boss.plasma',
    group: 'person',
    sheet: S,
    footprint: { w: 1.2, d: 0.8 },
    bounds: union(plasmaBoxes),
    boundsByHeading: plasmaBoxes,
    frames: ['cut1', 'cut2'],
    headings: 8,
    mirrorWest: true,
    draw: (c, v, f, h) => (DIR8[h] ? drawBossPlasma(c, v, DIR8[h], f) : tiny(c, v, f, h)),
  },
  // the boss holding the analyser to the sample at the scale house's window (never pointed at a person): s, e, n
  {
    id: 'person.boss.analyse',
    group: 'person',
    sheet: S,
    footprint: { w: 0.6, d: 0.5 },
    bounds: union(analyseBoxes),
    boundsByHeading: analyseBoxes,
    frames: ['hold'],
    headings: 8,
    mirrorWest: true,
    draw: (c, v, f, h) => (DIR8[h] ? drawBossAnalyse(c, v, DIR8[h]) : tiny(c, v, f, h)),
  },
  // the reclamation dealer's van (the first yard's panel van, body baked near white for DEALER_TINT) with its rear doors
  // shut (driving, a driver in the cab) or swung open (standing on the kerb, the load space showing)
  {
    id: 'vehicle.van.dealer',
    group: 'vehicle',
    sheet: S,
    footprint: { w: 3.4, d: 1.8 },
    bounds: union(vanBoxes),
    boundsByHeading: vanBoxes,
    frames: ['shut', 'open'],
    headings: 4,
    mirrorWest: true,
    tint: VISITOR_BASE,
    drawScale: 1 / DEALER_VAN_K,
    draw: scaled(DEALER_VAN_K, (c, v, f, h) => drawDealerVan(c, v, vanHeadingRad(h), f === 1)),
  },
  // the plasma unit on its trolley at the tool rack once owned (a fixture; its own small shadow, as a static)
  {
    id: 'works.plasma.rack',
    group: 'plant',
    sheet: S,
    footprint: { w: 0.6, d: 0.5 },
    bounds: rackBox[0],
    frames: ['idle'],
    headings: 1,
    draw: (c, v) => drawPlasmaRack(c, v),
  },
];
