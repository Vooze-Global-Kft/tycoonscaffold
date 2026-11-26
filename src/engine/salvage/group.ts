/**
 * Grouped runs (stage 2, 2.1; RULING2.md 10.4): from rung `group.fromRung`, crew work that STARTS with
 * no boss within sight is planned at its departure as a run with ONE dated end (crew.ts, truck.ts,
 * round.ts). This file holds what they share: the numbers, the sight test and the opening of runs when
 * the boss comes within sight (hand.ts bossStep). Owner: engine2 (rules-sim's files).
 *
 * The numbers live in content `group` (requests.md asks the content's owner for the schema entry); until
 * the schema carries them a content without `group` uses the first values below.
 */
import type { SalvageContent } from '../../config/schema.salvage';
import { bossFresh, type Ctx } from './clock';
import { atPlace } from './machines';

export interface GroupCfg {
  /** The first rung on which runs are grouped (below it every leg is its own event, as in stage 1). */
  fromRung: number;
  /** The longest planned run, seconds (the first trip always goes, however long). */
  maxRun_s: number;
  /** A merchant's round that leaves with no boss within sight of his stand is away at least this long. */
  roundAway_s: number;
}

/** First values (part-a 2.1.2): grouping from rung 3, runs of at most 300 s, the merchant away 120 s. */
export const GROUP_DEFAULT: GroupCfg = { fromRung: 3, maxRun_s: 300, roundAway_s: 120 };

const CACHE = new WeakMap<SalvageContent, GroupCfg>();

export function groupCfg(c: SalvageContent): GroupCfg {
  let g = CACHE.get(c);
  if (!g) {
    const raw = (c as unknown as { group?: Partial<GroupCfg> }).group ?? {};
    g = {
      fromRung: Number.isFinite(raw.fromRung) ? (raw.fromRung as number) : GROUP_DEFAULT.fromRung,
      maxRun_s: Number.isFinite(raw.maxRun_s) && (raw.maxRun_s as number) > 0 ? (raw.maxRun_s as number) : GROUP_DEFAULT.maxRun_s,
      roundAway_s: Number.isFinite(raw.roundAway_s) && (raw.roundAway_s as number) >= 0 ? (raw.roundAway_s as number) : GROUP_DEFAULT.roundAway_s,
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
