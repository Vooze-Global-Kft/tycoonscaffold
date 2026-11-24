/**
 * The atlases (office-design.md 4.5): every picture the desk canvas draws many times, baked ONCE
 * from code into an image under 2,048 px a side, with a table of named rectangles and anchors, for
 * one Skia `Atlas` draw per atlas per frame. Never free an atlas image while a canvas may draw it.
 *
 *   props    shelf-packed at 3 px a point into 1,024 px wide (the spec's 1,024 x 1,024): the seven
 *            club badges (24 pt) and their boycott variants, the effect icons, the 23 ministry and
 *            Grand Project pictures, the 24 monuments, the storeys 0..8, the paperclip, the pen, the
 *            envelope (shut and open), the rosette, the small flag, the coin, the drawing pin.
 *   faces    the cast package's first page (faces/layout.ts): 48 busts at 128 x 160 px, 1,024 x 960
 *   faces2   its second page: the remaining busts and the six player portraits at 3 ageing steps
 *   cutouts  its third page: election night's paper cut-outs and the band
 *
 * Every sprite's rect includes its transparent border (2 px); nothing is drawn past it, so linear
 * sampling at any scale never picks up a neighbour. A sprite's anchor (ax, ay) is its design origin
 * (the centre of an icon; a storey stack's bottom centre; the pen's nib tip).
 *
 * Usage (the desk canvas):
 *   const props = decreeAtlas('props', PixelRatio.get());      // cached for the app's life
 *   const s = props.sprites[clubSprite('veg')];
 *   // <Atlas image={props.image} sprites={[s.rect]} transforms={[Skia.RSXform(...spriteXform(s, props.density, x, y, 0, size / 24))]} />
 * Faces: decreeAtlas('faces') / ('faces2'); find a cast id's page with faceAtlasOf(castId).
 *
 * Pure Skia (no React): runs in the app and in Node (scripts/art/decree-sheets.ts).
 */
import { ClipOp, Skia, type SkCanvas, type SkImage, type SkRect } from '@shopify/react-native-skia';
import { CLUB_IDS } from './palette';
import { drawClubBadge, drawSmallFlag } from './clubs.draw';
import { EFFECT_IDS, drawCoin, drawEffect, drawRosette } from './effects.draw';
import { MINISTRY_IDS, PROJECT_IDS, drawMinistry, drawStoreys } from './ministries.draw';
import { MONUMENT_IDS, drawMonument } from './wall.draw';
import { drawEnvelope } from './meta.draw';
import { drawPaperclip, drawPen } from './desk.draw';
import { faceSpriteName, faceSprites, facePageSize, portraitSpriteName, cutoutSpriteName, type FacePageId } from './faces';
import { DESK } from './palette';
import { circle, fill } from './pen';

export type AtlasKind = 'props' | FacePageId;
export const ATLAS_KINDS: readonly AtlasKind[] = ['props', 'faces', 'faces2', 'cutouts'];

/** Pixels per point (props) or the page's scale (faces) each atlas is specified at; a lower device density bakes smaller. */
export const SPEC_DENSITY: Record<AtlasKind, number> = { props: 3, faces: 1, faces2: 1, cutouts: 1 };
export const MAX_SIDE = 2048;
/** The props atlas's width (4.5: 1,024 x 1,024). */
export const PROPS_SIDE = 1024;

export interface Sprite {
  /** Source rectangle in the atlas image, pixels. */
  rect: SkRect;
  /** The anchor (the design origin) inside the rect, pixels from its top left. */
  ax: number;
  ay: number;
}

export interface DecreeAtlas {
  kind: AtlasKind;
  image: SkImage;
  density: number;
  sprites: Record<string, Sprite>;
  width: number;
  height: number;
}

interface Def {
  name: string;
  /** Extents in points round the origin: left, top, right, bottom (positive numbers). */
  l: number;
  t: number;
  r: number;
  b: number;
  draw: (c: SkCanvas) => void;
}

// ---------------------------------------------------------------------------
// Sprite ids (worklets: the desk canvas computes them on the UI thread)
// ---------------------------------------------------------------------------

export function clubSprite(club: string, boycott = false): string {
  'worklet';
  return boycott ? `club-${club}-boycott` : `club-${club}`;
}
export function effectSprite(id: string): string {
  'worklet';
  return `fx-${id}`;
}
export function ministrySprite(id: string): string {
  'worklet';
  return `ministry-${id}`;
}
export function monumentSprite(id: string): string {
  'worklet';
  return `monument-${id}`;
}
export function storeySprite(n: number): string {
  'worklet';
  return `storeys-${Math.max(0, Math.min(8, Math.floor(n)))}`;
}
export { faceSpriteName, portraitSpriteName, cutoutSpriteName };

/** The other props' ids. */
export const PROP_SPRITES = ['paperclip', 'pen', 'envelope', 'envelope-open', 'rosette', 'flag', 'coin', 'pin'] as const;

const sq = (name: string, h: number, draw: (c: SkCanvas) => void): Def => ({ name, l: h, t: h, r: h, b: h, draw });

export function atlasDefs(kind: 'props'): Def[] {
  void kind;
  const d: Def[] = [];
  for (const id of CLUB_IDS) d.push(sq(clubSprite(id), 12.6, (q) => drawClubBadge(q, id, 12)));
  for (const id of CLUB_IDS) d.push(sq(clubSprite(id, true), 15.4, (q) => drawClubBadge(q, id, 12, { boycott: true })));
  for (const id of EFFECT_IDS) d.push(sq(effectSprite(id), 12.6, (q) => drawEffect(q, id)));
  for (const id of [...MINISTRY_IDS, ...PROJECT_IDS]) d.push(sq(ministrySprite(id), 12.6, (q) => drawMinistry(q, id)));
  for (const id of MONUMENT_IDS) d.push(sq(monumentSprite(id), 12.6, (q) => drawMonument(q, id)));
  for (let n = 0; n <= 8; n++) d.push({ name: storeySprite(n), l: 9, t: 38, r: 9, b: 1, draw: (q) => drawStoreys(q, n) });
  d.push({ name: 'paperclip', l: 5, t: 12, r: 5, b: 12, draw: (q) => drawPaperclip(q, 22) });
  d.push({ name: 'pen', l: 8, t: 1, r: 12, b: 66, draw: (q) => drawPen(q, 64) });
  d.push({ name: 'envelope', l: 21, t: 15, r: 21, b: 14, draw: (q) => drawEnvelope(q, 0) });
  d.push({ name: 'envelope-open', l: 21, t: 23, r: 21, b: 14, draw: (q) => drawEnvelope(q, 1) });
  d.push({ name: 'rosette', l: 10, t: 12, r: 10, b: 16, draw: (q) => drawRosette(q, 0, 0, 10) });
  d.push({ name: 'flag', l: 4, t: 7, r: 6, b: 6, draw: (q) => drawSmallFlag(q, 1) });
  d.push(sq('coin', 8.5, (q) => drawCoin(q, 8)));
  d.push(sq('pin', 3, (q) => q.drawPath(circle(0, 0, 2.4), fill(DESK.violet))));
  return d;
}

/** The props atlas's ids, in order (tests and the README). */
export function spriteIds(kind: AtlasKind = 'props'): string[] {
  if (kind === 'props') return atlasDefs('props').map((d) => d.name);
  return faceSprites()
    .filter((s) => s.page === kind)
    .map((s) => s.name);
}

const PAD = 2;

interface Placed {
  d: Def;
  x: number;
  y: number;
  w: number;
  h: number;
}

function layoutProps(density: number): { placed: Placed[]; width: number; height: number } {
  const items = atlasDefs('props')
    .map((d) => ({ d, w: Math.ceil((d.l + d.r) * density) + PAD * 2, h: Math.ceil((d.t + d.b) * density) + PAD * 2 }))
    .sort((a, b) => b.h - a.h || b.w - a.w);
  let x = 0;
  let y = 0;
  let shelf = 0;
  let width = 0;
  const placed: Placed[] = [];
  for (const it of items) {
    if (x + it.w > PROPS_SIDE) {
      x = 0;
      y += shelf;
      shelf = 0;
    }
    placed.push({ d: it.d, x, y, w: it.w, h: it.h });
    x += it.w;
    width = Math.max(width, x);
    shelf = Math.max(shelf, it.h);
  }
  return { placed, width, height: y + shelf };
}

/**
 * The atlas's size at a density, without baking (tests). Props: the asked density (default 3) capped
 * at 3, lowered in steps of 0.25 until it fits PROPS_SIDE x PROPS_SIDE. Faces: the page's size x density.
 */
export function atlasSize(kind: AtlasKind, density: number = SPEC_DENSITY[kind]): { density: number; width: number; height: number } {
  if (kind !== 'props') {
    const d = Math.max(0.5, Math.min(SPEC_DENSITY[kind] * 1.5, density));
    const p = facePageSize(kind);
    let dd = d;
    while ((p.width * dd > MAX_SIDE || p.height * dd > MAX_SIDE) && dd > 0.5) dd -= 0.25;
    return { density: dd, width: Math.round(p.width * dd), height: Math.round(p.height * dd) };
  }
  let d = Math.max(1, Math.min(SPEC_DENSITY.props, density));
  let l = layoutProps(d);
  while ((l.width > PROPS_SIDE || l.height > PROPS_SIDE) && d > 1) {
    d = Math.max(1, d - 0.25);
    l = layoutProps(d);
  }
  return { density: d, width: l.width, height: l.height };
}

/** Bakes one atlas anew (sheets, tests). Consumers call `decreeAtlas`, which caches. Null if no surface. */
export function bakeAtlas(kind: AtlasKind, density: number = SPEC_DENSITY[kind]): DecreeAtlas | null {
  const size = atlasSize(kind, density);
  const dd = size.density;
  const surface = Skia.Surface.Make(size.width, size.height) ?? Skia.Surface.MakeOffscreen(size.width, size.height);
  if (!surface) return null;
  const c = surface.getCanvas();
  c.clear(Skia.Color('#00000000'));
  const sprites: Record<string, Sprite> = {};
  if (kind === 'props') {
    const { placed } = layoutProps(dd);
    for (const p of placed) {
      const ax = PAD + p.d.l * dd;
      const ay = PAD + p.d.t * dd;
      c.save();
      c.clipRect({ x: p.x + PAD, y: p.y + PAD, width: p.w - PAD * 2, height: p.h - PAD * 2 }, ClipOp.Intersect, true);
      c.translate(p.x + ax, p.y + ay);
      c.scale(dd, dd);
      p.d.draw(c);
      c.restore();
      sprites[p.d.name] = { rect: { x: p.x, y: p.y, width: p.w, height: p.h }, ax, ay };
    }
  } else {
    for (const s of faceSprites()) {
      if (s.page !== kind) continue;
      c.save();
      c.scale(dd, dd);
      c.translate(s.x, s.y);
      c.clipRect({ x: 0, y: 0, width: s.w, height: s.h }, ClipOp.Intersect, true);
      s.draw(c);
      c.restore();
      const r = { x: s.x * dd, y: s.y * dd, width: s.w * dd, height: s.h * dd };
      sprites[s.name] = { rect: r, ax: r.width / 2, ay: r.height / 2 };
    }
  }
  surface.flush();
  const image = surface.makeImageSnapshot();
  surface.dispose();
  return { kind, image, density: dd, sprites, width: size.width, height: size.height };
}

const baked = new Map<string, DecreeAtlas>();

/**
 * THE way a consumer gets an atlas: baked once per (kind, density) for the life of the app and never
 * freed (a canvas may draw it at any moment). Call it outside render (useMemo or module scope); null
 * only if no surface could be made (nothing is cached then).
 */
export function decreeAtlas(kind: AtlasKind, density: number = SPEC_DENSITY[kind]): DecreeAtlas | null {
  const d = atlasSize(kind, density).density;
  const key = `${kind}@${d}`;
  const hit = baked.get(key);
  if (hit) return hit;
  const a = bakeAtlas(kind, d);
  if (a) baked.set(key, a);
  return a;
}

/** Which faces page holds a sprite name (`face-<id>`, `portrait-<id>-<age>`, `cutout-<id>`, `band`), or null. */
export function faceAtlasOf(spriteName: string): FacePageId | null {
  for (const s of faceSprites()) if (s.name === spriteName) return s.page;
  return null;
}

/**
 * RSXform numbers for a sprite drawn with its anchor at (x, y), turned `angle` radians, at `size`
 * times its point size: [scos, ssin, tx, ty] for Skia.RSXform(...). Plain maths, a worklet.
 */
export function spriteXform(s: Sprite, density: number, x: number, y: number, angle: number, size = 1): [number, number, number, number] {
  'worklet';
  const k = size / density;
  const sc = k * Math.cos(angle);
  const ss = k * Math.sin(angle);
  return [sc, ss, x - (sc * s.ax - ss * s.ay), y - (ss * s.ax + sc * s.ay)];
}
