/**
 * The haul mode's sounds for what its engine reports (spec 6.2 and the event table of the
 * Decisions, errata 64/65): every tick's HaulEvents (src/state/modeEvents.ts) to fx keys of the
 * haul table (src/services/fx/catalog.haul.ts). Passive events never vibrate (6.3); the launch,
 * the warp-out and a met contract vibrate only after the player's own swipe (`launch.auto` false).
 * What the player's finger does (drags, purchases, fits) plays in the action (./actions.ts) instead.
 *
 * Owned by the "bay" package after the skeleton (docs/design/space-build-plan.md).
 */
import type { HaulEvent } from '../../engine/haul';
import { fx } from '../../services/fx';
import { modeEvents } from '../../state/modeEvents';

const quiet = { haptic: false } as const;
/** Whether the freighter now climbing was launched by the player's swipe (it then vibrates at the warp-out). */
let playerLaunch = false;

/** Plays one batch of haul events. Exported for tests. */
export function playHaulEvents(events: readonly unknown[]): void {
  for (const raw of events) {
    const e = raw as HaulEvent;
    switch (e.type) {
      case 'arrive':
        fx.play('rock_arrive', quiet);
        if (e.bonanza) fx.play('bonanza', quiet);
        break;
      case 'unload':
        fx.play('hold_tick', quiet);
        break;
      case 'depleted':
        fx.play('rock_crumble', quiet);
        break;
      case 'holdFull':
        fx.play('hold_full', quiet);
        break;
      case 'launch':
        // A swipe already played launch_charge in the action; the autopilot's launch is heard, never felt.
        playerLaunch = !e.auto;
        if (e.auto) fx.play('launch_charge', quiet);
        break;
      case 'warp':
        fx.play('warp_out', playerLaunch ? undefined : quiet);
        fx.play('payout', quiet);
        break;
      case 'contractMet':
        fx.play('contract_met', playerLaunch ? undefined : quiet);
        break;
      case 'contractLapsed':
        fx.play('contract_lapse', quiet);
        break;
      case 'contractNew':
      case 'contractsUnlocked':
        fx.play('contract_new', quiet);
        break;
      case 'land':
        fx.play('freighter_land', quiet);
        playerLaunch = false;
        break;
      case 'vein':
        // A flare's seam is the ignition (boost_start); a natural seam shimmers in.
        fx.play(e.flare ? 'boost_start' : 'vein_start', e.flare ? undefined : quiet);
        break;
      case 'veinEnd':
        fx.play('vein_end', quiet);
        break;
      case 'podEarned':
        fx.play('pod_arrive', quiet);
        break;
      default:
        // The rules' second pass may add `dry {slot}` (life at 0, pile left): the dry rock's creak.
        if ((raw as { type?: string }).type === 'dry') fx.play('rock_dry', quiet);
        break;
    }
  }
}

let subscribed = false;
/** Called once by the mode entry. */
export function listenHaulEvents(): void {
  if (subscribed) return;
  subscribed = true;
  modeEvents.subscribe(playHaulEvents);
}
