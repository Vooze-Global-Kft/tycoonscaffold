/**
 * The things a yard takes in and gives out (yard-style.md "Pieces, stacks and loads"), each anchored at
 * its footprint centre, drawn at the view's scale (true size: a washing machine is 0.6 x 0.6 x 0.85 m).
 * Each material shows its sheen mark so it reads without colour: light iron rust freckles, cast iron
 * dots, copper paired ticks, brass a four-point glint, aluminium a long stripe.
 */
import { ClipOp, FillType, type SkCanvas } from '@shopify/react-native-skia';
import { LINE_W, METAL, YARD, coolingColour, mix, shade } from './palette';
import {
  blob as blobPath,
  box,
  boxShadow,
  builder,
  discPath,
  faceFill,
  facePath,
  fill,
  freckles,
  glint,
  groundShadow,
  hash01,
  oval,
  poly,
  proj,
  segment,
  stroke,
  subQuad,
  ticks,
  type V3,
  type View3q,
} from './pen';

const INK = YARD.ink;

// ---------------------------------------------------------------------------
// The washing machine: whole, half stripped, pieces
// ---------------------------------------------------------------------------

export type WasherState = 'whole' | 'stripped' | 'pieces';

export function drawWasher(c: SkCanvas, v: View3q, state: WasherState, seed = 1): void {
  if (state === 'pieces') return washerPieces(c, v, seed);
  boxShadow(c, v, 0.66, 0.62);
  if (state === 'whole') {
    box(c, v, {
      len: 0.6,
      wid: 0.6,
      h: 0.85,
      color: YARD.enamel,
      front: shade(YARD.enamel, -0.06),
      bevel: true,
      onFace: (q, n) => {
        if (n[1] < 0.9) return;
        // control strip, the door ring, the glass, a rust streak under the door
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
      },
      onTop: (q) => {
        const b = q[0];
        void b;
        const [x0, y0] = proj(v, -0.22, -0.18, 0.85);
        freckles(c, x0 + 4, y0 + 2, 0.36 * v.ppm, 0.24 * v.ppm * v.tilt, seed, YARD.rust, 3);
      },
    });
    return;
  }
  // Half stripped: the frame's back and west panel stay; the top and the front are off and lean
  // against it; the drum, the motor and the concrete counterweight show.
  box(c, v, { len: 0.6, wid: 0.06, h: 0.85, oy: -0.27, color: YARD.enamel, line: LINE_W });
  box(c, v, { len: 0.06, wid: 0.54, h: 0.85, ox: -0.27, oy: 0.03, color: YARD.enamel, line: LINE_W });
  // the counterweight (concrete) on the floor plate
  box(c, v, { len: 0.44, wid: 0.18, h: 0.16, ox: 0.04, oy: 0.14, z: 0.03, color: '#B4B0A6', line: 1 });
  // the drum, lying (axis south): a disc of perforated stainless
  const dc: V3 = [0.04, 0.12, 0.5];
  c.drawPath(discPath(v, [dc[0], dc[1] - 0.25, dc[2]], [1, 0, 0], [0, 0, 1], 0.24), fill(shade(YARD.galvanised, -0.2)));
  c.drawPath(discPath(v, dc, [1, 0, 0], [0, 0, 1], 0.24), fill(YARD.galvanisedLight));
  c.drawPath(discPath(v, dc, [1, 0, 0], [0, 0, 1], 0.24), stroke(INK, LINE_W));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const [hx, hy] = proj(v, dc[0] + Math.cos(a) * 0.15, dc[1], dc[2] + Math.sin(a) * 0.15);
    c.drawCircle(hx, hy, 1.1, fill(YARD.steelDark));
  }
  c.drawPath(discPath(v, dc, [1, 0, 0], [0, 0, 1], 0.06), fill(YARD.steelDark));
  // the motor under the drum, its copper winding showing
  motor(c, v, 0.12, 0.2, 0.06);
  // the top panel leaning on the east side
  const lean = (ox: number): V3[] => [
    [ox, 0.34, 0],
    [ox, -0.26, 0],
    [ox + 0.16, -0.26, 0.6],
    [ox + 0.16, 0.34, 0.6],
  ];
  const lp = lean(0.36);
  faceFill(c, v, [lp[1], lp[0], lp[3], lp[2]], shade(YARD.enamel, -0.12), LINE_W);
  const [fx, fy] = proj(v, 0.42, 0.25, 0.25);
  freckles(c, fx - 3, fy - 8, 7, 12, seed + 3, YARD.rust, 3);
}

function motor(c: SkCanvas, v: View3q, ox: number, oy: number, z: number): void {
  // An electric motor lying on its side (axis east-west): a dark drum with a copper winding band.
  const p = (x: number, zz: number) => proj(v, ox + x, oy, z + zz);
  const r = 0.1;
  const [ax, ay] = p(-0.14, r);
  const [bx, by] = p(0.14, r);
  const rp = r * v.ppm * v.lift;
  const body = builder().addRRect({ rect: { x: ax, y: ay - rp, width: bx - ax, height: rp * 2 }, rx: rp * 0.5, ry: rp * 0.5 }).build();
  c.drawPath(body, fill(YARD.steelDark));
  c.drawPath(body, stroke(INK, LINE_W));
  c.drawRect({ x: ax + (bx - ax) * 0.38, y: ay - rp + 1, width: (bx - ax) * 0.26, height: rp * 2 - 2 }, fill(YARD.copper));
  ticks(c, ax + (bx - ax) * 0.5, ay - rp * 0.3, 3.6);
  c.drawRect({ x: ax + (bx - ax) * 0.38, y: ay - rp + 1, width: (bx - ax) * 0.26, height: rp * 2 - 2 }, stroke(INK, 0.9));
  c.drawPath(segment(bx, by, bx + 4, by), stroke(INK, 2.2));
}

function washerPieces(c: SkCanvas, v: View3q, seed: number): void {
  groundShadow(c, v, 0.55, 0.45);
  // three side panels lying flat, slightly turned
  const panels: [number, number, number][] = [
    [-0.22, -0.12, 0.25],
    [0.2, -0.16, -0.3],
    [-0.05, 0.12, 0.08],
  ];
  panels.forEach(([x, y, h], i) => {
    box(c, v, {
      len: 0.56,
      wid: 0.4,
      h: 0.03,
      ox: x,
      oy: y,
      z: i * 0.03,
      heading: h,
      color: YARD.enamel,
      line: LINE_W,
      onTop: (q) => {
        const [x0, y0] = proj(v, ...q[0]);
        freckles(c, x0 - 14, y0 - 2, 12, 6, seed + i, YARD.rust, 3);
      },
    });
  });
  motor(c, v, 0.28, 0.24, 0);
  box(c, v, { len: 0.36, wid: 0.16, h: 0.14, ox: -0.3, oy: 0.26, color: '#B4B0A6', line: 1 });
}

// ---------------------------------------------------------------------------
// Coils: insulated cable in, bare bright copper out
// ---------------------------------------------------------------------------

/** A coil lying flat: outer radius R, hole r, height h; `kind` decides the look. */
export function drawCoil(c: SkCanvas, v: View3q, kind: 'cable' | 'bright', R = 0.42, r = 0.17, h = 0.16, ox = 0, oy = 0, shadowToo = true): void {
  if (shadowToo) groundShadow(c, v, R * 1.05, R * 1.02, ox, oy);
  const base = kind === 'cable' ? YARD.pvc : YARD.copper;
  const light = kind === 'cable' ? YARD.pvcGrey : YARD.copperLight;
  const [cx, cy0] = proj(v, ox, oy, 0);
  const [, cy1] = proj(v, ox, oy, h);
  const RX = R * v.ppm;
  const RY = R * v.ppm * v.tilt;
  const rx = r * v.ppm;
  const ry = r * v.ppm * v.tilt;
  // outer band (front half)
  const band = builder()
    .moveTo(cx - RX, cy1)
    .lineTo(cx - RX, cy0)
    .addArc({ x: cx - RX, y: cy0 - RY, width: RX * 2, height: RY * 2 }, 180, -180)
    .lineTo(cx + RX, cy1)
    .close()
    .build();
  c.drawPath(band, fill(shade(base, -0.12)));
  // turns showing on the band
  for (let i = 1; i < 4; i++) {
    const yy = cy1 + ((cy0 - cy1) * i) / 4;
    c.drawPath(builder().addArc({ x: cx - RX, y: yy - RY, width: RX * 2, height: RY * 2 }, 10, 160).build(), stroke(shade(base, kind === 'cable' ? 0.25 : 0.3), 1));
  }
  c.drawPath(band, stroke(INK, LINE_W));
  // top ring: separate turns of wire with dark gaps between (cable: mixed jackets; bright: copper)
  const ring = builder()
    .setFillType(FillType.EvenOdd)
    .addOval({ x: cx - RX, y: cy1 - RY, width: RX * 2, height: RY * 2 })
    .addOval({ x: cx - rx, y: cy1 - ry, width: rx * 2, height: ry * 2 })
    .build();
  c.drawPath(ring, fill(shade(base, -0.45)));
  const turns = kind === 'cable' ? 5 : 6;
  const jackets = ['#8D9399', YARD.pvc, '#8D9399', '#6D7277', YARD.pvc, '#8D9399'];
  const wire = ((R - r) / turns) * v.ppm * 0.78;
  for (let i = 0; i < turns; i++) {
    const k = r + ((R - r) * (i + 0.5)) / turns;
    const col = kind === 'cable' ? jackets[i % jackets.length] : i % 2 ? YARD.copperLight : shade(YARD.copper, 0.12);
    c.drawPath(oval(cx, cy1, k * v.ppm, k * v.ppm * v.tilt), stroke(col, wire));
    c.drawPath(builder().addArc({ x: cx - k * v.ppm, y: cy1 - k * v.ppm * v.tilt - wire * 0.25, width: k * v.ppm * 2, height: k * v.ppm * v.tilt * 2 }, 200, 110).build(), stroke(shade(col, 0.35), Math.max(0.8, wire * 0.3)));
  }
  c.drawPath(ring, stroke(INK, LINE_W));
  // the hole shows the coil's inner wall and the ground below
  c.drawPath(oval(cx, cy1, rx, ry), fill(shade(base, -0.35)));
  c.drawPath(oval(cx, cy1 + (cy0 - cy1) * 0.6, rx * 0.86, ry * 0.7), fill(YARD.concreteDark));
  c.drawPath(oval(cx, cy1, rx, ry), stroke(INK, 1));
  if (kind === 'cable') {
    // the cut end: copper cores showing in the jacket
    // the loose end leaves the coil and shows its copper cores
    const [sx0, sy0] = proj(v, ox + R * 0.62, oy + R * 0.62, h);
    const [ex, ey] = proj(v, ox + R * 1.25, oy + R * 0.95, 0.03);
    const tail = builder().moveTo(sx0, sy0).quadTo(ex + 2, sy0 + 2, ex, ey).build();
    c.drawPath(tail, stroke(INK, wire + 2));
    c.drawPath(tail, stroke(YARD.pvcGrey, wire));
    c.drawPath(oval(ex, ey, 4.2, 3), fill(YARD.pvc));
    c.drawPath(oval(ex, ey, 4.2, 3), stroke(INK, 1));
    for (const [dx, dy] of [[-1.6, 0], [1.6, 0], [0, -1.3]]) c.drawCircle(ex + dx, ey + dy, 1.05, fill(YARD.copperLight));
  } else {
    // a tie wire and the sheen marks
    const [tx, ty] = proj(v, ox - R * 0.15, oy + R * 0.98, 0);
    c.drawPath(segment(tx, ty, tx, ty - (cy0 - cy1) - 2), stroke(YARD.galvanised, 1.6));
    ticks(c, cx - RX * 0.45, cy1 + (cy0 - cy1) * 0.55, 6);
    ticks(c, cx + RX * 0.45, cy1 - RY * 0.55, 5);
  }
}

/**
 * A cable drum standing on its flanges (axis north-south): a wooden front flange with bolt holes and a
 * centre hole, insulated cable wound behind it showing on top, the back flange's rim above. r is the
 * flange radius; the drum is `depth` metres long. Unmistakably cable at any size (a coil lying flat
 * reads as a tyre).
 */
export function drawCableDrum(c: SkCanvas, v: View3q, r = 0.5, depth = 0.55, seed = 1): void {
  boxShadow(c, v, r * 2 + 0.05, depth + 0.1);
  const yb = -depth / 2;
  const yf = depth / 2;
  const u: V3 = [1, 0, 0];
  const w: V3 = [0, 0, 1];
  // back flange
  c.drawPath(discPath(v, [0, yb, r], u, w, r), fill(shade(YARD.wood, -0.25)));
  c.drawPath(discPath(v, [0, yb, r], u, w, r), stroke(INK, LINE_W));
  // the wound cable: a cylinder between the flanges, its top visible
  const rc = r * 0.82;
  const [x0, yTopB] = proj(v, 0, yb, r + rc);
  const [, yTopF] = proj(v, 0, yf, r + rc);
  const cw = rc * v.ppm;
  const band = builder()
    .moveTo(x0 - cw, (yTopB + yTopF) / 2 + cw * 0.5)
    .lineTo(x0 - cw * 0.92, yTopB + cw * 0.4)
    .quadTo(x0, yTopB - 2, x0 + cw * 0.92, yTopB + cw * 0.4)
    .lineTo(x0 + cw, (yTopB + yTopF) / 2 + cw * 0.5)
    .lineTo(x0, yTopF + cw)
    .close()
    .build();
  c.drawPath(band, fill(YARD.pvc));
  c.save();
  c.clipPath(band, ClipOp.Intersect, true);
  for (let i = 0; i < 6; i++) {
    const yy = yTopB + ((yTopF - yTopB) * (i + 0.5)) / 6;
    c.drawPath(builder().addArc({ x: x0 - cw, y: yy - 3, width: cw * 2, height: cw * 1.4 }, 200, 140).build(), stroke(i % 2 ? '#8D9399' : '#5C6268', 2.2));
  }
  c.restore();
  c.drawPath(band, stroke(INK, LINE_W));
  // front flange: wood with grain, bolts and the centre hole
  const ctr: V3 = [0, yf, r];
  c.drawPath(discPath(v, ctr, u, w, r), fill(YARD.wood));
  const [cx, cy] = proj(v, ...ctr);
  for (let i = 0; i < 4; i++) c.drawPath(segment(cx - r * v.ppm * 0.9, cy - r * v.ppm * v.lift * (0.6 - i * 0.4), cx + r * v.ppm * 0.9, cy - r * v.ppm * v.lift * (0.6 - i * 0.4)), stroke(shade(YARD.wood, -0.15), 1, 0.7));
  c.drawPath(discPath(v, ctr, u, w, r), stroke(INK, LINE_W));
  c.drawPath(discPath(v, ctr, u, w, r * 0.82), stroke(shade(YARD.wood, -0.3), 1));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + hash01(seed) * 0.5;
    const [bx, by] = proj(v, Math.cos(a) * r * 0.62, yf, r + Math.sin(a) * r * 0.62);
    c.drawCircle(bx, by, 1.2, fill(YARD.steelDark));
  }
  c.drawPath(discPath(v, ctr, u, w, r * 0.16), fill(INK));
  // the loose end hanging down the front, cut to show copper
  const [ex, ey] = proj(v, r * 0.75, yf + 0.05, r * 1.7);
  const [gx, gy] = proj(v, r * 1.1, yf + 0.25, 0.04);
  const tail = builder().moveTo(ex, ey).cubicTo(ex + 8, ey + 8, gx - 4, gy - 14, gx, gy).build();
  c.drawPath(tail, stroke(INK, 4.6));
  c.drawPath(tail, stroke('#8D9399', 2.8));
  c.drawCircle(gx, gy, 2.2, fill(YARD.copperLight));
  c.drawCircle(gx, gy, 2.2, stroke(INK, 0.8));
}

/** A bundle of bare bright copper: two bright coils, one on the other. */
export function drawBrightCopper(c: SkCanvas, v: View3q): void {
  groundShadow(c, v, 0.36, 0.34);
  drawCoil(c, v, 'bright', 0.3, 0.13, 0.12, 0, 0, false);
  c.save();
  c.translate(0, -0.12 * v.ppm * v.lift);
  drawCoil(c, v, 'bright', 0.25, 0.11, 0.11, 0.03, -0.02, false);
  c.restore();
}

// ---------------------------------------------------------------------------
// Brass taps in a crate; the cast-iron radiator
// ---------------------------------------------------------------------------

/** One brass tap pictogram (points, centred), the size of `s`. */
export function tapGlyph(c: SkCanvas, x: number, y: number, s: number, turn = 0): void {
  c.save();
  c.translate(x, y);
  c.rotate(turn, 0, 0);
  const k = s / 10;
  const body = poly([-4 * k, -1 * k, 3 * k, -1 * k, 3 * k, 1 * k, 5 * k, 1 * k, 5.5 * k, 4 * k, 3.2 * k, 4 * k, 3 * k, 2.6 * k, -4 * k, 2.6 * k]);
  c.drawPath(body, fill(YARD.brass));
  c.drawPath(body, stroke(INK, 0.9));
  c.drawPath(segment(-0.5 * k, -1 * k, -0.5 * k, -4 * k), stroke(INK, 2.2 * k + 0.9));
  c.drawPath(segment(-0.5 * k, -1 * k, -0.5 * k, -4 * k), stroke(YARD.brass, 2.2 * k));
  c.drawPath(segment(-3.2 * k, -4.4 * k, 2.2 * k, -4.4 * k), stroke(INK, 2.2 * k + 0.9));
  c.drawPath(segment(-3.2 * k, -4.4 * k, 2.2 * k, -4.4 * k), stroke(YARD.brassDark, 2.2 * k));
  glint(c, 1.6 * k, 0.4 * k, 1.6 * k + 0.6);
  c.restore();
}

export function drawTapCrate(c: SkCanvas, v: View3q): void {
  boxShadow(c, v, 0.62, 0.44);
  box(c, v, {
    len: 0.6,
    wid: 0.4,
    h: 0.3,
    color: YARD.crateBlue,
    onFace: (q, n) => {
      if (n[1] < 0.9) return;
      // the handle slot and ribs of a plastic crate
      faceFill(c, v, subQuad(q, 0.36, 0.64, 0.66, 0.84), shade(YARD.crateBlue, -0.5), 0.8);
      for (const s of [0.18, 0.82]) faceFill(c, v, subQuad(q, s - 0.02, s + 0.02, 0.1, 0.55), shade(YARD.crateBlue, -0.3));
    },
    onTop: (q) => {
      // the taps heaped above the rim
      const pts: [number, number, number][] = [
        [0.2, 0.25, 0.4],
        [0.45, 0.3, -0.5],
        [0.72, 0.28, 0.9],
        [0.3, 0.62, -0.2],
        [0.58, 0.65, 0.3],
        [0.82, 0.6, -0.9],
        [0.12, 0.7, 1.4],
      ];
      faceFill(c, v, subQuad(q, 0.06, 0.94, 0.08, 0.92), shade(YARD.crateBlue, -0.45));
      pts.forEach(([s, t, turn]) => {
        const [x, y] = proj(v, ...subQuad(q, s, s, t, t)[0]);
        tapGlyph(c, x, y - 2, 9, turn * 30);
      });
    },
  });
}

export function drawRadiator(c: SkCanvas, v: View3q, seed = 2): void {
  boxShadow(c, v, 1.0, 0.26);
  const m = METAL.cast_iron;
  const cols = 9;
  const len = 0.96;
  // feet
  for (const s of [-0.36, 0.36]) box(c, v, { len: 0.06, wid: 0.2, h: 0.08, ox: s, color: m.dark, line: 1 });
  // columns, each a rounded slab; west to east
  for (let i = 0; i < cols; i++) {
    const x = -len / 2 + (len / cols) * (i + 0.5);
    const [x0, yb] = proj(v, x, 0.09, 0.08);
    const [, yt] = proj(v, x, 0.09, 0.62);
    const w = (len / cols) * v.ppm - 1.2;
    const col = builder().addRRect({ rect: { x: x0 - w / 2, y: yt, width: w, height: yb - yt }, rx: w * 0.45, ry: w * 0.45 }).build();
    c.drawPath(col, fill(i % 2 ? m.base : shade(m.base, 0.06)));
    c.drawPath(col, stroke(INK, 1));
    // the top of each column and its dotted cast texture
    const [, ytt] = proj(v, x, -0.02, 0.62);
    c.drawPath(oval(x0, (yt + ytt) / 2 + 1, w / 2, (yt - ytt) / 2 + 1.6), fill(m.light));
    c.drawPath(oval(x0, (yt + ytt) / 2 + 1, w / 2, (yt - ytt) / 2 + 1.6), stroke(INK, 0.9));
    for (let k = 0; k < 3; k++) c.drawCircle(x0 + (hash01(seed, i, k) - 0.5) * w * 0.5, yt + (yb - yt) * (0.25 + 0.25 * k), 0.75, fill(m.light));
  }
  // the bushing at the end, a little rust
  const [ex, ey] = proj(v, len / 2 + 0.03, 0.09, 0.52);
  c.drawPath(oval(ex, ey, 2.6, 2.6), fill(YARD.brass));
  c.drawPath(oval(ex, ey, 2.6, 2.6), stroke(INK, 0.9));
  const [fx, fy] = proj(v, -0.3, 0.09, 0.3);
  freckles(c, fx, fy, 20, 8, seed, YARD.rust, 4);
}

// ---------------------------------------------------------------------------
// Ingots
// ---------------------------------------------------------------------------

/**
 * A cast ingot (the classic trapezoid bar, wider at the bottom), length along x, at (ox, oy, z).
 * `t` seconds since the pour: 0 glowing, 3 and after its metal's colour (palette coolingColour).
 */
export function drawIngot(c: SkCanvas, v: View3q, metal: string, t = 99, o: { ox?: number; oy?: number; z?: number; len?: number; shadow?: boolean } = {}): void {
  const ox = o.ox ?? 0;
  const oy = o.oy ?? 0;
  const z = o.z ?? 0;
  const L = (o.len ?? 0.46) / 2;
  const W = 0.1;
  const H = 0.1;
  const inset = 0.045;
  if (o.shadow !== false && z === 0) groundShadow(c, v, L + 0.04, W + 0.05, ox, oy);
  const col = coolingColour(metal, t);
  const hot = t < 3;
  const P = (x: number, y: number, zz: number): V3 => [ox + x, oy + y, z + zz];
  const front: V3[] = [P(L, W, 0), P(-L, W, 0), P(-L + inset, W - inset, H), P(L - inset, W - inset, H)];
  const west: V3[] = [P(-L, W, 0), P(-L, -W, 0), P(-L + inset, -W + inset, H), P(-L + inset, W - inset, H)];
  const east: V3[] = [P(L, -W, 0), P(L, W, 0), P(L - inset, W - inset, H), P(L - inset, -W + inset, H)];
  const top: V3[] = [P(-L + inset, -W + inset, H), P(L - inset, -W + inset, H), P(L - inset, W - inset, H), P(-L + inset, W - inset, H)];
  faceFill(c, v, west, shade(col, -0.12), LINE_W);
  faceFill(c, v, east, shade(col, -0.3), LINE_W);
  faceFill(c, v, front, shade(col, -0.14), LINE_W);
  faceFill(c, v, top, shade(col, hot ? 0.25 : 0.16), LINE_W);
  if (hot) {
    const [gx, gy] = proj(v, ox, oy, z + H);
    c.drawPath(oval(gx, gy, L * v.ppm * 0.8, 3), fill(YARD.glowWhite, Math.max(0, 0.8 - t / 4)));
  } else if (METAL[metal]?.sheen === 'glint') {
    const [gx, gy] = proj(v, ox + L * 0.4, oy, z + H);
    glint(c, gx, gy, 3.4);
  } else if (METAL[metal]?.sheen === 'ticks') {
    const [gx, gy] = proj(v, ox - L * 0.3, oy, z + H);
    ticks(c, gx, gy, 4.5);
  }
  // the cast mark on the top: a small stamped bar of three dots
  if (!hot) {
    const [mx, my] = proj(v, ox - L * 0.35, oy, z + H);
    for (let i = 0; i < 3; i++) c.drawCircle(mx + i * 2.2 - 2.2, my, 0.6, fill(shade(col, -0.35)));
  }
}

/** A loose heap of mixed scrap (the gate tip): a lumpy mound with pieces sticking out of it, seeded. */
export function drawHeap(c: SkCanvas, v: View3q, r: number, h: number, seed = 3): void {
  groundShadow(c, v, r * 1.05, r * 0.95);
  const P = v.ppm;
  const rx = r * P;
  const ry = r * P * v.tilt;
  const top = h * P * v.lift;
  // the silhouette: lumps along an arch
  const pts: number[] = [];
  const n = 11;
  for (let i = 0; i <= n; i++) {
    const a = i / n;
    const x = -rx + 2 * rx * a;
    const bump = 0.75 + hash01(seed, i, 9) * 0.35;
    const y = -top * Math.sin(Math.PI * a) ** 0.8 * bump;
    pts.push(x, y);
  }
  pts.push(rx * 0.7, ry * 0.6, 0, ry * 0.9, -rx * 0.7, ry * 0.6);
  const mound = blobOpen(pts);
  c.drawPath(mound, fill('#7C858C'));
  c.save();
  c.clipPath(mound, ClipOp.Intersect, true);
  c.drawRect({ x: -rx, y: -top * 0.25, width: rx * 2, height: top + ry }, fill('#69727A'));
  c.restore();
  c.drawPath(mound, stroke(INK, LINE_W));
  const metals = ['light_iron', 'hms', 'light_iron', 'aluminium', 'cast_iron', 'light_iron', 'hms', 'enamel'];
  for (let i = 0; i < 22; i++) {
    const a = hash01(seed, i, 1) * 2 - 1;
    const b = hash01(seed, i, 2);
    const x = a * rx * 0.85;
    const yTop = -top * Math.sin(Math.PI * (a + 1) / 2) ** 0.8 * 0.9;
    const y = yTop + (ry * 0.5 - yTop) * b * 0.8;
    const key = metals[i % metals.length];
    const base = key === 'enamel' ? YARD.enamel : METAL[key].base;
    const light = key === 'enamel' ? '#FFFFFF' : METAL[key].light;
    const w = 7 + hash01(seed, i, 3) * 10;
    const turn = (hash01(seed, i, 5) - 0.5) * 70;
    c.save();
    c.translate(x, y);
    c.rotate(turn, 0, 0);
    const kind = i % 4;
    const p = kind === 0 ? poly([-w / 2, -1.6, w / 2, -1.6, w / 2, 1.6, -w / 2, 1.6]) : kind === 1 ? poly([-w / 2, -3, w / 3, -4, w / 2, 2, -w / 2 + 2, 3.4]) : poly([-w / 2, -2.4, w / 2, -2.8, w / 2 - 1, 2.6, -w / 2, 2.2]);
    c.drawPath(p, fill(i % 3 === 0 ? light : base));
    c.drawPath(p, stroke(INK, 0.9));
    if (key === 'light_iron' && i % 2) c.drawCircle(w * 0.15, 0, 0.9, fill(YARD.rust));
    c.restore();
  }
}

function blobOpen(pts: number[]): ReturnType<typeof poly> {
  return blobPath(pts);
}

/** The colour of a carried or piled piece of a metal at its south face (for chips and legends). */
export const pieceTone = (metal: string): string => mix(METAL[metal]?.base ?? YARD.steel, YARD.ink, 0.08);

export { facePath };
