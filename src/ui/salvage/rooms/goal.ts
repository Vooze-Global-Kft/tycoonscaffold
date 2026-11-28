/**
 * The rooms of the GOAL family's words (PLAN2 2.5: sizes frozen here, imported by the views and by
 * scripts/content/yard/check.ts, which runs in node: PURE .ts, never a .tsx import). A room is the box a key is drawn
 * in at 667 × 375 and font scale 1.3 (the text check's phone), its width taken from the screens' own layout constants;
 * `KEYS` names the room of every key of ../strings/goal.ts (the check refuses a key of the family no line names).
 * SAMPLES: the widest value a hole takes where the check's default (scripts/content/yard/check.ts sampleArgs) is not it.
 * Owner: as ../strings/goal.ts.
 */
import { GOAL_CHROME, hudLayout } from '../hud/metrics';
import { TYPE, frameLayout } from '../overlays/layout';

type Room = { pt: number; bold?: boolean; caps?: boolean; w: number; lines: number; maxChars?: number; shrinkTo?: number; what: string };
const L = hudLayout(667, 375, { top: 0, bottom: 0, left: 0, right: 0 }, 1.3);
const F = frameLayout(667, 375, { top: 0, bottom: 0, left: 0, right: 0 }, 1.3);

/** PLAN2 2.5: the goal card's room is GOAL_W less its chrome (hud/metrics.ts goalSubPt: goalW less GOAL_CHROME). */
export const GOAL_ROOM = L.goalW - GOAL_CHROME;

export const ROOMS = {
  goalLine: { pt: 12, w: GOAL_ROOM, lines: 1, shrinkTo: 11, what: 'a line of the opened goal card: the card\'s goalW at 667 less GOAL_CHROME, 12 pt, shrinking to 11 (hud/metrics.ts goalSubPt)' },
  clipHead: { pt: TYPE.name, bold: true, w: F.panel.w - 24, lines: 1, what: 'a section head of the clipboard: 389 pt, 13 pt bold' },
  tileLine: { pt: TYPE.line, w: F.panel.w - 24 - 96 - 8, lines: 1, what: 'a line of a rung on the industry table: 285 pt, 11 pt (as table.* rows)' },
} as const satisfies Record<string, Room>;

export const KEYS: readonly [RegExp, keyof typeof ROOMS][] = [
  [/^clip\./, 'clipHead'],
  [/^table\./, 'tileLine'],
  [/^(goal|advice)\./, 'goalLine'],
];

export const SAMPLES: Record<string, Record<string, string>> = {};
