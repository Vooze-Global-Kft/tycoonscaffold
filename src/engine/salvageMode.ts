/**
 * The salvage rules as an engine mode (src/engine/mode.ts): how the shared engine reaches the
 * scrapyard's rules (src/engine/salvage.ts) without importing them. Salvage mode only
 * (scripts/lib/modes.js lists this file with the salvage folders): the salvage entry
 * (src/modes/salvage/index.tsx) installs it, so only a salvage game's bundle carries these rules.
 *
 * Time away (yard-stage1.md 2.16): `paysOnCompute: true` (the store grants the away earnings in the
 * update that computes them) and `catchUpSeconds: 0` (every absence follows the mode's away pass, the
 * same rate engine, E5). Save tag `salvage1` (yard-stage1.md 2.13): the ground work's `salvage0` saves
 * are left alone and everyone starts the first yard afresh.
 */
import type { GameConfig } from '../config/schema';
import { SalvageSchema } from '../config/schema.salvage';
import type { EngineMode } from './mode';
import * as R from './salvage';
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
  income: (cfg, state) => (R.isSalvage(cfg) ? R.incomeRate(cfg, run(cfg, state)) : 0),
  activeIncome: (cfg, state) => (R.isSalvage(cfg) ? R.activeIncomeRate(cfg, run(cfg, state)) : 0),
  offline: (cfg, state, now) => {
    if (!R.isSalvage(cfg)) return { seconds: 0, earnings: 0, game: state };
    const r = R.salvageOffline(cfg, run(cfg, state), now);
    return { seconds: r.seconds, earnings: r.earnings, game: r.game, report: r.report ?? undefined };
  },
  // No run reset in stage 1.
  prestige: (_cfg, state) => state,
  canPrestige: () => false,
  paysOnCompute: true,
  catchUpSeconds: 0,
};
