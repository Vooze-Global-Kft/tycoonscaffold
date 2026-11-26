/**
 * Whole things and whole pieces (yard-stage1.md 2.4, 2.12, E17): piles, cutting a piece off, a thing
 * gone, the drop-off's arrivals. Owner: rules-sim. Uids are stable (notes/contract.md item 7).
 */
import { hash01 } from './board';
import { heard, printTicket, ticketBase, type Ctx } from './clock';
import { pieceCount, pieceSpec } from './content';
import { weighIn } from './scales';
import type { GroundPiece, Piece, PileKey, ThingState } from './types';

/** Put a whole piece on a pile at the first free index (a pile's pieces keep their k when others leave). */
export function dropOnPile(x: Ctx, p: Piece, pile: PileKey): GroundPiece {
  return dropAllOnPile(x, [p], pile)[0];
}

/** Several pieces onto one pile in order, each at the first free index then (one look at the pile for all). */
export function dropAllOnPile(x: Ctx, ps: readonly Piece[], pile: PileKey): GroundPiece[] {
  const used = new Set<number>();
  for (const q of x.s.pieces) if (q.pile === pile) used.add(q.k);
  const out: GroundPiece[] = [];
  let k = 0;
  for (const p of ps) {
    while (used.has(k)) k++;
    used.add(k);
    const gp: GroundPiece = { uid: p.uid, grade: p.grade, g: p.g, from: p.from, spec: p.spec, ...(p.whole ? { whole: p.whole } : {}), pile, k, claim: null };
    x.s.pieces.push(gp);
    out.push(gp);
  }
  return out;
}

/**
 * Grams still in a thing of `obj` with `cut` pieces off (waste and the pieces left), memoised per content
 * object (a pure function of the content; integer grams, so the sum is the same in any order).
 */
const REMAIN = new WeakMap<object, Map<string, number[]>>();
export function remainingG(c: Ctx['c'], obj: string, cut: number): number {
  let byObj = REMAIN.get(c);
  if (!byObj) REMAIN.set(c, (byObj = new Map()));
  let row = byObj.get(obj);
  if (!row) {
    const o = c.objects[obj];
    if (!o) row = [];
    else {
      const n = pieceCount(c, obj);
      row = new Array(n + 1).fill(0);
      row[n] = o.waste_g;
      for (let k = n - 1; k >= 0; k--) row[k] = row[k + 1] + (pieceSpec(c, obj, k)?.g ?? 0);
    }
    byObj.set(obj, row);
  }
  if (!row.length) return 0;
  return row[cut < 0 ? 0 : cut >= row.length ? row.length - 1 : cut];
}

/** Take a ground piece off its pile (by uid): the piece, or null. */
export function takeFromPile(x: Ctx, uid: string): Piece | null {
  const i = x.s.pieces.findIndex((q) => q.uid === uid);
  if (i < 0) return null;
  const q = x.s.pieces[i];
  x.s.pieces.splice(i, 1);
  const p: Piece = { uid: q.uid, grade: q.grade, g: q.g, from: q.from, spec: q.spec };
  if (q.whole) p.whole = q.whole;
  return p;
}

export function thingOf(x: Ctx, uid: string | null): ThingState | undefined {
  return uid ? x.s.things.find((t) => t.uid === uid) : undefined;
}

/** content.ts pieceSpec and pieceCount, memoised per content object (pure functions of the content; read only). */
type SpecK = { grade: string; g: number; spec: number };
const SPECS = new WeakMap<object, Map<string, SpecK[]>>();
function specRow(c: Ctx['c'], obj: string): SpecK[] {
  let byObj = SPECS.get(c);
  if (!byObj) SPECS.set(c, (byObj = new Map()));
  let row = byObj.get(obj);
  if (!row) {
    row = [];
    const n = pieceCount(c, obj);
    for (let k = 0; k < n; k++) {
      const sp = pieceSpec(c, obj, k);
      if (!sp) break;
      row.push(sp);
    }
    byObj.set(obj, row);
  }
  return row;
}
export function specAt(c: Ctx['c'], obj: string, k: number): SpecK | null {
  if (k < 0) return pieceSpec(c, obj, k);
  return specRow(c, obj)[k] ?? null;
}
export function countOf(c: Ctx['c'], obj: string): number {
  return specRow(c, obj).length;
}

/** The next piece cut off a thing (its uid `${thing}.p${cut}`), or null when nothing is left. */
export function nextPiece(x: Ctx, th: ThingState): Piece | null {
  const sp = specAt(x.c, th.obj, th.cut);
  if (!sp) return null;
  return { uid: `${th.uid}.p${th.cut}`, grade: sp.grade, g: sp.g, from: th.uid, spec: sp.spec };
}

/** The pile a thing's pieces drop to when they do not go on a load: beside it, at the drop-off, on the floor. */
export function pileFor(th: ThingState, byCrew: boolean): PileKey {
  if (byCrew) return th.at.at === 'dropoff' ? 'dropoff' : th.at.at === 'floor' ? 'floor' : `beside.${th.uid}`;
  return `beside.${th.uid}`;
}

/**
 * A piece is off (2.4): the thing's cut count rises; after the last piece its waste goes to the rubble
 * skip and the thing is gone (a drop-off place frees). Returns the piece and whether the thing is gone.
 */
export function cutOff(x: Ctx, th: ThingState, by: string, t: number): { piece: Piece; gone: boolean } | null {
  const piece = nextPiece(x, th);
  if (!piece) return null;
  th.cut += 1;
  th.progress = 0;
  const gone = th.cut >= countOf(x.c, th.obj);
  if (gone && x.c.objects[th.obj]?.shell) shellWeighIn(x, th, by, t);
  else if (gone) thingGone(x, th, by, t);
  return { piece, gone };
}

/**
 * Finding W9: the last piece is off a thing with a shell (the car): the shell is weighed in WHOLE where it
 * stands, at once, by whoever took that piece (one line of the shell's grade into its bay; no piece to
 * carry); its waste goes to the rubble skip now; the thing stays on its spot as a shell (`shell: true`),
 * nobody's, until the merchant's next collection of its grade (shellsLeave). For the caller it is gone:
 * a piece's pile no longer stands beside it.
 */
export function shellWeighIn(x: Ctx, th: ThingState, by: string, t: number): void {
  const o = x.c.objects[th.obj]!;
  const sh = o.shell!;
  th.shell = true;
  th.by = null;
  const w = o.waste_g ?? 0;
  x.s.waste_g += w;
  if (w > 0 && heard(x)) x.ev.push({ type: 'pieceOff', thing: th.uid, piece: `${th.uid}.waste`, grade: 'waste', g: w, to: 'waste', by });
  x.s.counts![`cut:${th.obj}`] = (x.s.counts![`cut:${th.obj}`] ?? 0) + 1;
  // Pieces left beside it go to its place's pile as when a thing is gone.
  const home = th.at.at === 'zone' ? `zone.${th.at.zone}` : th.at.at === 'dropoff' ? 'dropoff' : 'floor';
  const beside = `beside.${th.uid}`;
  for (const q of x.s.pieces.filter((p) => p.pile === beside)) {
    const p = takeFromPile(x, q.uid)!;
    const gp = dropOnPile(x, p, home);
    gp.claim = q.claim;
  }
  x.s.counts![`shell:${th.uid}`] = 1;
  weighIn(x, [{ uid: `${th.uid}.shell`, grade: sh.grade, g: sh.g, from: th.uid, spec: -1, whole: th.obj }], by, t);
}

/** Finding W9: the merchant's round has taken grade `grade` from its bay: every shell of that grade weighed in before leaves the yard with it. */
export function shellsLeave(x: Ctx, grade: string): void {
  for (const th of [...x.s.things]) {
    if (!th.shell || x.c.objects[th.obj]?.shell?.grade !== grade) continue;
    const i = x.s.things.indexOf(th);
    if (i >= 0) x.s.things.splice(i, 1);
    delete x.s.counts![`shell:${th.uid}`];
    x.ev.push({ type: 'thingGone', thing: th.uid });
  }
}

/** The thing leaves the yard's things (cut apart or carried whole); its waste (when cut apart) goes to the rubble skip. */
export function thingGone(x: Ctx, th: ThingState, by: string, t: number, carriedWhole = false): void {
  const i = x.s.things.indexOf(th);
  if (i >= 0) x.s.things.splice(i, 1);
  if (!carriedWhole) {
    const w = x.c.objects[th.obj]?.waste_g ?? 0;
    x.s.waste_g += w;
    if (w > 0 && heard(x)) x.ev.push({ type: 'pieceOff', thing: th.uid, piece: `${th.uid}.waste`, grade: 'waste', g: w, to: 'waste', by });
    x.s.counts![`cut:${th.obj}`] = (x.s.counts![`cut:${th.obj}`] ?? 0) + 1;
  }
  if (heard(x)) x.ev.push({ type: 'thingGone', thing: th.uid });
  // Pieces left beside it move to its place's pile (a beside.<uid> pile has no thing to stand by any more).
  const home = th.at.at === 'zone' ? `zone.${th.at.zone}` : th.at.at === 'dropoff' ? 'dropoff' : 'floor';
  const beside = `beside.${th.uid}`;
  for (const q of x.s.pieces.filter((p) => p.pile === beside)) {
    const p = takeFromPile(x, q.uid)!;
    const gp = dropOnPile(x, p, home);
    gp.claim = q.claim;
  }
  if (th.at.at === 'dropoff' && x.s.dropoff.nextAt < 0) x.s.dropoff.nextAt = t;
}

/** How many things wait at the drop-off. */
export function dropoffCount(x: Ctx): number {
  let n = 0;
  for (const t of x.s.things) if (t.at.at === 'dropoff') n++;
  return n;
}

/** The drop-off's arrival (2.12): the next object at the first free place, its slip; the next arrival dated. */
export function dropoffArrive(x: Ctx, t: number): void {
  const d = x.s.dropoff;
  const c = x.c;
  if (dropoffCount(x) >= c.dropoff.places) {
    d.nextAt = -1;
    return;
  }
  const n = d.n;
  let obj: string | undefined = c.dropoff.initial[n];
  // The opening (finding P1): after the fixed first arrivals, the fixed opening list in order (again from
  // its start) until openingUntil_s, so that no brass, cable or cylinder comes before the copper lesson.
  const opening = c.dropoff.opening ?? [];
  if (!obj && opening.length && t < (c.dropoff.openingUntil_s ?? 0)) obj = opening[(n - c.dropoff.initial.length) % opening.length];
  if (!obj) {
    const mix = c.dropoff.mix;
    const total = mix.reduce((a, [, w]) => a + w, 0);
    let r = hash01(c.worldSeed, 0x0d0f, n) * total;
    obj = mix[mix.length - 1][0];
    for (const [o, w] of mix) {
      if (r < w) {
        obj = o;
        break;
      }
      r -= w;
    }
  }
  const used = new Set(x.s.things.filter((q) => q.at.at === 'dropoff').map((q) => (q.at as { slot: number }).slot));
  let slot = 0;
  while (used.has(slot)) slot++;
  x.s.things.push({ uid: `d${n}`, obj, at: { at: 'dropoff', slot }, cut: 0, progress: 0, by: null });
  d.n = n + 1;
  const ticket = printTicket(x, { ...ticketBase(x, t), kind: 'dropOffSlip', thing: obj });
  x.ev.push({ type: 'arrival', kind: 'dropoff', what: obj });
  x.ev.push({ type: 'dropOffSlip', thing: obj, ticket });
  d.nextAt = dropoffCount(x) >= c.dropoff.places ? -1 : t + c.dropoff.period;
}

/** The next free tipping-floor slot. */
export function floorSlot(x: Ctx): number {
  const used = new Set(x.s.things.filter((q) => q.at.at === 'floor').map((q) => (q.at as { slot: number }).slot));
  let slot = 0;
  while (used.has(slot)) slot++;
  return slot;
}

/** Grams on the tipping floor (things and loose pieces): the hook's room check (2.7). */
export function floorMass_g(x: Ctx): number {
  let g = 0;
  for (const th of x.s.things) if (th.at.at === 'floor') g += remainingG(x.c, th.obj, th.cut);
  for (const p of x.s.pieces) if (p.pile === 'floor') g += p.g;
  return g;
}
