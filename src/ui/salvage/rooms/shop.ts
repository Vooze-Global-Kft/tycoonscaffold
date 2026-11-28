/**
 * The rooms of the SHOP family's words (PLAN2 2.5: sizes frozen here, imported by the views and by
 * scripts/content/yard/check.ts, which runs in node: PURE .ts, never a .tsx import). A room is the box a key is drawn
 * in at 667 × 375 and font scale 1.3 (the text check's phone), its width taken from the screens' own layout constants;
 * `KEYS` names the room of every key of ../strings/shop.ts (the check refuses a key of the family no line names).
 * SAMPLES: the widest value a hole takes where the check's default (scripts/content/yard/check.ts sampleArgs) is not it.
 * Owner: as ../strings/shop.ts.
 */
import { BUY_MAX, TYPE } from '../overlays/layout';

type Room = { pt: number; bold?: boolean; caps?: boolean; w: number; lines: number; maxChars?: number; shrinkTo?: number; what: string };

export const ROOMS = {
  button: { pt: TYPE.price, bold: true, w: BUY_MAX - 12, lines: 1, shrinkTo: 11, what: 'a shop row\'s button: at most 136 pt less 6 a side, 13 pt bold, shrinking to 11 (4.3, 4.8)' },
} as const satisfies Record<string, Room>;

export const KEYS: readonly [RegExp, keyof typeof ROOMS][] = [[/^card\.shop\.priceWait$/, 'button']];

export const SAMPLES: Record<string, Record<string, string>> = {};
