/**
 * engine4 (the index; notes/engine4.md): lookup.ts keeps the ground pieces by pile and the things by place, in the
 * arrays' order, through its writers; its verify mode (MEMO_CHECK.verify) rebuilds the index at every read and
 * throws at a difference. Here: the writers against the plain array operations they replace, the guard that rebuilds
 * an index whose array was changed behind its back, and whole transitions of both stages run with verify on giving
 * the same states as with it off. (The recorded baseline's quick subset runs with verify on through the checker:
 * notes/engine4.md, commands.)
 */
import { afterEach, describe, expect, it } from 'vitest';
import { FIXTURE_NOW, SALVAGE_TEST, fixtureGame } from '../fixtures/salvage';
import { r4Game, worksCfg } from '../fixtures/salvage2works';
import { awayPass } from './away';
import { MEMO_CHECK } from './memo';
import { floorKept, INDEX_AFTER, pieceById, pieceClaimed, pileKs, piecesOn, pushPiece, pushThing, removePieces, spliceThing, splicePiece, thingById, thingCut, thingsAt } from './lookup';
import { jump } from './tick';
import type { GroundPiece, SalvageConfig, SalvageGame, ThingState } from './types';

/** Read an array often enough that it is indexed (lookup.ts INDEX_AFTER). */
const warmP = (arr: GroundPiece[]) => {
  for (let i = 0; i <= INDEX_AFTER; i++) piecesOn(arr, 'floor');
};
const warmT = (arr: ThingState[]) => {
  for (let i = 0; i <= INDEX_AFTER; i++) thingsAt(arr, 'floor');
};
const piece = (uid: string, pile: string, k: number, g = 1000): GroundPiece => ({ uid, grade: 'li', g, from: null, spec: 0, pile, k, claim: null });
const thing = (uid: string, at: ThingState['at']): ThingState => ({ uid, obj: 'washer', at, cut: 0, progress: 0, by: null });

function samePieces(arr: GroundPiece[]): void {
  const piles = new Set(arr.map((p) => p.pile));
  for (const pile of piles) expect(piecesOn(arr, pile)).toEqual(arr.filter((p) => p.pile === pile));
  for (const p of arr) expect(pieceById(arr, p.uid)).toBe(arr.find((q) => q.uid === p.uid));
  for (const pile of piles) {
    const used = new Set(arr.filter((p) => p.pile === pile).map((p) => p.k));
    let low = 0;
    while (used.has(low)) low++;
    expect(pileKs(arr, pile).low).toBe(low);
  }
}

afterEach(() => {
  MEMO_CHECK.verify = false;
});

describe('engine4 lookup: the writers keep the index equal to the arrays', () => {
  it('pieces: push, splice (also -1 and past the end), removal of several, by pile and by uid, the free k', () => {
    MEMO_CHECK.verify = true;
    const arr: GroundPiece[] = [];
    expect(piecesOn(arr, 'floor')).toEqual([]);
    // Before the array is indexed (its first reads) the readers scan it: the same answers.
    const cold: GroundPiece[] = [];
    for (let i = 0; i < 3; i++) pushPiece(cold, piece(`q${i}`, 'floor', i));
    expect(piecesOn(cold, 'floor').map((p) => p.uid)).toEqual(['q0', 'q1', 'q2']);
    expect(pileKs(cold, 'floor').low).toBe(3);
    warmP(arr);
    for (let i = 0; i < 12; i++) pushPiece(arr, piece(`p${i}`, i % 3 ? 'floor' : 'dropoff', Math.floor(i / 2)));
    samePieces(arr);
    expect(splicePiece(arr, 4)?.uid).toBe('p4');
    samePieces(arr);
    expect(splicePiece(arr, -1)?.uid).toBe('p11');
    samePieces(arr);
    expect(splicePiece(arr, 99)).toBeUndefined();
    removePieces(arr, [0, 3, 7]);
    expect(arr.map((p) => p.uid)).toEqual(['p1', 'p2', 'p5', 'p6', 'p7', 'p9', 'p10']);
    samePieces(arr);
    arr[1].claim = 'hand.0';
    expect(pieceClaimed(arr, 'p2', 'hand.0')).toBe(arr[1]);
    expect(pieceClaimed(arr, 'p2', 'hand.1')).toBeUndefined();
  });

  it('things: push and splice (indexOf -1 removes the last, as Array.splice does), by place and by uid', () => {
    MEMO_CHECK.verify = true;
    const arr: ThingState[] = [];
    warmT(arr);
    for (let i = 0; i < 9; i++) pushThing(arr, thing(`f${i}`, i % 2 ? { at: 'floor', slot: i } : { at: 'dropoff', slot: i }));
    expect(thingsAt(arr, 'floor')).toEqual(arr.filter((t) => t.at.at === 'floor'));
    expect(spliceThing(arr, arr.indexOf(thing('none', { at: 'floor', slot: 0 })))?.uid).toBe('f8');
    expect(spliceThing(arr, 2)?.uid).toBe('f2');
    for (const kind of ['floor', 'dropoff', 'zone']) expect(thingsAt(arr, kind)).toEqual(arr.filter((t) => t.at.at === kind));
    for (const t of arr) expect(thingById(arr, t.uid)).toBe(t);
    expect(thingById(arr, 'f8')).toBeUndefined();
  });

  it('an array changed without a writer: rebuilt outside verify mode, thrown in it', () => {
    const arr: GroundPiece[] = [piece('a', 'floor', 0)];
    warmP(arr);
    expect(piecesOn(arr, 'floor').length).toBe(1);
    arr.push(piece('b', 'floor', 1));
    expect(piecesOn(arr, 'floor').map((p) => p.uid)).toEqual(['a', 'b']);
    arr.push(piece('c', 'floor', 2));
    MEMO_CHECK.verify = true;
    expect(() => piecesOn(arr, 'floor')).toThrow(/without a writer/);
  });

  it('two pieces with one uid: the uid lookups are the array find (the first)', () => {
    const arr: GroundPiece[] = [];
    warmP(arr);
    pushPiece(arr, piece('a', 'floor', 0));
    pushPiece(arr, piece('a', 'dropoff', 0));
    expect(pieceById(arr, 'a')).toBe(arr[0]);
    expect(splicePiece(arr, 0)?.pile).toBe('floor');
    expect(pieceById(arr, 'a')).toBe(arr[0]);
    expect(piecesOn(arr, 'dropoff')).toEqual([arr[0]]);
  });

  it('floorKept: kept while nothing on the floor changes; a write or a cut computes again', () => {
    const s = { things: [] as ThingState[], pieces: [] as GroundPiece[] };
    warmP(s.pieces);
    warmT(s.things);
    const x = { c: {}, s };
    let n = 0;
    const f = () => floorKept(x, 'probe', () => ++n);
    expect(f()).toBe(1);
    expect(f()).toBe(1);
    pushPiece(s.pieces, piece('a', 'zone.Z1', 0));
    expect(f()).toBe(2);
    pushThing(s.things, thing('f1', { at: 'floor', slot: 0 }));
    expect(f()).toBe(3);
    thingCut(s.things);
    expect(f()).toBe(4);
    expect(floorKept({ c: {}, s }, 'probe', () => ++n)).toBe(5);
  });
});

describe('engine4 lookup: whole transitions with verify on give the same states', () => {
  const run = (cfg: SalvageConfig, g: SalvageGame, f: (cfg: SalvageConfig, g: SalvageGame) => SalvageGame) => {
    MEMO_CHECK.verify = false;
    const a = JSON.stringify(f(cfg, g));
    MEMO_CHECK.verify = true;
    const b = JSON.stringify(f(cfg, g));
    MEMO_CHECK.verify = false;
    expect(b).toBe(a);
  };
  const base = { cash: 0, lifetimeEarnings: 0, runEarnings: 0, lastSavedAt: FIXTURE_NOW, stats: { playSeconds: 0, clockHigh: FIXTURE_NOW } } as never;

  it('the first yard (frozen m30): two hours away and a ten-minute jump', () => {
    const cfg = { mode: 'salvage', salvage: SALVAGE_TEST } as unknown as SalvageConfig;
    const g = fixtureGame('m30', base, FIXTURE_NOW);
    run(cfg, g, (c, q) => awayPass(c, q, q.salvage.clock.highMs + 2 * 3600_000));
    run(cfg, g, (c, q) => jump(c, q, q.salvage.t + 600));
  });

  it('stage 2 (frozen r4, every plate): half an hour away', () => {
    const g = r4Game();
    run(worksCfg(), g, (c, q) => awayPass(c, q, q.salvage.clock.highMs + 1800_000));
  }, 60_000);
});
