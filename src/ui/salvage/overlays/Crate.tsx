/**
 * The picking table's crate card (PLAN2 2.5; the layout family F8 YARD SIGNS of phasec/s2c-plan-cards.md 2.2). C-CARDSUI's STUB: a GenericCard pass-through,
 * drawn from the card's data alone in the frame its shape names, so that the kind has its view and its route from wave 0.
 * Registered in ./OverlayHost.tsx STAGE2_VIEWS and reached only under stageOn() (the works' development switch).
 * Its words' rooms: ../rooms/pieces.ts (re-exported below, so the view and the text check read the same sizes).
 * Owner from wave 1: CRD-PIECES.
 */
import { GenericCard, type CardViewProps } from './OverlayHost';

export { ROOMS } from '../rooms/pieces';

export function Crate(props: CardViewProps) {
  return <GenericCard {...props} />;
}
