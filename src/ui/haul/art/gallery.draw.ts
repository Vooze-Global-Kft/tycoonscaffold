/**
 * The contact sheets of the art kit as pure data and pictures: what the dev Gallery shows and
 * what scripts/art/haul-sheets.ts writes to PNG. Each piece is shown at its real size and
 * enlarged four times beside it, with a label in the kit's stroke font.
 */
import type { SkCanvas, SkPicture } from '@shopify/react-native-skia';
import { drawText } from './glyphs';
import { SPACE, alpha } from './palette';
import { fill, picture, stroke } from './pen';

export interface Cell {
  label: string;
  /** Size of the piece's box in points, origin at the box centre. */
  w: number;
  h: number;
  draw: (c: SkCanvas) => void;
  /** Enlargement beside the real size (default 4; 0 shows the real size only). */
  zoom?: number;
}

export interface Section {
  title: string;
  cells: Cell[];
}

const PAD = 10;
const LABEL = 6;

/** Lays a section out in rows of `width` points; returns the picture and its height. */
export function sectionPicture(section: Section, width: number): { pic: SkPicture; height: number } {
  const placed: { cell: Cell; x: number; y: number; cw: number }[] = [];
  let x = PAD;
  let y = PAD + 16;
  let rowH = 0;
  for (const cell of section.cells) {
    const z = cell.zoom ?? 4;
    const cw = cell.w + (z ? PAD + cell.w * z : 0);
    const ch = Math.max(cell.h, cell.h * z) + LABEL + 8;
    if (x + cw > width - PAD && x > PAD) {
      x = PAD;
      y += rowH + PAD;
      rowH = 0;
    }
    placed.push({ cell, x, y, cw });
    x += cw + PAD * 2;
    rowH = Math.max(rowH, ch);
  }
  const height = y + rowH + PAD;
  const pic = picture({ x: 0, y: 0, w: width, h: height }, (c) => {
    c.drawRect({ x: 0, y: 0, width, height }, fill(SPACE.bg));
    drawText(c, section.title.toUpperCase(), PAD, PAD, { size: 8, color: SPACE.line });
    for (const { cell, x: cx, y: cy } of placed) {
      const z = cell.zoom ?? 4;
      const big = Math.max(cell.h, cell.h * z);
      // Real size, vertically centred on the enlarged copy.
      c.save();
      c.translate(cx + cell.w / 2, cy + big / 2);
      cell.draw(c);
      c.restore();
      c.drawRect({ x: cx, y: cy + big / 2 - cell.h / 2, width: cell.w, height: cell.h }, stroke(alpha(SPACE.steel, 0.12), 0.5));
      if (z) {
        const zx = cx + cell.w + PAD;
        c.save();
        c.translate(zx + (cell.w * z) / 2, cy + big / 2);
        c.scale(z, z);
        cell.draw(c);
        c.restore();
        c.drawRect({ x: zx, y: cy, width: cell.w * z, height: cell.h * z }, stroke(alpha(SPACE.steel, 0.12), 0.5));
      }
      drawText(c, cell.label, cx, cy + big + 4, { size: LABEL, color: SPACE.steel, glow: 0 });
    }
  });
  return { pic, height };
}
