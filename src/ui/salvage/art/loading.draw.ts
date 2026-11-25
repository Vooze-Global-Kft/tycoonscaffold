/**
 * The loading animation (yard-design.md 11, yard-style.md "Loading"): a crawler crane's lattice jib
 * luffs in with an electromagnet; three steel plates cut with the title's words in stencil are lowered
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
import { YARD, coolingColour, shade } from './palette';
import { sevenSeg, stencil, stencilWidth } from './letters';
import { builder, circle, fill, hazard, linear, oval, poly, radial, rect, rrect, segment, stroke } from './pen';

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
  /** Where the jib points: -1 parked (raised), 0..2 over plate i (fractional while it luffs between). */
  aim: number;
  /** Magnet lowered by this many points below the jib tip (cable length). */
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

/** The jib's raised angle, degrees; its working angles come from where the plates land (drawLoading). */
const JIB_PARKED = 74;

export function loadingPose(t: number): LoadingPose {
  'worklet';
  const P = LOADING_T;
  const plates: PlatePose[] = [];
  let aim = -1;
  let cable = 40;
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
      cable = 40 + down * 150;
      magnetOn = k < 0.85;
      plates.push({ drop: down, shake: 0, carried: k < 0.85 });
      kg += PLATE_KG[i] * ease((k - 0.6) / 0.4);
    } else {
      const since = t - b;
      plates.push({ drop: 1, shake: since < 0.08 ? 2 * Math.sin(since * 120) : 0, carried: false });
      kg += PLATE_KG[i];
    }
    if (k >= 0.85 && k < 1) {
      cable = 190 - ease((k - 0.85) / 0.15) * 150;
    }
  }
  if (t >= P.plates[2][1]) {
    // the jib lifts away to clear the stage
    aim = 2 - 3 * ease((t - P.plates[2][1]) / 0.5);
    cable = 40;
  }
  const tilt = t < P.tip[0] ? 0 : t < P.cool[0] ? ease((t - P.tip[0]) / (P.tip[1] - P.tip[0])) : 1 - ease((t - P.cool[0]) / 0.25);
  const pour = clamp01((t - P.pour[0]) / (P.pour[1] - P.pour[0]));
  const cool = Math.max(0, t - P.pour[1]) * 10; // the bar cools in 0.3 s on this screen (the game's 3 s, quickened)
  const gate = ease((t - P.gate[0]) / (P.gate[1] - P.gate[0]));
  return { t, aim, cable, magnetOn, plates, kg: Math.round(kg), tilt, pour, cool, gate };
}

// ---------------------------------------------------------------------------

const INK = YARD.ink;

function lattice(c: SkCanvas, x0: number, y0: number, x1: number, y1: number, wd: number): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const L = Math.hypot(dx, dy);
  const ux = dx / L;
  const uy = dy / L;
  const nx = -uy * wd;
  const ny = ux * wd;
  const taper = (s: number) => 1 - s * 0.45;
  const A = (s: number, side: number): [number, number] => [x0 + ux * L * s + nx * side * taper(s), y0 + uy * L * s + ny * side * taper(s)];
  const steps = 14;
  const lace = builder();
  for (let i = 0; i < steps; i++) {
    const p = A(i / steps, i % 2 ? 1 : -1);
    const q = A((i + 1) / steps, i % 2 ? -1 : 1);
    lace.moveTo(p[0], p[1]).lineTo(q[0], q[1]);
  }
  c.drawPath(lace.build(), stroke(INK, 4.4));
  c.drawPath(builder().moveTo(...A(0, 1)).lineTo(...A(1, 1)).moveTo(...A(0, -1)).lineTo(...A(1, -1)).build(), stroke(INK, 6.4));
  const col = stroke(YARD.hivis, 2.4);
  c.drawPath(lace.build(), col);
  c.drawPath(builder().moveTo(...A(0, 1)).lineTo(...A(1, 1)).moveTo(...A(0, -1)).lineTo(...A(1, -1)).build(), stroke(YARD.hivis, 3.8));
}

/** A steel plate with its word cut through in stencil (the cut shows what is behind). */
function plate(c: SkCanvas, word: string, cx: number, bottom: number, size: number, behind: string): { w: number; h: number } {
  const tw = stencilWidth(word, size, 3);
  const w = tw + size * 0.9;
  const h = size * 1.75;
  const x = cx - w / 2;
  const y = bottom - h;
  c.drawPath(rrect(x + 4, y + 5, w, h, 5), fill(INK, 0.25));
  c.drawPath(rrect(x, y, w, h, 5), linear(x, y, x, y + h, [shade(YARD.steel, 0.25), YARD.steel, shade(YARD.steel, -0.15)]));
  // rust bloom at a corner and a mill-scale streak
  c.drawPath(oval(x + w * 0.85, y + h * 0.8, w * 0.12, h * 0.16), fill(YARD.rust, 0.5));
  c.drawPath(segment(x + 8, y + 7, x + w * 0.4, y + 7), stroke(shade(YARD.steel, 0.4), 2.4, 0.8));
  c.drawPath(rrect(x, y, w, h, 5), stroke(INK, 2.4));
  // the cut letters: a dark kerf line then the see-through fill
  stencil(c, word, cx + 1.5, y + (h - size) / 2 + 2, size, INK, { align: 'center', track: 3 });
  stencil(c, word, cx, y + (h - size) / 2, size, behind, { align: 'center', track: 3 });
  // the lifting lug
  c.drawPath(rrect(cx - 7, y - 9, 14, 11, 4), fill(YARD.steelDark));
  c.drawPath(rrect(cx - 7, y - 9, 14, 11, 4), stroke(INK, 1.6));
  return { w, h };
}

/**
 * One frame of the loading screen at w x h points. `title` is the three plates' words (the title
 * waits for the names register: "SCRAP", "TO", "INGOT").
 */
export function drawLoading(c: SkCanvas, w: number, h: number, pose: LoadingPose, title: [string, string, string] = ['SCRAP', 'TO', 'INGOT']): void {
  const k = Math.min(w / 844, h / 390);
  const ground = h * 0.78;
  // sky and a far yard in daylight haze (never dusk, never dust)
  c.drawRect({ x: 0, y: 0, width: w, height: ground }, linear(0, 0, 0, ground, [YARD.sky, YARD.skyLow]));
  for (const [cx, cy, r] of [[w * 0.42, h * 0.16, 26], [w * 0.7, h * 0.1, 20]] as const) {
    const cloud = builder().addCircle(cx, cy, r * k).addCircle(cx + r * 1.1 * k, cy + 4 * k, r * 0.8 * k).addCircle(cx - r * 1.1 * k, cy + 6 * k, r * 0.7 * k).addRRect({ rect: { x: cx - r * 1.8 * k, y: cy + 2 * k, width: r * 3.6 * k, height: r * 0.8 * k }, rx: r * 0.4 * k, ry: r * 0.4 * k }).build();
    c.drawPath(cloud, fill('#FFFFFF', 0.85));
  }
  const far = shade(YARD.skyLow, -0.1);
  for (let i = 0; i < 9; i++) {
    const bx = (i / 9) * w + ((i * 37) % 23);
    const bh = 22 + ((i * 53) % 4) * 10;
    c.drawRect({ x: bx, y: ground - bh, width: w / 9 - 6, height: bh }, fill(far));
  }
  c.drawPath(poly([w * 0.62, ground - 40, w * 0.64, ground - 96, w * 0.98, ground - 96, w * 0.98, ground - 88, w * 0.655, ground - 88, w * 0.64, ground - 40]), fill(far));
  // the ground: concrete with its joints
  c.drawRect({ x: 0, y: ground, width: w, height: h - ground }, fill(YARD.concrete));
  for (let x = 0; x < w; x += 120 * k) c.drawPath(segment(x, ground, x - 40 * k, h), stroke(YARD.joint, 1.2));
  c.drawPath(segment(0, ground + 0.5, w, ground + 0.5), stroke(YARD.joint, 1.4));

  // the weighbridge deck across the middle, the display on its post at the right
  const deckL = w * 0.25;
  const deckR = w * 0.78;
  const deckY = ground + 6 * k;
  c.drawPath(rect(deckL, deckY, deckR - deckL, 10 * k), fill(YARD.galvanised));
  for (const [a, b] of [[deckL, deckL + 22 * k], [deckR - 22 * k, deckR]]) hazard(c, rect(a, deckY, b - a, 10 * k), 5, 0);
  c.drawPath(rect(deckL, deckY, deckR - deckL, 10 * k), stroke(INK, 1.6));
  const dX = w * 0.9;
  c.drawPath(rect(dX - 3 * k, ground - 150 * k, 6 * k, 150 * k + 8), fill(YARD.galvanised));
  c.drawPath(rect(dX - 3 * k, ground - 150 * k, 6 * k, 150 * k + 8), stroke(INK, 1.4));
  const bw = 132 * k;
  const bh = 50 * k;
  const by = ground - 205 * k;
  c.drawPath(rrect(dX - bw / 2 + 3, by + 4, bw, bh, 7), fill(INK, 0.25));
  c.drawPath(rrect(dX - bw / 2, by, bw, bh, 7), fill(YARD.hivis));
  c.drawPath(rrect(dX - bw / 2, by, bw, bh, 7), stroke(INK, 2));
  c.drawPath(rrect(dX - bw / 2 + 7, by + 7, bw - 14, bh - 14, 4), fill(YARD.ledCase));
  sevenSeg(c, groupKg(pose.kg), dX + bw / 2 - 16 * k, by + 12 * k, 26 * k, YARD.led, YARD.ledOff);

  // the plates: landed ones stand on the deck; the carried one hangs under the magnet
  const size = 54 * k;
  const gapX = 14 * k;
  const widths = title.map((t) => stencilWidth(t, size, 3) + size * 0.9);
  const total = widths.reduce((a, b) => a + b, 0) + gapX * 2;
  const rowL = (deckL + deckR) / 2 - total / 2;
  const centres = widths.map((pw, i) => rowL + widths.slice(0, i).reduce((a, b) => a + b, 0) + gapX * i + pw / 2);

  // the crane body at the left: tracks, house, cab, counterweight
  const pivot: [number, number] = [w * 0.12, ground - 70 * k];
  // the jib reaches the farthest plate at 22 degrees; the other angles follow from it
  const jibLen = (centres[2] - pivot[0]) / Math.cos((22 * Math.PI) / 180);
  const angleFor = (i: number) => (Math.acos(Math.min(1, (centres[i] - pivot[0]) / jibLen)) * 180) / Math.PI;
  const angAt = (a: number): number => {
    if (a <= -1) return JIB_PARKED;
    if (a < 0) return JIB_PARKED + (angleFor(0) - JIB_PARKED) * (a + 1);
    const i = Math.min(1, Math.floor(a));
    const f = a - i;
    return angleFor(i) + (angleFor(Math.min(2, i + 1)) - angleFor(i)) * f;
  };
  const ja = (angAt(pose.aim) * Math.PI) / 180;
  const tip: [number, number] = [pivot[0] + Math.cos(ja) * jibLen, pivot[1] - Math.sin(ja) * jibLen];
  lattice(c, pivot[0], pivot[1], tip[0], tip[1], 11 * k);
  // pendant ropes from the A-frame to the tip
  c.drawPath(segment(pivot[0] - 28 * k, pivot[1] - 60 * k, tip[0], tip[1]), stroke(INK, 1.4));
  c.drawPath(rrect(w * 0.02, ground - 26 * k, w * 0.2, 30 * k, 14 * k), fill(YARD.tyre));
  for (let i = 0; i < 6; i++) c.drawPath(circle(w * 0.035 + i * w * 0.034, ground - 11 * k, 8 * k), fill(YARD.steelDark));
  c.drawPath(rrect(w * 0.02, ground - 26 * k, w * 0.2, 30 * k, 14 * k), stroke(INK, 2));
  c.drawPath(rrect(w * 0.03, ground - 82 * k, w * 0.16, 58 * k, 6), fill(YARD.hivis));
  c.drawPath(rrect(w * 0.03, ground - 82 * k, w * 0.16, 58 * k, 6), stroke(INK, 2));
  c.drawPath(rrect(w * 0.12, ground - 116 * k, w * 0.065, 46 * k, 5), fill(YARD.cab));
  c.drawPath(rrect(w * 0.128, ground - 110 * k, w * 0.048, 26 * k, 3), fill(YARD.glassDark));
  c.drawPath(rrect(w * 0.12, ground - 116 * k, w * 0.065, 46 * k, 5), stroke(INK, 2));
  hazard(c, rect(w * 0.03, ground - 50 * k, w * 0.06, 14 * k), 5, 1.4);
  c.drawPath(poly([pivot[0] - 40 * k, pivot[1] + 8, pivot[0] - 28 * k, pivot[1] - 60 * k, pivot[0] - 16 * k, pivot[1] + 8], false), stroke(INK, 3));
  c.drawPath(circle(pivot[0], pivot[1], 6 * k), fill(INK));

  // the hoist rope and the electromagnet
  const mY = tip[1] + pose.cable * k;
  c.drawPath(segment(tip[0], tip[1], tip[0], mY - 12 * k), stroke(INK, 2));
  const mw = 46 * k;
  c.drawPath(segment(tip[0] - mw * 0.6, mY - 2, tip[0], mY - 14 * k), stroke(INK, 1.6));
  c.drawPath(segment(tip[0] + mw * 0.6, mY - 2, tip[0], mY - 14 * k), stroke(INK, 1.6));
  c.drawPath(rrect(tip[0] - mw, mY - 2, mw * 2, 16 * k, 6), fill(YARD.steelDark));
  c.drawPath(rect(tip[0] - mw, mY + 10 * k, mw * 2, 5 * k), fill(YARD.hivis));
  c.drawPath(rrect(tip[0] - mw, mY - 2, mw * 2, 16 * k, 6), stroke(INK, 2));
  if (pose.magnetOn) for (let i = 0; i < 2; i++) c.drawPath(builder().addArc({ x: tip[0] - mw - 10 - i * 8, y: mY - 12 - i * 6, width: (mw + 10 + i * 8) * 2, height: 34 + i * 12 }, 200, 140).build(), stroke(YARD.stampBlue, 1.6, 0.55));

  const top = deckY - 1;
  pose.plates.forEach((p, i) => {
    if (p.drop === 0 && !p.carried) return;
    if (p.carried) {
      plate(c, title[i], tip[0], mY + 26 * k + 9, size, YARD.sky);
    } else {
      c.save();
      c.translate(0, -p.shake);
      plate(c, title[i], centres[i], top, size, YARD.sky);
      c.restore();
      if (p.shake !== 0) for (const sx of [-1, 1]) c.drawPath(segment(centres[i] + sx * (widths[i] / 2 + 6), top - 6, centres[i] + sx * (widths[i] / 2 + 16), top - 14), stroke(INK, 2));
    }
  });

  // the mould under the title (in front of the deck) and the crucible at the right, tipping left
  const mL = w * 0.33;
  const mR = w * 0.7;
  const mY0 = ground + 36 * k;
  c.drawPath(poly([mL - 8, mY0, mR + 8, mY0, mR + 16, mY0 + 30 * k, mL - 16, mY0 + 30 * k]), fill(YARD.castIron));
  c.drawPath(poly([mL - 8, mY0, mR + 8, mY0, mR + 16, mY0 + 30 * k, mL - 16, mY0 + 30 * k]), stroke(INK, 2));
  c.drawPath(rrect(mL, mY0 + 6 * k, mR - mL, 14 * k, 5), fill(shade(YARD.castIron, -0.5)));
  if (pose.pour > 0) {
    const fillTo = mR - (mR - mL) * pose.pour;
    const col = pose.cool > 0 ? coolingColour('brass', pose.cool) : YARD.glowHot;
    c.drawPath(rrect(fillTo, mY0 + 7 * k, mR - fillTo, 12 * k, 4), fill(col));
    if (pose.cool < 3) c.drawPath(rrect(fillTo, mY0 + 7 * k, mR - fillTo, 12 * k, 4), linear(fillTo, 0, mR, 0, ['rgba(255,246,216,0.9)', 'rgba(255,246,216,0)'], [0, 1]));
    if (pose.cool >= 3) {
      c.drawPath(segment(mL + 20 * k, mY0 + 10 * k, mL + 90 * k, mY0 + 10 * k), stroke(YARD.brassLight, 2));
      const gx = mL + 60 * k;
      const gy = mY0 + 12 * k;
      c.drawPath(poly([gx, gy - 9, gx + 2.2, gy - 2.2, gx + 9, gy, gx + 2.2, gy + 2.2, gx, gy + 9, gx - 2.2, gy + 2.2, gx - 9, gy, gx - 2.2, gy - 2.2]), fill('#FFFFFF'));
    }
  }
  c.drawPath(rrect(mL, mY0 + 6 * k, mR - mL, 14 * k, 5), stroke(INK, 1.6));
  // crucible on a stand at the right of the mould
  const cX = w * 0.8;
  const cY = ground + 10 * k;
  c.drawPath(rect(cX - 30 * k, cY - 20 * k, 6 * k, 60 * k), fill(YARD.machineDark));
  c.drawPath(rect(cX + 24 * k, cY - 20 * k, 6 * k, 60 * k), fill(YARD.machineDark));
  c.save();
  c.translate(cX, cY - 20 * k);
  c.rotate(-pose.tilt * 75, 0, 0);
  const R = 26 * k;
  const body = builder().moveTo(-R, -34 * k).lineTo(-R * 0.85, 24 * k).quadTo(0, 34 * k, R * 0.85, 24 * k).lineTo(R, -34 * k).close().build();
  c.drawPath(body, linear(-R, 0, R, 0, [shade(YARD.steel, 0.15), YARD.steelDark]));
  c.drawPath(rect(-R + 2, -12 * k, R * 2 - 4, 7 * k), fill(YARD.hivisDark));
  c.drawPath(body, stroke(INK, 2));
  c.drawPath(oval(0, -34 * k, R, 8 * k), fill(YARD.refractory));
  c.drawPath(oval(0, -34 * k, R * 0.75, 5.5 * k), radial(0, -34 * k, R, [YARD.glowWhite, YARD.glowHot, YARD.glow]));
  c.drawPath(oval(0, -34 * k, R, 8 * k), stroke(INK, 2));
  c.restore();
  if (pose.tilt > 0.7 && pose.pour < 1) {
    const a = (-pose.tilt * 75 * Math.PI) / 180;
    const lx = cX + Math.cos(a) * -R - Math.sin(a) * (-34 * k) - 20 * k;
    const ly = cY - 20 * k + Math.sin(a) * -R + Math.cos(a) * (-34 * k);
    const tx = mR - (mR - mL) * pose.pour + 6;
    const s = builder().moveTo(lx, ly).cubicTo(lx - 14 * k, ly + 4, tx + 10, ly + 20 * k, tx, mY0 + 12 * k).build();
    c.drawPath(s, stroke(YARD.glow, 9 * k));
    c.drawPath(s, stroke(YARD.glowHot, 5 * k));
    c.drawPath(s, stroke(YARD.glowWhite, 2 * k));
    c.drawPath(oval(tx, mY0 + 12 * k, 22 * k, 8 * k), radial(tx, mY0 + 12 * k, 24 * k, ['rgba(255,246,216,0.8)', 'rgba(255,211,107,0)']));
  }

  // the gate (pose.gate) is not drawn here: the screen slides two clipped halves of this picture apart
  // onto the yard (yard-style.md "Loading").
}
