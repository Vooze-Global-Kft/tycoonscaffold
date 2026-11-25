/**
 * Scrapyard ("Scrap to Ingot", the title waits for the names register) app icon candidates, drawn in
 * code in the kit's style (src/ui/salvage/art: hi-vis-and-rust, ink outlines, flat tones, heat the only
 * orange). Ruling 14: lead with copper, the ticket and the pour; never a lone gold bar, never a truck;
 * judged at 60 px beside the four other games' icons (scripts/art/yard-icons.ts makes the sheets).
 *
 * - pour:   a crucible tipping a glowing stream into an ingot mould, a big bright copper coil behind,
 *           on hi-vis yellow.
 * - glove:  a gloved hand holding a coil of bare bright copper up against a weighbridge ticket, on
 *           hi-vis yellow.
 * - ticket: the weighbridge display (green LED digits) printing a ticket over a coil of bright copper,
 *           on pale daylight blue with an ink-and-yellow hazard foot.
 *
 * The spec's third idea (an electromagnet lifting a copper coil) is not drawn: a magnet does not lift
 * copper, and the trade would see it (L2).
 *
 * Pure Skia: require() it inside scripts/art/headless.ts. Everything draws into 1024 x 1024.
 */
import { ClipOp, type SkCanvas } from '@shopify/react-native-skia';
import { YARD, shade } from '../../../src/ui/salvage/art/palette';
import { builder, circle, fill, linear, oval, poly, radial, rrect, segment, stroke } from '../../../src/ui/salvage/art/pen';
import { dotMatrix, sevenSeg } from '../../../src/ui/salvage/art/letters';

export const S = 1024;
const LW = 18;
const INK = YARD.ink;

type Draw = (c: SkCanvas) => void;

export interface Candidate {
  id: string;
  note: string;
  icon: Draw;
}

function outlined(c: SkCanvas, p: ReturnType<typeof poly>, color: string, w = LW): void {
  c.drawPath(p, fill(color));
  c.drawPath(p, stroke(INK, w));
}

/** A coil of bright copper seen from the front and above: a thick ring of turns with sheen ticks. */
function copperCoil(c: SkCanvas, cx: number, cy: number, R: number, r: number, squash = 0.62, h = 0.32): void {
  const RY = R * squash;
  const ry = r * squash;
  const H = R * h;
  // side band (front half), turns as arcs
  const band = builder()
    .moveTo(cx - R, cy)
    .lineTo(cx - R, cy + H)
    .addArc({ x: cx - R, y: cy + H - RY, width: R * 2, height: RY * 2 }, 180, -180)
    .lineTo(cx + R, cy)
    .close()
    .build();
  c.drawPath(band, fill(YARD.copperDark));
  for (let i = 1; i < 5; i++) c.drawPath(builder().addArc({ x: cx - R, y: cy + (H * i) / 5 - RY, width: R * 2, height: RY * 2 }, 8, 164).build(), stroke(shade(YARD.copper, 0.1), 7));
  c.drawPath(band, stroke(INK, LW));
  // top ring of turns
  const ring = builder().addOval({ x: cx - R, y: cy - RY, width: R * 2, height: RY * 2 }).addOval({ x: cx - r, y: cy - ry, width: r * 2, height: ry * 2 }).build();
  c.drawPath(ring, fill(YARD.copperDark));
  const n = 6;
  for (let i = 0; i < n; i++) {
    const k = r + ((R - r) * (i + 0.5)) / n;
    c.drawPath(oval(cx, cy, k, k * squash), stroke(i % 2 ? YARD.copperLight : YARD.copper, ((R - r) / n) * 0.8));
  }
  for (let i = 0; i < n; i++) {
    const k = r + ((R - r) * (i + 0.5)) / n;
    c.drawPath(builder().addArc({ x: cx - k, y: cy - k * squash, width: k * 2, height: k * 2 * squash }, 200, 70).build(), stroke(YARD.copperSheen, 5));
  }
  c.drawPath(oval(cx, cy, R, RY), stroke(INK, LW));
  // the hole
  c.drawPath(oval(cx, cy, r, ry), fill(shade(YARD.copperDark, -0.45)));
  c.drawPath(oval(cx, cy, r, ry), stroke(INK, LW * 0.8));
  // sheen ticks (copper's mark)
  for (const [x, y, s] of [[cx - R * 0.55, cy - RY * 0.55, 1], [cx + R * 0.62, cy + RY * 0.35, 0.8]] as const) {
    c.drawPath(segment(x - 22 * s, y + 12 * s, x - 2 * s, y - 16 * s), stroke('#FFFFFF', 11 * s));
    c.drawPath(segment(x + 6 * s, y + 18 * s, x + 22 * s, y - 2 * s), stroke('#FFFFFF', 11 * s));
  }
}

/**
 * A hank of bare bright copper wire: many loose turns (ellipses jittered in size and centre) drawn
 * dark first then bright, a tie at one side and the loose end springing out. Reads as wire, not as a
 * ring or a doughnut, because the turns visibly separate at the edges.
 */
function wireHank(c: SkCanvas, cx: number, cy: number, R: number, squash = 0.6, turn = -12): void {
  c.save();
  c.translate(cx, cy);
  c.rotate(turn, 0, 0);
  const n = 9;
  const loops: [number, number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const j = (i * 0.618) % 1;
    loops.push([(j - 0.5) * R * 0.12, ((i / n) - 0.5) * R * 0.22, R * (0.9 + 0.14 * ((i * 0.37) % 1)), R * squash * (0.88 + 0.14 * ((i * 0.53) % 1))]);
  }
  const wire = R * 0.11;
  for (const [x, y, a, b] of loops) c.drawPath(oval(x, y, a, b), stroke(INK, wire + 14));
  loops.forEach(([x, y, a, b], i) => c.drawPath(oval(x, y, a, b), stroke(i % 3 === 0 ? YARD.copperDark : i % 3 === 1 ? YARD.copper : YARD.copperLight, wire)));
  // highlights along the upper-left of the top turns
  loops.slice(-5).forEach(([x, y, a, b]) => c.drawPath(builder().addArc({ x: x - a, y: y - b, width: a * 2, height: b * 2 }, 205, 50).build(), stroke(YARD.copperSheen, wire * 0.35)));
  // the tie wire wrapped at the left
  for (const dx of [-10, 10]) {
    c.drawPath(segment(-R * 0.98 + dx, -R * squash * 0.35, -R * 0.84 + dx, R * squash * 0.3), stroke(INK, 26));
    c.drawPath(segment(-R * 0.98 + dx, -R * squash * 0.35, -R * 0.84 + dx, R * squash * 0.3), stroke(YARD.galvanisedLight, 13));
  }
  // the loose end springing out at the right
  const tail = builder().moveTo(R * 0.9, R * squash * 0.2).cubicTo(R * 1.15, R * squash * 0.1, R * 1.2, -R * squash * 0.5, R * 1.02, -R * squash * 0.62).cubicTo(R * 0.92, -R * squash * 0.7, R * 0.9, -R * squash * 0.4, R * 1.04, -R * squash * 0.35).build();
  c.drawPath(tail, stroke(INK, wire + 14));
  c.drawPath(tail, stroke(YARD.copperLight, wire));
  // copper's sheen mark: paired white ticks
  for (const [x, y] of [[-R * 0.4, -R * squash * 0.78], [R * 0.45, R * squash * 0.72]] as const) {
    c.drawPath(segment(x - 22, y + 12, x - 2, y - 16), stroke('#FFFFFF', 11));
    c.drawPath(segment(x + 6, y + 18, x + 22, y - 2), stroke('#FFFFFF', 11));
  }
  c.restore();
}

/** Star sparks (light, never flame). */
function sparks(c: SkCanvas, pts: [number, number, number][]): void {
  for (const [x, y, r] of pts) {
    const k = r * 0.28;
    const p = poly([x, y - r, x + k, y - k, x + r, y, x + k, y + k, x, y + r, x - k, y + k, x - r, y, x - k, y - k]);
    c.drawPath(p, stroke(INK, 8));
    c.drawPath(p, fill(YARD.glowWhite));
  }
}

/** The hi-vis ground with a soft lighter disc where the eye should go. */
function yellowGround(c: SkCanvas, gx: number, gy: number): void {
  c.drawRect({ x: 0, y: 0, width: S, height: S }, fill(YARD.hivis));
  c.drawPath(circle(gx, gy, 520), radial(gx, gy, 520, [YARD.hivisLight, 'rgba(255,226,102,0)']));
}

// ---------------------------------------------------------------------------
// pour
// ---------------------------------------------------------------------------

function pour(c: SkCanvas): void {
  yellowGround(c, 540, 640);
  wireHank(c, 700, 300, 235, 0.58, -10);
  // the mould along the bottom with its glowing bar
  const my = 800;
  outlined(c, poly([140, my, 884, my, 930, my + 130, 94, my + 130]), YARD.castIron);
  c.drawPath(poly([150, my + 9, 874, my + 9, 878, my + 22, 146, my + 22]), fill(shade(YARD.castIron, 0.3)));
  const cav = rrect(200, my + 30, 624, 64, 18);
  c.drawPath(cav, fill(shade(YARD.castIron, -0.5)));
  c.drawPath(rrect(212, my + 38, 600, 48, 16), linear(212, 0, 812, 0, [YARD.glow, YARD.glowHot, YARD.glowWhite, YARD.glowHot, YARD.glow], [0, 0.3, 0.5, 0.75, 1]));
  c.drawPath(cav, stroke(INK, LW * 0.8));
  // the ladle: a deep bowl tipped right, its spout low, a long shank up to the top-left
  const cx = 350;
  const cy = 400;
  const ang = 100;
  const W = 175;
  const rot = (x: number, y: number): [number, number] => {
    const a = (ang * Math.PI) / 180;
    return [cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)];
  };
  const [lx, ly] = rot(W + 62, -150);
  // the stream from the spout down into the mould
  const s1 = builder().moveTo(lx - 6, ly).cubicTo(lx + 40, ly + 20, 540, 690, 540, my + 46).build();
  c.drawPath(s1, stroke(INK, 92));
  c.drawPath(s1, stroke(YARD.glow, 70));
  c.drawPath(s1, stroke(YARD.glowHot, 44));
  c.drawPath(s1, stroke(YARD.glowWhite, 18));
  // the shank from the bowl's back up to a T handle
  const [sx, sy] = rot(-W * 0.2, -60);
  const shank = builder().moveTo(sx, sy).lineTo(150, 110).build();
  c.drawPath(shank, stroke(INK, 78));
  c.drawPath(shank, stroke(YARD.steelDark, 50));
  const tb = builder().moveTo(70, 190).lineTo(230, 30).build();
  c.drawPath(tb, stroke(INK, 84));
  c.drawPath(tb, stroke(YARD.hivisDark, 56));
  c.save();
  c.translate(cx, cy);
  c.rotate(ang, 0, 0);
  const bowl = builder().moveTo(-W, -150).cubicTo(-W, 120, -W * 0.5, 210, 0, 210).cubicTo(W * 0.5, 210, W, 120, W, -150).close().build();
  c.drawPath(bowl, linear(0, -150, 0, 210, [shade(YARD.steel, 0.25), YARD.steelDark, shade(YARD.steelDark, -0.4)], [0, 0.5, 1]));
  c.drawPath(rrect(-W + 6, -30, W * 2 - 12, 40, 6), fill(YARD.hivisDark));
  c.drawPath(bowl, stroke(INK, LW));
  const spout = poly([W - 30, -190, W + 70, -172, W + 64, -128, W - 30, -112]);
  outlined(c, spout, YARD.refractory);
  c.drawPath(oval(0, -150, W + 6, 62), fill(YARD.refractory));
  c.drawPath(oval(0, -150, W * 0.82, 44), radial(0, -150, W, [YARD.glowWhite, YARD.glowHot, YARD.glow], [0, 0.5, 1]));
  c.drawPath(oval(0, -150, W + 6, 62), stroke(INK, LW));
  c.restore();
  sparks(c, [[660, 720, 34], [420, 745, 26], [720, 640, 22], [380, 680, 18], [632, 790, 16]]);
}

// ---------------------------------------------------------------------------
// glove
// ---------------------------------------------------------------------------

function ticketPaper(c: SkCanvas, x: number, y: number, w: number, h: number, lines: number): void {
  const tooth = 34;
  const pts: number[] = [];
  for (let i = 0; i <= w / tooth; i++) pts.push(x + i * tooth, y + (i % 2 ? -14 : 0));
  for (let i = Math.floor(w / tooth); i >= 0; i--) pts.push(x + i * tooth, y + h + (i % 2 ? 14 : 0));
  const p = poly(pts);
  c.save();
  c.translate(14, 18);
  c.drawPath(p, fill(INK, 0.3));
  c.restore();
  outlined(c, p, YARD.paper, LW * 0.8);
  // sprocket strip
  c.drawPath(segment(x + 90, y + 10, x + 90, y + h - 10), stroke(YARD.paperLine, 6));
  for (let yy = y + 50; yy < y + h - 30; yy += 80) {
    c.drawPath(circle(x + 45, yy, 18), fill(YARD.paperShade));
    c.drawPath(circle(x + 45, yy, 18), stroke(YARD.paperLine, 5));
  }
  // header band and printed rows
  c.drawPath(rrect(x + 120, y + 40, w - 160, 70, 10), fill(YARD.hivis));
  c.drawPath(rrect(x + 120, y + 40, w - 160, 70, 10), stroke(INK, 8));
  for (let i = 0; i < lines; i++) {
    const yy = y + 150 + i * 62;
    const len = i % 2 ? 0.55 : 0.8;
    for (let k = 0; k < ((w - 160) * len) / 22; k++) c.drawPath(circle(x + 132 + k * 22, yy, 7), fill(YARD.print));
  }
}

function glove(c: SkCanvas): void {
  yellowGround(c, 512, 470);
  c.save();
  c.translate(512, 470);
  c.rotate(-11, 0, 0);
  ticketPaper(c, -330, -420, 640, 760, 6);
  // the blue stamp
  c.save();
  c.translate(90, 210);
  c.rotate(-8, 0, 0);
  c.drawPath(rrect(-170, -50, 340, 100, 14), stroke(YARD.stampBlue, 14, 0.85));
  for (let k = 0; k < 12; k++) c.drawPath(circle(-130 + k * 24, -6, 6.5), fill(YARD.stampBlue, 0.85));
  c.restore();
  c.restore();
  wireHank(c, 470, 560, 300, 0.56, -8);
  // the gloved hand from the lower right, its fingers over the coil's rim
  const cuff = poly([700, 1024, 1024, 1024, 1024, 760, 860, 690]);
  outlined(c, cuff, YARD.hivis);
  c.drawPath(poly([760, 1024, 820, 1024, 935, 728, 890, 712]), fill(YARD.reflect));
  c.drawPath(poly([760, 1024, 820, 1024, 935, 728, 890, 712]), stroke(INK, 8));
  const palm = builder().moveTo(640, 820).cubicTo(600, 730, 640, 640, 740, 610).lineTo(900, 640).cubicTo(960, 700, 920, 820, 830, 880).cubicTo(760, 920, 680, 900, 640, 820).close().build();
  c.drawPath(palm, fill(YARD.glove));
  c.drawPath(palm, stroke(INK, LW));
  // four fingers curling over the coil rim (rounded bars)
  for (let i = 0; i < 4; i++) {
    const fx = 560 + i * 62;
    const fy = 640 - i * 14;
    const f = rrect(fx, fy, 60, 150, 30);
    c.save();
    c.rotate(-18, fx + 30, fy + 75);
    c.drawPath(f, fill(shade(YARD.glove, i % 2 ? 0 : 0.08)));
    c.drawPath(f, stroke(INK, LW * 0.85));
    c.drawPath(segment(fx + 14, fy + 36, fx + 46, fy + 36), stroke(shade(YARD.glove, -0.25), 7));
    c.restore();
  }
  // thumb
  const thumb = rrect(640, 740, 150, 64, 32);
  c.save();
  c.rotate(-40, 715, 772);
  c.drawPath(thumb, fill(shade(YARD.glove, 0.06)));
  c.drawPath(thumb, stroke(INK, LW * 0.85));
  c.restore();
}

// ---------------------------------------------------------------------------
// ticket
// ---------------------------------------------------------------------------

function ticket(c: SkCanvas): void {
  c.drawRect({ x: 0, y: 0, width: S, height: S }, linear(0, 0, 0, S, [YARD.sky, YARD.skyLow]));
  // hazard foot
  const foot = poly([0, 880, S, 880, S, S, 0, S]);
  c.save();
  c.clipPath(foot, ClipOp.Intersect, true);
  c.drawPath(foot, fill(YARD.hivis));
  for (let x = -200; x < S + 200; x += 120) c.drawPath(poly([x, S, x + 60, S, x + 60 + 144, 880, x + 144, 880]), fill(INK));
  c.restore();
  c.drawPath(segment(0, 880, S, 880), stroke(INK, LW));
  // the display box at the top with its LED digits
  const bx = 150;
  const by = 90;
  const bw = 724;
  const bh = 300;
  c.drawPath(rrect(bx + 12, by + 18, bw, bh, 50), fill(INK, 0.3));
  outlined(c, rrect(bx, by, bw, bh, 50), YARD.hivis);
  c.drawPath(rrect(bx + 46, by + 46, bw - 92, bh - 120, 24), fill(YARD.ledCase));
  sevenSeg(c, '35.0', bx + bw - 80, by + 70, 140, YARD.led, YARD.ledOff);
  // the printer slot under the digits and the ticket coming out of it
  c.drawPath(rrect(bx + 170, by + bh - 56, bw - 340, 26, 13), fill(INK));
  c.save();
  c.translate(512, by + bh - 44);
  c.rotate(4, 0, 0);
  const tw = 340;
  const th = 470;
  const pts: number[] = [-tw / 2, 0, tw / 2, 0];
  for (let i = Math.floor(tw / 34); i >= 0; i--) pts.push(-tw / 2 + i * 34, th + (i % 2 ? 16 : 0));
  const p = poly(pts);
  outlined(c, p, YARD.paper, LW * 0.8);
  for (let yy = 40; yy < th - 30; yy += 70) c.drawPath(circle(-tw / 2 + 32, yy, 13), stroke(YARD.paperLine, 5));
  c.drawPath(rrect(-tw / 2 + 70, 36, 46, 46, 8), fill(YARD.copper));
  c.drawPath(rrect(-tw / 2 + 70, 36, 46, 46, 8), stroke(INK, 7));
  dotMatrix(c, 'CU', -tw / 2 + 132, 36, 46, YARD.print, { bold: true });
  for (let i = 0; i < 3; i++) for (let k = 0; k < 9 - (i % 2) * 3; k++) c.drawPath(circle(-tw / 2 + 80 + k * 26, 140 + i * 60, 8), fill(YARD.print));
  c.restore();
  // the coil of bright copper in front, lower left
  wireHank(c, 330, 750, 250, 0.55, -8);
}

export const CANDIDATES: Candidate[] = [
  { id: 'pour', note: 'a crucible tipping a glowing stream into an ingot mould, a big bright copper coil behind, on hi-vis yellow', icon: pour },
  { id: 'glove', note: 'a gloved hand holding bare bright copper up against a weighbridge ticket, on hi-vis yellow', icon: glove },
  { id: 'ticket', note: 'the weighbridge display printing a ticket over a coil of bright copper, daylight blue with a hazard foot', icon: ticket },
];
