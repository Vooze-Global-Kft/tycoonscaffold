/**
 * The works card (kind 'works', every plot of the back field; PLAN2 2.5; the layout family F2 ENAMEL PLATE of
 * phasec/s2c-plan-cards.md 2.2). C-CARDSUI's STUB and ROUTE: a hall (a batch plate) goes to ./HallCard.tsx, the shredder
 * line and its depollution bay (a plate that comes `with` another, or that other) to ./WorksLine.tsx (./cardStack.ts
 * worksViewOf, from the content); every other plot is a GenericCard pass-through until CRD-PLOTS draws the plate, its flow
 * strip and its life stepper. Registered in ./OverlayHost.tsx STAGE2_VIEWS, reached only under stageOn().
 * Its words' rooms: ../rooms/plots.ts (re-exported below). Owner from wave 1: CRD-PLOTS (the hand-over lines stay).
 */
import { worksViewOf } from './cardStack';
import { HallCard } from './HallCard';
import { GenericCard, type CardViewProps } from './OverlayHost';
import { WorksLine } from './WorksLine';

export { ROOMS } from '../rooms/plots';

export function WorksCard(props: CardViewProps) {
  const v = worksViewOf(props.cfg.salvage, props.data);
  if (v === 'hall') return <HallCard {...props} />;
  if (v === 'line') return <WorksLine {...props} />;
  return <GenericCard {...props} />;
}
