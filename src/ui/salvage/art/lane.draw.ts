/**
 * The lane east of the gate (yard-stage1.md 3, 6.1 "Yard and lane"): hedge, the farm partner's open shed,
 * the demolition partner's hoarding and its gate, the weight-limited bridge (parapets, the limit sign
 * on its post: a blank roundel the caller writes in, a locked barrier), the plain barrier at the lane's
 * end. Ground tiles of the lane are in ground.draw.ts. Anchored at footprint centres; no words.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { LINE_W, YARD, mix, shade } from './palette';
import { box, boxShadow, builder, faceFill, fill, freckles, groundShadow, hash01, hazard, linear, oval, poly, proj, rect, rrect, segment, stroke, subQuad, type V3, type View3q } from './pen';
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

// =====================================================================================================
// The country beyond the lane's hedges (fix pass, findings L7 and P10: never a void, motion that reads)
// =====================================================================================================

/** A field tile's size in metres (east-west, north-south): rows run east-west, so tiles join along the lane. */
export const FIELD_M = { w: 6, d: 4 } as const;
export type FieldKind = 'stubble' | 'plough' | 'pasture';
export const FIELD_KINDS: readonly FieldKind[] = ['stubble', 'plough', 'pasture'];

/**
 * A flat field tile (FIELD_M) round its centre: stubble (straw with drill rows), ploughed (brown furrows)
 * or pasture (green with darker tufts). Rows run east-west and the edges carry no border, so tiles of a
 * kind join into one field along the lane. A decal: the world draws it under everything.
 */
export function drawField(c: SkCanvas, v: View3q, kind: FieldKind, seed = 1): void {
  const W = FIELD_M.w / 2;
  const D = FIELD_M.d / 2;
  const [x0, y0] = proj(v, -W, -D, 0);
  const [x1, y1] = proj(v, W, D, 0);
  const base = kind === 'stubble' ? '#C9B27A' : kind === 'plough' ? '#8A6A4A' : '#86A35C';
  c.drawPath(rect(x0, y0, x1 - x0, y1 - y0), fill(base));
  const rows = 10;
  for (let i = 0; i < rows; i++) {
    const y = y0 + ((i + 0.5) * (y1 - y0)) / rows;
    if (kind === 'plough') {
      c.drawPath(rect(x0, y - 2.2, x1 - x0, 2.6), fill(shade(base, -0.22)));
      c.drawPath(rect(x0, y + 0.6, x1 - x0, 1.2), fill(shade(base, 0.12)));
    } else if (kind === 'stubble') {
      c.drawPath(rect(x0, y - 0.7, x1 - x0, 1.4), fill(shade(base, -0.16)));
    }
  }
  const n = kind === 'pasture' ? 60 : 36;
  for (let i = 0; i < n; i++) {
    const x = x0 + 6 + hash01(seed, i, 1) * (x1 - x0 - 12);
    const y = y0 + 4 + hash01(seed, i, 2) * (y1 - y0 - 8);
    const col = kind === 'pasture' ? (i % 3 ? shade(base, -0.18) : YARD.grassLight) : kind === 'plough' ? shade(base, 0.2) : shade(base, 0.14);
    c.drawPath(oval(x, y, 3 + hash01(seed, i, 3) * 4, 1.6 + hash01(seed, i, 4) * 1.4), fill(col, 0.8));
  }
}

/**
 * THE SKYLINE BAND for the lane (8 m of it, a standing sprite anchored at its foot): the late sky down to
 * a hazy line of far hills, a hedgerow with two or three field trees in front of it. The world stands a
 * run of these along the far edge of the fields north of the lane; with the fields in front nothing of
 * the void shows. frame: a second arrangement of the trees.
 */
export const TREELINE_M = 8;
export function drawTreeline(c: SkCanvas, v: View3q, frame = 0): void {
  const L = TREELINE_M / 2;
  const [x0, y0] = proj(v, -L, 0, 0);
  const [x1] = proj(v, L, 0, 0);
  const top = y0 - 7.5 * v.ppm * v.lift;
  const w = x1 - x0;
  // the sky band and the far hills
  c.drawPath(rect(x0, top, w, y0 - top), linear(0, top, 0, y0, [YARD.sky, YARD.skyLow], [0, 0.8]));
  const hills = builder().moveTo(x0, y0);
  for (let i = 0; i <= 8; i++) {
    const x = x0 + (w * i) / 8;
    const h = 46 + Math.sin(i * 0.9 + frame * 2.1) * 10;
    hills.lineTo(x, y0 - h);
  }
  hills.lineTo(x1, y0).close();
  c.drawPath(hills.build(), fill(mix(YARD.far, YARD.skyLow, 0.25)));
  // a far field edge and the hedgerow
  c.drawPath(rect(x0, y0 - 22, w, 22), fill(mix('#8FA88A', YARD.far, 0.35)));
  const hb = builder().moveTo(x0, y0);
  for (let i = 0; i <= 16; i++) hb.lineTo(x0 + (w * i) / 16, y0 - 14 - hash01(frame + 3, i) * 8);
  hb.lineTo(x1, y0).close();
  c.drawPath(hb.build(), fill(mix(HEDGE, YARD.far, 0.3)));
  // field trees: a trunk and a round crown, lit on the west
  const trees = frame ? [0.22, 0.71] : [0.12, 0.47, 0.83];
  trees.forEach((t, i) => {
    const tx = x0 + w * t;
    const s = 0.8 + hash01(frame, i, 9) * 0.45;
    c.drawPath(rect(tx - 2.5, y0 - 34 * s, 5, 26 * s), fill(mix('#5B4A3A', YARD.far, 0.3)));
    const cy = y0 - 56 * s;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      c.drawPath(oval(tx + Math.cos(a) * 12 * s, cy + Math.sin(a) * 9 * s, 15 * s, 13 * s), fill(mix(shade(HEDGE, -0.1), YARD.far, 0.25)));
    }
    c.drawPath(oval(tx - 7 * s, cy - 6 * s, 11 * s, 9 * s), fill(mix(YARD.grassLight, YARD.far, 0.3)));
  });
}

/** A milepost: a short white post with a black cap (no words). Roadside variety every 30 to 40 m. */
export function drawMilepost(c: SkCanvas, v: View3q): void {
  groundShadow(c, v, 0.15, 0.1, 0, 0, 0.9);
  box(c, v, { len: 0.22, wid: 0.18, h: 0.9, color: '#F1EFE8', line: 1, onFace: (q, n) => n[1] > 0.5 && faceFill(c, v, subQuad(q, 0, 1, 0.82, 1), INK) });
  box(c, v, { len: 0.24, wid: 0.2, h: 0.06, z: 0.9, color: INK, line: 0.8 });
}

/** A telegraph pole (7 m, timber) with its cross-arm and insulators and the wires' stubs. Anchor its foot. */
export function drawPole(c: SkCanvas, v: View3q): void {
  groundShadow(c, v, 0.15, 0.1, 0, 0, 3.5);
  box(c, v, { len: 0.2, wid: 0.2, h: 7.0, color: '#7A5C40', line: 1 });
  box(c, v, { len: 1.4, wid: 0.1, h: 0.1, z: 6.5, color: '#6A4E36', line: 0.8 });
  for (const x of [-0.6, -0.2, 0.2, 0.6]) {
    const [ix, iy] = proj(v, x, 0, 6.65);
    c.drawPath(rrect(ix - 1.6, iy - 4, 3.2, 4, 1), fill('#E8E4D8'));
    c.drawPath(segment(ix, iy - 3, ix + 22, iy + 2), stroke(INK, 0.6));
    c.drawPath(segment(ix, iy - 3, ix - 22, iy + 2), stroke(INK, 0.6));
  }
  const [sx, sy] = proj(v, 0.1, 0.1, 2.2);
  c.drawPath(rect(sx - 2, sy - 3, 4, 3), fill('#D9D2B8'));
}

/** A five-bar field gate (3.4 m, east-west) between its two posts, shut. */
export function drawFieldGate(c: SkCanvas, v: View3q): void {
  const L = 3.4;
  for (const x of [-L / 2, L / 2]) box(c, v, { len: 0.2, wid: 0.2, h: 1.4, ox: x, color: '#7A5C40', line: 1 });
  for (let i = 0; i < 5; i++) box(c, v, { len: L - 0.24, wid: 0.06, h: 0.09, z: 0.25 + i * 0.22, color: '#B9A27E', line: 0.7 });
  const [ax, ay] = proj(v, -L / 2 + 0.12, 0, 0.25);
  const [bx, by] = proj(v, L / 2 - 0.12, 0, 1.13);
  c.drawPath(segment(ax, ay, bx, by), stroke(INK, 3.2));
  c.drawPath(segment(ax, ay, bx, by), stroke('#B9A27E', 1.8));
}

/** A yellow grit bin with a lid (roadside variety at a lay-by). */
export function drawGritBin(c: SkCanvas, v: View3q): void {
  boxShadow(c, v, 0.9, 0.6, 0, 0, 0.8);
  box(c, v, { len: 0.9, wid: 0.6, h: 0.65, color: YARD.hivis, line: 1, bevel: true });
  box(c, v, { len: 0.96, wid: 0.66, h: 0.08, z: 0.65, color: YARD.hivisDark, line: 1 });
}

/**
 * A partner's mark (invented; no letters), drawn in a square of side s centred at (cx, cy):
 * 'farm' a gold wheatsheaf in a green roundel; 'demolition' a wrecking ball on its chain in a hi-vis
 * hexagon. The register's partners map onto these by their lane order (the world's `look`).
 */
export type PartnerMark = 'farm' | 'demolition';
export const PARTNER_MARKS: readonly PartnerMark[] = ['farm', 'demolition'];
export function partnerMark(c: SkCanvas, cx: number, cy: number, s: number, mark: PartnerMark): void {
  const r = s / 2;
  if (mark === 'farm') {
    c.drawPath(oval(cx, cy, r, r), fill('#2F6B3A'));
    c.drawPath(oval(cx, cy, r, r), stroke(INK, 1));
    c.drawPath(oval(cx, cy, r * 0.82, r * 0.82), stroke('#E9C46A', 1));
    for (const a of [-0.45, -0.22, 0, 0.22, 0.45]) {
      const tx = cx + Math.sin(a) * r * 0.62;
      const ty = cy - Math.cos(a) * r * 0.5;
      c.drawPath(segment(cx, cy + r * 0.55, tx, ty), stroke('#E9C46A', 1.4));
      c.drawPath(oval(tx, ty - r * 0.06, r * 0.1, r * 0.2), fill('#E9C46A'));
    }
    c.drawPath(rect(cx - r * 0.3, cy + r * 0.08, r * 0.6, r * 0.12), fill('#B07A2E'));
    return;
  }
  const hex: number[] = [];
  for (let i = 0; i < 6; i++) hex.push(cx + Math.cos((i * Math.PI) / 3) * r, cy + Math.sin((i * Math.PI) / 3) * r);
  c.drawPath(poly(hex), fill(YARD.hivis));
  c.drawPath(poly(hex), stroke(INK, 1));
  c.drawPath(segment(cx - r * 0.45, cy - r * 0.6, cx + r * 0.1, cy + r * 0.1), stroke(INK, 1.3));
  c.drawPath(oval(cx + r * 0.18, cy + r * 0.22, r * 0.3, r * 0.3), fill(YARD.machineDark));
  c.drawPath(oval(cx + r * 0.1, cy + r * 0.14, r * 0.1, r * 0.1), fill(shade(YARD.machineDark, 0.4)));
  c.drawPath(rect(cx - r * 0.7, cy - r * 0.66, r * 0.6, r * 0.12), fill(INK));
}

/** Where a partner sign's name goes (points round the sign's anchor): the world writes the register's name. */
export const partnerSignSlot = (v: View3q): [number, number, number, number] => {
  const [ax, ay] = proj(v, -1.0, 0.06, 1.55);
  const [bx, by] = proj(v, 1.0, 0.06, 1.05);
  return [ax + 34, ay, bx - ax - 38, by - ay];
};

/** A partner's gate sign: a board on two posts (2.2 m), the partner's mark at its west end, room for the name. */
export function drawPartnerSign(c: SkCanvas, v: View3q, mark: PartnerMark): void {
  const L = 2.2;
  boxShadow(c, v, L, 0.12, 0, 0, 1.7);
  for (const x of [-L / 2 + 0.15, L / 2 - 0.15]) box(c, v, { len: 0.12, wid: 0.12, h: 1.75, ox: x, color: mark === 'farm' ? '#7A5C40' : YARD.machineDark, line: 0.9 });
  const board = mark === 'farm' ? '#F4EFE0' : '#2E3A33';
  box(c, v, { len: L, wid: 0.06, h: 0.72, z: 0.98, color: board, line: 1.1, onFace: (q, n) => n[1] > 0.9 && faceFill(c, v, subQuad(q, 0, 1, 0, 0.1), mark === 'farm' ? '#2F6B3A' : YARD.hivis) });
  const [mx, my] = proj(v, -L / 2 + 0.38, 0.06, 1.34);
  partnerMark(c, mx, my, 22, mark);
}

/** The farm partner's barn (6 x 4 m): stone walls, a slate roof with a ridge, a big door, a window, a chimney. */
export function drawFarmhouse(c: SkCanvas, v: View3q): void {
  const L = 6;
  const D = 4;
  const H = 3.0;
  boxShadow(c, v, L, D, 0, 0, H + 1.6);
  box(c, v, {
    len: L,
    wid: D,
    h: H,
    color: '#C9BBA0',
    line: LINE_W,
    onFace: (q, n) => {
      if (n[1] < 0.9) return;
      faceFill(c, v, subQuad(q, 0.38, 0.62, 0, 0.78), '#7B5A3A', 1);
      faceFill(c, v, subQuad(q, 0.495, 0.505, 0, 0.78), shade('#7B5A3A', -0.3));
      faceFill(c, v, subQuad(q, 0.1, 0.24, 0.45, 0.75), YARD.glassDark, 1);
      faceFill(c, v, subQuad(q, 0.76, 0.9, 0.45, 0.75), YARD.glassDark, 1);
      const [fx, fy] = proj(v, ...subQuad(q, 0.25, 0, 0.3, 0)[0]);
      freckles(c, fx, fy, 70, 20, 4, shade('#C9BBA0', -0.15), 14);
    },
  });
  // the pitched roof: two slopes from the long walls to a ridge along x
  const ridge = H + 1.6;
  const north: V3[] = [[-L / 2 - 0.2, -D / 2 - 0.2, H], [L / 2 + 0.2, -D / 2 - 0.2, H], [L / 2 + 0.2, 0, ridge], [-L / 2 - 0.2, 0, ridge]];
  const south: V3[] = [[-L / 2 - 0.2, D / 2 + 0.2, H], [L / 2 + 0.2, D / 2 + 0.2, H], [L / 2 + 0.2, 0, ridge], [-L / 2 - 0.2, 0, ridge]];
  faceFill(c, v, north, '#5D6670', 1.2);
  faceFill(c, v, south, '#6F7984', 1.2);
  for (let i = 1; i < 6; i++) faceFill(c, v, subQuad(south, 0, 1, i / 6 - 0.01, i / 6 + 0.01), '#5D6670');
  // the gable ends' triangles (the east one faces the eye a little in this view: drawn flat)
  for (const sx of [-1, 1]) {
    const a = proj(v, sx * L / 2, -D / 2, H);
    const b = proj(v, sx * L / 2, D / 2, H);
    const t = proj(v, sx * L / 2, 0, ridge);
    c.drawPath(poly([a[0], a[1], b[0], b[1], t[0], t[1]]), fill('#BCAE92'));
  }
  box(c, v, { len: 0.5, wid: 0.5, h: 1.2, ox: L / 2 - 1.0, oy: -0.4, z: ridge - 0.6, color: '#A8987C', line: 1 });
}

/**
 * The farm's lean-to (3.6 x 2.6 m): posts and a corrugated roof falling south, open on the lane's side.
 * The world draws the farm's skip after it, under the roof (anchor both at the same centre).
 */
export function drawLeanTo(c: SkCanvas, v: View3q): void {
  const L = 3.6;
  const D = 2.6;
  boxShadow(c, v, L, D, 0, 0, 2.6);
  box(c, v, { len: L, wid: 0.12, h: 2.8, oy: -D / 2, color: '#8C6A45', line: 1, onFace: (q, n) => {
    if (n[1] < 0.9) return;
    for (let i = 1; i < 12; i++) faceFill(c, v, subQuad(q, i / 12 - 0.004, i / 12 + 0.004, 0, 1), shade('#8C6A45', -0.2));
  } });
  for (const x of [-L / 2 + 0.1, L / 2 - 0.1]) box(c, v, { len: 0.12, wid: 0.12, h: 2.2, ox: x, oy: D / 2 - 0.1, color: YARD.wood, line: 1 });
  const roof: V3[] = [[-L / 2 - 0.15, D / 2 + 0.2, 2.25], [L / 2 + 0.15, D / 2 + 0.2, 2.25], [L / 2 + 0.15, -D / 2 - 0.1, 2.85], [-L / 2 - 0.15, -D / 2 - 0.1, 2.85]];
  faceFill(c, v, roof, '#8E9AA0', 1.1);
  for (let i = 1; i < 14; i++) faceFill(c, v, subQuad(roof, i / 14 - 0.006, i / 14 + 0.006, 0, 1), shade('#8E9AA0', -0.18));
  faceFill(c, v, subQuad(roof, 0, 1, 0, 0.08), shade('#8E9AA0', -0.3));
  const [rx, ry] = proj(v, ...subQuad(roof, 0.6, 0, 0.5, 0)[0]);
  freckles(c, rx, ry, 30, 12, 8, YARD.rust, 5);
}

/**
 * The end of the lane before the bridge: two plank barriers on A-frame trestles across the road (6 m,
 * red and white boards), a blank no-entry roundel on the middle trestle and a cone at each end.
 */
export function drawLaneEnd(c: SkCanvas, v: View3q): void {
  const L = 6.0;
  boxShadow(c, v, L, 0.5, 0, 0, 1.2);
  for (const x of [-L / 2 + 0.2, 0, L / 2 - 0.2]) {
    for (const dy of [-0.2, 0.2]) {
      const a = proj(v, x, dy, 0);
      const t = proj(v, x, 0, 1.05);
      c.drawPath(segment(a[0], a[1], t[0], t[1]), stroke(INK, 3));
      c.drawPath(segment(a[0], a[1], t[0], t[1]), stroke(YARD.machine, 1.6));
    }
  }
  for (const z of [0.45, 0.85]) {
    box(c, v, {
      len: L,
      wid: 0.04,
      h: 0.2,
      z,
      color: '#FFFFFF',
      line: 1,
      onFace: (q, n) => {
        if (n[1] < 0.9) return;
        for (let i = 0; i < 12; i += 2) faceFill(c, v, subQuad(q, i / 12, (i + 1) / 12, 0, 1), '#C8352B');
      },
    });
  }
  const [sx, sy] = proj(v, 0, 0.05, 1.5);
  c.drawPath(segment(sx, sy, sx, sy + 12), stroke(INK, 2));
  c.drawPath(oval(sx, sy, 11, 11), fill('#C8352B'));
  c.drawPath(rect(sx - 7, sy - 2, 14, 4), fill('#FFFFFF'));
  c.drawPath(oval(sx, sy, 11, 11), stroke(INK, 1));
  for (const x of [-L / 2 - 0.5, L / 2 + 0.5]) {
    const [cx, cy] = proj(v, x, 0.3, 0);
    c.drawPath(poly([cx - 6, cy, cx + 6, cy, cx + 1.5, cy - 20, cx - 1.5, cy - 20]), fill(YARD.hivisDark));
    c.drawPath(rect(cx - 4, cy - 12, 8, 3), fill('#FFFFFF'));
    c.drawPath(poly([cx - 6, cy, cx + 6, cy, cx + 1.5, cy - 20, cx - 1.5, cy - 20]), stroke(INK, 0.9));
  }
}
