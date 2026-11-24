/**
 * The bars' text metrics (spec 4.1 "Text at s"; AGENTS.md, the fixed-height rule): every font in the
 * top bar, the club strip, the term ribbon, the goal line and the bottom row is sized here by hand
 * from s = min(fontScale, 1.3) (the text itself has allowFontScaling={false}), in rows whose heights
 * add up inside their zone of deskLayout (src/ui/decree/layout.ts), with no negative margins. The
 * treasury (a rolling text field) gets a box height, never a lineHeight, and shares the rate's
 * baseline by placing both boxes (`topBarMetrics`).
 *
 * Widths are measured with the content desk's glyph table (scripts/content/office/fit.ts: SF Pro Text
 * advances, a 10 % safety margin, bold × 1.06), copied here because the app never imports a script;
 * metrics.test.ts checks the copy against fit.ts. A text that would not fit at its wanted size is set
 * smaller (never wrapped, never cut): `fitFont`. The term ribbon picks one of its two fixed forms by
 * width (`ribbonForm`); the goal line the first of the rules' forms that fits 34 characters and the
 * width (`goalForm`).
 *
 * Pure: no React, no react-native. Owned by the bars package (BARS). Tested in metrics.test.ts.
 */
import { FONT_SCALE_MAX, type Rect } from '../layout';

// ----------------------------------------------------------------------------- widths

/** SF Pro Text advances as fractions of the font size (the content desk's table, fit.ts). */
const ADV: Record<string, number> = {
  ' ': 0.27,
  a: 0.55, b: 0.6, c: 0.54, d: 0.6, e: 0.56, f: 0.34, g: 0.6, h: 0.59, i: 0.25, j: 0.25, k: 0.53, l: 0.25, m: 0.89,
  n: 0.59, o: 0.59, p: 0.6, q: 0.6, r: 0.37, s: 0.51, t: 0.35, u: 0.59, v: 0.53, w: 0.79, x: 0.52, y: 0.53, z: 0.52,
  A: 0.67, B: 0.65, C: 0.7, D: 0.71, E: 0.58, F: 0.56, G: 0.73, H: 0.73, I: 0.27, J: 0.51, K: 0.65, L: 0.55, M: 0.87,
  N: 0.73, O: 0.76, P: 0.62, Q: 0.76, R: 0.64, S: 0.61, T: 0.61, U: 0.72, V: 0.67, W: 0.97, X: 0.65, Y: 0.64, Z: 0.62,
  '0': 0.62, '1': 0.62, '2': 0.62, '3': 0.62, '4': 0.62, '5': 0.62, '6': 0.62, '7': 0.62, '8': 0.62, '9': 0.62,
  '.': 0.27, ',': 0.27, ':': 0.29, ';': 0.29, '!': 0.29, '?': 0.5, "'": 0.22, '"': 0.4, '’': 0.22, '‘': 0.22,
  '“': 0.4, '”': 0.4, '-': 0.38, '–': 0.55, '—': 1.0, '−': 0.62, '(': 0.35, ')': 0.35,
  '[': 0.35, ']': 0.35, '{': 0.35, '}': 0.35, '&': 0.69, '/': 0.38, '·': 0.27, '→': 0.8, '↑': 0.6,
  '↓': 0.6, '↩': 0.8, '×': 0.6, '%': 0.87, '+': 0.62, '=': 0.62, '#': 0.62, '@': 0.95, '*': 0.45,
  '…': 0.85, '£': 0.62, $: 0.62, _: 0.5, '<': 0.62, '>': 0.62, '|': 0.27, '~': 0.62,
};
const DEFAULT_ADVANCE = 0.65;
/** Safety margin on every width until calibrated on a phone (4.2). */
export const SAFETY = 1.1;
/** Bold rows are about 6 % wider (fit.ts BOLD_FACTOR). */
export const BOLD = 1.06;

/** The width of `text` at `font` pt, with the safety margin (and the bold factor). */
export function textW(text: string, font: number, bold = false): number {
  let em = 0;
  for (const ch of text) {
    const hit = ADV[ch];
    if (hit !== undefined) em += hit;
    else {
      const base = ch.normalize('NFD').charAt(0);
      em += ADV[base] ?? DEFAULT_ADVANCE;
    }
  }
  return Math.ceil(em * font * SAFETY * (bold ? BOLD : 1));
}

/** The scale text is drawn at: s = min(fontScale, 1.3) (4.1), never below 0.8. */
export function scaleOf(fontScale: number): number {
  return Math.max(0.8, Math.min(FONT_SCALE_MAX, Number.isFinite(fontScale) && fontScale > 0 ? fontScale : 1));
}

/** A line box for a font: the system face's line is about 1.2 em (a text centred in it keeps its baseline at centre + 0.355 em). */
export const LINE_EM = 1.2;
export const boxOf = (font: number) => Math.ceil(font * LINE_EM);
/** Where a centred line's baseline sits below the box's centre, in em (SF: ascent 0.95, descent 0.24). */
export const BASELINE_EM = 0.355;

/** The largest font up to `want` at which `text` fits `width` (one decimal), at least `min`. */
export function fitFont(text: string, want: number, width: number, bold = false, min = want * 0.7): number {
  const per = textW(text, 100, bold) / 100;
  if (per <= 0) return want;
  const fit = Math.floor((width / per) * 10) / 10;
  return Math.max(min, Math.min(want, fit));
}

const r1 = (x: number) => Math.round(x * 10) / 10;

// ----------------------------------------------------------------------------- the top bar (40 / 44)

export interface TopBarMetrics {
  s: number;
  /** The treasury's box (a rolling text field: a box height, no lineHeight) and the rate's, both from the bar's top. */
  cashFont: number;
  cashBox: number;
  cashTop: number;
  cashW: number;
  rateFont: number;
  rateBox: number;
  rateTop: number;
  rateW: number;
  /** The approval chip's font and its box (the chip is the layout's rect, centred). */
  chipFont: number;
  chipBox: number;
  chipTop: number;
  /** The gossip chip: the newspaper icon and the count. */
  gossipIcon: number;
  gossipFont: number;
  menuIcon: number;
}

/** Room between the treasury and its rate. */
export const RATE_GAP = 4;
/** Inner padding of the approval and gossip chips. */
export const CHIP_PAD = 4;
/** The approval and gossip chips' height inside the bar. */
export const CHIP_H = 26;

/**
 * The top bar of height `h` (4.1: treasury 15 × s on a 24 line, rate and chips 12 × s) for its parts'
 * rects (`layout.bar`), the treasury's current text `cash` (digits as shown; its shape is what
 * matters), the rate's `rate`, the chip's `chip` and the gossip count `gossip`. The treasury and its
 * rate share one baseline: each is centred in its own box, and the rate's box is moved down by
 * 0.355 × (cash font − rate font). When both would not fit the treasury's 156 pt they are set
 * smaller together.
 */
export function topBarMetrics(h: number, bar: { treasury: Rect; approval: Rect; gossip: Rect; menu: Rect }, fontScale: number, cash: string, rate: string, chip: string, gossip: string): TopBarMetrics {
  const s = scaleOf(fontScale);
  let cashFont = r1(15 * s);
  let rateFont = r1(12 * s);
  const want = textW(cash, cashFont, true) + RATE_GAP + textW(rate, rateFont, true);
  if (want > bar.treasury.w) {
    const k = bar.treasury.w / want;
    cashFont = Math.floor(cashFont * k * 10) / 10;
    rateFont = Math.floor(rateFont * k * 10) / 10;
  }
  const cashBox = Math.min(h - 4, boxOf(cashFont));
  const rateBox = boxOf(rateFont);
  const cashTop = Math.floor((h - cashBox) / 2);
  const rateTop = Math.round(cashTop + cashBox / 2 + BASELINE_EM * (cashFont - rateFont) - rateBox / 2);
  const cashW = textW(cash, cashFont, true);
  const rateW = textW(rate, rateFont, true);
  const chipBox = Math.min(CHIP_H, h - 6);
  const chipTop = Math.floor((h - chipBox) / 2);
  const chipFont = fitFont(chip, r1(12 * s), bar.approval.w - 2 * CHIP_PAD, true);
  const gossipIcon = Math.min(18, chipBox - 6);
  const gossipFont = fitFont(gossip, r1(12 * s), bar.gossip.w - 2 * CHIP_PAD - gossipIcon - 2, true);
  return { s, cashFont, cashBox, cashTop, cashW, rateFont, rateBox, rateTop, rateW, chipFont, chipBox, chipTop, gossipIcon, gossipFont, menuIcon: 20 };
}

// ----------------------------------------------------------------------------- the club strip (32 / 40)

export interface ClubSlot {
  /** The badge, centred in its rect. */
  icon: Rect;
  /** Where the number shows: beside the icon with three clubs (always), else over the icon's lower half for 2 s. */
  num: Rect;
}

export interface ClubStripMetrics {
  s: number;
  icon: number;
  numFont: number;
  /** True with three clubs: the numbers are always shown, beside the icons. */
  beside: boolean;
  slots: ClubSlot[];
}

/** The club icon (4.1: 32). */
export const CLUB_ICON = 32;
/** The gap between clubs (4.1: 6); with three clubs, between an icon-and-number group and the next. */
export const CLUB_GAP = 6;
export const CLUB_GROUP_GAP = 16;

/**
 * The club strip of `n` clubs in the zone `zone` (from the strip's own top left): icons of 32 with a
 * thin mood ring, centred (7 × 32 + 6 × 6 = 260, 4.1). With three clubs each icon has its number
 * beside it, always; with five or seven the number shows over the icon for 2 s on a change or a tap.
 * The number's text is at most "100" (and a preview's "100" in the same box).
 */
export function clubStripMetrics(zone: { w: number; h: number }, n: number, fontScale: number): ClubStripMetrics {
  const s = scaleOf(fontScale);
  const icon = Math.min(CLUB_ICON, zone.h);
  const top = Math.floor((zone.h - icon) / 2);
  const beside = n <= 3;
  const numW = textW('100', r1(11 * s), true) + 6;
  const numFont = beside ? r1(11 * s) : fitFont('100', r1(11 * s), icon - 2, true);
  const numH = Math.min(zone.h, boxOf(numFont) + 2);
  const slots: ClubSlot[] = [];
  if (beside) {
    const group = icon + 3 + numW;
    const total = n * group + (n - 1) * CLUB_GROUP_GAP;
    const x0 = Math.round((zone.w - total) / 2);
    for (let i = 0; i < n; i++) {
      const x = x0 + i * (group + CLUB_GROUP_GAP);
      slots.push({ icon: { x, y: top, w: icon, h: icon }, num: { x: x + icon + 3, y: Math.floor((zone.h - numH) / 2), w: numW, h: numH } });
    }
  } else {
    const total = n * icon + (n - 1) * CLUB_GAP;
    const x0 = Math.round((zone.w - total) / 2);
    for (let i = 0; i < n; i++) {
      const x = x0 + i * (icon + CLUB_GAP);
      slots.push({ icon: { x, y: top, w: icon, h: icon }, num: { x: x - 2, y: top + icon - numH, w: icon + 4, h: numH } });
    }
  }
  return { s, icon, numFont, beside, slots };
}

// ----------------------------------------------------------------------------- the term ribbon (18 / 20)

/** The ribbon's side gutters. */
export const RIBBON_GUTTER = 10;

export interface RibbonMetrics {
  form: 'long' | 'short';
  font: number;
  box: number;
  top: number;
  /** The text shown (the chosen form). */
  text: string;
  width: number;
}

/**
 * The term ribbon (4.1: 11 × s on an 18 / 20 line) in its two fixed forms: the long one only where it
 * fits the ribbon's width less its gutters, else the short one; never wrapped or cut (the short form
 * is set smaller only if even it would not fit, which the tests rule out for every office).
 */
export function ribbonForm(zone: { w: number; h: number }, fontScale: number, long: string, short: string): RibbonMetrics {
  const s = scaleOf(fontScale);
  const want = r1(11 * s);
  const room = zone.w - 2 * RIBBON_GUTTER;
  const useLong = textW(long, want, true) <= room;
  const text = useLong ? long : short;
  const font = fitFont(text, want, room, true);
  const box = Math.min(zone.h, boxOf(font));
  return { form: useLong ? 'long' : 'short', font, box, top: Math.floor((zone.h - box) / 2), text, width: textW(text, font, true) };
}

// ----------------------------------------------------------------------------- the goal line (20 / 22)

/** The goal line's character limit (2.16, the validator's lint). */
export const GOAL_MAX_CHARS = 34;
export const GOAL_GUTTER = 12;
/** The goal line's "Watch ad" button: its width; its hit slop makes it 44 tall. */
export const GOAL_BUTTON_W = 84;

export interface GoalMetrics {
  font: number;
  box: number;
  top: number;
  text: string;
  /** The words' room (the line less its gutters and the button). */
  room: number;
  buttonFont: number;
}

/**
 * The goal line (4.1: 12 × s on a 20 / 22 line): the first of `forms` (the rules' advice in words,
 * longest first) that keeps to 34 characters and fits the room beside the button (`button` false:
 * the whole line); if none fits, the last form, set smaller. `buttonLabel` is the button's word.
 */
export function goalForm(zone: { w: number; h: number }, fontScale: number, forms: readonly string[], button: string | null): GoalMetrics {
  const s = scaleOf(fontScale);
  const want = r1(12 * s);
  const room = zone.w - 2 * GOAL_GUTTER - (button ? GOAL_BUTTON_W + 6 : 0);
  const ok = forms.find((f) => f.length <= GOAL_MAX_CHARS && textW(f, want) <= room);
  const text = ok ?? forms[forms.length - 1] ?? '';
  const font = ok ? want : fitFont(text, want, room, false, want * 0.6);
  const box = Math.min(zone.h, boxOf(font));
  const buttonFont = button ? fitFont(button, r1(11 * s), GOAL_BUTTON_W - 8, true) : 0;
  return { font, box, top: Math.floor((zone.h - box) / 2), text, room, buttonFont };
}

// ----------------------------------------------------------------------------- the bottom row (60 / 64)

/** A bottom-row button's inset from the row's top and bottom edges. */
export const ROW_INSET = 6;

export interface ButtonMetrics {
  /** The button's height inside the row (the row less its insets). */
  h: number;
  iconSize: number;
  iconTop: number;
  labelFont: number;
  labelBox: number;
  labelTop: number;
  badgeFont: number;
  badgeBox: number;
}

/**
 * A bottom-row button in a row of height `rowH` (4.1: 60 / 64, labels 11 × s): an icon over its label,
 * rows adding up to the button's height. Every label of the row shares one font (the one the longest
 * fits in `w`, the narrowest button), so every label sits on one baseline. `badges` are the texts a
 * badge may show (the in-tray's count, the Poll's record in the short ribbon form).
 */
export function buttonMetrics(rowH: number, w: number, fontScale: number, labels: readonly string[], badges: readonly string[] = []): ButtonMetrics {
  const s = scaleOf(fontScale);
  const h = rowH - 2 * ROW_INSET;
  const widest = labels.reduce((a, l) => (textW(l, 100, true) > textW(a, 100, true) ? l : a), '');
  const labelFont = fitFont(widest, r1(11 * s), w - 4, true, 8);
  const labelBox = boxOf(labelFont);
  const iconSize = Math.min(28, h - labelBox - 6);
  const iconTop = Math.max(2, Math.floor((h - labelBox - iconSize - 2) / 2));
  const labelTop = iconTop + iconSize + 2;
  const longestBadge = badges.reduce((a, b) => (textW(b, 100, true) > textW(a, 100, true) ? b : a), '');
  const badgeFont = longestBadge ? fitFont(longestBadge, r1(9.5 * s), w - 8, true, 7) : r1(9.5 * s);
  const badgeBox = boxOf(badgeFont);
  return { h, iconSize, iconTop, labelFont, labelBox, labelTop, badgeFont, badgeBox };
}

/** The hit slop that makes a control of `w` × `h` at least 44 × 44 (half the shortfall each side). */
export function slopTo44(w: number, h: number): { top: number; bottom: number; left: number; right: number } {
  const v = Math.max(0, Math.ceil((44 - h) / 2));
  const x = Math.max(0, Math.ceil((44 - w) / 2));
  return { top: v, bottom: v, left: x, right: x };
}

// ----------------------------------------------------------------------------- the sheets

/** The sheets' type sizes at s (sheets scroll, so their rows may wrap; only their buttons and headers are fixed). */
export function sheetType(fontScale: number) {
  const s = scaleOf(fontScale);
  return { s, title: r1(18 * s), body: r1(14 * s), small: r1(12 * s), tiny: r1(11 * s), big: r1(17 * s) };
}
