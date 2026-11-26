/**
 * THE YARD SALE (yard-stage2.md 2.12; 8.1 row 2.12; rulings 5 and 13.1): tags, who racks (by sight, present and
 * away alike), the visitors dated by value, the restart onto an empty rack, the van; each racked kilogram supplied
 * once; a tick equals a jump. On the works' frozen test content (fixtures/salvage2works.ts: TEST_REUSE, round
 * numbers; no tuned number of the game). Owner: rules-works (wave 2).
 */
import { describe, expect, it } from 'vitest';
import { r3Works, rackedThing, rackFull, TEST_REUSE, worksCfg } from '../fixtures/salvage2works';
import { stage2Cfg, stage2Game } from '../fixtures/salvage';
import { setPresence } from './actions';
import { awayPass } from './away';
import { begin, dayAt, finish, priceAt, type Ctx } from './clock';
import { thingPos } from './positions';
import { ratedIncome } from './rate';
import { FIRST_UID, rackCap, rackChoice, reuseApply, tagFigures, tagged, tagUid } from './reuse';
import { advance, advanceSalvage, jump } from './tick';
import type { SalvageContent } from '../../config/schema.salvage';
import type { CrewMember, SalvageEvent, SalvageGame, SalvageState, ThingState } from './types';

const cfg = worksCfg();
const C = (): SalvageContent => cfg.salvage;

const whole = (g: SalvageGame): unknown => {
  const s = JSON.parse(JSON.stringify(g.salvage)) as Record<string, unknown>;
  for (const k of ['clock', 'epoch', 'away']) delete s[k];
  return { cash: Math.round(g.cash * 100), earned: Math.round((g.lifetimeEarnings ?? 0) * 100), s };
};

function act(g: SalvageGame, body: (x: Ctx) => void, live = true): SalvageGame {
  const x = begin(cfg, g, [], live);
  body(x);
  return finish(g, x);
}
function adv(g: SalvageGame, T: number, live = true, ev: SalvageEvent[] = []): SalvageGame {
  const x = begin(cfg, g, ev, live);
  advance(x, T);
  return finish(g, x);
}
/** A quiet yard: no crew, no trip, no drop-off arrivals, no partner open, the boss stale (only the Yard sale moves). */
function quiet(g: SalvageGame, keepCrew = false): SalvageGame {
  const s = structuredClone(g.salvage) as SalvageState;
  if (!keepCrew) s.crew = [];
  s.dropoff.nextAt = -1;
  s.truck.trip = null;
  s.truck.by = null;
  s.truck.earmark = null;
  for (const p of Object.values(s.partners)) p.open = false;
  for (const b of Object.values(s.bays)) b.held = true;
  s.presenceAt = -1;
  s.lots = { ...s.lots, nextAt: null };
  // The merchant waiting with nothing on his flatbed (no collection pays in the window).
  s.merchant = { ...s.merchant, phase: 'waiting', endsAt: null, lot: [] };
  s.load = [];
  return { ...g, salvage: s };
}
const rackOf = (s: SalvageState): ThingState[] => s.things.filter((t) => t.at.at === 'rack');
/** A uid of the content's tag (hash below reuse.share) for this object, of the given form. */
function taggedUid(obj: string, prefix: string, want = true): string {
  for (let n = 1; n < 5000; n++) if (tagUid(C(), `${prefix}${n}`, obj) === want) return `${prefix}${n}`;
  throw new Error('none');
}
/** The prepared scrap value v of one thing at day D's posted prices (its pieces' grams, lineAmount each). */
function scrapV(x: Ctx, obj: string, day: number): number {
  let v = 0;
  const by: Record<string, number> = {};
  for (const p of C().objects[obj].pieces) by[p[0]] = (by[p[0]] ?? 0) + p[1] * p[2];
  for (const [grade, g] of Object.entries(by)) v += Math.round((g / 1000) * priceAt(x, grade, day) * 100) / 100;
  return Math.round(v * 100) / 100;
}

describe('2.12 tags', () => {
  it('nothing is tagged below rung 3 (before the works open): the first hour unchanged', () => {
    const g = stage2Game('r3');
    expect(g.salvage.counts!.bathSet).toBeUndefined();
    const x = begin(stage2Cfg('r3'), g, [], true);
    expect(x.s.things.filter((t) => tagged(x, t))).toEqual([]);
    expect(rackChoice(x, x.s.crew[0], x.s.t, x.s.things[0])).toBe(false);
  });

  it('a share of the kinds by hash; a bicycle only from a partner\'s load; nothing of the never list; never a cut thing or a lot', () => {
    const c = C();
    let tagged0 = 0;
    for (let n = 1; n <= 2000; n++) if (tagUid(c, `d${n}`, 'radiator')) tagged0++;
    expect(tagged0 / 2000).toBeGreaterThan(c.reuse!.share - 0.05);
    expect(tagged0 / 2000).toBeLessThan(c.reuse!.share + 0.05);
    for (let n = 1; n <= 400; n++) expect(tagUid(c, `d${n}`, 'bike')).toBe(false);
    expect([...Array(400).keys()].some((n) => tagUid(c, `f${n}`, 'bike'))).toBe(true);
    // A kind carrying a tag of reuse.never is never tagged (T23): the washer is electrical.
    const c2 = structuredClone(c) as SalvageContent;
    c2.reuse!.kinds.washer = { fromPartnerOnly: false };
    expect(c2.objects.washer.tags?.some((t) => c2.reuse!.never.includes(t))).toBe(true);
    for (let n = 1; n <= 400; n++) expect(tagUid(c2, `f${n}`, 'washer')).toBe(false);
    const g = r3Works();
    const x = begin(cfg, g, [], true);
    const uid = taggedUid('radiator', 'f');
    expect(tagged(x, { uid, obj: 'radiator', at: { at: 'floor', slot: 0 }, cut: 0, progress: 0, by: null })).toBe(true);
    expect(tagged(x, { uid, obj: 'radiator', at: { at: 'floor', slot: 0 }, cut: 1, progress: 0, by: null })).toBe(false);
    expect(tagged(x, { uid, obj: 'radiator', at: { at: 'lot', k: 0 }, cut: 0, progress: 0, by: null, sender: 'partner.garage' })).toBe(false);
  });

  it('the first thing stands by the canopy at the opening, tagged; the tag prints "§q at the gate · §v as scrap" at the present step', () => {
    const g = r3Works();
    const first = g.salvage.things.find((t) => t.uid === FIRST_UID)!;
    expect(first).toMatchObject({ obj: C().reuse!.firstThing, at: { at: 'canopy', k: 0 } });
    const x = begin(cfg, g, [], true);
    expect(tagged(x, first)).toBe(true);
    const day = dayAt(x, x.s.t);
    const f = tagFigures(x, first, x.s.t)!;
    expect(f.scrap).toBeCloseTo(scrapV(x, first.obj, day), 9);
    expect(f.gate).toBeCloseTo(Math.round(TEST_REUSE.factor * f.scrap * 100) / 100, 9);
    // A cutter keeps off it always; a yard hand cannot lift it (110 kg > crew.hand.load).
    const cutter = x.s.crew.find((m) => m.role === 'cutter') ?? ({ role: 'cutter', id: 'cutter.9' } as CrewMember);
    expect(rackChoice(x, cutter, x.s.t, first)).toBe(true);
    expect(C().objects[first.obj].gross_g).toBeGreaterThan(C().crew.hand.load * 1000);
  });
});

describe('2.12 who racks it (ruling 13.1: by sight; present and away alike)', () => {
  /** r3Works quiet with one yard hand idle at the scale and one tagged thing of `obj` on the floor (or nothing else on it). */
  function oneOnFloor(obj: string, hand = true): { g: SalvageGame; uid: string } {
    const base = r3Works();
    const uid = taggedUid(obj, 'f');
    const g = act(quiet(base, true), (x) => {
      x.s.things = x.s.things.filter((t) => t.at.at !== 'floor' && t.at.at !== 'dropoff');
      x.s.pieces = [];
      x.s.crew = hand ? structuredClone(base.salvage.crew.filter((m) => m.role === 'hand').slice(0, 1)) : [];
      for (const m of x.s.crew) {
        Object.assign(m, { job: 'idle', phase: 'wait', t0: x.s.t, t1: x.s.t, claims: [], load: [], carries: null });
        delete m.run;
        delete m.course;
        delete m.dest;
      }
      x.s.things.push({ uid, obj, at: { at: 'floor', slot: 0 }, cut: 0, progress: 0, by: null });
    });
    return { g, uid };
  }

  it('a yard hand racks a tagged thing within his load, the boss away; its visitor comes reuse.firstVisitor_s after the first racking', () => {
    const { g, uid } = oneOnFloor('radiator');
    const ev: SalvageEvent[] = [];
    // Within a few seconds of racking (its visitor comes firstVisitor_s later and would take it).
    const h = adv(g, g.salvage.t + 12, false, ev);
    const r = ev.find((e) => e.type === 'racked') as Extract<SalvageEvent, { type: 'racked' }>;
    expect(r).toMatchObject({ thing: uid, slot: 0 });
    expect(r.by).toMatch(/^hand\./);
    const racked = h.salvage.things.find((t) => t.uid === uid)!;
    expect(racked.at.at).toBe('rack');
    expect(h.salvage.reuse.nextAt).toBeCloseTo((racked.at as { since: number }).since + TEST_REUSE.firstVisitor_s, 9);
  });

  it('a tagged thing too heavy for a yard hand, out of the boss\'s sight, with a place free, is cut, never left', () => {
    // A stove (90 kg) is over crew.hand.load: the cutter cuts it as any other.
    const base = r3Works();
    const { g, uid } = oneOnFloor('stove');
    const g2 = act(g, (x) => {
      x.s.crew.push(...structuredClone(base.salvage.crew.filter((m) => m.role === 'cutter').slice(0, 1)));
      for (const m of x.s.crew) Object.assign(m, { job: 'idle', phase: 'wait', t0: x.s.t, t1: x.s.t, claims: [], load: [], cut: null });
    });
    expect(C().objects.stove.gross_g).toBeGreaterThan(C().crew.hand.load * 1000);
    const h = adv(g2, g2.salvage.t + 900, false);
    const st = h.salvage.things.find((t) => t.uid === uid);
    expect(st === undefined || st.cut > 0).toBe(true);
    expect(rackOf(h.salvage)).toEqual([]);
  });

  it('with the boss within sight (and his carrier holding it) the thing is his: hands and cutters keep off; out of sight a hand racks it', () => {
    const { g, uid } = oneOnFloor('radiator');
    const th = g.salvage.things.find((t) => t.uid === uid)!;
    const at = thingPos(C(), th.at);
    // The trolley (150 kg) holds a radiator (46 kg).
    const g1 = { ...g, salvage: { ...g.salvage, carrier: 'trolley' } };
    let a = setPresence(cfg, g1, { x: at.x + 6, y: at.y, moving: false, standingFor: 1, driving: false, heading: 0 } as never, g1.salvage.t);
    for (let k = 0; k < 20; k++) a = adv(setPresence(cfg, a, { x: at.x + 6, y: at.y, moving: false, standingFor: 1 + k, driving: false, heading: 0 } as never, a.salvage.t), a.salvage.t + 0.5);
    expect(a.salvage.things.find((t) => t.uid === uid)?.at.at).toBe('floor');
    expect(a.salvage.things.find((t) => t.uid === uid)?.by).toBeNull();
    // Away: a hand racks it.
    const b = adv(a, a.salvage.t + 120, false);
    expect((b.salvage.counts!.racked ?? 0) - (a.salvage.counts!.racked ?? 0)).toBe(1);
  });

  it('the boss lifts a tagged thing whole and walking into the chalk zone sets it on the first free place', () => {
    const { g, uid } = oneOnFloor('radiator', false);
    const th = g.salvage.things.find((t) => t.uid === uid)!;
    const at = thingPos(C(), th.at);
    let a: SalvageGame = { ...g, salvage: { ...g.salvage, carrier: 'trolley' } };
    const still = (h: SalvageGame, p: { x: number; y: number }, moving = false) => setPresence(cfg, h, { x: p.x, y: p.y, moving, standingFor: moving ? 0 : 1, driving: false, heading: 0 } as never, h.salvage.t);
    a = still(a, { x: at.x, y: at.y + 0.9 });
    expect(a.salvage.act).toMatchObject({ kind: 'rack', target: uid });
    for (let k = 0; k < 6; k++) a = adv(still(a, { x: at.x, y: at.y + 0.9 }), a.salvage.t + 0.5);
    expect(a.salvage.load.some((p) => p.uid === uid && p.whole === 'radiator')).toBe(true);
    expect(a.salvage.things.some((t) => t.uid === uid)).toBe(false);
    const zone = C().map.works!.points!['reuseRack.zone'];
    for (let k = 0; k < 6; k++) a = adv(still(a, { x: zone[0], y: zone[1] }, true), a.salvage.t + 0.5);
    const r = a.salvage.things.find((t) => t.uid === uid);
    expect(r?.at).toMatchObject({ at: 'rack', slot: 0 });
    expect(a.salvage.load.some((p) => p.uid === uid)).toBe(false);
  });

  it('from rackFull, with the boss in the yard, the tipping floor never fills with tagged things: with no place free the crews cut them', () => {
    const base = rackFull();
    expect(rackOf(base.salvage).length).toBe(rackCap(begin(cfg, base, [], true)));
    // Tagged radiators on the floor, the boss fresh at the office (far from the floor): the crews cut them all.
    const uids = [...Array(4).keys()].map((k) => taggedUid('radiator', `f${k + 1}0`));
    let g = act(base, (x) => {
      x.s.things = x.s.things.filter((t) => t.at.at !== 'floor');
      uids.forEach((uid, k) => x.s.things.push({ uid, obj: 'radiator', at: { at: 'floor', slot: k }, cut: 0, progress: 0, by: null }));
      x.s.reuse = { ...x.s.reuse, nextAt: x.s.t + 1e6 };
    });
    const office = C().map.points.office ?? C().map.points.start;
    for (let k = 0; k < 60; k++) {
      g = setPresence(cfg, g, { x: office[0], y: office[1], moving: false, standingFor: 1, driving: false, heading: 0 } as never, g.salvage.t);
      g = adv(g, g.salvage.t + 10);
    }
    const x = begin(cfg, g, [], true);
    expect(g.salvage.things.filter((t) => uids.includes(t.uid) && t.cut === 0 && t.at.at === 'floor' && tagged(x, t))).toEqual([]);
  }, 120_000);
});

describe('2.12 the sale', () => {
  /** rackFull quiet: two radiators racked at t; the first visitor dated as the first racking dates it. */
  const full = (): SalvageGame => quiet(rackFull());

  it('a sale pays its printed price once (2 × the scrap value at that day\'s posted price); each racked kilogram supplied once', () => {
    const g = full();
    const t1 = g.salvage.reuse.nextAt!;
    const ev: SalvageEvent[] = [];
    const h = adv(g, t1 + 0.001, true, ev);
    const sold = ev.filter((e) => e.type === 'rackSold') as Extract<SalvageEvent, { type: 'rackSold' }>[];
    expect(sold.length).toBe(1);
    const x = begin(cfg, g, [], true);
    const v = scrapV(x, 'radiator', dayAt(x, t1));
    const q = Math.round(TEST_REUSE.factor * v * 100) / 100;
    expect(sold[0].q).toBeCloseTo(q, 9);
    expect(sold[0].ticket).toMatchObject({ kind: 'rackSale', paid: q });
    expect(h.cash - g.cash).toBeCloseTo(q, 9);
    expect(h.salvage.ladder.supplied_g - g.salvage.ladder.supplied_g).toBe(C().objects.radiator.gross_g - C().objects.radiator.waste_g);
    expect(rackOf(h.salvage).length).toBe(1);
    expect(h.salvage.counts!.rackSold).toBe((g.salvage.counts!.rackSold ?? 0) + 1);
  });

  it('the next visitor is dated by value: nextAt + 3,600 × q ÷ (shareI × max(I₀, floorI)), the same present or away', () => {
    const g = full();
    const t1 = g.salvage.reuse.nextAt!;
    const ev: SalvageEvent[] = [];
    const h = adv(g, t1 + 0.001, true, ev);
    const q = (ev.find((e) => e.type === 'rackSold') as Extract<SalvageEvent, { type: 'rackSold' }>).q;
    const I0 = ratedIncome(cfg.salvage, h.salvage);
    const per = TEST_REUSE.shareI[2]! * Math.max(I0, TEST_REUSE.floorI);
    expect(h.salvage.reuse.nextAt).toBeCloseTo(t1 + (3600 * q) / per, 6);
    // The hand-checkable figure: I₀ under the floor on this quiet yard (no crew: I = 0), so 3,600 × q ÷ (0.01 × 1,000) = 360 q s.
    expect(I0).toBe(0);
    expect(h.salvage.reuse.nextAt! - t1).toBeCloseTo(360 * q, 6);
    // Away (no boss) the same rule: the same sales at the same instants.
    const a = adv(g, t1 + 0.001, false);
    expect(a.salvage.reuse).toEqual(h.salvage.reuse);
    expect(a.cash).toBeCloseTo(h.cash, 9);
  });

  it('the restart: a thing racked onto an empty rack dates the visitor max(nextAt, t + reuse.period_s), never sooner than its value allows', () => {
    const g = full();
    // Sell both, then rack a third onto the empty rack.
    let h = adv(g, g.salvage.reuse.nextAt! + 0.001, false);
    h = adv(h, h.salvage.reuse.nextAt! + 0.001, false);
    expect(rackOf(h.salvage)).toEqual([]);
    const due = h.salvage.reuse.nextAt!;
    // Through the rule: a hand racking onto the empty rack long after the value's date: t + period.
    const late = adv(h, due + 500, false);
    const late2 = act(late, (x) => {
      x.s.things.push({ uid: taggedUid('radiator', 'f99'), obj: 'radiator', at: { at: 'floor', slot: 0 }, cut: 0, progress: 0, by: null });
      x.s.crew = structuredClone(r3Works().salvage.crew.filter((m) => m.role === 'hand').slice(0, 1));
      for (const m of x.s.crew) {
        Object.assign(m, { job: 'idle', phase: 'wait', t0: x.s.t, t1: x.s.t, claims: [], load: [], carries: null });
        delete m.run;
        delete m.course;
      }
      // An instant for the departures (the quiet yard dates nothing else): a drop-off arrival a second on.
      x.s.dropoff.nextAt = x.s.t + 1;
    }, false);
    const ev: SalvageEvent[] = [];
    const r = adv(late2, late2.salvage.t + 60, false, ev);
    const racked = r.salvage.things.find((t) => t.at.at === 'rack');
    expect(racked).toBeDefined();
    const at = (racked!.at as { since: number }).since;
    expect(due).toBeLessThan(at);
    expect(r.salvage.reuse.nextAt).toBeCloseTo(at + TEST_REUSE.period_s, 9);
    // Racked again onto an empty rack BEFORE the value's date (360 q s after the last sale): the value's date stands.
    const early = act(h, (x) => {
      x.s.things.push({ uid: taggedUid('radiator', 'f99'), obj: 'radiator', at: { at: 'floor', slot: 0 }, cut: 0, progress: 0, by: null });
      x.s.crew = structuredClone(late2.salvage.crew);
      for (const m of x.s.crew) Object.assign(m, { t0: x.s.t, t1: x.s.t });
      x.s.dropoff.nextAt = x.s.t + 1;
    }, false);
    const e2 = adv(early, early.salvage.t + 60, false);
    expect(e2.salvage.things.some((t) => t.at.at === 'rack')).toBe(true);
    expect(due).toBeGreaterThan(early.salvage.t + 60 + TEST_REUSE.period_s);
    expect(e2.salvage.reuse.nextAt).toBe(due);
  });

  it('the van: a batch at an empty corner dates it vanPeriod_s on; it takes every batch and pays 1.5 × each one\'s value; each kilogram supplied once', () => {
    const g = act(full(), (x) => {
      x.s.things = x.s.things.filter((t) => t.at.at !== 'rack');
      x.s.reuse = { ...x.s.reuse, vanAt: x.s.t + TEST_REUSE.vanPeriod_s };
      x.s.things.push({ uid: 'b1', obj: 'radiator', at: { at: 'corner', k: 0, since: x.s.t }, cut: 0, progress: 0, by: null });
      x.s.things.push({ uid: 'b2', obj: 'radiator', at: { at: 'corner', k: 1, since: x.s.t }, cut: 0, progress: 0, by: null });
    });
    const ev: SalvageEvent[] = [];
    const h = adv(g, g.salvage.reuse.vanAt! + 0.001, false, ev);
    const van = ev.filter((e) => e.type === 'vanCollected') as Extract<SalvageEvent, { type: 'vanCollected' }>[];
    expect(van.length).toBe(1);
    const x = begin(cfg, g, [], true);
    const day = dayAt(x, g.salvage.reuse.vanAt!);
    const tk = van[0].ticket as Extract<SalvageEvent, { type: 'vanCollected' }>['ticket'] & { paid: number };
    const lines = (tk as unknown as { lines: { amount: number }[] }).lines;
    expect(tk.paid).toBeCloseTo(Math.round(lines.reduce((a, l) => a + l.amount, 0) * 100) / 100, 9);
    expect(tk.paid).toBeCloseTo(2 * Math.round(1.5 * scrapV(x, 'radiator', day) * 100) / 100, 1);
    expect(h.salvage.things.filter((t) => t.at.at === 'corner')).toEqual([]);
    expect(h.salvage.reuse.vanAt).toBeNull();
    expect(h.salvage.ladder.supplied_g - g.salvage.ladder.supplied_g).toBe(2 * (C().objects.radiator.gross_g - C().objects.radiator.waste_g));
    expect(h.cash - g.cash).toBeCloseTo(tk.paid, 9);
  });

  it('a tick equals a jump across racking, the visitor, the restart onto an empty rack and the van', () => {
    const base = act(full(), (x) => {
      x.s.reuse = { ...x.s.reuse, vanAt: x.s.t + 30 };
      x.s.things.push({ uid: 'b1', obj: 'radiator', at: { at: 'corner', k: 0, since: x.s.t }, cut: 0, progress: 0, by: null });
      x.s.things.push({ uid: taggedUid('radiator', 'f99'), obj: 'radiator', at: { at: 'floor', slot: 0 }, cut: 0, progress: 0, by: null });
      x.s.crew = structuredClone(r3Works().salvage.crew.filter((m) => m.role === 'hand').slice(0, 1));
      for (const m of x.s.crew) {
        Object.assign(m, { job: 'idle', phase: 'wait', t0: x.s.t, t1: x.s.t, claims: [], load: [], carries: null });
        delete m.run;
        delete m.course;
      }
    });
    let a = base;
    let ms = a.salvage.clock.highMs;
    for (let i = 0; i < 3000; i++) {
      ms += 500;
      a = advanceSalvage(cfg, a, 0.5, ms);
    }
    const b = jump(cfg, base, a.salvage.t);
    expect(whole(b)).toEqual(whole(a));
    expect((a.salvage.counts!.rackSold ?? 0) - (base.salvage.counts!.rackSold ?? 0)).toBeGreaterThan(0);
    expect(a.salvage.reuse.vanAt).toBeNull();
  }, 120_000);

  it('six hours away pay the public at most shareI × max(I₀, floorI) an hour: the away card\'s line equals what was applied', () => {
    const g = full();
    const out = awayPass(cfg, g, g.salvage.clock.highMs + 6 * 3600_000);
    const card = out.salvage.away as unknown as { rack?: { n: number; money: number } };
    const n = (out.salvage.counts!.rackSold ?? 0) - (g.salvage.counts!.rackSold ?? 0);
    expect(n).toBeGreaterThanOrEqual(1);
    expect(card.rack?.n).toBe(n);
    const sales = out.salvage.tickets.filter((t) => t.kind === 'rackSale' && t.at > g.salvage.t) as { paid: number }[];
    expect(card.rack?.money).toBeCloseTo(sales.reduce((a, t) => a + t.paid, 0), 9);
    // The ceiling: what the public paid in the pass is at most its first sale plus shareI × max(I₀, floorI) an hour of it.
    const hours = (out.salvage.t - g.salvage.t) / 3600;
    expect(card.rack!.money).toBeLessThanOrEqual(sales[0].paid + TEST_REUSE.shareI[2]! * Math.max(ratedIncome(cfg.salvage, g.salvage), TEST_REUSE.floorI) * hours + 1e-6);
    void reuseApply;
  });
});

describe('2.12 the Yard sale\'s card (4.6): shown equals applied', () => {
  it('each racked thing\'s "§q at the gate" is what its visitor pays', async () => {
    const { yardSaleCardOf } = await import('./cardsWorks');
    const g = quiet(rackFull());
    const card = yardSaleCardOf(cfg, g)!;
    expect(card).toMatchObject({ slots: 2, free: 0 });
    const ev: SalvageEvent[] = [];
    adv(g, g.salvage.reuse.nextAt! + 0.001, false, ev);
    const sold = ev.find((e) => e.type === 'rackSold') as Extract<SalvageEvent, { type: 'rackSold' }>;
    const shown = card.things.find((t) => t.uid === sold.thing)!;
    // The same market day (the visitor comes 10 s on): the card's q is the sale's.
    expect(shown.q).toBe(sold.q);
    expect(card.nextVisitorInS).toBeCloseTo(g.salvage.reuse.nextAt! - g.salvage.t, 9);
  });
});
