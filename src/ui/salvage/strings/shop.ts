/**
 * Words of the SHOP family (PLAN2 2.2; the shop as a counter and the pack sheet, s2c-plan-cards 1.7 M1 to M4). Owner from
 * wave 1: CRD-SHOP. Spread into TEXT by ../strings.ts; keys in textKeys.ts `TEXT_KEYS.famShop`; rooms in ../rooms/shop.ts.
 * The shop's existing words (card.shop.*, card.packSheet.*) stay in strings.ts.
 */
export const SHOP = {
  'card.shop.priceWait': 'Asking the store…', // a product's button while the store's own price string has not come (never a made-up price)
} as const;
