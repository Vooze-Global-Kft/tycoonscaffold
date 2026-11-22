/**
 * The web preview's `?preset=fresh|early|mid|late` for a haul game (src/dev/presets.ts asks the
 * entry for these): states of the rules package's scripted player (src/engine/fixtures/haul.ts),
 * started from the app's own new game (`createInitialState` with the haul engine installed), so
 * every shared field is the app's and each state is one the rules can reach.
 * fresh = a new game, early = about 4 min (autopilot online, contracts unlocked), mid = about
 * 25 min (rings 1 to 3), late = about 2 h 20 (all slots, a Jump ready).
 *
 * The balance bot (scripts/content/haul-bot.ts) plays closer to section 8's player and is meant to
 * replace the fixtures here; it cannot be imported by the app while that file also holds its
 * command line (it requires node:fs and node:path, which a phone bundle cannot carry), so it waits
 * for the bot's pure part to move into a file of its own (balance package).
 * Development only: nothing calls this on a phone (src/dev/devtools.ts reads the browser address).
 */
import type { GameConfig } from '../../config/schema';
import type { PresetName } from '../../dev/presets';
import * as E from '../../engine/economy';
import { haulFixtures, playFor } from '../../engine/fixtures/haul';
import * as H from '../../engine/haul';
import * as M from '../../engine/meta';
import type { GameState } from '../../engine/types';

type Run = H.HaulGame & { haul: H.HaulState };

/** Seconds of the scripted player behind each preset (late: the fixtures' own late state, all slots claimed). */
const SECONDS: Record<PresetName, number> = { fresh: 0, early: 4 * 60, mid: 25 * 60, late: 0 };

export function haulPreset(cfg: GameConfig, name: PresetName, now: number): GameState {
  if (!H.isHaul(cfg)) throw new Error('haulPreset needs a haul config');
  const start = E.createInitialState(cfg, now) as unknown as Run;
  // Only what the preset needs: the full fixture set plays 2 h 20 and takes seconds in a browser.
  const run = name === 'late' ? haulFixtures(cfg).late : start.haul ? playFor(cfg, start, SECONDS[name], now) : start;
  const g = run as unknown as GameState;
  // Re-dated to now: no offline popup, timers consistent with the moment of loading.
  let s: GameState = { ...g, lastSavedAt: now, stats: { ...g.stats, clockHigh: now, firstOpenAt: Math.min(g.stats.firstOpenAt, now) } };
  if (name !== 'fresh') s = { ...s, storySeen: cfg.story.map((b) => b.id) };
  s = M.startFreeChestTimer(cfg, s, now - (name === 'fresh' ? 0 : 5 * 3600_000));
  return M.refreshMissions(cfg, M.registerSession(s, now), now);
}
