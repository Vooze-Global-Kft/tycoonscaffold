/**
 * The loading picture's parts, each recorded once as a Skia picture with the art kit (palette, pen,
 * letters, people), on the JavaScript thread: the still scene, every plate with its word cut through,
 * the trolley, the magnet, the display's digits cell by cell, the ticket, the crucible, the handwheel,
 * the furnace hand, the hood, the cooled ingots' marks. ./compose.ts puts them together for a pose on
 * the UI thread, moving and fading them; nothing here runs per frame.
 *
 * The composition is the art director's key frames (look/loading-1..6), with the judge's points
 * (look-judge.md 6) and S22: the hood over the crucible, the letters cut through so the sky shows, the
 * pour lighting the plates from below, the furnace hand at the handwheel, the ticket printing at the end.
 */
import { BlendMode, Skia, type SkCanvas, type SkImage, type SkPath, type SkPicture } from '@shopify/react-native-skia';
import { YARD, mix, shade } from '../art/palette';
import { dotMatrix, sevenSeg, stencil } from '../art/letters';
import { builder, circle, fill, hash01, hazard, linear, oval, poly, radial, rect, rgba, rrect, segment, stroke, VIEW } from '../art/pen';
import { drawSkyline } from '../art/ground.draw';
import { crewLook, drawPerson } from '../art/people.draw';
import { TRACK, type LoadingLayout } from './layout';
import { groupKg, type LoadingTimeline } from './timeline';

const INK = YARD.ink;

/** Colours the UI thread paints with (Skia colours, made here once). */
export interface LoadingColours {
  ink: Float32Array;
  rope: Float32Array;
  glow: Float32Array;
  glowHot: Float32Array;
  glowWhite: Float32Array;
  spark: Float32Array;
  launder: Float32Array;
  field: Float32Array;
  galv: Float32Array;
  led: Float32Array;
  ledOff: Float32Array;
  galvDark: Float32Array;
  /** The ingot's colour every 0.1 game-second of cooling, 0 to 4 s (yard palette `coolingColour`). */
  cooling: Float32Array[];
}

/**
 * A part drawn every frame: its picture, and (in the app) the same baked once into an image at the
 * screen's density, which costs the frame far less than replaying the vectors (./compose.ts `part`).
 */
export interface Part {
  /** What the part looks like, as a key: a part with the same key draws the same (a rotation reuses it). */
  key: string;
  /** The most pixels a point its image needs (a soft light or the still background: fewer). */
  dmax: number;
  pic: SkPicture;
  img: SkImage | null;
  /** The image's size in pixels. */
  iw: number;
  ih: number;
  /** Where it stands, points (the picture's own coordinates). */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LoadingLayers {
  /** The still scene: sky, far yard, ground, deck, display box, gantry, mould, stand. */
  bg: Part;
  /** The pour's warm light on the ground (faded by the pour and the furnace's breath). */
  pool: Part;
  /** Plate i at (centre x 0, foot 0), with its word cut through; its underlight from the pour. */
  plates: Part[];
  plateGlow: Part[];
  trolley: Part;
  /** The electromagnet, its rope's end at (0, 0) and its face 17 k below. */
  magnet: Part;
  /** The magnet's field arcs while it holds (local as the magnet). */
  field: SkPicture;
  /** digits[cell][d]: digit d (10: blank) in that cell of the display. */
  digits: SkPicture[][];
  /** The ticket fully out of the slot (it is clipped and slid while it feeds). */
  ticket: Part;
  /** The crucible in its tongs about its trunnion (0, 0); its mouth's melt separately (it breathes). */
  crucible: Part;
  mouth: Part;
  /** The handwheel about its centre (0, 0) and its shaft (absolute). */
  wheel: SkPicture;
  shaft: SkPicture;
  /** The furnace hand at the handwheel, absolute. */
  hand: Part;
  /** The hood over the crucible with its duct, and the warm light under it. */
  hood: Part;
  hoodGlow: Part;
  /** A cavity's ingot outline (absolute) and its cooled marks (notches and stamp). */
  ingot: SkPath[];
  notches: Part[];
  colours: LoadingColours;
}

function record(draw: (c: SkCanvas) => void, w = 4096, h = 4096): SkPicture {
  const r = Skia.PictureRecorder();
  const c = r.beginRecording(Skia.XYWHRect(-w / 2, -h / 2, w * 1.5, h * 1.5));
  draw(c);
  return r.finishRecordingAsPicture();
}

/** A part baked into an image. */
export interface Baked {
  img: SkImage;
  iw: number;
  ih: number;
}

/**
 * Bakes a part's picture into an image on a CPU raster surface (the world's atlas does the same:
 * src/ui/salvage/world/atlas.ts bakeImage), so any thread's canvas may draw it. `density` is capped by
 * the part's own `dmax`.
 */
export function bakePart(p: Part, density: number): Baked | null {
  const d = Math.min(density, p.dmax);
  if (!(d > 0)) return null;
  const iw = Math.max(1, Math.ceil(p.w * d));
  const ih = Math.max(1, Math.ceil(p.h * d));
  const raster = Skia.Surface.Make(iw, ih);
  const surface = raster ?? Skia.Surface.MakeOffscreen(iw, ih);
  if (!surface) return null;
  try {
    const c = surface.getCanvas();
    c.scale(d, d);
    c.translate(-p.x, -p.y);
    c.drawPicture(p.pic);
    surface.flush();
    const snap = surface.makeImageSnapshot();
    if (raster) return { img: snap, iw, ih };
    const img = snap.makeNonTextureImage() ?? null;
    snap.dispose();
    return img ? { img, iw, ih } : null;
  } finally {
    surface.dispose();
  }
}

/**
 * Records a part as a picture (cheap: the first frame draws from pictures, review H5). With a density
 * (Node checks only) it is also baked at once; the app bakes later, in slices (./bake.ts).
 */
function part(key: string, draw: (c: SkCanvas) => void, x: number, y: number, w: number, h: number, density: number, dmax = 3): Part {
  const p: Part = { key, dmax, pic: record(draw), img: null, iw: 0, ih: 0, x, y, w, h };
  if (density > 0) {
    const b = bakePart(p, density);
    if (b) return { ...p, ...b };
  }
  return p;
}

/** Every part of a set that can be baked into an image, those drawn every frame first. */
export function partsOf(Y: LoadingLayers): Part[] {
  return [...Y.plates, Y.magnet, Y.trolley, Y.crucible, Y.mouth, Y.hand, Y.hood, Y.hoodGlow, Y.ticket, ...Y.plateGlow, ...Y.notches, Y.pool, Y.bg];
}

/** The same set with each part's image where `get` has one (parts without stay pictures). */
export function withImages(Y: LoadingLayers, get: (p: Part) => Baked | undefined): LoadingLayers {
  const f = (p: Part): Part => {
    const b = get(p);
    return b ? { ...p, ...b } : p;
  };
  return {
    ...Y,
    bg: f(Y.bg),
    pool: f(Y.pool),
    plates: Y.plates.map(f),
    plateGlow: Y.plateGlow.map(f),
    trolley: f(Y.trolley),
    magnet: f(Y.magnet),
    ticket: f(Y.ticket),
    crucible: f(Y.crucible),
    mouth: f(Y.mouth),
    hand: f(Y.hand),
    hood: f(Y.hood),
    hoodGlow: f(Y.hoodGlow),
    notches: Y.notches.map(f),
  };
}

const col = (hex: string): Float32Array => Skia.Color(hex) as unknown as Float32Array;

/**
 * A plate of red-oxide painted steel with its word cut clean through (the far yard shows in the
 * letters), a dark kerf beside each cut, worn paint at two corners, rust freckles, a lifting lug.
 */
function plate(c: SkCanvas, word: string, w: number, size: number, seed: number): void {
  const h = size * 1.75;
  const x = -w / 2;
  const y = -h;
  c.drawPath(rrect(x + 4, y + 5, w, h, 4), fill(INK, 0.22));
  // the lifting lug above
  c.drawPath(rrect(-7 * (size / 42), y - 9 * (size / 42), 14 * (size / 42), 11 * (size / 42), 4), fill(YARD.steelDark));
  c.drawPath(rrect(-7 * (size / 42), y - 9 * (size / 42), 14 * (size / 42), 11 * (size / 42), 4), stroke(INK, 1.6));
  c.drawPath(circle(0, y - 4 * (size / 42), 2.4 * (size / 42)), fill(INK));
  c.saveLayer();
  c.drawPath(rrect(x, y, w, h, 4), fill(YARD.skip));
  c.drawPath(rrect(x + 3, y + 3, w - 6, h * 0.16, 2), fill(shade(YARD.skip, 0.14)));
  // worn paint: bare steel at two corners
  c.drawPath(poly([x, y + h * 0.6, x + Math.min(w * 0.08, size * 0.4), y + h, x, y + h]), fill(YARD.steel));
  c.drawPath(poly([x + w, y, x + w - Math.min(w * 0.06, size * 0.3), y, x + w, y + h * 0.22]), fill(YARD.steel));
  for (let i = 0; i < 5; i++) c.drawCircle(x + w * hash01(i, seed + word.length), y + h * (0.75 + 0.2 * hash01(i, 3 + seed)), 1.2 + hash01(i, 5 + seed) * 1.6, fill(YARD.rust, 0.8));
  const ty = y + (h - size) / 2;
  stencil(c, word, 1.6, ty + 1.6, size, INK, { align: 'center', track: TRACK });
  stencil(c, word, 0, ty, size, INK, { align: 'center', track: TRACK, cut: true });
  c.restore();
  c.drawPath(rrect(x, y, w, h, 4), stroke(INK, 2.2));
}

/** The pour's light on a plate: warm from its foot, only on the steel (not in the cut letters). */
function plateGlow(c: SkCanvas, word: string, w: number, size: number): void {
  const h = size * 1.75;
  const x = -w / 2;
  const y = -h;
  c.saveLayer();
  c.drawPath(rrect(x, y, w, h, 4), fill(YARD.skip));
  stencil(c, word, 0, y + (h - size) / 2, size, INK, { align: 'center', track: TRACK, cut: true });
  const g = linear(0, 0, 0, y + h * 0.25, [rgba(YARD.glowHot, 0.9), rgba(YARD.glow, 0)]);
  g.setBlendMode(BlendMode.SrcIn);
  c.drawRect({ x, y, width: w, height: h }, g);
  c.restore();
  c.drawPath(segment(x + 4, -1.5, x + w - 4, -1.5), stroke(YARD.glowHot, 2));
}

/** The gantry crane: two A-frame legs on rails, a lattice girder across, the cab under it at the east. */
function gantry(c: SkCanvas, L: LoadingLayout): void {
  const { w, k, beamY, ground } = L;
  const Y = YARD.hivis;
  const D = YARD.hivisDark;
  c.drawRect({ x: 0, y: ground + 4 * k, width: w, height: 3 * k }, fill(YARD.steelDark));
  const spread = L.spread;
  for (const lx of [L.legL, L.legR]) {
    const leg = (x0: number) => poly([x0 - 6 * k, ground, x0 + 6 * k, ground, lx + 5 * k, beamY, lx - 5 * k, beamY]);
    for (const x0 of [lx - spread, lx + spread]) {
      c.drawPath(leg(x0), fill(x0 < lx ? Y : D));
      c.drawPath(leg(x0), stroke(INK, 1.8));
    }
    for (const f of [0.35, 0.65]) {
      const yy = beamY + (ground - beamY) * f;
      const half = 5 * k + (spread - 5 * k) * f;
      c.drawPath(segment(lx - half, yy, lx + half, yy), stroke(INK, 4.6 * k));
      c.drawPath(segment(lx - half, yy, lx + half, yy), stroke(D, 3 * k));
    }
    c.drawPath(rrect(lx - spread - 14 * k, ground - 4 * k, spread * 2 + 28 * k, 10 * k, 3), fill(YARD.steelDark));
    c.drawPath(rrect(lx - spread - 14 * k, ground - 4 * k, spread * 2 + 28 * k, 10 * k, 3), stroke(INK, 1.6));
    hazard(c, rect(lx - spread - 10 * k, ground - 3 * k, spread * 2 + 20 * k, 5 * k), 4, 0);
  }
  const top = beamY - 30 * k;
  c.drawPath(rect(0, top, w, 8 * k), fill(Y));
  c.drawPath(rect(0, beamY - 8 * k, w, 8 * k), fill(D));
  for (let x = -10 * k; x < w + 20 * k; x += 26 * k) {
    const p = segment(x, top + 8 * k, x + 13 * k, beamY - 8 * k);
    const q = segment(x + 13 * k, beamY - 8 * k, x + 26 * k, top + 8 * k);
    c.drawPath(p, stroke(INK, 4.2 * k));
    c.drawPath(q, stroke(INK, 4.2 * k));
    c.drawPath(p, stroke(D, 2.6 * k));
    c.drawPath(q, stroke(D, 2.6 * k));
  }
  c.drawPath(rect(0, top, w, 8 * k), stroke(INK, 1.8));
  c.drawPath(rect(0, beamY - 8 * k, w, 8 * k), stroke(INK, 1.8));
  // the cab under the girder by the east leg
  const cx = Math.min(w * 0.9, L.sr - 30 * k);
  c.drawPath(rrect(cx - 22 * k, beamY, 44 * k, 30 * k, 4), fill(YARD.cab));
  c.drawPath(rrect(cx - 18 * k, beamY + 5 * k, 36 * k, 13 * k, 2), fill(YARD.glassDark));
  c.drawPath(rect(cx - 14 * k, beamY + 6 * k, 5 * k, 11 * k), fill(YARD.glass));
  c.drawPath(rect(cx - 22 * k, beamY + 22 * k, 44 * k, 4 * k), fill(Y));
  c.drawPath(rrect(cx - 22 * k, beamY, 44 * k, 30 * k, 4), stroke(INK, 1.8));
}

function background(c: SkCanvas, L: LoadingLayout): void {
  const { w, h, k, horizon, ground } = L;
  // the late-day sky and the far yard (containers, a dock crane, a chimney, trees) in haze, standing on
  // the yard's back wall; the far yard's own cranes rise behind the wall
  drawSkyline(c, 0, w, 0, L.wallTop, 5);
  farCranes(c, L);
  backWall(c, L);
  // the yard floor: warm concrete with joints; the low sun's wash from the west
  c.drawRect({ x: 0, y: horizon, width: w, height: h - horizon }, fill(YARD.concrete));
  c.drawRect({ x: 0, y: horizon, width: w, height: h - horizon }, linear(0, 0, w, 0, [rgba(YARD.sun, 0.28), rgba(YARD.sun, 0)]));
  c.drawRect({ x: 0, y: horizon, width: w, height: 3 }, fill(YARD.concreteDark));
  for (let x = -40 * k; x < w + 80 * k; x += 110 * k) c.drawPath(segment(x, horizon, x - 60 * k, h), stroke(YARD.joint, 1.2));
  c.drawPath(segment(0, h * 0.84, w, h * 0.84), stroke(YARD.joint, 1.2));

  // the weighbridge deck, its lip toward the eye
  const { deckL, deckR, deckTop } = L;
  c.drawPath(rect(deckL - 6, deckTop - 3 * k, deckR - deckL + 12, 18 * k), fill(YARD.concreteLight));
  c.drawPath(rect(deckL, deckTop - 2 * k, deckR - deckL, 9 * k), fill(YARD.galvanised));
  c.drawPath(rect(deckL, deckTop + 7 * k, deckR - deckL, 4 * k), fill(YARD.steelDark));
  for (const [a, b] of [
    [deckL, deckL + 22 * k],
    [deckR - 22 * k, deckR],
  ])
    hazard(c, rect(a, deckTop - 2 * k, b - a, 9 * k), 5, 0);
  c.drawPath(rect(deckL, deckTop - 2 * k, deckR - deckL, 13 * k), stroke(INK, 1.6));

  // the display on its post, its LED case and the printer's slot
  const { dX, dY, dW, dH, slotY } = L;
  c.drawPath(rect(dX - 3 * k, dY + dH, 6 * k, ground - dY - dH + 6 * k), fill(YARD.galvanised));
  c.drawPath(rect(dX - 3 * k, dY + dH, 6 * k, ground - dY - dH + 6 * k), stroke(INK, 1.4));
  c.drawPath(rrect(dX - dW / 2 + 3, dY + 4, dW, dH, 7), fill(INK, 0.25));
  c.drawPath(rrect(dX - dW / 2, dY, dW, dH, 7), fill(YARD.hivis));
  c.drawPath(rrect(dX - dW / 2, dY, dW, dH, 7), stroke(INK, 2));
  c.drawPath(rrect(dX - dW / 2 + 6 * k, dY + 6 * k, dW - 12 * k, 36 * k, 4), fill(YARD.ledCase));
  c.drawPath(rrect(dX - 30 * k, slotY - 3 * k, 60 * k, 6 * k, 3 * k), fill(INK));

  gantry(c, L);

  casting(c, L);

  // the crucible's stand: a post on a foot, the trunnion at its top
  const { sX, sY, footY, mR } = L;
  c.drawPath(oval(sX, footY, 26 * k, 4 * k), fill(INK, 0.18));
  c.drawPath(rect(sX - 4 * k, sY, 8 * k, footY - 6 * k - sY), fill(YARD.machineDark));
  c.drawPath(rect(sX - 4 * k, sY, 8 * k, footY - 6 * k - sY), stroke(INK, 1.4));
  c.drawPath(rrect(sX - 20 * k, footY - 8 * k, 40 * k, 8 * k, 2), fill(YARD.machineDark));
  c.drawPath(rrect(sX - 20 * k, footY - 8 * k, 40 * k, 8 * k, 2), stroke(INK, 1.2));
  // the extinguisher by the casting table (yard-stage1 6.1)
  const ex = mR + 24 * k;
  const ey = footY;
  c.drawPath(rrect(ex - 4 * k, ey - 18 * k, 8 * k, 18 * k, 3 * k), fill('#C8352B'));
  c.drawPath(rrect(ex - 4 * k, ey - 18 * k, 8 * k, 18 * k, 3 * k), stroke(INK, 1.2));
  c.drawPath(rect(ex - 2 * k, ey - 21 * k, 4 * k, 3 * k), fill(INK));
}

/** The yard's back wall along the horizon: precast concrete panels between posts, in the haze. */
function backWall(c: SkCanvas, L: LoadingLayout): void {
  const { w, k, wallTop: top, horizon } = L;
  const wall = mix(YARD.concreteDark, YARD.far, 0.35);
  c.drawRect({ x: 0, y: top, width: w, height: horizon - top + 1 }, fill(wall));
  // the panels' seams and a darker foot where the floor meets the wall
  for (let x = 18 * k; x < w; x += 52 * k) {
    c.drawPath(rect(x - 2.5 * k, top - 2 * k, 5 * k, horizon - top + 2 * k), fill(shade(wall, -0.12)));
    c.drawPath(segment(x + 26 * k, top + 3 * k, x + 26 * k, horizon), stroke(shade(wall, -0.08), 1));
  }
  c.drawPath(rect(0, top, w, 2.5 * k), fill(mix(wall, '#FFFFFF', 0.25)));
  c.drawPath(rect(0, horizon - 4 * k, w, 4 * k), fill(shade(wall, -0.1)));
}

/** The far yard's own cranes behind the wall, in the haze: a material handler with its grab, a tower crane. */
function farCranes(c: SkCanvas, L: LoadingLayout): void {
  const { w, k, wallTop: base } = L;
  const sil = YARD.farDark;
  // the material handler: its cab on a mast behind the wall, the boom up and out, the stick down, a grab
  const hx = w * 0.36;
  const cab = base - 34 * k;
  c.drawPath(rect(hx - 5 * k, cab + 10 * k, 10 * k, base - cab - 10 * k), fill(sil));
  c.drawPath(rrect(hx - 9 * k, cab, 18 * k, 12 * k, 2), fill(sil));
  const bx = hx + 70 * k;
  const by = base - 92 * k;
  c.drawPath(segment(hx + 4 * k, cab + 6 * k, bx, by), stroke(sil, 5 * k));
  c.drawPath(segment(bx, by, bx + 10 * k, by + 40 * k), stroke(sil, 3.6 * k));
  const gy = by + 46 * k;
  c.drawPath(poly([bx + 10 * k, gy - 6 * k, bx + 20 * k, gy + 6 * k, bx + 10 * k, gy + 3 * k, bx, gy + 6 * k]), fill(sil));
  // a tower crane further off, lighter in the haze
  const tx = w * 0.7;
  const tt = base - 110 * k;
  const far = YARD.far;
  c.drawPath(rect(tx - 3 * k, tt, 6 * k, base - tt), fill(far));
  for (let y = tt + 8 * k; y < base; y += 10 * k) c.drawPath(segment(tx - 3 * k, y, tx + 3 * k, y - 8 * k), stroke(mix(far, '#FFFFFF', 0.2), 0.8));
  c.drawPath(rect(tx - 40 * k, tt - 4 * k, 130 * k, 4 * k), fill(far));
  c.drawPath(rect(tx - 40 * k, tt, 14 * k, 6 * k), fill(far));
  c.drawPath(segment(tx, tt - 14 * k, tx - 38 * k, tt - 4 * k), stroke(far, 1));
  c.drawPath(segment(tx, tt - 14 * k, tx + 86 * k, tt - 4 * k), stroke(far, 1));
  c.drawPath(rect(tx - 1.5 * k, tt - 16 * k, 3 * k, 12 * k), fill(far));
  c.drawPath(segment(tx + 62 * k, tt, tx + 62 * k, tt + 30 * k), stroke(far, 0.9));
}

/**
 * The casting: a steel table on legs under the crucible's lip, five separate cast-iron ingot moulds on
 * it with a gap between each, and the launder along their backs from a refractory spout block, a short
 * lip into each mould (review L11: five moulds on a stand, never one long trough).
 */
function casting(c: SkCanvas, L: LoadingLayout): void {
  const { k, mL, mR, mY, mH, mouldX, mouldW, tableY, footY, cavX, cavW, cavY, cavH, lX0, lY } = L;
  const tl = mL - 10 * k;
  const tr = mR + 10 * k;
  const steel = YARD.machineDark;
  // shadow on the floor, the legs and their cross rail, the top
  c.drawPath(oval((tl + tr) / 2, footY, (tr - tl) / 2 + 8 * k, 5 * k), fill(INK, 0.18));
  const legX = [tl + 5 * k, (tl + tr) / 2, tr - 5 * k];
  for (const x of legX) {
    c.drawPath(rect(x - 2.5 * k, tableY + 4 * k, 5 * k, footY - tableY - 6 * k), fill(steel));
    c.drawPath(rect(x - 2.5 * k, tableY + 4 * k, 5 * k, footY - tableY - 6 * k), stroke(INK, 1.1));
    c.drawPath(rrect(x - 5 * k, footY - 3 * k, 10 * k, 3 * k, 1), fill(INK));
  }
  const railY = tableY + 4 * k + (footY - tableY) * 0.45;
  c.drawPath(rect(tl + 5 * k, railY, tr - tl - 10 * k, 2.6 * k), fill(steel));
  c.drawPath(rect(tl + 5 * k, railY, tr - tl - 10 * k, 2.6 * k), stroke(INK, 0.9));
  c.drawPath(rect(tl, tableY, tr - tl, 5 * k), fill(YARD.steelDark));
  c.drawPath(rect(tl, tableY, tr - tl, 1.5 * k), fill(YARD.galvanised));
  c.drawPath(rect(tl, tableY, tr - tl, 5 * k), stroke(INK, 1.4));
  // the moulds: each its own block, its cavity open at the top
  for (let i = 0; i < mouldX.length; i++) {
    const x0 = mouldX[i];
    const block = poly([x0, mY, x0 + mouldW, mY, x0 + mouldW - 2 * k, tableY, x0 + 2 * k, tableY]);
    c.drawPath(block, linear(x0, 0, x0 + mouldW, 0, [mix(YARD.castIron, '#FFFFFF', 0.12), YARD.castIron, shade(YARD.castIron, -0.25)]));
    c.drawPath(block, stroke(INK, 1.4));
    // two lugs to lift it by
    for (const s of [-1, 1]) c.drawPath(rect(x0 + mouldW / 2 + s * (mouldW / 2 + 1.5 * k) - 1.5 * k, mY + 4 * k, 3 * k, 5 * k), fill(shade(YARD.castIron, -0.3)));
    c.drawPath(rrect(cavX[i], cavY, cavW, cavH, 2), fill(shade(YARD.castIron, -0.55)));
    c.drawPath(rrect(cavX[i], cavY, cavW, cavH, 2), stroke(INK, 1));
    // the launder's short lip down into this mould
    c.drawPath(rect(cavX[i] + 3 * k, lY + 2 * k, 4 * k, cavY - lY - 1.5 * k), fill(YARD.refractory));
    c.drawPath(rect(cavX[i] + 3 * k, lY + 2 * k, 4 * k, cavY - lY - 1.5 * k), stroke(INK, 0.8));
  }
  // the launder: a thin refractory channel from the spout block along the moulds' backs (light, so it
  // reads as part of the casting, not as a bar)
  c.drawPath(rrect(lX0, lY - 2.5 * k, mR - lX0, 5 * k, 2.5 * k), fill(mix(YARD.refractory, '#FFFFFF', 0.15)));
  c.drawPath(segment(lX0 + 3 * k, lY - 0.5 * k, mR - 3 * k, lY - 0.5 * k), stroke(shade(YARD.refractory, -0.35), 1.2));
  c.drawPath(rrect(lX0, lY - 2.5 * k, mR - lX0, 5 * k, 2.5 * k), stroke(INK, 1.1));
  c.drawPath(rrect(lX0 - 8 * k, lY - 6 * k, 22 * k, 12 * k, 3 * k), fill(YARD.refractory));
  c.drawPath(rrect(lX0 - 8 * k, lY - 6 * k, 22 * k, 12 * k, 3 * k), stroke(INK, 1.4));
}

/**
 * The hood over the crucible: a galvanised canopy below the deck's lip (in front of the weighbridge,
 * never over a plate), its duct leaving west out of the frame above the furnace hand's head.
 */
function hood(c: SkCanvas, L: LoadingLayout): void {
  const { k, hoodX: cx, hoodTop: top, hoodBot: bot } = L;
  const hw = 44 * k;
  const tw = 18 * k;
  const can = poly([cx - hw, bot, cx + hw, bot, cx + tw, top, cx - tw, top]);
  // the duct: from the canopy's west slope, straight west out of the frame
  const d0 = top + 1.5 * k;
  const d1 = top + 12 * k;
  const duct = poly([cx - tw, d0, -20, d0, -20, d1, cx - tw - (hw - tw) * ((d1 - top) / (bot - top)), d1]);
  c.drawPath(duct, linear(0, d0, 0, d1, [YARD.galvanisedLight, YARD.galvanised]));
  c.drawPath(segment(-20, d0, cx - tw, d0), stroke(INK, 1.6));
  c.drawPath(segment(-20, d1, cx - hw * 0.8, d1), stroke(INK, 1.6));
  for (let x = cx - 44 * k; x > -20; x -= 46 * k) c.drawPath(segment(x, d0, x, d1), stroke(YARD.steel, 1.4));
  c.drawPath(can, linear(cx - hw, 0, cx + hw, 0, [YARD.galvanisedLight, YARD.galvanised, shade(YARD.galvanised, -0.2)]));
  c.drawPath(can, stroke(INK, 1.8));
  c.drawPath(rect(cx - hw, bot - 2.5 * k, hw * 2, 2.5 * k), fill(shade(YARD.galvanised, -0.3)));
  c.drawPath(segment(cx - hw, bot, cx + hw, bot), stroke(INK, 1.8));
  // a warning plate on the canopy
  c.drawPath(rrect(cx + 2 * k, top + 2 * k, 14 * k, 7.5 * k, 1.5), fill(YARD.hivis));
  c.drawPath(rrect(cx + 2 * k, top + 2 * k, 14 * k, 7.5 * k, 1.5), stroke(INK, 0.9));
  c.drawPath(poly([cx + 9 * k, top + 3 * k, cx + 12 * k, top + 8.3 * k, cx + 6 * k, top + 8.3 * k]), stroke(INK, 0.9));
}

function hoodGlow(c: SkCanvas, L: LoadingLayout): void {
  const { k, hoodX: cx, hoodBot: bot } = L;
  c.drawPath(oval(cx, bot + 2 * k, 44 * k, 7 * k), radial(cx, bot + 2 * k, 44 * k, [rgba(YARD.glowHot, 0.75), rgba(YARD.glow, 0)]));
}

/** The crucible in its tongs about its trunnion; a pouring lip at the east. */
function crucible(c: SkCanvas, L: LoadingLayout): void {
  const { k, R } = L;
  const body = builder()
    .moveTo(-R, -26 * k)
    .lineTo(-R * 0.8, 16 * k)
    .quadTo(0, 24 * k, R * 0.8, 16 * k)
    .lineTo(R, -26 * k)
    .close()
    .build();
  c.drawPath(body, linear(-R, 0, R, 0, [mix(YARD.refractory, '#FFFFFF', 0.2), YARD.refractory, shade(YARD.refractory, -0.3)]));
  c.drawPath(body, stroke(INK, 1.8));
  // two refractory bands, the tongs' ring and the trunnion arms
  c.drawPath(segment(-R * 0.9, 6 * k, R * 0.9, 6 * k), stroke(shade(YARD.refractory, -0.25), 1.2));
  c.drawPath(rect(-R - 3 * k, -8 * k, R * 2 + 6 * k, 6 * k), fill(YARD.steelDark));
  c.drawPath(rect(-R - 3 * k, -8 * k, R * 2 + 6 * k, 6 * k), stroke(INK, 1.4));
  c.drawPath(oval(0, -26 * k, R, 6 * k), fill(YARD.steelDark));
  // the lip
  c.drawPath(poly([R - 3, -30 * k, R + 7 * k, -28 * k, R + 7 * k, -24 * k, R - 3, -22 * k]), fill(YARD.refractory));
  c.drawPath(poly([R - 3, -30 * k, R + 7 * k, -28 * k, R + 7 * k, -24 * k, R - 3, -22 * k]), stroke(INK, 1.2));
}

function mouth(c: SkCanvas, L: LoadingLayout): void {
  const { k, R } = L;
  c.drawPath(oval(R * 0.1, -26 * k, R * 0.75, 4 * k), radial(R * 0.1, -26 * k, R * 0.8, [YARD.glowWhite, YARD.glowHot, YARD.glow]));
  c.drawPath(oval(0, -26 * k, R, 6 * k), stroke(INK, 1.6));
}

function wheel(c: SkCanvas, L: LoadingLayout): void {
  const r = 9 * L.k;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    c.drawPath(segment(0, 0, Math.cos(a) * r, Math.sin(a) * r), stroke(INK, 1.6));
  }
  c.drawPath(circle(0, 0, r), stroke(INK, 4 * L.k));
  c.drawPath(circle(0, 0, r), stroke(YARD.hivis, 2.4 * L.k));
  c.drawPath(circle(0, 0, 2 * L.k), fill(INK));
}

function shaft(c: SkCanvas, L: LoadingLayout): void {
  const { k, sX, sY, hwX, hwY } = L;
  c.drawPath(segment(sX, sY, hwX, hwY), stroke(INK, 4 * k));
  c.drawPath(segment(sX, sY, hwX, hwY), stroke(YARD.steel, 2.4 * k));
  // the trunnion pin, in front of the crucible
  c.drawPath(circle(sX, sY, 4 * k), fill(YARD.galvanisedLight));
  c.drawPath(circle(sX, sY, 4 * k), stroke(INK, 1.2));
}

/** The weighbridge ticket: three lines of dot-matrix print, each glyph `tkPrint` (11 points or more) high. */
function ticket(c: SkCanvas, L: LoadingLayout, kg: number): void {
  const { k, tkX: tx, tkW: tw, tkH: th, slotY: ty, dX, tkPrint: s } = L;
  const tp = poly([tx, ty, tx + tw, ty, tx + tw, ty + th, tx + tw * 0.75, ty + th - 3, tx + tw * 0.5, ty + th, tx + tw * 0.25, ty + th - 3, tx, ty + th]);
  c.drawPath(tp, fill(YARD.paper));
  c.drawPath(tp, stroke(YARD.paperLine, 1));
  c.drawPath(rect(tx + 4 * k, ty + 4, tw - 8 * k, s + 6), fill(YARD.hivis));
  dotMatrix(c, 'LOADED', dX, ty + 7, s, INK, { align: 'center', bold: true });
  dotMatrix(c, `${groupKg(kg)} KG`, dX, ty + s + 13, s, YARD.print, { align: 'center', bold: true });
  c.drawPath(rrect(tx + 5 * k, ty + 2 * s + 17, tw - 10 * k, s + 6, 2), stroke(YARD.stampBlue, 1.4, 0.85));
  dotMatrix(c, 'ID OK', dX, ty + 2 * s + 20, s, YARD.stampBlue, { align: 'center', bold: true });
}

function trolley(c: SkCanvas, L: LoadingLayout): void {
  const { k, beamY } = L;
  c.drawPath(rrect(-30 * k, beamY - 40 * k, 60 * k, 16 * k, 4), fill(YARD.steelDark));
  c.drawPath(rrect(-30 * k, beamY - 40 * k, 60 * k, 16 * k, 4), stroke(INK, 1.8));
  for (const wx of [-18 * k, 18 * k]) c.drawPath(circle(wx, beamY - 24 * k, 4 * k), fill(INK));
  c.drawPath(rrect(-22 * k, beamY - 6 * k, 44 * k, 12 * k, 3), fill(YARD.machine));
  c.drawPath(rrect(-22 * k, beamY - 6 * k, 44 * k, 12 * k, 3), stroke(INK, 1.6));
  c.drawPath(rect(-14 * k, beamY - 2 * k, 28 * k, 3 * k), fill(YARD.hivis));
}

function magnet(c: SkCanvas, L: LoadingLayout): void {
  const k = L.k;
  const mw = 36 * k;
  c.drawPath(rrect(-6 * k, -16 * k, 12 * k, 8 * k, 2), fill(YARD.steelDark));
  c.drawPath(rrect(-6 * k, -16 * k, 12 * k, 8 * k, 2), stroke(INK, 1.4));
  c.drawPath(oval(0, 3 * k, mw, 11 * k), fill(YARD.steelDark));
  c.drawPath(rect(-mw, 3 * k, mw * 2, 8 * k), fill(YARD.steelDark));
  c.drawPath(oval(0, 11 * k, mw, 6 * k), fill(YARD.hivis));
  c.drawPath(oval(0, 3 * k, mw, 11 * k), stroke(INK, 1.8));
  c.drawPath(oval(0, 11 * k, mw, 6 * k), stroke(INK, 1.8));
  c.drawPath(segment(-mw, 3 * k, -mw, 11 * k), stroke(INK, 1.8));
  c.drawPath(segment(mw, 3 * k, mw, 11 * k), stroke(INK, 1.8));
  // the cable's junction box on top
  c.drawPath(rrect(-4 * k, -22 * k, 8 * k, 6 * k, 1.5), fill(YARD.machine));
}

function field(c: SkCanvas, L: LoadingLayout): void {
  const k = L.k;
  const mw = 36 * k;
  for (let i = 0; i < 2; i++) c.drawPath(builder().addArc({ x: -mw - 8 * k - i * 8 * k, y: -10 * k - i * 6 * k, width: (mw + 8 * k + i * 8 * k) * 2, height: (30 + i * 12) * k }, 200, 140).build(), stroke(YARD.stampBlue, 1.6, 0.55));
}

/** A cooled brass ingot's colour: dull, cast brass with its oxide, never the bright yellow of gold (S11). */
export const INGOT_BRASS = '#B08A3A';
const INGOT_DARK = '#7E6327';
const DROSS = '#8C826C';

/** The ingot's colour `t` seconds after the pour: white-hot, orange, then down to dull brass by 3 s. */
export function ingotColour(t: number): string {
  const q = Math.max(0, Math.min(1, t / 3));
  if (q < 0.35) return mix(YARD.glowHot, YARD.glow, q / 0.35);
  return mix(YARD.glow, INGOT_BRASS, (q - 0.35) / 0.65);
}

/**
 * The cooled ingot's marks: a grey dross skin in patches over its top, the two break notches' shadows,
 * the yard's cast stamp; no highlight (one glint passes once, ./compose.ts).
 */
function notches(c: SkCanvas, x0: number, cy: number, cw: number, ch: number, seed: number): void {
  c.save();
  c.clipPath(ingotPath(x0, cy, cw, ch), 1, true);
  c.drawRect({ x: x0, y: cy + ch * 0.62, width: cw, height: ch }, fill(INGOT_DARK, 0.45));
  for (let i = 0; i < 7; i++) {
    const px = x0 + cw * (0.06 + 0.88 * hash01(i, seed));
    const py = cy + ch * (0.12 + 0.4 * hash01(i, seed + 3));
    c.drawPath(oval(px, py, (1.6 + 2.6 * hash01(i, seed + 5)) * (ch / 9), (0.8 + 0.9 * hash01(i, seed + 7)) * (ch / 9)), fill(DROSS, 0.55));
  }
  c.drawPath(segment(x0 + 4, cy + 1.6, x0 + cw - 4, cy + 1.6), stroke(DROSS, 1.2, 0.5));
  for (const q of [1 / 3, 2 / 3]) c.drawPath(segment(x0 + cw * q, cy + ch * 0.38, x0 + cw * q, cy + ch - 1.5), stroke(INGOT_DARK, 1.2));
  c.drawPath(rrect(x0 + cw * 0.42, cy + ch * 0.45, cw * 0.16, ch * 0.36, 1), stroke(INGOT_DARK, 0.9));
  c.restore();
}

/** An ingot in its cavity: a long bar with two V break notches in its top edge (a cast ingot, not a bar of bullion). */
export function ingotPath(x0: number, cy: number, cw: number, ch: number): SkPath {
  const d = ch * 0.2;
  const v = ch * 0.16;
  const n1 = x0 + cw / 3;
  const n2 = x0 + (2 * cw) / 3;
  return poly([x0 + 2, cy + ch - 1, x0 + 4, cy + 1, n1 - v, cy + 1, n1, cy + 1 + d, n1 + v, cy + 1, n2 - v, cy + 1, n2, cy + 1 + d, n2 + v, cy + 1, x0 + cw - 4, cy + 1, x0 + cw - 2, cy + ch - 1]);
}

/**
 * Records every part for this layout, these words and this timeline (once per screen size and title).
 * `density` > 0 bakes the parts drawn every frame into images of that many pixels a point (the app);
 * 0 keeps them as pictures (Node: the sheets and the tests draw vectors).
 */
export function recordLayers(L: LoadingLayout, words: readonly string[], tl: LoadingTimeline, density = 0): LoadingLayers {
  const { w, h, k } = L;
  const d = density;
  const total = tl.kg.reduce((a, b) => a + b, 0);
  // what a part depends on, as keys: the whole layout for parts drawn in place, less for parts drawn
  // about their own origin (a plate, the magnet), so a rotation that keeps the scale reuses their images
  const at = `${w}x${h}|${L.sl},${L.sr},${L.beamY},${L.mY}|${words.join(' ')}`;
  const local = `${k}`;
  const digits: SkPicture[][] = L.cellX.map((x) =>
    Array.from({ length: 11 }, (_, d) => record((c) => sevenSeg(c, d === 10 ? ' ' : String(d), x + L.cellSize * 0.56, L.cellY, L.cellSize, YARD.led, YARD.ledOff))),
  );
  const cooling: Float32Array[] = [];
  for (let i = 0; i <= 40; i++) cooling.push(col(ingotColour(i / 10)));
  return {
    bg: part(`bg|${at}`, (c) => background(c, L), 0, 0, w, h, d, 2),
    pool: (() => {
      const gx = (L.mL + L.mR) / 2;
      const rx = (L.mR - L.mL) * 0.75;
      const x0 = Math.min(gx - rx, L.sX - 70 * k);
      const x1 = Math.max(gx + rx, L.sX + 70 * k);
      const y0 = L.mY - 26 * k;
      const y1 = L.mY + 66 * k;
      // a soft light: half the density is plenty
      return part(
        `pool|${at}`,
        (c) => {
          c.drawPath(oval(gx, L.mY + 18 * k, rx, 44 * k), radial(gx, L.mY + 18 * k, rx, [rgba('#FFB050', 0.5), rgba('#FFB050', 0)]));
          c.drawPath(oval(L.sX, L.mY + 22 * k, 70 * k, 22 * k), radial(L.sX, L.mY + 22 * k, 70 * k, [rgba('#FFB050', 0.45), rgba('#FFB050', 0)]));
        },
        x0,
        y0,
        x1 - x0,
        y1 - y0,
        d / 2,
        1.5,
      );
    })(),
    plates: words.map((wd, i) => part(`plate|${wd}|${L.plateW[i]}|${L.size}|${i}`, (c) => plate(c, wd, L.plateW[i], L.size, i * 7), -L.plateW[i] / 2 - 4, -L.plateH - L.size * 0.4 - 4, L.plateW[i] + 14, L.plateH + L.size * 0.4 + 14, d)),
    plateGlow: words.map((wd, i) => part(`plateGlow|${wd}|${L.plateW[i]}|${L.size}`, (c) => plateGlow(c, wd, L.plateW[i], L.size), -L.plateW[i] / 2 - 2, -L.plateH - 2, L.plateW[i] + 4, L.plateH + 4, d)),
    trolley: part(`trolley|${local}|${L.beamY}`, (c) => trolley(c, L), -34 * k, L.beamY - 44 * k, 68 * k, 54 * k, d),
    magnet: part(`magnet|${local}`, (c) => magnet(c, L), -40 * k, -26 * k, 80 * k, 46 * k, d),
    field: record((c) => field(c, L)),
    digits,
    ticket: part(`ticket|${at}|${total}`, (c) => ticket(c, L, total), L.tkX - 2, L.slotY - 2, L.tkW + 4, L.tkH + 4, d),
    crucible: part(`crucible|${local}`, (c) => crucible(c, L), -L.R - 12 * k, -38 * k, L.R * 2 + 30 * k, 66 * k, d),
    mouth: part(`mouth|${local}`, (c) => mouth(c, L), -L.R - 4, -36 * k, L.R * 2 + 8, 20 * k, d),
    wheel: record((c) => wheel(c, L)),
    shaft: record((c) => shaft(c, L)),
    hand: part(`hand|${at}`, (c) => {
      c.save();
      c.translate(L.manX, L.manY);
      c.scale(L.manScale, L.manScale);
      drawPerson(c, VIEW, { dir: 'e', pose: 'lever', look: crewLook(YARD.vestCutter, 3), shield: true, apron: true });
      c.restore();
    }, L.manX - 44 * k, L.manY - 80 * k, 110 * k, 96 * k, d),
    hood: part(`hood|${at}`, (c) => hood(c, L), -20, L.hoodTop - 4, L.hoodX + 44 * k + 26, L.hoodBot - L.hoodTop + 8, d),
    hoodGlow: part(`hoodGlow|${at}`, (c) => hoodGlow(c, L), L.hoodX - 46 * k, L.hoodBot - 8 * k, 92 * k, 20 * k, d),
    ingot: L.cavX.map((x0) => ingotPath(x0, L.cavY, L.cavW, L.cavH)),
    notches: L.cavX.map((x0, i) => part(`notches|${at}|${i}`, (c) => notches(c, x0, L.cavY, L.cavW, L.cavH, 11 + i * 5), x0 - 2, L.cavY - 2, L.cavW + 4, L.cavH + 4, d)),
    colours: {
      ink: col(INK),
      rope: col(YARD.ink),
      glow: col(YARD.glow),
      glowHot: col(YARD.glowHot),
      glowWhite: col(YARD.glowWhite),
      spark: col(YARD.spark),
      launder: col(YARD.glowHot),
      field: col(YARD.stampBlue),
      galv: col(YARD.galvanised),
      led: col(YARD.led),
      ledOff: col(YARD.ledOff),
      galvDark: col(YARD.steelDark),
      cooling,
    },
  };
}
