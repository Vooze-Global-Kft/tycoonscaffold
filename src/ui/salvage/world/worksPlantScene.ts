/**
 * THE WORKS' PLANT IN THE RULES' PICTURE (PLAN2 2.8; a stub of C-WORLD-1, filled by WLD-PLANT / WLD-HALLS): the halls, their
 * furnaces, glow, streams, moulds and charge boxes, the shredder line, the depollution bay with its car, the bunkers, the
 * stillages and their layers, the plots by WorksLook, the analyser's cradle, the pad and the picking table, as atlas items
 * (actors.ts ITEM layout; ./worksTable.ts worksSprite appends one).
 *
 * The contract: `plantItems(c, f, res)` returns the items of the works' plant for one frame; called by ./worksScene.ts only,
 * and only from the works' opening (the frame carries `works`). Pure, deterministic, from the frame's facts only (the
 * screen decides nothing: lesson 13). Keep the returned array the SAME object while its inputs are the same (the scene's
 * list is compared by content before every push: owner1 phone 2).
 *
 * WLD-HALLS (batch 1a, the thin slice): THE THREE HALLS, from FrameWorks.look and FrameWorks.heat (./worksTable.ts
 * hallFrames decides each layer's frame). Per standing hall, in this order of sort keys (ART-HALLS' and ART-HALLPARTS'
 * notes and the errata):
 *   the bag-house filter at '<hall>.filter' (still / shimmer while it heats or pours);
 *   the covered slag vessel by the hall's south-west corner, west of the shed (static dressing: no state carries a fill);
 *   the furnace at '<hall>.apron' + halls.draw.ts HALL_POUR.furnace (cold / hot / tilted);
 *   the glow at the furnace's anchor, its key a hair AFTER the furnace's (equal footprints: ordered on purpose, never left
 *     to the sort), alternating glow1 / glow2;
 *   the charge box inside the shed's open south side by its east column (empty / part / full of the charge's share);
 *   the shed at '<hall>' (its key the south wall: after everything inside it);
 *   the moulds on the apron, shifted so that one cavity lies under the stream's drop (HALL_POUR.pour, the south row), the
 *     empty mould untinted and, while the pour's ingots lie in it, the ingots frame (shimmer while cooling, full once cold)
 *     at the SAME anchor a hair after it, tinted by palette.ts coolingColour of the ingots' metal;
 *   the stream at the apron's point (its frames carry the hall's own furnace hand), stream1 / stream2 alternating, after
 *     the moulds.
 * Positions are the content's (map.works footprints) plus the art's own placement constants (named below; the art's
 * footprints for the sizes). Nothing is drawn for a hall that does not stand yet (padlock, buyable, arriving: the plot's,
 * WLD-PLANT) or that the content does not sell (frameWorks lists only sold or owned plates). The shed is a RULES item:
 * see-through under it needs actors.ts roofTable to find it (it matches statics only): a [seam] (notes/WLD-HALLS.md).
 */
import type { SalvageContent } from '../../../config/schema.salvage';
import type * as R from '../../../engine/salvage';
import { HALL_POUR } from '../art/halls.draw';
import { mouldCavities } from '../art/hallParts.draw';
import { coolingColour } from '../art/palette';
import { hallFrames, isHall, metalOfGrade, worksEntryOf, worksSprite, INGOT_COOL_S, W_ITEM, type HallPlate, type WorksResolver } from './worksTable';

const NONE: number[] = [];

/** Sort-key steps that order layers sharing one footprint (the glow after the furnace, the ingots after their mould). */
export const KEY_EPS = 1e-3;
/** Seconds a frame of the glow and of the stream holds before it alternates (frameLoop.ts's `alt` / `period`). */
export const GLOW_PERIOD_S = 0.35;
export const STREAM_PERIOD_S = 0.12;
/** The art's placement inside a hall (metres): the charge box stands this far in from the east wall and from the open south side. */
export const CHARGE_IN_M = 0.4;
export const DOOR_IN_M = 0.25;
/** The slag vessel stands this far west of the shed's west wall and in from its south side. */
export const SLAG_OUT_M = 0.2;
export const SLAG_IN_M = 0.1;

type Rect = { x: number; y: number; w: number; d: number };
type MapWorksLike = { footprints?: Record<string, Rect>; points?: Record<string, [number, number]> };

/** A works place's footprint from the content (map.works.footprints, else the first layer's), or null. */
function rectOf(c: SalvageContent, id: string): Rect | null {
  const mw = (c.map as { works?: MapWorksLike }).works;
  const r = mw?.footprints?.[id] ?? (c.map as { footprints?: Record<string, Rect> }).footprints?.[id];
  return r ? { x: r.x, y: r.y, w: r.w, d: r.d } : null;
}

const CAVITY = new Map<HallPlate, { dx: number; dy: number }>();
/** How far the mould row's anchor stands from the apron's point so a cavity of its south row lies under the drop. */
export function mouldShift(h: HallPlate): { dx: number; dy: number } {
  let s = CAVITY.get(h);
  if (s) return s;
  const pour = HALL_POUR[h].pour;
  let best = { x: 0, y: 0 };
  let bd = Infinity;
  for (const cv of mouldCavities(h)) {
    const d = Math.abs(cv.x - pour) + (cv.y > 0 ? 0 : 1e-6);
    if (d < bd - 1e-9) {
      bd = d;
      best = cv;
    }
  }
  s = { dx: pour - best.x, dy: -best.y };
  CAVITY.set(h, s);
  return s;
}

/** 0xRRGGBB of a '#rrggbb' colour (the item's tint). */
const tintOf = (hex: string): number => parseInt(hex.slice(1, 7), 16);

/** The items of one hall (nothing when it does not stand or its places are missing from the content). */
export function hallItems(out: number[], c: SalvageContent, w: R.FrameWorks, t: number, res: WorksResolver): void {
  const h = w.plate;
  if (!isHall(h)) return;
  const fr = hallFrames(w.look, w.heat, t);
  if (!fr) return;
  const hall = rectOf(c, h);
  const apron = rectOf(c, `${h}.apron`);
  if (!hall || !apron) return;
  const south = hall.y + hall.d / 2;
  const id = (layer: string) => `works.hall.${h}.${layer}`;
  // the filter (the hall's bag-house, its own place)
  const filter = rectOf(c, `${h}.filter`);
  if (filter) worksSprite(out, res, id('filter'), filter.x, filter.y, { frame: fr.filter });
  // the slag vessel west of the shed by its south-west corner
  const slag = worksEntryOf(`works.slagSkip.${h}`);
  if (slag) worksSprite(out, res, slag.id, hall.x - hall.w / 2 - SLAG_OUT_M - slag.footprint.w / 2, south - SLAG_IN_M - slag.footprint.d / 2);
  // the furnace and its glow (one anchor; the glow ordered after it)
  const L = HALL_POUR[h];
  const fx = apron.x + L.furnace[0];
  const fy = apron.y + L.furnace[1];
  const fe = worksEntryOf(id('furnace'));
  const fKey = fy + (fe ? fe.footprint.d / 2 : 0);
  worksSprite(out, res, id('furnace'), fx, fy, { frame: fr.furnace, key: fKey });
  if (fr.glow) worksSprite(out, res, id('glow'), fx, fy, { frame: 0, key: fKey + KEY_EPS, alt: res(id('glow'), 1, 0), period: GLOW_PERIOD_S });
  // the charge box inside the open south side, by the east column
  const ce = worksEntryOf(id('charge'));
  if (ce) worksSprite(out, res, ce.id, hall.x + hall.w / 2 - CHARGE_IN_M - ce.footprint.w / 2, south - DOOR_IN_M - ce.footprint.d / 2, { frame: fr.charge });
  // the shed (its south wall's key: after everything inside it)
  worksSprite(out, res, id('shed'), hall.x, hall.y, { key: south });
  // the moulds (two layers at one anchor) and the stream after them
  const sh = mouldShift(h);
  const mx = apron.x + sh.dx;
  const my = apron.y + sh.dy;
  const me = worksEntryOf(id('moulds'));
  const mKey = my + (me ? me.footprint.d / 2 : 0);
  worksSprite(out, res, id('moulds'), mx, my, { frame: 0, key: mKey });
  if (fr.ingots) {
    const metal = metalOfGrade(c, fr.ingots.grade);
    // the step's middle (cooling) or the metal's own colour (cold)
    const tint = tintOf(coolingColour(metal, fr.ingots.secs >= INGOT_COOL_S ? INGOT_COOL_S : fr.ingots.secs + 0.25));
    worksSprite(out, res, id('moulds'), mx, my, { frame: fr.ingots.frame, key: mKey + KEY_EPS, tint });
  }
  if (fr.stream) {
    const se = worksEntryOf(id('stream'));
    const sKey = Math.max(apron.y + (se ? se.footprint.d / 2 : 0), mKey + 2 * KEY_EPS);
    worksSprite(out, res, id('stream'), apron.x, apron.y, { frame: 0, key: sKey, alt: res(id('stream'), 1, 0), period: STREAM_PERIOD_S });
  }
}

const sameNums = (a: readonly number[], b: readonly number[]) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i] && !(Number.isNaN(a[i]) && Number.isNaN(b[i]))) return false;
  return true;
};
const LAST = new WeakMap<SalvageContent, number[]>();

/** The works' plant items for a frame: the halls (WLD-HALLS); the rest of the plant is WLD-PLANT's. */
export function plantItems(c: SalvageContent, f: R.FrameTable, res: WorksResolver): number[] {
  const ws = f.works;
  if (!ws || ws.length === 0) return NONE;
  const out: number[] = [];
  for (const w of ws) hallItems(out, c, w, f.t, res);
  if (out.length === 0) return NONE;
  const last = LAST.get(c);
  if (last && sameNums(last, out)) return last;
  LAST.set(c, out);
  return out;
}

/** The ids an item list names (tests, the walker: every requested id must resolve). Items of W_ITEM numbers. */
export const itemCount = (items: readonly number[]): number => items.length / W_ITEM;
