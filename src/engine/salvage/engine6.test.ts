/**
 * engine6 (a long absence at the works quicker without a compiler, results unchanged bit for bit; notes/engine6.md).
 * The kept answers of this step against what they stand for: a sub-list's known order (lookup.ts thingsAtWhere with an
 * order, lastWhereSorted), fairPick's test without its copies (truck.ts), the kept tool power (content.ts toolP); and whole
 * transitions with verify on (every kept answer of engine steps 3 to 6 recomputed and compared: the cutters' "nothing to
 * cut", the floor run asked twice in one departure, the reserves' routes, the Yard sale's "never tagged") giving the same
 * states as with it off. (The recorded baseline of engine step 5 runs through the step's checker: the account's commands.)
 */
import { afterEach, describe, expect, it } from 'vitest';
import { lots4, r4Game, rackFull, worksCfg } from '../fixtures/salvage2works';
import { awayPass } from './away';
import { toolP } from './content';
import { INDEX_AFTER, lastWhereSorted, pushThing, spliceThing, thingsAt, thingsAtWhere } from './lookup';
import { MEMO_CHECK } from './memo';
import { jump } from './tick';
import { fairPick } from './truck';
import type { SalvageConfig, SalvageGame, ThingState } from './types';

const thing = (uid: string, obj: string, at: ThingState['at']): ThingState => ({ uid, obj, at, cut: 0, progress: 0, by: null });
const warm = (arr: ThingState[]) => {
  for (let i = 0; i <= INDEX_AFTER; i++) thingsAt(arr, 'floor');
};
const byUid = (a: ThingState, b: ThingState) => a.uid.length - b.uid.length || (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0);
const sorted = (l: readonly ThingState[]) => l.every((q, i) => i === 0 || byUid(l[i - 1], q) <= 0);

afterEach(() => {
  MEMO_CHECK.verify = false;
});

describe('engine6 lookup: a sub-list kept with its order', () => {
  it('known in order while pushes come in order; unknown after one out of order; the list itself unchanged', () => {
    MEMO_CHECK.verify = true;
    const c1 = { objects: { a: 1, b: 0 } as Record<string, number> };
    const test = (th: ThingState) => c1.objects[th.obj] === 1;
    const arr: ThingState[] = [];
    for (let i = 0; i < 30; i++) arr.push(thing(`f${i}`, i % 3 ? 'a' : 'b', { at: 'floor', slot: i } as never));
    warm(arr);
    const want = () => arr.filter((q) => q.at.at === 'floor' && test(q));
    expect(thingsAtWhere(arr, 'floor', c1, 's', test, byUid)).toEqual(want());
    expect(lastWhereSorted()).toBe(true);
    pushThing(arr, thing('f30', 'a', { at: 'floor', slot: 30 } as never));
    spliceThing(arr, arr.indexOf(arr.find((q) => q.uid === 'f4')!));
    expect(thingsAtWhere(arr, 'floor', c1, 's', test, byUid)).toEqual(want());
    expect(lastWhereSorted()).toBe(true);
    // f9 sorts before f30 (shorter uid): the list is no longer known in order (and is not).
    pushThing(arr, thing('f9x', 'a', { at: 'floor', slot: 31 } as never));
    pushThing(arr, thing('f8', 'a', { at: 'floor', slot: 32 } as never));
    const l = thingsAtWhere(arr, 'floor', c1, 's', test, byUid);
    expect(l).toEqual(want());
    expect(lastWhereSorted()).toBe(false);
    expect(sorted(l)).toBe(false);
  });

  it('below INDEX_AFTER reads (the plain filter) the order is never claimed', () => {
    const arr = [thing('f1', 'a', { at: 'floor', slot: 0 } as never)];
    thingsAtWhere(arr, 'floor', {}, 's', () => true, byUid);
    expect(lastWhereSorted()).toBe(false);
  });
});

describe('engine6 truck: fairPick without its copies', () => {
  // The rule as written before engine6 (filter, map, sort, every).
  const before = (waiting: { id: string; r: number; fullAt: number; fits: boolean }[], best: string | null) => {
    const inTime = (taken: string | null) => {
      const left = waiting.filter((w) => w.id !== taken).map((w) => w.r - (taken === null ? 0 : 1)).sort((a, b) => a - b);
      return left.every((r, j) => r >= j);
    };
    if (inTime(best)) return best;
    let top: (typeof waiting)[number] | null = null;
    for (const w of waiting) if (!top || w.r < top.r || (w.r === top.r && (w.fullAt < top.fullAt || (w.fullAt === top.fullAt && w.id < top.id)))) top = w;
    if (!top) return best;
    if (!top.fits) return { wait: top.id };
    return top.id;
  };
  it('the same choice on 20,000 drawn cases (r from -2 to 6, up to 7 partners, NaN among them)', () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
    for (let n = 0; n < 20_000; n++) {
      const k = Math.floor(rnd() * 8);
      const waiting = Array.from({ length: k }, (_, i) => ({ id: `p${i}`, r: rnd() < 0.02 ? NaN : Math.floor(rnd() * 9) - 2, fullAt: Math.floor(rnd() * 4), fits: rnd() < 0.7 }));
      const best = k && rnd() < 0.8 ? `p${Math.floor(rnd() * k)}` : null;
      expect(fairPick(waiting, best)).toEqual(before(waiting, best));
    }
  });
});

describe('engine6 content: the kept tool power', () => {
  it('toolP answers as computed afresh, whatever content and tier come in turn', () => {
    const c1 = { tools: { a: { tier: 1, P: 2 }, b: { tier: 3, P: 7 } } } as never;
    const c2 = { tools: { a: { tier: 2, P: 5 } } } as never;
    const fresh = (c: { tools: Record<string, { tier: number; P: number }> }, tier: number) => {
      let best = 0;
      let bt = -1;
      for (const t of Object.values(c.tools)) if (t.tier <= tier && t.tier > bt) {
        bt = t.tier;
        best = t.P;
      }
      return best || Math.min(...Object.values(c.tools).map((t) => t.P));
    };
    for (const [c, tier] of [[c1, 1], [c1, 1], [c1, 3], [c2, 3], [c2, 1], [c1, 0], [c1, 3]] as const) expect(toolP(c, tier)).toBe(fresh(c as never, tier));
  });
});

describe('engine6: whole transitions with verify on give the same states', () => {
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
  it('stage 2 (the Yard sale full, lots dated): an hour away each', () => {
    run(worksCfg(), rackFull(), (c, q) => awayPass(c, q, q.salvage.clock.highMs + 3600_000));
    run(worksCfg(), lots4(), (c, q) => awayPass(c, q, q.salvage.clock.highMs + 3600_000));
  }, 120_000);
});
