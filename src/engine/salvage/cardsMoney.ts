/**
 * THE MONEY'S CARDS (stage 2, yard-stage2.md 4.5, 4.8, 4.9): the finance card, the lender's letter, the
 * office's Agreements tab, the shop, the pack sheet, the age question, the code pad, the away bonus, and the
 * away card's new lines. Owner: rules-money (Phase B). cards.ts `cardOf` dispatches these card kinds here
 * (s2a-fix, the lead's ruling of 26 Nov 09:50).
 *
 * THE STORE COUNTRY is not in the state: the screen reads it at each opening (src/services/region.ts
 * `storefrontCountry()`) and hands it in `ctx` (types.ts CardContext); the rules decide from it and the state
 * whether packs show (2.15.3: rung, country, age band, hidden). Phase B pins it with a u13 test and an
 * unknown-country test.
 *
 * PHASE A STUB: a card with its title and nothing else (no row, no button).
 */
import type { CardContext, CardData, CardRef, SalvageConfig, SalvageGame, TextKey } from './types';

/** The card kinds this file answers (cards.ts dispatches them, and the office's Agreements tab). */
export const MONEY_CARD_KINDS = ['finance', 'letter', 'shop', 'packSheet', 'ageQuestion', 'packCode', 'awayBonus'] as const;

/** A card of the money (cards.ts cardOf for MONEY_CARD_KINDS and {office, agreements}). Stub: the title only. */
export function cardOfMoney(cfg: SalvageConfig, g: SalvageGame, ref: CardRef, now: number, ctx: CardContext): CardData {
  void cfg;
  void g;
  void now;
  void ctx;
  if (ref.kind === 'office') return { kind: 'agreements', shape: 'panel', title: { key: 'title.agreements' }, lead: [], rows: [], foot: [], showsDebt: false };
  return { kind: ref.kind as CardData['kind'], shape: ref.kind === 'shop' ? 'panel' : 'centred', title: { key: `title.${ref.kind}` as TextKey }, lead: [], rows: [], foot: [] };
}
