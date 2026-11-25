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
import { BlendMode, Skia, type SkCanvas, type SkPath, type SkPicture } from '@shopify/react-native-skia';
import { YARD, coolingColour, mix, shade } from '../art/palette';
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
  galvDark: Float32Array;
  /** The ingot's colour every 0.1 game-second of cooling, 0 to 4 s (yard palette `coolingColour`). */
  cooling: Float32Array[];
}

export interface LoadingLayers {
  /** The still scene: sky, far yard, ground, deck, display box, gantry, mould, stand. */
  bg: SkPicture;
  /** The pour's warm light on the ground (faded by the pour and the furnace's breath). */
  pool: SkPicture;
  /** Plate i at (centre x 0, foot 0), with its word cut through; its underlight from the pour. */
  plates: SkPicture[];
  plateGlow: SkPicture[];
  trolley: SkPicture;
  /** The electromagnet, its rope's end at (0, 0) and its face 17 k below. */
  magnet: SkPicture;
  /** The magnet's field arcs while it holds (local as the magnet). */
  field: SkPicture;
  /** digits[cell][d]: digit d (10: blank) in that cell of the display. */
  digits: SkPicture[][];
  /** The ticket fully out of the slot (it is clipped and slid while it feeds). */
  ticket: SkPicture;
  /** The crucible in its tongs about its trunnion (0, 0); its mouth's melt separately (it breathes). */
  crucible: SkPicture;
  mouth: SkPicture;
  /** The handwheel about its centre (0, 0) and its shaft (absolute). */
  wheel: SkPicture;
  shaft: SkPicture;
  /** The furnace hand at the handwheel, absolute. */
  hand: SkPicture;
  /** The hood over the crucible with its duct, and the warm light under it. */
  hood: SkPicture;
  hoodGlow: SkPicture;
  /** A cavity's ingot outline (absolute) and its cooled marks (notches and stamp). */
  ingot: SkPath[];
  notches: SkPicture[];
  colours: LoadingColours;
}

function record(draw: (c: SkCanvas) => void, w = 4096, h = 4096): SkPicture {
  const r = Skia.PictureRecorder();
  const c = r.beginRecording(Skia.XYWHRect(-w / 2, -h / 2, w * 1.5, h * 1.5));
  draw(c);
  return r.finishRecordingAsPicture();
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
  for (const lx of [w * 0.035, w * 0.965]) {
    const spread = 34 * k;
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
  // the late-day sky and the far yard (containers, a dock crane, a chimney, trees) in haze
  drawSkyline(c, 0, w, 0, horizon, 5);
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

  // the mould on its sand bed in front: a launder along its back, five cavities
  const { mL, mR, mY, cavX, cavW, cavY, cavH, lX0, lY } = L;
  c.drawPath(oval((mL + mR) / 2, mY + 30 * k, (mR - mL) / 2 + 30 * k, 12 * k), fill(YARD.sand));
  c.drawPath(poly([mL - 10 * k, mY, mR + 10 * k, mY, mR + 16 * k, mY + 26 * k, mL - 16 * k, mY + 26 * k]), fill(YARD.castIron));
  c.drawPath(poly([mL - 10 * k, mY, mR + 10 * k, mY, mR + 16 * k, mY + 26 * k, mL - 16 * k, mY + 26 * k]), stroke(INK, 1.8));
  // the launder's head runs from under the crucible's lip; a refractory spout block holds it
  c.drawPath(rrect(lX0 - 8 * k, lY - 6 * k, 22 * k, 12 * k, 3 * k), fill(YARD.refractory));
  c.drawPath(rrect(lX0 - 8 * k, lY - 6 * k, 22 * k, 12 * k, 3 * k), stroke(INK, 1.4));
  c.drawPath(rrect(lX0, lY - 3 * k, mR - lX0, 6 * k, 3 * k), fill(shade(YARD.castIron, -0.5)));
  for (const x0 of cavX) {
    c.drawPath(rrect(x0, cavY, cavW, cavH, 3), fill(shade(YARD.castIron, -0.5)));
    c.drawPath(rrect(x0, cavY, cavW, cavH, 3), stroke(INK, 1.2));
  }

  // the crucible's stand: a post on a foot, the trunnion at its top
  const { sX, sY } = L;
  c.drawPath(rect(sX - 4 * k, sY, 8 * k, mY + 26 * k - sY), fill(YARD.machineDark));
  c.drawPath(rect(sX - 4 * k, sY, 8 * k, mY + 26 * k - sY), stroke(INK, 1.4));
  c.drawPath(rrect(sX - 20 * k, mY + 22 * k, 40 * k, 8 * k, 2), fill(YARD.machineDark));
  c.drawPath(rrect(sX - 20 * k, mY + 22 * k, 40 * k, 8 * k, 2), stroke(INK, 1.2));
  // the extinguisher by the stand (yard-stage1 6.1)
  const ex = mR + 24 * k;
  const ey = mY + 24 * k;
  c.drawPath(rrect(ex - 4 * k, ey - 18 * k, 8 * k, 18 * k, 3 * k), fill('#C8352B'));
  c.drawPath(rrect(ex - 4 * k, ey - 18 * k, 8 * k, 18 * k, 3 * k), stroke(INK, 1.2));
  c.drawPath(rect(ex - 2 * k, ey - 21 * k, 4 * k, 3 * k), fill(INK));
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

function ticket(c: SkCanvas, L: LoadingLayout, kg: number): void {
  const { k, tkX: tx, tkW: tw, tkH: th, slotY: ty, dX } = L;
  const tp = poly([tx, ty, tx + tw, ty, tx + tw, ty + th, tx + tw * 0.75, ty + th - 3 * k, tx + tw * 0.5, ty + th, tx + tw * 0.25, ty + th - 3 * k, tx, ty + th]);
  c.drawPath(tp, fill(YARD.paper));
  c.drawPath(tp, stroke(YARD.paperLine, 1));
  c.drawPath(rect(tx + 4 * k, ty + 5 * k, tw - 8 * k, 11 * k), fill(YARD.hivis));
  dotMatrix(c, 'LOADED', dX, ty + 7 * k, 7 * k, INK, { align: 'center', bold: true });
  dotMatrix(c, `${groupKg(kg)} KG`, dX, ty + 22 * k, 7 * k, YARD.print, { align: 'center' });
  c.drawPath(rrect(tx + 6 * k, ty + 35 * k, tw - 12 * k, 14 * k, 2), stroke(YARD.stampBlue, 1.4, 0.85));
  dotMatrix(c, 'ID OK', dX, ty + 38.5 * k, 6 * k, YARD.stampBlue, { align: 'center', bold: true });
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

/** The cooled ingot's marks: two break notches, the yard's stamp, a dull highlight. */
function notches(c: SkCanvas, x0: number, cy: number, cw: number, ch: number): void {
  for (const q of [0.33, 0.66]) c.drawPath(segment(x0 + cw * q, cy + 2, x0 + cw * q, cy + ch - 2), stroke(YARD.brassDark, 1.4));
  c.drawPath(rrect(x0 + cw * 0.39, cy + ch * 0.3, cw * 0.22, ch * 0.42, 1.5), stroke(YARD.brassDark, 1));
  c.drawPath(segment(x0 + 5, cy + 3, x0 + cw * 0.3, cy + 3), stroke(YARD.brassLight, 1.4));
}

export function ingotPath(x0: number, cy: number, cw: number, ch: number): SkPath {
  return poly([x0 + 2, cy + ch - 1, x0 + 4, cy + 1, x0 + cw - 4, cy + 1, x0 + cw - 2, cy + ch - 1]);
}

/** Records every part for this layout, these words and this timeline (once per screen size and title). */
export function recordLayers(L: LoadingLayout, words: readonly string[], tl: LoadingTimeline): LoadingLayers {
  const { w, h, k } = L;
  const total = tl.kg.reduce((a, b) => a + b, 0);
  const digits: SkPicture[][] = L.cellX.map((x) =>
    Array.from({ length: 11 }, (_, d) => record((c) => sevenSeg(c, d === 10 ? ' ' : String(d), x + L.cellSize * 0.56, L.cellY, L.cellSize, YARD.led, YARD.ledOff))),
  );
  const cooling: Float32Array[] = [];
  for (let i = 0; i <= 40; i++) cooling.push(col(coolingColour('brass', i / 10)));
  return {
    bg: record((c) => background(c, L), w, h),
    pool: record((c) => {
      const gx = (L.mL + L.mR) / 2;
      c.drawPath(oval(gx, L.mY + 18 * k, (L.mR - L.mL) * 0.75, 44 * k), radial(gx, L.mY + 18 * k, (L.mR - L.mL) * 0.75, [rgba('#FFB050', 0.5), rgba('#FFB050', 0)]));
      c.drawPath(oval(L.sX, L.mY + 22 * k, 70 * k, 22 * k), radial(L.sX, L.mY + 22 * k, 70 * k, [rgba('#FFB050', 0.45), rgba('#FFB050', 0)]));
    }),
    plates: words.map((wd, i) => record((c) => plate(c, wd, L.plateW[i], L.size, i * 7))),
    plateGlow: words.map((wd, i) => record((c) => plateGlow(c, wd, L.plateW[i], L.size))),
    trolley: record((c) => trolley(c, L)),
    magnet: record((c) => magnet(c, L)),
    field: record((c) => field(c, L)),
    digits,
    ticket: record((c) => ticket(c, L, total)),
    crucible: record((c) => crucible(c, L)),
    mouth: record((c) => mouth(c, L)),
    wheel: record((c) => wheel(c, L)),
    shaft: record((c) => shaft(c, L)),
    hand: record((c) => {
      c.save();
      c.translate(L.manX, L.manY);
      c.scale(L.manScale, L.manScale);
      drawPerson(c, VIEW, { dir: 'e', pose: 'lever', look: crewLook(YARD.vestCutter, 3), shield: true, apron: true });
      c.restore();
    }),
    hood: record((c) => hood(c, L)),
    hoodGlow: record((c) => hoodGlow(c, L)),
    ingot: L.cavX.map((x0) => ingotPath(x0, L.cavY, L.cavW, L.cavH)),
    notches: L.cavX.map((x0) => record((c) => notches(c, x0, L.cavY, L.cavW, L.cavH))),
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
      galvDark: col(YARD.steelDark),
      cooling,
    },
  };
}
