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
import { MEMO_CHECK } from './memo';
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

function get<T extends { uid: string }>(map: WeakMap<readonly T[], Idx<T>>, arr: readonly T[], key: (q: T) => string, what: string): Idx<T> {
  const i = map.get(arr);
  if (i && fresh(i, arr)) {
    if (MEMO_CHECK.verify) compare(what, i, build(arr, key));
    return i;
  }
  if (i && MEMO_CHECK.verify) mismatch(what, `the array changed without a writer (kept ${i.n} items at version ${i.ver}, now ${arr.length})`);
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
  return true;
}

// ------------------------------------------------------------------------------------------------- the pieces

/** The ground pieces of one pile, in the order of `s.pieces` (read only: copy before changing the pile while walking it). */
export function piecesOn(arr: readonly GroundPiece[], pile: string): readonly GroundPiece[] {
  return get(PIECES, arr, pileOf, 'pieces').by.get(pile) ?? EMPTY;
}

/** The first ground piece with this uid (`arr.find((q) => q.uid === uid)`). */
export function pieceById(arr: readonly GroundPiece[], uid: string): GroundPiece | undefined {
  const i = get(PIECES, arr, pileOf, 'pieces');
  return i.dup ? arr.find((q) => q.uid === uid) : i.uid.get(uid);
}

/** No two ground pieces share a uid (so pieceById's piece is the only one with its uid). */
export function piecesUnique(arr: readonly GroundPiece[]): boolean {
  return !get(PIECES, arr, pileOf, 'pieces').dup;
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
  return get(THINGS, arr, placeOf, 'things').by.get(kind) ?? EMPTY;
}

/** The first thing with this uid (`arr.find((t) => t.uid === uid)`). */
export function thingById(arr: readonly ThingState[], uid: string): ThingState | undefined {
  const i = get(THINGS, arr, placeOf, 'things');
  return i.dup ? arr.find((q) => q.uid === uid) : i.uid.get(uid);
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
