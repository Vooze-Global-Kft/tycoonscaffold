/**
 * Sound, music and haptics: the one thing game code calls.
 *
 *   import { fx } from '../services/fx';
 *
 *   fx.init();                                // once, at startup
 *   fx.music.start();
 *   fx.play('buy');                           // sound + vibration from the catalogue
 *   fx.play('tap', { step: comboLevel });     // ladder sounds take a step
 *   fx.settings.set({ music: false });        // saved; the engines follow at once
 *
 * Every event is a key of `FX` in ./catalog.ts. The app plays from the game's
 * generated `fxTable` (that catalogue without its briefs and without other
 * modes' events), so the catalogue itself never ships. Sound files are picked
 * up by name from the game's sound pack shared/sfx/<pack>/ and from
 * games/<id>/assets/sfx/ (see scripts/lib/games.js);
 * an event without a file is silent and still vibrates. Nothing here throws
 * into game code. Details and rules for callers: docs/design/fx-service-notes.md.
 *
 * This file only wires the real platform pieces together; the logic lives in
 * core.ts (the service), audio.ts (expo-audio) and haptics.ts (expo-haptics).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { fxTable, gameSounds } from '../../config/game';
import { AudioEngine, expoAudioDriver } from './audio';
import type { FxName as CatalogName, FxRuntimeDef } from './catalog';
import type { HaulFxName } from './catalog.haul';
import { systemClock } from './clock';
import { createFx, type Fx } from './core';
import { createHaptics } from './haptics';
import { SettingsStore } from './settings';

export type { FxDef, FxRuntimeDef, HapticStep } from './catalog';
/** Every event a game can play: the shared catalogue's keys and the haul mode's own (./catalog.haul.ts). Each game's table holds its mode's only. */
export type FxName = CatalogName | HaulFxName;
export type { Fx, PlayOptions } from './core';
export type { FxSettings } from './settings';

const os = Platform.OS;
const androidApi = os === 'android' ? Number(Platform.Version) : undefined;
const log = __DEV__ ? (message: string) => console.log(`[fx] ${message}`) : undefined;

const audio = new AudioEngine({ os, androidApi, driver: () => expoAudioDriver(os), log });

// Fast Refresh re-runs this module when the catalogue or the engine is edited.
// Hand the players of the previous copy back first, or its music keeps playing under the new one.
const scope = globalThis as { __fxAudio?: AudioEngine };
scope.__fxAudio?.dispose();
scope.__fxAudio = audio;

export const fx: Fx<FxName> = createFx({
  // Typed by the catalogue's keys: an event of another mode is simply not in this game's table (silent, logged in development).
  catalog: fxTable as Readonly<Record<FxName, FxRuntimeDef>>,
  sounds: gameSounds,
  audio,
  haptics: createHaptics({ os, androidApi }),
  settings: new SettingsStore(AsyncStorage),
  now: systemClock.now,
  log,
  lifecycle: {
    // 'inactive' (iOS: app switcher, a system dialog, the purchase sheet) counts as away.
    isActive: () => AppState.currentState !== 'background' && AppState.currentState !== 'inactive',
    subscribe: (listener) => {
      AppState.addEventListener('change', (state) => listener(state === 'active'));
    },
  },
  onGesture:
    os === 'web' && typeof window !== 'undefined'
      ? (listener) => {
          for (const event of ['pointerup', 'keydown', 'click']) window.addEventListener(event, listener, true);
        }
      : undefined,
});

// Development only: `fx` is also on the console, so any event can be auditioned by hand, e.g. fx.play('prestige').
if (__DEV__) (globalThis as { fx?: Fx<FxName> }).fx = fx;
