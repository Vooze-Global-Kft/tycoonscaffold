/**
 * engine2-hooks (stage 2, Phase A): THE STUBS AS WRITTEN CHANGE NOTHING. Each Phase-B feature's file
 * (works.ts, reuse.ts, lots.ts, crate.ts, bank.ts; halls, shredder, assay, forklift, shop, ads) returns what
 * "no feature" means, and with them in the loop the first yard advances EXACTLY as the engine before the call
 * sites did (commit 5636a48, measured by engine2-hooks' scratch harness on the frozen test content AND on the
 * bots' first hour on the real content; notes/s2a-engine2-hooks.md): here the frozen states' first-yard part,
 * 60 s ticked, 60 s jumped and three hours away, against the hashes that engine gave. Also `clock.ts credit`
 * (2.14.4, B2): cash and lifetime earnings only. Where and when the loop calls each stub is hooks.test.ts's.
 *
 * The hashes are of the FIRST YARD's part of the state (cash, earnings, the clock, ladder, bays, pieces, things,
 * crew, machines, merchant, truck, partners, deal, drop-off, tickets, load, act, owned, tier, income, goals):
 * stage 2's own fields may grow without touching them; a change below rung 3 changes them (L16: the hour the
 * owner played stays as measured). On the frozen test content: no tuned number pinned. Owner: engine2-hooks.
 */
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { FIXTURE_NAMES, FIXTURE_NOW, fixtureGame, FIXTURE_STATES, SALVAGE_TEST } from '../fixtures/salvage';
import * as R from '../salvage';
import { adOffer } from './ads';
import { awayPass } from './away';
import { assayGrade } from './assay';
import { payLot } from './bank';
import { begin, credit, earn, finish } from './clock';
import { tipDivert } from './crate';
import { forkliftStep } from './forklift';
import { hallApply, hallsDated } from './halls';
import { lotArrive, lotsDated } from './lots';
import { rackChoice, reuseApply, reuseDated } from './reuse';
import { afterListing, grantProduct, quote, settle } from './shop';
import { creditLine, segmentEndsAt } from './shredder';
import type { SalvageConfig, SalvageGame } from './types';
import { worksApply, worksCredit, worksDated, worksDepart, worksOpen } from './works';

const CFG = { mode: 'salvage', salvage: SALVAGE_TEST } as unknown as SalvageConfig;
const BASE = { cash: 0, lifetimeEarnings: 0, lastSavedAt: FIXTURE_NOW, stats: { playSeconds: 0, clockHigh: FIXTURE_NOW } } as never;
const h = (o: unknown) => crypto.createHash('sha1').update(JSON.stringify(o)).digest('hex').slice(0, 16);

/** The first yard's part of a game (the scratch harness hooks/proj.mts uses the same lines). */
function firstYardOf(g: any): unknown {
  const s = g.salvage;
  return {
    cash: g.cash, earned: g.lifetimeEarnings, t: s.t,
    ladder: [s.ladder.rung, s.ladder.supplied_g, s.ladder.passed, s.ladder.worth],
    bays: Object.keys(s.bays).sort().map((k) => [k, s.bays[k].g, s.bays[k].n, s.bays[k].held, s.bays[k].aside.map((a: any) => [a.g, a.price])]),
    pieces: s.pieces.map((p: any) => [p.uid, p.grade, p.g, p.pile, p.k, p.claim]),
    things: s.things.map((q: any) => [q.uid, q.obj, JSON.stringify(q.at), q.cut, q.progress, q.by]),
    crew: s.crew.map((m: any) => [m.id, m.level, m.job, m.phase, m.t0, m.t1, JSON.stringify(m.to), m.claims, m.load.map((p: any) => p.uid), JSON.stringify(m.run ?? null), JSON.stringify(m.course ?? null)]),
    machines: Object.keys(s.machines).sort().map((k) => [k, JSON.stringify(s.machines[k])]),
    merchant: [s.merchant.phase, s.merchant.endsAt, JSON.stringify(s.merchant.lot)],
    truck: [s.truck.x, s.truck.y, s.truck.by, JSON.stringify(s.truck.trip ?? null), JSON.stringify(s.truck.skip)],
    partners: JSON.stringify(s.partners), deal: JSON.stringify(s.deal), dropoff: JSON.stringify(s.dropoff),
    tickets: s.tickets.map((q: any) => [q.no, q.kind, q.at, q.paid ?? null, JSON.stringify(q.lines ?? null)]),
    load: s.load.map((p: any) => p.uid), act: JSON.stringify(s.act), owned: s.owned, tier: s.tier, income: JSON.stringify(s.income), goals: JSON.stringify(s.goals),
  };
}

/** As the engine before the call sites gave them (commit 5636a48; scratch hooks/proj-head.json, 26 Nov 08:50). */
const BEFORE: Record<string, string> = {
  fresh: '71370736a33a72bb',
  'fresh+60s ticks': 'c9fbb83cf87193c1',
  'fresh+60s jump': 'b9cd607102cb5796',
  'fresh+3h away': '799bec565c4ff8f5',
  m5: 'a1f72e853467a4ac',
  'm5+60s ticks': '315cce191b445575',
  'm5+60s jump': 'f7c69f1da4b9b2fc',
  'm5+3h away': 'd278b90ff50f2d4f',
  m15: 'b2c05ca5763e4c39',
  'm15+60s ticks': '3b61e97fc999f976',
  'm15+60s jump': '9c6d76647d9ac7bd',
  'm15+3h away': 'bffcb7c797f57841',
  m30: '5c9da6eea72e6e0d',
  'm30+60s ticks': '33e68d93ba0cf39c',
  'm30+60s jump': 'c6d4651049c8e056',
  'm30+3h away': '2bb15f363c56b11b',
  back: 'c22d9e42fed595a8',
  'back+60s ticks': '87f0b53db48c282f',
  'back+60s jump': 'c7bffbf404c9c7f1',
  'back+3h away': 'f45a565a6028ee2f',
};

describe('the first yard advances exactly as before the call sites (the stubs as written)', () => {
  for (const n of FIXTURE_NAMES) {
    it(`${n}: the state, 60 s of 0.1 s ticks, a 60 s jump and three hours away`, () => {
      const g0 = fixtureGame(n, BASE);
      let g = g0;
      let ms = g.salvage.clock.highMs;
      for (let i = 0; i < 600; i++) {
        ms += 100;
        g = R.advanceSalvage(CFG, g, 0.1, ms);
      }
      const got = {
        [n]: h(firstYardOf(g0)),
        [`${n}+60s ticks`]: h(firstYardOf(g)),
        [`${n}+60s jump`]: h(firstYardOf(R.jump(CFG, g0, g0.salvage.t + 60))),
        [`${n}+3h away`]: h(firstYardOf(awayPass(CFG, g0, FIXTURE_STATES[n].salvage.clock.highMs + 3 * 3600_000))),
      };
      for (const k of Object.keys(got)) expect(got[k], k).toBe(BEFORE[k]);
    }, 120_000);
  }
});

describe('each stub returns what "no feature" means', () => {
  const g = fixtureGame('m30', BASE) as SalvageGame;
  const x = begin(CFG, g, []);
  const t = x.s.t;
  it('the loop\'s stubs: nothing dated, nothing applied, nothing taken, nothing diverted, the whole payment to the player', () => {
    const dated: unknown[] = [];
    const add = (...a: unknown[]) => void dated.push(a);
    worksDated(x, add);
    reuseDated(x, add);
    hallsDated(x, add);
    expect(dated).toEqual([]);
    expect(lotsDated(x)).toBeNull();
    expect(segmentEndsAt(x, 'shredder')).toBeNull();
    expect(payLot(x, 1234.56, t)).toEqual({ y: 0, z: 1234.56 });
    expect(rackChoice(x, 'boss', t, null)).toBe(false);
    expect(rackChoice(x, x.s.crew[0], t, null)).toBe(false);
    expect(tipDivert(x, { uid: 'f1', obj: 'washer' }, 'partnerFarm', t)).toBeNull();
    expect(forkliftStep(x, t)).toBe(false);
    expect(assayGrade(x, { uid: 'p', grade: 'li', g: 1000, from: null, spec: 0 })).toBe('li');
    const before = JSON.stringify(x.s);
    worksApply(x, 'plate', 'baler', t);
    worksCredit(x, t);
    worksDepart(x, t);
    worksOpen(x, t);
    lotArrive(x, t);
    reuseApply(x, 'visitor', t);
    hallApply(x, 'rotary', t);
    creditLine(x, 'shredder', t);
    expect(JSON.stringify(x.s)).toBe(before);
    expect(x.cash).toBe(g.cash);
  });
  it("the shop's and the ads' stubs: the same object (the shared store's \"nothing changed\"), no offer", () => {
    expect(quote(CFG, g, FIXTURE_NOW, [], FIXTURE_NOW)).toBe(g);
    expect(settle(CFG, g, 'cancelled', { product: 'pack2', atMs: FIXTURE_NOW })).toBe(g);
    expect(grantProduct(CFG, g, { productId: 'pack2', txId: 't1', purchasedMs: null, own: null })).toBe(g);
    expect(afterListing(CFG, g, { txs: [], fresh: true, requestMs: FIXTURE_NOW }, FIXTURE_NOW)).toBe(g);
    expect(adOffer(CFG, g, 'away')).toBeNull();
  });
});

describe('credit (2.14.4, B2): an ad reward or granted scrip adds to cash and lifetime earnings only', () => {
  it('cash and earned rise by the rounded amount; the income buckets and the away card money do not; nothing at or below zero', () => {
    const g = fixtureGame('m30', BASE) as SalvageGame;
    const x = begin(CFG, g, []);
    x.away = { lines: {}, money: 0, supplied0: 0, loads: 0, deliveries: 0, passed: [], spent: 0, bought: {}, deliveryList: [] };
    const buckets = JSON.stringify(x.s.income);
    credit(x, 12.345, x.s.t, 'ad');
    credit(x, 100, x.s.t, 'grant');
    credit(x, 0, x.s.t, 'ad');
    credit(x, -5, x.s.t, 'grant');
    expect(JSON.stringify(x.s.income)).toBe(buckets);
    expect(x.away.money).toBe(0);
    const out = finish(g, x);
    expect(out.cash).toBeCloseTo(g.cash + 112.35, 2);
    expect(out.lifetimeEarnings).toBeCloseTo((g.lifetimeEarnings ?? 0) + 112.35, 2);
    // A lot payment, for contrast, goes to the buckets and the away card's money too.
    const y = begin(CFG, g, []);
    y.away = { ...x.away, money: 0 };
    earn(y, 10, y.s.t);
    expect(JSON.stringify(y.s.income)).not.toBe(buckets);
    expect(y.away.money).toBe(10);
  });
});
