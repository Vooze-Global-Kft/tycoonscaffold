/**
 * The first yard's things, WHOLE and in the stages they pass as their pieces come off (yard-stage1.md 2.4
 * and 6.1; content2.json `objects`; the artist "things"). Every drawing is anchored at the centre of its
 * footprint on the ground, in the kit's View3q (40 pt a metre, tilt 0.7), with its own ground shadow swept
 * east by the low sun. Things are drawn at true size (hand-sized things a little larger, as the style sheet
 * has machines); the car, a "vehicle" in looks, at two thirds of its length as vehicles are.
 *
 * Stages: `stage` 0 is whole; each later stage is what stands after more pieces are off (the manifest's
 * frame names say which). A thing never shows words: the "certified empty" tag and the car's treatment
 * record are blank paper with a stamp (the caller's words go on the card and the ticket).
 *
 * Honest takings-apart (S6): the washer gives a top panel, two sides, the stainless drum and the motor;
 * cast iron is broken (jagged edges), steel is cut (straight edges with a slag line); the car is
 * depolluted (no tyres: it stands on its alloy rims), its paper record tag on the windscreen.
 */
import { BlendMode, ClipOp, type SkCanvas } from '@shopify/react-native-skia';
import { LINE_W, METAL, YARD, mix, shade } from './palette';
import {
  box,
  boxShadow,
  builder,
  cylinder,
  discPath,
  faceFill,
  facePath,
  fill,
  freckles,
  groundShadow,
  hash01,
  oval,
  poly,
  proj,
  rrect,
  segment,
  stroke,
  subQuad,
  type V3,
  type View3q,
} from './pen';
import { CAR_PAINTS, TONE, alloyWheel, brassElbow, brassTap, brassTee, brassValve, copperTicks, motorWhole, pieceGlyph, stainlessDrum } from './pieces.draw';

const INK = YARD.ink;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A jagged cut line (screen points) at x from y0 to y1: broken cast iron. */
function jaggedX(x: number, y0: number, y1: number, seed: number, amp = 3): number[] {
  const pts: number[] = [];
  const n = 7;
  for (let i = 0; i <= n; i++) pts.push(x + (i === 0 || i === n ? 0 : (hash01(seed, i, 11) - 0.5) * 2 * amp), y0 + ((y1 - y0) * i) / n);
  return pts;
}

/**
 * Draw `draw` only west of a cut at screen x (jagged when `broken`, straight for a torch cut), then the
 * cut's edge: grey grain for cast iron, a bright line with a dark slag line for steel.
 */
function westOf(c: SkCanvas, x: number, top: number, bottom: number, seed: number, broken: boolean, draw: () => void, edge = true): void {
  const pts = broken ? jaggedX(x, top, bottom, seed) : [x, top, x, bottom];
  const clip = poly([-400, top, ...pts, -400, bottom]);
  // the drawing in its own layer, so the cut's edge lands only on the thing's pixels (SrcATop)
  c.saveLayer();
  c.save();
  c.clipPath(clip, ClipOp.Intersect, true);
  draw();
  c.restore();
  if (edge) {
    const b = builder();
    b.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) b.lineTo(pts[i], pts[i + 1]);
    const line = b.build();
    const atop = (p: ReturnType<typeof stroke>) => {
      p.setBlendMode(BlendMode.SrcATop);
      return p;
    };
    if (broken) {
      c.drawPath(line, atop(stroke(INK, 3.2)));
      c.drawPath(line, atop(stroke(mix(TONE.castHi, '#8B8F93', 0.4), 1.5)));
    } else {
      c.drawPath(line, atop(stroke(INK, 3)));
      c.drawPath(line, atop(stroke(TONE.steelCut, 1.3)));
    }
  }
  c.restore();
}

/** A ground shadow clipped west of a cut (a part-cut thing's shadow ends where the thing does). */
function shadowWestOf(c: SkCanvas, x: number, draw: () => void): void {
  c.save();
  c.clipRect({ x: -400, y: -400, width: 400 + x + 6, height: 800 }, ClipOp.Intersect, true);
  draw();
  c.restore();
}

/** A blank paper tag on a string (no words): `stamp` green for "certified empty", blue for a record. */
export function paperTag(c: SkCanvas, x: number, y: number, kind: 'empty' | 'record', turn = -8, ax?: number, ay?: number): void {
  if (ax !== undefined && ay !== undefined) c.drawPath(segment(ax, ay, x, y - 4), stroke(INK, 0.7));
  c.save();
  c.translate(x, y);
  c.rotate(turn, 0, 0);
  const r = rrect(-4, -4.5, 8, 10, 1);
  c.drawPath(r, fill(YARD.paper));
  c.drawPath(r, stroke(INK, 0.8));
  c.drawPath(oval(0, -2.8, 0.8, 0.8), fill(INK));
  c.drawPath(segment(-2.6, 0, 2.6, 0), stroke(YARD.paperLine, 0.7));
  c.drawPath(segment(-2.6, 1.6, 1.4, 1.6), stroke(YARD.paperLine, 0.7));
  const col = kind === 'empty' ? YARD.good : YARD.stampBlue;
  c.drawPath(oval(0.6, 3.4, 2.1, 1.6), stroke(col, 0.9));
  if (kind === 'empty') c.drawPath(builder().moveTo(-0.6, 3.4).lineTo(0.3, 4.2).lineTo(1.9, 2.5).build(), stroke(col, 0.8));
  c.restore();
}

/** A screen-space glyph placed at a world point. */
function glyphAt(c: SkCanvas, v: View3q, x: number, y: number, z: number, draw: () => void, turn = 0, scale = 1): void {
  const [sx, sy] = proj(v, x, y, z);
  c.save();
  c.translate(sx, sy);
  if (turn) c.rotate(turn, 0, 0);
  if (scale !== 1) c.scale(scale, scale);
  draw();
  c.restore();
}

/** A tube lying in the world from a to b (screen: a stroke with ink under), d metres thick. */
function tubeW(c: SkCanvas, v: View3q, a: V3, b: V3, d: number, color: string, light?: string): void {
  const [ax, ay] = proj(v, ...a);
  const [bx, by] = proj(v, ...b);
  const w = Math.max(1.4, d * v.ppm);
  c.drawPath(segment(ax, ay, bx, by), stroke(INK, w + 1.3));
  c.drawPath(segment(ax, ay, bx, by), stroke(color, w));
  if (light && w > 2.2) c.drawPath(segment(ax, ay - w * 0.22, bx, by - w * 0.22), stroke(light, Math.max(0.7, w * 0.28)));
}

// ---------------------------------------------------------------------------
// The washing machine (stages: whole, top, open, base)
// ---------------------------------------------------------------------------

export const WASHER_STAGES = ['whole', 'top', 'open', 'base'] as const;

function washerFront(c: SkCanvas, v: View3q, q: V3[], seed: number): void {
  faceFill(c, v, subQuad(q, 0, 1, 0.84, 1), shade(YARD.enamel, -0.16));
  const ctr: V3 = [0, 0.3, 0.42];
  c.drawPath(discPath(v, ctr, [1, 0, 0], [0, 0, 1], 0.22), fill('#D5D8D6'));
  c.drawPath(discPath(v, ctr, [1, 0, 0], [0, 0, 1], 0.22), stroke(INK, LINE_W));
  c.drawPath(discPath(v, ctr, [1, 0, 0], [0, 0, 1], 0.155), fill(YARD.glassDark));
  c.drawPath(discPath(v, ctr, [1, 0, 0], [0, 0, 1], 0.155), stroke(INK, 1));
  const [hx, hy] = proj(v, -0.07, 0.3, 0.5);
  c.drawPath(segment(hx, hy, hx + 3, hy + 3), stroke('#FFFFFF', 1.3, 0.8));
  const [rx, ry] = proj(v, 0.12, 0.3, 0.18);
  c.drawPath(builder().moveTo(rx, ry).lineTo(rx + 1, ry + 7).build(), stroke(YARD.rust, 1.6, 0.7));
  const [kx, ky] = proj(v, -0.2, 0.3, 0.78);
  c.drawCircle(kx, ky, 1.8, fill(YARD.steel));
  c.drawCircle(kx, ky, 1.8, stroke(INK, 0.8));
  const [fx, fy] = proj(v, -0.26, 0.3, 0.12);
  freckles(c, fx, fy - 4, 8, 6, seed, YARD.rust, 3);
}

/** The motor of a washer (or a loose one) lying at a world point, its windings showing. */
function motorAt(c: SkCanvas, v: View3q, x: number, y: number, z: number, s = 15): void {
  glyphAt(c, v, x, y, z, () => motorWhole(c, s));
}

export function drawWasherStage(c: SkCanvas, v: View3q, stage: number, seed = 1): void {
  boxShadow(c, v, 0.66, 0.62, 0, 0, stage === 0 ? 0.85 : stage === 1 ? 0.8 : 0.5);
  if (stage <= 1) {
    box(c, v, {
      len: 0.6,
      wid: 0.6,
      h: stage === 0 ? 0.85 : 0.82,
      color: YARD.enamel,
      front: shade(YARD.enamel, -0.06),
      bevel: stage === 0,
      top: stage === 0 ? undefined : shade(YARD.steelDark, -0.25),
      onFace: (q, n) => {
        if (n[1] < 0.9) return;
        washerFront(c, v, q, seed);
      },
      onTop: (q) => {
        if (stage === 0) {
          const [x0, y0] = proj(v, -0.22, -0.18, 0.85);
          freckles(c, x0 + 4, y0 + 2, 0.36 * v.ppm, 0.24 * v.ppm * v.tilt, seed, YARD.rust, 3);
          return;
        }
        // the top is off: the drum's tub rim, its dark mouth, the springs at the corners
        faceFill(c, v, subQuad(q, 0.04, 0.96, 0.04, 0.96), shade(YARD.steelDark, -0.35));
        const tc: V3 = [0, -0.02, 0.7];
        c.drawPath(discPath(v, tc, [1, 0, 0], [0, 1, 0], 0.25), fill(YARD.galvanisedLight));
        c.drawPath(discPath(v, tc, [1, 0, 0], [0, 1, 0], 0.25), stroke(INK, 1));
        c.drawPath(discPath(v, tc, [1, 0, 0], [0, 1, 0], 0.18), fill(shade(YARD.steelDark, -0.2)));
        for (const sx of [-0.24, 0.24]) {
          const [a, b] = proj(v, sx, -0.24, 0.82);
          const [, d] = proj(v, sx, -0.24, 0.68);
          c.drawPath(segment(a, b, a, d), stroke(YARD.galvanisedLight, 1.2));
        }
      },
    });
    return;
  }
  // stage 2 'open': top and both sides off: the base frame, the back panel, the drum on its springs,
  // the motor under it and the concrete counterweight; stage 3 'base': the drum is off too.
  box(c, v, { len: 0.6, wid: 0.54, h: 0.06, color: YARD.galvanised, line: 1 });
  if (stage === 2) box(c, v, { len: 0.6, wid: 0.05, h: 0.82, oy: -0.27, color: YARD.enamel, line: LINE_W });
  box(c, v, { len: 0.44, wid: 0.16, h: 0.16, ox: 0.02, oy: -0.12, z: 0.06, color: '#B4B0A6', line: 1 });
  if (stage === 2) {
    // springs from the back panel's top to the drum
    for (const sx of [-0.18, 0.18]) {
      const [a, b] = proj(v, sx, -0.22, 0.8);
      const [d, e] = proj(v, sx, -0.08, 0.62);
      c.drawPath(segment(a, b, d, e), stroke(YARD.steel, 1.2));
    }
    glyphAt(c, v, 0, 0.02, 0.48, () => stainlessDrum(c, 26), 90 - 90);
  }
  motorAt(c, v, 0.06, 0.16, 0.12, 15);
}

// ---------------------------------------------------------------------------
// The bicycle lying flat (stages: whole, cut)
// ---------------------------------------------------------------------------

export const BIKE_STAGES = ['whole', 'cut'] as const;

export function drawBikeStage(c: SkCanvas, v: View3q, stage: number, seed = 2): void {
  const sh = () => groundShadow(c, v, 0.82, 0.32, 0, 0.02, 0.1);
  if (stage === 0) sh();
  else shadowWestOf(c, proj(v, 0.08, 0, 0)[0], sh);
  const paint = ['#4F7896', '#6F806A', '#7D3B33'][Math.floor(hash01(seed, 5) * 3)];
  const z = 0.06;
  // the bike lies on its side: its up is north (-y) on the ground
  const P = (x: number, y: number): V3 => [x, y * 0.62, z];
  const wheel = (cx: number) => {
    const ctr: V3 = [cx, 0.1 * 0.62, 0.03];
    c.drawPath(discPath(v, ctr, [1, 0, 0], [0, 1, 0], 0.33), stroke(INK, 3.6));
    c.drawPath(discPath(v, ctr, [1, 0, 0], [0, 1, 0], 0.33), stroke(YARD.galvanisedLight, 2));
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const [x0, y0] = proj(v, ctr[0], ctr[1], ctr[2]);
      const [x1, y1] = proj(v, ctr[0] + Math.cos(a) * 0.31, ctr[1] + Math.sin(a) * 0.31, ctr[2]);
      c.drawPath(segment(x0, y0, x1, y1), stroke(YARD.steel, 0.55));
    }
    const [hx, hy] = proj(v, ...ctr);
    c.drawCircle(hx, hy, 1.6, fill(YARD.steelDark));
  };
  const frame = () => {
    const bb = P(0, 0.12);
    const seat = P(-0.18, -0.4);
    const head = P(0.36, -0.36);
    const rear = P(-0.52, 0.1);
    const fork = P(0.52, 0.1);
    tubeW(c, v, rear, seat, 0.05, paint);
    tubeW(c, v, rear, bb, 0.05, paint);
    tubeW(c, v, seat, bb, 0.06, paint);
    tubeW(c, v, seat, head, 0.06, paint, shade(paint, 0.35));
    tubeW(c, v, head, bb, 0.07, paint, shade(paint, 0.35));
    tubeW(c, v, head, fork, 0.05, YARD.galvanised);
    // saddle, bars, crank
    tubeW(c, v, seat, P(-0.21, -0.52), 0.04, YARD.galvanised);
    const [sx, sy] = proj(v, ...P(-0.24, -0.55));
    c.drawPath(rrect(sx - 6, sy - 2, 11, 4, 2), fill(INK));
    tubeW(c, v, head, P(0.34, -0.5), 0.04, YARD.galvanised);
    tubeW(c, v, P(0.24, -0.52), P(0.46, -0.48), 0.035, YARD.galvanised);
    const [bx, by] = proj(v, ...bb);
    c.drawCircle(bx, by, 3, fill(YARD.steel));
    c.drawCircle(bx, by, 3, stroke(INK, 0.8));
  };
  const all = () => {
    wheel(-0.52);
    wheel(0.52);
    frame();
    const [fx, fy] = proj(v, -0.1, -0.1, z);
    freckles(c, fx, fy, 14, 6, seed, YARD.rust, 3);
  };
  if (stage === 0) all();
  else {
    const [cx] = proj(v, 0.08, 0, 0);
    westOf(c, cx, -60, 60, seed, false, all);
  }
}

// ---------------------------------------------------------------------------
// Cable: the bundle of heavy offcuts (full, half), the demolition coil
// ---------------------------------------------------------------------------

export const BUNDLE_STAGES = ['full', 'half'] as const;

/** A bundle of heavy cable offcuts (0.9 x 0.45 m): short thick lengths, cores showing, two straps. */
export function drawCableBundle(c: SkCanvas, v: View3q, stage = 0, seed = 4): void {
  boxShadow(c, v, 0.95, 0.5, 0, 0, 0.3);
  const n = stage === 0 ? 8 : 4;
  const jackets = [YARD.pvc, YARD.pvcGrey, '#4A5058', YARD.pvc];
  const d = 0.1;
  // lengths lie east-west, stacked in a low pile: rows back to front, layers bottom to top
  const slots: [number, number, number][] = [
    [-0.02, -0.1, 0],
    [0.0, 0.0, 0],
    [0.02, 0.1, 0],
    [-0.04, -0.05, d],
    [0.03, 0.05, d],
    [0.0, 0.0, 2 * d],
    [-0.06, 0.14, 0],
    [0.05, -0.14, 0],
  ].slice(0, n) as [number, number, number][];
  slots.sort((a, b) => a[2] - b[2] || a[1] - b[1]);
  slots.forEach(([dx, dy, z], i) => {
    const L = 0.78 + hash01(seed, i, 2) * 0.12;
    const x0 = dx - L / 2;
    const [ax, ay] = proj(v, x0, dy, z + d / 2);
    const [bx] = proj(v, x0 + L, dy, z + d / 2);
    const h = d * v.ppm * 1.0;
    const col = jackets[i % jackets.length];
    const r = rrect(ax, ay - h / 2, bx - ax, h, h * 0.45);
    c.drawPath(r, fill(col));
    c.drawPath(segment(ax + 2, ay - h * 0.2, bx - 2, ay - h * 0.2), stroke(shade(col, 0.32), Math.max(0.8, h * 0.18)));
    c.drawPath(r, stroke(INK, 0.9));
    // the east cut end with three copper cores
    c.drawPath(oval(bx, ay, h * 0.3, h * 0.5), fill(shade(col, -0.25)));
    c.drawPath(oval(bx, ay, h * 0.3, h * 0.5), stroke(INK, 0.8));
    for (const [ox, oy] of [[-0.3, -0.22], [0.25, -0.18], [0, 0.22]] as const) c.drawCircle(bx + ox * h * 0.5, ay + oy * h, Math.max(0.7, h * 0.15), fill(YARD.copperLight));
  });
  // two blue straps over the pile
  for (const sx of [-0.2, 0.18]) {
    const [a, b] = proj(v, sx, 0.15, 0.0);
    const [, t] = proj(v, sx, 0.0, stage === 0 ? 2.8 * d : 1.6 * d);
    const p = builder().moveTo(a - 1, b).quadTo(a + 1, t - 2, a + 2, b - 1).build();
    c.drawPath(p, stroke(INK, 3));
    c.drawPath(p, stroke(YARD.crateBlue, 1.8));
  }
  const [tx, ty] = proj(v, 0.3, 0.0, 0.2);
  copperTicks(c, tx + 5, ty + 2, 4);
}

/** A coil of heavy demolition cable: loose strands of several jackets, three tape ties, both cut ends. */
export function drawCableCoil(c: SkCanvas, v: View3q, seed = 6): void {
  groundShadow(c, v, 0.5, 0.42, 0, 0, 0.25);
  const [cx, cy] = proj(v, 0, 0, 0.1);
  const R = 0.4 * v.ppm;
  const jackets = [YARD.pvc, '#59606A', YARD.pvcGrey, '#3E4650'];
  const w = 3.2;
  // the strands: separate loops with gaps, drawn back (north) half then front half over the hole
  const loopsN = 7;
  for (let pass = 0; pass < 2; pass++)
    for (let i = 0; i < loopsN; i++) {
      const rr = R * (0.62 + 0.06 * i + (hash01(seed, i) - 0.5) * 0.05);
      const ox = (hash01(seed, i, 2) - 0.5) * 4;
      const oy = -i * 1.1 + (hash01(seed, i, 3) - 0.5) * 2;
      const start = pass === 0 ? 180 : 0;
      const p = builder().addArc({ x: cx + ox - rr, y: cy + oy - rr * 0.62, width: rr * 2, height: rr * 1.24 }, start, 180).build();
      c.drawPath(p, stroke(INK, w + 1.4));
      c.drawPath(p, stroke(jackets[i % jackets.length], w));
      if (pass === 1) c.drawPath(builder().addArc({ x: cx + ox - rr, y: cy + oy - rr * 0.62 - 0.8, width: rr * 2, height: rr * 1.24 }, 30, 120).build(), stroke(shade(jackets[i % jackets.length], 0.4), 0.8));
    }
  // three hi-vis tape ties across the strands
  for (const a of [-140, -30, 70]) {
    const r = (a * Math.PI) / 180;
    const x = cx + Math.cos(r) * R * 0.85;
    const y = cy - 3 + Math.sin(r) * R * 0.53;
    c.save();
    c.translate(x, y);
    c.rotate(a + 90, 0, 0);
    c.drawPath(rrect(-1.6, -6, 3.2, 12, 1), fill(YARD.hivis));
    c.drawPath(rrect(-1.6, -6, 3.2, 12, 1), stroke(INK, 0.8));
    c.restore();
  }
  // the two cut ends leaving the coil, copper cores fanned
  for (const [dx, dy, ex, ey] of [[0.32, 0.18, 0.55, 0.32], [-0.3, 0.2, -0.5, 0.36]] as const) {
    const [ax, ay] = proj(v, dx, dy, 0.12);
    const [bx, by] = proj(v, ex, ey, 0.04);
    const p = builder().moveTo(ax, ay).quadTo((ax + bx) / 2, by - 4, bx, by).build();
    c.drawPath(p, stroke(INK, w + 1.4));
    c.drawPath(p, stroke(YARD.pvc, w));
    for (let k = 0; k < 3; k++) c.drawPath(segment(bx, by, bx + (ex > 0 ? 3 : -3) + k * 0.4, by - 1.5 + k * 1.5), stroke(YARD.copperLight, 1.1));
  }
}

// ---------------------------------------------------------------------------
// Brass: the tap crate (old drawing kept in scrap.draw), the fittings tote
// ---------------------------------------------------------------------------

/** A galvanised tote of brass fittings and valves: valves, tees and elbows standing out of it. */
export function drawFittingsBox(c: SkCanvas, v: View3q): void {
  boxShadow(c, v, 0.66, 0.46, 0, 0, 0.35);
  box(c, v, {
    len: 0.62,
    wid: 0.42,
    h: 0.28,
    color: YARD.galvanised,
    bevel: true,
    onFace: (q, n) => {
      if (n[1] < 0.9) return;
      // pressed ribs and a grab hole
      faceFill(c, v, subQuad(q, 0.4, 0.6, 0.62, 0.8), shade(YARD.galvanised, -0.5), 0.8);
      for (const s of [0.15, 0.85]) faceFill(c, v, subQuad(q, s - 0.015, s + 0.015, 0.1, 0.5), shade(YARD.galvanised, 0.25));
      const [fx, fy] = proj(v, ...subQuad(q, 0.6, 0.6, 0.2, 0.2)[0]);
      c.drawPath(oval(fx, fy, 4, 2.5), fill(YARD.rust, 0.45));
    },
    onTop: (q) => {
      faceFill(c, v, subQuad(q, 0.05, 0.95, 0.07, 0.93), shade(YARD.galvanised, -0.45));
      const items: [number, number, number, (s: number) => void, number][] = [
        [0.24, 0.38, -18, (s) => brassValve(c, s), 17],
        [0.55, 0.3, 22, (s) => brassTee(c, s), 15],
        [0.8, 0.5, -6, (s) => brassElbow(c, s), 15],
        [0.38, 0.72, 34, (s) => brassElbow(c, s), 14],
        [0.66, 0.74, -28, (s) => brassValve(c, s), 15],
      ];
      for (const [s0, t0, turn, draw, s] of items) {
        const [x, y] = proj(v, ...subQuad(q, s0, s0, t0, t0)[0]);
        c.save();
        c.translate(x, y - 5);
        c.rotate(turn, 0, 0);
        draw(s);
        c.restore();
      }
    },
  });
}

/** A plastic crate of brass taps (the drop-off's and zone 1's), four big taps standing out of it. */
export function drawTapsCrate(c: SkCanvas, v: View3q): void {
  boxShadow(c, v, 0.62, 0.44, 0, 0, 0.4);
  box(c, v, {
    len: 0.6,
    wid: 0.4,
    h: 0.3,
    color: YARD.crateBlue,
    onFace: (q, n) => {
      if (n[1] < 0.9) return;
      faceFill(c, v, subQuad(q, 0.36, 0.64, 0.66, 0.84), shade(YARD.crateBlue, -0.5), 0.8);
      for (const s of [0.18, 0.82]) faceFill(c, v, subQuad(q, s - 0.02, s + 0.02, 0.1, 0.55), shade(YARD.crateBlue, -0.3));
    },
    onTop: (q) => {
      faceFill(c, v, subQuad(q, 0.06, 0.94, 0.08, 0.92), shade(YARD.crateBlue, -0.45));
      const taps: [number, number, number, number][] = [
        [0.22, 0.4, -24, 0],
        [0.5, 0.3, 14, 1],
        [0.78, 0.45, -8, 0],
        [0.4, 0.7, 30, 0],
        [0.68, 0.72, -20, 0],
      ];
      for (const [s0, t0, turn, kind] of taps) {
        const [x, y] = proj(v, ...subQuad(q, s0, s0, t0, t0)[0]);
        c.save();
        c.translate(x, y - 6);
        c.rotate(turn, 0, 0);
        if (kind === 1) brassValve(c, 16);
        else brassTap(c, 18);
        c.restore();
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Cast iron: radiator (whole, two, one), bath, stove, trough
// ---------------------------------------------------------------------------

export const RADIATOR_STAGES = ['whole', 'two', 'one'] as const;

/** A cast-iron column radiator, 1 m long, broken into sections from the east: cols 9, 6, 3. */
export function drawRadiatorStage(c: SkCanvas, v: View3q, stage: number, seed = 2): void {
  const m = METAL.cast_iron;
  const total = 9;
  const cols = stage === 0 ? 9 : stage === 1 ? 6 : 3;
  const len = 0.96;
  const step = len / total;
  const x0 = -len / 2;
  const used = step * cols;
  boxShadow(c, v, used + 0.04, 0.26, x0 + used / 2, 0, 0.62);
  for (const s of [x0 + 0.12, x0 + used - 0.12]) box(c, v, { len: 0.06, wid: 0.2, h: 0.08, ox: s, color: m.dark, line: 1 });
  for (let i = 0; i < cols; i++) {
    const x = x0 + step * (i + 0.5);
    const [cx, yb] = proj(v, x, 0.09, 0.08);
    const [, yt] = proj(v, x, 0.09, 0.62);
    const w = step * v.ppm - 1.2;
    const col = builder().addRRect({ rect: { x: cx - w / 2, y: yt, width: w, height: yb - yt }, rx: w * 0.45, ry: w * 0.45 }).build();
    c.drawPath(col, fill(i % 2 ? m.base : shade(m.base, 0.06)));
    c.drawPath(segment(cx - w * 0.22, yt + 3, cx - w * 0.22, yb - 3), stroke(m.light, 0.9));
    c.drawPath(col, stroke(INK, 1));
    const [, ytt] = proj(v, x, -0.02, 0.62);
    c.drawPath(oval(cx, (yt + ytt) / 2 + 1, w / 2, (yt - ytt) / 2 + 1.6), fill(m.light));
    c.drawPath(oval(cx, (yt + ytt) / 2 + 1, w / 2, (yt - ytt) / 2 + 1.6), stroke(INK, 0.9));
    for (let k = 0; k < 3; k++) c.drawCircle(cx + (hash01(seed, i, k) - 0.5) * w * 0.5, yt + (yb - yt) * (0.25 + 0.25 * k), 0.75, fill(m.light));
  }
  if (stage === 0) {
    const [ex, ey] = proj(v, len / 2 + 0.03, 0.09, 0.52);
    c.drawPath(oval(ex, ey, 2.6, 2.6), fill(TONE.brass));
    c.drawPath(oval(ex, ey, 2.6, 2.6), stroke(INK, 0.9));
  } else {
    // the broken nipples at the east end: grey grain
    const [ex, ey] = proj(v, x0 + used, 0.09, 0.55);
    const [, ey2] = proj(v, x0 + used, 0.09, 0.15);
    for (const y of [ey, ey2]) {
      c.drawPath(oval(ex, y, 2.2, 2.6), fill(mix(TONE.castHi, '#8B8F93', 0.4)));
      c.drawPath(oval(ex, y, 2.2, 2.6), stroke(INK, 0.8));
    }
  }
  const [fx, fy] = proj(v, x0 + 0.05, 0.09, 0.3);
  freckles(c, fx, fy, Math.min(16, used * v.ppm - 6), 8, seed, YARD.rust, 4);
}

export const BATH_STAGES = ['whole', 'broken', 'half'] as const;

/** A cast-iron roll-top bath (1.7 x 0.75 m), white enamel inside, painted dark outside, on four feet. */
export function drawBathStage(c: SkCanvas, v: View3q, stage: number, seed = 7): void {
  const L = 0.85;
  const W = 0.37;
  const H = 0.58;
  const sh = () => boxShadow(c, v, 1.76, 0.8, 0, 0, 0.6);
  if (stage === 0) sh();
  else shadowWestOf(c, proj(v, stage === 1 ? L * 0.45 : 0.0, 0, 0)[0], sh);
  const body = () => {
    const outer = (z: number, k: number) => builder().addRRect({ rect: { x: -L * k * v.ppm, y: proj(v, 0, -W * k, z)[1], width: 2 * L * k * v.ppm, height: 2 * W * k * v.ppm * v.tilt }, rx: W * k * v.ppm * 0.95, ry: W * k * v.ppm * v.tilt * 0.95 }).build();
    // feet
    for (const fx of [-L * 0.7, L * 0.7]) {
      const [x, y] = proj(v, fx, W * 0.55, 0);
      c.drawPath(poly([x - 3, y, x + 3, y, x + 2, y - 6, x - 2, y - 6]), fill(YARD.castIron));
      c.drawPath(poly([x - 3, y, x + 3, y, x + 2, y - 6, x - 2, y - 6]), stroke(INK, 0.9));
    }
    // the outside: from the base outline (narrow, z 0.12) up to the rim (z H): union drawn as the rim
    // shape swept down, its front (south) side darker
    const base = outer(0.12, 0.86);
    const rim = outer(H, 1);
    const [, yb] = proj(v, 0, W * 0.86, 0.12);
    const [, yr] = proj(v, 0, W, H);
    const side = builder()
      .moveTo(-L * v.ppm, proj(v, 0, 0, H)[1])
      .lineTo(-L * 0.86 * v.ppm, proj(v, 0, 0, 0.12)[1])
      .quadTo(0, yb + 4, L * 0.86 * v.ppm, proj(v, 0, 0, 0.12)[1])
      .lineTo(L * v.ppm, proj(v, 0, 0, H)[1])
      .quadTo(0, yr + 6, -L * v.ppm, proj(v, 0, 0, H)[1])
      .close()
      .build();
    c.drawPath(base, fill(shade(YARD.castIron, -0.2)));
    c.drawPath(side, fill(mix(YARD.castIron, '#6F806A', 0.25)));
    c.drawPath(side, stroke(INK, LINE_W));
    c.drawPath(rim, fill(YARD.enamel));
    c.drawPath(rim, stroke(INK, LINE_W));
    // the enamel inside: a deeper, shaded basin, the drain at the west end
    const inner = outer(H, 0.84);
    c.drawPath(inner, fill(shade(YARD.enamel, -0.1)));
    c.save();
    c.clipPath(inner, ClipOp.Intersect, true);
    const [ix, iy] = proj(v, 0.0, -W * 0.5, H);
    c.drawPath(oval(ix, iy, L * v.ppm * 0.9, W * v.ppm * v.tilt * 0.6), fill(shade(YARD.enamel, -0.22)));
    c.restore();
    c.drawPath(inner, stroke(INK, 0.9));
    const [dx, dy] = proj(v, -L * 0.62, 0, H - 0.3);
    c.drawPath(oval(dx, dy + 6, 2.4, 1.6), fill(YARD.steelDark));
    // a rust run from the drain and chips in the paint
    const [rx, ry] = proj(v, L * 0.3, W, 0.4);
    freckles(c, rx - 10, ry - 2, 24, 7, seed, YARD.rustLight, 5);
    c.drawPath(segment(-L * 0.5 * v.ppm, yr - 2, -L * 0.1 * v.ppm, yr), stroke('#FFFFFF', 1.2, 0.8));
  };
  if (stage === 0) body();
  else {
    const [cx] = proj(v, stage === 1 ? L * 0.45 : 0.0, 0, 0);
    westOf(c, cx, -60, 40, seed, true, body);
  }
}

export const STOVE_STAGES = ['whole', 'broken', 'half'] as const;

/** A cast-iron range stove (0.7 x 0.5 x 0.75 m): hotplates, oven door, a towel rail, the flue stub. */
export function drawStoveStage(c: SkCanvas, v: View3q, stage: number, seed = 8): void {
  const sh = () => boxShadow(c, v, 0.74, 0.54, 0, 0, 1.0);
  if (stage === 0) sh();
  else shadowWestOf(c, proj(v, stage === 1 ? 0.14 : -0.06, 0, 0)[0], sh);
  const m = METAL.cast_iron;
  const all = () => {
    for (const lx of [-0.28, 0.28]) box(c, v, { len: 0.06, wid: 0.4, h: 0.1, ox: lx, color: m.dark, line: 0.9 });
    box(c, v, {
      len: 0.7,
      wid: 0.48,
      h: 0.62,
      z: 0.1,
      color: m.base,
      bevel: true,
      onFace: (q, n) => {
        if (n[1] < 0.9) return;
        // the oven door, its hinge side, a handle, the ash door below
        faceFill(c, v, subQuad(q, 0.08, 0.6, 0.38, 0.86), shade(m.base, -0.15), 1);
        faceFill(c, v, subQuad(q, 0.12, 0.56, 0.44, 0.8), shade(m.base, 0.1), 0.6);
        faceFill(c, v, subQuad(q, 0.66, 0.92, 0.5, 0.86), shade(m.base, -0.15), 1);
        faceFill(c, v, subQuad(q, 0.12, 0.88, 0.08, 0.26), shade(m.base, -0.25), 0.9);
        for (let i = 0; i < 4; i++) {
          const [x, y] = proj(v, ...subQuad(q, 0.2 + i * 0.18, 0.2 + i * 0.18, 0.15, 0.15)[0]);
          c.drawCircle(x, y, 0.9, fill(m.light));
        }
        // the towel rail across the top of the front
        const [ax, ay] = proj(v, ...subQuad(q, 0.04, 0.04, 0.92, 0.92)[0]);
        const [bx] = proj(v, ...subQuad(q, 0.96, 0.96, 0.92, 0.92)[0]);
        c.drawPath(segment(ax, ay + 2, bx, ay + 2), stroke(INK, 2.6));
        c.drawPath(segment(ax, ay + 2, bx, ay + 2), stroke(YARD.galvanisedLight, 1.3));
      },
      onTop: (q) => {
        for (const [s0, t0] of [[0.28, 0.5], [0.66, 0.5]] as const) {
          const p = subQuad(q, s0, s0, t0, t0)[0];
          c.drawPath(discPath(v, p, [1, 0, 0], [0, 1, 0], 0.13), fill(shade(m.base, -0.2)));
          c.drawPath(discPath(v, p, [1, 0, 0], [0, 1, 0], 0.13), stroke(INK, 0.9));
          c.drawPath(discPath(v, p, [1, 0, 0], [0, 1, 0], 0.07), stroke(m.light, 0.8));
        }
      },
    });
    // the flue stub at the back
    cylinder(c, v, { r: 0.07, h: 0.18, ox: 0.18, oy: -0.16, z: 0.72, color: m.base, line: 1 });
    const [fx, fy] = proj(v, -0.2, 0.24, 0.3);
    freckles(c, fx, fy, 20, 10, seed, YARD.rust, 5);
  };
  if (stage === 0) all();
  else {
    const [cx] = proj(v, stage === 1 ? 0.14 : -0.06, 0, 0);
    westOf(c, cx, -60, 30, seed, true, all);
  }
}

export const TROUGH_STAGES = ['whole', 'broken'] as const;

/** A cast-iron farm water trough (1.4 x 0.5 x 0.45 m): a rolled rim, dark inside, rust. */
export function drawTroughStage(c: SkCanvas, v: View3q, stage: number, seed = 9): void {
  const sh = () => boxShadow(c, v, 1.44, 0.54, 0, 0, 0.45);
  if (stage === 0) sh();
  else shadowWestOf(c, 0, sh);
  const m = METAL.cast_iron;
  const all = () => {
    box(c, v, {
      len: 1.4,
      wid: 0.5,
      h: 0.45,
      color: m.base,
      bevel: true,
      onFace: (q, n) => {
        if (n[1] < 0.9) return;
        // cast ribs and the maker's plate (blank)
        for (const s of [0.2, 0.5, 0.8]) faceFill(c, v, subQuad(q, s - 0.012, s + 0.012, 0.05, 0.9), shade(m.base, 0.12));
        faceFill(c, v, subQuad(q, 0.42, 0.58, 0.45, 0.7), shade(m.base, 0.2), 0.6);
        const [x, y] = proj(v, ...subQuad(q, 0.1, 0.1, 0.3, 0.3)[0]);
        freckles(c, x, y - 8, 0.9 * v.ppm, 6, seed, YARD.rust, 7);
      },
      onTop: (q) => {
        faceFill(c, v, subQuad(q, 0.04, 0.96, 0.12, 0.88), shade(m.base, -0.45), 0.8);
        // the dry bottom: dust and a few leaves
        faceFill(c, v, subQuad(q, 0.08, 0.92, 0.55, 0.85), mix(shade(m.base, -0.3), YARD.sand, 0.25));
        for (let i = 0; i < 3; i++) {
          const [x, y] = proj(v, ...subQuad(q, 0.2 + i * 0.25, 0.2 + i * 0.25, 0.7, 0.7)[0]);
          c.drawPath(oval(x, y, 2.2, 1.2), fill(YARD.grass, 0.85));
        }
      },
    });
  };
  if (stage === 0) all();
  else {
    const [cx] = proj(v, 0.0, 0, 0);
    westOf(c, cx, -60, 30, seed, true, all);
  }
}

// ---------------------------------------------------------------------------
// The copper cylinder, certified empty (whole, shell)
// ---------------------------------------------------------------------------

export const CYLINDER_STAGES = ['whole', 'shell'] as const;

/** A copper hot-water cylinder standing (0.45 m across, 0.9 m), dull with a domed top, its "certified empty" tag. */
export function drawCylinderStage(c: SkCanvas, v: View3q, stage: number): void {
  groundShadow(c, v, 0.26, 0.24, 0, 0, 0.95);
  const r = 0.22;
  const h = 0.78;
  const [tx, ty] = cylinder(c, v, { r, h, color: TONE.no2, top: shade(TONE.no2, 0.12), line: LINE_W });
  // the dome on top
  const rx = r * v.ppm;
  const dome = builder().moveTo(tx - rx, ty).quadTo(tx - rx * 0.85, ty - 7, tx, ty - 7.5).quadTo(tx + rx * 0.85, ty - 7, tx + rx, ty).close().build();
  c.drawPath(dome, fill(shade(TONE.no2, 0.08)));
  c.drawPath(builder().moveTo(tx - rx * 0.65, ty - 3).quadTo(tx - rx * 0.35, ty - 6.5, tx + rx * 0.1, ty - 7).build(), stroke(TONE.no2Hi, 1.4));
  c.drawPath(dome, stroke(INK, LINE_W));
  // seams, verdigris, a sheen tick
  const [, yb] = proj(v, 0, 0, 0);
  c.drawPath(segment(tx - rx, ty + (yb - ty) * 0.45, tx + rx, ty + (yb - ty) * 0.45), stroke(shade(TONE.no2, -0.25), 0.9));
  c.drawPath(oval(tx + rx * 0.35, ty + (yb - ty) * 0.7, 3, 2), fill(TONE.verdigris, 0.85));
  copperTicks(c, tx - rx * 0.45, ty + (yb - ty) * 0.3, 4);
  // the bosses: brass fittings (whole) or their cut holes (shell)
  const bosses: [number, number][] = [
    [ty + (yb - ty) * 0.22, 1],
    [ty + (yb - ty) * 0.68, -1],
  ];
  for (const [y, side] of bosses) {
    const x = tx + side * rx * 0.25;
    if (stage === 0) {
      c.drawPath(rrect(x - 3, y - 3, 6, 6, 1.2), fill(TONE.brass));
      c.drawPath(rrect(x - 3, y - 3, 6, 6, 1.2), stroke(INK, 0.9));
      c.drawPath(oval(x, y, 1.6, 1.6), fill(TONE.brassLo));
    } else {
      c.drawPath(oval(x, y, 2.4, 2.4), fill(INK));
      c.drawPath(oval(x, y, 2.4, 2.4), stroke(TONE.no2Hi, 0.8));
    }
  }
  if (stage === 0) {
    c.drawPath(rrect(tx - 2.5, ty - 11, 5, 4.5, 1), fill(TONE.brass));
    c.drawPath(rrect(tx - 2.5, ty - 11, 5, 4.5, 1), stroke(INK, 0.9));
    paperTag(c, tx + rx + 2, ty + 8, 'empty', 10, tx + 2, ty - 8);
  } else {
    c.drawPath(oval(tx, ty - 8, 2.2, 1.4), fill(INK));
    paperTag(c, tx + rx + 2, ty + 8, 'empty', 10, tx + rx * 0.6, ty - 4);
  }
}

// ---------------------------------------------------------------------------
// Steel lying flat: field gate, railings, farm sheet, cladding, copper pipe bundle
// ---------------------------------------------------------------------------

export const HALF_STAGES = ['whole', 'half'] as const;

/** A five-bar galvanised field gate lying flat (3.0 x 1.1 m), propped a little at its hinge end. */
export function drawGateStage(c: SkCanvas, v: View3q, stage: number, seed = 10): void {
  const sh = () => groundShadow(c, v, 1.55, 0.6, 0, 0, 0.15);
  if (stage === 0) sh();
  else shadowWestOf(c, 0, sh);
  const L = 1.5;
  const D = 0.5;
  const zAt = (x: number) => 0.04 + (x < 0 ? (-x / L) * 0.12 : 0);
  const P = (x: number, y: number): V3 => [x, y, zAt(x)];
  const all = () => {
    const col = YARD.galvanised;
    const lt = YARD.galvanisedLight;
    // rails north to south
    for (let i = 0; i < 5; i++) {
      const y = -D + (i * 2 * D) / 4;
      tubeW(c, v, P(-L, y), P(L, y), 0.05, col, lt);
    }
    tubeW(c, v, P(-L, -D), P(-L, D), 0.08, col, lt);
    tubeW(c, v, P(L, -D), P(L, D), 0.06, col, lt);
    tubeW(c, v, P(-L, D), P(L * 0.1, -D), 0.045, col, lt);
    tubeW(c, v, P(-L * 0.45, -D), P(-L * 0.45, D), 0.04, col);
    // hinge eyes and the latch
    for (const y of [-D * 0.8, D * 0.8]) {
      const [x, yy] = proj(v, ...P(-L - 0.04, y));
      c.drawPath(oval(x - 2, yy, 2.6, 1.8), stroke(INK, 1.4));
    }
    const [lx, ly] = proj(v, ...P(L + 0.02, 0));
    c.drawPath(rrect(lx - 1, ly - 3, 4, 6, 1), fill(YARD.steelDark));
    const [fx, fy] = proj(v, ...P(0.4, 0.2));
    freckles(c, fx, fy - 4, 30, 8, seed, YARD.rust, 5);
  };
  if (stage === 0) all();
  else {
    const [cx] = proj(v, 0.0, 0, 0);
    westOf(c, cx, -60, 40, seed, false, all);
  }
}

/** A section of wrought railings lying flat (2.0 x 0.8 m): two rails, bars with spear tips, black paint chipped. */
export function drawRailingStage(c: SkCanvas, v: View3q, stage: number, seed = 11): void {
  const sh = () => groundShadow(c, v, 1.05, 0.48, 0, 0, 0.1);
  if (stage === 0) sh();
  else shadowWestOf(c, 0, sh);
  const L = 1.0;
  const D = 0.38;
  const col = '#3E4A44';
  const lt = '#66756C';
  const all = () => {
    for (let i = 0; i < 11; i++) {
      const x = -L * 0.95 + (i * 1.9 * L) / 10;
      tubeW(c, v, [x, D * 0.85, 0.03], [x, -D * 0.95, 0.03], 0.03, col);
      const [sx, sy] = proj(v, x, -D * 0.95, 0.03);
      c.drawPath(poly([sx - 2.4, sy + 1, sx, sy - 5, sx + 2.4, sy + 1]), fill(col));
      c.drawPath(poly([sx - 2.4, sy + 1, sx, sy - 5, sx + 2.4, sy + 1]), stroke(INK, 0.8));
    }
    for (const y of [-D * 0.55, D * 0.6]) tubeW(c, v, [-L, y, 0.05], [L, y, 0.05], 0.05, col, lt);
    // chipped paint: rust where it is bare
    const [fx, fy] = proj(v, -0.6, 0, 0.05);
    freckles(c, fx, fy - 4, 80, 10, seed, YARD.rustLight, 9);
  };
  if (stage === 0) all();
  else {
    const [cx] = proj(v, 0.0, 0, 0);
    westOf(c, cx, -60, 40, seed, false, all);
  }
}

/** A stack of corrugated farm sheet and tin (2.4 x 0.9 m): galvanised ribs, rust patches. */
export function drawSheetStage(c: SkCanvas, v: View3q, stage: number, seed = 12): void {
  boxShadow(c, v, 2.4, 0.92, 0, 0, 0.12);
  const n = stage === 0 ? 4 : 2;
  for (let i = 0; i < n; i++) {
    const z = 0.02 + i * 0.025;
    const dx = (hash01(seed, i) - 0.5) * 0.16;
    const dy = (hash01(seed, i, 2) - 0.5) * 0.1;
    const q: V3[] = [
      [-1.15 + dx, -0.42 + dy, z],
      [1.15 + dx, -0.45 + dy, z],
      [1.18 + dx, 0.42 + dy, z],
      [-1.12 + dx, 0.45 + dy, z],
    ];
    const col = i % 2 ? shade(YARD.galvanised, 0.05) : YARD.galvanised;
    // the near edge's thickness
    const [ax, ay] = proj(v, ...q[3]);
    const [bx, by] = proj(v, ...q[2]);
    c.drawPath(poly([ax, ay, bx, by, bx, by + 2.4, ax, ay + 2.4]), fill(shade(col, -0.3)));
    faceFill(c, v, q, col, LINE_W);
    for (let k = 1; k < 9; k++) {
      const [x0, y0] = proj(v, ...subQuad(q, 0, 1, k / 9, k / 9)[0]);
      const [x1, y1] = proj(v, ...subQuad(q, 0, 1, k / 9, k / 9)[1]);
      c.drawPath(segment(x0, y0, x1, y1), stroke(shade(col, k % 2 ? 0.3 : -0.18), 1.1));
    }
    const [rx, ry] = proj(v, ...subQuad(q, 0.15 + hash01(seed, i, 3) * 0.5, 0, 0.3, 0)[0]);
    c.drawPath(oval(rx + 10, ry, 14, 5), fill(YARD.rust, 0.5));
    c.drawPath(oval(rx + 24, ry + 7, 7, 3), fill(YARD.rustLight, 0.45));
  }
}

/** Profiled steel cladding sheets (2.4 x 0.8 m): painted sage, white backing at the edges, two sheets. */
export function drawCladding(c: SkCanvas, v: View3q, seed = 13): void {
  boxShadow(c, v, 2.4, 0.84, 0, 0, 0.1);
  const paint = mix(YARD.containerSage, '#9FB0A0', 0.3);
  for (let i = 0; i < 2; i++) {
    const z = 0.03 + i * 0.04;
    const dx = i ? 0.08 : -0.05;
    const q: V3[] = [
      [-1.15 + dx, -0.38, z],
      [1.15 + dx, -0.4, z],
      [1.17 + dx, 0.38, z],
      [-1.13 + dx, 0.4, z],
    ];
    const [ax, ay] = proj(v, ...q[3]);
    const [bx, by] = proj(v, ...q[2]);
    c.drawPath(poly([ax, ay, bx, by, bx, by + 3, ax, ay + 3]), fill(YARD.enamel));
    c.drawPath(poly([ax, ay, bx, by, bx, by + 3, ax, ay + 3]), stroke(INK, 0.8));
    faceFill(c, v, q, paint, LINE_W);
    for (let k = 0; k < 5; k++) {
      const t = 0.1 + k * 0.2;
      const r = subQuad(q, 0, 1, t, t + 0.07);
      faceFill(c, v, r, shade(paint, -0.22));
      const [x0, y0] = proj(v, ...r[0]);
      const [x1, y1] = proj(v, ...r[1]);
      c.drawPath(segment(x0, y0, x1, y1), stroke(shade(paint, 0.3), 0.8));
    }
    const [fx, fy] = proj(v, ...subQuad(q, 0.6, 0, 0.5, 0)[0]);
    freckles(c, fx, fy - 4, 30, 8, seed + i, YARD.rust, 5);
  }
}

/** A bundle of copper pipe lengths (2 m), tied with tape: dull No.2, verdigris spots, bright cut ends. */
export function drawPipeBundle(c: SkCanvas, v: View3q, seed = 14): void {
  boxShadow(c, v, 2.0, 0.34, 0, 0, 0.15);
  const rows: [number, number][] = [
    [-0.08, 0],
    [0, 0],
    [0.08, 0],
    [-0.04, 0.035],
    [0.04, 0.035],
    [0, 0.07],
  ];
  rows.forEach(([dy, z], i) => {
    const L = 0.95 + hash01(seed, i) * 0.06;
    const shift = (hash01(seed, i, 2) - 0.5) * 0.1;
    const [ax, ay] = proj(v, -L + shift, dy, z + 0.02);
    const [bx] = proj(v, L + shift, dy, z + 0.02);
    const h = 3.4;
    const r = rrect(ax, ay - h / 2, bx - ax, h, h / 2);
    c.drawPath(r, fill(TONE.no2));
    c.drawPath(segment(ax + 1, ay - 0.5, bx - 1, ay - 0.5), stroke(TONE.no2Hi, 0.8));
    c.drawPath(r, stroke(INK, 0.7));
    c.drawPath(oval(bx, ay, 1.2, 1.5), fill(YARD.copperSheen));
    c.drawPath(oval(bx, ay, 1.2, 1.5), stroke(INK, 0.6));
    c.drawPath(oval(ax + (bx - ax) * hash01(seed, i, 3), ay, 2.4, 1.1), fill(TONE.verdigris, 0.85));
  });
  for (const sx of [-0.6, 0.5]) {
    const [x, y] = proj(v, sx, 0.08, 0);
    const [, t] = proj(v, sx, 0, 0.11);
    c.drawPath(rrect(x - 2, t - 1, 4, y - t + 2, 1), fill(YARD.hivis));
    c.drawPath(rrect(x - 2, t - 1, 4, y - t + 2, 1), stroke(INK, 0.8));
  }
}

// ---------------------------------------------------------------------------
// Aluminium wheel (loose, tyre off)
// ---------------------------------------------------------------------------

/** One aluminium alloy wheel lying flat, tyre and weights off. */
export function drawWheelThing(c: SkCanvas, v: View3q): void {
  groundShadow(c, v, 0.3, 0.26, 0, 0, 0.2);
  const [x, y] = proj(v, 0, 0, 0.12);
  c.save();
  c.translate(x, y);
  alloyWheel(c, 0.52 * v.ppm);
  c.restore();
}

// ---------------------------------------------------------------------------
// Heavy steel: plough, beam, tank
// ---------------------------------------------------------------------------

/** A plough frame (1.8 x 0.9 m): a red-oxide frame with three worn bright mouldboards, dark steel. */
export function drawPloughStage(c: SkCanvas, v: View3q, stage: number, seed = 15): void {
  const sh = () => groundShadow(c, v, 0.95, 0.5, 0, 0, 0.6);
  if (stage === 0) sh();
  else shadowWestOf(c, proj(v, 0.1, 0, 0)[0], sh);
  const paint = mix(YARD.containerOxide, '#6B4A3E', 0.3);
  const all = () => {
    // the main beam (diagonal) and the headstock
    tubeW(c, v, [-0.85, -0.3, 0.55], [0.8, 0.25, 0.55], 0.09, paint, shade(paint, 0.3));
    tubeW(c, v, [-0.85, -0.3, 0.55], [-0.85, 0.3, 0.45], 0.08, paint, shade(paint, 0.3));
    tubeW(c, v, [-0.85, 0.3, 0.45], [-0.3, 0.32, 0.5], 0.06, paint);
    // three bodies: legs down to the mouldboards
    for (let i = 0; i < 3; i++) {
      const x = -0.45 + i * 0.5;
      const y = -0.16 + i * 0.17;
      tubeW(c, v, [x, y, 0.55], [x + 0.05, y + 0.02, 0.15], 0.06, TONE.steel);
      const [mx, my] = proj(v, x + 0.12, y + 0.08, 0.12);
      const mb = builder().moveTo(mx - 9, my - 6).quadTo(mx + 2, my - 10, mx + 10, my - 3).quadTo(mx + 6, my + 4, mx - 4, my + 5).quadTo(mx - 10, my + 2, mx - 9, my - 6).close().build();
      c.drawPath(mb, fill(TONE.steelCut));
      c.drawPath(builder().moveTo(mx - 7, my - 3).quadTo(mx + 1, my - 7, mx + 7, my - 2).build(), stroke('#FFFFFF', 1, 0.8));
      c.drawPath(mb, stroke(INK, 1));
      c.drawPath(poly([mx - 6, my + 4, mx + 2, my + 5, mx - 9, my + 8]), fill(TONE.steel));
      c.drawPath(poly([mx - 6, my + 4, mx + 2, my + 5, mx - 9, my + 8]), stroke(INK, 0.8));
    }
    // the hitch pins
    const [hx, hy] = proj(v, -0.92, 0, 0.45);
    c.drawPath(oval(hx, hy, 3, 2), fill(YARD.hivisDark));
    c.drawPath(oval(hx, hy, 3, 2), stroke(INK, 0.8));
    const [fx, fy] = proj(v, -0.2, 0, 0.55);
    freckles(c, fx, fy - 4, 30, 8, seed, YARD.rust, 6);
  };
  if (stage === 0) all();
  else {
    const [cx] = proj(v, 0.1, 0, 0);
    westOf(c, cx, -80, 40, seed, false, all);
  }
}

export const BEAM_STAGES = ['whole', 'cut1', 'cut2', 'cut3'] as const;

/**
 * A steel I-beam (drawn 6 m: the yard's beams are cut into 1.5 m HMS lengths) lying on two timber bearers,
 * dark mill scale and rust; each stage is 1.5 m shorter from the east, the torch-cut end bright.
 */
export function drawBeamStage(c: SkCanvas, v: View3q, stage: number, seed = 16): void {
  const L = 6;
  const keep = L - stage * 1.5;
  const x0 = -L / 2;
  const x1 = x0 + keep;
  const fw = 0.2;
  const hgt = 0.3;
  const z0 = 0.1;
  boxShadow(c, v, keep + 0.1, 0.5, x0 + keep / 2, 0, 0.4);
  // timber bearers
  for (const bx of [x0 + 0.6, x0 + 4.2]) if (bx < x1) box(c, v, { len: 0.18, wid: 0.5, h: 0.1, ox: bx, color: YARD.wood, line: 0.9 });
  // the bottom flange's front edge, the web (shadowed), the top flange
  box(c, v, { len: keep, wid: fw, h: 0.03, ox: x0 + keep / 2, z: z0, color: TONE.steel, line: 0.9 });
  box(c, v, { len: keep, wid: 0.02, h: hgt - 0.06, ox: x0 + keep / 2, z: z0 + 0.03, color: shade(TONE.steel, -0.2), line: 0.8 });
  box(c, v, {
    len: keep,
    wid: fw,
    h: 0.03,
    ox: x0 + keep / 2,
    z: z0 + hgt - 0.03,
    color: TONE.steel,
    top: TONE.steelTop,
    line: 0.9,
    onTop: (q) => {
      for (let i = 0; i < Math.floor(keep * 2); i++) {
        const [x, y] = proj(v, ...subQuad(q, (i + 0.3) / (keep * 2), 0, 0.5, 0)[0]);
        c.drawPath(oval(x + 4, y, 4 + hash01(seed, i) * 5, 1.4), fill(YARD.rust, 0.55));
      }
      // the yard's chalk marks every 1.5 m (where the torch will go)
      for (let k = 1; k < keep / 1.5; k++) {
        const [a, b] = proj(v, x0 + k * 1.5, -fw / 2, z0 + hgt);
        const [cc, d] = proj(v, x0 + k * 1.5, fw / 2, z0 + hgt);
        c.drawPath(segment(a, b, cc, d), stroke('#FFFFFF', 1.1, 0.85));
      }
    },
  });
  // the east end: the I section (bright where cut, dark where rolled)
  const [ex, ey] = proj(v, x1, 0, z0);
  const sh = hgt * v.ppm * v.lift;
  const sw = fw * v.ppm * v.tilt * 0.9;
  const f = 3;
  const I = poly([ex - 1, ey - sh, ex + 1, ey - sh - sw * 0.25, ex + 1, ey - sh + f, ex, ey - sh + f, ex, ey - f, ex + 1, ey - f, ex + 1, ey, ex - 1, ey + sw * 0.25]);
  c.drawPath(I, fill(stage === 0 ? TONE.steelTop : TONE.steelCut));
  c.drawPath(I, stroke(INK, 0.8));
  if (stage > 0) c.drawPath(segment(ex - 3, ey - sh + 1, ex - 3, ey - 1), stroke(mix(YARD.rust, '#2A1E18', 0.4), 1.2));
}

export const TANK_STAGES = ['whole', 'cut1', 'cut2'] as const;

/** A horizontal steel tank (2.4 x 1.1 m, certified empty) on two saddles: faded paint, a manhole, its tag. */
export function drawTankStage(c: SkCanvas, v: View3q, stage: number, seed = 17): void {
  const L = 1.2;
  const r = 0.5;
  const zc = r + 0.14;
  const x1 = stage === 0 ? L : stage === 1 ? L * 0.35 : -L * 0.3;
  groundShadow(c, v, (x1 + L) / 2 + 0.1, 0.6, (x1 - L) / 2, 0, 1.0);
  const paint = mix(YARD.containerSage, '#8E9A86', 0.35);
  // saddles
  for (const sx of [-L * 0.6, L * 0.6]) if (sx < x1 - 0.1) box(c, v, { len: 0.12, wid: 0.8, h: 0.3, ox: sx, color: TONE.steel, line: 0.9 });
  // the body: a cylinder along x, seen as a long band plus its top light
  const [ax, ay] = proj(v, -L, 0, zc);
  const [bx] = proj(v, x1, 0, zc);
  const R = r * v.ppm;
  const ry = R * 0.42;
  const bodyTop = ay - r * v.ppm * v.lift - ry * 0.2;
  const bodyBot = ay + r * v.ppm * v.lift * 0.9;
  const body = builder().moveTo(ax, bodyTop).lineTo(bx, bodyTop).lineTo(bx, bodyBot).lineTo(ax, bodyBot).close().build();
  c.drawPath(body, fill(paint));
  c.save();
  c.clipPath(body, ClipOp.Intersect, true);
  c.drawRect({ x: ax, y: bodyTop, width: bx - ax, height: (bodyBot - bodyTop) * 0.3 }, fill(shade(paint, 0.2)));
  c.drawRect({ x: ax, y: bodyBot - (bodyBot - bodyTop) * 0.3, width: bx - ax, height: (bodyBot - bodyTop) * 0.3 }, fill(shade(paint, -0.18)));
  // rust runs and a weld seam
  for (let i = 0; i < 5; i++) {
    const x = ax + (bx - ax) * (0.1 + 0.2 * i) + hash01(seed, i) * 6;
    c.drawPath(segment(x, bodyTop + 8, x + 1, bodyBot - 2), stroke(YARD.rust, 1.6, 0.55));
  }
  const [sx] = proj(v, 0, 0, 0);
  c.drawPath(segment(sx, bodyTop, sx, bodyBot), stroke(shade(paint, -0.3), 1));
  c.restore();
  c.drawPath(body, stroke(INK, LINE_W));
  // the west end cap (dished): a disc seen almost edge on
  const westEnd = discPath(v, [-L, 0, zc], [0, 1, 0], [0, 0, 1], r);
  c.drawPath(westEnd, fill(shade(paint, -0.1)));
  c.drawPath(westEnd, stroke(INK, LINE_W));
  // east: a dished end (whole) or the cut ring showing the dark inside
  const eastEnd = discPath(v, [x1, 0, zc], [0, 1, 0], [0, 0, 1], r);
  if (stage === 0) {
    c.drawPath(eastEnd, fill(shade(paint, 0.05)));
    c.drawPath(eastEnd, stroke(INK, LINE_W));
  } else {
    c.drawPath(eastEnd, fill(shade(TONE.steel, -0.1)));
    c.drawPath(eastEnd, stroke(INK, 2.4));
    c.drawPath(eastEnd, stroke(TONE.steelCut, 1.1));
  }
  // the manhole and a filler pipe on top
  const mhX = -L * 0.45;
  if (mhX < x1 - 0.2) {
    const [mx, my] = proj(v, mhX, 0, zc + r);
    c.drawPath(oval(mx, my, 7, 3.4), fill(shade(paint, 0.1)));
    c.drawPath(oval(mx, my, 7, 3.4), stroke(INK, 1));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      c.drawCircle(mx + Math.cos(a) * 5.4, my + Math.sin(a) * 2.5, 0.7, fill(YARD.steelDark));
    }
    paperTag(c, mx + 10, my + 9, 'empty', 8, mx + 6, my + 1);
  }
  if (L * 0.4 < x1 - 0.1) {
    cylinder(c, v, { r: 0.05, h: 0.14, ox: L * 0.4, oy: 0, z: zc + r - 0.02, color: TONE.steel, line: 0.9 });
  }
}

// ---------------------------------------------------------------------------
// The end-of-life car (stages: whole, wheels, open, roof, shell)
// ---------------------------------------------------------------------------

export const CAR_STAGES = ['whole', 'wheels', 'open', 'roof', 'shell'] as const;

/**
 * The papered, depolluted end-of-life car (a small hatchback; drawn at two thirds of its length like the
 * yard's vehicles: 2.8 x 1.4 m), facing east, standing on its alloy rims (tyres already off), in the true
 * tilt-0.7 oblique: a low body (its long south side, the bonnet and the boot ledge as short body-coloured
 * tops), on it a narrow glasshouse whose roof is a body-coloured trapezoid and whose glass is on its
 * sloped faces only (windscreen, south windows, rear hatch). Stages: whole (record tag behind the
 * windscreen); wheels off (on timber blocks); bonnet off, loom and converter out (the engine bay open);
 * roof cut off (the open shell from above, the seats inside the body's outline); the last body section
 * (the front half gone, a straight torch cut).
 */
export function drawCarStage(c: SkCanvas, v: View3q, stage: number, seed = 18): void {
  const paint = CAR_PAINTS[1];
  const L = 1.4;
  const Wd = 0.58;
  const zb = stage === 0 ? 0.18 : 0.24; // sill height: on rims, then on blocks
  const zW = zb + 0.5; // the waist (bonnet, boot ledge, sills of the glass)
  const zR = zW + 0.42; // the roof
  // the glasshouse: base x gb0..gb1 at the waist, roof x gr0..gr1, inset in y
  const gb0 = -L + 0.1;
  const gb1 = 0.5;
  const gr0 = -L + 0.42;
  const gr1 = -0.06;
  const yb = Wd - 0.04;
  const yr = Wd - 0.16;
  const sh = () => boxShadow(c, v, 2.8, 1.16, 0, 0, stage >= 3 ? 0.75 : 1.15);
  if (stage < 4) sh();
  else shadowWestOf(c, proj(v, 0.05, 0, 0)[0], sh);
  const body = shade(paint, -0.06);
  const all = () => {
    if (stage >= 1)
      for (const bx of [-0.85, 0.85]) box(c, v, { len: 0.22, wid: 0.3, h: zb, ox: bx, oy: Wd - 0.2, color: YARD.wood, line: 0.9 });
    // underbody in shade
    faceFill(c, v, [[-L, -Wd, zb], [L, -Wd, zb], [L, Wd, zb], [-L, Wd, zb]], shade(INK, 0.15));
    // ---- the lower body: the south side (rounded nose and tail), then its top (bonnet, boot ledge)
    const side: V3[] = [
      [-L + 0.04, Wd, zb],
      [L - 0.06, Wd, zb],
      [L, Wd, zb + 0.14],
      [L, Wd, zW - 0.18],
      [L - 0.1, Wd, zW - 0.1],
      [gb1, Wd, zW],
      [-L + 0.04, Wd, zW],
      [-L, Wd, zW - 0.06],
      [-L, Wd, zb + 0.1],
    ];
    const sideP = facePath(v, side);
    c.drawPath(sideP, fill(body));
    faceFill(c, v, [[-L + 0.04, Wd, zb], [L - 0.06, Wd, zb], [L - 0.02, Wd, zb + 0.09], [-L + 0.02, Wd, zb + 0.09]], shade(paint, -0.32));
    const [c0x, c0y] = proj(v, -L + 0.05, Wd, zb + 0.33);
    const [c1x, c1y] = proj(v, L - 0.05, Wd, zb + 0.35);
    c.drawPath(segment(c0x, c0y, c1x, c1y), stroke(shade(paint, 0.32), 1));
    for (const dx of [-0.34, 0.4]) {
      const [x0, y0] = proj(v, dx, Wd, zb + 0.08);
      const [, y1] = proj(v, dx, Wd, zW);
      c.drawPath(segment(x0, y0, x0, y1), stroke(shade(paint, -0.35), 0.9));
    }
    const [hx, hy] = proj(v, 0.2, Wd, zb + 0.4);
    c.drawPath(rrect(hx - 4, hy - 1, 7, 2.2, 1), fill(shade(paint, -0.4)));
    for (const ax of [-0.82, 0.86]) c.drawPath(discPath(v, [ax, Wd + 0.01, zb + 0.04], [1, 0, 0], [0, 0, 1], 0.28), fill(shade(INK, 0.1)));
    c.drawPath(sideP, stroke(INK, LINE_W));
    const [rx, ry] = proj(v, -1.2, Wd, zb + 0.14);
    freckles(c, rx, ry - 4, 28, 5, seed, YARD.rust, 6);
    if (stage === 0)
      for (const ax of [-0.82, 0.86]) {
        const ctr: V3 = [ax, Wd + 0.03, zb + 0.04];
        c.drawPath(discPath(v, ctr, [1, 0, 0], [0, 0, 1], 0.22), fill(TONE.alu));
        c.drawPath(discPath(v, ctr, [1, 0, 0], [0, 0, 1], 0.22), stroke(INK, 1));
        c.drawPath(discPath(v, ctr, [1, 0, 0], [0, 0, 1], 0.17), fill(shade(TONE.aluLo, -0.2)));
        const [wx, wy] = proj(v, ...ctr);
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
          c.drawPath(segment(wx, wy, wx + Math.cos(a) * 6.5, wy + Math.sin(a) * 6.2), stroke(TONE.alu, 2));
        }
        c.drawCircle(wx, wy, 1.8, fill(TONE.aluMid));
      }
    // the whole top of the lower body (one face): the bonnet east, the boot ledge west, body coloured
    // the top of the lower body: the boot ledge west of the glasshouse, level; the bonnet east of it,
    // falling 0.1 m to the nose (so it reads as a bonnet, not a lid)
    const zN = zW - 0.1;
    const topCol = shade(paint, 0.16);
    faceFill(c, v, [[-L + 0.04, -Wd, zW], [gb1, -Wd, zW], [gb1, Wd, zW], [-L + 0.04, Wd, zW]], topCol, LINE_W);
    const bonnet: V3[] = [
      [gb1, -Wd, zW],
      [L - 0.1, -Wd + 0.06, zN],
      [L - 0.1, Wd - 0.06, zN],
      [gb1, Wd, zW],
    ];
    faceFill(c, v, bonnet, shade(paint, 0.08), LINE_W);
    // the nose: a grille strip under the bonnet's front edge
    const [n0x, n0y] = proj(v, L - 0.1, Wd - 0.06, zN);
    c.drawPath(rrect(n0x - 3, n0y, 4, 6, 1), fill(shade(INK, 0.15)));
    // the bonnet's shut line and its sheen
    const [s0x, s0y] = proj(v, gb1 + 0.04, -Wd + 0.06, zW);
    const [s1x, s1y] = proj(v, gb1 + 0.04, Wd - 0.06, zW);
    c.drawPath(segment(s0x, s0y, s1x, s1y), stroke(shade(paint, -0.25), 0.9));
    if (stage < 2) {
      const [bx0, by0] = proj(v, 0.7, -0.3, zW);
      const [bx1, by1] = proj(v, 1.15, 0.2, zW);
      c.drawPath(segment(bx0, by0, bx1, by1), stroke('#FFFFFF', 1.1, 0.45));
    } else {
      // the bonnet is off: the engine bay, dark, the block; the loom and the converter out
      const bay: V3[] = [
        [gb1 + 0.08, -Wd + 0.1, zW],
        [L - 0.16, -Wd + 0.1, zW],
        [L - 0.16, Wd - 0.1, zW],
        [gb1 + 0.08, Wd - 0.1, zW],
      ];
      faceFill(c, v, bay, shade(INK, 0.22), 1);
      box(c, v, { len: 0.4, wid: 0.62, h: 0.12, ox: 0.92, oy: -0.05, z: zW - 0.1, color: YARD.steelDark, line: 0.9 });
      const [lx, ly] = proj(v, 1.2, 0.4, zW);
      c.drawCircle(lx, ly, 2.2, fill(YARD.galvanised));
      c.drawCircle(lx, ly, 2.2, stroke(INK, 0.7));
    }
    if (stage < 3) {
      // ---- the glasshouse: rear hatch (sloped, west), the south windows, the windscreen (sloped, east), the roof
      const hatch: V3[] = [
        [gb0, -yb, zW],
        [gr0, -yr, zR],
        [gr0, yr, zR],
        [gb0, yb, zW],
      ];
      faceFill(c, v, hatch, shade(YARD.glassDark, -0.3), LINE_W);
      const south: V3[] = [
        [gb0, yb, zW],
        [gb1, yb, zW],
        [gr1, yr, zR],
        [gr0, yr, zR],
      ];
      faceFill(c, v, south, shade(paint, -0.2), LINE_W);
      // the side glass inset in the south face, split by the B pillar
      const inset = (q: V3[], s0: number, s1: number) => subQuad(q, s0, s1, 0.1, 0.9);
      faceFill(c, v, inset(south, 0.04, 0.5), shade(YARD.glassDark, -0.15), 0.8);
      faceFill(c, v, inset(south, 0.56, 0.95), shade(YARD.glassDark, -0.15), 0.8);
      const [gx0, gy0] = proj(v, ...subQuad(south, 0.62, 0.62, 0.3, 0.3)[0]);
      c.drawPath(segment(gx0, gy0 + 2, gx0 + 6, gy0 - 5), stroke('#FFFFFF', 1.1, 0.55));
      const ws: V3[] = [
        [gb1, -yb, zW],
        [gb1, yb, zW],
        [gr1, yr, zR],
        [gr1, -yr, zR],
      ];
      faceFill(c, v, ws, YARD.glassDark, LINE_W);
      faceFill(c, v, subQuad(ws, 0, 1, 0.82, 1), shade(YARD.glassDark, -0.2));
      const [wx0, wy0] = proj(v, ...subQuad(ws, 0.3, 0.3, 0.3, 0.3)[0]);
      c.drawPath(segment(wx0 - 3, wy0 + 3, wx0 + 6, wy0 - 4), stroke('#FFFFFF', 1.2, 0.7));
      if (stage < 2) {
        const [tx, ty] = proj(v, ...subQuad(ws, 0.78, 0.78, 0.45, 0.45)[0]);
        paperTag(c, tx, ty, 'record', -14);
      }
      const roof: V3[] = [
        [gr0, -yr, zR],
        [gr1, -yr, zR],
        [gr1, yr, zR],
        [gr0, yr, zR],
      ];
      faceFill(c, v, roof, shade(paint, 0.24), LINE_W);
      const [r0x, r0y] = proj(v, gr0 + 0.08, yr - 0.08, zR);
      const [r1x, r1y] = proj(v, gr1 - 0.08, yr - 0.08, zR);
      c.drawPath(segment(r0x, r0y, r1x, r1y), stroke('#FFFFFF', 1.2, 0.45));
    } else {
      // the roof cut off at the waist: the open shell from above, the seats and the dash inside the outline
      const tub: V3[] = [
        [gb0 + 0.02, -yb, zW],
        [gb1, -yb, zW],
        [gb1, yb, zW],
        [gb0 + 0.02, yb, zW],
      ];
      faceFill(c, v, tub, shade(INK, 0.3), LINE_W);
      const seat = '#5A5F68';
      // the rear bench and the two front seats: cushions with their backs, all below the waist line
      box(c, v, { len: 0.34, wid: 0.86, h: 0.1, ox: -0.86, oy: 0, z: zW - 0.12, color: seat, line: 0.9 });
      box(c, v, { len: 0.08, wid: 0.86, h: 0.12, ox: -1.06, oy: 0, z: zW - 0.06, color: seat, line: 0.9 });
      for (const sy of [-0.22, 0.22]) {
        box(c, v, { len: 0.3, wid: 0.34, h: 0.1, ox: -0.12, oy: sy, z: zW - 0.12, color: seat, line: 0.9 });
        box(c, v, { len: 0.08, wid: 0.32, h: 0.14, ox: -0.3, oy: sy, z: zW - 0.06, color: seat, line: 0.9 });
      }
      box(c, v, { len: 0.12, wid: 0.96, h: 0.06, ox: gb1 - 0.1, z: zW - 0.04, color: '#3A3E44', line: 0.9 });
      // the cut pillar stubs, bright steel
      for (const [px, py] of [[gb0 + 0.04, yb], [-0.42, yb], [gb1 - 0.03, yb], [gb1 - 0.03, -yb]] as const) {
        const [x, y] = proj(v, px, py, zW);
        c.drawPath(rrect(x - 2, y - 4, 4, 5, 1), fill(TONE.steelCut));
        c.drawPath(rrect(x - 2, y - 4, 4, 5, 1), stroke(INK, 0.8));
      }
    }
    // lamps on the south corners: front white (gone once the bonnet is off), rear red
    const [fx, fy] = proj(v, L - 0.02, Wd, zW - 0.13);
    c.drawPath(rrect(fx - 6, fy - 2, 6, 4, 1), fill(stage < 2 ? '#E9ECEF' : INK));
    c.drawPath(rrect(fx - 6, fy - 2, 6, 4, 1), stroke(INK, 0.7));
    const [qx, qy] = proj(v, -L + 0.02, Wd, zW - 0.13);
    c.drawPath(rrect(qx, qy - 2, 5, 4, 1), fill('#9C3A33'));
    c.drawPath(rrect(qx, qy - 2, 5, 4, 1), stroke(INK, 0.7));
  };
  if (stage < 4) all();
  else {
    const [cx] = proj(v, 0.05, 0, 0);
    westOf(c, cx, -90, 50, seed, false, all);
  }
}
