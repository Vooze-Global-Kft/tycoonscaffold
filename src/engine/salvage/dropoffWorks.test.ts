/**
 * s2e-dropoff (RULING2.md 28.3): FROM THE WORKS' OPENING THE PUBLIC DROP-OFF KEEPS ITS OWN PACE. With the content key
 * `works.dropoffPeriod_s` (P), once the works have opened, the next arrival is never dated earlier than P after the last
 * (`dropoff.lastAt`, written only then); a thing taken from a FULL drop-off is no longer replaced at that instant. Below the
 * works' opening, and with the key absent, today's rule bit for bit. Frozen test contents only (lesson 4): the works' content
 * (fixtures/salvage2works.ts: its drop-off period 50 s, 8 places) and the money content (r3open), each with the key added
 * here. Owner: s2e-dropoff.
 *
 *  (a) below the works' opening (key present): a take from a full drop-off dates the next arrival at that instant; no lastAt;
 *  (b) from the works' opening with the key: at most one arrival a period over an hour with the drop-off full and hands
 *      taking as fast as they can; exactly a period after the last arrival where a place was free all along;
 *  (c) the key absent: today's rule at the works too (no lastAt);
 *  (d) a tick equals a jump, and an absence in 2 and in 11 passes equals one, the drop-off full and hands taking;
 *  (e) a save made before the field (no lastAt) loads and plays;
 *  (f) rated income's replay reads the same bound (its drop-off arrivals an hour at most 3600 / P), and no purchase,
 *      hire or level lowers rated income on the frozen states with the key.
 */
import { describe, expect, it } from 'vitest';
import { stage2Cfg, stage2Game } from '../fixtures/salvage';
import { r3open } from '../fixtures/salvage2money';
import { r3Works, r4Game, worksCfg } from '../fixtures/salvage2works';
import * as R from '../salvage';
import { buy, hire, level } from './actions';
import { awayPass } from './away';
import { begin, finish } from './clock';
import { buyCheck, hireCheck, levelCheck, shopItems } from './ladder';
import { contentAt, worksOpened } from './layer';
import { own, ratedIncome, ratedTerms } from './rate';
import { reconcileSalvage } from './save';
import { dropoffArrive, dropoffCount, thingGone, worksDropoffPeriod } from './things';
import type { LevelTarget, SalvageConfig, SalvageGame } from './types';

const base = worksCfg();

/** s2i-levels (RULING2.md 30.3): a TEST BOOK selling every ladder of the content (2 % of I, decay 0.9; no shipped number): from the works' opening a level is sold only by the book, and the frozen content has none. */
function withLadderBook(cfg: SalvageConfig, s1 = 0.02): SalvageConfig {
  const c = cfg.salvage;
  const ids = ['cutter', 'hand', 'driver', 'stripper', 'bench', 'crucible', ...Object.keys(c.partners), ...Object.keys((c.worksLayer as { partners?: object } | undefined)?.partners ?? {})];
  const book = Object.fromEntries(ids.map((id) => [id, { s1, d: 0.9, from: 1, to: 99 }]));
  return { ...cfg, salvage: { ...c, levels: { ...c.levels, book } } } as SalvageConfig;
}
/** The works' content with that book (fastFull's levels; one object). */
const LEVELLED = withLadderBook(base);
/** A config with works.dropoffPeriod_s set (or removed with `undefined`): a new content object, so the rules' caches are its own. */
function withKey(p: number | (number | null)[] | undefined, c0: SalvageConfig = base): SalvageConfig {
  const w = { ...c0.salvage.works! } as Record<string, unknown>;
  if (p === undefined) delete w.dropoffPeriod_s;
  else w.dropoffPeriod_s = p;
  return { ...c0, salvage: { ...c0.salvage, works: w } } as unknown as SalvageConfig;
}
const PERIOD = base.salvage.dropoff.period;
const PLACES = base.salvage.dropoff.places;
const K50 = withKey(PERIOD);
const K2 = withKey(2 * PERIOD);
const NOKEY = withKey(undefined);

const stale = (g: SalvageGame): SalvageGame => ({ ...g, salvage: { ...g.salvage, presenceAt: g.salvage.t - 100 } }) as SalvageGame;
const whole = (g: SalvageGame): unknown => {
  const s = JSON.parse(JSON.stringify(g.salvage)) as Record<string, unknown>;
  for (const k of ['clock', 'epoch', 'away']) delete s[k];
  return { cash: Math.round(g.cash * 100), earned: Math.round((g.lifetimeEarnings ?? 0) * 100), s };
};
function core(g: SalvageGame): unknown {
  const s = JSON.parse(JSON.stringify(g.salvage)) as Record<string, unknown>;
  for (const k of ['away', 'epoch', 'clock']) delete s[k];
  if (s.act) delete (s.act as Record<string, unknown>).since;
  return { cash: Math.round(g.cash * 100), earned: Math.round(g.lifetimeEarnings * 100), s };
}
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32;
}

/** Fill every free place of the drop-off with things of the mix (uids d<n>, the counter advanced), nothing dated. */
function fillDropoff(g: SalvageGame, c: SalvageConfig = base): SalvageGame {
  const s = structuredClone(g.salvage);
  const mix = c.salvage.dropoff.mix;
  const used = new Set(s.things.filter((q) => q.at.at === 'dropoff').map((q) => (q.at as { slot: number }).slot));
  for (let k = 0; k < c.salvage.dropoff.places; k++) {
    if (used.has(k)) continue;
    s.things.push({ uid: `d${s.dropoff.n}`, obj: mix[k % mix.length][0], at: { at: 'dropoff', slot: k }, cut: 0, progress: 0, by: null });
    s.dropoff.n += 1;
  }
  s.dropoff.nextAt = -1;
  return { ...g, salvage: s };
}

/** r4 with the hands and the cutter as fast as the test content allows (every hand hired, each crew level bought five times), the drop-off full. */
let FAST: SalvageGame | null = null;
function fastFull(): SalvageGame {
  if (FAST) return structuredClone(FAST);
  let g: SalvageGame = { ...(structuredClone(r4Game()) as SalvageGame), cash: 1e12 };
  for (let i = 0; i < 8; i++) {
    const ck = hireCheck(base, g, 'hand');
    if (ck.price === null || ck.refusal) break;
    g = hire(base, g, 'hand', ck.price, g.salvage.t);
  }
  for (let j = 0; j < 5; j++)
    for (const m of g.salvage.crew.filter((q) => q.role === 'hand' || q.role === 'cutter')) {
      const ck = levelCheck(LEVELLED, g, { kind: 'crew', id: m.id });
      if (ck.price !== null && !ck.refusal) g = level(LEVELLED, g, { kind: 'crew', id: m.id }, ck.price, g.salvage.t);
    }
  g = R.jump(base, g, g.salvage.t + 60);
  FAST = fillDropoff(g);
  return structuredClone(FAST);
}

/** Take one waiting thing from the drop-off at the state's clock (as a cutter or hand finishing it would: thingGone). */
function takeOne(cfg: SalvageConfig, g: SalvageGame, at?: number): SalvageGame {
  const x = begin(cfg, g, [], true);
  const th = x.s.things.find((q) => q.at.at === 'dropoff')!;
  thingGone(x, th, 'test', at ?? x.s.t);
  return finish(g, x);
}

describe('worksDropoffPeriod: read only once the works have opened, by rung', () => {
  it('null below the works\' opening and with the key absent; a number; a list by rung (past its end its last, before its first value that value)', () => {
    const pre = stage2Game('r3');
    expect(worksOpened(pre.salvage)).toBe(false);
    expect(worksDropoffPeriod(K50.salvage, pre.salvage)).toBeNull();
    const open = r3Works().salvage;
    expect(worksOpened(open)).toBe(true);
    expect(worksDropoffPeriod(NOKEY.salvage, open)).toBeNull();
    expect(worksDropoffPeriod(K50.salvage, open)).toBe(PERIOD);
    const at = (rung: number, p: (number | null)[]) => worksDropoffPeriod(withKey(p).salvage, { ...open, ladder: { ...open.ladder, rung } });
    expect(at(3, [null, null, 40, 60])).toBe(40);
    expect(at(4, [null, null, 40, 60])).toBe(60);
    expect(at(5, [null, null, 40, 60])).toBe(60);
    expect(at(2, [null, null, 40, 60])).toBe(40);
  });
});

describe("(a) below the works' opening the drop-off behaves exactly as today", () => {
  it('a take from a full drop-off: the next arrival at that instant; an arrival writes no lastAt (key present, works not open)', () => {
    const cfg = withKey(PERIOD * 3, stage2Cfg('r3'));
    const pre = fillDropoff(stage2Game('r3'), cfg);
    expect(worksOpened(pre.salvage)).toBe(false);
    const t = pre.salvage.t;
    const g = takeOne(cfg, pre);
    expect(g.salvage.dropoff.nextAt).toBe(t);
    expect('lastAt' in g.salvage.dropoff).toBe(false);
    const x = begin(cfg, g, [], true);
    dropoffArrive(x, t);
    expect(x.s.dropoff.nextAt).toBe(-1);
    expect('lastAt' in x.s.dropoff).toBe(false);
    // Two places free, one arrives: the next a dropoff.period later, as today.
    const y = begin(cfg, takeOne(cfg, takeOne(cfg, finish(g, x))), [], true);
    expect(dropoffCount(y)).toBe(cfg.salvage.dropoff.places - 2);
    dropoffArrive(y, t + 1);
    expect(y.s.dropoff.nextAt).toBe(t + 1 + cfg.salvage.dropoff.period);
    expect('lastAt' in y.s.dropoff).toBe(false);
  });

  it('the same take with and without the key before the works open: the same whole state', () => {
    const cfg = stage2Cfg('r3');
    const g0 = fillDropoff(stage2Game('r3'), cfg);
    const a = takeOne(withKey(PERIOD * 3, cfg), g0);
    const b = takeOne(cfg, g0);
    expect(whole(a)).toEqual(whole(b));
  });
});

describe("(b) from the works' opening with the key: at most one arrival a period", () => {
  it('a take from a full drop-off: dated one period after the last arrival; long after it, at that instant', () => {
    const g0 = fastFull();
    expect(worksOpened(g0.salvage)).toBe(true);
    const t = g0.salvage.t;
    const L = t - 10;
    const withLast = { ...g0, salvage: { ...g0.salvage, dropoff: { ...g0.salvage.dropoff, lastAt: L } } };
    expect(takeOne(K50, withLast).salvage.dropoff.nextAt).toBe(L + PERIOD);
    expect(takeOne(K2, withLast).salvage.dropoff.nextAt).toBe(L + 2 * PERIOD);
    const long = { ...g0, salvage: { ...g0.salvage, dropoff: { ...g0.salvage.dropoff, lastAt: t - 10 * PERIOD } } };
    expect(takeOne(K50, long).salvage.dropoff.nextAt).toBe(t);
    // Today's rule beside it: at that instant.
    expect(takeOne(NOKEY, withLast).salvage.dropoff.nextAt).toBe(t);
  });

  it('an arrival writes lastAt; with a place free the next is a period after it (the longer of dropoff.period and P)', () => {
    const g0 = takeOne(K50, takeOne(K50, fastFull()));
    const t = g0.salvage.t + 1;
    for (const [cfg, next] of [[K50, PERIOD], [K2, 2 * PERIOD], [withKey(PERIOD / 2), PERIOD]] as const) {
      const x = begin(cfg, g0, [], true);
      expect(dropoffCount(x)).toBe(PLACES - 2);
      dropoffArrive(x, t);
      expect(x.s.dropoff.lastAt).toBe(t);
      expect(x.s.dropoff.nextAt).toBe(t + next);
    }
  });

  it('an hour with the drop-off full and the hands taking as fast as they can: at most 3600 / P arrivals (P = the period and twice it); without the key more', () => {
    const g0 = stale(fastFull());
    const n0 = g0.salvage.dropoff.n;
    const arrivals = (cfg: SalvageConfig) => R.jump(cfg, g0, g0.salvage.t + 3600).salvage.dropoff.n - n0;
    const free = arrivals(NOKEY);
    const b50 = arrivals(K50);
    const b100 = arrivals(K2);
    expect(b50).toBeLessThanOrEqual(Math.floor(3600 / PERIOD) + 1);
    expect(b100).toBeLessThanOrEqual(Math.floor(3600 / (2 * PERIOD)) + 1);
    expect(b100).toBeGreaterThanOrEqual(Math.floor(3600 / (2 * PERIOD)) - 1);
    // The state is one where the old rule gives more than a period's worth (else this test would prove nothing).
    expect(free).toBeGreaterThan(Math.floor(3600 / PERIOD) + 1);
  }, 120_000);

  it('every arrival of that hour at least a period after the one before (the arrivals dated by stepping the queue)', () => {
    let g = stale(fastFull());
    const T = g.salvage.t + 3600;
    const times: number[] = [];
    let n = g.salvage.dropoff.n;
    while (g.salvage.t < T - 1e-9) {
      g = R.jump(K2, g, Math.min(T, g.salvage.t + 5));
      if (g.salvage.dropoff.n !== n) {
        expect(g.salvage.dropoff.n).toBe(n + 1);
        times.push(g.salvage.dropoff.lastAt!);
        n = g.salvage.dropoff.n;
      }
    }
    expect(times.length).toBeGreaterThan(10);
    for (let i = 1; i < times.length; i++) expect(times[i] - times[i - 1]).toBeGreaterThanOrEqual(2 * PERIOD - 1e-9);
  }, 120_000);

  it('a place free all along (r4, its drop-off empty, the hands fast): the same hour as today, every arrival exactly a period after the last', () => {
    const g0 = stale(structuredClone(r4Game()) as SalvageGame);
    expect(dropoffCount(begin(base, g0, [], true))).toBe(0);
    const a = R.jump(K50, g0, g0.salvage.t + 3600);
    const b = R.jump(NOKEY, g0, g0.salvage.t + 3600);
    expect(a.salvage.dropoff.n - g0.salvage.dropoff.n).toBe(Math.round(3600 / PERIOD));
    const { lastAt, ...rest } = a.salvage.dropoff;
    expect(typeof lastAt).toBe('number');
    expect(rest.nextAt).toBe(lastAt! + PERIOD);
    expect(whole({ ...a, salvage: { ...a.salvage, dropoff: rest } })).toEqual(whole(b));
  }, 120_000);
});

describe('(c) the key absent: today\'s rule at the works too', () => {
  it('a take from a full drop-off at the works: the next arrival at that instant; an hour writes no lastAt', () => {
    const g0 = fastFull();
    expect(takeOne(NOKEY, g0).salvage.dropoff.nextAt).toBe(g0.salvage.t);
    const h = R.jump(NOKEY, stale(g0), g0.salvage.t + 600);
    expect('lastAt' in h.salvage.dropoff).toBe(false);
  }, 120_000);
});

describe('(d) a tick equals a jump, and an absence in 2 and in 11 passes equals one (the drop-off full, the hands taking)', () => {
  it('120 s of 0.1 s ticks equal one jump (whole state), P = the period and twice it', () => {
    for (const cfg of [K50, K2]) {
      const g = stale(fastFull());
      let a = g;
      let ms = g.salvage.clock.highMs;
      for (let i = 0; i < 1200; i++) {
        ms += 100;
        a = R.advanceSalvage(cfg, a, 0.1, ms);
      }
      const j = R.jump(cfg, g, a.salvage.t);
      expect(whole(j)).toEqual(whole(a));
      expect(a.salvage.dropoff.n).toBeGreaterThan(g.salvage.dropoff.n);
    }
  }, 300_000);

  it('2 h away: one pass against two and against eleven (P twice the period)', () => {
    const f = fastFull();
    const g0 = { ...stale(f), lastSavedAt: f.salvage.clock.highMs } as SalvageGame;
    const from = g0.salvage.clock.highMs;
    const T = 2 * 3600_000;
    const one = awayPass(K2, g0, from + T);
    const cut = (at: number[]) => {
      let g = g0;
      for (const c of [...at, 1].sort((p, q) => p - q)) g = awayPass(K2, g, from + Math.round(c * T));
      return g;
    };
    const rnd = lcg(28);
    expect(one.salvage.dropoff.n - g0.salvage.dropoff.n).toBeLessThanOrEqual(Math.floor(T / 1000 / (2 * PERIOD)) + 1);
    expect(core(cut([0.5]))).toEqual(core(one));
    expect(core(cut(Array.from({ length: 10 }, () => rnd())))).toEqual(core(one));
  }, 600_000);
});

describe('(e) a save made before the field loads and plays', () => {
  it('a works-open save without lastAt (the drop-off full) loads, reads it as long ago, and plays an hour under the bound', () => {
    const g0 = fastFull();
    const raw = JSON.parse(JSON.stringify({ salvage: g0.salvage })) as { salvage: { dropoff: Record<string, unknown> } };
    delete raw.salvage.dropoff.lastAt;
    const loaded = reconcileSalvage(K50, { ...g0, salvage: undefined } as never, raw, g0.salvage.clock.highMs);
    expect(worksOpened(loaded.salvage)).toBe(true);
    expect(loaded.salvage.dropoff.lastAt).toBeUndefined();
    expect(takeOne(K50, loaded).salvage.dropoff.nextAt).toBe(loaded.salvage.t);
    const n0 = loaded.salvage.dropoff.n;
    const h = R.jump(K50, stale(loaded), loaded.salvage.t + 3600);
    expect(h.salvage.dropoff.n - n0).toBeLessThanOrEqual(Math.floor(3600 / PERIOD) + 1);
    expect(typeof h.salvage.dropoff.lastAt).toBe('number');
  }, 120_000);
});

/** Every purchase, hire and level one step up, landed at once (plates set down and running); rateWorks.test.ts's walk. */
function steps(cfg: SalvageConfig, g0: SalvageGame): [string, SalvageGame][] {
  const C = contentAt(cfg.salvage, g0.salvage);
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
  for (const it of shopItems(C)) {
    if (it.kind === 'crew') continue;
    const ck = buyCheck(cfg, g, it.key);
    if (ck.price !== null && !ck.refusal) out.push([`buy ${it.key}`, land(buy(cfg, g, it.key, ck.price, t))]);
  }
  return out;
}
const I = (cfg: SalvageConfig, g: SalvageGame) => ratedIncome(contentAt(cfg.salvage, g.salvage), g.salvage);

describe("(f) rated income's replay reads the same bound", () => {
  it('its drop-off arrivals an hour at most 3600 / P with the key; without it as built (unbounded; more on the fast state)', () => {
    const g = fastFull();
    const T = (cfg: SalvageConfig) => ratedTerms(contentAt(cfg.salvage, g.salvage), g.salvage);
    const free = T(NOKEY).dropoff;
    expect(T(K50).dropoff).toBeLessThanOrEqual(3600 / PERIOD + 1e-9);
    expect(T(K2).dropoff).toBeLessThanOrEqual(3600 / (2 * PERIOD) + 1e-9);
    expect(T(K2).dropoff).toBeLessThanOrEqual(T(K50).dropoff + 1e-9);
    expect(free).toBeGreaterThanOrEqual(T(K50).dropoff - 1e-9);
    expect(free).toBeGreaterThan(3600 / PERIOD);
    // Below the works' opening the replay is the first yard's whatever the key says.
    const pre = stage2Game('r3');
    const cfgPre = stage2Cfg('r3');
    const tPre = (cfg: SalvageConfig) => ratedTerms(contentAt(cfg.salvage, pre.salvage), pre.salvage);
    expect(JSON.stringify(tPre(withKey(2 * PERIOD, cfgPre)))).toBe(JSON.stringify(tPre(cfgPre)));
  }, 120_000);

  for (const [name, mk] of [
    ['r3open (money content), P = the period', () => ({ cfg: withKey(PERIOD, stage2Cfg('r3')), g: r3open() })],
    ['r4 (works content), P = the period', () => ({ cfg: K50, g: r4Game() })],
    ['the fast r4 (every hand, levels bought, the drop-off full), P = the period', () => ({ cfg: K50, g: fastFull() })],
  ] as const) {
    it(`no purchase, hire or level lowers rated income with the key: ${name}`, () => {
      const { cfg, g } = mk();
      expect(worksOpened(g.salvage)).toBe(true);
      const I0 = I(cfg, g);
      const all = steps(cfg, g);
      const falls = all.filter(([, h]) => I(cfg, h) < I0 - 0.005).map(([w, h]) => `${w}: ${I0} -> ${I(cfg, h)}`);
      expect(all.length).toBeGreaterThan(5);
      expect(falls).toEqual([]);
    }, 240_000);
  }
  // FOUND (s2e-dropoff, notes/s2e-dropoff.md; for rated income's owner): with P = TWICE the period (100 s on this content) a
  // hand's level LOWERS I on r3open (31,567.53 -> 31,292.60) and on r4 (36,637.05 -> 36,234.28): the bound leaves the
  // drop-off cut-bound, the faster hands let the replay's queue take more loads, which take the drop-off's cutting seconds,
  // and the envelope's coordinate ascent (E6, a search over the box of lower levels, not the box) misses the old optimum. The
  // class rate.ts's account already names (its 6 walk falls). Not this package's to rebuild.
  it.todo('no purchase, hire or level lowers rated income with P = twice the period (r3open, r4): a hand level falls (the envelope, E6)');
});
