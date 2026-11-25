/**
 * The loading animation (yard-design.md 11, yard-style.md "Loading"): an overhead gantry crane's
 * trolley runs in with an electromagnet; three steel plates cut with the title's words in stencil are lowered
 * one by one onto the weighbridge and clank into place (a 2 pt shake each) while its display counts
 * the kilograms; a crucible tips and pours a glowing bar beneath the title; the bar cools from orange
 * to brass and the display holds the final weight. Then the gate opens: the picture parts down the
 * middle like two gate leaves onto the yard.
 *
 * Pure: `loadingPose(t)` gives every moving part at t seconds (a worklet, so the app can run it on the
 * UI thread from one shared clock), `drawLoading(c, w, h, pose, title)` draws a frame. In the app the
 * still parts (sky, ground, deck, crane body) are recorded once as a picture and the moving parts are
 * drawn from the pose each frame (yard-style.md says how); no new dependency.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { YARD, coolingColour, mix, shade } from './palette';
import { dotMatrix, sevenSeg, stencil, stencilWidth } from './letters';
import { BlendMode, ClipOp } from '@shopify/react-native-skia';
import { builder, circle, fill, hash01, hazard, linear, oval, poly, radial, rect, rgba, rrect, segment, stroke, VIEW } from './pen';
import { drawSkyline } from './ground.draw';
import { crewLook, drawPerson } from './people.draw';

/** Thousands with a comma, no locale tables (worklet-safe). */
export function groupKg(n: number): string {
  'worklet';
  const s = String(Math.max(0, Math.round(n)));
  return s.length > 3 ? s.slice(0, s.length - 3) + ',' + s.slice(-3) : s;
}

/** Key times, seconds (yard-design.md 11). */
export const LOADING_T = {
  jibIn: [0, 0.4],
  plates: [
    [0.4, 0.8],
    [0.8, 1.2],
    [1.2, 1.6],
  ],
  tip: [1.6, 1.8],
  pour: [1.8, 2.1],
  cool: [2.1, 2.4],
  gate: [2.4, 2.75],
  end: 2.75,
} as const;

/** Kilograms each plate adds to the display (the sum is the final reading). */
export const PLATE_KG = [520, 260, 460];

export interface PlatePose {
  /** 0 hanging at the top, 1 landed. */
  drop: number;
  /** Shake offset, points (after landing). */
  shake: number;
  carried: boolean;
}

export interface LoadingPose {
  t: number;
  /** Where the crane's trolley is: -1 off screen left, 0..2 over plate i (fractional while it runs between). */
  aim: number;
  /** How far the magnet is lowered: 0 up under the trolley, 1 a plate's foot on the deck. */
  cable: number;
  /** Magnet lit (holding). */
  magnetOn: boolean;
  plates: PlatePose[];
  kg: number;
  /** Crucible tilt 0..1. */
  tilt: number;
  /** Pour progress 0..1 (the bar fills left to right). */
  pour: number;
  /** Seconds since the bar was full (cooling). */
  cool: number;
  /** Gate opening 0..1. */
  gate: number;
  /** The ticket feeding out of the display's slot at the end, 0..1. */
  ticket: number;
}

const clamp01 = (x: number) => {
  'worklet';
  return Math.max(0, Math.min(1, x));
};
const ease = (x: number) => {
  'worklet';
  const k = clamp01(x);
  return k * k * (3 - 2 * k);
};


export function loadingPose(t: number): LoadingPose {
  'worklet';
  const P = LOADING_T;
  const plates: PlatePose[] = [];
  let aim = -1;
  let cable = 0;
  let magnetOn = false;
  let kg = 0;
  if (t < P.jibIn[1]) aim = -1 + ease(t / P.jibIn[1]);
  for (let i = 0; i < 3; i++) {
    const [a, b] = P.plates[i];
    const k = (t - a) / (b - a);
    if (t < a) {
      plates.push({ drop: 0, shake: 0, carried: false });
      continue;
    }
    if (k < 1) {
      // move over (first 30 %), lower (to 85 %), release
      aim = i === 0 ? 0 : i - 1 + ease(k / 0.3);
      const down = ease((k - 0.3) / 0.55);
      cable = down;
      magnetOn = k < 0.85;
      plates.push({ drop: down, shake: 0, carried: k < 0.85 });
      kg += PLATE_KG[i] * ease((k - 0.6) / 0.4);
    } else {
      const since = t - b;
      plates.push({ drop: 1, shake: since < 0.08 ? 2 * Math.sin(since * 120) : 0, carried: false });
      kg += PLATE_KG[i];
    }
    if (k >= 0.85 && k < 1) {
      cable = 1 - ease((k - 0.85) / 0.15);
    }
  }
  if (t >= P.plates[2][1]) {
    // the jib lifts away to clear the stage
    aim = 2 - 3 * ease((t - P.plates[2][1]) / 0.5);
    cable = 0;
  }
  const tilt = t < P.tip[0] ? 0 : t < P.cool[0] ? ease((t - P.tip[0]) / (P.tip[1] - P.tip[0])) : 1 - ease((t - P.cool[0]) / 0.25);
  const pour = clamp01((t - P.pour[0]) / (P.pour[1] - P.pour[0]));
  const cool = Math.max(0, t - P.pour[1]) * 11; // the bar cools in about 0.27 s on this screen (the game's 3 s, quickened)
  const gate = ease((t - P.gate[0]) / (P.gate[1] - P.gate[0]));
  const ticket = ease((t - P.cool[0]) / (P.cool[1] - P.cool[0]));
  return { t, aim, cable, magnetOn, plates, kg: Math.round(kg), tilt, pour, cool, gate, ticket };
}

// ---------------------------------------------------------------------------

const INK = YARD.ink;

/** How many ingot cavities the loading mould has; the launder fills them west to east as `pour` runs. */
const CAVITIES = 5;

/**
 * A plate of red-oxide painted steel with its word cut clean through (the far yard shows in the letters),
 * a dark kerf on one side of each cut, worn paint at the edges, a lifting lug; `glow` 0..1 lights it from
 * below with the pour's warm light.
 */
function plate(c: SkCanvas, word: string, cx: number, bottom: number, size: number, glow: number): { w: number; h: number } {
  const tw = stencilWidth(word, size, 3);
  const w = tw + size * 0.9;
  const h = size * 1.75;
  const x = cx - w / 2;
  const y = bottom - h;
  c.drawPath(rrect(x + 4, y + 5, w, h, 4), fill(INK, 0.22));
  // the lifting lug above
  c.drawPath(rrect(cx - 7, y - 9, 14, 11, 4), fill(YARD.steelDark));
  c.drawPath(rrect(cx - 7, y - 9, 14, 11, 4), stroke(INK, 1.6));
  c.drawPath(circle(cx, y - 4, 2.4), fill(INK));
  c.saveLayer();
  c.drawPath(rrect(x, y, w, h, 4), fill(YARD.skip));
  c.drawPath(rrect(x + 3, y + 3, w - 6, h * 0.16, 2), fill(shade(YARD.skip, 0.14)));
  // worn paint: bare steel at two corners and along the bottom edge
  c.drawPath(poly([x, y + h * 0.6, x + w * 0.08, y + h, x, y + h]), fill(YARD.steel));
  c.drawPath(poly([x + w, y, x + w - w * 0.06, y, x + w, y + h * 0.22]), fill(YARD.steel));
  for (let i = 0; i < 5; i++) c.drawCircle(x + w * hash01(i, word.length) , y + h * (0.75 + 0.2 * hash01(i, 3)), 1.2 + hash01(i, 5) * 1.6, fill(YARD.rust, 0.8));
  if (glow > 0) {
    const g = linear(0, y + h, 0, y + h * 0.3, [rgba(YARD.glowHot, 0.85 * glow), rgba(YARD.glow, 0)]);
    g.setBlendMode(BlendMode.SrcATop);
    c.drawRect({ x, y, width: w, height: h }, g);
  }
  const ty = y + (h - size) / 2;
  stencil(c, word, cx + 1.6, ty + 1.6, size, INK, { align: 'center', track: 3 });
  stencil(c, word, cx, ty, size, INK, { align: 'center', track: 3, cut: true });
  c.restore();
  c.drawPath(rrect(x, y, w, h, 4), stroke(INK, 2.2));
  if (glow > 0) c.drawPath(segment(x + 4, y + h - 1.5, x + w - 4, y + h - 1.5), stroke(YARD.glowHot, 2, glow));
  return { w, h };
}

/** The gantry crane: two A-frame legs on rails, a lattice girder across, the cab under it at the right. */
function gantry(c: SkCanvas, w: number, beamY: number, ground: number, k: number): void {
  const Y = YARD.hivis;
  const D = YARD.hivisDark;
  // rails
  c.drawRect({ x: 0, y: ground + 4 * k, width: w, height: 3 * k }, fill(YARD.steelDark));
  for (const lx of [w * 0.045, w * 0.955]) {
    const spread = 34 * k;
    const leg = (x0: number) => poly([x0 - 6 * k, ground, x0 + 6 * k, ground, lx + 5 * k, beamY, lx - 5 * k, beamY]);
    for (const x0 of [lx - spread, lx + spread]) {
      c.drawPath(leg(x0), fill(x0 < lx ? Y : D));
      c.drawPath(leg(x0), stroke(INK, 1.8));
    }
    // braces
    for (const f of [0.35, 0.65]) {
      const yy = beamY + (ground - beamY) * f;
      const half = 5 * k + (spread - 5 * k) * f;
      c.drawPath(segment(lx - half, yy, lx + half, yy), stroke(INK, 4.6 * k));
      c.drawPath(segment(lx - half, yy, lx + half, yy), stroke(D, 3 * k));
    }
    // the bogie on the rail
    c.drawPath(rrect(lx - spread - 14 * k, ground - 4 * k, spread * 2 + 28 * k, 10 * k, 3), fill(YARD.steelDark));
    c.drawPath(rrect(lx - spread - 14 * k, ground - 4 * k, spread * 2 + 28 * k, 10 * k, 3), stroke(INK, 1.6));
    hazard(c, rect(lx - spread - 10 * k, ground - 3 * k, spread * 2 + 20 * k, 5 * k), 4, 0);
  }
  // the lattice girder: two chords and diagonals between
  const top = beamY - 30 * k;
  c.drawPath(rect(0, top, w, 8 * k), fill(Y));
  c.drawPath(rect(0, beamY - 8 * k, w, 8 * k), fill(D));
  for (let x = -10 * k, i = 0; x < w + 20 * k; x += 26 * k, i++) {
    const p = segment(x, top + 8 * k, x + 26 * k * (i % 2 ? -1 : 1) * 0 + 13 * k, beamY - 8 * k);
    const q = segment(x + 13 * k, beamY - 8 * k, x + 26 * k, top + 8 * k);
    c.drawPath(p, stroke(INK, 4.2 * k));
    c.drawPath(q, stroke(INK, 4.2 * k));
    c.drawPath(p, stroke(D, 2.6 * k));
    c.drawPath(q, stroke(D, 2.6 * k));
  }
  c.drawPath(rect(0, top, w, 8 * k), stroke(INK, 1.8));
  c.drawPath(rect(0, beamY - 8 * k, w, 8 * k), stroke(INK, 1.8));
  // the cab under the girder at the right leg
  const cx = w * 0.86;
  c.drawPath(rrect(cx - 22 * k, beamY, 44 * k, 30 * k, 4), fill(YARD.cab));
  c.drawPath(rrect(cx - 18 * k, beamY + 5 * k, 36 * k, 13 * k, 2), fill(YARD.glassDark));
  c.drawPath(rect(cx - 14 * k, beamY + 6 * k, 5 * k, 11 * k), fill(YARD.glass));
  c.drawPath(rect(cx - 22 * k, beamY + 22 * k, 44 * k, 4 * k), fill(Y));
  c.drawPath(rrect(cx - 22 * k, beamY, 44 * k, 30 * k, 4), stroke(INK, 1.8));
}

/**
 * One frame of the loading screen at w x h points. `title` is the three plates' words (the title is
 * "Scrap to Ingot", cleared by the names register).
 */
export function drawLoading(c: SkCanvas, w: number, h: number, pose: LoadingPose, title: [string, string, string] = ['SCRAP', 'TO', 'INGOT']): void {
  const k = Math.min(w / 844, h / 390);
  const horizon = h * 0.56;
  const ground = h * 0.6;
  // the late-day sky and the far yard (containers, a dock crane, a chimney, trees) in haze
  drawSkyline(c, 0, w, 0, horizon, 5);
  // the yard floor: warm concrete with joints, the low sun's wash
  c.drawRect({ x: 0, y: horizon, width: w, height: h - horizon }, fill(YARD.concrete));
  c.drawRect({ x: 0, y: horizon, width: w, height: 3 }, fill(YARD.concreteDark));
  for (let x = -40 * k; x < w + 80 * k; x += 110 * k) c.drawPath(segment(x, horizon, x - 60 * k, h), stroke(YARD.joint, 1.2));
  c.drawPath(segment(0, h * 0.82, w, h * 0.82), stroke(YARD.joint, 1.2));
  const pourGlow = pose.tilt > 0.4 || (pose.pour > 0 && pose.cool < 2) ? Math.min(1, pose.tilt * 1.2) : 0;

  // the weighbridge deck along the middle, its lip toward the eye
  const deckL = w * 0.1;
  const deckR = w * 0.8;
  const deckY = ground + 2 * k;
  c.drawPath(rect(deckL - 6, deckY - 4 * k, deckR - deckL + 12, 18 * k), fill(YARD.concreteLight));
  c.drawPath(rect(deckL, deckY - 3 * k, deckR - deckL, 9 * k), fill(YARD.galvanised));
  c.drawPath(rect(deckL, deckY + 6 * k, deckR - deckL, 4 * k), fill(YARD.steelDark));
  for (const [a, b] of [[deckL, deckL + 22 * k], [deckR - 22 * k, deckR]]) hazard(c, rect(a, deckY - 3 * k, b - a, 9 * k), 5, 0);
  c.drawPath(rect(deckL, deckY - 3 * k, deckR - deckL, 13 * k), stroke(INK, 1.6));

  // the plates' places on the deck (clear of the display at the right)
  const size = 42 * k;
  const gapX = 16 * k;
  const widths = title.map((t) => stencilWidth(t, size, 3) + size * 0.9);
  const total = widths.reduce((a, b) => a + b, 0) + gapX * 2;
  const rowL = (deckL + deckR) / 2 - total / 2;
  const centres = widths.map((pw, i) => rowL + widths.slice(0, i).reduce((a, b) => a + b, 0) + gapX * i + pw / 2);

  // the display on its post right of the deck, the ticket printer's slot under its digits
  const dX = w * 0.85;
  const bw = 112 * k;
  const bh = 66 * k;
  const by = ground - 118 * k;
  c.drawPath(rect(dX - 3 * k, by + bh, 6 * k, ground - by - bh + 6 * k), fill(YARD.galvanised));
  c.drawPath(rect(dX - 3 * k, by + bh, 6 * k, ground - by - bh + 6 * k), stroke(INK, 1.4));
  c.drawPath(rrect(dX - bw / 2 + 3, by + 4, bw, bh, 7), fill(INK, 0.25));
  c.drawPath(rrect(dX - bw / 2, by, bw, bh, 7), fill(YARD.hivis));
  c.drawPath(rrect(dX - bw / 2, by, bw, bh, 7), stroke(INK, 2));
  c.drawPath(rrect(dX - bw / 2 + 6 * k, by + 6 * k, bw - 12 * k, 36 * k, 4), fill(YARD.ledCase));
  sevenSeg(c, groupKg(pose.kg), dX + bw / 2 - 14 * k, by + 11 * k, 25 * k, YARD.led, YARD.ledOff);
  const slotY = by + bh - 12 * k;
  c.drawPath(rrect(dX - 30 * k, slotY - 3 * k, 60 * k, 6 * k, 3 * k), fill(INK));
  if (pose.ticket > 0) {
    // the short ticket feeding out: LOADED, the kilograms, the stamp
    const tw = 54 * k;
    const th = 58 * k * pose.ticket;
    const tx = dX - tw / 2;
    const ty = slotY;
    c.save();
    c.clipRect({ x: tx - 2, y: ty, width: tw + 4, height: th + 4 }, ClipOp.Intersect, true);
    const tp = poly([tx, ty, tx + tw, ty, tx + tw, ty + 58 * k, tx + tw * 0.75, ty + 55 * k, tx + tw * 0.5, ty + 58 * k, tx + tw * 0.25, ty + 55 * k, tx, ty + 58 * k]);
    c.drawPath(tp, fill(YARD.paper));
    c.drawPath(tp, stroke(YARD.paperLine, 1));
    c.drawPath(rect(tx + 4 * k, ty + 5 * k, tw - 8 * k, 11 * k), fill(YARD.hivis));
    dotMatrix(c, 'LOADED', dX, ty + 7 * k, 7 * k, INK, { align: 'center', bold: true });
    dotMatrix(c, `${groupKg(pose.kg)} KG`, dX, ty + 22 * k, 7 * k, YARD.print, { align: 'center' });
    c.drawPath(rrect(tx + 6 * k, ty + 35 * k, tw - 12 * k, 14 * k, 2), stroke(YARD.stampBlue, 1.4, 0.85));
    dotMatrix(c, 'ID OK', dX, ty + 38.5 * k, 6 * k, YARD.stampBlue, { align: 'center', bold: true });
    c.restore();
  }

  // the gantry crane over everything, its trolley running on the girder
  const beamY = h * 0.13;
  gantry(c, w, beamY, ground, k);
  let trolleyX: number;
  if (pose.aim <= -1) trolleyX = -70 * k;
  else if (pose.aim < 0) trolleyX = -70 * k + (centres[0] + 70 * k) * (pose.aim + 1);
  else {
    const i = Math.min(1, Math.floor(pose.aim));
    const f = Math.min(1, pose.aim - i);
    trolleyX = centres[i] + (centres[i + 1] - centres[i]) * f;
  }
  c.drawPath(rrect(trolleyX - 30 * k, beamY - 40 * k, 60 * k, 16 * k, 4), fill(YARD.steelDark));
  c.drawPath(rrect(trolleyX - 30 * k, beamY - 40 * k, 60 * k, 16 * k, 4), stroke(INK, 1.8));
  c.drawPath(rrect(trolleyX - 22 * k, beamY - 6 * k, 44 * k, 12 * k, 3), fill(YARD.machine));
  c.drawPath(rrect(trolleyX - 22 * k, beamY - 6 * k, 44 * k, 12 * k, 3), stroke(INK, 1.6));
  const tip: [number, number] = [trolleyX, beamY + 6 * k];

  // the hoist rope and the electromagnet
  const plateH = size * 1.75;
  const upY = tip[1] + 22 * k;
  const landY = deckY - 3 * k - plateH - 22 * k;
  const mY = upY + (landY - upY) * pose.cable;
  c.drawPath(segment(tip[0] - 3, tip[1], tip[0] - 3, mY - 12 * k), stroke(INK, 1.6));
  c.drawPath(segment(tip[0] + 3, tip[1], tip[0] + 3, mY - 12 * k), stroke(INK, 1.6));
  const mw = 36 * k;
  c.drawPath(rrect(tip[0] - 6 * k, mY - 16 * k, 12 * k, 8 * k, 2), fill(YARD.steelDark));
  c.drawPath(oval(tip[0], mY + 3 * k, mw, 11 * k), fill(YARD.steelDark));
  c.drawPath(rect(tip[0] - mw, mY + 3 * k, mw * 2, 8 * k), fill(YARD.steelDark));
  c.drawPath(oval(tip[0], mY + 11 * k, mw, 6 * k), fill(YARD.hivis));
  c.drawPath(oval(tip[0], mY + 3 * k, mw, 11 * k), stroke(INK, 1.8));
  c.drawPath(oval(tip[0], mY + 11 * k, mw, 6 * k), stroke(INK, 1.8));
  if (pose.magnetOn) for (let i = 0; i < 2; i++) c.drawPath(builder().addArc({ x: tip[0] - mw - 8 - i * 8, y: mY - 10 - i * 6, width: (mw + 8 + i * 8) * 2, height: 30 + i * 12 }, 200, 140).build(), stroke(YARD.stampBlue, 1.6, 0.55));

  const top = deckY - 3 * k;
  pose.plates.forEach((p, i) => {
    if (p.drop === 0 && !p.carried) return;
    if (p.carried) {
      plate(c, title[i], tip[0], mY + 18 * k + plateH, size, 0);
    } else {
      c.save();
      c.translate(0, -p.shake);
      plate(c, title[i], centres[i], top, size, pourGlow);
      c.restore();
      if (p.shake !== 0)
        for (const sx of [-1, 1]) {
          c.drawPath(segment(centres[i] + sx * (widths[i] / 2 + 6), top - 6, centres[i] + sx * (widths[i] / 2 + 16), top - 14), stroke(INK, 2));
          c.drawPath(segment(centres[i] + sx * (widths[i] / 2 + 4), top - 1, centres[i] + sx * (widths[i] / 2 + 12), top - 4), stroke(YARD.spark, 1.6));
        }
    }
  });

  // the mould in the foreground: a launder along its back feeds five ingot cavities west to east
  const mL = w * 0.27;
  const mR = w * 0.72;
  const mY0 = h * 0.8;
  const cavW = (mR - mL) / CAVITIES;
  if (pourGlow > 0 || pose.pour > 0) {
    const gx = (mL + mR) / 2;
    c.drawPath(oval(gx, mY0 + 18 * k, (mR - mL) * 0.75, 40 * k), radial(gx, mY0 + 18 * k, (mR - mL) * 0.75, [rgba('#FFB050', 0.5 * Math.max(pourGlow, pose.cool < 3 ? 0.6 : 0.2)), rgba('#FFB050', 0)]));
  }
  c.drawPath(oval((mL + mR) / 2, mY0 + 30 * k, (mR - mL) / 2 + 30 * k, 12 * k), fill(YARD.sand));
  c.drawPath(poly([mL - 10 * k, mY0, mR + 10 * k, mY0, mR + 16 * k, mY0 + 26 * k, mL - 16 * k, mY0 + 26 * k]), fill(YARD.castIron));
  c.drawPath(poly([mL - 10 * k, mY0, mR + 10 * k, mY0, mR + 16 * k, mY0 + 26 * k, mL - 16 * k, mY0 + 26 * k]), stroke(INK, 1.8));
  // the launder (a channel along the back edge)
  const lY = mY0 + 2 * k;
  c.drawPath(rrect(mL - 40 * k, lY - 3 * k, mR - mL + 40 * k, 6 * k, 3 * k), fill(shade(YARD.castIron, -0.5)));
  const fillCav = pose.pour * CAVITIES;
  if (pose.pour > 0 && pose.pour < 1) c.drawPath(rrect(mL - 40 * k, lY - 2 * k, (mR - mL) * pose.pour + 40 * k, 4 * k, 2 * k), fill(YARD.glowHot));
  for (let i = 0; i < CAVITIES; i++) {
    const x0 = mL + i * cavW + 5 * k;
    const cw = cavW - 10 * k;
    const cy = mY0 + 8 * k;
    const ch = 13 * k;
    c.drawPath(rrect(x0, cy, cw, ch, 3), fill(shade(YARD.castIron, -0.5)));
    const f = Math.max(0, Math.min(1, fillCav - i));
    if (f > 0) {
      const since = pose.cool > 0 ? pose.cool + (CAVITIES - 1 - i) * 0.6 : 0;
      const col = pose.cool > 0 ? coolingColour('brass', since) : YARD.glowHot;
      const ingot = poly([x0 + 2, cy + ch - 1, x0 + 4, cy + ch * (1 - f) + 1, x0 + cw - 4, cy + ch * (1 - f) + 1, x0 + cw - 2, cy + ch - 1]);
      c.drawPath(ingot, fill(col));
      if (since < 2) c.drawPath(ingot, linear(x0, 0, x0 + cw, 0, [rgba(YARD.glowWhite, 0.7), rgba(YARD.glowWhite, 0)]));
      if (since >= 3) {
        // the cooled ingot: notches and the yard's stamp
        for (const q of [0.33, 0.66]) c.drawPath(segment(x0 + cw * q, cy + 2, x0 + cw * q, cy + ch - 2), stroke(YARD.brassDark, 1.4));
        c.drawPath(rrect(x0 + cw * 0.38, cy + ch * 0.3, cw * 0.24, ch * 0.42, 1.5), stroke(YARD.brassDark, 1));
        c.drawPath(segment(x0 + 5, cy + 3, x0 + cw * 0.3, cy + 3), stroke(YARD.brassLight, 1.4));
      }
    }
    c.drawPath(rrect(x0, cy, cw, ch, 3), stroke(INK, 1.2));
  }

  // the crucible in its tongs on a tilting stand at the west end; the furnace hand at the lever
  const sX = mL - 64 * k;
  const sY = mY0 - 30 * k;
  c.drawPath(rect(sX - 4 * k, sY, 8 * k, mY0 + 26 * k - sY), fill(YARD.machineDark));
  c.drawPath(rect(sX - 4 * k, sY, 8 * k, mY0 + 26 * k - sY), stroke(INK, 1.4));
  c.drawPath(rrect(sX - 20 * k, mY0 + 22 * k, 40 * k, 8 * k, 2), fill(YARD.machineDark));
  const ang = pose.tilt * 50;
  c.save();
  c.translate(sX, sY);
  c.rotate(ang, 0, 0);
  const R = 18 * k;
  const body = builder().moveTo(-R, -26 * k).lineTo(-R * 0.8, 16 * k).quadTo(0, 24 * k, R * 0.8, 16 * k).lineTo(R, -26 * k).close().build();
  c.drawPath(body, linear(-R, 0, R, 0, [mix(YARD.refractory, '#FFFFFF', 0.2), YARD.refractory, shade(YARD.refractory, -0.3)]));
  c.drawPath(body, stroke(INK, 1.8));
  // the tongs: a ring round the body and the lever arm out to the west
  c.drawPath(rect(-R - 3 * k, -6 * k, R * 2 + 6 * k, 6 * k), fill(YARD.steelDark));
  c.drawPath(rect(-R - 3 * k, -6 * k, R * 2 + 6 * k, 6 * k), stroke(INK, 1.4));
  c.drawPath(oval(0, -26 * k, R, 6 * k), fill(YARD.steelDark));
  c.drawPath(oval(R * 0.15, -26 * k, R * 0.6, 3.4 * k), radial(R * 0.15, -26 * k, R * 0.7, [YARD.glowHot, YARD.glow, shade(YARD.glow, -0.3)]));
  c.drawPath(oval(0, -26 * k, R, 6 * k), stroke(INK, 1.6));
  c.drawPath(poly([R - 3, -30 * k, R + 7 * k, -28 * k, R + 7 * k, -24 * k, R - 3, -22 * k]), fill(YARD.refractory));
  c.restore();
  c.drawPath(circle(sX, sY, 4 * k), fill(YARD.galvanisedLight));
  c.drawPath(circle(sX, sY, 4 * k), stroke(INK, 1.2));
  // the tilt handwheel on its shaft, where the furnace hand's hands are
  const hwx = sX - 40 * k;
  const hwy = sY + 16 * k;
  c.drawPath(segment(sX, sY, hwx, hwy), stroke(INK, 4 * k));
  c.drawPath(segment(sX, sY, hwx, hwy), stroke(YARD.steel, 2.4 * k));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + pose.tilt * 3;
    c.drawPath(segment(hwx, hwy, hwx + Math.cos(a) * 9 * k, hwy + Math.sin(a) * 9 * k), stroke(INK, 1.6));
  }
  c.drawPath(circle(hwx, hwy, 9 * k), stroke(INK, 4 * k));
  c.drawPath(circle(hwx, hwy, 9 * k), stroke(YARD.hivis, 2.4 * k));
  if (pose.tilt > 0.6 && pose.pour < 1) {
    // the stream from the lip falls into the launder's head
    const a = (ang * Math.PI) / 180;
    const lx = sX + Math.cos(a) * (R + 7 * k) - Math.sin(a) * (-26 * k);
    const ly = sY + Math.sin(a) * (R + 7 * k) + Math.cos(a) * (-26 * k);
    const ex = lx;
    const ey = lY;
    const s1 = (w0: number, w1: number, col: string) => c.drawPath(poly([lx - w0 / 2, ly, lx + w0 / 2, ly, ex + w1 / 2, ey, ex - w1 / 2, ey]), fill(col));
    s1(9 * k, 6 * k, YARD.glow);
    s1(6 * k, 3.6 * k, YARD.glowHot);
    s1(2.4 * k, 1.2 * k, YARD.glowWhite);
    for (let i = 0; i < 9; i++) {
      const dx = (hash01(i, 21) - 0.5) * 40 * k;
      const dy = -4 - hash01(i, 22) * 22 * k;
      c.drawPath(segment(ex + dx * 0.3, ey - 2, ex + dx, ey + dy), stroke(i % 2 ? YARD.spark : YARD.glowWhite, 1.4));
    }
  }
  // the furnace hand in shield and aluminised apron, at the lever (lit warm when the melt is out)
  c.save();
  c.translate(sX - 62 * k, mY0 + 24 * k);
  c.scale(1.35 * k, 1.35 * k);
  drawPerson(c, VIEW, { dir: 'e', pose: 'lever', look: crewLook(YARD.vestCutter, 3), shield: true, apron: true });
  c.restore();
  // the gate (pose.gate) is not drawn here: the screen slides two clipped halves of this picture apart
  // onto the yard (yard-style.md 9).
}
