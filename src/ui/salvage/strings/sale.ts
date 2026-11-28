/**
 * Words of the SALE family (PLAN2 2.2; the Yard sale's card, s2c-plan-cards 1.6 Y1, and the process board's pages, 1.1 P11).
 * Owner from wave 1: CRD-SALE. Spread into TEXT by ../strings.ts; keys in textKeys.ts `TEXT_KEYS.famSale`; rooms in
 * ../rooms/sale.ts. The Yard sale's existing words (card.yardSale.*) stay in strings.ts.
 */
export const SALE = {
  'card.yardSale.visitor': 'A visitor is paying', // a visitor between payAt and t1 (FrameVisitor)
  'card.yardSale.slotFree': 'Free', // a place on the drawn rack with nothing on it
  'card.yardSale.cornerHead': 'Trade corner', // the dealer's corner's row head
  'board.pageDark': 'Not in this yard', // the process board: a greyed page or row whose machines are dark (no name, no date)
} as const;
