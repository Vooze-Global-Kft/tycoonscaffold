/**
 * The scene's own recorded pictures (everything else comes from the art kit's `pictures`): the
 * ring guides of a layout, pile labels, the seam guide, the freighter's flame
 * frames and the warp flash. Recorded once per key. Caches that could grow (labels, ring guides
 * per layout, seam guides, route paths) drop their
 * oldest entries from the map but never dispose a picture: a mounted canvas may still hold it,
 * and the garbage collector frees it once nothing draws it (AGENTS.md).
 */
import type { SkPath, SkPicture } from '@shopify/react-native-skia';
import { line } from '../art/pen';
import { drawFreighterFlame, drawPileLabel, drawRingGuides, drawSeamGuide, drawWarpFlash, freighterSize, picture, type HullId } from '../art';
import type { FieldLayout } from '../layout';

const keep = new Map<string, SkPicture>();
function memo(key: string, make: () => SkPicture): SkPicture {
  let p = keep.get(key);
  if (!p) {
    p = make();
    keep.set(key, p);
  }
  return p;
}

/** A map that drops its oldest entry past `max` (never disposing it: a mounted canvas may still draw it). */
function bounded<T>(max: number) {
  const m = new Map<string, T>();
  return (key: string, make: () => T): T => {
    let v = m.get(key);
    if (v !== undefined) return v;
    v = make();
    m.set(key, v);
    if (m.size > max) {
      const oldest = m.keys().next().value;
      if (oldest !== undefined) m.delete(oldest);
    }
    return v;
  };
}
const rings = bounded<SkPicture>(4);
const labels = bounded<SkPicture>(160);
const guides = bounded<SkPicture>(24);
const paths = bounded<SkPath>(64);

const layoutKey = (L: FieldLayout) => `${L.width}x${L.height}:${L.station.x},${L.station.y},${L.rocks.map((r) => `${r.x.toFixed(1)},${r.y.toFixed(1)}`).join(';')}`;

/** Dashed ring arcs with their "R2" labels in the left gutter, kept clear of the rocks and of `avoid` (pile labels: x, y). */
export function ringGuidesPicture(L: FieldLayout, avoid: readonly { x: number; y: number }[] = []): SkPicture {
  return rings(`rings:${layoutKey(L)}`, () =>
    picture({ x: 0, y: 0, w: L.width, h: L.height }, (c) =>
      drawRingGuides(c, L.station.x, L.station.y, L.radii, 62, {
        rocks: L.rocks.map((r) => [r.x, r.y] as [number, number]),
        rockR: L.rocks[0]?.r ?? 26,
        avoid: avoid.map((p) => [p.x, p.y, 40] as [number, number, number]),
      }),
    ),
  );
}

/** A pile label ("62/80" after the ore's pip; full = amber with an up-arrow). At most 160 kept in the map. */
export function pileLabelPicture(text: string, full: boolean, ore?: string): SkPicture {
  return labels(`${text}:${full}:${ore ?? ''}`, () => picture({ x: -45, y: -12, w: 90, h: 24 }, (c) => drawPileLabel(c, text, full, ore)));
}

/** The dashed gold guide from the busiest route's chip to the seam rock (at most 24 kept). */
export function seamGuidePicture(x0: number, y0: number, x1: number, y1: number): SkPicture {
  return guides(`seamguide:${x0.toFixed(0)},${y0.toFixed(0)},${x1.toFixed(0)},${y1.toFixed(0)}`, () => {
    const pad = 4;
    return picture({ x: Math.min(x0, x1) - pad, y: Math.min(y0, y1) - pad, w: Math.abs(x1 - x0) + 2 * pad, h: Math.abs(y1 - y0) + 2 * pad }, (c) => drawSeamGuide(c, x0, y0, x1, y1));
  });
}

/** The freighter's engine flame, frame 0 to 2, origin at the freighter centre (nose up). */
export function freighterFlamePicture(hull: HullId, segments: number, frame: number): SkPicture {
  return memo(`fflame:${hull}:${segments}:${frame}`, () => {
    const sz = freighterSize(hull, segments);
    return picture({ x: -sz.w, y: -sz.h, w: sz.w * 2, h: sz.h * 2 + 40 }, (c) => drawFreighterFlame(c, hull, segments, [0.35, 0.7, 1][frame] ?? 1));
  });
}

/** The warp flash at its brightest moment, centred (scaled and faded over 0.5 s by the frame loop). */
export function warpFlashPicture(): SkPicture {
  return memo('warpflash', () => picture({ x: -90, y: -90, w: 180, h: 180 }, (c) => drawWarpFlash(c, 0.35)));
}

/** A straight route line from the rock to the hub (built once per layout; at most 64 kept). */
export function routePath(x0: number, y0: number, x1: number, y1: number): SkPath {
  return paths(`${x0.toFixed(1)},${y0.toFixed(1)},${x1.toFixed(1)},${y1.toFixed(1)}`, () => line(x0, y0, x1, y1));
}
