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
import { DEG, LINE, TAU, arc, circle, fill, glow, lamp, light, line, litStroke, ngon, part, poly, rrect, stroke } from './pen';

export const STATION_R = 40;

/**
 * The rack arms' curve (right arm; the left one mirrors it): the arm's centre line at x (34..106)
 * droops toward the bay, a crescent that follows the outer ring (second pass, critique M7).
 */
export function rackArmY(x: number): number {
  const d = Math.max(0, Math.abs(x) - 34);
  return 16 + 0.0035 * d * d;
}

/**
 * Cradle centres of the rack arms (3 per side), relative to the station centre at radius 40:
 * where an idle drone sits (nose up), in an open U-bracket on top of the arm.
 */
export const RACK_CRADLES: { x: number; y: number }[] = [-50, -72, -94, 50, 72, 94].map((x) => ({ x, y: Math.round((rackArmY(x) - 9) * 10) / 10 }));

/** Where the "+n" count beyond six idle drones goes (just outside the right arm's tip). */
export const RACK_OVERFLOW = { x: 113, y: 40 };

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

/**
 * One rack arm (`side` -1 left, 1 right): a drooping crescent truss with three open U-brackets on
 * top of it (the cradles). The two arms differ: the left one ends in a whip antenna with a red
 * nav light, the right one carries a finned radiator under it and a green nav light at its tip
 * (blink the nav lights 0.5 s apart if the scene wants them alive).
 */
export function drawRackArm(c: SkCanvas, side: -1 | 1): void {
  c.save();
  c.scale(side, 1);
  // Truss beam: sampled along the curve, 7 pt thick at the root tapering to 4.5 at the tip.
  const top: number[] = [];
  const bot: number[] = [];
  for (let x = 32; x <= 106; x += 4) {
    const y = rackArmY(x);
    const t = (x - 32) / 74;
    const hw = 3.5 - 1.25 * t;
    top.push(x, y - hw);
    bot.unshift(x, y + hw);
  }
  const beam = poly([...top, ...bot]);
  part(c, beam, SPACE.hull1, SPACE.lineDim, 1.2, 0.4);
  for (let x = 38; x < 102; x += 7) {
    const y0 = rackArmY(x);
    const y1 = rackArmY(x + 4);
    c.drawPath(line(x, y0 + 2.2, x + 4, y1 - 2.2), stroke(alpha(SPACE.steel, 0.45), 0.7));
  }
  if (side === 1) {
    // Radiator under the right arm: a finned panel between the cradles.
    const rx0 = 58;
    const rx1 = 86;
    const pts: number[] = [];
    for (let x = rx0; x <= rx1; x += 2) pts.push(x, rackArmY(x) + 3);
    for (let x = rx1; x >= rx0; x -= 2) pts.push(x, rackArmY(x) + 9);
    const rad = poly(pts);
    part(c, rad, SPACE.hull0, alpha(SPACE.steel, 0.7), 0.9, 0);
    for (let x = rx0 + 3; x < rx1; x += 3) c.drawPath(line(x, rackArmY(x) + 4, x, rackArmY(x) + 8), stroke(alpha(SPACE.amber, 0.45), 0.8));
  } else {
    // Whip antenna off the left arm's tip.
    const ty = rackArmY(106);
    c.drawPath(line(104, ty, 112, ty - 14), stroke(SPACE.steel, 1.1));
    c.drawPath(line(107, ty - 6, 111, ty - 4), stroke(alpha(SPACE.steel, 0.7), 0.8));
  }
  // Cradles: open U-brackets standing on the arm, tilted with it.
  for (const x of [50, 72, 94]) {
    const y = rackArmY(x);
    const slope = Math.atan2(rackArmY(x + 1) - rackArmY(x - 1), 2) / DEG;
    c.save();
    c.translate(x, y - 9);
    c.rotate(slope, 0, 0);
    // Landing glow where a drone sits.
    c.drawPath(circle(0, 0, 6.5), fill(alpha(SPACE.line, 0.05)));
    const u = poly([-7.5, -3, -7.5, 4.5, -5, 7, 5, 7, 7.5, 4.5, 7.5, -3], false);
    c.drawPath(u, stroke(SPACE.hull0, 3.4));
    c.drawPath(u, stroke(SPACE.steel, 1.5));
    c.drawPath(line(0, 7, 0, 9.5), stroke(SPACE.steelDim, 2));
    for (const sx of [-7.5, 7.5]) c.drawCircle(sx, -3, 1, fill(alpha(SPACE.line, 0.8)));
    c.restore();
  }
  // Nav light: red on the left (antenna tip), green on the right (arm tip).
  if (side === 1) lamp(c, 106, rackArmY(106), 1.1, SPACE.green, 3.5);
  else lamp(c, 112, rackArmY(106) - 14, 1.1, SPACE.red, 3.5);
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

/** The hub outline: an octagon with two long flats (left and right), not a disc. */
function hubPath(k = 1) {
  return poly([-13 * k, -20 * k, 13 * k, -20 * k, 22 * k, -10 * k, 22 * k, 10 * k, 13 * k, 20 * k, -13 * k, 20 * k, -22 * k, 10 * k, -22 * k, -10 * k]);
}

/** The hub (static): a plated octagon with two long flats, and the station core. */
export function drawStationHub(c: SkCanvas): void {
  const hub = hubPath();
  part(c, hub, SPACE.hull1, SPACE.line, LINE, 0.8);
  const inner = hubPath(0.76);
  c.drawPath(inner, fill(SPACE.hull2));
  c.drawPath(inner, stroke(alpha(SPACE.line, 0.4), 0.9));
  // Panel lines and two vents on the long flats.
  for (const [x0, y0, x1, y1] of [
    [-9.9, -15.2, -5, -8],
    [9.9, -15.2, 5, -8],
    [-9.9, 15.2, -5, 8],
    [9.9, 15.2, 5, 8],
  ])
    c.drawPath(line(x0, y0, x1, y1), stroke(alpha(SPACE.steel, 0.35), 0.7));
  for (const sx of [-1, 1]) for (const y of [-4, 0, 4]) c.drawPath(line(sx * 19.5, y, sx * 15.5, y), stroke(alpha(SPACE.steel, 0.55), 1));
  // The core: a glowing hex (TALLY lives here).
  glow(c, 0, 0, 15, SPACE.line, 0.5);
  const core = ngon(0, 0, 8, 6, -Math.PI / 2);
  c.drawPath(core, fill(SPACE.hull0));
  litStroke(c, core, SPACE.line, 1.4, 1);
  c.drawPath(ngon(0, 0, 4.2, 6, -Math.PI / 2), fill(mix(SPACE.line, '#FFFFFF', 0.4)));
  // Docking clamps on the short faces.
  for (const [x, y] of [
    [0, -18],
    [0, 18],
  ])
    c.drawCircle(x, y, 1.3, fill(SPACE.steel));
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
      // Assay lab pod: a round pod with a beaker-shaped sample window.
      const pod = circle(0, 0, 7);
      part(c, pod, SPACE.hull1, SPACE.line, 1.1, 0.6);
      const beaker = poly([-1.4, -4.6, 1.4, -4.6, 1.4, -1.2, 4, 3.6, -4, 3.6, -1.4, -1.2]);
      c.drawPath(beaker, fill(SPACE.hull0));
      c.drawPath(poly([-2.7, 1.2, 2.7, 1.2, 4, 3.6, -4, 3.6]), fill(SPACE.gold));
      c.drawPath(beaker, stroke(mix(SPACE.gold, '#FFFFFF', 0.3), 0.8));
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
      // Hangar: a block with slanted roll-up doors, one per level (up to 6); behind each open
      // door a drone's nose shows.
      const doors = Math.max(1, Math.min(6, level));
      const box = poly([-11, -5, 11, -5, 12, 5, -12, 5]);
      part(c, box, SPACE.hull1, SPACE.line, 1.1, 0.5);
      for (let i = 0; i < 6; i++) {
        const x = -9.6 + i * 3.25;
        const on = i < doors;
        const door = poly([x, -3.2, x + 2.5, -3.2, x + 3.3, 3.6, x + 0.8, 3.6]);
        c.drawPath(door, fill(on ? SPACE.hull0 : SPACE.hull2));
        if (on) {
          // Roll-up door half raised, a lit drone nose under it.
          c.drawPath(poly([x, -3.2, x + 2.5, -3.2, x + 2.8, -0.8, x + 0.3, -0.8]), fill(alpha(SPACE.steel, 0.8)));
          c.drawPath(poly([x + 1, 3.4, x + 1.8, 0.6, x + 2.6, 3.4]), fill(SPACE.line));
        } else c.drawPath(door, stroke(alpha(SPACE.steel, 0.35), 0.5));
      }
      break;
    }
    case 'afterburner': {
      // Booster ring: a full 2 pt ring outside the station ring with four nozzle flares.
      c.drawPath(circle(0, 0, 45), stroke(alpha(SPACE.flame, 0.22), 6));
      c.drawPath(circle(0, 0, 45), stroke(SPACE.flame, 2));
      for (const a of [45, 135, 225, 315]) {
        const r = a * DEG;
        c.save();
        c.translate(Math.cos(r) * 45, Math.sin(r) * 45);
        c.rotate(a - 90, 0, 0);
        c.drawPath(poly([-3.2, 3, 0, 13, 3.2, 3]), light(alpha(SPACE.flameOuter, 0.55)));
        c.drawPath(poly([-1.8, 3, 0, 9, 1.8, 3]), light(alpha(SPACE.flame, 0.85)));
        part(c, poly([-4, -3, 4, -3, 3, 3.5, -3, 3.5]), SPACE.hull2, SPACE.flame, 1, 0.6);
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

// ---------------------------------------------------------------------------
// The eight Star Map nodes and their parts (errata 39)
// ---------------------------------------------------------------------------

/** The eight Star Map node ids, arm by arm: Survey 3, Trade 2, Fleet 3 (spec 2.10). */
export const STAR_NODES = ['prospect', 'veinsense', 'assay', 'brokerseat', 'seedcredits', 'preload', 'sparedrones', 'afterburner'] as const;
export type StarNode = (typeof STAR_NODES)[number];

/** The arm of each node. */
export const NODE_ARM: Record<StarNode, 'survey' | 'trade' | 'fleet'> = {
  prospect: 'survey',
  veinsense: 'survey',
  assay: 'survey',
  brokerseat: 'trade',
  seedcredits: 'trade',
  preload: 'fleet',
  sparedrones: 'fleet',
  afterburner: 'fleet',
};

/**
 * The station part each node adds, named as errata 39 names them. Systems Preload's part is the
 * autopilot beacon: one drawing (`drawBeacon`), lit whenever the autopilot is online.
 */
export const STATION_PART_NAMES: Record<StarNode, string> = {
  prospect: 'survey array',
  veinsense: 'scanner dish',
  assay: 'assay lab pod',
  brokerseat: 'antenna mast',
  seedcredits: 'vault block',
  preload: 'beacon',
  sparedrones: 'hangar doors',
  afterburner: 'booster ring',
};

/** The first four parts in the bot's buying order (errata 39). */
export const FIRST_FOUR_PARTS: readonly StarNode[] = ['preload', 'assay', 'afterburner', 'seedcredits'];

/**
 * A node's part in place on the station (origin at the station centre, radius 40): the seven
 * strut parts through `drawStationPart`, Systems Preload as the beacon at BEACON_POS (`on`: the
 * autopilot is online; with Preload it is from the start).
 */
export function drawNodePart(c: SkCanvas, node: StarNode, level = 1, on = true): void {
  if (node === 'preload') {
    c.save();
    c.translate(BEACON_POS.x, BEACON_POS.y);
    drawBeacon(c, on);
    c.restore();
    return;
  }
  drawStationPart(c, node, level);
}

/** A node's part alone, centred, upright (for node pictures and icons; the beacon lit). */
export function drawNodePartShape(c: SkCanvas, node: StarNode, level = 1): void {
  if (node === 'preload') {
    c.save();
    c.scale(1.8, 1.8);
    drawBeacon(c, true);
    c.restore();
    return;
  }
  if (node === 'afterburner') {
    // The booster ring at icon scale: a 2 pt ring with four nozzle flares pointing outward.
    c.drawPath(circle(0, 0, 8), stroke(alpha(SPACE.flame, 0.25), 4));
    c.drawPath(circle(0, 0, 8), stroke(SPACE.flame, 1.8));
    for (const a of [45, 135, 225, 315]) {
      const r = a * DEG;
      c.save();
      c.translate(Math.cos(r) * 8, Math.sin(r) * 8);
      c.rotate(a - 90, 0, 0);
      c.drawPath(poly([-2, 2, 0, 8, 2, 2]), light(alpha(SPACE.flame, 0.85)));
      part(c, poly([-2.6, -2, 2.6, -2, 2, 2.4, -2, 2.4]), SPACE.hull2, SPACE.flame, 0.8, 0.4);
      c.restore();
    }
    c.drawPath(circle(0, 0, 3), fill(SPACE.hull1));
    c.drawPath(circle(0, 0, 3), stroke(SPACE.line, 0.9));
    return;
  }
  drawPartShape(c, node, level);
}

/**
 * The rack's "+n" plate (errata 41: the scene draws at most 6 drones on the rack; the plate shows
 * the true number beyond them). Draw it at RACK_OVERFLOW, centred on the origin.
 */
export function drawRackOverflow(c: SkCanvas, n: number): void {
  const text = `+${n}`;
  const w = Math.max(14, text.length * 4.4 + 7);
  const plate = rrect(-w / 2, -6, w, 12, 6);
  c.drawPath(plate, fill(SPACE.panel));
  c.drawPath(plate, stroke(SPACE.line, 1.1));
  drawText(c, text, 0, -3, { size: 6, color: SPACE.white, align: 'center', glow: 0, weight: 1.1 });
}
