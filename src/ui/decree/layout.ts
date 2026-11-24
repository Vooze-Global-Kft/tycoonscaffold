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

// ================================================================================================
// The desk's own parts (desk package): what the one desk canvas draws inside 4.1's zones, and the
// boxes of its words (the content desk's fit check reads the boxes by name).
// ================================================================================================

/** Font sizes at s = 1 of the desk's small words (× s when drawn): the door glass, the drawer's card, the sticky note, the take-back pill. */
export const DESK_FONT = { glass: 8.5, drawerLabel: 8, sticky: 8, deskSticky: 12, pill: 12, emptyDesk: 14, slip: 13, slipSmall: 11 } as const;
/** Line height of the sticky note's two lines, as a multiple of its font size. */
export const STICKY_LINE = 1.2;
/** The out-tray band's three things, left to right at 375 (4.1 does not size them): the door, the wire tray, the sticky note. */
export const DOOR_W = 140;
export const STICKY_W = 124;
export const BAND_GUTTER = 8;
/** The budget slip (2.7: smaller than a paper), centred on the paper's rectangle. */
export const SLIP_W = 280;
export const SLIP_H = 168;
/** The take-back pill (4.3 "Tap to take it back") at the top of the empty paper rectangle. */
export const PILL_H = 44;
export const PILL_W = 240;
/** The big sticky note on an empty desk. */
export const DESK_STICKY_W = 260;
export const DESK_STICKY_H = 92;

export interface DeskParts {
  /** The door with its glass (top left of the out-tray band) and the glass's words box ("Next visitor 0:07"). */
  door: Rect;
  glass: Rect;
  /** The wire out-tray (signed papers stack here; the take-back rest lies on it). */
  outTray: Rect;
  /** The sticky note (right of the out-tray band) and its two-line words box. */
  sticky: Rect;
  stickyText: Rect;
  /** The drawer FOR FURTHER STUDY (the paper's width, the drawer band) and its card's words box. */
  drawer: Rect;
  drawerLabel: Rect;
  /** The in-tray stack (the bottom row's in-tray slot: drawn by the desk, tapped through the bottom row). */
  inTray: Rect;
  /** The budget slip, centred on the paper's rectangle. */
  slip: Rect;
  /** The take-back pill at the top of the paper's rectangle while a signed paper rests. */
  pill: Rect;
  /** The big sticky note on an empty desk (the next goal), and its words box (two lines at deskSticky × s). */
  deskSticky: Rect;
  deskStickyText: Rect;
  /** Font sizes at this s. */
  font: { [K in keyof typeof DESK_FONT]: number };
}

/** The drawer card's box inside a drawer front `dw` × `h` (the art kit's drawerLabelBox, repeated here so this file stays pure of Skia). */
export function drawerCard(dw: number, h: number): Rect {
  const lw = Math.min(200, dw * 0.58);
  const lh = Math.max(12, Math.min(18, h * 0.42));
  return { x: Math.round((dw - lw) / 2 - dw * 0.06), y: Math.round((h - lh) / 2), w: Math.round(lw), h: Math.round(lh) };
}

/** The door glass's box inside a door `w` × `h` (the art kit's doorGlassBox). */
export function doorGlass(w: number, h: number): Rect {
  const m = Math.max(3, Math.round(h * 0.16));
  return { x: m + 1, y: m, w: w - 2 * m - 2, h: h - 2 * m };
}

/** The desk's parts for a layout (pure); `s` the text scale (the layout's own by default). */
export function deskParts(L: DeskLayout, s: number = L.s): DeskParts {
  const band = L.outTray;
  const left = band.x + BAND_GUTTER;
  const right = band.x + band.w - BAND_GUTTER;
  const bh = Math.max(20, band.h - 6);
  const by = band.y + Math.round((band.h - bh) / 2);
  const doorW = Math.min(DOOR_W, Math.round(band.w * 0.38));
  const door = { x: left, y: by, w: doorW, h: bh };
  const g = doorGlass(doorW, bh);
  const glass = { x: door.x + g.x, y: door.y + g.y, w: g.w, h: g.h };
  const stickyW = Math.min(STICKY_W, Math.round(band.w * 0.33));
  const sticky = { x: right - stickyW, y: band.y + 1, w: stickyW, h: band.h - 2 };
  const stickyText = { x: sticky.x + 6, y: sticky.y + 5, w: sticky.w - 14, h: sticky.h - 7 };
  const trayX = door.x + door.w + BAND_GUTTER;
  const outTray = { x: trayX, y: band.y + 1, w: Math.max(40, sticky.x - BAND_GUTTER - trayX), h: band.h - 2 };
  const drawer = { x: L.paper.x, y: L.drawer.y, w: L.paper.w, h: L.drawer.h };
  const c = drawerCard(drawer.w, drawer.h);
  const drawerLabel = { x: drawer.x + c.x, y: drawer.y + c.y, w: c.w, h: c.h };
  const slip = { x: L.paper.x + Math.round((L.paper.w - SLIP_W) / 2), y: L.paper.y + Math.round((L.paper.h - SLIP_H) / 2), w: SLIP_W, h: SLIP_H };
  const pill = { x: L.paper.x + Math.round((L.paper.w - PILL_W) / 2), y: L.paper.y + 12, w: PILL_W, h: PILL_H };
  const deskSticky = { x: L.paper.x + Math.round((L.paper.w - DESK_STICKY_W) / 2), y: L.paper.y + Math.round(L.paper.h * 0.5), w: DESK_STICKY_W, h: DESK_STICKY_H };
  const deskStickyText = { x: deskSticky.x + 12, y: deskSticky.y + 16, w: deskSticky.w - 26, h: deskSticky.h - 22 };
  const font = Object.fromEntries(Object.entries(DESK_FONT).map(([k, v]) => [k, v * s])) as DeskParts['font'];
  return { door, glass, outTray, sticky, stickyText, drawer, drawerLabel, inTray: L.buttons.inTray, slip, pill, deskSticky, deskStickyText, font };
}
