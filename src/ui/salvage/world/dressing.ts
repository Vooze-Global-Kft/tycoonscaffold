/**
 * THE YARD'S DRESSING (findings P5, L1, L5 and M; MAP.md M1 and M3): the statics and ground decals that
 * make the running yard read as the art director's picture (look/stage1/yard-844.png, art/proof.draw.ts
 * drawHero), placed from the content's places only. Pure JavaScript (no Skia, no React): the world
 * (./actors.ts) turns each `Dress` into a sprite of the baked manifest, once per config.
 *
 *  - the back wall: one course of lock blocks (plant.block, 0.8 m) along `map.north` across the yard's
 *    whole width, with floodlights at its foot (the far yard shows over it: ./YardView.tsx);
 *  - the ground's wear at the proof's density (about 9 weeds, 3 oil stains and 2 puddles on 400 m2):
 *    weeds at slab joints, along the wall's foot and the fences; oil stains (more on the drive line);
 *    puddles; paint lines along the drive line and in front of the working row; hatches at the
 *    weighbridge's ends;
 *  - the old stock's beds (`bedDress`): ground.bed tiles over each zone's bed rectangle, as many as the
 *    zone has stock left, shrinking towards the bed's wall side; two looks per zone tier.
 *
 * Every position is a content point, a footprint, the yard's size, `map.north`, a bed or the drive line,
 * with seeded spacing: nothing of the old or the new map is written here.
 */
import type { SalvageContent } from '../../../config/schema.salvage';
import { BED_CELL } from '../art/heaps.draw';

/** One dressing sprite: a manifest id at (x, y) metres; `flat` sorts by the north edge; `key` overrides the sort. */
export interface Dress {
  id: string;
  x: number;
  y: number;
  frame?: number;
  flat?: boolean;
  key?: number;
  /** 0..1 (a worked-out bed tile is drawn faint). */
  alpha?: number;
}

/** A rectangle in metres: x0, y0 its north-west corner, w east, d south. */
export interface Bed {
  x0: number;
  y0: number;
  w: number;
  d: number;
}

/** A stable 0..1 hash of integers (the art's pen hash01 has the same spirit; this one is Skia-free). */
export function h01(...k: number[]): number {
  let h = 2166136261;
  for (const n of k) {
    h ^= Math.floor(n * 1000) | 0;
    h = Math.imul(h, 16777619);
    h ^= h >>> 13;
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h ^= h >>> 13;
  return ((h >>> 0) % 100000) / 100000;
}

/** The back wall's line, metres (content `map.north`; the yard's north edge until the map has it). */
export function northOf(c: SalvageContent): number {
  const n = (c.map as { north?: number }).north;
  return typeof n === 'number' && Number.isFinite(n) ? n : 0.4;
}

/** The lock block's side and the wall's height (art/site.draw.ts drawBlock: 0.8 m, 0.75 high). */
export const BLOCK_M = 0.8;
export const WALL_H = BLOCK_M * 0.75;

/** A zone's bed: content `zones.<id>.bed`, else its footprint, else its centre and radius. */
export function bedOf(c: SalvageContent, zone: string): Bed | null {
  const z = c.zones[zone] as (SalvageContent['zones'][string] & { bed?: Bed; footprint?: { x: number; y: number; w: number; d: number } }) | undefined;
  if (!z) return null;
  if (z.bed && z.bed.w > 0 && z.bed.d > 0) return { ...z.bed };
  if (z.footprint && z.footprint.w > 0) return { x0: z.footprint.x - z.footprint.w / 2, y0: z.footprint.y - z.footprint.d / 2, w: z.footprint.w, d: z.footprint.d };
  if (z.centre && z.r > 0) return { x0: z.centre[0] - z.r, y0: z.centre[1] - z.r, w: z.r * 2, d: z.r * 2 };
  return null;
}

/** The zones that have a heap bed (old stock: a tier and a bed of at least 2 m). */
export function bedZones(c: SalvageContent): string[] {
  return Object.keys(c.zones).filter((id) => {
    const z = c.zones[id];
    const b = bedOf(c, id);
    return (z.tier ?? 0) >= 1 && b !== null && Math.max(b.w, b.d) >= 2;
  });
}

/** The drive line's corridor [x0, x1, y0, y1] (content `map.driveLine` in any of its plain shapes), or null. */
export function driveBox(c: SalvageContent): [number, number, number, number] | null {
  const d = (c.map as { driveLine?: unknown }).driveLine as
    | { x0?: number; x1?: number; y0?: number; y1?: number; y?: number; w?: number; width?: number; half?: number; pts?: number[][]; points?: number[][] }
    | number[][]
    | undefined;
  if (!d) return null;
  const pts = Array.isArray(d) ? d : (d.pts ?? d.points);
  if (pts && pts.length >= 2) {
    const width = Array.isArray(d) ? 3.6 : (d.width ?? d.w ?? (d.half ? d.half * 2 : 3.6));
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    return [Math.min(...xs), Math.max(...xs), Math.min(...ys) - width / 2, Math.max(...ys) + width / 2];
  }
  if (!Array.isArray(d) && typeof d.x0 === 'number' && typeof d.x1 === 'number') {
    if (typeof d.y0 === 'number' && typeof d.y1 === 'number') return [Math.min(d.x0, d.x1), Math.max(d.x0, d.x1), Math.min(d.y0, d.y1), Math.max(d.y0, d.y1)];
    if (typeof d.y === 'number') {
      const half = d.half ?? (d.width ?? d.w ?? 3.6) / 2;
      return [Math.min(d.x0, d.x1), Math.max(d.x0, d.x1), d.y - half, d.y + half];
    }
  }
  return null;
}

/** Boxes [x0, x1, y0, y1] the ground's wear keeps off: every place's footprint, every bed, every point's spot. */
function keepOff(c: SalvageContent): number[][] {
  const out: number[][] = [];
  for (const [id, pl] of Object.entries(c.map.places)) {
    const p = c.map.points[id];
    if (!p) continue;
    out.push([p[0] - pl.w / 2 - 0.4, p[0] + pl.w / 2 + 0.4, p[1] - pl.d / 2 - 0.4, p[1] + pl.d / 2 + 0.4]);
  }
  for (const id of Object.keys(c.zones)) {
    const b = bedOf(c, id);
    if (b) out.push([b.x0 - 0.3, b.x0 + b.w + 0.3, b.y0 - 0.3, b.y0 + b.d + 0.3]);
  }
  for (const p of Object.values(c.map.points)) out.push([p[0] - 0.8, p[0] + 0.8, p[1] - 0.8, p[1] + 0.8]);
  for (const p of c.props) out.push([p.x - p.w / 2 - 0.3, p.x + p.w / 2 + 0.3, p.y - p.d / 2 - 0.3, p.y + p.d / 2 + 0.3]);
  return out;
}

const inside = (boxes: number[][], x: number, y: number) => boxes.some((b) => x >= b[0] && x <= b[1] && y >= b[2] && y <= b[3]);

/** Proof density: chances per 4 x 4 m cell of open ground (drawHeroWorld: ~9 weeds, 3 oil, 2 puddles on 27 x 15 m). */
const CELL = 4;
const P_WEEDS = 0.3;
const P_OIL = 0.13;
const P_OIL_DRIVE = 0.4;
const P_PUDDLE = 0.08;
/** The slab's side (art/ground.draw.ts SLAB): weeds grow out of the joints. */
const SLAB = 3;

/** The yard's statics and ground decals (see the header). Built once per config. */
export function dressing(c: SalvageContent): Dress[] {
  const out: Dress[] = [];
  const W = c.yard.width;
  const D = c.yard.depth;
  const north = northOf(c);
  const seed = (c as { worldSeed?: number }).worldSeed ?? 1;
  const off = keepOff(c);
  const drive = driveBox(c);
  // ---- the back wall: one course of lock blocks across the whole width, floodlights at its foot
  for (let x = BLOCK_M / 2; x < W - 0.01; x += BLOCK_M) out.push({ id: 'plant.block', x, y: north });
  for (let k = 0; k < 4; k++) {
    let x = (W * (k + 0.5)) / 4 + (h01(seed, k, 3) - 0.5) * 4;
    for (let t = 0; t < 6 && inside(off, x, north + 0.55); t++) x += 1.7;
    out.push({ id: 'plant.floodlight', x, y: north + 0.55 });
  }
  // ---- weeds at the wall's foot and the fences
  for (let x = 1.2; x < W - 1; x += 2.3) if (h01(seed, x, 7) < 0.55 && !inside(off, x, north + 0.6)) out.push({ id: 'ground.weeds', x: x + h01(seed, x, 8) * 0.8, y: north + 0.55, frame: Math.floor(h01(seed, x, 9) * 4) });
  for (let y = north + 2; y < D - 0.5; y += 3) {
    if (h01(seed, y, 11) < 0.4 && !inside(off, 0.5, y)) out.push({ id: 'ground.weeds', x: 0.45, y, frame: Math.floor(h01(seed, y, 12) * 4) });
    if (h01(seed, y, 13) < 0.4 && !inside(off, W - 0.5, y) && !(drive && y > drive[2] - 1 && y < drive[3] + 1)) out.push({ id: 'ground.weeds', x: W - 0.45, y, frame: Math.floor(h01(seed, y, 14) * 4) });
  }
  for (let x = 2; x < W - 1; x += 3) if (h01(seed, x, 15) < 0.4 && !inside(off, x, D - 0.5)) out.push({ id: 'ground.weeds', x, y: D - 0.45, frame: Math.floor(h01(seed, x, 16) * 4) });
  // ---- the open ground's wear, 4 x 4 m cells
  for (let cy = north + 1; cy < D - 1; cy += CELL)
    for (let cx = 1; cx < W - 1; cx += CELL) {
      const onDrive = drive !== null && cx + CELL > drive[0] && cx < drive[1] && cy + CELL > drive[2] && cy < drive[3];
      const r = (k: number) => h01(seed, cx, cy, k);
      if (!onDrive && r(1) < P_WEEDS) {
        // at a joint: snap to the slab grid
        const x = Math.round((cx + r(2) * CELL) / SLAB) * SLAB + 0.1;
        const y = Math.round((cy + r(3) * CELL) / SLAB) * SLAB + 0.05;
        if (y > north + 0.8 && !inside(off, x, y)) out.push({ id: 'ground.weeds', x, y, frame: Math.floor(r(4) * 4) });
      }
      if (r(5) < (onDrive ? P_OIL_DRIVE : P_OIL)) {
        const x = cx + 0.7 + r(6) * (CELL - 1.4);
        const y = onDrive && drive ? (drive[2] + drive[3]) / 2 + (r(7) - 0.5) * 1.6 : cy + 0.5 + r(7) * (CELL - 1);
        if (y > north + 1 && !inside(off, x, y)) out.push({ id: 'ground.oil', x, y, frame: Math.floor(r(8) * 3) });
      }
      if (r(9) < P_PUDDLE) {
        const x = cx + 1 + r(10) * (CELL - 2);
        const y = cy + 0.6 + r(11) * (CELL - 1.2);
        if (y > north + 1.2 && !inside(off, x, y)) out.push({ id: 'ground.puddle', x, y, frame: Math.floor(r(12) * 2) });
      }
    }
  // ---- paint: dashed lines along the drive line's edges; the working row's walkway line; hatches at the weighbridge
  if (drive) {
    for (let x = Math.max(1, drive[0]) + 0.75; x < Math.min(W - 1.5, drive[1]); x += 3)
      for (const y of [drive[2] + 0.1, drive[3] - 0.1]) if (!inside(off, x, y)) out.push({ id: 'ground.line.ew', x, y });
  }
  const row = Object.entries(c.map.places).filter(([id, pl]) => c.map.points[id] && pl.solid && c.map.points[id][1] - pl.d / 2 < north + 3);
  if (row.length) {
    const rowY = Math.max(...row.map(([id, pl]) => c.map.points[id][1] + pl.d / 2)) + 1.3;
    const x0 = Math.min(...row.map(([id, pl]) => c.map.points[id][0] - pl.w / 2));
    const x1 = Math.max(...row.map(([id, pl]) => c.map.points[id][0] + pl.w / 2));
    for (let x = x0 + 0.75; x < x1; x += 1.5) if (!inside(off, x, rowY)) out.push({ id: 'ground.line.ew', x, y: rowY });
  }
  for (const [id, pl] of Object.entries(c.map.places)) {
    const p = c.map.points[id];
    if (!p || !/weighbridge/.test(`${id} ${pl.sprite}`)) continue;
    for (let x = p[0] - pl.w / 2 + 0.75; x < p[0] + pl.w / 2; x += 1.5) {
      out.push({ id: 'ground.hatch', x, y: p[1] - pl.d / 2 - 0.3 });
      out.push({ id: 'ground.hatch', x, y: p[1] + pl.d / 2 + 0.3 });
    }
  }
  // ---- weeds at the beds' edges: old stock has stood a while
  for (const id of bedZones(c)) {
    const b = bedOf(c, id)!;
    for (let k = 0; k < 4; k++) {
      const x = b.x0 + h01(seed, k, b.x0, 21) * b.w;
      const y = b.y0 + b.d + 0.15;
      out.push({ id: 'ground.weeds', x, y, frame: k % 4 });
    }
  }
  return out;
}

/** Old stock left in each bed zone, 0..1: the frame's things whose uid is `${zone}.` over the zone's count. */
export function bedShares(c: SalvageContent, things: readonly { uid: string }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of bedZones(c)) {
    const total = Object.values(c.zones[id].things ?? {}).reduce((a, n) => a + (n as number), 0);
    const left = things.reduce((a, t) => a + (t.uid.startsWith(`${id}.`) ? 1 : 0), 0);
    out[id] = total > 0 ? Math.max(0, Math.min(1, left / total)) : 0;
  }
  return out;
}

/** The side of a bed against a wall or a fence: 'n', 'e', 's' or 'w' (the nearest). */
export function wallSide(c: SalvageContent, b: Bed): 'n' | 'e' | 's' | 'w' {
  const north = northOf(c);
  const d = { n: b.y0 - north, e: c.yard.width - (b.x0 + b.w), s: c.yard.depth - (b.y0 + b.d), w: b.x0 };
  return (Object.entries(d) as ['n' | 'e' | 's' | 'w', number][]).sort((a, z) => a[1] - z[1])[0][0];
}

/**
 * A zone's bed as ground.bed tiles (sheet G): full at share 1, shrinking towards its wall side as the
 * stock is worked (the open side first), a worked-out patch against the wall at share 0. Two looks per
 * zone tier, chosen by the tile's place.
 */
export function bedDress(c: SalvageContent, zone: string, share = 1): Dress[] {
  const b = bedOf(c, zone);
  if (!b) return [];
  const tier = Math.max(1, Math.min(3, c.zones[zone]?.tier ?? 1));
  const nx = Math.max(1, Math.round(b.w / BED_CELL[0]));
  const ny = Math.max(1, Math.round(b.d / BED_CELL[1]));
  const side = wallSide(c, b);
  const cells: { x: number; y: number; rank: number; look: number }[] = [];
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const x = b.x0 + ((i + 0.5) * b.w) / nx;
      const y = b.y0 + ((j + 0.5) * b.d) / ny;
      const fromWall = side === 'n' ? y - b.y0 : side === 's' ? b.y0 + b.d - y : side === 'w' ? x - b.x0 : b.x0 + b.w - x;
      const span = side === 'n' || side === 's' ? b.d : b.w;
      cells.push({ x, y, rank: fromWall / span + h01(i, j, b.x0, 31) * 0.35, look: h01(i, j, b.y0, 32) < 0.5 ? 0 : 1 });
    }
  cells.sort((a, z) => a.rank - z.rank);
  const s = Math.max(0, Math.min(1, share));
  const full = s >= 1 ? cells.length : Math.ceil(s * cells.length);
  const worn = s >= 1 ? 0 : Math.max(Math.ceil(cells.length * 0.3) - full, Math.min(2, cells.length - full));
  const out: Dress[] = [];
  // north first, so a tile's loose pieces overlap the one behind it
  const shown = cells.slice(0, full + worn).map((cell, k) => ({ ...cell, low: k >= full }));
  shown.sort((a, z) => a.y - z.y || a.x - z.x);
  for (const cell of shown) out.push({ id: 'ground.bed', x: cell.x, y: cell.y, frame: (tier - 1) * 2 + cell.look, flat: true, ...(cell.low ? { alpha: 0.4 } : {}) });
  return out;
}

/** Every bed at its share (all full when `shares` is not given). */
export function bedsDress(c: SalvageContent, shares?: Record<string, number>): Dress[] {
  return bedZones(c).flatMap((id) => bedDress(c, id, shares ? (shares[id] ?? 1) : 1));
}
