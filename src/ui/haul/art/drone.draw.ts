/**
 * The hauler drone: a hex body with two thruster pods, one look, tinted per route ore. Drawn
 * nose to the right (+x), so a sprite rotation equals the drone's heading. About 18 x 16 pt.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { SPACE, alpha, mix, oreColor } from './palette';
import { LINE, fill, glow, lamp, light, litStroke, ngon, part, poly, rrect, stroke } from './pen';

/** Half-size of a drone sprite's box (points). */
export const DRONE_BOX = 11;

export interface DroneOptions {
  /** Route ore (cargo light and pod rims); null for an idle drone (cyan). */
  ore: string | null;
  /** Carrying a load: the cargo bay is lit and full. Default true. */
  loaded?: boolean;
}

export function drawDrone(c: SkCanvas, o: DroneOptions): void {
  const tint = o.ore ? oreColor(o.ore) : SPACE.line;
  const loaded = o.loaded ?? true;
  // Soft shadow-glow so it lifts off rocks and routes.
  glow(c, 0, 0, 11, tint, 0.18);
  // Struts to the pods.
  c.drawPath(poly([-1, -3, -4, -6.2, -4, 6.2, -1, 3], false), stroke(SPACE.steelDim, 2.2));
  // Thruster pods, rear left and right.
  for (const sy of [-1, 1]) {
    const pod = rrect(-8, sy * 6.2 - 2.4, 7, 4.8, 2.4);
    part(c, pod, SPACE.hull2, mix(SPACE.line, tint, 0.35), 1.1, 0.3);
    c.drawCircle(-7.4, sy * 6.2, 1.3, fill(alpha(SPACE.flame, 0.9)));
  }
  // Hex body, pointy end forward.
  const body = ngon(0.5, 0, 6, 6, 0);
  part(c, body, SPACE.hull1, SPACE.line, LINE, 0.55);
  // Cargo bay: an inner hex in the ore colour.
  const bay = ngon(-0.6, 0, 3.4, 6, 0);
  c.drawPath(bay, fill(loaded ? mix(tint, '#000000', 0.25) : SPACE.hull0));
  if (loaded) {
    c.drawPath(ngon(-1.2, -0.6, 1.8, 6, 0), fill(alpha(mix(tint, '#FFFFFF', 0.35), 0.9)));
  }
  c.drawPath(bay, stroke(tint, 0.9));
  // Sensor eye at the nose.
  lamp(c, 5, 0, 0.9, SPACE.white, 2.6);
}

/** Thruster flame behind both pods, `k` 0..1 length (flicker by drawing 2 or 3 lengths). */
export function drawThrusterFlame(c: SkCanvas, k = 1): void {
  for (const sy of [-1, 1]) {
    const y = sy * 6.2;
    const l = 4 + 5 * k;
    c.drawPath(poly([-8, y - 1.9, -8 - l, y, -8, y + 1.9]), light(alpha(SPACE.flameOuter, 0.55)));
    c.drawPath(poly([-8, y - 1.1, -8 - l * 0.65, y, -8, y + 1.1]), light(alpha(SPACE.flame, 0.8)));
    c.drawPath(poly([-8, y - 0.5, -8 - l * 0.3, y, -8, y + 0.5]), light(SPACE.flameHot));
  }
}

/** The "!" badge over an idle drone on its cradle (bob it with a translation). */
export function drawIdleBadge(c: SkCanvas): void {
  glow(c, 0, 0, 8, SPACE.amber, 0.4);
  const tag = rrect(-3.6, -4.2, 7.2, 8.4, 2.2);
  c.drawPath(tag, fill(SPACE.amber));
  c.drawPath(poly([-1.6, 4.1, 0, 6.2, 1.6, 4.1]), fill(SPACE.amber));
  c.drawPath(poly([0, -2.6, 0, 1], false), stroke(SPACE.bg, 1.5));
  c.drawCircle(0, 2.7, 0.8, fill(SPACE.bg));
  litStroke(c, tag, mix(SPACE.amber, '#FFFFFF', 0.4), 0.6, 0);
}
