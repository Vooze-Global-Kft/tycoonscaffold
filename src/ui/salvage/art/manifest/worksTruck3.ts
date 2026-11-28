/**
 * Manifest part "worksTruck3" (sheet D; drawn by ART-TRUCK3 in ../truck3.draw.ts): the three-axle hook-lift, the
 * one truck's body once truckBridge is owned (2.20, D1: no second truck): a longer cab and three axles, driving in 8
 * headings, the hook and tip frames at the headings it stands at for them (east and west), and the garage's and the
 * plumber's skip loads, trial and full.
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
import { stencil, stencilWidth } from '../letters';
import { YARD } from '../palette';
import { facePath, fill, proj, rect, stroke, type View3q } from '../pen';
import type { Bounds, WorksEntry, WorksSheet } from './index';

// -----------------------------------------------------------------------------------------------------
// The placeholder kit (C-ART; the same few lines in every works part, so each art package owns its whole file and
// drops them when its last entry is drawn). Pure Skia; nothing here is read by the first yard.
// -----------------------------------------------------------------------------------------------------
type Draw = (c: SkCanvas, v: View3q, frame: number, heading: number) => void;
const PPM = 40;
const TILT = 0.7;
const LIFT = Math.sqrt(1 - TILT * TILT);
const B = (x: number, y: number, w: number, h: number): Bounds => ({ x, y, w, h });
/** The cell of a heading the entry is never drawn at (a 4-heading entry used only east and west): a dot. */
const TINY = B(-3, -3, 6, 6);

interface Spec {
  /** height in metres (the box's top; with the low sun's shadow to the east) */
  h: number;
  /** baked at k of true size (drawScale 1/k), as the first yard's statics (plant.ts `entry`) */
  k?: number;
  headings?: 1 | 4 | 8;
  mirrorWest?: boolean;
  tint?: string;
  /** slots as fractions of the baked box [fx, fy, fw, fh] (the art package places them exactly) */
  slots?: Record<string, [number, number, number, number]>;
  /** the baked headings drawn in full; any other baked heading is a TINY cell (never drawn by the world) */
  only?: number[];
  /** false for an actor (a vehicle, a person): its ground shadow is the world's (sheet S), not the sprite's */
  sun?: boolean;
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

const bakedOf = (headings: 1 | 4 | 8, mirrorWest: boolean): number[] =>
  mirrorWest && headings === 4 ? [0, 1, 2] : mirrorWest && headings === 8 ? [0, 1, 2, 3, 4] : Array.from({ length: headings }, (_, i) => i);

/** A labelled placeholder: the footprint on the ground, the baked box, the entry's name, a dot per frame, the heading. */
function placeholder(b: Bounds, w: number, d: number, k: number, label: string, headings: number): Draw {
  return (c, v, frame, heading) => {
    c.save();
    c.clipRect({ x: b.x + 0.5, y: b.y + 0.5, width: b.w - 1, height: b.h - 1 }, 1, true);
    const fp = facePath(v, [[-w / 2 * k, -d / 2 * k, 0], [w / 2 * k, -d / 2 * k, 0], [w / 2 * k, d / 2 * k, 0], [-w / 2 * k, d / 2 * k, 0]]);
    c.drawPath(fp, fill(YARD.hivisLight, 0.55));
    c.drawPath(fp, stroke(YARD.ink, 0.8));
    c.drawPath(rect(b.x + 1.5, b.y + 1.5, b.w - 3, b.h - 3), stroke(YARD.hivisDark, 1));
    const size = Math.min(9, (b.h - 8) / 2.5, (b.w - 8) / Math.max(1, stencilWidth(label, 1)));
    if (size >= 2.5) stencil(c, label, b.x + b.w / 2, b.y + b.h / 2 - size / 2, size, YARD.ink, { align: 'center' });
    for (let i = 0; i <= frame && i < 12; i++) c.drawPath(rect(b.x + 3 + i * 3, b.y + 3, 2, 2), fill(YARD.ink));
    if (headings > 1) {
      const a = (heading * 2 * Math.PI) / headings;
      const r = Math.min(b.w, b.h) * 0.3;
      const [x0, y0] = proj(v, 0, 0, 0);
      c.drawPath(rect(x0 + Math.sin(a) * r - 1.5, y0 + Math.cos(a) * r * TILT - 1.5, 3, 3), fill(YARD.skip));
    }
    c.restore();
  };
}

/** One works entry with its final id, frames, headings and anchor, and a placeholder of its footprint's box. */
function wk(sheet: WorksSheet, id: string, group: string, fp: [number, number], frames: readonly string[], s: Spec): WorksEntry {
  const k = s.k ?? 1;
  const headings = s.headings ?? 1;
  const mirrorWest = s.mirrorWest ?? false;
  const bounds = boxOf(fp[0], fp[1], s.h, k, headings > 1 && !s.only, s.sun ?? true);
  const label = id.replace(/^(works|vehicle|person|thing|lane|ui|piece|plant)\./, '').replace(/\./g, ' ').toUpperCase();
  const full = placeholder(bounds, fp[0], fp[1], k, label, headings);
  const only = s.only;
  const tiny: Draw = (c) => c.drawPath(rect(-2, -2, 4, 4), fill(YARD.hivisDark));
  const slots = s.slots && Object.fromEntries(Object.entries(s.slots).map(([n, [fx, fy, fw, fh]]) => [n, B(bounds.x + fx * bounds.w, bounds.y + fy * bounds.h, fw * bounds.w, fh * bounds.h)]));
  return {
    id,
    group,
    sheet,
    footprint: { w: fp[0], d: fp[1] },
    bounds,
    ...(only ? { boundsByHeading: bakedOf(headings, mirrorWest).map((h) => (only.includes(h) ? bounds : TINY)) } : {}),
    frames,
    headings,
    ...(mirrorWest ? { mirrorWest } : {}),
    ...(s.tint ? { tint: s.tint } : {}),
    ...(k !== 1 ? { drawScale: 1 / k } : {}),
    ...(slots ? { slots } : {}),
    draw: only ? (c, v, f, h) => (only.includes(h) ? full(c, v, f, h) : tiny(c, v, f, h)) : full,
  };
}

const S: WorksSheet = 'D';

/** The one truck's second body: the three-axle hook-lift (FrameTruck.model 'truckBridge'), and its partners' skips. */
export const WORKS_TRUCK3: WorksEntry[] = [
  // driving, a skip on: 8 headings (west mirrored)
  wk(S, 'vehicle.truckBridge', 'vehicle', [6.2, 2.4], ['drive'], { sun: false, h: 3.2, k: 0.38, headings: 8, mirrorWest: true }),
  // driving with no skip
  wk(S, 'vehicle.truckBridge.bare', 'vehicle', [6.2, 2.4], ['drive'], { sun: false, h: 3, k: 0.38, headings: 8, mirrorWest: true }),
  // the skip pulled on and set off by the hook at a partner's site (on the lane: east baked, west mirrored); the south and
  // north cells are TINY (never drawn: the truck is never forced east, and never hooks facing north or south)
  wk(S, 'vehicle.truckBridge.hook', 'vehicle', [8.5, 2.4], ['hook1', 'hook2', 'hook3', 'hook4'], { sun: false, h: 3.6, k: 0.38, headings: 4, mirrorWest: true, only: [1] }),
  // tipping at the floor's stop (heading west there: east baked, west mirrored)
  wk(S, 'vehicle.truckBridge.tip', 'vehicle', [6.2, 2.4], ['tip1', 'tip2', 'tip3'], { sun: false, h: 4.6, k: 0.38, headings: 4, mirrorWest: true, only: [1] }),
  // the bridge partners' skip loads (as vehicle.skip.load's frames farm-trial ...): drawn into the skip's open top
  wk(S, 'vehicle.skip.load.bridge', 'vehicle', [1.6, 1], ['garage-trial', 'garage-full', 'plumbing-trial', 'plumbing-full'], { h: 0.6, k: 0.45 }),
];
