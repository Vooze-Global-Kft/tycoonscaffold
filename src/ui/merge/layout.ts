/**
 * The merge screen's fixed zones (spec 4.1): every rectangle of the main screen comes from the pure
 * `mergeLayout(width, height, insets, fontScale)`, so the play canvas, the bars, the hit test
 * (a worklet reading these plain numbers, spec 4.3) and the hints agree to the point.
 *
 * Top to bottom: top inset, top bar 40, goal line 20, street 156 (190 with spare room), spare above
 * the board, the board 8 cells tall (7 wide), spare below, the bottom row 48, bottom inset.
 * - cell = min(64, floor((W − 32)/7), floor((H − insets − 108 − 156)/8));
 * - a spare of 34 or more grows the street to 190 and the rest is split around the board (above gets
 *   the floor half); a smaller spare stays below the board; the spare above is drawn as street (the
 *   banner and the counters stand on the board's edge, the sky opens above them);
 * - overflow: cells shrink first, to a 44 pt floor; then the street, to 140; then (never expected)
 *   the play canvas scales (`scale` < 1: everything inside street and board is drawn scaled about
 *   the play area's top left, and the hit test divides by it).
 * The Pocket variants are left out (Decision M5). The bars' text is sized by hand from `fontScale`
 * in hud/barMetrics.ts (the bars package); the zones here do not change with it (4.1's table).
 *
 * Written by the skeleton; owned afterwards by the play canvas package (docs/design/market-build-plan.md).
 * Pure: no React, no react-native.
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

export interface MergeLayout {
  width: number;
  height: number;
  insets: Insets;
  fontScale: number;
  topBar: Rect;
  goalLine: Rect;
  street: Rect;
  spareAbove: number;
  board: Rect & { cell: number };
  spareBelow: number;
  bottomRow: Rect;
  /** The play canvas (street and board, one Skia canvas) and the scale of what is drawn in it (1 unless the overflow rule's last step ran). */
  play: Rect & { scale: number };
  /** Street parts: the backdrop band of stall fronts (0 to 40 of the street), six fronts, the Festival banner and the counters' columns for 2, 3 and 4 counters (each column is the drop rectangle). */
  backdrop: Rect;
  fronts: Rect[];
  banner: Rect;
  counters: Record<2 | 3 | 4, Rect[]>;
  /** The bottom row: the Basket and the Book, Lanterns, Season and Shop buttons, in that order. */
  basket: Rect;
  buttons: Rect[];
}

export const TOP_BAR = 40;
export const GOAL_LINE = 20;
export const BOTTOM_ROW = 48;
export const BARS = TOP_BAR + GOAL_LINE + BOTTOM_ROW;
export const STREET = 156;
export const STREET_TALL = 190;
export const STREET_MIN = 140;
export const CELL_MAX = 64;
export const CELL_MIN = 44;
export const COLS = 7;
export const ROWS = 8;
/** Board gutters: 16 each side (the W − 32 of the cell rule). */
export const BOARD_GUTTER = 16;
/** The street's horizontal parts (4.1, 4.2). */
export const STREET_GUTTER = 10;
export const BACKDROP = 40;
export const BANNER_W = 52;
export const STREET_GAP = 4;
export const COUNTER_W = 68;
export const COUNTER_W_WIDE = 72;
export const FRONT_MIN = 52;
export const FRONT_MAX = 60;
/** The bottom row (4.2): the Basket 68, four buttons of 64, gaps 4, gutters 10. */
export const BASKET_W = 68;
export const BUTTON_W = 64;
export const ROW_GAP = 4;
export const ROW_GUTTER = 10;

const rect = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

/** The counters' width: 72 when four of 72 fit (376 pt with the banner and gutters), else 68, else what fits. */
function counterWidth(W: number): number {
  const fixed = 2 * STREET_GUTTER + BANNER_W + STREET_GAP + 3 * STREET_GAP;
  if (fixed + 4 * COUNTER_W_WIDE <= W) return COUNTER_W_WIDE;
  if (fixed + 4 * COUNTER_W <= W) return COUNTER_W;
  return Math.max(1, Math.floor((W - fixed) / 4));
}

export function mergeLayout(width: number, height: number, insets: Insets, fontScale = 1): MergeLayout {
  const W = Math.max(1, width);
  const H = Math.max(1, height);
  const top = Math.max(0, insets.top);
  const bottom = Math.max(0, insets.bottom);
  const avail = H - top - bottom - BARS;

  let cell = Math.min(CELL_MAX, Math.floor((W - 2 * BOARD_GUTTER) / COLS), Math.floor((avail - STREET) / ROWS));
  let street = STREET;
  let scale = 1;
  if (cell < CELL_MIN) {
    // Overflow: cells to their floor first, then the street down to 140, then scale the play canvas.
    cell = CELL_MIN;
    street = Math.max(STREET_MIN, Math.min(STREET, avail - ROWS * cell));
    const need = street + ROWS * cell;
    const fitsW = COLS * cell + 2 * BOARD_GUTTER <= W;
    if (need > avail || !fitsW) scale = Math.max(0.1, Math.min(avail / need, W / (COLS * cell + 2 * BOARD_GUTTER)));
  }
  const boardH = ROWS * cell;
  let spare = Math.max(0, avail - (street + boardH) * scale);
  let spareAbove = 0;
  if (scale === 1 && spare >= STREET_TALL - STREET && street === STREET) {
    street = STREET_TALL;
    spare -= STREET_TALL - STREET;
    spareAbove = Math.floor(spare / 2);
  }
  const spareBelow = spare - spareAbove;

  const topBar = rect(0, top, W, TOP_BAR);
  const goalLine = rect(0, top + TOP_BAR, W, GOAL_LINE);
  const playY = top + TOP_BAR + GOAL_LINE;
  const playH = (street + spareAbove / scale + boardH) * scale;
  const play = { ...rect(0, playY, W, playH), scale };
  // Inside the play canvas, in unscaled points from its top left.
  const streetR = rect(0, playY, W / scale, street);
  const boardW = COLS * cell;
  const board = { ...rect(Math.round((W / scale - boardW) / 2), playY + street + spareAbove / scale, boardW, boardH), cell };
  const bottomRow = rect(0, H - bottom - BOTTOM_ROW, W, BOTTOM_ROW);

  const backdrop = rect(0, streetR.y, streetR.w, BACKDROP);
  const frontW = Math.max(1, Math.min(FRONT_MAX, Math.floor((streetR.w - 2 * STREET_GUTTER - 5 * STREET_GAP) / 6)));
  const frontsW = 6 * frontW + 5 * STREET_GAP;
  const frontsX = Math.round((streetR.w - frontsW) / 2);
  const fronts = Array.from({ length: 6 }, (_, i) => rect(frontsX + i * (frontW + STREET_GAP), streetR.y, frontW, BACKDROP));
  // The street sits on the board: the spare above the board (390 pt phones) opens between the stall
  // fronts and the customers, so the banner and the tickets stand on the board's edge with no empty
  // band under them; each counter's column (its drop rectangle) reaches up through that spare.
  const lowerY = streetR.y + BACKDROP;
  const lowerH = street - BACKDROP;
  const sitY = lowerY + spareAbove / scale;
  const banner = rect(STREET_GUTTER, sitY, BANNER_W, lowerH);
  const cw = counterWidth(streetR.w);
  const areaX = STREET_GUTTER + BANNER_W + STREET_GAP;
  const areaW = streetR.w - areaX - STREET_GUTTER;
  const columns = (n: number) => {
    const total = n * cw + (n - 1) * STREET_GAP;
    const x0 = areaX + Math.max(0, Math.round((areaW - total) / 2));
    return Array.from({ length: n }, (_, i) => rect(x0 + i * (cw + STREET_GAP), lowerY, cw, lowerH + spareAbove / scale));
  };
  const counters = { 2: columns(2), 3: columns(3), 4: columns(4) };

  const rowW = BASKET_W + 4 * BUTTON_W + 4 * ROW_GAP;
  const rowX = Math.max(ROW_GUTTER, Math.round((W - rowW) / 2));
  const basket = rect(rowX, bottomRow.y, BASKET_W, BOTTOM_ROW);
  const buttons = Array.from({ length: 4 }, (_, i) => rect(rowX + BASKET_W + ROW_GAP + i * (BUTTON_W + ROW_GAP), bottomRow.y, BUTTON_W, BOTTOM_ROW));

  return { width: W, height: H, insets: { ...insets }, fontScale, topBar, goalLine, street: streetR, spareAbove, board, spareBelow, bottomRow, play, backdrop, fronts, banner, counters, basket, buttons };
}

/** The board cell's rectangle (cell i = row × 7 + col), in the play canvas's unscaled points. */
export function cellRect(l: MergeLayout, i: number): Rect {
  const row = Math.floor(i / COLS);
  const col = i % COLS;
  return rect(l.board.x + col * l.board.cell, l.board.y + row * l.board.cell, l.board.cell, l.board.cell);
}
