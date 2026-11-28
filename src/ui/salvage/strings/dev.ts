/**
 * Words of the DEV family (PLAN2 2.2, critic m10; Settings > Development under __DEV__ && stageOn(): the timer row and the
 * save slots, s2c-plan-wiring b.4, c.4). Owner from wave 1: MOD-TIMER, then MOD-SLOTS. Spread into TEXT by ../strings.ts;
 * keys in textKeys.ts `TEXT_KEYS.famDev`; rooms in ../rooms/dev.ts. No number is written: rungs and hours are holes.
 */
export const DEV = {
  'dev.section': 'Development',
  'dev.country': 'Store country: {country}', // country: { ref } 'Auto' | 'US' | 'DE' | 'Unknown'
  'dev.slotLoan': 'Start at rung {n} with the cash for a loan', // w3letter; n: { n }
  'dev.slotRung': 'Start at rung {n}', // w4entry
  'dev.slotPour': 'Start at rung {n} with a hall pouring', // w4pour
  'dev.back': 'Back to my yard',
  'dev.timer': 'Time away {t} at rung {n}: run', // t: { secs } 8 h; n: { n } 4
  'dev.timerRunning': 'Running…',
  'dev.timerResult': '{t} at rung {n}: {a} in {m} steps (worst {b}) · one block {c}', // a, c: { secs } totals; b: worst step; m: { n }
  'dev.timerStale': 'Stale state: re-record',
  'dev.timerSlices': 'Steps are device-time slices for now', // until C-AWAY's awayJob lands (MOD-TIMER)
  'dev.pretend': 'Test purchases: nothing is charged',
} as const;
