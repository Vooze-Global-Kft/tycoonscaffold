/**
 * Cut pieces by grade (yard-style.md 3 and 7; the artist "things"). Every grade has its own SILHOUETTE
 * and its own VALUE, so a bay, a heap, a skip load or a load on the carry frame says which metal it is
 * without its colour, and a grey rendering keeps copper, brass, steel and aluminium at least 25 L* apart
 * (things.test.ts measures the median L* of each drawn piece):
 *
 *   heavy steel (HMS)  ~20 L*  dark mill-scale plate and beam offcuts, torch-cut ends with a slag line, rust
 *   copper             ~46 L*  bare bright: looped wire bundles and tube offcuts with bright cut ends
 *   No.2 copper        darker, mixed: oxidised pipe, a hank of varnished windings, a verdigris spot
 *   brass              ~71 L*  taps, valves, elbows (spout, handle, hex), dull olive, never polished gold
 *   aluminium          ~97 L*  pale cast and extruded shapes: channel, end caps, wheels, crushed cans
 *   cast iron          dark grey thick broken shards and radiator sections, cast dots
 *   light iron         mid grey bent sheet, angle, a washer's panels and drum, rust freckles
 *   cable              short sheathed lengths with copper cores showing at the cut ends
 *   motors whole, the car body, the converter, the lead battery, dross: their own shapes
 *
 * A glyph is drawn in screen points round its centre, about `s` points long, turned by `turn` degrees,
 * with an ink outline. `pieceGlyph(c, kind, ...)` takes the old metal ids (light_iron, cast_iron, hms,
 * aluminium, brass, copper, enamel: the people, plant and vehicle drawings use them) and the new piece
 * kinds (PIECE_KINDS); `gradeGlyph` takes a content grade id; `gradePictogram` is the 10 pt ticket mark.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { METAL, YARD, mix, shade } from './palette';
import { builder, circle, fill, hash01, oval, poly, rrect, segment, stroke } from './pen';

const INK = YARD.ink;

// ---------------------------------------------------------------------------
// The pieces' tones (derived from the palette; the grey test spaces them)
// ---------------------------------------------------------------------------

/** Body tones of the pieces, derived from YARD and METAL (no second palette). */
export const TONE = {
  /** heavy steel: dark mill scale (~20 L*), its top a little lighter, cut faces bright */
  steel: mix(shade(METAL.hms.dark, -0.5), YARD.steelDark, 0.25),
  steelTop: mix(shade(METAL.hms.dark, -0.3), YARD.steelDark, 0.3),
  steelCut: METAL.light_iron.light,
  /** bare bright copper (~46 L*) */
  copper: YARD.copper,
  copperHi: YARD.copperLight,
  copperLo: YARD.copperDark,
  /** No.2 copper: duller, browner */
  no2: mix(YARD.copper, '#5E4436', 0.38),
  no2Hi: mix(YARD.copperLight, '#7E6050', 0.45),
  verdigris: '#6FA58E',
  /** brass (~71 L*): dull olive, lifted a little off the palette base so it clears copper and aluminium */
  brass: mix(YARD.brass, YARD.brassLight, 0.2),
  brassHi: YARD.brassLight,
  brassLo: YARD.brassDark,
  /** aluminium (~97 L*) */
  alu: mix(YARD.aluminiumLight, '#FFFFFF', 0.4),
  aluMid: YARD.aluminium,
  aluLo: YARD.aluminiumDark,
  /** cast iron and light iron as the palette has them */
  cast: METAL.cast_iron.base,
  castHi: METAL.cast_iron.light,
  castLo: METAL.cast_iron.dark,
  iron: METAL.light_iron.base,
  ironHi: METAL.light_iron.light,
  ironLo: METAL.light_iron.dark,
  pvc: YARD.pvc,
  pvcGrey: YARD.pvcGrey,
  lead: METAL.lead.base,
} as const;

/** Car paints (faded, never orange: orange is heat). */
export const CAR_PAINTS = ['#4F7896', '#7D3B33', '#6F806A', '#C9CDD0'] as const;

/** Copper's sheen mark: two short parallel strokes, at least 4 pt long. */
export function copperTicks(c: SkCanvas, x: number, y: number, s: number): void {
  const k = Math.max(4, s);
  const p = stroke(YARD.copperSheen, Math.max(1.2, k * 0.2));
  c.drawPath(segment(x - k * 0.45, y + k * 0.2, x - k * 0.1, y - k * 0.3), p);
  c.drawPath(segment(x + k * 0.05, y + k * 0.32, x + k * 0.4, y - k * 0.1), p);
}

function outlined(c: SkCanvas, p: ReturnType<typeof poly>, color: string, w = 0.9): void {
  c.drawPath(p, fill(color));
  c.drawPath(p, stroke(INK, w));
}

/** A ring of wire: an ink stroke then the metal on it (so loops read as wire, not a disc). */
function loop(c: SkCanvas, cx: number, cy: number, rx: number, ry: number, w: number, color: string): void {
  c.drawPath(oval(cx, cy, rx, ry), stroke(INK, w + 1.5));
  c.drawPath(oval(cx, cy, rx, ry), stroke(color, w));
}

// ---------------------------------------------------------------------------
// Copper
// ---------------------------------------------------------------------------

/** A bundle of bare bright wire: three thick loose loops, a galvanised tie, the sheen ticks. */
export function wireBundle(c: SkCanvas, s: number, seed = 0): void {
  const rx = s * 0.36;
  const ry = rx * 0.58;
  const w = Math.max(2.2, s * 0.16);
  for (let i = 0; i < 3; i++)
    loop(c, (i - 1) * s * 0.09 + (hash01(seed, i) - 0.5) * s * 0.05, (1 - i) * s * 0.06, rx * (0.92 + 0.08 * i), ry, w, i === 2 ? shade(TONE.copper, 0.1) : TONE.copper);
  // the bright top edge of the near loop
  c.drawPath(builder().addArc({ x: s * 0.09 - rx, y: -s * 0.06 - ry - w * 0.25, width: rx * 2, height: ry * 2 }, 200, 120).build(), stroke(TONE.copperHi, Math.max(0.9, w * 0.3)));
  c.drawPath(segment(-rx * 0.75, -ry * 0.9, -rx * 0.55, ry * 0.95), stroke(INK, 2.8));
  c.drawPath(segment(-rx * 0.75, -ry * 0.9, -rx * 0.55, ry * 0.95), stroke(YARD.galvanisedLight, 1.4));
  copperTicks(c, rx * 0.35, -ry * 0.85, s * 0.28);
}

/** A short tube offcut lying east-west: a round body and a bright cut end with its bore. */
export function tubeOffcut(c: SkCanvas, s: number, metal = 'copper'): void {
  const no2 = metal === 'no2';
  const m = METAL[no2 ? 'copper' : metal] ?? METAL.copper;
  const body = no2 ? TONE.no2 : metal === 'copper' ? TONE.copper : m.base;
  const light = no2 ? TONE.no2Hi : metal === 'copper' ? TONE.copperHi : m.light;
  const h = Math.max(4, s * 0.34);
  const L = s * 0.8;
  const r = rrect(-L / 2, -h / 2, L, h, h * 0.3);
  c.drawPath(r, fill(body));
  c.drawRect({ x: -L / 2 + 1, y: -h / 2 + 0.8, width: L - 2, height: h * 0.26 }, fill(light));
  c.drawPath(r, stroke(INK, 0.9));
  const ex = L / 2;
  const cut = metal === 'copper' || no2 ? YARD.copperSheen : m.light;
  c.drawPath(oval(ex, 0, h * 0.32, h / 2), fill(cut));
  c.drawPath(oval(ex, 0, h * 0.32, h / 2), stroke(INK, 0.9));
  c.drawPath(oval(ex, 0, h * 0.16, h * 0.28), fill(shade(m.dark, -0.3)));
  if (metal === 'copper') copperTicks(c, -L * 0.15, -h * 0.05, s * 0.26);
  if (no2) c.drawPath(oval(-L * 0.22, h * 0.12, Math.max(1.2, h * 0.3), Math.max(0.9, h * 0.2)), fill(TONE.verdigris, 0.9));
}

/** No.2 copper: a short bent pipe with a soldered elbow, dull and mixed. */
export function no2Bent(c: SkCanvas, s: number): void {
  const w = Math.max(3.4, s * 0.22);
  const p = builder().moveTo(-s * 0.45, s * 0.12).lineTo(-s * 0.02, s * 0.12).quadTo(s * 0.22, s * 0.12, s * 0.24, -s * 0.12).lineTo(s * 0.26, -s * 0.3).build();
  c.drawPath(p, stroke(INK, w + 1.6));
  c.drawPath(p, stroke(TONE.no2, w));
  c.drawPath(segment(-s * 0.42, s * 0.12 - w * 0.25, -s * 0.05, s * 0.12 - w * 0.25), stroke(TONE.no2Hi, Math.max(0.8, w * 0.3)));
  // the soldered elbow: a brass-grey collar
  c.drawPath(circle(s * 0.17, s * 0.06, w * 0.62), fill(mix(TONE.no2, YARD.galvanised, 0.45)));
  c.drawPath(circle(s * 0.17, s * 0.06, w * 0.62), stroke(INK, 0.8));
  c.drawPath(oval(s * 0.26, -s * 0.3, w * 0.5, w * 0.3), fill(YARD.copperSheen));
  c.drawPath(oval(s * 0.26, -s * 0.3, w * 0.5, w * 0.3), stroke(INK, 0.8));
  c.drawPath(oval(-s * 0.3, s * 0.15, Math.max(1.2, w * 0.35), Math.max(0.9, w * 0.25)), fill(TONE.verdigris, 0.9));
}

/** A hank of varnished motor windings: a tangle of thin dark-copper wire. */
export function windings(c: SkCanvas, s: number, seed = 0): void {
  const col = mix(TONE.no2, YARD.copperDark, 0.35);
  const w = Math.max(1.1, s * 0.06);
  c.drawPath(oval(0, 0, s * 0.42, s * 0.26), fill(shade(col, -0.25)));
  c.drawPath(oval(0, 0, s * 0.42, s * 0.26), stroke(INK, 1));
  for (let i = 0; i < 7; i++) {
    const a = hash01(seed, i, 2) * Math.PI;
    const rx = s * (0.18 + hash01(seed, i, 3) * 0.2);
    const ry = s * (0.1 + hash01(seed, i, 4) * 0.1);
    c.save();
    c.rotate((a * 180) / Math.PI * 0.4 - 30, 0, 0);
    c.drawPath(oval((hash01(seed, i, 5) - 0.5) * s * 0.15, (hash01(seed, i, 6) - 0.5) * s * 0.1, rx, ry), stroke(i % 2 ? col : TONE.no2Hi, w));
    c.restore();
  }
  // one loose end
  c.drawPath(builder().moveTo(s * 0.3, -s * 0.05).quadTo(s * 0.5, -s * 0.2, s * 0.48, -s * 0.32).build(), stroke(TONE.no2Hi, w + 0.3));
}

/** A copper cylinder's shell, cut open and flattened: a dull sheet with its seam and a domed end. */
export function copperShell(c: SkCanvas, s: number): void {
  const w = s * 0.5;
  const h = s * 0.3;
  const p = builder().moveTo(-w, -h * 0.6).quadTo(0, -h * 1.05, w * 0.8, -h * 0.7).quadTo(w * 1.05, 0, w * 0.85, h * 0.7).quadTo(0, h * 0.95, -w, h * 0.65).quadTo(-w * 1.1, 0, -w, -h * 0.6).close().build();
  outlined(c, p, TONE.no2, 1);
  c.drawPath(builder().moveTo(-w * 0.85, -h * 0.4).quadTo(0, -h * 0.8, w * 0.7, -h * 0.5).build(), stroke(TONE.no2Hi, Math.max(1, s * 0.06)));
  // the rolled seam and rivet dots
  c.drawPath(segment(-w * 0.1, -h * 0.78, -w * 0.05, h * 0.78), stroke(shade(TONE.no2, -0.3), 1.2));
  for (let i = 0; i < 3; i++) c.drawPath(circle(-w * 0.075, -h * 0.4 + i * h * 0.4, 0.8), fill(TONE.no2Hi));
  // the domed end at the right
  c.drawPath(oval(w * 0.6, h * 0.1, w * 0.26, h * 0.42), fill(shade(TONE.no2, 0.12)));
  c.drawPath(oval(w * 0.6, h * 0.1, w * 0.26, h * 0.42), stroke(INK, 0.8));
  c.drawPath(oval(-w * 0.55, h * 0.3, Math.max(1.3, s * 0.06), Math.max(1, s * 0.04)), fill(TONE.verdigris, 0.9));
}

// ---------------------------------------------------------------------------
// Brass
// ---------------------------------------------------------------------------

/** A brass tap: body, spout down, a cross handle on a stem (side view). */
export function brassTap(c: SkCanvas, s: number): void {
  const k = s / 12;
  const body = poly([-5 * k, -1.4 * k, 3 * k, -1.4 * k, 4.4 * k, 0, 4.4 * k, 1.6 * k, 6 * k, 2.4 * k, 6 * k, 5.2 * k, 3.4 * k, 5.2 * k, 3.2 * k, 3 * k, -5 * k, 3 * k]);
  outlined(c, body, TONE.brass);
  c.drawPath(segment(-4 * k, -0.4 * k, 2.6 * k, -0.4 * k), stroke(TONE.brassHi, Math.max(1, k * 1.1)));
  for (let i = 0; i < 3; i++) c.drawPath(segment(-5 * k + i * 1.1 * k, -1.4 * k, -5 * k + i * 1.1 * k, 3 * k), stroke(TONE.brassLo, 0.7));
  c.drawPath(rrect(-0.9 * k, -4.6 * k, 1.8 * k, 3.4 * k, 0.4 * k), fill(TONE.brassLo));
  c.drawPath(rrect(-0.9 * k, -4.6 * k, 1.8 * k, 3.4 * k, 0.4 * k), stroke(INK, 0.8));
  outlined(c, rrect(-4 * k, -6.2 * k, 8 * k, 2 * k, k), TONE.brass, 0.8);
  c.drawPath(circle(0, -5.2 * k, 1.1 * k), fill(TONE.brassLo));
}

/** A brass gate valve: a hex body with two threaded ends and a handwheel above. */
export function brassValve(c: SkCanvas, s: number): void {
  const k = s / 12;
  outlined(c, rrect(-6 * k, -1.6 * k, 12 * k, 3.6 * k, 0.6 * k), mix(TONE.brass, TONE.brassLo, 0.35));
  outlined(c, poly([-3 * k, -3 * k, 3 * k, -3 * k, 4 * k, 0.2 * k, 3 * k, 3.4 * k, -3 * k, 3.4 * k, -4 * k, 0.2 * k]), TONE.brass);
  c.drawPath(segment(-2 * k, -2 * k, 2 * k, -2 * k), stroke(TONE.brassHi, Math.max(1, k)));
  c.drawPath(segment(0, -3 * k, 0, -6 * k), stroke(INK, 1.6 * k + 0.6));
  c.drawPath(oval(0, -6.4 * k, 4.4 * k, 1.6 * k), stroke(INK, 1.7 * k + 1));
  c.drawPath(oval(0, -6.4 * k, 4.4 * k, 1.6 * k), stroke(TONE.brass, 1.7 * k));
}

/** A brass elbow fitting. */
export function brassElbow(c: SkCanvas, s: number): void {
  const k = s / 12;
  const p = builder().moveTo(-6 * k, -1.8 * k).lineTo(0, -1.8 * k).quadTo(3.6 * k, -1.8 * k, 3.6 * k, 2 * k).lineTo(3.6 * k, 6 * k).lineTo(-0.2 * k, 6 * k).lineTo(-0.2 * k, 2.6 * k).quadTo(-0.2 * k, 2 * k, -1 * k, 2 * k).lineTo(-6 * k, 2 * k).close().build();
  outlined(c, p, TONE.brass);
  c.drawPath(oval(-6 * k, 0.1 * k, 1 * k, 1.9 * k), fill(TONE.brassHi));
  c.drawPath(oval(-6 * k, 0.1 * k, 1 * k, 1.9 * k), stroke(INK, 0.8));
  c.drawPath(segment(-4.5 * k, -0.9 * k, 0, -0.9 * k), stroke(TONE.brassHi, Math.max(1, k)));
}

/** A brass tee fitting with a hex nut. */
export function brassTee(c: SkCanvas, s: number): void {
  const k = s / 12;
  outlined(c, rrect(-6 * k, -1.8 * k, 12 * k, 3.6 * k, 0.8 * k), TONE.brass);
  outlined(c, rrect(-1.8 * k, -6 * k, 3.6 * k, 5 * k, 0.6 * k), TONE.brass);
  outlined(c, poly([-2.6 * k, -6.8 * k, 2.6 * k, -6.8 * k, 3.2 * k, -5.4 * k, 2.6 * k, -4 * k, -2.6 * k, -4 * k, -3.2 * k, -5.4 * k]), mix(TONE.brass, TONE.brassLo, 0.4), 0.8);
  c.drawPath(segment(-5 * k, -0.9 * k, 5 * k, -0.9 * k), stroke(TONE.brassHi, Math.max(1, k)));
}

// ---------------------------------------------------------------------------
// Iron and steel
// ---------------------------------------------------------------------------

/** A bent sheet of light iron: two planes at a fold, rust freckles. */
export function bentPlate(c: SkCanvas, s: number, seed = 0, color: string = METAL.light_iron.base, light: string = METAL.light_iron.light): void {
  const w = s / 2;
  const h = s * 0.3;
  const a = poly([-w, -h * 0.4, 0, -h, 0, h * 0.2, -w, h * 0.7]);
  const b = poly([0, -h, w, -h * 0.55, w * 0.95, h * 0.55, 0, h * 0.2]);
  outlined(c, a, light);
  outlined(c, b, color);
  if (color === METAL.light_iron.base)
    for (let i = 0; i < 4; i++) c.drawPath(circle(-w * 0.8 + hash01(seed, i) * w * 1.6, -h * 0.4 + hash01(seed, i, 2) * h, 0.9), fill(YARD.rust, 0.85));
}

/** Angle iron: a long bar with its L section at the near end. */
export function angleIron(c: SkCanvas, s: number, seed = 0): void {
  const L = s;
  const h = Math.max(3, s * 0.18);
  outlined(c, rrect(-L / 2, -h / 2, L, h, 0.6), METAL.light_iron.base);
  c.drawPath(segment(-L / 2 + 1, -h * 0.1, L / 2 - h, -h * 0.1), stroke(METAL.light_iron.light, 1));
  const e = L / 2;
  outlined(c, poly([e - h, -h / 2 - 1, e + 0.6, -h / 2 - 1, e + 0.6, h / 2, e - h * 0.35, h / 2, e - h * 0.35, -h * 0.1, e - h, -h * 0.1]), METAL.light_iron.light, 0.8);
  c.drawPath(circle(-L * 0.2 + hash01(seed) * L * 0.3, h * 0.15, 0.9), fill(YARD.rust));
}

/** A corrugated sheet offcut (farm tin): galvanised ribs, rust patches. */
export function corrugated(c: SkCanvas, s: number, seed = 0): void {
  const w = s / 2;
  const h = s * 0.28;
  const p = poly([-w, -h * 0.7, w * 0.9, -h, w, h * 0.6, -w * 0.95, h]);
  outlined(c, p, YARD.galvanised);
  for (let i = 1; i < 7; i++) {
    const x = -w + (2 * w * i) / 7;
    c.drawPath(segment(x, -h * 0.85 + i * 0.3, x + 1, h * 0.85), stroke(shade(YARD.galvanised, i % 2 ? 0.3 : -0.2), 1.1));
  }
  c.drawPath(oval(-w * 0.3 + hash01(seed) * w * 0.4, h * 0.2, w * 0.25, h * 0.35), fill(YARD.rust, 0.55));
  c.drawPath(p, stroke(INK, 0.9));
}

/** An I-beam offcut of heavy steel: dark mill scale, its I section at the near end, a torch-cut line. */
export function beamOffcut(c: SkCanvas, s: number, seed = 0): void {
  const L = s;
  const h = Math.max(4, s * 0.26);
  outlined(c, rrect(-L / 2, -h / 2, L, h, 0.6), TONE.steel);
  c.drawPath(rrect(-L / 2 + 1, -h / 2 + 1, L - h - 1, h * 0.24, 0.4), fill(TONE.steelTop));
  // rust streaks along the web
  for (let i = 0; i < 3; i++) c.drawPath(segment(-L * 0.35 + i * L * 0.2 + hash01(seed, i) * 3, -h * 0.05, -L * 0.32 + i * L * 0.2, h * 0.35), stroke(YARD.rust, 1.1, 0.8));
  const e = L / 2 - h * 0.5;
  const f = h * 0.5;
  outlined(c, poly([e - f, -h / 2, e + f, -h / 2, e + f, -h / 2 + f * 0.4, e + f * 0.18, -h / 2 + f * 0.4, e + f * 0.18, h / 2 - f * 0.4, e + f, h / 2 - f * 0.4, e + f, h / 2, e - f, h / 2, e - f, h / 2 - f * 0.4, e - f * 0.18, h / 2 - f * 0.4, e - f * 0.18, -h / 2 + f * 0.4, e - f, -h / 2 + f * 0.4]), TONE.steelCut, 0.8);
  // the torch's slag line just behind the cut
  c.drawPath(segment(e - f - 1.2, -h / 2 + 1, e - f - 1.2, h / 2 - 1), stroke(mix(YARD.rust, '#3A2A22', 0.3), 1.2));
}

/** A heavy steel plate offcut (a tank's or a plough's), thick, one torch-cut wavy edge. */
export function hmsPlate(c: SkCanvas, s: number, seed = 0): void {
  const w = s / 2;
  const h = s * 0.32;
  const t = Math.max(2.4, s * 0.1);
  const top = poly([-w, -h * 0.5, w * 0.7, -h, w, h * 0.3 - t, -w * 0.85, h * 0.6 - t]);
  // the thickness (the near edge), then the top face
  const edge = poly([-w * 0.85, h * 0.6 - t, w, h * 0.3 - t, w, h * 0.3, -w * 0.85, h * 0.6]);
  outlined(c, edge, TONE.steel);
  outlined(c, top, TONE.steelTop);
  // a torch-cut edge: wavy bright line on the near edge
  const b = builder().moveTo(-w * 0.82, h * 0.6 - t * 0.5);
  for (let i = 1; i <= 6; i++) b.lineTo(-w * 0.82 + ((w * 1.8) / 6) * i, h * 0.6 - t * 0.5 - (h * 0.3 * i) / 6 + (i % 2 ? -0.6 : 0.6));
  c.drawPath(b.build(), stroke(TONE.steelCut, 0.9));
  // mill scale and rust
  c.drawPath(oval(-w * 0.2 + hash01(seed) * w * 0.3, -h * 0.35, w * 0.3, h * 0.2), fill(YARD.rust, 0.5));
  for (let i = 0; i < 3; i++) c.drawPath(circle(-w * 0.6 + hash01(seed, i) * w * 1.3, -h * 0.6 + hash01(seed, i, 3) * h * 0.7, 0.8), fill(YARD.rustLight, 0.8));
  // the yard's band mark (steel's sheen mark)
  c.drawPath(segment(w * 0.35, -h * 0.86, w * 0.5, h * 0.36 - t), stroke(METAL.hms.light, 1.4, 0.8));
}

/** A radiator section of cast iron: two or three round columns joined at the top and foot. */
export function radiatorSection(c: SkCanvas, s: number, n = 3, seed = 0): void {
  const m = METAL.cast_iron;
  const cw = s / (n + 0.4);
  const h = s * 0.62;
  outlined(c, rrect(-s / 2, -h / 2, s, h * 0.18, 1), m.dark, 0.8);
  outlined(c, rrect(-s / 2, h / 2 - h * 0.18, s, h * 0.18, 1), m.dark, 0.8);
  for (let i = 0; i < n; i++) {
    const x = -s / 2 + cw * (i + 0.2);
    outlined(c, rrect(x, -h / 2, cw * 0.86, h, cw * 0.4), i % 2 ? m.base : shade(m.base, 0.08), 0.9);
    c.drawPath(segment(x + cw * 0.25, -h / 2 + 2, x + cw * 0.25, h / 2 - 2), stroke(m.light, 1));
    c.drawPath(circle(x + cw * 0.55, -h * 0.1 + hash01(seed, i) * h * 0.3, 0.8), fill(m.light));
  }
}

/**
 * A thick broken shard of cast iron (a bath's, a stove's, a trough's): an angular slab with its broken
 * edge showing the grey grain; `enamel` gives it a bath's white enamel face.
 */
export function castShard(c: SkCanvas, s: number, seed = 0, enamel = false): void {
  const w = s / 2;
  const h = s * 0.34;
  const t = Math.max(3, s * 0.14);
  const j = (i: number) => (hash01(seed, i, 7) - 0.5) * s * 0.12;
  const top = poly([-w, -h * 0.2 + j(1), -w * 0.3 + j(2), -h, w * 0.5, -h * 0.8 + j(3), w, -h * 0.1, w * 0.6 + j(4), h * 0.5 - t, -w * 0.5, h * 0.7 - t]);
  const edge = poly([-w, -h * 0.2 + j(1), -w * 0.5, h * 0.7 - t, w * 0.6 + j(4), h * 0.5 - t, w, -h * 0.1, w, -h * 0.1 + t, w * 0.6 + j(4), h * 0.5, -w * 0.5, h * 0.7, -w, -h * 0.2 + j(1) + t]);
  outlined(c, edge, mix(TONE.castHi, '#8B8F93', 0.3));
  // the broken grain: a few dark speckles on the edge
  for (let i = 0; i < 4; i++) c.drawPath(circle(-w * 0.6 + i * w * 0.4, h * 0.62 - t * 0.4 - i * h * 0.06, 0.7), fill(TONE.castLo));
  outlined(c, top, enamel ? YARD.enamel : TONE.cast);
  if (enamel) {
    c.drawPath(segment(-w * 0.6, -h * 0.25, w * 0.4, -h * 0.65), stroke('#FFFFFF', 1.4));
    c.drawPath(circle(w * 0.2, h * 0.05, 1.1), fill(YARD.rust, 0.7));
  } else for (let i = 0; i < 4; i++) c.drawPath(circle(-w * 0.5 + hash01(seed, i) * w, -h * 0.6 + hash01(seed, i, 2) * h * 0.8, 0.8), fill(TONE.castHi));
}

// ---------------------------------------------------------------------------
// Aluminium
// ---------------------------------------------------------------------------

/** A crushed aluminium can: a squashed cylinder with ridges, near white. */
export function crushedCan(c: SkCanvas, s: number): void {
  const w = s * 0.7;
  const h = s * 0.42;
  const p = poly([-w / 2, -h / 2, -w * 0.15, -h * 0.35, w * 0.12, -h * 0.55, w / 2, -h * 0.4, w / 2 + 1, h * 0.4, w * 0.1, h * 0.55, -w * 0.2, h * 0.38, -w / 2, h / 2]);
  outlined(c, p, TONE.alu);
  for (const x of [-w * 0.15, w * 0.12]) c.drawPath(segment(x, -h * 0.35, x - 1, h * 0.4), stroke(TONE.aluLo, 0.9));
  c.drawPath(oval(-w / 2 + 0.5, 0, 1.4, h / 2), fill(TONE.aluLo));
}

/** An aluminium channel profile: a long bar with a U section and a long sheen stripe. */
export function channelProfile(c: SkCanvas, s: number): void {
  const L = s;
  const h = Math.max(3.4, s * 0.22);
  outlined(c, rrect(-L / 2, -h / 2, L, h, 0.5), TONE.alu);
  c.drawPath(segment(-L / 2 + 2, h * 0.2, L / 2 - h, h * 0.2), stroke(TONE.aluMid, 1));
  const e = L / 2;
  outlined(c, poly([e - h, -h / 2, e + 0.5, -h / 2, e + 0.5, h / 2, e - h, h / 2, e - h, h / 2 - h * 0.28, e - h * 0.28, h / 2 - h * 0.28, e - h * 0.28, -h / 2 + h * 0.28, e - h, -h / 2 + h * 0.28]), TONE.aluLo, 0.8);
}

/** A motor's cast-aluminium end cap (end bell): a ribbed dome with bolt lugs and the bearing boss. */
export function endCap(c: SkCanvas, s: number): void {
  const r = s * 0.42;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.5;
    c.drawPath(circle(Math.cos(a) * r * 1.02, Math.sin(a) * r * 0.75, Math.max(1.4, s * 0.08)), fill(TONE.aluMid));
    c.drawPath(circle(Math.cos(a) * r * 1.02, Math.sin(a) * r * 0.75, Math.max(1.4, s * 0.08)), stroke(INK, 0.8));
  }
  c.drawPath(oval(0, 0, r, r * 0.75), fill(TONE.alu));
  c.drawPath(oval(0, 0, r, r * 0.75), stroke(INK, 1));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    c.drawPath(segment(Math.cos(a) * r * 0.32, Math.sin(a) * r * 0.24, Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.62), stroke(TONE.aluMid, Math.max(1, s * 0.05)));
  }
  c.drawPath(oval(0, 0, r * 0.3, r * 0.22), fill(TONE.aluMid));
  c.drawPath(oval(0, 0, r * 0.3, r * 0.22), stroke(INK, 0.8));
  c.drawPath(oval(0, 0, r * 0.13, r * 0.1), fill(YARD.steelDark));
}

/** An aluminium alloy wheel without its tyre, seen lying at an angle: rim, five spokes, the hub. */
export function alloyWheel(c: SkCanvas, s: number, upright = false): void {
  const rx = s * 0.46;
  const ry = upright ? s * 0.44 : s * 0.32;
  // the rim's depth (the barrel) shows below
  c.drawPath(oval(0, ry * 0.28, rx, ry), fill(TONE.aluLo));
  c.drawPath(oval(0, ry * 0.28, rx, ry), stroke(INK, 1));
  c.drawPath(oval(0, 0, rx, ry), fill(TONE.alu));
  c.drawPath(oval(0, 0, rx * 0.82, ry * 0.82), fill(shade(TONE.aluLo, -0.25)));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    c.drawPath(segment(0, 0, Math.cos(a) * rx * 0.8, Math.sin(a) * ry * 0.8), stroke(INK, Math.max(2.2, s * 0.15) + 1.2));
    c.drawPath(segment(0, 0, Math.cos(a) * rx * 0.8, Math.sin(a) * ry * 0.8), stroke(TONE.alu, Math.max(2.2, s * 0.15)));
  }
  c.drawPath(oval(0, 0, rx * 0.22, ry * 0.22), fill(TONE.aluMid));
  c.drawPath(oval(0, 0, rx * 0.22, ry * 0.22), stroke(INK, 0.8));
  c.drawPath(oval(0, 0, rx * 0.08, ry * 0.08), fill(YARD.steelDark));
  c.drawPath(oval(0, 0, rx, ry), stroke(INK, 1));
}

// ---------------------------------------------------------------------------
// Whole intermediates and odd pieces
// ---------------------------------------------------------------------------

/** A bent white-goods panel. */
export function enamelPanel(c: SkCanvas, s: number, seed = 0): void {
  bentPlate(c, s, seed, YARD.enamel, '#FFFFFF');
  c.drawPath(circle(s * 0.1, 0, 1), fill(YARD.rust, 0.8));
}

/** A washer's stainless drum lying on its side: perforated, its open mouth to the east. */
export function stainlessDrum(c: SkCanvas, s: number): void {
  const w = s * 0.78;
  const h = s * 0.58;
  const body = rrect(-w / 2, -h / 2, w, h, 2);
  c.drawPath(body, fill(YARD.galvanisedLight));
  c.drawRect({ x: -w / 2 + 1, y: -h / 2 + 1, width: w - 2, height: h * 0.22 }, fill('#E6EAED'));
  for (let r = 0; r < 3; r++) for (let i = 0; i < 5; i++) c.drawPath(circle(-w / 2 + w * (0.12 + i * 0.17) + (r % 2) * w * 0.08, -h * 0.2 + r * h * 0.24, Math.max(0.7, s * 0.035)), fill(YARD.steelDark));
  // the lifter ribs
  c.drawPath(segment(-w / 2 + 2, h * 0.32, w / 2 - 2, h * 0.32), stroke(shade(YARD.galvanised, -0.15), 1));
  c.drawPath(body, stroke(INK, 1));
  c.drawPath(oval(w / 2, 0, s * 0.11, h * 0.5), fill(YARD.galvanised));
  c.drawPath(oval(w / 2, 0, s * 0.11, h * 0.5), stroke(INK, 1));
  c.drawPath(oval(w / 2, 0, s * 0.07, h * 0.38), fill(YARD.steelDark));
}

/** An electric motor, whole: a finned body, cast-aluminium end bells, a foot, a shaft and a terminal box. */
export function motorWhole(c: SkCanvas, s: number): void {
  const w = s * 0.62;
  const h = s * 0.46;
  // the foot
  outlined(c, rrect(-w * 0.42, h * 0.38, w * 0.84, h * 0.16, 1), YARD.machineDark, 0.8);
  const body = rrect(-w / 2, -h / 2, w, h, h * 0.35);
  c.drawPath(body, fill(YARD.machine));
  for (let i = 1; i < 6; i++) c.drawPath(segment(-w / 2 + (w * i) / 6, -h / 2 + 1.2, -w / 2 + (w * i) / 6, h / 2 - 1.2), stroke(YARD.machineDark, 1));
  c.drawRect({ x: -w / 2 + 2, y: -h / 2 + 1, width: w - 4, height: h * 0.18 }, fill(YARD.machineLight));
  c.drawPath(body, stroke(INK, 1));
  // end bells (cast aluminium)
  for (const x of [-w / 2 - s * 0.04, w / 2 + s * 0.04]) {
    const cap = oval(x, 0, s * 0.08, h * 0.44);
    c.drawPath(cap, fill(TONE.aluMid));
    c.drawPath(cap, stroke(INK, 0.9));
  }
  c.drawPath(segment(w / 2 + s * 0.1, 0, w / 2 + s * 0.24, 0), stroke(INK, 2.6));
  c.drawPath(segment(w / 2 + s * 0.1, 0, w / 2 + s * 0.24, 0), stroke(YARD.galvanisedLight, 1.3));
  // the terminal box, its lid off: copper leads
  outlined(c, rrect(-s * 0.1, -h / 2 - s * 0.11, s * 0.2, s * 0.13, 1), YARD.machineDark, 0.8);
  c.drawPath(segment(-s * 0.05, -h / 2 - s * 0.08, -s * 0.05, -h / 2 - s * 0.01), stroke(YARD.copperLight, 1.2));
  c.drawPath(segment(s * 0.03, -h / 2 - s * 0.08, s * 0.03, -h / 2 - s * 0.01), stroke(YARD.copperLight, 1.2));
}

/** Short lengths of heavy insulated cable, a strap round them, copper cores showing at each cut end. */
export function cableLengths(c: SkCanvas, s: number, seed = 0): void {
  const d = Math.max(3.4, s * 0.2);
  const jackets = [YARD.pvc, YARD.pvcGrey, '#4A5058'];
  for (let i = 0; i < 3; i++) {
    const y = (i - 1) * d * 0.95 + (hash01(seed, i) - 0.5) * 1.2;
    const L = s * (0.78 + hash01(seed, i, 2) * 0.18);
    const x0 = -s / 2 + (s - L) * hash01(seed, i, 3);
    const r = rrect(x0, y - d / 2, L, d, d * 0.45);
    c.drawPath(r, fill(jackets[i % 3]));
    c.drawPath(segment(x0 + 2, y - d * 0.22, x0 + L - 2, y - d * 0.22), stroke(shade(jackets[i % 3], 0.3), Math.max(0.8, d * 0.2)));
    c.drawPath(r, stroke(INK, 0.9));
    // the cut end: three copper cores in the jacket
    const ex = x0 + L;
    c.drawPath(oval(ex, y, d * 0.32, d * 0.5), fill(shade(jackets[i % 3], -0.2)));
    c.drawPath(oval(ex, y, d * 0.32, d * 0.5), stroke(INK, 0.8));
    for (const [dx, dy] of [[-0.06, -0.2], [0.06, 0.18], [-0.08, 0.16]] as const) c.drawPath(circle(ex + dx * d, y + dy * d, Math.max(0.6, d * 0.15)), fill(YARD.copperLight));
  }
  c.drawPath(segment(-s * 0.12, -d * 1.6, -s * 0.1, d * 1.6), stroke(INK, 3));
  c.drawPath(segment(-s * 0.12, -d * 1.6, -s * 0.1, d * 1.6), stroke(YARD.crateBlue, 1.8));
}

/** A section of a car body (shredder feed): a crumpled painted panel with a window frame's edge. */
export function bodySection(c: SkCanvas, s: number, seed = 0): void {
  const paint = CAR_PAINTS[Math.floor(hash01(seed, 41) * CAR_PAINTS.length)];
  const w = s / 2;
  const h = s * 0.34;
  const p = poly([-w, -h * 0.4, -w * 0.4, -h, w * 0.3, -h * 0.85, w, -h * 0.3, w * 0.85, h * 0.6, -w * 0.2, h * 0.75, -w * 0.9, h * 0.5]);
  outlined(c, p, paint);
  // crumples: folds as darker and lighter strokes
  c.drawPath(segment(-w * 0.5, -h * 0.7, -w * 0.15, h * 0.6), stroke(shade(paint, -0.3), 1.2));
  c.drawPath(segment(-w * 0.45, -h * 0.72, -w * 0.1, h * 0.58), stroke(shade(paint, 0.35), 0.8));
  c.drawPath(segment(w * 0.3, -h * 0.75, w * 0.55, h * 0.55), stroke(shade(paint, -0.3), 1.2));
  // a window frame's edge with a black seal
  c.drawPath(builder().moveTo(-w * 0.35, -h * 0.9).quadTo(w * 0.05, -h * 0.4, w * 0.3, -h * 0.82).build(), stroke(INK, 2));
  // bare steel where it was cut, a rust edge
  c.drawPath(segment(w * 0.85, h * 0.6, w, -h * 0.3), stroke(TONE.ironHi, 1.4));
  c.drawPath(circle(-w * 0.6, h * 0.25, 1.1), fill(YARD.rust));
}

/** The catalytic converter: an oval can in a dimpled heat shield, two pipe stubs and flanges. */
export function converter(c: SkCanvas, s: number): void {
  const w = s * 0.5;
  const h = s * 0.3;
  for (const x of [-w * 1.0, w * 1.0]) {
    outlined(c, rrect(x - s * 0.1, -h * 0.22, s * 0.2, h * 0.44, h * 0.2), YARD.steel, 0.8);
  }
  outlined(c, poly([-w * 0.95, -h * 0.5, -w * 0.7, -h * 0.5, -w * 0.7, h * 0.5, -w * 0.95, h * 0.5]), YARD.steelDark, 0.8);
  outlined(c, poly([w * 0.95, -h * 0.5, w * 0.7, -h * 0.5, w * 0.7, h * 0.5, w * 0.95, h * 0.5]), YARD.steelDark, 0.8);
  const can = rrect(-w * 0.72, -h, w * 1.44, h * 2, h * 0.9);
  c.drawPath(can, fill(YARD.galvanisedLight));
  c.drawRect({ x: -w * 0.6, y: -h * 0.85, width: w * 1.2, height: h * 0.45 }, fill('#E4E8EB'));
  for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) c.drawPath(circle(-w * 0.45 + i * w * 0.3 + (r % 2) * w * 0.15, -h * 0.15 + r * h * 0.55, Math.max(0.8, s * 0.035)), fill(shade(YARD.galvanised, -0.15)));
  c.drawPath(can, stroke(INK, 1));
  // the heat shield's seam
  c.drawPath(segment(-w * 0.72, h * 0.15, w * 0.72, h * 0.15), stroke(YARD.steel, 0.9));
}

/** A lead-acid battery: a dark box, two terminal posts, a carry strap. */
export function battery(c: SkCanvas, s: number): void {
  const w = s * 0.42;
  const h = s * 0.34;
  outlined(c, rrect(-w, -h * 0.4, w * 2, h * 1.2, 1.5), shade(TONE.lead, -0.15));
  outlined(c, rrect(-w, -h * 0.75, w * 2, h * 0.42, 1.2), mix(TONE.lead, '#FFFFFF', 0.18), 0.9);
  for (const x of [-w * 0.6, w * 0.6]) {
    outlined(c, rrect(x - s * 0.05, -h * 0.95, s * 0.1, h * 0.24, 0.8), x < 0 ? '#B8452C' : YARD.galvanised, 0.8);
  }
  c.drawPath(builder().moveTo(-w * 0.35, -h * 0.72).quadTo(0, -h * 1.25, w * 0.35, -h * 0.72).build(), stroke(INK, 1.6));
  // cell caps
  for (let i = 0; i < 3; i++) c.drawPath(circle(-w * 0.3 + i * w * 0.3, -h * 0.55, Math.max(0.7, s * 0.03)), fill(INK));
}

/** A bicycle frame cut out of its wheels: the diamond of tubes, faded paint. */
export function bikeFrame(c: SkCanvas, s: number, seed = 0): void {
  const paint = ['#4F7896', '#6F806A', '#7D3B33'][Math.floor(hash01(seed, 5) * 3)];
  const k = s / 20;
  const pts = { bb: [0, 4], seat: [-3, -6], head: [7, -5], rear: [-9, 4], fork: [9, 4] } as const;
  const tube = (a: readonly number[], b: readonly number[]) => {
    c.drawPath(segment(a[0] * k, a[1] * k, b[0] * k, b[1] * k), stroke(INK, Math.max(2.4, k * 1.6) + 1.2));
    c.drawPath(segment(a[0] * k, a[1] * k, b[0] * k, b[1] * k), stroke(paint, Math.max(2.4, k * 1.6)));
  };
  tube(pts.rear, pts.seat);
  tube(pts.rear, pts.bb);
  tube(pts.seat, pts.bb);
  tube(pts.seat, pts.head);
  tube(pts.head, pts.bb);
  tube(pts.head, pts.fork);
  tube([pts.seat[0], pts.seat[1]], [pts.seat[0] - 1, pts.seat[1] - 3]);
  tube(pts.head, [pts.head[0] - 1, pts.head[1] - 3]);
  c.drawPath(segment((pts.head[0] - 4) * k, (pts.head[1] - 3) * k, (pts.head[0] + 1) * k, (pts.head[1] - 3) * k), stroke(INK, 2.2));
  c.drawPath(circle(pts.bb[0] * k, pts.bb[1] * k, Math.max(1.6, k * 1.5)), fill(YARD.steel));
  c.drawPath(circle(pts.bb[0] * k, pts.bb[1] * k, Math.max(1.6, k * 1.5)), stroke(INK, 0.8));
}

/** A steel bicycle wheel (rim and spokes, tyre off). */
export function bikeWheel(c: SkCanvas, s: number): void {
  const r = s * 0.46;
  c.drawPath(oval(0, 0, r, r * 0.72), stroke(INK, 3));
  c.drawPath(oval(0, 0, r, r * 0.72), stroke(YARD.galvanisedLight, 1.8));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    c.drawPath(segment(0, 0, Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.68), stroke(YARD.steel, 0.6));
  }
  c.drawPath(circle(0, 0, 1.6), fill(YARD.steelDark));
}

/** A section of a steel gate or railing: tube bars in a frame, galvanised or painted. */
export function gateSection(c: SkCanvas, s: number, railing = false, seed = 0): void {
  const w = s / 2;
  const h = s * 0.32;
  const col = railing ? '#3E4A44' : YARD.galvanised;
  const lt = railing ? '#5E6C64' : YARD.galvanisedLight;
  const bar = (x0: number, y0: number, x1: number, y1: number, wd: number) => {
    c.drawPath(segment(x0, y0, x1, y1), stroke(INK, wd + 1.2));
    c.drawPath(segment(x0, y0, x1, y1), stroke(col, wd));
  };
  const W = Math.max(1.6, s * 0.06);
  if (railing) {
    bar(-w, -h * 0.5, w, -h * 0.6, W);
    bar(-w, h * 0.6, w, h * 0.5, W);
    for (let i = 0; i < 6; i++) {
      const x = -w * 0.9 + (i * w * 1.8) / 5;
      bar(x, h * 0.75, x, -h * 0.85, W * 0.8);
      c.drawPath(poly([x - 1.6, -h * 0.85, x, -h * 1.15, x + 1.6, -h * 0.85]), fill(col));
    }
  } else {
    for (let i = 0; i < 4; i++) bar(-w, -h + (i * 2 * h) / 3, w, -h + (i * 2 * h) / 3, W);
    bar(-w, -h, -w, h, W * 1.2);
    bar(w, -h, w, h, W * 1.2);
    bar(-w, h, w, -h, W * 0.9);
  }
  c.drawPath(segment(-w * 0.8, -h * 0.98, -w * 0.2, -h * 0.98), stroke(lt, 0.8));
  c.drawPath(circle(-w * 0.3 + hash01(seed) * w, 0, 1.2), fill(YARD.rust, 0.85));
}

/** A lump of dross (the skimmed crust): grey crust with glints of its metal. */
export function dross(c: SkCanvas, s: number, metal: 'brass' | 'aluminium' = 'brass', seed = 0): void {
  const w = s * 0.45;
  const h = s * 0.3;
  const pts: number[] = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const r = 0.78 + hash01(seed, i, 3) * 0.3;
    pts.push(Math.cos(a) * w * r, Math.sin(a) * h * r);
  }
  const p = poly(pts);
  c.drawPath(p, fill(metal === 'brass' ? '#77745F' : '#A9AFB3'));
  c.drawPath(p, stroke(INK, 0.9));
  for (let i = 0; i < 5; i++)
    c.drawPath(circle((hash01(seed, i, 4) - 0.5) * w * 1.2, (hash01(seed, i, 5) - 0.5) * h, Math.max(0.8, s * 0.05)), fill(metal === 'brass' ? TONE.brass : TONE.alu));
  c.drawPath(oval(-w * 0.2, -h * 0.35, w * 0.4, h * 0.2), fill('#FFFFFF', 0.25));
}

// ---------------------------------------------------------------------------
// One entry point
// ---------------------------------------------------------------------------

/** The piece kinds pieceGlyph draws, besides the old metal ids (light_iron, cast_iron, hms, aluminium, brass, copper, enamel). */
export const PIECE_KINDS = [
  'panel', 'drum', 'sheet', 'bike', 'wheelsteel', 'gate', 'railing', 'shard', 'shard_enamel', 'section', 'plate', 'beam',
  'body', 'bright', 'tube', 'no2', 'windings', 'shell', 'taps', 'fittings', 'alu', 'endcap', 'wheel', 'motor', 'cable',
  'converter', 'battery', 'dross_brass', 'dross_alu',
] as const;
export type PieceKind = (typeof PIECE_KINDS)[number];

/**
 * One piece at (x, y), about s points long, turned `turn` degrees; `seed` picks among the grade's
 * shapes. `metal` is an old metal id (METAL keys, 'enamel') or a PieceKind.
 */
export function pieceGlyph(c: SkCanvas, metal: string, x: number, y: number, s: number, turn = 0, seed = 0): void {
  c.save();
  c.translate(x, y);
  c.rotate(turn, 0, 0);
  const pick = Math.floor(hash01(seed, 77) * 3);
  switch (metal) {
    case 'copper':
      if (pick === 2) tubeOffcut(c, s);
      else wireBundle(c, s, seed);
      break;
    case 'bright':
      wireBundle(c, s, seed);
      break;
    case 'tube':
      tubeOffcut(c, s);
      break;
    case 'no2':
      if (pick === 0) tubeOffcut(c, s, 'no2');
      else if (pick === 1) no2Bent(c, s);
      else windings(c, s, seed);
      break;
    case 'windings':
      windings(c, s, seed);
      break;
    case 'shell':
      copperShell(c, s);
      break;
    case 'brass':
    case 'taps':
    case 'fittings':
      if (metal === 'taps' || (metal === 'brass' && pick === 0)) brassTap(c, s);
      else if (pick === 1) brassValve(c, s);
      else if (metal === 'fittings' && seed % 2) brassTee(c, s);
      else brassElbow(c, s);
      break;
    case 'cast_iron':
      if (pick === 1) castShard(c, s, seed);
      else radiatorSection(c, s, pick === 0 ? 2 : 3, seed);
      break;
    case 'section':
      radiatorSection(c, s, 3, seed);
      break;
    case 'shard':
      castShard(c, s, seed);
      break;
    case 'shard_enamel':
      castShard(c, s, seed, true);
      break;
    case 'hms':
      if (pick === 1) hmsPlate(c, s, seed);
      else beamOffcut(c, s, seed);
      break;
    case 'beam':
      beamOffcut(c, s, seed);
      break;
    case 'plate':
      hmsPlate(c, s, seed);
      break;
    case 'aluminium':
    case 'alu':
      if (pick === 0) channelProfile(c, s);
      else if (pick === 1) endCap(c, s * 0.8);
      else crushedCan(c, s);
      break;
    case 'endcap':
      endCap(c, s);
      break;
    case 'wheel':
      alloyWheel(c, s);
      break;
    case 'motor':
      motorWhole(c, s);
      break;
    case 'cable':
      cableLengths(c, s, seed);
      break;
    case 'converter':
      converter(c, s);
      break;
    case 'battery':
      battery(c, s);
      break;
    case 'body':
      bodySection(c, s, seed);
      break;
    case 'drum':
      stainlessDrum(c, s);
      break;
    case 'bike':
      bikeFrame(c, s, seed);
      break;
    case 'wheelsteel':
      bikeWheel(c, s);
      break;
    case 'gate':
      gateSection(c, s, false, seed);
      break;
    case 'railing':
      gateSection(c, s, true, seed);
      break;
    case 'sheet':
      corrugated(c, s, seed);
      break;
    case 'dross_brass':
      dross(c, s, 'brass', seed);
      break;
    case 'dross_alu':
      dross(c, s, 'aluminium', seed);
      break;
    case 'enamel':
    case 'panel':
      enamelPanel(c, s, seed);
      break;
    case 'light_iron':
    default:
      if (pick === 1) angleIron(c, s, seed);
      else if (pick === 2) corrugated(c, s, seed);
      else bentPlate(c, s, seed);
  }
  c.restore();
}

/**
 * The piece kinds a content grade (content2.json `grades`) is made of, most typical first: a bay, a heap
 * or a skip of the grade draws these. Unknown grades look like light iron.
 */
export const GRADE_PIECES: Readonly<Record<string, readonly string[]>> = {
  li: ['light_iron', 'panel', 'drum', 'sheet', 'gate'],
  appl: ['panel', 'light_iron', 'panel'],
  ci: ['shard', 'section', 'shard_enamel', 'shard'],
  ciu: ['section', 'shard', 'section'],
  hms: ['beam', 'plate', 'beam'],
  hmsu: ['beam', 'plate'],
  cbody: ['body', 'body', 'body'],
  alw: ['wheel'],
  alcast: ['endcap', 'alu'],
  ali: ['alu'],
  ald: ['dross_alu'],
  brs: ['taps', 'fittings', 'brass'],
  bri: ['brass'],
  brd: ['dross_brass'],
  no2: ['no2', 'shell', 'windings', 'no2'],
  bb: ['bright', 'bright', 'tube'],
  cyl: ['shell'],
  cab: ['cable'],
  mot: ['motor'],
  batt: ['battery'],
  conv: ['converter'],
};

/** One piece of a content grade (see GRADE_PIECES), seed choosing among its kinds. */
export function gradeGlyph(c: SkCanvas, grade: string, x: number, y: number, s: number, turn = 0, seed = 0): void {
  const kinds = GRADE_PIECES[grade] ?? GRADE_PIECES.li;
  pieceGlyph(c, kinds[Math.abs(seed) % kinds.length], x, y, s, turn, seed);
}

/**
 * The 10 pt pictogram of a content grade for tickets, chips and cards: the grade's own shape, simplified,
 * on a light rounded square in the grade's tone (top-left at (x, y), `size` points square).
 */
export function gradePictogram(c: SkCanvas, grade: string, x: number, y: number, size = 10): void {
  const k = size / 10;
  const cx = x + size / 2;
  const cy = y + size / 2;
  const sq = rrect(x, y, size, size, 2 * k);
  c.drawPath(sq, fill(YARD.paper));
  c.drawPath(sq, stroke(INK, 0.7 * k));
  const lw = 0.7 * k;
  const thick = (p: ReturnType<typeof builder>, col: string, w: number) => {
    const path = p.build();
    c.drawPath(path, stroke(INK, w + 1.1 * k));
    c.drawPath(path, stroke(col, w));
  };
  const box = (bx: number, by: number, bw: number, bh: number, col: string, r = 0.6) => {
    const p = rrect(cx + bx * k, cy + by * k, bw * k, bh * k, r * k);
    c.drawPath(p, fill(col));
    c.drawPath(p, stroke(INK, lw));
  };
  switch (grade) {
    case 'bb':
    case 'no2':
    case 'cyl': {
      const col = grade === 'bb' ? TONE.copper : TONE.no2;
      for (let i = 0; i < 2; i++) {
        const o = oval(cx + (i - 0.5) * 1.4 * k, cy + (0.5 - i) * 0.8 * k, 3.4 * k, 2.2 * k);
        c.drawPath(o, stroke(INK, 2.4 * k));
        c.drawPath(o, stroke(i ? shade(col, 0.15) : col, 1.4 * k));
      }
      if (grade === 'bb') c.drawPath(segment(cx + 1 * k, cy - 2.6 * k, cx + 2.2 * k, cy - 3.6 * k), stroke(YARD.copperSheen, 0.8 * k));
      if (grade === 'cyl') box(-1.2, -4.2, 2.4, 1.4, TONE.no2);
      break;
    }
    case 'brs':
    case 'bri':
    case 'brd':
      if (grade === 'bri') {
        box(-3.8, -1.2, 7.6, 3.2, TONE.brass);
        c.drawPath(segment(cx - 1.2 * k, cy - 1.2 * k, cx - 1.2 * k, cy + 2 * k), stroke(TONE.brassLo, 0.6 * k));
        c.drawPath(segment(cx + 1.2 * k, cy - 1.2 * k, cx + 1.2 * k, cy + 2 * k), stroke(TONE.brassLo, 0.6 * k));
      } else if (grade === 'brd') {
        c.save();
        c.translate(cx, cy);
        dross(c, 8 * k, 'brass', 3);
        c.restore();
      } else {
        // a tap: body, spout, handle
        box(-3.6, -0.6, 5.2, 2.2, TONE.brass);
        box(1.0, -0.6, 1.8, 3.6, TONE.brass);
        box(-1.4, -3.6, 1.0, 3.0, TONE.brassLo, 0.3);
        box(-3.0, -4.0, 4.2, 1.2, TONE.brass);
      }
      break;
    case 'ali':
    case 'ald':
    case 'alcast':
    case 'alw':
      if (grade === 'alw') {
        c.drawPath(oval(cx, cy, 3.8 * k, 3.8 * k), fill(TONE.alu));
        c.drawPath(oval(cx, cy, 3.8 * k, 3.8 * k), stroke(INK, lw));
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
          c.drawPath(segment(cx, cy, cx + Math.cos(a) * 3 * k, cy + Math.sin(a) * 3 * k), stroke(TONE.aluLo, 0.9 * k));
        }
        c.drawPath(circle(cx, cy, 0.8 * k), fill(INK));
      } else if (grade === 'ali') {
        box(-3.8, -1.2, 7.6, 3.2, TONE.alu);
        c.drawPath(segment(cx - 1.2 * k, cy - 1.2 * k, cx - 1.2 * k, cy + 2 * k), stroke(TONE.aluLo, 0.6 * k));
      } else if (grade === 'ald') {
        c.save();
        c.translate(cx, cy);
        dross(c, 8 * k, 'aluminium', 3);
        c.restore();
      } else {
        c.save();
        c.translate(cx, cy);
        endCap(c, 8 * k);
        c.restore();
      }
      break;
    case 'ci':
    case 'ciu':
      for (let i = 0; i < 3; i++) box(-3.6 + i * 2.5, -3.4, 2.1, 6.8, i % 2 ? TONE.cast : shade(TONE.cast, 0.1), 1);
      break;
    case 'hms':
    case 'hmsu':
      // the I section
      c.drawPath(
        poly([cx - 3.4 * k, cy - 3.6 * k, cx + 3.4 * k, cy - 3.6 * k, cx + 3.4 * k, cy - 2.2 * k, cx + 0.8 * k, cy - 2.2 * k, cx + 0.8 * k, cy + 2.2 * k, cx + 3.4 * k, cy + 2.2 * k, cx + 3.4 * k, cy + 3.6 * k, cx - 3.4 * k, cy + 3.6 * k, cx - 3.4 * k, cy + 2.2 * k, cx - 0.8 * k, cy + 2.2 * k, cx - 0.8 * k, cy - 2.2 * k, cx - 3.4 * k, cy - 2.2 * k]),
        fill(TONE.steel),
      );
      c.drawPath(
        poly([cx - 3.4 * k, cy - 3.6 * k, cx + 3.4 * k, cy - 3.6 * k, cx + 3.4 * k, cy - 2.2 * k, cx + 0.8 * k, cy - 2.2 * k, cx + 0.8 * k, cy + 2.2 * k, cx + 3.4 * k, cy + 2.2 * k, cx + 3.4 * k, cy + 3.6 * k, cx - 3.4 * k, cy + 3.6 * k, cx - 3.4 * k, cy + 2.2 * k, cx - 0.8 * k, cy + 2.2 * k, cx - 0.8 * k, cy - 2.2 * k, cx - 3.4 * k, cy - 2.2 * k]),
        stroke(INK, lw),
      );
      if (grade === 'hmsu') c.drawPath(segment(cx - 3 * k, cy + 4.2 * k, cx + 3 * k, cy + 4.2 * k), stroke(YARD.rust, 0.8 * k));
      break;
    case 'cbody':
      c.drawPath(poly([cx - 4 * k, cy + 2 * k, cx - 3 * k, cy - 0.6 * k, cx - 1 * k, cy - 3 * k, cx + 2 * k, cy - 3 * k, cx + 3.2 * k, cy - 0.6 * k, cx + 4 * k, cy - 0.4 * k, cx + 4 * k, cy + 2 * k]), fill(CAR_PAINTS[0]));
      c.drawPath(poly([cx - 4 * k, cy + 2 * k, cx - 3 * k, cy - 0.6 * k, cx - 1 * k, cy - 3 * k, cx + 2 * k, cy - 3 * k, cx + 3.2 * k, cy - 0.6 * k, cx + 4 * k, cy - 0.4 * k, cx + 4 * k, cy + 2 * k]), stroke(INK, lw));
      c.drawPath(poly([cx - 0.6 * k, cy - 2.4 * k, cx + 1.7 * k, cy - 2.4 * k, cx + 2.5 * k, cy - 0.7 * k, cx - 0.6 * k, cy - 0.7 * k]), fill(YARD.glass));
      for (const wx of [-2.2, 2.2]) {
        c.drawPath(circle(cx + wx * k, cy + 2.2 * k, 1.2 * k), fill(INK));
      }
      break;
    case 'cab':
      c.drawPath(circle(cx, cy, 3.8 * k), fill(TONE.pvc));
      c.drawPath(circle(cx, cy, 3.8 * k), stroke(INK, lw));
      for (const [dx, dy] of [[-1.3, -0.8], [1.3, -0.8], [0, 1.4]] as const) c.drawPath(circle(cx + dx * k, cy + dy * k, 1.15 * k), fill(YARD.copperLight));
      break;
    case 'mot':
      box(-3.2, -2.4, 6.4, 4.6, YARD.machine, 1.6);
      for (let i = 1; i < 4; i++) c.drawPath(segment(cx + (-3.2 + i * 1.6) * k, cy - 2 * k, cx + (-3.2 + i * 1.6) * k, cy + 1.8 * k), stroke(YARD.machineDark, 0.5 * k));
      box(3.2, -0.5, 1.4, 1.0, YARD.galvanisedLight, 0.2);
      box(-1.0, -3.6, 2.0, 1.2, YARD.copper, 0.3);
      break;
    case 'batt':
      box(-3.6, -2.2, 7.2, 5, shade(TONE.lead, -0.15), 0.8);
      box(-2.8, -3.4, 1.4, 1.2, '#B8452C', 0.2);
      box(1.4, -3.4, 1.4, 1.2, YARD.galvanised, 0.2);
      break;
    case 'conv':
      box(-3.0, -2.2, 6.0, 4.4, YARD.galvanisedLight, 2);
      box(-4.4, -0.6, 1.4, 1.2, YARD.steel, 0.2);
      box(3.0, -0.6, 1.4, 1.2, YARD.steel, 0.2);
      c.drawPath(circle(cx + 0.6 * k, cy - 0.6 * k, 0.6 * k), fill(YARD.steel));
      break;
    case 'li':
    case 'appl':
    default: {
      const col = grade === 'appl' ? YARD.enamel : TONE.iron;
      c.drawPath(poly([cx - 4 * k, cy - 1.6 * k, cx, cy - 3.6 * k, cx, cy + 1.2 * k, cx - 4 * k, cy + 3 * k]), fill(grade === 'appl' ? '#FFFFFF' : TONE.ironHi));
      c.drawPath(poly([cx - 4 * k, cy - 1.6 * k, cx, cy - 3.6 * k, cx, cy + 1.2 * k, cx - 4 * k, cy + 3 * k]), stroke(INK, lw));
      c.drawPath(poly([cx, cy - 3.6 * k, cx + 4 * k, cy - 2 * k, cx + 3.8 * k, cy + 2.6 * k, cx, cy + 1.2 * k]), fill(col));
      c.drawPath(poly([cx, cy - 3.6 * k, cx + 4 * k, cy - 2 * k, cx + 3.8 * k, cy + 2.6 * k, cx, cy + 1.2 * k]), stroke(INK, lw));
      c.drawPath(circle(cx + 1.8 * k, cy - 0.4 * k, 0.6 * k), fill(YARD.rust));
    }
  }
  void lw;
  void hash01;
}

/**
 * A heap of one or more grades as a bay or a skip shows it: a low mound in the first grade's dark tone
 * and n pieces piled on it, back to front (so nearer pieces overlap). Centre (0, 0) is the heap's foot;
 * w and h its width and height in points. `metals` are pieceGlyph kinds (old metal ids or PieceKinds).
 */
export function pieceHeap(c: SkCanvas, metals: string[], w: number, h: number, n: number, seed = 1, size = 14): void {
  const m0 = METAL[metals[0]] ?? (metals[0] === 'hms' || metals[0] === 'beam' || metals[0] === 'plate' ? { dark: TONE.steel } : METAL.light_iron);
  const mound = builder()
    .moveTo(-w / 2, 0)
    .quadTo(-w * 0.42, -h * 0.9, 0, -h)
    .quadTo(w * 0.42, -h * 0.9, w / 2, 0)
    .quadTo(0, h * 0.22, -w / 2, 0)
    .close()
    .build();
  c.drawPath(mound, fill(shade(m0.dark, -0.15)));
  c.drawPath(mound, stroke(INK, 1));
  const pts: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = hash01(seed, i, 1) * 2 - 1;
    const top = -h * (1 - a * a) * 0.92;
    const y = top + (h * 0.1 - top) * hash01(seed, i, 2) ** 1.4;
    pts.push([a * w * 0.42, y, i]);
  }
  pts.sort((p, q) => p[1] - q[1]);
  for (const [x, y, i] of pts) {
    const metal = metals[i % metals.length];
    pieceGlyph(c, metal, x, y, size * (0.85 + hash01(seed, i, 4) * 0.35), (hash01(seed, i, 3) - 0.5) * 50, seed * 31 + i);
  }
}
