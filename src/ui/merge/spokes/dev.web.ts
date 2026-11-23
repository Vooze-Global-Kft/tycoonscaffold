/**
 * The spokes' switches in the web preview (web only: Metro takes ./dev.ts, which does nothing, for
 * iOS and Android), applied once the preset is in the store (`devParamsApplied`):
 *   &spoke=book|lanterns|season   open that spoke
 *   &odds=1                       with spoke=book: the Ladder Book's odds page
 *   &fs=1.3                       size the spokes' text as at that system font scale (the web has none)
 *   &festival=filled              mark every Festival line filled (so "Close the season" is enabled)
 *   &confirm=1                    open the season close confirm
 *   &ceremony=1                   close the season at once and play the change of season
 * Package SPOKES (7b).
 */
import { Platform } from 'react-native';
import { devOncePerPageLoad, devParamsApplied } from '../../../dev/devtools';
import * as R from '../../../engine/merge';
import type { GameState } from '../../../engine/types';
import { useGame } from '../../../state/store';
import { useMergeUi, type MergeSpoke } from '../uiState';
import { useSpokeLocal } from './local';
import { closeSeasonNow } from './SeasonClose';

function params(): URLSearchParams | null {
  if (Platform.OS !== 'web' || typeof location === 'undefined') return null;
  return new URLSearchParams(location.search);
}

export function spokeFontScale(fontScale: number): number {
  const fs = Number(params()?.get('fs') ?? NaN);
  return Number.isFinite(fs) && fs > 0 ? fs : fontScale;
}

export function applySpokeDevParams(): void {
  if (!params() || !devOncePerPageLoad('merge-spokes')) return;
  void devParamsApplied().then(() => setTimeout(applyNow, 300));
}

function applyNow(): void {
  const q = params();
  if (!q) return;
  if (q.get('festival') === 'filled') {
    const { cfg, game } = useGame.getState();
    const g = game as R.MergeGame;
    if (R.isMerge(cfg) && g.merge) {
      const f = g.merge.festival;
      useGame.setState({ game: { ...g, merge: { ...g.merge, festival: { lines: f.lines.map((l) => ({ ...l, filled: true })), filledAt: g.stats.playSeconds } } } as GameState });
    }
  }
  const spoke = q.get('spoke');
  if (spoke === 'book' || spoke === 'lanterns' || spoke === 'season') useMergeUi.getState().openSpoke(spoke as MergeSpoke);
  if (q.get('odds') === '1') useSpokeLocal.getState().setOdds(true);
  if (q.get('confirm') === '1') useMergeUi.getState().openSheet({ type: 'seasonClose' });
  if (q.get('ceremony') === '1') closeSeasonNow();
}
