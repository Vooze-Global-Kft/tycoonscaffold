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
 * "machine", id = the place id, an interactable with a card), every whole thing of the fresh yard
 * (`thingPos` of the rules: kind "wreck", id = the thing's uid), and the truck at the truck park
 * (id "truck"). The boss starts at `map.points.start`. What the rules decide about them comes as the
 * rules table (./useRulesTable.ts, from the rules' FrameTable).
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
  const machine = props.findIndex((p) => p.kind === 'machine');
  const wrecks = props.map((p, i) => (p.kind === 'wreck' ? i : -1)).filter((i) => i >= 0);
  const count = Math.max(0, Math.floor(opts.helpers ?? s.helpers.count));
  const helpers: HelperPath[] = [];
  if (machine >= 0 && wrecks.length > 0) {
    const m = props[machine];
    // Through the yard's wide gap when the config names one (`helpers.via`), else straight.
    const via = s.helpers.via;
    for (let k = 0; k < count; k++) {
      const wi = wrecks[k % wrecks.length];
      const w = props[wi];
      // Stand below the machine and below the wreck (the side facing the viewer), spread a little per helper.
      const spread = ((k * 37) % 7) / 7 - 0.5;
      const mx = m.x + spread * (m.shape === 'box' ? m.w * 0.6 : m.r);
      const my = m.y + (m.shape === 'box' ? m.d / 2 : m.r) + 0.7;
      const wx = w.x + spread * 0.8;
      const wy = w.y + (w.shape === 'box' ? w.d / 2 : w.r) + 0.7;
      const pts = via ? [mx, my, via[0], via[1] + spread, wx, wy] : [mx, my, wx, wy];
      let length = 0;
      for (let j = 2; j < pts.length; j += 2) length += Math.hypot(pts[j] - pts[j - 2], pts[j + 1] - pts[j - 1]);
      helpers.push({ pts, length, phase: (k * 4.7) % 17, wreck: wi });
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
  };
}

/** The rules' places, the fresh yard's things and the truck as props (see the header). */
export function rulesProps(s: SalvageContent): SalvageProp[] {
  const out: SalvageProp[] = [];
  for (const [id, pl] of Object.entries(s.map.places)) {
    const p = s.map.points[id];
    if (!p) continue;
    out.push({ id, kind: 'machine', x: p[0], y: p[1], shape: 'box', w: pl.w, d: pl.d, h: pl.h, r: 1, solid: pl.solid });
  }
  for (const th of R.stockThings(s)) {
    const o = s.objects[th.obj];
    if (!o) continue;
    const p = R.thingPos(asCfg(s), th.at);
    out.push({ id: th.uid, kind: 'wreck', x: p.x, y: p.y, shape: 'box', w: o.size.w, d: o.size.d, h: o.size.h, r: 1, solid: true });
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
