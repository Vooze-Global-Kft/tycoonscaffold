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
 * | Cash | 136 | 116 |  Ladder chip | 408 | 340 |  Carry | 90 | 90 |  Clipboard | 44 | 44 |  Gaps | 3 × 24 | 3 × 15 |
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
  const cash = compact ? 116 : 136;
  const carry = 90;
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
      const twoPt = Math.floor(Math.min(want, w / (best * CHAR_EM), h / (2 * LINE_EM)) * 2) / 2;
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
  const rows = Math.min(3, Math.max(0, gradeRows));
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
export function placeTicket(ax: number, ay: number, w: number, h: number, L: HudLayout): { x: number; y: number } {
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

/** The § coin's diameter. */
export function coinSize(s: number): number {
  return Math.round(16 * Math.min(s, 1.15));
}
