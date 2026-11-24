/**
 * The atlas layout of the cast (spec 4.5): where each bust, portrait and cut-out goes in the faces
 * atlas, in pixels, with a function that draws it into its cell. The props package's atlas.ts bakes
 * these pages once (beside its own) and serves "face:<castId>"; `bakeFacePage` here is the same
 * bake for the contact sheets and tests.
 *
 * Pages (each under 2,048 px; the busts' pages fit 1,024 x 960):
 *   faces     8 x 6 cells of 128 x 160 px: the first 48 busts of the register's order
 *   faces2    8 x 4 cells of 128 x 160 px: the remaining busts (10 rivals), then the six player
 *             faces as one-colour portraits at ageing steps 0, 1, 2 (18)
 *   cutouts   8 x 3 cells of 120 x 340 px: the Counting Clerk and the 18 rivals as cut-outs, and
 *             the band (240 x 180 px) in the last row
 * The spec's "48 busts at 128 x 160 in 8 x 6, 1,024 x 960, plus the 6 portraits" holds 48: the
 * register has 58 cast ids (14 spokespeople and 18 rivals), hence the second page.
 *
 * Every cell has a 2 px transparent border (nothing is drawn into it), so linear sampling never
 * bleeds a neighbour. A sprite's rect is its whole cell; the anchor is the cell's centre.
 */
import { ClipOp, Skia, type SkCanvas, type SkImage } from '@shopify/react-native-skia';
import { drawBust } from './bust.draw';
import { CAST_IDS, CUTOUT_IDS, PLAYER_IDS } from './cast';
import { drawBand, drawCutout } from './cutout.draw';
import { P } from './ink';

export const BUST_CELL = { w: 128, h: 160 } as const;
export const CUTOUT_CELL = { w: 120, h: 340 } as const;
export const PAD = 2;
/** The Office wall's ageing steps (0 as elected, 1 a little greyer, 2 greyer). */
export const AGE_STEPS = 3;
/** The portraits' one colour: the deep violet ink on the paper. */
export const PORTRAIT_INK = { ink: '#3F2A66', paper: P.paper } as const;

export type FacePageId = 'faces' | 'faces2' | 'cutouts';
export const FACE_PAGES: readonly FacePageId[] = ['faces', 'faces2', 'cutouts'];

export interface FaceSprite {
  /** Sprite name: `face-<castId>`, `portrait-<castId>-<age>`, `cutout-<castId>`, `band`. */
  name: string;
  page: FacePageId;
  /** The cell in pixels at density 1 (the bake scales by its density). */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Draws the sprite into (0, 0, w, h) at density 1, inside the 2 px border. */
  draw: (c: SkCanvas) => void;
}

export function faceSpriteName(castId: string): string {
  return `face-${castId}`;
}
export function portraitSpriteName(castId: string, age: number): string {
  return `portrait-${castId}-${Math.max(0, Math.min(AGE_STEPS - 1, age))}`;
}
export function cutoutSpriteName(castId: string): string {
  return `cutout-${castId}`;
}

const COLS = 8;

function grid(page: FacePageId, cell: { w: number; h: number }, items: { name: string; draw: (c: SkCanvas, box: { x: number; y: number; width: number; height: number }) => void }[]): FaceSprite[] {
  return items.map((it, i) => {
    const x = (i % COLS) * cell.w;
    const y = Math.floor(i / COLS) * cell.h;
    return { name: it.name, page, x, y, w: cell.w, h: cell.h, draw: (c: SkCanvas) => it.draw(c, { x: PAD, y: PAD, width: cell.w - PAD * 2, height: cell.h - PAD * 2 }) };
  });
}

let cached: FaceSprite[] | null = null;

/** Every sprite of the cast's pages, in order (pure data plus draw functions; nothing is baked). */
export function faceSprites(): FaceSprite[] {
  if (cached) return cached;
  const busts = CAST_IDS.map((id) => ({ name: faceSpriteName(id), draw: (c: SkCanvas, b: { x: number; y: number; width: number; height: number }) => void drawBust(c, id, b) }));
  const first = busts.slice(0, COLS * 6);
  const rest = busts.slice(COLS * 6);
  const portraits = PLAYER_IDS.flatMap((id) =>
    Array.from({ length: AGE_STEPS }, (_, age) => ({ name: portraitSpriteName(id, age), draw: (c: SkCanvas, b: { x: number; y: number; width: number; height: number }) => void drawBust(c, id, b, { age, mono: PORTRAIT_INK }) })),
  );
  const cutouts = CUTOUT_IDS.map((id) => ({ name: cutoutSpriteName(id), draw: (c: SkCanvas, b: { x: number; y: number; width: number; height: number }) => void drawCutout(c, id, b) }));
  const out = [...grid('faces', BUST_CELL, first), ...grid('faces2', BUST_CELL, [...rest, ...portraits]), ...grid('cutouts', CUTOUT_CELL, cutouts)];
  // The band: two cells wide, half a cell tall, after the last cut-out (row-aligned).
  const n = cutouts.length;
  const bx = (n % COLS) * CUTOUT_CELL.w;
  const by = Math.floor(n / COLS) * CUTOUT_CELL.h;
  const bandW = 240;
  const bandH = 180;
  const fits = bx + bandW <= COLS * CUTOUT_CELL.w;
  out.push({
    name: 'band',
    page: 'cutouts',
    x: fits ? bx : 0,
    y: fits ? by : by + CUTOUT_CELL.h,
    w: bandW,
    h: bandH,
    draw: (c) => drawBand(c, { x: PAD, y: PAD, width: bandW - PAD * 2, height: bandH - PAD * 2 }),
  });
  cached = out;
  return out;
}

/** A page's size in pixels at density 1. */
export function facePageSize(page: FacePageId): { width: number; height: number } {
  let width = 0;
  let height = 0;
  for (const s of faceSprites()) {
    if (s.page !== page) continue;
    width = Math.max(width, s.x + s.w);
    height = Math.max(height, s.y + s.h);
  }
  return { width, height };
}

export interface FacePage {
  page: FacePageId;
  image: SkImage;
  density: number;
  width: number;
  height: number;
  sprites: Record<string, { rect: { x: number; y: number; width: number; height: number }; ax: number; ay: number }>;
}

/**
 * Bakes one page (contact sheets and tests; the app's atlas.ts bakes through its own cache and must
 * never free a page a canvas may draw). `density` scales the page (1 = the sizes above).
 */
export function bakeFacePage(page: FacePageId, density = 1): FacePage | null {
  const { width, height } = facePageSize(page);
  const W = Math.round(width * density);
  const H = Math.round(height * density);
  const surface = Skia.Surface.Make(W, H) ?? Skia.Surface.MakeOffscreen(W, H);
  if (!surface) return null;
  const c = surface.getCanvas();
  c.clear(Skia.Color('#00000000'));
  const sprites: FacePage['sprites'] = {};
  for (const s of faceSprites()) {
    if (s.page !== page) continue;
    c.save();
    c.scale(density, density);
    c.translate(s.x, s.y);
    c.clipRect({ x: 0, y: 0, width: s.w, height: s.h }, ClipOp.Intersect, true);
    s.draw(c);
    c.restore();
    const r = { x: s.x * density, y: s.y * density, width: s.w * density, height: s.h * density };
    sprites[s.name] = { rect: r, ax: r.width / 2, ay: r.height / 2 };
  }
  surface.flush();
  const image = surface.makeImageSnapshot();
  surface.dispose();
  return { page, image, density, width: W, height: H, sprites };
}
