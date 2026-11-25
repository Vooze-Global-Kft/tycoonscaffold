/**
 * The yard's ground (yard-style.md "Ground"): pale concrete slabs with joints, never sand or dust; oil
 * stains and rain puddles as flat decals; painted yellow bay lines; the asphalt lane outside the gate.
 * World rectangles in metres (x east, y south) drawn in the view's points; everything seeded, nothing
 * random. In the app the slab tile is baked once (world/ground.ts draws it repeated) and the decals go
 * into the atlas as ground decals drawn before every sprite.
 */
import { ClipOp, Skia, type SkCanvas } from '@shopify/react-native-skia';
import { YARD, mix, shade } from './palette';
import { blob, builder, fill, hash01, linear, oval, poly, proj, rect, segment, stroke, type View3q } from './pen';

/** One slab's size, metres (the tile the app repeats is 2 x 2 slabs). */
export const SLAB = 3;

/** Concrete slabs filling the world rectangle (x0, y0, w, d), metres. */
export function drawConcrete(c: SkCanvas, v: View3q, x0: number, y0: number, w: number, d: number, seed = 1, weeds = false): void {
  const [ax, ay] = proj(v, x0, y0, 0);
  const [bx, by] = proj(v, x0 + w, y0 + d, 0);
  c.save();
  c.clipRect({ x: ax, y: ay, width: bx - ax, height: by - ay }, ClipOp.Intersect, true);
  c.drawRect({ x: ax, y: ay, width: bx - ax, height: by - ay }, fill(YARD.concrete));
  const i0 = Math.floor(x0 / SLAB);
  const j0 = Math.floor(y0 / SLAB);
  for (let j = j0; j * SLAB < y0 + d; j++)
    for (let i = i0; i * SLAB < x0 + w; i++) {
      const [sx, sy] = proj(v, i * SLAB, j * SLAB, 0);
      const sw = SLAB * v.ppm;
      const sh = SLAB * v.ppm * v.tilt;
      const tone = (hash01(seed, i, j) - 0.5) * 0.07;
      c.drawRect({ x: sx, y: sy, width: sw, height: sh }, fill(shade(YARD.concrete, tone)));
      // float marks: a few faint broad strokes in the slab's direction
      for (let k = 0; k < 3; k++) {
        const fy = sy + sh * (0.2 + 0.3 * k + hash01(seed, i * 7 + k, j) * 0.1);
        c.drawPath(segment(sx + sw * 0.1, fy, sx + sw * (0.5 + hash01(seed, i, j * 3 + k) * 0.4), fy), stroke(shade(YARD.concrete, 0.07), 3, 0.5));
      }
      // specks of aggregate
      for (let k = 0; k < 10; k++) {
        const px = sx + hash01(seed, i * 31 + k, j) * sw;
        const py = sy + hash01(seed, i, j * 29 + k) * sh;
        c.drawCircle(px, py, 0.6 + (k % 3) * 0.35, fill(k % 2 ? YARD.concreteDark : YARD.concreteLight, 0.8));
      }
      // a hairline crack in some slabs
      if (hash01(seed, i, j * 5) > 0.7) {
        const cx = sx + sw * (0.2 + hash01(seed, i, j) * 0.5);
        const cy = sy + sh * 0.2;
        c.drawPath(poly([cx, cy, cx + 6, cy + sh * 0.2, cx + 2, cy + sh * 0.4, cx + 9, cy + sh * 0.6], false), stroke(YARD.joint, 0.9, 0.7));
      }
      // weeds where the joints cross, in some slabs
      if (weeds && hash01(seed, i * 3, j * 7) > 0.55) drawWeeds(c, sx + (hash01(seed, i, 41) > 0.5 ? 0 : sw * (0.3 + hash01(seed, i, j) * 0.4)), sy + 1, Math.floor(hash01(seed, i, j) * 10), 0.8 + hash01(seed, j, i) * 0.6);
      // joints: a dark line and a light lip below it
      c.drawPath(segment(sx, sy, sx + sw, sy), stroke(YARD.joint, 1.3));
      c.drawPath(segment(sx, sy + 1.2, sx + sw, sy + 1.2), stroke(YARD.concreteLight, 0.8, 0.7));
      c.drawPath(segment(sx, sy, sx, sy + sh), stroke(YARD.joint, 1.3));
    }
  c.restore();
}

/** The asphalt lane (x0, y0, w, d) with a worn white edge line. */
export function drawAsphalt(c: SkCanvas, v: View3q, x0: number, y0: number, w: number, d: number, seed = 2): void {
  const [ax, ay] = proj(v, x0, y0, 0);
  const [bx, by] = proj(v, x0 + w, y0 + d, 0);
  c.drawRect({ x: ax, y: ay, width: bx - ax, height: by - ay }, fill(YARD.asphalt));
  for (let k = 0; k < (w * d) / 0.6; k++) c.drawCircle(ax + hash01(seed, k, 1) * (bx - ax), ay + hash01(seed, k, 2) * (by - ay), 0.7, fill(YARD.asphaltLight, 0.8));
  c.drawPath(segment(ax, ay + 4, bx, ay + 4), stroke('#D9DCD8', 2, 0.8));
}

/** A painted line on the ground from (x0, y0) to (x1, y1), metres; `dash` for a dashed bay line. */
export function drawPaintLine(c: SkCanvas, v: View3q, x0: number, y0: number, x1: number, y1: number, width = 0.12, dash = false): void {
  const [ax, ay] = proj(v, x0, y0, 0);
  const [bx, by] = proj(v, x1, y1, 0);
  const p = stroke(YARD.linePaint, width * v.ppm * (Math.abs(by - ay) > Math.abs(bx - ax) ? 1 : v.tilt));
  if (dash) {
    p.setPathEffect(Skia.PathEffect.MakeDash([0.9 * v.ppm, 0.5 * v.ppm], 0));
  }
  c.drawPath(segment(ax, ay, bx, by), p);
  c.drawPath(segment(ax, ay, bx, by), stroke(YARD.linePaintWorn, 0.8, 0.6));
}

/** An oil stain decal at (x, y), radius r metres: an irregular dark blot with a soft rim and one sheen streak. */
export function drawOilStain(c: SkCanvas, v: View3q, x: number, y: number, r: number, seed = 3): void {
  const [cx, cy] = proj(v, x, y, 0);
  const pts: number[] = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 0.65 + hash01(seed, i) * 0.45;
    pts.push(cx + Math.cos(a) * r * v.ppm * k, cy + Math.sin(a) * r * v.ppm * v.tilt * k);
  }
  c.drawPath(blob(pts), fill(YARD.oil, 0.16));
  c.drawPath(blob(pts.map((p, i) => (i % 2 ? cy + (p - cy) * 0.62 : cx + (p - cx) * 0.62))), fill(YARD.oil, 0.22));
  c.drawPath(segment(cx - r * v.ppm * 0.3, cy - 1, cx + r * v.ppm * 0.1, cy - 2), stroke('#7E8FA8', 1.2, 0.35));
  // a drip trail
  c.drawCircle(cx + r * v.ppm * 0.9, cy + r * v.ppm * v.tilt * 0.3, 1.6, fill(YARD.oil, 0.25));
}

/** A rain puddle at (x, y), rx by ry metres: pale sky-blue with a light edge and a reflected highlight. */
export function drawPuddle(c: SkCanvas, v: View3q, x: number, y: number, rx: number, ry: number, seed = 4): void {
  const [cx, cy] = proj(v, x, y, 0);
  const pts: number[] = [];
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 0.75 + hash01(seed, i) * 0.3;
    pts.push(cx + Math.cos(a) * rx * v.ppm * k, cy + Math.sin(a) * ry * v.ppm * v.tilt * k);
  }
  const p = blob(pts);
  c.drawPath(p, fill(shade(YARD.concrete, -0.18), 0.6));
  c.save();
  c.translate(0, -1.2);
  c.drawPath(p, fill(YARD.puddle));
  c.restore();
  c.drawPath(oval(cx - rx * v.ppm * 0.2, cy - ry * v.ppm * v.tilt * 0.25 - 1, rx * v.ppm * 0.35, 1.4), fill(YARD.puddleLight, 0.9));
  c.drawPath(segment(cx + rx * v.ppm * 0.15, cy + 1, cx + rx * v.ppm * 0.45, cy + 1), stroke(YARD.puddleLight, 1, 0.7));
}

/** A ground patch for the kit's sheet: slabs, a bay line, two stains and two puddles, w x d metres from its top-left. */
export function drawGroundPatch(c: SkCanvas, v: View3q, w: number, d: number, seed = 5): void {
  drawConcrete(c, v, 0, 0, w, d, seed);
  drawPaintLine(c, v, 0.4, d * 0.7, w - 0.4, d * 0.7, 0.12, true);
  drawOilStain(c, v, w * 0.3, d * 0.35, 0.6, seed);
  drawOilStain(c, v, w * 0.72, d * 0.25, 0.35, seed + 1);
  drawPuddle(c, v, w * 0.6, d * 0.55, 0.9, 0.5, seed);
  drawPuddle(c, v, w * 0.15, d * 0.85, 0.5, 0.3, seed + 2);
}

/** A tuft of weeds growing out of a joint at (x, y) points: a few blades in two greens, k its size. */
export function drawWeeds(c: SkCanvas, x: number, y: number, seed = 1, k = 1): void {
  const n = 4 + Math.floor(hash01(seed, 1) * 4);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (hash01(seed, i, 2) - 0.5) * 1.8;
    const len = (4 + hash01(seed, i, 3) * 5) * k;
    const bx = x + (hash01(seed, i, 4) - 0.5) * 6 * k;
    const tip = [bx + Math.cos(a) * len, y + Math.sin(a) * len];
    const blade = builder().moveTo(bx - 1.1 * k, y).quadTo(bx + Math.cos(a) * len * 0.5 - 1, y + Math.sin(a) * len * 0.5, tip[0], tip[1]).quadTo(bx + Math.cos(a) * len * 0.5 + 1, y + Math.sin(a) * len * 0.5, bx + 1.1 * k, y).close().build();
    c.drawPath(blade, fill(i % 2 ? YARD.grass : YARD.grassLight));
  }
  c.drawPath(oval(x, y + 0.5, 3.5 * k, 1.1 * k), fill(YARD.grass, 0.6));
}

/**
 * The far plane past the yard's wall (screen points): a late-day sky from blue-grey to warm cream, then
 * in haze a dockside crane, stacked containers, a chimney, cable drums and a tree line, all flat
 * silhouettes in two far tones, standing on `horizon`. No real place, no logo.
 */
export function drawSkyline(c: SkCanvas, x0: number, w: number, top: number, horizon: number, seed = 1): void {
  c.drawRect({ x: x0, y: top, width: w, height: horizon - top + 2 }, linear(0, top, 0, horizon, [YARD.sky, YARD.skyLow], [0, 1]));
  // the low sun's warm glow at the west end of the sky
  c.drawRect({ x: x0, y: top, width: w, height: horizon - top + 2 }, linear(x0, 0, x0 + w, 0, ['rgba(255,227,176,0.55)', 'rgba(255,227,176,0)'], [0, 0.6]));
  const far = YARD.far;
  const farD = YARD.farDark;
  // a tree line, low and lumpy
  const tb = builder().moveTo(x0, horizon);
  for (let x = x0; x <= x0 + w + 12; x += 12) tb.quadTo(x + 6, horizon - 16 - hash01(seed, x | 0) * 12, x + 12, horizon - 11 - hash01(seed, (x | 0) + 1) * 8);
  tb.lineTo(x0 + w, horizon + 2).lineTo(x0, horizon + 2).close();
  c.drawPath(tb.build(), fill(mixHaze('#8FA088')));
  // stacked containers
  for (let i = 0; i < 8; i++) {
    const bx = x0 + w * (0.04 + i * 0.12) + hash01(seed, i) * 20;
    const tiers = 2 + Math.floor(hash01(seed, i, 2) * 3);
    for (let t = 0; t < tiers; t++) c.drawRect({ x: bx + t * 3, y: horizon - 9 * (t + 1), width: 34, height: 8.4 }, fill(t % 2 ? far : farD));
  }
  // a dockside crane: legs, a boom and its counter-jib
  const cx = x0 + w * 0.56;
  const ch = Math.min(60, (horizon - top) * 0.9);
  c.drawPath(poly([cx, horizon, cx + 4, horizon - ch, cx + 8, horizon - ch, cx + 12, horizon, cx + 9, horizon, cx + 6, horizon - ch * 0.5, cx + 3, horizon]), fill(farD));
  c.drawRect({ x: cx - 40, y: horizon - ch - 4, width: 110, height: 4 }, fill(farD));
  c.drawPath(segment(cx + 6, horizon - ch - 14, cx - 40, horizon - ch - 3), stroke(farD, 1.4));
  c.drawPath(segment(cx + 6, horizon - ch - 14, cx + 70, horizon - ch - 3), stroke(farD, 1.4));
  c.drawRect({ x: cx + 3, y: horizon - ch - 16, width: 6, height: 14 }, fill(farD));
  c.drawPath(segment(cx - 30, horizon - ch, cx - 30, horizon - ch + 14), stroke(farD, 1));
  // a chimney and a shed roof
  const kx = x0 + w * 0.47;
  c.drawRect({ x: kx, y: horizon - 50, width: 7, height: 50 }, fill(far));
  c.drawRect({ x: kx - 1, y: horizon - 52, width: 9, height: 4 }, fill(farD));
  c.drawPath(poly([kx + 14, horizon, kx + 14, horizon - 18, kx + 60, horizon - 26, kx + 106, horizon - 18, kx + 106, horizon]), fill(far));
}

/** A colour seen through the late-day haze. */
const mixHaze = (hex: string): string => mix(hex, YARD.far, 0.45);

// ---------------------------------------------------------------------------
// Tiles and decals for the ground atlas (sheet G; manifest/plant.ts), anchored at their centre
// ---------------------------------------------------------------------------

/** A ground tile's side, metres: one slab. Tiles repeat seamlessly (joints on their north and west edges). */
export const TILE_M = SLAB;

export const GROUND_TILES = [
  { id: 'concrete', frames: ['plain', 'weeds'] },
  { id: 'asphalt', frames: ['plain'] },
  { id: 'verge', frames: ['plain'] },
  { id: 'gravel', frames: ['plain'] },
  { id: 'water', frames: ['plain'] },
] as const;

/** One tile round its centre. */
export function drawGroundTile(c: SkCanvas, v: View3q, id: string, frame = 0): void {
  const w = TILE_M * v.ppm;
  const h = TILE_M * v.ppm * v.tilt;
  c.save();
  c.translate(-w / 2, -h / 2);
  c.clipRect({ x: 0, y: 0, width: w, height: h }, ClipOp.Intersect, true);
  switch (id) {
    case 'concrete':
      drawConcrete(c, v, 0, 0, TILE_M, TILE_M, 3 + frame, frame === 1);
      break;
    case 'asphalt':
      c.drawRect({ x: 0, y: 0, width: w, height: h }, fill(YARD.asphalt));
      for (let k = 0; k < 40; k++) c.drawCircle(hash01(7, k, 1) * w, hash01(7, k, 2) * h, 0.6 + (k % 3) * 0.3, fill(k % 4 ? YARD.asphaltLight : '#3E4247', 0.8));
      c.drawPath(segment(w * 0.1, h * 0.6, w * 0.45, h * 0.62), stroke('#43474C', 1.4, 0.8));
      break;
    case 'verge':
      c.drawRect({ x: 0, y: 0, width: w, height: h }, fill(YARD.grass));
      for (let k = 0; k < 60; k++) {
        const x = hash01(9, k, 1) * w;
        const y = hash01(9, k, 2) * h;
        c.drawPath(segment(x, y, x + (hash01(9, k, 3) - 0.5) * 3, y - 3 - hash01(9, k, 4) * 3), stroke(k % 3 ? YARD.grassLight : shade(YARD.grass, -0.2), 1.1));
      }
      break;
    case 'gravel':
      c.drawRect({ x: 0, y: 0, width: w, height: h }, fill('#B3AB98'));
      for (let k = 0; k < 90; k++) {
        const x = hash01(11, k, 1) * w;
        const y = hash01(11, k, 2) * h;
        c.drawPath(oval(x, y, 1.2 + hash01(11, k, 3) * 1.4, 0.9 + hash01(11, k, 4)), fill(k % 3 ? '#9D9583' : '#CEC6B2'));
      }
      break;
    case 'water':
      c.drawRect({ x: 0, y: 0, width: w, height: h }, fill('#6F92A3'));
      for (let k = 0; k < 9; k++) {
        const x = hash01(13, k, 1) * w;
        const y = hash01(13, k, 2) * h;
        c.drawPath(segment(x, y, x + 10 + hash01(13, k, 3) * 12, y), stroke('#A9C8D8', 1.2, 0.8));
      }
      break;
  }
  c.restore();
}

/** Decals: footprint (m), bounds round the centre (points: x, y, w, h), frames. */
export const GROUND_DECALS: { id: string; footprint: [number, number]; bounds: [number, number, number, number]; frames: readonly string[] }[] = [
  { id: 'oil', footprint: [1.4, 1.0], bounds: [-28, -16, 62, 34], frames: ['a', 'b', 'c'] },
  { id: 'puddle', footprint: [2.0, 1.2], bounds: [-42, -20, 84, 40], frames: ['a', 'b'] },
  { id: 'weeds', footprint: [0.4, 0.2], bounds: [-12, -16, 24, 20], frames: ['a', 'b', 'c', 'd'] },
  { id: 'line.ew', footprint: [1.5, 0.12], bounds: [-31, -4, 62, 8], frames: ['line'] },
  { id: 'line.ns', footprint: [0.12, 1.5], bounds: [-4, -22, 8, 44], frames: ['line'] },
  { id: 'hatch', footprint: [1.5, 0.4], bounds: [-31, -7, 62, 14], frames: ['ew'] },
  { id: 'corner', footprint: [0.6, 0.6], bounds: [-14, -10, 28, 20], frames: ['nw', 'ne', 'se', 'sw'] },
  { id: 'pad.strip', footprint: [3.0, 2.4], bounds: [-63, -38, 126, 79], frames: ['open'] },
  { id: 'pad.bench', footprint: [2.6, 2.0], bounds: [-55, -32, 110, 67], frames: ['open'] },
  { id: 'pad.crucible', footprint: [3.6, 2.8], bounds: [-75, -42, 150, 88], frames: ['open'] },
  { id: 'pad.ghost', footprint: [1.6, 1.0], bounds: [-34, -16, 68, 32], frames: ['dash'] },
];

const PADS: Record<string, [number, number]> = { 'pad.strip': [3.0, 2.4], 'pad.bench': [2.6, 2.0], 'pad.crucible': [3.6, 2.8] };

/** One decal round its centre. */
export function drawGroundDecal(c: SkCanvas, v: View3q, id: string, frame = 0): void {
  switch (id) {
    case 'oil':
      drawOilStain(c, v, 0, 0, [0.6, 0.45, 0.35][frame] ?? 0.5, 3 + frame);
      return;
    case 'puddle':
      drawPuddle(c, v, 0, 0, frame ? 0.7 : 0.95, frame ? 0.45 : 0.55, 4 + frame);
      return;
    case 'weeds':
      drawWeeds(c, 0, 2, frame + 1, 0.8 + frame * 0.15);
      return;
    case 'line.ew':
      drawPaintLine(c, v, -0.7, 0, 0.7, 0, 0.12);
      return;
    case 'line.ns':
      drawPaintLine(c, v, 0, -0.7, 0, 0.7, 0.12);
      return;
    case 'hatch': {
      const [ax, ay] = proj(v, -0.75, -0.2, 0);
      const [bx, by] = proj(v, 0.75, 0.2, 0);
      const p = rect(ax, ay, bx - ax, by - ay);
      c.save();
      c.clipPath(p, ClipOp.Intersect, true);
      c.drawPath(p, fill(YARD.linePaint));
      for (let x = ax - 12; x < bx + 12; x += 8) c.drawPath(segment(x, by + 1, x + (by - ay) + 2, ay - 1), stroke(YARD.ink, 3.6, 0.85));
      c.restore();
      return;
    }
    case 'corner': {
      const sx = frame === 1 || frame === 2 ? -1 : 1;
      const sy = frame >= 2 ? -1 : 1;
      const [x0, y0] = proj(v, -sx * 0.3, -sy * 0.3, 0);
      const [x1] = proj(v, sx * 0.3, 0, 0);
      const [, y1] = proj(v, 0, sy * 0.3, 0);
      c.drawPath(builder().moveTo(x1, y0).lineTo(x0, y0).lineTo(x0, y1).build(), stroke(YARD.linePaint, 3.2));
      return;
    }
    case 'pad.ghost': {
      const [ax, ay] = proj(v, -0.8, -0.5, 0);
      const [bx, by] = proj(v, 0.8, 0.5, 0);
      const s = stroke(YARD.inkSoft, 1.4, 0.6);
      s.setPathEffect(Skia.PathEffect.MakeDash([5, 4], 0));
      c.drawPath(rect(ax, ay, bx - ax, by - ay), s);
      return;
    }
    default: {
      const pad = PADS[id];
      if (!pad) return;
      const [w, d] = pad;
      const [ax, ay] = proj(v, -w / 2, -d / 2, 0);
      const [bx, by] = proj(v, w / 2, d / 2, 0);
      // a clean poured slab a shade lighter, its 3 pt front lip, a painted border and hazard corners
      c.drawPath(rect(ax, ay, bx - ax, by - ay + 3), fill(YARD.concreteDark));
      c.drawPath(rect(ax, ay, bx - ax, by - ay), fill(YARD.concreteLight));
      c.drawPath(rect(ax, ay, bx - ax, by - ay + 3), stroke(YARD.ink, 1, 0.6));
      const e = 0.14 * v.ppm;
      c.drawPath(rect(ax + e, ay + e * v.tilt, bx - ax - 2 * e, by - ay - 2 * e * v.tilt), stroke(YARD.linePaint, 2.4));
      const k = 0.45 * v.ppm;
      for (const [cx, cy, dx, dy] of [[ax, ay, 1, 1], [bx, ay, -1, 1], [ax, by, 1, -1], [bx, by, -1, -1]]) {
        const tri = builder().moveTo(cx, cy).lineTo(cx + dx * k, cy).lineTo(cx, cy + dy * k * v.tilt).close().build();
        c.save();
        c.clipPath(tri, ClipOp.Intersect, true);
        c.drawPath(tri, fill(YARD.hivis));
        for (let x = cx - k; x < cx + k; x += 5) c.drawPath(segment(x, cy + k, x + k, cy - k), stroke(YARD.ink, 2.2));
        c.restore();
      }
    }
  }
}

/**
 * The low sun's tint over the whole yard, drawn by the world under the sprites as one rectangle across
 * the screen: warm from the west, clear in the middle, a faint cool to the east (stops for a linear
 * gradient from the screen's left to its right).
 */
export const SUN_WASH = { colors: ['rgba(255,214,150,0.22)', 'rgba(255,214,150,0)', 'rgba(46,58,82,0.06)'], stops: [0, 0.55, 1] } as const;
