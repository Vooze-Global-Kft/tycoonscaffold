/**
 * People of the yard (yard-style.md 6, yard-stage1.md 6.1, STAGE1-RULING S8 and S11): the boss in a
 * hi-vis yellow vest and a white hard hat, the crew in their role's vest and a yellow hat; everyone in
 * navy work trousers, tan rigger gloves and boots, every time. About four heads tall at the ground work's
 * 40 points a metre. Anchor: the centre of the feet on the ground. Directions: 's' (towards the eye),
 * 'e', 'n', 'w' ('w' is 'e' mirrored).
 *
 * Poses: stand; walk (4 frames); push (4 frames, hands on a carrier's grip: the sack truck or the flat
 * trolley is its own drawing in vehicles.draw.ts at the same anchor); feed (2: a cable bundle into a
 * hopper); pour (at the crucible's tilt wheel in face shield, aluminised apron and gauntlets); and the
 * work of each tool tier (yard-stage1.md 2.4): spanner (2), sledge (2: raised, struck), grinder (2: the
 * spark fan varies), torch (2: oxy-propane, dark visor). Eye protection at all tool work: safety glasses
 * with the spanner and the sledge, a clear face shield at the grinder and the pour, a dark visor at the
 * torch. 'cut' (the grinder) and 'lever' (the tilt wheel) are the kit's older names, kept.
 *
 * Carrying (S8): nobody bears more than a hand load of at most 30 kg, on a carry frame (a pack frame on
 * the back, its pieces strapped on, never above the shoulders' line by more than a hand). drawHandLoad
 * draws the frame and its load by family; drawPerson draws it too when given `load` (or the older
 * `stack`, of which it takes the first three pieces).
 *
 * Shadows: drawPerson draws the person's ground shadow unless `shadow: false` (the atlas's sprites carry
 * none, so a mirrored sprite never throws its shadow west; the world draws drawActorShadow under them).
 */
import { BlendMode, ClipOp, Skia, type SkCanvas } from '@shopify/react-native-skia';
import { LINE_PERSON, YARD, shade } from './palette';
import { builder, circle, fill, groundShadow, hash01, oval, poly, rrect, segment, stroke, type View3q } from './pen';
import { pieceGlyph } from './pieces.draw';

export type Dir = 's' | 'e' | 'n' | 'w';
export type Pose = 'stand' | 'walk' | 'carry' | 'push' | 'feed' | 'pour' | 'spanner' | 'sledge' | 'grinder' | 'torch' | 'cut' | 'lever';
export type Hair = 'none' | 'beard' | 'stubble' | 'tail' | 'fringe';
export type Build = 'regular' | 'broad' | 'slim';

/** How a hand load or a carrier's load looks: by the family of its pieces (loadFamily maps content grades). */
export type LoadFamily = 'fe' | 'ci' | 'cu' | 'br' | 'al' | 'cab' | 'mot' | 'hms';
export const LOAD_FAMILIES: readonly LoadFamily[] = ['fe', 'ci', 'cu', 'br', 'al', 'cab', 'mot', 'hms'];

export interface PersonLook {
  vest: string;
  hat: string;
  /** Skin tone (SKINS) and hair; the crew vary by index (crewLook), the boss is one look. */
  skin?: string;
  hair?: Hair;
  hairColour?: string;
  build?: Build;
}

/** Skin tones of the yard's people, light to deep. */
export const SKINS = ['#F1C8A6', '#E3AE87', '#C68B62', '#9A6544', '#6E4630'] as const;
const HAIRS: Hair[] = ['stubble', 'tail', 'beard', 'fringe', 'none'];
const HAIR_COLOURS = ['#3B2A20', '#6B4A2E', '#2A2522', '#B98B4E', '#8A8A86'];
const BUILDS: Build[] = ['regular', 'slim', 'broad', 'regular', 'broad'];

export const BOSS: PersonLook = { vest: YARD.hivis, hat: YARD.hatWhite, skin: SKINS[1], hair: 'stubble', hairColour: '#4A3426', build: 'regular' };
/** A crew member's look: the role's vest and a yellow hat; skin, hair and build vary by the crew's index. */
export const crewLook = (vest: string, index = 0): PersonLook => ({
  vest,
  hat: YARD.hivis,
  skin: SKINS[(index * 3 + 2) % SKINS.length],
  hair: HAIRS[index % HAIRS.length],
  hairColour: HAIR_COLOURS[(index * 2 + 1) % HAIR_COLOURS.length],
  build: BUILDS[index % BUILDS.length],
});

/** The one crew body the atlas bakes (its vest is recoloured per role): deep skin, broad, a beard. */
export const CREW_BODY: PersonLook = { vest: YARD.vestYardHand, hat: YARD.hivis, skin: SKINS[4], hair: 'beard', hairColour: '#2A2522', build: 'broad' };
/** A second crew body (slim, light skin, a ponytail), baked only if the atlas has room (manifest CREW_SECOND). */
export const CREW_BODY_2: PersonLook = { vest: YARD.vestYardHand, hat: YARD.hivis, skin: SKINS[0], hair: 'tail', hairColour: '#6B4A2E', build: 'slim' };

/** Pieces on a back frame, bottom first: metal ids of METAL (the kit's older way to name a load). */
export type Stack = string[];

export interface PersonOptions {
  dir: Dir;
  pose: Pose;
  /** Frame of the pose (walk and push 0..3, work 0..1). */
  frame?: number;
  /** Frames of the walk cycle (default 4). */
  frames?: number;
  look?: PersonLook;
  /** The hand load on the carry frame: a family, or metal ids of METAL (at most three pieces are drawn). */
  load?: LoadFamily | string[];
  /** Older name of load (metal ids); 'carry' with neither draws a light-iron hand load. */
  stack?: Stack;
  /** Grinder: the spark fan's phase 0..1 (varies the fan). */
  spark?: number;
  /** The face shield down without tool work (the pour). */
  shield?: boolean;
  /** The aluminised apron worn at every pour. */
  apron?: boolean;
  /** Draw the ground shadow (default true; atlas sprites pass false). */
  shadow?: boolean;
  /**
   * Draw only the vest's visible fill in near-white (VEST_KEY), its reflective bands and whatever covers
   * it (arms, tools, apron, head) cut out: the overlay the atlas modulates to a role's vest colour.
   */
  vestOnly?: boolean;
  /**
   * The works' tools in the boss's hand (stage 2, ART-PEOPLE; absent: the first yard's drawing, unchanged): 'plasma'
   * with the pose 'torch' draws the plasma cutter (one lead to the unit on the ground, a bright arc point and a short
   * fan of molten spray from the kerf, no sparkle) instead of the oxy-propane torch; 'analyser' with the pose 'stand'
   * draws the hand-held analyser held out and pointed down at the sample (never at a person), safety glasses on.
   */
  tool?: 'plasma' | 'analyser';
}

/** The near-white of the vest overlay (manifest tint): modulated by the atlas to the role's vest. */
export const VEST_KEY = '#F4F4F0';

/** The design height of a person in points at 40 points a metre (feet to shoulders' line is about 35). */
export const PERSON_PT = 47;
/** Where a pushed carrier's grip is, metres ahead of the person's anchor and up (vehicles.draw.ts uses it). */
export const GRIP = { ahead: 0.34, z: 0.92 } as const;
/** Frames of each pose as the atlas bakes them. */
export const POSE_FRAMES: Readonly<Record<Pose, number>> = {
  stand: 1,
  walk: 4,
  carry: 4,
  push: 4,
  feed: 2,
  pour: 1,
  spanner: 2,
  sledge: 2,
  grinder: 2,
  torch: 2,
  cut: 2,
  lever: 1,
};

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

// ---------------------------------------------------------------------------
// Small pieces the kit's pieceGlyph does not have (insulated cable, a motor, an alloy wheel)
// ---------------------------------------------------------------------------

/** A coil of insulated cable (black PVC) with a bright copper cut end showing, s points across. */
export function cableCoilGlyph(c: SkCanvas, s: number, seed = 0): void {
  const rx = s * 0.44;
  const ry = rx * 0.62;
  for (let i = 0; i < 3; i++) {
    const dx = (i - 1) * s * 0.05 + (hash01(seed, i, 4) - 0.5) * s * 0.04;
    const dy = (1 - i) * s * 0.05;
    c.drawPath(oval(dx, dy, rx * (0.96 - i * 0.04), ry), stroke(INK, s * 0.16 + 1.4));
    c.drawPath(oval(dx, dy, rx * (0.96 - i * 0.04), ry), stroke(i === 1 ? YARD.pvcGrey : YARD.pvc, s * 0.16));
  }
  // the cut end with its copper core
  const ex = rx * 0.8;
  const ey = ry * 0.6;
  c.drawPath(segment(ex - 2, ey - 1, ex + s * 0.22, ey + s * 0.12), stroke(INK, s * 0.14 + 1.2));
  c.drawPath(segment(ex - 2, ey - 1, ex + s * 0.22, ey + s * 0.12), stroke(YARD.pvc, s * 0.14));
  c.drawPath(circle(ex + s * 0.24, ey + s * 0.13, Math.max(1.2, s * 0.08)), fill(YARD.copperLight));
  c.drawPath(circle(ex + s * 0.24, ey + s * 0.13, Math.max(1.2, s * 0.08)), stroke(INK, 0.8));
}

/** An electric motor lying on its side: a finned grey body, cast-aluminium end caps, copper at the shaft. */
export function motorGlyph(c: SkCanvas, s: number): void {
  const w = s * 0.78;
  const h = s * 0.52;
  const body = rrect(-w / 2, -h / 2, w, h, h * 0.3);
  c.drawPath(body, fill(YARD.machine));
  for (let i = 1; i < 5; i++) c.drawPath(segment(-w / 2 + (w * i) / 5, -h / 2 + 1, -w / 2 + (w * i) / 5, h / 2 - 1), stroke(YARD.machineDark, 0.9));
  c.drawRect({ x: -w / 2 + 1.5, y: -h / 2 + 1, width: w - 3, height: h * 0.22 }, fill(YARD.machineLight));
  c.drawPath(body, stroke(INK, 1));
  for (const x of [-w / 2 - s * 0.05, w / 2 + s * 0.05]) {
    const cap = oval(x, 0, s * 0.09, h * 0.46);
    c.drawPath(cap, fill(YARD.aluminium));
    c.drawPath(cap, stroke(INK, 0.9));
  }
  c.drawPath(segment(w / 2 + s * 0.1, 0, w / 2 + s * 0.24, 0), stroke(INK, 2.4));
  c.drawPath(segment(w / 2 + s * 0.1, 0, w / 2 + s * 0.24, 0), stroke(YARD.galvanisedLight, 1.2));
  // the windings' copper seen at the terminal box
  c.drawPath(rrect(-s * 0.1, -h / 2 - s * 0.1, s * 0.2, s * 0.12, 1), fill(YARD.copper));
  c.drawPath(rrect(-s * 0.1, -h / 2 - s * 0.1, s * 0.2, s * 0.12, 1), stroke(INK, 0.8));
}

/** A washer's stainless drum lying on its side: a steel cylinder with rows of holes and its open mouth. */
export function drumGlyph(c: SkCanvas, s: number): void {
  const w = s * 0.8;
  const h = s * 0.56;
  const body = rrect(-w / 2, -h / 2, w, h, 2);
  c.drawPath(body, fill(YARD.galvanisedLight));
  c.drawRect({ x: -w / 2 + 1, y: -h / 2 + 1, width: w - 2, height: h * 0.25 }, fill('#E4E8EB'));
  for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) c.drawPath(circle(-w / 2 + w * (0.18 + i * 0.2), -h * 0.12 + r * h * 0.34, Math.max(0.7, s * 0.04)), fill(YARD.steelDark));
  c.drawPath(body, stroke(INK, 1));
  c.drawPath(oval(w / 2, 0, s * 0.1, h * 0.5), fill(YARD.steelDark));
  c.drawPath(oval(w / 2, 0, s * 0.1, h * 0.5), stroke(INK, 1));
}

/** An aluminium alloy wheel seen at an angle: a near-white rim, five spokes, a dark hub. */
export function alloyWheelGlyph(c: SkCanvas, s: number): void {
  const rx = s * 0.46;
  const ry = s * 0.4;
  c.drawPath(oval(0, 0, rx, ry), fill(YARD.aluminiumDark));
  c.drawPath(oval(-s * 0.04, 0, rx * 0.92, ry * 0.92), fill(YARD.aluminium));
  c.drawPath(oval(-s * 0.04, 0, rx * 0.92, ry * 0.92), stroke(INK, 1));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    c.drawPath(segment(-s * 0.04, 0, -s * 0.04 + Math.cos(a) * rx * 0.78, Math.sin(a) * ry * 0.78), stroke(YARD.aluminiumDark, Math.max(1.4, s * 0.1)));
  }
  c.drawPath(oval(-s * 0.04, 0, s * 0.1, s * 0.09), fill(YARD.steelDark));
  c.drawPath(oval(0, 0, rx, ry), stroke(INK, 1));
}

/** The pieces a load of a family shows, as metal ids for pieceGlyph or the glyphs above. */
const FAMILY_PIECES: Readonly<Record<LoadFamily, string[]>> = {
  fe: ['drum', 'light_iron', 'light_iron'],
  ci: ['cast_iron', 'cast_iron', 'cast_iron'],
  cu: ['copper', 'copper', 'copper'],
  br: ['brass', 'brass', 'brass'],
  al: ['wheel', 'wheel', 'aluminium'],
  cab: ['cable', 'cable', 'cable'],
  mot: ['motor', 'light_iron', 'motor'],
  hms: ['hms', 'hms', 'hms'],
};

/** One loaded piece by name at (x, y), s points long (METAL ids, or 'cable', 'motor', 'wheel'). */
export function loadPiece(c: SkCanvas, name: string, x: number, y: number, s: number, turn = 0, seed = 0): void {
  if (name === 'cable' || name === 'motor' || name === 'wheel' || name === 'drum') {
    c.save();
    c.translate(x, y);
    c.rotate(turn, 0, 0);
    if (name === 'cable') cableCoilGlyph(c, s, seed);
    else if (name === 'motor') motorGlyph(c, s);
    else if (name === 'drum') drumGlyph(c, s);
    else alloyWheelGlyph(c, s);
    c.restore();
    return;
  }
  pieceGlyph(c, name, x, y, s, turn, seed);
}

/** The pieces of a load: a family's, or metal ids as given (at most n). */
export function loadPieces(load: LoadFamily | string[] | undefined, n = 3): string[] {
  if (!load) return FAMILY_PIECES.fe.slice(0, n);
  if (typeof load === 'string') return (FAMILY_PIECES[load] ?? FAMILY_PIECES.fe).slice(0, n);
  const list = load.length ? load : FAMILY_PIECES.fe;
  return list.slice(0, n);
}

/**
 * The family a content grade's pieces look like (content2.json grade ids; unknown ids look like light
 * iron). Several grades in one load: the family of the first of the most valuable (the caller orders).
 */
export function loadFamily(grade: string): LoadFamily {
  switch (grade) {
    case 'ci':
    case 'ciu':
      return 'ci';
    case 'no2':
    case 'bb':
    case 'cyl':
      return 'cu';
    case 'brs':
    case 'bri':
    case 'brd':
      return 'br';
    case 'alw':
    case 'alcast':
    case 'ali':
    case 'ald':
      return 'al';
    case 'cab':
    case 'cabt':
      return 'cab';
    case 'mot':
      return 'mot';
    case 'hms':
    case 'hmsu':
      return 'hms';
    default:
      return 'fe';
  }
}

// ---------------------------------------------------------------------------
// The hand load on its carry frame
// ---------------------------------------------------------------------------

/** The blue polyester strap that holds every load. */
const STRAP = YARD.crateBlue;

function strap(c: SkCanvas, x0: number, y0: number, x1: number, y1: number, w = 2.2): void {
  c.drawPath(segment(x0, y0, x1, y1), stroke(INK, w + 1.4));
  c.drawPath(segment(x0, y0, x1, y1), stroke(STRAP, w));
}

/**
 * The carry frame and its hand load (S8: at most 30 kg), drawn round the person's anchor for a direction,
 * in points at v (designed at 40 points a metre). Drawn BEFORE the person when the person faces s, e or w
 * (the frame is on the back, away from the eye) and AFTER when facing n.
 */
export function drawHandLoad(c: SkCanvas, v: View3q, dir: Dir, load?: LoadFamily | string[], build: Build = 'regular'): void {
  if (dir === 'w') {
    c.save();
    c.scale(-1, 1);
    drawHandLoad(c, v, 'e', load, build);
    c.restore();
    return;
  }
  const k = v.ppm / 40;
  c.save();
  c.scale(k, k);
  const pieces = loadPieces(load, 3);
  const bw = build === 'broad' ? 1.12 : build === 'slim' ? 0.9 : 1;
  const T = -35;
  const rail = (x0: number, y0: number, x1: number, y1: number) => {
    c.drawPath(segment(x0, y0, x1, y1), stroke(INK, 3));
    c.drawPath(segment(x0, y0, x1, y1), stroke(YARD.steel, 1.6));
  };
  if (dir === 'e') {
    // side-on: the frame stands against the back (west), a foot shelf at the hip, pieces stacked on it
    const xb = -6.5 * bw;
    rail(xb, T - 5, xb - 1, -16);
    rail(xb - 9.5, T - 3, xb - 10.5, -16);
    rail(xb - 11, -16, xb + 0.5, -16);
    pieces.forEach((m, i) => loadPiece(c, m, xb - 5.5, -20 - i * 6.4, 11.5, 90 + (hash01(i, 3) - 0.5) * 16, i * 3 + 1));
    strap(c, xb - 11.5, T + 2, xb + 0.5, T + 4);
    strap(c, xb - 11.5, T + 12, xb + 0.5, T + 13);
    // the shoulder strap round to the chest
    c.drawPath(builder().moveTo(xb, T + 1).quadTo(xb + 6, T - 1, xb + 8, T + 8).build(), stroke(INK, 3.2));
    c.drawPath(builder().moveTo(xb, T + 1).quadTo(xb + 6, T - 1, xb + 8, T + 8).build(), stroke(YARD.navyDark, 1.8));
  } else if (dir === 's') {
    // behind the body: the frame's top and the load's ends show over the shoulders and beside the waist
    const hw = 9.5 * bw;
    rail(-hw + 1, T - 6, -hw + 1, -17);
    rail(hw - 1, T - 6, hw - 1, -17);
    rail(-hw + 1, T - 6, hw - 1, T - 6);
    pieces.forEach((m, i) => loadPiece(c, m, (i - 1) * 7 * bw, T - 1 + i * 6, 13.5, (hash01(i, 5) - 0.5) * 18, i * 3 + 1));
    strap(c, -hw - 1, T + 2, hw + 1, T + 2);
  } else {
    // from behind: the whole frame and load on the back, strapped across
    const hw = 8.5 * bw;
    rail(-hw, T - 5, -hw, -15);
    rail(hw, T - 5, hw, -15);
    rail(-hw - 1, -15, hw + 1, -15);
    pieces.forEach((m, i) => loadPiece(c, m, (hash01(i, 7) - 0.5) * 2.5, -19.5 - i * 6.6, 16 * bw, (hash01(i, 5) - 0.5) * 14, i * 3 + 1));
    strap(c, -hw - 1.5, T + 7, hw + 1.5, T + 6, 1.6);
  }
  c.restore();
}

// ---------------------------------------------------------------------------
// The head (hat, face, eye protection)
// ---------------------------------------------------------------------------

type Eyes = 'bare' | 'glasses' | 'shield' | 'visor';

function head(c: SkCanvas, dir: Dir, look: PersonLook, hx: number, hy: number, eyes: Eyes): void {
  c.save();
  c.translate(hx, 0);
  const r = 7.2;
  const side = dir === 'e';
  const skin = look.skin ?? YARD.skin;
  const skinDark = shade(skin, -0.16);
  const hairC = look.hairColour ?? '#3B2A20';
  // Face / back of the head.
  c.drawPath(oval(0, hy, r, r * 1.02), fill(dir === 'n' ? skinDark : skin));
  if (dir === 'n') {
    c.save();
    c.clipPath(oval(0, hy, r, r * 1.02), ClipOp.Intersect, true);
    c.drawRect({ x: -r, y: hy - r, width: r * 2, height: r * 1.2 }, fill(hairC));
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
  if (look.hair === 'tail' && dir !== 's') c.drawPath(rrect(side ? -r - 2.6 : -1.6, hy - 1, 3.2, 7.5, 1.6), stroke(INK, 0.8));
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
  if (eyes === 'glasses' && dir !== 'n') {
    // wrap-around safety glasses: a clear smoke band with an ink rim and a strap
    const g = side ? rrect(1.4, hy - 1.2, 6.4, 3.4, 1.4) : rrect(-r + 0.6, hy - 1.1, 2 * r - 1.2, 3.6, 1.6);
    c.drawPath(g, fill(YARD.glassDark, 0.75));
    c.drawPath(g, stroke(INK, 1.1));
    c.drawPath(segment(side ? 2.6 : -4.6, hy - 0.2, side ? 4.2 : -2.8, hy - 0.2), stroke('#FFFFFF', 0.9, 0.9));
    if (side) c.drawPath(segment(1.4, hy + 0.3, -r + 0.4, hy - 0.4), stroke(INK, 1.1));
  } else if (eyes === 'glasses') {
    c.drawPath(segment(-r + 0.3, hy - 0.6, r - 0.3, hy - 0.6), stroke(INK, 1.4));
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
  if ((eyes === 'shield' || eyes === 'visor') && dir !== 'n') {
    // a face shield hinged on the hat: clear (grinder, pour) or a dark cutting visor (torch)
    const s = side ? poly([1.5, hy - 1.2, 10.5, hy - 1.2, 11.5, hy + 7.5, 2.5, hy + 8]) : rrect(-r - 0.8, hy - 1.4, 2 * r + 1.6, 9.6, 2);
    if (eyes === 'visor') {
      c.drawPath(s, fill(YARD.glass, 0.4));
      const win = side ? poly([3.2, hy - 0.2, 9.6, hy - 0.2, 10, hy + 3.4, 3.4, hy + 3.6]) : rrect(-r + 0.6, hy - 0.4, 2 * r - 1.2, 3.8, 1);
      c.drawPath(win, fill('#24302E', 0.95));
      c.drawPath(win, stroke(INK, 0.8));
      c.drawPath(segment(side ? 4.2 : -4.6, hy + 0.6, side ? 6 : -2.4, hy + 0.6), stroke(YARD.glass, 0.9, 0.8));
    } else c.drawPath(s, fill(YARD.glass, 0.55));
    c.drawPath(s, stroke(INK, 1.1));
    if (eyes === 'shield') c.drawPath(segment(side ? 4 : -4.8, hy + 0.6, side ? 5 : -3.4, hy + 5.6), stroke('#FFFFFF', 1.2, 0.85));
  } else if ((eyes === 'shield' || eyes === 'visor') && dir === 'n') {
    // from behind: the shield's headband round the hat
    c.drawPath(segment(-r - 0.6, hy - 1.4, r + 0.6, hy - 1.4), stroke(INK, 1.6));
  }
  c.restore();
}

// ---------------------------------------------------------------------------
// Body parts
// ---------------------------------------------------------------------------

function vest(c: SkCanvas, dir: Dir, look: PersonLook, x: number, y: number, w: number, h: number): void {
  const body = rrect(x, y, w, h, 4.2);
  part(c, body, look.vest);
  c.save();
  c.clipPath(body, ClipOp.Intersect, true);
  // Reflective bands: two around the body; braces over the shoulders (front) or a cross (back). The
  // band's edge is a fixed grey so the atlas can recolour the vest's one fill (manifest tint).
  const band = fill(YARD.reflect);
  const bandEdge = stroke(YARD.apronDark, 0.7);
  for (const yy of [y + h * 0.5, y + h * 0.74]) {
    c.drawRect({ x, y: yy, width: w, height: 2.3 }, band);
    c.drawRect({ x, y: yy, width: w, height: 2.3 }, bandEdge);
  }
  if (dir === 's') {
    for (const bx of [x + w * 0.24, x + w * 0.76 - 2.3]) {
      c.drawRect({ x: bx, y, width: 2.3, height: h * 0.5 }, band);
      c.drawRect({ x: bx, y, width: 2.3, height: h * 0.5 }, bandEdge);
    }
    c.drawPath(segment(x + w / 2, y + 1, x + w / 2, y + h * 0.48), stroke(INK, 0.7, 0.45));
  } else if (dir === 'n') {
    c.drawPath(segment(x + 2, y, x + w - 2, y + h * 0.5), stroke(YARD.reflect, 2.3));
    c.drawPath(segment(x + w - 2, y, x + 2, y + h * 0.5), stroke(YARD.reflect, 2.3));
  } else {
    c.drawRect({ x: x + w * 0.4, y, width: 2.3, height: h * 0.5 }, band);
  }
  c.restore();
  c.drawPath(body, stroke(INK, L));
}

/** A trouser leg from the hip through the knee to the boot (toe: points the boot reaches forward). */
function leg(c: SkCanvas, hx: number, hy: number, kx: number, ky: number, fx: number, fy: number, toe: number): void {
  const p = builder().moveTo(hx, hy).lineTo(kx, ky).lineTo(fx, fy - 2.5).build();
  c.drawPath(p, stroke(INK, 7.4));
  c.drawPath(p, stroke(YARD.navy, 5));
  const boot = rrect(fx - 3.6 + Math.min(0, toe), fy - 3.6, 7.2 + Math.abs(toe), 4, 1.8);
  part(c, boot, YARD.boot, 1.1);
}

function straightLeg(c: SkCanvas, hx: number, hy: number, fx: number, fy: number, toe: number): void {
  leg(c, hx, hy, (hx + fx) / 2, (hy + fy) / 2, fx, fy, toe);
}

function arm(c: SkCanvas, sx: number, sy: number, hx: number, hy: number, front = true, glove: string = YARD.glove): void {
  const p = segment(sx, sy, hx, hy);
  c.drawPath(p, stroke(INK, 6.6));
  c.drawPath(p, stroke(front ? YARD.navy : YARD.navyDark, 4.2));
  c.drawPath(oval(hx, hy, 2.9, 2.7), fill(glove));
  c.drawPath(oval(hx, hy, 2.9, 2.7), stroke(INK, 1.1));
}

// ---------------------------------------------------------------------------
// Tools (drawn in the person's points)
// ---------------------------------------------------------------------------

/** The angle grinder held level (its disc at about (x + 14, y + 1.6)) and, while cutting, the spark fan. */
function grinder(c: SkCanvas, x: number, y: number, spark: number, sparks: boolean, fan = 0.75): void {
  part(c, rrect(x - 2, y - 2.6, 12, 5.2, 2.4), YARD.machineLight, 1.1);
  part(c, rrect(x - 4.5, y - 1.6, 4, 3.2, 1), YARD.ink, 0.8);
  part(c, poly([x + 9, y - 4.5, x + 13, y - 4.5, x + 13, y + 1, x + 9, y + 1]), YARD.hivis, 1);
  c.drawPath(oval(x + 13.8, y + 1.6, 1.4, 5.2), fill('#6D7277'));
  c.drawPath(oval(x + 13.8, y + 1.6, 1.4, 5.2), stroke(INK, 1));
  if (!sparks) return;
  sparkFan(c, x + 14, y + 6, spark, 1, 9, fan);
}

/** Short light streaks thrown down and back (never flames), varied by phase. */
function sparkFan(c: SkCanvas, x0: number, y0: number, spark: number, dirX = 1, n = 9, reach = 1): void {
  const ph = Math.floor(spark * 7);
  for (let i = 0; i < n; i++) {
    const a = Math.PI * (0.62 + 0.36 * hash01(i, ph));
    const len = (6 + 10 * hash01(i, 3, ph)) * reach;
    const x1 = x0 + Math.cos(a) * len * -0.9 * dirX;
    const y1 = y0 + Math.sin(a) * len;
    c.drawPath(segment(x0, y0, x1, y1), stroke(i % 3 ? YARD.spark : '#FFFFFF', 1.3));
  }
  c.drawPath(oval(x0, y0, 2.6, 2.2), fill('#FFFFFF', 0.95));
}

/** An open-ended spanner from the hand (x, y), turned `deg` (0 points forward). */
function spanner(c: SkCanvas, x: number, y: number, deg: number): void {
  c.save();
  c.translate(x, y);
  c.rotate(deg, 0, 0);
  const shaft = rrect(-1, -1.4, 11, 2.8, 1.2);
  c.drawPath(shaft, fill(YARD.galvanisedLight));
  c.drawPath(shaft, stroke(INK, 0.9));
  const jaw = builder().moveTo(9, -3.2).lineTo(14, -3.6).lineTo(14.6, -1.2).lineTo(12, -0.8).lineTo(12, 0.8).lineTo(14.6, 1.2).lineTo(14, 3.6).lineTo(9, 3.2).close().build();
  c.drawPath(jaw, fill(YARD.galvanisedLight));
  c.drawPath(jaw, stroke(INK, 0.9));
  c.restore();
}

/** The sledgehammer: a hickory handle from (x0, y0) to its head at (x1, y1), the head across the handle. */
function sledge(c: SkCanvas, x0: number, y0: number, x1: number, y1: number): void {
  const ang = Math.atan2(y1 - y0, x1 - x0);
  c.drawPath(segment(x0, y0, x1, y1), stroke(INK, 3.6));
  c.drawPath(segment(x0, y0, x1, y1), stroke(YARD.wood, 2));
  c.save();
  c.translate(x1, y1);
  c.rotate((ang * 180) / Math.PI, 0, 0);
  const hd = rrect(-3.4, -5.2, 6.8, 10.4, 1.4);
  c.drawPath(hd, fill(YARD.steelDark));
  c.drawRect({ x: -3.4, y: -5.2, width: 2.2, height: 10.4 }, fill(YARD.steel));
  c.drawPath(hd, stroke(INK, 1.1));
  c.restore();
}

/**
 * The oxy-propane cutting torch from the hand (x, y) to its nozzle (nx, ny); the two hoses fall back to
 * the ground behind; while cutting, a small blue-white flame, a glow at the cut and sparks falling.
 */
function torch(c: SkCanvas, x: number, y: number, nx: number, ny: number, hoseX: number, phase: number): void {
  // hoses: oxygen blue, propane red-oxide (orange is kept for heat)
  for (const [col, dx] of [[YARD.crateBlue, 0], [YARD.skip, 1.6]] as const) {
    const p = builder().moveTo(x - 2, y + 1 + dx).quadTo(x - 6, y + 14, hoseX + dx, -0.6).build();
    c.drawPath(p, stroke(INK, 2.4));
    c.drawPath(p, stroke(col, 1.2));
  }
  c.drawPath(segment(x - 3, y, nx, ny), stroke(INK, 3.6));
  c.drawPath(segment(x - 3, y, nx, ny), stroke(YARD.brass, 2));
  c.drawPath(circle(x + (nx - x) * 0.35, y + (ny - y) * 0.35, 1.6), fill(YARD.galvanised));
  c.drawPath(circle(x + (nx - x) * 0.35, y + (ny - y) * 0.35, 1.6), stroke(INK, 0.7));
  // the flame: a short inner cone, then the cut's glow and sparks running down
  const ang = Math.atan2(ny - y, nx - x);
  const fx = nx + Math.cos(ang) * 4.5;
  const fy = ny + Math.sin(ang) * 4.5;
  c.drawPath(segment(nx, ny, fx, fy), stroke('#BFE3FF', 3.2));
  c.drawPath(segment(nx, ny, nx + Math.cos(ang) * 2.4, ny + Math.sin(ang) * 2.4), stroke('#FFFFFF', 1.6));
  c.drawPath(circle(fx + 0.6, fy + 0.4, 2.4), fill(YARD.glowHot));
  c.drawPath(circle(fx + 0.6, fy + 0.4, 1.2), fill(YARD.glowWhite));
  for (let i = 0; i < 6; i++) {
    const dx = (hash01(i, 11, phase) - 0.4) * 7;
    const len = 4 + hash01(i, 12, phase) * 8;
    c.drawPath(segment(fx + dx * 0.3, fy + 2, fx + dx, fy + 2 + len), stroke(i % 2 ? YARD.spark : YARD.glowHot, 1.2));
  }
}

/** A short length of insulated cable held in both hands (feeding a hopper). */
function heldCable(c: SkCanvas, x0: number, y0: number, x1: number, y1: number): void {
  const p = builder().moveTo(x0, y0).quadTo((x0 + x1) / 2, Math.max(y0, y1) + 5, x1, y1).build();
  c.drawPath(p, stroke(INK, 4.6));
  c.drawPath(p, stroke(YARD.pvc, 3));
  c.drawPath(circle(x1 + (x1 > x0 ? 1.6 : -1.6), y1, 1.5), fill(YARD.copperLight));
  c.drawPath(circle(x1 + (x1 > x0 ? 1.6 : -1.6), y1, 1.5), stroke(INK, 0.7));
}

/**
 * The works' plasma cutter (stage 2, `tool: 'plasma'`): a short dark torch from the hand (x, y) to its copper shield cup
 * at (nx, ny), ONE black lead falling back to the ground at hoseX (the unit stands beside him: the caller draws it);
 * while cutting, a bright arc point at the cup and a short fan of molten spray blown down out of the kerf. No sparkle,
 * no star: drops and short streaks only, varied by the frame.
 */
function plasmaTorch(c: SkCanvas, x: number, y: number, nx: number, ny: number, hoseX: number, phase: number): void {
  const lead = builder().moveTo(x - 2, y + 1).quadTo(x - 7, y + 15, hoseX, -0.6).build();
  c.drawPath(lead, stroke(INK, 3.4));
  c.drawPath(lead, stroke(YARD.pvc, 2));
  const ang = Math.atan2(ny - y, nx - x);
  const cx = Math.cos(ang);
  const cy = Math.sin(ang);
  // the handle and the torch head (dark grey), then the copper cup
  c.drawPath(segment(x - 3, y, nx, ny), stroke(INK, 4.4));
  c.drawPath(segment(x - 3, y, nx, ny), stroke(YARD.machineDark, 3));
  c.drawPath(segment(x - 1, y - 1, x + (nx - x) * 0.5, y + (ny - y) * 0.5 - 1), stroke(YARD.pvcGrey, 0.9));
  const cupX = nx + cx * 2.2;
  const cupY = ny + cy * 2.2;
  c.drawPath(segment(nx, ny, cupX, cupY), stroke(INK, 3.6));
  c.drawPath(segment(nx, ny, cupX, cupY), stroke(YARD.copperLight, 2.2));
  // the arc: a small blue-white halo round a white point, just past the cup
  const ax = cupX + cx * 1.6;
  const ay = cupY + cy * 1.6;
  c.drawPath(circle(ax, ay, 3.4), fill('#BFD8FF', 0.55));
  c.drawPath(circle(ax, ay, 1.7), fill('#FFFFFF'));
  plasmaSpray(c, ax, ay + 1.2, phase, cx >= 0 ? 1 : -1, 1);
}

/** The molten spray blown down out of a plasma kerf: a short fan of drops and streaks (glow colours), varied by phase. */
function plasmaSpray(c: SkCanvas, x0: number, y0: number, phase: number, dirX = 1, reach = 1): void {
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * (0.38 + 0.2 * hash01(i, 21, phase));
    const len = (4 + 5 * hash01(i, 22, phase)) * reach;
    const x1 = x0 + Math.cos(a) * len * dirX * 0.8;
    const y1 = y0 + Math.sin(a) * len;
    c.drawPath(segment(x0, y0, x1, y1), stroke(i % 2 ? YARD.glow : YARD.glowHot, 1.1));
    c.drawPath(circle(x1 + Math.cos(a) * 1.6 * dirX, y1 + 1.4, 0.75), fill(i % 3 ? YARD.glowHot : YARD.glow));
  }
}

/**
 * The works' hand-held analyser (stage 2, `tool: 'analyser'`) in the hand at (x, y), turned `deg` (0 points forward, 90
 * straight down): a pale grey pistol body with its nose window and the lit reading screen on its back. Pointed down at
 * the sample, never at a person.
 */
function analyserGun(c: SkCanvas, x: number, y: number, deg: number): void {
  c.save();
  c.translate(x, y);
  c.rotate(deg, 0, 0);
  part(c, rrect(-1.6, 0, 3.2, 5, 1.2), YARD.ink, 0.8);
  part(c, rrect(-4.5, -3.2, 13, 5.2, 2.2), YARD.galvanisedLight, 1.1);
  part(c, rrect(-4, -4.6, 5, 2.2, 0.8), YARD.ledCase, 0.8);
  c.drawRect({ x: -3.4, y: -4.1, width: 3.8, height: 1.2 }, fill(YARD.led, 0.9));
  part(c, rrect(8, -2.2, 2.6, 3.2, 1), YARD.steelDark, 0.9);
  c.restore();
}

// ---------------------------------------------------------------------------
// The person
// ---------------------------------------------------------------------------

/** A person at the anchor, in points of the view (designed at 40 points a metre and scaled to v.ppm). */
export function drawPerson(c: SkCanvas, v: View3q, o: PersonOptions): void {
  const look = o.look ?? BOSS;
  // the shadow first and never mirrored: the low sun always throws it east
  if (o.shadow !== false) groundShadow(c, v, 0.3, 0.26, 0, 0, 1.1);
  // a hand load: given as `load`, or 'carry' with the older `stack` (an empty stack carries nothing)
  const load: LoadFamily | string[] | undefined = o.load ?? (o.pose !== 'carry' ? undefined : o.stack ? (o.stack.length ? o.stack.slice(0, 3) : undefined) : 'fe');
  const withLoad = load !== undefined;
  const pose: Pose = o.pose === 'carry' ? 'walk' : o.pose;
  const frame = o.pose === 'carry' && o.frame === undefined ? 1 : o.frame;
  if (withLoad && o.dir !== 'n') drawHandLoad(c, v, o.dir, load, look.build);
  if (o.dir === 'w') {
    c.save();
    c.scale(-1, 1);
    personBody(c, v, { ...o, pose, frame, dir: 'e' }, look);
    c.restore();
  } else personBody(c, v, { ...o, pose, frame }, look);
  if (withLoad && o.dir === 'n') drawHandLoad(c, v, 'n', load, look.build);
}

function personBody(c: SkCanvas, v: View3q, o: PersonOptions, look: PersonLook): void {
  c.save();
  const k = v.ppm / 40;
  c.scale(k, k);
  const dir = o.dir;
  const side = dir === 'e';
  const pose: Pose = o.pose === 'cut' ? 'grinder' : o.pose;
  const f = o.frame ?? 0;
  const bw = look.build === 'broad' ? 1.12 : look.build === 'slim' ? 0.9 : 1;
  const stepping = pose === 'walk' || pose === 'push';
  const n = o.frames ?? 4;
  const ph = stepping ? (f / n) * Math.PI * 2 + Math.PI / 2 : 0;
  const swing = stepping ? Math.sin(ph) : 0;
  const bob = stepping ? Math.abs(Math.cos(ph)) * 1.4 : 0;
  // crouch (hips lowered) and lean (upper body forward, side-on) by pose
  const crouch = pose === 'spanner' ? 6 : pose === 'feed' && f === 0 ? 2 : pose === 'sledge' && f === 1 ? 3 : pose === 'torch' ? 2 : 0;
  const lean = side ? (pose === 'spanner' ? 5 : pose === 'push' ? 2 : pose === 'sledge' && f === 1 ? 4 : pose === 'torch' || pose === 'grinder' ? 1.5 : 0) : 0;
  const hipY = -20 - bob + crouch;
  const T = -35 - bob + crouch * 1.2;
  const hy = -42.5 - bob + crouch * 1.2;
  const tool = o.tool;
  const plasma = tool === 'plasma' && pose === 'torch';
  const analyser = tool === 'analyser' && pose === 'stand';
  const eyes: Eyes = analyser ? 'glasses' : plasma ? 'visor' :
    pose === 'grinder' || pose === 'pour' || o.shield ? 'shield' : pose === 'torch' ? 'visor' : pose === 'sledge' || pose === 'spanner' ? 'glasses' : 'bare';
  const apron = o.apron || pose === 'pour';
  const glove = apron ? YARD.apron : YARD.glove;
  const spark = o.spark ?? (f === 0 ? 0.2 : 0.65);
  const tw = (side ? 12.5 : 17) * bw;
  const shX = side ? 1 : 8.4 * bw;
  const uX = lean; // the shoulders' shift forward

  // In vestOnly mode everything but the vest goes into a destination-out layer: it draws nothing of its
  // own and cuts the vest where it covers it.
  const vestOnly = o.vestOnly === true;
  const cutPaint = Skia.Paint();
  cutPaint.setBlendMode(BlendMode.DstOut);
  const hide = () => {
    if (vestOnly) c.saveLayer(cutPaint);
  };
  const unhide = () => {
    if (vestOnly) c.restore();
  };
  if (vestOnly) c.saveLayer();
  hide();
  // ---- behind the body -------------------------------------------------------
  if (side) {
    // the far arm (and tools held behind)
    if (pose === 'sledge') {
      if (f === 0) arm(c, uX - 1, T + 3, -4, T - 9, false);
      else arm(c, uX - 1, T + 3, 10, T + 13, false);
    } else if (pose === 'spanner') arm(c, uX - 1, T + 3, uX + 9, T + 14, false);
    else if (pose === 'grinder') arm(c, uX - 1, T + 3, uX + 8, T + 10, false);
    else if (pose === 'torch') arm(c, uX - 1, T + 3, uX + 9, T + 9, false);
    else if (pose === 'push') arm(c, uX - 1, T + 3, 11.5, T + 8.5, false);
    else if (pose === 'feed') arm(c, uX - 1, T + 3, f === 0 ? 8.5 : 12, f === 0 ? T + 11 : T + 1.5, false);
    else if (pose === 'pour' || pose === 'lever') arm(c, -1, T + 3, 9.5, T + 4.5, false, glove);
    else arm(c, -1, T + 3, -1 - swing * 6, T + 15, false);
  } else if (dir === 'n') {
    // seen from behind, hands working in front are hidden: the arms go forward past the body
    if (pose === 'sledge' && f === 1) sledge(c, 0, T + 8, 0, T - 2);
    if (plasma) plasmaSpray(c, 0, -4, f, 1, 0.8);
    else if (pose === 'grinder' || pose === 'torch') sparkFan(c, 0, -4, spark, 1, 7, 0.8);
  } else if (dir === 's') {
    if (pose === 'sledge' && f === 0) sledge(c, 0, T - 11, 1, T - 22);
  }

  // ---- legs -------------------------------------------------------------------
  if (side) {
    if (crouch >= 5) {
      // a working crouch: knees forward, the back foot behind
      leg(c, -1.5, hipY, 4.5, hipY + 9, 1.5, 0, 2.5);
      leg(c, 1.5, hipY, 6.5, hipY + 8, 4.5, 0, 2.5);
    } else if (pose === 'sledge' || pose === 'torch' || pose === 'grinder') {
      // a braced stance, feet apart
      straightLeg(c, -1.5, hipY, -5.5, 0, 2.5);
      leg(c, 1.5, hipY, 4.5, hipY + 9, 5, 0, 2.5);
    } else {
      straightLeg(c, -1.5, hipY, -1.5 - swing * 6, 0, 2.5);
      straightLeg(c, 1.5, hipY, 1.5 + swing * 6, 0, 2.5);
    }
  } else {
    const lift = stepping ? swing * 2 : 0;
    const spread = crouch >= 5 || pose === 'sledge' ? 1.6 : 0;
    if (crouch >= 5) {
      leg(c, -4.2 * bw, hipY, -6.5 * bw, hipY + 8, -5.2 * bw - spread, 0, 0);
      leg(c, 4.2 * bw, hipY, 6.5 * bw, hipY + 8, 5.2 * bw + spread, 0, 0);
    } else {
      straightLeg(c, -4.2 * bw, hipY, -4.6 * bw - spread, Math.min(0, -lift), 0);
      straightLeg(c, 4.2 * bw, hipY, 4.6 * bw + spread, Math.min(0, lift), 0);
    }
  }

  unhide();
  // ---- torso -------------------------------------------------------------------
  c.save();
  if (lean) c.translate(lean * 0.6, 0);
  if (vestOnly) vestMask(c, dir, -tw / 2, T, tw, hipY - T + 2);
  else {
    c.drawPath(rrect(-tw / 2 + 1, hipY - 3, tw - 2, 6, 2), fill(YARD.navy));
    vest(c, dir, look, -tw / 2, T, tw, hipY - T + 2);
  }
  hide();
  if (apron && dir !== 'n') {
    // the aluminised apron: a silver bib from the chest to the knees, quilted, with a bright fold
    const ax0 = side ? -1 : -tw / 2 + 1.5;
    const ax1 = side ? tw / 2 + 1.6 : tw / 2 - 1.5;
    const ap = poly([ax0 + 1.5, T + 3, ax1 - 1, T + 3, ax1 + 1, hipY + 10, ax0 - 0.5, hipY + 10]);
    c.drawPath(ap, fill(YARD.apron));
    for (const q of [0.33, 0.66]) c.drawPath(segment(ax0 + (ax1 - ax0) * q, T + 4, ax0 + (ax1 - ax0) * q + 0.4, hipY + 9), stroke(YARD.apronDark, 0.8));
    c.drawPath(segment(ax0 + 2.2, T + 5, ax0 + 2.6, hipY + 8), stroke('#FFFFFF', 1.4, 0.9));
    c.drawPath(ap, stroke(INK, L));
  } else if (apron && dir === 'n') {
    c.drawPath(segment(-tw / 2 + 1, T + 8, tw / 2 - 1, T + 8), stroke(YARD.apronDark, 1.6));
  }
  c.restore();

  unhide();
  hide();
  // ---- arms in front and the tools ------------------------------------------------
  if (side) {
    const sx = uX + 1;
    const sy = T + 3;
    switch (pose) {
      case 'push':
        arm(c, sx, sy, 13.5, T + 9.5);
        break;
      case 'feed':
        if (f === 0) {
          arm(c, sx, sy, 10, T + 12);
          heldCable(c, 7.5, T + 11, 15, T + 9);
        } else {
          arm(c, sx, sy, 14, T + 2);
          heldCable(c, 11, T + 1.5, 19, T + 4);
        }
        break;
      case 'pour':
      case 'lever':
        arm(c, -0.5, sy, 11, T + 6.5, true, glove);
        break;
      case 'grinder':
        arm(c, sx, sy, uX + 9.5, T + 12);
        grinder(c, uX + 9.5, T + 11, spark, true);
        break;
      case 'spanner':
        arm(c, sx, sy, uX + 11, T + 15);
        spanner(c, uX + 11, T + 15, f === 0 ? -35 : 25);
        break;
      case 'sledge':
        if (f === 0) {
          sledge(c, -2, T - 11, -11, T - 21);
          arm(c, sx, sy, -2, T - 11);
        } else {
          sledge(c, 12, T + 14, 24, -3);
          arm(c, sx, sy, 12.5, T + 14.5);
        }
        break;
      case 'torch':
        arm(c, sx, sy, uX + 11, T + 11);
        if (plasma) plasmaTorch(c, uX + 11, T + 11, uX + 19, T + 18, -9, f);
        else torch(c, uX + 11, T + 11, uX + 21, T + 18, -9, f);
        break;
      default:
        if (analyser) {
          arm(c, sx, sy, uX + 10, T + 9);
          analyserGun(c, uX + 10, T + 9, 28);
        } else arm(c, 1, sy, 1 + swing * 6, T + 15);
    }
  } else if (dir === 's') {
    const sx = shX;
    const sy = T + 3;
    switch (pose) {
      case 'push':
        arm(c, -sx, sy, -6.5, T + 17.5);
        arm(c, sx, sy, 6.5, T + 17.5);
        break;
      case 'feed':
        if (f === 0) {
          arm(c, -sx, sy, -5, T + 11);
          arm(c, sx, sy, 5, T + 11);
          heldCable(c, -5, T + 11, 5, T + 11);
        } else {
          heldCable(c, -4, T + 17, 4, T + 18);
          arm(c, -sx, sy, -4.5, T + 17);
          arm(c, sx, sy, 4.5, T + 17);
        }
        break;
      case 'pour':
      case 'lever':
        arm(c, -sx, sy, -6, T + 9, true, glove);
        arm(c, sx, sy, 6, T + 9, true, glove);
        break;
      case 'grinder':
        arm(c, -sx, sy, -3, T + 12);
        arm(c, sx, sy, 3, T + 12);
        grinder(c, -6, T + 13, spark, true);
        break;
      case 'spanner':
        arm(c, -sx, sy, -3.5, T + 17);
        arm(c, sx, sy, 4, T + 16);
        spanner(c, 4, T + 16, f === 0 ? 70 : 115);
        break;
      case 'sledge':
        if (f === 0) {
          arm(c, -sx, sy, -1.5, T - 11);
          arm(c, sx, sy, 1.5, T - 11);
        } else {
          sledge(c, 0, T + 16, 0, 5);
          arm(c, -sx, sy, -2, T + 15);
          arm(c, sx, sy, 2, T + 16);
        }
        break;
      case 'torch':
        arm(c, -sx, sy, -3, T + 13);
        arm(c, sx, sy, 3, T + 14);
        if (plasma) plasmaTorch(c, 2, T + 14, 4, T + 23, 9, f);
        else torch(c, 2, T + 14, 4, T + 25, 9, f);
        break;
      default:
        if (analyser) {
          arm(c, sx, sy, sx + 1.8, T + 15);
          arm(c, -sx, sy, -4.5, T + 11);
          analyserGun(c, -4.5, T + 11, 72);
        } else {
          arm(c, -sx, sy, -sx - 1.8, T + 15 + swing * 1.5);
          arm(c, sx, sy, sx + 1.8, T + 15 - swing * 1.5);
        }
    }
  } else {
    const sx = shX;
    const sy = T + 3;
    switch (pose) {
      case 'sledge':
        if (f === 0) {
          arm(c, -sx, sy, -1.5, T - 10);
          arm(c, sx, sy, 1.5, T - 10);
        } else {
          arm(c, -sx, sy, -4, T + 1);
          arm(c, sx, sy, 4, T + 1);
        }
        break;
      case 'push':
      case 'feed':
      case 'pour':
      case 'lever':
      case 'grinder':
      case 'spanner':
      case 'torch':
        // hands working out of sight in front: the upper arms reach forward, elbows out
        arm(c, -sx, sy, -sx + 2.5, T + (pose === 'spanner' ? 10 : 6), true, glove);
        arm(c, sx, sy, sx - 2.5, T + (pose === 'spanner' ? 10 : 6), true, glove);
        break;
      default:
        if (analyser) {
          // from behind: the reading hand held out in front, out of sight; the other arm hangs
          arm(c, -sx, sy, -sx + 2.5, T + 7);
          arm(c, sx, sy, sx + 1.8, T + 15);
        } else {
          arm(c, -sx, sy, -sx - 1.8, T + 15 + swing * 1.5);
          arm(c, sx, sy, sx + 1.8, T + 15 - swing * 1.5);
        }
    }
  }

  head(c, dir, look, uX, hy, eyes);
  if (apron && dir === 's') {
    // aluminised gauntlets over the gloves
    for (const hx of [-6, 6]) {
      c.drawPath(oval(hx, T + 9, 3.2, 3.1), fill(YARD.apron));
      c.drawPath(oval(hx, T + 9, 3.2, 3.1), stroke(INK, 1));
    }
  }
  if (dir === 's' && pose === 'sledge' && f === 0) {
    // the raised hammer's handle crosses in front of the hat's brim
    c.drawPath(segment(0, T - 11, 1, T - 22), stroke(INK, 3.6));
    c.drawPath(segment(0, T - 11, 1, T - 22), stroke(YARD.wood, 2));
    c.drawPath(circle(-1.5, T - 11, 2.6), fill(YARD.glove));
    c.drawPath(circle(1.5, T - 11, 2.6), fill(YARD.glove));
    c.drawPath(circle(-1.5, T - 11, 2.6), stroke(INK, 1));
    c.drawPath(circle(1.5, T - 11, 2.6), stroke(INK, 1));
  }
  if (dir === 'n' && pose === 'sledge' && f === 0) sledge(c, 0, T - 10, 0, T - 22);
  if (dir === 's' && plasma) plasmaSpray(c, 4.5, T + 26, f, 1, 0.6);
  else if (dir === 's' && (pose === 'torch' || pose === 'grinder')) {
    // a few sparks fall in front of the boots
    sparkFan(c, pose === 'torch' ? 5 : -8, pose === 'torch' ? T + 30 : T + 19, spark, 1, 4, 0.5);
  }
  unhide();
  if (vestOnly) c.restore();
  c.restore();
}

/** The vest overlay's shape: the vest's fill just inside its ink edge, the reflective bands cut out. */
function vestMask(c: SkCanvas, dir: Dir, x: number, y: number, w: number, h: number): void {
  const inset = 0.7;
  c.drawPath(rrect(x + inset, y + inset, w - 2 * inset, h - 2 * inset, 3.6), fill(VEST_KEY));
  const clear = Skia.Paint();
  clear.setBlendMode(BlendMode.Clear);
  for (const yy of [y + h * 0.5, y + h * 0.74]) c.drawRect({ x: x - 1, y: yy - 0.4, width: w + 2, height: 3.1 }, clear);
  if (dir === 's') for (const bx of [x + w * 0.24, x + w * 0.76 - 2.3]) c.drawRect({ x: bx - 0.4, y: y - 1, width: 3.1, height: h * 0.5 + 1 }, clear);
  else if (dir === 'n') {
    const p = stroke('#000000', 3.1);
    p.setBlendMode(BlendMode.Clear);
    c.drawPath(segment(x + 2, y, x + w - 2, y + h * 0.5), p);
    c.drawPath(segment(x + w - 2, y, x + 2, y + h * 0.5), p);
  } else c.drawRect({ x: x + w * 0.4 - 0.4, y: y - 1, width: 3.1, height: h * 0.5 + 1 }, clear);
}

/** The metal of METAL that stands for a load family on a chip or a pictogram. */
export const FAMILY_METAL: Readonly<Record<LoadFamily, string>> = { fe: 'light_iron', ci: 'cast_iron', cu: 'copper', br: 'brass', al: 'aluminium', cab: 'copper', mot: 'light_iron', hms: 'hms' };
