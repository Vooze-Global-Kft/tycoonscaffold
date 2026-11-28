/**
 * The rooms of the SALE family's words (PLAN2 2.5: sizes frozen here, imported by the views and by
 * scripts/content/yard/check.ts, which runs in node: PURE .ts, never a .tsx import). A room is the box a key is drawn
 * in at 667 × 375 and font scale 1.3 (the text check's phone), its width taken from the screens' own layout constants;
 * `KEYS` names the room of every key of ../strings/sale.ts (the check refuses a key of the family no line names).
 * SAMPLES: the widest value a hole takes where the check's default (scripts/content/yard/check.ts sampleArgs) is not it.
 * Owner: as ../strings/sale.ts.
 */
import { TYPE, boardLayout, frameLayout } from '../overlays/layout';

type Room = { pt: number; bold?: boolean; caps?: boolean; w: number; lines: number; maxChars?: number; shrinkTo?: number; what: string };
const F = frameLayout(667, 375, { top: 0, bottom: 0, left: 0, right: 0 }, 1.3);
const PANEL_IN = F.panel.w - 24;

export const ROOMS = {
  rowLine: { pt: TYPE.line, w: PANEL_IN, lines: 1, what: 'a line of the Yard sale card: 389 pt, 11 pt' },
  rowName: { pt: TYPE.name, bold: true, w: PANEL_IN, lines: 1, what: 'a row head of the Yard sale card: 389 pt, 13 pt bold' },
  slot: { pt: TYPE.line, w: Math.floor(PANEL_IN / 6) - 4, lines: 1, what: 'the caption of one of the drawn rack\'s six places: a sixth of 389 pt less 4, 11 pt' },
  greyPlate: { pt: TYPE.greyName, w: boardLayout(667).greyW - 8, lines: 3, what: 'a greyed plate on the process board: 112 pt at 667 less 8, 11 pt, three lines (4.5)' },
} as const satisfies Record<string, Room>;

export const KEYS: readonly [RegExp, keyof typeof ROOMS][] = [
  [/^card\.yardSale\.slotFree$/, 'slot'],
  [/^card\.yardSale\.cornerHead$/, 'rowName'],
  [/^card\.yardSale\./, 'rowLine'],
  [/^board\.pageDark$/, 'greyPlate'],
];

export const SAMPLES: Record<string, Record<string, string>> = {};
