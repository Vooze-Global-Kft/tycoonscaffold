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
import { MANIFEST, mirrorOf, type ManifestEntry } from '../art/manifest';
import { CARRIER_FRAMES, HAND_FAMILIES, carrierFrameOf, handFamilyOf } from '../art/manifest/people';
import { CONTAINER_TINTS, STILLAGE_LAYER_DY } from '../art/manifest/plant';
import { GRADE_SPRITE, INGOT_FRAMES, OBJECT_SPRITE, stageOf } from '../art/manifest/things';
import { loadFamily, type LoadFamily } from '../art/people.draw';
import { CARRIER_AHEAD, flatbedBedCentre, headingRad, skipTopOnTruck } from '../art/vehicles.draw';

export const ITEM = 12;
export const L_DECAL = 0;
export const L_SORT = 2;

/** Sheets by index: the manifest's A, B, G and the world's actor shadows S (./useYard.ts). */
export const SHEETS = ['A', 'B', 'G', 'S'] as const;
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

const BY_ID = new Map<string, ManifestEntry>(MANIFEST.map((e) => [e.id, e]));
export const entryOf = (id: string): ManifestEntry | undefined => BY_ID.get(id);
const SHEET_OF: Record<string, number> = { A: 0, B: 1, G: 2, S: 3 };

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
  'prop.dropoff.pad': { corners: true },
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

/** The lane's geometry from content: the gate, the lane's width, each partner's distance, the bridge. */
export interface LaneGeo {
  gx: number;
  gy: number;
  /** Half the asphalt's width, metres. */
  half: number;
  /** Partner id -> x of its site (the gate plus its lane distance). */
  sites: { id: string; x: number; look: number }[];
  /** x of the weight-limited bridge (null: none), and how far a vehicle may go. */
  bridge: number | null;
  end: number;
}

export function laneGeo(c: SalvageContent): LaneGeo | null {
  const g = c.map.points.gate;
  if (!g) return null;
  const lane = c.map.lane ?? {};
  const half = ((c.map as { laneWidth?: number }).laneWidth ?? 6) / 2;
  const sites = Object.entries(c.partners).map(([id, p], i) => ({ id, x: g[0] + (lane[p.lane] ?? 0), look: i }));
  const bridgeKey = Object.keys(lane).find((k) => k.startsWith('bridge'));
  const bridge = bridgeKey ? g[0] + lane[bridgeKey] : null;
  const far = Math.max(g[0] + 20, ...sites.map((s) => s.x + 12));
  const end = bridge !== null ? bridge - 2 : far;
  return { gx: g[0], gy: g[1], half, sites, bridge, end };
}

/** How far the drawn lane runs east (asphalt past the bridge). */
export const laneDrawEnd = (l: LaneGeo) => (l.bridge !== null ? l.bridge + 14 : l.end);

/** The yard's static sprites (see the header): built once per config and baked art. */
export function staticItems(c: SalvageContent, res: Resolver): number[] {
  const out: number[] = [];
  const W = c.yard.width;
  const D = c.yard.depth;
  const lane = laneGeo(c);
  const gateLo = lane ? lane.gy - lane.half : -1;
  const gateHi = lane ? lane.gy + lane.half : -1;
  // The fence: 2.5 m panels along the four sides, a gap at the gate.
  for (let x = 1.25; x < W; x += 2.5) {
    sprite(out, res, 'plant.fence.ew', x, 0.05);
    sprite(out, res, 'plant.fence.ew', x, D - 0.05);
  }
  for (let y = 1.25; y < D; y += 2.5) {
    sprite(out, res, 'plant.fence.ns', 0.05, y);
    if (!lane || y + 1.25 <= gateLo || y - 1.25 >= gateHi) sprite(out, res, 'plant.fence.ns', W - 0.05, y);
  }
  if (lane) {
    sprite(out, res, 'plant.gate.leaf.open', W - 0.3, gateLo - 1.6);
    sprite(out, res, 'plant.gate.leaf.open', W - 0.3, gateHi + 1.6);
  }
  // The ground work's props: the container wall (tinted per container), rubble, crates.
  c.props.forEach((p, i) => {
    if (p.kind === 'wall') sprite(out, res, p.d >= p.w ? 'plant.container.ns' : 'plant.container.ew', p.x, p.y, { tint: hexInt(CONTAINER_TINTS[i % CONTAINER_TINTS.length]) });
    else if (p.kind === 'pile') sprite(out, res, ['plant.heap.li', 'plant.heap.hms', 'plant.heap.ci'][i % 3], p.x, p.y);
    else if (p.kind === 'crate') sprite(out, res, 'plant.block', p.x, p.y);
  });
  // The places, from their footprints.
  for (const [id, pl] of Object.entries(c.map.places)) {
    const pt = c.map.points[id];
    if (!pt) continue;
    const [x, y] = pt;
    const art = entryOf(pl.sprite) ? { id: pl.sprite, flat: !pl.solid } : PLACE_ART[pl.sprite];
    if (!art) continue;
    if (art.id) sprite(out, res, art.id, x, y, { flat: art.flat });
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
  let bed = 1;
  for (const z of Object.values(c.zones)) {
    if (z.r < 2 || bed > 3) continue;
    sprite(out, res, `heap.zone${bed}`, z.centre[0], z.centre[1], { key: z.centre[1] - 1.3 });
    bed++;
  }
  if (lane) laneItems(out, res, lane, W);
  return out;
}

/** The lane east of the gate: asphalt, hedges, the partners' sites, the bridge and its barrier. */
function laneItems(out: number[], res: Resolver, l: LaneGeo, W: number): void {
  const end = laneDrawEnd(l);
  for (let x = W + 1.5; x < end; x += 3) {
    for (let y = l.gy - l.half + 1.5; y < l.gy + l.half; y += 3) sprite(out, res, l.bridge !== null && Math.abs(x - l.bridge) < 2.5 ? 'ground.asphalt' : 'ground.asphalt', x, y);
    for (const side of [-1, 1]) {
      const vy = l.gy + side * (l.half + 1.5);
      sprite(out, res, l.bridge !== null && Math.abs(x - l.bridge) < 3 ? 'ground.water' : 'ground.verge', x, vy);
    }
  }
  const nearSite = (x: number) => l.sites.some((s) => Math.abs(s.x - x) < 6) || (l.bridge !== null && Math.abs(l.bridge - x) < 5);
  for (let x = W + 2; x < end; x += 3) {
    if (nearSite(x)) continue;
    sprite(out, res, 'lane.hedge', x, l.gy - l.half - 0.6);
    sprite(out, res, 'lane.hedge', x, l.gy + l.half + 0.6);
  }
  for (const s of l.sites) {
    if (s.look === 0) sprite(out, res, 'lane.shed.farm', s.x, l.gy - l.half - 2.2);
    else {
      sprite(out, res, 'lane.hoarding', s.x - 3.5, l.gy - l.half - 0.4);
      sprite(out, res, 'lane.hoarding.gate', s.x, l.gy - l.half - 0.4);
      sprite(out, res, 'lane.hoarding', s.x + 3.5, l.gy - l.half - 0.4);
    }
    sprite(out, res, 'ground.hatch', s.x, l.gy + l.half - 0.5);
  }
  if (l.bridge !== null) {
    sprite(out, res, 'lane.parapet', l.bridge, l.gy - l.half - 0.2);
    sprite(out, res, 'lane.parapet', l.bridge, l.gy + l.half + 0.2);
    sprite(out, res, 'lane.sign.limit', l.bridge - 3, l.gy - l.half - 0.8);
    sprite(out, res, 'lane.barrier', l.bridge - 1.6, l.gy);
  }
}

// =====================================================================================================
// 2. The rules' picture
// =====================================================================================================

export const POSES = ['stand', 'walk', 'push', 'feed', 'pour', 'spanner', 'sledge', 'grinder', 'torch'] as const;
export type PoseName = (typeof POSES)[number];
export const P_STAND = 0;
export const P_WALK = 1;
export const P_PUSH = 2;
export const P_FEED = 3;
export const P_POUR = 4;
export const P_SPANNER = 5;
export const P_SLEDGE = 6;
export const P_GRINDER = 7;
export const P_TORCH = 8;
/** Frames per pose (the manifest's person entries). */
export const POSE_FRAMES = [1, 4, 4, 2, 1, 2, 2, 2, 2];

export const ROLE_CODE: Record<string, number> = { hand: 0, cutter: 1, driver: 2 };
export const SKIP_CODE = { none: 0, empty: 1, trial: 2, full: 3 } as const;
export const LEG_CODE = { out: 0, hook: 1, back: 2, weigh: 3, tip: 4 } as const;
export const FLATBED_CODE = { waiting: 0, loading: 1, away: 2 } as const;

/** Numbers per crew member in RulesScene.crew. */
export const CREW = 14;

/**
 * What the rules decided, for the UI thread (one shared value, ./useRulesTable.ts). `cut` and `carried`
 * are the ground work's fields (kept for the interactables' marks and the tests).
 */
export interface RulesScene {
  /** The frame's play second, and a counter that changes with every push. */
  t: number;
  n: number;
  items: number[];
  /** Packed solids of the whole things standing in the yard (collision). */
  solids: number[];
  /** Crew: CREW numbers each: role, pose(work), fx, fy, tx, ty, t0, t1, carrier(0 none, 1 sack, 2 trolley), carrier frame (its load), phase(0 wait,1 walkTo,2 work,3 walkBack), hidden, vx, vy (the wall's gap to pass, or NaN). */
  crew: number[];
  /** owned, x, y, heading(rad), skip code, by (0 none, 1 boss, 2 driver), leg code or -1, t0, t1, hook share or -1, site x, skip load frame or -1. */
  truck: number[];
  /** phase code, t0, t1, x, y, cargo (0 none, 1 part, 2 full). */
  flatbed: number[];
  /** on, x, y, t0, t1 (the public's car and trailer). */
  car: number[];
  /** carrier (0 frame, 1 sack, 2 trolley), hand family index or -1, carrier frame, work pose or -1, its thing x, y, pour x, y (NaN none), pieces carried. */
  boss: number[];
  cut: number[];
  carried: number;
}

export const NO_SCENE: RulesScene = { t: 0, n: 0, items: [], solids: [], crew: [], truck: [0, 0, 0, 0, 0, 0, -1, 0, 0, -1, 0, -1], flatbed: [0, 0, 0, 0, 0, 0], car: [0, 0, 0, 0, 0], boss: [0, -1, 0, -1, NaN, NaN, NaN, NaN, 0], cut: [], carried: 0 };

const famIndex = (f: LoadFamily | null) => (f ? HAND_FAMILIES.indexOf(handFamilyOf(f)) : -1);
const famOfGrade = (grade: string | undefined) => (grade ? loadFamily(grade) : null);

/** A stable small hash of a string (which of a grade's piece pictures a piece shows). */
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** The work pose of a tool (the boss's spanners, sledge, grinder, torch). */
function toolPose(tool: string | null | undefined, family: string | null): number {
  if (tool === 'torch') return P_TORCH;
  if (tool === 'sledge') return family === 'ci' ? P_SLEDGE : P_GRINDER;
  if (tool === 'grinder') return P_GRINDER;
  if (tool === 'spanners' || tool === 'spanner') return P_SPANNER;
  return -1;
}

/**
 * The tool a thing is worked with, when the frame does not say (stand-in for FrameTable.boss.tool,
 * requests.md): its object's tier picks the tool; at tier 2 cast iron takes the sledge, the rest the grinder.
 */
function guessPose(c: SalvageContent, obj: string): number {
  const o = c.objects[obj];
  if (!o) return P_SPANNER;
  const fam = famOfGrade(o.pieces[0]?.[0]);
  if (o.tier >= 3) return P_TORCH;
  if (o.tier === 2) return fam === 'ci' ? P_SLEDGE : P_GRINDER;
  return P_SPANNER;
}

/** Which of the partners' looks (0 the farm's, 1 the demolition site's) a partner id has: its order in content. */
const partnerLook = (c: SalvageContent, id: string) => Math.max(0, Object.keys(c.partners).indexOf(id)) % 2;
const SKIP_LOAD_FRAMES = ['farm-trial', 'farm-full', 'demolition-trial', 'demolition-full'];
const skipLoadFrame = (look: number, trial: boolean) => SKIP_LOAD_FRAMES.indexOf(`${look === 0 ? 'farm' : 'demolition'}-${trial ? 'trial' : 'full'}`);

/** The rules' picture of a frame (see the header). Pure. */
export function rulesScene(c: SalvageContent, f: R.FrameTable, res: Resolver, n = 0): RulesScene {
  const items: number[] = [];
  const solids: number[] = [];
  // Things, whole and in their stages.
  for (const th of f.things) {
    const o = c.objects[th.obj];
    const id = OBJECT_SPRITE[th.obj] ?? th.sprite.replace(/\.(whole|cut\d+)$/, '');
    const e = entryOf(id);
    if (!e) continue;
    const stages = Math.max(1, o?.stages ?? 1);
    const frame = th.stage <= 0 ? 0 : stageOf(e.frames.length, th.stage, Math.max(1, stages - 1));
    sprite(items, res, id, th.x, th.y, { frame });
    if (o && th.stage === 0) solids.push(1, th.x, th.y, Math.max(0.3, Math.min(o.size.w, e.footprint.w) / 2), Math.max(0.2, Math.min(o.size.d, e.footprint.d) / 2));
  }
  // Pieces on the ground.
  for (const p of f.pieces) {
    const list = GRADE_SPRITE[p.grade];
    const id = entryOf(p.sprite) ? p.sprite : list ? list[hashStr(p.uid) % list.length] : null;
    if (id) sprite(items, res, id, p.x, p.y, { frame: id.startsWith('piece.ingot') ? 3 : 0 });
  }
  // Machines in their looks.
  let pourAt: { x: number; y: number } | null = null;
  for (const m of f.machines) machineItems(items, res, m, (p) => (pourAt = p));
  // Bays: ferrous heaps in five sizes, stillages in layers, the held flag.
  for (const b of f.bays) {
    const fe = b.sprite.startsWith('bay.');
    if (fe) {
      if (b.fill > 0) sprite(items, res, `heap.${b.grade}.${Math.max(1, Math.min(5, Math.round((b.fill * 5) / 4)))}`, b.x, b.y);
    } else {
      sprite(items, res, 'plant.stillage', b.x, b.y);
      const layers = b.fill <= 0 ? 0 : b.fill <= 2 ? 1 : 2;
      for (let k = 0; k < layers; k++) sprite(items, res, `plant.stillage.layer.${b.grade}`, b.x, b.y, { key: b.y + 0.5 + 0.001 * (k + 1), dy: STILLAGE_LAYER_DY * k });
      sprite(items, res, 'plant.stillage.front', b.x, b.y, { key: b.y + 0.51 });
    }
    if (b.held) sprite(items, res, 'plant.flag.hold', b.x + 0.5, b.y - 0.3);
  }
  // Partners' skips on the lane, with the load over the rim once full.
  for (const s of f.skips) {
    sprite(items, res, 'vehicle.skip', s.x, s.y);
    if (s.state !== 'filling') sprite(items, res, 'vehicle.skip.load', s.x, s.y, { frame: skipLoadFrame(partnerLook(c, s.partner), s.state === 'trial'), key: s.y + 0.876, dy: -0.95 * 40 * Math.sqrt(1 - 0.49) });
  }
  for (const ci of f.circles) sprite(items, res, 'ground.chalk', ci.x, ci.y);

  // The boss's carrier, load and act.
  const carrier = f.load.carrier === 'sack' ? 1 : f.load.carrier === 'trolley' ? 2 : 0;
  const top = f.load.pieces.length ? f.load.pieces[f.load.pieces.length - 1] : null;
  const heaviest = f.load.pieces.reduce<{ grade: string; g: number } | null>((a, p) => (!a || p.g > a.g ? p : a), null);
  const fam = famOfGrade(heaviest?.grade ?? top?.grade);
  const fb = (f as { boss?: { act?: string; thing?: string | null; tool?: string | null; family?: string | null } }).boss;
  let work = -1;
  let wx = NaN;
  let wy = NaN;
  const worked = f.things.find((t) => (fb?.thing ? t.uid === fb.thing : t.by === 'boss' && t.work !== null));
  if (worked && (!fb || fb.act === 'work' || fb.act === undefined)) {
    work = fb?.tool ? toolPose(fb.tool, fb.family ?? famOfGrade(c.objects[worked.obj]?.pieces[0]?.[0])) : guessPose(c, worked.obj);
    wx = worked.x;
    wy = worked.y;
  } else if (fb?.act === 'strip' || fb?.act === 'feed') {
    work = P_FEED;
  }
  const pa = pourAt as { x: number; y: number } | null;
  const boss = [carrier, f.load.pieces.length && carrier === 0 ? famIndex(fam) : -1, carrierFrameOf(fam && f.load.pieces.length ? fam : null), work, wx, wy, pa ? pa.x : NaN, pa ? pa.y : NaN, f.load.pieces.length];

  // Crew legs (E17: the walk IS the leg; nothing here decides where anyone goes).
  const crew: number[] = [];
  const wallX = wallLine(c);
  const via = c.helpers.via;
  for (const m of f.crew) {
    const job = m.job;
    const phase = m.phase === 'walkTo' ? 1 : m.phase === 'walkBack' ? 3 : m.phase === 'work' ? 2 : 0;
    let pose = P_STAND;
    if (phase === 2) {
      if (job === 'cutDropoff' || job === 'cutFloor') pose = P_GRINDER;
      else if (job === 'feed') pose = P_FEED;
      else if (job === 'pour') pose = P_POUR;
    }
    const lf = m.load.length ? famOfGrade(m.load[0].grade) : null;
    const carrierKind = m.role === 'hand' ? 1 : 0;
    const hidden = job === 'drive' && (phase === 2 || f.truck.by === 'driver') ? 1 : 0;
    const crosses = wallX !== null && via && (m.from.x - wallX) * (m.to.x - wallX) < 0;
    crew.push(ROLE_CODE[m.role] ?? 0, pose, m.from.x, m.from.y, m.to.x, m.to.y, m.t0, m.t1, carrierKind, carrierFrameOf(lf), phase, hidden, crosses ? via![0] : NaN, crosses ? via![1] : NaN);
  }

  // The truck, the flatbed, the public's car.
  const tk = f.truck;
  const leg = tk.leg as (R.FrameTruck['leg'] & { partner?: string }) | null;
  const lane = laneGeo(c);
  const legPartner = leg?.partner ?? f.skips.find((s) => s.state !== 'filling')?.partner ?? f.skips[0]?.partner ?? null;
  const site = lane?.sites.find((s) => s.id === legPartner);
  const skipFrame = tk.skip === 'trial' || tk.skip === 'full' ? skipLoadFrame(legPartner ? partnerLook(c, legPartner) : 0, tk.skip === 'trial') : -1;
  const truck = [tk.owned ? 1 : 0, tk.x, tk.y, tk.heading, SKIP_CODE[tk.skip], tk.by === 'boss' ? 1 : tk.by === 'driver' ? 2 : 0, leg ? LEG_CODE[leg.phase] : -1, leg?.t0 ?? 0, leg?.t1 ?? 0, tk.hook ?? -1, site?.x ?? (lane ? lane.gx + 20 : tk.x), skipFrame];
  const fbd = f.flatbed;
  const flatbed = [FLATBED_CODE[fbd.phase], fbd.t0, fbd.t1, fbd.x, fbd.y, fbd.load <= 0 ? 0 : fbd.load < 3 ? 1 : 2];
  const car = f.dropoffCar ? [1, f.dropoffCar.x, f.dropoffCar.y, f.dropoffCar.t0, f.dropoffCar.t1] : [0, 0, 0, 0, 0];

  return { t: f.t, n, items, solids, crew, truck, flatbed, car, boss, cut: [], carried: f.load.pieces.length };
}

/** A machine's sprites by its look (the art director's plant entries). */
function machineItems(out: number[], res: Resolver, m: R.FrameMachine, onPour: (p: { x: number; y: number }) => void): void {
  const { x, y, look } = m;
  if (look === 'padlock') return;
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
      const secs = m.ingots.cool * 3;
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
  /** drawScale of carriers, vehicles. */
  carrierScale: number;
  vehicleScale: number;
  /** The vest colours of the roles (hand, cutter, driver) as 0xRRGGBB. */
  vests: number[];
}

export function actorTable(res: Resolver, vests: { hand: string; cutter: string; driver: string }): ActorTable {
  const person: number[] = [];
  const vest: number[] = [];
  for (let who = 0; who < 2; who++)
    for (let p = 0; p < POSES.length; p++)
      for (let f = 0; f < 4; f++)
        for (let h = 0; h < 4; h++) {
          const id = `person.${who === 0 ? 'boss' : 'crew'}.${POSES[p]}`;
          person.push(f < POSE_FRAMES[p] ? res(id, f, h) : -1);
          if (who === 1) vest.push(f < POSE_FRAMES[p] ? res(`person.crew.vest.${POSES[p]}`, f, h) : -1);
        }
  const hand: number[] = [];
  for (const fam of HAND_FAMILIES) for (let h = 0; h < 4; h++) hand.push(res(`load.hand.${fam}`, 0, h));
  const carrier: number[] = [];
  for (const kind of ['sack', 'trolley']) for (let f = 0; f < CARRIER_FRAMES.length; f++) for (let h = 0; h < 4; h++) carrier.push(res(`carrier.${kind}`, f, h));
  const V = { ppm: 40, tilt: 0.7, lift: Math.sqrt(1 - 0.49) };
  const truck: number[] = [];
  const skipTop: number[] = [];
  const shTruck: number[] = [];
  for (let h = 0; h < 8; h++) {
    truck.push(res('vehicle.truck', 0, h));
    skipTop.push(...skipTopOnTruck(V, headingRad(h)));
    shTruck.push(res('shadow.truck', 0, h));
  }
  const four = (id: string) => [0, 1, 2, 3].map((h) => res(id, 0, h));
  const cargoOff: number[] = [];
  for (let h = 0; h < 4; h++) cargoOff.push(...flatbedBedCentre(V, headingRad(h * 2)));
  cargoOff.push(...flatbedBedCentre(V, headingRad(2)));
  return {
    person,
    vest,
    hand,
    carrier,
    ahead: [CARRIER_AHEAD.sack, CARRIER_AHEAD.trolley],
    truck,
    skipTop,
    skipLoad: [0, 1, 2, 3].map((f) => res('vehicle.skip.load', f, 0)),
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
    truckHook: [0, 1, 2, 3].map((f) => res('vehicle.truck.hook', f, 0)),
    carrierScale: scaleOf('carrier.sack'),
    vehicleScale: scaleOf('vehicle.truck'),
    vests: [hexInt(vests.hand), hexInt(vests.cutter), hexInt(vests.driver)],
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
