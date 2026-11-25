/**
 * The lane east of the gate (yard-stage1.md 3, 6.1 "Yard and lane"): hedge, the farm partner's open shed,
 * the demolition partner's hoarding and its gate, the weight-limited bridge (parapets, the limit sign
 * on its post: a blank roundel the caller writes in, a locked barrier), the plain barrier at the lane's
 * end. Ground tiles of the lane are in ground.draw.ts. Anchored at footprint centres; no words.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { LINE_W, YARD, shade } from './palette';
import { box, boxShadow, builder, faceFill, fill, freckles, groundShadow, hash01, hazard, oval, poly, proj, rrect, segment, stroke, subQuad, type V3, type View3q } from './pen';
import { padlock } from './ui.draw';

const INK = YARD.ink;
const HEDGE = '#5E7D45';

/** A 3 m run of field hedge (east-west): a lumpy green mass, lighter on its west top, a few twigs. */
export function drawHedge(c: SkCanvas, v: View3q, seed = 1): void {
  const L = 3.0;
  const H = 1.4;
  boxShadow(c, v, L, 0.9, 0, 0, H);
  const [x0, y0] = proj(v, -L / 2, 0.4, 0);
  const [x1] = proj(v, L / 2, 0.4, 0);
  const top = H * v.ppm * v.lift;
  const back = 0.8 * v.ppm * v.tilt;
  const b = builder().moveTo(x0, y0);
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    b.quadTo(x - 4, y0 - top - back - 6 - hash01(seed, i) * 7, x + (x1 - x0) / n / 2, y0 - top - back + hash01(seed, i, 2) * 4);
  }
  b.lineTo(x1, y0).close();
  const mass = b.build();
  c.drawPath(mass, fill(HEDGE));
  c.save();
  c.clipPath(mass, 1, true);
  for (let i = 0; i < 26; i++) {
    const x = x0 + hash01(seed, i, 3) * (x1 - x0);
    const y = y0 - top - back + hash01(seed, i, 4) * (top + back) * 0.8;
    c.drawPath(oval(x, y, 6 + hash01(seed, i, 5) * 5, 4 + hash01(seed, i, 6) * 3), fill(i % 3 ? YARD.grass : YARD.grassLight, 0.85));
  }
  c.drawRect({ x: x0, y: y0 - top * 0.35, width: x1 - x0, height: top }, fill(shade(HEDGE, -0.25), 0.55));
  c.restore();
  c.drawPath(mass, stroke(INK, LINE_W));
}

/**
 * The farm partner's open-fronted shed (4.5 x 3 m, drawn at two thirds of true height): timber posts, a
 * corrugated pent roof, a hay-coloured back wall, a workbench and old drums in its shade.
 */
export function drawFarmShed(c: SkCanvas, v: View3q): void {
  const L = 4.5;
  const D = 3.0;
  const H = 2.6;
  boxShadow(c, v, L, D, 0, 0, H);
  // floor and the back wall
  box(c, v, { len: L, wid: D, h: 0.08, color: '#B9AE96', line: 1 });
  box(c, v, { len: L, wid: 0.12, h: H, oy: -D / 2 + 0.06, color: '#8C6A45', line: 1, onFace: (q, n) => {
    if (n[1] < 0.9) return;
    for (let i = 1; i < 14; i++) faceFill(c, v, subQuad(q, i / 14 - 0.004, i / 14 + 0.004, 0, 1), shade('#8C6A45', -0.2));
  } });
  // the shade inside, drums and a bench
  const [sx, sy] = proj(v, 0, -0.4, 0.08);
  c.drawPath(rrect(sx - L * 0.45 * v.ppm, sy - 14, L * 0.9 * v.ppm, 22, 4), fill(YARD.shadow, 0.28));
  for (const [x, col] of [[-1.4, YARD.machine], [-0.95, YARD.skip]] as [number, string][]) {
    const [dx, dy] = proj(v, x, -0.6, 0);
    c.drawPath(rrect(dx - 7, dy - 22, 14, 22, 3), fill(col));
    c.drawPath(rrect(dx - 7, dy - 22, 14, 22, 3), stroke(INK, 1));
    c.drawPath(segment(dx - 7, dy - 14, dx + 7, dy - 14), stroke(shade(col, -0.3), 1.2));
  }
  box(c, v, { len: 1.4, wid: 0.5, h: 0.8, ox: 1.0, oy: -0.8, color: YARD.wood, line: 1 });
  // posts and the roof
  for (const x of [-L / 2 + 0.1, 0, L / 2 - 0.1]) box(c, v, { len: 0.14, wid: 0.14, h: H, ox: x, oy: D / 2 - 0.1, color: YARD.wood, line: 1 });
  box(c, v, {
    len: L + 0.3,
    wid: D + 0.3,
    h: 0.1,
    z: H,
    color: '#8E9AA0',
    line: 1,
    onTop: (q) => {
      for (let i = 1; i < 18; i++) {
        const a = proj(v, ...subQuad(q, i / 18, 0, 0.02, 0)[0]);
        const b2 = proj(v, ...subQuad(q, i / 18, 0, 0.98, 0)[0]);
        c.drawPath(segment(a[0], a[1], b2[0], b2[1]), stroke(shade('#8E9AA0', -0.15), 1.1));
      }
      const [rx, ry] = proj(v, ...subQuad(q, 0.3, 0, 0.4, 0)[0]);
      freckles(c, rx, ry, 50, 20, 3, YARD.rust, 6);
    },
  });
}

/** A 3 m run of the demolition partner's site hoarding: plywood panels painted dark green, a hi-vis band, on feet. */
export function drawHoarding(c: SkCanvas, v: View3q): void {
  const L = 3.0;
  const H = 2.2;
  boxShadow(c, v, L, 0.12, 0, 0, H);
  box(c, v, {
    len: L,
    wid: 0.05,
    h: H,
    color: '#3F5A4B',
    line: LINE_W,
    onFace: (q, n) => {
      if (n[1] < 0.9) return;
      for (const s of [0.333, 0.667]) faceFill(c, v, subQuad(q, s - 0.004, s + 0.004, 0, 1), shade('#3F5A4B', -0.3));
      faceFill(c, v, subQuad(q, 0, 1, 0.84, 0.9), YARD.hivis);
      const [x, y] = proj(v, ...subQuad(q, 0.6, 0, 0.3, 0)[0]);
      freckles(c, x, y, 30, 14, 7, shade('#3F5A4B', 0.25), 5);
    },
  });
  for (const x of [-L / 2 + 0.3, L / 2 - 0.3]) box(c, v, { len: 0.5, wid: 0.3, h: 0.14, ox: x, oy: 0.18, color: '#BDB8AC', line: 0.8 });
}

/** The demolition site's gate in the hoarding: two solid leaves, shut (frame 0, a padlocked chain) or open (frame 1). 4 m. */
export function drawHoardingGate(c: SkCanvas, v: View3q, open = false): void {
  const L = 4.0;
  const H = 2.2;
  for (const x of [-L / 2, L / 2]) box(c, v, { len: 0.14, wid: 0.14, h: H + 0.2, ox: x, color: YARD.machineDark, line: 1 });
  if (open) {
    for (const x of [-L / 2 + 0.1, L / 2 - 0.1]) {
      boxShadow(c, v, 0.1, L / 2, x, L / 4, H);
      box(c, v, { len: 0.05, wid: L / 2, h: H, ox: x, oy: L / 4, color: '#3F5A4B', line: 1 });
    }
    return;
  }
  boxShadow(c, v, L, 0.12, 0, 0, H);
  box(c, v, {
    len: L - 0.2,
    wid: 0.05,
    h: H,
    color: '#3F5A4B',
    line: LINE_W,
    onFace: (q, n) => {
      if (n[1] < 0.9) return;
      faceFill(c, v, subQuad(q, 0.497, 0.503, 0, 1), INK);
      faceFill(c, v, subQuad(q, 0, 1, 0.84, 0.9), YARD.hivis);
      for (const s of [0.1, 0.9]) {
        const p = subQuad(q, s - 0.06, s + 0.06, 0.08, 0.3).map((pt) => proj(v, ...pt));
        hazard(c, poly(p.flat()), 3, 0.7);
      }
      // the chain across the join and its padlock
      const a = proj(v, ...subQuad(q, 0.44, 0, 0.5, 0)[0]);
      const b = proj(v, ...subQuad(q, 0.56, 0, 0.5, 0)[0]);
      c.drawPath(builder().moveTo(a[0], a[1]).quadTo((a[0] + b[0]) / 2, a[1] + 6, b[0], b[1]).build(), stroke(YARD.galvanisedLight, 1.6));
      padlock(c, (a[0] + b[0]) / 2, a[1] + 9, 12, YARD.hivis);
    },
  });
}

/** One 3 m section of the bridge's parapet (east-west): a concrete kerb and plinth with a steel rail on posts. */
export function drawParapet(c: SkCanvas, v: View3q): void {
  const L = 3.0;
  boxShadow(c, v, L, 0.4, 0, 0, 1.1);
  box(c, v, { len: L, wid: 0.4, h: 0.45, color: '#C4BFB2', line: 1, onFace: (q, n) => n[1] > 0.9 && faceFill(c, v, subQuad(q, 0, 1, 0, 0.18), shade('#C4BFB2', -0.15)) });
  for (let i = 0; i <= 3; i++) box(c, v, { len: 0.07, wid: 0.07, h: 0.65, ox: -L / 2 + 0.1 + (i * (L - 0.2)) / 3, z: 0.45, color: YARD.galvanised, line: 0.8 });
  box(c, v, { len: L, wid: 0.1, h: 0.08, z: 1.05, color: YARD.galvanisedLight, line: 0.9, bevel: true });
  box(c, v, { len: L, wid: 0.06, h: 0.05, z: 0.75, color: YARD.galvanised, line: 0.7 });
}

/** The weight-limit sign on its post: a blank white roundel with a red ring (the caller writes the limit), anchored at the foot. */
export function drawLimitSign(c: SkCanvas, v: View3q): void {
  groundShadow(c, v, 0.1, 0.08, 0, 0, 2.2);
  box(c, v, { len: 0.07, wid: 0.07, h: 2.2, color: YARD.galvanised, line: 0.9 });
  const [x, y] = proj(v, 0, 0.05, 2.0);
  c.drawPath(oval(x + 1.5, y + 1.5, 13, 13), fill(INK, 0.22));
  c.drawPath(oval(x, y, 13, 13), fill('#C8352B'));
  c.drawPath(oval(x, y, 9.5, 9.5), fill('#FFFFFF'));
  c.drawPath(oval(x, y, 13, 13), stroke(INK, 1.1));
}

/** Where the limit sign's roundel is (points round its anchor): the caller writes the limit in it. */
export const limitSlot = (v: View3q): [number, number, number, number] => {
  const [x, y] = proj(v, 0, 0.05, 2.0);
  return [x - 9, y - 9, 18, 18];
};

/** A swing barrier across the road (red-and-white pole on a post with a counterweight), padlocked shut when `locked`. 4 m. */
export function drawBarrier(c: SkCanvas, v: View3q, locked = true): void {
  const L = 4.0;
  boxShadow(c, v, L, 0.2, 0, 0, 1.0);
  box(c, v, { len: 0.2, wid: 0.2, h: 1.0, ox: -L / 2, color: YARD.machineDark, line: 1 });
  box(c, v, { len: 0.1, wid: 0.1, h: 0.85, ox: L / 2, color: YARD.machineDark, line: 0.9 });
  const [ax, ay] = proj(v, -L / 2, 0, 0.95);
  const [bx, by] = proj(v, L / 2, 0, 0.85);
  c.drawPath(segment(ax, ay, bx, by), stroke(INK, 6));
  const n = 8;
  for (let i = 0; i < n; i++) {
    const k0 = i / n;
    const k1 = (i + 1) / n;
    c.drawPath(segment(ax + (bx - ax) * k0, ay + (by - ay) * k0, ax + (bx - ax) * k1, ay + (by - ay) * k1), stroke(i % 2 ? '#FFFFFF' : '#C8352B', 4));
  }
  c.drawPath(rrect(ax - 12, ay - 4, 10, 8, 1.5), fill(YARD.castIron));
  c.drawPath(rrect(ax - 12, ay - 4, 10, 8, 1.5), stroke(INK, 0.9));
  if (locked) padlock(c, bx - 2, by + 9, 11, YARD.hivis);
}

/** One leaf of the demolition gate standing open (2 m, seen edge-on running south from its post). */
export function drawHoardingLeafOpen(c: SkCanvas, v: View3q): void {
  const L = 2.0;
  const H = 2.2;
  boxShadow(c, v, 0.1, L, 0, L / 2, H);
  box(c, v, { len: 0.05, wid: L, h: H, oy: L / 2, color: '#3F5A4B', line: 1 });
}

/**
 * The demolition contractor's excavator behind its hoarding (seen over it from the lane): tracks, the
 * upper house in hi-vis with its cab, a long boom and a demolition grab. frame 0 parked (boom folded,
 * grab on the ground), 1 working (boom up, grab raised). Footprint 3.2 x 2.4 m; anchor its centre.
 */
export function drawExcavator(c: SkCanvas, v: View3q, frame = 0): void {
  groundShadow(c, v, 1.7, 1.2, 0, 0, frame ? 3.4 : 2.4);
  // the tracks
  for (const y of [-0.9, 0.9])
    box(c, v, { len: 3.2, wid: 0.6, h: 0.7, oy: y, color: '#3A3E44', line: 1, onFace: (q, n) => { if (n[1] > 0.9) for (let i = 1; i < 10; i++) faceFill(c, v, subQuad(q, i / 10 - 0.01, i / 10 + 0.01, 0.1, 0.9), '#2A2D31'); } });
  // the house, the counterweight and the cab
  box(c, v, { len: 2.4, wid: 2.0, h: 1.0, ox: -0.3, z: 0.8, color: YARD.hivis, line: 1, bevel: true, onFace: (q, n) => n[1] > 0.9 && faceFill(c, v, subQuad(q, 0.05, 0.4, 0.2, 0.5), YARD.machineDark, 0.6) });
  box(c, v, { len: 0.5, wid: 1.9, h: 0.7, ox: -1.45, z: 0.8, color: YARD.machineDark, line: 1 });
  box(c, v, { len: 0.9, wid: 0.8, h: 1.1, ox: 0.55, oy: 0.55, z: 1.8, color: YARD.hivis, line: 1, onFace: (q) => faceFill(c, v, subQuad(q, 0.12, 0.88, 0.35, 0.9), YARD.glassDark, 0.8) });
  // the boom and stick: thick hi-vis members, then the grab
  const base: V3 = [0.6, -0.3, 1.6];
  const knee: V3 = frame ? [2.2, -0.3, 4.2] : [2.0, -0.3, 2.6];
  const tip: V3 = frame ? [3.4, -0.3, 2.6] : [2.9, -0.3, 0.5];
  const arm = (a: V3, b: V3, w: number) => {
    const [ax, ay] = proj(v, ...a);
    const [bx, by] = proj(v, ...b);
    c.drawPath(segment(ax, ay, bx, by), stroke(INK, w + 2));
    c.drawPath(segment(ax, ay, bx, by), stroke(YARD.hivisDark, w));
  };
  arm(base, knee, 7);
  arm(knee, tip, 5);
  const [gx, gy] = proj(v, ...tip);
  for (const sgn of [-1, 1]) {
    const jaw = poly([gx, gy, gx + sgn * 9, gy + 6, gx + sgn * 6, gy + 15, gx + sgn * 2, gy + 9]);
    c.drawPath(jaw, fill(YARD.steelDark));
    c.drawPath(jaw, stroke(INK, 1));
  }
}
