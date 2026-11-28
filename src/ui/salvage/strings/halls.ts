/**
 * Words of the HALLS family (PLAN2 2.2; the furnace halls' card, s2c-plan-cards 1.2 H1 to H6; PLAN2 6.4's cooling chip).
 * Owner from wave 1: CRD-HALLS. Spread into TEXT by ../strings.ts; keys in textKeys.ts `TEXT_KEYS.famHalls`; rooms in
 * ../rooms/halls.ts. The hall's existing words (card.works.recipeHall, recipeKept, letChoose, card.firstPour) stay in strings.ts.
 */
export const HALLS = {
  // H4: the first heat waits for the boss, then pours itself (HeatView.selfPourAt)
  'card.works.selfPour': 'Pours by itself in {t}', // t: { secs }
  // H3: the furnace window, one line a phase (HeatView.phase)
  'card.heat.empty': 'Empty · waiting for {grade}', // grade: { grade } the chosen recipe's input
  'card.heat.filling': 'Filling · {a} / {b}', // a: { mass_g } charge_g, b: { mass_g } cap_g
  'card.heat.heating': 'Heating · ready in {t}', // t: { secs } to span.t1
  'card.heat.ready': 'Ready to pour',
  'card.heat.pour': 'Pouring',
  'card.heat.cooling': 'Cooling · {t}', // t: { secs } to the ingots' span.t1
  'card.heat.fromBays': 'Charged from the bays',
  'card.heat.ingots': '{grade} × {n}', // grade: { grade } the ingot's, n: { n } ingots
  // H2: the recipe rows
  'card.works.recipeInUse': 'In use',
  'card.works.recipePin': 'Keep on it', // a tap pins the recipe (setPlateRecipe); "Let the hall choose" gives it back
  // H6 and 6.4: world chips over a hall
  'chip.poured': 'Poured · {kg} {grade}', // kg: { mass_g }, grade: { grade }
  'chip.cooling': 'Cooling · {t}', // the second channel beside the cooling tint (6.4); t: { secs }
} as const;
