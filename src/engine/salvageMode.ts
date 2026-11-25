/**
 * PLACEHOLDER: the salvage rules as an engine mode (src/engine/mode.ts), how the shared engine reaches
 * the scrapyard's rules (src/engine/salvage.ts) without importing them. Written by the ground work
 * (docs/design/yard-ground.md); the rules engineers replace it with the specification's rules
 * (docs/design/yard-design.md) and keep its two seams.
 *
 * Salvage mode only (scripts/lib/modes.js lists this file with the salvage folders): the salvage entry
 * (src/modes/salvage/index.tsx) installs it, so only a salvage game's bundle carries these rules.
 *
 * Time away (docs/design/research/yard-tech.md "Time away"): `paysOnCompute: true` (the store grants
 * the away earnings in the update that computes them; BRIEF lesson 5) and `catchUpSeconds: 0` (every
 * absence follows the mode's away rules; the store's 300 s full-speed catch-up never runs). The
 * placeholder's away rules earn nothing: the test loop needs the worker standing in the yard.
 */
import type { GameConfig } from '../config/schema';
import { SalvageSchema } from '../config/schema.salvage';
import * as R from './salvage';
import type { EngineMode } from './mode';
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

const run = (cfg: R.SalvageConfig, g: GameState): R.SalvageGame => R.withSalvageFields(cfg, g);

export const salvageEngineMode: EngineMode = {
  id: 'salvage',
  saveTag: 'salvage0',
  config: withSalvageContent,
  create: (cfg, base) => (R.isSalvage(cfg) ? R.createSalvage(cfg, base) : base),
  reconcile: (cfg, base, raw) => {
    if (!R.isSalvage(cfg)) return base;
    try {
      return R.reconcileSalvage(cfg, base, raw);
    } catch {
      // Never throws (EngineMode contract): a save the rules cannot read starts afresh.
      try {
        return R.createSalvage(cfg, base);
      } catch {
        return base;
      }
    }
  },
  tick: (cfg, state, dt, _now, events) => (R.isSalvage(cfg) ? R.advanceSalvage(cfg, run(cfg, state), dt, events as R.SalvageEvent[] | undefined) : state),
  // The test loop earns only while the worker stands at the machine: no steady income.
  income: () => 0,
  activeIncome: () => 0,
  // PLACEHOLDER: the absence is measured as the shared rules measure it (from the later of the last save and
  // the latest clock seen, so a clock moved back pays nothing twice), and nothing is earned in it.
  offline: (_cfg, state, now) => {
    const raw = (now - Math.max(state.lastSavedAt, state.stats.clockHigh ?? 0)) / 1000;
    return { seconds: Number.isFinite(raw) && raw > 0 ? raw : 0, earnings: 0, game: state };
  },
  // No run reset in the ground work.
  prestige: (_cfg, state) => state,
  canPrestige: () => false,
  paysOnCompute: true,
  catchUpSeconds: 0,
};
