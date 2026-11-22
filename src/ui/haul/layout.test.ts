/**
 * Field geometry (spec 4.1 and 10.2; errata 43 to 45, 49 to 51; replay table E of the errata).
 */
import { describe, expect, it } from 'vitest';
import { haulTestConfig } from '../../engine/fixtures/haul';
import { CHIP_SPACING, chipPositions, circleRect, dropTarget, fieldLayout, flickTarget, hitTest, MIN_ROCK_R, RACK_REACH, rectDistance, ROCK_TAP, type FieldLayout } from './layout';

const cfg = haulTestConfig();
const BIG = { width: 390, height: 844, insets: { top: 47, bottom: 34 } };
const SMALL = { width: 375, height: 667, insets: { top: 20, bottom: 0 } };
const big = fieldLayout(BIG, cfg, null);
const small = fieldLayout(SMALL, cfg, null);

const SPEC_390: [number, number][] = [
  [107, 524],
  [283, 524],
  [83, 436],
  [195, 400],
  [307, 436],
  [77, 348],
  [148, 325],
  [313, 348],
  [87, 258],
  [303, 258],
  [91, 174],
  [299, 174],
];
const SPEC_375: [number, number][] = [
  [117, 412],
  [258, 412],
  [98, 342],
  [188, 313],
  [277, 342],
  [93, 271],
  [150, 253],
  [282, 271],
  [101, 199],
  [274, 199],
  [104, 131],
  [271, 131],
];

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const claimedAll = (L: FieldLayout) => L.rocks.map(() => true);

describe('fieldLayout zones', () => {
  it('matches spec 4.1 at 390 x 844', () => {
    const z = big.zones;
    expect(big.compact).toBe(false);
    expect(z.strip).toEqual({ x: 16, y: 55, width: 358, height: 52 });
    expect(z.comms).toEqual({ x: 16, y: 111, width: 358, height: 24 });
    expect(z.bay.y).toBe(636);
    expect(big.station).toEqual({ x: 195, y: 590, r: 40 });
    expect(z.counter).toEqual({ x: 104, y: 644, width: 182, height: 56 });
    expect(z.hold).toMatchObject({ x: 16, y: 644, width: 76, height: 108 });
    expect(z.flare).toEqual({ x: 298, y: 644, width: 76, height: 72 });
    expect(z.launch).toEqual({ x: 104, y: 704, width: 182, height: 58 });
    expect(z.rail.map((r) => +r.x.toFixed(1))).toEqual([16, 78.8, 141.6, 204.4, 267.2, 330]);
    expect(z.rail.every((r) => r.y === 766 && r.width === 44)).toBe(true);
    expect(big.rack.left).toEqual({ x: 90, y: 584, width: 70, height: 44 });
    expect(big.rack.right).toEqual({ x: 230, y: 584, width: 70, height: 44 });
  });

  it('matches spec 4.1 at 375 x 667', () => {
    const z = small.zones;
    expect(small.compact).toBe(true);
    expect(z.strip).toEqual({ x: 16, y: 24, width: 343, height: 46 });
    expect(z.comms).toEqual({ x: 16, y: 73, width: 343, height: 22 });
    expect(z.bay.y).toBe(507);
    expect(small.station).toEqual({ x: 187.5, y: 465, r: 36 });
    expect(z.counter).toEqual({ x: 92, y: 515, width: 191, height: 50 });
    expect(z.flare).toMatchObject({ x: 295, y: 515, width: 64, height: 64 });
    expect(z.launch).toEqual({ x: 92, y: 569, width: 191, height: 50 });
    expect(z.rail.map((r) => +r.x.toFixed(1))).toEqual([16, 76.6, 137.2, 197.8, 258.4, 319]);
    expect(z.rail.every((r) => r.y === 623 && r.width === 40)).toBe(true);
    // Rack x 92 to 155 and 220 to 283, y 461 to 497 (errata 45), within 2 pt.
    expect(Math.abs(small.rack.left.x - 92)).toBeLessThan(2);
    expect(Math.abs(small.rack.left.x + small.rack.left.width - 155)).toBeLessThan(2);
    expect(Math.abs(small.rack.right.x - 220)).toBeLessThan(2);
    expect(Math.abs(small.rack.right.x + small.rack.right.width - 283)).toBeLessThan(2);
  });
});

describe('rings and rocks', () => {
  it('390 x 844: k 109.7, radii and slot positions of spec 4.1', () => {
    expect(big.radii.map((r) => Math.round(r))).toEqual([110, 190, 269, 349, 429]);
    big.rocks.forEach((r, i) => {
      expect(Math.abs(r.x - SPEC_390[i][0])).toBeLessThan(1);
      expect(Math.abs(r.y - SPEC_390[i][1])).toBeLessThan(1);
    });
    expect(big.rocks[0].r).toBeCloseTo(25.93, 1);
  });

  it('375 x 667: k 88.0, radii, slot positions and the 22 pt rock', () => {
    expect(small.radii.map((r) => Math.round(r))).toEqual([88, 152, 216, 280, 344]);
    small.rocks.forEach((r, i) => {
      expect(Math.abs(r.x - SPEC_375[i][0])).toBeLessThan(1);
      expect(Math.abs(r.y - SPEC_375[i][1])).toBeLessThan(1);
      expect(r.r).toBe(22);
    });
  });

  it('Long Haul draws the base layout (errata 49)', () => {
    expect(cfg.haul.conditions.find((c) => c.id === 'longhaul')?.distance).toBe(1.3);
    for (const [S, base] of [
      [BIG, big],
      [SMALL, small],
    ] as const) {
      const lh = fieldLayout(S, cfg, 'longhaul');
      lh.rocks.forEach((r, i) => {
        expect(r.x).toBeCloseTo(base.rocks[i].x, 6);
        expect(r.y).toBeCloseTo(base.rocks[i].y, 6);
        expect(r.r).toBeCloseTo(base.rocks[i].r, 6);
      });
      lh.chips.forEach((c, i) => expect(dist(c, base.chips[i])).toBeLessThan(1e-6));
    }
  });

  it.each([
    ['390', big, 74, 34],
    ['375', small, 0, 22],
  ] as const)('%s: no rock meets the strip, the comms slot, the rack or the bay; spacing and gutter', (_n, L, centre, rackGap) => {
    const z = L.zones;
    for (const r of L.rocks) {
      for (const rect of [z.strip, z.comms, L.rack.left, L.rack.right, z.bay]) expect(rectDistance(r, rect)).toBeGreaterThan(r.r);
      expect(r.y - r.r).toBeGreaterThan(z.comms.y + z.comms.height);
      expect(Math.min(rectDistance(r, L.rack.left), rectDistance(r, L.rack.right)) - r.r).toBeGreaterThanOrEqual(rackGap);
      expect(r.x - r.r).toBeGreaterThanOrEqual(16);
      expect(r.x + r.r).toBeLessThanOrEqual(L.width - 16);
    }
    for (let i = 0; i < L.rocks.length; i++)
      for (let j = i + 1; j < L.rocks.length; j++) {
        const d = dist(L.rocks[i], L.rocks[j]);
        expect(d).toBeGreaterThanOrEqual(centre);
        expect(d - L.rocks[i].r - L.rocks[j].r).toBeGreaterThanOrEqual(L.compact ? 15.9 : 0);
      }
  });

  it('a tall field keeps k at 110 at most, a short one shrinks it until the rocks clear the comms slot', () => {
    const tall = fieldLayout({ width: 430, height: 1200, insets: { top: 47, bottom: 34 } }, cfg, null);
    expect(tall.radii[0]).toBeLessThanOrEqual(110 + 1e-9);
    const short = fieldLayout({ width: 320, height: 560, insets: { top: 20, bottom: 0 } }, cfg, null);
    for (const r of short.rocks) expect(r.y - r.r).toBeGreaterThanOrEqual(short.zones.comms.y + short.zones.comms.height);
  });
});

describe('chips (errata 44)', () => {
  it.each([
    ['390', big, 20],
    ['375', small, 8],
  ] as const)('%s: one per slot, ≥ %s pt from every rock edge, 40 pt apart, along their route', (_n, L, clear) => {
    expect(L.chips.length).toBe(L.rocks.length);
    L.chips.forEach((c, i) => {
      expect(c.slot).toBe(i);
      for (const r of L.rocks) expect(dist(c, r) - r.r).toBeGreaterThanOrEqual(clear);
      for (let j = i + 1; j < L.chips.length; j++) expect(dist(c, L.chips[j])).toBeGreaterThanOrEqual(CHIP_SPACING);
      const rock = L.rocks[i];
      const t = dist(c, L.station) / dist(rock, L.station);
      expect(t).toBeGreaterThanOrEqual(0.25 - 1e-9);
      expect(t).toBeLessThanOrEqual(0.85 + 1e-9);
      // On the line station → rock.
      const cross = (rock.x - L.station.x) * (c.y - L.station.y) - (rock.y - L.station.y) * (c.x - L.station.x);
      expect(Math.abs(cross) / dist(rock, L.station)).toBeLessThan(1e-6);
      // Never over the station disc.
      expect(dist(c, L.station)).toBeGreaterThan(L.station.r);
    });
  });

  it('is deterministic and does not depend on what is claimed', () => {
    expect(chipPositions(big.station, big.rocks, big.rack)).toEqual(big.chips);
  });
});

describe('hitTest (errata 45)', () => {
  const claimed = claimedAll(big);
  const none = big.rocks.map(() => false);
  const rackP = { x: 125, y: 606 };

  it('rack beats everything when a drone is idle, else falls through', () => {
    expect(hitTest(rackP, big, claimed, 1)).toEqual({ kind: 'rack' });
    expect(hitTest(rackP, big, claimed, 0).kind).not.toBe('rack');
    expect(hitTest({ x: 160, y: 600 }, big, claimed, 0)).toEqual({ kind: 'station' });
  });

  it('an idle drone standing over its cradle answers up to RACK_REACH above the arm', () => {
    const above = { x: 125, y: big.rack.left.y - RACK_REACH + 2 };
    expect(hitTest(above, big, none, 1)).toEqual({ kind: 'rack' });
    expect(hitTest(above, big, none, 0).kind).not.toBe('rack');
    expect(hitTest({ x: 125, y: big.rack.left.y - RACK_REACH - 4 }, big, none, 1).kind).not.toBe('rack');
  });

  it('flare zone, chip over rock, rock over ghost, station, launch, background', () => {
    const f = big.zones.flare;
    expect(hitTest({ x: f.x + 10, y: f.y + 10 }, big, claimed, 3)).toEqual({ kind: 'flare' });
    for (const c of big.chips) expect(hitTest(c, big, claimed, 0)).toEqual({ kind: 'chip', slot: c.slot });
    // A chip of an unclaimed slot does not answer.
    const c5 = big.chips[5];
    expect(hitTest(c5, big, none, 0).kind).not.toBe('chip');
    for (const r of big.rocks) {
      expect(hitTest({ x: r.x, y: r.y }, big, claimed, 0)).toEqual({ kind: 'rock', slot: r.slot });
      expect(hitTest({ x: r.x, y: r.y }, big, none, 0)).toEqual({ kind: 'ghost', slot: r.slot });
      // Inside 1.2 × r counts.
      const edge = { x: r.x + r.r * ROCK_TAP - 0.5, y: r.y };
      if (!big.chips.some((c) => dist(c, edge) <= 20)) expect(hitTest(edge, big, claimed, 0)).toEqual({ kind: 'rock', slot: r.slot });
    }
    expect(hitTest({ x: big.station.x, y: big.station.y - 10 }, big, claimed, 4)).toEqual({ kind: 'station' });
    const l = big.zones.launch;
    expect(hitTest({ x: l.x + l.width / 2, y: l.y + l.height / 2 }, big, claimed, 0)).toEqual({ kind: 'launch' });
    expect(hitTest({ x: 20, y: 600 }, big, claimed, 0)).toEqual({ kind: 'background' });
  });
});

describe('drop and flick (spec 4.2, errata 46)', () => {
  const claimed = claimedAll(big).map((_, i) => i < 5);
  it('drops on the nearest claimed rock within 40 pt', () => {
    const r = big.rocks[3];
    expect(dropTarget({ x: r.x + 30, y: r.y }, big, claimed)).toBe(3);
    expect(dropTarget({ x: r.x + 45, y: r.y }, big, claimed)).toBe(null);
    expect(dropTarget(big.rocks[8], big, claimed)).toBe(null);
  });
  it('flicks toward the nearest claimed rock within 15°', () => {
    const from = { x: big.station.x, y: big.station.y - 50 };
    const to = big.rocks[3];
    expect(flickTarget(from, { x: to.x - from.x, y: to.y - from.y }, big, claimed)).toBe(3);
    // Straight up from the station passes slot 3 first even though slot 8 and 10 are farther out.
    expect(flickTarget(from, { x: 0, y: -1 }, big, claimedAll(big))).toBe(3);
    // 20° off: no target.
    const a = Math.atan2(to.y - from.y, to.x - from.x) + (20 * Math.PI) / 180;
    expect(flickTarget(from, { x: Math.cos(a), y: Math.sin(a) }, big, claimed)).toBe(null);
    // Unclaimed rocks are never picked.
    const up = big.rocks[10];
    expect(flickTarget(from, { x: up.x - from.x, y: up.y - from.y }, big, claimed)).toBe(null);
    expect(flickTarget(from, { x: 0, y: 0 }, big, claimed)).toBe(null);
  });
});

describe('reach rule (spec 4.1)', () => {
  it('every frequent target lies below y 520 at 390 x 844', () => {
    const z = big.zones;
    const tops = [big.rack.left.y, big.rack.right.y, z.launch.y, z.counter.y, z.flare.y, ...z.rail.map((r) => r.y)];
    for (const y of tops) expect(y).toBeGreaterThan(520);
    const ring1 = big.rocks.filter((r) => r.ring === 0).map((r) => big.chips[r.slot]);
    expect(ring1.length).toBe(2);
    for (const c of ring1) expect(c.y - 20).toBeGreaterThan(520);
  });
  it('circleRect', () => {
    expect(circleRect({ x: 10, y: 20 }, 5)).toEqual({ x: 5, y: 15, width: 10, height: 10 });
  });
});

describe('short fields (phone-7)', () => {
  const gapOf = (L: FieldLayout) => {
    let m = Infinity;
    for (let i = 0; i < L.rocks.length; i++)
      for (let j = i + 1; j < L.rocks.length; j++) m = Math.min(m, Math.hypot(L.rocks[i].x - L.rocks[j].x, L.rocks[i].y - L.rocks[j].y) - L.rocks[i].r - L.rocks[j].r);
    return m;
  };
  it('a 360 x 640 Android with three-button navigation keeps rocks apart and their tap circles separate', () => {
    for (const width of [360, 320]) {
      const L = fieldLayout({ width, height: 640, insets: { top: 24, bottom: 48 } }, cfg, null);
      expect(L.rocks[0].r).toBeGreaterThanOrEqual(MIN_ROCK_R);
      expect(gapOf(L)).toBeGreaterThanOrEqual(10);
      for (let i = 0; i < L.rocks.length; i++)
        for (let j = i + 1; j < L.rocks.length; j++) expect(Math.hypot(L.rocks[i].x - L.rocks[j].x, L.rocks[i].y - L.rocks[j].y)).toBeGreaterThan(2 * ROCK_TAP * L.rocks[i].r);
    }
  });
  it('the radius gives way only on a short field: 375 x 667 and 390 x 844 keep theirs', () => {
    expect(small.rocks[0].r).toBe(22);
    expect(big.rocks[0].r).toBeGreaterThan(25);
  });
});
