/**
 * The desk screen's fixed zones (spec 4.1): every rectangle of the main screen comes from the pure
 * `deskLayout(width, height, insets, fontScale)`, so the desk canvas, the flick's responder (only
 * inside the paper's rectangle, 4.3), the bars and the hints agree to the point.
 *
 * Top to bottom: top inset, top bar, club strip, term ribbon, out-tray band, the paper, drawer band,
 * goal line, bottom row, bottom inset. Two size classes by the height between the insets:
 * - compact (under 700 pt, the 375 × 667 phone): top bar 40, club strip 32, ribbon 18, goal line 20,
 *   bottom row 60;
 * - regular (the 390 × 844 phone): 44, 40, 20, 22, 64.
 * What is left goes to the paper, at most PAPER_MAX (461) tall, and the two bands share the rest
 * equally (at least BAND_MIN, 36, each): 36 / 405 / 36 at 375 × 667 (20/0), 56 / 461 / 56 at
 * 390 × 844 (47/34). The zones do not change with the font scale (4.1's table): text is sized inside
 * them at s = min(fontScale, 1.3) (paperMetrics.ts for the paper, the bars package for the bars).
 * Widths (4.1): the paper 343 (inner 315) centred; the top bar's treasury 156, approval 86, gossip 48,
 * menu 40 with even gaps; the club strip's icons 32 with 6 between, centred; the bottom row's in-tray
 * 72 and Ledger, Cabinet, Poll and Office 64 each, the spare width as equal gaps and gutters.
 *
 * Written by the skeleton exactly as 4.1; owned afterwards by the desk package P6
 * (docs/design/office-build-plan.md). Pure: no React, no react-native.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Insets {
  top: number;
  bottom: number;
  left?: number;
  right?: number;
}

export interface DeskLayout {
  width: number;
  height: number;
  insets: Insets;
  /** s = min(fontScale, 1.3): the scale text is drawn at (allowFontScaling={false}). */
  s: number;
  compact: boolean;
  topBar: Rect;
  clubStrip: Rect;
  ribbon: Rect;
  outTray: Rect;
  paper: Rect;
  drawer: Rect;
  goalLine: Rect;
  bottomRow: Rect;
  /** The top bar's parts: treasury (amount and rate), approval chip, gossip chip, menu. */
  bar: { treasury: Rect; approval: Rect; gossip: Rect; menu: Rect };
  /** The club strip's icon slots for `n` clubs (3, 5 or 7), centred. */
  clubs: (n: number) => Rect[];
  /** The bottom row: the in-tray, then Ledger, Cabinet, Poll, Office. */
  buttons: { inTray: Rect; ledger: Rect; cabinet: Rect; poll: Rect; office: Rect };
}

export const FONT_SCALE_MAX = 1.3;
export const COMPACT_BELOW = 700;
export const ZONES = {
  compact: { topBar: 40, clubStrip: 32, ribbon: 18, goalLine: 20, bottomRow: 60 },
  regular: { topBar: 44, clubStrip: 40, ribbon: 20, goalLine: 22, bottomRow: 64 },
} as const;
export const PAPER_MAX = 461;
export const BAND_MIN = 36;
export const PAPER_W = 343;
export const PAPER_INNER_W = 315;
export const CLUB_ICON = 32;
export const CLUB_GAP = 6;
export const BAR_PARTS = { treasury: 156, approval: 86, gossip: 48, menu: 40 } as const;
export const IN_TRAY_W = 72;
export const BUTTON_W = 64;

/** The desk screen's zones for a window of `width` × `height` with safe-area `insets` (4.1). */
export function deskLayout(width: number, height: number, insets: Insets, fontScale: number): DeskLayout {
  const s = Math.min(fontScale > 0 ? fontScale : 1, FONT_SCALE_MAX);
  const between = height - insets.top - insets.bottom;
  const compact = between < COMPACT_BELOW;
  const z = compact ? ZONES.compact : ZONES.regular;
  const rest = between - z.topBar - z.clubStrip - z.ribbon - z.goalLine - z.bottomRow;
  const paperH = Math.max(0, Math.min(PAPER_MAX, rest - 2 * BAND_MIN));
  const bandTotal = rest - paperH;
  const bandTop = Math.floor(bandTotal / 2);
  const bandBottom = bandTotal - bandTop;
  const left = insets.left ?? 0;
  const w = width - left - (insets.right ?? 0);
  let y = insets.top;
  const row = (h: number): Rect => {
    const r = { x: left, y, w, h };
    y += h;
    return r;
  };
  const topBar = row(z.topBar);
  const clubStrip = row(z.clubStrip);
  const ribbon = row(z.ribbon);
  const outTray = row(bandTop);
  const paperRow = row(paperH);
  const drawer = row(bandBottom);
  const goalLine = row(z.goalLine);
  const bottomRow = row(z.bottomRow);
  const paperW = Math.min(PAPER_W, w);
  const paper: Rect = { x: left + Math.round((w - paperW) / 2), y: paperRow.y, w: paperW, h: paperH };

  // Fixed widths laid out with the spare width as equal gaps and gutters.
  const spread = (r: Rect, widths: number[]): Rect[] => {
    const gap = Math.max(0, (r.w - widths.reduce((a, b) => a + b, 0)) / (widths.length + 1));
    let x = r.x + gap;
    return widths.map((wd) => {
      const out = { x, y: r.y, w: wd, h: r.h };
      x += wd + gap;
      return out;
    });
  };
  const [treasury, approval, gossip, menu] = spread(topBar, [BAR_PARTS.treasury, BAR_PARTS.approval, BAR_PARTS.gossip, BAR_PARTS.menu]);
  const [inTray, ledger, cabinet, poll, office] = spread(bottomRow, [IN_TRAY_W, BUTTON_W, BUTTON_W, BUTTON_W, BUTTON_W]);
  const clubs = (n: number): Rect[] => {
    const total = n * CLUB_ICON + (n - 1) * CLUB_GAP;
    const x0 = clubStrip.x + Math.round((clubStrip.w - total) / 2);
    const top = clubStrip.y + Math.round((clubStrip.h - CLUB_ICON) / 2);
    return Array.from({ length: n }, (_, i) => ({ x: x0 + i * (CLUB_ICON + CLUB_GAP), y: top, w: CLUB_ICON, h: CLUB_ICON }));
  };
  return { width, height, insets, s, compact, topBar, clubStrip, ribbon, outTray, paper, drawer, goalLine, bottomRow, bar: { treasury, approval, gossip, menu }, clubs, buttons: { inTray, ledger, cabinet, poll, office } };
}
