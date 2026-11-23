/**
 * The animals (spec 7.2): six customer species as busts in 3 coat colours each, the six named
 * minders (one per stall, each their species, with an apron and one thing of their own), the Paper
 * Dragon of the Parade, and the firefly (the hint pointer) with its glowing trail piece.
 *
 * Rounded silhouettes, a scarf (customers) or work clothes (minders); modelled on no existing game or
 * film: no tails, no clothing beyond scarf and apron, no national dress, no religious symbol.
 * Design box: a square of half size `BEAST_BOX` (160 px at 3 px a point), origin at its centre,
 * the head's centre at (0, HEAD_Y); the bust's shoulders reach the bottom edge.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { COAT, NIGHT, alpha, mix, shade, type Species } from './palette';
import { INK, arc, at, blob, builder, circle, clip, curve, fill, glow, line, lit, oval, poly, rrect, shape, sparkle, stroke, union } from './pen';

export const BEAST_BOX = 80 / 3;
/** The head's centre (points): the head sits INTO the shoulders, its base covered by the scarf or collar. */
export const HEAD_Y = -7;

/** Scarf colours (customers), picked by species and coat so neighbours differ; red is not among them. */
const SCARVES = [NIGHT.amber, NIGHT.paperLight, '#5FA88B', NIGHT.silkLight, NIGHT.brass, '#B98AD0'];

export interface Minder {
  id: string;
  name: string;
  species: Species;
  chain: number;
  /** The colour of the minder's work clothes (the stall's own colour family). */
  apron: string;
}

/** The six minders of spec 2.2, by chain. */
export const MINDERS: readonly Minder[] = [
  { id: 'oldbrindle', name: 'Old Brindle', species: 'badger', chain: 0, apron: '#7A5236' },
  { id: 'pim', name: 'Pim', species: 'owl', chain: 1, apron: '#4F9C80' },
  { id: 'nettle', name: 'Nettle', species: 'hedgehog', chain: 2, apron: '#B89452' },
  { id: 'juniper', name: 'Juniper', species: 'otter', chain: 3, apron: '#B9587D' },
  { id: 'tansy', name: 'Tansy', species: 'hare', chain: 4, apron: '#4C73A6' },
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

/** The shoulders of the bust in the coat colour; their top (y = 1) sits under the head's base. */
function shoulders(c: SkCanvas, col: Coat, wide = 20, top = 1): void {
  const b = builder().moveTo(-wide - 1, 27.5).cubicTo(-wide, top + 8, -11, top, 0, top).cubicTo(11, top, wide, top + 8, wide + 1, 27.5).close().build();
  lit(c, b, col[1], col[0], -1.4, -1);
}

/** A neck column in the coat colour joining the head to the shoulders (drawn before the head). */
function neck(c: SkCanvas, col: Coat, w = 7): void {
  lit(c, rrect(-w, -4, w * 2, 12, w * 0.6), col[1], col[0], -0.8, 0, 1);
}

/** The customer's scarf: a band wrapped round the neck over the head's base, one tail hanging. */
function scarf(c: SkCanvas, color: string): void {
  const band = builder().moveTo(-11.5, 2.6).quadTo(0, 8.6, 11.5, 2.6).lineTo(12.4, 7.8).quadTo(0, 14.2, -12.4, 7.8).close().build();
  lit(c, band, shade(color, -0.25), color, 0, -1);
  const tail = poly([4.6, 8.6, 10.6, 21, 6, 22, 2.2, 10.4]);
  lit(c, tail, shade(color, -0.25), color, -0.6, 0);
  for (const y of [17.6, 19.6]) c.drawPath(line(6, y + 1.6, 10.2, y), stroke(alpha(INK, 0.4), 0.7));
}

// ---------------------------------------------------------------------------
// Heads (centred on (0, HEAD_Y); every part above y = -19 so the ears fit the 160 px box)
// ---------------------------------------------------------------------------

function fox(c: SkCanvas, col: Coat): void {
  for (const s of [-1, 1]) {
    lit(c, blob([[s * 4.4, -11.6], [s * 12.6, -18.6], [s * 14.6, -7.4]], 0.5), col[1], col[0], 0, 0);
    c.drawPath(blob([[s * 7.4, -12.4], [s * 12, -16.4], [s * 12.8, -9.8]], 0.5), fill(col[3]));
  }
  const head = blob([[-14.2, -6], [-9, -13], [0, -14.4], [9, -13], [14.2, -6], [12.6, 2], [0, 8.4], [-12.6, 2]], 1);
  lit(c, head, col[1], col[0], -1.2, -1.2);
  // White cheeks and a pointed muzzle.
  const muzzle = blob([[-13, 0.4], [-5, -2], [0, 0.6], [5, -2], [13, 0.4], [6, 5.4], [0, 8.4], [-6, 5.4]], 1);
  c.save();
  clip(c, head);
  c.drawPath(muzzle, fill(col[2]));
  c.restore();
  c.drawPath(head, stroke(INK, 1.25));
  eyes(c, 5.6, -4.4);
  nose(c, 3.2, 2.2);
  smile(c, 5.4, 1.8);
}

/** The fox's brush curling up behind one shoulder, white-tipped: the fox's own cue at any coat. */
function foxTail(c: SkCanvas, col: Coat): void {
  const tail = blob([[12, 26], [16.6, 14], [21.4, 4.6], [25.4, 6], [24.4, 15], [19.6, 26]], 1);
  lit(c, tail, col[1], col[0], -0.8, -0.8);
  c.save();
  clip(c, tail);
  c.drawPath(circle(24, 5.4, 5.2), fill(col[2]));
  c.restore();
  c.drawPath(tail, stroke(INK, 1.1));
}

function hedgehog(c: SkCanvas, col: Coat): void {
  // A round crown of soft spines behind the face.
  const pts: number[] = [];
  const n = 15;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI * (0.95 + (1.1 * i) / n);
    const r = i % 2 ? 11.6 : 15.6;
    pts.push(Math.cos(a) * r * 1.05, -2.6 + Math.sin(a) * r);
  }
  pts.push(15, 4, -15, 4);
  const crown = poly(pts);
  lit(c, crown, col[3], col[0], -1, -1.2);
  for (const s of [-1, 1]) shape(c, circle(s * 9.4, -8.8, 2.6), col[2], 1);
  const face = blob([[-11, -3.4], [0, -10], [11, -3.4], [9, 4.4], [0, 8.6], [-9, 4.4]], 1);
  lit(c, face, shade(col[2], -0.12), col[2], -0.8, -1);
  eyes(c, 4.6, -2.8, 1.8);
  shape(c, circle(0, 3.6, 1.9), INK, 0);
  cheeks(c, 7, 2);
  smile(c, 5.6, 1.5);
}

function badger(c: SkCanvas, col: Coat): void {
  for (const s of [-1, 1]) shape(c, circle(s * 10.4, -11.6, 3.2), col[0], 1.1);
  const head = blob([[-13, -4], [-7, -13.6], [0, -14.8], [7, -13.6], [13, -4], [10.6, 4], [0, 8.4], [-10.6, 4]], 1);
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

/** Otter: a long, low, flat head (wider than tall), small ears set low, a pale muzzle band with whisker pads, a wide nose. */
function otter(c: SkCanvas, col: Coat): void {
  for (const s of [-1, 1]) shape(c, oval(s * 13.4, -4.6, 2.2, 1.9), col[1], 1);
  const head = blob([[-15.6, -1.4], [-11, -9.4], [0, -11], [11, -9.4], [15.6, -1.4], [13, 4.4], [0, 7.4], [-13, 4.4]], 1);
  lit(c, head, col[1], col[0], -1.2, -1.2);
  c.save();
  clip(c, head);
  // The pale band across the lower face, from cheek to cheek.
  c.drawPath(blob([[-16, 0.2], [-8, -2.2], [0, -0.6], [8, -2.2], [16, 0.2], [13, 8], [-13, 8]], 1), fill(col[2]));
  c.restore();
  c.drawPath(head, stroke(INK, 1.25));
  eyes(c, 6.6, -4.6, 1.6);
  // Whisker pads and a wide, flat nose.
  for (const s of [-1, 1]) c.drawPath(oval(s * 2.6, 3, 3, 2.2), fill(shade(col[2], 0.25)));
  c.drawPath(rrect(-3, -1.4, 6, 2.8, 1.4), fill(INK));
  for (const s of [-1, 1]) for (const dy of [0, 1.8]) c.drawPath(line(s * 5, 2.4 + dy, s * 12.4, 1.2 + dy * 1.7), stroke(alpha(INK, 0.6), 0.6));
  c.drawPath(curve([[-2, 4.6], [0, 5.8], [2, 4.6]]), stroke(INK, 0.9));
}

/** Bat: big pointed ribbed ears, an upturned pug nose, two tiny fangs. Its folded wings sit on the shoulders (batWings). */
function bat(c: SkCanvas, col: Coat): void {
  for (const s of [-1, 1]) {
    const ear = blob([[s * 3.6, -10.4], [s * 8.4, -19], [s * 16, -14.6], [s * 12.8, -5.4]], 0.6);
    lit(c, ear, col[1], col[0], 0, -1);
    c.drawPath(blob([[s * 6, -10.4], [s * 8.8, -16.4], [s * 13.6, -13.6], [s * 11.4, -7.4]], 0.6), fill(alpha(col[2], 0.7)));
    c.drawPath(line(s * 7.6, -11, s * 11, -14.4), stroke(alpha(col[1], 0.9), 0.7));
  }
  const head = blob([[-11.6, -3.4], [-7, -11], [0, -12], [7, -11], [11.6, -3.4], [9.6, 4.6], [0, 7.6], [-9.6, 4.6]], 1);
  lit(c, head, col[1], col[0], -1.2, -1.2);
  c.save();
  clip(c, head);
  c.drawPath(oval(0, 2.6, 6.4, 4.4), fill(alpha(col[2], 0.85)));
  c.restore();
  c.drawPath(head, stroke(INK, 1.25));
  eyes(c, 4.8, -3.6, 1.8);
  // The pug nose: a small dark upturned leaf with a notch at its top.
  c.drawPath(builder().moveTo(-2, 1.4).quadTo(-2.2, -1.4, -0.6, -1.2).lineTo(0, -0.2).lineTo(0.6, -1.2).quadTo(2.2, -1.4, 2, 1.4).quadTo(0, 2.6, -2, 1.4).close().build(), fill(col[3]));
  for (const s of [-1, 1]) c.drawPath(circle(s * 0.9, 0.9, 0.4), fill(alpha(NIGHT.white, 0.35)));
  c.drawPath(curve([[-2.6, 3.8], [0, 5.2], [2.6, 3.8]]), stroke(INK, 0.9));
  for (const s of [-1, 1]) c.drawPath(poly([s * 0.9, 4.4, s * 2.1, 4.3, s * 1.5, 5.9]), fill(NIGHT.white));
}

/** The bat's wings folded over its shoulders: dark membrane with finger ribs and a small claw at the top. */
function batWings(c: SkCanvas, col: Coat): void {
  for (const s of [-1, 1]) {
    const w = blob([[s * 6.6, 4.4], [s * 15.4, 0.8], [s * 21.6, 7.6], [s * 21.6, 27.4], [s * 12.4, 27.4], [s * 8.8, 15.6]], 0.7);
    lit(c, w, shade(col[3], 0.05), shade(col[1], -0.25), 0, -1);
    c.save();
    clip(c, w);
    for (const [x1, y1] of [[13.6, 27], [18.4, 22], [21, 12.4]] as const) c.drawPath(line(s * 15.4, 1.6, s * x1, y1), stroke(alpha(col[1], 0.85), 0.9));
    c.restore();
    c.drawPath(w, stroke(INK, 1.1));
    c.drawPath(poly([s * 15, 1.4, s * 16.6, -1.6, s * 17, 1.8]), fill(INK));
  }
}

/** Owl: a round head with a pale feathered facial disc (two joined rims), big round eyes and a hooked beak; no ear tufts. */
function owl(c: SkCanvas, col: Coat): void {
  const head = blob([[-15, -2.4], [-11.6, -11.6], [0, -14], [11.6, -11.6], [15, -2.4], [12.4, 5.6], [0, 9], [-12.4, 5.6]], 1);
  lit(c, head, col[1], col[0], -1.2, -1.2);
  // Feather scallops on the crown.
  c.save();
  clip(c, head);
  for (const [x, y] of [[-8, -11.6], [-3, -12.8], [2.4, -12.8], [7.6, -11.6], [-5.6, -9], [0, -10], [5.4, -9]] as const) c.drawPath(arc(x, y, 1.8, 20, 140), stroke(alpha(INK, 0.35), 0.7));
  c.restore();
  // The facial disc: a pale heart of two joined circles with a darker rim.
  const disc = union(circle(-5.4, -1.6, 7), circle(5.4, -1.6, 7), oval(0, 3, 6, 5.4));
  c.drawPath(disc, fill(col[2]));
  c.drawPath(disc, stroke(col[1], 1.4));
  c.save();
  clip(c, disc);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    for (const s of [-1, 1]) c.drawPath(line(s * 5.4 + Math.cos(a) * 4.4, -1.6 + Math.sin(a) * 4.4, s * 5.4 + Math.cos(a) * 6.4, -1.6 + Math.sin(a) * 6.4), stroke(alpha(col[1], 0.45), 0.6));
  }
  c.restore();
  for (const s of [-1, 1]) {
    c.drawPath(circle(s * 5.4, -1.8, 3.2), fill(NIGHT.amber));
    c.drawPath(circle(s * 5.4, -1.8, 3.2), stroke(alpha(INK, 0.7), 0.7));
    c.drawPath(circle(s * 5.4, -1.6, 1.9), fill(INK));
    c.drawPath(circle(s * 5.4 - 0.9, -2.6, 0.7), fill(NIGHT.white));
  }
  // Hooked beak.
  shape(c, builder().moveTo(-1.8, 1.8).quadTo(0, 0.6, 1.8, 1.8).quadTo(1.4, 4.8, 0, 6).quadTo(-1.4, 4.8, -1.8, 1.8).close().build(), NIGHT.brass, 0.9);
  c.drawPath(head, stroke(INK, 1.25));
}

/** The owl's folded wings at the shoulders: feather rows instead of a furry chest. */
function owlWings(c: SkCanvas, col: Coat): void {
  for (const s of [-1, 1]) {
    const w = blob([[s * 7.6, 4], [s * 17.4, 6], [s * 21.6, 16], [s * 20.6, 27.4], [s * 11, 27.4], [s * 8, 15]], 0.8);
    lit(c, w, col[1], shade(col[0], -0.05), -0.8, -1);
    c.save();
    clip(c, w);
    for (let row = 0; row < 4; row++) for (let i = 0; i < 3; i++) c.drawPath(arc(s * (11 + i * 3.6 + (row % 2) * 1.8), 9 + row * 4.6, 2, 20, 140), stroke(alpha(INK, 0.4), 0.7));
    c.restore();
    c.drawPath(w, stroke(INK, 1.1));
  }
  // The pale chest between the wings.
  c.drawPath(oval(0, 17, 6.6, 9), fill(alpha(col[2], 0.9)));
}

/**
 * Hare (decision M38: Tansy, the Noodles minder): long ears with dark tips, one standing and one
 * bent at the middle, the face smaller than the other heads and set lower so the ears are long
 * against it within the box; eyes set to the sides, a split upper lip, a small pink nose and whiskers. No eye mask.
 */
function hare(c: SkCanvas, col: Coat): void {
  const inner = mix(col[2], '#E8A0A8', 0.45);
  /** One ear piece: an oval of half length `h`, rotated `deg`, pale inside, dark-tipped at its far end when `tip`. */
  const piece = (x: number, y: number, deg: number, w: number, h: number, tip: boolean, pink: boolean) =>
    at(c, x, y, 1, deg, (k) => {
      const ear = oval(0, 0, w, h);
      lit(k, ear, col[1], col[0], -0.6, -1);
      k.save();
      clip(k, ear);
      if (pink) k.drawPath(oval(0, 1, w * 0.48, h * 0.72), fill(inner));
      if (tip) k.drawPath(circle(0, -h - 0.4, w * 1.05), fill(col[3]));
      k.restore();
      k.drawPath(ear, stroke(INK, 1.15));
    });
  // The standing ear (left), leaning out a little.
  piece(-4.4, -11, -14, 2.7, 7.4, true, true);
  // The bent ear (right): its upper half folds outward, drawn first so the lower half covers the fold.
  piece(8.8, -15.4, 62, 2.4, 3.6, true, false);
  piece(4.6, -10.4, 14, 2.7, 4.4, false, true);
  // The face, smaller than the other heads and set lower, so the ears are long against it.
  at(c, 0, 2.2, 0.84, 0, (f) => {
    const head = blob([[-11, -3], [-7, -10.6], [0, -12], [7, -10.6], [11, -3], [9.4, 4.4], [0, 8.2], [-9.4, 4.4]], 1);
    lit(f, head, col[1], col[0], -1.2, -1.2);
    f.save();
    clip(f, head);
    // A pale muzzle and chin.
    f.drawPath(oval(0, 4.6, 6.4, 4.4), fill(col[2]));
    f.restore();
    f.drawPath(head, stroke(INK, 1.4));
    eyes(f, 5.6, -3.6, 2);
    // Whisker pads, the split upper lip, a small pink nose.
    for (const s of [-1, 1]) f.drawPath(oval(s * 1.9, 2.8, 2.2, 1.7), fill(shade(col[2], 0.2)));
    f.drawPath(blob([[-1.6, 0.3], [1.6, 0.3], [0, 2]], 1), fill('#D97F8C'));
    f.drawPath(line(0, 1.9, 0, 3.4), stroke(INK, 0.9));
    f.drawPath(curve([[-2.4, 4.4], [-1.2, 4.8], [0, 3.4], [1.2, 4.8], [2.4, 4.4]]), stroke(INK, 0.9));
    for (const s of [-1, 1]) for (const dy of [0, 1.6]) f.drawPath(line(s * 3.6, 2.4 + dy, s * 10, 1 + dy * 1.6), stroke(alpha(INK, 0.55), 0.6));
    cheeks(f, 7.4, 1.4);
  });
}

const HEADS: Record<Species, (c: SkCanvas, col: Coat) => void> = { fox, hedgehog, badger, otter, bat, owl, hare };

/** What a species wears on its shoulders before the head is drawn (wings, a sleek neck). */
function body(c: SkCanvas, species: Species, col: Coat, wide = 20): void {
  if (species === 'otter') {
    // Sleek: narrow sloping shoulders and a long neck.
    shoulders(c, col, wide - 3, 3);
    neck(c, col, 8.6);
    c.drawPath(oval(0, 16, 6.6, 10), fill(alpha(col[2], 0.85)));
  } else if (species === 'owl') {
    shoulders(c, col, wide);
    owlWings(c, col);
  } else {
    shoulders(c, col, wide);
    if (species === 'bat') batWings(c, col);
    else neck(c, col);
  }
}

/** A customer bust: species, coat colour 0..2, with a scarf over the head's base. */
export function drawCustomer(c: SkCanvas, species: Species, coat: number): void {
  const col = COAT[species][((coat % 3) + 3) % 3];
  if (species === 'fox') foxTail(c, col);
  body(c, species, col);
  at(c, 0, HEAD_Y, 1, 0, (k) => HEADS[species](k, col));
  const i = (['fox', 'hedgehog', 'badger', 'otter', 'bat', 'owl', 'hare'] as const).indexOf(species);
  scarf(c, SCARVES[(i * 2 + coat * 3) % SCARVES.length]);
}

// ---------------------------------------------------------------------------
// Minders: each in different work clothes (a vest, a sash, a bib apron, a cross-strap apron, a
// cook's neckerchief, a short jacket), so "animals in shop aprons" is not the set's look
// ---------------------------------------------------------------------------

/** A collar band of `color` round the neck over the head's base. */
function collar(c: SkCanvas, color: string): void {
  const band = builder().moveTo(-11, 3).quadTo(0, 8.4, 11, 3).lineTo(11.6, 6.4).quadTo(0, 12, -11.6, 6.4).close().build();
  lit(c, band, shade(color, -0.2), color, 0, -0.8);
}

/** A waistcoat: two front panels over the chest with brass buttons. */
function vest(c: SkCanvas, color: string): void {
  for (const s of [-1, 1]) {
    const p = poly([s * 2, 7.6, s * 11.6, 6.4, s * 16, 27.5, s * 1.2, 27.5]);
    lit(c, p, shade(color, -0.2), color, s * -0.6, -0.8);
  }
  for (const y of [13, 18, 23]) shape(c, circle(1.4, y, 1.1), NIGHT.brass, 0.6);
}

/** A bib apron with a pocket, straps over the shoulders. */
function bibApron(c: SkCanvas, color: string): void {
  for (const s of [-1, 1]) c.drawPath(line(s * 6.5, 6, s * 4.6, 13), stroke(INK, 2.2));
  for (const s of [-1, 1]) c.drawPath(line(s * 6.5, 6, s * 4.6, 13), stroke(NIGHT.paperLight, 1));
  const bib = builder().moveTo(-7, 12.4).lineTo(7, 12.4).lineTo(9.5, 27.5).lineTo(-9.5, 27.5).close().build();
  lit(c, bib, shade(color, -0.2), color, 0, -1);
  shape(c, rrect(-4.2, 19, 8.4, 4.6, 1.2), shade(color, -0.12), 0.8);
}

/** An apron with straps crossing over the chest. */
function crossApron(c: SkCanvas, color: string): void {
  const body = builder().moveTo(-12, 19).quadTo(0, 17.4, 12, 19).lineTo(13, 27.5).lineTo(-13, 27.5).close().build();
  for (const s of [-1, 1]) {
    c.drawPath(line(s * 9, 6, -s * 7, 19.6), stroke(INK, 3));
    c.drawPath(line(s * 9, 6, -s * 7, 19.6), stroke(color, 1.8));
  }
  lit(c, body, shade(color, -0.2), color, 0, -1);
  c.drawPath(line(-12, 21, 12, 21), stroke(alpha(NIGHT.paperLight, 0.7), 0.9));
}

/** A sash across the chest, shoulder to hip, with a knot. */
function sash(c: SkCanvas, color: string): void {
  const p = poly([-12.4, 6.4, -6.4, 4.6, 15.6, 25, 9, 27.5]);
  lit(c, p, shade(color, -0.2), color, 0, -0.8);
  shape(c, circle(8.6, 21.4, 2.4), shade(color, -0.1), 0.8);
}

/** A cook's neckerchief knotted at one side, its two points hanging. */
function neckerchief(c: SkCanvas, color: string): void {
  collar(c, color);
  shape(c, circle(8.4, 8, 2.2), shade(color, -0.1), 0.8);
  for (const [x1, y1] of [[13.6, 16.4], [9.4, 17.4]] as const) shape(c, poly([7.6, 8.6, x1, y1, x1 - 3.2, y1 + 0.8, 7, 10]), color, 0.8);
}

function drawMinderOutfit(c: SkCanvas, m: Minder): void {
  switch (m.id) {
    case 'oldbrindle':
      vest(c, m.apron);
      break;
    case 'pim':
      sash(c, m.apron);
      break;
    case 'nettle':
      bibApron(c, m.apron);
      break;
    case 'juniper':
      crossApron(c, m.apron);
      break;
    case 'tansy':
      // A cook: neckerchief, a ladle over the shoulder, the apron's top hem at the bottom.
      c.drawPath(line(-17.4, 27, -8.4, 4), stroke(INK, 2.6));
      c.drawPath(line(-17.4, 27, -8.4, 4), stroke(NIGHT.woodLight, 1.3));
      shape(c, oval(-7.8, 1.8, 3.4, 2.4), NIGHT.stoneLight, 0.9);
      shape(c, rrect(-12, 22.4, 24, 6, 1), shade(m.apron, 0.2), 0.8);
      break;
    case 'marlo':
      // A short jacket with a stand-up collar, a lantern pin on the lapel.
      vest(c, m.apron);
      at(c, -7.4, 13, 1, 0, (q) => drawPinLantern(q));
      break;
  }
}

/** What sits on the minder's head (spectacles, a tea sprig, a headband, a flower; Tansy and Marlo none). */
function drawMinderMark(k: SkCanvas, m: Minder): void {
  switch (m.id) {
    case 'oldbrindle':
      // Round brass spectacles and a grey brow: the oldest of the street.
      for (const s of [-1, 1]) k.drawPath(circle(s * 5.4, -4, 3.3), stroke(NIGHT.brass, 1));
      k.drawPath(line(-2.1, -4.2, 2.1, -4.2), stroke(NIGHT.brass, 0.9));
      for (const s of [-1, 1]) k.drawPath(line(s * 3, -9.2, s * 7.6, -8.4), stroke(alpha(NIGHT.white, 0.9), 1.1));
      break;
    case 'pim':
      // A sprig of tea leaves tucked at the crown.
      for (const d of [-30, 20]) at(k, 9.6, -12.6, 1, d, (q) => shape(q, blob([[0, 0], [2, -2.4], [0, -5.6], [-2, -2.4]], 1), NIGHT.leaf, 0.8));
      break;
    case 'nettle':
      // A cloth headband across the spines.
      k.drawPath(curve([[-12.6, -7.6], [0, -11.4], [12.6, -7.6]]), stroke(INK, 3.6));
      k.drawPath(curve([[-12.6, -7.6], [0, -11.4], [12.6, -7.6]]), stroke(NIGHT.amber, 2.2));
      shape(k, blob([[11.4, -8.2], [15.6, -11.4], [15.2, -6.2]], 1), NIGHT.amber, 0.8);
      break;
    case 'juniper':
      // A berry flower behind one ear.
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        shape(k, circle(-12.4 + Math.cos(a) * 2.2, -7.6 + Math.sin(a) * 2.2, 1.6), NIGHT.paperLight, 0.6);
      }
      k.drawPath(circle(-12.4, -7.6, 1.3), fill(NIGHT.amber));
      break;
  }
}

/** A minder (by chain index 0..5): their species in their own work clothes and one mark of their own. */
export function drawMinder(c: SkCanvas, chain: number): void {
  const m = MINDERS[((chain % 6) + 6) % 6];
  const col = COAT[m.species][0];
  body(c, m.species, col, 19);
  drawMinderOutfit(c, m);
  at(c, 0, HEAD_Y, 1, 0, (k) => {
    HEADS[m.species](k, col);
    drawMinderMark(k, m);
  });
  if (m.id === 'oldbrindle' || m.id === 'juniper') collar(c, NIGHT.paperLight);
  else if (m.id === 'tansy') neckerchief(c, m.apron);
  else if (m.id === 'pim' || m.id === 'nettle' || m.id === 'marlo') collar(c, shade(m.apron, 0.15));
}

/**
 * A minder's head alone, centred, fitted to a `size` pt square: what the stall front shows beside
 * the till (a whole bust at 18 to 22 pt is unreadable).
 */
export function drawMinderHead(c: SkCanvas, chain: number, size = 22): void {
  const m = MINDERS[((chain % 6) + 6) % 6];
  const col = COAT[m.species][0];
  at(c, 0, size * 0.06, size / 34, 0, (k) => {
    HEADS[m.species](k, col);
    drawMinderMark(k, m);
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
 * The Paper Dragon: an origami serpent of flat folded facets in rice-paper blue-grey and lantern
 * amber, an accordion body curling behind its head, round soft eyes and a small smile. No mane,
 * whiskers, horns or mask face (nothing of a real festival costume, spec 7.2).
 */
export function drawDragon(c: SkCanvas): void {
  // The accordion body: pleats along an S curve from behind the head down to a pointed tail.
  const n = 9;
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push([4 - 26 * t, 6 + 16 * Math.sin(Math.PI * t * 0.9) - 6 * t]);
  }
  for (let i = n - 1; i >= 0; i--) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const dx = x1 - x0;
    const dy = y1 - y0;
    const L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L;
    const ny = dx / L;
    const w0 = 8.4 * (1 - (i / n) * 0.75);
    const w1 = 8.4 * (1 - ((i + 1) / n) * 0.75);
    const pleat = poly([x0 + nx * w0, y0 + ny * w0, x1 + nx * w1, y1 + ny * w1, x1 - nx * w1, y1 - ny * w1, x0 - nx * w0, y0 - ny * w0]);
    shape(c, pleat, i % 2 ? NIGHT.amber : NIGHT.paper, 0.9);
    c.drawPath(line(x0 + nx * w0 * 0.2, y0 + ny * w0 * 0.2, x1 + nx * w1 * 0.2, y1 + ny * w1 * 0.2), stroke(alpha(i % 2 ? NIGHT.amberDeep : NIGHT.paperEdge, 0.7), 0.7));
  }
  const tail = pts[n];
  shape(c, poly([tail[0], tail[1] - 2, tail[0] - 4, tail[1] - 6.4, tail[0] - 1.4, tail[1] + 1.6]), NIGHT.amber, 0.9);
  // Small folded fins along the back of the body (amber triangles), the dragon's only crest.
  for (let i = 1; i < n - 1; i += 2) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const dx = x1 - x0;
    const dy = y1 - y0;
    const L = Math.hypot(dx, dy) || 1;
    const w = 8.4 * (1 - (i / n) * 0.75);
    const ox = (dy / L) * w;
    const oy = (-dx / L) * w;
    shape(c, poly([x0 + ox, y0 + oy, (x0 + x1) / 2 + ox * 1.5, (y0 + y1) / 2 + oy * 1.5, x1 + ox * 0.9, y1 + oy * 0.9]), NIGHT.amberDeep, 0.8);
  }
  // The head: a long folded wedge pointing forward, facets lit from the top left.
  const cx = 8;
  const cy = -8;
  const rim: [number, number][] = [[-6, -13], [2, -19], [12, -17], [24, -10], [24.6, -4.6], [15, 0.6], [2, 1.6], [-6.4, -4]];
  const tones = [NIGHT.paperLight, NIGHT.paperLight, NIGHT.paper, NIGHT.paperShade, NIGHT.paperShade, NIGHT.paper, NIGHT.paperShade, NIGHT.paper];
  for (let i = 0; i < rim.length; i++) {
    const [x0, y0] = rim[i];
    const [x1, y1] = rim[(i + 1) % rim.length];
    c.drawPath(poly([cx, cy, x0, y0, x1, y1]), fill(tones[i]));
    c.drawPath(line(cx, cy, x0, y0), stroke(alpha(NIGHT.paperEdge, 0.7), 0.7));
  }
  c.drawPath(poly(rim.flat()), stroke(INK, 1.3));
  // An amber fold along the jaw.
  c.drawPath(poly([2, 1.6, 15, 0.6, 24.6, -4.6, 13, -2.6]), fill(alpha(NIGHT.amber, 0.9)));
  // Round soft eyes, a blush, a small smile, a nostril.
  for (const [x, y] of [[4.4, -10.4], [12.2, -10.6]] as const) {
    c.drawPath(circle(x, y, 2.4), fill(INK));
    c.drawPath(circle(x - 0.8, y - 0.9, 0.85), fill(NIGHT.white));
  }
  c.drawPath(oval(16.4, -6.4, 2, 1.1), fill(alpha('#E07A7A', 0.5)));
  c.drawPath(curve([[17.6, -3.6], [20, -2.4], [22.4, -4]]), stroke(INK, 0.9));
  c.drawPath(circle(22.4, -8.4, 0.7), fill(INK));
}

// ---------------------------------------------------------------------------
// The firefly (hint pointer) and its trail
// ---------------------------------------------------------------------------

export const FIREFLY_GLOW = '#E8F59A';
/** Wing poses baked into the fx atlas (`firefly-0` .. `firefly-2`): the beat is a flip between them. */
export const FIREFLY_WINGS = 3;

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

