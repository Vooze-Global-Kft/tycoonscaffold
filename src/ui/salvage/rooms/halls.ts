/**
 * The rooms of the HALLS family's words (PLAN2 2.5: sizes frozen here, imported by the views and by
 * scripts/content/yard/check.ts, which runs in node: PURE .ts, never a .tsx import). A room is the box a key is drawn
 * in at 667 × 375 and font scale 1.3 (the text check's phone), its width taken from the screens' own layout constants;
 * `KEYS` names the room of every key of ../strings/halls.ts (the check refuses a key of the family no line names).
 * SAMPLES: the widest value a hole takes where the check's default (scripts/content/yard/check.ts sampleArgs) is not it.
 * Owner: as ../strings/halls.ts.
 */
import { BUY_MAX, TYPE, frameLayout } from '../overlays/layout';

type Room = { pt: number; bold?: boolean; caps?: boolean; w: number; lines: number; maxChars?: number; shrinkTo?: number; what: string };
const F = frameLayout(667, 375, { top: 0, bottom: 0, left: 0, right: 0 }, 1.3);
const PANEL_IN = F.panel.w - 24;

export const ROOMS = {
  window: { pt: TYPE.name, w: PANEL_IN, lines: 1, what: 'the furnace window\'s phase line under its picture: the panel\'s 389 pt, 13 pt, one line' },
  rowLine: { pt: TYPE.line, w: PANEL_IN, lines: 1, what: 'a line across the hall card: 389 pt, 11 pt' },
  button: { pt: TYPE.price, bold: true, w: BUY_MAX - 12, lines: 1, shrinkTo: 11, what: 'a recipe row\'s button: at most 136 pt less 6 a side, 13 pt bold, shrinking to 11' },
  chip: { pt: TYPE.line, w: 300, lines: 1, maxChars: 31, what: 'a chip over a hall in the world: 11 pt, one line, at most 31 characters (the works plate line, frozen here: 300 pt)' },
} as const satisfies Record<string, Room>;

export const KEYS: readonly [RegExp, keyof typeof ROOMS][] = [
  [/^chip\./, 'chip'],
  [/^card\.works\.recipePin$/, 'button'],
  [/^card\.heat\.(fromBays|ingots)$/, 'rowLine'],
  [/^card\.works\.recipeInUse$/, 'rowLine'],
  [/^card\.(heat\.|works\.selfPour$)/, 'window'],
];

export const SAMPLES: Record<string, Record<string, string>> = {
  'card.works.selfPour': { t: '19 m 59 s' },
  'card.heat.filling': { a: '2,000 kg', b: '2,000 kg' },
  'card.heat.heating': { t: '59 m 59 s' },
  'card.heat.cooling': { t: '59 m 59 s' },
  'chip.cooling': { t: '59 m 59 s' },
  'chip.poured': { kg: '2,000 kg', grade: 'Bronze ingot' },
  'card.heat.ingots': { n: '99' },
};
