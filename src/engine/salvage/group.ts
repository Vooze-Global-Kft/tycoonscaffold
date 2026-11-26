/**
 * Grouped runs (stage 2, 2.1; RULING2.md 10.4): from rung `group.fromRung`, crew work that STARTS with
 * no boss within sight is planned at its departure as a run with ONE dated end (crew.ts, truck.ts,
 * round.ts). This file holds what they share: the numbers, the sight test and the opening of runs when
 * the boss comes within sight (hand.ts bossStep). Owner: engine2 (rules-sim's files).
 *
 * The numbers live in content `group` (requests.md asks the content's owner for the schema entry); until
 * the schema carries them a content without `group` uses the first values below (tests set `group` on
 * the parsed content to switch grouping on at any rung, or off with a fromRung beyond the ladder).
 */
import type { SalvageContent } from '../../config/schema.salvage';
import { bossFresh, type Ctx } from './clock';
import { atPlace } from './machines';

export interface GroupCfg {
  /** The first rung on which runs are grouped (below it every leg is its own event, as in stage 1). */
  fromRung: number;
  /** A yard hand's longest planned run, seconds (his first trip always goes, however long). */
  handRun_s: number;
  /** A cutter's longest planned run, seconds (his first thing always goes). */
  cutRun_s: number;
  /** A merchant's round that leaves with no boss within sight of his stand is away at least this long. */
  roundAway_s: number;
}

/**
 * First values (engine2-group, measured: notes/engine2-group.md section 4). The draft's one `maxRun_s`
 * of 300 s cost a tenth of six hours' sales on five played minute-60 yards (the floor's room binds; a
 * hand's long run holds his pieces and his trips' order); a yard hand's run of 30 s and a cutter's of
 * 120 s kept the five yards' sales within 1 % on average. A content `maxRun_s` (the draft's key) caps both.
 */
export const GROUP_DEFAULT: GroupCfg = { fromRung: 3, handRun_s: 30, cutRun_s: 120, roundAway_s: 120 };

const CACHE = new WeakMap<SalvageContent, GroupCfg>();

const num = (v: unknown, d: number, min = 0): number => (typeof v === 'number' && Number.isFinite(v) && v >= min ? v : d);

export function groupCfg(c: SalvageContent): GroupCfg {
  let g = CACHE.get(c);
  if (!g) {
    const raw = ((c as unknown as { group?: Record<string, unknown> }).group ?? {}) as Record<string, unknown>;
    const cap = num(raw.maxRun_s, Infinity);
    g = {
      fromRung: num(raw.fromRung, GROUP_DEFAULT.fromRung, -Infinity),
      handRun_s: Math.min(cap, num(raw.handRun_s, GROUP_DEFAULT.handRun_s)),
      cutRun_s: Math.min(cap, num(raw.cutRun_s, GROUP_DEFAULT.cutRun_s)),
      roundAway_s: num(raw.roundAway_s, GROUP_DEFAULT.roundAway_s),
    };
    CACHE.set(c, g);
  }
  return g;
}

/** Are runs grouped on this yard's rung? */
export function grouping(x: Ctx): boolean {
  return x.s.ladder.rung >= groupCfg(x.c).fromRung;
}

/** Is a fresh boss within reach.sight of any of these points or places' footprints at yard second t? */
export function bossSees(x: Ctx, t: number, pts: readonly { x: number; y: number }[], places: readonly string[] = []): boolean {
  if (!bossFresh(x, t)) return false;
  const p = x.s.presence;
  const r = x.c.reach.sight;
  for (const q of pts) if (Math.hypot(q.x - p.x, q.y - p.y) <= r) return true;
  for (const pl of places) if (atPlace(x, pl, p.x, p.y, r)) return true;
  return false;
}

/** Slack for comparing planned instants. */
export const RUN_EPS = 1e-9;

/** The most loads, things or phases a run may hold (the save's bound; a 300 s run holds far fewer). */
export const RUN_MAX = 64;
