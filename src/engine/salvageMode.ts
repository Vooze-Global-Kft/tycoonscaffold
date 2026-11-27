/**
 * The salvage rules as an engine mode (src/engine/mode.ts): how the shared engine reaches the
 * scrapyard's rules (src/engine/salvage.ts) without importing them. Salvage mode only
 * (scripts/lib/modes.js lists this file with the salvage folders): the salvage entry
 * (src/modes/salvage/index.tsx) installs it, so only a salvage game's bundle carries these rules.
 *
 * Time away (yard-stage1.md 2.16): `paysOnCompute: true` and `catchUpSeconds: 0` (every absence follows
 * the mode's away pass, the same engine, E17). MONEY ONCE: the away pass pays into `game.cash` itself
 * and returns `earnings: 0` with no `report`, so the store's grant adds nothing and shows no popup of
 * its own; the one away card is `salvage.away` (salvageMode.test.ts pins it). Save tag `salvage1`; the
 * state's layout is `salvage.v` (2): a save of another layout starts afresh.
 * Income: `income` and `activeIncome` are § a second, the facade's incomeRate (§ a minute) / 60.
 */
import type { GameConfig } from '../config/schema';
import { SalvageSchema } from '../config/schema.salvage';
import type { EngineMode } from './mode';
import * as R from './salvage';
import { restartKeeps } from './salvage/state2Money';
import type { GameState } from './types';

/**
 * A salvage game's config with its `salvage` block parsed by the salvage schema (defaults filled in).
 * Throws with the schema's message when the block is invalid or missing. Other configs come back as they are.
 */
export function withSalvageContent(cfg: GameConfig): GameConfig {
  if (cfg.mode !== 'salvage') return cfg;
  if (!cfg.salvage) throw new Error('mode is "salvage" but there is no "salvage" block');
  const r = SalvageSchema.safeParse(cfg.salvage);
  if (!r.success) throw new Error(`the "salvage" block is invalid:\n${r.error.message}`);
  return { ...cfg, salvage: r.data as unknown as Record<string, unknown> };
}

const run = (cfg: R.SalvageConfig, g: GameState): R.SalvageGame => R.withSalvageFields(cfg, g, g.lastSavedAt || 0);

export const salvageEngineMode: EngineMode = {
  id: 'salvage',
  saveTag: R.SAVE_TAG,
  config: withSalvageContent,
  create: (cfg, base) => (R.isSalvage(cfg) ? R.createSalvage(cfg, base, base.lastSavedAt || 0) : base),
  // "Start the yard again" keeps what was paid for and what a parent answered (state2Money.ts restartKeeps; M3).
  onReset: (cfg, old, fresh) => (R.isSalvage(cfg) ? (restartKeeps(old as never, fresh as never) as GameState) : fresh),
  reconcile: (cfg, base, raw) => {
    if (!R.isSalvage(cfg)) return base;
    try {
      return R.reconcileSalvage(cfg, base, raw, base.lastSavedAt || 0);
    } catch {
      // Never throws (EngineMode contract): a save the rules cannot read starts afresh.
      try {
        return R.createSalvage(cfg, base, base.lastSavedAt || 0);
      } catch {
        return base;
      }
    }
  },
  tick: (cfg, state, dt, now, events) => (R.isSalvage(cfg) ? R.advanceSalvage(cfg, run(cfg, state), dt, now, events as R.SalvageEvent[] | undefined) : state),
  income: (cfg, state) => (R.isSalvage(cfg) ? R.steadyIncomeRate(cfg, run(cfg, state)) : 0),
  activeIncome: (cfg, state) => (R.isSalvage(cfg) ? R.activeIncomeRate(cfg, run(cfg, state)) : 0),
  offline: (cfg, state, now) => {
    if (!R.isSalvage(cfg)) return { seconds: 0, earnings: 0, game: state };
    const r = R.salvageOffline(cfg, run(cfg, state), now);
    return { seconds: r.seconds, earnings: r.earnings, game: r.game, report: r.report };
  },
  // No run reset in stage 1.
  prestige: (_cfg, state) => state,
  canPrestige: () => false,
  paysOnCompute: true,
  catchUpSeconds: 0,
  // rules-money wave 2 (2.15.5, 2.15.4, 2.16; RULING2 15): a paid pack reaches its quote (the ledger by id; the
  // sheet's own result to its own quote; a later arrival to the oldest standing quote whose known ids lack it);
  // the 72 hours on the store's clock after a fresh listing; the age band's treatment of ad requests. Pure; the
  // SAME object when nothing changes (a game of another mode is handed back as it is).
  grantProduct: (cfg, state, arrival) => (R.isSalvage(cfg) ? R.grantProduct(cfg, state as R.SalvageGame, arrival) : state),
  afterListing: (cfg, state, listing, now) => (R.isSalvage(cfg) ? R.afterListing(cfg, state as R.SalvageGame, listing, now) : state),
  adAudience: (cfg, state) => (R.isSalvage(cfg) && (state as Partial<R.SalvageGame>).salvage ? R.adAudience(state as R.SalvageGame) : null),
};
