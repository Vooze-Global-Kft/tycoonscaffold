/**
 * Time away (yard-stage1.md 2.16 with ECONOMY.md E33, E34 and findings P3, W2, R6, R10, H3), frozen test
 * content and the played frozen states. Owner: rules-sim-a.
 */
import { describe, expect, it } from 'vitest';
import { FIXTURE_NOW, SALVAGE_TEST, fixtureGame } from '../fixtures/salvage';
import * as R from '../salvage';
import { awayCapH, awayCapS, awayPass } from './away';
import type { SalvageConfig, SalvageEvent, SalvageGame } from './types';

const cfg = { mode: 'salvage', salvage: SALVAGE_TEST } as unknown as SalvageConfig;
const e33 = { mode: 'salvage', salvage: { ...SALVAGE_TEST, awayCapByRung_h: [0.5, 2, 4], nightWatch_h: 2 } } as unknown as SalvageConfig;
const base = (cash = 0) => ({ cash, lifetimeEarnings: 0, lastSavedAt: FIXTURE_NOW, stats: { playSeconds: 0, clockHigh: FIXTURE_NOW } }) as never;
const leave = (g: SalvageGame): SalvageGame => ({ ...g, lastSavedAt: g.salvage.clock.highMs });
const m30 = () => leave(fixtureGame('m30', base(), FIXTURE_NOW));

describe('the away card says what was applied (P3, W2)', () => {
  it('sales − spent = net = what the cash moved by; loads bought are listed by partner', () => {
    const g = m30();
    const out = awayPass(cfg, g, g.salvage.clock.highMs + 3 * 3600_000);
    const a = out.salvage.away!;
    expect(a).toBeTruthy();
    expect(a.spent).toBeGreaterThanOrEqual(0);
    expect(a.net).toBeCloseTo(a.money - (a.spent ?? 0), 2);
    expect(out.cash - g.cash).toBeCloseTo(a.net!, 2);
    const bought = a.bought ?? [];
    // Loads are counted when tipped, bought when hooked: a skip on the truck at either end differs by one.
    expect(Math.abs(bought.reduce((s, b) => s + b.n, 0) - a.loads)).toBeLessThanOrEqual(1);
    expect(bought.reduce((s, b) => s + b.spent, 0)).toBeCloseTo(a.spent ?? 0, 2);
    expect(a.absentS).toBe(3 * 3600);
  });

  it('the sold lines are only lots the merchant collected (held stock is never listed as sold)', () => {
    const g = m30();
    const ev: SalvageEvent[] = [];
    // Count the collections through a pass that keeps every event (the same rules, live advance with no boss).
    const out = awayPass(cfg, g, g.salvage.clock.highMs + 3 * 3600_000, ev);
    const a = out.salvage.away!;
    const sold = a.lines.reduce((s, l) => s + l.money, 0);
    const deliveries = (a.deliveryList ?? []).reduce((s, d) => s + d.paid, 0);
    expect(sold + deliveries).toBeCloseTo(a.money, 1);
    // Every line's grams were supplied (collected lots and deliveries are what "supplied" counts): no held or reserved grams.
    const linesG = a.lines.reduce((s, l) => s + l.g, 0) + (a.deliveryList ?? []).reduce((s, d) => s + d.g, 0);
    expect(linesG).toBe(a.supplied_g);
    // The held bay keeps its grams in the yard and they are not counted as sold.
    for (const [gr, b] of Object.entries(out.salvage.bays)) if (b.held) expect(b.g, gr).toBeGreaterThanOrEqual(0);
  });

  it('only awayReport, passed and rung leave the pass (never item events)', () => {
    const g = m30();
    const ev: SalvageEvent[] = [];
    awayPass(cfg, g, g.salvage.clock.highMs + 3 * 3600_000, ev);
    expect(ev.length).toBeGreaterThan(0);
    for (const e of ev) expect(['awayReport', 'passed', 'rung']).toContain(e.type);
  });

  it('two passes on one waiting card add up (spent, net, bought)', () => {
    const g = m30();
    const a1 = awayPass(cfg, g, g.salvage.clock.highMs + 3600_000);
    const a2 = awayPass(cfg, leave(a1), a1.salvage.clock.highMs + 3600_000);
    const w = a2.salvage.away!;
    expect(w.net).toBeCloseTo(w.money - (w.spent ?? 0), 2);
    expect(a2.cash - g.cash).toBeCloseTo(w.net!, 1);
    expect(Math.abs((w.bought ?? []).reduce((s, b) => s + b.n, 0) - w.loads)).toBeLessThanOrEqual(2);
  });
});

describe('join3: the stock the time away left unsold', () => {
  it('the card carries the bays\' gain at the day\'s lot price (held bays included), never negative', () => {
    const g0 = m30();
    // Hold every bay: the merchant collects nothing, so all the pass weighs in stays in the bays.
    const bays = Object.fromEntries(Object.entries(g0.salvage.bays).map(([k, b]) => [k, { ...b, held: true }]));
    const g = { ...g0, salvage: { ...g0.salvage, bays } };
    const out = awayPass(cfg, g, g.salvage.clock.highMs + 2 * 3600_000);
    const a = out.salvage.away!;
    expect(a).toBeTruthy();
    let gain = 0;
    for (const [gr, b] of Object.entries(out.salvage.bays)) {
      const d = b.g - (g.salvage.bays[gr]?.g ?? 0);
      if (d > 0) gain += d;
    }
    expect(gain).toBeGreaterThan(0);
    expect(a.unsold).toBeGreaterThan(0);
    expect(a.unsold).toBe(Math.max(0, a.bayDelta!));
  });
});

describe('E33: the away cap grows with the rung', () => {
  it('half an hour on rung 1, two on rung 2, four on rung 3, plus two with the Night watch', () => {
    const c = e33.salvage;
    expect(awayCapH(c, 1, false)).toBe(0.5);
    expect(awayCapH(c, 2, false)).toBe(2);
    expect(awayCapH(c, 3, false)).toBe(4);
    expect(awayCapH(c, 9, false)).toBe(4);
    expect(awayCapH(c, 1, true)).toBe(2.5);
    expect(awayCapH(c, 3, true)).toBe(6);
  });
  it('the pass runs the rung\'s cap, the card says how long it ran and what makes it run longer', () => {
    const g = leave(fixtureGame('m5', base(), FIXTURE_NOW));
    expect(g.salvage.ladder.rung).toBe(1);
    const out = awayPass(e33, g, g.salvage.clock.highMs + 4 * 3600_000);
    const a = out.salvage.away!;
    expect(a.seconds).toBe(1800);
    expect(a.capS).toBe(awayCapS(e33, g));
    expect(a.absentS).toBe(4 * 3600);
    expect(a.runLonger).toEqual({ rung: 2, capS: 2 * 3600 });
    expect(out.salvage.t - g.salvage.t).toBeCloseTo(1800, 6);
  });
  it('a one-rung list holds on every rung (the test content: 4 h, Night watch + 2 h)', () => {
    const g = m30();
    expect(awayCapS(cfg, g)).toBe((SALVAGE_TEST.awayCapByRung_h[0] + (g.salvage.owned.includes('night') ? SALVAGE_TEST.nightWatch_h : 0)) * 3600);
  });
});

describe('E34: deal deliveries at every midnight that passed', () => {
  it('a running deal delivers at midnights beyond the cap, from its reserve, and the card lists them', () => {
    const g0 = m30();
    expect(g0.salvage.deal.phase).toBe('running');
    // Give the reserve enough for every day of the deal (it was set aside before the boss left).
    const s = structuredClone(g0.salvage);
    const grade = SALVAGE_TEST.deal.grade;
    const b = s.bays[grade];
    b.g = Math.max(b.g, s.deal.q_g * s.deal.days);
    b.forDeal_g = s.deal.q_g;
    const g = { ...g0, salvage: s };
    const days = 5;
    const out = awayPass(e33, g, g.salvage.clock.highMs + days * 86_400_000);
    const a = out.salvage.away!;
    const left = g.salvage.deal.days - g.salvage.deal.delivered;
    expect(a.deliveries).toBe(Math.min(left, days));
    expect((a.deliveryList ?? []).length).toBe(a.deliveries);
    expect(out.salvage.clock.day).toBe(g.salvage.clock.day + days);
    const daysSeen = (a.deliveryList ?? []).map((d) => d.day);
    expect(new Set(daysSeen).size).toBe(daysSeen.length);
    // Paid once: a second pass from the same high mark pays nothing more.
    const again = awayPass(e33, leave(out), out.salvage.clock.highMs);
    expect(again.cash).toBe(out.cash);
  });
});

describe('a year away', () => {
  it('stays finite and cheap', () => {
    const g = m30();
    const out = R.salvageOffline(e33, g, g.salvage.clock.highMs + 365 * 86_400_000).game;
    expect(Number.isFinite(out.cash)).toBe(true);
    expect(out.salvage.deal.phase === 'running').toBe(false);
  });
});
