/**
 * The rooms of the PIECES family's words (PLAN2 2.5: sizes frozen here, imported by the views and by
 * scripts/content/yard/check.ts, which runs in node: PURE .ts, never a .tsx import). A room is the box a key is drawn
 * in at 667 × 375 and font scale 1.3 (the text check's phone), its width taken from the screens' own layout constants;
 * `KEYS` names the room of every key of ../strings/pieces.ts (the check refuses a key of the family no line names).
 * SAMPLES: the widest value a hole takes where the check's default (scripts/content/yard/check.ts sampleArgs) is not it.
 * Owner: as ../strings/pieces.ts.
 */
import { TYPE, frameLayout } from '../overlays/layout';

type Room = { pt: number; bold?: boolean; caps?: boolean; w: number; lines: number; maxChars?: number; shrinkTo?: number; what: string };
const F = frameLayout(667, 375, { top: 0, bottom: 0, left: 0, right: 0 }, 1.3);
const PANEL_IN = F.panel.w - 24;

export const ROOMS = {
  title: { pt: TYPE.title, bold: true, w: PANEL_IN - 44, lines: 1, what: 'a panel title: the panel less padding and the 44 pt close button, 15 pt bold (4.3)' },
  lead: { pt: TYPE.name, w: PANEL_IN, lines: 2, what: 'a line under the piece\'s or the pad\'s picture: 389 pt, 13 pt, two lines (4.3)' },
  rowName: { pt: TYPE.name, bold: true, w: PANEL_IN, lines: 1, what: 'a floor card row: one object and its count, 389 pt, 13 pt bold' },
  rowLine: { pt: TYPE.line, w: PANEL_IN, lines: 1, what: 'a line across the panel: 389 pt, 11 pt' },
} as const satisfies Record<string, Room>;

export const KEYS: readonly [RegExp, keyof typeof ROOMS][] = [
  [/^title\./, 'title'],
  [/^card\.floor\.group$/, 'rowName'],
  [/^card\.floor\./, 'rowLine'],
  [/^card\.(lot|pad)\./, 'lead'],
];

export const SAMPLES: Record<string, Record<string, string>> = {
  'card.pad.next': { t: '59 m 59 s' },
  'card.pad.incoming': { t: '59 m 59 s' },
  'card.pad.count': { n: '9', m: '9' },
  'card.floor.group': { n: '245', kg: '9,999 kg' },
  'card.floor.total': { n: '245', kg: '99.9 t' },
};
