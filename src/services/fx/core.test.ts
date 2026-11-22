import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioEngine } from './audio';
import { FX, type FxDef, type FxName, type HapticStep } from './catalog';
import { createFx, type AudioPort, type FxDeps } from './core';
import { createHaptics, type HapticsEngine } from './haptics';
import { planSounds } from './mix';
import { SettingsStore, type FxSettings } from './settings';
import { FakeDriver, MemoryStorage, testClock } from './testkit';
import { fileKeys } from './variants';

const catalog: Record<string, FxDef> = FX;
const SETTINGS_KEY = 'fx:settings:v1';

/** A bundle with a file for every catalogue entry: key -> a made-up asset id. */
function fullBundle(): Record<string, number> {
  const files: Record<string, number> = {};
  let id = 1;
  for (const name of Object.keys(catalog)) for (const key of fileKeys(name, catalog[name])) files[key] = id++;
  return files;
}

/** An audio engine that only writes down what it was asked to do. */
function fakeAudio() {
  const calls: string[] = [];
  const keys = new Set<string>();
  let kicks = 0;
  const audio: AudioPort = {
    register: (plan) => {
      for (const sound of plan.sounds) keys.add(sound.key);
    },
    init: async () => void calls.push('init'),
    preload: () => void calls.push('preload'),
    has: (key) => keys.has(key),
    play: (key, volume) => void calls.push(`play:${key}@${Math.round(volume * 1000) / 1000}`),
    stopAll: (sweep) => void calls.push(sweep ? 'stopAll:sweep' : 'stopAll'),
    refreshSession: () => void calls.push('refresh'),
    music: {
      set: (on, fade) => void calls.push(`music:${on ? 'on' : 'off'}${fade ? ':fade' : ''}`),
      setVolume: (volume) => void calls.push(`musicVolume:${Math.round(volume * 1000) / 1000}`),
      kick: () => void kicks++,
    },
  };
  const take = () => calls.splice(0, calls.length);
  return { audio, calls, take, kicks: () => kicks };
}

function fakeHaptics() {
  const played: (readonly HapticStep[])[] = [];
  let cancels = 0;
  const haptics: HapticsEngine = {
    play: (pattern) => void (pattern && played.push(pattern)),
    cancel: () => void cancels++,
  };
  return { haptics, played, cancels: () => cancels };
}

interface Options {
  sounds?: Record<string, number>;
  saved?: Partial<FxSettings>;
  storage?: MemoryStorage;
  active?: boolean;
  random?: () => number;
  deps?: Partial<FxDeps<typeof FX>>;
}

function make(options: Options = {}) {
  const a = fakeAudio();
  const h = fakeHaptics();
  const storage = options.storage ?? new MemoryStorage();
  if (options.saved) storage.data.set(SETTINGS_KEY, JSON.stringify(options.saved));
  const logs: string[] = [];
  const life = { active: options.active ?? true, listener: (_active: boolean) => {} };
  const gestures: (() => void)[] = [];
  const fx = createFx({
    catalog: FX,
    sounds: options.sounds ?? fullBundle(),
    audio: a.audio,
    haptics: h.haptics,
    settings: new SettingsStore(storage),
    now: () => Date.now(),
    random: options.random,
    lifecycle: { isActive: () => life.active, subscribe: (listener) => void (life.listener = listener) },
    onGesture: (listener) => void gestures.push(listener),
    log: (message) => logs.push(message),
    ...options.deps,
  });
  const setActive = (active: boolean) => {
    life.active = active;
    life.listener(active);
  };
  return { fx, storage, logs, setActive, gestures, take: a.take, calls: a.calls, kicks: a.kicks, played: h.played, cancels: h.cancels };
}

async function ready(options: Options = {}) {
  const made = make(options);
  await made.fx.init();
  made.take();
  return made;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_700_000_000_000);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('init', () => {
  it('loads the settings, starts the engine and preloads', async () => {
    const { fx, calls } = make();
    await fx.init();
    expect(calls).toEqual(['init', 'preload', 'music:off:fade']);
  });

  it('runs once, however often it is called', async () => {
    const { fx, calls } = make();
    const first = fx.init();
    expect(fx.init()).toBe(first);
    await first;
    await fx.init();
    expect(calls.filter((c) => c === 'init')).toHaveLength(1);
  });

  it('does not preload for a player who has sound switched off', async () => {
    const { fx, calls } = make({ saved: { sound: false } });
    await fx.init();
    expect(calls).not.toContain('preload');
  });

  it('never rejects, even if the engine does', async () => {
    const a = fakeAudio();
    a.audio.init = () => Promise.reject(new Error('boom'));
    const { fx, logs } = make({ deps: { audio: a.audio } });
    await expect(fx.init()).resolves.toBeUndefined();
    expect(logs.join(' ')).toContain('init failed');
    expect(() => fx.play('buy')).not.toThrow();
  });

  it('tells the developer which files are missing', async () => {
    const sounds = fullBundle();
    delete sounds.tap_4;
    delete sounds.prestige;
    const some = make({ sounds: { ...sounds, extra_thing: 999 } });
    await some.fx.init();
    expect(some.logs).toEqual(['no sound file for: tap_4, prestige', 'sound files that no catalogue entry uses: extra_thing']);

    const none = make({ sounds: {} });
    await none.fx.init();
    expect(none.logs).toEqual(['no sound files in the bundle: every event is silent (haptics still work)']);

    const all = make();
    await all.fx.init();
    expect(all.logs).toEqual([]);
  });
});

describe('play', () => {
  it('plays the sound at its catalogue volume and the haptic pattern', async () => {
    const { fx, take, played } = await ready();
    fx.play('buy');
    expect(take()).toEqual([`play:buy@${FX.buy.volume}`]);
    expect(played).toEqual([FX.buy.haptic]);
  });

  it('is silent until the settings are loaded: a muted player must not hear the first tap', async () => {
    const { fx, calls, played } = make({ saved: { sound: false, haptics: false } });
    fx.play('buy');
    expect(calls.filter((c) => c.startsWith('play'))).toEqual([]);
    expect(played).toEqual([]);
    await fx.init();
    fx.play('buy');
    expect(calls.filter((c) => c.startsWith('play'))).toEqual([]);
    expect(played).toEqual([]);
  });

  it('starts the service by itself if nobody called init', async () => {
    const { fx, calls } = make();
    fx.play('ui_tap');
    await vi.advanceTimersByTimeAsync(10);
    expect(calls).toContain('init');
    fx.play('buy');
    expect(calls).toContain(`play:buy@${FX.buy.volume}`);
  });

  it('events without a haptic pattern only make a sound', async () => {
    const { fx, take, played } = await ready();
    fx.play('coin');
    expect(take()).toHaveLength(1);
    expect(played).toEqual([]);
  });

  it('haptic: false plays the sound without the vibration', async () => {
    const { fx, take, played } = await ready();
    fx.play('cash', { haptic: false });
    expect(take()).toEqual([`play:cash@${FX.cash.volume}`]);
    expect(played).toEqual([]);
  });

  it('sound off: haptics only. Haptics off: sound only. Both off: nothing', async () => {
    const quiet = await ready({ saved: { sound: false } });
    quiet.fx.play('buy');
    expect(quiet.take()).toEqual([]);
    expect(quiet.played).toEqual([FX.buy.haptic]);

    const still = await ready({ saved: { haptics: false } });
    still.fx.play('buy');
    expect(still.take()).toEqual([`play:buy@${FX.buy.volume}`]);
    expect(still.played).toEqual([]);

    const off = await ready({ saved: { sound: false, haptics: false } });
    off.fx.play('buy');
    expect(off.take()).toEqual([]);
    expect(off.played).toEqual([]);
  });

  it('volume scales the catalogue volume, times the master volume, never above 1 at the engine', async () => {
    const { fx, take } = await ready();
    fx.play('milestone', { volume: 0.5 });
    expect(take()).toEqual([`play:milestone@${FX.milestone.volume * 0.5}`]);
    fx.setVolume(0.5);
    fx.play('unlock');
    expect(take()).toEqual([`play:unlock@${FX.unlock.volume * 0.5}`]);
    fx.play('hire', { volume: 0 });
    expect(take()).toEqual(['play:hire@0']);
    fx.setVolume(7);
    fx.play('upgrade', { volume: Number.NaN });
    expect(take()).toEqual([`play:upgrade@${FX.upgrade.volume}`]);
    fx.play('gems', { volume: -3 });
    expect(take()).toEqual(['play:gems@0']);
  });

  it('rate-limits by the catalogue interval: the sound and the haptic together', async () => {
    const { fx, take, played } = await ready();
    const interval = FX.cash.minIntervalMs;
    fx.play('cash');
    vi.advanceTimersByTime(interval - 1);
    fx.play('cash');
    expect(take()).toHaveLength(1);
    expect(played).toHaveLength(1);
    vi.advanceTimersByTime(1);
    fx.play('cash');
    expect(take()).toHaveLength(1);
    expect(played).toHaveLength(2);
  });

  it('two triggers of any event in the same frame are one', async () => {
    const { fx, take } = await ready();
    fx.play('milestone');
    fx.play('milestone');
    fx.play('unlock');
    expect(take()).toEqual([`play:milestone@${FX.milestone.volume}`, `play:unlock@${FX.unlock.volume}`]);
    vi.advanceTimersByTime(30);
    fx.play('milestone');
    expect(take()).toHaveLength(1);
  });

  it('ladder: step picks the rung, clamped', async () => {
    const { fx, take } = await ready();
    const steps = [undefined, 0, 3, 7, 50, -2];
    const keys: string[] = [];
    for (const step of steps) {
      fx.play('tap', { step });
      keys.push(take()[0].split('@')[0]);
      vi.advanceTimersByTime(100);
    }
    expect(keys).toEqual(['play:tap_1', 'play:tap_1', 'play:tap_4', 'play:tap_8', 'play:tap_8', 'play:tap_1']);
  });

  it('ladderStep spreads the game scale over the files of the ladder', async () => {
    const { fx } = await ready();
    // Pizza Empire's combo has 5 levels; the tap ladder has 8 files.
    expect([0, 1, 2, 3, 4].map((level) => fx.ladderStep('tap', level, 5))).toEqual([0, 2, 4, 5, 7]);
    expect(fx.ladderStep('buy', 3, 5)).toBe(0);
  });

  it('random: variants take turns', async () => {
    const { fx, take } = await ready({ random: () => 0 });
    const keys: string[] = [];
    for (let i = 0; i < 4; i++) {
      fx.play('coin');
      keys.push(take()[0].split('@')[0]);
      vi.advanceTimersByTime(100);
    }
    expect(keys).toEqual(['play:coin_1', 'play:coin_2', 'play:coin_1', 'play:coin_2']);
  });

  it('an event without a file is silent but still vibrates', async () => {
    const sounds = fullBundle();
    delete sounds.unlock;
    const { fx, take, played } = await ready({ sounds });
    fx.play('unlock');
    expect(take()).toEqual([]);
    expect(played).toEqual([FX.unlock.haptic]);
  });

  it('with no sound files at all, every event still vibrates and nothing throws', async () => {
    const { fx, take, played } = await ready({ sounds: {} });
    for (const name of Object.keys(FX) as FxName[]) {
      expect(() => fx.play(name, { step: 2 })).not.toThrow();
      vi.advanceTimersByTime(2000);
    }
    expect(take()).toEqual([]);
    expect(played.length).toBe(Object.values(catalog).filter((def) => def.haptic && !def.loop).length);
  });

  it('the music entry is not a one-shot', async () => {
    const { fx, take, played } = await ready();
    fx.play('music_main');
    expect(take()).toEqual([]);
    expect(played).toEqual([]);
  });

  it('an unknown name is ignored, with one note for the developer', async () => {
    const { fx, take, logs } = await ready();
    expect(() => fx.play('explode' as FxName)).not.toThrow();
    expect(() => fx.play('explode' as FxName)).not.toThrow();
    expect(() => fx.play(undefined as never)).not.toThrow();
    expect(take()).toEqual([]);
    expect(logs.filter((l) => l.includes('explode'))).toHaveLength(1);
  });

  it('never throws into game code, whatever breaks underneath', async () => {
    const a = fakeAudio();
    a.audio.play = () => {
      throw new Error('native crash');
    };
    const { fx, logs } = await ready({ deps: { audio: a.audio } });
    expect(() => fx.play('buy')).not.toThrow();
    expect(() => fx.play('tap', null as never)).not.toThrow();
    expect(logs.join(' ')).toContain('play("buy") failed');
  });
});

describe('settings', () => {
  it('are saved, and restored on the next launch', async () => {
    const storage = new MemoryStorage();
    const first = await ready({ storage });
    expect(first.fx.settings.get()).toEqual({ sound: true, music: true, haptics: true });
    first.fx.settings.set({ music: false, haptics: false });
    await vi.advanceTimersByTimeAsync(10);

    const second = await ready({ storage });
    expect(second.fx.settings.get()).toEqual({ sound: true, music: false, haptics: false });
  });

  it('subscribers hear about changes', async () => {
    const { fx } = await ready();
    const listener = vi.fn();
    const stop = fx.settings.subscribe(listener);
    fx.settings.set({ sound: false });
    expect(listener).toHaveBeenCalledWith({ sound: false, music: true, haptics: true });
    stop();
    fx.settings.set({ sound: true });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('switching sound off silences what is playing; switching it on preloads', async () => {
    const { fx, take } = await ready();
    fx.settings.set({ sound: false });
    expect(take()).toEqual(['stopAll']);
    fx.play('buy');
    expect(take()).toEqual([]);
    fx.settings.set({ sound: true });
    expect(take()).toEqual(['preload']);
    fx.play('ui_tap');
    expect(take()).toEqual([`play:ui_tap@${FX.ui_tap.volume}`]);
  });

  it('switching haptics off cancels a pattern in progress', async () => {
    const { fx, cancels } = await ready();
    fx.play('prestige');
    fx.settings.set({ haptics: false });
    expect(cancels()).toBe(1);
  });

  it('a change takes effect for the very next play (so a toggle can confirm itself)', async () => {
    const { fx, played } = await ready({ saved: { haptics: false } });
    fx.settings.set({ haptics: true });
    fx.play('ui_tap');
    expect(played).toEqual([FX.ui_tap.haptic]);
  });
});

describe('music', () => {
  it('plays once the game asked for it and the service is ready', async () => {
    const { fx, calls } = make();
    fx.music.start();
    await fx.init();
    expect(calls.slice(-1)).toEqual(['music:on:fade']);
  });

  it('start and stop ease in and out', async () => {
    const { fx, take } = await ready();
    fx.music.start();
    expect(take()).toEqual(['music:on:fade']);
    fx.music.stop();
    expect(take()).toEqual(['music:off:fade']);
  });

  it('follows the Music switch', async () => {
    const { fx, take } = await ready({ saved: { music: false } });
    fx.music.start();
    expect(take()).toEqual(['music:off:fade']);
    fx.settings.set({ music: true });
    expect(take()).toEqual(['music:on:fade']);
    fx.settings.set({ music: false });
    expect(take()).toEqual(['music:off:fade']);
  });

  it('the Sound switch does not touch the music', async () => {
    const { fx, take } = await ready();
    fx.music.start();
    take();
    fx.settings.set({ sound: false });
    expect(take()).toEqual(['stopAll']);
  });

  it('setVolume scales the catalogue volume', async () => {
    const { fx, take } = await ready();
    fx.music.setVolume(0.5);
    expect(take()).toEqual([`musicVolume:${FX.music_main.volume * 0.5}`]);
    fx.music.setVolume(9);
    expect(take()).toEqual([`musicVolume:${FX.music_main.volume}`]);
  });

  it('web: a tap or key press nudges the music, so a start the browser blocked can go through', async () => {
    const { fx, gestures, kicks } = await ready();
    fx.music.start();
    expect(gestures).toHaveLength(1);
    gestures[0]();
    expect(kicks()).toBe(1);
  });

  it('every event nudges the music too: if something outside the game stopped it, it comes back', async () => {
    const { fx, kicks, setActive } = await ready({ saved: { sound: false } });
    fx.play('buy');
    fx.play('coin');
    expect(kicks()).toBe(2);
    setActive(false);
    fx.play('buy');
    expect(kicks()).toBe(2);
  });
});

describe('leaving and returning', () => {
  it('in the background: music pauses at once, sounds stop, pending haptics are dropped', async () => {
    const { fx, take, setActive, cancels, played } = await ready();
    fx.music.start();
    take();
    setActive(false);
    expect(take()).toEqual(['stopAll', 'music:off']);
    expect(cancels()).toBe(1);
    fx.play('buy');
    expect(take()).toEqual([]);
    expect(played).toEqual([]);
  });

  it('back in front: the session is re-applied, stale sounds are stopped, music resumes', async () => {
    const { fx, take, setActive } = await ready();
    fx.music.start();
    setActive(false);
    take();
    setActive(true);
    expect(take()).toEqual(['refresh', 'stopAll:sweep', 'music:on']);
    fx.play('buy');
    expect(take()).toEqual([`play:buy@${FX.buy.volume}`]);
  });

  it('music that the player switched off stays off after returning', async () => {
    const { fx, take, setActive } = await ready({ saved: { music: false } });
    fx.music.start();
    setActive(false);
    take();
    setActive(true);
    expect(take()).toEqual(['refresh', 'stopAll:sweep', 'music:off']);
  });

  it('repeated lifecycle events are harmless', async () => {
    const { take, setActive } = await ready();
    setActive(true);
    expect(take()).toEqual([]);
    setActive(false);
    setActive(false);
    expect(take()).toEqual(['stopAll', 'music:off']);
  });

  it('an app that starts in the background stays quiet until it is shown', async () => {
    const { fx, take, setActive, calls } = make({ active: false });
    fx.music.start();
    await fx.init();
    expect(calls.filter((c) => c.startsWith('music:on'))).toEqual([]);
    fx.play('buy');
    take();
    setActive(true);
    expect(take()).toEqual(['refresh', 'stopAll:sweep', 'music:on']);
  });
});

describe('suspend and resume (full-screen ads)', () => {
  it('silences everything without changing the settings, then brings the music back', async () => {
    const { fx, take, played, cancels } = await ready();
    fx.music.start();
    take();
    fx.suspend('ad');
    expect(take()).toEqual(['stopAll', 'music:off']);
    expect(cancels()).toBe(1);
    fx.play('cash');
    expect(take()).toEqual([]);
    expect(played).toEqual([]);
    expect(fx.settings.get()).toEqual({ sound: true, music: true, haptics: true });
    fx.resume('ad');
    expect(take()).toEqual(['refresh', 'music:on:fade']);
    fx.play('cash');
    expect(take()).toHaveLength(1);
  });

  it('stays suspended until every reason is gone', async () => {
    const { fx, take } = await ready();
    fx.music.start();
    fx.suspend('ad');
    fx.suspend('ad');
    fx.suspend('video');
    take();
    fx.resume('ad');
    expect(take()).toEqual([]);
    fx.resume('never-suspended');
    fx.resume('ad');
    expect(take()).toEqual([]);
    fx.resume('video');
    expect(take()).toEqual(['refresh', 'music:on:fade']);
  });

  it('works without a reason', async () => {
    const { fx, take } = await ready();
    fx.suspend();
    fx.play('buy');
    expect(take()).toEqual(['stopAll', 'music:off']);
    fx.resume();
    fx.play('buy');
    expect(take().pop()).toBe(`play:buy@${FX.buy.volume}`);
  });

  it('returning from the background during an ad does not restart the music', async () => {
    const { fx, take, setActive } = await ready();
    fx.music.start();
    fx.suspend('ad');
    setActive(false);
    take();
    setActive(true);
    expect(take()).toEqual(['refresh', 'stopAll:sweep', 'music:off']);
  });
});

describe('the whole service on the real engines', () => {
  it('a tap combo: preloaded rungs, climbing pitch, a tick per tap, music underneath', async () => {
    const sounds = fullBundle();
    const plan = planSounds(catalog, sounds);
    const driver = new FakeDriver();
    const pulses: string[] = [];
    const haptics = createHaptics({
      os: 'ios',
      clock: testClock,
      load: () =>
        ({
          ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy', Soft: 'soft', Rigid: 'rigid' },
          NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
          impactAsync: async (style: string) => void pulses.push(style),
          notificationAsync: async (type: string) => void pulses.push(type),
          selectionAsync: async () => void pulses.push('select'),
        }) as never,
    });
    const audio = new AudioEngine({ os: 'ios', driver: () => driver, clock: testClock });
    const fx = createFx({
      catalog: FX,
      sounds,
      audio,
      haptics,
      settings: new SettingsStore(new MemoryStorage()),
      now: testClock.now,
    });

    fx.music.start();
    await fx.init();
    await vi.advanceTimersByTimeAsync(3000);

    // Everything frequent is loaded before the first tap; iOS has room for the whole plan here.
    expect(driver.players.length).toBe(Math.min(plan.preload.length, 57) + 1);
    const music = driver.playing(sounds.music_main)[0];
    expect(music.loop).toBe(true);
    expect(music.calls).toContain('play');
    expect(music.volume).toBeCloseTo(FX.music_main.volume, 5);

    for (let tap = 0; tap < 8; tap++) {
      fx.play('tap', { step: tap });
      await vi.advanceTimersByTimeAsync(120);
    }
    for (let rung = 1; rung <= 8; rung++) {
      const voices = driver.playing(sounds[`tap_${rung}`]);
      expect(voices).toHaveLength(2);
      // One of the two preloaded voices played, with no seek and no extra volume call.
      expect(voices.map((v) => v.calls.join(','))).toEqual([`volume:${FX.tap.volume},play`, `volume:${FX.tap.volume}`]);
    }
    expect(pulses).toEqual(Array(8).fill('light'));

    fx.settings.set({ music: false });
    await vi.advanceTimersByTimeAsync(1000);
    expect(music.calls[music.calls.length - 1]).toBe('pause');
  });
});
