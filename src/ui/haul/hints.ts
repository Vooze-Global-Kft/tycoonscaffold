/**
 * The haul mode's hint source (spec section 3, errata 53 to 55): what the reticle points at. The
 * rules decide the hints (src/engine/haul `hintsFor`, a pure function of the state); this file
 * hands them to the shared hint machinery. Two consumers:
 * - the shared HintOverlay (in every kit Sheet) asks `haulHints.ask()` and draws `point` hints
 *   inside an open sheet with the reticle as its pointer (parts.HintPointer);
 * - the map's own hint layer (./hud/HintLayer.tsx) draws drag, swipe and point hints on the map
 *   with `ReticleLayer` (a full-screen canvas), from `allHaulHints()`.
 * Target keys: rock:<slot>, slot:<slot>, chip:<slot>, drone:rack, station, station:buyDrone,
 * station:autopilot, rig:upgrade, bay:launch, bay:counter, bay:flare, contract:strip,
 * button:comms|salvage|fitting|starmap|trade|menu, salvage:pod0, fitting:socket0, fitting:module0.
 * Map keys are set with `targets.set(key, rect)` from the layout (errata 47); controls use useTarget.
 * Owned by the "bay" package after the skeleton.
 */
import * as H from '../../engine/haul';
import { useGame } from '../../state/store';
import type { HintSource } from '../hints/source';

/** Every hint the rules would show now, most urgent first ([] outside a haul run). */
export function allHaulHints(): H.HaulHint[] {
  const { cfg, game } = useGame.getState();
  if (!H.isHaul(cfg) || !(game as unknown as H.HaulGame).haul) return [];
  try {
    return H.hintsFor(cfg, game as unknown as H.HaulGame);
  } catch {
    return [];
  }
}

export const haulHints: HintSource<H.HaulHint> = {
  // The shared overlay only ever draws pointing hints; drags and swipes are the map layer's.
  ask: () => allHaulHints().filter((h) => h.kind === 'point'),
};
