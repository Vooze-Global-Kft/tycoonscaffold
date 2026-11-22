/**
 * Asteroids and what comes off them: rocks (seeded shapes, tinted per ore), crack overlays,
 * the dry rock, bonanza flecks, ore chunks, piles and crumble shards. Pure drawing functions.
 *
 * Every rock function draws centred on the origin at radius `r` (22 to 26 pt on the map);
 * the light comes from the upper left of the sprite.
 */
import type { SkCanvas, SkPath, SkPicture } from '@shopify/react-native-skia';
import { ORE, SPACE, alpha, mix, oreColor, shade } from './palette';
import { LINE, TAU, around, blob, builder, clip, fill, glow, litStroke, picture, poly, seeded, stroke } from './pen';

/** Number of distinct rock silhouettes. A rock picks one with `rockShapeIndex`. */
export const ROCK_SHAPES = 8;

/** Which of the ROCK_SHAPES silhouettes the rock `n` of `slot` uses (stable). */
export function rockShapeIndex(slot: number, n: number): number {
  let h = (slot * 73856093) ^ (n * 19349663);
  h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);
  return ((h ^ (h >>> 15)) >>> 0) % ROCK_SHAPES;
}

/** The half-size of the box a rock of radius r needs, glow included. */
export function rockBox(r: number): number {
  return Math.ceil(r * 1.22 + 4);
}

interface RockGeo {
  outline: SkPath;
  pts: [number, number][];
  craters: { x: number; y: number; r: number }[];
  veins: number[][];
  facet: SkPath;
  rnd: () => number;
}

function rockGeo(shape: number, r: number): RockGeo {
  const rnd = seeded(1000 + shape * 7919);
  const n = 11 + Math.floor(rnd() * 4);
  const pts: [number, number][] = [];
  const squash = 0.86 + rnd() * 0.14;
  const tilt = rnd() * TAU;
  for (let i = 0; i < n; i++) {
    const a = (TAU * i) / n + (rnd() - 0.5) * 0.25;
    // A few deep bites and flat faces make it read as a rock, not a potato.
    let k = 0.78 + rnd() * 0.26;
    if (rnd() < 0.22) k -= 0.16;
    const x = Math.cos(a) * k * r;
    const y = Math.sin(a) * k * r * squash;
    pts.push([x * Math.cos(tilt) - y * Math.sin(tilt), x * Math.sin(tilt) + y * Math.cos(tilt)]);
  }
  const outline = blob(pts, 0.55);
  // The lit facet: the upper-left part of the outline pulled inward.
  const facetPts: [number, number][] = pts.map(([x, y]) => {
    const toward = (x + y) / (r * 1.4); // negative on the upper left
    const k = toward < 0 ? 0.92 : 0.35;
    return [x * k - r * 0.12, y * k - r * 0.12];
  });
  const facet = blob(facetPts, 0.6);
  const craters: RockGeo['craters'] = [];
  const nc = 3 + Math.floor(rnd() * 3);
  for (let i = 0; i < nc; i++) {
    const a = rnd() * TAU;
    const d = rnd() * r * 0.55;
    craters.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, r: r * (0.08 + rnd() * 0.12) });
  }
  const veins: number[][] = [];
  const nv = 2 + Math.floor(rnd() * 2);
  for (let i = 0; i < nv; i++) {
    const a = rnd() * TAU;
    const d = r * (0.2 + rnd() * 0.4);
    let x = Math.cos(a) * d;
    let y = Math.sin(a) * d;
    const v = [x, y];
    const dir = rnd() * TAU;
    for (let s = 0; s < 3; s++) {
      const da = dir + (rnd() - 0.5) * 1.2;
      x += Math.cos(da) * r * 0.16;
      y += Math.sin(da) * r * 0.16;
      v.push(x, y);
    }
    veins.push(v);
  }
  return { outline, pts, craters, veins, facet, rnd };
}

export interface RockOptions {
  /** Silhouette 0..ROCK_SHAPES-1 (see rockShapeIndex). */
  shape: number;
  /** Ore id (colour from the palette). */
  ore: string;
  /** Radius in points. Default 26 (the atlas size; scale down to 22 on small screens). */
  r?: number;
  /** Gold flecks of a bonanza rock. */
  bonanza?: boolean;
}

/** Draws a living rock (no cracks). */
export function drawRockBody(c: SkCanvas, o: RockOptions): void {
  const r = o.r ?? 26;
  const tint = oreColor(o.ore);
  const g = rockGeo(o.shape, r);
  const body = mix(shade(tint, 0.26), '#20263A', 0.35);
  // Ore haze round the rock: it reads as "this rock carries copper" before its shape does.
  glow(c, 0, 0, r * 1.25, tint, 0.22);
  c.drawPath(g.outline, fill(body));
  c.save();
  clip(c, g.outline);
  c.drawPath(g.facet, fill(alpha(mix(body, tint, 0.28), 0.9)));
  // Shadow side, lower right.
  c.drawCircle(r * 0.55, r * 0.6, r * 0.75, fill(alpha('#000000', 0.28)));
  for (const k of g.craters) {
    // A crater: dark bowl, its lit far wall a crescent toward the lower right.
    c.drawCircle(k.x, k.y, k.r, fill(alpha(mix(tint, '#FFFFFF', 0.2), 0.22)));
    c.drawCircle(k.x - k.r * 0.22, k.y - k.r * 0.22, k.r * 0.85, fill(alpha('#000000', 0.42)));
  }
  for (const v of g.veins) {
    const p = poly(v, false);
    c.drawPath(p, stroke(alpha(tint, 0.35), 3.2));
    c.drawPath(p, stroke(mix(tint, '#FFFFFF', 0.25), 1.2));
  }
  // Crystal glints at the vein ends.
  for (const v of g.veins) {
    const x = v[v.length - 2];
    const y = v[v.length - 1];
    c.drawPath(diamond(x, y, 1.8), fill(mix(tint, '#FFFFFF', 0.55)));
  }
  if (o.bonanza) bonanzaFlecks(c, o.shape, r);
  c.restore();
  litStroke(c, g.outline, o.bonanza ? mix(tint, SPACE.gold, 0.6) : mix(tint, '#FFFFFF', 0.15), LINE, 0.9);
}

function bonanzaFlecks(c: SkCanvas, shape: number, r: number): void {
  const rnd = seeded(77 + shape);
  for (let i = 0; i < 9; i++) {
    const a = rnd() * TAU;
    const d = r * (0.15 + rnd() * 0.65);
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d;
    glow(c, x, y, 4.5, SPACE.gold, 0.55);
    c.drawPath(diamond(x, y, 1.4 + rnd() * 1.4), fill(SPACE.gold));
  }
}

/** Bonanza overlay for any ore's rock of `shape`: gold flecks inside and a gold rim (turns with it). */
export function drawBonanzaOverlay(c: SkCanvas, shape: number, r = 26): void {
  const g = rockGeo(shape, r);
  c.save();
  clip(c, g.outline);
  bonanzaFlecks(c, shape, r);
  c.restore();
  litStroke(c, g.outline, SPACE.gold, LINE, 0.9);
}

function diamond(x: number, y: number, s: number): SkPath {
  return poly([x, y - s * 1.3, x + s * 0.7, y, x, y + s * 1.3, x - s * 0.7, y]);
}

/** Crack lines for stage 1 (50 % life) or 2 (15 % life), as an overlay that turns with the rock. */
export function drawRockCracks(c: SkCanvas, shape: number, stage: 1 | 2, r = 26): void {
  const g = rockGeo(shape, r);
  const rnd = seeded(500 + shape * 31);
  const n = stage === 1 ? 2 : 5;
  c.save();
  clip(c, g.outline);
  for (let i = 0; i < n; i++) {
    const start = g.pts[Math.floor(rnd() * g.pts.length)];
    let x = start[0];
    let y = start[1];
    const pts = [x, y];
    const dir = Math.atan2(-y, -x) + (rnd() - 0.5) * 0.8;
    const steps = stage === 1 ? 3 : 4;
    for (let s = 0; s < steps; s++) {
      const a = dir + (rnd() - 0.5) * 1.1;
      x += Math.cos(a) * r * 0.2;
      y += Math.sin(a) * r * 0.2;
      pts.push(x, y);
    }
    const p = poly(pts, false);
    c.drawPath(p, stroke(alpha('#000000', 0.75), stage === 1 ? 2.2 : 2.8));
    c.drawPath(p, stroke(alpha('#FFFFFF', 0.35), 0.6));
  }
  c.restore();
}

/** A dry rock: grey, deeply cracked, with a dim red inner glow (pulse it with `drawDryGlow`). */
export function drawDryRock(c: SkCanvas, shape: number, r = 26): void {
  const g = rockGeo(shape, r);
  c.drawPath(g.outline, fill('#1A1C24'));
  c.save();
  clip(c, g.outline);
  c.drawPath(g.facet, fill('#262A35'));
  for (const k of g.craters) c.drawCircle(k.x, k.y, k.r, fill(alpha('#000000', 0.35)));
  c.restore();
  drawRockCracks(c, shape, 2, r);
  litStroke(c, g.outline, '#6B6F7E', LINE, 0.4);
}

/** The red inner glow of a dry rock, drawn over it at a pulsing opacity (0.5 Hz). */
export function drawDryGlow(c: SkCanvas, shape: number, r = 26): void {
  const g = rockGeo(shape, r);
  c.save();
  clip(c, g.outline);
  glow(c, r * 0.05, r * 0.05, r * 0.95, SPACE.red, 0.75);
  c.restore();
}

/** A whole rock as one picture: body, cracks for `crack` (0 none, 1 half life, 2 low). */
export function rockPicture(o: RockOptions & { crack?: 0 | 1 | 2; dry?: boolean }): SkPicture {
  const r = o.r ?? 26;
  return picture(around(rockBox(r)), (c) => {
    if (o.dry) {
      drawDryRock(c, o.shape, r);
      drawDryGlow(c, o.shape, r);
      return;
    }
    drawRockBody(c, o);
    if (o.crack) drawRockCracks(c, o.shape, o.crack, r);
  });
}

// ---------------------------------------------------------------------------
// Chunks, piles, shards
// ---------------------------------------------------------------------------

/** One ore chunk, radius about `s` (default 3.4 pt): a bright faceted lump, no machine outline. */
export function drawChunk(c: SkCanvas, ore: string, s = 3.4, seed = 0): void {
  const tint = oreColor(ore);
  const rnd = seeded(900 + seed);
  const n = 5 + Math.floor(rnd() * 2);
  const pts: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = (TAU * i) / n + rnd() * 0.4;
    const k = s * (0.75 + rnd() * 0.35);
    pts.push(Math.cos(a) * k, Math.sin(a) * k);
  }
  const p = poly(pts);
  glow(c, 0, 0, s * 2.2, tint, 0.3);
  c.drawPath(p, fill(mix(tint, '#000000', 0.35)));
  // Lit top facet.
  c.drawPath(poly([pts[pts.length - 2], pts[pts.length - 1], pts[0], pts[1], pts[2], pts[3], 0, 0]), fill(tint));
  c.drawPath(p, stroke(mix(tint, '#FFFFFF', 0.4), 0.7));
}

/** Pile sizes: 0 small, 1, 2, 3 full (chunks drawn). */
export const PILE_CHUNKS = [3, 6, 10, 15];

/** A pile of chunks of `ore` in size step 0..3, centred on the origin, about 10 to 20 pt wide. */
export function drawPile(c: SkCanvas, ore: string, step: 0 | 1 | 2 | 3): void {
  const tint = oreColor(ore);
  const n = PILE_CHUNKS[step];
  const rnd = seeded(40 + step);
  // A faint landing pad ring under the pile, so an empty spot still reads as "pile here".
  c.drawOval({ x: -11, y: -5, width: 22, height: 10 }, fill(alpha(tint, 0.1)));
  c.drawOval({ x: -11, y: -5, width: 22, height: 10 }, stroke(alpha(tint, 0.35), 0.8));
  const placed: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(Math.sqrt(i));
    const x = (rnd() - 0.5) * (8 + step * 3);
    const y = 2 - row * 2.6 + (rnd() - 0.5) * 1.5;
    placed.push([x, y, 2.3 + rnd() * 1.2]);
  }
  placed.sort((a, b) => b[1] - a[1]);
  for (const [x, y, s] of placed) {
    c.save();
    c.translate(x, y);
    drawChunk(c, ore, s, Math.round(x * 13 + y * 7));
    c.restore();
  }
}

/** One crumble shard `i` (0..7) of a rock of `ore`: a thin sliver, about 6 pt long. */
export function drawShard(c: SkCanvas, ore: string, i: number): void {
  const tint = oreColor(ore);
  const rnd = seeded(300 + i);
  const l = 4 + rnd() * 3;
  const w = 1.4 + rnd() * 1.2;
  const p = poly([-l * 0.5, -w * 0.3, l * 0.5, 0, -l * 0.3, w]);
  c.drawPath(p, fill('#2A2F3D'));
  c.drawPath(p, stroke(mix(tint, '#FFFFFF', 0.2), 0.8));
}

/** The pile label box behind "62/80", if the scene wants a backing plate. */
export function pileLabelPlate(c: SkCanvas, w: number, h: number): void {
  c.drawRRect({ rect: { x: -w / 2, y: -h / 2, width: w, height: h }, rx: h / 2, ry: h / 2 }, fill(alpha(SPACE.bg, 0.75)));
}

export { ORE };
