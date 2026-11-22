/**
 * Stand-ins for the native pieces, shared by the fx unit tests. Not imported
 * by app code.
 */
import type { AudioDriver, PlayerLike, PlayerStatus } from './audio';
import type { Clock } from './clock';
import type { KeyValueStorage } from './settings';

/** A Clock on the global timers and Date, which vitest's fake timers control. */
export const testClock: Clock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/** Records every call made to it, like expo-audio's AudioPlayer would receive them. */
export class FakePlayer implements PlayerLike {
  calls: string[] = [];
  loop = false;
  removed = false;
  private level = 1;
  private listeners = new Set<(status: PlayerStatus) => void>();

  constructor(public source: number) {}

  get volume(): number {
    return this.level;
  }
  set volume(value: number) {
    this.level = value;
    this.calls.push(`volume:${Math.round(value * 1000) / 1000}`);
  }
  play(): void {
    this.calls.push('play');
  }
  pause(): void {
    this.calls.push('pause');
  }
  seekTo(seconds: number): Promise<void> {
    this.calls.push(`seek:${seconds}`);
    return Promise.resolve();
  }
  replace(source: number): void {
    this.calls.push(`replace:${source}`);
    this.source = source;
  }
  remove(): void {
    this.calls.push('remove');
    this.removed = true;
  }
  release(): void {
    this.calls.push('release');
  }
  addListener(_event: 'playbackStatusUpdate', listener: (status: PlayerStatus) => void) {
    this.listeners.add(listener);
    return { remove: () => void this.listeners.delete(listener) };
  }

  /** Delivers a status event, as the native player would. */
  emit(status: PlayerStatus): void {
    for (const listener of [...this.listeners]) listener(status);
  }
  /** The file played to its end. */
  finish(seconds = 0.2): void {
    this.emit({ didJustFinish: true, playing: false, duration: seconds, error: null });
  }
  /** Returns the calls so far and forgets them. */
  take(): string[] {
    const calls = this.calls;
    this.calls = [];
    return calls;
  }
}

export class FakeDriver implements AudioDriver {
  players: FakePlayer[] = [];
  configured = 0;
  failConfigure = false;
  failCreate = false;

  configure(): Promise<void> {
    this.configured++;
    return this.failConfigure ? Promise.reject(new Error('no session')) : Promise.resolve();
  }
  createPlayer(source: number): FakePlayer {
    if (this.failCreate) throw new Error('no player');
    const player = new FakePlayer(source);
    this.players.push(player);
    return player;
  }
  /** The players currently loaded with `source` and not released. */
  playing(source: number): FakePlayer[] {
    return this.players.filter((player) => player.source === source && !player.removed);
  }
  get alive(): FakePlayer[] {
    return this.players.filter((player) => !player.removed);
  }
}

/** AsyncStorage, in memory. */
export class MemoryStorage implements KeyValueStorage {
  data = new Map<string, string>();
  writes = 0;
  fail = false;

  async getItem(key: string): Promise<string | null> {
    if (this.fail) throw new Error('storage is broken');
    return this.data.get(key) ?? null;
  }
  async setItem(key: string, value: string): Promise<void> {
    if (this.fail) throw new Error('storage is broken');
    this.writes++;
    this.data.set(key, value);
  }
}
