/**
 * The yard's ground: two by two concrete slabs (art/ground.draw.ts drawConcrete, the style sheet's pale
 * slabs with joints, float marks, aggregate, the odd crack and weeds at some joints) baked ONCE into a
 * small image and drawn as ONE textured rectangle repeated over the whole yard (./YardView.tsx). The
 * slabs' joints fall on the image's edges, so it repeats without a seam. Decals (oil, puddles, lines,
 * pads, chalk circles) and the lane's tiles are in the manifest's ground sheet G (./atlas.ts). Pure
 * Skia; never freed (a mounted canvas may still draw it).
 */
import type { SkCanvas, SkImage } from '@shopify/react-native-skia';
import { YARD, mix, shade } from '../art/palette';
import { SLAB, drawConcrete, drawFarBand } from '../art/ground.draw';
import { fill, hash01, oval, segment, stroke } from '../art/pen';
import { bakeImage } from './atlas';
import type { YardLayout } from './yard';

/** The yard floor's colour under the tile (and before it is baked). */
export const GROUND = YARD.concrete;

export interface GroundTile {
  image: SkImage;
  density: number;
  /** The image's size in points (two slabs each way). */
  w: number;
  h: number;
}

/** Slabs per side of the baked tile. */
export const TILE_SLABS = 4;

export function bakeGround(y: YardLayout, density: number): GroundTile | null {
  const v = { ppm: y.ppm, tilt: y.tilt, lift: y.lift };
  const m = SLAB * TILE_SLABS;
  const w = m * y.ppm;
  const h = m * y.ppm * y.tilt;
  const pw = Math.max(1, Math.round(w * density));
  const ph = Math.max(1, Math.round(h * density));
  const image = bakeImage(pw, ph, (c) => {
    c.scale(pw / w, ph / h);
    drawConcrete(c, v, 0, 0, m, m, 5, true);
  });
  if (!image) return null;
  return { image, density, w, h };
}

// =====================================================================================================
// Outside the fence and over the back wall (findings P5 and L1): baked once, drawn by ./YardView.tsx
// =====================================================================================================

/** The ground outside the yard's fence, under everything (never a clear colour). */
export const OFFSITE = mix(YARD.grass, YARD.concreteDark, 0.35);
/** The off-site tile's side, metres. */
export const OFFSITE_M = 6;

/** Draws `f` at (x, y) and wrapped across the tile's edges, so a repeated tile has no seam. */
function wrapped(w: number, h: number, x: number, y: number, r: number, f: (x: number, y: number) => void): void {
  for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) if (x + dx > -r && x + dx < w + r && y + dy > -r && y + dy < h + r) f(x + dx, y + dy);
}

/** Rough ground beyond the fence: worn grass, bare earth and gravel patches, tufts. Seamless. */
export function drawOffsite(c: SkCanvas, w: number, h: number): void {
  c.drawRect({ x: 0, y: 0, width: w, height: h }, fill(OFFSITE));
  for (let k = 0; k < 14; k++) {
    const rx = 18 + hash01(21, k, 1) * 40;
    const ry = rx * 0.45;
    const col = k % 3 === 0 ? mix('#8A7457', YARD.concreteDark, 0.4) : k % 3 === 1 ? shade(OFFSITE, -0.08) : mix(YARD.grassLight, OFFSITE, 0.5);
    wrapped(w, h, hash01(21, k, 2) * w, hash01(21, k, 3) * h, rx, (x, y) => c.drawPath(oval(x, y, rx, ry), fill(col, 0.55)));
  }
  for (let k = 0; k < 160; k++) {
    const len = 3 + hash01(23, k, 4) * 4;
    const col = k % 3 ? YARD.grassLight : shade(YARD.grass, -0.2);
    wrapped(w, h, hash01(23, k, 1) * w, hash01(23, k, 2) * h, 8, (x, y) => c.drawPath(segment(x, y, x + (hash01(23, k, 3) - 0.5) * 3, y - len), stroke(col, 1.1, 0.85)));
  }
  for (let k = 0; k < 60; k++) wrapped(w, h, hash01(25, k, 1) * w, hash01(25, k, 2) * h, 3, (x, y) => c.drawCircle(x, y, 0.8 + (k % 3) * 0.4, fill(k % 2 ? '#9D9583' : '#CEC6B2', 0.8)));
}

export function bakeOffsite(y: YardLayout, density: number): GroundTile | null {
  const w = OFFSITE_M * y.ppm;
  const h = OFFSITE_M * y.ppm * y.tilt;
  const pw = Math.max(1, Math.round(w * density));
  const ph = Math.max(1, Math.round(h * density));
  const image = bakeImage(pw, ph, (c) => {
    c.scale(pw / w, ph / h);
    drawOffsite(c, w, h);
  });
  return image ? { image, density, w, h } : null;
}

/** The far band's height in points and where its horizon stands in it (hidden under the wall's top). */
export const SKY_H = 170;
export const SKY_HORIZON = SKY_H - 8;
/** The far yard moves at this share of the camera (it is far). */
export const SKY_PARALLAX = 0.3;

/** The band's width in points for a yard: the widest screen seen while driving plus the parallax's travel. */
export const skyWidth = (y: YardLayout, screenW: number) => Math.ceil(screenW / 0.75 + y.width * y.ppm * SKY_PARALLAX + 40);

/** Bakes the sky and the far yard over the back wall once (at most 4000 pixels wide). */
export function bakeSky(y: YardLayout, screenW: number, density: number): GroundTile | null {
  const w = skyWidth(y, screenW);
  const d = Math.max(1, Math.min(density, 2, 4000 / w));
  const pw = Math.round(w * d);
  const ph = Math.round(SKY_H * d);
  const image = bakeImage(pw, ph, (c) => {
    c.scale(pw / w, ph / SKY_H);
    drawFarBand(c, w, 0, SKY_HORIZON);
  });
  return image ? { image, density: d, w, h: SKY_H } : null;
}
