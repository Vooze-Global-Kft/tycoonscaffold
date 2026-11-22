import { describe, expect, it } from 'vitest';
import type { FieldLayout } from '../layout';
import { FLOATER_RISE, claimChipRect, dropTarget, floaterSpot, fingerOf, flickTarget, onRack, releaseVelocity, type Sample } from './gestureMath';

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

describe('the claim chip (play-0, play-21)', () => {
  const L: FieldLayout = { ...layout, zones: { ...layout.zones, comms: { x: 16, y: 111, width: 358, height: 24 }, bay: { x: 0, y: 636, width: 390, height: 208 } } };
  const overlaps = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) =>
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
  it('sits on its own slot when that covers no other rock or label', () => {
    const r = claimChipRect(L, 3, 17)!;
    expect(r.width).toBe(128);
    expect(r.y + r.height / 2).toBeCloseTo(400);
    // Its own slot is under it, so a tap on the chip is also a tap on the slot.
    expect(r.x <= 195 && r.x + r.width >= 195).toBe(true);
  });
  it('never covers another slot or the label under it, when a free place exists', () => {
    for (const slot of [0, 1, 2, 3]) {
      const r = claimChipRect(L, slot, 17)!;
      for (const o of L.rocks) {
        if (o.slot === slot) continue;
        expect(overlaps(r, { x: o.x - 30, y: o.y - o.r, width: 60, height: 2 * o.r + 18 })).toBe(false);
      }
    }
  });
  it('stays on screen', () => {
    for (const slot of [0, 1, 2, 3]) {
      const r = claimChipRect(L, slot, 17)!;
      expect(r.x).toBeGreaterThanOrEqual(12);
      expect(r.x + r.width).toBeLessThanOrEqual(L.width - 12);
    }
  });
});

describe('the drop floater (play:new:8)', () => {
  // The first drop of a fresh game (s/f01.png): the dropped rock at (108, 555), a ghost at (83, 470)
  // whose price label sits under its circle, another ghost at (283, 557).
  const rocks = [
    { ...layout.rocks[0], slot: 0, x: 108, y: 555, r: 25 },
    { ...layout.rocks[0], slot: 1, x: 83, y: 470, r: 26 },
    { ...layout.rocks[0], slot: 2, x: 283, y: 557, r: 26 },
  ];
  const L: FieldLayout = { ...layout, rocks, zones: { ...layout.zones, comms: { x: 16, y: 111, width: 358, height: 24 }, bay: { x: 0, y: 670, width: 390, height: 174 } } };
  const pathOf = (p: { x: number; y: number }, w: number, row: number) => ({ x: p.x - w / 2, y: p.y - row / 2 - FLOATER_RISE, width: w, height: row + FLOATER_RISE });
  const hits = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) =>
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
  it('never rises over another slot or its price label when a free place exists', () => {
    const p = floaterSpot(L, 0, 80, 17)!;
    for (const o of rocks.slice(1)) expect(hits(pathOf(p, 80, 17), { x: o.x - 30, y: o.y - o.r, width: 60, height: 2 * o.r + 18 })).toBe(false);
  });
  it('rises over its rock when that is clear', () => {
    const p = floaterSpot(L, 2, 80, 17)!;
    expect(p).toEqual({ x: 283, y: 557 - 26 - 14 });
  });
});

describe('the finger that started a gesture (phone-2)', () => {
  const ev = (changed: { identifier: number; pageX: number; pageY: number }[]) => ({ pageX: changed[0].pageX, pageY: changed[0].pageY, timestamp: 5, changedTouches: changed });
  it('follows its own identifier, not the first changed touch', () => {
    const f = fingerOf(ev([{ identifier: 2, pageX: 300, pageY: 300 }, { identifier: 1, pageX: 10, pageY: 20 }]), 1);
    expect(f?.p).toEqual({ x: 10, y: 20 });
  });
  it('ignores an event about other fingers only', () => {
    expect(fingerOf(ev([{ identifier: 2, pageX: 300, pageY: 300 }]), 1)).toBeNull();
  });
  it('uses the event point without identifiers (a mouse)', () => {
    expect(fingerOf({ pageX: 7, pageY: 8 }, undefined)?.p).toEqual({ x: 7, y: 8 });
  });
});
