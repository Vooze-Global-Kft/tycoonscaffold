/**
 * Places a raw capture in a template's picture box so the box shows a chosen band of the phone
 * screen (types.ts, BandSpec), never stretched: one scale for both axes.
 *
 * - The band is scaled to fill the box's height, up to `maxZoom` times the scale at which the
 *   screen's full width fills the box (default 1: never wider than the screen). Zoomed in, the
 *   sides are cropped around `cx`.
 * - When the box shows more than the band, `anchor` keeps the band's top, bottom or centre in place;
 *   the view never goes past the screen's edges while the screen is larger than the box.
 * - When the band is too tall for the box at full width, the band is shown whole and the screen
 *   is narrower than the box: the box's own background shows beside it; with `crop`, the band is
 *   cut instead (at full width, held at its `anchor`).
 */
import { pathToFileURL } from 'node:url';
import type { Band } from '../types';

export interface Raw {
  /** The capture file. */
  img: string;
  /** Its size in pixels. */
  w: number;
  h: number;
  /** The phone's viewport width in points (the capture is w / vw pixels per point). */
  vw: number;
}

const clamp = (lo: number, hi: number, v: number) => Math.max(lo, Math.min(hi, v));

/** The <img> for a box of bw × bh pixels (the box needs position:relative or absolute and overflow:hidden). */
export function framed(raw: Raw, band: Band | undefined, bw: number, bh: number, extraStyle = ''): string {
  const k = raw.w / raw.vw;
  const vh = raw.h / k;
  const b: Band = band ?? { y0: 0, y1: vh };
  const sW = bw / raw.vw;
  let s = bh / Math.max(1, b.y1 - b.y0);
  s = Math.min(s, sW * (b.maxZoom ?? 1));
  if (b.crop) s = Math.max(s, sW);
  const visW = bw / s;
  const visH = bh / s;
  let x0 = (b.cx ?? raw.vw / 2) - visW / 2;
  x0 = visW <= raw.vw ? clamp(0, raw.vw - visW, x0) : -(visW - raw.vw) / 2;
  const anchor = b.anchor ?? 'center';
  let y0 = anchor === 'top' ? b.y0 : anchor === 'bottom' ? b.y1 - visH : (b.y0 + b.y1) / 2 - visH / 2;
  y0 = visH <= vh ? clamp(0, vh - visH, y0) : -(visH - vh) / 2;
  const css = `position:absolute;left:${(-x0 * s).toFixed(2)}px;top:${(-y0 * s).toFixed(2)}px;width:${(raw.vw * s).toFixed(2)}px;height:${(vh * s).toFixed(2)}px;max-width:none;display:block;${extraStyle}`;
  return `<img src="${pathToFileURL(raw.img).href}" style="${css}">`;
}

/** Height in pixels the band takes at the full-width scale of a box bw wide (for boxes that size to their band). */
export function bandHeightAt(raw: Raw, band: Band | undefined, bw: number): number {
  const k = raw.w / raw.vw;
  const b: Band = band ?? { y0: 0, y1: raw.h / k };
  return (b.y1 - b.y0) * (bw / raw.vw);
}
