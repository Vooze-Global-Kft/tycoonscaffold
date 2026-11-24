/**
 * The player's desk preferences (spec 4.4 Settings): "Buttons instead of flicks" (`buttons`: the desk
 * shows two plain buttons, Sign and Study, beside the paper instead of asking for the flick; the
 * flick still works). Saved in AsyncStorage under `decree:prefs:v1` (not in the game's save: a device
 * setting, like sound), loaded once at start, observable:
 *
 *   const buttons = usePrefs((p) => p.buttons);        // the desk, the Settings sheet
 *   prefs.set({ buttons: true });                       // the Settings sheet
 *
 * A read or write that fails keeps the default and the value in memory. Owned by the hints and
 * platform package (PLATFORM); the bars package's Settings sheet shows it, the desk package reads it.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export const PREFS_KEY = 'decree:prefs:v1';

export interface DecreePrefs {
  buttons: boolean;
}

export const PREFS_DEFAULT: DecreePrefs = { buttons: false };

interface PrefsStore extends DecreePrefs {
  loaded: boolean;
  set(p: Partial<DecreePrefs>): void;
}

/** Only known keys of the right type survive a load. */
export function cleanPrefs(raw: unknown): DecreePrefs {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return { buttons: typeof o.buttons === 'boolean' ? o.buttons : PREFS_DEFAULT.buttons };
}

export const usePrefs = create<PrefsStore>((set, get) => ({
  ...PREFS_DEFAULT,
  loaded: false,
  set: (p) => {
    const next = cleanPrefs({ buttons: get().buttons, ...p });
    set({ ...next, loaded: true });
    void AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => {});
  },
}));

/** Loads the saved preferences once (called at module load; harmless to call again). */
export async function loadPrefs(): Promise<void> {
  if (usePrefs.getState().loaded) return;
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    // A choice made while loading wins over the saved one.
    if (!usePrefs.getState().loaded) usePrefs.setState({ ...cleanPrefs(raw ? JSON.parse(raw) : null), loaded: true });
  } catch {
    usePrefs.setState({ loaded: true });
  }
}

void loadPrefs();

/** The imperative face: `prefs.set({ buttons })`, `prefs.get()`. */
export const prefs = {
  set: (p: Partial<DecreePrefs>) => usePrefs.getState().set(p),
  get: (): DecreePrefs => cleanPrefs(usePrefs.getState()),
};
