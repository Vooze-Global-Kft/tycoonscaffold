/**
 * The bars' and sheets' switches in the web preview (web only: Metro takes ./dev.ts, which does
 * nothing, for iOS and Android), applied once the preset is in the store (`devParamsApplied`):
 *   &sheet=ledger|cabinet|poll|call|shop|settings   open that sheet
 *   &peek=1        open the in-tray peek
 *   &headline=1    open the gossip chip's last headline
 *   &arm=sign|refuse   arm that strip (the bars preview its values)
 *   &day=<n>       set the term's day (to look at the call button of the term ribbon from day C)
 *   &moods=a,b,c   set the clubs' moods (to look at the huff and won-over marks; moods only, nothing else moves)
 *   &fs=1.3        size the bars' and sheets' text as at that system font scale (hud/fontScale.web.ts)
 * Owned by the bars package (BARS).
 */
import { Platform } from 'react-native';
import { devOncePerPageLoad, devParamsApplied } from '../../../dev/devtools';
import type * as R from '../../../engine/decree';
import type { GameState } from '../../../engine/types';
import { useGame } from '../../../state/store';
import { useDecreeUi, type DecreeSheet } from '../uiState';

function params(): URLSearchParams | null {
  if (Platform.OS !== 'web' || typeof location === 'undefined') return null;
  return new URLSearchParams(location.search);
}

export function applyBarsDevParams(): void {
  if (!params() || !devOncePerPageLoad('decree-bars')) return;
  void devParamsApplied().then(() => setTimeout(applyNow, 400));
}

function applyNow(): void {
  const q = params();
  if (!q) return;
  const ui = useDecreeUi.getState();
  const day = Number(q.get('day'));
  if (Number.isFinite(day) && day > 0) {
    const g = useGame.getState().game as R.DecreeGame;
    if (g.decree) useGame.setState({ game: { ...g, decree: { ...g.decree, day } } as GameState });
  }
  const moods = (q.get('moods') ?? '').split(',').filter(Boolean).map(Number);
  if (moods.length && moods.every((m) => Number.isFinite(m) && m >= 0 && m <= 100)) {
    const g = useGame.getState().game as R.DecreeGame;
    if (g.decree && moods.length === g.decree.moods.length) useGame.setState({ game: { ...g, decree: { ...g.decree, moods } } as GameState });
  }
  const sheet = q.get('sheet');
  const types: Record<string, DecreeSheet> = {
    ledger: { type: 'ledger' },
    cabinet: { type: 'cabinet' },
    poll: { type: 'poll' },
    call: { type: 'callConfirm' },
    shop: { type: 'shop' },
    settings: { type: 'settings' },
  };
  if (sheet && types[sheet]) ui.openSheet(types[sheet]);
  if (q.get('peek') === '1') ui.openPeek();
  if (q.get('headline') === '1') ui.openHeadline();
  const arm = q.get('arm');
  if (arm === 'sign' || arm === 'refuse') ui.setPreview(arm);
}
