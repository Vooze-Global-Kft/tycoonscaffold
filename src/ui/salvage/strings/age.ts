/**
 * Words of the AGE family (PLAN2 2.2; the age question as a keypad, the away bonus and its deferred hud button,
 * s2c-plan-cards 1.7 M6, M7). Owner from wave 1: CRD-AGE. Spread into TEXT by ../strings.ts; keys in textKeys.ts
 * `TEXT_KEYS.famAge`; rooms in ../rooms/age.ts. The card's title (title.ageQuestion) and refusal.badYear stay in strings.ts.
 */
export const AGE = {
  'card.age.clear': 'Clear', // the keypad's clear key
  'card.age.kept': 'Only an age band is kept, never the year.', // under the four boxes (4.8: kept as a band only)
  'hud.bonus': 'Bonus +{x}', // the deferred away bonus on the bottom bar (deferredBonus); x: { money }
} as const;
