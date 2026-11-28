/**
 * The works' moving people and things that are not the yard's (stage 2, ART-PEOPLE; s2c-plan-world.md 1.4), drawn with the
 * first yard's pen (people.draw.ts: 40 points a metre, about four heads tall, ink lines LINE_PERSON, the light from the
 * same low sun; no shadow inside a sprite, the world's sheet S draws it):
 *
 * - THE YARD SALE'S VISITORS: members of the public, only inside the railed public bay. A civilian body: bare head with
 *   short hair, a zipped jacket, jeans, trainers. NEVER a vest, never a hard hat (yard-style: hi-vis is the yard's own).
 *   The jacket is baked near white (VISITOR_BASE, the entry's tint key) and the world modulates the whole sprite by one of
 *   four pale VISITOR_TINTS (pale on purpose: a tint multiplies the skin too, so a strong one would colour the face).
 *   Poses: walk (4), stand, pay (the card or phone held to the reader), push (4, hands on a sack truck's grip at
 *   people.draw GRIP, for the first yard's carrier.sack at CARRIER_AHEAD), carry (4, a boxed buy held in both arms: one
 *   sprite, the box baked in, so nothing can be drawn in the wrong order). Five headings (0 s, 1 se, 2 e, 3 ne, 4 n;
 *   west mirrored) from ONE body turned by its facing angle, so a heading change never jumps in size or anchor.
 * - THE RECLAMATION DEALER'S TWO PEOPLE: the same body tinted DEALER_TINT (the dealer's van's colour), pushing a sack truck.
 * - THE DEALER'S VAN: the first yard's panel van (vehicles.draw drawVan, tinted DEALER_TINT by the world) with its rear
 *   doors shut or swung open and the dark load space showing.
 * - THE PLASMA UNIT on its two-wheeled trolley: at the tool rack once owned (works.plasma.rack) and beside the boss while
 *   he cuts (person.boss.plasma, whose body is people.draw.ts with `tool: 'plasma'`).
 *
 * Anchor: the centre of the feet (people), the footprint's centre (the van, the rack unit). Pure Skia drawing; nothing
 * here reads the rules or the content.
 */
import { ClipOp, type SkCanvas } from '@shopify/react-native-skia';
import { LINE_PERSON, YARD, shade } from './palette';
import { boxShadow, builder, box, circle, faceFill, facePath, facing, fill, oval, proj, rrect, segment, stroke, subQuad, type V3, type View3q } from './pen';
import { BOSS, GRIP, SKINS, drawPerson, type Dir } from './people.draw';
import { VAN, drawVan, headingRad } from './vehicles.draw';

const INK = YARD.ink;
const L = LINE_PERSON;

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

/** The near white the visitor's jacket (and the dealer's van) is baked in: the entry's tint key. */
export const VISITOR_BASE = '#F1F2EE';
/**
 * The four tints the world modulates a visitor by (frameLoop multiplies the WHOLE sprite): a pale sky, a pale coral, a
 * pale sage, a pale straw. Each keeps every channel at 0.78 or more, so the face stays a face.
 */
export const VISITOR_TINTS = ['#C8D9F2', '#F6CDBE', '#CFE3C3', '#F4E2AE'] as const;
/** The reclamation dealer's colour (its van and its two people's coats): a pale teal, apart from the four visitors'. */
export const DEALER_TINT = '#A9D2CB';
/** The visitor's index into VISITOR_TINTS (a stable pick from any integer id). */
export const visitorTintOf = (id: number): string => VISITOR_TINTS[((Math.floor(id) % 4) + 4) % 4];

const SKIN = SKINS[2];
const HAIR = '#3B2A20';
const JEANS = '#46536A';
const JEANS_DARK = '#343F52';
const SHOE = '#34363B';
const SOLE = '#E9E9E4';
const BOX = '#C49A62';
const BOX_DARK = '#A27C49';

// ---------------------------------------------------------------------------
// Frames
// ---------------------------------------------------------------------------

export type VisitorPose = 'walk' | 'stand' | 'pay' | 'push' | 'carry';
/** The visitor entry's frames, in order (C-ART's six first; push and carry appended by ART-PEOPLE). */
export const VISITOR_FRAMES = ['walk1', 'walk2', 'walk3', 'walk4', 'stand', 'pay', 'push1', 'push2', 'push3', 'push4', 'carry1', 'carry2', 'carry3', 'carry4'] as const;
/** The first frame of each pose in VISITOR_FRAMES (the world adds the step 0..3 for walk, push and carry). */
export const VISITOR_FRAME0: Readonly<Record<VisitorPose, number>> = { walk: 0, stand: 4, pay: 5, push: 6, carry: 10 };

/** A frame index of VISITOR_FRAMES as its pose and step. */
export function visitorPoseOf(frame: number): { pose: VisitorPose; step: number } {
  if (frame < 4) return { pose: 'walk', step: frame };
  if (frame === 4) return { pose: 'stand', step: 0 };
  if (frame === 5) return { pose: 'pay', step: 0 };
  if (frame < 10) return { pose: 'push', step: frame - 6 };
  return { pose: 'carry', step: Math.min(3, frame - 10) };
}

// ---------------------------------------------------------------------------
// The civilian body, turned by its facing angle
// ---------------------------------------------------------------------------

function part(c: SkCanvas, p: ReturnType<typeof rrect>, color: string, line = L): void {
  c.drawPath(p, fill(color));
  c.drawPath(p, stroke(INK, line));
}

function leg(c: SkCanvas, hx: number, hy: number, fx: number, fy: number, toe: number, near: boolean): void {
  const kx = (hx + fx) / 2 + toe * 0.15;
  const ky = (hy + fy) / 2;
  const p = builder().moveTo(hx, hy).lineTo(kx, ky).lineTo(fx, fy - 2.5).build();
  c.drawPath(p, stroke(INK, 7.2));
  c.drawPath(p, stroke(near ? JEANS : JEANS_DARK, 4.8));
  // a trainer: dark upper, a white sole
  const w = 6.6 + Math.abs(toe);
  const x0 = fx - 3.3 + Math.min(0, toe);
  c.drawPath(rrect(x0, fy - 1.6, w, 1.8, 0.8), fill(SOLE));
  part(c, rrect(x0, fy - 4, w, 3, 1.4), SHOE, 1.1);
  c.drawPath(rrect(x0 - 0.2, fy - 1.4, w + 0.4, 1.6, 0.8), stroke(INK, 0.9));
}

function arm(c: SkCanvas, sx: number, sy: number, hx: number, hy: number, near: boolean): void {
  const p = segment(sx, sy, hx, hy);
  c.drawPath(p, stroke(INK, 6.4));
  c.drawPath(p, stroke(near ? VISITOR_BASE : shade(VISITOR_BASE, -0.12), 4));
  // the bare hand
  c.drawPath(oval(hx, hy, 2.5, 2.4), fill(SKIN));
  c.drawPath(oval(hx, hy, 2.5, 2.4), stroke(INK, 1));
}

/** A cardboard box with a tape strip, w x h points, centred at (x, y), its top seen when `top`. */
function parcel(c: SkCanvas, x: number, y: number, w: number, h: number, top: boolean): void {
  if (top) {
    const tp = builder().moveTo(x - w / 2, y - h / 2).lineTo(x - w / 2 + 2, y - h / 2 - 3).lineTo(x + w / 2 + 2, y - h / 2 - 3).lineTo(x + w / 2, y - h / 2).close().build();
    c.drawPath(tp, fill(shade(BOX, 0.12)));
    c.drawPath(tp, stroke(INK, 1));
  }
  part(c, rrect(x - w / 2, y - h / 2, w, h, 0.8), BOX, 1.1);
  c.drawRect({ x: x - 1, y: y - h / 2 + 0.6, width: 2, height: h - 1.2 }, fill(shade(BOX, 0.3)));
  c.drawPath(segment(x - w / 2 + 1, y + h / 2 - 1.6, x + w / 2 - 1, y + h / 2 - 1.6), stroke(BOX_DARK, 0.8));
}

/** A phone held to the card reader (or a bank card: the same small dark slab) at the hand. */
function phone(c: SkCanvas, x: number, y: number): void {
  part(c, rrect(x - 1.5, y - 4.4, 3, 4.6, 0.8), YARD.ledCase, 0.9);
  c.drawRect({ x: x - 0.9, y: y - 3.8, width: 1.8, height: 2.6 }, fill(YARD.glass, 0.9));
}

/**
 * One visitor (or one of the dealer's people) at the anchor: heading 0 s, 1 se, 2 e, 3 ne, 4 n (5..7 drawn as 3..1
 * mirrored), in a pose and step. Points of the view (designed at 40 a metre, scaled to v.ppm). No shadow (the world's).
 */
export function drawVisitor(c: SkCanvas, v: View3q, heading: number, pose: VisitorPose, step = 0): void {
  const h = ((Math.round(heading) % 8) + 8) % 8;
  if (h > 4) {
    c.save();
    c.scale(-1, 1);
    drawVisitor(c, v, 8 - h, pose, step);
    c.restore();
    return;
  }
  const k = v.ppm / 40;
  c.save();
  c.scale(k, k);
  const th = (h * Math.PI) / 4;
  const C = Math.cos(th); // +1 facing the eye, -1 facing away
  const Sn = Math.sin(th); // +1 side-on to the east
  const aC = Math.abs(C);
  const stepping = pose === 'walk' || pose === 'push' || pose === 'carry';
  const ph = stepping ? (step / 4) * Math.PI * 2 + Math.PI / 2 : 0;
  const swing = stepping ? Math.sin(ph) : 0;
  const bob = stepping ? Math.abs(Math.cos(ph)) * 1.4 : 0;
  const lean = pose === 'push' ? 2 : 0;
  const hipY = -20 - bob;
  const T = -35 - bob;
  const hy = -42.5 - bob;
  const uX = lean * Sn;
  const tw = 12.5 + 4.5 * aC;

  // ---- what is where: the person's right side lies at screen (-C, depth +Sn); forward at (Sn, depth C)
  const fwd = (d: number): [number, number] => [Sn * d, C * d * 0.3];

  // the hands (shoulder, hand, depth) for the pose
  const shW = 8;
  const shoulders = [
    { x: -C * shW + Sn * 0.6, depth: Sn * shW, sign: 1 }, // right
    { x: C * shW - Sn * 0.6, depth: -Sn * shW, sign: -1 }, // left
  ];
  const sy = T + 3;
  type Hand = { sx: number; sy: number; hx: number; hy: number; depth: number };
  const hands: Hand[] = shoulders.map((s) => {
    const sx = s.x + uX;
    let hx: number;
    let hyy: number;
    if (pose === 'push') {
      const [ax, ay] = [Sn * GRIP.ahead * 40, T + 9.5 + C * GRIP.ahead * 40 * 0.62];
      hx = ax + uX - C * 3.6 * s.sign;
      hyy = ay;
    } else if (pose === 'carry') {
      hx = s.x * 0.62 + Sn * 6.5 + uX;
      hyy = T + 11 + C * 3;
    } else if (pose === 'pay' && s.sign === 1) {
      const [fx, fy] = fwd(11);
      hx = fx - C * 2 + uX;
      hyy = T + 5 + fy + C * 3;
    } else {
      const d = (pose === 'walk' ? swing * 6 : 0) * s.sign;
      const [fx, fy] = fwd(d);
      hx = s.x - C * s.sign * 1.8 + fx;
      hyy = T + 15 + fy;
    }
    return { sx, sy, hx, hy: hyy, depth: s.depth };
  });
  const behind = (hd: Hand) => hd.depth < -2 || (C < -0.3 && (pose === 'push' || pose === 'carry' || pose === 'pay'));

  // the legs (right then left), farther first
  const legs = [1, -1].map((sign) => {
    const hx = -C * 4.2 * sign;
    const hd = Sn * 4.2 * sign;
    const d = stepping ? swing * 6 * sign : 0;
    const fx = hx + Sn * d;
    const depth = hd + C * d;
    const fy = Math.min(0, -Math.abs(d / 6) * 2 * aC * (d * C < 0 ? 1 : 0)) + depth * 0.18;
    return { hx, fx, fy, depth, toe: Sn * 2.4 };
  });
  legs.sort((a, b) => a.depth - b.depth);

  // a parcel held in front: behind the body when facing away
  const carryAt = (): [number, number] => [Sn * 8 + uX, T + 10 + C * 4];
  if (pose === 'carry' && C < -0.3) {
    const [bx, by] = carryAt();
    parcel(c, bx, by - 2, 11, 8, false);
  }
  for (const hd of hands) if (behind(hd)) arm(c, hd.sx, hd.sy, hd.hx, hd.hy, false);
  legs.forEach((lg, i) => leg(c, lg.hx, hipY, lg.fx, lg.fy, lg.toe, i === 1));

  // ---- the jacket -------------------------------------------------------------
  c.save();
  if (lean) c.translate(uX * 0.6, 0);
  const jx = -tw / 2;
  const jh = hipY - T + 4.5;
  const body = rrect(jx, T, tw, jh, 4.4);
  c.drawPath(body, fill(VISITOR_BASE));
  c.save();
  c.clipPath(body, ClipOp.Intersect, true);
  // the side away from the low sun in shade, and the hem band
  const shadeX = C >= 0 ? (Sn > 0.1 ? jx : jx + tw * 0.78) : Sn > 0.1 ? jx + tw * 0.7 : jx;
  c.drawRect({ x: shadeX, y: T, width: tw * 0.24, height: jh }, fill(shade(VISITOR_BASE, -0.1)));
  c.drawRect({ x: jx, y: T + jh - 3, width: tw, height: 3 }, fill(shade(VISITOR_BASE, -0.16)));
  const mid = Sn * tw * 0.3 * (C >= 0 ? 1 : -1);
  if (C > 0.2) {
    // the zip, the collar, two pocket flaps
    c.drawPath(segment(mid, T + 1, mid, T + jh - 3), stroke(INK, 0.9));
    c.drawPath(builder().moveTo(mid - 4, T).lineTo(mid, T + 4).lineTo(mid + 4, T).build(), stroke(INK, 1));
    for (const px of [-1, 1]) {
      const x = mid + px * tw * 0.26 * aC;
      if (Math.abs(x) < tw / 2 - 1.5) c.drawPath(segment(x - 2, T + jh - 8, x + 2, T + jh - 9), stroke(INK, 0.9));
    }
  } else if (C < -0.2) {
    // the hood lying on the back, and the back's seam
    const hd = oval(mid, T + 2.2, 5.2, 3.4);
    c.drawPath(hd, fill(shade(VISITOR_BASE, -0.06)));
    c.drawPath(hd, stroke(INK, 1));
    c.drawPath(segment(mid, T + 6, mid, T + jh - 3), stroke(shade(VISITOR_BASE, -0.2), 0.8));
  } else {
    // side-on: the pocket and the hood's edge at the back of the neck
    c.drawPath(segment(1, T + jh - 9, 4, T + jh - 8), stroke(INK, 0.9));
    c.drawPath(oval(-tw / 2 + 2, T + 2, 3, 3), stroke(INK, 0.9));
  }
  c.restore();
  c.drawPath(body, stroke(INK, L));
  c.restore();

  // ---- arms in front, the things held ----------------------------------------
  const front = hands.filter((hd) => !behind(hd)).sort((a, b) => a.depth - b.depth);
  if (pose === 'carry' && C >= -0.3) {
    // the far arm, the parcel, the near arm (side-on); both arms then the parcel's front face over the hands (front)
    const [bx, by] = carryAt();
    if (aC < 0.8 && front.length > 1) {
      arm(c, front[0].sx, front[0].sy, front[0].hx, front[0].hy, false);
      parcel(c, bx, by, 11, 8, true);
      arm(c, front[1].sx, front[1].sy, front[1].hx, front[1].hy, true);
    } else {
      for (const hd of front) arm(c, hd.sx, hd.sy, hd.hx, hd.hy, true);
      parcel(c, bx, by + 1.5, 11, 8, true);
    }
  } else {
    for (const hd of front) arm(c, hd.sx, hd.sy, hd.hx, hd.hy, hd.depth >= -0.5);
  }
  if (pose === 'pay') {
    const r = hands[0];
    if (!behind(r)) phone(c, r.hx + Sn * 1.2, r.hy - 0.5);
  }

  // ---- the head: bare, short hair --------------------------------------------
  head(c, uX + Sn * 0.6, hy, C, Sn);
  c.restore();
}

function head(c: SkCanvas, hx: number, hy: number, C: number, Sn: number): void {
  const r = 7.2;
  const skull = oval(hx, hy, r, r * 1.02);
  c.drawPath(skull, fill(SKIN));
  c.save();
  c.clipPath(skull, ClipOp.Intersect, true);
  // the hair: the back and the crown; the face uncovered where it turns to the eye
  c.drawRect({ x: hx - r, y: hy - r - 1, width: 2 * r, height: r * 1.42 }, fill(HAIR));
  if (C > -0.75) {
    const fcx = hx + Sn * r * (C >= 0 ? 0.45 : 0.85);
    const rx = r * (C >= 0 ? 0.62 + 0.36 * C : Math.max(0.12, 0.62 + 0.62 * C));
    c.drawPath(oval(fcx, hy + 2.4, rx, r * 0.74), fill(SKIN));
  }
  c.drawRect({ x: hx - r, y: hy + r * 0.62, width: 2 * r, height: r }, fill(SKIN));
  c.restore();
  // an ear where the head is turned
  if (Math.abs(C) < 0.85) {
    const ex = hx - C * r * 0.72 - Sn * 1.4;
    c.drawPath(oval(ex, hy + 1.2, 1.5, 1.9), fill(shade(SKIN, -0.16)));
    c.drawPath(oval(ex, hy + 1.2, 1.5, 1.9), stroke(INK, 0.9));
  }
  c.drawPath(skull, stroke(INK, L));
  if (C <= -0.3) return;
  const fc = hx + Sn * 3.8;
  if (C > 0.45) {
    for (const s of [-1, 1]) c.drawPath(oval(fc + s * 2.7 * C, hy + 1.2, 1.0, 1.25), fill(INK));
    c.drawPath(builder().moveTo(fc - 1.5, hy + 4.4).quadTo(fc, hy + 5.4, fc + 1.5, hy + 4.4).build(), stroke(INK, 1));
    for (const s of [-1, 1]) c.drawPath(oval(fc + s * 4.4 * C, hy + 3.4, 1.3, 0.85), fill('#E58E7A', 0.5));
  } else {
    c.drawPath(oval(hx + Sn * 3.8, hy + 1.0, 1.0, 1.3), fill(INK));
  }
  if (Sn > 0.3) {
    // the nose's profile at the turned edge
    const nx = hx + r * Sn - 0.6;
    const nose = builder().moveTo(nx, hy + 0.8).quadTo(nx + 2, hy + 2.7, nx, hy + 3.7).build();
    c.drawPath(nose, fill(SKIN));
    c.drawPath(nose, stroke(INK, 1));
  }
}

// ---------------------------------------------------------------------------
// The dealer's van with its rear doors
// ---------------------------------------------------------------------------

/** The van's rear: where its load box ends (vehicles.draw drawVan's box: 2.4 m long, centred 0.45 m behind the anchor). */
const VAN_REAR_U = -0.45 - 1.2;
const DOOR_W = VAN.wid / 2 - 0.04;
const DOOR_OPEN = (100 * Math.PI) / 180;

/**
 * The reclamation dealer's van at a heading (radians), its body baked in VISITOR_BASE for the world's DEALER_TINT; `open`:
 * the two rear doors swung out on their hinges and the dark load space showing (a driver in the cab only while shut).
 */
export function drawDealerVan(c: SkCanvas, v: View3q, heading: number, open: boolean): void {
  if (!open) {
    drawVan(c, v, heading, { body: VISITOR_BASE });
    return;
  }
  const fx = Math.cos(heading);
  const fy = Math.sin(heading);
  const at = (u: number, s: number, z: number): V3 => [fx * u - fy * s, fy * u + fx * s, z];
  const doors = [1, -1].map((sg) => {
    const hinge: [number, number] = [VAN_REAR_U, sg * (VAN.wid / 2 - 0.02)];
    const du = -Math.sin(DOOR_OPEN);
    const ds = sg * -Math.cos(DOOR_OPEN);
    const end: [number, number] = [hinge[0] + du * DOOR_W, hinge[1] + ds * DOOR_W];
    const q: V3[] = [at(hinge[0], hinge[1], 0.46), at(end[0], end[1], 0.46), at(end[0], end[1], 1.8), at(hinge[0], hinge[1], 1.8)];
    const cy = (q[0][1] + q[1][1]) / 2;
    return { q, cy };
  });
  const door = (q: V3[]) => {
    const p = facePath(v, q);
    c.drawPath(p, fill(shade(VISITOR_BASE, -0.08)));
    faceFill(c, v, subQuad(q, 0.15, 0.85, 0.55, 0.86), YARD.glassDark, 0.8);
    faceFill(c, v, subQuad(q, 0.05, 0.95, 0.12, 0.2), YARD.reflect, 0, 0.8);
    c.drawPath(p, stroke(INK, 1.2));
  };
  for (const d of doors) if (d.cy <= 0) door(d.q);
  drawVan(c, v, heading, { body: VISITOR_BASE, driver: false });
  // the open back: the load space, dark, its floor and a stacked batch inside
  const back: V3[] = [at(VAN_REAR_U, VAN.wid / 2, 0.4), at(VAN_REAR_U, -VAN.wid / 2, 0.4), at(VAN_REAR_U, -VAN.wid / 2, 1.85), at(VAN_REAR_U, VAN.wid / 2, 1.85)];
  if (facing(v, [-fx, -fy, 0]) > 0.02) {
    faceFill(c, v, subQuad(back, 0.05, 0.95, 0.06, 0.94), '#2F3337', 1);
    faceFill(c, v, subQuad(back, 0.05, 0.95, 0.06, 0.2), '#4A4F55');
    faceFill(c, v, subQuad(back, 0.18, 0.5, 0.2, 0.46), BOX, 0.8);
    faceFill(c, v, subQuad(back, 0.55, 0.8, 0.2, 0.38), shade(BOX, -0.12), 0.8);
  }
  for (const d of doors) if (d.cy > 0) door(d.q);
}

// ---------------------------------------------------------------------------
// The plasma unit on its trolley
// ---------------------------------------------------------------------------

/**
 * The plasma cutter's power unit on its two-wheeled trolley, standing with its handle up, its long side east-west, its
 * footprint centred at (ox, oy) metres: a grey case with a dark control panel and a lit lamp, a hi-vis carrying handle, the
 * torch lead coiled on its hook (`coiled`) or running off to the boss, the earth clamp hung on the side.
 */
export function drawPlasmaUnit(c: SkCanvas, v: View3q, ox: number, oy: number, coiled: boolean): void {
  const P = (x: number, y: number, z: number) => proj(v, ox + x, oy + y, z);
  // the trolley: a base plate on two wheels at the west end, a handle rising behind (west)
  const wheel = (s: number) => {
    const [wx, wy] = P(-0.2, s, 0.1);
    c.drawPath(oval(wx, wy, 4, 2.9), fill(YARD.tyre));
    c.drawPath(oval(wx, wy, 4, 2.9), stroke(INK, 1));
    c.drawPath(oval(wx, wy, 1.4, 1), fill(YARD.galvanised));
  };
  wheel(-0.19);
  box(c, v, { len: 0.56, wid: 0.34, h: 0.04, ox, oy, z: 0.1, color: YARD.steelDark, line: 1 });
  const [h0x, h0y] = P(-0.27, -0.12, 0.14);
  const [h1x, h1y] = P(-0.3, -0.12, 0.92);
  const [h2x, h2y] = P(-0.27, 0.12, 0.14);
  const [h3x, h3y] = P(-0.3, 0.12, 0.92);
  for (const [a, b, cc, d] of [[h0x, h0y, h1x, h1y], [h2x, h2y, h3x, h3y]] as const) {
    c.drawPath(segment(a, b, cc, d), stroke(INK, 3));
    c.drawPath(segment(a, b, cc, d), stroke(YARD.steel, 1.6));
  }
  c.drawPath(segment(h1x, h1y, h3x, h3y), stroke(INK, 3.4));
  c.drawPath(segment(h1x, h1y, h3x, h3y), stroke(YARD.pvc, 2));
  // the case
  box(c, v, {
    len: 0.46,
    wid: 0.28,
    h: 0.36,
    ox: ox + 0.02,
    oy,
    z: 0.14,
    color: YARD.machineLight,
    bevel: true,
    onFace: (q, n) => {
      if (n[1] > 0.9) {
        faceFill(c, v, subQuad(q, 0.1, 0.62, 0.3, 0.86), YARD.ledCase, 0.8);
        faceFill(c, v, subQuad(q, 0.16, 0.3, 0.62, 0.78), YARD.led, 0);
        faceFill(c, v, subQuad(q, 0.7, 0.9, 0.2, 0.4), YARD.hivis, 0.8);
      }
    },
  });
  wheel(0.19);
  const [t0x, t0y] = P(-0.1, 0, 0.5);
  const [t1x, t1y] = P(0.14, 0, 0.5);
  const handle = builder().moveTo(t0x, t0y).lineTo(t0x + 1, t0y - 3.5).lineTo(t1x - 1, t1y - 3.5).lineTo(t1x, t1y).build();
  c.drawPath(handle, stroke(INK, 3.2));
  c.drawPath(handle, stroke(YARD.hivis, 1.8));
  // the earth clamp on the east end, its cable looped
  const [ex, ey] = P(0.26, 0.04, 0.34);
  c.drawPath(segment(ex, ey, ex + 2, ey + 4), stroke(INK, 2.6));
  c.drawPath(segment(ex, ey, ex + 2, ey + 4), stroke(YARD.copper, 1.4));
  // the torch lead
  const [lx, ly] = P(-0.04, 0.15, 0.3);
  if (coiled) {
    for (let i = 0; i < 3; i++) {
      c.drawPath(oval(lx + i * 0.6, ly - 1 + i * 0.5, 5.4 - i * 0.3, 3.6), stroke(INK, 2.8));
      c.drawPath(oval(lx + i * 0.6, ly - 1 + i * 0.5, 5.4 - i * 0.3, 3.6), stroke(i === 1 ? YARD.pvcGrey : YARD.pvc, 1.4));
    }
    // the torch hung on the handle
    c.drawPath(segment(h1x + 1, h1y + 2, h1x + 3, h1y + 9), stroke(INK, 3.6));
    c.drawPath(segment(h1x + 1, h1y + 2, h1x + 3, h1y + 9), stroke(YARD.machineDark, 2.2));
    c.drawPath(circle(h1x + 3.2, h1y + 10, 1.3), fill(YARD.copperLight));
  } else {
    const [gx, gy] = P(-0.04, 0.17, 0.02);
    const lead = builder().moveTo(lx, ly).quadTo(lx - 1, ly + 4, gx, gy).build();
    c.drawPath(lead, stroke(INK, 3.2));
    c.drawPath(lead, stroke(YARD.pvc, 1.8));
  }
}

/** The plasma unit at the tool rack (the fixture works.plasma.rack): its own small shadow, lead coiled, torch hung up. */
export function drawPlasmaRack(c: SkCanvas, v: View3q): void {
  boxShadow(c, v, 0.56, 0.34, 0, 0, 0.5);
  drawPlasmaUnit(c, v, 0, 0, true);
}

// ---------------------------------------------------------------------------
// The boss's two works poses (people.draw.ts with the additive `tool`)
// ---------------------------------------------------------------------------

/** Where the unit stands beside the boss (metres from his feet), by his direction: beside him and a step back (north). */
const UNIT_AT: Readonly<Record<'s' | 'e' | 'n', [number, number]>> = { s: [0.62, -0.32], e: [-0.62, -0.3], n: [0.6, -0.12] };
/** Where the torch's lead reaches the ground (people.draw plasmaTorch's hoseX, points), by direction. */
const LEAD_GROUND: Readonly<Record<'s' | 'e' | 'n', number>> = { s: 9, e: -9, n: 6 };

/**
 * The boss cutting with the plasma (pose 'torch' with tool 'plasma', 2 frames) facing s, e or n, the unit on its trolley
 * beside him and its lead on the ground to his hand. One sprite: the unit stands behind his feet's line, so it is drawn
 * first and he is drawn over it at every heading.
 */
export function drawBossPlasma(c: SkCanvas, v: View3q, dir: 's' | 'e' | 'n', frame: number): void {
  const [ux, uy] = UNIT_AT[dir];
  drawPlasmaUnit(c, v, ux, uy, false);
  const k = v.ppm / 40;
  const [gx, gy] = proj(v, ux - 0.04, uy + 0.17, 0.02);
  const lead = builder().moveTo(gx, gy).quadTo((gx + LEAD_GROUND[dir] * k) / 2, gy + 3 * k, LEAD_GROUND[dir] * k, -0.6 * k).build();
  c.drawPath(lead, stroke(INK, 3.2 * k));
  c.drawPath(lead, stroke(YARD.pvc, 1.8 * k));
  if (dir === 'n') {
    // from behind the torch is out of sight: its lead runs up to his hands
    const up = builder().moveTo(LEAD_GROUND.n * k, -0.6 * k).quadTo(7 * k, -10 * k, 5 * k, -26 * k).build();
    c.drawPath(up, stroke(INK, 3.2 * k));
    c.drawPath(up, stroke(YARD.pvc, 1.8 * k));
  }
  drawPerson(c, v, { dir: dir as Dir, pose: 'torch', frame, look: BOSS, shadow: false, tool: 'plasma' });
}

/** The boss holding the analyser to the sample at the scale house's window (pose 'stand' with tool 'analyser'). */
export function drawBossAnalyse(c: SkCanvas, v: View3q, dir: 's' | 'e' | 'n'): void {
  drawPerson(c, v, { dir: dir as Dir, pose: 'stand', look: BOSS, shadow: false, tool: 'analyser' });
}

/** headingRad re-exported for the manifest (the dealer's van's 4 headings in the 8-scheme). */
export const vanHeadingRad = (h4: number): number => headingRad(h4 * 2);
