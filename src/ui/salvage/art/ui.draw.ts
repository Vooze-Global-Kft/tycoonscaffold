/**
 * The interface's drawn objects (yard-style.md "Interface"): ticket-paper chips with ink edges and a
 * hard drop, the weighbridge ticket (the game's signature object), the goal card, the stick, the one
 * button and the padlock chip. Sizes in points, top-left anchored unless said. Running words are the
 * caller's and come through a TextFn (the phone's system font in the app; the renderers pass Inter, its
 * closest open stand-in); the ticket needs no font (dot-matrix print and stencil, ./letters.ts).
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { METAL, YARD, shade } from './palette';
import { dotMatrix, dotWidth, stencil } from './letters';
import { builder, circle, fill, oval, poly, rrect, segment, stroke, ticks } from './pen';

export type Weight = 'regular' | 'semibold' | 'bold' | 'heavy';
/** Draws `text` with its baseline at y; returns its width. */
export type TextFn = (c: SkCanvas, text: string, x: number, y: number, o: { size: number; weight?: Weight; color?: string; align?: 'left' | 'center' | 'right'; measure?: boolean }) => number;

/** Type sizes of the interface, points (yard-style.md "Type"). */
export const TYPE = { cash: 15, chip: 12, chipSmall: 11, card: 13, goal: 12, button: 13, ticket: 7, ticketTotal: 9 } as const;

const INK = YARD.ink;

/** A paper chip: rounded, ink edge, a hard ink drop 2 pt below (no blur). */
export function chip(c: SkCanvas, x: number, y: number, w: number, h: number, o: { color?: string; r?: number; drop?: boolean } = {}): void {
  const r = o.r ?? Math.min(8, h / 2);
  if (o.drop !== false) c.drawPath(rrect(x, y + 2, w, h, r), fill(INK, 0.28));
  c.drawPath(rrect(x, y, w, h, r), fill(o.color ?? YARD.paper));
  c.drawPath(rrect(x, y, w, h, r), stroke(INK, 1.3));
}

/** The § coin: a hi-vis disc with an ink §-like double stroke (drawn, no font). */
export function scripCoin(c: SkCanvas, cx: number, cy: number, r: number): void {
  c.drawPath(circle(cx, cy, r), fill(YARD.hivis));
  c.drawPath(circle(cx, cy, r), stroke(INK, 1.2));
  const k = r / 8;
  const s = builder()
    .moveTo(cx + 3 * k, cy - 4.6 * k)
    .cubicTo(cx + 1 * k, cy - 6.2 * k, cx - 3.8 * k, cy - 5.6 * k, cx - 3.2 * k, cy - 2.8 * k)
    .cubicTo(cx - 2.6 * k, cy - 0.4 * k, cx + 3.4 * k, cy - 0.6 * k, cx + 3.2 * k, cy + 2.4 * k)
    .cubicTo(cx + 3 * k, cy + 5.6 * k, cx - 2 * k, cy + 6 * k, cx - 3.4 * k, cy + 4.4 * k)
    .build();
  c.drawPath(s, stroke(INK, 1.6 * k + 0.4));
  c.drawPath(segment(cx, cy - 7 * k, cx, cy + 7 * k), stroke(INK, 1.1 * k + 0.3));
}

/** The cash chip: coin and amount (15 pt bold). */
export function cashChip(c: SkCanvas, T: TextFn, x: number, y: number, w: number, h: number, amount: string): void {
  chip(c, x, y, w, h);
  scripCoin(c, x + h / 2 + 1, y + h / 2, h * 0.32);
  T(c, amount, x + h + 2, y + h / 2 + TYPE.cash * 0.36, { size: TYPE.cash, weight: 'heavy', color: INK });
}

/**
 * The ladder chip: an ink rank badge ("25th"), "of 26 · next <rival>" and the gap, with a copper bar of
 * progress to the next rival along its foot.
 */
export function ladderChip(c: SkCanvas, T: TextFn, x: number, y: number, w: number, h: number, o: { rank: string; of: string; next: string; gap: string; progress: number }): void {
  chip(c, x, y, w, h);
  const bw = 40;
  c.drawPath(rrect(x + 4, y + 4, bw, h - 8, 5), fill(INK));
  T(c, o.rank, x + 4 + bw / 2, y + h / 2 + 4.3, { size: TYPE.chip, weight: 'heavy', color: YARD.hivis, align: 'center' });
  // a small ladder glyph
  const lx = x + bw + 12;
  const ly = y + 7;
  const lh = h - 16;
  c.drawPath(segment(lx, ly, lx, ly + lh), stroke(INK, 1.4));
  c.drawPath(segment(lx + 6, ly, lx + 6, ly + lh), stroke(INK, 1.4));
  for (let i = 1; i < 4; i++) c.drawPath(segment(lx, ly + (lh * i) / 4, lx + 6, ly + (lh * i) / 4), stroke(INK, 1.2));
  // the long form when it fits, else without "of N"
  const gapW = T(c, o.gap, 0, 0, { size: TYPE.chip, weight: 'heavy', measure: true });
  const room = x + w - 9 - gapW - 8 - (lx + 13);
  const long = `${o.of} · next ${o.next}`;
  const words = T(c, long, 0, 0, { size: TYPE.chip, weight: 'semibold', measure: true }) <= room ? long : `next ${o.next}`;
  T(c, words, lx + 13, y + h / 2 + 2, { size: TYPE.chip, weight: 'semibold', color: INK });
  T(c, o.gap, x + w - 9, y + h / 2 + 2, { size: TYPE.chip, weight: 'heavy', color: YARD.copperDark, align: 'right' });
  const px = lx + 13;
  const pw = x + w - 9 - px;
  c.drawPath(rrect(px, y + h - 8, pw, 3.5, 1.75), fill(YARD.paperShade));
  c.drawPath(rrect(px, y + h - 8, Math.max(3.5, pw * o.progress), 3.5, 1.75), fill(YARD.copper));
}

/** The carry readout: a small stack glyph and "52/60 kg". */
export function carryChip(c: SkCanvas, T: TextFn, x: number, y: number, w: number, h: number, text: string): void {
  chip(c, x, y, w, h);
  const gx = x + 9;
  const gy = y + h / 2 + 6;
  ['light_iron', 'copper', 'light_iron'].forEach((m, i) => {
    const p = rrect(gx, gy - (i + 1) * 4.2, 11, 3.6, 1);
    c.drawPath(p, fill(METAL[m].base));
    c.drawPath(p, stroke(INK, 0.9));
  });
  T(c, text, x + 25, y + h / 2 + 4.2, { size: TYPE.chip, weight: 'bold', color: INK });
}

/** The clipboard button (44 wide): a drawn clipboard. */
export function clipboardButton(c: SkCanvas, x: number, y: number, w: number, h: number): void {
  chip(c, x, y, w, h);
  const cx = x + w / 2;
  const cy = y + h / 2 + 1;
  c.drawPath(rrect(cx - 7.5, cy - 9.5, 15, 19, 2), fill(YARD.wood));
  c.drawPath(rrect(cx - 7.5, cy - 9.5, 15, 19, 2), stroke(INK, 1.2));
  c.drawPath(rrect(cx - 5.5, cy - 6.5, 11, 14.5, 1), fill(YARD.paper));
  for (let i = 0; i < 3; i++) c.drawPath(segment(cx - 3.5, cy - 3 + i * 3.6, cx + 3.5, cy - 3 + i * 3.6), stroke(INK, 1));
  c.drawPath(rrect(cx - 4, cy - 11.5, 8, 4, 1.5), fill(YARD.galvanised));
  c.drawPath(rrect(cx - 4, cy - 11.5, 8, 4, 1.5), stroke(INK, 1));
}

/** The goal card: a paper strip with a bulldog clip at the left, one line, a progress tally at the right; as wide as its words (at most maxW). */
export function goalCard(c: SkCanvas, T: TextFn, x: number, y: number, maxW: number, h: number, text: string, tally: string, progress: number): number {
  const need = 26 + T(c, text, 0, 0, { size: TYPE.goal, weight: 'semibold', measure: true }) + 14 + T(c, tally, 0, 0, { size: TYPE.goal, weight: 'heavy', measure: true }) + 9;
  const w = Math.min(maxW, need);
  chip(c, x, y, w, h, { r: 5 });
  c.drawPath(rrect(x + 6, y - 3, 14, 9, 2), fill(YARD.steelDark));
  c.drawPath(rrect(x + 6, y - 3, 14, 9, 2), stroke(INK, 1));
  c.drawPath(segment(x + 9, y + 1, x + 17, y + 1), stroke(YARD.galvanisedLight, 1.2));
  T(c, text, x + 26, y + h / 2 + 4.2, { size: TYPE.goal, weight: 'semibold', color: INK });
  T(c, tally, x + w - 8, y + h / 2 + 4.2, { size: TYPE.goal, weight: 'heavy', color: YARD.copperDark, align: 'right' });
  c.drawPath(rrect(x + 26, y + h - 4.5, w - 34, 2.2, 1.1), fill(YARD.paperShade));
  c.drawPath(rrect(x + 26, y + h - 4.5, (w - 34) * progress, 2.2, 1.1), fill(YARD.copper));
  return w;
}

/** The floating stick: a pale ring (52 pt travel) and a paper knob with an ink edge, at its centre. */
export function stick(c: SkCanvas, cx: number, cy: number, kx = 0, ky = 0): void {
  c.drawPath(circle(cx, cy, 52), fill('#FFFFFF', 0.22));
  c.drawPath(circle(cx, cy, 52), stroke(INK, 2, 0.35));
  c.drawPath(circle(cx, cy, 44), stroke('#FFFFFF', 1.5, 0.45));
  c.drawPath(circle(cx + kx, cy + ky + 2, 23), fill(INK, 0.28));
  c.drawPath(circle(cx + kx, cy + ky, 23), fill(YARD.paper));
  c.drawPath(circle(cx + kx, cy + ky, 23), stroke(INK, 1.6));
  c.drawPath(circle(cx + kx, cy + ky, 15), stroke(YARD.paperLine, 1.5));
}

/** The one button (60 pt): hi-vis yellow, ink ring and drop, its word in the middle. */
export function oneButton(c: SkCanvas, T: TextFn, cx: number, cy: number, word: string, r = 30): void {
  c.drawPath(circle(cx, cy + 3, r), fill(INK, 0.35));
  c.drawPath(circle(cx, cy, r), fill(YARD.hivis));
  c.drawPath(circle(cx, cy, r), stroke(INK, 2));
  c.drawPath(builder().addArc({ x: cx - r + 5, y: cy - r + 5, width: (r - 5) * 2, height: (r - 5) * 2 }, 200, 110).build(), stroke(YARD.hivisLight, 3));
  T(c, word, cx, cy + TYPE.button * 0.36, { size: TYPE.button, weight: 'heavy', color: INK, align: 'center' });
}

/** A padlock glyph (centred), s points tall. */
export function padlock(c: SkCanvas, cx: number, cy: number, s: number, color: string = INK): void {
  const k = s / 14;
  c.drawPath(builder().addArc({ x: cx - 4 * k, y: cy - 7 * k, width: 8 * k, height: 9 * k }, 180, 180).build(), stroke(color, 2 * k));
  c.drawPath(segment(cx - 4 * k, cy - 2.5 * k, cx - 4 * k, cy - 1 * k), stroke(color, 2 * k));
  c.drawPath(segment(cx + 4 * k, cy - 2.5 * k, cx + 4 * k, cy - 1 * k), stroke(color, 2 * k));
  c.drawPath(rrect(cx - 6 * k, cy - 1.5 * k, 12 * k, 8.5 * k, 1.8 * k), fill(color));
  c.drawPath(circle(cx, cy + 2.2 * k, 1.3 * k), fill(YARD.paper));
}

/**
 * The padlock chip over a locked pad (world-anchored, centred on (cx, cy)): padlock, what it opens and
 * its exact price; a small ingot glyph so the furnace reads before it is bought.
 */
export function padlockChip(c: SkCanvas, T: TextFn, cx: number, cy: number, label: string, price: string): void {
  const w = 132;
  const h = 30;
  const x = cx - w / 2;
  const y = cy - h / 2;
  chip(c, x, y, w, h, { r: 7 });
  c.drawPath(rrect(x + 4, y + 4, 22, h - 8, 4), fill(INK));
  padlock(c, x + 15, y + h / 2, 13, YARD.hivis);
  T(c, label, x + 32, y + 13, { size: TYPE.chipSmall, weight: 'semibold', color: INK });
  T(c, price, x + 32, y + 25.5, { size: TYPE.chip, weight: 'heavy', color: INK });
  // the pointer to the pad
  c.drawPath(poly([cx - 6, y + h, cx + 6, y + h, cx, y + h + 7]), fill(YARD.paper));
  c.drawPath(builder().moveTo(cx - 6, y + h).lineTo(cx, y + h + 7).lineTo(cx + 6, y + h).build(), stroke(INK, 1.3));
}

// ---------------------------------------------------------------------------
// The weighbridge ticket
// ---------------------------------------------------------------------------

export interface TicketLine {
  grade: string;
  net: string;
  price: string;
  amount: string;
  /** METAL id: its colour as a small square before the grade. */
  metal?: string;
}

export interface Ticket {
  yard: string;
  number: string;
  date: string;
  lines: TicketLine[];
  total: string;
  stamp: [string, string];
}

export const TICKET_W = 192;
export const ticketHeight = (t: Ticket): number => 58 + t.lines.length * 22 + 58;

/**
 * The weighbridge ticket, top-left at (x, y): continuous dot-matrix paper with a sprocket strip down the
 * left edge, torn edges top and bottom, a hi-vis header with the yard's name in stencil, one block per
 * grade (grade, net mass x posted price = amount), the total, and the blue rubber stamp
 * "ID CHECKED · PAID BY TRANSFER" (ruling 10).
 */
export function drawTicket(c: SkCanvas, x: number, y: number, t: Ticket): void {
  const w = TICKET_W;
  const h = ticketHeight(t);
  const tooth = 4;
  const edge = (yy: number, down: boolean): [number, number][] => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= w / tooth; i++) pts.push([x + i * tooth, yy + (i % 2 ? (down ? tooth * 0.6 : -tooth * 0.6) : 0)]);
    return pts;
  };
  const outline = poly([...edge(y, false), ...edge(y + h, true).reverse()].flat());
  c.save();
  c.translate(2, 3);
  c.drawPath(outline, fill(INK, 0.25));
  c.restore();
  c.drawPath(outline, fill(YARD.paper));
  // the sprocket strip
  const sw = 13;
  c.drawPath(segment(x + sw, y + 3, x + sw, y + h - 3), stroke(YARD.paperLine, 1));
  for (let yy = y + 8; yy < y + h - 4; yy += 10) {
    c.drawPath(circle(x + sw / 2, yy, 2.6), fill(YARD.paperShade));
    c.drawPath(circle(x + sw / 2, yy, 2.6), stroke(YARD.paperLine, 0.9));
  }
  const ix = x + sw + 7;
  const iw = w - sw - 13;
  // header: hi-vis band, yard name in stencil, then number and date in print
  c.drawPath(rrect(ix - 2, y + 7, iw + 4, 17, 2), fill(YARD.hivis));
  stencil(c, t.yard, ix + iw / 2, y + 10.5, 10, INK, { align: 'center', track: 0.6 });
  dotMatrix(c, `NO ${t.number}`, ix, y + 30, TYPE.ticket, YARD.print);
  dotMatrix(c, t.date, ix + iw, y + 30, TYPE.ticket, YARD.print, { align: 'right' });
  c.drawPath(segment(ix, y + 43, ix + iw, y + 43), stroke(YARD.print, 0.8));
  let ly = y + 49;
  for (const l of t.lines) {
    if (l.metal) {
      const m = METAL[l.metal];
      c.drawPath(rrect(ix, ly, 7, 7, 1.5), fill(m.base));
      c.drawPath(rrect(ix, ly, 7, 7, 1.5), stroke(INK, 0.8));
      if (m.sheen === 'ticks') ticks(c, ix + 3.5, ly + 3.5, 3);
    }
    dotMatrix(c, l.grade, ix + (l.metal ? 10 : 0), ly, TYPE.ticket, YARD.print, { bold: true });
    dotMatrix(c, `${l.net} × ${l.price}`, ix + 10, ly + 10, TYPE.ticket - 1, shade(YARD.print, 0.25));
    dotMatrix(c, l.amount, ix + iw, ly + 10, TYPE.ticket, YARD.print, { align: 'right' });
    ly += 22;
  }
  c.drawPath(segment(ix, ly - 2, ix + iw, ly - 2), stroke(YARD.print, 0.8));
  c.drawPath(segment(ix, ly, ix + iw, ly), stroke(YARD.print, 0.8));
  dotMatrix(c, 'TOTAL', ix, ly + 6, TYPE.ticketTotal, YARD.print, { bold: true });
  dotMatrix(c, t.total, ix + iw, ly + 6, TYPE.ticketTotal, YARD.print, { bold: true, align: 'right' });
  // the rubber stamp under the total, tilted, a little faded
  c.save();
  const stw = Math.max(dotWidth(t.stamp[0], 6), dotWidth(t.stamp[1], 6)) + 12;
  c.translate(ix + stw / 2 + 2, ly + 36);
  c.rotate(-6, 0, 0);
  c.drawPath(rrect(-stw / 2, -11, stw, 22, 3), stroke(YARD.stampBlue, 1.6, 0.8));
  c.drawPath(rrect(-stw / 2 + 2.2, -8.8, stw - 4.4, 17.6, 2), stroke(YARD.stampBlue, 0.8, 0.8));
  dotMatrix(c, t.stamp[0], 0, -6.5, 6, 'rgba(44,93,168,0.85)', { align: 'center', bold: true });
  dotMatrix(c, t.stamp[1], 0, 1.5, 6, 'rgba(44,93,168,0.85)', { align: 'center', bold: true });
  c.restore();
  c.drawPath(outline, stroke(YARD.paperLine, 0.8));
}

/** Speed lines under a rising ticket (the ticket rises from the display; the lines show it moves). */
export function risingLines(c: SkCanvas, x: number, y: number, w: number): void {
  for (let i = 0; i < 4; i++) {
    const xx = x + w * (0.2 + 0.2 * i);
    c.drawPath(segment(xx, y + 6 + (i % 2) * 4, xx, y + 18 + (i % 2) * 6), stroke(INK, 1.6, 0.45));
  }
}

/** A small price tag hanging in the world (a grade's posted price), centred at (cx, cy). */
export function priceTag(c: SkCanvas, T: TextFn, cx: number, cy: number, text: string, metal: string): void {
  const w = 74;
  const h = 20;
  chip(c, cx - w / 2, cy - h / 2, w, h, { r: 5 });
  c.drawPath(oval(cx - w / 2 + 10, cy, 5, 5), fill(METAL[metal]?.base ?? YARD.steel));
  c.drawPath(oval(cx - w / 2 + 10, cy, 5, 5), stroke(INK, 1));
  T(c, text, cx - w / 2 + 19, cy + 4, { size: TYPE.chipSmall, weight: 'bold', color: INK });
}
