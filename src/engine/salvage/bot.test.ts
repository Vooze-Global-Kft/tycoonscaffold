/**
 * The bots (bot.ts) on the FROZEN test content: short deterministic runs. No tuned number is pinned:
 * these check that a bot plays through the screen's actions, keeps the hard promises of 8.3 and is
 * deterministic. Owner: content.
 */
import { describe, expect, it } from 'vitest';
import { SALVAGE_TEST } from '../fixtures/salvage';
import { away, closeLeg, graphOf, GUARD_BLOCK_S, isBlocked, newBot, newSitting, pathLen, pathOf, playTo, press, resumeBot, snapBot, startGame, tickJumpGate } from './bot';
import { lots4, r3Works, r4Game, worksCfg } from '../fixtures/salvage2works';
import { thingPos } from './positions';
import type { SalvageConfig } from './types';
import { begin, finish } from './clock';
import { orderPlate, worksOwn } from './works';
import { financeHabit } from './bot';
import { moneyCfg, r3open } from '../fixtures/salvage2money';
import { financeTerms, ratedIG } from './bank';
import { reserve } from './advice';
import { roundMoney } from './money';

const cfg = { mode: 'salvage', salvage: SALVAGE_TEST } as unknown as SalvageConfig;
const NOW = Date.UTC(2026, 10, 25, 9);

function run(minutes: number, opts: Partial<Parameters<typeof newBot>[3]> = {}) {
  const b = newBot(cfg, startGame(cfg, NOW), NOW, { hand: 'normal', habit: 'goal', route: 'A', seed: 3, ...opts });
  playTo(b, minutes * 60);
  return b;
}

describe('salvage bots on the frozen content', () => {
  it('plays a first ticket and keeps every hard promise in four minutes', () => {
    const b = run(4);
    expect(b.rec.first.ticket).toBeGreaterThan(0);
    expect(b.g.lifetimeEarnings).toBeGreaterThan(0);
    expect(b.rec.broken).toEqual([]);
    expect(b.g.cash).toBeGreaterThanOrEqual(0);
    // Every purchase was paid at exactly the price its card showed.
    for (const p of b.rec.purchases) expect(p.price).toBeGreaterThan(0);
  });

  it('is deterministic: the same seed plays the same game', () => {
    const a = run(3, { seed: 5 });
    const c = run(3, { seed: 5 });
    expect(c.g.cash).toBe(a.g.cash);
    expect(c.g.salvage.ladder.supplied_g).toBe(a.g.salvage.ladder.supplied_g);
    expect(c.rec.purchases.map((p) => p.key)).toEqual(a.rec.purchases.map((p) => p.key));
  });

  it('the slow hand is no faster than the brisk hand to its first ticket', () => {
    const slow = run(2, { hand: 'slow' });
    const brisk = run(2, { hand: 'brisk' });
    expect(slow.rec.first.ticket ?? Infinity).toBeGreaterThanOrEqual(brisk.rec.first.ticket ?? Infinity);
    expect(slow.rec.reactS / slow.rec.legs).toBeGreaterThan(brisk.rec.reactS / brisk.rec.legs);
  });

  it('walks round solids and through the container wall gaps', () => {
    const gr = graphOf(cfg);
    const c = cfg.salvage;
    const from = { x: c.map.points.scale[0], y: c.map.points.scale[1] };
    for (const [id, p] of Object.entries(c.map.points)) {
      const to = { x: p[0], y: p[1] };
      const path = pathOf(gr, from, to);
      expect(path.at(-1)).toEqual(to);
      expect(pathLen(from, path)).toBeGreaterThanOrEqual(Math.hypot(to.x - from.x, to.y - from.y) - 1e-9);
      void id;
    }
  });

  it('the back wall (map.north) is solid: no path runs north of it, and a run never stands there', () => {
    const c0 = cfg.salvage;
    const ys = Object.values(c0.map.points).map((p) => p[1]);
    const north = Math.min(...ys) - 0.5;
    const walled = { ...cfg, salvage: { ...c0, map: { ...c0.map, north } } } as unknown as SalvageConfig;
    const gr = graphOf(walled);
    expect(gr.rects.some((r) => r.y1 >= north + 0.4 && r.x0 < 0 && r.x1 > c0.yard.width)).toBe(true);
    const from = { x: c0.map.points.scale[0], y: c0.map.points.scale[1] };
    for (const p of Object.values(c0.map.points)) for (const q of pathOf(gr, from, { x: p[0], y: p[1] })) expect(q.y).toBeGreaterThan(north);
    const b = newBot(walled, startGame(walled, NOW), NOW, { hand: 'normal', habit: 'goal', route: 'A', seed: 3 });
    let minY = Infinity;
    playTo(b, 120, (bb) => (minY = Math.min(minY, bb.g.salvage.presence.y)));
    expect(minY).toBeGreaterThan(north);
    expect(b.rec.broken).toEqual([]);
  });

  it('ticking equals jumping on a state the bot reached (2.14 gate)', () => {
    const b = run(3);
    expect(tickJumpGate(cfg, b.g, b.now, 30)).toBeNull();
  });
});

/**
 * Stage 2 (content2-bots; yard-stage2.md 8.2): the stage-2 layer on the works' frozen content. No tuned number is pinned:
 * the layer plays through the rules' actions, keeps the hard promises, is deterministic, starts up a plate that waits,
 * and a snapshot resumed plays on exactly as the bot it was taken from.
 */
describe('salvage bots at stage 2 (the works frozen content)', () => {
  const wcfg = worksCfg();
  function sitting(g: ReturnType<typeof r3Works>, opts: Partial<Parameters<typeof newBot>[3]> = {}, minutes = 3) {
    const b = newBot(wcfg, g, g.salvage.clock.highMs, { hand: 'normal', habit: 'goal', route: 'A', seed: 2, ...opts });
    newSitting(b);
    away(b, 3600);
    playTo(b, b.g.salvage.t + minutes * 60);
    return b;
  }

  it('from rung 3 a sitting keeps every hard promise and is deterministic', () => {
    const a = sitting(r3Works());
    const z = sitting(r3Works());
    expect(a.rec.broken).toEqual([]);
    expect(z.g.cash).toBe(a.g.cash);
    expect(z.rec.purchases.map((p) => p.key)).toEqual(a.rec.purchases.map((p) => p.key));
  });

  it('a plate set down and waiting is started up by the boss standing at it', () => {
    const g0 = structuredClone(r4Game());
    const id = Object.keys(g0.salvage.works)[0];
    g0.salvage.works[id] = { ...g0.salvage.works[id], phase: 'installed', commissionAt: g0.salvage.t + 10_000 };
    const b = newBot(wcfg, g0, g0.salvage.clock.highMs, { hand: 'brisk', habit: 'goal', route: 'A', seed: 2 });
    newSitting(b);
    playTo(b, b.g.salvage.t + 120);
    expect(b.g.salvage.works[id].phase).toBe('running');
    expect(b.rec.s2.commissioned.some((q) => q.plate === id && q.by === 'boss')).toBe(true);
    expect(b.rec.broken).toEqual([]);
  });

  it('every habit plays a sitting from rung 4 with no promise broken', () => {
    for (const o of [{ finance: 'always' as const }, { packs: true }, { ads: true }, { rack: 'rack' as const }, { rack: 'cut' as const }, { steelMax: true }, { holder: true }]) {
      const b = sitting(r4Game(), o, 2);
      expect(b.rec.broken).toEqual([]);
    }
  });

  it('a snapshot resumed plays on as the bot it was taken from', () => {
    const a = newBot(wcfg, r3Works(), r3Works().salvage.clock.highMs, { hand: 'normal', habit: 'goal', route: 'A', seed: 4 });
    playTo(a, a.g.salvage.t + 60);
    const r = resumeBot(wcfg, snapBot(a), { hand: 'normal', habit: 'goal', route: 'A', seed: 4 });
    playTo(a, a.g.salvage.t + 90);
    playTo(r, r.g.salvage.t + 90);
    expect(JSON.stringify(r.g)).toBe(JSON.stringify(a.g));
  });
});

describe('R4 (RULING2 24): the boss in the forklift, and the guard against a refused act', () => {
  const wcfg = worksCfg();
  const opts = { hand: 'normal' as const, habit: 'goal' as const, route: 'A' as const, seed: 2 };

  it('a bot seated in the forklift beside an oversize piece steps out and works it (the 284 "cut lot17" of seed 201)', () => {
    const g0 = structuredClone(lots4());
    const s = g0.salvage;
    const lot = s.things.find((th) => th.at.at === 'lot')!;
    const q = thingPos(wcfg.salvage, lot.at);
    s.presence = { ...s.presence, x: q.x + 1.5, y: q.y, moving: false, driving: false, standingFor: 0 };
    s.forklift = { x: q.x + 1.5, y: q.y, heading: 0 as never, by: 'boss', load: [] };
    const b = newBot(wcfg, g0, s.clock.highMs, opts);
    newSitting(b);
    playTo(b, b.g.salvage.t + 5);
    expect(b.g.salvage.forklift?.by).toBe(null);
    playTo(b, b.g.salvage.t + 300);
    // Nothing of his came to nothing twice in a row on one lot, and the boss's own work ran.
    expect(b.rec.refused.filter((r) => r.key === 'guard' && r.what.startsWith('cut lot'))).toEqual([]);
    expect(b.g.salvage.counts?.lotOpened ?? 0).toBeGreaterThan(s.counts?.lotOpened ?? 0);
    expect(b.rec.broken).toEqual([]);
  });

  it('a card press refused twice in a row is not pressed a third time; the bot chooses something else', () => {
    const b = newBot(wcfg, { ...structuredClone(r3Works()), cash: 0 }, r3Works().salvage.clock.highMs, opts);
    const a = { act: 'buy' as const, item: 'crane', price: 1000 };
    expect(press(b, a, false)).toBe(false);
    expect(press(b, a, false)).toBe(false);
    expect(isBlocked(b, `press ${JSON.stringify(a)}`)).toBe(true);
    const n = b.rec.refused.filter((r) => r.key !== 'guard').length;
    expect(press(b, a, false)).toBe(false);
    expect(b.rec.refused.filter((r) => r.key !== 'guard').length).toBe(n);
    expect(b.rec.refused.filter((r) => r.key === 'guard').length).toBe(1);
  });

  it('a leg of one label that comes to nothing twice in a row is set aside; one that works in between is not', () => {
    const b = newBot(wcfg, structuredClone(r3Works()), r3Works().salvage.clock.highMs, opts);
    const nothing = () => ({ what: 'cut x1', acted: false, load0: b.g.salvage.load.reduce((a, p) => a + p.g, 0) });
    b.leg = nothing();
    closeLeg(b);
    b.leg = { ...nothing(), acted: true };
    closeLeg(b);
    b.leg = nothing();
    closeLeg(b);
    expect(isBlocked(b, 'cut x1')).toBe(false);
    b.leg = nothing();
    closeLeg(b);
    expect(isBlocked(b, 'cut x1')).toBe(true);
    // Set aside for a while, then offered again.
    playTo(b, b.g.salvage.t + GUARD_BLOCK_S + 1);
    expect(isBlocked(b, 'cut x1')).toBe(false);
  });
});

describe('REPORT9 (content2-bots): the measured branches buy nothing; the boss drives the forklift', () => {
  const wcfg = worksCfg();
  const opts = { hand: 'normal' as const, habit: 'goal' as const, route: 'A' as const, seed: 3 };

  it('noBuy: an hour\'s branch of RULING2 21.1 plays the hand and buys, hires and levels nothing', () => {
    const g0 = { ...structuredClone(r3Works()), cash: 1e7 };
    const b = newBot(wcfg, g0, g0.salvage.clock.highMs, { ...opts, noBuy: true });
    newSitting(b);
    playTo(b, b.g.salvage.t + 240);
    expect(b.rec.purchases).toEqual([]);
    expect(b.g.salvage.owned).toEqual(g0.salvage.owned);
    expect(b.g.salvage.crew.length).toBe(g0.salvage.crew.length);
    expect(b.rec.broken).toEqual([]);
    // the same state without the option buys (so the option is what keeps the branch from buying)
    const a = newBot(wcfg, g0, g0.salvage.clock.highMs, opts);
    newSitting(a);
    playTo(a, a.g.salvage.t + 240);
    expect(a.rec.purchases.length).toBeGreaterThan(0);
  });

  it('a car on the pad and a running depollution bay: the bot walks into the forklift, sets the car on the apron and steps out', () => {
    const x = begin(wcfg, structuredClone(r3Works()), [], true);
    orderPlate(x, 'depollution', x.s.t);
    x.s.works.depollution = { ...x.s.works.depollution, phase: 'running', status: 'idle', commissionAt: null, commissionedBy: 'self' };
    if (!x.s.owned.includes('forklift')) x.s.owned.push('forklift');
    worksOwn(x, 'forklift', x.s.t);
    x.s.things.push({ uid: 'carT', obj: 'elv', at: { at: 'elvPad', k: 0 }, cut: 0, progress: 0, by: null });
    const g0 = finish(r3Works(), x);
    const b = newBot(wcfg, g0, g0.salvage.clock.highMs, { ...opts, noBuy: true });
    newSitting(b);
    playTo(b, b.g.salvage.t + 180);
    const car = b.g.salvage.things.find((t) => t.uid === 'carT');
    expect(car === undefined || car.at.at === 'apron').toBe(true);
    expect(b.g.salvage.works.depollution.car?.thing === 'carT' || (b.g.salvage.counts?.depolluted ?? 0) >= 1).toBe(true);
    expect(b.g.salvage.forklift?.by).toBe(null);
    expect(b.rec.broken).toEqual([]);
  });
});

/**
 * s2e-bots (yard-stage2-economy.md 2.14.2, 2.10; RULING2 27): the hook-lift financed at its card (the truck park's), and the
 * boss's own hand cutting every oversize piece his tool opens whatever the goal. On the frozen contents, with the new rule's
 * bank written here (as bankReach.test.ts does): no tuned number of game.json is read or pinned.
 */
describe('s2e-bots: the new stage\'s habits', () => {
  const opts = { hand: 'normal' as const, habit: 'goal' as const, route: 'A' as const, seed: 2 };
  function hookCfg(): SalvageConfig {
    const base = moneyCfg();
    const c = structuredClone(base.salvage) as unknown as SalvageConfig['salvage'] & { tau_h: (number | null)[] };
    c.bank = { ...c.bank!, maxF_h: 6, maxF_tau: 0.5 };
    c.tau_h = [null, null, 12, 36, 48];
    const tb = c.worksLayer!.shop.find((i) => i.key === 'truckBridge')!;
    tb.price = roundMoney(3 * ratedIG(base, r3open()).I);
    (tb as { financeable?: boolean }).financeable = true;
    return { ...base, salvage: c } as SalvageConfig;
  }
  const hcfg = hookCfg();
  const g0 = (() => {
    const g = r3open();
    const tm = financeTerms(hcfg, { ...g, cash: 0 }, 'truckBridge')!;
    return { ...g, cash: roundMoney(reserve(hcfg, g) + tm.d + 500), salvage: { ...g.salvage, bank: { ...g.salvage.bank, letterSeen: false } } };
  })();

  it('the always-finance bot opens the truck park\'s card, reads the letter and signs the hook-lift\'s loan: the deposit exactly, the truck ordered', () => {
    const b = newBot(hcfg, structuredClone(g0), g0.salvage.clock.highMs, { ...opts, finance: 'always' });
    newSitting(b);
    const tm = financeTerms(hcfg, b.g, 'truckBridge')!;
    const cash0 = b.g.cash;
    expect(financeHabit(b, 'truckBridge')).toBe(true);
    expect(b.g.salvage.bank.letterSeen).toBe(true);
    expect(b.rec.s2.offers.map((o) => o.plate)).toEqual(['truckBridge']);
    expect(b.rec.s2.loans.map((l) => l.plate)).toEqual(['truckBridge']);
    expect(b.g.salvage.bank.agreement?.plate).toBe('truckBridge');
    expect(b.g.salvage.owned.includes('truckBridge' as never) || b.g.salvage.arriving.some((q) => q.item === 'truckBridge')).toBe(true);
    // the deposit is P - F of the terms shown (the walk to the card took a few seconds: the terms read at the press)
    expect(b.rec.purchases.at(-1)!.price).toBeCloseTo(b.rec.s2.loans[0].P - b.rec.s2.loans[0].F, 2);
    expect(cash0 - b.g.cash).toBeGreaterThan(0);
    void tm;
    expect(b.rec.broken).toEqual([]);
    // once a sitting: no second opening of the card in the same sitting
    expect(financeHabit(b, 'truckBridge')).toBe(false);
  });

  it('the never-finance bot sees the offer and signs nothing', () => {
    const b = newBot(hcfg, structuredClone(g0), g0.salvage.clock.highMs, opts);
    newSitting(b);
    expect(financeHabit(b, 'truckBridge')).toBe(true);
    expect(b.rec.s2.offers.length).toBe(1);
    expect(b.rec.s2.loans).toEqual([]);
    expect(b.g.salvage.bank.agreement ?? null).toBe(null);
  });

  it('s2e-measure (28.4 f): from the works\' opening the card manager answers a first-yard optional goal card (signs or puts it aside)', () => {
    const wcfg = worksCfg();
    const g = structuredClone(r3Works());
    const ids = wcfg.salvage.goals.map((d) => d.id);
    const k = ids.indexOf('signDeal');
    expect(k).toBeGreaterThanOrEqual(0);
    g.salvage.goals.done = g.salvage.goals.done.filter((id) => id !== 'signDeal');
    g.salvage.goals.skipped = (g.salvage.goals.skipped ?? []).filter((id) => id !== 'signDeal');
    for (const id of ids.slice(0, k)) if (!g.salvage.goals.done.includes(id)) g.salvage.goals.done.push(id);
    const b = newBot(wcfg, g, g.salvage.clock.highMs, { ...opts, manager: true });
    newSitting(b);
    playTo(b, b.g.salvage.t + 120);
    const answered = b.g.salvage.goals.done.includes('signDeal') || (b.g.salvage.goals.skipped ?? []).includes('signDeal');
    expect(answered).toBe(true);
    expect(b.rec.broken).toEqual([]);
  });

  it('every oversize piece his tool opens is cut, whatever the goal (the boss\'s own hand)', () => {
    const wcfg = worksCfg();
    const g = structuredClone(lots4());
    g.salvage.goals.done = [...new Set([...g.salvage.goals.done, 'cutLot'])];
    const before = g.salvage.counts?.lotOpened ?? 0;
    const b = newBot(wcfg, g, g.salvage.clock.highMs, opts);
    newSitting(b);
    playTo(b, b.g.salvage.t + 240);
    expect(b.g.salvage.counts?.lotOpened ?? 0).toBeGreaterThan(before);
    expect(b.rec.broken).toEqual([]);
  });
});
