/**
 * "art:" icons of Orbit Haulers: ores, pods, Dark Matter, Warp Core, credits, drone, freighter,
 * rig, flare and the six station-rail glyphs. Each draws into a square of side `size` centred on
 * the origin (designed on a 40-unit square and scaled).
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { drawDrone, drawThrusterFlame } from './drone.draw';
import { drawFreighter } from './freighter.draw';
import { drawFlare, drawCreditGlyph } from './fx.draw';
import { SPACE, alpha, mix, oreColor } from './palette';
import { drawPod, type PodTier } from './pods.draw';
import { arc, circle, fill, glow, line, litStroke, ngon, poly, rrect, stroke } from './pen';
import { drawText, textWidth } from './glyphs';
import { drawOreShape } from './ore.draw';
import { drawRig } from './rig.draw';

function scaled(c: SkCanvas, size: number, draw: () => void, design = 40): void {
  c.save();
  c.scale(size / design, size / design);
  draw();
  c.restore();
}

/**
 * An ore icon: the ore's own silhouette (ore.draw.ts), one large piece and two small ones, so
 * the five ores differ by shape as well as colour (critique M1).
 */
export function drawOreIcon(c: SkCanvas, size: number, ore: string): void {
  const tint = oreColor(ore);
  scaled(c, size, () => {
    glow(c, 0, 2, 20, tint, 0.3);
    // One big piece, two small ones scattered unevenly beside it (never a symmetric base).
    c.save();
    c.translate(-2.5, -2);
    drawOreShape(c, ore, 10.5, { glow: 0, line: 1.6 });
    c.restore();
    for (const [x, y, s, r] of [
      [11.5, 9, 4.4, 18],
      [-12.5, 11.5, 3.2, -24],
    ] as const) {
      c.save();
      c.translate(x, y);
      c.rotate(r, 0, 0);
      drawOreShape(c, ore, s, { glow: 0, line: 1.1 });
      c.restore();
    }
    c.drawPath(poly([-16, 15.5, 16, 15.5], false), stroke(alpha(tint, 0.45), 1.2));
  });
}

export function drawPodIcon(c: SkCanvas, size: number, tier: PodTier): void {
  scaled(c, size, () => drawPod(c, tier), 66);
}

/** Dark Matter: a violet orb with a dark swirling core and an orbit ring. */
export function drawDarkMatterIcon(c: SkCanvas, size: number): void {
  scaled(c, size, () => {
    glow(c, 0, 0, 20, SPACE.dm, 0.55);
    c.drawPath(circle(0, 0, 12), fill(SPACE.dmDeep));
    for (let i = 0; i < 3; i++) {
      const a = (i * 360) / 3;
      c.drawPath(arc(0, 0, 4 + i * 2.6, a, 200), stroke(alpha(mix(SPACE.dm, '#FFFFFF', 0.3), 0.9 - i * 0.2), 1.6));
    }
    c.drawCircle(0, 0, 2.6, fill('#0A0618'));
    litStroke(c, circle(0, 0, 12), SPACE.dm, 1.6, 1);
    c.save();
    c.rotate(-20, 0, 0);
    c.drawOval({ x: -18, y: -5, width: 36, height: 10 }, stroke(alpha('#E3D4FF', 0.75), 1.1));
    c.restore();
    c.drawCircle(-6, -6, 2, fill(alpha('#FFFFFF', 0.7)));
  });
}

/**
 * Warp Core: a glowing torus seen at a tilt, with four inward star streaks, in a white-gold core
 * and a deep-violet rim (colours no ore uses; it is not a gem, unlike the ore icons).
 */
export function drawWarpCoreIcon(c: SkCanvas, size: number): void {
  const GOLD = '#FFE9A8';
  const RIM = '#5B2BB8';
  scaled(c, size, () => {
    glow(c, 0, 0, 20, GOLD, 0.45);
    // Four streaks falling inward.
    for (const a of [45, 135, 225, 315]) {
      const r = (a * Math.PI) / 180;
      const p = line(Math.cos(r) * 19, Math.sin(r) * 19, Math.cos(r) * 11, Math.sin(r) * 11);
      c.drawPath(p, stroke(alpha(GOLD, 0.3), 3));
      c.drawPath(p, stroke('#FFFFFF', 1));
    }
    // The torus: a thick violet ring with a gold inner light.
    c.drawOval({ x: -15, y: -9, width: 30, height: 18 }, stroke(RIM, 7));
    c.drawOval({ x: -15, y: -9, width: 30, height: 18 }, stroke(alpha('#B48CFF', 0.9), 1.2));
    c.drawOval({ x: -9.5, y: -4.5, width: 19, height: 9 }, stroke(alpha(GOLD, 0.9), 2.2));
    c.drawOval({ x: -18.5, y: -12.5, width: 37, height: 25 }, stroke(alpha('#B48CFF', 0.7), 1));
    // The hot core in the hole.
    glow(c, 0, 0, 8, '#FFFFFF', 0.8);
    c.drawOval({ x: -4.5, y: -2.4, width: 9, height: 4.8 }, fill('#FFF8E0'));
  });
}

export function drawCreditsIcon(c: SkCanvas, size: number): void {
  scaled(c, size, () => {
    c.save();
    c.translate(-5, 4);
    drawCreditGlyph(c, 20);
    c.restore();
    c.save();
    c.translate(6, -5);
    drawCreditGlyph(c, 22);
    c.restore();
  });
}

export function drawDroneIcon(c: SkCanvas, size: number): void {
  scaled(c, size, () => {
    c.save();
    c.rotate(-45, 0, 0);
    drawThrusterFlame(c, 0.6);
    drawDrone(c, { ore: 'copper' });
    c.restore();
  }, 30);
}

export function drawFreighterIcon(c: SkCanvas, size: number): void {
  scaled(c, size, () => {
    c.save();
    c.rotate(35, 0, 0);
    drawFreighter(c, { hull: 1 });
    c.restore();
  }, 50);
}

export function drawRigIcon(c: SkCanvas, size: number): void {
  scaled(c, size, () => drawRig(c, { look: 0 }), 36);
}

export function drawFlareIcon(c: SkCanvas, size: number): void {
  scaled(c, size, () => {
    c.save();
    c.translate(-1, 1);
    drawFlare(c);
    c.restore();
  }, 26);
}

// ---------------------------------------------------------------------------
// Rail glyphs: line icons for the six round buttons of the station rail
// ---------------------------------------------------------------------------

export type RailGlyph = 'comms' | 'salvage' | 'fitting' | 'starmap' | 'trade' | 'menu';
export const RAIL_GLYPHS: RailGlyph[] = ['comms', 'salvage', 'fitting', 'starmap', 'trade', 'menu'];

/** A rail glyph in `color` (default the line cyan), stroke-only so it sits on any button. */
export function drawRailGlyph(c: SkCanvas, size: number, id: RailGlyph, color: string = SPACE.line): void {
  scaled(c, size, () => {
    const ink = stroke(color, 2);
    const thin = stroke(color, 1.4);
    switch (id) {
      case 'comms': {
        // A mast with radio waves.
        c.drawPath(poly([-5, 13, 0, -2, 5, 13], false), ink);
        c.drawPath(line(-3, 7, 3, 7), thin);
        c.drawCircle(0, -4, 2.2, fill(color));
        for (const r of [7, 12]) {
          c.drawPath(arc(0, -4, r, -150, 50), ink);
          c.drawPath(arc(0, -4, r, -80, 50), ink);
        }
        break;
      }
      case 'salvage': {
        // The scrap pod's silhouette with its hazard bar, and a short bright laser along its seam.
        c.drawPath(poly([-14, -4, -10, -10, 10, -10, 14, -4, 14, 8, 10, 11, -10, 11, -14, 8]), ink);
        for (const x of [-7, -2, 3, 8]) c.drawPath(line(x - 1.5, -6, x + 1.5, -9), stroke(SPACE.amber, 1.4));
        c.drawPath(line(-14, 1.5, -1, 1.5), stroke(alpha('#FFFFFF', 0.95), 1.6));
        c.drawPath(line(-1, 1.5, 14, 1.5), stroke(alpha(color, 0.45), 1.1));
        glow(c, -1, 1.5, 5, '#FFFFFF', 0.7);
        c.drawCircle(-1, 1.5, 1.6, fill('#FFFFFF'));
        break;
      }
      case 'fitting': {
        // The three sockets of the Fitting Bay: three small hexagons in a triangle, one filled.
        const hx = (x: number, y: number, on: boolean) => {
          const p = ngon(x, y, 6.2, 6, 0);
          if (on) c.drawPath(p, fill(alpha(color, 0.85)));
          c.drawPath(p, ink);
        };
        hx(-7.5, -5, true);
        hx(7.5, -5, false);
        hx(0, 8, false);
        break;
      }
      case 'starmap': {
        // A four-point star at the centre of three dotted arms.
        for (const a of [-90, 30, 150]) {
          const r = (a * Math.PI) / 180;
          for (const d of [8.5, 12.5]) c.drawCircle(Math.cos(r) * d, 1 + Math.sin(r) * d, 1.3, fill(color));
          c.drawPath(circle(Math.cos(r) * 16, 1 + Math.sin(r) * 16, 2.2), thin);
        }
        c.drawPath(poly([0, -6, 1.6, -0.6, 7, 1, 1.6, 2.6, 0, 8, -1.6, 2.6, -7, 1, -1.6, -0.6]), fill(color));
        break;
      }
      case 'trade': {
        // A Dark Matter fuel cell (capsule with the swirl) beside a small credit mark.
        const cell = rrect(-13, -12, 13, 24, 6.5);
        c.drawPath(cell, ink);
        c.drawPath(line(-10, -7, -3, -7), thin);
        c.drawPath(arc(-6.5, 2, 4, 200, 230), stroke(SPACE.dm, 1.6));
        c.drawPath(arc(-6.5, 2, 1.8, 20, 230), stroke(SPACE.dm, 1.4));
        c.drawPath(poly([9, -4, 14, 1, 9, 6, 4, 1]), ink);
        drawText(c, '₵', 9, -1.8, { size: 3.6, color, align: 'center', glow: 0, weight: 1 });
        break;
      }
      case 'menu': {
        // Three sliders (station settings).
        for (const [y, x] of [
          [-8, -4],
          [0, 5],
          [8, -1],
        ] as const) {
          c.drawPath(line(-13, y, 13, y), thin);
          c.drawPath(circle(x, y, 3), fill(SPACE.panel));
          c.drawPath(circle(x, y, 3), ink);
        }
        break;
      }
    }
  });
}

/**
 * A rail badge: a count dot (Comms, Salvage) at a button's upper right, or a small value plate
 * (the Trade Post's Dark Matter balance). Centred on the origin; `text` empty draws a plain dot.
 * Ink and plate keep 4.5:1 contrast. Returns the badge width.
 */
export function drawRailBadge(c: SkCanvas, text: string, kind: 'count' | 'dm' = 'count'): number {
  const col = kind === 'dm' ? SPACE.dm : SPACE.red;
  const size = 5;
  if (!text) {
    c.drawPath(circle(0, 0, 3.6), fill(col));
    c.drawPath(circle(0, 0, 3.6), stroke(SPACE.bg, 1.2));
    return 7.2;
  }
  const tw = textWidth(text, size);
  const w = Math.max(10, tw + 6);
  const plate = rrect(-w / 2, -5, w, 10, 5);
  c.drawPath(plate, fill(kind === 'dm' ? SPACE.dmDeep : col));
  c.drawPath(plate, stroke(SPACE.bg, 1.2));
  if (kind === 'dm') c.drawPath(plate, stroke(alpha(SPACE.dm, 0.9), 0.7));
  drawText(c, text, 0, -size / 2, { size, color: '#FFFFFF', align: 'center', glow: 0, weight: 1 });
  return w;
}

/** The round rail button behind a glyph (44 pt on the large layout), for mocks and the HUD. */
export function drawRailButton(c: SkCanvas, size: number, id: RailGlyph, badge?: string, badgeKind: 'count' | 'dm' = 'count'): void {
  const r = size / 2;
  c.drawPath(circle(0, 0, r), fill(SPACE.hull1));
  litStroke(c, circle(0, 0, r - 0.75), alpha(SPACE.line, 0.65), 1.2, 0.4);
  drawRailGlyph(c, size * 0.62, id);
  if (badge !== undefined) {
    c.save();
    c.translate(r * 0.7, -r * 0.7);
    drawRailBadge(c, badge, badgeKind);
    c.restore();
  }
}
