/**
 * Manifest part "worksPlots" (sheet C; drawn by ART-PLOTS in ../worksPlots.draw.ts): the rung-4 plots by WorksLook
 * before and after their purchase (padlock, buyable, arriving, installed: the looks from idle on are the machine's own
 * sprites), each plate's crate on the machine flatbed, and the analyser's cradle. Plates: the sold ones of the content
 * (rotary, induction, copper, shredder; the analyser stands at the scale house). Plots baked at 0.4 (flat ground).
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

const S: WorksSheet = 'C';

/** The plates' plots (only SOLD plates' plots are drawn; the analyser has none: its cradle is a fixture). */
export const WORKS_PLOTS: WorksEntry[] = [
  // the rotary plot: pegged out with the padlock chip, buyable (the price tag is the caller's), arriving (fenced, the crates
  // of the flatbed), installed (the machine in, cold, the commissioning mark)
  wk(S, 'works.plot.rotary.padlock', 'plot', [8.5, 7], ['idle'], { h: 0.5, k: 0.3, slots: { chip: [0.3, 0.2, 0.4, 0.3] } }),
  wk(S, 'works.plot.rotary.buyable', 'plot', [8.5, 7], ['idle'], { h: 0.5, k: 0.3, slots: { tag: [0.3, 0.2, 0.4, 0.3] } }),
  wk(S, 'works.plot.rotary.arriving', 'plot', [8.5, 7], ['idle'], { h: 1, k: 0.3 }),
  wk(S, 'works.plot.rotary.installed', 'plot', [8.5, 7], ['idle'], { h: 0.5, k: 0.3 }),
  // its crate on the machine flatbed: on the deck, slung, set down
  wk(S, 'works.crate.rotary', 'plant', [2.4, 1.6], ['deck', 'slung', 'set'], { h: 1.6, k: 0.45 }),
  // the induction plot: pegged out with the padlock chip, buyable (the price tag is the caller's), arriving (fenced, the crates
  // of the flatbed), installed (the machine in, cold, the commissioning mark)
  wk(S, 'works.plot.induction.padlock', 'plot', [6, 6], ['idle'], { h: 0.5, k: 0.3, slots: { chip: [0.3, 0.2, 0.4, 0.3] } }),
  wk(S, 'works.plot.induction.buyable', 'plot', [6, 6], ['idle'], { h: 0.5, k: 0.3, slots: { tag: [0.3, 0.2, 0.4, 0.3] } }),
  wk(S, 'works.plot.induction.arriving', 'plot', [6, 6], ['idle'], { h: 1, k: 0.3 }),
  wk(S, 'works.plot.induction.installed', 'plot', [6, 6], ['idle'], { h: 0.5, k: 0.3 }),
  // its crate on the machine flatbed: on the deck, slung, set down
  wk(S, 'works.crate.induction', 'plant', [2.4, 1.6], ['deck', 'slung', 'set'], { h: 1.6, k: 0.45 }),
  // the copper plot: pegged out with the padlock chip, buyable (the price tag is the caller's), arriving (fenced, the crates
  // of the flatbed), installed (the machine in, cold, the commissioning mark)
  wk(S, 'works.plot.copper.padlock', 'plot', [6, 6], ['idle'], { h: 0.5, k: 0.3, slots: { chip: [0.3, 0.2, 0.4, 0.3] } }),
  wk(S, 'works.plot.copper.buyable', 'plot', [6, 6], ['idle'], { h: 0.5, k: 0.3, slots: { tag: [0.3, 0.2, 0.4, 0.3] } }),
  wk(S, 'works.plot.copper.arriving', 'plot', [6, 6], ['idle'], { h: 1, k: 0.3 }),
  wk(S, 'works.plot.copper.installed', 'plot', [6, 6], ['idle'], { h: 0.5, k: 0.3 }),
  // its crate on the machine flatbed: on the deck, slung, set down
  wk(S, 'works.crate.copper', 'plant', [2.4, 1.6], ['deck', 'slung', 'set'], { h: 1.6, k: 0.45 }),
  // the shredder plot: pegged out with the padlock chip, buyable (the price tag is the caller's), arriving (fenced, the crates
  // of the flatbed), installed (the machine in, cold, the commissioning mark)
  wk(S, 'works.plot.shredder.padlock', 'plot', [6, 6], ['idle'], { h: 0.5, k: 0.3, slots: { chip: [0.3, 0.2, 0.4, 0.3] } }),
  wk(S, 'works.plot.shredder.buyable', 'plot', [6, 6], ['idle'], { h: 0.5, k: 0.3, slots: { tag: [0.3, 0.2, 0.4, 0.3] } }),
  wk(S, 'works.plot.shredder.arriving', 'plot', [6, 6], ['idle'], { h: 1, k: 0.3 }),
  wk(S, 'works.plot.shredder.installed', 'plot', [6, 6], ['idle'], { h: 0.5, k: 0.3 }),
  // its crate on the machine flatbed: on the deck, slung, set down
  wk(S, 'works.crate.shredder', 'plant', [2.4, 1.6], ['deck', 'slung', 'set'], { h: 1.6, k: 0.45 }),
  // the hand-held analyser in its cradle at the scale house's window (a fixture: no frame of the scale house): dark, lit
  wk(S, 'works.analyser.cradle', 'plant', [0.4, 0.3], ['dark', 'lit'], { h: 0.5 }),
];
