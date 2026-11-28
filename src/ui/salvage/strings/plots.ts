/**
 * Words of the PLOTS family (PLAN2 2.2; the works card through a plot's life, s2c-plan-cards 1.1 P1 to P10). Owner from
 * wave 1: CRD-PLOTS (until then WORDS-SETUP). Spread into TEXT by ../strings.ts; every key is listed in
 * src/engine/salvage/textKeys.ts `TEXT_KEYS.famPlots` and fitted in the room ../rooms/plots.ts names for it
 * (`npx tsx scripts/content/yard/check.ts --all`). Holes as strings.ts says; numbers only through the rules' formatters.
 */
export const PLOTS = {
  // P2: what a plate for sale earns, from the same measured gain its price is made of (WorksCard.earns; ruling 28.5 b, 30.3 "about")
  'card.works.earns': 'About +{x} an hour', // x: { money } = earns.gain_h
  'card.works.pays': 'Pays for itself in about {t}', // t: { secs } = earns.payback_h × 3600
  // P4: ordered, on its way (state 'arriving', arrivesAt)
  'card.works.arrivesIn': 'On its way · here in {t}', // t: { secs }
  // the life stepper's five stations (P1 to P6), one word or two each
  'card.works.step.locked': 'Locked',
  'card.works.step.forSale': 'For sale',
  'card.works.step.arriving': 'Arriving',
  'card.works.step.startUp': 'Start-up',
  'card.works.step.working': 'Working',
  // P10: the one notice at the works' opening, a strip at the top of the rota (CardData.notice; C-CARDS-b sets it)
  'card.notice.levelsWorks': 'From the works on, a level costs what it earns. Each says what it adds an hour.',
} as const;
