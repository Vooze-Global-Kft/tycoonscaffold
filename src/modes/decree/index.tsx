/**
 * Mode entry "decree" (High Office: a satirical desk game; each paper pushed up to sign or pulled down
 * into the drawer FOR FURTHER STUDY; docs/design/office-design.md). Reached only through
 * src/generated/mode.ts.
 *
 * What it hands over at install (src/modes/contract.ts):
 * - `engine`: the decree rules as an engine mode (src/engine/decreeMode.ts), with the two seams of 2.15;
 * - `Shell`: its own whole screen (src/ui/decree/DecreeShell.tsx), no tab shell;
 * - `Loading`: its own loading screen (src/ui/decree/overlays/Loading.tsx);
 * - `presets`: `?preset=` states (web only: ./presets.web.ts; on phones ./presets.ts has none);
 * - `soundKeys`: the decree key for each shared key the store plays (./soundKeys.ts, the sound package's);
 * - `devViews`: web preview only (./devViews.web.ts; on phones ./devViews.ts has none).
 * - `parts`: the pen as the hint pointer (src/ui/decree/PenPointer.tsx, PLATFORM) and `parts.Icon`
 *   for "art:" and "face:" names (the art kit's DecreeIcon: cached PNGs of the clubs, effects,
 *   ministries, monuments, buttons and the cast's busts); no "char:" portraits, no card bust;
 * - `hints`: the pen's source for the shared hint layer (src/ui/decree/PenPointer.tsx `decreeHints`,
 *   over the rules' hintsFor; the desk's own pen layer draws the strokes);
 * It never imports the tabs family or another mode's folders (npm run check:bundle).
 * Written by the skeleton; owned by the wiring owner (spec 9.2 P3).
 */
import { decreeEngineMode } from '../../engine/decreeMode';
import type { FxName } from '../../services/fx';
import type { DecreeFxName } from '../../services/fx/catalog.decree';
import { DecreeIcon, DECREE_ICON_PREFIXES } from '../../ui/decree/art/DecreeIcon';
import { DecreeShell } from '../../ui/decree/DecreeShell';
import { decreeHints, PenPointer } from '../../ui/decree/PenPointer';
import { DecreeLoading } from '../../ui/decree/overlays/Loading';
import type { ModeEntry } from '../contract';
import { devViews } from './devViews';
import { listenDecreeEvents } from './fx';
import { decreePreset } from './presets';
import { DECREE_SHARED_SOUNDS } from './soundKeys';

listenDecreeEvents();

const entry: ModeEntry = {
  id: 'decree',
  Shell: DecreeShell,
  Loading: DecreeLoading,
  engine: decreeEngineMode,
  parts: { HintPointer: PenPointer, Icon: DecreeIcon, iconPrefixes: DECREE_ICON_PREFIXES },
  hints: decreeHints,
  presets: decreePreset,
  devViews,
  soundKeys: DECREE_SHARED_SOUNDS satisfies Partial<Record<FxName, DecreeFxName>>,
};

export default entry;
