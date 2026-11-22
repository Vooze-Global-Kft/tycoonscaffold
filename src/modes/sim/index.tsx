/**
 * Mode entry "sim" (Pizza Empire): the tab shell with the living restaurant on the home tab,
 * the restaurant's cartoon people for "char:" icons and card portraits, the tutorial glove, the
 * tab-shell "art:" icons and its own (truffles, shop front),
 * the list homes' tutorial and, in the web preview only, the art review screens. Reached only through src/generated/mode.ts.
 */
import { HandPointer, TABS_ART_ICONS, artIconSources } from '../../ui/art/props';
import { listHints } from '../../ui/home/hints';
import { TabShell } from '../../ui/shell/TabShell';
import { CharacterBust, SIM_ART_ICONS, type LookInput } from '../../ui/sim/art';
import { CardBust } from '../../ui/sim/art/CardBust';
import { HomeSim } from '../../ui/sim/home/HomeSim';
import type { CharIconProps } from '../../ui/modeParts';
import type { ModeEntry } from '../contract';
import { devViews } from './devViews';

function SimShell() {
  return <TabShell Home={HomeSim} />;
}

/** A "char:<id>" icon: the code-drawn bust of that cast member. */
function CharIcon({ look, size, blink, render }: CharIconProps) {
  return <CharacterBust look={look as LookInput} size={size} blink={blink} render={render} />;
}

const entry: ModeEntry = {
  id: 'sim',
  Shell: SimShell,
  parts: { CharIcon, CardBust, HintPointer: HandPointer },
  artIcons: artIconSources({ ...TABS_ART_ICONS, ...SIM_ART_ICONS }),
  hints: listHints,
  // The art review screens: web preview only (./devViews.web.ts; on phones ./devViews.ts has none).
  devViews,
};

export default entry;
