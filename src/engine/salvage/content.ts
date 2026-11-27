/**
 * Reading the content for the rules (yard-stage1.md 2.4, 2.12, 2.17): the pieces of a thing, cut times,
 * values per kilogram, tools, carriers, distances. Pure functions of content (and the state where named).
 * Owner: rules-sim. No number is written here: every one comes from content.
 */
import type { PlateDef, SalvageContent } from '../../config/schema.salvage';
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

/**
 * The tool tier the thing's NEXT piece needs (finding W9: content `pieceTiers`, else the object's tier);
 * a stripped shell (weighed in, waiting for the merchant) is never workable (Infinity).
 */
export function tierOf(c: SalvageContent, th: { obj: string; cut: number; shell?: true }): number {
  if (th.shell) return Infinity;
  const o = c.objects[th.obj];
  if (!o) return Infinity;
  const sp = pieceSpec(c, th.obj, th.cut);
  return (sp && o.pieceTiers?.[sp.spec]) ?? o.tier;
}

/** Grams still in a thing that has `cut` pieces off (its remaining pieces, its shell while a piece is left, and its waste). */
export function thingRemaining_g(c: SalvageContent, obj: string, cut: number): number {
  const n = pieceCount(c, obj);
  const sh = c.objects[obj]?.shell;
  if (sh && cut >= n) return 0; // the shell and the waste went at the shell's weigh-in
  let g = (c.objects[obj]?.waste_g ?? 0) + (sh?.g ?? 0);
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

/**
 * The driver's level factor (ECONOMY.md E31a): 1 + lev × (L − 1). It shortens his WHOLE round: the drive
 * (speed × F) and the walk to the truck, the hooking, the weigh-in and the tipping (time ÷ F).
 */
export function driverRoundF(c: SalvageContent, level: number): number {
  return 1 + c.crew.driver.lev * Math.max(0, level - 1);
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
// engine3: the same sum in the same order (for..in on a plain record visits its own keys in Object.values' order), without the copied array.
export const sumStock = (st: Record<string, number>): number => {
  let a = 0;
  for (const k in st) a += st[k];
  return a;
};

/** A machine's place on the map (both strippers share the stripper pad). */
export function machinePlace(id: MachineId): string {
  return id === 'hand_stripper' ? 'stripper' : id;
}

// ============================================================================================ stage 2: the plates (rules-works)

/** A works plate's content (`works.plates.<id>`), or undefined (not a plate of this content). */
export function plateDef(c: SalvageContent, id: string): PlateDef | undefined {
  return c.works?.plates[id];
}

/** The input key a piece goes into a plate as (2.5.3): its whole thing's object when the plate takes that object, else its grade when the plate takes it, else null. */
export function plateKey(d: PlateDef, p: Pick<Piece, 'grade' | 'whole'>): string | null {
  if (p.whole && d.in.includes(p.whole)) return p.whole;
  return d.in.includes(p.grade) ? p.grade : null;
}

/**
 * A plate's out shares for one input (2.5.3, E7: per input): grades and `stream` (the line's conveyor), in
 * the content's order; `carrier` entries and anything else are waste (the rest of the input's mass, with its
 * reagents). Memoised per content.
 */
const PLATE_OUT = new WeakMap<SalvageContent, Map<string, readonly (readonly [string, number])[]>>();
export function plateOut(c: SalvageContent, plate: string, input: string): readonly (readonly [string, number])[] {
  let m = PLATE_OUT.get(c);
  if (!m) PLATE_OUT.set(c, (m = new Map()));
  const k = `${plate}|${input}`;
  let v = m.get(k);
  if (!v) {
    const d = plateDef(c, plate);
    v = (d?.out[input] ?? []).filter(([to]) => to !== 'carrier' && (to === 'stream' || !!c.grades[to])).map(([to, sh]) => [to, sh] as const);
    m.set(k, v);
  }
  return v;
}

/** The analyser's grade of a piece spec (2.5.2): the 5th element of `[grade, g, n, sprite, assay]`, by (grade, spec index, grams), only where every object with that key agrees. Memoised per content. */
const ASSAY = new WeakMap<SalvageContent, Map<string, string | null>>();
export function assayOf(c: SalvageContent, p: Pick<Piece, 'grade' | 'spec' | 'g' | 'whole'>): string | null {
  if (p.whole || p.spec < 0) return null;
  let m = ASSAY.get(c);
  if (!m) {
    m = new Map();
    for (const o of Object.values(c.objects)) {
      (o.pieces as readonly (readonly unknown[])[]).forEach((sp, i) => {
        const k = `${sp[0] as string}|${i}|${sp[1] as number}`;
        const a = typeof sp[4] === 'string' && c.grades[sp[4]] ? (sp[4] as string) : null;
        if (!m!.has(k)) m!.set(k, a);
        else if (m!.get(k) !== a) m!.set(k, null);
      });
    }
    ASSAY.set(c, m);
  }
  return m.get(`${p.grade}|${p.spec}|${p.g}`) ?? null;
}

/**
 * owner1 (RULING-owner1): the review's rules (the yard hands' H1 to H5, the goal's steps T2, the trip's paths V1 to V4)
 * run on a content that carries `crew.hand.leaveM` (the shipped content). A frozen test content without it keeps the
 * first yard's rules bit for bit, as `crew.orderFromRung` does.
 */
export function owner1Rules(c: SalvageContent): boolean {
  return typeof (c.crew.hand as { leaveM?: unknown }).leaveM === 'number';
}
