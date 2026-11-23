/**
 * The cast's contact sheets as pure drawings (no text: labels are the caller's), shared by the Node
 * sheets (scripts/art/decree-faces.ts) and the gallery of the dev view "decree-art".
 *
 *   castSheet      every bust in the register's order, `cols` a row, at a cell width in points
 *   toneSheet      the same parts in every skin tone: one row per part set, one column per tone
 *   portraitSheet  the six player faces in colour, then as one-colour portraits at ageing 0, 1, 2
 *   cutoutSheet    election night's cut-outs on the chalk board, and the band in silhouette
 * Each has a `...Size` function giving its size in points.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { BUST_H, BUST_W, drawBust } from './bust.draw';
import { CAST_IDS, CUTOUT_IDS, PLAYER_IDS } from './cast';
import { BAND_H, BAND_W, CUTOUT_H, CUTOUT_W, drawBand, drawCutout } from './cutout.draw';
import { GREY_MATRIX, P, TONE_IDS, fill, filtered, rrect } from './ink';
import { AGE_STEPS, PORTRAIT_INK } from './layout';

export interface GridOpts {
  /** Cell width in points (the bust is 1.25 times as tall). */
  cell: number;
  cols?: number;
  gap?: number;
  greyscale?: boolean;
  /** Left margin for row labels, top margin for column labels. */
  left?: number;
  top?: number;
}

const ratio = BUST_H / BUST_W;

function wrapGrey(c: SkCanvas, grey: boolean | undefined, draw: (c: SkCanvas) => void): void {
  if (grey) filtered(c, GREY_MATRIX, draw);
  else draw(c);
}

export function castSheetSize(o: GridOpts, ids: readonly string[] = CAST_IDS): { width: number; height: number } {
  const cols = o.cols ?? 8;
  const gap = o.gap ?? Math.max(2, o.cell * 0.08);
  const rows = Math.ceil(ids.length / cols);
  return { width: (o.left ?? 0) + cols * (o.cell + gap) + gap, height: (o.top ?? 0) + rows * (o.cell * ratio + gap) + gap };
}

/** Cell origin of the i-th bust of a cast sheet (for labels). */
export function castCell(o: GridOpts, i: number): { x: number; y: number; w: number; h: number } {
  const cols = o.cols ?? 8;
  const gap = o.gap ?? Math.max(2, o.cell * 0.08);
  return { x: (o.left ?? 0) + gap + (i % cols) * (o.cell + gap), y: (o.top ?? 0) + gap + Math.floor(i / cols) * (o.cell * ratio + gap), w: o.cell, h: o.cell * ratio };
}

export function drawCastSheet(c: SkCanvas, o: GridOpts, ids: readonly string[] = CAST_IDS): void {
  wrapGrey(c, o.greyscale, (q) => {
    ids.forEach((id, i) => {
      const b = castCell(o, i);
      drawBust(q, id, { x: b.x, y: b.y, width: b.w, height: b.h });
    });
  });
}

/** The tone sheet's rows: the six player part sets and four of the cast (every head shape, both sexes). */
export const TONE_ROWS: readonly string[] = [...PLAYER_IDS, 'kerb', 'goss', 'bellows', 'hake'];

export function toneSheetSize(o: GridOpts): { width: number; height: number } {
  return castSheetSize({ ...o, cols: TONE_IDS.length }, Array.from({ length: TONE_ROWS.length * TONE_IDS.length }, () => ''));
}

export function drawToneSheet(c: SkCanvas, o: GridOpts): void {
  const cols = TONE_IDS.length;
  wrapGrey(c, o.greyscale, (q) => {
    TONE_ROWS.forEach((id, r) =>
      TONE_IDS.forEach((tone, k) => {
        const b = castCell({ ...o, cols }, r * cols + k);
        drawBust(q, id, { x: b.x, y: b.y, width: b.w, height: b.h }, { tone });
      }),
    );
  });
}

/** Portrait sheet: per player, the colour bust, then the one-colour portrait at each ageing step. */
export function portraitSheetSize(o: GridOpts): { width: number; height: number } {
  return castSheetSize({ ...o, cols: 1 + AGE_STEPS }, Array.from({ length: PLAYER_IDS.length * (1 + AGE_STEPS) }, () => ''));
}

export function drawPortraitSheet(c: SkCanvas, o: GridOpts): void {
  const cols = 1 + AGE_STEPS;
  wrapGrey(c, o.greyscale, (q) => {
    PLAYER_IDS.forEach((id, r) => {
      const b0 = castCell({ ...o, cols }, r * cols);
      drawBust(q, id, { x: b0.x, y: b0.y, width: b0.w, height: b0.h });
      for (let age = 0; age < AGE_STEPS; age++) {
        const b = castCell({ ...o, cols }, r * cols + 1 + age);
        drawBust(q, id, { x: b.x, y: b.y, width: b.w, height: b.h }, { age, mono: PORTRAIT_INK });
      }
    });
  });
}

/** Cut-out sheet: figures `h` points tall, 10 a row, on the chalk board; the band below. */
export function cutoutSheetSize(h: number): { width: number; height: number } {
  const w = (h * CUTOUT_W) / CUTOUT_H;
  const rows = Math.ceil(CUTOUT_IDS.length / 10);
  return { width: 10 * (w + 8) + 8, height: rows * (h + 8) + 8 + h * 0.6 + 8 };
}

export function drawCutoutSheet(c: SkCanvas, h: number, o: { greyscale?: boolean } = {}): void {
  const size = cutoutSheetSize(h);
  const w = (h * CUTOUT_W) / CUTOUT_H;
  c.drawPath(rrect(0, 0, size.width, size.height, 0), fill(P.chalk));
  wrapGrey(c, o.greyscale, (q) => {
    CUTOUT_IDS.forEach((id, i) => {
      drawCutout(q, id, { x: 8 + (i % 10) * (w + 8), y: 8 + Math.floor(i / 10) * (h + 8), width: w, height: h });
    });
    const rows = Math.ceil(CUTOUT_IDS.length / 10);
    const bh = h * 0.6;
    drawBand(q, { x: 8, y: 8 + rows * (h + 8), width: (bh * BAND_W) / BAND_H, height: bh });
  });
}
