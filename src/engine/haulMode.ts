/**
 * The haul engine as an engine mode (src/engine/mode.ts): how the shared engine functions reach
 * the haul rules (src/engine/haul.ts, the rules package's public index) without importing them.
 *
 * Haul mode only (scripts/lib/modes.js lists this file with the haul folders): the haul mode
 * entry (src/modes/haul/index.tsx) installs it, so only a haul game's bundle carries the haul
 * rules. Pure TypeScript, no React. Written by the tech lead's skeleton; owned afterwards by the
 * integration package (docs/design/space-build-plan.md).
 */
import type { GameConfig, StoryBeat } from '../config/schema';
import { HaulSchema } from '../config/schema.haul';
import { dayKey } from './economy';
import * as H from './haul';
import type { EngineMode } from './mode';
import type { GameState } from './types';

/**
 * What the shared `prestige(cfg, state, now, choice)` is asked for in a haul game. The Jump flow of
 * errata 17 runs in steps (src/engine/haul/jump.ts): `{ step: 'confirm' }` is step 2 (`confirmJump`:
 * cores credited, the run ends, the Jump waits in `haulStats.pendingJump`, saved, so a restart comes
 * back to it); the Star Map purchases and `startGalaxy` (steps 3 to 5) are the haul actions'
 * `buyStarNode` and `startGalaxy`, no reset. `{ traitId, buys }` is the whole flow in one call
 * (`prestigeHaul`: the bot, tests, the default).
 */
export type HaulJumpChoice = { step: 'confirm' } | { step?: 'all'; traitId: string; buys?: string[] };

const asCfg = (cfg: GameConfig) => cfg as H.HaulConfig;

/**
 * A haul game's config with its haul block parsed by the haul schema (defaults filled in). The
 * shared schema keeps the block opaque (src/config/schema.ts), so every reader of a haul game's
 * data goes through this once: the mode entry at install, the game-data lint, the Node tools.
 * Throws with the schema's message when the block is invalid. Other configs come back as they are.
 */
export function withHaulContent(cfg: GameConfig): GameConfig {
  if (cfg.mode !== 'haul' || !cfg.haul) return cfg;
  const r = HaulSchema.safeParse(cfg.haul);
  if (!r.success) throw new Error(`the "haul" block is invalid:\n${r.error.message}`);
  return { ...cfg, haul: r.data as unknown as Record<string, unknown> };
}
const asGame = (g: GameState) => g as unknown as H.HaulGame;

/** The local calendar day of `now` (economy.dayKey), recomputed once a minute (the tick runs ten times a second). */
let dayAt = -1;
let dayText = '';
function localDay(now: number): string {
  const minute = Math.floor(now / 60_000);
  if (minute !== dayAt) {
    dayText = dayKey(now);
    dayAt = minute;
  }
  return dayText;
}
const asState = (g: H.HaulGame) => g as unknown as GameState;

/** The default Jump choice: the first offered condition, no node bought (the bot and the screens pass their own). */
export function defaultJumpChoice(cfg: H.HaulConfig, g: H.HaulGame): HaulJumpChoice | null {
  if (!g.haul) return null;
  const offers = H.offersFor(cfg, g.metaSeed, g.haulStats.jumps, g.haul.trait);
  return offers.length ? { traitId: offers[0] } : null;
}

function storyTrigger(cfg: GameConfig, state: GameState, t: StoryBeat['trigger']): boolean {
  if (!H.isHaul(cfg)) return false;
  const c = asCfg(cfg);
  const g = asGame(state);
  const h = g.haul;
  const hs = g.haulStats;
  // Lifetime readings (haulStats, the rules' second pass, errata 21): they hold across a Jump and
  // while a confirmed Jump waits for its condition (haul = null).
  switch (t.type) {
    case 'launches':
      return (g.stats.launches ?? 0) >= t.count;
    case 'ring':
      return (hs.bestRing ?? 0) >= t.ring;
    case 'contracts':
      return !!hs.contractsSeen || !!h?.contracts.unlocked;
    case 'system':
      return !!hs.autopilotSeen || !!h?.autopilot.online;
    case 'galaxy':
      return (h?.galaxy ?? hs.pendingJump?.galaxy ?? 0) >= t.index;
    case 'jumpReady':
      // "Jump ready" (spec 8): the rules' own reading uses haul.jumpReadyCores; a beat may ask for another count.
      return t.cores === c.haul.jumpReadyCores ? H.jumpPreview(c, g).ready : !!h && !hs.pendingJump && H.coresAvailable(c, g) >= t.cores;
    default:
      return false;
  }
}

function missionUsable(cfg: GameConfig, state: GameState, type: string): boolean | undefined {
  const g = asGame(state);
  const h = g.haul;
  switch (type) {
    // Haul has no tapping and no flying bonus.
    case 'taps':
    case 'bonus':
      return false;
    // Errata 74: once contracts have ever unlocked (the lifetime flag of errata 21).
    case 'contracts':
      return !!g.haulStats?.contractsSeen || !!h?.contracts.unlocked || (g.stats.contractsMet ?? 0) > 0;
    case 'seamDrags':
      return (g.stats.seamDrags ?? 0) > 0 || (h?.vein.count ?? 0) > 0;
    case 'claims':
      return !!h?.slots.some((s) => !s.claimed);
    default:
      return undefined;
  }
}

/**
 * The haul mode's own fx key for each shared key the shared store plays (errata 30), handed to the
 * fx service by the mode entry (src/modes/haul/index.tsx `soundKeys`). Every value is a key of the
 * haul table (src/services/fx/catalog.haul.ts; src/services/fx/haulTable.test.ts checks it, and
 * that every fx.play literal reachable from the haul screens resolves).
 * Two differ from the errata's list, on purpose: `offline_collect` is the payout chime (the Shift
 * Log plays its own `shift_log` teleprinter when it prints, so the collect would print twice), and
 * `prestige` ("Jump now", step 2 of errata 17) is the condition choice opening (`ui_open`): the
 * long `jump_warp` plays once, with the Jump sequence, when the chosen galaxy starts.
 */
export const HAUL_SHARED_SOUNDS = {
  card_levelup: 'module_levelup',
  mission_complete: 'comms_ack',
  daily_claim: 'daily_relay',
  offline_collect: 'payout',
  prestige: 'ui_open',
  unlock: 'system_online',
} as const;

/** Two Shift Logs of one absence (a resume while the first one is still on screen) as one. */
export function mergeShiftLogs(older: unknown, newer: unknown): unknown {
  const a = older as H.OfflineReport | undefined;
  const b = newer as H.OfflineReport | undefined;
  if (!a || !b) return b ?? a;
  const units: Record<string, number> = { ...a.unitsByOre };
  for (const [ore, n] of Object.entries(b.unitsByOre)) units[ore] = (units[ore] ?? 0) + n;
  return {
    seconds: a.seconds + b.seconds,
    effective: a.effective + b.effective,
    unitsByOre: units,
    rocksDry: a.rocksDry + b.rocksDry,
    pods: a.pods + b.pods,
    inFlight: a.inFlight + b.inFlight,
    credits: a.credits + b.credits,
    noAutopilot: a.noAutopilot && b.noAutopilot,
    shipped: a.shipped + b.shipped,
    launches: a.launches + b.launches,
  } satisfies H.OfflineReport;
}

/**
 * Hangar Expansion bought (or restored) during a run (spec 5.4: "+6 drone cap and 2 idle drones at
 * every run start, for good"): the cap rises at once through `droneCapFor`, and the run in
 * progress gets its start drones now, idle on the rack, so the purchase shows on the map the
 * moment it is made. Later runs get them from `createHaul`. Never above the new cap; once per
 * run (`flags.hangarDrones`), so a restore or a boot re-grant pays nothing twice.
 * One copy of the rule: `H.grantHangarDrones`.
 */
export function grantHangar(cfg: GameConfig, state: GameState, productId: string): GameState {
  // The rule lives with the rules (src/engine/haul/actions.ts); this is the engine seam's hook.
  return H.isHaul(cfg) ? asState(H.grantHangarDrones(cfg, asGame(state), productId)) : state;
}

/**
 * The income an "earn" transmission's target and a pod's cash slot are priced with when the run
 * earns nothing yet (rules-6, rules-7): every drone on the rack is placed where the rules' hint would
 * put it (`bestSlotForDrone`), and the rate of those routes is the price. While a confirmed Jump
 * waits for its condition there is no run: the next galaxy is started with its first offered
 * condition (nothing is kept; the state is only read). 0 when there is still nothing to earn with.
 */
export function haulPricingFloor(cfg: GameConfig, state: GameState, now: number): number {
  if (!H.isHaul(cfg)) return 0;
  let g = asGame(state);
  const pending = g.haulStats?.pendingJump;
  if (!g.haul && pending?.offers.length) g = H.startGalaxy(cfg, g, now, pending.offers[0]);
  if (!g.haul) return 0;
  const rate = H.haulIncome(cfg, g);
  if (rate > 0) return rate;
  for (let guard = 0; guard < 256 && g.haul && g.haul.idle > 0; guard++) {
    const slot = H.bestSlotForDrone(cfg, g);
    if (slot === null) break;
    const next = H.assignDrone(cfg, g, slot);
    if (next === g) break;
    g = next;
  }
  return H.haulIncome(cfg, g);
}

export const haulEngineMode: EngineMode = {
  id: 'haul',
  // Space Miner's old classic saves (key "v1") are not read: the game was never published (spec Decisions).
  saveTag: 'haul1',
  config: withHaulContent,
  create: (cfg, base) => (H.isHaul(cfg) ? asState(H.withHaulFields(cfg, base)) : base),
  reconcile: (cfg, base, raw) => (H.isHaul(cfg) ? asState(H.reconcileHaul(cfg, base, raw)) : base),
  tick: (cfg, state, dt, now, events) => {
    if (!H.isHaul(cfg)) return state;
    // Decision 53: a new day shift starts when the calendar day changed (and the rules' 16 h guard
    // holds). Checked on every tick, so the first tick after opening or resuming starts it too.
    const g = H.haulShift(cfg, asGame(state), now, localDay(now));
    return asState(H.advanceHaul(cfg, g, dt, now, events as H.HaulEvent[] | undefined));
  },
  income: (cfg, state) => {
    const g = asGame(state);
    if (!H.isHaul(cfg) || !g.haul) return 0;
    return H.steadyRate(cfg, H.haulParams(cfg, g as H.HaulGame & { haul: H.HaulState }), g.haul);
  },
  activeIncome: (cfg, state) => (H.isHaul(cfg) ? H.haulIncome(cfg, asGame(state)) : 0),
  offline: (cfg, state, now) => {
    if (!H.isHaul(cfg)) return { seconds: 0, earnings: 0, game: state };
    const r = H.haulOffline(cfg, asGame(state), now);
    return { seconds: r.seconds, earnings: r.earnings, game: asState(r.game), report: r.report };
  },
  prestige: (cfg, state, now, choice) => {
    if (!H.isHaul(cfg)) return state;
    const g = asGame(state);
    const c = (choice as HaulJumpChoice | undefined) ?? defaultJumpChoice(cfg, g);
    if (!c) return state;
    if (c.step === 'confirm') return asState(H.confirmJump(cfg, g, now));
    return asState(H.prestigeHaul(cfg, g, now, c.traitId, c.buys ?? []));
  },
  storyTrigger,
  missionUsable,
  mergeReport: mergeShiftLogs,
  entitle: grantHangar,
  reportAlone: (report) => !!(report as H.OfflineReport | undefined)?.noAutopilot,
  // Decision 42: the Shift Log's ad (or Clearance) adds haul.offline.adBonus (+50 %), not a double.
  offlineAdMultiplier: (cfg) => 1 + (H.isHaul(cfg) ? (cfg.haul.offline?.adBonus ?? 0.5) : 1),
  pricingFloor: haulPricingFloor,
  // A confirmed Jump waits for its condition with no run: "earn" missions are refilled when the galaxy starts.
  awaitsRunStart: (state) => { const g = asGame(state); return !g.haul && !!g.haulStats?.pendingJump; },
};
