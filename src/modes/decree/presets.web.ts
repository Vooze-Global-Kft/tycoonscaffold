/**
 * The web preview's `?preset=fresh|early|mid|late` for a decree game (src/dev/presets.ts asks the
 * entry for these; spec 9.1: "presets from bot states"). Each is the reference reader's state on the
 * real engine (src/engine/decree/bot.ts, seed 12345, 6 s hand), re-dated to the moment of loading on
 * the app's own shared fields:
 * - fresh: a new game (the app's own createInitialState);
 * - early: the reader at minute 3 of the first mayoral term (a paper on the desk when there is one);
 * - mid: about minute 30 as governor with a boycott running: the reader to minute 26 as governor,
 *   then the happier-club habit (the careless mayor of D38) from that state until a club boycotts
 *   (always-refuse if the habit has not caused one within 20 minutes);
 * - late: the reader as president in term 3 on the call day (the first day the call is allowed): the reader
 *   runs to the eve of that day and the paper on the desk is studied (the reader itself calls at once, D17).
 * While a rule a run needs is not built yet (NotBuiltError), or the run never reaches the moment, the
 * preset falls back to the rules' hand-made fixtures (src/engine/fixtures/decree.ts: early =
 * `mayorMidTerm`, mid = `governorAtCall`, late = `presidentTerm3`), and says so on the console.
 * Web only: Metro takes ./presets.ts (none) for iOS and Android. Written by the bot engineer; the
 * screens lead added the face.
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
  early: { hours: 3 / 60, stop: () => false },
  mid: { hours: 1.5, stop: (g) => g.decree.office === 1 && g.decree.phase === 'governing' && g.stats.playSeconds >= 26 * 60 },
  // The call day (R.canCall) is added in botPresetState, which has the config.
  late: { hours: 4, stop: (g) => g.decree.office === 2 && g.decree.term >= 3 && g.decree.phase === 'governing' },
};

/** mid's second leg: a careless habit from the reader's governor state until a boycott runs. */
const boycottRuns = (g: R.DecreeGame) => g.decree.office === 1 && g.decree.phase === 'governing' && g.decree.strikes.some((s) => s !== null) && !g.decree.desk;

/** The reader's state for a preset, or null when the run stops at an unbuilt rule or never gets there. Pure. */
export function botPresetState(cfg: R.DecreeConfig, name: Exclude<PresetName, 'fresh'>): { game: R.DecreeGame | null; why: string } {
  // late: the reader calls the moment the call is allowed (D17), so the run stops on the eve of the call
  // day with a paper on the desk, and that paper is studied (a refusal commits at once): the call day.
  const eve = (g: R.DecreeGame) => g.decree.office === 2 && g.decree.term >= 3 && g.decree.phase === 'governing' && g.decree.day >= R.callDay(cfg, g) - 1 && g.decree.desk?.type === 'paper' && !g.decree.pending;
  const at = name === 'late' ? { ...PRESET_STOPS.late, stop: eve } : PRESET_STOPS[name];
  try {
    const run = runDecreeBot(cfg, { bot: 'reader', seed: PRESET_SEED, hours: at.hours, wall0: BOT_EPOCH, stop: at.stop, reeval: false });
    if (run.notBuilt) return { game: null, why: `the bot stopped at ${run.notBuilt}(), not built yet` };
    if (name !== 'early' && !at.stop(run.game)) return { game: null, why: `the reader did not reach the "${name}" moment in ${at.hours} h` };
    if (name === 'late') {
      const g = R.canCall(cfg, run.game) ? run.game : R.decide(cfg, run.game, 'refuse', run.game.stats.playSeconds, []);
      return R.canCall(cfg, g) ? { game: g, why: 'bot state (the reader to the eve of the call day in president term 3, then one paper studied)' } : { game: null, why: 'the reader\'s state one paper before the call day did not reach it' };
    }
    if (name !== 'mid') return { game: run.game, why: 'bot state' };
    for (const habit of ['happier', 'alwaysRefuse'] as const) {
      const leg = runDecreeBot(cfg, { bot: habit, seed: PRESET_SEED, hours: 20 / 60, wall0: BOT_EPOCH + run.game.stats.playSeconds * 1000, start: run.game, stop: boycottRuns, reeval: false });
      if (!leg.notBuilt && boycottRuns(leg.game)) return { game: leg.game, why: `bot state (the reader to minute 26 as governor, then ${habit} until a boycott)` };
    }
    return { game: null, why: 'no habit caused a boycott within 20 minutes of the reader\'s governor state' };
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
  // The bots never pick a face (the loading card's choice): a preset carries the first player's, so the
  // portrait, the wall and the signature show as in a played game.
  if (pick.decree.face === null && cfg.decree.cast.players.length) pick = R.pickFace(cfg, pick, cfg.decree.cast.players[0].id);
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
