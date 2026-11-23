/**
 * One prop per person (spec 7.3): the thing that says who they are at a glance. A spokesperson's
 * prop says their club; a lobbyist's their absurd trade; a rival's their hobby. Each prop draws in
 * its own frame centred on the origin, about 24 units across, and has a default place on the bust
 * (`PROPS[id].at`), in front of the clothes or behind the shoulders.
 *
 * Nothing here is a weapon, a drink, money, a flag, a seal or a symbol of any faith or group.
 */
import { FillType, type SkCanvas } from '@shopify/react-native-skia';
import { P, alpha, arc, blob, builder, circle, clip, curve, fill, hatch, ink, line, mix, oval, poly, rrect, stroke, wash, type Pen } from './ink';

type PropDraw = (c: SkCanvas, pen: Pen, accent: string) => void;

export interface PropDef {
  draw: PropDraw;
  /** Default place on the bust (design units) and turn in degrees; `back` draws behind the body. */
  at: { x: number; y: number; deg: number; s?: number; back?: boolean };
  /** The cut-out figure holds it at the hand (true) or wears it (false: drawn at the shoulder). */
  held?: boolean;
}

const BRASS = P.brass;
const BRASS_DEEP = P.brassDeep;
const PAPER = '#F2F4F0';
const WOOD = '#9A6B48';

function paperSheet(c: SkCanvas, pen: Pen, w: number, h: number, deg = 0): void {
  c.save();
  c.rotate(deg, 0, 0);
  wash(c, pen, rrect(-w / 2, -h / 2, w, h, 0.8), PAPER, 0.8);
  c.restore();
}

function ruled(c: SkCanvas, pen: Pen, x0: number, x1: number, y0: number, n: number, gap: number): void {
  for (let i = 0; i < n; i++) c.drawPath(line(x0, y0 + i * gap, x1 - (i % 2) * 2, y0 + i * gap), stroke(alpha(pen.ink, 0.45), 0.5));
}

export const PROPS = {
  /** The player's: a large ribbon rosette on the lapel (vain, fond of ribbons). */
  rosette: {
    at: { x: 30, y: 104, deg: -8 },
    draw: (c, pen, acc) => {
      for (const s of [-1, 1]) wash(c, pen, poly([0, 2, s * 6, 15, s * 2, 13, s * 0.5, 16, s * -1, 3]), mix(acc, '#FFFFFF', 0.15), 0.7);
      const n = 12;
      const b = builder();
      for (let i = 0; i <= n; i++) {
        const a = (Math.PI * 2 * i) / n;
        const r = i % 2 ? 8.4 : 9.6;
        if (i === 0) b.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else b.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      b.close();
      wash(c, pen, b.build(), acc, 0.8);
      wash(c, pen, circle(0, 0, 4.6), PAPER, 0.7);
      c.drawPath(circle(0, 0, 2.2), fill(BRASS));
    },
  },
  notebook: {
    at: { x: 73, y: 104, deg: 8 },
    held: true,
    draw: (c, pen) => {
      wash(c, pen, rrect(-8, -11, 16, 21, 1.2), '#3E4A63', 0.9);
      wash(c, pen, rrect(-6.6, -9.6, 13, 18, 0.8), PAPER, 0.6);
      ruled(c, pen, -5, 5, -6, 5, 3);
      for (let i = 0; i < 5; i++) c.drawPath(circle(-8, -8 + i * 4, 0.9), stroke(pen.ink, 0.5));
      ink(c, pen, line(5, -14, 10, 4), 1.1);
    },
  },
  binoculars: {
    at: { x: 66, y: 106, deg: -6 },
    draw: (c, pen) => {
      ink(c, pen, curve([[-12, -14], [-8, -4], [0, -6], [9, -4], [13, -14]]), 0.8);
      for (const s of [-1, 1]) {
        wash(c, pen, rrect(s * 5.5 - 4, -6, 8, 13, 2), '#45474A', 0.9);
        wash(c, pen, oval(s * 5.5, 7.6, 4.2, 1.8), '#7F99A0', 0.7);
      }
      wash(c, pen, rrect(-2, -3, 4, 5, 1), '#45474A', 0.7);
    },
  },
  bell: {
    at: { x: 72, y: 107, deg: 0 },
    held: true,
    draw: (c, pen) => {
      wash(c, pen, rrect(-11, 4, 22, 4, 1.2), WOOD, 0.8);
      const dome = builder().moveTo(-9, 4).quadTo(-9, -8, 0, -8).quadTo(9, -8, 9, 4).close().build();
      wash(c, pen, dome, BRASS, 0.9);
      hatch(c, pen, dome, { within: poly([2, -10, 12, -10, 12, 6, 2, 6]) });
      wash(c, pen, rrect(-1.2, -11.4, 2.4, 3.6, 1), BRASS_DEEP, 0.6);
      c.drawPath(arc(-3, -2, 3, 3, 200, 70), stroke('#FFFFFF', 0.9));
    },
  },
  duster: {
    at: { x: 74, y: 100, deg: 24 },
    held: true,
    draw: (c, pen, acc) => {
      wash(c, pen, rrect(-1.4, -2, 2.8, 20, 1), WOOD, 0.7);
      const tuft = blob([[0, -2], [-7, -6], [-8, -13], [-3, -18], [0, -14], [3, -19], [8, -13], [7, -6]], 0.9);
      wash(c, pen, tuft, acc, 0.8);
      for (const x of [-4, 0, 4]) c.drawPath(line(x * 0.4, -3, x, -15), stroke(alpha(pen.ink, 0.45), 0.5));
    },
  },
  pumpkin: {
    at: { x: 72, y: 106, deg: 0 },
    held: true,
    draw: (c, pen) => {
      const col = '#D08A3A';
      for (const [x, rx] of [[-5.4, 6], [5.4, 6], [0, 6.6]] as const) wash(c, pen, oval(x, 1, rx, 8.4), x === 0 ? mix(col, '#FFFFFF', 0.12) : col, 0.8);
      wash(c, pen, poly([-1.2, -7, 1.6, -7, 2.6, -12, 0.4, -12.4]), '#6F7445', 0.6);
      hatch(c, pen, oval(6, 1, 6, 8.4));
      // The rosette it won.
      wash(c, pen, circle(-8, -6, 3.2), P.violet, 0.6);
      wash(c, pen, poly([-9, -3.4, -10.6, 2, -8.6, 0.6, -7, 2.4, -7.2, -3.2]), P.violet, 0.5);
    },
  },
  balance: {
    at: { x: 72, y: 104, deg: 0 },
    held: true,
    draw: (c, pen) => {
      ink(c, pen, line(0, -16, 0, -12), 0.8);
      wash(c, pen, circle(0, -17.4, 1.8), BRASS, 0.6);
      wash(c, pen, rrect(-4, -12, 8, 15, 2), BRASS, 0.9);
      for (let i = 0; i < 4; i++) c.drawPath(line(-2, -9 + i * 3, 2, -9 + i * 3), stroke(alpha(pen.ink, 0.6), 0.45));
      ink(c, pen, line(0, 3, 0, 6), 0.8);
      ink(c, pen, poly([-8, 11, 0, 6, 8, 11], false), 0.6);
      wash(c, pen, builder().moveTo(-9, 11).quadTo(0, 16, 9, 11).close().build(), BRASS_DEEP, 0.8);
    },
  },
  tuba: {
    at: { x: 27, y: 78, deg: -6, s: 1.35, back: true },
    draw: (c, pen) => {
      // The coil of tubing, the valves, and the great bell opening upward over the shoulder.
      const coil = builder().addCircle(4, 10, 13).addCircle(4, 10, 8).setFillType(FillType.EvenOdd).build();
      wash(c, pen, coil, BRASS, 1);
      hatch(c, pen, coil, { within: poly([6, -10, 24, -10, 24, 30, 6, 30]) });
      for (const x of [8, 12, 16]) wash(c, pen, rrect(x - 1.4, -4, 2.8, 8, 0.8), BRASS_DEEP, 0.6);
      const flare = builder().moveTo(-6, 4).quadTo(-10, -6, -18, -16).lineTo(4, -20).quadTo(-2, -8, 2, 2).close().build();
      wash(c, pen, flare, BRASS, 1);
      wash(c, pen, oval(-7, -18, 11.5, 4.4), BRASS, 1);
      wash(c, pen, oval(-7, -18, 8.6, 2.8), BRASS_DEEP, 0.6);
      c.drawPath(arc(-10, -10, 3, 6, 180, 70), stroke('#FFFFFF', 0.9));
    },
  },
  cornet: {
    at: { x: 70, y: 106, deg: -28 },
    held: true,
    draw: (c, pen) => {
      wash(c, pen, rrect(-12, -1.6, 18, 3.2, 1.5), BRASS, 0.8);
      wash(c, pen, builder().moveTo(6, -2).lineTo(14, -6.5).lineTo(14, 6.5).lineTo(6, 2).close().build(), BRASS, 0.8);
      wash(c, pen, oval(14, 0, 1.8, 6.5), BRASS_DEEP, 0.6);
      wash(c, pen, rrect(-8, -1, 9, 7, 3), BRASS, 0.7);
      for (const x of [-5, -2, 1]) wash(c, pen, rrect(x - 0.7, -5.4, 1.4, 4, 0.6), BRASS_DEEP, 0.5);
    },
  },
  float: {
    at: { x: 72, y: 104, deg: 12 },
    held: true,
    draw: (c, pen) => {
      ink(c, pen, line(0, -18, 0, -8), 0.8);
      const top = builder().moveTo(-5, 0).quadTo(-5, -9, 0, -9).quadTo(5, -9, 5, 0).close().build();
      const bot = builder().moveTo(-5, 0).quadTo(-4.6, 9, 0, 12).quadTo(4.6, 9, 5, 0).close().build();
      wash(c, pen, bot, PAPER, 0.8);
      wash(c, pen, top, P.violet, 0.8);
      ink(c, pen, line(-5, 0, 5, 0), 0.7);
      ink(c, pen, line(0, 12, 0, 15), 0.7);
    },
  },
  rod: {
    at: { x: 20, y: 92, deg: 0, back: true },
    draw: (c, pen) => {
      ink(c, pen, line(14, 30, -10, -60), 1.6);
      c.drawPath(curve([[-10, -60], [-16, -40], [-18, -10]]), stroke(alpha(pen.ink, 0.7), 0.5));
      wash(c, pen, circle(10, 18, 3), '#45474A', 0.6);
    },
  },
  kite: {
    at: { x: 22, y: 84, deg: -14, back: true },
    draw: (c, pen, acc) => {
      const k = poly([0, -16, 11, -2, 0, 14, -11, -2]);
      wash(c, pen, k, acc, 1);
      c.drawPath(poly([0, -16, 11, -2, 0, -2]), fill(alpha('#FFFFFF', 0.45)));
      c.drawPath(poly([0, 14, -11, -2, 0, -2]), fill(alpha('#FFFFFF', 0.45)));
      ink(c, pen, line(0, -16, 0, 14), 0.6);
      ink(c, pen, line(-11, -2, 11, -2), 0.6);
      ink(c, pen, curve([[0, 14], [4, 20], [-2, 26], [3, 32]]), 0.6);
      for (const [x, y] of [[3, 20], [-1, 26]]) wash(c, pen, poly([x - 2, y - 1, x + 2, y + 1, x - 2, y + 1.5, x + 2, y - 1.5]), PAPER, 0.4);
    },
  },
  reel: {
    at: { x: 71, y: 106, deg: 0 },
    held: true,
    draw: (c, pen, acc) => {
      wash(c, pen, rrect(-9, -3, 18, 6, 1.4), WOOD, 0.8);
      wash(c, pen, oval(0, 0, 6, 8), acc, 0.8);
      for (const y of [-4, -1.5, 1, 3.5]) c.drawPath(line(-5, y, 5, y), stroke(alpha(pen.ink, 0.4), 0.45));
      ink(c, pen, curve([[4, -7], [9, -16], [6, -26]]), 0.5);
    },
  },
  topiary: {
    at: { x: 72, y: 102, deg: 0 },
    held: true,
    draw: (c, pen) => {
      wash(c, pen, poly([-6, 10, 6, 10, 4.6, 18, -4.6, 18]), '#B5704F', 0.8);
      ink(c, pen, line(0, 10, 0, -2), 1);
      const ball = circle(0, -9, 8);
      wash(c, pen, ball, '#5E7A4C', 0.9);
      hatch(c, pen, ball, { within: poly([0, -20, 10, -20, 10, 2, 0, 2]) });
      c.drawPath(circle(0, -9, 8), stroke(alpha('#FFFFFF', 0.25), 0.4));
    },
  },
  shears: {
    at: { x: 72, y: 104, deg: -30 },
    held: true,
    draw: (c, pen) => {
      for (const s of [-1, 1]) {
        wash(c, pen, poly([0, 0, s * 2.4, -1.4, s * 1.4, -20, 0, -21]), '#B9BCB8', 0.8);
        wash(c, pen, rrect(s * 3 - 1.6, 1, 3.2, 12, 1.4), WOOD, 0.8);
      }
      c.drawPath(circle(0, 0, 1.2), fill(pen.ink));
    },
  },
  ribbon: {
    at: { x: 72, y: 106, deg: 0 },
    held: true,
    draw: (c, pen, acc) => {
      const roll = circle(0, 0, 9);
      wash(c, pen, roll, acc, 0.9);
      for (const r of [6.4, 4.4]) c.drawPath(circle(0, 0, r), stroke(alpha(pen.ink, 0.4), 0.5));
      wash(c, pen, circle(0, 0, 2.4), PAPER, 0.6);
      wash(c, pen, poly([7, 4, 16, 10, 13, 13, 16, 18, 6, 9]), acc, 0.7);
    },
  },
  umbrella: {
    at: { x: 76, y: 96, deg: 12 },
    held: true,
    draw: (c, pen) => {
      const furled = poly([-2.4, -26, 2.4, -26, 4.6, 8, -4.6, 8]);
      wash(c, pen, furled, '#3E4A63', 0.9);
      ink(c, pen, line(0, -26, 0, -31), 1);
      ink(c, pen, curve([[0, 8], [0, 16], [-3, 20], [-7, 18]]), 1.6);
      c.drawPath(line(-3, 0, 3, -2), stroke(alpha('#FFFFFF', 0.4), 0.6));
    },
  },
  fountain: {
    at: { x: 72, y: 104, deg: 0 },
    held: true,
    draw: (c, pen) => {
      wash(c, pen, builder().moveTo(-10, 6).lineTo(10, 6).quadTo(9, 14, 0, 14).quadTo(-9, 14, -10, 6).close().build(), '#B9BCB8', 0.8);
      wash(c, pen, rrect(-1.8, -4, 3.6, 10, 1), '#B9BCB8', 0.7);
      wash(c, pen, oval(0, -8, 3.6, 4.4), '#B9BCB8', 0.7);
      for (const s of [-1, 1]) c.drawPath(curve([[0, -12], [s * 6, -16], [s * 9, -4], [s * 8, 6]]), stroke('#5E7FA3', 0.9));
    },
  },
  hatbox: {
    at: { x: 72, y: 106, deg: 0 },
    held: true,
    draw: (c, pen, acc) => {
      wash(c, pen, rrect(-10, -6, 20, 15, 2), PAPER, 0.8);
      for (let x = -8; x <= 8; x += 4) c.drawPath(line(x, -5, x, 8), stroke(alpha(acc, 0.8), 1.2));
      wash(c, pen, rrect(-11, -9, 22, 4, 1.6), acc, 0.8);
      ink(c, pen, curve([[-4, -9], [0, -15], [4, -9]]), 0.7);
    },
  },
  clipboard: {
    at: { x: 72, y: 104, deg: 6 },
    held: true,
    draw: (c, pen) => {
      for (let i = 3; i >= 0; i--) {
        c.save();
        c.translate(i * 0.8, -i * 0.6);
        wash(c, pen, rrect(-9, -11, 18, 23, 1), i ? PAPER : WOOD, 0.6);
        c.restore();
      }
      wash(c, pen, rrect(-7.6, -9, 15, 19, 0.8), PAPER, 0.5);
      ruled(c, pen, -6, 6, -5, 5, 3);
      wash(c, pen, rrect(-4, -13, 8, 4, 1), '#B9BCB8', 0.7);
    },
  },
  envelope: {
    at: { x: 72, y: 106, deg: -6 },
    held: true,
    draw: (c, pen) => {
      const e = rrect(-11, -7, 22, 14, 1);
      wash(c, pen, e, PAPER, 0.9);
      ink(c, pen, poly([-11, -7, 0, 1.5, 11, -7], false), 0.6);
      wash(c, pen, circle(0, 1.5, 2.2), P.violet, 0.5);
    },
  },
  camera: {
    at: { x: 71, y: 106, deg: 0 },
    held: true,
    draw: (c, pen) => {
      wash(c, pen, rrect(-11, -6, 22, 14, 2), '#45474A', 0.9);
      wash(c, pen, rrect(-6, -10, 9, 5, 1), '#45474A', 0.7);
      wash(c, pen, circle(1, 1, 5), '#B9BCB8', 0.8);
      wash(c, pen, circle(1, 1, 3), '#3E4A63', 0.6);
      wash(c, pen, rrect(5, -9, 6, 3.4, 0.8), PAPER, 0.5);
    },
  },
  abacus: {
    at: { x: 71, y: 105, deg: 0 },
    held: true,
    draw: (c, pen) => {
      const f = rrect(-12, -9, 24, 18, 1.4);
      wash(c, pen, f, WOOD, 0.9);
      wash(c, pen, rrect(-10, -7, 20, 14, 0.6), PAPER, 0.5);
      const cols = ['#B5704F', '#5E7FA3', '#C29A45'];
      for (let r = 0; r < 3; r++) {
        const y = -4 + r * 4;
        c.drawPath(line(-10, y, 10, y), stroke(pen.ink, 0.5));
        for (let i = 0; i < 4; i++) c.drawPath(circle((r % 2 ? 2 : -8) + i * 2.4, y, 1.2), fill(cols[r]));
      }
    },
  },
  forms: {
    at: { x: 72, y: 104, deg: -4 },
    held: true,
    draw: (c, pen) => {
      for (const [d, dx] of [[-8, -2], [4, 1.5], [-2, 0]] as const) {
        c.save();
        c.translate(dx, 0);
        paperSheet(c, pen, 17, 21, d);
        c.restore();
      }
      ruled(c, pen, -6, 6, -6, 4, 3.4);
      wash(c, pen, rrect(-1, -14, 3, 8, 1.4), '#B9BCB8', 0.6);
    },
  },
  sandwich: {
    at: { x: 72, y: 106, deg: -8 },
    held: true,
    draw: (c, pen) => {
      const tri = (dy: number, col: string) => wash(c, pen, poly([-11, 6 + dy, 11, 6 + dy, -9, -8 + dy]), col, 0.8);
      tri(2, '#E2CB9A');
      c.drawPath(poly([-11, 5.4, 11, 5.4, 9, 4, -10, 3.6]), fill('#8FA37F'));
      tri(-1, '#ECD9AE');
    },
  },
  folder: {
    at: { x: 72, y: 104, deg: 4 },
    held: true,
    draw: (c, pen) => {
      wash(c, pen, poly([-11, -10, -3, -10, -1, -12, 6, -12, 6, -10, 11, -10, 11, 11, -11, 11]), '#C29A45', 0.9);
      wash(c, pen, rrect(-7, -3, 14, 4, 0.6), PAPER, 0.5);
      ink(c, pen, line(-11, -6, 11, -6), 0.5);
    },
  },
  magnifier: {
    at: { x: 72, y: 104, deg: 30 },
    held: true,
    draw: (c, pen) => {
      wash(c, pen, rrect(-1.6, 6, 3.2, 14, 1.4), WOOD, 0.8);
      const ring = circle(0, -2, 8.4);
      wash(c, pen, ring, BRASS, 0.9);
      wash(c, pen, circle(0, -2, 6.4), alpha('#DCE8EC', 0.9), 0.6);
      c.drawPath(arc(-2, -4, 3.4, 3.4, 200, 70), stroke('#FFFFFF', 1));
    },
  },
  wateringCan: {
    at: { x: 71, y: 106, deg: 0 },
    held: true,
    draw: (c, pen) => {
      const can = rrect(-8, -6, 14, 14, 2);
      wash(c, pen, can, '#5E7FA3', 0.9);
      wash(c, pen, poly([5, 0, 15, -9, 16, -7.6, 6, 3]), '#5E7FA3', 0.7);
      wash(c, pen, oval(15.6, -8.6, 1.4, 2.4), '#5E7FA3', 0.5);
      ink(c, pen, arc(-1, -6, 6, 6, 180, 180), 1);
      hatch(c, pen, can, { within: poly([1, -8, 8, -8, 8, 10, 1, 10]) });
    },
  },
  cane: {
    at: { x: 74, y: 102, deg: 6 },
    held: true,
    draw: (c, pen) => {
      ink(c, pen, curve([[2, 28], [2, -8], [0, -14], [-5, -15], [-8, -11]]), 2.2);
      c.drawPath(curve([[2, 28], [2, -8], [0, -14], [-5, -15], [-8, -11]]), stroke('#7A4E33', 1.6));
      wash(c, pen, rrect(0.6, -2, 3, 3, 0.6), BRASS, 0.5);
    },
  },
  teacup: {
    at: { x: 71, y: 106, deg: 0 },
    held: true,
    draw: (c, pen, acc) => {
      wash(c, pen, oval(0, 7, 11, 2.6), PAPER, 0.7);
      const cup = builder().moveTo(-7, -3).lineTo(7, -3).quadTo(6.6, 6, 0, 7).quadTo(-6.6, 6, -7, -3).close().build();
      wash(c, pen, cup, PAPER, 0.9);
      ink(c, pen, arc(8, 1, 3, 3, -90, 180), 0.8);
      c.drawPath(line(-6, -0.6, 6, -0.6), stroke(acc, 1.2));
      c.drawPath(curve([[-2, -6], [-1, -9], [-2.4, -12]]), stroke(alpha(pen.ink, 0.35), 0.6));
    },
  },
  bunting: {
    at: { x: 50, y: 100, deg: 0 },
    draw: (c, pen, acc) => {
      const pts: [number, number][] = [[-26, -4], [0, 3], [26, -4]];
      ink(c, pen, curve(pts), 0.6);
      const cols = [acc, PAPER, '#5E7FA3', acc, PAPER, '#5E7FA3'];
      for (let i = 0; i < 6; i++) {
        const t = (i + 0.5) / 6;
        const x = -26 + 52 * t;
        const y = -4 + Math.sin(t * Math.PI) * 6.6;
        wash(c, pen, poly([x - 3.6, y, x + 3.6, y, x, y + 7]), cols[i], 0.5);
      }
    },
  },
  lifebuoy: {
    at: { x: 72, y: 106, deg: 0 },
    held: true,
    draw: (c, pen) => {
      const b = builder().addCircle(0, 0, 10).addCircle(0, 0, 5).setFillType(FillType.EvenOdd).build();
      c.drawPath(b, fill(PAPER));
      c.save();
      clip(c, b);
      for (const a of [0, 90, 180, 270]) {
        c.save();
        c.rotate(a + 45, 0, 0);
        c.drawPath(poly([-3, -12, 3, -12, 3, 0, -3, 0]), fill('#B5704F'));
        c.restore();
      }
      c.restore();
      ink(c, pen, circle(0, 0, 10), 0.9);
      ink(c, pen, circle(0, 0, 5), 0.7);
    },
  },
  windsock: {
    at: { x: 70, y: 104, deg: 0 },
    held: true,
    draw: (c, pen) => {
      ink(c, pen, line(-8, -14, -8, 16), 1.2);
      const sock = poly([-8, -14, 12, -10, 12, -5, -8, -4]);
      wash(c, pen, sock, PAPER, 0.8);
      c.save();
      clip(c, sock);
      for (const x of [-3, 7]) c.drawPath(poly([x, -16, x + 5, -16, x + 5, 0, x, 0]), fill('#B5704F'));
      c.restore();
      ink(c, pen, sock, 0.8);
    },
  },
  level: {
    at: { x: 70, y: 108, deg: -10 },
    held: true,
    draw: (c, pen) => {
      wash(c, pen, rrect(-14, -3.4, 28, 6.8, 1), '#C29A45', 0.9);
      wash(c, pen, rrect(-4, -2, 8, 4, 2), '#BFD9C4', 0.6);
      c.drawPath(circle(0.6, 0, 1.2), fill(alpha('#FFFFFF', 0.9)));
      for (const x of [-10, 10]) c.drawPath(circle(x, 0, 1), fill(pen.ink));
    },
  },
  boat: {
    at: { x: 71, y: 106, deg: 0 },
    held: true,
    draw: (c, pen) => {
      wash(c, pen, builder().moveTo(-12, 2).lineTo(12, 2).lineTo(8, 9).lineTo(-9, 9).close().build(), '#5E7FA3', 0.9);
      ink(c, pen, line(0, 2, 0, -14), 0.8);
      wash(c, pen, poly([1, -13, 10, 0, 1, 0]), PAPER, 0.7);
      wash(c, pen, poly([-1, -10, -8, 0, -1, 0]), PAPER, 0.6);
    },
  },
  knocker: {
    at: { x: 72, y: 106, deg: 0 },
    held: true,
    draw: (c, pen) => {
      wash(c, pen, circle(0, -8, 3.2), BRASS, 0.8);
      const ring = builder().addCircle(0, 2, 9).addCircle(0, 2, 6).setFillType(FillType.EvenOdd).build();
      wash(c, pen, ring, BRASS, 0.9);
      hatch(c, pen, ring, { within: poly([2, -10, 12, -10, 12, 14, 2, 14]) });
    },
  },
  crossword: {
    at: { x: 72, y: 104, deg: 6 },
    held: true,
    draw: (c, pen) => {
      wash(c, pen, rrect(-11, -11, 22, 22, 0.6), PAPER, 0.9);
      const black = [1, 4, 6, 9, 12, 14];
      for (let i = 0; i < 16; i++) {
        const x = -10 + (i % 4) * 5;
        const y = -10 + Math.floor(i / 4) * 5;
        c.drawPath(rrect(x, y, 5, 5, 0), black.includes(i) ? fill(pen.ink) : stroke(alpha(pen.ink, 0.6), 0.4));
      }
    },
  },
  spoon: {
    at: { x: 30, y: 100, deg: -20 },
    draw: (c, pen, acc) => {
      // The Ceremonial Spoon on a ribbon round the neck.
      ink(c, pen, curve([[20, -22], [10, -10], [2, -6]]), 0.6);
      c.drawPath(curve([[20, -22], [10, -10], [2, -6]]), stroke(acc, 1.6));
      wash(c, pen, rrect(-1.4, -6, 2.8, 16, 1.2), BRASS, 0.7);
      const bowl = oval(0, 14, 5, 7);
      wash(c, pen, bowl, BRASS, 0.9);
      c.drawPath(arc(-1.4, 12, 2.4, 4, 180, 80), stroke('#FFFFFF', 0.9));
    },
  },
  accordion: {
    at: { x: 52, y: 112, deg: 0, s: 1.1 },
    held: true,
    draw: (c, pen, acc) => {
      wash(c, pen, rrect(-22, -10, 10, 20, 1.4), acc, 0.9);
      wash(c, pen, rrect(12, -10, 10, 20, 1.4), acc, 0.9);
      const bel = builder();
      for (let i = 0; i < 8; i++) {
        const x = -12 + i * 3;
        bel.moveTo(x, -9).lineTo(x + 1.5, -10.5).lineTo(x + 3, -9).lineTo(x + 3, 9).lineTo(x + 1.5, 10.5).lineTo(x, 9).close();
      }
      wash(c, pen, bel.build(), PAPER, 0.5);
      for (let i = 0; i < 6; i++) c.drawPath(circle(-19 + (i % 2) * 4, -6 + Math.floor(i / 2) * 6, 0.9), fill(PAPER));
    },
  },
  sundial: {
    at: { x: 72, y: 106, deg: 0 },
    held: true,
    draw: (c, pen) => {
      const face = oval(0, 2, 12, 6);
      wash(c, pen, face, '#B9BCB8', 0.9);
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (1 + i / 6);
        c.drawPath(line(Math.cos(a) * 7, 2 + Math.sin(a) * 3.4, Math.cos(a) * 10, 2 + Math.sin(a) * 5), stroke(pen.ink, 0.5));
      }
      wash(c, pen, poly([0, 2, 0, -9, 7, 2]), BRASS, 0.7);
    },
  },
  calendar: {
    at: { x: 72, y: 104, deg: -6 },
    held: true,
    draw: (c, pen, acc) => {
      wash(c, pen, rrect(-10, -10, 20, 22, 1), PAPER, 0.9);
      c.drawPath(rrect(-10, -10, 20, 6, 1), fill(acc));
      for (const x of [-5, 5]) wash(c, pen, rrect(x - 0.8, -13, 1.6, 5, 0.6), '#B9BCB8', 0.5);
      for (let i = 0; i < 12; i++) c.drawPath(rrect(-8 + (i % 4) * 4.2, -2 + Math.floor(i / 4) * 4.2, 3, 3, 0.4), fill(alpha(pen.ink, i === 6 ? 0.0 : 0.3)));
      // Wednesday crossed out.
      ink(c, pen, line(-0.6, 0, 3.6, 4.8), 0.7);
      ink(c, pen, line(3.6, 0, -0.6, 4.8), 0.7);
    },
  },
  chair: {
    at: { x: 50, y: 84, deg: 0, back: true },
    draw: (c, pen) => {
      // A plain tall kitchen chair behind the shoulders (her hobby: chairs): two posts, a top rail, spindles.
      const wood = '#8A5E3E';
      for (const x of [-33, 27]) wash(c, pen, rrect(x, -44, 6, 96, 2), wood, 1);
      wash(c, pen, rrect(-36, -50, 72, 9, 3.5), wood, 1);
      for (const x of [-30, 30]) wash(c, pen, circle(x, -52, 3), wood, 0.8);
      for (const x of [-18, -6, 6, 18]) wash(c, pen, rrect(x - 1.6, -41, 3.2, 40, 1.4), wood, 0.7);
      wash(c, pen, rrect(-30, -4, 60, 5, 2), wood, 0.8);
    },
  },
  handbell: {
    at: { x: 72, y: 104, deg: -14 },
    held: true,
    draw: (c, pen) => {
      wash(c, pen, rrect(-1.8, -18, 3.6, 10, 1.4), WOOD, 0.7);
      const b = builder().moveTo(-3, -8).quadTo(-5, 2, -10, 6).lineTo(10, 6).quadTo(5, 2, 3, -8).close().build();
      wash(c, pen, b, BRASS, 0.9);
      hatch(c, pen, b, { within: poly([1, -10, 12, -10, 12, 8, 1, 8]) });
      wash(c, pen, circle(0, 8, 2), BRASS_DEEP, 0.5);
    },
  },
  trowel: {
    at: { x: 72, y: 104, deg: 18 },
    held: true,
    draw: (c, pen) => {
      wash(c, pen, rrect(-2, 4, 4, 13, 1.6), WOOD, 0.8);
      ink(c, pen, line(0, 4, 0, -1), 1);
      wash(c, pen, builder().moveTo(-6, -1).lineTo(6, -1).quadTo(5, -12, 0, -18).quadTo(-5, -12, -6, -1).close().build(), '#B9BCB8', 0.9);
    },
  },
  pigeon: {
    at: { x: 74, y: 86, deg: 0 },
    draw: (c, pen) => {
      // A pigeon perched on the shoulder: round grey chest, a sheen at the neck, small head.
      const body = blob([[-11, 3], [-6, -3], [2, -5], [8, -3], [9, 4], [1, 8], [-8, 7]], 0.9);
      wash(c, pen, body, '#9AA3AC', 0.9);
      wash(c, pen, poly([-11, 3, -17, 1, -16, 6, -9, 6]), '#7E8790', 0.6);
      c.drawPath(arc(-1, 1, 6, 3.4, 200, 120), stroke(alpha(pen.ink, 0.6), 0.6));
      const neck = blob([[3, -4], [8, -9], [10, -4], [8, 1]], 0.9);
      wash(c, pen, neck, '#6E8F86', 0.6);
      wash(c, pen, circle(8, -10.5, 3.4), '#8A939C', 0.8);
      c.drawPath(circle(9, -11, 0.75), fill(pen.ink));
      wash(c, pen, poly([11.2, -10.6, 13.6, -9.8, 11.2, -9.2]), '#D9CFC0', 0.4);
      for (const x of [-2, 3]) ink(c, pen, line(x, 7.6, x + 0.6, 10), 0.6);
    },
  },
  lighthouse: {
    at: { x: 72, y: 102, deg: 0 },
    held: true,
    draw: (c, pen) => {
      const t = poly([-5, 14, 5, 14, 3, -8, -3, -8]);
      wash(c, pen, t, PAPER, 0.9);
      c.save();
      clip(c, t);
      for (const y of [-4, 4]) c.drawPath(rrect(-8, y, 16, 4, 0), fill('#B5704F'));
      c.restore();
      ink(c, pen, t, 0.9);
      wash(c, pen, rrect(-3.4, -13, 6.8, 5, 0.8), '#EFE3A8', 0.7);
      wash(c, pen, poly([-4.4, -13, 4.4, -13, 0, -17]), '#45474A', 0.7);
    },
  },
  hoop: {
    at: { x: 72, y: 106, deg: 0 },
    held: true,
    draw: (c, pen, acc) => {
      wash(c, pen, circle(0, 0, 10), PAPER, 0.6);
      c.drawPath(curve([[-6, 4], [-2, -4], [2, 3], [6, -5]]), stroke(acc, 1.6));
      c.drawPath(curve([[-6, -2], [0, -6], [5, 2]]), stroke('#5E7FA3', 1.2));
      const r = builder().addCircle(0, 0, 10).addCircle(0, 0, 8.6).setFillType(FillType.EvenOdd).build();
      wash(c, pen, r, WOOD, 0.7);
      ink(c, pen, line(5, 5, 12, 12), 0.6);
    },
  },
  harmonica: {
    at: { x: 72, y: 108, deg: -8 },
    held: true,
    draw: (c, pen) => {
      wash(c, pen, rrect(-13, -4, 26, 8, 1.4), '#B9BCB8', 0.9);
      wash(c, pen, rrect(-13, -1.2, 26, 2.4, 0.4), WOOD, 0.4);
      for (let i = 0; i < 8; i++) c.drawPath(rrect(-11 + i * 2.9, -0.8, 1.6, 1.6, 0.3), fill(pen.ink));
    },
  },
  jigsaw: {
    at: { x: 72, y: 106, deg: 14 },
    held: true,
    draw: (c, pen, acc) => {
      const p = builder()
        .moveTo(-9, -9)
        .lineTo(-3, -9)
        .cubicTo(-4, -15, 4, -15, 3, -9)
        .lineTo(9, -9)
        .lineTo(9, -3)
        .cubicTo(15, -4, 15, 4, 9, 3)
        .lineTo(9, 9)
        .lineTo(-9, 9)
        .lineTo(-9, 3)
        .cubicTo(-4, 4, -4, -4, -9, -3)
        .close()
        .build();
      wash(c, pen, p, acc, 1);
      hatch(c, pen, p, { within: poly([2, -16, 16, -16, 16, 12, 2, 12]) });
    },
  },
  barometer: {
    at: { x: 72, y: 106, deg: 0 },
    held: true,
    draw: (c, pen) => {
      wash(c, pen, circle(0, 0, 11), WOOD, 0.9);
      wash(c, pen, circle(0, 0, 8), PAPER, 0.7);
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * (0.8 + (1.4 * i) / 8);
        c.drawPath(line(Math.cos(a) * 6, Math.sin(a) * 6, Math.cos(a) * 7.6, Math.sin(a) * 7.6), stroke(pen.ink, 0.5));
      }
      ink(c, pen, line(0, 0, 4, -5), 0.8);
      c.drawPath(circle(0, 0, 1), fill(BRASS_DEEP));
    },
  },
  boots: {
    at: { x: 24, y: 96, deg: 6, back: false },
    draw: (c, pen) => {
      ink(c, pen, curve([[-2, -18], [4, -10], [10, -16]]), 0.7);
      for (const [dx, dy] of [[-6, 0], [5, 2]] as const) {
        const b = builder()
          .moveTo(dx - 3, dy - 10)
          .lineTo(dx + 3, dy - 10)
          .lineTo(dx + 3.4, dy + 2)
          .lineTo(dx + 8, dy + 4)
          .lineTo(dx + 8, dy + 7)
          .lineTo(dx - 3.4, dy + 7)
          .close()
          .build();
        wash(c, pen, b, '#7A4E33', 0.9);
        c.drawPath(rrect(dx - 3.4, dy + 6, 11.4, 1.6, 0.4), fill(pen.ink));
      }
    },
  },
  songsheet: {
    at: { x: 72, y: 104, deg: 8 },
    held: true,
    draw: (c, pen) => {
      paperSheet(c, pen, 20, 24);
      for (let i = 0; i < 3; i++) for (let k = 0; k < 5; k++) c.drawPath(line(-8, -8 + i * 7 + k * 1, 8, -8 + i * 7 + k * 1), stroke(alpha(pen.ink, 0.3), 0.3));
      for (const [x, y] of [[-5, -6], [-1, -4], [3, -8], [-3, 3], [2, 1], [6, 4]]) {
        c.drawPath(oval(x, y, 1.3, 1), fill(pen.ink));
        c.drawPath(line(x + 1.2, y, x + 1.2, y - 4), stroke(pen.ink, 0.5));
      }
    },
  },
} satisfies Record<string, PropDef>;
export type PropId = keyof typeof PROPS;
export const NO_PROP = 'none';

