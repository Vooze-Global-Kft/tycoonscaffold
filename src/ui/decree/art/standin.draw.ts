/**
 * A plain stand-in bust (a slate silhouette in an oval photo) for the contact sheets and the mock
 * when no face is given. Never a cast member: the cast package's drawBust (faces/) draws those. Its
 * proportions follow 1.2 (a long oval head 1.4 x taller than wide, head and shoulders).
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { DESK } from './palette';
import { builder, fill, oval } from './pen';

/** Fills a w x h photo box (from its top left) with a neutral silhouette of a head and shoulders. */
export function drawBustStandIn(c: SkCanvas, w: number, h: number, color: string = DESK.slateLight): void {
  c.drawRect({ x: 0, y: 0, width: w, height: h }, fill(DESK.slatePale));
  const hw = w * 0.22;
  c.drawPath(oval(w / 2, h * 0.38, hw, hw * 1.4), fill(color));
  c.drawPath(builder().moveTo(w * 0.08, h).quadTo(w * 0.12, h * 0.66, w / 2, h * 0.64).quadTo(w * 0.88, h * 0.66, w * 0.92, h).close().build(), fill(color));
}
