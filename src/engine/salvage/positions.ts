/**
 * Positions as pure functions of content (S9, S23: positions flow one way, content → game.json → the
 * rules and the screen; the rules, the frame, the screen and the bots use these and nothing else).
 * Metres on the ground plane, x east, y south.
 */
import type { SalvageContent } from '../../config/schema.salvage';
import type { GroundPiece, MachineId, PartnerId, PileKey, Spot, ThingAt, ThingState } from './types';

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/** A map point (zero when the content has none: never thrown, the lint reports it). */
export function pointOf(c: SalvageContent, id: string): { x: number; y: number } {
  const p = c.map.points[id];
  return p ? { x: p[0], y: p[1] } : { x: 0, y: 0 };
}

/** How many things a zone starts with (the sunflower pattern's N). */
function zoneCount(c: SalvageContent, zone: string): number {
  const z = c.zones[zone];
  return z ? Object.values(z.things).reduce((a, n) => a + n, 0) : 0;
}

/**
 * Where a whole thing stands: in a zone on a sunflower pattern of the heap's circle (k-th of the zone's
 * starting things), at the drop-off in a row of places, on the tipping floor on a grid.
 */
export function thingPos(c: SalvageContent, at: ThingAt): { x: number; y: number } {
  if (at.at === 'zone') {
    const z = c.zones[at.zone];
    if (!z) return { x: 0, y: 0 };
    const n = Math.max(1, zoneCount(c, at.zone));
    const rad = n === 1 ? 0 : z.r * Math.sqrt((at.k + 0.5) / n);
    const a = at.k * GOLDEN;
    return { x: z.centre[0] + rad * Math.cos(a), y: z.centre[1] + rad * Math.sin(a) * 0.8 };
  }
  if (at.at === 'dropoff') {
    const p = pointOf(c, 'dropoff');
    return { x: p.x - 1.4 * at.slot, y: p.y };
  }
  const p = pointOf(c, 'floor');
  const col = at.slot % 4;
  const row = Math.floor(at.slot / 4);
  return { x: p.x - 2.25 + 1.5 * col, y: p.y - 1 + 1.4 * row };
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
export function bayPos(c: SalvageContent, grade: string): { x: number; y: number } {
  const gr = c.grades[grade];
  if (gr?.bay?.place && c.map.points[gr.bay.place]) {
    const p = pointOf(c, gr.bay.place);
    const w = c.map.places[gr.bay.place]?.w ?? 2;
    const slot = gr.bay.slot ?? 0;
    return { x: p.x - w / 2 + 0.85 + 1.7 * slot, y: p.y };
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
  return [from, { x: gate.x - 2, y: gate.y }, { x: gate.x + 2, y: gate.y }, { x: z.x, y: gate.y }, { x: z.x, y: z.y }];
}

/** Resolve a crew leg's end to metres (one function for the rules, the frame and the bots). */
export function spotPos(c: SalvageContent, spot: Spot, things: readonly ThingState[], truck: { x: number; y: number }): { x: number; y: number } {
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
export const bayPosCfg = (cfg: SalvageConfig, grade: string) => bayPos(cfg.salvage, grade);
export const machinePosCfg = (cfg: SalvageConfig, id: MachineId) => machinePos(cfg.salvage, id);
export const circlePosCfg = (cfg: SalvageConfig, n: number) => circlePos(cfg.salvage, n);
export const skipZoneCfg = (cfg: SalvageConfig, partner: PartnerId, slot: number) => skipZone(cfg.salvage, partner, slot);
export const lanePathCfg = (cfg: SalvageConfig, from: { x: number; y: number }, partner: PartnerId, slot = 0) => lanePath(cfg.salvage, from, partner, slot);
