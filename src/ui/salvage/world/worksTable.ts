/**
 * THE WORKS' ONE TABLE (PLAN2 2.8, C-WORLD-1; s2c-plan-world.md 4 "Wave 1": "the ONE table: PlateId x WorksLook x heat
 * phase -> entry and frame; bay kinds -> entries; lot kinds; vehicle kinds and their loads"). Pure (no React, no Skia):
 * the tests and the cost harness read it under node.
 *
 * What is here from C-WORLD-1 (the hooks; later packages fill the rest, each its own rows):
 * - the works' manifest by id (`worksEntryOf`): sheets C and D (art/manifest WORKS_MANIFEST); actors.ts's resolver reads it
 *   beside the first yard's MANIFEST;
 * - WHICH ENTRIES ARE BAKED (`worksBakeList`): only the entries of what the content SELLS (rule 5, "nothing dark is drawn"):
 *   a plate's hall, plot, crate and slag skip only when its plate is sold, the shredder line's parts only when the line is
 *   sold, the hook-lift's body only when its shop key is sold, the plasma's pose and rack only when the plasma is sold;
 *   every other works entry (the store, the Yard sale, the lots, the lorries, visitors, the lane's sites, the small things)
 *   whenever the content has a works layer;
 * - the works' ROOFS (`worksRoofSpots`): where the roofed and canopied works sprites stand (the halls' sheds at their plots,
 *   the content's map.works.roofs rects), for actors.ts roofTable (owner1 play 1, "a player always sees himself");
 * - the item layout's numbers (W_ITEM, W_L_SORT, W_L_DECAL; equal to actors.ts ITEM, L_SORT, L_DECAL: a test holds them)
 *   and `worksSprite`, which appends one works sprite as an item, for the works' scene files (worksPlantScene.ts,
 *   worksFloorScene.ts) without importing actors.ts (no import cycle with rulesScene).
 *
 * STAND-IN (requests.md [seam] C-WORLD-1 28 Nov): which plates the stage sells is the rules' (src/engine/salvage/frameWorks.ts
 * `soldPlates`), not exported by the facade; `soldPlatesOf` below mirrors it (a works shop item whose gate is within the
 * stage's top rung, R.topRungOf, and the plates that come `with` it) until the facade exports it.
 */
import type { SalvageContent } from '../../../config/schema.salvage';
import * as R from '../../../engine/salvage';
import { WORKS_MANIFEST, type WorksEntry } from '../art/manifest';

/** The item layout (actors.ts ITEM, L_DECAL, L_SORT; worksHooks.test.ts holds them equal). */
export const W_ITEM = 12;
export const W_L_DECAL = 0;
export const W_L_SORT = 2;

const BY_ID = new Map<string, WorksEntry>(WORKS_MANIFEST.map((e) => [e.id, e]));
/** A works entry (sheet C or D) by id, else undefined. */
export const worksEntryOf = (id: string): WorksEntry | undefined => BY_ID.get(id);

/** Every shop item of a content, the works layer's included (the merged view's shop: schema.salvage.ts withWorksLayer). */
function shopAll(c: SalvageContent): readonly { key: string; kind?: string; gate?: string | null }[] {
  return [...c.shop, ...(c.dayOneList ?? []), ...(c.worksLayer?.shop ?? [])];
}
const gateRung = (gate: string | null | undefined) => {
  const m = /^rung(\d+)$/.exec(gate ?? '');
  return m ? Number(m[1]) : 0;
};

const SOLD_PLATES = new WeakMap<SalvageContent, ReadonlySet<string>>();
/** STAND-IN for frameWorks.ts soldPlates (see the head): the plates the stage sells. */
export function soldPlatesOf(c: SalvageContent): ReadonlySet<string> {
  let out = SOLD_PLATES.get(c);
  if (out) return out;
  const ps = (c.works?.plates ?? {}) as Record<string, { with?: readonly string[] }>;
  const top = R.topRungOf(c);
  const items = shopAll(c);
  const sold = new Set<string>();
  for (const id in ps) {
    const it = items.find((i) => i.key === id);
    if (it && it.kind === 'works' && gateRung(it.gate) <= top) {
      sold.add(id);
      for (const q of ps[id].with ?? []) sold.add(q);
    }
  }
  out = sold;
  SOLD_PLATES.set(c, out);
  return out;
}

/** Is a shop key on sale within the stage's top rung (the hook-lift, the plasma)? */
export function soldKey(c: SalvageContent, key: string): boolean {
  const it = shopAll(c).find((i) => i.key === key);
  return !!it && gateRung(it.gate) <= R.topRungOf(c);
}

/** Does the content carry the works at all (a works layer)? */
export const hasWorks = (c: SalvageContent): boolean => !!c.worksLayer && !!c.works;

/** The shredder line's own entries (sold with the plate 'shredder'). */
const LINE_IDS = new Set(['works.shredder.house', 'works.shredder.conveyor', 'works.shredder.stacker', 'works.shredder.residueSkip', 'works.depollution.bay', 'works.car.stage', 'works.batteryBox']);

/**
 * What an entry belongs to: a plate ('plate:<id>'), a shop key ('key:<key>'), or null (the works themselves). The halls',
 * plots', crates' and slag skips' ids carry their plate (works.hall.<plate>.*, works.plot.<plate>.*, works.crate.<plate>,
 * works.slagSkip.<plate>).
 */
export function ownerOf(id: string): string | null {
  const m = /^works\.(?:hall|plot)\.([A-Za-z0-9]+)\./.exec(id) ?? /^works\.(?:crate|slagSkip)\.([A-Za-z0-9]+)$/.exec(id);
  if (m) return `plate:${m[1]}`;
  if (LINE_IDS.has(id)) return 'plate:shredder';
  if (id === 'works.analyser.cradle') return 'plate:analyser';
  if (id.startsWith('vehicle.truckBridge') || id === 'vehicle.skip.load.bridge') return 'key:truckBridge';
  if (id === 'person.boss.plasma' || id === 'works.plasma.rack') return 'key:plasma';
  return null;
}

const BAKE = new WeakMap<SalvageContent, readonly WorksEntry[]>();
/**
 * The works' entries a content's save bakes into sheets C and D: only what the content sells (see the head); none without
 * a works layer. Memoised per content object.
 */
export function worksBakeList(c: SalvageContent): readonly WorksEntry[] {
  let out = BAKE.get(c);
  if (out) return out;
  if (!hasWorks(c)) out = [];
  else {
    const plates = soldPlatesOf(c);
    out = WORKS_MANIFEST.filter((e) => {
      const o = ownerOf(e.id);
      if (o === null) return true;
      if (o.startsWith('plate:')) return plates.has(o.slice(6));
      return soldKey(c, o.slice(4));
    });
  }
  BAKE.set(c, out);
  return out;
}

/** The roofed and canopied works sprites (roofTable's extra list): the halls' sheds and the content's map.works.roofs. */
export const WORKS_ROOF_OF: Readonly<Record<string, string>> = {
  'worksBays.roof': 'works.leanto.roof',
  'worksStillages.roof': 'works.stillages.roof',
  'stillages.roof': 'stillages.roof',
  'reuseRack.canopy': 'works.sale.canopy',
};
const HALL_SHEDS = ['rotary', 'induction', 'copper'] as const;

/** Where a roofed works sprite stands (its anchor: the footprint's centre, the art's convention). */
export interface RoofSpot {
  id: string;
  x: number;
  y: number;
}

const ROOF_SPOTS = new WeakMap<SalvageContent, readonly RoofSpot[]>();
/**
 * The works' roofed sprites and their anchors, from the content only (map.works.points for the halls' plots, map.works.roofs
 * rects' centres). Empty without a works layer. actors.ts roofTable matches each to a drawn static item; one that is not
 * drawn (below the opening, a dark hall) matches nothing and adds no roof.
 */
export function worksRoofSpots(c: SalvageContent): readonly RoofSpot[] {
  let out = ROOF_SPOTS.get(c);
  if (out) return out;
  const list: RoofSpot[] = [];
  const w = hasWorks(c) ? (c.map as { works?: { points?: Record<string, [number, number]>; roofs?: Record<string, { x0: number; y0: number; w: number; d: number }> } }).works : undefined;
  if (w) {
    const plates = soldPlatesOf(c);
    for (const p of HALL_SHEDS) {
      const pt = w.points?.[p];
      if (pt && plates.has(p)) list.push({ id: `works.hall.${p}.shed`, x: pt[0], y: pt[1] });
    }
    for (const [k, r] of Object.entries(w.roofs ?? {})) {
      const id = WORKS_ROOF_OF[k];
      if (id && worksEntryOf(id)) list.push({ id, x: r.x0 + r.w / 2, y: r.y0 + r.d / 2 });
    }
  }
  out = list;
  ROOF_SPOTS.set(c, out);
  return out;
}

/** Resolves (id, frame, heading) to a packed cell, -1 when unbaked (actors.ts Resolver). */
export type WorksResolver = (id: string, frame?: number, heading?: number) => number;

/**
 * Appends one works sprite as an item (actors.ts sprite()'s rule: sorted by its footprint's south edge, its north edge when
 * flat; nothing when the entry is unknown or its cell is not baked).
 */
export function worksSprite(out: number[], res: WorksResolver, id: string, x: number, y: number, o: { frame?: number; heading?: number; flat?: boolean; key?: number; tint?: number; alpha?: number; dx?: number; dy?: number; alt?: number; period?: number } = {}): void {
  const e = worksEntryOf(id);
  if (!e) return;
  const cell = res(id, o.frame ?? 0, o.heading ?? 0);
  if (cell < 0) return;
  const d = e.footprint.d / 2;
  const key = o.key ?? (o.flat ? y - d : y + d);
  out.push(W_L_SORT, key, cell, x, y, o.dx ?? 0, o.dy ?? 0, e.drawScale ?? 1, o.tint ?? -1, o.alpha ?? 1, o.alt ?? -1, o.period ?? 0);
}

// =====================================================================================================================
// WLD-HALLS (PLAN2 batch 1a, the thin slice): THE HALLS' ROWS OF THE TABLE. A hall's look (FrameWorks.look) and its heat
// (FrameWorks.heat, the ONE HeatView the hall's card reads too) -> the frame of each of its layers (ART-HALLS' shed,
// furnace, glow, stream; ART-HALLPARTS' filter, charge box, moulds with their ingots). Pure: decided from the rules' facts
// only (lesson 13), so a layer holds its frame for the whole span the rules hold its phase (the owner's point 3: a look
// never goes A to B to A). Where the layers stand is ./worksPlantScene.ts's.
// =====================================================================================================================

/** The plates that are halls (ART-HALLS' kinds: the entries works.hall.<plate>.*). */
export const HALL_PLATES = ['rotary', 'induction', 'copper'] as const;
export type HallPlate = (typeof HALL_PLATES)[number];
export const isHall = (p: string): p is HallPlate => (HALL_PLATES as readonly string[]).includes(p);

/** The furnace's frames (worksHalls.ts: cold, hot with the lid shut, tilted), the filter's, the charge box's, the moulds'. */
export const FURNACE_COLD = 0;
export const FURNACE_HOT = 1;
export const FURNACE_TILTED = 2;
export const FILTER_STILL = 0;
export const FILTER_SHIMMER = 1;
export const CHARGE_EMPTY = 0;
export const CHARGE_PART = 1;
export const CHARGE_FULL = 2;
export const MOULD_EMPTY = 0;
export const MOULD_FULL = 1;
export const MOULD_SHIMMER = 2;
/** Seconds a fresh ingot takes from the pour's heat to its metal's own colour (art/palette.ts coolingColour: t / 3). */
export const INGOT_COOL_S = 3;
/** The ingots' tint steps a second while they cool (a tint changes only at a step: a few scene pushes per pour, not 60). */
export const INGOT_TINT_STEPS = 2;

/** The looks before a hall stands on its plot (the plot's: WLD-PLANT draws the pad, the price tag, the crates). */
const NOT_STANDING: ReadonlySet<R.WorksLook> = new Set<R.WorksLook>(['padlock', 'buyable', 'arriving']);

/** What a hall's layers show in one frame of the rules (null: the hall does not stand yet). */
export interface HallFrames {
  furnace: number;
  /** The glow over the furnace (alternating its two frames) while the furnace is hot or pours. */
  glow: boolean;
  /** The pour stream (with the hall's own furnace hand in its frames). */
  stream: boolean;
  filter: number;
  charge: number;
  /** The ingots laid over the empty moulds while the pour's ingots lie in them: the frame and the yard seconds since the pour (stepped). */
  ingots: { frame: number; grade: string; secs: number } | null;
}

/**
 * A hall's layers for its look and heat at yard second t. Without a heat (installed, not yet started: no batch running)
 * the hall stands cold and empty. The phases (heatView.ts): empty and filling cold (the charge box fills by the charge's
 * share), heating hot with the glow and the filter's shimmer, ready hot with the glow (the filter still: nothing is
 * drawn off while it waits), pour tilted with the glow, the stream, the filter's shimmer and the fresh ingots (the
 * rules' cooling record, HeatView.ingots; its `n` is 0 because a hall pours into its bays, so the moulds show the
 * pour's ingots for the picture's pour only, never a count), cooling cold.
 */
export function hallFrames(look: R.WorksLook, heat: R.HeatView | undefined, t: number): HallFrames | null {
  if (NOT_STANDING.has(look)) return null;
  const cold: HallFrames = { furnace: FURNACE_COLD, glow: false, stream: false, filter: FILTER_STILL, charge: CHARGE_EMPTY, ingots: null };
  if (!heat) return cold;
  switch (heat.phase) {
    case 'filling': {
      const share = heat.cap_g > 0 ? heat.charge_g / heat.cap_g : 0;
      return { ...cold, charge: share <= 1e-9 ? CHARGE_EMPTY : share >= 1 - 1e-9 ? CHARGE_FULL : CHARGE_PART };
    }
    case 'heating':
      return { ...cold, furnace: FURNACE_HOT, glow: true, filter: FILTER_SHIMMER };
    case 'ready':
      return { ...cold, furnace: FURNACE_HOT, glow: true };
    case 'pour': {
      let ingots: HallFrames['ingots'] = null;
      if (heat.ingots) {
        const since = Math.max(0, t - (heat.ingots.span?.t0 ?? t));
        const secs = Math.floor(since * INGOT_TINT_STEPS + 1e-9) / INGOT_TINT_STEPS;
        ingots = { frame: secs < INGOT_COOL_S ? MOULD_SHIMMER : MOULD_FULL, grade: heat.ingots.grade, secs: Math.min(secs, INGOT_COOL_S) };
      }
      return { furnace: FURNACE_TILTED, glow: true, stream: true, filter: FILTER_SHIMMER, charge: CHARGE_EMPTY, ingots };
    }
    default:
      return cold;
  }
}

/** The art palette's metal (art/palette.ts METAL) of a grade's material (the content's grades.<id>.material). */
export function metalOfGrade(c: SalvageContent, grade: string): string {
  const g = (c.grades as Record<string, { material?: string } | undefined>)[grade] ?? (c.worksLayer?.grades as Record<string, { material?: string } | undefined> | undefined)?.[grade];
  const m = g?.material ?? 'brass';
  return m === 'alu' ? 'aluminium' : m;
}
