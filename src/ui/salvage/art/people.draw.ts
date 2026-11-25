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
import { LINE_PERSON, METAL, YARD, shade } from './palette';
import { builder, fill, glint, groundShadow, hash01, oval, poly, rrect, segment, stroke, ticks, type View3q } from './pen';

export type Dir = 's' | 'e' | 'n' | 'w';
export type Pose = 'stand' | 'walk' | 'cut' | 'carry';

export interface PersonLook {
  vest: string;
  hat: string;
  /** The boss wears the trim of the vest in silver; crews too (one rule), but the boss's hat is white. */
}

export const BOSS: PersonLook = { vest: YARD.hivis, hat: YARD.hatWhite };
export const crewLook = (vest: string): PersonLook => ({ vest, hat: YARD.hivis });

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
}

/** The design height of a person in points at 40 points a metre (feet to hat top). */
export const PERSON_PT = 47;

const INK = YARD.ink;
const L = LINE_PERSON;

function part(c: SkCanvas, p: ReturnType<typeof rrect>, color: string, line = L): void {
  c.drawPath(p, fill(color));
  c.drawPath(p, stroke(INK, line));
}

/** One carried piece, a slab w x h points with its metal's look and mark. */
export function carriedPiece(c: SkCanvas, metal: string, x: number, y: number, w: number, h: number, seed: number): void {
  const m = METAL[metal] ?? METAL.light_iron;
  const topH = h * 0.38;
  part(c, rrect(x, y + topH, w, h - topH, 1.2), m.base, 1.1);
  part(c, poly([x + 1.5, y, x + w + 1.5, y, x + w, y + topH, x, y + topH]), m.light, 1.1);
  if (m.sheen === 'ticks') ticks(c, x + w * 0.3, y + topH + (h - topH) * 0.5, Math.min(5, h * 0.7));
  else if (m.sheen === 'glint') glint(c, x + w * 0.75, y + topH * 0.6, 2.6);
  else if (m.sheen === 'freckles') {
    c.drawCircle(x + w * (0.25 + hash01(seed, 1) * 0.5), y + topH + 2, 0.9, fill(YARD.rust));
    c.drawCircle(x + w * (0.2 + hash01(seed, 2) * 0.6), y + h - 2, 0.8, fill(YARD.rust));
  } else if (m.sheen === 'dots') for (let i = 0; i < 3; i++) c.drawCircle(x + 3 + i * (w - 6) / 2, y + topH + (h - topH) / 2, 0.7, fill(m.light));
  else if (m.sheen === 'stripe') c.drawPath(segment(x + 2, y + topH + 1.6, x + w - 2, y + topH + 1.6), stroke(m.light, 1));
}

/** The stack on the back frame: slabs bottom first, rising from y0 (points, negative up). */
function backStack(c: SkCanvas, stack: Stack, cx: number, y0: number, w: number): number {
  let y = y0;
  stack.forEach((metal, i) => {
    const h = metal === 'copper' ? 5.2 : 6;
    const dx = (hash01(i, 7) - 0.5) * 3;
    y -= h - 0.6;
    carriedPiece(c, metal, cx - w / 2 + dx, y, w, h, i);
  });
  return y;
}

function head(c: SkCanvas, dir: Dir, look: PersonLook, hy: number, shield: boolean): void {
  const r = 7.2;
  const side = dir === 'e';
  // Face / back of the head.
  c.drawPath(oval(0, hy, r, r * 1.02), fill(dir === 'n' ? YARD.skinDark : YARD.skin));
  c.drawPath(oval(0, hy, r, r * 1.02), stroke(INK, L));
  if (dir === 's') {
    c.drawPath(oval(-2.7, hy + 0.8, 1.05, 1.3), fill(INK));
    c.drawPath(oval(2.7, hy + 0.8, 1.05, 1.3), fill(INK));
    c.drawPath(builder().moveTo(-1.6, hy + 4).quadTo(0, hy + 5, 1.6, hy + 4).build(), stroke(INK, 1));
    c.drawPath(oval(-4.6, hy + 3, 1.4, 0.9), fill('#E58E7A', 0.55));
    c.drawPath(oval(4.6, hy + 3, 1.4, 0.9), fill('#E58E7A', 0.55));
  } else if (side) {
    c.drawPath(oval(3.6, hy + 0.6, 1.0, 1.3), fill(INK));
    c.drawPath(builder().moveTo(6.6, hy + 0.5).quadTo(8.6, hy + 2.4, 6.6, hy + 3.4).build(), fill(YARD.skin));
    c.drawPath(builder().moveTo(6.6, hy + 0.5).quadTo(8.6, hy + 2.4, 6.6, hy + 3.4).build(), stroke(INK, 1));
    c.drawPath(oval(-1.6, hy + 1, 1.6, 2), fill(YARD.skinDark));
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
  groundShadow(c, v, 0.3, 0.26);
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

  // Arms in front.
  if (side) {
    if (o.pose === 'cut') {
      arm(c, 1, torsoTop + 3, 9, torsoTop + 12);
      grinder(c, 9, torsoTop + 11, o.spark ?? 0, true);
    } else if (o.pose === 'carry') arm(c, 1, torsoTop + 3, -3, torsoTop - 3);
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

  // From behind, the stack covers the back.
  if (stack.length && dir === 'n') backStack(c, stack, 0, torsoTop + 14, 16);
  c.restore();
}
