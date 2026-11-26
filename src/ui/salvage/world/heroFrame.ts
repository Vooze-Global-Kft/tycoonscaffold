/**
 * THE HERO FRAME (yard-stage1.md section 3 and S19, E23): the working core of the first yard (the
 * platform scale, the weighbridge, the stripper pad, the crucible pad, the copper and brass stillages
 * and the price board) in ONE frame between the top bar and the bottom row at 844 x 390: the first
 * store screenshot (copper, a ticket and a pour in one real frame).
 *
 * Pure maths on the content (positions flow content -> game.json -> here; MAP.md M7, finding L2):
 * - `heroBox` the content's `map.hero` frame (x0, y0, w, d: the ground south of the back wall that the
 *   store's first screenshot holds) and its members' footprints (`map.hero.places`); without `map.hero`
 *   the union of the members' footprints;
 * - `freeWorld` the screen's free world (4.1's rows from hud/metrics.ts: top bar and goal card above,
 *   the stick zone and the one button's row below; the safe-area insets on all four sides);
 * - `heroCamera` the camera (top-left of the view, points): the frame centred between the side margins,
 *   its south edge on the screen's bottom, so the back wall and the far yard over it
 *   stand under the top bar;
 * - `heroCheck` each member's footprint on screen, whether it lies whole between the bars and the side
 *   margins, and how many points of far yard show between the top bar and the back wall's top.
 *
 * `?view=hero` (and `?view=hero-store`, the store variant without the stick) puts the camera there: the
 * world layer (./WorldLayer.tsx) writes `heroCam` on the JavaScript thread and the frame loop (world-a's
 * ./frameLoop.ts) holds its camera at it while `on` is 1. Both switches are read through the shared
 * devtools, which are null on phones, so a phone never sees the hero frame.
 */
import { makeMutable } from 'react-native-reanimated';
import type { SalvageContent } from '../../../config/schema.salvage';
import { devView } from '../../../dev/devtools';
import { hudLayout } from '../hud/metrics';

/** The places of the hero frame when the content names none (S19); every place whose id starts with `stillage` counts. */
export const HERO_MEMBERS = ['scale', 'weighbridge', 'stripper', 'crucible', 'stillage', 'board'] as const;

/** The back wall's lock-blocks stand this high, metres (one block, as the art director's picture draws it: proof.draw.ts). */
export const WALL_H_M = 0.8;
/** Far yard the hero frame shows between the top bar and the back wall's top, points (MAP.md M7). */
export const FAR_YARD_PT = 40;

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
  /** Members the content has no place for. */
  missing: string[];
}

type MapLike = { map: { places: unknown; points: unknown; footprints?: unknown; hero?: { x0: number; y0: number; w: number; d: number; places: string[] }; north?: number } };

/** The hero frame and its members' footprints, metres on the ground. */
export function heroBox(c: MapLike): HeroBox {
  const places = c.map.places as Record<string, { w: number; d: number }>;
  const points = c.map.points as Record<string, [number, number]>;
  const hero = c.map.hero;
  const members: Footprint[] = [];
  const missing: string[] = [];
  const wanted: string[] = hero ? hero.places : [...HERO_MEMBERS];
  for (const m of wanted) {
    const ids = Object.keys(places).filter((id) => (!hero && m === 'stillage' ? id.startsWith('stillage') : id === m));
    const found = ids.filter((id) => points[id]);
    // A member that is no place (the cable bundle) by its footprint in `map.footprints`.
    const fp = (c.map.footprints as Record<string, { x: number; y: number; w: number; d: number }> | undefined)?.[m];
    if (found.length === 0 && fp) {
      members.push({ id: m, x0: fp.x - fp.w / 2, y0: fp.y - fp.d / 2, x1: fp.x + fp.w / 2, y1: fp.y + fp.d / 2 });
      continue;
    }
    if (found.length === 0) missing.push(m);
    for (const id of found) {
      const [x, y] = points[id];
      const { w, d } = places[id];
      members.push({ id, x0: x - w / 2, y0: y - d / 2, x1: x + w / 2, y1: y + d / 2 });
    }
  }
  if (hero) return { x0: hero.x0, y0: hero.y0, x1: hero.x0 + hero.w, y1: hero.y0 + hero.d, members, missing };
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

/** The free world of 4.1 (between the top bar with the goal card and the bottom row), window points (hud/metrics.ts's rows). */
export function freeWorld(width: number, height: number, i: ScreenInsets): { x0: number; y0: number; x1: number; y1: number } {
  const L = hudLayout(width, height, i, 1);
  return { x0: L.left, y0: L.freeY, x1: L.right, y1: L.bottomY };
}

/**
 * Where the hero frame must lie: inside the safe area's sides, under the top bar, down to the screen's bottom
 * edge (the store's picture has no stick and no button; the home indicator is a thin line drawn over the
 * picture, and at 844 x 390 the 21 pt inset is what lets the back wall keep its 40 pt of far yard).
 */
export function heroArea(width: number, height: number, i: ScreenInsets): { x0: number; y0: number; x1: number; y1: number; bar: number } {
  const L = hudLayout(width, height, i, 1);
  // Sideways the safe area (the 16 pt margins are for text: at 667 the frame's 16.7 m is the whole width).
  return { x0: Math.max(0, i.left), y0: L.goalY, x1: width - Math.max(0, i.right), y1: height, bar: L.goalY };
}

export interface View {
  ppm: number;
  tilt: number;
  lift?: number;
}

/** The camera (top-left of the view, points): the frame centred between the side margins, its south edge on the screen's bottom. */
export function heroCamera(c: MapLike, v: View, width: number, height: number, i: ScreenInsets): { x: number; y: number } {
  const b = heroBox(c);
  const a = heroArea(width, height, i);
  const cx = ((b.x0 + b.x1) / 2) * v.ppm;
  const fitsTall = (b.y1 - b.y0) * v.ppm * v.tilt <= a.y1 - a.y0;
  // A frame taller than the area (no map.hero yet): centred between the bars instead.
  const y = fitsTall ? b.y1 * v.ppm * v.tilt - a.y1 : ((b.y0 + b.y1) / 2) * v.ppm * v.tilt - (a.y0 + a.y1) / 2;
  return { x: cx - (a.x0 + a.x1) / 2, y };
}

export interface HeroCheck {
  /** Each member's footprint on screen (window points) and whether it lies whole in the hero area. */
  members: { id: string; x0: number; y0: number; x1: number; y1: number; inside: boolean }[];
  missing: string[];
  free: { x0: number; y0: number; x1: number; y1: number };
  /** The frame's size on screen, points. */
  box: { w: number; h: number };
  /** Points of far yard between the top bar's bottom and the back wall's top (null: the content has no map.north). */
  farYard: number | null;
}

/** Where every member's footprint lands with the hero camera (the test reads this). */
export function heroCheck(c: MapLike, v: View, width: number, height: number, i: ScreenInsets): HeroCheck {
  const b = heroBox(c);
  const free = heroArea(width, height, i);
  const cam = heroCamera(c, v, width, height, i);
  const members = b.members.map((m) => {
    const x0 = m.x0 * v.ppm - cam.x;
    const x1 = m.x1 * v.ppm - cam.x;
    const y0 = m.y0 * v.ppm * v.tilt - cam.y;
    const y1 = m.y1 * v.ppm * v.tilt - cam.y;
    return { id: m.id, x0, y0, x1, y1, inside: x0 >= free.x0 - 0.01 && x1 <= free.x1 + 0.01 && y0 >= free.y0 - 0.01 && y1 <= free.y1 + 0.01 };
  });
  const north = c.map.north;
  const lift = v.lift ?? Math.sqrt(1 - v.tilt * v.tilt);
  const farYard = typeof north === 'number' ? north * v.ppm * v.tilt - WALL_H_M * v.ppm * lift - cam.y - free.bar : null;
  return { members, missing: b.missing, free, box: { w: (b.x1 - b.x0) * v.ppm, h: (b.y1 - b.y0) * v.ppm * v.tilt }, farYard };
}
