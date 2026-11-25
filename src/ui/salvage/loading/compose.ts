/**
 * Puts the recorded parts (./layers.ts) together for one pose (./timeline.ts): a worklet, so the app
 * draws every frame on the UI thread from one shared clock without the JavaScript thread (which bakes
 * the yard's atlases meanwhile). Only Skia calls and other worklets here: the art kit's helpers are
 * ordinary functions and run once, when the layers are recorded.
 */
import { Skia, type SkCanvas, type SkPaint } from '@shopify/react-native-skia';
import type { LoadingLayers } from './layers';
import type { LoadingLayout } from './layout';
import type { LoadingPose } from './timeline';

/** Skia's enums as numbers (a worklet reads plain values). */
const STROKE = 1;
const INTERSECT = 1;

function paint(color: Float32Array, alpha = 1, width = 0): SkPaint {
  'worklet';
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setColor(color);
  p.setAlphaf(Math.max(0, Math.min(1, alpha)));
  if (width > 0) {
    p.setStyle(STROKE);
    p.setStrokeWidth(width);
  }
  return p;
}

function alphaLayer(c: SkCanvas, a: number): void {
  'worklet';
  const p = Skia.Paint();
  p.setAlphaf(Math.max(0, Math.min(1, a)));
  c.saveLayer(p);
}

function hash(a: number, b: number): number {
  'worklet';
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function clamp01(x: number): number {
  'worklet';
  return Math.max(0, Math.min(1, x));
}

/** The trolley's x for a pose. */
export function trolleyX(L: LoadingLayout, pose: LoadingPose): number {
  'worklet';
  const a = pose.aim;
  let x: number;
  if (a <= -1) x = L.offX;
  else if (a < 0) x = L.offX + (L.plateX[0] - L.offX) * (a + 1);
  else {
    const n = L.plateX.length;
    const i = Math.min(n - 1, Math.floor(a));
    const f = Math.min(1, a - i);
    x = i + 1 < n ? L.plateX[i] + (L.plateX[i + 1] - L.plateX[i]) * f : L.plateX[i];
  }
  return x + (L.parkX - x) * pose.park;
}

/** How hot the pad is: the tipped crucible and the fresh bars light the plates and the ground. */
export function heatOf(pose: LoadingPose): number {
  'worklet';
  const bars = pose.pour > 0 ? 1 - Math.min(1, pose.cool / 3.2) : 0;
  return Math.max(pose.tilt * 0.9, bars);
}

/** The scene without the gate. */
function scene(c: SkCanvas, Y: LoadingLayers, L: LoadingLayout, pose: LoadingPose): void {
  'worklet';
  const k = L.k;
  const C = Y.colours;
  const heat = heatOf(pose);
  c.drawPicture(Y.bg);

  // the warm light on the ground: the furnace breathes under its hood; the pour floods it
  alphaLayer(c, Math.max(heat, 0.22 + 0.16 * pose.breathe));
  c.drawPicture(Y.pool);
  c.restore();

  // the display's digits, cell by cell (leading cells dark, as a real display)
  const kg = Math.max(0, Math.min(9999, Math.round(pose.kg)));
  const ds = [Math.floor(kg / 1000) % 10, Math.floor(kg / 100) % 10, Math.floor(kg / 10) % 10, kg % 10];
  for (let i = 0; i < 4; i++) {
    const lead = (i === 0 && kg < 1000) || (i === 1 && kg < 100) || (i === 2 && kg < 10);
    c.drawPicture(Y.digits[i][lead ? 10 : ds[i]]);
  }
  // the ticket feeding out of the printer's slot
  if (pose.ticket > 0) {
    c.save();
    c.clipRect(Skia.XYWHRect(L.tkX - 3, L.slotY, L.tkW + 6, L.tkH + 8), INTERSECT, true);
    c.translate(0, -(1 - pose.ticket) * L.tkH);
    c.drawPicture(Y.ticket);
    c.restore();
  }

  // the plates on the deck, lit from below by the pour; a shake and two sparks as each lands
  for (let i = 0; i < pose.plates.length; i++) {
    const p = pose.plates[i];
    if (p.carried || p.drop < 1) continue;
    c.save();
    c.translate(L.plateX[i], L.deckTop - p.shake);
    c.drawPicture(Y.plates[i]);
    if (heat > 0.02) {
      alphaLayer(c, heat * 0.95);
      c.drawPicture(Y.plateGlow[i]);
      c.restore();
    }
    c.restore();
    if (p.shake !== 0) {
      const hw = L.plateW[i] / 2;
      for (let s = -1; s <= 1; s += 2) {
        const x = L.plateX[i] + s * hw;
        c.drawLine(x + s * 6 * k, L.deckTop - 6 * k, x + s * 16 * k, L.deckTop - 14 * k, paint(C.ink, 1, 2));
        c.drawLine(x + s * 4 * k, L.deckTop - 1, x + s * 13 * k, L.deckTop - 4 * k, paint(C.spark, 1, 1.6));
      }
    }
  }

  // the trolley on the girder; the hoist ropes, the magnet and what it carries swing about the hoist
  const tx = trolleyX(L, pose);
  c.save();
  c.translate(tx, 0);
  c.drawPicture(Y.trolley);
  c.restore();
  const pivotY = L.beamY + 6 * k;
  const magY = L.magUpY + (L.magDownY - L.magUpY) * pose.cable;
  c.save();
  c.rotate(pose.swing + pose.sway, tx, pivotY);
  c.drawLine(tx - 3, pivotY, tx - 3, magY - 12 * k, paint(C.rope, 1, 1.6));
  c.drawLine(tx + 3, pivotY, tx + 3, magY - 12 * k, paint(C.rope, 1, 1.6));
  for (let i = 0; i < pose.plates.length; i++) {
    const p = pose.plates[i];
    if (!p.carried || p.alpha <= 0) continue;
    c.save();
    c.translate(tx, magY + 22 * k + L.plateH);
    if (p.alpha < 1) alphaLayer(c, p.alpha);
    c.drawPicture(Y.plates[i]);
    if (p.alpha < 1) c.restore();
    c.restore();
  }
  c.save();
  c.translate(tx, magY);
  c.drawPicture(Y.magnet);
  if (pose.magnetOn) c.drawPicture(Y.field);
  c.restore();
  c.restore();

  // the cavities: the launder fills them west to east; the bars cool to brass, notched and stamped
  const fillCav = pose.pour * Y.ingot.length;
  if (pose.pour > 0 && pose.pour < 1) {
    const reach = L.lX0 + (L.mR - L.lX0) * Math.min(1, pose.pour * 1.25);
    c.drawRect(Skia.XYWHRect(L.lX0, L.lY - 2 * k, reach - L.lX0, 4 * k), paint(C.launder));
  } else if (pose.pour >= 1 && pose.cool < 2) {
    c.drawRect(Skia.XYWHRect(L.lX0, L.lY - 1.5 * k, L.mR - L.lX0, 3 * k), paint(C.glow, 1 - pose.cool / 2));
  }
  for (let i = 0; i < Y.ingot.length; i++) {
    const f = clamp01(fillCav - i);
    if (f <= 0) continue;
    const since = pose.cool > 0 ? pose.cool + (Y.ingot.length - 1 - i) * 0.2 : 0;
    const colour = pose.cool > 0 ? C.cooling[Math.min(C.cooling.length - 1, Math.round(since * 10))] : C.glowHot;
    c.save();
    c.clipRect(Skia.XYWHRect(L.cavX[i] - 2, L.cavY + L.cavH * (1 - f), L.cavW + 4, L.cavH * f + 2), INTERSECT, true);
    c.drawPath(Y.ingot[i], paint(colour));
    if (since < 2) c.drawPath(Y.ingot[i], paint(C.glowWhite, 0.55 * (1 - since / 2)));
    c.restore();
    if (since > 2.4) {
      alphaLayer(c, (since - 2.4) / 0.6);
      c.drawPicture(Y.notches[i]);
      c.restore();
    }
    if (pose.glint >= 0 && since >= 3) {
      // a glint running west to east along the row
      const gx = L.mL - 20 * k + (L.mR - L.mL + 40 * k) * pose.glint;
      c.save();
      c.clipPath(Y.ingot[i], INTERSECT, true);
      const b = Skia.PathBuilder.Make();
      b.moveTo(gx - 3 * k, L.cavY + L.cavH + 2).lineTo(gx + 1 * k, L.cavY + L.cavH + 2).lineTo(gx + 6 * k, L.cavY - 2).lineTo(gx + 2 * k, L.cavY - 2).close();
      c.drawPath(b.build(), paint(C.glowWhite, 0.8));
      c.restore();
    }
  }

  // the crucible tips on its trunnion; its melt breathes
  const ang = pose.tilt * L.tiltDeg;
  c.save();
  c.translate(L.sX, L.sY);
  c.rotate(ang, 0, 0);
  c.drawPicture(Y.crucible);
  alphaLayer(c, pose.tilt > 0.6 && pose.pour >= 1 ? 0.35 : 0.72 + 0.28 * pose.breathe);
  c.drawPicture(Y.mouth);
  c.restore();
  c.restore();
  c.drawPicture(Y.shaft);
  c.save();
  c.translate(L.hwX, L.hwY);
  c.rotate(pose.tilt * 220, 0, 0);
  c.drawPicture(Y.wheel);
  c.restore();

  // the stream falls straight from the lip into the launder's head
  if (pose.tilt > 0.9 && pose.pour < 1) {
    const a = (ang * Math.PI) / 180;
    const lx = L.sX + Math.cos(a) * L.lip[0] - Math.sin(a) * L.lip[1];
    const ly = L.sY + Math.sin(a) * L.lip[0] + Math.cos(a) * L.lip[1];
    const ey = L.lY;
    const q = (w0: number, w1: number, colour: Float32Array) => {
      const b = Skia.PathBuilder.Make();
      b.moveTo(lx - w0 / 2, ly).lineTo(lx + w0 / 2, ly).lineTo(lx + w1 / 2, ey).lineTo(lx - w1 / 2, ey).close();
      c.drawPath(b.build(), paint(colour));
    };
    const thin = pose.pour > 0.85 ? 1 - (pose.pour - 0.85) / 0.15 : 1;
    q(10 * k * thin, 6 * k * thin, C.glow);
    q(6.5 * k * thin, 3.6 * k * thin, C.glowHot);
    q(2.6 * k * thin, 1.4 * k * thin, C.glowWhite);
    const fr = Math.floor(pose.t * 30);
    for (let i = 0; i < 8; i++) {
      const dx = (hash(i, fr) - 0.5) * 36 * k;
      const dy = -4 - hash(i + 9, fr) * 20 * k;
      c.drawLine(lx + dx * 0.3, ey - 2, lx + dx, ey + dy, paint(i % 2 ? C.spark : C.glowWhite, 1, 1.4));
    }
  }

  // the furnace hand leans back on the handwheel as the crucible tips
  c.save();
  c.translate(-2 * k * pose.tilt, 0);
  c.drawPicture(Y.hand);
  c.restore();

  // the hood over it all, lit from under by the melt
  c.drawPicture(Y.hood);
  alphaLayer(c, 0.3 + 0.3 * pose.breathe + heat * 0.4);
  c.drawPicture(Y.hoodGlow);
  c.restore();
}

/**
 * Draws one frame. The gate parts the picture down the middle like two gate leaves onto whatever is
 * beneath (the yard); with reduced motion it fades instead.
 */
export function composeFrame(c: SkCanvas, Y: LoadingLayers, L: LoadingLayout, pose: LoadingPose, still = false): void {
  'worklet';
  if (pose.gate <= 0) {
    scene(c, Y, L, pose);
    return;
  }
  if (pose.gate >= 1) return;
  const r = Skia.PictureRecorder();
  const rc = r.beginRecording(Skia.XYWHRect(0, 0, L.w, L.h));
  scene(rc, Y, L, pose);
  const pic = r.finishRecordingAsPicture();
  if (still) {
    alphaLayer(c, 1 - pose.gate);
    c.drawPicture(pic);
    c.restore();
    return;
  }
  const half = L.w / 2;
  const off = pose.gate * (half + 12 * L.k);
  const C = Y.colours;
  for (let s = -1; s <= 1; s += 2) {
    c.save();
    c.translate(s * off, 0);
    c.clipRect(Skia.XYWHRect(s < 0 ? 0 : half, 0, half, L.h), INTERSECT, true);
    c.drawPicture(pic);
    // the leaf's steel edge
    const ex = half - (s < 0 ? 5 * L.k : -5 * L.k);
    c.drawLine(ex, 0, ex, L.h, paint(C.galv, 1, 10 * L.k));
    c.drawLine(half, 0, half, L.h, paint(C.galvDark, 1, 2));
    c.restore();
  }
}
