/**
 * The sound engine, on expo-audio (SDK 58).
 *
 * What expo-audio gives us, and what that means here:
 *
 * - One `AudioPlayer` per loaded file (an AVQueuePlayer on iOS, a full ExoPlayer
 *   with its own thread, media session and audio track on Android, an <audio>
 *   element on web). Players are therefore a limited resource: Android allows an
 *   app about 40 audio tracks, mobile Chrome 40 media elements. The engine keeps
 *   a budget per platform, creates players for the frequent sounds first, creates
 *   the rest the first time they are needed, and when the budget is spent it
 *   re-uses the player that has been idle longest (`player.replace()`).
 * - A finished player stays at the end of its file. The engine rewinds it as soon
 *   as it finishes ("parks" it), so the next play is a bare `play()` with nothing
 *   to seek or buffer: that is what keeps taps tight.
 * - Sounds that overlap themselves get 2 or 3 players for the same file and take
 *   turns; every other sound restarts when it is triggered again.
 * - The audio session must be configured before the first sound: unconfigured,
 *   iOS would silence the player's own music and Android would take audio focus.
 *
 * This file has no static import of React Native or expo-audio. The platform is
 * passed in and expo-audio is reached through a small driver, so the engine runs
 * against a fake driver in the unit tests.
 */
import type { AudioMode } from 'expo-audio';
import type { Clock } from './clock';
import { systemClock } from './clock';
import type { SoundPlan, SoundSpec } from './mix';

type ExpoAudio = typeof import('expo-audio');

// --- the slice of expo-audio the engine uses --------------------------------

/** The fields of expo-audio's `AudioStatus` the engine reads. */
export interface PlayerStatus {
  didJustFinish?: boolean;
  playing?: boolean;
  /** Seconds. */
  duration?: number;
  error?: string | null;
}

/** The part of expo-audio's `AudioPlayer` the engine uses. */
export interface PlayerLike {
  volume: number;
  loop: boolean;
  play(): void;
  pause(): void;
  seekTo(seconds: number): unknown;
  replace(source: number): void;
  remove(): void;
  release?(): void;
  addListener(event: 'playbackStatusUpdate', listener: (status: PlayerStatus) => void): { remove(): void };
}

export interface AudioDriver {
  /** Applies the audio session rules. Nothing plays until this has resolved. */
  configure(): Promise<void>;
  createPlayer(source: number): PlayerLike;
}

/**
 * expo-audio as a driver, or null when the native module is not in this binary.
 *
 * Session rules:
 * - `mixWithOthers`: the player's own music or podcast keeps playing. On iOS
 *   this is the "ambient" session category; on Android no audio focus is
 *   requested at all.
 * - iOS obeys the silent switch (`playsInSilentMode: false`). On Android the
 *   same flag would also mute the game whenever the ringer is on vibrate, which
 *   no Android game does, so there the media volume is what counts.
 * - Nothing plays in the background; expo-audio pauses every player when the
 *   app leaves the foreground.
 */
export function expoAudioDriver(os: string): AudioDriver | null {
  let audio: ExpoAudio;
  try {
    audio = require('expo-audio') as ExpoAudio;
  } catch {
    return null;
  }
  const mode: Partial<AudioMode> = {
    interruptionMode: 'mixWithOthers',
    playsInSilentMode: os !== 'ios',
    shouldPlayInBackground: false,
    allowsRecording: false,
    shouldRouteThroughEarpiece: false,
  };
  return {
    configure: () => audio.setAudioModeAsync(mode),
    createPlayer: (source) =>
      audio.createAudioPlayer(source, {
        // Nobody watches playback progress, so ask for (almost) no progress events.
        updateInterval: 60_000,
        // Keep the iOS session up between sounds instead of re-activating it for each one.
        keepAudioSessionActive: true,
      }),
  };
}

/** How many players may exist at once, the music player included. */
export function playerBudget(os: string, androidApi = 0): number {
  if (os === 'ios') return 64;
  // Android 9+ gives an app 40 audio tracks (older versions 14); leave room for video ads.
  if (os === 'android') return androidApi >= 28 ? 28 : 10;
  return 32;
}

// --- the engine -----------------------------------------------------------

const MAX_FAILURES = 2;
/** Players created per preload step, and the pause between steps, so startup never stalls on audio. */
const PRELOAD_BATCH = 2;
const PRELOAD_GAP_MS = 30;
/** A "finished" event this soon after a restart belongs to the previous playback. */
const STALE_FINISH_MS = 100;
/** Until a file's length is known: how long a voice counts as sounding for overlap, and for being re-used. */
const ASSUMED_LENGTH_MS = 300;
const ASSUMED_BUSY_MS = 3000;
/** Voices started this recently are stopped again on the way back to the foreground (the OS may have resumed them). */
const RESUME_SWEEP_MS = 10_000;
const MUSIC_FADE_IN_MS = 600;
const MUSIC_FADE_OUT_MS = 250;
const FADE_STEP_MS = 40;
/** How often a stalled music player may be nudged. */
const MUSIC_KICK_GAP_MS = 1000;

interface Sound {
  spec: SoundSpec;
  slots: Slot[];
  /** Length of the file, learned the first time it plays to the end. 0 = not known yet. */
  durationMs: number;
  failures: number;
  growing: boolean;
}

/** One native player, bound to one sound at a time. */
interface Slot {
  sound: Sound;
  player: PlayerLike;
  subscription: { remove(): void } | null;
  /** Last volume sent to the player (NaN = unknown). */
  volume: number;
  /** Rewound and silent: the next play needs no seek. */
  parked: boolean;
  startedAt: number;
  dead: boolean;
}

export interface AudioEngineOptions {
  /** `Platform.OS`. */
  os: string;
  /** `Platform.Version` on Android (the API level). */
  androidApi?: number;
  /** Resolves the driver at init; null means "no audio in this build". */
  driver: () => AudioDriver | null;
  /** Overrides the platform's player budget. */
  budget?: number;
  clock?: Clock;
  /** Development diagnostics. */
  log?: (message: string) => void;
}

function attempt<T>(fn: () => T): T | undefined {
  try {
    return fn();
  } catch {
    return undefined;
  }
}

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

export class AudioEngine {
  private readonly os: string;
  private readonly clock: Clock;
  private readonly log: (message: string) => void;
  /** Most sound-effect players (the budget minus one for music). */
  private readonly capacity: number;
  /** Preloading stops here, leaving a few players for sounds created on demand. */
  private readonly preloadLimit: number;

  private driver: AudioDriver | null = null;
  private ready = false;
  private disposed = false;
  private starting: Promise<void> | null = null;
  private configuring: Promise<boolean> | null = null;

  private sounds = new Map<string, Sound>();
  private slots: Slot[] = [];
  private queue: string[] = [];
  private asked = new Map<string, number>();
  private wantPreload = false;
  private pumpTimer: unknown = null;

  private track = {
    source: undefined as number | undefined,
    player: null as PlayerLike | null,
    subscription: null as { remove(): void } | null,
    /** What the game wants. */
    on: false,
    fade: false,
    /** The volume music plays at, and the volume last sent to the player. */
    target: 0.35,
    level: NaN,
    /** We asked the player to play and have not paused it since. */
    sounding: false,
    /** False once the player reports it is not playing although it should be (see `music.kick`). */
    confirmed: false,
    kickedAt: -Infinity,
    failures: 0,
    timer: null as unknown,
  };

  constructor(private readonly options: AudioEngineOptions) {
    this.os = options.os;
    this.clock = options.clock ?? systemClock;
    this.log = options.log ?? (() => {});
    const budget = Math.max(2, Math.floor(options.budget ?? playerBudget(options.os, options.androidApi)));
    this.capacity = budget - 1;
    this.preloadLimit = Math.max(1, this.capacity - Math.min(6, Math.floor(budget / 5)));
  }

  /** Tells the engine which sounds exist. Call before init(). */
  register(plan: Pick<SoundPlan, 'sounds' | 'preload' | 'music'>): void {
    for (const spec of plan.sounds) {
      this.sounds.set(spec.key, { spec, slots: [], durationMs: 0, failures: 0, growing: false });
    }
    this.queue = [...plan.preload];
    if (plan.music) {
      this.track.source = plan.music.source;
      this.track.target = clamp01(plan.music.volume);
    }
  }

  /** Sets the audio session up. Resolves once sounds may play (or never will); never rejects. */
  init(): Promise<void> {
    return (this.starting ??= this.start());
  }

  private async start(): Promise<void> {
    this.driver = attempt(() => this.options.driver()) ?? null;
    if (!this.driver) {
      this.log('expo-audio is not available in this build: sound is off');
      return;
    }
    await this.configure();
  }

  private configure(): Promise<boolean> {
    const driver = this.driver;
    if (!driver || this.disposed) return Promise.resolve(false);
    return (this.configuring ??= Promise.resolve()
      .then(() => driver.configure())
      .then(
        () => true,
        (error) => {
          // Stay silent rather than play with a session that would interrupt the player's own audio.
          this.log(`could not configure the audio session, sound stays off for now: ${String(error)}`);
          return false;
        },
      )
      .then((ok) => {
        this.configuring = null;
        if (ok && !this.ready && !this.disposed) {
          this.ready = true;
          this.applyMusic(this.track.fade);
          if (this.wantPreload) this.pump();
        }
        return ok;
      })
      .catch(() => false));
  }

  /**
   * Call when the app returns to the foreground or a full-screen ad closes.
   * iOS has one audio session per app and ad SDKs change it, so it is applied
   * again; on every platform a failed first attempt is retried.
   */
  refreshSession(): void {
    if (this.driver && (!this.ready || this.os === 'ios')) void this.configure();
  }

  /** Starts creating players in the background, in the plan's order. Safe to call again. */
  preload(): void {
    this.wantPreload = true;
    if (this.ready) this.pump();
  }

  /** True when a file with this key is in the bundle. */
  has = (key: string): boolean => this.sounds.has(key);

  /** Plays a one-shot at `volume` (0..1). Does nothing when the file or the engine is not there. */
  play(key: string, volume: number): void {
    if (!this.ready) return;
    const sound = this.sounds.get(key);
    if (!sound) return;
    const now = this.clock.now();
    let slot = this.pickVoice(sound, now);
    const overlapped = slot !== null && this.sounding(slot, now, ASSUMED_LENGTH_MS);
    slot ??= this.acquire(sound, now, true);
    if (!slot) return;
    this.startSlot(slot, clamp01(volume), now);
    if (overlapped && sound.slots.length < sound.spec.maxVoices) this.grow(sound);
  }

  /**
   * Silences every sound effect now (the app left the foreground, an ad opened,
   * sound was switched off). With `sweep`, voices that played in the last few
   * seconds are stopped again even if they look idle: when the app comes back,
   * the OS resumes players it paused itself, and nobody wants the tail of an
   * old fanfare.
   */
  stopAll(sweep = false): void {
    const now = this.clock.now();
    for (const slot of [...this.slots]) {
      if (!slot.parked || (sweep && now - slot.startedAt < RESUME_SWEEP_MS)) this.park(slot);
    }
  }

  readonly music = {
    /** Starts or pauses the loop. With `fade`, it eases in or out instead of cutting. */
    set: (on: boolean, fade = false): void => {
      const track = this.track;
      // Already easing towards (or resting in) that state: do not restart the fade.
      if (fade && this.ready && on === track.on && on === track.sounding) return;
      track.on = on;
      track.fade = fade;
      this.applyMusic(fade);
    },
    setVolume: (volume: number): void => {
      const track = this.track;
      track.target = clamp01(volume);
      if (track.on && track.sounding) {
        this.stopFade();
        this.setLevel(track.target);
      }
    },
    /**
     * Starts the music again if it should be playing but the player says it is
     * not. That happens when something outside the game stopped it: a browser
     * refusing audio before the first tap, headphones being unplugged, a phone
     * call that ended without handing playback back. Cheap enough to call on
     * every tap and every sound.
     */
    kick: (): void => {
      const track = this.track;
      const player = track.player;
      if (!this.ready || !player || !track.on || !track.sounding || track.confirmed) return;
      const now = this.clock.now();
      if (now - track.kickedAt < MUSIC_KICK_GAP_MS) return;
      track.kickedAt = now;
      // Assume it worked; the player says so (again) if it did not.
      track.confirmed = true;
      attempt(() => player.play());
    },
  };

  /** Releases every player. The engine is unusable afterwards (used when the module is hot-reloaded). */
  dispose(): void {
    this.disposed = true;
    this.ready = false;
    if (this.pumpTimer !== null) this.clock.clearTimeout(this.pumpTimer);
    this.pumpTimer = null;
    this.queue = [];
    for (const slot of [...this.slots]) this.release(slot);
    this.releaseMusic();
  }

  // --- preloading -----------------------------------------------------------

  private pump(): void {
    if (this.pumpTimer !== null || this.queue.length === 0) return;
    const step = () => {
      this.pumpTimer = null;
      if (!this.ready) return;
      let made = 0;
      while (made < PRELOAD_BATCH && this.queue.length > 0) {
        if (this.slots.length >= this.preloadLimit) {
          this.queue = [];
          break;
        }
        const key = this.queue.shift() as string;
        const sound = this.sounds.get(key);
        if (!sound) continue;
        // The n-th time a key appears in the plan it asks for n voices; skip if a play already made them.
        const wanted = (this.asked.get(key) ?? 0) + 1;
        this.asked.set(key, wanted);
        if (sound.slots.length < Math.min(wanted, sound.spec.maxVoices) && this.create(sound)) made++;
      }
      if (this.queue.length > 0) this.pumpTimer = this.clock.setTimeout(step, PRELOAD_GAP_MS);
    };
    this.pumpTimer = this.clock.setTimeout(step, 0);
  }

  // --- voices ---------------------------------------------------------------

  /** Still making sound, as far as the clock can tell. */
  private sounding(slot: Slot, now: number, assumedMs: number): boolean {
    return !slot.parked && now - slot.startedAt < (slot.sound.durationMs || assumedMs);
  }

  /** The voice to (re)use for a sound: a parked one if there is one, otherwise the one that started first. */
  private pickVoice(sound: Sound, now: number): Slot | null {
    let best: Slot | null = null;
    let bestRank = 0;
    for (const slot of sound.slots) {
      const rank = slot.parked ? 0 : this.sounding(slot, now, ASSUMED_LENGTH_MS) ? 2 : 1;
      if (!best || rank < bestRank || (rank === bestRank && slot.startedAt < best.startedAt)) {
        best = slot;
        bestRank = rank;
      }
    }
    return best;
  }

  private startSlot(slot: Slot, volume: number, now: number): void {
    try {
      this.setVolume(slot, volume);
      if (!slot.parked) this.rewind(slot.player);
      slot.player.play();
      slot.parked = false;
      slot.startedAt = now;
    } catch {
      this.fail(slot);
    }
  }

  private setVolume(slot: Slot, volume: number): void {
    if (Math.abs(slot.volume - volume) < 0.004) return;
    slot.player.volume = volume;
    slot.volume = volume;
  }

  private rewind(player: PlayerLike): void {
    const seeking = attempt(() => player.seekTo(0)) as { catch?: (onRejected: () => void) => unknown } | undefined;
    if (seeking && typeof seeking.catch === 'function') seeking.catch(() => {});
  }

  /**
   * Stops a voice and puts it back at the start. The pause comes first on
   * purpose: an Android player that has finished still "wants to play", so a
   * bare seek would start it again.
   */
  private park(slot: Slot): void {
    attempt(() => slot.player.pause());
    this.rewind(slot.player);
    slot.parked = true;
  }

  /** A new player for the sound: a fresh one while the budget lasts, otherwise the longest-idle one, re-used. */
  private acquire(sound: Sound, now: number, mayTakeHot: boolean): Slot | null {
    if (this.slots.length < this.capacity) return this.create(sound);
    let victim: Slot | null = null;
    for (const slot of this.slots) {
      if (this.sounding(slot, now, ASSUMED_BUSY_MS)) continue;
      const hot = slot.sound.spec.hot;
      if (hot && !mayTakeHot) continue;
      // Rarely used sounds give up their player before frequent ones; within a group, the longest idle goes first.
      if (!victim || (victim.sound.spec.hot && !hot) || (victim.sound.spec.hot === hot && slot.startedAt < victim.startedAt)) {
        victim = slot;
      }
    }
    return victim ? this.rebind(victim, sound) : null;
  }

  private create(sound: Sound): Slot | null {
    const driver = this.driver;
    if (!driver || sound.failures >= MAX_FAILURES) return null;
    let player: PlayerLike;
    try {
      player = driver.createPlayer(sound.spec.source);
    } catch (error) {
      sound.failures++;
      this.log(`could not create a player for "${sound.spec.key}": ${String(error)}`);
      return null;
    }
    const slot: Slot = { sound, player, subscription: null, volume: NaN, parked: true, startedAt: -Infinity, dead: false };
    attempt(() => this.setVolume(slot, clamp01(sound.spec.volume)));
    slot.subscription = attempt(() => player.addListener('playbackStatusUpdate', (status) => this.onStatus(slot, status))) ?? null;
    sound.slots.push(slot);
    this.slots.push(slot);
    return slot;
  }

  private rebind(slot: Slot, sound: Sound): Slot | null {
    const previous = slot.sound;
    try {
      slot.player.replace(sound.spec.source);
    } catch {
      this.release(slot);
      return this.create(sound);
    }
    previous.slots.splice(previous.slots.indexOf(slot), 1);
    slot.sound = sound;
    sound.slots.push(slot);
    slot.parked = true;
    slot.startedAt = -Infinity;
    slot.volume = NaN; // a replaced <audio> element starts at full volume
    return slot;
  }

  /** Adds a voice for a sound that just had to cut itself off, after the current tap has been served. */
  private grow(sound: Sound): void {
    if (sound.growing) return;
    sound.growing = true;
    this.clock.setTimeout(() => {
      sound.growing = false;
      if (this.ready && sound.slots.length < sound.spec.maxVoices) this.acquire(sound, this.clock.now(), false);
    }, 0);
  }

  private onStatus(slot: Slot, status: PlayerStatus): void {
    if (slot.dead || !status) return;
    // A browser also reports "blocked until the first tap" as an error: that is not a broken player.
    if (status.error && this.os !== 'web') {
      this.fail(slot);
      return;
    }
    if (!status.didJustFinish || slot.parked) return;
    const durationMs = (status.duration ?? 0) * 1000;
    // Restarted a moment ago: this "finished" is the previous playback's, not the one now sounding.
    if (this.clock.now() - slot.startedAt < Math.min(durationMs / 2, STALE_FINISH_MS)) return;
    if (durationMs > 0) slot.sound.durationMs = durationMs;
    this.park(slot);
  }

  private fail(slot: Slot): void {
    slot.sound.failures++;
    if (slot.sound.failures === MAX_FAILURES) this.log(`"${slot.sound.spec.key}" keeps failing to play and is now off`);
    this.release(slot);
  }

  private release(slot: Slot): void {
    slot.dead = true;
    const list = slot.sound.slots;
    if (list.includes(slot)) list.splice(list.indexOf(slot), 1);
    if (this.slots.includes(slot)) this.slots.splice(this.slots.indexOf(slot), 1);
    this.destroy(slot.player, slot.subscription);
  }

  private destroy(player: PlayerLike, subscription: { remove(): void } | null): void {
    attempt(() => subscription?.remove());
    attempt(() => player.pause());
    attempt(() => player.remove());
    attempt(() => player.release?.());
  }

  // --- music ------------------------------------------------------------------

  private applyMusic(fade: boolean): void {
    const track = this.track;
    if (!this.ready || track.source === undefined) return;
    this.stopFade();
    if (track.on) {
      if (!track.player && !this.createMusic()) return;
      const player = track.player as PlayerLike;
      if (fade) {
        if (!track.sounding) this.setLevel(0);
        this.fadeTo(track.target, MUSIC_FADE_IN_MS);
      } else {
        this.setLevel(track.target);
      }
      track.sounding = true;
      attempt(() => player.play());
    } else if (track.player) {
      const player = track.player;
      // Always pause, even if we believe it is paused: the OS may have resumed it when the app came back.
      const stop = () => {
        track.sounding = false;
        track.confirmed = false;
        attempt(() => player.pause());
      };
      if (fade && track.sounding) this.fadeTo(0, MUSIC_FADE_OUT_MS, stop);
      else stop();
    }
  }

  private createMusic(): boolean {
    const track = this.track;
    if (!this.driver || track.source === undefined || track.failures >= MAX_FAILURES) return false;
    try {
      const player = this.driver.createPlayer(track.source);
      player.loop = true;
      track.player = player;
      track.level = NaN;
      track.sounding = false;
      track.confirmed = false;
      track.subscription = attempt(() => player.addListener('playbackStatusUpdate', (status) => this.onMusicStatus(player, status))) ?? null;
      return true;
    } catch (error) {
      track.failures++;
      this.log(`could not create the music player: ${String(error)}`);
      return false;
    }
  }

  private onMusicStatus(player: PlayerLike, status: PlayerStatus): void {
    const track = this.track;
    if (player !== track.player || !status) return;
    if (typeof status.playing === 'boolean') track.confirmed = status.playing;
    if (!status.error) return;
    if (this.os === 'web') {
      track.confirmed = false; // most likely blocked until the first tap; kick() retries
      return;
    }
    track.failures++;
    this.releaseMusic();
    this.applyMusic(false);
  }

  private releaseMusic(): void {
    const track = this.track;
    this.stopFade();
    if (track.player) this.destroy(track.player, track.subscription);
    track.player = null;
    track.subscription = null;
    track.sounding = false;
    track.confirmed = false;
    track.level = NaN;
  }

  private setLevel(volume: number): void {
    const track = this.track;
    const player = track.player;
    if (!player || Math.abs(track.level - volume) < 0.002) return;
    attempt(() => {
      player.volume = volume;
    });
    track.level = volume;
  }

  private fadeTo(to: number, ms: number, done?: () => void): void {
    const track = this.track;
    const from = Number.isFinite(track.level) ? track.level : 0;
    const steps = Math.max(1, Math.round(ms / FADE_STEP_MS));
    let i = 0;
    const tick = () => {
      i++;
      this.setLevel(i < steps ? from + ((to - from) * i) / steps : to);
      if (i < steps) {
        track.timer = this.clock.setTimeout(tick, FADE_STEP_MS);
      } else {
        track.timer = null;
        done?.();
      }
    };
    track.timer = this.clock.setTimeout(tick, FADE_STEP_MS);
  }

  private stopFade(): void {
    if (this.track.timer !== null) this.clock.clearTimeout(this.track.timer);
    this.track.timer = null;
  }
}
