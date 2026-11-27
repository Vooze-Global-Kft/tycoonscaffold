/**
 * OVERSIZE PIECES AND THE PICKING TABLE (yard-stage2.md 2.10.1, 2.10.2; 8.1 row 2.10): delivered lots dated in yard
 * seconds, at most four waiting, no backlog, kinds only of owned lines and tool tiers, the mass fixed at arrival, only
 * the boss cuts one; the picking table by hash, sorted one thing every crate.sort_s as a lot payment, nothing on it
 * expiring or moving to the crews. On the works' frozen test content (fixtures/salvage2works.ts: TEST_LOTS,
 * TEST_CRATE). Owner: rules-works (wave 2).
 */
import { describe, expect, it } from 'vitest';
import { lots4, r3Works, TEST_CRATE, TEST_LOT_MASS, TEST_LOTS, worksCfg } from '../fixtures/salvage2works';
import { stage2Game } from '../fixtures/salvage';
import { setPresence } from './actions';
import { hash01 } from './board';
import { begin, dayAt, finish, priceAt, type Ctx } from './clock';
import { tipDivert } from './crate';
import { lotMassRange, lotSplit, lotValue, lotsWaiting } from './lots';
import { contentAt } from './layer';
import { lineAmount, roundMoney } from './money';
import { thingPos } from './positions';
import { ratedIncome } from './rate';
import { advance, advanceSalvage, jump } from './tick';
import { hashString } from '../rng';
import type { SalvageContent } from '../../config/schema.salvage';
import type { SalvageEvent, SalvageGame, SalvageState } from './types';

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
function quiet(g: SalvageGame): SalvageGame {
  const s = structuredClone(g.salvage) as SalvageState;
  s.crew = [];
  s.dropoff.nextAt = -1;
  s.truck.trip = null;
  s.truck.by = null;
  s.truck.earmark = null;
  for (const p of Object.values(s.partners)) p.open = false;
  for (const b of Object.values(s.bays)) b.held = true;
  s.presenceAt = -1;
  s.merchant = { ...s.merchant, phase: 'waiting', endsAt: null, lot: [] };
  s.load = [];
  s.reuse = { ...s.reuse, nextAt: null, vanAt: null };
  return { ...g, salvage: s };
}
const lotsOf = (s: SalvageState) => s.things.filter((t) => t.at.at === 'lot');
const pbar = (x: Ctx, g: string) => x.c.grades[g]?.pbar ?? 0;

describe('2.10.1 oversize pieces', () => {
  it('nextAt is first set at the works\' opening (never at migration): a rung-3 save not yet opened has none', () => {
    expect(stage2Game('r3').salvage.lots.nextAt).toBeNull();
    const g = r3Works();
    expect(g.salvage.lots.nextAt).not.toBeNull();
    expect(g.salvage.lots.nextAt! - g.salvage.t).toBeLessThanOrEqual(TEST_LOTS.period_s);
  });

  it('kinds only of an owned line and the yard\'s tool tier: below the plasma cutter\'s tier none comes and the lots wait a period', () => {
    const g = quiet(r3Works());
    expect(g.salvage.tier).toBeLessThan(4);
    const t1 = g.salvage.lots.nextAt!;
    const h = adv(g, t1 + 0.001, false);
    expect(lotsOf(h.salvage)).toEqual([]);
    expect(h.salvage.lots.nextAt).toBeCloseTo(t1 + TEST_LOTS.period_s, 9);
    // With tier 4 the crucible's line brings the engine casing (the analyser's and the induction hall's kinds are not owned).
    const g4 = { ...g, salvage: { ...g.salvage, tier: 4 } };
    const ev: SalvageEvent[] = [];
    const h4 = adv(g4, t1 + 0.001, false, ev);
    expect(lotsOf(h4.salvage).map((t) => t.obj)).toEqual(['casing']);
    expect(ev.find((e) => e.type === 'lotArrived')).toMatchObject({ k: 0, sender: 'partner.garage' });
    expect(h4.salvage.lots.nextAt).toBeCloseTo(t1 + TEST_LOTS.period_s, 9);
  });

  it('at most four wait: a long absence brings four, never a backlog; nextAt = max(nextAt, t) + period, null at the fourth', () => {
    const g0 = quiet(r3Works());
    const g = { ...g0, salvage: { ...g0.salvage, tier: 4 } };
    const t1 = g.salvage.lots.nextAt!;
    const two = adv(g, t1 + TEST_LOTS.period_s + 0.001, false);
    expect(lotsOf(two.salvage).length).toBe(2);
    expect(two.salvage.lots.nextAt).toBeCloseTo(t1 + 2 * TEST_LOTS.period_s, 9);
    const h = adv(g, t1 + 20 * TEST_LOTS.period_s, false);
    expect(lotsOf(h.salvage).length).toBe(TEST_LOTS.max);
    expect(h.salvage.lots.nextAt).toBeNull();
    expect(h.salvage.lots.n).toBe(TEST_LOTS.max);
  });

  it('X3 (b): its mass is drawn inside its object\'s real range and fixed at arrival; μ × I chooses which kind comes (the heaviest worth at most μ × I), never a multiplier on its mass', () => {
    const g0 = r3Works();
    const g = { ...g0, salvage: { ...g0.salvage, tier: 4 } };
    const t1 = g.salvage.lots.nextAt!;
    const before = adv(g, t1 - 0.001, false);
    const I = ratedIncome(begin(cfg, before, [], false).c, before.salvage);
    const h = adv(before, t1 + 0.001, false);
    const lot = lotsOf(h.salvage)[0];
    const x = begin(cfg, h, [], false);
    const [lo, hi] = TEST_LOT_MASS[lot.obj];
    expect(lot.g!).toBeGreaterThanOrEqual(lo * 1000);
    expect(lot.g!).toBeLessThanOrEqual(hi * 1000);
    const want = (TEST_LOTS.mu_min[2]! / 60) * I;
    // Only the casing's line is owned here: it comes whatever its worth; its worth follows from its mass and grades.
    expect(lot.obj).toBe('casing');
    expect(lotValue(x, lot)).toBeCloseTo((lot.g! / 1000) * x.c.grades.alcast.pbar, 6);
    void want;
    const sp = lotSplit(x, lot);
    expect(sp.specs.reduce((a, q) => a + q.g, 0) + sp.waste).toBe(lot.g);
  });

  it('X3 (b): with several kinds open the heaviest whose worth is at most μ × I comes; when none is, the one of least worth', () => {
    const g0 = r3Works();
    // Every line owned (the induction hall and the analyser ordered: an ordered plate owns its line).
    const s = structuredClone(g0.salvage) as SalvageState;
    s.tier = 4;
    const x0 = begin(cfg, { ...g0, salvage: s }, [], false);
    for (const id of ['induction', 'analyser']) (s.works as Record<string, unknown>)[id] = { plate: id, phase: 'arriving', owned: true, level: 1, hopper: [], tray_g: 0, trayClaim_g: 0, since: s.t, commissionAt: null };
    void x0;
    const g = { ...g0, salvage: s };
    const t1 = s.lots.nextAt!;
    const before = adv(g, t1 - 0.001, false);
    const xb = begin(cfg, before, [], false);
    const want = (TEST_LOTS.mu_min[2]! / 60) * ratedIncome(xb.c, before.salvage);
    const u = hash01(C().worldSeed, hashString('lot'), before.salvage.lots.n);
    const cands = xb.c.lots!.kinds.map((k) => {
      const [lo, hi] = lotMassRange(xb, k);
      const gk = Math.round(lo + u * (hi - lo));
      return { obj: k.obj, g: gk, w: lotValue(xb, { obj: k.obj, g: gk }) };
    });
    const fit = cands.filter((q) => q.w <= want).sort((a, b) => b.g - a.g);
    const exp = fit[0] ?? [...cands].sort((a, b) => a.w - b.w)[0];
    const h = adv(before, t1 + 0.001, false);
    const lot = lotsOf(h.salvage)[0];
    expect({ obj: lot.obj, g: lot.g }).toEqual({ obj: exp.obj, g: exp.g });
    // The case is not trivial: more than one kind is open.
    expect(cands.length).toBe(4);
    expect(fit.length).toBeGreaterThanOrEqual(2);
    expect(cands.some((q) => q.g > exp.g && q.w > want)).toBe(true);
    expect(lotValue(xb, lot) <= want || fit.length === 0).toBe(true);
  });

  it('X3 (b): on five seeds at rungs 3, 4 and 5 every lot\'s mass lies within its object\'s range', () => {
    for (const seed of [11, 23, 37, 41, 53]) {
      for (const rung of [3, 4, 5]) {
        const c2 = { ...cfg, salvage: { ...cfg.salvage, worldSeed: seed } } as typeof cfg;
        const g0 = quiet(r3Works());
        const s = structuredClone(g0.salvage) as SalvageState;
        s.tier = 4;
        s.ladder = { ...s.ladder, rung };
        for (const id of ['induction', 'analyser']) (s.works as Record<string, unknown>)[id] = { plate: id, phase: 'arriving', owned: true, level: 1, hopper: [], tray_g: 0, trayClaim_g: 0, since: s.t, commissionAt: null };
        const g = { ...g0, salvage: s };
        const x = begin(c2, g, [], false);
        advance(x, s.lots.nextAt! + 3 * TEST_LOTS.period_s + 0.001);
        const h = finish(g, x);
        const lots = lotsOf(h.salvage);
        expect(lots.length).toBeGreaterThan(0);
        for (const l of lots) {
          const [lo, hi] = TEST_LOT_MASS[l.obj];
          expect(l.g!, `${seed} r${rung} ${l.obj}`).toBeGreaterThanOrEqual(lo * 1000);
          expect(l.g!, `${seed} r${rung} ${l.obj}`).toBeLessThanOrEqual(hi * 1000);
        }
      }
    }
  });

  it('only the boss cuts one, in the kind\'s cut_s whatever its mass; X3 (a): it is weighed where it is cut, into its bays on one ticket, no piece on the ground; X1: cutting while four wait dates the next a period later', () => {
    const g = quiet(lots4());
    const lot0 = g.salvage.things.find((t) => t.uid === 'lot0')!;
    const at = thingPos(C(), lot0.at);
    const p = { x: at.x, y: at.y + 1.2, moving: false, standingFor: 2, driving: false, heading: 0 } as never;
    let a = setPresence(cfg, g, p, g.salvage.t);
    expect(a.salvage.act).toMatchObject({ kind: 'lot', target: 'lot0' });
    const t0 = a.salvage.act.since;
    // The kind's cut_s (the frozen content's kinds have none: the range's low end, lots.ts cutS).
    const cut = C().lots!.kinds.find((k) => k.obj === 'casing')!.cut_s ?? C().lots!.cut_s[0];
    const ev: SalvageEvent[] = [];
    for (let k = 0; k < 2 * cut + 2; k++) {
      const x = begin(cfg, setPresence(cfg, a, p, a.salvage.t), ev, true);
      advance(x, a.salvage.t + 0.5);
      a = finish(a, x);
    }
    const opened = ev.find((e) => e.type === 'lotOpened') as Extract<SalvageEvent, { type: 'lotOpened' }>;
    expect(opened.thing).toBe('lot0');
    const x = begin(cfg, g, [], true);
    const sp = lotSplit(x, lot0);
    // No piece of it on the ground: one weigh-in by the boss, a line a grade, its grams in the bays.
    expect(a.salvage.pieces.filter((q) => q.from === 'lot0')).toEqual([]);
    const wi = ev.filter((e) => e.type === 'weighIn' && e.pieces.some((u) => u.startsWith('lot0.'))) as Extract<SalvageEvent, { type: 'weighIn' }>[];
    expect(wi.length).toBe(1);
    expect(wi[0].by).toBe('boss');
    const tk = wi[0].ticket as Extract<SalvageEvent, { type: 'weighIn' }>['ticket'] & { kind: 'weighIn' };
    expect(tk.kind).toBe('weighIn');
    const lines = tk.lines;
    expect(lines.map((l) => l.grade)).toEqual([...new Set(sp.specs.map((q) => q.grade))]);
    // Mass: what the lines put in the bays (the platform's rounding kept in scaleRound_g) plus the waste is its mass.
    const round = a.salvage.scaleRound_g - g.salvage.scaleRound_g;
    expect(lines.reduce((s, l) => s + l.g, 0) - round + (a.salvage.waste_g - g.salvage.waste_g)).toBe(lot0.g);
    expect(sp.specs.reduce((s, q) => s + (q.g / 1000) * pbar(x, q.grade), 0)).toBeCloseTo(lotValue(x, lot0), 6);
    // Four were waiting (nextAt null): the cut dates the next one period later, never at once (X1, E1).
    expect(ev.find((e) => e.type === 'lotArrived')).toBeUndefined();
    expect(lotsOf(a.salvage).length).toBe(3);
    const cutAt = t0 + cut;
    expect(a.salvage.lots.nextAt!).toBeGreaterThanOrEqual(cutAt + TEST_LOTS.period_s - 1);
    expect(a.salvage.lots.nextAt!).toBeLessThanOrEqual(cutAt + TEST_LOTS.period_s + 1);
  });

  it('the crews never cut an oversize piece; a tick equals a jump across arrivals', () => {
    const base = r3Works();
    const g = { ...base, salvage: { ...base.salvage, tier: 4, presenceAt: -1 } };
    const T = g.salvage.lots.nextAt! + 2 * TEST_LOTS.period_s + 1;
    let a = g;
    let ms = a.salvage.clock.highMs;
    const steps = Math.ceil((T - a.salvage.t) / 5);
    for (let i = 0; i < steps; i++) {
      ms += 5000;
      a = advanceSalvage(cfg, a, 5, ms);
    }
    const b = jump(cfg, g, a.salvage.t);
    expect(whole(b)).toEqual(whole(a));
    expect(lotsOf(a.salvage).length).toBe(3);
    expect(lotsOf(a.salvage).every((t) => t.cut === 0 && t.by === null)).toBe(true);
  }, 300_000);

  // X1 / E1 (RULING2 22; the exactness attacker's a9-lots.test.ts and the economy attacker's rules test): a cut that frees
  // the pad from full dates the next arrival a period later; a boss cutting in a row gets at most one new piece a period.
  it('X1: the boss stands at a full pad for ten minutes (period 1,000 s): he cuts at most the four there plus what the periods bring, and no ground piece is made', () => {
    let g: SalvageGame = lots4();
    const CC = contentAt(cfg.salvage, g.salvage);
    const ev: SalvageEvent[] = [];
    let ms = g.salvage.clock.highMs;
    const t0 = g.salvage.t;
    const floor0 = g.salvage.pieces.length;
    for (let i = 0; i < 6000; i++) {
      ms += 100;
      const lot = g.salvage.things.filter((t) => t.at.at === 'lot').sort((a, b) => (a.at as { k: number }).k - (b.at as { k: number }).k)[0];
      if (lot && i % 5 === 0) {
        const p = thingPos(CC, lot.at);
        g = setPresence(cfg, g, { x: p.x, y: p.y + 1.0, moving: false, standingFor: 3, driving: false } as never, g.salvage.t, ev);
      }
      g = advanceSalvage(cfg, g, 0.1, ms, ev);
    }
    const cut = ev.filter((e) => e.type === 'lotOpened').length;
    const came = ev.filter((e) => e.type === 'lotArrived').length;
    const span = g.salvage.t - t0;
    expect(cut).toBeGreaterThanOrEqual(1);
    expect(came).toBeLessThanOrEqual(Math.ceil(span / TEST_LOTS.period_s));
    expect(cut).toBeLessThanOrEqual(4 + Math.ceil(span / TEST_LOTS.period_s));
    expect(g.salvage.pieces.filter((p) => (p.from ?? '').startsWith('lot')).length).toBe(0);
    void floor0;
  }, 300_000);

  it('E1: four waiting and cut one after another bring at most one new piece per period_s (each arrival a period after the cut that freed the pad)', () => {
    let g: SalvageGame = quiet(lots4());
    const ev: SalvageEvent[] = [];
    const cuts: number[] = [];
    const T = g.salvage.t + 3 * TEST_LOTS.period_s;
    while (g.salvage.t < T) {
      const lot = g.salvage.things.filter((t) => t.at.at === 'lot').sort((a, b) => (a.at as { k: number }).k - (b.at as { k: number }).k)[0];
      if (lot) {
        const at = thingPos(contentAt(cfg.salvage, g.salvage), lot.at);
        const p = { x: at.x, y: at.y + 1.2, moving: false, standingFor: 2, driving: false, heading: 0 } as never;
        g = setPresence(cfg, g, p, g.salvage.t, ev);
        const n0 = ev.filter((e) => e.type === 'lotOpened').length;
        for (let k = 0; k < 40 && ev.filter((e) => e.type === 'lotOpened').length === n0; k++) {
          const x = begin(cfg, setPresence(cfg, g, p, g.salvage.t), ev, true);
          advance(x, g.salvage.t + 0.5);
          g = finish(g, x);
        }
        cuts.push(g.salvage.t);
      } else {
        const x = begin(cfg, g, ev, true);
        advance(x, Math.min(T, g.salvage.lots.nextAt ?? T) + 0.001);
        g = finish(g, x);
      }
    }
    const arrivals = ev.filter((e) => e.type === 'lotArrived').length;
    // Three periods: at most three new pieces (one a period), never one at the instant of a cut.
    expect(cuts.length).toBeGreaterThanOrEqual(5);
    expect(arrivals).toBeGreaterThanOrEqual(1);
    expect(arrivals).toBeLessThanOrEqual(3);
    expect(ev.filter((e) => e.type === 'lotOpened').length).toBeLessThanOrEqual(4 + 3);
  }, 300_000);
});

describe('2.10.2 the picking table', () => {
  it('a tipped thing goes to it by hash while it holds fewer than crate.max; a battery or a car never; a tagged thing stays for the floor', () => {
    const g = r3Works();
    const x = begin(cfg, g, [], false);
    const h = (uid: string) => hash01(C().worldSeed, hashString('crate'), hashString(uid));
    let n = 0;
    for (let k = 1; k <= 400; k++) {
      const uid = `f${50_000 + k}`;
      const at = tipDivert(x, { uid, obj: 'motor' }, 'partnerFarm', x.s.t);
      if (h(uid) < TEST_CRATE.share && n < TEST_CRATE.max) {
        expect(at).toMatchObject({ at: 'crate', since: x.s.t });
        x.s.things.push({ uid, obj: 'motor', at: at!, cut: 0, progress: 0, by: null });
        n++;
      } else expect(at).toBeNull();
    }
    expect(n).toBe(TEST_CRATE.max);
    const y = begin(cfg, g, [], false);
    for (let k = 1; k <= 200; k++) {
      expect(tipDivert(y, { uid: `f${60_000 + k}`, obj: 'pbb' }, 'partner.garage', y.s.t)).toBeNull();
      expect(tipDivert(y, { uid: `f${60_000 + k}`, obj: 'elv' }, 'partner.garage', y.s.t)).toBeNull();
    }
  });

  it('the boss sorts the oldest thing every crate.sort_s: each paid u × its prepared value at that day\'s price (a lot payment), supplied once; one ticket while he stays, closed when he walks off', () => {
    const g = quiet(lots4());
    const pt = C().map.works!.points!.crate;
    const still = { x: pt[0], y: pt[1] + 1.2, moving: false, standingFor: 2, driving: false, heading: 0 } as never;
    let a = setPresence(cfg, g, still, g.salvage.t);
    expect(a.salvage.act).toMatchObject({ kind: 'crate', target: 'f9001' });
    const ev: SalvageEvent[] = [];
    for (let k = 0; k < 9; k++) {
      const x = begin(cfg, setPresence(cfg, a, still, a.salvage.t), ev, true);
      advance(x, a.salvage.t + 0.5);
      a = finish(a, x);
    }
    const sorted = ev.filter((e) => e.type === 'crateSorted') as Extract<SalvageEvent, { type: 'crateSorted' }>[];
    expect(sorted.map((e) => e.thing)).toEqual(['f9001', 'f9002']);
    const x = begin(cfg, g, [], true);
    const day = dayAt(x, a.salvage.t);
    let want = 0;
    const by: Record<string, number> = {};
    for (const p of C().objects.radiator.pieces) by[p[0]] = (by[p[0]] ?? 0) + p[1] * p[2];
    for (const [grade, gg] of Object.entries(by)) want = roundMoney(want + roundMoney(TEST_CRATE.u * lineAmount(gg, priceAt(x, grade, day))));
    expect(sorted[0].paid).toBeCloseTo(want, 9);
    expect(a.cash - g.cash).toBeCloseTo(sorted[0].paid + sorted[1].paid, 9);
    expect(a.salvage.ladder.supplied_g - g.salvage.ladder.supplied_g).toBe(2 * C().objects.radiator.gross_g);
    const tk = a.salvage.tickets.filter((t) => t.kind === 'crateLot');
    expect(tk.length).toBe(1);
    expect(tk[0]).toMatchObject({ n: 2, open: true });
    // He walks off: the ticket closes; what he left waits.
    const b = setPresence(cfg, a, { x: pt[0] + 8, y: pt[1] + 3, moving: true, standingFor: 0, driving: false, heading: 0 } as never, a.salvage.t);
    expect(b.salvage.tickets.find((t) => t.kind === 'crateLot')).toMatchObject({ open: false, n: 2 });
    expect(b.salvage.things.filter((t) => t.at.at === 'crate').length).toBe(9);
  });

  it('nothing on it expires and nothing moves to the crews: ten hours with the crews at work leave every thing on it', () => {
    const g = lots4();
    const out = adv({ ...g, salvage: { ...g.salvage, presenceAt: -1 } }, g.salvage.t + 10 * 3600, false);
    const before = g.salvage.things.filter((t) => t.at.at === 'crate').map((t) => t.uid);
    const after = out.salvage.things.filter((t) => t.at.at === 'crate').map((t) => t.uid);
    for (const uid of before) expect(after).toContain(uid);
    expect(out.salvage.things.filter((t) => t.at.at === 'crate').every((t) => t.cut === 0 && t.by === null)).toBe(true);
    expect(lotsWaiting(begin(cfg, out, [], false))).toBe(4);
  }, 120_000);
});
