/**
 * What a mode with its own engine (src/engine/mode.ts) reported during a tick: its own event
 * objects (haul: HaulEvent), pushed to its listeners (the mode's sounds, the scene's effects).
 * The sim and classic engines report through ./events.ts (simEvents) instead. A plain emitter,
 * like simEvents: events arrive ten times a second and must not cause React re-renders. Each
 * listener gets a fresh array nobody writes to afterwards; a listener that throws is reported and
 * skipped.
 */
type Listener = (events: readonly unknown[]) => void;

const listeners = new Set<Listener>();
let report: (error: unknown, where: string) => void = () => {};

export const modeEvents = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  emit(events: readonly unknown[]): void {
    if (events.length === 0 || listeners.size === 0) return;
    listeners.forEach((l) => {
      try {
        l(events);
      } catch (e) {
        report(e, 'modeEvents.listener');
      }
    });
  },
  onError(fn: (error: unknown, where: string) => void): void {
    report = fn;
  },
};

/**
 * A mode's own fx key for each shared key the shared store and screens play (errata 30: the store
 * plays `card_levelup`, `mission_complete`, `offline_collect`, ...; a haul game's table has none of
 * them). The mode entry sets it at install (src/modes/contract.ts, `ModeEntry.soundKeys`); the fx
 * service plays `key(name)`. Empty for sim and classic: their keys play as written. Plain data,
 * no imports, so the entry tests load it under node.
 */
let soundKeys: Readonly<Record<string, string>> = {};

export const modeSounds = {
  set(map: Readonly<Partial<Record<string, string>>> | null): void {
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(map ?? {})) if (typeof v === 'string') next[k] = v;
    soundKeys = next;
  },
  key(name: string): string {
    return soundKeys[name] ?? name;
  },
};

/**
 * The latest frame a mode's scene interpolates between ticks (src/engine/mode.ts `frame`; haul:
 * the route table and the run clock, spec 4.3). The store publishes one after every change of the
 * game while someone listens; the scene copies it into a Reanimated shared value in its listener,
 * so nothing re-renders at 10 Hz. `latest()` is the last frame published (null before the first).
 */
type FrameListener = (frame: unknown) => void;
const frameListeners = new Set<FrameListener>();
let lastFrame: unknown = null;

export const modeFrame = {
  subscribe(listener: FrameListener): () => void {
    frameListeners.add(listener);
    return () => {
      frameListeners.delete(listener);
    };
  },
  /** Whether anyone listens (the store computes a frame only then). */
  listening(): boolean {
    return frameListeners.size > 0;
  },
  publish(frame: unknown): void {
    lastFrame = frame;
    frameListeners.forEach((l) => {
      try {
        l(frame);
      } catch (e) {
        report(e, 'modeFrame.listener');
      }
    });
  },
  latest(): unknown {
    return lastFrame;
  },
};
