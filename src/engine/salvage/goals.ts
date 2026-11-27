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
import { advice, adviceWait, cardForItem } from './advice';
import { gateRung, roleOfKey, rungGrams, rungsOf, shopItem } from './ladder';
import { pointOf, siteRect, skipZone, stopOf } from './positions';
import { owner1Rules } from './content';
import { contentAt } from './layer';
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

/** Every goal list: the hour's, the day-1 list (content `dayOne`) and stage 2's (content `stage2`, goals.json's list; 1.3, 2.13). */
export function goalSpecs(c: SalvageContent): { goals: GoalSpec[]; dayOne: GoalSpec[]; stage2: GoalSpec[] } {
  const fill = (l: Partial<GoalSpec>[] | undefined) => (l ?? []).map((d) => ({ optional: false, repeat: false, buy: null, ...d }) as GoalSpec);
  const x = c as unknown as { dayOne?: Partial<GoalSpec>[]; stage2?: Partial<GoalSpec>[] };
  return { goals: c.goals as GoalSpec[], dayOne: fill(x.dayOne), stage2: fill(x.stage2) };
}

/** The rung the works open at (2.20: derived from the state, not from a rung event): the lowest gate of content `works.plates`; Infinity without plates. */
function worksRung(c: SalvageContent): number {
  let r = Infinity;
  for (const p of Object.values(c.works?.plates ?? {})) r = Math.min(r, gateRung(p.gate) || Infinity);
  return r;
}

/** Is stage 2's list offered (2.13, 2.20): the yard at or above the works' rung. */
function stage2Offered(c: SalvageContent, g: SalvageGame): boolean {
  return g.salvage.ladder.rung >= worksRung(c);
}

type Footprint = { x: number; y: number; w: number; d: number };
const worksMap = (c: SalvageContent) => (c.map as unknown as { works?: { points?: Record<string, [number, number] | { x: number; y: number }>; footprints?: Record<string, Footprint> } }).works ?? {};

/** `at:<place>` (goals.json $stage2): the boss, in the yard, on foot, within reach.place of the place's footprint on the merged map, now. */
function bossAt(c: SalvageContent, g: SalvageGame, place: string): boolean {
  const f = worksMap(c).footprints?.[place];
  const p = g.salvage.presence as { x: number; y: number; driving?: boolean };
  if (!f || g.salvage.away || p.driving) return false;
  const dx = Math.max(0, Math.abs(p.x - f.x) - f.w / 2);
  const dy = Math.max(0, Math.abs(p.y - f.y) - f.d / 2);
  return Math.hypot(dx, dy) <= c.reach.place;
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
      // Stage 2: a plate is owned once it is in `works` (any phase, however paid); plates never enter `owned`.
      return s.owned.includes(parts[1]) || hiredKey(c, g, parts[1]) || s.works?.[parts[1]] !== undefined;
    case 'hired':
      return s.crew.filter((m) => m.role === parts[1]).length >= num(2);
    case 'fetched':
    case 'bridged':
      // P14 (words 19:55): FETCHED = over the weighbridge (weighed on the truck, or tipped since).
      return countOf(c, g, `fetched:${parts[1]}`) + (s.truck.skip?.weighed && s.truck.skip.partner === parts[1] ? 1 : 0) >= num(2);
    case 'tipped':
      // P14: TIPPED on the floor (truck.ts tipNow bumps counts['fetched:<partner>'] at the tip).
      return countOf(c, g, `fetched:${parts[1]}`) >= num(2);
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
      // Stage 2: `poured:<plate>` (a hall's first pour, counts['poured:<plate>']); a NUMBER stays the first yard's heats.
      if (parts[1] && !/^\d+$/.test(parts[1])) return (s.counts?.[`poured:${parts[1]}`] ?? 0) >= 1;
      return countOf(c, g, 'poured') >= num(1);
    // ---- stage 2's grammar (goals.json $stage2; 1.3, 2.13)
    case 'plate':
      return s.works?.[parts[1]] !== undefined;
    case 'commissioned':
      return (s.counts?.[`commissioned:${parts[1]}`] ?? 0) >= 1;
    case 'racked':
      return (s.counts?.racked ?? 0) >= num(1);
    case 'lot':
      return (s.counts?.lotOpened ?? 0) >= num(1);
    case 'crate':
      return (s.counts?.crateSorted ?? 0) >= num(1);
    case 'at':
      return bossAt(c, g, parts[1]);
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

const isOpen = (gs: GoalState, d: GoalSpec) => !gs.done.includes(d.id) && !gs.skipped.includes(d.id);

/**
 * The goals in the order the card offers them: the hour's, then stage 2's from the works' rung (requests.md
 * [goals2] 26 Nov: after the hour's), then day-1 (each once its `after` holds). THE LEAD'S RULE (requests.md,
 * 26 Nov 11:10): whenever stage 2's current goal (its first open one under `gs`) is one of its REPEATING goals
 * (the waits before a supply goal and at the stage's top), the day-one goals still open come first, in the
 * day-one order; when none is open, the repeating goal shows. Below the works' rung: the first yard's order.
 */
function ordered(cfg: SalvageConfig, g: SalvageGame, gs: GoalState = g.salvage.goals): GoalSpec[] {
  return orderedLead(cfg, g, gs).list;
}

/** `ordered` and the ids of the day-one goals put before stage 2's repeating goal (empty when none were). */
function orderedLead(cfg: SalvageConfig, g: SalvageGame, gs: GoalState): { list: GoalSpec[]; lead: Set<string> } {
  const { goals, dayOne, stage2 } = goalSpecs(cfg.salvage);
  const s2 = stage2.length && stage2Offered(cfg.salvage, g) ? stage2 : [];
  const d1 = dayOne.filter((d) => conditionMet(cfg, g, d.after ?? null));
  const i = s2.findIndex((d) => isOpen(gs, d));
  if (i >= 0 && (s2[i].repeat || s2[i].done === 'repeat') && d1.some((d) => isOpen(gs, d))) return { list: [...goals, ...s2.slice(0, i), ...d1, ...s2.slice(i)], lead: new Set(d1.map((d) => d.id)) };
  return { list: [...goals, ...s2, ...d1], lead: new Set() };
}

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
    const o = orderedLead(cfg, g, gs);
    const list = o.list.filter((d) => isOpen(gs, d));
    // A day-one goal put before stage 2's repeating goal (the lead's rule) is offered first but never holds the
    // stage's list back: it ticks when met, and the goals after it go on ticking as before (the list never stalls).
    let k = 0;
    while (k < list.length && o.lead.has(list[k].id) && !goalMet(cfg, g, list[k])) k++;
    const cur = list[k];
    if (!cur) break;
    if (!o.lead.has(cur.id) && (cur.repeat || cur.done === 'repeat')) {
      const after = list[k + 1];
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
  return ordered(cfg, g, gs).find((d) => isOpen(gs, d)) ?? null;
}

// ============================================================================ what the card prints

/** A goal's text with its arguments (Supply {t} ({r} metals), Pass {rival}, Buy next: {item}). */
export function goalText(cfg: SalvageConfig, g: SalvageGame, d: GoalSpec): Txt {
  const c = cfg.salvage;
  const parts = d.done.split(':');
  if (parts[0] === 'rung') {
    // s2e-content: the rung's tonnes and range as the state reads them (layer.ts contentAt: the stage's own rungs, works.rungs,
    // once the works opened; the base content itself before), so the card prints the range the ladder applies.
    const c = contentAt(cfg.salvage, g.salvage);
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
  const nAt: Record<string, number> = { cut: 2, worked: 2, hired: 2, crewWeighIns: 2, fetched: 2, tipped: 2, weighIns: 1, poured: 1, away: 1 };
  const i = nAt[parts[0]];
  if (i !== undefined) {
    const b = Number(parts[i]) || 1;
    if (b > 1) {
      const key = parts[0] === 'hired' ? null : parts[0] === 'tipped' ? `fetched:${parts[1]}` : i === 2 ? `${parts[0]}:${parts[1]}` : parts[0];
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

/**
 * owner1 T2 (RULING-owner1): the step of a load the boss fetches himself, from the truck's state. While the current goal
 * fetches or tips a partner's load, or whenever the boss's truck carries a skip (every later load he fetches himself):
 * not driving with nothing aboard: to the truck; driving with nothing aboard: to the gate and the partner's site (the
 * hook ring running there: "Keep still: hooking"); a skip aboard not weighed: onto the weighbridge; weighed: onto the
 * floor's stop. Stepped out with a skip aboard, the words stay the load's and the chevron points at the truck. Null:
 * no load step (the goal's own target and words).
 */
export function loadStep(cfg: SalvageConfig, g: SalvageGame, goalDone?: string | null): { text: Txt; target: { x: number; y: number; id: string } | null } | null {
  const c = cfg.salvage;
  if (!owner1Rules(c)) return null;
  const s = g.salvage;
  const tr = s.truck;
  if (!tr.owned || tr.by === 'driver') return null;
  const parts = (goalDone ?? '').split(':');
  const goalPartner = parts[0] === 'fetched' || parts[0] === 'tipped' ? parts[1] : null;
  if (!tr.skip && !goalPartner) return null;
  const driving = tr.by === 'boss';
  const truckPt = { x: tr.x, y: tr.y, id: 'truck' };
  const at = (id: string) => ({ ...stopOf(c, id), id });
  if (tr.skip) {
    const text: Txt = { key: (tr.skip.weighed ? 'goal.step.tip' : 'goal.step.weigh') as TextKey };
    return { text, target: driving ? at(tr.skip.weighed ? 'floor' : 'weighbridge') : truckPt };
  }
  // A goal of a load already weighed in (fetched) leaves the tip to its own goal.
  if (!driving) return { text: { key: 'goal.step.truck' as TextKey }, target: truckPt };
  if (s.act.kind === 'hook') return { text: { key: 'goal.step.hook' as TextKey }, target: null };
  const partner = goalPartner!;
  const beyond = s.presence.x > c.yard.width;
  const z = c.partners[partner] ? skipZone(c, partner, 0) : null;
  // owner1-fix (finding 3): standing still outside an open partner's site but within map.siteNear_m of it: "Pull up to
  // the skip", the chevron on that partner's skip (inside the site the hook starts by itself).
  if (beyond && !s.presence.moving && c.map.siteNear_m !== undefined) {
    const px = s.presence.x;
    const py = s.presence.y;
    for (const [pid, ps] of Object.entries(s.partners)) {
      if (!ps.open || !c.partners[pid]) continue;
      const r = siteRect(c, pid, Math.max(1, ps.skips.length));
      if (!r) continue;
      const dx = Math.max(r.x0 - px, 0, px - r.x1);
      const dy = Math.max(r.y0 - py, 0, py - r.y1);
      const d = Math.hypot(dx, dy);
      if (d > 1e-9 && d <= c.map.siteNear_m + 1e-9) {
        const zz = skipZone(c, pid, 0);
        return { text: { key: 'goal.step.pullUp' as TextKey }, target: { x: zz.x, y: zz.y, id: `skip.${pid}` } };
      }
    }
  }
  return { text: { key: 'goal.step.drive' as TextKey }, target: beyond && z ? { x: z.x, y: z.y, id: `skip.${partner}` } : at('gate') };
}

/** The chevron's point in metres, or null (frame.ts: FrameTable.chevron). */
export function chevronOf(cfg: SalvageConfig, g: SalvageGame): { x: number; y: number; id: string } | null {
  const goal = nextGoal(cfg, g);
  const step = loadStep(cfg, g, goal ? ordered(cfg, g).find((d) => d.id === goal.id)?.done : null);
  if (step) return step.target;
  if (!goal || !goal.target) return null;
  const s = g.salvage;
  const spec = ordered(cfg, g).find((d) => d.id === goal.id);
  const via = spec?.via && s.truck.by !== 'boss' ? spec.via : null;
  const id = via ?? goal.target;
  if (id === 'truck') return s.truck.owned ? { x: s.truck.x, y: s.truck.y, id } : null;
  if (!cfg.salvage.map.points[id]) {
    // Stage 2: a target on the works layer of the map (map.works.points: firstThing, baler, backfield, ...).
    const w = worksMap(cfg.salvage).points?.[id];
    if (!w) return null;
    return Array.isArray(w) ? { x: w[0], y: w[1], id } : { x: w.x, y: w.y, id };
  }
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
  const step = loadStep(cfg, g, cur.d.done);
  const waits = rungWaits(cfg, g, cur.d);
  return {
    ...(step ? { step: step.text } : {}),
    ...(waits ? { waits } : {}),
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

/**
 * s2-fix-small (R3, RULING2 24): a rung goal (`rung:<n>`) carries what that rung waits for (advice.ts adviceWait: the
 * tonnes still to supply, or the material its range lacks and who brings it), from the works' opening only (adviceWait
 * is null before: the first yard's goal card is as merged). Absent for every other goal.
 */
function rungWaits(cfg: SalvageConfig, g: SalvageGame, d: GoalSpec): Goal['waits'] {
  const parts = d.done.split(':');
  if (parts[0] !== 'rung') return undefined;
  const w = adviceWait(cfg, g);
  return w && w.rung === (Number(parts[1]) || 2) ? w : undefined;
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
