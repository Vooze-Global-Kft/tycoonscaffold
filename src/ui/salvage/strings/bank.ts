/**
 * Words of the BANK family (PLAN2 2.2; the bank as printed paper and the hud's loan plate, s2c-plan-cards 1.4 B2 to B6, PLAN2
 * 7 D4). Owner from wave 1: CRD-BANK. Spread into TEXT by ../strings.ts; keys in textKeys.ts `TEXT_KEYS.famBank`; rooms in
 * ../rooms/bank.ts. The letter's, the finance card's and Agreements' words (card.letter.*, card.finance.*,
 * card.agreements.*) stay in strings.ts. Never a yearly rate or a debt's words (check.ts SCOPED_BANNED covers these keys).
 */
export const BANK = {
  // B5 / D4: the plate under the cash chip while an agreement is open; it opens Agreements
  'hud.loanPlate': 'Bank loan · {left} left', // left: { money } the agreement's left
  // B6: the chip at the instant of the last repayment (event repaid)
  'chip.repaid': 'Repaid · {bank|short}',
} as const;
