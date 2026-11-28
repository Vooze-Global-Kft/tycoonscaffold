/**
 * The age question (PLAN2 2.5; the layout family F7 KEYPAD of phasec/s2c-plan-cards.md 2.2; ruling 9.3, D71). C-CARDSUI's
 * STUB: a GenericCard pass-through, so the kind has its view and its route from wave 0; registered in ./OverlayHost.tsx
 * STAGE2_VIEWS and reached only under stageOn().
 * A MUST card (./cardStack.ts MUST_KINDS, critic I6): the scrim does nothing, Android back is swallowed and its own close
 * keeps it up (`close()` answers true and leaves it); the only way out is its OK, which calls salvageActions.setAgeBand(year)
 * and then `useCards.getState().finish()`. The stub has no OK yet (the rules' card has no foot: the keypad is CRD-AGE's),
 * and nothing in the screens opens it before CRD-AGE does.
 * Its words' rooms: ../rooms/age.ts (re-exported below). Owner from wave 1: CRD-AGE.
 */
import { GenericCard, type CardViewProps } from './OverlayHost';

export { ROOMS } from '../rooms/age';

export function AgeQuestion(props: CardViewProps) {
  return <GenericCard {...props} />;
}
