/**
 * Measurements of the contact sheet (spec 4.6, 10.1 item 11): the share of red pixels on a mock
 * screen (red must stay under 10 %), and how far apart two pictures are in greyscale (every tier
 * of a chain must be told from its neighbours without colour). Plain maths on RGBA bytes: no Skia.
 */
import { luma } from './palette';

/**
 * Whether an sRGB pixel reads as red: hue within 18 degrees of pure red, saturation at least 0.45,
 * value at least 0.35 (the accent #C8423B is hue 3, saturation 0.70, value 0.78; the brass, amber,
 * rose and wood of the kit fall outside).
 */
export function isRed(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max < 0.35 * 255 || max === 0) return false;
  const s = (max - min) / max;
  if (s < 0.45 || max !== r) return false;
  const h = ((g - b) / (max - min)) * 60;
  const hue = (h + 360) % 360;
  return hue <= 18 || hue >= 342;
}

/** The share 0..1 of red pixels (`isRed`) among the opaque pixels of an RGBA buffer. */
export function redShare(rgba: Uint8Array | Uint8ClampedArray | number[]): number {
  let red = 0;
  let all = 0;
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] < 128) continue;
    all++;
    if (isRed(rgba[i], rgba[i + 1], rgba[i + 2])) red++;
  }
  return all ? red / all : 0;
}

/** Luminance (0..255) of each pixel of an RGBA buffer, alpha composited over `bg` luminance. */
export function lumaOf(rgba: Uint8Array | Uint8ClampedArray | number[], bg = 0): Float32Array {
  const out = new Float32Array(rgba.length / 4);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j++) {
    const a = rgba[i + 3] / 255;
    out[j] = luma(rgba[i], rgba[i + 1], rgba[i + 2]) * a + bg * (1 - a);
  }
  return out;
}

/**
 * How different two same-sized pictures are in greyscale: the mean absolute luminance difference
 * (0..255) over all pixels, and the share of pixels that differ by more than 24 levels.
 */
export function greyDistance(a: Float32Array, b: Float32Array): { mean: number; changed: number } {
  let sum = 0;
  let changed = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const d = Math.abs(a[i] - b[i]);
    sum += d;
    if (d > 24) changed++;
  }
  return { mean: n ? sum / n : 0, changed: n ? changed / n : 0 };
}

/** Pass marks for neighbouring tiers in greyscale at 47 pt (the gate's own bar; see README). */
export const GREY_MIN_CHANGED = 0.08;
