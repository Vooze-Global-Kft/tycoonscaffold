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
