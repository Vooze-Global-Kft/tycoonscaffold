/**
 * The rooms of the AWAY family's words (PLAN2 2.5: sizes frozen here, imported by the views and by
 * scripts/content/yard/check.ts, which runs in node: PURE .ts, never a .tsx import). A room is the box a key is drawn
 * in at 667 × 375 and font scale 1.3 (the text check's phone), its width taken from the screens' own layout constants;
 * `KEYS` names the room of every key of ../strings/away.ts (the check refuses a key of the family no line names).
 * SAMPLES: the widest value a hole takes where the check's default (scripts/content/yard/check.ts sampleArgs) is not it.
 * Owner: as ../strings/away.ts.
 */
import { TYPE, frameLayout } from '../overlays/layout';

type Room = { pt: number; bold?: boolean; caps?: boolean; w: number; lines: number; maxChars?: number; shrinkTo?: number; what: string };
const F = frameLayout(667, 375, { top: 0, bottom: 0, left: 0, right: 0 }, 1.3);

/** PLAN2 2.5: a works tile is 72 × 56 pt; six in a row at 844, two rows of three at 667 and at text size 1.3. */
export const TILE = { w: 72, h: 56, pad: 4 } as const;

export const ROOMS = {
  tileLabel: { pt: TYPE.line, caps: true, w: TILE.w - 2 * TILE.pad, lines: 1, shrinkTo: 11, what: 'a works tile\'s label: 72 pt less 4 a side, 11 pt small capitals (measured as capitals), one line (PLAN2 2.5)' },
  tileNumber: { pt: TYPE.price, bold: true, w: TILE.w - 2 * TILE.pad, lines: 1, shrinkTo: 11, what: 'a works tile\'s one number: 72 pt less 4 a side, 13 pt bold in compact money, shrinking to 11 (PLAN2 2.5)' },
  material: { pt: TYPE.name, w: F.centred.w - 32, lines: 1, maxChars: 18, what: 'a material\'s name (at most 18 characters, cards 4.2 C6) on a docket row: 488 pt, 13 pt' },
  row: { pt: TYPE.name, w: F.centred.w - 32, lines: 1, what: 'a docket row: 488 pt, 13 pt (4.3, the away card)' },
} as const satisfies Record<string, Room>;

export const KEYS: readonly [RegExp, keyof typeof ROOMS][] = [
  [/^away\.tile\.(amount|times|of|count)$/, 'tileNumber'],
  [/^away\.tile\./, 'tileLabel'],
  [/^material\./, 'material'],
  [/^away\./, 'row'],
];

export const SAMPLES: Record<string, Record<string, string>> = {
  'away.tile.amount': { x: '§1.23M' }, // the formatter's compact money: CRD-AWAY's first decision, measured (cards 3.2)
  'away.tile.times': { n: '99' },
  'away.tile.of': { n: '9', m: '9' },
  'away.tile.count': { n: '99' },
  'away.grewMaterial': { material: 'Stainless steel' },
};
