/// <reference types="node" />
import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { artIconsFor } from '../config/artIcons';
import { lintGameConfig } from '../config/lint';
import { GameConfigSchema, type GameConfig } from '../config/schema';
import * as E from './economy';
import { MAIN_VENUE as V } from './economy';
import { formatNumber, formatDuration } from './format';
import * as M from './meta';
import type { GameEvent } from './economy';
import type { GameState } from './types';

const gamesDir = path.resolve(__dirname, '../../games');
const raw = (id: string) => JSON.parse(fs.readFileSync(path.join(gamesDir, id, 'game.json'), 'utf8'));
/** A frozen copy of an early classic game: engine tests never depend on shipped content another agent may be editing. */
const baseGame = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/base-game.json'), 'utf8'));
const load = (id: string) => GameConfigSchema.parse(raw(id));
const T0 = 1_700_000_000_000;

/** A small classic game, independent of the shipped games so content changes never break engine tests. */
const classicRaw = {
  ...baseGame,
  mode: 'classic',
  sim: undefined,
  story: [
    { id: 'intro', characterId: 'ai', trigger: { type: 'start' }, lines: ['Hello.'] },
    { id: 'second', characterId: 'ai', trigger: { type: 'owned', businessId: 'rover', count: 1 }, lines: ['A rover!'], rewardGems: 3 },
  ],
  economy: {
    startingCash: 5,
    prestige: { threshold: 1e12, scale: 1, bonusPerPoint: 0.02 },
    offline: { maxHours: 4, efficiency: 0.5, minSecondsToShow: 60 },
    boost: { multiplier: 2, minutesPerAd: 30, maxMinutes: 240 },
    daily: { gems: [5, 5, 10] },
    timeWarp: { hours: 1, gemCost: 25 },
  },
  meta: {
    cards: [
      { id: 'c_global', name: 'Global', icon: '⭐', rarity: 'legendary', stat: 'globalIncome' },
      { id: 'c_station', name: 'Station', icon: '🍳', rarity: 'common', stat: 'stationValue' },
      { id: 'c_carry', name: 'Carry', icon: '🤵', rarity: 'common', stat: 'transportCapacity' },
      { id: 'c_rare', name: 'Rare', icon: '💠', rarity: 'rare', stat: 'tapValue' },
    ],
  },
};
const cfg: GameConfig = GameConfigSchema.parse(classicRaw);

/** The same game as a production chain with two venues. */
const simCfg: GameConfig = GameConfigSchema.parse({
  ...classicRaw,
  mode: 'sim',
  story: [
    { id: 'intro', characterId: 'ai', trigger: { type: 'start' }, lines: ['Hello.'] },
    { id: 'hired', characterId: 'ai', trigger: { type: 'hired', businessId: 'drill' }, lines: ['Automation!'] },
    { id: 'floor', characterId: 'ai', trigger: { type: 'transportHired' }, lines: ['No more bell.'] },
    { id: 'second_venue', characterId: 'ai', trigger: { type: 'venue', venueId: 'b' }, lines: ['A new place.'] },
  ],
  sim: {
    transport: {
      name: 'Haulers', workerName: 'Hauler', icon: '🚚',
      baseCost: 20, costGrowth: 1.15, baseCapacity: 20, capacityGrowth: 1.12, tripSeconds: 6,
      workersAt: [1, 5, 15], managerCost: 500, managerName: 'Dispatcher', bellName: 'Horn',
    },
    sales: {
      name: 'Docks', seatName: 'Dock', icon: '⚓',
      baseCost: 20, costGrowth: 1.15, baseSpend: 10, spendGrowth: 1.12, serveSeconds: 4,
      seatsAt: [1, 1 + 1, 6, 12],
    },
    venues: [
      { id: 'a', name: 'Alpha', icon: '🅰️', unlockCost: 0, scale: 1 },
      { id: 'b', name: 'Beta', icon: '🅱️', unlockCost: 1e6, scale: 50 },
    ],
    // A sim game names its rush (lint, pizza-2); the other fields are the schema's defaults.
    rush: { name: 'Overtime' },
  },
});

const biz = (s: GameState, id: string, venueId = V) => s.venues[venueId].businesses[id];
const rich = (c: GameConfig, cash = 1e12) => ({ ...E.createInitialState(c, T0), cash });

describe('every game in games/', () => {
  const ids = fs.readdirSync(gamesDir).filter((d) => !d.startsWith('_') && fs.existsSync(path.join(gamesDir, d, 'game.json')));
  it.each(ids)('%s parses and lints clean', (id) => {
    expect(lintGameConfig(load(id))).toEqual([]);
  });
  it('an "art:" icon the mode does not draw fails the lint', () => {
    const game = load('pizza-empire');
    expect(lintGameConfig({ ...game, mode: 'classic' }, artIconsFor('classic')).some((p: string) => p.includes('"art:truffle"'))).toBe(true);
  });
  it('the test fixtures lint clean too', () => {
    expect(lintGameConfig(cfg)).toEqual([]);
    expect(lintGameConfig(simCfg)).toEqual([]);
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
  it('a venue scale multiplies costs', () => {
    expect(E.costFor(b, 3, 4, 50)).toBeCloseTo(E.costFor(b, 3, 4) * 50, 6);
    const n = E.maxAffordable(b, 3, 1e9, 50);
    expect(E.costFor(b, 3, n, 50)).toBeLessThanOrEqual(1e9);
    expect(E.costFor(b, 3, n + 1, 50)).toBeGreaterThan(1e9);
  });
});

describe('classic simulation', () => {
  it('starts with one of the first business and starting cash, in a single venue', () => {
    const s = E.createInitialState(cfg, T0);
    expect(Object.keys(s.venues)).toEqual([V]);
    expect(s.venues[V].chain).toBeNull();
    expect(biz(s, cfg.businesses[0].id).owned).toBe(1);
    expect(s.cash).toBe(cfg.economy.startingCash);
  });

  it('an unmanaged business pays once per tap', () => {
    const id = cfg.businesses[0].id;
    let s = E.startBusiness(E.createInitialState(cfg, T0), V, id);
    s = E.tick(cfg, s, 10, T0); // far longer than one cycle
    expect(s.cash).toBe(cfg.economy.startingCash + cfg.businesses[0].baseRevenue);
    expect(biz(s, id).running).toBe(false);
  });

  it('a managed business pays every cycle, even with large dt', () => {
    const b = cfg.businesses[0];
    let s = E.hireManager(cfg, rich(cfg, 1e9), V, b.id);
    const cash0 = s.cash;
    s = E.tick(cfg, s, b.cycleSeconds * 100 + b.cycleSeconds / 2, T0);
    expect(s.cash - cash0).toBeCloseTo(100 * b.baseRevenue, 6);
    expect(biz(s, b.id).progress).toBeCloseTo(0.5, 6);
  });

  it('income per second matches simulated earnings', () => {
    let s = rich(cfg);
    for (const b of cfg.businesses.slice(0, 4)) {
      s = E.buyBusiness(cfg, s, V, b.id, 30);
      s = E.hireManager(cfg, s, V, b.id);
    }
    const ips = E.incomePerSecond(cfg, s, T0);
    const before = s.cash;
    for (let i = 0; i < 6000; i++) s = E.tick(cfg, s, 0.1, T0);
    // Within 1%: the last partial cycle of each business is not paid yet.
    expect(Math.abs((s.cash - before) / 600 / ips - 1)).toBeLessThan(0.01);
  });

  it('milestones speed businesses up', () => {
    const id = cfg.businesses[0].id;
    let s = rich(cfg, 1e9);
    const slow = E.cycleSeconds(cfg, s, V, id);
    s = E.buyBusiness(cfg, s, V, id, 24); // 25 owned
    expect(E.cycleSeconds(cfg, s, V, id)).toBeCloseTo(slow / 4);
    expect(s.stats.levelsBought).toBe(24);
  });

  it('milestones can repeat forever', () => {
    const repeating = GameConfigSchema.parse({
      ...classicRaw,
      economy: { ...classicRaw.economy, milestones: [{ owned: 10, speedMult: 2 }, { owned: 100, revenueMult: 3 }], milestoneRepeat: { every: 100, revenueMult: 2 } },
    });
    expect(E.milestoneMults(repeating, 100)).toEqual({ speed: 2, revenue: 3 });
    expect(E.milestoneMults(repeating, 199)).toEqual({ speed: 2, revenue: 3 });
    expect(E.milestoneMults(repeating, 200)).toEqual({ speed: 2, revenue: 6 });
    expect(E.milestoneMults(repeating, 450)).toEqual({ speed: 2, revenue: 24 });
    expect(E.nextMilestone(repeating, 5)).toBe(10);
    expect(E.nextMilestone(repeating, 100)).toBe(200);
    expect(E.nextMilestone(repeating, 250)).toBe(300);
    expect(E.previousMilestone(repeating, 250)).toBe(200);
    expect(E.previousMilestone(repeating, 50)).toBe(10);
    expect(E.nextMilestone(cfg, 10_000)).toBeNull();
  });

  it('boost multiplies revenue while active only', () => {
    const id = cfg.businesses[0].id;
    let s = E.createInitialState(cfg, T0);
    const base = E.revenuePerCycle(cfg, s, V, id, T0);
    s = E.activateBoost(cfg, s, T0);
    expect(E.revenuePerCycle(cfg, s, V, id, T0 + 1000)).toBe(base * cfg.economy.boost.multiplier);
    expect(E.revenuePerCycle(cfg, s, V, id, T0 + cfg.economy.boost.minutesPerAd * 60_000 + 1)).toBe(base);
  });

  it('boost stacking is capped', () => {
    let s = E.createInitialState(cfg, T0);
    for (let i = 0; i < 50; i++) s = E.activateBoost(cfg, s, T0);
    expect(s.boostUntil).toBe(T0 + cfg.economy.boost.maxMinutes * 60_000);
    expect(E.canBoost(cfg, s, T0)).toBe(false);
    expect(s.stats.adsWatched).toBe(50);
  });

  it('reports cycle events', () => {
    const events: GameEvent[] = [];
    const id = cfg.businesses[0].id;
    E.tick(cfg, E.startBusiness(E.createInitialState(cfg, T0), V, id), 10, T0, events);
    expect(events).toEqual([{ type: 'cycle', venue: V, business: id, amount: cfg.businesses[0].baseRevenue }]);
  });
});

describe('offline', () => {
  it('is capped and ignores boosts', () => {
    const b = cfg.businesses[0];
    let s = E.hireManager(cfg, rich(cfg, 1e9), V, b.id);
    s = E.activateBoost(cfg, { ...s, lastSavedAt: T0 }, T0);
    const { seconds, earnings } = E.computeOffline(cfg, s, T0 + 48 * 3600_000);
    expect(seconds).toBe(cfg.economy.offline.maxHours * 3600);
    const ips = E.incomePerSecond(cfg, { ...s, boostUntil: 0 }, T0);
    expect(earnings).toBeCloseTo(ips * seconds * cfg.economy.offline.efficiency);
  });
});

describe('prestige', () => {
  it('awards sqrt-scaled points and keeps gems, entitlements and cards', () => {
    let s = E.createInitialState(cfg, T0);
    s = { ...s, lifetimeEarnings: cfg.economy.prestige.threshold * 100, gems: 42 };
    s = M.applyProduct(cfg, s, cfg.monetization.iap.products.find((p) => p.kind === 'noAds')!, T0).state;
    s = M.addCardCopies(cfg, s, 'c_station', 3);
    s = E.buyUpgrade(cfg, { ...s, cash: 1e15 }, cfg.upgrades.find((u) => !u.premium)!.id);
    const p = E.prestige(cfg, s, T0);
    expect(p.prestigePoints).toBe(10);
    expect(p.prestigeCount).toBe(1);
    expect(p.gems).toBe(42);
    expect(p.entitlements.noAds).toBe(true);
    expect(p.cards.c_station).toEqual({ level: 1, copies: 2 });
    expect(p.cash).toBe(cfg.economy.startingCash);
    expect(p.upgrades).toEqual([]);
    expect(p.lifetimeEarnings).toBe(s.lifetimeEarnings);
    expect(E.prestigePointsAvailable(cfg, p)).toBe(0);
  });
  it('does nothing with no points to gain', () => {
    const s = E.createInitialState(cfg, T0);
    expect(E.prestige(cfg, s, T0)).toBe(s);
  });
});

describe('daily, story, purchases', () => {
  it('the daily gift counts days claimed: a missed day never resets it, and the table cycles', () => {
    let s = E.createInitialState(cfg, T0);
    s = E.claimDaily(cfg, s, T0);
    expect(E.canClaimDaily(s, T0)).toBe(false);
    s = E.claimDaily(cfg, s, T0 + 86_400_000);
    expect(s.daily.streak).toBe(2);
    s = E.claimDaily(cfg, s, T0 + 5 * 86_400_000);
    expect(s.daily.streak).toBe(3);
    const table = cfg.economy.daily.gems;
    let t = T0 + 5 * 86_400_000;
    for (let i = 3; i < table.length; i++) s = E.claimDaily(cfg, s, (t += 86_400_000));
    // The claim after the last entry starts the table again.
    expect(E.dailyReward(cfg, s, t + 86_400_000)).toEqual({ gems: table[0], streak: table.length + 1, day: 1 });
  });

  it('story beats fire once, in order', () => {
    let s = E.createInitialState(cfg, T0);
    const first = E.pendingStoryBeat(cfg, s)!;
    expect(first.id).toBe('intro');
    s = E.markStorySeen(s, first);
    expect(E.pendingStoryBeat(cfg, s)).toBeNull();
    s = E.buyBusiness(cfg, { ...s, cash: 1e6 }, V, 'rover', 1);
    const second = E.pendingStoryBeat(cfg, s)!;
    expect(second.id).toBe('second');
    expect(E.markStorySeen(s, second).gems).toBe(3);
  });

  it('non-consumables apply once; consumables stack', () => {
    const x2 = cfg.monetization.iap.products.find((p) => p.kind === 'multiplier')!;
    const gems = cfg.monetization.iap.products.find((p) => p.kind === 'gems')!;
    let s = E.createInitialState(cfg, T0);
    s = M.applyProduct(cfg, M.applyProduct(cfg, s, x2, T0).state, x2, T0).state;
    expect(E.entitlementMultiplier(s)).toBe(2);
    s = M.applyProduct(cfg, M.applyProduct(cfg, s, gems, T0).state, gems, T0).state;
    expect(s.gems).toBe(gems.value * 2);
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
    expect(E.tapHero(cfg, s, T0).state.stats.taps).toBe(1);
  });
  it('a boost doubles taps, not quadruples them', () => {
    let s = rich(cfg);
    for (const b of cfg.businesses.slice(0, 3)) s = E.hireManager(cfg, E.buyBusiness(cfg, s, V, b.id, 50), V, b.id);
    const plain = E.tapValue(cfg, s, T0);
    expect(E.tapValue(cfg, E.activateBoost(cfg, s, T0), T0 + 1)).toBeCloseTo(plain * cfg.economy.boost.multiplier, 6);
  });
  it('bonus pays at least minTaps taps, and income-based once automated', () => {
    let s = E.createInitialState(cfg, T0);
    expect(E.bonusValue(cfg, s, T0)).toBeCloseTo(E.tapValue(cfg, s, T0) * cfg.economy.bonus.minTaps);
    s = { ...s, cash: 1e12 };
    for (const b of cfg.businesses.slice(0, 5)) s = E.hireManager(cfg, E.buyBusiness(cfg, s, V, b.id, 50), V, b.id);
    expect(E.bonusValue(cfg, s, T0)).toBeCloseTo(E.incomePerSecond(cfg, s, T0) * cfg.economy.bonus.incomeSeconds);
    const before = s.cash;
    const got = E.collectBonus(cfg, s, T0);
    expect(got.state.cash - before).toBeCloseTo(E.bonusValue(cfg, s, T0));
    expect(got.state.stats.bonusCaught).toBe(1);
  });
});

describe('cards', () => {
  it('the first copy unlocks; levelling spends copies; bonuses multiply the right stat', () => {
    let s = E.createInitialState(cfg, T0);
    const id = cfg.businesses[0].id;
    const base = E.stationValue(cfg, s, V, id);
    s = M.addCardCopies(cfg, s, 'c_station', 1);
    expect(s.cards.c_station).toEqual({ level: 1, copies: 0 });
    expect(E.stationValue(cfg, s, V, id)).toBeCloseTo(base * 1.1); // common: +10% at level 1
    expect(M.canLevelUpCard(cfg, s, 'c_station')).toBe(false);
    s = M.addCardCopies(cfg, s, 'c_station', 2);
    expect(M.canLevelUpCard(cfg, s, 'c_station')).toBe(true);
    s = M.levelUpCard(cfg, s, 'c_station');
    expect(s.cards.c_station).toEqual({ level: 2, copies: 0 });
    expect(E.stationValue(cfg, s, V, id)).toBeCloseTo(base * 1.15); // +5% per further level
    // A global-income card multiplies cash, not station value.
    const withGlobal = M.addCardCopies(cfg, s, 'c_global', 1);
    expect(E.stationValue(cfg, withGlobal, V, id)).toBeCloseTo(base * 1.15);
    expect(E.globalMultiplier(cfg, withGlobal, T0)).toBeCloseTo(2);
    expect(M.addCardCopies(cfg, s, 'nope', 5)).toBe(s);
  });

  it('rewards resolve random cards with the saved seed', () => {
    const s = E.createInitialState(cfg, T0);
    const a = M.applyReward(cfg, s, { type: 'randomCard', rarity: 'common', copies: 2 }, T0);
    const b = M.applyReward(cfg, s, { type: 'randomCard', rarity: 'common', copies: 2 }, T0);
    expect(a.granted).toEqual(b.granted);
    expect(a.granted.type).toBe('card');
    expect(a.state.rng).not.toBe(s.rng);
    const cash = M.applyReward(cfg, s, { type: 'cash', seconds: 600 }, T0);
    expect(cash.state.cash).toBeGreaterThan(s.cash);
    const chest = M.applyReward(cfg, s, { type: 'chest', chestId: 'box', count: 2 }, T0);
    expect(chest.state.chests.owned.box).toBe(2);
  });
});

describe('saves', () => {
  it('keeps progress and adds new businesses', () => {
    const s = { ...E.createInitialState(cfg, T0), cash: 123 };
    const last = cfg.businesses[cfg.businesses.length - 1].id;
    const { [last]: _dropped, ...rest } = s.venues[V].businesses;
    const r = E.reconcileState(cfg, { ...s, venues: { [V]: { ...s.venues[V], businesses: rest } } });
    expect(r.cash).toBe(123);
    expect(biz(r, last).owned).toBe(0);
  });

  it('migrates a version 1 classic save', () => {
    const v1 = {
      version: 1, cash: 777, gems: 9, runEarnings: 1, lifetimeEarnings: 5e6, prestigePoints: 2, prestigeCount: 1,
      businesses: { [cfg.businesses[0].id]: { owned: 40, progress: 0.3, running: true, managed: true } },
      upgrades: [cfg.upgrades[0].id, 'gone'], boostUntil: 0, storySeen: ['intro'],
      entitlements: { noAds: true, products: ['x'], multipliers: { x: 2 } },
      daily: { lastClaimDay: '2026-01-01', streak: 3 },
      stats: { taps: 10, adsWatched: 1, playSeconds: 99, firstOpenAt: 5 }, lastSavedAt: T0,
    };
    const r = E.reconcileState(cfg, v1);
    expect(r.version).toBe(2);
    expect(r.cash).toBe(777);
    expect(biz(r, cfg.businesses[0].id)).toEqual({ owned: 40, progress: 0.3, running: true, managed: true });
    expect(biz(r, cfg.businesses[1].id).owned).toBe(0);
    expect(r.upgrades).toEqual([cfg.upgrades[0].id]);
    expect(r.entitlements.noAds).toBe(true);
    expect(r.stats.taps).toBe(10);
    expect(r.stats.served).toBe(0);
    expect(r.cards).toEqual({});
    expect((r as unknown as { businesses?: unknown }).businesses).toBeUndefined();
  });

  it('a version 1 save in a sim game restarts the run but keeps what was paid for', () => {
    const r = E.reconcileState(simCfg, { version: 1, cash: 1e30, gems: 55, businesses: {}, entitlements: { noAds: true, products: ['p'], multipliers: { p: 3 } }, stats: { firstOpenAt: 7 } });
    expect(r.cash).toBe(simCfg.economy.startingCash);
    expect(r.gems).toBe(55);
    expect(r.entitlements).toEqual({ noAds: true, skipRewarded: false, products: ['p'], multipliers: { p: 3 } });
    expect(r.venues.a.unlocked).toBe(true);
    expect(r.stats.firstOpenAt).toBe(7);
  });

  it('survives garbage', () => {
    expect(E.reconcileState(cfg, null).cash).toBe(cfg.economy.startingCash);
    expect(E.reconcileState(simCfg, { version: 2 }).venues.a.chain?.transportLevel).toBe(1);
  });

  it('a sim save round-trips through JSON and regrows workers after a content change', () => {
    let s = rich(simCfg, 1e9);
    s = E.buyTransport(simCfg, s, 'a', 4); // level 5: a second worker
    s = E.tick(simCfg, s, 3, T0);
    const r = E.reconcileState(simCfg, JSON.parse(JSON.stringify(s)));
    expect(r).toEqual(s);
    // Drop a worker from the save, as if the config had fewer before: it is added back.
    const cut = JSON.parse(JSON.stringify(s));
    cut.venues.a.chain.workers.pop();
    expect(E.reconcileState(simCfg, cut).venues.a.chain!.workers).toHaveLength(2);
  });
});

describe('sim mode', () => {
  const station = simCfg.businesses[0];

  /** A venue with everything automated and a few levels everywhere. */
  function automated(venueId = 'a', cash = 1e12): GameState {
    let s = rich(simCfg, cash);
    if (venueId !== 'a') s = E.unlockVenue(simCfg, s, venueId);
    for (const b of simCfg.businesses.slice(0, 3)) s = E.hireManager(simCfg, E.buyBusiness(simCfg, s, venueId, b.id, 20), venueId, b.id);
    s = E.buyTransport(simCfg, s, venueId, 30);
    s = E.buySales(simCfg, s, venueId, 30);
    return E.hireTransportManager(simCfg, s, venueId);
  }

  it('starts with the first venue open, levels at 1, and later venues locked', () => {
    const s = E.createInitialState(simCfg, T0);
    expect(Object.keys(s.venues)).toEqual(['a', 'b']);
    expect(s.activeVenue).toBe('a');
    expect(s.venues.a.unlocked).toBe(true);
    expect(s.venues.b.unlocked).toBe(false);
    expect(s.venues.a.chain).toMatchObject({ transportLevel: 1, salesLevel: 1, transportManaged: false, buffer: 0, served: 0 });
    expect(s.venues.a.chain!.workers).toHaveLength(1);
    expect(s.venues.a.chain!.seats).toHaveLength(1);
    expect(biz(s, station.id, 'a').owned).toBe(1);
    expect(biz(s, station.id, 'b').owned).toBe(0);
  });

  it('value becomes cash only when a guest pays', () => {
    let s = E.createInitialState(simCfg, T0);
    const cash0 = s.cash;
    const events: GameEvent[] = [];
    // Tap the station: one cycle lands in the buffer, not in cash.
    s = E.startBusiness(s, 'a', station.id);
    s = E.tick(simCfg, s, station.cycleSeconds + 0.01, T0, events);
    expect(s.cash).toBe(cash0);
    expect(s.venues.a.chain!.buffer).toBeCloseTo(station.baseRevenue, 9);
    expect(events.some((e) => e.type === 'cycle')).toBe(true);
    // Nothing moves until the bell is rung.
    s = E.tick(simCfg, s, 30, T0, events);
    expect(s.cash).toBe(cash0);
    s = E.ringVenueBell(s, 'a');
    for (let i = 0; i < 300; i++) s = E.tick(simCfg, s, 0.1, T0, events);
    expect(s.cash).toBeCloseTo(cash0 + station.baseRevenue, 9);
    expect(s.lifetimeEarnings).toBeCloseTo(station.baseRevenue, 9);
    const pay = events.find((e): e is Extract<GameEvent, { type: 'pay' }> => e.type === 'pay')!;
    expect(pay).toMatchObject({ venue: 'a', amount: station.baseRevenue, cash: station.baseRevenue });
    expect(s.stats.served).toBe(1);
    expect(events.map((e) => e.type)).toEqual(expect.arrayContaining(['load', 'unload', 'arrive', 'served', 'pay', 'leave']));
  });

  it('income settles at the slowest stage', () => {
    let s = automated();
    const rates = E.venueRates(simCfg, s, 'a');
    expect(rates.rate).toBe(Math.min(rates.production, rates.transport, rates.sales));
    const ips = E.incomePerSecond(simCfg, s, T0);
    expect(ips).toBeCloseTo(rates.rate * E.globalMultiplier(simCfg, s, T0), 9);
    for (let i = 0; i < 1200; i++) s = E.tick(simCfg, s, 0.1, T0); // warm up
    const before = s.cash;
    for (let i = 0; i < 6000; i++) s = E.tick(simCfg, s, 0.1, T0);
    expect((s.cash - before) / 600 / ips).toBeGreaterThan(0.96);
    expect((s.cash - before) / 600 / ips).toBeLessThan(1.04);
  });

  it('a global multiplier raises income whatever the bottleneck', () => {
    // Starve transport so it is the bottleneck, then compare with and without a boost.
    let s = rich(simCfg);
    for (const b of simCfg.businesses.slice(0, 3)) s = E.hireManager(simCfg, E.buyBusiness(simCfg, s, 'a', b.id, 60), 'a', b.id);
    s = E.hireTransportManager(simCfg, E.buySales(simCfg, s, 'a', 60), 'a');
    expect(E.venueRates(simCfg, s, 'a').bottleneck).toBe('transport');
    const run = (start: GameState) => {
      let x = start;
      for (let i = 0; i < 3000; i++) x = E.tick(simCfg, x, 0.1, T0 + 1);
      return x.cash - start.cash;
    };
    const boosted = E.activateBoost(simCfg, s, T0);
    expect(run(boosted) / run(s)).toBeCloseTo(simCfg.economy.boost.multiplier, 6);
  });

  it('transport and sales levels add capacity, workers and seats at a geometric cost', () => {
    let s = rich(simCfg, 1e9);
    const t = simCfg.sim!.transport;
    expect(E.transportCapacity(simCfg, s, 'a')).toBe(t.baseCapacity);
    expect(E.transportCost(simCfg, s, 'a', 1)).toBeCloseTo(t.baseCost, 9);
    const cost4 = E.transportCost(simCfg, s, 'a', 4);
    s = E.buyTransport(simCfg, s, 'a', 4);
    expect(s.cash).toBeCloseTo(1e9 - cost4, 3);
    expect(s.venues.a.chain!.transportLevel).toBe(5);
    expect(E.transportCapacity(simCfg, s, 'a')).toBeCloseTo(t.baseCapacity * Math.pow(t.capacityGrowth, 4), 9);
    // Level 5 brings a second worker, who walks in from the door.
    expect(s.venues.a.chain!.workers.map((w) => w.phase)).toEqual(['idle', 'entering']);
    expect(E.transportCost(simCfg, s, 'a', 1)).toBeCloseTo(t.baseCost * Math.pow(t.costGrowth, 4), 9);

    s = E.buySales(simCfg, s, 'a', 5);
    expect(s.venues.a.chain!.salesLevel).toBe(6);
    expect(s.venues.a.chain!.seats).toHaveLength(3);
    expect(E.salesSpend(simCfg, s, 'a')).toBeCloseTo(simCfg.sim!.sales.baseSpend * Math.pow(simCfg.sim!.sales.spendGrowth, 5), 9);
    expect(s.stats.levelsBought).toBe(9);

    // Max buys as many as the cash allows and never overspends.
    const poor = { ...s, cash: 1000 };
    const n = E.resolveStageAmount(simCfg, poor, 'a', 'transport', 'max');
    expect(E.transportCost(simCfg, poor, 'a', n)).toBeLessThanOrEqual(1000);
    expect(E.transportCost(simCfg, poor, 'a', n + 1)).toBeGreaterThan(1000);
    expect(E.buyTransport(simCfg, { ...s, cash: 0 }, 'a', 1).venues.a.chain!.transportLevel).toBe(5);
  });

  it('cards raise transport capacity', () => {
    const s = E.createInitialState(simCfg, T0);
    const boosted = M.addCardCopies(simCfg, s, 'c_carry', 1);
    expect(E.transportCapacity(simCfg, boosted, 'a')).toBeCloseTo(E.transportCapacity(simCfg, s, 'a') * 1.1, 9);
  });

  it('the transport hire removes the need for the bell', () => {
    let s = rich(simCfg, 1e6);
    s = E.hireManager(simCfg, s, 'a', station.id);
    for (let i = 0; i < 300; i++) s = E.tick(simCfg, s, 0.1, T0);
    expect(s.cash).toBe(1e6 - E.managerCost(simCfg, 'a', station.id)); // goods pile up, nobody carries them
    expect(s.venues.a.chain!.buffer).toBeGreaterThan(0);
    expect(E.incomePerSecond(simCfg, s, T0)).toBe(0);
    const before = s.cash;
    s = E.hireTransportManager(simCfg, s, 'a');
    expect(s.cash).toBe(before - E.transportManagerCost(simCfg, 'a'));
    expect(s.stats.hires).toBe(2);
    for (let i = 0; i < 600; i++) s = E.tick(simCfg, s, 0.1, T0);
    expect(s.cash).toBeGreaterThan(before - E.transportManagerCost(simCfg, 'a'));
    expect(E.incomePerSecond(simCfg, s, T0)).toBeGreaterThan(0);
    expect(E.hireTransportManager(simCfg, s, 'a')).toBe(s);
  });

  it('venues open in order, cost cash and scale everything', () => {
    let s = rich(simCfg, 2e6);
    expect(E.nextVenueToUnlock(simCfg, s)).toBe('b');
    expect(E.unlockVenue(simCfg, { ...s, cash: 10 }, 'b').venues.b.unlocked).toBe(false);
    s = E.unlockVenue(simCfg, s, 'b');
    expect(s.cash).toBe(1e6);
    expect(s.venues.b.unlocked).toBe(true);
    expect(s.activeVenue).toBe('b');
    expect(biz(s, station.id, 'b').owned).toBe(1);
    expect(E.nextVenueToUnlock(simCfg, s)).toBeNull();
    expect(E.stationValue(simCfg, s, 'b', station.id)).toBeCloseTo(E.stationValue(simCfg, s, 'a', station.id) * 50, 9);
    expect(E.businessCost(simCfg, s, 'b', station.id, 1)).toBeCloseTo(E.businessCost(simCfg, s, 'a', station.id, 1) * 50, 9);
    expect(E.transportCapacity(simCfg, s, 'b')).toBeCloseTo(E.transportCapacity(simCfg, s, 'a') * 50, 9);
    expect(E.managerCost(simCfg, 'b', station.id)).toBe(station.managerCost * 50);
    expect(E.setActiveVenue(s, 'a').activeVenue).toBe('a');
    expect(E.setActiveVenue(s, 'nope')).toBe(s);
  });

  it('a venue that is not on screen earns at its steady rate', () => {
    let s = automated('a', 1e13);
    s = E.unlockVenue(simCfg, s, 'b'); // now b is on screen and a is off screen
    const rateA = E.venueIncomePerSecond(simCfg, s, 'a', T0);
    expect(rateA).toBeGreaterThan(0);
    expect(E.venueIncomePerSecond(simCfg, s, 'b', T0)).toBe(0);
    const chainA = s.venues.a.chain;
    const before = s.cash;
    s = E.tick(simCfg, s, 10, T0);
    // Relative check: cash is around 1e13 here, where a double only resolves about 0.002.
    expect((s.cash - before) / (rateA * 10)).toBeCloseTo(1, 5);
    expect(s.venues.a.chain).toBe(chainA); // not simulated worker by worker
    expect(s.stats.served).toBeGreaterThan(0);
    expect(E.incomePerSecond(simCfg, s, T0)).toBeCloseTo(rateA, 6);
  });

  it('rush speeds the whole chain up, then cools down', () => {
    const s0 = automated();
    const rush = simCfg.sim!.rush;
    expect(E.canStartRush(simCfg, s0, T0)).toBe(true);
    const s = E.startRush(simCfg, s0, T0);
    expect(E.isRushActive(s, T0 + 1)).toBe(true);
    expect(E.rushMultiplier(simCfg, s, T0 + 1)).toBe(rush.multiplier);
    expect(s.rush.until).toBe(T0 + rush.seconds * 1000);
    expect(E.startRush(simCfg, s, T0 + 1)).toBe(s);
    expect(E.canStartRush(simCfg, s, T0 + rush.seconds * 1000 + 1)).toBe(false);
    expect(E.canStartRush(simCfg, s, s.rush.readyAt)).toBe(true);
    expect(s.stats.rushes).toBe(1);

    const earn = (start: GameState, now: number) => {
      let x = start;
      for (let i = 0; i < 1200; i++) x = E.tick(simCfg, x, 0.1, now); // warm up
      const mid = x.cash;
      for (let i = 0; i < 3000; i++) x = E.tick(simCfg, x, 0.1, now);
      return x.cash - mid;
    };
    // `now` is held inside the rush window so the whole run is at rush speed. (A tick covers the dt
    // seconds before `now`, so `now` must be at least one tick after the rush started.)
    const inside = T0 + (rush.seconds * 1000) / 2;
    expect(earn(s, inside) / earn(s0, inside)).toBeGreaterThan(rush.multiplier * 0.95);
    expect(earn(s, inside) / earn(s0, inside)).toBeLessThan(rush.multiplier * 1.05);
    // An ad can make it ready again once it has ended.
    const ended = T0 + rush.seconds * 1000 + 5;
    expect(E.canStartRush(simCfg, E.resetRushCooldown(s, ended), ended)).toBe(true);
    // Classic games have no rush.
    expect(E.startRush(cfg, E.createInitialState(cfg, T0), T0).rush.until).toBe(0);
  });

  it('offline earnings use the steady rate of every venue', () => {
    let s = automated('a', 1e13);
    s = { ...s, lastSavedAt: T0 };
    const ips = E.incomePerSecond(simCfg, s, T0);
    const { earnings, seconds } = E.computeOffline(simCfg, s, T0 + 3600_000);
    expect(seconds).toBe(3600);
    expect(earnings).toBeCloseTo(ips * 3600 * simCfg.economy.offline.efficiency, 3);
  });

  it('prestige closes later venues and resets the chain', () => {
    let s = automated('a', 1e13);
    s = E.unlockVenue(simCfg, s, 'b');
    s = M.addCardCopies(simCfg, { ...s, lifetimeEarnings: simCfg.economy.prestige.threshold * 4 }, 'c_carry', 1);
    const p = E.prestige(simCfg, s, T0);
    expect(p.prestigePoints).toBe(2);
    expect(p.venues.b.unlocked).toBe(false);
    expect(p.activeVenue).toBe('a');
    expect(p.venues.a.chain).toMatchObject({ transportLevel: 1, salesLevel: 1, transportManaged: false });
    expect(p.cards.c_carry.level).toBe(1);
    expect(p.stats).toEqual(s.stats);
  });

  it('story beats can wait for hires and venues', () => {
    let s = rich(simCfg, 1e9);
    const seen = (x: GameState) => {
      let cur = x;
      const ids: string[] = [];
      for (let b = E.pendingStoryBeat(simCfg, cur); b; b = E.pendingStoryBeat(simCfg, cur)) {
        ids.push(b.id);
        cur = E.markStorySeen(cur, b);
      }
      return { ids, state: cur };
    };
    let r = seen(s);
    expect(r.ids).toEqual(['intro']);
    s = E.hireManager(simCfg, r.state, 'a', station.id);
    r = seen(s);
    expect(r.ids).toEqual(['hired']);
    s = E.hireTransportManager(simCfg, r.state, 'a');
    r = seen(s);
    expect(r.ids).toEqual(['floor']);
    s = E.unlockVenue(simCfg, r.state, 'b');
    expect(seen(s).ids).toEqual(['second_venue']);
  });

  it('nothing is lost or invented across a long mixed session', () => {
    let s = automated('a', 1e12);
    const start = s.cash;
    let produced = 0;
    const events: GameEvent[] = [];
    const dts = [0.1, 0.1, 0.5, 0.016, 1, 0.1];
    for (let i = 0; i < 4000; i++) {
      events.length = 0;
      s = E.tick(simCfg, s, dts[i % dts.length], T0, events);
      for (const e of events) if (e.type === 'cycle') produced += e.amount;
    }
    const chain = s.venues.a.chain!;
    const inside = chain.buffer + chain.served + chain.workers.reduce((a, w) => a + w.carry, 0) + chain.seats.reduce((a, x) => a + x.amount, 0);
    expect((s.cash - start + inside) / produced).toBeCloseTo(1, 8);
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
    [999_994, '999.99K'],
    [999_995, '1.00M'],
    [999_999, '1.00M'],
    [999.4, '999'],
    [9.999, '10.00'],
  ])('%d -> %s', (n, s) => expect(formatNumber(n)).toBe(s));
  // Every suffix boundary: just below 1000 of one suffix rolls over to "1.00" of the next.
  // [group, its suffix, the suffix below it]
  const BOUNDARIES: [number, string, string][] = [
    [2, 'M', 'K'], [3, 'B', 'M'], [4, 'T', 'B'], [5, 'Qa', 'T'], [6, 'Qi', 'Qa'], [7, 'Sx', 'Qi'], [8, 'Sp', 'Sx'],
    [9, 'Oc', 'Sp'], [10, 'No', 'Oc'], [11, 'Dc', 'No'], [12, 'aa', 'Dc'], [13, 'ab', 'aa'], [37, 'az', 'ay'], [38, 'ba', 'az'],
    [102, 'dm', 'dl'], // the last group a double reaches (1e306)
  ];
  it.each(BOUNDARIES)('rolls over into group %d (%s)', (g, suffix, below) => {
    const unit = Math.pow(10, 3 * g);
    expect(formatNumber(unit)).toBe(`1.00${suffix}`);
    expect(formatNumber(unit * 0.999996)).toBe(`1.00${suffix}`);
    expect(formatNumber(unit * 0.99998)).toBe(`999.98${below}`);
    expect(formatNumber(unit * 1.5)).toBe(`1.50${suffix}`);
  });
  it('1000 is "1.00K"; below it whole numbers', () => {
    expect(formatNumber(1000)).toBe('1.00K');
    expect(formatNumber(999.996)).toBe('999');
  });
  it('formats the largest doubles with a letter suffix', () => {
    expect(formatNumber(1.7e308)).toBe('170.00dm');
  });
  it('durations', () => {
    expect(formatDuration(3725)).toBe('1h 02m');
    expect(formatDuration(65)).toBe('1m 05s');
  });
});

// ---------------------------------------------------------------- adversarial review (docs/design/engine-review.md)

describe('review: money at the edges (E1, E2)', () => {
  const drill = cfg.businesses[0];

  it('cash that overflowed to Infinity cannot buy "max" into Infinity or NaN', () => {
    const s = { ...E.createInitialState(cfg, T0), cash: Infinity };
    const after = E.buyBusiness(cfg, s, V, drill.id, 'max');
    expect(Number.isFinite(biz(after, drill.id).owned)).toBe(true);
    expect(Number.isNaN(after.cash)).toBe(false);
  });

  it('NaN cash buys nothing (it used to make every price check pass)', () => {
    const s = { ...rich(cfg), cash: NaN };
    expect(E.buyBusiness(cfg, s, V, drill.id, 1)).toBe(s);
    expect(E.hireManager(cfg, s, V, drill.id)).toBe(s);
    expect(E.buyUpgrade(cfg, s, cfg.upgrades.find((u) => !u.premium)!.id)).toBe(s);
    const sim = { ...rich(simCfg), cash: NaN };
    expect(E.buyTransport(simCfg, sim, 'a', 1)).toBe(sim);
    expect(E.buySales(simCfg, sim, 'a', 1)).toBe(sim);
    expect(E.hireTransportManager(simCfg, sim, 'a')).toBe(sim);
    expect(E.unlockVenue(simCfg, sim, 'b')).toBe(sim);
  });

  it('earnings saturate at the largest finite number instead of overflowing', () => {
    let s = { ...E.createInitialState(cfg, T0), cash: 1e308 };
    s = E.grantCash(E.grantCash(s, 1e308), Infinity);
    expect(s.cash).toBe(Number.MAX_VALUE);
    expect(s.lifetimeEarnings).toBe(Number.MAX_VALUE);
    expect(Number.isFinite(E.totalPrestigePoints(cfg, s.lifetimeEarnings))).toBe(true);
  });

  it.each([-5, 0, 2.5, NaN, Infinity])('buying %s units is refused or rounded down, never negative', (n) => {
    const s = rich(cfg);
    const after = E.buyBusiness(cfg, s, V, drill.id, n);
    const owned = biz(after, drill.id).owned;
    expect(Number.isInteger(owned)).toBe(true);
    expect(owned).toBeGreaterThanOrEqual(biz(s, drill.id).owned);
    expect(after.cash).toBeLessThanOrEqual(s.cash);
    if (n === 2.5) expect(owned).toBe(biz(s, drill.id).owned + 2);
    const sim = rich(simCfg);
    const t = E.buyTransport(simCfg, sim, 'a', n).venues.a.chain!.transportLevel;
    expect(Number.isInteger(t) && t >= 1).toBe(true);
  });

  it('"max" is the most you can afford and never overspends, up to cash 1e300 and venue scale 1e11', () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 3000; i++) {
      const base = Math.pow(10, rnd() * 6);
      const growth = 1.01 + rnd() * 0.3;
      const owned = Math.floor(rnd() * 2000);
      const scale = Math.pow(10, rnd() * 11);
      const cash = Math.pow(10, rnd() * 300);
      const n = E.geometricMaxAffordable(base, growth, owned, cash, scale);
      expect(Number.isInteger(n) && n >= 0).toBe(true);
      if (n > 0) expect(E.geometricCost(base, growth, owned, n, scale)).toBeLessThanOrEqual(cash);
      const next = E.geometricCost(base, growth, owned, n + 1, scale);
      expect(next > cash || !Number.isFinite(next)).toBe(true);
    }
  });

  it('a cost that overflows to Infinity is never affordable, even with Infinity cash', () => {
    const s = { ...E.createInitialState(cfg, T0), cash: Infinity };
    const owned = { ...s, venues: { [V]: { ...s.venues[V], businesses: { ...s.venues[V].businesses, [drill.id]: { ...biz(s, drill.id), owned: 50_000 } } } } };
    expect(E.businessCost(cfg, owned, V, drill.id, 1)).toBe(Infinity);
    expect(E.buyBusiness(cfg, owned, V, drill.id, 1)).toBe(owned);
  });

  it('a manager cannot be hired in a venue that is not open', () => {
    const s = rich(simCfg);
    const locked = { ...s, venues: { ...s.venues, b: { ...s.venues.b, businesses: { ...s.venues.b.businesses, [simCfg.businesses[0].id]: { owned: 3, progress: 0, running: false, managed: false } } } } };
    expect(E.hireManager(simCfg, locked, 'b', simCfg.businesses[0].id)).toBe(locked);
  });
});

describe('review: hostile saves (E3)', () => {
  const invariant = (c: GameConfig, s: GameState) => {
    const finite = (x: unknown) => typeof x === 'number' && Number.isFinite(x) && x >= 0;
    expect(s.version).toBe(2);
    for (const k of ['cash', 'gems', 'runEarnings', 'lifetimeEarnings', 'prestigePoints', 'prestigeCount', 'boostUntil', 'lastSavedAt', 'rng'] as const) expect(finite(s[k])).toBe(true);
    expect(Object.keys(s.venues).sort()).toEqual(E.venueIds(c).slice().sort());
    expect(s.venues[s.activeVenue]?.unlocked).toBe(true);
    for (const id of E.venueIds(c)) {
      const v = s.venues[id];
      expect(typeof v.unlocked).toBe('boolean');
      for (const b of c.businesses) {
        const x = v.businesses[b.id];
        expect(Number.isInteger(x.owned) && x.owned >= 0).toBe(true);
        expect(x.progress >= 0 && x.progress < 1).toBe(true);
        expect(typeof x.managed).toBe('boolean');
        expect(typeof x.running).toBe('boolean');
      }
      if (E.isSim(c)) {
        const ch = v.chain!;
        expect(Number.isInteger(ch.transportLevel) && ch.transportLevel >= 1).toBe(true);
        expect(Number.isInteger(ch.salesLevel) && ch.salesLevel >= 1).toBe(true);
        expect(ch.workers).toHaveLength(E.countAtLevel(c.sim!.transport.workersAt, ch.transportLevel));
        expect(ch.seats).toHaveLength(E.countAtLevel(c.sim!.sales.seatsAt, ch.salesLevel));
        expect(finite(ch.buffer) && finite(ch.served)).toBe(true);
      } else expect(v.chain).toBeNull();
    }
    expect(Array.isArray(s.upgrades) && s.upgrades.every((u) => c.upgrades.some((x) => x.id === u))).toBe(true);
    expect(Array.isArray(s.storySeen)).toBe(true);
    for (const [k, v] of Object.entries(s.stats)) expect([k, finite(v)]).toEqual([k, true]);
    for (const m of Object.values(s.entitlements.multipliers)) expect(finite(m) && m > 0).toBe(true);
    // And the game can run on it.
    let x = s;
    for (let i = 0; i < 20; i++) x = E.tick(c, x, 0.5, T0);
    expect(Number.isFinite(x.cash)).toBe(true);
    expect(Number.isFinite(E.computeOffline(c, x, T0 + 3600e3).earnings)).toBe(true);
  };

  const good = (c: GameConfig) => JSON.parse(JSON.stringify(E.buyTransport(c, rich(c, 1e9), E.venueIds(c)[0], 3)));

  it.each([
    ['null', () => null],
    ['a number', () => 42],
    ['a string', () => 'hello'],
    ['an array', () => [1, 2, 3]],
    ['empty object', () => ({})],
    ['NaN and negative money', (c: GameConfig) => ({ ...good(c), cash: NaN, gems: -50, lifetimeEarnings: 'lots', prestigePoints: -3 })],
    ['Infinity cash (from JSON it arrives as null)', (c: GameConfig) => ({ ...good(c), cash: null })],
    ['wrong types everywhere', (c: GameConfig) => ({ ...good(c), upgrades: 'all', storySeen: 5, stats: 'x', entitlements: [], daily: 7, cards: { c_global: null }, rng: 'seed', rush: null, chests: 3, missions: [], deals: 'none', dailyShop: null })],
    ['unknown venues and ids', (c: GameConfig) => ({ ...good(c), activeVenue: 'mars', venues: { ...good(c).venues, mars: { unlocked: true, businesses: {}, chain: null } }, upgrades: ['nope', 'nope'], cards: { ghost: { level: 9, copies: 9 } } })],
    ['broken businesses', (c: GameConfig) => {
      const s = good(c);
      const v = s.venues[E.venueIds(c)[0]];
      v.businesses[c.businesses[0].id] = { owned: -4, progress: 7, running: 'yes', managed: 1 };
      v.businesses[c.businesses[1].id] = { owned: 1e400, progress: NaN };
      v.businesses[c.businesses[2].id] = null;
      return s;
    }],
    ['first venue locked', (c: GameConfig) => {
      const s = good(c);
      s.venues[E.venueIds(c)[0]].unlocked = false;
      return s;
    }],
    ['multipliers that are not positive numbers', (c: GameConfig) => ({ ...good(c), entitlements: { noAds: 'true', products: [1, 'x'], multipliers: { a: 0, b: -2, c: 'x', d: 3 } } })],
  ])('%s', (_name, make) => {
    for (const c of [cfg, simCfg]) invariant(c, E.reconcileState(c, (make as (c: GameConfig) => unknown)(c), T0));
  });

  it('a sim chain with the wrong number of workers and seats is fitted without losing value', () => {
    const s = good(simCfg);
    const ch = s.venues.a.chain;
    ch.workers = Array.from({ length: 30 }, () => ({ phase: 'toSales', t: 0.5, carry: 4 }));
    ch.seats = 'no';
    ch.transportLevel = 'x';
    const r = E.reconcileState(simCfg, s, T0);
    invariant(simCfg, r);
    const c = r.venues.a.chain!;
    expect(c.transportLevel).toBe(1);
    expect(c.buffer + c.workers.reduce((a, w) => a + w.carry, 0)).toBeCloseTo(ch.buffer + 120, 6);
  });

  it('fuzz: random garbage in every field never throws and always gives a playable state', () => {
    let seed = 11;
    const rnd = () => ((seed = (seed * 48271) % 2147483647) / 2147483647);
    const junk = (): unknown => {
      const r = rnd();
      if (r < 0.1) return null;
      if (r < 0.2) return NaN;
      if (r < 0.3) return -1;
      if (r < 0.4) return 'x';
      if (r < 0.5) return [];
      if (r < 0.6) return {};
      if (r < 0.7) return 1e300;
      if (r < 0.8) return true;
      return 3;
    };
    const mangle = (x: unknown, depth: number): unknown => {
      if (rnd() < 0.15) return junk();
      if (Array.isArray(x)) return x.map((y) => mangle(y, depth + 1));
      if (x && typeof x === 'object' && depth < 6) return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, mangle(v, depth + 1)]));
      return x;
    };
    for (let i = 0; i < 150; i++) {
      for (const c of [cfg, simCfg]) invariant(c, E.reconcileState(c, mangle(good(c), 0), T0));
    }
  });

  it('a save from a newer version is kept, not treated as version 1 (that would wipe a sim run)', () => {
    const s = { ...good(simCfg), version: 3 };
    const r = E.reconcileState(simCfg, s, T0);
    expect(r.venues.a.chain!.transportLevel).toBe(4);
  });

  it('never reads the device clock: a missing firstOpenAt comes from `now`', () => {
    const spy = vi.spyOn(Date, 'now').mockImplementation(() => {
      throw new Error('Date.now called inside the engine');
    });
    try {
      const r = E.reconcileState(cfg, { version: 2 }, T0);
      expect(r.stats.firstOpenAt).toBe(T0);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('review: clock (E4)', () => {
  const rushCfg = simCfg.sim!.rush;

  it('a clock moved backwards cannot stretch the boost, the rush or its cooldown', () => {
    let s = E.startRush(simCfg, E.activateBoost(simCfg, rich(simCfg), T0), T0);
    s = { ...s, lastSavedAt: T0 };
    const back = T0 - 86_400_000; // the player sets the clock a day back
    const fixed = E.clampClock(simCfg, s, back);
    expect(fixed.boostUntil - back).toBeLessThanOrEqual(simCfg.economy.boost.maxMinutes * 60_000);
    expect(fixed.rush.until - back).toBeLessThanOrEqual(rushCfg.seconds * 1000);
    expect(fixed.rush.readyAt - fixed.rush.until).toBeLessThanOrEqual(rushCfg.cooldownSeconds * 1000);
    expect(fixed.lastSavedAt).toBe(back);
    // A normal state is left alone.
    expect(E.clampClock(simCfg, s, T0 + 1000)).toBe(s);
  });

  it('offline earnings are zero for a save from the future and never NaN', () => {
    const s = { ...rich(cfg), lastSavedAt: T0 + 3600e3 };
    expect(E.computeOffline(cfg, s, T0)).toEqual({ seconds: 0, earnings: 0 });
    const broken = { ...rich(cfg), lastSavedAt: NaN };
    expect(E.computeOffline(cfg, broken, T0)).toEqual({ seconds: 0, earnings: 0 });
  });

  it('a rush that ends inside a tick only speeds up the part of the tick before it ended', () => {
    const s0 = (() => {
      let s = rich(simCfg, 1e13);
      for (const b of simCfg.businesses.slice(0, 2)) s = E.hireManager(simCfg, E.buyBusiness(simCfg, s, 'a', b.id, 10), 'a', b.id);
      return s;
    })();
    const s = E.startRush(simCfg, s0, T0);
    const end = s.rush.until;
    // A 1 s tick that ends 0.5 s after the rush ended: half of it ran at rush speed.
    expect(E.simSeconds(simCfg, s, 1, end + 500)).toBeCloseTo(0.5 * rushCfg.multiplier + 0.5, 9);
    expect(E.simSeconds(simCfg, s, 1, end - 100)).toBeCloseTo(rushCfg.multiplier, 9);
    expect(E.simSeconds(simCfg, s, 1, end + 5000)).toBe(1);
    expect(E.simSeconds(cfg, E.createInitialState(cfg, T0), 1, T0)).toBe(1);
    // A rush that never started is no rush, even for a caller whose clock reads 0 (the balance bot).
    expect(E.simSeconds(simCfg, E.createInitialState(simCfg, 0), 1, 0)).toBe(1);
    expect(E.simSeconds(simCfg, E.prestige(simCfg, { ...s, lifetimeEarnings: 1e20 }, end), 1, end + 500)).toBe(1);
  });
});

describe('review: venues on and off screen (E5)', () => {
  function automated(venueId = 'a', cash = 1e13): GameState {
    let s = rich(simCfg, cash);
    if (venueId !== 'a') s = E.unlockVenue(simCfg, s, venueId);
    for (const b of simCfg.businesses.slice(0, 3)) s = E.hireManager(simCfg, E.buyBusiness(simCfg, s, venueId, b.id, 20), venueId, b.id);
    s = E.buyTransport(simCfg, s, venueId, 30);
    s = E.buySales(simCfg, s, venueId, 30);
    return E.hireTransportManager(simCfg, s, venueId);
  }

  it('passing an events array does not change the game (stats.served used to differ)', () => {
    let a = automated();
    let b = a;
    const events: GameEvent[] = [];
    for (let i = 0; i < 2000; i++) {
      events.length = 0;
      a = E.tick(simCfg, a, 0.1, T0, events);
      b = E.tick(simCfg, b, 0.1, T0);
    }
    expect(b).toEqual(a);
  });

  it('switching venues every tick earns no more than staying put', () => {
    // Both venues automated; b is the bigger one.
    let s = automated('a', 1e14);
    s = E.unlockVenue(simCfg, s, 'b');
    for (const b of simCfg.businesses.slice(0, 3)) s = E.hireManager(simCfg, E.buyBusiness(simCfg, s, 'b', b.id, 20), 'b', b.id);
    s = E.hireTransportManager(simCfg, E.buySales(simCfg, E.buyTransport(simCfg, s, 'b', 30), 'b', 30), 'b');
    // Warm both chains up on screen.
    for (const id of ['a', 'b']) {
      s = E.setActiveVenue(s, id);
      for (let i = 0; i < 600; i++) s = E.tick(simCfg, s, 0.1, T0);
    }
    let stay = E.setActiveVenue(s, 'a');
    let flip = stay;
    const c0 = stay.cash;
    const served0 = stay.stats.served;
    // Long enough that the few plates on the tables at the start and the end (the only difference
    // between running a chain and estimating it) are noise.
    for (let i = 0; i < 20000; i++) {
      stay = E.tick(simCfg, stay, 0.1, T0);
      flip = E.tick(simCfg, E.setActiveVenue(flip, i % 2 ? 'a' : 'b'), 0.1, T0);
    }
    expect((flip.cash - c0) / (stay.cash - c0)).toBeLessThan(1.01);
    expect((flip.stats.served - served0) / (stay.stats.served - served0)).toBeLessThan(1.05);
  });
});

describe('review: idle path (P1)', () => {
  it('off-screen rates are remembered per venue object and recomputed after anything that changes them', () => {
    let s = rich(simCfg, 1e14);
    for (const b of simCfg.businesses.slice(0, 2)) s = E.hireManager(simCfg, E.buyBusiness(simCfg, s, 'a', b.id, 10), 'a', b.id);
    s = E.hireTransportManager(simCfg, s, 'a');
    s = E.unlockVenue(simCfg, s, 'b'); // a is now off screen
    const r1 = E.venueRates(simCfg, s, 'a');
    s = E.tick(simCfg, s, 0.1, T0);
    expect(E.venueRates(simCfg, s, 'a')).toBe(r1); // the idle tick reuses it
    const fresh = (x: GameState) => JSON.parse(JSON.stringify(E.venueRates(simCfg, JSON.parse(JSON.stringify(x)), 'a')));
    const checks: [string, GameState][] = [
      ['station level', E.buyBusiness(simCfg, s, 'a', simCfg.businesses[0].id, 1)],
      ['transport level', E.buyTransport(simCfg, s, 'a', 5)],
      ['sales level', E.buySales(simCfg, s, 'a', 5)],
      ['upgrade', E.buyUpgrade(simCfg, s, simCfg.upgrades.find((u) => !u.premium && u.target === simCfg.businesses[0].id)!.id)],
      ['card', M.addCardCopies(simCfg, s, 'c_station', 1)],
    ];
    for (const [name, next] of checks) {
      expect([name, JSON.parse(JSON.stringify(E.venueRates(simCfg, next, 'a')))]).toEqual([name, fresh(next)]);
    }
  });
});

describe('pizza-2: a sim game names its bell, its seat and its rush', () => {
  it('the lint asks for each name the data leaves to the theme-free default', () => {
    const raw = JSON.parse(JSON.stringify(simCfg)) as { sim: { transport: Record<string, unknown>; sales: Record<string, unknown>; rush: Record<string, unknown> } };
    delete raw.sim.transport.bellName;
    delete raw.sim.sales.seatName;
    delete raw.sim.rush.name;
    const problems = lintGameConfig(GameConfigSchema.parse(raw));
    for (const key of ['sim.transport.bellName', 'sim.sales.seatName', 'sim.rush.name']) expect(problems.some((p) => p.startsWith(key))).toBe(true);
  });
});
