/**
 * The rooms of the PACKCODE family's words (PLAN2 2.5: sizes frozen here, imported by the views and by
 * scripts/content/yard/check.ts, which runs in node: PURE .ts, never a .tsx import). A room is the box a key is drawn
 * in at 667 × 375 and font scale 1.3 (the text check's phone), its width taken from the screens' own layout constants;
 * `KEYS` names the room of every key of ../strings/packcode.ts (the check refuses a key of the family no line names).
 * SAMPLES: the widest value a hole takes where the check's default (scripts/content/yard/check.ts sampleArgs) is not it.
 * Owner: as ../strings/packcode.ts.
 */
import { TYPE } from '../overlays/layout';

type Room = { pt: number; bold?: boolean; caps?: boolean; w: number; lines: number; maxChars?: number; shrinkTo?: number; what: string };

export const ROOMS = {
  key: { pt: TYPE.price, bold: true, w: 56 - 8, lines: 1, shrinkTo: 11, what: 'a keypad key: 56 pt less 4 a side, 13 pt bold, shrinking to 11 (the ten-key pad of 4.8)' },
  footButton: { pt: TYPE.price, bold: true, w: 200 - 12, lines: 1, shrinkTo: 11, what: 'the code card\'s foot button: 200 pt less 6 a side, 13 pt bold, shrinking to 11' },
} as const satisfies Record<string, Room>;

export const KEYS: readonly [RegExp, keyof typeof ROOMS][] = [
  [/^card\.code\.clear$/, 'key'],
  [/^card\.code\./, 'footButton'],
];

export const SAMPLES: Record<string, Record<string, string>> = {};
