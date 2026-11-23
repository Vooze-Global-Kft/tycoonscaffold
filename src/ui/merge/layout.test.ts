/**
 * mergeLayout (spec 4.1, 10.2 `layout.test.ts`): the zones add up at both phone sizes and match
 * 4.1's table, cells are at least 44, the street parts fit. The play canvas package extends it
 * (fronts of 52 pt, the 6-line banner, reachability by the finger, fontScale 1.3).
 */
import { describe, expect, it } from 'vitest';
import { BARS, CELL_MIN, cellRect, mergeLayout, type MergeLayout } from './layout';

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
});
