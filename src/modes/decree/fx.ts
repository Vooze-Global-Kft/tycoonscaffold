/**
 * The decree mode's sounds for what its engine reports on its own (spec 6): every tick's DecreeEvents
 * (src/state/modeEvents.ts) to fx keys of the decree table (src/services/fx/catalog.decree.ts).
 * Haptics follow the thumb and rare peaks (6): events nobody's finger caused never vibrate, and none
 * for taxes, arrivals or payouts. What the player's finger does plays in the action (./actions.ts).
 *
 * Written by the skeleton (the arrivals and the passive peaks); owned afterwards by the sound package (P5).
 */
import type { DecreeEvent } from '../../engine/decree';
import { fx } from '../../services/fx';
import { modeEvents } from '../../state/modeEvents';

const quiet = { haptic: false } as const;

/** Plays one batch of decree events. Exported for tests. */
export function playDecreeEvents(events: readonly unknown[]): void {
  for (const raw of events) {
    const e = raw as DecreeEvent;
    switch (e.type) {
      case 'paperArrived':
        fx.play('paper_arrive', quiet);
        break;
      case 'slipArrived':
        fx.play('slip_arrive', quiet);
        break;
      case 'boycottStart':
        fx.play('boycott_start', quiet);
        break;
      case 'boycottEnd':
        fx.play('boycott_end', quiet);
        break;
      case 'scandalStart':
        fx.play('scandal', quiet);
        break;
      case 'storey':
        fx.play('storey', quiet);
        break;
      case 'clipping':
        fx.play('clipping', quiet);
        break;
      default:
        // The player's own events play in ./actions.ts; election night's envelopes in its view; the rest are silent.
        break;
    }
  }
}

/** The listener's unsubscribe, on the global object so a hot reload replaces it instead of adding a second one (as merge's fx.ts). */
const KEY = '__itfDecreeFxUnsubscribe';
const holder = globalThis as { [KEY]?: () => void };

/** Called once by the mode entry; a second call replaces the listener, never adds one. */
export function listenDecreeEvents(): void {
  holder[KEY]?.();
  holder[KEY] = modeEvents.subscribe(playDecreeEvents);
}
