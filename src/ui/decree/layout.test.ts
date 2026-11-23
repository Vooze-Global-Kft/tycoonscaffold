/**
 * deskLayout (spec 4.1): the zones add up to the screen at 375 × 667 (insets 20/0) and 390 × 844
 * (47/34), at font scale 1.0 and 1.3, with 4.1's numbers; the paper is centred at 343; the fixed
 * widths fit; targets are at least 44 tall where 4.1 gives them room.
 */
import { describe, expect, it } from 'vitest';
import { deskLayout } from './layout';

const SIZES = [
  { w: 375, h: 667, top: 20, bottom: 0, zones: [20, 40, 32, 18, 36, 405, 36, 20, 60, 0] },
  { w: 390, h: 844, top: 47, bottom: 34, zones: [47, 44, 40, 20, 56, 461, 56, 22, 64, 34] },
];

describe('deskLayout (4.1)', () => {
  for (const size of SIZES) {
    for (const fontScale of [1.0, 1.3]) {
      it(`${size.w} × ${size.h} at font scale ${fontScale}: the zones of 4.1, top to bottom, adding up`, () => {
        const l = deskLayout(size.w, size.h, { top: size.top, bottom: size.bottom }, fontScale);
        const rows = [l.topBar, l.clubStrip, l.ribbon, l.outTray, l.paper, l.drawer, l.goalLine, l.bottomRow];
        expect([size.top, ...rows.map((r) => r.h), size.bottom]).toEqual(size.zones);
        let y = size.top;
        for (const r of rows) {
          expect(r.y).toBe(y);
          y += r.h;
        }
        expect(y + size.bottom).toBe(size.h);
        expect(l.paper.w).toBe(343);
        expect(l.paper.x).toBe(Math.round((size.w - 343) / 2));
        expect(l.s).toBe(fontScale);
        // The fixed widths of 4.1 fit inside the screen, left to right without overlap.
        for (const parts of [Object.values(l.bar), Object.values(l.buttons), l.clubs(7)]) {
          for (let i = 1; i < parts.length; i++) expect(parts[i].x).toBeGreaterThanOrEqual(parts[i - 1].x + parts[i - 1].w);
          expect(parts[0].x).toBeGreaterThanOrEqual(0);
          expect(parts[parts.length - 1].x + parts[parts.length - 1].w).toBeLessThanOrEqual(size.w);
        }
        // Touch targets: the bottom row's buttons are at least 44 × 44.
        for (const b of Object.values(l.buttons)) expect(Math.min(b.w, b.h)).toBeGreaterThanOrEqual(44);
      });
    }
  }

  it('caps s at 1.3', () => {
    expect(deskLayout(390, 844, { top: 47, bottom: 34 }, 2).s).toBe(1.3);
  });
});
