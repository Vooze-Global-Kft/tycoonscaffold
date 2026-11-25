/**
 * The goal card and the clipboard's list (yard-stage1.md 2.10; goals.json's done grammar, requests.md
 * [hints] 15:58 and notes/hints.md). READS state only (owner: rules-book).
 *
 * DONE CONDITIONS are read from the state, never met by doing nothing: each names something the
 * player (or his crew) did, counted over the yard's life in `salvage.counts` (COUNT_KEYS; the
 * rules-sim bumps them with `bump`), or something owned, hired or reached. A goal whose `buy` is owned
 * counts done whatever its condition. Goals are met IN ORDER: the rules call `checkGoals` at their
 * checks (2.12 step 6) and the current goal is the first neither done nor skipped; a later goal met
 * early is ticked the moment the goals before it are. After the hour's goals the day-1 goals follow in
 * order, each once its `after` holds. The repeating goal (`repeat`: "Buy next: {item}") names the
 * advice line's purchase and is passed over once the goal after it is done; with no advice the card
 * shows the goal after it.
 */
import type { SalvageContent } from '../../config/schema.salvage';
import { advice, cardForItem } from './advice';
import { roleOfKey, rungGrams, rungsOf, shopItem } from './ladder';
import { pointOf } from './positions';
import { rivalDay, rivalGrams } from './rivals';
import type { Goal, GoalDef, GoalLine, GoalState, SalvageConfig, SalvageGame, TextKey, Txt, TxtArgs } from './types';

/** A goal of content (goals.json): the schema's GoalDef plus the hints' fields the schema may still strip. */
export type GoalSpec = GoalDef & { via?: string | null; stall?: string | null; after?: string | null };

/**
 * Lifetime counters (state `salvage.counts`; requested of the contract). The rules-sim bumps:
 * `cut:<obj>` a thing finished apart (boss or cutter; its thingGone) · `weighIns` a boss weigh-in on
 * the platform · `crewWeighIns:<role>` a crew weigh-in · `weighed:<grade>` a weigh-in line of that
 * grade (anyone) · `made:<grade>` a tray credited that grade · `worked:<machine>` a piece finished by
 * it · `fetched:<partner>` a skip tipped on the floor · `poured` a heat poured · `away` an away card
 * acknowledged · `visited:<point>` the boss within reach.place of a map point · `deal:done` a deal
 * series step finished (the sim's keys: `dealSigned`, `dealDone`, `collected` a collection paid).
 */
export const COUNT_KEYS = ['cut:<obj>', 'weighIns', 'crewWeighIns:<role>', 'weighed:<grade>', 'made:<grade>', 'worked:<machine>', 'fetched:<partner>', 'poured', 'away', 'visited:<point>', 'dealSigned', 'dealDone', 'collected'] as const;
export type Counts = Record<string, number>;

/** One more of a counter (pure; the rules-sim's one way to count). */
export function bump(counts: Counts, key: string, n = 1): Counts {
  return { ...counts, [key]: (counts[key] ?? 0) + n };
}

const countsOf = (g: SalvageGame): Counts => g.salvage.counts ?? {};

/** Every goal in order: the hour's, then the day-1 list (content `dayOne`, the hints' file). */
export function goalSpecs(c: SalvageContent): { goals: GoalSpec[]; dayOne: GoalSpec[] } {
  const dayOne = ((c as unknown as { dayOne?: Partial<GoalSpec>[] }).dayOne ?? []).map((d) => ({ optional: false, repeat: false, buy: null, ...d }) as GoalSpec);
  return { goals: c.goals as GoalSpec[], dayOne };
}

/**
 * A count the state shows, from `counts` when the state has it, else from what the state still holds
 * (the stand-in until `counts` lands: owned, crew, tickets, bays, the yard's missing old stock).
 */
export function countOf(c: SalvageContent, g: SalvageGame, key: string): number {
  const s = g.salvage;
  const counts = countsOf(g);
  if (counts[key] !== undefined) return counts[key];
  const [kind, a] = key.split(':');
  // P14: once the sim keeps counts, a skip is FETCHED when it is tipped (truck.ts tipNow bumps the count);
  // the ticket fallback below would count it at the weighbridge, before the tip.
  if (kind === 'fetched' && g.salvage.counts) return 0;
  const weighIns = s.tickets.filter((t) => t.kind === 'weighIn');
  switch (kind) {
    case 'cut': {
      // Old stock and the drop-off's fixed first arrivals gone from the yard (cut apart or carried whole).
      let n = 0;
      for (const [zone, z] of Object.entries(c.zones)) {
        let k = 0;
        for (const [obj, m] of Object.entries(z.things))
          for (let i = 0; i < m; i++, k++) if (obj === a && !s.things.some((t) => t.uid === `${zone}.${obj}.${k}`)) n++;
      }
      c.dropoff.initial.forEach((obj, i) => {
        if (obj === a && !s.things.some((t) => t.uid === `d${i}`)) n++;
      });
      return n;
    }
    case 'weighIns':
      return weighIns.filter((t) => t.kind === 'weighIn' && t.by === 'boss').length;
    case 'crewWeighIns':
      return weighIns.filter((t) => t.kind === 'weighIn' && t.by !== 'boss' && t.by.split('.')[0] === a).length;
    case 'weighed':
      return s.bays[a] || weighIns.some((t) => t.kind === 'weighIn' && t.lines.some((l) => l.grade === a)) ? 1 : 0;
    case 'made':
      return Object.values(s.machines).some((m) => (m.tray_g[a] ?? 0) > 0) || s.bays[a] ? 1 : 0;
    case 'worked':
      return s.machines[a as keyof typeof s.machines]?.work ? 1 : 0;
    case 'fetched':
      return s.tickets.filter((t) => t.kind === 'skipWeighIn' && t.partner === a).length;
    case 'poured':
      return s.machines.crucible.firstPoured ? 1 : 0;
    case 'away':
      return s.beenAway && !s.away ? 1 : 0;
    case 'visited':
      return s.seen.places.includes(a) ? 1 : 0;
    case 'dealDone':
      return s.deal.phase === 'done' ? (c.deal.series.length || 1) : Math.max(0, s.deal.step ?? 0);
    case 'dealSigned':
      return s.deal.phase === 'running' || s.deal.phase === 'done' ? 1 : 0;
    case 'collected':
      return s.tickets.filter((t) => t.kind === 'collection').length;
    default:
      return 0;
  }
}

/** Is a done condition met (goals.json `$done`)? `repeat` is never met by itself. Unknown forms are never met. */
export function conditionMet(cfg: SalvageConfig, g: SalvageGame, cond: string | null | undefined): boolean {
  if (!cond) return true;
  const c = cfg.salvage;
  const s = g.salvage;
  const parts = cond.split(':');
  const num = (i: number) => Math.max(1, Number(parts[i]) || 1);
  switch (parts[0]) {
    case 'cut':
      return countOf(c, g, `cut:${parts[1]}`) >= num(2);
    case 'weighIns':
      return countOf(c, g, 'weighIns') >= num(1);
    case 'crewWeighIns':
      return countOf(c, g, `crewWeighIns:${parts[1]}`) >= num(2);
    case 'weighed':
      return countOf(c, g, `weighed:${parts[1]}`) >= 1;
    case 'made':
    case 'graded':
      return countOf(c, g, `made:${parts[1]}`) >= 1;
    case 'worked':
      return countOf(c, g, `worked:${parts[1]}`) >= num(2);
    case 'owned':
      return s.owned.includes(parts[1]) || hiredKey(c, g, parts[1]);
    case 'hired':
      return s.crew.filter((m) => m.role === parts[1]).length >= num(2);
    case 'fetched':
      return countOf(c, g, `fetched:${parts[1]}`) >= num(2);
    case 'bridged':
      // P14: a skip of that partner over the weighbridge (weighed on the truck, or tipped since).
      return countOf(c, g, `fetched:${parts[1]}`) + (s.truck.skip?.weighed && s.truck.skip.partner === parts[1] ? 1 : 0) >= num(2);
    case 'rung':
      return s.ladder.rung >= num(1);
    case 'deal':
      if (parts[1] === 'signed') return countOf(c, g, 'dealSigned') >= 1 || s.deal.phase === 'running' || s.deal.phase === 'done' || s.deal.delivered > 0 || (s.deal.step ?? 0) > 0;
      if (parts[1] === 'done') return countOf(c, g, 'dealDone') >= num(2);
      return false;
    case 'charged': {
      const cr = s.machines.crucible;
      return cr.owned && cr.fromBays && (cr.charge_g > 0 || Object.values(s.bays).some((b) => b.forCrucible_g > 0) || cr.phase !== 'empty');
    }
    case 'poured':
      return countOf(c, g, 'poured') >= num(1);
    case 'passed':
      return s.ladder.passed >= num(1);
    case 'visited':
      return countOf(c, g, `visited:${parts[1]}`) >= 1;
    case 'away':
      return countOf(c, g, 'away') >= num(1);
    case 'collected':
      return countOf(c, g, 'collected') >= num(1);
    default:
      return false;
  }
}

/** A crew shop key already hired (hand1 = the first yard hand). */
function hiredKey(c: SalvageContent, g: SalvageGame, key: string): boolean {
  const role = roleOfKey(key);
  if (!role) return false;
  const keys = [...c.shop, ...c.dayOneList].filter((i) => i.kind === 'crew' && roleOfKey(i.key) === role).map((i) => i.key);
  const i = keys.indexOf(key);
  return i >= 0 && g.salvage.crew.filter((m) => m.role === role).length > i;
}

/** Is a goal done by its condition now (its buy owned counts too)? */
export function goalMet(cfg: SalvageConfig, g: SalvageGame, d: GoalSpec): boolean {
  if (d.repeat || d.done === 'repeat' || d.done === 'advice:bought') return false;
  if (d.buy && conditionMet(cfg, g, `owned:${d.buy}`)) return true;
  return conditionMet(cfg, g, d.done);
}

/** The goals in the order the card offers them: the hour's, then day-1 (each once its `after` holds). */
function ordered(cfg: SalvageConfig, g: SalvageGame): GoalSpec[] {
  const { goals, dayOne } = goalSpecs(cfg.salvage);
  return [...goals, ...dayOne.filter((d) => conditionMet(cfg, g, d.after ?? null))];
}

const isOpen = (gs: GoalState, d: GoalSpec) => !gs.done.includes(d.id) && !gs.skipped.includes(d.id);

/**
 * The rules' goal check (2.12 step 6): ticks every goal met in order from the current one, passes a
 * repeating goal over once the goal after it is met, and dates `lastPromptAt` when a purchase goal
 * becomes current (shown no sooner than advice.promptGapS after the last, 2.10). Returns the new goal
 * state and the ids newly done (one `goal` event each). Same object when nothing changed.
 */
export function checkGoals(cfg: SalvageConfig, g: SalvageGame): { goals: GoalState; done: string[] } {
  const s = g.salvage;
  let gs = s.goals;
  const done: string[] = [];
  const before = currentSpec(cfg, g, gs);
  for (let guard = 0; guard < 200; guard++) {
    const list = ordered(cfg, g).filter((d) => isOpen(gs, d));
    const cur = list[0];
    if (!cur) break;
    if (cur.repeat || cur.done === 'repeat') {
      const after = list[1];
      if (after && goalMet(cfg, g, after)) {
        gs = { ...gs, done: [...gs.done, cur.id] };
        done.push(cur.id);
        continue;
      }
      break;
    }
    if (!goalMet(cfg, g, cur)) break;
    gs = { ...gs, done: [...gs.done, cur.id] };
    done.push(cur.id);
  }
  const now = currentSpec(cfg, g, gs);
  if (now && now.buy && now.id !== before?.id) gs = { ...gs, lastPromptAt: Math.max(s.t, gs.lastPromptAt + cfg.salvage.advice.promptGapS) };
  if (!done.length && gs.lastPromptAt === s.goals.lastPromptAt) return { goals: s.goals, done };
  return { goals: gs, done };
}

function currentSpec(cfg: SalvageConfig, g: SalvageGame, gs: GoalState): GoalSpec | null {
  return ordered(cfg, g).find((d) => isOpen(gs, d)) ?? null;
}

// ============================================================================ what the card prints

/** A goal's text with its arguments (Supply {t} ({r} metals), Pass {rival}, Buy next: {item}). */
export function goalText(cfg: SalvageConfig, g: SalvageGame, d: GoalSpec): Txt {
  const c = cfg.salvage;
  const parts = d.done.split(':');
  if (parts[0] === 'rung') {
    const n = Number(parts[1]) || 2;
    const r = rungsOf(c).find((x) => x.n === n);
    return { key: d.text as TextKey, args: { t: { tonnes_g: rungGrams(c, n) }, r: { n: r?.range ?? 0 } } };
  }
  if (parts[0] === 'passed') {
    const r = c.rivals.list[(Number(parts[1]) || 1) - 1];
    return { key: d.text as TextKey, args: { rival: { name: r ? `${r.id}.chip` : 'rival.1.chip' } } };
  }
  if (d.repeat) {
    const a = advice(cfg, g, 0);
    const level = a?.action.act === 'level';
    return { key: (level ? 'goal.widenLevel' : 'goal.widen') as TextKey, args: { item: a?.line.args?.item ?? { text: 'item.skip' } } };
  }
  return { key: d.text as TextKey };
}

/** The goal's meter ("1.20 / 2.50 t" or "1 / 2") and its share, or null when it counts nothing. */
function meterOf(cfg: SalvageConfig, g: SalvageGame, d: GoalSpec): { meter: Goal['meter']; progress: Goal['progress'] } {
  const c = cfg.salvage;
  const s = g.salvage;
  const parts = d.done.split(':');
  const mk = (a: number, b: number, args: TxtArgs) => ({ meter: { text: { key: 'goalProgress' as TextKey, args }, share: Math.max(0, Math.min(1, b > 0 ? a / b : 0)) }, progress: { a, b } });
  if (parts[0] === 'rung') {
    const b = rungGrams(c, Number(parts[1]) || 2);
    const a = Math.min(s.ladder.supplied_g, b);
    return mk(a, b, { a: { tonnes_g: a }, b: { tonnes_g: b } });
  }
  if (parts[0] === 'passed') {
    const i = (Number(parts[1]) || 1) - 1;
    const b = rivalGrams(c, i, rivalDay(g));
    const a = Math.min(s.ladder.supplied_g, b);
    return mk(a, b, { a: { tonnes_g: a }, b: { tonnes_g: b } });
  }
  const nAt: Record<string, number> = { cut: 2, worked: 2, hired: 2, crewWeighIns: 2, fetched: 2, weighIns: 1, poured: 1, away: 1 };
  const i = nAt[parts[0]];
  if (i !== undefined) {
    const b = Number(parts[i]) || 1;
    if (b > 1) {
      const key = parts[0] === 'hired' ? null : i === 2 ? `${parts[0]}:${parts[1]}` : parts[0];
      const a = Math.min(b, key ? countOf(c, g, key) : s.crew.filter((m) => m.role === parts[1]).length);
      return mk(a, b, { a: { n: a }, b: { n: b } });
    }
  }
  return { meter: null, progress: null };
}

/** The chevron's target as the rules resolve it: a map point, `truck`, or `advice` resolved to the advice card's place. */
export function goalTarget(cfg: SalvageConfig, g: SalvageGame, d: GoalSpec): string | null {
  if (d.target !== 'advice') return d.target;
  const a = advice(cfg, g, 0);
  if (!a) return null;
  const ref = a.open;
  if (ref.kind === 'place') return ref.place;
  if (ref.kind === 'machine') return ref.machine === 'hand_stripper' || ref.machine === 'stripper' ? 'stripper' : ref.machine;
  if (ref.kind === 'office') return 'office';
  return null;
}

/** The chevron's point in metres, or null (frame.ts: FrameTable.chevron). */
export function chevronOf(cfg: SalvageConfig, g: SalvageGame): { x: number; y: number; id: string } | null {
  const goal = nextGoal(cfg, g);
  if (!goal || !goal.target) return null;
  const s = g.salvage;
  const spec = ordered(cfg, g).find((d) => d.id === goal.id);
  const via = spec?.via && s.truck.by !== 'boss' ? spec.via : null;
  const id = via ?? goal.target;
  if (id === 'truck') return s.truck.owned ? { x: s.truck.x, y: s.truck.y, id } : null;
  if (!cfg.salvage.map.points[id]) return null;
  const p = pointOf(cfg.salvage, id);
  return { x: p.x, y: p.y, id };
}

/** The goal card (2.10), or null after the last goal. */
export function goalOf(cfg: SalvageConfig, g: SalvageGame): Goal | null {
  const gs = g.salvage.goals;
  let list = ordered(cfg, g)
    .map((d, n) => ({ d, n }))
    .filter(({ d }) => isOpen(gs, d));
  // The repeating goal with nothing to advise shows the goal after it (it stays open).
  if (list[0]?.d.repeat && list.length > 1 && !advice(cfg, g, 0)) list = list.slice(1);
  const cur = list[0];
  if (!cur) return null;
  const nxt = list[1];
  const m = meterOf(cfg, g, cur.d);
  return {
    n: cur.n,
    id: cur.d.id,
    text: goalText(cfg, g, cur.d),
    target: goalTarget(cfg, g, cur.d),
    meter: m.meter,
    progress: m.progress,
    buy: cur.d.buy ?? null,
    next: nxt ? goalText(cfg, g, nxt.d) : null,
    optional: !!cur.d.optional,
  };
}

/** The clipboard's goal list: every goal offered so far with its state (done ticked). */
export function goalListOf(cfg: SalvageConfig, g: SalvageGame): GoalLine[] {
  const { done, skipped } = g.salvage.goals;
  let current = false;
  return ordered(cfg, g).map((d) => {
    // W24: a goal whose condition already holds (owned, charged) is ticked, whether or not the pointer reached it.
    const state: GoalLine['state'] = done.includes(d.id) || goalMet(cfg, g, d) ? 'done' : skipped.includes(d.id) ? 'skipped' : current ? 'later' : ((current = true), 'current');
    return { id: d.id, text: goalText(cfg, g, d), state, optional: !!d.optional };
  });
}

/** Facade `nextGoal(cfg, g)`. */
export function nextGoal(cfg: SalvageConfig, g: SalvageGame): Goal | null {
  return goalOf(cfg, g);
}

/** Facade `goalList(cfg, g)`. */
export function goalList(cfg: SalvageConfig, g: SalvageGame): GoalLine[] {
  return goalListOf(cfg, g);
}

/** The card that sells a goal's purchase (the hints' "Open" target), or null. */
export function goalCard(cfg: SalvageConfig, goal: Goal | null): ReturnType<typeof cardForItem> | null {
  if (!goal?.buy) return null;
  const it = shopItem(cfg.salvage, goal.buy);
  return it ? cardForItem(it) : null;
}
