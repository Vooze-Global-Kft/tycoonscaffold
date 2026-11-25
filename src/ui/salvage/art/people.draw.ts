/**
 * People of the yard (yard-style.md "Proportions"): the boss in a hi-vis yellow vest and a white hard
 * hat, crews in their role's vest and a yellow hat; all in navy work trousers, tan rigger gloves and
 * boots. About 4 heads tall, 47 points at the ground work's 40 points a metre (1.65 m with the hat).
 * Anchor: the centre of the feet on the ground. Directions: 's' (towards the eye), 'e', 'n', 'w'
 * ('w' is 'e' mirrored). Poses: stand, walk (frame 0..n-1), cut (face shield down, a grinder, sparks
 * that are light, never fire), carry (a stack on the back frame). Nobody is ever hurt or unsafe: the
 * gear is always on, and the shield is down whenever sparks show.
 */
import { ClipOp, type SkCanvas } from '@shopify/react-native-skia';
import { LINE_PERSON, YARD, shade } from './palette';
import { builder, fill, groundShadow, hash01, oval, poly, rrect, segment, stroke, type View3q } from './pen';
import { pieceGlyph } from './pieces.draw';

export type Dir = 's' | 'e' | 'n' | 'w';
export type Pose = 'stand' | 'walk' | 'cut' | 'carry' | 'lever';

export type Hair = 'none' | 'beard' | 'stubble' | 'tail' | 'fringe';

export interface PersonLook {
  vest: string;
  hat: string;
  /** Skin tone (SKINS) and hair; the crew vary by index (crewLook), the boss is one look. */
  skin?: string;
  hair?: Hair;
  hairColour?: string;
}

/** Skin tones of the yard's people, light to deep. */
export const SKINS = ['#F1C8A6', '#E3AE87', '#C68B62', '#9A6544', '#6E4630'] as const;
const HAIRS: Hair[] = ['stubble', 'tail', 'beard', 'fringe', 'none'];
const HAIR_COLOURS = ['#3B2A20', '#6B4A2E', '#2A2522', '#B98B4E', '#8A8A86'];

export const BOSS: PersonLook = { vest: YARD.hivis, hat: YARD.hatWhite, skin: SKINS[1], hair: 'stubble', hairColour: '#4A3426' };
/** A crew member's look: the role's vest and a yellow hat; skin and hair vary by the crew's index. */
export const crewLook = (vest: string, index = 0): PersonLook => ({
  vest,
  hat: YARD.hivis,
  skin: SKINS[(index * 3 + 2) % SKINS.length],
  hair: HAIRS[index % HAIRS.length],
  hairColour: HAIR_COLOURS[(index * 2 + 1) % HAIR_COLOURS.length],
});

/** Pieces on a back frame, bottom first: metal ids of METAL (colours and sheen marks come from it). */
export type Stack = string[];

export interface PersonOptions {
  dir: Dir;
  pose: Pose;
  /** Walk frame (0..frames-1). */
  frame?: number;
  frames?: number;
  look?: PersonLook;
  stack?: Stack;
  /** Cutting: the spark burst's phase 0..1 (varies the fan). */
  spark?: number;
  /** The face shield down without cutting (at the furnace). */
  shield?: boolean;
  /** The aluminised apron worn at every pour (yard-design.md 6). */
  apron?: boolean;
}

/** The design height of a person in points at 40 points a metre (feet to hat top). */
export const PERSON_PT = 47;

const INK = YARD.ink;
const L = LINE_PERSON;

function part(c: SkCanvas, p: ReturnType<typeof rrect>, color: string, line = L): void {
  c.drawPath(p, fill(color));
  c.drawPath(p, stroke(INK, line));
}

/** One carried piece, its grade's own silhouette (pieces.draw.ts) about w points long, centred in the box. */
export function carriedPiece(c: SkCanvas, metal: string, x: number, y: number, w: number, h: number, seed: number): void {
  pieceGlyph(c, metal, x + w / 2, y + h / 2, w, 0, seed + (metal === 'copper' ? 0 : 1));
}

/** How tall a carried piece of a grade sits on the stack, points (bundles stand taller than plate). */
const pieceH = (metal: string): number => (metal === 'copper' ? 7 : metal === 'brass' ? 7.5 : metal === 'cast_iron' ? 8 : 5.5);

/** The stack on the back frame: pieces bottom first, rising from y0 (points, negative up). */
function backStack(c: SkCanvas, stack: Stack, cx: number, y0: number, w: number): number {
  let y = y0;
  stack.forEach((metal, i) => {
    const h = pieceH(metal);
    const dx = (hash01(i, 7) - 0.5) * 3;
    y -= h - 0.4;
    pieceGlyph(c, metal, cx + dx, y + h / 2, w * 1.05, (hash01(i, 9) - 0.5) * 10, i * 5 + (metal === 'copper' ? 0 : 1));
  });
  return y;
}

function head(c: SkCanvas, dir: Dir, look: PersonLook, hy: number, shield: boolean): void {
  const r = 7.2;
  const side = dir === 'e';
  const skin = look.skin ?? YARD.skin;
  const skinDark = shade(skin, -0.16);
  const hairC = look.hairColour ?? '#3B2A20';
  // Face / back of the head.
  c.drawPath(oval(0, hy, r, r * 1.02), fill(dir === 'n' ? skinDark : skin));
  if (dir === 'n' || look.hair === 'tail') {
    // hair at the nape under the hat
    c.save();
    c.clipPath(oval(0, hy, r, r * 1.02), ClipOp.Intersect, true);
    if (dir === 'n') c.drawRect({ x: -r, y: hy - r, width: r * 2, height: r * 1.2 }, fill(hairC));
    c.restore();
  }
  if (look.hair === 'beard' && dir !== 'n') {
    c.save();
    c.clipPath(oval(0, hy, r, r * 1.02), ClipOp.Intersect, true);
    const bx = side ? 1.5 : 0;
    c.drawPath(builder().moveTo(-r + bx, hy + 0.5).quadTo(bx, hy + 11, r + bx, hy + 0.5).lineTo(r + bx, hy + 9).lineTo(-r + bx, hy + 9).close().build(), fill(hairC));
    c.restore();
  } else if (look.hair === 'stubble' && dir !== 'n') {
    c.save();
    c.clipPath(oval(0, hy, r, r * 1.02), ClipOp.Intersect, true);
    c.drawPath(oval(side ? 2 : 0, hy + 6, r * 0.8, 3.6), fill(hairC, 0.28));
    c.restore();
  }
  if (look.hair === 'tail' && dir !== 's') c.drawPath(rrect(side ? -r - 2.6 : -1.6, hy - 1, 3.2, 7.5, 1.6), fill(hairC));
  if (look.hair === 'fringe' && dir !== 'n') c.drawPath(rrect(-r + 1 + (side ? 2 : 0), hy - 4.6, r * 1.5, 2.6, 1.3), fill(hairC));
  c.drawPath(oval(0, hy, r, r * 1.02), stroke(INK, L));
  if (dir === 's') {
    c.drawPath(oval(-2.7, hy + 0.8, 1.05, 1.3), fill(INK));
    c.drawPath(oval(2.7, hy + 0.8, 1.05, 1.3), fill(INK));
    c.drawPath(builder().moveTo(-1.6, hy + 4).quadTo(0, hy + 5, 1.6, hy + 4).build(), stroke(INK, 1));
    c.drawPath(oval(-4.6, hy + 3, 1.4, 0.9), fill('#E58E7A', 0.55));
    c.drawPath(oval(4.6, hy + 3, 1.4, 0.9), fill('#E58E7A', 0.55));
  } else if (side) {
    c.drawPath(oval(3.6, hy + 0.6, 1.0, 1.3), fill(INK));
    c.drawPath(builder().moveTo(6.6, hy + 0.5).quadTo(8.6, hy + 2.4, 6.6, hy + 3.4).build(), fill(skin));
    c.drawPath(builder().moveTo(6.6, hy + 0.5).quadTo(8.6, hy + 2.4, 6.6, hy + 3.4).build(), stroke(INK, 1));
    c.drawPath(oval(-1.6, hy + 1, 1.6, 2), fill(skinDark));
    c.drawPath(oval(-1.6, hy + 1, 1.6, 2), stroke(INK, 0.9));
  }
  // The hard hat: a dome, a ridge, a brim (longer in front when side-on).
  const domeTop = hy - r - 4.2;
  const dome = builder()
    .moveTo(-r - 1.2, hy - 2.2)
    .cubicTo(-r - 1.2, domeTop - 1, r + 1.2, domeTop - 1, r + 1.2, hy - 2.2)
    .close()
    .build();
  part(c, dome, look.hat);
  c.drawPath(segment(-1.2, domeTop + 0.6, -1.2, hy - 3), stroke(shade(look.hat, -0.18), 1.6));
  c.drawPath(segment(-4.2, domeTop + 2.2, -4.6, hy - 3.2), stroke('#FFFFFF', 1.2, 0.8));
  const brim = side ? rrect(-r - 1, hy - 3.4, 2 * r + 5.5, 2.6, 1.3) : rrect(-r - 2.4, hy - 3.4, 2 * r + 4.8, 2.6, 1.3);
  part(c, brim, shade(look.hat, -0.06), 1.2);
  if (shield) {
    // A clear face shield hinged on the hat, tinted glass, with a highlight.
    const s = side ? poly([1.5, hy - 1.2, 10.5, hy - 1.2, 11.5, hy + 7.5, 2.5, hy + 8]) : rrect(-r - 0.8, hy - 1.4, 2 * r + 1.6, 9.6, 2);
    c.drawPath(s, fill(YARD.glass, 0.55));
    c.drawPath(s, stroke(INK, 1.1));
    c.drawPath(segment(side ? 4 : -4.8, hy + 0.6, side ? 5 : -3.4, hy + 5.6), stroke('#FFFFFF', 1.2, 0.85));
  }
}

function vest(c: SkCanvas, dir: Dir, look: PersonLook, x: number, y: number, w: number, h: number): void {
  const body = rrect(x, y, w, h, 4.2);
  part(c, body, look.vest);
  c.save();
  c.clipPath(body, ClipOp.Intersect, true);
  // Reflective bands: two around the body; braces over the shoulders (front) or a cross (back).
  const band = fill(YARD.reflect);
  const bandEdge = stroke(shade(look.vest, -0.3), 0.7);
  for (const yy of [y + h * 0.5, y + h * 0.74]) {
    c.drawRect({ x, y: yy, width: w, height: 2.3 }, band);
    c.drawRect({ x, y: yy, width: w, height: 2.3 }, bandEdge);
  }
  if (dir === 's') {
    for (const bx of [x + w * 0.24, x + w * 0.76 - 2.3]) {
      c.drawRect({ x: bx, y, width: 2.3, height: h * 0.5 }, band);
      c.drawRect({ x: bx, y, width: 2.3, height: h * 0.5 }, bandEdge);
    }
    c.drawPath(segment(x + w / 2, y + 1, x + w / 2, y + h), stroke(shade(look.vest, -0.25), 0.9));
  } else if (dir === 'n') {
    c.drawPath(segment(x + 2, y, x + w - 2, y + h * 0.5), stroke(YARD.reflect, 2.3));
    c.drawPath(segment(x + w - 2, y, x + 2, y + h * 0.5), stroke(YARD.reflect, 2.3));
  } else {
    c.drawRect({ x: x + w * 0.4, y, width: 2.3, height: h * 0.5 }, band);
  }
  c.restore();
  c.drawPath(body, stroke(INK, L));
}

function leg(c: SkCanvas, hx: number, hy: number, fx: number, fy: number, toe: number): void {
  // Trouser leg (a thick round stroke with an ink edge) and a boot.
  const p = segment(hx, hy, fx, fy - 2.5);
  c.drawPath(p, stroke(INK, 7.4));
  c.drawPath(p, stroke(YARD.navy, 5));
  const boot = rrect(fx - 3.6 + Math.min(0, toe), fy - 3.6, 7.2 + Math.abs(toe), 4, 1.8);
  part(c, boot, YARD.boot, 1.1);
}

function arm(c: SkCanvas, sx: number, sy: number, hx: number, hy: number, front = true): void {
  const p = segment(sx, sy, hx, hy);
  c.drawPath(p, stroke(INK, 6.6));
  c.drawPath(p, stroke(front ? YARD.navy : YARD.navyDark, 4.2));
  c.drawPath(oval(hx, hy, 2.9, 2.7), fill(YARD.glove));
  c.drawPath(oval(hx, hy, 2.9, 2.7), stroke(INK, 1.1));
}

/** The angle grinder held level in front (points; the disc at (dx, dy)). */
function grinder(c: SkCanvas, x: number, y: number, spark: number, sparks: boolean): void {
  part(c, rrect(x - 2, y - 2.6, 12, 5.2, 2.4), YARD.machineLight, 1.1);
  part(c, rrect(x - 4.5, y - 1.6, 4, 3.2, 1), YARD.ink, 0.8);
  part(c, poly([x + 9, y - 4.5, x + 13, y - 4.5, x + 13, y + 1, x + 9, y + 1]), YARD.hivis, 1);
  c.drawPath(oval(x + 13.8, y + 1.6, 1.4, 5.2), fill('#6D7277'));
  c.drawPath(oval(x + 13.8, y + 1.6, 1.4, 5.2), stroke(INK, 1));
  if (!sparks) return;
  // The spark fan: short light streaks thrown down and back, varied by phase (never flames).
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (0.62 + 0.36 * hash01(i, Math.floor(spark * 7)));
    const len = 6 + 10 * hash01(i, 3, Math.floor(spark * 7));
    const x0 = x + 14;
    const y0 = y + 6;
    const x1 = x0 + Math.cos(a) * len * -0.9;
    const y1 = y0 + Math.sin(a) * len;
    c.drawPath(segment(x0, y0, x1, y1), stroke(i % 3 ? YARD.spark : '#FFFFFF', 1.3));
  }
  c.drawPath(oval(x + 14, y + 6, 2.6, 2.2), fill('#FFFFFF', 0.95));
}

/**
 * A person at the anchor, in points of the view (designed at 40 points a metre and scaled to v.ppm).
 */
export function drawPerson(c: SkCanvas, v: View3q, o: PersonOptions): void {
  const look = o.look ?? BOSS;
  if (o.dir === 'w') {
    c.save();
    c.scale(-1, 1);
    drawPerson(c, v, { ...o, dir: 'e' });
    c.restore();
    return;
  }
  groundShadow(c, v, 0.3, 0.26, 0, 0, 1.1);
  c.save();
  const k = v.ppm / 40;
  c.scale(k, k);
  const dir = o.dir;
  const n = o.frames ?? 2;
  const ph = o.pose === 'walk' ? ((o.frame ?? 0) / n) * Math.PI * 2 + Math.PI / 2 : 0;
  const swing = o.pose === 'walk' ? Math.sin(ph) : 0;
  const bob = o.pose === 'walk' ? Math.abs(Math.cos(ph)) * 1.4 : 0;
  const hipY = -20 - bob;
  const torsoTop = -35 - bob;
  const hy = -42.5 - bob;
  const side = dir === 'e';
  const stack = o.pose === 'carry' ? o.stack ?? ['light_iron', 'light_iron', 'copper', 'light_iron'] : [];

  // Behind the body: the back frame's stack when facing the eye or side-on; the far arm side-on.
  if (stack.length && dir !== 'n') {
    const sx = side ? -10 : 0;
    const w = side ? 11 : 21;
    const base = side ? torsoTop + 16 : torsoTop + 2;
    // the frame's two rails, then the slabs on it
    c.drawPath(segment(sx - w / 2 + 1, base + 6, sx - w / 2 + 1, base - 4), stroke(INK, 2.2));
    c.drawPath(segment(sx + w / 2 - 1, base + 6, sx + w / 2 - 1, base - 4), stroke(INK, 2.2));
    backStack(c, stack, sx, base, w);
  }
  if (side) {
    if (o.pose === 'cut') arm(c, -1, torsoTop + 3, 9, torsoTop + 10, false);
    else if (o.pose === 'lever') arm(c, -1, torsoTop + 3, 10, torsoTop + 5, false);
    else if (o.pose === 'carry') arm(c, -1, torsoTop + 3, -6, torsoTop - 2, false);
    else arm(c, -1, torsoTop + 3, -1 - swing * 6, torsoTop + 15, false);
  }

  // Legs.
  if (side) {
    leg(c, -1.5, hipY, -1.5 - swing * 6, 0, 2.5);
    leg(c, 1.5, hipY, 1.5 + swing * 6, 0, 2.5);
  } else {
    const lift = o.pose === 'walk' ? swing * 2 : 0;
    leg(c, -4.2, hipY, -4.6, Math.min(0, -lift), 0);
    leg(c, 4.2, hipY, 4.6, Math.min(0, lift), 0);
  }

  // Torso.
  const tw = side ? 12.5 : 17;
  c.drawPath(rrect(-tw / 2 + 1, hipY - 3, tw - 2, 6, 2), fill(YARD.navy));
  vest(c, dir, look, -tw / 2, torsoTop, tw, hipY - torsoTop + 2);
  if (o.apron && dir !== 'n') {
    // the aluminised apron: a silver bib from the chest to the knees, quilted, with a bright fold
    const ax0 = side ? -1 : -tw / 2 + 1.5;
    const ax1 = side ? tw / 2 + 1.6 : tw / 2 - 1.5;
    const ap = poly([ax0 + 1.5, torsoTop + 3, ax1 - 1, torsoTop + 3, ax1 + 1, hipY + 10, ax0 - 0.5, hipY + 10]);
    c.drawPath(ap, fill(YARD.apron));
    for (const k of [0.33, 0.66]) c.drawPath(segment(ax0 + (ax1 - ax0) * k, torsoTop + 4, ax0 + (ax1 - ax0) * k + 0.4, hipY + 9), stroke(YARD.apronDark, 0.8));
    c.drawPath(segment(ax0 + 2.2, torsoTop + 5, ax0 + 2.6, hipY + 8), stroke('#FFFFFF', 1.4, 0.9));
    c.drawPath(ap, stroke(INK, L));
  }

  // Arms in front.
  if (side) {
    if (o.pose === 'cut') {
      arm(c, 1, torsoTop + 3, 9, torsoTop + 12);
      grinder(c, 9, torsoTop + 11, o.spark ?? 0, true);
    } else if (o.pose === 'carry') arm(c, 1, torsoTop + 3, -3, torsoTop - 3);
    else if (o.pose === 'lever') arm(c, 1, torsoTop + 3, 11, torsoTop + 7);
    else arm(c, 1, torsoTop + 3, 1 + swing * 6, torsoTop + 15);
  } else if (dir === 's') {
    if (o.pose === 'carry') {
      arm(c, -8.4, torsoTop + 3, -9.6, torsoTop - 4);
      arm(c, 8.4, torsoTop + 3, 9.6, torsoTop - 4);
    } else if (o.pose === 'cut') {
      arm(c, -8.4, torsoTop + 3, -3, torsoTop + 12);
      arm(c, 8.4, torsoTop + 3, 3, torsoTop + 12);
      grinder(c, -6, torsoTop + 13, o.spark ?? 0, true);
    } else {
      arm(c, -8.4, torsoTop + 3, -10.2, torsoTop + 15 + swing * 1.5);
      arm(c, 8.4, torsoTop + 3, 10.2, torsoTop + 15 - swing * 1.5);
    }
  } else {
    arm(c, -8.4, torsoTop + 3, -10.2, torsoTop + 15);
    arm(c, 8.4, torsoTop + 3, 10.2, torsoTop + 15);
  }

  head(c, dir, look, hy, o.pose === 'cut' || !!o.shield);
  if (o.apron && dir === 's') {
    // aluminised gauntlets
    for (const hx of [-10.2, 10.2]) c.drawPath(oval(hx, torsoTop + 15, 3.1, 3), fill(YARD.apron));
  }

  // From behind, the stack covers the back.
  if (stack.length && dir === 'n') backStack(c, stack, 0, torsoTop + 14, 16);
  c.restore();
}
