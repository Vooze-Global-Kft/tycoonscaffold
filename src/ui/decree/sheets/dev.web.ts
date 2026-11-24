/**
 * The bars' and sheets' switches in the web preview (web only: Metro takes ./dev.ts, which does
 * nothing, for iOS and Android), applied once the preset is in the store (`devParamsApplied`):
 *   &sheet=ledger|cabinet|poll|call|shop|settings   open that sheet
 *   &peek=1        open the in-tray peek
 *   &headline=1    open the gossip chip's last headline
 *   &arm=sign|refuse   arm that strip (the bars preview its values)
 *   &fs=1.3        size the bars' and sheets' text as at that system font scale (hud/fontScale.web.ts)
 * Owned by the bars package (BARS).
 */
import { Platform } from 'react-native';
import { devOncePerPageLoad, devParamsApplied } from '../../../dev/devtools';
import { useBarsUi } from '../hud/localUi';
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
  if (q.get('headline') === '1') useBarsUi.getState().openHeadline();
  const arm = q.get('arm');
  if (arm === 'sign' || arm === 'refuse') useBarsUi.getState().setPreview(arm);
}
