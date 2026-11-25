/**
 * The yard's ground: two by two concrete slabs (art/ground.draw.ts drawConcrete, the style sheet's pale
 * slabs with joints, float marks, aggregate, the odd crack and weeds at some joints) baked ONCE into a
 * small image and drawn as ONE textured rectangle repeated over the whole yard (./YardView.tsx). The
 * slabs' joints fall on the image's edges, so it repeats without a seam. Decals (oil, puddles, lines,
 * pads, chalk circles) and the lane's tiles are in the manifest's ground sheet G (./atlas.ts). Pure
 * Skia; never freed (a mounted canvas may still draw it).
 */
import type { SkImage } from '@shopify/react-native-skia';
import { YARD } from '../art/palette';
import { SLAB, drawConcrete } from '../art/ground.draw';
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
export const TILE_SLABS = 2;

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
