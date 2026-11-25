/**
 * Mode entry "salvage" (the scrapyard, game "scrap-yard"): a landscape yard several screens wide in a
 * three-quarter view, over which one thumb on a floating stick steers a worker (docs/design/yard-ground.md;
 * the game itself is specified in docs/design/yard-design.md). Reached only through src/generated/mode.ts.
 *
 * What it hands over at install (src/modes/contract.ts):
 * - `engine`: the salvage rules as an engine mode (src/engine/salvageMode.ts; PLACEHOLDER rules of the
 *   test loop), with paysOnCompute and catchUpSeconds 0;
 * - `Shell`: its own whole screen (src/ui/salvage/SalvageShell.tsx), no tab shell, its own overlays;
 * - `Loading`: its own loading placeholder (src/ui/salvage/Loading.tsx);
 * - `presets`: `?preset=` states (web only: ./presets.web.ts; on phones ./presets.ts has none);
 * - `devViews`: web preview only (./devViews.web.ts; on phones ./devViews.ts has none).
 * No parts, hints, art icons or sound keys yet (nothing of the specification exists).
 * It never imports the tabs family or another mode's folders (npm run check:bundle).
 */
import { salvageEngineMode } from '../../engine/salvageMode';
import { SalvageLoading } from '../../ui/salvage/Loading';
import { SalvageShell } from '../../ui/salvage/SalvageShell';
import type { ModeEntry } from '../contract';
import { devViews } from './devViews';
import { salvagePreset } from './presets';

const entry: ModeEntry = {
  id: 'salvage',
  Shell: SalvageShell,
  Loading: SalvageLoading,
  engine: salvageEngineMode,
  presets: salvagePreset,
  devViews,
};

export default entry;
