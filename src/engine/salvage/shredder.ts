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

/** Rule 2: every bay a plate takes from keeps the reserve of the station its grade is routed to (and no other). */
export function refreshReserves(x: Ctx): void {
  const s = x.s;
  for (const g of takenGrades(x)) {
    const b = s.bays[g];
    if (!b) continue;
    const r = routeOf(x, g);
    let id: string | null = null;
    let size = 0;
    if (r && r !== 'bay' && r !== 'crucible' && takesGrade(x, r, g)) {
      const w = s.works[r];
      const d = plateDef(x.c, r);
      if (w && d) {
        size = d.kind === 'batch' ? hallReserve(x, r, w) : d.feedBy === 'bays' ? d.inbuf * 1000 : 0;
        if (size > 0) id = r;
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
