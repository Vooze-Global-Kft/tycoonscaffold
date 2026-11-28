/**
 * Words of the HINTS family (PLAN2 2.2; the first-time teaching of the stage's verbs, critic I16, s2c-plan-wiring e.2). Owner
 * from wave 1: HNT. Spread into TEXT by ../strings.ts; keys in textKeys.ts `TEXT_KEYS.famHints`; rooms in ../rooms/hints.ts
 * (the goal card's two lines). Each shows once, waits for the queue, and has its seen mark (HNT).
 */
export const HINTS = {
  'hint.borrow': 'A bank lends on a machine that earns. Some of each sale repays it.',
  'hint.startUp': 'Stand at a new machine to start it up.',
  'hint.pour': 'The first heat waits for you, then pours by itself in {t}.', // t: { secs }
  'hint.letChoose': 'Kept on {recipe} by you. Let the hall choose gives it back.', // recipe: { text: 'recipe.<id>' }
  'hint.plasma': 'Only you can cut this, with the plasma cutter.',
  'hint.rack': 'Set a tagged thing on the Yard sale: a visitor pays more than scrap.',
  'hint.sort': 'Stand at the picking table to sort it by hand.',
  'hint.garage': 'The garage brings its cars itself.',
} as const;
