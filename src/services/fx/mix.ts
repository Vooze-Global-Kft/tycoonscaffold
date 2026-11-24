/**
 * Mix decisions that are about the engine rather than the sound design, so
 * they stay out of the catalogue: which sounds get their player first, which
 * may overlap themselves, and how the catalogue maps onto the sound files a
 * game actually ships. Pure; no React Native imports.
 */
import type { FxName, FxRuntimeDef } from './catalog';
import { fileKeys } from './variants';

/** The looping music entry that `fx.music` plays. */
export const MUSIC: FxName = 'music_main';

/**
 * Even an event with no `minIntervalMs` is not played twice within this many
 * ms: two triggers in one frame are one sound, not a louder one.
 */
export const DEDUPE_MS = 30;

/**
 * Players are a limited resource (see audio.ts), so they are created in this
 * order: first the events with a `preload` rank in the catalogue, lowest first
 * (the sounds a finger is waiting for, then the scene), then the rest of the
 * game's table in the order it is written. The ranks live in the catalogue, so
 * a game's bundle names only its own mode's events.
 */
export function preloadFirst(catalog: Readonly<Record<string, FxRuntimeDef>>): string[] {
  return Object.keys(catalog)
    .filter((name) => catalog[name].preload !== undefined)
    .sort((a, b) => catalog[a].preload! - catalog[b].preload!);
}

/**
 * How many copies of one file may sound at once, by event (catalogue `voices`).
 * Without an entry a sound has one voice and restarts when it is triggered
 * again. `coin` needs no entry: its three files already take turns.
 */
export function voicesOf(catalog: Readonly<Record<string, FxRuntimeDef>>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const name of Object.keys(catalog)) if (catalog[name].voices !== undefined) out[name] = catalog[name].voices!;
  return out;
}

export interface SoundSpec {
  /** File key, e.g. "tap_3". */
  key: string;
  /** The bundled asset (what `require()` returned). */
  source: number;
  /** Volume the player is created with; each play may set another. */
  volume: number;
  /** Most copies of this file that may sound at once. */
  maxVoices: number;
  /** Fired often: the last to lose its player when the platform runs short. */
  hot: boolean;
}

export interface SoundPlan {
  /** Every one-shot sound that has a file. */
  sounds: SoundSpec[];
  /** File keys in the order their players should be created. A key listed twice asks for a second voice. */
  preload: string[];
  /** The music loop, when its file exists. */
  music?: { key: string; source: number; volume: number };
  /**
   * The catalogue's OTHER loops with a file, by event name (a mode that chooses its loop, `fx.music.choose`).
   * Absent when the catalogue has no loop but `music_main`; nothing plays them unless a mode chooses one.
   */
  loops?: Record<string, { key: string; source: number; volume: number }>;
  /** Catalogue files that are not in the bundle (those events are silent). */
  missing: string[];
  /** Bundled files that no catalogue entry uses. */
  unused: string[];
}

export function planSounds(
  catalog: Readonly<Record<string, FxRuntimeDef>>,
  files: Readonly<Record<string, number>>,
  first: readonly string[] = preloadFirst(catalog),
  voices: Readonly<Record<string, number | undefined>> = voicesOf(catalog),
): SoundPlan {
  const plan: SoundPlan = { sounds: [], preload: [], missing: [], unused: [] };
  const used = new Set<string>();
  const names = Object.keys(catalog);
  const isHot = (name: string) => first.includes(name) || catalog[name].minIntervalMs !== undefined;
  const present = (name: string) => fileKeys(name, catalog[name]).filter((key) => files[key] !== undefined);

  for (const name of names) {
    const def = catalog[name];
    for (const key of fileKeys(name, def)) {
      used.add(key);
      const source = files[key];
      if (source === undefined) {
        plan.missing.push(key);
      } else if (def.loop) {
        if (name === MUSIC) plan.music = { key, source, volume: def.volume };
        else (plan.loops ??= {})[name] = { key, source, volume: def.volume };
      } else {
        const maxVoices = Math.max(1, Math.floor(voices[name] ?? 1));
        plan.sounds.push({ key, source, volume: def.volume, maxVoices, hot: isHot(name) });
      }
    }
  }
  plan.unused = Object.keys(files).filter((key) => !used.has(key));

  const oneShots = names.filter((name) => !catalog[name].loop);
  const priority = [
    ...first.filter((name) => oneShots.includes(name)),
    ...oneShots.filter((name) => !first.includes(name) && isHot(name)),
  ];
  // One voice for every frequent sound, then their extra voices, then everything else.
  for (const name of priority) plan.preload.push(...present(name));
  for (const name of priority) {
    for (let extra = 1; extra < Math.floor(voices[name] ?? 1); extra++) plan.preload.push(...present(name));
  }
  for (const name of oneShots) if (!priority.includes(name)) plan.preload.push(...present(name));
  return plan;
}
