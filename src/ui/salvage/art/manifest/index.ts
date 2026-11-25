/**
 * THE SPRITE MANIFEST (the art director's file): everything the yard view draws reaches it through one
 * of three parts, joined here and baked by world/atlas.ts into the atlases (yard-design.md 6.2 and
 * package 5 of section 9):
 *   sheet 'A'  people, things, pieces        at most 2048 x 2048 px at the device's density
 *   sheet 'B'  vehicles, machines, props, interface plates   at most 2048 x 2048 px
 *   sheet 'G'  ground (tiles, decals, the sun's shadow tint)  1024 x 1024 px
 * Parts: people.ts (artist "people"), things.ts (artist "things"), plant.ts (the art director).
 * Each part owns its own file; nobody edits another part's entries.
 *
 * CONVENTIONS (yard-style.md, art/README.md)
 * - id: lower-case dotted words, e.g. thing.washer.whole, piece.copper.bright, person.boss.walk,
 *   plant.crucible.pour. Where yard-stage1.md section 6 names a sprite, keep that name.
 * - draw(canvas, view, frame, heading) draws ROUND THE ANCHOR, the centre of the footprint on the
 *   ground, in the kit's View3q (pen.VIEW: 40 pt a metre, tilt 0.7). It is pure Skia (no React).
 * - bounds: the box in points round the anchor that the drawing stays inside at pen.VIEW, shadow
 *   included (x and y are the top-left, so both are usually negative). The atlas cell is this box
 *   times the density, rounded up. A test (art/manifest/manifest.test.ts) checks every entry.
 * - frames: the names of the frames, in order (frames.length is the count). draw gets 0..n-1.
 * - headings: 1 (one view), 4 (0 south, 1 east, 2 north, 3 west) or 8 (0 s, 1 se, 2 e, 3 ne, 4 n,
 *   5 nw, 6 w, 7 sw). With mirrorWest the atlas bakes only the east-facing half (4: s, e, n; 8: s,
 *   se, e, ne, n) and draws the west-facing headings as their east mirror; draw is never called with
 *   a west heading.
 * - tint: the sprite is baked in this light neutral colour where the world may recolour it per instance
 *   (the Atlas's colours with the modulate blend: e.g. containers baked near white and modulated to
 *   teal, oxide or sage; a crew vest). Omit when nothing is tinted.
 * - drawScale: the world draws the sprite at this scale (soft things such as a light pool are baked
 *   small and drawn larger). Default 1.
 * - No words in a sprite: names and numbers on signs, displays and tickets are the caller's and are
 *   drawn by the world over the sprite (yard-stage1.md 6; the names desk is still changing them).
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import type { View3q } from '../pen';
import { PEOPLE } from './people';
import { PLANT } from './plant';
import { THINGS } from './things';

export type Sheet = 'A' | 'B' | 'G';

/** A box in points round the anchor (x, y are its top-left, so usually negative). */
export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ManifestEntry {
  id: string;
  /** what the world looks it up by in bulk, e.g. 'person', 'thing', 'piece', 'plant', 'prop', 'ui', 'ground', 'mark' */
  group: string;
  sheet: Sheet;
  /** metres on the ground (east-west w, north-south d); the world sorts by the footprint's south edge */
  footprint: { w: number; d: number };
  bounds: Bounds;
  /** one name per frame, e.g. ['idle'] or ['walk1', 'walk2', 'walk3', 'walk4'] */
  frames: readonly string[];
  headings: 1 | 4 | 8;
  mirrorWest?: boolean;
  /** light neutral colour baked where the world may modulate per instance (see above) */
  tint?: string;
  /** the scale the world draws this sprite at (default 1) */
  drawScale?: number;
  /** where on the sprite the caller's words or numbers go, in points round the anchor (a sign, a display) */
  slots?: Readonly<Record<string, Bounds>>;
  draw(c: SkCanvas, v: View3q, frame: number, heading: number): void;
}

export const PARTS = { people: PEOPLE, things: THINGS, plant: PLANT } as const;

/** Every entry of the three parts, in a stable order. */
export const MANIFEST: readonly ManifestEntry[] = [...PEOPLE, ...THINGS, ...PLANT];

/** The headings the atlas bakes for an entry (west-facing ones dropped when mirrorWest). */
export function bakedHeadings(e: Pick<ManifestEntry, 'headings' | 'mirrorWest'>): number[] {
  const all = Array.from({ length: e.headings }, (_, i) => i);
  if (!e.mirrorWest) return all;
  if (e.headings === 4) return [0, 1, 2];
  if (e.headings === 8) return [0, 1, 2, 3, 4];
  return all;
}

/** For a west-facing heading under mirrorWest: the baked heading it mirrors, else null. */
export function mirrorOf(e: Pick<ManifestEntry, 'headings' | 'mirrorWest'>, heading: number): number | null {
  if (!e.mirrorWest) return null;
  if (e.headings === 4) return heading === 3 ? 1 : null;
  if (e.headings === 8) return heading >= 5 ? 8 - heading : null;
  return null;
}

/** Pixels an entry takes in its atlas at a density (cells of every baked frame and heading). */
export function entryPixels(e: ManifestEntry, density: number): number {
  const w = Math.ceil(e.bounds.w * density);
  const h = Math.ceil(e.bounds.h * density);
  return w * h * e.frames.length * bakedHeadings(e).length;
}

export const byId = (id: string): ManifestEntry | undefined => MANIFEST.find((e) => e.id === id);
