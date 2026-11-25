/**
 * The first minutes' timings (scripts/content/yard/goals.json `teach`, merged into game.json
 * `salvage.teach` by the content build). Numbers live in content (BUILD.md rule 3): this file only
 * names them. STAND-IN until the schema carries `teach` (requests.md, [hints] to contract): the
 * fallback below is a copy of goals.json's block, and ./hints.test.ts fails the moment the two differ,
 * so it cannot drift; once `cfg.salvage.teach` exists it wins key by key.
 */
import type { SalvageConfig } from '../../../engine/salvage';

export interface Teach {
  stallS: number;
  nudgeS: number;
  chevronShowS: number;
  chevronIdleS: number;
  approachM: number;
  approachS: number;
  nearM: number;
  ghostDelayS: number;
  ghostLoopS: number;
  ghostPauseS: number;
  openPulseS: number;
  lessonQuietS: number;
  jumpRatio: number;
  autoplayReactS: number;
  autoplayStandS: number;
}

/** A copy of goals.json `teach` (checked equal by the test). */
export const TEACH_FALLBACK: Teach = {
  stallS: 20,
  nudgeS: 6,
  chevronShowS: 5,
  chevronIdleS: 4,
  approachM: 0.6,
  approachS: 1.5,
  nearM: 2.5,
  ghostDelayS: 0.4,
  ghostLoopS: 1.6,
  ghostPauseS: 1.0,
  openPulseS: 6,
  lessonQuietS: 300,
  jumpRatio: 5,
  autoplayReactS: 0.8,
  autoplayStandS: 6,
};

const cache = new WeakMap<object, Teach>();

/** The timings of this game's content (the fallback for keys the content does not carry yet). */
export function teachOf(cfg: SalvageConfig): Teach {
  const c = cfg.salvage as unknown as { teach?: Partial<Record<keyof Teach, number>> };
  const hit = cache.get(cfg.salvage);
  if (hit) return hit;
  const t: Teach = { ...TEACH_FALLBACK };
  for (const k of Object.keys(TEACH_FALLBACK) as (keyof Teach)[]) {
    const v = c.teach?.[k];
    if (typeof v === 'number' && Number.isFinite(v)) t[k] = v;
  }
  cache.set(cfg.salvage, t);
  return t;
}
