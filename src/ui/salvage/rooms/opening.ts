/**
 * The rooms of the OPENING family's words (PLAN2 2.5: sizes frozen here, imported by the views and by
 * scripts/content/yard/check.ts, which runs in node: PURE .ts, never a .tsx import). A room is the box a key is drawn
 * in at 667 × 375 and font scale 1.3 (the text check's phone), its width taken from the screens' own layout constants;
 * `KEYS` names the room of every key of ../strings/opening.ts (the check refuses a key of the family no line names).
 * SAMPLES: the widest value a hole takes where the check's default (scripts/content/yard/check.ts sampleArgs) is not it.
 * Owner: as ../strings/opening.ts.
 */
import { GOAL_CHROME, hudLayout } from '../hud/metrics';

type Room = { pt: number; bold?: boolean; caps?: boolean; w: number; lines: number; maxChars?: number; shrinkTo?: number; what: string };
const L = hudLayout(667, 375, { top: 0, bottom: 0, left: 0, right: 0 }, 1.3);

/** The opening strip stands where the goal card stands, at its width (frozen here: PLAN2 2.5 gives no size; WLD-OPENING draws to it). */
export const STRIP_W = L.goalW - GOAL_CHROME;

export const ROOMS = {
  strip: { pt: 13, bold: true, w: STRIP_W, lines: 1, shrinkTo: 11, what: 'the opening strip\'s line: the goal card\'s room at 667, 13 pt bold, shrinking to 11' },
  stripLine: { pt: 11, w: STRIP_W, lines: 1, what: 'the opening strip\'s second line: the goal card\'s room at 667, 11 pt' },
} as const satisfies Record<string, Room>;

export const KEYS: readonly [RegExp, keyof typeof ROOMS][] = [
  [/^opening\.strip$/, 'strip'],
  [/^opening\./, 'stripLine'],
];

export const SAMPLES: Record<string, Record<string, string>> = {};
