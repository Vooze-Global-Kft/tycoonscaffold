/**
 * The haul mode's hint source (spec section 3, errata 53 to 55): what the reticle points at. The
 * rules decide which hints apply (src/engine/haul `hintsFor`, a pure function of the state); this
 * file puts them in the order of errata 55 and hands them to the two consumers:
 * - the shared HintOverlay (in every kit Sheet) asks `haulHints.ask()` and draws `point` hints
 *   inside an open sheet with the reticle as its pointer (parts.HintPointer);
 * - the map's own hint layer (./hud/HintLayer.tsx) draws drag, swipe, tap-tap and point hints on
 *   the map with `ReticleLayer`, from `allHaulHints()`.
 * Target keys: rock:<slot>, slot:<slot>, chip:<slot>, drone:rack, station, station:buyDrone,
 * station:autopilot, rig:upgrade, bay:launch, bay:counter, bay:flare, contract:strip,
 * button:comms|salvage|fitting|starmap|trade|menu, salvage:pod0, fitting:socket0, fitting:module0.
 * Map keys are set with `targets.set(key, rect)` from the layout (errata 47); controls use useTarget.
 */
import * as H from '../../engine/haul';
import { useGame } from '../../state/store';
import type { HintSource } from '../hints/source';
import { orderHints } from './hud/hintOrder';

/** Every hint the rules would show now, most urgent first ([] outside a haul run). */
export function allHaulHints(): H.HaulHint[] {
  const { cfg, game } = useGame.getState();
  const g = game as unknown as H.HaulGame;
  if (!H.isHaul(cfg) || !g.haul) return [];
  try {
    const h = g.haul;
    const seams = [h.vein, h.flare].filter((s) => s.slot !== null && s.until > h.clock).map((s) => s.slot as number);
    return orderHints(H.hintsFor(cfg, g), seams);
  } catch {
    return [];
  }
}

export const haulHints: HintSource<H.HaulHint> = {
  // The shared overlay only ever draws pointing hints; drags, swipes and tap-taps are the map layer's.
  ask: () => allHaulHints().filter((h) => h.kind === 'point'),
};
