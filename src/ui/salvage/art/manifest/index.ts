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
import { WORKS_HALLS } from './worksHalls';
import { WORKS_HALL_PARTS } from './worksHallParts';
import { WORKS_STORE } from './worksStore';
import { WORKS_LINE } from './worksLine';
import { WORKS_PLOTS } from './worksPlots';
import { WORKS_TRUCK3 } from './worksTruck3';
import { WORKS_LORRIES } from './worksLorries';
import { WORKS_PEOPLE } from './worksPeople';
import { WORKS_LANE } from './worksLane';
import { WORKS_THINGS } from './worksThings';
import { WORKS_SALE } from './worksSale';
import { WORKS_SMALL } from './worksSmall';

/**
 * The first yard's three sheets (world/atlas.ts bakes exactly these for every player; their pixels are held by
 * sheets.hash.test.ts against BASELINE's record of ff064ce). NOTHING of the works goes on A, B or G.
 */
export type Sheet = 'A' | 'B' | 'G';
/**
 * THE WORKS' SHEETS (PLAN2 2.7; stage 2 only, baked from rung 2 under stageOn(), each at most 2048 x 2048 at density 2):
 *   sheet 'C'  the plant of the works (halls, their parts, the store, the shredder line, plots, the big lots, the Yard sale)
 *   sheet 'D'  moving things (the hook-lift, the crane lorry, visitors, the boss's new poses, the van), the lane's new
 *              sites and the small things, glyphs and pictograms of the works' grades
 * (S stays the world's shadow sheet, baked by world/useYard.ts.) A works entry is a ManifestEntry<WorksSheet>; it is
 * NOT in MANIFEST (whose indices, sheets and bake the first yard's world and tests read): it is in WORKS_MANIFEST.
 * C-WORLD-1 joins the two when atlas.ts takes a sheet list (requests.md [seam] C-ART 28 Nov).
 */
export type WorksSheet = 'C' | 'D';
export type AnySheet = Sheet | WorksSheet;

/** A box in points round the anchor (x, y are its top-left, so usually negative). */
export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ManifestEntry<S extends AnySheet = Sheet> {
  id: string;
  /** what the world looks it up by in bulk, e.g. 'person', 'thing', 'piece', 'plant', 'prop', 'ui', 'ground', 'mark' */
  group: string;
  sheet: S;
  /** metres on the ground (east-west w, north-south d); the world sorts by the footprint's south edge */
  footprint: { w: number; d: number };
  bounds: Bounds;
  /** optional tighter boxes, one per BAKED heading (bakedHeadings order); the atlas packs these when given */
  boundsByHeading?: readonly Bounds[];
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

/** An entry of the works (sheet C or D). */
export type WorksEntry = ManifestEntry<WorksSheet>;

/**
 * The works' twelve parts (PLAN2 2.7), each its own file owned by its art package (ART-HALLS ... ART-SMALL); C-ART put
 * every entry in with its final id, group, sheet, footprint, frames, headings, anchor and slots and a labelled
 * placeholder box. Anchors: the first yard's code (the footprint's centre on the ground, a vehicle's too: vehicles.draw.ts
 * `drawTruck`; slots named).
 */
export const WORKS_PARTS = {
  worksHalls: WORKS_HALLS,
  worksHallParts: WORKS_HALL_PARTS,
  worksStore: WORKS_STORE,
  worksLine: WORKS_LINE,
  worksPlots: WORKS_PLOTS,
  worksTruck3: WORKS_TRUCK3,
  worksLorries: WORKS_LORRIES,
  worksPeople: WORKS_PEOPLE,
  worksLane: WORKS_LANE,
  worksThings: WORKS_THINGS,
  worksSale: WORKS_SALE,
  worksSmall: WORKS_SMALL,
} as const;

export const PARTS = { people: PEOPLE, things: THINGS, plant: PLANT, ...WORKS_PARTS } as const;

/** Every entry of the first yard's three parts, in a stable order (sheets A, B, G only). */
export const MANIFEST: readonly ManifestEntry[] = [...PEOPLE, ...THINGS, ...PLANT];

/** Every entry of the works' twelve parts, in a stable order (sheets C and D only). */
export const WORKS_MANIFEST: readonly WorksEntry[] = Object.values(WORKS_PARTS).flat();

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

/** The box of an entry's cell at a baked heading (boundsByHeading when given, else bounds). */
export function cellBounds(e: Pick<ManifestEntry<AnySheet>, 'headings' | 'mirrorWest' | 'bounds' | 'boundsByHeading'>, heading: number): Bounds {
  const i = bakedHeadings(e).indexOf(heading);
  return (i >= 0 && e.boundsByHeading?.[i]) || e.bounds;
}

/** Pixels an entry takes in its atlas at a density (cells of every baked frame and heading). */
export function entryPixels(e: ManifestEntry<AnySheet>, density: number): number {
  let n = 0;
  for (const h of bakedHeadings(e)) {
    const b = cellBounds(e, h);
    n += Math.ceil(b.w * density) * Math.ceil(b.h * density);
  }
  return n * e.frames.length;
}

export const byId = (id: string): ManifestEntry | undefined => MANIFEST.find((e) => e.id === id);

/** A works entry by id (sheets C and D), else undefined. */
export const worksById = (id: string): WorksEntry | undefined => WORKS_MANIFEST.find((e) => e.id === id);
