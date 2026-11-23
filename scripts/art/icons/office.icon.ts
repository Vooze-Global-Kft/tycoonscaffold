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
import { at, builder, circle, clip, fill, hatch, line, linearPaint, nibPath, rect, rrect, sampleCurve, stroke } from '../../../src/ui/decree/art/pen';
import { drawGiantScissors } from '../../../src/ui/decree/art/emblem.draw';
import { drawStrip } from '../../../src/ui/decree/art/paper.draw';

export const S = 1024;
type Draw = (c: SkCanvas) => void;

/** The paper ground: the cool pale blue-grey, a faint ruling and fibre, a soft lighter centre. */
export function drawPaperGround(c: SkCanvas, ruled = true): void {
  c.drawRect({ x: 0, y: 0, width: S, height: S }, linearPaint(0, 0, S, S, [DESK.paperLight, DESK.paper, mix(DESK.paper, DESK.paperShade, 0.45)], [0, 0.55, 1]));
  if (ruled) for (let y = 150; y < S; y += 96) c.drawPath(line(0, y, S, y), stroke(alpha(DESK.slateLight, 0.28), 4));
  if (ruled) c.drawPath(line(150, 0, 150, S), stroke(alpha(DESK.violet, 0.22), 5));
}

/** The flourish: points of a signature-like stroke that loops once and flies up and away. */
const FLOURISH: [number, number][] = [
  [90, 700],
  [200, 640],
  [330, 520],
  [400, 380],
  [380, 270],
  [290, 250],
  [240, 340],
  [300, 430],
  [430, 450],
  [580, 380],
  [720, 260],
  [860, 140],
  [1000, 40],
];

/** Draws the flourish (points in 1024 space) with a broad violet nib, plus a few ink drops flung off its end. */
export function drawFlourish(c: SkCanvas, pts: [number, number][] = FLOURISH, nib = 70, color: string = DESK.violet): void {
  const dense = sampleCurve(pts, 4);
  c.drawPath(nibPath(dense, nib, 40), fill(color));
  const [x, y] = pts[pts.length - 2];
  for (const [dx, dy, r] of [
    [60, -10, 14],
    [30, 40, 9],
    [95, 25, 7],
  ] as const)
    c.drawPath(circle(x + dx, y + dy, r), fill(color));
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

const subjectA: Draw = (c) => {
  drawFlourish(c, FLOURISH, 78);
  at(c, 640, 690, 8.6, -48, (q) => drawGiantScissors(q, 40, { open: 36 }));
};
const subjectB: Draw = (c) => {
  drawFlourish(
    c,
    [
      [150, 900],
      [300, 860],
      [470, 800],
      [700, 720],
      [820, 560],
      [700, 420],
      [560, 470],
      [620, 560],
      [780, 470],
      [880, 260],
      [960, 70],
    ],
    90,
  );
  at(c, 400, 520, 9.4, -12, (q) => drawGiantScissors(q, 40, { open: 30 }));
};
const subjectC: Draw = (c) => {
  at(c, 512, 560, 1, -8, (q) => {
    q.drawPath(rrect(-330 + 18, -400 + 26, 660, 800, 30), fill(alpha(DESK.shadow, 0.25)));
    q.drawPath(rrect(-330, -400, 660, 800, 30), fill(DESK.paperLight));
    q.drawPath(rrect(-330, -400, 660, 800, 30), stroke(DESK.paperEdge, 8));
    at(q, -300, -370, 9.4, 0, (z) => drawStrip(z, 64, 22, 'sign', { armed: 0.6 }));
  });
  drawFlourish(
    c,
    [
      [260, 330],
      [360, 260],
      [430, 330],
      [520, 250],
      [600, 300],
      [700, 200],
      [830, 110],
      [990, 20],
    ],
    80,
  );
  at(c, 300, 860, 6.6, -40, (q) => drawGiantScissors(q, 40, { open: 30 }));
};

export const CANDIDATES: Candidate[] = [
  {
    id: 'office-A',
    note: 'flourish loops up and away to the top right; scissors across the lower right about to snip its tail',
    icon: (c) => {
      drawPaperGround(c, false);
      subjectA(c);
    },
    adaptive: shrunk(disc(subjectA), 0.6),
    splash: shrunk(disc(subjectA), 0.86),
  },
  {
    id: 'office-B',
    note: 'scissors big and upright in the middle, the flourish looping round them',
    icon: (c) => {
      drawPaperGround(c, false);
      subjectB(c);
    },
    adaptive: shrunk(disc(subjectB), 0.6),
    splash: shrunk(disc(subjectB), 0.86),
  },
  {
    id: 'office-C',
    note: 'a paper tilted on a pale slate tile, the flourish leaving its SIGN strip; scissors pin its corner',
    icon: (c) => {
      c.drawRect({ x: 0, y: 0, width: S, height: S }, fill(mix(DESK.slatePale, DESK.paperLight, 0.4)));
      hatch(c, rect(0, 0, S, S), alpha(DESK.slateLight, 0.25), 40, 6);
      subjectC(c);
    },
    adaptive: shrunk(disc(subjectC), 0.6),
    splash: shrunk(disc(subjectC), 0.86),
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

void builder;
