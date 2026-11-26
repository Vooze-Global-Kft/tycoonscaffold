/**
 * Sizes of everything always on screen (yard-stage1.md 4.1 and 4.4), as pure numbers so the rule "the
 * rows add up" is tested (./hud.test.ts). Bars are sized by hand from min(fontScale, 1.3) and their
 * text has `allowFontScaling={false}` (AGENTS.md on bars), never a lineHeight on a TextInput.
 *
 * 4.1's two reference phones (points):
 *
 * | Row | 844 × 390 (insets L 47, R 47, B 21) | 667 × 375 (insets 0; 16 margins) |
 * | Top bar | 36 | 34 |
 * | Goal card | 28 | 26 |
 * | Free world | 237 | 239 |
 * | Bottom (stick zone; the one button) | 89 (8 + 60 + 21) | 76 (60 + 16) |
 *
 * | Top bar | 844 (safe 750) | 667 (635) |
 * | Cash | 136 | 116 |  Ladder chip | 394 | 326 |  Carry | 104 | 104 |  Clipboard | 44 | 44 |  Gaps | 3 × 24 | 3 × 15 |
 * (4.1 had ladder 408 / 340 and carry 90; the lead's ruling of 15:55 moved 14 pt to the carry chip.)
 *
 * Any other window: the side margins are max(inset, 16); "compact" below a safe width of 700 pt; the
 * ladder chip takes what the fixed slots and gaps leave.
 */

export interface Insets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** Smallest text anywhere (4.6). */
export const MIN_PT = 11;
/** A line of the system font is about this many times its size. */
export const LINE_EM = 1.2;
/** Two lines in one chip sit closer (BarText with lines 2). */
export const LINE_TIGHT = 1.18;
/** Average advance of a character of the system font, semibold, in em (a little generous: digits, capitals). */
export const CHAR_EM = 0.56;
/** The one button's disc (4.1). */
export const BUTTON = 60;

/** The scale bar text is sized from: min(fontScale, 1.3), never below 1. */
export function hudScale(fontScale: number): number {
  if (!Number.isFinite(fontScale) || fontScale <= 0) return 1;
  return Math.max(1, Math.min(1.3, fontScale));
}

export interface HudLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The safe area's left and right edges after the 16 pt margins. */
  left: number;
  right: number;
  safeW: number;
  top: number;
  rows: { bar: number; goal: number; free: number; bottom: number };
  /** y of each row's top edge. */
  barY: number;
  goalY: number;
  freeY: number;
  bottomY: number;
  /** The top bar's slots, left to right, and the gap between them. */
  slots: { cash: number; ladder: number; carry: number; clip: number; gap: number };
  goalW: number;
  /** The one button's disc: its left and top edges. */
  button: { x: number; y: number; size: number };
  /** Tickets (4.4): width and the tallest they may be. */
  ticketW: number;
  ticketMaxH: number;
  /** The scale used for bar text. */
  s: number;
}

export function hudLayout(width: number, height: number, insets: Insets, fontScale = 1): HudLayout {
  const s = hudScale(fontScale);
  const left = Math.max(insets.left, 16);
  const rightM = Math.max(insets.right, 16);
  const safeW = Math.max(0, width - left - rightM);
  const compact = safeW < 700;
  const bar = compact ? 34 : 36;
  const goal = compact ? 26 : 28;
  const bottom = BUTTON + Math.max(16, insets.bottom) + (insets.bottom > 0 ? 8 : 0);
  const top = Math.max(0, insets.top);
  const free = Math.max(0, height - top - bar - goal - bottom);
  const gap = compact ? 15 : 24;
  // The cash slot is never narrower than six figures at this scale (findings P4, L9, H10, W1: the cash is
  // never cut): the width comes from the ladder chip, which has shorter forms.
  const cash = Math.max(compact ? 116 : 136, cashSlotNeed(s));
  // The carry chip is 104 pt (the lead's ruling, 15:55: 14 pt taken from the ladder chip).
  const carry = 104;
  const clip = 44;
  const ladder = Math.max(0, safeW - cash - carry - clip - 3 * gap);
  const goalW = Math.min(compact ? 340 : 400, safeW);
  const bottomY = top + bar + goal + free;
  return {
    width,
    height,
    compact,
    left,
    right: width - rightM,
    safeW,
    top,
    rows: { bar, goal, free, bottom },
    barY: top,
    goalY: top + bar,
    freeY: top + bar + goal,
    bottomY,
    slots: { cash, ladder, carry, clip, gap },
    goalW,
    button: { x: width - rightM - BUTTON, y: height - Math.max(16, insets.bottom) - BUTTON, size: BUTTON },
    ticketW: compact ? 260 : 280,
    ticketMaxH: 150,
    s,
  };
}

/** Height of one line of text of size `pt`. */
export function lineH(pt: number): number {
  return Math.ceil(pt * LINE_EM);
}

/** About how wide `text` is at `pt`. */
export function textW(text: string, pt: number): number {
  return text.length * pt * CHAR_EM;
}

export interface Fit {
  /** Font size, points (never under MIN_PT). */
  pt: number;
  lines: 1 | 2;
  /** True when even two lines of MIN_PT do not fit (the text is cut with an ellipsis). */
  cut: boolean;
}

/**
 * The font for `text` in a box `w` × `h`: the base size × the bar scale on one line if it fits; else
 * smaller, down to MIN_PT, on one line; else (when `two`) two lines at the largest size that fits both
 * ways; else MIN_PT, cut.
 */
export function fitText(text: string, w: number, h: number, base: number, s: number, two = false): Fit {
  const want = base * s;
  const oneByW = w / Math.max(1, text.length * CHAR_EM);
  const oneByH = h / LINE_EM;
  const one = Math.floor(Math.min(want, oneByW, oneByH) * 2) / 2;
  if (one >= MIN_PT) return { pt: one, lines: 1, cut: false };
  if (two) {
    const words = text.split(' ');
    let best = Infinity;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' ');
      const b = words.slice(i).join(' ');
      best = Math.min(best, Math.max(a.length, b.length));
    }
    if (Number.isFinite(best)) {
      const twoPt = Math.floor(Math.min(want, w / (best * CHAR_EM), h / (2 * LINE_TIGHT)) * 2) / 2;
      if (twoPt >= MIN_PT) return { pt: twoPt, lines: 2, cut: false };
    }
  }
  return { pt: MIN_PT, lines: 1, cut: true };
}

/**
 * The ladder chip's form (4.1 and 5.2): the long form "{rank} of {n} · next {rival} {t}", else
 * "{rank} · next {rival}", else "{rank} · {t} to next": the first whose text fits the chip on one line
 * at no less than MIN_PT. `texts` are the three forms already in words, longest first.
 */
export function pickForm(texts: string[], w: number, h: number, s: number): { index: number; fit: Fit } {
  for (let i = 0; i < texts.length; i++) {
    const f = fitText(texts[i], w, h, 12, s);
    if (!f.cut) return { index: i, fit: f };
  }
  const last = texts.length - 1;
  return { index: last, fit: fitText(texts[last], w, h, 12, s) };
}

// ------------------------------------------------------------------------------------------- tickets

/** Type sizes on the ticket paper at scale 1 (never under 11 pt, 4.6). */
export const TICKET_PT = { head: 11, row: 11, paid: 12, small: 11 } as const;
const TICKET_PAD = 6;
const HEAD_PAD = 4;

/**
 * Height of a ticket with these rows at the bar scale s: the header band, up to three grade rows, a
 * foot line ("+ n more" with today's value or "Paid"), the lesson (weigh-in, optional) and the legal
 * lines. 4.4 and S20: at most 150 pt at font scale 1.3 (./hud.test.ts holds it).
 */
export function ticketHeight(kind: 'weighIn' | 'collection', gradeRows: number, lesson: boolean, s: number): number {
  // gradeRows counts printed lines: a row that wraps (name, then mass and price) counts two.
  const rows = Math.min(6, Math.max(0, gradeRows));
  const head = lineH(TICKET_PT.head * s) + HEAD_PAD;
  const row = lineH(TICKET_PT.row * s);
  const small = lineH(TICKET_PT.small * s);
  if (kind === 'weighIn') return TICKET_PAD + head + rows * row + small + (lesson ? small : 0) + small + TICKET_PAD;
  return TICKET_PAD + head + rows * row + lineH(TICKET_PT.paid * s) + 2 * small + TICKET_PAD;
}

/**
 * Where a ticket goes: its anchor (a screen point: the display post's printer slot, the cab) with the
 * ticket rising above it, centred, then clamped inside the free world and the safe area.
 */
export function placeTicket(ax: number, ay: number, w: number, h: number, L: Pick<HudLayout, 'left' | 'right' | 'freeY' | 'bottomY'>): { x: number; y: number } {
  'worklet';
  const minX = L.left;
  const maxX = Math.max(minX, L.right - w);
  const minY = L.freeY + 4;
  const maxY = Math.max(minY, L.bottomY - h - 4);
  const x = Math.min(maxX, Math.max(minX, ax - w / 2));
  const y = Math.min(maxY, Math.max(minY, ay - h));
  return { x, y };
}

/** The § coin's centre in the top bar (the coin's arc ends here, world-b). */
export function cashCoinPoint(L: HudLayout): { x: number; y: number } {
  const coin = coinSize(L.s);
  return { x: L.left + 6 + coin / 2, y: L.barY + L.rows.bar / 2 };
}

/** The widest cash the first yard prints in the bar ("§999,999": eight characters). */
export const CASH_WIDEST = '§999,999';
/** The cash chip's paddings (6 + 6), the gap after the coin (6) and a little air (2). */
const CASH_CHROME = 20;

/** How wide the cash slot must be for CASH_WIDEST at 15 pt × the bar scale s. */
export function cashSlotNeed(s: number): number {
  return Math.ceil(textW(CASH_WIDEST, 15 * s) + coinSize(s) + CASH_CHROME);
}

/** Room for the cash text in a slot of width w at bar scale s (the coin and the paddings taken off). */
export function cashTextW(w: number, s: number): number {
  return w - coinSize(s) - CASH_CHROME;
}

/**
 * The cash's font: 15 pt × s when the TARGET value's text fits its room, else smaller down to MIN_PT; the
 * size is taken from the value the counter rolls to, so it does not flicker while it rolls. Never cut:
 * the slot is sized so CASH_WIDEST fits at 15 × s (cashSlotNeed), and anything wider steps down.
 */
export function cashFit(text: string, slotW: number, h: number, s: number): Fit {
  const room = cashTextW(slotW, s);
  const want = 15 * s;
  const byW = room / Math.max(1, text.length * CHAR_EM);
  const pt = Math.floor(Math.min(want, byW, h / 1.25) * 2) / 2;
  return { pt: Math.max(MIN_PT, pt), lines: 1, cut: pt < MIN_PT };
}

/** The § coin's diameter. */
export function coinSize(s: number): number {
  return Math.round(16 * Math.min(s, 1.15));
}

/**
 * Moves a ticket (x, y, w, h) off another one (o) when they overlap (the cab's ticket beside the scale's when
 * both anchors clamp to one edge): to its left, else its right, else above or below it, kept inside the box.
 */
export function avoidRect(x: number, y: number, w: number, h: number, o: { x: number; y: number; w: number; h: number }, L: Pick<HudLayout, 'left' | 'right' | 'freeY' | 'bottomY'>): { x: number; y: number } {
  'worklet';
  const gap = 8;
  const overlap = x < o.x + o.w + gap && x + w + gap > o.x && y < o.y + o.h + gap && y + h + gap > o.y;
  if (!overlap) return { x, y };
  if (o.x - w - gap >= L.left) return { x: o.x - w - gap, y };
  if (o.x + o.w + gap + w <= L.right) return { x: o.x + o.w + gap, y };
  if (o.y - h - gap >= L.freeY) return { x, y: o.y - h - gap };
  return { x, y: Math.min(L.bottomY - h, o.y + o.h + gap) };
}

/** Above this font scale a ticket prints at most two grade rows and no lesson (the lead's ruling, 15:55). */
export const LESSON_MAX_SCALE = 1.15;

/** Whether the weigh-in ticket carries its lesson line at bar scale s (else the goal card shows it). */
export function lessonOnTicket(s: number): boolean {
  return s <= LESSON_MAX_SCALE;
}

/** The top bar's height for a window (36 at 844 x 390, 34 at 667 x 375): overlays-a's frames start under it. */
export function topBarHeight(width: number, height: number, insets: Insets): number {
  return hudLayout(width, height, insets).rows.bar;
}

// ------------------------------------------------------------------------- tickets out of a slot

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Whether two rectangles overlap (with `gap` points of air). */
export function overlaps(a: Rect, b: Rect, gap = 0): boolean {
  'worklet';
  return a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;
}

/** A ticket's opacity while the boss walks under it (desk2, P8/L4's rest): he is always seen. */
export const TICKET_UNDER_BOSS = 0.4;

/**
 * The opacity a ticket standing at `ticket` takes this frame (a worklet; the ticket is NOT moved): about
 * 40 % while the boss's LIVE screen box overlaps it, 1 otherwise. `boss` null (not on screen): 1.
 */
export function ticketFade(ticket: Rect, boss: Rect | null): number {
  'worklet';
  if (!boss || boss.w <= 0 || boss.h <= 0) return 1;
  return overlaps(ticket, boss) ? TICKET_UNDER_BOSS : 1;
}

/**
 * Where a ticket of w × h goes when it feeds out of a printer slot at (sx, sy) (findings L4, P8, W17; the
 * proof's ticketOutOfSlot): on the side of the slot AWAY from `keep` (the boss's sprite box, the truck's
 * cab), its top a little above the slot, clamped inside the free world and the safe area, never over
 * `keep` and never over `goal` (the goal card at its real height). Tries the away side, then the other
 * side, then above or below `keep`; a ticket that cannot clear `keep` at all stays on the away side.
 */
export function placeFromSlot(sx: number, sy: number, w: number, h: number, keep: Rect | null, goal: Rect | null, L: Pick<HudLayout, 'left' | 'right' | 'freeY' | 'bottomY'>): { x: number; y: number } {
  'worklet';
  const gap = 10;
  const minX = L.left;
  const maxX = Math.max(minX, L.right - w);
  const top = goal ? Math.max(L.freeY + 4, goal.y + goal.h + 4) : L.freeY + 4;
  const maxY = Math.max(L.freeY + 4, L.bottomY - h - 4);
  const clampX = (x: number) => Math.min(maxX, Math.max(minX, x));
  // Below the goal card only where the ticket's columns meet the card's; elsewhere the free world's top.
  const clampY = (x: number, y: number) => {
    const under = goal && x < goal.x + goal.w + 4 && x + w + 4 > goal.x ? top : L.freeY + 4;
    return Math.min(Math.max(maxY, under), Math.max(under, y));
  };
  const away = keep ? (keep.x + keep.w / 2 <= sx ? 1 : -1) : -1;
  const y0 = sy - 14;
  // Beside the slot, and beyond the keep box when the box reaches past the slot on that side.
  const east = keep ? Math.max(sx, keep.x + keep.w) + gap : sx + gap;
  const west = keep ? Math.min(sx, keep.x) - gap - w : sx - gap - w;
  const tries: number[] = away > 0 ? [east, west] : [west, east];
  for (const tx of tries) {
    const x = clampX(tx);
    const y = clampY(x, y0);
    if (!keep || !overlaps({ x, y, w, h }, keep, 4)) return { x, y };
  }
  if (keep) {
    const x = clampX(tries[0]);
    const above = keep.y - h - 6;
    const ya = clampY(x, above);
    if (!overlaps({ x, y: ya, w, h }, keep, 4)) return { x, y: ya };
    const yb = clampY(x, keep.y + keep.h + 6);
    if (!overlaps({ x, y: yb, w, h }, keep, 4)) return { x, y: yb };
  }
  const x = clampX(tries[0]);
  return { x, y: clampY(x, y0) };
}

/** Whether a screen point is inside the window's safe area (a ticket's anchor off screen falls back under the cash counter). */
export function onScreen(x: number, y: number, L: Pick<HudLayout, 'left' | 'right' | 'freeY' | 'bottomY'>): boolean {
  'worklet';
  return x >= L.left && x <= L.right && y >= L.freeY && y <= L.bottomY;
}

/**
 * desk2 (4b): whether a chip that belongs to its printer slot (`offHide`: the crew weigh-in chip at the
 * platform scale) shows with the slot at (x, y) on screen; other tickets always show (they are pinned).
 */
export function slotChipShown(offHide: boolean, x: number, y: number, L: Pick<HudLayout, 'left' | 'right' | 'freeY' | 'bottomY'>): boolean {
  'worklet';
  return !offHide || onScreen(x, y, L);
}

/** The fallback place of a ticket: under the cash counter, below the goal card at its real height. */
export function underCash(w: number, h: number, goal: Rect | null, L: Pick<HudLayout, 'left' | 'right' | 'freeY' | 'bottomY'>): { x: number; y: number } {
  'worklet';
  const y = goal ? goal.y + goal.h + 4 : L.freeY + 4;
  return { x: L.left, y: Math.min(Math.max(L.freeY + 4, L.bottomY - h - 4), y) };
}
