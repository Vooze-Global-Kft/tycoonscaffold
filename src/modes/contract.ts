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
import type { GameConfig } from '../config/schema';
import { setModePresets, type PresetName } from '../dev/presets';
import { createInitialState } from '../engine/economy';
import { installEngineMode, type EngineMode } from '../engine/mode';
import type { GameState } from '../engine/types';
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
  /** The web preview's `?preset=fresh|early|mid|late` states for this mode (src/dev/presets.ts). None: the list homes' bot. */
  presets?: (cfg: GameConfig, name: PresetName, now: number) => GameState;
}

/** Hands the entry's pieces to the shared code. Called once, by App.tsx, before anything renders. */
export function installMode(entry: ModeEntry): void {
  setModeParts(entry.parts ?? {});
  if (entry.artIcons) registerArtIcons(entry.artIcons);
  setHintSource(entry.hints ?? null);
  setModePresets(entry.presets ?? null);
  if (entry.engine) {
    installEngineMode(entry.engine);
    // The store was created before the engine existed: give it a fresh game of this mode until boot loads the save.
    const { cfg, hydrated } = useGame.getState();
    if (!hydrated) useGame.setState({ game: createInitialState(cfg, Date.now()) });
  }
}
