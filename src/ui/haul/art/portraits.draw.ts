/**
 * Portraits ("mach:" icons): nobody has a face in this game. The station AI TALLY is a hex
 * aperture glyph; the two human voices are call-sign plates with a 5-bar waveform; the six
 * buyers are geometric emblems. Every function draws into a square of side `size`, centred on
 * the origin; the animated ones take a phase.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { drawText, textWidth } from './glyphs';
import { SPACE, VOICE, alpha, mix } from './palette';
import { TAU, arc, circle, fill, glow, line, litStroke, ngon, part, poly, rrect, stroke } from './pen';

/**
 * TALLY: a hex aperture of three segments round a lit core. `turn` (degrees) rotates the
 * segments: turn them while it speaks.
 */
export function drawTally(c: SkCanvas, size: number, turn = 0): void {
  const k = size / 40;
  c.save();
  c.scale(k, k);
  const plate = rrect(-19, -19, 38, 38, 8);
  c.drawPath(plate, fill(SPACE.panel));
  c.drawPath(plate, stroke(alpha(VOICE.tally, 0.35), 1));
  glow(c, 0, 0, 18, VOICE.tally, 0.35);
  const hex = ngon(0, 0, 15, 6, -Math.PI / 2);
  c.drawPath(hex, fill(SPACE.hull1));
  litStroke(c, hex, VOICE.tally, 1.5, 0.8);
  c.save();
  c.rotate(turn, 0, 0);
  for (let i = 0; i < 3; i++) {
    const a0 = (TAU * i) / 3;
    // A blade of the aperture: a wedge from the rim inward, leaving the core open.
    const pts: number[] = [];
    for (const [r, a] of [
      [12, a0],
      [12, a0 + 1.7],
      [5.5, a0 + 1.1],
      [5.5, a0 + 0.1],
    ] as const)
      pts.push(Math.cos(a) * r, Math.sin(a) * r);
    const blade = poly(pts);
    c.drawPath(blade, fill(mix(SPACE.hull2, VOICE.tally, 0.3)));
    c.drawPath(blade, stroke(VOICE.tally, 1));
  }
  c.restore();
  c.drawCircle(0, 0, 4, fill(mix(VOICE.tally, '#FFFFFF', 0.5)));
  glow(c, 0, 0, 7, '#FFFFFF', 0.5);
  c.restore();
}

/** The waveform's five bar heights (0..1) at `phase` (seconds); flat when phase is null. */
export function waveBars(phase: number | null): number[] {
  if (phase == null) return [0.18, 0.18, 0.18, 0.18, 0.18];
  return [0, 1, 2, 3, 4].map((i) => 0.25 + 0.75 * Math.abs(Math.sin(phase * (5 + i * 1.7) + i * 1.3)) * (i === 2 ? 1 : 0.8));
}

/**
 * A call-sign plate: rounded rectangle, the call sign, a 5-bar waveform. `phase` animates the
 * waveform (null: a quiet, flat waveform).
 */
export function drawCallSign(c: SkCanvas, size: number, sign: string, color: string, phase: number | null = 0.6): void {
  const k = size / 40;
  c.save();
  c.scale(k, k);
  const plate = rrect(-19, -19, 38, 38, 8);
  c.drawPath(plate, fill(SPACE.panel));
  litStroke(c, plate, color, 1.4, 0.7);
  // Call sign across the top, fitted to the plate.
  const cap = Math.min(7, 32 / Math.max(1, textWidth(sign, 1)));
  drawText(c, sign, 0, -14, { size: cap, color, align: 'center', weight: Math.max(1, cap * 0.18), glow: 0.4 });
  // A divider and the waveform.
  c.drawPath(line(-14, -3, 14, -3), stroke(alpha(color, 0.3), 0.8));
  const bars = waveBars(phase);
  bars.forEach((h, i) => {
    const x = -12 + i * 6;
    const bh = 2 + h * 16;
    const bar = rrect(x - 1.8, 7 - bh / 2, 3.6, bh, 1.8);
    c.drawPath(bar, fill(alpha(color, 0.25)));
    c.drawPath(rrect(x - 1.2, 7 - bh / 2 + 0.6, 2.4, bh - 1.2, 1.2), fill(color));
  });
  c.restore();
}

export const OPS_SIGN = 'OPS-2';
export const DISPATCH_SIGN = 'DISPATCH';

export function drawOps(c: SkCanvas, size: number, phase: number | null = 0.6): void {
  drawCallSign(c, size, OPS_SIGN, VOICE.ops, phase);
}

export function drawDispatch(c: SkCanvas, size: number, phase: number | null = 1.4): void {
  drawCallSign(c, size, DISPATCH_SIGN, VOICE.dispatch, phase);
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
  switch (id) {
    case 'halden': {
      // Yards: a gantry crane over a stack.
      c.drawPath(poly([-10, 9, -10, -8, 10, -8], false), ink);
      c.drawPath(line(4, -8, 4, -2), stroke(col, 1.2));
      part(c, rrect(-2, -2, 10, 6, 1), alpha(col, 0.3), col, 1.2, 0);
      c.drawPath(line(-13, 10, 13, 10), ink);
      break;
    }
    case 'corvo': {
      // Metals: three stacked ingots in a wedge.
      for (const [y, w] of [
        [6, 20],
        [0, 14],
        [-6, 8],
      ] as const)
        part(c, poly([-w / 2, y + 2.5, -w / 2 + 2, y - 2.5, w / 2 - 2, y - 2.5, w / 2, y + 2.5]), alpha(col, 0.35), col, 1.2, 0);
      break;
    }
    case 'tessaly': {
      // Ice: a six-armed crystal.
      for (let i = 0; i < 6; i++) {
        const a = (TAU * i) / 6;
        const x = Math.cos(a) * 11;
        const y = Math.sin(a) * 11;
        c.drawPath(line(0, 0, x, y), ink);
        c.drawPath(line(x * 0.6, y * 0.6, x * 0.6 + Math.cos(a + 0.9) * 3.5, y * 0.6 + Math.sin(a + 0.9) * 3.5), stroke(col, 1.3));
        c.drawPath(line(x * 0.6, y * 0.6, x * 0.6 + Math.cos(a - 0.9) * 3.5, y * 0.6 + Math.sin(a - 0.9) * 3.5), stroke(col, 1.3));
      }
      break;
    }
    case 'brightwater': {
      // Foundry: a half sun over waves.
      c.drawPath(arc(0, 2, 8, 180, 180), ink);
      for (let i = 0; i < 5; i++) {
        const a = Math.PI + (Math.PI * (i + 0.5)) / 5;
        c.drawPath(line(Math.cos(a) * 10.5, 2 + Math.sin(a) * 10.5, Math.cos(a) * 13.5, 2 + Math.sin(a) * 13.5), stroke(col, 1.4));
      }
      for (const y of [6, 10]) c.drawPath(poly([-12, y, -8, y - 2, -4, y, 0, y - 2, 4, y, 8, y - 2, 12, y], false), stroke(col, 1.4));
      break;
    }
    case 'kade': {
      // Refinery: a flask with a level line.
      const flask = poly([-3, -12, 3, -12, 3, -4, 11, 10, -11, 10, -3, -4]);
      c.drawPath(flask, stroke(col, 1.8));
      c.drawPath(poly([-7, 3, 7, 3, 11, 10, -11, 10]), fill(alpha(col, 0.55)));
      c.drawPath(line(-5, -12, 5, -12), ink);
      break;
    }
    case 'oriel': {
      // Labs: a dot in a tilted orbit.
      c.save();
      c.rotate(-25, 0, 0);
      c.drawOval({ x: -13, y: -5.5, width: 26, height: 11 }, stroke(col, 1.6));
      c.restore();
      c.drawCircle(0, 0, 4, fill(col));
      c.drawCircle(9.5, -6.5, 1.8, fill(mix(col, '#FFFFFF', 0.5)));
      break;
    }
    default:
      c.drawPath(circle(0, 0, 8), ink);
  }
  c.restore();
}
