import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFS, PrefsStore, readPrefs, type KeyValueStorage } from './prefsStore';

function memory(initial: Record<string, string> = {}): KeyValueStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: async (k) => data[k] ?? null,
    setItem: async (k, v) => {
      data[k] = v;
    },
  };
}

describe('the preferences store', () => {
  it('starts from the defaults: the player has not been asked about reminders', () => {
    const p = new PrefsStore(null);
    expect(p.get()).toEqual(DEFAULT_PREFS);
    expect(p.get().reminders).toBeNull();
  });

  it('saves a change and reads it back in a new store', async () => {
    const storage = memory();
    const a = new PrefsStore(storage, 'k');
    a.set({ reminders: true, sent: { best: 12 } });
    await a.flushed();
    const b = new PrefsStore(storage, 'k');
    await b.load();
    expect(b.get()).toEqual({ reminders: true, reviewAsks: [], sent: { best: 12 } });
  });

  it('keeps a field changed before the saved values arrived, and takes the others from the save', async () => {
    const storage = memory({ k: JSON.stringify({ reminders: false, reviewAsks: [5] }) });
    const p = new PrefsStore(storage, 'k');
    p.set({ reminders: true });
    await p.load();
    await p.flushed();
    expect(p.get().reminders).toBe(true);
    expect(p.get().reviewAsks).toEqual([5]);
    expect(JSON.parse(storage.data.k)).toEqual({ reminders: true, reviewAsks: [5], sent: {} });
  });

  it('tells its listeners and hands out the same object until something changes', () => {
    const p = new PrefsStore(null);
    const seen: unknown[] = [];
    const stop = p.subscribe((v) => seen.push(v.reminders));
    const before = p.get();
    expect(p.get()).toBe(before);
    p.set({ reminders: false });
    stop();
    p.set({ reminders: true });
    expect(seen).toEqual([false]);
    expect(p.get()).not.toBe(before);
  });

  it('never throws on a broken save', async () => {
    const p = new PrefsStore(memory({ k: '{not json' }), 'k');
    await expect(p.load()).resolves.toBeUndefined();
    expect(p.get()).toEqual(DEFAULT_PREFS);
  });

  it('drops fields of the wrong shape', () => {
    expect(readPrefs({ reminders: 'yes', reviewAsks: [1, 'x', NaN, 3], sent: { a: 1, b: 'two' } })).toEqual({ reviewAsks: [1, 3], sent: { a: 1 } });
    expect(readPrefs(null)).toEqual({});
    expect(readPrefs({ reminders: null })).toEqual({ reminders: null });
  });
});
