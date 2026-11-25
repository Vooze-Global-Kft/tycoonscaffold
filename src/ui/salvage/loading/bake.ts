/**
 * The loading animation's images, baked AFTER its first frame (review H5): the stage draws its first
 * frames from the recorded pictures (./layers.ts, about 15 ms to record), and from its third frame on
 * the parts are baked into images here, one part per JavaScript task (a setTimeout chain, as the
 * yard's atlas bakes), so no single task holds the thread long. When the queue is empty the stage swaps
 * the images in at once (one re-creation of its worklets).
 *
 * Images are kept by what the part looks like (`Part.key`) and the density, not by the screen's insets:
 * turning the phone to the other landscape reuses every part that did not move, and draws the rest from
 * pictures while they bake again. When the curtain has parted for the session the images are let go
 * (`releaseLoadingImages`; never disposed: a canvas still mounted may draw one last frame with them).
 */
import { bakePart, partsOf, withImages, type Baked, type LoadingLayers, type Part } from './layers';

const images = new Map<string, Baked>();
const queue: Part[] = [];
const waiting = new Set<() => void>();
let running = false;
let density = 0;

const keyOf = (p: Part) => `${p.key}@${Math.min(density, p.dmax)}`;

function step(): void {
  const p = queue.shift();
  if (p) {
    const k = keyOf(p);
    if (!images.has(k)) {
      try {
        const b = bakePart(p, density);
        if (b) images.set(k, b);
      } catch (e) {
        // a part that cannot be baked stays a picture: slower to draw, the same to look at
        if (__DEV__) console.warn('salvage loading: a part could not be baked', e);
      }
    }
    setTimeout(step, 0);
    return;
  }
  running = false;
  const done = [...waiting];
  waiting.clear();
  done.forEach((f) => f());
}

/**
 * Bakes every part of `Y` not baked yet at `d` pixels a point, in slices; calls `done` once all are.
 * Returns a cancel (the caller unmounted).
 */
export function bakeLoading(Y: LoadingLayers, d: number, done: () => void): () => void {
  density = d;
  for (const p of partsOf(Y)) {
    const k = keyOf(p);
    if (!images.has(k) && !queue.some((q) => keyOf(q) === k)) queue.push(p);
  }
  waiting.add(done);
  if (!running) {
    running = true;
    setTimeout(step, 0);
  }
  return () => waiting.delete(done);
}

/** The set with every image baked so far (parts without one stay pictures). */
export function withBaked(Y: LoadingLayers): LoadingLayers {
  if (!images.size) return Y;
  return withImages(Y, (p) => images.get(keyOf(p)));
}

/** The curtain has parted for the session: let the images go. */
export function releaseLoadingImages(): void {
  images.clear();
  queue.length = 0;
}
