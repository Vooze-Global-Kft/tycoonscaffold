/**
 * High Office ("Proudly Adequate") app icon (office-design.md 7.9, decision D12): a LIGHT ground
 * (unlike Orbit's navy and Lantern Row's dusk): the pale paper fills the tile, a violet signature
 * stroke flies upward, and the giant ribbon-cutting scissors are the only prop. No goose, flag, seal,
 * eagle, ballot box or building; no letters. It must not read as a signing or document utility:
 * the scissors (absurdly big, brass-ringed) and the flourish (a loop-the-loop that leaves the tile)
 * carry the joke. Every piece is the art kit's own drawing (src/ui/decree/art).
 *
 *   A  the flourish rising from the lower left, looping once and flying off the top right; the
 *      scissors lying across the lower right, open, as if about to cut the flourish's tail.
 *   B  the scissors big and upright in the middle, the flourish looping round them and away up.
 *   C  a paper sheet tilted on a pale slate tile, its SIGN strip at the top, the flourish leaving
 *      the strip upward; the scissors pinning the sheet's lower corner.
 *
 * Pure Skia: require() it inside scripts/art/headless.ts. Everything draws into 1024 x 1024.
 * Which candidate ships is `CHOSEN` at the bottom.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { DESK, alpha, mix } from '../../../src/ui/decree/art/palette';
import { at, builder, circle, clip, fill, line, linearPaint, nibPath, rect, rrect, sampleCurve, stroke } from '../../../src/ui/decree/art/pen';
import { drawGiantScissors } from '../../../src/ui/decree/art/emblem.draw';

export const S = 1024;
type Draw = (c: SkCanvas) => void;

/** The paper ground: the cool pale blue-grey, a faint ruling and fibre, a soft lighter centre. */
export function drawPaperGround(c: SkCanvas, ruled = true): void {
  c.drawRect({ x: 0, y: 0, width: S, height: S }, linearPaint(0, 0, S, S, [DESK.paperLight, DESK.paper, mix(DESK.paper, DESK.paperShade, 0.45)], [0, 0.55, 1]));
  if (ruled) for (let y = 150; y < S; y += 96) c.drawPath(line(0, y, S, y), stroke(alpha(DESK.slateLight, 0.28), 4));
  if (ruled) c.drawPath(line(150, 0, 150, S), stroke(alpha(DESK.violet, 0.22), 5));
}

/**
 * The signature: an obvious handwritten name (a tall first stroke, a run of rounded humps, a dip),
 * then the tail flying up and away to the top right, where the pen's nib is still writing it. No
 * closed loop and no crossing (a crossing loop reads as an awareness ribbon).
 */
const SIGNATURE: [number, number][] = [
  [118, 762],
  [150, 640],
  [182, 528],
  [212, 500],
  [232, 560],
  [238, 740],
  [262, 688],
  [288, 650],
  [314, 662],
  [326, 740],
  [350, 690],
  [374, 652],
  [400, 664],
  [410, 740],
  [438, 640],
  [462, 512],
  [486, 508],
  [494, 600],
  [500, 740],
  [528, 690],
  [554, 652],
  [580, 664],
  [592, 740],
  [630, 722],
  [694, 734],
  [762, 690],
  [812, 612],
  [842, 526],
];

/** Draws the signature (points in 1024 space) with a broad violet nib. */
export function drawFlourish(c: SkCanvas, pts: [number, number][] = SIGNATURE, nib = 62, color: string = DESK.violet): void {
  const dense = sampleCurve(pts, 4);
  c.drawPath(nibPath(dense, nib, 40), fill(color));
}

/** A fountain-pen nib writing at (x, y), its point there, the nib running back along `deg` (0 = the nib points up). `s` is its length. */
export function drawWritingNib(c: SkCanvas, x: number, y: number, deg: number, s = 220): void {
  at(c, x, y, s / 100, deg, (q) => {
    const nib = builder().moveTo(0, 0).quadTo(22, 26, 24, 62).lineTo(-24, 62).quadTo(-22, 26, 0, 0).close().build();
    q.drawPath(nib, linearPaint(-24, 0, 24, 0, [DESK.brassLight, DESK.brass, DESK.brassDeep]));
    q.drawPath(nib, stroke(DESK.line, 4));
    q.drawPath(line(0, 4, 0, 40), stroke(DESK.line, 4));
    q.drawPath(circle(0, 42, 5), fill(DESK.line));
    // the section of the pen behind the nib (violet, the ink's colour)
    q.drawPath(rrect(-27, 60, 54, 44, 10), fill(DESK.violetDeep));
    q.drawPath(rrect(-27, 60, 54, 44, 10), stroke(DESK.line, 4));
    q.drawPath(rect(-27, 66, 54, 7), fill(DESK.brass));
  });
}

/** The walnut border band that gives the light tile an edge on a white store page, with a brass bead inside it. */
export function drawBorder(c: SkCanvas, band = 64, wood: 'walnut' | 'baize' = 'walnut'): void {
  const [main, deep, light] = wood === 'walnut' ? [DESK.walnut, DESK.walnutDeep, DESK.walnutLight] : [DESK.baize, DESK.baizeDeep, DESK.baizeLift];
  const frame = builder().addRect({ x: 0, y: 0, width: S, height: S }).addRect({ x: band, y: band, width: S - 2 * band, height: S - 2 * band }).setFillType(1).build();
  c.drawPath(frame, linearPaint(0, 0, S, S, [light, main, deep]));
  c.drawPath(rect(band - 6, band - 6, S - 2 * band + 12, S - 2 * band + 12), stroke(DESK.brass, 10));
  c.drawPath(rect(band + 2, band + 2, S - 2 * band - 4, S - 2 * band - 4), stroke(alpha(DESK.shadow, 0.35), 6));
}

export interface Candidate {
  id: string;
  note: string;
  icon: Draw;
  /** The adaptive layer (transparent; subject within the central 66 %). */
  adaptive: Draw;
  /** The splash (transparent; shown at 200 pt on the baize). */
  splash: Draw;
}

const shrunk = (d: Draw, k: number): Draw => (c) => {
  c.save();
  c.translate(512 * (1 - k), 512 * (1 - k));
  c.scale(k, k);
  d(c);
  c.restore();
};

/** A pale paper disc for the transparent layers: the light ground travels with the subject on the baize launcher colour. */
const disc = (subject: Draw): Draw => (c) => {
  c.drawPath(circle(512, 512, 500), fill(DESK.paperLight));
  c.save();
  clip(c, circle(512, 512, 500));
  subject(c);
  c.restore();
  c.drawPath(circle(512, 512, 496), stroke(DESK.brass, 16));
};

const tipDeg = (pts: [number, number][]): number => {
  const [x0, y0] = pts[pts.length - 2];
  const [x1, y1] = pts[pts.length - 1];
  // the nib points along the stroke's travel; its body trails behind (deg 0 = pointing up)
  return (Math.atan2(x1 - x0, -(y1 - y0)) * 180) / Math.PI + 180;
};

/** A: chunky scissors lying open across the upper left, blades toward the signature's rising tail; the signature low, flying up to the right with the nib still writing. */
const subjectA: Draw = (c) => {
  at(c, 0, 40, 1, 0, (q) => {
    at(q, 430, 330, 7.6, 112, (z) => drawGiantScissors(z, 40, { open: 40, chunky: 2 }));
    drawFlourish(q, SIGNATURE, 50);
    const [x, y] = SIGNATURE[SIGNATURE.length - 1];
    drawWritingNib(q, x, y, tipDeg(SIGNATURE), 200);
  });
};

const SIG_B: [number, number][] = SIGNATURE.map(([x, y]) => [x, y + 40] as [number, number]);

/** B: the chunky scissors standing big and open, upright at the left, the signature passing under their blades and rising with the nib. */
const subjectB: Draw = (c) => {
  at(c, 300, 400, 6.6, -18, (q) => drawGiantScissors(q, 40, { open: 40, chunky: 2 }));
  drawFlourish(c, SIG_B, 50);
  const [x, y] = SIG_B[SIG_B.length - 1];
  drawWritingNib(c, x, y, tipDeg(SIG_B), 200);
};

export const CANDIDATES: Candidate[] = [
  {
    id: 'office-A',
    note: 'walnut border; a handwritten signature flying up to the top right with the nib still writing; chunky scissors lower right',
    icon: (c) => {
      drawPaperGround(c, false);
      subjectA(c);
      drawBorder(c, 64, 'walnut');
    },
    adaptive: shrunk(disc(subjectA), 0.6),
    splash: shrunk(disc(subjectA), 0.86),
  },
  {
    id: 'office-B',
    note: 'walnut border; big chunky scissors upright at the left, the signature under them rising to the right with its nib',
    icon: (c) => {
      drawPaperGround(c, false);
      subjectB(c);
      drawBorder(c, 64, 'walnut');
    },
    adaptive: shrunk(disc(subjectB), 0.6),
    splash: shrunk(disc(subjectB), 0.86),
  },
  {
    id: 'office-C',
    note: 'as A on a baize border band (the desk\'s felt round the paper)',
    icon: (c) => {
      drawPaperGround(c, false);
      subjectA(c);
      drawBorder(c, 72, 'baize');
    },
    adaptive: shrunk(disc(subjectA), 0.6),
    splash: shrunk(disc(subjectA), 0.86),
  },
];

/**
 * CHOSEN: A. At 60 px beside the other three games it is the only light tile (Pizza's cream is
 * warmer and full of a face; Orbit's navy and Lantern Row's dusk are dark), and A's two shapes stay
 * apart: the violet flourish is one bold diagonal and the brass-ringed scissors a second clear
 * silhouette, so it reads as "scissors and a flying signature", a joke, not a pen-and-paper
 * utility. B crowds the scissors inside the loop (a muddle at 60 px); C's sheet with a strip reads
 * as a document app, the thing 7.9 warns against.
 */
export const CHOSEN = 'office-A';

export function chosen(): Candidate {
  return CANDIDATES.find((k) => k.id === CHOSEN) ?? CANDIDATES[0];
}


