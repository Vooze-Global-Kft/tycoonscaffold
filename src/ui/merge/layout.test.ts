/**
 * mergeLayout (spec 4.1, 10.2 `layout.test.ts`): the zones add up at both phone sizes and match
 * 4.1's table, cells are at least 44, the street parts fit. The play canvas package extends it
 * (fronts of 52 pt, the 6-line banner, reachability by the finger, fontScale 1.3).
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { TARGET_BASKET, TARGET_COUNTER } from '../../engine/merge';
import { BARS, CELL_MIN, cellRect, mergeLayout, type MergeLayout } from './layout';
import { chipMetrics, chipTop } from './play/chipMetrics';
import { counterParts, hitGeo, hitTest, TICKET_H } from './play/geometry';

// The banner grid lives in the art kit's Skia file: Skia's own test double over CanvasKit (as art.test.ts does).
vi.mock('@shopify/react-native-skia', async () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const CanvasKitInit = require('canvaskit-wasm/bin/full/canvaskit.js');
  const CanvasKit = await CanvasKitInit({});
  (globalThis as Record<string, unknown>).CanvasKit = CanvasKit;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Module = require('node:module');
  const resolve = Module._resolveFilename;
  Module._resolveFilename = function (request: string, ...rest: unknown[]) {
    return resolve.call(this, request === 'react-native' ? 'react-native-web' : request, ...rest);
  };
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@shopify/react-native-skia/lib/commonjs/mock').Mock(CanvasKit);
  } finally {
    Module._resolveFilename = resolve;
  }
});
let bannerGrid: typeof import('./art/street.draw').bannerGrid;
beforeAll(async () => {
  bannerGrid = (await import('./art/street.draw')).bannerGrid;
}, 60_000);

const zones = (l: MergeLayout) => [l.insets.top, l.topBar.h, l.goalLine.h, l.street.h, l.spareAbove, l.board.h, l.spareBelow, l.bottomRow.h, l.insets.bottom];

describe('mergeLayout', () => {
  it('375 × 667 (insets 20 / 0): 20, 40, 20, 156, 0, 8 × 47 = 376 (329 wide), 7, 48, 0', () => {
    const l = mergeLayout(375, 667, { top: 20, bottom: 0 });
    expect(zones(l)).toEqual([20, 40, 20, 156, 0, 376, 7, 48, 0]);
    expect(zones(l).reduce((a, b) => a + b, 0)).toBe(667);
    expect(l.board.cell).toBe(47);
    expect(l.board.w).toBe(329);
    expect(l.play.scale).toBe(1);
  });

  it('390 × 844 (insets 47 / 34): 47, 40, 20, 190, 28, 8 × 51 = 408 (357 wide), 29, 48, 34', () => {
    const l = mergeLayout(390, 844, { top: 47, bottom: 34 });
    expect(zones(l)).toEqual([47, 40, 20, 190, 28, 408, 29, 48, 34]);
    expect(zones(l).reduce((a, b) => a + b, 0)).toBe(844);
    expect(l.board.cell).toBe(51);
    expect(l.board.w).toBe(357);
  });

  it('the street sits on the board: banner and tickets stand on its edge at both sizes (no empty band under them)', () => {
    for (const [w, h, t, b] of [
      [375, 667, 20, 0],
      [390, 844, 47, 34],
      [390, 844, 0, 0],
    ]) {
      const l = mergeLayout(w, h, { top: t, bottom: b });
      expect(l.banner.y + l.banner.h).toBe(l.board.y);
      for (const n of [2, 3, 4] as const) for (const r of l.counters[n]) expect(r.y + r.h).toBe(l.board.y);
    }
  });

  it('the zones are stacked without a gap or an overlap', () => {
    for (const [w, h, t, b] of [
      [375, 667, 20, 0],
      [390, 844, 47, 34],
    ]) {
      const l = mergeLayout(w, h, { top: t, bottom: b });
      expect(l.goalLine.y).toBe(l.topBar.y + l.topBar.h);
      expect(l.street.y).toBe(l.goalLine.y + l.goalLine.h);
      expect(l.board.y).toBe(l.street.y + l.street.h + l.spareAbove);
      expect(l.bottomRow.y).toBe(l.board.y + l.board.h + l.spareBelow);
      expect(l.bottomRow.y + l.bottomRow.h + b).toBe(h);
      expect(l.topBar.h + l.goalLine.h + l.bottomRow.h).toBe(BARS);
      expect(cellRect(l, 55)).toEqual({ x: l.board.x + 6 * l.board.cell, y: l.board.y + 7 * l.board.cell, w: l.board.cell, h: l.board.cell });
    }
  });

  it('cells are at least 44 pt on both phones, and the overflow rule keeps the floor', () => {
    expect(mergeLayout(375, 667, { top: 20, bottom: 0 }).board.cell).toBeGreaterThanOrEqual(CELL_MIN);
    expect(mergeLayout(390, 844, { top: 47, bottom: 34 }).board.cell).toBeGreaterThanOrEqual(CELL_MIN);
    const small = mergeLayout(375, 600, { top: 20, bottom: 0 });
    expect(small.board.cell).toBe(CELL_MIN);
    expect(small.street.h).toBeGreaterThanOrEqual(140);
  });

  it('the street fits: banner, 4 counters of 68 at 375 (360 pt) and of 72 at 390 (376 pt); the bottom row fits', () => {
    const a = mergeLayout(375, 667, { top: 20, bottom: 0 });
    expect(a.counters[4].map((c) => c.w)).toEqual([68, 68, 68, 68]);
    expect(a.counters[4][3].x + a.counters[4][3].w + 10).toBeLessThanOrEqual(375);
    expect(a.counters[4][0].x).toBeGreaterThanOrEqual(a.banner.x + a.banner.w);
    const b = mergeLayout(390, 844, { top: 47, bottom: 34 });
    expect(b.counters[4].map((c) => c.w)).toEqual([72, 72, 72, 72]);
    expect(b.counters[4][3].x + b.counters[4][3].w).toBeLessThanOrEqual(390);
    for (const l of [a, b]) {
      expect(l.fronts.every((f) => f.w >= 52)).toBe(true);
      expect(l.buttons[3].x + l.buttons[3].w).toBeLessThanOrEqual(l.width - 10);
      expect(l.basket.x).toBeGreaterThanOrEqual(10);
    }
  });

  const phones: [number, number, number, number][] = [
    [375, 667, 20, 0],
    [390, 844, 47, 34],
  ];

  it('six stall fronts of at least 52 pt fit the street with their gaps, centred', () => {
    for (const [w, h, t, b] of phones) {
      const l = mergeLayout(w, h, { top: t, bottom: b });
      expect(l.fronts).toHaveLength(6);
      for (const f of l.fronts) expect(f.w).toBeGreaterThanOrEqual(52);
      expect(l.fronts[0].x).toBeGreaterThanOrEqual(10);
      expect(l.fronts[5].x + l.fronts[5].w).toBeLessThanOrEqual(w - 10);
      for (let i = 1; i < 6; i++) expect(l.fronts[i].x).toBeGreaterThanOrEqual(l.fronts[i - 1].x + l.fronts[i - 1].w);
    }
  });

  it('the banner holds its 6-line grid below its lantern, and a 96 pt ticket fits every counter column', () => {
    for (const [w, h, t, b] of phones) {
      const l = mergeLayout(w, h, { top: t, bottom: b });
      const grid = bannerGrid(l.banner.w, l.banner.h);
      expect(grid).toHaveLength(6);
      for (const g of grid) {
        expect(g.x).toBeGreaterThanOrEqual(0);
        expect(g.x + g.size).toBeLessThanOrEqual(l.banner.w);
        expect(g.y).toBeGreaterThanOrEqual(30);
        expect(g.y + g.size).toBeLessThanOrEqual(l.banner.h - 6);
      }
      for (const n of [2, 3, 4] as const) {
        for (const r of l.counters[n]) {
          const p = counterParts(r);
          expect(p.ticket.h).toBe(TICKET_H);
          expect(p.ticket.y).toBeGreaterThanOrEqual(r.y);
          expect(p.ticket.y + p.ticket.h).toBeLessThanOrEqual(r.y + r.h);
          expect(p.ticket.x + p.ticket.w).toBeLessThanOrEqual(r.x + r.w);
        }
        // Two and three counters are centred like four.
        const cs = l.counters[n];
        const left = cs[0].x - (l.banner.x + l.banner.w);
        const right = w - (cs[n - 1].x + cs[n - 1].w);
        expect(Math.abs(left - right)).toBeLessThanOrEqual(14 + 2);
      }
    }
  });

  it('at 375 x 667 the finger reaches every bottom-row target and every top-row cell (the hit test at their centres)', () => {
    const l = mergeLayout(375, 667, { top: 20, bottom: 0 });
    const g = hitGeo(l, 4);
    expect(hitTest(l.basket.x + l.basket.w / 2, l.basket.y + l.basket.h / 2, g)).toBe(TARGET_BASKET);
    // The Basket's whole rectangle is inside the screen, and its bottom half too (a thumb at the edge).
    expect(l.basket.y + l.basket.h).toBeLessThanOrEqual(667);
    for (const r of l.buttons) expect(r.y + r.h).toBeLessThanOrEqual(667);
    for (let col = 0; col < 7; col++) {
      const r = cellRect(l, col);
      expect(hitTest(r.x + r.w / 2, r.y + r.h / 2, g)).toBe(col);
      expect(r.y).toBeGreaterThanOrEqual(l.street.y + l.street.h);
    }
    l.counters[4].forEach((r, j) => expect(hitTest(r.x + r.w / 2, r.y + r.h / 2, g)).toBe(TARGET_COUNTER + j));
  });

  it('font scale 1.3 fits: the zones do not move, and the long-press chip fits above a cell under the street', () => {
    for (const [w, h, t, b] of phones) {
      const a = mergeLayout(w, h, { top: t, bottom: b }, 1);
      const c = mergeLayout(w, h, { top: t, bottom: b }, 1.3);
      expect(zones(c)).toEqual(zones(a));
      const m = chipMetrics(1.3);
      expect(m.nameRow + m.worthRow + 12).toBe(m.h);
      // Above or below its cell, the chip stays on the board, off the street's tickets for every cell.
      for (let i = 0; i < 56; i++) {
        const r = cellRect(c, i);
        const y = chipTop(r.y + r.h / 2, r.h / 2, m.h, c.board.y);
        expect(y).toBeGreaterThanOrEqual(c.board.y);
        expect(y + m.h).toBeLessThanOrEqual(c.bottomRow.y + c.bottomRow.h);
      }
      expect(m.name).toBeGreaterThanOrEqual(16);
    }
  });
});
