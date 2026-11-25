/**
 * The yard of the active game and its baked art, made once and kept (the layout per config, the
 * atlas and the ground per layout and pixel density). The bake is queued as soon as this module loads
 * (behind the loading screen, as Orbit Haulers' atlas is), so the yard normally has its sprites on its
 * first frame; a yard that mounts first draws the ground colour and adds them when the bake ends.
 */
import { useEffect, useState } from 'react';
import { PixelRatio } from 'react-native';
import * as R from '../../../engine/salvage';
import { useGame } from '../../../state/store';
import { yardSwitches } from '../dev/switches';
import { bakeSheet, propSig, type SpriteSheet } from './atlas';
import { bakeGround, type GroundTile } from './ground';
import { yardLayout, type YardLayout } from './yard';

/** The screen's pixel density as the art is baked for it (1 to 3). */
export const DENSITY = Math.max(1, Math.min(3, Math.round(PixelRatio.get())));

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

export interface YardArt {
  sheet: SpriteSheet | null;
  ground: GroundTile | null;
  /** Milliseconds the bake took (the development panel shows it). */
  bakeMs: number;
}

const arts = new WeakMap<YardLayout, YardArt>();
const waiters = new Set<() => void>();

function bake(y: YardLayout): YardArt {
  let art = arts.get(y);
  if (!art) {
    const t0 = Date.now();
    let sheet: SpriteSheet | null = null;
    let ground: GroundTile | null = null;
    try {
      sheet = bakeSheet(y, DENSITY);
      ground = bakeGround(y, DENSITY);
    } catch (e) {
      console.warn('salvage: the yard art could not be baked', e);
    }
    art = { sheet, ground, bakeMs: Date.now() - t0 };
    arts.set(y, art);
  }
  return art;
}

/** The sprite signature of prop i of a yard (the atlas's names). */
export const sigOf = (y: YardLayout) => (i: number) => propSig(y.props[i]);

// Queued at load: the config is installed by then (App.tsx installs the mode before anything renders).
setTimeout(() => {
  const cfg = useGame.getState().cfg;
  if (!R.isSalvage(cfg)) return;
  bake(yardFor(cfg));
  waiters.forEach((f) => f());
  waiters.clear();
}, 0);

/** The baked art of a yard; null until it is ready. */
export function useYardArt(y: YardLayout): YardArt | null {
  const [art, setArt] = useState<YardArt | null>(() => arts.get(y) ?? null);
  useEffect(() => {
    if (art) return;
    const done = () => setArt(bake(y));
    if (arts.has(y)) {
      done();
      return;
    }
    // Not queued for this layout (a remote override changed the config): bake it on the next turn.
    const t = setTimeout(done, 0);
    waiters.add(done);
    return () => {
      clearTimeout(t);
      waiters.delete(done);
    };
  }, [art, y]);
  return art;
}
