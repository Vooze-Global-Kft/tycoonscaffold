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
