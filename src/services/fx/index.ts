// SANDBOX STUB. The real implementation lives in the main checkout
// (/home/user/idle-tycoon-factory/src/services/fx); this file only mirrors its public API so the
// store and services compile here. Never copy this file back.
import { FX, type FxName } from './catalog';

export { FX, type FxName };

export interface FxSettings {
  sound: boolean;
  music: boolean;
  haptics: boolean;
}

export const fx = {
  async init(): Promise<void> {},
  /** `step` is 0-based for ladder sounds (0 = the first file). */
  play(_name: FxName, _opts?: { step?: number; volume?: number; haptic?: boolean }): void {},
  /** Silences everything while something else owns the screen and speakers (a full-screen ad). */
  suspend(_reason?: string): void {},
  resume(_reason?: string): void {},
  /** Maps a level (0..levels-1) onto a ladder sound's steps. */
  ladderStep(_name: FxName, _level: number, _levels: number): number {
    return 0;
  },
  music: { start(): void {}, stop(): void {} },
  settings: {
    get(): FxSettings {
      return { sound: true, music: true, haptics: true };
    },
    set(_patch: Partial<FxSettings>): void {},
    subscribe(_listener: (s: FxSettings) => void): () => void {
      return () => {};
    },
  },
};
