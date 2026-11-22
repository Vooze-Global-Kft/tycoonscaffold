// SANDBOX STUB. The real implementation is built in the main checkout; this file only mirrors
// its public API so the store compiles here. Do not copy this file back.
import { FX, type FxName } from './catalog';

export { FX, type FxName };

export interface FxSettings {
  sound: boolean;
  music: boolean;
  haptics: boolean;
}

export const fx = {
  async init(): Promise<void> {},
  play(_name: FxName, _opts?: { step?: number; volume?: number; haptic?: boolean }): void {},
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
