/**
 * Heaps, beds and loads (the artist "things"): a ferrous bay's heap of one grade at five fill levels, the
 * old stock's ground bed per zone (the loose scrap round the whole things the world places one by one),
 * and a partner's skip seen from above with its contents (the skip card). Every heap is made of the
 * grade's own pieces (pieces.draw.ts), so it reads by shape and value, never as a coloured mound.
 */
import { ClipOp, type SkCanvas } from '@shopify/react-native-skia';
import { YARD, mix, shade } from './palette';
import { builder, circle, fill, groundShadow, hash01, oval, poly, proj, rrect, segment, stroke, type View3q } from './pen';
import { CAR_PAINTS, TONE, brassElbow, brassValve, pieceGlyph } from './pieces.draw';

const INK = YARD.ink;

// ---------------------------------------------------------------------------
// Bay heaps: one grade, five fill levels
// ---------------------------------------------------------------------------

/** The ferrous grades (content2 ids) that have lock-block bays, and how their heaps are built. */
export const BAY_GRADES = ['li', 'appl', 'ci', 'ciu', 'hms', 'hmsu', 'cbody'] as const;
export type BayGrade = (typeof BAY_GRADES)[number];

/** A heap unit's size at a fill level (1..5): width and depth on the ground, height, metres. */
export function heapSize(level: number): { w: number; d: number; h: number } {
  const k = Math.max(1, Math.min(5, level));
  return { w: 0.9 + 0.3 * (k - 1), d: 0.7 + 0.18 * (k - 1), h: 0.16 + 0.19 * (k - 1) };
}

/** Pieces of a bay grade as pieceGlyph kinds, with their size in metres. */
const BAY_PIECES: Readonly<Record<BayGrade, readonly (readonly [string, number])[]>> = {
  li: [['light_iron', 0.42], ['panel', 0.44], ['drum', 0.36], ['sheet', 0.5], ['gate', 0.5], ['bike', 0.5]],
  appl: [['washer', 0.36], ['panel', 0.44], ['washer', 0.36], ['fridge', 0.4]],
  ci: [['shard', 0.38], ['section', 0.34], ['shard_enamel', 0.4], ['shard', 0.32]],
  ciu: [['radiator', 0.5], ['stove', 0.36], ['radiator', 0.46], ['shard', 0.34]],
  hms: [['beam', 0.55], ['plate', 0.42], ['beam', 0.5], ['plate', 0.38]],
  hmsu: [['beam', 0.9], ['plate', 0.5], ['beam', 0.8], ['plough', 0.6]],
  cbody: [['body', 0.6], ['body', 0.55], ['body', 0.5]],
};

/** A small whole appliance seen at bay size (a washer or a fridge on its side), screen points. */
function appliance(c: SkCanvas, s: number, fridge: boolean, seed: number): void {
  const w = fridge ? s * 0.5 : s * 0.42;
  const h = fridge ? s * 0.32 : s * 0.42;
  const top = poly([-w / 2, -h / 2, w / 2 - 2, -h / 2, w / 2, -h / 2 + 2, -w / 2 + 2, -h / 2 + 2]);
  c.drawPath(rrect(-w / 2, -h / 2, w, h, 1), fill(YARD.enamel));
  c.drawPath(top, fill('#FFFFFF'));
  if (fridge) c.drawPath(segment(-w / 2 + 2, h * 0.05, w / 2 - 2, h * 0.05), stroke(YARD.paperLine, 0.8));
  else {
    c.drawPath(circle(0, h * 0.08, h * 0.26), fill(YARD.glassDark));
    c.drawPath(circle(0, h * 0.08, h * 0.26), stroke(INK, 0.7));
  }
  c.drawPath(rrect(-w / 2, -h / 2, w, h, 1), stroke(INK, 0.9));
  c.drawPath(circle(-w * 0.3 + hash01(seed) * w * 0.5, -h * 0.25, 0.8), fill(YARD.rust));
}

/** A small cast-iron radiator or stove at bay size. */
function castWhole(c: SkCanvas, s: number, stove: boolean): void {
  const m = YARD.castIron;
  if (stove) {
    const w = s * 0.5;
    const h = s * 0.5;
    c.drawPath(rrect(-w / 2, -h / 2, w, h, 1), fill(m));
    c.drawPath(rrect(-w / 2, -h / 2, w, h * 0.22, 1), fill(shade(m, 0.25)));
    c.drawPath(rrect(-w * 0.3, -h * 0.1, w * 0.6, h * 0.45, 1), stroke(shade(m, 0.35), 0.9));
    c.drawPath(rrect(-w / 2, -h / 2, w, h, 1), stroke(INK, 0.9));
    return;
  }
  const n = 6;
  const w = s;
  const h = s * 0.42;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + (w / n) * i;
    c.drawPath(rrect(x + 0.4, -h / 2, w / n - 0.8, h, (w / n) * 0.4), fill(i % 2 ? m : shade(m, 0.1)));
    c.drawPath(rrect(x + 0.4, -h / 2, w / n - 0.8, h, (w / n) * 0.4), stroke(INK, 0.7));
  }
}

/** A plough frame at bay size. */
function ploughSmall(c: SkCanvas, s: number): void {
  const paint = mix(YARD.containerOxide, '#6B4A3E', 0.3);
  const p = builder().moveTo(-s / 2, -s * 0.1).lineTo(s * 0.35, -s * 0.18).lineTo(s / 2, -s * 0.02).build();
  c.drawPath(p, stroke(INK, 4));
  c.drawPath(p, stroke(paint, 2.4));
  for (const x of [-s * 0.3, 0, s * 0.25]) {
    const t = builder().moveTo(x, -s * 0.12).quadTo(x + 1, s * 0.12, x + 4, s * 0.2).build();
    c.drawPath(t, stroke(INK, 3.4));
    c.drawPath(t, stroke(TONE.steelCut, 2));
  }
}

function bayPiece(c: SkCanvas, kind: string, x: number, y: number, s: number, turn: number, seed: number): void {
  if (kind === 'washer' || kind === 'fridge' || kind === 'radiator' || kind === 'stove' || kind === 'plough') {
    c.save();
    c.translate(x, y);
    c.rotate(turn * 0.4, 0, 0);
    if (kind === 'washer' || kind === 'fridge') appliance(c, s, kind === 'fridge', seed);
    else if (kind === 'plough') ploughSmall(c, s);
    else castWhole(c, s, kind === 'stove');
    c.restore();
    return;
  }
  pieceGlyph(c, kind, x, y, s, turn, seed);
}

/** The base tone of a grade's mound (the gaps between pieces). */
function moundTone(grade: string): string {
  switch (grade) {
    case 'ci':
    case 'ciu':
      return shade(TONE.cast, -0.12);
    case 'hms':
    case 'hmsu':
      return mix(TONE.steel, YARD.rust, 0.25);
    case 'cbody':
      return shade(CAR_PAINTS[0], -0.5);
    case 'appl':
      return mix(TONE.ironLo, YARD.enamel, 0.3);
    default:
      return shade(TONE.ironLo, -0.05);
  }
}

/**
 * A bay heap unit of one ferrous grade at a fill level 1..5, anchored at its footprint centre. The pieces
 * are the grade's own (BAY_PIECES), piled back to front on a low mound of the grade's dark tone.
 */
export function drawBayHeapLevel(c: SkCanvas, v: View3q, grade: string, level: number, seed = 3): void {
  const g = ((BAY_GRADES as readonly string[]).includes(grade) ? grade : 'li') as BayGrade;
  const { w, d, h } = heapSize(level);
  groundShadow(c, v, w / 2 + 0.05, d / 2, 0, 0, h * 0.7);
  const W = (w / 2) * v.ppm;
  const D = (d / 2) * v.ppm * v.tilt;
  const H = h * v.ppm * v.lift;
  const [, yc] = proj(v, 0, 0, 0);
  // the mound: a lumpy dome over the footprint
  const pts: number[] = [];
  const n = 11;
  for (let i = 0; i <= n; i++) {
    const a = i / n;
    const x = -W + 2 * W * a;
    const bump = 0.8 + hash01(seed, i, level) * 0.32;
    pts.push(x, yc - D * 0.2 - H * Math.sin(Math.PI * a) ** 0.8 * bump);
  }
  pts.push(W * 0.8, yc + D * 0.7, 0, yc + D, -W * 0.8, yc + D * 0.7);
  const mound = poly(pts);
  c.drawPath(mound, fill(moundTone(g)));
  // the low sun on the heap's west shoulder, its east side in shade
  c.save();
  c.clipPath(mound, ClipOp.Intersect, true);
  c.drawPath(oval(-W * 0.35, yc - D * 0.2 - H * 0.75, W * 0.7, H * 0.6 + D * 0.3), fill(shade(moundTone(g), 0.22)));
  c.drawPath(oval(W * 0.7, yc, W * 0.5, H + D), fill(shade(moundTone(g), -0.25), 0.6));
  c.restore();
  c.drawPath(mound, stroke(INK, 1));
  // pieces: count by the heap's area, placed in the dome, sorted back to front
  const list = BAY_PIECES[g];
  const count = Math.round(6 + level * 5);
  const items: [number, number, number][] = [];
  for (let i = 0; i < count; i++) {
    const u = hash01(seed, i, 21) * 2 - 1;
    const dome = 1 - u * u;
    const yTop = yc - D * 0.2 - H * dome ** 0.8 * 0.9;
    const yBot = yc + D * 0.6 * Math.sqrt(dome);
    const y = yTop + 2 + (yBot - yTop) * hash01(seed, i, 22) ** 1.8;
    items.push([u * W * 0.88, y, i]);
  }
  items.sort((p, q) => p[1] - q[1]);
  for (const [x, y, i] of items) {
    const [kind, m] = list[i % list.length];
    const s = m * v.ppm * (0.85 + hash01(seed, i, 23) * 0.3);
    bayPiece(c, kind, x, y, s, (hash01(seed, i, 24) - 0.5) * 50, seed * 37 + i);
  }
}

// ---------------------------------------------------------------------------
// The old stock's beds: the loose scrap under each zone's whole things
// ---------------------------------------------------------------------------

export const ZONE_BEDS = ['zone1', 'zone2', 'zone3'] as const;

/** The loose pieces a zone's bed shows (pieceGlyph kinds): zone 1 light iron and white goods, 2 cast and gate steel, 3 heavy steel. */
const BED_PIECES: Readonly<Record<string, readonly string[]>> = {
  zone1: ['panel', 'light_iron', 'drum', 'light_iron', 'cable', 'wheelsteel', 'panel', 'sheet'],
  zone2: ['shard', 'section', 'gate', 'light_iron', 'shard', 'railing', 'wheel', 'section'],
  zone3: ['plate', 'beam', 'body', 'plate', 'beam', 'light_iron', 'body', 'plate'],
};

/**
 * A zone's bed of old stock (about 4 x 2.6 m): a low irregular bed of loose pieces with weeds at its edge,
 * full or worked down (`frame` 0 full, 1 low). The whole things stand on it, placed by the world.
 */
export function drawZoneBed(c: SkCanvas, v: View3q, zone: string, frame = 0, seed = 5): void {
  const list = BED_PIECES[zone] ?? BED_PIECES.zone1;
  const rx = 2.0 * v.ppm;
  const ry = 1.3 * v.ppm * v.tilt;
  const H = (frame === 0 ? 0.3 : 0.14) * v.ppm * v.lift;
  groundShadow(c, v, 2.05, 1.32, 0, 0, frame === 0 ? 0.3 : 0.1);
  const pts: number[] = [];
  const n = 18;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = 0.86 + hash01(seed, i, 31) * 0.16;
    const lift = Math.sin(a) < 0 ? -H * -Math.sin(a) * (0.8 + hash01(seed, i, 32) * 0.4) : 0;
    pts.push(Math.cos(a) * rx * r, Math.sin(a) * ry * r + lift);
  }
  const bed = poly(pts);
  const earth = mix(YARD.concreteDark, '#8A7457', 0.45);
  c.drawPath(bed, fill(zone === 'zone3' ? mix(earth, YARD.rust, 0.25) : zone === 'zone2' ? shade(earth, -0.08) : earth));
  c.drawPath(bed, stroke(INK, 1));
  // rust and dust patches on the bed
  for (let i = 0; i < 4; i++) c.drawPath(oval((hash01(seed, i, 33) - 0.5) * rx * 1.2, (hash01(seed, i, 34) - 0.5) * ry * 0.8 - H * 0.4, rx * 0.18, ry * 0.12), fill(YARD.rust, 0.35));
  const count = frame === 0 ? 34 : 16;
  const items: [number, number, number][] = [];
  for (let i = 0; i < count; i++) {
    const a = hash01(seed, i, 35) * Math.PI * 2;
    const r = Math.sqrt(hash01(seed, i, 36)) * 0.85;
    const x = Math.cos(a) * rx * r;
    const y = Math.sin(a) * ry * r - H * (1 - r) * 0.8;
    items.push([x, y, i]);
  }
  items.sort((p, q) => p[1] - q[1]);
  for (const [x, y, i] of items) pieceGlyph(c, list[i % list.length], x, y, (0.34 + hash01(seed, i, 37) * 0.18) * v.ppm, (hash01(seed, i, 38) - 0.5) * 70, seed * 11 + i);
  // weeds at the bed's edge: the yard has not been worked for a while
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + hash01(seed, i, 39);
    const x = Math.cos(a) * rx * 0.95;
    const y = Math.sin(a) * ry * 0.95 + 2;
    if (Math.sin(a) < -0.2) continue;
    for (let k = 0; k < 4; k++) {
      const t = builder().moveTo(x + k * 1.6 - 2.4, y).quadTo(x + k * 1.6 - 3, y - 4, x + k * 2 - 4 + hash01(seed, i, k) * 3, y - 6 - hash01(seed, k, i) * 3).build();
      c.drawPath(t, stroke(k % 2 ? YARD.grass : YARD.grassLight, 1.3));
    }
  }
}

/** Frames of the bed tile (sheet G `ground.bed`): two looks per zone tier (a worked-out patch is a tile drawn faint). */
export const BED_FRAMES = ['z1a', 'z1b', 'z2a', 'z2b', 'z3a', 'z3b'] as const;
/** The grid a bed is laid on, metres (each tile's dirt reaches past its cell so neighbours overlap). */
export const BED_CELL: readonly [number, number] = [1.2, 0.9];

/**
 * One tile of an old-stock bed (finding L5, MAP.md M3): a ragged patch of trodden earth with rust stains
 * and a few loose pieces of its zone's kind, about 1.7 x 1.3 m round its centre so the tiles of a bed
 * overlap into one lumpy heap floor. Flat (sheet G), baked at the ground sheet's density so it stays
 * crisp at density 2; the world lays as many as the zone has stock left (world/dressing.ts bedDress).
 */
export function drawBedTile(c: SkCanvas, v: View3q, frame = 0): void {
  const low = frame >= 6;
  const tier = low ? 0 : Math.floor(frame / 2);
  const seed = 17 + frame * 5;
  const rx = 0.86 * v.ppm;
  const ry = 0.64 * v.ppm * v.tilt;
  const pts: number[] = [];
  const n = 16;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = (low ? 0.7 : 0.82) + hash01(seed, i, 41) * 0.18;
    pts.push(Math.cos(a) * rx * r, Math.sin(a) * ry * r);
  }
  const bed = poly(pts);
  const earth = mix(YARD.concreteDark, '#8A7457', low ? 0.3 : 0.5);
  const tone = tier === 2 ? mix(earth, YARD.rust, 0.22) : tier === 1 ? shade(earth, -0.07) : earth;
  c.drawPath(bed, fill(tone, low ? 0.55 : 0.92));
  // dust and rust in the earth
  for (let i = 0; i < 7; i++) {
    const x = (hash01(seed, i, 42) - 0.5) * rx * 1.4;
    const y = (hash01(seed, i, 43) - 0.5) * ry * 1.2;
    c.drawPath(oval(x, y, rx * (0.1 + hash01(seed, i, 44) * 0.12), ry * (0.08 + hash01(seed, i, 45) * 0.1)), fill(i % 3 ? shade(tone, -0.12) : YARD.rust, i % 3 ? 0.5 : 0.3));
  }
  for (let i = 0; i < 26; i++) c.drawCircle((hash01(seed, i, 46) - 0.5) * rx * 1.6, (hash01(seed, i, 47) - 0.5) * ry * 1.4, 0.7 + (i % 3) * 0.3, fill(i % 2 ? shade(tone, -0.25) : mix(tone, '#FFFFFF', 0.25), 0.7));
  if (low) return;
  // loose pieces of the zone's kind (the whole things stand on the bed, placed by the rules)
  const list = BED_PIECES[`zone${tier + 1}`] ?? BED_PIECES.zone1;
  const k = 4 + Math.floor(hash01(seed, 48) * 2);
  for (let i = 0; i < k; i++) {
    const a = hash01(seed, i, 49) * Math.PI * 2;
    const r = Math.sqrt(hash01(seed, i, 50)) * 0.62;
    pieceGlyph(c, list[(i + frame) % list.length], Math.cos(a) * rx * r, Math.sin(a) * ry * r, (0.26 + hash01(seed, i, 51) * 0.12) * v.ppm, (hash01(seed, i, 52) - 0.5) * 80, seed * 13 + i);
  }
}

// ---------------------------------------------------------------------------
// A partner's skip seen from above, its contents showing (the skip card)
// ---------------------------------------------------------------------------

export type SkipPartner = 'partnerFarm' | 'partnerDemolition';

/** What each load holds, from content2.json partners.{id}.trial / .skip (thing: count). */
export const SKIP_CONTENTS: Readonly<Record<SkipPartner, { trial: Readonly<Record<string, number>>; full: Readonly<Record<string, number>> }>> = {
  partnerFarm: { trial: { sheet: 6, stove: 2, trough: 1, fittings: 1, cable: 1 }, full: { sheet: 14, stove: 5, trough: 3, plough: 1, fittings: 2, cable: 2 } },
  partnerDemolition: { trial: { beam: 1, cladding: 4, coil: 2, pipe: 1, fittings: 1 }, full: { beam: 4, cladding: 10, coil: 5, pipe: 3, fittings: 3 } },
};

/** One thing in plan (true top view), about s points long, screen points round its centre. */
function planThing(c: SkCanvas, kind: string, s: number, seed: number): void {
  switch (kind) {
    case 'sheet': {
      const w = s;
      const h = s * 0.42;
      c.drawPath(rrect(-w / 2, -h / 2, w, h, 0.6), fill(YARD.galvanised));
      for (let i = 1; i < 7; i++) c.drawPath(segment(-w / 2 + 1, -h / 2 + (h * i) / 7, w / 2 - 1, -h / 2 + (h * i) / 7), stroke(shade(YARD.galvanised, i % 2 ? 0.3 : -0.2), 0.9));
      c.drawPath(oval(-w * 0.2 + hash01(seed) * w * 0.4, 0, w * 0.15, h * 0.25), fill(YARD.rust, 0.5));
      c.drawPath(rrect(-w / 2, -h / 2, w, h, 0.6), stroke(INK, 0.8));
      break;
    }
    case 'cladding': {
      const w = s;
      const h = s * 0.4;
      const paint = mix(YARD.containerSage, '#9FB0A0', 0.3);
      c.drawPath(rrect(-w / 2, -h / 2, w, h, 0.6), fill(paint));
      for (let i = 0; i < 4; i++) c.drawRect({ x: -w / 2 + 1, y: -h / 2 + h * (0.12 + i * 0.22), width: w - 2, height: h * 0.08 }, fill(shade(paint, -0.25)));
      c.drawPath(rrect(-w / 2, -h / 2, w, h, 0.6), stroke(INK, 0.8));
      break;
    }
    case 'stove': {
      const w = s * 0.5;
      c.drawPath(rrect(-w / 2, -w * 0.36, w, w * 0.72, 1), fill(YARD.castIron));
      for (const x of [-w * 0.22, w * 0.22]) {
        c.drawPath(circle(x, 0, w * 0.17), fill(shade(YARD.castIron, -0.3)));
        c.drawPath(circle(x, 0, w * 0.17), stroke(shade(YARD.castIron, 0.4), 0.7));
      }
      c.drawPath(rrect(-w / 2, -w * 0.36, w, w * 0.72, 1), stroke(INK, 0.9));
      break;
    }
    case 'trough': {
      const w = s * 0.9;
      const h = s * 0.32;
      c.drawPath(rrect(-w / 2, -h / 2, w, h, h * 0.3), fill(YARD.castIron));
      c.drawPath(rrect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4, h * 0.2), fill(shade(YARD.castIron, -0.4)));
      c.drawPath(rrect(-w / 2, -h / 2, w, h, h * 0.3), stroke(INK, 0.9));
      break;
    }
    case 'plough':
      ploughSmall(c, s * 0.9);
      break;
    case 'fittings': {
      const w = s * 0.46;
      const h = s * 0.32;
      c.drawPath(rrect(-w / 2, -h / 2, w, h, 1), fill(shade(YARD.galvanised, -0.35)));
      c.drawPath(rrect(-w / 2, -h / 2, w, h, 1), stroke(YARD.galvanised, 1.6));
      c.drawPath(rrect(-w / 2, -h / 2, w, h, 1), stroke(INK, 0.6));
      c.save();
      c.rotate(-20, 0, 0);
      brassValve(c, w * 0.5);
      c.restore();
      c.save();
      c.translate(w * 0.2, h * 0.1);
      brassElbow(c, w * 0.4);
      c.restore();
      break;
    }
    case 'cable':
    case 'coil': {
      const r = s * (kind === 'coil' ? 0.3 : 0.22);
      for (let i = 0; i < 4; i++) {
        c.drawPath(circle((hash01(seed, i) - 0.5) * 2, (hash01(seed, i, 2) - 0.5) * 2, r * (0.7 + i * 0.1)), stroke(INK, 2.6));
        c.drawPath(circle((hash01(seed, i) - 0.5) * 2, (hash01(seed, i, 2) - 0.5) * 2, r * (0.7 + i * 0.1)), stroke(i % 2 ? YARD.pvcGrey : YARD.pvc, 1.6));
      }
      c.drawPath(circle(r * 0.9, r * 0.5, 1.4), fill(YARD.copperLight));
      break;
    }
    case 'pipe':
      for (let i = 0; i < 4; i++) {
        const y = (i - 1.5) * 2.2;
        c.drawPath(rrect(-s / 2, y - 1, s, 2, 1), fill(TONE.no2));
        c.drawPath(rrect(-s / 2, y - 1, s, 2, 1), stroke(INK, 0.6));
        c.drawPath(circle(s / 2, y, 0.9), fill(YARD.copperSheen));
      }
      c.drawRect({ x: -s * 0.2, y: -5, width: 2.4, height: 10 }, fill(YARD.hivis));
      break;
    case 'beam':
    default: {
      const w = s * 1.25;
      const h = Math.max(4, s * 0.14);
      c.drawPath(rrect(-w / 2, -h / 2, w, h, 0.6), fill(TONE.steelTop));
      c.drawPath(segment(-w / 2 + 1, 0, w / 2 - 1, 0), stroke(shade(TONE.steel, -0.3), 1));
      c.drawPath(oval(-w * 0.1, -h * 0.2, w * 0.12, h * 0.3), fill(YARD.rust, 0.5));
      c.drawPath(rrect(-w / 2, -h / 2, w, h, 0.6), stroke(INK, 0.8));
    }
  }
}

/** The plan size of a thing relative to the skip's length (flat things big, lumpy things small). */
const PLAN_SIZE: Readonly<Record<string, number>> = { sheet: 0.42, cladding: 0.42, beam: 0.7, plough: 0.36, trough: 0.32, stove: 0.26, fittings: 0.24, cable: 0.2, coil: 0.24, pipe: 0.4 };

/**
 * A partner's hook-lift skip from straight above (`w` points long, 0.45 w wide, centred on (x, y)): its
 * red-oxide rim and inside, and the load's things as content lists them, flat ones first. `load` 'empty'
 * shows the bare floor (a skip filling).
 */
export function drawSkipPlan(c: SkCanvas, partner: SkipPartner, load: 'empty' | 'trial' | 'full', x: number, y: number, w = 96, seed = 2): void {
  const h = w * 0.45;
  c.save();
  c.translate(x, y);
  const outer = rrect(-w / 2, -h / 2, w, h, 3);
  c.drawPath(outer, fill(YARD.skip));
  c.drawPath(outer, stroke(INK, 1.2));
  // the hook bar at the west end, the rim
  c.drawPath(rrect(-w / 2 - 4, -h * 0.18, 5, h * 0.36, 1), fill(YARD.steelDark));
  c.drawPath(rrect(-w / 2 - 4, -h * 0.18, 5, h * 0.36, 1), stroke(INK, 0.9));
  const inner = rrect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 2);
  c.drawPath(inner, fill(shade(YARD.skip, -0.45)));
  c.save();
  c.clipPath(inner, ClipOp.Intersect, true);
  // floor ribs
  for (let i = 1; i < 6; i++) c.drawPath(segment(-w / 2 + (w * i) / 6, -h / 2, -w / 2 + (w * i) / 6, h / 2), stroke(shade(YARD.skip, -0.3), 1));
  if (load !== 'empty') {
    const contents = SKIP_CONTENTS[partner][load];
    // flat things first (they lie at the bottom), then the rest on top
    const order = Object.entries(contents).sort((a, b) => (PLAN_SIZE[b[0]] ?? 0.3) - (PLAN_SIZE[a[0]] ?? 0.3));
    const flat: string[] = [];
    for (const [k, n] of order) for (let i = 0; i < n; i++) flat.push(k);
    const iw = w - 10;
    const ih = h - 10;
    flat.forEach((k, i) => {
      const big = (PLAN_SIZE[k] ?? 0.3) >= 0.4;
      const px = -iw / 2 + iw * ((big ? 0.15 : 0.08) + hash01(seed, i, 51) * (big ? 0.7 : 0.84));
      const py = -ih / 2 + ih * (0.15 + hash01(seed, i, 52) * 0.7);
      c.save();
      c.translate(px, py);
      c.rotate((hash01(seed, i, 53) - 0.5) * (big ? 30 : 120), 0, 0);
      planThing(c, k, (PLAN_SIZE[k] ?? 0.3) * w, seed + i);
      c.restore();
    });
  }
  c.restore();
  c.drawPath(inner, stroke(INK, 0.9));
  // lifting lugs at the corners
  for (const [lx, ly] of [[-w / 2 + 3, -h / 2 - 1], [w / 2 - 3, -h / 2 - 1], [-w / 2 + 3, h / 2 + 1], [w / 2 - 3, h / 2 + 1]] as const) {
    c.drawPath(circle(lx, ly, 2), fill(YARD.steelDark));
    c.drawPath(circle(lx, ly, 2), stroke(INK, 0.7));
  }
  c.restore();
}
