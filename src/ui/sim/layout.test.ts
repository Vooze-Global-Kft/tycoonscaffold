import { describe, expect, it } from 'vitest';
import { createChain, type Seat, type TransportWorker } from '../../engine/chain';
import {
  MAX_SEATS_DRAWN,
  RUSH_HIT_RADIUS,
  RUSH_REACH_BELOW,
  computeLayout,
  cookFrame,
  decorTiers,
  depthOrder,
  kitchenPath,
  passPile,
  pathLength,
  entrancePoint,
  guestFrame,
  passFullness,
  tableState,
  tossPoint,
  workerFrame,
  workerHome,
  workerSeat,
} from './layout';

const L = computeLayout(390, 300, 6, 8);
const inside = (p: { x: number; y: number }, w = 390, h = 300) => p.x >= 0 && p.x <= w && p.y >= 0 && p.y <= h;

describe('room layout', () => {
  it('keeps every fixture inside the room, at any size', () => {
    for (const [w, h] of [[390, 300], [375, 230], [430, 340], [768, 420]]) {
      const l = computeLayout(w, h, 6, 8);
      for (const p of [...l.stations, ...l.cooks, ...l.tables, ...l.guests, ...l.serve, l.passStack, l.bell, l.door]) expect(inside(p, w, h)).toBe(true);
      expect(l.outside.x).toBeGreaterThan(w); // people appear from beyond the door
      expect(l.pass.x + l.pass.width).toBeLessThanOrEqual(w);
    }
  });

  it('orders the zones top to bottom: wall, stations, cooks, counter, tables', () => {
    expect(L.wallHeight).toBeLessThan(L.stations[0].y);
    expect(L.stations[0].y).toBeLessThan(L.cooks[0].y);
    expect(L.cooks[0].y).toBeLessThan(L.pass.y + L.pass.height);
    for (const t of L.tables) expect(t.y).toBeGreaterThan(L.pass.y + L.pass.height);
  });

  it('spreads stations without overlap and centres a short row', () => {
    for (let i = 1; i < L.stations.length; i++) expect(L.stations[i].x - L.stations[i - 1].x).toBeGreaterThanOrEqual(L.stationSize);
    const two = computeLayout(390, 300, 2, 2);
    expect((two.stations[0].x + two.stations[1].x) / 2).toBeCloseTo(195, 5);
  });

  it('never moves a table when another is added', () => {
    const five = computeLayout(390, 300, 6, 5);
    const eight = computeLayout(390, 300, 6, 8);
    for (let k = 0; k < 5; k++) expect(five.tables[k]).toEqual(eight.tables[k]);
    // Two tables sit side by side around the middle of the dining area.
    const two = computeLayout(390, 300, 6, 2);
    expect(two.tables[0].y).toBe(two.tables[1].y);
    expect(Math.abs(two.tables[0].x - two.tables[1].x)).toBeLessThan(120);
  });

  it('tables do not overlap each other', () => {
    for (let a = 0; a < L.tables.length; a++) {
      for (let b = a + 1; b < L.tables.length; b++) {
        const d = Math.hypot(L.tables[a].x - L.tables[b].x, L.tables[a].y - L.tables[b].y);
        expect(d).toBeGreaterThan(L.tableSize);
      }
    }
  });

  it('keeps the skill button and its label off the door and the guests coming in', () => {
    for (const [w, h] of [[390, 300], [375, 220], [375, 230], [430, 340]]) {
      const l = computeLayout(w, h, 6, 8);
      const k = l.artScale;
      // The button's tap circle plus the label under it (about 72 pt wide), as one box.
      const btn = { x0: l.rush.x - 36, x1: l.rush.x + 36, y0: l.rush.y - RUSH_HIT_RADIUS, y1: l.rush.y + RUSH_REACH_BELOW };
      const inBox = (p: { x: number; y: number }) => p.x > btn.x0 && p.x < btn.x1 && p.y > btn.y0 && p.y < btn.y1;
      // The door and the stretch of wall it is set in.
      expect(btn.y1).toBeLessThan(l.entranceTop);
      // Arriving guests, feet and head, all the way from outside to their seats.
      for (let s = 0; s < l.guests.length; s++) {
        for (let t = 0; t <= 1; t += 0.05) {
          const f = guestFrame(l, { phase: 'arriving', t, guest: 1 } as Seat, s);
          expect(inBox(f)).toBe(false);
          expect(inBox({ x: f.x, y: f.y - 40 * k })).toBe(false);
        }
      }
      // And it stays clear of the counter, where the bell is tapped.
      expect(l.rush.x - RUSH_HIT_RADIUS).toBeGreaterThan(l.pass.x + l.pass.width);
    }
  });

  it('draws at most the supported number of seats', () => {
    expect(computeLayout(390, 300, 6, 40).tables).toHaveLength(MAX_SEATS_DRAWN);
    expect(computeLayout(390, 300, 6, 0).tables).toHaveLength(0);
  });

  it('gives each waiting worker their own spot along the counter', () => {
    const xs = [0, 1, 2, 3, 4, 5].map((i) => workerHome(L, i, 6).x);
    for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThan(xs[i - 1] + 20);
    expect(xs[0]).toBeGreaterThanOrEqual(L.pass.x);
    expect(xs[5]).toBeLessThanOrEqual(L.pass.x + L.pass.width);
  });
});

describe('transport workers', () => {
  const w = (phase: TransportWorker['phase'], t = 0, carry = 0): TransportWorker => ({ phase, t, carry });
  const home = workerHome(L, 0, 2);
  const target = L.serve[workerSeat(0, 8)];

  it('walks in from the door when hired', () => {
    const start = workerFrame(L, w('entering', 0), 0, 2, 8, false);
    const end = workerFrame(L, w('entering', 1), 0, 2, 8, false);
    expect(start).toMatchObject({ visible: true, x: L.door.x, y: L.door.y, pose: 'walk', moving: true, facing: -1 });
    expect(end.x).toBeCloseTo(home.x);
    expect(end.y).toBeCloseTo(home.y);
  });

  it('dozes until the bell without automation, stands ready with it', () => {
    expect(workerFrame(L, w('idle'), 0, 2, 8, false)).toMatchObject({ ...home, pose: 'sleep', moving: false });
    expect(workerFrame(L, w('idle'), 0, 2, 8, true).pose).toBe('idle');
  });

  it('waits empty-handed at the counter, then carries', () => {
    expect(workerFrame(L, w('loading', 0, 0), 0, 2, 8, true).pose).toBe('idle');
    expect(workerFrame(L, w('loading', 0.5, 20), 0, 2, 8, true)).toMatchObject({ ...home, pose: 'carry', moving: false });
  });

  it('carries to its table and walks back empty', () => {
    const out0 = workerFrame(L, w('toSales', 0, 20), 0, 2, 8, true);
    const out1 = workerFrame(L, w('toSales', 1, 20), 0, 2, 8, true);
    expect(out0).toMatchObject({ x: home.x, y: home.y, pose: 'carry', moving: true });
    expect(out1.x).toBeCloseTo(target.x);
    expect(out1.y).toBeCloseTo(target.y);
    expect(workerFrame(L, w('unloading', 0.5, 20), 0, 2, 8, true)).toMatchObject({ ...target, pose: 'carry', moving: false });
    const back = workerFrame(L, w('toBuffer', 0.5), 0, 2, 8, true);
    expect(back.pose).toBe('walk');
    expect(back.x).toBeCloseTo((home.x + target.x) / 2);
    // Facing follows the direction of travel in both directions.
    expect(out0.facing).toBe(target.x >= home.x ? 1 : -1);
    expect(back.facing).toBe(home.x >= target.x ? 1 : -1);
  });

  it('moves continuously through a whole trip (no teleporting between phases)', () => {
    const phases: TransportWorker['phase'][] = ['loading', 'toSales', 'unloading', 'toBuffer', 'loading'];
    let prev = workerFrame(L, w(phases[0], 1, 5), 0, 2, 8, true);
    for (const phase of phases.slice(1)) {
      for (const t of [0, 0.25, 0.5, 0.75, 1]) {
        const f = workerFrame(L, w(phase, t, 5), 0, 2, 8, true);
        expect(Math.hypot(f.x - prev.x, f.y - prev.y)).toBeLessThan(L.width * 0.3);
        prev = f;
      }
    }
  });

  it('spreads workers across different tables and hides the ones it cannot draw', () => {
    expect(new Set([0, 1, 2, 3].map((i) => workerSeat(i, 8))).size).toBe(4);
    expect(workerSeat(3, 1)).toBe(0);
    expect(workerFrame(L, w('idle'), 9, 12, 8, true).visible).toBe(false);
  });

  it('still has somewhere to go when there are no seats', () => {
    const empty = computeLayout(390, 300, 6, 0);
    const f = workerFrame(empty, w('toSales', 1, 5), 0, 1, 0, true);
    expect(Number.isFinite(f.x) && Number.isFinite(f.y)).toBe(true);
  });
});

describe('guests', () => {
  const s = (phase: Seat['phase'], t = 0): Seat => ({ phase, t, amount: 0, guest: 1 });

  it('nobody sits at an empty seat', () => {
    expect(guestFrame(L, s('empty'), 0).visible).toBe(false);
    expect(guestFrame(L, s('eating'), 99).visible).toBe(false);
  });

  it('comes in through the door and ends up on the seat', () => {
    const start = guestFrame(L, s('arriving', 0), 3);
    const mid = guestFrame(L, s('arriving', 0.25), 3);
    const end = guestFrame(L, s('arriving', 1), 3);
    expect(start.x).toBeCloseTo(L.outside.x);
    expect(mid.x).toBeCloseTo(L.door.x);
    expect(end.x).toBeCloseTo(L.guests[3].x);
    expect(end.y).toBeCloseTo(L.guests[3].y);
    expect(start.pose).toBe('walk');
  });

  it('waits, eats, cheers, then leaves by the door', () => {
    expect(guestFrame(L, s('waiting'), 0)).toMatchObject({ ...L.guests[0], pose: 'sit-wait' });
    expect(guestFrame(L, s('eating', 0.5), 0).pose).toBe('sit-eat');
    expect(guestFrame(L, s('leaving', 0.05), 0)).toMatchObject({ ...L.guests[0], pose: 'cheer' });
    const out = guestFrame(L, s('leaving', 1), 0);
    expect(out.x).toBeCloseTo(L.outside.x);
    expect(out.pose).toBe('walk');
  });

  it('the table shows food while eating and an empty plate after', () => {
    expect(tableState(s('waiting'))).toBe('empty');
    expect(tableState(s('eating'))).toBe('food');
    expect(tableState(s('leaving'))).toBe('finished');
  });

  it('every phase of a real chain maps to a frame', () => {
    const chain = createChain(3, 6);
    chain.workers.forEach((worker, i) => expect(workerFrame(L, worker, i, 3, 6, false).visible).toBe(true));
    chain.seats.forEach((seat, i) => expect(guestFrame(L, seat, i).visible).toBe(false));
  });
});

describe('cooks and effects', () => {
  it('a station has no worker until the automation hire', () => {
    expect(cookFrame(L, 0, { owned: 5, managed: false, running: true }).visible).toBe(false);
    expect(cookFrame(L, 0, { owned: 0, managed: true, running: false }).visible).toBe(false);
    expect(cookFrame(L, 0, { owned: 5, managed: true, running: true }, 'toss')).toMatchObject({ ...L.cooks[0], pose: 'toss', visible: true });
    expect(cookFrame(L, 12, { owned: 5, managed: true, running: true }).visible).toBe(false);
  });

  it('a new hire walks from outside through the door to the spot', () => {
    expect(entrancePoint(L, L.cooks[0], 0)).toEqual(L.outside);
    expect(entrancePoint(L, L.cooks[0], 0.2).x).toBeCloseTo(L.door.x);
    expect(entrancePoint(L, L.cooks[0], 1)).toEqual(L.cooks[0]);
  });

  it('a tossed dish starts at the station, peaks above the straight line and lands on the counter', () => {
    const from = L.stations[4];
    const to = L.passStack;
    expect(tossPoint(from, to, 0, 40)).toEqual(from);
    expect(tossPoint(from, to, 1, 40)).toEqual(to);
    const mid = tossPoint(from, to, 0.5, 40);
    expect(mid.y).toBeCloseTo((from.y + to.y) / 2 - 40);
  });

  it('sorts overlapping things back to front', () => {
    expect(depthOrder([{ x: 0, y: 30 }, { x: 0, y: 10 }, { x: 0, y: 20 }])).toEqual([1, 2, 0]);
    expect(depthOrder([{ x: 5, y: 10 }, { x: 0, y: 10 }])).toEqual([0, 1]);
  });

  it('the counter fills up with the backlog and saturates', () => {
    expect(passFullness(0, 20, 2)).toBe(0);
    expect(passFullness(60, 20, 2)).toBeCloseTo(0.5);
    expect(passFullness(1e12, 20, 2)).toBe(1);
    expect(passFullness(5, 0, 0)).toBe(1);
  });
});

describe('scene additions', () => {
  it('shrinks the art with the scene and keeps it on the floor', () => {
    const small = computeLayout(375, 220, 6, 8);
    expect(small.artScale).toBeLessThan(L.artScale);
    expect(L.characterHeight).toBeCloseTo(50 * L.artScale);
    for (const l of [L, small]) {
      expect(l.wallBottom).toBeGreaterThan(l.wallHeight);
      expect(l.wallBottom).toBeLessThan(l.stations[0].y);
      // A station never reaches up into the strip where the venue chip and round buttons sit.
      expect(l.stations[0].y - 64 * l.stationScale).toBeGreaterThan(l.wallHeight * 0.5);
    }
  });

  it('seats each guest beside their table, the waiter on the other side', () => {
    L.tables.forEach((t, k) => {
      expect(L.guests[k].x).toBeGreaterThan(t.x);
      expect(L.serve[k].x).toBeLessThan(t.x);
    });
  });

  it('walks a new cook in through the door, around the end of the counter, to the station', () => {
    const path = kitchenPath(L, L.cooks[2]);
    expect(path[0]).toEqual(L.outside);
    expect(path[1]).toEqual(L.door);
    expect(path[path.length - 1]).toEqual(L.cooks[2]);
    // The leg that crosses the counter's line runs clear of its right end.
    expect(path[2].x).toBeGreaterThan(L.pass.x + L.pass.width);
    expect(path[3].x).toBeGreaterThan(L.pass.x + L.pass.width);
    expect(pathLength(path)).toBeGreaterThan(0);
    expect(L.kitchenGate.x).toBeLessThan(L.width);
  });

  it('caps the pile on the pass and counts the real number of dishes', () => {
    expect(passPile(0, 10)).toEqual({ drawn: 0, total: 0 });
    expect(passPile(30, 10)).toEqual({ drawn: 3, total: 3 });
    expect(passPile(31, 10)).toEqual({ drawn: 4, total: 4 });
    expect(passPile(1000, 10)).toEqual({ drawn: 8, total: 100 });
    expect(passPile(5, 0)).toEqual({ drawn: 0, total: 0 });
    expect(passPile(Number.NaN, 10)).toEqual({ drawn: 0, total: 0 });
  });

  it('dresses the room every 25 levels', () => {
    expect(decorTiers(1, 1)).toEqual({ uniform: 0, dining: 0 });
    expect(decorTiers(25, 49)).toEqual({ uniform: 1, dining: 1 });
    expect(decorTiers(80, 100)).toEqual({ uniform: 3, dining: 4 });
    expect(decorTiers(Number.NaN, -3)).toEqual({ uniform: 0, dining: 0 });
  });
});
