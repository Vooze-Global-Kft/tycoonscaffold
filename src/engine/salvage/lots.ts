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
 * - s2f-plasma-cars (RULING2.md 28.7 a): with `lots.mu_min_tier` a kind of a tier listed there (4: what only the plasma
 *   cuts: stainless, bronze, copper) is held to its own, larger mu, and the richest kind within its own cap comes.
 * - Only the boss cuts one (act `lot`): standing still within reach.work of it with a tool of its tier, for the kind's
 *   `cut_s` whatever its mass. Its pieces (each spec's share of the mass in pieces of at most the spec's grams, the
 *   rest waste) fall on the tipping floor's pile, where the crews take them as any other. While nextAt is null (four
 *   were waiting) the cut sets nextAt = t + period (X1/E1, RULING2 22: a new piece comes one period after the cut that
 *   freed the pad, never at once).
 *
 * EVERY DATE a body writes for the queue is at least the yard second t it is written at (s2a-fix): the loop never
 * applies a date before s.t (tick.ts drops it), so a date in the past stops the feature for ever; a saved one is
 * clamped to the save's clock (state2.ts repairStage2).
 */
import type { Ctx } from './clock';
import { count, heard } from './clock';
import { hash01 } from './board';
import { specsOf } from './content';
import { thingPos } from './positions';
import { ratedIncome } from './rate';
import { weighIn } from './scales';
import { hashString } from '../rng';
import type { Piece, ThingState } from './types';
import { pushThing, spliceThing, thingById, thingsAt } from './lookup';

const H_LOT = hashString('lot');

/** Oversize pieces waiting on the pad. */
export function lotsWaiting(x: Pick<Ctx, 's'>): number {
  let n = 0;
  n += thingsAt(x.s.things, 'lot').length;
  return n;
}

/** The next lot's arrival, yard seconds, or null. */
export function lotsDated(x: Ctx): number | null {
  return x.c.lots && x.s.lots ? x.s.lots.nextAt : null;
}

/**
 * μ at the yard's rung, minutes of I (`lots.mu_min`; the last given at a rung past its end). s2f-plasma-cars (RULING2.md
 * 28.7 a): for a kind whose object's tier `tier` has its own list (`lots.mu_min_tier`), that list.
 */
function muAt(x: Ctx, tier?: number): number {
  const L = x.c.lots!;
  const mu = (tier !== undefined ? L.mu_min_tier?.[String(tier)] : undefined) ?? L.mu_min;
  for (let k = Math.max(1, Math.min(x.s.ladder.rung, mu.length)) - 1; k >= 0; k--) if (mu[k] !== null && mu[k] !== undefined) return mu[k] as number;
  return 0;
}

/**
 * A lot kind's mass range in grams (X3 (b), RULING2 22: what such a real object weighs): `lots.kinds[].mass_kg`,
 * else the object's own gross mass (a content without the key: the object as it is, never scaled).
 */
export function lotMassRange(x: Pick<Ctx, 'c'>, kind: { obj: string; mass_kg?: readonly [number, number] }): [number, number] {
  if (kind.mass_kg) {
    const a = Math.round(kind.mass_kg[0] * 1000);
    const b = Math.round(kind.mass_kg[1] * 1000);
    return [Math.max(1, Math.min(a, b)), Math.max(1, a, b)];
  }
  const g = Math.max(1, x.c.objects[kind.obj]?.gross_g ?? 1);
  return [g, g];
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

/**
 * SEAM-0 (requests.md [seam] 28 Nov 01:10, C-FRAMEWORKS): is there a lot kind the yard can open now (lotArrive's own filter:
 * its object at most the yard's tier and a line owned)? A reader only: no rule calls it (the pad's "No piece your tools can open").
 */
export function lotKindsOpen(x: Ctx): boolean {
  const L = x.c.lots;
  if (!L) return false;
  return L.kinds.some((k) => {
    const o = x.c.objects[k.obj];
    return !!o && o.tier <= x.s.tier && ownsLine(x, k.line);
  });
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
  // X3 (b), RULING2 22: μ × I chooses WHICH object comes, not a multiplier on its mass. One draw u = hash01(worldSeed,
  // 'lot', n) places every eligible kind's mass inside its own range; the heaviest whose worth at p̄ is at most μ × I
  // comes (ties: content order); when none is, the one of least worth.
  // s2f-plasma-cars (RULING2.md 28.7 a): with `lots.mu_min_tier` each kind is held to the mu of ITS object's tier (what only
  // the plasma cuts may be worth more than what a torch cuts) and the RICHEST kind within its own cap comes (ties: the
  // heavier, then content order): the plasma's pieces are worth more, not merely allowed to be. Without the key: as built.
  const I = ratedIncome(x.c, x.s);
  const byTier = !!L.mu_min_tier;
  const want0 = (muAt(x) / 60) * I;
  const u = hash01(x.c.worldSeed, H_LOT, n);
  let pick: { kind: (typeof kinds)[number]; g: number; w: number } | null = null;
  let least: { kind: (typeof kinds)[number]; g: number; w: number } | null = null;
  for (const k of kinds) {
    const [lo, hi] = lotMassRange(x, k);
    const gk = Math.round(lo + u * (hi - lo));
    const w = lotValue(x, { obj: k.obj, g: gk });
    const want = byTier ? (muAt(x, x.c.objects[k.obj]!.tier) / 60) * I : want0;
    if (w <= want && (!pick || (byTier ? w > pick.w || (w === pick.w && gk > pick.g) : gk > pick.g))) pick = { kind: k, g: gk, w };
    if (!least || w < least.w) least = { kind: k, g: gk, w };
  }
  const { kind, g } = pick ?? least!;
  const used = new Set<number>();
  for (const th of thingsAt(x.s.things, 'lot')) if (th.at.at === 'lot') used.add(th.at.k);
  let k = 0;
  while (used.has(k)) k++;
  const uid = `lot${n}`;
  pushThing(x.s.things, { uid, obj: kind.obj, at: { at: 'lot', k }, cut: 0, progress: 0, by: null, g, sender: kind.from });
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
  for (const th of thingsAt(x.s.things, 'lot')) {
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
  const th = id ? thingById(x.s.things, id) : undefined;
  const p = x.s.presence;
  let ok = !!th && !p.moving;
  if (ok) {
    const o = x.c.objects[th!.obj];
    const q = thingPos(x.c, th!.at);
    ok = !!o && Math.hypot(Math.max(0, Math.abs(p.x - q.x) - o.size.w / 2), Math.max(0, Math.abs(p.y - q.y) - o.size.d / 2)) <= x.c.reach.work;
  }
  return ok;
}

/**
 * The act `lot` ends: the oversize piece is WEIGHED WHERE IT IS CUT (X3 (a), RULING2 22, as things.ts shellWeighIn
 * weighs a car's shell): its grades go straight into their bays on one weigh-in ticket with a line a grade (scales.ts
 * weighIn: the analyser, the platform's rounding, the bays' reserves and the crucible's draw as at any weigh-in); no
 * piece is put on the ground. A grade counted in whole units (`wholeUnits_kg`) comes as its spec's pieces so that the
 * bay counts its units; any other as one batch a spec. The rest is waste. The next lot is dated a period later if four
 * were waiting.
 */
export function lotActEnd(x: Ctx, t: number): void {
  const id = x.s.act.target;
  const th = id ? thingById(x.s.things, id) : undefined;
  if (!th || th.at.at !== 'lot') return;
  const { specs, waste } = lotSplit(x, th);
  spliceThing(x.s.things, x.s.things.indexOf(th));
  const ps: Piece[] = [];
  let i = 0;
  for (const sp of specs) {
    if (sp.g <= 0) continue;
    if (x.c.wholeUnits_kg[sp.grade] === undefined) {
      ps.push({ uid: `${th.uid}.p${i++}`, grade: sp.grade, g: sp.g, from: th.uid, spec: sp.spec });
      continue;
    }
    for (let left = sp.g; left > 0; ) {
      const g = Math.min(left, sp.piece);
      ps.push({ uid: `${th.uid}.p${i++}`, grade: sp.grade, g, from: th.uid, spec: sp.spec });
      left -= g;
    }
  }
  x.s.waste_g += waste;
  if (waste > 0 && heard(x)) x.ev.push({ type: 'pieceOff', thing: th.uid, piece: `${th.uid}.waste`, grade: 'waste', g: waste, to: 'waste', by: 'boss' });
  weighIn(x, ps, 'boss', t);
  count(x, 'lotOpened');
  count(x, `cut:${th.obj}`);
  x.ev.push({ type: 'lotOpened', thing: th.uid });
  // X1/E1 (RULING2 22): a cut that frees the pad from full dates the next arrival one period later, never at once
  // (at once, the arrival at the same t made four again and the next cut repeated it: an endless supply).
  if (x.s.lots && x.s.lots.nextAt === null && x.c.lots) x.s.lots.nextAt = t + x.c.lots.period_s;
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
