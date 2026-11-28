/**
 * The rooms of the HINTS family's words (PLAN2 2.5: sizes frozen here, imported by the views and by
 * scripts/content/yard/check.ts, which runs in node: PURE .ts, never a .tsx import). A room is the box a key is drawn
 * in at 667 × 375 and font scale 1.3 (the text check's phone), its width taken from the screens' own layout constants;
 * `KEYS` names the room of every key of ../strings/hints.ts (the check refuses a key of the family no line names).
 * SAMPLES: the widest value a hole takes where the check's default (scripts/content/yard/check.ts sampleArgs) is not it.
 * Owner: as ../strings/hints.ts.
 */
import { GOAL_CHROME, hudLayout } from '../hud/metrics';

type Room = { pt: number; bold?: boolean; caps?: boolean; w: number; lines: number; maxChars?: number; shrinkTo?: number; what: string };
const L = hudLayout(667, 375, { top: 0, bottom: 0, left: 0, right: 0 }, 1.3);

export const ROOMS = {
  /** A lesson of the works is the opened goal card's second and third line (as the first yard's lessons above 1.15). */
  hint: { pt: 12, w: L.goalW - GOAL_CHROME, lines: 2, shrinkTo: 11, what: 'a first-time hint on the opened goal card: the card\'s room at 667, 12 pt shrinking to 11, two lines' },
} as const satisfies Record<string, Room>;

export const KEYS: readonly [RegExp, keyof typeof ROOMS][] = [[/^hint\./, 'hint']];

export const SAMPLES: Record<string, Record<string, string>> = {
  'hint.pour': { t: '19 m 59 s' },
  'hint.letChoose': { recipe: 'No.2 copper' },
};
