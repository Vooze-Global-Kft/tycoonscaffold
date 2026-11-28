/**
 * The lender's letter (opened by the rules' 'letter' event after the card that made it due) (PLAN2 2.5; the layout family F4 PRINTED PAPER of phasec/s2c-plan-cards.md 2.2). C-CARDSUI's STUB: a GenericCard pass-through,
 * drawn from the card's data alone in the frame its shape names, so that the kind has its view and its route from wave 0.
 * Registered in ./OverlayHost.tsx STAGE2_VIEWS and reached only under stageOn() (the works' development switch).
 * Its words' rooms: ../rooms/bank.ts (re-exported below, so the view and the text check read the same sizes).
 * Owner from wave 1: CRD-BANK.
 */
import { GenericCard, type CardViewProps } from './OverlayHost';

export { ROOMS } from '../rooms/bank';

export function Letter(props: CardViewProps) {
  return <GenericCard {...props} />;
}
