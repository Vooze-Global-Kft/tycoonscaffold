/**
 * The freighter, top-down, nose up (it climbs off the top of the field). Four hulls by level
 * (1, 10, 25, 50) and up to 8 cargo segments (one more every 25 levels past 50), container pods
 * paired along the spine. Origin at the freighter's centre of length; also the warp flash, the
 * launch pad and its chevrons.
 *
 * Pale-cyan outlines like the station, with its own amber hazard bands and cyan cockpit; it is
 * much larger than a drone and has no pods, so the two never mix.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { SPACE, alpha, mix } from './palette';
import { LINE, TAU, arc, circle, fill, glow, lamp, light, line, part, poly, rrect, stroke } from './pen';
import { drawText, textWidth } from './glyphs';
import { HAUL_STRINGS } from '../strings';

export type HullId = 0 | 1 | 2 | 3;
export const HULL_NAMES = ['Skiff', 'Barge', 'Hauler', 'Bulk Carrier'] as const;

/** Hull for a freighter level. */
export function hullFor(level: number): HullId {
  if (level >= 50) return 3;
  if (level >= 25) return 2;
  if (level >= 10) return 1;
  return 0;
}

/** Cargo segments for a level: one every 25 levels past 50, up to 8. */
export function segmentsFor(level: number): number {
  return Math.max(0, Math.min(8, Math.floor((level - 50) / 25)));
}

/** Hull outline: pale cyan at 1.5 pt with the station's lit glow (second pass, critique S3). */
const HULL_LINE = '#A8EEFF';
const STRIPE = SPACE.amber;

interface HullGeo {
  /** Half length of the hull before segments, half width. */
  len: number;
  wid: number;
  engines: number;
}
const GEO: HullGeo[] = [
  { len: 13, wid: 7, engines: 1 },
  { len: 15, wid: 9, engines: 2 },
  { len: 17, wid: 10, engines: 3 },
  { len: 19, wid: 13, engines: 4 },
];
const ROW = 6.5;

/** Width and length (points) of a freighter, flames excluded. */
export function freighterSize(hull: HullId, segments: number): { w: number; h: number } {
  const g = GEO[hull];
  const rows = Math.ceil(Math.min(8, segments) / 2);
  return { w: g.wid * 2 + (segments > 0 ? 8 : 0) + (hull === 3 ? 6 : 0), h: g.len * 2 + rows * ROW };
}

/** Engine nozzle x positions and the y of the stern, for flames. */
export function freighterEngines(hull: HullId, segments: number): { xs: number[]; y: number } {
  const g = GEO[hull];
  const h = freighterSize(hull, segments).h;
  const xs: number[] = [];
  for (let i = 0; i < g.engines; i++) xs.push((i - (g.engines - 1) / 2) * 5.2);
  return { xs, y: h / 2 };
}

export interface FreighterOptions {
  hull: HullId;
  segments?: number;
  /** Cargo ore colours to light the containers with (cycled); none = dark containers. */
  cargo?: string[];
}

export function drawFreighter(c: SkCanvas, o: FreighterOptions): void {
  const g = GEO[o.hull];
  const segs = Math.max(0, Math.min(8, o.segments ?? 0));
  const rows = Math.ceil(segs / 2);
  const { h } = freighterSize(o.hull, segs);
  const top = -h / 2;
  const bottom = h / 2;
  const w = g.wid;
  glow(c, 0, 0, Math.max(h, w * 2) * 0.75, SPACE.line, 0.07);

  // Spine through the cargo rows.
  if (rows > 0) {
    const spineTop = top + g.len * 1.1;
    const spine = rrect(-2.6, spineTop, 5.2, rows * ROW + 2, 1);
    part(c, spine, SPACE.hull2, HULL_LINE, 1, 0.3);
    for (let i = 0; i < segs; i++) {
      const row = Math.floor(i / 2);
      const side = i % 2 === 0 ? -1 : 1;
      const y = spineTop + 1 + row * ROW;
      const x = side < 0 ? -2.6 - 7.4 : 2.6;
      const box = rrect(x, y + 0.4, 7.4, ROW - 0.8, 1);
      const ore = o.cargo && o.cargo.length ? o.cargo[i % o.cargo.length] : null;
      part(c, box, ore ? mix(SPACE.hull1, ore, 0.5) : SPACE.hull1, HULL_LINE, 0.9, 0.2);
      c.drawPath(line(x + 1.5, y + ROW / 2, x + 5.9, y + ROW / 2), stroke(ore ? alpha(ore, 0.9) : alpha(SPACE.steel, 0.4), 1));
    }
  }

  // Stern block with the engines.
  const sternTop = bottom - g.len * 0.9;
  const stern = poly([-w, sternTop, w, sternTop, w * 0.85, bottom - 2, -w * 0.85, bottom - 2]);
  part(c, stern, SPACE.hull1, HULL_LINE, LINE, 0.65);
  // One panel a shade darker, one scorch streak toward the engines: a ship that has flown.
  c.drawPath(rrect(w * 0.15, sternTop + 3.5, w * 0.5, g.len * 0.35, 0.8), fill(alpha('#000000', 0.25)));
  c.drawPath(line(-w * 0.45, sternTop + 4, -w * 0.3, bottom - 4), stroke(alpha('#05070D', 0.55), 1.6));
  const { xs } = freighterEngines(o.hull, segs);
  for (const x of xs) {
    part(c, rrect(x - 2.1, bottom - 4, 4.2, 4.5, 1.2), SPACE.hull3, HULL_LINE, 0.9, 0);
    c.drawCircle(x, bottom - 0.5, 1.4, fill(alpha(SPACE.flame, 0.9)));
  }
  // Amber hazard stripes on the stern.
  for (let i = 0; i < 4; i++) {
    const x = -w * 0.7 + i * ((w * 1.4) / 3);
    c.drawPath(line(x - 1.2, sternTop + 2.5, x + 1.2, sternTop + 0.8), stroke(STRIPE, 1.1));
  }

  // Bow: the cockpit section, different per hull.
  const bowBottom = top + g.len * 1.1 + 0.5;
  switch (o.hull) {
    case 0: {
      const bow = poly([0, top, w * 0.9, top + 9, w, bowBottom, -w, bowBottom, -w * 0.9, top + 9]);
      part(c, bow, SPACE.hull1, HULL_LINE, LINE, 0.65);
      break;
    }
    case 1: {
      const bow = poly([-3, top, 3, top, w, top + 8, w, bowBottom, -w, bowBottom, -w, top + 8]);
      part(c, bow, SPACE.hull1, HULL_LINE, LINE, 0.65);
      // Side fins.
      for (const s of [-1, 1]) part(c, poly([s * w, bowBottom - 8, s * (w + 4), bowBottom - 1, s * w, bowBottom]), SPACE.hull2, HULL_LINE, 1, 0);
      break;
    }
    case 2: {
      const bow = poly([0, top, w * 0.8, top + 5, w, bowBottom, -w, bowBottom, -w * 0.8, top + 5]);
      part(c, bow, SPACE.hull1, HULL_LINE, LINE, 0.65);
      c.drawPath(poly([-w * 0.6, top + 12, 0, top + 5, w * 0.6, top + 12], false), stroke(alpha(HULL_LINE, 0.5), 0.8));
      break;
    }
    case 3: {
      const bow = poly([-4, top, 4, top, w * 0.7, top + 6, w, bowBottom, -w, bowBottom, -w * 0.7, top + 6]);
      part(c, bow, SPACE.hull1, HULL_LINE, LINE, 0.65);
      // Wings with running lights.
      for (const s of [-1, 1]) {
        part(c, poly([s * w, bowBottom - 10, s * (w + 6), bowBottom - 2, s * (w + 6), bowBottom + 2, s * w, bowBottom]), SPACE.hull2, HULL_LINE, 1, 0);
        lamp(c, s * (w + 5.5), bowBottom, 0.9, s < 0 ? SPACE.red : SPACE.green, 3);
      }
      // Bridge tower.
      part(c, rrect(-3.5, top + 8, 7, 6, 1.5), SPACE.hull3, HULL_LINE, 0.9, 0);
      break;
    }
  }
  // Cockpit glass.
  const glassY = top + (o.hull === 3 ? 4 : 5);
  c.drawPath(poly([-2.6, glassY + 4, 0, glassY, 2.6, glassY + 4, 2, glassY + 5.5, -2, glassY + 5.5]), fill('#BFF4FF'));
  glow(c, 0, glassY + 3, 5, '#BFF4FF', 0.4);
  // Amber band across the bow.
  c.drawPath(line(-w * 0.75, bowBottom - 3, w * 0.75, bowBottom - 3), stroke(STRIPE, 1.2));
  void TAU;
}

/** Engine flames under the stern, `k` 0..1 (flicker; 1 = full burn while climbing). */
export function drawFreighterFlame(c: SkCanvas, hull: HullId, segments: number, k = 1): void {
  const { xs, y } = freighterEngines(hull, segments);
  const l = 6 + 12 * k;
  for (const x of xs) {
    c.drawPath(poly([x - 2.2, y, x, y + l, x + 2.2, y]), light(alpha(SPACE.flameOuter, 0.6)));
    c.drawPath(poly([x - 1.4, y, x, y + l * 0.7, x + 1.4, y]), light(alpha(SPACE.flame, 0.85)));
    c.drawPath(poly([x - 0.7, y, x, y + l * 0.35, x + 0.7, y]), light(SPACE.flameHot));
  }
}

/** The warp flash at progress `k` 0..1 (0.5 s): a radial burst plus 12 star streaks. */
export function drawWarpFlash(c: SkCanvas, k: number): void {
  const t = Math.max(0, Math.min(1, k));
  const fade = t < 0.25 ? t / 0.25 : 1 - (t - 0.25) / 0.75;
  const r = 10 + 60 * Math.sqrt(t);
  glow(c, 0, 0, r, '#CFF8FF', 0.85 * fade);
  c.drawCircle(0, 0, 3 + 10 * (1 - t), light(alpha('#FFFFFF', fade)));
  c.drawPath(circle(0, 0, r * 0.8), stroke(alpha(SPACE.line, 0.6 * fade), 1.5));
  for (let i = 0; i < 12; i++) {
    const a = (TAU * i) / 12 + 0.13;
    const r0 = 6 + 40 * t;
    const r1 = r0 + 10 + 30 * (1 - Math.abs(t - 0.4));
    const p = line(Math.cos(a) * r0, Math.sin(a) * r0, Math.cos(a) * r1, Math.sin(a) * r1);
    c.drawPath(p, stroke(alpha(i % 3 === 0 ? SPACE.gold : '#E8FBFF', fade), i % 3 === 0 ? 1.6 : 1.1));
  }
}

/** The launch pad in the bay (about 64 x 40 pt), with its landing ring (`lit`: brighter, when loaded). */
export function drawPad(c: SkCanvas, lit = false): void {
  const pad = rrect(-32, -20, 64, 40, 8);
  c.drawPath(pad, fill(SPACE.hull0));
  c.drawPath(pad, stroke(alpha(SPACE.steel, 0.35), 1));
  if (lit) glow(c, 0, 0, 24, SPACE.amber, 0.18);
  c.drawPath(circle(0, 0, 17), stroke(alpha(SPACE.amber, lit ? 0.9 : 0.35), lit ? 1.5 : 1));
  for (let i = 0; i < 8; i++) {
    const a = (TAU * i) / 8;
    c.drawCircle(Math.cos(a) * 17, Math.sin(a) * 17, 0.9, fill(SPACE.amber));
  }
  c.drawPath(line(-26, -14, -20, -14), stroke(alpha(SPACE.amber, 0.6), 1.2));
  c.drawPath(line(20, 14, 26, 14), stroke(alpha(SPACE.amber, 0.6), 1.2));
}

/** One of the triple chevrons over the pad (draw three, stepping up, pulse their alpha). */
export function drawChevron(c: SkCanvas, a = 1): void {
  const p = poly([-9, 3, 0, -3, 9, 3], false);
  c.drawPath(p, stroke(alpha(SPACE.amber, 0.25 * a), 5));
  c.drawPath(p, stroke(alpha(SPACE.amber, a), 2));
}


/** Freighter scale on the pad while the hold has cargo (critique S1: the money moment reads big). */
export const LOADED_FREIGHTER_SCALE = 1.3;

/** The levels at which the freighter changes (hull or segment) and `freighter_tier` plays (errata 40). */
export const FREIGHTER_TIER_LEVELS: readonly number[] = [1, 10, 25, 50, 75, 100, 125, 150, 175, 200, 225, 250];

/**
 * One stack of three chevrons over the pad ("swipe up"), origin at the lowest chevron's centre,
 * stepping up 7 pt. `k` 0..1 fills them bottom-up in sequence (loop it, about 1.2 s, while the
 * hold has cargo); `ready` false draws them dim and still.
 */
export function drawChevronStack(c: SkCanvas, k: number, ready = true): void {
  for (let i = 0; i < 3; i++) {
    const on = ready ? Math.max(0, Math.min(1, k * 3.6 - i * 1.1)) : 0;
    c.save();
    c.translate(0, -i * 7);
    drawChevron(c, ready ? 0.3 + 0.7 * on : 0.22);
    c.restore();
  }
}

/**
 * While the freighter is away: a progress arc round the empty pad (`k` 0..1 of the trip) and the
 * label beneath it ("BACK IN 9 S"). Origin at the pad centre.
 */
export function drawAwayArc(c: SkCanvas, k: number, label: string): void {
  const t = Math.max(0, Math.min(1, k));
  c.drawPath(circle(0, 0, 17), stroke(alpha(SPACE.steel, 0.25), 2.4));
  if (t > 0) {
    const a = arc(0, 0, 17, -90, 360 * t);
    c.drawPath(a, stroke(alpha(SPACE.line, 0.25), 5));
    c.drawPath(a, stroke(SPACE.line, 2.4));
  }
  drawText(c, label, 0, 22, { size: 5, color: SPACE.steel, align: 'center', glow: 0, weight: 1 });
}

/** The chip's words for a policy ('full' or 'contract'), from the string table (src/ui/haul/strings.ts). */
export function policyLabel(policy: string): string {
  return policy.toLowerCase() === 'contract' ? HAUL_STRINGS.autoContract : HAUL_STRINGS.autoFull;
}

/**
 * The autopilot policy chip "AUTO · FULL" (or "AUTO · CONTRACT") at the launch track's right end,
 * centred on the origin; the beacon dot blinks with the autopilot. Returns its size.
 */
export function drawPolicyChip(c: SkCanvas, policy: string, beaconOn = true): { w: number; h: number } {
  const text = policyLabel(policy);
  const size = 5;
  const w = textWidth(text, size) + 16;
  const h = 13;
  const chip = rrect(-w / 2, -h / 2, w, h, h / 2);
  c.drawPath(chip, fill(mix(SPACE.panel, SPACE.green, 0.12)));
  c.drawPath(chip, stroke(alpha(SPACE.green, 0.75), 1));
  if (beaconOn) lamp(c, -w / 2 + 6.5, 0, 1.5, SPACE.green, 4);
  else c.drawCircle(-w / 2 + 6.5, 0, 1.4, fill('#25402F'));
  drawText(c, text, -w / 2 + 11, -size / 2, { size, color: '#E6FFF0', glow: 0, weight: 1 });
  return { w, h };
}
