/**
 * The rooms of the BANK family's words (PLAN2 2.5: sizes frozen here, imported by the views and by
 * scripts/content/yard/check.ts, which runs in node: PURE .ts, never a .tsx import). A room is the box a key is drawn
 * in at 667 × 375 and font scale 1.3 (the text check's phone), its width taken from the screens' own layout constants;
 * `KEYS` names the room of every key of ../strings/bank.ts (the check refuses a key of the family no line names).
 * SAMPLES: the widest value a hole takes where the check's default (scripts/content/yard/check.ts sampleArgs) is not it.
 * Owner: as ../strings/bank.ts.
 */
import { hudLayout } from '../hud/metrics';
import { TYPE } from '../overlays/layout';

type Room = { pt: number; bold?: boolean; caps?: boolean; w: number; lines: number; maxChars?: number; shrinkTo?: number; what: string };
const L = hudLayout(667, 375, { top: 0, bottom: 0, left: 0, right: 0 }, 1.3);

export const ROOMS = {
  /** PLAN2 2.5: under the cash chip, its width, 11 pt; two lines when the amount is long (the plate grows down, never across). */
  loanPlate: { pt: TYPE.line, w: L.slots.cash - 12, lines: 2, what: 'the hud\'s loan plate under the cash chip: the cash slot less 6 pt a side, 11 pt, two lines (PLAN2 2.5)' },
  chip: { pt: TYPE.line, w: 300, lines: 1, maxChars: 31, what: 'a chip in the world: 11 pt, one line, at most 31 characters (frozen here: 300 pt)' },
} as const satisfies Record<string, Room>;

export const KEYS: readonly [RegExp, keyof typeof ROOMS][] = [
  [/^hud\.loanPlate$/, 'loanPlate'],
  [/^chip\./, 'chip'],
];

export const SAMPLES: Record<string, Record<string, string>> = {
  'hud.loanPlate': { left: '§1,234,567' },
};
