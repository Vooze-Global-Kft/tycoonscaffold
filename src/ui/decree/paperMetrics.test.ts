/**
 * paperMetrics (spec 4.2): the paper's rows add up to the paper's height from deskLayout at both
 * phone sizes and at font scale 1.0 and 1.3; at s = 1.3 the natural rows are 4.2's 402 (≤ 405); two
 * chips fit the inner width.
 */
import { describe, expect, it } from 'vitest';
import { deskLayout, PAPER_INNER_W } from './layout';
import { CHIP_ICON, CHIP_MAX_W, CHIP_PAD, CHIP_TEXT_W, FONT, HEADER_GAP, PAD_X, PAPER_BOXES, PHOTO, STRIP_LABEL_W, TITLE_ROW_W, paperMetrics } from './paperMetrics';

describe('paperMetrics (4.2)', () => {
  it('at s = 1.3: 6 + 106 + 2 + 62 + 112 + 2 + 106 + 6 = 402', () => {
    const m = paperMetrics(402, 1.3);
    expect(m.sign.h).toBe(106);
    expect(m.refuse.h).toBe(106);
    expect(m.header.h).toBe(62);
    expect(m.proposal.h).toBe(112);
    expect(m.natural).toBe(402);
    expect(m.font.proposal).toBeCloseTo(16 * 1.3, 9);
  });

  for (const [w, h, top, bottom] of [
    [375, 667, 20, 0],
    [390, 844, 47, 34],
  ]) {
    for (const fontScale of [1.0, 1.3]) {
      it(`${w} × ${h} at ${fontScale}: the rows add up to the paper and do not overlap`, () => {
        const paper = deskLayout(w, h, { top, bottom }, fontScale).paper;
        const m = paperMetrics(paper.h, fontScale);
        expect(m.fits).toBe(true);
        expect(m.total).toBe(paper.h);
        const rows = [m.sign, m.dividerTop, m.header, m.proposal, m.dividerBottom, m.refuse];
        let y = 6;
        for (const r of rows) {
          expect(r.y).toBe(y);
          y += r.h;
        }
        expect(y + 6).toBe(paper.h);
        for (const strip of [m.sign, m.refuse]) {
          expect(strip.title.y + strip.title.h).toBe(strip.chips[0].y);
          expect(strip.chips[1].y + strip.chips[1].h).toBe(strip.note.y);
          expect(strip.note.y + strip.note.h + 4).toBe(strip.y + strip.h);
        }
        expect(m.proposal.h).toBeGreaterThanOrEqual(m.proposal.lines * m.proposal.line + 8);
      });
    }
  }

  it('two chips fit the inner width', () => {
    expect(2 * CHIP_MAX_W).toBeLessThanOrEqual(PAPER_INNER_W);
  });
});

describe('the paper’s named boxes (the content desk’s fit check reads them)', () => {
  it('lie inside the paper at 375 × 667 and 390 × 844, font scale 1.0 and 1.3', () => {
    for (const [w, h, top, bottom] of [
      [375, 667, 20, 0],
      [390, 844, 47, 34],
    ])
      for (const fs of [1, 1.3]) {
        const L = deskLayout(w, h, { top, bottom }, fs);
        const m = paperMetrics(L.paper.h, fs);
        expect(PAD_X * 2 + PAPER_INNER_W).toBe(L.paper.w);
        expect(PAPER_BOXES.title.width).toBeLessThanOrEqual(PAPER_INNER_W);
        expect(PAPER_BOXES.name.width + PHOTO.w + HEADER_GAP).toBe(PAPER_INNER_W);
        // the header holds the photo, the name row and the role row
        expect(PHOTO.h).toBeLessThanOrEqual(m.header.h);
        expect(Math.round(FONT.name * fs * 1.3) + Math.round(FONT.role * fs * 1.35) + 6).toBeLessThanOrEqual(m.header.h);
        // the proposal's 4 lines fit its row
        expect(m.proposal.lines * m.proposal.line).toBeLessThanOrEqual(m.proposal.h - 4);
        // a chip's words fit its slot beside the icon; a chip row holds the chip font
        expect(CHIP_TEXT_W + CHIP_ICON + 3 * CHIP_PAD).toBe(CHIP_MAX_W);
        expect(FONT.chip * fs * 1.2).toBeLessThanOrEqual(m.sign.chips[0].h);
        expect(FONT.title * fs * 1.2).toBeLessThanOrEqual(m.sign.title.h);
        expect(FONT.note * fs * 1.2).toBeLessThanOrEqual(m.sign.note.h);
      }
  });

  it('the side label box leaves room for the widest tail of an event’s title row', () => {
    expect(STRIP_LABEL_W).toBeLessThanOrEqual(TITLE_ROW_W - 140);
  });
});
