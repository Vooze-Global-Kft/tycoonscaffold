/**
 * The web preview's `?preset=fresh|early|mid|late` for a merge game (src/dev/presets.ts asks the
 * entry for these). Skeleton: the rules' hand-made fixtures (src/engine/fixtures/merge.ts) on the
 * game's own config: fresh = a new game (the app's own createInitialState), early = `minute3`,
 * mid = `minute10`, late = `festivalNear`. The numbers package replaces early and mid with bot-played
 * states once the bot exists (spec 9.1: "presets from bot states"), re-dated to the moment of loading.
 * Web only: Metro takes ./presets.ts (none) for iOS and Android.
 * Owned by the numbers and bot package after the skeleton (docs/design/market-build-plan.md).
 */
import type { GameConfig } from '../../config/schema';
import type { PresetName } from '../../dev/presets';
import * as E from '../../engine/economy';
import { mergeFixtures } from '../../engine/fixtures/merge';
import * as R from '../../engine/merge';
import type { GameState } from '../../engine/types';

export function mergePreset(cfg: GameConfig, name: PresetName, now: number): GameState {
  if (!R.isMerge(cfg)) throw new Error('mergePreset needs a merge config');
  const base = E.createInitialState(cfg, now) as R.MergeGame;
  if (name === 'fresh') return base;
  const f = mergeFixtures(cfg);
  const pick = name === 'early' ? f.minute3 : name === 'mid' ? f.minute10 : f.festivalNear;
  // The app's own shared fields (seeds, missions, timers) with the fixture's play and merge state, dated now.
  return { ...base, cash: pick.cash, runEarnings: pick.runEarnings, lifetimeEarnings: pick.lifetimeEarnings, merge: pick.merge, lastSavedAt: now, stats: { ...base.stats, playSeconds: pick.stats.playSeconds, clockHigh: now } } as GameState;
}
