import { useSyncExternalStore } from 'react';
import { fx } from './index';
import type { FxSettings } from './settings';

/**
 * The sound, music and haptics switches for a settings screen. Re-renders
 * when any of them changes; change them with `fx.settings.set({ ... })`.
 */
export function useFxSettings(): FxSettings {
  return useSyncExternalStore(fx.settings.subscribe, fx.settings.get, fx.settings.get);
}
