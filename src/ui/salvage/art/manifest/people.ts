/**
 * Manifest part "people" (owned by the artist "people"): everyone and everything that moves in the first
 * yard (yard-stage1.md 6.1). Entry type and conventions: ./index.ts.
 *
 * WHAT IS BAKED, AND WHY SO FEW FRAMES (yard-stage1.md 6.2: sheets A and B at most 2048 x 2048 px at
 * the device's density, here counted at density 3). 6.1's counts (walk 6, work 4 per tool, carry 6,
 * push 6 per carrier, pour 4, a truck in four skip states with hook 3 and tip 3) do not fit; so:
 * - walk and push 4 frames, each tool 2 (spanner, sledge raised/struck, grinder, torch), feed 2, the pour
 *   1 (the melt moves in the furnace's own frames), stand 1; 4 headings with west mirrored (s, e, n baked).
 * - ONE crew body for the yard hand, the cutter and the driver: the vest is the tint (YARD.vestYardHand
 *   baked; the atlas recolours that one fill per role). The crew never uses spanners (a cutter is hired
 *   after the sledgehammer and works with the yard's best tool), so it has no spanner frames.
 * - Loads are their own small sprites drawn at the same anchor (actorLayers): the boss's hand load on
 *   the carry frame by family (8), and the sack truck and the flat trolley with five load families or
 *   empty, anchored at their own centre ahead of the person (CARRIER_AHEAD).
 * - Vehicles: the hook-lift truck in 8 headings carries its (empty) skip; a partner's load is an overlay
 *   over the rim (round in plan, so one drawing serves every heading); hook and tip are four frames at
 *   heading east (bare, reach, incline, tipped). The flatbed: 4 headings driving; at the bays a body with
 *   the crane's column and the booms and grab as a 3-frame overlay; its cargo an overlay. The van: 4
 *   headings, the body tinted (the public's white, the delivery van's colour); the trailer its own sprite.
 * - No shadows inside sprites (mirrored ones would throw them west): vehicles.draw.ts drawActorShadow.
 * - Every entry has `boundsByHeading` (one box per baked heading) beside the union `bounds`; the pixel
 *   sums below use the union (what the atlas packs today) and the tight boxes (if it honours them).
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { YARD } from '../palette';
import type { View3q } from '../pen';
import { BOSS, CREW_BODY, CREW_BODY_2, drawHandLoad, drawPerson, type Dir, type LoadFamily, type PersonLook, type Pose } from '../people.draw';
import {
  CARRIER_AHEAD,
  CRANE_FRAMES,
  HOOK_FRAMES,
  SKIP_LOADS,
  drawCarrier,
  drawFlatbed,
  drawFlatbedCargo,
  drawHookFrame,
  drawHookTruck,
  drawSkip,
  drawSkipLoad,
  drawTrailer,
  drawVan,
  flatbedBedCentre,
  headingRad,
  skipTopOnTruck,
  type CarrierKind,
  type SkipLoad,
} from '../vehicles.draw';
import type { Bounds, ManifestEntry } from './index';

/** An entry with a tight box for each baked heading (index = position in the baked list). */
export interface PeopleEntry extends ManifestEntry {
  boundsByHeading: readonly Bounds[];
}

/** Bake a second crew body (slim, light skin) as well: about +0.6 Mpx of sheet A at density 3. */
export const CREW_SECOND = false;

const DIRS4: Dir[] = ['s', 'e', 'n', 'w'];
/** The manifest's four headings (0 s, 1 e, 2 n, 3 w) as a person's direction. */
export const dirOf = (heading: number): Dir => DIRS4[((heading % 4) + 4) % 4];

/** The headings an entry bakes (as index.ts bakedHeadings: west-facing ones dropped when mirrorWest). */
export function baked(e: Pick<ManifestEntry, 'headings' | 'mirrorWest'>): number[] {
  const all = Array.from({ length: e.headings }, (_, i) => i);
  if (!e.mirrorWest) return all;
  if (e.headings === 4) return [0, 1, 2];
  if (e.headings === 8) return [0, 1, 2, 3, 4];
  return all;
}

const B = (x: number, y: number, w: number, h: number): Bounds => ({ x, y, w, h });
const union = (bs: readonly Bounds[]): Bounds => {
  const l = Math.min(...bs.map((b) => b.x));
  const t = Math.min(...bs.map((b) => b.y));
  const r = Math.max(...bs.map((b) => b.x + b.w));
  const bt = Math.max(...bs.map((b) => b.y + b.h));
  return B(l, t, r - l, bt - t);
};

// ---------------------------------------------------------------------------
// The measured boxes (points round the anchor at pen.VIEW, 2 pt of margin), from
// scripts/art/yard-people-sheets.ts --measure; the test checks every drawing stays inside.
// ---------------------------------------------------------------------------

/* MEASURED-START */
const BOX: Record<string, Bounds[]> = {
  'person.boss.stand': [B(-16, -56, 32, 60), B(-12, -56, 27, 60), B(-16, -56, 32, 60)],
  'person.boss.walk': [B(-16, -58, 32, 62), B(-14, -58, 31, 62), B(-16, -58, 32, 62)],
  'person.boss.push': [B(-14, -58, 28, 62), B(-14, -58, 33, 62), B(-14, -58, 28, 62)],
  'person.boss.feed': [B(-14, -56, 28, 60), B(-12, -56, 37, 60), B(-14, -56, 28, 60)],
  'person.boss.pour': [B(-14, -56, 28, 60), B(-12, -56, 29, 60), B(-14, -56, 28, 60)],
  'person.boss.spanner': [B(-14, -49, 29, 55), B(-8, -49, 41, 53), B(-14, -49, 28, 53)],
  'person.boss.sledge': [B(-14, -64, 28, 75), B(-20, -64, 53, 69), B(-14, -63, 28, 67)],
  'person.boss.grinder': [B(-14, -56, 39, 60), B(-12, -56, 54, 60), B(-14, -56, 28, 65)],
  'person.boss.torch': [B(-14, -54, 29, 67), B(-13, -54, 46, 58), B(-14, -54, 28, 63)],
  'person.crew.stand': [B(-17, -56, 34, 60), B(-12, -56, 27, 60), B(-17, -56, 34, 60)],
  'person.crew.walk': [B(-17, -58, 34, 62), B(-14, -58, 31, 62), B(-17, -58, 34, 62)],
  'person.crew.push': [B(-15, -58, 30, 62), B(-14, -58, 33, 62), B(-15, -58, 30, 62)],
  'person.crew.feed': [B(-15, -56, 30, 60), B(-12, -56, 37, 60), B(-15, -56, 30, 60)],
  'person.crew.pour': [B(-15, -56, 30, 60), B(-12, -56, 29, 60), B(-15, -56, 30, 60)],
  'person.crew.sledge': [B(-15, -64, 30, 75), B(-20, -64, 53, 69), B(-15, -63, 30, 67)],
  'person.crew.grinder': [B(-15, -56, 40, 60), B(-12, -56, 54, 60), B(-15, -56, 30, 65)],
  'person.crew.torch': [B(-15, -54, 30, 67), B(-13, -54, 46, 58), B(-15, -54, 30, 63)],
  'load.hand.fe': [B(-16, -45, 33, 32), B(-22, -44, 27, 33), B(-14, -44, 28, 33)],
  'load.hand.ci': [B(-17, -45, 34, 32), B(-22, -44, 27, 33), B(-14, -44, 28, 33)],
  'load.hand.cu': [B(-17, -45, 34, 32), B(-22, -44, 27, 34), B(-14, -44, 28, 33)],
  'load.hand.br': [B(-17, -49, 34, 36), B(-22, -44, 27, 33), B(-14, -44, 28, 33)],
  'load.hand.al': [B(-16, -45, 33, 32), B(-22, -44, 27, 32), B(-14, -44, 28, 34)],
  'load.hand.cab': [B(-17, -45, 37, 32), B(-22, -44, 27, 35), B(-14, -44, 29, 34)],
  'load.hand.mot': [B(-17, -45, 36, 32), B(-22, -44, 27, 35), B(-14, -44, 28, 33)],
  'load.hand.hms': [B(-17, -45, 34, 32), B(-22, -44, 27, 33), B(-14, -44, 28, 33)],
  'carrier.sack': [B(-15, -41, 30, 54), B(-18, -37, 40, 47), B(-15, -32, 30, 30)],
  'carrier.trolley': [B(-18, -47, 37, 62), B(-27, -38, 51, 48), B(-18, -26, 36, 41)],
  'vehicle.truck': [B(-44, -112, 88, 166), B(-89, -112, 186, 166), B(-93, -94, 188, 125), B(-88, -131, 185, 188), B(-44, -130, 88, 189)],
  'vehicle.truck.hook': [B(-196, -121, 291, 152)],
  'vehicle.skip': [B(-57, -55, 114, 82)],
  'vehicle.skip.load': [B(-33, -23, 66, 37)],
  'vehicle.flatbed': [B(-44, -97, 88, 151), B(-90, -94, 185, 125), B(-44, -130, 88, 191)],
  'vehicle.flatbed.working': [B(-90, -94, 185, 125)],
  'vehicle.flatbed.crane': [B(-35, -88, 79, 146)],
  'vehicle.flatbed.cargo': [B(-31, -20, 62, 33)],
  'vehicle.van': [B(-41, -102, 82, 143), B(-69, -81, 138, 110), B(-41, -77, 82, 118)],
  'vehicle.trailer': [B(-34, -45, 69, 63), B(-33, -42, 75, 67), B(-34, -45, 69, 60)],
};
/* MEASURED-END */

const boxOf = (key: string, n: number, fallback: Bounds): Bounds[] => BOX[key] ?? Array.from({ length: n }, () => fallback);

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

const POSES_BOSS: [Pose, string[]][] = [
  ['stand', ['stand']],
  ['walk', ['walk1', 'walk2', 'walk3', 'walk4']],
  ['push', ['push1', 'push2', 'push3', 'push4']],
  ['feed', ['feed1', 'feed2']],
  ['pour', ['pour']],
  ['spanner', ['spanner1', 'spanner2']],
  ['sledge', ['raised', 'struck']],
  ['grinder', ['grind1', 'grind2']],
  ['torch', ['torch1', 'torch2']],
];
const POSES_CREW = POSES_BOSS.filter(([p]) => p !== 'spanner');
const POSES_CREW_2 = POSES_BOSS.filter(([p]) => ['stand', 'walk', 'push', 'feed', 'pour'].includes(p));

const PERSON_FALLBACK = B(-30, -70, 62, 80);

function personEntries(who: 'boss' | 'crew' | 'crew2', look: PersonLook, poses: [Pose, string[]][]): PeopleEntry[] {
  return poses.map(([pose, frames]) => {
    const id = `person.${who}.${pose}`;
    const bh = boxOf(id, 3, PERSON_FALLBACK);
    const e: PeopleEntry = {
      id,
      group: 'person',
      sheet: 'A',
      footprint: { w: 0.6, d: 0.5 },
      bounds: union(bh),
      boundsByHeading: bh,
      frames,
      headings: 4,
      mirrorWest: true,
      draw: (c: SkCanvas, v: View3q, frame: number, heading: number) =>
        drawPerson(c, v, { dir: dirOf(heading), pose, frame, frames: frames.length, look, shadow: false }),
    };
    if (who !== 'boss') e.tint = YARD.vestYardHand;
    return e;
  });
}

// ---------------------------------------------------------------------------
// Loads and carriers
// ---------------------------------------------------------------------------

/** The hand-load families baked (the boss alone carries by hand; the crew pushes a carrier). */
export const HAND_FAMILIES: readonly LoadFamily[] = ['fe', 'ci', 'cu', 'br', 'al', 'cab', 'mot', 'hms'];
/** The carrier loads baked: empty and five families (al, mot and hms show as fe on a carrier). */
export const CARRIER_FRAMES = ['empty', 'fe', 'ci', 'cu', 'br', 'cab'] as const;
export const carrierFrameOf = (f: LoadFamily | null): number => {
  if (!f) return 0;
  const i = (CARRIER_FRAMES as readonly string[]).indexOf(f);
  return i > 0 ? i : 1;
};

function handLoadEntry(fam: LoadFamily): PeopleEntry {
  const id = `load.hand.${fam}`;
  const bh = boxOf(id, 3, B(-30, -60, 60, 50));
  return {
    id,
    group: 'load',
    sheet: 'A',
    footprint: { w: 0.5, d: 0.4 },
    bounds: union(bh),
    boundsByHeading: bh,
    frames: ['load'],
    headings: 4,
    mirrorWest: true,
    draw: (c, v, _f, heading) => drawHandLoad(c, v, dirOf(heading), fam, BOSS.build),
  };
}

function carrierEntry(kind: CarrierKind): PeopleEntry {
  const id = `carrier.${kind}`;
  const bh = boxOf(id, 3, B(-50, -70, 100, 100));
  return {
    id,
    group: 'carrier',
    sheet: 'A',
    footprint: kind === 'sack' ? { w: 0.6, d: 0.5 } : { w: 1.0, d: 0.6 },
    bounds: union(bh),
    boundsByHeading: bh,
    frames: CARRIER_FRAMES,
    headings: 4,
    mirrorWest: true,
    draw: (c, v, frame, heading) => {
      const fam = CARRIER_FRAMES[frame];
      drawCarrier(c, v, kind, dirOf(heading), fam === 'empty' ? undefined : (fam as LoadFamily), 'self');
    },
  };
}

// ---------------------------------------------------------------------------
// Vehicles
// ---------------------------------------------------------------------------

function vehicle(id: string, o: { frames: readonly string[]; headings: 1 | 4 | 8; footprint: { w: number; d: number }; tint?: string; draw: ManifestEntry['draw'] }): PeopleEntry {
  const n = o.headings === 1 ? 1 : o.headings === 4 ? 3 : 5;
  const bh = boxOf(id, n, B(-140, -140, 280, 220));
  const e: PeopleEntry = {
    id,
    group: 'vehicle',
    sheet: 'B',
    footprint: o.footprint,
    bounds: union(bh),
    boundsByHeading: bh,
    frames: o.frames,
    headings: o.headings,
    mirrorWest: o.headings > 1,
    draw: o.draw,
  };
  if (o.tint) e.tint = o.tint;
  return e;
}

/** heading of a 4-heading entry (0 s, 1 e, 2 n, 3 w) in the 8 scheme. */
const h4to8 = (h: number): number => h * 2;

const VEHICLES: PeopleEntry[] = [
  vehicle('vehicle.truck', {
    frames: ['skip'],
    headings: 8,
    footprint: { w: 4.6, d: 2.0 },
    draw: (c, v, _f, h) => drawHookTruck(c, v, headingRad(h), { skip: 'on' }),
  }),
  vehicle('vehicle.truck.hook', {
    frames: HOOK_FRAMES,
    headings: 1,
    footprint: { w: 4.6, d: 2.0 },
    draw: (c, v, f) => drawHookFrame(c, v, HOOK_FRAMES[f], 'farm-full'),
  }),
  vehicle('vehicle.skip', {
    frames: ['empty'],
    headings: 1,
    footprint: { w: 2.7, d: 1.75 },
    draw: (c, v) => drawSkip(c, v, 0),
  }),
  vehicle('vehicle.skip.load', {
    frames: SKIP_LOADS,
    headings: 1,
    footprint: { w: 1.6, d: 1.0 },
    draw: (c, v, f) => drawSkipLoad(c, v, SKIP_LOADS[f]),
  }),
  vehicle('vehicle.flatbed', {
    frames: ['stowed'],
    headings: 4,
    footprint: { w: 4.6, d: 2.0 },
    draw: (c, v, _f, h) => drawFlatbed(c, v, headingRad(h4to8(h))),
  }),
  vehicle('vehicle.flatbed.working', {
    frames: ['column'],
    headings: 1,
    footprint: { w: 4.6, d: 2.0 },
    draw: (c, v) => drawFlatbed(c, v, 0, { crane: 'reach', parts: 'body' }),
  }),
  vehicle('vehicle.flatbed.crane', {
    frames: CRANE_FRAMES,
    headings: 1,
    footprint: { w: 2.0, d: 2.5 },
    draw: (c, v, f) => drawFlatbed(c, v, 0, { crane: CRANE_FRAMES[f], parts: 'crane' }),
  }),
  vehicle('vehicle.flatbed.cargo', {
    frames: ['part', 'full'],
    headings: 1,
    footprint: { w: 1.6, d: 1.0 },
    draw: (c, v, f) => drawFlatbedCargo(c, v, f === 0 ? 'part' : 'full'),
  }),
  vehicle('vehicle.van', {
    frames: ['van'],
    headings: 4,
    footprint: { w: 3.4, d: 1.8 },
    tint: YARD.enamel,
    draw: (c, v, _f, h) => drawVan(c, v, headingRad(h4to8(h))),
  }),
  vehicle('vehicle.trailer', {
    frames: ['trailer'],
    headings: 4,
    footprint: { w: 1.6, d: 1.3 },
    draw: (c, v, _f, h) => drawTrailer(c, v, headingRad(h4to8(h)), 'self'),
  }),
];

export const PEOPLE: PeopleEntry[] = [
  ...personEntries('boss', BOSS, POSES_BOSS),
  ...personEntries('crew', CREW_BODY, POSES_CREW),
  ...(CREW_SECOND ? personEntries('crew2', CREW_BODY_2, POSES_CREW_2) : []),
  ...HAND_FAMILIES.map(handLoadEntry),
  carrierEntry('sack'),
  carrierEntry('trolley'),
  ...VEHICLES,
];

// ---------------------------------------------------------------------------
// Layered actors: what the world draws, in order, at an actor's anchor
// ---------------------------------------------------------------------------

/** One sprite of an actor: drawn at the actor's anchor plus (dx, dy) points (at pen.VIEW; scale with ppm), mirrored when flip. */
export interface Layer {
  id: string;
  frame: number;
  /** the entry's heading (for a west heading under mirrorWest the world draws the east one flipped) */
  heading: number;
  dx: number;
  dy: number;
}

export interface PersonActor {
  who: 'boss' | 'crew';
  pose: Exclude<Pose, 'carry' | 'cut' | 'lever'>;
  frame: number;
  /** 0 s, 1 e, 2 n, 3 w */
  heading: number;
  /** the boss's hand load (walking or standing with it) */
  hand?: LoadFamily;
  /** a pushed carrier and its load (pose 'push') */
  carrier?: { kind: CarrierKind; load: LoadFamily | null };
}

/** Points a metre ahead along a 4-heading at pen.VIEW (40 pt a metre, tilt 0.7). */
const ahead4 = (heading: number, m: number): [number, number] => {
  const d = dirOf(heading);
  return d === 's' ? [0, m * 40 * 0.7] : d === 'n' ? [0, -m * 40 * 0.7] : d === 'e' ? [m * 40, 0] : [-m * 40, 0];
};

/**
 * A person and what they carry or push, as sprites in draw order. The hand load is on the back: drawn
 * before the person unless the person faces north. A carrier is ahead: drawn after the person unless the
 * person faces north.
 */
export function personLayers(a: PersonActor): Layer[] {
  const facingNorth = dirOf(a.heading) === 'n';
  const person: Layer = { id: `person.${a.who}.${a.pose}`, frame: a.frame, heading: a.heading, dx: 0, dy: 0 };
  const out: Layer[] = [];
  const hand: Layer | null = a.hand && a.who === 'boss' ? { id: `load.hand.${a.hand}`, frame: 0, heading: a.heading, dx: 0, dy: 0 } : null;
  let cart: Layer | null = null;
  if (a.carrier && a.pose === 'push') {
    const [dx, dy] = ahead4(a.heading, CARRIER_AHEAD[a.carrier.kind]);
    cart = { id: `carrier.${a.carrier.kind}`, frame: carrierFrameOf(a.carrier.load), heading: a.heading, dx, dy };
  }
  if (hand && !facingNorth) out.push(hand);
  if (cart && facingNorth) out.push(cart);
  out.push(person);
  if (hand && facingNorth) out.push(hand);
  if (cart && !facingNorth) out.push(cart);
  return out;
}

/** The hook-lift truck at one of the eight headings with its skip and a partner's load over the rim. */
export function truckLayers(heading8: number, load?: SkipLoad): Layer[] {
  const out: Layer[] = [{ id: 'vehicle.truck', frame: 0, heading: heading8, dx: 0, dy: 0 }];
  if (load) {
    const [dx, dy] = skipTopOnTruck({ ppm: 40, tilt: 0.7, lift: Math.sqrt(1 - 0.49) }, headingRad(heading8));
    out.push({ id: 'vehicle.skip.load', frame: SKIP_LOADS.indexOf(load), heading: 0, dx, dy });
  }
  return out;
}

/** A skip standing on the ground (east-west) with its load. */
export function skipLayers(load?: SkipLoad): Layer[] {
  const out: Layer[] = [{ id: 'vehicle.skip', frame: 0, heading: 0, dx: 0, dy: 0 }];
  if (load) out.push({ id: 'vehicle.skip.load', frame: SKIP_LOADS.indexOf(load), heading: 0, dx: 0, dy: -0.95 * 40 * Math.sqrt(1 - 0.49) });
  return out;
}

/**
 * The merchant's flatbed: driving at a 4-heading, or parked east-west at the bays loading (crane frame
 * 0..2); its cargo (none, part, full) over the bed.
 */
export function flatbedLayers(heading4: number, o: { crane?: number; cargo?: 'part' | 'full' } = {}): Layer[] {
  const V = { ppm: 40, tilt: 0.7, lift: Math.sqrt(1 - 0.49) };
  const loading = o.crane !== undefined;
  const h = loading ? (dirOf(heading4) === 'w' ? 3 : 1) : heading4;
  const out: Layer[] = [loading ? { id: 'vehicle.flatbed.working', frame: 0, heading: 0, dx: 0, dy: 0 } : { id: 'vehicle.flatbed', frame: 0, heading: h, dx: 0, dy: 0 }];
  if (o.cargo) {
    const [dx, dy] = flatbedBedCentre(V, headingRad(h4to8(h)));
    out.push({ id: 'vehicle.flatbed.cargo', frame: o.cargo === 'part' ? 0 : 1, heading: 0, dx, dy });
  }
  if (loading) out.push({ id: 'vehicle.flatbed.crane', frame: o.crane ?? 0, heading: 0, dx: 0, dy: 0 });
  return out;
}

/** A van (tint: the public's white or the delivery van's colour) with the public's trailer behind it. */
export function vanLayers(heading4: number, trailer: boolean): Layer[] {
  const van: Layer = { id: 'vehicle.van', frame: 0, heading: heading4, dx: 0, dy: 0 };
  if (!trailer) return [van];
  const [dx, dy] = ahead4(heading4, -2.75);
  const tr: Layer = { id: 'vehicle.trailer', frame: 0, heading: heading4, dx, dy };
  return dirOf(heading4) === 'n' ? [van, tr] : [tr, van];
}

// ---------------------------------------------------------------------------
// The budget (pixels at a density, union boxes and tight boxes)
// ---------------------------------------------------------------------------

/** What this part asks of each sheet at density 3 (agreed with the art director through requests.md). */
export const SHARE_PX = { A: 2_100_000, B: 3_300_000 } as const;

export function pixelsOf(e: PeopleEntry, density: number, tight: boolean): number {
  const hs = baked(e);
  return hs.reduce((sum, _h, i) => {
    const b = tight ? e.boundsByHeading[i] ?? e.bounds : e.bounds;
    return sum + Math.ceil(b.w * density) * Math.ceil(b.h * density) * e.frames.length;
  }, 0);
}

export function budget(density = 3): { A: { union: number; tight: number }; B: { union: number; tight: number }; cells: number } {
  const r = { A: { union: 0, tight: 0 }, B: { union: 0, tight: 0 }, cells: 0 };
  for (const e of PEOPLE) {
    const s = e.sheet === 'B' ? r.B : r.A;
    s.union += pixelsOf(e, density, false);
    s.tight += pixelsOf(e, density, true);
    r.cells += baked(e).length * e.frames.length;
  }
  return r;
}
