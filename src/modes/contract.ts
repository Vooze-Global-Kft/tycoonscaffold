/**
 * The mode entry contract: what the app shell needs from a game mode.
 *
 * A game's mode (game.json `mode`) picks one entry, src/modes/<mode>/index.tsx. The app reaches
 * everything mode-specific only through src/generated/mode.ts, which scripts/lib/games.js writes
 * to import that one entry; so a game's bundle holds its own mode's screens, art and tutorial and
 * no other mode's. Shared code (everything outside a mode's folders, see scripts/lib/modes.js)
 * never imports from a mode's folders: when it needs something only a mode has, the entry hands
 * it over here, at install. How to add a mode: docs/design/space-bundle.md.
 */
import type { ComponentType } from 'react';
import { baseGame } from '../config/game';
import type { GameConfig } from '../config/schema';
import { setModePresets, type PresetName } from '../dev/presets';
import { createInitialState } from '../engine/economy';
import { installEngineMode, type EngineMode } from '../engine/mode';
import type { GameState } from '../engine/types';
import type { FxName } from '../services/fx';
import { modeSounds } from '../state/modeEvents';
import { useGame } from '../state/store';
import { registerArtIcons, type ArtIconSource } from '../ui/art/icons';
import { setHintSource, type Hint, type HintSource } from '../ui/hints/source';
import { setModeParts, type ModeParts } from '../ui/modeParts';

export type ModeId = 'sim' | 'classic' | 'haul';

export interface ModeEntry {
  id: ModeId;
  /**
   * The whole game screen once the save, fonts and remote config are in. The sim and classic
   * modes use the shared tab shell (src/ui/shell/TabShell.tsx) with their own home tab; a mode
   * without tabs (haul) brings its own screen, with its own overlays.
   */
  Shell: ComponentType;
  /**
   * The screen shown while the save, fonts and remote config load, right after the splash (Decision
   * 55: nothing a player sees before the game is the same in two apps). It reads what it needs from
   * the store (`cfg`); the display font may not be loaded yet. None: the shared one in App.tsx (the
   * hero icon bouncing over the game's name; sim and classic).
   */
  Loading?: ComponentType;
  /** Drawings shared screens ask for: "char:" icons (GameIcon), the cast member in a card, the tutorial pointer. */
  parts?: ModeParts;
  /** The "art:" icons this mode draws (src/ui/art/icons.ts). None: every "art:" icon shows the fallback. */
  artIcons?: Record<string, ArtIconSource>;
  /** The tutorial hand's script (src/ui/hints/source.ts). None: no tutorial hand. */
  hints?: HintSource<Hint>;
  /** Development review screens by `?view=<name>` in the web preview (never on phones). */
  devViews?: Record<string, ComponentType>;
  /**
   * The mode's own rules (src/engine/mode.ts), for a mode that does not run on the built-in sim
   * and classic rules (haul). Installed before the store boots; the shared engine reaches the
   * rules only through it, so no other game's bundle holds them.
   */
  engine?: EngineMode;
  /** The web preview's `?preset=fresh|early|mid|late` states for this mode (src/dev/presets.web.ts; web only, the phone build installs none). None: the list homes' bot. */
  presets?: (cfg: GameConfig, name: PresetName, now: number) => GameState;
  /**
   * The mode's own fx key for each shared key the shared store and screens play (errata 30:
   * `card_levelup`, `mission_complete`, `offline_collect`, ...), for a mode whose fx table has
   * none of them (haul). None: the shared keys play as written (sim, classic).
   */
  soundKeys?: Readonly<Partial<Record<FxName, FxName>>>;
}

/** Hands the entry's pieces to the shared code. Called once, by App.tsx, before anything renders. */
export function installMode(entry: ModeEntry): void {
  setModeParts(entry.parts ?? {});
  if (entry.artIcons) registerArtIcons(entry.artIcons);
  setHintSource(entry.hints ?? null);
  setModePresets(entry.presets ?? null);
  modeSounds.set(entry.soundKeys ?? null);
  installEngineMode(entry.engine ?? null);
  if (entry.engine) {
    // The mode's own block of game.json (opaque in the shared schema) parsed with its defaults, in
    // place: baseGame is the object the store, its boot and the remote overrides all read.
    if (entry.engine.config) Object.assign(baseGame, entry.engine.config(baseGame));
    // The store was created before the engine existed: give it a fresh game of this mode until boot loads the save.
    const { cfg, hydrated } = useGame.getState();
    if (!hydrated) useGame.setState({ game: createInitialState(cfg, Date.now()) });
  }
}
