/**
 * The bust (spec 1.2, 4.2, 7.3): head and shoulders in an oval photograph, drawn from a look's
 * parts. `drawBust(canvas, castId, box, options)` is what the atlas, the contact sheets and anything
 * else call; it fits the 100 x 125 design box into `box` (uniform scale, centred).
 *
 * Options: `tone` (draw these parts in another skin tone: the tone sheet), `age` 0..2 (the Office
 * wall's ageing: a little greyer, never unkind), `mono` (one ink colour on paper: the Office wall's
 * portraits), `greyscale`, `frame` (the thin rim of the photograph, default on), `ground` (the
 * photograph's paper inside the oval, default on).
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { lookOf, type Look } from './cast';
import { HEAD_TOP, HEAD_X, agedHair, drawEars, drawFace, drawFeatures, drawHairBack, drawHairFront, drawOuterExtras, headGeo, type Wash } from './head';
import { CLOTH, DEFAULT_PEN, GREY_MATRIX, P, alpha, at, clip, duotoneMatrix, fill, filtered, hatch, oval, sideOf, stroke, toneOf, type Pen, type ToneId } from './ink';
import { PROPS, type PropDef } from './props';
import { GARMENTS, HATS, drawNeck } from './wear';

/** The design box of a bust, in units. */
export const BUST_W = 100;
export const BUST_H = 125;
/** The oval photograph inside the design box. */
export const PHOTO = { cx: 50, cy: 62.5, rx: 48.6, ry: 61.4 } as const;
/** Where the neck meets the garment. */
const NECK_Y = 86;
/** The sitter's scale inside the photograph, about a point near the chin. */
const PERSON_SCALE = 1.12;
const PERSON_PIVOT = 64;

export interface BustBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BustOptions {
  tone?: ToneId;
  age?: number;
  /** One-colour portrait: true for violet ink on paper, or the two colours. */
  mono?: boolean | { ink: string; paper: string };
  greyscale?: boolean;
  frame?: boolean;
  ground?: boolean;
  /** false draws no hatching (flat washes only: the tone test, a flat print). Default true. */
  hatch?: boolean;
}

export function photoPath() {
  return oval(PHOTO.cx, PHOTO.cy, PHOTO.rx, PHOTO.ry);
}

export function washOf(look: Look, tone: ToneId = look.tone, age = 0): Wash {
  const t = toneOf(tone);
  return { skin: t.base, skinDeep: t.deep, hair: agedHair(look.hairColour, age) };
}

function drawProp(c: SkCanvas, pen: Pen, look: Look, back: boolean): void {
  if (look.prop === 'none') return;
  const def = PROPS[look.prop] as PropDef;
  if (!!def.at.back !== back) return;
  // Front props are pulled toward the middle so the oval never cuts them at small sizes.
  const x = back ? def.at.x : 50 + (def.at.x - 50) * 0.8;
  const y = back ? def.at.y : Math.min(def.at.y, 103);
  at(c, x, y, def.at.s ?? 1, def.at.deg, (q) => def.draw(q, pen, CLOTH[look.propAccent]));
}

/** The person alone, in design units, no photograph (the cut-outs reuse the head through `drawHeadOf`). */
export function drawPerson(c: SkCanvas, look: Look, opts: { tone?: ToneId; age?: number; pen?: Pen } = {}): void {
  const pen = opts.pen ?? DEFAULT_PEN;
  const age = opts.age ?? 0;
  const w = washOf(look, opts.tone, age);
  const g = headGeo(look.head, HEAD_X, HEAD_TOP);
  // The sitter fills the photograph a little more than the design grid (read at 44 pt).
  c.save();
  c.translate(50, PERSON_PIVOT);
  c.scale(PERSON_SCALE, PERSON_SCALE);
  c.translate(-50, -PERSON_PIVOT);
  drawProp(c, pen, look, true);
  drawHairBack(c, pen, g, look.hair, w);
  drawNeck(c, pen, HEAD_X, g.chin, NECK_Y, w.skin);
  GARMENTS[look.garment](c, pen, { cx: HEAD_X, neckY: NECK_Y, cloth: CLOTH[look.cloth], accent: CLOTH[look.accent], shirt: '#F1F2EE' });
  drawHeadOf(c, pen, look, w, age);
  drawProp(c, pen, look, false);
  c.restore();
}

/** The head with hair and hat, at the design position (HEAD_X, HEAD_TOP). */
export function drawHeadOf(c: SkCanvas, pen: Pen, look: Look, w: Wash, age = 0): void {
  const g = headGeo(look.head, HEAD_X, HEAD_TOP);
  drawEars(c, pen, g, w);
  drawFace(c, pen, g, w);
  const parts = { eyes: look.eyes, brows: look.brows, nose: look.nose, mouth: look.mouth, facial: look.facial, glasses: look.glasses, extra: look.extra };
  drawFeatures(c, pen, g, parts, w, age);
  drawHairFront(c, pen, g, look.hair, w);
  HATS[look.hat](c, pen, g, CLOTH[look.hatColour], CLOTH[look.accent]);
  drawOuterExtras(c, pen, g, parts, w);
}

/** The photograph's ground: the cool paper, a few hatched strokes on its shadow side. */
function drawGround(c: SkCanvas, pen: Pen): void {
  const ph = photoPath();
  c.drawPath(ph, fill(P.photo));
  hatch(c, pen, ph, { within: sideOf(78, 84, 0, 130, true, 4), a: 0.22, gap: 3 });
}

/** Draws the look in design units (100 x 125), clipped to its oval photograph. */
export function drawBustLook(c: SkCanvas, look: Look, o: BustOptions = {}): void {
  const body = (q: SkCanvas) => {
    q.save();
    clip(q, photoPath());
    const pen = o.hatch === false ? { ...DEFAULT_PEN, hatch: false } : DEFAULT_PEN;
    if (o.ground !== false) drawGround(q, pen);
    drawPerson(q, look, { tone: o.tone, age: o.age, pen });
    q.restore();
    if (o.frame !== false) {
      q.drawPath(photoPath(), stroke(alpha(P.ink, 0.85), 1.1));
    }
  };
  if (o.mono) {
    const m = o.mono === true ? { ink: P.violet, paper: P.paper } : o.mono;
    filtered(c, duotoneMatrix(m.ink, m.paper), body);
  } else if (o.greyscale) {
    filtered(c, GREY_MATRIX, body);
  } else {
    body(c);
  }
}

/**
 * THE entry point: draws `castId`'s bust fitted into `box` (any size; the design is 100 x 125, so a
 * box of that proportion fills exactly). Unknown ids draw nothing and return false.
 */
export function drawBust(canvas: SkCanvas, castId: string, box: BustBox, options: BustOptions = {}): boolean {
  const look = lookOf(castId);
  if (!look) return false;
  const s = Math.min(box.width / BUST_W, box.height / BUST_H);
  const x = box.x + (box.width - BUST_W * s) / 2;
  const y = box.y + (box.height - BUST_H * s) / 2;
  canvas.save();
  canvas.translate(x, y);
  canvas.scale(s, s);
  drawBustLook(canvas, look, options);
  canvas.restore();
  return true;
}
