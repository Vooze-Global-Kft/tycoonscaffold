/**
 * Tap areas of the scene, derived at render time from the shared layout (src/ui/sim/layout.ts),
 * so they follow whatever the world draws. Every area is at least 44 pt each way.
 */
import { workerHome, type SceneLayout } from '../../layout';
import type { TargetRect } from '../../../hints/targets';

export const MIN_TAP = 44;
export const BELL_TAP = 56;

const grow = (r: TargetRect): TargetRect => {
  const w = Math.max(MIN_TAP, r.width);
  const h = Math.max(MIN_TAP, r.height);
  return { x: r.x - (w - r.width) / 2, y: r.y - (h - r.height) / 2, width: w, height: h };
};

/** A station with its worker in front: from above the drawn station down to the worker's feet. */
export function stationRect(layout: SceneLayout, i: number): TargetRect | null {
  const st = layout.stations[i];
  const cook = layout.cooks[i];
  if (!st || !cook) return null;
  const spacing = layout.stations.length > 1 ? layout.stations[1].x - layout.stations[0].x : layout.stationSize * 1.4;
  const width = Math.min(spacing - 2, layout.stationSize * 1.3);
  const top = Math.max(0, st.y - layout.stationSize * 1.15);
  return grow({ x: st.x - width / 2, y: top, width, height: cook.y + 4 - top });
}

export function bellRect(layout: SceneLayout): TargetRect {
  return { x: layout.bell.x - BELL_TAP / 2, y: layout.bell.y - BELL_TAP / 2, width: BELL_TAP, height: BELL_TAP };
}

/** The counter and the waiters standing in front of it (they are drawn overlapping it). */
export function transportRect(layout: SceneLayout): TargetRect {
  const feet = workerHome(layout, 0, 1).y;
  const top = layout.pass.y - layout.height * 0.03;
  return grow({ x: layout.pass.x, y: top, width: layout.pass.width, height: feet + 4 - top });
}

/** A table and the guest sitting at it. */
export function tableRect(layout: SceneLayout, i: number): TargetRect | null {
  const tb = layout.tables[i];
  const guest = layout.guests[i];
  if (!tb || !guest) return null;
  const size = layout.tableSize * 1.25;
  const top = Math.min(tb.y - size / 2, guest.y - layout.characterHeight * 0.55);
  return grow({ x: tb.x - size / 2 - layout.width * 0.02, y: top, width: size + layout.width * 0.04, height: tb.y + size / 2 - top });
}
