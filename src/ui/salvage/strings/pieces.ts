/**
 * Words of the PIECES family (PLAN2 2.2; the oversize piece, the pad, the picking table and the floor card, s2c-plan-cards
 * 1.6 L1 to L4, critic I10). Owner from wave 1: CRD-PIECES (CRD-ARRIVALS reads card.pad.incoming after the fix pass).
 * Spread into TEXT by ../strings.ts; keys in textKeys.ts `TEXT_KEYS.famPieces`; rooms in ../rooms/pieces.ts.
 */
export const PIECES = {
  // L1: a piece of a tier the yard does not own (LotCard.needsTier, tierOwned)
  'card.lot.needsPlasma': 'Needs the plasma cutter',
  // L2: the pad's card ({kind:'lot'} without a lot id; PadCard)
  'title.pad': 'Oversize pad',
  'card.pad.count': 'Oversize pieces: {n} of {m}', // n, m: { n } PadCard.n, max
  'card.pad.next': 'Next piece in about {t}', // t: { secs } = nextInS
  'card.pad.full': 'Pad full · the next comes when one is cut',
  'card.pad.waitsTier': 'The next kind needs the plasma cutter', // waitsForTier
  'card.pad.incoming': 'A piece is on its way · {t}', // PadCard.incoming (D2, CRD-ARRIVALS); t: { secs }
  // I10: the floor card grouped by object (stage on only)
  'title.floor': 'Tipping floor',
  'card.floor.group': '{thing} × {n} · {kg}', // thing: { thing }, n: { n }, kg: { mass_g }
  'card.floor.total': '{n} things · {kg}',
  'card.floor.empty': 'Nothing on the floor',
} as const;
