/**
 * The rooms of the HUD family's words (PLAN2 2.5: sizes frozen here, imported by the views and by
 * scripts/content/yard/check.ts, which runs in node: PURE .ts, never a .tsx import). A room is the box a key is drawn
 * in at 667 × 375 and font scale 1.3 (the text check's phone), its width taken from the screens' own layout constants;
 * `KEYS` names the room of every key of ../strings/hud.ts (the check refuses a key of the family no line names).
 * SAMPLES: the widest value a hole takes where the check's default (scripts/content/yard/check.ts sampleArgs) is not it.
 * Owner: as ../strings/hud.ts.
 */
import { TICKET_PT, hudLayout } from '../hud/metrics';

type Room = { pt: number; bold?: boolean; caps?: boolean; w: number; lines: number; maxChars?: number; shrinkTo?: number; what: string };
const L = hudLayout(667, 375, { top: 0, bottom: 0, left: 0, right: 0 }, 1.3);
/** A ticket's inner row as hud/ticketView.ts draws it: the ticket less the sprocket strip, paddings and edges (25 pt). */
const TICKET_INNER = L.ticketW - 25;

export const ROOMS = {
  ticketRow: { pt: TICKET_PT.row, w: TICKET_INNER, lines: 1, maxChars: 38, what: 'a ticket row at 1.3: 235 pt, 11 pt, one line, at most 38 characters (4.4, 4.5)' },
} as const satisfies Record<string, Room>;

export const KEYS: readonly [RegExp, keyof typeof ROOMS][] = [[/^ticket\./, 'ticketRow']];

export const SAMPLES: Record<string, Record<string, string>> = {
  'ticket.crateLine': { x: '§9,999.99' },
};
