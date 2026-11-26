/**
 * engine2-group (stage 2, 2.1; RULING2.md 10.4): crew trips GROUPED when no boss is within sight. On the
 * frozen test content (no tuned number pinned). What is proved here:
 *  - a run OPENED by the boss walking into sight, at twenty instants of its plan, leaves the state the
 *    leg-by-leg engine would have made at that instant (yard hand, cutter, driver);
 *  - present equals away: an hour with a fresh boss standing out of sight of every station equals the
 *    same hour away, in cash, supplied and every stock;
 *  - mass is kept through grouped runs; no run is longer than its limit (but its first trip); a claimed
 *    piece is delivered once;
 *  - below `group.fromRung` nothing changes (the stage-1 engine);
 *  - a save taken mid-run reloads and goes on as the unsaved state; a broken saved run is dropped and its
 *    claims released; a recorded stage-1 save still loads.
 * Ticking equals jumping with grouping on is in tickjump.test.ts. Owner: engine2 (rules-sim's files).
 */
import { describe, expect, it } from 'vitest';
import { SalvageSchema } from '../../config/schema.salvage';
import { FIXTURE_NOW, SALVAGE_TEST } from '../fixtures/salvage';
import gate5 from '../fixtures/salvage-gate5.json';
import * as R from '../salvage';
import { awayPass } from './away';
import { pieceCount, pieceSpec } from './content';
import { groupCfg } from './group';
import { hireCheck } from './ladder';
import { atPlace } from './machines';
import { floorSlotPos, pointOf } from './positions';
import { reconcileSalvage } from './save';
import type { GroundPiece, SalvageConfig, SalvageEvent, SalvageGame, SalvageState, ThingState } from './types';

const C = SALVAGE_TEST;
type Group = Record<string, number | boolean>;
/** The run limits these tests use unless they say otherwise (test numbers; the game's are in its content). */
const RUNS = { fromRung: 3, handRun_s: 30, cutRun_s: 120, ahead: true };
const cfgOf = (group: Group | null, more: Record<string, unknown> = {}): SalvageConfig =>
  ({ mode: 'salvage', salvage: { ...C, ...(group ? { group: { ...RUNS, ...group } } : {}), ...more } }) as unknown as SalvageConfig;
const LEGS = cfgOf({ fromRung: 99 });
const base = (cash = 0) => ({ cash, lifetimeEarnings: 0, lastSavedAt: FIXTURE_NOW, stats: { playSeconds: 0, clockHigh: FIXTURE_NOW } }) as never;

/** A fixed sequence in [0, 1) for the test's instants (a linear congruential generator; no Math.random). */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

/** The point of the yard farthest from every place's footprint (the boss stands there "out of sight"). */
function farPoint(cfg: SalvageConfig): { x: number; y: number; d: number } {
  const c = cfg.salvage;
  let best = { x: 0, y: 0, d: -1 };
  for (let x = 1; x < c.yard.width; x += 1) {
    for (let y = 1; y < c.yard.depth; y += 1) {
      let d = Infinity;
      for (const id of Object.keys(c.map.points)) {
        for (let r = 0; r <= 60; r += 0.5) {
          if (atPlace({ c, s: { presence: {} } } as never, id, x, y, r)) {
            d = Math.min(d, r);
            break;
          }
        }
      }
      if (d > best.d) best = { x, y, d };
    }
  }
  return best;
}

/** A sample from the boss standing still at (x, y) at yard second t. */
function presence(cfg: SalvageConfig, g: SalvageGame, x: number, y: number, t: number): SalvageGame {
  return R.setPresence(cfg, g, { x, y, moving: false, standingFor: 5, driving: false } as never, t);
}

/** An empty yard for one crew member's scenario: no drop-off things and none to come, the merchant out for good. */
function quietYard(cfg: SalvageConfig, cash: number): SalvageGame {
  const g = R.createSalvage(cfg, base(cash), FIXTURE_NOW);
  const s = g.salvage;
  return {
    ...g,
    salvage: {
      ...s,
      things: [],
      dropoff: { ...s.dropoff, nextAt: -1 },
      merchant: { ...s.merchant, phase: 'away', since: s.t, endsAt: s.t + 1e7 },
      presenceAt: -1000,
    },
  };
}

/** What a present player sees of the yard: stocks, the crew's legs, tickets, the truck and its skips, cash. */
function seen(g: SalvageGame): unknown {
  const s = g.salvage;
  return {
    cash: g.cash,
    supplied: s.ladder.supplied_g,
    bays: Object.entries(s.bays).filter(([, b]) => b.g > 0).map(([gr, b]) => [gr, b.g, b.n]),
    pieces: s.pieces.map((p) => [p.uid, p.pile, p.k, p.g, p.claim]).sort(),
    things: s.things.map((th) => [th.uid, th.cut, th.by, th.at]).sort(),
    crew: s.crew.map((m) => ({ id: m.id, job: m.job, phase: m.phase, to: m.to, t0: +m.t0.toFixed(9), t1: +m.t1.toFixed(9), load: m.load.map((p) => p.uid), claims: m.claims, cut: m.cut, dest: m.dest ?? null, run: !!m.run })),
    tickets: s.tickets.map((tk) => JSON.stringify(tk)),
    waste: s.waste_g,
    round: s.scaleRound_g,
    truck: { x: s.truck.x, y: s.truck.y, skip: s.truck.skip, trip: s.truck.trip, earmark: s.truck.earmark },
    skips: Object.fromEntries(Object.entries(s.partners).map(([id, p]) => [id, p.skips])),
    trays: Object.fromEntries(Object.entries(s.machines).map(([id, m]) => [id, [m.tray_g, m.trayClaim_g, m.hopper.map((p) => p.uid)]])),
  };
}

describe('a run opened by the boss walking into sight equals the leg-by-leg yard at that instant (2.1)', () => {
  it('a yard hand carrying a pile off the floor: twenty instants', () => {
    const G = cfgOf({ fromRung: 1, handRun_s: 600 });
    const pile = (g: SalvageGame): SalvageGame => {
      const pieces: GroundPiece[] = [];
      const grades = ['li', 'mot', 'li', 'li', 'mot'];
      for (let i = 0; i < 24; i++) pieces.push({ uid: `t${i}`, grade: grades[i % grades.length], g: [10000, 5000, 20000, 15000][i % 4], from: null, spec: 0, pile: 'floor', k: i, claim: null });
      return { ...g, salvage: { ...g.salvage, pieces } };
    };
    const hire = (cfg: SalvageConfig) => {
      const g = pile(quietYard(cfg, 10_000));
      return R.hire(cfg, g, 'hand', hireCheck(cfg, g, 'hand').price ?? 0, g.salvage.t);
    };
    const g0 = hire(G);
    const l0 = hire(LEGS);
    const run = g0.salvage.crew[0].run!;
    expect(run.loads!.length).toBeGreaterThanOrEqual(4);
    expect(l0.salvage.crew[0].run).toBeUndefined();
    const floor = pointOf(C, 'floor');
    const next = lcg(11);
    for (let i = 0; i < 20; i++) {
      const t = run.t0 + next() * (run.end - run.t0);
      const a = presence(G, R.jump(G, g0, t), floor.x, floor.y + 3, t);
      const b = presence(LEGS, R.jump(LEGS, l0, t), floor.x, floor.y + 3, t);
      expect(a.salvage.crew[0].run, `opened at ${t}`).toBeUndefined();
      expect(seen(a), `t = ${t.toFixed(3)}`).toEqual(seen(b));
    }
  });

  it('a cutter cutting things on the floor whole: twenty instants', () => {
    const G = cfgOf({ fromRung: 1, cutRun_s: 900 });
    const things = (g: SalvageGame): SalvageGame => {
      const th: ThingState[] = [];
      for (let i = 0; i < 12; i++) th.push({ uid: `f${i + 1}`, obj: 'washer', at: { at: 'floor', slot: i }, cut: 0, progress: 0, by: null });
      return { ...g, salvage: { ...g.salvage, things: th, counts: { ...g.salvage.counts, floorThings: 12 } } };
    };
    const hire = (cfg: SalvageConfig) => {
      const g = things(quietYard(cfg, 10_000));
      return R.hire(cfg, g, 'cutter', hireCheck(cfg, g, 'cutter').price ?? 0, g.salvage.t);
    };
    const g0 = hire(G);
    const l0 = hire(LEGS);
    const run = g0.salvage.crew[0].run!;
    expect(run.cuts!.length).toBeGreaterThan(5);
    const p = floorSlotPos(C, 0);
    const next = lcg(23);
    for (let i = 0; i < 20; i++) {
      const t = run.t0 + next() * (run.end - run.t0);
      const a = presence(G, R.jump(G, g0, t), p.x, p.y - 4, t);
      const b = presence(LEGS, R.jump(LEGS, l0, t), p.x, p.y - 4, t);
      expect(seen(a), `t = ${t.toFixed(3)}`).toEqual(seen(b));
    }
  });

  it("the driver's trip (walk, out, hook, back, weigh, tip, park): twenty instants", () => {
    const G = cfgOf({ fromRung: 1 });
    const start = (cfg: SalvageConfig) => {
      let g = quietYard(cfg, 10_000);
      g = R.buy(cfg, g, 'truck', R.shopPrice(cfg, g, 'truck') ?? 0, g.salvage.t);
      g = R.hire(cfg, g, 'driver', hireCheck(cfg, g, 'driver').price ?? 0, g.salvage.t);
      // To the driver's departure (the truck's arrival and the next instant).
      for (let k = 0; k < 400 && !g.salvage.truck.trip; k++) g = R.jump(cfg, g, g.salvage.t + 0.5);
      return g;
    };
    const g0 = start(G);
    const l0 = start(LEGS);
    const plan = g0.salvage.truck.trip!.plan!;
    expect(plan.ends.length).toBe(7);
    expect(l0.salvage.truck.trip!.plan).toBeUndefined();
    const park = pointOf(C, 'park');
    const next = lcg(37);
    for (let i = 0; i < 20; i++) {
      const t = plan.t0 + next() * (plan.ends[6] - plan.t0);
      const a = presence(G, R.jump(G, g0, t), park.x + 4, park.y, t);
      const b = presence(LEGS, R.jump(LEGS, l0, t), park.x + 4, park.y, t);
      expect(a.salvage.truck.trip?.plan, `opened at ${t}`).toBeUndefined();
      expect(seen(a), `t = ${t.toFixed(3)}`).toEqual(seen(b));
    }
  });
});

// ---------------------------------------------------------------------------------------- a busy yard

/** Content with no cable and no loose (tier 0) things in any source: stage 1's "boss in the yard" rules (P11, E35) cannot apply. */
const PLAIN = {
  dropoff: { ...C.dropoff, mix: [['washer', 3], ['radiator', 1]] },
  partners: { ...C.partners, partnerDemolition: { ...C.partners.partnerDemolition, skip: { beam: 2 } } },
  awayCapByRung_h: [6, 6, 6],
};

function busy(cfg: SalvageConfig): SalvageGame {
  let g = R.createSalvage(cfg, base(100_000), FIXTURE_NOW);
  g = { ...g, salvage: { ...g.salvage, things: g.salvage.things.filter((th) => C.objects[th.obj].tier > 0) } };
  for (const item of ['sack', 'sledge', 'trolley', 'truck', 'stripper', 'bench']) g = R.buy(cfg, g, item, R.shopPrice(cfg, g, item) ?? 0, g.salvage.t);
  for (const role of ['hand', 'hand', 'cutter', 'driver'] as const) g = R.hire(cfg, g, role, hireCheck(cfg, g, role).price ?? 0, g.salvage.t);
  return { ...g, salvage: { ...g.salvage, presenceAt: -1000 } };
}

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

describe('a busy yard with grouped runs', () => {
  it('present equals away: an hour with a fresh boss out of sight of every station equals the same hour away', () => {
    const cfg = cfgOf({ fromRung: 1 }, PLAIN);
    const g0 = busy(cfg);
    const far = farPoint(cfg);
    expect(far.d).toBeGreaterThan(C.reach.sight + 2);
    // Present: a sample every 0.25 s (the boss stays fresh), the yard advanced live between them.
    let p = g0;
    const T = g0.salvage.t + 3600;
    while (p.salvage.t < T - 1e-9) {
      p = presence(cfg, p, far.x, far.y, p.salvage.t);
      p = R.jump(cfg, p, Math.min(T, p.salvage.t + 0.25));
    }
    // Away: the same hour as time away (the boss's last sample stale from the start).
    const a = awayPass(cfg, { ...g0, lastSavedAt: g0.salvage.clock.highMs }, g0.salvage.clock.highMs + 3600_000);
    expect(a.salvage.t).toBeCloseTo(T, 6);
    const cmp = (g: SalvageGame) => {
      const v = seen(g) as Record<string, unknown>;
      // Tickets carry the collection's "with the boss" chip and the away card is the pass's own: the stocks, cash and legs are what must agree.
      delete v.tickets;
      return v;
    };
    expect(p.salvage.ladder.supplied_g).toBeGreaterThan(0);
    expect(cmp(p)).toEqual(cmp(a));
    expect(p.cash).toBe(a.cash);
  }, 120_000);

  it('mass is kept, no run is longer than its limit (but its first trip), and every claimed piece is delivered once', () => {
    const lim = { fromRung: 1, handRun_s: 90, cutRun_s: 200 };
    const cfg = cfgOf(lim, PLAIN);
    const g0 = busy(cfg);
    const ev: SalvageEvent[] = [];
    let g = g0;
    let multi = 0;
    for (let k = 0; k < 360; k++) {
      g = R.jump(cfg, g, g.salvage.t + 10, ev);
      for (const m of g.salvage.crew) {
        const r = m.run;
        if (!r) continue;
        if ((r.loads?.length ?? 0) > 1) {
          multi++;
          expect(r.end - r.t0).toBeLessThanOrEqual(groupCfg(cfg.salvage).handRun_s + 1e-6);
        }
        if ((r.cuts?.length ?? 0) > 1) {
          multi++;
          expect(r.end - r.t0).toBeLessThanOrEqual(groupCfg(cfg.salvage).cutRun_s + 1e-6);
        }
      }
    }
    expect(multi).toBeGreaterThan(20);
    // Each piece picked up once.
    const picked = ev.filter((e) => e.type === 'pickup').map((e) => (e as { piece: string }).piece);
    expect(new Set(picked).size).toBe(picked.length);
    // Mass: what is in the yard plus what was sold equals what came in (start, drop-off arrivals, skips hooked).
    let came = inYard(g0.salvage) + g0.salvage.ladder.supplied_g - g0.salvage.scaleRound_g;
    const seenP = new Set<string>();
    for (const e of ev) {
      if (e.type === 'arrival' && e.kind === 'dropoff' && e.what) came += C.objects[e.what].gross_g;
      if (e.type === 'hook') {
        // Skips hooked bring their label's mass: the trial's contents the first time, then the partner's skip.
        const pt = cfg.salvage.partners[e.partner];
        const contents = seenP.has(e.partner) ? pt.skip : pt.trial;
        seenP.add(e.partner);
        for (const [o, n] of Object.entries(contents)) came += C.objects[o].gross_g * n;
      }
    }
    const s = g.salvage;
    expect(inYard(s) + s.ladder.supplied_g - s.scaleRound_g).toBe(came);
  }, 120_000);

  it('below group.fromRung nothing changes: the frozen states advance exactly as the stage-1 engine', async () => {
    const { fixtureGame } = await import('../fixtures/salvage');
    const dflt = cfgOf({});
    for (const n of ['m5', 'm15', 'm30'] as const) {
      const g = fixtureGame(n, base(), FIXTURE_NOW);
      expect(g.salvage.ladder.rung).toBeLessThan(groupCfg(dflt.salvage).fromRung);
      const a = R.jump(dflt, { ...g, salvage: { ...g.salvage, presenceAt: g.salvage.t - 100 } }, g.salvage.t + 300);
      const b = R.jump(LEGS, { ...g, salvage: { ...g.salvage, presenceAt: g.salvage.t - 100 } }, g.salvage.t + 300);
      if (a.salvage.ladder.rung < groupCfg(dflt.salvage).fromRung) expect(JSON.stringify(a), n).toBe(JSON.stringify(b));
    }
  });
});

describe('saves and grouped runs', () => {
  it('a save taken mid-run reloads and goes on as the unsaved yard', () => {
    const cfg = cfgOf({ fromRung: 1 }, PLAIN);
    let g = busy(cfg);
    g = R.jump(cfg, g, g.salvage.t + 600);
    expect(g.salvage.crew.some((m) => m.run) || !!g.salvage.truck.trip?.plan).toBe(true);
    const loaded = reconcileSalvage(cfg, base(g.cash), JSON.parse(JSON.stringify({ salvage: g.salvage })), g.salvage.clock.highMs);
    const same = { ...loaded, cash: g.cash, lifetimeEarnings: g.lifetimeEarnings, stats: g.stats, lastSavedAt: g.lastSavedAt };
    expect(same.salvage.crew.map((m) => m.run ?? null)).toEqual(g.salvage.crew.map((m) => m.run ?? null));
    expect(same.salvage.truck.trip).toEqual(g.salvage.truck.trip);
    const a = R.jump(cfg, g, g.salvage.t + 300);
    const b = R.jump(cfg, same, g.salvage.t + 300);
    expect(seen(b)).toEqual(seen(a));
  });

  it('a broken saved run is dropped, its member idle and its claims released; a broken plan restarts the trip', () => {
    const cfg = cfgOf({ fromRung: 1 }, PLAIN);
    let g = busy(cfg);
    g = R.jump(cfg, g, g.salvage.t + 600);
    const m = g.salvage.crew.find((q) => q.run?.loads)!;
    expect(m).toBeTruthy();
    const raw = JSON.parse(JSON.stringify({ salvage: g.salvage }));
    const rm = raw.salvage.crew.find((q: { id: string }) => q.id === m.id);
    rm.run.loads = new Array(500).fill(rm.run.loads[0]);
    if (raw.salvage.truck.trip) raw.salvage.truck.trip.plan = { t0: 0, x: 0, y: 0, ends: [1, 2] };
    const loaded = reconcileSalvage(cfg, base(g.cash), raw, g.salvage.clock.highMs);
    const lm = loaded.salvage.crew.find((q) => q.id === m.id)!;
    expect(lm.run).toBeUndefined();
    expect(lm.phase).toBe('wait');
    expect(loaded.salvage.pieces.some((p) => p.claim === m.id)).toBe(false);
    expect(loaded.salvage.things.some((th) => th.by === m.id)).toBe(false);
    if (loaded.salvage.truck.trip) expect(loaded.salvage.truck.trip.plan).toBeUndefined();
    // It goes on (the member departs at the next instant).
    const on = R.jump(cfg, loaded, loaded.salvage.t + 120);
    expect(on.salvage.t).toBeCloseTo(loaded.salvage.t + 120, 6);
  });

  it('a recorded stage-1 save (bots/gate5, layout 2) loads as it was and advances, grouped or not', () => {
    const c = SalvageSchema.parse(gate5.content);
    const cfg = (group: Group) => ({ mode: 'salvage', salvage: { ...c, worldSeed: gate5.worldSeed, group } }) as unknown as SalvageConfig;
    const recorded = gate5.g as unknown as SalvageGame;
    const loaded = reconcileSalvage(cfg({ fromRung: 1 }), base(recorded.cash), JSON.parse(JSON.stringify({ salvage: recorded.salvage })), gate5.now);
    expect(loaded.salvage.v).toBe(3);
    expect(loaded.salvage.crew.map((m) => [m.id, m.level, m.run ?? null])).toEqual(recorded.salvage.crew.map((m) => [m.id, m.level, null]));
    expect(loaded.salvage.things.length).toBe(recorded.salvage.things.length);
    expect(loaded.salvage.pieces.length).toBe(recorded.salvage.pieces.length);
    expect(loaded.salvage.ladder.supplied_g).toBe(recorded.salvage.ladder.supplied_g);
    expect(Object.fromEntries(Object.entries(loaded.salvage.bays).map(([k, b]) => [k, b.g]))).toEqual(Object.fromEntries(Object.entries(recorded.salvage.bays).map(([k, b]) => [k, b.g])));
    for (const group of [{ fromRung: 1 }, { fromRung: 99 }]) {
      const on = R.jump(cfg(group), loaded, loaded.salvage.t + 600);
      expect(on.salvage.t).toBeCloseTo(loaded.salvage.t + 600, 6);
      expect(on.salvage.ladder.supplied_g).toBeGreaterThanOrEqual(loaded.salvage.ladder.supplied_g);
    }
  });
});
