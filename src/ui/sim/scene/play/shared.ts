/**
 * Values the play layer's parts share: the flying bonus's path (read by the tappable view and by
 * the glow in the effects canvas, so both move together on the UI thread) and the rush phase.
 */
import type { SharedValue } from 'react-native-reanimated';

/** Where the skill button is in its cycle. 'hidden' = not shown at all (classic game, or not unlocked yet). */
export type RushPhase = 'hidden' | 'ready' | 'active' | 'cooling';

export interface BonusPath {
  x0: number;
  x1: number;
  /** Middle line of the wave. */
  y: number;
  /** Half the height of the wave. */
  amp: number;
  /** Full waves over the crossing. */
  waves: number;
}

/** The point on the bonus path at progress p (0..1). */
export function bonusPoint(path: BonusPath, p: number): { x: number; y: number } {
  'worklet';
  return {
    x: path.x0 + (path.x1 - path.x0) * p,
    y: path.y + Math.sin(p * Math.PI * 2 * path.waves) * path.amp,
  };
}

export interface BonusShared {
  /** 0..1 along the path. */
  p: SharedValue<number>;
  /** 1 while a bonus is on screen, 0 otherwise. */
  on: SharedValue<number>;
  path: SharedValue<BonusPath>;
}

/** A coin burst at a scene point (after catching the bonus). */
export interface BurstSpec {
  id: number;
  x: number;
  y: number;
}
