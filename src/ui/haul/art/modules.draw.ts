/**
 * Module cartridges for the Fitting Bay: 8 module faces on 3 rarity frames, 96 x 120 pt, centred.
 * A cartridge is a slab with a socket key on top (its socket type: Rig, Fleet, Dock), a face
 * window with the module's machine, and a rarity rail down both sides.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { drawText } from './glyphs';
import { ORE, RARITY, SPACE, alpha, mix, type Rarity } from './palette';
import { LINE, TAU, arc, circle, clip, fill, glow, lamp, light, line, litStroke, ngon, part, poly, rrect, stroke } from './pen';

export const CARTRIDGE_W = 96;
export const CARTRIDGE_H = 120;

export type ModuleId = 'diamondbit' | 'bayracks' | 'thrusters' | 'clamps' | 'chute' | 'keeper' | 'sorter' | 'quickclamp';
export type SocketType = 'rig' | 'fleet' | 'dock';

export const MODULES: { id: ModuleId; rarity: Rarity; socket: SocketType }[] = [
  { id: 'diamondbit', rarity: 'common', socket: 'rig' },
  { id: 'bayracks', rarity: 'common', socket: 'fleet' },
  { id: 'thrusters', rarity: 'common', socket: 'fleet' },
  { id: 'clamps', rarity: 'common', socket: 'dock' },
  { id: 'chute', rarity: 'rare', socket: 'rig' },
  { id: 'keeper', rarity: 'rare', socket: 'dock' },
  { id: 'sorter', rarity: 'epic', socket: 'fleet' },
  { id: 'quickclamp', rarity: 'epic', socket: 'dock' },
];

/** The socket key shapes: Rig a triangle notch, Fleet a hex notch, Dock a square notch. */
export function drawSocketGlyph(c: SkCanvas, socket: SocketType, r: number, color: string): void {
  const p = socket === 'rig' ? ngon(0, 0, r, 3, -Math.PI / 2) : socket === 'fleet' ? ngon(0, 0, r, 6, 0) : rrect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6, r * 0.2);
  c.drawPath(p, fill(alpha(color, 0.15)));
  litStroke(c, p, color, 1.3, 0.6);
}

export interface CartridgeOptions {
  module: ModuleId | string;
  rarity: Rarity;
  socket: SocketType;
  /** Mark (level) shown as pips on the base, 1 to 5. */
  mark?: number;
  /** Dim it (not owned yet). */
  locked?: boolean;
}

/** Draws a cartridge, 96 x 120, centred on the origin. */
export function drawCartridge(c: SkCanvas, o: CartridgeOptions): void {
  const col = RARITY[o.rarity];
  const W = CARTRIDGE_W;
  const H = CARTRIDGE_H;
  if (o.rarity !== 'common') glow(c, 0, 0, 80, col, o.rarity === 'epic' ? 0.22 : 0.14);
  // Slab with a chamfered top and the socket key tab.
  const slab = poly([-W / 2 + 8, -H / 2 + 8, -12, -H / 2 + 8, -8, -H / 2, 8, -H / 2, 12, -H / 2 + 8, W / 2 - 8, -H / 2 + 8, W / 2, -H / 2 + 16, W / 2, H / 2 - 6, W / 2 - 6, H / 2, -W / 2 + 6, H / 2, -W / 2, H / 2 - 6, -W / 2, -H / 2 + 16]);
  part(c, slab, SPACE.hull1, col, LINE, 0.8);
  // Rarity rails.
  for (const s of [-1, 1]) {
    const x = s * (W / 2 - 5);
    c.drawPath(line(x, -H / 2 + 20, x, H / 2 - 12), stroke(alpha(col, 0.3), 4));
    c.drawPath(line(x, -H / 2 + 20, x, H / 2 - 12), stroke(col, 1.2));
  }
  // Epic: a second inner rail; rare and epic: corner gems.
  if (o.rarity === 'epic') {
    const inner = rrect(-W / 2 + 10, -H / 2 + 14, W - 20, H - 24, 4);
    c.drawPath(inner, stroke(alpha(col, 0.45), 0.8));
  }
  if (o.rarity !== 'common') {
    for (const s of [-1, 1]) {
      const g = ngon(s * (W / 2 - 8), H / 2 - 9, 3, 4, 0);
      c.drawPath(g, fill(col));
    }
  }
  // Socket key on the tab.
  c.save();
  c.translate(0, -H / 2 + 6);
  drawSocketGlyph(c, o.socket, 4, col);
  c.restore();
  // Face window.
  const win = rrect(-W / 2 + 12, -H / 2 + 16, W - 24, 70, 6);
  c.drawPath(win, fill(SPACE.bg));
  c.save();
  clip(c, win);
  c.translate(0, -H / 2 + 51);
  glow(c, 0, 0, 40, col, 0.16);
  drawModuleFace(c, o.module);
  c.restore();
  c.drawPath(win, stroke(alpha(col, 0.6), 1));
  // Mark pips on the base.
  const mark = Math.max(0, Math.min(5, o.mark ?? 1));
  for (let i = 0; i < 5; i++) {
    const x = -16 + i * 8;
    const pip = rrect(x - 2.5, H / 2 - 22, 5, 7, 1.2);
    c.drawPath(pip, fill(i < mark ? col : SPACE.hull0));
    c.drawPath(pip, stroke(alpha(col, 0.5), 0.6));
  }
  // Grip ridges.
  for (let i = 0; i < 3; i++) c.drawPath(line(-14, H / 2 - 11 + i * 2.5, 14, H / 2 - 11 + i * 2.5), stroke(alpha(SPACE.steel, 0.35), 0.8));
  if (o.locked) c.drawPath(slab, fill(alpha(SPACE.bg, 0.65)));
}

/** The face of a module, centred, fitting in about 70 x 66 pt. Unknown ids draw a blank chip. */
export function drawModuleFace(c: SkCanvas, id: string): void {
  switch (id) {
    case 'diamondbit': {
      // A drill bit with a diamond tip.
      part(c, rrect(-6, -26, 12, 16, 2), SPACE.hull2, SPACE.steel, 1.2, 0.3);
      const bit = poly([-9, -10, 9, -10, 6, 8, 0, 22, -6, 8]);
      part(c, bit, SPACE.hull3, SPACE.line, 1.4, 0.6);
      for (let i = 0; i < 3; i++) c.drawPath(line(-7 + i * 1.5, -6 + i * 6, 7 - i * 1.5, -2 + i * 6), stroke(alpha(SPACE.steel, 0.8), 1));
      const gem = poly([0, 14, 5, 20, 0, 28, -5, 20]);
      glow(c, 0, 21, 12, '#DFFBFF', 0.6);
      c.drawPath(gem, fill('#E8FDFF'));
      c.drawPath(gem, stroke(SPACE.line, 1));
      break;
    }
    case 'bayracks': {
      // A drone's cargo frame with extra bins.
      for (let r = 0; r < 3; r++)
        for (let k = 0; k < 3; k++) {
          const x = -22 + k * 15;
          const y = -22 + r * 15;
          const extra = r === 2;
          part(c, rrect(x, y, 13, 13, 2), extra ? mix(SPACE.hull2, ORE.copper, 0.35) : SPACE.hull2, extra ? ORE.copper : SPACE.line, 1.1, extra ? 0.8 : 0.3);
        }
      drawText(c, '+2', 18, -26, { size: 7, color: ORE.copper, weight: 1.3 });
      break;
    }
    case 'thrusters': {
      for (const x of [-12, 12]) {
        part(c, rrect(x - 7, -24, 14, 18, 3), SPACE.hull2, SPACE.line, 1.2, 0.4);
        part(c, poly([x - 5, -6, x + 5, -6, x + 8, 6, x - 8, 6]), SPACE.hull3, SPACE.steel, 1.2, 0.3);
        c.drawPath(poly([x - 6, 6, x, 30, x + 6, 6]), light(alpha(SPACE.flameOuter, 0.7)));
        c.drawPath(poly([x - 3.5, 6, x, 22, x + 3.5, 6]), light(alpha(SPACE.flame, 0.9)));
        c.drawPath(poly([x - 1.5, 6, x, 14, x + 1.5, 6]), light(SPACE.flameHot));
      }
      break;
    }
    case 'clamps': {
      // Two clamp jaws holding a cargo box.
      part(c, rrect(-12, -10, 24, 20, 2), mix(SPACE.hull2, SPACE.amber, 0.25), SPACE.amber, 1.2, 0.5);
      c.drawPath(line(-12, 0, 12, 0), stroke(alpha(SPACE.amber, 0.6), 0.9));
      for (const s of [-1, 1]) {
        const jaw = poly([s * 26, -18, s * 16, -18, s * 13, -12, s * 13, 12, s * 16, 18, s * 26, 18, s * 26, 12, s * 19, 12, s * 19, -12, s * 26, -12]);
        part(c, jaw, SPACE.hull3, SPACE.line, 1.2, 0.5);
      }
      break;
    }
    case 'chute': {
      // A funnel spilling chunks straight down into a hold bar.
      const funnel = poly([-20, -24, 20, -24, 6, -6, 6, 6, -6, 6, -6, -6]);
      part(c, funnel, SPACE.hull2, SPACE.line, 1.3, 0.5);
      for (const [x, y] of [
        [-8, -18],
        [4, -16],
        [-2, -12],
        [0, 12],
        [-3, 18],
        [3, 22],
      ])
        c.drawPath(ngon(x, y, 2.6, 5, x), fill(ORE.iron));
      part(c, rrect(-20, 25, 40, 6, 3), SPACE.hull1, SPACE.green, 1.2, 0.6);
      break;
    }
    case 'keeper': {
      // A contract manifest with a "met" check stamp.
      const doc = poly([-16, -26, 10, -26, 18, -18, 18, 24, -16, 24]);
      part(c, doc, SPACE.hull2, SPACE.steel, 1.2, 0.3);
      for (let i = 0; i < 4; i++) c.drawPath(line(-11, -16 + i * 7, 10 - (i % 2) * 8, -16 + i * 7), stroke(alpha(SPACE.steel, 0.6), 1.2));
      glow(c, 6, 12, 14, SPACE.green, 0.4);
      c.drawPath(circle(6, 12, 10), stroke(SPACE.green, 1.5));
      c.drawPath(poly([1, 12, 5, 16, 12, 7], false), stroke(SPACE.green, 2.2));
      break;
    }
    case 'sorter': {
      // Three chunks enter, the wanted one is routed into a lit bin.
      const ores = [ORE.iron, ORE.ice, ORE.copper];
      ores.forEach((o, i) => c.drawPath(ngon(-22, -18 + i * 12, 3.4, 5, i), fill(o)));
      c.drawPath(poly([-14, -6, 0, -6], false), stroke(SPACE.steel, 1.2));
      part(c, ngon(4, -6, 7, 6, 0), SPACE.hull2, SPACE.line, 1.2, 0.6);
      c.drawPath(poly([10, -6, 18, -6, 18, 10], false), stroke(ORE.ice, 1.6));
      c.drawPath(poly([15, 7, 18, 11, 21, 7], false), stroke(ORE.ice, 1.6));
      part(c, rrect(8, 14, 20, 12, 2), mix(SPACE.hull1, ORE.ice, 0.4), ORE.ice, 1.2, 0.8);
      c.drawPath(poly([4, 0, 4, 20, -10, 20], false), stroke(alpha(SPACE.steel, 0.5), 1));
      break;
    }
    case 'quickclamp': {
      // A dock clamp with a return arrow: back sooner.
      for (const s of [-1, 1]) part(c, poly([s * 24, -10, s * 12, -10, s * 9, -4, s * 9, 4, s * 12, 10, s * 24, 10]), SPACE.hull3, SPACE.line, 1.2, 0.5);
      part(c, rrect(-7, -7, 14, 14, 2), mix(SPACE.hull2, SPACE.amber, 0.3), SPACE.amber, 1.1, 0.4);
      const a = arc(0, 0, 22, 200, 260);
      c.drawPath(a, stroke(alpha(SPACE.gold, 0.25), 4));
      c.drawPath(a, stroke(SPACE.gold, 1.6));
      const end = 100 * (TAU / 360);
      const ex = Math.cos(end) * 22;
      const ey = Math.sin(end) * 22;
      c.drawPath(poly([ex - 5, ey - 2, ex, ey + 3, ex + 1, ey - 5]), fill(SPACE.gold));
      lamp(c, 0, -22, 1.4, SPACE.gold, 5);
      break;
    }
    default: {
      part(c, rrect(-16, -16, 32, 32, 4), SPACE.hull2, SPACE.steel, 1.2, 0.3);
      drawText(c, '?', 0, -6, { size: 12, color: SPACE.steel, align: 'center' });
    }
  }
}
