/**
 * DELIVERED LOTS ("oversize pieces", stage 2, docs/design/yard-stage2.md 2.10.1): a named partner's lorry
 * sets a lot on the oversize pad at `lots.nextAt` (yard seconds, so they ride the away cap), at most
 * `lots.max` waiting, never a backlog; only the boss cuts one. Owner: rules-works (wave 2 built the bodies, 26 Nov).
 *
 * PHASE A STUB (engine2-hooks, 26 November): no lot is ever dated, so the first yard advances exactly as
 * before. Where the loop calls it:
 * - `lotsDated(x)` from the derived queue (kind `lot`, ref ''): the next arrival's yard second, or null.
 *   Read `x.s.lots.nextAt` here, not in the loop: a date the feature does not move would repeat its instant.
 * - `lotArrive(x, t)` at that instant: the lot set down, `nextAt` = max(nextAt, t) + period, or null when
 *   the arrival makes `lots.max` (B9).
 * Cutting a lot is the boss's act (`lot`, 2.18), not a dated event of the queue.
 * THE LEAD'S RULING 6 (26 Nov 09:50): there is no fallback thing. While no kind can be drawn (every kind of
 * lots.kinds needs the plasma cutter, or a line the yard does not own) the lots WAIT for a kind the yard can
 * open; each kind's cut seconds are its own (`lots.kinds[].cut_s`).
 *
 * THE RULE AS BUILT (wave 2; notes/s2b-rules-works.md):
 * - At `lots.nextAt` (yard seconds, the same present and away): with `lots.max` waiting nothing comes and nextAt is
 *   null; else a kind is drawn by hash01(worldSeed, 'lot', lots.n) among `lots.kinds` whose object's tier the yard's
 *   tool tier reaches and of whose `line` the yard owns one (a first-yard machine owned, or a plate ordered); with
 *   none, nothing comes and the next try is at t + period (the lots WAIT, ruling 6). A lot comes as `lot<n>` on the
 *   first free square of the oversize pad with its mass fixed (`ThingState.g`) so that its pieces at p̄ are worth
 *   μ_rung minutes of rated income I at that instant (rate.ts ratedIncome), and its sender; then nextAt =
 *   max(nextAt, t) + period, or null when it makes four.
 * - Only the boss cuts one (act `lot`): standing still within reach.work of it with a tool of its tier, for the kind's
 *   `cut_s` whatever its mass. Its pieces (each spec's share of the mass in pieces of at most the spec's grams, the
 *   rest waste) fall on the tipping floor's pile, where the crews take them as any other. While nextAt is null the
 *   cut sets nextAt = t (one comes at once; the next a period later).
 *
 * EVERY DATE a body writes for the queue is at least the yard second t it is written at (s2a-fix): the loop never
 * applies a date before s.t (tick.ts drops it), so a date in the past stops the feature for ever; a saved one is
 * clamped to the save's clock (state2.ts repairStage2).
 */
import type { Ctx } from './clock';
import { count, heard } from './clock';
import { hash01 } from './board';
import { specsOf } from './content';
import { nearPlace, thingPos } from './positions';
import { ratedIncome } from './rate';
import { dropOnPile } from './things';
import { hashString } from '../rng';
import type { Piece, ThingState } from './types';

const H_LOT = hashString('lot');

/** Oversize pieces waiting on the pad. */
export function lotsWaiting(x: Pick<Ctx, 's'>): number {
  let n = 0;
  for (const th of x.s.things) if (th.at.at === 'lot') n++;
  return n;
}

/** The next lot's arrival, yard seconds, or null. */
export function lotsDated(x: Ctx): number | null {
  return x.c.lots && x.s.lots ? x.s.lots.nextAt : null;
}

/** μ at the yard's rung, minutes of I (`lots.mu_min`; the last given at a rung past its end). */
function muAt(x: Ctx): number {
  const mu = x.c.lots!.mu_min;
  for (let k = Math.max(1, Math.min(x.s.ladder.rung, mu.length)) - 1; k >= 0; k--) if (mu[k] !== null && mu[k] !== undefined) return mu[k] as number;
  return 0;
}

/** The value at p̄ of a whole object's pieces (its shell too), §. */
function wholeValue(x: Pick<Ctx, 'c'>, obj: string): number {
  let v = 0;
  for (const sp of specsOf(x.c, obj)) v += ((sp[1] * sp[2]) / 1000) * (x.c.grades[sp[0]]?.pbar ?? 0);
  const sh = x.c.objects[obj]?.shell;
  if (sh) v += (sh.g / 1000) * (x.c.grades[sh.grade]?.pbar ?? 0);
  return v;
}

/** A lot's grams by spec (each spec's share of its mass, rounded) and its waste (the rest): the one split, at its plate and at its cut. */
export function lotSplit(x: Pick<Ctx, 'c'>, th: Pick<ThingState, 'obj' | 'g'>): { specs: { grade: string; g: number; piece: number; spec: number }[]; waste: number } {
  const o = x.c.objects[th.obj];
  const total = th.g ?? o?.gross_g ?? 0;
  const f = o && o.gross_g > 0 ? total / o.gross_g : 1;
  const specs = specsOf(x.c, th.obj).map((sp, spec) => ({ grade: sp[0], g: Math.round(sp[1] * sp[2] * f), piece: sp[1], spec }));
  const waste = Math.max(0, total - specs.reduce((a, q) => a + q.g, 0));
  return { specs, waste };
}

/** A lot's printed value "about §x once cut": its pieces at p̄ (the value paid at p̄ once it is cut and sold). */
export function lotValue(x: Pick<Ctx, 'c'>, th: Pick<ThingState, 'obj' | 'g'>): number {
  return lotSplit(x, th).specs.reduce((a, q) => a + (q.g / 1000) * (x.c.grades[q.grade]?.pbar ?? 0), 0);
}

/** Does the yard own a line of this lot kind (a first-yard machine owned or a plate ordered; none named: always)? */
function ownsLine(x: Ctx, line: readonly string[]): boolean {
  if (!line.length) return true;
  for (const id of line) {
    if ((x.s.machines as Record<string, { owned: boolean } | undefined>)[id]?.owned) return true;
    if (x.s.works[id]) return true;
  }
  return false;
}

/** A lot arrives at its instant t. */
export function lotArrive(x: Ctx, t: number): void {
  const L = x.c.lots;
  const st = x.s.lots;
  if (!L || !st || st.nextAt === null) return;
  const waiting = lotsWaiting(x);
  if (waiting >= L.max) {
    st.nextAt = null;
    return;
  }
  const kinds = L.kinds.filter((k) => {
    const o = x.c.objects[k.obj];
    return !!o && o.tier <= x.s.tier && ownsLine(x, k.line);
  });
  if (!kinds.length) {
    // The lots WAIT for a kind the yard can open (ruling 6): nothing comes; tried again a period later.
    st.nextAt = Math.max(st.nextAt, t) + L.period_s;
    return;
  }
  const n = st.n;
  const kind = kinds[Math.min(kinds.length - 1, Math.floor(hash01(x.c.worldSeed, H_LOT, n) * kinds.length))];
  const o = x.c.objects[kind.obj];
  const want = (muAt(x) / 60) * ratedIncome(x.c, x.s);
  const wv = wholeValue(x, kind.obj);
  const g = want > 0 && wv > 0 ? Math.max(1, Math.round((o.gross_g * want) / wv)) : o.gross_g;
  const used = new Set<number>();
  for (const th of x.s.things) if (th.at.at === 'lot') used.add(th.at.k);
  let k = 0;
  while (used.has(k)) k++;
  const uid = `lot${n}`;
  x.s.things.push({ uid, obj: kind.obj, at: { at: 'lot', k }, cut: 0, progress: 0, by: null, g, sender: kind.from });
  st.n = n + 1;
  st.nextAt = waiting + 1 >= L.max ? null : Math.max(st.nextAt, t) + L.period_s;
  if (x.away) x.away.lotsWaiting = waiting + 1;
  x.dirty = true;
  x.ev.push({ type: 'lotArrived', thing: uid, k, sender: kind.from });
}

/** The nearest lot within reach.work of the boss that his tool tier cuts, or null. */
function lotInReach(x: Ctx): ThingState | null {
  const p = x.s.presence;
  let best: ThingState | null = null;
  let bestD = Infinity;
  for (const th of x.s.things) {
    if (th.at.at !== 'lot' || th.by) continue;
    const o = x.c.objects[th.obj];
    if (!o || o.tier > x.s.tier) continue;
    const q = thingPos(x.c, th.at);
    const d = Math.hypot(Math.max(0, Math.abs(p.x - q.x) - o.size.w / 2), Math.max(0, Math.abs(p.y - q.y) - o.size.d / 2));
    if (d <= x.c.reach.work && d < bestD) {
      best = th;
      bestD = d;
    }
  }
  return best;
}

/** The kind's cut seconds (`lots.kinds[].cut_s`, else the range's low end). */
function cutS(x: Ctx, obj: string): number {
  const L = x.c.lots!;
  return L.kinds.find((k) => k.obj === obj)?.cut_s ?? L.cut_s[0];
}

/** The boss starts cutting an oversize piece (works.ts worksAct): standing still within reach of it with its tier. */
export function lotAct(x: Ctx, t: number): boolean {
  if (!x.c.lots || x.s.presence.moving) return false;
  const th = lotInReach(x);
  if (!th) return false;
  x.s.act = { kind: 'lot', target: th.uid, since: t, endsAt: t + cutS(x, th.obj) };
  return true;
}

/** The act `lot` holds while he stands still within reach of it (nothing is lost when he steps off: it is cut whole at the act's end only). */
export function lotActHolds(x: Ctx, t: number): boolean {
  void t;
  const id = x.s.act.target;
  const th = id ? x.s.things.find((q) => q.uid === id) : undefined;
  const p = x.s.presence;
  let ok = !!th && !p.moving;
  if (ok) {
    const o = x.c.objects[th!.obj];
    const q = thingPos(x.c, th!.at);
    ok = !!o && Math.hypot(Math.max(0, Math.abs(p.x - q.x) - o.size.w / 2), Math.max(0, Math.abs(p.y - q.y) - o.size.d / 2)) <= x.c.reach.work;
  }
  return ok;
}

/** The act `lot` ends: the oversize piece comes apart onto the floor's pile; a lot is dated at once if four were waiting. */
export function lotActEnd(x: Ctx, t: number): void {
  const id = x.s.act.target;
  const th = id ? x.s.things.find((q) => q.uid === id) : undefined;
  if (!th || th.at.at !== 'lot') return;
  const { specs, waste } = lotSplit(x, th);
  x.s.things.splice(x.s.things.indexOf(th), 1);
  let i = 0;
  for (const sp of specs) {
    let left = sp.g;
    while (left > 0) {
      const g = Math.min(left, sp.piece);
      const p: Piece = { uid: `${th.uid}.p${i++}`, grade: sp.grade, g, from: th.uid, spec: sp.spec };
      dropOnPile(x, p, 'floor');
      if (heard(x)) x.ev.push({ type: 'pieceOff', thing: th.uid, piece: p.uid, grade: p.grade, g, to: 'ground', by: 'boss' });
      left -= g;
    }
  }
  x.s.waste_g += waste;
  count(x, 'lotOpened');
  count(x, `cut:${th.obj}`);
  x.ev.push({ type: 'lotOpened', thing: th.uid });
  if (x.s.lots && x.s.lots.nextAt === null && x.c.lots) x.s.lots.nextAt = t;
}

/**
 * The works open (works.ts worksOpen, `backFieldOpen`; rules-works wave 1): the first lot is dated
 * t + lots.period_s (2.10.1: `nextAt` is first set here, never at creation or migration).
 */
export function lotsOpen(x: Ctx, t: number, since: number = t): void {
  const L = x.c.lots;
  if (!L || x.s.lots.nextAt !== null) return;
  // Dated from the instant the works' condition first held (`since`, rate.ts checks; join2b, the dispatch check's
  // F5): the instant the rung was reached when it was reached inside this transition (a tick, a jump and ten jumps
  // reach it at the same event), else the start of the transition (a save already at the rung, whose first check
  // falls at a tick's horizon or a jump's first event). Never before t (a date in the past would stop the feature).
  x.s.lots.nextAt = Math.max(t, since + L.period_s);
}
