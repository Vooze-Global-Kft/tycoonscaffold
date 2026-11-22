/**
 * Field effects and map furniture: the starfield with its nebula band, ring guides, route lines,
 * the drag line, ghost slots, the rich-seam rim, the Survey Flare and its trail, credit glyphs
 * and the hold tank.
 */
import { ClipOp, Skia, type SkCanvas, type SkPaint, type SkPicture } from '@shopify/react-native-skia';
import { drawOreShape, routeDash } from './ore.draw';
import { drawText, textWidth } from './glyphs';
import { SPACE, alpha, galaxyHue, mix, oreColor } from './palette';
import { DEG, TAU, arc, circle, clip, dashed, fill, glow, glowPaint, lamp, line, linearPaint, litStroke, part, picture, poly, rrect, seeded, stroke } from './pen';

// ---------------------------------------------------------------------------
// Starfield
// ---------------------------------------------------------------------------

/**
 * The starfield, `w` x `h` points, for galaxy `galaxy` (nebula hue +47° per galaxy). Baked once;
 * the scene drifts it 3 pt/s and wraps (it tiles vertically: draw it twice).
 */
export function starfieldPicture(w: number, h: number, galaxy = 0, seed = 1): SkPicture {
  return picture({ x: 0, y: 0, w, h }, (c) => drawStarfield(c, w, h, galaxy, seed));
}

export function drawStarfield(c: SkCanvas, w: number, h: number, galaxy = 0, seed = 1): void {
  const rnd = seeded(seed * 131 + galaxy);
  const hue = galaxyHue(galaxy);
  c.save();
  c.clipRect({ x: 0, y: 0, width: w, height: h }, ClipOp.Intersect, true);
  c.drawRect({ x: 0, y: 0, width: w, height: h }, fill(SPACE.bg));
  // Nebula band: a few large soft blobs along a diagonal, in the galaxy hue.
  const tilt = -0.35 + rnd() * 0.2;
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const x = w * (-0.1 + 1.2 * t);
    const y = h * (0.42 + tilt * (t - 0.5)) + (rnd() - 0.5) * h * 0.08;
    const r = w * (0.28 + rnd() * 0.22);
    glow(c, x, y, r, i % 2 ? hue : mix(hue, '#FF5FA8', 0.25), 0.1 + rnd() * 0.05);
  }
  // Dust lane through the band.
  glow(c, w * 0.6, h * 0.4, w * 0.3, '#000000', 0.25);
  // Stars, three depths; wrapped vertically so the layer tiles.
  const n = Math.round((w * h) / 900);
  for (let i = 0; i < n; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const d = rnd();
    const r = d < 0.75 ? 0.45 : d < 0.95 ? 0.75 : 1.1;
    const col = rnd() < 0.15 ? '#FFE7C2' : rnd() < 0.3 ? '#C4DCFF' : '#FFFFFF';
    const a = d < 0.75 ? 0.35 + rnd() * 0.25 : 0.7 + rnd() * 0.3;
    for (const yy of [y, y - h, y + h]) {
      if (r > 1) glow(c, x, yy, 4, col, 0.35);
      c.drawCircle(x, yy, r, fill(alpha(col, a)));
    }
  }
  c.restore();
}

// ---------------------------------------------------------------------------
// Ring guides, routes, drag line
// ---------------------------------------------------------------------------

export interface RingLabelOptions {
  /** Left gutter of the screen (points from x = 0): labels never go left of it. Default 16. */
  gutter?: number;
  /** Rock centres on the screen: a label within `clear` of a rock's edge is skipped. */
  rocks?: [number, number][];
  /** Drawn rock radius (default 26) and the clearance (default 20). */
  rockR?: number;
  clear?: number;
}

/**
 * Dashed ring arcs round the station at (cx, cy), 1 pt, 18 % white. `sweep` is the visible
 * half-angle from straight up in degrees (default 75). Labels "R1".. sit on each arc at the point
 * nearest x = 24 (in screen points: pass the station's screen position), clamped inside the
 * gutter, and are skipped where a rock is within 20 pt (second pass, critique S9).
 */
export function drawRingGuides(c: SkCanvas, cx: number, cy: number, radii: number[], sweep = 75, o: RingLabelOptions = {}): void {
  const gutter = o.gutter ?? 16;
  const rockR = o.rockR ?? 26;
  const clear = o.clear ?? 20;
  radii.forEach((r, i) => {
    c.drawPath(arc(cx, cy, r, -90 - sweep, sweep * 2), dashed(alpha('#FFFFFF', 0.18), 1, 4, 5));
    // The arc's point nearest x = gutter + 8, within the sweep.
    const want = gutter + 8;
    const dx = want - cx;
    let a: number;
    if (Math.abs(dx) <= r) a = Math.atan2(-Math.sqrt(r * r - dx * dx), dx);
    else a = Math.PI;
    a = Math.max((-90 - sweep) * DEG, Math.min((-90 + sweep) * DEG, a));
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (x < gutter) return;
    if (o.rocks?.some(([rx, ry]) => Math.hypot(rx - x, ry - y) < rockR + clear)) return;
    drawText(c, `R${i + 1}`, x + 3, y - 9, { size: 5, color: alpha('#FFFFFF', 0.45), glow: 0, weight: 0.9 });
  });
}

/** The width of a route line (points). */
export const ROUTE_WIDTH = 2;

const routePaintCache = new Map<string, { glow: SkPaint; dash: SkPaint }>();

/**
 * The two shared paints of an ore's route (glow and dashed line at phase 0), made once per ore
 * (critique S12). In the app, draw each route as a `<Path>` built once per layout and animate the
 * flow with one `<DashPathEffect intervals={routeDash(ore)} phase={sharedPhase} />` per ore.
 */
export function routePaints(ore: string): { glow: SkPaint; dash: SkPaint } {
  let p = routePaintCache.get(ore);
  if (!p) {
    const tint = oreColor(ore);
    const dash = stroke(alpha(tint, 0.8), ROUTE_WIDTH);
    dash.setPathEffect(Skia.PathEffect.MakeDash(routeDash(ore), 0));
    p = { glow: stroke(alpha(tint, 0.1), 6), dash };
    routePaintCache.set(ore, p);
  }
  return p;
}

/**
 * A route: a line in the ore colour from the rock to the station, with the ore's own dash rhythm
 * (ore.draw.ts ROUTE_DASH: iron long dashes, copper dots, ice dash-dot, titanium double dash,
 * platinum dash-dot-dot). `phase` (points) makes the dashes flow toward the station: pass
 * `-(clock * 14) % routeDashPeriod(ore)` while delivering. For sheets and mocks; the frame loop
 * should use `routePaints` and a declarative DashPathEffect instead.
 */
export function drawRoute(c: SkCanvas, x0: number, y0: number, x1: number, y1: number, ore: string, phase = 0): void {
  const p = line(x0, y0, x1, y1);
  const paints = routePaints(ore);
  c.drawPath(p, paints.glow);
  if (phase === 0) c.drawPath(p, paints.dash);
  else {
    const d = stroke(alpha(oreColor(ore), 0.8), ROUTE_WIDTH);
    d.setPathEffect(Skia.PathEffect.MakeDash(routeDash(ore), phase));
    c.drawPath(p, d);
  }
}

/** The route's "x3" chip (40 pt tap area, about 22 x 14 pt drawn). */
export function drawRouteChip(c: SkCanvas, count: number, ore: string): void {
  const tint = oreColor(ore);
  const text = `x${count}`;
  const w = textWidth(text, 6) + 9;
  const chip = rrect(-w / 2, -7, w, 14, 7);
  c.drawPath(chip, fill(mix(SPACE.panel, tint, 0.18)));
  litStroke(c, chip, tint, 1.1, 0.6);
  drawText(c, text, 0, -3, { size: 6, color: '#FFFFFF', align: 'center', glow: 0, weight: 1.1 });
}

/** The drag line while dragging a drone or the flare: dashed cyan with an aim ring at the finger. */
export function drawDragLine(c: SkCanvas, x0: number, y0: number, x1: number, y1: number, color: string = SPACE.line): void {
  const p = line(x0, y0, x1, y1);
  c.drawPath(p, stroke(alpha(color, 0.12), 6));
  c.drawPath(p, dashed(color, 1.5, 5, 4));
  c.drawPath(circle(x1, y1, 9), stroke(alpha(color, 0.8), 1.2));
}

// ---------------------------------------------------------------------------
// Ghost slots, seams
// ---------------------------------------------------------------------------

/** A ghost slot (unclaimed): a dashed circle with a price tag. Breathe its scale over 2 s. */
export function drawGhostSlot(c: SkCanvas, r: number, price: string): void {
  c.drawPath(circle(0, 0, r), fill(alpha(SPACE.line, 0.04)));
  c.drawPath(circle(0, 0, r), dashed(alpha(SPACE.line, 0.55), 1.2, 4, 4));
  c.drawPath(line(-4, 0, 4, 0), stroke(alpha(SPACE.line, 0.5), 1.2));
  c.drawPath(line(0, -4, 0, 4), stroke(alpha(SPACE.line, 0.5), 1.2));
  const tw = textWidth(price, 6) + 8;
  const tag = rrect(-tw / 2, r - 5, tw, 12, 3);
  c.drawPath(tag, fill(SPACE.panel));
  c.drawPath(tag, stroke(alpha(SPACE.line, 0.7), 1));
  drawText(c, price, 0, r - 2, { size: 6, color: SPACE.line, align: 'center', glow: 0.4, weight: 1.1 });
}

/** The rich-seam rim round a rock of radius r (pulse its alpha at 1 Hz for 40 s). */
export function drawSeamRim(c: SkCanvas, r: number): void {
  glow(c, 0, 0, r * 1.6, SPACE.gold, 0.32);
  c.drawPath(circle(0, 0, r + 4), stroke(alpha(SPACE.gold, 0.25), 5));
  c.drawPath(circle(0, 0, r + 4), stroke(SPACE.gold, 1.5));
  c.drawPath(circle(0, 0, r + 8), dashed(alpha(SPACE.gold, 0.6), 1, 3, 5));
  const rnd = seeded(7);
  for (let i = 0; i < 5; i++) {
    const a = rnd() * TAU;
    const d = r + 2 + rnd() * 6;
    drawSparkle(c, Math.cos(a) * d, Math.sin(a) * d, 2.2 + rnd() * 1.8, SPACE.gold);
  }
}

/** A four-point sparkle. */
export function drawSparkle(c: SkCanvas, x: number, y: number, s: number, color: string): void {
  glow(c, x, y, s * 2.2, color, 0.5);
  c.drawPath(poly([x, y - s, x + s * 0.22, y - s * 0.22, x + s, y, x + s * 0.22, y + s * 0.22, x, y + s, x - s * 0.22, y + s * 0.22, x - s, y, x - s * 0.22, y - s * 0.22]), fill(mix(color, '#FFFFFF', 0.5)));
}

/** The dashed gold guide from the busiest route's chip to the seam rock. */
export function drawSeamGuide(c: SkCanvas, x0: number, y0: number, x1: number, y1: number, phase = 0): void {
  c.drawPath(line(x0, y0, x1, y1), dashed(alpha(SPACE.gold, 0.85), 1.5, 5, 5, phase));
}

// ---------------------------------------------------------------------------
// Flare
// ---------------------------------------------------------------------------

/**
 * The Survey Flare: a stubby tube tilted 30°, three small fins at its base, a striped cap and a
 * four-point spark at the tip (second pass, critique S2), about 14 x 20 pt. `beaconOn` lights the
 * spark (a spent or charging flare draws it dark).
 */
export function drawFlare(c: SkCanvas, beaconOn = true): void {
  c.save();
  c.rotate(30, 0, 0);
  // Fins: left, right and the one facing us.
  for (const s of [-1, 1]) part(c, poly([s * 3.2, 3.5, s * 7, 9.5, s * 3.2, 8]), SPACE.hull3, SPACE.gold, 0.9, 0.3);
  part(c, poly([-1, 5, 1, 5, 1.2, 10.5, -1.2, 10.5]), SPACE.hull3, SPACE.gold, 0.8, 0.2);
  // Tube.
  const body = rrect(-3.4, -4, 6.8, 12.5, 1.8);
  part(c, body, SPACE.hull2, SPACE.gold, 1.2, 0.6);
  // Striped cap: a dome with two amber bands.
  const cap = poly([-3.4, -4, 3.4, -4, 2.6, -7.5, 0, -9, -2.6, -7.5]);
  part(c, cap, SPACE.hull1, SPACE.gold, 1, 0.4);
  c.drawPath(line(-3, -5.6, 3, -5.6), stroke(SPACE.amber, 1));
  c.drawPath(line(-2.2, -7.2, 2.2, -7.2), stroke(SPACE.amber, 0.9));
  c.restore();
  // The spark at the tip (upright, not tilted): four points.
  const tx = Math.sin(30 * DEG) * 9.6;
  const ty = -Math.cos(30 * DEG) * 9.6;
  if (beaconOn) drawSparkle(c, tx, ty, 3.4, SPACE.gold);
  else c.drawCircle(tx, ty, 1, fill(SPACE.goldDeep));
}

/** The flare launcher's charge count on a small plate ("2"), centred on the origin. */
export function drawChargePlate(c: SkCanvas, n: number): void {
  const text = `×${n}`;
  const w = textWidth(text, 6) + 8;
  const plate = rrect(-w / 2, -5.5, w, 11, 3);
  c.drawPath(plate, fill(mix(SPACE.panel, SPACE.gold, 0.15)));
  c.drawPath(plate, stroke(alpha(SPACE.gold, 0.8), 0.9));
  drawText(c, text, 0, -3, { size: 6, color: SPACE.gold, align: 'center', glow: 0, weight: 1.1 });
}

/** The flare's trail from (x0, y0) to (x1, y1) at progress k (0.6 s). */
export function drawFlareTrail(c: SkCanvas, x0: number, y0: number, x1: number, y1: number, k: number): void {
  const t = Math.max(0, Math.min(1, k));
  const x = x0 + (x1 - x0) * t;
  const y = y0 + (y1 - y0) * t;
  const p = line(x0 + (x1 - x0) * Math.max(0, t - 0.45), y0 + (y1 - y0) * Math.max(0, t - 0.45), x, y);
  c.drawPath(p, stroke(alpha(SPACE.gold, 0.18), 7));
  c.drawPath(p, stroke(alpha(SPACE.gold, 0.7), 2.4));
  c.drawPath(p, stroke(alpha('#FFFFFF', 0.9), 0.9));
  c.drawCircle(x, y, 7, glowPaint(x, y, 7, SPACE.gold, 0.9));
}

// ---------------------------------------------------------------------------
// Credits
// ---------------------------------------------------------------------------

/** A credit glyph: a vector ₵ in a lit gold diamond frame (not a coin), about 12 pt. */
export function drawCreditGlyph(c: SkCanvas, s = 12): void {
  const k = s / 12;
  glow(c, 0, 0, 9 * k, SPACE.gold, 0.45);
  const d = poly([0, -6 * k, 5.4 * k, 0, 0, 6 * k, -5.4 * k, 0]);
  c.drawPath(d, fill(mix(SPACE.goldDeep, SPACE.bg, 0.35)));
  c.drawPath(d, stroke(SPACE.gold, 1.1 * k));
  drawText(c, '₵', 0, -3 * k, { size: 6 * k, color: '#FFF3C8', align: 'center', glow: 0, weight: 1.1 * k });
}

// ---------------------------------------------------------------------------
// Hold tank
// ---------------------------------------------------------------------------

/**
 * The hold tank: a vertical capsule `w` x `h` (56 x 88 on the large layout) with stacked ore bands.
 * `bands` are [ore, fraction of capacity] from the bottom up. Origin at the tank's centre.
 */
export function drawHoldTank(c: SkCanvas, w: number, h: number, bands: [string, number][], full = false): void {
  const shell = rrect(-w / 2, -h / 2, w, h, w / 2);
  c.drawPath(shell, fill(SPACE.hull0));
  const inner = rrect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, w / 2 - 4);
  c.save();
  clip(c, inner);
  let y = h / 2 - 4;
  const ih = h - 8;
  for (const [ore, f] of bands) {
    const bh = ih * Math.max(0, f);
    const tint = oreColor(ore);
    c.drawRect({ x: -w / 2, y: y - bh, width: w, height: bh }, linearPaint(-w / 2, 0, w / 2, 0, [mix(tint, '#000000', 0.35), tint, mix(tint, '#000000', 0.25)], [0, 0.4, 1]));
    c.drawPath(line(-w / 2, y - bh, w / 2, y - bh), stroke(alpha('#FFFFFF', 0.5), 0.8));
    // The band's ore silhouette as its marker, so bands read without colour.
    if (bh >= 7) {
      c.save();
      c.translate(-w / 2 + 11, y - bh / 2);
      drawOreShape(c, ore, Math.min(3.4, bh * 0.32), { glow: 0, line: 0.8 });
      c.restore();
    }
    y -= bh;
  }
  if (full) {
    // Frost along the top of the full hold.
    c.drawPath(line(-w / 2, y + 1, w / 2, y + 1), dashed(alpha('#FFFFFF', 0.85), 1.2, 1.5, 1.5));
  }
  // Glass sheen.
  c.drawRect({ x: -w / 2 + 7, y: -h / 2, width: 3, height: h }, fill(alpha('#FFFFFF', 0.12)));
  // Scale ticks.
  for (let i = 1; i < 4; i++) {
    const ty = h / 2 - 4 - (ih * i) / 4;
    c.drawPath(line(w / 2 - 12, ty, w / 2 - 5, ty), stroke(alpha('#FFFFFF', 0.35), 0.8));
  }
  c.restore();
  litStroke(c, shell, full ? SPACE.green : SPACE.line, 1.5, full ? 1.2 : 0.7);
  c.drawPath(inner, stroke(alpha(SPACE.steel, 0.35), 0.8));
  // Caps.
  c.drawPath(rrect(-w * 0.25, -h / 2 - 3, w * 0.5, 4, 1.5), fill(SPACE.steelDim));
  c.drawPath(rrect(-w * 0.25, h / 2 - 1, w * 0.5, 4, 1.5), fill(SPACE.steelDim));
}

