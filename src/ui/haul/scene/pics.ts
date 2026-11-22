/**
 * The scene's own recorded pictures (everything else comes from the art kit's `pictures`): the
 * ring guides and the bay panel of a layout, pile labels, the seam guide, the freighter's flame
 * frames and the warp flash. Recorded once per key. Caches that could grow (labels) drop their
 * oldest entries from the map but never dispose a picture: a mounted canvas may still hold it,
 * and the garbage collector frees it once nothing draws it (AGENTS.md).
 */
import type { SkPath, SkPicture } from '@shopify/react-native-skia';
import { builder, line, linearPaint, litStroke } from '../art/pen';
import { SPACE, drawFreighterFlame, drawPileLabel, drawRingGuides, drawSeamGuide, drawWarpFlash, freighterSize, picture, type HullId } from '../art';
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

const layoutKey = (L: FieldLayout) => `${L.width}x${L.height}:${L.station.x},${L.station.y},${L.rocks.map((r) => `${r.x.toFixed(1)},${r.y.toFixed(1)}`).join(';')}`;

/** Dashed ring arcs with their "R2" labels in the left gutter, kept clear of the rocks. */
export function ringGuidesPicture(L: FieldLayout): SkPicture {
  return memo(`rings:${layoutKey(L)}`, () =>
    picture({ x: 0, y: 0, w: L.width, h: L.height }, (c) =>
      drawRingGuides(c, L.station.x, L.station.y, L.radii, 62, { rocks: L.rocks.map((r) => [r.x, r.y] as [number, number]), rockR: L.rocks[0]?.r ?? 26 }),
    ),
  );
}

/** The freighter bay's dark panel with its lit curved top edge (spec 4.1). */
export function bayPanelPicture(L: FieldLayout): SkPicture {
  const top = L.zones.bay.y;
  const w = L.width;
  const h = L.height;
  return memo(`bay:${w}x${h}:${top}`, () =>
    picture({ x: 0, y: top - 20, w, h: h - top + 20 }, (c) => {
      const panel = builder().moveTo(0, top + 14).quadTo(w / 2, top - 14, w, top + 14).lineTo(w, h).lineTo(0, h).close().build();
      c.drawPath(panel, linearPaint(0, top, 0, h, [SPACE.panel, '#080D1C']));
      const edge = builder().moveTo(0, top + 14).quadTo(w / 2, top - 14, w, top + 14).build();
      litStroke(c, edge, SPACE.panelEdge, 1.5, 0.8);
    }),
  );
}

const labels = new Map<string, SkPicture>();
/** A pile label ("62/80"; full = amber with an up-arrow). At most 160 kept in the map. */
export function pileLabelPicture(text: string, full: boolean): SkPicture {
  const key = `${text}:${full}`;
  let p = labels.get(key);
  if (p) return p;
  p = picture({ x: -40, y: -12, w: 80, h: 24 }, (c) => drawPileLabel(c, text, full));
  labels.set(key, p);
  if (labels.size > 160) {
    const oldest = labels.keys().next().value;
    if (oldest !== undefined) labels.delete(oldest);
  }
  return p;
}

/** The dashed gold guide from the busiest route's chip to the seam rock. */
export function seamGuidePicture(x0: number, y0: number, x1: number, y1: number): SkPicture {
  return memo(`seamguide:${x0.toFixed(0)},${y0.toFixed(0)},${x1.toFixed(0)},${y1.toFixed(0)}`, () => {
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

const paths = new Map<string, SkPath>();
/** A straight route line from the rock to the hub (built once per layout). */
export function routePath(x0: number, y0: number, x1: number, y1: number): SkPath {
  const key = `${x0.toFixed(1)},${y0.toFixed(1)},${x1.toFixed(1)},${y1.toFixed(1)}`;
  let p = paths.get(key);
  if (!p) {
    p = line(x0, y0, x1, y1);
    paths.set(key, p);
  }
  return p;
}
