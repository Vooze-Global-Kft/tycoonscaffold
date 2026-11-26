/**
 * Runs (stage 2, 2.1; RULING2.md 10.4 and 14.1): from rung `group.fromRung` a crew member's work is a RUN
 * (a kind of trip, a place, a destination and a start t0, kept on the member as `course`): at every later
 * departure he takes the next trip of the same kind while it ends by t0 + the limit, whoever is looking.
 * Out of the boss's sight the rest of the run is PLANNED AHEAD at its departure with one dated end
 * (crew.ts, truck.ts, machines.ts); in his sight it is made trip by trip. This file holds what they share:
 * the numbers (content `group`), the sight test and the bounds. Owner: engine2 (rules-sim's files).
 */
import type { SalvageContent } from '../../config/schema.salvage';
import { bossFresh, type Ctx } from './clock';

export interface GroupCfg {
  /** The first rung on which crew work in runs (below it every trip is chosen alone, as in stage 1). */
  fromRung: number;
  /** A yard hand's longest run, seconds from its start t0 (its first trip always goes, however long). */
  handRun_s: number;
  /** A cutter's longest run, seconds from its start t0 (his first thing always goes). */
  cutRun_s: number;
  /** Plan the rest of a run ahead at a departure out of the boss's sight (false: every run trip by trip). */
  ahead: boolean;
}

/**
 * A content with no `group` block has no runs (the first yard's rules). The numbers live in content
 * (src/config/salvage.content.ts `group`); a field missing from a hand-made `group` (tests) means: no
 * runs (fromRung), single trips (the limits), plan ahead (ahead).
 */
const OFF: GroupCfg = { fromRung: Infinity, handRun_s: 0, cutRun_s: 0, ahead: true };

const CACHE = new WeakMap<SalvageContent, GroupCfg>();

const num = (v: unknown, d: number, min = 0): number => (typeof v === 'number' && Number.isFinite(v) && v >= min ? v : d);

export function groupCfg(c: SalvageContent): GroupCfg {
  let g = CACHE.get(c);
  if (!g) {
    const raw = ((c as unknown as { group?: Record<string, unknown> }).group ?? null) as Record<string, unknown> | null;
    g = raw
      ? { fromRung: num(raw.fromRung, OFF.fromRung, -Infinity), handRun_s: num(raw.handRun_s, OFF.handRun_s), cutRun_s: num(raw.cutRun_s, OFF.cutRun_s), ahead: typeof raw.ahead === 'boolean' ? raw.ahead : OFF.ahead }
      : OFF;
    CACHE.set(c, g);
  }
  return g;
}

/** Do crew work in runs on this yard's rung? */
export function grouping(x: Ctx): boolean {
  return x.s.ladder.rung >= groupCfg(x.c).fromRung;
}

/** Is the rest of a run planned ahead when it departs out of sight (runs on this rung, and `group.ahead`)? */
export function planAhead(x: Ctx): boolean {
  return grouping(x) && groupCfg(x.c).ahead;
}

/** Is a fresh boss within reach.sight of any of these points or places' footprints at yard second t? */
export function bossSees(x: Ctx, t: number, pts: readonly { x: number; y: number }[], places: readonly string[] = []): boolean {
  if (!bossFresh(x, t)) return false;
  const p = x.s.presence;
  const r = x.c.reach.sight;
  for (const q of pts) if (Math.hypot(q.x - p.x, q.y - p.y) <= r) return true;
  for (const pl of places) if (nearPlace(x, pl, p.x, p.y, r)) return true;
  return false;
}

/** machines.ts atPlace (within `reach` of a place's footprint), here to keep the imports one way. */
function nearPlace(x: Ctx, place: string, px: number, py: number, reach: number): boolean {
  const pt = x.c.map.points[place];
  if (!pt) return false;
  const pl = x.c.map.places[place];
  const dx = Math.max(0, Math.abs(px - pt[0]) - (pl?.w ?? 0) / 2);
  const dy = Math.max(0, Math.abs(py - pt[1]) - (pl?.d ?? 0) / 2);
  return Math.hypot(dx, dy) <= reach;
}

/** Slack for comparing planned instants. */
export const RUN_EPS = 1e-9;

/** The most loads, things or phases a run may hold (the save's bound; a 300 s run holds far fewer). */
export const RUN_MAX = 64;
