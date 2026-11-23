/**
 * Lantern Row app icon (spec 7.4), revision 3 (store review: at search size the old icon's grey
 * bars and green tick read as a to-do list and its crossed skewers as crossed swords). Three
 * candidates, every piece drawn with the art kit's own drawings (src/ui/merge/art): no image file,
 * no letters, on the game's dusk ground (no stars: Orbit's sky; no cream or tomato red: Pizza's).
 *
 *   A  a paper lantern (ribs, top cap, inner glow, tassel) carrying ONE ticket line (a skewer and
 *      its tier pip) with the red FILLED stamp; below it two honey-glazed skewers leaning together
 *      under the merge sparkle.
 *   B  the merge as the subject: two identical candied berries sliding together into the
 *      sparkle, the finer serving they make (three on a plate) above them in the light of a small
 *      lit lantern on a wire. CHOSEN (see the note at CHOSEN).
 *   C  a night-market stall front (the kit's scalloped awning and its lantern string) with two
 *      noodle bowls meeting in the sparkle on its counter.
 *
 * Pure Skia: require() it inside scripts/art/headless.ts. Everything draws into a 1024 x 1024
 * square (points = pixels at scale 1). Which candidate ships is `CHOSEN` at the bottom.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { GLAZE, drawGlyph, drawGood, drawTierPip } from '../../../src/ui/merge/art/goods.draw';
import { drawLantern } from '../../../src/ui/merge/art/lantern.draw';
import { drawStallFront } from '../../../src/ui/merge/art/stalls.draw';
import { NIGHT, alpha, shade } from '../../../src/ui/merge/art/palette';
import { INK, arc, at, builder, circle, fill, glow, gloss, linearPaint, rrect, sparkle, stroke } from '../../../src/ui/merge/art/pen';
import { drawFilledStamp } from '../../../src/ui/merge/art/street.draw';

export const S = 1024;
type Draw = (c: SkCanvas) => void;

/** The dusk behind: indigo at the top to deep teal at the bottom, a warm lantern glow; no stars (that is Orbit's sky). */
export function drawNightBackdrop(c: SkCanvas, glowX = 512, glowY = 470, glowR = 620): void {
  c.drawRect({ x: 0, y: 0, width: S, height: S }, linearPaint(0, 0, 0, S, ['#2B2D66', NIGHT.indigo, '#16364A', NIGHT.teal], [0, 0.35, 0.75, 1]));
  glow(c, glowX, glowY, glowR, NIGHT.amber, 0.45);
}

// ---------------------------------------------------------------------------------------------
// Pieces built from the kit
// ---------------------------------------------------------------------------------------------

/** Where the skewer glyph's three chunks sit (glyph space; goods.draw.ts `skewer`), each turned 45 degrees. */
const CHUNKS = [-5.6, 0, 5.6].map((d) => ({ x: -0.8 + d * Math.SQRT1_2, y: 0.8 - d * Math.SQRT1_2 }));

/**
 * One skewer (the Grill glyph) at (x, y), scale s, its stick leaning `lean` degrees from upright
 * (negative: top to the left), each chunk glazed in honey (a sheen and a gloss mark
 * on every chunk, as the kit's tier-3 goods shine). The glyph's stick runs at 45 degrees, so it is turned by lean - 45.
 */
export function drawGlazedSkewer(c: SkCanvas, x: number, y: number, s: number, lean: number): void {
  const side: 1 | -1 = lean >= 0 ? 1 : -1;
  at(c, x, y, s, lean - 45, (q) => {
    drawGlyph(q, 'grill');
    // The glaze: a honey sheen and a white gloss mark on every chunk, catching the lantern light.
    for (const ch of CHUNKS) {
      q.drawPath(arc(ch.x - side * 0.5, ch.y - side * 0.5, 2.6, side > 0 ? 160 : 340, 100), stroke(alpha(GLAZE.grill, 0.9), 1.3));
      gloss(q, ch.x - side * 0.9, ch.y - side * 0.9, 1.9, 0.95, side > 0 ? 180 : 0, 60, 0.8);
    }
  });
}

/** The merge sparkle: a warm glow, a white four-point star with an amber core, two small stars. */
export function drawMergeSparkle(c: SkCanvas, x: number, y: number, r: number): void {
  glow(c, x, y, r * 2.2, NIGHT.flame, 0.75);
  sparkle(c, x, y, r * 1.08, INK);
  sparkle(c, x, y, r, NIGHT.white);
  sparkle(c, x, y, r * 0.55, NIGHT.flame);
  sparkle(c, x + r * 0.95, y - r * 0.75, r * 0.34, NIGHT.white);
  sparkle(c, x - r * 0.9, y + r * 0.55, r * 0.26, NIGHT.amberPale);
}

/** Speed streaks behind a good sliding toward the centre (dir +1 slides right, -1 left). */
function streaks(c: SkCanvas, x: number, y: number, len: number, dir: 1 | -1, w: number): void {
  for (const [dy, k] of [[-0.55, 0.7], [0, 1], [0.55, 0.7]] as const) {
    const x0 = x - dir * len * k;
    c.drawPath(builder().moveTo(x0, y + dy * w * 6).lineTo(x, y + dy * w * 6).build(), stroke(alpha(NIGHT.amberPale, 0.75), w));
  }
}

/**
 * ONE ticket line in the game's own language, centred on (x, y), `k` its scale (1 = 300 wide):
 * a strip of the ticket's rice paper with its brass clip, a skewer's picture, its tier pip, and the
 * red FILLED stamp pressed over the right end (no tick of a list, no grey bar).
 */
export function drawTicketLine(c: SkCanvas, x: number, y: number, k = 1): void {
  at(c, x, y, k, -4, (q) => {
    const w = 300;
    const h = 128;
    q.drawPath(rrect(-w / 2 + 8, -h / 2 + 12, w, h, 18), fill(alpha(INK, 0.4)));
    q.drawPath(rrect(-w / 2, -h / 2, w, h, 18), fill(NIGHT.paper));
    q.drawPath(rrect(-w / 2, -h / 2, w, 14, 7), fill(alpha(NIGHT.paperShade, 0.8)));
    q.drawPath(rrect(-w / 2, -h / 2, w, h, 18), stroke(INK, 11));
    // The good and its pip, as a ticket line shows them.
    at(q, -78, -8, 4.1, 0, (z) => drawGlyph(z, 'grill'));
    drawTierPip(q, 3, -78, 42, 4.2);
    // The FILLED stamp over the right half (word-free: the kit's stamp with its tick, in red ink).
    at(q, 68, 2, 1, 0, (z) => {
      z.drawPath(circle(0, 0, 58), fill(alpha(NIGHT.paperLight, 0.6)));
      drawFilledStamp(z, 56);
    });
  });
}

// ---------------------------------------------------------------------------------------------
// Candidate A: the lantern carrying a ticket line, two glazed skewers leaning together below
// ---------------------------------------------------------------------------------------------

export function drawIconA(c: SkCanvas, o: { backdrop?: boolean } = {}): void {
  if (o.backdrop !== false) drawNightBackdrop(c, 512, 300, 600);
  const cx = 512;
  const cy = 268;
  const r = 186;
  // The lantern (kit drawing: ribs, brass caps, inner glow, tassel) on a cord from the top edge.
  at(c, cx, cy, 1, 0, (q) => drawLantern(q, r, { look: 'lit', glow: 1, cord: 120, tassel: true }));
  drawTicketLine(c, cx, cy + 8, 0.92);
  // Two honey-glazed skewers leaning together, the merge sparkle where their tips meet.
  glow(c, 512, 800, 330, NIGHT.amber, 0.3);
  drawGlazedSkewer(c, 512 - 128, 872, 15, 24);
  drawGlazedSkewer(c, 512 + 128, 872, 15, -24);
  drawMergeSparkle(c, 512, 664, 70);
}

// ---------------------------------------------------------------------------------------------
// Candidate B: two identical goods sliding together into one finer good, a lantern on a wire
// ---------------------------------------------------------------------------------------------

export function drawIconB(c: SkCanvas, o: { backdrop?: boolean; chain?: number; layer?: boolean } = {}): void {
  const chain = o.chain ?? 3;
  if (o.backdrop !== false) drawNightBackdrop(c, 512, 420, 600);
  // A small lit lantern on a wire across the top (the adaptive layer: on its cord alone, inside the safe circle).
  if (!o.layer) c.drawPath(builder().moveTo(-40, 20).quadTo(512, 116, 1064, 20).build(), stroke(INK, 10));
  at(c, 512, 152, 1, 0, (q) => drawLantern(q, 80, { look: 'lit', glow: o.layer ? 0.4 : 1, cord: o.layer ? 24 : 8, tassel: false }));
  // The finer good the two make, in the lantern's light (the kit's tier-5 serving: three on a plate).
  if (!o.layer) glow(c, 512, 440, 330, NIGHT.flame, 0.7);
  at(c, 512, 456, 10.4, 0, (q) => drawGood(q, chain, 5, { pip: false }));
  // The two identical goods sliding together below, the sparkle between them.
  streaks(c, 92, 800, 60, 1, 16);
  streaks(c, 932, 800, 60, -1, 16);
  at(c, 268, 800, 13, 0, (q) => drawGlyph(q, chain));
  at(c, 756, 800, 13, 0, (q) => drawGlyph(q, chain));
  drawMergeSparkle(c, 512, 800, 80);
}

// ---------------------------------------------------------------------------------------------
// Candidate C: a night-market stall, the merge on its counter
// ---------------------------------------------------------------------------------------------

export function drawIconC(c: SkCanvas, o: { backdrop?: boolean; chain?: number } = {}): void {
  const chain = o.chain ?? 4;
  if (o.backdrop !== false) drawNightBackdrop(c, 512, 520, 640);
  // The stall front (the kit's, top awning state: scalloped awning, a string of lanterns), cropped by the edges.
  at(c, 512, 400, 21, 0, (q) => drawStallFront(q, chain, { awning: 2 }));
  // On the counter: two identical bowls meeting in the merge sparkle.
  glow(c, 512, 720, 320, NIGHT.amber, 0.4);
  at(c, 300, 730, 14, 0, (q) => drawGlyph(q, chain));
  at(c, 724, 730, 14, 0, (q) => drawGlyph(q, chain));
  drawMergeSparkle(c, 512, 650, 84);
}

// ---------------------------------------------------------------------------------------------
// The shipped set
// ---------------------------------------------------------------------------------------------

export interface Candidate {
  id: string;
  note: string;
  icon: Draw;
  /** The subject with no backdrop, in the 1024 square (the adaptive layer shrinks it). */
  subject: Draw;
  /** How much the adaptive layer shrinks the subject so it stays inside the 66 dp safe circle. */
  adaptiveScale: number;
}

export const CANDIDATES: Candidate[] = [
  {
    id: 'A',
    note: 'paper lantern carrying one ticket line (skewer, pip, red FILLED stamp); two glazed skewers leaning together under the merge sparkle',
    icon: (c) => drawIconA(c),
    subject: (c) => drawIconA(c, { backdrop: false }),
    adaptiveScale: 0.44,
  },
  {
    id: 'B',
    note: 'two identical candied berries sliding together into the sparkle, the finer serving they make (three on a plate) above in the light of a small lantern on a wire',
    icon: (c) => drawIconB(c),
    subject: (c) => drawIconB(c, { backdrop: false, layer: true }),
    adaptiveScale: 0.53,
  },
  {
    id: 'C',
    note: 'a night-market stall front (blue-white scalloped awning, its lantern string) with two noodle bowls meeting in the sparkle on its counter',
    icon: (c) => drawIconC(c),
    subject: (c) => drawIconC(c, { backdrop: false }),
    adaptiveScale: 0.4,
  },
];

/**
 * B ships (revision 3): at 60 px it is the only candidate that reads as food (pink berries on a white
 * plate), as a merge (two identical goods and a sparkle, the plate of three above them) and still
 * carries the lit lantern; A's lantern reads first but its skewers become two thin legs, and C's
 * stall reads as a shop whose bowls are too small to see.
 */
export const CHOSEN = 'B';

function chosen(): Candidate {
  const k = CANDIDATES.find((x) => x.id === CHOSEN);
  if (!k) throw new Error(`no candidate ${CHOSEN}`);
  return k;
}

/** The adaptive layer of a candidate: its subject shrunk about the centre, transparent around it. */
export function adaptiveOf(k: Candidate): Draw {
  return (c) =>
    at(c, 512, 512, k.adaptiveScale, 0, (q) => {
      q.translate(-512, -512);
      k.subject(q);
    });
}

/** The chosen set: full-bleed icon, adaptive layer (subject in the central 66 %), splash (the same subject, transparent). */
export const drawChosenIcon: Draw = (c) => chosen().icon(c);
export const drawChosenAdaptive: Draw = (c) => adaptiveOf(chosen())(c);
export const drawChosenSplash = drawChosenAdaptive;
