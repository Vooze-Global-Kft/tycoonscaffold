/**
 * THE WORKS' PART OF A LAYOUT-3 SAVE repaired (stage 2, yard-stage2.md 2.18, 2.20): plates, routes, lots, the
 * Yard sale, the forklift. Owner: rules-works (Phase B adds: plates of the content only, levels within the
 * plate's top, hopper grades known; save.ts already drops unknown plates and clamps levels). state2.ts
 * `repairStage2` dispatches here and to state2Money.ts (s2a-fix, the lead's ruling of 26 Nov 09:50).
 * Every dated field is clamped to the save's clock t (dueOrNull): the loop never applies a date before it.
 */
import type { CraneMove, ForkliftState, HeatState, LotsState, ReuseState, SalvageState, WorksState } from './types';
import type { Stage2Fields } from './state2';
import { arr, dueOrNull, fin, isStock, num, obj, money, stock, str, strs, whole } from './state2Read';

/** At most this many plates (bounded state). */
const MAX_PLATES = 64;

function heatOf(v: unknown, t: number): HeatState | undefined {
  const h = obj(v);
  const phases = ['empty', 'filling', 'heating', 'ready', 'pouring', 'cooling'];
  if (!str(h.recipe) || !phases.includes(h.phase as string) || !fin(h.phaseSince) || !fin(h.lastFeedAt)) return undefined;
  const c = h.cooling === null || h.cooling === undefined ? null : obj(h.cooling);
  return {
    recipe: h.recipe,
    fromBays: h.fromBays !== false,
    charge_g: whole(h.charge_g),
    ...(isStock(h.chargeBy) && h.chargeBy ? { chargeBy: stock(h.chargeBy) } : {}),
    heel_g: whole(h.heel_g),
    phase: h.phase as HeatState['phase'],
    phaseSince: h.phaseSince,
    endsAt: dueOrNull(h.endsAt, t),
    lastFeedAt: h.lastFeedAt,
    firstPoured: !!h.firstPoured,
    cooling: c && str(c.grade) ? ({ ...(c as object), grade: c.grade, n: whole(c.n), short_g: whole(c.short_g) } as HeatState['cooling']) : null,
  };
}

function moveOf(v: unknown, t: number): CraneMove | null {
  const m = obj(v);
  if (!fin(m.t0) || !fin(m.end) || m.end < m.t0 || !str(m.from) || !str(m.to)) return null;
  const planned = arr(m.planned)
    .map(obj)
    .filter((p) => fin(p.end))
    .slice(0, 64)
    .map((p) => ({ items: strs(p.items, 64), g: whole(p.g), end: p.end as number }));
  return { items: strs(m.items, 64), g: whole(m.g), from: m.from, to: m.to, t0: m.t0, end: Math.max(m.end, t), ...(planned.length ? { planned } : {}) };
}

/**
 * A saved plate, kept when well formed (its machine part as save.ts keeps a machine's: hopper pieces
 * with a grade and grams, tray grams), else dropped. Phase B (rules-works) adds: unknown plates of the
 * content dropped, levels within `works.maxLevel`, hopper grades known.
 */
function worksOf(id: string, v: unknown, t: number): WorksState | null {
  const w = obj(v);
  const phases = ['arriving', 'installed', 'running'];
  if (!phases.includes(w.phase as string) || typeof w.owned !== 'boolean') return null;
  const hopper = arr(w.hopper).filter((p) => str(obj(p).grade) && whole(obj(p).g) > 0 && str(obj(p).uid, 128)) as WorksState['hopper'];
  const out: WorksState = {
    ...(w as unknown as WorksState),
    plate: id,
    phase: w.phase as WorksState['phase'],
    level: Math.max(w.owned ? 1 : 0, Math.min(99, whole(w.level))),
    hopper,
    tray_g: stock(w.tray_g),
    trayClaim_g: stock(w.trayClaim_g),
    since: num(w.since),
    commissionAt: dueOrNull(w.commissionAt, t),
  };
  if (w.heat !== undefined) {
    const h = heatOf(w.heat, t);
    if (h) out.heat = h;
    else delete out.heat;
  }
  if (w.segStart !== undefined && !fin(w.segStart)) delete out.segStart;
  if (w.drawn_g !== undefined) out.drawn_g = stock(w.drawn_g);
  if (w.move !== undefined) out.move = w.move === null ? null : moveOf(w.move, t);
  if (w.car !== undefined) {
    const c = obj(w.car);
    out.car = str(c.thing, 128) && fin(c.t0) && fin(c.end) && c.end >= c.t0 ? { thing: c.thing, t0: c.t0, end: Math.max(c.end, t) } : null;
  }
  if (w.course !== undefined) {
    const c = obj(w.course);
    if (fin(c.t0) && c.t0 <= t && str(c.from) && str(c.to)) out.course = { t0: c.t0, from: c.from, to: c.to };
    else delete out.course;
  }
  return out;
}

/** The works' stage-2 fields of a layout-3 save (`fresh`: the fresh fields, for what cannot be read). */
export function repairWorks(raw: Partial<SalvageState>, fresh: Stage2Fields, t: number): Pick<Stage2Fields, 'works' | 'routes' | 'lots' | 'reuse' | 'forklift'> {
  const works: Record<string, WorksState> = {};
  for (const [id, v] of Object.entries(obj(raw.works)).slice(0, MAX_PLATES)) {
    if (!str(id)) continue;
    const w = worksOf(id, v, t);
    if (w) works[id] = w;
  }
  const routes = Object.fromEntries(Object.entries(obj(raw.routes)).filter(([g, to]) => str(g) && str(to)) as [string, string][]);

  const l = obj(raw.lots);
  const lots: LotsState = { nextAt: dueOrNull(l.nextAt, t), n: whole(l.n) };

  const r = obj(raw.reuse);
  const sold = obj(r.sold);
  const reuse: ReuseState = { nextAt: dueOrNull(r.nextAt, t), vanAt: dueOrNull(r.vanAt, t), level: Math.min(99, whole(r.level)), sold: { day: Math.floor(num(sold.day, fresh.reuse.sold.day)), n: whole(sold.n), money: money(sold.money) } };

  const f = obj(raw.forklift);
  const forklift: ForkliftState | null =
    fin(f.x) && fin(f.y)
      ? {
          x: f.x,
          y: f.y,
          heading: Math.floor(num(f.heading)),
          // As the truck's `by` and the presence's `driving` are kept (save.ts), so is who is in the forklift.
          by: f.by === 'boss' ? 'boss' : null,
          load: arr(f.load).filter((p) => str(obj(p).grade) && whole(obj(p).g) > 0 && str(obj(p).uid, 128)) as ForkliftState['load'],
        }
      : null;

  return { works, routes, lots, reuse, forklift };
}
