/**
 * engine5 (a long absence at the works made cheaper, results unchanged bit for bit; notes/engine5.md). lookup.ts's kept
 * sub-lists (thingsAtWhere: a place's things that pass a fixed test of the thing's object and uid, kept by the writers)
 * against the plain filter they stand for, through pushes, splices and a change of content; and whole transitions with verify on (every sub-list read rebuilt and compared)
 * giving the same states as with it off. (The recorded baseline of engine step 5 runs through its checker: the account's
 * commands.)
 */
import { afterEach, describe, expect, it } from 'vitest';
import { r4Game, worksCfg } from '../fixtures/salvage2works';
import { awayPass } from './away';
import { INDEX_AFTER, pushThing, spliceThing, thingCut, thingsAt, thingsAtWhere } from './lookup';
import { MEMO_CHECK } from './memo';
import { jump } from './tick';
import type { SalvageConfig, SalvageGame, ThingState } from './types';

const thing = (uid: string, obj: string, at: ThingState['at']): ThingState => ({ uid, obj, at, cut: 0, progress: 0, by: null });
const warm = (arr: ThingState[]) => {
  for (let i = 0; i <= INDEX_AFTER; i++) thingsAt(arr, 'floor');
};

afterEach(() => {
  MEMO_CHECK.verify = false;
});

describe('engine5 lookup: kept sub-lists', () => {
  it('a sub-list is the filter of its place in the array order, through pushes, splices and cuts', () => {
    MEMO_CHECK.verify = true;
    const c1 = { objects: { a: 1, b: 0 } as Record<string, number> };
    const test = (th: ThingState) => c1.objects[th.obj] === 1;
    const arr: ThingState[] = [];
    for (let i = 0; i < 30; i++) arr.push(thing(`f${i}`, i % 3 ? 'a' : 'b', i % 4 ? { at: 'floor', slot: i } as never : { at: 'dropoff', k: i } as never));
    warm(arr);
    const want = (kind: string) => arr.filter((q) => q.at.at === kind && test(q));
    expect(thingsAtWhere(arr, 'floor', c1, 'p', test)).toEqual(want('floor'));
    pushThing(arr, thing('f30', 'a', { at: 'floor', slot: 30 } as never));
    pushThing(arr, thing('f31', 'b', { at: 'floor', slot: 31 } as never));
    expect(thingsAtWhere(arr, 'floor', c1, 'p', test)).toEqual(want('floor'));
    spliceThing(arr, arr.indexOf(arr.find((q) => q.uid === 'f1')!));
    spliceThing(arr, arr.indexOf(arr.find((q) => q.uid === 'f3')!));
    spliceThing(arr, -1);
    thingCut(arr);
    expect(thingsAtWhere(arr, 'floor', c1, 'p', test)).toEqual(want('floor'));
    // another slot on another place; then another content object: built afresh with its own test
    expect(thingsAtWhere(arr, 'dropoff', c1, 'q', test)).toEqual(want('dropoff'));
    const c2 = { objects: { a: 0, b: 1 } as Record<string, number> };
    const test2 = (th: ThingState) => c2.objects[th.obj] === 1;
    expect(thingsAtWhere(arr, 'floor', c2, 'p', test2)).toEqual(arr.filter((q) => q.at.at === 'floor' && test2(q)));
  });

  it('things taken out are marked and compacted at the next read: several between reads, and one pushed back again', () => {
    MEMO_CHECK.verify = true;
    const arr: ThingState[] = [];
    for (let i = 0; i < 12; i++) arr.push(thing(`f${i}`, 'a', { at: 'floor', slot: i } as never));
    warm(arr);
    const test = (th: ThingState) => th.obj === 'a';
    expect(thingsAtWhere(arr, 'floor', {}, 'p', test)).toHaveLength(12);
    const t3 = arr[3];
    spliceThing(arr, 3);
    spliceThing(arr, 0);
    spliceThing(arr, 5);
    pushThing(arr, t3);
    expect(thingsAt(arr, 'floor')).toEqual(arr.filter((q) => q.at.at === 'floor'));
    expect(thingsAtWhere(arr, 'floor', {}, 'p', test)).toEqual(arr.filter((q) => q.at.at === 'floor'));
    spliceThing(arr, arr.indexOf(t3));
    expect(thingsAt(arr, 'floor').map((q) => q.uid)).toEqual(arr.map((q) => q.uid));
  });

  it('an array read fewer times than INDEX_AFTER answers by the plain filter', () => {
    const arr = [thing('f1', 'a', { at: 'floor', slot: 1 } as never), thing('f2', 'b', { at: 'floor', slot: 2 } as never)];
    expect(thingsAtWhere(arr, 'floor', {}, 'p', (q) => q.obj === 'a')).toEqual([arr[0]]);
  });
});

describe('engine5: whole transitions with verify on give the same states', () => {
  const run = (cfg: SalvageConfig, g: SalvageGame, f: (cfg: SalvageConfig, g: SalvageGame) => SalvageGame) => {
    MEMO_CHECK.verify = false;
    const a = JSON.stringify(f(cfg, g));
    MEMO_CHECK.verify = true;
    const b = JSON.stringify(f(cfg, g));
    MEMO_CHECK.verify = false;
    expect(b).toBe(a);
  };
  it('stage 2 (frozen r4, every plate): an hour away and a ten-minute jump', () => {
    const g = r4Game();
    run(worksCfg(), g, (c, q) => awayPass(c, q, q.salvage.clock.highMs + 3600_000));
    run(worksCfg(), g, (c, q) => jump(c, q, q.salvage.t + 600));
  }, 120_000);
});
