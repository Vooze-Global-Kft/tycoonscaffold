/**
 * The web preview's `?preset=fresh|early|mid|late` for a haul game (src/dev/presets.ts asks the
 * entry for these), started from the app's own new game (`createInitialState` with the haul engine
 * installed), so every shared field is the app's and each state is one the rules can reach.
 * fresh = a new game; early = 4 min and mid = 25 min of the balance bot (src/engine/haul/bot.ts,
 * section 8's player: autopilot online and contracts unlocked by early, rings 1 to 3 by mid);
 * late = the fixtures' scripted player at about 2 h 20 (all slots, a Jump ready): the bot needs
 * about 30 s of CPU for that, too long for a page load.
 * Development only: nothing calls this on a phone (src/dev/devtools.ts reads the browser address).
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

/** Bot seconds behind each preset (late: the fixtures' own late state, all slots claimed). */
const SECONDS: Record<PresetName, number> = { fresh: 0, early: 4 * 60, mid: 25 * 60, late: 0 };

/** The bot's game at `seconds` of play from the app's own new game. */
function botAt(cfg: H.HaulConfig, seconds: number, now: number): Run {
  const r = runHaulBot(cfg, { hours: (seconds + 1) / 3600, prestige: false, noOffline: true, keepAt: [seconds], now, base: (at) => E.createInitialState(cfg, at) as unknown as H.HaulGame });
  return r.states[seconds] ?? r.end;
}

export function haulPreset(cfg: GameConfig, name: PresetName, now: number): GameState {
  if (!H.isHaul(cfg)) throw new Error('haulPreset needs a haul config');
  const start = E.createInitialState(cfg, now) as unknown as Run;
  // Only what the preset needs: the full fixture set plays 2 h 20 and takes seconds in a browser.
  const run = name === 'late' ? haulFixtures(cfg).late : name === 'fresh' || !start.haul ? start : botAt(cfg, SECONDS[name], now - SECONDS[name] * 1000);
  const g = run as unknown as GameState;
  // Re-dated to now: no offline popup, timers consistent with the moment of loading.
  let s: GameState = { ...g, lastSavedAt: now, stats: { ...g.stats, clockHigh: now, firstOpenAt: Math.min(g.stats.firstOpenAt, now) } };
  if (name !== 'fresh') s = { ...s, storySeen: cfg.story.map((b) => b.id) };
  s = M.startFreeChestTimer(cfg, s, now - (name === 'fresh' ? 0 : 5 * 3600_000));
  return M.refreshMissions(cfg, M.registerSession(s, now), now);
}
