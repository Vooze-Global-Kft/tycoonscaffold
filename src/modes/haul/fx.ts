/**
 * The haul mode's sounds for what its engine reports (spec 6.2 and the event table of the
 * Decisions, errata 64/65): every tick's HaulEvents (src/state/modeEvents.ts) to fx keys of the
 * haul table (src/services/fx/catalog.haul.ts). Passive events never vibrate (6.3); the launch,
 * the warp-out and a met contract vibrate only after the player's own swipe (`launch.auto` false).
 * What the player's finger does (drags, purchases, fits) plays in the action (./actions.ts) instead.
 *
 * Owned by the "bay" package after the skeleton (docs/design/space-build-plan.md).
 */
import * as H from '../../engine/haul';
import type { HaulEvent } from '../../engine/haul';
import { fx } from '../../services/fx';
import { modeEvents } from '../../state/modeEvents';
import { useGame } from '../../state/store';

const quiet = { haptic: false } as const;

/**
 * hold_tick is thinned (play-24: a mid-game fleet unloads 2 to 3 times a second, a constant ticking):
 * one tick each time the hold passes into a new tenth of its size, and never more than one every
 * HOLD_TICK_GAP_MS. A hold that empties (a launch) starts the bands again.
 */
const HOLD_TICK_GAP_MS = 2000;
let holdBand = -1;
let holdTickAt = -Infinity;

/** The hold's fill (0 to 1) from the game in the store, or null outside a run. */
function holdFill(): number | null {
  const { cfg, game } = useGame.getState();
  const g = game as unknown as H.HaulGame;
  if (!H.isHaul(cfg) || !g.haul) return null;
  const F = H.haulParams(cfg, g as H.HaulGame & { haul: H.HaulState }).F;
  let units = 0;
  for (const v of Object.values(g.haul.hold)) units += v;
  return F > 0 ? Math.min(1, units / F) : null;
}

/** Whether this batch's unloads play a hold tick (at most one per batch). Exported for tests. */
export function holdTickDue(fill: number | null, nowMs: number): boolean {
  if (fill === null) return false;
  const band = Math.floor(fill * 10 + 1e-9);
  if (band < holdBand) holdBand = band - 1;
  if (band <= holdBand || nowMs - holdTickAt < HOLD_TICK_GAP_MS) return false;
  holdBand = band;
  holdTickAt = nowMs;
  return true;
}

/** Tests: forget the bands and the last tick. */
export function resetHoldTicks(): void {
  holdBand = -1;
  holdTickAt = -Infinity;
}
/** Whether the freighter now climbing was launched by the player's swipe (it then vibrates at the warp-out). */
let playerLaunch = false;

/** Plays one batch of haul events. Exported for tests. */
export function playHaulEvents(events: readonly unknown[]): void {
  let unloaded = false;
  for (const raw of events) {
    const e = raw as HaulEvent;
    switch (e.type) {
      case 'arrive':
        fx.play('rock_arrive', quiet);
        if (e.bonanza) fx.play('bonanza', quiet);
        break;
      case 'unload':
        unloaded = true;
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
      case 'dry':
        // The rock's life is spent, its pile is still there (errata 19): the dry rock's creak.
        fx.play('rock_dry', quiet);
        break;
      case 'contractProgress':
        // Heard as the warp-out's payout it comes with; the strip's bar shows the delivery (Decision 40).
        break;
      case 'pileFull':
      case 'docked':
      case 'flareCharge':
      case 'tutorialDone':
      case 'contractResized':
        // (contractResized, Decision 56: a freighter purchase resizes the orders; the purchase's own
        // sound is heard and the strip says "ORDER RESIZED".)
        // Silent on purpose: the rig lamp, the pad and the charge plate show these (spec 4.3).
        break;
      case 'claim':
        // The player's tap already played claim_slot in the action.
        break;
      default: {
        // Every HaulEvent of the rules has a case: a new event fails to compile here until it is placed.
        const unplaced: never = e;
        void unplaced;
        break;
      }
    }
  }
  if (unloaded) {
    let fill: number | null = null;
    try {
      fill = holdFill();
    } catch {
      fill = null;
    }
    if (holdTickDue(fill, Date.now())) fx.play('hold_tick', quiet);
  }
}

let subscribed = false;
/** Called once by the mode entry. */
export function listenHaulEvents(): void {
  if (subscribed) return;
  subscribed = true;
  modeEvents.subscribe(playHaulEvents);
}
