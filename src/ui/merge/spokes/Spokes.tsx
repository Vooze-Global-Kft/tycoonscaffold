/**
 * Where the spokes mount (spec 4.4): the one open spoke (uiState `spoke`: the Ladder Book, the
 * Lantern Gate or the Season scroll), the season close confirm (uiState sheet `seasonClose`) and the
 * change of season over them. Mounted once by ../overlays/Overlays.tsx in its SPOKES block.
 * Package SPOKES (7b).
 */
import { useEffect } from 'react';
import { useMergeUi } from '../uiState';
import { applySpokeDevParams } from './dev';
import { LadderBook } from './LadderBook';
import { LanternGate } from './LanternGate';
import { SeasonCeremony, SeasonCloseConfirm } from './SeasonClose';
import { SeasonScroll } from './SeasonScroll';

export function Spokes() {
  const spoke = useMergeUi((s) => s.spoke);
  useEffect(() => applySpokeDevParams(), []);
  return (
    <>
      {spoke === 'book' ? <LadderBook /> : spoke === 'lanterns' ? <LanternGate /> : spoke === 'season' ? <SeasonScroll /> : null}
      <SeasonCloseConfirm />
      <SeasonCeremony />
    </>
  );
}
