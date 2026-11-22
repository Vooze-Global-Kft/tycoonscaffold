/**
 * The hauler drone: a hex body with two thruster pods, one look, tinted per route ore. Drawn
 * nose to the right (+x), so a sprite rotation equals the drone's heading. About 18 x 16 pt.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { SPACE, alpha, mix, oreColor } from './palette';
import { LINE, circle, fill, glow, lamp, light, litStroke, ngon, part, poly, rrect, stroke } from './pen';
import { drawOreShape } from './ore.draw';

/** Half-size of a drone sprite's box (points). */
export const DRONE_BOX = 11;

export interface DroneOptions {
  /** Route ore (cargo light and pod rims); null for an idle drone (cyan). */
  ore: string | null;
  /** Carrying a load: the cargo bay is lit and full. Default true. */
  loaded?: boolean;
}

/** The drone's hull outline: pale steel-white, so drones are the brightest moving things on the field. */
const HULL_OUTLINE = '#DDF3FF';

export function drawDrone(c: SkCanvas, o: DroneOptions): void {
  const tint = o.ore ? oreColor(o.ore) : SPACE.line;
  const loaded = o.loaded ?? true;
  // Soft shadow-glow so it lifts off rocks and routes.
  glow(c, 0, 0, 11, tint, 0.2);
  // Struts to the pods.
  c.drawPath(poly([-1, -3, -4, -6.2, -4, 6.2, -1, 3], false), stroke(SPACE.steelDim, 2.2));
  // Thruster pods, rear left and right.
  for (const sy of [-1, 1]) {
    const pod = rrect(-8, sy * 6.2 - 2.4, 7, 4.8, 2.4);
    part(c, pod, SPACE.hull2, mix(HULL_OUTLINE, tint, 0.45), 1.1, 0.3);
    c.drawPath(rrect(-6.5, sy * 6.2 - 0.6, 3.6, 1.2, 0.6), fill(alpha(tint, 0.9)));
    c.drawCircle(-7.4, sy * 6.2, 1.3, fill(alpha(SPACE.flame, 0.9)));
  }
  // Hex body, pointy end forward, pale outline.
  const body = ngon(0.5, 0, 6, 6, 0);
  part(c, body, SPACE.hull1, HULL_OUTLINE, LINE, 0.45);
  // Cargo core: the ore's own silhouette (ore.draw.ts); hollow while flying out empty.
  c.save();
  c.translate(-0.8, 0);
  if (o.ore) drawOreShape(c, o.ore, 2.9, { glow: 0, hollow: !loaded, line: 0.8 });
  else {
    c.drawPath(circle(0, 0, 2.3), fill(SPACE.hull0));
    c.drawPath(circle(0, 0, 2.3), stroke(SPACE.line, 0.9));
  }
  c.restore();
  // Sensor eye at the nose.
  lamp(c, 5, 0, 0.9, SPACE.white, 2.6);
}

/** Thruster flame behind both pods, `k` 0..1 length (flicker by drawing 2 or 3 lengths). */
export function drawThrusterFlame(c: SkCanvas, k = 1): void {
  for (const sy of [-1, 1]) {
    const y = sy * 6.2;
    // The left pod burns a little longer: two machines are never quite equal.
    const l = (4 + 5 * k) * (sy < 0 ? 1.1 : 1);
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
