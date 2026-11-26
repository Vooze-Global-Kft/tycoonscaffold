/**
 * THE CHEVRON (yard-stage1.md 4.2): hi-vis, over the goal's target; when the target is off screen, an
 * edge arrow at the free world's border pointing at it. Pure: `chevronTarget` on the JavaScript thread
 * (where the target stands, metres, from the rules' frame), `chevronPlace` a worklet the effects canvas
 * calls each frame with the camera (./WorldLayer.tsx draws the art kit's drawChevron / drawEdgeArrow).
 */
import * as R from '../../../engine/salvage';
import { hintTarget } from '../hints/rules';

/** Metres above the target's top where the chevron's tip hovers. */
export const CHEVRON_GAP = 0.7;

/** The tip's height over a target, metres: above the thing's or the place's height (else 1 m). */
export function chevronZ(cfg: R.SalvageConfig, f: R.FrameTable, id: string): number {
  const thing = f.things.find((t) => t.uid === id);
  const h = thing ? (cfg.salvage.objects[thing.obj]?.size?.h ?? 1) : ((cfg.salvage.map.places as Record<string, { h?: number }>)[id]?.h ?? 1);
  return Math.max(0.6, h) + CHEVRON_GAP;
}
/** The edge arrow's distance from the free world's border, points. */
export const EDGE_INSET = 22;

/**
 * The chevron's target in metres: the rules' FrameTable.chevron; while the rules leave it null (hour 0's
 * stub) the hints' `hintTarget`, else the current goal's target resolved by the rules' own positions.
 * The rule of WHICH target, and WHEN it shows (`chevronGate`), is the hints package's.
 */
export function chevronTarget(cfg: R.SalvageConfig, g: R.SalvageGame, f: R.FrameTable): { x: number; y: number; id: string } | null {
  if (f.chevron) return f.chevron;
  // The hints' rule of the target (the goal's `via` first, e.g. the truck before a fetch goal).
  const h = hintTarget(cfg, g, f, Date.now());
  if (h) return h;
  const goal = R.nextGoal(cfg, g);
  const id = goal?.target ?? null;
  if (!id) return null;
  const thing = f.things.find((t) => t.uid === id);
  if (thing) return { x: thing.x, y: thing.y, id };
  if (cfg.salvage.map.points[id]) {
    const p = R.point(cfg, id);
    return { x: p.x, y: p.y, id };
  }
  return null;
}

/**
 * Where to draw it this frame (a worklet), from the target's screen points this frame: `tx, ty` the tip's
 * place (chevronZ above the target), `gy` the target's ground point's y. Writes into `out`: [mode, x, y,
 * angle] with mode 0 none, 1 the chevron with its tip at (x, y), 2 the edge arrow centred at (x, y)
 * turned by `angle` (radians, 0 east). `box` is the free world [x0, y0, x1, y1] in window points.
 */
export function chevronPlace(out: number[], on: number, tx: number, ty: number, gy: number, box: number[]): void {
  'worklet';
  if (on !== 1) {
    out[0] = 0;
    return;
  }
  if (tx >= box[0] && tx <= box[2] && gy >= box[1] && ty <= box[3]) {
    out[0] = 1;
    out[1] = tx;
    out[2] = Math.max(box[1] + 18, ty);
    out[3] = 0;
    return;
  }
  // Off screen: from the free world's centre towards the target, clamped inside its border.
  const cx = (box[0] + box[2]) / 2;
  const cy = (box[1] + box[3]) / 2;
  const dx = tx - cx;
  const dy = gy - cy;
  const hw = (box[2] - box[0]) / 2 - EDGE_INSET;
  const hh = (box[3] - box[1]) / 2 - EDGE_INSET;
  const k = Math.min(dx !== 0 ? hw / Math.abs(dx) : 1e9, dy !== 0 ? hh / Math.abs(dy) : 1e9);
  out[0] = 2;
  out[1] = cx + dx * k;
  out[2] = cy + dy * k;
  out[3] = Math.atan2(dy, dx);
}
