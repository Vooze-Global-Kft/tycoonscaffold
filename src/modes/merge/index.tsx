/**
 * Mode entry "merge" (Night Market, "Lantern Row": a 7 × 8 board under a street of counters; drag
 * two identical snacks together, drag the exact snack onto a customer's paper ticket;
 * docs/design/market-design.md). Reached only through src/generated/mode.ts.
 *
 * What it hands over at install (src/modes/contract.ts):
 * - `engine`: the merge rules as an engine mode (src/engine/mergeMode.ts);
 * - `Shell`: its own whole screen (src/ui/merge/MergeShell.tsx), no tab shell;
 * - `Loading`: its own loading screen (src/ui/merge/overlays/Loading.tsx);
 * - `parts`: the firefly as the hint pointer, and `parts.Icon` for "beast:" names (the animals,
 *   drawn by the art kit); no "char:" portraits, no card bust;
 * - `hints`: the firefly's script (src/ui/merge/hints.ts);
 * - `presets`: `?preset=` states (web only: ./presets.web.ts; on phones ./presets.ts has none);
 * - `soundKeys`: the merge key for each shared key the store plays (./soundKeys.ts, the sound package's);
 * - `devViews`: web preview only (./devViews.web.ts; on phones ./devViews.ts has none).
 * It never imports the tabs family or another mode's folders (npm run check:bundle).
 * Written by the skeleton; owned by the wiring package (spec 9.2 P3).
 */
import { mergeEngineMode } from '../../engine/mergeMode';
import type { FxName } from '../../services/fx';
import type { MergeFxName } from '../../services/fx/catalog.merge';
import { MergeIcon } from '../../ui/merge/art/MergeIcon';
import { FireflyPointer } from '../../ui/merge/FireflyPointer';
import { mergeHints } from '../../ui/merge/hints';
import { MergeShell } from '../../ui/merge/MergeShell';
import { MergeLoading } from '../../ui/merge/overlays/Loading';
import type { ModeEntry } from '../contract';
import { devViews } from './devViews';
import { listenMergeEvents } from './fx';
import { mergePreset } from './presets';
import { MERGE_SHARED_SOUNDS } from './soundKeys';

listenMergeEvents();

const entry: ModeEntry = {
  id: 'merge',
  Shell: MergeShell,
  Loading: MergeLoading,
  engine: mergeEngineMode,
  parts: { HintPointer: FireflyPointer, Icon: MergeIcon, iconPrefixes: ['beast:'] },
  hints: mergeHints,
  presets: mergePreset,
  devViews,
  soundKeys: MERGE_SHARED_SOUNDS satisfies Partial<Record<FxName, MergeFxName>>,
};

export default entry;
