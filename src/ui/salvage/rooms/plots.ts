/**
 * The rooms of the PLOTS family's words (PLAN2 2.5: sizes frozen here, imported by the views and by
 * scripts/content/yard/check.ts, which runs in node: PURE .ts, never a .tsx import). A room is the box a key is drawn
 * in at 667 × 375 and font scale 1.3 (the text check's phone), its width taken from the screens' own layout constants;
 * `KEYS` names the room of every key of ../strings/plots.ts (the check refuses a key of the family no line names).
 * SAMPLES: the widest value a hole takes where the check's default (scripts/content/yard/check.ts sampleArgs) is not it.
 * Owner: as ../strings/plots.ts.
 */
import { BUY_W, PAD, TYPE, frameLayout } from '../overlays/layout';

type Room = { pt: number; bold?: boolean; caps?: boolean; w: number; lines: number; maxChars?: number; shrinkTo?: number; what: string };
const F = frameLayout(667, 375, { top: 0, bottom: 0, left: 0, right: 0 }, 1.3);
/** The right panel's text column at 667 (413 less 12 pt a side) and a row's text beside its Buy button (4.3). */
const PANEL_IN = F.panel.w - 24;
const ROW_TEXT = PANEL_IN - BUY_W - 8;

export const ROOMS = {
  rowLine: { pt: TYPE.line, w: ROW_TEXT, lines: 1, what: 'a works card row\'s second line beside its Buy button: 285 pt, 11 pt (4.3)' },
  stepper: { pt: TYPE.line, w: Math.floor(PANEL_IN / 5) - 4, lines: 1, what: 'a station of the life stepper: a fifth of the panel\'s 389 pt less 4, 11 pt, one line' },
  notice: { pt: TYPE.line, w: PANEL_IN - 2 * PAD, lines: 3, what: 'the levels\' notice strip at the top of the rota: the panel less its padding, 11 pt, three lines' },
} as const satisfies Record<string, Room>;

export const KEYS: readonly [RegExp, keyof typeof ROOMS][] = [
  [/^card\.works\.step\./, 'stepper'],
  [/^card\.notice\./, 'notice'],
  [/^card\.works\.(earns|pays|arrivesIn)$/, 'rowLine'],
];

export const SAMPLES: Record<string, Record<string, string>> = {
  'card.works.pays': { t: '99 h 59 m' },
  'card.works.arrivesIn': { t: '59 m 59 s' },
};
