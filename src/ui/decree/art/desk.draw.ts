/**
 * The desk and its objects (office-design.md 3.2, 4.1, 4.3, 5.1, 7.9): one design that grows with
 * the office: the mayor's plain desk (green baize, walnut rim), the governor's mahogany desk with a
 * green lamp, the president's long walnut desk with three telephones; the felt; the door with its
 * glass panel; the in-tray with its count badge; the wire out-tray whose stack grows a sheet per
 * signed paper; the drawer FOR FURTHER STUDY with its counter and its growth stages (a second
 * drawer, a filing cabinet, a photograph of a warehouse); the sticky note; the paperclip; the pen
 * that is the hint pointer; the take-back rest; and the walnut-and-brass desk set (a cosmetic).
 *
 * Conventions: pieces that take w and h draw from their top-left at the origin; "centred" pieces
 * round the origin; the pen's anchor is its nib tip. Words (the drawer's label, the counter, "Next
 * visitor 0:07") are the caller's: each piece leaves a box for them (the *Box functions).
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { DESK, alpha, mix } from './palette';
import { drawLetters, lettersWidth } from './letters';
import {
  LINE,
  arc,
  at,
  builder,
  circle,
  clip,
  dashed,
  dropShadow,
  fill,
  hatch,
  line,
  linearPaint,
  oval,
  poly,
  radialPaint,
  rect,
  rrect,
  seeded,
  shape,
  stroke,
  washed,
  type Box,
} from './pen';

export type OfficeIx = 0 | 1 | 2;
/** The desk set: 'plain' (the office's own wood) or 'walnut' (the Walnut & Brass Desk Set, a cosmetic). */
export type DeskSet = 'plain' | 'walnut';

interface Wood {
  main: string;
  deep: string;
  light: string;
  trim: string;
}

/** The wood of the desk's rim per office (and the cosmetic set). */
export function woodOf(office: OfficeIx, set: DeskSet = 'plain'): Wood {
  if (set === 'walnut') return { main: DESK.walnut, deep: DESK.walnutDeep, light: DESK.walnutLight, trim: DESK.brassLight };
  if (office === 1) return { main: DESK.mahogany, deep: DESK.mahoganyDeep, light: DESK.mahoganyLight, trim: DESK.brass };
  if (office === 2) return { main: DESK.walnut, deep: DESK.walnutDeep, light: DESK.walnutLight, trim: DESK.brass };
  return { main: DESK.walnut, deep: DESK.walnutDeep, light: DESK.walnutLight, trim: DESK.walnutDeep };
}

// ---------------------------------------------------------------------------
// Felt and wood
// ---------------------------------------------------------------------------

/** Green baize over a box: the flat felt and its nap (a fine, seeded cross-weave, very low contrast). */
export function drawBaize(c: SkCanvas, b: Box, seed = 11): void {
  c.drawRect({ x: b.x, y: b.y, width: b.w, height: b.h }, fill(DESK.baize));
  c.save();
  c.clipRect({ x: b.x, y: b.y, width: b.w, height: b.h }, 1, true);
  const p1 = builder();
  for (let x = b.x - b.h; x < b.x + b.w; x += 3) p1.moveTo(x, b.y + b.h).lineTo(x + b.h, b.y);
  c.drawPath(p1.build(), stroke(alpha(DESK.baizeLift, 0.35), 0.5, false));
  const p2 = builder();
  for (let x = b.x; x < b.x + b.w + b.h; x += 3) p2.moveTo(x, b.y + b.h).lineTo(x - b.h, b.y);
  c.drawPath(p2.build(), stroke(alpha(DESK.baizeDeep, 0.35), 0.5, false));
  // a few seeded flecks of lint
  const r = seeded(seed);
  const fl = builder();
  const n = Math.round((b.w * b.h) / 900);
  for (let i = 0; i < n; i++) {
    const x = b.x + r() * b.w;
    const y = b.y + r() * b.h;
    const a = r() * Math.PI;
    fl.moveTo(x, y).lineTo(x + Math.cos(a) * 1.6, y + Math.sin(a) * 1.6);
  }
  c.drawPath(fl.build(), stroke(alpha(DESK.baizeLift, 0.6), 0.5));
  c.restore();
}

/** A wooden board over a box with a seeded grain running along its long side. */
export function drawWood(c: SkCanvas, b: Box, w: Wood, seed = 3): void {
  c.drawRect({ x: b.x, y: b.y, width: b.w, height: b.h }, fill(w.main));
  c.save();
  c.clipRect({ x: b.x, y: b.y, width: b.w, height: b.h }, 1, true);
  const r = seeded(seed);
  const along = b.w >= b.h;
  const len = along ? b.w : b.h;
  const across = along ? b.h : b.w;
  const p = builder();
  for (let k = 0; k < across; k += 2.6) {
    const o = k + (r() - 0.5) * 1.4;
    const amp = 0.6 + r() * 1.2;
    const per = 30 + r() * 50;
    const ph = r() * 6;
    for (let t = 0; t <= len; t += 6) {
      const v = o + Math.sin(t / per + ph) * amp;
      const [x, y] = along ? [b.x + t, b.y + v] : [b.x + v, b.y + t];
      if (t === 0) p.moveTo(x, y);
      else p.lineTo(x, y);
    }
  }
  c.drawPath(p.build(), stroke(alpha(w.deep, 0.32), 0.6, false));
  c.restore();
}

/**
 * The desk surface for the desk canvas (the out-tray band, the paper and the drawer band): baize
 * inside a wooden rim along the left and right edges and a front lip, per office. `b` is the desk
 * canvas's box (points). The president's desk is longer: its rim carries a brass inlay line; the
 * governor's is mahogany with brass corner fittings.
 */
export function drawDesk(c: SkCanvas, b: Box, office: OfficeIx, set: DeskSet = 'plain'): void {
  const w = woodOf(office, set);
  const rim = office === 2 ? 9 : office === 1 ? 8 : 7;
  drawWood(c, b, w);
  const felt = { x: b.x + rim, y: b.y, w: b.w - rim * 2, h: b.h };
  drawBaize(c, felt);
  // the felt's edge sits a little below the wood: a dark line and a lit bevel on the wood
  c.drawPath(line(felt.x, b.y, felt.x, b.y + b.h), stroke(alpha(DESK.shadow, 0.5), 1.2));
  c.drawPath(line(felt.x + felt.w, b.y, felt.x + felt.w, b.y + b.h), stroke(alpha(DESK.shadow, 0.5), 1.2));
  c.drawPath(line(b.x + 1, b.y, b.x + 1, b.y + b.h), stroke(alpha(w.light, 0.7), 1));
  c.drawPath(line(b.x + b.w - 1, b.y, b.x + b.w - 1, b.y + b.h), stroke(alpha(w.deep, 0.8), 1));
  if (office >= 1 || set === 'walnut') {
    // an inlay line in the rim
    c.drawPath(line(b.x + rim / 2, b.y, b.x + rim / 2, b.y + b.h), stroke(alpha(w.trim, 0.75), 0.6));
    c.drawPath(line(b.x + b.w - rim / 2, b.y, b.x + b.w - rim / 2, b.y + b.h), stroke(alpha(w.trim, 0.75), 0.6));
  }
  if (office === 2) {
    // a tooled border on the president's felt
    c.drawPath(rect(felt.x + 3, felt.y + 3, felt.w - 6, felt.h - 6), stroke(alpha(DESK.brassLight, 0.35), 0.7));
  }
}

// ---------------------------------------------------------------------------
// Desk objects of the offices
// ---------------------------------------------------------------------------

/**
 * The governor's green lamp (a banker's lamp, the shade green glass): anchor bottom centre, `h` tall
 * (about 30). `lit` adds a warm pool on the felt (draw it first, under everything, with drawLampPool).
 */
export function drawLamp(c: SkCanvas, h = 30, set: DeskSet = 'plain'): void {
  const k = h / 30;
  const brass = set === 'walnut' ? DESK.brassLight : DESK.brass;
  at(c, 0, 0, k, 0, (q) => {
    washed(q, oval(0, -2, 9, 2.6), brass, DESK.brassDeep, 0.8, 0.8, 0.9);
    q.drawPath(rect(-1.2, -20, 2.4, 18), fill(DESK.brassDeep));
    q.drawPath(rect(-1.2, -20, 2.4, 18), stroke(LINE, 0.7));
    const shade = builder().moveTo(-13, -16).quadTo(-12, -27, 0, -28).quadTo(12, -27, 13, -16).close().build();
    washed(q, shade, DESK.green, mix(DESK.green, DESK.line, 0.4), 1.2, 1.2, 0.9);
    q.drawPath(builder().moveTo(-9, -21).quadTo(-6, -25.4, 0, -26).build(), stroke(alpha(DESK.white, 0.5), 1.1));
    q.drawPath(rect(-13, -16.8, 26, 1.6), fill(brass));
    q.drawPath(line(5, -16, 5, -10), stroke(DESK.brassDeep, 0.7));
    q.drawPath(circle(5, -9.4, 1), fill(brass));
  });
}

/** The lamp's warm pool of light on the felt, centred at the lamp's foot (radius r). */
export function drawLampPool(c: SkCanvas, r = 60): void {
  c.drawCircle(0, 0, r, radialPaint(0, 0, r, [alpha(DESK.mustardLight, 0.22), alpha(DESK.mustardLight, 0.08), alpha(DESK.mustardLight, 0)], [0, 0.55, 1]));
}

/** One old desk telephone, centred at its base, about 24 wide. */
export function drawTelephone(c: SkCanvas, body: string, k = 1): void {
  at(c, 0, 0, k, 0, (q) => {
    dropShadow(q, rrect(-11, -9, 22, 11, 3), 1.2, 1.4, 0.3);
    washed(q, builder().moveTo(-11, 2).lineTo(-8, -8).lineTo(8, -8).lineTo(11, 2).close().build(), body, mix(body, DESK.line, 0.35), 1, 1, 0.9);
    q.drawPath(circle(0, -3.2, 3.6), fill(DESK.paperLight));
    q.drawPath(circle(0, -3.2, 3.6), stroke(LINE, 0.6));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      q.drawPath(circle(Math.cos(a) * 2.5, -3.2 + Math.sin(a) * 2.5, 0.45), fill(LINE));
    }
    const hand = builder().moveTo(-12, -9).quadTo(-12, -13, -8, -12.6).lineTo(8, -12.6).quadTo(12, -13, 12, -9).lineTo(9, -9.6).quadTo(0, -10.6, -9, -9.6).close().build();
    washed(q, hand, body, mix(body, DESK.line, 0.35), 0.6, 0.6, 0.9);
  });
}

/** The president's three telephones in a row (chalk-dark, paper, brass), centred, about 80 wide. */
export function drawTelephones(c: SkCanvas, k = 1): void {
  at(c, 0, 0, k, 0, (q) => {
    at(q, -27, 0, 1, -4, (z) => drawTelephone(z, DESK.chalk));
    at(q, 0, -1, 1, 0, (z) => drawTelephone(z, DESK.paperShade));
    at(q, 27, 0, 1, 5, (z) => drawTelephone(z, DESK.brass));
    // the coiled cords
    q.drawPath(builder().moveTo(-36, 0).quadTo(-42, 6, -36, 9).build(), dashed(LINE, 1, 1.2, 1));
    q.drawPath(builder().moveTo(36, 0).quadTo(42, 6, 36, 9).build(), dashed(LINE, 1, 1.2, 1));
  });
}

/** The desk set of the cosmetic (Walnut & Brass): an inkwell, a blotter rocker and a pen rest, centred, about 60 wide. */
export function drawDeskSet(c: SkCanvas, k = 1): void {
  at(c, 0, 0, k, 0, (q) => {
    dropShadow(q, rrect(-30, -10, 60, 16, 3), 1.2, 1.6, 0.3);
    washed(q, rrect(-30, -10, 60, 16, 3), DESK.walnut, DESK.walnutDeep, 1, 1, 1);
    q.drawPath(rrect(-28, -8, 56, 12, 2), stroke(alpha(DESK.brassLight, 0.8), 0.7));
    // inkwells
    for (const x of [-17, -5]) {
      washed(q, rrect(x - 5, -9, 10, 9, 2), alpha(DESK.glass, 0.9), DESK.glassDeep, 0.8, 0.8, 0.8);
      q.drawPath(rect(x - 3.4, -6, 6.8, 5.4), fill(x < -10 ? DESK.violetDeep : DESK.chalk));
      washed(q, oval(x, -9.6, 3.6, 1.6), DESK.brassLight, DESK.brassDeep, 0.5, 0.5, 0.6);
    }
    // the blotter rocker
    washed(q, builder().moveTo(5, -2).quadTo(15, 3, 25, -2).lineTo(25, -6).lineTo(5, -6).close().build(), DESK.brass, DESK.brassDeep, 0.8, 0.8, 0.8);
    washed(q, rrect(12, -11, 6, 5, 2), DESK.walnutLight, DESK.walnutDeep, 0.6, 0.6, 0.7);
  });
}

// ---------------------------------------------------------------------------
// The door, the trays and the drawer
// ---------------------------------------------------------------------------

/**
 * The top of the office door with its glass panel (w x h from top left; about 118 x 30 in the
 * out-tray band): a wooden frame, frosted glass, a brass push plate. The panel's box for the words
 * ("Next visitor 0:07") is doorGlassBox(w, h). `shadow` (0..1) shows a visitor's shape behind the glass.
 */
export function drawDoor(c: SkCanvas, w: number, h: number, office: OfficeIx = 0, shadow = 0): void {
  const wood = woodOf(office);
  washed(c, rrect(0, 0, w, h, 2), wood.light, wood.main, 1.4, 1.4, 1);
  const g = doorGlassBox(w, h);
  const glass = rrect(g.x, g.y, g.w, g.h, 1.5);
  c.drawPath(glass, linearPaint(0, g.y, 0, g.y + g.h, [mix(DESK.glass, DESK.white, 0.35), DESK.glass]));
  if (shadow > 0) {
    c.save();
    clip(c, glass);
    const sx = g.x + g.w * 0.78;
    c.drawPath(builder().addOval({ x: sx - 5, y: g.y + 2, width: 10, height: 13 }).addRRect({ rect: { x: sx - 10, y: g.y + 13, width: 20, height: 20 }, rx: 8, ry: 8 }).build(), fill(alpha(DESK.slateDeep, 0.35 * shadow)));
    c.restore();
  }
  // frosting: a few soft horizontal streaks
  c.save();
  clip(c, glass);
  for (let y = g.y + 3; y < g.y + g.h; y += 4) c.drawPath(line(g.x, y, g.x + g.w, y - 1), stroke(alpha(DESK.white, 0.18), 1.2));
  c.restore();
  c.drawPath(glass, stroke(LINE, 1));
  c.drawPath(rrect(g.x - 1.8, g.y - 1.8, g.w + 3.6, g.h + 3.6, 2.4), stroke(alpha(DESK.brass, 0.8), 0.8));
}

/** Where the door's words go: the glass panel (w x h from the door's top left). */
export function doorGlassBox(w: number, h: number): Box {
  const m = Math.max(3, Math.round(h * 0.16));
  return { x: m + 1, y: m, w: w - 2 * m - 2, h: h - 2 * m };
}

/** Sheets under the in-tray's top paper: the visible count of edges (1..6) for `count` papers waiting (0..10). */
export function trayEdges(count: number): number {
  return count <= 0 ? 0 : Math.min(6, 1 + Math.floor((count - 1) / 2));
}

/**
 * The in-tray (bottom row, 72 x 60/64): a wooden tray seen from the front-top with the waiting
 * papers' edges (one per two papers, at most 6) and a round count badge at its upper right
 * (inTrayBadge(w, h); the digits are drawn here when `digits` is true, else by the caller).
 */
export function drawInTray(c: SkCanvas, w: number, h: number, count: number, o: { digits?: boolean; full?: boolean } = {}): void {
  const wood = woodOf(0);
  const tw = w * 0.86;
  const tx = (w - tw) / 2;
  const ty = h * 0.42;
  const th = h * 0.42;
  dropShadow(c, rrect(tx, ty, tw, th, 3), 1.5, 2, 0.35);
  // back wall
  washed(c, rrect(tx, ty - 6, tw, 8, 2), wood.main, wood.deep, 0.8, 0.8, 0.9);
  // papers
  const n = trayEdges(count);
  for (let i = 0; i < n; i++) {
    const y = ty + 2 - (n - i) * 2.6;
    const dx = ((i * 37) % 5) - 2;
    washed(c, rrect(tx + 5 + dx, y, tw - 10, th, 1), i === n - 1 ? DESK.paperLight : DESK.paper, DESK.paperShade, 0.6, 0.6, 0.6);
  }
  if (n > 0) for (let i = 0; i < 3; i++) c.drawPath(line(tx + 10, ty - n * 2.6 + 8 + i * 4, tx + tw - 14 - i * 6, ty - n * 2.6 + 8 + i * 4), stroke(DESK.slatePale, 1.4));
  // front lip
  washed(c, builder().moveTo(tx, ty + th * 0.35).lineTo(tx + tw, ty + th * 0.35).lineTo(tx + tw - 2, ty + th).lineTo(tx + 2, ty + th).close().build(), wood.light, wood.main, 0.8, 0.8, 1);
  c.drawPath(rrect(tx + tw / 2 - 7, ty + th * 0.55, 14, 4, 1), fill(DESK.brass));
  c.drawPath(rrect(tx + tw / 2 - 7, ty + th * 0.55, 14, 4, 1), stroke(LINE, 0.6));
  // badge
  const b = inTrayBadge(w, h);
  if (count > 0) {
    c.drawPath(circle(b.x, b.y, b.r + 1.4), fill(DESK.paperLight));
    c.drawPath(circle(b.x, b.y, b.r), fill(o.full ? DESK.violetDeep : DESK.violet));
    if (o.digits) {
      const t = String(Math.min(99, count));
      const size = b.r * 1.05;
      drawLetters(c, t, b.x - lettersWidth(t, { size, tracking: 0.1 }) / 2, b.y + size / 2, { size, color: DESK.white, weight: 0.17, tracking: 0.1 });
    }
  }
}

/** The in-tray's count badge: centre and radius (from the tray's top left). */
export function inTrayBadge(w: number, h: number): { x: number; y: number; r: number } {
  return { x: w * 0.82, y: h * 0.2, r: Math.max(8, h * 0.15) };
}

/** Sheets the out-tray shows for `signed` papers this term: one per paper up to 24, then one per 4 more (a full term of 120 is 48). */
export function outTraySheets(signed: number): number {
  return signed <= 24 ? Math.max(0, signed) : 24 + Math.ceil((signed - 24) / 4);
}

/**
 * The wire out-tray (in the out-tray band, about 150 x 32): a brass wire basket seen from the front,
 * and its stack of signed papers, a sheet per signed paper (outTraySheets), each with a violet tick
 * of a signature at its edge. The stack is drawn first, the wire over it.
 */
export function drawOutTray(c: SkCanvas, w: number, h: number, signed: number): void {
  const n = outTraySheets(signed);
  const depth = Math.min(h * 0.75, n * 0.55);
  const base = h - 3;
  dropShadow(c, rrect(4, base - 4, w - 8, 6, 2), 1.2, 1.6, 0.35);
  for (let i = 0; i < n; i++) {
    const y = base - 2 - (i / Math.max(1, n)) * depth;
    const dx = Math.sin(i * 2.3) * 1.6;
    c.drawPath(rect(8 + dx, y - 1.2, w - 16, 1.4), fill(i % 2 ? DESK.paperLight : DESK.paper));
    c.drawPath(line(8 + dx, y + 0.2, w - 8 + dx, y + 0.2), stroke(alpha(DESK.paperEdge, 0.8), 0.4));
    if (i % 3 === 0) c.drawPath(line(w * 0.62 + dx, y - 0.6, w * 0.7 + dx, y - 1), stroke(alpha(DESK.violet, 0.8), 0.7));
  }
  // the wire basket: a rim and vertical wires, front only
  const top = Math.max(2, base - Math.max(10, depth + 4));
  const wire = stroke(DESK.brassDeep, 1.2);
  const wireLit = stroke(DESK.brassLight, 0.6);
  c.drawPath(rrect(3, top, w - 6, base - top + 1, 3), wire);
  c.drawPath(line(5, top + 0.6, w - 5, top + 0.6), wireLit);
  for (let x = 10; x < w - 6; x += 7) c.drawPath(line(x, top + 1, x, base), stroke(alpha(DESK.brassDeep, 0.9), 0.8));
  c.drawPath(line(3, (top + base) / 2, w - 3, (top + base) / 2), stroke(alpha(DESK.brassDeep, 0.9), 0.8));
  for (const x of [8, w - 8]) c.drawPath(rect(x - 3, base, 6, 2), fill(DESK.brassDeep));
}

/** The drawer's growth stage for the refusals ever (5.1): 0 the drawer, 1 a second drawer (100), 2 a filing cabinet (1,000), 3 a photograph of a warehouse (10,000). */
export function drawerStage(refused: number): 0 | 1 | 2 | 3 {
  return refused >= 10000 ? 3 : refused >= 1000 ? 2 : refused >= 100 ? 1 : 0;
}

/**
 * The drawer FOR FURTHER STUDY (the drawer band, w x h from top left, about 343 x 36..56): the
 * drawer front with a brass pull and a brass card-holder for the label (drawerLabelBox), opened by
 * `open` (0..1: the front drops and the dark inside shows, with papers inside); the stage adds a
 * second drawer, then a filing cabinet, then a pinned photograph of a warehouse, at the right.
 */
export function drawDrawer(c: SkCanvas, w: number, h: number, stage: 0 | 1 | 2 | 3 = 0, open = 0, office: OfficeIx = 0): void {
  const wood = woodOf(office);
  const side = stage >= 2 ? Math.min(64, w * 0.2) : 0;
  const dw = w - side - (side ? 6 : 0);
  const o = Math.max(0, Math.min(1, open));
  const drop = o * h * 0.42;
  // the inside (visible as it opens)
  if (o > 0) {
    c.drawPath(rect(6, 2, dw - 12, h - 4), fill(mix(wood.deep, DESK.shadow, 0.5)));
    for (let i = 0; i < 4; i++) c.drawPath(rect(14 + i * 3, 4 + i * 1.6, dw - 34 - i * 2, 2), fill(alpha(DESK.paper, 0.6 + i * 0.1)));
  }
  // the front
  at(c, 0, drop, 1, 0, (q) => {
    const front = rrect(1, 2, dw - 2, h - 4, 3);
    dropShadow(q, front, 0, 2, 0.35);
    q.drawPath(front, fill(wood.main));
    q.save();
    clip(q, front);
    q.drawPath(rect(1, h * 0.6, dw, h), fill(alpha(wood.deep, 0.35)));
    q.restore();
    q.drawPath(front, stroke(LINE, 1));
    q.drawPath(rrect(5, 5, dw - 10, h - 10, 2), stroke(alpha(wood.light, 0.55), 0.8));
    const L = drawerLabelBox(dw, h);
    washed(q, rrect(L.x - 2, L.y - 2, L.w + 4, L.h + 4, 1.4), DESK.brassLight, DESK.brassDeep, 0.6, 0.6, 0.8);
    q.drawPath(rect(L.x, L.y, L.w, L.h), fill(DESK.paperLight));
    // the pull
    const px = dw - Math.min(44, dw * 0.13);
    washed(q, rrect(px - 14, h / 2 - 3.4, 28, 6.8, 3.4), DESK.brass, DESK.brassDeep, 0.8, 0.8, 0.9);
    q.drawPath(circle(px - 10, h / 2, 1), fill(DESK.brassDeep));
    q.drawPath(circle(px + 10, h / 2, 1), fill(DESK.brassDeep));
  });
  if (stage >= 1 && stage < 2) {
    // a second, smaller drawer peeking under the first, at the right
    const x = dw * 0.62;
    washed(c, rrect(x, h - 5, dw * 0.34, 5, 1.4), wood.light, wood.deep, 0.5, 0.5, 0.8);
    c.drawPath(rrect(x + dw * 0.17 - 5, h - 3.6, 10, 2, 1), fill(DESK.brass));
  }
  if (stage >= 2) {
    const x = w - side;
    // a slate filing cabinet of three drawers
    washed(c, rrect(x, 0, side, h, 2), DESK.slate, DESK.slateDeep, 1.2, 1.2, 1);
    const rows = 3;
    for (let i = 0; i < rows; i++) {
      const y = 2 + (i * (h - 4)) / rows;
      const rh = (h - 4) / rows - 1.5;
      c.drawPath(rrect(x + 3, y, side - 6, rh, 1), stroke(alpha(LINE, 0.6), 0.7));
      c.drawPath(rect(x + side / 2 - 5, y + rh / 2 - 1, 10, 2), fill(DESK.brassLight));
      c.drawPath(rect(x + side / 2 - 4, y + 1, 8, 2.2), fill(DESK.paperLight));
    }
  }
  if (stage >= 3) {
    // a pinned photograph of a warehouse full of drawers, tilted, over the cabinet's corner
    at(c, w - side * 0.55, h * 0.48, 1, 8, (q) => drawWarehousePhoto(q, Math.min(46, side * 0.9), Math.min(h * 0.9, 34)));
  }
}

/** Where the drawer's label and counter go ("FOR FURTHER STUDY (312)"): the card in its brass holder. */
export function drawerLabelBox(dw: number, h: number): Box {
  const lw = Math.min(200, dw * 0.58);
  const lh = Math.max(12, Math.min(18, h * 0.42));
  return { x: Math.round((dw - lw) / 2 - dw * 0.06), y: Math.round((h - lh) / 2), w: Math.round(lw), h: Math.round(lh) };
}

/** A small photograph of a warehouse of filing drawers (the drawer's last stage), centred, w x h. */
export function drawWarehousePhoto(c: SkCanvas, w: number, h: number): void {
  dropShadow(c, rect(-w / 2, -h / 2, w, h), 1, 1.4, 0.35);
  c.drawPath(rect(-w / 2, -h / 2, w, h), fill(DESK.white));
  const i = { x: -w / 2 + 2.5, y: -h / 2 + 2.5, w: w - 5, h: h - 7 };
  c.drawPath(rect(i.x, i.y, i.w, i.h), fill(DESK.slateLight));
  c.save();
  c.clipRect({ x: i.x, y: i.y, width: i.w, height: i.h }, 1, true);
  // the long warehouse in perspective: a roof, rows of cabinets running to a vanishing point
  const vx = i.x + i.w * 0.5;
  const vy = i.y + i.h * 0.42;
  for (let k = 0; k < 7; k++) {
    const t = k / 6;
    c.drawPath(line(i.x + i.w * t, i.y + i.h, vx + (t - 0.5) * 4, vy), stroke(DESK.slateDeep, 0.6));
  }
  for (let k = 0; k < 6; k++) {
    const t = 1 - k / 7;
    const y = vy + (i.y + i.h - vy) * t;
    c.drawPath(line(vx - (vx - i.x) * t, y, vx + (i.x + i.w - vx) * t, y), stroke(alpha(DESK.slateDeep, 0.6), 0.5));
  }
  c.drawPath(poly([i.x, i.y + i.h * 0.25, vx, i.y, i.x + i.w, i.y + i.h * 0.25], false), stroke(DESK.slateDeep, 0.8));
  c.restore();
  c.drawPath(rect(-w / 2, -h / 2, w, h), stroke(alpha(LINE, 0.6), 0.5));
  // the drawing pin
  c.drawPath(circle(0, -h / 2 + 1.5, 1.8), fill(DESK.violet));
  c.drawPath(circle(-0.5, -h / 2 + 1, 0.6), fill(alpha(DESK.white, 0.7)));
}

// ---------------------------------------------------------------------------
// Small things on the desk
// ---------------------------------------------------------------------------

/** The sticky note (w x h from its top left, about 120 x 44, tilted by the caller): a pale yellow square with a curl. Its text box is stickyBox(w, h). */
export function drawStickyNote(c: SkCanvas, w: number, h: number): void {
  const p = builder().moveTo(0, 0).lineTo(w, 0).lineTo(w, h - 7).quadTo(w - 3, h - 2, w - 9, h).lineTo(0, h).close().build();
  dropShadow(c, p, 1, 1.8, 0.3);
  c.drawPath(p, fill(DESK.sticky));
  c.drawPath(rect(0, 0, w, 5), fill(alpha(DESK.stickyDeep, 0.6)));
  c.drawPath(builder().moveTo(w, h - 7).quadTo(w - 6, h - 6, w - 9, h).quadTo(w - 3, h - 2, w, h - 7).close().build(), fill(DESK.stickyDeep));
  c.drawPath(p, stroke(alpha(LINE, 0.35), 0.5));
}

export function stickyBox(w: number, h: number): Box {
  return { x: 6, y: 8, w: w - 14, h: h - 12 };
}

/** The brass paperclip, standing upright, `len` long, centred on its middle. */
export function drawPaperclip(c: SkCanvas, len = 22, color: string = DESK.brass): void {
  const k = len / 22;
  at(c, 0, 0, k, 0, (q) => {
    const p = builder().moveTo(1.6, 6).lineTo(1.6, -7).quadTo(1.6, -10, -1, -10).quadTo(-3.6, -10, -3.6, -7).lineTo(-3.6, 9).quadTo(-3.6, 11, -1, 11).quadTo(3.6, 11, 3.6, 8.4).lineTo(3.6, -5.6).build();
    q.drawPath(p, stroke(DESK.brassDeep, 1.9));
    q.drawPath(p, stroke(color, 1.1));
  });
}

/**
 * The pen: a fountain pen that is the tutorial's hint pointer (8.3 "the tutorial hand is a pen").
 * Anchor: the nib tip at the origin; the pen lies along +y below it (0 deg points straight up, as
 * HintPointerProps' angle). About `len` long (default 64).
 */
export function drawPen(c: SkCanvas, len = 64, set: DeskSet = 'plain'): void {
  const k = len / 64;
  const brass = set === 'walnut' ? DESK.brassLight : DESK.brass;
  at(c, 0, 0, k, 0, (q) => {
    // shadow on the desk
    q.save();
    q.translate(3, 4);
    q.drawPath(rrect(-4.2, 12, 8.4, 50, 4), fill(alpha(DESK.shadow, 0.25)));
    q.restore();
    // nib
    const nib = builder().moveTo(0, 0).quadTo(3.6, 6, 3.8, 12).lineTo(-3.8, 12).quadTo(-3.6, 6, 0, 0).close().build();
    washed(q, nib, DESK.brassLight, DESK.brassDeep, 0.8, 0, 0.8);
    q.drawPath(line(0, 1.6, 0, 8.6), stroke(LINE, 0.6));
    q.drawPath(circle(0, 8.8, 0.8), fill(LINE));
    // section and barrel
    washed(q, rrect(-4.4, 11.6, 8.8, 7, 1.6), DESK.chalk, DESK.chalkDeep, 0.8, 0, 0.8);
    washed(q, rrect(-4.8, 18.4, 9.6, 42, 4.6), DESK.violet, DESK.violetDeep, 1.4, 0, 1);
    q.drawPath(rect(-4.8, 30, 9.6, 2.2), fill(brass));
    q.drawPath(rect(-4.8, 30, 9.6, 2.2), stroke(LINE, 0.5));
    // clip
    q.drawPath(rrect(1.6, 20, 2, 16, 1), fill(brass));
    q.drawPath(rrect(1.6, 20, 2, 16, 1), stroke(LINE, 0.5));
    q.drawPath(line(-2.6, 22, -2.6, 56), stroke(alpha(DESK.white, 0.35), 1.2));
  });
}

/**
 * The take-back rest (4.3: a signed day paper rests 2 s on the out-tray): the signed paper lying
 * slanted on the tray's top, w x h from its top left (about 160 x 30), its violet signature, and a
 * slate ring of the 2 s window drawn by `left` (1 → 0) at its right end.
 */
export function drawTakeBackRest(c: SkCanvas, w: number, h: number, left = 1): void {
  const sheet = poly([6, h * 0.35, w - 8, h * 0.18, w - 4, h - 4, 10, h - 2]);
  dropShadow(c, sheet, 1.5, 2, 0.35);
  washed(c, sheet, DESK.paperLight, DESK.paperShade, 0.8, 0.8, 0.8);
  c.drawPath(builder().moveTo(w * 0.42, h * 0.72).quadTo(w * 0.5, h * 0.4, w * 0.56, h * 0.66).quadTo(w * 0.62, h * 0.8, w * 0.7, h * 0.5).build(), stroke(DESK.violet, 1.4));
  const r = Math.min(9, h * 0.3);
  const cx = w - r - 12;
  const cy = h * 0.55;
  c.drawPath(circle(cx, cy, r), stroke(alpha(DESK.slatePale, 0.9), 2));
  c.drawPath(arc(cx, cy, r, -90, 360 * Math.max(0, Math.min(1, left))), stroke(DESK.slate, 2));
  c.drawPath(builder().moveTo(cx + 3, cy + 3).lineTo(cx + 3, cy - 1).quadTo(cx + 3, cy - 3.6, cx, cy - 3.6).lineTo(cx - 4, cy - 3.6).build(), stroke(DESK.slateDeep, 1.2));
  c.drawPath(poly([cx - 3, cy - 6, cx - 6, cy - 3.6, cx - 3, cy - 1.2]), fill(DESK.slateDeep));
}

/** A faint pencil-ruled hint of the desk's own shadow under the paper (w x h from the paper's top left). */
export function drawPaperShadow(c: SkCanvas, w: number, h: number, lift = 0): void {
  const d = 2 + lift * 6;
  c.drawPath(rrect(d * 0.6, d, w, h, 3), fill(alpha(DESK.shadow, 0.3 - lift * 0.08)));
  void hatch;
}
