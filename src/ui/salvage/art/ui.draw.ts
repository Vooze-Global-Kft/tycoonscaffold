/**
 * The interface's drawn objects (yard-style.md "Interface"): ticket-paper chips with ink edges and a
 * hard drop, the weighbridge ticket (the game's signature object), the goal card, the stick, the one
 * button and the padlock chip. Sizes in points, top-left anchored unless said. Running words are the
 * caller's and come through a TextFn (the phone's system font in the app; the renderers pass Inter, its
 * closest open stand-in); the ticket needs no font (dot-matrix print and stencil, ./letters.ts).
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { METAL, YARD, shade } from './palette';
import { dotMatrix, dotWidth, stencil, stencilWidth } from './letters';
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
  // § drawn as two S strokes stacked (never a $: there is no bar through it)
  const S = (dy: number) =>
    builder()
      .moveTo(cx + 2.6 * k, cy - 4.4 * k + dy)
      .cubicTo(cx + 1.2 * k, cy - 6 * k + dy, cx - 3.4 * k, cy - 5.4 * k + dy, cx - 2.8 * k, cy - 3 * k + dy)
      .cubicTo(cx - 2.3 * k, cy - 1.1 * k + dy, cx + 3 * k, cy - 1.3 * k + dy, cx + 2.8 * k, cy + 1.2 * k + dy)
      .cubicTo(cx + 2.6 * k, cy + 3.4 * k + dy, cx - 1.4 * k, cy + 3.6 * k + dy, cx - 2.8 * k, cy + 2.4 * k + dy)
      .build();
  c.drawPath(S(-1.2 * k), stroke(INK, 1.5 * k + 0.4));
  c.drawPath(S(2.2 * k), stroke(INK, 1.5 * k + 0.4));
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
  const fits = (t: string) => T(c, t, 0, 0, { size: TYPE.chip, weight: 'semibold', measure: true }) <= room;
  let words = fits(long) ? long : `next ${o.next}`;
  // a name too long for the room is cut with an ellipsis before the tonnage (never printed over it)
  if (!fits(words)) {
    let n = o.next.length;
    while (n > 1 && !fits(`next ${o.next.slice(0, n).trimEnd()}…`)) n--;
    words = `next ${o.next.slice(0, n).trimEnd()}…`;
  }
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
  T(c, text, x + 25, y + h / 2 + 4, { size: TYPE.chipSmall, weight: 'bold', color: INK });
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

/**
 * What a ticket records (yard-stage1.md 2.2): a weigh-in carries no payment (its lines show the day's
 * price, a muted "today's value" and the legal line, no stamp); a drop-off slip is signed in; a partner's
 * skip weigh-in and a collected lot or a deal delivery are paid by transfer and stamped. The words of
 * every line and stamp are the caller's.
 */
export type TicketKind = 'weighin' | 'dropoff' | 'skip' | 'collection' | 'deal';

export interface Ticket {
  yard: string;
  number: string;
  date: string;
  lines: TicketLine[];
  /** the total's words (empty on a weigh-in and a drop-off slip: no TOTAL row) */
  total: string;
  /** the stamp's two lines; null for no stamp (a weigh-in) */
  stamp: [string, string] | null;
  /** default 'collection' (the earlier proof's ticket) */
  kind?: TicketKind;
  /** a weigh-in's muted row, e.g. ["today's value", "§1,834.00"] */
  muted?: [string, string];
  /** legal lines in plain print under the lines (a weigh-in's "Weighed into bays · not yet sold") */
  legal?: string[];
}

/** The stamp's ink by kind: paid tickets blue, a drop-off slip green (signed in), nothing on a weigh-in. */
export const STAMP_INK: Record<TicketKind, string | null> = { weighin: null, dropoff: '#2F8F4E', skip: '#2C5DA8', collection: '#2C5DA8', deal: '#2C5DA8' };
/** The header band by kind: hi-vis for the yard's own scale tickets, paper grey for a drop-off slip. */
export const TICKET_HEAD: Record<TicketKind, string> = { weighin: '#F4C20D', dropoff: '#E9EAE3', skip: '#F4C20D', collection: '#F4C20D', deal: '#F4C20D' };

const rgbaInk = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/** The ticket's width for a print size p (points): 15 glyph-widths of print plus the sprocket strip. */
export const ticketWidth = (p: number = TYPE.ticket): number => Math.round(p * 19.4);
export const TICKET_W = ticketWidth();

interface TicketRow {
  kind: 'head' | 'meta' | 'rule' | 'grade' | 'sub' | 'amount' | 'double' | 'total' | 'stamp' | 'muted' | 'legal';
  h: number;
  line?: TicketLine;
  i?: number;
}

/** The rows of a ticket at print size p (a line's amount shares the sub-line's row when it fits). */
function ticketRows(t: Ticket, p: number): TicketRow[] {
  const iw = p * 15;
  const rows: TicketRow[] = [
    { kind: 'head', h: p * 2.6 },
    { kind: 'meta', h: p * 1.6 },
    { kind: 'rule', h: p * 0.7 },
  ];
  for (const l of t.lines) {
    rows.push({ kind: 'grade', h: p * 1.45, line: l });
    const sub = dotWidth(l.price ? `${l.net} × ${l.price}` : l.net, p);
    const amt = dotWidth(l.amount, p);
    if (sub + amt + p <= iw) rows.push({ kind: 'sub', h: p * 1.6, line: l });
    else {
      rows.push({ kind: 'sub', h: p * 1.55, line: { ...l, amount: '' } });
      rows.push({ kind: 'amount', h: p * 1.5, line: l });
    }
  }
  if (t.muted) rows.push({ kind: 'muted', h: p * 1.7 });
  for (let i = 0; i < (t.legal?.length ?? 0); i++) rows.push({ kind: 'legal', h: p * 1.5, i });
  if (t.total) rows.push({ kind: 'double', h: p * 0.8 }, { kind: 'total', h: p * 1.9 });
  if (t.stamp) rows.push({ kind: 'stamp', h: p * 3.6 });
  return rows;
}

export const ticketHeight = (t: Ticket, p: number = TYPE.ticket): number => ticketRows(t, p).reduce((a, r) => a + r.h, 0) + p * 1.2;

/**
 * The weighbridge ticket, top-left at (x, y), at print size p (7 pt in the interface; 9 pt in a store
 * picture, so its smallest print stays legible): continuous dot-matrix paper with a sprocket strip down
 * the left edge, torn edges top and bottom, a hi-vis header with the yard's name in stencil, one block
 * per grade (grade; net mass x posted price; amount), the total, and the blue rubber stamp
 * "ID CHECKED · PAID BY TRANSFER" (ruling 10). It always comes out of the weighbridge display's slot.
 */
export function drawTicket(c: SkCanvas, x: number, y: number, t: Ticket, p: number = TYPE.ticket): void {
  const w = ticketWidth(p);
  const h = ticketHeight(t, p);
  const tooth = Math.max(3.5, p * 0.55);
  const edge = (yy: number, down: boolean): [number, number][] => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= w / tooth; i++) pts.push([x + i * tooth, yy + (i % 2 ? (down ? tooth * 0.6 : -tooth * 0.6) : 0)]);
    pts.push([x + w, yy]);
    return pts;
  };
  const outline = poly([...edge(y, false), ...edge(y + h, true).reverse()].flat());
  c.save();
  c.translate(2, 3);
  c.drawPath(outline, fill(INK, 0.25));
  c.restore();
  c.drawPath(outline, fill(YARD.paper));
  // the sprocket strip
  const sw = p * 1.85;
  c.drawPath(segment(x + sw, y + 3, x + sw, y + h - 3), stroke(YARD.paperLine, 1));
  for (let yy = y + p * 1.1; yy < y + h - 4; yy += p * 1.4) {
    c.drawPath(circle(x + sw / 2, yy, p * 0.36), fill(YARD.paperShade));
    c.drawPath(circle(x + sw / 2, yy, p * 0.36), stroke(YARD.paperLine, 0.9));
  }
  const ix = x + sw + p * 0.9;
  const iw = w - sw - p * 1.6;
  let ry = y + p * 0.8;
  for (const r of ticketRows(t, p)) {
    switch (r.kind) {
      case 'head':
        c.drawPath(rrect(ix - 2, ry, iw + 4, p * 2.2, 2), fill(TICKET_HEAD[t.kind ?? 'collection']));
        stencil(c, t.yard, ix + iw / 2, ry + p * 0.6, Math.min(p * 1.05, (p * 1.05 * iw) / Math.max(1, stencilWidth(t.yard, p * 1.05, 0.2))), INK, { align: 'center', track: 0.2 });
        break;
      case 'meta':
        dotMatrix(c, `NO ${t.number}`, ix, ry + p * 0.2, p, YARD.print);
        dotMatrix(c, t.date, ix + iw, ry + p * 0.2, p, YARD.print, { align: 'right' });
        break;
      case 'rule':
        c.drawPath(segment(ix, ry + p * 0.3, ix + iw, ry + p * 0.3), stroke(YARD.print, 0.8));
        break;
      case 'grade': {
        const l = r.line!;
        if (l.metal) {
          const m = METAL[l.metal];
          c.drawPath(rrect(ix, ry, p, p, 1.5), fill(m.base));
          c.drawPath(rrect(ix, ry, p, p, 1.5), stroke(INK, 0.8));
        }
        dotMatrix(c, l.grade, ix + (l.metal ? p * 1.4 : 0), ry, p, YARD.print, { bold: true });
        break;
      }
      case 'sub': {
        const l = r.line!;
        dotMatrix(c, l.price ? `${l.net} × ${l.price}` : l.net, ix, ry + p * 0.15, p, shade(YARD.print, 0.2));
        if (l.amount) dotMatrix(c, l.amount, ix + iw, ry + p * 0.15, p, YARD.print, { align: 'right' });
        break;
      }
      case 'amount':
        dotMatrix(c, r.line!.amount, ix + iw, ry, p, YARD.print, { align: 'right' });
        break;
      case 'double':
        c.drawPath(segment(ix, ry + p * 0.1, ix + iw, ry + p * 0.1), stroke(YARD.print, 0.8));
        c.drawPath(segment(ix, ry + p * 0.4, ix + iw, ry + p * 0.4), stroke(YARD.print, 0.8));
        break;
      case 'total':
        dotMatrix(c, 'TOTAL', ix, ry + p * 0.3, p * 1.12, YARD.print, { bold: true });
        dotMatrix(c, t.total, ix + iw, ry + p * 0.3, p * 1.12, YARD.print, { bold: true, align: 'right' });
        break;
      case 'muted':
        c.drawPath(rrect(ix - 1, ry, iw + 2, p * 1.45, 1.5), fill(YARD.paperShade));
        dotMatrix(c, t.muted![0], ix + 1, ry + p * 0.22, p, YARD.inkSoft);
        dotMatrix(c, t.muted![1], ix + iw - 1, ry + p * 0.22, p, YARD.inkSoft, { align: 'right' });
        break;
      case 'legal':
        dotMatrix(c, t.legal![r.i ?? 0], ix, ry + p * 0.2, p * 0.86, YARD.print);
        break;
      case 'stamp': {
        if (!t.stamp) break;
        const sp = p * 0.86;
        const ink = STAMP_INK[t.kind ?? 'collection'] ?? YARD.stampBlue;
        const inkA = rgbaInk(ink, 0.88);
        c.save();
        const stw = Math.max(dotWidth(t.stamp[0], sp), dotWidth(t.stamp[1], sp)) + sp * 1.8;
        c.translate(ix + stw / 2 + 2, ry + p * 1.7);
        c.rotate(-5, 0, 0);
        c.drawPath(rrect(-stw / 2, -sp * 1.55, stw, sp * 3.1, 3), stroke(ink, 1.6, 0.8));
        c.drawPath(rrect(-stw / 2 + 2.2, -sp * 1.55 + 2.2, stw - 4.4, sp * 3.1 - 4.4, 2), stroke(ink, 0.8, 0.8));
        dotMatrix(c, t.stamp[0], 0, -sp * 1.05, sp, inkA, { align: 'center', bold: true });
        dotMatrix(c, t.stamp[1], 0, sp * 0.15, sp, inkA, { align: 'center', bold: true });
        c.restore();
        break;
      }
    }
    ry += r.h;
  }
  c.drawPath(outline, stroke(YARD.paperLine, 0.8));
}

/**
 * The ticket feeding out of the display's printer slot: a short tongue of paper from the slot (sx, sy,
 * slot width sw) that opens into the ticket hanging below it, turned a little. Returns its bounds.
 */
export function ticketFromSlot(c: SkCanvas, sx: number, sy: number, sw: number, t: Ticket, p: number, turn = -2.5): { x: number; y: number; w: number; h: number } {
  const w = ticketWidth(p);
  const h = ticketHeight(t, p);
  const drop = p * 1.2;
  const x = sx - w / 2;
  const y = sy + drop;
  // the tongue: paper from the slot widening into the ticket's top (it is pulled toward the eye)
  const tongue = poly([sx - sw / 2, sy, sx + sw / 2, sy, sx + w / 2 - 6, y + 2, sx - w / 2 + 6, y + 2]);
  c.drawPath(tongue, fill(YARD.paperShade));
  c.drawPath(segment(sx - sw / 2, sy, sx - w / 2 + 6, y + 2), stroke(YARD.paperLine, 0.9));
  c.drawPath(segment(sx + sw / 2, sy, sx + w / 2 - 6, y + 2), stroke(YARD.paperLine, 0.9));
  for (let i = 1; i < 4; i++) {
    const k = i / 4;
    c.drawPath(segment(sx - sw / 2 + (sw * k), sy + 1, sx - w / 2 + 6 + (w - 12) * k, y), stroke(YARD.paperLine, 0.6, 0.5));
  }
  c.save();
  c.rotate(turn, sx, y);
  drawTicket(c, x, y, t, p);
  c.restore();
  return { x, y, w, h };
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
  const w = Math.max(74, T(c, text, 0, 0, { size: TYPE.chipSmall, weight: 'bold', measure: true }) + 27);
  const h = 20;
  chip(c, cx - w / 2, cy - h / 2, w, h, { r: 5 });
  c.drawPath(oval(cx - w / 2 + 10, cy, 5, 5), fill(METAL[metal]?.base ?? YARD.steel));
  c.drawPath(oval(cx - w / 2 + 10, cy, 5, 5), stroke(INK, 1));
  T(c, text, cx - w / 2 + 19, cy + 4, { size: TYPE.chipSmall, weight: 'bold', color: INK });
}

// ---------------------------------------------------------------------------
// The process board's plates, the rivals' generated plates, business cards and the merchant's mark
// (yard-stage1.md 6.1 "effects and interface"). Drawn live by the interface (not baked); no words: the
// caller writes names and prices beside them.
// ---------------------------------------------------------------------------

export type PlateState = 'lit' | 'buyable' | 'greyed';
export type PlateGlyph = 'scale' | 'stripper' | 'power' | 'bench' | 'crucible';

/** A machine's pictogram, ink on the plate, s points square, centred at (cx, cy). */
function machineGlyph(c: SkCanvas, g: PlateGlyph, cx: number, cy: number, s: number, ink: string): void {
  const k = s / 24;
  const st = stroke(ink, 1.8 * k);
  c.save();
  c.translate(cx, cy);
  c.scale(k, k);
  switch (g) {
    case 'scale':
      c.drawPath(rrect(-10, 4, 20, 4, 1), stroke(ink, 1.8));
      c.drawPath(segment(6, 4, 6, -8), stroke(ink, 1.8));
      c.drawPath(rrect(1, -12, 11, 6, 1), stroke(ink, 1.8));
      break;
    case 'stripper':
    case 'power':
      // two rollers with the cable passing between them, the bright copper coming out
      c.drawPath(oval(-2, -6.5, 4.4, 4.4), stroke(ink, 1.8));
      c.drawPath(oval(-2, 7, 4.4, 4.4), stroke(ink, 1.8));
      c.drawPath(segment(-13, 0.3, -6, 0.3), stroke(ink, 2.6));
      c.drawPath(segment(2, 0.3, 12, 0.3), stroke(YARD.copper, 2.4));
      // the power stripper's motor: a box with cooling fins behind the rollers
      if (g === 'power') {
        c.drawPath(rrect(5, -13, 8, 7, 1.5), fill(ink));
        c.drawPath(segment(7, -11, 7, -8), stroke(YARD.paper, 0.8));
        c.drawPath(segment(10, -11, 10, -8), stroke(YARD.paper, 0.8));
      }
      break;
    case 'bench':
      c.drawPath(segment(-11, 2, 11, 2), stroke(ink, 2.2));
      c.drawPath(segment(-8, 2, -8, 10), stroke(ink, 1.6));
      c.drawPath(segment(8, 2, 8, 10), stroke(ink, 1.6));
      c.drawPath(rrect(-6, -6, 10, 8, 3), stroke(ink, 1.8));
      c.drawPath(oval(-1, -2, 2.4, 2.4), fill(YARD.copper));
      break;
    case 'crucible':
      c.save();
      c.rotate(-30, 0, 0);
      c.drawPath(rrect(-8, -9, 14, 15, 4), stroke(ink, 1.8));
      c.restore();
      c.drawPath(segment(8, -2, 8, 10), stroke(YARD.glow, 2.4));
      c.drawPath(rrect(3, 9, 12, 3, 1), fill(YARD.glow));
      break;
  }
  void st;
  c.restore();
}

/**
 * A plate of the process board: a machine's tile, its pictogram at the left and room for the caller's
 * name and price at the right. lit: owned and working (hi-vis edge, a green lamp); buyable: paper with a
 * padlock that can be opened; greyed: not yet reachable (washed grey, dashed edge).
 */
export function processPlate(c: SkCanvas, x: number, y: number, w: number, h: number, state: PlateState, glyph: PlateGlyph): { words: [number, number, number, number] } {
  const r = 6;
  if (state !== 'greyed') c.drawPath(rrect(x, y + 2, w, h, r), fill(INK, 0.28));
  const face = state === 'lit' ? YARD.paper : state === 'buyable' ? YARD.paperShade : '#D9D9D4';
  c.drawPath(rrect(x, y, w, h, r), fill(face));
  if (state === 'lit') {
    c.drawPath(rrect(x, y, w, h, r), stroke(YARD.hivisDark, 3));
    c.drawPath(rrect(x, y, w, h, r), stroke(INK, 1.3));
  } else if (state === 'buyable') c.drawPath(rrect(x, y, w, h, r), stroke(INK, 1.3));
  else
    for (let i = 0; i < 28; i++) {
      const t = i / 28;
      const per = 2 * (w + h);
      const d0 = t * per;
      const pt = (d: number): [number, number] => (d < w ? [x + d, y] : d < w + h ? [x + w, y + d - w] : d < 2 * w + h ? [x + w - (d - w - h), y + h] : [x, y + h - (d - 2 * w - h)]);
      const [ax, ay] = pt(d0);
      const [bx, by] = pt(d0 + per / 56);
      c.drawPath(segment(ax, ay, bx, by), stroke(YARD.inkSoft, 1.1));
    }
  const ink = state === 'greyed' ? YARD.inkSoft : INK;
  const gs = h - 12;
  c.drawPath(rrect(x + 6, y + 6, gs, gs, 4), fill(state === 'lit' ? YARD.hivis : state === 'buyable' ? YARD.paper : '#CBCBC5'));
  c.drawPath(rrect(x + 6, y + 6, gs, gs, 4), stroke(ink, 1));
  machineGlyph(c, glyph, x + 6 + gs / 2, y + 6 + gs / 2, gs * 0.8, ink);
  if (state === 'lit') {
    c.drawPath(oval(x + w - 10, y + 10, 3.4, 3.4), fill(YARD.led));
    c.drawPath(oval(x + w - 10, y + 10, 3.4, 3.4), stroke(INK, 0.9));
  } else if (state === 'buyable') padlock(c, x + w - 12, y + h / 2, 12, YARD.hivis);
  else padlock(c, x + w - 12, y + h / 2, 11, '#BDBDB6');
  return { words: [x + gs + 14, y + 4, w - gs - 14 - 24, h - 8] };
}

/** The rival plates' kit: shapes, colour pairs and emblems a seed picks from (25 rivals, no letters, no real mark). */
const PLATE_SHAPES = ['shield', 'roundel', 'hex', 'tile', 'pennant'] as const;
const PLATE_COLOURS: [string, string][] = [
  [YARD.containerTeal, YARD.paper],
  [YARD.containerOxide, YARD.hivis],
  [YARD.containerSage, YARD.paper],
  [YARD.machine, YARD.hivis],
  [YARD.skip, YARD.paper],
  ['#5B4A7A', YARD.hivisLight],
  [YARD.ink, YARD.copperLight],
];
const PLATE_EMBLEMS = ['bars', 'stack', 'peak', 'ring', 'chevrons', 'ingot', 'wave'] as const;

/** One rival's generated plate, s points across, centred at (cx, cy): shape x colours x emblem from `seed` (0..24 distinct). */
export function rivalPlate(c: SkCanvas, cx: number, cy: number, s: number, seed: number): void {
  const shape = PLATE_SHAPES[seed % PLATE_SHAPES.length];
  const [bg, fg] = PLATE_COLOURS[(seed * 3 + Math.floor(seed / 5)) % PLATE_COLOURS.length];
  const emblem = PLATE_EMBLEMS[(seed * 2 + Math.floor(seed / 7)) % PLATE_EMBLEMS.length];
  const h = s / 2;
  let p;
  switch (shape) {
    case 'shield':
      p = builder().moveTo(cx - h, cy - h).lineTo(cx + h, cy - h).lineTo(cx + h, cy + h * 0.2).quadTo(cx + h * 0.6, cy + h * 0.8, cx, cy + h).quadTo(cx - h * 0.6, cy + h * 0.8, cx - h, cy + h * 0.2).close().build();
      break;
    case 'roundel':
      p = circle(cx, cy, h);
      break;
    case 'hex':
      p = poly(Array.from({ length: 6 }, (_, i) => [cx + Math.cos((i / 6) * Math.PI * 2) * h, cy + Math.sin((i / 6) * Math.PI * 2) * h]).flat());
      break;
    case 'tile':
      p = rrect(cx - h, cy - h, s, s, s * 0.18);
      break;
    default:
      p = poly([cx - h, cy - h, cx + h, cy - h * 0.5, cx + h, cy + h * 0.5, cx - h, cy + h]);
  }
  c.drawPath(p, fill(bg));
  c.drawPath(p, stroke(INK, Math.max(1, s / 22)));
  const e = s * 0.28;
  const st = stroke(fg, Math.max(1.2, s / 12));
  switch (emblem) {
    case 'bars':
      for (let i = -1; i <= 1; i++) c.drawPath(segment(cx - e, cy + i * e * 0.6, cx + e, cy + i * e * 0.6), st);
      break;
    case 'stack':
      // three bars stacked and offset (a stack of plate)
      for (let i = 0; i < 3; i++) c.drawPath(rrect(cx - e + (i % 2) * e * 0.3, cy + e * 0.55 - i * e * 0.55, e * 1.7, e * 0.4, 1), fill(fg));
      break;
    case 'peak':
      c.drawPath(builder().moveTo(cx - e, cy + e * 0.6).lineTo(cx, cy - e * 0.7).lineTo(cx + e, cy + e * 0.6).build(), st);
      break;
    case 'ring':
      c.drawPath(oval(cx, cy, e * 0.8, e * 0.8), st);
      break;
    case 'chevrons':
      for (const d of [-0.4, 0.4]) c.drawPath(builder().moveTo(cx - e, cy + d * e - e * 0.4).lineTo(cx, cy + d * e + e * 0.3).lineTo(cx + e, cy + d * e - e * 0.4).build(), st);
      break;
    case 'ingot':
      c.drawPath(poly([cx - e, cy + e * 0.5, cx + e, cy + e * 0.5, cx + e * 0.7, cy - e * 0.4, cx - e * 0.7, cy - e * 0.4]), fill(fg));
      break;
    default:
      c.drawPath(builder().moveTo(cx - e, cy).quadTo(cx - e / 2, cy - e * 0.7, cx, cy).quadTo(cx + e / 2, cy + e * 0.7, cx + e, cy).build(), st);
  }
}

/** The merchant's mark (an invented firm): a bridge arch over three bars of metal, in stamp blue, s points across. */
export function merchantMark(c: SkCanvas, cx: number, cy: number, s: number, color: string = YARD.stampBlue): void {
  const h = s / 2;
  c.drawPath(rrect(cx - h, cy - h, s, s, s * 0.16), fill(color));
  c.drawPath(rrect(cx - h, cy - h, s, s, s * 0.16), stroke(INK, Math.max(1, s / 24)));
  const w = s * 0.34;
  c.drawPath(builder().moveTo(cx - w, cy + s * 0.05).quadTo(cx, cy - s * 0.42, cx + w, cy + s * 0.05).build(), stroke(YARD.paper, s / 11));
  for (let i = 0; i < 3; i++) c.drawPath(rrect(cx - w + i * (w * 0.7), cy + s * 0.1, w * 0.58, s * 0.14, 1), fill(YARD.paper));
  c.drawPath(segment(cx - w - s * 0.04, cy + s * 0.32, cx + w + s * 0.04, cy + s * 0.32), stroke(YARD.paper, s / 14));
}

/**
 * A business card (a partner's or a deal's): paper with a hard drop, the firm's mark at the left (the
 * merchant's or a rival plate), a hi-vis stripe along the foot and blank lines where the caller writes.
 */
export function businessCard(c: SkCanvas, x: number, y: number, w: number, h: number, mark: { merchant: true } | { seed: number }): { words: [number, number, number, number] } {
  chip(c, x, y, w, h, { r: 4 });
  c.drawPath(rrect(x + 1.5, y + h - 6, w - 3, 4.5, 2), fill(YARD.hivis));
  const s = h * 0.5;
  if ('merchant' in mark) merchantMark(c, x + 8 + s / 2, y + h * 0.42, s);
  else rivalPlate(c, x + 8 + s / 2, y + h * 0.42, s, mark.seed);
  for (const k of [0.32, 0.52]) c.drawPath(segment(x + s + 16, y + h * k + 4, x + w - 10, y + h * k + 4), stroke(YARD.paperLine, 0.8));
  return { words: [x + s + 16, y + 6, w - s - 26, h - 16] };
}
