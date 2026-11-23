/**
 * The app's one preferences store (src/services/prefsStore.ts), saved under the active game's own
 * key, and the hook a settings screen reads it with.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { ACTIVE_GAME_ID } from '../config/game';
import { PrefsStore, type Prefs } from './prefsStore';

export const prefs = new PrefsStore(AsyncStorage, `prefs:${ACTIVE_GAME_ID}:v1`);

/** Re-renders when any preference changes; change them through the services that own them. */
export function usePrefs(): Prefs {
  return useSyncExternalStore(prefs.subscribe, prefs.get, prefs.get);
}
