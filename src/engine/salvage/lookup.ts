/**
 * engine4 (THE INDEX; time away made cheaper again, results unchanged bit for bit; notes/engine4.md). Owner: the
 * loop's engineer.
 *
 * A DERIVED index of the yard's two item lists, kept beside the state (never in it, never saved, never read by a
 * rule's result other than as the list or item it stands for):
 * - the ground pieces (`s.pieces`) by pile, and by uid;
 * - the whole things (`s.things`) by the kind of their place (`at.at`), and by uid.
 * Each list of the index holds the SAME objects as the state's array, IN THE ARRAY'S ORDER (a pile's pieces in the
 * order `s.pieces.filter((p) => p.pile === pile)` gives them), so a reader that walks a pile's list instead of the
 * whole array sees the same items in the same order, and a sum over it adds the same numbers in the same order.
 *
 * It is keyed by the array object itself (a transition's draft has its own arrays: `begin` clones the state). The
 * keys an item is filed under never change while it is in the array: a piece's `pile` and a thing's `at` are set when
 * it is pushed and never written after (engine4's account lists every writer); what does change (claims, `by`, `cut`,
 * `shell`, grams) is read through the same objects, so the index never holds a copy of it.
 *
 * FRESHNESS. Every place that adds an item to or removes one from these arrays goes through the writers below
 * (pushPiece, splicePiece, removePieces, pushThing, spliceThing), which change the array AND the index in one step and
 * bump the index's version. A reader first checks that the array is still the one the index last saw (its length
 * and its last item): if anything changed the array without a writer the index is thrown
 * away and built again from the array (in verify mode that throws instead: a writer was missed). `MEMO_CHECK.verify`
 * (memo.ts: tests and the checker only, false in the game) also rebuilds the index from the array at EVERY read and
 * throws at the first difference.
 *
 * Uids are unique in a yard (notes/contract.md item 7); should an array ever hold two items with one uid, the uid
 * lookups fall back to the array's own `find` (the first in array order), as before.
 */
import { MEMO_CHECK, memoMismatch } from './memo';
import type { GroundPiece, ThingState } from './types';

interface Idx<T> {
  /** The array's length and last item when the index last saw it (the cheap check that nothing else changed it). */
  n: number;
  last: T | undefined;
  /** Bumped by every writer (the version the verify mode reports). */
  ver: number;
  /** Items by key (pile, or the kind of place), in the array's order. */
  by: Map<string, T[]>;
  /** Items by uid (the first in the array's order). */
  uid: Map<string, T>;
  /** Some uid occurs twice: the uid lookups use the array's own find. */
  dup: boolean;
  /** floorKept's values (things' index only), each with the versions and the content it was computed at. */
  kept?: Map<string, { c: object; p: Idx<GroundPiece>; pv: number; tv: number; v: number }>;
  /** pileKs's per-pile counts of the pieces' k (pieces' index only, piles asked for only). */
  ks?: Map<string, PileKs>;
}

/** The k's in use on one pile: how many pieces hold each, and `low` (every k below it is in use). */
export interface PileKs {
  n: Map<number, number>;
  low: number;
}

const EMPTY: readonly never[] = Object.freeze([]) as readonly never[];

const pileOf = (p: GroundPiece): string => p.pile;
const placeOf = (th: ThingState): string => th.at.at;

const PIECES = new WeakMap<readonly GroundPiece[], Idx<GroundPiece>>();
const THINGS = new WeakMap<readonly ThingState[], Idx<ThingState>>();

/** The number of indexes built from scratch (a counter for the account's measures; read by nothing of the rules). */
export const INDEX_STATS = { builds: 0, writes: 0 };

function build<T extends { uid: string }>(arr: readonly T[], key: (q: T) => string): Idx<T> {
  INDEX_STATS.builds++;
  const by = new Map<string, T[]>();
  const uid = new Map<string, T>();
  let dup = false;
  for (let i = 0; i < arr.length; i++) {
    const q = arr[i];
    const k = key(q);
    const l = by.get(k);
    if (l) l.push(q);
    else by.set(k, [q]);
    if (uid.has(q.uid)) dup = true;
    else uid.set(q.uid, q);
  }
  return { n: arr.length, last: arr[arr.length - 1], ver: 0, by, uid, dup };
}

function mismatch(what: string, detail: string): never {
  throw new Error(`engine4 index of ${what}: ${detail}`);
}

/** Verify mode: the kept index against one built afresh from the array. */
function compare<T extends { uid: string }>(what: string, kept: Idx<T>, fresh: Idx<T>): void {
  if (kept.dup !== fresh.dup) mismatch(what, `duplicate uids kept ${kept.dup}, recomputed ${fresh.dup}`);
  for (const [k, l] of fresh.by) {
    const m = kept.by.get(k) ?? EMPTY;
    if (m.length !== l.length) mismatch(what, `key ${k}: kept ${m.length} items, recomputed ${l.length}`);
    for (let i = 0; i < l.length; i++) if (m[i] !== l[i]) mismatch(what, `key ${k}: item ${i} kept ${m[i]?.uid}, recomputed ${l[i].uid}`);
  }
  for (const [k, m] of kept.by) if (m.length && !fresh.by.has(k)) mismatch(what, `key ${k}: kept ${m.length} items, recomputed none`);
  if (kept.uid.size !== fresh.uid.size) mismatch(what, `uids kept ${kept.uid.size}, recomputed ${fresh.uid.size}`);
  for (const [u, q] of fresh.uid) if (kept.uid.get(u) !== q) mismatch(what, `uid ${u}: kept another item`);
}

function fresh<T>(i: Idx<T>, arr: readonly T[]): boolean {
  return i.n === arr.length && i.last === arr[arr.length - 1];
}

/**
 * An array is indexed only from its INDEX_AFTER-th read on: building an index costs about as much as a dozen plain
 * scans, and a tick's draft (fresh arrays every tick) is read a few times only, so until then each reader does what it
 * did before (the plain scan: the same answer). An away pass reads its arrays thousands of times.
 */
export const INDEX_AFTER = 24;
const READS = new WeakMap<object, number>();

function get<T extends { uid: string }>(map: WeakMap<readonly T[], Idx<T>>, arr: readonly T[], key: (q: T) => string, what: string): Idx<T> | null {
  const i = map.get(arr);
  if (i && fresh(i, arr)) {
    if (MEMO_CHECK.verify) compare(what, i, build(arr, key));
    return i;
  }
  if (i && MEMO_CHECK.verify) mismatch(what, `the array changed without a writer (kept ${i.n} items at version ${i.ver}, now ${arr.length})`);
  if (!i) {
    const n = READS.get(arr) ?? 0;
    if (n < INDEX_AFTER) {
      READS.set(arr, n + 1);
      return null;
    }
  }
  const b = build(arr, key);
  map.set(arr, b);
  return b;
}

/** The index of an array a writer is about to change, if it holds one that is fresh (a stale one is dropped). */
function live<T>(map: WeakMap<readonly T[], Idx<T>>, arr: readonly T[], what: string): Idx<T> | null {
  const i = map.get(arr);
  if (!i) return null;
  if (fresh(i, arr)) return i;
  if (MEMO_CHECK.verify) mismatch(what, `the array changed without a writer before a write (kept ${i.n} items at version ${i.ver}, now ${arr.length})`);
  map.delete(arr);
  return null;
}

function fileIn<T extends { uid: string }>(i: Idx<T>, q: T, k: string): void {
  const ks = i.ks?.get(k);
  if (ks) {
    const kk = (q as unknown as GroundPiece).k;
    ks.n.set(kk, (ks.n.get(kk) ?? 0) + 1);
    while (ks.n.has(ks.low)) ks.low++;
  }
  const l = i.by.get(k);
  if (l) l.push(q);
  else i.by.set(k, [q]);
  if (i.uid.has(q.uid)) i.dup = true;
  else i.uid.set(q.uid, q);
}

/** Take q out of the index (false: the index cannot say and must be dropped). */
function fileOut<T extends { uid: string }>(i: Idx<T>, q: T, k: string): boolean {
  if (i.dup) return false;
  const l = i.by.get(k);
  const j = l ? l.indexOf(q) : -1;
  if (!l || j < 0) return false;
  l.splice(j, 1);
  if (!l.length) i.by.delete(k);
  i.uid.delete(q.uid);
  const ks = i.ks?.get(k);
  if (ks) {
    const kk = (q as unknown as GroundPiece).k;
    const c = (ks.n.get(kk) ?? 0) - 1;
    if (c > 0) ks.n.set(kk, c);
    else {
      ks.n.delete(kk);
      if (kk < ks.low) ks.low = kk;
    }
  }
  return true;
}

// ------------------------------------------------------------------------------------------------- the pieces

/** The ground pieces of one pile, in the order of `s.pieces` (read only: copy before changing the pile while walking it). */
export function piecesOn(arr: readonly GroundPiece[], pile: string): readonly GroundPiece[] {
  const i = get(PIECES, arr, pileOf, 'pieces');
  return i ? (i.by.get(pile) ?? EMPTY) : arr.filter((q) => q.pile === pile);
}

/** The first ground piece with this uid (`arr.find((q) => q.uid === uid)`). */
export function pieceById(arr: readonly GroundPiece[], uid: string): GroundPiece | undefined {
  const i = get(PIECES, arr, pileOf, 'pieces');
  return !i || i.dup ? arr.find((q) => q.uid === uid) : i.uid.get(uid);
}

function ksOf(l: readonly GroundPiece[]): PileKs {
  const n = new Map<number, number>();
  for (const q of l) n.set(q.k, (n.get(q.k) ?? 0) + 1);
  let low = 0;
  while (n.has(low)) low++;
  return { n, low };
}

/**
 * The k's in use on a pile (things.ts dropAllOnPile: the first free index), kept by the writers once asked for (read
 * only). Verify mode: compared with the counts built afresh from the pile's pieces.
 */
export function pileKs(arr: readonly GroundPiece[], pile: string): PileKs {
  const i = get(PIECES, arr, pileOf, 'pieces');
  if (!i) return ksOf(arr.filter((q) => q.pile === pile));
  const ks = (i.ks ??= new Map());
  let e = ks.get(pile);
  if (e && MEMO_CHECK.verify) {
    const f = ksOf(i.by.get(pile) ?? EMPTY);
    if (f.low !== e.low || f.n.size !== e.n.size || [...f.n].some(([k, c]) => e!.n.get(k) !== c)) mismatch('pieces', `pile ${pile}: kept k's differ from the pile's`);
  }
  if (!e) ks.set(pile, (e = ksOf(i.by.get(pile) ?? EMPTY)));
  return e;
}

/** The first ground piece with this uid claimed by `by` (`arr.find((q) => q.uid === uid && q.claim === by)`). */
export function pieceClaimed(arr: readonly GroundPiece[], uid: string, by: string): GroundPiece | undefined {
  const i = get(PIECES, arr, pileOf, 'pieces');
  if (!i || i.dup) return arr.find((q) => q.uid === uid && q.claim === by);
  const q = i.uid.get(uid);
  return q !== undefined && q.claim === by ? q : undefined;
}

/** The array is indexed and no two of its pieces share a uid (so pieceById's piece is the only one with its uid); false: use the plain scan. */
export function piecesUnique(arr: readonly GroundPiece[]): boolean {
  const i = get(PIECES, arr, pileOf, 'pieces');
  return !!i && !i.dup;
}

/** `arr.push(p)`, the index kept. */
export function pushPiece(arr: GroundPiece[], p: GroundPiece): void {
  const i = live(PIECES, arr, 'pieces');
  arr.push(p);
  INDEX_STATS.writes++;
  if (!i) return;
  fileIn(i, p, p.pile);
  i.n = arr.length;
  i.last = p;
  i.ver++;
}

/** `arr.splice(at, 1)` (its own rules for a negative or missing index), the index kept; the piece removed, if any. */
export function splicePiece(arr: GroundPiece[], at: number): GroundPiece | undefined {
  const i = live(PIECES, arr, 'pieces');
  const [gone] = arr.splice(at, 1);
  INDEX_STATS.writes++;
  if (!i || gone === undefined) return gone;
  if (!fileOut(i, gone, gone.pile)) {
    PIECES.delete(arr);
    return gone;
  }
  i.n = arr.length;
  i.last = arr[arr.length - 1];
  i.ver++;
  return gone;
}

/**
 * Take the pieces at these array positions out of `arr` in one pass (positions ascending, each once); the others
 * keep their order (as the same removals one by one would leave them). The index kept.
 */
export function removePieces(arr: GroundPiece[], at: readonly number[]): void {
  if (!at.length) return;
  const i = live(PIECES, arr, 'pieces');
  const gone: GroundPiece[] = [];
  let w = at[0];
  let j = 0;
  for (let r = at[0]; r < arr.length; r++) {
    if (j < at.length && at[j] === r) {
      gone.push(arr[r]);
      j++;
      continue;
    }
    arr[w++] = arr[r];
  }
  arr.length = w;
  INDEX_STATS.writes++;
  if (!i) return;
  for (const q of gone) {
    if (!fileOut(i, q, q.pile)) {
      PIECES.delete(arr);
      return;
    }
  }
  i.n = arr.length;
  i.last = arr[arr.length - 1];
  i.ver++;
}

// ------------------------------------------------------------------------------------------------- the things

/** The things whose place is of this kind (`at.at`: 'floor', 'dropoff', 'zone', ...), in the order of `s.things` (read only). */
export function thingsAt(arr: readonly ThingState[], kind: string): readonly ThingState[] {
  const i = get(THINGS, arr, placeOf, 'things');
  return i ? (i.by.get(kind) ?? EMPTY) : arr.filter((q) => q.at.at === kind);
}

/** The first thing with this uid (`arr.find((t) => t.uid === uid)`). */
export function thingById(arr: readonly ThingState[], uid: string): ThingState | undefined {
  const i = get(THINGS, arr, placeOf, 'things');
  return !i || i.dup ? arr.find((q) => q.uid === uid) : i.uid.get(uid);
}

/** `arr.push(th)`, the index kept. */
export function pushThing(arr: ThingState[], th: ThingState): void {
  const i = live(THINGS, arr, 'things');
  arr.push(th);
  INDEX_STATS.writes++;
  if (!i) return;
  fileIn(i, th, th.at.at);
  i.n = arr.length;
  i.last = th;
  i.ver++;
}

/** `arr.splice(at, 1)` (its own rules for a negative or missing index, as `splice(indexOf(th), 1)` relied on), the index kept. */
export function spliceThing(arr: ThingState[], at: number): ThingState | undefined {
  const i = live(THINGS, arr, 'things');
  const [gone] = arr.splice(at, 1);
  INDEX_STATS.writes++;
  if (!i || gone === undefined) return gone;
  if (!fileOut(i, gone, gone.at.at)) {
    THINGS.delete(arr);
    return gone;
  }
  i.n = arr.length;
  i.last = arr[arr.length - 1];
  i.ver++;
  return gone;
}

/**
 * A thing's cut count changed (things.ts cutOff, its only writer): what floorKept keeps of the things is no longer
 * sure. Bumps the things' index version (the array itself is unchanged).
 */
export function thingCut(arr: readonly ThingState[]): void {
  const i = THINGS.get(arr);
  if (i && fresh(i, arr)) i.ver++;
}

/**
 * A number derived ONLY from the floor (things.ts floorMass_g, truck.ts floorGrams: the objects and cut counts of the
 * things whose place is the floor, the grams of the pieces on the floor pile, and the content), kept until either
 * array is written (pushes, splices: the index versions) or a cut count changes (thingCut) or the content object
 * differs. An object never changes for a thing, a piece's grams never change, a thing's cut count changes only in
 * cutOff: so an unchanged pair of versions means the same floor and the same number. Verify mode: recomputed at every
 * hit and compared.
 */
export function floorKept(x: { c: object; s: { things: readonly ThingState[]; pieces: readonly GroundPiece[] } }, slot: string, compute: () => number): number {
  const ti = get(THINGS, x.s.things, placeOf, 'things');
  const pi = get(PIECES, x.s.pieces, pileOf, 'pieces');
  if (!ti || !pi) return compute();
  const kept = (ti.kept ??= new Map());
  const e = kept.get(slot);
  if (e && e.c === x.c && e.p === pi && e.pv === pi.ver && e.tv === ti.ver) {
    if (MEMO_CHECK.verify) {
      const v = compute();
      if (!Object.is(v, e.v)) memoMismatch(`floorKept ${slot}`, e.v, v);
    }
    return e.v;
  }
  const v = compute();
  kept.set(slot, { c: x.c, p: pi, pv: pi.ver, tv: ti.ver, v });
  return v;
}
