/**
 * Pizza Empire app icon: the game's chef (Chef Marco, `marco` in src/ui/sim/art/looks.ts: tall
 * toque, curled moustache) drawn by the game's own portrait code (getBustArt in characterArt.ts),
 * facing the viewer, with a slice of pizza drawn in the same kit style, on the theme's warm
 * red-to-orange gradient. Pure Skia: require() it inside scripts/art/headless.ts.
 *
 * Everything draws into a 1024 x 1024 square (points = pixels at scale 1).
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { OUTLINE, Pen, arc, blob, circle, ellipse, lightOf, line, poly, record } from '../../../src/ui/art/draw';
import { getBustArt, type BustMood } from '../../../src/ui/sim/art/characterArt';
import { resolveLook, type LookInput } from '../../../src/ui/sim/art/looks';

export const S = 1024;
/** theme.colors.gradient of games/pizza-empire/game.json. */
export const RED = '#E63946';
export const ORANGE = '#F4A261';
export const YELLOW = '#FFD166';

export type PizzaBackdrop = 'sun' | 'plain' | 'tile';

export interface PizzaIconOptions {
  look?: LookInput;
  mood?: BustMood;
  backdrop?: PizzaBackdrop;
  /** Draw the background (false for the adaptive and splash layers). */
  background?: boolean;
  /** Bust centre (head middle) and size in pixels per head unit. */
  x?: number;
  y?: number;
  unit?: number;
  /** Outline weight in head units (the game uses 3.4 for portraits). */
  ow?: number;
  /** Slice: where (pixels), turn (degrees) and size (pixels per unit); null for none. */
  slice?: { x: number; y: number; turn: number; unit: number } | null;
}

/** A slice of pizza in the kit's style (outline, crust band, cheese, pepperoni, basil), tip down, about 30 x 34 units. */
export function drawSlice(p: Pen): void {
  const crust = '#E8B36B';
  const cheese = '#FAD46B';
  const pep = '#D8432F';
  const basil = '#4FA64F';
  // Cheese wedge, tip at the bottom.
  const wedge = blob([[-15, -12, 0], [0, -15.5], [15, -12, 0], [1.2, 20, 0], [-1.2, 20, 0]], 0.6);
  p.shape(wedge, cheese, { shade: 3, shadeColor: '#F2B441' });
  // Sauce peeking at the crust edge.
  p.fill(arc(0, 6, 17, 19.5, 222, 96), '#E86A3A');
  // Crust: a fat rounded band along the top.
  const band = blob([[-16.5, -12.5], [0, -17.5], [16.5, -12.5], [15.2, -8.4], [0, -12.2], [-15.2, -8.4]], 0.8);
  p.shape(band, crust, { shade: 1.6, light: 1.2, lightColor: lightOf(crust) });
  // Pepperoni.
  for (const [x, y, r] of [[-6.5, -3.5, 3.6], [5.6, -4.2, 3.4], [0, 7.5, 3]] as const) {
    p.shape(circle(x, y, r), pep, { ow: 2.2, shade: 1 });
    p.dot(x - r * 0.35, y - r * 0.35, r * 0.28, lightOf(pep));
  }
  // Basil leaf.
  p.shape(ellipse(-1.2, 1.5, 2.6, 1.4, -35), basil, { ow: 1.8, shade: false });
  // A cheese drip at the tip.
  p.shape(blob([[-1.6, 17], [1.6, 17], [1.2, 22.5], [0, 24.5], [-1.2, 22.5]], 0.8), cheese, { ow: 2, shade: false });
  p.shine(line(-10, -6.5, -6.5, 3), '#FFFFFF', 1.6, 0.7);
}

export function drawChef(c: SkCanvas, o: PizzaIconOptions): void {
  const look = resolveLook(o.look ?? 'marco');
  const art = getBustArt(look, o.ow ?? 3.4, o.mood ?? 'calm');
  c.save();
  c.translate(o.x ?? 512, o.y ?? 470);
  const u = o.unit ?? 9;
  c.scale(u, u);
  c.drawPicture(art.base);
  if (art.eyes) c.drawPicture(art.eyes);
  c.restore();
}

export function drawSliceAt(c: SkCanvas, s: { x: number; y: number; turn: number; unit: number }, ow = 3.2): void {
  const pic = record((p) => drawSlice(p), OUTLINE, ow);
  c.save();
  c.translate(s.x, s.y);
  c.rotate(s.turn, 0, 0);
  c.scale(s.unit, s.unit);
  c.drawPicture(pic);
  c.restore();
}

export function drawPizzaIcon(c: SkCanvas, o: PizzaIconOptions): void {
  if (o.background ?? true) drawBackground(c, o.backdrop ?? 'sun');
  drawChef(c, o);
  if (o.slice) drawSliceAt(c, o.slice);
}

/** The warm background: yellow-orange glow behind the head, theme red at the edges. */
export function drawBackground(c: SkCanvas, kind: PizzaBackdrop, cy = 420): void {
  const p = new Pen(c, OUTLINE, 0);
  const sq = poly([[0, 0], [S, 0], [S, S], [0, S]]);
  p.radial(sq, 512, cy, 780, [YELLOW, ORANGE, RED, '#B01E2C'], [0, 0.3, 0.76, 1]);
  if (kind === 'sun') {
    const n = 16;
    for (let i = 0; i < n; i += 2) {
      const a0 = ((i - 0.5) / n) * Math.PI * 2 - Math.PI / 2;
      const a1 = ((i + 0.5) / n) * Math.PI * 2 - Math.PI / 2;
      const R = 1500;
      p.fill(poly([[512, cy], [512 + Math.cos(a0) * R, cy + Math.sin(a0) * R], [512 + Math.cos(a1) * R, cy + Math.sin(a1) * R]]), '#FFF0C822');
    }
  } else if (kind === 'tile') {
    for (let x = 0; x < S; x += 128)
      for (let y = 768; y < S; y += 128) if (((x + y) / 128) % 2 === 0) p.fill(poly([[x, y], [x + 128, y], [x + 128, y + 128], [x, y + 128]]), '#FFFFFF38');
  }
  p.dispose();
}
