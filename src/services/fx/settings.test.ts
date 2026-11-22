import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, SettingsStore } from './settings';
import { MemoryStorage } from './testkit';

const KEY = 'fx:settings:v1';
/** Lets queued promise callbacks (the chained writes) run. */
const settle = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

describe('SettingsStore', () => {
  it('starts with everything on', () => {
    expect(new SettingsStore(null).get()).toEqual({ sound: true, music: true, haptics: true });
  });

  it('set changes only what was passed and returns a new frozen snapshot', () => {
    const store = new SettingsStore(null);
    const before = store.get();
    store.set({ music: false });
    const after = store.get();
    expect(after).toEqual({ sound: true, music: false, haptics: true });
    expect(after).not.toBe(before);
    expect(Object.isFrozen(after)).toBe(true);
    expect(DEFAULT_SETTINGS).toEqual({ sound: true, music: true, haptics: true });
  });

  it('get returns the same object until something changes (useSyncExternalStore needs that)', () => {
    const store = new SettingsStore(null);
    expect(store.get()).toBe(store.get());
    const snapshot = store.get();
    store.set({ sound: true });
    expect(store.get()).toBe(snapshot);
  });

  it('notifies subscribers on change only, and stops after unsubscribe', () => {
    const store = new SettingsStore(null);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.set({ haptics: false });
    store.set({ haptics: false });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith({ sound: true, music: true, haptics: false });
    unsubscribe();
    store.set({ haptics: true });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('a listener that throws does not stop the others', () => {
    const store = new SettingsStore(null);
    const second = vi.fn();
    store.subscribe(() => {
      throw new Error('boom');
    });
    store.subscribe(second);
    expect(() => store.set({ sound: false })).not.toThrow();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('ignores values that are not booleans and keys it does not know', () => {
    const store = new SettingsStore(null);
    store.set({ sound: 'no', volume: 3, music: undefined } as never);
    store.set(undefined as never);
    expect(store.get()).toEqual(DEFAULT_SETTINGS);
  });

  it('saves every change', async () => {
    const storage = new MemoryStorage();
    const store = new SettingsStore(storage);
    store.set({ sound: false });
    await settle();
    expect(JSON.parse(storage.data.get(KEY) as string)).toEqual({ sound: false, music: true, haptics: true });
    store.set({ haptics: false });
    await settle();
    expect(JSON.parse(storage.data.get(KEY) as string)).toEqual({ sound: false, music: true, haptics: false });
  });

  it('several changes in one go are written once, with the final state', async () => {
    const storage = new MemoryStorage();
    const store = new SettingsStore(storage);
    store.set({ sound: false });
    store.set({ music: false });
    store.set({ sound: true });
    await settle();
    expect(storage.writes).toBe(1);
    expect(JSON.parse(storage.data.get(KEY) as string)).toEqual({ sound: true, music: false, haptics: true });
  });

  it('load restores what was saved and tells subscribers', async () => {
    const storage = new MemoryStorage();
    storage.data.set(KEY, JSON.stringify({ sound: false, music: true, haptics: false }));
    const store = new SettingsStore(storage);
    const listener = vi.fn();
    store.subscribe(listener);
    await store.load();
    expect(store.get()).toEqual({ sound: false, music: true, haptics: false });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(storage.writes).toBe(0);
  });

  it('load runs once', async () => {
    const storage = new MemoryStorage();
    const getItem = vi.spyOn(storage, 'getItem');
    const store = new SettingsStore(storage);
    await Promise.all([store.load(), store.load()]);
    await store.load();
    expect(getItem).toHaveBeenCalledTimes(1);
  });

  it('a switch flipped before the saved settings arrive wins, and does not wipe the others', async () => {
    const storage = new MemoryStorage();
    storage.data.set(KEY, JSON.stringify({ sound: false, music: false, haptics: false }));
    const store = new SettingsStore(storage);
    store.set({ haptics: true }); // already true by default: no change, but the player chose it
    store.set({ music: false });
    await store.load();
    await settle();
    expect(store.get()).toEqual({ sound: false, music: false, haptics: true });
    expect(JSON.parse(storage.data.get(KEY) as string)).toEqual({ sound: false, music: false, haptics: true });
  });

  it('keeps the defaults when the saved data is missing, corrupt or the wrong shape', async () => {
    for (const raw of [undefined, 'not json', '42', 'null', '[]', JSON.stringify({ sound: 'off', music: 0 })]) {
      const storage = new MemoryStorage();
      if (raw !== undefined) storage.data.set(KEY, raw);
      const store = new SettingsStore(storage);
      await expect(store.load()).resolves.toBeUndefined();
      expect(store.get()).toEqual(DEFAULT_SETTINGS);
    }
  });

  it('accepts a partial save from an older version', async () => {
    const storage = new MemoryStorage();
    storage.data.set(KEY, JSON.stringify({ music: false, extra: 1 }));
    const store = new SettingsStore(storage);
    await store.load();
    expect(store.get()).toEqual({ sound: true, music: false, haptics: true });
  });

  it('a broken storage never throws and never blocks the switches', async () => {
    const storage = new MemoryStorage();
    storage.fail = true;
    const store = new SettingsStore(storage);
    await expect(store.load()).resolves.toBeUndefined();
    expect(() => store.set({ sound: false })).not.toThrow();
    await settle();
    expect(store.get().sound).toBe(false);
    // Storage recovers: later changes are saved again.
    storage.fail = false;
    store.set({ music: false });
    await settle();
    expect(JSON.parse(storage.data.get(KEY) as string)).toEqual({ sound: false, music: false, haptics: true });
  });

  it('works without any storage', async () => {
    const store = new SettingsStore(null);
    await store.load();
    store.set({ music: false });
    expect(store.get().music).toBe(false);
  });
});
