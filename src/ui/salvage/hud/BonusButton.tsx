/**
 * The away bonus's deferred button (shown only where no debt is on screen, D77; never for a player under 13) (PLAN2 2.5; the layout family F9 HUD LINES of phasec/s2c-plan-cards.md 2.2). C-CARDSUI's STUB: mounted by ./Hud.tsx
 * HudLayer only under stageOn() (the works' development switch), it draws NOTHING yet (nothing is drawn, named or promised
 * before its package builds it). Its words' rooms: ../rooms/age.ts (re-exported below). Owner from wave 1: CRD-AGE.
 */
import type { SalvageConfig } from '../../../engine/salvage';
import type { HudLayout } from './metrics';

export { ROOMS } from '../rooms/age';

export function BonusButton(_props: { cfg: SalvageConfig; L: HudLayout }) {
  return null;
}
