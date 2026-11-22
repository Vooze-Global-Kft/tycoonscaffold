/**
 * Orbit Haulers app icon: the hauler drone, enlarged and simplified from
 * src/ui/haul/art/drone.draw.ts (same hex body, twin pods, ore core, sensor eye, cyan flames), on
 * deep space with one big supporting shape. Pure Skia: require() it inside scripts/art/headless.ts.
 *
 * Everything draws into a 1024 x 1024 square (points = pixels at scale 1).
 */
import { BlendMode, type SkCanvas } from '@shopify/react-native-skia';
import { SPACE, ORE, alpha, mix, shade } from '../../../src/ui/haul/art/palette';
import { blob, builder, clip, circle, fill, glow, glowPaint, light, linearPaint, ngon, poly, rrect, stroke, arc, line, TAU, DEG } from '../../../src/ui/haul/art/pen';
import { oreShapePath } from '../../../src/ui/haul/art/ore.draw';

export const S = 1024;
const HULL_OUTLINE = '#DDF3FF';
/** The warm accent: iron ore (the first ore a player hauls). */
export const WARM = ORE.iron;

export type HaulBackdrop = 'ring' | 'rock' | 'halo' | 'ore-rock';

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
  /** Where the 'ore-rock' backdrop sits. */
  rock?: OreRock;
  /** A dotted ore route from the rock to the drone (the game's haul line). */
  route?: boolean;
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
  c.drawPath(arc(cx, cy, r, from, sweep), stroke(alpha(SPACE.line, 0.25), 34, false));
  c.drawPath(arc(cx, cy, r, from, sweep), stroke(SPACE.line, 13, false));
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
      glow(c, wx, wy, 54, '#BFF4FF', 0.5);
      c.save();
      c.translate(wx, wy);
      c.rotate(a + 90, 0, 0);
      c.drawPath(rrect(-26, -11, 52, 22, 10), fill('#D9FBFF'));
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

/** Twin thruster flames behind the pods, in drone units (drone facing +x): tapered, white-hot at the nozzle. */
function drawFlames(c: SkCanvas, k: number): void {
  for (const sy of [-1, 1]) {
    const y = sy * 6.2;
    const x0 = -8.6;
    const l = (7 + 7 * k) * (sy < 0 ? 1.08 : 1);
    const outer = blob([[x0 + 0.5, y - 2.6], [x0 - l * 0.35, y - 2.2], [x0 - l, y], [x0 - l * 0.35, y + 2.2], [x0 + 0.5, y + 2.6]], 0.9);
    const p1 = linearPaint(x0, y, x0 - l, y, [alpha(SPACE.flame, 0.95), alpha(SPACE.flameOuter, 0.7), alpha(SPACE.flameOuter, 0)], [0, 0.55, 1]);
    p1.setBlendMode(BlendMode.Plus);
    c.drawPath(outer, p1);
    const inner = blob([[x0 + 0.5, y - 1.4], [x0 - l * 0.3, y - 1.1], [x0 - l * 0.62, y], [x0 - l * 0.3, y + 1.1], [x0 + 0.5, y + 1.4]], 0.9);
    const p2 = linearPaint(x0, y, x0 - l * 0.62, y, [SPACE.flameHot, alpha(SPACE.flameHot, 0.8), alpha(SPACE.flame, 0)], [0, 0.4, 1]);
    p2.setBlendMode(BlendMode.Plus);
    c.drawPath(inner, p2);
  }
}

/** The drone itself in drone units, nose to +x: simplified (no small lamps or rims), bolder lines. */
export function drawIconDrone(c: SkCanvas, lw: number, flame: number): void {
  glow(c, 0, 0, 16, SPACE.line, 0.3);
  drawFlames(c, flame);
  // Struts: one solid yoke.
  const yoke = poly([-1, -3.2, -4.4, -6.2, -4.4, 6.2, -1, 3.2], false);
  c.drawPath(yoke, stroke(SPACE.hull3, 3.4));
  c.drawPath(yoke, stroke(SPACE.steel, 1.1));
  // Pods: solid lit capsules with a bright nozzle at the back.
  for (const sy of [-1, 1]) {
    const pod = rrect(-9, sy * 6.2 - 2.9, 8.4, 5.8, 2.9);
    c.drawPath(pod, linearPaint(0, sy * 6.2 - 3, 0, sy * 6.2 + 3, ['#4F6E9E', '#22355A']));
    c.drawPath(pod, stroke(mix(HULL_OUTLINE, SPACE.line, 0.35), lw * 0.8));
    c.drawPath(rrect(-8.2, sy * 6.2 - 1.9, 1.5, 3.8, 0.75), fill(SPACE.white));
  }
  // Hex body with a soft top-lit fill and one smooth halo.
  const body = ngon(0.5, 0, 6.6, 6, 0);
  glow(c, 0.5, 0, 10, SPACE.line, 0.35);
  c.drawPath(body, linearPaint(-4, -6, 4, 6, ['#34507F', SPACE.hull1]));
  c.drawPath(body, stroke(HULL_OUTLINE, lw));
  // Cargo core: a glowing iron block, the warm accent.
  c.save();
  c.translate(-0.6, 0);
  glow(c, 0, 0, 7, WARM, 0.85);
  const core = oreShapePath('iron', 3.1);
  c.drawPath(core, fill(WARM));
  c.drawPath(poly([-2.0, -2.55, 2.0, -2.55, 2.54, -2.0, 2.54, -0.3, -2.54, -0.3, -2.54, -2.0]), fill(mix(WARM, '#FFFFFF', 0.35)));
  c.drawPath(core, stroke(mix(WARM, '#FFFFFF', 0.7), lw * 0.55));
  c.restore();
  // Sensor eye at the nose.
  glow(c, 5.1, 0, 3.4, SPACE.white, 0.8);
  c.drawCircle(5.1, 0, 1.05, fill(SPACE.white));
}

export function drawHaulIcon(c: SkCanvas, o: HaulIconOptions): void {
  const space = o.space ?? true;
  if (space) drawSpace(c, o.backdrop !== 'rock');
  if (space || o.backdropOnLayer) {
    if (o.backdrop === 'ring') drawRingArc(c, 1120, -90, 600, 88, 98, 130);
    else if (o.backdrop === 'rock') drawRockEdge(c);
    else if (o.backdrop === 'ore-rock') drawOreRock(c, o.rock ?? ROCK_A);
    else {
      glow(c, o.x ?? 512, o.y ?? 512, 470, SPACE.line, 0.35);
      c.drawPath(circle(o.x ?? 512, o.y ?? 512, 400), stroke(alpha(SPACE.line, 0.5), 6));
    }
  }
  if (o.route && o.backdrop === 'ore-rock') drawRoute(c, o.rock ?? ROCK_A, o.x ?? 500, o.y ?? 540, o.heading ?? -38, o.unit ?? 34);
  c.save();
  c.translate(o.x ?? 500, o.y ?? 540);
  c.rotate(o.heading ?? -38, 0, 0);
  const u = o.unit ?? 34;
  c.scale(u, u);
  drawIconDrone(c, o.line ?? 1.15, o.flame ?? 1);
  c.restore();
}

/**
 * The chosen design (round 2, candidate r2-haul-A): a lit iron asteroid with a white-hot seam fills
 * the lower-left; the drone leaves it diagonally up-right carrying its glowing iron core, three route
 * dots between them. The station ring of round 1 is gone (it read as dashed arcs at 60 px).
 */
export const CHOSEN: HaulIconOptions = {
  backdrop: 'ore-rock',
  route: true,
  rock: { x: 235, y: 805, r: 335, turn: 0 },
  x: 665, y: 360, heading: -38, unit: 20, line: 1.25, flame: 0.62,
};

export function drawChosenIcon(c: SkCanvas): void {
  drawHaulIcon(c, CHOSEN);
}

/**
 * Adaptive foreground and splash mark (transparent): the same rock and drone, smaller, everything
 * inside the 66 dp safe circle (radius 313 px of 1024) so no mask cuts a flame or the rock's rim;
 * the launcher puts it on the theme's navy #060A16.
 */
export function drawChosenLayer(c: SkCanvas): void {
  drawHaulIcon(c, {
    backdrop: 'ore-rock', space: false, backdropOnLayer: true, route: true,
    rock: { x: 405, y: 640, r: 150, turn: 0 },
    x: 632, y: 405, heading: -38, unit: 12.5, line: 1.3, flame: 0.5,
  });
}

/**
 * The adaptive foreground (Android): the layer above shrunk about the centre so that the rock's
 * glow, not only its rim, stays inside the 66 dp safe circle under every launcher mask (pizza-0;
 * checked by scripts/art/icons/measure.ts). The splash keeps the full-size mark.
 */
export const ADAPTIVE_K = 0.86;
export function drawChosenAdaptive(c: SkCanvas): void {
  c.save();
  c.translate(512 * (1 - ADAPTIVE_K), 512 * (1 - ADAPTIVE_K));
  c.scale(ADAPTIVE_K, ADAPTIVE_K);
  drawChosenLayer(c);
  c.restore();
}

/** A big asteroid for the icon, in pixels: centre, radius, turn of its outline (degrees). */
export interface OreRock { x: number; y: number; r: number; turn: number; seed?: number }
export const ROCK_A: OreRock = { x: 250, y: 800, r: 330, turn: 0 };

function rockOutline(k: OreRock): [number, number][] {
  // Deterministic, bold silhouette: 11 corners with two flat faces and one bite, like the kit's rocks.
  const ks = [1, 0.93, 1.02, 0.86, 0.97, 1.04, 0.95, 0.8, 0.98, 1.03, 0.92];
  const pts: [number, number][] = [];
  for (let i = 0; i < ks.length; i++) {
    const a = (TAU * i) / ks.length + k.turn * DEG;
    pts.push([k.x + Math.cos(a) * k.r * ks[i], k.y + Math.sin(a) * k.r * ks[i] * 0.92]);
  }
  return pts;
}

/**
 * The asteroid in the kit's style (rock.draw.ts) but drawn for an icon: iron-tinted dark body, a lit
 * facet toward the upper right (where the drone is), two big craters, one white-hot ore seam with
 * crystal glints, and a thick glowing iron rim.
 */
export function drawOreRock(c: SkCanvas, k: OreRock): void {
  const tint = WARM;
  const pts = rockOutline(k);
  const outline = blob(pts, 0.5);
  const body = mix(shade(tint, 0.18), '#20263A', 0.3);
  glow(c, k.x, k.y, k.r * 1.45, tint, 0.34);
  c.drawPath(outline, fill(body));
  c.save();
  clip(c, outline);
  // Lit facet (upper right), shadow (lower left).
  const facet = blob(pts.map(([x, y]) => {
    const dx = x - k.x;
    const dy = y - k.y;
    const toward = (dx - dy) / (k.r * 1.4);
    const f = toward > 0 ? 0.9 : 0.3;
    return [k.x + dx * f + k.r * 0.12, k.y + dy * f - k.r * 0.12] as [number, number];
  }), 0.6);
  c.drawPath(facet, fill(mix(body, tint, 0.5)));
  c.drawCircle(k.x - k.r * 0.5, k.y + k.r * 0.55, k.r * 0.8, fill(alpha('#000000', 0.3)));
  for (const [dx, dy, rr] of [[-0.42, -0.05, 0.2], [0.08, 0.45, 0.14]]) {
    const x = k.x + dx * k.r;
    const y = k.y + dy * k.r;
    const r = rr * k.r;
    c.drawCircle(x, y, r, fill(alpha(mix(tint, '#FFFFFF', 0.2), 0.25)));
    c.drawCircle(x + r * 0.2, y - r * 0.2, r * 0.84, fill(alpha('#000000', 0.42)));
  }
  // The seam: a forked crack across the lit face, glowing iron with a white-hot core.
  const seam = (q: number[][]) => {
    const path = poly(q.map(([x, y]) => [k.x + x * k.r, k.y + y * k.r]).flat(), false);
    c.drawPath(path, stroke(alpha(tint, 0.35), k.r * 0.13));
    c.drawPath(path, stroke(tint, k.r * 0.065));
    c.drawPath(path, stroke(mix(tint, '#FFFFFF', 0.6), k.r * 0.026));
  };
  seam([[-0.15, 0.25], [0.05, 0.02], [0.02, -0.28], [0.25, -0.5]]);
  seam([[0.05, 0.02], [0.38, -0.08], [0.62, -0.02]]);
  for (const [x, y, s] of [[0.25, -0.5, 0.085], [0.62, -0.02, 0.07], [-0.15, 0.25, 0.06]]) {
    const cx = k.x + x * k.r;
    const cy = k.y + y * k.r;
    glow(c, cx, cy, s * k.r * 2.6, tint, 0.7);
    c.drawPath(poly([cx, cy - s * k.r * 1.3, cx + s * k.r * 0.7, cy, cx, cy + s * k.r * 1.3, cx - s * k.r * 0.7, cy]), fill(mix(tint, '#FFFFFF', 0.6)));
  }
  c.restore();
  // Thick lit rim.
  const rim = mix(tint, '#FFFFFF', 0.15);
  c.drawPath(outline, stroke(alpha(rim, 0.12), k.r * 0.2));
  c.drawPath(outline, stroke(alpha(rim, 0.25), k.r * 0.1));
  c.drawPath(outline, stroke(rim, k.r * 0.05));
  c.drawPath(outline, stroke(alpha(mix(tint, '#FFFFFF', 0.6), 0.9), k.r * 0.016));
}

/** The game's iron route (dashes) from the rock's seam out to the drone's tail. */
function drawRoute(c: SkCanvas, k: OreRock, x: number, y: number, heading: number, unit: number): void {
  const x0 = k.x + 0.25 * k.r;
  const y0 = k.y - 0.5 * k.r;
  const t = heading * DEG;
  const x1 = x - Math.cos(t) * unit * 10;
  const y1 = y - Math.sin(t) * unit * 10;
  const n = 4;
  for (let i = 0; i < n; i++) {
    const a = (i + 0.5) / (n + 0.4);
    const cx = x0 + (x1 - x0) * a;
    const cy = y0 + (y1 - y0) * a;
    glow(c, cx, cy, 30, WARM, 0.4);
    c.drawCircle(cx, cy, 11, fill(mix(WARM, '#FFFFFF', 0.3)));
  }
}
