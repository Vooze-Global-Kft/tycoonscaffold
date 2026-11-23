/**
 * The animals (spec 7.2): six customer species as busts in 3 coat colours each, the six named
 * minders (one per stall, each their species, with an apron and one thing of their own), the Paper
 * Dragon of the Parade, and the firefly (the hint pointer) with its glowing trail piece.
 *
 * Rounded silhouettes, a scarf (customers) or an apron (minders); modelled on no existing game or
 * film: no tails, no clothing beyond scarf and apron, no national dress, no religious symbol.
 * Design box: a square of half size `BEAST_BOX` (160 px at 3 px a point), origin at its centre,
 * the head's centre at (0, HEAD_Y); the bust's shoulders reach the bottom edge.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { COAT, NIGHT, alpha, mix, shade, type Species } from './palette';
import { INK, arc, at, blob, builder, circle, clip, curve, fill, glow, line, lit, oval, poly, rrect, shape, sparkle, stroke, union } from './pen';

export const BEAST_BOX = 80 / 3;
export const HEAD_Y = -5;

/** Scarf colours (customers), picked by species and coat so neighbours differ; red is not among them. */
const SCARVES = [NIGHT.amber, NIGHT.paperLight, '#5FA88B', NIGHT.silkLight, NIGHT.brass, '#B98AD0'];

export interface Minder {
  id: string;
  name: string;
  species: Species;
  chain: number;
  apron: string;
}

/** The six minders of spec 2.2, by chain. */
export const MINDERS: readonly Minder[] = [
  { id: 'oldbrindle', name: 'Old Brindle', species: 'badger', chain: 0, apron: '#7A5236' },
  { id: 'pim', name: 'Pim', species: 'owl', chain: 1, apron: '#4F9C80' },
  { id: 'nettle', name: 'Nettle', species: 'hedgehog', chain: 2, apron: '#B89452' },
  { id: 'juniper', name: 'Juniper', species: 'otter', chain: 3, apron: '#B9587D' },
  { id: 'tansy', name: 'Tansy', species: 'raccoon', chain: 4, apron: '#4C73A6' },
  { id: 'marlo', name: 'Marlo', species: 'bat', chain: 5, apron: '#D69A36' },
];

type Coat = [string, string, string, string];

function eyes(c: SkCanvas, dx: number, y: number, r = 1.9, color: string = INK): void {
  for (const s of [-1, 1]) {
    c.drawPath(oval(s * dx, y, r * 0.9, r * 1.1), fill(color));
    c.drawPath(circle(s * dx - r * 0.3, y - r * 0.4, r * 0.38), fill(NIGHT.white));
  }
}

function nose(c: SkCanvas, y: number, w = 2.4, color: string = INK): void {
  c.drawPath(blob([[-w, y - 0.6], [w, y - 0.6], [0, y + w * 0.7]], 1), fill(color));
}

function smile(c: SkCanvas, y: number, w = 2.2): void {
  c.drawPath(curve([[-w, y], [-w / 2, y + 1.2], [0, y + 0.2], [w / 2, y + 1.2], [w, y]]), stroke(INK, 0.9));
}

function cheeks(c: SkCanvas, dx: number, y: number): void {
  for (const s of [-1, 1]) c.drawPath(oval(s * dx, y, 2, 1.2), fill(alpha('#E07A7A', 0.35)));
}

/** The shoulders of the bust in the coat colour. */
function shoulders(c: SkCanvas, col: Coat, wide = 20): void {
  const b = builder().moveTo(-wide - 1, 27).cubicTo(-wide, 13, -11, 8, 0, 8).cubicTo(11, 8, wide, 13, wide + 1, 27).close().build();
  lit(c, b, col[1], col[0], -1.4, -1);
}

function scarf(c: SkCanvas, color: string): void {
  const band = builder().moveTo(-12.5, 9.5).quadTo(0, 15.5, 12.5, 9.5).lineTo(13, 14.5).quadTo(0, 20.5, -13, 14.5).close().build();
  lit(c, band, shade(color, -0.25), color, 0, -1);
  const tail = poly([5, 14, 11, 25, 6.4, 26, 2.4, 16]);
  lit(c, tail, shade(color, -0.25), color, -0.6, 0);
  for (const y of [22, 24]) c.drawPath(line(6.4, y + 1.6, 10.6, y), stroke(alpha(INK, 0.4), 0.7));
}

function apron(c: SkCanvas, color: string): void {
  for (const s of [-1, 1]) c.drawPath(line(s * 6.5, 10.5, s * 4.4, 15), stroke(INK, 2.2));
  for (const s of [-1, 1]) c.drawPath(line(s * 6.5, 10.5, s * 4.4, 15), stroke(NIGHT.paperLight, 1));
  const bib = builder().moveTo(-7, 14).lineTo(7, 14).lineTo(9.5, 27).lineTo(-9.5, 27).close().build();
  lit(c, bib, shade(color, -0.2), color, 0, -1);
  shape(c, rrect(-4.2, 19.5, 8.4, 4.6, 1.2), shade(color, -0.12), 0.8);
  c.drawPath(line(-9.5, 17.6, 9.5, 17.6), stroke(alpha(NIGHT.paperLight, 0.7), 1));
}

// ---------------------------------------------------------------------------
// Heads (centred on (0, HEAD_Y))
// ---------------------------------------------------------------------------

function fox(c: SkCanvas, col: Coat): void {
  for (const s of [-1, 1]) {
    const ear = poly([s * 5, -13, s * 13.5, -25.5, s * 14.2, -9]);
    lit(c, blob([[s * 4.6, -12.6], [s * 13, -25], [s * 14.6, -9.4]], 0.5), col[1], col[0], 0, 0);
    c.drawPath(blob([[s * 7.8, -14], [s * 12.6, -22], [s * 12.8, -12]], 0.5), fill(col[3]));
    void ear;
  }
  const head = blob([[-14, -7], [-9, -14.6], [0, -16], [9, -14.6], [14, -7], [12.4, 1.6], [0, 7.4], [-12.4, 1.6]], 1);
  lit(c, head, col[1], col[0], -1.2, -1.2);
  // White cheeks and muzzle.
  const muzzle = blob([[-12.6, -0.4], [-5, -2.6], [0, 0.4], [5, -2.6], [12.6, -0.4], [6, 5], [0, 7.4], [-6, 5]], 1);
  c.save();
  clip(c, head);
  c.drawPath(muzzle, fill(col[2]));
  c.restore();
  c.drawPath(head, stroke(INK, 1.25));
  eyes(c, 5.6, -5);
  nose(c, 2.4, 2.2);
  smile(c, 4.6, 1.8);
}

function hedgehog(c: SkCanvas, col: Coat): void {
  // A round crown of soft spines behind the face.
  const pts: number[] = [];
  const n = 15;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI * (0.95 + (1.1 * i) / n);
    const r = i % 2 ? 13 : 18.5;
    pts.push(Math.cos(a) * r, -3 + Math.sin(a) * r);
  }
  pts.push(15, 4, -15, 4);
  const crown = poly(pts);
  lit(c, crown, col[3], col[0], -1, -1.2);
  for (const s of [-1, 1]) shape(c, circle(s * 9.6, -9.6, 2.8), col[2], 1);
  const face = blob([[-11, -4], [0, -10.6], [11, -4], [9, 4], [0, 8.6], [-9, 4]], 1);
  lit(c, face, shade(col[2], -0.12), col[2], -0.8, -1);
  eyes(c, 4.6, -3.2, 1.8);
  shape(c, circle(0, 3.4, 1.9), INK, 0);
  cheeks(c, 7, 1.6);
  smile(c, 5.4, 1.5);
}

function badger(c: SkCanvas, col: Coat): void {
  for (const s of [-1, 1]) shape(c, circle(s * 10.4, -12.4, 3.4), col[0], 1.1);
  const head = blob([[-13, -4], [-7, -14.4], [0, -15.6], [7, -14.4], [13, -4], [10.6, 4], [0, 8], [-10.6, 4]], 1);
  c.drawPath(head, fill(col[2]));
  c.save();
  clip(c, head);
  // Two dark stripes over the eyes, the face white between them, grey cheeks.
  for (const s of [-1, 1]) c.drawPath(blob([[s * 2.2, -16], [s * 7.4, -16], [s * 9.4, -3], [s * 6.6, 3.6], [s * 3.6, -2]], 1), fill(col[3]));
  for (const s of [-1, 1]) c.drawPath(oval(s * 13.4, 0, 3.4, 7), fill(col[0]));
  c.restore();
  c.drawPath(head, stroke(INK, 1.25));
  eyes(c, 5.4, -4, 1.6, NIGHT.white);
  for (const s of [-1, 1]) c.drawPath(circle(s * 5.4, -3.8, 1.05), fill(INK));
  nose(c, 3, 2.4);
  smile(c, 5.2, 1.7);
}

function otter(c: SkCanvas, col: Coat): void {
  for (const s of [-1, 1]) shape(c, circle(s * 11.6, -9.6, 2.7), col[1], 1);
  const head = blob([[-13.4, -4], [-8, -13], [0, -14.2], [8, -13], [13.4, -4], [12, 4], [0, 8.4], [-12, 4]], 1);
  lit(c, head, col[1], col[0], -1.2, -1.2);
  c.save();
  clip(c, head);
  c.drawPath(oval(0, 2.6, 9.8, 6.2), fill(col[2]));
  c.restore();
  c.drawPath(head, stroke(INK, 1.25));
  eyes(c, 5.8, -5.4, 1.8);
  c.drawPath(oval(0, 0.6, 3.1, 2), fill(INK));
  for (const s of [-1, 1]) for (const dy of [0, 1.8]) c.drawPath(line(s * 4.4, 2.4 + dy, s * 9.8, 1.4 + dy * 1.6), stroke(alpha(INK, 0.55), 0.6));
  smile(c, 3.6, 1.8);
}

function bat(c: SkCanvas, col: Coat): void {
  for (const s of [-1, 1]) {
    const ear = blob([[s * 4, -11], [s * 9, -25], [s * 16.8, -17], [s * 12.4, -6.4]], 0.8);
    lit(c, ear, col[1], col[0], 0, -1);
    c.drawPath(blob([[s * 6.4, -11.6], [s * 9.6, -21.4], [s * 14, -16.4], [s * 11.6, -8.6]], 0.8), fill(alpha(col[2], 0.65)));
  }
  const head = blob([[-12, -3.6], [-7, -11.6], [0, -12.8], [7, -11.6], [12, -3.6], [10, 4.6], [0, 8], [-10, 4.6]], 1);
  lit(c, head, col[1], col[0], -1.2, -1.2);
  c.save();
  clip(c, head);
  c.drawPath(oval(0, 3, 6.6, 4.4), fill(alpha(col[2], 0.8)));
  c.restore();
  c.drawPath(head, stroke(INK, 1.25));
  eyes(c, 4.8, -3.6, 1.9);
  c.drawPath(builder().moveTo(-1.6, 0.6).lineTo(1.6, 0.6).lineTo(0, 2.6).close().build(), fill(INK));
  smile(c, 3.6, 2);
  c.drawPath(poly([1, 4.4, 2.6, 4.2, 1.8, 6]), fill(NIGHT.white));
}

function owl(c: SkCanvas, col: Coat): void {
  for (const s of [-1, 1]) lit(c, poly([s * 4, -12, s * 12.6, -19.4, s * 13.6, -8]), col[1], col[0], 0, -1);
  const head = blob([[-14.4, -3], [-10, -12.6], [0, -13.6], [10, -12.6], [14.4, -3], [12, 6], [0, 9], [-12, 6]], 1);
  lit(c, head, col[1], col[0], -1.2, -1.2);
  // Feather marks on the brow.
  for (const [x, y] of [[-6, -10], [0, -11.4], [6, -10]] as const) c.drawPath(arc(x, y, 1.6, 20, 140), stroke(alpha(INK, 0.35), 0.7));
  for (const s of [-1, 1]) {
    c.drawPath(circle(s * 5.6, -2.6, 5.4), fill(col[2]));
    c.drawPath(circle(s * 5.6, -2.6, 5.4), stroke(alpha(INK, 0.6), 0.8));
    c.drawPath(circle(s * 5.6, -2.6, 3), fill(NIGHT.amber));
    c.drawPath(circle(s * 5.6, -2.4, 1.7), fill(INK));
    c.drawPath(circle(s * 5.6 - 0.9, -3.4, 0.7), fill(NIGHT.white));
  }
  shape(c, poly([-1.8, 1.4, 1.8, 1.4, 0, 5.4]), NIGHT.brass, 0.9);
  c.drawPath(head, stroke(INK, 1.25));
}

function raccoon(c: SkCanvas, col: Coat): void {
  for (const s of [-1, 1]) {
    lit(c, blob([[s * 5, -11.6], [s * 10.6, -20.4], [s * 14.2, -9]], 0.6), col[1], col[0], 0, 0);
    c.drawPath(blob([[s * 7.6, -12], [s * 10.6, -17.4], [s * 12.6, -10.4]], 0.6), fill(col[2]));
  }
  const head = blob([[-14, -4], [-8, -13.6], [0, -14.8], [8, -13.6], [14, -4], [11.6, 3.6], [0, 8.4], [-11.6, 3.6]], 1);
  lit(c, head, col[1], col[0], -1.2, -1.2);
  c.save();
  clip(c, head);
  c.drawPath(blob([[-6, -10], [0, -12], [6, -10], [3, -6], [0, -6.4], [-3, -6]], 1), fill(col[2]));
  // The mask: one band across both eyes, a light muzzle below.
  c.drawPath(blob([[-14, -6.4], [-6, -7.6], [0, -5], [6, -7.6], [14, -6.4], [12, -0.6], [5.4, 0.4], [0, -2], [-5.4, 0.4], [-12, -0.6]], 1), fill(col[3]));
  c.drawPath(oval(0, 3.6, 7.4, 5.2), fill(col[2]));
  c.restore();
  c.drawPath(head, stroke(INK, 1.25));
  eyes(c, 5.6, -4, 1.7, NIGHT.white);
  for (const s of [-1, 1]) c.drawPath(circle(s * 5.6, -3.8, 1.1), fill(INK));
  nose(c, 1.6, 2.2);
  smile(c, 4.4, 1.7);
}

const HEADS: Record<Species, (c: SkCanvas, col: Coat) => void> = { fox, hedgehog, badger, otter, bat, owl, raccoon };

/** A customer bust: species, coat colour 0..2, with a scarf. */
export function drawCustomer(c: SkCanvas, species: Species, coat: number): void {
  const col = COAT[species][((coat % 3) + 3) % 3];
  shoulders(c, col);
  const i = (['fox', 'hedgehog', 'badger', 'otter', 'bat', 'owl', 'raccoon'] as const).indexOf(species);
  scarf(c, SCARVES[(i * 2 + coat * 3) % SCARVES.length]);
  at(c, 0, HEAD_Y, 1, 0, (k) => HEADS[species](k, col));
}

/** A minder (by chain index 0..5): their species with an apron in the stall's colour and one mark of their own. */
export function drawMinder(c: SkCanvas, chain: number): void {
  const m = MINDERS[((chain % 6) + 6) % 6];
  const col = COAT[m.species][0];
  shoulders(c, col, 19);
  apron(c, m.apron);
  at(c, 0, HEAD_Y, 1, 0, (k) => {
    HEADS[m.species](k, col);
    switch (m.id) {
      case 'oldbrindle':
        // Round brass spectacles and a grey brow: the oldest of the street.
        for (const s of [-1, 1]) k.drawPath(circle(s * 5.4, -4, 3.3), stroke(NIGHT.brass, 1));
        k.drawPath(line(-2.1, -4.2, 2.1, -4.2), stroke(NIGHT.brass, 0.9));
        for (const s of [-1, 1]) k.drawPath(line(s * 3, -9.2, s * 7.6, -8.4), stroke(alpha(NIGHT.white, 0.9), 1.1));
        break;
      case 'pim':
        // A sprig of tea leaves tucked by one tuft.
        for (const d of [-30, 20]) at(k, 10.6, -15, 1, d, (q) => shape(q, blob([[0, 0], [2, -2.4], [0, -5.6], [-2, -2.4]], 1), NIGHT.leaf, 0.8));
        break;
      case 'nettle':
        // A cloth headband across the spines.
        k.drawPath(curve([[-13.4, -8.4], [0, -12.6], [13.4, -8.4]]), stroke(INK, 3.6));
        k.drawPath(curve([[-13.4, -8.4], [0, -12.6], [13.4, -8.4]]), stroke(NIGHT.amber, 2.2));
        shape(k, blob([[12, -9], [16.4, -12.4], [16, -7]], 1), NIGHT.amber, 0.8);
        break;
      case 'juniper':
        // A berry flower behind one ear.
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          shape(k, circle(-11.6 + Math.cos(a) * 2.2, -9.6 + Math.sin(a) * 2.2, 1.6), NIGHT.paperLight, 0.6);
        }
        k.drawPath(circle(-11.6, -9.6, 1.3), fill(NIGHT.amber));
        break;
      case 'tansy':
        // A headscarf knotted on top.
        k.drawPath(builder().moveTo(-12.4, -9).quadTo(0, -19.6, 12.4, -9).quadTo(0, -13, -12.4, -9).close().build(), fill(NIGHT.silkLight));
        k.drawPath(builder().moveTo(-12.4, -9).quadTo(0, -19.6, 12.4, -9).quadTo(0, -13, -12.4, -9).close().build(), stroke(INK, 0.9));
        for (const s of [-1, 1]) shape(k, blob([[0, -15], [s * 4.4, -19], [s * 3, -14.2]], 1), NIGHT.silkLight, 0.8);
        for (const [x, y] of [[-6, -12.4], [2, -14], [7, -11.6]] as const) k.drawPath(circle(x, y, 0.8), fill(NIGHT.paperLight));
        break;
      case 'marlo':
        // A small lantern pin on one ear.
        at(k, 11.4, -15.4, 1, 0, (q) => drawPinLantern(q));
        break;
    }
  });
}

function drawPinLantern(c: SkCanvas): void {
  glow(c, 0, 0, 6, NIGHT.amber, 0.6);
  shape(c, oval(0, 0, 2.6, 3), NIGHT.amber, 0.8);
  c.drawPath(line(-1.4, -3, 1.4, -3), stroke(NIGHT.brass, 1));
  c.drawPath(line(-1.4, 3, 1.4, 3), stroke(NIGHT.brass, 1));
}

// ---------------------------------------------------------------------------
// The Paper Dragon of the Parade
// ---------------------------------------------------------------------------

/**
 * The Paper Dragon: a folded-paper festival head with brass whiskers, rounded horns and an
 * accordion body behind it, friendly and invented (no costume of any real tradition).
 */
export function drawDragon(c: SkCanvas): void {
  const paper = NIGHT.paperLight;
  const amber = NIGHT.amber;
  // Accordion body sweeping behind, lower right to left.
  for (let i = 5; i >= 0; i--) {
    const x = -16 + i * 6.6;
    const y = 18 - Math.sin(i * 0.9) * 3;
    const seg = rrect(x - 4, y - 7, 8, 14, 3);
    lit(c, seg, i % 2 ? shade(amber, -0.15) : NIGHT.paperShade, i % 2 ? amber : paper, -0.8, -1, 1);
  }
  // Paper mane: a fringe of teal scallops round the head.
  const mane: [number, number][] = [];
  for (let i = 0; i < 14; i++) {
    const a = Math.PI * (0.85 + (1.3 * i) / 13);
    const r = i % 2 ? 16 : 19.5;
    mane.push([Math.cos(a) * r, -6 + Math.sin(a) * r]);
  }
  mane.push([16, 6], [-16, 6]);
  lit(c, blob(mane, 0.6), '#2F7A6B', '#5FA88B', -1, -1);
  // Horns.
  for (const s of [-1, 1]) lit(c, blob([[s * 4, -16], [s * 7, -24.6], [s * 11, -24], [s * 9.6, -15]], 1), NIGHT.brassDeep, NIGHT.brass, 0, -1);
  // Head: a big rounded paper box with fold lines.
  const head = blob([[-13.4, -10], [0, -16], [13.4, -10], [14.8, 1], [9.6, 8.6], [0, 10], [-9.6, 8.6], [-14.8, 1]], 1);
  lit(c, head, NIGHT.paperShade, paper, -1.4, -1.4);
  c.save();
  clip(c, head);
  for (const x of [-7, 0, 7]) c.drawPath(line(x, -16, x * 1.2, 10), stroke(alpha(NIGHT.paperEdge, 0.55), 0.8));
  c.drawPath(rrect(-16, 2.4, 32, 10, 0), fill(alpha(amber, 0.9)));
  c.restore();
  c.drawPath(head, stroke(INK, 1.3));
  // Brows, eyes, nostrils, a wide smile.
  for (const s of [-1, 1]) {
    c.drawPath(curve([[s * 3, -9.6], [s * 6.4, -11.6], [s * 10, -10]]), stroke(INK, 1.4));
    c.drawPath(circle(s * 6.4, -5.2, 3.4), fill(NIGHT.white));
    c.drawPath(circle(s * 6.4, -5.2, 3.4), stroke(INK, 1));
    c.drawPath(circle(s * 6, -4.8, 1.9), fill(INK));
    c.drawPath(circle(s * 5.4, -5.6, 0.7), fill(NIGHT.white));
    c.drawPath(oval(s * 3, 1.4, 1.1, 0.8), fill(INK));
  }
  c.drawPath(curve([[-8.6, 4.8], [-4, 8.4], [0, 6.4], [4, 8.4], [8.6, 4.8]]), stroke(INK, 1.2));
  for (const s of [-1, 1]) c.drawPath(oval(s * 10.4, 1.6, 1.8, 1.1), fill(alpha('#E07A7A', 0.5)));
  // Brass whiskers curling out.
  for (const s of [-1, 1]) {
    const w = curve([[s * 12.6, 2.6], [s * 19, 1], [s * 22, 5.4], [s * 19.4, 8.6]]);
    c.drawPath(w, stroke(INK, 2.2));
    c.drawPath(w, stroke(NIGHT.brassLight, 1));
  }
}

// ---------------------------------------------------------------------------
// The firefly (hint pointer) and its trail
// ---------------------------------------------------------------------------

export const FIREFLY_GLOW = '#E8F59A';

/** The firefly, centred on its glowing tail; `k` 0..1 is the glow pulse, `wing` 0..1 the wing beat. */
export function drawFirefly(c: SkCanvas, k = 1, wing = 0.5): void {
  glow(c, 0, 2, 11 + k * 5, FIREFLY_GLOW, 0.45 + k * 0.35);
  // Wings: two paper ellipses tilted by the beat.
  for (const s of [-1, 1]) {
    at(c, s * 2.6, -2.4, 1, s * (25 + wing * 30), (q) => {
      q.drawPath(oval(s * 3, -1, 3.6, 2.2), fill(alpha(NIGHT.paperLight, 0.75)));
      q.drawPath(oval(s * 3, -1, 3.6, 2.2), stroke(alpha(INK, 0.6), 0.6));
    });
  }
  shape(c, oval(0, -3.4, 2.4, 2.6), NIGHT.inkSoft, 0.8);
  shape(c, oval(0, 2, 2.8, 3.6), mix(FIREFLY_GLOW, NIGHT.white, 0.3 * k), 0.8);
  c.drawPath(circle(0, 2.2, 1.4), fill(NIGHT.white));
  for (const s of [-1, 1]) c.drawPath(curve([[s * 0.8, -5.6], [s * 2, -8], [s * 3.4, -8.6]]), stroke(INK, 0.6));
}

/** One piece of the firefly's glowing trail (drag hints draw a row of them), `k` 0..1 its fade. */
export function drawTrailPiece(c: SkCanvas, k = 1): void {
  glow(c, 0, 0, 5.4, FIREFLY_GLOW, 0.55 * k);
  c.drawPath(circle(0, 0, 1.5), fill(alpha(NIGHT.white, 0.9 * k)));
  sparkle(c, 0, 0, 2.6, alpha(FIREFLY_GLOW, k));
}

void union;
void poly;
