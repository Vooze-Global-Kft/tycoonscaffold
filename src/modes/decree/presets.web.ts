/**
 * The web preview's `?preset=fresh|early|mid|late` for a decree game (src/dev/presets.ts asks the
 * entry for these; spec 9.1: "presets from bot states"). Each is the reference reader's state on the
 * real engine (src/engine/decree/bot.ts, seed 12345, 6 s hand), re-dated to the moment of loading on
 * the app's own shared fields:
 * - fresh: a new game (the app's own createInitialState);
 * - early: the reader at minute 5 of the first mayoral term (a paper on the desk when there is one);
 * - mid: the reader at the first call of the election as governor (the run-up of 2.10);
 * - late: the reader in the third presidential term.
 * While a rule a run needs is not built yet (NotBuiltError), or the run never reaches the moment, the
 * preset falls back to the rules' hand-made fixtures (src/engine/fixtures/decree.ts: early =
 * `mayorMidTerm`, mid = `governorAtCall`, late = `presidentTerm3`), and says so on the console.
 * Web only: Metro takes ./presets.ts (none) for iOS and Android. Owned by the bot engineer.
 */
import type { GameConfig } from '../../config/schema';
import type { PresetName } from '../../dev/presets';
import * as R from '../../engine/decree';
import { BOT_EPOCH, runDecreeBot } from '../../engine/decree/bot';
import * as E from '../../engine/economy';
import { decreeFixtures } from '../../engine/fixtures/decree';
import type { GameState } from '../../engine/types';

/** The seed of every preset run (the first of the named seeds of 8.1). */
export const PRESET_SEED = 12345;

/** When each preset stops the reader, and the play hours it may take to get there. */
export const PRESET_STOPS: Record<Exclude<PresetName, 'fresh'>, { hours: number; stop: (g: R.DecreeGame) => boolean }> = {
  early: { hours: 5 / 60, stop: () => false },
  mid: { hours: 1.5, stop: (g) => g.decree.office === 1 && g.decree.phase === 'campaign' },
  late: { hours: 4, stop: (g) => g.decree.office === 2 && g.decree.term >= 3 && g.decree.phase === 'governing' },
};

/** The reader's state for a preset, or null when the run stops at an unbuilt rule or never gets there. Pure. */
export function botPresetState(cfg: R.DecreeConfig, name: Exclude<PresetName, 'fresh'>): { game: R.DecreeGame | null; why: string } {
  const at = PRESET_STOPS[name];
  try {
    const run = runDecreeBot(cfg, { bot: 'reader', seed: PRESET_SEED, hours: at.hours, wall0: BOT_EPOCH, stop: at.stop, reeval: false });
    if (run.notBuilt) return { game: null, why: `the bot stopped at ${run.notBuilt}(), not built yet` };
    if (name !== 'early' && !at.stop(run.game)) return { game: null, why: `the reader did not reach the "${name}" moment in ${at.hours} h` };
    return { game: run.game, why: 'bot state' };
  } catch (e) {
    return { game: null, why: `the bot crashed: ${(e as Error).message}` };
  }
}

export function decreePreset(cfg: GameConfig, name: PresetName, now: number): GameState {
  if (!R.isDecree(cfg)) throw new Error('decreePreset needs a decree config');
  const base = E.createInitialState(cfg, now) as R.DecreeGame;
  if (name === 'fresh') return base;
  const bot = botPresetState(cfg, name);
  let pick = bot.game;
  if (!pick) {
    const f = decreeFixtures(cfg);
    pick = name === 'early' ? f.mayorMidTerm : name === 'mid' ? f.governorAtCall : f.presidentTerm3;
    console.warn(`decree preset "${name}": the fixture (${bot.why})`);
  }
  // The app's own shared fields (seeds, timers) with the state's cash, play time and decree state, dated now (no time away is paid on load).
  return {
    ...base,
    cash: pick.cash,
    entitlements: pick.entitlements,
    decree: pick.decree,
    lastSavedAt: now,
    stats: { ...base.stats, playSeconds: pick.stats.playSeconds, clockHigh: now },
  } as GameState;
}
