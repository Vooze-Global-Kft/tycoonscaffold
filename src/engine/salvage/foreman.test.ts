/**
 * The foreman's boost (yard-stage1.md 2.6, master 3.4) on the frozen test content: crew and machines run
 * faster by foreman.boost while the boss has worked in the last windowS, for at most minutesPerDay of each
 * market day; never away; the boost's end is a dated event (2.12) so ticking and jumping agree.
 */
import { describe, expect, it } from 'vitest';
import { FIXTURE_NOW, SALVAGE_TEST } from '../fixtures/salvage';
import * as R from '../salvage';
import { begin, boostEndsAt, boostOn, type Ctx } from './clock';
import { bossWorked, RATE_MACHINES, rateOf } from './machines';
import { advance } from './tick';
import type { MachineId, SalvageConfig, SalvageGame } from './types';

const cfg = { mode: 'salvage', salvage: SALVAGE_TEST } as unknown as SalvageConfig;
const C = SALVAGE_TEST;
const base = () => ({ cash: 1e6, lifetimeEarnings: 0, lastSavedAt: FIXTURE_NOW, stats: { playSeconds: 0, clockHigh: FIXTURE_NOW } }) as never;

/** A busy yard (everything bought and hired, then run with no boss until a powered machine works), the boss gone stale and the meter fresh. */
let busy: SalvageGame | null = null;
function ctx(): { x: Ctx; id: MachineId } {
  if (!busy) {
    let g = R.createSalvage(cfg, base(), FIXTURE_NOW);
    for (const item of ['sack', 'sledge', 'trolley', 'truck', 'stripper', 'bench', 'crucible']) g = R.buy(cfg, g, item, R.shopPrice(cfg, g, item) ?? 0, g.salvage.t);
    for (const role of ['hand', 'cutter', 'driver'] as const) g = R.hire(cfg, g, role, R.shopPrice(cfg, g, role === 'hand' ? 'hand1' : role) ?? 0, g.salvage.t);
    const working = (q: SalvageGame) => RATE_MACHINES.some((m) => m !== 'hand_stripper' && (q.salvage.machines[m].work?.rate_kg_s ?? 0) > 0);
    for (let k = 0; k < 600 && !working(g); k++) g = R.jump(cfg, g, g.salvage.t + 10);
    busy = g;
  }
  const x = begin(cfg, busy, [], true);
  x.s.presenceAt = -1;
  x.s.act = { kind: 'none', target: null, since: x.s.t, endsAt: null };
  x.s.foreman = { day: x.s.clock.day, used_s: 0, lastWorkAt: -1 };
  const id = RATE_MACHINES.find((m) => m !== 'hand_stripper' && x.s.machines[m].work && x.s.machines[m].work!.rate_kg_s > 0);
  if (!id) throw new Error('the busy yard has no machine at work');
  return { x, id };
}

describe('the foreman', () => {
  it('machines run faster by boost while the boss has worked, and the boost ends windowS after his last work', () => {
    const { x, id } = ctx();
    const r0 = x.s.machines[id].work!.rate_kg_s;
    const t0 = x.s.t;
    bossWorked(x, t0);
    expect(boostOn(x, t0)).toBe(true);
    expect(x.s.machines[id].work!.rate_kg_s).toBeCloseTo(r0 * (1 + C.foreman.boost), 9);
    expect(boostEndsAt(x)).toBeCloseTo(t0 + C.foreman.windowS, 9);
    advance(x, t0 + C.foreman.windowS + 5);
    expect(boostOn(x, x.s.t)).toBe(false);
    expect(x.s.foreman.used_s).toBeCloseTo(C.foreman.windowS, 6);
    for (const m of RATE_MACHINES) {
      const w = x.s.machines[m].work;
      if (w) expect(w.rate_kg_s).toBeCloseTo(rateOf(x, m, x.s.t), 9);
    }
  });

  it('stops when the day\'s minutes are used up, and a new market day gives them back', () => {
    const { x } = ctx();
    const budget = C.foreman.minutesPerDay * 60;
    x.s.foreman.used_s = budget - 10;
    const t0 = x.s.t;
    bossWorked(x, t0);
    expect(boostEndsAt(x)).toBeCloseTo(t0 + 10, 9);
    advance(x, t0 + 30);
    expect(x.s.foreman.used_s).toBeCloseTo(budget, 6);
    bossWorked(x, x.s.t);
    expect(boostOn(x, x.s.t)).toBe(false);
    x.s.clock.day += 1;
    bossWorked(x, x.s.t);
    expect(x.s.foreman.used_s).toBe(0);
    expect(boostOn(x, x.s.t)).toBe(true);
  });

  it('never runs away (the away pass has no boss and no foreman)', () => {
    const { x } = ctx();
    bossWorked(x, x.s.t);
    x.live = false;
    expect(boostOn(x, x.s.t)).toBe(false);
    expect(boostEndsAt(x)).toBeNull();
  });

  it('crew take the boost from their next leg (a yard hand walks faster while it runs)', () => {
    const a = ctx().x;
    const b = ctx().x;
    bossWorked(b, b.s.t);
    advance(a, a.s.t + 40);
    advance(b, b.s.t + 40);
    const legs = (x: Ctx) => x.ev.filter((e) => e.type === 'crewLeg').length;
    expect(legs(b)).toBeGreaterThanOrEqual(legs(a));
  });
});
