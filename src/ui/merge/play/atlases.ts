/**
 * The play canvas's four atlases (art kit `mergeAtlas`: baked once per app, never freed). A bake
 * costs up to a second of the JavaScript thread each, so they are queued as soon as this module
 * loads (behind the loading screen, one per timer turn, not in a render); a canvas that mounts
 * earlier draws without sprites and re-renders when the last one is ready. The stall fronts are
 * baked at the screen's density (art README: drawn near 1:1, no shimmer).
 */
import { useEffect, useState } from 'react';
import { PixelRatio } from 'react-native';
import { mergeAtlas, type AtlasKind, type MergeAtlas } from '../art/atlas';

export interface PlayAtlases {
  items: MergeAtlas;
  animals: MergeAtlas;
  stalls: MergeAtlas;
  fx: MergeAtlas;
}

const ORDER: AtlasKind[] = ['items', 'stalls', 'fx', 'animals'];
const density = (k: AtlasKind): number | undefined => (k === 'stalls' ? Math.max(1, Math.min(4.8, PixelRatio.get())) : undefined);

let ready: PlayAtlases | null = null;
let failed = false;
const waiters = new Set<() => void>();
let queued = false;

function bakeNext(i: number, got: Partial<PlayAtlases>): void {
  if (i >= ORDER.length) {
    if (got.items && got.animals && got.stalls && got.fx) ready = got as PlayAtlases;
    else failed = true;
    waiters.forEach((f) => f());
    waiters.clear();
    return;
  }
  const kind = ORDER[i];
  let a: MergeAtlas | null = null;
  try {
    a = mergeAtlas(kind, density(kind));
  } catch {
    a = null;
  }
  if (a) got[kind] = a;
  setTimeout(() => bakeNext(i + 1, got), 0);
}

export function queueAtlases(): void {
  if (queued) return;
  queued = true;
  setTimeout(() => bakeNext(0, {}), 0);
}
queueAtlases();

/** The atlases once all four are baked, else null (the canvas draws its pictures without sprites). */
export function usePlayAtlases(): PlayAtlases | null {
  const [a, setA] = useState<PlayAtlases | null>(ready);
  useEffect(() => {
    if (a || failed) return;
    const done = () => setA(ready);
    if (ready) {
      done();
      return;
    }
    waiters.add(done);
    queueAtlases();
    return () => {
      waiters.delete(done);
    };
  }, [a]);
  return a;
}

/** Sprite rectangles as plain numbers [x, y, w, h, ax, ay] (pixels) for the UI thread. */
export function spriteTable(a: MergeAtlas): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const [k, s] of Object.entries(a.sprites)) out[k] = [s.rect.x, s.rect.y, s.rect.width, s.rect.height, s.ax, s.ay];
  return out;
}
