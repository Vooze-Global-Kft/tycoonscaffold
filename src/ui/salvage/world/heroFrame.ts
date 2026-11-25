/**
 * THE HERO FRAME (yard-stage1.md section 3 and S19, E23): the working core of the first yard (the
 * platform scale, the weighbridge, the stripper pad, the crucible pad, the copper and brass stillages
 * and the price board) in ONE frame between the top bar and the bottom row at 844 x 390: the first
 * store screenshot (copper, a ticket and a pour in one real frame).
 *
 * Pure maths on the content's footprints (`map.places`, positions flow content -> game.json -> here):
 * - `heroBox` the union of the members' footprints on the ground, metres, and which members the content
 *   does not have yet;
 * - `freeWorld` the screen's free world (4.1's rows: top bar and goal card above, the stick zone and the
 *   one button's row below; the safe-area insets on all four sides);
 * - `heroCamera` the camera (top-left of the view, points) that centres the box in the free world;
 * - `heroCheck` each member's footprint on screen and whether it lies inside the free world.
 *
 * `?view=hero` (and `?view=hero-store`, the store variant without the stick) puts the camera there: the
 * world layer (./WorldLayer.tsx) writes `heroCam` on the JavaScript thread and the frame loop (world-a's
 * ./frameLoop.ts) holds its camera at it while `on` is 1. Both switches are read through the shared
 * devtools, which are null on phones, so a phone never sees the hero frame.
 */
import { makeMutable } from 'react-native-reanimated';
import type { SalvageContent } from '../../../config/schema.salvage';
import { devView } from '../../../dev/devtools';

/** The places of the hero frame (S19); every place whose id starts with `stillage` counts (copper and brass). */
export const HERO_MEMBERS = ['scale', 'weighbridge', 'stripper', 'crucible', 'stillage', 'board'] as const;

/** The two review switches (web preview only; phones: both false). */
export const HERO = (() => {
  const v = devView();
  return { on: v === 'hero' || v === 'hero-store', store: v === 'hero-store' };
})();

/** The camera the frame loop holds while `on` is 1: its top-left in points (camX, camY of ./frameLoop.ts). */
export const heroCam = makeMutable({ on: 0, x: 0, y: 0 });

export interface Footprint {
  id: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface HeroBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  members: Footprint[];
  /** Members the content has no place for yet (the third pass adds the price board and the two stillages). */
  missing: string[];
}

/** The members' footprints and their union, metres on the ground. */
export function heroBox(c: Pick<SalvageContent, 'map'>): HeroBox {
  const places = c.map.places as Record<string, { w: number; d: number }>;
  const points = c.map.points as Record<string, [number, number]>;
  const members: Footprint[] = [];
  const missing: string[] = [];
  for (const m of HERO_MEMBERS) {
    const ids = Object.keys(places).filter((id) => (m === 'stillage' ? id.startsWith('stillage') : id === m));
    const found = ids.filter((id) => points[id]);
    if (found.length === 0) missing.push(m);
    for (const id of found) {
      const [x, y] = points[id];
      const { w, d } = places[id];
      members.push({ id, x0: x - w / 2, y0: y - d / 2, x1: x + w / 2, y1: y + d / 2 });
    }
  }
  const x0 = Math.min(...members.map((f) => f.x0));
  const y0 = Math.min(...members.map((f) => f.y0));
  const x1 = Math.max(...members.map((f) => f.x1));
  const y1 = Math.max(...members.map((f) => f.y1));
  return { x0, y0, x1, y1, members, missing };
}

export interface ScreenInsets {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** The free world of 4.1 (between the top bar with the goal card and the bottom row), window points. */
export function freeWorld(width: number, height: number, i: ScreenInsets): { x0: number; y0: number; x1: number; y1: number } {
  // 4.1's rows: at 844 x 390 a top bar of 36 and a goal card of 28, a bottom row of 8 + 60 (+ the inset);
  // at 667 x 375 34 + 26 and 60 + 16 (no insets, 16 pt margins).
  const small = width < 760;
  const top = i.top + (small ? 34 + 26 : 36 + 28);
  const bottom = height - i.bottom - (small ? 60 + 16 : 8 + 60);
  const side = small ? 16 : 0;
  return { x0: i.left + side, y0: top, x1: width - i.right - side, y1: bottom };
}

export interface View {
  ppm: number;
  tilt: number;
}

/** The camera (top-left of the view, points) that centres the hero box in the free world. */
export function heroCamera(c: Pick<SalvageContent, 'map'>, v: View, width: number, height: number, i: ScreenInsets): { x: number; y: number } {
  const b = heroBox(c);
  const f = freeWorld(width, height, i);
  const cx = ((b.x0 + b.x1) / 2) * v.ppm;
  const cy = ((b.y0 + b.y1) / 2) * v.ppm * v.tilt;
  return { x: cx - (f.x0 + f.x1) / 2, y: cy - (f.y0 + f.y1) / 2 };
}

export interface HeroCheck {
  /** Each member's footprint on screen (window points) and whether it lies inside the free world. */
  members: { id: string; x0: number; y0: number; x1: number; y1: number; inside: boolean }[];
  missing: string[];
  free: { x0: number; y0: number; x1: number; y1: number };
  /** The box's size on screen against the free world's, points. */
  box: { w: number; h: number };
}

/** Where every member's footprint lands with the hero camera (the test reads this). */
export function heroCheck(c: Pick<SalvageContent, 'map'>, v: View, width: number, height: number, i: ScreenInsets): HeroCheck {
  const b = heroBox(c);
  const free = freeWorld(width, height, i);
  const cam = heroCamera(c, v, width, height, i);
  const members = b.members.map((m) => {
    const x0 = m.x0 * v.ppm - cam.x;
    const x1 = m.x1 * v.ppm - cam.x;
    const y0 = m.y0 * v.ppm * v.tilt - cam.y;
    const y1 = m.y1 * v.ppm * v.tilt - cam.y;
    return { id: m.id, x0, y0, x1, y1, inside: x0 >= free.x0 - 0.01 && x1 <= free.x1 + 0.01 && y0 >= free.y0 - 0.01 && y1 <= free.y1 + 0.01 };
  });
  return { members, missing: b.missing, free, box: { w: (b.x1 - b.x0) * v.ppm, h: (b.y1 - b.y0) * v.ppm * v.tilt } };
}
