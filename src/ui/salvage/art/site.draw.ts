/**
 * What stands in the first yard (yard-stage1.md 6.1, "Machines, weighing, stock" and "Yard and lane"):
 * the scales and the scale house with the posted board, the inherited hand stripper and the motor bench,
 * the crucible's states, bays and stillages with their fills, the portacabin office, the tool rack, the
 * sign crane, gates, fences, signs on posts, the extinguisher, the rubble skip, lock blocks and plates.
 *
 * Every drawing is round its ANCHOR (the footprint's centre on the ground) in the kit's View3q, drawn as
 * the style sheet says (flat three-tone fills, ink outline, one blue-grey shadow swept east by the low
 * sun). No words: where a sign, a board, a plaque or a display carries the caller's words, the drawing
 * leaves a blank face and its manifest entry names the slot (manifest/plant.ts).
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { LINE_W, METAL, YARD, mix, shade } from './palette';
import {
  box,
  boxShadow,
  builder,
  circle,
  cylinder,
  discPath,
  faceFill,
  fill,
  freckles,
  groundShadow,
  hash01,
  hazard,
  oval,
  poly,
  proj,
  radial,
  rect,
  rgba,
  rrect,
  segment,
  stroke,
  subQuad,
  type V3,
  type View3q,
} from './pen';
import { pieceGlyph } from './pieces.draw';
import { drawCrucible } from './plant.draw';
import { drawIngot } from './scrap.draw';

const INK = YARD.ink;
const BLOCK = '#BDB8AC';

/** A blank enamel or paper face (a sign's or board's), as a quad of world points; inset ink rule. */
function blankFace(c: SkCanvas, v: View3q, q: V3[], color: string = YARD.paper, rule = true): void {
  faceFill(c, v, q, color, LINE_W);
  if (rule) faceFill(c, v, subQuad(q, 0.05, 0.95, 0.1, 0.9), color, 0.6);
}

/** Standing-seam ribs across a roof's top quad (north-south lines), lighter on one edge. */
function roofRibs(c: SkCanvas, v: View3q, q: V3[], n: number): void {
  for (let i = 1; i < n; i++) {
    const a = proj(v, ...subQuad(q, i / n, 0, 0.02, 0)[0]);
    const b = proj(v, ...subQuad(q, i / n, 0, 0.98, 0)[0]);
    c.drawPath(segment(a[0], a[1], b[0], b[1]), stroke(shade(YARD.galvanised, -0.14), 1));
    c.drawPath(segment(a[0] + 1.2, a[1], b[0] + 1.2, b[1]), stroke(YARD.galvanisedLight, 0.8));
  }
}

/** A row of lines on a face (rows of a board, the caller writes on them). */
function faceRows(c: SkCanvas, v: View3q, q: V3[], n: number, color: string, s0 = 0.08, s1 = 0.92, t0 = 0.12, t1 = 0.88, w = 0.8): void {
  for (let i = 0; i <= n; i++) {
    const t = t0 + ((t1 - t0) * i) / n;
    const a = proj(v, ...subQuad(q, s0, s0, t, t)[0]);
    const b = proj(v, ...subQuad(q, s1, s1, t, t)[0]);
    c.drawPath(segment(a[0], a[1], b[0], b[1]), stroke(color, w));
  }
}

// ---------------------------------------------------------------------------
// The platform scale (loads on foot) with its indicator post
// ---------------------------------------------------------------------------

export const PLATFORM = { len: 1.5, wid: 1.5 };
/** Where the platform's indicator post stands (north-east corner), metres from the anchor. */
export const PLATFORM_POST: V3 = [0.95, -0.55, 1.35];

/**
 * The platform scale: a 1.5 m checker-plate deck on a low frame with ramped edges and hazard corners,
 * and its indicator on a short post at the north-east corner (dark LED window, printer slot under it).
 * frame 0 idle, 1 printing (the slot lit, a tongue of paper showing).
 */
export function drawPlatformScale(c: SkCanvas, v: View3q, frame = 0): void {
  const { len, wid } = PLATFORM;
  boxShadow(c, v, len + 0.2, wid + 0.2, 0, 0, 0.05);
  groundShadow(c, v, 0.12, 0.1, PLATFORM_POST[0], PLATFORM_POST[1], PLATFORM_POST[2]);
  // the post behind the deck
  const [px, py] = [PLATFORM_POST[0], PLATFORM_POST[1]];
  box(c, v, { len: 0.08, wid: 0.08, h: PLATFORM_POST[2], ox: px, oy: py, color: YARD.galvanised, line: 1 });
  box(c, v, { len: len + 0.16, wid: wid + 0.16, h: 0.06, color: YARD.steelDark, line: 1 });
  box(c, v, {
    len,
    wid,
    h: 0.06,
    z: 0.04,
    color: YARD.galvanised,
    front: YARD.steelDark,
    bevel: true,
    onTop: (q) => {
      const n = 9;
      for (let j = 0; j < n; j++)
        for (let i = 0; i < n; i++) {
          const [x, y] = proj(v, ...subQuad(q, (i + 0.5 + (j % 2) * 0.4) / (n + 0.4), 0, (j + 0.5) / n, 0)[0]);
          const d = (i + j) % 2 ? 1.4 : -1.4;
          c.drawPath(segment(x - 1.5, y + d * 0.5, x + 1.5, y - d * 0.5), stroke(YARD.galvanisedLight, 1));
        }
      for (const [s0, t0] of [[0, 0], [0.84, 0], [0, 0.84], [0.84, 0.84]]) {
        const p = subQuad(q, s0, s0 + 0.16, t0, t0 + 0.16).map((pt) => proj(v, ...pt));
        hazard(c, poly(p.flat()), 3, 0.7);
      }
    },
  });
  // the indicator head: a hi-vis box, a dark LED window (the caller's digits), the printer slot
  const [hx, hy] = proj(v, px, py, PLATFORM_POST[2]);
  const w = 46;
  const h = 30;
  const top = hy - h + 6;
  c.drawPath(rrect(hx - w / 2 + 2, top + 2, w, h, 4), fill(INK, 0.22));
  c.drawPath(rrect(hx - w / 2, top, w, h, 4), fill(YARD.hivis));
  c.drawPath(rrect(hx - w / 2, top, w, h, 4), stroke(INK, LINE_W));
  c.drawPath(rrect(hx - w / 2 + 3, top + 3, w - 6, 13, 2), fill(YARD.ledCase));
  for (let i = 0; i < 4; i++) c.drawPath(rrect(hx - w / 2 + 7 + i * 9, top + 5, 6, 9, 1), stroke(YARD.ledOff, 1.2));
  c.drawPath(rrect(hx - 13, top + 21, 26, 4, 2), fill(INK));
  if (frame === 1) {
    c.drawPath(rrect(hx - 11, top + 22, 22, 8, 1), fill(YARD.paper));
    c.drawPath(rrect(hx - 11, top + 22, 22, 8, 1), stroke(YARD.paperLine, 0.8));
    c.drawCircle(hx + w / 2 - 5, top + 21, 2, fill(YARD.led));
  }
}

/** The platform indicator's LED window and printer slot, points round the scale's anchor. */
export function platformSlots(v: View3q): { digits: [number, number, number, number]; printer: [number, number] } {
  const [hx, hy] = proj(v, PLATFORM_POST[0], PLATFORM_POST[1], PLATFORM_POST[2]);
  const top = hy - 30 + 6;
  return { digits: [hx - 20, top + 3, 40, 13], printer: [hx, top + 23] };
}

// ---------------------------------------------------------------------------
// The scale house with the posted price board
// ---------------------------------------------------------------------------

export const SCALE_HOUSE = { len: 2.8, wid: 2.2, h: 2.5 };

/**
 * The scale house: a clad cabin on a plinth with a flat roof and overhang, the ID desk window with its
 * sliding pane and counter on the south face, and the posted price board (enamel, rows ruled, grade
 * squares down the left; prices are the caller's words) to the east of the window.
 */
export function drawScaleHouse(c: SkCanvas, v: View3q): void {
  const { len, wid, h } = SCALE_HOUSE;
  boxShadow(c, v, len, wid, 0, 0, h);
  box(c, v, { len: len + 0.1, wid: wid + 0.1, h: 0.18, color: YARD.concreteDark, line: 1 });
  box(c, v, {
    len,
    wid,
    h: h - 0.4,
    z: 0.18,
    color: '#D9DCD2',
    onFace: (q, n) => {
      if (n[1] < 0.9) return;
      // cladding ribs
      for (let i = 1; i < 14; i++) faceFill(c, v, subQuad(q, i / 14 - 0.006, i / 14 + 0.006, 0.02, 0.98), shade('#D9DCD2', -0.12));
      // the hi-vis band
      faceFill(c, v, subQuad(q, 0, 1, 0.06, 0.12), YARD.hivis, 0.8);
      // the ID desk window (west half; s runs east to west on a south face)
      const win = subQuad(q, 0.56, 0.94, 0.38, 0.86);
      faceFill(c, v, win, YARD.machineDark, LINE_W);
      faceFill(c, v, subQuad(win, 0.06, 0.94, 0.08, 0.92), YARD.glassDark, 0);
      faceFill(c, v, subQuad(win, 0.08, 0.5, 0.1, 0.9), YARD.glass, 0.8, 0.9);
      faceFill(c, v, subQuad(win, 0.15, 0.24, 0.15, 0.85), '#FFFFFF', 0, 0.35);
      // the counter under it
      faceFill(c, v, subQuad(q, 0.54, 0.96, 0.33, 0.38), YARD.steel, 1);
      // the posted price board on the east half: an enamel board on two brackets
      const board = subQuad(q, 0.05, 0.48, 0.2, 0.92);
      faceFill(c, v, subQuad(board, -0.02, 1.02, -0.03, 1.03), YARD.machineDark, LINE_W);
      faceFill(c, v, board, YARD.paper, 0.6);
      faceFill(c, v, subQuad(board, 0, 1, 0.84, 1), YARD.hivis, 0.6);
      faceRows(c, v, board, 6, YARD.paperLine, 0.05, 0.95, 0.06, 0.84, 0.7);
      const grades = ['copper', 'copper', 'brass', 'aluminium', 'cast_iron', 'light_iron'];
      grades.forEach((g, i) => {
        const t = 0.06 + ((0.84 - 0.06) * (5 - i + 0.5)) / 6;
        const sq = subQuad(board, 0.82, 0.92, t - 0.045, t + 0.045);
        faceFill(c, v, sq, METAL[g].base, 0.6);
      });
    },
    onTop: (q) => void q,
  });
  // the roof: a slab a little larger, with its fascia
  box(c, v, { len: len + 0.3, wid: wid + 0.3, h: 0.16, z: h - 0.22, color: YARD.galvanised, bevel: true, onTop: (q) => roofRibs(c, v, q, 12) });
  // a lamp over the window
  const [lx, ly] = proj(v, -0.45, wid / 2 + 0.15, h - 0.3);
  c.drawPath(rrect(lx - 4, ly, 8, 3, 1.5), fill(YARD.hivisLight));
  c.drawPath(rrect(lx - 4, ly, 8, 3, 1.5), stroke(INK, 0.8));
}

/** The price board's face on the scale house (points round the anchor): where the caller writes its rows. */
export function scaleHouseBoard(v: View3q): [number, number, number, number] {
  const { len, wid, h } = SCALE_HOUSE;
  const y = wid / 2;
  const [x0, y0] = proj(v, len / 2 - 0.05 * len, y, 0.18 + (h - 0.4) * 0.92);
  const [x1, y1] = proj(v, len / 2 - 0.48 * len, y, 0.18 + (h - 0.4) * 0.2);
  return [Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0)];
}

// ---------------------------------------------------------------------------
// The inherited hand stripper (cable in, bare bright copper out)
// ---------------------------------------------------------------------------

/**
 * The yard's old hand stripper on its bench, drawn 1.3x (a hand machine must read beside the worker): a
 * cast body with a crank wheel, a blade wheel, a feed guide west with grey cable going in; bare copper
 * runs out east into a galvanised tray; the stripped PVC curls into a bin under the bench.
 * frame 0 idle, 1 and 2 working (the crank turns, copper and PVC come out), 3 tray full.
 */
export function drawHandStripper(c: SkCanvas, v: View3q, frame = 0): void {
  c.save();
  c.scale(1.3, 1.3);
  handStripper(c, v, frame);
  c.restore();
}

function handStripper(c: SkCanvas, v: View3q, frame: number): void {
  const working = frame === 1 || frame === 2;
  boxShadow(c, v, 1.4, 0.7, 0.1, 0, 0.9);
  // the PVC bin under the bench's west end
  box(c, v, { len: 0.38, wid: 0.32, h: 0.34, ox: -0.3, oy: 0.06, color: YARD.pvc, line: 1, onTop: (q) => faceFill(c, v, subQuad(q, 0.1, 0.9, 0.1, 0.9), shade(YARD.pvc, -0.4)) });
  const [bx, by] = proj(v, -0.3, 0.06, 0.34);
  const curls = working || frame === 3 ? 4 : 2;
  for (let i = 0; i < curls; i++) c.drawPath(builder().moveTo(bx - 6 + i * 3.5, by - 1).quadTo(bx - 4 + i * 3.5, by - 6, bx - 1 + i * 3, by - 2).build(), stroke(YARD.pvcGrey, 1.5));
  // the bench: four legs, a wooden top
  for (const [x, y] of [[-0.45, -0.16], [0.45, -0.16], [-0.45, 0.16], [0.45, 0.16]]) box(c, v, { len: 0.05, wid: 0.05, h: 0.78, ox: x, oy: y, color: YARD.steelDark, line: 0.9 });
  box(c, v, { len: 1.0, wid: 0.42, h: 0.06, z: 0.78, color: YARD.wood, line: 1 });
  // the cast body
  box(c, v, { len: 0.34, wid: 0.22, h: 0.22, ox: -0.02, z: 0.84, color: YARD.machine, bevel: true, onFace: (q, n) => n[1] > 0.9 && faceFill(c, v, subQuad(q, 0.15, 0.85, 0.6, 0.85), YARD.hivis, 0.8) });
  // the blade wheel on top
  const [wx, wy] = proj(v, -0.02, 0, 1.1);
  c.drawPath(oval(wx, wy, 7, 3.4), fill(YARD.galvanisedLight));
  c.drawPath(oval(wx, wy, 7, 3.4), stroke(INK, 1));
  // the crank wheel on the south face, its handle turning by frame
  const [kx, ky] = proj(v, 0.06, 0.12, 0.96);
  c.drawPath(circle(kx, ky, 5.6), stroke(INK, 2.6));
  c.drawPath(circle(kx, ky, 5.6), stroke(YARD.hivis, 1.4));
  const ang = [0.4, 1.9, 3.5, 0.4][frame] ?? 0.4;
  const hx = kx + Math.cos(ang) * 5.6;
  const hy = ky + Math.sin(ang) * 5.6;
  c.drawPath(segment(kx, ky, hx, hy), stroke(INK, 1.4));
  c.drawPath(rrect(hx - 1.4, hy - 4, 2.8, 5, 1.2), fill(YARD.machineDark));
  c.drawPath(rrect(hx - 1.4, hy - 4, 2.8, 5, 1.2), stroke(INK, 0.7));
  // the feed guide (west) and the cable going in
  const [fx, fy] = proj(v, -0.24, 0.02, 0.96);
  c.drawPath(oval(fx, fy, 2.6, 3.4), fill(YARD.hivis));
  c.drawPath(oval(fx, fy, 2.6, 3.4), stroke(INK, 0.9));
  const [cx0, cy0] = proj(v, -0.62, 0.22, 0.05);
  const cable = builder().moveTo(cx0, cy0).cubicTo(cx0 - 6, cy0 - 18, fx - 10, fy - 4, fx, fy).build();
  c.drawPath(cable, stroke(INK, 4.6));
  c.drawPath(cable, stroke(YARD.pvcGrey, 2.8));
  // the out tray (east, on the ground) and the bare copper running into it
  box(c, v, {
    len: 0.42,
    wid: 0.36,
    h: 0.16,
    ox: 0.66,
    oy: 0.06,
    color: YARD.galvanised,
    bevel: true,
    onTop: (q) => {
      faceFill(c, v, subQuad(q, 0.08, 0.92, 0.1, 0.9), shade(YARD.galvanised, -0.4));
      const n = frame === 3 ? 9 : frame === 0 ? 2 : 4;
      for (let i = 0; i < n; i++) {
        const [x, y] = proj(v, ...subQuad(q, 0.2 + 0.6 * hash01(i, 7), 0, 0.25 + 0.5 * hash01(i, 8), 0)[0]);
        c.drawPath(oval(x, y - (frame === 3 ? 2 : 0), 4.2, 2.2), stroke(INK, 2.4));
        c.drawPath(oval(x, y - (frame === 3 ? 2 : 0), 4.2, 2.2), stroke(i % 2 ? YARD.copperLight : YARD.copper, 1.2));
      }
    },
  });
  const [sx, sy] = proj(v, 0.15, 0.02, 0.96);
  const [ex, ey] = proj(v, 0.62, 0.06, 0.2);
  if (working || frame === 3) {
    const wire = builder().moveTo(sx, sy).quadTo(ex + 2, sy - 2, ex, ey).build();
    c.drawPath(wire, stroke(INK, 3.2));
    c.drawPath(wire, stroke(YARD.copperLight, 1.6));
    if (working) {
      const k = frame === 1 ? 0.35 : 0.7;
      const gx = sx + (ex - sx) * k;
      const gy = sy + (ey - sy) * k * k - 1;
      c.drawPath(segment(gx - 1.5, gy - 1.5, gx + 1.5, gy + 1.5), stroke(YARD.copperSheen, 1.1));
    }
  }
}

// ---------------------------------------------------------------------------
// The motor bench
// ---------------------------------------------------------------------------

/** An electric motor lying on its side (axis east-west): finned cast body, end caps, a foot, the shaft. */
export function motorGlyph(c: SkCanvas, v: View3q, ox: number, oy: number, z: number, open: boolean): void {
  const r = 0.13;
  const L = 0.34;
  const f: V3 = [0, 1, 0];
  const u: V3 = [0, 0, 1];
  const base = YARD.castIron;
  // the body: a disc at each end joined by its silhouette
  const e0: V3 = [ox - L / 2, oy, z + r];
  const e1: V3 = [ox + L / 2, oy, z + r];
  const [x0, y0] = proj(v, ...e0);
  const [x1] = proj(v, ...e1);
  const R = r * v.ppm;
  const ry = R * v.lift;
  const bodyP = builder().addRect({ x: x0, y: y0 - ry, width: x1 - x0, height: ry * 2 }).build();
  c.drawPath(bodyP, fill(shade(base, 0.1)));
  for (let i = 1; i < 7; i++) c.drawPath(segment(x0 + ((x1 - x0) * i) / 7, y0 - ry + 1, x0 + ((x1 - x0) * i) / 7, y0 + ry - 1), stroke(shade(base, -0.3), 1));
  c.drawPath(bodyP, stroke(INK, 1));
  // the west end cap (cast aluminium) and the east one; when open the windings show at the east end
  c.drawPath(discPath(v, e0, f, u, r * 0.98), fill(YARD.aluminiumDark));
  c.drawPath(discPath(v, e0, f, u, r * 0.98), stroke(INK, 1));
  if (open) {
    c.drawPath(discPath(v, e1, f, u, r * 0.92), fill(YARD.copperDark));
    c.drawPath(discPath(v, e1, f, u, r * 0.7), fill(YARD.copper));
    for (let i = 0; i < 4; i++) c.drawPath(discPath(v, e1, f, u, r * (0.32 + i * 0.12)), stroke(YARD.copperLight, 0.8));
    c.drawPath(discPath(v, e1, f, u, r * 0.92), stroke(INK, 1));
  } else {
    c.drawPath(discPath(v, e1, f, u, r * 0.98), fill(YARD.aluminium));
    c.drawPath(discPath(v, e1, f, u, r * 0.98), stroke(INK, 1));
    const [sx, sy] = proj(v, ox + L / 2 + 0.06, oy, z + r);
    c.drawPath(segment(x1, sy, sx, sy), stroke(INK, 3));
    c.drawPath(segment(x1, sy, sx, sy), stroke(YARD.galvanisedLight, 1.6));
  }
  // the terminal box on top
  const [tx, ty] = proj(v, ox, oy, z + r * 2);
  c.drawPath(rrect(tx - 4, ty - 4, 8, 5, 1), fill(base));
  c.drawPath(rrect(tx - 4, ty - 4, 8, 5, 1), stroke(INK, 0.8));
}

/**
 * The motor bench: a steel workbench with a vice and a press, a motor on it (whole when idle, opened when
 * working, its windings out), and three bins in front for windings (copper), steel and end caps
 * (aluminium). frame 0 idle, 1 and 2 working, 3 bins full. Drawn 1.2x.
 */
export function drawMotorBench(c: SkCanvas, v: View3q, frame = 0): void {
  c.save();
  c.scale(1.2, 1.2);
  motorBench(c, v, frame);
  c.restore();
}

function motorBench(c: SkCanvas, v: View3q, frame: number): void {
  boxShadow(c, v, 1.8, 0.8, 0, 0, 0.9);
  for (const [x, y] of [[-0.75, -0.25], [0.75, -0.25], [-0.75, 0.2], [0.75, 0.2]]) box(c, v, { len: 0.06, wid: 0.06, h: 0.82, ox: x, oy: y, color: YARD.machineDark, line: 0.9 });
  box(c, v, { len: 1.6, wid: 0.25, h: 0.04, z: 0.2, oy: -0.02, color: YARD.machineDark, line: 0.8 });
  box(c, v, { len: 1.65, wid: 0.6, h: 0.07, z: 0.82, color: YARD.machine, bevel: true, onFace: (q, n) => n[1] > 0.9 && hazard(c, poly(subQuad(q, 0.02, 0.98, 0.1, 0.9).map((p) => proj(v, ...p)).flat()), 3, 0.6) });
  // the press frame at the east end (a small hydraulic press: two posts and a head)
  for (const x of [0.48, 0.74]) box(c, v, { len: 0.06, wid: 0.06, h: 0.55, ox: x, oy: -0.15, z: 0.89, color: YARD.hivis, line: 0.9 });
  box(c, v, { len: 0.36, wid: 0.12, h: 0.1, ox: 0.61, oy: -0.15, z: 1.4, color: YARD.hivisDark, line: 0.9 });
  const ram = frame === 1 ? 1.18 : 1.28;
  box(c, v, { len: 0.06, wid: 0.06, h: 1.4 - ram, ox: 0.61, oy: -0.15, z: ram, color: YARD.galvanisedLight, line: 0.8 });
  // the vice at the west end
  box(c, v, { len: 0.18, wid: 0.14, h: 0.12, ox: -0.68, oy: 0.06, z: 0.89, color: YARD.machineDark, line: 0.9 });
  const [hx, hy] = proj(v, -0.68, 0.18, 0.95);
  c.drawPath(segment(hx - 6, hy + 1, hx + 6, hy - 1), stroke(INK, 2.2));
  c.drawPath(segment(hx - 6, hy + 1, hx + 6, hy - 1), stroke(YARD.galvanisedLight, 1));
  // the motor on the bench
  motorGlyph(c, v, frame === 2 ? 0.0 : -0.15, -0.02, 0.89, frame !== 0);
  if (frame === 2) {
    // the stator's windings lifted out beside it
    const [wx, wy] = proj(v, 0.3, 0.12, 0.92);
    for (let i = 0; i < 3; i++) {
      c.drawPath(oval(wx + i * 2, wy - i, 6, 3.4), stroke(INK, 3));
      c.drawPath(oval(wx + i * 2, wy - i, 6, 3.4), stroke(i % 2 ? YARD.copperLight : YARD.copper, 1.6));
    }
  }
  // three bins in front, on the ground: windings, steel, end caps
  const bins: [number, string, string][] = [[-0.5, 'copper', YARD.crateBlue], [0.05, 'light_iron', YARD.machineDark], [0.6, 'aluminium', YARD.crateBlue]];
  const full = frame === 3 ? 4 : frame === 0 ? 0 : 2;
  bins.forEach(([x, metal, col], bi) => {
    box(c, v, {
      len: 0.42,
      wid: 0.34,
      h: 0.3,
      ox: x,
      oy: 0.5,
      color: col,
      line: 1,
      onTop: (q) => {
        faceFill(c, v, subQuad(q, 0.08, 0.92, 0.1, 0.9), shade(col, -0.45));
        for (let i = 0; i < full; i++) {
          const [px, py] = proj(v, ...subQuad(q, 0.25 + 0.5 * hash01(bi, i, 1), 0, 0.3 + 0.4 * hash01(bi, i, 2), 0)[0]);
          if (metal === 'aluminium') {
            c.drawPath(oval(px, py - 1, 4, 2.6), fill(YARD.aluminium));
            c.drawPath(oval(px, py - 1, 4, 2.6), stroke(INK, 0.8));
            c.drawPath(oval(px, py - 1, 1.4, 0.9), fill(YARD.aluminiumDark));
          } else pieceGlyph(c, metal, px, py - 1, 10, (hash01(bi, i) - 0.5) * 60, i + bi);
        }
      },
    });
  });
}

// ---------------------------------------------------------------------------
// The crucible's states (the furnace on its trunnions; hood and mould are separate sprites)
// ---------------------------------------------------------------------------

export type CrucibleState = 'idle' | 'heat' | 'ready' | 'pour' | 'cool';

/**
 * The tilting crucible furnace alone (no hood, no mould), at FURNACE_SCALE: idle (lid on, cold), heat
 * (lid on, burner lit, two frames of heat shimmer), ready (lid aside, the melt glowing), pour (tipped,
 * the stream falling to the mould's height: two frames), cool (righting, lid aside). The stream's foot is
 * MOULD_X east of the anchor at the mould's height, where plant.mould stands.
 */
export function drawCrucibleState(c: SkCanvas, v: View3q, state: CrucibleState, frame = 0, scale = 1.2): void {
  c.save();
  c.scale(scale, scale);
  const tilt = state === 'pour' ? 1 : state === 'cool' ? 0.25 : 0;
  const hot = state !== 'idle';
  const lidOpen = state === 'ready' || state === 'pour' || state === 'cool';
  if (hot) {
    // the burner box's glow on the pad
    const [gx, gy] = proj(v, -0.2, 0.1, 0);
    c.drawPath(oval(gx, gy, 30, 11), radial(gx, gy, 30, ['rgba(255,176,80,0.28)', 'rgba(255,176,80,0)']));
  }
  groundShadow(c, v, 0.55, 0.5, 0, 0, 1.4);
  const lip = drawCrucible(c, v, { tilt, hot: hot && state !== 'heat' ? true : state === 'heat', lidOpen });
  if (state === 'heat') {
    const [px, py] = proj(v, 0, 0, 1.6);
    for (let i = 0; i < 3; i++) {
      const dx = (i - 1) * 7 + (frame ? 2 : -2);
      c.drawPath(builder().moveTo(px + dx, py).quadTo(px + dx + 3, py - 5, px + dx, py - 9).quadTo(px + dx - 3, py - 13, px + dx, py - 17).build(), stroke(YARD.glowHot, 1, 0.55));
    }
  }
  if (state === 'pour') {
    // the stream: straight down from the lip to the mould's top (z 0.12), thick at the lip
    const [, my] = proj(v, 0, 0.3, 0.12);
    const x = lip[0];
    const y0 = lip[1] + 1;
    const wob = frame ? 0.6 : -0.6;
    const s = (w0: number, w1: number, col: string) => c.drawPath(poly([x - w0 / 2, y0, x + w0 / 2, y0, x + w1 / 2 + wob, my, x - w1 / 2 + wob, my]), fill(col));
    s(9, 6, YARD.glow);
    s(6.4, 3.8, YARD.glowHot);
    s(2.6, 1.4, YARD.glowWhite);
    c.drawPath(oval(x, my, 9, 3.6), radial(x, my, 11, [YARD.glowWhite, rgba(YARD.glowHot, 0)]));
    for (let i = 0; i < 6; i++) {
      const dx = (hash01(i, 4 + frame) - 0.5) * 22;
      const dy = -2 - hash01(i, 5 + frame) * 10;
      c.drawPath(segment(x + dx * 0.4, my - 1, x + dx, my + dy), stroke(i % 2 ? YARD.spark : YARD.glowWhite, 1.1));
    }
  }
  c.restore();
}

/** The extraction hood over the crucible pad, alone: two posts, the sloped canopy high enough (2.6 m) that the furnace and its open lid show under it, the duct. lit: the lip warm. */
export function drawHood(c: SkCanvas, v: View3q, lit: boolean, scale = 1.2): void {
  c.save();
  c.scale(scale, scale);
  const x0 = -0.85;
  const x1 = 1.75;
  boxShadow(c, v, 0.15, 0.15, x0 + 0.05, -0.55, 2.6);
  boxShadow(c, v, 0.15, 0.15, x1 - 0.05, -0.55, 2.6);
  for (const x of [x0 + 0.05, x1 - 0.05]) box(c, v, { len: 0.1, wid: 0.1, h: 2.65, ox: x, oy: -0.55, color: YARD.galvanised, line: 1 });
  const zb = 2.6;
  const zt = 2.92;
  const P = (x: number, y: number, z: number) => proj(v, x, y, z);
  const fb0 = P(x0, 0.3, zb);
  const fb1 = P(x1, 0.3, zb);
  const ft1 = P(x1 - 0.5, -0.1, zt);
  const ft0 = P(x0 + 0.5, -0.1, zt);
  const face = poly([fb0[0], fb0[1], fb1[0], fb1[1], ft1[0], ft1[1], ft0[0], ft0[1]]);
  c.drawPath(face, fill(YARD.galvanised));
  c.drawPath(poly([ft0[0], ft0[1], ft1[0], ft1[1], ft1[0], ft1[1] + 8, ft0[0], ft0[1] + 8]), fill(YARD.galvanisedLight));
  for (const k of [0.25, 0.5, 0.75]) {
    const a = [fb0[0] + (fb1[0] - fb0[0]) * k, fb0[1]];
    const b = [ft0[0] + (ft1[0] - ft0[0]) * k, ft0[1]];
    c.drawPath(segment(a[0], a[1], b[0], b[1]), stroke(shade(YARD.galvanised, -0.15), 1));
  }
  c.drawPath(face, stroke(INK, LINE_W));
  const lip = poly([fb0[0], fb0[1], fb1[0], fb1[1], fb1[0], fb1[1] + 4, fb0[0], fb0[1] + 4]);
  c.drawPath(lip, fill(lit ? mix(YARD.galvanised, YARD.glowHot, 0.55) : shade(YARD.galvanised, -0.2)));
  c.drawPath(lip, stroke(INK, 1));
  const [dx, dy] = P((x0 + x1) / 2, -0.1, zt);
  const dw = 0.26 * v.ppm;
  c.drawPath(rect(dx - dw, dy - 26, dw * 2, 27), fill(YARD.galvanised));
  c.drawRect({ x: dx - dw + 2, y: dy - 26, width: 3, height: 27 }, fill(YARD.galvanisedLight));
  c.drawPath(rect(dx - dw, dy - 26, dw * 2, 27), stroke(INK, LINE_W));
  c.drawPath(rrect(dx - dw - 2, dy - 18, dw * 2 + 4, 4, 1), fill(YARD.galvanisedLight));
  c.drawPath(rrect(dx - dw - 2, dy - 18, dw * 2 + 4, 4, 1), stroke(INK, 1));
  c.restore();
}

// ---------------------------------------------------------------------------
// Stock: lock blocks, the bay, stillages and their fills, the converter cage, the hold flag, plates
// ---------------------------------------------------------------------------

/** One interlocking concrete block (0.8 x 0.8 x 0.6 m) with its two lifting knobs. */
export function drawBlock(c: SkCanvas, v: View3q, o: { ox?: number; oy?: number; z?: number; seed?: number; shadow?: boolean } = {}): void {
  const b = 0.8;
  if (o.shadow !== false && !o.z) boxShadow(c, v, b, b, o.ox ?? 0, o.oy ?? 0, 0.6);
  const seed = o.seed ?? 1;
  const col = shade(BLOCK, (hash01(seed, 3) - 0.5) * 0.08);
  box(c, v, {
    len: b,
    wid: b,
    h: b * 0.75,
    ox: o.ox,
    oy: o.oy,
    z: o.z,
    color: col,
    line: 1,
    onFace: (q, n) => {
      if (n[1] < 0.9) return;
      const [x, y] = proj(v, ...subQuad(q, 0.2, 0, 0.3, 0)[0]);
      freckles(c, x, y - 10, 18, 8, seed, shade(BLOCK, -0.2), 4);
      // a chipped corner
      if (hash01(seed, 9) > 0.5) faceFill(c, v, subQuad(q, 0.9, 1, 0.82, 1), shade(col, -0.18));
    },
    onTop: (q) => {
      for (const s0 of [0.3, 0.7]) {
        const [kx, ky] = proj(v, ...subQuad(q, s0, s0, 0.5, 0.5)[0]);
        c.drawPath(oval(kx, ky, 3.2, 2.2), fill(shade(col, -0.1)));
        c.drawPath(oval(kx, ky, 3.2, 2.2), stroke(INK, 0.7));
      }
    },
  });
}

/** A bay of lock blocks: a back wall four blocks long and two high, a block at each back corner, open south. 3.2 x 2.4 m. */
export function drawBayWalls(c: SkCanvas, v: View3q): void {
  const b = 0.8;
  const w = 3.2;
  const d = 2.4;
  boxShadow(c, v, w + 1.6, b, 0, -d / 2 + b / 2, 1.2);
  for (let i = 0; i < 4; i++) {
    drawBlock(c, v, { ox: -w / 2 + b / 2 + i * b, oy: -d / 2 + b / 2, seed: i + 1, shadow: false });
    drawBlock(c, v, { ox: -w / 2 + b / 2 + i * b, oy: -d / 2 + b / 2, z: b * 0.75, seed: i + 7, shadow: false });
  }
  for (const side of [-1, 1]) drawBlock(c, v, { ox: side * (w / 2 + b / 2), oy: -d / 2 + b / 2, seed: side + 4, shadow: false });
}

/** Where a bay's code plate hangs on its back wall (points round the bay's anchor). */
export const bayPlate = (v: View3q): [number, number] => proj(v, 0, -1.2 + 0.8, 0.8 * 1.25);

/** A small enamel code plate (blank; the caller paints the grade code), 40 x 16 points, centred. */
export function drawCodePlate(c: SkCanvas): void {
  c.drawPath(rrect(-20 + 1.5, -8 + 1.5, 40, 16, 2.5), fill(INK, 0.22));
  c.drawPath(rrect(-20, -8, 40, 16, 2.5), fill(YARD.paper));
  c.drawPath(rrect(-20, -8, 40, 16, 2.5), stroke(INK, 1.1));
  for (const x of [-16.5, 16.5]) c.drawCircle(x, 0, 1.1, fill(YARD.steel));
}

/** A low heap of a grade's pieces lying in a bay (k 0.5 part, 1 full), anchored on the bay's floor centre. */
export function drawBayHeap(c: SkCanvas, v: View3q, metals: string[], k: number, seed = 1, widthM = 2.9): void {
  const w = widthM * v.ppm;
  const h = (k > 0.7 ? 34 : 20) * (v.ppm / 40);
  const rx = w / 2;
  const ry = Math.min(0.85, widthM * 0.3) * v.ppm * v.tilt;
  c.drawPath(oval(4, 3, rx * 0.98, ry), fill(YARD.shadow, 0.22));
  const base = METAL[metals[0]]?.base ?? YARD.steel;
  const mound = builder().moveTo(-rx, 2).quadTo(-rx * 0.6, -h * 1.05, 0, -h).quadTo(rx * 0.55, -h * 1.05, rx, 2).quadTo(0, ry * 1.1, -rx, 2).close().build();
  c.drawPath(mound, fill(shade(base, -0.35)));
  c.drawPath(mound, stroke(INK, 1));
  const n = Math.round((k > 0.7 ? 30 : 16) * Math.max(0.5, widthM / 2.9));
  for (let i = 0; i < n; i++) {
    const u = hash01(seed, i, 1) * 2 - 1;
    const top = -h * (1 - u * u) * 0.95;
    const y = top + (2 - top) * hash01(seed, i, 2) * 0.85;
    pieceGlyph(c, metals[i % metals.length], u * rx * 0.88, y, 14 * (v.ppm / 40), (hash01(seed, i, 3) - 0.5) * 90, i + seed);
  }
}

export const STILLAGE = { len: 1.2, wid: 1.0, h: 0.85 };

/** A galvanised mesh stillage (box pallet): feet, corner posts, mesh sides, its front gate half height. Empty. */
export function drawStillage(c: SkCanvas, v: View3q, front = true): void {
  const { len, wid, h } = STILLAGE;
  boxShadow(c, v, len, wid, 0, 0, h);
  // the floor (pallet base) and the back and side mesh
  box(c, v, { len, wid, h: 0.12, color: YARD.galvanised, line: 1, onTop: (q) => faceFill(c, v, subQuad(q, 0.04, 0.96, 0.04, 0.96), shade(YARD.galvanised, -0.3)) });
  const back = (pts: V3[]) => {
    const p = pts.map((pt) => proj(v, ...pt));
    for (let i = 1; i < 10; i++) {
      const k = i / 10;
      c.drawPath(segment(p[0][0] + (p[1][0] - p[0][0]) * k, p[0][1] + (p[1][1] - p[0][1]) * k, p[3][0] + (p[2][0] - p[3][0]) * k, p[3][1] + (p[2][1] - p[3][1]) * k), stroke(YARD.steel, 0.8));
    }
    for (let j = 1; j < 5; j++) {
      const k = j / 5;
      c.drawPath(segment(p[0][0] + (p[3][0] - p[0][0]) * k, p[0][1] + (p[3][1] - p[0][1]) * k, p[1][0] + (p[2][0] - p[1][0]) * k, p[1][1] + (p[2][1] - p[1][1]) * k), stroke(YARD.steel, 0.8));
    }
    c.drawPath(poly(p.flat()), stroke(INK, 0.9));
  };
  const L = len / 2;
  const W = wid / 2;
  back([[-L, -W, 0.12], [L, -W, 0.12], [L, -W, h], [-L, -W, h]]);
  back([[-L, -W, 0.12], [-L, W, 0.12], [-L, W, h], [-L, -W, h]]);
  back([[L, -W, 0.12], [L, W, 0.12], [L, W, h], [L, -W, h]]);
  for (const [x, y] of [[-L, -W], [L, -W]]) box(c, v, { len: 0.05, wid: 0.05, h, ox: x, oy: y, color: YARD.galvanisedLight, line: 0.9 });
  if (front) drawStillageFront(c, v);
}

/** The stillage's front: two corner posts, the drop gate's mesh at half height, its top rail. */
export function drawStillageFront(c: SkCanvas, v: View3q): void {
  const { len, wid, h } = STILLAGE;
  const L = len / 2;
  const W = wid / 2;
  const p = ([[-L, W, 0.12], [L, W, 0.12], [L, W, h * 0.55], [-L, W, h * 0.55]] as V3[]).map((pt) => proj(v, ...pt));
  for (let i = 1; i < 10; i++) {
    const k = i / 10;
    c.drawPath(segment(p[0][0] + (p[1][0] - p[0][0]) * k, p[0][1], p[3][0] + (p[2][0] - p[3][0]) * k, p[3][1]), stroke(YARD.galvanisedLight, 0.9));
  }
  c.drawPath(segment(p[0][0], (p[0][1] + p[3][1]) / 2, p[1][0], (p[1][1] + p[2][1]) / 2), stroke(YARD.galvanisedLight, 0.9));
  c.drawPath(poly(p.flat()), stroke(INK, 0.9));
  c.drawPath(segment(p[3][0], p[3][1], p[2][0], p[2][1]), stroke(INK, 2.6));
  c.drawPath(segment(p[3][0], p[3][1], p[2][0], p[2][1]), stroke(YARD.galvanisedLight, 1.2));
  for (const x of [-L, L]) box(c, v, { len: 0.05, wid: 0.05, h, ox: x, oy: W, color: YARD.galvanisedLight, line: 0.9 });
}

/** The grades kept in stillages, by the content's grade ids (content2 `grades`; ferrous grades go in lock-block bays). */
export const STILLAGE_GRADES = ['bb', 'no2', 'brs', 'alw', 'alcast', 'bri', 'ali', 'ald', 'brd', 'mot', 'cab', 'cyl', 'batt'] as const;
export type StillageGrade = (typeof STILLAGE_GRADES)[number];

/** One piece of a stillage grade at (x, y) points, about s long. */
function stillagePiece(c: SkCanvas, g: StillageGrade, x: number, y: number, s: number, seed: number): void {
  const turn = (hash01(seed, 1) - 0.5) * 70;
  switch (g) {
    case 'bb':
      pieceGlyph(c, 'copper', x, y, s, turn, seed * 2);
      return;
    case 'no2': {
      // No.2: tube offcuts and dull windings, darker than bare bright
      c.save();
      c.translate(x, y);
      c.rotate(turn, 0, 0);
      if (seed % 2) {
        c.drawPath(rrect(-s / 2, -s * 0.14, s, s * 0.28, s * 0.14), fill(YARD.copperDark));
        c.drawPath(rrect(-s / 2, -s * 0.14, s, s * 0.28, s * 0.14), stroke(INK, 0.9));
        c.drawPath(oval(s / 2 - 1, 0, s * 0.08, s * 0.14), fill(YARD.copperLight));
      } else {
        c.drawPath(oval(0, 0, s * 0.42, s * 0.26), stroke(INK, 3));
        c.drawPath(oval(0, 0, s * 0.42, s * 0.26), stroke(shade(YARD.copper, -0.15), 1.6));
      }
      c.restore();
      return;
    }
    case 'brs':
      pieceGlyph(c, 'brass', x, y, s, turn, seed);
      return;
    case 'alw': {
      // an aluminium wheel: rim, five spokes, hub
      const r = s * 0.5;
      c.drawPath(oval(x, y, r, r * 0.8), fill(YARD.aluminium));
      c.drawPath(oval(x, y, r, r * 0.8), stroke(INK, 1));
      c.drawPath(oval(x, y, r * 0.74, r * 0.58), fill(YARD.aluminiumDark));
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + seed;
        c.drawPath(segment(x, y, x + Math.cos(a) * r * 0.72, y + Math.sin(a) * r * 0.56), stroke(YARD.aluminiumLight, 2));
      }
      c.drawPath(oval(x, y, r * 0.2, r * 0.16), fill(YARD.aluminium));
      c.drawPath(oval(x, y, r * 0.2, r * 0.16), stroke(INK, 0.8));
      return;
    }
    case 'alcast': {
      // cast aluminium end caps: a dished disc with bolt lugs
      const r = s * 0.38;
      c.drawPath(oval(x, y, r, r * 0.72), fill(shade(YARD.aluminium, -0.08)));
      c.drawPath(oval(x, y, r, r * 0.72), stroke(INK, 1));
      c.drawPath(oval(x, y + 0.5, r * 0.4, r * 0.3), fill(YARD.aluminiumDark));
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.6;
        c.drawCircle(x + Math.cos(a) * r * 1.05, y + Math.sin(a) * r * 0.76, 1.4, fill(YARD.aluminiumDark));
      }
      return;
    }
    case 'bri':
    case 'ali': {
      // a stamped, notched ingot lying flat
      const col = g === 'bri' ? YARD.brass : YARD.aluminium;
      const dark = g === 'bri' ? YARD.brassDark : YARD.aluminiumDark;
      const w = s;
      const h = s * 0.32;
      c.drawPath(poly([x - w / 2, y, x + w / 2, y, x + w / 2 - 2, y - h, x - w / 2 + 2, y - h]), fill(col));
      c.drawPath(rect(x - w / 2, y, w, h * 0.55), fill(dark));
      c.drawPath(poly([x - w / 2, y + h * 0.55, x + w / 2, y + h * 0.55, x + w / 2, y, x + w / 2 - 2, y - h, x - w / 2 + 2, y - h, x - w / 2, y]), stroke(INK, 0.9));
      for (const k of [-0.18, 0.18]) c.drawPath(segment(x + w * k, y - h + 0.5, x + w * k, y - 0.5), stroke(dark, 1));
      return;
    }
    case 'ald':
    case 'brd': {
      const b = builder().moveTo(x - s * 0.4, y + 1);
      for (let i = 0; i < 6; i++) b.lineTo(x - s * 0.4 + (s * 0.8 * (i + 0.5)) / 6, y - s * (0.15 + hash01(seed, i) * 0.25));
      b.lineTo(x + s * 0.4, y + 1).close();
      c.drawPath(b.build(), fill(g === 'brd' ? (seed % 2 ? '#8C7D52' : '#76693F') : seed % 2 ? '#9A9790' : '#85827B'));
      c.drawPath(b.build(), stroke(INK, 0.9));
      return;
    }
    case 'mot':
      c.drawPath(rrect(x - s * 0.45, y - s * 0.24, s * 0.9, s * 0.42, s * 0.18), fill(YARD.castIron));
      for (let i = 1; i < 5; i++) c.drawPath(segment(x - s * 0.45 + s * 0.18 * i, y - s * 0.2, x - s * 0.45 + s * 0.18 * i, y + s * 0.14), stroke(shade(YARD.castIron, 0.25), 0.9));
      c.drawPath(rrect(x - s * 0.45, y - s * 0.24, s * 0.9, s * 0.42, s * 0.18), stroke(INK, 0.9));
      c.drawPath(oval(x + s * 0.45, y - s * 0.03, s * 0.08, s * 0.2), fill(YARD.aluminium));
      return;
    case 'cyl': {
      // a copper hot-water cylinder lying down, its domed end and a brass boss
      c.drawPath(rrect(x - s * 0.55, y - s * 0.26, s * 1.1, s * 0.5, s * 0.24), fill(YARD.copper));
      c.drawPath(rect(x - s * 0.4, y - s * 0.2, s * 0.8, s * 0.08), fill(YARD.copperLight));
      c.drawPath(rrect(x - s * 0.55, y - s * 0.26, s * 1.1, s * 0.5, s * 0.24), stroke(INK, 0.9));
      c.drawCircle(x + s * 0.2, y - s * 0.26, s * 0.07, fill(YARD.brass));
      return;
    }
    case 'batt': {
      // a lead-acid battery: black case, two terminals, a vented lid (kept in a sealed acid-proof box)
      c.drawPath(rrect(x - s * 0.4, y - s * 0.32, s * 0.8, s * 0.46, 1.5), fill('#2E3135'));
      c.drawPath(rect(x - s * 0.4, y - s * 0.32, s * 0.8, s * 0.1), fill('#4A4F55'));
      c.drawPath(rrect(x - s * 0.4, y - s * 0.32, s * 0.8, s * 0.46, 1.5), stroke(INK, 0.9));
      c.drawCircle(x - s * 0.24, y - s * 0.36, 1.4, fill('#C8352B'));
      c.drawCircle(x + s * 0.24, y - s * 0.36, 1.4, fill(YARD.galvanisedLight));
      return;
    }
    case 'cab':
      c.drawPath(oval(x, y, s * 0.45, s * 0.28), stroke(INK, 3.6));
      c.drawPath(oval(x, y, s * 0.45, s * 0.28), stroke(seed % 2 ? YARD.pvc : YARD.pvcGrey, 2.2));
      c.drawPath(oval(x + 1, y - 1, s * 0.32, s * 0.2), stroke(INK, 3.2));
      c.drawPath(oval(x + 1, y - 1, s * 0.32, s * 0.2), stroke(YARD.pvcGrey, 1.8));
      c.drawCircle(x + s * 0.45, y, 1.4, fill(YARD.copperLight));
      return;
  }
}

/** What a stillage holds (part or full) with its front drawn over it: a sprite laid over plant.stillage. */
export function drawStillageFill(c: SkCanvas, v: View3q, g: StillageGrade, full: boolean): void {
  const { len, wid } = STILLAGE;
  const n = full ? 22 : 10;
  const topZ = full ? 0.8 : 0.42;
  for (let i = 0; i < n; i++) {
    const s = hash01(g.length, i, 1);
    const t = hash01(g.length, i, 2);
    const layer = i / n;
    const z = 0.14 + (topZ - 0.14) * layer;
    const [x, y] = proj(v, (s - 0.5) * (len - 0.3), (t - 0.5) * (wid - 0.35), z);
    stillagePiece(c, g, x, y, 15, i + 3);
  }
  drawStillageFront(c, v);
}

/** One layer of a grade's pieces lying in a stillage (no front): the world draws one for part, two (the second STILLAGE_LAYER_DY up) for full. */
export function drawStillageLayer(c: SkCanvas, v: View3q, g: StillageGrade): void {
  const { len, wid } = STILLAGE;
  if (g === 'bri' || g === 'ali') {
    // ingots are stacked flat in rows, two courses, and strapped (never a pyramid of bars)
    const metal = g === 'bri' ? 'brass' : 'aluminium';
    for (let k = 0; k < 2; k++) {
      const z = 0.14 + k * 0.1;
      for (let r = 0; r < 3; r++) for (let i = 0; i < 2; i++) drawIngot(c, v, metal, 99, { ox: (i - 0.5) * 0.5, oy: (r - 1) * 0.24 + (k ? 0.04 : 0), z, shadow: false });
    }
    // the steel strap round both courses
    for (const sx of [-0.25, 0.25]) {
      const a = proj(v, sx, -0.36, 0.34);
      const b = proj(v, sx, 0.36, 0.34);
      const d = proj(v, sx, 0.36, 0.14);
      c.drawPath(builder().moveTo(a[0], a[1]).lineTo(b[0], b[1]).lineTo(d[0], d[1]).build(), stroke(INK, 2.4));
      c.drawPath(builder().moveTo(a[0], a[1]).lineTo(b[0], b[1]).lineTo(d[0], d[1]).build(), stroke(YARD.galvanisedLight, 1.1));
    }
    return;
  }
  const n = 11;
  for (let i = 0; i < n; i++) {
    const s = hash01(g.length, i, 1);
    const t = hash01(g.length, i, 2);
    const z = 0.14 + 0.28 * (i / n);
    const [x, y] = proj(v, (s - 0.5) * (len - 0.3), (t - 0.5) * (wid - 0.35), z);
    stillagePiece(c, g, x, y, 15, i + 3);
  }
}

/** The converter cage: a lockable galvanised mesh cage on legs with its padlocked door; whole converters inside when part. */
export function drawConverterCage(c: SkCanvas, v: View3q, frame = 0): void {
  const len = 1.2;
  const wid = 0.9;
  const h = 1.2;
  boxShadow(c, v, len, wid, 0, 0, h);
  box(c, v, { len, wid, h: 0.1, z: 0.12, color: YARD.galvanised, line: 1 });
  for (const [x, y] of [[-0.55, -0.4], [0.55, -0.4], [-0.55, 0.4], [0.55, 0.4]]) box(c, v, { len: 0.06, wid: 0.06, h, ox: x, oy: y, color: YARD.galvanisedLight, line: 0.9 });
  if (frame === 1) {
    for (let i = 0; i < 3; i++) {
      const [x, y] = proj(v, -0.3 + i * 0.3, 0.05 - (i % 2) * 0.15, 0.3);
      c.drawPath(rrect(x - 9, y - 6, 18, 11, 5), fill(YARD.steel));
      c.drawPath(rrect(x - 9, y - 6, 18, 11, 5), stroke(INK, 1));
      c.drawPath(rrect(x - 6, y - 4, 12, 4, 2), fill(YARD.galvanisedLight));
      c.drawPath(segment(x + 9, y - 1, x + 13, y - 1), stroke(INK, 2.6));
    }
  }
  // the mesh front and top
  const q = ([[-0.6, 0.45, 0.22], [0.6, 0.45, 0.22], [0.6, 0.45, h], [-0.6, 0.45, h]] as V3[]).map((pt) => proj(v, ...pt));
  for (let i = 1; i < 12; i++) {
    const k = i / 12;
    c.drawPath(segment(q[0][0] + (q[1][0] - q[0][0]) * k, q[0][1], q[0][0] + (q[1][0] - q[0][0]) * k, q[3][1]), stroke(YARD.galvanisedLight, 0.8));
  }
  for (let j = 1; j < 8; j++) {
    const yy = q[0][1] + (q[3][1] - q[0][1]) * (j / 8);
    c.drawPath(segment(q[0][0], yy, q[1][0], yy), stroke(YARD.galvanisedLight, 0.8));
  }
  c.drawPath(poly(q.flat()), stroke(INK, 1));
  const tq = ([[-0.6, -0.45, h], [0.6, -0.45, h], [0.6, 0.45, h], [-0.6, 0.45, h]] as V3[]).map((pt) => proj(v, ...pt));
  c.drawPath(poly(tq.flat()), fill(YARD.galvanised, 0.25));
  c.drawPath(poly(tq.flat()), stroke(INK, 1));
  // the padlock on the door's hasp
  const [lx, ly] = proj(v, 0.1, 0.45, h * 0.55);
  c.drawPath(builder().addArc({ x: lx - 2.6, y: ly - 6, width: 5.2, height: 6 }, 180, 180).build(), stroke(INK, 1.4));
  c.drawPath(rrect(lx - 3.6, ly - 3, 7.2, 6, 1.2), fill(YARD.hivis));
  c.drawPath(rrect(lx - 3.6, ly - 3, 7.2, 6, 1.2), stroke(INK, 0.9));
}

/** The hold flag on its short pole (a hi-vis pennant), anchored at the pole's foot. */
export function drawHoldFlag(c: SkCanvas, v: View3q): void {
  groundShadow(c, v, 0.08, 0.06, 0, 0, 1.0);
  const [x, y] = proj(v, 0, 0, 0);
  const top = y - 1.0 * v.ppm * v.lift;
  c.drawPath(segment(x, y, x, top), stroke(INK, 2.4));
  c.drawPath(segment(x, y, x, top), stroke(YARD.galvanisedLight, 1.2));
  const flag = builder().moveTo(x, top).quadTo(x + 12, top + 2, x + 22, top + 6).quadTo(x + 12, top + 9, x, top + 13).close().build();
  c.drawPath(flag, fill(YARD.hivis));
  c.drawPath(flag, stroke(INK, 1.1));
  c.drawPath(segment(x + 3, top + 6, x + 15, top + 6.5), stroke(YARD.ink, 1.6));
}

// ---------------------------------------------------------------------------
// The portacabin office, the tool rack
// ---------------------------------------------------------------------------

export const CABIN = { len: 4.4, wid: 2.4, h: 2.6 };

/**
 * The portacabin office on its blocks: ribbed panels, two windows, a door with a step and handrail (open
 * when `door` is 1), the site licence's framed plaque beside the door and the rota board (a whiteboard
 * with ruled rows) on the wall. The plaque and the board are blank: the caller writes on them.
 */
export function drawPortacabin(c: SkCanvas, v: View3q, door = 0): void {
  const { len, wid, h } = CABIN;
  const body = '#E6E6DD';
  boxShadow(c, v, len, wid, 0, 0, h + 0.25);
  for (const x of [-1.7, 0, 1.7]) box(c, v, { len: 0.4, wid: 0.4, h: 0.22, ox: x, oy: 0.8, color: BLOCK, line: 0.8 });
  box(c, v, {
    len,
    wid,
    h,
    z: 0.22,
    color: body,
    onFace: (q, n) => {
      if (n[1] < 0.9) return;
      for (let i = 1; i < 18; i++) faceFill(c, v, subQuad(q, i / 18 - 0.004, i / 18 + 0.004, 0.03, 0.97), shade(body, -0.1));
      faceFill(c, v, subQuad(q, 0, 1, 0, 0.05), YARD.machineDark);
      faceFill(c, v, subQuad(q, 0, 1, 0.94, 1), YARD.machineDark);
      // two windows (s runs east to west)
      for (const s0 of [0.06, 0.76]) {
        const win = subQuad(q, s0, s0 + 0.18, 0.44, 0.8);
        faceFill(c, v, win, YARD.machineDark, LINE_W);
        faceFill(c, v, subQuad(win, 0.08, 0.92, 0.08, 0.92), YARD.glassDark);
        faceFill(c, v, subQuad(win, 0.1, 0.45, 0.1, 0.9), YARD.glass, 0, 0.9);
        faceFill(c, v, subQuad(win, 0.48, 0.52, 0.05, 0.95), YARD.machineDark);
      }
      // the door
      const dr = subQuad(q, 0.5, 0.64, 0.04, 0.82);
      if (door) {
        faceFill(c, v, dr, '#3A3F45', LINE_W);
        faceFill(c, v, subQuad(dr, 0.6, 1.25, 0, 1), YARD.machine, LINE_W);
      } else {
        faceFill(c, v, dr, YARD.machine, LINE_W);
        faceFill(c, v, subQuad(dr, 0.15, 0.85, 0.6, 0.85), YARD.glassDark, 0.8);
        const [hx, hy] = proj(v, ...subQuad(dr, 0.82, 0, 0.45, 0)[0]);
        c.drawPath(segment(hx, hy, hx - 3, hy), stroke(INK, 1.6));
      }
      // the site licence: a framed plaque beside the door (east)
      const pl = subQuad(q, 0.42, 0.48, 0.5, 0.68);
      faceFill(c, v, subQuad(pl, -0.08, 1.08, -0.08, 1.08), YARD.wood, 0.9);
      faceFill(c, v, pl, YARD.paper, 0.6);
      faceFill(c, v, subQuad(pl, 0.1, 0.9, 0.78, 0.9), YARD.stampBlue);
      faceRows(c, v, pl, 3, YARD.paperLine, 0.15, 0.85, 0.2, 0.65, 0.6);
      // the rota board: a whiteboard with ruled rows and three role swatches
      const rb = subQuad(q, 0.27, 0.4, 0.36, 0.78);
      faceFill(c, v, subQuad(rb, -0.03, 1.03, -0.04, 1.04), YARD.galvanised, 0.9);
      faceFill(c, v, rb, '#FFFFFF', 0.6);
      faceRows(c, v, rb, 4, YARD.paperLine, 0.05, 0.95, 0.1, 0.85, 0.6);
      [YARD.vestYardHand, YARD.vestCutter, YARD.vestDriver].forEach((col, i) => {
        const t = 0.1 + (0.75 * (2 - i + 0.5)) / 4;
        faceFill(c, v, subQuad(rb, 0.82, 0.93, t - 0.06, t + 0.06), col, 0.5);
      });
    },
  });
  // the roof's lip
  box(c, v, { len: len + 0.1, wid: wid + 0.1, h: 0.08, z: h + 0.22, color: YARD.galvanised, front: YARD.machineDark, line: 1, onTop: (q) => roofRibs(c, v, q, 16) });
  // a roof vent and an aerial: something on the roof the eye can hold
  box(c, v, { len: 0.3, wid: 0.3, h: 0.18, ox: -1.2, oy: -0.3, z: h + 0.3, color: YARD.galvanisedLight, line: 0.9 });
  // the step and handrail in front of the door
  const dx = len / 2 - 0.57 * len;
  box(c, v, { len: 0.9, wid: 0.55, h: 0.22, ox: dx, oy: wid / 2 + 0.3, color: YARD.galvanised, bevel: true, line: 1 });
  const [r0x, r0y] = proj(v, dx + 0.45, wid / 2 + 0.55, 0.22);
  const [r1x, r1y] = proj(v, dx + 0.45, wid / 2 + 0.55, 1.1);
  c.drawPath(segment(r0x, r0y, r1x, r1y), stroke(INK, 2.4));
  c.drawPath(segment(r0x, r0y, r1x, r1y), stroke(YARD.hivis, 1.2));
  c.drawPath(segment(r1x, r1y, r1x - 6, r1y - 4), stroke(INK, 2.4));
  c.drawPath(segment(r1x, r1y, r1x - 6, r1y - 4), stroke(YARD.hivis, 1.2));
}

/** The portacabin's plaque and rota board faces, points round its anchor (where the caller writes). */
export function cabinSlots(v: View3q): { plaque: [number, number, number, number]; rota: [number, number, number, number] } {
  const { len, wid, h } = CABIN;
  const face = (s0: number, s1: number, t0: number, t1: number): [number, number, number, number] => {
    const [x0, y0] = proj(v, len / 2 - s1 * len, wid / 2, 0.22 + h * t1);
    const [x1, y1] = proj(v, len / 2 - s0 * len, wid / 2, 0.22 + h * t0);
    return [x0, y0, x1 - x0, y1 - y0];
  };
  return { plaque: face(0.42, 0.48, 0.5, 0.68), rota: face(0.27, 0.4, 0.36, 0.78) };
}

/** A sledgehammer, a grinder, a torch with its two bottles: the tool rack's tools by tier. */
export function drawToolRack(c: SkCanvas, v: View3q, tier = 1): void {
  const len = 1.9;
  boxShadow(c, v, len, 0.5, 0, 0, 2.0);
  // the frame: two posts, a pent roof, a perforated back board
  for (const x of [-len / 2 + 0.05, len / 2 - 0.05]) box(c, v, { len: 0.08, wid: 0.08, h: 2.0, ox: x, color: YARD.machineDark, line: 1 });
  box(c, v, {
    len: len - 0.1,
    wid: 0.06,
    h: 1.5,
    z: 0.4,
    oy: -0.1,
    color: YARD.galvanisedLight,
    line: 1,
    onFace: (q, n) => {
      if (n[1] < 0.9) return;
      for (let j = 1; j < 9; j++)
        for (let i = 1; i < 16; i++) {
          const [x, y] = proj(v, ...subQuad(q, i / 16, 0, j / 9, 0)[0]);
          c.drawCircle(x, y, 0.6, fill(YARD.steel));
        }
    },
  });
  box(c, v, { len: len + 0.2, wid: 0.6, h: 0.08, z: 2.0, color: YARD.machine, bevel: true });
  drawRackTools(c, v, 1);
  if (tier >= 2) drawRackTools(c, v, 2);
  if (tier >= 3) drawRackTools(c, v, 3);
}

/** The tools one tier adds to the rack (an overlay at the rack's anchor): 1 spanners and bolt cutters, 2 sledgehammer and grinder, 3 the torch and its bottles. */
export function drawRackTools(c: SkCanvas, v: View3q, tier: number): void {
  const len = 1.9;
  const at = (s: number, t: number) => proj(v, len / 2 - 0.05 - s * (len - 0.1), -0.06, 0.4 + t * 1.5);
  if (tier === 1) {
  // tier 1: a spanner set, bolt cutters, a pry bar
  const [sx, sy] = at(0.06, 0.75);
  for (let i = 0; i < 5; i++) {
    const x = sx + i * 3.2;
    c.drawPath(segment(x, sy, x, sy + 9 + i * 1.6), stroke(INK, 2.2));
    c.drawPath(segment(x, sy, x, sy + 9 + i * 1.6), stroke(YARD.galvanisedLight, 1));
    c.drawPath(oval(x, sy - 1, 1.6, 1.4), stroke(INK, 1));
  }
  const [bx, by] = at(0.3, 0.85);
  c.drawPath(builder().moveTo(bx - 3, by).lineTo(bx - 1, by + 20).moveTo(bx + 3, by).lineTo(bx + 1, by + 20).build(), stroke(INK, 2.4));
  c.drawPath(builder().moveTo(bx - 3, by).lineTo(bx - 1, by + 12).moveTo(bx + 3, by).lineTo(bx + 1, by + 12).build(), stroke(YARD.skip, 1.5));
  c.drawPath(builder().moveTo(bx - 1, by + 20).lineTo(bx, by + 25).lineTo(bx + 1, by + 20).build(), stroke(INK, 1.4));
  }
  // tier 2: the sledgehammer and the angle grinder
  if (tier === 2) {
    const [hx, hy] = at(0.5, 0.9);
    c.drawPath(segment(hx, hy, hx, hy + 26), stroke(INK, 3));
    c.drawPath(segment(hx, hy, hx, hy + 26), stroke(YARD.wood, 1.8));
    c.drawPath(rrect(hx - 6, hy - 3, 12, 6, 1.4), fill(YARD.steelDark));
    c.drawPath(rrect(hx - 6, hy - 3, 12, 6, 1.4), stroke(INK, 1));
    const [gx, gy] = at(0.66, 0.6);
    c.drawPath(rrect(gx - 9, gy - 3, 15, 6, 3), fill(YARD.vestCutter));
    c.drawPath(rrect(gx - 9, gy - 3, 15, 6, 3), stroke(INK, 1));
    c.drawPath(oval(gx + 8, gy + 2, 2.5, 5.5), fill(YARD.galvanised));
    c.drawPath(oval(gx + 8, gy + 2, 2.5, 5.5), stroke(INK, 0.9));
    c.drawPath(segment(gx - 9, gy, gx - 12, gy + 8), stroke(INK, 1.2));
  }
  // tier 3: the torch on its hose and two bottles in a stand at the east end
  if (tier === 3) {
    const [tx, ty] = at(0.86, 0.85);
    c.drawPath(builder().moveTo(tx, ty).cubicTo(tx - 6, ty + 10, tx + 6, ty + 16, tx + 2, ty + 24).build(), stroke(INK, 2.6));
    c.drawPath(builder().moveTo(tx, ty).cubicTo(tx - 6, ty + 10, tx + 6, ty + 16, tx + 2, ty + 24).build(), stroke(YARD.vestDriver, 1.2));
    c.drawPath(segment(tx - 3, ty - 2, tx + 7, ty - 6), stroke(INK, 2.2));
    c.drawPath(segment(tx - 3, ty - 2, tx + 7, ty - 6), stroke(YARD.brass, 1.2));
    for (const [x, col] of [[len / 2 + 0.22, '#2F3236'], [len / 2 + 0.48, '#B8452C']] as [number, string][]) cylinder(c, v, { r: 0.12, h: 1.2, ox: x, oy: 0.1, color: col, line: 1 });
    box(c, v, { len: 0.62, wid: 0.1, h: 0.08, ox: len / 2 + 0.35, oy: 0.25, z: 0.8, color: YARD.hivis, line: 0.9 });
  }
}

// ---------------------------------------------------------------------------
// The sign crane, signs on posts, gates and fences, the extinguisher, the rubble skip
// ---------------------------------------------------------------------------

/** Where the sign crane's hook hangs a sign (metres from its anchor; the sign's top edge). */
export const CRANE_HOOK: V3 = [2.1, 0.2, 3.1];

/**
 * The sign crane: a hi-vis lattice mast on a ballast base with a horizontal jib, its trolley and two chains
 * (the yard's sign hangs from them: plant.sign.hung, drawn by the world at CRANE_HOOK).
 */
export function drawSignCrane(c: SkCanvas, v: View3q): void {
  const H = 4.6;
  boxShadow(c, v, 1.3, 1.3, 0, 0, H);
  box(c, v, { len: 1.2, wid: 1.2, h: 0.45, color: BLOCK, line: 1, onFace: (q, n) => n[1] > 0.9 && hazard(c, poly(subQuad(q, 0, 1, 0.7, 1).map((p) => proj(v, ...p)).flat()), 4, 0.8) });
  // the mast: four chords and its lattice on the south face
  const m = 0.32;
  const chord = (x: number, y: number) => box(c, v, { len: 0.06, wid: 0.06, h: H - 0.45, ox: x, oy: y, z: 0.45, color: YARD.hivis, line: 0.9 });
  chord(-m / 2, -m / 2);
  chord(m / 2, -m / 2);
  const lat = (y: number) => {
    for (let k = 0; k < 9; k++) {
      const z0 = 0.45 + ((H - 0.45) * k) / 9;
      const z1 = 0.45 + ((H - 0.45) * (k + 1)) / 9;
      const [ax, ay] = proj(v, k % 2 ? -m / 2 : m / 2, y, z0);
      const [bx, by] = proj(v, k % 2 ? m / 2 : -m / 2, y, z1);
      c.drawPath(segment(ax, ay, bx, by), stroke(INK, 2));
      c.drawPath(segment(ax, ay, bx, by), stroke(YARD.hivisDark, 1));
    }
  };
  lat(-m / 2);
  lat(m / 2);
  chord(-m / 2, m / 2);
  chord(m / 2, m / 2);
  // the jib east and the counter-jib west with its weight
  const [j0x, j0y] = proj(v, -1.0, 0, H);
  const [j1x, j1y] = proj(v, CRANE_HOOK[0] + 0.4, 0, H);
  c.drawPath(rect(j0x, j0y - 6, j1x - j0x, 6), fill(YARD.hivis));
  for (let x = j0x + 6; x < j1x; x += 8) c.drawPath(segment(x, j0y - 6, x + 4, j0y), stroke(YARD.hivisDark, 1));
  c.drawPath(rect(j0x, j0y - 6, j1x - j0x, 6), stroke(INK, 1.1));
  c.drawPath(rrect(j0x - 2, j0y - 2, 18, 12, 1.5), fill(BLOCK));
  c.drawPath(rrect(j0x - 2, j0y - 2, 18, 12, 1.5), stroke(INK, 1));
  const [apx, apy] = proj(v, 0, 0, H + 0.9);
  c.drawPath(segment(apx, j0y - 6, apx, apy), stroke(INK, 2.6));
  c.drawPath(segment(apx, j0y - 6, apx, apy), stroke(YARD.hivis, 1.4));
  c.drawPath(segment(apx, apy, j1x - 4, j1y - 6), stroke(INK, 1));
  c.drawPath(segment(apx, apy, j0x + 2, j0y - 6), stroke(INK, 1));
  // the cab on the mast
  const [cx, cy] = proj(v, 0.25, 0.25, H - 0.35);
  c.drawPath(rrect(cx - 2, cy - 12, 13, 14, 2), fill(YARD.cab));
  c.drawPath(rrect(cx, cy - 10, 9, 6, 1), fill(YARD.glassDark));
  c.drawPath(rrect(cx - 2, cy - 12, 13, 14, 2), stroke(INK, 1));
  // the trolley and the two chains down to the hook height
  const [tx, ty] = proj(v, CRANE_HOOK[0], 0, H);
  c.drawPath(rrect(tx - 8, ty - 1, 16, 5, 1), fill(YARD.machineDark));
  c.drawPath(rrect(tx - 8, ty - 1, 16, 5, 1), stroke(INK, 0.9));
  const [hx, hy] = proj(v, CRANE_HOOK[0], 0, CRANE_HOOK[2]);
  for (const d of [-26, 26]) {
    c.drawPath(segment(tx, ty + 4, hx + d, hy), stroke(INK, 1.1));
  }
}

/** A sign that hangs from the crane: an enamel board 2.4 m x 0.8 m on two chain eyes (blank; the caller's words). */
export function drawHungSign(c: SkCanvas, v: View3q): void {
  const w = 2.4 * v.ppm * 0.62;
  const h = 0.8 * v.ppm * v.lift * 0.9;
  c.drawPath(rrect(-w / 2 + 2, 2, w, h, 3), fill(INK, 0.22));
  c.drawPath(rrect(-w / 2, 0, w, h, 3), fill(YARD.machineDark));
  c.drawPath(rrect(-w / 2 + 3, 3, w - 6, h - 6, 2), fill(YARD.paper));
  c.drawPath(rrect(-w / 2 + 3, h - 8, w - 6, 5, 1), fill(YARD.hivis));
  c.drawPath(rrect(-w / 2, 0, w, h, 3), stroke(INK, LINE_W));
  for (const x of [-w / 2 + 8, w / 2 - 8]) {
    c.drawPath(circle(x, -1, 2.4), stroke(INK, 1.2));
  }
}

/** A sign on two posts (the back field's, the drop-off's, a partner's): a blank board at eye height. size: board width in metres. */
export function drawPostSign(c: SkCanvas, v: View3q, size = 1.6): void {
  const w = size;
  groundShadow(c, v, w * 0.5, 0.12, 0, 0, 1.9);
  for (const x of [-w / 2 + 0.12, w / 2 - 0.12]) box(c, v, { len: 0.08, wid: 0.08, h: 1.9, ox: x, color: YARD.galvanised, line: 0.9 });
  box(c, v, {
    len: w,
    wid: 0.05,
    h: 0.75,
    z: 1.15,
    oy: 0.06,
    color: YARD.paper,
    line: LINE_W,
    onFace: (q, n) => {
      if (n[1] < 0.9) return;
      faceFill(c, v, subQuad(q, 0, 1, 0, 0.16), YARD.machineDark);
      faceFill(c, v, subQuad(q, 0, 1, 0.84, 1), YARD.machineDark);
    },
  });
}

/** A single post with a small plate (place names, the extinguisher point): blank. */
export function drawPostPlate(c: SkCanvas, v: View3q): void {
  groundShadow(c, v, 0.1, 0.08, 0, 0, 1.6);
  box(c, v, { len: 0.07, wid: 0.07, h: 1.6, color: YARD.galvanised, line: 0.9 });
  box(c, v, { len: 0.8, wid: 0.04, h: 0.36, z: 1.3, oy: 0.05, color: YARD.paper, line: LINE_W, onFace: (q, n) => n[1] > 0.9 && faceFill(c, v, subQuad(q, 0.0, 0.14, 0, 1), YARD.hivis) });
}

/** The fire extinguisher point: a red extinguisher on a stand with a hi-vis backing plate and a pictogram. */
export function drawExtinguisher(c: SkCanvas, v: View3q): void {
  groundShadow(c, v, 0.18, 0.12, 0, 0, 1.4);
  box(c, v, { len: 0.06, wid: 0.06, h: 1.4, oy: -0.05, color: YARD.galvanised, line: 0.9 });
  box(c, v, {
    len: 0.42,
    wid: 0.03,
    h: 0.42,
    z: 0.98,
    oy: -0.02,
    color: YARD.paper,
    line: 1,
    onFace: (q, n) => {
      if (n[1] < 0.9) return;
      faceFill(c, v, subQuad(q, 0.08, 0.92, 0.08, 0.92), '#B8452C');
      // a white flame-and-extinguisher pictogram reduced to a bottle shape
      faceFill(c, v, subQuad(q, 0.38, 0.62, 0.2, 0.7), '#FFFFFF');
      faceFill(c, v, subQuad(q, 0.44, 0.56, 0.7, 0.8), '#FFFFFF');
    },
  });
  cylinder(c, v, { r: 0.1, h: 0.55, oy: 0.08, z: 0.05, color: '#B8452C', line: 1 });
  const [x, y] = proj(v, 0, 0.08, 0.6);
  c.drawPath(rrect(x - 3, y - 4, 6, 4, 1), fill(INK));
  c.drawPath(builder().moveTo(x + 2, y - 3).quadTo(x + 8, y - 2, x + 6, y + 8).build(), stroke(INK, 1.4));
}

/** One fence panel of galvanised palisade, 2.5 m along x (ew) or edge-on along y (ns), on concrete-footed posts. */
export function drawFence(c: SkCanvas, v: View3q, dir: 'ew' | 'ns' = 'ew'): void {
  const H = 2.0;
  const L = 2.5;
  if (dir === 'ew') {
    boxShadow(c, v, L, 0.1, 0, 0, H);
    for (const r of [0.45, 1.6]) box(c, v, { len: L, wid: 0.04, h: 0.06, z: r, oy: -0.05, color: YARD.galvanised, line: 0.8 });
    const n = 17;
    for (let i = 0; i < n; i++) {
      const x = -L / 2 + (L * (i + 0.5)) / n;
      const [bx, by] = proj(v, x, 0, 0.03);
      const [tx, ty] = proj(v, x, 0, H - 0.12);
      const p = poly([bx - 2.2, by, bx + 2.2, by, tx + 2.2, ty, tx + 2.2, ty - 2.5, tx, ty - 6, tx - 2.2, ty - 2.5, tx - 2.2, ty]);
      c.drawPath(p, fill(i % 4 === 1 ? YARD.galvanisedLight : YARD.galvanised));
      c.drawPath(p, stroke(INK, 0.8));
    }
    for (const x of [-L / 2, L / 2]) {
      box(c, v, { len: 0.2, wid: 0.2, h: 0.12, ox: x, color: BLOCK, line: 0.8 });
      box(c, v, { len: 0.08, wid: 0.08, h: H + 0.05, ox: x, color: YARD.steel, line: 0.9 });
    }
    return;
  }
  // edge-on: the pales stack into one strip; its posts and rails show as ticks
  boxShadow(c, v, 0.12, L, 0, 0, H);
  const [bx, by0] = proj(v, 0, -L / 2, 0);
  const [, by1] = proj(v, 0, L / 2, 0);
  const lift = (H - 0.12) * v.ppm * v.lift;
  const strip = poly([bx - 2.4, by0 - lift, bx + 2.4, by0 - lift, bx + 2.4, by1, bx - 2.4, by1]);
  c.drawPath(strip, fill(YARD.galvanised));
  for (let i = 0; i < 17; i++) {
    const y = by0 - lift + ((by1 - by0) * (i + 0.5)) / 17;
    c.drawPath(poly([bx - 2.4, y, bx, y - 5, bx + 2.4, y]), fill(YARD.galvanisedLight));
  }
  c.drawPath(strip, stroke(INK, 0.9));
  for (const y of [-L / 2, L / 2]) {
    box(c, v, { len: 0.2, wid: 0.2, h: 0.12, oy: y, color: BLOCK, line: 0.8 });
    box(c, v, { len: 0.08, wid: 0.08, h: H + 0.05, oy: y, color: YARD.steel, line: 0.9 });
  }
}

/**
 * One leaf of the yard's gate (3 m palisade on a frame with a diagonal brace and a hi-vis band), hung on
 * its post at the anchor's west end and running east; open: swung 90 degrees, seen edge-on north-south.
 */
export function drawGateLeaf(c: SkCanvas, v: View3q, open = false): void {
  const L = 3.0;
  const H = 2.0;
  box(c, v, { len: 0.16, wid: 0.16, h: H + 0.3, ox: 0, color: YARD.machineDark, line: 1 });
  if (open) {
    boxShadow(c, v, 0.1, L, 0.05, L / 2, H);
    box(c, v, {
      len: 0.06,
      wid: L,
      h: H - 0.1,
      ox: 0.08,
      oy: L / 2,
      z: 0.08,
      color: YARD.galvanised,
      line: 1,
      onTop: (q) => void q,
    });
    const [x, y0] = proj(v, 0.08, 0.1, H);
    const [, y1] = proj(v, 0.08, L, H);
    for (let i = 0; i < 12; i++) {
      const y = y0 + ((y1 - y0) * (i + 0.5)) / 12;
      c.drawPath(poly([x - 2.4, y, x, y - 5, x + 2.4, y]), fill(YARD.galvanisedLight));
    }
    const [hx, hy] = proj(v, 0.08, L * 0.5, H * 0.5);
    c.drawPath(rrect(hx - 3, hy - 4, 6, 8, 1), fill(YARD.hivis));
    c.drawPath(rrect(hx - 3, hy - 4, 6, 8, 1), stroke(INK, 0.8));
    return;
  }
  boxShadow(c, v, L, 0.1, L / 2, 0, H);
  box(c, v, {
    len: L,
    wid: 0.05,
    h: H - 0.1,
    ox: L / 2,
    z: 0.08,
    color: YARD.galvanised,
    line: 0,
    onFace: (q, n) => {
      if (n[1] < 0.9) return;
      const n2 = 18;
      for (let i = 0; i < n2; i++) {
        const s = (i + 0.5) / n2;
        const p = subQuad(q, s - 0.012, s + 0.012, 0, 0.98).map((pt) => proj(v, ...pt));
        const tip = proj(v, ...subQuad(q, s, s, 1.03, 1.03)[0]);
        const pale = poly([p[0][0], p[0][1], p[1][0], p[1][1], p[2][0], p[2][1], tip[0], tip[1], p[3][0], p[3][1]]);
        c.drawPath(pale, fill(i % 4 === 1 ? YARD.galvanisedLight : YARD.galvanised));
        c.drawPath(pale, stroke(INK, 0.7));
      }
      for (const t of [0.12, 0.8]) faceFill(c, v, subQuad(q, 0, 1, t, t + 0.05), YARD.steelDark, 0.8);
      faceFill(c, v, subQuad(q, 0, 1, 0.45, 0.53), YARD.hivis, 0.8);
      const a = proj(v, ...subQuad(q, 0.98, 0, 0.15, 0)[0]);
      const b = proj(v, ...subQuad(q, 0.02, 0, 0.8, 0)[0]);
      c.drawPath(segment(a[0], a[1], b[0], b[1]), stroke(INK, 2.6));
      c.drawPath(segment(a[0], a[1], b[0], b[1]), stroke(YARD.steel, 1.4));
    },
  });
}

/** A field gate (the back field's and the farm's): a five-bar galvanised tube gate, shut, with its padlock when locked. 3 m. */
export function drawFieldGate(c: SkCanvas, v: View3q, locked = true): void {
  const L = 3.0;
  const H = 1.25;
  boxShadow(c, v, L, 0.1, 0, 0, H);
  for (const x of [-L / 2, L / 2]) box(c, v, { len: 0.18, wid: 0.18, h: H + 0.25, ox: x, color: x < 0 ? YARD.wood : YARD.wood, line: 1 });
  const P = (x: number, z: number) => proj(v, x, 0, z);
  const tube = (a: [number, number], b: [number, number]) => {
    c.drawPath(segment(a[0], a[1], b[0], b[1]), stroke(INK, 3));
    c.drawPath(segment(a[0], a[1], b[0], b[1]), stroke(YARD.galvanisedLight, 1.6));
  };
  for (let i = 0; i < 5; i++) tube(P(-L / 2 + 0.1, 0.15 + i * 0.26), P(L / 2 - 0.1, 0.15 + i * 0.26));
  tube(P(-L / 2 + 0.1, 0.15), P(-L / 2 + 0.1, 1.2));
  tube(P(L / 2 - 0.1, 0.15), P(L / 2 - 0.1, 1.2));
  tube(P(-L / 2 + 0.1, 0.15), P(L / 2 - 0.2, 1.17));
  if (locked) {
    const [lx, ly] = P(L / 2 - 0.1, 0.7);
    c.drawPath(segment(lx - 4, ly - 3, lx + 4, ly + 3), stroke(INK, 1.8));
    c.drawPath(builder().addArc({ x: lx - 3, y: ly - 4, width: 6, height: 7 }, 180, 180).build(), stroke(INK, 1.5));
    c.drawPath(rrect(lx - 4, ly - 1, 8, 7, 1.2), fill(YARD.hivis));
    c.drawPath(rrect(lx - 4, ly - 1, 8, 7, 1.2), stroke(INK, 1));
  }
}

/** The rubble skip (the counterweights and broken concrete for the licensed waste carrier). frame 0 part, 1 full. */
export function drawRubbleSkip(c: SkCanvas, v: View3q, frame = 0): void {
  const len = 2.0;
  const wid = 1.4;
  const h = 0.9;
  boxShadow(c, v, len + 0.5, wid, 0, 0, h);
  const P = (x: number, y: number, z: number) => proj(v, x, y, z);
  // the skip's sloped ends: draw as a box with its top wider than its bottom
  const b0 = [P(-len / 2 + 0.25, wid / 2, 0), P(len / 2 - 0.25, wid / 2, 0)];
  const t0 = [P(-len / 2 - 0.15, wid / 2, h), P(len / 2 + 0.15, wid / 2, h)];
  const tb = [P(-len / 2 - 0.15, -wid / 2, h), P(len / 2 + 0.15, -wid / 2, h)];
  const front = poly([b0[0][0], b0[0][1], b0[1][0], b0[1][1], t0[1][0], t0[1][1], t0[0][0], t0[0][1]]);
  const top = poly([t0[0][0], t0[0][1], t0[1][0], t0[1][1], tb[1][0], tb[1][1], tb[0][0], tb[0][1]]);
  c.drawPath(top, fill(shade(YARD.skip, -0.5)));
  // the rubble inside
  const n = frame ? 16 : 8;
  for (let i = 0; i < n; i++) {
    const x = (hash01(i, 21) - 0.5) * (len - 0.2);
    const y = (hash01(i, 22) - 0.5) * (wid - 0.3);
    const [px, py] = P(x, y, h - (frame ? 0.02 : 0.25));
    const s = 4 + hash01(i, 23) * 4;
    const r = poly([px - s, py + 1, px - s * 0.4, py - s * 0.8, px + s * 0.7, py - s * 0.6, px + s, py + 1]);
    c.drawPath(r, fill(i % 3 ? BLOCK : shade(BLOCK, -0.18)));
    c.drawPath(r, stroke(INK, 0.7));
  }
  if (frame) {
    c.save();
    c.clipPath(builder().addRect({ x: t0[0][0] - 20, y: t0[0][1] - 40, width: t0[1][0] - t0[0][0] + 40, height: 41 }).build(), 1, true);
    c.restore();
  }
  c.drawPath(top, stroke(INK, 1));
  c.drawPath(front, fill(YARD.skip));
  for (const s of [0.25, 0.5, 0.75]) {
    const a = [b0[0][0] + (b0[1][0] - b0[0][0]) * s, b0[0][1]];
    const b = [t0[0][0] + (t0[1][0] - t0[0][0]) * s, t0[0][1]];
    c.drawPath(segment(a[0], a[1], b[0], b[1]), stroke(shade(YARD.skip, -0.3), 2.2));
  }
  freckles(c, b0[0][0] + 6, t0[0][1] + 4, 40, 14, 5, YARD.rustLight, 5);
  c.drawPath(front, stroke(INK, LINE_W));
  // the lifting lugs
  for (const s of [0, 1]) {
    const [lx, ly] = s ? t0[1] : t0[0];
    c.drawPath(circle(lx + (s ? -4 : 4), ly + 6, 2.4), stroke(INK, 1.4));
  }
}

/** A light stand of a yard floodlight (unlit by day): a tall galvanised pole with a two-lamp head. */
export function drawFloodlight(c: SkCanvas, v: View3q): void {
  groundShadow(c, v, 0.15, 0.12, 0, 0, 6);
  box(c, v, { len: 0.3, wid: 0.3, h: 0.2, color: BLOCK, line: 0.8 });
  box(c, v, { len: 0.1, wid: 0.1, h: 6, color: YARD.galvanised, line: 0.9 });
  const [x, y] = proj(v, 0, 0, 6);
  c.drawPath(segment(x - 10, y, x + 10, y), stroke(INK, 2.6));
  c.drawPath(segment(x - 10, y, x + 10, y), stroke(YARD.galvanised, 1.2));
  for (const d of [-9, 9]) {
    c.drawPath(rrect(x + d - 5, y - 1, 10, 6, 1.5), fill(YARD.machineDark));
    c.drawPath(rrect(x + d - 4, y + 1, 8, 3, 1), fill(YARD.galvanisedLight));
    c.drawPath(rrect(x + d - 5, y - 1, 10, 6, 1.5), stroke(INK, 0.9));
  }
}

/**
 * A shipping container lying north-south (the yard's dividing wall runs this way): its doors' end faces
 * the eye (locking bars, hinges), its long top recedes; ribbed; corner castings. len along y, metres.
 */
export function drawContainerNS(c: SkCanvas, v: View3q, color: string, len = 6.1, seed = 1): void {
  const wid = 2.44;
  const h = 2.6;
  boxShadow(c, v, wid, len, 0, 0, h);
  box(c, v, {
    len: wid,
    wid: len,
    h,
    color,
    onFace: (q, n) => {
      if (n[1] < 0.9) return;
      // the door end: two leaves, four locking bars, hinges, corner castings
      faceFill(c, v, subQuad(q, 0.497, 0.503, 0.04, 0.94), shade(color, -0.35));
      for (const s of [0.12, 0.38, 0.62, 0.88]) {
        const a = proj(v, ...subQuad(q, s, 0, 0.05, 0)[0]);
        const b = proj(v, ...subQuad(q, s, 0, 0.92, 0)[0]);
        c.drawPath(segment(a[0], a[1], b[0], b[1]), stroke(INK, 2.2));
        c.drawPath(segment(a[0], a[1], b[0], b[1]), stroke(shade(color, 0.35), 1));
        const m = proj(v, ...subQuad(q, s + 0.04, 0, 0.42, 0)[0]);
        c.drawPath(rrect(m[0] - 2, m[1] - 3, 4, 6, 1), fill(shade(color, -0.4)));
      }
      faceFill(c, v, subQuad(q, 0, 1, 0.94, 1), shade(color, -0.3));
      faceFill(c, v, subQuad(q, 0, 1, 0, 0.05), shade(color, -0.35));
      for (const [s0, t0] of [[0, 0], [0.92, 0], [0, 0.92], [0.92, 0.92]]) faceFill(c, v, subQuad(q, s0, s0 + 0.08, t0, t0 + 0.08), shade(color, -0.45), 0.8);
      const [x, y] = proj(v, ...subQuad(q, 0.3, 0, 0.3, 0)[0]);
      freckles(c, x, y - 20, 40, 24, seed, YARD.rust, 5);
    },
    onTop: (q) => {
      for (let i = 1; i < 14; i++) {
        const a = proj(v, ...subQuad(q, 0.04, 0, i / 14, 0)[0]);
        const b = proj(v, ...subQuad(q, 0.96, 0, i / 14, 0)[0]);
        c.drawPath(segment(a[0], a[1], b[0], b[1]), stroke(shade(color, -0.1), 1.2));
      }
    },
  });
}

/** The platform indicator printing: a tongue of paper out of the slot and the green lamp (an overlay at the printer slot). */
export function drawPrintFlash(c: SkCanvas): void {
  c.drawPath(rrect(-11, 0, 22, 8, 1), fill(YARD.paper));
  c.drawPath(rrect(-11, 0, 22, 8, 1), stroke(YARD.paperLine, 0.8));
  for (let i = 0; i < 3; i++) c.drawPath(segment(-8, 2.5 + i * 2, 4 - i * 3, 2.5 + i * 2), stroke(YARD.inkSoft, 0.6));
  c.drawCircle(11, -1, 2, fill(YARD.led));
}

/** The portacabin's door standing open (an overlay at the cabin's anchor): the dark doorway and the leaf swung out. */
export function drawCabinDoorOpen(c: SkCanvas, v: View3q): void {
  const { len, wid, h } = CABIN;
  const s0 = 0.5;
  const s1 = 0.64;
  const x0 = len / 2 - s1 * len;
  const x1 = len / 2 - s0 * len;
  const y = wid / 2 + 0.01;
  const z0 = 0.22 + h * 0.04;
  const z1 = 0.22 + h * 0.82;
  faceFill(c, v, [[x1, y, z0], [x0, y, z0], [x0, y, z1], [x1, y, z1]], '#3A3F45', LINE_W);
  faceFill(c, v, [[x1, y, z0], [x1 + 0.12, y + 0.55, z0], [x1 + 0.12, y + 0.55, z1], [x1, y, z1]], YARD.machine, LINE_W);
}

// ---------------------------------------------------------------------------
// The first yard's extras (yard-stage1.md 6.1): sample pallet, portal, ID desk, notice board, PVC bin,
// rung sign, the machine's crate (the machine flatbed's load and its set-down). No words: slots.
// ---------------------------------------------------------------------------

/** A wooden pallet (1.2 x 0.8 m, 0.14 m) at (ox, oy): three runners and a slatted deck. */
export function drawPallet(c: SkCanvas, v: View3q, ox = 0, oy = 0): void {
  for (const y of [-0.32, 0, 0.32]) box(c, v, { len: 1.2, wid: 0.1, h: 0.1, ox, oy: oy + y, color: shade(YARD.wood, -0.15), line: 0.8 });
  box(c, v, {
    len: 1.2,
    wid: 0.8,
    h: 0.04,
    ox,
    oy,
    z: 0.1,
    color: YARD.wood,
    line: 0.9,
    onTop: (q) => {
      for (const t of [0.2, 0.4, 0.6, 0.8]) faceFill(c, v, subQuad(q, 0.01, 0.99, t - 0.012, t + 0.012), shade(YARD.wood, -0.3));
    },
  });
}

/**
 * The sample pallet by a locked machine's pad (what the machine would make): frame 0 brass ingots
 * strapped flat (the crucible), 1 bare bright bundles (the power stripper), 2 clean windings and end caps
 * (the motor bench).
 */
export function drawSamplePallet(c: SkCanvas, v: View3q, frame = 0): void {
  boxShadow(c, v, 1.2, 0.8, 0, 0, 0.4);
  drawPallet(c, v);
  if (frame === 0) {
    for (let k = 0; k < 2; k++) for (let r = 0; r < 3; r++) for (let i = 0; i < 2; i++) drawIngot(c, v, 'brass', 99, { ox: (i - 0.5) * 0.5, oy: (r - 1) * 0.22, z: 0.14 + k * 0.1, shadow: false });
    for (const sx of [-0.25, 0.25]) {
      const a = proj(v, sx, -0.34, 0.34);
      const b = proj(v, sx, 0.34, 0.34);
      const d = proj(v, sx, 0.34, 0.14);
      const p = builder().moveTo(a[0], a[1]).lineTo(b[0], b[1]).lineTo(d[0], d[1]).build();
      c.drawPath(p, stroke(INK, 2.4));
      c.drawPath(p, stroke(YARD.galvanisedLight, 1.1));
    }
    return;
  }
  const metals = frame === 1 ? ['copper', 'copper', 'copper', 'copper', 'copper'] : ['copper', 'aluminium', 'copper', 'aluminium', 'copper'];
  metals.forEach((m, i) => {
    const [x, y] = proj(v, -0.36 + (i % 3) * 0.36, -0.15 + Math.floor(i / 3) * 0.3, 0.2 + (i > 2 ? 0.06 : 0));
    pieceGlyph(c, m, x, y, 16, (hash01(i, frame) - 0.5) * 30, i + frame * 5);
  });
}

/**
 * The radiation detection portal at the weighbridge (a yard checks every load for sealed sources): two
 * grey detector pillars 3.4 m apart with a lamp on each; frame 0 idle (lamps dark), 1 checking (green).
 * Anchor between the pillars.
 */
export function drawPortal(c: SkCanvas, v: View3q, frame = 0): void {
  for (const y of [-1.7, 1.7]) {
    groundShadow(c, v, 0.3, 0.2, 0, y, 2.4);
    box(c, v, { len: 0.4, wid: 0.3, h: 0.1, oy: y, color: BLOCK, line: 0.8 });
    box(c, v, {
      len: 0.3,
      wid: 0.22,
      h: 2.2,
      oy: y,
      z: 0.1,
      color: '#C9CDD0',
      bevel: true,
      line: 1,
      onFace: (q, n) => {
        if (n[1] > 0.9) {
          faceFill(c, v, subQuad(q, 0.15, 0.85, 0.3, 0.8), shade('#C9CDD0', -0.12), 0.7);
          faceFill(c, v, subQuad(q, 0, 1, 0.08, 0.14), YARD.hivis, 0.6);
        }
      },
    });
    const [lx, ly] = proj(v, 0, y, 2.42);
    c.drawPath(oval(lx, ly, 3.4, 2.8), fill(frame ? YARD.led : shade(YARD.led, -0.6)));
    c.drawPath(oval(lx, ly, 3.4, 2.8), stroke(INK, 0.9));
  }
}

/**
 * The ID desk inside the scale house's hatch: a counter shelf under a sliding window, an ID card reader
 * and a tray of slips (blank). Drawn round the hatch's foot; the world places it at the scale house's
 * front (slots: screen, the reader's little display).
 */
export function drawIdDesk(c: SkCanvas, v: View3q): void {
  boxShadow(c, v, 1.2, 0.5, 0, 0, 1.0);
  box(c, v, { len: 1.2, wid: 0.5, h: 0.95, color: YARD.machine, line: 1, bevel: true });
  box(c, v, { len: 1.3, wid: 0.6, h: 0.05, z: 0.95, color: YARD.galvanisedLight, line: 1 });
  // the reader and the slip tray on the shelf
  box(c, v, { len: 0.2, wid: 0.16, h: 0.07, ox: 0.3, oy: 0.05, z: 1.0, color: YARD.machineDark, line: 0.8 });
  const [rx, ry] = proj(v, 0.3, 0.13, 1.06);
  c.drawPath(rrect(rx - 3, ry - 2, 6, 2.5, 0.6), fill(YARD.led));
  box(c, v, { len: 0.3, wid: 0.22, h: 0.04, ox: -0.25, z: 1.0, color: YARD.paperShade, line: 0.8 });
  const [tx, ty] = proj(v, -0.25, 0, 1.05);
  c.drawPath(rrect(tx - 4, ty - 3, 8, 5, 0.6), fill(YARD.paper));
  // the window frame over it
  for (const x of [-0.6, 0.6]) box(c, v, { len: 0.06, wid: 0.06, h: 0.8, ox: x, oy: -0.2, z: 1.0, color: YARD.steelDark, line: 0.8 });
  box(c, v, { len: 1.26, wid: 0.08, h: 0.06, oy: -0.2, z: 1.8, color: YARD.steelDark, line: 0.8 });
  faceFill(c, v, [[-0.57, -0.2, 1.05], [0.0, -0.2, 1.05], [0.0, -0.2, 1.78], [-0.57, -0.2, 1.78]], YARD.glass, 0.8, 0.55);
}

/** The notice board by the office: a blank board on two posts under a little roof (slots: words). */
export function drawNoticeBoard(c: SkCanvas, v: View3q): void {
  groundShadow(c, v, 0.6, 0.15, 0, 0, 1.8);
  for (const x of [-0.6, 0.6]) box(c, v, { len: 0.08, wid: 0.08, h: 1.9, ox: x, color: YARD.wood, line: 0.9 });
  box(c, v, { len: 1.3, wid: 0.06, h: 0.85, z: 0.85, color: shade(YARD.wood, -0.1), line: 1, onFace: (q, n) => n[1] > 0.9 && blankFace(c, v, subQuad(q, 0.05, 0.95, 0.07, 0.93), '#C8B48C', false) });
  // three blank sheets pinned up
  for (const [s0, t0, w, h] of [[0.08, 0.2, 0.26, 0.6], [0.38, 0.14, 0.24, 0.42], [0.66, 0.24, 0.26, 0.56]] as const) {
    const q: V3[] = [[-0.65 + 1.3 * s0, 0.035, 0.85 + 0.85 * (1 - t0 - h)], [-0.65 + 1.3 * (s0 + w), 0.035, 0.85 + 0.85 * (1 - t0 - h)], [-0.65 + 1.3 * (s0 + w), 0.035, 0.85 + 0.85 * (1 - t0)], [-0.65 + 1.3 * s0, 0.035, 0.85 + 0.85 * (1 - t0)]];
    faceFill(c, v, q, YARD.paper, 0.7);
    const [px, py] = proj(v, ...subQuad(q, 0.5, 0.5, 0.9, 0.9)[0]);
    c.drawCircle(px, py, 1.2, fill(YARD.skip));
  }
  box(c, v, { len: 1.45, wid: 0.3, h: 0.06, oy: -0.05, z: 1.9, color: YARD.galvanised, line: 1 });
}

/** The notice board's face in points round its anchor (where the world writes). */
export function noticeSlot(v: View3q): [number, number, number, number] {
  const [ax, ay] = proj(v, -0.6, 0.035, 1.65);
  const [bx, by] = proj(v, 0.6, 0.035, 0.9);
  return [ax, ay, bx - ax, by - ay];
}

/**
 * The PVC bin by the strippers: a white bulk bag on a pallet that the stripped insulation goes into,
 * its four lifting loops up; frame 0 empty (slack), 1 part, 2 full (grey and black chips heaped).
 */
export function drawPvcBin(c: SkCanvas, v: View3q, frame = 0): void {
  boxShadow(c, v, 1.0, 1.0, 0, 0, 1.0);
  box(c, v, { len: 1.0, wid: 1.0, h: 0.12, color: YARD.wood, line: 0.9 });
  const h = frame === 0 ? 0.55 : 0.9;
  box(c, v, {
    len: 0.92,
    wid: 0.92,
    h,
    z: 0.12,
    color: '#ECEDE8',
    line: 1,
    top: shade('#ECEDE8', -0.5),
    onFace: (q, n) => {
      if (n[1] > 0.9) for (const s of [0.25, 0.75]) faceFill(c, v, subQuad(q, s - 0.02, s + 0.02, 0, 1), '#C9CBC4');
    },
    onTop: (q) => {
      if (frame === 0) return;
      const n = frame === 1 ? 6 : 14;
      for (let i = 0; i < n; i++) {
        const [px, py] = proj(v, ...subQuad(q, 0.15 + 0.7 * hash01(i, 71), 0, 0.15 + 0.7 * hash01(i, 72), 0)[0]);
        c.drawPath(rrect(px - 2.4, py - (frame === 2 ? 3 : 0) - 1, 4.8, 2.2, 1), fill(i % 3 ? YARD.pvcGrey : YARD.pvc));
      }
    },
  });
  for (const [x, y] of [[-0.44, -0.44], [0.44, -0.44], [-0.44, 0.44], [0.44, 0.44]] as const) {
    const [lx, ly] = proj(v, x, y, 0.12 + h);
    c.drawPath(builder().moveTo(lx - 3, ly).quadTo(lx, ly - 8, lx + 3, ly).build(), stroke(INK, 2.4));
    c.drawPath(builder().moveTo(lx - 3, ly).quadTo(lx, ly - 8, lx + 3, ly).build(), stroke('#ECEDE8', 1.2));
  }
}

/** A rung sign: a small blank enamel plate with a ladder glyph on a post (slots: words). */
export function drawRungSign(c: SkCanvas, v: View3q): void {
  groundShadow(c, v, 0.12, 0.1, 0, 0, 1.4);
  box(c, v, { len: 0.06, wid: 0.06, h: 1.45, color: YARD.galvanised, line: 0.9 });
  box(c, v, { len: 0.7, wid: 0.04, h: 0.4, z: 1.1, oy: 0.04, color: YARD.paper, line: 1, onFace: (q, n) => n[1] > 0.9 && faceFill(c, v, subQuad(q, 0.04, 0.22, 0.12, 0.88), YARD.hivis, 0.7) });
  const [gx, gy] = proj(v, -0.26, 0.07, 1.3);
  c.drawPath(segment(gx - 2, gy - 4, gx - 2, gy + 4), stroke(INK, 0.9));
  c.drawPath(segment(gx + 2, gy - 4, gx + 2, gy + 4), stroke(INK, 0.9));
  for (const d of [-2, 0.5, 3]) c.drawPath(segment(gx - 2, gy + d, gx + 2, gy + d), stroke(INK, 0.7));
}

/** The rung sign's words box in points round its anchor. */
export function rungSlot(v: View3q): [number, number, number, number] {
  const [ax, ay] = proj(v, -0.18, 0.06, 1.48);
  const [bx, by] = proj(v, 0.33, 0.06, 1.12);
  return [ax, ay, bx - ax, by - ay];
}

/**
 * A bought machine in its shipping crate (the machine flatbed's load): an open slatted crate on skids,
 * the machine's blue enamel showing through, four lifting straps to a ring. frame 0 on the deck (straps
 * slack), 1 slung (straps taut to the ring above: the world hangs it under the crane's hook), 2 set down on
 * its pad (the straps off, a shadow). Footprint 1.4 x 1.0 m.
 */
export function drawMachineCrate(c: SkCanvas, v: View3q, frame = 0): void {
  if (frame === 2) boxShadow(c, v, 1.4, 1.0, 0, 0, 1.0);
  const L = 1.4;
  const W = 1.0;
  const H = 0.95;
  for (const y of [-0.38, 0.38]) box(c, v, { len: L + 0.06, wid: 0.12, h: 0.1, oy: y, color: shade(YARD.wood, -0.15), line: 0.8 });
  // the machine inside (a box of machine enamel with a hi-vis guard), then the slats over it
  box(c, v, { len: L - 0.2, wid: W - 0.2, h: H - 0.15, z: 0.1, color: YARD.machine, line: 1, bevel: true, onFace: (q, n) => n[1] > 0.9 && faceFill(c, v, subQuad(q, 0.6, 0.85, 0.5, 0.8), YARD.hivis, 0.7) });
  const slat = (pts: V3[]) => faceFill(c, v, pts, YARD.wood, 0.8);
  for (const z of [0.18, 0.5, 0.82]) slat([[-L / 2, W / 2, z], [L / 2, W / 2, z], [L / 2, W / 2, z + 0.1], [-L / 2, W / 2, z + 0.1]]);
  for (const x of [-L / 2, L / 2 - 0.1]) slat([[x, W / 2, 0.1], [x + 0.1, W / 2, 0.1], [x + 0.1, W / 2, H + 0.05], [x, W / 2, H + 0.05]]);
  for (const y of [-W / 2 + 0.05, W / 2 - 0.05]) slat([[-L / 2, y - 0.05, H], [L / 2, y - 0.05, H], [L / 2, y + 0.05, H], [-L / 2, y + 0.05, H]]);
  if (frame === 2) return;
  const ring: V3 = frame === 1 ? [0, 0, H + 1.1] : [0, 0, H + 0.12];
  const [rx, ry] = proj(v, ...ring);
  for (const [x, y] of [[-L / 2, -W / 2], [L / 2, -W / 2], [-L / 2, W / 2], [L / 2, W / 2]] as const) {
    const [sx, sy] = proj(v, x, y, H);
    const p = frame === 1 ? segment(sx, sy, rx, ry) : builder().moveTo(sx, sy).quadTo((sx + rx) / 2, sy + 4, rx, ry).build();
    c.drawPath(p, stroke(INK, 2.2));
    c.drawPath(p, stroke(YARD.hivis, 1.1));
  }
  c.drawPath(oval(rx, ry, 3, 2.2), stroke(INK, 2));
  c.drawPath(oval(rx, ry, 3, 2.2), stroke(YARD.galvanisedLight, 1));
}
