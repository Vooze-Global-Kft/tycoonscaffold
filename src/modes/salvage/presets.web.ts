/**
 * The web preview's `?preset=` states of a salvage game: the four FROZEN states of the hour-0 contract
 * (src/engine/fixtures/salvage.ts), laid over the app's own fresh shared state:
 *   ?preset=fresh   second 0, the full yard
 *   ?preset=m5      minute 5 (also ?preset=early): the sack truck, a yard hand, a lot in the bays, the flatbed away
 *   ?preset=m30     minute 30 (also ?preset=mid): everything of the hour owned, a heat ready to pour, a held bay, a deal, the truck out
 *   ?preset=back    after time away (also ?preset=late): the away card waiting
 * (m5, m30 and back reach this function as early, mid and late: src/dev/presets.web.ts PRESET_ALIASES.)
 * The states are made for the frozen test content, which is games/scrap-yard/game.json's block until the
 * content package writes the real one; on other content they still load (things the content lacks are
 * not drawn). The rules package replaces them with bot states once the rules run. Web only (Metro takes
 * ./presets.ts for iOS and Android).
 */
import type { GameConfig } from '../../config/schema';
import type { PresetName } from '../../dev/presets';
import * as E from '../../engine/economy';
import { fixtureGame, type FixtureName } from '../../engine/fixtures/salvage';
import * as R from '../../engine/salvage';
import type { GameState } from '../../engine/types';

const BY_PRESET: Record<PresetName, FixtureName> = { fresh: 'fresh', early: 'm5', mid: 'm30', late: 'back' };

export function salvagePreset(cfg: GameConfig, name: PresetName, now: number): GameState {
  if (!R.isSalvage(cfg)) throw new Error('salvagePreset needs a salvage config');
  const base = E.createInitialState(cfg, now);
  return { ...fixtureGame(BY_PRESET[name], base, now), lastSavedAt: now } as GameState;
}
