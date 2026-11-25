/**
 * Where everything of the loading picture stands at w x h points (yard-style.md 9): the horizon low,
 * just behind the deck, with the yard's back wall and the far yard's cranes on it (review L11), the gantry crane over the whole width, the weighbridge deck with one
 * red-oxide plate per word of the title, the display on its post right of the plates, and in front the
 * crucible under its hood with the furnace hand at the handwheel, and under its lip a casting table on
 * legs carrying five separate ingot moulds fed by a launder (never one long trough: that read as a
 * progress bar, review L11).
 *
 * The sky, the ground and the crane run full bleed; everything that tells the story (plates, display,
 * ticket, crucible, mould, the furnace hand) stays inside the safe area, at 844 x 390 (47 left and right,
 * 21 below) and 667 x 375 alike. Plates are sized to fit between the deck's west end and the display:
 * a long word gets a wider plate, and a title too long for one row gets smaller letters, never an overlap.
 * Pure numbers (the UI thread's worklets read it).
 */
import { dotWidth, stencilWidth } from '../art/letters';
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
  /** The yard's back wall: its top (the far yard stands on it); it runs down to the horizon. */
  wallTop: number;
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
  /** The gantry's legs: centre x of the west and east A-frames, and their half spread at the rail. */
  legL: number;
  legR: number;
  spread: number;
  /** The display: centre x, box top, width, height; the printer's slot y; the LED cells' left x and top. */
  dX: number;
  dY: number;
  dW: number;
  dH: number;
  slotY: number;
  cellX: number[];
  cellY: number;
  cellSize: number;
  /** The ticket's box when it is fully out, and its print's glyph height (11 points or more, L11). */
  tkX: number;
  tkW: number;
  tkH: number;
  tkPrint: number;
  /** The trolley's x when it is off screen left and when it is parked at its stand. */
  offX: number;
  parkX: number;
  /** Magnet's centre y when up and when its plate stands on the deck. */
  magUpY: number;
  magDownY: number;
  /** The moulds: west and east of their row, their top and height, each mould's west edge and width. */
  mL: number;
  mR: number;
  mY: number;
  mH: number;
  mouldX: number[];
  mouldW: number;
  /** The casting table under the moulds: its top, and the floor its feet stand on. */
  tableY: number;
  footY: number;
  /** The cavities, one in each mould. */
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
  /** The hood: its centre x, its canopy's top and bottom. */
  hoodX: number;
  hoodTop: number;
  hoodBot: number;
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
  const ground = h * 0.6;
  // the horizon just behind the deck; the back wall's top above it (the far yard stands on the wall)
  const horizon = ground - 3 * k;
  const wallTop = horizon - 24 * k;
  const beamY = Math.max(h * 0.13, insets.top + 30 * k + 6);

  // the display on its post at the east end, inside the safe area
  const dW = 112 * k;
  const dH = 66 * k;
  const dY = ground - 118 * k;
  // the gantry's A-frame legs stand near the frame's edges; the display keeps clear of the east one
  const legL = w * 0.025;
  const legR = w * 0.975;
  const spread = 34 * k;
  const legInner = (y: number) => legR - spread + ((ground - y) / (ground - beamY)) * (spread - 5 * k);
  const dX = Math.min(at(0.9), sr - dW / 2 - 8 * k, legInner(dY + dH) - dW / 2 - 8 * k);
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

  // In front, from the deck down: the hood (below the deck's lip, never over a plate), the crucible
  // under it on its stand, its lip at full tilt, the stream falling 16 k into the launder at the mould's
  // back. The crucible tips 95 degrees about its trunnion, so its mouth faces down onto the launder.
  const hoodTop = deckTop + 15 * k;
  const hoodBot = hoodTop + 16 * k;
  const R = 18 * k;
  const sY = hoodBot + 32 * k;
  const tiltDeg = 95;
  const lip: [number, number] = [R + 7 * k, -26 * k];
  const a = (tiltDeg * Math.PI) / 180;
  const lipX0 = Math.cos(a) * lip[0] - Math.sin(a) * lip[1];
  const lipY0 = Math.sin(a) * lip[0] + Math.cos(a) * lip[1];
  // the moulds on a casting table: a mould is mH high, the table 5 k thick on legs 12 k to the floor
  const mH = 15 * k;
  const legs = 5 * k + 12 * k;
  const mY = Math.min(sb - mH - legs, sY + lipY0 + 14 * k);
  const tableY = mY + mH;
  const footY = tableY + legs;
  // the crucible's stand where it always stood; the moulds start just east of its lip at full tilt
  const sX = at(0.3) - 64 * k;
  const lipX = sX + lipX0;
  const CAV = 5;
  const mouldW = 40 * k;
  const mouldGap = 9 * k;
  const mL = lipX + 10 * k;
  const mR = mL + CAV * mouldW + (CAV - 1) * mouldGap;
  const mouldX = Array.from({ length: CAV }, (_, i) => mL + i * (mouldW + mouldGap));
  const cavX = mouldX.map((x0) => x0 + 5 * k);
  // the ticket: three lines of dot-matrix print at 11 points or more ("LOADED", "9,999 KG", "ID OK")
  const tkPrint = Math.max(11, 11 * k);
  const tkW = dotWidth('9,999 KG', tkPrint) + 14 * k;
  const tkH = 3 * tkPrint + 27;
  return {
    w,
    h,
    k,
    sl,
    sr,
    horizon,
    wallTop,
    ground,
    beamY,
    deckL,
    deckR,
    deckTop,
    size,
    plateH,
    plateW,
    plateX,
    legL,
    legR,
    spread,
    dX,
    dY,
    dW,
    dH,
    slotY,
    cellX,
    cellY: dY + 11 * k,
    cellSize,
    tkX: dX - tkW / 2,
    tkW,
    tkH,
    tkPrint,
    offX: -80 * k,
    parkX: Math.max(at(0.1), sl + 40 * k),
    magUpY: beamY + 6 * k + 22 * k,
    magDownY: deckTop - plateH - 22 * k,
    mL,
    mR,
    mY,
    mH,
    mouldX,
    mouldW,
    tableY,
    footY,
    cavX,
    cavW: mouldW - 10 * k,
    cavY: mY + 3 * k,
    cavH: 9 * k,
    lX0: lipX - 6 * k,
    lY: mY - 3 * k,
    sX,
    sY,
    R,
    lip,
    hoodX: sX + 6 * k,
    hoodTop,
    hoodBot,
    hwX: sX - 40 * k,
    hwY: sY + 16 * k,
    manX: sX - 62 * k,
    manY: footY - 2 * k,
    manScale: 1.35 * k,
    tiltDeg,
  };
}
