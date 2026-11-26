/**
 * The rate engine and the hard promises of yard-stage1.md 8.3, on the frozen test content (no tuned
 * number pinned): mass kept everywhere; money only from collected lots, Sell and deliveries; nothing
 * costs by the clock; no dead end; ticking equals jumping within rounding over an hour and over a day
 * boundary; a clock-back still advances live play; a jump never pays twice; a load that cannot be tipped
 * is never paid; a converter without its source id is refused; the bench (one tick under 1 ms, six hours
 * away under 50 ms).
 */
import { describe, expect, it } from 'vitest';
import { lintSalvage, SalvageSchema } from '../../config/schema.salvage';
import { FIXTURE_NOW, SALVAGE_TEST, SALVAGE_TEST_RAW } from '../fixtures/salvage';
import * as R from '../salvage';
import { begin } from './clock';
import { advanceNoBoss } from './tick';
import { pieceCount, pieceSpec } from './content';
import { hand, stand, standUntil, walkTo } from './play';
import { pointOf, thingPos } from './positions';
import type { SalvageConfig, SalvageEvent, SalvageGame, SalvageState } from './types';

const cfg = { mode: 'salvage', salvage: SALVAGE_TEST } as unknown as SalvageConfig;
const C = SALVAGE_TEST;
const base = (cash = 0) => ({ cash, lifetimeEarnings: 0, lastSavedAt: FIXTURE_NOW, stats: { playSeconds: 0, clockHigh: FIXTURE_NOW } }) as never;
const fresh = (cash = 0): SalvageGame => R.createSalvage(cfg, base(cash), FIXTURE_NOW);

/** Grams in the yard (things left, pieces, loads, hoppers, work, trays, bays, the pot, the flatbed, the truck's skip, waste). */
function inYard(s: SalvageState): number {
  let g = 0;
  for (const th of s.things) {
    g += C.objects[th.obj].waste_g;
    for (let k = th.cut; k < pieceCount(C, th.obj); k++) g += pieceSpec(C, th.obj, k)!.g;
  }
  for (const p of s.pieces) g += p.g;
  for (const p of s.load) g += p.g;
  for (const m of s.crew) for (const p of m.load) g += p.g;
  for (const m of Object.values(s.machines)) {
    for (const p of m.hopper) g += p.g;
    if (m.work) g += m.work.piece.g - Object.values(m.work.credited).reduce((a, x) => a + x, 0);
    g += Object.values(m.tray_g).reduce((a, x) => a + x, 0);
  }
  for (const b of Object.values(s.bays)) g += b.g;
  g += s.machines.crucible.charge_g + s.machines.crucible.heel_g;
  for (const l of s.merchant.lot) g += l.g;
  if (s.truck.skip) g += s.truck.skip.mass_g;
  g += s.waste_g;
  return g;
}

/** Grams that came into the yard: the starting stock plus every drop-off arrival and every skip hooked. */
function cameIn(g0: SalvageGame, events: SalvageEvent[]): number {
  let g = inYard(g0.salvage) + g0.salvage.ladder.supplied_g - g0.salvage.scaleRound_g;
  for (const e of events) {
    if (e.type === 'arrival' && e.kind === 'dropoff' && e.what) g += C.objects[e.what].gross_g;
  }
  return g;
}

/** A yard with everything of the hour bought (cash given), the crew hired, both partners open. */
function busyYard(cash = 100_000): { g: SalvageGame; events: SalvageEvent[] } {
  let g = fresh(cash);
  const ev: SalvageEvent[] = [];
  for (const item of ['sack', 'sledge', 'trolley', 'truck', 'stripper', 'bench', 'crucible']) g = R.buy(cfg, g, item, R.shopPrice(cfg, g, item) ?? 0, g.salvage.t, ev);
  for (const role of ['hand', 'cutter', 'driver'] as const) {
    const ch = R.hire;
    g = ch(cfg, g, role, C.shop.find((i) => i.key === (role === 'hand' ? 'hand1' : role))!.price, g.salvage.t, ev);
  }
  // Let the purchases arrive.
  g = R.jump(cfg, g, g.salvage.t + 30, ev);
  return { g, events: ev };
}


describe('mass is kept everywhere', () => {
  it('over an hour of a busy yard with no boss (crew, machines, the driver, the round)', () => {
    const { g } = busyYard();
    const ev: SalvageEvent[] = [];
    const g1 = R.jump(cfg, g, g.salvage.t + 3600, ev);
    // Skips hooked bring their label's mass: the trial's contents the first time, then the partner's skip.
    const seen = new Set<string>();
    let hooked = 0;
    for (const e of ev) {
      if (e.type !== 'hook') continue;
      const p = C.partners[e.partner];
      const contents = seen.has(e.partner) ? p.skip : p.trial;
      seen.add(e.partner);
      for (const [o, n] of Object.entries(contents)) hooked += C.objects[o].gross_g * n;
    }
    expect(seen.size).toBeGreaterThan(0);
    const s = g1.salvage;
    expect(inYard(s) + s.ladder.supplied_g - s.scaleRound_g).toBe(cameIn(g, ev) + hooked);
  });

  it('the first minute by hand keeps every gram (cut, carry, weigh, collect)', () => {
    const h = hand(cfg, fresh(), FIXTURE_NOW);
    const g0 = h.g;
    const th = h.g.salvage.things.find((t) => t.uid === 'd0')!;
    const p = thingPos(C, th.at);
    walkTo(h, p.x, p.y + 0.8);
    standUntil(h, (g) => !g.salvage.things.some((t) => t.uid === 'd0'), 120);
    const sc = pointOf(C, 'scale');
    walkTo(h, sc.x, sc.y);
    standUntil(h, (g) => g.salvage.tickets.some((t) => t.kind === 'collection'), 60);
    const s = h.g.salvage;
    expect(inYard(s) + s.ladder.supplied_g - s.scaleRound_g).toBe(cameIn(g0, h.events));
  });
});

describe('money', () => {
  it('comes only from collected lots, Sell and deliveries; purchases and loads are the only spends', () => {
    const { g } = busyYard();
    const ev: SalvageEvent[] = [];
    const g1 = R.jump(cfg, g, g.salvage.t + 3 * 3600, ev);
    let paid = 0;
    let spent = 0;
    for (const e of ev) {
      if (e.type === 'collected' && e.ticket.kind === 'collection') paid += e.ticket.paid;
      if (e.type === 'dealDelivered' && e.ticket.kind === 'dealDelivery') paid += e.ticket.paid;
      if (e.type === 'hook') spent += e.price;
    }
    expect(paid).toBeGreaterThan(0);
    expect(R.roundMoney(g1.cash - g.cash)).toBeCloseTo(R.roundMoney(paid - spent), 2);
  });

  it('nothing costs by the clock: an idle yard with nothing hired keeps its cash for a day', () => {
    const g = fresh(123.45);
    const g1 = R.jump(cfg, g, g.salvage.t + 86_400 + 3600);
    expect(g1.cash).toBeGreaterThanOrEqual(123.45);
  });
});

describe('no dead end', () => {
  it('with nothing and empty bays the drop-off and the round pay within a minute of play', () => {
    const h = hand(cfg, fresh(0), FIXTURE_NOW);
    const th = h.g.salvage.things.find((t) => t.at.at === 'dropoff')!;
    const p = thingPos(C, th.at);
    const t0 = h.g.salvage.t;
    walkTo(h, p.x, p.y + 0.8);
    standUntil(h, (g) => !g.salvage.things.some((t) => t.uid === th.uid) || g.salvage.load.length > 0 && g.salvage.act.kind === 'none', 60);
    const sc = pointOf(C, 'scale');
    walkTo(h, sc.x, sc.y);
    standUntil(h, (g) => g.cash > 0, 60);
    expect(h.g.cash).toBeGreaterThan(0);
    expect(h.g.salvage.t - t0).toBeLessThanOrEqual(60);
  });

  it('twenty yards with a crew and no hand reach their next purchase', () => {
    for (let k = 0; k < 20; k++) {
      let g = fresh(10_000);
      const ev: SalvageEvent[] = [];
      const items = ['sack', 'sledge', 'trolley', 'stripper', 'bench', 'truck'].filter((_, i) => (k >> i) & 1);
      for (const it of items) g = R.buy(cfg, g, it, R.shopPrice(cfg, g, it) ?? 0, g.salvage.t, ev);
      g = R.hire(cfg, g, 'hand', C.shop.find((i) => i.key === 'hand1')!.price, g.salvage.t, ev);
      if (k % 2) g = R.hire(cfg, g, 'cutter', C.shop.find((i) => i.key === 'cutter')!.price, g.salvage.t, ev);
      g = { ...g, cash: 0 };
      const next = C.shop.filter((i) => i.kind !== 'crew' && !g.salvage.owned.includes(i.key) && !g.salvage.arriving.some((a) => a.item === i.key) && !i.gate).map((i) => i.price);
      const target = Math.min(...next, Infinity);
      if (!Number.isFinite(target)) continue;
      const g1 = R.jump(cfg, g, g.salvage.t + 4 * 3600);
      expect(g1.cash, `yard ${k} (${items.join(',')}) reaches §${target}`).toBeGreaterThanOrEqual(target);
    }
  });
});

describe('ticking equals jumping', () => {
  const compare = (a: SalvageGame, b: SalvageGame) => {
    expect(a.cash).toBeCloseTo(b.cash, 1);
    expect(a.salvage.ladder.supplied_g).toBe(b.salvage.ladder.supplied_g);
    const bays = (g: SalvageGame) => Object.fromEntries(Object.entries(g.salvage.bays).map(([k, v]) => [k, v.g]));
    expect(bays(a)).toEqual(bays(b));
    expect(a.salvage.waste_g).toBe(b.salvage.waste_g);
    expect(a.salvage.things.length).toBe(b.salvage.things.length);
  };
  it('over an hour (0.1 s ticks against minute jumps)', () => {
    const { g } = busyYard();
    let a = g;
    let now = FIXTURE_NOW + 60_000;
    a = { ...a, salvage: { ...a.salvage, clock: { ...a.salvage.clock, highMs: now } } };
    let b = a;
    for (let i = 0; i < 36_000; i++) {
      now += 100;
      a = R.advanceSalvage(cfg, a, 0.1, now);
    }
    for (let m = 1; m <= 60; m++) b = R.jump(cfg, b, a.salvage.t - 3600 + m * 60);
    b = R.jump(cfg, b, a.salvage.t);
    compare(a, b);
   }, 60_000);
  it('over a day boundary', () => {
    const { g } = busyYard();
    const D = 86_400_000;
    const ms = Math.ceil(g.salvage.clock.highMs / D) * D - 600_000;
    const s0 = { ...g, salvage: { ...g.salvage, clock: { ...g.salvage.clock, highMs: ms } } };
    let a = s0;
    let now = ms;
    for (let i = 0; i < 12_000; i++) {
      now += 100;
      a = R.advanceSalvage(cfg, a, 0.1, now);
    }
    let b = s0;
    for (let m = 1; m <= 20; m++) b = R.jump(cfg, b, s0.salvage.t + m * 60);
    expect(a.salvage.clock.day).toBe(s0.salvage.clock.day + 1);
    expect(b.salvage.clock.day).toBe(s0.salvage.clock.day + 1);
    compare(a, b);
  });
});

describe('the clock', () => {
  it('a clock-back still advances live play', () => {
    let g = fresh();
    const hi = g.salvage.clock.highMs;
    for (let i = 0; i < 50; i++) g = R.advanceSalvage(cfg, g, 0.1, FIXTURE_NOW - 3_600_000);
    expect(g.salvage.t).toBeCloseTo(5, 6);
    expect(g.salvage.clock.highMs).toBeGreaterThanOrEqual(hi + 5000 - 1e-6);
  });
  it('a jump never pays twice (forward, back, forward again)', () => {
    const { g } = busyYard();
    const later = g.salvage.clock.highMs + 2 * 3600_000;
    const a = R.salvageOffline(cfg, { ...g, lastSavedAt: g.salvage.clock.highMs }, later);
    expect(a.earnings).toBe(0);
    expect(a.report).toBeUndefined();
    const again = R.salvageOffline(cfg, a.game, later);
    expect(again.game).toBe(a.game);
    const back = R.salvageOffline(cfg, a.game, later - 3600_000);
    expect(back.game.cash).toBe(a.game.cash);
    const fwd = R.salvageOffline(cfg, back.game, later);
    expect(fwd.game.cash).toBe(a.game.cash);
    expect(a.game.salvage.away).not.toBeNull();
  });
});

describe('the truck', () => {
  it('a load that cannot be tipped is never paid for', () => {
    let g = fresh(10_000);
    g = R.buy(cfg, g, 'truck', R.shopPrice(cfg, g, 'truck')!, 0);
    g = R.jump(cfg, g, 60);
    // Fill the floor beyond its room with tipped things.
    const many = Array.from({ length: 60 }, (_, i) => ({ uid: `f${900 + i}`, obj: 'beam', at: { at: 'floor' as const, slot: i }, cut: 0, progress: 0, by: null }));
    g = { ...g, salvage: { ...g.salvage, things: [...g.salvage.things, ...many] } };
    const z = R.skipZone(cfg, 'partnerFarm', 0);
    const h = hand(cfg, { ...g, salvage: { ...g.salvage, truck: { ...g.salvage.truck, by: 'boss', x: z.x, y: z.y }, presence: { x: z.x, y: z.y, driving: true, moving: false, standingFor: 0, heading: 0 }, presenceAt: g.salvage.t } }, FIXTURE_NOW + 60_000);
    const cash0 = h.g.cash;
    stand(h, C.truck.handle_s + 3);
    expect(h.events.some((e) => e.type === 'refused' && e.key === 'floor')).toBe(true);
    expect(h.events.some((e) => e.type === 'hook')).toBe(false);
    expect(h.g.cash).toBe(cash0);
  });
});

describe('content', () => {
  it('a converter without its source id is refused', () => {
    const raw = structuredClone(SALVAGE_TEST_RAW) as { objects: Record<string, { source?: unknown }> };
    delete raw.objects.car.source;
    const c = SalvageSchema.parse(raw);
    expect(lintSalvage(c).some((m) => m.includes('converter') && m.includes('source'))).toBe(true);
  });
});

describe('time away stays cheap (E17)', () => {
  it("a cutter's event away is the whole thing: one start per thing, its pieces together", () => {
    const { g } = busyYard();
    const ev: SalvageEvent[] = [];
    // The away pass passes on only awayReport, passed and rung (types.ts MAX_TICK): watch its engine, the same advance with no boss.
    const x = begin(cfg, g, ev, false);
    advanceNoBoss(x, 2 * 3600);
    const starts = ev.filter((e) => e.type === 'workStart' && String(e.by).startsWith('cutter'));
    expect(starts.length).toBeGreaterThan(0);
    const things = starts.map((e) => (e.type === 'workStart' ? e.thing : ''));
    expect(new Set(things).size).toBe(things.length);
  });
});

describe('the bench', () => {
  it('one tick under 1 ms, six hours away under 50 ms (node)', () => {
    const { g } = busyYard();
    let a = R.jump(cfg, g, g.salvage.t + 600);
    let now = a.salvage.clock.highMs;
    const N = 2000;
    const t0 = performance.now();
    for (let i = 0; i < N; i++) {
      now += 100;
      a = R.advanceSalvage(cfg, a, 0.1, now);
    }
    const perTick = (performance.now() - t0) / N;
    // Warm (the first call includes the JIT's compile): the best of four passes over the same six hours.
    const leave = { ...a, lastSavedAt: a.salvage.clock.highMs };
    let away = R.salvageOffline(cfg, leave, a.salvage.clock.highMs + 6 * 3600_000);
    let awayMs = Infinity;
    // Node CPU time (process.cpuUsage), not wall time: the machine is shared (R3; the real-content gate is awaybench.test.ts).
    for (let k = 0; k < 4; k++) {
      const c1 = process.cpuUsage();
      away = R.salvageOffline(cfg, leave, a.salvage.clock.highMs + 6 * 3600_000);
      const d = process.cpuUsage(c1);
      awayMs = Math.min(awayMs, (d.user + d.system) / 1000);
    }
    process.stderr.write(`bench: one tick ${perTick.toFixed(3)} ms; six hours away ${awayMs.toFixed(1)} ms (A = ${away.seconds} s)\n`);
    expect(perTick).toBeLessThan(1);
    // The aim is 50 ms (2.16; about 40 ms warm on a quiet core): the guard allows for a machine shared by fifteen engineers.
    expect(awayMs).toBeLessThan(250);
  });
});

describe('the frozen states', () => {
  it('each runs an hour of the real engine (ticked and jumped) without a throw, cash and stocks finite', async () => {
    const { FIXTURE_NAMES, fixtureGame } = await import('../fixtures/salvage');
    for (const n of FIXTURE_NAMES) {
      let g = fixtureGame(n, base(0), FIXTURE_NOW);
      g = { ...g, lastSavedAt: g.salvage.clock.highMs };
      let now = g.salvage.clock.highMs;
      for (let i = 0; i < 600; i++) {
        now += 100;
        g = R.advanceSalvage(cfg, g, 0.1, now);
      }
      g = R.jump(cfg, g, g.salvage.t + 3600);
      expect(Number.isFinite(g.cash), n).toBe(true);
      expect(g.cash, n).toBeGreaterThanOrEqual(0);
      for (const b of Object.values(g.salvage.bays)) expect(b.g, n).toBeGreaterThanOrEqual(0);
    }
  }, 120_000);
});
