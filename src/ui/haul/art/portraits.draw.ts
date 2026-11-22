/**
 * Portraits ("mach:" icons): nobody has a face in this game. The station AI TALLY is a hex
 * plate with three arc segments; the two human voices are call-sign plates (OPS-2 round with a
 * headset, DISPATCH square with a clipboard) with a waveform; the six
 * buyers are geometric emblems. Every function draws into a square of side `size`, centred on
 * the origin; the animated ones take a phase.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { drawText, textWidth } from './glyphs';
import { SPACE, VOICE, alpha, mix } from './palette';
import { TAU, arc, builder, circle, fill, glow, line, litStroke, ngon, poly, rrect, stroke } from './pen';

/**
 * TALLY: the station AI. A hex plate with three separate arc segments round a lit dot (spec 4.3
 * "3 segments"; second pass: no overlapping blades, no camera-iris motif). `turn` (degrees)
 * rotates the segments: turn them while it speaks.
 */
export function drawTally(c: SkCanvas, size: number, turn = 0): void {
  const k = size / 40;
  c.save();
  c.scale(k, k);
  const plate = rrect(-19, -19, 38, 38, 8);
  c.drawPath(plate, fill(SPACE.panel));
  c.drawPath(plate, stroke(alpha(VOICE.tally, 0.35), 1));
  glow(c, 0, 0, 18, VOICE.tally, 0.3);
  const hex = ngon(0, 0, 15.5, 6, -Math.PI / 2);
  c.drawPath(hex, fill(SPACE.hull1));
  litStroke(c, hex, VOICE.tally, 1.4, 0.7);
  c.save();
  c.rotate(turn, 0, 0);
  for (let i = 0; i < 3; i++) {
    const seg = arc(0, 0, 9.5, -90 + i * 120 + 14, 92);
    c.drawPath(seg, stroke(alpha(VOICE.tally, 0.25), 5.5));
    c.drawPath(seg, stroke(VOICE.tally, 2.6));
  }
  c.restore();
  glow(c, 0, 0, 7, '#FFFFFF', 0.5);
  c.drawCircle(0, 0, 3.4, fill(mix(VOICE.tally, '#FFFFFF', 0.55)));
  c.restore();
}

/** The waveform's five bar heights (0..1) at `phase` (seconds); flat when phase is null. */
export function waveBars(phase: number | null): number[] {
  if (phase == null) return [0.18, 0.18, 0.18, 0.18, 0.18];
  return [0, 1, 2, 3, 4].map((i) => 0.25 + 0.75 * Math.abs(Math.sin(phase * (5 + i * 1.7) + i * 1.3)) * (i === 2 ? 1 : 0.8));
}

/** Plate shapes of the two human voices: OPS-2 round with a headset, DISPATCH square with a clipboard notch. */
export type CallPlate = 'round' | 'square';

/** Below this size (points) a call-sign plate drops its text: shape, headset or clip carry it. */
export const CALL_SIGN_TEXT_MIN = 28;

/**
 * A call-sign plate: the plate shape, the call sign (from 28 pt), a 5-bar waveform. OPS-2's plate
 * is round with a headset arc over the waveform; DISPATCH's is square with a clipboard notch at
 * the top (critique M6: the two differ by shape, not only amber against green). `phase` animates
 * the waveform (null: a quiet, flat waveform).
 */
export function drawCallSign(c: SkCanvas, size: number, sign: string, color: string, phase: number | null = 0.6, shape: CallPlate = 'round'): void {
  const k = size / 40;
  const text = size >= CALL_SIGN_TEXT_MIN;
  c.save();
  c.scale(k, k);
  const plate = shape === 'round' ? circle(0, 0, 19) : poly([-18, -17, -7, -17, -5, -19.5, 5, -19.5, 7, -17, 18, -17, 18, 18, -18, 18]);
  c.drawPath(plate, fill(SPACE.panel));
  litStroke(c, plate, color, text ? 1.4 : 2, 0.7);
  if (shape === 'square') {
    // The clipboard clip at the notch.
    c.drawPath(rrect(-5.5, -19.5, 11, 5, 1.5), fill(color));
    c.drawCircle(0, -17, 1.2, fill(SPACE.panel));
  }
  const waveY = text ? 7 : 3;
  const amp = text ? 14 : 18;
  if (text) {
    const cap = Math.min(6.5, (shape === 'round' ? 26 : 30) / Math.max(1, textWidth(sign, 1)));
    drawText(c, sign, 0, shape === 'round' ? -12.5 : -12, { size: cap, color, align: 'center', weight: Math.max(1, cap * 0.18), glow: 0.4 });
  }
  if (shape === 'round') {
    // Headset: an arc over the waveform with two ear cups.
    const r = text ? 11 : 14;
    const hy = waveY + (text ? 1 : 2);
    c.drawPath(arc(0, hy, r, 200, 140), stroke(color, text ? 1.6 : 2.4));
    for (const sx of [-1, 1]) c.drawPath(rrect(sx * r - 2.6, hy - 3, 5.2, 7.5, 2.4), fill(color));
  }
  const bars = waveBars(phase);
  const n = shape === 'round' ? 4 : 5;
  const step = shape === 'round' ? (text ? 4.6 : 5.2) : 6;
  bars.slice(0, n).forEach((h, i) => {
    const x = (i - (n - 1) / 2) * step;
    const bh = 2 + h * (shape === 'round' ? amp * 0.7 : amp);
    const bw = text ? 3.4 : 3.8;
    c.drawPath(rrect(x - bw / 2, waveY - bh / 2, bw, bh, bw / 2), fill(alpha(color, 0.25)));
    c.drawPath(rrect(x - bw / 2 + 0.6, waveY - bh / 2 + 0.6, bw - 1.2, Math.max(0.5, bh - 1.2), (bw - 1.2) / 2), fill(color));
  });
  c.restore();
}

export const OPS_SIGN = 'OPS-2';
export const DISPATCH_SIGN = 'DISPATCH';

export function drawOps(c: SkCanvas, size: number, phase: number | null = 0.6): void {
  drawCallSign(c, size, OPS_SIGN, VOICE.ops, phase, 'round');
}

export function drawDispatch(c: SkCanvas, size: number, phase: number | null = 1.4): void {
  drawCallSign(c, size, DISPATCH_SIGN, VOICE.dispatch, phase, 'square');
}

// ---------------------------------------------------------------------------
// Buyer emblems
// ---------------------------------------------------------------------------

export type BuyerId = 'halden' | 'corvo' | 'tessaly' | 'brightwater' | 'kade' | 'oriel';
export const BUYERS: { id: BuyerId; name: string; color: string }[] = [
  { id: 'halden', name: 'Halden Yards', color: '#FFB23F' },
  { id: 'corvo', name: 'Corvo Metals', color: '#FF6B6B' },
  { id: 'tessaly', name: 'Tessaly Ice Co.', color: '#7FD4FF' },
  { id: 'brightwater', name: 'Brightwater Foundry', color: '#FFD35C' },
  { id: 'kade', name: 'Kade Refinery', color: '#4BE58E' },
  { id: 'oriel', name: 'Oriel Labs', color: '#C77BFF' },
];

/** A buyer's emblem in a square of `size`. Unknown ids draw a neutral roundel. */
export function drawBuyer(c: SkCanvas, size: number, id: string): void {
  const b = BUYERS.find((x) => x.id === id);
  const col = b?.color ?? SPACE.steel;
  const k = size / 40;
  c.save();
  c.scale(k, k);
  // A shield-cut badge: an octagon roundel.
  const badge = ngon(0, 0, 19, 8, Math.PI / 8);
  c.drawPath(badge, fill(mix(SPACE.panel, col, 0.08)));
  litStroke(c, badge, col, 1.4, 0.6);
  c.drawPath(ngon(0, 0, 16, 8, Math.PI / 8), stroke(alpha(col, 0.25), 0.8));
  const ink = stroke(col, 2.2);
  // Corporate marks built from the game's own geometry (second pass, critique S7), readable at 20 pt.
  switch (id) {
    case 'halden': {
      // Halden Yards: two stacked chevrons in a hexagon.
      c.drawPath(ngon(0, 0, 12.5, 6, -Math.PI / 2), stroke(col, 1.6));
      for (const y of [-1.5, 5.5]) c.drawPath(poly([-7, y + 2.5, 0, y - 4, 7, y + 2.5], false), stroke(col, 3));
      break;
    }
    case 'corvo': {
      // Corvo Metals: a split circle, the halves offset.
      c.drawPath(builder().addArc({ x: -12, y: -11, width: 22, height: 22 }, 90, 180).close().build(), fill(col));
      c.drawPath(builder().addArc({ x: -10, y: -11, width: 22, height: 22 }, -90, 180).close().build(), stroke(col, 2.2));
      break;
    }
    case 'tessaly': {
      // Tessaly Ice Co.: three interlocking rings.
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (TAU * i) / 3;
        c.drawPath(circle(Math.cos(a) * 5, Math.sin(a) * 5 + 0.5, 7), stroke(col, 1.9));
      }
      break;
    }
    case 'brightwater': {
      // Brightwater Foundry: a dot over a wave bar.
      c.drawCircle(0, -5, 4.6, fill(col));
      c.drawPath(poly([-12, 7, -8, 3.5, -4, 7, 0, 3.5, 4, 7, 8, 3.5, 12, 7], false), stroke(col, 2.6));
      c.drawPath(line(-11, 11.5, 11, 11.5), stroke(alpha(col, 0.7), 1.4));
      break;
    }
    case 'kade': {
      // Kade Refinery: a stepped triangle.
      c.drawPath(poly([-13, 10, -13, 5, -8, 5, -8, 0, -3, 0, -3, -5, 2, -5, 2, -10, 7, -10, 13, 10]), fill(alpha(col, 0.35)));
      c.drawPath(poly([-13, 10, -13, 5, -8, 5, -8, 0, -3, 0, -3, -5, 2, -5, 2, -10, 7, -10, 13, 10]), stroke(col, 1.8));
      break;
    }
    case 'oriel': {
      // Oriel Labs: three moons on one orbit (not a ringed planet: that is Dark Matter's mark).
      c.drawPath(circle(0, 0, 9.5), stroke(alpha(col, 0.6), 1.2));
      c.drawCircle(0, -9.5, 3.6, fill(col));
      c.drawCircle(8.2, 4.8, 2.7, fill(col));
      c.drawCircle(-8.2, 4.8, 2, fill(col));
      c.drawCircle(0, 0, 1.6, fill(mix(col, '#FFFFFF', 0.5)));
      break;
    }
    default:
      c.drawPath(circle(0, 0, 8), ink);
  }
  c.restore();
}
