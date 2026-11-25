/**
 * The yard as the world draws and walks it: a pure function of the config's `salvage` block (the
 * placeholder test yard, src/config/schema.salvage.ts) into plain numbers the UI thread reads. No
 * React, no Skia: the tests run it under node. Built once per config (and per `?sprites=` / `?actors=`
 * switch of the web preview's development panel); never per frame.
 *
 * COORDINATES (docs/design/yard-ground.md): world metres on the ground plane, x east (right), y south
 * (towards the viewer). The three-quarter view puts a world point at screen points
 *   sx = x * ppm - camX,   sy = y * ppm * tilt - camY,
 * and a height h metres above the ground `h * ppm * lift` points higher (`lift` = sqrt(1 - tilt^2),
 * the same view angle). Lower on the screen (larger y) is drawn in front.
 *
 * Solids for collision are packed in one flat array, five numbers each: [kind, x, y, a, b] with kind 0
 * a circle of radius a, kind 1 a box of half width a (x) and half depth b (y).
 *
 * THE RULES' YARD (hour-0 joint, contract step): besides the static `props` (fences, the container
 * wall, rubble), the layout holds a prop for every place with a footprint (`map.places`: kind
 * "machine", id = the place id) and the truck at the truck park (id "truck"). The boss starts at
 * `map.points.start`. Things (whole or coming apart) are the rules' and come every store change with
 * their solids (./useRulesTable.ts, ./actors.ts rulesScene); the lane east of the gate is `lane`.
 */
import type { SalvageContent, SalvageProp } from '../../../config/schema.salvage';
import * as R from '../../../engine/salvage';
import { dressing, type Dress } from './dressing';
import { laneDrawEnd, laneGeo } from './lane';

const asCfg = (s: SalvageContent) => ({ salvage: s }) as R.SalvageConfig;
const pointOf = (s: SalvageContent, id: string) => R.point(asCfg(s), id);

export const SOLID_CIRCLE = 0;
export const SOLID_BOX = 1;
/** Numbers per packed solid. */
export const SOLID_STRIDE = 5;

/** Kinds of interactable, as the frame loop and the sampler number them. */
export const ACT_WRECK = 0;
export const ACT_MACHINE = 1;

export interface Interactable {
  /** Index into `props`. */
  prop: number;
  kind: number;
  id: string;
}

/** A helper's walk: a polyline from the machine to a wreck (and back), metres. */
export interface HelperPath {
  /** Flat [x0, y0, x1, y1, ...]. */
  pts: number[];
  /** Total length, metres. */
  length: number;
  /** Seconds of offset along the walk, so helpers do not move in step. */
  phase: number;
  /** The wreck it works at (index into `props`). */
  wreck: number;
}

export interface YardLayout {
  width: number;
  depth: number;
  ppm: number;
  tilt: number;
  lift: number;
  tile: number;
  /** The yard's size on screen, points. */
  pxW: number;
  pxH: number;
  props: SalvageProp[];
  /** Packed solids of the props (the truck excluded: it moves). */
  solids: number[];
  /** Things the worker can be next to: wrecks and the machine. Flat [propIndex, kind, x, y, kindShape, a, b] per entry. */
  acts: number[];
  actList: Interactable[];
  /** The truck's prop index, or -1. */
  truck: number;
  helpers: HelperPath[];
  workerStart: { x: number; y: number };
  truckStart: { x: number; y: number };
  /** The lane east of the gate a body may enter: [x0, x1, y0, y1] metres, or [] (./collide.ts keepInside). */
  lane: number[];
  /** How far east the world is drawn (the lane's end), metres: the camera's east limit. */
  drawW: number;
  /** Content points the actors' pictures use: [x, y] of the gate, the truck park, the weighbridge, the tipping floor, the scale. */
  pts: { gate: number[]; park: number[]; weighbridge: number[]; floor: number[]; scale: number[] };
  /** The back wall's line (content map.north, MAP.md M1), metres, or null: nobody walks, drives or looks north of it. */
  north: number | null;
  /** The wall's south face (north + its half depth): the walkers' and the camera's north limit. */
  northFace: number | null;
  /** The vehicles' drive line (content map.driveLine, MAP.md M4) as a centre polyline [x0, y0, x1, y1, ...] from the gate west, or []. */
  driveLine: number[];
  /** The look fixer's dressing (./dressing.ts): extra standing sprites and ground decals (sheet G ids lie on the ground). */
  dressing: Dress[];
}

/** Half the depth of the back wall's lock blocks, metres (a block is 0.8 m deep: the art's size, not the map's). */
export const WALL_HALF_D = 0.4;

/** content map.north (MAP.md M1), read whether or not the schema has the field yet. */
export function mapNorth(s: SalvageContent): number | null {
  const n = (s.map as { north?: unknown }).north;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

/**
 * content map.driveLine (MAP.md M4) as a centre polyline. Accepts a list of points ([x, y] or {x, y}),
 * an object with `pts` / `points` / `line`, or a list of boxes ({x0, y0, w, d}: their centres in order).
 */
export function mapDriveLine(s: SalvageContent): number[] {
  const raw = (s.map as { driveLine?: unknown }).driveLine as unknown;
  const list: unknown = Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? ((raw as Record<string, unknown>).pts ?? (raw as Record<string, unknown>).points ?? (raw as Record<string, unknown>).line ?? (raw as Record<string, unknown>).path) : null;
  if (!Array.isArray(list)) return [];
  const out: number[] = [];
  for (const q of list) {
    if (Array.isArray(q) && q.length >= 2 && typeof q[0] === 'number') out.push(q[0], q[1] as number);
    else if (q && typeof q === 'object') {
      const o = q as Record<string, number>;
      if (typeof o.x === 'number' && typeof o.y === 'number') out.push(o.x, o.y);
      else if (typeof o.x0 === 'number' && typeof o.y0 === 'number' && typeof o.w === 'number' && typeof o.d === 'number') out.push(o.x0 + o.w / 2, o.y0 + o.d / 2);
    }
  }
  return out;
}

/** The drive line's half width, metres (content map.driveLine.width or .w; MAP.md M4's 3.6 m at least). */
export function driveHalf(s: SalvageContent): number {
  const raw = (s.map as { driveLine?: unknown }).driveLine as Record<string, unknown> | undefined;
  const w = raw && !Array.isArray(raw) ? (raw.width ?? raw.w) : undefined;
  return (typeof w === 'number' && w > 0 ? w : 3.6) / 2;
}

/** Numbers per packed interactable. */
export const ACT_STRIDE = 7;

function packSolid(p: SalvageProp, out: number[]): void {
  if (p.shape === 'circle') out.push(SOLID_CIRCLE, p.x, p.y, p.r, p.r);
  else out.push(SOLID_BOX, p.x, p.y, p.w / 2, p.d / 2);
}

/**
 * The yard of a salvage block. `extraCrates` adds crates on a grid in free ground (the `sprites=N`
 * switch); `helpers` overrides the helper count (the `actors=N` switch).
 */
export function yardLayout(s: SalvageContent, opts: { extraCrates?: number; helpers?: number } = {}): YardLayout {
  const { width, depth, ppm, tilt, tile } = s.yard;
  const props = [...s.props, ...rulesProps(s)];
  // Extra crates for the stress switch: on a grid, skipping places already taken.
  const extra = Math.max(0, Math.floor(opts.extraCrates ?? 0));
  if (extra > 0) {
    const free = (x: number, y: number) => props.every((p) => Math.abs(p.x - x) > (p.shape === 'box' ? p.w / 2 : p.r) + 1.2 || Math.abs(p.y - y) > (p.shape === 'box' ? p.d / 2 : p.r) + 1.2);
    let n = 0;
    for (let y = 3; y < depth - 2 && n < extra; y += 2.2) {
      for (let x = 3; x < width - 2 && n < extra; x += 2.2) {
        if (!free(x, y)) continue;
        props.push({ id: `stress-${n}`, kind: 'crate', x, y, shape: 'box', w: 0.9, d: 0.9, h: 0.9, r: 0.5, solid: false });
        n++;
      }
    }
  }
  const solids: number[] = [];
  const acts: number[] = [];
  const actList: Interactable[] = [];
  let truck = -1;
  props.forEach((p, i) => {
    if (p.kind === 'truck') {
      if (truck < 0) truck = i;
      return;
    }
    if (p.solid) packSolid(p, solids);
    if (p.kind === 'wreck' || p.kind === 'machine') {
      const kind = p.kind === 'wreck' ? ACT_WRECK : ACT_MACHINE;
      acts.push(i, kind, p.x, p.y, p.shape === 'circle' ? SOLID_CIRCLE : SOLID_BOX, p.shape === 'circle' ? p.r : p.w / 2, p.shape === 'circle' ? p.r : p.d / 2);
      actList.push({ prop: i, kind, id: p.id });
    }
  });
  // Stress actors (the `actors=N` switch): walking between two places, through the wall's wide gap
  // (`helpers.via`) when the walk crosses it. Only pictures: nothing they do reaches the rules.
  const places = props.map((p, i) => (p.kind === 'machine' ? i : -1)).filter((i) => i >= 0);
  const count = Math.max(0, Math.floor(opts.helpers ?? s.helpers.count));
  const helpers: HelperPath[] = [];
  const wallX = props.filter((p) => p.kind === 'wall').reduce((a, p, _i, all) => a + p.x / all.length, 0);
  if (places.length >= 2) {
    const via = s.helpers.via;
    for (let k = 0; k < count; k++) {
      const a = props[places[k % places.length]];
      const b = props[places[(k * 7 + 3) % places.length]];
      const spread = ((k * 37) % 7) / 7 - 0.5;
      const mx = a.x + spread * 1.2;
      const my = a.y + (a.shape === 'box' ? a.d / 2 : a.r) + 0.7;
      const wx = b.x + spread * 0.8;
      const wy = b.y + (b.shape === 'box' ? b.d / 2 : b.r) + 0.7;
      const crosses = via && wallX > 0 && (mx - wallX) * (wx - wallX) < 0;
      const pts = crosses ? [mx, my, via[0], via[1] + spread, wx, wy] : [mx, my, wx, wy];
      let length = 0;
      for (let j = 2; j < pts.length; j += 2) length += Math.hypot(pts[j] - pts[j - 2], pts[j + 1] - pts[j - 1]);
      helpers.push({ pts, length, phase: (k * 4.7) % 17, wreck: places[(k * 7 + 3) % places.length] });
    }
  }
  // The back wall (MAP.md M1): everything north of its south face is one solid box, across the whole width
  // and past both fences, so no body ever stands, walks or drives north of it.
  const north = mapNorth(s);
  const northFace = north !== null ? north + WALL_HALF_D : null;
  if (northFace !== null && northFace > 0) solids.push(SOLID_BOX, width / 2, northFace / 2 - 0.5, width / 2 + 40, northFace / 2 + 0.5);
  const drawW0 = Math.max(width, (() => {
    const l = laneGeo(s);
    return l ? laneDrawEnd(l) : width;
  })());
  let dress: Dress[] = [];
  try {
    dress = dressing(s);
  } catch (e) {
    console.warn('salvage: the yard dressing could not be built', e);
  }
  const t = truck >= 0 ? props[truck] : null;
  return {
    width,
    depth,
    ppm,
    tilt,
    lift: Math.sqrt(1 - tilt * tilt),
    tile,
    pxW: width * ppm,
    pxH: depth * ppm * tilt,
    props,
    solids,
    acts,
    actList,
    truck,
    helpers,
    workerStart: pointOf(s, 'start'),
    truckStart: t ? { x: t.x, y: t.y } : { x: pointOf(s, 'start').x + 3, y: pointOf(s, 'start').y },
    lane: laneBox(s),
    drawW: drawW0,
    pts: {
      gate: pt(s, 'gate', [width - 1, depth / 2]),
      park: pt(s, 'park', [width - 4, depth - 4]),
      weighbridge: pt(s, 'weighbridge', pt(s, 'scale', [width / 2, depth / 2])),
      floor: pt(s, 'floor', [width / 2, depth - 6]),
      scale: pt(s, 'scale', [width / 2, depth / 2]),
    },
    north,
    northFace,
    driveLine: mapDriveLine(s),
    dressing: dress,
  };
}

const pt = (s: SalvageContent, id: string, dflt: number[]): number[] => (s.map.points[id] ? [...s.map.points[id]] : dflt);

/** The lane a body may enter east of the gate (./collide.ts): [x0, x1, y0, y1], or [] without a gate. */
export function laneBox(s: SalvageContent): number[] {
  const l = laneGeo(s);
  if (!l) return [];
  return [s.yard.width - 1, l.end, l.gy - l.half, l.gy + l.half];
}

/** The rules' places, the fresh yard's things and the truck as props (see the header). */
export function rulesProps(s: SalvageContent): SalvageProp[] {
  const out: SalvageProp[] = [];
  for (const [id, pl] of Object.entries(s.map.places)) {
    const p = s.map.points[id];
    if (!p) continue;
    // A flat place (a pad, a scale plate, the tipping floor) is drawn as one marker size: the placeholder
    // atlas bakes one box per size, and nobody collides with a decal (its real footprint is the rules').
    const flat = !pl.solid;
    out.push({ id, kind: 'machine', x: p[0], y: p[1], shape: 'box', w: flat ? 1.6 : pl.w, d: flat ? 1.6 : pl.d, h: flat ? 0.1 : pl.h, r: 1, solid: pl.solid });
  }
  if (s.map.points.park) {
    const p = pointOf(s, 'park');
    out.push({ id: 'truck', kind: 'truck', x: p.x, y: p.y, shape: 'box', w: 3, d: 1.8, h: 1.6, r: 1, solid: false });
  }
  return out;
}

/** How many screens the yard spans at a window size (the ground work's aim: at least 3 wide and 2 high at 844 x 390). */
export function screensSpanned(y: YardLayout, w: number, h: number): { wide: number; high: number } {
  return { wide: y.pxW / w, high: y.pxH / h };
}

// The lane's geometry moved to ./lane.ts (pure: the labels read it too, join3); re-exported here.
export { laneDrawEnd, laneGeo, laneSigns, type LaneGeo } from './lane';

