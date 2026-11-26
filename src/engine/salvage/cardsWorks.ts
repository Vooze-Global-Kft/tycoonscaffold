/**
 * THE WORKS' CARDS (stage 2, yard-stage2.md 4.3, 4.4, 4.6, 4.7): the works card of each plate, the process
 * board's stage-2 rows and pages, the Yard sale, an oversize piece, the picking table. Owner: rules-works
 * (Phase B). cards.ts `cardOf` dispatches these card kinds here (s2a-fix, the lead's ruling of 26 Nov 09:50:
 * cards.ts is the closed dispatcher; this file and cardsMoney.ts each have one owner).
 *
 * PHASE A STUB: a card with its title and nothing else (no row, no button), so a screen that opens one draws
 * a frame and nothing can be pressed. Every number a body shows is computed from the state at each read (B11)
 * and is exactly what its action applies.
 */
import type { CardContext, CardData, CardRef, SalvageConfig, SalvageGame, TextKey } from './types';

/** The card kinds this file answers (cards.ts dispatches them). */
export const WORKS_CARD_KINDS = ['works', 'yardSale', 'lot', 'crate'] as const;

/** A card of the works (cards.ts cardOf for WORKS_CARD_KINDS). Stub: the title only. */
export function cardOfWorks(cfg: SalvageConfig, g: SalvageGame, ref: CardRef, now: number, ctx: CardContext): CardData {
  void cfg;
  void g;
  void now;
  void ctx;
  const title: TextKey = ref.kind === 'works' ? (`title.works.${ref.plate}` as TextKey) : (`title.${ref.kind}` as TextKey);
  return { kind: ref.kind as CardData['kind'], shape: 'panel', title: { key: title }, lead: [], rows: [], foot: [] };
}
