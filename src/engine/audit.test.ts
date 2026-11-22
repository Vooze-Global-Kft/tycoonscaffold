/// <reference types="node" />
/**
 * Second-line audit (docs/design/audit.md): exploits a free-stuff hunter would try against the meta
 * layer, and the truth of the drop-rate screen. Each exploit test failed before its fix.
 * Own fixture configs, so content changes cannot break these tests.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { GameConfigSchema, RARITIES, type GameConfig, type Rarity } from '../config/schema';
import * as E from './economy';
import * as M from './meta';
import type { GameState } from './types';

const baseGame = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/base-game.json'), 'utf8'));
const pizzaRaw = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../games/pizza-empire/game.json'), 'utf8'));

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
const one = { common: [1, 1], rare: [1, 1], epic: [1, 1], legendary: [1, 1] };
const chest = (id: string, extra: Record<string, unknown> = {}) => ({
  id, name: id, icon: '📦', slots: 3,
  slotWeights: { card: 60, gems: 20, cash: 20 },
  rarityWeights: { common: 74, rare: 20, epic: 5, legendary: 1 },
  cardCopies: one, gems: [2, 5], cashSeconds: [30, 60],
  ...extra,
});
const metaRaw = {
  cards,
  chests: [
    chest('plain'),
    chest('other', { slots: 2 }),
    chest('cardsonly', { slotWeights: { card: 1, gems: 0, cash: 0 } }),
    chest('crate', { slots: 4, slotWeights: { card: 85, gems: 5, cash: 10 }, rarityWeights: { common: 60, rare: 30, epic: 8, legendary: 2 }, guaranteed: 'rare' }),
  ],
  freeChest: { chestId: 'plain', everyHours: 4, stored: 2, firstMinutes: [15, 60] },
  adChest: { chestId: 'plain', perDay: 3, cooldownMinutes: 120 },
  pity: {},
  missions: {
    slots: 3, perDay: 10,
    templates: [
      { id: 'taps_a', type: 'taps', text: 'Tap {n}', targets: [10, 25], reward: { type: 'gems', amount: 2 } },
      { id: 'earn_a', type: 'earn', text: 'Earn {n}', targets: [30], reward: { type: 'gems', amount: 3 } },
      { id: 'levels_a', type: 'levels', text: 'Buy {n}', targets: [3], reward: { type: 'gems', amount: 2 } },
    ],
    milestones: [],
  },
  deals: [
    { id: 'd_always', title: 'Shelf', contents: [{ type: 'gems', amount: 10 }], gemCost: 50, trigger: { type: 'always' }, maxPurchases: 2 },
    { id: 'd_timed', title: 'Timed', contents: [{ type: 'gems', amount: 10 }], gemCost: 5, trigger: { type: 'always' }, durationHours: 48 },
  ],
  dailyShop: {
    slots: 2,
    offers: [
      { id: 'free_card', title: 'Free card', reward: { type: 'randomCard', rarity: 'common', copies: 1 }, gemCost: 0 },
      { id: 'p1', title: 'P1', reward: { type: 'card', cardId: 'c1', copies: 5 }, gemCost: 10 },
    ],
  },
};
const baseRaw = {
  ...baseGame,
  economy: {
    startingCash: 0,
    prestige: { threshold: 1e12, scale: 1, bonusPerPoint: 0.02 },
    offline: { maxHours: 4, efficiency: 0.5, minSecondsToShow: 60 },
    boost: { multiplier: 2, minutesPerAd: 30, maxMinutes: 240 },
    daily: { gems: [5, 5, 10] },
    timeWarp: { hours: 1, gemCost: 25 },
  },
  story: [],
  monetization: { ads: {}, iap: { products: [] } },
};
const parse = (meta: Record<string, unknown> = {}): GameConfig => GameConfigSchema.parse({ ...baseRaw, mode: 'classic', sim: undefined, meta: { ...metaRaw, ...meta } });
const cfg = parse();
const fresh = (c: GameConfig = cfg, now = T0): GameState => E.createInitialState(c, now);
const rarityOf = (c: GameConfig, id: string): Rarity => c.meta.cards.find((x) => x.id === id)!.rarity;
/** What a chest gave, without what depends on the rest of the state (isNew, cash amount). */
const signature = (rewards: M.GrantedReward[]) =>
  rewards.map((g) => (g.type === 'card' ? `card:${g.cardId}x${g.copies}` : g.type === 'gems' ? `gems:${g.amount}` : g.type));

// ---------------------------------------------------------------- exploits

describe('audit: the daily gift cannot be farmed with the clock', () => {
  it('moving the clock back a day and forward again gives nothing', () => {
    const s = E.claimDaily(cfg, fresh(), T0 + DAY);
    expect(s.gems).toBe(5);
    expect(E.canClaimDaily(s, T0)).toBe(false);
    expect(E.claimDaily(cfg, s, T0)).toBe(s);
    expect(E.claimDaily(cfg, s, T0 + DAY + HOUR)).toBe(s);
    // The real next day still pays, and the streak continues.
    const next = E.claimDaily(cfg, s, T0 + 2 * DAY);
    expect(next.gems).toBe(10);
    expect(next.daily.streak).toBe(2);
  });
});

describe('audit: a chest cannot be re-rolled', () => {
  const owned = (s: GameState) => M.grantChest(cfg, M.grantChest(cfg, s, 'plain', 1), 'other', 1);

  it('is the same after a reload, whatever was done before opening it', () => {
    const s = owned(fresh());
    const direct = signature(M.openChest(cfg, s, 'plain', T0)!.rewards);
    // Reload from disk.
    const reloaded = E.reconcileState(cfg, JSON.parse(JSON.stringify(s)), T0);
    expect(signature(M.openChest(cfg, reloaded, 'plain', T0)!.rewards)).toEqual(direct);
    // Open another chest type first (no protection in this config, so nothing links them).
    const afterOther = M.openChest(cfg, s, 'other', T0)!.state;
    expect(signature(M.openChest(cfg, afterOther, 'plain', T0)!.rewards)).toEqual(direct);
    // Claim today's free random card first (it also uses the random numbers).
    const shop = M.refreshDailyShop(cfg, s, T0);
    const afterFree = M.buyDailyOffer(cfg, shop, 'free_card', T0)!.state;
    expect(signature(M.openChest(cfg, afterFree, 'plain', T0)!.rewards)).toEqual(direct);
  });

  it('two players (or a reinstall) still get different chests', () => {
    let differs = false;
    for (let k = 1; k < 30 && !differs; k++) {
      const a = signature(M.openChest(cfg, owned(fresh(cfg, T0)), 'plain', T0)!.rewards);
      const b = signature(M.openChest(cfg, owned(fresh(cfg, T0 + k)), 'plain', T0)!.rewards);
      differs = a.join() !== b.join();
    }
    expect(differs).toBe(true);
  });
});

describe('audit: hostile or broken saves', () => {
  const broken = () => {
    const s = JSON.parse(JSON.stringify(M.refreshMissions(cfg, fresh(), T0)));
    s.missions.slots = [null, { templateId: 'taps_a', target: 'x', start: -5 }, 7, { templateId: 'earn_a', target: 1e400, start: NaN }];
    s.missions.completed = { taps_a: 'x', earn_a: -3, gone: 2 };
    s.deals = { d_always: { startedAt: 0, purchases: -5, seen: 'no' }, d_timed: { startedAt: 'x', endsAt: 'never', purchases: 0, seen: true } };
    s.stats.venuesEver = 1e300;
    s.dailyShop = { day: '2026-01-10', offerIds: ['p1', 'p1', 5], bought: [null] };
    return s;
  };

  it('missions load as valid slots and never crash', () => {
    const r = E.reconcileState(cfg, broken(), T0);
    expect(() => M.missionViews(cfg, r)).not.toThrow();
    for (const sl of r.missions.slots) {
      expect(typeof sl.templateId).toBe('string');
      expect(Number.isFinite(sl.target) && sl.target >= 1).toBe(true);
      expect(Number.isFinite(sl.start) && sl.start >= 0).toBe(true);
    }
    for (const n of Object.values(r.missions.completed)) expect(Number.isInteger(n) && n >= 0).toBe(true);
    expect(() => M.refreshMissions(cfg, r, T0)).not.toThrow();
  });

  it('a deal cannot be bought more often than its limit by editing the counter', () => {
    const r = E.reconcileState(cfg, broken(), T0);
    for (const v of M.activeDeals(cfg, r, T0)) expect(v.purchasesLeft).toBeLessThanOrEqual(v.deal.maxPurchases);
    const timed = r.deals.d_timed;
    // A broken start time cannot make a timed offer permanent.
    expect(timed === undefined || (typeof timed.endsAt === 'number' && Number.isFinite(timed.endsAt))).toBe(true);
  });

  it('copies cannot be blown up through the venue counter, and the daily shop holds no duplicates', () => {
    const r = E.reconcileState(cfg, broken(), T0);
    expect(M.chestRules(cfg, r, 'plain')!.copiesMultiplier).toBeLessThanOrEqual(1 + cfg.meta.chestGrowthPerVenue * (E.venueIds(cfg).length - 1));
    expect(new Set(r.dailyShop.offerIds).size).toBe(r.dailyShop.offerIds.length);
    expect(r.dailyShop.offerIds.every((id) => typeof id === 'string')).toBe(true);
    expect(r.dailyShop.bought.every((id) => typeof id === 'string')).toBe(true);
  });
});

describe('audit: odd configs', () => {
  it('a chest whose only slots are cards, in a game with no cards, opens without crashing', () => {
    const none = parse({ cards: [] });
    const s = M.grantChest(none, fresh(none), 'cardsonly', 1);
    let r: ReturnType<typeof M.openChest> = null;
    expect(() => (r = M.openChest(none, s, 'cardsonly', T0))).not.toThrow();
    expect(r!.rewards.length).toBe(3);
    expect(r!.rewards.every((g) => g.type === 'gems')).toBe(true);
    // ...and the drop-rate screen says so.
    expect(M.chestSlotOdds(none, 'cardsonly')).toEqual({ card: 0, gems: 100, cash: 0 });
  });

  it('a free chest pointing at a missing chest is never shown as ready', () => {
    const c = parse({ freeChest: { chestId: 'nope', everyHours: 4, stored: 2, firstMinutes: [0] } });
    const s = M.startFreeChestTimer(c, fresh(c), T0);
    expect(M.freeChestStatus(c, s, T0 + DAY)).toBeNull();
    expect(M.nextHint(c, s, T0 + DAY)?.kind).not.toBe('openChest');
  });

  it('an ad chest pointing at a missing chest is not offered', () => {
    const c = parse({ adChest: { chestId: 'nope', perDay: 3, cooldownMinutes: 0 } });
    expect(M.adChestStatus(c, fresh(c), T0)).toBeNull();
  });

  it('no chests, no cards, a single mission template: everything still runs', () => {
    const bare = parse({ cards: [], chests: [], freeChest: undefined, adChest: undefined, missions: { slots: 3, perDay: 10, templates: [metaRaw.missions.templates[0]], milestones: [] }, deals: [], dailyShop: { slots: 3, offers: [] } });
    let s = M.refreshMissions(bare, M.refreshDailyShop(bare, fresh(bare), T0), T0);
    expect(s.missions.slots).toHaveLength(1);
    s = { ...s, stats: { ...s.stats, taps: 10 } };
    const r = M.claimMission(bare, s, 0, T0)!;
    expect(r.state.gems).toBe(2);
    expect(r.state.missions.slots).toHaveLength(1);
    expect(M.chestCardOdds(bare, 'x').every((o) => o.percent === 0)).toBe(true);
    expect(M.nextHint(bare, r.state, T0)).not.toThrow;
  });
});

describe('audit: claims are exactly once', () => {
  it('claiming twice, at the same millisecond, gives one reward', () => {
    let s = M.refreshMissions(cfg, fresh(), T0);
    s = { ...s, stats: { ...s.stats, taps: 100 } };
    const i = M.missionViews(cfg, s).find((v) => v.templateId === 'taps_a')!.index;
    const once = M.claimMission(cfg, s, i, T0)!;
    expect(M.claimMission(cfg, once.state, i, T0)?.state.gems ?? once.state.gems).toBe(once.state.gems);

    const timer = M.startFreeChestTimer(cfg, fresh(), T0);
    const at = T0 + 15 * MIN; // the exact millisecond the first one is ready
    const c1 = M.claimFreeChest(cfg, timer, at);
    expect(M.chestCount(c1)).toBe(1);
    expect(M.claimFreeChest(cfg, c1, at)).toBe(c1);

    const shop = M.refreshDailyShop(cfg, fresh(), T0);
    const b1 = M.buyDailyOffer(cfg, shop, 'free_card', T0)!.state;
    expect(M.buyDailyOffer(cfg, b1, 'free_card', T0)).toBeNull();
    expect(M.buyDailyOffer(cfg, b1, 'free_card', T0 - DAY)).toBeNull();
  });

  it('gems never go negative and spent limits hold', () => {
    const s = { ...M.refreshDeals(cfg, fresh(), T0), gems: 49 };
    expect(M.buyDealWithGems(cfg, s, 'd_always', T0)).toBeNull();
    let rich = { ...s, gems: 1000 };
    rich = M.buyDealWithGems(cfg, rich, 'd_always', T0)!.state;
    rich = M.buyDealWithGems(cfg, rich, 'd_always', T0)!.state;
    expect(M.buyDealWithGems(cfg, rich, 'd_always', T0)).toBeNull();
    expect(M.buyDealWithGems(cfg, rich, 'd_timed', T0 + 48 * HOUR)).toBeNull();
    expect(M.levelUpCard(cfg, M.applyReward(cfg, rich, { type: 'card', cardId: 'c1', copies: 2 }, T0).state, 'c1').cards.c1.level).toBe(1);
  });
});

describe('audit: chests for sale only where allowed', () => {
  it('paid offers containing a chest are refused where chest sales are not allowed', () => {
    const chestOffer = [{ type: 'chest' as const, chestId: 'plain', count: 1 }];
    const gemsOffer = [{ type: 'gems' as const, amount: 5 }];
    expect(M.offerAllowed(cfg, 'DE', chestOffer, true)).toBe(false); // chestsForSale is off
    expect(M.offerAllowed(cfg, 'DE', chestOffer, false)).toBe(true); // a free chest is fine
    expect(M.offerAllowed(cfg, null, gemsOffer, true)).toBe(true);
    const selling = parse({ chestsForSale: true });
    expect(M.offerAllowed(selling, 'DE', chestOffer, true)).toBe(true);
    expect(M.offerAllowed(selling, 'BE', chestOffer, true)).toBe(false);
    expect(M.offerAllowed(selling, null, chestOffer, true)).toBe(false);
  });
});

// ---------------------------------------------------------------- truth of the odds

describe('audit: the drop-rate facts are exact', () => {
  /** Opens n chests of one id from a fresh player and counts what came out. */
  function sample(c: GameConfig, chestId: string, n: number) {
    let s = M.grantChest(c, fresh(c), chestId, n);
    const perCard: Record<Rarity, number> = { common: 0, rare: 0, epic: 0, legendary: 0 };
    const atLeast: Record<Rarity, number> = { common: 0, rare: 0, epic: 0, legendary: 0 };
    let cardsN = 0;
    for (let i = 0; i < n; i++) {
      const r = M.openChest(c, s, chestId, T0)!;
      let best = -1;
      for (const g of r.rewards) {
        if (g.type !== 'card') continue;
        const k = RARITIES.indexOf(rarityOf(c, g.cardId));
        perCard[RARITIES[k]]++;
        cardsN++;
        best = Math.max(best, k);
      }
      for (let k = 0; k <= best; k++) atLeast[RARITIES[k]]++;
      s = { ...r.state, cards: {} };
    }
    return { perCard, atLeast, cardsN };
  }

  it('per-chest and per-card odds match 60,000 opens, guarantee included (no protection)', () => {
    const facts = M.chestOddsFacts(cfg, 'crate', null)!;
    const N = 60_000;
    const got = sample(cfg, 'crate', N);
    for (const r of RARITIES) {
      expect(Math.abs((got.atLeast[r] / N) * 100 - facts.perChest.find((x) => x.rarity === r)!.atLeastPercent)).toBeLessThan(0.5);
      expect(Math.abs((got.perCard[r] / got.cardsN) * 100 - facts.perCard.find((x) => x.rarity === r)!.percent)).toBeLessThan(0.5);
    }
    expect(Math.abs(got.cardsN / N - facts.cardsPerChest)).toBeLessThan(0.02);
    // The guarantee makes real per-card shares differ from the base odds: the screen must say so.
    const base = M.chestCardOdds(cfg, 'crate');
    expect(facts.perCard.find((x) => x.rarity === 'common')!.percent).toBeLessThan(base[0].percent - 1);
  }, 60_000);

  it('long-run odds with bad-luck protection match 60,000 opens', () => {
    const c = parse({ pity: { epic: 10, legendary: 40 } });
    const facts = M.chestOddsFacts(c, 'plain', null)!;
    const N = 60_000;
    const got = sample(c, 'plain', N);
    for (const r of RARITIES) {
      expect(Math.abs((got.atLeast[r] / N) * 100 - facts.longRun!.find((x) => x.rarity === r)!.atLeastPercent)).toBeLessThan(0.5);
    }
    // Protection really raises the epic and legendary rates above the plain roll.
    expect(facts.longRun!.find((x) => x.rarity === 'legendary')!.atLeastPercent).toBeGreaterThan(facts.perChest.find((x) => x.rarity === 'legendary')!.atLeastPercent);
  }, 60_000);

  it('the next-chest odds follow the player counters, up to a certainty at the limit', () => {
    const c = parse({ pity: { epic: 10, legendary: 40 } });
    const s = fresh(c);
    const at = (sinceEpic: number) => M.chestOddsFacts(c, 'plain', { ...s, chests: { ...s.chests, sinceEpic } })!.nextChest!;
    expect(at(9).find((x) => x.rarity === 'epic')!.atLeastPercent).toBeCloseTo(at(9).find((x) => x.rarity === 'common')!.atLeastPercent, 9);
    expect(at(0).find((x) => x.rarity === 'epic')!.atLeastPercent).toBeLessThan(20);
  });

  it('every line of text is backed by a number from the config', () => {
    const c = GameConfigSchema.parse(pizzaRaw);
    for (const ch of c.meta.chests) {
      const facts = M.chestOddsFacts(c, ch.id, null)!;
      expect(facts.lines.length).toBeGreaterThan(3);
      const sum = facts.perCard.reduce((a, x) => a + x.percent, 0);
      expect(sum).toBeCloseTo(100, 6);
    }
  });
});

// ---------------------------------------------------------------- engine gaps (critique-fun.md)

describe('audit: missions only ask for what the player can already do', () => {
  const pizza = GameConfigSchema.parse(pizzaRaw);
  const types = (c: GameConfig, s: GameState) => M.missionViews(c, s).map((v) => c.meta.missions.templates.find((t) => t.id === v.templateId)!.type);

  it('no rush mission before a transport hire, no chest mission before a chest', () => {
    let s = fresh(pizza);
    for (let k = 0; k < 40; k++) {
      // Complete whatever is offered, many times over, and look at every refill.
      s = M.refreshMissions(pizza, s, T0 + k);
      expect(types(pizza, s)).not.toContain('rush');
      expect(types(pizza, s)).not.toContain('chests');
      s = { ...s, missions: { ...s.missions, slots: [], doneToday: 0 } };
    }
    const v = s.activeVenue;
    const hired = { ...s, venues: { ...s.venues, [v]: { ...s.venues[v], chain: { ...s.venues[v].chain!, transportManaged: true } } } };
    const withChest = M.grantChest(pizza, hired, pizza.meta.chests[0].id, 1);
    const seen = new Set<string>();
    let t = withChest;
    for (let k = 0; k < 40; k++) {
      t = M.refreshMissions(pizza, t, T0 + k);
      for (const x of types(pizza, t)) seen.add(x);
      t = { ...t, missions: { ...t.missions, slots: [], doneToday: 0, completed: { ...t.missions.completed, ...Object.fromEntries(t.missions.slots.map((sl) => [sl.templateId, (t.missions.completed[sl.templateId] ?? 0) + 1])) } } };
    }
    expect(seen.has('rush')).toBe(true);
    expect(seen.has('chests')).toBe(true);
  });
});

describe('audit: the 2-second refreshes do nothing when nothing changed', () => {
  it('return the same object', () => {
    const pizza = GameConfigSchema.parse(pizzaRaw);
    for (const c of [cfg, pizza]) {
      const now = T0 + 5 * MIN;
      const s = M.refreshMissions(c, M.refreshDailyShop(c, M.refreshDeals(c, fresh(c), now), now), now);
      expect(M.refreshDeals(c, s, now + 2000)).toBe(s);
      expect(M.refreshDailyShop(c, s, now + 2000)).toBe(s);
      expect(M.refreshMissions(c, s, now + 2000)).toBe(s);
      expect(M.refreshMissions(c, s)).toBe(s);
    }
  });
});

describe('audit: the daily gift row is what a claim pays', () => {
  it('cycles the table and never resets on a missed day', () => {
    let s = fresh();
    const table = cfg.economy.daily.gems;
    let t = T0;
    for (let n = 1; n <= table.length * 2 + 1; n++) {
      const row = E.dailyCalendar(cfg, s, t);
      const today = row.find((d) => d.today)!;
      const before = s.gems;
      s = E.claimDaily(cfg, s, t);
      expect(s.gems - before).toBe(today.gems);
      expect(today.claim).toBe(n);
      t += n % 3 === 0 ? 3 * DAY : DAY; // skip days now and then
    }
    expect(s.daily.streak).toBe(table.length * 2 + 1);
  });
});

describe('audit: offline earnings cannot be farmed by moving the clock back and forth', () => {
  it('pays the time ahead once, not again after winding back', () => {
    const c = GameConfigSchema.parse(pizzaRaw);
    let s = { ...fresh(c), cash: 1e6 };
    s = E.buyBusiness(c, s, s.activeVenue, c.businesses[0].id, 20);
    s = E.hireManager(c, s, s.activeVenue, c.businesses[0].id);
    s = E.hireTransportManager(c, s, s.activeVenue);
    // Played until T0 and saved.
    s = { ...s, lastSavedAt: T0 };
    // Clock forward 4 hours: the offline popup pays 4 hours (fine: it may really have been 4 hours).
    const ahead = T0 + 4 * HOUR;
    s = E.clampClock(c, s, ahead);
    expect(E.computeOffline(c, s, ahead).seconds).toBe(4 * 3600);
    s = { ...s, lastSavedAt: ahead }; // collected and saved
    // Back to the real time, then forward again: nothing more.
    s = E.clampClock(c, s, T0 + MIN);
    expect(E.computeOffline(c, s, T0 + MIN).seconds).toBe(0);
    s = { ...s, lastSavedAt: T0 + MIN };
    s = E.clampClock(c, s, ahead + MIN);
    expect(E.computeOffline(c, s, ahead + MIN).seconds).toBeCloseTo(60, 6);
  });
});

describe('audit: more clock and spending tricks', () => {
  it('the ad chest, the daily shop and the mission limit do not reset by moving the clock back and forth', () => {
    let s = fresh();
    for (let i = 0; i < 3; i++) s = M.grantAdChest(cfg, s, T0 + i * 3 * HOUR);
    expect(M.chestCount(s)).toBe(3);
    // Tomorrow early, then back to today: tomorrow's three are used up, today stays used up.
    let t = s;
    for (let i = 0; i < 3; i++) t = M.grantAdChest(cfg, t, T0 + DAY + i * 3 * HOUR);
    expect(M.chestCount(t)).toBe(6);
    expect(M.grantAdChest(cfg, t, T0 + 10 * HOUR)).toBe(t);
    expect(M.grantAdChest(cfg, t, T0 + DAY + 10 * HOUR)).toBe(t);

    const shop = M.buyDailyOffer(cfg, M.refreshDailyShop(cfg, fresh(), T0 + DAY), 'free_card', T0 + DAY)!.state;
    expect(M.refreshDailyShop(cfg, shop, T0)).toBe(shop);
    expect(M.buyDailyOffer(cfg, shop, 'free_card', T0)).toBeNull();
    expect(M.buyDailyOffer(cfg, shop, 'free_card', T0 + DAY + HOUR)).toBeNull();
  });

  it('no purchase spends gems the player does not have, and nothing opens a chest that is not owned', () => {
    const poor = { ...fresh(), gems: 3 };
    expect(E.buyTimeWarpWithGems(cfg, poor, T0)).toBe(poor);
    expect(M.buyChest(parse({ chestsForSale: true }), poor, 'plain')).toBe(poor);
    expect(M.openChest(cfg, poor, 'plain', T0)).toBeNull();
    expect(M.openChest(cfg, poor, 'nope', T0)).toBeNull();
    expect(M.openChest(cfg, { ...poor, chests: { ...poor.chests, owned: { plain: 0.5 } } }, 'plain', T0)).toBeNull();
    // A hostile save with a fractional or negative chest count loads as whole chests.
    const r = E.reconcileState(cfg, { ...poor, chests: { ...poor.chests, owned: { plain: 2.7, other: -4 } } }, T0);
    expect(r.chests.owned).toEqual({ plain: 2 });
  });

  it('huge counters stay finite', () => {
    const r = E.reconcileState(cfg, { ...fresh(), gems: 1e308, cash: 1e308, stats: { ...fresh().stats, taps: 1e308 } }, T0);
    const s = E.claimDaily(cfg, r, T0);
    expect(Number.isFinite(s.gems)).toBe(true);
    const m = M.refreshMissions(cfg, s, T0);
    expect(M.missionViews(cfg, m).every((v) => Number.isFinite(v.progress) && Number.isFinite(v.target))).toBe(true);
  });
});
