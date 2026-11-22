/**
 * The web preview's `?preset=fresh|early|mid|late` for a haul game (src/dev/presets.ts asks the
 * entry for these), started from the app's own new game (`createInitialState` with the haul engine
 * installed), so every shared field is the app's and each state is one the rules can reach.
 * fresh = a new game; early = 4 min and mid = 25 min of the balance bot (src/engine/haul/bot.ts,
 * section 8's player: autopilot online and contracts unlocked by early, rings 1 to 3 by mid);
 * late = the fixtures' scripted player at about 2 h 20 (all slots, a Jump ready): the bot needs
 * about 30 s of CPU for that, too long for a page load.
 * Deterministic: every preset is played from the same new game on the same fixed clock
 * (PRESET_CLOCK: the seeds of a new game come from its clock), for the same number of bot seconds,
 * then re-dated to the moment of loading. So the same preset is the same state at every load and
 * screenshots and reviews can be repeated.
 * Web only: Metro takes ./presets.ts (none) for iOS and Android, so the bot and the fixtures are
 * not in the phone bundles.
 */
import type { GameConfig } from '../../config/schema';
import type { PresetName } from '../../dev/presets';
import * as E from '../../engine/economy';
import { haulFixtures } from '../../engine/fixtures/haul';
import * as H from '../../engine/haul';
// The bot is a rules file outside the public index (it is a development tool, not a rule).
import { runHaulBot } from '../../engine/haul/bot';
import * as M from '../../engine/meta';
import type { GameState } from '../../engine/types';

type Run = H.HaulGame & { haul: H.HaulState };

/** The clock every preset is played on (the new game's seeds come from it). */
export const PRESET_CLOCK = Date.UTC(2026, 10, 1, 12);

/** Bot seconds behind each preset (late: the fixtures' own late state, all slots claimed). */
const SECONDS: Record<PresetName, number> = { fresh: 0, early: 4 * 60, mid: 25 * 60, late: 0 };

/** The bot's game at `seconds` of play from the app's own new game. */
function botAt(cfg: H.HaulConfig, seconds: number, now: number): Run {
  const r = runHaulBot(cfg, { hours: (seconds + 1) / 3600, prestige: false, noOffline: true, keepAt: [seconds], now, base: (at) => E.createInitialState(cfg, at) as unknown as H.HaulGame });
  return r.states[seconds] ?? r.end;
}

export function haulPreset(cfg: GameConfig, name: PresetName, now: number): GameState {
  if (!H.isHaul(cfg)) throw new Error('haulPreset needs a haul config');
  const start = E.createInitialState(cfg, PRESET_CLOCK) as unknown as Run;
  // Only what the preset needs: the full fixture set plays 2 h 20 and takes seconds in a browser.
  const run = name === 'late' ? haulFixtures(cfg).late : name === 'fresh' || !start.haul ? start : botAt(cfg, SECONDS[name], PRESET_CLOCK);
  const g = run as unknown as GameState;
  // Re-dated to now (the bot's state holds no other wall-clock time): no offline popup, timers
  // consistent with the moment of loading, the game opened as long ago as it was played.
  const played = Math.max(0, Math.round(g.stats.playSeconds ?? SECONDS[name])) * 1000;
  let s: GameState = { ...g, lastSavedAt: now, stats: { ...g.stats, clockHigh: now, firstOpenAt: now - played } };
  if (name !== 'fresh') s = { ...s, storySeen: cfg.story.map((b) => b.id) };
  s = M.startFreeChestTimer(cfg, s, now - (name === 'fresh' ? 0 : 5 * 3600_000));
  return M.refreshMissions(cfg, M.registerSession(s, now), now);
}
