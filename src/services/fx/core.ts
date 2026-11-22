/**
 * The fx service itself: one call per game event, turned into a sound and a
 * vibration according to the catalogue, the player's settings and what the app
 * is doing (foreground, ad on screen). Pure wiring logic: the audio engine,
 * the haptics engine, storage and the app lifecycle are passed in, so the
 * whole service runs in the unit tests. `index.ts` builds the real one.
 */
import type { AudioEngine } from './audio';
import type { FxDef } from './catalog';
import type { HapticsEngine } from './haptics';
import { RateLimiter } from './limiter';
import { DEDUPE_MS, MUSIC, planSounds } from './mix';
import type { FxSettings, SettingsStore } from './settings';
import { VariantPicker, ladderStep } from './variants';

export interface PlayOptions {
  /** Ladder sounds (the tap combo): which rung to play, 0 = the first file. Clamped to the ladder. */
  step?: number;
  /** Scales the catalogue volume for this one play: 0.5 = half as loud as designed. Default 1. */
  volume?: number;
  /** `false` plays the sound without its vibration, for events the player's finger did not cause. */
  haptic?: boolean;
}

export interface Fx<Name extends string = string> {
  /**
   * Loads the settings, sets the audio session up and starts preloading
   * sounds. Call once at startup; calling again returns the same promise.
   * Never rejects. Until it resolves, play() is silent.
   */
  init(): Promise<void>;
  /** Fires one catalogue event: its sound (if the file exists) and its vibration. Never throws. */
  play(name: Name, opts?: PlayOptions): void;
  music: {
    /** The game wants its music loop. It plays whenever the Music setting is on and the app is in front. */
    start(): void;
    /** The game no longer wants music (pauses; a later start() continues the loop). */
    stop(): void;
    /** Music volume, 0..1, on top of the catalogue volume. Not saved. */
    setVolume(volume: number): void;
  };
  settings: {
    get(): FxSettings;
    set(partial: Partial<FxSettings>): void;
    /** Calls `listener` after every change; returns the unsubscribe function. */
    subscribe(listener: (settings: FxSettings) => void): () => void;
  };
  /** Master volume for sound effects, 0..1, on top of each sound's catalogue volume. Not saved. */
  setVolume(volume: number): void;
  /**
   * Silences sounds, music and haptics until resume() is called with the same
   * reason, without touching the settings. For full-screen ads and anything
   * else that takes over the screen and the speaker.
   */
  suspend(reason?: string): void;
  resume(reason?: string): void;
  /**
   * The `step` for a ladder sound when the game's scale has a different length
   * than the ladder: level 0 is the first file, level `levels - 1` the last.
   */
  ladderStep(name: Name, level: number, levels: number): number;
}

/** What the service needs from the sound engine (the real one is `AudioEngine`). */
export type AudioPort = Pick<AudioEngine, 'register' | 'init' | 'preload' | 'has' | 'play' | 'stopAll' | 'refreshSession' | 'music'>;

export interface FxDeps<Catalog extends Readonly<Record<string, FxDef>>> {
  catalog: Catalog;
  /** Bundled sound files by key (`gameSounds`). */
  sounds: Readonly<Record<string, number>>;
  audio: AudioPort;
  haptics: HapticsEngine;
  settings: SettingsStore;
  /** Milliseconds on a monotonic clock. */
  now: () => number;
  random?: () => number;
  /** Is the app in front of the player, and tell me when that changes. */
  lifecycle?: { isActive(): boolean; subscribe(listener: (active: boolean) => void): void };
  /** Web: calls back on taps and key presses, the only moments a browser lets audio start. */
  onGesture?: (listener: () => void) => void;
  /** Development diagnostics (missing files, unknown names). */
  log?: (message: string) => void;
}

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 1;
}

export function createFx<Catalog extends Readonly<Record<string, FxDef>>>(deps: FxDeps<Catalog>): Fx<keyof Catalog & string> {
  const { audio, haptics, settings, now } = deps;
  const catalog: Readonly<Record<string, FxDef>> = deps.catalog;
  const log = deps.log ?? (() => {});
  const limiter = new RateLimiter();
  const picker = new VariantPicker(deps.random);
  const plan = planSounds(catalog, deps.sounds);
  audio.register(plan);

  let started: Promise<void> | null = null;
  /** The saved settings are in: before that nothing may sound or buzz (the player may have switched it off). */
  let loaded = false;
  let active = true;
  const holds = new Set<string>();
  let musicWanted = false;
  let master = 1;
  let previous = settings.get();
  const warned = new Set<string>();

  const live = () => loaded && active && holds.size === 0;

  const syncMusic = (fade: boolean) => {
    audio.music.set(musicWanted && live() && settings.get().music, fade);
  };

  const onSettings = (next: FxSettings) => {
    const before = previous;
    previous = next;
    if (before.sound !== next.sound) {
      if (next.sound) audio.preload();
      else audio.stopAll();
    }
    if (before.haptics && !next.haptics) haptics.cancel();
    if (before.music !== next.music) syncMusic(true);
  };

  const onActive = (next: boolean) => {
    if (next === active) return;
    active = next;
    if (next) {
      audio.refreshSession();
      audio.stopAll(true);
    } else {
      haptics.cancel();
      audio.stopAll();
    }
    syncMusic(false);
  };

  const start = async () => {
    if (deps.lifecycle) {
      active = deps.lifecycle.isActive();
      deps.lifecycle.subscribe(onActive);
    }
    deps.onGesture?.(() => audio.music.kick());
    await settings.load();
    previous = settings.get();
    settings.subscribe(onSettings);
    loaded = true;
    await audio.init();
    // A player who keeps sound off never pays for the players.
    if (previous.sound) audio.preload();
    syncMusic(true);
    const expected = plan.sounds.length + plan.missing.length + (plan.music ? 1 : 0);
    if (plan.missing.length > 0) {
      log(
        plan.missing.length === expected
          ? 'no sound files in the bundle: every event is silent (haptics still work)'
          : `no sound file for: ${plan.missing.join(', ')}`,
      );
    }
    if (plan.unused.length > 0) log(`sound files that no catalogue entry uses: ${plan.unused.join(', ')}`);
  };

  const init = (): Promise<void> =>
    (started ??= start().catch((error) => {
      log(`init failed: ${String(error)}`);
    }));

  return {
    init,

    play(name, opts) {
      try {
        if (!started) void init();
        const def = catalog[name];
        if (!def) {
          if (!warned.has(name)) {
            warned.add(name);
            log(`"${name}" is not in the catalogue`);
          }
          return;
        }
        if (def.loop || !live()) return;
        // The game is making noise, so its music should be too (it may have been stopped from outside).
        audio.music.kick();
        const { sound, haptics: buzz } = settings.get();
        const pattern = buzz && opts?.haptic !== false && def.haptic && def.haptic.length > 0 ? def.haptic : undefined;
        if (!sound && !pattern) return;
        if (!limiter.allow(name, def.minIntervalMs ?? DEDUPE_MS, now())) return;
        if (sound) {
          const key = picker.pick(name, def, opts?.step, audio.has);
          const scale = typeof opts?.volume === 'number' && Number.isFinite(opts.volume) ? Math.max(0, opts.volume) : 1;
          if (key) audio.play(key, def.volume * scale * master);
        }
        if (pattern) haptics.play(pattern);
      } catch (error) {
        log(`play("${name}") failed: ${String(error)}`);
      }
    },

    music: {
      start() {
        if (!started) void init();
        musicWanted = true;
        syncMusic(true);
      },
      stop() {
        musicWanted = false;
        syncMusic(true);
      },
      setVolume(volume) {
        audio.music.setVolume((catalog[MUSIC]?.volume ?? 1) * clamp01(volume));
      },
    },

    settings: { get: settings.get, set: settings.set, subscribe: settings.subscribe },

    setVolume(volume) {
      master = clamp01(volume);
    },

    suspend(reason = 'default') {
      const wasLive = holds.size === 0;
      holds.add(reason);
      if (!wasLive) return;
      haptics.cancel();
      audio.stopAll();
      syncMusic(false);
    },

    resume(reason = 'default') {
      if (!holds.delete(reason) || holds.size > 0) return;
      // An ad may have changed the audio session behind our back.
      audio.refreshSession();
      syncMusic(true);
    },

    ladderStep(name, level, levels) {
      return ladderStep(level, levels, Math.max(1, Math.floor(catalog[name]?.files ?? 1)));
    },
  };
}
