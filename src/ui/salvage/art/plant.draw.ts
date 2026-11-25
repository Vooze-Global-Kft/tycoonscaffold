/**
 * Machines, vehicles and structures of the first yard (yard-style.md "Proportions"): machines at true
 * size against the 1.65 m worker; vehicles at about two thirds of true length and four fifths of true
 * height so a truck fits a phone's view with room round it. Machines are painted machine blue-grey
 * with yellow guards and hazard stripes; heat is the only orange.
 */
import { Skia, type SkCanvas } from '@shopify/react-native-skia';
import { LINE_W, YARD, coolingColour, shade } from './palette';
import { sevenSeg, stencil } from './letters';
import {
  box,
  boxShadow,
  builder,
  discPath,
  faceFill,
  fill,
  freckles,
  groundShadow,
  hash01,
  hazard,
  linear,
  oval,
  poly,
  proj,
  radial,
  rrect,
  segment,
  stroke,
  subQuad,
  type V3,
  type View3q,
} from './pen';
import { drawBrightCopper, drawIngot } from './scrap.draw';
import { SHADOW_ALPHA } from './palette';

const INK = YARD.ink;

// ---------------------------------------------------------------------------
// The cable stripper
// ---------------------------------------------------------------------------

/** A bench cable stripper on its stand: feed guide (west), rollers, bare copper out east into a tub, PVC strip into a bin. */
export function drawStripper(c: SkCanvas, v: View3q, o: { running?: boolean; tubFull?: boolean } = {}): void {
  // Drawn 1.3 times its bench size: a hand machine must read at a glance beside the worker.
  c.save();
  c.scale(1.3, 1.3);
  stripperBody(c, v, o);
  c.restore();
}

function stripperBody(c: SkCanvas, v: View3q, o: { running?: boolean; tubFull?: boolean }): void {
  boxShadow(c, v, 1.9, 0.9, 0.1, 0);
  // the PVC bin behind (north-east)
  box(c, v, { len: 0.5, wid: 0.4, h: 0.45, ox: 0.55, oy: -0.18, color: YARD.pvc });
  const [px, py] = proj(v, 0.55, -0.18, 0.45);
  for (let i = 0; i < 4; i++) c.drawPath(builder().moveTo(px - 8 + i * 5, py - 1).quadTo(px - 6 + i * 5, py - 7, px - 3 + i * 4, py - 2).build(), stroke(YARD.pvcGrey, 1.6));
  // stand legs and the bed
  for (const [x, y] of [[-0.42, -0.2], [0.18, -0.2], [-0.42, 0.2], [0.18, 0.2]]) box(c, v, { len: 0.06, wid: 0.06, h: 0.72, ox: x, oy: y, color: YARD.machineDark, line: 1 });
  box(c, v, { len: 0.8, wid: 0.5, h: 0.06, ox: -0.12, z: 0.72, color: YARD.machineDark });
  // the machine body with its yellow guard
  box(c, v, {
    len: 0.62,
    wid: 0.42,
    h: 0.36,
    ox: -0.1,
    z: 0.78,
    color: YARD.machine,
    bevel: true,
    onFace: (q, n) => {
      if (n[1] < 0.9) return;
      const p = subQuad(q, 0.08, 0.92, 0.14, 0.34);
      const pts = p.map((pt) => proj(v, ...pt));
      hazard(c, poly(pts.flat()), 3.2, 0.9);
      faceFill(c, v, subQuad(q, 0.62, 0.86, 0.48, 0.86), YARD.hivis, 0.9);
    },
  });
  // the roller housing on top: a half cylinder
  const [rx, ry] = proj(v, -0.1, 0, 1.14);
  c.drawPath(builder().addArc({ x: rx - 11, y: ry - 7, width: 22, height: 14 }, 180, 180).close().build(), fill(YARD.machineLight));
  c.drawPath(builder().addArc({ x: rx - 11, y: ry - 7, width: 22, height: 14 }, 180, 180).close().build(), stroke(INK, LINE_W));
  // the stop button: yellow with an ink ring (no red in the palette)
  const [bx, by] = proj(v, 0.12, 0.21, 1.0);
  c.drawCircle(bx, by, 3, fill(INK));
  c.drawCircle(bx, by, 2, fill(YARD.hivis));
  // the feed guide (west) with cable going in
  const [fx, fy] = proj(v, -0.48, 0.05, 0.98);
  c.drawPath(oval(fx, fy, 4, 5), fill(YARD.hivis));
  c.drawPath(oval(fx, fy, 4, 5), stroke(INK, 1));
  const [cx0, cy0] = proj(v, -0.95, 0.25, 0.05);
  const cable = builder().moveTo(cx0, cy0).cubicTo(cx0 + 8, cy0 - 20, fx - 14, fy, fx, fy).build();
  c.drawPath(cable, stroke(INK, 5.6));
  c.drawPath(cable, stroke(YARD.pvcGrey, 3.6));
  // the copper chute (east) into a galvanised tub with bright copper in it
  box(c, v, { len: 0.42, wid: 0.42, h: 0.38, ox: 0.5, oy: 0.18, color: YARD.galvanised, bevel: true, onTop: (q) => faceFill(c, v, subQuad(q, 0.1, 0.9, 0.1, 0.9), shade(YARD.galvanised, -0.4)) });
  if (o.tubFull !== false) {
    c.save();
    c.translate(...proj(v, 0.5, 0.18, 0.3));
    c.scale(0.8, 0.8);
    drawBrightCopper(c, { ...v });
    c.restore();
  }
  const [sx, sy] = proj(v, 0.22, 0.06, 1.0);
  const [ex, ey] = proj(v, 0.45, 0.16, 0.5);
  const wire = builder().moveTo(sx, sy).quadTo(ex + 4, sy, ex, ey).build();
  c.drawPath(wire, stroke(INK, 4.2));
  c.drawPath(wire, stroke(YARD.copperLight, 2.4));
  if (o.running) {
    const [mx, my] = proj(v, -0.1, 0, 1.3);
    for (let i = 0; i < 3; i++) c.drawPath(builder().addArc({ x: mx - 6 - i * 4, y: my - 4 - i * 3, width: 12 + i * 8, height: 8 + i * 6 }, 200, 140).build(), stroke(INK, 1, 0.5));
  }
}

// ---------------------------------------------------------------------------
// The weighbridge
// ---------------------------------------------------------------------------

export const WEIGHBRIDGE = { len: 3.6, wid: 2.4 };

/** The weighbridge plate (flush steel deck with checker plate, hazard ends), anchored at its centre. */
export function drawWeighbridgeDeck(c: SkCanvas, v: View3q): void {
  const { len, wid } = WEIGHBRIDGE;
  // the pit frame and the deck, a little proud of the ground
  box(c, v, { len: len + 0.16, wid: wid + 0.16, h: 0.03, color: YARD.concreteDark, line: 1 });
  box(c, v, {
    len,
    wid,
    h: 0.07,
    z: 0.0,
    color: YARD.galvanised,
    bevel: true,
    onTop: (q) => {
      // checker plate: rows of small raised dashes alternating direction
      const nx = 22;
      const ny = 12;
      for (let j = 0; j < ny; j++)
        for (let i = 0; i < nx; i++) {
          const [x, y] = proj(v, ...subQuad(q, (i + 0.5 + (j % 2) * 0.5) / (nx + 0.5), 0, (j + 0.5) / ny, 0)[0]);
          const d = (i + j) % 2 ? 1.6 : -1.6;
          c.drawPath(segment(x - 1.6, y + d * 0.5, x + 1.6, y - d * 0.5), stroke(YARD.galvanisedLight, 1.1));
        }
      // hazard bands at both ends
      for (const [s0, s1] of [[0, 0.07], [0.93, 1]]) {
        const p = subQuad(q, s0, s1, 0, 1).map((pt) => proj(v, ...pt));
        hazard(c, poly(p.flat()), 4, 0.9);
      }
    },
  });
}

/**
 * The display post at the weighbridge's east end: a pole and a box of LED digits. `text` is the
 * digits shown (the caller's, e.g. "1,240"); unit "kg" is painted on the box.
 */
export function drawWeighDisplay(c: SkCanvas, v: View3q, text: string): void {
  groundShadow(c, v, 0.25, 0.2);
  box(c, v, { len: 0.12, wid: 0.12, h: 2.0, color: YARD.galvanised, line: 1 });
  const [x, y] = proj(v, 0, 0, 2.0);
  const w = 76;
  const h = 26;
  c.drawPath(rrect(x - w / 2 - 3, y - h - 6, w + 6, h + 10, 4), fill(YARD.hivis));
  c.drawPath(rrect(x - w / 2 - 3, y - h - 6, w + 6, h + 10, 4), stroke(INK, LINE_W));
  c.drawPath(rrect(x - w / 2, y - h - 3, w, h + 4, 2.5), fill(YARD.ledCase));
  sevenSeg(c, text, x + w / 2 - 17, y - h + 1, 17, YARD.led, YARD.ledOff);
  // "kg" in tiny LED-green stencil-free strokes: a k and a g
  const kx = x + w / 2 - 12;
  const ky = y - 6;
  const s = stroke(YARD.led, 1.1);
  c.drawPath(segment(kx, ky - 6, kx, ky), s);
  c.drawPath(builder().moveTo(kx + 3, ky - 4).lineTo(kx, ky - 2).lineTo(kx + 3, ky).build(), s);
  c.drawPath(oval(kx + 6, ky - 2, 1.5, 1.6), s);
  c.drawPath(builder().moveTo(kx + 7.5, ky - 3.5).lineTo(kx + 7.5, ky + 1.5).quadTo(kx + 7.5, ky + 3, kx + 5, ky + 2.4).build(), s);
}

// ---------------------------------------------------------------------------
// The small crucible furnace, cold and pouring; its mould
// ---------------------------------------------------------------------------

/** An open ingot mould of `n` cavities on the ground, east-west; `fill` 0..1 the first cavity's glow. */
export function drawMould(c: SkCanvas, v: View3q, o: { n?: number; pourT?: number; ox?: number; oy?: number } = {}): void {
  const n = o.n ?? 3;
  const ox = o.ox ?? 0;
  const oy = o.oy ?? 0;
  const L = 0.56 * n;
  boxShadow(c, v, L + 0.1, 0.42, ox, oy);
  box(c, v, {
    len: L,
    wid: 0.36,
    h: 0.12,
    ox,
    oy,
    color: YARD.castIron,
    onTop: (q) => {
      for (let i = 0; i < n; i++) {
        const cav = subQuad(q, (i + 0.12) / n, (i + 0.88) / n, 0.22, 0.78);
        faceFill(c, v, cav, shade(YARD.castIron, -0.4), 1);
        if (i === n - 1 && o.pourT !== undefined) {
          const col = coolingColour('brass', o.pourT);
          faceFill(c, v, subQuad(q, (i + 0.16) / n, (i + 0.84) / n, 0.28, 0.72), col);
          const [gx, gy] = proj(v, ...subQuad(q, (i + 0.5) / n, 0, 0.5, 0)[0]);
          if (o.pourT < 2) c.drawPath(oval(gx, gy, 12, 5), radial(gx, gy, 14, [YARD.glowWhite, 'rgba(255,211,107,0)']));
        }
      }
    },
  });
}

/**
 * The crucible furnace on its tilting frame. tilt 0: upright, lid on, cold (dark, a sample ingot on
 * the pad); tilt 0..1: tipping east towards the mould (1 = pouring at about 70 degrees). Anchor: the
 * centre of its footprint (the frame), the mould sits 1.0 m east.
 */
export function drawCrucible(c: SkCanvas, v: View3q, o: { tilt?: number; hot?: boolean } = {}): void {
  const tilt = o.tilt ?? 0;
  const hot = o.hot ?? tilt > 0;
  boxShadow(c, v, 1.3, 0.9);
  // the frame: two posts with a pivot, a burner box behind
  box(c, v, { len: 0.36, wid: 0.36, h: 0.4, ox: -0.2, oy: -0.42, color: YARD.machine, line: LINE_W });
  const [bx, by] = proj(v, -0.2, -0.24, 0.24);
  c.drawPath(oval(bx, by, 4, 4), fill(INK));
  if (hot) c.drawPath(oval(bx, by, 3, 3), fill(YARD.glow));
  for (const y of [-0.38, 0.38]) box(c, v, { len: 0.12, wid: 0.1, h: 0.95, ox: 0, oy: y, color: YARD.machineDark, line: 1 });
  // the crucible: drawn in the screen plane, rotated about the pivot (x-z is nearly the screen plane)
  const [px, py] = proj(v, 0, 0, 0.82);
  const P = v.ppm;
  const R = 0.36 * P;
  const H = 0.78 * P * v.lift;
  const ang = tilt * 72;
  c.save();
  c.translate(px, py);
  c.rotate(ang, 0, 0);
  const top = -H * 0.42;
  const bot = H * 0.58;
  const ry = R * v.tilt;
  const body = builder()
    .moveTo(-R, top)
    .lineTo(-R * 0.92, bot)
    .addArc({ x: -R * 0.92, y: bot - ry * 0.92, width: R * 1.84, height: ry * 1.84 }, 180, -180)
    .lineTo(R, top)
    .close()
    .build();
  c.drawPath(body, fill(YARD.steelDark));
  c.drawPath(body, linear(-R, 0, R, 0, [shade(YARD.steel, 0.1), YARD.steelDark, shade(YARD.steelDark, -0.3)], [0, 0.55, 1]));
  // banding
  for (const yy of [top + (bot - top) * 0.3, top + (bot - top) * 0.72]) c.drawRect({ x: -R + 1, y: yy, width: R * 2 - 2, height: 3 }, fill(YARD.hivisDark));
  c.drawPath(body, stroke(INK, LINE_W));
  // the trunnion pin
  c.drawPath(oval(0, 0, 4.5, 4.5), fill(YARD.galvanisedLight));
  c.drawPath(oval(0, 0, 4.5, 4.5), stroke(INK, 1));
  // the mouth: refractory rim and either a lid (cold) or the melt (hot), with the pouring lip east
  c.drawPath(oval(0, top, R, ry), fill(YARD.refractory));
  c.drawPath(oval(0, top, R, ry), stroke(INK, LINE_W));
  if (hot) {
    c.drawPath(oval(0, top, R * 0.76, ry * 0.72), radial(0, top, R * 0.8, [YARD.glowWhite, YARD.glowHot, YARD.glow], [0, 0.5, 1]));
  } else {
    c.drawPath(oval(0, top - 3, R * 0.9, ry * 0.85), fill(YARD.castIron));
    c.drawPath(oval(0, top - 3, R * 0.9, ry * 0.85), stroke(INK, 1));
    c.drawPath(rrect(-6, top - 9, 12, 4, 2), fill(YARD.hivis));
    c.drawPath(rrect(-6, top - 9, 12, 4, 2), stroke(INK, 1));
  }
  const lip = poly([R - 2, top - 3, R + 9, top - 1, R + 9, top + 3, R - 2, top + 5]);
  c.drawPath(lip, fill(YARD.refractory));
  c.drawPath(lip, stroke(INK, 1));
  c.restore();
  if (hot && tilt > 0.55) {
    // the stream from the lip down to the mould 1.0 m east
    const a = (ang * Math.PI) / 180;
    const lx = px + Math.cos(a) * (R + 8) - Math.sin(a) * (-H * 0.42);
    const ly = py + Math.sin(a) * (R + 8) + Math.cos(a) * (-H * 0.42);
    const [mx, my] = proj(v, MOULD_X - 0.56, 0.0, 0.12);
    const s = builder().moveTo(lx, ly).cubicTo(lx + 9, ly, mx, ly + (my - ly) * 0.35, mx, my).build();
    c.drawPath(s, stroke(YARD.glow, 8));
    c.drawPath(s, stroke(YARD.glowHot, 5));
    c.drawPath(s, stroke(YARD.glowWhite, 2));
    c.drawPath(oval(mx, my, 10, 4), radial(mx, my, 12, [YARD.glowWhite, 'rgba(255,211,107,0)']));
    // a few light droplets (never flame)
    for (let i = 0; i < 5; i++) c.drawCircle(mx + (hash01(i, 4) - 0.5) * 16, my - 2 - hash01(i, 5) * 8, 1.2, fill(YARD.spark));
  }
  if (hot) {
    // heat shimmer: three thin wavy lines rising from the mouth
    for (let i = 0; i < 3; i++) {
      const x0 = px - 8 + i * 8 + tilt * 14;
      const y0 = py - H * 0.55 - 6;
      c.drawPath(builder().moveTo(x0, y0).quadTo(x0 - 4, y0 - 5, x0, y0 - 10).quadTo(x0 + 4, y0 - 15, x0, y0 - 20).build(), stroke(YARD.glowHot, 1.3, 0.55));
    }
  }
}

/** Where the mould stands east of the crucible's anchor, metres. */
export const MOULD_X = 1.4;

/** The furnace corner as the yard shows it: crucible, mould 1.0 m east and (cooled) a sample ingot. */
export function drawFurnaceSet(c: SkCanvas, v: View3q, state: 'cold' | 'pouring' | 'cooling', t = 0): void {
  // Drawn 1.35 times its true size, as the stripper: the pour is the yard's moment and must read.
  c.save();
  c.scale(FURNACE_SCALE, FURNACE_SCALE);
  furnaceSet(c, v, state, t);
  c.restore();
}

export const FURNACE_SCALE = 1.35;

function furnaceSet(c: SkCanvas, v: View3q, state: 'cold' | 'pouring' | 'cooling', t: number): void {
  if (state !== 'cold') {
    // the warm light the melt throws on the pad (light, not a fill: the pad stays concrete)
    const [gx, gy] = proj(v, MOULD_X * 0.6, 0.1, 0);
    c.drawPath(oval(gx, gy, 2.0 * v.ppm, 1.1 * v.ppm * v.tilt), radial(gx, gy, 2.0 * v.ppm, ['rgba(255,190,90,0.45)', 'rgba(255,190,90,0)']));
  }
  if (state === 'cold') {
    drawMould(c, v, { ox: MOULD_X });
    drawCrucible(c, v, { tilt: 0, hot: false });
    drawIngot(c, v, 'brass', 99, { ox: 0.9, oy: 0.62 });
    return;
  }
  drawMould(c, v, { ox: MOULD_X, pourT: state === 'pouring' ? 0 : t });
  drawCrucible(c, v, { tilt: state === 'pouring' ? 1 : 0.15, hot: true });
  drawIngot(c, v, 'brass', 99, { ox: 0.9, oy: 0.62 });
}

// ---------------------------------------------------------------------------
// The hook-lift truck with a skip
// ---------------------------------------------------------------------------

function wheel(c: SkCanvas, v: View3q, p: V3, f: V3, r: number): void {
  const z: V3 = [0, 0, 1];
  c.drawPath(discPath(v, p, f, z, r), fill(YARD.tyre));
  c.drawPath(discPath(v, p, f, z, r), stroke(INK, 1));
  c.drawPath(discPath(v, p, f, z, r * 0.5), fill(YARD.galvanised));
  c.drawPath(discPath(v, p, f, z, r * 0.2), fill(YARD.steelDark));
}

/**
 * The hook-lift truck at a heading (radians, 0 east, pi/2 south), carrying a skip when `skip` is set.
 * Footprint about 4.6 x 2.0 m; anchor the footprint centre.
 */
export function drawTruck(c: SkCanvas, v: View3q, heading: number, o: { skip?: boolean; load?: string[] } = {}): void {
  const fx = Math.cos(heading);
  const fy = Math.sin(heading);
  const lx = -fy;
  const ly = fx;
  const len = 4.6;
  const wid = 2.0;
  const at = (u: number, s: number, z: number): V3 => [fx * u + lx * s, fy * u + ly * s, z];
  const sh = [at(len / 2 + 0.1, wid / 2 + 0.1, 0), at(-len / 2 - 0.1, wid / 2 + 0.1, 0), at(-len / 2 - 0.1, -wid / 2 - 0.1, 0), at(len / 2 + 0.1, -wid / 2 - 0.1, 0)].map(
    (p) => proj(v, p[0] + 0.08, p[1] + 0.06, 0),
  );
  c.drawPath(poly(sh.flat()), fill(YARD.shadow, SHADOW_ALPHA));
  const wheels: [number, number][] = [
    [1.45, 0.86],
    [-0.9, 0.86],
    [-1.6, 0.86],
    [1.45, -0.86],
    [-0.9, -0.86],
    [-1.6, -0.86],
  ];
  const nearSign = ly >= 0 ? 1 : -1; // the side whose wheels face the eye
  const f: V3 = [fx, fy, 0];
  for (const [u, s] of wheels) if (Math.sign(s) !== nearSign) wheel(c, v, at(u, s, 0.42), f, 0.42);
  // chassis
  box(c, v, { len: len * 0.95, wid: wid * 0.7, h: 0.3, z: 0.5, heading, color: YARD.machineDark });
  // cab at the front, with windows on each visible face and a beacon
  const cabU = len / 2 - 0.55;
  const isFront = (n: V3) => n[0] * fx + n[1] * fy > 0.7;
  box(c, v, {
    len: 1.1,
    wid,
    h: 1.5,
    z: 0.7,
    ox: fx * cabU,
    oy: fy * cabU,
    heading,
    color: YARD.cab,
    bevel: true,
    onFace: (q, n) => {
      const win = isFront(n) ? subQuad(q, 0.1, 0.9, 0.5, 0.9) : subQuad(q, 0.12, 0.62, 0.5, 0.9);
      if (!isFront(n) && n[0] * fx + n[1] * fy < -0.7) return;
      faceFill(c, v, win, YARD.glassDark, 1);
      const shine = subQuad(win, 0.15, 0.3, 0.1, 0.9);
      faceFill(c, v, shine, YARD.glass, 0, 0.9);
      // the yard's stripe: hi-vis band along the bottom
      faceFill(c, v, subQuad(q, 0, 1, 0.08, 0.22), YARD.hivis, 0.9);
    },
  });
  const [bx, by] = proj(v, fx * cabU, fy * cabU, 2.2);
  c.drawPath(rrect(bx - 3, by - 7, 6, 7, 2), fill(YARD.hivis));
  c.drawPath(rrect(bx - 3, by - 7, 6, 7, 2), stroke(INK, 1));
  // the hook arm behind the cab (the hook-lift's A-frame), hi-vis yellow
  const armU = cabU - 0.75;
  box(c, v, { len: 0.18, wid: 1.2, h: 1.1, z: 0.8, ox: fx * armU, oy: fy * armU, heading, color: YARD.hivis });
  // the skip: a steel box with sloped ends, red-oxide, hazard corners
  if (o.skip !== false) {
    const sU = -0.75;
    box(c, v, {
      len: 2.7,
      wid: 1.75,
      h: 0.95,
      z: 0.8,
      ox: fx * sU,
      oy: fy * sU,
      heading,
      color: YARD.skip,
      onFace: (q, n) => {
        // vertical ribs on long faces, a hazard corner panel at the ends
        if (Math.abs(n[0] * fx + n[1] * fy) < 0.3) for (const s of [0.2, 0.4, 0.6, 0.8]) faceFill(c, v, subQuad(q, s - 0.015, s + 0.015, 0.05, 0.95), shade(YARD.skip, -0.3));
        else {
          const p = subQuad(q, 0.05, 0.95, 0.65, 0.92).map((pt) => proj(v, ...pt));
          hazard(c, poly(p.flat()), 3.4, 0.8);
        }
        const [rx0, ry0] = proj(v, ...subQuad(q, 0.3, 0.3, 0.3, 0.3)[0]);
        freckles(c, rx0, ry0, 14, 8, 11, YARD.rustLight, 3);
      },
      onTop: (q) => {
        faceFill(c, v, subQuad(q, 0.04, 0.96, 0.06, 0.94), shade(YARD.skip, -0.5));
        // a load showing over the rim
        const load = o.load ?? [];
        load.forEach((metal, i) => {
          const [x, y] = proj(v, ...subQuad(q, 0.15 + 0.7 * hash01(i, 1), 0, 0.2 + 0.6 * hash01(i, 2), 0)[0]);
          const col = metal === 'copper' ? YARD.copper : metal === 'brass' ? YARD.brass : metal === 'cast_iron' ? YARD.castIron : '#8E979E';
          const p = poly([x - 7, y - 2, x + 6, y - 4, x + 8, y + 2, x - 6, y + 3]);
          c.drawPath(p, fill(col));
          c.drawPath(p, stroke(INK, 0.9));
        });
      },
    });
  }
  for (const [u, s] of wheels) if (Math.sign(s) === nearSign) wheel(c, v, at(u, s, 0.42), f, 0.42);
}

// ---------------------------------------------------------------------------
// A container wall section; the furnace pad
// ---------------------------------------------------------------------------

export const CONTAINER_COLOURS = [YARD.containerTeal, YARD.containerOxide, YARD.containerSage] as const;

/** A shipping container lying east-west (6.1 x 2.44 x 2.6 m), ribbed, with corner castings. */
export function drawContainer(c: SkCanvas, v: View3q, color: string = YARD.containerTeal, o: { len?: number; ox?: number; oy?: number; z?: number; seed?: number } = {}): void {
  const len = o.len ?? 6.1;
  const ox = o.ox ?? 0;
  const oy = o.oy ?? 0;
  const z = o.z ?? 0;
  if (z === 0) boxShadow(c, v, len, 2.44, ox, oy);
  box(c, v, {
    len,
    wid: 2.44,
    h: 2.6,
    ox,
    oy,
    z,
    color,
    onFace: (q, n) => {
      const ribs = n[1] > 0.9 ? Math.round(len * 4) : 8;
      for (let i = 1; i < ribs; i++) {
        const s = i / ribs;
        faceFill(c, v, subQuad(q, s - 0.18 / ribs, s + 0.18 / ribs, 0.04, 0.94), shade(color, -0.22));
        faceFill(c, v, subQuad(q, s + 0.18 / ribs, s + 0.32 / ribs, 0.04, 0.94), shade(color, 0.1), 0, 0.6);
      }
      faceFill(c, v, subQuad(q, 0, 1, 0.94, 1), shade(color, -0.3));
      faceFill(c, v, subQuad(q, 0, 1, 0, 0.05), shade(color, -0.35));
      for (const s0 of [0, 1 - 0.3 / len]) {
        faceFill(c, v, subQuad(q, s0, s0 + 0.3 / len, 0, 0.08), shade(color, -0.45), 0.8);
        faceFill(c, v, subQuad(q, s0, s0 + 0.3 / len, 0.92, 1), shade(color, -0.45), 0.8);
      }
      const [x, y] = proj(v, ...subQuad(q, 0.2 + 0.5 * hash01(o.seed ?? 1, 2), 0, 0.3, 0)[0]);
      freckles(c, x, y - 18, 40, 22, o.seed ?? 1, YARD.rust, 5);
    },
    onTop: (q) => {
      for (let i = 1; i < 10; i++) faceFill(c, v, subQuad(q, i / 10 - 0.008, i / 10 + 0.008, 0.05, 0.95), shade(color, -0.12));
    },
  });
}

/** A wall of containers along x, `n` long and `tiers` high, alternating colours. */
export function drawContainerWall(c: SkCanvas, v: View3q, n: number, tiers = 1, seed = 1): void {
  for (let t = 0; t < tiers; t++)
    for (let i = 0; i < n; i++) {
      const col = CONTAINER_COLOURS[Math.floor(hash01(seed, i, t) * 3)];
      drawContainer(c, v, col, { ox: (i - (n - 1) / 2) * 6.15 + (t ? 1.2 : 0), z: t * 2.6, seed: seed * 10 + i + t * 5 });
    }
}

/** The furnace pad: a raised clean concrete slab with a painted yellow edge and hazard corners. */
export function drawPad(c: SkCanvas, v: View3q, w: number, d: number, locked = false): void {
  box(c, v, {
    len: w,
    wid: d,
    h: 0.06,
    color: YARD.concreteLight,
    line: 1,
    onTop: (q) => {
      const edge = 0.12 / Math.min(w, d);
      const inner = subQuad(q, edge, 1 - edge, edge * (w / d), 1 - edge * (w / d));
      const ip = inner.map((p) => proj(v, ...p));
      c.drawPath(poly(ip.flat()), stroke(locked ? YARD.linePaintWorn : YARD.linePaint, 2.4));
      for (const [s, t] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        const k = 0.5 / w;
        const kd = 0.5 / d;
        const corner = subQuad(q, s ? 1 - k : 0, s ? 1 : k, t ? 1 - kd : 0, t ? 1 : kd).map((p) => proj(v, ...p));
        hazard(c, poly(corner.flat()), 3, 0.8);
      }
      if (locked) {
        // dashed outlines where the machines will stand
        const spot = subQuad(q, 0.2, 0.55, 0.25, 0.75).map((p) => proj(v, ...p));
        const dash = stroke(YARD.inkSoft, 1.2, 0.6);
        dash.setPathEffect(Skia.PathEffect.MakeDash([4, 3], 0));
        c.drawPath(poly(spot.flat()), dash);
      }
    },
  });
}


/**
 * A storage bay: three walls of interlocking concrete blocks (0.8 m cubes) open to the south, its
 * material heaped inside, a stencil code painted on the back wall, and a hi-vis Hold flag when held.
 * w x d metres; anchor the bay's footprint centre.
 */
export function drawBay(c: SkCanvas, v: View3q, w: number, d: number, o: { heap: string[]; code: string; hold?: boolean; seed?: number }): void {
  const b = 0.8;
  const seed = o.seed ?? 1;
  const block = (x: number, y: number, z = 0) =>
    box(c, v, {
      len: b,
      wid: b,
      h: b * 0.75,
      ox: x,
      oy: y,
      z,
      color: '#BDB8AC',
      line: 1,
      onTop: (q) => {
        for (const [s0, t0] of [[0.3, 0.5], [0.7, 0.5]]) {
          const [kx, ky] = proj(v, ...subQuad(q, s0, s0, t0, t0)[0]);
          c.drawPath(oval(kx, ky, 3.2, 2.2), fill(shade('#BDB8AC', -0.1)));
          c.drawPath(oval(kx, ky, 3.2, 2.2), stroke(INK, 0.7));
        }
      },
    });
  const nx = Math.round(w / b);
  // the back wall, two blocks high, with the code painted on its face
  for (let i = 0; i < nx; i++) {
    block(-w / 2 + b / 2 + i * b, -d / 2 + b / 2);
    block(-w / 2 + b / 2 + i * b, -d / 2 + b / 2, b * 0.75);
  }
  const [cx, cy] = proj(v, 0, -d / 2 + b, b * 1.3);
  stencil(c, o.code, cx, cy - 7, 13, YARD.ink, { align: 'center', alpha: 0.85 });
  // the heap: a mound in the metal's dark tone, pieces piled on it against the back wall
  {
    const look = METAL_COLS[o.heap[0]] ?? METAL_COLS.light_iron;
    const [m0x, m0y] = proj(v, 0, -d / 2 + b + 0.1, 0);
    const mw = (w - 0.3) * v.ppm * 0.5;
    const mh = (d - b) * v.ppm * v.tilt;
    const mound = builder().moveTo(m0x - mw, m0y + mh * 0.8).quadTo(m0x - mw, m0y - 18, m0x, m0y - 24).quadTo(m0x + mw, m0y - 18, m0x + mw, m0y + mh * 0.8).quadTo(m0x, m0y + mh * 1.15, m0x - mw, m0y + mh * 0.8).close().build();
    c.drawPath(mound, fill(shade(look[0], -0.35)));
    c.drawPath(mound, stroke(INK, 1));
  }
  for (let i = 0; i < 34; i++) {
    const metal = o.heap[i % o.heap.length];
    const look = METAL_COLS[metal] ?? METAL_COLS.light_iron;
    const a = hash01(seed, i, 1);
    const r = hash01(seed, i, 2) ** 0.8;
    const x = (a - 0.5) * (w - 0.3) * 0.92;
    const y = -d / 2 + b + r * (d - b) * 0.8;
    const z = Math.max(0.04, (0.7 - r * 0.6) * (1 - Math.abs(a - 0.5) * 1.2));
    const [sx, sy] = proj(v, x, y, z);
    const turn = (hash01(seed, i, 3) - 0.5) * 60;
    c.save();
    c.translate(sx, sy);
    c.rotate(turn, 0, 0);
    const pw = 9 + hash01(seed, i, 4) * 8;
    const pc = metal === 'copper' ? poly([-pw / 2, -3, pw / 2, -3.5, pw / 2 + 1, 2.5, -pw / 2, 3]) : poly([-pw / 2, -2.6, pw / 2, -3.2, pw / 2, 2.4, -pw / 2 - 1, 3]);
    c.drawPath(pc, fill(i % 3 ? look[0] : look[1]));
    c.drawPath(pc, stroke(INK, 0.9));
    if (metal === 'copper' && i % 3 === 0) c.drawPath(segment(-2, -1, 1, -2), stroke(YARD.copperSheen, 1.1));
    if (metal === 'brass' && i % 4 === 0) c.drawPath(segment(-1.5, -1.2, 1.5, -1.2), stroke('#FFFFFF', 1));
    c.restore();
  }
  // short side walls at the back corners
  for (const side of [-1, 1]) block(side * (w / 2 + b / 2), -d / 2 + b / 2);
  if (o.hold) {
    const [fx, fy] = proj(v, w / 2 + b / 2, -d / 2 + b / 2, b * 0.75);
    c.drawPath(segment(fx, fy, fx, fy - 30), stroke(INK, 1.6));
    const flag = poly([fx, fy - 30, fx + 20, fy - 25, fx, fy - 19]);
    c.drawPath(flag, fill(YARD.hivis));
    c.drawPath(flag, stroke(INK, 1.1));
  }
}

const METAL_COLS: Record<string, [string, string]> = {
  light_iron: ['#8E979E', '#B9C0C5'],
  cast_iron: [YARD.castIron, '#6E737A'],
  hms: [YARD.rust, YARD.rustLight],
  copper: [YARD.copper, YARD.copperLight],
  brass: [YARD.brass, YARD.brassLight],
  aluminium: [YARD.aluminium, YARD.aluminiumLight],
};

