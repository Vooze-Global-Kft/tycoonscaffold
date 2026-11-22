/**
 * Where everything in the venue scene goes, and what each actor is doing.
 *
 * The engine knows nothing about pixels: a transport worker is a phase plus a
 * progress value, a seat likewise (see src/engine/chain.ts). This file turns
 * that into positions, facing and poses for a scene of any size. It is pure
 * (no React, no Skia), so the mapping is unit-tested and the scene component
 * only has to draw what it is told.
 *
 * The room, top to bottom: a wall, the stations with their workers in front,
 * the buffer counter [the pass] with its bell, a walkway, the seats [tables]
 * and a door on the right where guests and new hires come in.
 */
import type { Seat, TransportWorker } from '../../engine/chain';
import type { Pose, TableState } from './art/types';

export interface Point {
  x: number;
  y: number;
}

/** The scene draws at most this many seats and transport workers; more than that only raise the numbers. */
export const MAX_SEATS_DRAWN = 8;
export const MAX_WORKERS_DRAWN = 6;
export const MAX_STATIONS_DRAWN = 6;

/** Seats fill a 4 x 2 grid from the middle outwards, so two tables look centred rather than stuck in a corner. */
const SEAT_ORDER = [1, 2, 0, 3, 5, 6, 4, 7];

export interface SceneLayout {
  width: number;
  height: number;
  /** 1 on a 390-wide scene. Multiply drawn sizes by it. */
  unit: number;
  /** Height of the wall strip at the top. */
  wallHeight: number;
  /** Centre of each station's base, on the floor line. */
  stations: Point[];
  /** Drawn width of a station. */
  stationSize: number;
  /** Where each station's worker stands (feet). */
  cooks: Point[];
  /** The buffer counter: top-left corner and size. */
  pass: { x: number; y: number; width: number; height: number };
  /** Where finished goods pile up on the counter. */
  passStack: Point;
  bell: Point;
  /** Centre of each seat's table. */
  tables: Point[];
  /** Where each seat's guest sits (feet). */
  guests: Point[];
  /** Where a transport worker stands to serve each seat. */
  serve: Point[];
  /** Diameter of a table. */
  tableSize: number;
  /** The doorway, and a point just outside it where people appear and vanish. */
  door: Point;
  outside: Point;
  /** Centre of the round skill button [Rush] that floats over the walkway, right of the counter. */
  rush: Point;
  /** How tall a standing character is drawn. */
  characterHeight: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (a: Point, b: Point, t: number): Point => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
/** Gentle ease in and out, so walks start and stop softly. */
const ease = (t: number) => {
  const c = clamp(t, 0, 1);
  return c * c * (3 - 2 * c);
};

export function computeLayout(width: number, height: number, stationCount: number, seatCount: number): SceneLayout {
  const unit = width / 390;
  const wallHeight = height * 0.15;

  // Stations share the top of the room. Few stations sit centred; many share the full width.
  const n = clamp(stationCount, 1, MAX_STATIONS_DRAWN);
  const slot = Math.min(width / n, 86 * unit);
  const left = (width - slot * n) / 2;
  const floorLine = height * 0.385;
  const stations: Point[] = [];
  const cooks: Point[] = [];
  for (let i = 0; i < n; i++) {
    const x = left + slot * (i + 0.5);
    stations.push({ x, y: floorLine });
    cooks.push({ x, y: floorLine + height * 0.065 });
  }
  const stationSize = Math.min(slot * 0.94, 64 * unit);

  const pass = { x: width * 0.05, y: height * 0.5, width: width * 0.72, height: height * 0.075 };
  const passStack = { x: pass.x + pass.width * 0.42, y: pass.y + pass.height * 0.2 };
  const bell = { x: pass.x + pass.width - 18 * unit, y: pass.y + pass.height * 0.25 };

  const door = { x: width * 0.92, y: height * 0.8 };
  const rush = { x: width * 0.872, y: height * 0.587 };
  const outside = { x: width + 34 * unit, y: height * 0.82 };

  // Tables: a fixed 4 x 2 grid, so a table never moves when another one is added.
  const seats = clamp(seatCount, 0, MAX_SEATS_DRAWN);
  const twoRows = seats > 4;
  const rowY = twoRows ? [height * 0.735, height * 0.915] : [height * 0.82, height * 0.82];
  const colX = [0.14, 0.33, 0.52, 0.71].map((f) => width * f);
  const tables: Point[] = [];
  const guests: Point[] = [];
  const serve: Point[] = [];
  for (let k = 0; k < seats; k++) {
    const cell = SEAT_ORDER[k];
    const t = { x: colX[cell % 4], y: rowY[Math.floor(cell / 4)] };
    tables.push(t);
    guests.push({ x: t.x + 4 * unit, y: t.y - height * 0.03 });
    serve.push({ x: t.x - width * 0.075, y: t.y - height * 0.012 });
  }

  return {
    width,
    height,
    unit,
    wallHeight,
    stations,
    stationSize,
    cooks,
    pass,
    passStack,
    bell,
    tables,
    guests,
    serve,
    tableSize: Math.min(46 * unit, height * 0.16),
    door,
    outside,
    rush,
    characterHeight: clamp(height * 0.19, 40 * unit, 60 * unit),
  };
}

/** Where transport worker `index` of `count` waits and loads, along the front of the counter. */
export function workerHome(layout: SceneLayout, index: number, count: number): Point {
  const n = Math.max(1, Math.min(count, MAX_WORKERS_DRAWN));
  const i = Math.min(index, n - 1);
  return {
    x: layout.pass.x + layout.pass.width * (0.12 + (0.76 * (i + 0.5)) / n),
    y: layout.pass.y + layout.pass.height + layout.height * 0.05,
  };
}

/** What to draw for one actor this frame. */
export interface ActorFrame {
  visible: boolean;
  x: number;
  y: number;
  /** 1 faces right, -1 faces left. */
  facing: 1 | -1;
  pose: Pose;
  /** Moving this frame (drives the walk cycle while carrying). */
  moving: boolean;
}

const HIDDEN: ActorFrame = { visible: false, x: 0, y: 0, facing: 1, pose: 'idle', moving: false };

const face = (from: Point, to: Point): 1 | -1 => (to.x >= from.x ? 1 : -1);

/** The seat a transport worker serves. Fixed per worker, spread across the room. */
export function workerSeat(index: number, seatCount: number): number {
  const seats = Math.min(seatCount, MAX_SEATS_DRAWN);
  return seats <= 0 ? 0 : (index * 3 + 1) % seats;
}

/**
 * A transport worker [waiter]. `auto` is whether the transport automation hire is bought: without
 * it, idle workers doze until the bell is rung.
 */
export function workerFrame(layout: SceneLayout, worker: TransportWorker, index: number, count: number, seatCount: number, auto: boolean): ActorFrame {
  if (index >= MAX_WORKERS_DRAWN) return HIDDEN;
  const home = workerHome(layout, index, count);
  const target = layout.serve[workerSeat(index, seatCount)] ?? { x: layout.width * 0.4, y: layout.height * 0.78 };
  switch (worker.phase) {
    case 'entering': {
      const p = mix(layout.door, home, ease(worker.t));
      return { visible: true, ...p, facing: face(layout.door, home), pose: 'walk', moving: true };
    }
    case 'idle':
      return { visible: true, ...home, facing: 1, pose: auto ? 'idle' : 'sleep', moving: false };
    case 'loading':
      // Waiting at the counter for something to carry, or just loaded up.
      return { visible: true, ...home, facing: 1, pose: worker.carry > 0 ? 'carry' : 'idle', moving: false };
    case 'toSales': {
      const p = mix(home, target, ease(worker.t));
      return { visible: true, ...p, facing: face(home, target), pose: 'carry', moving: true };
    }
    case 'unloading':
      return { visible: true, ...target, facing: 1, pose: 'carry', moving: false };
    case 'toBuffer': {
      const p = mix(target, home, ease(worker.t));
      return { visible: true, ...p, facing: face(target, home), pose: 'walk', moving: true };
    }
  }
}

/** A guest at a seat [a customer at a table]. */
export function guestFrame(layout: SceneLayout, seat: Seat, index: number): ActorFrame {
  const spot = layout.guests[index];
  if (!spot || seat.phase === 'empty') return HIDDEN;
  switch (seat.phase) {
    case 'arriving': {
      // In through the door, then across to the seat.
      const t = seat.t;
      const p = t < 0.25 ? mix(layout.outside, layout.door, ease(t / 0.25)) : mix(layout.door, spot, ease((t - 0.25) / 0.75));
      return { visible: true, ...p, facing: -1, pose: 'walk', moving: true };
    }
    case 'waiting':
      return { visible: true, ...spot, facing: 1, pose: 'sit-wait', moving: false };
    case 'eating':
      return { visible: true, ...spot, facing: 1, pose: 'sit-eat', moving: false };
    case 'leaving': {
      // A happy hop at the table, then out of the door.
      const t = seat.t;
      if (t < 0.18) return { visible: true, ...spot, facing: 1, pose: 'cheer', moving: false };
      const u = (t - 0.18) / 0.82;
      const p = u < 0.8 ? mix(spot, layout.door, ease(u / 0.8)) : mix(layout.door, layout.outside, ease((u - 0.8) / 0.2));
      return { visible: true, ...p, facing: 1, pose: 'walk', moving: true };
    }
  }
}

/** What is on a seat's table. */
export function tableState(seat: Seat): TableState {
  if (seat.phase === 'eating') return 'food';
  if (seat.phase === 'leaving') return 'finished';
  return 'empty';
}

/**
 * A station's worker [a chef]. There is nobody until the automation hire is bought: before that
 * the player taps the station. `workPose` is the pose used while a cycle runs (`toss` suits an
 * oven, `cook` most other stations).
 */
export function cookFrame(layout: SceneLayout, stationIndex: number, state: { owned: number; managed: boolean; running: boolean }, workPose: Pose = 'cook'): ActorFrame {
  const spot = layout.cooks[stationIndex];
  if (!spot || !state.managed || state.owned <= 0) return HIDDEN;
  return { visible: true, ...spot, facing: 1, pose: state.running || state.managed ? workPose : 'idle', moving: false };
}

/** Walk-in path for someone newly hired at a station: from outside, through the door, to their spot. */
export function entrancePoint(layout: SceneLayout, to: Point, t: number): Point {
  const c = clamp(t, 0, 1);
  return c < 0.2 ? mix(layout.outside, layout.door, ease(c / 0.2)) : mix(layout.door, to, ease((c - 0.2) / 0.8));
}

/** A point on the arc a finished dish flies along, from a station to the counter. t runs 0..1. */
export function tossPoint(from: Point, to: Point, t: number, lift: number): Point {
  const c = clamp(t, 0, 1);
  return { x: lerp(from.x, to.x, c), y: lerp(from.y, to.y, c) - lift * 4 * c * (1 - c) };
}

/**
 * Draw order for things that overlap, back to front: the scene is seen slightly from above, so
 * whatever stands lower on screen is in front. Returns indices sorted by y.
 */
export function depthOrder(points: readonly Point[]): number[] {
  return points.map((_, i) => i).sort((a, b) => points[a].y - points[b].y || a - b);
}

/** How full the counter looks, 0..1: the backlog measured against what transport moves in a few trips. */
export function passFullness(buffer: number, capacityPerTrip: number, workers: number): number {
  const reference = Math.max(1e-9, capacityPerTrip * Math.max(1, workers) * 3);
  return clamp(buffer / reference, 0, 1);
}
