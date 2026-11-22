/// <reference types="node" />
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { GameConfigSchema, lintGameConfig } from '../config/schema';
import * as E from './economy';
import { formatNumber, formatDuration } from './format';

const gamesDir = path.resolve(__dirname, '../../games');
const load = (id: string) => GameConfigSchema.parse(JSON.parse(fs.readFileSync(path.join(gamesDir, id, 'game.json'), 'utf8')));
const cfg = load('pizza-empire');
const T0 = 1_700_000_000_000;

describe('every game in games/', () => {
  const ids = fs.readdirSync(gamesDir).filter((d) => !d.startsWith('_') && fs.existsSync(path.join(gamesDir, d, 'game.json')));
  it.each(ids)('%s parses and lints clean', (id) => {
    expect(lintGameConfig(load(id))).toEqual([]);
  });
});

describe('costs', () => {
  const b = cfg.businesses[1];
  it('bulk cost equals the sum of single purchases', () => {
    let sum = 0;
    for (let i = 0; i < 10; i++) sum += E.costFor(b, 5 + i, 1);
    expect(E.costFor(b, 5, 10)).toBeCloseTo(sum, 6);
  });
  it('maxAffordable never overspends', () => {
    for (const cash of [0, 59, 60, 1000, 1e6, 1e12]) {
      const n = E.maxAffordable(b, 3, cash);
      expect(E.costFor(b, 3, n)).toBeLessThanOrEqual(cash);
      expect(E.costFor(b, 3, n + 1)).toBeGreaterThan(cash);
    }
  });
});

describe('simulation', () => {
  it('starts with one of the first business and starting cash', () => {
    const s = E.createInitialState(cfg, T0);
    expect(s.businesses[cfg.businesses[0].id].owned).toBe(1);
    expect(s.cash).toBe(cfg.economy.startingCash);
  });

  it('an unmanaged business pays once per tap', () => {
    const id = cfg.businesses[0].id;
    let s = E.startBusiness(E.createInitialState(cfg, T0), id);
    s = E.tick(cfg, s, 10, T0); // far longer than one cycle
    expect(s.cash).toBe(cfg.economy.startingCash + cfg.businesses[0].baseRevenue);
    expect(s.businesses[id].running).toBe(false);
  });

  it('a managed business pays every cycle, even with large dt', () => {
    const b = cfg.businesses[0];
    let s = E.createInitialState(cfg, T0);
    s = { ...s, cash: 1e9 };
    s = E.hireManager(cfg, s, b.id);
    const cash0 = s.cash;
    s = E.tick(cfg, s, b.cycleSeconds * 100 + b.cycleSeconds / 2, T0);
    expect(s.cash - cash0).toBeCloseTo(100 * b.baseRevenue, 6);
    expect(s.businesses[b.id].progress).toBeCloseTo(0.5, 6);
  });

  it('income per second matches simulated earnings', () => {
    let s = { ...E.createInitialState(cfg, T0), cash: 1e12 };
    for (const b of cfg.businesses.slice(0, 4)) {
      s = E.buyBusiness(cfg, s, b.id, 30);
      s = E.hireManager(cfg, s, b.id);
    }
    const ips = E.incomePerSecond(cfg, s, T0);
    const before = s.cash;
    for (let i = 0; i < 6000; i++) s = E.tick(cfg, s, 0.1, T0);
    // Within 1%: the last partial cycle of each business is not paid yet.
    expect(Math.abs((s.cash - before) / 600 / ips - 1)).toBeLessThan(0.01);
  });

  it('milestones speed businesses up', () => {
    const id = cfg.businesses[0].id;
    let s = { ...E.createInitialState(cfg, T0), cash: 1e9 };
    const slow = E.cycleSeconds(cfg, s, id);
    s = E.buyBusiness(cfg, s, id, 24); // 25 owned
    expect(E.cycleSeconds(cfg, s, id)).toBeCloseTo(slow / 4);
  });

  it('boost doubles revenue while active only', () => {
    const id = cfg.businesses[0].id;
    let s = E.createInitialState(cfg, T0);
    const base = E.revenuePerCycle(cfg, s, id, T0);
    s = E.activateBoost(cfg, s, T0);
    expect(E.revenuePerCycle(cfg, s, id, T0 + 1000)).toBe(base * cfg.economy.boost.multiplier);
    expect(E.revenuePerCycle(cfg, s, id, T0 + cfg.economy.boost.minutesPerAd * 60_000 + 1)).toBe(base);
  });

  it('boost stacking is capped', () => {
    let s = E.createInitialState(cfg, T0);
    for (let i = 0; i < 50; i++) s = E.activateBoost(cfg, s, T0);
    expect(s.boostUntil).toBe(T0 + cfg.economy.boost.maxMinutes * 60_000);
    expect(E.canBoost(cfg, s, T0)).toBe(false);
  });
});

describe('offline', () => {
  it('is capped and ignores boosts', () => {
    const b = cfg.businesses[0];
    let s = { ...E.createInitialState(cfg, T0), cash: 1e9 };
    s = E.hireManager(cfg, s, b.id);
    s = E.activateBoost(cfg, { ...s, lastSavedAt: T0 }, T0);
    const { seconds, earnings } = E.computeOffline(cfg, s, T0 + 48 * 3600_000);
    expect(seconds).toBe(cfg.economy.offline.maxHours * 3600);
    const ips = E.incomePerSecond(cfg, { ...s, boostUntil: 0 }, T0);
    expect(earnings).toBeCloseTo(ips * seconds * cfg.economy.offline.efficiency);
  });
});

describe('prestige', () => {
  it('awards sqrt-scaled points and keeps gems and entitlements', () => {
    let s = E.createInitialState(cfg, T0);
    s = { ...s, lifetimeEarnings: cfg.economy.prestige.threshold * 100, gems: 42 };
    s = E.applyProduct(cfg, s, cfg.monetization.iap.products.find((p) => p.kind === 'noAds')!, T0);
    const p = E.prestige(cfg, s, T0);
    expect(p.prestigePoints).toBe(10);
    expect(p.gems).toBe(42);
    expect(p.entitlements.noAds).toBe(true);
    expect(p.cash).toBe(cfg.economy.startingCash);
    expect(E.prestigePointsAvailable(cfg, p)).toBe(0);
  });
  it('does nothing with no points to gain', () => {
    const s = E.createInitialState(cfg, T0);
    expect(E.prestige(cfg, s, T0)).toBe(s);
  });
});

describe('daily, story, IAP', () => {
  it('daily streak continues on consecutive days and resets after a gap', () => {
    let s = E.createInitialState(cfg, T0);
    s = E.claimDaily(cfg, s, T0);
    expect(E.canClaimDaily(s, T0)).toBe(false);
    s = E.claimDaily(cfg, s, T0 + 86_400_000);
    expect(s.daily.streak).toBe(2);
    s = E.claimDaily(cfg, s, T0 + 5 * 86_400_000);
    expect(s.daily.streak).toBe(1);
  });

  it('story beats fire once, in order', () => {
    let s = E.createInitialState(cfg, T0);
    const first = E.pendingStoryBeat(cfg, s)!;
    expect(first.id).toBe('intro');
    s = E.markStorySeen(s, first);
    expect(E.pendingStoryBeat(cfg, s)).toBeNull();
  });

  it('non-consumables apply once; consumables stack', () => {
    const x2 = cfg.monetization.iap.products.find((p) => p.kind === 'multiplier')!;
    const gems = cfg.monetization.iap.products.find((p) => p.kind === 'gems')!;
    let s = E.createInitialState(cfg, T0);
    s = E.applyProduct(cfg, E.applyProduct(cfg, s, x2, T0), x2, T0);
    expect(E.entitlementMultiplier(s)).toBe(2);
    s = E.applyProduct(cfg, E.applyProduct(cfg, s, gems, T0), gems, T0);
    expect(s.gems).toBe(gems.value * 2);
  });

  it('reconcileState keeps progress and adds new businesses', () => {
    const s = { ...E.createInitialState(cfg, T0), cash: 123 };
    const { [cfg.businesses[9].id]: _dropped, ...rest } = s.businesses;
    const r = E.reconcileState(cfg, { ...s, businesses: rest });
    expect(r.cash).toBe(123);
    expect(r.businesses[cfg.businesses[9].id].owned).toBe(0);
  });
});

describe('combo and bonus', () => {
  it('combo multiplier steps up and caps', () => {
    const { tapsPerLevel, maxMultiplier } = cfg.economy.combo;
    expect(E.comboMultiplier(cfg, 0)).toBe(1);
    expect(E.comboMultiplier(cfg, tapsPerLevel)).toBe(2);
    expect(E.comboMultiplier(cfg, tapsPerLevel * 100)).toBe(maxMultiplier);
  });
  it('combo multiplies tap earnings', () => {
    const s = E.createInitialState(cfg, T0);
    expect(E.tapHero(cfg, s, T0, 3).earned).toBeCloseTo(E.tapHero(cfg, s, T0).earned * 3);
  });
  it('bonus pays at least minTaps taps, and income-based once automated', () => {
    let s = E.createInitialState(cfg, T0);
    expect(E.bonusValue(cfg, s, T0)).toBeCloseTo(E.tapValue(cfg, s, T0) * cfg.economy.bonus.minTaps);
    s = { ...s, cash: 1e12 };
    for (const b of cfg.businesses.slice(0, 5)) s = E.hireManager(cfg, E.buyBusiness(cfg, s, b.id, 50), b.id);
    expect(E.bonusValue(cfg, s, T0)).toBeCloseTo(E.incomePerSecond(cfg, s, T0) * cfg.economy.bonus.incomeSeconds);
    const before = s.cash;
    expect(E.collectBonus(cfg, s, T0).state.cash - before).toBeCloseTo(E.bonusValue(cfg, s, T0));
  });
});

describe('format', () => {
  it.each([
    [0, '0'],
    [999, '999'],
    [1500, '1.50K'],
    [2.5e6, '2.50M'],
    [1e33, '1.00Dc'],
    [1e36, '1.00aa'],
    [999_999, '999.99K'],
  ])('%d -> %s', (n, s) => expect(formatNumber(n)).toBe(s));
  it('durations', () => {
    expect(formatDuration(3725)).toBe('1h 02m');
    expect(formatDuration(65)).toBe('1m 05s');
  });
});
