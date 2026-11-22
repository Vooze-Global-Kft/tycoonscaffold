/**
 * Prepared game states on iOS and Android: none. The web build takes ./presets.web.ts (the bot
 * that plays the game to each preset, and the mode's own presets the entry hands over); here the
 * same names do nothing, so the phone bundles carry no bot (store-13, phone-12, perf-8).
 */
import type { GameConfig } from '../config/schema';
import * as E from '../engine/economy';
import type { GameState } from '../engine/types';

export const PRESETS = ['fresh', 'early', 'mid', 'late'] as const;
export type PresetName = (typeof PRESETS)[number];

/** Phones keep no mode presets (the haul entry hands over none there either). */
export function setModePresets(fn: ((cfg: GameConfig, name: PresetName, now: number) => GameState) | null): void {
  void fn;
}

/** Never called on phones (./devtools.ts applies no preset): a new game, for the same signature as the web file. */
export function buildPreset(cfg: GameConfig, name: PresetName, now: number): GameState {
  void name;
  return E.createInitialState(cfg, now);
}
