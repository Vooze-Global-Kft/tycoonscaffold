/** What every part of the drawn room shares: geometry, the clock, colours and a few one-shot triggers. */
import type { SharedValue } from 'react-native-reanimated';
import type { GameConfig } from '../../../../config/schema';
import type { ArtPalette } from '../../art/types';
import type { SceneLayout } from '../../layout';

export interface StageColors {
  production: string;
  transport: string;
  sales: string;
}

export interface SceneCtx {
  layout: SceneLayout;
  cfg: GameConfig;
  venueId: string;
  /** Skia's clock for this canvas, in ms. */
  clock: SharedValue<number>;
  palette: ArtPalette;
  stages: StageColors;
  /** Where the canvas sits in the window (for coins flying to the header); null until measured. */
  origin: { current: { x: number; y: number } | null };
  /** Bumped to swing the front door. */
  doorSwing: SharedValue<number>;
  /** Bumped to ring the bell on the pass. */
  bellRung: SharedValue<number>;
  /** Date.now() when this room was built: things that appear later arrive with an animation, things there from the start are simply there. */
  bornAt: number;
}

/** True once the room has been on screen for a moment: an actor mounting now is new, not part of the first picture. */
export function isLateMount(ctx: SceneCtx): boolean {
  return Date.now() - ctx.bornAt > 600;
}
