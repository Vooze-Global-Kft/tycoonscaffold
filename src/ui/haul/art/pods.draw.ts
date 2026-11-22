/**
 * Salvage pods for the Salvage Bay: the Scrap Pod (engine tier "wood") and the Derelict Cache
 * ("silver"). Drawn front-on, centred, about 64 x 44 pt (Scrap) and 60 x 52 pt (Derelict).
 * Opening: `cut` 0..1 traces the laser along the seam, `split` 0..1 pulls the halves apart.
 */
import type { SkCanvas, SkPath } from '@shopify/react-native-skia';
import { SPACE, alpha, mix } from './palette';
import { LINE, arc, circle, fill, glow, lamp, light, line, part, poly, rrect, stroke } from './pen';

export type PodTier = 'scrap' | 'derelict';
export const POD_TIERS: PodTier[] = ['scrap', 'derelict'];

/** The engine's chest tier ids (meta.chests) mapped to this game's pods. */
export const POD_FOR_CHEST_TIER: Record<string, PodTier> = { wood: 'scrap', silver: 'derelict' };

export interface PodOptions {
  /** Laser trace along the seam, 0..1. */
  cut?: number;
  /** Halves apart, 0..1 (about 14 pt at 1). */
  split?: number;
  /** What glows inside when split (rarity colour of the best item). */
  inner?: string;
}

const SCRAP_HULL = '#3A3F4C';
const SCRAP_LINE = '#C9D3E2';

function scrapHalf(c: SkCanvas, top: boolean): void {
  const s = top ? -1 : 1;
  // A capsule, flat at the seam (y = 0).
  const b = poly([-30, 0, -30, s * 12, -26, s * 20, 26, s * 20, 30, s * 12, 30, 0]);
  part(c, b, SCRAP_HULL, SCRAP_LINE, LINE, 0.4);
  // Plates and rivets.
  c.drawPath(line(-12, 0, -12, s * 20), stroke(alpha(SCRAP_LINE, 0.35), 0.8));
  c.drawPath(line(12, 0, 12, s * 20), stroke(alpha(SCRAP_LINE, 0.35), 0.8));
  for (const x of [-24, -18, 18, 24]) c.drawCircle(x, s * 4, 0.9, fill(alpha(SCRAP_LINE, 0.6)));
  if (top) {
    // Hazard band and a stencilled tag plate.
    for (let i = 0; i < 6; i++) c.drawPath(line(-10 + i * 4, -16, -8 + i * 4, -12), stroke(SPACE.amber, 1.6));
    c.drawPath(rrect(-10, -17, 20, 6, 1), stroke(alpha(SPACE.amber, 0.6), 0.8));
  } else {
    // Handle bars.
    c.drawPath(rrect(-22, 12, 8, 4, 2), stroke(SPACE.steel, 1.2));
    c.drawPath(rrect(14, 12, 8, 4, 2), stroke(SPACE.steel, 1.2));
    lamp(c, 0, 13, 1.3, SPACE.amber, 4);
  }
}

const DER_HULL = '#1B1636';
const DER_LINE = '#B79BFF';

function derelictHalf(c: SkCanvas, top: boolean): void {
  const s = top ? -1 : 1;
  // A hexagonal cache: each half is a trapezoid.
  const b = poly([-30, 0, -18, s * 25, 18, s * 25, 30, 0]);
  part(c, b, DER_HULL, DER_LINE, LINE, 0.8);
  const inner = poly([-21, s * 3, -13, s * 19, 13, s * 19, 21, s * 3]);
  c.drawPath(inner, stroke(alpha(DER_LINE, 0.4), 0.8));
  // Old, unknown markings: dot-and-bar clusters and a broken circle (no letter shapes).
  const ink = alpha(SPACE.core, 0.8);
  for (let i = 0; i < 3; i++) {
    const x = -9 + i * 9;
    const y = s * (9 + (i % 2) * 3);
    c.drawCircle(x - 2, y, 0.9, fill(ink));
    c.drawPath(line(x, y - 1.6, x, y + 1.6), stroke(ink, 1.1));
    if (i !== 1) c.drawCircle(x + 2, y, 0.9, fill(ink));
  }
  if (!top) lamp(c, 0, 21, 1.3, SPACE.dm, 5);
  else c.drawPath(arc(0, -15, 3, 40, 280), stroke(alpha(SPACE.core, 0.7), 1));
}

function seamPath(tier: PodTier): SkPath {
  return tier === 'scrap' ? line(-30, 0, 30, 0) : line(-30, 0, 30, 0);
}

/** Draws a pod, closed or opening. */
export function drawPod(c: SkCanvas, tier: PodTier, o: PodOptions = {}): void {
  const split = Math.max(0, Math.min(1, o.split ?? 0));
  const cut = Math.max(0, Math.min(1, o.cut ?? 0));
  const d = split * 14;
  const tone = tier === 'scrap' ? SPACE.amber : SPACE.dm;
  glow(c, 0, 0, 44, tone, tier === 'scrap' ? 0.08 : 0.18);
  if (split > 0) {
    // Light from inside.
    const inner = o.inner ?? (tier === 'scrap' ? SPACE.gold : SPACE.dm);
    glow(c, 0, 0, 24 + 20 * split, inner, 0.7 * split);
    c.drawRect({ x: -26, y: -d, width: 52, height: d * 2 }, fill(alpha(mix(inner, '#FFFFFF', 0.5), 0.5 * split)));
  }
  for (const top of [true, false]) {
    c.save();
    c.translate(0, top ? -d : d);
    if (tier === 'scrap') scrapHalf(c, top);
    else derelictHalf(c, top);
    c.restore();
  }
  if (split === 0) {
    // The seam: dark, then traced by the laser.
    c.drawPath(seamPath(tier), stroke(alpha('#000000', 0.6), 1.4));
    if (cut > 0) {
      const x = -30 + 60 * cut;
      const lit = line(-30, 0, x, 0);
      c.drawPath(lit, stroke(alpha(SPACE.red, 0.3), 4));
      c.drawPath(lit, stroke('#FFD0D0', 1.2));
      glow(c, x, 0, 7, SPACE.red, 0.9);
      c.drawCircle(x, 0, 1.4, fill('#FFFFFF'));
    }
  }
}

/**
 * The rarity light of the Salvage Bay reveal (spec 4.6 "the contents rise with their rarity
 * light"): a column of light rising out of an opened pod, origin at the pod centre. `k` 0..1 is
 * the rise (about 0.6 s); `color` the best item's rarity colour (RARITY in palette.ts). Additive:
 * draw it over the split pod.
 */
export function drawRarityLight(c: SkCanvas, color: string, k: number): void {
  const t = Math.max(0, Math.min(1, k));
  const h = 20 + 70 * t;
  const w = 18 + 10 * t;
  glow(c, 0, -4, 30 + 20 * t, color, 0.35 * (0.4 + 0.6 * t));
  c.drawPath(poly([-w / 2, 0, w / 2, 0, w * 0.3, -h, -w * 0.3, -h]), light(alpha(color, 0.18)));
  c.drawPath(poly([-w / 4, 0, w / 4, 0, w * 0.12, -h * 0.9, -w * 0.12, -h * 0.9]), light(alpha(color, 0.3)));
  c.drawPath(line(0, -2, 0, -h * 0.8), stroke(alpha('#FFFFFF', 0.5 * t), 1));
  // Motes rising in the column.
  for (let i = 0; i < 5; i++) {
    const y = -((i * 17 + t * 60) % h);
    const x = Math.sin(i * 2.3) * w * 0.25;
    c.drawCircle(x, y, 0.9, fill(alpha('#FFFFFF', 0.7 * t)));
  }
}
