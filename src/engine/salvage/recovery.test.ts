/**
 * THE SHREDDER LINE'S CARS BY THE GARAGE'S OWN RECOVERY TRUCK (s2f-plasma-cars; RULING2.md 28.7 b): from the line's
 * start-up the partner's recovery truck sets a car on the truck-fed bay's apron whenever the apron is free, at most one a
 * period, the yard paying the car's label price as it lands (cash less the driver's reserve allowing; else the car waits:
 * nothing expires, nothing is owed); the hook-lift fetches no car. A dated arrival: a tick equals a jump, an absence in 2
 * and in 11 passes equals one, a save in the middle plays on. On the works' frozen test content made into a line with a
 * recovery truck here (`recCfg`; no tuned number read). The last block reads the SHIPPED stage for its shape only.
 */
import { describe, expect, it } from 'vitest';
import gameJson from '../../../games/scrap-yard/game.json';
import { SalvageSchema, type SalvageContent } from '../../config/schema.salvage';
import { r3Works, worksCfg } from '../fixtures/salvage2works';
import * as R from '../salvage';
import { awayPass } from './away';
import { cardOfWorks } from './cardsWorks';
import { begin, finish, type Ctx } from './clock';
import { contentAt, mergedContent } from './layer';
import { grownContents } from './partners';
import { carTerm, ratedTerms } from './rate';
import { reconcileSalvage } from './save';
import { jump } from './tick';
import { carLabelPrice, lineOf, orderPlate, recoveryOf } from './works';
import type { SalvageConfig, SalvageEvent, SalvageGame, SalvageState } from './types';

type Any = any; // eslint-disable-line @typescript-eslint/no-explicit-any

const cache = new Map<string, SalvageConfig>();
/** The works' test content with the line (the shredder `with` the bay, the bay fed by the truck), the garage's rotation without a flatrack and its recovery truck every `period` s; the bay drains a car in `drain` s. */
function recCfg(period = 300, drain = 100): SalvageConfig {
  const key = `${period}|${drain}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const base = worksCfg();
  const c = structuredClone(base.salvage) as Any;
  c.works.plates.shredder = { ...c.works.plates.shredder, with: ['depollution'] };
  c.works.plates.depollution = { ...c.works.plates.depollution, row: 'shredder', feedBy: 'truck', gate: 'rung99' };
  c.worksLayer.shop = c.worksLayer.shop.map((it: Any) => (it.key === 'depollution' ? { ...it, gate: 'rung99' } : it));
  const gp = c.worksLayer.partners['partner.garage'];
  gp.grows = gp.grows.filter((g: Any) => g.body !== 'flatrack');
  gp.recovery = { needs: 'shredder', obj: 'elv', period_s: period };
  c.depollution = { ...c.depollution, s: drain };
  const cfg = { ...base, salvage: c } as SalvageConfig;
  cache.set(key, cfg);
  return cfg;
}
function act(cfg: SalvageConfig, g: SalvageGame, body: (x: Ctx) => void, live = true): SalvageGame {
  const x = begin(cfg, g, [], live);
  body(x);
  return finish(g, x);
}
/** A quiet r3 (nobody, nothing sold, no partner open, no drop-off, no lots) with the line ordered; `running`: started up now. */
function quietLine(cfg: SalvageConfig, cash: number, running = true): SalvageGame {
  return act(cfg, { ...r3Works(), cash }, (x) => {
    orderPlate(x, 'shredder', x.s.t);
    if (running) for (const id of lineOf(x.c, 'shredder')) x.s.works[id] = { ...x.s.works[id], phase: 'running', status: 'idle', commissionAt: null, commissionedBy: 'self' };
    for (const p of Object.values(x.s.partners)) p.open = false;
    x.s.crew = [];
    x.s.things = x.s.things.filter((t) => t.at.at === 'zone');
    x.s.pieces = [];
    x.s.dropoff.nextAt = -1;
    for (const b of Object.values(x.s.bays)) b.held = true;
    x.s.merchant = { ...x.s.merchant, phase: 'waiting', endsAt: null, lot: [] };
    x.s.lots = { ...x.s.lots, nextAt: null };
    x.s.reuse = { ...x.s.reuse, nextAt: null, vanAt: null };
    x.s.presenceAt = -1;
  });
}
const stale = (g: SalvageGame): SalvageGame => ({ ...g, salvage: { ...g.salvage, presenceAt: -1 } }) as SalvageGame;
const landings = (ev: SalvageEvent[]) => ev.filter((e): e is Extract<SalvageEvent, { type: 'carLanded' }> => e.type === 'carLanded');
const onApron = (s: SalvageState) => s.things.filter((t) => t.at.at === 'apron');
/** Jump in steps of `dt` to `to`, collecting events and the instant of each landing. */
function walk(cfg: SalvageConfig, g0: SalvageGame, span: number, dt = 7): { g: SalvageGame; at: number[]; ev: SalvageEvent[] } {
  let g = g0;
  const at: number[] = [];
  const all: SalvageEvent[] = [];
  for (let t = g0.salvage.t + dt; t <= g0.salvage.t + span + 1e-9; t += dt) {
    const ev: SalvageEvent[] = [];
    g = jump(cfg, g, t, ev);
    for (const e of landings(ev)) at.push(g.salvage.works.depollution.carLandedAt!);
    all.push(...ev);
  }
  return { g, at, ev: all };
}
const totalG = (s: SalvageState): number =>
  Object.values(s.bays).reduce((a, b) => a + b.g, 0) + s.merchant.lot.reduce((a, l) => a + l.g, 0) + s.ladder.supplied_g +
  Object.values(s.works).reduce((a, w) => a + w.hopper.reduce((q, p) => q + p.g, 0) + (w.work ? w.work.piece.g : 0), 0);
const whole = (g: SalvageGame): unknown => {
  const s = JSON.parse(JSON.stringify(g.salvage)) as Record<string, unknown>;
  for (const k of ['clock', 'epoch', 'away']) delete s[k];
  return { cash: Math.round(g.cash * 100), s };
};
/** As dropoffWorks.test.ts's core: the act's start is the pass's own (each pass starts a fresh no-act). */
const core = (g: SalvageGame): unknown => {
  const w = whole(g) as { s: Record<string, unknown> };
  if (w.s.act) delete (w.s.act as Record<string, unknown>).since;
  // the yard clock to the microsecond (a pass cut in two adds its seconds in two sums: one ulp, the clock's, not the rule's)
  w.s.t = Math.round((w.s.t as number) * 1e6) / 1e6;
  return w;
};

describe('s2f: the recovery truck brings the line\'s cars', () => {
  it('no car before the line runs (ordered, set down, installed); from its start-up one at once', () => {
    const cfg = recCfg();
    const g = quietLine(cfg, 100_000, false);
    const w = g.salvage.works.shredder;
    expect(w.phase).toBe('arriving');
    const ev: SalvageEvent[] = [];
    const set = jump(cfg, stale(g), w.commissionAt! + 0.5, ev);
    expect(set.salvage.works.depollution.phase).toBe('installed');
    const before = jump(cfg, set, set.salvage.works.shredder.commissionAt! - 0.5, ev);
    expect(onApron(before.salvage)).toEqual([]);
    expect(landings(ev)).toEqual([]);
    const start = before.salvage.works.shredder.commissionAt!;
    const up = jump(cfg, before, start + 0.5, ev);
    expect(up.salvage.works.depollution.phase).toBe('running');
    expect(landings(ev)).toHaveLength(1);
    expect(up.salvage.works.depollution.carLandedAt).toBeCloseTo(start, 9);
    expect(onApron(up.salvage).map((t) => [t.obj, t.at, t.sender])).toEqual([['elv', { at: 'apron', plate: 'depollution' }, 'partner.garage']]);
  });

  it('at most one a period (drain shorter than the period): landings exactly a period apart', () => {
    const cfg = recCfg(300, 100);
    const { at } = walk(cfg, quietLine(cfg, 1e6), 2000);
    expect(at.length).toBe(7);
    for (let i = 1; i < at.length; i++) expect(at[i] - at[i - 1]).toBeCloseTo(300, 6);
  });

  it('none while the apron holds a car (drain longer than the period): each lands the instant the last is drained', () => {
    const cfg = recCfg(300, 700);
    const { g, at, ev } = walk(cfg, quietLine(cfg, 1e6), 3000);
    expect(at.length).toBe(5);
    for (let i = 1; i < at.length; i++) expect(at[i] - at[i - 1]).toBeCloseTo(700, 6);
    // never two cars on the apron, and every landing after the drain before it
    expect(onApron(g.salvage).length).toBeLessThanOrEqual(1);
    expect(ev.filter((e) => e.type === 'depolluted').length).toBe(at.length - 1);
  });

  it('none while the cash less the driver\'s reserve does not cover its price; it comes once it does, and nothing is owed', () => {
    const cfg = recCfg();
    const g0 = quietLine(cfg, 100_000);
    const price = carLabelPrice(begin(cfg, g0, [], false), 'depollution', g0.salvage.t)!;
    expect(price).toBeGreaterThan(0);
    // short: half its price (the day's prices move it by less)
    const short = { ...g0, cash: price / 2 };
    const ev: SalvageEvent[] = [];
    const a = jump(cfg, short, short.salvage.t + 1500, ev);
    expect(landings(ev)).toEqual([]);
    expect(a.cash).toBeCloseTo(price / 2, 1);
    // the driver's reserve counts against it: cash twice the price, three halves of it held for his load
    const held = act(cfg, { ...g0, cash: 2 * price }, (x) => {
      x.s.truck.earmark = { money: 1.5 * price, floor_g: 0 };
    });
    const ev2: SalvageEvent[] = [];
    jump(cfg, held, held.salvage.t + 1500, ev2);
    expect(landings(ev2)).toEqual([]);
    // the yard can pay (an ad's reward, a grant: the cash moves outside the yard's instants): it lands at the yard's next
    // instant (here an oversize piece's arrival ten seconds on; in a working yard the next of its many events)
    const paid = act(cfg, { ...a, cash: 2 * price }, (x) => {
      x.s.lots = { ...x.s.lots, nextAt: x.s.t + 10 };
    });
    const ev3: SalvageEvent[] = [];
    const b = jump(cfg, paid, paid.salvage.t + 10.5, ev3);
    const l = landings(ev3);
    expect(l).toHaveLength(1);
    expect(b.salvage.works.depollution.carLandedAt).toBeCloseTo(paid.salvage.t + 10, 9);
    expect(l[0].price).toBe(carLabelPrice(begin(cfg, b, [], false), 'depollution', b.salvage.works.depollution.carLandedAt!));
    expect(paid.cash - b.cash).toBeCloseTo(l[0].price, 1); // the cash is kept in hundredths
  });

  it('the price paid is the label\'s, and the bay\'s card says it (shown equals applied)', () => {
    const cfg = recCfg();
    const g0 = quietLine(cfg, 50_000);
    const card = cardOfWorks(cfg, g0, { kind: 'works', plate: 'depollution' } as never, 0, { country: null });
    const row = card.rows.find((r) => r.id === 'carPrice')!;
    expect(row.name.key).toBe('card.works.carPrice');
    const shown = (row.name.args as Any).x.money as number;
    const ev: SalvageEvent[] = [];
    const g = jump(cfg, g0, g0.salvage.t + 1, ev);
    const l = landings(ev);
    expect(l).toHaveLength(1);
    expect(l[0].price).toBe(shown);
    expect(g0.cash - g.cash).toBeCloseTo(shown, 6);
    // the shredder's own card has no such row
    expect(cardOfWorks(cfg, g0, { kind: 'works', plate: 'shredder' } as never, 0, { country: null }).rows.some((r) => r.id === 'carPrice')).toBe(false);
  });

  it('mass through a car: drained and shredded, its grams are in the bays, the supplied tonnes and the waste carrier\'s', () => {
    const cfg = recCfg(5000, 100);
    const g0 = quietLine(cfg, 50_000);
    const g1 = jump(cfg, g0, g0.salvage.t + 1);
    expect(onApron(g1.salvage)).toHaveLength(1);
    const done = jump(cfg, g1, g1.salvage.t + 1500);
    expect(onApron(done.salvage)).toEqual([]);
    expect(done.salvage.counts!.depolluted).toBe(1);
    const elv = mergedContent(cfg.salvage).objects.elv.gross_g;
    expect(totalG(done.salvage) - totalG(g0.salvage) + (done.salvage.waste_g - g0.salvage.waste_g)).toBe(elv);
  });

  it('a tick equals a jump (0.5 s ticks over 900 s, whole state)', () => {
    const cfg = recCfg(300, 100);
    const g = quietLine(cfg, 1e6);
    let a = g;
    let ms = g.salvage.clock.highMs;
    for (let i = 0; i < 1800; i++) {
      ms += 500;
      a = R.advanceSalvage(cfg, a, 0.5, ms);
    }
    const j = jump(cfg, g, a.salvage.t);
    expect(whole(j)).toEqual(whole(a));
    expect(j.salvage.counts!.recovered).toBe(3);
  }, 120_000);

  it('an absence in 2 and in 11 passes equals one; the cash running short and back on the way', () => {
    const cfg = recCfg(300, 100);
    const g0 = { ...quietLine(cfg, 4000), lastSavedAt: 0 } as SalvageGame;
    const from = g0.salvage.clock.highMs;
    const T = 3 * 3600_000;
    const one = awayPass(cfg, { ...g0, lastSavedAt: from }, from + T);
    const cut = (at: number[]) => {
      let g = { ...g0, lastSavedAt: from } as SalvageGame;
      for (const c of [...at, 1].sort((p, q) => p - q)) g = awayPass(cfg, g, from + Math.round(c * T));
      return g;
    };
    const n = one.salvage.counts!.recovered ?? 0;
    expect(n).toBeGreaterThan(0);
    // §4,000 buys only some of the period's cars: the rest waited and nothing was owed
    expect(n).toBeLessThan(T / 1000 / 300);
    expect(one.cash).toBeGreaterThanOrEqual(0);
    expect(core(cut([0.5]))).toEqual(core(one));
    let k = 7;
    const rnd = () => ((k = (k * 1103515245 + 12345) >>> 0) / 2 ** 32);
    expect(core(cut(Array.from({ length: 10 }, () => rnd())))).toEqual(core(one));
  }, 300_000);

  it('a save in the middle: reloaded, it plays on as without the save', () => {
    const cfg = recCfg(300, 100);
    const g0 = quietLine(cfg, 1e6);
    const mid = jump(cfg, stale(g0), g0.salvage.t + 450);
    expect(typeof mid.salvage.works.depollution.carLandedAt).toBe('number');
    const raw = JSON.parse(JSON.stringify({ salvage: mid.salvage }));
    const loaded = reconcileSalvage(cfg, { ...mid, salvage: undefined } as never, raw, mid.salvage.clock.highMs);
    expect(loaded.salvage.works.depollution.carLandedAt).toBe(mid.salvage.works.depollution.carLandedAt);
    const a = jump(cfg, stale({ ...loaded, cash: mid.cash }), mid.salvage.t + 1200);
    const b = jump(cfg, mid, mid.salvage.t + 1200);
    expect(a.salvage.counts!.recovered).toBe(b.salvage.counts!.recovered);
    expect(a.salvage.works.depollution.carLandedAt).toBe(b.salvage.works.depollution.carLandedAt);
    expect(a.cash).toBeCloseTo(b.cash, 6);
  });

  it('rated income\'s line term reads the same rule: 3600 / max(period, drain) cars an hour, no skip displaced', () => {
    for (const [P, D] of [[300, 100], [300, 700]] as const) {
      const cfg = recCfg(P, D);
      const g = quietLine(cfg, 1e6);
      const c = contentAt(cfg.salvage, g.salvage);
      const a = carTerm(c, g.salvage, {});
      expect(a.cars).toBeCloseTo(3600 / Math.max(P, D), 9);
      // no skip displaced: the garage's loads change nothing of the term
      const b = carTerm(c, g.salvage, { 'partner.garage': 20 });
      expect(b.net).toBeCloseTo(a.net, 9);
      expect(a.kg.cbody).toBeGreaterThan(0);
      expect(recoveryOf(c, 'depollution')?.period_s).toBe(P);
      // and I counts it: with the line's bay not running, less
      const off = { ...g.salvage, works: { ...g.salvage.works, depollution: { ...g.salvage.works.depollution, phase: 'installed' as const } } };
      expect(ratedTerms(c, g.salvage).I).toBeGreaterThan(ratedTerms(c, off).I);
    }
  });
});

// ---------------------------------------------------------------------------------------- the shipped stage 2
const RAW = (gameJson as Any).salvage;
const shipped = (): SalvageContent => SalvageSchema.parse({ ...structuredClone(RAW), release: { stage: 2 } });

describe('s2f: the shipped stage 2 (its shape, no tuned number)', () => {
  it('the hook-lift\'s trips never carry a car: no partner has a flatrack load, whatever plates are owned; the garage\'s recovery truck serves the bay', () => {
    const c = mergedContent(shipped());
    for (const [pid, p] of Object.entries(c.partners)) expect((p.grows ?? []).filter((g) => g.body === 'flatrack'), pid).toEqual([]);
    expect(recoveryOf(c, 'depollution')?.partner).toBe('partner.garage');
    // every plate owned: the garage's rotation over many fills brings no car
    const cfg = { mode: 'salvage', salvage: shipped() } as unknown as SalvageConfig;
    const x = begin(cfg, r3Works(), [], false);
    x.c = c;
    for (const id of Object.keys(c.works!.plates)) x.s.works[id] = { ...(x.s.works[id] ?? ({} as Any)), plate: id, phase: 'running' } as Any;
    x.s.counts = { ...(x.s.counts ?? {}) };
    for (let k = 0; k < 24; k++) expect(Object.keys(grownContents(x, 'partner.garage'))).not.toContain('elv');
  });
});
