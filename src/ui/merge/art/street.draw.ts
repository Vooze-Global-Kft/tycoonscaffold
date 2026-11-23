/**
 * Street and board furniture (spec 4.2, 5.5, 2.5): the street at dusk with its wire of lanterns,
 * counters, the paper ticket and its FILLED stamp, the ticket folding into a lantern and the flying
 * lantern, the Festival banner and its lantern, the board, its cell tile, shutters, the season
 * blocks (stone gate, brazier), the Basket, the undo chip, the gift bag (3 and 4 slots, M5), the
 * Lucky Spark, the coin and the purse, and the drag marks (match glow, target outline, armed ring).
 *
 * Pieces with a size argument take their top-left corner at the origin (street, ticket, banner,
 * board) unless they say "centred"; square props take the side `s` and are centred.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { drawLetters } from './letters';
import { drawLantern } from './lantern.draw';
import { NIGHT, alpha, mix, shade } from './palette';
import {
  INK,
  arc,
  at,
  blob,
  builder,
  circle,
  clip,
  curve,
  dashed,
  fill,
  glow,
  line,
  linearPaint,
  lit,
  oval,
  poly,
  rrect,
  seeded,
  shape,
  sparkle,
  stroke,
} from './pen';

// ---------------------------------------------------------------------------
// The street
// ---------------------------------------------------------------------------

/**
 * The street behind everything, `w` x `h` from the top left: a dusk sky over invented rooftops in
 * the backdrop band (0 to `band`), a wire of lanterns along its top, then the warm-lit lane where
 * the counters stand, darkening to the board's teal at the bottom. `lit` of `lanterns` glow.
 */
export function drawStreet(c: SkCanvas, w: number, h: number, o: { band?: number; lanterns?: number; lit?: number; seed?: number } = {}): void {
  const band = o.band ?? 40;
  c.drawRect({ x: 0, y: 0, width: w, height: h }, linearPaint(0, 0, 0, h, [NIGHT.dusk, NIGHT.indigo, NIGHT.indigoLift, NIGHT.teal], [0, band / h, 0.7, 1]));
  const rnd = seeded(o.seed ?? 3);
  // A few stars and the moon.
  for (let i = 0; i < 14; i++) c.drawPath(circle(rnd() * w, rnd() * band * 0.6, 0.4 + rnd() * 0.5), fill(alpha(NIGHT.white, 0.5 + rnd() * 0.3)));
  glow(c, w * 0.86, band * 0.28, 16, NIGHT.moon, 0.35);
  c.drawPath(circle(w * 0.86, band * 0.28, 5.4), fill(NIGHT.moon));
  c.drawPath(circle(w * 0.86 + 2, band * 0.28 - 1.2, 4.6), fill(mix(NIGHT.dusk, NIGHT.moon, 0.15)));
  // Rooftops: rounded humps and flat tops with chimneys, invented, no real skyline.
  const b = builder().moveTo(0, band);
  let x = 0;
  while (x < w) {
    const rw = 22 + rnd() * 26;
    const rh = band * (0.35 + rnd() * 0.3);
    if (rnd() < 0.5) b.lineTo(x, band - rh).quadTo(x + rw / 2, band - rh - 10, x + rw, band - rh);
    else {
      b.lineTo(x, band - rh).lineTo(x + rw * 0.6, band - rh);
      b.lineTo(x + rw * 0.6, band - rh - 6).lineTo(x + rw * 0.72, band - rh - 6).lineTo(x + rw * 0.72, band - rh).lineTo(x + rw, band - rh);
    }
    x += rw;
  }
  b.lineTo(w, band).close();
  c.drawPath(b.build(), fill(NIGHT.indigoDeep));
  // Lit windows.
  for (let i = 0; i < 9; i++) c.drawPath(rrect(rnd() * w, band - 4 - rnd() * band * 0.3, 2.2, 2.6, 0.6), fill(alpha(NIGHT.amber, 0.65)));
  // The lane: a warm wash where the counters stand, cobbles near the bottom.
  glow(c, w / 2, band + (h - band) * 0.45, w * 0.6, NIGHT.amber, 0.12);
  for (let i = 0; i < 26; i++) {
    const cx = rnd() * w;
    const cy = h - 6 - rnd() * 14;
    c.drawPath(oval(cx, cy, 3 + rnd() * 2, 1.4), fill(alpha(NIGHT.tealDeep, 0.5)));
  }
  // The wire.
  if (o.lanterns !== 0) {
    const n = o.lanterns ?? Math.max(3, Math.round(w / 48));
    drawWire(c, 0, w, 3, n, o.lit ?? n);
  }
}

/** A sagging wire of `n` lanterns across x0..x1 at height y; `litCount` from the left glow. */
export function drawWire(c: SkCanvas, x0: number, x1: number, y: number, n: number, litCount = n, r = 3.2): void {
  const sag = 5;
  c.drawPath(builder().moveTo(x0, y).quadTo((x0 + x1) / 2, y + sag * 2, x1, y).build(), stroke(alpha(INK, 0.95), 0.9));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const lx = x0 + (x1 - x0) * t;
    const ly = y + 4 * sag * t * (1 - t);
    at(c, lx, ly + r * 1.9, 1, 0, (q) => drawLantern(q, r, { look: i < litCount ? 'lit' : 'unlit', cord: r * 0.4, glow: 0.75 }));
  }
}

/** The counter board under a ticket column, `w` wide, top at y = 0 (10 pt tall). */
export function drawCounter(c: SkCanvas, w: number): void {
  const top = rrect(0, 0, w, 4, 1.4);
  lit(c, top, NIGHT.woodDeep, NIGHT.woodLight, 0, -1, 0.9);
  c.drawPath(rrect(2, 4, w - 4, 6, 0), fill(NIGHT.woodDeep));
  c.drawPath(line(2, 10, w - 2, 10), stroke(INK, 1));
  c.drawPath(line(2, 4, 2, 10), stroke(INK, 0.8));
  c.drawPath(line(w - 2, 4, w - 2, 10), stroke(INK, 0.8));
}

// ---------------------------------------------------------------------------
// The ticket
// ---------------------------------------------------------------------------

export interface TicketLayout {
  /** The three line rows (24 pt icon at the left, a tier pip and a tick to its right). */
  rows: { x: number; y: number; w: number; h: number }[];
  /** The price box. */
  price: { x: number; y: number; w: number; h: number };
}

/** Where a w x h ticket's rows and price box are (top-left origin), for the play canvas's text and icons. */
export function ticketLayout(w: number, h: number): TicketLayout {
  const top = 8;
  const priceH = 15;
  const bottom = h - 7;
  const rowH = Math.min(24, (bottom - priceH - 3 - top) / 3);
  const rows = [0, 1, 2].map((i) => ({ x: 3, y: top + i * rowH, w: w - 6, h: rowH }));
  return { rows, price: { x: 5, y: bottom - priceH, w: w - 10, h: priceH } };
}

function tornEdge(w: number, y: number, n: number): number[] {
  const pts: number[] = [];
  for (let i = 0; i <= n; i++) pts.push(w - (w / n) * i, y + (i % 2 ? 2.4 : 0));
  return pts;
}

/** The paper ticket, w x h from the top left (64 x 96 on a 68 pt counter): blank, 3 row guides, a price box. Gold for the Parade. */
export function drawTicket(c: SkCanvas, w: number, h: number, o: { gold?: boolean; rows?: number } = {}): void {
  const paper = o.gold ? mix(NIGHT.brassLight, NIGHT.paperLight, 0.35) : NIGHT.paper;
  const body = poly([0, 2, w, 2, ...tornEdge(w, h - 2.4, Math.round(w / 4))]);
  c.save();
  c.translate(1.2, 1.6);
  c.drawPath(body, fill(alpha(INK, 0.45)));
  c.restore();
  c.drawPath(body, fill(paper));
  c.save();
  clip(c, body);
  c.drawPath(rrect(0, 2, w, 3, 0), fill(alpha(o.gold ? NIGHT.brass : NIGHT.paperShade, 0.8)));
  // Paper fibre: a few faint strokes.
  const rnd = seeded(Math.round(w * 7 + h));
  for (let i = 0; i < 6; i++) {
    const y = 8 + rnd() * (h - 16);
    c.drawPath(line(rnd() * w * 0.3, y, w * (0.5 + rnd() * 0.5), y + 0.6), stroke(alpha(NIGHT.paperShade, 0.45), 0.5));
  }
  c.restore();
  c.drawPath(body, stroke(INK, 1));
  // The brass clip it hangs from.
  shape(c, rrect(w / 2 - 6, -1.6, 12, 5, 1.6), NIGHT.brass, 0.9);
  c.drawPath(circle(w / 2, 0.9, 1), fill(NIGHT.brassDeep));
  const L = ticketLayout(w, h);
  const n = o.rows ?? 3;
  for (let i = 1; i < n; i++) {
    const r = L.rows[i];
    c.drawPath(line(r.x + 2, r.y, r.x + r.w - 2, r.y), dashed(alpha(NIGHT.paperEdge, 0.8), 0.7, 2, 2));
  }
  const p = L.price;
  c.drawPath(rrect(p.x, p.y, p.w, p.h, 3), fill(o.gold ? alpha(NIGHT.brass, 0.35) : alpha(NIGHT.paperShade, 0.55)));
  c.drawPath(rrect(p.x, p.y, p.w, p.h, 3), stroke(o.gold ? NIGHT.brassDeep : NIGHT.brass, 1));
  if (o.gold) {
    sparkle(c, w - 6, 9, 2.6, NIGHT.brassDeep);
    sparkle(c, 6, h - 30, 2, NIGHT.brassDeep);
  }
}

/** A tick for a filled line (centred, about 8 pt). */
export function drawTick(c: SkCanvas, s = 8): void {
  const p = builder().moveTo(-s * 0.4, 0).lineTo(-s * 0.1, s * 0.32).lineTo(s * 0.45, -s * 0.36).build();
  c.drawPath(p, stroke(INK, s * 0.3));
  c.drawPath(p, stroke(NIGHT.leaf, s * 0.17));
}

/**
 * The FILLED stamp (centred, radius r): a round ink stamp, a little crooked, with a tick in the
 * middle and `label` (the play canvas passes its string) along the band. `k` 0..1 stamps it down.
 */
export function drawFilledStamp(c: SkCanvas, r = 18, label = '', k = 1): void {
  const s = 1 + (1 - k) * 0.6;
  at(c, 0, 0, s, -12, (q) => {
    const a = 0.85 * k;
    q.drawPath(circle(0, 0, r), stroke(alpha(NIGHT.red, a), r * 0.12));
    q.drawPath(circle(0, 0, r * 0.74), stroke(alpha(NIGHT.red, a), r * 0.05));
    if (label) {
      const size = r * 0.26;
      q.drawPath(rrect(-r * 0.95, -size * 0.75, r * 1.9, size * 1.5, 1), fill(alpha(NIGHT.paperLight, 0.85 * k)));
      q.drawPath(rrect(-r * 0.95, -size * 0.75, r * 1.9, size * 1.5, 1), stroke(alpha(NIGHT.red, a), r * 0.06));
      drawLetters(q, label, 0, -size / 2, { size, color: alpha(NIGHT.red, a), align: 'center', weight: 0.24 });
    } else {
      const t = builder().moveTo(-r * 0.36, 0).lineTo(-r * 0.08, r * 0.3).lineTo(r * 0.42, -r * 0.32).build();
      q.drawPath(t, stroke(alpha(NIGHT.red, a), r * 0.16));
    }
  });
}

// ---------------------------------------------------------------------------
// The ticket folding into a lantern, and the flying lantern
// ---------------------------------------------------------------------------

export const FOLD_FRAMES = 6;

/**
 * Frame `f` (0..5) of the paid ticket folding into a lantern, centred, for a ticket of w x h:
 * 0 the flat ticket, 1 creased in pleats, 2 pleated and pulled in, 3 a paper lantern, 4 the lantern
 * catching light, 5 the lit lantern (then `drawFlyingLantern` carries it to the purse).
 */
export function drawTicketFold(c: SkCanvas, f: number, w = 64, h = 96): void {
  const k = Math.max(0, Math.min(FOLD_FRAMES - 1, Math.round(f)));
  if (k === 0) {
    at(c, -w / 2, -h / 2, 1, 0, (q) => drawTicket(q, w, h));
    return;
  }
  if (k <= 2) {
    const sx = k === 1 ? 0.82 : 0.6;
    const sy = k === 1 ? 0.9 : 0.68;
    const ww = w * sx;
    const hh = h * sy;
    const n = k === 1 ? 6 : 8;
    // Accordion pleats: alternate light and shaded strips with zig-zag sides.
    const pts: number[] = [];
    for (let i = 0; i <= n; i++) pts.push(-ww / 2 - (i % 2 ? 2.5 * k : 0), -hh / 2 + (hh / n) * i);
    for (let i = n; i >= 0; i--) pts.push(ww / 2 + (i % 2 ? 2.5 * k : 0), -hh / 2 + (hh / n) * i);
    const body = poly(pts);
    c.drawPath(body, fill(NIGHT.paper));
    c.save();
    clip(c, body);
    for (let i = 0; i < n; i += 2) c.drawPath(rrect(-ww, -hh / 2 + (hh / n) * i, ww * 2, hh / n, 0), fill(alpha(NIGHT.paperShade, 0.75)));
    c.restore();
    c.drawPath(body, stroke(INK, 1));
    shape(c, rrect(-6, -hh / 2 - 3, 12, 4, 1.4), NIGHT.brass, 0.9);
    return;
  }
  const r = Math.min(w, h) * 0.3;
  if (k === 3) {
    // The pleated paper lantern, not yet lit.
    const hh = r * 1.15;
    const body = oval(0, 0, r, hh);
    c.drawPath(body, fill(NIGHT.paper));
    c.save();
    clip(c, body);
    for (let i = -3; i <= 3; i += 2) c.drawPath(rrect(-r, (hh / 4) * i - hh / 8, r * 2, hh / 4, 0), fill(alpha(NIGHT.paperShade, 0.7)));
    c.restore();
    c.drawPath(body, stroke(INK, 1));
    shape(c, rrect(-r * 0.5, -hh - 2, r, 3.4, 1.2), NIGHT.brass, 0.9);
    shape(c, rrect(-r * 0.5, hh - 1.4, r, 3.4, 1.2), NIGHT.brass, 0.9);
    return;
  }
  drawLantern(c, r, { look: 'lit', glow: k === 4 ? 0.5 : 1, tassel: true });
}

/** The flying lantern (centred, body half width r): lit, with a small flame under it and no tassel. */
export function drawFlyingLantern(c: SkCanvas, r = 7): void {
  drawLantern(c, r, { look: 'lit', tassel: false, glow: 1 });
  const y = r * 1.15 + r * 0.3;
  const f = builder().moveTo(-r * 0.22, y).quadTo(0, y + r * 0.7, r * 0.22, y).quadTo(0, y + r * 0.2, -r * 0.22, y).close().build();
  c.drawPath(f, fill(NIGHT.flame));
}

// ---------------------------------------------------------------------------
// The Festival banner
// ---------------------------------------------------------------------------

/** Where the banner's line icons go (2 x 3 grid of 22 pt, below its lantern), for a w x h banner. */
export function bannerGrid(w: number, h: number): { x: number; y: number; size: number }[] {
  const size = 22;
  const gx = (w - 2 * size) / 3;
  const top = h - 3 * size - 10;
  const out: { x: number; y: number; size: number }[] = [];
  for (let r = 0; r < 3; r++) for (let col = 0; col < 2; col++) out.push({ x: gx + col * (size + gx), y: top + r * (size + 1), size });
  return out;
}

/**
 * The Festival banner, w x h from the top left (52 x 116 at 375 pt): an indigo cloth hung from a
 * brass rod, brass border, a lantern at the top (`lit` once the Festival is filled), the lower part
 * left plain for up to 6 line icons (`bannerGrid`).
 */
export function drawFestivalBanner(c: SkCanvas, w: number, h: number, o: { lit?: boolean } = {}): void {
  const cloth = builder()
    .moveTo(3, 4)
    .lineTo(w - 3, 4)
    .lineTo(w - 3, h - 8)
    .lineTo(w / 2, h - 1)
    .lineTo(3, h - 8)
    .close()
    .build();
  c.save();
  c.translate(1.2, 1.6);
  c.drawPath(cloth, fill(alpha(INK, 0.45)));
  c.restore();
  c.drawPath(cloth, fill(NIGHT.indigoMid));
  c.save();
  clip(c, cloth);
  c.drawRect({ x: 0, y: 0, width: w, height: 30 }, fill(alpha(NIGHT.teal, 0.9)));
  for (let i = 0; i < 5; i++) c.drawPath(circle(6 + i * ((w - 12) / 4), 30, 2.4), fill(NIGHT.brass));
  c.restore();
  c.drawPath(cloth, stroke(NIGHT.brass, 1.4));
  c.drawPath(cloth, stroke(INK, 0.5));
  c.drawPath(line(0, 4, w, 4), stroke(INK, 3));
  c.drawPath(line(0, 4, w, 4), stroke(NIGHT.brass, 1.6));
  for (const x of [1, w - 1]) c.drawPath(circle(x, 4, 1.8), fill(NIGHT.brassLight));
  at(c, w / 2, 17, 1, 0, (q) => drawFestivalLantern(q, !!o.lit));
}

/** The Festival's lantern (centred, about 20 pt tall): unlit paper until the Festival is filled. */
export function drawFestivalLantern(c: SkCanvas, lit2: boolean, r = 7.2): void {
  drawLantern(c, r, { look: lit2 ? 'lit' : 'unlit', tassel: true, glow: 1 });
  if (!lit2) c.drawPath(oval(0, 0, r * 0.35, r * 0.5), fill(alpha(NIGHT.amber, 0.35)));
}

// ---------------------------------------------------------------------------
// The board
// ---------------------------------------------------------------------------

/** The board's base under all cells (top-left origin), `cols` x `rows` of `cell` points: a teal tray with a thin brass edge. */
export function drawBoardBase(c: SkCanvas, cols: number, rows: number, cell: number): void {
  const w = cols * cell;
  const h = rows * cell;
  c.drawPath(rrect(-3, -3, w + 6, h + 6, 8), fill(NIGHT.tealDeep));
  c.drawPath(rrect(-3, -3, w + 6, h + 6, 8), stroke(alpha(NIGHT.brass, 0.7), 1));
}

/** One cell tile, side s, centred: a rounded square a shade lighter than the board, lit from above. */
export function drawCellTile(c: SkCanvas, s: number): void {
  const r = s / 2 - 1.2;
  const t = rrect(-r, -r, r * 2, r * 2, s * 0.12);
  c.drawPath(t, fill(NIGHT.tealCell));
  c.save();
  clip(c, t);
  c.drawPath(rrect(-r, -r, r * 2, s * 0.1, 0), fill(alpha(NIGHT.tealLift, 0.9)));
  c.drawPath(rrect(-r, r - s * 0.06, r * 2, s * 0.06, 0), fill(alpha(NIGHT.tealDeep, 0.7)));
  c.restore();
}

/** Where the next shutter's condition and price go (centred tag), for a cell of side s. */
export function shutterTag(s: number): { x: number; y: number; w: number; h: number } {
  return { x: -s * 0.42, y: -s * 0.2, w: s * 0.84, h: s * 0.4 };
}

/**
 * A shutter over a closed cell, side s, centred: rolled slats with a brass pull. `next`: the one
 * that can be opened now, lighter, with a paper tag (`shutterTag`) for its condition and price.
 */
export function drawShutter(c: SkCanvas, s: number, o: { next?: boolean } = {}): void {
  const r = s / 2 - 1.2;
  const body = rrect(-r, -r, r * 2, r * 2, s * 0.1);
  const base = o.next ? NIGHT.stoneLight : mix(NIGHT.stoneDeep, NIGHT.tealDeep, 0.45);
  c.drawPath(body, fill(base));
  c.save();
  clip(c, body);
  const n = 7;
  for (let i = 0; i < n; i++) {
    const y = -r + (2 * r * i) / n;
    c.drawPath(rrect(-r, y, r * 2, (2 * r) / n - 1, 0), fill(o.next ? NIGHT.paperShade : mix(NIGHT.stoneDeep, NIGHT.teal, 0.3)));
    c.drawPath(line(-r, y + (2 * r) / n - 1, r, y + (2 * r) / n - 1), stroke(alpha(INK, 0.4), 0.7));
  }
  c.drawPath(rrect(-r, -r, r * 2, s * 0.13, 0), fill(o.next ? NIGHT.stone : mix(NIGHT.stoneDeep, NIGHT.tealDeep, 0.6)));
  c.restore();
  c.drawPath(body, stroke(INK, 1));
  if (o.next) {
    const t = shutterTag(s);
    c.drawPath(rrect(t.x, t.y, t.w, t.h, 3), fill(NIGHT.paperLight));
    c.drawPath(rrect(t.x, t.y, t.w, t.h, 3), stroke(NIGHT.brass, 1.2));
    c.drawPath(circle(0, t.y - 2.4, 1.4), fill(NIGHT.brass));
  }
  shape(c, rrect(-s * 0.1, r - s * 0.12, s * 0.2, s * 0.06, 1), NIGHT.brass, 0.8);
}

/** The moon-gate season block (2.11), side s, centred: a stone gate with a round opening. */
export function drawStoneGate(c: SkCanvas, s: number): void {
  const r = s / 2 - 1.2;
  const body = rrect(-r, -r, r * 2, r * 2, s * 0.08);
  lit(c, body, NIGHT.stoneDeep, NIGHT.stone, 0, -1.2, 1);
  c.save();
  clip(c, body);
  for (let y = -r + s * 0.25; y < r; y += s * 0.25) c.drawPath(line(-r, y, r, y), stroke(alpha(INK, 0.35), 0.8));
  c.restore();
  c.drawPath(circle(0, s * 0.04, s * 0.3), fill(NIGHT.indigoDeep));
  c.save();
  clip(c, circle(0, s * 0.04, s * 0.3));
  glow(c, s * 0.08, -s * 0.06, s * 0.2, NIGHT.moon, 0.6);
  c.drawPath(circle(s * 0.08, -s * 0.06, s * 0.08), fill(NIGHT.moon));
  c.restore();
  c.drawPath(circle(0, s * 0.04, s * 0.3), stroke(NIGHT.stoneLight, 2));
  c.drawPath(circle(0, s * 0.04, s * 0.3), stroke(INK, 0.8));
}

/** The hearth season block (2.11), side s, centred: an iron brazier with embers on a stone slab. */
export function drawBrazier(c: SkCanvas, s: number): void {
  const k = s / 48;
  at(c, 0, 0, k, 0, (q) => {
    q.drawPath(rrect(-21, -21, 42, 42, 4), fill(NIGHT.stoneDeep));
    q.drawPath(rrect(-21, -21, 42, 42, 4), stroke(INK, 1));
    glow(q, 0, -4, 22, NIGHT.amber, 0.7);
    for (const x of [-9, 9]) q.drawPath(line(x, 8, x * 1.4, 17), stroke(INK, 3));
    const bowl = builder().moveTo(-15, -4).lineTo(15, -4).quadTo(13, 10, 0, 10).quadTo(-13, 10, -15, -4).close().build();
    lit(q, bowl, '#3E4458', '#5A6278', -1, -1);
    for (const [x, y, r] of [[-7, -6, 4], [0, -7.4, 4.6], [7, -6, 4]] as const) shape(q, circle(x, y, r), '#4A3130', 1);
    for (const [x, y] of [[-6, -7], [1, -9], [6, -6]] as const) q.drawPath(circle(x, y, 1.6), fill(NIGHT.amber));
    for (const x of [-4, 4]) {
      const f = builder().moveTo(x - 3, -8).quadTo(x - 3, -15, x, -19).quadTo(x + 3, -15, x + 3, -8).close().build();
      shape(q, f, NIGHT.amber, 0.9);
    }
  });
}

// ---------------------------------------------------------------------------
// Bottom row and small props (centred)
// ---------------------------------------------------------------------------

/** The Basket (the sell target), centred, about 34 pt wide at s = 48. */
export function drawBasket(c: SkCanvas, s = 48): void {
  at(c, 0, 0, s / 48, 0, (q) => {
    q.drawPath(arc(0, -2, 13, 180, 180), stroke(INK, 3.4));
    q.drawPath(arc(0, -2, 13, 180, 180), stroke(NIGHT.bamboo, 1.8));
    const body = builder().moveTo(-17, -2).lineTo(17, -2).lineTo(13, 14).lineTo(-13, 14).close().build();
    lit(q, body, NIGHT.bambooDeep, NIGHT.bamboo, 0, -1.2);
    q.save();
    clip(q, body);
    for (let y = 1; y < 14; y += 4) q.drawPath(line(-17, y, 17, y), stroke(alpha(INK, 0.35), 0.8));
    for (let x = -14; x <= 14; x += 4) q.drawPath(line(x, -2, x * 0.8, 14), stroke(alpha(NIGHT.bambooDeep, 0.7), 0.8));
    q.restore();
    q.drawPath(rrect(-18.4, -4.4, 36.8, 4.4, 2), fill(NIGHT.bambooDeep));
    q.drawPath(rrect(-18.4, -4.4, 36.8, 4.4, 2), stroke(INK, 1));
  });
}

/** The undo chip (centred, w x h): a paper pill with a curved back arrow at its left. */
export function drawUndoChip(c: SkCanvas, w = 56, h = 22): void {
  c.drawPath(rrect(-w / 2 + 1, -h / 2 + 1.4, w, h, h / 2), fill(alpha(INK, 0.5)));
  c.drawPath(rrect(-w / 2, -h / 2, w, h, h / 2), fill(NIGHT.paperLight));
  c.drawPath(rrect(-w / 2, -h / 2, w, h, h / 2), stroke(NIGHT.brass, 1.2));
  const x = -w / 2 + h / 2 + 2;
  const r = h * 0.24;
  c.drawPath(arc(x, 0, r, 160, 240), stroke(NIGHT.indigo, 1.8));
  c.drawPath(poly([x - r - 2.6, -1.4, x - r + 1.8, -1.6, x - r - 0.6, 2.4]), fill(NIGHT.indigo));
}

/**
 * The gift bag (5.5), centred in a 48 pt square: a folded paper bag with rope handles, its `slots`
 * (3, or 4 with lantern 14) shown as round windows on its front.
 */
export function drawGiftBag(c: SkCanvas, slots: 3 | 4 = 3, s = 48): void {
  at(c, 0, 0, s / 48, 0, (q) => {
    for (const sgn of [-1, 1]) q.drawPath(arc(sgn * 5.6, -12, 4.4, 180, 180), stroke(INK, 2.4));
    for (const sgn of [-1, 1]) q.drawPath(arc(sgn * 5.6, -12, 4.4, 180, 180), stroke(NIGHT.brass, 1.1));
    const body = builder().moveTo(-14, -12).lineTo(14, -12).lineTo(16, 17).lineTo(-16, 17).close().build();
    lit(q, body, NIGHT.paperShade, NIGHT.paper, -1, -1);
    q.drawPath(builder().moveTo(-14, -12).lineTo(14, -12).lineTo(14.4, -6).lineTo(-14.4, -6).close().build(), fill(NIGHT.teal));
    q.drawPath(builder().moveTo(-14, -12).lineTo(14, -12).lineTo(14.4, -6).lineTo(-14.4, -6).close().build(), stroke(INK, 0.9));
    q.drawPath(line(-14.4, -6, 14.4, -6), stroke(NIGHT.brass, 1.2));
    const xs = slots === 4 ? [-9, -3, 3, 9] : [-7.4, 0, 7.4];
    for (const x of xs) {
      q.drawPath(circle(x, 5, 2.6), fill(NIGHT.indigo));
      q.drawPath(circle(x, 5, 2.6), stroke(NIGHT.brass, 1));
      q.drawPath(circle(x - 0.7, 4.3, 0.8), fill(alpha(NIGHT.amber, 0.9)));
    }
    sparkle(q, 11, -16, 2.6, NIGHT.amberPale);
  });
}

/** The Lucky Spark (centred, radius r): an amber four-point spark with a white core and two small ones. */
export function drawLuckySpark(c: SkCanvas, r = 14): void {
  glow(c, 0, 0, r * 1.6, NIGHT.amber, 0.6);
  sparkle(c, 0, 0, r, NIGHT.amber);
  sparkle(c, 0, 0, r * 0.62, NIGHT.flame);
  c.drawPath(circle(0, 0, r * 0.14), fill(NIGHT.white));
  sparkle(c, r * 0.8, -r * 0.7, r * 0.32, NIGHT.amberPale);
  sparkle(c, -r * 0.8, r * 0.6, r * 0.24, NIGHT.amberPale);
}

/** A coin (centred, radius r): brass with a raised rim and a small lantern stamped on it. */
export function drawCoin(c: SkCanvas, r = 6): void {
  c.drawPath(circle(0.4, 0.6, r), fill(alpha(INK, 0.4)));
  c.drawPath(circle(0, 0, r), fill(NIGHT.brass));
  c.drawPath(circle(-r * 0.12, -r * 0.12, r * 0.78), fill(NIGHT.brassLight));
  c.drawPath(circle(0, 0, r * 0.7), stroke(NIGHT.brassDeep, Math.max(0.5, r * 0.1)));
  c.drawPath(oval(0, 0, r * 0.28, r * 0.34), fill(NIGHT.brassDeep));
  c.drawPath(line(-r * 0.16, -r * 0.42, r * 0.16, -r * 0.42), stroke(NIGHT.brassDeep, r * 0.1));
  c.drawPath(line(-r * 0.16, r * 0.42, r * 0.16, r * 0.42), stroke(NIGHT.brassDeep, r * 0.1));
  c.drawPath(circle(0, 0, r), stroke(INK, Math.max(0.6, r * 0.12)));
}

/** The purse (centred, side s): a cloth pouch with a drawstring and a coin peeking out. */
export function drawPurse(c: SkCanvas, s = 24): void {
  at(c, 0, 0, s / 24, 0, (q) => {
    at(q, 4.6, -6.6, 0.55, 0, (k) => drawCoin(k, 6));
    const body = blob([[-3, -6], [3, -6], [9, 2], [7.4, 9.4], [0, 11], [-7.4, 9.4], [-9, 2]], 1);
    lit(q, body, NIGHT.silkDeep, '#5A86C4', -1, -1, 1);
    q.drawPath(curve([[-4, -4.6], [0, -3], [4, -4.6]]), stroke(NIGHT.brass, 1.4));
    q.drawPath(curve([[-4, -6.4], [-6.6, -9.4], [-4.6, -11]]), stroke(NIGHT.brass, 1));
    q.drawPath(curve([[4, -6.4], [6.6, -9.4], [4.6, -11]]), stroke(NIGHT.brass, 1));
    q.drawPath(blob([[-2.6, -6], [2.6, -6], [3.4, -8.4], [0, -9.4], [-3.4, -8.4]], 1), fill(NIGHT.silkLight));
    q.drawPath(blob([[-2.6, -6], [2.6, -6], [3.4, -8.4], [0, -9.4], [-3.4, -8.4]], 1), stroke(INK, 0.9));
  });
}

// ---------------------------------------------------------------------------
// Drag marks (centred on a cell of side s)
// ---------------------------------------------------------------------------

/** A good that matches the one held: a soft amber glow under it and a lit rim. */
export function drawMatchGlow(c: SkCanvas, s: number, k = 1): void {
  glow(c, 0, 0, s * 0.62, NIGHT.amber, 0.55 * k);
  c.drawPath(rrect(-s / 2 + 2.4, -s / 2 + 2.4, s - 4.8, s - 4.8, s * 0.14), stroke(alpha(NIGHT.amberSoft, 0.9 * k), 1.6));
}

/** The cell or target under the finger: a paper-white dashed outline with brass corners. `w`, `h` default to the cell. */
export function drawTargetOutline(c: SkCanvas, w: number, h = w): void {
  const r = Math.min(w, h) * 0.14;
  c.drawPath(rrect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2, r), stroke(alpha(INK, 0.6), 3.4));
  c.drawPath(rrect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2, r), dashed(NIGHT.paperLight, 2, 5, 3));
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
    const x = (sx * w) / 2 - sx * 1;
    const y = (sy * h) / 2 - sy * 1;
    c.drawPath(builder().moveTo(x, y - sy * 7).lineTo(x, y).lineTo(x - sx * 7, y).build(), stroke(NIGHT.brassLight, 2.4));
  }
}

/** The armed good (tap-tap): an amber ring with four ticks round the cell. */
export function drawArmedRing(c: SkCanvas, s: number, k = 1): void {
  const r = s * 0.5 - 1.5;
  glow(c, 0, 0, r * 1.2, NIGHT.amber, 0.35 * k);
  c.drawPath(circle(0, 0, r), stroke(alpha(INK, 0.6), 4));
  c.drawPath(circle(0, 0, r), stroke(NIGHT.amber, 2.4));
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    c.drawPath(line(Math.cos(a) * (r - 3), Math.sin(a) * (r - 3), Math.cos(a) * (r + 3), Math.sin(a) * (r + 3)), stroke(NIGHT.flame, 2));
  }
}

void shade;
