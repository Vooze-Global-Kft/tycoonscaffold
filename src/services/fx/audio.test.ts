import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioEngine, playerBudget, type AudioDriver } from './audio';
import type { SoundSpec } from './mix';
import { FakeDriver, testClock } from './testkit';

/** A sound spec; the asset id doubles as the way tests find its players. */
const spec = (key: string, source: number, extra: Partial<SoundSpec> = {}): SoundSpec => ({
  key,
  source,
  volume: 0.5,
  maxVoices: 1,
  hot: false,
  ...extra,
});

interface Setup {
  os?: string;
  budget?: number;
  sounds?: SoundSpec[];
  preload?: string[];
  music?: { key: string; source: number; volume: number };
  driver?: FakeDriver;
}

function make(setup: Setup = {}) {
  const driver = setup.driver ?? new FakeDriver();
  const logs: string[] = [];
  const engine = new AudioEngine({
    os: setup.os ?? 'ios',
    budget: setup.budget,
    driver: () => driver,
    clock: testClock,
    log: (message) => logs.push(message),
  });
  engine.register({ sounds: setup.sounds ?? [spec('buy', 1), spec('coin', 2)], preload: setup.preload ?? [], music: setup.music });
  return { driver, engine, logs };
}

async function ready(setup: Setup = {}) {
  const made = make(setup);
  await made.engine.init();
  return made;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_700_000_000_000);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('playerBudget', () => {
  it('leaves room under each platform limit', () => {
    expect(playerBudget('ios')).toBe(64);
    expect(playerBudget('android', 34)).toBe(28);
    expect(playerBudget('android', 28)).toBe(28);
    expect(playerBudget('android', 27)).toBe(10);
    expect(playerBudget('android')).toBe(10);
    expect(playerBudget('web')).toBe(32);
  });
});

describe('startup', () => {
  it('plays nothing until the audio session is configured', async () => {
    const { driver, engine } = make();
    engine.play('buy', 0.5);
    expect(driver.players).toHaveLength(0);
    await engine.init();
    expect(driver.configured).toBe(1);
    engine.play('buy', 0.5);
    expect(driver.players).toHaveLength(1);
  });

  it('init is idempotent', async () => {
    const { driver, engine } = make();
    await Promise.all([engine.init(), engine.init()]);
    await engine.init();
    expect(driver.configured).toBe(1);
  });

  it('without expo-audio the engine is silent and nothing throws', async () => {
    const logs: string[] = [];
    const engine = new AudioEngine({ os: 'ios', driver: () => null, clock: testClock, log: (m) => logs.push(m) });
    engine.register({ sounds: [spec('buy', 1)], preload: ['buy'], music: { key: 'music_main', source: 9, volume: 0.3 } });
    await expect(engine.init()).resolves.toBeUndefined();
    engine.preload();
    engine.play('buy', 1);
    engine.music.set(true, true);
    engine.stopAll();
    engine.refreshSession();
    vi.advanceTimersByTime(1000);
    expect(logs.join(' ')).toContain('not available');
  });

  it('a driver that throws while loading counts as no audio', async () => {
    const engine = new AudioEngine({
      os: 'ios',
      driver: () => {
        throw new Error('native module missing');
      },
      clock: testClock,
    });
    await expect(engine.init()).resolves.toBeUndefined();
    expect(() => engine.play('buy', 1)).not.toThrow();
  });

  it('stays silent if the session cannot be configured, and recovers on the next refresh', async () => {
    const driver = new FakeDriver();
    driver.failConfigure = true;
    const { engine, logs } = await ready({ driver });
    engine.play('buy', 0.5);
    expect(driver.players).toHaveLength(0);
    expect(logs.join(' ')).toContain('sound stays off');

    driver.failConfigure = false;
    engine.refreshSession();
    await vi.advanceTimersByTimeAsync(0);
    engine.play('buy', 0.5);
    expect(driver.players).toHaveLength(1);
  });

  it('applies the session again on iOS when asked (ad SDKs change it); other platforms only once', async () => {
    const ios = await ready({ os: 'ios' });
    ios.engine.refreshSession();
    await vi.advanceTimersByTimeAsync(0);
    expect(ios.driver.configured).toBe(2);

    const android = await ready({ os: 'android' });
    android.engine.refreshSession();
    await vi.advanceTimersByTimeAsync(0);
    expect(android.driver.configured).toBe(1);
  });

  it('has() knows which files are in the bundle', () => {
    const { engine } = make();
    expect(engine.has('buy')).toBe(true);
    expect(engine.has('prestige')).toBe(false);
  });
});

describe('one-shots', () => {
  it('the first play creates the player at the right volume and just plays', async () => {
    const { driver, engine } = await ready();
    engine.play('buy', 0.65);
    expect(driver.players).toHaveLength(1);
    expect(driver.players[0].source).toBe(1);
    expect(driver.players[0].take()).toEqual(['volume:0.5', 'volume:0.65', 'play']);
  });

  it('an unknown key is ignored', async () => {
    const { driver, engine } = await ready();
    expect(() => engine.play('nope', 1)).not.toThrow();
    expect(driver.players).toHaveLength(0);
  });

  it('clamps the volume and sends it only when it changes', async () => {
    const { driver, engine } = await ready();
    engine.play('buy', 0.5);
    const player = driver.players[0];
    expect(player.take()).toEqual(['volume:0.5', 'play']);
    const playToEnd = () => {
      vi.advanceTimersByTime(200);
      player.finish(0.2);
      player.take();
    };
    playToEnd();
    engine.play('buy', 0.5);
    expect(player.take()).toEqual(['play']);
    playToEnd();
    engine.play('buy', 7);
    expect(player.take()).toEqual(['volume:1', 'play']);
    playToEnd();
    engine.play('buy', Number.NaN);
    expect(player.take()).toEqual(['volume:0', 'play']);
  });

  it('a finished player is rewound at once, so the next play needs no seek', async () => {
    const { driver, engine } = await ready();
    engine.play('buy', 0.5);
    const player = driver.players[0];
    player.take();
    vi.advanceTimersByTime(200);
    player.finish(0.2);
    // Pause before the seek: a finished Android player would start again on a bare seek.
    expect(player.take()).toEqual(['pause', 'seek:0']);
    engine.play('buy', 0.5);
    expect(player.take()).toEqual(['play']);
  });

  it('retriggering a sound that is still playing restarts it', async () => {
    const { driver, engine } = await ready();
    engine.play('buy', 0.5);
    const player = driver.players[0];
    player.take();
    vi.advanceTimersByTime(60);
    engine.play('buy', 0.5);
    expect(player.take()).toEqual(['seek:0', 'play']);
    expect(driver.players).toHaveLength(1);
  });

  it('ignores a "finished" that belongs to the playback before a restart', async () => {
    const { driver, engine } = await ready();
    engine.play('buy', 0.5);
    const player = driver.players[0];
    vi.advanceTimersByTime(400);
    engine.play('buy', 0.5); // restarted just as the first playback ended
    player.take();
    vi.advanceTimersByTime(5);
    player.finish(0.4); // the late event of the first playback
    expect(player.take()).toEqual([]);
    vi.advanceTimersByTime(400);
    player.finish(0.4);
    expect(player.take()).toEqual(['pause', 'seek:0']);
  });

  it('status events that are not a finish change nothing', async () => {
    const { driver, engine } = await ready();
    engine.play('buy', 0.5);
    const player = driver.players[0];
    player.take();
    player.emit({ playing: true, didJustFinish: false, duration: 0.3, error: null });
    player.emit({ playing: false, didJustFinish: false, duration: 0.3, error: null });
    player.emit(undefined as never);
    expect(player.take()).toEqual([]);
  });

  it('stopAll silences what is sounding and leaves idle players alone', async () => {
    const { driver, engine } = await ready();
    engine.play('buy', 0.5);
    vi.advanceTimersByTime(200);
    engine.play('coin', 0.5);
    const [buy, coin] = driver.players;
    buy.finish(0.2);
    buy.take();
    coin.take();
    engine.stopAll();
    expect(buy.take()).toEqual([]);
    expect(coin.take()).toEqual(['pause', 'seek:0']);
    // Back in the foreground: also re-stop what played recently, in case the OS resumed it.
    engine.stopAll(true);
    expect(buy.take()).toEqual(['pause', 'seek:0']);
    expect(coin.take()).toEqual(['pause', 'seek:0']);
    vi.advanceTimersByTime(20_000);
    engine.stopAll(true);
    expect(buy.take()).toEqual([]);
  });
});

describe('voices', () => {
  const sounds = [spec('bell', 1, { maxVoices: 3, hot: true }), spec('buy', 2)];

  it('a sound that overlaps itself gets a second voice, then they take turns', async () => {
    const { driver, engine } = await ready({ sounds });
    engine.play('bell', 0.7);
    vi.advanceTimersByTime(100);
    engine.play('bell', 0.7); // still ringing: restart now, and order a second voice
    expect(driver.playing(1)).toHaveLength(1);
    expect(driver.players[0].calls.slice(-2)).toEqual(['seek:0', 'play']);
    vi.advanceTimersByTime(1);
    const [a, b] = driver.playing(1);
    expect(b.take()).toEqual(['volume:0.5']);
    a.take();

    vi.advanceTimersByTime(100);
    engine.play('bell', 0.7); // the new voice is free: the first one keeps ringing
    expect(a.take()).toEqual([]);
    expect(b.take()).toEqual(['volume:0.7', 'play']);
  });

  it('never makes more voices than the sound allows', async () => {
    const { driver, engine } = await ready({ sounds });
    for (let i = 0; i < 20; i++) {
      engine.play('bell', 0.7);
      vi.advanceTimersByTime(40);
    }
    expect(driver.playing(1)).toHaveLength(3);
  });

  it('a single-voice sound never grows', async () => {
    const { driver, engine } = await ready({ sounds });
    for (let i = 0; i < 10; i++) {
      engine.play('buy', 0.7);
      vi.advanceTimersByTime(40);
    }
    expect(driver.playing(2)).toHaveLength(1);
  });

  it('prefers a rewound voice over one that is still ringing', async () => {
    const { driver, engine } = await ready({ sounds });
    engine.play('bell', 0.7);
    vi.advanceTimersByTime(50);
    engine.play('bell', 0.7);
    vi.advanceTimersByTime(50);
    const [a, b] = driver.playing(1);
    engine.play('bell', 0.7); // goes to b; a rings on
    vi.advanceTimersByTime(550);
    a.finish(0.6);
    a.take();
    b.take();
    engine.play('bell', 0.7); // b started later and is still ringing: a, rewound, takes it
    expect(a.take()).toEqual(['play']);
    expect(b.take()).toEqual([]);
  });

  it('once it knows how long a file is, a retrigger after the end does not count as an overlap', async () => {
    const { driver, engine } = await ready({ sounds });
    engine.play('bell', 0.7);
    const first = driver.players[0];
    vi.advanceTimersByTime(250);
    first.finish(0.25);
    for (let i = 0; i < 5; i++) {
      engine.play('bell', 0.7);
      vi.advanceTimersByTime(260);
      first.finish(0.25);
    }
    vi.advanceTimersByTime(10);
    expect(driver.playing(1)).toHaveLength(1);
  });
});

describe('the player budget', () => {
  // budget 4 = 3 sound players + the music player
  const sounds = [
    spec('tap', 1, { hot: true }),
    spec('coin', 2, { hot: true }),
    spec('unlock', 3),
    spec('hire', 4),
    spec('prestige', 5),
  ];

  it('re-uses the longest-idle rarely used player when the budget is spent', async () => {
    const { driver, engine } = await ready({ sounds, budget: 4 });
    engine.play('tap', 0.5);
    vi.advanceTimersByTime(1000);
    engine.play('unlock', 0.5);
    vi.advanceTimersByTime(1000);
    engine.play('coin', 0.5);
    for (const player of driver.players) player.finish(0.3);
    vi.advanceTimersByTime(1000);
    expect(driver.players).toHaveLength(3);

    const unlock = driver.playing(3)[0];
    unlock.take();
    engine.play('hire', 0.8);
    // 'tap' has been idle longest, but it is a frequent sound: the rare one gives way.
    expect(driver.players).toHaveLength(3);
    expect(unlock.source).toBe(4);
    expect(unlock.take()).toEqual(['replace:4', 'volume:0.8', 'play']);
  });

  it('takes a frequent sound only when nothing else is idle', async () => {
    const { driver, engine } = await ready({ sounds, budget: 4 });
    engine.play('tap', 0.5);
    vi.advanceTimersByTime(100);
    engine.play('coin', 0.5);
    vi.advanceTimersByTime(100);
    engine.play('unlock', 0.5);
    const [tap, coin, unlock] = driver.players;
    tap.finish(0.2);
    coin.finish(0.2);
    // 'unlock' is still sounding, so 'hire' has to take the frequent sound that has been idle longest.
    engine.play('hire', 0.5);
    expect(tap.source).toBe(4);
    expect(coin.source).toBe(2);
    expect(unlock.source).toBe(3);
  });

  it('drops the sound rather than cut one that is playing', async () => {
    const { driver, engine } = await ready({ sounds, budget: 4 });
    engine.play('tap', 0.5);
    engine.play('coin', 0.5);
    engine.play('unlock', 0.5);
    engine.play('hire', 0.5);
    expect(driver.players.map((p) => p.source)).toEqual([1, 2, 3]);
    expect(driver.players.every((p) => !p.calls.some((c) => c.startsWith('replace')))).toBe(true);
  });

  it('the sound that lost its player gets one back when it is needed again', async () => {
    const { driver, engine } = await ready({ sounds, budget: 4 });
    engine.play('unlock', 0.5);
    engine.play('hire', 0.5);
    engine.play('prestige', 0.5);
    for (const player of driver.players) player.finish(0.3);
    vi.advanceTimersByTime(5000);
    engine.play('tap', 0.5); // takes unlock's player
    vi.advanceTimersByTime(5000);
    driver.playing(1)[0].finish(0.1);
    engine.play('unlock', 0.5); // takes hire's player
    expect(driver.players).toHaveLength(3);
    expect(driver.players.map((p) => p.source).sort()).toEqual([1, 3, 5]);
  });

  it('an extra voice never takes a player from a frequent sound', async () => {
    const withVoices = [spec('tap', 1, { hot: true, maxVoices: 2 }), spec('coin', 2, { hot: true }), spec('buy', 3, { hot: true })];
    const { driver, engine } = await ready({ sounds: withVoices, budget: 4 });
    engine.play('coin', 0.5);
    engine.play('buy', 0.5);
    for (const player of driver.players) player.finish(0.1);
    vi.advanceTimersByTime(5000);
    engine.play('tap', 0.5);
    vi.advanceTimersByTime(50);
    engine.play('tap', 0.5); // overlaps, but the only idle players belong to frequent sounds
    vi.advanceTimersByTime(10);
    expect(driver.players.map((p) => p.source)).toEqual([2, 3, 1]);
  });

  it('if a player cannot be re-used it is replaced by a fresh one', async () => {
    const { driver, engine } = await ready({ sounds, budget: 4 });
    engine.play('unlock', 0.5);
    engine.play('hire', 0.5);
    engine.play('prestige', 0.5);
    for (const player of driver.players) player.finish(0.3);
    vi.advanceTimersByTime(5000);
    const victim = driver.players[0];
    victim.replace = () => {
      throw new Error('released');
    };
    engine.play('tap', 0.5);
    expect(victim.removed).toBe(true);
    expect(driver.alive).toHaveLength(3);
    expect(driver.playing(1)).toHaveLength(1);
    expect(driver.playing(1)[0].calls).toContain('play');
  });
});

describe('preloading', () => {
  const sounds = [spec('a', 1, { maxVoices: 2, hot: true }), spec('b', 2), spec('c', 3), spec('d', 4), spec('e', 5)];

  it('creates players in plan order, a few per step, without being asked twice', async () => {
    const { driver, engine } = await ready({ sounds, preload: ['a', 'b', 'c', 'a', 'd', 'e'] });
    expect(driver.players).toHaveLength(0);
    engine.preload();
    engine.preload();
    vi.advanceTimersByTime(0);
    expect(driver.players.map((p) => p.source)).toEqual([1, 2]);
    vi.advanceTimersByTime(30);
    expect(driver.players.map((p) => p.source)).toEqual([1, 2, 3, 1]);
    vi.advanceTimersByTime(30);
    expect(driver.players.map((p) => p.source)).toEqual([1, 2, 3, 1, 4, 5]);
    vi.advanceTimersByTime(1000);
    expect(driver.players).toHaveLength(6);
    // Preloaded players sit at their catalogue volume, ready for a bare play().
    expect(driver.players[1].take()).toEqual(['volume:0.5']);
    engine.play('b', 0.5);
    expect(driver.players[1].take()).toEqual(['play']);
  });

  it('waits for the session, then starts by itself', async () => {
    const { driver, engine } = make({ sounds, preload: ['a', 'b'] });
    engine.preload();
    vi.advanceTimersByTime(100);
    expect(driver.players).toHaveLength(0);
    await engine.init();
    vi.advanceTimersByTime(100);
    expect(driver.players).toHaveLength(2);
  });

  it('does not create a second player for a sound that a play already created', async () => {
    const { driver, engine } = await ready({ sounds, preload: ['a', 'b', 'a'] });
    engine.preload();
    engine.play('b', 0.5);
    vi.advanceTimersByTime(1000);
    expect(driver.players.map((p) => p.source).sort()).toEqual([1, 1, 2]);
  });

  it('stops short of the budget so that sounds created on demand still fit', async () => {
    // budget 6: 5 sound players, 4 of them for preloading
    const { driver, engine } = await ready({ sounds, preload: ['a', 'b', 'c', 'd', 'e'], budget: 6 });
    engine.preload();
    vi.advanceTimersByTime(1000);
    expect(driver.players.map((p) => p.source)).toEqual([1, 2, 3, 4]);
    engine.play('e', 0.5);
    expect(driver.players.map((p) => p.source)).toEqual([1, 2, 3, 4, 5]);
  });

  it('skips keys it does not know and sounds that cannot be created', async () => {
    const { driver, engine, logs } = await ready({ sounds, preload: ['ghost', 'a', 'b'] });
    driver.failCreate = true;
    engine.preload();
    vi.advanceTimersByTime(1000);
    expect(driver.players).toHaveLength(0);
    expect(logs.join(' ')).toContain('could not create a player for "a"');
  });
});

describe('failures', () => {
  it('a sound whose player cannot be created is tried again once, then left alone', async () => {
    const { driver, engine } = await ready();
    const createPlayer = vi.spyOn(driver, 'createPlayer');
    driver.failCreate = true;
    for (let i = 0; i < 5; i++) expect(() => engine.play('buy', 0.5)).not.toThrow();
    expect(createPlayer).toHaveBeenCalledTimes(2);
    engine.play('coin', 0.5);
    expect(createPlayer).toHaveBeenCalledTimes(3);
  });

  it('a player that reports an error is released and replaced on the next play', async () => {
    const { driver, engine } = await ready({ os: 'android' });
    engine.play('buy', 0.5);
    const broken = driver.players[0];
    broken.emit({ error: 'AudioTrack init failed' });
    expect(broken.calls.slice(-3)).toEqual(['pause', 'remove', 'release']);
    engine.play('buy', 0.5);
    expect(driver.alive).toHaveLength(1);
    expect(driver.alive[0]).not.toBe(broken);
    // Events from the released player are ignored.
    broken.take();
    broken.finish();
    expect(broken.take()).toEqual([]);
  });

  it('a file that keeps failing is switched off instead of retried forever', async () => {
    const { driver, engine, logs } = await ready({ os: 'android' });
    for (let i = 0; i < 5; i++) {
      engine.play('buy', 0.5);
      driver.alive.find((p) => p.source === 1)?.emit({ error: 'bad file' });
    }
    expect(driver.players).toHaveLength(2);
    expect(logs.join(' ')).toContain('"buy" keeps failing');
  });

  it('a player that throws on play is released', async () => {
    const { driver, engine } = await ready();
    engine.play('buy', 0.5);
    const player = driver.players[0];
    player.play = () => {
      throw new Error('native object released');
    };
    expect(() => engine.play('buy', 0.5)).not.toThrow();
    expect(player.removed).toBe(true);
  });

  it('on web a playback error is not fatal (browsers block audio until the first tap)', async () => {
    const { driver, engine } = await ready({ os: 'web' });
    engine.play('buy', 0.5);
    const player = driver.players[0];
    player.emit({ playing: false, error: 'NotAllowedError' });
    expect(player.removed).toBe(false);
    player.take();
    vi.advanceTimersByTime(1000);
    engine.play('buy', 0.5);
    expect(player.take()).toEqual(['seek:0', 'play']);
  });

  it('a seek that rejects is swallowed', async () => {
    const { driver, engine } = await ready();
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    engine.play('buy', 0.5);
    driver.players[0].seekTo = () => Promise.reject(new Error('seek failed'));
    engine.play('buy', 0.5);
    await vi.advanceTimersByTimeAsync(10);
    process.off('unhandledRejection', unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });
});

describe('music', () => {
  const music = { key: 'music_main', source: 9, volume: 0.35 };

  it('asked before the engine is ready, it starts as soon as it is: looping, eased in', async () => {
    const { driver, engine } = make({ music });
    engine.music.set(true, true);
    expect(driver.players).toHaveLength(0);
    await engine.init();
    const player = driver.playing(9)[0];
    expect(player.loop).toBe(true);
    expect(player.take()).toEqual(['volume:0', 'play']);
    vi.advanceTimersByTime(300);
    expect(player.volume).toBeGreaterThan(0.1);
    expect(player.volume).toBeLessThan(0.3);
    vi.advanceTimersByTime(400);
    expect(player.volume).toBeCloseTo(0.35, 5);
    // One play() started it; the fade only moved the volume.
    expect(player.take().every((call) => call.startsWith('volume:'))).toBe(true);
  });

  it('use() switches the loop: the old player is released and the new source eases in (a mode that chooses its loop)', async () => {
    const { driver, engine } = await ready({ music });
    engine.music.set(true);
    const first = driver.playing(9)[0];
    engine.music.use(12, 0.5);
    expect(first.removed).toBe(true);
    const second = driver.playing(12)[0];
    expect(second.loop).toBe(true);
    expect(second.take()).toEqual(['volume:0', 'play']);
    vi.advanceTimersByTime(700);
    expect(second.volume).toBeCloseTo(0.5, 5);
    // The same source again changes nothing; back to the first one works the same way.
    engine.music.use(12, 0.5);
    expect(driver.playing(12)).toHaveLength(1);
    engine.music.use(9, 0.35);
    expect(second.removed).toBe(true);
    expect(driver.playing(9)).toHaveLength(1);
  });

  it('use() while music is off only changes what plays next', async () => {
    const { driver, engine } = await ready({ music });
    engine.music.use(12, 0.5);
    expect(driver.players).toHaveLength(0);
    engine.music.set(true);
    expect(driver.playing(12)).toHaveLength(1);
    expect(driver.playing(9)).toHaveLength(0);
  });

  it('without a fade it starts and stops at once', async () => {
    const { driver, engine } = await ready({ music });
    engine.music.set(true);
    const player = driver.playing(9)[0];
    expect(player.take()).toEqual(['volume:0.35', 'play']);
    engine.music.set(false);
    expect(player.take()).toEqual(['pause']);
    engine.music.set(true);
    expect(player.take()).toEqual(['play']);
    expect(driver.players).toHaveLength(1);
  });

  it('eases out, then pauses', async () => {
    const { driver, engine } = await ready({ music });
    engine.music.set(true);
    const player = driver.playing(9)[0];
    player.take();
    engine.music.set(false, true);
    expect(player.calls).not.toContain('pause');
    vi.advanceTimersByTime(120);
    expect(player.volume).toBeLessThan(0.35);
    expect(player.volume).toBeGreaterThan(0);
    vi.advanceTimersByTime(200);
    expect(player.volume).toBe(0);
    expect(player.take().pop()).toBe('pause');
  });

  it('switching back on during the fade-out carries on from where the volume is', async () => {
    const { driver, engine } = await ready({ music });
    engine.music.set(true);
    const player = driver.playing(9)[0];
    engine.music.set(false, true);
    vi.advanceTimersByTime(120);
    const level = player.volume;
    player.take();
    engine.music.set(true, true);
    vi.advanceTimersByTime(40);
    expect(player.volume).toBeGreaterThan(level);
    vi.advanceTimersByTime(1000);
    expect(player.volume).toBeCloseTo(0.35, 5);
    expect(player.calls).not.toContain('pause');
  });

  it('asking for the same thing again does not restart the fade', async () => {
    const { driver, engine } = await ready({ music });
    engine.music.set(true, true);
    const player = driver.playing(9)[0];
    vi.advanceTimersByTime(300);
    const level = player.volume;
    engine.music.set(true, true);
    expect(player.volume).toBe(level);
    vi.advanceTimersByTime(300);
    expect(player.volume).toBeCloseTo(0.35, 5);
  });

  it('a hard stop always pauses, even if the engine thinks it already did (the OS resumes players)', async () => {
    const { driver, engine } = await ready({ music });
    engine.music.set(true);
    engine.music.set(false);
    const player = driver.playing(9)[0];
    player.take();
    engine.music.set(false);
    expect(player.take()).toEqual(['pause']);
  });

  it('setVolume changes it while playing and is remembered while paused', async () => {
    const { driver, engine } = await ready({ music });
    engine.music.set(true);
    const player = driver.playing(9)[0];
    engine.music.setVolume(0.2);
    expect(player.volume).toBe(0.2);
    engine.music.set(false);
    engine.music.setVolume(5);
    player.take();
    engine.music.set(true);
    expect(player.take()).toEqual(['volume:1', 'play']);
  });

  it('no music file means no music player', async () => {
    const { driver, engine } = await ready();
    engine.music.set(true, true);
    engine.music.setVolume(0.5);
    engine.music.kick();
    vi.advanceTimersByTime(1000);
    expect(driver.players).toHaveLength(0);
  });

  it('the music player counts against the budget without being re-used for sounds', async () => {
    const sounds = [spec('a', 1), spec('b', 2), spec('c', 3)];
    const { driver, engine } = await ready({ music, sounds, budget: 3 });
    engine.music.set(true);
    engine.play('a', 0.5);
    engine.play('b', 0.5);
    for (const player of driver.playing(1).concat(driver.playing(2))) player.finish(0.1);
    vi.advanceTimersByTime(5000);
    engine.play('c', 0.5);
    expect(driver.playing(9)).toHaveLength(1);
    expect(driver.alive).toHaveLength(3);
  });

  it('web: a start the browser blocked is retried on the next taps until it works', async () => {
    const { driver, engine } = await ready({ os: 'web', music });
    engine.music.set(true, true);
    const player = driver.playing(9)[0];
    const blocked = { playing: false, error: 'play() failed because the user did not interact with the document first' };
    player.emit(blocked);
    expect(player.removed).toBe(false);
    player.take();
    engine.music.kick();
    expect(player.take()).toContain('play');
    player.emit(blocked); // still not allowed (that event was not a real user gesture)
    vi.advanceTimersByTime(1500);
    player.take();
    engine.music.kick();
    expect(player.take()).toContain('play');
    player.emit({ playing: true, error: null });
    vi.advanceTimersByTime(1500);
    engine.music.kick();
    expect(player.take().filter((c) => c === 'play')).toEqual([]);
  });

  it('music that something else stopped (headphones unplugged, a call) restarts on the next nudge', async () => {
    const { driver, engine } = await ready({ os: 'android', music });
    engine.music.set(true);
    const player = driver.playing(9)[0];
    player.emit({ playing: true, error: null });
    player.take();
    engine.music.kick();
    expect(player.take()).toEqual([]);
    player.emit({ playing: false, error: null }); // paused from outside
    engine.music.kick();
    expect(player.take()).toEqual(['play']);
    // Nudges are rate-limited, and one is enough unless the player complains again.
    player.emit({ playing: false, error: null });
    engine.music.kick();
    expect(player.take()).toEqual([]);
    vi.advanceTimersByTime(1000);
    engine.music.kick();
    expect(player.take()).toEqual(['play']);
    engine.music.kick();
    vi.advanceTimersByTime(5000);
    engine.music.kick();
    expect(player.take()).toEqual([]);
  });

  it('a nudge never starts music that is switched off', async () => {
    const { driver, engine } = await ready({ os: 'ios', music });
    engine.music.set(true);
    engine.music.set(false);
    const player = driver.playing(9)[0];
    player.emit({ playing: false, error: null });
    player.take();
    engine.music.kick();
    expect(player.take()).toEqual([]);
  });

  it('native: a broken music player is rebuilt once, then music gives up quietly', async () => {
    const { driver, engine } = await ready({ os: 'ios', music });
    engine.music.set(true);
    driver.playing(9)[0].emit({ error: 'decode failed' });
    expect(driver.players).toHaveLength(2);
    expect(driver.players[0].removed).toBe(true);
    expect(driver.players[1].calls).toContain('play');
    driver.players[1].emit({ error: 'decode failed' });
    expect(driver.alive).toHaveLength(0);
    engine.music.set(false);
    engine.music.set(true);
    expect(driver.players).toHaveLength(2);
  });

  it('stopAll does not touch the music', async () => {
    const { driver, engine } = await ready({ music });
    engine.music.set(true);
    const player = driver.playing(9)[0];
    player.take();
    engine.stopAll(true);
    expect(player.take()).toEqual([]);
  });
});

describe('dispose', () => {
  it('releases every player and turns the engine off', async () => {
    const { driver, engine } = await ready({ music: { key: 'music_main', source: 9, volume: 0.3 }, preload: ['buy', 'coin'] });
    engine.preload();
    engine.music.set(true, true);
    engine.play('buy', 0.5);
    engine.dispose();
    vi.advanceTimersByTime(5000);
    expect(driver.alive).toHaveLength(0);
    for (const player of driver.players) expect(player.calls.slice(-3)).toEqual(['pause', 'remove', 'release']);
    engine.play('buy', 0.5);
    engine.music.set(true);
    engine.refreshSession();
    await vi.advanceTimersByTimeAsync(100);
    expect(driver.alive).toHaveLength(0);
    expect(driver.configured).toBe(1);
  });
});

describe('the driver contract', () => {
  it('uses nothing of a player beyond PlayerLike', async () => {
    // A driver whose players are bare objects: the engine must not reach for anything else.
    const made: Record<string, unknown>[] = [];
    const driver: AudioDriver = {
      configure: () => Promise.resolve(),
      createPlayer: () => {
        const player = {
          volume: 1,
          loop: false,
          play() {},
          pause() {},
          seekTo() {},
          replace() {},
          remove() {},
          addListener: () => ({ remove() {} }),
        };
        made.push(player);
        return player;
      },
    };
    const engine = new AudioEngine({ os: 'web', driver: () => driver, clock: testClock });
    engine.register({ sounds: [spec('buy', 1)], preload: ['buy'], music: { key: 'music_main', source: 2, volume: 0.3 } });
    await engine.init();
    engine.preload();
    vi.advanceTimersByTime(100);
    engine.play('buy', 0.4);
    engine.play('buy', 0.4);
    engine.music.set(true, true);
    vi.advanceTimersByTime(1000);
    engine.stopAll(true);
    engine.dispose();
    expect(made).toHaveLength(2);
  });
});
