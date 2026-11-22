/**
 * The player's sound, music and haptics switches. Kept in memory, saved to a
 * key-value store (AsyncStorage in the app) and observable, so a settings
 * screen and the engines stay in step. Pure: the storage is passed in.
 */
export interface FxSettings {
  /** Sound effects. */
  sound: boolean;
  /** The background music loop. */
  music: boolean;
  /** Vibration. */
  haptics: boolean;
}

export const DEFAULT_SETTINGS: FxSettings = Object.freeze({ sound: true, music: true, haptics: true });

/** The part of AsyncStorage the store needs. */
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export type SettingsListener = (settings: FxSettings) => void;

const KEYS = ['sound', 'music', 'haptics'] as const;

export class SettingsStore {
  private current: FxSettings = DEFAULT_SETTINGS;
  private listeners = new Set<SettingsListener>();
  /** Switches the player touched before the saved values arrived: theirs win over the saved ones. */
  private touched = new Set<keyof FxSettings>();
  private loading: Promise<void> | null = null;
  private writes: Promise<void> = Promise.resolve();
  private savePending = false;

  constructor(
    private storage: KeyValueStorage | null,
    private key = 'fx:settings:v1',
  ) {}

  /** The current settings. The same frozen object until something changes, so it works with useSyncExternalStore. */
  get = (): FxSettings => this.current;

  /** Changes one or more switches, tells the listeners at once and saves in the background. */
  set = (partial: Partial<FxSettings>): void => {
    const next = { ...this.current };
    let changed = false;
    for (const k of KEYS) {
      const value = partial?.[k];
      if (typeof value !== 'boolean') continue;
      this.touched.add(k);
      if (value !== next[k]) {
        next[k] = value;
        changed = true;
      }
    }
    if (!changed) return;
    this.commit(next);
    this.save();
  };

  /** Calls `listener` after every change. Returns the function that stops it. */
  subscribe = (listener: SettingsListener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Reads the saved settings once. Never rejects: unreadable or missing data keeps the defaults. */
  load(): Promise<void> {
    return (this.loading ??= this.read());
  }

  private async read(): Promise<void> {
    if (!this.storage) return;
    let saved: unknown;
    try {
      const raw = await this.storage.getItem(this.key);
      if (!raw) return;
      saved = JSON.parse(raw);
    } catch {
      return;
    }
    if (typeof saved !== 'object' || saved === null) return;
    const next = { ...this.current };
    let changed = false;
    for (const k of KEYS) {
      const value = (saved as Record<string, unknown>)[k];
      if (typeof value !== 'boolean' || this.touched.has(k) || value === next[k]) continue;
      next[k] = value;
      changed = true;
    }
    if (changed) this.commit(next);
  }

  private commit(next: FxSettings): void {
    this.current = Object.freeze(next);
    for (const listener of [...this.listeners]) {
      try {
        listener(this.current);
      } catch {
        // One broken listener must not stop the others.
      }
    }
  }

  /**
   * Saves the settings as they are when the write runs. Writes are chained (two
   * quick changes cannot land in the wrong order) and wait for load(), so a
   * switch flipped during startup never wipes the saved value of another one.
   */
  private save(): void {
    const storage = this.storage;
    if (!storage || this.savePending) return;
    this.savePending = true;
    this.writes = this.writes
      .then(() => this.load())
      .then(() => {
        this.savePending = false;
        return storage.setItem(this.key, JSON.stringify(this.current));
      })
      .catch(() => {
        this.savePending = false;
      });
  }
}
