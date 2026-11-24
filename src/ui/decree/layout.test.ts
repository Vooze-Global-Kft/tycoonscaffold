/**
 * deskLayout (spec 4.1): the zones add up to the screen at 375 × 667 (insets 20/0) and 390 × 844
 * (47/34), at font scale 1.0 and 1.3, with 4.1's numbers; the paper is centred at 343; the fixed
 * widths fit; targets are at least 44 tall where 4.1 gives them room.
 */
import { describe, expect, it } from 'vitest';
import { measure } from '../../../scripts/content/office/fit';
import { DESK_FONT, STICKY_LINE, deskLayout, deskParts } from './layout';
import { S } from './strings';

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

describe('deskParts (the desk package’s own parts inside 4.1’s zones)', () => {
  for (const size of SIZES) {
    for (const fontScale of [1.0, 1.3]) {
      it(`${size.w} × ${size.h} at ${fontScale}: the out-tray band holds the door, the tray and the sticky note side by side; the drawer under the paper`, () => {
        const l = deskLayout(size.w, size.h, { top: size.top, bottom: size.bottom }, fontScale);
        const p = deskParts(l);
        const inBand = (r: { x: number; y: number; w: number; h: number }) => {
          expect(r.y).toBeGreaterThanOrEqual(l.outTray.y);
          expect(r.y + r.h).toBeLessThanOrEqual(l.outTray.y + l.outTray.h);
          expect(r.x).toBeGreaterThanOrEqual(0);
          expect(r.x + r.w).toBeLessThanOrEqual(size.w);
        };
        [p.door, p.glass, p.outTray, p.sticky, p.stickyText].forEach(inBand);
        expect(p.outTray.x).toBeGreaterThanOrEqual(p.door.x + p.door.w);
        expect(p.sticky.x).toBeGreaterThanOrEqual(p.outTray.x + p.outTray.w);
        expect(p.drawer).toEqual({ x: l.paper.x, y: l.drawer.y, w: l.paper.w, h: l.drawer.h });
        expect(p.drawerLabel.y).toBeGreaterThanOrEqual(p.drawer.y);
        expect(p.drawerLabel.y + p.drawerLabel.h).toBeLessThanOrEqual(p.drawer.y + p.drawer.h);
        for (const r of [p.slip, p.pill]) {
          expect(r.x).toBeGreaterThanOrEqual(l.paper.x);
          expect(r.y + r.h).toBeLessThanOrEqual(l.paper.y + l.paper.h);
        }
        // the take-back pill is a touch target of at least 44 pt
        expect(Math.min(p.pill.w, p.pill.h)).toBeGreaterThanOrEqual(44);
        expect(p.font.glass).toBeCloseTo(DESK_FONT.glass * fontScale, 9);
      });
    }
  }

  it('the desk’s small words fit their boxes at font scale 1.3 on 375 × 667 (the content desk’s glyph table)', () => {
    const l = deskLayout(375, 667, { top: 20, bottom: 0 }, 1.3);
    const p = deskParts(l);
    const bold = (t: string, f: number) => measure(t, f) * 1.06;
    expect(bold(S.desk.nextVisitor(S.desk.clock(359)), p.font.glass)).toBeLessThanOrEqual(p.glass.w);
    expect(bold(S.desk.drawerLabel('10,000'), p.font.drawerLabel)).toBeLessThanOrEqual(p.drawerLabel.w);
    expect(bold(S.desk.takeBack, p.font.pill)).toBeLessThanOrEqual(p.pill.w - 24);
    expect(2 * Math.round(p.font.sticky * STICKY_LINE)).toBeLessThanOrEqual(p.stickyText.h);
    // the band's sticky: "Next: <surname>" (the register's longest surname, 10 letters; a longer one shrinks to fit) / "is back."
    expect(bold(S.desk.stickyBack('Muchpuddle'), p.font.sticky)).toBeLessThanOrEqual(p.stickyText.w);
    // the empty desk's sticky: the next goal, a 28-letter ministry, and its price and time
    expect(bold(S.desk.stickyOpen('Signposts & Lampposts Board'), p.font.deskSticky)).toBeLessThanOrEqual(2 * p.deskStickyText.w);
    expect(bold(`999.9M${S.desk.join}about 59 min`, p.font.deskSticky)).toBeLessThanOrEqual(p.deskStickyText.w);
    expect(3 * Math.round(p.font.deskSticky * STICKY_LINE)).toBeLessThanOrEqual(p.deskStickyText.h);
  });
});
