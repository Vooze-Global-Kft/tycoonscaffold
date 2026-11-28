/**
 * Words of the LINE family (PLAN2 2.2; the shredder line and the garage, s2c-plan-cards 1.3 S1 to S4; the arrival state of
 * PLAN2 7 D2). Owner from wave 1: CRD-LINE (CRD-ARRIVALS reads card.line.coming after the fix pass). Spread into TEXT by
 * ../strings.ts; keys in textKeys.ts `TEXT_KEYS.famLine`; rooms in ../rooms/line.ts.
 */
export const LINE = {
  // S1: the bought-with card's title (the goal says "the shredder line"; title.works.shredder stays the plate's own name)
  'title.works.shredderLine': 'Shredder line',
  // S4: why no car comes (RecoveryView.waitsFor; nothing expires)
  'card.line.every': 'The garage brings a car every {t}', // t: { secs } = partners.garage.recovery.period_s
  'card.line.nextCar': 'Next car in {t}', // waitsFor 'period'; t: { secs } to nextAt
  'card.line.cashShort': 'Waiting for cash · {x} short', // waitsFor 'cash'; x: { money } = short
  'card.line.apronTaken': 'A car is on the apron', // waitsFor 'apron'
  'card.line.coming': 'A car is on its way · {t}', // waitsFor 'coming' (D2, CRD-ARRIVALS); t: { secs } to arrivesAt
  // S2: the car's three stages as pictures, a caption each (FrameTable.line.car.stage)
  'card.line.stageWhole': 'As it came',
  'card.line.stageDraining': 'Draining',
  'card.line.stageShell': 'Ready to shred',
} as const;
