/**
 * PLACEHOLDER rules state of the salvage mode (the scrapyard): only what the ground work's test yard
 * needs (docs/design/yard-ground.md): cash (the shared `cash`), what the worker carries, which test
 * wrecks are cut, and the last presence sample the screen sent. The rules engineers replace all of it
 * once docs/design/yard-design.md exists: keep it small until then.
 *
 * THE WORLD AND THE SCREEN ARE KEPT APART (docs/design/research/yard-tech.md B3, B8): the worker's
 * position lives on the UI thread (src/ui/salvage/world); the rules never move it. The screen samples
 * where the worker stands (which thing it is next to) at most ten times a second and hands it to the
 * rules as `Presence` (src/modes/salvage/actions.ts `presence`); the rules decide what that does.
 */
import type { GameConfig } from '../../config/schema';
import type { SalvageContent } from '../../config/schema.salvage';
import type { GameState } from '../types';

export type * from '../../config/schema.salvage';

/** The shared config with the parsed `salvage` block. */
export type SalvageConfig = GameConfig & { salvage: SalvageContent };

/** What the screen last reported: the thing the worker stands next to (a prop id, or null). */
export interface Presence {
  near: string | null;
  /** The worker sits in the truck (the truck cannot cut; it unloads like the worker). */
  driving: boolean;
  /**
   * The stick is held past its dead zone when the sample is taken (the body is being steered). The
   * screen only reports it; the rules decide what moving means (the placeholder: a wreck is cut only
   * while the worker stands still next to it, "walk to a wreck, hold to cut; moving again cancels").
   */
  moving: boolean;
  /** Where the worker stood, metres (the rules check the distance again). */
  x: number;
  y: number;
}

export interface WreckState {
  id: string;
  /** 0 to 1 while being cut; 1 = cut (lying in pieces). */
  cut: number;
  /** Play-clock second the wreck was cut (it is whole again `loop.respawnSeconds` later); null when whole. */
  cutAt: number | null;
}

export interface SalvageState {
  /** Layout of this state; a save of another version starts afresh. */
  v: 1;
  /** Pieces the worker carries (at most `loop.capacity`). */
  carried: number;
  wrecks: WreckState[];
  presence: Presence;
  /** Play-clock second of the last presence sample (stale ones are ignored). */
  presenceAt: number;
  /** Seconds collected towards the next piece unloaded at the machine. */
  unloadT: number;
  /** Pieces unloaded since the game began (the test loop's counter). */
  unloaded: number;
}

export type SalvageGame = GameState & { salvage: SalvageState };

/** What the rules report to the screen in a tick (the screen's shrink and pop, later the sounds). */
export type SalvageEvent = { type: 'cut'; wreck: string; pieces: number } | { type: 'unload'; value: number } | { type: 'whole'; wreck: string };
