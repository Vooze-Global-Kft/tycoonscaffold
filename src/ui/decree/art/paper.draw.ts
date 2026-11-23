/**
 * The papers (office-design.md 2.7, 2.8, 2.10, 3.1, 4.2, 4.3, 7.5): the pale sheet with its oval
 * photo slot and paperclip; the SIGN strip (violet ink) and the IF STUDIED strip (slate) with the
 * rows of 4.2 ruled faintly; the armed state (a strip grown to 110 %) and the "Short by" shake as a
 * parameter; the budget slip (smaller, ledger-ruled); the printed forms (requisition, ribbon-cutting,
 * application); a grievance with its picket sign; the comic tabloid front page; the run-up paper;
 * and the signature: a violet nib stroke revealed with distance, one hand per player face.
 *
 * Everything here is ground and decoration: the words, chips and digits are the desk's (Skia
 * paragraphs in paperMetrics' boxes). Pieces draw from their top-left at the origin, w x h in points.
 * Never a stamp (4.3: nothing stamped).
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { DESK, alpha, mix } from './palette';
import { drawPaperclip } from './desk.draw';
import { drawPicket } from './effects.draw';
import {
  LINE,
  at,
  builder,
  circle,
  clip,
  dashed,
  dropShadow,
  fill,
  hatch,
  indexAt,
  line,
  nibPath,
  oval,
  poly,
  polyLength,
  rect,
  rrect,
  sampleCurve,
  scallops,
  shape,
  stroke,
  washed,
  wobble,
  type Box,
} from './pen';

export type StripSide = 'sign' | 'refuse';

/** The paper's corner radius and its edge colour. */
export const PAPER_R = 3;

/** The sheet itself: pale blue-grey, a fine edge, a lifted shadow (lift 0..1 while dragged). */
export function drawSheet(c: SkCanvas, w: number, h: number, lift = 0, tint: string = DESK.paper): void {
  const d = 1.5 + lift * 5;
  c.drawPath(rrect(d * 0.5, d, w, h, PAPER_R), fill(alpha(DESK.shadow, 0.32 - lift * 0.1)));
  c.drawPath(rrect(0, 0, w, h, PAPER_R), fill(tint));
  // the faint fibre of the paper: a few long, pale strokes
  c.save();
  clip(c, rrect(0, 0, w, h, PAPER_R));
  for (let y = 9; y < h; y += 23) c.drawPath(line(0, y, w, y + 3), stroke(alpha(DESK.white, 0.5), 0.7));
  c.restore();
  c.drawPath(rrect(0.4, 0.4, w - 0.8, h - 0.8, PAPER_R), stroke(DESK.paperEdge, 0.8));
}

/**
 * A strip's ground (4.2): the band along the paper's top (SIGN, violet) or bottom (IF STUDIED,
 * slate) edge, `h` tall, with its title rule, the two chip rows' faint guides and the note row's
 * dotted line. `armed` 0..1 grows it to 110 % towards its edge and deepens its tint; `shake` is a
 * horizontal offset in points (the "Short by" shake: shakeOffset(t)). `rows` are the y of the title,
 * chip and note rows relative to the strip's top (from paperMetrics), optional.
 */
export function drawStrip(c: SkCanvas, w: number, h: number, side: StripSide, o: { armed?: number; shake?: number; rows?: { title: number; chip1: number; chip2: number; note: number } } = {}): void {
  const a = Math.max(0, Math.min(1, o.armed ?? 0));
  const k = 1 + 0.1 * a;
  const ink = side === 'sign' ? DESK.violet : DESK.slate;
  const pale = side === 'sign' ? DESK.violetPale : DESK.slatePale;
  c.save();
  c.translate(o.shake ?? 0, 0);
  // grow towards the paper's edge it belongs to: SIGN up, STUDY down
  if (side === 'sign') {
    c.translate(w / 2, h);
    c.scale(k, k);
    c.translate(-w / 2, -h);
  } else {
    c.translate(w / 2, 0);
    c.scale(k, k);
    c.translate(-w / 2, 0);
  }
  const band = rrect(0, 0, w, h, 4);
  c.drawPath(band, fill(mix(DESK.paperLight, pale, 0.55 + 0.45 * a)));
  if (a > 0) c.drawPath(band, stroke(ink, 1 + a));
  else c.drawPath(band, stroke(alpha(ink, 0.45), 0.8));
  // the edge rule on the side that faces the tray or the drawer
  const ey = side === 'sign' ? 1.5 : h - 1.5;
  c.drawPath(line(6, ey, w - 6, ey), stroke(ink, 2));
  const r = o.rows ?? { title: 4, chip1: 4 + h * 0.21, chip2: 4 + h * 0.47, note: 4 + h * 0.74 };
  c.drawPath(line(8, r.chip1 - 1, w - 8, r.chip1 - 1), stroke(alpha(ink, 0.35), 0.7));
  c.drawPath(line(8, r.note, w - 8, r.note), dashed(alpha(ink, 0.35), 0.7, 2, 2.4));
  // the arrow mark of the direction at the title row's right end
  const ax = w - 12;
  const ay = r.title + (r.chip1 - r.title) / 2;
  const dir = side === 'sign' ? -1 : 1;
  c.drawPath(poly([ax - 4, ay - dir * 2.4, ax, ay + dir * 2.8, ax + 4, ay - dir * 2.4], false), stroke(alpha(ink, 0.8), 1.3));
  c.restore();
}

/** The "Short by" shake (4.3): a decaying side-to-side offset in points for t seconds since the refused push (0 after 0.45 s). Pure maths, a worklet. */
export function shakeOffset(t: number, amp = 6): number {
  'worklet';
  if (t <= 0 || t >= 0.45) return 0;
  return Math.sin(t * 2 * Math.PI * 9) * amp * (1 - t / 0.45);
}

/**
 * The photo slot of a paper's header (4.2: an oval 44 x 54 with a paperclip): a pale oval mount and
 * the clip over its top edge, from the slot's top left. The face itself is the faces atlas's
 * ("face:<id>"), drawn by the caller inside photoOval(); draw the clip after it with drawPhotoClip.
 */
export function drawPhotoSlot(c: SkCanvas, w = 44, h = 54): void {
  c.drawPath(oval(w / 2 + 0.8, h / 2 + 1.2, w / 2, h / 2), fill(alpha(DESK.shadow, 0.22)));
  c.drawPath(oval(w / 2, h / 2, w / 2, h / 2), fill(DESK.slatePale));
  c.drawPath(oval(w / 2, h / 2, w / 2, h / 2), stroke(DESK.paperEdge, 1));
}

/** The oval inside the slot a portrait is clipped to. */
export function photoOval(w = 44, h = 54): Box {
  return { x: 1.5, y: 1.5, w: w - 3, h: h - 3 };
}

/** The paperclip over the slot's top edge (from the slot's top left). */
export function drawPhotoClip(c: SkCanvas, w = 44, h = 54): void {
  at(c, w * 0.72, 2, (h / 54) * 0.9, 8, (q) => drawPaperclip(q, 22));
}

export interface PaperOptions {
  /** Rows from paperMetrics(h, s): sign/refuse strip tops and heights, the header's top. Defaults follow 4.2 at s = 1.3. */
  m?: { signY: number; signH: number; headerY: number; headerH: number; refuseY: number; refuseH: number };
  armed?: StripSide | null;
  armedBy?: number;
  shake?: number;
  lift?: number;
  /** Draw the photo slot (no face). */
  slot?: boolean;
}

/** The default rows of 4.2 at s = 1.3 for a paper h tall (proposal takes the spare). */
export function defaultRows(h: number): NonNullable<PaperOptions['m']> {
  const strip = 106;
  return { signY: 6, signH: strip, headerY: 6 + strip + 2, headerH: 62, refuseY: h - 6 - strip, refuseH: strip };
}

/** A day paper's whole ground (sheet, both strips, the dividers, the header's photo slot and clip). */
export function drawPaper(c: SkCanvas, w: number, h: number, o: PaperOptions = {}): void {
  const m = o.m ?? defaultRows(h);
  drawSheet(c, w, h, o.lift ?? 0);
  const inset = 8;
  at(c, inset, m.signY, 1, 0, (q) => drawStrip(q, w - inset * 2, m.signH, 'sign', { armed: o.armed === 'sign' ? (o.armedBy ?? 1) : 0, shake: o.armed === 'sign' ? o.shake : 0 }));
  at(c, inset, m.refuseY, 1, 0, (q) => drawStrip(q, w - inset * 2, m.refuseH, 'refuse', { armed: o.armed === 'refuse' ? (o.armedBy ?? 1) : 0, shake: o.armed === 'refuse' ? o.shake : 0 }));
  c.drawPath(line(inset + 4, m.headerY - 1, w - inset - 4, m.headerY - 1), stroke(alpha(DESK.paperEdge, 0.8), 0.6));
  c.drawPath(line(inset + 4, m.refuseY - 1, w - inset - 4, m.refuseY - 1), stroke(alpha(DESK.paperEdge, 0.8), 0.6));
  if (o.slot !== false) {
    at(c, inset + 6, m.headerY + 4, 1, 0, (q) => {
      drawPhotoSlot(q);
      drawPhotoClip(q);
    });
  }
}

// ---------------------------------------------------------------------------
// Slips and forms
// ---------------------------------------------------------------------------

/** The budget slip (2.7: smaller, ledger-ruled): a narrow sheet with blue rules, a violet margin and a mustard money column. */
export function drawSlip(c: SkCanvas, w: number, h: number, lift = 0): void {
  drawSheet(c, w, h, lift, DESK.paperLight);
  c.save();
  clip(c, rrect(0, 0, w, h, PAPER_R));
  for (let y = 14; y < h - 4; y += 9) c.drawPath(line(0, y, w, y), stroke(alpha(DESK.slateLight, 0.55), 0.6));
  c.drawPath(line(18, 0, 18, h), stroke(alpha(DESK.violet, 0.6), 0.9));
  c.drawPath(line(w - 58, 0, w - 58, h), stroke(alpha(DESK.mustard, 0.7), 0.9));
  c.drawPath(line(w - 56, 0, w - 56, h), stroke(alpha(DESK.mustard, 0.7), 0.5));
  c.restore();
  // a punched pair of holes and a torn top edge
  for (const y of [h * 0.3, h * 0.7]) c.drawPath(circle(8, y, 2), fill(DESK.baizeDeep));
  c.drawPath(scallops(0, w, 0.5, Math.round(w / 6), 0.6), stroke(alpha(DESK.paperEdge, 0.9), 0.6));
}

export type FormKind = 'requisition' | 'ribbon' | 'application';

/**
 * A printed form (2.7 routine papers): a ruled header band with the Republic's little scissors
 * mark, numbered boxes, tick boxes, a perforated left edge. 'ribbon' crosses a violet ribbon over
 * the top corner; 'application' has a square photo box and lined answer fields. Laid over the day
 * paper's ground (the strips still apply): draw it inside the proposal and header rows (formBox).
 */
export function drawFormFace(c: SkCanvas, w: number, h: number, kind: FormKind): void {
  // header band
  c.drawPath(rect(0, 0, w, 14), fill(alpha(DESK.slatePale, 0.9)));
  c.drawPath(line(0, 14, w, 14), stroke(DESK.slate, 0.8));
  at(c, 9, 7, 0.42, 0, drawEmblemMark);
  for (let i = 0; i < 3; i++) c.drawPath(line(20, 4 + i * 3.4, 20 + 40 - i * 10, 4 + i * 3.4), stroke(DESK.slateLight, 1.1));
  c.drawPath(rrect(w - 46, 3, 42, 8, 1), stroke(DESK.slate, 0.7));
  // boxes
  const top = 20;
  if (kind === 'application') {
    c.drawPath(rect(w - 44, top, 38, 44), fill(DESK.paperLight));
    c.drawPath(rect(w - 44, top, 38, 44), dashed(DESK.slate, 0.8, 2.4, 1.6));
    for (let i = 0; i < 4; i++) {
      const y = top + 8 + i * 11;
      c.drawPath(line(4, y, w - 52, y), stroke(alpha(DESK.slateLight, 0.8), 0.6));
      c.drawPath(rect(4, y - 7, 14, 6), fill(alpha(DESK.slatePale, 0.8)));
    }
  } else {
    const cols = 4;
    const cw = (w - 8) / cols;
    for (let r = 0; r < 2; r++)
      for (let k = 0; k < cols; k++) {
        c.drawPath(rect(4 + k * cw, top + r * 16, cw - 3, 13), stroke(alpha(DESK.slate, 0.6), 0.6));
        c.drawPath(rect(5 + k * cw, top + r * 16 + 1, 5, 4), fill(alpha(DESK.slatePale, 0.9)));
      }
    for (let i = 0; i < 3; i++) {
      const y = top + 38 + i * 9;
      c.drawPath(rect(4, y, 6, 6), stroke(DESK.slate, 0.7));
      c.drawPath(line(14, y + 4, w * 0.6, y + 4), stroke(alpha(DESK.slateLight, 0.8), 0.6));
    }
    if (kind === 'requisition') c.drawPath(poly([5, top + 41, 7, top + 44, 11, top + 37], false), stroke(DESK.violet, 1.3));
  }
  if (kind === 'ribbon') drawRibbonCorner(c, w, 0, 1);
  // perforation
  for (let y = 4; y < h; y += 5) c.drawPath(circle(-4, y, 0.9), fill(alpha(DESK.paperEdge, 0.9)));
}

/** A violet ceremonial ribbon across the top-right corner (from (w, y0)), with a bow and two tails. */
export function drawRibbonCorner(c: SkCanvas, w: number, y0 = 0, k = 1): void {
  at(c, w, y0, k, 0, (q) => {
    q.save();
    q.drawPath(poly([-36, 0, -22, 0, 0, 22, 0, 36]), fill(DESK.violet));
    q.drawPath(poly([-36, 0, -22, 0, 0, 22, 0, 36]), stroke(LINE, 0.6));
    q.drawPath(line(-31, 0, 0, 31), stroke(alpha(DESK.violetLight, 0.7), 0.8));
    q.restore();
    at(q, -14, 14, 1, 45, (z) => {
      shape(z, builder().moveTo(0, 0).quadTo(-10, -9, -9, 0).quadTo(-10, 9, 0, 0).close().build(), DESK.violetLight, 0.6);
      shape(z, builder().moveTo(0, 0).quadTo(10, -9, 9, 0).quadTo(10, 9, 0, 0).close().build(), DESK.violetLight, 0.6);
      shape(z, circle(0, 0, 2.4), DESK.violet, 0.6);
    });
  });
}

/** The Republic's small printed mark on forms (the scissors over the napkin), in ±12. */
export function drawEmblemMark(c: SkCanvas): void {
  c.drawPath(poly([-10, 4, 0, -2, 10, 4, 0, 10]), fill(DESK.paperLight));
  c.drawPath(poly([-10, 4, 0, -2, 10, 4, 0, 10]), stroke(DESK.slate, 1.2));
  c.drawPath(line(-7, -10, 5, 6), stroke(DESK.slateDeep, 2));
  c.drawPath(line(7, -10, -5, 6), stroke(DESK.slateDeep, 2));
  c.drawPath(circle(-6, 8, 2.6), stroke(DESK.slateDeep, 1.6));
  c.drawPath(circle(6, 8, 2.6), stroke(DESK.slateDeep, 1.6));
}

/**
 * A grievance (2.8): the spokesperson's paper with the club's picket sign leaning against its
 * right edge (picket box for the slogan: picketSignBox). The paper's ground is drawPaper's; this adds
 * the sign over the header row's right half, centred at (x, y), `k` scale (1 = a 60 x 40 board).
 */
export function drawPicketSign(c: SkCanvas, k = 1, deg = -6): void {
  at(c, 0, 0, k, deg, (q) => {
    q.drawPath(rect(-2.4, 6, 4.8, 30), fill(DESK.walnut));
    q.drawPath(rect(-2.4, 6, 4.8, 30), stroke(LINE, 0.9));
    dropShadow(q, rrect(-30, -20, 60, 30, 2), 1.4, 1.8, 0.3);
    washed(q, rrect(-30, -20, 60, 30, 2), DESK.paperLight, DESK.paperShade, 1, 1, 1.1);
    q.drawPath(rrect(-27, -17, 54, 24, 1.4), stroke(alpha(DESK.brick, 0.5), 0.8));
    for (const x of [-24, 24]) q.drawPath(circle(x, -15, 1), fill(DESK.slateDeep));
  });
}

/** The slogan's box on the picket board (relative to its centre, k = 1). */
export function picketSignBox(): Box {
  return { x: -26, y: -16, w: 52, h: 22 };
}

/**
 * The comic tabloid front page (2.8, 7.9): a paper of its own, w x h: a crooked masthead band, one
 * big headline zone (words by the caller: frontPageBoxes), a small plain photograph of a goose
 * standing (never holding anything, D12), a caption line, and NO columns of body text. Tinted a
 * little warmer than the desk papers so it reads as newsprint, never cream.
 */
export function drawFrontPage(c: SkCanvas, w: number, h: number, lift = 0): void {
  drawSheet(c, w, h, lift, mix(DESK.paper, DESK.paperShade, 0.25));
  const b = frontPageBoxes(w, h);
  // masthead: a thick rule above and below, set crooked
  at(c, b.masthead.x + b.masthead.w / 2, b.masthead.y + b.masthead.h / 2, 1, -2.2, (q) => {
    q.drawPath(rect(-b.masthead.w / 2, -b.masthead.h / 2, b.masthead.w, 2.4), fill(LINE));
    q.drawPath(rect(-b.masthead.w / 2, b.masthead.h / 2 - 1.2, b.masthead.w, 1.2), fill(LINE));
  });
  // the scandal bar: brick (a scandal word's band; small)
  c.drawPath(rect(b.headline.x, b.headline.y - 6, 34, 3), fill(DESK.brick));
  // the photograph
  const p = b.photo;
  c.drawPath(rect(p.x, p.y, p.w, p.h), fill(DESK.white));
  const inner = { x: p.x + 3, y: p.y + 3, w: p.w - 6, h: p.h - 6 };
  c.drawPath(rect(inner.x, inner.y, inner.w, inner.h), fill(DESK.slatePale));
  c.save();
  c.clipRect({ x: inner.x, y: inner.y, width: inner.w, height: inner.h }, 1, true);
  c.drawPath(rect(inner.x, inner.y + inner.h * 0.68, inner.w, inner.h), fill(DESK.slateLight));
  at(c, inner.x + inner.w * 0.5, inner.y + inner.h * 0.72, inner.h / 46, 0, drawGoosePhoto);
  hatch(c, rect(inner.x, inner.y, inner.w, inner.h), alpha(DESK.slateDeep, 0.18), 2.2, 0.4);
  c.restore();
  c.drawPath(rect(inner.x, inner.y, inner.w, inner.h), stroke(alpha(LINE, 0.6), 0.6));
  // a caption rule under the photo, and a fold line
  c.drawPath(line(p.x, p.y + p.h + 5, p.x + p.w * 0.7, p.y + p.h + 5), stroke(DESK.slateLight, 1.2));
  c.drawPath(line(0, h * 0.5, w, h * 0.5), stroke(alpha(DESK.paperEdge, 0.5), 0.6));
}

/** The front page's boxes: the masthead's words, the headline's words, the photograph. */
export function frontPageBoxes(w: number, h: number): { masthead: Box; headline: Box; photo: Box; caption: Box } {
  const m = { x: 12, y: 10, w: w - 24, h: Math.max(22, h * 0.09) };
  const headline = { x: 14, y: m.y + m.h + 14, w: w - 28, h: Math.max(60, h * 0.26) };
  const ph = Math.min(h * 0.34, 120);
  const photo = { x: w / 2 - ph * 0.65, y: headline.y + headline.h + 8, w: ph * 1.3, h: ph };
  const caption = { x: photo.x, y: photo.y + ph + 8, w: photo.w, h: 14 };
  return { masthead: m, headline, photo, caption };
}

/** The goose of the writing as a small, plain press photograph: standing, side-on, holding nothing (D12). Base of its feet at the origin, about 46 tall. */
export function drawGoosePhoto(c: SkCanvas): void {
  const body = builder().moveTo(-16, -12).quadTo(-20, -22, -10, -24).quadTo(4, -26, 12, -18).quadTo(16, -12, 10, -8).quadTo(0, -4, -12, -6).close().build();
  const neck = builder().moveTo(6, -20).quadTo(10, -34, 8, -40).quadTo(9, -46, 14, -46).quadTo(18, -46, 18, -42).quadTo(14, -38, 13, -32).quadTo(12, -24, 12, -18).close().build();
  const g = DESK.paperLight;
  shape(c, body, g, 0.9);
  shape(c, neck, g, 0.9);
  c.drawPath(poly([18, -44, 23, -42.6, 18, -41]), fill(DESK.mustard));
  c.drawPath(circle(14.6, -43.6, 0.9), fill(LINE));
  c.drawPath(builder().moveTo(-8, -18).quadTo(0, -20, 6, -15).build(), stroke(alpha(LINE, 0.5), 0.8));
  for (const x of [-4, 3]) {
    c.drawPath(line(x, -6, x, 0), stroke(DESK.mustardDeep, 1.3));
    c.drawPath(poly([x - 2.6, 0, x + 3, 0, x, -1.6]), fill(DESK.mustardDeep));
  }
}

/**
 * The run-up paper (2.10: a public appearance): a day paper's ground with a line of bunting along
 * its top edge and a violet rosette pinned at the header's right; the district's badge is the
 * desk's (a wide chip).
 */
export function drawRunUpPaper(c: SkCanvas, w: number, h: number, o: PaperOptions = {}): void {
  drawPaper(c, w, h, o);
  drawBunting(c, 10, w - 10, 2, 9, 5);
}

/** Bunting: a cord from x0 to x1 sagging by `sag`, with n triangular flags in violet, brass, slate and paper. */
export function drawBunting(c: SkCanvas, x0: number, x1: number, y: number, n: number, sag = 6, flag = 8): void {
  const cord = builder().moveTo(x0, y).quadTo((x0 + x1) / 2, y + sag * 2, x1, y).build();
  c.drawPath(cord, stroke(LINE, 0.8));
  const cols = [DESK.violet, DESK.brass, DESK.slateLight, DESK.paperLight];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const x = x0 + (x1 - x0) * t;
    const yy = y + sag * 2 * 2 * t * (1 - t);
    shape(c, poly([x - flag / 2, yy, x + flag / 2, yy, x, yy + flag * 1.1]), cols[i % cols.length], 0.6);
  }
}

// ---------------------------------------------------------------------------
// The signature
// ---------------------------------------------------------------------------

/**
 * Each player face's signature (3.1, 4.3: the signature writes itself across the SIGN strip with
 * distance), as the strokes that mayor would write, in a box 120 x 34 (origin top left). Ids are
 * game.json's `decree.cast.players[].id`. Written as each would sign: Bramble's tall looped B and a
 * flourish; Fennel's tidy, slanted, underlined; Quill's spiky; Marchpane's enormous M swallowing the
 * rest; Tuttle's round and rolling; Larkspur's long rising line with a star-like flick.
 */
const SIGNATURES: Record<string, [number, number][][]> = {
  bramble: [
    [[4, 30], [10, 4], [16, 2], [14, 12], [6, 17], [18, 16], [22, 24], [12, 31], [4, 29]],
    [[20, 26], [26, 18], [30, 26], [34, 18], [38, 26], [42, 14], [44, 4], [46, 14], [48, 26], [54, 20], [58, 26], [62, 18], [66, 26], [70, 8], [74, 26], [80, 22]],
    [[6, 33], [40, 30], [80, 31], [112, 24], [104, 20], [92, 26]],
  ],
  fennel: [
    [[8, 4], [26, 3]],
    [[16, 4], [10, 28]],
    [[10, 16], [22, 15]],
    [[24, 26], [30, 18], [34, 26], [40, 18], [44, 26], [50, 18], [54, 26], [58, 19], [62, 26], [66, 8], [68, 26], [76, 22]],
    [[8, 32], [84, 30]],
  ],
  quill: [
    [[18, 6], [6, 14], [8, 26], [20, 28], [28, 18], [22, 6], [18, 6]],
    [[18, 22], [30, 33]],
    [[32, 16], [34, 28], [40, 16], [42, 28], [48, 16], [50, 28], [54, 6], [56, 28], [60, 6], [62, 28], [70, 20], [96, 6]],
  ],
  marchpane: [
    [[2, 32], [10, 2], [24, 26], [36, 2], [44, 32]],
    [[44, 30], [50, 24], [54, 28], [58, 24], [62, 28], [66, 24], [70, 28], [76, 24], [80, 26]],
    [[2, 34], [30, 28], [70, 32], [116, 22]],
  ],
  tuttle: [
    [[4, 6], [30, 4]],
    [[16, 5], [14, 28], [20, 30]],
    [[22, 20], [24, 28], [30, 28], [32, 20], [34, 28], [40, 14], [42, 28], [46, 14], [48, 28], [52, 4], [54, 28], [60, 22], [64, 28], [72, 20], [78, 28], [86, 30]],
  ],
  larkspur: [
    [[6, 4], [4, 28], [18, 26]],
    [[20, 24], [26, 18], [30, 26], [36, 20], [42, 22], [46, 16], [52, 24], [58, 10], [60, 24], [70, 18], [86, 12], [104, 4]],
    [[104, 4], [108, 1]],
    [[96, 10], [112, 0]],
  ],
};

export const SIGNATURE_IDS = Object.keys(SIGNATURES);
export const SIGNATURE_BOX = { w: 120, h: 34 } as const;

interface SigCache {
  strokes: number[][];
  lengths: number[];
  total: number;
}
const sigCache = new Map<string, SigCache>();

/** The signature's dense polylines and their lengths (cached). Unknown ids sign as 'bramble'. */
export function signatureOf(face: string): SigCache {
  const id = SIGNATURES[face] ? face : 'bramble';
  const hit = sigCache.get(id);
  if (hit) return hit;
  const strokes = SIGNATURES[id].map((s) => sampleCurve(s, 1.2));
  const lengths = strokes.map((s) => polyLength(s));
  const out = { strokes, lengths, total: lengths.reduce((a, b) => a + b, 0) };
  sigCache.set(id, out);
  return out;
}

/**
 * Draws `face`'s signature revealed to `progress` (0..1 of its length: map the drag distance from
 * 40 pt onwards to it), in violet, with its box's top left at the origin scaled by `k` (1 = 120 x 34).
 * The nib's width scales with k.
 */
export function drawSignature(c: SkCanvas, face: string, progress = 1, k = 1, color: string = DESK.violet): void {
  const sig = signatureOf(face);
  let left = Math.max(0, Math.min(1, progress)) * sig.total;
  at(c, 0, 0, k, 0, (q) => {
    for (let i = 0; i < sig.strokes.length && left > 0; i++) {
      const s = sig.strokes[i];
      const take = Math.min(left, sig.lengths[i]);
      left -= sig.lengths[i];
      const end = take >= sig.lengths[i] ? s.length / 2 : indexAt(s, take);
      if (end < 1.01) continue;
      q.drawPath(nibPath(s, 2.4, -38, end), fill(color));
    }
  });
}

/** The tip of the signature at `progress` (box units), for the nib scratch spark. */
export function signatureTip(face: string, progress: number): { x: number; y: number } {
  const sig = signatureOf(face);
  let left = Math.max(0, Math.min(1, progress)) * sig.total;
  for (let i = 0; i < sig.strokes.length; i++) {
    const s = sig.strokes[i];
    if (left <= sig.lengths[i]) {
      const j = indexAt(s, left);
      const k = Math.min(s.length / 2 - 1, Math.floor(j));
      return { x: s[k * 2], y: s[k * 2 + 1] };
    }
    left -= sig.lengths[i];
  }
  const s = sig.strokes[sig.strokes.length - 1];
  return { x: s[s.length - 2], y: s[s.length - 1] };
}

void wobble;
