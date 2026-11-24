/**
 * Where each thing of a paper lies, in points from the paper's top left (spec 4.2): the chips of a
 * strip, the header's photo and words, the proposal, the signature's box. One geometry for the canvas
 * (grounds, photo, signature) and the words over it, so they always agree. Pure.
 */
import type { Rect } from '../layout';
import { CHIP_GAP, HEADER_GAP, PAD_X, PHOTO, type PaperMetrics, type StripRows } from '../paperMetrics';
import { PAPER_INNER_W } from '../layout';
import type { StripView } from './stripView';

/** Gaps between chips at density 1 and 2 (three or four to a row). */
const DENSE_GAP = 6;

export interface ChipBox extends Rect {
  key: string;
}

/** The chips' rectangles of one strip (rows as stripView placed them). */
export function chipBoxes(view: StripView, rows: StripRows): ChipBox[] {
  const cap = [2, 3, 4][view.density];
  const gap = view.density === 0 ? CHIP_GAP : DENSE_GAP;
  const unit = (PAPER_INNER_W - (cap - 1) * gap) / cap;
  const top = rows.chips[0].y;
  const area = rows.chips[1].y + rows.chips[1].h - top;
  const n = Math.max(2, view.rows.length);
  const rowH = view.rows.length <= 2 ? rows.chips[0].h : area / n;
  const out: ChipBox[] = [];
  view.rows.forEach((row, r) => {
    const y = view.rows.length <= 2 ? rows.chips[r].y : top + r * rowH;
    let x = PAD_X;
    for (const c of row) {
      const units = c.wide ? Math.min(2, cap) : 1;
      const w = units * unit + (units - 1) * gap;
      out.push({ key: c.key, x, y: y + 3, w, h: rowH - 6 });
      x += w + gap;
    }
  });
  return out;
}

/** The oval photo's slot (its top left and size) in the header. */
export function photoBox(m: PaperMetrics): Rect {
  return { x: PAD_X, y: m.header.y + Math.round((m.header.h - PHOTO.h) / 2), w: PHOTO.w, h: PHOTO.h };
}

/** The header's words column, right of the photo. */
export function headerText(m: PaperMetrics): Rect {
  const x = PAD_X + PHOTO.w + HEADER_GAP;
  return { x, y: m.header.y, w: PAPER_INNER_W - PHOTO.w - HEADER_GAP, h: m.header.h };
}

/** The proposal's box. */
export function proposalBox(m: PaperMetrics): Rect {
  return { x: PAD_X, y: m.proposal.y + 4, w: PAPER_INNER_W, h: m.proposal.h - 4 };
}
