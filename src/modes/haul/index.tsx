/**
 * Mode entry "haul" (Orbit Haulers: a top-down orbital map, drones dragged onto rocks, a freighter
 * swiped off to sell; docs/design/space-design.md). Reached only through src/generated/mode.ts.
 *
 * What it hands over at install (src/modes/contract.ts):
 * - `engine`: the haul rules as an engine mode (src/engine/haulMode.ts), so the shared engine
 *   and the store reach them without importing them and no other game's bundle carries them;
 * - `Shell`: its own whole screen (src/ui/haul/HaulShell.tsx), no tab shell;
 * - `parts`: the hint pointer is the art kit's reticle, and its "art:" / "mach:" icons are drawn
 *   by the kit's own cache (HaulIcon) through `parts.Icon`; no portraits of people;
 * - `hints`: the rules' hints (src/ui/haul/hints.ts);
 * - `presets`: `?preset=` states from the rules' fixtures (./presets.ts);
 * - `devViews`: `?view=haul-art`, the art kit's gallery.
 * It never imports the tabs family or another mode's folders (npm run check:bundle).
 */
import { Text } from 'react-native';
import { haulEngineMode } from '../../engine/haulMode';
import Gallery from '../../ui/haul/art/Gallery';
import { HaulIcon } from '../../ui/haul/art/HaulIcon';
import { HaulShell } from '../../ui/haul/HaulShell';
import { haulHints } from '../../ui/haul/hints';
import { ReticlePointer } from '../../ui/haul/hud/ReticlePointer';
import type { ModeIconProps } from '../../ui/modeParts';
import type { ModeEntry } from '../contract';
import { listenHaulEvents } from './fx';
import { haulPreset } from './presets';

function Icon({ icon, size }: ModeIconProps) {
  return <HaulIcon name={icon} size={size} fallback={<Text style={{ fontSize: size * 0.7, width: size, textAlign: 'center' }}>❔</Text>} />;
}

listenHaulEvents();

const entry: ModeEntry = {
  id: 'haul',
  Shell: HaulShell,
  engine: haulEngineMode,
  parts: { HintPointer: ReticlePointer, Icon, iconPrefixes: ['art:', 'mach:'] },
  hints: haulHints,
  presets: haulPreset,
  devViews: { 'haul-art': Gallery },
};

export default entry;
