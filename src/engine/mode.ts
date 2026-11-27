/**
 * The engine-mode seam: how the shared engine (economy.ts, meta.ts) reaches the rules of a mode
 * that has its own engine, without importing it.
 *
 * The sim and classic rules are the built-in code of economy.ts and install nothing. A mode with
 * its own rules (haul: src/engine/haul) is installed by its mode entry (src/modes/<mode>, through
 * src/modes/contract.ts `installMode`) before the store boots. The shared functions ask
 * `engineFor(cfg)` and delegate to it; with nothing installed, or with a config of another mode,
 * they run exactly the code they ran before the seam existed (src/engine/modeRegression.test.ts).
 *
 * So a game's bundle holds its own mode's rules only: Pizza Empire's app never imports the haul
 * rules, and the bundle check (npm run check:bundle) proves it. Pure TypeScript, no React.
 */
import type { GameConfig, StoryBeat } from '../config/schema';
import type { GameState } from './types';

/** The age treatment of ad requests (EngineMode.adAudience; src/services/ads.ts setAudience). */
export type AdAudience = 'child' | 'teen' | null;

/** One store transaction handed to a mode's grantProduct (RULING2 15.2: known by the id the store's listing gives it). */
export interface ProductArrival {
  productId: string;
  txId: string;
  /** The store's date of the transaction (ms), information only; null when it could not be read. */
  purchasedMs: number | null;
  /** This sheet's own result for the quote made at `atMs` (RULING2 15.5); null for every later arrival. */
  own: { atMs: number } | null;
}

/** A listing of the store account's transactions (EngineMode.afterListing). */
export interface ProductListing {
  txs: readonly Omit<ProductArrival, 'own'>[];
  /** Read from the network just now (the store's cache invalidated first); false for the listener's reports. */
  fresh: boolean;
  /**
   * The store's own time of this answer (ms; RevenueCat: customer info's requestDate), null when it
   * could not be read. Never the device's clock (RULING2 15.12 a): a quote's 72 hours run from its
   * `askedMs` to the requestMs of a FRESH listing. In the simulated store (Expo Go) the simulation's
   * own clock. The shared layer passes it on and decides nothing with it. The shared store always sets
   * it; absent (a listing built by hand) it reads as null.
   */
  requestMs?: number | null;
}

/** What the shared engine asks of a mode with its own rules. Every function is pure. */
export interface EngineMode {
  /** The cfg.mode this engine runs. The shared functions use it only for configs of that mode. */
  id: string;
  /**
   * The suffix of the save's storage key (`save:<game id>:<saveTag>`). A new tag starts every
   * player of the game afresh (an old save under another tag is left alone, never read).
   */
  saveTag: string;
  /**
   * The game's config with the mode's own block parsed (its schema and defaults live in the mode's
   * folders, so the shared schema keeps the block opaque). Called once at install, before the
   * store boots; throws on an invalid block (a broken game.json never reaches a build).
   */
  config?(cfg: GameConfig): GameConfig;
  /** Adds the mode's fields to a fresh shared state (economy.createInitialState's result). */
  create(cfg: GameConfig, base: GameState): GameState;
  /** Repairs a loaded save on top of the reconciled shared fields (`base`); never throws. */
  reconcile(cfg: GameConfig, base: GameState, raw: unknown): GameState;
  /**
   * Advances the game by `dt` seconds. It adds `stats.playSeconds` itself. `events` collects the
   * mode's own events (not GameEvent); the store hands them to the mode's listener.
   */
  tick(cfg: GameConfig, state: GameState, dt: number, now: number, events?: unknown[]): GameState;
  /** Steady income per second the game earns on its own (offline, the shared incomePerSecond). */
  income(cfg: GameConfig, state: GameState, now: number): number;
  /** Income per second while played: what "seconds of income" rewards, missions and the Time Warp are priced in. */
  activeIncome(cfg: GameConfig, state: GameState, now: number): number;
  /**
   * Time away: the earnings to grant (not yet added to cash) and the advanced game to keep. The
   * report is the mode's own (the haul Shift Log), passed through to its screen.
   */
  offline(cfg: GameConfig, state: GameState, now: number): { seconds: number; earnings: number; game: GameState; report?: unknown };
  /**
   * The run reset with the mode's own choice (haul: the next galaxy's condition and the Star Map
   * nodes to buy). Without a choice the mode picks its default. Returns the same object when refused.
   */
  prestige(cfg: GameConfig, state: GameState, now: number, choice?: unknown): GameState;
  /**
   * Whether the run reset may happen now, for a mode whose reset is not bought with prestige
   * points (merge: a season closes once its Festival is filled, and the game earns no points).
   * The store's prestige action asks this in place of its points gate when it exists. Without it
   * (sim, classic, haul) the gate is the prestige points, exactly as before.
   */
  canPrestige?(cfg: GameConfig, state: GameState): boolean;
  /** Story triggers the shared schema lists for this mode (true when met); unknown ones are false. */
  storyTrigger?(cfg: GameConfig, state: GameState, trigger: StoryBeat['trigger']): boolean;
  /** Counter of a mission type the mode adds (lifetime stats), or undefined when the type is not the mode's. */
  missionCounter?(state: GameState, type: string): number | undefined;
  /** Whether a mission type can be handed out now, or undefined when the type is not the mode's. */
  missionUsable?(cfg: GameConfig, state: GameState, type: string): boolean | undefined;
  /**
   * Two offline reports of one absence (a resume while the first report is still on screen) as
   * one. Without it the newer report replaces the older one.
   */
  mergeReport?(older: unknown, newer: unknown): unknown;
  /**
   * A non-consumable product was just recorded in `entitlements.products` (bought, restored or
   * re-granted at boot): the mode applies what it means for the run in progress (haul: Hangar
   * Expansion's start drones now, not only from the next run on). Returns the same object when
   * the product changes nothing now.
   */
  entitle?(cfg: GameConfig, state: GameState, productId: string): GameState;
  /**
   * A transaction of a consumable of the shared kind `hoursOfIncome` arrived (RULING2 section 15,
   * yard-stage2.md 2.15.5 as amended): the mode grants it by its own money rules, at the amount it
   * quoted and saved before the store's sheet opened (src/state/store.ts `buyQuoted`; the quote is
   * read from the save, never passed). `arrival.own` names the quote (by the `atMs` its quote function
   * was given) when this is that quote's own sheet's result: the id is new against that quote's
   * `known`, and it goes to THAT quote. `own` null: a later arrival (the listener, the check at start,
   * a listing read at Buy): an id not in the ledger goes to the OLDEST standing quote of the product
   * whose `known` lacks it (oldest: the order in which quotes were made, the list's order, never
   * `atMs`; 15.12 d), and with no such quote it belongs to another save and is not granted.
   * Never granted: an id in the ledger, or in the chosen quote's `known`. No clock decides a grant
   * (15.1): `purchasedMs` is the store's date, kept as information only (null when the store's
   * date could not be read). Called only through meta.grantPurchase, possibly several times with the
   * same `txId`: the SAME object when nothing is granted. Pure, never throws. Without it a game's
   * `hoursOfIncome` product is never sold (the store refuses it before any sheet opens).
   */
  grantProduct?(cfg: GameConfig, state: GameState, arrival: ProductArrival): GameState;
  /**
   * After every listing of the store account's transactions has been handed over (each arrival
   * through grantProduct first): the mode may withdraw the quotes that still stand (15.6, 15.11 b,
   * 15.12 a: only on a `fresh` listing, and only when its `requestMs`, the store's own time, is at least
   * 72 hours after the quote's `askedMs`; never by `now`, the device's clock, which decides no grant
   * and no withdrawal; a listing whose requestMs is null withdraws nothing). Called only with the grant route
   * (a `hoursOfIncome` product and grantProduct). The SAME object when nothing changes. Pure.
   */
  afterListing?(cfg: GameConfig, state: GameState, listing: ProductListing, now: number): GameState;
  /**
   * How the ad network must treat this player's requests, from the mode's own record of the
   * player's age band: 'child' (under 13: child-directed, non-personalised, no tracking prompt),
   * 'teen' (13 to 17), or null (no signal: requests as before). The store hands it to the ad
   * service on every change (src/services/ads.ts `setAudience`). Without it: null, as before.
   */
  adAudience?(cfg: GameConfig, state: GameState): AdAudience;
  /**
   * Whether an absence's report is worth showing although it earned nothing (haul: "Hold full.
   * Nothing shipped." when the freighter waited for a swipe the whole time). Without it, an
   * absence that earned nothing shows nothing.
   */
  reportAlone?(report: unknown): boolean;
  /**
   * What the Shift Log's (or offline popup's) rewarded ad multiplies the offline earnings by
   * (haul, Decision 42: 1 + haul.offline.adBonus). Without it: 2, the sim and classic double.
   */
  offlineAdMultiplier?(cfg: GameConfig): number;
  /**
   * The amount the offline collect really grants, from the amount it computed (earnings, times the
   * ad's multiplier when watched): a mode that rounds every amount it shows (merge, Decision M19)
   * rounds it here with the same function, so the purse gets exactly the figure on the button.
   * Without it, the amount is granted as computed (sim, classic and haul: unchanged).
   */
  roundPayout?(cfg: GameConfig, amount: number): number;
  /**
   * Income per second to price "seconds of income" rewards with (an "earn" mission's target, a
   * pod's cash slot) when `activeIncome` is 0: at the start of a run before any drone is on a route,
   * or while a confirmed Jump waits for its condition (haul). Without it, or when it returns 0, the
   * shared pricing is used as it is.
   */
  pricingFloor?(cfg: GameConfig, state: GameState, now: number): number;
  /**
   * True when a reset left the game without a run yet (haul: a confirmed Jump waiting for its
   * condition). The store then leaves the missions that depend on the run ("earn") to the moment
   * the run starts (the mode's own action calls meta.missionsAfterReset there).
   */
  awaitsRunStart?(state: GameState): boolean;
  /**
   * True: the store grants an absence's `earnings` in the same update that computes them (resume and
   * boot), so killing the app with the away report open loses nothing (decree, office-design.md 2.15,
   * lesson 5 of the brief); the report then only informs, and its rewarded ad grants only the extra
   * (earnings × (offlineAdMultiplier − 1)) when the ad completes. Unset (sim, classic, haul, merge): the
   * earnings are paid when the report is collected, exactly as before.
   */
  paysOnCompute?: boolean;
  /**
   * The longest absence the store catches up by ticking at full speed instead of the mode's away rules
   * (decree: 0, every absence follows the away rules). Unset: the store's own 300 s, exactly as before.
   */
  catchUpSeconds?: number;
  /**
   * "Start again" (the store's reset): what of the game before the restart a fresh one keeps (things paid
   * for, a parent's answers; salvage: yard-decisions.md part 6, section 22, M3). The store calls it right after
   * it has built the fresh game, with the game the player had. Unset (sim, classic, haul, merge, decree): the
   * fresh game as built, exactly as before. Pure; the store guards a throw (the fresh game then stands).
   */
  onReset?(cfg: GameConfig, old: GameState, fresh: GameState): GameState;
}

let installed: EngineMode | null = null;

/** Installs the mode's engine (the mode entry, before the store boots). `null` removes it (tests). */
export function installEngineMode(mode: EngineMode | null): void {
  installed = mode;
}

/** The installed engine when it runs this config's mode; null for the built-in sim and classic rules. */
export function engineFor(cfg: GameConfig): EngineMode | null {
  return installed && installed.id === cfg.mode ? installed : null;
}

/** The installed engine, whatever config is active (the store's save key). */
export function installedEngine(): EngineMode | null {
  return installed;
}
