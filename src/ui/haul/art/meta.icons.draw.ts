/**
 * "art:" icons the screens need beyond the first list (errata 42): the six galaxy conditions,
 * the eight Star Map nodes, and the Trade Post's Time Warp, Fuel Cell, Fuel Tank, Clearance,
 * Hangar Expansion and Prospector Charter. Each draws into a square of side `size` centred on the
 * origin (designed on a 40-unit square).
 */
import { ClipOp, type SkCanvas } from '@shopify/react-native-skia';
import { drawText } from './glyphs';
import { drawOreShape } from './ore.draw';
import { SPACE, alpha, mix } from './palette';
import { DEG, arc, circle, dashed, fill, glow, lamp, line, litStroke, ngon, poly, rrect, stroke } from './pen';
import { CONDITIONS, type ConditionId } from './spokes.draw';
import { NODE_ARM, drawNodePartShape, type StarNode } from './station.draw';
import { drawDrillHead } from './rig.draw';

function scaled(c: SkCanvas, size: number, draw: () => void, design = 40): void {
  c.save();
  c.scale(size / design, size / design);
  draw();
  c.restore();
}

function sparkle(c: SkCanvas, x: number, y: number, s: number, color: string): void {
  glow(c, x, y, s * 2, color, 0.45);
  c.drawPath(poly([x, y - s, x + s * 0.24, y - s * 0.24, x + s, y, x + s * 0.24, y + s * 0.24, x, y + s, x - s * 0.24, y + s * 0.24, x - s, y, x - s * 0.24, y - s * 0.24]), fill(mix(color, '#FFFFFF', 0.45)));
}

// ---------------------------------------------------------------------------
// Galaxy conditions: a rounded plate in the condition's colour with its emblem
// ---------------------------------------------------------------------------

/** A galaxy condition's icon. */
export function drawConditionIcon(c: SkCanvas, size: number, id: ConditionId | string): void {
  const cond = CONDITIONS.find((x) => x.id === id);
  const col = cond?.color ?? SPACE.steel;
  scaled(c, size, () => {
    const plate = rrect(-18, -18, 36, 36, 9);
    c.drawPath(plate, fill(mix(SPACE.panel, col, 0.1)));
    litStroke(c, plate, col, 1.4, 0.5);
    switch (id) {
      case 'frost': {
        // Ice spikes rimed with frost dots.
        for (const [x, y, s, r] of [
          [-2, 1, 9, -8],
          [8, 6, 5.5, 14],
          [-10, 7, 4.5, -20],
        ] as const) {
          c.save();
          c.translate(x, y);
          c.rotate(r, 0, 0);
          drawOreShape(c, 'ice', s, { glow: 0, line: 1.1 });
          c.restore();
        }
        for (const [x, y] of [
          [-11, -9],
          [10, -8],
          [12, -2],
          [-6, -12],
        ])
          c.drawCircle(x, y, 1.2, fill('#E6F7FF'));
        break;
      }
      case 'solar': {
        // A sun disc with wind streaming off it to the right.
        glow(c, -6, 0, 14, col, 0.5);
        c.drawCircle(-6, 0, 7, fill(col));
        c.drawCircle(-8, -2, 2.6, fill(alpha('#FFFFFF', 0.7)));
        for (const [y, l] of [
          [-7, 11],
          [0, 15],
          [7, 11],
        ])
          c.drawPath(poly([3, y, 3 + l * 0.5, y - 1.5, 3 + l, y], false), stroke(col, 1.8));
        break;
      }
      case 'storms': {
        // A storm of rich seams: three sparkles round a rock.
        c.drawPath(ngon(0, 3, 7, 7, 0.3), fill(SPACE.hull3));
        c.drawPath(ngon(0, 3, 7, 7, 0.3), stroke(alpha(SPACE.steel, 0.8), 1.1));
        sparkle(c, -9, -8, 5, SPACE.gold);
        sparkle(c, 9, -6, 4, SPACE.gold);
        sparkle(c, 8, 11, 3.4, SPACE.gold);
        break;
      }
      case 'longhaul': {
        // Two points far apart, a long arrow between them.
        c.drawCircle(-12, 8, 3, fill(SPACE.line));
        c.drawPath(circle(12, -8, 4), stroke(col, 1.6));
        c.drawPath(line(-8, 5.5, 7, -4.5), dashed(col, 1.8, 3, 2.5));
        c.drawPath(poly([9.5, -6.2, 3, -5.8, 6.5, 0.5]), fill(col));
        break;
      }
      case 'heavy': {
        // An iron block weighing down, a downward arrow under it.
        c.save();
        c.translate(0, -4);
        drawOreShape(c, 'iron', 9, { glow: 0, line: 1.4 });
        c.restore();
        c.drawPath(line(-12, 11, 12, 11), stroke(col, 2));
        c.drawPath(poly([-4, 7, 4, 7, 0, 12]), fill(mix(col, '#FFFFFF', 0.3)));
        break;
      }
      case 'hotcore': {
        // A drill bit glowing hot, with flame tongues.
        glow(c, 0, 2, 14, col, 0.5);
        for (const [x, h] of [
          [-7, 9],
          [0, 13],
          [7, 9],
        ])
          c.drawPath(poly([x - 3.5, 8, x, 8 - h, x + 3.5, 8]), fill(alpha(mix(col, SPACE.amber, 0.4), 0.9)));
        c.save();
        c.translate(0, 6);
        drawDrillHead(c, 6.5);
        c.restore();
        break;
      }
      default:
        c.drawPath(circle(0, 0, 8), stroke(col, 1.6));
    }
  });
}

// ---------------------------------------------------------------------------
// Star Map nodes: the part each node adds, in a roundel of its arm's colour
// ---------------------------------------------------------------------------

/** Arm colours of the Star Map (Survey cyan, Trade gold, Fleet green). */
export const ARM_COLOR = { survey: SPACE.line, trade: SPACE.gold, fleet: SPACE.green } as const;

/** A Star Map node's icon: the station part it adds, in a roundel ringed in its arm's colour. */
export function drawNodeIcon(c: SkCanvas, size: number, node: StarNode): void {
  const col = ARM_COLOR[NODE_ARM[node]];
  scaled(c, size, () => {
    c.drawPath(circle(0, 0, 18), fill(SPACE.hull1));
    litStroke(c, circle(0, 0, 18), col, 1.6, 0.6);
    c.save();
    c.clipPath(circle(0, 0, 17), ClipOp.Intersect, true);
    c.scale(1.35, 1.35);
    drawNodePartShape(c, node, node === 'prospect' ? 40 : 6);
    c.restore();
  });
}

// ---------------------------------------------------------------------------
// Trade Post
// ---------------------------------------------------------------------------

/** Time Warp: an hourglass inside a warp swirl (two hours of income at once). */
export function drawTimeWarpIcon(c: SkCanvas, size: number): void {
  scaled(c, size, () => {
    glow(c, 0, 0, 20, SPACE.line, 0.35);
    c.drawPath(arc(0, 0, 16, -60, 150), stroke(alpha(SPACE.line, 0.8), 2));
    c.drawPath(arc(0, 0, 16, 120, 150), stroke(alpha(SPACE.line, 0.8), 2));
    c.drawPath(poly([12, -12, 14.5, -6.5, 8.5, -8.5]), fill(SPACE.line));
    c.drawPath(poly([-12, 12, -14.5, 6.5, -8.5, 8.5]), fill(SPACE.line));
    const glass = poly([-7, -11, 7, -11, 1.5, 0, 7, 11, -7, 11, -1.5, 0]);
    c.drawPath(glass, fill(SPACE.hull1));
    c.drawPath(poly([-4.5, 11, 4.5, 11, 0, 4]), fill(SPACE.gold));
    c.drawPath(poly([-3.5, -8, 3.5, -8, 0, -2]), fill(alpha(SPACE.gold, 0.6)));
    litStroke(c, glass, SPACE.white, 1.3, 0.5);
    c.drawPath(line(-9, -11.5, 9, -11.5), stroke(SPACE.steel, 2));
    c.drawPath(line(-9, 11.5, 9, 11.5), stroke(SPACE.steel, 2));
  });
}

function dmCell(c: SkCanvas, x: number, y: number, w: number, h: number): void {
  const cell = rrect(x - w / 2, y - h / 2, w, h, w / 2);
  c.drawPath(cell, fill(SPACE.dmDeep));
  c.drawPath(arc(x, y + h * 0.08, w * 0.26, 200, 230), stroke(alpha('#E3D4FF', 0.9), Math.max(1, w * 0.12)));
  c.drawCircle(x, y + h * 0.08, w * 0.08, fill('#0A0618'));
  litStroke(c, cell, SPACE.dm, 1.3, 0.8);
  c.drawPath(rrect(x - w * 0.3, y - h / 2 - 2, w * 0.6, 3, 1), fill(SPACE.steel));
}

/** Fuel Cell: one Dark Matter cell (150 DM). */
export function drawFuelCellIcon(c: SkCanvas, size: number): void {
  scaled(c, size, () => {
    glow(c, 0, 0, 18, SPACE.dm, 0.45);
    dmCell(c, 0, 1, 14, 26);
  });
}

/** Fuel Tank: a rack of three Dark Matter cells in a frame (700 DM). */
export function drawFuelTankIcon(c: SkCanvas, size: number): void {
  scaled(c, size, () => {
    glow(c, 0, 0, 20, SPACE.dm, 0.5);
    const frame = rrect(-17, -13, 34, 28, 4);
    c.drawPath(frame, fill(SPACE.hull0));
    litStroke(c, frame, SPACE.steel, 1.3, 0.3);
    for (const x of [-10, 0, 10]) dmCell(c, x, 2, 8.5, 20);
  });
}

/** Clearance: a hex shield with a clear check (no banners, every ad reward without the ad). */
export function drawClearanceIcon(c: SkCanvas, size: number): void {
  scaled(c, size, () => {
    glow(c, 0, 0, 20, SPACE.green, 0.35);
    const shield = poly([0, -17, 14, -11, 13, 4, 0, 17, -13, 4, -14, -11]);
    c.drawPath(shield, fill(mix(SPACE.panel, SPACE.green, 0.15)));
    litStroke(c, shield, SPACE.green, 1.8, 0.8);
    c.drawPath(poly([-7, 0, -2, 5, 8, -6], false), stroke(SPACE.green, 3));
  });
}

/** Hangar Expansion: the hangar block with its doors open, a drone nose in each, and "+6". */
export function drawHangarIcon(c: SkCanvas, size: number): void {
  scaled(c, size, () => {
    glow(c, 0, 2, 18, SPACE.line, 0.3);
    const box = poly([-16, -6, 16, -6, 17.5, 12, -17.5, 12]);
    c.drawPath(box, fill(SPACE.hull1));
    litStroke(c, box, SPACE.line, 1.5, 0.6);
    for (let i = 0; i < 4; i++) {
      const x = -13.5 + i * 7;
      c.drawPath(poly([x, -3, x + 5.5, -3, x + 6.5, 10, x + 1, 10]), fill(SPACE.hull0));
      c.drawPath(poly([x, -3, x + 5.5, -3, x + 5.8, 1, x + 0.3, 1]), fill(alpha(SPACE.steel, 0.8)));
      c.drawPath(poly([x + 2, 10, x + 3.5, 5, x + 5, 10]), fill(SPACE.line));
    }
    const tag = rrect(4, -18, 16, 11, 4);
    c.drawPath(tag, fill(SPACE.line));
    drawText(c, '+6', 12, -15.5, { size: 6, color: SPACE.bg, align: 'center', glow: 0, weight: 1.4 });
  });
}

/** Prospector Charter: a charter plate with a platinum seal (starter pack, once). */
export function drawCharterIcon(c: SkCanvas, size: number): void {
  scaled(c, size, () => {
    glow(c, 0, 0, 20, SPACE.gold, 0.25);
    const doc = poly([-13, -16, 9, -16, 14, -11, 14, 16, -13, 16]);
    c.drawPath(doc, fill(SPACE.hull2));
    litStroke(c, doc, SPACE.steel, 1.3, 0.3);
    for (let i = 0; i < 3; i++) c.drawPath(line(-9, -10 + i * 5, 9 - (i % 2) * 6, -10 + i * 5), stroke(alpha(SPACE.steel, 0.65), 1.3));
    // Seal: a gold rosette with the platinum diamond.
    c.save();
    c.translate(4, 8);
    c.drawPath(ngon(0, 0, 8, 12, 0), fill(SPACE.goldDeep));
    c.drawPath(ngon(0, 0, 8, 12, 0), stroke(SPACE.gold, 1.1));
    drawOreShape(c, 'platinum', 4, { glow: 0, line: 0.9 });
    c.restore();
    c.drawPath(poly([-1, 14, -3, 21, 1, 19, 4, 22, 4, 15], false), stroke(SPACE.gold, 1.2));
    void lamp;
    void DEG;
  });
}
