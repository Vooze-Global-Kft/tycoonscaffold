/**
 * Tamsin Station, seen from above (section 4.3), drawn for a station radius of 40 pt (scale the
 * canvas by radius / 40 for the 36 pt small layout). Origin at the station centre.
 *
 * Layers, bottom to top: dock arm, rack arms (with cradles), the outer ring (rotates once per
 * 40 s), struts and station parts, the hub (static), the autopilot beacon. Separate pictures so
 * the scene can turn the ring and the scanner dish and blink the beacon.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { drawText } from './glyphs';
import { SPACE, alpha, mix } from './palette';
import { DEG, LINE, TAU, arc, circle, fill, glow, lamp, line, litStroke, ngon, part, poly, rrect, stroke } from './pen';

export const STATION_R = 40;

/** Cradle centres of the rack arms (3 per side), relative to the station centre at radius 40. */
export const RACK_CRADLES: { x: number; y: number }[] = [
  { x: -50, y: 24 },
  { x: -72, y: 24 },
  { x: -94, y: 24 },
  { x: 50, y: 24 },
  { x: 72, y: 24 },
  { x: 94, y: 24 },
];

/** Where the "+n" count beyond six idle drones goes (right arm tip). */
export const RACK_OVERFLOW = { x: 108, y: 24 };

/** The Star Map nodes that add a station part, and where each part sits (angle in degrees, 0 = right). */
export const STATION_PARTS = ['prospect', 'veinsense', 'assay', 'brokerseat', 'seedcredits', 'sparedrones', 'afterburner'] as const;
export type StationPart = (typeof STATION_PARTS)[number];

const PART_ANGLE: Record<Exclude<StationPart, 'afterburner'>, number> = {
  brokerseat: -162,
  veinsense: -138,
  sparedrones: -114,
  prospect: -90,
  assay: -64,
  seedcredits: -40,
};
const PART_R = 55;

/** Centre of a station part (the afterburner booster ring is centred on the station). */
export function stationPartPos(id: StationPart): { x: number; y: number } {
  if (id === 'afterburner') return { x: 0, y: 0 };
  const a = PART_ANGLE[id] * DEG;
  return { x: Math.cos(a) * PART_R, y: Math.sin(a) * PART_R };
}

/** The autopilot beacon's position (on the dock arm). */
export const BEACON_POS = { x: 9, y: 50 };

// ---------------------------------------------------------------------------

/** The dock arm from the hub down to the bay pad. */
export function drawDockArm(c: SkCanvas): void {
  const arm = poly([-6, 30, 6, 30, 5, 60, -5, 60]);
  part(c, arm, SPACE.hull1, SPACE.lineDim, 1.2, 0.4);
  for (let y = 38; y < 60; y += 6) c.drawPath(line(-4, y, 4, y + 4), stroke(alpha(SPACE.steel, 0.5), 0.8));
  // Guide lights along it.
  for (const y of [44, 54]) {
    c.drawCircle(-3, y, 0.9, fill(SPACE.amber));
    c.drawCircle(3, y, 0.9, fill(SPACE.amber));
  }
}

/** One rack arm (`side` -1 left, 1 right) with three empty cradles. */
export function drawRackArm(c: SkCanvas, side: -1 | 1): void {
  c.save();
  c.scale(side, 1);
  // Truss beam.
  const beam = poly([34, 4, 106, 8, 106, 13, 34, 15]);
  part(c, beam, SPACE.hull1, SPACE.lineDim, 1.2, 0.4);
  for (let x = 40; x < 104; x += 8) c.drawPath(line(x, 13.5, x + 4, 5.5), stroke(alpha(SPACE.steel, 0.45), 0.7));
  // Cradles: U-brackets with a glowing landing ring.
  for (const x of [50, 72, 94]) {
    c.drawPath(line(x, 13, x, 17), stroke(SPACE.steelDim, 1.6));
    // Cradle: a dark landing pad with a lit rim and three clamps.
    c.drawPath(circle(x, 24, 7.5), fill(SPACE.hull0));
    c.drawPath(circle(x, 24, 7.5), stroke(alpha(SPACE.line, 0.4), 0.9));
    for (const a of [-90, 30, 150]) {
      const r = a * DEG;
      c.drawPath(line(x + Math.cos(r) * 6.2, 24 + Math.sin(r) * 6.2, x + Math.cos(r) * 8.8, 24 + Math.sin(r) * 8.8), stroke(SPACE.steel, 1.6));
    }
  }
  // Tip light.
  lamp(c, 106, 10.5, 1, SPACE.line, 3);
  c.restore();
}

/** The outer ring with six lit windows and three spokes (rotates once per 40 s). */
export function drawStationRing(c: SkCanvas): void {
  glow(c, 0, 0, 52, SPACE.line, 0.12);
  // Spokes to the hub.
  for (let i = 0; i < 3; i++) {
    const a = (TAU * i) / 3 + 0.3;
    const s = line(Math.cos(a) * 22, Math.sin(a) * 22, Math.cos(a) * 34, Math.sin(a) * 34);
    c.drawPath(s, stroke(SPACE.hull2, 4));
    c.drawPath(s, stroke(alpha(SPACE.steel, 0.6), 1));
  }
  // The band: an annulus 33 to 40.
  c.drawPath(circle(0, 0, 36.5), stroke(SPACE.hull1, 7));
  litStroke(c, circle(0, 0, 40), SPACE.line, LINE, 1);
  c.drawPath(circle(0, 0, 33), stroke(SPACE.lineDim, 1));
  // Segment seams.
  for (let i = 0; i < 12; i++) {
    const a = (TAU * i) / 12;
    c.drawPath(line(Math.cos(a) * 33.5, Math.sin(a) * 33.5, Math.cos(a) * 39.5, Math.sin(a) * 39.5), stroke(alpha(SPACE.steel, 0.35), 0.7));
  }
  // Six lit windows.
  for (let i = 0; i < 6; i++) {
    const a = (TAU * i) / 6 + TAU / 24;
    const x = Math.cos(a) * 36.5;
    const y = Math.sin(a) * 36.5;
    glow(c, x, y, 6, '#BFF4FF', 0.5);
    c.save();
    c.translate(x, y);
    c.rotate(a / DEG + 90, 0, 0);
    c.drawPath(rrect(-3.2, -1.3, 6.4, 2.6, 1.1), fill('#D9FBFF'));
    c.restore();
  }
}

/** The hub (static): plated disc with the station core. */
export function drawStationHub(c: SkCanvas): void {
  const hub = circle(0, 0, 22);
  part(c, hub, SPACE.hull1, SPACE.line, LINE, 0.8);
  // Plating: an inner octagon and panel lines.
  const oct = ngon(0, 0, 17, 8, TAU / 16);
  c.drawPath(oct, fill(SPACE.hull2));
  c.drawPath(oct, stroke(alpha(SPACE.line, 0.45), 0.9));
  for (let i = 0; i < 8; i++) {
    const a = (TAU * i) / 8 + TAU / 16;
    c.drawPath(line(Math.cos(a) * 9.5, Math.sin(a) * 9.5, Math.cos(a) * 17, Math.sin(a) * 17), stroke(alpha(SPACE.steel, 0.35), 0.7));
  }
  // The core: a glowing hex (TALLY lives here).
  glow(c, 0, 0, 16, SPACE.line, 0.5);
  const core = ngon(0, 0, 8.5, 6, -Math.PI / 2);
  c.drawPath(core, fill(SPACE.hull0));
  litStroke(c, core, SPACE.line, 1.4, 1);
  c.drawPath(ngon(0, 0, 4.4, 6, -Math.PI / 2), fill(mix(SPACE.line, '#FFFFFF', 0.4)));
  // Docking clamps round the rim.
  for (const a of [45, 135, 225, 315]) {
    const r = a * DEG;
    c.drawCircle(Math.cos(r) * 19.5, Math.sin(r) * 19.5, 1.3, fill(SPACE.steel));
  }
}

/** The whole station without parts: dock arm, both rack arms, ring at `ringTurn` degrees, hub. */
export function drawStation(c: SkCanvas, ringTurn = 0): void {
  drawDockArm(c);
  drawRackArm(c, -1);
  drawRackArm(c, 1);
  c.save();
  c.rotate(ringTurn, 0, 0);
  drawStationRing(c);
  c.restore();
  drawStationHub(c);
}

// ---------------------------------------------------------------------------
// Station parts (one per Star Map node at level >= 1)
// ---------------------------------------------------------------------------

function strut(c: SkCanvas, id: StationPart): void {
  const p = stationPartPos(id);
  const d = Math.hypot(p.x, p.y);
  const ux = p.x / d;
  const uy = p.y / d;
  c.drawPath(line(ux * 40, uy * 40, p.x - ux * 6, p.y - uy * 6), stroke(SPACE.hull2, 3));
  c.drawPath(line(ux * 40, uy * 40, p.x - ux * 6, p.y - uy * 6), stroke(alpha(SPACE.steel, 0.7), 0.9));
}

/**
 * Draws a station part at the origin (translate to stationPartPos first, or use drawStationPart).
 * `level` matters for the survey array (one petal per 5 levels, up to 8) and the hangar (one door
 * per level, up to 6).
 */
export function drawPartShape(c: SkCanvas, id: StationPart, level = 1): void {
  switch (id) {
    case 'prospect': {
      // Survey array: a hub with petals.
      const petals = Math.max(1, Math.min(8, Math.ceil(level / 5)));
      for (let i = 0; i < 8; i++) {
        const a = (TAU * i) / 8 - Math.PI / 2;
        const on = i < petals;
        const petal = poly([Math.cos(a - 0.22) * 3.5, Math.sin(a - 0.22) * 3.5, Math.cos(a) * 10, Math.sin(a) * 10, Math.cos(a + 0.22) * 3.5, Math.sin(a + 0.22) * 3.5]);
        if (on) part(c, petal, mix(SPACE.hull2, SPACE.line, 0.25), SPACE.line, 0.9, 0.5);
        else c.drawPath(petal, stroke(alpha(SPACE.steel, 0.25), 0.6));
      }
      part(c, circle(0, 0, 3.6), SPACE.hull1, SPACE.line, 1, 0.6);
      c.drawCircle(0, 0, 1.4, fill(SPACE.white));
      break;
    }
    case 'veinsense': {
      // Scanner dish (the scene sweeps it ±30° over 6 s): drawn facing up.
      drawScannerDish(c);
      break;
    }
    case 'assay': {
      // Assay lab pod: a capsule with a lit ore sample window.
      const pod = rrect(-7, -5, 14, 10, 5);
      part(c, pod, SPACE.hull1, SPACE.line, 1.1, 0.6);
      c.drawPath(rrect(-4.5, -2.2, 9, 4.4, 2.2), fill(alpha(SPACE.gold, 0.85)));
      for (const x of [-2.2, 0, 2.2]) c.drawCircle(x, 0, 0.8, fill(SPACE.bg));
      break;
    }
    case 'brokerseat': {
      // Antenna mast: a lattice tower with a tip light, seen slightly from the side.
      c.drawPath(poly([-3, 6, 0, -9, 3, 6], false), stroke(SPACE.steel, 1.1));
      for (let y = 3; y > -7; y -= 3.5) c.drawPath(line(-2.4 + (3 - y) * 0.05, y, 2.4 - (3 - y) * 0.05, y), stroke(alpha(SPACE.steel, 0.7), 0.7));
      c.drawPath(arc(0, -9, 5, -150, 120), stroke(alpha(SPACE.line, 0.6), 0.8));
      c.drawPath(arc(0, -9, 8, -145, 110), stroke(alpha(SPACE.line, 0.35), 0.8));
      lamp(c, 0, -9, 1.2, SPACE.red, 4);
      part(c, rrect(-4, 5, 8, 3, 1), SPACE.hull2, SPACE.lineDim, 0.8, 0);
      break;
    }
    case 'seedcredits': {
      // Vault block: a heavy armoured box with a gold credit mark.
      const box = rrect(-7, -6, 14, 12, 1.5);
      part(c, box, SPACE.hull2, SPACE.steel, 1.1, 0.4);
      c.drawPath(rrect(-5, -4, 10, 8, 1), stroke(alpha(SPACE.steel, 0.5), 0.7));
      drawText(c, '₵', 0, -2.6, { size: 5.2, color: SPACE.gold, align: 'center', weight: 1, glow: 0.8 });
      break;
    }
    case 'sparedrones': {
      // Hangar: a long block with one lit door per level (up to 6).
      const doors = Math.max(1, Math.min(6, level));
      const box = rrect(-10, -5, 20, 10, 2);
      part(c, box, SPACE.hull1, SPACE.line, 1.1, 0.5);
      for (let i = 0; i < 6; i++) {
        const x = -8.6 + i * 2.95;
        const on = i < doors;
        c.drawPath(rrect(x, -3, 2.3, 6, 0.6), fill(on ? alpha(SPACE.line, 0.9) : SPACE.hull0));
      }
      break;
    }
    case 'afterburner': {
      // Booster ring: a thin ring outside the station ring with four nozzles.
      c.drawPath(circle(0, 0, 45), stroke(alpha(SPACE.flame, 0.25), 3));
      c.drawPath(circle(0, 0, 45), stroke(SPACE.flame, 0.9));
      for (const a of [45, 135, 225, 315]) {
        const r = a * DEG;
        c.save();
        c.translate(Math.cos(r) * 45, Math.sin(r) * 45);
        c.rotate(a + 90, 0, 0);
        part(c, poly([-3, -2.4, 3, -2.4, 2, 2.4, -2, 2.4]), SPACE.hull2, SPACE.flame, 0.9, 0.5);
        glow(c, 0, 3.5, 4, SPACE.flame, 0.6);
        c.restore();
      }
      break;
    }
  }
}

/** The scanner dish alone, facing up (rotate it for the sweep). */
export function drawScannerDish(c: SkCanvas): void {
  c.drawPath(line(0, 6, 0, 1), stroke(SPACE.steel, 1.4));
  const dish = poly([-8, -2, -4, 2.5, 4, 2.5, 8, -2]);
  part(c, dish, SPACE.hull2, SPACE.line, 1.1, 0.6);
  c.drawPath(line(0, 2, 0, -6), stroke(alpha(SPACE.steel, 0.8), 0.8));
  lamp(c, 0, -6.5, 1, SPACE.line, 3.5);
  // A faint scan cone.
  c.drawPath(poly([0, -6.5, -9, -18, 9, -18]), fill(alpha(SPACE.line, 0.07)));
}

/** A station part in place, with its strut (the dish without its sweep). */
export function drawStationPart(c: SkCanvas, id: StationPart, level = 1): void {
  const p = stationPartPos(id);
  if (id !== 'afterburner') strut(c, id);
  c.save();
  c.translate(p.x, p.y);
  if (id !== 'afterburner') c.rotate(PART_ANGLE[id as Exclude<StationPart, 'afterburner'>] + 90, 0, 0);
  drawPartShape(c, id, level);
  c.restore();
}

/** The autopilot beacon, lit or dark (blink 1 Hz by alternating). */
export function drawBeacon(c: SkCanvas, on: boolean): void {
  part(c, rrect(-2.6, -2.6, 5.2, 5.2, 1.2), SPACE.hull2, SPACE.steel, 0.9, 0);
  if (on) lamp(c, 0, 0, 1.6, SPACE.green, 7);
  else c.drawCircle(0, 0, 1.4, fill('#25402F'));
}
