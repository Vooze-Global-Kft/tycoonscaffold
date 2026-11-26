/**
 * OVERSIZE PIECES AND THE PICKING TABLE (yard-stage2.md 2.10.1, 2.10.2; 8.1 row 2.10): delivered lots dated in yard
 * seconds, at most four waiting, no backlog, kinds only of owned lines and tool tiers, the mass fixed at arrival, only
 * the boss cuts one; the picking table by hash, sorted one thing every crate.sort_s as a lot payment, nothing on it
 * expiring or moving to the crews. On the works' frozen test content (fixtures/salvage2works.ts: TEST_LOTS,
 * TEST_CRATE). Owner: rules-works (wave 2).
 */
import { describe, expect, it } from 'vitest';
import { lots4, r3Works, TEST_CRATE, TEST_LOTS, worksCfg } from '../fixtures/salvage2works';
import { stage2Game } from '../fixtures/salvage';
import { setPresence } from './actions';
import { hash01 } from './board';
import { begin, dayAt, finish, priceAt, type Ctx } from './clock';
import { tipDivert } from './crate';
import { lotSplit, lotValue, lotsWaiting } from './lots';
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

  it('its mass is fixed at arrival so that its value at p̄ once cut is μ minutes of I then; the printed value is the value cut', () => {
    const g0 = r3Works();
    const g = { ...g0, salvage: { ...g0.salvage, tier: 4 } };
    const t1 = g.salvage.lots.nextAt!;
    const before = adv(g, t1 - 0.001, false);
    const I = ratedIncome(begin(cfg, before, [], false).c, before.salvage);
    const h = adv(before, t1 + 0.001, false);
    const lot = lotsOf(h.salvage)[0];
    expect(lot.g).toBeGreaterThan(0);
    const x = begin(cfg, h, [], false);
    const want = (TEST_LOTS.mu_min[2]! / 60) * I;
    // Within one gram's worth of the casing's dearest grade.
    expect(Math.abs(lotValue(x, lot) - want)).toBeLessThan(0.05 + (1 / 1000) * 10);
    const sp = lotSplit(x, lot);
    expect(sp.specs.reduce((a, q) => a + q.g, 0) + sp.waste).toBe(lot.g);
  });

  it('only the boss cuts one, in the kind\'s cut_s whatever its mass: its pieces on the floor keep its mass; cutting while four wait brings one at once', () => {
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
    const pieces = a.salvage.pieces.filter((q) => q.from === 'lot0');
    expect(pieces.reduce((s, q) => s + q.g, 0) + sp.waste).toBe(lot0.g);
    // Each piece at most its spec's grams (a batch, its mass printed); the value at p̄ is the plate's printed value.
    for (const q of pieces) expect(q.g).toBeLessThanOrEqual(x.c.objects.casing.pieces[q.spec][1]);
    expect(pieces.reduce((s, q) => s + (q.g / 1000) * pbar(x, q.grade), 0)).toBeCloseTo(lotValue(x, lot0), 6);
    // Four were waiting (nextAt null): the cut dates one at once; it came at that instant, the next a period later.
    const arrived = ev.find((e) => e.type === 'lotArrived') as Extract<SalvageEvent, { type: 'lotArrived' }>;
    expect(arrived).toBeDefined();
    expect(lotsOf(a.salvage).length).toBe(4);
    expect(a.salvage.lots.nextAt).toBeNull();
    void t0;
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
