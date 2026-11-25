/**
 * Scrapyard ("Scrap to Ingot", cleared by the names register) app icon, drawn in code in the kit's style
 * (src/ui/salvage/art: hi-vis-and-rust, ink outlines, flat tones, heat the only orange). Ruling 14: lead
 * with copper and the pour; never a lone gold bar, never a truck; judged at 60 px beside the four other
 * games' icons (scripts/art/yard-icons.ts makes the sheets).
 *
 * The judge chose "pour" and rejected "glove" (a document utility, a fist) and "ticket" (a POS app, the
 * same pale-ground-and-paper layout as Proudly Adequate's icon). "pour" as finished: on hi-vis yellow, a
 * refractory crucible held in steel tongs tips its lip well above an ingot mould; a copper-orange stream
 * falls straight down into a glowing copper ingot; a bundle of bare bright copper wire with cut ends lies
 * at the lower left (the scrap that went in). No floating ring, no four-point sparkles, no ladle.
 *
 * Pure Skia: require() it inside scripts/art/headless.ts. Everything draws into 1024 x 1024.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { YARD, mix as mixC, shade } from '../../../src/ui/salvage/art/palette';
import { builder, circle, fill, linear, oval, poly, radial, rrect, segment, stroke } from '../../../src/ui/salvage/art/pen';

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

/** The hi-vis ground with a soft lighter disc where the eye should go. */
function yellowGround(c: SkCanvas, gx: number, gy: number): void {
  c.drawRect({ x: 0, y: 0, width: S, height: S }, fill(YARD.hivis));
  c.drawPath(circle(gx, gy, 520), radial(gx, gy, 520, [YARD.hivisLight, 'rgba(255,226,102,0)']));
}

// ---------------------------------------------------------------------------
// pour
// ---------------------------------------------------------------------------

/** A bundle of bare bright copper wire seen from the end: loops of wire, a tie, bright cut ends. */
function wireBundleEnd(c: SkCanvas, cx: number, cy: number, R: number): void {
  // the bundle's length running back up-right, as a fat band of parallel wires
  c.save();
  c.translate(cx, cy);
  c.rotate(-24, 0, 0);
  const L = R * 2.3;
  const band = rrect(0, -R * 0.86, L, R * 1.72, R * 0.5);
  c.drawPath(band, fill(YARD.copperDark));
  for (let i = 0; i < 7; i++) {
    const y = -R * 0.72 + (i * R * 1.44) / 6;
    c.drawPath(segment(R * 0.2, y, L - R * 0.2, y), stroke(i % 2 ? YARD.copper : YARD.copperLight, R * 0.16));
  }
  c.drawPath(band, stroke(INK, LW));
  // the galvanised tie
  for (const x of [L * 0.55, L * 0.62]) {
    c.drawPath(segment(x, -R * 0.95, x, R * 0.95), stroke(INK, 30));
    c.drawPath(segment(x, -R * 0.95, x, R * 0.95), stroke(YARD.galvanisedLight, 16));
  }
  // the cut end: many bright copper discs
  c.drawPath(oval(0, 0, R * 0.5, R * 0.92), fill(YARD.copperDark));
  c.drawPath(oval(0, 0, R * 0.5, R * 0.92), stroke(INK, LW));
  const pts: [number, number][] = [[0, -0.62], [0, -0.2], [0, 0.22], [0, 0.62], [-0.22, -0.42], [-0.22, 0.0], [-0.22, 0.42], [0.22, -0.42], [0.22, 0.0], [0.22, 0.42]];
  for (const [u, w] of pts) {
    c.drawPath(circle(u * R, w * R, R * 0.17), fill(YARD.copperSheen));
    c.drawPath(circle(u * R, w * R, R * 0.17), stroke(YARD.copperDark, 5));
  }
  c.restore();
}

function pour(c: SkCanvas): void {
  yellowGround(c, 560, 560);
  // the mould along the bottom, a glowing copper ingot in its cavity
  const my = 770;
  outlined(c, poly([250, my, 960, my, 1000, my + 150, 210, my + 150]), YARD.castIron);
  c.drawPath(poly([262, my + 10, 948, my + 10, 954, my + 26, 256, my + 26]), fill(shade(YARD.castIron, 0.3)));
  const cav = poly([320, my + 40, 890, my + 40, 870, my + 112, 340, my + 112]);
  c.drawPath(cav, fill(shade(YARD.castIron, -0.55)));
  const ingot = poly([336, my + 50, 874, my + 50, 858, my + 104, 352, my + 104]);
  c.drawPath(ingot, linear(336, 0, 874, 0, [YARD.copper, '#D9682E', YARD.glow, YARD.glowHot, YARD.glowWhite], [0, 0.25, 0.55, 0.8, 1]));
  c.drawPath(cav, stroke(INK, LW * 0.8));
  // the crucible in its tongs, tipped east, its lip above the mould's far end
  const cx = 470;
  const cy = 360;
  const ang = 52;
  const W = 150;
  const top = -170;
  const bot = 150;
  const rot = (x: number, y: number): [number, number] => {
    const a = (ang * Math.PI) / 180;
    return [cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)];
  };
  const [lx, ly] = rot(W + 26, top + 12);
  // the tongs' arms out of the top-left edge (drawn first: they pass behind the ring)
  for (const off of [-46, 46]) {
    const [ax, ay] = rot(-W - 20, -10 + off);
    const arm = builder().moveTo(ax, ay).lineTo(ax - 340, ay - 330).build();
    c.drawPath(arm, stroke(INK, 70));
    c.drawPath(arm, stroke(YARD.steelDark, 44));
    c.drawPath(builder().moveTo(ax - 6, ay - 14).lineTo(ax - 330, ay - 340).build(), stroke(shade(YARD.steel, 0.3), 10));
  }
  c.save();
  c.translate(cx, cy);
  c.rotate(ang, 0, 0);
  // the crucible: a refractory pot, wider at the belly, rounded foot
  const body = builder()
    .moveTo(-W * 0.92, top)
    .cubicTo(-W * 1.12, top + 120, -W * 1.05, bot - 40, -W * 0.6, bot)
    .cubicTo(-W * 0.3, bot + 30, W * 0.3, bot + 30, W * 0.6, bot)
    .cubicTo(W * 1.05, bot - 40, W * 1.12, top + 120, W * 0.92, top)
    .close()
    .build();
  c.drawPath(body, linear(-W, 0, W, 0, [mixC(YARD.refractory, '#FFFFFF', 0.25), YARD.refractory, shade(YARD.refractory, -0.35)], [0, 0.45, 1]));
  c.drawPath(body, stroke(INK, LW));
  // the tongs' ring round the belly
  const ring = rrect(-W * 1.12, -36, W * 2.24, 64, 20);
  c.drawPath(ring, fill(YARD.steelDark));
  c.drawPath(rrect(-W * 1.08, -30, W * 2.16, 16, 8), fill(shade(YARD.steel, 0.25)));
  c.drawPath(ring, stroke(INK, LW));
  // the mouth: the rim, the melt inside, the pouring lip
  c.drawPath(oval(0, top, W * 0.94, 46), fill(shade(YARD.refractory, -0.2)));
  c.drawPath(oval(W * 0.08, top + 2, W * 0.7, 30), radial(W * 0.08, top, W * 0.75, [YARD.glowWhite, YARD.glowHot, YARD.glow], [0, 0.45, 1]));
  c.drawPath(oval(0, top, W * 0.94, 46), stroke(INK, LW));
  const lip = poly([W * 0.78, top - 30, W + 44, top - 20, W + 44, top + 6, W * 0.78, top + 22]);
  outlined(c, lip, shade(YARD.refractory, -0.1));
  c.drawPath(rrect(W * 0.8, top - 12, 60, 18, 9), fill(YARD.glowHot));
  c.restore();
  // the stream: straight down from the lip, thick at the lip and thinner below, copper-orange glow
  const sx = lx;
  const sy0 = ly - 2;
  const sy1 = my + 60;
  const stream = (w0: number, w1: number, col: string) => c.drawPath(poly([sx - w0 / 2, sy0, sx + w0 / 2, sy0, sx + w1 / 2, sy1, sx - w1 / 2, sy1]), fill(col));
  stream(84, 64, INK);
  stream(62, 44, '#D9682E');
  stream(44, 28, YARD.glow);
  stream(24, 13, YARD.glowHot);
  stream(8, 4, YARD.glowWhite);
  c.drawPath(oval(sx, my + 74, 92, 26), radial(sx, my + 74, 100, [YARD.glowWhite, 'rgba(255,138,42,0)']));
  // the scrap that went in: bare bright copper wire, lower left
  wireBundleEnd(c, 150, 870, 120);
}

/** The finished icon (the judge's choice, finished as asked). */
export const ICON = pour;

export const CANDIDATES: Candidate[] = [
  { id: 'pour', note: 'a crucible in tongs pouring a copper-orange stream straight down into a glowing copper ingot, bare bright wire at the lower left, on hi-vis yellow', icon: pour },
];
