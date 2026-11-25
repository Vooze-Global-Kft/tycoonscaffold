/**
 * Where everything of the loading picture stands at w x h points (yard-style.md 9): the horizon at
 * 56 % with the far yard on it, the gantry crane over the whole width, the weighbridge deck with one
 * red-oxide plate per word of the title, the display on its post right of the plates, and in front the
 * crucible under its hood with the furnace hand at the handwheel, the launder and the five cavities.
 *
 * The sky, the ground and the crane run full bleed; everything that tells the story (plates, display,
 * ticket, crucible, mould, the furnace hand) stays inside the safe area, at 844 x 390 (47 left and right,
 * 21 below) and 667 x 375 alike. Plates are sized to fit between the deck's west end and the display:
 * a long word gets a wider plate, and a title too long for one row gets smaller letters, never an overlap.
 * Pure numbers (the UI thread's worklets read it).
 */
import { stencilWidth } from '../art/letters';
import { MAX_PLATES } from './timeline';

export interface Insets {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

export interface LoadingLayout {
  w: number;
  h: number;
  /** Scale against the 844 x 390 key frames (by the safe width and the height). */
  k: number;
  /** The safe area's left and right. */
  sl: number;
  sr: number;
  horizon: number;
  ground: number;
  beamY: number;
  deckL: number;
  deckR: number;
  /** The deck's top: plates stand on it. */
  deckTop: number;
  /** Cap height of the plates' letters. */
  size: number;
  plateH: number;
  plateW: number[];
  plateX: number[];
  /** The display: centre x, box top, width, height; the printer's slot y; the LED cells' left x and top. */
  dX: number;
  dY: number;
  dW: number;
  dH: number;
  slotY: number;
  cellX: number[];
  cellY: number;
  cellSize: number;
  /** The ticket's box when it is fully out. */
  tkX: number;
  tkW: number;
  tkH: number;
  /** The trolley's x when it is off screen left and when it is parked at its stand. */
  offX: number;
  parkX: number;
  /** Magnet's centre y when up and when its plate stands on the deck. */
  magUpY: number;
  magDownY: number;
  /** The mould: west and east of the cavity row, its top, the cavities. */
  mL: number;
  mR: number;
  mY: number;
  cavX: number[];
  cavW: number;
  cavY: number;
  cavH: number;
  /** The launder: from its head (under the crucible's lip at full tilt) along the mould's back. */
  lX0: number;
  lY: number;
  /** The crucible's trunnion (its pivot), its radius and the lip in its own frame. */
  sX: number;
  sY: number;
  R: number;
  lip: [number, number];
  /** The handwheel's centre. */
  hwX: number;
  hwY: number;
  /** The furnace hand's feet. */
  manX: number;
  manY: number;
  manScale: number;
  /** The crucible's tilt at full pour, degrees. */
  tiltDeg: number;
}

/** Stencil tracking on the plates, points. */
export const TRACK = 3;

/** The title as plate words: upper case, at most MAX_PLATES (further words share the last plate). */
export function titleWords(title: string): string[] {
  const words = title
    .toUpperCase()
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!words.length) return ['YARD'];
  if (words.length <= MAX_PLATES) return words;
  return [...words.slice(0, MAX_PLATES - 1), words.slice(MAX_PLATES - 1).join(' ')];
}

/** A plate's width for its word at this letter size (the margins grow with the letters). */
export function plateWidth(word: string, size: number): number {
  return Math.max(size * 1.9, stencilWidth(word, size, TRACK) + size * 0.9);
}

export function loadingLayout(w: number, h: number, insets: Insets, words: readonly string[]): LoadingLayout {
  const sl = Math.max(0, insets.left);
  const sr = w - Math.max(0, insets.right);
  const sw = Math.max(1, sr - sl);
  const sb = h - Math.max(0, insets.bottom);
  const k = Math.min(sw / 750, h / 390, 1.6);
  const at = (f: number) => sl + sw * f;
  const horizon = h * 0.56;
  const ground = h * 0.6;
  const beamY = Math.max(h * 0.13, insets.top + 30 * k + 6);

  // the display on its post at the east end, inside the safe area
  const dW = 112 * k;
  const dH = 66 * k;
  const dX = Math.min(at(0.9), sr - dW / 2 - 8 * k);
  const dY = ground - 118 * k;
  const slotY = dY + dH - 12 * k;
  const cellSize = 25 * k;
  const cellRight = dX + dW / 2 - 14 * k;
  // four cells "8,888": three after the thousands' thin gap
  const cell = cellSize * 0.68;
  const gap = cellSize * 0.12;
  const x3 = cellRight - cellSize * 0.56;
  const cellX = [x3 - 3 * cell - gap, x3 - 2 * cell, x3 - cell, x3];

  // the deck, and the plates on it between its west end and the display
  const deckL = at(0.05);
  const deckR = dX - dW / 2 - 4 * k;
  const deckTop = ground - k;
  const rowL = deckL + 14 * k;
  const rowR = dX - dW / 2 - 14 * k;
  const gapX = 14 * k;
  let size = 42 * k;
  const n = Math.max(1, Math.min(MAX_PLATES, words.length));
  const ws = words.slice(0, n);
  const fit = (s: number) => ws.reduce((a, wd) => a + plateWidth(wd, s), 0) + gapX * (n - 1);
  const avail = rowR - rowL;
  if (fit(size) > avail) size = (size * avail) / fit(size);
  // the width is near-linear in the size: one more pass for the gaps
  while (fit(size) > avail && size > 8) size *= 0.98;
  const plateW = ws.map((wd) => plateWidth(wd, size));
  const total = fit(size);
  let x = rowL + (avail - total) / 2;
  const plateX: number[] = [];
  for (const pw of plateW) {
    plateX.push(x + pw / 2);
    x += pw + gapX;
  }
  const plateH = size * 1.75;

  // the mould in front: the launder runs along its back from the crucible's lip
  const mY = Math.min(h * 0.8, sb - 46 * k);
  const mL = at(0.3);
  const mR = at(0.74);
  const CAV = 5;
  const cavW = (mR - mL) / CAV;
  const cavX = Array.from({ length: CAV }, (_, i) => mL + i * cavW + 5 * k);
  // the crucible on its tilting stand west of the mould, under its hood; the furnace hand west of it
  const R = 18 * k;
  const sX = mL - 64 * k;
  const sY = mY - 30 * k;
  const tiltDeg = 55;
  const lip: [number, number] = [R + 7 * k, -26 * k];
  const a = (tiltDeg * Math.PI) / 180;
  const lipX = sX + Math.cos(a) * lip[0] - Math.sin(a) * lip[1];
  return {
    w,
    h,
    k,
    sl,
    sr,
    horizon,
    ground,
    beamY,
    deckL,
    deckR,
    deckTop,
    size,
    plateH,
    plateW,
    plateX,
    dX,
    dY,
    dW,
    dH,
    slotY,
    cellX,
    cellY: dY + 11 * k,
    cellSize,
    tkX: dX - 27 * k,
    tkW: 54 * k,
    tkH: 58 * k,
    offX: -80 * k,
    parkX: Math.max(at(0.1), sl + 40 * k),
    magUpY: beamY + 6 * k + 22 * k,
    magDownY: deckTop - plateH - 22 * k,
    mL,
    mR,
    mY,
    cavX,
    cavW: cavW - 10 * k,
    cavY: mY + 8 * k,
    cavH: 13 * k,
    lX0: lipX - 6 * k,
    lY: mY + 2 * k,
    sX,
    sY,
    R,
    lip,
    hwX: sX - 40 * k,
    hwY: sY + 16 * k,
    manX: sX - 62 * k,
    manY: mY + 24 * k,
    manScale: 1.35 * k,
    tiltDeg,
  };
}
