/**
 * A WAITING WORKER SAYS WHY (the owner's review, 26 November, point 2: "the helpers sometimes freeze and only
 * restart when I progress somehow"; RULING-owner1 H6; screens1 finding 1). The rules' frame marks a yard hand or
 * cutter who has nothing to do (`FrameCrew.idleWhy`: 'nothing' | 'uncut' | 'yours' | 'tool') with its words
 * (`idleText`, card.crewWhy.*), while he stands at his waiting place and while he walks there. The world draws a
 * small paper tag over his head with those words:
 * - it appears once he has waited IDLE_SHOW_S seconds (rules' seconds, counted from the first frame that marks
 *   him; a change of reason keeps the count), and goes at the first frame that no longer marks him (he departs);
 * - at most IDLE_TAGS_MAX on screen, the nearest to the boss;
 * - above his head, clear of the top bars, clear of the other tags (`placeTags`, a worklet: the tags follow the
 *   workers frame by frame on the UI thread);
 * - 'nothing' (the yard is simply empty) in the quieter ink.
 * Pure; ./IdleTags.tsx draws them. Nothing here decides who waits or why: the frame's fields are drawn.
 */
import type * as R from '../../../engine/salvage';

/** Rules' seconds a worker waits before his tag shows. */
export const IDLE_SHOW_S = 2;
/** The most tags on screen at once. */
export const IDLE_TAGS_MAX = 3;
/** Metres above a worker's feet where his tag's foot sits (over his head: the person sprite is about 1.9 m tall). */
export const TAG_Z_M = 2.15;
/** Points between two tags, and between a tag and the top bars. */
export const TAG_GAP = 3;

export type IdleWhy = NonNullable<R.FrameCrew['idleWhy']>;

export interface IdleTag {
  /** The crew member's id. */
  id: string;
  /** His index in the frame's crew list (the scene packs crew in that order: the frame loop's positions). */
  idx: number;
  why: IdleWhy;
  text: R.Txt;
  /** 'nothing': drawn in the quieter ink. */
  quiet: boolean;
}

/** Where a crew member is at rules second t on his leg (from, via, to), metres. */
export function crewPos(m: R.FrameCrew, t: number): { x: number; y: number } {
  const u = m.t1 > m.t0 ? Math.max(0, Math.min(1, (t - m.t0) / (m.t1 - m.t0))) : 1;
  return { x: m.from.x + (m.to.x - m.from.x) * u, y: m.from.y + (m.to.y - m.from.y) * u };
}

/**
 * The tags to show at the frame's second `t`. `since` is the caller's memory (id -> the rules' second he was
 * first marked); it is updated here: a member no longer marked is forgotten, a newly marked one remembered.
 * `boss` the boss's place (null: by the list's order).
 */
export function idleTags(crew: readonly R.FrameCrew[], t: number, since: Map<string, number>, boss: { x: number; y: number } | null, max = IDLE_TAGS_MAX): IdleTag[] {
  const marked = new Set<string>();
  const due: { tag: IdleTag; d: number }[] = [];
  crew.forEach((m, idx) => {
    if (!m.idleWhy || !m.idleText) return;
    marked.add(m.id);
    const s = since.get(m.id);
    // An epoch jump backwards (a preset, a reload) starts the count again.
    if (s === undefined || s > t) since.set(m.id, t);
    const from = since.get(m.id)!;
    if (t - from < IDLE_SHOW_S - 1e-9) return;
    const p = crewPos(m, t);
    due.push({ tag: { id: m.id, idx, why: m.idleWhy, text: m.idleText, quiet: m.idleWhy === 'nothing' }, d: boss ? Math.hypot(p.x - boss.x, p.y - boss.y) : idx });
  });
  for (const id of [...since.keys()]) if (!marked.has(id)) since.delete(id);
  due.sort((a, b) => a.d - b.d || a.tag.idx - b.tag.idx);
  return due.slice(0, max).map((d) => d.tag);
}

/**
 * Lays the tags out on screen (a worklet, every frame). In: for tag i its anchor (ax[i], ay[i]: the screen point
 * over the head; NaN: not drawn this frame), its size (w[i], h). Out: left and top of each (NaN: hidden). Each
 * tag is centred over its anchor with its foot on it, kept inside [x0, x1] and below `top` (the bars); a tag
 * that would touch one already placed (in order of anchor height, the highest first) moves above it, or below
 * it when there is no room above.
 */
export function placeTags(left: number[], tops: number[], ax: readonly number[], ay: readonly number[], w: readonly number[], h: number, n: number, x0: number, x1: number, top: number, bottom: number): void {
  'worklet';
  const order: number[] = [];
  for (let i = 0; i < n; i++) {
    left[i] = NaN;
    tops[i] = NaN;
    if (ax[i] === ax[i] && ay[i] === ay[i]) order.push(i);
  }
  order.sort((a, b) => ay[a] - ay[b]);
  for (let k = 0; k < order.length; k++) {
    const i = order[k];
    const lx = Math.max(x0, Math.min(x1 - w[i], ax[i] - w[i] / 2));
    let ty = Math.max(top + TAG_GAP, ay[i] - h);
    // Against the tags already placed: up above the one it touches, else below it.
    for (let pass = 0; pass < 4; pass++) {
      let moved = false;
      for (let q = 0; q < k; q++) {
        const j = order[q];
        if (!(tops[j] === tops[j])) continue;
        const over = lx < left[j] + w[j] + TAG_GAP && lx + w[i] + TAG_GAP > left[j] && ty < tops[j] + h + TAG_GAP && ty + h + TAG_GAP > tops[j];
        if (!over) continue;
        const up = tops[j] - h - TAG_GAP;
        ty = up >= top + TAG_GAP ? up : tops[j] + h + TAG_GAP;
        moved = true;
      }
      if (!moved) break;
    }
    if (ty + h > bottom) continue;
    left[i] = lx;
    tops[i] = ty;
  }
}
