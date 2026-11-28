/**
 * Words of the PACKCODE family (PLAN2 2.2; the code pad behind Settings' switch and the restart card, s2c-plan-cards 1.7
 * M8). Owner from wave 1: CRD-PACKCODE. Spread into TEXT by ../strings.ts; keys in textKeys.ts `TEXT_KEYS.famPackcode`;
 * rooms in ../rooms/packcode.ts. The pad's existing words (card.code.*, refusal.packCode) stay in strings.ts.
 */
export const PACKCODE = {
  'card.code.clear': 'Clear', // the keypad's clear key
  'card.code.hide': 'Hide {currency} packs', // the foot button that sets the code and hides them
  'card.code.show': 'Show {currency} packs', // the foot button once the code matches
} as const;
