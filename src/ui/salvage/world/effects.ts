/**
 * EFFECTS BY EVENT, from ONE table (yard-stage1.md 4.4 and section 6's "effects"; the lead's ruling of
 * 15:25: drawn live, never baked). Pure, tested: `effectsFor(event, ctx)` turns one of the rules' events
 * (types.ts SalvageEvent) into the effects it starts, with where they start and end in the yard; the
 * effects canvas (./WorldLayer.tsx) plays them on the UI thread.
 *
 * | Event | Effect |
 * |---|---|
 * | workStart (by tool and the thing's material) | sparks (grinder), dust at each blow (sledge), the torch's flame and sparks, small ticks (spanners), until workStop or thingGone |
 * | pieceOff to the load / the ground / waste | the piece's arc onto the load, beside the thing, into the rubble skip |
 * | weighIn | the muted "today's value" slides from the weigh-in ticket's place to the bay chip |
 * | roundLoad | the bays' values slide into the flatbed's bed |
 * | collected | the coin's arc from the flatbed's cab to the cash counter |
 * | pour | the pour's glow on the ground under the crucible, and the ingot cooling to its metal's colour |
 * The work ring is not an event: it follows FrameThing.work (the canvas reads the frame's rings).
 */
import type { SalvageContent } from '../../../config/schema.salvage';
import type * as R from '../../../engine/salvage';

/** Effect kinds (numbers: the UI thread's records are flat). */
export const FX = { work: 0, arc: 1, slide: 2, coin: 3, glow: 4, cool: 5 } as const;
export type FxKind = (typeof FX)[keyof typeof FX];

/** The work effect's looks. */
export const WORK = { ticks: 0, dust: 1, sparks: 2, torch: 3 } as const;

/** Seconds each effect lasts (a work effect lasts until it is stopped; this is its fade). */
export const FX_S: Record<FxKind, number> = { 0: 0.25, 1: 0.45, 2: 0.9, 3: 0.75, 4: 2.6, 5: 3.0 };

/**
 * One effect to start. Points are metres in the yard (z up) unless `screen` says the end is a window
 * point (the cash counter). `id` names a running work effect so its stop finds it.
 */
export interface FxSpawn {
  kind: FxKind;
  id: string;
  /** Start, metres. */
  ax: number;
  ay: number;
  az: number;
  /** End, metres; for the coin a window point (screen). For `arc` to the load, `toBoss` 1: the end follows the boss. */
  bx: number;
  by: number;
  bz: number;
  toBoss: 0 | 1;
  screenEnd: 0 | 1;
  /** Work look, the piece's grade index (its picture), or the ingot metal index. */
  look: number;
  /** A value to print (the slide's money), else 0. */
  money: number;
  /** Delay before it starts, seconds (several coins, a slide after the ticket folds). */
  delay: number;
}

/** What the table needs besides the event: where things stand (the last frame) and what content says. */
export interface FxContext {
  content: Pick<SalvageContent, 'objects' | 'grades' | 'map' | 'tools'>;
  /** The last frame's things and bays (their places). */
  frame: Pick<R.FrameTable, 'things' | 'bays' | 'flatbed' | 'machines'> | null;
  /** Where the boss stands now, metres (the presence sample or the frame loop's body). */
  boss: { x: number; y: number } | null;
  /** The grade ids the canvas has pictures for, in order (look index). */
  grades: string[];
}

const blank = (kind: FxKind, id: string): FxSpawn => ({ kind, id, ax: 0, ay: 0, az: 0, bx: 0, by: 0, bz: 0, toBoss: 0, screenEnd: 0, look: 0, money: 0, delay: 0 });

function pointOf(ctx: FxContext, id: string): { x: number; y: number } | null {
  const p = (ctx.content.map.points as Record<string, [number, number]>)[id];
  return p ? { x: p[0], y: p[1] } : null;
}

/** The work look of a tool on a thing: the sledge breaks cast iron (dust), the grinder cuts thin steel (sparks), the torch burns, spanners tick. */
export function workLook(ctx: FxContext, tool: string, obj: string): number {
  const o = ctx.content.objects[obj];
  const first = o?.pieces[0]?.[0];
  const tier = (ctx.content.tools as Record<string, { tier: number }>)[tool]?.tier ?? 1;
  if (tier >= 3) return WORK.torch;
  if (tier === 2) return first && /^ci/.test(first) ? WORK.dust : WORK.sparks;
  return WORK.ticks;
}

/** The ONE table: the effects an event starts (and `stop` the work effects it ends). Pure. */
export function effectsFor(e: R.SalvageEvent, ctx: FxContext): { start: FxSpawn[]; stop: string[] } {
  const thingAt = (uid: string) => ctx.frame?.things.find((t) => t.uid === uid) ?? null;
  switch (e.type) {
    case 'workStart': {
      const t = thingAt(e.thing);
      if (!t) return { start: [], stop: [] };
      const h = ctx.content.objects[e.obj]?.size?.h ?? 1;
      return { start: [{ ...blank(FX.work, `work.${e.thing}`), ax: t.x, ay: t.y, az: Math.min(1.2, h * 0.6), look: workLook(ctx, e.tool, e.obj) }], stop: [] };
    }
    case 'workStop':
      return { start: [], stop: [`work.${e.thing}`] };
    case 'thingGone':
      return { start: [], stop: [`work.${e.thing}`] };
    case 'pieceOff': {
      const t = thingAt(e.thing);
      if (!t) return { start: [], stop: [] };
      const look = Math.max(0, ctx.grades.indexOf(e.grade));
      const s = { ...blank(FX.arc, `piece.${e.piece}`), ax: t.x, ay: t.y, az: 0.6, look };
      if (e.to === 'load' && e.by === 'boss' && ctx.boss) return { start: [{ ...s, bx: ctx.boss.x, by: ctx.boss.y, bz: 1.3, toBoss: 1 }], stop: [] };
      if (e.to === 'waste') {
        const r = pointOf(ctx, 'rubble');
        return r ? { start: [{ ...s, bx: r.x, by: r.y, bz: 1.0 }], stop: [] } : { start: [], stop: [] };
      }
      // Beside the thing (the ground), a little to the viewer's side.
      return { start: [{ ...s, bx: t.x + 0.9, by: t.y + 0.6, bz: 0 }], stop: [] };
    }
    case 'weighIn': {
      if (e.ticket.kind !== 'weighIn') return { start: [], stop: [] };
      const scale = pointOf(ctx, 'scale');
      const first = e.ticket.lines[0]?.grade;
      const bay = ctx.frame?.bays.find((b) => b.grade === first) ?? null;
      const end = bay ?? pointOf(ctx, 'bays');
      if (!scale || !end) return { start: [], stop: [] };
      return { start: [{ ...blank(FX.slide, `slide.in.${e.ticket.no}`), ax: scale.x, ay: scale.y, az: 2.2, bx: end.x, by: end.y, bz: 1.4, money: e.ticket.todaysValue, delay: 1.2 }], stop: [] };
    }
    case 'roundLoad': {
      const fb = ctx.frame?.flatbed;
      const bays = (ctx.frame?.bays ?? []).filter((b) => b.g > 0 && !b.held);
      if (!fb || bays.length === 0) return { start: [], stop: [] };
      return { start: bays.slice(0, 4).map((b, i) => ({ ...blank(FX.slide, `slide.out.${b.grade}`), ax: b.x, ay: b.y, az: 1.4, bx: fb.x, by: fb.y, bz: 1.2, look: Math.max(0, ctx.grades.indexOf(b.grade)), delay: i * 0.18 })), stop: [] };
    }
    case 'collected': {
      const fb = ctx.frame?.flatbed;
      const p = fb ?? pointOf(ctx, 'merchant');
      if (!p) return { start: [], stop: [] };
      const n = e.big ? 5 : 3;
      return { start: Array.from({ length: n }, (_, i) => ({ ...blank(FX.coin, `coin.${e.ticket.no}.${i}`), ax: p.x + 1.2, ay: p.y, az: 1.6, screenEnd: 1 as const, delay: i * 0.12 })), stop: [] };
    }
    case 'pour': {
      const m = ctx.frame?.machines.find((x) => x.machine === 'crucible');
      const p = m ?? pointOf(ctx, 'crucible');
      if (!p) return { start: [], stop: [] };
      const metal = e.grade === 'ali' ? 1 : 0;
      return {
        start: [
          { ...blank(FX.glow, 'glow.pour'), ax: p.x, ay: p.y + 0.3, az: 0 },
          { ...blank(FX.cool, 'cool.pour'), ax: p.x + 1.4, ay: p.y + 0.9, az: 0.1, look: metal, delay: 0.8 },
        ],
        stop: [],
      };
    }
    default:
      return { start: [], stop: [] };
  }
}

/** The events the table answers (the canvas subscribes to these only). */
export const FX_EVENTS: readonly R.SalvageEventType[] = ['workStart', 'workStop', 'thingGone', 'pieceOff', 'weighIn', 'roundLoad', 'collected', 'pour'];

// ================================================================================================ the UI thread

/** Position along an arc at share u (0 start, 1 end) with a lift of `hump` metres at its middle (a worklet). */
export function arcAt(out: number[], ax: number, ay: number, az: number, bx: number, by: number, bz: number, u: number, hump: number): void {
  'worklet';
  const k = Math.max(0, Math.min(1, u));
  out[0] = ax + (bx - ax) * k;
  out[1] = ay + (by - ay) * k;
  out[2] = az + (bz - az) * k + hump * 4 * k * (1 - k);
}

/** Ease in and out (a worklet). */
export function ease(u: number): number {
  'worklet';
  const k = Math.max(0, Math.min(1, u));
  return k * k * (3 - 2 * k);
}
