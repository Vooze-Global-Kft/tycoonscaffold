/**
 * Orbit Haulers app icon: the hauler drone, enlarged and simplified from
 * src/ui/haul/art/drone.draw.ts (same hex body, twin pods, ore core, sensor eye, cyan flames), on
 * deep space with one big supporting shape. Pure Skia: require() it inside scripts/art/headless.ts.
 *
 * Everything draws into a 1024 x 1024 square (points = pixels at scale 1).
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { SPACE, ORE, alpha, mix } from '../../../src/ui/haul/art/palette';
import { builder, clip, circle, fill, glow, glowPaint, light, linearPaint, ngon, poly, rrect, stroke, arc, line, TAU, DEG } from '../../../src/ui/haul/art/pen';
import { oreShapePath } from '../../../src/ui/haul/art/ore.draw';

export const S = 1024;
const HULL_OUTLINE = '#DDF3FF';
/** The warm accent: iron ore (the first ore a player hauls). */
export const WARM = ORE.iron;

export type HaulBackdrop = 'ring' | 'rock' | 'halo';

export interface HaulIconOptions {
  backdrop: HaulBackdrop;
  /** Draw the space background (false for the adaptive and splash layers). */
  space?: boolean;
  /** Drone centre, heading (degrees, 0 = +x) and size (pixels per drone unit). */
  x?: number;
  y?: number;
  heading?: number;
  unit?: number;
  /** Outline width in drone units (the game uses 1.5 at 18 pt; the icon wants it bolder). */
  line?: number;
  /** Flame length 0..1.5. */
  flame?: number;
  /** Draw the supporting shape even without the space background. */
  backdropOnLayer?: boolean;
}

/** Deep space: navy gradient, a few stars, faint nebula warmth in one corner. */
export function drawSpace(c: SkCanvas, warmCorner = true): void {
  c.drawRect({ x: 0, y: 0, width: S, height: S }, linearPaint(0, 0, S, S, ['#0A1230', '#060A1C', '#03050F'], [0, 0.55, 1]));
  // Cold nebula behind the drone's path.
  c.drawCircle(420, 600, 640, glowPaint(420, 600, 640, '#1D3A8A', 0.35));
  if (warmCorner) c.drawCircle(120, 980, 420, glowPaint(120, 980, 420, '#5A2A6E', 0.28));
  // Few, sparse stars: big enough to survive downscaling as texture, not noise.
  const stars: [number, number, number][] = [
    [140, 170, 5], [300, 90, 3.5], [880, 520, 4], [770, 860, 3.5], [96, 520, 3.5], [560, 940, 4.5], [930, 960, 3], [640, 120, 3],
  ];
  for (const [x, y, r] of stars) {
    glow(c, x, y, r * 4, SPACE.white, 0.25);
    c.drawCircle(x, y, r, fill(alpha(SPACE.white, 0.85)));
  }
}

/** The station's ring as one huge arc in a corner: dark band, lit cyan rim, lit windows. */
export function drawRingArc(c: SkCanvas, cx: number, cy: number, r: number, from: number, sweep: number, band = 92): void {
  const mid = r - band / 2;
  // Glow under the band.
  c.drawPath(arc(cx, cy, mid, from, sweep), stroke(alpha(SPACE.line, 0.08), band + 90, false));
  c.drawPath(arc(cx, cy, mid, from, sweep), stroke(alpha(SPACE.line, 0.1), band + 40, false));
  c.drawPath(arc(cx, cy, mid, from, sweep), stroke(SPACE.hull1, band, false));
  // Inner shading panel.
  c.drawPath(arc(cx, cy, mid + band * 0.22, from, sweep), stroke(SPACE.hull2, band * 0.32, false));
  // Rims.
  c.drawPath(arc(cx, cy, r, from, sweep), stroke(alpha(SPACE.line, 0.25), 26, false));
  c.drawPath(arc(cx, cy, r, from, sweep), stroke(SPACE.line, 9, false));
  c.drawPath(arc(cx, cy, r - band, from, sweep), stroke(SPACE.lineDim, 5, false));
  // Segment seams and windows.
  const step = 9;
  for (let a = from + step / 2; a < from + sweep; a += step) {
    const t = a * DEG;
    const k = Math.round((a - from) / step) % 2;
    const x0 = cx + Math.cos(t) * (r - band + 6);
    const y0 = cy + Math.sin(t) * (r - band + 6);
    const x1 = cx + Math.cos(t) * (r - 6);
    const y1 = cy + Math.sin(t) * (r - 6);
    if (k === 0) c.drawPath(line(x0, y0, x1, y1), stroke(alpha(SPACE.steel, 0.35), 3));
    else {
      const wx = cx + Math.cos(t) * mid;
      const wy = cy + Math.sin(t) * mid;
      glow(c, wx, wy, 44, '#BFF4FF', 0.45);
      c.save();
      c.translate(wx, wy);
      c.rotate(a + 90, 0, 0);
      c.drawPath(rrect(-22, -9, 44, 18, 8), fill('#D9FBFF'));
      c.restore();
    }
  }
}

/** A big rock's lit edge filling a corner: dark body, a warm-lit rim facing the light, cold back rim. */
export function drawRockEdge(c: SkCanvas): void {
  const pts: [number, number][] = [];
  const cx = 1010;
  const cy = 1060;
  const n = 26;
  for (let i = 0; i <= n; i++) {
    const a = (TAU * i) / n;
    const k = 1 + 0.06 * Math.cos(a * 3 + 1) + 0.04 * Math.sin(a * 5);
    pts.push([cx + Math.cos(a) * 520 * k, cy + Math.sin(a) * 470 * k]);
  }
  const b = builder();
  pts.forEach(([x, y], i) => (i ? b.lineTo(x, y) : b.moveTo(x, y)));
  b.close();
  const rock = b.build();
  c.drawPath(rock, linearPaint(500, 600, 1000, 1000, ['#2A2440', '#120F22'], [0, 1]));
  c.save();
  clip(c, rock);
  // Lit facet band along the upper-left edge.
  c.drawCircle(560, 640, 300, glowPaint(560, 640, 300, WARM, 0.5));
  c.restore();
  c.drawPath(rock, stroke(alpha(WARM, 0.25), 30));
  c.drawPath(rock, stroke(mix(WARM, '#FFFFFF', 0.25), 9));
  // Two craters.
  c.drawPath(circle(820, 800, 60), stroke(alpha('#000000', 0.35), 14));
  c.drawPath(circle(700, 950, 36), stroke(alpha('#000000', 0.3), 10));
}

/** Twin thruster flames behind the pods, in drone units (drone facing +x). */
function drawFlames(c: SkCanvas, k: number): void {
  for (const sy of [-1, 1]) {
    const y = sy * 6.2;
    const l = (6 + 9 * k) * (sy < 0 ? 1.08 : 1);
    c.drawPath(poly([-8, y - 3, -8 - l * 1.1, y, -8, y + 3]), light(alpha(SPACE.flameOuter, 0.45)));
    c.drawPath(poly([-8, y - 2.2, -8 - l, y, -8, y + 2.2]), light(alpha(SPACE.flameOuter, 0.6)));
    c.drawPath(poly([-8, y - 1.5, -8 - l * 0.7, y, -8, y + 1.5]), light(alpha(SPACE.flame, 0.9)));
    c.drawPath(poly([-8, y - 0.8, -8 - l * 0.38, y, -8, y + 0.8]), light(SPACE.flameHot));
  }
}

/** The drone itself in drone units, nose to +x: simplified (no small lamps or rims), bolder lines. */
export function drawIconDrone(c: SkCanvas, lw: number, flame: number): void {
  glow(c, 0, 0, 20, SPACE.line, 0.22);
  drawFlames(c, flame);
  // Struts.
  c.drawPath(poly([-1, -3, -4, -6.2, -4, 6.2, -1, 3], false), stroke(SPACE.steelDim, 2.6));
  // Pods.
  for (const sy of [-1, 1]) {
    const pod = rrect(-8.6, sy * 6.2 - 2.7, 7.6, 5.4, 2.7);
    c.drawPath(pod, fill(SPACE.hull2));
    c.drawPath(pod, stroke(alpha(SPACE.line, 0.25), lw + 1.6));
    c.drawPath(pod, stroke(mix(HULL_OUTLINE, SPACE.line, 0.5), lw * 0.85));
  }
  // Hex body with a soft top-lit fill.
  const body = ngon(0.5, 0, 6.4, 6, 0);
  c.drawPath(body, linearPaint(-4, -5, 4, 5, [SPACE.hull3, SPACE.hull1]));
  c.drawPath(body, stroke(alpha(SPACE.line, 0.2), lw + 2.4));
  c.drawPath(body, stroke(alpha(SPACE.line, 0.35), lw + 1));
  c.drawPath(body, stroke(HULL_OUTLINE, lw));
  // Cargo core: a glowing iron block, the warm accent.
  c.save();
  c.translate(-0.9, 0);
  c.rotate(45, 0, 0);
  glow(c, 0, 0, 7.5, WARM, 0.75);
  const core = oreShapePath('iron', 2.7);
  c.drawPath(core, fill(mix(WARM, '#000000', 0.25)));
  c.drawPath(poly([-1.9, -2.2, 2.2, -2.2, 2.2, 0.2, -1.9, 0.2]), fill(mix(WARM, '#FFFFFF', 0.15)));
  c.drawPath(core, stroke(mix(WARM, '#FFFFFF', 0.55), lw * 0.6));
  c.restore();
  // Sensor eye at the nose.
  glow(c, 5, 0, 3.4, SPACE.white, 0.7);
  c.drawCircle(5, 0, 1.05, fill(SPACE.white));
}

export function drawHaulIcon(c: SkCanvas, o: HaulIconOptions): void {
  const space = o.space ?? true;
  if (space) drawSpace(c, o.backdrop !== 'rock');
  if (space || o.backdropOnLayer) {
    if (o.backdrop === 'ring') drawRingArc(c, 1180, -170, 640, 90, 90);
    else if (o.backdrop === 'rock') drawRockEdge(c);
    else {
      glow(c, o.x ?? 512, o.y ?? 512, 470, SPACE.line, 0.35);
      c.drawPath(circle(o.x ?? 512, o.y ?? 512, 400), stroke(alpha(SPACE.line, 0.5), 6));
    }
  }
  c.save();
  c.translate(o.x ?? 500, o.y ?? 540);
  c.rotate(o.heading ?? -38, 0, 0);
  const u = o.unit ?? 34;
  c.scale(u, u);
  drawIconDrone(c, o.line ?? 1.15, o.flame ?? 1);
  c.restore();
}
