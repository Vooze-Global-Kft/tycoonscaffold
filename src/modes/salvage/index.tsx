/**
 * Mode entry "salvage" (the scrapyard, game "scrap-yard"): a landscape yard several screens wide in a
 * three-quarter view, over which one thumb on a floating stick steers a worker (docs/design/yard-ground.md;
 * the game is specified in docs/design/yard-design.md, its first yard in docs/design/yard-stage1.md).
 * Reached only through src/generated/mode.ts.
 *
 * What it hands over at install (src/modes/contract.ts):
 * - `engine`: the salvage rules as an engine mode (src/engine/salvageMode.ts: save tag salvage1,
 *   paysOnCompute, catchUpSeconds 0);
 * - `Shell`: its own whole screen (src/ui/salvage/SalvageShell.tsx), no tab shell, its own overlays;
 * - `Loading`: its own loading screen, the loading animation (src/ui/salvage/Loading.tsx);
 * - `presets`: `?preset=` states (web only: ./presets.web.ts; on phones ./presets.ts has none);
 * - `soundKeys`: the salvage key for each shared key the shared store and kit play (./soundKeys.ts, the
 *   sound package's table);
 * - `devViews`: web preview only (./devViews.web.ts; on phones ./devViews.ts has none).
 * No parts, hints or "art:" icons: the yard draws its own world, its hints are its own (src/ui/salvage/hints)
 * and no shared screen shows a salvage portrait or icon.
 *
 * SOUND has one listener, the shell's event pump (src/ui/salvage/hud/pump.ts, the hud package's): it takes
 * every batch of src/state/modeEvents.ts and plays each cue of `salvageSoundsFor(event)`, the segments and
 * the music's ducks. This entry subscribes nothing (agreed in the shared requests.md, 25 November), so no
 * event plays twice.
 * It never imports the tabs family or another mode's folders (npm run check:bundle).
 * Owned by the wiring step (BUILD.md).
 */
import { salvageEngineMode } from '../../engine/salvageMode';
import type { FxName } from '../../services/fx';
import type { SalvageFxName } from '../../services/fx/catalog.salvage';
import { SalvageLoading } from '../../ui/salvage/Loading';
import { SalvageShell } from '../../ui/salvage/SalvageShell';
import type { ModeEntry } from '../contract';
import { devViews } from './devViews';
import { salvagePreset } from './presets';
import { deferAwayInPlace } from './returning';
import { SALVAGE_SHARED_SOUNDS } from './soundKeys';

const entry: ModeEntry = {
  id: 'salvage',
  Shell: SalvageShell,
  Loading: SalvageLoading,
  // owner2-hud (the second update, item 2): the away pass of an absence with a card waits for the counting card
  // (./returning.ts). owner2-fix-hud (L1): put on the engine in place, so the entry hands over the engine itself.
  engine: deferAwayInPlace(salvageEngineMode),
  presets: salvagePreset,
  devViews,
  soundKeys: SALVAGE_SHARED_SOUNDS satisfies Partial<Record<FxName, SalvageFxName>>,
};

export default entry;
