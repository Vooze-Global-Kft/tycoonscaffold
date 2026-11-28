/**
 * Manifest part "worksHalls" (sheet C; drawn by ART-HALLS in ../halls.draw.ts): the three furnace halls of the works,
 * each a portal-frame shed with its south wall open over its pour apron, the furnace inside in three frames (cold, hot
 * with its lid closed, tilted), a glow overlay (2 frames, alternating; reduced motion holds frame 0) and a pour stream (3
 * frames, with the hall's own furnace hand in shield and apron). Sizes: content map.works.places rotary 8.5 x 7,
 * induction 6 x 6, copper 6 x 6 (h 7, 6, 6).
 *
 * Ids, groups, sheet, footprints, frames, headings and anchors are C-ART's (PLAN2 2.7), FINAL: the world (worksTable.ts)
 * is built on them. ART-HALLS drew them (bounds measured, ids final). Anchors (the footprint's centre on the ground):
 *   .shed     the hall's place point (content map.works.points '<hall>')
 *   .furnace  the apron's point (content '<hall>.apron') plus halls.draw.ts HALL_POUR[<hall>].furnace (metres)
 *   .glow     the furnace's anchor (drawn after the furnace)
 *   .stream   the apron's point; its drop lands HALL_POUR[<hall>].pour metres east of it at the mould's top
 * Baked at k of true size (drawScale 1/k): sheds 0.5, furnaces and streams 0.6, glows 0.5 (C-ART's budget, errata (5)).
 * No words in a sprite; nothing of a dark item. Checked by src/ui/salvage/art/sheets.hash.test.ts (every frame inside its
 * box; C and D fit 2048 x 2048 at density 2) and budgeted by `npx tsx scripts/art/yard-sheets.ts <out> budget-C`.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { drawHallFurnace, drawHallGlow, drawHallShed, drawHallStream, type HallKind } from '../halls.draw';
import type { View3q } from '../pen';
import type { Bounds, WorksEntry, WorksSheet } from './index';

type Draw = (c: SkCanvas, v: View3q, frame: number, heading: number) => void;
const B = (x: number, y: number, w: number, h: number): Bounds => ({ x, y, w, h });

// MEASURED BOUNDS (baked points round the anchor, the ink of every frame plus a 2 pt margin; written by
// `HALLS_MEASURE=1 npx tsx scripts/art/yard-sheets.ts <dir> works-halls`; do not edit by hand)
// prettier-ignore
const MEASURED: Record<string, [number, number, number, number]> = {
  'works.hall.rotary.shed': [-97, -142, 200, 196],
  'works.hall.rotary.furnace': [-44, -71, 100, 90],
  'works.hall.rotary.glow': [-35, -43, 90, 70],
  'works.hall.rotary.stream': [-60, -50, 40, 63],
  'works.hall.induction.shed': [-72, -120, 150, 167],
  'works.hall.induction.furnace': [-33, -69, 73, 88],
  'works.hall.induction.glow': [-25, -37, 62, 61],
  'works.hall.induction.stream': [-53, -59, 41, 72],
  'works.hall.copper.shed': [-72, -120, 150, 167],
  'works.hall.copper.furnace': [-34, -68, 85, 87],
  'works.hall.copper.glow': [-29, -40, 66, 68],
  'works.hall.copper.stream': [-38, -52, 40, 65],
};

/** Until measured: a generous box (the measuring run draws on a larger canvas whatever this says). */
const UNMEASURED = B(-260, -320, 520, 420);

/** One hall entry: its drawing baked at k of true size (drawScale 1/k), its bounds as measured. */
function hall(id: string, fp: [number, number], frames: readonly string[], k: number, draw: (c: SkCanvas, v: View3q, f: number) => void): WorksEntry {
  const m = MEASURED[id];
  const scaled: Draw = (c, v, f) => {
    c.save();
    c.scale(k, k);
    draw(c, v, f);
    c.restore();
  };
  return {
    id,
    group: id.endsWith('.glow') || id.endsWith('.stream') ? 'fx' : 'plant',
    sheet: S,
    footprint: { w: fp[0], d: fp[1] },
    bounds: m ? B(m[0], m[1], m[2], m[3]) : UNMEASURED,
    frames,
    headings: 1,
    drawScale: 1 / k,
    draw: scaled,
  };
}

const S: WorksSheet = 'C';

/** The four layers of one hall (footprints as C-ART set them: the furnace's own, the glow over it, the stream's). */
const layers = (kind: HallKind, shedFp: [number, number], furnaceFp: [number, number]): WorksEntry[] => [
  hall(`works.hall.${kind}.shed`, shedFp, ['idle'], 0.5, (c, v) => drawHallShed(c, v, kind)),
  hall(`works.hall.${kind}.furnace`, furnaceFp, ['cold', 'hot', 'tilted'], 0.6, (c, v, f) => void drawHallFurnace(c, v, kind, f)),
  hall(`works.hall.${kind}.glow`, furnaceFp, ['glow1', 'glow2'], 0.5, (c, v, f) => drawHallGlow(c, v, kind, f)),
  // the pour stream with the hall's own furnace hand (shield, aluminised apron) drawn inside its frames (not an agent)
  hall(`works.hall.${kind}.stream`, [2, 1.5], ['stream1', 'stream2', 'stream3'], 0.6, (c, v, f) => drawHallStream(c, v, kind, f)),
];

/** The three halls (rotary, induction, copper): each in layers, never one big sprite per phase (world 1.2). */
export const WORKS_HALLS: WorksEntry[] = [...layers('rotary', [8.5, 7], [3.0, 2.0]), ...layers('induction', [6, 6], [1.8, 1.8]), ...layers('copper', [6, 6], [2.6, 2.0])];
