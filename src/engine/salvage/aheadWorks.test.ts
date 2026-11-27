/**
 * s2e-crew (the economy designed again, "Planning ahead"; RULING2.md 27; REPORT9 T3): FROM THE WORKS' OPENING CREWS GO
 * TRIP BY TRIP IN SIGHT AND OUT OF SIGHT (content `group.aheadWorks` false, read only when layer.ts worksOpened). Runs
 * stay the rule; only the planning of a run's rest out of sight goes, for the yard hands, the cutters and the driver's
 * trip alike (group.ts planAhead, which crew.ts and truck.ts ask). Below the works' opening, and at release.stage 1
 * (where the works never open), `group.ahead` holds bit for bit. What is proved, on the works' frozen test content
 * (fixtures/salvage2works.ts, r4: every plate, the crew, the truck):
 *  (a) planAhead reads aheadWorks only once the works have opened; the key absent: `ahead` as before;
 *  (b) with it off nothing is planned: no member holds a planned run and the truck no planned trip, out of sight too;
 *  (c) a tick equals a jump with it off (whole state; the boss stale, and the boss walking in and out of sight);
 *  (d) present equals away: the crews' and the driver's trips are the same whether the boss stands in sight or not;
 *  (e) an absence in 2 and in 11 passes equals one pass with it off.
 * Owner: s2e-crew.
 */
import { describe, expect, it } from 'vitest';
import { r3Works, r4Game, worksCfg } from '../fixtures/salvage2works';
import { stage2Cfg, stage2Game } from '../fixtures/salvage';
import * as R from '../salvage';
import { awayPass } from './away';
import { begin } from './clock';
import { groupCfg, planAhead } from './group';
import { worksOpened } from './layer';
import { pointOf } from './positions';
import type { SalvageConfig, SalvageEvent, SalvageGame } from './types';

const base = worksCfg();
const grpOf = (c: SalvageConfig) => (c.salvage as unknown as { group: Record<string, unknown> }).group;
/** The works' test config with `group` changed (a new content object, so the rules' caches are its own). */
function withGroup(more: Record<string, unknown>, drop: string[] = [], c0: SalvageConfig = base): SalvageConfig {
  const g = { ...grpOf(c0), ...more };
  for (const k of drop) delete g[k];
  return { ...c0, salvage: { ...c0.salvage, group: g } } as unknown as SalvageConfig;
}
const OFF = withGroup({ aheadWorks: false });
const ON = withGroup({}, ['aheadWorks']);

const whole = (g: SalvageGame): unknown => {
  const s = JSON.parse(JSON.stringify(g.salvage)) as Record<string, unknown>;
  for (const k of ['clock', 'epoch', 'away']) delete s[k];
  return { cash: Math.round(g.cash * 100), earned: Math.round((g.lifetimeEarnings ?? 0) * 100), s };
};
/** The game without what legitimately differs between one pass and several (split.test.ts core). */
function core(g: SalvageGame): unknown {
  const s = JSON.parse(JSON.stringify(g.salvage)) as Record<string, unknown>;
  for (const k of ['away', 'epoch', 'clock']) delete s[k];
  if (s.act) delete (s.act as Record<string, unknown>).since;
  return { cash: Math.round(g.cash * 100), earned: Math.round(g.lifetimeEarnings * 100), s };
}
const stale = (g: SalvageGame): SalvageGame => ({ ...g, salvage: { ...g.salvage, presenceAt: g.salvage.t - 100 } }) as SalvageGame;
const r4 = (): SalvageGame => structuredClone(r4Game()) as SalvageGame;

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32;
}

describe('(a) planAhead from the works\' opening', () => {
  it('reads group.aheadWorks only once the works have opened; absent, group.ahead as before', () => {
    expect(groupCfg(OFF.salvage).aheadWorks).toBe(false);
    expect(groupCfg(ON.salvage).aheadWorks).toBeNull();
    // r3 before its first live instant: rung 3, runs on, the works not yet open: ahead (true) whatever aheadWorks says.
    const pre = stage2Game('r3');
    expect(worksOpened(pre.salvage)).toBe(false);
    expect(pre.salvage.ladder.rung).toBeGreaterThanOrEqual(3);
    const preOff = withGroup({ aheadWorks: false }, [], stage2Cfg('r3'));
    expect(planAhead(begin(preOff, pre, [], true))).toBe(true);
    expect(planAhead(begin(stage2Cfg('r3'), pre, [], true))).toBe(true);
    // Opened: off with the key false, on without it, on with it true.
    const open = r3Works();
    expect(worksOpened(open.salvage)).toBe(true);
    expect(planAhead(begin(OFF, open, [], true))).toBe(false);
    expect(planAhead(begin(ON, open, [], true))).toBe(true);
    expect(planAhead(begin(withGroup({ aheadWorks: true }), open, [], true))).toBe(true);
    // group.ahead false stays false at the works too when aheadWorks is absent (the bots' comparison switch).
    expect(planAhead(begin(withGroup({ ahead: false }, ['aheadWorks']), open, [], true))).toBe(false);
    // Below the group's rung nothing runs in groups at all.
    expect(planAhead(begin(withGroup({ fromRung: 99, aheadWorks: true }), open, [], true))).toBe(false);
  });
});

describe('(b) with it off nothing is planned, out of sight too', () => {
  it('an hour of r4 with the boss away: no planned run on any member, no planned truck trip at any instant; with it on, some', () => {
    // Planned after the start (a run or a trip planned in r4's own play, under planning on, ends as planned).
    const planned = (c: SalvageConfig): number => {
      let g = stale(r4());
      const t0 = g.salvage.t + 1e-6;
      let n = 0;
      for (let k = 0; k < 120; k++) {
        g = R.jump(c, g, g.salvage.t + 30);
        n += g.salvage.crew.filter((m) => m.run && m.run.t0 > t0).length + (g.salvage.truck.trip?.plan && g.salvage.truck.trip.plan.t0 > t0 ? 1 : 0);
      }
      return n;
    };
    expect(planned(OFF)).toBe(0);
    expect(planned(ON)).toBeGreaterThan(0);
  }, 300_000);
});

describe('(c) a tick equals a jump with it off at stage 2', () => {
  it('r4, the boss stale: 120 s of 0.1 s ticks equal one jump (whole state)', () => {
    const g = stale(r4());
    let a = g;
    let ms = g.salvage.clock.highMs;
    for (let i = 0; i < 1200; i++) {
      ms += 100;
      a = R.advanceSalvage(OFF, a, 0.1, ms);
    }
    const j = R.jump(OFF, g, a.salvage.t);
    expect(whole(j)).toEqual(whole(a));
  }, 300_000);

  it('r4, the boss walking in and out of sight of the floor (a sample a second): 0.1 s ticks equal a jump between samples', () => {
    const F = pointOf(OFF.salvage, 'floor');
    const at = (k: number) => (Math.floor(k / 20) % 2 === 0 ? { x: F.x, y: F.y + 6 } : { x: 4, y: 4 });
    let a = r4();
    let b = a;
    let ms = a.salvage.clock.highMs;
    for (let k = 0; k < 120; k++) {
      const p = { ...at(k), moving: true, standingFor: 0, driving: false } as never;
      a = R.setPresence(OFF, a, p, a.salvage.t);
      b = R.setPresence(OFF, b, p, b.salvage.t);
      for (let i = 0; i < 10; i++) {
        ms += 100;
        a = R.advanceSalvage(OFF, a, 0.1, ms);
      }
      b = R.jump(OFF, b, a.salvage.t);
    }
    expect(whole(b)).toEqual(whole(a));
  }, 300_000);
});

describe('(d) present equals away with it off: the yard with the boss gone from the screen equals the away pass', () => {
  it('r4, 2 h: live jumps with the boss stale (no samples) against one away pass of the same 2 h (the card aside)', () => {
    const g0 = { ...stale(r4()), lastSavedAt: r4().salvage.clock.highMs } as SalvageGame;
    const from = g0.salvage.clock.highMs;
    const away = awayPass(OFF, g0, from + 2 * 3600_000);
    let live = g0;
    const T = g0.salvage.t + 2 * 3600;
    while (live.salvage.t < T - 1e-9) live = R.jump(OFF, live, Math.min(T, live.salvage.t + 60));
    expect(away.salvage.t).toBeCloseTo(live.salvage.t, 9);
    const crewOf = (g: SalvageGame) => JSON.stringify([g.salvage.crew, g.salvage.truck, g.salvage.pieces, g.salvage.things, g.salvage.bays, g.salvage.ladder, Math.round(g.cash * 100)]);
    expect(crewOf(away)).toBe(crewOf(live));
  }, 300_000);
});

describe('(e) an absence in 2 and in 11 passes equals one pass with it off at stage 2', () => {
  it('r4, 2 h away: one pass against two and against eleven', () => {
    const g0 = { ...r4(), lastSavedAt: r4().salvage.clock.highMs } as SalvageGame;
    const from = g0.salvage.clock.highMs;
    const T = 2 * 3600_000;
    const whole1 = awayPass(OFF, g0, from + T);
    const cut = (at: number[]) => {
      let g = g0;
      for (const c of [...at, 1].sort((p, q) => p - q)) g = awayPass(OFF, g, from + Math.round(c * T));
      return g;
    };
    const rnd = lcg(27);
    expect(core(cut([0.5]))).toEqual(core(whole1));
    expect(core(cut(Array.from({ length: 10 }, () => rnd())))).toEqual(core(whole1));
  }, 600_000);
});
