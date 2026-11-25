/**
 * Screen points the hud gives other packages (window points, safe-area insets included), as Reanimated
 * shared values so a worklet can read them (world-b's coin arc runs on the UI thread):
 * - `cashAnchor`: the centre of the § coin in the top bar, where the coin's arc ends;
 * - `collectionAnchor`: the cab's point while a collection ticket shows (where the coin starts), else
 *   x = -1;
 * - `weighInAnchor`: the scale display's point while a weigh-in ticket shows (where it folds and the muted
 *   "today's value" starts its slide to the bay chip), else x = -1.
 * Set by the hud's top bar on layout and rotation and by the ticket layer; never per frame.
 * `hudAnchors.cash()` reads the same on the JavaScript thread.
 */
import { makeMutable } from 'react-native-reanimated';

export interface Point {
  x: number;
  y: number;
}

export const cashAnchor = makeMutable<Point>({ x: 0, y: 0 });
export const collectionAnchor = makeMutable<Point>({ x: -1, y: -1 });
export const weighInAnchor = makeMutable<Point>({ x: -1, y: -1 });

export const hudAnchors = {
  cash: (): Point => cashAnchor.value,
  collection: (): Point | null => (collectionAnchor.value.x < 0 ? null : collectionAnchor.value),
  setCash(p: Point): void {
    const c = cashAnchor.value;
    if (c.x !== p.x || c.y !== p.y) cashAnchor.value = p;
  },
  setCollection(p: Point | null): void {
    collectionAnchor.value = p ?? { x: -1, y: -1 };
  },
  weighIn: (): Point | null => (weighInAnchor.value.x < 0 ? null : weighInAnchor.value),
  setWeighIn(p: Point | null): void {
    weighInAnchor.value = p ?? { x: -1, y: -1 };
  },
};
