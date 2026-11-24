/**
 * The desk preferences (./prefs.ts): "Buttons instead of flicks" is saved under decree:prefs:v1 and
 * survives a reload; a broken or foreign value falls back to the default.
 */
import { describe, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => new Map<string, string>());
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: async (k: string) => storage.get(k) ?? null, setItem: async (k: string, v: string) => void storage.set(k, v), removeItem: async (k: string) => void storage.delete(k) },
}));

describe('the desk preferences', () => {
  it('cleans what it loads', async () => {
    const { cleanPrefs, PREFS_DEFAULT } = await import('./prefs');
    expect(cleanPrefs(null)).toEqual(PREFS_DEFAULT);
    expect(cleanPrefs({ buttons: 'yes', other: 1 })).toEqual(PREFS_DEFAULT);
    expect(cleanPrefs({ buttons: true })).toEqual({ buttons: true });
  });

  it('saves the switch and loads it again after a restart', async () => {
    vi.resetModules();
    storage.clear();
    const first = await import('./prefs');
    await first.loadPrefs();
    expect(first.prefs.get().buttons).toBe(false);
    first.prefs.set({ buttons: true });
    await vi.waitFor(() => expect(JSON.parse(storage.get(first.PREFS_KEY) ?? '{}').buttons).toBe(true));
    vi.resetModules();
    const again = await import('./prefs');
    await again.loadPrefs();
    expect(again.usePrefs.getState().buttons).toBe(true);
  });
});
