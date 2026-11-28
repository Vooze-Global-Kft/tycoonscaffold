/**
 * Words of the COUNT family (PLAN2 2.2; the counted return's card at stage 2, s2c-plan-cards 1.8 A2, s2c-plan-wiring c.3).
 * Owner from wave 1: CRD-COUNT. Spread into TEXT by ../strings.ts; keys in textKeys.ts `TEXT_KEYS.famCount`; rooms in
 * ../rooms/count.ts. The stage-1 counting line (away.counting) stays in strings.ts and on the stage-1 card.
 */
export const COUNT = {
  'away.countHour': 'Counting hour {n} of {m}…', // n: { n } the hour being counted, m: { n } the absence's hours (0.S: "hour 3 of 8")
  'away.countSold': 'Sold so far {x}', // x: { money } the running Sold
} as const;
