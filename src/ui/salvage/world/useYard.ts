/**
 * The yard of the active game and its baked art, made once and kept.
 *
 * THE BAKE (notes/lead-world.md 3): `startYardBake()` bakes, in slices behind the loading animation, the
 * art manifest's sheets A, B and G (the art director's world/atlas.ts `bakeManifest`), the yard floor's
 * tile (./ground.ts) and the world's own small sheet S of actor shadows (the people artist's
 * `drawActorShadow`, one cell per kind and heading: shadows are the world's, never baked into a sprite, so
 * a mirrored sprite never throws its shadow west). It is idempotent; the loading animation calls it two
 * frames after its canvas first draws, and a timer calls it after 1500 ms if nobody has. `atlasProgress()`
 * (atlas.ts) feeds the loading animation's calm loop; `yardArtReady()` says when the yard can draw.
 */
import { Skia, type SkCanvas, type SkImage } from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import { PixelRatio } from 'react-native';
import * as R from '../../../engine/salvage';
import { useGame } from '../../../state/store';
import { drawActorShadow } from '../art/vehicles.draw';
import { yardSwitches } from '../dev/switches';
import { SHADOW_CELLS, type SheetLike } from './actors';
import { bakeImage, bakeManifest, propSig, type ManifestAtlas, type SpriteSheet } from './atlas';
import { bakeGround, type GroundTile } from './ground';
import { yardLayout, type YardLayout } from './yard';

/** The screen's pixel density as the art is baked for it (1 to 3). */
export const DENSITY = Math.max(1, Math.min(3, Math.round(PixelRatio.get())));
/** Shadows are flat soft shapes: baked at most at this density and drawn up. */
const SHADOW_DENSITY = 1;

const layouts = new WeakMap<object, YardLayout>();
/** The yard of a salvage config (with the web preview's `sprites=` and `actors=` switches). */
export function yardFor(cfg: R.SalvageConfig): YardLayout {
  let y = layouts.get(cfg.salvage);
  if (!y) {
    y = yardLayout(cfg.salvage, { extraCrates: yardSwitches.sprites, helpers: yardSwitches.actors ?? undefined });
    layouts.set(cfg.salvage, y);
  }
  return y;
}

export interface ShadowSheet extends SheetLike {
  image: SkImage;
  width: number;
  height: number;
}

export interface YardArt {
  /** Sheets by index: A, B, G (the manifest's) and S (the world's shadows); null where a bake failed. */
  sheets: [ManifestAtlas | null, ManifestAtlas | null, ManifestAtlas | null, ShadowSheet | null];
  ground: GroundTile | null;
  /** The ground work's single sheet: gone (the yard draws the manifest's sheets). Kept null so old callers compile. */
  sheet: SpriteSheet | null;
  /** Milliseconds the bake took (the development panel shows it). */
  bakeMs: number;
}

/** Bounds (points round the anchor at 40 a metre) a kind's shadow stays inside, at any heading. */
const SHADOW_BOX: Record<string, [number, number, number, number]> = {
  person: [-20, -14, 48, 30],
  truck: [-115, -80, 260, 165],
  flatbed: [-115, -80, 260, 165],
  van: [-90, -62, 205, 128],
  trailer: [-150, -110, 300, 220],
  skip: [-62, -40, 150, 85],
  sack: [-50, -40, 100, 80],
  trolley: [-60, -45, 120, 90],
};

/** Bakes the world's shadow sheet: one cell per kind and heading (`shadow.<kind>#0#<heading8>`). */
export function bakeShadows(density = SHADOW_DENSITY): ShadowSheet | null {
  const cells: { key: string; kind: (typeof SHADOW_CELLS)[number]['kind']; h: number; b: [number, number, number, number]; w: number; hh: number }[] = [];
  for (const s of SHADOW_CELLS)
    for (const h of s.headings) {
      const b = SHADOW_BOX[s.kind];
      cells.push({ key: `shadow.${s.kind}#0#${h}`, kind: s.kind, h, b, w: Math.ceil(b[2] * density) + 4, hh: Math.ceil(b[3] * density) + 4 });
    }
  // Shelf packing, 1024 wide.
  const side = 1024;
  let x = 0;
  let y = 0;
  let shelf = 0;
  const placed: { c: (typeof cells)[number]; x: number; y: number }[] = [];
  for (const c of cells.sort((a, b) => b.hh - a.hh)) {
    if (x + c.w > side) {
      x = 0;
      y += shelf;
      shelf = 0;
    }
    placed.push({ c, x, y });
    x += c.w;
    shelf = Math.max(shelf, c.hh);
  }
  const width = side;
  const height = Math.max(1, y + shelf);
  const v = { ppm: 40, tilt: 0.7, lift: Math.sqrt(1 - 0.49) };
  const index: Record<string, number> = {};
  const rects: number[] = [];
  const image = bakeImage(width, height, (cv: SkCanvas) => {
    cv.clear(Skia.Color('#00000000'));
    placed.forEach(({ c, x: px, y: py }, i) => {
      const ax = 2 - c.b[0] * density;
      const ay = 2 - c.b[1] * density;
      cv.save();
      cv.translate(px + ax, py + ay);
      cv.scale(density, density);
      try {
        drawActorShadow(cv, v, c.kind, c.h);
      } catch (e) {
        console.warn('salvage: a shadow could not be drawn', c.key, e);
      }
      cv.restore();
      index[c.key] = i;
      rects.push(px, py, c.w, c.hh, ax, ay);
    });
  });
  if (!image) return null;
  return { image, density, width, height, index, rects };
}

let art: YardArt | null = null;
let started = false;
const waiters = new Set<() => void>();

/**
 * Starts the yard's bake (idempotent; see the header). Call it from the loading animation once its first
 * frame is drawn. Safe before the config is installed: it waits for the next call or the timer.
 */
export function startYardBake(): void {
  if (started || art) return;
  const cfg = useGame.getState().cfg;
  if (!R.isSalvage(cfg)) return;
  started = true;
  const t0 = Date.now();
  if (__DEV__) console.info(`[yard] bake started ${typeof performance !== 'undefined' ? Math.round(performance.now()) : 0} ms after the page began`);
  const y = yardFor(cfg);
  bakeManifest(DENSITY)
    .then((m) => {
      let ground: GroundTile | null = null;
      let shadows: ShadowSheet | null = null;
      try {
        ground = bakeGround(y, DENSITY);
        shadows = bakeShadows();
      } catch (e) {
        console.warn('salvage: the yard floor or shadows could not be baked', e);
      }
      art = { sheets: [m.A, m.B, m.G, shadows], ground, sheet: null, bakeMs: Date.now() - t0 };
      // The debug line the loading engineer and the lead asked for: how long the gate is held by the bake, and why.
      if (__DEV__) {
        const sheet = (a: ManifestAtlas | null, n: string) => (a ? `${n} ${a.width}x${a.height}@${a.density}` : `${n} -`);
        console.info(`[yard] art baked in ${art.bakeMs} ms (manifest ${Math.round(m.ms)} ms in slices beside the loading animation; ${sheet(m.A, 'A')}, ${sheet(m.B, 'B')}, ${sheet(m.G, 'G')}; floor and shadows ${Date.now() - t0 - Math.round(m.ms)} ms; density ${DENSITY})`);
      }
      waiters.forEach((f) => f());
      waiters.clear();
    })
    .catch((e) => console.warn('salvage: the yard art could not be baked', e));
}

/** True once the yard's art is baked (the loading animation may part its gate). */
export const yardArtReady = (): boolean => art !== null;
/** The baked art now (null while baking): for code outside React (./useRulesTable.ts). */
export const yardArtNow = (): YardArt | null => art;
/** Calls `f` once when the art is ready (at once if it is). Returns an unsubscribe. */
export function onYardArt(f: () => void): () => void {
  if (art) {
    f();
    return () => {};
  }
  waiters.add(f);
  return () => waiters.delete(f);
}

/** The sprite signature of prop i of a yard (the ground work's atlas names; kept for old callers). */
export const sigOf = (y: YardLayout) => (i: number) => propSig(y.props[i]);

// The fallback: if the loading animation has not started the bake by then.
setTimeout(startYardBake, 1500);

/** The baked art of the yard; null until it is ready. */
export function useYardArt(_y: YardLayout): YardArt | null {
  const [a, setA] = useState<YardArt | null>(art);
  useEffect(() => {
    if (a) return;
    return onYardArt(() => setA(art));
  }, [a]);
  return a;
}
