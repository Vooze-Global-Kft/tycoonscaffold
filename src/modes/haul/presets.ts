/**
 * The web preview's `?preset=fresh|early|mid|late` for a haul game (src/dev/presets.ts asks the
 * entry for these): states of the rules package's fixtures (src/engine/fixtures/haul.ts), played by
 * its scripted player on the game's own config, so each is a state the rules can reach.
 * fresh = a new game, early = about 3 min (autopilot online, contracts unlocked), mid = about
 * 25 min (rings 1 to 3), late = about 2 h 20 (all slots, a Jump available). Crude on purpose;
 * the balance package replaces them with its bot's states.
 */
import type { GameConfig } from '../../config/schema';
import type { PresetName } from '../../dev/presets';
import { freshHaulGame, haulFixtures, playFor } from '../../engine/fixtures/haul';
import * as H from '../../engine/haul';
import * as M from '../../engine/meta';
import type { GameState } from '../../engine/types';

/** Seconds of the fixtures' scripted player behind each preset (late: the fixtures' own late state, all slots claimed). */
const SECONDS: Record<PresetName, number> = { fresh: 0, early: 180, mid: 25 * 60, late: 0 };

export function haulPreset(cfg: GameConfig, name: PresetName, now: number): GameState {
  if (!H.isHaul(cfg)) throw new Error('haulPreset needs a haul config');
  // Only what the preset needs: the full fixture set plays 2 h 20 and takes seconds in a browser.
  const run = name === 'late' ? haulFixtures(cfg).late : playFor(cfg, freshHaulGame(cfg), SECONDS[name]);
  const g = run as unknown as GameState;
  // Re-dated to now: no offline popup, timers consistent with the moment of loading.
  let s: GameState = { ...g, lastSavedAt: now, stats: { ...g.stats, clockHigh: now, firstOpenAt: Math.min(g.stats.firstOpenAt, now) } };
  if (name !== 'fresh') s = { ...s, storySeen: cfg.story.map((b) => b.id) };
  s = M.startFreeChestTimer(cfg, s, now - (name === 'fresh' ? 0 : 5 * 3600_000));
  return M.refreshMissions(cfg, M.registerSession(s, now), now);
}
