/**
 * Measurements of the contact sheet (office-design.md 4.2, 4.6): the share of brick pixels on a
 * screen (brick is only for boycott and scandal words, under 8 %), whether a pair of colours reads as
 * green-and-red (approve and refuse never may), and greyscale distances. Plain maths on RGBA bytes.
 */
import { DESK, luma, rgbOf } from './palette';

const BRICK = rgbOf(DESK.brick);
/** RGB distance within which a pixel counts as brick (the club terracotta #C0704E is 34 away and does not). */
export const BRICK_RADIUS = 28;
export const BRICK_MAX_SHARE = 0.08;

export function isBrick(r: number, g: number, b: number): boolean {
  return Math.hypot(r - BRICK[0], g - BRICK[1], b - BRICK[2]) <= BRICK_RADIUS;
}

/** The share 0..1 of brick pixels among the opaque pixels of an RGBA buffer. */
export function brickShare(rgba: Uint8Array | Uint8ClampedArray | number[]): number {
  let n = 0;
  let all = 0;
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] < 128) continue;
    all++;
    if (isBrick(rgba[i], rgba[i + 1], rgba[i + 2])) n++;
  }
  return all ? n / all : 0;
}

/** Hue (degrees), saturation and value of an sRGB colour (0..255 channels). */
export function hsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) * 60;
    else if (max === g) h = ((b - r) / d) * 60 + 120;
    else h = ((r - g) / d) * 60 + 240;
  }
  return { h: (h + 360) % 360, s: max ? d / max : 0, v: max / 255 };
}

/** Reads as a green (hue 75 to 165 degrees, saturation at least 0.2). */
export function isGreenish(hex: string): boolean {
  const [r, g, b] = rgbOf(hex);
  const c = hsv(r, g, b);
  return c.s >= 0.2 && c.h >= 75 && c.h <= 165;
}

/** Reads as a red (hue within 20 degrees of red, saturation at least 0.35). */
export function isReddish(hex: string): boolean {
  const [r, g, b] = rgbOf(hex);
  const c = hsv(r, g, b);
  return c.s >= 0.35 && (c.h <= 20 || c.h >= 340);
}

/** True when a pair (approve, refuse) is green-and-red in either order: the pair 4.2 forbids. */
export function isGreenRedPair(a: string, b: string): boolean {
  return (isGreenish(a) && isReddish(b)) || (isReddish(a) && isGreenish(b));
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

/** Mean absolute luminance difference (0..255) and the share of pixels differing by more than 24 levels. */
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

/** The pass mark for two icons told apart in greyscale at 18 pt. */
export const GREY_MIN_CHANGED = 0.12;
