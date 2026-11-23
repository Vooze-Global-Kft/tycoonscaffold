/**
 * The play canvas's geometry (spec 4.1 to 4.3): where each drawn part of the street sits inside the
 * rectangles of mergeLayout (../layout.ts, the one source of every rectangle), and the hit test.
 *
 * `hitTest(x, y, geo)` resolves a point to the target code of the rules (src/engine/merge types.ts
 * TargetCode: a cell 0 to 55, TARGET_COUNTER + j, TARGET_FESTIVAL, TARGET_BASKET, TARGET_NONE) at
 * the FINGER point (Decision M9). It is a worklet over plain numbers (`HitGeo`), so the UI thread
 * may call it, and the same function is the pure twin the tests and bot-like checks call: there is
 * one hit test, not two that could drift apart.
 *
 * Pure: no React, no Skia.
 */
import { TARGET_BASKET, TARGET_COUNTER, TARGET_FESTIVAL, TARGET_NONE } from '../../../engine/merge';
import { COLS, ROWS, rectToPlay, type MergeLayout, type Rect } from '../layout';

/** A paper ticket is 96 pt tall (4.2) on a column 4 pt wider than it. */
export const TICKET_H = 96;
/** The bust above a ticket is drawn at this share of its atlas size (art README: "about 0.82"), its centre this far above the ticket's top. */
export const BUST_SCALE = 0.82;
export const BUST_LIFT = 6;
/** The counter board's height (art kit drawCounter). */
export const COUNTER_BOARD_H = 10;
/** The floating good is drawn this far above the finger (Decision M9). */
export const FLOAT_LIFT = 40;
/** The floating good is drawn a little larger than a cell, as if lifted. */
export const FLOAT_SCALE = 1.12;
/** Least touch target (AGENTS.md): a stall front 40 pt tall is tapped with slop up to this. */
export const TOUCH_MIN = 44;
/** Tap codes that are not drop targets: a stall front is FRONT_BASE + its chain. */
export const FRONT_BASE = 300;

/** Plain numbers the hit test reads (a worklet cannot read the layout's nested objects cheaply). */
export interface HitGeo {
  /** The board's top left, cell size, columns and rows. */
  bx: number;
  by: number;
  cell: number;
  cols: number;
  rows: number;
  /** The counters' columns (n of them): x of each, and the shared y, width and height. */
  n: number;
  cx: number[];
  cy: number;
  cw: number;
  ch: number;
  /** The Festival banner. */
  fx: number;
  fy: number;
  fw: number;
  fh: number;
  /** The Basket in the bottom row. */
  kx: number;
  ky: number;
  kw: number;
  kh: number;
}

/** The counters shown: the state's count clamped to the layout's 2 to 4. */
export function counterCount(n: number): 2 | 3 | 4 {
  return Math.min(4, Math.max(2, Math.round(n) || 2)) as 2 | 3 | 4;
}

export function hitGeo(L: MergeLayout, counters: number): HitGeo {
  const cols = L.counters[counterCount(counters)];
  // The Basket lies in the bottom row, outside the play canvas, in screen points: brought into the
  // canvas's own (unscaled) points like every other target, so one point system serves the hit test.
  const k = rectToPlay(L, L.basket);
  return {
    bx: L.board.x,
    by: L.board.y,
    cell: L.board.cell,
    cols: COLS,
    rows: ROWS,
    n: cols.length,
    cx: cols.map((r) => r.x),
    cy: cols[0].y,
    cw: cols[0].w,
    ch: cols[0].h,
    fx: L.banner.x,
    fy: L.banner.y,
    fw: L.banner.w,
    fh: L.banner.h,
    kx: k.x,
    ky: k.y,
    kw: k.w,
    kh: k.h,
  };
}

/**
 * The drop target under the point (x, y), in the play canvas's points (the screen's at scale 1;
 * input.ts maps a finger with toPlay): a board
 * cell, a counter's whole column, the Festival banner, the Basket, or TARGET_NONE (the street
 * background, a stall front, a bar, outside). What the cell holds (a good, nothing, a shutter) is
 * the rules' to judge. A worklet; also the pure twin.
 */
export function hitTest(x: number, y: number, g: HitGeo): number {
  'worklet';
  if (x >= g.kx && x < g.kx + g.kw && y >= g.ky && y < g.ky + g.kh) return TARGET_BASKET;
  const col = Math.floor((x - g.bx) / g.cell);
  const row = Math.floor((y - g.by) / g.cell);
  if (x >= g.bx && y >= g.by && col >= 0 && col < g.cols && row >= 0 && row < g.rows) return row * g.cols + col;
  if (y >= g.cy && y < g.cy + g.ch) {
    for (let j = 0; j < g.n; j++) if (x >= g.cx[j] && x < g.cx[j] + g.cw) return TARGET_COUNTER + j;
  }
  if (x >= g.fx && x < g.fx + g.fw && y >= g.fy && y < g.fy + g.fh) return TARGET_FESTIVAL;
  return TARGET_NONE;
}

/** The rectangle a target code covers (the outline drawn under the finger), or null for none. */
export function targetRect(code: number, g: HitGeo): Rect | null {
  'worklet';
  if (code >= 0 && code < g.cols * g.rows) {
    const row = Math.floor(code / g.cols);
    const col = code % g.cols;
    return { x: g.bx + col * g.cell, y: g.by + row * g.cell, w: g.cell, h: g.cell };
  }
  if (code >= TARGET_COUNTER && code < TARGET_COUNTER + g.n) return { x: g.cx[code - TARGET_COUNTER], y: g.cy, w: g.cw, h: g.ch };
  if (code === TARGET_FESTIVAL) return { x: g.fx, y: g.fy, w: g.fw, h: g.fh };
  if (code === TARGET_BASKET) return { x: g.kx, y: g.ky, w: g.kw, h: g.kh };
  return null;
}

/** A tap's thing under the point: a drop target code, else a stall front (FRONT_BASE + c, with slop to 44 pt tall), else TARGET_NONE. Plain JS. */
export function tapTest(x: number, y: number, L: MergeLayout, g: HitGeo): number {
  const code = hitTest(x, y, g);
  if (code !== TARGET_NONE) return code;
  const slop = Math.max(0, (TOUCH_MIN - L.backdrop.h) / 2);
  for (let c = 0; c < L.fronts.length; c++) {
    const r = L.fronts[c];
    const gap = Math.max(0, (TOUCH_MIN - r.w) / 2);
    if (x >= r.x - gap && x < r.x + r.w + gap && y >= r.y - slop && y < r.y + r.h + slop) return FRONT_BASE + c;
  }
  return TARGET_NONE;
}

/** The centre of board cell i. */
export function cellCentre(L: MergeLayout, i: number): { x: number; y: number } {
  const c = L.board.cell;
  return { x: L.board.x + (i % COLS) * c + c / 2, y: L.board.y + Math.floor(i / COLS) * c + c / 2 };
}

/** Where a counter column's parts are drawn: the ticket, the bust's centre above it, the counter board. */
export interface CounterParts {
  ticket: Rect;
  bust: { x: number; y: number; scale: number };
  board: { x: number; y: number; w: number };
}

export function counterParts(r: Rect): CounterParts {
  const tw = r.w - 4;
  const ty = r.y + r.h - TICKET_H - 2;
  return {
    ticket: { x: r.x + 2, y: ty, w: tw, h: TICKET_H },
    bust: { x: r.x + r.w / 2, y: ty - BUST_LIFT, scale: BUST_SCALE },
    board: { x: r.x, y: r.y + r.h - COUNTER_BOARD_H, w: r.w },
  };
}

/** The centre of a rectangle. */
export function centreOf(r: Rect): { x: number; y: number } {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}
