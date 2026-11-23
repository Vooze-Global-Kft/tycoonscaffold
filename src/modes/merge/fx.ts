/**
 * The merge mode's sounds for what its engine reports on its own (spec 6.2): every tick's
 * MergeEvents (src/state/modeEvents.ts) to fx keys of the merge table
 * (src/services/fx/catalog.merge.ts). Haptics follow only what the finger did (6.2): passive events
 * never vibrate. What the player's finger does plays in the action (./actions.ts) instead.
 *
 * Passive events never vibrate: lantern_lit here is quiet (it vibrates only when the shared
 * mission_complete maps to it). Silent by design: shelved, gearWaiting, sale, tillRoll, ticketDrawn,
 * settingUp, undoExpired, giftEarned.
 *
 * Written by the skeleton; owned since the join by the screens lead.
 */
import type { MergeEvent } from '../../engine/merge';
import { fx } from '../../services/fx';
import { modeEvents } from '../../state/modeEvents';

const quiet = { haptic: false } as const;

/** Plays one batch of merge events. Exported for tests. */
export function playMergeEvents(events: readonly unknown[]): void {
  for (const raw of events) {
    const e = raw as MergeEvent;
    switch (e.type) {
      case 'drop':
      case 'released':
      case 'giftGoodPlaced':
        fx.play('drop', quiet);
        break;
      case 'tillRoll':
        // The till is silent (6.2): the purse's own roll shows it.
        break;
      case 'paradeArrive':
        fx.play('parade_arrive', quiet);
        break;
      case 'lanternLit':
        fx.play('lantern_lit', quiet);
        break;
      // giftEarned is silent: the gift sheet plays giftbox_open and one slot_reveal per slot (lead, requests.md).
      // ticketPaid's coins play when they reach the purse (the play canvas's beat, src/ui/merge/play/beats.ts).
      default:
        // The player's own events (merge, lineFill, ticketPaid, ...) play in ./actions.ts; the rest are silent.
        break;
    }
  }
}

/** The listener's unsubscribe, on the global object so a hot reload replaces it instead of adding a second one (as haul's fx.ts). */
const KEY = '__itfMergeFxUnsubscribe';
const holder = globalThis as { [KEY]?: () => void };

/** Called once by the mode entry; a second call replaces the listener, never adds one. */
export function listenMergeEvents(): void {
  holder[KEY]?.();
  holder[KEY] = modeEvents.subscribe(playMergeEvents);
}
