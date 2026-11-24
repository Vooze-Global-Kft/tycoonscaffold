/**
 * High Office ("Proudly Adequate") app icon (office-design.md 7.9 as amended by decision D12): a
 * tinted LIGHT ground (unlike Pizza Empire's warm rays, Orbit's navy and Lantern Row's dusk), the
 * pale paper with the violet signature flying upward off the top edge, and the ribbon scissors as the
 * ONLY prop, cutting a green ceremonial ribbon with a bow (a comic ribbon-cutting). No pen or nib, no
 * frame, no goose, flag, seal, crest, star, eagle, ballot or building; no letters.
 *
 * The chosen design is "office-snip" (round 3, chosen by the icon judge on 24 November, then finished
 * to the judge's list): the moment after the cut. Absurdly big scissors stand at the left, just through
 * the ribbon; its two cut ends fork into swallowtails and curl away from the blades, one offcut flies
 * up-left, a walnut "snip" burst marks the cut; the signed paper tilts at the upper right, its
 * signature (uneven humps, one small loop, spelling nothing) flying off the top edge; the bow sits on
 * the right-hand piece of ribbon.
 *
 * The other round-3 variants (office-flick, office-shears) and the shipped-before icon (office-A, with
 * its frame and nib) were removed once office-snip was chosen; they are in git history (commit 733cf1d).
 *
 * Pure Skia: require() it inside scripts/art/headless.ts. Everything draws into 1024 x 1024.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { DESK, alpha, mix } from '../../../src/ui/decree/art/palette';
import { at, builder, circle, clip, fill, linearPaint, nibPath, radialPaint, rrect, sampleCurve, stroke, line } from '../../../src/ui/decree/art/pen';
import { drawGiantScissors } from '../../../src/ui/decree/art/emblem.draw';

export const S = 1024;
type Draw = (c: SkCanvas) => void;
type Pt = [number, number];

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

/** A disc of the icon's own ground for the transparent layers, with a brass rim: the light tile travels with the subject on the baize launcher colour. */
const disc = (subject: Draw): Draw => (c) => {
  c.save();
  clip(c, circle(512, 512, 500));
  subject(c);
  c.restore();
  c.drawPath(circle(512, 512, 496), stroke(DESK.brass, 16));
};

// Outlines 16 px at 1024 (about 1 px at 60 px).
const LW = 16;
const INK = DESK.line;
/** The ceremonial ribbon: a lighter, more saturated green than the desk's, with a clear light stripe. */
const RIBBON = { main: '#3E8A5E', deep: '#2A6544', light: '#9FD3B2' };

/**
 * A filled band of width `w` along a smooth curve through `pts`. Each end is cut square, or forked
 * into a swallowtail (`fork0`, `fork1`: the notch's depth in px).
 */
function bandPath(pts: Pt[], w: number, fork0 = 0, fork1 = 0) {
  const d = sampleCurve(pts, 6);
  const n = d.length / 2;
  const left: Pt[] = [];
  const right: Pt[] = [];
  const tan: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const i0 = Math.max(0, i - 1);
    const i1 = Math.min(n - 1, i + 1);
    let tx = d[i1 * 2] - d[i0 * 2];
    let ty = d[i1 * 2 + 1] - d[i0 * 2 + 1];
    const L = Math.hypot(tx, ty) || 1;
    tx /= L;
    ty /= L;
    tan.push([tx, ty]);
    left.push([d[i * 2] - (ty * w) / 2, d[i * 2 + 1] + (tx * w) / 2]);
    right.push([d[i * 2] + (ty * w) / 2, d[i * 2 + 1] - (tx * w) / 2]);
  }
  const b = builder().moveTo(left[0][0], left[0][1]);
  for (const [x, y] of left.slice(1)) b.lineTo(x, y);
  // the far end: square, or a swallowtail notch cut back into the cloth
  if (fork1) b.lineTo(d[(n - 1) * 2] - tan[n - 1][0] * fork1, d[(n - 1) * 2 + 1] - tan[n - 1][1] * fork1);
  for (const [x, y] of right.slice().reverse()) b.lineTo(x, y);
  if (fork0) b.lineTo(d[0] + tan[0][0] * fork0, d[1] + tan[0][1] * fork0);
  return b.close().build();
}

/** Points of `pts` moved `off` px across the curve (positive = to the curve's left, below for a rightward ribbon). */
function offsetPts(pts: Pt[], off: number): Pt[] {
  return pts.map(([x, y], i) => {
    const [ax, ay] = pts[Math.max(0, i - 1)];
    const [bx, by] = pts[Math.min(pts.length - 1, i + 1)];
    const L = Math.hypot(bx - ax, by - ay) || 1;
    return [x - ((by - ay) / L) * off, y + ((bx - ax) / L) * off] as Pt;
  });
}

/** The ceremonial ribbon along `pts`: the green cloth, a darker underside, a clear light stripe down the middle, an ink rim. */
function drawRibbon(c: SkCanvas, pts: Pt[], w: number, fork0 = 0, fork1 = 0): void {
  const band = bandPath(pts, w, fork0, fork1);
  c.drawPath(band, fill(RIBBON.main));
  c.save();
  clip(c, band);
  c.drawPath(bandPath(offsetPts(pts, w * 0.36), w * 0.34), fill(RIBBON.deep));
  c.drawPath(bandPath(offsetPts(pts, -w * 0.04), w * 0.2), fill(RIBBON.light));
  c.restore();
  c.drawPath(band, stroke(INK, LW));
}

/** The bow tied on the ribbon, centred at the knot; `s` 1 = about 360 px wide. Two big open loops in the ribbon's green. */
function drawBow(c: SkCanvas, x: number, y: number, s = 1, deg = 0): void {
  at(c, x, y, s, deg, (q) => {
    const part = (p: ReturnType<ReturnType<typeof builder>['build']>, col: string) => {
      q.drawPath(p, fill(col));
      q.drawPath(p, stroke(INK, LW / s));
    };
    for (const m of [-1, 1]) {
      // the tail, falling away below the knot to a swallowtail
      part(builder().moveTo(-10 * m, 14).lineTo(-78 * m, 168).lineTo(-44 * m, 150).lineTo(-26 * m, 190).lineTo(24 * m, 24).close().build(), RIBBON.main);
    }
    for (const m of [-1, 1]) {
      // the loop: big and plainly open (its hole shows the ground through a darker inside)
      part(builder().moveTo(0, 0).cubicTo(-40 * m, -130, -200 * m, -150, -184 * m, -30).cubicTo(-176 * m, 50, -70 * m, 46, 0, 0).close().build(), RIBBON.main);
      const inner = builder().moveTo(-46 * m, -12).cubicTo(-74 * m, -76, -146 * m, -86, -140 * m, -34).cubicTo(-134 * m, 4, -92 * m, 10, -46 * m, -12).close().build();
      q.drawPath(inner, fill(RIBBON.deep));
      q.drawPath(inner, stroke(INK, (LW * 0.7) / s));
      q.drawPath(builder().moveTo(-54 * m, -96).quadTo(-130 * m, -118, -166 * m, -60).build(), stroke(RIBBON.light, 16 / s));
    }
    const knot = rrect(-36, -38, 72, 76, 24);
    q.drawPath(knot, fill(RIBBON.main));
    q.drawPath(rrect(-22, -26, 30, 22, 10), fill(RIBBON.light));
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
    q.drawPath(sheet, fill(alpha(DESK.shadow, 0.24)));
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

/** The signature with a deep violet rim so it holds on the paper and on the tinted ground alike. */
function drawSignature(c: SkCanvas, pts: Pt[], nib: number): void {
  const path = nibPath(sampleCurve(pts, 4), nib, 40);
  c.drawPath(path, stroke(DESK.violetDeep, 10));
  c.drawPath(path, fill(DESK.violet));
}

/** The tinted ground: top colour to foot colour, a soft glow behind the subject, a low pale baize band at the foot (the desk's green in the ground, not a prop). */
function drawGround(c: SkCanvas, top: string, bottom: string, glow: Pt, glowA: number): void {
  c.drawRect({ x: 0, y: 0, width: S, height: S }, linearPaint(0, 0, 0, S, [top, bottom]));
  c.drawRect({ x: 0, y: 0, width: S, height: S }, radialPaint(glow[0], glow[1], 520, [alpha(DESK.white, glowA), alpha(DESK.white, 0)]));
  c.drawRect({ x: 0, y: 860, width: S, height: S - 860 }, linearPaint(0, 860, 0, S, [alpha(mix(DESK.baizeLift, DESK.greenLight, 0.5), 0), alpha(mix(DESK.baizeLift, DESK.greenLight, 0.5), 0.55)]));
}

/**
 * The giant scissors at (x, y) (the pivot), scale `s`, turned `deg` (0 = blades up), with whatever
 * `between` draws passing through their open blades: behind one blade, in front of the other.
 */
function drawScissorsOn(c: SkCanvas, x: number, y: number, s: number, deg: number, o: { open?: number; chunky?: number; darkSteel?: boolean }, between: () => void): void {
  at(c, x, y, s, deg, (z) => drawGiantScissors(z, 40, o));
  between();
  at(c, x, y, s, deg, (z) => {
    z.save();
    clip(z, builder().addRect({ x: 0, y: -70, width: 60, height: 74 }).addCircle(0, 4, 4.6).build());
    drawGiantScissors(z, 40, o);
    z.restore();
  });
}

/** A short walnut wedge pointing away from (x, y) along `deg` (0 = up): one stroke of the "snip" burst. */
function wedge(c: SkCanvas, x: number, y: number, deg: number, from: number, len: number, w: number): void {
  at(c, x, y, 1, deg, (q) => {
    const p = builder().moveTo(-w / 2, -from).lineTo(w / 2, -from).lineTo(0, -from - len).close().build();
    q.drawPath(p, fill(DESK.walnut));
    q.drawPath(p, stroke(DESK.walnutDeep, 6));
  });
}

// The signature: four uneven humps on a rising line, one small loop after the second, then the tail
// flies straight on up off the top edge (no hook at the foot, so no "J"; uneven humps, so no "m").
const SIGNATURE: Pt[] = [
  [506, 474], [520, 410], [538, 374], [558, 376], [566, 420], [570, 470],
  [588, 440], [604, 426], [618, 432], [624, 462],
  [644, 444], [666, 414], [672, 386], [656, 378], [646, 400], [664, 440], [692, 452],
  [710, 420], [734, 400], [754, 410], [760, 444],
  [778, 430], [804, 360], [830, 250], [852, 120], [868, -20], [876, -120],
];

/**
 * SNIP: the moment after the cut (see the header). The scissors are the biggest thing on the tile,
 * so the joke is scale: a town's ribbon cut with scissors the height of the mayor.
 */
const variantSnip: Draw = (c) => {
  drawGround(c, '#C9CCDD', '#8F90AE', [640, 300], 0.3);
  drawSheet(c, 666, 340, 420, 520, 11, [22, 30], 3);
  drawSignature(c, SIGNATURE, 58);
  // the cut point: the gap in the ribbon between the open blades
  const cx = 244;
  const cy = 430;
  drawScissorsOn(c, 268, 600, 10.0, -12, { open: 40, chunky: 2.4, darkSteel: true }, () => {
    // the left piece: its cut end forked, springing up and away from the blades
    drawRibbon(c, [[-40, 540], [90, 520], [160, 486], [196, 440], [204, 392]], 100, 0, 32);
    // the right piece: its cut end forked and springing up the other way, then running off the right edge
    drawRibbon(c, [[300, 384], [306, 440], [350, 484], [520, 520], [760, 540], [1070, 560]], 100, 32, 0);
    drawBow(c, 760, 540, 0.82, 3);
  });
  // the "snip" burst: three short walnut wedges flying up out of the cut, between the blade tips
  for (const [deg, len] of [[-24, 56], [0, 66], [24, 56]] as [number, number][]) wedge(c, cx, cy, deg, 190, len, 26);
  // one curled ribbon offcut flying up-left
  at(c, 150, 190, 1, -30, (q) => drawRibbon(q, [[-70, 34], [-24, -6], [26, -10], [62, 24], [70, 60]], 56, 16, 16));
};

export const CANDIDATES: Candidate[] = [
  {
    id: 'office-snip',
    note: 'the moment after the cut: giant scissors upright at the left, the ribbon in two with swallowtail ends curling away, an offcut and a snip burst; the signed paper upper right, its signature off the top; the bow on the right-hand piece',
    icon: (c) => variantSnip(c),
    adaptive: shrunk(disc(variantSnip), 0.6),
    splash: shrunk(disc(variantSnip), 0.86),
  },
];

/** CHOSEN: office-snip (the icon judge's choice, 24 November, finished to the judge's list of changes). */
export const CHOSEN = 'office-snip';

/** The switch: OFFICE_ICON=<candidate id> picks another candidate for `preview` and `final` without editing CHOSEN. */
export function chosen(): Candidate {
  const id = (typeof process !== 'undefined' && process.env && process.env.OFFICE_ICON) || CHOSEN;
  const k = CANDIDATES.find((x) => x.id === id);
  if (!k) throw new Error(`no icon candidate ${id} (have ${CANDIDATES.map((x) => x.id).join(', ')})`);
  return k;
}
