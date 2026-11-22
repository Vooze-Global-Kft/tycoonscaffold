/**
 * One silhouette per ore, used on every surface that shows an ore (second pass, critique M1), so
 * an ore never depends on its hue alone:
 *
 *   iron      a square block          copper    a round nugget
 *   ice       a tall spike shard      titanium  a hexagonal prism
 *   platinum  a diamond               (unknown ore: a pentagon lump)
 *
 * The same shape is the chunk, the pile's chunks, the drone's cargo core, the 20 pt ore icon and
 * the end marker of a hold-tank band. Route lines carry a per-ore dash rhythm (`ROUTE_DASH`).
 * Pure Skia; shapes are centred on the origin with "radius" `s` (about half the width).
 */
import type { SkCanvas, SkPath } from '@shopify/react-native-skia';
import { SPACE, alpha, mix, oreColor } from './palette';
import { TAU, circle, fill, glow, ngon, poly, stroke } from './pen';

export type OreShape = 'block' | 'nugget' | 'spike' | 'prism' | 'diamond' | 'lump';

/** The silhouette of each ore id (unknown ids: 'lump'). */
export function oreShape(ore: string): OreShape {
  switch (ore) {
    case 'iron':
      return 'block';
    case 'copper':
      return 'nugget';
    case 'ice':
      return 'spike';
    case 'titanium':
      return 'prism';
    case 'platinum':
      return 'diamond';
    default:
      return 'lump';
  }
}

/**
 * Route dash rhythm per ore, as Skia dash intervals in points (on, off, on, off...): iron long
 * dashes, copper dots, ice dash-dot, titanium double dash, platinum dash-dot-dot. Use them with
 * `<DashPathEffect intervals={ROUTE_DASH[ore]} phase={...} />` (round caps make the dots round).
 */
export const ROUTE_DASH: Record<string, number[]> = {
  iron: [9, 5],
  copper: [0.1, 5],
  ice: [7, 4, 0.1, 4],
  titanium: [4, 2.5, 4, 6],
  platinum: [7, 3.5, 0.1, 3.5, 0.1, 3.5],
};
const DEFAULT_DASH = [6, 6];

/** The dash intervals of an ore's route (unknown ores: plain 6/6). */
export function routeDash(ore: string): number[] {
  return ROUTE_DASH[ore] ?? DEFAULT_DASH;
}

/** One period of `routeDash(ore)` in points (the phase wraps at this length). */
export function routeDashPeriod(ore: string): number {
  return routeDash(ore).reduce((a, b) => a + b, 0);
}

/** The outline of an ore's silhouette, radius `s`. */
export function oreShapePath(ore: string, s: number): SkPath {
  switch (oreShape(ore)) {
    case 'block': {
      const h = s * 0.82;
      const b = s * 0.2;
      return poly([-h + b, -h, h - b, -h, h, -h + b, h, h - b, h - b, h, -h + b, h, -h, h - b, -h, -h + b]);
    }
    case 'nugget': {
      // A slightly lumpy round: three bumps make it read as metal, not a dot.
      const pts: number[] = [];
      for (let i = 0; i < 18; i++) {
        const a = (TAU * i) / 18;
        const k = 0.86 + 0.08 * Math.cos(a * 3 + 0.6);
        pts.push(Math.cos(a) * s * k, Math.sin(a) * s * k * 0.94);
      }
      return poly(pts);
    }
    case 'spike':
      return poly([0, -s * 1.3, s * 0.48, -s * 0.15, s * 0.3, s * 1.05, -s * 0.3, s * 1.05, -s * 0.48, -s * 0.15]);
    case 'prism':
      return ngon(0, 0, s * 0.95, 6, 0);
    case 'diamond':
      return poly([0, -s * 1.05, s * 0.95, -s * 0.15, 0, s * 1.05, -s * 0.95, -s * 0.15]);
    default:
      return ngon(0, 0, s * 0.9, 5, -Math.PI / 2);
  }
}

/** The lit facet of a silhouette (upper left), radius `s`. */
function litFacet(ore: string, s: number): SkPath {
  switch (oreShape(ore)) {
    case 'block': {
      const h = s * 0.82;
      return poly([-h, -h + s * 0.2, -h + s * 0.2, -h, h - s * 0.2, -h, h * 0.3, -h * 0.3, -h * 0.3, h * 0.3, -h, h - s * 0.2]);
    }
    case 'nugget':
      return circle(-s * 0.25, -s * 0.28, s * 0.45);
    case 'spike':
      return poly([0, -s * 1.3, -s * 0.48, -s * 0.15, -s * 0.3, s * 1.05, 0, s * 0.2]);
    case 'prism': {
      // The top face of the prism: a flatter hexagon in the upper half.
      const r = s * 0.95;
      return poly([-r, 0, -r / 2, -r * 0.866, r / 2, -r * 0.866, r, 0, r * 0.45, -r * 0.3, -r * 0.45, -r * 0.3]);
    }
    case 'diamond':
      return poly([0, -s * 1.05, -s * 0.95, -s * 0.15, -s * 0.3, -s * 0.15, 0, -s * 0.6, s * 0.3, -s * 0.15, s * 0.95, -s * 0.15]);
    default:
      return poly([0, -s * 0.9, -s * 0.86, -s * 0.28, 0, 0]);
  }
}

export interface OreShapeStyle {
  /** Soft ore-coloured glow under it (0 = none). Default 0.3. */
  glow?: number;
  /** Outline width; default scales with s. */
  line?: number;
  /** Hollow (outline only, dark inside): an empty drone. */
  hollow?: boolean;
}

/** Draws an ore's silhouette at radius `s`: dark body, lit facet, bright outline. */
export function drawOreShape(c: SkCanvas, ore: string, s: number, st: OreShapeStyle = {}): void {
  const tint = oreColor(ore);
  const p = oreShapePath(ore, s);
  const g = st.glow ?? 0.3;
  const w = st.line ?? Math.max(0.6, s * 0.2);
  if (g > 0) glow(c, 0, 0, s * 2.2, tint, g);
  if (st.hollow) {
    c.drawPath(p, fill(SPACE.hull0));
    c.drawPath(p, stroke(tint, w));
    return;
  }
  c.drawPath(p, fill(mix(tint, '#000000', 0.38)));
  c.drawPath(litFacet(ore, s), fill(tint));
  if (oreShape(ore) === 'prism') {
    // Prism edges: the vertical edges under the top face.
    const r = s * 0.95;
    for (const x of [-r * 0.45, r * 0.45]) c.drawPath(poly([x, -r * 0.3, x * 1.1, r * 0.8], false), stroke(alpha(mix(tint, '#FFFFFF', 0.4), 0.7), w * 0.6));
  }
  c.drawPath(p, stroke(mix(tint, '#FFFFFF', 0.45), w));
}
