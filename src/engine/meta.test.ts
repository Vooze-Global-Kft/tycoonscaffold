/// <reference types="node" />
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { GameConfigSchema, RARITIES, type GameConfig, type Rarity } from '../config/schema';
import * as E from './economy';
import * as M from './meta';
import type { GameState } from './types';

const gamesDir = path.resolve(__dirname, '../../games');
const raw = (id: string) => JSON.parse(fs.readFileSync(path.join(gamesDir, id, 'game.json'), 'utf8'));

/** Noon local time, far from midnight and DST changes, so day keys are predictable. */
const T0 = new Date(2026, 0, 10, 12, 0, 0).getTime();
const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const cards = [
  { id: 'c1', name: 'C1', icon: '🙂', rarity: 'common', stat: 'stationValue' },
  { id: 'c2', name: 'C2', icon: '🙂', rarity: 'common', stat: 'transportCapacity' },
  { id: 'r1', name: 'R1', icon: '🙂', rarity: 'rare', stat: 'tapValue' },
  { id: 'e1', name: 'E1', icon: '🙂', rarity: 'epic', stat: 'rushDuration' },
  { id: 'l1', name: 'L1', icon: '🙂', rarity: 'legendary', stat: 'globalIncome' },
];
const copies = { common: [1, 1], rare: [1, 1], epic: [1, 1], legendary: [1, 1] };
const chest = (id: string, extra: Record<string, unknown> = {}) => ({
  id, name: id, icon: '📦', slots: 3,
  slotWeights: { card: 60, gems: 20, cash: 20 },
  rarityWeights: { common: 74, rare: 20, epic: 5, legendary: 1 },
  cardCopies: copies, gems: [2, 5], cashSeconds: [30, 60],
  ...extra,
});

const metaRaw = {
  cards,
  chests: [
    chest('plain'),
    chest('commons', { slotWeights: { card: 1, gems: 0, cash: 0 }, rarityWeights: { common: 1, rare: 0, epic: 0, legendary: 0 } }),
    chest('guarded', { slotWeights: { card: 1, gems: 0, cash: 0 }, rarityWeights: { common: 1, rare: 0, epic: 0, legendary: 0 }, guaranteed: 'rare' }),
    chest('gemsonly', { slotWeights: { card: 0, gems: 1, cash: 0 } }),
    chest('gemsguard', { slotWeights: { card: 0, gems: 1, cash: 0 }, guaranteed: 'epic' }),
    chest('big', { slots: 1, slotWeights: { card: 1, gems: 0, cash: 0 }, cardCopies: { common: [10, 10], rare: [10, 10], epic: [10, 10], legendary: [10, 10] } }),
    chest('pricey', { gemCost: 100 }),
  ],
  freeChest: { chestId: 'plain', everyHours: 4, stored: 2, firstMinutes: [15, 60] },
  adChest: { chestId: 'plain', perDay: 3, cooldownMinutes: 120 },
  pity: {},
  chestGrowthPerVenue: 0.2,
  missions: {
    slots: 3,
    perDay: 10,
    templates: [
      { id: 'serve_a', type: 'serve', text: 'Serve {n}', targets: [5, 20, 50], reward: { type: 'gems', amount: 2 } },
      { id: 'earn_a', type: 'earn', text: 'Earn {n}', targets: [30, 120], reward: { type: 'gems', amount: 3 } },
      { id: 'levels_a', type: 'levels', text: 'Buy {n} levels', targets: [3, 10], reward: { type: 'gems', amount: 2 } },
      { id: 'taps_a', type: 'taps', text: 'Tap {n} times', targets: [10, 25, 50, 100], reward: { type: 'gems', amount: 2 } },
      { id: 'taps_b', type: 'taps', text: 'Tap {n} more', targets: [200], reward: { type: 'gems', amount: 4 } },
      { id: 'bonus_a', type: 'bonus', text: 'Catch {n}', targets: [1, 3], reward: { type: 'gems', amount: 3 } },
      { id: 'chests_a', type: 'chests', text: 'Open {n} chests', targets: [1, 2], reward: { type: 'gems', amount: 3 } },
      { id: 'rush_a', type: 'rush', text: 'Rush {n} times', targets: [1, 2], reward: { type: 'gems', amount: 3 } },
      { id: 'hires_a', type: 'hires', text: 'Hire {n}', targets: [1], reward: { type: 'gems', amount: 5 } },
    ],
    milestones: [
      { every: 5, reward: { type: 'chest', chestId: 'plain' } },
      { every: 10, reward: { type: 'chest', chestId: 'big' } },
    ],
  },
  deals: [
    { id: 'd_always', title: 'Shelf', contents: [{ type: 'card', cardId: 'r1', copies: 2 }], gemCost: 50, trigger: { type: 'always' }, maxPurchases: 2 },
    { id: 'd_play', title: 'Play', contents: [{ type: 'gems', amount: 100 }], productId: 'p_play', trigger: { type: 'playSeconds', seconds: 600 }, durationHours: 48 },
    { id: 'd_sess', title: 'Sess', contents: [{ type: 'gems', amount: 300 }, { type: 'card', cardId: 'e1', copies: 3 }], productId: 'p_sess', trigger: { type: 'sessions', count: 3 }, durationHours: 72 },
    { id: 'd_prest', title: 'Prest', contents: [{ type: 'gems', amount: 10 }], gemCost: 100, trigger: { type: 'prestige', count: 1 }, durationHours: 48 },
    { id: 'd_life', title: 'Life', contents: [{ type: 'gems', amount: 10 }], gemCost: 10, trigger: { type: 'lifetimeEarnings', amount: 1e6 }, durationHours: 48 },
    { id: 'd_venue', title: 'Venue', contents: [{ type: 'gems', amount: 10 }], gemCost: 10, trigger: { type: 'venue', venueId: 'b' }, durationHours: 48 },
  ],
  dailyShop: {
    slots: 4,
    offers: [
      { id: 'free_a', title: 'Free gems', reward: { type: 'gems', amount: 5 }, gemCost: 0, weight: 1 },
      { id: 'free_b', title: 'Free card', reward: { type: 'randomCard', rarity: 'common', copies: 1 }, gemCost: 0, weight: 3 },
      { id: 'p1', title: 'P1', reward: { type: 'card', cardId: 'c1', copies: 5 }, gemCost: 10, weight: 1 },
      { id: 'p2', title: 'P2', reward: { type: 'card', cardId: 'c2', copies: 5 }, gemCost: 10, weight: 1 },
      { id: 'p3', title: 'P3', reward: { type: 'card', cardId: 'r1', copies: 2 }, gemCost: 20, weight: 1 },
      { id: 'p4', title: 'P4', reward: { type: 'cash', seconds: 3600 }, gemCost: 15, weight: 1 },
      { id: 'p5', title: 'P5', reward: { type: 'card', cardId: 'e1', copies: 1 }, gemCost: 60, weight: 1 },
      { id: 'p6', title: 'P6', reward: { type: 'gems', amount: 1 }, gemCost: 1, weight: 5 },
    ],
  },
};

const baseRaw = {
  ...raw('space-miner'),
  economy: {
    startingCash: 0,
    prestige: { threshold: 1e12, scale: 1, bonusPerPoint: 0.02 },
    offline: { maxHours: 4, efficiency: 0.5, minSecondsToShow: 60 },
    boost: { multiplier: 2, minutesPerAd: 30, maxMinutes: 240 },
    daily: { gems: [5, 5, 10] },
    timeWarp: { hours: 1, gemCost: 25 },
  },
  story: [],
  monetization: {
    ads: {},
    iap: {
      products: [
        { id: 'p_play', title: 'Play deal', kind: 'deal' },
        { id: 'p_sess', title: 'Session deal', kind: 'deal' },
      ],
    },
  },
};

const simBlock = {
  transport: {
    name: 'Haulers', workerName: 'Hauler', icon: '🚚',
    baseCost: 20, costGrowth: 1.15, baseCapacity: 20, capacityGrowth: 1.12, tripSeconds: 6,
    workersAt: [1, 5, 15], managerCost: 500, managerName: 'Dispatcher',
  },
  sales: {
    name: 'Docks', seatName: 'Dock', icon: '⚓',
    baseCost: 20, costGrowth: 1.15, baseSpend: 10, spendGrowth: 1.12, serveSeconds: 4,
    seatsAt: [1, 2, 6, 12],
  },
  venues: [
    { id: 'a', name: 'Alpha', icon: '🅰️', unlockCost: 0, scale: 1 },
    { id: 'b', name: 'Beta', icon: '🅱️', unlockCost: 1e6, scale: 50 },
  ],
};

const parse = (over: Record<string, unknown> = {}, meta: Record<string, unknown> = {}): GameConfig =>
  GameConfigSchema.parse({ ...baseRaw, mode: 'sim', sim: simBlock, ...over, meta: { ...metaRaw, ...meta } });

const cfg = parse();
const classic = GameConfigSchema.parse({ ...baseRaw, mode: 'classic', sim: undefined, meta: metaRaw });
const fresh = (c: GameConfig = cfg, now = T0): GameState => E.createInitialState(c, now);
const rarityOf = (c: GameConfig, id: string): Rarity => c.meta.cards.find((x) => x.id === id)!.rarity;
const cardRewards = (rewards: M.GrantedReward[]) => rewards.filter((r): r is Extract<M.GrantedReward, { type: 'card' }> => r.type === 'card');
const best = (c: GameConfig, rewards: M.GrantedReward[]) =>
  cardRewards(rewards).reduce((b, r) => Math.max(b, RARITIES.indexOf(rarityOf(c, r.cardId))), -1);

// ---------------------------------------------------------------- chests

describe('chests: rolls', () => {
  const withChests = (s: GameState, id: string, n: number) => M.grantChest(cfg, s, id, n);

  it('the same seed gives the same chest; a different seed can differ', () => {
    const a = withChests({ ...fresh(), rng: 12345 }, 'plain', 1);
    const r1 = M.openChest(cfg, a, 'plain', T0)!;
    const r2 = M.openChest(cfg, a, 'plain', T0)!;
    expect(r1.rewards).toEqual(r2.rewards);
    expect(r1.state.rng).toBe(r2.state.rng);
    let differs = false;
    for (let seed = 1; seed < 50 && !differs; seed++) {
      const other = M.openChest(cfg, { ...a, rng: seed }, 'plain', T0)!;
      differs = JSON.stringify(other.rewards) !== JSON.stringify(r1.rewards);
    }
    expect(differs).toBe(true);
  });

  it('opening consumes exactly one chest, counts it, and returns null without one', () => {
    const s = withChests(fresh(), 'plain', 2);
    const r = M.openChest(cfg, s, 'plain', T0)!;
    expect(r.state.chests.owned.plain).toBe(1);
    expect(r.state.stats.chestsOpened).toBe(1);
    expect(r.rewards).toHaveLength(3);
    const r2 = M.openChest(cfg, r.state, 'plain', T0)!;
    expect(r2.state.chests.owned.plain).toBeUndefined();
    expect(M.chestCount(r2.state)).toBe(0);
    expect(M.openChest(cfg, r2.state, 'plain', T0)).toBeNull();
    expect(M.openChest(cfg, fresh(), 'nope', T0)).toBeNull();
  });

  it('applies what it reveals: cards, gems and cash reach the state', () => {
    const s = withChests({ ...fresh(), rng: 7 }, 'plain', 1);
    const r = M.openChest(cfg, s, 'plain', T0)!;
    const gems = r.rewards.reduce((a, g) => a + (g.type === 'gems' ? g.amount : 0), 0);
    const cash = r.rewards.reduce((a, g) => a + (g.type === 'cash' ? g.amount : 0), 0);
    expect(r.state.gems).toBe(s.gems + gems);
    expect(r.state.cash).toBeCloseTo(s.cash + cash, 6);
    for (const c of cardRewards(r.rewards)) expect(r.state.cards[c.cardId].level).toBeGreaterThan(0);
  });

  it('reveals cash and gems first and the best card last', () => {
    let s = withChests({ ...fresh(), rng: 99 }, 'plain', 200);
    for (let i = 0; i < 200; i++) {
      const r = M.openChest(cfg, s, 'plain', T0)!;
      const order = r.rewards.map((g) => (g.type === 'cash' ? -2 : g.type === 'gems' ? -1 : RARITIES.indexOf(rarityOf(cfg, (g as { cardId: string }).cardId))));
      expect([...order].sort((a, b) => a - b)).toEqual(order);
      s = r.state;
    }
  });

  it('shown odds equal roll frequencies (100,000 chests, no guarantee or protection)', () => {
    const odds = M.chestCardOdds(cfg, 'plain');
    expect(odds.reduce((a, o) => a + o.percent, 0)).toBeCloseTo(100, 9);
    const slotOdds = M.chestSlotOdds(cfg, 'plain');
    const N = 100_000;
    let s = withChests({ ...fresh(), rng: 2024 }, 'plain', N);
    const byRarity: Record<Rarity, number> = { common: 0, rare: 0, epic: 0, legendary: 0 };
    const bySlot = { card: 0, gems: 0, cash: 0 };
    for (let i = 0; i < N; i++) {
      const r = M.openChest(cfg, s, 'plain', T0)!;
      for (const g of r.rewards) {
        if (g.type === 'card') {
          bySlot.card++;
          byRarity[rarityOf(cfg, g.cardId)]++;
        } else if (g.type === 'gems') bySlot.gems++;
        else if (g.type === 'cash') bySlot.cash++;
      }
      // Keep the state small: the loop is about the rolls.
      s = { ...r.state, cards: {} };
    }
    const cardsRolled = bySlot.card;
    for (const o of odds) expect(Math.abs((byRarity[o.rarity] / cardsRolled) * 100 - o.percent)).toBeLessThan(0.35);
    const slots = N * 3;
    expect(Math.abs((bySlot.card / slots) * 100 - slotOdds.card)).toBeLessThan(0.35);
    expect(Math.abs((bySlot.gems / slots) * 100 - slotOdds.gems)).toBeLessThan(0.35);
    expect(Math.abs((bySlot.cash / slots) * 100 - slotOdds.cash)).toBeLessThan(0.35);
  }, 60_000);

  it('a rarity with no cards is never rolled, and the odds say so', () => {
    const noEpic = parse({}, { cards: cards.filter((c) => c.rarity !== 'epic') });
    expect(M.chestCardOdds(noEpic, 'plain').find((o) => o.rarity === 'epic')!.percent).toBe(0);
    expect(M.chestCardOdds(noEpic, 'plain').reduce((a, o) => a + o.percent, 0)).toBeCloseTo(100, 9);
    let s = M.grantChest(noEpic, { ...fresh(noEpic), rng: 5 }, 'plain', 3000);
    for (let i = 0; i < 3000; i++) {
      const r = M.openChest(noEpic, s, 'plain', T0)!;
      for (const c of cardRewards(r.rewards)) expect(rarityOf(noEpic, c.cardId)).not.toBe('epic');
      s = r.state;
    }
    // No cards at all: card slots cannot roll, so the odds are all zero and slots are gems or cash.
    const none = parse({}, { cards: [] });
    expect(M.chestCardOdds(none, 'plain').every((o) => o.percent === 0)).toBe(true);
    expect(M.chestSlotOdds(none, 'plain').card).toBe(0);
    const r = M.openChest(none, M.grantChest(none, fresh(none), 'plain'), 'plain', T0)!;
    expect(cardRewards(r.rewards)).toHaveLength(0);
  });

  it('the guarantee upgrades the last card slot to exactly that rarity', () => {
    let s = M.grantChest(cfg, { ...fresh(), rng: 3 }, 'guarded', 50);
    for (let i = 0; i < 50; i++) {
      const r = M.openChest(cfg, s, 'guarded', T0)!;
      const rs = cardRewards(r.rewards).map((c) => rarityOf(cfg, c.cardId));
      expect(rs).toEqual(['common', 'common', 'rare']);
      s = r.state;
    }
  });

  it('a guarantee turns the last slot into a card when no card slot was rolled', () => {
    const r = M.openChest(cfg, M.grantChest(cfg, fresh(), 'gemsguard'), 'gemsguard', T0)!;
    expect(r.rewards.map((g) => g.type)).toEqual(['gems', 'gems', 'card']);
    expect(rarityOf(cfg, cardRewards(r.rewards)[0].cardId)).toBe('epic');
  });

  it('epic protection: an epic at the latest in the Nth chest, then the counter resets', () => {
    const c = parse({}, { pity: { epic: 3 } });
    let s = M.grantChest(c, fresh(c), 'commons', 9);
    const seen: number[] = [];
    for (let i = 0; i < 9; i++) {
      const r = M.openChest(c, s, 'commons', T0)!;
      seen.push(best(c, r.rewards));
      s = r.state;
    }
    expect(seen).toEqual([0, 0, 2, 0, 0, 2, 0, 0, 2]);
    expect(s.chests.sinceEpic).toBe(0);
  });

  it('legendary protection, together with epic protection', () => {
    const c = parse({}, { pity: { epic: 3, legendary: 5 } });
    let s = M.grantChest(c, fresh(c), 'commons', 10);
    const seen: number[] = [];
    for (let i = 0; i < 10; i++) {
      const r = M.openChest(c, s, 'commons', T0)!;
      seen.push(best(c, r.rewards));
      s = r.state;
    }
    expect(seen).toEqual([0, 0, 2, 0, 3, 0, 0, 2, 0, 3]);
  });

  it('a lucky roll resets the counter; chests without card slots do not count', () => {
    const c = parse({}, { pity: { epic: 3 } });
    let s = M.grantChest(c, { ...fresh(c), chests: { ...fresh(c).chests, sinceEpic: 1 } }, 'gemsonly', 5);
    for (let i = 0; i < 5; i++) s = M.openChest(c, s, 'gemsonly', T0)!.state;
    expect(s.chests.sinceEpic).toBe(1);
    // A chest whose roll is all legendary resets both counters.
    const lucky = parse({}, { pity: { epic: 3, legendary: 10 }, chests: [chest('leg', { rarityWeights: { common: 0, rare: 0, epic: 0, legendary: 1 }, slotWeights: { card: 1, gems: 0, cash: 0 } })] });
    const st = { ...fresh(lucky), chests: { ...fresh(lucky).chests, sinceEpic: 1, sinceLegendary: 7 } };
    const r = M.openChest(lucky, M.grantChest(lucky, st, 'leg'), 'leg', T0)!;
    expect(r.state.chests.sinceEpic).toBe(0);
    expect(r.state.chests.sinceLegendary).toBe(0);
  });

  it('copies grow with the most venues ever open', () => {
    const one = M.openChest(cfg, M.grantChest(cfg, fresh(), 'big'), 'big', T0)!;
    expect(cardRewards(one.rewards)[0].copies).toBe(10);
    const three = { ...fresh(), stats: { ...fresh().stats, venuesEver: 3 } };
    const r = M.openChest(cfg, M.grantChest(cfg, three, 'big'), 'big', T0)!;
    expect(cardRewards(r.rewards)[0].copies).toBe(14);
    expect(M.chestRules(cfg, three, 'big')!.copiesMultiplier).toBeCloseTo(1.4, 9);
  });

  it('isNew is true only on the first reveal of a card', () => {
    const c = parse({}, { cards: [cards[0]] });
    const r = M.openChest(c, M.grantChest(c, fresh(c), 'commons'), 'commons', T0)!;
    expect(cardRewards(r.rewards).map((x) => x.isNew)).toEqual([true, false, false]);
    expect(r.state.cards.c1).toEqual({ level: 1, copies: 2 });
  });

  it('haptic pulses stay within budget and keep the best card', () => {
    const rewards: M.GrantedReward[] = [
      { type: 'gems', amount: 3 },
      ...['c1', 'c2', 'r1', 'r1', 'e1', 'l1', 'l1'].map((cardId) => ({ type: 'card' as const, cardId, copies: 1, isNew: false })),
    ];
    const pulses = M.chestRevealPulses(cfg, rewards);
    expect(pulses.reduce((a, b) => a + b, 0)).toBe(10);
    expect(pulses[0]).toBe(0);
    expect(pulses.slice(-2)).toEqual([4, 4]);
    expect(M.chestRevealPulses(cfg, rewards.slice(0, 3))).toEqual([0, 1, 1]);
  });

  it('grantChest ignores unknown ids and buyChest needs chests for sale, a price and the gems', () => {
    const s = fresh();
    expect(M.grantChest(cfg, s, 'nope', 3)).toBe(s);
    expect(M.grantChest(cfg, s, 'plain', 0)).toBe(s);
    const rich = { ...s, gems: 500 };
    expect(M.buyChest(cfg, rich, 'pricey')).toBe(rich); // chestsForSale is off
    const selling = parse({}, { chestsForSale: true });
    expect(M.buyChest(selling, rich, 'plain')).toBe(rich); // no price
    expect(M.buyChest(selling, { ...s, gems: 99 }, 'pricey').gems).toBe(99);
    const bought = M.buyChest(selling, rich, 'pricey');
    expect(bought.gems).toBe(400);
    expect(bought.chests.owned.pricey).toBe(1);
  });
});

describe('chests: free and ad chests', () => {
  const started = M.startFreeChestTimer(cfg, fresh(), T0);

  it('nothing is ready at a fresh start; the timer starts once', () => {
    expect(M.freeChestStatus(cfg, fresh(), T0)).toEqual({ ready: 0, stored: 2, nextInMs: 15 * MIN });
    expect(started.chests.freeAnchor).toBe(T0);
    expect(M.startFreeChestTimer(cfg, started, T0 + HOUR)).toBe(started);
    expect(M.claimFreeChest(cfg, started, T0)).toBe(started);
    expect(M.freeChestStatus(parse({}, { freeChest: undefined }), started, T0)).toBeNull();
  });

  it('the first two come after 15 and 60 minutes, then storage is full', () => {
    expect(M.freeChestStatus(cfg, started, T0 + 14 * MIN)).toEqual({ ready: 0, stored: 2, nextInMs: MIN });
    expect(M.freeChestStatus(cfg, started, T0 + 15 * MIN)).toEqual({ ready: 1, stored: 2, nextInMs: 60 * MIN });
    expect(M.freeChestStatus(cfg, started, T0 + 75 * MIN)).toEqual({ ready: 2, stored: 2, nextInMs: 0 });
    expect(M.freeChestStatus(cfg, started, T0 + 30 * DAY)).toEqual({ ready: 2, stored: 2, nextInMs: 0 });
  });

  it('claiming from full storage keeps the other one and restarts the timer from now', () => {
    const now = T0 + 10 * HOUR;
    const s = M.claimFreeChest(cfg, started, now);
    expect(s.chests.owned.plain).toBe(1);
    expect(s.chests.freeClaimed).toBe(1);
    expect(M.freeChestStatus(cfg, s, now)).toEqual({ ready: 1, stored: 2, nextInMs: 4 * HOUR });
    const s2 = M.claimFreeChest(cfg, s, now);
    expect(M.freeChestStatus(cfg, s2, now)).toEqual({ ready: 0, stored: 2, nextInMs: 4 * HOUR });
    expect(M.claimFreeChest(cfg, s2, now)).toBe(s2);
  });

  it('claiming one of two keeps partial progress towards the next', () => {
    const c = parse({}, { freeChest: { chestId: 'plain', everyHours: 4, stored: 2, firstMinutes: [] } });
    const s = M.startFreeChestTimer(c, fresh(c), T0);
    const now = T0 + 7 * HOUR; // one ready, 3 of 4 hours into the next
    expect(M.freeChestStatus(c, s, now)).toEqual({ ready: 1, stored: 2, nextInMs: HOUR });
    const claimed = M.claimFreeChest(c, s, now);
    expect(M.freeChestStatus(c, claimed, now)).toEqual({ ready: 0, stored: 2, nextInMs: HOUR });
    expect(M.freeChestStatus(c, claimed, now + HOUR)!.ready).toBe(1);
  });

  it('a clock moved backwards never grants or breaks anything', () => {
    const back = T0 - 3 * DAY;
    const st = M.freeChestStatus(cfg, started, back)!;
    expect(st.ready).toBe(0);
    expect(st.nextInMs).toBeGreaterThan(0);
    expect(st.nextInMs).toBeLessThanOrEqual(15 * MIN);
    expect(M.claimFreeChest(cfg, started, back)).toBe(started);
    // Claim at a sane time, then wind the clock back: still nothing extra, and the clock coming back works.
    const claimed = M.claimFreeChest(cfg, started, T0 + 20 * MIN);
    expect(M.freeChestStatus(cfg, claimed, T0 - DAY)!.ready).toBe(0);
    expect(M.claimFreeChest(cfg, claimed, T0 - DAY)).toBe(claimed);
    expect(M.freeChestStatus(cfg, claimed, T0 + 75 * MIN)!.ready).toBe(1);
    // Ad chest: winding back to yesterday does not refill today's limit.
    let a = fresh();
    for (const t of [0, 2, 4]) a = M.grantAdChest(cfg, a, T0 + t * HOUR);
    expect(M.adChestStatus(cfg, a, T0 - DAY)!.left).toBe(0);
    expect(M.grantAdChest(cfg, a, T0 - DAY)).toBe(a);
    expect(M.adChestStatus(cfg, a, T0 + 4 * HOUR - 10 * HOUR)!.nextInMs).toBeGreaterThan(0);
  });

  it('ad chest: three a day, two hours apart, back on a new day', () => {
    let s = fresh();
    expect(M.adChestStatus(cfg, s, T0)).toEqual({ left: 3, nextInMs: 0 });
    s = M.grantAdChest(cfg, s, T0);
    expect(s.chests.owned.plain).toBe(1);
    expect(M.adChestStatus(cfg, s, T0 + HOUR)).toEqual({ left: 2, nextInMs: HOUR });
    expect(M.grantAdChest(cfg, s, T0 + HOUR)).toBe(s);
    s = M.grantAdChest(cfg, s, T0 + 2 * HOUR);
    s = M.grantAdChest(cfg, s, T0 + 4 * HOUR);
    expect(s.chests.owned.plain).toBe(3);
    const st = M.adChestStatus(cfg, s, T0 + 7 * HOUR)!;
    expect(st.left).toBe(0);
    expect(st.nextInMs).toBe(M.msUntilNextDay(T0 + 7 * HOUR));
    expect(M.grantAdChest(cfg, s, T0 + 7 * HOUR)).toBe(s);
    expect(M.adChestStatus(cfg, s, T0 + DAY)).toEqual({ left: 3, nextInMs: 0 });
    expect(M.grantAdChest(cfg, s, T0 + DAY).chests.owned.plain).toBe(4);
    expect(M.adChestStatus(parse({}, { adChest: undefined }), s, T0)).toBeNull();
  });

  it('chestSalesAllowed: flag off, blocked country, unknown country', () => {
    expect(M.chestSalesAllowed(cfg, 'US')).toBe(false);
    const on = parse({}, { chestsForSale: true });
    expect(M.chestSalesAllowed(on, 'US')).toBe(true);
    expect(M.chestSalesAllowed(on, 'de')).toBe(true);
    expect(M.chestSalesAllowed(on, 'BE')).toBe(false);
    expect(M.chestSalesAllowed(on, 'br')).toBe(false);
    expect(M.chestSalesAllowed(on, 'NL')).toBe(false);
    expect(M.chestSalesAllowed(on, null)).toBe(false);
    expect(M.chestSalesAllowed(on, '')).toBe(false);
    expect(M.chestSalesAllowed(on, 'USA')).toBe(false);
    expect(M.containsChest([{ type: 'gems', amount: 1 }])).toBe(false);
    expect(M.containsChest([{ type: 'gems', amount: 1 }, { type: 'chest', chestId: 'plain', count: 1 }])).toBe(true);
  });
});

// ---------------------------------------------------------------- missions

/** Pushes every mission counter far past any target. */
const finishEverything = (s: GameState): GameState => ({
  ...s,
  lifetimeEarnings: s.lifetimeEarnings + 1e30,
  stats: { ...s.stats, served: s.stats.served + 1e6, levelsBought: s.stats.levelsBought + 1e6, taps: s.stats.taps + 1e6, bonusCaught: s.stats.bonusCaught + 1e6, chestsOpened: s.stats.chestsOpened + 1e6, rushes: s.stats.rushes + 1e6, hires: s.stats.hires + 1e6 },
});
const typeOf = (c: GameConfig, id: string) => c.meta.missions.templates.find((t) => t.id === id)!.type;

describe('missions', () => {
  it('fills three slots with different templates and different types', () => {
    const s = M.refreshMissions(cfg, fresh(), T0);
    expect(s.missions.slots).toHaveLength(3);
    const ids = s.missions.slots.map((x) => x.templateId);
    expect(new Set(ids).size).toBe(3);
    expect(new Set(ids.map((id) => typeOf(cfg, id))).size).toBe(3);
    expect(M.refreshMissions(cfg, s, T0)).toBe(s);
    expect(M.refreshMissions(cfg, s)).toBe(s);
  });

  it('never puts a template in two slots and keeps the types varied over many claims', () => {
    let s = M.refreshMissions(cfg, fresh(), T0);
    for (let day = 0; day < 6; day++) {
      const now = T0 + day * DAY;
      s = M.refreshMissions(cfg, s, now);
      for (let k = 0; k < 10; k++) {
        const ids = s.missions.slots.map((x) => x.templateId);
        expect(new Set(ids).size).toBe(ids.length);
        expect(new Set(ids.map((id) => typeOf(cfg, id))).size).toBe(ids.length);
        const r = M.claimMission(cfg, finishEverything(s), 0, now);
        if (!r) break;
        s = r.state;
      }
    }
    // Every usable template got its turn.
    for (const t of cfg.meta.missions.templates) expect(s.missions.completed[t.id] ?? 0).toBeGreaterThan(0);
  });

  it('target ladders advance with completions and the last one repeats', () => {
    const c = parse({}, { missions: { ...metaRaw.missions, slots: 1, templates: [metaRaw.missions.templates[3]] } });
    const at = (done: number) => M.refreshMissions(c, { ...fresh(c), missions: { ...fresh(c).missions, completed: { taps_a: done } } }, T0).missions.slots[0].target;
    expect([0, 1, 2, 3, 4, 9].map(at)).toEqual([10, 25, 50, 100, 100, 100]);
    const view = M.missionViews(c, M.refreshMissions(c, fresh(c), T0))[0];
    expect(view.text).toBe('Tap 10 times');
  });

  it('"earn" targets are seconds of income, rounded to two digits', () => {
    const c = parse({}, { missions: { ...metaRaw.missions, slots: 1, templates: [metaRaw.missions.templates[1]] } });
    const poor = M.refreshMissions(c, fresh(c), T0);
    const tap = E.tapValue(c, fresh(c), T0);
    expect(poor.missions.slots[0].target).toBe(Math.round(tap * 30));
    // A running venue: income dominates.
    let rich = fresh(c);
    rich = { ...rich, cash: 1e9 };
    rich = E.buyBusiness(c, rich, 'a', 'drill', 50);
    rich = E.hireManager(c, rich, 'a', 'drill');
    rich = E.hireTransportManager(c, rich, 'a');
    rich = E.buySales(c, rich, 'a', 40);
    rich = E.buyTransport(c, rich, 'a', 40);
    const ips = E.incomePerSecond(c, rich, T0);
    expect(ips * 30).toBeGreaterThan(E.tapValue(c, rich, T0) * 30);
    const target = M.refreshMissions(c, rich, T0).missions.slots[0].target;
    expect(target / (ips * 30)).toBeGreaterThan(0.95);
    expect(target / (ips * 30)).toBeLessThan(1.05);
    expect(String(target).replace(/0+$/, '').replace('.', '').length).toBeLessThanOrEqual(2);
    expect(M.missionViews(c, M.refreshMissions(c, rich, T0))[0].text.startsWith(`Earn ${c.strings.currencySymbol}`)).toBe(true);
  });

  it('claims only when done, with live progress', () => {
    const c = parse({}, { missions: { ...metaRaw.missions, slots: 1, templates: [metaRaw.missions.templates[3]] } });
    let s = M.refreshMissions(c, fresh(c), T0);
    expect(M.claimMission(c, s, 0, T0)).toBeNull();
    expect(M.claimMission(c, s, 5, T0)).toBeNull();
    s = { ...s, stats: { ...s.stats, taps: 7 } };
    expect(M.missionViews(c, s)[0]).toMatchObject({ progress: 7, target: 10, done: false });
    s = { ...s, stats: { ...s.stats, taps: 15 } };
    expect(M.missionViews(c, s)[0]).toMatchObject({ progress: 10, done: true });
    const r = M.claimMission(c, s, 0, T0)!;
    expect(r.granted).toEqual([{ type: 'gems', amount: 2 }]);
    expect(r.state.gems).toBe(s.gems + 2);
    expect(r.state.missions.completed.taps_a).toBe(1);
    // The refill starts counting from now: the extra taps do not count towards the next one.
    expect(M.missionViews(c, r.state)[0]).toMatchObject({ progress: 0, target: 25 });
  });

  it('daily limit: ten a day, then nothing until the next day', () => {
    let s = M.refreshMissions(cfg, fresh(), T0);
    let claims = 0;
    for (let i = 0; i < 20; i++) {
      const r = M.claimMission(cfg, finishEverything(s), 0, T0 + i * MIN);
      if (!r) break;
      s = r.state;
      claims++;
    }
    expect(claims).toBe(10);
    expect(s.missions.slots).toHaveLength(0);
    expect(s.missions.doneToday).toBe(10);
    expect(M.refreshMissions(cfg, s, T0 + 5 * HOUR)).toBe(s);
    const tomorrow = M.refreshMissions(cfg, s, T0 + DAY);
    expect(tomorrow.missions.slots).toHaveLength(3);
    expect(tomorrow.missions.doneToday).toBe(0);
    // Without a clock argument the day comes from the daily shop the store refreshes first.
    const viaShop = M.refreshMissions(cfg, M.refreshDailyShop(cfg, s, T0 + DAY));
    expect(viaShop.missions.slots).toHaveLength(3);
  });

  it('milestone rewards on every 5th and 10th mission', () => {
    let s = M.refreshMissions(cfg, fresh(), T0);
    const chestsAfter: Record<number, Record<string, number>> = {};
    for (let i = 1; i <= 10; i++) {
      const r = M.claimMission(cfg, finishEverything(s), 0, T0)!;
      s = r.state;
      if (i === 5) expect(r.granted.slice(1)).toEqual([{ type: 'chest', chestId: 'plain', count: 1 }]);
      if (i === 10) expect(r.granted.slice(1)).toEqual([{ type: 'chest', chestId: 'plain', count: 1 }, { type: 'chest', chestId: 'big', count: 1 }]);
      if (i % 5 !== 0) expect(r.granted).toHaveLength(1);
      chestsAfter[i] = { ...s.chests.owned };
    }
    expect(chestsAfter[4]).toEqual({});
    expect(chestsAfter[10]).toEqual({ plain: 2, big: 1 });
    expect(s.missions.total).toBe(10);
  });

  it('slots survive a config that removed a template', () => {
    const s = M.refreshMissions(cfg, fresh(), T0);
    const removed = s.missions.slots[1].templateId;
    const c2 = parse({}, { missions: { ...metaRaw.missions, templates: metaRaw.missions.templates.filter((t) => t.id !== removed) } });
    const next = M.refreshMissions(c2, s, T0);
    expect(next.missions.slots).toHaveLength(3);
    expect(next.missions.slots.map((x) => x.templateId)).not.toContain(removed);
    expect(next.missions.slots[0]).toBe(s.missions.slots[0]);
    expect(next.missions.slots[1]).toBe(s.missions.slots[2]);
    // Views skip a slot whose template is gone even before a refresh.
    expect(M.missionViews(c2, s).map((v) => v.index)).toEqual([0, 2]);
  });

  it('skips types that cannot progress in the game', () => {
    let s = M.refreshMissions(classic, fresh(classic), T0);
    for (let i = 0; i < 10; i++) {
      for (const sl of s.missions.slots) expect(['serve', 'rush']).not.toContain(typeOf(classic, sl.templateId));
      s = M.claimMission(classic, finishEverything(s), 0, T0)!.state;
    }
    const noChests = parse({}, { chests: [], freeChest: undefined, adChest: undefined, missions: { ...metaRaw.missions, milestones: [] }, dailyShop: { slots: 3, offers: [] } });
    let t = M.refreshMissions(noChests, fresh(noChests), T0);
    for (let i = 0; i < 10; i++) {
      for (const sl of t.missions.slots) expect(typeOf(noChests, sl.templateId)).not.toBe('chests');
      t = M.claimMission(noChests, finishEverything(t), 0, T0)!.state;
    }
  });
});

// ---------------------------------------------------------------- deals

const dealIds = (s: GameState, now: number) => M.activeDeals(cfg, s, now).map((d) => d.deal.id);

describe('deals', () => {
  it('every trigger type', () => {
    let s = M.refreshDeals(cfg, fresh(), T0);
    expect(dealIds(s, T0)).toEqual(['d_always']);
    s = M.refreshDeals(cfg, { ...s, stats: { ...s.stats, playSeconds: 600 } }, T0);
    expect(dealIds(s, T0)).toContain('d_play');
    s = M.refreshDeals(cfg, { ...s, stats: { ...s.stats, sessions: 3 } }, T0);
    expect(dealIds(s, T0)).toContain('d_sess');
    s = M.refreshDeals(cfg, { ...s, prestigeCount: 1 }, T0);
    expect(dealIds(s, T0)).toContain('d_prest');
    s = M.refreshDeals(cfg, { ...s, lifetimeEarnings: 1e6 }, T0);
    expect(dealIds(s, T0)).toContain('d_life');
    expect(dealIds(s, T0)).not.toContain('d_venue');
    s = M.refreshDeals(cfg, { ...s, venues: { ...s.venues, b: { ...s.venues.b, unlocked: true } } }, T0);
    expect(dealIds(s, T0)).toContain('d_venue');
    // Soonest-ending first, the permanent one last.
    expect(dealIds(s, T0).at(-1)).toBe('d_always');
    expect(M.activeDeals(cfg, s, T0)[0].endsAt).toBe(T0 + 48 * HOUR);
  });

  it('real expiry that never restarts', () => {
    const s = M.refreshDeals(cfg, { ...fresh(), stats: { ...fresh().stats, sessions: 3 } }, T0);
    expect(s.deals.d_sess).toMatchObject({ startedAt: T0, endsAt: T0 + 72 * HOUR, purchases: 0, seen: false });
    expect(dealIds(s, T0 + 72 * HOUR - 1)).toContain('d_sess');
    expect(dealIds(s, T0 + 72 * HOUR)).not.toContain('d_sess');
    const later = M.refreshDeals(cfg, s, T0 + 10 * DAY);
    expect(later.deals.d_sess.startedAt).toBe(T0);
    expect(dealIds(later, T0 + 10 * DAY)).not.toContain('d_sess');
    // A config change to the duration cannot extend a running offer.
    const longer = parse({}, { deals: metaRaw.deals.map((d) => (d.id === 'd_sess' ? { ...d, durationHours: 500 } : d)) });
    expect(M.activeDeals(longer, s, T0 + 100 * HOUR).map((d) => d.deal.id)).not.toContain('d_sess');
    // An old save without endsAt derives it from the config.
    const legacy = { ...s, deals: { d_sess: { startedAt: T0, purchases: 0, seen: false } } };
    expect(M.activeDeals(cfg, legacy, T0 + 71 * HOUR)[0].endsAt).toBe(T0 + 72 * HOUR);
  });

  it('purchase limits and gem prices', () => {
    let s = M.refreshDeals(cfg, { ...fresh(), gems: 120 }, T0);
    const r1 = M.buyDealWithGems(cfg, s, 'd_always', T0)!;
    expect(r1.state.gems).toBe(70);
    expect(r1.granted).toEqual([{ type: 'card', cardId: 'r1', copies: 2, isNew: true }]);
    s = r1.state;
    expect(M.activeDeals(cfg, s, T0)[0].purchasesLeft).toBe(1);
    s = M.buyDealWithGems(cfg, s, 'd_always', T0)!.state;
    expect(s.gems).toBe(20);
    expect(M.buyDealWithGems(cfg, { ...s, gems: 1000 }, 'd_always', T0)).toBeNull();
    expect(dealIds(s, T0)).not.toContain('d_always');
    // Needs the gems; money deals are not for gems; inactive deals cannot be bought.
    const p = M.refreshDeals(cfg, { ...fresh(), prestigeCount: 1, gems: 99, stats: { ...fresh().stats, sessions: 3 } }, T0);
    expect(M.buyDealWithGems(cfg, p, 'd_prest', T0)).toBeNull();
    expect(M.buyDealWithGems(cfg, { ...p, gems: 100 }, 'd_prest', T0)!.state.gems).toBe(10);
    expect(M.buyDealWithGems(cfg, { ...p, gems: 1000 }, 'd_sess', T0)).toBeNull();
    expect(M.buyDealWithGems(cfg, { ...p, gems: 1000 }, 'd_prest', T0 + 48 * HOUR)).toBeNull();
    expect(M.buyDealWithGems(cfg, { ...fresh(), gems: 1000 }, 'd_life', T0)).toBeNull();
  });

  it('pops up only time-limited deals the player has not seen', () => {
    let s = M.refreshDeals(cfg, fresh(), T0);
    expect(M.dealToShow(cfg, s, T0)).toBeNull(); // only the permanent shop item is active
    s = M.refreshDeals(cfg, { ...s, stats: { ...s.stats, sessions: 3 } }, T0);
    expect(M.dealToShow(cfg, s, T0)!.id).toBe('d_sess');
    const seen = M.markDealSeen(s, 'd_sess');
    expect(M.dealToShow(cfg, seen, T0)).toBeNull();
    expect(M.markDealSeen(seen, 'd_sess')).toBe(seen);
    expect(M.markDealSeen(seen, 'unknown')).toBe(seen);
    expect(M.dealToShow(cfg, s, T0 + 72 * HOUR)).toBeNull(); // expired
  });

  it('grantDeal grants after expiry (the player paid) and null for unknown deals', () => {
    const s = M.refreshDeals(cfg, { ...fresh(), stats: { ...fresh().stats, sessions: 3 } }, T0);
    const r = M.grantDeal(cfg, s, 'd_sess', T0 + 80 * HOUR)!;
    expect(r.state.gems).toBe(300);
    expect(r.state.cards.e1).toEqual({ level: 1, copies: 2 });
    expect(r.state.deals.d_sess.purchases).toBe(1);
    expect(r.state.deals.d_sess.endsAt).toBe(T0 + 72 * HOUR);
    expect(M.grantDeal(cfg, s, 'nope', T0)).toBeNull();
    // A deal that never started (a delayed transaction) is granted and recorded.
    const never = M.grantDeal(cfg, fresh(), 'd_play', T0)!;
    expect(never.state.gems).toBe(100);
    expect(never.state.deals.d_play.purchases).toBe(1);
  });
});

// ---------------------------------------------------------------- daily shop

describe('daily shop', () => {
  const offer = (id: string) => cfg.meta.dailyShop.offers.find((o) => o.id === id)!;

  it('is deterministic for a seed, one free offer first, no repeats', () => {
    const a = M.refreshDailyShop(cfg, { ...fresh(), rng: 42 }, T0);
    const b = M.refreshDailyShop(cfg, { ...fresh(), rng: 42 }, T0);
    expect(a.dailyShop).toEqual(b.dailyShop);
    expect(a.rng).toBe(b.rng);
    let s = { ...fresh(), rng: 1 };
    for (let d = 0; d < 200; d++) {
      s = M.refreshDailyShop(cfg, s, T0 + d * DAY);
      const ids = s.dailyShop.offerIds;
      expect(ids).toHaveLength(4);
      expect(new Set(ids).size).toBe(4);
      expect(offer(ids[0]).gemCost).toBe(0);
      for (const id of ids.slice(1)) expect(offer(id).gemCost).toBeGreaterThan(0);
    }
    const views = M.dailyOffers(cfg, s);
    expect(views.map((v) => v.offer.id)).toEqual(s.dailyShop.offerIds);
  });

  it('respects the weights over many days', () => {
    let s = { ...fresh(), rng: 77 };
    const count: Record<string, number> = {};
    const days = 3000;
    for (let d = 0; d < days; d++) {
      s = M.refreshDailyShop(cfg, s, T0 + d * DAY);
      for (const id of s.dailyShop.offerIds) count[id] = (count[id] ?? 0) + 1;
    }
    expect(count.free_b / days).toBeGreaterThan(0.72);
    expect(count.free_b / days).toBeLessThan(0.78);
    expect(count.p6).toBeGreaterThan(1.4 * count.p1);
    for (const id of ['p1', 'p2', 'p3', 'p4', 'p5']) expect(count[id] / days).toBeGreaterThan(0.3);
  });

  it('without free offers, every slot is a priced offer', () => {
    const c = parse({}, { dailyShop: { slots: 3, offers: metaRaw.dailyShop.offers.filter((o) => o.gemCost > 0) } });
    const s = M.refreshDailyShop(c, fresh(c), T0);
    expect(s.dailyShop.offerIds).toHaveLength(3);
  });

  it('one purchase per offer per day; gems needed; resets at local midnight', () => {
    const late = new Date(2026, 0, 10, 23, 59, 59).getTime();
    const midnight = new Date(2026, 0, 11, 0, 0, 0).getTime();
    expect(M.msUntilNextDay(late)).toBe(1000);
    expect(M.msUntilNextDay(midnight)).toBe(24 * HOUR);
    let s = M.refreshDailyShop(cfg, { ...fresh(), rng: 3, gems: 0 }, T0);
    const [freeId, paidId] = s.dailyShop.offerIds;
    const r = M.buyDailyOffer(cfg, s, freeId, T0)!;
    expect(r.state.dailyShop.bought).toEqual([freeId]);
    expect(M.buyDailyOffer(cfg, r.state, freeId, T0)).toBeNull();
    expect(M.buyDailyOffer(cfg, r.state, paidId, T0)).toBeNull(); // no gems
    s = { ...r.state, gems: 1000 };
    const bought = M.buyDailyOffer(cfg, s, paidId, late)!;
    expect(bought.state.gems).toBe(1000 - offer(paidId).gemCost);
    expect(M.buyDailyOffer(cfg, bought.state, paidId, late)).toBeNull();
    expect(M.buyDailyOffer(cfg, bought.state, 'not_today', late)).toBeNull();
    expect(M.refreshDailyShop(cfg, bought.state, late)).toBe(bought.state);
    const next = M.refreshDailyShop(cfg, bought.state, midnight);
    expect(next.dailyShop.day).not.toBe(bought.state.dailyShop.day);
    expect(next.dailyShop.bought).toEqual([]);
    // Winding the clock back to yesterday is not a new day.
    expect(M.refreshDailyShop(cfg, next, T0)).toBe(next);
  });
});

// ---------------------------------------------------------------- sessions and hints

describe('sessions', () => {
  it('first boot counts; 29 minutes away does not, 31 does', () => {
    const s = M.registerSession(fresh(), T0);
    expect(s.stats.sessions).toBe(1);
    const saved = { ...s, lastSavedAt: T0 };
    expect(M.registerSession(saved, T0 + 29 * MIN)).toBe(saved);
    expect(M.registerSession(saved, T0 + 31 * MIN).stats.sessions).toBe(2);
    expect(M.registerSession(saved, T0 - DAY)).toBe(saved);
  });
});

describe('hints', () => {
  const plain = parse({}, { missions: { slots: 3, perDay: 10, templates: [], milestones: [] }, freeChest: undefined });
  const runFor = (c: GameConfig, s: GameState, seconds: number) => {
    for (let t = 0; t < seconds * 10; t++) s = E.tick(c, s, 0.1, T0);
    return s;
  };

  it('walks a brand-new sim player through tap, bell, buy and hire', () => {
    let s = fresh(plain);
    const seen: string[] = [];
    const note = (h: M.Hint | null) => {
      const k = h ? h.kind : 'none';
      if (seen.at(-1) !== k) seen.push(k);
      return h;
    };
    expect(note(M.nextHint(plain, s, T0))).toEqual({ kind: 'tapStation', businessId: 'drill' });
    s = E.startBusiness(s, 'a', 'drill');
    s = runFor(plain, s, 1);
    expect(note(M.nextHint(plain, s, T0))).toEqual({ kind: 'bell' });
    // Play the manual loop as the hints say until something can be bought.
    for (let i = 0; i < 400 && s.stats.levelsBought === 0; i++) {
      const h = note(M.nextHint(plain, s, T0));
      if (h?.kind === 'tapStation') s = E.startBusiness(s, 'a', h.businessId);
      else if (h?.kind === 'bell') s = E.ringVenueBell(s, 'a');
      else if (h?.kind === 'buyBusiness') s = E.buyBusiness(plain, s, 'a', h.businessId, 1);
      s = runFor(plain, s, 1);
    }
    expect(seen.slice(0, 2)).toEqual(['tapStation', 'bell']);
    expect(seen).toContain('buyBusiness');
    expect(s.stats.levelsBought).toBe(1);
    // With enough cash for the hire, the hire comes first.
    const hire = { ...s, cash: E.managerCost(plain, 'a', 'drill') };
    expect(M.nextHint(plain, hire, T0)).toEqual({ kind: 'hireBusiness', businessId: 'drill' });
    const hired = E.hireManager(plain, hire, 'a', 'drill');
    expect(M.nextHint(plain, { ...hired, cash: E.transportManagerCost(plain, 'a') }, T0)).toEqual({ kind: 'hireTransport' });
  });

  it('claims and chests come first; a veteran gets nothing', () => {
    const s = M.refreshMissions(cfg, fresh(), T0);
    const done = finishEverything(s);
    expect(M.nextHint(cfg, done, T0)).toEqual({ kind: 'claimMission', index: 0 });
    expect(M.nextHint(plain, M.grantChest(plain, fresh(plain), 'plain'), T0)).toEqual({ kind: 'openChest' });
    let vet = { ...fresh(plain), cash: 1e6 };
    vet = E.hireTransportManager(plain, vet, 'a');
    vet = { ...vet, stats: { ...vet.stats, playSeconds: M.HINT_VETERAN_SECONDS } };
    expect(M.nextHint(plain, vet, T0)).toBeNull();
    expect(M.nextHint(plain, { ...fresh(plain), prestigeCount: 1 }, T0)).toBeNull();
    // Early on, automation alone is not enough to stop helping.
    expect(M.nextHint(plain, { ...vet, stats: { ...vet.stats, playSeconds: 10 } }, T0)).not.toBeNull();
  });

  it('classic mode: tap, then buy, then hire', () => {
    const c = GameConfigSchema.parse({ ...baseRaw, mode: 'classic', sim: undefined });
    const s = fresh(c);
    expect(M.nextHint(c, s, T0)).toEqual({ kind: 'tapStation', businessId: 'drill' });
    const running = E.startBusiness(s, E.MAIN_VENUE, 'drill');
    expect(M.nextHint(c, { ...running, cash: 100 }, T0)).toEqual({ kind: 'buyBusiness', businessId: 'drill' });
    expect(M.nextHint(c, { ...running, cash: 1000 }, T0)).toEqual({ kind: 'hireBusiness', businessId: 'drill' });
  });
});

// ---------------------------------------------------------------- identity

describe('nothing changes, nothing is copied', () => {
  it('returns the same state object for every no-op', () => {
    const s = M.refreshMissions(cfg, M.refreshDailyShop(cfg, M.refreshDeals(cfg, M.startFreeChestTimer(cfg, M.registerSession(fresh(), T0), T0), T0), T0), T0);
    const later = T0 + 5 * MIN;
    expect(M.refreshDeals(cfg, s, later)).toBe(s);
    expect(M.refreshDailyShop(cfg, s, later)).toBe(s);
    expect(M.refreshMissions(cfg, s, later)).toBe(s);
    expect(M.refreshMissions(cfg, s)).toBe(s);
    expect(M.startFreeChestTimer(cfg, s, later)).toBe(s);
    expect(M.claimFreeChest(cfg, s, later)).toBe(s);
    expect(M.registerSession(s, later)).toBe(s);
    expect(M.grantChest(cfg, s, 'missing')).toBe(s);
    expect(M.buyChest(cfg, s, 'plain')).toBe(s);
    expect(M.markDealSeen(s, 'unknown')).toBe(s);
    expect(M.markDealSeen(M.markDealSeen(s, 'd_always'), 'd_always').deals.d_always.seen).toBe(true);
    const ad = M.grantAdChest(cfg, s, later);
    expect(M.grantAdChest(cfg, ad, later + MIN)).toBe(ad);
    expect(M.levelUpCard(cfg, s, 'c1')).toBe(s);
  });
});
