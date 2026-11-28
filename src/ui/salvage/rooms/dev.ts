/**
 * The rooms of the DEV family's words (PLAN2 2.5: sizes frozen here, imported by the views and by
 * scripts/content/yard/check.ts, which runs in node: PURE .ts, never a .tsx import). A room is the box a key is drawn
 * in at 667 × 375 and font scale 1.3 (the text check's phone), its width taken from the screens' own layout constants;
 * `KEYS` names the room of every key of ../strings/dev.ts (the check refuses a key of the family no line names).
 * SAMPLES: the widest value a hole takes where the check's default (scripts/content/yard/check.ts sampleArgs) is not it.
 * Owner: as ../strings/dev.ts.
 */
import { TYPE, frameLayout } from '../overlays/layout';

type Room = { pt: number; bold?: boolean; caps?: boolean; w: number; lines: number; maxChars?: number; shrinkTo?: number; what: string };
const F = frameLayout(667, 375, { top: 0, bottom: 0, left: 0, right: 0 }, 1.3);
/** A Settings row's text beside its switch or chevron (52 pt and an 8 pt gap). */
const ROW_TEXT = F.panel.w - 24 - 60;

export const ROOMS = {
  head: { pt: TYPE.name, bold: true, w: F.panel.w - 24, lines: 1, what: 'the Development section\'s head in Settings: 389 pt, 13 pt bold' },
  row: { pt: TYPE.name, bold: true, w: ROW_TEXT, lines: 2, what: 'a Development row in Settings: 389 pt less a 52 pt switch and its gap, 13 pt bold, two lines' },
  line: { pt: TYPE.line, w: F.panel.w - 24, lines: 2, what: 'a Development row\'s second line (the timer\'s result): 389 pt, 11 pt, two lines' },
} as const satisfies Record<string, Room>;

export const KEYS: readonly [RegExp, keyof typeof ROOMS][] = [
  [/^dev\.section$/, 'head'],
  [/^dev\.(timerResult|timerStale|timerSlices|timerRunning|pretend)$/, 'line'],
  [/^dev\./, 'row'],
];

export const SAMPLES: Record<string, Record<string, string>> = {
  'dev.country': { country: 'Unknown' },
  'dev.slotLoan': { n: '3' },
  'dev.slotRung': { n: '4' },
  'dev.slotPour': { n: '4' },
  'dev.timer': { t: '8 h', n: '4' },
  'dev.timerResult': { t: '8 h', n: '4', a: '59.9 s', m: '999', b: '9,999 ms', c: '59.9 s' },
};
