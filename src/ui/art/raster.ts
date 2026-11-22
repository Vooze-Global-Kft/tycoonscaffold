/**
 * Part pictures turned into images, once per look and pixel density.
 *
 * A vector picture is tessellated again on every frame it is drawn; a full room has about 600 part
 * drawings per frame. An image is one textured quad. So each part of a character (and the trays,
 * dishes and props it carries) is drawn once into an offscreen raster surface at the size it will be
 * shown, with a transparent margin so rotated edges stay clean, and the scene draws that image with
 * the same matrix the rig already produces.
 *
 * Fails safe: if a surface or snapshot cannot be made (or throws), that part keeps its vector picture,
 * and the failure is remembered so nothing retries on every render.
 */
import { FilterMode, MipmapMode, Skia, type SkImage, type SkPicture } from '@shopify/react-native-skia';
import { PixelRatio } from 'react-native';
import { pictureBounds } from './draw';

/** An image of a picture and where it sits in the picture's own units. */
export interface PartImage {
  image: SkImage;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Smooth when shrunk, turned or stretched a little. */
export const PART_SAMPLING = { filter: FilterMode.Linear, mipmap: MipmapMode.Linear } as const;

/** Transparent margin round each part, in pixels of the image. */
const MARGIN_PX = 2;
/** Images larger than this on a side are not worth it (and close-ups look better as vectors). */
const MAX_SIDE = 512;

/** Turns off rasterising for the rest of the session after a hard failure (no retry every render). */
let broken = false;

/**
 * Pixels per drawing unit to rasterise at, for a character shown at `scale` (1 = UNIT px per unit):
 * a little above what is shown (parts stretch and squash by up to ~15%), rounded up in steps so a
 * handful of densities cover every screen. Null when the drawing is too big to be worth an image.
 */
export function rasterDensity(unit: number, scale: number): number | null {
  const dpr = Math.min(3, Math.max(1, PixelRatio.get()));
  const ppu = unit * scale * dpr * 1.15;
  if (!(ppu > 0) || ppu > 4) return null;
  return Math.max(0.5, Math.ceil(ppu * 4) / 4);
}

/** An image of `picture` at `ppu` pixels per unit, or null (then draw the picture). */
export function rasterize(picture: SkPicture, ppu: number): PartImage | null {
  if (broken) return null;
  const b = pictureBounds(picture);
  if (!b || !(b.r > b.l) || !(b.b > b.t)) return null;
  const m = MARGIN_PX / ppu;
  const x = b.l - m;
  const y = b.t - m;
  const width = b.r - b.l + 2 * m;
  const height = b.b - b.t + 2 * m;
  const pw = Math.ceil(width * ppu);
  const ph = Math.ceil(height * ppu);
  if (pw > MAX_SIDE || ph > MAX_SIDE) return null;
  try {
    const surface = Skia.Surface.Make(pw, ph);
    if (!surface) {
      broken = true;
      return null;
    }
    try {
      const c = surface.getCanvas();
      // Exactly pw x ph pixels for width x height units: the image maps back onto the same rectangle.
      c.scale(pw / width, ph / height);
      c.translate(-x, -y);
      c.drawPicture(picture);
      surface.flush();
      const image = surface.makeImageSnapshot();
      return image ? { image, x, y, width, height } : null;
    } finally {
      surface.dispose();
    }
  } catch {
    broken = true;
    return null;
  }
}

/**
 * Images for a set of pictures at one density, made on first use. `dispose()` frees them (the owning
 * cache calls it on the same delayed schedule as the pictures, so no mounted canvas still draws them).
 */
export class RasterSet {
  private byDensity = new Map<number, Map<SkPicture, PartImage | null>>();
  private disposed = false;

  /** The image for `picture` at `ppu`, or null to draw the vector picture. */
  get(picture: SkPicture, ppu: number): PartImage | null {
    if (this.disposed) return null;
    let set = this.byDensity.get(ppu);
    if (!set) {
      set = new Map();
      this.byDensity.set(ppu, set);
    }
    if (set.has(picture)) return set.get(picture) ?? null;
    const img = rasterize(picture, ppu);
    set.set(picture, img);
    return img;
  }

  dispose() {
    this.disposed = true;
    for (const set of this.byDensity.values()) for (const img of set.values()) img?.image.dispose();
    this.byDensity.clear();
  }
}

/** Images of pictures that live for the whole session (shared props, dishes): never freed. */
export const lasting = new RasterSet();
