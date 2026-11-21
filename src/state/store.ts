import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { ACTIVE_GAME_ID, applyRemoteOverrides, baseGame, remoteDefaults } from '../config/game';
import type { GameConfig, IapProduct } from '../config/schema';
import * as E from '../engine/economy';
import type { BuyAmount, GameState } from '../engine/types';
import { ads } from '../services/ads';
import { analytics, crash, fetchRemoteOverrides } from '../services/firebase';
import { feedback } from '../services/feedback';
import { iap, isNonConsumable } from '../services/iap';

const SAVE_KEY = `save:${ACTIVE_GAME_ID}:v1`;

export type Tab = 'businesses' | 'managers' | 'upgrades' | 'prestige' | 'shop';

interface Store {
  cfg: GameConfig;
  game: GameState;
  hydrated: boolean;
  buyAmount: BuyAmount;
  tab: Tab;
  offline: { seconds: number; earnings: number } | null;
  /** Floating "+$123" numbers; the UI drains them. */
  tapEvents: { id: number; amount: number; x: number; y: number }[];

  boot(): Promise<void>;
  tick(dt: number): void;
  save(): Promise<void>;
  setBuyAmount(a: BuyAmount): void;
  setTab(t: Tab): void;

  tapHero(x: number, y: number): void;
  consumeTapEvent(id: number): void;
  startBusiness(id: string): void;
  buy(id: string): void;
  hire(id: string): void;
  buyUpgrade(id: string): void;
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

export const useGame = create<Store>((set, get) => {
  /** Apply an engine transition and keep ads in sync with entitlements. */
  const update = (fn: (s: GameState, cfg: GameConfig) => GameState) => {
    const { game, cfg } = get();
    const next = fn(game, cfg);
    if (next !== game) {
      ads.noAds = next.entitlements.noAds;
      set({ game: next });
    }
    return next;
  };

  return {
    cfg: baseGame,
    game: E.createInitialState(baseGame, Date.now()),
    hydrated: false,
    buyAmount: 1,
    tab: 'businesses',
    offline: null,
    tapEvents: [],

    async boot() {
      const now = Date.now();
      let game = E.createInitialState(baseGame, now);
      let returning = false;
      try {
        const raw = await AsyncStorage.getItem(SAVE_KEY);
        if (raw) {
          game = E.reconcileState(baseGame, JSON.parse(raw) as GameState);
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
        if (p && isNonConsumable(p)) game = E.applyProduct(cfg, game, p, now);
      }

      const offline = returning ? E.computeOffline(cfg, game, now) : null;
      ads.noAds = game.entitlements.noAds;
      set({
        cfg,
        game: { ...game, lastSavedAt: now },
        hydrated: true,
        offline: offline && offline.seconds >= cfg.economy.offline.minSecondsToShow && offline.earnings > 0 ? offline : null,
      });
      analytics.log(returning ? 'session_resume' : 'first_open_game', { prestige: game.prestigeCount });
      ads.init();
    },

    tick(dt) {
      const { cfg, game, hydrated } = get();
      if (!hydrated) return;
      set({ game: E.tick(cfg, game, dt, Date.now()) });
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

    setBuyAmount: (buyAmount) => set({ buyAmount }),
    setTab(tab) {
      set({ tab });
      ads.maybeShowInterstitial('tab_change');
    },

    tapHero(x, y) {
      const { cfg, game } = get();
      const r = E.tapHero(cfg, game, Date.now());
      feedback.tap();
      const evt = { id: ++tapSeq, amount: r.earned, x, y };
      set({ game: r.state, tapEvents: [...get().tapEvents.slice(-15), evt] });
    },
    consumeTapEvent: (id) => set({ tapEvents: get().tapEvents.filter((e) => e.id !== id) }),

    startBusiness(id) {
      update((s) => E.startBusiness(s, id));
    },

    buy(id) {
      const before = get().game.businesses[id].owned;
      const next = update((s, cfg) => E.buyBusiness(cfg, s, id, get().buyAmount));
      const after = next.businesses[id].owned;
      if (after === before) return feedback.denied();
      feedback.buy();
      const crossed = get().cfg.economy.milestones.find((m) => before < m.owned && after >= m.owned);
      if (crossed) analytics.log('level_up', { character: id, level: crossed.owned });
      if (before === 0) analytics.log('unlock_business', { business_id: id });
    },

    hire(id) {
      const next = update((s, cfg) => E.hireManager(cfg, s, id));
      if (next.businesses[id].managed) {
        feedback.reward();
        analytics.log('hire_manager', { business_id: id });
      } else feedback.denied();
    },

    buyUpgrade(id) {
      const next = update((s, cfg) => E.buyUpgrade(cfg, s, id));
      if (next.upgrades.includes(id)) {
        feedback.buy();
        analytics.log('buy_upgrade', { upgrade_id: id });
      } else feedback.denied();
    },

    prestige() {
      const { cfg, game } = get();
      const gained = E.prestigePointsAvailable(cfg, game);
      if (gained <= 0) return;
      update((s) => E.prestige(cfg, s, Date.now()));
      feedback.reward();
      analytics.log('prestige', { points: gained, count: game.prestigeCount + 1 });
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
      feedback.reward();
      analytics.log('earn_virtual_currency', { virtual_currency_name: 'cash', value: amount, source: 'offline' });
      if (!doubled) ads.maybeShowInterstitial('offline_collect');
    },

    async watchBoostAd() {
      const { cfg, game } = get();
      if (!E.canBoost(cfg, game, Date.now())) return;
      const ok = await ads.showRewarded('boost');
      if (!ok) return;
      update((s, c) => E.activateBoost(c, s, Date.now()));
      feedback.reward();
    },

    claimDaily() {
      const before = get().game.gems;
      const next = update((s, cfg) => E.claimDaily(cfg, s, Date.now()));
      if (next.gems > before) {
        feedback.reward();
        analytics.log('daily_claim', { streak: next.daily.streak, gems: next.gems - before });
      }
    },

    gemTimeWarp() {
      const before = get().game.gems;
      const next = update((s, cfg) => E.buyTimeWarpWithGems(cfg, s, Date.now()));
      if (next.gems < before) {
        feedback.reward();
        analytics.log('spend_virtual_currency', { virtual_currency_name: 'gems', value: before - next.gems, item_name: 'time_warp' });
      } else feedback.denied();
    },

    dismissStory() {
      const { cfg, game } = get();
      const beat = E.pendingStoryBeat(cfg, game);
      if (!beat) return;
      update((s) => E.markStorySeen(s, beat));
      analytics.log('story_beat', { beat_id: beat.id });
      if (beat.id === cfg.story[0]?.id) analytics.log('tutorial_complete');
    },

    async purchase(product) {
      const { game } = get();
      if (isNonConsumable(product) && productOwned(game, product)) return;
      const ok = await iap.purchase(product);
      if (!ok) return;
      update((s, cfg) => E.applyProduct(cfg, s, product, Date.now()));
      feedback.reward();
      get().save();
    },

    async restorePurchases() {
      const ids = await iap.restore();
      let count = 0;
      for (const id of ids) {
        const p = get().cfg.monetization.iap.products.find((x) => x.id === id);
        if (p && isNonConsumable(p)) {
          update((s, cfg) => E.applyProduct(cfg, s, p, Date.now()));
          count++;
        }
      }
      get().save();
      return count;
    },

    async reset() {
      await AsyncStorage.removeItem(SAVE_KEY);
      set({ game: E.createInitialState(get().cfg, Date.now()), offline: null });
    },
  };
});

export function productOwned(game: GameState, p: IapProduct): boolean {
  return game.entitlements.products.includes(p.id);
}
