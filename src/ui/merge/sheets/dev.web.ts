/**
 * The sheets' switches in the web preview (web only: Metro takes ./dev.ts, which does nothing, for
 * iOS and Android), applied once the preset is in the store (`devParamsApplied`):
 *   &sheet=stall:<c>|shutter:<group>|ticket:<counter>|gift|shop|settings   open that sheet
 *   &gifts=<n>        put n gift boxes in the bag, as the rules would earn them now (giftBoxAt)
 *   &fs=1.3           size the bars' and sheets' text as at that system font scale (hud/fontScale.web.ts)
 * Owned by the bars package (BARS, 7a).
 */
import { Platform } from 'react-native';
import { devOncePerPageLoad, devParamsApplied } from '../../../dev/devtools';
import * as R from '../../../engine/merge';
import type { GameState } from '../../../engine/types';
import { useGame } from '../../../state/store';
import { useMergeUi, type MergeSheet } from '../uiState';

function params(): URLSearchParams | null {
  if (Platform.OS !== 'web' || typeof location === 'undefined') return null;
  return new URLSearchParams(location.search);
}

export function applySheetDevParams(): void {
  if (!params() || !devOncePerPageLoad('merge-sheets')) return;
  void devParamsApplied().then(() => setTimeout(applyNow, 300));
}

function applyNow(): void {
  const q = params();
  if (!q) return;
  const gifts = Number(q.get('gifts') ?? 0);
  if (gifts > 0) {
    const { cfg, game } = useGame.getState();
    const g = game as R.MergeGame;
    if (R.isMerge(cfg) && g.merge) {
      const boxes = Array.from({ length: gifts }, (_, i) => R.giftBoxAt(cfg, g, g.merge.draws.gift + i));
      useGame.setState({ game: { ...g, merge: { ...g.merge, gift: { ...g.merge.gift, boxes: [...g.merge.gift.boxes, ...boxes] }, draws: { ...g.merge.draws, gift: g.merge.draws.gift + gifts } } } as GameState });
    }
  }
  const [type, arg] = (q.get('sheet') ?? '').split(':');
  const n = Number(arg ?? 0);
  let sheet: MergeSheet | null = null;
  if (type === 'stall') sheet = { type, chain: n };
  else if (type === 'shutter') sheet = { type, group: n };
  else if (type === 'ticket') sheet = { type, counter: n };
  else if (type === 'gift' || type === 'shop' || type === 'settings') sheet = { type };
  if (sheet) useMergeUi.getState().openSheet(sheet);
}
