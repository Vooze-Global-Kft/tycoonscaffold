/**
 * High Office ("Proudly Adequate") app icon (office-design.md 7.9 as amended by decision D12): a
 * tinted LIGHT ground (unlike Pizza Empire's warm rays, Orbit's navy and Lantern Row's dusk), the
 * pale paper with the violet signature flying upward off the top edge, and the ribbon scissors as the
 * ONLY prop, cutting a green ceremonial ribbon with a bow (a ribbon-cutting). No pen or nib, no frame,
 * no goose, flag, seal, crest, star, eagle, ballot or building; no letters.
 *
 * Round 3 (24 November, after the store judge found the framed sheet, scribble, nib and scissors read
 * as a "Sign PDF" utility at 60 px):
 *   office-flick   the paper hero: the sheet tilted as if just flicked up, its signature's tail off
 *                  the top edge; across the foot the ribbon with its bow, in the scissors' open jaws.
 *   office-shears  the scissors hero: giant scissors on the diagonal, wide open on the ribbon; the
 *                  bow at the left; the signed paper small behind, its signature off the top.
 *   office-snip    the moment after the cut: the scissors standing, the ribbon in two with a gap and
 *                  two snippets flying; the signed paper at the upper right, the bow in front of it.
 *   office-A       the icon as shipped before round 3 (kept until a round-3 variant is chosen).
 *
 * Pure Skia: require() it inside scripts/art/headless.ts. Everything draws into 1024 x 1024.
 * Which candidate ships is `CHOSEN` at the bottom; OFFICE_ICON=<id> overrides it for a run.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { DESK, alpha, mix } from '../../../src/ui/decree/art/palette';
import { at, builder, circle, clip, fill, line, linearPaint, nibPath, radialPaint, rect, rrect, sampleCurve, stroke } from '../../../src/ui/decree/art/pen';
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
  // a tall capital rising from the lower left, rounded over its top and down
  [112, 770],
  [150, 640],
  [186, 520],
  [214, 470],
  [244, 472],
  [256, 540],
  [250, 660],
  [244, 760],
  // two rounded humps (an "m"), slanted a little forward
  [270, 690],
  [300, 640],
  [332, 634],
  [348, 680],
  [348, 760],
  [372, 690],
  [402, 640],
  [434, 636],
  [450, 684],
  [452, 762],
  // a tall open ascender, rounded at the top (no loop, never crossing itself)
  [482, 660],
  [512, 520],
  [534, 476],
  [556, 492],
  [558, 560],
  [552, 680],
  [556, 762],
  // a last hump, then the tail sweeping away under the name and up to the nib
  [582, 690],
  [610, 650],
  [640, 650],
  [656, 700],
  [664, 780],
  [700, 816],
  [760, 800],
  [812, 740],
  [840, 660],
  [850, 580],
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
    at(q, 440, 320, 8.4, 112, (z) => drawGiantScissors(z, 40, { open: 40, chunky: 2.2, darkSteel: true }));
    drawFlourish(q, SIGNATURE, 50);
    const [x, y] = SIGNATURE[SIGNATURE.length - 1];
    drawWritingNib(q, x, y, tipDeg(SIGNATURE), 200);
  });
};

// ---------------------------------------------------------------------------
// Round 3 (after the store judge, 24 November): D12 to the letter. The paper, the violet signature
// flying upward, and the ribbon scissors as the ONLY prop (no pen, no nib, no frame). The ribbon
// they cut is the scissors' own (a ribbon-cutting), in the baize green, with a bow. A tinted light
// ground, never a white tile. Outlines 16 px at 1024 (about 1 px at 60 px).
// ---------------------------------------------------------------------------

const LW = 16;
const INK = DESK.line;
const RIBBON = { main: DESK.green, deep: mix(DESK.green, DESK.baizeDeep, 0.55), light: DESK.greenLight };
type Pt = [number, number];

/** A filled band of width `w` along a smooth curve through `pts`; its ends are cut square to the curve (or slanted by `slant` px). */
function bandPath(pts: Pt[], w: number, slant0 = 0, slant1 = 0) {
  const d = sampleCurve(pts, 6);
  const n = d.length / 2;
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const i0 = Math.max(0, i - 1);
    const i1 = Math.min(n - 1, i + 1);
    let tx = d[i1 * 2] - d[i0 * 2];
    let ty = d[i1 * 2 + 1] - d[i0 * 2 + 1];
    const L = Math.hypot(tx, ty) || 1;
    tx /= L;
    ty /= L;
    const sl = i === 0 ? slant0 : i === n - 1 ? slant1 : 0;
    left.push([d[i * 2] - (ty * w) / 2 - tx * sl, d[i * 2 + 1] + (tx * w) / 2 - ty * sl]);
    right.push([d[i * 2] + (ty * w) / 2 + tx * sl, d[i * 2 + 1] - (tx * w) / 2 + ty * sl]);
  }
  const b = builder().moveTo(left[0][0], left[0][1]);
  for (const [x, y] of left.slice(1)) b.lineTo(x, y);
  for (const [x, y] of right.reverse()) b.lineTo(x, y);
  return b.close().build();
}

/** The ceremonial ribbon along `pts`: an ink rim, the green cloth, a darker underside, a light sheen. */
function drawRibbon(c: SkCanvas, pts: Pt[], w: number, slant0 = 0, slant1 = 0): void {
  const band = bandPath(pts, w, slant0, slant1);
  c.drawPath(band, fill(RIBBON.main));
  c.drawPath(bandPath(pts.map(([x, y]) => [x, y + w * 0.3] as Pt), w * 0.4, slant0, slant1), fill(RIBBON.deep));
  c.drawPath(bandPath(pts.map(([x, y]) => [x, y - w * 0.22] as Pt), w * 0.16, slant0, slant1), fill(alpha(RIBBON.light, 0.9)));
  c.drawPath(band, stroke(INK, LW));
}

/** The bow tied on the ribbon, centred at the knot; `s` 1 = about 330 px wide. */
function drawBow(c: SkCanvas, x: number, y: number, s = 1, deg = 0): void {
  at(c, x, y, s, deg, (q) => {
    const part = (path: ReturnType<typeof builder>, col: string) => {
      const p = path.build();
      q.drawPath(p, fill(col));
      q.drawPath(p, stroke(INK, LW / s));
    };
    for (const m of [-1, 1]) {
      // the tail: falling away below the knot to a swallow-tail
      part(builder().moveTo(-12 * m, 10).lineTo(-70 * m, 170).lineTo(-36 * m, 146).lineTo(-14 * m, 186).lineTo(22 * m, 22).close(), RIBBON.deep);
      // the loop
      part(builder().moveTo(0, 0).cubicTo(-50 * m, -110, -190 * m, -120, -170 * m, -20).cubicTo(-160 * m, 40, -70 * m, 40, 0, 0).close(), RIBBON.main);
      // the inside of the loop
      const inner = builder().moveTo(-30 * m, -6).cubicTo(-70 * m, -62, -140 * m, -70, -134 * m, -26).cubicTo(-128 * m, 6, -78 * m, 10, -30 * m, -6).close().build();
      q.drawPath(inner, fill(RIBBON.deep));
      q.drawPath(builder().moveTo(-60 * m, -78).quadTo(-120 * m, -92, -150 * m, -50).build(), stroke(alpha(RIBBON.light, 0.9), 12 / s));
    }
    const knot = rrect(-34, -36, 68, 72, 22);
    q.drawPath(knot, fill(RIBBON.main));
    q.drawPath(rrect(-22, -24, 30, 20, 10), fill(alpha(RIBBON.light, 0.8)));
    q.drawPath(knot, stroke(INK, LW / s));
  });
}

/** A sheet of the pale paper centred at (x, y), turned `deg`, with a soft shadow, a dog-ear and a few faint rules. */
function drawSheet(c: SkCanvas, x: number, y: number, w: number, h: number, deg: number, shadow: Pt = [26, 34], rules = 4): void {
  at(c, x, y, 1, deg, (q) => {
    const r = 22;
    const ear = Math.min(w, h) * 0.2;
    const sheet = builder()
      .moveTo(-w / 2 + r, -h / 2)
      .lineTo(w / 2 - ear, -h / 2)
      .lineTo(w / 2, -h / 2 + ear)
      .lineTo(w / 2, h / 2 - r)
      .quadTo(w / 2, h / 2, w / 2 - r, h / 2)
      .lineTo(-w / 2 + r, h / 2)
      .quadTo(-w / 2, h / 2, -w / 2, h / 2 - r)
      .lineTo(-w / 2, -h / 2 + r)
      .quadTo(-w / 2, -h / 2, -w / 2 + r, -h / 2)
      .close()
      .build();
    q.save();
    q.translate(shadow[0], shadow[1]);
    q.drawPath(sheet, fill(alpha(DESK.shadow, 0.22)));
    q.restore();
    q.drawPath(sheet, linearPaint(-w / 2, -h / 2, w / 2, h / 2, [DESK.white, DESK.paperLight, DESK.paper], [0, 0.5, 1]));
    for (let i = 0; i < rules; i++) {
      const yy = -h / 2 + h * (0.3 + i * 0.13);
      q.drawPath(line(-w / 2 + w * 0.14, yy, w / 2 - w * 0.14, yy), stroke(alpha(DESK.slateLight, 0.45), 9));
    }
    // the dog-ear, folded down
    const fold = builder().moveTo(w / 2 - ear, -h / 2).lineTo(w / 2 - ear, -h / 2 + ear * 0.86).quadTo(w / 2 - ear, -h / 2 + ear, w / 2 - ear * 0.86, -h / 2 + ear).lineTo(w / 2, -h / 2 + ear).close().build();
    q.drawPath(fold, fill(DESK.paperShade));
    q.drawPath(fold, stroke(INK, LW * 0.8));
    q.drawPath(sheet, stroke(INK, LW));
  });
}

/** The signature with a dark rim under it so it holds on the paper and on the tinted ground alike. */
function drawSignature(c: SkCanvas, pts: Pt[], nib: number, rimOn = true): void {
  const dense = sampleCurve(pts, 4);
  const path = nibPath(dense, nib, 40);
  if (rimOn) c.drawPath(path, stroke(DESK.violetDeep, 10));
  c.drawPath(path, fill(DESK.violet));
}

/** A few cut snippets of ribbon (comic confetti) flying off the cut. */
function drawSnips(c: SkCanvas, pts: [number, number, number][], s = 1): void {
  for (const [x, y, deg] of pts)
    at(c, x, y, s, deg, (q) => {
      const p = rrect(-26, -11, 52, 22, 4);
      q.drawPath(p, fill(RIBBON.main));
      q.drawPath(p, stroke(INK, LW * 0.7 / s));
    });
}

/** The tinted light ground: top colour to bottom colour, with a soft glow behind the subject. */
function drawGround(c: SkCanvas, top: string, bottom: string, glow: Pt = [512, 420]): void {
  c.drawRect({ x: 0, y: 0, width: S, height: S }, linearPaint(0, 0, 0, S, [top, bottom]));
  c.drawRect({ x: 0, y: 0, width: S, height: S }, radialPaint(glow[0], glow[1], 560, [alpha(DESK.white, 0.55), alpha(DESK.white, 0)]));
}

type ScissorsOpts = { open?: number; chunky?: number; darkSteel?: boolean };

/**
 * The giant scissors at (x, y) (the pivot), scale `s`, turned `deg` (0 = blades up), with whatever
 * `between` draws (the ribbon) passing through their open blades: behind one blade, in front of the
 * other, so the ribbon is plainly in the scissors' jaws.
 */
function drawScissorsOn(c: SkCanvas, x: number, y: number, s: number, deg: number, o: ScissorsOpts, between: () => void): void {
  at(c, x, y, s, deg, (z) => drawGiantScissors(z, 40, o));
  between();
  at(c, x, y, s, deg, (z) => {
    z.save();
    clip(z, builder().addRect({ x: 0, y: -70, width: 60, height: 74 }).addCircle(0, 4, 4.6).build());
    drawGiantScissors(z, 40, o);
    z.restore();
  });
}

/**
 * FLICK: the paper tilted as if just flicked up, the signature's tail leaving the top edge; across
 * the foot, the green ribbon with its bow, caught in the open jaws of the giant scissors that come
 * in from the lower right.
 */
const variantFlick: Draw = (c) => {
  drawGround(c, mix(DESK.violetPale, DESK.white, 0.15), mix(DESK.violetPale, DESK.violetLight, 0.55), [470, 380]);
  drawSheet(c, 420, 360, 500, 600, -13);
  drawSignature(c, [
    [220, 540], [242, 450], [270, 400], [296, 410], [300, 480], [296, 560],
    [320, 480], [350, 430], [378, 432], [386, 500], [384, 552],
    [410, 480], [440, 430], [470, 428], [480, 490], [490, 540],
    [540, 552], [600, 500], [650, 380], [682, 230], [706, 70], [726, -100],
  ], 70);
  drawScissorsOn(c, 720, 690, 6.9, -36, { open: 48, chunky: 2.4, darkSteel: true }, () => {
    drawRibbon(c, [[-40, 820], [200, 786], [460, 730], [700, 660], [1070, 580]], 110);
    drawBow(c, 190, 790, 0.85, -8);
  });
};

/**
 * SHEARS: the giant scissors fill the tile on the diagonal, wide open on the green ribbon; the bow
 * at the left; the signed paper small behind at the top left, its signature flying off the top edge.
 */
const variantShears: Draw = (c) => {
  drawGround(c, mix(DESK.paperLight, DESK.greenLight, 0.32), mix(DESK.greenLight, DESK.baizeLift, 0.45), [380, 340]);
  drawSheet(c, 320, 290, 370, 440, -10, [18, 24], 3);
  drawSignature(c, [
    [190, 380], [208, 316], [232, 290], [252, 310], [250, 372],
    [272, 316], [300, 294], [320, 326], [322, 380],
    [370, 392], [414, 330], [448, 220], [470, 100], [486, -80],
  ], 56);
  drawScissorsOn(c, 550, 596, 9.4, 40, { open: 50, chunky: 2.4, darkSteel: true }, () => {
    drawRibbon(c, [[-40, 570], [240, 566], [520, 524], [760, 486], [1070, 486]], 116);
    drawBow(c, 190, 572, 0.82, -4);
  });
};

/**
 * SNIP: the moment after the cut. The giant scissors stand at the left, just through the ribbon,
 * whose two halves spring away (the bow on the right half) with two snippets flying; the signed
 * paper tilts the other way at the upper right, its signature flying off the top edge.
 */
const variantSnip: Draw = (c) => {
  drawGround(c, mix(DESK.slatePale, DESK.white, 0.25), mix(DESK.slateLight, DESK.violetLight, 0.3), [600, 300]);
  drawSheet(c, 650, 350, 440, 540, 11, [22, 30], 3);
  drawSignature(c, [
    [470, 420], [492, 340], [520, 300], [546, 314], [548, 380], [546, 430],
    [570, 360], [600, 320], [628, 328], [636, 392], [640, 436],
    [690, 450], [750, 400], [800, 280], [830, 140], [850, -90],
  ], 62);
  drawScissorsOn(c, 300, 606, 8.8, -14, { open: 26, chunky: 2.4, darkSteel: true }, () => {
    drawRibbon(c, [[-40, 600], [120, 596], [230, 560]], 110);
    drawRibbon(c, [[350, 536], [480, 576], [760, 584], [1070, 600]], 110);
    drawBow(c, 760, 588, 0.85, 4);
  });
  drawSnips(c, [[150, 300, -30], [250, 210, 40]], 1.1);
};

export const CANDIDATES: Candidate[] = [
  {
    id: 'office-flick',
    note: 'tilted paper mid-flick, signature off the top edge; along the foot the green ribbon with its bow, in the open jaws of the scissors',
    icon: (c) => variantFlick(c),
    adaptive: shrunk(disc(variantFlick), 0.6),
    splash: shrunk(disc(variantFlick), 0.86),
  },
  {
    id: 'office-shears',
    note: 'giant scissors on the diagonal, wide open on the green ribbon by its bow; the signed paper small behind, signature off the top',
    icon: (c) => variantShears(c),
    adaptive: shrunk(disc(variantShears), 0.6),
    splash: shrunk(disc(variantShears), 0.86),
  },
  {
    id: 'office-snip',
    note: 'the moment after the cut: scissors standing at the left, the ribbon in two with snippets flying; the signed paper upper right, the bow in front of it',
    icon: (c) => variantSnip(c),
    adaptive: shrunk(disc(variantSnip), 0.6),
    splash: shrunk(disc(variantSnip), 0.86),
  },
  // The icon as shipped before round 3 (kept so `final` reproduces it until a round-3 variant is chosen).
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
];

/**
 * CHOSEN: A (redrawn after the art director's look). At 60 px beside the other three games it is
 * the only light tile, and the walnut band with its brass bead gives it an edge on a white or
 * #F2F2F7 store page. Its two shapes stay apart: the violet signature is a cursive name (rounded
 * humps, a tall open ascender, no closed or crossing loop, so it cannot read as an awareness
 * ribbon) whose tail rises to a brass nib still writing it, and the chunky slate-bladed scissors
 * (each blade wider than 3 px at 60 px) lie open over its ascender as if about to snip it: a joke,
 * not a craft or document utility. B stacks the scissors' rings on the name (a muddle at 60 px);
 * C's baize band is darker than the walnut and loses the edge on the dark home screen less well.
 */
export const CHOSEN = 'office-A';

/** The switch: OFFICE_ICON=<candidate id> picks another candidate for `preview` and `final` without editing CHOSEN. */
export function chosen(): Candidate {
  const id = (typeof process !== 'undefined' && process.env && process.env.OFFICE_ICON) || CHOSEN;
  const k = CANDIDATES.find((x) => x.id === id);
  if (!k) throw new Error(`no icon candidate ${id} (have ${CANDIDATES.map((x) => x.id).join(', ')})`);
  return k;
}


