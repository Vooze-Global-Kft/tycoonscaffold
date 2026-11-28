/**
 * Rated income made right from the works' opening (s2e-rate; yard-stage2-economy.md 2.3, package 4; RULING2.md 27.2 d, 27.4).
 * Frozen test contents (lesson 4: no tuned number of the shipped content is pinned): the works' content (salvage2works), the
 * money content (salvage2money), the first yard's test content; one bots' state of the shipped content read at stage 2 for
 * the walk "no purchase, hire or level lowers I". Owner: s2e-rate.
 *
 * - the hired driver's rule is pure functions both the driver and the replay read (truck.ts fullerFirst, fairPick,
 *   fairWaitNext) and the round the replay counts is the dated trip's own (truck.ts driverRoundS);
 * - the replay plays the shipped driver (no rank by worth: a partner's load price moves no load);
 * - I is a pure function of the assets (never of cash, sales, stock, the clock or a switch);
 * - kappa_r scales I from the works' opening only;
 * - levelGain (s2i-levels, RULING2.md 30.3) reads THE BOOK for every ladder (s1 x d^(L-1) x I), 0 where it has no entry;
 * - no purchase, hire or level (plates set down and started up) lowers I;
 * - below the works' opening I is the first yard's, bit for bit.
 */
import { describe, expect, it } from 'vitest';
import { SalvageSchema } from '../../config/schema.salvage';
import { shipped2Config } from '../fixtures/shipped2';
import { FIXTURE_NAMES, FIXTURE_NOW, SALVAGE_TEST, fixtureGame } from '../fixtures/salvage';
import { moneyCfg, r3open } from '../fixtures/salvage2money';
import { r4Game, worksCfg } from '../fixtures/salvage2works';
import { buy, hire, level } from './actions';
import { away, newBot, newSitting, playUntil, seededCfg, startGame } from './bot';
import { begin, finish } from './clock';
import { buyCheck, hireCheck, levelCheck, levelled, shopItems } from './ladder';
import { contentAt, worksOpened } from './layer';
import { levelGain, levelLadderOf, own, plateGains, ratedIncome, ratedTerms, replayIncome, replayTerms } from './rate';
import { jump } from './tick';
import { driverRoundS, fairPick, fairWaitNext, fullerFirst } from './truck';
import type { LevelTarget, SalvageConfig, SalvageGame } from './types';

const I = (cfg: SalvageConfig, g: SalvageGame) => ratedIncome(contentAt(cfg.salvage, g.salvage), g.salvage);
const C = (cfg: SalvageConfig, g: SalvageGame) => contentAt(cfg.salvage, g.salvage);

/** Every purchase, hire and level one step up, landed at once; a works plate (and the plates ordered with it) set down and running. */
function steps(cfg: SalvageConfig, g0: SalvageGame): [string, SalvageGame][] {
  const g = { ...g0, cash: 1e12 };
  const t = g.salvage.t;
  const land = (h: SalvageGame): SalvageGame => {
    let out = h;
    if (h.salvage.arriving.length) {
      const x = begin(cfg, h, [], false);
      for (const a of [...x.s.arriving]) own(x, a.item, x.s.t);
      x.s.arriving = [];
      out = finish(h, x);
    }
    const before = new Set(Object.keys(g.salvage.works ?? {}));
    const fresh = Object.keys(out.salvage.works ?? {}).filter((id) => !before.has(id));
    if (!fresh.length) return out;
    const s = structuredClone(out.salvage);
    for (const id of fresh) s.works[id] = { ...s.works[id], phase: 'running', commissionAt: null };
    return { ...out, salvage: s };
  };
  const out: [string, SalvageGame][] = [];
  for (const role of ['hand', 'cutter', 'driver'] as const) {
    const ck = hireCheck(cfg, g, role);
    if (ck.price !== null && !ck.refusal) out.push([`hire ${role}`, land(hire(cfg, g, role, ck.price, t))]);
  }
  const targets: LevelTarget[] = [
    ...g.salvage.crew.map((m) => ({ kind: 'crew', id: m.id }) as LevelTarget),
    ...(['stripper', 'bench', 'crucible'] as const).map((m) => ({ kind: 'machine', machine: m }) as LevelTarget),
    ...Object.keys(g.salvage.partners).map((p) => ({ kind: 'partner', partner: p }) as LevelTarget),
  ];
  for (const tg of targets) {
    const ck = levelCheck(cfg, g, tg);
    if (ck.price !== null && !ck.refusal) out.push([`level ${JSON.stringify(tg)}`, land(level(cfg, g, tg, ck.price, t))]);
  }
  for (const it of shopItems(C(cfg, g))) {
    if (it.kind === 'crew') continue;
    const ck = buyCheck(cfg, g, it.key);
    if (ck.price !== null && !ck.refusal) out.push([`buy ${it.key}`, land(buy(cfg, g, it.key, ck.price, t))]);
  }
  return out;
}

function noFall(cfg: SalvageConfig, g: SalvageGame): { n: number; falls: string[] } {
  const I0 = I(cfg, g);
  const falls: string[] = [];
  const all = steps(cfg, g);
  for (const [what, h] of all) if (I(cfg, h) < I0 - 0.005) falls.push(`${what}: ${I0} -> ${I(cfg, h)}`);
  return { n: all.length, falls };
}

/** One bots' state of the shipped content at stage 2: the normal hand, seed 1, played to the works' opening, then one absence (a rung-3 return). */
let BOT: { cfg: SalvageConfig; g: SalvageGame } | null = null;
function botState(): { cfg: SalvageConfig; g: SalvageGame } {
  if (BOT) return BOT;
  const NOW = Date.UTC(2026, 10, 25, 9, 0, 0);
  const cfg = seededCfg(shipped2Config((x) => SalvageSchema.parse(x)), 1);
  const b = newBot(cfg, startGame(cfg, NOW), NOW, { hand: 'normal', habit: 'goal', route: 'A', seed: 1 } as never);
  playUntil(b, (bb) => worksOpened(bb.g.salvage), 3600);
  newSitting(b);
  away(b, 11.75 * 3600);
  return (BOT = { cfg, g: b.g });
}

describe("the hired driver's rule as pure functions (truck.ts; read by driverDepart and by rated income's replay)", () => {
  it('fullerFirst: the skip full longer is taken; a tie keeps the first found', () => {
    expect(fullerFirst(5, null)).toBe(true);
    expect(fullerFirst(4, { fullAt: 5 })).toBe(true);
    expect(fullerFirst(5, { fullAt: 5 })).toBe(false);
    expect(fullerFirst(6, { fullAt: 5 })).toBe(false);
  });
  it("fairPick: the rule's choice stands while everyone can still be served in time; else the most urgent, or a wait for its room", () => {
    const w = (id: string, r: number, fullAt: number, fits = true) => ({ id, r, fullAt, fits });
    expect(fairPick([w('a', 5, 0), w('b', 5, 1)], 'b')).toBe('b');
    // b has no trip left to wait: it goes first, whatever the rule's choice
    expect(fairPick([w('a', 5, 0), w('b', 0, 1)], 'a')).toBe('b');
    expect(fairPick([w('a', 5, 0), w('b', 0, 1, false)], 'a')).toEqual({ wait: 'b' });
    expect(fairPick([], null)).toBeNull();
  });
  it("fairWaitNext: one more trip waited while a full skip waits and is not taken; else 0", () => {
    expect(fairWaitNext('a', 'b', 3, true)).toBe(4);
    expect(fairWaitNext('a', 'a', 3, true)).toBe(0);
    expect(fairWaitNext('a', 'b', 3, false)).toBe(0);
  });
});

describe("the truck's round as shipped (truck.ts driverRoundS: the dated trip's own drive, hook, weighbridge and tip)", () => {
  it('equals the driver\'s dated trip from the start of its drive out to its park, on the works\' content', () => {
    const cfg = worksCfg();
    let g: SalvageGame = { ...r4Game(), cash: 1e9 };
    const d = g.salvage.crew.find((m) => m.role === 'driver');
    expect(d, 'r4 has a hired driver').toBeTruthy();
    expect(g.salvage.truck.owned).toBe(true);
    let outAt: number | null = null;
    let parkEnd: number | null = null;
    let trip: { partner: string; slot: number } | null = null;
    for (let k = 0; k < 4000 && parkEnd === null; k++) {
      g = jump(cfg, g, g.salvage.t + 0.25);
      const tr = g.salvage.truck.trip;
      if (!tr) continue;
      if (!trip && tr.phase === 'out') {
        trip = { partner: tr.partner, slot: tr.slot };
        outAt = tr.t0;
      }
      if (trip && tr.phase === 'park') parkEnd = tr.endsAt;
    }
    expect(trip, 'a trip departed').not.toBeNull();
    expect(parkEnd).not.toBeNull();
    const dr = g.salvage.crew.find((m) => m.role === 'driver')!;
    const r = driverRoundS(C(cfg, g), trip!.partner, trip!.slot, dr.level);
    expect(parkEnd! - outAt!).toBeCloseTo(r.trip, 6);
    expect(r.hookS).toBeLessThan(r.tipS);
    expect(r.tipS).toBeLessThan(r.trip);
  }, 60_000);
});

describe('the replay plays the shipped driver, from the works\' opening', () => {
  it("a partner's load price moves no load (the shipped rule takes the skip full longest; no rank by worth)", () => {
    const cfg = worksCfg();
    const g = r4Game();
    const c = C(cfg, g);
    const T0 = replayTerms(c, g.salvage);
    const pid = Object.keys(T0.loads)[0];
    expect(pid, 'the replay takes loads').toBeTruthy();
    const c2 = { ...c, partners: { ...c.partners, [pid]: { ...c.partners[pid], k: c.partners[pid].k * 0.2 } } };
    const T1 = replayTerms(c2, g.salvage);
    expect(T1.loads).toEqual(T0.loads);
    expect(T1.spent).toBeLessThan(T0.spent);
  });
});

describe('I is a pure function of the yard\'s assets (never of cash, sales, stock, the clock or a switch)', () => {
  it('r4 (the works open): the same I after the cash, the counters, the stock, the clock and every switch are changed', () => {
    const cfg = worksCfg();
    const g = r4Game();
    const i0 = I(cfg, g);
    const s = structuredClone(g.salvage);
    s.clock.day += 2;
    for (const b of Object.values(s.bays)) {
      b.held = !b.held;
      b.g += 12_345;
    }
    for (const w of Object.values(s.works)) if (w.heat) w.heat = { ...w.heat, recipe: Object.keys(C(cfg, g).works!.plates[w.plate]?.recipes ?? {}).at(-1) ?? w.heat.recipe };
    s.counts = { ...s.counts, rackSold: (s.counts?.rackSold ?? 0) + 7, lotOpened: 3 };
    s.routes = {};
    const h = { ...g, cash: 7, lifetimeEarnings: 1e9, salvage: s };
    // a content object the cache has never seen: a fresh computation, not a cache hit
    const c = C(cfg, g);
    expect(ratedIncome({ ...c }, h.salvage)).toBe(i0);
    expect(I(cfg, h)).toBe(i0);
  });
});

describe('kappa_r (content rate.kappa) from the works\' opening only', () => {
  it('a rung\'s kappa scales I there; below the works\' opening nothing is scaled', () => {
    const cfg = worksCfg();
    const g = r4Game();
    const c = C(cfg, g);
    const rung = g.salvage.ladder.rung;
    const kappa = [null, null, 1, 1, 1].map((v, i) => (i === rung - 1 ? 1.1 : v));
    const i1 = ratedIncome(c, g.salvage);
    const ik = ratedIncome({ ...c, rate: { kappa } } as typeof c, g.salvage);
    expect(Math.abs(ik - 1.1 * i1)).toBeLessThan(0.02 * i1);
    expect(ik).toBeGreaterThan(i1);
    // the first yard's test content and states: no works, no factor
    for (const n of FIXTURE_NAMES) {
      const s = fixtureGame(n, { cash: 0, lifetimeEarnings: 0, lastSavedAt: FIXTURE_NOW, stats: { playSeconds: 0, clockHigh: FIXTURE_NOW } } as never, FIXTURE_NOW).salvage;
      expect(ratedIncome({ ...SALVAGE_TEST, rate: { kappa: [null, null, 1.15, 1.15, 1.15] } } as typeof SALVAGE_TEST, s)).toBe(ratedIncome(SALVAGE_TEST, s));
    }
  });
});

describe('levelGain (RULING2.md 30.3, s2i-levels): THE BOOK for every ladder, s1 x d^(L-1) x I; no entry: 0 (not sold)', () => {
  it('the book: s1 x d^(L-1) x I for its ladder at several L; a ladder the book does not name, s1 0, or at `to`: 0; I given or read', () => {
    const cfg = worksCfg();
    const g = r4Game();
    const c = C(cfg, g);
    const s = g.salvage;
    const crew = s.crew.map((m) => ({ kind: 'crew', id: m.id }) as LevelTarget);
    const parts = Object.keys(s.partners).map((p) => ({ kind: 'partner', partner: p }) as LevelTarget);
    // the frozen content has no book: no ladder is sold at the works (the replay prices nothing)
    for (const tg of [...crew, ...parts]) expect(levelGain(c, s, tg), JSON.stringify(tg)).toBe(0);
    const driver = s.crew.find((m) => m.role === 'driver')!;
    const tg: LevelTarget = { kind: 'crew', id: driver.id };
    expect(levelLadderOf(s, tg)).toBe('driver');
    const book = { driver: { s1: 0.04, d: 0.9, from: 1, to: driver.level + 3 } };
    const cb = { ...c, levels: { ...c.levels, book } } as typeof c;
    const I = ratedIncome(cb, s);
    expect(levelGain(cb, s, tg)).toBeCloseTo(0.04 * 0.9 ** (driver.level - 1) * I, 6);
    expect(levelGain(cb, s, tg, 1000)).toBeCloseTo(0.04 * 0.9 ** (driver.level - 1) * 1000, 9);
    // several L: one, two and three steps up read the next terms of the ladder (with the same I)
    let h = g;
    for (let k = 1; k <= 2; k++) {
      h = levelled(h, tg);
      expect(levelGain(cb, h.salvage, tg, 1000)).toBeCloseTo(0.04 * 0.9 ** (driver.level - 1 + k) * 1000, 9);
    }
    // at `to`: 0
    h = levelled(h, tg);
    expect(levelGain(cb, h.salvage, tg, 1000)).toBe(0);
    // a ladder the book does not name: 0
    const other = crew.find((t) => levelLadderOf(s, t) !== 'driver')!;
    expect(levelGain(cb, s, other)).toBe(0);
    // s1 0: not sold
    const c0 = { ...c, levels: { ...c.levels, book: { driver: { ...book.driver, s1: 0 } } } } as typeof c;
    expect(levelGain(c0, s, tg, 1000)).toBe(0);
  });

  it('s1 by rung [r3, r4, r5]: the rung's own number; a rung without one reads its nearest other rung's (the lower on a tie)', () => {
    const cfg = worksCfg();
    const g = r4Game();
    const c = C(cfg, g);
    const driver = g.salvage.crew.find((m) => m.role === 'driver')!;
    const tg: LevelTarget = { kind: 'crew', id: driver.id };
    const at = (s1: (number | null)[], rung: number) => {
      const cb = { ...c, levels: { ...c.levels, book: { driver: { s1, d: 1, from: 1, to: 99 } } } } as typeof c;
      const s = { ...g.salvage, ladder: { ...g.salvage.ladder, rung } };
      return levelGain(cb, s, tg, 1000);
    };
    expect(at([0.01, 0.02, 0.03], 3)).toBeCloseTo(10, 9);
    expect(at([0.01, 0.02, 0.03], 4)).toBeCloseTo(20, 9);
    expect(at([0.01, 0.02, 0.03], 5)).toBeCloseTo(30, 9);
    expect(at([0.01, null, null], 5)).toBeCloseTo(10, 9);
    expect(at([null, 0.02, null], 3)).toBeCloseTo(20, 9);
    expect(at([0.01, null, 0.03], 4)).toBeCloseTo(10, 9);
    expect(at([0.01, 0, 0.03], 4)).toBe(0);
    expect(at([null, null, null], 4)).toBe(0);
  });

  it('below the works\' opening: 0 whatever the book (the first yard prices its levels by its own rule)', () => {
    for (const n of FIXTURE_NAMES) {
      const s = fixtureGame(n, { cash: 0, lifetimeEarnings: 0, lastSavedAt: FIXTURE_NOW, stats: { playSeconds: 0, clockHigh: FIXTURE_NOW } } as never, FIXTURE_NOW).salvage;
      expect(worksOpened(s)).toBe(false);
      const cb = { ...SALVAGE_TEST, levels: { ...SALVAGE_TEST.levels, book: { cutter: { s1: 0.5, d: 1, from: 1, to: 99 }, hand: { s1: 0.5, d: 1, from: 1, to: 99 }, driver: { s1: 0.5, d: 1, from: 1, to: 99 } } } } as typeof SALVAGE_TEST;
      for (const m of s.crew) expect(levelGain(cb, s, { kind: 'crew', id: m.id }, 1000)).toBe(0);
    }
  });
});

describe('no purchase, hire or level lowers I (ruling 17; every step of the walk, plates set down and running)', () => {
  for (const [name, mk] of [['r3open (money content)', () => ({ cfg: moneyCfg(), g: r3open() })], ['r4 (works content)', () => ({ cfg: worksCfg(), g: r4Game() })]] as const) {
    it(`${name}`, () => {
      const { cfg, g } = mk();
      expect(worksOpened(g.salvage)).toBe(true);
      const r = noFall(cfg, g);
      expect(r.n).toBeGreaterThan(5);
      expect(r.falls).toEqual([]);
    }, 120_000);
  }
  it("a bots' state of the shipped content at stage 2 (the normal hand, seed 1, the first return after the works' opening)", () => {
    const { cfg, g } = botState();
    expect(worksOpened(g.salvage)).toBe(true);
    const r = noFall(cfg, g);
    expect(r.n).toBeGreaterThan(5);
    expect(r.falls).toEqual([]);
  }, 240_000);
});

describe("below the works' opening I is the first yard's, bit for bit", () => {
  it('the five frozen first-yard states on the test content: I as before this package (measured against rate.ts at a624652, the commit before it: every term equal)', () => {
    const base = { cash: 0, lifetimeEarnings: 0, lastSavedAt: FIXTURE_NOW, stats: { playSeconds: 0, clockHigh: FIXTURE_NOW } } as never;
    const got = Object.fromEntries(FIXTURE_NAMES.map((n) => [n, ratedTerms(SALVAGE_TEST, fixtureGame(n, base, FIXTURE_NOW).salvage).I]));
    expect(got).toEqual({ fresh: 0, m5: 2088, m15: 5040.1, m30: 5040.1, back: 5040.1 });
  });
});

describe("s2g-rate (RULING2.md 29.4): the halls' term reads what the replay's bays receive by grade, the crucible's claim first", () => {
  /** r4 on the works' content with every hall past its first heat and the first yard's crucible owned and poured. */
  const poured = (crucible = true): SalvageGame['salvage'] => {
    const s = structuredClone(r4Game().salvage);
    for (const id of Object.keys(s.works)) if (s.works[id].heat) s.counts![`poured:${id}`] = 1;
    s.machines.crucible.owned = crucible;
    s.counts!.poured = crucible ? 1 : 0;
    return s;
  };
  /** The works' test content with the induction hall's brass recipe paying far more a kilogram than the crucible's gain on brass. */
  const richBrass = () => {
    const c = structuredClone(C(worksCfg(), r4Game())) as SalvageConfig['salvage'];
    const rec = c.works!.plates.induction.recipes!.brass as { out: [string, number][] };
    rec.out = [['bb', 1]];
    return c;
  };
  it('each plate takes at most what the bays receive of a grade no plate makes, and a hall at most its heats\' capacity an hour', () => {
    const s = poured();
    const c = C(worksCfg(), { salvage: s } as SalvageGame);
    const { flow, plates } = plateGains(c, s);
    expect(Object.keys(plates).length).toBeGreaterThan(0);
    const made = new Set<string>();
    for (const d of Object.values(c.works!.plates)) {
      for (const outs of Object.values(d.out ?? {})) for (const [o] of outs) made.add(o);
      for (const r of Object.values(d.recipes ?? {})) for (const [o] of r.out) made.add(o);
    }
    const taken: Record<string, number> = {};
    for (const p of Object.values(plates)) for (const [g, kg] of Object.entries(p.grades)) taken[g] = (taken[g] ?? 0) + kg;
    for (const [g, kg] of Object.entries(taken)) if (!made.has(g)) expect(kg).toBeLessThanOrEqual((flow[g] ?? 0) + 1e-6);
    for (const [id, p] of Object.entries(plates)) {
      const d = c.works!.plates[id];
      if (d.kind !== 'batch' || !d.batch) continue;
      const cap = (3600 * d.batch.kg * (1 + d.lev * Math.max(0, s.works[id].level - 1))) / d.batch.s;
      expect(p.kg).toBeLessThanOrEqual(cap + 1e-6);
      expect(p.add).toBeGreaterThanOrEqual(0);
    }
  });
  it("the crucible's claim comes first: what it melts no hall takes back, even a hall that pays more a kilogram; without it the hall takes the flow", () => {
    const c = richBrass();
    const s = poured(true);
    const melt = replayTerms(c, s).detail?.melt ?? {};
    expect(melt.brs?.kg ?? 0).toBeGreaterThan(0);
    const a = plateGains(c, s);
    expect(a.flow.brs ?? 0).toBeLessThan(1e-6);
    expect(a.plates.induction?.grades.brs ?? 0).toBe(0);
    // The crucible never poured (it earns nothing away, 14.5): the brass is the bays', and the induction hall takes it.
    const s0 = poured(false);
    const b = plateGains(c, s0);
    expect(b.flow.brs ?? 0).toBeGreaterThan(0);
    expect(b.plates.induction?.grades.brs ?? 0).toBeCloseTo(b.flow.brs, 6);
  });
  it("a hall is counted at the recipe it would choose, never at a switch: its recipe tapped or pinned, Take from bays: the same parts and the same I", () => {
    const c = richBrass();
    const s = poured(false);
    const ref = plateGains(c, s);
    const I0 = ratedIncome(c, s);
    for (const recipe of ['bronze', 'brass']) {
      const t = structuredClone(s);
      const h = t.works.induction.heat as unknown as Record<string, unknown>;
      h.recipe = recipe;
      h.pinned = true;
      h.fromBays = false;
      expect(plateGains(c, t)).toEqual(ref);
      expect(ratedIncome(c, t)).toBe(I0);
    }
  });
  it("below the works' opening there is no plates' term", () => {
    const base = { cash: 0, lifetimeEarnings: 0, lastSavedAt: FIXTURE_NOW, stats: { playSeconds: 0, clockHigh: FIXTURE_NOW } } as never;
    for (const n of FIXTURE_NAMES) expect(plateGains(SALVAGE_TEST, fixtureGame(n, base, FIXTURE_NOW).salvage)).toEqual({ flow: {}, plates: {} });
  });
});
