/**
 * The pack sheet before the store's own (PLAN2 2.5; the layout family F6 COUNTER of phasec/s2c-plan-cards.md 2.2). C-CARDSUI's STUB: a GenericCard pass-through,
 * drawn from the card's data alone in the frame its shape names, so that the kind has its view and its route from wave 0.
 * Registered in ./OverlayHost.tsx STAGE2_VIEWS and reached only under stageOn() (the works' development switch).
 * Its words' rooms: ../rooms/shop.ts (re-exported below, so the view and the text check read the same sizes).
 * Owner from wave 1: CRD-SHOP.
 */
import { GenericCard, type CardViewProps } from './OverlayHost';

export { ROOMS } from '../rooms/shop';

export function PackSheet(props: CardViewProps) {
  return <GenericCard {...props} />;
}
