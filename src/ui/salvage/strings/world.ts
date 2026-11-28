/**
 * Words of the WORLD family (PLAN2 2.2; the works' plates, chips and standing reasons in the world, s2c-plan-world 2.4,
 * s2c-plan-cards 1.9 D2). Owner from wave 1: WLD-LABELS. Spread into TEXT by ../strings.ts; keys in textKeys.ts
 * `TEXT_KEYS.famWorld`; rooms in ../rooms/world.ts (one line of 11 pt, at most 31 characters: the works plate line).
 * Every line is the rules' predicate in words (FrameWorks.why and the frame's pad, rack, bunker, line); the screen only
 * picks which four to show.
 */
export const WORLD = {
  // a hall (HeatView)
  'plate.works.selfPour': 'Pours by itself in {t}', // ready, the first heat: t: { secs } to selfPourAt
  'plate.works.charge': 'Charge {a} / {b}', // filling: a, b: { mass_g } charge_g, the start share of cap_g
  'plate.works.baysEmpty': '{grade|short} bays empty', // nothing to charge: grade: { grade } the recipe's input
  'plate.works.keptShort': 'Kept on {recipe}', // the recipe pinned by a tap: recipe: { text: 'recipe.<id>' }
  // the shredder line (RecoveryView)
  'plate.works.nextCar': 'Next car in {t}',
  'plate.works.carCash': 'Next car when cash is {x}', // x: { money } the car's price ("... when the yard has {x}" is 34 of the 31)
  'plate.works.apronTaken': 'Apron taken',
  // the oversize pad
  'plate.pad.next': 'Next piece in about {t}',
  'plate.pad.full': 'Pad full · {n} of {m}',
  'plate.pad.noKind': 'No piece your tools can open',
  // the Yard sale's rack
  'plate.rack.empty': 'Put something reusable here',
  'plate.rack.next': 'Next visitor in about {t}',
  // a works bunker (FrameTable.bunker.why)
  'plate.bunker.full': 'Full · sold at the next round',
  // the hook-lift's driver (his idle tag beside the first yard's reasons)
  'tag.driver.bridge': 'Bridge skips fill in {t}', // the bridge partners' skips are filling; t: { secs }
} as const;
