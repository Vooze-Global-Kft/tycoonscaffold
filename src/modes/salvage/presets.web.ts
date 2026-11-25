/**
 * PLACEHOLDER: the web preview's `?preset=fresh|early|mid|late` for a salvage game. The ground work has
 * no bot and no designed states: every preset is a fresh game (the app's own createInitialState),
 * except that `mid` and `late` carry a full stack and some placeholder cash so the unloading can be
 * looked at at once. The rules engineers replace this with bot states. Web only (Metro takes
 * ./presets.ts for iOS and Android).
 */
import type { GameConfig } from '../../config/schema';
import type { PresetName } from '../../dev/presets';
import * as E from '../../engine/economy';
import * as R from '../../engine/salvage';
import type { GameState } from '../../engine/types';

export function salvagePreset(cfg: GameConfig, name: PresetName, now: number): GameState {
  if (!R.isSalvage(cfg)) throw new Error('salvagePreset needs a salvage config');
  const base = R.withSalvageFields(cfg, E.createInitialState(cfg, now));
  if (name === 'fresh' || name === 'early') return base;
  const cash = name === 'mid' ? 150 : 5000;
  return { ...base, cash, salvage: { ...base.salvage, carried: cfg.salvage.loop.capacity } } as GameState;
}
