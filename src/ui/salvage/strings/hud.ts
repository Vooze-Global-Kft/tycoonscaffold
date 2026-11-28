/**
 * Words of the HUD family (PLAN2 2.2; the hud's rows: the tickets of stage 2 and the bank's line, s2c-plan-cards 1.9, 1.4
 * B7, critic I10, m5). Owner from wave 1: CRD-HUDROWS. Spread into TEXT by ../strings.ts; keys in textKeys.ts
 * `TEXT_KEYS.famHud`; rooms in ../rooms/hud.ts.
 */
export const HUD = {
  // B7, m5: the bank's split on ONE line of a lot's ticket at 1.3 (ticket.bankSplit takes two and the ticket measures 154.8 pt in 150)
  'ticket.bankSplitOne': 'Bank {y} · you {z}', // y: { money } the bank's share, z: { money } the yard's
  // I10: the picking table's ticket, a line a thing (ticket.crateLot heads it)
  'ticket.crateLine': '{thing} · {x}', // thing: { thing }, x: { exact } (with the mass the widest thing makes 41 of the 38)
} as const;
