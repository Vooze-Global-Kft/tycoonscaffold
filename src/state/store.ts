/**
 * The game store: one zustand store holding the config, the engine state and
 * the few bits of UI state that several screens share.
 *
 * Every action here is "engine transition + side effects": it calls a pure
 * engine function, stores the result, then plays feedback (sound and haptics
 * through `fx`), logs analytics and queues celebrations. Screens never call
 * the engine to change state; they call these actions.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { ACTIVE_GAME_ID, applyRemoteOverrides, baseGame, remoteDefaults } from '../config/game';
import type { GameConfig, IapProduct } from '../config/schema';
import * as E from '../engine/economy';
import type { GameEvent } from '../engine/economy';
import { formatNumber } from '../engine/format';
import * as M from '../engine/meta';
import type { GrantedReward } from '../engine/meta';
import type { BuyAmount, GameState } from '../engine/types';
import { ads } from '../services/ads';
import { analytics, crash, fetchRemoteOverrides } from '../services/firebase';
import { fx } from '../services/fx';
import { iap } from '../services/iap';
import { detectRegion } from '../services/region';
import { simEvents } from './events';

const SAVE_KEY = `save:${ACTIVE_GAME_ID}:v1`;

export type Tab = 'home' | 'staff' | 'upgrades' | 'empire' | 'shop';

/** A dialog that more than one screen can open. */
export type Modal =
  | { type: 'missions' }
  | { type: 'settings' }
  | { type: 'chestOdds'; chestId: string }
  | { type: 'card'; cardId: string };

export interface Celebration {
  id: number;
  kind: 'unlock' | 'milestone' | 'hire' | 'bonus' | 'venue' | 'reward';
  title: string;
  subtitle: string;
  icon: string;
}

/** A chest being opened: the UI plays the reveal for `rewards`, then calls closeChest(). */
export interface ChestOpening {
  id: number;
  chestId: string;
  rewards: GrantedReward[];
}

interface Store {
  cfg: GameConfig;
  game: GameState;
  hydrated: boolean;
  buyAmount: BuyAmount;
  tab: Tab;
  modal: Modal | null;
  offline: { seconds: number; earnings: number } | null;
  /** Floating "+$123" numbers; the UI drains them. */
  tapEvents: { id: number; amount: number; x: number; y: number; big?: boolean }[];
  /** Quick taps in a row; drives the combo multiplier. */
  combo: { taps: number; lastTapAt: number };
  /** The flying bonus: when the next one appears, and the one on screen now (if any). */
  bonus: { nextAt: number; activeId: number | null };
  /** Queue of celebration banners (unlocks, milestones, hires, rewards). */
  celebrations: Celebration[];
  chestOpening: ChestOpening | null;
  /** Id of a deal to present once in a popup, or null. */
  dealPopup: string | null;
  /** The player's country (ISO alpha-2) when known. Decides whether chests may be sold: see chestSalesAllowed. */
  region: string | null;

  boot(): Promise<void>;
  tick(dt: number): void;
  save(): Promise<void>;
  setBuyAmount(a: BuyAmount): void;
  setTab(t: Tab): void;
  openModal(m: Modal): void;
  closeModal(): void;

  // --- tapping ---
  tapHero(x: number, y: number): void;
  spawnBonus(): void;
  missBonus(): void;
  collectBonus(x: number, y: number): void;
  dismissCelebration(): void;
  consumeTapEvent(id: number): void;

  // --- businesses / stations (in the venue on screen) ---
  startBusiness(id: string): void;
  buy(id: string): void;
  hire(id: string): void;
  buyUpgrade(id: string): void;

  // --- sim mode ---
  buyTransport(): void;
  buySales(): void;
  hireTransportManager(): void;
  ringBell(): void;
  unlockVenue(venueId: string): void;
  setVenue(venueId: string): void;
  startRush(): void;
  /** Watch a rewarded ad to make the rush skill ready again. */
  adResetRush(): Promise<void>;

  // --- cards, chests, missions, deals ---
  levelUpCard(cardId: string): void;
  openChest(chestId: string): void;
  closeChest(): void;
  claimFreeChest(): void;
  watchAdChest(): Promise<void>;
  buyChest(chestId: string): void;
  claimMission(index: number): void;
  buyDeal(dealId: string): Promise<void>;
  dismissDealPopup(): void;
  buyDailyOffer(offerId: string): void;

  // --- the rest ---
  prestige(): void;
  collectOffline(doubled: boolean): Promise<void>;
  watchBoostAd(): Promise<void>;
  claimDaily(): void;
  gemTimeWarp(): void;
  dismissStory(): void;
  purchase(product: IapProduct): Promise<void>;
  restorePurchases(): Promise<number>;
  /** Dev only: wipe the save. */
  reset(): Promise<void>;
}

let tapSeq = 0;
let celebrationSeq = 0;
let chestSeq = 0;
/** Seconds since the last housekeeping pass (deals, daily shop, missions). */
let houseClock = 0;
let rushWasActive = false;
let leaveCount = 0;
/** At most one deal popup per session, and none in the very first session. */
let dealPopupShown = false;
/** Reused every tick so the 10 Hz loop allocates as little as possible. */
const tickEvents: GameEvent[] = [];

function nextBonusAt(cfg: GameConfig, now: number) {
  const { minSec, maxSec } = cfg.economy.bonus;
  return now + (minSec + Math.random() * Math.max(0, maxSec - minSec)) * 1000;
}

/** The quiet soundscape of the venue on screen. Never vibrates: the player did not cause these. */
function playSimSounds(events: readonly GameEvent[]) {
  const quiet = { haptic: false } as const;
  for (const e of events) {
    switch (e.type) {
      case 'cycle':
        fx.play('cook_done', quiet);
        fx.play('toss', quiet);
        break;
      case 'load':
        fx.play('pickup', quiet);
        break;
      case 'unload':
        fx.play('serve', quiet);
        break;
      case 'arrive':
        fx.play('door', quiet);
        break;
      case 'pay':
        fx.play('cash', quiet);
        fx.play('coin', quiet);
        break;
      case 'leave':
        if (++leaveCount % 3 === 0) fx.play('happy', quiet);
        break;
    }
  }
}

export const useGame = create<Store>((set, get) => {
  const syncAds = (game: GameState) => {
    ads.noAds = game.entitlements.noAds;
    ads.skipRewarded = game.entitlements.skipRewarded;
  };

  /** Apply an engine transition and keep ads in sync with entitlements. */
  const update = (fn: (s: GameState, cfg: GameConfig) => GameState) => {
    const { game, cfg } = get();
    const next = fn(game, cfg);
    if (next !== game) {
      syncAds(next);
      set({ game: next });
    }
    return next;
  };

  const celebrate = (c: Omit<Celebration, 'id'>) =>
    set({ celebrations: [...get().celebrations.slice(-3), { ...c, id: ++celebrationSeq }] });

  /** One banner per granted reward (chests are not announced here: opening them is the announcement). */
  const celebrateRewards = (granted: GrantedReward[]) => {
    const { cfg } = get();
    for (const g of granted) {
      if (g.type === 'gems' && g.amount > 0) {
        celebrate({ kind: 'reward', title: `+${formatNumber(g.amount)} ${cfg.strings.gemName}`, subtitle: 'Reward', icon: cfg.strings.gemIcon });
      } else if (g.type === 'cash') {
        celebrate({ kind: 'reward', title: `+${cfg.strings.currencySymbol}${formatNumber(g.amount)}`, subtitle: 'Reward', icon: cfg.strings.currencyIcon });
      } else if (g.type === 'card') {
        const card = cfg.meta.cards.find((c) => c.id === g.cardId);
        if (card) celebrate({ kind: 'reward', title: `${card.name} ×${g.copies}`, subtitle: g.isNew ? 'New card!' : 'Card copies', icon: card.icon });
      } else if (g.type === 'chest') {
        const chest = cfg.meta.chests.find((c) => c.id === g.chestId);
        if (chest) celebrate({ kind: 'reward', title: `${chest.name}${g.count > 1 ? ` ×${g.count}` : ''}`, subtitle: 'Chest earned', icon: chest.icon });
      }
    }
  };

  /** Deals, the daily shop and missions depend on the clock and on progress; refresh them now and then. */
  const housekeeping = () => {
    const now = Date.now();
    const game = update((s, cfg) => M.refreshMissions(cfg, M.refreshDailyShop(cfg, M.refreshDeals(cfg, s, now), now)));
    const canPop = !dealPopupShown && game.stats.sessions >= 2 && get().dealPopup === null && get().chestOpening === null && get().offline === null;
    if (canPop && E.pendingStoryBeat(get().cfg, game) === null) {
      const { cfg, region } = get();
      const deal = M.dealToShow(cfg, game, now);
      // Where chests may not be sold, an offer containing one is never shown.
      if (deal && (M.chestSalesAllowed(cfg, region) || !M.containsChest(deal.contents))) {
        dealPopupShown = true;
        set({ dealPopup: deal.id });
        fx.play('deal_popup');
        analytics.log('deal_shown', { deal_id: deal.id });
      }
    }
  };

  const openChestNow = (chestId: string) => {
    const { cfg, game } = get();
    const result = M.openChest(cfg, game, chestId, Date.now());
    if (!result) return fx.play('ui_denied');
    syncAds(result.state);
    set({ game: result.state, chestOpening: { id: ++chestSeq, chestId, rewards: result.rewards } });
    analytics.log('chest_open', { chest_id: chestId });
    get().save();
  };

  return {
    cfg: baseGame,
    game: E.createInitialState(baseGame, Date.now()),
    hydrated: false,
    buyAmount: 1,
    tab: 'home',
    modal: null,
    offline: null,
    tapEvents: [],
    combo: { taps: 0, lastTapAt: 0 },
    bonus: { nextAt: nextBonusAt(baseGame, Date.now()), activeId: null },
    celebrations: [],
    chestOpening: null,
    dealPopup: null,
    region: null,

    async boot() {
      const now = Date.now();
      let game = E.createInitialState(baseGame, now);
      let returning = false;
      try {
        const raw = await AsyncStorage.getItem(SAVE_KEY);
        if (raw) {
          game = E.reconcileState(baseGame, JSON.parse(raw));
          returning = true;
        }
      } catch (e) {
        crash.record(e, 'load-save');
      }

      // Remote Config, ads and IAP in parallel; none of them may block play.
      const [overrides] = await Promise.all([
        Promise.race([fetchRemoteOverrides(remoteDefaults(baseGame)), new Promise<{}>((r) => setTimeout(() => r({}), 2500))]),
        iap.init(),
      ]);
      const cfg = applyRemoteOverrides(baseGame, overrides);
      ads.firstInterstitialAfterSec = cfg.monetization.ads.firstInterstitialAfterSec;
      ads.interstitialCooldownSec = cfg.monetization.ads.interstitialCooldownSec;

      // Re-grant non-consumables the store says this account owns (reinstall, new device).
      for (const id of await iap.owned()) {
        const p = cfg.monetization.iap.products.find((x) => x.id === id);
        if (p && M.isNonConsumable(p)) game = M.applyProduct(cfg, game, p, now).state;
      }
      game = M.startFreeChestTimer(cfg, M.registerSession(game, now), now);
      game = M.refreshMissions(cfg, M.refreshDailyShop(cfg, M.refreshDeals(cfg, game, now), now));

      const offline = returning ? E.computeOffline(cfg, game, now) : null;
      syncAds(game);
      rushWasActive = E.isRushActive(game, now);
      set({
        cfg,
        game: { ...game, lastSavedAt: now },
        hydrated: true,
        offline: offline && offline.seconds >= cfg.economy.offline.minSecondsToShow && offline.earnings > 0 ? offline : null,
      });
      analytics.log(returning ? 'session_resume' : 'first_open_game', { prestige: game.prestigeCount, mode: cfg.mode, session: game.stats.sessions });
      ads.init();
      detectRegion().then((region) => set({ region }));
    },

    tick(dt) {
      const { cfg, game, hydrated } = get();
      if (!hydrated) return;
      const now = Date.now();
      tickEvents.length = 0;
      set({ game: E.tick(cfg, game, dt, now, tickEvents) });
      if (tickEvents.length > 0) {
        if (E.isSim(cfg)) playSimSounds(tickEvents);
        simEvents.emit(tickEvents);
      }
      const rushActive = E.isRushActive(game, now);
      if (rushWasActive && !rushActive) fx.play('rush_end');
      rushWasActive = rushActive;
      houseClock += dt;
      if (houseClock >= 2) {
        houseClock = 0;
        housekeeping();
      }
    },

    async save() {
      const game = { ...get().game, lastSavedAt: Date.now() };
      set({ game });
      try {
        await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(game));
      } catch (e) {
        crash.record(e, 'save');
      }
    },

    setBuyAmount(buyAmount) {
      fx.play('ui_tap');
      set({ buyAmount });
    },
    setTab(tab) {
      if (tab === get().tab) return;
      fx.play('ui_tab');
      set({ tab });
      ads.maybeShowInterstitial('tab_change');
    },
    openModal(modal) {
      fx.play('ui_open');
      set({ modal });
    },
    closeModal() {
      if (get().modal === null) return;
      fx.play('ui_close');
      set({ modal: null });
    },

    // ------------------------------------------------------------ tapping

    tapHero(x, y) {
      const { cfg, game, combo } = get();
      const now = Date.now();
      const taps = now - combo.lastTapAt > cfg.economy.combo.decayMs ? 1 : combo.taps + 1;
      const mult = E.comboMultiplier(cfg, taps);
      const before = E.comboMultiplier(cfg, taps - 1);
      const r = E.tapHero(cfg, game, now, mult);
      // The tap note climbs an eight-step ladder (step 0 is the lowest) as the combo builds towards its maximum.
      const span = cfg.economy.combo.tapsPerLevel * Math.max(1, cfg.economy.combo.maxMultiplier - 1);
      fx.play('tap', { step: Math.min(7, Math.floor((taps / span) * 8)) });
      if (mult > before) fx.play(mult >= cfg.economy.combo.maxMultiplier ? 'combo_max' : 'combo_up');
      const evt = { id: ++tapSeq, amount: r.earned, x, y, big: mult > 1 };
      set({ game: r.state, combo: { taps, lastTapAt: now }, tapEvents: [...get().tapEvents.slice(-15), evt] });
    },
    consumeTapEvent: (id) => set({ tapEvents: get().tapEvents.filter((e) => e.id !== id) }),

    spawnBonus() {
      if (get().bonus.activeId !== null) return;
      fx.play('bonus_appear');
      set({ bonus: { ...get().bonus, activeId: ++tapSeq } });
    },
    missBonus() {
      set({ bonus: { nextAt: nextBonusAt(get().cfg, Date.now()), activeId: null } });
    },
    collectBonus(x, y) {
      const { cfg, game, bonus } = get();
      if (bonus.activeId === null) return;
      const now = Date.now();
      const r = E.collectBonus(cfg, game, now);
      fx.play('bonus_collect');
      set({
        game: r.state,
        bonus: { nextAt: nextBonusAt(cfg, now), activeId: null },
        tapEvents: [...get().tapEvents.slice(-15), { id: ++tapSeq, amount: r.earned, x, y, big: true }],
      });
      celebrate({ kind: 'bonus', title: cfg.economy.bonus.name + '!', subtitle: 'Bonus collected', icon: cfg.theme.icons.bonus });
      analytics.log('bonus_collect', { value: r.earned });
    },
    dismissCelebration: () => set({ celebrations: get().celebrations.slice(1) }),

    // ------------------------------------------------------------ businesses

    startBusiness(id) {
      const before = get().game;
      const next = update((s) => E.startBusiness(s, s.activeVenue, id));
      if (next !== before) fx.play('ui_tap');
    },

    buy(id) {
      const venueId = get().game.activeVenue;
      const before = get().game.venues[venueId].businesses[id].owned;
      const next = update((s, cfg) => E.buyBusiness(cfg, s, venueId, id, get().buyAmount));
      const after = next.venues[venueId].businesses[id].owned;
      if (after === before) return fx.play('ui_denied');
      const cfg = get().cfg;
      const b = cfg.businesses.find((x) => x.id === id)!;
      const crossed = E.previousMilestone(cfg, after) > before;
      if (before === 0) {
        fx.play('unlock');
        analytics.log('unlock_business', { business_id: id, venue: venueId });
        celebrate({ kind: 'unlock', title: b.name, subtitle: E.isSim(cfg) ? 'New station!' : 'New business unlocked!', icon: b.icon });
      } else if (crossed) {
        const level = E.previousMilestone(cfg, after);
        const [m0, m1] = [E.milestoneMults(cfg, before), E.milestoneMults(cfg, after)];
        const perk = m1.speed > m0.speed ? `${formatNumber(m1.speed / m0.speed)}× faster` : `${formatNumber(m1.revenue / m0.revenue)}× profits`;
        fx.play('milestone');
        analytics.log('level_up', { character: id, level, venue: venueId });
        celebrate({ kind: 'milestone', title: `${b.name} ×${level}`, subtitle: perk, icon: b.icon });
      } else {
        fx.play('buy');
      }
    },

    hire(id) {
      const venueId = get().game.activeVenue;
      const next = update((s, cfg) => E.hireManager(cfg, s, venueId, id));
      if (!next.venues[venueId].businesses[id].managed) return fx.play('ui_denied');
      fx.play('hire');
      analytics.log('hire_manager', { business_id: id, venue: venueId });
      const cfg = get().cfg;
      const b = cfg.businesses.find((x) => x.id === id)!;
      celebrate({ kind: 'hire', title: b.managerName ?? 'Manager hired', subtitle: `now runs ${b.name}`, icon: b.managerIcon ?? cfg.theme.icons.manager });
    },

    buyUpgrade(id) {
      const next = update((s, cfg) => E.buyUpgrade(cfg, s, id));
      if (!next.upgrades.includes(id)) return fx.play('ui_denied');
      fx.play('upgrade');
      analytics.log('buy_upgrade', { upgrade_id: id });
    },

    // ------------------------------------------------------------ sim mode

    buyTransport() {
      const { cfg, game } = get();
      if (!E.isSim(cfg)) return;
      const venueId = game.activeVenue;
      const before = game.venues[venueId].chain!;
      const next = update((s) => E.buyTransport(cfg, s, venueId, get().buyAmount)).venues[venueId].chain!;
      if (next.transportLevel === before.transportLevel) return fx.play('ui_denied');
      if (next.workers.length > before.workers.length) {
        fx.play('hire');
        celebrate({ kind: 'hire', title: `New ${cfg.sim.transport.workerName.toLowerCase()}!`, subtitle: `${cfg.sim.transport.name}: ${next.workers.length}`, icon: cfg.sim.transport.icon });
        analytics.log('transport_worker', { count: next.workers.length, venue: venueId });
      } else fx.play('buy');
    },

    buySales() {
      const { cfg, game } = get();
      if (!E.isSim(cfg)) return;
      const venueId = game.activeVenue;
      const before = game.venues[venueId].chain!;
      const next = update((s) => E.buySales(cfg, s, venueId, get().buyAmount)).venues[venueId].chain!;
      if (next.salesLevel === before.salesLevel) return fx.play('ui_denied');
      if (next.seats.length > before.seats.length) {
        fx.play('milestone');
        celebrate({ kind: 'milestone', title: `New ${cfg.sim.sales.seatName.toLowerCase()}!`, subtitle: `${cfg.sim.sales.name}: ${next.seats.length}`, icon: cfg.sim.sales.icon });
        analytics.log('sales_seat', { count: next.seats.length, venue: venueId });
      } else fx.play('buy');
    },

    hireTransportManager() {
      const { cfg, game } = get();
      if (!E.isSim(cfg)) return;
      const venueId = game.activeVenue;
      const next = update((s) => E.hireTransportManager(cfg, s, venueId));
      if (next === game) return fx.play('ui_denied');
      fx.play('hire');
      const t = cfg.sim.transport;
      celebrate({ kind: 'hire', title: t.managerName, subtitle: `now runs the ${t.name.toLowerCase()}`, icon: t.managerIcon ?? cfg.theme.icons.manager });
      analytics.log('hire_transport_manager', { venue: venueId });
    },

    ringBell() {
      // The bell always rings, even when everyone is already busy: it has to feel good to hit.
      fx.play('bell');
      update((s) => E.ringVenueBell(s, s.activeVenue));
    },

    unlockVenue(venueId) {
      const { cfg, game } = get();
      if (!E.isSim(cfg)) return;
      const next = update((s) => E.unlockVenue(cfg, s, venueId));
      if (next === game) return fx.play('ui_denied');
      const v = cfg.sim.venues.find((x) => x.id === venueId)!;
      fx.play('unlock_venue');
      celebrate({ kind: 'venue', title: v.name, subtitle: v.place ? `Now open in ${v.place}` : 'Now open!', icon: v.icon });
      analytics.log('unlock_venue', { venue: venueId });
      set({ tab: 'home' });
      get().save();
    },

    setVenue(venueId) {
      const before = get().game;
      const next = update((s) => E.setActiveVenue(s, venueId));
      if (next !== before) fx.play('ui_tab');
    },

    startRush() {
      const { cfg, game } = get();
      const next = update((s) => E.startRush(cfg, s, Date.now()));
      if (next === game) return fx.play('ui_denied');
      rushWasActive = true;
      fx.play('rush_start');
      analytics.log('rush_start', { count: next.stats.rushes });
    },

    async adResetRush() {
      const { game } = get();
      const now = Date.now();
      if (E.isRushActive(game, now) || now >= game.rush.readyAt) return;
      const ok = await ads.showRewarded('rush_reset');
      if (!ok) return;
      update((s) => E.resetRushCooldown(s, Date.now()));
      fx.play('boost_start');
    },

    // ------------------------------------------------------------ cards, chests, missions, deals

    levelUpCard(cardId) {
      const before = get().game;
      const next = update((s, cfg) => M.levelUpCard(cfg, s, cardId));
      if (next === before) return fx.play('ui_denied');
      fx.play('card_levelup');
      analytics.log('card_level_up', { card_id: cardId, level: next.cards[cardId].level });
    },

    openChest: (chestId) => openChestNow(chestId),
    closeChest() {
      set({ chestOpening: null });
      ads.maybeShowInterstitial('chest_close');
    },

    claimFreeChest() {
      const { cfg, game } = get();
      const chestId = cfg.meta.freeChest?.chestId;
      const next = update((s) => M.claimFreeChest(cfg, s, Date.now()));
      if (!chestId || next === game) return fx.play('ui_denied');
      analytics.log('chest_free_claim');
      openChestNow(chestId);
    },

    async watchAdChest() {
      const { cfg, game } = get();
      const chestId = cfg.meta.adChest?.chestId;
      const status = M.adChestStatus(cfg, game, Date.now());
      if (!chestId || !status || status.left <= 0 || status.nextInMs > 0) return fx.play('ui_denied');
      const ok = await ads.showRewarded('ad_chest');
      if (!ok) return;
      update((s) => M.grantAdChest(cfg, s, Date.now()));
      openChestNow(chestId);
    },

    buyChest(chestId) {
      if (!M.chestSalesAllowed(get().cfg, get().region)) return fx.play('ui_denied');
      const before = get().game;
      const next = update((s, cfg) => M.buyChest(cfg, s, chestId));
      if (next === before) return fx.play('ui_denied');
      analytics.log('spend_virtual_currency', { virtual_currency_name: 'gems', value: before.gems - next.gems, item_name: `chest_${chestId}` });
      openChestNow(chestId);
    },

    claimMission(index) {
      const { cfg, game } = get();
      const result = M.claimMission(cfg, game, index, Date.now());
      if (!result) return fx.play('ui_denied');
      syncAds(result.state);
      set({ game: result.state });
      fx.play('mission_complete');
      celebrateRewards(result.granted);
      analytics.log('mission_claim', { index });
    },

    async buyDeal(dealId) {
      const { cfg, game } = get();
      const deal = cfg.meta.deals.find((d) => d.id === dealId);
      if (!deal) return;
      const now = Date.now();
      let result: { state: GameState; granted: GrantedReward[] } | null;
      if (deal.productId) {
        const product = cfg.monetization.iap.products.find((p) => p.id === deal.productId);
        if (!product || !M.activeDeals(cfg, game, now).some((d) => d.deal.id === dealId)) return fx.play('ui_denied');
        const ok = await iap.purchase(product);
        if (!ok) return;
        // Use the latest state: the game kept running while the payment sheet was open.
        result = M.grantDeal(cfg, get().game, dealId, Date.now());
      } else {
        result = M.buyDealWithGems(cfg, game, dealId, now);
      }
      if (!result) return fx.play('ui_denied');
      syncAds(result.state);
      set({ game: result.state, dealPopup: null });
      fx.play('purchase_success');
      celebrateRewards(result.granted);
      analytics.log('deal_buy', { deal_id: dealId, paid: deal.productId ? 'money' : 'gems' });
      get().save();
    },

    dismissDealPopup() {
      const id = get().dealPopup;
      if (id === null) return;
      update((s) => M.markDealSeen(s, id));
      set({ dealPopup: null });
      fx.play('ui_close');
    },

    buyDailyOffer(offerId) {
      const { cfg, game } = get();
      const result = M.buyDailyOffer(cfg, game, offerId, Date.now());
      if (!result) return fx.play('ui_denied');
      syncAds(result.state);
      set({ game: result.state });
      fx.play('daily_claim');
      celebrateRewards(result.granted);
      analytics.log('daily_offer', { offer_id: offerId });
    },

    // ------------------------------------------------------------ the rest

    prestige() {
      const { cfg, game } = get();
      const gained = E.prestigePointsAvailable(cfg, game);
      if (gained <= 0) return fx.play('ui_denied');
      update((s) => M.refreshDeals(cfg, E.prestige(cfg, s, Date.now()), Date.now()));
      fx.play('prestige');
      analytics.log('prestige', { points: gained, count: game.prestigeCount + 1 });
      set({ tab: 'home' });
      get().save();
      ads.maybeShowInterstitial('prestige');
    },

    async collectOffline(doubled) {
      const offline = get().offline;
      if (!offline) return;
      let amount = offline.earnings;
      if (doubled) {
        const ok = await ads.showRewarded('offline_double');
        if (ok) amount *= 2;
      }
      update((s) => E.grantCash(s, amount));
      set({ offline: null });
      fx.play('offline_collect');
      analytics.log('earn_virtual_currency', { virtual_currency_name: 'cash', value: amount, source: 'offline' });
      if (!doubled) ads.maybeShowInterstitial('offline_collect');
    },

    async watchBoostAd() {
      const { cfg, game } = get();
      if (!E.canBoost(cfg, game, Date.now())) return;
      const ok = await ads.showRewarded('boost');
      if (!ok) return;
      update((s, c) => E.activateBoost(c, s, Date.now()));
      fx.play('boost_start');
    },

    claimDaily() {
      const before = get().game.gems;
      const next = update((s, cfg) => E.claimDaily(cfg, s, Date.now()));
      if (next.gems <= before) return;
      fx.play('daily_claim');
      fx.play('gems');
      analytics.log('daily_claim', { streak: next.daily.streak, gems: next.gems - before });
    },

    gemTimeWarp() {
      const before = get().game.gems;
      const next = update((s, cfg) => E.buyTimeWarpWithGems(cfg, s, Date.now()));
      if (next.gems >= before) return fx.play('ui_denied');
      fx.play('offline_collect');
      analytics.log('spend_virtual_currency', { virtual_currency_name: 'gems', value: before - next.gems, item_name: 'time_warp' });
    },

    dismissStory() {
      const { cfg, game } = get();
      const beat = E.pendingStoryBeat(cfg, game);
      if (!beat) return;
      update((s) => E.markStorySeen(s, beat));
      if (beat.rewardGems > 0) fx.play('gems');
      analytics.log('story_beat', { beat_id: beat.id });
      if (beat.id === cfg.story[0]?.id) analytics.log('tutorial_complete');
    },

    async purchase(product) {
      if (M.isNonConsumable(product) && M.productOwned(get().game, product)) return;
      const ok = await iap.purchase(product);
      if (!ok) return;
      const result = M.applyProduct(get().cfg, get().game, product, Date.now());
      syncAds(result.state);
      set({ game: result.state });
      fx.play('purchase_success');
      get().save();
    },

    async restorePurchases() {
      const ids = await iap.restore();
      let count = 0;
      for (const id of ids) {
        const p = get().cfg.monetization.iap.products.find((x) => x.id === id);
        if (p && M.isNonConsumable(p) && !M.productOwned(get().game, p)) {
          update((s, cfg) => M.applyProduct(cfg, s, p, Date.now()).state);
          count++;
        }
      }
      get().save();
      return count;
    },

    async reset() {
      await AsyncStorage.removeItem(SAVE_KEY);
      const now = Date.now();
      const { cfg } = get();
      let fresh = M.startFreeChestTimer(cfg, M.registerSession(E.createInitialState(cfg, now), now), now);
      fresh = M.refreshMissions(cfg, M.refreshDailyShop(cfg, M.refreshDeals(cfg, fresh, now), now));
      set({ game: fresh, offline: null, chestOpening: null, dealPopup: null, celebrations: [] });
    },
  };
});

/** True when the player already owns a non-consumable product. */
export function productOwned(game: GameState, p: IapProduct): boolean {
  return M.productOwned(game, p);
}
