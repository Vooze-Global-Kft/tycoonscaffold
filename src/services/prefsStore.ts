/**
 * What the app remembers about the player outside the game's save: whether reminders are on, when
 * the rating prompt was shown, the last score sent to each leaderboard. Kept in memory, saved to a
 * key-value store (AsyncStorage in the app) and observable, like the fx settings. Pure: the storage
 * is passed in.
 */
export interface Prefs {
  /** Reminders (local notifications). null: the player has not been asked yet. */
  reminders: boolean | null;
  /** Epoch ms of every rating prompt shown, oldest first. */
  reviewAsks: number[];
  /** The last score sent to each leaderboard, by board key. */
  sent: Record<string, number>;
}

export const DEFAULT_PREFS: Prefs = Object.freeze({ reminders: null, reviewAsks: [], sent: {} });

/** The part of AsyncStorage the store needs. */
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export type PrefsListener = (prefs: Prefs) => void;

/** A saved value read back: only fields of the right shape are kept. */
export function readPrefs(saved: unknown): Partial<Prefs> {
  if (typeof saved !== 'object' || saved === null) return {};
  const s = saved as Record<string, unknown>;
  const out: Partial<Prefs> = {};
  if (typeof s.reminders === 'boolean' || s.reminders === null) out.reminders = s.reminders;
  if (Array.isArray(s.reviewAsks)) out.reviewAsks = s.reviewAsks.filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
  if (typeof s.sent === 'object' && s.sent !== null) {
    out.sent = Object.fromEntries(Object.entries(s.sent as Record<string, unknown>).filter((e): e is [string, number] => typeof e[1] === 'number' && Number.isFinite(e[1])));
  }
  return out;
}

export class PrefsStore {
  private current: Prefs = DEFAULT_PREFS;
  private listeners = new Set<PrefsListener>();
  /** Fields changed before the saved values arrived: the new values win over the saved ones. */
  private touched = new Set<keyof Prefs>();
  private loading: Promise<void> | null = null;
  private writes: Promise<void> = Promise.resolve();
  private savePending = false;

  constructor(
    private storage: KeyValueStorage | null,
    private key = 'prefs:v1',
  ) {}

  /** The current values. The same frozen object until something changes, so it works with useSyncExternalStore. */
  get = (): Prefs => this.current;

  /** Changes one or more fields, tells the listeners at once and saves in the background. */
  set = (partial: Partial<Prefs>): void => {
    const next = { ...this.current, ...partial };
    for (const k of Object.keys(partial) as (keyof Prefs)[]) this.touched.add(k);
    this.commit(next);
    this.save();
  };

  /** Calls `listener` after every change. Returns the function that stops it. */
  subscribe = (listener: PrefsListener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Reads the saved values once. Never rejects: unreadable or missing data keeps the defaults. */
  load(): Promise<void> {
    return (this.loading ??= this.read());
  }

  private async read(): Promise<void> {
    if (!this.storage) return;
    let saved: Partial<Prefs>;
    try {
      const raw = await this.storage.getItem(this.key);
      if (!raw) return;
      saved = readPrefs(JSON.parse(raw));
    } catch {
      return;
    }
    const next = { ...this.current };
    for (const k of Object.keys(saved) as (keyof Prefs)[]) if (!this.touched.has(k)) Object.assign(next, { [k]: saved[k] });
    this.commit(next);
  }

  private commit(next: Prefs): void {
    this.current = Object.freeze(next);
    for (const listener of [...this.listeners]) {
      try {
        listener(this.current);
      } catch {
        // One broken listener must not stop the others.
      }
    }
  }

  /** Writes are chained and wait for load(), so a change made during startup never wipes another saved field. */
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

  /** Resolves when every change made so far has been written (tests, and before the app is closed). */
  flushed(): Promise<void> {
    return this.writes;
  }
}
