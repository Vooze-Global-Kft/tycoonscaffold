/**
 * Whole things and whole pieces (yard-stage1.md 2.4, 2.12, E17): piles, cutting a piece off, a thing
 * gone, the drop-off's arrivals. Owner: rules-sim. Uids are stable (notes/contract.md item 7).
 */
import { hash01 } from './board';
import { printTicket, ticketBase, type Ctx } from './clock';
import { pieceCount, pieceSpec } from './content';
import type { GroundPiece, Piece, PileKey, ThingState } from './types';

/** Put a whole piece on a pile at the first free index (a pile's pieces keep their k when others leave). */
export function dropOnPile(x: Ctx, p: Piece, pile: PileKey): GroundPiece {
  const used = new Set<number>();
  for (const q of x.s.pieces) if (q.pile === pile) used.add(q.k);
  let k = 0;
  while (used.has(k)) k++;
  const gp: GroundPiece = { uid: p.uid, grade: p.grade, g: p.g, from: p.from, spec: p.spec, ...(p.whole ? { whole: p.whole } : {}), pile, k, claim: null };
  x.s.pieces.push(gp);
  return gp;
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

/** The next piece cut off a thing (its uid `${thing}.p${cut}`), or null when nothing is left. */
export function nextPiece(x: Ctx, th: ThingState): Piece | null {
  const sp = pieceSpec(x.c, th.obj, th.cut);
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
  const gone = th.cut >= pieceCount(x.c, th.obj);
  if (gone) thingGone(x, th, by, t);
  return { piece, gone };
}

/** The thing leaves the yard's things (cut apart or carried whole); its waste (when cut apart) goes to the rubble skip. */
export function thingGone(x: Ctx, th: ThingState, by: string, t: number, carriedWhole = false): void {
  const i = x.s.things.indexOf(th);
  if (i >= 0) x.s.things.splice(i, 1);
  if (!carriedWhole) {
    const w = x.c.objects[th.obj]?.waste_g ?? 0;
    x.s.waste_g += w;
    if (w > 0) x.ev.push({ type: 'pieceOff', thing: th.uid, piece: `${th.uid}.waste`, grade: 'waste', g: w, to: 'waste', by });
    x.s.counts![`cut:${th.obj}`] = (x.s.counts![`cut:${th.obj}`] ?? 0) + 1;
  }
  x.ev.push({ type: 'thingGone', thing: th.uid });
  // Pieces left beside it move to its place's pile (a beside.<uid> pile has no thing to stand by any more).
  const home = th.at.at === 'zone' ? `zone.${th.at.zone}` : th.at.at === 'dropoff' ? 'dropoff' : 'floor';
  for (const q of x.s.pieces.filter((p) => p.pile === `beside.${th.uid}`)) {
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
  let obj = c.dropoff.initial[n];
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
  for (const th of x.s.things) if (th.at.at === 'floor') {
    const o = x.c.objects[th.obj];
    if (!o) continue;
    let rem = o.waste_g;
    const n = pieceCount(x.c, th.obj);
    for (let k = th.cut; k < n; k++) rem += pieceSpec(x.c, th.obj, k)?.g ?? 0;
    g += rem;
  }
  for (const p of x.s.pieces) if (p.pile === 'floor') g += p.g;
  return g;
}
