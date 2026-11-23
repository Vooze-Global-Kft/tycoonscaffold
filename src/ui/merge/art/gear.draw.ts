/**
 * The six gear icons (spec 2.2: Ember Grill, Copper Urn, Bamboo Steamer, Sugar Pan, Noodle Wok,
 * Lantern Pan), the thin gear rail along the board's top edge (drops rise from it, 4.2), the shelf
 * badge "+n" and the red "waiting" pip. Gear icons are drawn in the 48 pt square of the items atlas
 * (origin at its centre, about 36 pt of drawing); the rail in a strip of `RAIL_H`.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { drawLetters, lettersWidth } from './letters';
import { CHAIN, CHAIN_IDS, NIGHT, alpha, shade, type ChainId } from './palette';
import { INK, arc, at, blob, builder, circle, curve, fill, glow, line, lit, oval, poly, rrect, shape, stroke } from './pen';

const COPPER = '#C47A48';
const COPPER_LIGHT = '#E39C68';
const IRON = '#3E4458';
const IRON_LIGHT = '#5A6278';

/** A soft S-curl of steam rising from (x, y): the same curl as the tea glyph's, never a chevron. */
function steam(c: SkCanvas, x: number, y: number): void {
  c.drawPath(curve([[x, y], [x + 2.2, y - 2.2], [x - 1.4, y - 4.6], [x + 0.8, y - 7]]), stroke(alpha(NIGHT.white, 0.8), 1.3));
}

function emberGrill(c: SkCanvas): void {
  // Legs, box, grate, coals and two small flames.
  for (const x of [-11, 11]) c.drawPath(line(x, 8, x + Math.sign(x) * 3, 16), stroke(INK, 3.2));
  const box = builder().moveTo(-16, -2).lineTo(16, -2).lineTo(13, 10).lineTo(-13, 10).close().build();
  lit(c, box, IRON, IRON_LIGHT, -1, -1.2);
  for (const x of [-8, 0, 8]) c.drawPath(circle(x, 4.4, 1.3), fill(alpha(NIGHT.amber, 0.9)));
  glow(c, 0, -4, 16, NIGHT.amber, 0.55);
  for (const [x, r] of [[-9, 3.6], [-3, 4.2], [3.4, 3.8], [9.2, 3.4]] as const) shape(c, circle(x, -3.6, r), x % 2 ? '#3B2A2A' : '#4A3130', 1);
  for (const [x, y] of [[-6, -4], [1, -5], [7, -3.4]] as const) c.drawPath(circle(x, y, 1.4), fill(NIGHT.amber));
  c.drawPath(line(-17, -3, 17, -3), stroke(INK, 2.6));
  c.drawPath(line(-17, -3, 17, -3), stroke(NIGHT.stoneLight, 1.2));
  for (const [x, h] of [[-4, 9], [4, 7]] as const) {
    const f = builder().moveTo(x - 3, -3).quadTo(x - 3.4, -3 - h * 0.6, x, -3 - h).quadTo(x + 3.4, -3 - h * 0.6, x + 3, -3).close().build();
    shape(c, f, NIGHT.amber, 1);
    c.drawPath(builder().moveTo(x - 1.3, -3).quadTo(x - 1.4, -3 - h * 0.4, x, -3 - h * 0.6).quadTo(x + 1.4, -3 - h * 0.4, x + 1.3, -3).close().build(), fill(NIGHT.flame));
  }
}

function copperUrn(c: SkCanvas): void {
  c.drawPath(rrect(-9, 13, 18, 4, 1.5), fill(IRON));
  c.drawPath(rrect(-9, 13, 18, 4, 1.5), stroke(INK, 1));
  // Spout to the right, handles both sides.
  const spout = builder().moveTo(8, 6).quadTo(16, 6, 18, -2).lineTo(20, -1).quadTo(18, 10, 9, 10).close().build();
  shape(c, spout, COPPER, 1.1);
  for (const sgn of [-1, 1]) c.drawPath(arc(sgn * 11, -6, 3.4, sgn < 0 ? 90 : -90, 180), stroke(INK, 2.4));
  const body = blob([[0, -12], [9, -9], [11, 1], [8, 12], [-8, 12], [-11, 1], [-9, -9]], 1);
  lit(c, body, shade(COPPER, -0.15), COPPER_LIGHT, -1.6, -1.2);
  c.drawPath(line(-10.6, 0, 10.6, 0), stroke(NIGHT.brass, 2.2));
  c.drawPath(line(-10.6, 0, 10.6, 0), stroke(alpha(INK, 0.5), 0.5));
  c.drawPath(oval(0, -12, 6, 1.8), fill(NIGHT.brass));
  c.drawPath(oval(0, -12, 6, 1.8), stroke(INK, 1));
  shape(c, circle(0, -15.4, 2.4), NIGHT.brassLight, 1);
  steam(c, -4, -18);
}

function bambooSteamer(c: SkCanvas): void {
  const col = NIGHT.bamboo;
  for (const y of [8, -1]) {
    const tier = rrect(-16, y - 4, 32, 9, 3);
    lit(c, tier, NIGHT.bambooDeep, col, 0, -1.2);
    for (const x of [-10, -3.4, 3.4, 10]) c.drawPath(line(x, y - 3, x, y + 4), stroke(alpha(INK, 0.35), 0.8));
  }
  const lid = builder().moveTo(-15, -5).quadTo(-13, -15, 0, -16).quadTo(13, -15, 15, -5).close().build();
  lit(c, lid, NIGHT.bambooDeep, shade(col, 0.15), -1, -1.2);
  for (const x of [-6, 0, 6]) c.drawPath(curve([[x * 0.4, -15], [x * 0.8, -10], [x, -5.5]]), stroke(alpha(INK, 0.35), 0.8));
  shape(c, rrect(-3, -19, 6, 3.4, 1.4), NIGHT.wood, 1);
  for (const x of [-8, 7]) steam(c, x, -18.6);
}

function sugarPan(c: SkCanvas): void {
  c.drawPath(line(10, 2, 21, -8), stroke(INK, 4.4));
  c.drawPath(line(10, 2, 21, -8), stroke(NIGHT.woodLight, 2.4));
  const pan = builder().moveTo(-16, -1).lineTo(14, -1).quadTo(13, 10, 0, 10).lineTo(-3, 10).quadTo(-15, 10, -16, -1).close().build();
  lit(c, pan, IRON, IRON_LIGHT, -1, -1);
  c.drawPath(oval(-1, -1, 15, 3.6), fill(shade(CHAIN.sweets.main, -0.1)));
  c.drawPath(oval(-1, -1, 15, 3.6), stroke(INK, 1.1));
  for (const [x, y, r] of [[-8, -2, 2.6], [-2, -3, 2.9], [5, -1.6, 2.5], [-4, 0.4, 2.2]] as const) {
    shape(c, circle(x, y - 1.6, r), CHAIN.sweets.light, 0.9);
  }
  for (const [x, y] of [[-10, -9], [4, -10], [10, -6]] as const) c.drawPath(circle(x, y, 1), fill(NIGHT.white));
}

function noodleWok(c: SkCanvas): void {
  for (const x of [-7, 0, 7]) {
    const f = builder().moveTo(x - 2.6, 17).quadTo(x - 2.4, 13, x, 11).quadTo(x + 2.4, 13, x + 2.6, 17).close().build();
    shape(c, f, NIGHT.amber, 0.9);
  }
  c.drawPath(line(-24, -3, -15, -1), stroke(INK, 4));
  c.drawPath(line(-24, -3, -15, -1), stroke(NIGHT.woodLight, 2));
  const wok = builder().moveTo(-17, -2).lineTo(17, -2).quadTo(14, 11, 0, 11).quadTo(-14, 11, -17, -2).close().build();
  lit(c, wok, IRON, IRON_LIGHT, -1, -1);
  const nood = blob([[-13, -2], [-8, -9], [0, -12], [8, -9], [13, -2]], 1);
  shape(c, nood, CHAIN.noodles.accent, 1);
  for (const y of [-8, -5]) c.drawPath(curve([[-9, y], [-5, y - 2], [-1, y], [3, y - 2], [7, y], [10, y - 1.4]]), stroke(shade(CHAIN.noodles.accent, -0.3), 0.9));
  c.drawPath(line(-18, -2, 18, -2), stroke(INK, 1.4));
}

function lanternPan(c: SkCanvas): void {
  glow(c, 0, 4, 18, NIGHT.amber, 0.5);
  c.drawPath(line(13, 6, 22, 2), stroke(INK, 4));
  c.drawPath(line(13, 6, 22, 2), stroke(NIGHT.woodLight, 2));
  const pan = rrect(-16, 4, 31, 8, 3);
  lit(c, pan, IRON, IRON_LIGHT, -1, -1);
  // The lid is a paper lantern: ribbed dome, brass ring on top.
  const lid = builder().moveTo(-14, 5).cubicTo(-15, -6, -8, -14, 0, -14).cubicTo(8, -14, 15, -6, 14, 5).close().build();
  lit(c, lid, NIGHT.amberDeep, NIGHT.amber, -1.2, -1.2);
  for (const x of [-8, 0, 8]) c.drawPath(curve([[x * 0.35, -13.6], [x * 1.05, -5], [x, 4.6]]), stroke(alpha(INK, 0.45), 0.9));
  c.drawPath(line(-14, 4.6, 14, 4.6), stroke(NIGHT.brass, 2));
  shape(c, rrect(-4, -17.4, 8, 3.6, 1.4), NIGHT.brass, 1);
  c.drawPath(circle(0, -20, 2.2), stroke(INK, 2.2));
  c.drawPath(circle(0, -20, 2.2), stroke(NIGHT.brassLight, 1));
}

const GEAR: Record<ChainId, (c: SkCanvas) => void> = {
  grill: emberGrill,
  tea: copperUrn,
  steamer: bambooSteamer,
  sweets: sugarPan,
  noodles: noodleWok,
  puffs: lanternPan,
};

/** The gear drawings are made about 50 pt across; this fits them inside the 48 pt square with a margin. */
const GEAR_FIT = 0.88;

/** A chain's gear, centred in the 48 pt square (about 40 pt across at s = 1, steam and handles inside the square). */
export function drawGear(c: SkCanvas, chain: ChainId | number, s = 1): void {
  const id = typeof chain === 'number' ? CHAIN_IDS[chain] : chain;
  at(c, 0, 0, s * GEAR_FIT, 0, GEAR[id]);
}

// ---------------------------------------------------------------------------
// The gear rail
// ---------------------------------------------------------------------------

/** Height of the gear rail in points (a thin strip along the board's top edge). */
export const RAIL_H = 7;

/**
 * The gear rail: a brass bar with rivets across `w` points (origin at its left end, centre line at
 * y = 0), with a drop slot (a lit notch) at each x of `slots` (the anchor columns' centres).
 */
export function drawGearRail(c: SkCanvas, w: number, slots: number[] = [], lit2: boolean[] = []): void {
  c.drawPath(rrect(0, -2.6, w, 5.2, 2.6), fill(NIGHT.brassDeep));
  c.drawPath(rrect(0, -2.6, w, 3.6, 1.8), fill(NIGHT.brass));
  c.drawPath(rrect(0, -2.6, w, 5.2, 2.6), stroke(INK, 0.9));
  for (let x = 8; x < w - 4; x += 16) c.drawPath(circle(x, -0.6, 0.8), fill(NIGHT.brassLight));
  slots.forEach((x, i) => drawRailSlot(c, x, lit2[i] ?? false));
}

/** One drop slot of the rail at x: a dark notch, lit amber while a drop rises from it. */
export function drawRailSlot(c: SkCanvas, x: number, on = false): void {
  if (on) glow(c, x, 1, 7, NIGHT.amber, 0.7);
  c.drawPath(rrect(x - 5, -1.4, 10, 3.6, 1.6), fill(on ? NIGHT.amber : NIGHT.ink));
  c.drawPath(rrect(x - 5, -1.4, 10, 3.6, 1.6), stroke(INK, 0.7));
}

// ---------------------------------------------------------------------------
// Shelf badge and waiting pip
// ---------------------------------------------------------------------------

/** The shelf badge "+n" (an amber pill, ink figures), centred on the origin; about 9 pt tall. */
export function drawShelfBadge(c: SkCanvas, n: number): void {
  const text = `+${Math.max(0, Math.round(n))}`;
  const size = 5.2;
  const w = lettersWidth(text, size, 0.22) + 5;
  c.drawPath(rrect(-w / 2, -4.6, w, 9.2, 4.6), fill(NIGHT.amber));
  c.drawPath(rrect(-w / 2, -4.6, w, 9.2, 4.6), stroke(INK, 0.9));
  drawLetters(c, text, 0, -size / 2, { size, color: NIGHT.ink, weight: 0.22, align: 'center' });
}

/** The red "waiting" pip (the gear waits, its shelf is full): a red dot with a paper rim and a pause mark. */
export function drawWaitingPip(c: SkCanvas, r = 4.2): void {
  c.drawPath(circle(0, 0, r + 0.9), fill(NIGHT.paperLight));
  c.drawPath(circle(0, 0, r), fill(NIGHT.red));
  c.drawPath(circle(0, 0, r + 0.9), stroke(INK, 0.8));
  for (const x of [-1.1, 1.1]) c.drawPath(line(x * r * 0.4, -r * 0.42, x * r * 0.4, r * 0.42), stroke(NIGHT.white, r * 0.26));
}

/** The till beside the minder (5.4): a small wooden box whose coin heap rises with `level` 0..4. */
export function drawTill(c: SkCanvas, level: number): void {
  const k = Math.max(0, Math.min(4, Math.round(level)));
  const box = rrect(-6, -2, 12, 8, 1.6);
  lit(c, box, NIGHT.woodDeep, NIGHT.woodLight, -0.6, -0.8, 0.9);
  c.drawPath(line(-2.4, 1, 2.4, 1), stroke(NIGHT.ink, 1));
  // Empty: the open top shows a dark, bare inside; then 2, 3, 5 and 6 coins heaped.
  if (k === 0) c.drawPath(oval(0, -2, 5, 1.3), fill(NIGHT.indigoDeep));
  const heaps: [number, number][] = [[-2.6, -3.4], [2.6, -3.4], [0, -3.8], [-1.4, -5.8], [1.6, -5.8], [0.1, -8]];
  const count = [0, 2, 3, 5, 6][k];
  for (let i = 0; i < count; i++) {
    const [x, y] = heaps[i];
    shape(c, oval(x, y, 2.1, 1.3), NIGHT.brass, 0.7);
  }
}

/** Sizes of the till's fill: the number of fill levels drawTill knows. */
export const TILL_LEVELS = 5;

/** The ribbed stall pole finial (brass), used by the stall fronts. */
export function drawFinial(c: SkCanvas, x: number, y: number): void {
  shape(c, poly([x - 1.8, y + 1, x, y - 3.4, x + 1.8, y + 1]), NIGHT.brass, 0.7);
  c.drawPath(circle(x, y - 3.6, 1), fill(NIGHT.brassLight));
}
