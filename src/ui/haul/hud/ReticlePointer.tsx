/**
 * The haul hint pointer for the shared HintOverlay (parts.HintPointer): the art kit's reticle
 * pointing at one spot of the overlay's canvas. Drag and swipe hints are drawn by ./HintLayer.tsx.
 */
import { Reticle } from '../art/Reticle';
import type { HintPointerProps } from '../../modeParts';

export function ReticlePointer({ x, y }: HintPointerProps) {
  return <Reticle hint={{ kind: 'point', from: { x, y } }} />;
}
