/**
 * The play canvas's still layers (spec 4.2), each recorded ONCE per change of what it shows (art
 * README "Per frame": the street, the rail, the banner and the tickets are pictures re-recorded on
 * a state change, never per frame). Sprites are copied from the art kit's atlases with
 * drawImageRect; the few drawings that carry a figure or a word (a ticket, a shutter's tag, the
 * shelf badge) use the kit's draw functions while recording. Every word comes from the caller
 * (strings.ts and game.json), every figure from the rules.
 *
 * All coordinates are the screen's points (mergeLayout's rectangles). Pure Skia, no React.
 */
import { FilterMode, MipmapMode, Skia, type SkCanvas, type SkPaint, type SkPicture } from '@shopify/react-native-skia';
import { customerSprite, goodSprite, minderHeadSprite, stallSprite, type MergeAtlas } from '../art/atlas';
import { drawShelfBadge, drawGearRail, RAIL_H } from '../art/gear.draw';
import { drawGood, drawTierPip, GOOD_BOX, tierPipWidth } from '../art/goods.draw';
import { drawLetters, lettersWidth } from '../art/letters';
import { NIGHT, alpha } from '../art/palette';
import { INK, at, fill, glow, picture, rrect, stroke } from '../art/pen';
import { STALL_BADGE, STALL_H, STALL_MINDER, STALL_PIP, STALL_TILL, STALL_W, type Awning } from '../art/stalls.draw';
import { bannerGrid, drawBoardBase, drawCounter, drawFestivalBanner, drawNewTag, drawStreet, drawTargetOutline, drawTick, drawTicket, ticketLayout } from '../art/street.draw';
import { COLS, ROWS, type MergeLayout, type Rect } from '../layout';
import type { PlayAtlases } from './atlases';
import { cellCentre, counterParts, FLOAT_SCALE } from './geometry';

const DESIGN = GOOD_BOX * 2;

// ----------------------------------------------------------------------------- helpers

const paints = new Map<number, SkPaint>();
function alphaPaint(a: number): SkPaint {
  const key = Math.round(a * 100);
  let p = paints.get(key);
  if (!p) {
    p = Skia.Paint();
    p.setAntiAlias(true);
    p.setAlphaf(key / 100);
    paints.set(key, p);
  }
  return p;
}

/** Copies sprite `id` of `a` with its anchor at (x, y), at `size` × its design size. */
export function blit(c: SkCanvas, a: MergeAtlas, id: string, x: number, y: number, size = 1, opacity = 1): void {
  const s = a.sprites[id];
  if (!s) return;
  const k = size / a.density;
  c.drawImageRectOptions(a.image, s.rect, { x: x - s.ax * k, y: y - s.ay * k, width: s.rect.width * k, height: s.rect.height * k }, FilterMode.Linear, MipmapMode.None, alphaPaint(opacity));
}

/** The largest cap height (≤ max) at which `text` fits `w` points. */
export function fitSize(text: string, w: number, max: number, weight = 0.2): number {
  const at1 = lettersWidth(text, 1, weight);
  return at1 > 0 ? Math.min(max, w / at1) : max;
}

/** The paper-cut letters cover capitals, figures and a few signs: an ellipsis is drawn as three stops. */
export function letterText(s: string): string {
  return s.replace(/…/g, '...').toUpperCase();
}

const R = (x: number, y: number, w: number, h: number) => ({ x, y, w, h });

// ----------------------------------------------------------------------------- the backdrop

/**
 * The still backdrop: the dusk behind the whole canvas, the street (sky, rooftops, wire, lane), the
 * board's tray and the gear rail along its top edge with a notch at each open stall's anchor column.
 */
export function backdropPicture(L: MergeLayout, railCols: number[], lanternsLit: number): SkPicture {
  return picture(R(0, 0, L.width, L.height), (c) => {
    c.drawRect({ x: 0, y: 0, width: L.width, height: L.height }, fill(NIGHT.indigo));
    const st = L.street;
    const lanterns = Math.max(3, Math.round(st.w / 48));
    // The street reaches down to the board (the 390 pt phone's spare above the board is street, 4.1).
    const sh = Math.max(st.h, L.board.y - st.y);
    at(c, st.x, st.y, 1, 0, (q) => drawStreet(q, st.w, sh, { band: L.backdrop.h, lanterns, lit: Math.min(lanterns, Math.max(1, lanternsLit + 1)) }));
    const b = L.board;
    at(c, b.x, b.y, 1, 0, (q) => drawBoardBase(q, COLS, ROWS, b.cell));
    const slots = railCols.map((col) => (col + 0.5) * b.cell);
    at(c, b.x, b.y - RAIL_H / 2 + 1, 1, 0, (q) => drawGearRail(q, b.w, slots, slots.map(() => false)));
  });
}

// ----------------------------------------------------------------------------- the stall fronts

export interface FrontVM {
  open: boolean;
  awning: Awning;
  silk: boolean;
  minder: boolean;
  /** The till's fill 0..4 (5.4: it rises silently between rolls). */
  till: number;
  shelf: number;
  waiting: boolean;
}

export function frontsPicture(L: MergeLayout, A: PlayAtlases | null, fronts: FrontVM[]): SkPicture {
  return picture(R(L.backdrop.x, L.backdrop.y, L.backdrop.w, L.backdrop.h + 6), (c) => {
    if (!A) return;
    fronts.forEach((f, ch) => {
      const r = L.fronts[ch];
      if (!r) return;
      const s = r.w / STALL_W;
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h - (STALL_H * s) / 2;
      blit(c, A.stalls, stallSprite(ch, f.awning, f.silk, !f.open), cx, cy, s);
      if (!f.open) return;
      if (f.minder) {
        blit(c, A.fx, minderHeadSprite(ch), cx + STALL_MINDER.x * s, cy + STALL_MINDER.y * s, s);
        blit(c, A.fx, `till-${Math.max(0, Math.min(4, f.till))}`, cx + STALL_TILL.x * s, cy + STALL_TILL.y * s, 0.8 * s);
      }
      if (f.shelf > 0) at(c, cx + STALL_BADGE.x * s, cy + STALL_BADGE.y * s, s, 0, (q) => drawShelfBadge(q, f.shelf));
      if (f.waiting) blit(c, A.fx, 'waiting', cx + STALL_PIP.x * s, cy + STALL_PIP.y * s, s);
    });
  });
}

// ----------------------------------------------------------------------------- the Festival banner and counter boards

export interface BannerVM {
  lines: { c: number; k: number; filled: boolean }[];
  /** The line icons show once the Steamer is open (4.2); before, one lantern and the count. */
  showLines: boolean;
  lit: boolean;
  count: string;
}

/** The counter boards under the ticket columns. */
export function boardsPicture(L: MergeLayout, columns: Rect[]): SkPicture {
  return picture(R(0, L.street.y, L.width, Math.max(L.street.h, L.board.y - L.street.y) + 4), (c) => {
    for (const r of columns) {
      const p = counterParts(r);
      at(c, p.board.x, p.board.y, 1, 0, (q) => drawCounter(q, p.board.w));
    }
  });
}

export function bannerPicture(L: MergeLayout, A: PlayAtlases | null, v: BannerVM): SkPicture {
  const bn = L.banner;
  return picture(R(bn.x - 4, bn.y - 4, bn.w + 8, bn.h + 8), (c) => {
    at(c, bn.x, bn.y, 1, 0, (q) => drawFestivalBanner(q, bn.w, bn.h, { lit: v.lit }));
    const grid = bannerGrid(bn.w, bn.h);
    if (!v.showLines || !A) {
      const size = fitSize(v.count, bn.w - 12, 11);
      drawLetters(c, v.count, bn.x + bn.w / 2, bn.y + bn.h * 0.5, { size, color: NIGHT.paperLight, align: 'center', style: 'paper', weight: 0.2, seed: 5 });
      return;
    }
    v.lines.slice(0, grid.length).forEach((l, i) => {
      const g = grid[i];
      const x = bn.x + g.x + g.size / 2;
      const y = bn.y + g.y + g.size / 2;
      // The good without its own pip (at 22 pt its dots were 1.6 pt), with a small pip of four and
      // the rest laid over its lower edge (the same plates as a ticket's).
      drawPicAt(c, goodNoPip(l.c, l.k), x, y - 2, g.size / DESIGN, l.filled ? 0.55 : 1);
      const ps = 0.62;
      const pw = tierPipWidth(Math.min(4, l.k)) * ps;
      const py = y + g.size / 2 - (l.k > 4 ? PIP_PLATE_H * ps + 0.5 : (PIP_PLATE_H * ps) / 2) - 0.5;
      drawSmallPip(c, l.k, x - pw / 2, py, ps);
      if (l.filled) at(c, x + g.size * 0.28, y + g.size * 0.22, 1, 0, (q) => drawTick(q, 9));
    });
  });
}

// ----------------------------------------------------------------------------- busts and tickets

export interface TicketVM {
  /** 'ticket' with lines, 'setup' ("Setting up…", 2.7 step 4), or 'empty'. */
  kind: 'ticket' | 'setup' | 'empty';
  gold: boolean;
  lines: { c: number; k: number; filled: boolean; stretch: boolean }[];
  price: string;
  species: string;
  coat: number;
}

export const EMPTY_TICKET: TicketVM = { kind: 'empty', gold: false, lines: [], price: '', species: '', coat: 0 };

/** The customer (or the paper dragon) above counter column r. */
export function bustPicture(r: Rect, A: PlayAtlases | null, v: TicketVM): SkPicture {
  const p = counterParts(r);
  return picture(R(r.x - 8, r.y - 30, r.w + 16, r.h + 30), (c) => {
    if (!A || v.kind !== 'ticket') return;
    blit(c, A.animals, v.gold ? 'dragon' : customerSprite(v.species, v.coat), p.bust.x, p.bust.y, p.bust.scale);
  });
}

const pipless = new Map<string, SkPicture>();
/** A good without its tier pip, centred, 48 pt (a ticket row puts the pip beside it): recorded once per good. */
function goodNoPip(c: number, k: number): SkPicture {
  const key = `${c}:${k}`;
  let p = pipless.get(key);
  if (!p) {
    p = picture(R(-26, -26, 52, 52), (q) => drawGood(q, c, k, { pip: false }));
    pipless.set(key, p);
  }
  return p;
}

function drawPicAt(c: SkCanvas, pic: SkPicture, x: number, y: number, s: number, opacity = 1): void {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  if (opacity < 1) c.saveLayer(alphaPaint(opacity));
  c.drawPicture(pic);
  if (opacity < 1) c.restore();
  c.restore();
}

/** The height of the art kit's pip plate at scale 1 (goods.draw.ts PIP_H). */
const PIP_PLATE_H = 6.4;

/**
 * A tier pip for a small icon, its left edge at `left`, centred on `cy`: up to four dots in one
 * plate, the same plate as the goods'; for tiers 5 to 8 the first four on a plate and the rest on a
 * second plate under it, so "four and two" is seen without counting (the review could not tell a
 * tier 6 from a tier 7 in a run of 2.5 pt dots). Returns the width used.
 */
export function drawSmallPip(c: SkCanvas, k: number, left: number, cy: number, scale: number): number {
  if (k <= 4) {
    const w = tierPipWidth(k) * scale;
    drawTierPip(c, k, left + w / 2, cy, scale);
    return w;
  }
  const gap = 1;
  const h = PIP_PLATE_H * scale;
  const w4 = tierPipWidth(4) * scale;
  const wn = tierPipWidth(k - 4) * scale;
  drawTierPip(c, 4, left + w4 / 2, cy - (h + gap) / 2, scale);
  drawTierPip(c, k - 4, left + wn / 2, cy + (h + gap) / 2, scale);
  return w4;
}

/** A ticket's rows: the icon of each line (24 pt), its tier pip, a tick when filled, NEW on a stretch line; the price in its box. */
export function drawTicketBody(c: SkCanvas, t: Rect, v: TicketVM, newWord: string): void {
  at(c, t.x, t.y, 1, 0, (q) => drawTicket(q, t.w, t.h, { gold: v.gold, rows: Math.max(1, v.lines.length) }));
  const TL = ticketLayout(t.w, t.h);
  v.lines.slice(0, 3).forEach((l, i) => {
    const row = TL.rows[i];
    const ix = t.x + row.x + 13;
    const iy = t.y + row.y + row.h / 2;
    drawPicAt(c, goodNoPip(l.c, l.k), ix, iy, 24 / DESIGN, l.filled ? 0.45 : 1);
    // The pip at the goods' own size (scale 1, dots of 3.5 pt; it was 0.72), in the room right of the icon.
    const room = row.w - 27;
    drawSmallPip(c, l.k, t.x + row.x + 27, iy, Math.min(1, room / tierPipWidth(Math.min(4, l.k))));
    if (l.filled) at(c, ix + 7, iy + 4, 1, 0, (q) => drawTick(q, 10));
    else if (l.stretch) {
      at(c, ix - 5, t.y + row.y + 3, 0.78, 0, (q) => drawNewTag(q));
      drawLetters(c, newWord, ix - 3.4, t.y + row.y + 1.3, { size: 3.4, color: NIGHT.ink, align: 'center', weight: 0.26 });
    }
  });
  const p = TL.price;
  const size = fitSize(v.price, p.w - 6, 8, 0.22);
  drawLetters(c, v.price, t.x + p.x + p.w / 2, t.y + p.y + (p.h - size) / 2, { size, color: NIGHT.ink, align: 'center', weight: 0.22 });
}

/** Counter column r's ticket, or "Setting up…", or nothing. */
export function ticketPicture(r: Rect, v: TicketVM, words: { settingUp: string; newLine: string }): SkPicture {
  const p = counterParts(r);
  const t = p.ticket;
  return picture(R(t.x - 4, t.y - 6, t.w + 8, t.h + 10), (c) => {
    if (v.kind === 'ticket') drawTicketBody(c, t, v, letterText(words.newLine));
    else if (v.kind === 'setup') {
      const parts = letterText(words.settingUp).split(' ');
      const size = Math.min(...parts.map((w) => fitSize(w, t.w - 8, 8)));
      const top = t.y + t.h / 2 - (parts.length * size * 1.6) / 2;
      parts.forEach((w, i) => drawLetters(c, w, t.x + t.w / 2, top + i * size * 1.6, { size, color: NIGHT.paperShade, align: 'center', weight: 0.2 }));
    }
  });
}

/** The highlight laid over a ticket's line rows while it shakes (a wrong good, 2.5: "its lines highlighted"). */
export function ticketLitPicture(r: Rect, lines: number): SkPicture {
  const t = counterParts(r).ticket;
  const TL = ticketLayout(t.w, t.h);
  return picture(R(t.x, t.y, t.w, t.h), (c) => {
    for (let i = 0; i < Math.min(3, lines); i++) {
      const row = TL.rows[i];
      c.drawPath(rrect(t.x + row.x, t.y + row.y + 1, row.w, row.h - 2, 4), fill(alpha(NIGHT.amber, 0.28)));
      c.drawPath(rrect(t.x + row.x, t.y + row.y + 1, row.w, row.h - 2, 4), stroke(alpha(NIGHT.amberDeep, 0.9), 1.2));
    }
  });
}

// ----------------------------------------------------------------------------- the board

export type CellKind = 'open' | 'shutter' | 'next' | 'gateTop' | 'gateBottom' | 'brazier';

export interface ShutterTag {
  cell: number;
  /** The group's condition holds: the tag shows the shutter glyph and the price alone. */
  allowed: boolean;
  /** The price (only when allowed). */
  price: string;
  /** While the condition does not hold: its words ("After" "Steamer", or "Make" over `good`). */
  lines: string[];
  /** A tier condition: the good to make, drawn with its own pips (never "Grill 3"). */
  good: { c: number; k: number } | null;
}

/** The board's cells: tiles, shutters (the next of each group with its paper tag), the season's blocks. */
export function cellsPicture(L: MergeLayout, A: PlayAtlases | null, kinds: CellKind[], tags: ShutterTag[]): SkPicture {
  const b = L.board;
  return picture(R(b.x, b.y, b.w, b.h), (c) => {
    if (!A) return;
    const s = b.cell / DESIGN;
    kinds.forEach((k, i) => {
      const { x, y } = cellCentre(L, i);
      const id = k === 'open' ? 'cell' : k === 'shutter' ? 'shutter' : k === 'next' ? 'shutter-next' : k === 'gateTop' ? 'block-gate-top' : k === 'gateBottom' ? 'block-gate-bottom' : 'block-brazier';
      if (k === 'gateTop' || k === 'gateBottom' || k === 'brazier') blit(c, A.items, 'cell', x, y, s);
      blit(c, A.items, id, x, y, s);
    });
    for (const t of tags) drawShutterTag(c, L, A, t);
  });
}

/**
 * The next shutter's paper tag, fitted to the cell. While its condition does not hold: the
 * condition alone ("AFTER / STEAMER", or "MAKE" over the good's icon and pips), in soft ink, no
 * price. Once it holds: the shutter glyph and the price, in amber.
 */
function drawShutterTag(c: SkCanvas, L: MergeLayout, A: PlayAtlases, t: ShutterTag): void {
  const cell = L.board.cell;
  const { x, y } = cellCentre(L, t.cell);
  const w = cell * 0.86;
  const h = cell * 0.66;
  c.drawPath(rrect(x - w / 2 + 0.8, y - h / 2 + 1.2, w, h, 3), fill(alpha(INK, 0.45)));
  c.drawPath(rrect(x - w / 2, y - h / 2, w, h, 3), fill(NIGHT.paperLight));
  c.drawPath(rrect(x - w / 2, y - h / 2, w, h, 3), stroke(t.allowed ? NIGHT.brass : NIGHT.paperEdge, 1));
  const textW = w - 5;
  if (t.allowed) {
    // The shutter glyph, then the price on one line.
    const glyph = h * 0.62;
    const priceSize = fitSize(t.price, textW - glyph - 2, cell * 0.17, 0.24);
    const pw = lettersWidth(t.price, priceSize, 0.24);
    const left = x - (glyph + 2 + pw) / 2;
    blit(c, A.items, 'shutter', left + glyph / 2, y, glyph / DESIGN);
    drawLetters(c, t.price, left + glyph + 2, y - priceSize / 2, { size: priceSize, color: NIGHT.amberDeep, align: 'left', weight: 0.24 });
    return;
  }
  const lines = t.lines.map(letterText);
  const condSize = Math.min(...lines.map((l) => fitSize(l, textW, cell * 0.13, 0.2)));
  const gap = condSize * 0.45;
  if (t.good) {
    // "MAKE" over the good itself, with its tier pips (the pips are the good's own, as on the board).
    const icon = h - condSize - gap - 4;
    const top = y - h / 2 + 2;
    drawLetters(c, lines[0] ?? '', x, top, { size: condSize, color: NIGHT.inkSoft, align: 'center', weight: 0.2 });
    blit(c, A.items, goodSprite(t.good.c, t.good.k), x, top + condSize + gap + icon / 2, icon / DESIGN);
    return;
  }
  const total = lines.length * condSize + (lines.length - 1) * gap;
  let ty = y - total / 2;
  for (const l of lines) {
    drawLetters(c, l, x, ty, { size: condSize, color: NIGHT.inkSoft, align: 'center', weight: 0.2 });
    ty += condSize + gap;
  }
}

/** The goods on the board, but not the cells in `hidden` (a good being dragged, flying or rising). */
export function goodsPicture(L: MergeLayout, A: PlayAtlases | null, board: readonly unknown[], hidden: ReadonlySet<number>): SkPicture {
  const b = L.board;
  return picture(R(b.x - 4, b.y - 4, b.w + 8, b.h + 8), (c) => {
    if (!A) return;
    const s = b.cell / DESIGN;
    board.forEach((cell, i) => {
      if (!cell || typeof cell !== 'object' || hidden.has(i)) return;
      const g = cell as { c: number; k: number };
      const { x, y } = cellCentre(L, i);
      blit(c, A.items, goodSprite(g.c, g.k), x, y, s);
    });
  });
}

/** What would take the held good (4.2 "matches glow"): cells, counters, the banner; and the armed ring. */
export function glowPicture(L: MergeLayout, A: PlayAtlases | null, cells: number[], columns: Rect[], banner: boolean): SkPicture {
  return picture(R(0, L.street.y - 10, L.width, L.board.y + L.board.h - L.street.y + 20), (c) => {
    if (!A) return;
    const s = L.board.cell / DESIGN;
    for (const i of cells) {
      const { x, y } = cellCentre(L, i);
      blit(c, A.fx, 'match', x, y, s);
    }
    const ring = (r: Rect) => {
      glow(c, r.x + r.w / 2, r.y + r.h / 2, Math.max(r.w, r.h) * 0.6, NIGHT.amber, 0.35);
      c.drawPath(rrect(r.x + 1, r.y + 1, r.w - 2, r.h - 2, 6), stroke(alpha(NIGHT.amberSoft, 0.95), 2));
    };
    for (const r of columns) ring(counterParts(r).ticket);
    if (banner) ring(L.banner);
  });
}

export function armedPicture(L: MergeLayout, A: PlayAtlases | null, cell: number | null): SkPicture {
  return picture(R(L.board.x - 8, L.board.y - 8, L.board.w + 16, L.board.h + 16), (c) => {
    if (!A || cell === null) return;
    const { x, y } = cellCentre(L, cell);
    blit(c, A.fx, 'armed', x, y, L.board.cell / DESIGN);
  });
}

// ----------------------------------------------------------------------------- drag pieces

/** The outline drawn under the finger, centred on the origin, for a w × h target. */
export function outlinePicture(w: number, h: number): SkPicture {
  return picture(R(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8), (c) => drawTargetOutline(c, w, h));
}

/** The good lifted by the finger, centred on the origin, a little larger than a cell, with a soft shadow under it. */
export function floatingPicture(A: PlayAtlases, c: number, k: number, cell: number): SkPicture {
  const size = (cell / DESIGN) * FLOAT_SCALE;
  return picture(R(-cell, -cell, cell * 2, cell * 2.2), (q) => {
    q.drawOval({ x: -cell * 0.36, y: cell * 0.34, width: cell * 0.72, height: cell * 0.2 }, fill(alpha(INK, 0.35)));
    blit(q, A.items, goodSprite(c, k), 0, 0, size);
  });
}

/** A paid ticket as it was when its last line landed (the FILLED stamp falls on it, then it folds). */
export function paidTicketPicture(r: Rect, v: TicketVM, newWord: string): SkPicture {
  const t = counterParts(r).ticket;
  return picture(R(t.x - 4, t.y - 6, t.w + 8, t.h + 10), (c) => drawTicketBody(c, t, v, letterText(newWord)));
}
