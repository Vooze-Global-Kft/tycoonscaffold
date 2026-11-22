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
import { TAU, arc, circle, fill, glow, line, litStroke, ngon, poly, rrect, stroke } from './pen';
import { drawRig } from './rig.draw';

function scaled(c: SkCanvas, size: number, draw: () => void, design = 40): void {
  c.save();
  c.scale(size / design, size / design);
  draw();
  c.restore();
}

/** An ore icon: a cluster of three faceted crystals in the ore colour. */
export function drawOreIcon(c: SkCanvas, size: number, ore: string): void {
  const tint = oreColor(ore);
  scaled(c, size, () => {
    glow(c, 0, 2, 20, tint, 0.35);
    const crystal = (x: number, y: number, h: number, w: number, tilt: number) => {
      c.save();
      c.translate(x, y);
      c.rotate(tilt, 0, 0);
      const body = poly([0, -h, w, -h * 0.6, w, h * 0.3, 0, h * 0.5, -w, h * 0.3, -w, -h * 0.6]);
      c.drawPath(body, fill(mix(tint, '#000000', 0.3)));
      c.drawPath(poly([0, -h, w, -h * 0.6, w, h * 0.3, 0, h * 0.5]), fill(tint));
      c.drawPath(poly([0, -h, -w * 0.4, -h * 0.55, 0, -h * 0.2, w * 0.5, -h * 0.55]), fill(alpha('#FFFFFF', 0.55)));
      c.drawPath(body, stroke(mix(tint, '#FFFFFF', 0.45), 1.2));
      c.restore();
    };
    crystal(-8, 6, 11, 5, -18);
    crystal(8, 7, 9, 4.5, 20);
    crystal(0, 1, 15, 6, 0);
    c.drawPath(poly([-15, 12, 15, 12], false), stroke(alpha(tint, 0.5), 1.2));
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

/** Warp Core: a cyan crystal core held in a hex ring. */
export function drawWarpCoreIcon(c: SkCanvas, size: number): void {
  scaled(c, size, () => {
    glow(c, 0, 0, 20, SPACE.core, 0.55);
    const ring = ngon(0, 0, 16, 6, -Math.PI / 2);
    c.drawPath(ring, stroke(SPACE.hull2, 5));
    litStroke(c, ring, SPACE.line, 1.4, 0.8);
    const gem = poly([0, -11, 6, -3, 6, 4, 0, 11, -6, 4, -6, -3]);
    c.drawPath(gem, fill(mix(SPACE.core, '#0A3040', 0.4)));
    c.drawPath(poly([0, -11, 6, -3, 0, 0, -6, -3]), fill(mix(SPACE.core, '#FFFFFF', 0.5)));
    c.drawPath(gem, stroke('#E9FEFF', 1.2));
    for (let i = 0; i < 6; i++) {
      const a = (TAU * i) / 6 - Math.PI / 2;
      c.drawCircle(Math.cos(a) * 16, Math.sin(a) * 16, 1.4, fill(SPACE.core));
    }
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
    c.rotate(20, 0, 0);
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
        // A pod with a laser cut across it.
        c.drawPath(rrect(-13, -9, 26, 18, 6), ink);
        c.drawPath(line(-17, 0, 17, 0), stroke(SPACE.red, 1.8));
        c.drawCircle(9, 0, 2, fill('#FFFFFF'));
        c.drawPath(line(-6, -9, -6, -4), thin);
        c.drawPath(line(6, 9, 6, 4), thin);
        break;
      }
      case 'fitting': {
        // A hex socket with a cartridge sliding in.
        c.drawPath(ngon(0, 3, 12, 6, 0), ink);
        c.drawPath(rrect(-5, -14, 10, 15, 2), ink);
        c.drawPath(line(-2, -10, 2, -10), thin);
        c.drawPath(poly([-3, 5, 0, 8, 3, 5], false), thin);
        break;
      }
      case 'starmap': {
        // A core with three arms of nodes.
        c.drawCircle(0, 2, 3, fill(color));
        for (const a of [-90, 30, 150]) {
          const r = (a * Math.PI) / 180;
          c.drawPath(line(Math.cos(r) * 4, 2 + Math.sin(r) * 4, Math.cos(r) * 13, 2 + Math.sin(r) * 13), thin);
          c.drawPath(circle(Math.cos(r) * 8.5, 2 + Math.sin(r) * 8.5, 2), ink);
          c.drawPath(circle(Math.cos(r) * 14.5, 2 + Math.sin(r) * 14.5, 2), ink);
        }
        break;
      }
      case 'trade': {
        // A docking terminal: a crate under a hook, with a fuel cell mark.
        c.drawPath(line(0, -15, 0, -8), thin);
        c.drawPath(poly([-4, -11, 0, -8, 4, -11], false), thin);
        c.drawPath(rrect(-12, -6, 24, 18, 2), ink);
        c.drawPath(line(-12, 0, 12, 0), thin);
        c.drawPath(ngon(0, 6.5, 3.6, 6, 0), stroke(SPACE.dm, 1.6));
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

/** The round rail button behind a glyph (44 pt on the large layout), for mocks and the HUD. */
export function drawRailButton(c: SkCanvas, size: number, id: RailGlyph, badge?: string): void {
  const r = size / 2;
  c.drawPath(circle(0, 0, r), fill(SPACE.hull1));
  litStroke(c, circle(0, 0, r - 0.75), alpha(SPACE.line, 0.65), 1.2, 0.4);
  drawRailGlyph(c, size * 0.62, id);
  if (badge) {
    c.drawPath(circle(r * 0.72, -r * 0.72, 5), fill(SPACE.dm));
  }
}

