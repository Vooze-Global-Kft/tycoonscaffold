/**
 * The hand (yard-stage1.md 2.1, D12, S9) and the first minute on the frozen test content: cut the
 * washer, weigh it in, the round pays; strip the bundle's cable on the hand stripper (it turns only while
 * the boss stands at it); the two promises of D12; pickup best first; the swap never lowers the load.
 */
import { describe, expect, it } from 'vitest';
import { FIXTURE_NOW, SALVAGE_TEST } from '../fixtures/salvage';
import * as R from '../salvage';
import { pointOf, thingPos } from './positions';
import { hand, stand, standUntil, walkTo } from './play';
import type { SalvageConfig, SalvageGame } from './types';

const cfg = { mode: 'salvage', salvage: SALVAGE_TEST } as unknown as SalvageConfig;
const C = SALVAGE_TEST;
const fresh = (): SalvageGame => R.createSalvage(cfg, { cash: 0, lifetimeEarnings: 0, lastSavedAt: FIXTURE_NOW, stats: { playSeconds: 0, clockHigh: FIXTURE_NOW } } as never, FIXTURE_NOW);
const at = (g: SalvageGame, uid: string) => {
  const th = g.salvage.things.find((t) => t.uid === uid)!;
  const p = thingPos(C, th.at);
  const o = C.objects[th.obj];
  return { x: p.x, y: p.y + o.size.d / 2 + 0.4 };
};

describe('the first minute', () => {
  it('cuts the washer by standing beside it, weighs the load in, and the round pays for it', () => {
    const h = hand(cfg, fresh(), FIXTURE_NOW);
    const w = at(h.g, 'd0');
    walkTo(h, w.x, w.y);
    const cut = standUntil(h, (g) => !g.salvage.things.some((t) => t.uid === 'd0'), 120);
    expect(cut).toBe(true);
    expect(h.events.some((e) => e.type === 'workStart' && e.thing === 'd0')).toBe(true);
    const loadG = h.g.salvage.load.reduce((a, p) => a + p.g, 0);
    expect(loadG).toBeGreaterThan(0);
    const sc = pointOf(C, 'scale');
    walkTo(h, sc.x, sc.y);
    standUntil(h, (g) => g.salvage.load.length === 0, 10);
    expect(h.g.salvage.load.length).toBe(0);
    expect(h.g.salvage.tickets.some((t) => t.kind === 'weighIn')).toBe(true);
    const paid = standUntil(h, (g) => g.cash > 0, 60);
    expect(paid).toBe(true);
    expect(h.g.salvage.tickets.some((t) => t.kind === 'collection')).toBe(true);
    expect(h.g.salvage.ladder.supplied_g).toBeGreaterThan(0);
  });

  it('strips the bundle on the hand stripper only while the boss stands at it, and the copper sells', () => {
    const h = hand(cfg, fresh(), FIXTURE_NOW);
    const b = at(h.g, 'bundle1.cable.0');
    walkTo(h, b.x, b.y);
    standUntil(h, (g) => g.salvage.load.some((p) => p.grade === 'cab'), 10);
    expect(h.g.salvage.load.some((p) => p.grade === 'cab')).toBe(true);
    const st = pointOf(C, 'stripper');
    walkTo(h, st.x, st.y + 1);
    standUntil(h, (g) => !g.salvage.load.some((p) => p.grade === 'cab'), 10);
    expect(h.g.salvage.machines.hand_stripper.work || h.g.salvage.machines.hand_stripper.hopper.length).toBeTruthy();
    // Leave: the hand stripper stops (R1).
    walkTo(h, st.x + 6, st.y + 1);
    const stopped = h.g.salvage.machines.hand_stripper.work;
    stand(h, 3);
    if (stopped) expect(h.g.salvage.machines.hand_stripper.work?.rate_kg_s ?? 0).toBe(0);
    walkTo(h, st.x, st.y + 1);
    standUntil(h, (g) => g.salvage.load.some((p) => p.grade === 'bb'), 60);
    expect(h.g.salvage.load.some((p) => p.grade === 'bb')).toBe(true);
    const sc = pointOf(C, 'scale');
    walkTo(h, sc.x, sc.y);
    standUntil(h, (g) => g.salvage.tickets.some((t) => t.kind === 'collection' && t.lines.some((l) => l.grade === 'bb')), 60);
    expect(h.g.salvage.tickets.some((t) => t.kind === 'collection' && t.lines.some((l) => l.grade === 'bb'))).toBe(true);
    // Route B: copper is a value grade (content valueLessons, finding P2): its lesson shows on its first weigh-in even with nothing weighed before.
    expect(h.g.salvage.lessonsSeen).toContain('bb');
  });
});

describe('D12', () => {
  it('walking past a thing never works it', () => {
    const h = hand(cfg, fresh(), FIXTURE_NOW);
    const w = at(h.g, 'd0');
    walkTo(h, w.x + 4, w.y);
    walkTo(h, w.x - 4, w.y);
    expect(h.events.some((e) => e.type === 'workStart')).toBe(false);
  });
  it('stopping beside it always starts work within half a second', () => {
    const h = hand(cfg, fresh(), FIXTURE_NOW);
    const w = at(h.g, 'd0');
    walkTo(h, w.x, w.y);
    const t0 = h.g.salvage.t;
    standUntil(h, (g) => g.salvage.act.kind === 'work', 2);
    expect(h.g.salvage.act.kind).toBe('work');
    expect(h.g.salvage.t - t0).toBeLessThanOrEqual(0.5 + 1e-9);
  });
  it('moving stops the work and keeps the progress on that thing', () => {
    const h = hand(cfg, fresh(), FIXTURE_NOW);
    const w = at(h.g, 'd0');
    walkTo(h, w.x, w.y);
    standUntil(h, (g) => g.salvage.act.kind === 'work', 2);
    stand(h, 0.5);
    walkTo(h, w.x + 3, w.y);
    const th = h.g.salvage.things.find((t) => t.uid === 'd0')!;
    expect(th.progress).toBeGreaterThan(0);
    expect(th.by).toBe(null);
    expect(h.events.some((e) => e.type === 'workStop')).toBe(true);
  });
  it('a thing above the best tool is refused with its padlock key, once', () => {
    const h = hand(cfg, fresh(), FIXTURE_NOW);
    const uid = h.g.salvage.things.find((t) => t.obj === 'radiator')!.uid;
    const w = at(h.g, uid);
    walkTo(h, w.x, w.y);
    stand(h, 2);
    expect(h.events.filter((e) => e.type === 'refused' && e.key === 'tool2').length).toBe(1);
    expect(h.g.salvage.act.kind).not.toBe('work');
  });
});

describe('pickup and the swap', () => {
  it('a swap never lowers the load\'s value', () => {
    const h = hand(cfg, fresh(), FIXTURE_NOW);
    const w = at(h.g, 'Z1.washer.0');
    walkTo(h, w.x, w.y);
    standUntil(h, (g) => !g.salvage.things.some((t) => t.uid === 'Z1.washer.0'), 200);
    const value = (g: SalvageGame) => g.salvage.load.reduce((a, p) => a + (C.grades[p.grade]?.pbar ?? 0) * p.g, 0);
    let last = value(h.g);
    for (const e of h.events) void e;
    const swaps0 = h.events.filter((e) => e.type === 'swap').length;
    stand(h, 5);
    const swaps = h.events.filter((e) => e.type === 'swap').length - swaps0;
    if (swaps > 0) expect(value(h.g)).toBeGreaterThanOrEqual(last);
    last = value(h.g);
    expect(last).toBeGreaterThan(0);
  });
});

describe('the truck: entering by walking into it', () => {
  it('after Step out he is set down beside it and stays out until he has walked away and back (17:30)', async () => {
    const { begin, finish } = await import('./clock');
    const { own } = await import('./rate');
    let g = fresh();
    const x = begin(cfg, g, [], true);
    own(x, 'truck', 0);
    g = finish(g, x);
    const tr = g.salvage.truck;
    const ev: import('./types').SalvageEvent[] = [];
    const P = (px: number, py: number, moving: boolean) => (g = R.setPresence(cfg, g, { x: px, y: py, moving, driving: false, standingFor: moving ? 0 : 0.1, heading: 0 } as never, g.salvage.t, ev));
    P(tr.x, tr.y, false);
    expect(g.salvage.truck.by).toBe('boss');
    g = R.stepOut(cfg, g, { x: tr.x, y: tr.y, heading: 0 } as never, g.salvage.t, ev);
    expect(g.salvage.truck.by).toBe(null);
    // The world sets him down radius + worker + 0.25 m beside it: inside `enter`, but not re-entered.
    const beside = C.truck.enter - 0.05;
    P(tr.x - beside, tr.y, false);
    P(tr.x - beside + 0.3, tr.y, true);
    expect(g.salvage.truck.by).toBe(null);
    expect(ev.filter((e) => e.type === 'enterTruck').length).toBe(1);
    // Not yet far enough away (enter + rearm), back in reach: still out.
    P(tr.x - (C.truck.enter + C.truck.rearm - 0.1), tr.y, true);
    P(tr.x - 1, tr.y, true);
    expect(g.salvage.truck.by).toBe(null);
    // Walked away past enter + rearm, then into it again: in.
    P(tr.x - (C.truck.enter + C.truck.rearm + 0.2), tr.y, true);
    P(tr.x - 1, tr.y, true);
    expect(g.salvage.truck.by).toBe('boss');
    expect(ev.filter((e) => e.type === 'enterTruck').length).toBe(2);
  });
});

describe('work: the nearest WORKABLE thing (2.1; content 17:58)', () => {
  it('a thing above his tier nearer than a workable one does not hold him: he works the workable one', () => {
    let g = fresh();
    const rad = g.salvage.things.find((t) => C.objects[t.obj].tier > g.salvage.tier)!;
    const d0 = g.salvage.things.find((t) => t.uid === 'd0')!;
    // The radiator set down in the drop-off's next slot, as in the bots' seed 2.
    const at1 = { at: 'dropoff', slot: 1 } as typeof d0.at;
    g = { ...g, salvage: { ...g.salvage, things: g.salvage.things.map((t) => (t.uid === rad.uid ? { ...t, at: at1 } : t)) } };
    const pw = thingPos(C, d0.at);
    const pr = thingPos(C, at1);
    // Stand between them, nearer the radiator, both within reach.work.
    const sx = pw.x + (pr.x - pw.x) * 0.6;
    const sy = pw.y + (pr.y - pw.y) * 0.6 + 0.3;
    const h = hand(cfg, g, FIXTURE_NOW);
    walkTo(h, sx, sy);
    stand(h, 3);
    expect(h.g.salvage.act.kind === 'work' && h.g.salvage.act.target === 'd0' || h.events.some((e) => e.type === 'workStart' && e.thing === 'd0')).toBe(true);
    expect(h.events.some((e) => e.type === 'refused' && (e.key === 'tool2' || e.key === 'tool3'))).toBe(false);
  });
  it('with only a thing above his tier in reach he is refused once', () => {
    const g = fresh();
    const rad = g.salvage.things.find((t) => C.objects[t.obj].tier === 2)!;
    const p = thingPos(C, rad.at);
    const o = C.objects[rad.obj];
    const h = hand(cfg, g, FIXTURE_NOW);
    walkTo(h, p.x, p.y + o.size.d / 2 + 0.3);
    stand(h, 3);
    expect(h.events.filter((e) => e.type === 'refused' && e.key === 'tool2').length).toBe(1);
  });
});
