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
 *
 * THE WORKS' SHEETS (C-WORLD-1; PLAN2 2.8 and 6.1): sheets C and D are baked ONLY under stageOn() (the works' development
 * switch) and only once the save's rung is 2 or more, from the content's SOLD entries only (./worksTable.ts worksBakeList),
 * in 4 ms slices (atlas.ts bakeWorksSheets). A save already at rung 2 or more bakes them before the art is ready (behind
 * the loading curtain); a session that reaches rung 2 bakes them in the background and the art is replaced once
 * (`onYardArtChange`). The works' shadow kinds (actors.ts WORKS_SHADOW_CELLS) go into sheet S after the first yard's cells,
 * likewise only under stageOn(). With the switch off (every store build, the owner's phone today) the bake is exactly
 * the first yard's: A, B, G, the floor and S, sheets C and D null (`bakePlanOf`; worksHooks.test.ts).
 */
import { Skia, type SkCanvas, type SkImage } from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import { PixelRatio } from 'react-native';
import * as R from '../../../engine/salvage';
import { useGame } from '../../../state/store';
import { drawActorShadow } from '../art/vehicles.draw';
import { yardSwitches } from '../dev/switches';
import { stageOn } from '../../../modes/salvage/stage';
import { SHADOW_CELLS, WORKS_SHADOW_CELLS, type SheetLike } from './actors';
import { bakeImage, bakeManifest, bakeWorksSheets, propSig, WORKS_SLICE_MS, type ManifestAtlas, type SpriteSheet, type WorksAtlases } from './atlas';
import { worksBakeList } from './worksTable';
import { bakeGround, type GroundTile } from './ground';
import { yardLayout, type YardLayout } from './yard';

/** The screen's pixel density as the art is baked for it (1 to 3). */
export const DENSITY = Math.max(1, Math.min(3, Math.round(PixelRatio.get())));
/**
 * The manifest's sheets bake at most at density 2 (H6): on a 3x phone sheet A goes from 2048 x 1953 at 2.75
 * to 2046 x 1040 at 2, B from 2048 x 1961 at 2.5 to 2048 x 1286; measured with the phone reviewer's bake
 * harness under node (CPU ms, A + B): recording 768 -> 409, raster 1058 -> 674 (about 0.6 of the time,
 * the JavaScript half 0.53). The floor's tile keeps the screen's density.
 */
export const SHEET_DENSITY = Math.min(DENSITY, 2);
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
  /**
   * Sheets by index (actors.ts SHEETS): A, B, G (the manifest's), S (the world's shadows), then the works' C and D
   * (null unless baked: stageOn() and rung 2 or more); null where a bake failed.
   */
  sheets: [ManifestAtlas | null, ManifestAtlas | null, ManifestAtlas | null, ShadowSheet | null, ManifestAtlas | null, ManifestAtlas | null];
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
  // C-WORLD-1: the works' kinds (baked only under stageOn(); actors.ts WORKS_SHADOW_CELLS).
  truck3: [-150, -105, 340, 215],
  cranelorry: [-175, -120, 390, 250],
  visitor: [-20, -14, 48, 30],
};

type ShadowCell = { key: string; kind: (typeof SHADOW_CELLS)[number]['kind']; h: number; b: [number, number, number, number]; w: number; hh: number; k: number };

/**
 * Bakes the world's shadow sheet: one cell per kind and heading (`shadow.<kind>#0#<heading8>`). `works` (only under
 * stageOn()): the works' kinds, packed AFTER the first yard's cells (their places and the sheet's first rows unchanged).
 */
export function bakeShadows(density = SHADOW_DENSITY, works: typeof WORKS_SHADOW_CELLS = []): ShadowSheet | null {
  const cells: ShadowCell[] = [];
  for (const s of SHADOW_CELLS)
    for (const h of s.headings) {
      const b = SHADOW_BOX[s.kind];
      cells.push({ key: `shadow.${s.kind}#0#${h}`, kind: s.kind, h, b, w: Math.ceil(b[2] * density) + 4, hh: Math.ceil(b[3] * density) + 4, k: 1 });
    }
  const extra: ShadowCell[] = [];
  for (const s of works)
    for (const h of s.headings) {
      const b = SHADOW_BOX[s.kind];
      extra.push({ key: `shadow.${s.kind}#0#${h}`, kind: s.as, h, b, w: Math.ceil(b[2] * density) + 4, hh: Math.ceil(b[3] * density) + 4, k: s.k });
    }
  // Shelf packing, 1024 wide. C-WORLD-1: the works' cells (only under stageOn()) are shelf-packed in their own 1024-wide
  // column to the right (x 1024 on), so the first yard's cells keep their places and the sheet stays within 2048 x 2048
  // (packed below them it measured 1024 x 3402: over a phone's texture limit).
  const side = 1024;
  const placed: { c: (typeof cells)[number]; x: number; y: number }[] = [];
  const shelfPack = (list: ShadowCell[], x0: number): number => {
    let x = 0;
    let y = 0;
    let shelf = 0;
    for (const c of list) {
      if (x + c.w > side) {
        x = 0;
        y += shelf;
        shelf = 0;
      }
      placed.push({ c, x: x0 + x, y });
      x += c.w;
      shelf = Math.max(shelf, c.hh);
    }
    return y + shelf;
  };
  const h0 = shelfPack(cells.sort((a, b) => b.hh - a.hh), 0);
  const h1 = extra.length ? shelfPack(extra.sort((a, b) => b.hh - a.hh), side) : 0;
  const width = extra.length ? side * 2 : side;
  const height = Math.max(1, h0, h1);
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
      cv.scale(density * c.k, density * c.k);
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
let waitingCfg = false;
const waiters = new Set<() => void>();
/** C-WORLD-1: called each time the art is REPLACED after it was ready (the works' sheets baked in the background). */
const changers = new Set<() => void>();

/**
 * What a bake does (pure; worksHooks.test.ts): the first yard's sheets always; the works' shadow kinds when the switch is on;
 * sheets C and D 'now' (behind the curtain) when the switch is on and the save is at rung 2 or more, 'later' (in the
 * background once rung 2 is reached) when the switch is on below it, else 'never'.
 */
export function bakePlanOf(stage: boolean, rung: number): { sheets: readonly ('A' | 'B' | 'G' | 'S')[]; worksShadows: boolean; works: 'now' | 'later' | 'never' } {
  return { sheets: ['A', 'B', 'G', 'S'], worksShadows: stage, works: !stage ? 'never' : rung >= 2 ? 'now' : 'later' };
}

const rungNow = (): number => {
  const g = useGame.getState().game as R.SalvageGame | null | undefined;
  return g?.salvage?.ladder?.rung ?? 0;
};

/** The development line of a bake (the same words as before for the first yard; the works' part only when C or D baked). */
export function bakeLineOf(a: YardArt, m: { ms: number; A: ManifestAtlas | null; B: ManifestAtlas | null; G: ManifestAtlas | null }, floorMs: number, density: number, w: WorksAtlases | null): string {
  const sheet = (x: ManifestAtlas | null, n: string) => (x ? `${n} ${x.width}x${x.height}@${x.density}` : `${n} -`);
  const works = w ? `; works ${Math.round(w.ms)} ms in ${WORKS_SLICE_MS} ms slices: ${sheet(w.C, 'C')}, ${sheet(w.D, 'D')}, ${w.cells} cells` : '';
  return `[yard] art baked in ${a.bakeMs} ms (manifest ${Math.round(m.ms)} ms in slices beside the loading animation; ${sheet(m.A, 'A')}, ${sheet(m.B, 'B')}, ${sheet(m.G, 'G')}; floor and shadows ${floorMs} ms; density ${density}${works})`;
}

/** C-WORLD-1: bakes the works' sheets C and D (sold entries only) and returns them; only under stageOn(). */
function bakeWorks(cfg: R.SalvageConfig): Promise<WorksAtlases> {
  return bakeWorksSheets(SHEET_DENSITY, worksBakeList(cfg.salvage), WORKS_SLICE_MS);
}

/** Puts the works' sheets into the art (a new object, so every reader rebuilds once) and tells the listeners. */
function withWorks(w: WorksAtlases): void {
  if (!art) return;
  art = { ...art, sheets: [art.sheets[0], art.sheets[1], art.sheets[2], art.sheets[3], w.C, w.D] };
  if (__DEV__) console.info(`[yard] works sheets baked in ${Math.round(w.ms)} ms in ${WORKS_SLICE_MS} ms slices (C ${w.C ? `${w.C.width}x${w.C.height}` : '-'}, D ${w.D ? `${w.D.width}x${w.D.height}` : '-'}, ${w.cells} cells)`);
  changers.forEach((f) => f());
}

/** Under stageOn() below rung 2: waits for rung 2, then bakes C and D in the background (once). */
function bakeWorksAtRung2(cfg: R.SalvageConfig): void {
  const go = () => void bakeWorks(cfg).then(withWorks).catch((e) => console.warn('salvage: the works art could not be baked', e));
  if (rungNow() >= 2) return go();
  const off = useGame.subscribe((st) => {
    const g = st.game as R.SalvageGame | null | undefined;
    if ((g?.salvage?.ladder?.rung ?? 0) < 2) return;
    off();
    go();
  });
}

/**
 * Starts the yard's bake (idempotent; see the header). Call it from the loading animation once its first
 * frame is drawn. Safe before the config is installed: it waits for the next call or the timer.
 */
export function startYardBake(): void {
  if (started || art) return;
  const cfg = useGame.getState().cfg;
  if (!cfg || !R.isSalvage(cfg)) {
    // Asked before the config is installed (the loading stage's third frame can come first): start as soon as it is.
    if (!waitingCfg) {
      waitingCfg = true;
      const off = useGame.subscribe((st) => {
        if (!st.cfg || !R.isSalvage(st.cfg)) return;
        off();
        waitingCfg = false;
        startYardBake();
      });
    }
    return;
  }
  started = true;
  const t0 = Date.now();
  if (__DEV__) console.info(`[yard] bake started ${typeof performance !== 'undefined' ? Math.round(performance.now()) : 0} ms after the page began`);
  const y = yardFor(cfg);
  // C-WORLD-1: what this bake does (the switch off: exactly the first yard's, as before).
  const plan = bakePlanOf(stageOn(), rungNow());
  bakeManifest(SHEET_DENSITY)
    .then(async (m) => {
      let ground: GroundTile | null = null;
      let shadows: ShadowSheet | null = null;
      try {
        ground = bakeGround(y, DENSITY);
        shadows = plan.worksShadows ? bakeShadows(SHADOW_DENSITY, WORKS_SHADOW_CELLS) : bakeShadows();
      } catch (e) {
        console.warn('salvage: the yard floor or shadows could not be baked', e);
      }
      const floorMs = Date.now() - t0 - Math.round(m.ms);
      let works: WorksAtlases | null = null;
      if (plan.works === 'now') {
        try {
          works = await bakeWorks(cfg);
        } catch (e) {
          console.warn('salvage: the works art could not be baked', e);
        }
      }
      art = { sheets: [m.A, m.B, m.G, shadows, works?.C ?? null, works?.D ?? null], ground, sheet: null, bakeMs: Date.now() - t0 };
      // The debug line the loading engineer and the lead asked for: how long the gate is held by the bake, and why.
      if (__DEV__) console.info(bakeLineOf(art, m, floorMs, DENSITY, works));
      waiters.forEach((f) => f());
      waiters.clear();
      if (plan.works === 'later') bakeWorksAtRung2(cfg);
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

/** C-WORLD-1: calls `f` each time the ready art is replaced (the works' sheets baked later). Returns an unsubscribe. */
export function onYardArtChange(f: () => void): () => void {
  changers.add(f);
  return () => changers.delete(f);
}

/** The baked art of the yard; null until it is ready (and the new art when the works' sheets land, under stageOn()). */
export function useYardArt(_y: YardLayout): YardArt | null {
  const [a, setA] = useState<YardArt | null>(art);
  useEffect(() => {
    if (a) return;
    return onYardArt(() => setA(art));
  }, [a]);
  useEffect(() => (stageOn() ? onYardArtChange(() => setA(art)) : undefined), []);
  return a;
}
