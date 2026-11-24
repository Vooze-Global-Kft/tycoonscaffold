/**
 * The decree mode's sounds for what its engine reports on its own (spec 6): every tick's DecreeEvents
 * (src/state/modeEvents.ts) to fx keys of the decree table (src/services/fx/catalog.decree.ts).
 * Haptics follow the thumb and rare peaks (6): events nobody's finger caused never vibrate, and none
 * for taxes, arrivals or payouts. What the player's finger does plays in the action (./actions.ts).
 *
 * Written by the skeleton (the arrivals and the passive peaks); joined by the screens lead (appoint,
 * ribbon, the run-up by itself, a void form).
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
      case 'appointed':
        // A minister's application committed (at the end of its take-back window or at the next action).
        fx.play('appoint', quiet);
        break;
      case 'ribbon':
        fx.play('ribbon', quiet);
        break;
      case 'runUpStarted':
        // Day D starts the run-up by itself (2.10): the gavel. A call by the player plays it in ./actions.ts.
        if (e.byItself) fx.play('call_election', quiet);
        break;
      case 'formVoid':
        // "Already done: the Clerk takes it back": the Clerk's slip, quietly.
        fx.play('slip_arrive', quiet);
        break;
      default:
        // The player's own events play in ./actions.ts (a ministry opened by a slip or the Ledger, a level, a
        // monument); election night's envelopes, tallies, districts, majority and defeat in its view
        // (src/ui/decree/views/ElectionNight.tsx); the Standing Order's levels, a scandal's end, a new term
        // and gossip are silent on purpose.
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
