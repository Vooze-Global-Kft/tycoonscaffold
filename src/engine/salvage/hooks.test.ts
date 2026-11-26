/**
 * engine2-hooks (stage 2, Phase A): THE LOOP'S CALL SITES for Phase B's features, each against a stub its
 * package owns (works.ts, reuse.ts, lots.ts, crate.ts, bank.ts). Here each stub is REPLACED by a recording
 * double (vi.mock) so that the test sees WHERE and WHEN the loop calls it: payLot at every lot payment before
 * its ticket prints, then earn of the player's part; the works' dated ends in the derived queue and their
 * application at that instant, by tick and by jump alike; the works' credit at every instant; the works'
 * departures after the first yard's; rackChoice for a yard hand, the boss and a cutter; tipDivert for each
 * tipped thing before its floor slot; lots', the visitor's and the van's dated ends; the works layer's
 * opening from the state (rung and counts.bathSet), never from the rung event; and THE ORDER WITHIN ONE
 * INSTANT (QUEUE_ORDER). That the stubs AS WRITTEN change nothing is stubs.test.ts's. On the frozen test
 * content; no tuned number pinned. Owner: engine2-hooks.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FIXTURE_NOW, FIXTURE_STATES, SALVAGE_TEST } from '../fixtures/salvage';
import * as R from '../salvage';
import { begin, type Ctx } from './clock';
import { hireCheck } from './ladder';
import { pointOf } from './positions';
import { checks } from './rate';
import { ORDER, QUEUE_ORDER } from './tick';
import type { CrewMember, GroundPiece, SalvageConfig, SalvageGame, SalvageState, ThingState, Ticket } from './types';
import { STAGE2_QUEUE_ORDER } from './types';

/** The doubles' script and record (hoisted: the mocks below are made before any import runs). */
const H = vi.hoisted(() => ({
  log: [] as { f: string; t: number; [k: string]: unknown }[],
  /** Dated ends the doubles give to the queue: kind, ref, at (removed when applied). */
  dated: [] as { kind: string; ref: string; at: number }[],
  /** payLot's share of each gross (0: none, as the stub). */
  share: 0,
  /** rackChoice: the uids a cutter must keep off. */
  keepOff: new Set<string>(),
  /** tipDivert: the objects sent to the crate. */
  divert: new Set<string>(),
  merchantPhase: (x: unknown) => (x as { s: { merchant: { phase: string } } }).s.merchant.phase,
}));
const take = (kind: string, ref: string, t: number) => {
  const i = H.dated.findIndex((d) => d.kind === kind && d.ref === ref && Math.abs(d.at - t) < 1e-6);
  if (i >= 0) H.dated.splice(i, 1);
  return i >= 0;
};
vi.mock('./works', () => ({
  worksDated: (_x: unknown, add: (at: number, kind: string, ref: string) => void) => {
    for (const d of H.dated) if (['plate', 'hall', 'commission', 'crane'].includes(d.kind)) add(d.at, d.kind, d.ref);
  },
  worksApply: (x: { s: { t: number } }, kind: string, ref: string, t: number) => {
    H.log.push({ f: 'worksApply', t, kind, ref, st: x.s.t, taken: take(kind, ref, t), merchant: H.merchantPhase(x) });
  },
  worksCredit: (x: { s: { t: number } }, t: number) => H.log.push({ f: 'worksCredit', t, st: x.s.t }),
  worksDepart: (x: { s: { t: number } }, t: number) => H.log.push({ f: 'worksDepart', t, st: x.s.t }),
  worksOpen: (x: { s: { t: number; ladder: { rung: number } } }, t: number) => H.log.push({ f: 'worksOpen', t, rung: x.s.ladder.rung }),
  // s2a-fix's call sites (their own tests are fix2a.test.ts): as the stubs.
  WORKS_ACTS: new Set(['commission', 'rack', 'lot', 'crate']),
  worksOwn: () => {},
  orderPlate: () => {},
  worksAct: () => false,
  worksActHolds: () => true,
  worksActEnd: () => {},
  worksLegEnd: () => false,
  stationTrays: (_x: unknown, base: readonly string[]) => base,
  worksTrayTrip: () => false,
  landBody: () => false,
}));
vi.mock('./lots', () => ({
  lotsDated: () => H.dated.find((d) => d.kind === 'lot')?.at ?? null,
  lotArrive: (x: { s: { t: number } }, t: number) => H.log.push({ f: 'lotArrive', t, st: x.s.t, taken: take('lot', '', t), merchant: H.merchantPhase(x) }),
}));
vi.mock('./reuse', () => ({
  rackChoice: (_x: unknown, who: 'boss' | { id: string; role: string }, t: number, th: { uid: string } | null) => {
    const role = who === 'boss' ? 'boss' : who.role;
    H.log.push({ f: 'rackChoice', t, who: who === 'boss' ? 'boss' : who.id, role, th: th?.uid ?? null });
    return role === 'cutter' && !!th && H.keepOff.has(th.uid);
  },
  reuseDated: (_x: unknown, add: (at: number, kind: string, ref: string) => void) => {
    for (const d of H.dated) if (d.kind === 'visitor' || d.kind === 'van') add(d.at, d.kind, '');
  },
  reuseApply: (x: { s: { t: number } }, kind: string, t: number) => H.log.push({ f: 'reuseApply', t, kind, st: x.s.t, taken: take(kind, '', t), merchant: H.merchantPhase(x) }),
}));
vi.mock('./crate', () => ({
  tipDivert: (x: { s: { things: { at: { at: string } }[] } }, thing: { uid: string; obj: string }, partner: string, t: number) => {
    H.log.push({ f: 'tipDivert', t, uid: thing.uid, obj: thing.obj, partner, onFloor: x.s.things.filter((q) => q.at.at === 'floor').length });
    return H.divert.has(thing.obj) ? { at: 'crate', k: 0, since: t } : null;
  },
}));
vi.mock('./bank', () => ({
  payLot: (x: { s: { ticketNo: number; tickets: unknown[] } }, gross: number, t: number) => {
    const y = Math.round(H.share * gross * 100) / 100;
    H.log.push({ f: 'payLot', t, gross, y, ticketNo: x.s.ticketNo, printed: x.s.tickets.length });
    return { y, z: Math.round((gross - y) * 100) / 100 };
  },
}));

const C = SALVAGE_TEST;
const cfgOf = (more: Record<string, unknown> = {}): SalvageConfig => ({ mode: 'salvage', salvage: { ...C, ...more } }) as unknown as SalvageConfig;
const base = () => ({ cash: 0, lifetimeEarnings: 0, lastSavedAt: FIXTURE_NOW, stats: { playSeconds: 0, clockHigh: FIXTURE_NOW } }) as never;
const gameOf = (n: keyof typeof FIXTURE_STATES): SalvageGame => {
  const f = FIXTURE_STATES[n];
  return { ...(base() as object), cash: f.cash, lifetimeEarnings: f.lifetimeEarnings, salvage: structuredClone(f.salvage) as SalvageState } as SalvageGame;
};
const calls = (f: string) => H.log.filter((e) => e.f === f);
/** 0.1 s ticks from g to yard second T (the boss as he is: stale in the frozen states). */
function ticks(cfg: SalvageConfig, g: SalvageGame, T: number): SalvageGame {
  let ms = g.salvage.clock.highMs;
  while (g.salvage.t < T - 1e-9) {
    ms += 100;
    g = R.advanceSalvage(cfg, g, 0.1, ms);
  }
  return g;
}

beforeEach(() => {
  H.log.length = 0;
  H.dated.length = 0;
  H.share = 0;
  H.keepOff.clear();
  H.divert.clear();
});

describe('the order within one instant (2.18, B9)', () => {
  it("QUEUE_ORDER: the first yard's eleven kinds in their order, stage 2's seven together after machine, before round", () => {
    expect(QUEUE_ORDER).toEqual(['day', 'machine', 'plate', 'hall', 'commission', 'crane', 'lot', 'visitor', 'van', 'crucible', 'act', 'crewLeg', 'driverLeg', 'boostEnd', 'dropoffArrival', 'skipFull', 'arrival', 'round']);
    const i = (k: string) => QUEUE_ORDER.indexOf(k as never);
    expect(STAGE2_QUEUE_ORDER.map(i)).toEqual(STAGE2_QUEUE_ORDER.map((_, k) => i('machine') + 1 + k));
    expect(Math.max(...STAGE2_QUEUE_ORDER.map(i))).toBeLessThan(i('round'));
    expect(new Set(QUEUE_ORDER).size).toBe(QUEUE_ORDER.length);
    // The loop's rank table is the same order (a literal for speed).
    expect(Object.keys(ORDER).length).toBe(QUEUE_ORDER.length);
    QUEUE_ORDER.forEach((k, n) => expect(ORDER[k], k).toBe(n));
  });

  it('seven stage-2 events and the merchant\'s return at ONE instant are applied plate, hall, commission, crane, lot, visitor, van, then the round', () => {
    const cfg = cfgOf();
    const g0 = gameOf('m15'); // the merchant is away, back at merchant.endsAt
    const T = g0.salvage.merchant.endsAt!;
    // Given in an order that is not the queue's (and refs out of order within a kind).
    for (const [kind, ref] of [['van', ''], ['crane', 'crane'], ['visitor', ''], ['plate', 'shear'], ['lot', ''], ['commission', 'baler'], ['hall', 'rotary'], ['plate', 'baler']] as const) H.dated.push({ kind, ref, at: T });
    for (const run of ['tick', 'jump'] as const) {
      H.log.length = 0;
      const d0 = [...H.dated];
      const g = run === 'tick' ? ticks(cfg, g0, T + 0.5) : R.jump(cfg, g0, T + 0.5);
      H.dated.splice(0, H.dated.length, ...d0);
      const applied = H.log.filter((e) => e.f === 'worksApply' || e.f === 'lotArrive' || e.f === 'reuseApply');
      expect(applied.map((e) => `${(e.kind as string) ?? 'lot'}${e.ref ? ':' + e.ref : ''}`), run).toEqual(['plate:baler', 'plate:shear', 'hall:rotary', 'commission:baler', 'crane:crane', 'lot', 'visitor', 'van']);
      // All at T exactly, the draft's clock at T, and before the round's event (the merchant still away).
      for (const e of applied) {
        expect(e.t).toBeCloseTo(T, 9);
        expect(e.st).toBeCloseTo(T, 9);
        expect(e.merchant).toBe('away');
      }
      expect(g.salvage.merchant.phase).not.toBe('away');
    }
  });
});

describe('the works in the derived queue: dated, applied at that instant, credited, departing after the first yard', () => {
  it('a dated works event is applied at its own instant by 0.1 s ticks and by one jump alike (worksDated, worksApply)', () => {
    const cfg = cfgOf();
    const g0 = gameOf('m30');
    const at = g0.salvage.t + 7.33;
    for (const run of ['tick', 'jump'] as const) {
      H.log.length = 0;
      H.dated.splice(0, H.dated.length, { kind: 'plate', ref: 'baler', at });
      if (run === 'tick') ticks(cfg, g0, g0.salvage.t + 20);
      else R.jump(cfg, g0, g0.salvage.t + 20);
      const a = calls('worksApply');
      expect(a.length, run).toBe(1);
      expect(a[0].t).toBeCloseTo(at, 9);
      expect(a[0].taken).toBe(true);
    }
    // nextEvent (the facade's derived queue) sees it as the earliest dated field.
    H.dated.splice(0, H.dated.length, { kind: 'plate', ref: 'baler', at: g0.salvage.t + 0.01 });
    expect(R.nextEvent(cfg, g0)?.at).toBeCloseTo(g0.salvage.t + 0.01, 9);
  });

  it('worksCredit at every instant the loop credits the rate machines, and at the horizon; worksDepart once an instant, after the yard hands chose', () => {
    const cfg = cfgOf();
    let g = R.createSalvage(cfg, { ...(base() as object), cash: 100_000 } as never, FIXTURE_NOW);
    const pieces: GroundPiece[] = [];
    for (let i = 0; i < 20; i++) pieces.push({ uid: `p${i}`, grade: 'li', g: 10_000, from: null, spec: 0, pile: 'floor', k: i, claim: null });
    g = { ...g, salvage: { ...g.salvage, pieces, presenceAt: -1000 } };
    g = R.hire(cfg, g, 'hand', hireCheck(cfg, g, 'hand').price ?? 0, g.salvage.t);
    H.log.length = 0;
    const T = g.salvage.t + 60;
    R.jump(cfg, g, T);
    const credits = calls('worksCredit');
    const departs = calls('worksDepart');
    expect(credits.length).toBeGreaterThan(5);
    for (const e of credits) expect(e.t).toBe(e.st);
    // The horizon is credited too (the last call), as the rate machines are.
    expect(credits[credits.length - 1].t).toBeCloseTo(T, 9);
    // One departure call at each instant that ran (each instant has one credit before its events).
    const instants = new Set(credits.slice(0, -1).map((e) => e.t));
    expect(new Set(departs.map((e) => e.t))).toEqual(instants);
    expect(departs.length).toBe(instants.size);
    // After the first yard's departures: at an instant at which the yard hand set off (his rackChoice call
    // is made inside his departure), the works' call comes after it.
    const order = H.log.filter((e) => e.f === 'rackChoice' || e.f === 'worksDepart');
    let seen = 0;
    for (let k = 0; k < order.length; k++)
      if (order[k].f === 'rackChoice') {
        const next = order.slice(k + 1).find((e) => e.t === order[k].t && e.f === 'worksDepart');
        expect(next, `a works departure after the hand's at ${order[k].t}`).toBeTruthy();
        seen++;
      }
    expect(seen).toBeGreaterThan(1);
  });
});

describe('lots, the visitor and the van: dated ends applied at their instants (lots.ts, reuse.ts)', () => {
  it('each at its own instant, by ticks and by a jump alike', () => {
    const cfg = cfgOf();
    const g0 = gameOf('m30');
    const t0 = g0.salvage.t;
    const want = [
      { kind: 'lot', ref: '', at: t0 + 3.21 },
      { kind: 'visitor', ref: '', at: t0 + 4.5 },
      { kind: 'van', ref: '', at: t0 + 11.07 },
    ];
    for (const run of ['tick', 'jump'] as const) {
      H.log.length = 0;
      H.dated.splice(0, H.dated.length, ...want.map((d) => ({ ...d })));
      if (run === 'tick') ticks(cfg, g0, t0 + 15);
      else R.jump(cfg, g0, t0 + 15);
      const got = H.log.filter((e) => e.f === 'lotArrive' || e.f === 'reuseApply');
      expect(got.map((e) => (e.f === 'lotArrive' ? 'lot' : (e.kind as string))), run).toEqual(['lot', 'visitor', 'van']);
      got.forEach((e, k) => expect(e.t).toBeCloseTo(want[k].at, 9));
    }
  });
});

describe('payLot at every lot payment BEFORE its ticket prints, then earn of the player part (2.14.4)', () => {
  it("the merchant's collections and a supply deal's delivery: one payLot each, the ticket's bank.y its y, lifetime earnings + Σz", () => {
    const cfg = cfgOf();
    const g0 = gameOf('m30'); // the deal signed, a cast-iron reserve for tomorrow's delivery
    // The market's next 00:00 UTC 40 s from now, so the delivery falls inside the advance.
    const nextDayMs = C.board.epochMs + (g0.salvage.clock.day + 1) * 86_400_000;
    const g1 = { ...g0, salvage: { ...g0.salvage, clock: { ...g0.salvage.clock, highMs: nextDayMs - 40_000 } } } as SalvageGame;
    H.share = 0.2;
    const ev: Parameters<typeof R.jump>[3] = [];
    const g = R.jump(cfg, g1, g1.salvage.t + 1800, ev);
    const pays = calls('payLot');
    // The tickets as printed (from the events: the history keeps only the last 50 tickets of every kind).
    const lots = ev.flatMap((e) => (e.type === 'collected' || e.type === 'dealDelivered' ? [e.ticket] : [])) as Extract<Ticket, { kind: 'collection' | 'dealDelivery' }>[];
    expect(lots.some((q) => q.kind === 'collection')).toBe(true);
    expect(lots.some((q) => q.kind === 'dealDelivery')).toBe(true);
    expect(pays.length).toBe(lots.length);
    for (const q of lots) {
      // The call that took this ticket's number came before the ticket existed (ticketNo not yet drawn).
      const p = pays.find((e) => e.ticketNo === q.no)!;
      expect(p, `payLot before ticket ${q.no}`).toBeTruthy();
      expect(p.gross).toBe(q.paid);
      expect(p.t).toBeCloseTo(q.at, 9);
      expect(q.bank?.y ?? 0).toBe(p.y);
      expect(p.y).toBeGreaterThan(0);
    }
    const z = pays.reduce((a, e) => a + (e.gross as number) - (e.y as number), 0);
    expect(g.lifetimeEarnings - g1.lifetimeEarnings).toBeCloseTo(z, 2);
    expect(g.cash).toBeLessThan(g1.cash + pays.reduce((a, e) => a + (e.gross as number), 0));
  });

  it('with nothing to the bank (the stub) a ticket carries no bank line', () => {
    const cfg = cfgOf();
    const g0 = gameOf('m30');
    const ev: Parameters<typeof R.jump>[3] = [];
    R.jump(cfg, g0, g0.salvage.t + 1800, ev);
    const lots = ev.flatMap((e) => (e.type === 'collected' ? [e.ticket] : []));
    expect(lots.length).toBeGreaterThan(0);
    for (const q of lots) expect('bank' in q).toBe(false);
  });
});

describe('rackChoice where a yard hand, the boss or a cutter meets what may be a tagged thing (2.12, ruling 13.1)', () => {
  const thing = (uid: string, obj: string, slot: number): ThingState => ({ uid, obj, at: { at: 'dropoff', slot }, cut: 0, progress: 0, by: null });
  it('a cutter is asked of each candidate; one it must keep off is never cut, the others are', () => {
    const cfg = cfgOf();
    let g = R.createSalvage(cfg, { ...(base() as object), cash: 100_000 } as never, FIXTURE_NOW);
    for (const item of ['sack', 'sledge']) g = R.buy(cfg, g, item, R.shopPrice(cfg, g, item) ?? 0, g.salvage.t);
    const obj = Object.keys(C.objects).find((o) => (C.objects[o].tier ?? 0) === 1)!;
    g = { ...g, salvage: { ...g.salvage, things: [thing('k1', obj, 0), thing('k2', obj, 1)], dropoff: { ...g.salvage.dropoff, nextAt: -1 }, presenceAt: -1000 } };
    H.keepOff.add('k1');
    g = R.hire(cfg, g, 'cutter', hireCheck(cfg, g, 'cutter').price ?? 0, g.salvage.t);
    g = R.jump(cfg, g, g.salvage.t + 300);
    const asked = calls('rackChoice').filter((e) => e.role === 'cutter');
    expect(asked.some((e) => e.th === 'k1')).toBe(true);
    expect(asked.some((e) => e.th === 'k2')).toBe(true);
    const k1 = g.salvage.things.find((q) => q.uid === 'k1');
    expect(k1 && k1.cut === 0 && k1.by === null).toBe(true);
    expect(g.salvage.things.find((q) => q.uid === 'k2')).toBeUndefined();
  });

  it('a yard hand at his departure (th null), before he takes anything; the boss in his step (th null) while fresh, never while stale', () => {
    const cfg = cfgOf();
    let g = R.createSalvage(cfg, { ...(base() as object), cash: 100_000 } as never, FIXTURE_NOW);
    const pieces: GroundPiece[] = [{ uid: 'p0', grade: 'li', g: 10_000, from: null, spec: 0, pile: 'floor', k: 0, claim: null }];
    g = { ...g, salvage: { ...g.salvage, pieces, presenceAt: -1000 } };
    g = R.hire(cfg, g, 'hand', hireCheck(cfg, g, 'hand').price ?? 0, g.salvage.t);
    // s2a-fix: a yard hand is also asked of each whole or loose CANDIDATE (th set: the keep-off form); the departure's own ask is th null, once.
    const hand = calls('rackChoice').filter((e) => e.role === 'hand' && e.th === null);
    expect(hand.length).toBe(1);
    expect(hand[0].th).toBeNull();
    expect(hand[0].who).toBe('hand.0');
    // ...and then he set off by the first yard's order (the double never takes him).
    expect(g.salvage.crew.find((m) => m.id === 'hand.0')?.phase).toBe('walkTo');
    expect(calls('rackChoice').some((e) => e.role === 'boss')).toBe(false);
    // The boss fresh at an ordinary spot of the yard (not the scale, a hopper or a circle): asked.
    const far = pointOf(C, 'office');
    H.log.length = 0;
    const f = R.setPresence(cfg, g, { x: far.x + 4, y: far.y + 6, moving: false, standingFor: 5, driving: false } as never, g.salvage.t);
    R.jump(cfg, f, f.salvage.t + 1);
    expect(calls('rackChoice').filter((e) => e.role === 'boss').length).toBeGreaterThan(0);
    expect(calls('rackChoice').every((e) => e.role !== 'boss' || e.th === null)).toBe(true);
  });
});

describe('tipDivert where a load is tipped (2.10.2)', () => {
  const tipOf = (cfg: SalvageConfig, g0: SalvageGame) => {
    const ev: Parameters<typeof R.jump>[3] = [];
    let g = g0;
    for (let k = 0; k < 400 && !ev.some((e) => e.type === 'tip'); k++) g = R.jump(cfg, g, g.salvage.t + 5, ev);
    const tip = ev.find((e) => e.type === 'tip') as Extract<NonNullable<typeof ev>[number], { type: 'tip' }>;
    return { g, tip };
  };
  it('once per tipped thing, in the load order, its uid drawn and before its floor slot; a diverted thing takes no slot', () => {
    const cfg = cfgOf();
    const g0 = gameOf('m30'); // the driver is out on the lane
    const a = tipOf(cfg, g0);
    expect(a.tip).toBeTruthy();
    const ds = calls('tipDivert');
    expect(ds.length).toBe(a.tip.things);
    const n0 = Number((ds[0].uid as string).slice(1));
    ds.forEach((e, k) => {
      expect(e.uid).toBe(`f${n0 + k}`);
      expect(e.partner).toBe(a.tip.partner);
    });
    // Each was asked before it stood on the floor: the floor held one more at each later call.
    ds.forEach((e, k) => expect(e.onFloor).toBe((ds[0].onFloor as number) + k));
    for (const e of ds) expect(a.g.salvage.things.find((q) => q.uid === e.uid)?.at.at).toBe('floor');
    // Diverting the first thing's object: it stands at the crate, the others take the floor's first free slots.
    H.log.length = 0;
    H.divert.add(ds[0].obj as string);
    const b = tipOf(cfg, g0);
    const db = calls('tipDivert');
    const crate = b.g.salvage.things.filter((q) => (q.at as { at: string }).at === 'crate');
    expect(crate.length).toBe(db.filter((e) => e.obj === ds[0].obj).length);
    const slots = b.g.salvage.things.filter((q) => q.at.at === 'floor').map((q) => (q.at as { slot: number }).slot).sort((p, q) => p - q);
    expect(slots).toEqual(slots.map((_, k) => k));
  });
});

describe('the works layer opens from the STATE: rung >= the works rung and counts.bathSet absent (2.20, B14)', () => {
  const WORKS = { works: { plates: { baler: { gate: 'rung3' }, shredder: { gate: 'rung4' } } } };
  const at = (cfg: SalvageConfig, rung: number, bathSet?: number) => {
    const g = gameOf('m30');
    const s = g.salvage;
    const counts = { ...s.counts };
    if (bathSet === undefined) delete counts.bathSet;
    else counts.bathSet = bathSet;
    const x: Ctx = begin(cfg, { ...g, salvage: { ...s, ladder: { ...s.ladder, rung }, counts } } as SalvageGame, []);
    checks(x, x.s.t, true);
    return calls('worksOpen');
  };
  it('at rung 3 with no bath set: called at the check (a rung-3 save at its first look, no rung event needed)', () => {
    const got = at(cfgOf(WORKS), 3);
    expect(got.length).toBe(1);
    expect(got[0].rung).toBe(3);
  });
  it('not with the bath set, not below the works rung, not on a content with no plates', () => {
    expect(at(cfgOf(WORKS), 3, 1).length).toBe(0);
    expect(at(cfgOf(WORKS), 2).length).toBe(0);
    expect(at(cfgOf(), 3).length).toBe(0);
  });
  it('in play: a yard that reaches the works rung opens at that instant and at every later check until the bath is set', () => {
    const cfg = cfgOf(WORKS);
    const g0 = gameOf('m30');
    const s = g0.salvage;
    // One rung below the works rung, with the ladder's next rung (as the test content counts it) met: the checks raise it.
    const g = { ...g0, salvage: { ...s, ladder: { ...s.ladder, rung: 3 } } } as SalvageGame;
    R.jump(cfg, g, s.t + 30);
    expect(calls('worksOpen').length).toBeGreaterThan(1);
  });
});

void (null as unknown as CrewMember);
