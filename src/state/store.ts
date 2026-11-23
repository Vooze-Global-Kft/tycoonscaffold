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
import { engineFor, installedEngine } from '../engine/mode';
import type { GrantedReward } from '../engine/meta';
import type { BuyAmount, GameState } from '../engine/types';
import { ads } from '../services/ads';
import { analytics, crash, fetchRemoteOverrides } from '../services/firebase';
import { fx } from '../services/fx';
import { iap } from '../services/iap';
import { detectRegion } from '../services/region';
import { simEvents } from './events';
import { modeEvents } from './modeEvents';
import { overlays } from './overlays';

/**
 * Where the save lives. A mode with its own engine names its own tag (src/engine/mode.ts
 * `saveTag`), so a save of the game's earlier mode is never read; sim and classic keep "v1".
 * Read when used, not at load: the mode entry installs its engine after this file is loaded.
 */
const saveKey = () => `save:${ACTIVE_GAME_ID}:${installedEngine()?.saveTag ?? 'v1'}`;

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

/** Time away to pay. `report` is a mode engine's own account of it (haul: the Shift Log), when it has one. */
type Away = { seconds: number; earnings: number; report?: unknown };

interface Store {
  cfg: GameConfig;
  game: GameState;
  hydrated: boolean;
  buyAmount: BuyAmount;
  tab: Tab;
  modal: Modal | null;
  /**
   * Time away still to pay: the welcome-back report shows it until collectOffline() grants it. It
   * is saved with the game while it waits and read back by boot(), so closing the app on the
   * report loses nothing: the report is there again at the next start.
   */
  offline: Away | null;
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

  /** Loads the save and starts the game. Call once at startup; later calls behave like resume(). */
  boot(): Promise<void>;
  /** The app went to the background: stop the clock and save. */
  pause(): Promise<void>;
  /**
   * The app came back to the foreground: pay offline earnings for the time away, measured from
   * the in-memory state (never re-read from disk), repair timers, count a new session if the
   * player was away long enough, refresh the time-based meta systems.
   */
  resume(): void;
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
  /**
   * Opens one owned chest. While a chest is being revealed it is refused, unless `replaces` is the id
   * of that opening (the overlay's "Open next"); a repeat within a moment is always refused.
   */
  openChest(chestId: string, replaces?: number): void;
  closeChest(): void;
  claimFreeChest(): void;
  watchAdChest(): Promise<void>;
  buyChest(chestId: string): void;
  claimMission(index: number): void;
  buyDeal(dealId: string): Promise<void>;
  dismissDealPopup(): void;
  buyDailyOffer(offerId: string): void;

  // --- the rest ---
  /** The run reset. `choice` is a mode engine's own (haul: `{ traitId, buys }`, src/engine/haulMode.ts); sim and classic take none. */
  prestige(choice?: unknown): void;
  collectOffline(doubled: boolean): Promise<void>;
  watchBoostAd(): Promise<void>;
  claimDaily(): void;
  gemTimeWarp(): void;
  dismissStory(): void;
  /** Resolves true when the product was paid for and granted. */
  purchase(product: IapProduct): Promise<boolean>;
  restorePurchases(): Promise<number>;
  /** Dev only: wipe the save. */
  reset(): Promise<void>;
}

let tapSeq = 0;
let celebrationSeq = 0;
let chestSeq = 0;
/** Date.now() when the last chest opening started (see openChestNow). */
let chestOpenedAt = 0;
/** No reveal is shorter than this: a second open request inside it is a repeated tap. */
const CHEST_REOPEN_GUARD_MS = 700;
/** Seconds since the last housekeeping pass (deals, daily shop, missions). */
let houseClock = 0;
let rushWasActive = false;
let leaveCount = 0;
/** At most one deal popup per session, and none in the very first session. */
let dealPopupShown = false;
/** Date.now() when this session started: no offer popup in its first minute. */
let sessionStartedAt = 0;
/** No offer popup in the first minute of a session, nor within a few seconds of any dialog closing. */
const POPUP_SESSION_QUIET_MS = 60_000;
const POPUP_AFTER_CLOSE_MS = 5_000;
/** Counts successful grants, so purchase() can tell whether the product it routed was granted. */
let grantSeq = 0;
/** Reused every tick so the 10 Hz loop allocates as little as possible (listeners get a copy). */
const tickEvents: GameEvent[] = [];
/** boot() runs once; a second call (the app returning to the foreground in older App.tsx builds) becomes resume(). */
let booting: Promise<void> | null = null;
/**
 * True between pause() and resume(): the loop must not earn while the app is in the background, and
 * a save there must not move the moment time away is measured from (save()).
 */
let paused = false;
/** Wall-clock time the last tick ran. Offline time is measured from here, so time already played is never paid twice. */
let lastTickAt = 0;
/** Async actions in progress (an ad or a payment sheet is open); a second tap while one runs is ignored. */
const inFlight = new Set<string>();
/** The interstitial after a prestige waits this long, so the reset is seen before the ad covers it. */
const PRESTIGE_AD_DELAY_MS = 1000;
/** A tick never simulates more than this many seconds; longer gaps are offline time. */
const MAX_TICK_SECONDS = 5;
/** Time in the background shorter than the offline popup threshold, and at most this long, is simulated as one long tick. */
const MAX_CATCH_UP_SECONDS = 300;

/**
 * Runs one engine call that may fail (the meta systems are still being written, and a bug in
 * one must never stop the game loop, boot or a purchase): on error it is reported and the
 * fallback is used instead.
 */
function safe<T>(where: string, fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch (e) {
    crash.record(e, where);
    return fallback;
  }
}

/** Runs an async action unless the same one is still running (double taps while an ad or a payment sheet opens). */
async function once(key: string, fn: () => Promise<void>): Promise<void> {
  if (inFlight.has(key)) return;
  inFlight.add(key);
  try {
    await fn();
  } finally {
    inFlight.delete(key);
  }
}

/**
 * Applies a product (meta.applyProduct) and, for a non-consumable recorded just now, lets a mode
 * with its own engine apply it to the run in progress (src/engine/mode.ts `entitle`; haul: Hangar
 * Expansion's start drones). Sim and classic install no engine: exactly applyProduct.
 */
export function applyProductNow(cfg: GameConfig, game: GameState, product: IapProduct, now: number): { state: GameState; granted: GrantedReward[] } {
  const r = M.applyProduct(cfg, game, product, now);
  const mode = engineFor(cfg);
  if (!mode?.entitle || !M.isNonConsumable(product) || M.productOwned(game, product) || !M.productOwned(r.state, product)) return r;
  const entitled = safe('engine.entitle', () => mode.entitle!(cfg, r.state, product.id), r.state);
  return { state: entitled, granted: r.granted };
}

/** The time-based meta refreshes, each isolated so one failing does not skip the others. */
function refreshMeta(cfg: GameConfig, game: GameState, now: number): GameState {
  game = safe('meta.refreshDeals', () => M.refreshDeals(cfg, game, now), game);
  game = safe('meta.refreshDailyShop', () => M.refreshDailyShop(cfg, game, now), game);
  return safe('meta.refreshMissions', () => M.refreshMissions(cfg, game, now), game);
}

/** Two reports of one absence as one (a mode engine's `mergeReport`, else the newer one); no key at all when neither exists. */
function mergedReport(cfg: GameConfig, older: unknown, newer: unknown): { report?: unknown } {
  if (older === undefined && newer === undefined) return {};
  const merge = engineFor(cfg)?.mergeReport;
  return { report: merge ? safe('engine.mergeReport', () => merge(older, newer), newer ?? older) : (newer ?? older) };
}

/**
 * A report that still waits to be collected (open on screen, or read back from the save) with one
 * more absence added, so nothing earned while away is dropped and nothing is paid twice.
 */
function withAbsence(cfg: GameConfig, waiting: Away, away: Away): Away {
  return { seconds: waiting.seconds + away.seconds, earnings: waiting.earnings + away.earnings, ...mergedReport(cfg, waiting.report, away.report) };
}

/**
 * The report that waits to be collected is saved inside the game's own save, under this key. One
 * write therefore holds both the game, whose `lastSavedAt` says up to when time away has been
 * counted, and what that time earned: a save can never say "counted" without the earnings (they
 * would be lost), nor hold the earnings while the time is counted again (they would be paid
 * twice). The engine does not know the key: reconcileState keeps only the fields it knows, so the
 * loaded game never carries it.
 */
const PENDING_OFFLINE_KEY = 'pendingOffline';

/** The text of a save: the game, and with it the report that waits to be collected when there is one. */
function saveText(game: GameState, offline: Away | null): string {
  if (!offline) return JSON.stringify(game);
  // JSON has no Infinity (it would be written as null, and the record refused when read back);
  // the grant caps the amount there anyway (economy.ts `earn`).
  const record: Away = { ...offline, earnings: Math.min(offline.earnings, E.MAX_CASH) };
  // A mode's report is its own data. One that cannot be written (it is not plain data) is left
  // out: the game is saved all the same, and with it what the absence earned.
  const amounts: Away = { seconds: record.seconds, earnings: record.earnings };
  return safe('save.offline', () => JSON.stringify({ ...game, [PENDING_OFFLINE_KEY]: record }), null) ?? JSON.stringify({ ...game, [PENDING_OFFLINE_KEY]: amounts });
}

/**
 * The report a save carries because the app was closed before it was collected, or null. The save
 * is untrusted: a record without two finite amounts that are not negative is no record. A mode's
 * `report` is opaque here and comes back exactly as it was written.
 */
function savedOffline(save: unknown): Away | null {
  const record = isRecord(save) ? save[PENDING_OFFLINE_KEY] : undefined;
  if (!isRecord(record)) return null;
  const { seconds, earnings, report } = record;
  if (!isAmount(seconds) || !isAmount(earnings)) return null;
  return report === undefined ? { seconds, earnings } : { seconds, earnings, report };
}

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const isAmount = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0;

simEvents.onError((e, where) => crash.record(e, where));
modeEvents.onError((e, where) => crash.record(e, where));

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

  /** A purchase that did not go through says why (review P7), unless the player cancelled it. Nothing was charged. */
  const purchaseFailed = () => {
    if (!iap.lastFailure) return;
    fx.play('ui_denied');
    celebrate(
      iap.lastFailure === 'unavailable'
        ? { kind: 'reward', title: 'Not available right now', subtitle: 'The store has not loaded this item yet. Nothing was charged.', icon: get().cfg.theme.icons.tabShop }
        : { kind: 'reward', title: 'Purchase did not go through', subtitle: 'Nothing was charged. Please try again later.', icon: get().cfg.theme.icons.tabShop },
    );
  };

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
    const game = update((s, cfg) => refreshMeta(cfg, s, now));
    const quiet = !overlays.anyOpen() && overlays.msSinceClose() >= POPUP_AFTER_CLOSE_MS && now - sessionStartedAt >= POPUP_SESSION_QUIET_MS;
    const canPop = !dealPopupShown && quiet && game.stats.sessions >= 2 && get().dealPopup === null && get().modal === null && get().chestOpening === null && get().offline === null;
    if (canPop && E.pendingStoryBeat(get().cfg, game) === null) {
      const { cfg, region } = get();
      const deal = safe('meta.dealToShow', () => M.dealToShow(cfg, game, now), null);
      // Where chests may not be sold, an offer containing one is never shown.
      if (deal && safe('meta.chestSalesAllowed', () => M.chestSalesAllowed(cfg, region) || !M.containsChest(deal.contents), false)) {
        dealPopupShown = true;
        set({ dealPopup: deal.id });
        // Policy: no haptic on a sales prompt (docs/design/research/policy.md, checklist item 6).
        fx.play('deal_popup', { haptic: false });
        analytics.log('deal_shown', { deal_id: deal.id });
      }
    }
  };

  /**
   * Opens a chest and starts its reveal. Refused while another opening is on screen (logic C4: a
   * double tap on "Open next" opened two chests and the first one's rewards were never shown), except
   * for the overlay's own "Open next", which names the opening it replaces. A second request within
   * CHEST_REOPEN_GUARD_MS of the last opening is always refused: no reveal is that short, so it can
   * only be a repeated tap. A refused chest stays in the inventory.
   */
  const openChestNow = (chestId: string, replaces?: number) => {
    const current = get().chestOpening;
    if (current && ((replaces !== undefined && replaces !== current.id) || Date.now() - chestOpenedAt < CHEST_REOPEN_GUARD_MS)) return;
    const { cfg, game } = get();
    const result = safe('meta.openChest', () => M.openChest(cfg, game, chestId, Date.now()), null);
    if (!result) return fx.play('ui_denied');
    syncAds(result.state);
    chestOpenedAt = Date.now();
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

    boot() {
      // Once only. Re-reading the save on every return to the foreground (what App.tsx used to do)
      // replaced the in-memory game with an older copy: progress since the last save, purchases made
      // while boot awaited Remote Config, and open popups were lost, and sessions were counted twice.
      if (booting) {
        return booting.then(() => get().resume());
      }
      booting = (async () => {
        const now = Date.now();
        let game = E.createInitialState(baseGame, now);
        let returning = false;
        // The report the app was closed on before it was collected, when the save carries one.
        let uncollected: Away | null = null;
        try {
          const raw = await AsyncStorage.getItem(saveKey());
          if (raw) {
            const stored: unknown = JSON.parse(raw);
            game = E.reconcileState(baseGame, stored, now);
            uncollected = savedOffline(stored);
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
        ads.interstitials = cfg.monetization.ads.interstitials !== false;
        ads.maxAdContentRating = cfg.monetization.ads.maxAdContentRating;

        const at = Date.now();
        game = E.clampClock(cfg, game, at);
        // Re-grant non-consumables the store says this account owns (reinstall, new device).
        for (const id of await iap.owned()) {
          const p = cfg.monetization.iap.products.find((x) => x.id === id);
          if (p && M.isNonConsumable(p) && !M.productOwned(game, p)) game = safe('meta.applyProduct', () => applyProductNow(cfg, game, p, at).state, game);
        }
        game = safe('meta.registerSession', () => M.registerSession(game, at), game);
        game = safe('meta.startFreeChestTimer', () => M.startFreeChestTimer(cfg, game, at), game);
        game = refreshMeta(cfg, game, at);

        const offline = returning ? E.computeOffline(cfg, game, at) : null;
        // A mode engine fast-forwards its own state while away (haul: rocks, piles, the hold); keep it.
        if (offline?.game) game = offline.game;
        const away = offline ? { seconds: offline.seconds, earnings: offline.earnings, report: offline.report } : null;
        const shown = away && away.seconds >= cfg.economy.offline.minSecondsToShow && worthShowing(cfg, away) ? away : null;
        // A report that was never collected comes back as it was, with this absence added the way
        // resume() adds one to a report that is still open. Its own time is not computed again: the
        // save's lastSavedAt is past it, and so is stats.clockHigh when the clock was moved back
        // while the app was closed or in the background (clampClock).
        const waiting = uncollected && worthShowing(cfg, uncollected) ? uncollected : null;
        const pending = waiting && away && (away.earnings > 0 || shown) ? withAbsence(cfg, waiting, away) : (waiting ?? shown);
        // An absence too short for a report, with none waiting to take it. For sim and classic it
        // does not count: the game did not move and nothing is paid. A mode engine has moved the
        // run through it (the game kept above), so what that earned is paid at once, as resume()
        // pays a short trip to the background: a run never moves on for nothing.
        if (!pending && offline?.game && offline.earnings > 0) game = E.grantCash(game, offline.earnings);
        syncAds(game);
        rushWasActive = E.isRushActive(game, at);
        lastTickAt = at;
        sessionStartedAt = at;
        paused = false;
        set({
          cfg,
          game: { ...game, lastSavedAt: at },
          hydrated: true,
          offline: pending,
        });
        analytics.log(returning ? 'session_resume' : 'first_open_game', { prestige: game.prestigeCount, mode: cfg.mode, session: game.stats.sessions });
        ads.init();
        detectRegion().then((region) => set({ region }));
      })();
      return booting;
    },

    async pause() {
      if (!get().hydrated || paused) return;
      paused = true;
      // The game ran until now and stands still until resume(): time away is measured from this
      // moment, and every save in the background keeps it (save()).
      set({ game: { ...get().game, lastSavedAt: Date.now() } });
      await get().save();
    },

    resume() {
      const { cfg, hydrated } = get();
      if (!hydrated) return;
      const now = Date.now();
      paused = false;
      let game = get().game;
      // Time away starts when the game last ran. After pause() that is the moment it stamped, which
      // no save in the background moves (save()). Without a pause (a return from 'inactive', a
      // second boot()) the loop ran on, and it is the later of the last save and the last tick:
      // the ticks have paid that time themselves.
      const awayFrom = Math.max(game.lastSavedAt, lastTickAt);
      // clampClock caps it at now, and remembers a later time (clock moved back) so it is not paid twice.
      game = E.clampClock(cfg, { ...game, lastSavedAt: awayFrom }, now);
      const sessionsBefore = game.stats.sessions;
      game = safe('meta.registerSession', () => M.registerSession(game, now), game);
      const newSession = game.stats.sessions > sessionsBefore;
      if (newSession) {
        dealPopupShown = false;
        sessionStartedAt = now;
      }
      game = safe('meta.startFreeChestTimer', () => M.startFreeChestTimer(cfg, game, now), game);
      game = refreshMeta(cfg, game, now);

      const computed = E.computeOffline(cfg, game, now);
      const away = { seconds: computed.seconds, earnings: computed.earnings, report: computed.report };
      let offline = get().offline;
      // A mode engine that fast-forwarded its own state (haul) has already moved the run; keep it,
      // and never also tick the same time again below.
      const advanced = computed.game !== undefined && away.seconds > 0;
      if (advanced) game = computed.game!;
      if (away.earnings > 0 || (away.seconds >= cfg.economy.offline.minSecondsToShow && worthShowing(cfg, away))) {
        if (offline || away.seconds >= cfg.economy.offline.minSecondsToShow) {
          // Merge with a popup that is still open, so nothing earned while away is dropped.
          offline = offline ? withAbsence(cfg, offline, away) : away;
        } else if (away.seconds <= MAX_CATCH_UP_SECONDS && !advanced) {
          // A short trip to the background (a notification, the app switcher, and on Android every
          // full-screen ad) is simply caught up at full speed: the chain runs on, nothing is popped up.
          game = E.tick(cfg, game, away.seconds, now);
        } else {
          game = E.grantCash(game, away.earnings);
        }
      }
      rushWasActive = E.isRushActive(game, now);
      lastTickAt = now;
      syncAds(game);
      set({ game: { ...game, lastSavedAt: now }, offline, combo: { taps: 0, lastTapAt: 0 } });
      if (newSession) analytics.log('session_resume', { prestige: game.prestigeCount, mode: cfg.mode, session: game.stats.sessions });
      get().save();
    },

    tick(dt) {
      const { cfg, game, hydrated } = get();
      if (!hydrated || paused || !(dt > 0)) return;
      const now = Date.now();
      lastTickAt = now;
      tickEvents.length = 0;
      const next = safe('engine.tick', () => E.tick(cfg, game, Math.min(dt, MAX_TICK_SECONDS), now, tickEvents), game);
      if (next !== game) set({ game: next });
      if (tickEvents.length > 0) {
        // Listeners may keep what they get; the reused array is only the engine's scratch space.
        const events = tickEvents.slice();
        // A mode with its own engine reports its own events to its own listeners (src/state/modeEvents.ts).
        if (engineFor(cfg)) modeEvents.emit(events);
        else {
          if (E.isSim(cfg)) safe('fx.sim', () => playSimSounds(events), undefined);
          simEvents.emit(events);
        }
      }
      // A rush ends by time, not by an action: compare the state before and after this tick.
      const rushActive = E.isRushActive(next, now);
      // A mode with its own engine has no rush (rushWasActive stays false for it).
      if (rushWasActive && !rushActive && !engineFor(cfg)) fx.play('rush_end');
      rushWasActive = rushActive;
      houseClock += dt;
      if (houseClock >= 2) {
        houseClock = 0;
        safe('housekeeping', housekeeping, undefined);
      }
    },

    async save() {
      // Before boot has loaded the save, the in-memory game is a blank one: writing it would wipe the player.
      if (!get().hydrated) return;
      // lastSavedAt is the moment the game has run up to: resume() measures time away from it, and
      // so does boot() from the save. In the foreground that is now. In the background the game
      // stands still (tick), so a save there keeps the moment pause() stamped. The autosave timer
      // can run on there, and an action saves when a rewarded ad's result arrives before the app
      // is back on screen: stamped with their own time, the seconds since the app left would be
      // neither played nor counted as time away, on the return or at the next start.
      const held = get().game;
      const game = paused ? held : { ...held, lastSavedAt: Date.now() };
      if (game !== held) set({ game });
      try {
        // With the report that waits to be collected, in the same write (PENDING_OFFLINE_KEY): from
        // here on the time away it stands for is counted, so it must not exist in memory only.
        await AsyncStorage.setItem(saveKey(), saveText(game, get().offline));
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
      // No interstitial here: changing tabs is the player choosing to do something else (policy.md item 11).
      set({ tab });
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
      if (!before.venues[before.activeVenue]?.businesses[id]) return;
      const next = update((s) => E.startBusiness(s, s.activeVenue, id));
      if (next !== before) fx.play('ui_tap');
    },

    buy(id) {
      const venueId = get().game.activeVenue;
      if (!get().game.venues[venueId]?.businesses[id]) return fx.play('ui_denied');
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
      if (!get().game.venues[venueId]?.businesses[id]) return fx.play('ui_denied');
      const next = update((s, cfg) => E.hireManager(cfg, s, venueId, id));
      if (!next.venues[venueId].businesses[id].managed) return fx.play('ui_denied');
      fx.play('hire');
      analytics.log('hire_manager', { business_id: id, venue: venueId });
      const cfg = get().cfg;
      const b = cfg.businesses.find((x) => x.id === id)!;
      celebrate({ kind: 'hire', title: b.managerName ?? 'Manager hired', subtitle: `now runs ${b.name}`, icon: b.managerIcon ?? (b.workerLook ? `char:${b.workerLook}` : cfg.theme.icons.manager) });
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

    adResetRush: () =>
      once('rush_reset', async () => {
        const { game } = get();
        const now = Date.now();
        if (E.isRushActive(game, now) || now >= game.rush.readyAt) return;
        const ok = await ads.showRewarded('rush_reset');
        if (!ok) return;
        update((s) => E.resetRushCooldown(s, Date.now()));
        fx.play('boost_start');
        get().save();
      }),

    // ------------------------------------------------------------ cards, chests, missions, deals

    levelUpCard(cardId) {
      const before = get().game;
      const next = update((s, cfg) => safe('meta.levelUpCard', () => M.levelUpCard(cfg, s, cardId), s));
      if (next === before) return fx.play('ui_denied');
      fx.play('card_levelup');
      analytics.log('card_level_up', { card_id: cardId, level: next.cards[cardId]?.level ?? 0 });
      get().save();
    },

    openChest: (chestId, replaces) => openChestNow(chestId, replaces),
    closeChest() {
      // No interstitial after a chest: the reveal is the reward moment (critique-fun.md sections 6 and 7).
      if (get().chestOpening === null) return;
      set({ chestOpening: null });
    },

    claimFreeChest() {
      const { cfg, game } = get();
      const chestId = cfg.meta.freeChest?.chestId;
      const next = update((s) => safe('meta.claimFreeChest', () => M.claimFreeChest(cfg, s, Date.now()), s));
      if (!chestId || next === game) return fx.play('ui_denied');
      analytics.log('chest_free_claim');
      openChestNow(chestId);
    },

    watchAdChest: () =>
      once('ad_chest', async () => {
        const { cfg, game } = get();
        const chestId = cfg.meta.adChest?.chestId;
        const status = safe('meta.adChestStatus', () => M.adChestStatus(cfg, game, Date.now()), null);
        if (!chestId || !status || status.left <= 0 || status.nextInMs > 0) return fx.play('ui_denied');
        const ok = await ads.showRewarded('ad_chest');
        if (!ok) return;
        // The ad took a while: grant against the latest state, and open only if the grant really happened
        // (otherwise this would open a chest the player owned from somewhere else).
        const before = get().game;
        const next = update((s) => safe('meta.grantAdChest', () => M.grantAdChest(cfg, s, Date.now()), s));
        if (next === before) return fx.play('ui_denied');
        openChestNow(chestId);
      }),

    buyChest(chestId) {
      if (!safe('meta.chestSalesAllowed', () => M.chestSalesAllowed(get().cfg, get().region), false)) return fx.play('ui_denied');
      const before = get().game;
      const next = update((s, cfg) => safe('meta.buyChest', () => M.buyChest(cfg, s, chestId), s));
      if (next === before) return fx.play('ui_denied');
      analytics.log('spend_virtual_currency', { virtual_currency_name: 'gems', value: before.gems - next.gems, item_name: `chest_${chestId}` });
      openChestNow(chestId);
    },

    claimMission(index) {
      const { cfg, game } = get();
      const result = safe('meta.claimMission', () => M.claimMission(cfg, game, index, Date.now()), null);
      if (!result) return fx.play('ui_denied');
      syncAds(result.state);
      set({ game: result.state });
      fx.play('mission_complete');
      celebrateRewards(result.granted);
      analytics.log('mission_claim', { index });
      get().save();
    },

    buyDeal: (dealId) =>
      once(`deal:${dealId}`, async () => {
      const { cfg, game } = get();
      const deal = cfg.meta.deals.find((d) => d.id === dealId);
      if (!deal) return;
      // Where chests may not be sold, a paid deal containing one is never sold (the schema forbids it
      // unless chestsForSale is on, but Remote Config can change the config).
      if (!safe('meta.offerAllowed', () => M.offerAllowed(cfg, get().region, deal.contents, true), false)) return fx.play('ui_denied');
      const now = Date.now();
      let result: { state: GameState; granted: GrantedReward[] } | null;
      if (deal.productId) {
        const product = cfg.monetization.iap.products.find((p) => p.id === deal.productId);
        if (!product || !safe('meta.activeDeals', () => M.activeDeals(cfg, game, now), []).some((d) => d.deal.id === dealId)) return fx.play('ui_denied');
        const ok = await iap.purchase(product);
        if (!ok) return purchaseFailed();
        // Use the latest state: the game kept running while the payment sheet was open.
        result = safe('meta.grantDeal', () => M.grantDeal(cfg, get().game, dealId, Date.now()), null);
        if (!result) {
          // Money was taken: never fail silently. (A grant can only fail here if the meta code is broken.)
          crash.record(new Error(`deal ${dealId} paid but not granted`), 'buyDeal');
        }
      } else {
        result = safe('meta.buyDealWithGems', () => M.buyDealWithGems(cfg, game, dealId, now), null);
      }
      if (!result) return fx.play('ui_denied');
      syncAds(result.state);
      grantSeq++;
      set({ game: result.state, dealPopup: null });
      fx.play('purchase_success');
      celebrateRewards(result.granted);
      analytics.log('deal_buy', { deal_id: dealId, paid: deal.productId ? 'money' : 'gems' });
      get().save();
      }),

    dismissDealPopup() {
      const id = get().dealPopup;
      if (id === null) return;
      update((s) => safe('meta.markDealSeen', () => M.markDealSeen(s, id), s));
      set({ dealPopup: null });
      fx.play('ui_close');
    },

    buyDailyOffer(offerId) {
      const { cfg, game } = get();
      const offer = cfg.meta.dailyShop.offers.find((o) => o.id === offerId);
      if (!offer || !safe('meta.offerAllowed', () => M.offerAllowed(cfg, get().region, [offer.reward], offer.gemCost > 0), false)) return fx.play('ui_denied');
      const result = safe('meta.buyDailyOffer', () => M.buyDailyOffer(cfg, game, offerId, Date.now()), null);
      if (!result) return fx.play('ui_denied');
      syncAds(result.state);
      set({ game: result.state });
      fx.play('daily_claim');
      celebrateRewards(result.granted);
      analytics.log('daily_offer', { offer_id: offerId });
      get().save();
    },

    // ------------------------------------------------------------ the rest

    prestige(choice) {
      const { cfg, game } = get();
      const gained = E.prestigePointsAvailable(cfg, game);
      if (gained <= 0) return fx.play('ui_denied');
      update((s) => {
        const now = Date.now();
        const reset = E.prestige(cfg, s, now, choice);
        // A mode whose reset waits for a later step to start the run (haul: the Jump's condition) refills
        // the run's missions when it starts (rules-6: an "earn" target priced on a run that earns nothing).
        const waits = safe('engine.awaitsRunStart', () => engineFor(cfg)?.awaitsRunStart?.(reset) ?? false, false);
        const fresh = waits ? reset : safe('meta.missionsAfterReset', () => M.missionsAfterReset(cfg, reset, now), reset);
        return safe('meta.refreshDeals', () => M.refreshDeals(cfg, fresh, now), fresh);
      });
      fx.play('prestige');
      analytics.log('prestige', { points: gained, count: game.prestigeCount + 1 });
      set({ tab: 'home' });
      get().save();
      // Policy (policy.md item 11): a short pause so the reset is seen before an interstitial covers it.
      // (A game whose data turns interstitials off never shows one: src/services/ads.ts `interstitials`.)
      ads.maybeShowInterstitial('prestige', PRESTIGE_AD_DELAY_MS);
    },

    collectOffline: (doubled) =>
      once('offline', async () => {
        const offline = get().offline;
        if (!offline) return;
        let amount = offline.earnings;
        if (doubled) {
          const ok = await ads.showRewarded('offline_double');
          // Sim and classic double it; a mode with its own rules says what the ad adds (haul, Decision 42: +50 %).
          const mult = engineFor(get().cfg)?.offlineAdMultiplier;
          if (ok) amount *= mult ? safe('engine.offlineAdMultiplier', () => mult(get().cfg), 1) : 2;
        }
        // Clear the popup in the same update that pays it, and only pay what is still pending:
        // a resume() while the ad was open may have merged more time into it. Nothing may save
        // between paying and clearing (no store listener does): a save holds the cash or the
        // waiting report, never both, or the next start would pay the report again.
        const pending = get().offline;
        if (pending && pending !== offline) amount += pending.earnings - offline.earnings;
        update((s) => E.grantCash(s, amount));
        set({ offline: null });
        get().save();
        fx.play('offline_collect');
        analytics.log('earn_virtual_currency', { virtual_currency_name: 'cash', value: amount, source: 'offline' });
        // No interstitial after collecting: it would only ever follow a declined rewarded ad (policy.md item 11).
      }),

    watchBoostAd: () =>
      once('boost', async () => {
        const { cfg, game } = get();
        if (!E.canBoost(cfg, game, Date.now())) return;
        const ok = await ads.showRewarded('boost');
        if (!ok) return;
        update((s, c) => E.activateBoost(c, s, Date.now()));
        fx.play('boost_start');
        get().save();
      }),

    claimDaily() {
      // Decision 53: a game without a daily gift (economy.daily.gems empty) offers no claim.
      if (!E.dailyOffered(get().cfg)) return;
      const before = get().game.gems;
      const next = update((s, cfg) => E.claimDaily(cfg, s, Date.now()));
      if (next.gems <= before) return;
      fx.play('daily_claim');
      fx.play('gems');
      analytics.log('daily_claim', { streak: next.daily.streak, gems: next.gems - before });
      get().save();
    },

    gemTimeWarp() {
      const before = get().game.gems;
      const next = update((s, cfg) => E.buyTimeWarpWithGems(cfg, s, Date.now()));
      if (next.gems >= before) return fx.play('ui_denied');
      fx.play('offline_collect');
      analytics.log('spend_virtual_currency', { virtual_currency_name: 'gems', value: before - next.gems, item_name: 'time_warp' });
      get().save();
    },

    dismissStory() {
      const { cfg, game } = get();
      const beat = E.pendingStoryBeat(cfg, game);
      if (!beat) return;
      update((s) => E.markStorySeen(s, beat));
      if (beat.rewardGems > 0) fx.play('gems');
      analytics.log('story_beat', { beat_id: beat.id });
      if (beat.id === cfg.story[0]?.id) analytics.log('tutorial_complete');
      if (beat.rewardGems > 0) get().save();
    },

    purchase: (product) => {
      // A deal's product grants nothing by itself (its contents are the deal's): route it through
      // buyDeal, which checks the timer and the purchase limit, so money is never taken for nothing.
      if (product.kind === 'deal') {
        const deal = get().cfg.meta.deals.find((d) => d.productId === product.id);
        if (!deal) {
          fx.play('ui_denied');
          return Promise.resolve(false);
        }
        const seq = grantSeq;
        return get().buyDeal(deal.id).then(() => grantSeq > seq);
      }
      const seq = grantSeq;
      return once(`iap:${product.id}`, async () => {
        if (M.isNonConsumable(product) && M.productOwned(get().game, product)) return;
        const ok = await iap.purchase(product);
        if (!ok) return purchaseFailed();
        // The payment sheet was open for a while: apply to the latest state, never to a copy taken before.
        const result = safe('meta.applyProduct', () => applyProductNow(get().cfg, get().game, product, Date.now()), null);
        if (!result) {
          // Money was taken: never fail silently.
          crash.record(new Error(`product ${product.id} paid but not granted`), 'purchase');
          return;
        }
        grantSeq++;
        syncAds(result.state);
        set({ game: result.state });
        fx.play('purchase_success');
        celebrateRewards(result.granted);
        get().save();
      }).then(() => grantSeq > seq);
    },

    async restorePurchases() {
      // A second tap while the store dialog is open would apply the same products twice in a race.
      if (inFlight.has('restore')) return 0;
      inFlight.add('restore');
      try {
        const ids = await iap.restore();
        let count = 0;
        for (const id of ids) {
          const p = get().cfg.monetization.iap.products.find((x) => x.id === id);
          if (p && M.isNonConsumable(p) && !M.productOwned(get().game, p)) {
            update((s, cfg) => safe('meta.applyProduct', () => applyProductNow(cfg, s, p, Date.now()).state, s));
            count++;
          }
        }
        get().save();
        return count;
      } finally {
        inFlight.delete('restore');
      }
    },

    async reset() {
      await AsyncStorage.removeItem(saveKey());
      const now = Date.now();
      const { cfg } = get();
      let fresh = E.createInitialState(cfg, now);
      fresh = safe('meta.registerSession', () => M.registerSession(fresh, now), fresh);
      fresh = safe('meta.startFreeChestTimer', () => M.startFreeChestTimer(cfg, fresh, now), fresh);
      fresh = refreshMeta(cfg, fresh, now);
      syncAds(fresh);
      set({ game: fresh, offline: null, chestOpening: null, dealPopup: null, celebrations: [] });
    },
  };
});

/** An absence worth a popup: it earned something, or the mode says its report speaks alone (src/engine/mode.ts `reportAlone`). */
function worthShowing(cfg: GameConfig, away: { earnings: number; report?: unknown }): boolean {
  if (away.earnings > 0) return true;
  const mode = engineFor(cfg);
  return away.report !== undefined && !!mode?.reportAlone && safe('engine.reportAlone', () => mode.reportAlone!(away.report), false);
}

/** True when the player already owns a non-consumable product. */
export function productOwned(game: GameState, p: IapProduct): boolean {
  return M.productOwned(game, p);
}
