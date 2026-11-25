/**
 * THE FIRST MINUTES' TEACHING, as pure rules (yard-stage1.md 1.2, 2.10, 4.2, 4.4 item 5): no React, no
 * timers; time comes in as seconds. The screen (./HintLayer.tsx) feeds them and draws what they say.
 *
 * - WHERE the chevron points (`hintTarget`): the goal's target, or first its `via` (the truck before a
 *   fetch goal) while the boss is not driving.
 * - WHEN it shows (`chevronShows`): on a new goal for a moment; after the boss has stood away from the
 *   target for a while; while he walks but not towards it. It RESTS while he is on the way or there, so it
 *   never nags a player who is already going.
 * - The STALL (`HintTracker`): no progress on a goal for `teach.stallS` (progress = a rules event, or the
 *   boss coming nearer the target) plays the goal's ONE gentle escalation for `teach.nudgeS`, once per
 *   goal: never a block, never a forced tap.
 * - The GHOST THUMB of the first second: where the stick will appear, dragging towards the first goal's
 *   target; it goes the moment the player's thumb lands.
 * - The FIRST "Open" at each place rings the one button once.
 * - The one-prompt-a-minute rule seen from the screen (`promptWait`): a purchase goal the rules hold back
 *   waits visibly (its line dimmed with the time left), never silently.
 */
import * as R from '../../../engine/salvage';
import type { Teach } from './teach';

export type StallKind = 'ghost' | 'stand' | 'open' | 'chevron' | 'goal';
export const STALL_KINDS: readonly StallKind[] = ['ghost', 'stand', 'open', 'chevron', 'goal'];

/**
 * STAND-IN (requests.md, [hints] to contract): the schema does not carry `via` and `stall` yet, so zod
 * strips them from game.json; until it does, this copy of goals.json's two fields by goal id stands in
 * (./hints.test.ts fails when it differs from goals.json).
 */
export const GOAL_HINTS_FALLBACK: Record<string, { via: string | null; stall: StallKind | null }> = {
  takeWasher: { via: null, stall: 'stand' },
  weighIt: { via: null, stall: 'ghost' },
  stripCable: { via: null, stall: 'stand' },
  weighCopper: { via: null, stall: 'ghost' },
  buySack: { via: null, stall: 'open' },
  takeAWasher: { via: null, stall: 'stand' },
  hireHand: { via: null, stall: 'open' },
  workDropoff: { via: null, stall: 'chevron' },
  fetchTrial: { via: 'truck', stall: null },
  fetchDemolition: { via: 'truck', stall: null },
};

type GoalDefLike = { id: string; target: string | null; buy?: string | null; via?: string | null; stall?: string | null };

/** The goal's `via` and `stall` (the content's when the schema carries them, else the stand-in). */
export function goalHint(def: GoalDefLike | null | undefined): { via: string | null; stall: StallKind | null } {
  if (!def) return { via: null, stall: null };
  const fb = GOAL_HINTS_FALLBACK[def.id];
  const via = def.via !== undefined ? def.via : (fb?.via ?? null);
  const raw = def.stall !== undefined ? def.stall : (fb?.stall ?? null);
  const stall = raw && (STALL_KINDS as readonly string[]).includes(raw) ? (raw as StallKind) : null;
  return { via, stall };
}

/** The content's goal definition the card shows now (by the rules' Goal.id), or null. */
export function goalDefOf(cfg: R.SalvageConfig, goal: R.Goal | null): GoalDefLike | null {
  if (!goal) return null;
  const list = cfg.salvage.goals as unknown as GoalDefLike[];
  const extra = ((cfg.salvage as unknown as { dayOne?: GoalDefLike[] }).dayOne ?? []) as GoalDefLike[];
  return list.find((d) => d.id === goal.id) ?? extra.find((d) => d.id === goal.id) ?? { id: goal.id, target: goal.target, buy: goal.buy };
}

export interface Spot {
  x: number;
  y: number;
  id: string;
}

/** Where a target id stands, metres: 'truck', 'advice', a thing's uid, a map point; else null. */
export function spotOf(cfg: R.SalvageConfig, g: R.SalvageGame, f: R.FrameTable, id: string | null, now: number): Spot | null {
  if (!id) return null;
  if (id === 'truck') return f.truck.owned ? { x: f.truck.x, y: f.truck.y, id } : null;
  if (id === 'advice') {
    const a = R.advice(cfg, g, now);
    const ref = a?.open as { kind: string; place?: string } | undefined;
    return ref?.kind === 'place' && ref.place ? spotOf(cfg, g, f, ref.place, now) : null;
  }
  const thing = f.things.find((t) => t.uid === id);
  if (thing) return { x: thing.x, y: thing.y, id };
  if (cfg.salvage.map.points[id]) {
    const p = R.point(cfg, id);
    return { x: p.x, y: p.y, id };
  }
  return null;
}

/**
 * The chevron's target now: the goal's `via` first while the boss is not driving (and the via exists),
 * then the goal's target. Null when the goal has none (world-b then falls back to its own rule).
 */
export function hintTarget(cfg: R.SalvageConfig, g: R.SalvageGame, f: R.FrameTable, now: number): Spot | null {
  const goal = R.nextGoal(cfg, g);
  const def = goalDefOf(cfg, goal);
  if (!def) return null;
  const { via } = goalHint(def);
  if (via && !g.salvage.presence?.driving) {
    const v = spotOf(cfg, g, f, via, now);
    if (v) return v;
  }
  return spotOf(cfg, g, f, def.target, now);
}

/** Inputs of the chevron's rule. */
export interface ChevronIn {
  /** Seconds since this goal first showed. */
  sinceGoal: number;
  /** Metres from the boss to the target (null: no target). */
  dist: number | null;
  moving: boolean;
  /** Seconds the boss has stood still. */
  standingFor: number;
  /** Closer by teach.approachM within the last teach.approachS. */
  approaching: boolean;
  /** Seconds the boss has been moving without coming closer. */
  wanderingFor: number;
}

/** Whether the chevron shows (true) or rests (false). A forced show (a stall's escalation) is the caller's. */
export function chevronShows(t: Teach, i: ChevronIn): boolean {
  if (i.dist === null) return false;
  if (i.sinceGoal < t.chevronShowS) return true;
  if (i.dist <= t.nearM) return false;
  if (i.moving) return !i.approaching && i.wanderingFor >= t.approachS;
  return i.standingFor >= t.chevronIdleS;
}

/** The ghost thumb's state: off, the first second's drag (`intro`), a stall's drag (`drag`) or lift (`lift`). */
export type GhostMode = 'off' | 'intro' | 'drag' | 'lift';

export interface HintSample {
  /** Seconds on the hints' clock (from the gate parting). */
  now: number;
  /** The loading gate has parted (0:00 of the storyboard). */
  gateOpen: boolean;
  goalId: string | null;
  /** The goal's target id (for the first-Open rule) and its stall kind. */
  target: string | null;
  stall: StallKind | null;
  buy: string | null;
  dist: number | null;
  moving: boolean;
  standingFor: number;
  driving: boolean;
  /** A card or panel is open. */
  overlay: boolean;
  /** The player's thumb has landed at least once. */
  stickUsed: boolean;
  /** The place the boss stands at (the one button's "Open"), or null. */
  place: string | null;
}

export interface HintView {
  chevron: boolean;
  ghost: GhostMode;
  /** The escalation playing now, or null. */
  nudge: StallKind | null;
  /** Ring the one button (a first Open at a place, or an `open` escalation). */
  openRing: boolean;
  /** Ring the goal line (a `goal` escalation). */
  goalRing: boolean;
}

/** Which form a goal's escalation takes where the boss is now (still one escalation). */
export function stallForm(t: Teach, kind: StallKind, s: Pick<HintSample, 'dist' | 'place' | 'target' | 'driving'>): StallKind {
  const far = s.dist !== null && s.dist > t.nearM;
  if (kind === 'stand' && far) return 'ghost';
  if (kind === 'ghost' && s.dist !== null && !far) return 'stand';
  if (kind === 'open' && s.place !== s.target) return far ? 'ghost' : 'stand';
  if (kind === 'ghost' && s.dist === null) return 'goal';
  return kind;
}

/**
 * The stateful side (one per mounted yard), fed a sample every few hundred milliseconds and told of
 * progress (rules events). Deterministic in its inputs, so the tests drive it with made-up clocks.
 */
export class HintTracker {
  private goalId: string | null | undefined = undefined;
  private goalAt = 0;
  private lastProgress = 0;
  private best = Infinity;
  private nudged = false;
  private nudgeAt = -1;
  private nudgeKind: StallKind | null = null;
  private trail: { t: number; d: number }[] = [];
  private wanderFrom = -1;
  private seenPlaces = new Set<string>();
  private ringUntil = -1;
  private lastPlace: string | null = null;

  constructor(private readonly t: Teach) {}

  /** A rules event that moves the game on (a piece off, a pickup, a weigh-in, a purchase...). */
  progress(now: number): void {
    this.lastProgress = now;
  }

  update(s: HintSample): HintView {
    const t = this.t;
    const now = s.now;
    if (s.goalId !== this.goalId) {
      this.goalId = s.goalId;
      this.goalAt = now;
      this.lastProgress = now;
      this.best = s.dist ?? Infinity;
      this.nudged = false;
      this.nudgeAt = -1;
      this.nudgeKind = null;
      this.trail = [];
      this.wanderFrom = -1;
    }
    // Coming nearer the target is progress.
    if (s.dist !== null) {
      if (s.dist < this.best - t.approachM) {
        this.best = s.dist;
        this.lastProgress = now;
      }
      this.trail.push({ t: now, d: s.dist });
      while (this.trail.length > 2 && this.trail[0].t < now - t.approachS) this.trail.shift();
    }
    const oldest = this.trail[0];
    const approaching = s.dist !== null && !!oldest && oldest.d - s.dist >= t.approachM * Math.min(1, (now - oldest.t) / t.approachS);
    if (s.moving && !approaching) {
      if (this.wanderFrom < 0) this.wanderFrom = now;
    } else this.wanderFrom = -1;
    const wanderingFor = this.wanderFrom < 0 ? 0 : now - this.wanderFrom;
    // An overlay open is not a stall: the player is reading.
    if (s.overlay) this.lastProgress = Math.max(this.lastProgress, now - t.stallS / 2);

    // The one escalation.
    if (!this.nudged && s.stall && s.gateOpen && !s.overlay && now - this.lastProgress >= t.stallS) {
      this.nudged = true;
      this.nudgeAt = now;
      this.nudgeKind = stallForm(t, s.stall, s);
    }
    const nudging = this.nudgeAt >= 0 && now - this.nudgeAt < t.nudgeS && !s.overlay;
    const nudge = nudging ? this.nudgeKind : null;

    // The first Open at each place.
    if (s.place !== this.lastPlace) {
      this.lastPlace = s.place;
      if (s.place && !this.seenPlaces.has(s.place)) {
        this.seenPlaces.add(s.place);
        this.ringUntil = now + t.openPulseS;
      } else if (!s.place) this.ringUntil = -1;
    }
    if (s.overlay) this.ringUntil = -1;
    const openRing = (!!s.place && now < this.ringUntil) || nudge === 'open';

    const shows = chevronShows(t, { sinceGoal: now - this.goalAt, dist: s.dist, moving: s.moving, standingFor: s.standingFor, approaching, wanderingFor });
    const chevron = !s.overlay && (shows || (s.dist !== null && (nudge === 'chevron' || nudge === 'ghost')));

    let ghost: GhostMode = 'off';
    if (!s.stickUsed && s.gateOpen && !s.overlay && now >= t.ghostDelayS) ghost = 'intro';
    else if (nudge === 'ghost') ghost = 'drag';
    else if (nudge === 'stand') ghost = 'lift';
    return { chevron, ghost, nudge, openRing, goalRing: nudge === 'goal' };
  }
}

/**
 * A purchase goal the rules hold back (one prompt a minute, 2.10): the first unfinished goal asks for a
 * purchase but the card shows another (or none). Then the screen shows the waiting goal dimmed with the
 * seconds left, so it waits visibly. Null when nothing waits.
 */
export function promptWait(cfg: R.SalvageConfig, g: R.SalvageGame, shown: R.Goal | null): { id: string; text: R.Txt; left: number; share: number } | null {
  const s = g.salvage;
  if (!s) return null;
  const def = currentGoalDef(cfg, g);
  if (!def?.buy) return null;
  if (shown && shown.id === def.id) return null;
  if (s.owned.includes(def.buy as R.ShopKey)) return null;
  const gap = cfg.salvage.advice.promptGapS;
  const el = s.t - s.goals.lastPromptAt;
  if (gap <= 0 || el >= gap) return null;
  return { id: def.id, text: { key: def.text as R.TextKey }, left: gap - el, share: Math.max(0, Math.min(1, el / gap)) };
}

/** The first goal of content neither done nor skipped (GoalState keeps the done ids, 2.13). */
export function currentGoalDef(cfg: R.SalvageConfig, g: R.SalvageGame): R.SalvageConfig['salvage']['goals'][number] | null {
  const gs = g.salvage?.goals as unknown as { done?: string[]; skipped?: string[]; at?: number } | undefined;
  if (!gs) return null;
  const list = cfg.salvage.goals;
  if (!gs.done && typeof gs.at === 'number') return list[gs.at] ?? null;
  const off = new Set([...(gs.done ?? []), ...(gs.skipped ?? [])]);
  return list.find((d) => !off.has(d.id)) ?? null;
}

/** Rules events that count as progress on the current goal (anything the hand or the yard did). */
export const PROGRESS_EVENTS: readonly R.SalvageEventType[] = [
  'workStart',
  'pieceOff',
  'pickup',
  'swap',
  'feed',
  'circleDrop',
  'weighIn',
  'collected',
  'machineOut',
  'owned',
  'hired',
  'enterTruck',
  'hook',
  'tip',
  'goal',
  'pour',
];

/** The ghost thumb's drag direction: a unit vector in screen points (the stick steers in world x, y). */
export function dragDir(from: { x: number; y: number } | null, to: { x: number; y: number } | null): { dx: number; dy: number } {
  if (!from || !to) return { dx: -0.6, dy: 0.8 };
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const m = Math.hypot(dx, dy);
  if (m < 1e-6) return { dx: -0.6, dy: 0.8 };
  return { dx: dx / m, dy: dy / m };
}

/** Where the ghost thumb lands: inside the stick zone (its knob's reach), towards its lower left. */
export function ghostHome(zone: { minX: number; maxX: number; minY: number; maxY: number }): { x: number; y: number } {
  return { x: Math.round(zone.minX + (zone.maxX - zone.minX) * 0.3), y: Math.round(zone.minY + (zone.maxY - zone.minY) * 0.55) };
}
