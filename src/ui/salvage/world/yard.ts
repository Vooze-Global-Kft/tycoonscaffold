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
    drawW: Math.max(width, (() => {
      const l = laneGeo(s);
      return l ? laneDrawEnd(l) : width;
    })()),
    pts: {
      gate: pt(s, 'gate', [width - 1, depth / 2]),
      park: pt(s, 'park', [width - 4, depth - 4]),
      weighbridge: pt(s, 'weighbridge', pt(s, 'scale', [width / 2, depth / 2])),
      floor: pt(s, 'floor', [width / 2, depth - 6]),
      scale: pt(s, 'scale', [width / 2, depth / 2]),
    },
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

/** The lane's geometry from content: the gate, the lane's width, each partner's distance, the bridge. */
export interface LaneGeo {
  gx: number;
  gy: number;
  /** Half the asphalt's width, metres. */
  half: number;
  /** Partner id -> x of its site (the gate plus its lane distance). */
  sites: { id: string; x: number; look: number }[];
  /** x of the weight-limited bridge (null: none), and how far a vehicle may go. */
  bridge: number | null;
  end: number;
}

export function laneGeo(c: SalvageContent): LaneGeo | null {
  const g = c.map.points.gate;
  if (!g) return null;
  const lane = c.map.lane ?? {};
  const half = ((c.map as { laneWidth?: number }).laneWidth ?? 6) / 2;
  const sites = Object.entries(c.partners).map(([id, p], i) => ({ id, x: g[0] + (lane[p.lane] ?? 0), look: i }));
  const bridgeKey = Object.keys(lane).find((k) => k.startsWith('bridge'));
  const bridge = bridgeKey ? g[0] + lane[bridgeKey] : null;
  const far = Math.max(g[0] + 20, ...sites.map((s) => s.x + 12));
  const end = bridge !== null ? bridge - 2 : far;
  return { gx: g[0], gy: g[1], half, sites, bridge, end };
}

/** How far the drawn lane runs east (asphalt past the bridge). */
export const laneDrawEnd = (l: LaneGeo) => (l.bridge !== null ? l.bridge + 14 : l.end);

