/**
 * The hint pointer's drawing (section 3): a cyan targeting reticle (ring, four ticks, centre dot)
 * and its pulse ring. Pure Skia; Reticle.tsx animates it.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { SPACE, alpha } from './palette';
import { circle, fill, glow, line, litStroke, stroke } from './pen';

/** Outer radius of the reticle (ticks included), points. */
export const RETICLE_R = 19;

/** The reticle centred on the origin. */
export function drawReticle(c: SkCanvas, color: string = SPACE.line): void {
  glow(c, 0, 0, 26, color, 0.25);
  c.drawPath(circle(0, 0, 12), fill(alpha(color, 0.07)));
  litStroke(c, circle(0, 0, 12), color, 2, 1);
  for (let i = 0; i < 4; i++) {
    const a = (Math.PI / 2) * i;
    const tick = line(Math.cos(a) * 9, Math.sin(a) * 9, Math.cos(a) * 18, Math.sin(a) * 18);
    c.drawPath(tick, stroke(alpha(color, 0.25), 5));
    c.drawPath(tick, stroke(color, 2));
  }
  c.drawCircle(0, 0, 2.2, fill('#FFFFFF'));
}
