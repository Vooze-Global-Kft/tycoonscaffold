import { describe, expect, it } from 'vitest';
import type { FieldLayout } from '../layout';
import { dropTarget, flickTarget, onRack, releaseVelocity, type Sample } from './gestureMath';

// A hand-made layout (independent of fieldLayout's numbers): station at the bottom, four rocks.
const rect = { x: 0, y: 0, width: 0, height: 0 };
const layout: FieldLayout = {
  width: 390,
  height: 844,
  compact: false,
  station: { x: 195, y: 590, r: 40 },
  rack: {
    left: { x: 90, y: 584, width: 70, height: 44 },
    right: { x: 230, y: 584, width: 70, height: 44 },
  },
  radii: [110, 190],
  rocks: [
    { slot: 0, ring: 0, x: 107, y: 524, r: 26 },
    { slot: 1, ring: 0, x: 283, y: 524, r: 26 },
    { slot: 2, ring: 1, x: 83, y: 436, r: 26 },
    { slot: 3, ring: 1, x: 195, y: 400, r: 26 },
  ],
  chips: [],
  zones: {
    strip: rect,
    comms: rect,
    field: rect,
    bay: rect,
    counter: rect,
    hold: rect,
    flare: rect,
    launch: rect,
    rail: [],
  },
};
const all = () => true;

const stroke = (x0: number, y0: number, x1: number, y1: number, ms: number, n = 6): Sample[] =>
  Array.from({ length: n + 1 }, (_, i) => ({
    x: x0 + ((x1 - x0) * i) / n,
    y: y0 + ((y1 - y0) * i) / n,
    t: (ms * i) / n,
  }));

describe('drop target', () => {
  it('locks onto the nearest accepted rock within 40 pt', () => {
    expect(dropTarget({ x: 110, y: 530 }, layout, all)).toBe(0);
    expect(dropTarget({ x: 195, y: 440 }, layout, all)).toBe(3);
    expect(dropTarget({ x: 195, y: 470 }, layout, all)).toBe(null);
  });
  it('skips rocks the caller refuses (unclaimed)', () => {
    expect(dropTarget({ x: 110, y: 530 }, layout, (s) => s !== 0)).toBe(null);
  });
});

describe('flick', () => {
  it('a fast stroke picks the nearest rock within 15° of its motion', () => {
    // From the rack straight up toward slot 3 (195, 400), released at (195, 540).
    expect(flickTarget(stroke(195, 580, 195, 540, 60), layout, all)).toBe(3);
    // Up and to the left, toward slot 2.
    const s = stroke(160, 592, 140, 552, 40);
    expect(flickTarget(s, layout, all)).toBe(2);
  });
  it('a slow stroke is no flick', () => {
    expect(flickTarget(stroke(195, 580, 195, 560, 200), layout, all)).toBe(null);
  });
  it('aimed between rocks (more than 15° off every one) picks nothing', () => {
    // Straight right from (150, 560): no rock lies within 15° of +x.
    expect(flickTarget(stroke(120, 560, 150, 560, 30), layout, all)).toBe(null);
  });
  it('only claimed rocks count', () => {
    expect(flickTarget(stroke(195, 580, 195, 540, 60), layout, (s) => s !== 3)).toBe(null);
  });
  it('velocity uses only the last 80 ms', () => {
    const slowThenFast: Sample[] = [
      { x: 0, y: 0, t: 0 },
      { x: 0, y: -2, t: 300 },
      { x: 0, y: -42, t: 380 },
    ];
    const v = releaseVelocity(slowThenFast)!;
    expect(v.speed).toBeCloseTo(0.5, 5);
  });
});

describe('rack', () => {
  it('is its two arms', () => {
    expect(onRack({ x: 100, y: 600 }, layout)).toBe(true);
    expect(onRack({ x: 195, y: 600 }, layout)).toBe(false);
  });
});
