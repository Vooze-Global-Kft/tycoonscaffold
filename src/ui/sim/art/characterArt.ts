/**
 * Draws a character's body parts into pictures, once per look.
 *
 * Every part is drawn around its own joint so the rig only has to place it:
 *   - head pictures: origin at the centre of the head (about 56 x 51 units)
 *   - torso: origin between the hips, up is negative y
 *   - arm: origin at the shoulder, hanging down (+y)
 *   - leg: origin at the hip, hanging down, toe towards +x
 * The character faces +x; facing left is a mirror in the rig.
 */
import { ClipOp, PathOp, type SkPath, type SkPicture } from '@shopify/react-native-skia';
import {
  OUTLINE,
  type BlobPt,
  type Bounds,
  type Pen,
  alpha,
  arc,
  blob,
  builder,
  capsule,
  circle,
  curve,
  done,
  ellipse,
  emptyBounds,
  lightOf,
  line,
  luma,
  merged,
  mix,
  op,
  poly,
  record,
  rrect,
  shadeOf,
} from './draw';
import { lookKey, type ResolvedLook } from './looks';

/** How far the face sits towards the side the character is facing. */
export const FACE_SHIFT = 3;
const FS = FACE_SHIFT;
const EYE_Y = 3.5;
const EYE_DX = 10.5;
const INK = '#3A2416';
const WHITE = '#FFFBF2';
const MOUTH_DARK = '#7A2A22';
const TONGUE = '#F4788A';
const METAL_DARK = '#5E6B7A';

/** Body measurements, in drawing units (a round adult is about 96 units tall without a hat). */
export interface BodyDims {
  /** Hip height above the floor. */
  leg: number;
  /** Half the distance between the hips. */
  hipX: number;
  /** Hip to neck. */
  torso: number;
  shW: number;
  belW: number;
  hipW: number;
  shoulderX: number;
  shoulderY: number;
  /** Shoulder to the middle of the hand. */
  arm: number;
  /** Neck to the middle of the head. */
  headUp: number;
  headScale: number;
}

export function dimsFor(l: ResolvedLook): BodyDims {
  switch (l.body) {
    case 'slim':
      return { leg: 22, hipX: 6, torso: 31, shW: 12.5, belW: 14, hipW: 12.5, shoulderX: 14.5, shoulderY: 25.5, arm: 18, headUp: 20.5, headScale: 0.97 };
    case 'small':
      return { leg: 14.5, hipX: 6, torso: 24, shW: 12, belW: 15.5, hipW: 13, shoulderX: 14.5, shoulderY: 18.5, arm: 14.5, headUp: 20, headScale: 0.95 };
    default:
      return { leg: 19, hipX: 7, torso: 29, shW: 14.5, belW: 19, hipW: 15.5, shoulderX: 17, shoulderY: 23.5, arm: 17, headUp: 21, headScale: 1 };
  }
}

const far = (c: string) => mix(c, shadeOf(c), 0.6);

// ---------------------------------------------------------------------------
// Head
// ---------------------------------------------------------------------------

const skull = () =>
  blob([[0, -25.5], [16, -22.5], [26.5, -10], [27.5, 3], [22.5, 16], [10.5, 24], [0, 25.5], [-10.5, 24], [-22.5, 16], [-27.5, 3], [-26.5, -10], [-16, -22.5]]);

const robotSkull = () => rrect(-27, -23, 54, 47, 12);

/** The outer edge of a head of hair, from behind the ear on the back side over the top to the face side. */
const CAP: BlobPt[] = [[-28.5, 6, 0], [-29.5, -6], [-25, -18], [-15, -26.5], [0, -28.5], [15, -26.5], [25, -18], [29.5, -6], [28.5, 2, 0]];
/** Hairlines, from the face side back to the ear: what you see of the forehead. */
const LINE_SIDE: BlobPt[] = [[24.5, -3], [21, -11], [13, -16], [3, -13.5, 0], [-7, -17], [-17, -13.5], [-23.5, -6], [-25.5, 4]];
const LINE_PART: BlobPt[] = [[25, -5], [17, -14.5], [7, -17.5], [0, -14.5, 0], [-7, -17.5], [-17, -14.5], [-24, -6], [-26, 4]];
const LINE_BACK: BlobPt[] = [[24, -7], [15, -16.5], [2, -19], [-12, -17.5], [-22, -10], [-25.5, 2]];
const LINE_FRINGE: BlobPt[] = [[25, 1], [23.5, -8], [14, -10], [4, -8.8], [-6, -10], [-16, -8.8], [-23.5, -6], [-25.5, 4]];
const LINE_SWOOP: BlobPt[] = [[24.5, -3], [20, -12], [9, -17], [-4, -14], [-15, -8], [-22, 0], [-24.5, 8]];

interface Layers {
  back?: (p: Pen) => void;
  front?: (p: Pen) => void;
}

function hairShine(p: Pen, color: string, big = false) {
  p.shine(curve([[-19.5, -16], [-13.5, -22.5], [-5, -25]]), lightOf(color), big ? 3 : 2.3, 0.85);
}

function hairLayers(l: ResolvedLook): Layers {
  const H = l.hair;
  const cap = (hairline: BlobPt[]) => (p: Pen) => {
    p.shape(blob([...CAP, ...hairline]), H, { shade: 2.6 });
    hairShine(p, H);
  };
  switch (l.hairStyle) {
    case 'bald':
      return {};
    case 'slick':
      return {
        front: (p) => {
          p.shape(blob([[-28.5, 7, 0], [-29.5, -6], [-25, -18], [-15, -26.5], [0, -28.5], [15, -26.5], [25, -18], [29.5, -6], [28, 0, 0], ...LINE_BACK]), H, { shade: 2.6 });
          // Comb lines and a long gel shine.
          const comb = mix(H, lightOf(H), 0.35);
          p.stroke(curve([[16, -17.5], [4, -23.5], [-12, -22], [-24, -11]]), comb, 1.2);
          p.shine(curve([[-21, -15], [-12, -23], [2, -25.5]]), lightOf(H), 3, 0.9);
        },
      };
    case 'bun':
      return {
        back: (p) => {
          p.shape(circle(-9, -31, 10.5), H, { shade: 2.4 });
          p.stroke(arc(-9, -31, 5.5, 5.5, 200, 200), shadeOf(H), 1.5);
        },
        front: cap(LINE_PART),
      };
    case 'bob':
      return {
        back: (p) =>
          p.shape(blob([[-31.5, -4], [-28, -20], [-14, -29.5], [0, -31], [14, -29.5], [28, -20], [31.5, -4], [31.5, 12], [26, 22], [17, 20], [0, 14], [-17, 20], [-26, 22], [-31.5, 12]]), H, { shade: 3 }),
        front: (p) => {
          p.shape(blob([...CAP.slice(0, 8), [28.5, 6, 0], ...LINE_FRINGE]), H, { shade: 2.4 });
          p.stroke(line(8, -18, 9, -10.5), shadeOf(H), 1.3);
          p.stroke(line(-11, -18, -11.5, -10.5), shadeOf(H), 1.3);
          hairShine(p, H);
        },
      };
    case 'long':
      return {
        back: (p) =>
          p.shape(blob([[-30.5, -4], [-28, -20], [-14, -29.5], [0, -31], [14, -29.5], [28, -20], [30.5, -4], [32, 14], [30, 31], [22, 38], [13, 33], [0, 30], [-13, 33], [-22, 38], [-30, 31], [-32, 14]]), H, { shade: 3.4 }),
        front: cap(LINE_SWOOP),
      };
    case 'ponytail':
      return {
        back: (p) => {
          p.shape(blob([[-20, -17], [-33, -17], [-43, -5], [-42, 12], [-35, 22, 0], [-33, 8], [-27, -3]]), H, { shade: 2.6 });
          p.shape(ellipse(-27, -13, 3.2, 5, -35), l.accent, { ow: 2, shade: false });
        },
        front: cap(LINE_SIDE),
      };
    case 'braids':
      return {
        back: (p) => {
          for (const s of [-1, 1]) {
            const x = s * 25.5;
            p.shape(ellipse(x + s * 1.5, 37.5, 3.2, 4.2), H, { ow: 2.6, shade: false });
            p.shape(ellipse(x + s, 29, 4.6, 5.4), H, { ow: 2.8, shade: 1.6 });
            p.shape(ellipse(x + s * 0.5, 20, 5.2, 5.8), H, { ow: 2.8, shade: 1.6 });
            p.shape(ellipse(x, 11, 5.6, 6), H, { ow: 2.8, shade: 1.6 });
            p.shape(rrect(x + s * 1.2 - 3.6, 32.6, 7.2, 3.4, 1.5), l.accent, { ow: 1.8, shade: false });
          }
        },
        front: cap(LINE_PART),
      };
    case 'spiky':
      return {
        front: (p) => {
          p.shape(
            blob(
              [[-28.5, 6, 0], [-30, -8], [-34, -18, 0], [-25.5, -19.5], [-26, -32, 0], [-15, -26.5], [-10, -39, 0], [-1, -28.5], [8, -38, 0], [14, -27], [25, -31, 0], [25, -18.5], [33, -14, 0], [29, -5], [28.5, 2, 0], ...LINE_SIDE],
              0.8,
            ),
            H,
            { shade: 2.6 },
          );
          hairShine(p, H);
        },
      };
    case 'curly':
      return {
        front: (p) => {
          const puffs = merged(blob([...CAP, ...LINE_SIDE]), circle(-25, -3, 7.8), circle(-23, -15, 8.2), circle(-13.5, -24, 8.6), circle(-1, -27, 9), circle(11.5, -24.5, 8.6), circle(21.5, -16, 8), circle(25.5, -5.5, 6.6));
          p.shape(puffs, H, { shade: 2.8 });
          const s = shadeOf(H);
          p.stroke(arc(-13.5, -24, 5, 5, 20, 110), s, 1.4);
          p.stroke(arc(-1, -27, 5.4, 5.4, 10, 110), s, 1.4);
          p.stroke(arc(11.5, -24.5, 5, 5, 0, 110), s, 1.4);
          p.stroke(arc(-23, -15, 4.6, 4.6, 30, 110), s, 1.4);
          hairShine(p, H);
        },
      };
    case 'big':
      return {
        back: (p) => {
          const puffs = merged(
            circle(0, -6, 32),
            circle(-27, -11, 13.5),
            circle(-20, -26, 13.5),
            circle(-5, -33, 13.5),
            circle(11, -31, 13.5),
            circle(24, -21, 13.5),
            circle(30, -6, 12.5),
            circle(-32, 5, 12.5),
            circle(-31, 20, 11.5),
            circle(31.5, 9, 12),
            circle(30, 23, 10.5),
          );
          p.shape(puffs, H, { shade: 4 });
          const s = shadeOf(H);
          p.stroke(arc(-20, -26, 9, 9, 200, 90), lightOf(H), 2.2);
          p.stroke(arc(-31, 20, 7, 7, 20, 100), s, 1.6);
          p.stroke(arc(30, 23, 6.5, 6.5, 40, 100), s, 1.6);
          p.stroke(arc(-32, 5, 8, 8, 30, 80), s, 1.6);
        },
        front: cap(LINE_SWOOP),
      };
    case 'wild':
      return {
        back: (p) => {
          // A burst of tufts around the top and sides of the head.
          const pts: BlobPt[] = [];
          const n = 9;
          for (let i = 0; i <= n * 2; i++) {
            const a = ((205 - (i / (n * 2)) * 230) * Math.PI) / 180;
            const tip = i % 2 === 1;
            const r = tip ? 41 + (i % 4 === 1 ? 3 : 0) : 30;
            pts.push([Math.cos(a) * r * 1.02, -4 - Math.sin(a) * r * 0.95, tip ? 0 : 1]);
          }
          pts.push([20, 10], [-20, 10]);
          p.shape(blob(pts, 0.7), H, { shade: 3 });
        },
        front: (p) => {
          p.shape(blob([...CAP, [26, -9], [16, -19], [2, -22], [-12, -20], [-22, -12], [-26, 2]]), H, { shade: 2.2 });
          hairShine(p, H);
        },
      };
    default:
      return { front: cap(LINE_SIDE) };
  }
}

/** Hats that sit over the hair, so the hair above this line is hidden under them. */
function hairClipY(l: ResolvedLook): number | null {
  switch (l.hat) {
    case 'toque':
    case 'bandana':
    case 'cap':
    case 'tophat':
    case 'straw':
    case 'beanie':
      return -15;
    case 'helmet':
      return 9;
    default:
      return null;
  }
}

function dots(p: Pen, pts: readonly (readonly [number, number])[], r: number, color: string) {
  for (const [x, y] of pts) p.dot(x, y, r, color);
}

function drawToque(p: Pen, l: ResolvedLook) {
  const c = l.hatColor;
  const s = shadeOf(c);
  const top = merged(circle(-14, -34.5, 11.5), circle(0, -39, 13.5), circle(14, -34.5, 11.5), rrect(-20, -36, 40, 16, 4));
  p.shape(top, c, { shade: 3.2 });
  p.stroke(curve([[-7.5, -27], [-9, -36], [-5.5, -43]]), s, 1.5);
  p.stroke(curve([[7.5, -27], [9, -35], [6.5, -41]]), s, 1.5);
  p.shine(arc(-14, -34.5, 7, 7, 190, 70), '#FFFFFF', 2.2, 0.9);
  const band = blob([[-22.5, -13.5, 0], [-23.5, -25.5, 0], [0, -28], [23.5, -25.5, 0], [22.5, -13.5, 0], [0, -11.5]]);
  p.shape(band, c, { shade: 2 });
  for (const x of [-13, -4.5, 4.5, 13]) p.stroke(line(x, -24.5, x * 0.96, -16.5), s, 1.3);
  p.stroke(curve([[-21.5, -15.8], [0, -13.9], [21.5, -15.8]]), l.accent, 2.2);
}

function hatLayers(l: ResolvedLook): Layers {
  const c = l.hatColor;
  const s = shadeOf(c);
  switch (l.hat) {
    case 'toque':
      return {
        front: (p) => {
          p.c.save();
          p.c.rotate(-5, 0, -18);
          drawToque(p, l);
          p.c.restore();
        },
      };
    case 'minitoque':
      return {
        front: (p) => {
          const dome = l.outfitStyle === 'spacesuit';
          p.c.save();
          p.c.translate(dome ? 10 : 8, dome ? -30 : -21);
          p.c.rotate(14, 0, 0);
          p.c.scale(0.5, 0.5);
          p.c.translate(0, 12);
          const keep = p.ow;
          p.ow = keep * 1.5;
          drawToque(p, l);
          p.ow = keep;
          p.c.restore();
        },
      };
    case 'bandana':
      return {
        back: (p) => {
          p.shape(blob([[-27, -8], [-40, -10, 0], [-38, -1], [-28, -3]]), c, { ow: 2.6, shade: 1.5 });
          p.shape(blob([[-28, -5], [-38, 3], [-33.5, 10, 0], [-26, 0]]), c, { ow: 2.6, shade: 1.5 });
        },
        front: (p) => {
          p.shape(blob([[-28.8, -3, 0], [-29.8, -12], [-25, -20], [-15, -27.5], [0, -29.5], [15, -27.5], [25, -20], [29.8, -11], [28.5, -6, 0], [14, -11], [0, -12.5], [-14, -11]]), c, { shade: 2.6 });
          p.stroke(curve([[-27.5, -8], [-14, -15.5], [0, -17], [14, -15.5], [27.5, -10.5]]), s, 1.5);
          if (l.pattern === 'dots')
            dots(p, [[-19, -20], [-8, -24], [4, -22.5], [15, -22], [22, -15], [-24, -12]], 1.5, WHITE);
          p.shape(circle(-28.5, -5.5, 3.6), c, { ow: 2.4, shade: false });
          p.shine(arc(-10, -14, 14, 12, 215, 50), lightOf(c), 2.2, 0.8);
        },
      };
    case 'headscarf':
      return {
        front: (p) => {
          const band = blob([[-28.5, -1, 0], [-29.8, -9], [-24.8, -19.5], [-14, -27], [0, -29.3], [14, -27], [24.8, -19.5], [29.8, -9], [28.5, -3, 0], [23, -10.5], [13, -17], [0, -19.5], [-13, -17], [-23, -10]]);
          // Knot ears first so the band overlaps their roots.
          p.shape(blob([[9, -27], [2.5, -39.5, 0], [13.5, -34]]), c, { ow: 2.6, shade: 1.5 });
          p.shape(blob([[9, -27], [21, -37.5, 0], [16, -28.5]]), c, { ow: 2.6, shade: 1.5 });
          p.shape(band, c, { shade: 2 });
          p.shape(circle(9.5, -28, 3.8), c, { ow: 2.4, shade: false });
          if (l.pattern === 'dots')
            dots(p, [[-20.5, -17], [-10.5, -23.5], [0.5, -24.6], [19, -19.5], [-25.8, -8], [25.8, -9], [6.5, -34.5], [16.5, -33]], 1.5, WHITE);
        },
      };
    case 'cap':
      return {
        front: (p) => {
          p.shape(blob([[13, -13, 0], [28, -14], [41.5, -9], [43, -5.2], [38, -3.2], [25, -5.5], [13, -7, 0]]), s, { shade: 1.6 });
          p.shape(blob([[-29, -5, 0], [-29.8, -13], [-24, -21.5], [-14, -28], [0, -30], [14, -28], [24, -21.5], [29.8, -13], [29, -8, 0], [0, -10.5]]), c, { shade: 2.8 });
          p.stroke(curve([[1, -30], [4, -20], [3, -10.8]]), s, 1.4);
          p.shape(circle(0.5, -30.2, 2.3), c, { ow: 1.8, shade: false });
          p.shine(arc(-10, -15, 14, 12, 210, 50), lightOf(c), 2.2, 0.8);
        },
      };
    case 'beanie':
      return {
        front: (p) => {
          p.shape(circle(2, -36.5, 5.6), lightOf(l.accent === c ? WHITE : l.accent, 0.3), { ow: 2.6, shade: 1.4 });
          p.shape(blob([[-29, -9, 0], [-30, -17], [-25.5, -26.5], [-14.5, -33], [0, -35], [14.5, -33], [25.5, -26.5], [30, -17], [29, -9, 0], [0, -12]]), c, { shade: 2.8 });
          for (const x of [-12, 0, 12]) p.stroke(curve([[x * 1.15, -14], [x * 1.08, -24], [x * 0.7, -32]]), s, 1.3);
          const cuff = blob([[-30.5, -4.5, 0], [-31.5, -15.5, 0], [0, -19], [31.5, -15.5, 0], [30.5, -5.5, 0], [0, -8.5]]);
          p.shape(cuff, mix(c, s, 0.35), { shade: 1.6 });
          for (const x of [-24, -16, -8, 0, 8, 16, 24]) p.stroke(line(x, -16.4 + Math.abs(x) * 0.1, x, -9.2 + Math.abs(x) * 0.08), s, 1.3);
          p.shine(arc(-10, -18, 14, 12, 210, 50), lightOf(c), 2.2, 0.8);
        },
      };
    case 'tophat':
      return {
        front: (p) => {
          p.c.save();
          p.c.rotate(-6, 0, -22);
          const crown = done(builder().moveTo(-14.5, -22).lineTo(-16.5, -47).quadTo(-16.5, -50.5, -13, -50.5).lineTo(13, -50.5).quadTo(16.5, -50.5, 16.5, -47).lineTo(14.5, -22).close());
          p.shape(crown, c, { shade: 3 });
          p.fill(poly([[-15.2, -31.5], [15.2, -31.5], [14.6, -24], [-14.6, -24]]), l.accent);
          p.stroke(crown, OUTLINE, p.ow);
          p.shine(line(-10.5, -45, -9.6, -35), lightOf(c), 2.2, 0.55);
          p.shape(ellipse(0, -22.5, 26, 5.4), c, { shade: 1.6 });
          p.c.restore();
        },
      };
    case 'bow':
      return {
        front: (p) => {
          p.c.save();
          p.c.translate(11, -25.5);
          p.c.rotate(8, 0, 0);
          p.shape(blob([[0, 0], [-11, -9], [-13.5, 4]]), c, { ow: 2.6, shade: 1.6 });
          p.shape(blob([[0, 0], [11, -9.5], [14, 3.5]]), c, { ow: 2.6, shade: 1.6 });
          p.shape(circle(0, -0.5, 3.6), c, { ow: 2.4, shade: false });
          p.dot(-0.9, -1.5, 1, lightOf(c));
          p.c.restore();
        },
      };
    case 'helmet':
      return {
        front: (p) => {
          if (l.hairStyle !== 'bald' && l.species === 'human')
            p.shape(blob([[-12, -15, 0], [-10.5, -7.5, 0], [-5, -12.5], [-1.5, -6, 0], [4, -12.5], [8.5, -7, 0], [13, -12.5], [17, -9, 0], [19, -15, 0]], 0.6), l.hair, { ow: 2.4, shade: false });
          const shell = blob([[-31.5, 10.5, 0], [-33, -6], [-27.5, -20.5], [-16, -30.5], [0, -33.5], [16, -30.5], [27.5, -20.5], [33, -6], [31.5, 8.5, 0], [24.5, 7.5, 0], [25, -9.5, 0], [0, -14], [-22.5, -9.5, 0], [-23.5, 9.5, 0]]);
          p.shape(shell, c, { shade: 3.2 });
          const stripe = op(shell, poly([[-4.6, -8], [-5.6, -38], [5.6, -38], [4.6, -8]]), PathOp.Intersect);
          if (stripe) p.fill(stripe, WHITE);
          p.stroke(shell, OUTLINE, p.ow);
          p.shape(circle(-27.2, 2.5, 3.6), s, { ow: 2, shade: false });
          p.shine(arc(-8, -13, 20, 16, 204, 40), lightOf(c), 2.6, 0.85);
          if (l.glasses === 'goggles') {
            p.stroke(curve([[-30.5, -15.5], [-15, -24.5], [0, -26.5], [15, -24.5], [30.5, -14.5]]), INK, 4.4);
            for (const x of [FS - 8.5, FS + 8.5]) {
              p.shape(ellipse(x, -23, 7.6, 6.2), '#8A5A3A', { ow: 2.4, shade: false });
              p.fill(ellipse(x, -23, 5.2, 4), '#9ADCF2');
              p.dot(x - 1.7, -24.2, 1.4, '#FFFFFF');
            }
          } else {
            p.shape(blob([[6, -14.5, 0], [22, -15.5], [33.5, -9.5], [30, -7, 0], [20, -10.5], [6, -11, 0]]), s, { ow: 2.6, shade: false });
          }
        },
      };
    case 'straw':
      return {
        front: (p) => {
          p.c.save();
          p.c.rotate(-5, 0, -18);
          p.shape(ellipse(0, -19, 40, 8.2), c, { shade: 2.4 });
          p.stroke(curve([[-31, -18.5], [-22, -14.5], [-11, -12.8]]), s, 1.4);
          p.stroke(curve([[12, -12.8], [23, -14.5], [32, -18.5]]), s, 1.4);
          const crown = blob([[-19, -20, 0], [-18.5, -32], [-10, -40.5], [0, -42], [10, -40.5], [18.5, -32], [19, -20, 0]]);
          p.shape(crown, c, { shade: 3 });
          const band = op(crown, rrect(-30, -27.5, 60, 7, 0), PathOp.Intersect);
          if (band) p.fill(band, l.accent);
          p.stroke(crown, OUTLINE, p.ow);
          p.shine(arc(-6, -30, 9, 8, 200, 60), lightOf(c), 2.2, 0.8);
          p.c.restore();
        },
      };
    case 'crown':
      return {
        front: (p) => {
          p.c.save();
          p.c.rotate(7, 0, -22);
          const crown = done(
            builder()
              .moveTo(-15, -20.5)
              .lineTo(-17.5, -38.5)
              .lineTo(-8.5, -30)
              .lineTo(0, -42)
              .lineTo(8.5, -30)
              .lineTo(17.5, -38.5)
              .lineTo(15, -20.5)
              .quadTo(0, -25, -15, -20.5)
              .close(),
          );
          p.shape(crown, c, { shade: 2.6 });
          p.stroke(curve([[-14.8, -24.5], [0, -28.6], [14.8, -24.5]]), s, 1.5);
          for (const [x, y] of [[-17.5, -39], [0, -42.5], [17.5, -39]])
            p.shape(circle(x, y, 2.9), lightOf(c, 0.6), { ow: 1.8, shade: false });
          p.shape(circle(0, -31.5, 2.9), '#E63946', { ow: 1.5, shade: false });
          p.dot(-0.8, -32.3, 0.9, '#FFFFFF');
          p.dot(-9.5, -26.6, 1.6, '#4CC9F0');
          p.dot(9.5, -26.6, 1.6, '#4CC9F0');
          p.c.restore();
        },
      };
    default:
      return {};
  }
}

/** The two eyes that blink. An alien's third eye is part of the head and never closes. */
function eyeCentres(l: ResolvedLook): [number, number][] {
  if (l.species === 'alien')
    return [[FS - 11, 5.5], [FS + 11, 5.5]];
  return [[FS - EYE_DX, EYE_Y], [FS + EYE_DX, EYE_Y]];
}
const THIRD_EYE: [number, number] = [FS, -7.5];

/** Mouth height in head units: moustaches push the mouth down. */
export const mouthYFor = (l: ResolvedLook) => (l.moustache === 'bushy' ? 16.2 : l.moustache ? 15 : l.species === 'alien' ? 15.5 : 13.2);

function drawGlasses(p: Pen, l: ResolvedLook) {
  const g = l.glasses;
  if (!g || (g === 'goggles' && l.hat === 'helmet')) return;
  const x1 = FS - EYE_DX;
  const x2 = FS + EYE_DX;
  const frame = g === 'goggles' ? '#8A5A3A' : '#5B4636';
  if (g === 'goggles') {
    p.stroke(line(-27.5, EYE_Y - 1, 27.5, EYE_Y - 1), INK, 4.2, true);
    for (const x of [x1, x2]) {
      p.shape(circle(x, EYE_Y, 9.4), frame, { ow: 2.2, shade: false });
      p.fill(circle(x, EYE_Y, 7), '#BFE9F7');
      p.shine(arc(x, EYE_Y, 4.6, 4.6, 200, 60), '#FFFFFF', 1.5, 0.9);
    }
    return;
  }
  if (g === 'shades') {
    p.stroke(line(-27, EYE_Y - 2.5, x1 - 7, EYE_Y - 2), INK, 2);
    p.stroke(line(x1 + 7, EYE_Y - 2.5, x2 - 7, EYE_Y - 2.5), INK, 2.4);
    for (const x of [x1, x2]) {
      const lens = blob([[x - 8, EYE_Y - 5.5], [x + 8, EYE_Y - 5.5], [x + 7, EYE_Y + 4.5], [x, EYE_Y + 6.5], [x - 7, EYE_Y + 4.5]]);
      p.shape(lens, '#2F2B38', { ow: 2, shade: false });
      p.shine(line(x - 4.5, EYE_Y - 2.5, x - 1.5, EYE_Y - 3.6), '#FFFFFF', 1.6, 0.7);
    }
    return;
  }
  const lens = (x: number) => (g === 'square' ? rrect(x - 8.2, EYE_Y - 7, 16.4, 14, 4) : circle(x, EYE_Y, 8.4));
  p.stroke(line(-27, EYE_Y - 1.5, x1 - 8, EYE_Y - 1), frame, 1.8);
  p.stroke(curve([[x1 + 8, EYE_Y - 1.5], [FS, EYE_Y - 3.2], [x2 - 8, EYE_Y - 1.5]]), frame, 1.8);
  for (const x of [x1, x2]) {
    p.fill(lens(x), alpha('#FFFFFF', 0.28));
    p.stroke(lens(x), frame, 2.1);
    p.shine(line(x - 5, EYE_Y - 3.6, x - 2.8, EYE_Y - 5.2), '#FFFFFF', 1.4, 0.85);
  }
}

function drawBrows(p: Pen, l: ResolvedLook) {
  if (l.brows === 'none' || l.species === 'robot' || l.glasses === 'shades') return;
  const c = luma(l.hair) > 0.62 ? mix(l.hair, OUTLINE, 0.55) : mix(l.hair, OUTLINE, 0.35);
  const x1 = FS - EYE_DX;
  const x2 = FS + EYE_DX;
  const w = l.brows === 'thick' ? 3.3 : 2;
  switch (l.brows) {
    case 'smug':
      p.stroke(line(x1 - 5, -6.4, x1 + 5, -5), c, 2.4);
      p.stroke(curve([[x2 - 5, -8.6], [x2, -11.4], [x2 + 5.2, -9.4]]), c, 2.4);
      break;
    case 'worried':
      p.stroke(line(x1 - 5, -5.6, x1 + 4.5, -9), c, 2.2);
      p.stroke(line(x2 - 4.5, -9, x2 + 5, -5.6), c, 2.2);
      break;
    default:
      for (const x of [x1, x2])
        p.stroke(curve([[x - 4.8, -6.2], [x, -8 - (l.brows === 'thick' ? 0.4 : 0)], [x + 4.8, -6.4]]), c, w);
  }
}

function drawFacialHair(p: Pen, l: ResolvedLook) {
  const H = l.hair;
  if (l.beard === 'full') {
    p.shape(blob([[-27.3, 1], [-25, 14], [-16.5, 24.5], [0, 29], [16.5, 24.5], [25, 14], [27.3, 1], [22.5, 6.5], [15.5, 9.5], [FS + 9, 7.6], [FS, 6.8], [FS - 9, 7.6], [-15.5, 9.5], [-22.5, 6.5]]), H, { shade: 2.6 });
    // A little skin around the mouth so the smile still reads.
    p.fill(ellipse(FS, mouthYFor(l) + 0.6, 7.4, 4.6), l.skin);
  } else if (l.beard === 'goatee') {
    p.shape(blob([[FS - 6.5, 18.5], [FS, 17.2], [FS + 6.5, 18.5], [FS + 4.6, 25], [FS, 28], [FS - 4.6, 25]]), H, { ow: 2.4, shade: 1.4 });
  }
  if (!l.moustache) return;
  // A small nose gives the moustache something to sit under.
  p.stroke(curve([[FS + 0.5, 5.6], [FS + 3.2, 7.8], [FS + 0.2, 9.2]]), mix(l.skin, OUTLINE, 0.6), 1.8);
  const mx = FS + 0.6;
  if (l.moustache === 'bushy') {
    p.shape(blob([[mx, 10.2], [mx + 5, 9.4], [mx + 11.5, 11.8], [mx + 13.5, 15.6], [mx + 7, 15.4], [mx, 13.6], [mx - 7, 15.4], [mx - 13.5, 15.6], [mx - 11.5, 11.8], [mx - 5, 9.4]]), H, { ow: 2.3, shade: 1.5 });
  } else if (l.moustache === 'curled') {
    const oc = luma(H) < 0.3 ? mix(H, '#000000', 0.5) : OUTLINE;
    for (const s of [-1, 1]) {
      const c = curve([[mx, 11.6], [mx + s * 6, 12.8], [mx + s * 11.5, 11.4], [mx + s * 13.4, 7.6], [mx + s * 10.4, 6.6]]);
      p.stroke(c, oc, 4.8);
      p.stroke(c, H, 2.6);
    }
    p.dot(mx, 11.4, 2.2, H);
  } else {
    for (const s of [-1, 1])
      p.stroke(curve([[mx + s * 1.2, 10.8], [mx + s * 6, 10.2], [mx + s * 10.5, 12.4]]), mix(H, '#000000', 0.2), 2);
  }
}

function drawHeadFront(p: Pen, l: ResolvedLook) {
  const skin = l.skin;
  if (l.species === 'robot') {
    const dark = METAL_DARK;
    p.shape(rrect(-32, -3, 8, 13, 3), far(skin), { ow: 2.6, shade: false });
    p.shape(rrect(24, -3, 8, 13, 3), far(skin), { ow: 2.6, shade: false });
    if (l.hat === 'none') {
      p.stroke(line(0, -23, 0, -33), OUTLINE, 4.6);
      p.stroke(line(0, -23, 0, -33), dark, 2);
      p.shape(circle(0, -35.5, 4.4), l.eyes, { ow: 2.4, shade: false });
      p.dot(-1.2, -36.8, 1.3, '#FFFFFF');
    }
    p.shape(robotSkull(), skin, { shade: 3.4, light: 2 });
    p.shape(rrect(FS - 20, -10, 40, 28, 9), '#2E3B4E', { ow: 2.4, shade: false });
    if (l.blush) {
      p.fill(rrect(FS - 17, 9, 6, 3, 1.5), alpha('#FF7A9A', 0.9));
      p.fill(rrect(FS + 11, 9, 6, 3, 1.5), alpha('#FF7A9A', 0.9));
    }
    dots(p, [[-22, -18], [22, -18]], 1.5, dark);
    return;
  }
  // Ears.
  if (l.species === 'alien') {
    p.shape(blob([[-24, -4], [-39, -11, 0], [-26, 9]]), skin, { ow: 2.8, shade: 1.6 });
    p.shape(blob([[24, -4], [38, -10, 0], [26, 8]]), far(skin), { ow: 2.8, shade: false });
  } else {
    p.shape(ellipse(27, 4, 4.2, 5.6), far(skin), { ow: 2.8, shade: false });
    p.shape(ellipse(-26.8, 4.5, 5.2, 6.2), skin, { ow: 2.8, shade: 1.4 });
    p.stroke(arc(-27.6, 4.8, 2.3, 3, 80, 200), mix(skin, OUTLINE, 0.45), 1.3);
  }
  p.shape(skull(), skin, { shade: 3, shadeColor: shadeOf(skin, 0.7) });
  if (l.blush) {
    const b = l.species === 'alien' ? alpha(mix(skin, '#1F7A4C', 0.4), 0.8) : alpha(mix(skin, '#FF4D5E', 0.45), 0.82);
    p.fill(ellipse(FS - 18.5, 11.8, 5.2, 3.2), b);
    p.fill(ellipse(FS + 17.6, 11.8, 4.8, 3.2), b);
  }
  if (l.species === 'alien') {
    drawEyeball(p, THIRD_EYE[0], THIRD_EYE[1], 4, 5.4, true);
    // Antennae: outside the hat if there is one.
    const wide = l.hat !== 'none';
    for (const s of [-1, 1]) {
      const x0 = s * (wide ? 20 : 9);
      const y0 = wide ? -17 : -24;
      const stalk = curve([[x0, y0], [x0 + s * 3, y0 - 9], [x0 + s * 8, y0 - 14]]);
      p.stroke(stalk, OUTLINE, 5);
      p.stroke(stalk, shadeOf(skin), 2.2);
      p.shape(circle(x0 + s * 8.5, y0 - 15.5, 3.8), l.accent, { ow: 2.2, shade: false });
      p.dot(x0 + s * 8.5 - 1, y0 - 16.6, 1.1, '#FFFFFF');
    }
  }
}

function drawEyeball(p: Pen, x: number, y: number, rx: number, ry: number, alien: boolean) {
  p.fill(ellipse(x, y, rx, ry), INK);
  // A warm glint low in the eye, then the two highlights.
  p.fill(ellipse(x, y + ry * 0.42, rx * 0.66, ry * 0.4), alien ? '#2F6B4A' : '#6B4226');
  // Highlights sized so the main one stays at least 1 px across at scene scale (52 px characters).
  p.dot(x - rx * 0.34, y - ry * 0.4, Math.max(2.3, rx * 0.46), '#FFFFFF');
  p.dot(x + rx * 0.36, y + ry * 0.45, 1.1, alpha('#FFFFFF', 0.9));
}

function drawEyes(p: Pen, l: ResolvedLook) {
  if (l.glasses === 'shades') return;
  if (l.species === 'robot') {
    for (const [x, y] of eyeCentres(l)) {
      p.dot(x, y, 5.6, alpha(l.eyes, 0.35));
      p.dot(x, y, 4.2, l.eyes);
      p.dot(x - 1, y - 1.2, 1.5, '#FFFFFF');
    }
    return;
  }
  const alien = l.species === 'alien';
  // About 15% bigger than the first pass so faces still read at 52 px.
  const rx = alien ? 4.6 : 5.05;
  const ry = alien ? 6.2 : 6.9;
  eyeCentres(l).forEach(([x, y], i) => {
    drawEyeball(p, x, y, rx, ry, alien);
    if (l.lashes && !alien && !l.glasses) {
      const s = i === 0 ? -1 : 1;
      p.stroke(line(x + s * 3.4, y - 3.8, x + s * 6.4, y - 6.2), INK, 1.6);
      p.stroke(line(x + s * 4.2, y - 1.6, x + s * 7.2, y - 2.6), INK, 1.5);
    }
    if (l.brows === 'smug') {
      // Half-closed lids.
      p.fill(ellipse(x, y - ry * 0.95, rx + 1.4, ry * 0.62), l.skin);
      p.stroke(line(x - rx - 0.6, y - ry * 0.38, x + rx + 0.6, y - ry * 0.38), INK, 1.7);
    }
  });
}

function drawEyesShut(p: Pen, l: ResolvedLook) {
  if (l.glasses === 'shades') return;
  const c = l.species === 'robot' ? l.eyes : INK;
  eyeCentres(l).forEach(([x, y], i) => {
    p.stroke(curve([[x - 4.8, y + 1.8], [x, y - 2.6], [x + 4.8, y + 1.8]]), c, 2.6);
    if (l.lashes && l.species === 'human' && !l.glasses) {
      const s = i === 0 ? -1 : 1;
      p.stroke(line(x + s * 4.6, y + 1.4, x + s * 7, y - 0.4), INK, 1.5);
    }
  });
}

function drawMouth(p: Pen, l: ResolvedLook, kind: 'smile' | 'open' | 'chew') {
  const y = mouthYFor(l);
  if (l.species === 'robot') {
    const c = l.eyes;
    if (kind === 'smile')
      p.stroke(curve([[FS - 5, y - 2], [FS, y + 1], [FS + 5, y - 2]]), c, 2.2);
    else if (kind === 'open') p.fill(rrect(FS - 5.5, y - 3, 11, 6.5, 2.5), c);
    else p.fill(rrect(FS - 3, y - 2.5, 6, 4.5, 2), c);
    return;
  }
  if (kind === 'smile') {
    const smug = l.brows === 'smug';
    p.stroke(
      smug
        ? curve([[FS - 4.5, y + 0.6], [FS + 0.5, y + 2], [FS + 5.6, y - 2]])
        : curve([[FS - 4.8, y - 1], [FS, y + 2.5], [FS + 4.8, y - 1]]),
      OUTLINE,
      2.3,
    );
    return;
  }
  if (kind === 'open') {
    const m = blob([[FS - 5.6, y - 1.6, 0], [FS + 5.6, y - 1.6, 0], [FS + 4.4, y + 3.8], [FS, y + 6.2], [FS - 4.4, y + 3.8]]);
    p.fill(m, MOUTH_DARK);
    p.fill(ellipse(FS, y + 4.4, 2.9, 1.7), TONGUE);
    p.stroke(m, OUTLINE, 2);
    return;
  }
  // Chewing: a bulging cheek on the facing side and a small busy mouth.
  const cx = FS + 16.2;
  const cy = 10.8;
  p.fill(circle(cx, cy, 7.4), l.skin);
  p.fill(ellipse(cx + 0.6, cy + 1, 4.8, 3.2), alpha(mix(l.skin, '#FF4D5E', 0.45), 0.85));
  p.stroke(arc(cx, cy, 7.4, 7.4, -75, 150), OUTLINE, 2.4);
  p.fill(ellipse(FS + 1.5, y + 0.6, 3, 2.3), MOUTH_DARK);
  p.stroke(ellipse(FS + 1.5, y + 0.6, 3, 2.3), OUTLINE, 1.8);
}

function clipBelow(p: Pen, y: number | null, fn: () => void) {
  if (y === null) {
    fn();
    return;
  }
  p.c.save();
  p.c.clipRect({ x: -80, y, width: 160, height: 160 }, ClipOp.Intersect, false);
  const keep = p.boxTop;
  p.boxTop = y;
  fn();
  p.boxTop = keep;
  p.c.restore();
}

/** The space helmet: a glass dome around the whole head. */
function drawDome(p: Pen, front: boolean) {
  if (!front) {
    p.fill(circle(0, -2, 34.5), alpha('#BFE6F5', 0.3));
    return;
  }
  p.fill(circle(0, -2, 34.5), alpha('#DFF4FB', 0.14));
  p.stroke(arc(0, -2, 34.5, 34.5, 128, 284), OUTLINE, p.ow);
  p.shine(arc(0, -2, 29, 29, 198, 52), '#FFFFFF', 3.2, 0.8);
  p.dot(-13, -27.5, 1.6, alpha('#FFFFFF', 0.85));
}

interface HeadPictures {
  headBack: SkPicture;
  head: SkPicture;
  eyes: SkPicture;
  eyesShut: SkPicture;
  mouthSmile: SkPicture;
  mouthOpen: SkPicture;
  mouthChew: SkPicture;
}

/** What sits behind the body: the back of the hair, hat tails, the far side of a space helmet. */
function paintHeadBack(p: Pen, l: ResolvedLook) {
  const hair = l.species === 'robot' ? {} : hairLayers(l);
  if (l.outfitStyle === 'spacesuit') drawDome(p, false);
  if (hair.back) clipBelow(p, hairClipY(l), () => hair.back!(p));
  hatLayers(l).back?.(p);
}

/** The head itself with everything that never moves on it; eyes and mouth are drawn separately. */
function paintHead(p: Pen, l: ResolvedLook) {
  drawHeadFront(p, l);
  if (l.species !== 'robot') {
    const hair = hairLayers(l);
    drawFacialHair(p, l);
    if (hair.front) clipBelow(p, hairClipY(l), () => hair.front!(p));
    drawBrows(p, l);
    if (l.earrings) {
      p.shape(circle(-27.8, 12.4, 2.7), l.earrings, { ow: 1.6, shade: false });
      p.dot(-28.6, 11.6, 0.9, '#FFFFFF');
    }
  }
  drawGlasses(p, l);
  if (l.outfitStyle === 'spacesuit') drawDome(p, true);
  hatLayers(l).front?.(p);
}

/** Everything above the neck. `ow` is the outline width (thinner for big portraits). */
export function drawHeadPictures(l: ResolvedLook, ow = 3.4, bounds?: Bounds): HeadPictures {
  const rec = (fn: (p: Pen) => void) => record(fn, OUTLINE, ow);
  const measured = (fn: (p: Pen) => void) => (p: Pen) => {
    p.box = bounds ?? null;
    fn(p);
    p.box = null;
  };
  return {
    headBack: rec(measured((p) => paintHeadBack(p, l))),
    head: rec(measured((p) => paintHead(p, l))),
    eyes: rec((p) => drawEyes(p, l)),
    eyesShut: rec((p) => drawEyesShut(p, l)),
    mouthSmile: rec((p) => drawMouth(p, l, 'smile')),
    mouthOpen: rec((p) => drawMouth(p, l, 'open')),
    mouthChew: rec((p) => drawMouth(p, l, 'chew')),
  };
}

// ---------------------------------------------------------------------------
// Body
// ---------------------------------------------------------------------------

function torsoPath(d: BodyDims, flare = 0, hem = 0): SkPath {
  const { torso: T, shW: S, belW: B, hipW: H } = d;
  if (!flare)
    return blob([[-S + 4, -T - 1.5], [S - 4, -T - 1.5], [S + 0.5, -T + 4.5], [B, -T * 0.4], [H, -1.5], [H - 4.5, 3.6], [0, 4.6], [-H + 4.5, 3.6], [-H, -1.5], [-B, -T * 0.4], [-S - 0.5, -T + 4.5]]);
  const W = H + flare;
  const y = 4 + hem;
  return blob([[-S + 4, -T - 1.5], [S - 4, -T - 1.5], [S + 0.5, -T + 4.5], [B - 1.5, -T * 0.46], [W - 1.5, y - 6], [W, y, 0], [0, y + 1.8], [-W, y, 0], [-W + 1.5, y - 6], [-B + 1.5, -T * 0.46], [-S - 0.5, -T + 4.5]]);
}

/** Fills the part of `body` covered by `cut` (stripes, belts, trims), with no clip left in the picture. */
function inlay(p: Pen, body: SkPath, cut: SkPath, color: string) {
  const r = op(body, cut, PathOp.Intersect);
  if (r) p.fill(r, color);
}

function drawPattern(p: Pen, l: ResolvedLook, body: SkPath, T: number, B: number, bottom: number) {
  if (l.pattern === 'pinstripe') {
    const b = builder();
    for (let x = -B - 4; x <= B + 4; x += 5.2) b.addRect({ x: x + FS * 0.3, y: -T - 4, width: 1.1, height: T + bottom + 12 });
    inlay(p, body, done(b), mix(l.outfit, '#FFFFFF', 0.45));
  } else if (l.pattern === 'stripes') {
    const b = builder();
    for (let y = -T + 6; y < bottom + 2; y += 8) b.addRect({ x: -B - 10, y, width: B * 2 + 20, height: 3.6 });
    inlay(p, body, done(b), l.accent);
  } else if (l.pattern === 'dots') {
    const b = builder();
    let row = 0;
    for (let y = -T + 6; y < bottom + 1; y += 6.5, row++) for (let x = -B - 6 + (row % 2) * 4; x <= B + 6; x += 8) b.addCircle(x, y, 1.5);
    inlay(p, body, done(b), l.accent);
  }
}

function drawNeck(p: Pen, l: ResolvedLook, T: number) {
  const x = FS * 0.5;
  const c = l.accent;
  switch (l.neck) {
    case 'kerchief':
      p.shape(blob([[-9, -T - 1], [9, -T - 1], [6, -T + 6], [x, -T + 12.5, 0], [-6, -T + 6]]), c, { ow: 2.4, shade: 1.6 });
      p.stroke(line(x - 3, -T + 5.2, x + 3, -T + 5.2), shadeOf(c), 1.4);
      break;
    case 'bowtie': {
      // Waiters get a big bow tie (part of the uniform that reads at 52 px); suits a smaller one.
      const k = l.outfitStyle === 'vest' ? 1.4 : 1.15;
      const y = -T + 6.5 * (k > 1.3 ? 1.12 : 1);
      const wx = 6.5 * k;
      const wy = 3.8 * k;
      p.shape(blob([[x, y - 0.6 * k, 0], [x - wx * 0.55, y - wy * 1.05], [x - wx, y - wy * 0.9], [x - wx * 0.92, y + wy * 0.95], [x - wx * 0.5, y + wy * 1.05], [x, y + 0.6 * k, 0]]), c, { ow: 2.4, shade: false });
      p.shape(blob([[x, y - 0.6 * k, 0], [x + wx * 0.55, y - wy * 1.05], [x + wx, y - wy * 0.9], [x + wx * 0.92, y + wy * 0.95], [x + wx * 0.5, y + wy * 1.05], [x, y + 0.6 * k, 0]]), c, { ow: 2.4, shade: false });
      p.shine(line(x - wx * 0.75, y - wy * 0.45, x - wx * 0.35, y - wy * 0.62), lightOf(c, 1.4), 1.2, 0.8);
      p.shape(circle(x, y, 2 * k), c, { ow: 2, shade: false });
      break;
    }
    case 'tie':
      p.shape(poly([[x - 2.2, -T + 3.5], [x + 2.2, -T + 3.5], [x + 3, -T * 0.58], [x, -T * 0.48], [x - 3, -T * 0.58]]), c, { ow: 1.8, shade: false });
      break;
    case 'scarf':
      p.shape(rrect(-10, -T - 0.5, 20, 7, 3.4), c, { ow: 2.4, shade: 1.4 });
      p.shape(blob([[x + 2, -T + 5], [x + 8, -T + 6], [x + 8.5, -T + 15, 0], [x + 3, -T + 14, 0]]), c, { ow: 2.2, shade: false });
      break;
    default:
  }
}

function drawTorso(p: Pen, l: ResolvedLook, d: BodyDims) {
  const { torso: T, belW: B, shW: S, hipW: H } = d;
  const x = FS * 0.5;
  const ink = (path: SkPath, w = 1.5, c = OUTLINE) => p.stroke(path, c, w);
  if (l.species === 'robot') {
    const body = rrect(-B + 1.5, -T - 1.5, B * 2 - 3, T + 5.5, 7.5);
    const c = l.outfit === WHITE ? l.skin : l.outfit;
    p.shape(body, c, { shade: 3.4, light: 1.8 });
    p.shape(rrect(x - 8, -T * 0.74, 16, 11, 3), '#2E3B4E', { ow: 2, shade: false });
    p.dot(x - 4, -T * 0.74 + 5.5, 1.8, l.eyes);
    p.stroke(line(x, -T * 0.74 + 3.5, x + 5, -T * 0.74 + 3.5), l.accent, 1.5);
    p.stroke(line(x, -T * 0.74 + 7, x + 3.6, -T * 0.74 + 7), '#FFD166', 1.5);
    dots(p, [[-B + 5.5, -T + 3], [B - 5.5, -T + 3], [-B + 5.5, 0], [B - 5.5, 0]], 1.3, METAL_DARK);
    ink(line(-B + 4, -T * 0.25, B - 4, -T * 0.25), 1.4, shadeOf(c));
    drawNeck(p, l, T);
    drawApron(p, l, d, 3.6);
    return;
  }
  const style = l.outfitStyle;
  let bottom = 4.6;
  if (style === 'dress' || style === 'coat' || style === 'robe') {
    const flare = style === 'dress' ? 5.5 : style === 'coat' ? 3 : 6;
    const hem = style === 'dress' ? 3.5 : style === 'coat' ? 6 : Math.max(4, d.leg - 9);
    bottom = 4 + hem;
    const body = torsoPath(d, flare, hem);
    if (style === 'coat') {
      p.shape(body, WHITE, { shade: 4 });
      // The shirt and tie show in the opening.
      p.fill(poly([[-6, -T - 2], [6, -T - 2], [x + 1.2, -T * 0.5], [x - 1.2, -T * 0.5]]), l.outfit);
      ink(line(-6, -T - 2, x - 1.2, -T * 0.5));
      ink(line(6, -T - 2, x + 1.2, -T * 0.5));
      ink(line(x, -T * 0.5, x, bottom + 1));
      ink(rrect(B * 0.3, -T * 0.4, 7, 6.5, 1.5), 1.3, shadeOf(WHITE));
      p.stroke(line(B * 0.3 + 2.2, -T * 0.4 - 2.5, B * 0.3 + 2.2, -T * 0.4 + 1.5), l.accent, 1.6);
      dots(p, [[x - 4, -T * 0.3], [x - 4, -T * 0.08]], 1.3, shadeOf(WHITE, 2));
      p.stroke(body, OUTLINE, p.ow);
    } else if (style === 'robe') {
      p.shape(body, l.outfit, { shade: 4 });
      inlay(p, body, rrect(-60, bottom - 4.5, 120, 12, 0), l.accent);
      p.stroke(line(x, -T + 6, x, bottom - 4.5), l.accent, 2);
      p.stroke(body, OUTLINE, p.ow);
      p.shape(ellipse(0, -T + 2.5, 12.5, 5.2), l.accent, { ow: 2.4, shade: 1.4 });
      p.shape(circle(x, -T + 4.4, 2.5), '#E63946', { ow: 1.5, shade: false });
    } else {
      p.shape(body, l.outfit, { shade: 4 });
      drawPattern(p, l, body, T, H + flare, bottom);
      inlay(p, body, rrect(-60, -T * 0.47, 120, 3.4, 0), l.pattern === 'plain' ? l.accent : shadeOf(l.outfit));
      p.stroke(body, OUTLINE, p.ow);
      if (l.earrings)
        p.stroke(curve([[-6.5, -T + 3.5], [x, -T + 8], [6.5, -T + 3.5]]), l.earrings, 1.8);
    }
    drawNeck(p, l, T);
    drawApron(p, l, d, bottom - 0.5);
    return;
  }
  const body = torsoPath(d);
  switch (style) {
    case 'chef': {
      p.shape(body, l.outfit, { shade: 4 });
      ink(curve([[x + 4.5, -T + 3], [x + 6.5, -T * 0.5], [x + 5, 3]]), 1.4, shadeOf(l.outfit, 1.6));
      const bc = luma(l.outfit) > 0.6 ? l.accent : WHITE;
      dots(p, [[x - 4, -T * 0.62], [x + 3.4, -T * 0.62], [x - 4, -T * 0.36], [x + 3.4, -T * 0.36]], 1.6, bc);
      break;
    }
    case 'vest': {
      p.shape(body, WHITE, { shade: 4 });
      const vest = op(body, poly([[-6, -T - 4], [6.5, -T - 4], [x, -T * 0.74]]), PathOp.Difference);
      if (vest) {
        p.fill(vest, l.outfit);
        p.stroke(vest, OUTLINE, 1.6);
      }
      dots(p, [[x, -T * 0.6], [x, -T * 0.42]], 1.5, '#FFD166');
      p.stroke(body, OUTLINE, p.ow);
      break;
    }
    case 'suit': {
      p.shape(body, l.outfit, { shade: 4 });
      drawPattern(p, l, body, T, B, bottom);
      p.fill(poly([[-6, -T - 2], [6, -T - 2], [x, -T * 0.5]]), WHITE);
      ink(line(-6, -T - 2, x, -T * 0.5));
      ink(line(6, -T - 2, x, -T * 0.5));
      dots(p, [[x, -T * 0.34], [x, -T * 0.16]], 1.4, mix(l.outfit, '#000000', 0.45));
      p.stroke(body, OUTLINE, p.ow);
      break;
    }
    case 'overalls': {
      const shirt = luma(l.accent) > 0.85 ? l.accent : WHITE;
      p.shape(body, shirt, { shade: 4 });
      if (l.pattern === 'stripes') {
        const b = builder();
        for (let yy = -T + 2; yy < 0; yy += 6) b.addRect({ x: -B - 6, y: yy, width: B * 2 + 12, height: 2.6 });
        inlay(p, body, done(b), l.accent);
      }
      inlay(p, body, rrect(-60, -T * 0.34, 120, 60, 0), l.outfit);
      p.stroke(body, OUTLINE, p.ow);
      for (const s of [-1, 1]) {
        const strap = line(x + s * 6.5, -T * 0.7, s * (S - 5), -T - 1);
        p.stroke(strap, OUTLINE, 5.4, true);
        p.stroke(strap, l.outfit, 3, true);
      }
      p.shape(rrect(x - 8.5, -T * 0.74, 17, T * 0.44, 3), l.outfit, { ow: 2.2, shade: 1.6 });
      dots(p, [[x - 5.6, -T * 0.66], [x + 5.6, -T * 0.66]], 1.5, '#FFD166');
      ink(rrect(x - 4, -T * 0.52, 8, 5, 1.5), 1.2, shadeOf(l.outfit, 1.4));
      break;
    }
    case 'spacesuit': {
      p.shape(body, l.outfit, { shade: 4 });
      inlay(p, body, rrect(-60, -T * 0.24, 120, 3.6, 0), l.accent);
      p.stroke(body, OUTLINE, p.ow);
      p.shape(rrect(x - 7.5, -T * 0.7, 15, 9.5, 2.6), '#D5E0EA', { ow: 1.8, shade: false });
      p.dot(x - 4, -T * 0.7 + 4.7, 1.5, '#E63946');
      p.dot(x, -T * 0.7 + 4.7, 1.5, '#FFD166');
      p.dot(x + 4, -T * 0.7 + 4.7, 1.5, '#4CC9F0');
      p.shape(ellipse(0, -T + 1.5, 12.5, 4.6), '#C9D4DF', { ow: 2.4, shade: 1.4 });
      break;
    }
    default: {
      p.shape(body, l.outfit, { shade: 4 });
      drawPattern(p, l, body, T, B, bottom);
      if (l.pattern !== 'plain') p.stroke(body, OUTLINE, p.ow);
      else if (l.kind === 'customer') {
        // A simple collar keeps plain tops from looking empty.
        p.stroke(curve([[-7, -T + 3.4], [x, -T + 8.2], [7, -T + 3.4]]), l.accent, 2.2);
      }
    }
  }
  if (l.neck === 'sash') {
    const sash = op(body, poly([[-S - 2, -T + 5], [-S + 5, -T - 3], [B + 2, -T * 0.2], [B - 2, 1]]), PathOp.Intersect);
    if (sash) {
      p.fill(sash, l.accent);
      p.stroke(sash, OUTLINE, 1.5);
    }
    p.stroke(body, OUTLINE, p.ow);
    p.shape(circle(B - 6.5, -T * 0.16, 3.4), '#FFC93C', { ow: 1.6, shade: false });
  }
  drawNeck(p, l, T);
  drawApron(p, l, d, bottom - 1);
}

function drawApron(p: Pen, l: ResolvedLook, d: BodyDims, bottom: number) {
  if (!l.apron) return;
  const { torso: T, belW: B, hipW: H } = d;
  const x = FS * 0.4;
  const c = l.apron;
  const waiter = l.outfitStyle === 'vest';
  // A waiter's waist apron sits low, so the uniform vest shows above it.
  const waist = waiter ? -T * 0.27 : -T * 0.44;
  const skirt = blob([[-B + 3.2, waist, 0], [B - 3.2, waist, 0], [H - 2.2 + (bottom > 5 ? 2 : 0), bottom - 2], [0, bottom - 0.4], [-H + 2.2 - (bottom > 5 ? 2 : 0), bottom - 2]]);
  // Waiters wear a waist apron; everyone else gets a bib.
  const shape = waiter ? skirt : merged(skirt, rrect(x - 7.8, -T * 0.8, 15.6, T * 0.42, 3.4));
  if (!waiter)
    for (const s of [-1, 1]) {
      const strap = line(x + s * 6.6, -T * 0.78, s * 4.5, -T - 1.5);
      p.stroke(strap, OUTLINE, 4.6, true);
      p.stroke(strap, c, 2.2, true);
    }
  p.shape(shape, c, { ow: 2.6, shade: 2.4 });
  const s = shadeOf(c, 1.5);
  p.stroke(line(-B + 4.5, waist + 0.4, B - 4.5, waist + 0.4), s, 1.4);
  p.stroke(
    curve(
      [[x - 5, waist + 5.5], [x - 5, waist + 11], [x + 5, waist + 11], [x + 5, waist + 5.5]],
      0.6,
    ),
    s,
    1.4,
  );
}

function sleeveInfo(l: ResolvedLook): { color: string; short: boolean; hand: string; wide: boolean } {
  const base = { short: false, hand: l.skin, wide: false };
  if (l.species === 'robot') return { ...base, color: shadeOf(l.skin, 0.8), hand: METAL_DARK };
  switch (l.outfitStyle) {
    case 'tee':
      return { ...base, color: l.outfit, short: true };
    case 'dress':
      return { ...base, color: l.outfit, short: true };
    case 'overalls':
      return { ...base, color: luma(l.accent) > 0.85 ? l.accent : WHITE, short: true };
    case 'vest':
    case 'coat':
      return { ...base, color: WHITE };
    case 'spacesuit':
      return { ...base, color: l.outfit, hand: l.accent };
    case 'robe':
      return { ...base, color: l.outfit, wide: true };
    default:
      return { ...base, color: l.outfit };
  }
}

function drawArm(p: Pen, l: ResolvedLook, d: BodyDims) {
  const A = d.arm;
  const s = sleeveInfo(l);
  const ow = 2.9;
  if (s.short) {
    p.shape(capsule(0, A * 0.3, 0, A - 2, 3.7), l.skin, { ow, shade: false });
    p.shape(capsule(0, 0, 0, A * 0.38, 4.9), s.color, { ow, shade: 1.4 });
  } else if (s.wide) {
    p.shape(blob([[-4.4, -2], [4.4, -2], [6.6, A - 3.5], [-6.6, A - 3.5]]), s.color, { ow, shade: 1.4 });
    p.stroke(line(-5.6, A - 5, 5.6, A - 5), l.accent, 2);
  } else {
    p.shape(capsule(0, 0, 0, A - 3.4, 4.7), s.color, { ow, shade: 1.4 });
    if (l.outfitStyle === 'suit') p.stroke(line(-3.6, A - 4, 3.6, A - 4), WHITE, 1.8, true);
    if (l.outfitStyle === 'spacesuit') p.stroke(line(-4, A - 5.4, 4, A - 5.4), l.accent, 2.2, true);
    if (l.species === 'robot') p.dot(0, A * 0.42, 2.1, METAL_DARK);
  }
}

function drawHand(p: Pen, l: ResolvedLook) {
  p.shape(circle(0, 0, 5.2), sleeveInfo(l).hand, { ow: 2.9, shade: 1.3 });
}

function drawLeg(p: Pen, l: ResolvedLook, d: BodyDims, front: boolean) {
  const L = d.leg;
  const tone = (c: string) => (front ? c : far(c));
  const bare = l.outfitStyle === 'dress' && l.species !== 'robot';
  const robot = l.species === 'robot';
  const c = robot ? shadeOf(l.skin, 0.8) : bare ? l.skin : l.pants;
  const ow = 2.9;
  p.shape(capsule(0, 0, 0, L - 6.5, bare ? 4 : 4.9), tone(c), { ow, shade: front ? 1.4 : false });
  if (l.outfitStyle === 'spacesuit') p.stroke(line(-4.4, L - 9, 4.4, L - 9), tone(l.accent), 2.2, true);
  const shoe = blob([[-5.6, L - 3.4], [-4.4, L - 7.6], [2.2, L - 8], [8.4, L - 5.6], [10, L - 2.2], [8, L], [-4.6, L]]);
  p.shape(shoe, tone(robot ? METAL_DARK : l.shoes), { ow, shade: front ? 1.3 : false });
  if (front) p.shine(line(4.2, L - 5.6, 6.6, L - 4.4), lightOf(robot ? METAL_DARK : l.shoes), 1.4, 0.7);
}

// ---------------------------------------------------------------------------
// The full set, cached per look
// ---------------------------------------------------------------------------

export interface CharacterArt extends HeadPictures {
  key: string;
  look: ResolvedLook;
  dims: BodyDims;
  torso: SkPicture;
  /** One sleeve, used for both arms; the hand is separate so a stretched arm keeps a round hand. */
  arm: SkPicture;
  hand: SkPicture;
  legF: SkPicture;
  legB: SkPicture;
  /** The top of the head, hair and hat, in head units above the middle of the head (a negative number). */
  top: number;
}

function buildCharacterArt(l: ResolvedLook, key: string): CharacterArt {
  const d = dimsFor(l);
  const bounds = emptyBounds();
  const head = drawHeadPictures(l, 3.4, bounds);
  return {
    key,
    look: l,
    dims: d,
    top: Number.isFinite(bounds.t) ? bounds.t : -30,
    ...head,
    torso: record((p) => drawTorso(p, l, d)),
    arm: record((p) => drawArm(p, l, d)),
    hand: record((p) => drawHand(p, l)),
    legF: record((p) => drawLeg(p, l, d, true)),
    legB: record((p) => drawLeg(p, l, d, false)),
  };
}

/**
 * Keeps drawings alive while something on screen uses them. Sets in use are
 * held by a count; unused ones wait in a small queue before their pictures
 * are freed, so a returning customer is usually free.
 */
class ArtCache<T extends { key: string }> {
  /** The drawings to hand out for a key. */
  private map = new Map<string, T>();
  /**
   * How many components hold each set of drawings. Counted per SET, not per key: two sets for the
   * same key can exist for a moment (one dropped from the table while a component that got it
   * during render has not committed yet, one built since), and freeing by key then freed drawings
   * that were still on screen.
   */
  private refs = new Map<T, number>();
  /** Sets nobody holds, oldest first; they are freed once more than `idleMax` wait here. */
  private idle: T[] = [];
  constructor(private idleMax: number) {}

  /** The drawings for `key`, built on first use. Safe to call during render. */
  get(key: string, build: () => T): T {
    let art = this.map.get(key);
    if (!art) {
      art = build();
      this.map.set(key, art);
      this.refs.set(art, 0);
      // Not trimmed here: drawings made during a render are claimed a moment later, in the effect.
      this.idle.push(art);
    }
    return art;
  }

  retain(art: T) {
    const held = this.refs.get(art) ?? 0;
    if (held === 0) {
      const i = this.idle.indexOf(art);
      if (i >= 0) this.idle.splice(i, 1);
    }
    this.refs.set(art, held + 1);
    // Dropped from the table between render and commit: findable again, unless a newer set took its key.
    if (!this.map.has(art.key)) this.map.set(art.key, art);
  }

  release(art: T) {
    const held = (this.refs.get(art) ?? 0) - 1;
    if (held > 0) {
      this.refs.set(art, held);
      return;
    }
    this.refs.set(art, 0);
    if (!this.idle.includes(art)) this.idle.push(art);
    while (this.idle.length > this.idleMax) {
      const old = this.idle.shift()!;
      if ((this.refs.get(old) ?? 0) > 0) continue;
      if (this.map.get(old.key) === old) this.map.delete(old.key);
      this.dispose(old);
    }
  }

  private dispose(art: T) {
    // Wait a moment: a canvas may still hold the last frame that used these, and a component that
    // got them during a render may be about to claim them.
    setTimeout(() => {
      if ((this.refs.get(art) ?? 0) > 0) return;
      // Somebody found it in the table again and may be mid-render with it: let it wait its turn again.
      if (this.map.get(art.key) === art) {
        if (!this.idle.includes(art)) this.idle.push(art);
        return;
      }
      this.refs.delete(art);
      for (const v of Object.values(art) as unknown[]) {
        const free = v && typeof v === 'object' ? (v as { dispose?: unknown }).dispose : null;
        if (typeof free === 'function') free.call(v);
      }
    }, 3000);
  }
}

const characters = new ArtCache<CharacterArt>(32);

/**
 * The drawings for a look, built on first use. Safe to call during render.
 * Components that keep them on screen call `retainCharacterArt` in an effect
 * and `releaseCharacterArt` in its cleanup.
 */
export function getCharacterArt(l: ResolvedLook): CharacterArt {
  const key = lookKey(l);
  return characters.get(key, () => buildCharacterArt(l, key));
}

export const retainCharacterArt = (art: CharacterArt) => characters.retain(art);
export const releaseCharacterArt = (art: CharacterArt) => characters.release(art);

// ---------------------------------------------------------------------------
// Portraits
// ---------------------------------------------------------------------------

/** `calm`: a small smile and open eyes that blink. `happy`: laughing, eyes squeezed shut. */
export type BustMood = 'calm' | 'happy';

/** How far below the middle of the head a portrait is cut off, in head units: just under the collar. */
export const BUST_BOTTOM = 40;

export interface BustArt {
  key: string;
  /** Everything that holds still: hair behind, shoulders, head, mouth. Origin at the middle of the head, in head units. */
  base: SkPicture;
  /** Open eyes, drawn over `base` and squashed to blink; null when the mood keeps them shut. */
  eyes: SkPicture | null;
  /** What the head, hair and hat cover; the shoulders are not counted. */
  bounds: Bounds;
}

function buildBustArt(l: ResolvedLook, key: string, ow: number, mood: BustMood): BustArt {
  const d = dimsFor(l);
  const k = 1 / d.headScale;
  const bounds = emptyBounds();
  const base = record(
    (p) => {
      p.box = bounds;
      paintHeadBack(p, l);
      p.box = null;
      // The body, standing as in the idle pose, around a head drawn at full size.
      p.c.save();
      p.c.scale(k, k);
      p.c.translate(0, d.headUp + d.torso);
      drawTorso(p, l, d);
      for (const s of [-1, 1])
        p.at(
          s * d.shoulderX,
          -d.shoulderY,
          () => {
            drawArm(p, l, d);
            p.c.translate(0, d.arm);
            drawHand(p, l);
          },
          -s * 7.5,
        );
      p.c.restore();
      p.box = bounds;
      paintHead(p, l);
      p.box = null;
      if (mood === 'happy') {
        drawEyesShut(p, l);
        drawMouth(p, l, 'open');
      } else drawMouth(p, l, 'smile');
    },
    OUTLINE,
    ow,
  );
  return { key, base, eyes: mood === 'happy' ? null : record((p) => drawEyes(p, l), OUTLINE, ow), bounds };
}

const busts = new ArtCache<BustArt>(24);

/** Portrait drawings for a look at one outline weight. Same rules as `getCharacterArt`. */
export function getBustArt(l: ResolvedLook, ow = 3.4, mood: BustMood = 'calm'): BustArt {
  const key = `${ow}|${mood}|${lookKey(l)}`;
  return busts.get(key, () => buildBustArt(l, key, ow, mood));
}

export const retainBustArt = (art: BustArt) => busts.retain(art);
export const releaseBustArt = (art: BustArt) => busts.release(art);

/** The height of the eye line in head units; eyes blink by squashing towards it. */
export const EYE_LINE = EYE_Y;
