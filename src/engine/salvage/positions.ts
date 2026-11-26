/**
 * Positions as pure functions of content (S9, S23: positions flow one way, content → game.json → the
 * rules and the screen; the rules, the frame, the screen and the bots use these and nothing else).
 * Metres on the ground plane, x east, y south.
 */
import type { SalvageContent } from '../../config/schema.salvage';
import { rngMix4 } from '../rng';

/** The same draw as board.ts hash01 (imported from the rng, not board.ts: board imports this module). */
const hash01 = (seed: number, family: number, n: number): number => (rngMix4(seed | 0, family | 0, n | 0, 0x5a17) >>> 0) / 4294967296;
import type { GroundPiece, MachineId, PartnerId, PileKey, SalvageState, Spot, ThingAt, ThingState } from './types';

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/** A map point (zero when the content has none: never thrown, the lint reports it). */
export function pointOf(c: SalvageContent, id: string): { x: number; y: number } {
  // Stage 2 (rules-works): a place of the works layer (map.works.points) that the first layer does not name
  // (a plate's plot, the car pad, the halls). The first layer's ids read exactly as before (the one id both
  // name, the field gateway `backfield`, keeps the first layer's point here: mapAt(rung) gives the merged one).
  const p = c.map.points[id] ?? c.map.works?.points?.[id];
  return p ? { x: p[0], y: p[1] } : { x: 0, y: 0 };
}

/**
 * THE MAP A RUNG READS (yard-stage2.md 3.1.1; rules-works): below the works layer's rung the first layer
 * itself; from it, the first layer with `map.works` merged over it as yard_map.py `merged()` does: points,
 * footprints and places of the same id REPLACE, new ids are added; the props of `drop.props` and the walls
 * of `drop.walls` are lifted out; the drive line's rects added and its stops merged; routes and lane merged.
 * Memoised per content and side. `opened` is true once the works opened (counts.bathSet; layer.ts).
 */
export interface MapAt {
  points: Record<string, [number, number]>;
  footprints: Record<string, { x: number; y: number; w: number; d: number }>;
  walls: { x: number; y: number; w: number; d: number }[];
  routes: Record<string, number>;
  lane: Record<string, number>;
  x0: number;
  dropProps: readonly string[];
  driveRects: { x0: number; y0: number; w: number; d: number }[];
  stops: Record<string, [number, number]>;
}
const MAPS = new WeakMap<SalvageContent, { base?: MapAt; merged?: MapAt }>();
export function mapAt(c: SalvageContent, opened: boolean): MapAt {
  let e = MAPS.get(c);
  if (!e) MAPS.set(c, (e = {}));
  const key = opened && c.map.works ? 'merged' : 'base';
  const hit = e[key];
  if (hit) return hit;
  const m = c.map;
  const dl = m.driveLine;
  const base: MapAt = {
    points: { ...m.points } as Record<string, [number, number]>,
    footprints: { ...(m.footprints as MapAt['footprints']) },
    walls: [...m.walls],
    routes: { ...m.routes },
    lane: { ...m.lane },
    x0: 0,
    dropProps: [],
    driveRects: [...(dl?.rects ?? [])],
    stops: { ...((dl?.stops ?? {}) as Record<string, [number, number]>) },
  };
  if (key === 'base') return (e.base = base);
  const w = m.works!;
  const merged: MapAt = {
    points: { ...base.points, ...(w.points as Record<string, [number, number]>) },
    footprints: { ...base.footprints, ...(w.footprints as MapAt['footprints']) },
    walls: base.walls.filter((_, i) => !w.drop.walls.includes(i)),
    routes: { ...base.routes, ...w.routes },
    lane: { ...base.lane, ...w.lane },
    x0: w.x0,
    dropProps: [...w.drop.props],
    driveRects: [...base.driveRects, ...w.driveLine.rects],
    stops: { ...base.stops, ...(w.driveLine.stops as Record<string, [number, number]>) },
  };
  return (e.merged = merged);
}

/** Is (px, py) within `reach` of a place's footprint on the merged map (works places first, then the first layer's)? */
export function nearPlace(c: SalvageContent, place: string, px: number, py: number, reach: number): boolean {
  const w = c.map.works;
  const pt = w?.points?.[place] ?? c.map.points[place];
  if (!pt) return false;
  const pl = w?.places?.[place] ?? c.map.places[place];
  const dx = Math.max(0, Math.abs(px - pt[0]) - (pl?.w ?? 0) / 2);
  const dy = Math.max(0, Math.abs(py - pt[1]) - (pl?.d ?? 0) / 2);
  return Math.hypot(dx, dy) <= reach;
}

/** The gap between two places' footprints on the merged map, metres (0 when they touch or overlap). */
export function placeGap(c: SalvageContent, a: string, b: string): number {
  const w = c.map.works;
  const box = (id: string) => {
    const pt = w?.points?.[id] ?? c.map.points[id];
    const pl = w?.places?.[id] ?? c.map.places[id];
    return pt ? { x: pt[0], y: pt[1], w: pl?.w ?? 0, d: pl?.d ?? 0 } : null;
  };
  const A = box(a);
  const B = box(b);
  if (!A || !B) return Infinity;
  const dx = Math.max(0, Math.abs(A.x - B.x) - (A.w + B.w) / 2);
  const dy = Math.max(0, Math.abs(A.y - B.y) - (A.d + B.d) / 2);
  return Math.hypot(dx, dy);
}

/** How many things a zone starts with (the sunflower pattern's N). */
function zoneCount(c: SalvageContent, zone: string): number {
  const z = c.zones[zone];
  return z ? Object.values(z.things).reduce((a, n) => a + n, 0) : 0;
}

/** A bed's things, by the zone's k: their centres (bedLayout). Cached per content object (positions are pure functions of content). */
const BEDS = new WeakMap<SalvageContent, Map<string, { x: number; y: number }[]>>();

/** A small stable hash of a zone id (the bed's seed family). */
function idHash(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/** Clear room between two neighbours in a bed, metres (their footprints never overlap: finding L5). */
export const BED_GAP_M = 0.06;

/**
 * Finding L5 (MAP.md M3): a zone's things lie INSIDE its bed (content `zones.<id>.bed`, a rectangle) as a
 * heap worked from its open side inward: rows laid from the open (south) edge towards the wall, the big
 * things first (by footprint area: the car, tanks and beams before washers), each row's spare width
 * shared out between its things by the world's seed (jittered, seeded: the same seed gives the same
 * heap), each thing jittered in its row's depth; no two footprints overlap. The k-th entry is the zone's
 * k-th starting thing (create.ts stockThings order). A thing that finds no room in the bed (the content's
 * bed too small for its stock) lies on the last row at the bed's west end and the positions test fails.
 */
export function bedLayout(c: SalvageContent, zone: string): { x: number; y: number }[] {
  let per = BEDS.get(c);
  if (!per) BEDS.set(c, (per = new Map()));
  const hit = per.get(zone);
  if (hit) return hit;
  const z = c.zones[zone];
  const out: { x: number; y: number }[] = [];
  if (!z?.bed) return out;
  const bed = z.bed;
  const fam = idHash(zone);
  const items: { k: number; w: number; d: number }[] = [];
  let k = 0;
  for (const [obj, n] of Object.entries(z.things)) {
    const sz = c.objects[obj]?.size ?? { w: 1, d: 0.8 };
    for (let i = 0; i < n; i++, k++) items.push({ k, w: sz.w, d: sz.d });
  }
  const order = [...items].sort((a, b) => b.w * b.d - a.w * a.d || b.d - a.d || a.k - b.k);
  // First-fit shelf packing from the open edge (y0 + d) north to the wall (y0): each thing (big first)
  // goes into the first row with width left and depth for it; the newest row may still grow deeper.
  type Item = { k: number; w: number; d: number };
  type Row = { items: Item[]; used: number; depth: number };
  const rows: Row[] = [];
  const depthOf = () => rows.reduce((a, r) => a + r.depth, 0) + BED_GAP_M * Math.max(0, rows.length - 1);
  const overflow: Item[] = [];
  for (const it of order) {
    let placed = false;
    for (let i = 0; i < rows.length && !placed; i++) {
      const r = rows[i];
      if (r.used + BED_GAP_M + it.w > bed.w + 1e-9) continue;
      const last = i === rows.length - 1;
      if (it.d > r.depth + 1e-9 && !(last && depthOf() - r.depth + it.d <= bed.d + 1e-9)) continue;
      r.used += BED_GAP_M + it.w;
      r.depth = Math.max(r.depth, it.d);
      r.items.push(it);
      placed = true;
    }
    if (placed) continue;
    if (it.w <= bed.w + 1e-9 && depthOf() + (rows.length ? BED_GAP_M : 0) + it.d <= bed.d + 1e-9) rows.push({ items: [it], used: it.w, depth: it.d });
    else overflow.push(it);
  }
  let yEdge = bed.y0 + bed.d; // the row's south edge
  let draw = 0;
  for (const r of rows) {
    const slack = Math.max(0, bed.w - r.used);
    // Share the slack out: seeded weights, one more than the row's things (both ends too).
    const wts = Array.from({ length: r.items.length + 1 }, () => 0.2 + hash01(c.worldSeed, fam, draw++));
    const tot = wts.reduce((a, v) => a + v, 0);
    let xw = bed.x0 + (slack * wts[0]) / tot;
    r.items.forEach((it, i) => {
      const jy = Math.max(0, r.depth - it.d) * hash01(c.worldSeed, fam ^ 0x9e37, draw++);
      out[it.k] = { x: xw + it.w / 2, y: yEdge - it.d / 2 - jy };
      xw += it.w + BED_GAP_M + (slack * wts[i + 1]) / tot;
    });
    yEdge -= r.depth + BED_GAP_M;
  }
  for (const it of overflow) out[it.k] = { x: bed.x0 + it.w / 2, y: bed.y0 + it.d / 2 };
  per.set(zone, out);
  return out;
}

/**
 * Where a whole thing stands: in a zone inside its bed (bedLayout; a zone without a bed: on a sunflower
 * pattern of the heap's old circle, k-th of the zone's starting things), at the drop-off in a row of
 * places, on the tipping floor on a grid.
 */
export function thingPos(c: SalvageContent, at: ThingAt): { x: number; y: number } {
  if (at.at === 'zone') {
    const z = c.zones[at.zone];
    if (!z) return { x: 0, y: 0 };
    if (z.bed) {
      const p = bedLayout(c, at.zone)[at.k];
      if (p) return p;
    }
    const n = Math.max(1, zoneCount(c, at.zone));
    const rad = n === 1 ? 0 : z.r * Math.sqrt((at.k + 0.5) / n);
    const a = at.k * GOLDEN;
    return { x: z.centre[0] + rad * Math.cos(a), y: z.centre[1] + rad * Math.sin(a) * 0.8 };
  }
  if (at.at === 'dropoff') {
    const p = pointOf(c, 'dropoff');
    const pl = c.map.places.dropoff;
    if (!pl) return { x: p.x - 1.4 * at.slot, y: p.y };
    // The drop-off's bay (MAP.md M3, content 19:56): its waiting places in rows across the place's
    // footprint, 1.4 m deep a row (two rows of four on a 5.6 x 2.8 place), slot 0 at the north-west.
    const rows = Math.max(1, Math.floor(pl.d / 1.4 + 1e-9));
    const cols = Math.max(1, Math.ceil(c.dropoff.places / rows));
    const col = at.slot % cols;
    const row = Math.floor(at.slot / cols) % rows;
    return { x: p.x - pl.w / 2 + (pl.w / cols) * (col + 0.5), y: p.y - pl.d / 2 + (pl.d / rows) * (row + 0.5) };
  }
  if (at.at === 'floor') return floorSlotPos(c, at.slot);
  return stage2ThingPos(c, at);
}

/** The place of map.works each stage-2 thing stands at (ThingAt v3; s2a-fix widened the union). */
const STAGE2_PLACE = { rack: 'reuseRack', corner: 'corner', crate: 'crate', lot: 'oversize', elvPad: 'elvPad' } as const;
/** 3.3: the first bath 1.55 m off the rack's west end, a metre north of its line (51.6, 38.6 against the rack at 56). */
const CANOPY_GAP_M = 1.55;
const CANOPY_DY_M = -1;
/** The rack's places drawn apart along its length (more share a place, drawn overlapping). */
const RACK_DRAWN = 12;
/**
 * A stage-2 thing's position (s2a-fix): the centre of its place on the merged map (map.works.points). PHASE A
 * STAND-IN, rules-works' (Phase B: `rackSlot`, the corner's pallets, the crate's places, the pad's squares,
 * the apron); nothing stands there before the works open.
 */
function stage2ThingPos(c: SalvageContent, at: Exclude<ThingAt, { at: 'zone' | 'dropoff' | 'floor' }>): { x: number; y: number } {
  if (at.at === 'canopy') {
    // rules-works wave 2 (3.3): the first bath stands beside the canopy, CANOPY_GAP_M west of the rack's west end and
    // CANOPY_DY_M north of its line, outside the public bay.
    const r = c.map.works?.points?.reuseRack;
    const w = c.map.works?.places?.reuseRack?.w ?? 0;
    if (r) return { x: r[0] - w / 2 - CANOPY_GAP_M - 0.85 - at.k * 1.8, y: r[1] + CANOPY_DY_M };
    return floorSlotPos(c, 0);
  }
  if (at.at === 'rack') {
    // The rack's places along its length, slot 0 at the west (`reuse.slots` + level slots; at most 12 drawn apart).
    const r = c.map.works?.points?.reuseRack;
    const w = c.map.works?.places?.reuseRack?.w ?? 4;
    if (r) return { x: r[0] - w / 2 + (w / RACK_DRAWN) * ((at.slot % RACK_DRAWN) + 0.5), y: r[1] };
  }
  if (at.at === 'crate' || at.at === 'lot' || at.at === 'corner') {
    // Places across the footprint, k from the north-west (the picking table's twelve, the pad's four squares, the corner's pallets).
    const id = STAGE2_PLACE[at.at];
    const p = c.map.works?.points?.[id];
    const pl = c.map.works?.places?.[id];
    if (p && pl) {
      const n = at.at === 'lot' ? 4 : at.at === 'crate' ? 12 : 4;
      const cols = at.at === 'lot' ? 4 : at.at === 'crate' ? 4 : 2;
      const rows = Math.ceil(n / cols);
      const col = at.k % cols;
      const row = Math.floor((at.k % n) / cols);
      return { x: p[0] - pl.w / 2 + (pl.w / cols) * (col + 0.5), y: p[1] - pl.d / 2 + (pl.d / rows) * (row + 0.5) };
    }
  }
  const id = at.at === 'apron' ? `${at.plate}.apron` : STAGE2_PLACE[at.at];
  const p = c.map.works?.points?.[id] ?? c.map.points[id];
  return p ? { x: p[0], y: p[1] } : floorSlotPos(c, 0);
}

/** The tipping floor's grid pitch and a thing's half-size kept inside the footprint, metres. */
const FLOOR_PITCH_X = 1.5;
const FLOOR_PITCH_Y = 1.4;
const FLOOR_MARGIN = 0.45;

/**
 * How many slots of its own the tipping floor has (E35): the 4-wide grid's rows that lie inside the
 * floor's footprint (content `map.places.floor`), at least one row. Past the last slot things share slots.
 */
export function floorSlots(c: SalvageContent): number {
  const pl = c.map.places.floor;
  if (!pl) return 12;
  const rows = Math.max(1, Math.floor((pl.d / 2 + 1 - FLOOR_MARGIN) / FLOOR_PITCH_Y + 1e-9) + 1);
  const colsFit = Math.max(1, Math.floor((pl.w / 2 + 2.25 - FLOOR_MARGIN) / FLOOR_PITCH_X + 1e-9) + 1);
  return rows * Math.min(4, colsFit);
}

/**
 * Where tipping-floor slot `slot` lies (E35): slot k < floorSlots on the grid; past the last slot a thing
 * shares slot k mod N, set a little off it (a heap, drawn overlapping), and every point stays inside the
 * floor's footprint. Room on the floor stays by mass (things.ts floorMass_g).
 */
export function floorSlotPos(c: SalvageContent, slot: number): { x: number; y: number } {
  const p = pointOf(c, 'floor');
  const n = floorSlots(c);
  const base = slot % n;
  const layer = Math.floor(slot / n);
  const cols = Math.min(4, n);
  const col = base % cols;
  const row = Math.floor(base / cols);
  let x = p.x - 2.25 + FLOOR_PITCH_X * col;
  let y = p.y - 1 + FLOOR_PITCH_Y * row;
  if (layer > 0) {
    // A seeded small offset per layer: the shared slot reads as a heap, not one thing on another.
    x += (hash01(c.worldSeed, 0xf100, slot) - 0.5) * 0.7;
    y += (hash01(c.worldSeed, 0xf101, slot) - 0.5) * 0.5;
  }
  const pl = c.map.places.floor;
  if (pl) {
    const hx = Math.max(0, pl.w / 2 - FLOOR_MARGIN);
    const hy = Math.max(0, pl.d / 2 - FLOOR_MARGIN);
    x = Math.min(p.x + hx, Math.max(p.x - hx, x));
    y = Math.min(p.y + hy, Math.max(p.y - hy, y));
  }
  return { x, y };
}

/** The base point of a pile (pile keys: types.ts `PileKey`). */
function pileBase(c: SalvageContent, pile: PileKey, thingAt?: (uid: string) => ThingAt | null): { x: number; y: number } {
  const [kind, rest] = [pile.slice(0, pile.indexOf('.') < 0 ? pile.length : pile.indexOf('.')), pile.indexOf('.') < 0 ? '' : pile.slice(pile.indexOf('.') + 1)];
  if (kind === 'beside') {
    const at = thingAt?.(rest) ?? null;
    if (at) {
      const p = thingPos(c, at);
      return { x: p.x + 0.9, y: p.y + 0.7 };
    }
    return pointOf(c, 'start');
  }
  if (kind === 'zone') {
    const z = c.zones[rest];
    if (z?.bed) return { x: z.bed.x0 + z.bed.w / 2, y: z.bed.y0 + z.bed.d + 0.8 };
    return z ? { x: z.centre[0], y: z.centre[1] + z.r + 0.8 } : { x: 0, y: 0 };
  }
  if (kind === 'circle') {
    const k = circlePos(c, Number(rest) || 0);
    return { x: k.x, y: k.y };
  }
  if (kind === 'tray') {
    const place = rest === 'hand_stripper' ? 'stripper' : rest;
    const p = pointOf(c, place);
    const d = c.map.places[place]?.d ?? 2;
    return { x: p.x + 0.6, y: p.y + d / 2 + 0.5 };
  }
  if (kind === 'dropoff') {
    const p = pointOf(c, 'dropoff');
    return { x: p.x, y: p.y + 1.3 };
  }
  if (kind === 'floor') {
    const p = pointOf(c, 'floor');
    return { x: p.x, y: p.y + 2.2 };
  }
  return pointOf(c, kind);
}

/**
 * Where the k-th piece of a pile lies: a small spiral round the pile's base point (S9: one pure
 * function for the rules, the frame, the screen and the bots). `thingAt` resolves a `beside.<uid>`
 * pile's thing (the frame passes the state's things).
 */
export function piecePos(c: SalvageContent, pile: PileKey, k: number, thingAt?: (uid: string) => ThingAt | null): { x: number; y: number } {
  const b = pileBase(c, pile, thingAt);
  if (k <= 0) return b;
  const rad = 0.32 * Math.sqrt(k);
  const a = k * GOLDEN;
  return { x: b.x + rad * Math.cos(a), y: b.y + rad * Math.sin(a) * 0.7 };
}

/** The place the boss stands at (within `reach.place` of its footprint's edge), or null. Places are map points with a footprint. */
export function placeNear(c: SalvageContent, x: number, y: number): string | null {
  let best: string | null = null;
  let bestD = Infinity;
  for (const [id, pl] of Object.entries(c.map.places)) {
    if (!pl.card) continue;
    const p = c.map.points[id];
    if (!p) continue;
    // A place with a door (content `door`) opens only from that side of its footprint (join2, seam e).
    const door = (pl as { door?: 'n' | 's' | 'e' | 'w' }).door;
    if (door === 's' ? y < p[1] + pl.d / 2 : door === 'n' ? y > p[1] - pl.d / 2 : door === 'e' ? x < p[0] + pl.w / 2 : door === 'w' ? x > p[0] - pl.w / 2 : false) continue;
    const dx = Math.max(0, Math.abs(x - p[0]) - pl.w / 2);
    const dy = Math.max(0, Math.abs(y - p[1]) - pl.d / 2);
    const d = Math.hypot(dx, dy);
    if (d <= c.reach.place && d < bestD) {
      best = id;
      bestD = d;
    }
  }
  return best;
}

/** The n-th chalk circle: content `map.circles[n]` ([x, y, r]), else two west of the scale. */
export function circlePos(c: SalvageContent, n: number): { x: number; y: number; r: number } {
  const k = c.map.circles[n];
  if (k) return { x: k[0], y: k[1], r: k[2] };
  const p = pointOf(c, 'scale');
  return { x: p.x - 3 - 2 * n, y: p.y + 2, r: 0.8 };
}

/** How many chalk circles the yard has (content, else two). */
export function circleCount(c: SalvageContent): number {
  return c.map.circles.length || 2;
}

/** Where a machine stands: its pad's point; both strippers share the stripper pad, the hand stripper west of the powered one (by the pad's width). */
export function machinePos(c: SalvageContent, id: MachineId): { x: number; y: number } {
  const place = id === 'hand_stripper' || id === 'stripper' ? 'stripper' : id;
  const p = pointOf(c, place);
  if (id === 'hand_stripper') return { x: p.x - (c.map.places.stripper?.w ?? 2.4) / 3, y: p.y };
  if (id === 'stripper') return { x: p.x + (c.map.places.stripper?.w ?? 2.4) / 3, y: p.y };
  return p;
}

/** The bays in their fixed order (content order of `bays`, then the remaining grades with a bay look): never by the order grades were first weighed. */
export function bayOrder(c: SalvageContent): string[] {
  const out = Object.keys(c.bays);
  for (const [g, gr] of Object.entries(c.grades)) if (gr.bay && !out.includes(g)) out.push(g);
  return out;
}

/**
 * Where a grade's bay stands: content `grades.<id>.bay.place` and `slot` when given; else ferrous bays
 * in a row along the bays' point and the rest along the stillages' point (`stillage`, or the first
 * `stillage_*` point), in bayOrder.
 */
export function bayPos(c: SalvageContent, grade: string, s?: Pick<SalvageState, 'counts'>): { x: number; y: number } {
  const gr = c.grades[grade];
  if (s && isStillage(c, grade)) {
    const at = stillageSlot(c, s, grade);
    if (at) return at;
  }
  if (gr?.bay?.place && c.map.points[gr.bay.place]) {
    // Slots stay inside the place's footprint (prejoin 17:05: 1.7 m slots from a 1.2 m place stood on the
    // stripper pad): the place's width shared by its slots, at most 1.7 m apart, centred on the place.
    const place = gr.bay.place;
    const p = pointOf(c, place);
    const w = c.map.places[place]?.w ?? 2;
    let n = 0;
    for (const g of Object.values(c.grades)) if (g.bay?.place === place) n = Math.max(n, (g.bay.slot ?? 0) + 1);
    n = Math.max(1, n);
    const pitch = Math.min(1.7, w / n);
    const slot = gr.bay.slot ?? 0;
    return { x: p.x + pitch * (slot - (n - 1) / 2), y: p.y };
  }
  const order = bayOrder(c);
  const fe = order.filter((g) => c.grades[g]?.family === 'fe');
  const other = order.filter((g) => c.grades[g]?.family !== 'fe');
  const bp = pointOf(c, 'bays');
  const stillKey = c.map.points.stillage ? 'stillage' : Object.keys(c.map.points).find((k) => k.startsWith('stillage'));
  const sp = stillKey ? pointOf(c, stillKey) : { x: bp.x, y: bp.y - 2.5 };
  if (gr?.family === 'fe') return { x: bp.x - 2.5 + 1.7 * Math.max(0, fe.indexOf(grade)), y: bp.y };
  return { x: sp.x - 1.5 + 1.1 * Math.max(0, other.indexOf(grade)), y: sp.y };
}

/** STILLAGE_PITCH_M: the lead's ruling (17:10): stillages 1.3 m apart, two rows of seven. */
const STILLAGE_PITCH_M = 1.3;
const STILLAGE_ROW = 7;

/** Is a grade's bay a stillage (content `bay.kind`, else a non-ferrous grade that is not a cage)? */
export function isStillage(c: SalvageContent, grade: string): boolean {
  const gr = c.grades[grade];
  if (!gr) return false;
  if (gr.bay?.kind) return gr.bay.kind === 'stillage';
  return gr.family !== 'fe' && gr.family !== 'pm';
}

/** Has a grade's bay had stock (lifetime)? The sim numbers each grade's first stock (`counts['bay#:<grade>']`, clock.ts). */
export function bayStocked(s: Pick<SalvageState, 'counts'>, grade: string): boolean {
  return (s.counts?.[`bay#:${grade}`] ?? 0) > 0;
}

/**
 * The lead's ruling (17:10): a stillage stands only for a grade that has had stock; they stand in ONE
 * block of two rows of seven at the stillage area, 1.3 m apart, filled in the order the grades first had
 * stock from the end nearest the merchant's stand. Rows lie at the content's stillage places (the first
 * two `stillage*` places; one place: the second row 1.3 m south). Null for a grade with no stock yet.
 */
export function stillageSlot(c: SalvageContent, s: Pick<SalvageState, 'counts'>, grade: string): { x: number; y: number } | null {
  if (!bayStocked(s, grade)) return null;
  const mine = s.counts![`bay#:${grade}`];
  let k = 0;
  for (const g of Object.keys(c.grades)) if (g !== grade && isStillage(c, g) && bayStocked(s, g) && s.counts![`bay#:${g}`] < mine) k++;
  const rows = Object.keys(c.map.points).filter((id) => id.startsWith('stillage')).sort();
  if (!rows.length) return null;
  const r0 = pointOf(c, rows[0]);
  const merchant = c.map.points.merchant ? pointOf(c, 'merchant') : r0;
  // Away from the merchant's stand, judged against the block's middle (the stand moved under the block at
  // 17:55, x 39.6..45.6 against a block from 43.6: the columns run west, as the integrator laid it out).
  const dir = merchant.x > r0.x - (STILLAGE_ROW * STILLAGE_PITCH_M) / 2 ? -1 : 1;
  const row = Math.floor(k / STILLAGE_ROW) % 2;
  const col = k % STILLAGE_ROW;
  const ry = row === 0 ? r0.y : rows[1] ? pointOf(c, rows[1]).y : r0.y + STILLAGE_PITCH_M;
  return { x: r0.x + dir * col * STILLAGE_PITCH_M, y: ry };
}

/** A vehicle's way point on the drive line (content `map.driveLine.stops.<id>`), else the map point of that id. */
export function stopOf(c: SalvageContent, id: string): { x: number; y: number } {
  const p = (c.map.driveLine?.stops as Record<string, [number, number]> | undefined)?.[id];
  return p ? { x: p[0], y: p[1] } : pointOf(c, id);
}

/** A partner's skip zone for a slot of its rotation: on the lane east of the gate at its lane distance (the lane is drawn at rule distances), slots side by side; size from `map.sites`. */
export function skipZone(c: SalvageContent, partner: PartnerId, slot: number): { x: number; y: number; w: number; d: number } {
  const gate = pointOf(c, 'gate');
  const lane = c.map.lane[c.partners[partner]?.lane ?? ''] ?? 0;
  const site = c.map.sites[partner] ?? { w: 6, d: 4 };
  return { x: gate.x + lane + slot * (site.w + 1), y: gate.y - site.d / 2 - 1, w: site.w, d: site.d };
}

/** The drive from the truck's park (or a point) through the gate to a partner's skip zone: the path's waypoints, metres. */
export function lanePath(c: SalvageContent, from: { x: number; y: number }, partner: PartnerId, slot = 0): { x: number; y: number }[] {
  const gate = pointOf(c, 'gate');
  const z = skipZone(c, partner, slot);
  const out = [{ x: gate.x + 2, y: gate.y }, { x: z.x, y: gate.y }, { x: z.x, y: z.y }];
  const line = driveToGate(c, from);
  if (line) return [from, ...line, ...out];
  return [from, { x: gate.x - 2, y: gate.y }, ...out];
}

/**
 * MAP.md M4: from a point to the gate ALONG the drive line (content `map.driveLine`): the point's foot on
 * the line, then the line's vertices to its end at the gate. Null when the content has no drive line.
 */
export function driveToGate(c: SalvageContent, from: { x: number; y: number }): { x: number; y: number }[] | null {
  const dl = c.map.driveLine;
  if (!dl || dl.points.length < 2) return null;
  const gate = pointOf(c, 'gate');
  let pts = dl.points.map(([x, y]) => ({ x, y }));
  const d0 = Math.hypot(pts[0].x - gate.x, pts[0].y - gate.y);
  const d1 = Math.hypot(pts[pts.length - 1].x - gate.x, pts[pts.length - 1].y - gate.y);
  if (d1 < d0) pts = pts.reverse(); // pts[0] is the gate's end
  let best = { i: 0, q: pts[0], d: Infinity };
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const L2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
    const u = L2 > 0 ? Math.max(0, Math.min(1, ((from.x - a.x) * (b.x - a.x) + (from.y - a.y) * (b.y - a.y)) / L2)) : 0;
    const q = { x: a.x + u * (b.x - a.x), y: a.y + u * (b.y - a.y) };
    const d = Math.hypot(from.x - q.x, from.y - q.y);
    if (d < best.d) best = { i, q, d };
  }
  const path = [best.q];
  for (let i = best.i; i >= 0; i--) path.push(pts[i]);
  return path;
}

/** Resolve a crew leg's end to metres (one function for the rules, the frame and the bots). */
export function spotPos(c: SalvageContent, spot: Spot, things: readonly ThingState[], truck: { x: number; y: number }): { x: number; y: number } {
  return southOfWall(c, spotRaw(c, spot, things, truck));
}

/** MAP.md M1: nobody walks north of the back wall (content `map.north`): a walker's spot is kept NORTH_CLEAR_M south of it. */
export const NORTH_CLEAR_M = 0.5;
export function southOfWall(c: SalvageContent, p: { x: number; y: number }): { x: number; y: number } {
  const n = c.map.north;
  return n !== undefined && p.y < n + NORTH_CLEAR_M ? { x: p.x, y: n + NORTH_CLEAR_M } : p;
}

function spotRaw(c: SalvageContent, spot: Spot, things: readonly ThingState[], truck: { x: number; y: number }): { x: number; y: number } {
  if ('place' in spot) return pointOf(c, spot.place);
  if ('pile' in spot) {
    const at = (uid: string) => things.find((t) => t.uid === uid)?.at ?? null;
    return piecePos(c, spot.pile, spot.k ?? 0, at);
  }
  if ('thing' in spot) {
    const th = things.find((t) => t.uid === spot.thing);
    return th ? thingPos(c, th.at) : pointOf(c, 'start');
  }
  if ('truck' in spot) return { x: truck.x, y: truck.y };
  return { x: spot.xy[0], y: spot.xy[1] };
}

/**
 * The thing the boss stands at (within `reach` of its footprint's EDGE, `objects[obj].size`), nearest
 * first, or null: a beam is long, and stopping beside it anywhere must start work (D12). `skip`: uids
 * not to take (claimed by a cutter).
 */
export function thingNear(c: SalvageContent, things: readonly ThingState[], x: number, y: number, reach: number, skip?: (t: ThingState) => boolean): string | null {
  let best: string | null = null;
  let bestD = Infinity;
  for (const th of things) {
    if (skip?.(th)) continue;
    const o = c.objects[th.obj];
    const p = thingPos(c, th.at);
    const w = o?.size.w ?? 1;
    const d = o?.size.d ?? 0.8;
    const dist = Math.hypot(Math.max(0, Math.abs(x - p.x) - w / 2), Math.max(0, Math.abs(y - p.y) - d / 2));
    if (dist <= reach && dist < bestD) {
      best = th.uid;
      bestD = dist;
    }
  }
  return best;
}

/** The ground pieces within `reach` of (x, y), nearest first (pickup picks among them by value). */
export function pileNear(c: SalvageContent, pieces: readonly GroundPiece[], things: readonly ThingState[], x: number, y: number, reach: number): GroundPiece[] {
  const at = (uid: string) => things.find((t) => t.uid === uid)?.at ?? null;
  return pieces
    .map((pc) => ({ pc, d: Math.hypot(piecePos(c, pc.pile, pc.k, at).x - x, piecePos(c, pc.pile, pc.k, at).y - y) }))
    .filter((e) => e.d <= reach)
    .sort((a, b) => a.d - b.d)
    .map((e) => e.pc);
}

// ============================================================================ the facade's entries (cfg-level; the seam, 16:20)

import type { SalvageConfig, SalvageGame } from './types';

export const thingPosCfg = (cfg: SalvageConfig, at: ThingAt) => thingPos(cfg.salvage, at);
export const piecePosCfg = (cfg: SalvageConfig, pile: PileKey, k: number, thingAt?: (uid: string) => ThingAt | null) => piecePos(cfg.salvage, pile, k, thingAt);
export const pointCfg = (cfg: SalvageConfig, id: string) => pointOf(cfg.salvage, id);
export const placeNearCfg = (cfg: SalvageConfig, x: number, y: number) => placeNear(cfg.salvage, x, y);
export const thingNearCfg = (cfg: SalvageConfig, g: SalvageGame, x: number, y: number, reach = cfg.salvage.reach.work) => thingNear(cfg.salvage, g.salvage.things, x, y, reach);
export const pileNearCfg = (cfg: SalvageConfig, g: SalvageGame, x: number, y: number, reach = cfg.salvage.reach.pickup) => pileNear(cfg.salvage, g.salvage.pieces, g.salvage.things, x, y, reach);
export const spotPosCfg = (cfg: SalvageConfig, g: SalvageGame, spot: Spot) => spotPos(cfg.salvage, spot, g.salvage.things, g.salvage.truck);
/** A bay's place; with the game, a stillage stands in the block in the order its grade first had stock (the lead, 17:10). */
export const bayPosCfg = (cfg: SalvageConfig, grade: string, g?: SalvageGame) => bayPos(cfg.salvage, grade, g?.salvage);
export const machinePosCfg = (cfg: SalvageConfig, id: MachineId) => machinePos(cfg.salvage, id);
export const circlePosCfg = (cfg: SalvageConfig, n: number) => circlePos(cfg.salvage, n);
export const skipZoneCfg = (cfg: SalvageConfig, partner: PartnerId, slot: number) => skipZone(cfg.salvage, partner, slot);
export const lanePathCfg = (cfg: SalvageConfig, from: { x: number; y: number }, partner: PartnerId, slot = 0) => lanePath(cfg.salvage, from, partner, slot);

// ============================================================================ the vehicles' paths (owner1 V1, V4)

type P = { x: number; y: number };
const near = (a: P, b: P) => Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;

/** Is a point inside the yard's fence (x at most `yard.width`)? Beyond it: the lane. */
export function insideFence(c: SalvageContent, p: P): boolean {
  return p.x <= c.yard.width + 1e-9;
}

/** Is the segment a-b inside the drive line's corridor (content `map.driveLine.rects`), sampled every quarter metre? */
function inCorridor(c: SalvageContent, a: P, b: P): boolean {
  const rects = c.map.driveLine?.rects ?? [];
  if (!rects.length) return false;
  const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 0.25));
  for (let i = 0; i <= n; i++) {
    const q = { x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n };
    if (!rects.some((r) => q.x >= r.x0 - 1e-6 && q.x <= r.x0 + r.w + 1e-6 && q.y >= r.y0 - 1e-6 && q.y <= r.y0 + r.d + 1e-6)) return false;
  }
  return true;
}

/** Drop repeated points and the middle of three collinear points. */
function tidy(pts: P[]): P[] {
  const out: P[] = [];
  for (const p of pts) {
    if (out.length && near(out[out.length - 1], p)) continue;
    if (out.length >= 2) {
      const a = out[out.length - 2];
      const b = out[out.length - 1];
      const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
      const dot = (b.x - a.x) * (p.x - b.x) + (b.y - a.y) * (p.y - b.y);
      if (Math.abs(cross) < 1e-6 && dot >= 0) out.pop();
    }
    out.push(p);
  }
  return out;
}

/**
 * From a point to a point INSIDE the fence along the drive line (M4): onto the line (the foot, when the point lies off
 * its corridor), the line's vertices between, off it to the end; a vertex whose neighbours see each other through the
 * corridor is pulled out (the path cuts the corridor's corners, never leaves it). No drive line: straight.
 */
function yardPath(c: SalvageContent, a: P, b: P): P[] {
  const dl = c.map.driveLine;
  if (!dl || dl.points.length < 2) return tidy([a, b]);
  const pts = dl.points.map(([x, y]) => ({ x, y }));
  const arc: number[] = [0];
  for (let i = 1; i < pts.length; i++) arc.push(arc[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const foot = (p: P) => {
    let best = { s: 0, q: pts[0], d: Infinity };
    for (let i = 0; i + 1 < pts.length; i++) {
      const u0 = pts[i];
      const u1 = pts[i + 1];
      const L2 = (u1.x - u0.x) ** 2 + (u1.y - u0.y) ** 2;
      const u = L2 > 0 ? Math.max(0, Math.min(1, ((p.x - u0.x) * (u1.x - u0.x) + (p.y - u0.y) * (u1.y - u0.y)) / L2)) : 0;
      const q = { x: u0.x + u * (u1.x - u0.x), y: u0.y + u * (u1.y - u0.y) };
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      if (d < best.d - 1e-9) best = { s: arc[i] + u * Math.sqrt(L2), q, d };
    }
    return best;
  };
  const fa = foot(a);
  const fb = foot(b);
  const path: P[] = [a];
  if (fa.d > dl.w / 2 + 1e-9) path.push(fa.q);
  const between = pts.map((p, i) => ({ p, s: arc[i] })).filter((v) => v.s > Math.min(fa.s, fb.s) + 1e-9 && v.s < Math.max(fa.s, fb.s) - 1e-9);
  if (fb.s < fa.s) between.reverse();
  for (const v of between) path.push(v.p);
  if (fb.d > dl.w / 2 + 1e-9) path.push(fb.q);
  path.push(b);
  // Pull out a vertex whose neighbours see each other through the corridor.
  const t = tidy(path);
  for (let i = 1; i + 1 < t.length; ) {
    if (inCorridor(c, t[i - 1], t[i + 1])) t.splice(i, 1);
    else i++;
  }
  return t;
}

/**
 * THE VEHICLES' ROAD (owner1 V1): the path a truck or a flatbed drives from `a` to `b`: inside the fence along the
 * drive line (yardPath); beyond it on the lane at the gate's y (out of the gate, along the lane, into the site). The
 * point where the path crosses the fence (x = yard.width) is a vertex, so every segment lies wholly inside the fence
 * or wholly beyond it (the rules' timing gives each its own speed: truck.ts). One function for the rules' durations
 * and the frame's drawn path.
 */
export function drivePath(c: SalvageContent, a: P, b: P): P[] {
  const gate = pointOf(c, 'gate');
  const W = c.yard.width;
  const ia = insideFence(c, a);
  const ib = insideFence(c, b);
  let pts: P[];
  if (ia && ib) pts = yardPath(c, a, b);
  else if (ia) pts = [...yardPath(c, a, gate), { x: W, y: gate.y }, { x: b.x, y: gate.y }, b];
  else if (ib) pts = [a, { x: a.x, y: gate.y }, { x: W, y: gate.y }, ...yardPath(c, gate, b)];
  else pts = [a, { x: a.x, y: gate.y }, { x: b.x, y: gate.y }, b];
  const out = tidy(pts);
  // Keep the fence's crossing as a vertex (tidy may have merged it into a straight run).
  const res: P[] = [out[0]];
  for (let i = 1; i < out.length; i++) {
    const p = out[i - 1];
    const q = out[i];
    if ((p.x - W) * (q.x - W) < -1e-12) {
      const u = (W - p.x) / (q.x - p.x);
      res.push({ x: W, y: p.y + u * (q.y - p.y) });
    }
    res.push(q);
  }
  return res;
}

/** A path's length inside the fence and beyond it, metres (segments split at the fence by drivePath). */
export function pathSplit(c: SalvageContent, path: readonly P[]): { yard: number; lane: number } {
  let yard = 0;
  let lane = 0;
  for (let i = 1; i < path.length; i++) {
    const L = Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
    if (insideFence(c, path[i - 1]) && insideFence(c, path[i])) yard += L;
    else lane += L;
  }
  return { yard, lane };
}

/** The yard second the vehicle passes each point of a path that starts at t0, at `vy` inside the fence and `vl` beyond. */
export function pathTimes(c: SalvageContent, path: readonly P[], t0: number, vy: number, vl: number): number[] {
  const at = [t0];
  for (let i = 1; i < path.length; i++) {
    const L = Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
    const v = insideFence(c, path[i - 1]) && insideFence(c, path[i]) ? vy : vl;
    at.push(at[i - 1] + L / Math.max(1e-9, v));
  }
  return at;
}

/** Where a phase of the driver's trip ends (V1, V2): out and hook at the skip zone, back and weigh on the weighbridge's stop, tip at the floor's stop (never its centre), park in the park. */
export function tripPhaseEnd(c: SalvageContent, phase: string, partner: PartnerId, slot: number, from: P): P {
  switch (phase) {
    case 'out':
    case 'hook': {
      const z = skipZone(c, partner, slot);
      return { x: z.x, y: z.y };
    }
    case 'back':
    case 'weigh':
      return stopOf(c, 'weighbridge');
    case 'tip':
      return stopOf(c, 'floor');
    case 'park':
      return stopOf(c, 'park');
    default:
      return from;
  }
}

/** The path of a phase of the driver's trip from where the truck stands at its start (V1): drivePath to the phase's end; a standing phase that starts there: one point. */
export function tripPhasePath(c: SalvageContent, phase: string, partner: PartnerId, slot: number, from: P): P[] {
  const end = tripPhaseEnd(c, phase, partner, slot, from);
  if (Math.hypot(end.x - from.x, end.y - from.y) < 1e-6) return [{ x: from.x, y: from.y }];
  return drivePath(c, from, end);
}
