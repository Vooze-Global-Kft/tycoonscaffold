/**
 * The decree engine as an engine mode (src/engine/mode.ts): how the shared engine functions reach
 * the decree rules (src/engine/decree.ts, the rules' public index) without importing them.
 *
 * Decree mode only (scripts/lib/modes.js lists this file with the decree folders): the decree mode
 * entry (src/modes/decree/index.tsx) installs it, so only a decree game's bundle carries the decree
 * rules. Pure TypeScript, no React. Written by the skeleton; owned afterwards by P1b
 * (docs/design/office-build-plan.md).
 *
 * The two seams of 2.15: `paysOnCompute` (the store grants the away earnings in the update that
 * computes them; the report's ad grants only the extra) and `catchUpSeconds: 0` (every absence
 * follows the away rules; the store's 300 s catch-up never runs).
 */
import type { GameConfig } from '../config/schema';
import { DecreeSchema } from '../config/schema.decree';
import * as R from './decree';
import type { EngineMode } from './mode';
import type { GameState } from './types';

/**
 * A decree game's config with its `decree` block parsed by the decree schema (defaults filled in).
 * The shared schema keeps the block opaque (src/config/schema.ts), so every reader of a decree game's
 * data goes through this once: the mode entry at install, the game-data lint, the Node tools.
 * Throws with the schema's message when the block is invalid or missing. Other configs come back
 * as they are.
 */
export function withDecreeContent(cfg: GameConfig): GameConfig {
  if (cfg.mode !== 'decree') return cfg;
  if (!cfg.decree) throw new Error('mode is "decree" but there is no "decree" block');
  const r = DecreeSchema.safeParse(cfg.decree);
  if (!r.success) throw new Error(`the "decree" block is invalid:\n${r.error.message}`);
  return { ...cfg, decree: r.data as unknown as Record<string, unknown> };
}

const asState = (g: R.DecreeGame) => g as GameState;
/** A save of a decree game always has `decree` after reconcile; a bare shared state (a test) gets one. */
const run = (cfg: R.DecreeConfig, g: GameState): R.DecreeGame => R.withDecreeFields(cfg, g);

export const decreeEngineMode: EngineMode = {
  id: 'decree',
  saveTag: 'decree1',
  config: withDecreeContent,
  create: (cfg, base) => (R.isDecree(cfg) ? asState(R.createDecree(cfg, base)) : base),
  reconcile: (cfg, base, raw) => {
    if (!R.isDecree(cfg)) return base;
    try {
      return asState(R.reconcileTerm(cfg, R.reconcileDecree(cfg, base, raw), raw));
    } catch {
      // Never throws (EngineMode contract): a save the rules cannot read starts afresh.
      try {
        return asState(R.createDecree(cfg, base));
      } catch {
        return base;
      }
    }
  },
  tick: (cfg, state, dt, now, events) => (R.isDecree(cfg) ? asState(R.advanceDecree(cfg, run(cfg, state), dt, now, events as R.DecreeEvent[] | undefined)) : state),
  // income(): I_away (2.15); activeIncome(): I.
  income: (cfg, state) => (R.isDecree(cfg) ? R.decreeIncome(cfg, run(cfg, state)) : 0),
  activeIncome: (cfg, state) => (R.isDecree(cfg) ? R.decreeActiveIncome(cfg, run(cfg, state)) : 0),
  offline: (cfg, state, now) => {
    if (!R.isDecree(cfg)) return { seconds: 0, earnings: 0, game: state };
    const r = R.decreeOffline(cfg, run(cfg, state), now);
    return { seconds: r.seconds, earnings: r.earnings, game: asState(r.game), ...(r.report ? { report: r.report } : {}) };
  },
  // The move up (2.12): refused (the same object) unless canPrestige; no choice (the next office is fixed).
  prestige: (cfg, state, now) => (R.isDecree(cfg) ? asState(R.moveUp(cfg, run(cfg, state), now, [])) : state),
  // The store's prestige gate (a decree game earns no prestige points): the result sheet after a win meeting both requirements.
  canPrestige: (cfg, state) => R.isDecree(cfg) && R.canMoveUp(cfg, run(cfg, state)),
  entitle: (cfg, state, productId) => (R.isDecree(cfg) ? asState(R.entitleDecree(cfg, run(cfg, state), productId)) : state),
  mergeReport: R.mergeAwayReports,
  reportAlone: R.awayReportAlone,
  // 5.11: the away report's ad adds decree.ads.awayBonus (+50 %).
  offlineAdMultiplier: (cfg) => 1 + (R.isDecree(cfg) ? cfg.decree.ads.awayBonus : 0.5),
  // Every amount shown or paid goes through roundDibs (conventions).
  roundPayout: (cfg, amount) => (R.isDecree(cfg) ? R.roundDibs(cfg, amount) : amount),
  // 2.15: paid when computed, and no full-speed catch-up.
  paysOnCompute: true,
  catchUpSeconds: 0,
};
