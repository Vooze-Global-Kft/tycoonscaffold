/**
 * WHAT THE YARD DRAWS, as plain numbers for the UI thread (yard-stage1.md 3 and 6; notes/lead-world.md).
 * Pure JavaScript (no React, no Skia calls: the tests run it under node). Three parts:
 *
 * 1. THE MAP (`staticItems`): built once per config and baked art, from content only: the fence round the
 *    yard with its gate gap, the props (the container wall, rubble, crates), every place of `map.places`
 *    (pads, scales, the scale house, the portacabin, the rack, the rubble skip, the bays' lock blocks, the
 *    notice board, the back field's gate), the old stock's beds under each zone, and the lane east of the
 *    gate with its partner sites and the weight-limited bridge (distances `map.lane`). Nothing is placed by
 *    hand: a position is a content point, a footprint, or a lane distance; spacing along a fence is art.
 * 2. THE RULES' PICTURE (`rulesScene`): at each store change, from the rules' FrameTable (src/engine/salvage
 *    `frame`): things in their stages, pieces on the ground, machines in their looks, bays and stillages
 *    in their fills, partners' skips on the lane, chalk circles; and the actors' facts the UI thread moves
 *    (the boss's carrier and load, his work pose, crew legs, the truck, the flatbed, the public's car).
 *    The screen decides nothing: every fact here is the frame's.
 * 3. THE ACTORS' CELLS (`actorTable`): lookup tables from (pose, frame, heading) to atlas cells, and the
 *    art kit's layer offsets, so the frame loop can draw people and vehicles in the order the people
 *    artist's personLayers / truckLayers / flatbedLayers / vanLayers give (a test holds the two equal).
 *
 * An ITEM is ITEM numbers: [layer, key, cell, wx, wy, dx, dy, scale, tint, alpha, alt, period].
 *   layer  0 a ground decal (sheet G, drawn first, in list order), 2 depth-sorted (by key, lower in front);
 *   key    the sort key: the footprint's south edge in metres (a flat sprite: its north edge);
 *   cell   a packed atlas cell (`packCell`): sheet, cell index, mirrored;
 *   wx wy  the anchor in metres; dx dy points at 40 a metre (layers of one actor);
 *   scale  the entry's drawScale; tint 0xRRGGBB to modulate, or -1; alpha 0..1;
 *   alt    a second packed cell the sprite alternates with every `period` seconds (a working machine), or -1.
 */
import type { SalvageContent } from '../../../config/schema.salvage';
import type * as R from '../../../engine/salvage';
import { MANIFEST, WORKS_MANIFEST, cellBounds, mirrorOf, type AnySheet, type ManifestEntry } from '../art/manifest';
import { CARRIER_FRAMES, HAND_FAMILIES, carrierFrameOf, handFamilyOf } from '../art/manifest/people';
import { CONTAINER_TINTS, STILLAGE_LAYER_DY } from '../art/manifest/plant';
import { GRADE_SPRITE, INGOT_FRAMES, OBJECT_SPRITE, stageOf, thingLookTint } from '../art/manifest/things';
import { loadFamily, type LoadFamily } from '../art/people.draw';
import { laneDrawEnd, laneGeo, laneSigns, mapDriveLine, mapNorth, type LaneGeo } from './yard';
import { bedShares, bedsDress, type Dress } from './dressing';
import { CARRIER_AHEAD, flatbedBedCentre, headingRad, skipTopOnTruck } from '../art/vehicles.draw';
import { stageOn } from '../../../modes/salvage/stage';
import { floorItems, worksItems } from './worksScene';
import { worksRoofSpots, type RoofSpot } from './worksTable';

export { laneDrawEnd, laneGeo, mapDriveLine, type LaneGeo };

export const ITEM = 12;
export const L_DECAL = 0;
export const L_SORT = 2;

/**
 * Sheets by index: the manifest's A, B, G, the world's actor shadows S (./useYard.ts), then the works' C and D (C-WORLD-1:
 * appended AFTER S so that no first-yard cell index moves; baked only under stageOn() from rung 2, null otherwise).
 */
export const SHEETS = ['A', 'B', 'G', 'S', 'C', 'D'] as const;
export type SheetName = (typeof SHEETS)[number];

const CELL_BASE = 2_000_000;
/** A packed cell: sheet index, cell index in that sheet, mirrored (drawn flipped about the anchor). */
export const packCell = (sheet: number, cell: number, mirror: boolean) => sheet * CELL_BASE + cell * 2 + (mirror ? 1 : 0);
export function unpackCell(p: number): { sheet: number; cell: number; mirror: boolean } {
  'worklet';
  const sheet = Math.floor(p / CELL_BASE);
  const rest = p - sheet * CELL_BASE;
  return { sheet, cell: rest >> 1, mirror: (rest & 1) === 1 };
}

/** A baked sheet as the world reads it (atlas.ts ManifestAtlas, or the world's shadow sheet). */
export interface SheetLike {
  density: number;
  /** Six numbers per cell: x, y, w, h, ax, ay (pixels). */
  rects: number[];
  /** `${id}#${frame}#${heading}` -> cell index. */
  index: Record<string, number>;
}

// The first yard's entries and the works' (C-WORLD-1; ids are unique across both: art/sheets.hash.test.ts). A works entry
// resolves only once its sheet is baked (stageOn(), rung 2): until then its cell is -1 and nothing of it is drawn.
const BY_ID = new Map<string, ManifestEntry<AnySheet>>([...MANIFEST, ...WORKS_MANIFEST].map((e) => [e.id, e]));
export const entryOf = (id: string): ManifestEntry<AnySheet> | undefined => BY_ID.get(id);
const SHEET_OF: Record<string, number> = { A: 0, B: 1, G: 2, S: 3, C: 4, D: 5 };

/** Resolves (id, frame, heading) to a packed cell, -1 when the sheets lack it. Memoised. */
export type Resolver = (id: string, frame?: number, heading?: number) => number;

export function makeResolver(sheets: readonly (SheetLike | null)[]): Resolver {
  const memo = new Map<string, number>();
  return (id, frame = 0, heading = 0) => {
    const k = `${id}#${frame}#${heading}`;
    const hit = memo.get(k);
    if (hit !== undefined) return hit;
    let out = -1;
    if (id.startsWith('shadow.')) {
      const s = sheets[3];
      const c = s?.index[k];
      if (c !== undefined) out = packCell(3, c, false);
    } else {
      const e = BY_ID.get(id);
      if (e) {
        const si = SHEET_OF[e.sheet];
        const s = sheets[si];
        const src = mirrorOf(e, heading);
        const c = s?.index[`${id}#${Math.min(frame, e.frames.length - 1)}#${src ?? (heading < e.headings ? heading : 0)}`];
        if (c !== undefined) out = packCell(si, c, src !== null);
      }
    }
    memo.set(k, out);
    return out;
  };
}

const scaleOf = (id: string) => entryOf(id)?.drawScale ?? 1;

/** Appends one item (nothing when the cell is missing). */
function push(out: number[], layer: number, key: number, cell: number, wx: number, wy: number, o: { dx?: number; dy?: number; scale?: number; tint?: number; alpha?: number; alt?: number; period?: number } = {}): void {
  if (cell < 0) return;
  out.push(layer, key, cell, wx, wy, o.dx ?? 0, o.dy ?? 0, o.scale ?? 1, o.tint ?? -1, o.alpha ?? 1, o.alt ?? -1, o.period ?? 0);
}

/** One sprite by manifest id, sorted by its footprint's south edge (or its north edge when flat). */
function sprite(out: number[], res: Resolver, id: string, x: number, y: number, o: { frame?: number; heading?: number; flat?: boolean; key?: number; tint?: number; alpha?: number; dx?: number; dy?: number; alt?: number; period?: number } = {}): void {
  const e = entryOf(id);
  if (!e) return;
  const cell = res(id, o.frame ?? 0, o.heading ?? 0);
  const d = e.footprint.d / 2;
  const layer = e.sheet === 'G' ? L_DECAL : L_SORT;
  const key = o.key ?? (o.flat ? y - d : y + d);
  push(out, layer, key, cell, x, y, { dx: o.dx, dy: o.dy, scale: e.drawScale ?? 1, tint: o.tint, alpha: o.alpha, alt: o.alt, period: o.period });
}

const hexInt = (hex: string) => parseInt(hex.replace('#', '').slice(0, 6), 16);

// =====================================================================================================
// 1. The map
// =====================================================================================================

/**
 * What each place of content2 is drawn as (content3 names manifest ids directly in `map.places.*.sprite`:
 * an id the manifest has is used as it is). `flat`: lies on the ground (sorted by its north edge);
 * `corners`: the footprint's four corner marks; `extra`: more sprites at offsets in metres.
 */
export const PLACE_ART: Readonly<Record<string, { id?: string; flat?: boolean; corners?: boolean; lines?: boolean; extra?: { id: string; dx: number; dy: number; flat?: boolean }[] }>> = {
  // No corner marks on the drop-off (L13: they read as hint brackets round the washer; the bay's own art marks it).
  'prop.dropoff.pad': {},
  'plant.scale.platform': { id: 'plant.scale.platform', flat: true },
  'plant.weighbridge.deck': { id: 'plant.weighbridge.deck', extra: [{ id: 'plant.weighbridge.pole', dx: 2.2, dy: -1.6 }, { id: 'plant.weighbridge.display', dx: 2.2, dy: -1.55 }] },
  'prop.scalehouse': { id: 'plant.scalehouse' },
  'prop.bays.lockblock': { id: 'plant.bay' },
  'prop.flatbed.stand': {},
  'prop.stillages': {},
  'plant.stripper.pad': { id: 'ground.pad.strip' },
  'plant.bench.pad': { id: 'ground.pad.bench' },
  'plant.crucible.pad': { id: 'ground.pad.crucible' },
  'prop.noticeboard': { id: 'plant.sign.posts' },
  'prop.office': { id: 'plant.portacabin' },
  'prop.toolrack': { id: 'plant.toolrack' },
  'prop.rubbleskip': { id: 'plant.skip.rubble' },
  'prop.tippingfloor': { corners: true },
  'prop.truckpark': { lines: true },
  'prop.backfield.gate': { id: 'plant.gate.field', extra: [{ id: 'plant.sign.plate', dx: 1.9, dy: 0.2 }] },
};

/** The yard's static sprites (see the header): built once per config and baked art. */
export function staticItems(c: SalvageContent, res: Resolver, extraProps: readonly SalvageContent['props'][number][] = [], dress: readonly Dress[] = []): number[] {
  const out: number[] = [];
  // The look fixer's dressing (./dressing.ts): decals first (under everything, list order), then standing things.
  for (const d of dress) sprite(out, res, d.id, d.x, d.y, { frame: d.frame, flat: d.flat, key: d.key, alpha: d.alpha });
  const W = c.yard.width;
  const D = c.yard.depth;
  const lane = laneGeo(c);
  const gateLo = lane ? lane.gy - lane.half : -1;
  const gateHi = lane ? lane.gy + lane.half : -1;
  // The fence: 2.5 m panels along the four sides, a gap at the gate; with a back wall (map.north) the wall
  // is the north side and no panel stands north of it (it would stand in the sky band).
  const nw = mapNorth(c);
  const y0 = nw !== null && nw > 1 ? nw + 0.4 : 0;
  for (let x = 1.25; x < W; x += 2.5) {
    if (y0 === 0) sprite(out, res, 'plant.fence.ew', x, 0.05);
    sprite(out, res, 'plant.fence.ew', x, D - 0.05);
  }
  for (let y = y0 + 1.25; y < D; y += 2.5) {
    sprite(out, res, 'plant.fence.ns', 0.05, y);
    if (!lane || y + 1.25 <= gateLo || y - 1.25 >= gateHi) sprite(out, res, 'plant.fence.ns', W - 0.05, y);
  }
  if (lane) {
    sprite(out, res, 'plant.gate.leaf.open', W - 0.3, gateLo - 1.6);
    sprite(out, res, 'plant.gate.leaf.open', W - 0.3, gateHi + 1.6);
  }
  // The ground work's props: the container wall (tinted per container), rubble, crates.
  [...c.props, ...extraProps].forEach((p, i) => {
    if (p.kind === 'wall') sprite(out, res, p.d >= p.w ? 'plant.container.ns' : 'plant.container.ew', p.x, p.y, { tint: hexInt(CONTAINER_TINTS[i % CONTAINER_TINTS.length]) });
    else if (p.kind === 'pile') sprite(out, res, ['plant.heap.li', 'plant.heap.hms', 'plant.heap.ci'][i % 3], p.x, p.y);
    else if (p.kind === 'crate') sprite(out, res, 'plant.block', p.x, p.y);
  });
  // The places, from their footprints.
  for (const [id, pl] of Object.entries(c.map.places)) {
    const pt = c.map.points[id];
    if (!pt) continue;
    const [x, y] = pt;
    // join2 (the lead's stillage ruling, 17:10): a stillage stands only once its grade has been weighed in
    // (the rules' frame draws it, bayItems); the block's reserved spots show only their painted corners.
    const art = pl.sprite === 'plant.stillage' ? { corners: true } as (typeof PLACE_ART)[string] : entryOf(pl.sprite) ? { id: pl.sprite, flat: !pl.solid } : PLACE_ART[pl.sprite];
    if (!art) continue;
    // A standing place (a building with a door, a block) sorts by its CONTENT footprint's front edge (L12): a person at its door is drawn in front.
    if (art.id) sprite(out, res, art.id, x, y, { flat: art.flat, key: pl.solid && !art.flat ? y + pl.d / 2 : undefined });
    for (const ex of art.extra ?? []) sprite(out, res, ex.id, x + ex.dx, y + ex.dy, { flat: ex.flat });
    if (art.corners) {
      const hw = pl.w / 2 - 0.3;
      const hd = pl.d / 2 - 0.3;
      [
        [-hw, -hd],
        [hw, -hd],
        [hw, hd],
        [-hw, hd],
      ].forEach(([ox, oy], k) => sprite(out, res, 'ground.corner', x + ox, y + oy, { frame: k }));
    }
    if (art.lines) {
      sprite(out, res, 'ground.line.ns', x - pl.w / 2, y);
      sprite(out, res, 'ground.line.ns', x + pl.w / 2, y);
    }
  }
  // The old stock's beds, under each zone's things (behind anything standing on them).
  let bed = entryOf('ground.bed') ? 99 : 1;
  for (const z of Object.values(c.zones)) {
    if (z.r < 2 || bed > 3) continue;
    sprite(out, res, `heap.zone${bed}`, z.centre[0], z.centre[1], { key: z.centre[1] - 1.3 });
    bed++;
  }
  if (lane) laneItems(out, res, lane, W);
  return out;
}

/** A stable 0..1 hash of an integer (the lane's runs and roadside things). */
const h1 = (n: number) => {
  let h = Math.imul(n ^ 0x9e3779b9, 2654435761);
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519);
  h ^= h >>> 13;
  return ((h >>> 0) % 10007) / 10007;
};

/**
 * The lane east of the gate (L7, the lane's art is look-lane's): asphalt and verges; the country beyond the
 * hedges (fields in runs of one kind, the treeline as the skyline band north); roadside variety every 30 to
 * 40 m so that motion reads; the partners' sites (the farm with its house and sign, the demolition site's
 * hoarding and sign); the lane's end across the road before the bridge. Ids the manifest lacks are skipped.
 */
function laneItems(out: number[], res: Resolver, l: LaneGeo, W: number): void {
  const end = laneDrawEnd(l);
  const has = (id: string) => entryOf(id) !== undefined;
  const nHedge = l.gy - l.half - 0.6;
  const sHedge = l.gy + l.half + 0.6;
  for (let x = W + 1.5; x < end; x += 3) {
    for (let y = l.gy - l.half + 1.5; y < l.gy + l.half; y += 3) sprite(out, res, 'ground.asphalt', x, y);
    for (const side of [-1, 1]) {
      const vy = l.gy + side * (l.half + 1.5);
      sprite(out, res, l.bridge !== null && Math.abs(x - l.bridge) < 3 ? 'ground.water' : 'ground.verge', x, vy);
    }
  }
  // The country: fields (flat 6 x 4 m tiles, one kind per run of 18 to 30 m) north of the north hedge up
  // to the treeline and three rows south of the south hedge; the treeline every 8 m, behind everything.
  const treeY = l.gy - l.half - 5.5;
  if (has('lane.field')) {
    const fw = entryOf('lane.field')!.footprint.w;
    const fd = entryOf('lane.field')!.footprint.d;
    let run = 0;
    let runEnd = W + 18 + h1(0) * 12;
    for (let x = W + fw / 2; x < end + fw; x += fw) {
      if (x > runEnd) {
        run++;
        runEnd += 18 + h1(run * 7 + 1) * 12;
      }
      const kind = Math.floor(h1(run * 13 + 5) * 3);
      for (let y = l.gy - l.half - 1.6 - fd / 2; y > treeY - fd; y -= fd) sprite(out, res, 'lane.field', x, y, { frame: kind, flat: true, key: treeY + 0.01 });
      const kindS = Math.floor(h1(run * 17 + 3) * 3);
      for (let k = 0; k < 3; k++) sprite(out, res, 'lane.field', x, l.gy + l.half + 1.6 + fd / 2 + k * fd, { frame: kindS, flat: true, key: l.gy + l.half + 1.6 + k * fd });
    }
  }
  if (has('lane.treeline')) {
    const tw = entryOf('lane.treeline')!.footprint.w;
    for (let x = W + tw / 2 - 2, k = 0; x < end + tw; x += tw, k++) sprite(out, res, 'lane.treeline', x, treeY, { frame: k % 2, key: treeY - 50 });
  }
  // Roadside variety, alternating verges; a field gate stands in a gap of the hedge.
  const kinds = ['lane.milepost', 'lane.pole', 'lane.gate.field', 'lane.gritbin'].filter(has);
  const gaps: { x: number; north: boolean }[] = [];
  const nearSite = (x: number) => l.sites.some((s) => Math.abs(s.x - x) < 7) || (l.bridge !== null && Math.abs(l.bridge - x) < 6);
  if (kinds.length) {
    let k = 0;
    for (let x = W + 22; x < l.end - 4; x += 30 + h1(k * 3 + 11) * 10, k++) {
      if (nearSite(x)) continue;
      const id = kinds[Math.floor(h1(k * 5 + 2) * kinds.length)];
      const north = k % 2 === 0;
      if (id === 'lane.gate.field') {
        gaps.push({ x, north });
        sprite(out, res, id, x, north ? nHedge : sHedge);
      } else sprite(out, res, id, x, l.gy + (north ? -1 : 1) * (l.half + 1.2));
    }
  }
  for (let x = W + 2; x < end; x += 3) {
    if (nearSite(x)) continue;
    // A field gate stands in a gap of one hedge: that side's hedge sprite is left out there.
    const g = gaps.find((q) => Math.abs(q.x - x) < 2.4);
    if (!g || !g.north) sprite(out, res, 'lane.hedge', x, nHedge);
    if (!g || g.north) sprite(out, res, 'lane.hedge', x, sHedge);
  }
  for (const s of l.sites) {
    if (s.look === 0) {
      sprite(out, res, 'lane.shed.farm', s.x, l.gy - l.half - 2.2);
      sprite(out, res, 'lane.farmhouse', s.x + 3.5, l.gy - l.half - 4.6);
    } else {
      sprite(out, res, 'lane.hoarding', s.x - 3.5, l.gy - l.half - 0.4);
      sprite(out, res, 'lane.hoarding.gate', s.x, l.gy - l.half - 0.4);
      sprite(out, res, 'lane.hoarding', s.x + 3.5, l.gy - l.half - 0.4);
    }
    sprite(out, res, 'ground.hatch', s.x, l.gy + l.half - 0.5);
  }
  for (const sg of laneSigns(l)) sprite(out, res, 'lane.sign.partner', sg.x, sg.y, { frame: sg.frame });
  if (l.bridge !== null) {
    sprite(out, res, 'lane.parapet', l.bridge, l.gy - l.half - 0.2);
    sprite(out, res, 'lane.parapet', l.bridge, l.gy + l.half + 0.2);
    sprite(out, res, 'lane.sign.limit', l.bridge - 3, l.gy - l.half - 0.8);
  }
  // The lane's end (P10, L7): across the road where the truck must stop (./collide.ts keepInside: laneGeo end).
  if (has('lane.end')) sprite(out, res, 'lane.end', l.end + 0.4, l.gy);
  else if (l.bridge !== null) sprite(out, res, 'lane.barrier', l.bridge - 1.6, l.gy);
}

// =====================================================================================================
// 2. The rules' picture
// =====================================================================================================

/** C-WORLD-1: the works' poses (plasma, analyse) are appended at the END, so the first yard's codes keep their numbers. */
export const POSES = ['stand', 'walk', 'push', 'feed', 'pour', 'spanner', 'sledge', 'grinder', 'torch', 'plasma', 'analyse'] as const;
export type PoseName = (typeof POSES)[number];
export const P_STAND = 0;
export const P_WALK = 1;
export const P_PUSH = 2;
export const P_FEED = 3;
export const P_POUR = 4;
/** Within this many metres of the pot while the pour shows, a person is drawn pouring (frameLoop.ts's 3.5 m). */
export const POUR_NEAR_M = 3.5;
export const P_SPANNER = 5;
export const P_SLEDGE = 6;
export const P_GRINDER = 7;
export const P_TORCH = 8;
/** The boss's own plasma cutter (works; person.boss.plasma, sheet D) and the analyser's reading (person.boss.analyse). */
export const P_PLASMA = 9;
export const P_ANALYSE = 10;
/** Frames per pose (the manifest's person entries). */
export const POSE_FRAMES = [1, 4, 4, 2, 1, 2, 2, 2, 2, 2, 1];
/** Poses in the actor table (= POSES.length; a worklet reads this number, not the array). */
export const N_POSES = 11;
/** The first pose whose entries live on the works' sheet (8 headings: the actor table asks heading h x 2). */
export const P_WORKS_FIRST = P_PLASMA;

export const ROLE_CODE: Record<string, number> = { hand: 0, cutter: 1, driver: 2 };
/** The rules' trip phases as numbers (TripPhase): the truck moves along its path in out, back and park. */
export const LEG_CODE: Record<string, number> = { out: 0, hook: 1, back: 2, weigh: 3, tip: 4, walk: 5, park: 6 };
export const FLATBED_CODE: Record<string, number> = { waiting: 0, loading: 1, away: 2 };
export const ARRIVAL_CODE: Record<string, number> = { van: 0, machineFlatbed: 1, truck: 2, crew: 3, dropoff: 4, recovery: 5, lowLoader: 6 };
/**
 * C-WORLD-1: the first arrival code the works own (recovery 5, lowLoader 6); a kind the table does not know packs as
 * ARRIVAL_UNKNOWN. The frame loop draws codes below ARRIVAL_WORKS_FIRST itself and hands every other one to
 * ./worksVehicleMotion.ts worksVehiclesInto (C-WORLD-2). The first yard's kinds keep their codes.
 */
export const ARRIVAL_WORKS_FIRST = 5;
export const ARRIVAL_UNKNOWN = -1;
export const ARRIVAL_PHASE: Record<string, number> = { in: 0, setDown: 1, out: 2 };

/** Numbers per crew member in RulesScene.crew. */
export const CREW = 14;
/** Numbers per arrival in RulesScene.arrivals. */
export const ARRIVAL = 10;
/**
 * At most this many points of a vehicle's path (./motion.ts PATH_MAX_PTS, equal: worksHooks.test.ts; the frame loop's
 * scratch path holds as many). C-WORLD-1: 16 (was 12): the recovery truck's way to the works (gate, drive line, works road,
 * the turning loop's five points, its stop) is 12 to 14 points and must never be shortened (s2c-plan-world 3.2, 3.3 rule 7).
 */
export const PATH_MAX = 16;

/**
 * What the rules decided, for the UI thread (one shared value, ./useRulesTable.ts). Nothing in it is
 * computed by the screen: every number is a frame fact, re-packed.
 */
export interface RulesScene {
  /** The frame's yard second, a counter that changes with every push, and the epoch (a change snaps every actor). */
  t: number;
  n: number;
  epoch: number;
  items: number[];
  /** Packed solids of the whole things standing in the yard (collision). */
  solids: number[];
  /** CREW numbers each: role, pose, fx, fy, tx, ty, t0, t1, carrier (0 none, 1 sack, 2 trolley), carrier frame, phase (0 wait, 1 walkTo, 2 work, 3 walkBack), hidden, via x, via y (NaN none). */
  crew: number[];
  /** owned, x, y, heading8, skip (0 none, 1 empty, 2 loaded), by (0 none, 1 boss, 2 driver), leg code or -1, t0, t1, hook share or -1, skip load frame or -1, path points, the instant the leg's driving ends (NaN: at t1), the facing while standing (heading8, -1: the path's). */
  truck: number[];
  /** The leg's path: x, y per point (at most PATH_MAX). */
  truckPath: number[];
  /** owner1 V1: the yard second the truck passes each point of truckPath (the frame's `leg.at`); empty: drawn evenly over the leg. */
  truckAt: number[];
  /** phase code, t0, t1, x, y, cargo (0 none, 1 part, 2 full), path points. */
  flatbed: number[];
  flatbedPath: number[];
  /** owner1 V3: the yard second the flatbed passes each point of flatbedPath going out (the frame's `at`); empty: the old even drive. */
  flatbedAt: number[];
  /** on, from x, from y, to x, to y, t0, t1 (the public's car and trailer). */
  car: number[];
  /** ARRIVAL numbers each: kind code, phase code, from x, from y, to x, to y, t0, t1, path points (0: straight from from to to), first point in arrivalPath. */
  arrivals: number[];
  /** owner1 V4: the arrivals' paths along the drive line to their stop (x, y per point) and the yard second each is passed. */
  arrivalPath: number[];
  arrivalAt: number[];
  /** carrier (0 frame, 1 sack, 2 trolley), hand family or -1, carrier frame, the rules' pose (P_*, -1 drive), target x, y (NaN none), pour x, y (NaN none), pieces carried, x, y, heading4. */
  boss: number[];
  cut: number[];
  carried: number;
  /** C-WORLD-1: the truck's model, TRUCK_MODELS' row (absent: 0, today's truck). Present only from the works' opening. */
  truckModel?: number;
}

export const NO_SCENE: RulesScene = {
  t: 0,
  n: 0,
  epoch: 0,
  items: [],
  solids: [],
  crew: [],
  truck: [0, 0, 0, 0, 0, 0, -1, 0, 0, -1, -1, 0, NaN, -1],
  truckPath: [],
  truckAt: [],
  flatbed: [0, 0, 0, 0, 0, 0, 0],
  flatbedPath: [],
  flatbedAt: [],
  car: [0, 0, 0, 0, 0, 0, 0],
  arrivals: [],
  arrivalPath: [],
  arrivalAt: [],
  boss: [0, -1, 0, P_STAND, NaN, NaN, NaN, NaN, 0, NaN, NaN, 0],
  cut: [],
  carried: 0,
};

const famIndex = (f: LoadFamily | null) => (f ? HAND_FAMILIES.indexOf(handFamilyOf(f)) : -1);
const famOfGrade = (grade: string | undefined) => (grade ? loadFamily(grade) : null);

/** A stable small hash of a string (which of a grade's piece pictures a piece shows). */
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** The rules' pose (types.ts Pose) as the art's pose index; -1 for 'drive' (in the cab: not drawn on foot). */
export function poseCode(pose: string | undefined, tool?: string | null, family?: string | null): number {
  switch (pose) {
    case 'walk':
    case 'carry':
      return P_WALK;
    case 'push':
      return P_PUSH;
    case 'feed':
      return P_FEED;
    case 'pour':
      return P_POUR;
    case 'spanner':
      return P_SPANNER;
    case 'sledge':
      return family === 'ci' || family === undefined || family === null ? P_SLEDGE : P_GRINDER;
    case 'grinder':
      return P_GRINDER;
    case 'torch':
      return P_TORCH;
    case 'plasma':
      return P_PLASMA;
    case 'analyse':
      return P_ANALYSE;
    case 'drive':
      return -1;
    default:
      return tool ? poseCode(tool, null, family) : P_STAND;
  }
}

/** Which of the partners' looks (0 the farm's, 1 the demolition site's) a partner id has: its order in content. */
const partnerLook = (c: SalvageContent, id: string) => Math.max(0, Object.keys(c.partners).indexOf(id)) % 2;
const SKIP_LOAD_FRAMES = ['farm-trial', 'farm-full', 'demolition-trial', 'demolition-full'];
const skipLoadFrame = (look: number, trial: boolean) => SKIP_LOAD_FRAMES.indexOf(`${look === 0 ? 'farm' : 'demolition'}-${trial ? 'trial' : 'full'}`);

type Pt = { x: number; y: number };
const flat = (pts: readonly Pt[] | undefined): number[] => (pts ?? []).slice(0, PATH_MAX).flatMap((p) => [p.x, p.y]);

/**
 * A dated path the frame gives (points and the second each is passed) as the scene packs it: at most PATH_MAX
 * points (a longer one keeps its first PATH_MAX - 1 and its last, with their dates), or null when the dates do
 * not match the points. Pure.
 */
export function datedPath(pts: readonly Pt[] | undefined, at: readonly number[] | undefined): { path: number[]; at: number[] } | null {
  if (!pts || !at || pts.length < 1 || at.length !== pts.length || !at.every((v) => Number.isFinite(v))) return null;
  const keep = pts.length > PATH_MAX ? [...pts.keys()].filter((i) => i < PATH_MAX - 1 || i === pts.length - 1) : [...pts.keys()];
  return { path: keep.flatMap((i) => [pts[i].x, pts[i].y]), at: keep.map((i) => at[i]) };
}

/** The nearest point of a polyline [x0, y0, ...] to (x, y): its x, y and its place along the line (segment index + share). */
export function nearestOnLine(line: readonly number[], x: number, y: number): { x: number; y: number; at: number } {
  let best = { x: line[0], y: line[1], at: 0 };
  let bestD = Infinity;
  for (let i = 0; i + 3 < line.length; i += 2) {
    const ax = line[i];
    const ay = line[i + 1];
    const dx = line[i + 2] - ax;
    const dy = line[i + 3] - ay;
    const l2 = dx * dx + dy * dy;
    const u = l2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
    const px = ax + dx * u;
    const py = ay + dy * u;
    const d = (px - x) * (px - x) + (py - y) * (py - y);
    if (d < bestD) {
      bestD = d;
      best = { x: px, y: py, at: i / 2 + u };
    }
  }
  return best;
}

/**
 * A vehicle's path inside the yard laid on the drive line (MAP.md M4, P15): each leg whose two ends lie
 * inside the yard (x at most the fence's) goes from its start straight onto the line, along the line, and
 * off it straight to its end; legs out on the lane stay as they are. A path that would grow past PATH_MAX
 * points, or a map without a line, is kept as given. Pure.
 */
export function viaDriveLine(path: readonly number[], line: readonly number[], W: number): number[] {
  if (line.length < 4 || path.length < 4) return [...path];
  const out: number[] = [path[0], path[1]];
  for (let i = 2; i + 1 < path.length; i += 2) {
    const ax = path[i - 2];
    const ay = path[i - 1];
    const bx = path[i];
    const by = path[i + 1];
    if (ax <= W && bx <= W + 1) {
      const a = nearestOnLine(line, ax, ay);
      const b = nearestOnLine(line, bx, by);
      const push = (x: number, y: number) => {
        const n = out.length;
        if (Math.abs(out[n - 2] - x) > 0.05 || Math.abs(out[n - 1] - y) > 0.05) out.push(x, y);
      };
      push(a.x, a.y);
      if (b.at > a.at) for (let k = Math.ceil(a.at); k < b.at; k++) push(line[k * 2], line[k * 2 + 1]);
      else for (let k = Math.floor(a.at); k > b.at; k--) push(line[k * 2], line[k * 2 + 1]);
      push(b.x, b.y);
      push(bx, by);
    } else out.push(bx, by);
  }
  return out.length / 2 > PATH_MAX ? [...path] : out;
}

/** Below this gap two solids are one (MAP.md M6: a gap is at least 1.5 m or closed; a body never wedges in a slit). */
export const MIN_GAP_M = 1.2;

/** Boxes [x0, x1, y0, y1] whose gap is under `gap` merged into their bounding boxes (repeatedly). Pure. */
export function mergeBoxes(boxes: readonly number[][], gap: number): number[][] {
  const out = boxes.map((b) => [...b]);
  let merged = true;
  while (merged) {
    merged = false;
    for (let i = 0; i < out.length && !merged; i++)
      for (let j = i + 1; j < out.length && !merged; j++) {
        const a = out[i];
        const b = out[j];
        const gx = Math.max(a[0], b[0]) - Math.min(a[1], b[1]);
        const gy = Math.max(a[2], b[2]) - Math.min(a[3], b[3]);
        if (gx < gap && gy < gap) {
          out[i] = [Math.min(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.max(a[3], b[3])];
          out.splice(j, 1);
          merged = true;
        }
      }
  }
  return out;
}

/** A bay's sprites by its kind and fill share (content `grades.<id>.bay`; the art owns the levels). */
function bayItems(out: number[], res: Resolver, b: R.FrameBay): void {
  const kind = b.kind ?? (b.sprite?.startsWith('bay.') ? 'heap' : b.grade === 'conv' ? 'cage' : 'stillage');
  const share = b.share ?? (b.fill ?? 0) / 4;
  if (kind === 'heap') {
    if (share > 0) {
      const base = b.look && entryOf(`${b.look}.1`) ? b.look : `heap.${b.grade}`;
      sprite(out, res, `${base}.${Math.max(1, Math.min(5, Math.ceil(share * 5)))}`, b.x, b.y);
    }
  } else if (kind === 'cage') {
    sprite(out, res, 'plant.cage.converter', b.x, b.y, { frame: share > 0 ? 1 : 0 });
  } else {
    sprite(out, res, 'plant.stillage', b.x, b.y);
    const layers = share <= 0 ? 0 : share <= 0.5 ? 1 : 2;
    for (let k = 0; k < layers; k++) sprite(out, res, `plant.stillage.layer.${b.grade}`, b.x, b.y, { key: b.y + 0.5 + 0.001 * (k + 1), dy: STILLAGE_LAYER_DY * k });
    sprite(out, res, 'plant.stillage.front', b.x, b.y, { key: b.y + 0.51 });
  }
  if (b.held) sprite(out, res, 'plant.flag.hold', b.x + 0.5, b.y - 0.3);
}

/** The rules' picture of a frame (see the header). Pure; reads the hour-0 fields where the newer ones are missing. */
/** A thing standing inside one of the zones' beds (content `zones.<id>.bed`). */
function inBed(c: SalvageContent, x: number, y: number): boolean {
  for (const z of Object.values(c.zones ?? {}) as { bed?: { x0: number; y0: number; w: number; d: number } }[]) {
    const b = z.bed;
    if (b && x >= b.x0 && x <= b.x0 + b.w && y >= b.y0 && y <= b.y0 + b.d) return true;
  }
  return false;
}

/**
 * join2 (seam c): a heap reads as a heap, in the DRAW only (the rules' positions and footprints stay):
 * every thing of a bed is drawn at a small offset from its uid (about +-0.2 m east-west, lifted up to
 * 0.2 m so the nearer row overlaps the farther), and every other row is staggered by a quarter metre.
 * Points at 40 a metre, the ground's tilt 0.7 on the vertical.
 */
export function heapJitter(uid: string, y: number): { dx: number; dy: number } {
  let h = 2166136261;
  for (let i = 0; i < uid.length; i++) h = Math.imul(h ^ uid.charCodeAt(i), 16777619);
  const u = ((h >>> 0) % 1000) / 1000;
  const v = ((h >>> 10) % 1000) / 1000;
  const row = Math.floor(y / 0.86) % 2;
  return { dx: ((u - 0.5) * 0.4 + (row ? 0.25 : 0)) * 40, dy: -v * 0.2 * 40 * 0.7 };
}

/**
 * owner1 L2 (the owner's review, point 1): the frame keeps its `things` and `pieces` the SAME objects between
 * events, so their atlas items are built once per object and reused (and the scene's whole item list too when
 * nothing else in it changed): a tick that moved nobody's things costs no item work and hands the UI thread
 * the same array (./useRulesTable.ts pushes it only when it changed).
 */
const THING_ITEMS = new WeakMap<object, { c: SalvageContent; res: Resolver; all: readonly R.FrameThing[]; items: number[]; solids: number[] }>();
const PIECE_ITEMS = new WeakMap<object, { c: SalvageContent; res: Resolver; items: number[] }>();
const LAST_ITEMS = new WeakMap<SalvageContent, { res: Resolver; a: number[]; b: number[]; rest: number[]; items: number[]; ra: number[]; rsol: number[]; solids: number[] }>();
const sameNums = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((v, i) => v === b[i] || (v !== v && b[i] !== b[i]));

function thingItems(c: SalvageContent, f: R.FrameTable, res: Resolver, things: readonly R.FrameThing[] = f.things): { items: number[]; solids: number[] } {
  // C-WORLD-1: `things` is the frame's list, or from the works' opening the floor's override (./worksScene.ts floorItems):
  // cached by that list, the beds still read the frame's whole list.
  const hit = THING_ITEMS.get(things);
  if (hit && hit.c === c && hit.res === res && hit.all === f.things) return hit;
  const items: number[] = [];
  const solids: number[] = [];
  // The old stock's beds (the look's ./dressing.ts bedsDress), shrinking as each zone's stock is worked.
  if (entryOf('ground.bed')) for (const d of bedsDress(c, bedShares(c, f.things))) sprite(items, res, d.id, d.x, d.y, { frame: d.frame, flat: d.flat, key: d.key, alpha: d.alpha });
  // Things, whole and in their stages (the art's stageOf over pieces off and in all).
  for (const th of things) {
    const o = c.objects[th.obj];
    const id = entryOf(th.sprite) ? th.sprite : (OBJECT_SPRITE[th.obj] ?? th.sprite.replace(/\.(whole|cut\d+)$/, ''));
    const e = entryOf(id);
    if (!e) continue;
    const total = th.total ?? o?.pieces.reduce((a, p) => a + p[2], 0) ?? 1;
    const off = th.off ?? (th.stage > 0 ? Math.round((th.stage / Math.max(1, (o?.stages ?? 2) - 1)) * total) : 0);
    const frame = stageOf(e.frames.length, off, total);
    const j = inBed(c, th.x, th.y) ? heapJitter(th.uid, th.y) : null;
    sprite(items, res, id, th.x, th.y, { frame, tint: off === 0 ? thingLookTint(th.uid) : -1, dx: j?.dx, dy: j?.dy });
    if (off === 0) solids.push(1, th.x, th.y, Math.max(0.3, Math.min(o?.size.w ?? e.footprint.w, e.footprint.w) / 2), Math.max(0.2, Math.min(o?.size.d ?? e.footprint.d, e.footprint.d) / 2));
  }
  const out = { c, res, all: f.things, items, solids };
  THING_ITEMS.set(things, out);
  return out;
}

function pieceItems(c: SalvageContent, f: R.FrameTable, res: Resolver, pieces: readonly R.FramePiece[] = f.pieces): number[] {
  const hit = PIECE_ITEMS.get(pieces);
  if (hit && hit.c === c && hit.res === res) return hit.items;
  const items: number[] = [];
  // Pieces on the ground.
  for (const p of pieces) {
    const list = GRADE_SPRITE[p.grade];
    const id = entryOf(p.sprite) ? p.sprite : list ? list[hashStr(p.uid) % list.length] : null;
    if (id) sprite(items, res, id, p.x, p.y, { frame: id.startsWith('piece.ingot') ? 3 : 0 });
  }
  PIECE_ITEMS.set(pieces, { c, res, items });
  return items;
}

export function rulesScene(c: SalvageContent, f: R.FrameTable, res: Resolver, n = 0): RulesScene {
  // C-WORLD-1: from the works' opening the floor may draw its things and pieces aggregated (./worksScene.ts floorItems,
  // WLD-FLOOR); below it (every first-yard frame) the override is null and the frame's lists are drawn as before.
  const floor = floorItems(c, f, res);
  const A = floor ? thingItems(c, f, res, floor.things) : thingItems(c, f, res);
  const B = floor ? pieceItems(c, f, res, floor.pieces) : pieceItems(c, f, res);
  const items: number[] = [];
  const solids: number[] = [];
  // Machines in their looks; bays; partners' skips; circles; equipment the rules add.
  let pourAt: Pt | null = null;
  for (const m of f.machines) machineItems(items, res, m, f.t, (p) => (pourAt = p));
  const cages: number[][] = [];
  for (const b of f.bays) {
    bayItems(items, res, b);
    // Every drawn stillage and cage is solid at its drawn size (P13): nobody walks through a cage.
    const kind = b.kind ?? (b.sprite?.startsWith('bay.') ? 'heap' : b.grade === 'conv' ? 'cage' : 'stillage');
    if (kind !== 'heap') {
      const e = entryOf(kind === 'cage' ? 'plant.cage.converter' : 'plant.stillage');
      if (e) cages.push([b.x - e.footprint.w / 2, b.x + e.footprint.w / 2, b.y - e.footprint.d / 2, b.y + e.footprint.d / 2]);
    }
  }
  for (const box of mergeBoxes(cages, MIN_GAP_M)) solids.push(1, (box[0] + box[1]) / 2, (box[2] + box[3]) / 2, (box[1] - box[0]) / 2, (box[3] - box[2]) / 2);
  for (const s of f.skips) {
    sprite(items, res, 'vehicle.skip', s.x, s.y);
    if (s.state !== 'filling') sprite(items, res, 'vehicle.skip.load', s.x, s.y, { frame: skipLoadFrame(partnerLook(c, s.partner), s.state === 'trial'), key: s.y + 0.876, dy: -0.95 * 40 * Math.sqrt(1 - 0.49) });
  }
  // owner1 play 13: an EMPTY chalk circle (no thing, no piece inside it) is drawn faint, a quarter of its ink.
  for (const ci of f.circles) sprite(items, res, 'ground.chalk', ci.x, ci.y, { alpha: circleFilled(f, ci) ? 1 : CHALK_EMPTY_ALPHA });
  for (const fx of f.fixtures ?? []) sprite(items, res, fx.sprite, fx.x, fx.y);
  // C-WORLD-1: the works' plant (./worksScene.ts worksItems; nothing below the works' opening) and the floor's heaps.
  if (floor) for (const v of floor.items) items.push(v);
  for (const v of worksItems(c, f, res)) items.push(v);
  // One list, presorted (./frameLoop.ts merges it, sortRuns), reused whole while its parts are the same.
  const last = LAST_ITEMS.get(c);
  let allItems: number[];
  let allSolids: number[];
  // owner1 phone 2: when identity fails (the frame rebuilds `things` while only a work ring's progress moved),
  // compare by content: an unchanged list keeps its identity, so the UI thread is never handed an equal copy.
  if (last && last.res === res && (last.a === A.items || sameNums(last.a, A.items)) && (last.b === B || sameNums(last.b, B)) && sameNums(last.rest, items)) allItems = last.items;
  else allItems = presortItems([...A.items, ...B, ...items]);
  if (last && (last.ra === A.solids || sameNums(last.ra, A.solids)) && sameNums(last.rsol, solids)) allSolids = last.solids;
  else allSolids = [...A.solids, ...solids];
  LAST_ITEMS.set(c, { res, a: A.items, b: B, rest: items, items: allItems, ra: A.solids, rsol: solids, solids: allSolids });

  // The boss: carrier, load, the rules' pose and target, his place (for the snap on an epoch change).
  const carrier = f.load.carrier === 'sack' ? 1 : f.load.carrier === 'trolley' ? 2 : 0;
  const heaviest = f.load.pieces.reduce<{ grade: string; g: number; load?: LoadFamily } | null>((a, p) => (!a || p.g > a.g ? p : a), null);
  const fam = (heaviest?.load as LoadFamily | undefined) ?? famOfGrade(heaviest?.grade);
  const fb = f.boss as Partial<R.FrameBoss> | undefined;
  let pose = fb ? poseCode(fb.pose, fb.tool, famOfGrade(fb.grade ?? undefined)) : P_STAND;
  let target: Pt | null = null;
  const worked = f.things.find((t) => (fb?.target ? t.uid === fb.target : t.by === 'boss' && t.work !== null));
  if (worked && (fb?.act === 'work' || !fb)) {
    target = worked;
    if (!fb) pose = guessPose(c, worked.obj);
  }
  const pa = pourAt as Pt | null;
  // The pour (desk1): whoever stands at the pot while the picture shows the pour is drawn in the pour pose
  // (face shield down, aluminised apron: art/people.draw.ts), the boss unless he is at work with a tool.
  if (pa && fb && fb.x !== undefined && fb.y !== undefined && pose >= 0 && pose <= P_FEED && Math.hypot(fb.x - pa.x, fb.y - pa.y) < POUR_NEAR_M) pose = P_POUR;
  const boss = [carrier, f.load.pieces.length && carrier === 0 ? famIndex(fam) : -1, carrierFrameOf(fam && f.load.pieces.length ? fam : null), pose, target ? target.x : NaN, target ? target.y : NaN, pa ? pa.x : NaN, pa ? pa.y : NaN, f.load.pieces.length, fb?.x ?? NaN, fb?.y ?? NaN, fb?.heading ?? 0];

  // Crew legs (E17: the walk IS the leg; nothing here decides where anyone goes).
  const crew: number[] = [];
  const wallX = wallLine(c);
  const via0 = c.helpers.via;
  for (const m of f.crew) {
    const phase = m.phase === 'walkTo' ? 1 : m.phase === 'walkBack' ? 3 : m.phase === 'work' ? 2 : 0;
    let pc = m.pose ? poseCode(m.pose, m.tool, m.load[0]?.load ?? null) : P_STAND;
    if (!m.pose && phase === 2) pc = m.job === 'cutDropoff' || m.job === 'cutFloor' ? P_GRINDER : m.job === 'feed' ? P_FEED : m.job === 'pour' ? P_POUR : P_STAND;
    if (pa && (phase === 0 || (phase === 2 && pc <= P_FEED)) && Math.hypot(m.to.x - pa.x, m.to.y - pa.y) < POUR_NEAR_M) pc = P_POUR;
    const lf = m.load.length ? ((m.load[0].load as LoadFamily | undefined) ?? famOfGrade(m.load[0].grade)) : null;
    const carrierKind = m.role === 'hand' ? 1 : 0;
    const hidden = pc === -1 || (m.job === 'drive' && (phase === 2 || f.truck.by === 'driver')) ? 1 : 0;
    const v = m.via?.[0] ?? (wallX !== null && via0 && (m.from.x - wallX) * (m.to.x - wallX) < 0 ? { x: via0[0], y: via0[1] } : null);
    crew.push(ROLE_CODE[m.role] ?? 0, Math.max(0, pc), m.from.x, m.from.y, m.to.x, m.to.y, m.t0, m.t1, carrierKind, carrierFrameOf(lf), phase, hidden, v ? v.x : NaN, v ? v.y : NaN);
  }

  // The truck: where it stands, its skip, the driver's leg and its path.
  const tk = f.truck;
  const leg = tk.leg;
  const lane = laneGeo(c);
  const loadState = tk.load?.state ?? (tk.skip === 'none' ? null : tk.skip);
  const loadPartner = tk.load?.partner ?? leg?.partner ?? f.skips.find((s) => s.state !== 'filling')?.partner ?? null;
  const skipFrame = loadState === 'trial' || loadState === 'full' ? skipLoadFrame(loadPartner ? partnerLook(c, loadPartner) : 0, loadState === 'trial') : -1;
  const line = mapDriveLine(c);
  const tl = tripLeg(c, tk, line);
  const truckPath = tl.path;
  const truckAt = tl.at;
  const truck = [tk.owned ? 1 : 0, tk.x, tk.y, tk.heading ?? 0, loadState === null ? 0 : skipFrame >= 0 ? 2 : 1, tk.by === 'boss' ? 1 : tk.by === 'driver' ? 2 : 0, leg ? (LEG_CODE[leg.phase] ?? -1) : -1, leg?.t0 ?? 0, leg?.t1 ?? 0, tk.hook ?? -1, skipFrame, truckPath.length / 2, tl.driveEnd, tl.face];

  // The merchant's flatbed and its path; the public's car; purchases arriving.
  const fbd = f.flatbed;
  // owner1 V3: a dated away path (along the drive line at the yard's speed) is drawn as the frame dates it.
  const fbDated = fbd.phase === 'away' ? datedPath(fbd.path, (fbd as { at?: number[] }).at) : null;
  let flatbedPath = fbDated ? fbDated.path : flat(fbd.path);
  const flatbedAt = fbDated && fbDated.at.length >= 2 ? fbDated.at : [];
  if (!flatbedAt.length) {
    if (flatbedPath.length < 4) {
      const gate = c.map.points.gate ?? [c.yard.width - 1, c.yard.depth / 2];
      flatbedPath = [fbd.x, fbd.y, fbd.x, gate[1], gate[0], gate[1], lane ? Math.min(lane.gx + 60, laneDrawEnd(lane)) : gate[0] + 20, gate[1]];
    }
    flatbedPath = viaDriveLine(flatbedPath, line, c.yard.width);
  }
  const flatbed = [FLATBED_CODE[fbd.phase] ?? 0, fbd.t0, fbd.t1, fbd.x, fbd.y, fbd.load <= 0 ? 0 : fbd.load < 3 ? 1 : 2, flatbedPath.length / 2];
  const dc = f.dropoffCar;
  const gate = c.map.points.gate ?? [c.yard.width - 1, c.yard.depth / 2];
  const car = dc ? [1, dc.from?.x ?? gate[0] + 25, dc.from?.y ?? gate[1], dc.to?.x ?? dc.x, dc.to?.y ?? dc.y, dc.t0, dc.t1] : [0, 0, 0, 0, 0, 0, 0];
  const arrivals: number[] = [];
  const arrivalPath: number[] = [];
  const arrivalAt: number[] = [];
  for (const a of f.arrivals ?? []) {
    // owner1 V4: by the drive line to the stop nearest the place, set down there (the frame's path and dates).
    const d = datedPath(a.path, a.at);
    const np = d && d.path.length >= 4 ? d.path.length / 2 : 0;
    const p0 = arrivalAt.length;
    if (d && np) {
      arrivalPath.push(...d.path);
      arrivalAt.push(...d.at);
    }
    arrivals.push(ARRIVAL_CODE[a.kind] ?? ARRIVAL_UNKNOWN, ARRIVAL_PHASE[a.phase] ?? 0, a.from.x, a.from.y, a.to.x, a.to.y, a.span.t0, a.span.t1, np, p0);
  }

  const scene: RulesScene = { t: f.t, n, epoch: f.epoch ?? 0, items: allItems, solids: allSolids, crew, truck, truckPath, truckAt, flatbed, flatbedPath, flatbedAt, car, arrivals, arrivalPath, arrivalAt, boss, cut: [], carried: f.load.pieces.length };
  // C-WORLD-1: the truck's body (FrameTruck.model, written only from the works' opening) as TRUCK_MODELS' row; the field is
  // there only when it is not today's truck, so a first-yard scene is the object it always was.
  const model = TRUCK_MODEL_CODE[tk.model ?? 'truck'] ?? 0;
  if (model !== 0) scene.truckModel = model;
  return scene;
}

/**
 * THE DRIVER'S TRUCK, ONE PHASE AT A TIME (the owner's review, 26 November, point 7: "trucks are
 * sometimes speeding through the yard ... running people and the building over"). The frame gives each
 * phase its OWN path and the yard second the truck passes each point (frame.ts, RULING-owner1 V1 and V3:
 * `leg.path`, `leg.at`; out park -> line -> gate -> lane -> skip, hook one point at the skip, back skip ->
 * lane -> gate -> weighbridge stop, weigh one point, tip weighbridge stop -> floor stop, park floor stop ->
 * park; inside the fence at most truck.yardV). The world draws exactly that (./motion.ts truckAt): nothing
 * here decides a place or a date. The facing while it stands on a one-point phase: east while hooking (the
 * hook frames face east), else the one it arrived with (-2: keep).
 *
 * A frame without `leg.at` (a frozen test content without the review's rules) is drawn along its
 * `leg.path` evenly over the leg, as the frame gives it.
 *
 * Returns the path (x, y per point), the dates of its points (empty: even), the instant its driving ends
 * (the last date; NaN: at the leg's end) and the facing while standing (heading8; -1: the path's).
 */
export function tripLeg(_c: SalvageContent, tk: R.FrameTruck, _line: readonly number[]): { path: number[]; at: number[]; driveEnd: number; face: number } {
  const leg = tk.leg;
  if (!leg) return { path: [], at: [], driveEnd: NaN, face: -1 };
  const d = datedPath(leg.path, leg.at);
  const face = leg.phase === 'hook' ? 2 : -1;
  if (d) return { path: d.path, at: d.at, driveEnd: d.at[d.at.length - 1], face };
  const p = flat(leg.path && leg.path.length ? leg.path : [{ x: tk.x, y: tk.y }]);
  return { path: p, at: [], driveEnd: NaN, face };
}

/**
 * The tool a thing is worked with, when the frame has no `boss` (the hour-0 frame): its object's tier
 * picks the tool; at tier 2 cast iron takes the sledge, the rest the grinder.
 */
function guessPose(c: SalvageContent, obj: string): number {
  const o = c.objects[obj];
  if (!o) return P_SPANNER;
  const fam = famOfGrade(o.pieces[0]?.[0]);
  if (o.tier >= 3) return P_TORCH;
  if (o.tier === 2) return fam === 'ci' ? P_SLEDGE : P_GRINDER;
  return P_SPANNER;
}

/** A machine's sprites by its look (the art director's plant entries). */
function machineItems(out: number[], res: Resolver, m: R.FrameMachine, t: number, onPour: (p: { x: number; y: number }) => void): void {
  const { x, y, look } = m;
  if (look === 'padlock' || look === 'arriving') return;
  const work = look === 'working';
  if (m.machine === 'hand_stripper') {
    const f = look === 'trayFull' ? 3 : work ? 1 : 0;
    sprite(out, res, 'plant.stripper.hand', x, y, { frame: f, alt: work ? res('plant.stripper.hand', 2) : -1, period: 0.22 });
  } else if (m.machine === 'stripper') {
    sprite(out, res, 'plant.stripper.power', x, y, { frame: work ? 1 : 0, alt: work ? res('plant.stripper.power', 0) : -1, period: 0.3 });
  } else if (m.machine === 'bench') {
    sprite(out, res, 'plant.bench.motor', x, y, { frame: work ? 1 : 0, alt: work ? res('plant.bench.motor', 0) : -1, period: 0.4 });
  } else if (m.machine === 'crucible') {
    const id = look === 'heating' ? 'plant.crucible.heat' : look === 'ready' || look === 'cooling' ? 'plant.crucible.ready' : look === 'pour' ? 'plant.crucible.pour' : 'plant.crucible.idle';
    sprite(out, res, id, x, y, { frame: 0, alt: look === 'pour' ? res(id, 1) : -1, period: 0.25 });
    sprite(out, res, 'plant.hood', x + 0.6, y, { key: y + 0.62 });
    const mould = look === 'pour' ? 1 : m.ingots && m.ingots.cool < 0.5 ? 3 : m.ingots ? (m.ingots.grade === 'ali' ? 5 : 4) : 0;
    sprite(out, res, 'plant.mould', x + 1.5, y + 0.4, { frame: mould, alt: look === 'pour' ? res('plant.mould', 2) : -1, period: 0.25 });
    if (look === 'pour') onPour({ x, y });
    if (m.ingots && m.ingots.n > 0) {
      const id2 = m.ingots.grade === 'ali' ? 'piece.ingot.alu' : 'piece.ingot.brass';
      const secs = m.ingots.span ? Math.max(0, t - m.ingots.span.t0) : m.ingots.cool * 3;
      let fi = INGOT_FRAMES.length - 1;
      for (let k = 0; k < INGOT_FRAMES.length; k++)
        if (secs <= INGOT_FRAMES[k][1]) {
          fi = k;
          break;
        }
      for (let k = 0; k < Math.min(4, m.ingots.n); k++) sprite(out, res, id2, x + 1.1 + 0.3 * k, y + 1.0, { frame: fi });
    }
  }
}

/** owner1 play 13: the ink of an empty chalk circle (a quarter). */
export const CHALK_EMPTY_ALPHA = 0.25;

/** Does anything (a whole thing or a piece) lie inside a chalk circle of the frame? */
export function circleFilled(f: Pick<R.FrameTable, 'things' | 'pieces'>, ci: { x: number; y: number; r: number }): boolean {
  const r = (ci.r ?? 0.8) + 0.2;
  const inside = (p: { x: number; y: number }) => (p.x - ci.x) * (p.x - ci.x) + (p.y - ci.y) * (p.y - ci.y) <= r * r;
  return f.things.some(inside) || f.pieces.some(inside);
}

// =====================================================================================================
// owner1 play 1: A PLAYER ALWAYS SEES HIMSELF. The places drawn with a roof or canopy (the office, the tool
// rack, the scale house, the notice boards) are drawn see-through while the boss (or a crew member) stands
// where the roof as drawn covers him. Built once per bake from the content's places and the manifest's own
// bounds; the frame loop asks `underRoof` each frame and eases the roof's ink.
// =====================================================================================================

/** Manifest ids of the places that carry a roof or canopy a person can stand under or behind. */
export const ROOFED_IDS: readonly string[] = ['plant.portacabin', 'plant.toolrack', 'plant.scalehouse', 'plant.sign.posts', 'plant.board.notice'];
/** Numbers per roof: x0, x1, y0, y1 of its drawn box (metres across, metres x tilt down the screen), its sort key, its static item's index. */
export const ROOF = 6;
/**
 * At most this many roofs (the frame loop's per-roof scratch). C-WORLD-1: the works add up to seven (the three halls' sheds,
 * the bays' lean-to, the two stillage roofs, the Yard sale's canopy: ./worksTable.ts worksRoofSpots); worksHooks.test.ts
 * checks the first yard's roofs plus every works roof the content can hold stay within it: 24 (was 16; the shipped first
 * yard has 10 roofs, the works 7 more; the cap never bound the first yard, so its table is unchanged).
 */
export const ROOF_MAX = 24;
/** A roof's ink while somebody stands under it (about a third) and the seconds its ink takes to change. */
export const ROOF_SEE = 1 / 3;
export const ROOF_EASE_S = 0.2;
/** The share of a person's drawn box a roof must cover before it turns see-through. */
export const ROOF_COVER = 0.2;
/** The sort's depth band (= DEPTH_BAND below; declared here because a worklet captures what is defined before it; a test holds them equal). */
export const ROOF_BAND = 0.25;

/** A person's drawn box round his feet: x0, x1, y0, y1 in the same units as a roof's (the boss standing, the manifest's bounds). */
export function personBox(): number[] {
  const e = entryOf('person.boss.stand');
  const b = e ? cellBounds(e, 0) : { x: -16, y: -56, w: 32, h: 60 };
  const s = (e?.drawScale ?? 1) / 40;
  return [b.x * s, (b.x + b.w) * s, b.y * s, (b.y + b.h) * s];
}

/** The roofs of the map, matched to their items in `statics` (the presorted staticItems). */
export function roofTable(c: SalvageContent, statics: readonly number[], res: Resolver, tilt: number, works: readonly RoofSpot[] = worksRoofSpots(c)): number[] {
  const out: number[] = [];
  for (const [id, pl] of Object.entries(c.map.places)) {
    if (!ROOFED_IDS.includes(pl.sprite)) continue;
    const pt = c.map.points[id];
    const e = entryOf(pl.sprite);
    if (!pt || !e) continue;
    const cell = res(pl.sprite, 0, 0);
    let idx = -1;
    for (let i = 0; i * ITEM < statics.length; i++) {
      const o = i * ITEM;
      if (statics[o + 2] === cell && statics[o + 3] === pt[0] && statics[o + 4] === pt[1]) {
        idx = i;
        break;
      }
    }
    if (idx < 0) continue;
    const b = cellBounds(e, 0);
    const s = (e.drawScale ?? 1) / 40;
    out.push(pt[0] + b.x * s, pt[0] + (b.x + b.w) * s, pt[1] * tilt + b.y * s, pt[1] * tilt + (b.y + b.h) * s, statics[idx * ITEM + 1], idx);
  }
  // C-WORLD-1: the works' roofed sprites (./worksTable.ts worksRoofSpots), each matched to the static item drawn at its
  // anchor; one that is not drawn (a first-yard map, a dark hall, works not baked: its cell is -1) adds nothing.
  for (const w of works) {
    if (out.length / ROOF >= ROOF_MAX) break;
    const e = entryOf(w.id);
    const cell = res(w.id, 0, 0);
    if (!e || cell < 0) continue;
    let idx = -1;
    for (let i = 0; i * ITEM < statics.length; i++) {
      const o = i * ITEM;
      if (statics[o + 2] === cell && statics[o + 3] === w.x && statics[o + 4] === w.y) {
        idx = i;
        break;
      }
    }
    if (idx < 0) continue;
    const b = cellBounds(e, 0);
    const s = (e.drawScale ?? 1) / 40;
    out.push(w.x + b.x * s, w.x + (b.x + b.w) * s, w.y * tilt + b.y * s, w.y * tilt + (b.y + b.h) * s, statics[idx * ITEM + 1], idx);
  }
  // owner2-fix P7 (A PLAYER ALWAYS SEES HIMSELF, as for roofs): the container wall's containers (props of kind
  // 'wall', 2.6 m high) cover whoever walks behind one (the passage between two of them, a container's north
  // end): each is see-through while it covers the boss or a worker.
  for (const p of c.props) {
    if (p.kind !== 'wall' || out.length / ROOF >= ROOF_MAX) continue;
    const id = p.d >= p.w ? 'plant.container.ns' : 'plant.container.ew';
    const e = entryOf(id);
    if (!e) continue;
    const cell = res(id, 0, 0);
    let idx = -1;
    for (let i = 0; i * ITEM < statics.length; i++) {
      const o = i * ITEM;
      if (statics[o + 2] === cell && statics[o + 3] === p.x && statics[o + 4] === p.y) {
        idx = i;
        break;
      }
    }
    if (idx < 0) continue;
    const b = cellBounds(e, 0);
    const s = (e.drawScale ?? 1) / 40;
    out.push(p.x + b.x * s, p.x + (b.x + b.w) * s, p.y * tilt + b.y * s, p.y * tilt + (b.y + b.h) * s, statics[idx * ITEM + 1], idx);
  }
  return out;
}

/**
 * Is a person standing at (px, py) (sorted at `pkey`) covered by roof r: the roof is drawn after him (a later
 * depth band) and its drawn box covers at least ROOF_COVER of his? PB = personBox().
 */
export function underRoof(RF: readonly number[], r: number, px: number, py: number, pkey: number, tilt: number, PB: readonly number[]): boolean {
  'worklet';
  const o = r * ROOF;
  if (Math.floor(RF[o + 4] / ROOF_BAND) <= Math.floor(pkey / ROOF_BAND)) return false;
  const x0 = px + PB[0];
  const x1 = px + PB[1];
  const y0 = py * tilt + PB[2];
  const y1 = py * tilt + PB[3];
  const w = Math.min(x1, RF[o + 1]) - Math.max(x0, RF[o]);
  const h = Math.min(y1, RF[o + 3]) - Math.max(y0, RF[o + 2]);
  if (w <= 0 || h <= 0) return false;
  return w * h >= ROOF_COVER * (x1 - x0) * (y1 - y0);
}

/** One frame of a roof's ink: towards ROOF_SEE while covered, back to 1, at a constant rate over ROOF_EASE_S. */
export function roofInk(a: number, covered: boolean, dt: number): number {
  'worklet';
  const want = covered ? ROOF_SEE : 1;
  const step = ((1 - ROOF_SEE) * dt) / ROOF_EASE_S;
  return a < want ? Math.min(want, a + step) : Math.max(want, a - step);
}

/** owner2-fix P2: the vehicle pictures whose drawn box ./frameLoop.ts hands the step aside (VBOX_* x 8 headings x 4 numbers). */
export const VBOX_TRUCK = 0;
export const VBOX_TRUCK_BARE = 1;
export const VBOX_TRUCK_HOOK = 2;
export const VBOX_FLATBED = 3;
export const VBOX_FLATBED_WORKING = 4;
export const VBOX_VAN = 5;
export const VBOX_TRAILER = 6;
/** C-WORLD-1: the hook-lift's (three-axle, the works) pictures, appended after the first yard's so their indices keep. */
export const VBOX_BRIDGE = 7;
export const VBOX_BRIDGE_BARE = 8;
export const VBOX_BRIDGE_HOOK = 9;
const VBOX_IDS = ['vehicle.truck', 'vehicle.truck.bare', 'vehicle.truck.hook', 'vehicle.flatbed', 'vehicle.flatbed.working', 'vehicle.van', 'vehicle.trailer', 'vehicle.truckBridge', 'vehicle.truckBridge.bare', 'vehicle.truckBridge.hook'];

/**
 * C-WORLD-1 (critic-build F2): THE TRUCK'S BODY AS DATA, chosen by FrameTruck.model (the rules' answer, frame.ts: the owned
 * shop key). Row 0 is today's truck, exactly the first yard's ids, boxes and fall-back sizes; row 1 the works' hook-lift
 * (art ART-TRUCK3, sheet D). The frame loop (C-WORLD-2) reads its half-sizes, boxes and cells from here (actorTable
 * `models`) instead of the truck's constants; no row adds a branch to the first yard's drawing.
 */
export interface TruckModel {
  model: 'truck' | 'truckBridge';
  body: string;
  bare: string;
  hook: string;
  /** The tip frames' entry (east only), or null: today's truck tips in its hook entry's frames. */
  tip: string | null;
  /** Its skip's load overlay entry. */
  load: string;
  /** VBOX_* indices of the body, the bare body and the hook picture. */
  vbox: number;
  vboxBare: number;
  vboxHook: number;
  /** Fall-back length and width (metres) while the body's entry is unknown (frameLoop.ts's 4.6 x 2 for today's). */
  len: number;
  wid: number;
  /**
   * o4-world F2: the heading8 the hook and tip frames are drawn facing (both rows' art is east-only: eastOnly in the
   * manifests). The frame loop turns the truck's picture to it, a heading at a time, before those frames show.
   */
  hookFace: number;
}
export const TRUCK_MODELS: readonly TruckModel[] = [
  { model: 'truck', body: 'vehicle.truck', bare: 'vehicle.truck.bare', hook: 'vehicle.truck.hook', tip: null, load: 'vehicle.skip.load', vbox: VBOX_TRUCK, vboxBare: VBOX_TRUCK_BARE, vboxHook: VBOX_TRUCK_HOOK, len: 4.6, wid: 2, hookFace: 2 },
  { model: 'truckBridge', body: 'vehicle.truckBridge', bare: 'vehicle.truckBridge.bare', hook: 'vehicle.truckBridge.hook', tip: 'vehicle.truckBridge.tip', load: 'vehicle.skip.load.bridge', vbox: VBOX_BRIDGE, vboxBare: VBOX_BRIDGE_BARE, vboxHook: VBOX_BRIDGE_HOOK, len: 6.2, wid: 2.4, hookFace: 2 },
];
/** FrameTruck.model -> its row in TRUCK_MODELS (RulesScene.truckModel). */
export const TRUCK_MODEL_CODE: Readonly<Record<string, number>> = { truck: 0, truckBridge: 1 };

/** A model's half length and half width in metres (its body's footprint; the row's fall-back while the entry is unknown). */
export function truckHalf(m: TruckModel): [number, number] {
  const f = entryOf(m.body)?.footprint;
  return [(f?.w ?? m.len) / 2, (f?.d ?? m.wid) / 2];
}

/**
 * owner2-fix P2: the ground a vehicle's picture covers, per picture and heading (the 8-scheme for the truck's,
 * the 4-scheme for the others; one heading for the hook and working pictures): west, east, north, south in metres
 * from its anchor (the manifest's cell bounds at its draw scale, the screen's rise turned back into ground by
 * `tilt`; a mirrored heading's box mirrored). Index ((kind * 8 + heading) * 4). Pure.
 */
export function vehicleBoxes(tilt: number): number[] {
  const out = new Array(VBOX_IDS.length * 8 * 4).fill(0);
  VBOX_IDS.forEach((id, kind) => {
    const e = entryOf(id);
    if (!e) return;
    const s = (e.drawScale ?? 1) / 40;
    for (let h = 0; h < Math.min(8, e.headings); h++) {
      const m = mirrorOf(e, h);
      const b = cellBounds(e, m ?? h);
      const x0 = m !== null ? -(b.x + b.w) : b.x;
      const o = (kind * 8 + h) * 4;
      out[o] = x0 * s;
      out[o + 1] = (x0 + b.w) * s;
      out[o + 2] = (b.y * s) / tilt;
      out[o + 3] = ((b.y + b.h) * s) / tilt;
    }
  });
  return out;
}

/** The x of the container wall (the props of kind 'wall'), or null. */
export function wallLine(c: SalvageContent): number | null {
  const w = c.props.filter((p) => p.kind === 'wall');
  return w.length ? w.reduce((a, p) => a + p.x, 0) / w.length : null;
}

// =====================================================================================================
// 3. The actors' cells
// =====================================================================================================

/** Lookup tables the frame loop reads on the UI thread (plain arrays of numbers). */
export interface ActorTable {
  /** ((who * POSES + pose) * 4 + frame) * 4 + heading -> packed cell (who 0 boss, 1 crew). */
  person: number[];
  /** Same for the crew's vest overlay (who 1 only; index (pose * 4 + frame) * 4 + heading). */
  vest: number[];
  /** fam * 4 + heading. */
  hand: number[];
  /** (kind * 4 + frame) * 4 + heading, kind 0 sack, 1 trolley. */
  carrier: number[];
  /** Metres ahead of the person: sack, trolley. */
  ahead: number[];
  truck: number[];
  /** The truck with no skip on its hook, per heading8 (look-lane's `vehicle.truck.bare`; -1 until baked: L16). */
  truckBare: number[];
  /** Points (at 40 a metre) from the truck's anchor to its skip's top, per heading8: dx, dy. */
  skipTop: number[];
  skipLoad: number[];
  flatbed: number[];
  flatbedWorking: number;
  crane: number[];
  cargo: number[];
  /** dx, dy per heading4 (stowed) and then for the working (east) picture. */
  cargoOff: number[];
  van: number[];
  trailer: number[];
  skip: number;
  /** Shadows: person, truck x8, flatbed x4, van x4, trailer x4, sack x4, trolley x4, skip. */
  shPerson: number;
  shTruck: number[];
  shFlatbed: number[];
  shVan: number[];
  shTrailer: number[];
  shSack: number[];
  shTrolley: number[];
  shSkip: number;
  /** The truck without a skip and its hook and tip frames (east-facing only): bare, reach, incline, tipped. */
  truckHook: number[];
  /** drawScale of carriers, vehicles. Each family is baked at its own scale (art/manifest/people.ts VEHICLE_K,
   * TRUCK_K, FLATBED_K): one shared scale drew the flatbed's loading frames twice their size (join). */
  carrierScale: number;
  vehicleScale: number;
  truckScale: number;
  flatbedWorkScale: number;
  /** The vest colours of the roles (hand, cutter, driver) as 0xRRGGBB. */
  vests: number[];
  /**
   * C-WORLD-1: the truck's cells per TRUCK_MODELS row (row 0 holds the very arrays above: truck, truckBare, truckHook,
   * skipLoad, shTruck, truckScale). body/bare/shadow per heading8; hook (and tip) frames east; half: half length, half width.
   */
  models: { body: number[]; bare: number[]; hook: number[]; tip: number[]; skipLoad: number[]; shadow: number[]; scale: number; vbox: number; vboxBare: number; vboxHook: number; half: number[]; hookFace: number }[];
}

/**
 * C-WORLD-1: `works` (default stageOn()): ask the resolver for the works' cells (the new poses, the hook-lift's row). Off,
 * the table asks exactly the first yard's ids in the first yard's order (the works' cells are -1 without being asked), so
 * a first-yard player's table, and the cost harness's record of what it asked, are as before.
 */
export function actorTable(res: Resolver, vests: { hand: string; cutter: string; driver: string }, works: boolean = stageOn()): ActorTable {
  const person: number[] = [];
  const vest: number[] = [];
  for (let who = 0; who < 2; who++)
    for (let p = 0; p < POSES.length; p++)
      for (let f = 0; f < 4; f++)
        for (let h = 0; h < 4; h++) {
          const id = `person.${who === 0 ? 'boss' : 'crew'}.${POSES[p]}`;
          // C-WORLD-1: the works' poses (P_WORKS_FIRST on) are baked in 8 headings: the 4-scheme heading h is 8-scheme h x 2.
          const ask = f < POSE_FRAMES[p] && (p < P_WORKS_FIRST || works);
          person.push(ask ? res(id, f, p >= P_WORKS_FIRST ? h * 2 : h) : -1);
          if (who === 1) vest.push(ask ? res(`person.crew.vest.${POSES[p]}`, f, h) : -1);
        }
  const hand: number[] = [];
  for (const fam of HAND_FAMILIES) for (let h = 0; h < 4; h++) hand.push(res(`load.hand.${fam}`, 0, h));
  const carrier: number[] = [];
  for (const kind of ['sack', 'trolley']) for (let f = 0; f < CARRIER_FRAMES.length; f++) for (let h = 0; h < 4; h++) carrier.push(res(`carrier.${kind}`, f, h));
  const V = { ppm: 40, tilt: 0.7, lift: Math.sqrt(1 - 0.49) };
  const truck: number[] = [];
  const truckBare: number[] = [];
  const skipTop: number[] = [];
  const shTruck: number[] = [];
  for (let h = 0; h < 8; h++) {
    truck.push(res('vehicle.truck', 0, h));
    truckBare.push(entryOf('vehicle.truck.bare') ? res('vehicle.truck.bare', 0, h) : -1);
    skipTop.push(...skipTopOnTruck(V, headingRad(h)));
    shTruck.push(res('shadow.truck', 0, h));
  }
  const four = (id: string) => [0, 1, 2, 3].map((h) => res(id, 0, h));
  const cargoOff: number[] = [];
  for (let h = 0; h < 4; h++) cargoOff.push(...flatbedBedCentre(V, headingRad(h * 2)));
  cargoOff.push(...flatbedBedCentre(V, headingRad(2)));
  const truckHook = [0, 1, 2, 3].map((f) => res('vehicle.truck.hook', f, 0));
  const skipLoad = [0, 1, 2, 3].map((f) => res('vehicle.skip.load', f, 0));
  const truckScale = scaleOf('vehicle.truck');
  const models: ActorTable['models'] = TRUCK_MODELS.map((m, i) => {
    if (i === 0) return { body: truck, bare: truckBare, hook: truckHook, tip: [], skipLoad, shadow: shTruck, scale: truckScale, vbox: m.vbox, vboxBare: m.vboxBare, vboxHook: m.vboxHook, half: truckHalf(m), hookFace: m.hookFace };
    const ask = (id: string, f: number, h: number) => (works ? res(id, f, h) : -1);
    const frames = (id: string | null) => (id ? (entryOf(id)?.frames ?? []).map((_, f) => ask(id, f, 1)) : []);
    const eight = (id: string) => Array.from({ length: 8 }, (_, h) => ask(id, 0, h));
    const sh = eight('shadow.truck3').map((c, h) => (c >= 0 ? c : shTruck[h]));
    return { body: eight(m.body), bare: eight(m.bare), hook: frames(m.hook), tip: frames(m.tip), skipLoad: (entryOf(m.load)?.frames ?? []).map((_, f) => ask(m.load, f, 0)), shadow: sh, scale: scaleOf(m.body), vbox: m.vbox, vboxBare: m.vboxBare, vboxHook: m.vboxHook, half: truckHalf(m), hookFace: m.hookFace };
  });
  return {
    person,
    vest,
    hand,
    carrier,
    ahead: [CARRIER_AHEAD.sack, CARRIER_AHEAD.trolley],
    truck,
    truckBare,
    skipTop,
    skipLoad,
    flatbed: four('vehicle.flatbed'),
    flatbedWorking: res('vehicle.flatbed.working', 0, 0),
    crane: [0, 1, 2].map((f) => res('vehicle.flatbed.crane', f, 0)),
    cargo: [0, 1].map((f) => res('vehicle.flatbed.cargo', f, 0)),
    cargoOff,
    van: four('vehicle.van'),
    trailer: four('vehicle.trailer'),
    skip: res('vehicle.skip', 0, 0),
    shPerson: res('shadow.person', 0, 0),
    shTruck,
    shFlatbed: [0, 1, 2, 3].map((h) => res('shadow.flatbed', 0, h * 2)),
    shVan: [0, 1, 2, 3].map((h) => res('shadow.van', 0, h * 2)),
    shTrailer: [0, 1, 2, 3].map((h) => res('shadow.trailer', 0, h * 2)),
    shSack: [0, 1, 2, 3].map((h) => res('shadow.sack', 0, h * 2)),
    shTrolley: [0, 1, 2, 3].map((h) => res('shadow.trolley', 0, h * 2)),
    shSkip: res('shadow.skip', 0, 0),
    truckHook,
    carrierScale: scaleOf('carrier.sack'),
    vehicleScale: scaleOf('vehicle.flatbed'),
    truckScale,
    flatbedWorkScale: scaleOf('vehicle.flatbed.working'),
    vests: [hexInt(vests.hand), hexInt(vests.cutter), hexInt(vests.driver)],
    models,
  };
}

/** The shadows the world bakes into its sheet S: kind and the 8-scheme headings it needs. */
export const SHADOW_CELLS: readonly { kind: 'person' | 'truck' | 'flatbed' | 'van' | 'trailer' | 'skip' | 'sack' | 'trolley'; headings: number[] }[] = [
  { kind: 'person', headings: [0] },
  { kind: 'truck', headings: [0, 1, 2, 3, 4, 5, 6, 7] },
  { kind: 'flatbed', headings: [0, 2, 4, 6] },
  { kind: 'van', headings: [0, 2, 4, 6] },
  { kind: 'trailer', headings: [0, 2, 4, 6] },
  { kind: 'skip', headings: [0] },
  { kind: 'sack', headings: [0, 2, 4, 6] },
  { kind: 'trolley', headings: [0, 2, 4, 6] },
];

/**
 * C-WORLD-1: the works' shadow kinds (the three-axle hook-lift, the crane lorry, the Yard sale's visitor), baked into sheet S
 * AFTER the first yard's cells and only under stageOn() (./useYard.ts bakeShadows), so a first-yard player's sheet S is the
 * one it always was. `as`: the first yard's kind whose shape stands in until the art draws the works' own (vehicles.draw.ts
 * drawActorShadow knows only its kinds); `k`: its size against that kind's.
 */
export const WORKS_SHADOW_CELLS: readonly { kind: 'truck3' | 'cranelorry' | 'visitor'; as: (typeof SHADOW_CELLS)[number]['kind']; k: number; headings: number[] }[] = [
  { kind: 'truck3', as: 'truck', k: 1.3, headings: [0, 1, 2, 3, 4, 5, 6, 7] },
  { kind: 'cranelorry', as: 'truck', k: 1.5, headings: [0, 1, 2, 3, 4, 5, 6, 7] },
  { kind: 'visitor', as: 'person', k: 1, headings: [0] },
];

/** The 8-scheme heading (0 s, 1 se, 2 e, ... 7 sw) of an angle (radians, x east, y south). */
export function heading8(a: number): number {
  'worklet';
  const k = Math.round((Math.PI / 2 - a) / (Math.PI / 4));
  return ((k % 8) + 8) % 8;
}

/** The 4-scheme heading (0 s, 1 e, 2 n, 3 w) of a direction. */
export function heading4(dx: number, dy: number): number {
  'worklet';
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 1 : 3;
  return dy > 0 ? 0 : 2;
}

// =====================================================================================================
// 4. The frame's sprite lists (worklets: the frame loop calls them on the UI thread, the tests under node)
// =====================================================================================================

/** One list of sprites of a frame: decals, shadows or the depth-sorted list. */
export interface DrawList {
  key: Float64Array;
  cell: Float64Array;
  sx: Float64Array;
  sy: Float64Array;
  k: Float64Array;
  tint: Float64Array;
  al: Float64Array;
  order: Int32Array;
  /** The sort's scratch: band and sheet of each item (sortList). */
  sk: Float64Array;
  /** The merge's scratch (sortRuns). */
  tmp: Int32Array;
  n: number;
  cap: number;
  /** Offset of this list in the shared host-object pools. */
  base: number;
}

/** View numbers for addTo: camX, camY, ppm, tilt, lift, SW, SH, zoom. */
export function addTo(L: DrawList, V: Float64Array, key: number, cell: number, wx: number, wy: number, dx: number, dy: number, scale: number, tint: number, alpha: number): void {
  'worklet';
  if (cell < 0 || L.n >= L.cap) return;
  const z = V[7];
  const k40 = V[2] / 40;
  const cx = V[5] / 2;
  const cy = V[6] / 2;
  const sx = (wx * V[2] - V[0] - cx) * z + cx + dx * k40 * z;
  const sy = (wy * V[2] * V[3] - V[1] - cy) * z + cy + dy * k40 * z;
  const m = 420 * z;
  if (sx < -m || sx > V[5] + m || sy < -m || sy > V[6] + m) return;
  const i = L.n;
  L.key[i] = key;
  L.cell[i] = cell;
  L.sx[i] = sx;
  L.sy[i] = sy;
  L.k[i] = scale * k40 * z;
  L.tint[i] = tint;
  L.al[i] = alpha;
  L.n = i + 1;
}

/** A person and what they carry or push, in the people artist's layer order (art/manifest/people.ts personLayers). */
export function personInto(L: DrawList, V: Float64Array, T: ActorTable, who: number, pose: number, frame: number, h: number, hand: number, cKind: number, cFrame: number, tint: number, wx: number, wy: number, key: number): number {
  'worklet';
  const north = h === 2;
  const f = Math.min(frame, POSE_FRAMES[pose] - 1);
  let pc = T.person[((who * N_POSES + pose) * 4 + f) * 4 + h];
  if (pc < 0) pc = T.person[((who * N_POSES + P_STAND) * 4) * 4 + h];
  const hc = who === 0 && hand >= 0 ? T.hand[hand * 4 + h] : -1;
  let cc = -1;
  let cdx = 0;
  let cdy = 0;
  // The carrier is drawn in EVERY pose where it is pushed in front (the owner's review, point 3: drawn only
  // in the push pose, the trolley vanished at each feed, cut or pick and came back between them: it flashed).
  if (cKind >= 0) {
    cc = T.carrier[(cKind * 4 + cFrame) * 4 + h];
    const m = T.ahead[cKind];
    cdx = h === 1 ? m * 40 : h === 3 ? -m * 40 : 0;
    cdy = h === 0 ? m * 28 : h === 2 ? -m * 28 : 0;
  }
  let k = key;
  let n = 0;
  if (hc >= 0 && !north) addTo(L, V, (k += 1e-4), hc, wx, wy, 0, 0, 1, -1, 1);
  if (cc >= 0 && north) addTo(L, V, (k += 1e-4), cc, wx, wy, cdx, cdy, T.carrierScale, -1, 1);
  addTo(L, V, (k += 1e-4), pc, wx, wy, 0, 0, 1, -1, 1);
  n++;
  if (who === 1) {
    let vc = T.vest[(pose * 4 + f) * 4 + h];
    if (vc < 0) vc = T.vest[(P_STAND * 4) * 4 + h];
    addTo(L, V, (k += 1e-4), vc, wx, wy, 0, 0, 1, tint, 1);
  }
  if (hc >= 0 && north) addTo(L, V, (k += 1e-4), hc, wx, wy, 0, 0, 1, -1, 1);
  if (cc >= 0 && !north) addTo(L, V, (k += 1e-4), cc, wx, wy, cdx, cdy, T.carrierScale, -1, 1);
  return n;
}

/** The point at share u (0..1) along a polyline of `np` points in `pts`; writes x, y, dx, dy into out. */
export function along(out: number[], pts: number[], np: number, u: number): void {
  'worklet';
  let total = 0;
  for (let i = 1; i < np; i++) total += Math.hypot(pts[i * 2] - pts[i * 2 - 2], pts[i * 2 + 1] - pts[i * 2 - 1]);
  let rem = Math.max(0, Math.min(1, u)) * total;
  out[0] = pts[0];
  out[1] = pts[1];
  out[2] = np > 1 ? pts[2] - pts[0] : 0;
  out[3] = np > 1 ? pts[3] - pts[1] : 1;
  for (let i = 1; i < np; i++) {
    const sx = pts[i * 2] - pts[i * 2 - 2];
    const sy = pts[i * 2 + 1] - pts[i * 2 - 1];
    const sl = Math.hypot(sx, sy);
    out[2] = sx;
    out[3] = sy;
    if (rem <= sl || i === np - 1) {
      const f = sl > 0 ? Math.min(1, rem / sl) : 0;
      out[0] = pts[i * 2 - 2] + sx * f;
      out[1] = pts[i * 2 - 1] + sy * f;
      return;
    }
    rem -= sl;
  }
}

/** Length of a polyline of np points. */
export function pathLen(pts: number[], np: number): number {
  'worklet';
  let total = 0;
  for (let i = 1; i < np; i++) total += Math.hypot(pts[i * 2] - pts[i * 2 - 2], pts[i * 2 + 1] - pts[i * 2 - 1]);
  return total;
}

/** Depth band of the sort, metres (H11): inside one band sprites of one sheet are drawn together. */
export const DEPTH_BAND = 0.25;

/**
 * Insertion sort of a list's order (nearly sorted from frame to frame) by depth BAND first (DEPTH_BAND of
 * the key), then by sheet (B, the plant and vehicles, before A, the people and pieces: a person level with a
 * machine stands in front of it), then by key: neighbours of one sheet merge into one atlas draw (H11).
 */
export function sortList(L: DrawList): void {
  'worklet';
  const o = L.order;
  const n = L.n;
  const sk = L.sk;
  for (let i = 0; i < n; i++) {
    o[i] = i;
    const sheet = Math.floor(L.cell[i] / CELL_BASE);
    sk[i] = Math.floor(L.key[i] / DEPTH_BAND) * 4 + (sheet === 1 ? 0 : sheet === 0 ? 1 : 2);
  }
  for (let i = 1; i < n; i++) {
    const v = o[i];
    const sv = sk[v];
    const kv = L.key[v];
    let j = i - 1;
    while (j >= 0 && (sk[o[j]] > sv || (sk[o[j]] === sv && L.key[o[j]] > kv))) {
      o[j + 1] = o[j];
      j--;
    }
    o[j + 1] = v;
  }
}

/** The sort's order of two items: band, then sheet (B before A), then key (./sortList). */
function before(L: DrawList, a: number, b: number): boolean {
  'worklet';
  const sa = L.sk[a];
  const sb = L.sk[b];
  return sa < sb || (sa === sb && L.key[a] <= L.key[b]);
}

/**
 * sortList for a frame whose list was filled in three runs (the owner's review, point 1: no work a phone
 * cannot do sixty times a second): [0, a) and [a, b) are already in the sort's order (the map's statics and
 * the rules' items, sorted once when they are built: `presortItems`; culling keeps a sorted run sorted), and
 * only the actors [b, n) are sorted here, then the three runs are merged: O(n + actors²) instead of the
 * insertion sort's O(n²) over every sprite on screen. The result is exactly sortList's (a test holds them
 * equal).
 */
export function sortRuns(L: DrawList, a: number, b: number): void {
  'worklet';
  const o = L.order;
  const n = L.n;
  const sk = L.sk;
  const tmp = L.tmp;
  for (let i = 0; i < n; i++) {
    o[i] = i;
    const sheet = Math.floor(L.cell[i] / CELL_BASE);
    sk[i] = Math.floor(L.key[i] / DEPTH_BAND) * 4 + (sheet === 1 ? 0 : sheet === 0 ? 1 : 2);
  }
  // A run that is not in order after all (a table not presorted) falls back to the whole insertion sort.
  for (let i = 1; i < b; i++) {
    if (i !== a && !before(L, i - 1, i)) {
      sortList(L);
      return;
    }
  }
  for (let i = b + 1; i < n; i++) {
    const v = o[i];
    let j = i - 1;
    while (j >= b && !before(L, o[j], v)) {
      o[j + 1] = o[j];
      j--;
    }
    o[j + 1] = v;
  }
  // Merge [0, a) and [a, b) into tmp[0, b), then tmp[0, b) and o[b, n) into o.
  let i = 0;
  let j = a;
  let k = 0;
  while (i < a && j < b) tmp[k++] = before(L, i, j) ? i++ : j++;
  while (i < a) tmp[k++] = i++;
  while (j < b) tmp[k++] = j++;
  i = 0;
  j = b;
  k = 0;
  // o[b, n) is read while o[0, ..) is written: copy the actors' order aside first (into tmp's tail).
  for (let q = b; q < n; q++) tmp[q] = o[q];
  while (i < b && j < n) o[k++] = before(L, tmp[i], tmp[j]) ? tmp[i++] : tmp[j++];
  while (i < b) o[k++] = tmp[i++];
  while (j < n) o[k++] = tmp[j++];
}

/**
 * o4-world F5 (the owner's review, point 1 "laggy"; o3-diag-world: 31 atlas draws at the gate on "back", the plan's
 * budget is 20): THE HOP PASS. sortRuns' order breaks a run wherever one depth band holds sprites of both sheets, so a
 * band's few people or pieces between two runs of the plant opens two more draws. Two sprites whose DRAWN rectangles do
 * not meet (HOP_MARGIN_PT apart) may be drawn in either order without moving a pixel (each covers only its own
 * rectangle), so a run of at most HOP_RUN_MAX sprites lying between two runs of one other sheet (and mirroring) moves
 * after the run that follows it when none of its rectangles meets any of that run's; repeated, at most HOP_PASSES times,
 * until nothing moves. Only the order of non-meeting sprites changes: the picture is the same, pixel for pixel
 * (o4-world/prove-hop.ts draws whole frames both ways with the baked sheets).
 */
export const HOP_RUN_MAX = 6;
export const HOP_PASSES = 20;
/** Points between two drawn rectangles that may change order (a sprite's edge pixels, antialiased, stay inside its rectangle rounded out). */
export const HOP_MARGIN_PT = 1;

/** Do the drawn rectangles of items a and b of L meet (HOP_MARGIN_PT apart or less)? A cell the sheets do not hold meets everything. */
function rectsMeet(L: DrawList, a: number, b: number, rects: readonly (readonly number[])[], dens: readonly number[]): boolean {
  'worklet';
  const pa = L.cell[a];
  const sa = Math.floor(pa / CELL_BASE);
  const ra = pa - sa * CELL_BASE;
  const Ra = rects[sa];
  const oa = (ra >> 1) * 6;
  const pb = L.cell[b];
  const sb = Math.floor(pb / CELL_BASE);
  const rb = pb - sb * CELL_BASE;
  const Rb = rects[sb];
  const ob = (rb >> 1) * 6;
  if (Ra === undefined || Rb === undefined || Ra.length < oa + 6 || Rb.length < ob + 6) return true;
  const ka = L.k[a] / dens[sa];
  const kb = L.k[b] / dens[sb];
  const wa = Ra[oa + 2] * ka;
  const wb = Rb[ob + 2] * kb;
  // As drawRuns places them: a mirrored cell is drawn flipped about its anchor.
  const ax0 = (ra & 1) === 1 ? L.sx[a] + Ra[oa + 4] * ka - wa : L.sx[a] - Ra[oa + 4] * ka;
  const bx0 = (rb & 1) === 1 ? L.sx[b] + Rb[ob + 4] * kb - wb : L.sx[b] - Rb[ob + 4] * kb;
  const ay0 = L.sy[a] - Ra[oa + 5] * ka;
  const by0 = L.sy[b] - Rb[ob + 5] * kb;
  const m = HOP_MARGIN_PT;
  return !(ax0 + wa + m <= bx0 || bx0 + wb + m <= ax0 || ay0 + Ra[oa + 3] * ka + m <= by0 || by0 + Rb[ob + 3] * kb + m <= ay0);
}

/** The run key of a packed cell as drawRuns breaks runs: sheet and mirroring. */
function runKeyOf(p: number): number {
  'worklet';
  const sheet = Math.floor(p / CELL_BASE);
  return sheet * 2 + ((p - sheet * CELL_BASE) & 1);
}

/**
 * The hop pass over a sorted list (after sortRuns, before drawRuns): reorders L.order (see HOP_RUN_MAX). `rects` and
 * `dens` per sheet as drawRuns reads them (six numbers per cell: x, y, w, h, ax, ay; the sheet's density). Uses L.sk
 * (run starts) and L.tmp (a block's copy) as scratch: both are sortRuns' and free once it has run. Returns the
 * rectangle tests made (the cost: o4-world measured it in node). A worklet; no allocation.
 */
export function hopRuns(L: DrawList, rects: readonly (readonly number[])[], dens: readonly number[]): number {
  'worklet';
  const o = L.order;
  const n = L.n;
  const RS = L.sk;
  const T = L.tmp;
  let tests = 0;
  for (let pass = 0; pass < HOP_PASSES; pass++) {
    let nr = 0;
    let prev = -1;
    for (let i = 0; i < n; i++) {
      const rk = runKeyOf(L.cell[o[i]]);
      if (rk !== prev) {
        RS[nr++] = i;
        prev = rk;
      }
    }
    if (nr < 3) break;
    let moved = false;
    for (let k = 1; k + 1 < nr; k++) {
      const s1 = RS[k];
      const s2 = RS[k + 1];
      const s3 = k + 2 < nr ? RS[k + 2] : n;
      const len1 = s2 - s1;
      if (len1 > HOP_RUN_MAX || runKeyOf(L.cell[o[RS[k - 1]]]) !== runKeyOf(L.cell[o[s2]])) continue;
      let clash = false;
      for (let a = s1; a < s2 && !clash; a++) {
        for (let b = s2; b < s3; b++) {
          tests++;
          if (rectsMeet(L, o[a], o[b], rects, dens)) {
            clash = true;
            break;
          }
        }
      }
      if (clash) continue;
      // Swap the blocks [s1, s2) and [s2, s3): the short run goes after the one that followed it.
      const len2 = s3 - s2;
      for (let q = 0; q < len1; q++) T[q] = o[s1 + q];
      for (let q = 0; q < len2; q++) o[s1 + q] = o[s2 + q];
      for (let q = 0; q < len1; q++) o[s1 + len2 + q] = T[q];
      RS[k + 1] = s1 + len2;
      moved = true;
      k++;
    }
    if (!moved) break;
  }
  return tests;
}

/**
 * Items (ITEM numbers each) reordered once, where they are built, into the frame's sort order: decals
 * first in their own order (they are drawn in list order), then the sorted ones by band, sheet and key
 * (stable). The frame loop's `sortRuns` then merges them instead of sorting them. Pure.
 */
export function presortItems(items: number[]): number[] {
  const n = Math.floor(items.length / ITEM);
  const idx = Array.from({ length: n }, (_, i) => i);
  const rank = (i: number) => {
    const cell = items[i * ITEM + 2];
    const sheet = Math.floor(cell / CELL_BASE);
    return Math.floor(items[i * ITEM + 1] / DEPTH_BAND) * 4 + (sheet === 1 ? 0 : sheet === 0 ? 1 : 2);
  };
  const decal = (i: number) => items[i * ITEM] === L_DECAL;
  idx.sort((p, q) => {
    const dp = decal(p);
    const dq = decal(q);
    if (dp || dq) return dp && dq ? p - q : dp ? -1 : 1;
    return rank(p) - rank(q) || items[p * ITEM + 1] - items[q * ITEM + 1] || p - q;
  });
  const out: number[] = new Array(items.length);
  idx.forEach((i, k) => {
    for (let m = 0; m < ITEM; m++) out[k * ITEM + m] = items[i * ITEM + m];
  });
  return out;
}

/** makeList for the UI thread. */
export function makeListW(cap: number, base: number): DrawList {
  'worklet';
  return { key: new Float64Array(cap), cell: new Float64Array(cap), sx: new Float64Array(cap), sy: new Float64Array(cap), k: new Float64Array(cap), tint: new Float64Array(cap), al: new Float64Array(cap), order: new Int32Array(cap), sk: new Float64Array(cap), tmp: new Int32Array(cap), n: 0, cap, base };
}
