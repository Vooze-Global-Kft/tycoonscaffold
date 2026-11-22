/**
 * Module cartridges for the Fitting Bay: 8 module faces on 3 rarity frames, 96 x 120 pt, centred.
 * A cartridge is a slab with a socket key on top (its socket type: Rig, Fleet, Dock), a face
 * window with the module's machine, and a rarity rail down both sides.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { drawText } from './glyphs';
import { ORE, RARITY, SPACE, alpha, mix, type Rarity } from './palette';
import { LINE, TAU, arc, circle, clip, fill, glow, lamp, light, line, litStroke, ngon, part, poly, rrect, stroke } from './pen';
import { drawOreShape } from './ore.draw';

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

/** The padlock glyph of a locked cartridge, centred, about 2r wide. */
export function drawPadlock(c: SkCanvas, r: number, color: string): void {
  c.drawPath(arc(0, -r * 0.35, r * 0.62, 180, 180), stroke(color, r * 0.22));
  c.drawPath(line(-r * 0.62, -r * 0.35, -r * 0.62, 0), stroke(color, r * 0.22));
  c.drawPath(line(r * 0.62, -r * 0.35, r * 0.62, 0), stroke(color, r * 0.22));
  const body = rrect(-r, -r * 0.05, r * 2, r * 1.45, r * 0.25);
  c.drawPath(body, fill(color));
  c.drawCircle(0, r * 0.55, r * 0.22, fill(SPACE.bg));
  c.drawPath(line(0, r * 0.6, 0, r * 0.95), stroke(SPACE.bg, r * 0.16));
}

/**
 * Draws a cartridge, 96 x 120, centred on the origin. Rarity reads by shape as well as colour
 * (second pass, critique S4): common plain rails; rare corner gems; epic notched corners, a
 * bright double frame and a filled top tab. Locked: a padlock over diagonal hatching, no face.
 */
export function drawCartridge(c: SkCanvas, o: CartridgeOptions): void {
  const col = o.locked ? SPACE.steelDim : RARITY[o.rarity];
  const W = CARTRIDGE_W;
  const H = CARTRIDGE_H;
  const epic = o.rarity === 'epic' && !o.locked;
  if (o.rarity !== 'common' && !o.locked) glow(c, 0, 0, 80, col, epic ? 0.22 : 0.14);
  const tab = [-12, -H / 2 + 8, -8, -H / 2, 8, -H / 2, 12, -H / 2 + 8];
  // Slab: chamfered (common, rare) or notched at all four corners (epic).
  const slab = epic
    ? poly([-W / 2 + 10, -H / 2 + 8, ...tab, W / 2 - 10, -H / 2 + 8, W / 2 - 10, -H / 2 + 14, W / 2, -H / 2 + 14, W / 2, H / 2 - 10, W / 2 - 8, H / 2 - 10, W / 2 - 8, H / 2, -W / 2 + 8, H / 2, -W / 2 + 8, H / 2 - 10, -W / 2, H / 2 - 10, -W / 2, -H / 2 + 14, -W / 2 + 10, -H / 2 + 14])
    : poly([-W / 2 + 8, -H / 2 + 8, ...tab, W / 2 - 8, -H / 2 + 8, W / 2, -H / 2 + 16, W / 2, H / 2 - 6, W / 2 - 6, H / 2, -W / 2 + 6, H / 2, -W / 2, H / 2 - 6, -W / 2, -H / 2 + 16]);
  part(c, slab, o.locked ? SPACE.hull0 : SPACE.hull1, col, LINE, o.locked ? 0 : 0.8);
  if (epic) {
    // Filled top tab and a bright second frame.
    c.drawPath(poly(tab.concat([12, -H / 2 + 8, -12, -H / 2 + 8])), fill(col));
    const inner = poly([-W / 2 + 13, -H / 2 + 17, W / 2 - 13, -H / 2 + 17, W / 2 - 4, -H / 2 + 26, W / 2 - 4, H / 2 - 14, W / 2 - 12, H / 2 - 4, -W / 2 + 12, H / 2 - 4, -W / 2 + 4, H / 2 - 14, -W / 2 + 4, -H / 2 + 26]);
    litStroke(c, inner, mix(col, '#FFFFFF', 0.25), 1.2, 0.7);
  }
  // Rarity rails.
  for (const s of [-1, 1]) {
    const x = s * (W / 2 - (epic ? 8 : 5));
    c.drawPath(line(x, -H / 2 + 22, x, H / 2 - 14), stroke(alpha(col, 0.3), 4));
    c.drawPath(line(x, -H / 2 + 22, x, H / 2 - 14), stroke(col, 1.2));
  }
  if (o.rarity === 'rare' && !o.locked) {
    for (const s of [-1, 1]) c.drawPath(ngon(s * (W / 2 - 8), H / 2 - 9, 3, 4, 0), fill(col));
  }
  // Socket key on the tab.
  c.save();
  c.translate(0, -H / 2 + 6);
  drawSocketGlyph(c, o.socket, 4, epic ? SPACE.bg : col);
  c.restore();
  // Face window.
  const win = rrect(-W / 2 + 14, -H / 2 + 18, W - 28, 68, 6);
  c.drawPath(win, fill(SPACE.bg));
  c.save();
  clip(c, win);
  if (o.locked) {
    for (let x = -W; x < W; x += 7) c.drawPath(line(x, H / 2, x + H, -H / 2), stroke(alpha(SPACE.steel, 0.16), 1.4));
    c.translate(0, -H / 2 + 52);
    drawPadlock(c, 11, alpha(SPACE.steel, 0.85));
  } else {
    c.translate(0, -H / 2 + 52);
    glow(c, 0, 0, 40, col, 0.16);
    drawModuleFace(c, o.module);
  }
  c.restore();
  c.drawPath(win, stroke(alpha(col, 0.6), 1));
  // Mark pips on the base.
  const mark = o.locked ? 0 : Math.max(0, Math.min(5, o.mark ?? 1));
  for (let i = 0; i < 5; i++) {
    const x = -16 + i * 8;
    const pip = rrect(x - 2.5, H / 2 - 24, 5, 7, 1.2);
    c.drawPath(pip, fill(i < mark ? col : SPACE.hull0));
    c.drawPath(pip, stroke(alpha(col, 0.5), 0.6));
  }
  // Grip ridges.
  for (let i = 0; i < 3; i++) c.drawPath(line(-14, H / 2 - 13 + i * 2.5, 14, H / 2 - 13 + i * 2.5), stroke(alpha(SPACE.steel, 0.35), 0.8));
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
      // A rack of stacked cargo crates, the two new ones lit in copper.
      c.drawPath(poly([-24, -26, -24, 26, 24, 26, 24, -26], false), stroke(SPACE.steel, 1.6));
      for (const y of [-8, 10]) c.drawPath(line(-24, y, 24, y), stroke(SPACE.steel, 1.4));
      const crate = (x: number, y: number, lit: boolean) => {
        part(c, rrect(x, y, 14, 14, 1.5), lit ? mix(SPACE.hull2, ORE.copper, 0.35) : SPACE.hull2, lit ? ORE.copper : SPACE.lineDim, 1.1, lit ? 0.8 : 0.2);
        c.drawPath(line(x + 2, y + 2, x + 12, y + 12), stroke(alpha(lit ? ORE.copper : SPACE.steel, 0.5), 0.8));
      };
      crate(-21, -23, false);
      crate(-5, -23, false);
      crate(-21, -5, false);
      crate(-5, -5, true);
      crate(9, -5, true);
      crate(-13, 12, false);
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
      // A contract plate held in a clamp: the contract is kept one launch longer.
      part(c, rrect(-15, -20, 30, 36, 3), SPACE.hull2, SPACE.steel, 1.2, 0.3);
      for (let i = 0; i < 3; i++) c.drawPath(line(-10, -12 + i * 7, 10 - (i % 2) * 7, -12 + i * 7), stroke(alpha(SPACE.steel, 0.6), 1.2));
      for (let i = 0; i < 4; i++) c.drawCircle(-7.5 + i * 5, 10, 1.5, fill(i < 3 ? SPACE.line : SPACE.hull3));
      // The clamp: a jaw over the plate's top edge.
      part(c, poly([-20, -28, 20, -28, 20, -18, 12, -18, 12, -22, -12, -22, -12, -18, -20, -18]), SPACE.hull3, SPACE.amber, 1.3, 0.6);
      c.drawPath(line(0, -28, 0, -32), stroke(SPACE.steel, 2));
      break;
    }
    case 'sorter': {
      // Three chutes merging into one: chunks of three ores, only the wanted one goes on.
      const ores = ['iron', 'ice', 'copper'];
      ores.forEach((o, i) => {
        const x = -18 + i * 18;
        part(c, poly([x - 6, -26, x + 6, -26, x + 3, -12, x - 3, -12]), SPACE.hull2, SPACE.line, 1.1, 0.4);
        c.save();
        c.translate(x, -20);
        drawOreShape(c, o, 3, { glow: 0, line: 0.8 });
        c.restore();
      });
      c.drawPath(poly([-18, -12, -4, 2], false), stroke(SPACE.steel, 2));
      c.drawPath(poly([18, -12, 4, 2], false), stroke(SPACE.steel, 2));
      c.drawPath(poly([0, -12, 0, 2], false), stroke(ORE.ice, 2.2));
      part(c, poly([-6, 2, 6, 2, 4, 16, -4, 16]), mix(SPACE.hull1, ORE.ice, 0.35), ORE.ice, 1.3, 0.8);
      c.save();
      c.translate(0, 23);
      drawOreShape(c, 'ice', 4, { glow: 0.3, line: 1 });
      c.restore();
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
