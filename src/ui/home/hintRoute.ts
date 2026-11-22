/**
 * The list homes' hint routes (sim and classic modes): for each of the engine's hints, the target
 * keys (src/ui/hints/targets.ts) from its control back to the chip or tab that leads to it. Moved
 * out of targets.ts unchanged, so the shared target registry names none of these controls.
 */
import type { GuideHint } from '../../engine/view';
import { hintKey } from '../../engine/view';

/**
 * Where to point for a hint, most specific first: the control itself when it is on screen,
 * otherwise the control that leads to it (a stage chip, a button that opens a dialog, a tab).
 */
export function hintRoute(h: GuideHint): string[] {
  const key = hintKey(h);
  switch (h.kind) {
    case 'tapStation':
    case 'bell':
    case 'startRush':
      return [key, 'tab:home'];
    case 'buyBusiness':
    case 'hireBusiness':
      return [key, 'stage:production', 'tab:home'];
    case 'buyTransport':
    case 'hireTransport':
      return [key, 'stage:transport', 'tab:home'];
    case 'buySales':
      return [key, 'stage:sales', 'tab:home'];
    case 'openChest':
      // The chest button on home; on the Staff tab the chest shelf's Open button (key 'chestShelf').
      return [key, 'chestShelf', 'tab:home'];
    case 'claimMission':
      return [key, 'missionsButton', 'tab:home'];
    case 'buyUpgrade':
      return [key, 'tab:upgrades'];
    case 'unlockVenue':
      return [key, 'tab:empire'];
    case 'levelUpCard':
      return [key, `card:${h.cardId}`, 'tab:staff'];
  }
}
