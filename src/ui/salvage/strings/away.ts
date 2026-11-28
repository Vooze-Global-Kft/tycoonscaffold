/**
 * Words of the AWAY family (PLAN2 2.2; the away docket's works strip of picture tiles, s2c-plan-cards 1.8 A1 and 2.4, PLAN2
 * 2.5's tile; the material names, cards 4.2 C6). Owner from wave 1: CRD-AWAY. Spread into TEXT by ../strings.ts; keys in
 * textKeys.ts `TEXT_KEYS.famAway`; rooms in ../rooms/away.ts. The docket's existing rows (away.*) stay in strings.ts.
 */
export const AWAY = {
  // a tile's label (11 pt small capitals) and its ONE number (13 pt bold)
  'away.tile.money': 'Earned', // gross, with the bank's share as a bar
  'away.tile.pours': 'Pours',
  'away.tile.pieces': 'Pieces',
  'away.tile.table': 'Table',
  'away.tile.grew': 'Grew', // the material that grew most (its picture and a rising arrow); "Grew most" takes two lines in 64 pt
  'away.tile.loan': 'Loan left',
  'away.tile.repaid': 'Repaid',
  'away.tile.amount': '{x}', // x: { money } in the formatter's compact form ("§1.23M"; the exact figure stays in the docket's rows)
  'away.tile.times': '×{n}', // n: { n } pours
  'away.tile.of': '{n} of {m}', // n, m: { n } pieces on the pad of its places
  'away.tile.count': '{n}', // n: { n } things on the table
  // C6: a material's name (content grades' `material`; at most 18 characters), for "the material that grew most"
  'material.lightiron': 'Light iron',
  'material.castiron': 'Cast iron',
  'material.steel': 'Steel',
  'material.alu': 'Aluminium',
  'material.brass': 'Brass',
  'material.copper': 'Copper',
  'material.stainless': 'Stainless steel',
  'material.bronze': 'Bronze',
  'material.lead': 'Lead',
  'away.grewMaterial': 'Grew most: {material}', // material: { text: 'material.<id>' } (away.grewMost names a grade)
} as const;
