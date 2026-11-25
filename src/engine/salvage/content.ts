/**
 * Reading the content for the rules (yard-stage1.md 2.4, 2.12, 2.17): the pieces of a thing, cut times,
 * values per kilogram, tools, carriers, distances. Pure functions of content (and the state where named).
 * Owner: rules-sim. No number is written here: every one comes from content.
 */
import type { SalvageContent } from '../../config/schema.salvage';
import { boardX, priceOf } from './board';
import { pieceAt, specIndex } from './frame';
import { pointOf } from './positions';
import type { MachineId, Piece, SalvageState } from './types';

export type Spec = readonly [string, number, number, ...unknown[]];

/** The object's piece specs ([grade, g, n, sprite?]). */
export function specsOf(c: SalvageContent, obj: string): readonly Spec[] {
  return (c.objects[obj]?.pieces ?? []) as unknown as readonly Spec[];
}

/** How many pieces an object comes apart into. */
export function pieceCount(c: SalvageContent, obj: string): number {
  return specsOf(c, obj).reduce((a, sp) => a + sp[2], 0);
}

/** The k-th piece's spec (cut order) and its index, or null past the last. */
export function pieceSpec(c: SalvageContent, obj: string, k: number): { grade: string; g: number; spec: number } | null {
  const specs = specsOf(c, obj);
  const sp = pieceAt(specs, k);
  if (!sp) return null;
  return { grade: sp[0], g: sp[1], spec: specIndex(specs, k) };
}

/** Grams still in a thing that has `cut` pieces off (its remaining pieces and its waste). */
export function thingRemaining_g(c: SalvageContent, obj: string, cut: number): number {
  const n = pieceCount(c, obj);
  let g = c.objects[obj]?.waste_g ?? 0;
  for (let k = cut; k < n; k++) g += pieceSpec(c, obj, k)?.g ?? 0;
  return g;
}

/** The cut time of one piece (2.4): t = max(cut.minS, kg × h / P). */
export function cutTime(c: SalvageContent, obj: string, g: number, P: number): number {
  const h = c.objects[obj]?.h ?? 1;
  return Math.max(c.cut.minS, ((g / 1000) * h) / Math.max(1e-9, P));
}

/** The best tool's power P (kg/s at hardness 1) for a tier (the highest tier owned at most `tier`). */
export function toolP(c: SalvageContent, tier: number): number {
  let best = 0;
  let bt = -1;
  for (const t of Object.values(c.tools)) if (t.tier <= tier && t.tier > bt) {
    bt = t.tier;
    best = t.P;
  }
  return best || Math.min(...Object.values(c.tools).map((t) => t.P));
}

/** The tool key of a tier (the work animation's and workStart's `tool`). */
export function toolKey(c: SalvageContent, tier: number): string {
  let key = Object.keys(c.tools)[0] ?? 'spanners';
  let bt = -1;
  for (const [k, t] of Object.entries(c.tools)) if (t.tier <= tier && t.tier > bt) {
    bt = t.tier;
    key = k;
  }
  return key;
}

/** The boss's carrier capacity, grams. */
export function carrierCap_g(c: SalvageContent, s: SalvageState): number {
  return (c.carriers[s.carrier] ?? Object.values(c.carriers)[0] ?? 0) * 1000;
}

/**
 * A grade's usual value per kilogram for choosing (S9, R7): p̄, cable at the copper it holds (never the
 * day's price), the converter at its assay.
 */
export function vpk(c: SalvageContent, grade: string): number {
  const gr = c.grades[grade];
  if (!gr) return 0;
  if (grade === 'cab' || grade === 'tcab') {
    const cu = (c.grades.bb?.pbar ?? 0) * (1 - c.cable.tinned) + (c.grades.no2?.pbar ?? 0) * c.cable.tinned;
    return grade === 'tcab' ? gr.pbar : Math.max(gr.pbar, cu * c.cable.yield_);
  }
  if (gr.family === 'pm') return convPaid(c, 0, false) / Math.max(1e-9, (c.wholeUnits_kg[grade] ?? 1));
  return gr.pbar;
}

/** A piece's value for choosing: its grade's vpk × kg. */
export function pieceValue(c: SalvageContent, p: Pick<Piece, 'grade' | 'g'>): number {
  return vpk(c, p.grade) * (p.g / 1000);
}

/** Best first (S9): highest value per kilogram, ties heavier first, then uid (deterministic). */
export function byValue(c: SalvageContent) {
  return (a: Pick<Piece, 'grade' | 'g' | 'uid'>, b: Pick<Piece, 'grade' | 'g' | 'uid'>) => vpk(c, b.grade) - vpk(c, a.grade) || b.g - a.g || (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0);
}

/**
 * The converter's assay at a price step (2.4, whole-game 4.3, E21): Σ metal grams × § a gram × payable,
 * the metals' prices × `step`, less the ceramic and assay fees; § for ONE converter. Content `paid` is the
 * prototype's figure for the record only: the rules pay from the payables.
 */
export function convAssay(c: SalvageContent, step = 1): number {
  const v = c.converter;
  const metal = (v.pt_g * v.pt * v.pay_pt + v.pd_g * v.pd * v.pay_pd + v.rh_g * v.rh * v.pay_rh) * step;
  return Math.round(Math.max(0, metal - v.ceramic_kg * v.ceramic_fee - v.assay_fee) * 100) / 100;
}

/** The converter's payment on assay for one unit on market day D: the metals step by the pm family's x (the lead: pm for the daily step only). */
export function convPaid(c: SalvageContent, day: number, stepped = true): number {
  return convAssay(c, 1 + (stepped ? boardX(c, 'pm', day) : 0));
}

/** The price a lot pays a kilogram on day D (2.12): the posted price; the converter its assay per unit's kg. */
export function lotPrice(c: SalvageContent, grade: string, day: number): number {
  if (c.grades[grade]?.family === 'pm') return Math.round((convPaid(c, day) / (c.wholeUnits_kg[grade] ?? 1)) * 100) / 100;
  return priceOf(c, grade, day);
}

/** A leg's distance (2.12): `map.routes["a-b"]` (either order), else detour × straight. */
export function routeM(c: SalvageContent, a: string, b: string, pa?: { x: number; y: number }, pb?: { x: number; y: number }): number {
  const r = c.map.routes[`${a}-${b}`] ?? c.map.routes[`${b}-${a}`];
  if (r !== undefined) return r;
  const A = pa ?? pointOf(c, a);
  const B = pb ?? pointOf(c, b);
  return c.map.detour * Math.hypot(A.x - B.x, A.y - B.y);
}

/** Straight-line distance × detour between two points. */
export function legM(c: SalvageContent, a: { x: number; y: number }, b: { x: number; y: number }): number {
  return c.map.detour * Math.hypot(a.x - b.x, a.y - b.y);
}

/** The lane's length for a partner, metres one way from the gate. */
export function laneM(c: SalvageContent, partner: string): number {
  return c.map.lane[c.partners[partner]?.lane ?? ''] ?? 0;
}

/** The grades a machine accepts into its hopper. */
export function machineInputs(c: SalvageContent, s: SalvageState, id: MachineId): string[] {
  if (id === 'hand_stripper' || id === 'stripper') return ['cab'].filter((g) => !!c.grades[g]);
  if (id === 'bench') return ['mot'].filter((g) => !!c.grades[g]);
  const rec = c.machines.crucible.recipes[s.machines.crucible.recipe];
  if (!rec) return [];
  return Array.isArray(rec[0]) ? [...rec[0]] : [rec[0] as string];
}

/** A machine's output shares by grade for an input grade, the rest waste (2.5, 2.12). */
export function machineShares(c: SalvageContent, id: MachineId, input: string): [string, number][] {
  if (id === 'hand_stripper' || id === 'stripper') {
    void input;
    const y = c.cable.yield_;
    return [
      ['bb', y * (1 - c.cable.tinned)],
      ['no2', y * c.cable.tinned],
    ];
  }
  if (id === 'bench') return c.machines.bench.out.map(([g, sh]) => [g, sh] as [string, number]);
  return [];
}

/** Grams of a stock record. */
export const sumStock = (st: Record<string, number>): number => Object.values(st).reduce((a, x) => a + x, 0);

/** A machine's place on the map (both strippers share the stripper pad). */
export function machinePlace(id: MachineId): string {
  return id === 'hand_stripper' ? 'stripper' : id;
}
