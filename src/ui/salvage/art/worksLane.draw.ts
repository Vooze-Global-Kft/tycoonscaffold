/**
 * The lane past the bridge (stage 2, the works; ART-LANE, PLAN2 2.7 worksLane, s2c-plan-world 1.5): the two bridge
 * partners' sites the three-axle hook-lift fetches from, and the bridge's axle-weight sign.
 *
 *   drawGarageSite    the garage (14 x 8 m): a clad workshop at the back of its forecourt with two roller bays (one open,
 *                     a car up on a two-post lift; one shut), a door and a window, a fascia board with the garage's mark
 *                     at its west end and a BLANK face (the caller writes the register's name in `garageSignSlot`); tyre
 *                     stacks and a waste-oil drum east of it; a customer's car parked in a painted bay on the forecourt.
 *   drawPlumbingSite  the plumber (14 x 8 m): a rendered trade unit with a brick plinth, a roller door, a trade-counter
 *                     door and window, the fascia (the plumber's mark, a blank face: `plumbingSignSlot`); a cantilever
 *                     rack of stacked pipe (copper, grey and white plastic) east of it, old radiators on a pallet and a
 *                     bath in front of the rack; the plumber's van parked on the yard.
 *   drawAxleSign      the axle-weight sign on its post: the first yard's roundel (lane.draw drawLimitSign: the same post,
 *                     the same place), a black axle pictogram in its upper half and a blank lower half where the caller
 *                     writes the limit ("10 t"; `axleValueSlot`).
 *
 * THE SITES' LAYOUT (for the world, WLD-GROUND): the footprint is the whole site, anchored at its centre; its SOUTH edge
 * lies on the lane's north edge (anchor y = lane centre - half the lane's width - SITE.d / 2) and its x is the gate plus the
 * partner's lane distance (content map.works.lane garage_m / plumbing_m), so the partner's skip zone (positions.ts skipZone:
 * x +- 3 m, its north half on the forecourt's front 2 m) lies on open concrete: nothing of the site stands in x -3.5 to
 * +3.5 south of y +1.2 (SITE.clear), and every standing part lies north of the anchor or outside that strip, so the skip
 * and the hook-lift (sorted after the site by their south edges) never pass behind a part of it. 14 m wide: the lane's
 * hedge leaves exactly that gap round a site (actors.ts laneItems nearSite 7 m).
 *
 * The first yard's pen (pen.ts box / faceFill, LINE_W ink, tops light, south faces mid, the low west sun's shadow swept
 * east), palette families (YARD; local tones as lane.draw keeps them), buildings at two thirds of true height as the farm's
 * shed. No words in a sprite: the fascia faces and the roundel's lower half are blank paper with slots. Nothing dark is
 * drawn (no battery box, no machine that is not sold): the garage's and the plumber's own things only.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { drawBathStage } from './objects.draw';
import { LINE_W, YARD, mix, shade } from './palette';
import { at, box, boxShadow, cylinder, facePath, fill, freckles, groundShadow, hash01, oval, poly, proj, rect, rrect, segment, stroke, type V3, type View3q } from './pen';
import { CAR_PAINTS, TONE } from './pieces.draw';
import { drawRadiator } from './scrap.draw';
import { drawPallet } from './site.draw';
import { drawPublicCar, drawVan } from './vehicles.draw';

const INK = YARD.ink;

/** A site's footprint (metres) and the strip in front kept clear for the partner's skip zone (x0..x1, from y0 south). */
export const SITE = { w: 14, d: 8, clear: { x0: -3.5, x1: 3.5, y0: 1.2 } } as const;

const GARAGE = { x0: -6.6, x1: 3.4, y0: -3.9, y1: -0.8, h: 3.0, wall: '#AEB6BB', roof: '#8E969B', band: '#C8352B' } as const;
const PLUMB = { x0: -6.8, x1: -0.2, y0: -3.9, y1: -0.7, h: 2.7, wall: '#D6C9AC', brick: '#9C5B44', roof: '#8E969B', band: YARD.stampBlue } as const;
/** The fascia's height band (z, metres) on each building's south face, and where its blank face begins (x, after the mark). */
const GARAGE_FASCIA = { z0: 2.35, z1: 2.92, x0: -6.45, x1: 3.25, mark: 0.85 } as const;
const PLUMB_FASCIA = { z0: 2.05, z1: 2.6, x0: -6.65, x1: -0.35, mark: 0.8 } as const;

/** A rectangle on a south-facing plane y (world x0..x1, z0..z1) as a path. */
const southRect = (v: View3q, y: number, x0: number, x1: number, z0: number, z1: number) =>
  facePath(v, [
    [x0, y, z0],
    [x1, y, z0],
    [x1, y, z1],
    [x0, y, z1],
  ]);

function face(c: SkCanvas, v: View3q, y: number, x0: number, x1: number, z0: number, z1: number, color: string, line = 0, alpha = 1): void {
  const p = southRect(v, y, x0, x1, z0, z1);
  c.drawPath(p, fill(color, alpha));
  if (line > 0) c.drawPath(p, stroke(INK, line));
}

/** The ground of a site: its slab (concrete or tarmac) with joints, a kerb along the lane, a few stains. */
function siteGround(c: SkCanvas, v: View3q, base: string, joints: number, seed: number): void {
  const W = SITE.w / 2;
  const D = SITE.d / 2;
  const g = facePath(v, [
    [-W, -D, 0],
    [W, -D, 0],
    [W, D, 0],
    [-W, D, 0],
  ]);
  c.drawPath(g, fill(base));
  for (let i = 1; i < joints; i++) {
    const x = -W + (i * SITE.w) / joints;
    const [ax, ay] = proj(v, x, -D, 0);
    const [, by] = proj(v, x, D, 0);
    c.drawPath(segment(ax, ay, ax, by), stroke(shade(base, -0.12), 0.8));
  }
  const [jx, jy] = proj(v, -W, 0.4, 0);
  c.drawPath(segment(jx, jy, jx + SITE.w * v.ppm, jy), stroke(shade(base, -0.12), 0.8));
  // oil and tyre stains (the forecourt's front, where vehicles stand)
  for (let i = 0; i < 6; i++) {
    const [sx, sy] = proj(v, -5.5 + hash01(seed, i) * 11, 0.8 + hash01(seed, i, 2) * 2.6, 0);
    c.drawPath(oval(sx, sy, 6 + hash01(seed, i, 3) * 10, 2.5 + hash01(seed, i, 4) * 3), fill(YARD.oil, 0.18));
  }
  // the kerb along the lane's edge (dropped across the skip zone, where the hook-lift backs in)
  for (const [x0, x1] of [
    [-W, SITE.clear.x0 - 0.4],
    [SITE.clear.x1 + 0.4, W],
  ] as [number, number][])
    box(c, v, { len: x1 - x0, wid: 0.16, h: 0.12, ox: (x0 + x1) / 2, oy: D - 0.08, color: YARD.concreteLight, line: 0.8 });
  c.drawPath(g, stroke(shade(base, -0.25), 0.8));
}

/** Painted parking-bay lines on the ground (yellow), x0..x1 at the bay's sides, y0..y1. */
function bayLines(c: SkCanvas, v: View3q, x0: number, x1: number, y0: number, y1: number): void {
  for (const x of [x0, x1]) {
    const [ax, ay] = proj(v, x, y0, 0);
    const [, by] = proj(v, x, y1, 0);
    c.drawPath(segment(ax, ay, ax, by), stroke(YARD.linePaintWorn, 1.6));
  }
  const [ax, ay] = proj(v, x0, y0, 0);
  const [bx] = proj(v, x1, y0, 0);
  c.drawPath(segment(ax, ay, bx, ay), stroke(YARD.linePaintWorn, 1.6));
}

/** The fascia board on a south face: paper with a coloured band below, ink rim; the mark square at its west end. */
function fascia(c: SkCanvas, v: View3q, y: number, f: { z0: number; z1: number; x0: number; x1: number; mark: number }, band: string, mark: (cx: number, cy: number, s: number) => void): void {
  face(c, v, y, f.x0, f.x1, f.z0 - 0.07, f.z1, YARD.paper, LINE_W);
  face(c, v, y, f.x0, f.x1, f.z0 - 0.07, f.z0, band);
  c.drawPath(southRect(v, y, f.x0, f.x1, f.z0 - 0.07, f.z1), stroke(INK, LINE_W));
  const [mx, my] = proj(v, f.x0 + f.mark / 2, y, (f.z0 + f.z1) / 2);
  const s = (f.z1 - f.z0) * v.ppm * v.lift;
  mark(mx, my, s * 1.05);
  const [ax, ay] = proj(v, f.x0 + f.mark, y, f.z0);
  const [, by] = proj(v, f.x0 + f.mark, y, f.z1);
  c.drawPath(segment(ax, ay, ax, by), stroke(shade(YARD.paper, -0.2), 0.8));
}

/** The blank face of a fascia (points round the site's anchor, true size): where the caller writes the partner's name. */
function fasciaSlot(v: View3q, y: number, f: { z0: number; z1: number; x0: number; x1: number; mark: number }): [number, number, number, number] {
  const [ax, ay] = proj(v, f.x0 + f.mark + 0.12, y, f.z1 - 0.06);
  const [bx, by] = proj(v, f.x1 - 0.12, y, f.z0 + 0.06);
  return [ax, ay, bx - ax, by - ay];
}

/** The garage's mark (invented, no letters): a spanner across a wheel in a red roundel. */
export function garageMark(c: SkCanvas, cx: number, cy: number, s: number): void {
  const r = s / 2;
  c.drawPath(oval(cx, cy, r, r), fill(GARAGE.band));
  c.drawPath(oval(cx, cy, r * 0.62, r * 0.62), stroke(YARD.paper, Math.max(1, r * 0.16)));
  c.drawPath(oval(cx, cy, r * 0.2, r * 0.2), fill(YARD.paper));
  const a = -0.8;
  const dx = Math.cos(a) * r * 0.78;
  const dy = Math.sin(a) * r * 0.78;
  c.drawPath(segment(cx - dx, cy - dy, cx + dx, cy + dy), stroke(INK, Math.max(1.2, r * 0.22)));
  c.drawPath(oval(cx + dx, cy + dy, r * 0.2, r * 0.2), fill(INK));
  c.drawPath(oval(cx + dx * 1.05, cy + dy * 1.05, r * 0.08, r * 0.08), fill(GARAGE.band));
  c.drawPath(oval(cx, cy, r, r), stroke(INK, 0.9));
}

/** The plumber's mark (invented, no letters): a white drop over a pipe elbow on a blue square. */
export function plumbingMark(c: SkCanvas, cx: number, cy: number, s: number): void {
  const r = s / 2;
  c.drawPath(rrect(cx - r, cy - r, s, s, r * 0.25), fill(PLUMB.band));
  const w = Math.max(1.2, r * 0.24);
  c.drawPath(
    poly([cx - r * 0.7, cy + r * 0.45, cx + r * 0.2, cy + r * 0.45, cx + r * 0.2, cy - r * 0.05], false),
    stroke(YARD.copperLight, w),
  );
  const drop = poly([cx - r * 0.25, cy - r * 0.75, cx - r * 0.02, cy - r * 0.32, cx - r * 0.25, cy - r * 0.08, cx - r * 0.48, cy - r * 0.32]);
  c.drawPath(drop, fill(YARD.paper));
  c.drawPath(oval(cx - r * 0.25, cy - r * 0.3, r * 0.22, r * 0.22), fill(YARD.paper));
  c.drawPath(rrect(cx - r, cy - r, s, s, r * 0.25), stroke(INK, 0.9));
}

/** A roller shutter in an opening on a south face: galvanised slats, a bottom rail, the roll box above. */
function shutter(c: SkCanvas, v: View3q, y: number, x0: number, x1: number, h: number): void {
  face(c, v, y, x0, x1, 0, h, YARD.galvanisedLight);
  for (let z = 0.12; z < h - 0.02; z += 0.12) {
    const [ax, ay] = proj(v, x0, y, z);
    const [bx] = proj(v, x1, y, z);
    c.drawPath(segment(ax, ay, bx, ay), stroke(shade(YARD.galvanisedLight, -0.2), 0.7));
  }
  face(c, v, y, x0, x1, 0, 0.08, YARD.steelDark);
  face(c, v, y, x0 - 0.06, x1 + 0.06, h, h + 0.16, YARD.galvanised, 1);
  c.drawPath(southRect(v, y, x0, x1, 0, h), stroke(INK, 1));
}

/** Tyres lying flat in a stack of n at (ox, oy): black rings, the top one's hole showing. */
function tyreStack(c: SkCanvas, v: View3q, ox: number, oy: number, n: number): void {
  groundShadow(c, v, 0.36, 0.3, ox, oy, n * 0.2);
  for (let i = 0; i < n; i++) cylinder(c, v, { r: 0.34, h: 0.2, ox, oy, z: i * 0.2, color: YARD.tyre, line: 0.9 });
  const [tx, ty] = proj(v, ox, oy, n * 0.2);
  c.drawPath(oval(tx, ty, 0.17 * v.ppm, 0.17 * v.ppm * v.tilt), fill(shade(YARD.tyre, -0.35)));
  c.drawPath(oval(tx, ty, 0.17 * v.ppm, 0.17 * v.ppm * v.tilt), stroke(INK, 0.7));
}

/** A steel drum standing at (ox, oy). */
function drum(c: SkCanvas, v: View3q, ox: number, oy: number, color: string): void {
  groundShadow(c, v, 0.3, 0.26, ox, oy, 0.9);
  cylinder(c, v, { r: 0.29, h: 0.88, ox, oy, color, line: 1 });
  for (const z of [0.3, 0.6]) {
    const [ax, ay] = proj(v, ox - 0.29, oy, z);
    const [bx] = proj(v, ox + 0.29, oy, z);
    c.drawPath(segment(ax, ay, bx, ay), stroke(shade(color, -0.3), 1));
  }
}

// =====================================================================================================
// The garage
// =====================================================================================================

/** The garage's site, anchored at its footprint's centre (SITE). */
export function drawGarageSite(c: SkCanvas, v: View3q): void {
  siteGround(c, v, YARD.concrete, 4, 3);
  bayLines(c, v, -6.8, -3.7, 0.2, 3.4);
  const G = GARAGE;
  const len = G.x1 - G.x0;
  const wid = G.y1 - G.y0;
  const ox = (G.x0 + G.x1) / 2;
  const oy = (G.y0 + G.y1) / 2;
  boxShadow(c, v, len, wid, ox, oy, G.h);
  box(c, v, {
    len,
    wid,
    h: G.h,
    ox,
    oy,
    color: G.wall,
    top: G.roof,
    line: LINE_W,
  });
  const y = G.y1;
  // the plinth and the cladding's ribs
  face(c, v, y, G.x0, G.x1, 0, 0.45, shade(G.wall, -0.3));
  for (let x = G.x0 + 0.3; x < G.x1 - 0.1; x += 0.3) {
    const [ax, ay] = proj(v, x, y, 0.45);
    const [, by] = proj(v, x, y, G.h - 0.05);
    c.drawPath(segment(ax, ay, ax, by), stroke(shade(G.wall, -0.16), 0.7));
  }
  // bay 1, open: the dark workshop, a car up on a two-post lift
  const b1 = [-6.0, -3.0] as const;
  face(c, v, y, b1[0], b1[1], 0, 2.2, '#2F3438');
  face(c, v, y, b1[0], b1[1], 0, 0.12, '#4A5056');
  {
    const [cx0, cz] = proj(v, b1[0] + 0.45, y, 1.25);
    const [cx1] = proj(v, b1[1] - 0.45, y, 1.25);
    const [, cTop] = proj(v, 0, y, 1.78);
    const paint = CAR_PAINTS[0];
    // the car's underside and sill, its glasshouse, two wheels hanging
    c.drawPath(rrect(cx0, cTop, cx1 - cx0, cz - cTop, 4), fill(shade(paint, -0.25)));
    c.drawPath(rrect(cx0 + (cx1 - cx0) * 0.25, cTop - 9, (cx1 - cx0) * 0.45, 10, 3), fill(mix(YARD.glassDark, paint, 0.3)));
    c.drawPath(rrect(cx0, cTop, cx1 - cx0, cz - cTop, 4), stroke(INK, 0.9));
    for (const t of [0.2, 0.8]) {
      const wx = cx0 + (cx1 - cx0) * t;
      c.drawPath(oval(wx, cz + 1, 5.5, 5.5), fill(YARD.tyre));
      c.drawPath(oval(wx, cz + 1, 2.4, 2.4), fill(YARD.galvanised));
    }
    // the lift: two hi-vis posts with their arms under the sills
    for (const x of [b1[0] + 0.25, b1[1] - 0.25]) {
      face(c, v, y, x - 0.08, x + 0.08, 0, 2.0, YARD.hivis, 0.9);
      const [ax, ay] = proj(v, x, y, 1.22);
      c.drawPath(segment(ax, ay, ax + (x < -4.5 ? 10 : -10), ay), stroke(YARD.hivisDark, 2));
    }
  }
  face(c, v, y, b1[0] - 0.06, b1[1] + 0.06, 2.2, 2.32, YARD.galvanised, 1);
  c.drawPath(southRect(v, y, b1[0], b1[1], 0, 2.2), stroke(INK, 1));
  // bay 2, its shutter down
  shutter(c, v, y, -2.4, 0.6, 2.2);
  // the door with its glass and a window
  face(c, v, y, 1.25, 2.15, 0, 2.0, YARD.machine, 1);
  face(c, v, y, 1.4, 2.0, 1.05, 1.85, YARD.glass, 0.8);
  face(c, v, y, 2.45, 3.15, 0.95, 1.85, YARD.glassDark, 1);
  face(c, v, y, 2.45, 3.15, 1.45, 1.85, YARD.glass, 0, 0.6);
  // the fascia: the garage's mark, a blank face
  fascia(c, v, y, GARAGE_FASCIA, G.band, (cx, cy, s) => garageMark(c, cx, cy, s));
  // on the roof: an extract vent and a parapet line
  box(c, v, { len: 0.7, wid: 0.6, h: 0.35, ox: 1.6, oy: -2.6, z: G.h, color: YARD.galvanised, line: 0.9 });
  cylinder(c, v, { r: 0.16, h: 0.5, ox: -4.2, oy: -2.9, z: G.h, color: YARD.galvanisedLight, line: 0.9 });
  const [px0, py0] = proj(v, G.x0, G.y1 - 0.12, G.h);
  const [px1] = proj(v, G.x1, G.y1 - 0.12, G.h);
  c.drawPath(segment(px0 + 2, py0, px1 - 2, py0), stroke(shade(G.roof, -0.25), 1));
  freckles(c, proj(v, -1, -2.4, G.h)[0], proj(v, -1, -2.4, G.h)[1] - 6, 70, 18, 11, shade(G.roof, -0.12), 7);
  // east of the workshop: tyre stacks and the waste-oil drum (back to front)
  drum(c, v, 6.3, -3.2, '#2F5D8A');
  tyreStack(c, v, 4.3, -3.0, 5);
  tyreStack(c, v, 5.25, -2.7, 4);
  tyreStack(c, v, 4.7, -1.85, 3);
  drum(c, v, 6.25, -2.2, YARD.skip);
  // a customer's car in its bay on the forecourt (west of the skip zone)
  const [carX, carY] = proj(v, -5.25, 1.6, 0);
  groundShadow(c, v, 1.5, 0.75, -5.25, 1.6, 1.1);
  at(c, carX, carY, () => drawPublicCar(c, v, 0, { body: CAR_PAINTS[1], driver: false }));
}

/** The garage's blank fascia face (points round the site's anchor, true size). */
export const garageSignSlot = (v: View3q): [number, number, number, number] => fasciaSlot(v, GARAGE.y1, GARAGE_FASCIA);

// =====================================================================================================
// The plumber
// =====================================================================================================

/** The cantilever pipe rack (x0..x1 at y, three arms a column) with its stacked pipe, drawn back to front. */
function pipeRack(c: SkCanvas, v: View3q, x0: number, x1: number, y: number): void {
  const cols = [x0 + 0.15, (x0 + x1) / 2, x1 - 0.15];
  boxShadow(c, v, x1 - x0, 0.9, (x0 + x1) / 2, y + 0.3, 2.1);
  for (const x of cols) {
    box(c, v, { len: 0.7, wid: 0.9, h: 0.1, ox: x, oy: y + 0.3, color: YARD.machineDark, line: 0.8 });
    box(c, v, { len: 0.14, wid: 0.14, h: 2.1, ox: x, oy: y - 0.08, color: YARD.machine, line: 0.9 });
  }
  const levels: { z: number; color: string; hi: string; n: number }[] = [
    { z: 0.45, color: TONE.no2, hi: TONE.no2Hi, n: 4 },
    { z: 1.0, color: YARD.copper, hi: YARD.copperLight, n: 3 },
    { z: 1.55, color: YARD.pvcGrey, hi: shade(YARD.pvcGrey, 0.3), n: 3 },
    { z: 2.0, color: YARD.pvc, hi: '#FFFFFF', n: 2 },
  ];
  for (const L of levels) {
    // the arms under this level
    for (const x of cols) box(c, v, { len: 0.1, wid: 0.75, h: 0.07, ox: x, oy: y + 0.3, z: L.z - 0.07, color: YARD.machine, line: 0.7 });
    // the pipe lengths: a low bundle along the arms, each length a line with its cut end lit
    const pipes = L.n;
    for (let i = 0; i < pipes; i++) {
      const py = y + 0.08 + i * 0.16;
      const shift = (hash01(7, L.z * 10, i) - 0.5) * 0.4;
      const [ax, ay] = proj(v, x0 - 0.15 + shift, py, L.z + 0.05);
      const [bx] = proj(v, x1 + 0.15 + shift, py, L.z + 0.05);
      const h = 3.6;
      const r = rrect(ax, ay - h / 2, bx - ax, h, h / 2);
      c.drawPath(r, fill(L.color));
      c.drawPath(segment(ax + 1, ay - 0.6, bx - 1, ay - 0.6), stroke(L.hi, 0.8));
      c.drawPath(r, stroke(INK, 0.6));
      c.drawPath(oval(bx, ay, 1.3, 1.6), fill(L.color === TONE.no2 || L.color === YARD.copper ? YARD.copperSheen : shade(L.color, -0.25)));
      c.drawPath(oval(bx, ay, 1.3, 1.6), stroke(INK, 0.5));
      if (L.color === TONE.no2) c.drawPath(oval(ax + (bx - ax) * hash01(9, i), ay, 3, 1.1), fill(TONE.verdigris, 0.8));
    }
  }
}

/** The plumber's site, anchored at its footprint's centre (SITE). */
export function drawPlumbingSite(c: SkCanvas, v: View3q): void {
  siteGround(c, v, YARD.asphaltLight, 3, 5);
  const P = PLUMB;
  // the concrete apron in front of the unit
  c.drawPath(
    facePath(v, [
      [P.x0, P.y1, 0],
      [P.x1, P.y1, 0],
      [P.x1, P.y1 + 1.0, 0],
      [P.x0, P.y1 + 1.0, 0],
    ]),
    fill(YARD.concrete),
  );
  bayLines(c, v, -6.7, -3.9, 0.9, 3.5);
  const len = P.x1 - P.x0;
  const wid = P.y1 - P.y0;
  const ox = (P.x0 + P.x1) / 2;
  const oy = (P.y0 + P.y1) / 2;
  boxShadow(c, v, len, wid, ox, oy, P.h);
  box(c, v, { len, wid, h: P.h, ox, oy, color: P.wall, top: P.roof, line: LINE_W });
  const y = P.y1;
  // the brick plinth with its courses
  face(c, v, y, P.x0, P.x1, 0, 0.5, P.brick);
  for (let z = 0.1; z < 0.5; z += 0.1) {
    const [ax, ay] = proj(v, P.x0, y, z);
    const [bx] = proj(v, P.x1, y, z);
    c.drawPath(segment(ax, ay, bx, ay), stroke(shade(P.brick, 0.25), 0.6));
  }
  freckles(c, proj(v, -4.5, y, 1.2)[0], proj(v, -4.5, y, 1.2)[1], 120, 20, 12, shade(P.wall, -0.12), 9);
  // the roller door, the trade counter's glass door and its window
  // (west to east: the counter's window, its glass door, then the roller door, so the van parked west hides the window,
  // never the door the stock goes in by)
  shutter(c, v, y, -3.3, -0.65, 2.0);
  face(c, v, y, -4.45, -3.65, 0, 1.95, YARD.machineDark, 1);
  face(c, v, y, -4.35, -3.75, 0.15, 1.85, YARD.glass, 0.8);
  face(c, v, y, -6.35, -4.85, 0.75, 1.8, YARD.glassDark, 1);
  face(c, v, y, -6.35, -4.85, 1.4, 1.8, YARD.glass, 0, 0.6);
  // the window's display: a few fittings on a shelf
  for (let i = 0; i < 5; i++) {
    const [fx, fy] = proj(v, -6.15 + i * 0.28, y, 0.95);
    c.drawPath(rrect(fx - 2.5, fy - 5, 5, 5, 1), fill(i % 2 ? TONE.brass : YARD.copper));
  }
  fascia(c, v, y, PLUMB_FASCIA, P.band, (cx, cy, s) => plumbingMark(c, cx, cy, s));
  // the gutter's downpipe at the east corner
  face(c, v, y + 0.02, P.x1 - 0.18, P.x1 - 0.08, 0, P.h - 0.05, YARD.galvanised, 0.7);
  box(c, v, { len: len + 0.1, wid: 0.12, h: 0.1, ox, oy: P.y1 + 0.02, z: P.h - 0.12, color: YARD.galvanised, line: 0.8 });
  // the roof: a rooflight
  box(c, v, { len: 1.6, wid: 0.9, h: 0.08, ox: -4.5, oy: -2.4, z: P.h, color: YARD.glass, line: 0.8 });
  // the pipe rack east of the unit, back to front, and what waits in front of it
  pipeRack(c, v, 0.9, 6.5, -3.7);
  const [px, py] = proj(v, 1.9, -1.55, 0);
  at(c, px, py, () => drawPallet(c, v));
  // two old radiators standing on the pallet, one behind the other
  for (const [dy, seed] of [
    [-0.22, 3],
    [0.12, 4],
  ] as [number, number][]) {
    const [rx, ry] = proj(v, 1.9, -1.55 + dy, 0.14);
    at(c, rx, ry, () => drawRadiator(c, v, seed));
  }
  const [bx, by] = proj(v, 4.6, -1.5, 0);
  at(c, bx, by, () => drawBathStage(c, v, 0));
  drum(c, v, 6.4, -1.6, '#2F5D8A');
  // the plumber's van on the yard (west of the skip zone)
  const [vx, vy] = proj(v, -5.3, 2.2, 0);
  groundShadow(c, v, 1.8, 0.95, -5.3, 2.2, 1.4);
  at(c, vx, vy, () => drawVan(c, v, 0, { body: YARD.enamel, driver: false }));
}

/** The plumber's blank fascia face (points round the site's anchor, true size). */
export const plumbingSignSlot = (v: View3q): [number, number, number, number] => fasciaSlot(v, PLUMB.y1, PLUMB_FASCIA);

// =====================================================================================================
// The bridge's axle-weight sign
// =====================================================================================================

/** The roundel's centre height (m) and radii (points): the first yard's limit sign's place, a little larger to hold two parts. */
const AXLE = { z: 2.0, r: 14, white: 10.5 } as const;

/**
 * The axle-weight sign on its post, anchored at the foot: the first yard's red-ringed roundel on the same galvanised post
 * (drawLimitSign), a black axle (two tyres seen from behind, joined by the axle) in its upper half, its lower half blank for
 * the limit the caller writes (`axleValueSlot`).
 */
export function drawAxleSign(c: SkCanvas, v: View3q): void {
  groundShadow(c, v, 0.1, 0.08, 0, 0, 2.2);
  box(c, v, { len: 0.07, wid: 0.07, h: AXLE.z, color: YARD.galvanised, line: 0.9 });
  const [x, y] = proj(v, 0, 0.05, AXLE.z);
  c.drawPath(oval(x + 1.5, y + 1.5, AXLE.r, AXLE.r), fill(INK, 0.22));
  c.drawPath(oval(x, y, AXLE.r, AXLE.r), fill('#C8352B'));
  c.drawPath(oval(x, y, AXLE.white, AXLE.white), fill('#FFFFFF'));
  // the axle: a bar and two tyres, the upper half
  const ay = y - 4.6;
  c.drawPath(rect(x - 5.5, ay - 0.8, 11, 1.6), fill(INK));
  for (const sx of [-1, 1]) c.drawPath(rrect(x + sx * 5.6 - 1.7, ay - 3.4, 3.4, 6.8, 1.2), fill(INK));
  c.drawPath(oval(x, y, AXLE.r, AXLE.r), stroke(INK, 1.1));
}

/** Where the axle sign's limit goes (points round its anchor): the roundel's lower half. */
export const axleValueSlot = (v: View3q): [number, number, number, number] => {
  const [x, y] = proj(v, 0, 0.05, AXLE.z);
  return [x - 7, y + 0.2, 14, 7.6];
};

/** For the sheet script: the anchor's metres (pairs) the site keeps clear for the skip zone. */
export const siteClearRect = (): V3[] => [
  [SITE.clear.x0, SITE.clear.y0, 0],
  [SITE.clear.x1, SITE.clear.y0, 0],
  [SITE.clear.x1, SITE.d / 2, 0],
  [SITE.clear.x0, SITE.d / 2, 0],
];
