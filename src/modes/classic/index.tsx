/**
 * Mode entry "classic" (the list of businesses under a hero scene, Space Miner today): the tab
 * shell with the classic home and the managers panel on top of the staff tab, the list homes'
 * tutorial with the tab shell's glove, and the tab-shell "art:" icons (chests, gem, coin, card back). No code-drawn people: "char:" icons show the unknown-icon fallback and card windows
 * stay empty unless the game gives "asset:" images. Reached only through src/generated/mode.ts.
 */
import { HandPointer, TABS_ART_ICONS, artIconSources } from '../../ui/art/props';
import { listHints } from '../../ui/home/hints';
import { TabShell } from '../../ui/shell/TabShell';
import type { ModeEntry } from '../contract';
import { HomeClassic } from './HomeClassic';
import { ManagersPanel } from './ManagersPanel';

function ClassicShell() {
  return <TabShell Home={HomeClassic} StaffTop={ManagersPanel} />;
}

const entry: ModeEntry = {
  id: 'classic',
  Shell: ClassicShell,
  parts: { HintPointer: HandPointer },
  artIcons: artIconSources(TABS_ART_ICONS),
  hints: listHints,
};

export default entry;
