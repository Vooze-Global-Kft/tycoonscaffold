/**
 * A WAITING WORKER SAYS WHY (the owner's review, 26 November, point 2: "the helpers sometimes freeze and only
 * restart when I progress somehow"; RULING-owner1 H6; screens1 finding 1). The rules' frame marks a yard hand or
 * cutter who has nothing to do (`FrameCrew.idleWhy`: 'nothing' | 'uncut' | 'yours' | 'tool'; from the works' opening the
 * hired driver's 'bridge') with its words
 * (`idleText`, card.crewWhy.*), while he stands at his waiting place and while he walks there. The world draws a
 * small paper tag over his head with those words:
 * - it appears once he has waited IDLE_SHOW_S seconds (rules' seconds, counted from the first frame that marks
 *   him; a change of reason keeps the count), and goes at the first frame that no longer marks him (he departs);
 * - at most IDLE_TAGS_MAX on screen, the nearest to the boss;
 * - above his head, clear of the top bars, clear of the other tags (`placeTags`, a worklet: the tags follow the
 *   workers frame by frame on the UI thread);
 * - 'nothing' (the yard is simply empty) and 'bridge' in the quieter ink (`quietWhy`).
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
/** C-WORLD-2: numbers per extra anchor of `placeTags` (ax, ay, w, h; the works' plot reasons). */
export const TAG_EXTRA = 4;

export type IdleWhy = NonNullable<R.FrameCrew['idleWhy']>;

/**
 * The reasons drawn in the quieter ink: 'nothing' (the yard is simply empty) and, from the works' opening, 'bridge'
 * (C-WORLD-2: the hired driver waits while the bridge partners' skips fill, frame.ts driverBridgeWhy: a normal wait with
 * its time, not a fault). The first yard never sends 'bridge'.
 */
export const quietWhy = (why: IdleWhy): boolean => why === 'nothing' || why === 'bridge';

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
    due.push({ tag: { id: m.id, idx, why: m.idleWhy, text: m.idleText, quiet: quietWhy(m.idleWhy) }, d: boss ? Math.hypot(p.x - boss.x, p.y - boss.y) : idx });
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
 * it when there is no room above; one that would touch a block (`blocks`: x0, y0, x1, y1 each: the one button)
 * moves above the block. A worker off the screen's sides (anchor outside [x0, x1]) or below `bottom` gets no tag.
 *
 * C-WORLD-2 (critic-build F7; PLAN2 2.8): `extra`, TAG_EXTRA numbers per anchor (ax, ay, w, h: the screen point its
 * foot sits on and its size), are OTHER plates laid out by the same placer (the works' plot reasons, WLD-LABELS), so a
 * plot's reason and a worker's tag never overlap. They are placed FIRST (a plot stands still; the tag of a walking
 * worker gives way), by the same rules (inside [x0, x1], below `top`, clear of the blocks and of each other, the
 * highest first), into `extraOut` (left, top each; NaN: hidden); then the crew's tags, which also move off every placed
 * extra exactly as off another tag. With `extra` empty (the first yard: nothing passes it) nothing of this runs: the
 * crew's tags, their cap (IDLE_TAGS_MAX, in idleTags) and their order are today's, number for number (idleTags.test).
 */
export function placeTags(left: number[], tops: number[], ax: readonly number[], ay: readonly number[], w: readonly number[], h: number, n: number, x0: number, x1: number, top: number, bottom: number, blocks: readonly number[] = [], extra: readonly number[] = [], extraOut: number[] = []): void {
  'worklet';
  // The extra anchors first (C-WORLD-2): none in the first yard.
  const ne = Math.floor(extra.length / TAG_EXTRA);
  if (ne > 0) {
    const eo: number[] = [];
    for (let e = 0; e < ne; e++) {
      extraOut[e * 2] = NaN;
      extraOut[e * 2 + 1] = NaN;
      const ex = extra[e * TAG_EXTRA];
      const ey = extra[e * TAG_EXTRA + 1];
      if (ex === ex && ey === ey && ex >= x0 && ex <= x1 && ey <= bottom) eo.push(e);
    }
    eo.sort((a, b) => extra[a * TAG_EXTRA + 1] - extra[b * TAG_EXTRA + 1]);
    for (let k = 0; k < eo.length; k++) {
      const e = eo[k];
      const ew = extra[e * TAG_EXTRA + 2];
      const eh = extra[e * TAG_EXTRA + 3];
      const lx = Math.max(x0, Math.min(x1 - ew, extra[e * TAG_EXTRA] - ew / 2));
      let ty = Math.max(top + TAG_GAP, extra[e * TAG_EXTRA + 1] - eh);
      for (let pass = 0; pass < 4; pass++) {
        let moved = false;
        for (let b = 0; b + 3 < blocks.length; b += 4) {
          if (lx < blocks[b + 2] && lx + ew > blocks[b] && ty < blocks[b + 3] && ty + eh > blocks[b + 1]) {
            ty = blocks[b + 1] - eh - TAG_GAP;
            moved = true;
          }
        }
        for (let q = 0; q < k; q++) {
          const j = eo[q];
          const jl = extraOut[j * 2];
          const jt = extraOut[j * 2 + 1];
          if (!(jt === jt)) continue;
          const jw = extra[j * TAG_EXTRA + 2];
          const jh = extra[j * TAG_EXTRA + 3];
          const over = lx < jl + jw + TAG_GAP && lx + ew + TAG_GAP > jl && ty < jt + jh + TAG_GAP && ty + eh + TAG_GAP > jt;
          if (!over) continue;
          const up = jt - eh - TAG_GAP;
          ty = up >= top + TAG_GAP ? up : jt + jh + TAG_GAP;
          moved = true;
        }
        if (!moved) break;
      }
      if (ty + eh > bottom || ty < top) continue;
      extraOut[e * 2] = lx;
      extraOut[e * 2 + 1] = ty;
    }
  }
  const order: number[] = [];
  for (let i = 0; i < n; i++) {
    left[i] = NaN;
    tops[i] = NaN;
    if (ax[i] === ax[i] && ay[i] === ay[i] && ax[i] >= x0 && ax[i] <= x1 && ay[i] <= bottom) order.push(i);
  }
  order.sort((a, b) => ay[a] - ay[b]);
  for (let k = 0; k < order.length; k++) {
    const i = order[k];
    const lx = Math.max(x0, Math.min(x1 - w[i], ax[i] - w[i] / 2));
    let ty = Math.max(top + TAG_GAP, ay[i] - h);
    // Against the tags already placed: up above the one it touches, else below it.
    for (let pass = 0; pass < 4; pass++) {
      let moved = false;
      for (let b = 0; b + 3 < blocks.length; b += 4) {
        if (lx < blocks[b + 2] && lx + w[i] > blocks[b] && ty < blocks[b + 3] && ty + h > blocks[b + 1]) {
          ty = blocks[b + 1] - h - TAG_GAP;
          moved = true;
        }
      }
      for (let q = 0; q < k; q++) {
        const j = order[q];
        if (!(tops[j] === tops[j])) continue;
        const over = lx < left[j] + w[j] + TAG_GAP && lx + w[i] + TAG_GAP > left[j] && ty < tops[j] + h + TAG_GAP && ty + h + TAG_GAP > tops[j];
        if (!over) continue;
        const up = tops[j] - h - TAG_GAP;
        ty = up >= top + TAG_GAP ? up : tops[j] + h + TAG_GAP;
        moved = true;
      }
      // C-WORLD-2: off every placed extra plate, as off another tag (nothing here without extras).
      for (let q = 0; q < ne; q++) {
        const el = extraOut[q * 2];
        const et = extraOut[q * 2 + 1];
        if (!(et === et)) continue;
        const ew = extra[q * TAG_EXTRA + 2];
        const eh = extra[q * TAG_EXTRA + 3];
        const over = lx < el + ew + TAG_GAP && lx + w[i] + TAG_GAP > el && ty < et + eh + TAG_GAP && ty + h + TAG_GAP > et;
        if (!over) continue;
        const up = et - h - TAG_GAP;
        ty = up >= top + TAG_GAP ? up : et + eh + TAG_GAP;
        moved = true;
      }
      if (!moved) break;
    }
    if (ty + h > bottom) continue;
    left[i] = lx;
    tops[i] = ty;
  }
}
