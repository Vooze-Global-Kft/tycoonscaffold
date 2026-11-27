/**
 * THE SHREDDER LINE AND THE BAY-FED PLATES (stage 2, docs/design/yard-stage2.md 2.8.1): the shredder, the
 * eddy current on its stream and the sensor sorter, and every plate fed from the bays (`feedBy: 'bays'`):
 * segments by the cumulative rule (`WorksState.segStart`, `drawn_g`), ending only when a routed bay empties
 * or refills from empty, a route or a level changes, or a heat starts or ends. Owner: rules-works (Phase B).
 *
 * PHASE A STUB (engine2-hooks, 26 November): no line exists. The loop does not call this file: works.ts
 * dates and applies the queue kind `plate` and credits the draws (works.ts worksCredit) and calls in here.
 */
import { bayOf, takeGrams } from './bays';
import type { Ctx } from './clock';
import { plateDef } from './content';
import { bayAvailFor, hallReserve } from './halls';
import type { PlateId, WorksState } from './types';
import { creditPlate, pieceEndsAt, routeOf, takesGrade } from './works';
import { MEMO_CHECK, memoMismatch, ROUTES } from './memo';

// THE RULE AS BUILT (rules-works, wave 1; 2.8.1):
// 1. An idle running bay-fed rate plate (feedBy 'bays': the shredder, the sensor sorter, the battery breaker) DRAWS
//    one piece: from the first grade of its `in` list whose route names it and whose bay holds grams it may take
//    (not set aside, not the deal's or the crucible's, not another station's reserve), at most its `inbuf` kg
//    (whole units only for a grade counted in units). The bay is debited at that instant, once. The piece is then
//    worked as any plate's (works.ts: the cumulative rule, its outputs into their bays as they are credited, the
//    stream to the eddy current while it runs). So a "segment" is one drawn piece: it ends when the piece is done,
//    and a route, a level or a bay that refills from empty is read at the next draw (a level re-rates the piece
//    at once).
// 2. A bay keeps, for the one station its grade is routed to, a reserve of that station's inbuf (a hall: its
//    charge; BayState.reserved): the merchant's round and Sell take only the stock above it. Reserves follow the
//    routes at every instant the works credit or depart (refreshReserves).

/** The grades any plate of the content takes from a bay (rate inputs, every recipe's inputs), memoised per content. */
const TAKEN = new WeakMap<object, readonly string[]>();
function takenGrades(x: Ctx): readonly string[] {
  let v = TAKEN.get(x.c);
  if (!v) {
    const set = new Set<string>();
    for (const d of Object.values(x.c.works?.plates ?? {})) {
      if (d.kind === 'rate' && d.feedBy === 'bays') for (const g of d.in) set.add(g);
      for (const r of Object.values(d.recipes ?? {})) for (const g of r.in) set.add(g);
    }
    v = [...set].sort();
    TAKEN.set(x.c, v);
  }
  return v;
}

/** Rule 1: an idle bay-fed plate draws its next piece from its routed bays. True when it drew. */
export function bayDraw(x: Ctx, id: PlateId, w: WorksState, t: number): boolean {
  void t;
  const d = plateDef(x.c, id);
  if (!d || d.feedBy !== 'bays' || w.work || w.hopper.length) return false;
  for (const g of d.in) {
    if (!x.c.grades[g] || routeOf(x, g) !== id) continue;
    const take = takeGrams(x, g, Math.min(bayAvailFor(x, g, id), d.inbuf * 1000));
    if (take <= 0) continue;
    const n = (x.s.counts![`draw:${id}`] ?? 0) + 1;
    x.s.counts![`draw:${id}`] = n;
    w.hopper.push({ uid: `${id}.b${n}`, grade: g, g: take, from: null, spec: -1 });
    return true;
  }
  return false;
}

/**
 * engine6: of each grade refreshReserves looks at (takenGrades' order), the station whose reserve it may keep: its route
 * when that is a plate that takes the grade (r && r !== 'bay' && r !== 'crucible' && takesGrade), else null, with the
 * plate's definition. routeOf's answers are kept per transition by the routes memo (memo.ts ROUTES) and dropped at every
 * change of what routeOf and takesGrade read (engine3's list: a plate ordered, set down or started up, a purchase owned, a
 * route or a hall's recipe set), so these are kept beside that memo object and made afresh with a new one. What the size
 * reads (the plate's state, a hall's heat) is read at each call. Verify mode: recomputed and compared at every hit.
 */
type ReserveRoute = { r: string | null; d: ReturnType<typeof plateDef> | undefined };
const RESERVE_ROUTES = new WeakMap<object, ReserveRoute[]>();
function reserveRouteNow(x: Ctx, g: string): ReserveRoute {
  const r = routeOf(x, g);
  if (r && r !== 'bay' && r !== 'crucible' && takesGrade(x, r, g)) return { r, d: plateDef(x.c, r) };
  return { r: null, d: undefined };
}
function reserveRoutes(x: Ctx, grades: readonly string[]): ReserveRoute[] {
  // routeOf makes the transition's memo object when there is none; asked first so that the key below is that object.
  if (grades.length) routeOf(x, grades[0]);
  const memo = ROUTES.get(x);
  let v = memo && memo.c === x.c ? RESERVE_ROUTES.get(memo) : undefined;
  if (v && MEMO_CHECK.verify) {
    for (let n = 0; n < grades.length; n++) {
      const f = reserveRouteNow(x, grades[n]);
      if (f.r !== v[n].r || f.d !== v[n].d) memoMismatch(`reserveRoute(${grades[n]})`, v[n].r, f.r);
    }
  }
  if (!v) {
    v = grades.map((g) => reserveRouteNow(x, g));
    if (memo && memo.c === x.c) RESERVE_ROUTES.set(memo, v);
  }
  return v;
}

/** Rule 2: every bay a plate takes from keeps the reserve of the station its grade is routed to (and no other). */
export function refreshReserves(x: Ctx): void {
  const s = x.s;
  const grades = takenGrades(x);
  const st = reserveRoutes(x, grades);
  for (let n = 0; n < grades.length; n++) {
    const g = grades[n];
    const b = s.bays[g];
    if (!b) continue;
    let id: string | null = null;
    let size = 0;
    // engine6: the route's part of the test (routeOf, takesGrade, the plate's definition) kept for the transition's routes (reserveRoutes).
    const e = st[n];
    if (e.r !== null) {
      const w = s.works[e.r];
      if (w && e.d) {
        size = e.d.kind === 'batch' ? hallReserve(x, e.r, w) : e.d.feedBy === 'bays' ? e.d.inbuf * 1000 : 0;
        if (size > 0) id = e.r;
      }
    }
    const cur = b.reserved;
    if (!id) {
      if (cur && Object.keys(cur).length) delete b.reserved;
      continue;
    }
    let same = !!cur && cur[id] === size;
    if (same) for (const k in cur) if (k !== id) same = false;
    if (!same) b.reserved = { [id]: size };
  }
  void bayOf;
}

/** The yard second the piece a bay-fed plate works now ends (its segment), or null. */
export function segmentEndsAt(x: Ctx, plate: PlateId): number | null {
  const w = x.s.works[plate];
  return w ? pieceEndsAt(w) : null;
}

/** Credit a bay-fed plate's piece and output to yard second t (works.ts creditPlate). */
export function creditLine(x: Ctx, plate: PlateId, t: number): void {
  const w = x.s.works[plate];
  if (w?.work) creditPlate(x, plate, w, t);
}
