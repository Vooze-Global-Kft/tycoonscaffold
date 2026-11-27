/**
 * The goal card from rung 3 to rung 5 (yard-stage2.md 1.3, 2.13, 3.5; owner goals2, the hints engineer):
 * goals.json's list `stage2` is well formed, in the storyboard's order, asks nothing before its gate,
 * names no loan and no real-money product, leaves no goal only the hand can do without "Not now" (E4),
 * and WALKS: on the frozen states r3, r3plain and held14 (the loop's, src/engine/fixtures/salvage.ts) each
 * goal is done exactly once, in order, by the one thing it names, nothing is done by doing nothing, and
 * the list never stalls (every goal's thing is reachable once the goals before it are done).
 *
 * The stage-2 done grammar (`plate:`, `commissioned:`, `poured:<plate>`, `racked:`, `lot:`, `crate:`,
 * `at:`; goals.json `$done.$stage2`) is the money rules' engineer's to build in goals.ts (requests.md
 * [goals2] 26 Nov). Until he has, `refMet` below is the reference reading of those lines (a local stand-in,
 * the first yard's grammar is goals.ts's own `conditionMet`), and the two blocks that hold goals.ts to it
 * run by themselves the moment goals.ts understands the grammar and offers the list (`BUILT`, `OFFERED`).
 * Frozen test content only (the stage-2 states' own content); no tuned number is pinned.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GoalSchema, withWorksLayer } from '../../config/schema.salvage';
import type { SalvageContent } from '../../config/schema.salvage';
import { STAGE2_NAMES, stage2Cfg, stage2Content, stage2Game, type Stage2Name } from '../fixtures/salvage';
import { report9Frozen } from '../fixtures/report9';
import { checkGoals, conditionMet, nextGoal } from './goals';
import { TEXT_KEYS } from './types';
import type { SalvageConfig, SalvageGame } from './types';

type Spec = { id: string; text: string; target: string | null; via: string | null; done: string; buy: string | null; optional: boolean; repeat?: boolean; stall: string | null; after?: string | null };

const FILE = join(__dirname, '../../../scripts/content/yard/goals.json');
const json = JSON.parse(readFileSync(FILE, 'utf8')) as { goals: Spec[]; dayOne: Spec[]; stage2: Spec[] };
// s2e-content (ruling 27.7): the 22-goal list this file holds is the stage as REPORT9 measured it, frozen in
// src/engine/fixtures/salvage-report9.json; the shipped list of the stage built again is held by goalsStage2e.test.ts.
const LIST = (report9Frozen().salvage as unknown as { stage2: Spec[] }).stage2;
const isRepeat = (d: Spec) => !!d.repeat || d.done === 'repeat';

/** 1.3's 22 goals, by id, in the storyboard's order (strings2's keys, requests.md [strings2] goals2). */
const STORYBOARD = [
  'rackBath', 'buyBaler', 'startBaler', 'buyAnalyser', 'buyShear', 'buyTruckBridge', 'fetchGarage', 'fetchPlumbing', 'cutLot', 'sortCrate', 'buyDepollution',
  'supplyRung4', 'buyCrane', 'walkBackfield', 'buyShredder', 'buyRotary', 'pourRotary', 'buyInduction', 'buyBreaker', 'buySmelter', 'pourLead', 'supplyRung5',
];

const C0 = stage2Content();
const C = withWorksLayer(C0);
const mapWorks = (c: SalvageContent) => (c.map as unknown as { works?: { points?: Record<string, [number, number]>; footprints?: Record<string, { x: number; y: number; w: number; d: number }> } }).works ?? {};
const POINTS = new Set([...Object.keys(C.map.points), ...Object.keys(mapWorks(C).points ?? {})]);
const PLATES = (C as unknown as { works?: { plates?: Record<string, unknown> } }).works?.plates ?? {};
const SHOP = new Map(C.shop.concat(C.dayOneList).map((i) => [i.key, i as typeof i & { needsItem?: string }]));
const rungOf = (gate: string | null | undefined) => Number(/^rung(\d+)$/.exec(gate ?? '')?.[1] ?? 1);

// ============================================================================ the reference reading

/** Is the boss within reach.place of a place's footprint on the merged map (`at:<place>`)? */
function bossAt(c: SalvageContent, g: SalvageGame, place: string): boolean {
  const f = mapWorks(c).footprints?.[place];
  const p = g.salvage.presence as { x: number; y: number; driving?: boolean };
  if (!f || g.salvage.away || p.driving) return false;
  const dx = Math.max(0, Math.abs(p.x - f.x) - f.w / 2);
  const dy = Math.max(0, Math.abs(p.y - f.y) - f.d / 2);
  return Math.hypot(dx, dy) <= c.reach.place;
}

/** goals.json `$done.$stage2` as written: the stage-2 forms here, the first yard's through goals.ts. */
function refMet(cfg: SalvageConfig, g: SalvageGame, cond: string): boolean {
  const [kind, a, b] = cond.split(':');
  const counts = g.salvage.counts ?? {};
  const n = (x: string | undefined) => Math.max(1, Number(x) || 1);
  const works = (g.salvage as unknown as { works?: Record<string, unknown> }).works ?? {};
  switch (kind) {
    case 'plate':
      return works[a] !== undefined;
    case 'commissioned':
      return (counts[`commissioned:${a}`] ?? 0) >= 1;
    case 'poured':
      return /^\d+$/.test(a ?? '1') ? conditionMet(cfg, g, cond) : (counts[`poured:${a}`] ?? 0) >= 1;
    case 'racked':
      return (counts.racked ?? 0) >= n(a);
    case 'lot':
      return (counts.lotOpened ?? 0) >= n(a);
    case 'crate':
      return (counts.crateSorted ?? 0) >= n(a);
    case 'at':
      return bossAt(cfg.salvage, g, a);
    default:
      void b;
      return conditionMet(cfg, g, cond);
  }
}

/** The card's pointer over `stage2` by goals.ts's rules (checkGoals): in order; a repeat passed once the goal after it is met. */
function walk(cfg: SalvageConfig, g: SalvageGame, done: string[], met = refMet): string[] {
  const out = [...done];
  for (;;) {
    const open = LIST.filter((d) => !out.includes(d.id));
    const cur = open[0];
    if (!cur) break;
    if (isRepeat(cur)) {
      if (open[1] && !isRepeat(open[1]) && met(cfg, g, open[1].done)) {
        out.push(cur.id);
        continue;
      }
      break;
    }
    if (!met(cfg, g, cur.done)) break;
    out.push(cur.id);
  }
  return out;
}

/** The one thing a goal names, done to a copy of the state (nothing else changes). */
function witness(c: SalvageContent, g0: SalvageGame, d: Spec): SalvageGame {
  const g = structuredClone(g0) as SalvageGame;
  const s = g.salvage as Omit<SalvageGame['salvage'], 'works'> & { works?: Record<string, unknown> };
  const counts = (s.counts = { ...(s.counts ?? {}) });
  const [kind, a, b] = d.done.split(':');
  const n = Math.max(1, Number(kind === 'fetched' ? b : a) || 1);
  switch (kind) {
    case 'plate':
      s.works = { ...(s.works ?? {}), [a]: { phase: 'arriving' } };
      break;
    case 'commissioned':
    case 'poured':
      counts[`${kind}:${a}`] = 1;
      break;
    case 'racked':
      counts.racked = n;
      break;
    case 'lot':
      counts.lotOpened = n;
      break;
    case 'crate':
      counts.crateSorted = n;
      break;
    case 'owned':
      s.owned = [...s.owned, a];
      break;
    case 'fetched':
      counts[`fetched:${a}`] = n;
      break;
    case 'rung':
      s.ladder = { ...s.ladder, rung: n };
      break;
    case 'at': {
      const f = mapWorks(c).footprints![a];
      s.presence = { ...s.presence, x: f.x, y: f.y, driving: false, moving: false };
      break;
    }
    case 'repeat':
      break;
    default:
      throw new Error(`${d.id}: no witness for ${d.done}`);
  }
  return g;
}

/** After the boss has walked on: he stands where the state had him (an `at:` goal is where he is now). */
function walkOff(g: SalvageGame, from: SalvageGame): SalvageGame {
  return { ...g, salvage: { ...g.salvage, presence: from.salvage.presence } };
}

// ============================================================================ the list as data

describe('goals.json stage2 (1.3, 2.13): data the rules read, in the storyboard\'s order', () => {
  it('every entry parses with the contract schema; ids unique across goals, dayOne and stage2', () => {
    for (const d of LIST) expect(() => GoalSchema.parse(d), d.id).not.toThrow();
    const ids = [...json.goals, ...json.dayOne, ...LIST].map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('1.3\'s 22 goals in its order; a repeating goal before each supply goal and one at the end; the walk just before the shredder (P10)', () => {
    const fixed = LIST.filter((d) => !isRepeat(d)).map((d) => d.id);
    expect(fixed).toEqual(STORYBOARD);
    const ids = LIST.map((d) => d.id);
    for (const s of ['supplyRung4', 'supplyRung5']) expect(isRepeat(LIST[ids.indexOf(s) - 1]), s).toBe(true);
    expect(isRepeat(LIST[LIST.length - 1])).toBe(true);
    expect(LIST.filter(isRepeat)).toHaveLength(3);
    expect(ids.indexOf('buyShredder')).toBe(ids.indexOf('walkBackfield') + 1);
    expect(LIST[0].id).toBe('rackBath'); // 3.5: the card at rung 3 reads "Put the bath on the Yard sale"
  });

  it('text keys are goal.* keys of the contract; no words; the supply goals say tonnes and metals by rung', () => {
    const keys = new Set<string>(TEXT_KEYS.goal as readonly string[]);
    for (const d of LIST) {
      expect(keys.has(d.text), `${d.id}: ${d.text}`).toBe(true);
      for (const v of Object.values(d)) if (typeof v === 'string') expect(v, d.id).not.toMatch(/\s/);
      if (isRepeat(d)) expect(d.text, d.id).toBe('goal.widen');
      if (d.stall !== null) expect(['ghost', 'stand', 'open', 'chevron', 'goal'], d.id).toContain(d.stall);
      if (d.via !== null) expect(d.via, d.id).toBe('truck');
    }
    expect(LIST.find((d) => d.id === 'supplyRung4')?.done).toBe('rung:4');
    expect(LIST.find((d) => d.id === 'supplyRung5')?.done).toBe('rung:5');
  });

  it('every condition is in the grammar and names ids the content has', () => {
    const partners = new Set(Object.keys(C.partners));
    for (const d of LIST) {
      const [kind, a, b] = d.done.split(':');
      const ok =
        (kind === 'plate' && a in PLATES && b === undefined) ||
        (kind === 'commissioned' && a in PLATES) ||
        (kind === 'poured' && ['rotary', 'induction', 'smelter'].includes(a)) ||
        (['racked', 'lot', 'crate'].includes(kind) && /^\d+$/.test(a)) ||
        (kind === 'at' && !!mapWorks(C).footprints?.[a]) ||
        (kind === 'owned' && SHOP.has(a)) ||
        (kind === 'fetched' && partners.has(a) && /^\d+$/.test(b)) ||
        (kind === 'rung' && /^\d+$/.test(a)) ||
        kind === 'repeat';
      expect(ok, `${d.id}: ${d.done}`).toBe(true);
    }
  });

  it('targets are points of the merged map (or truck, advice, none); the chevron points at each goal\'s thing', () => {
    for (const d of LIST) for (const t of [d.target, d.via]) if (t !== null) expect(POINTS.has(t) || t === 'truck' || t === 'advice', `${d.id}: ${t}`).toBe(true);
    for (const d of LIST) {
      const [kind, a] = d.done.split(':');
      if (kind === 'plate' || kind === 'commissioned') expect(d.target, d.id).toBe(SHOP.get(a)?.place);
      if (kind === 'at') expect(d.target, d.id).toBe(a);
      if (isRepeat(d)) expect(d.target, d.id).toBe('advice');
    }
  });

  it('a goal to buy names the shop key it is done by (owning, however paid); no loan, no real-money product (4.1.2)', () => {
    const products = new Set(Object.keys((C as unknown as { iap?: { lookOf?: Record<string, unknown> } }).iap?.lookOf ?? {}));
    for (const d of LIST) {
      if (d.buy) {
        expect(SHOP.has(d.buy), `${d.id}: ${d.buy}`).toBe(true);
        expect([`plate:${d.buy}`, `owned:${d.buy}`], d.id).toContain(d.done);
        expect(products.has(d.buy) || /^pack\d+$|skipAds|noAds/i.test(d.buy), d.id).toBe(false);
      }
      expect(`${d.id} ${d.text} ${d.done}`, d.id).not.toMatch(/loan|bank|financ|pack|shop|scrip|\bad\b/i);
    }
  });

  it('no goal before its gate: rung, needed item, the plate before its start-up and pour, the truck before the bridge partners', () => {
    let rung = 3;
    const bought = new Set<string>(stage2Game('r3').salvage.owned);
    for (const d of LIST) {
      const [kind, a] = d.done.split(':');
      if (d.buy) {
        const it = SHOP.get(d.buy)!;
        expect(rungOf(it.gate), `${d.id}: gate ${it.gate} at rung ${rung}`).toBeLessThanOrEqual(rung);
        if (it.needsItem) expect(bought.has(it.needsItem), `${d.id} needs ${it.needsItem}`).toBe(true);
        bought.add(d.buy);
      }
      if (kind === 'commissioned' || kind === 'poured') expect(bought.has(a), `${d.id}: ${a} bought first`).toBe(true);
      if (kind === 'fetched') {
        const opens = (C.partners[a] as unknown as { opens?: string }).opens;
        if (opens) expect(bought.has(opens), `${d.id}: ${opens} first`).toBe(true);
      }
      if (kind === 'rung') rung = Number(a);
    }
    expect(rung).toBe(5);
  });

  it('no goal only the hand can do without "Not now" (E4): the bath, an oversize piece, the picking table and the walk are optional', () => {
    for (const d of LIST) {
      const kind = d.done.split(':')[0];
      if (['racked', 'lot', 'crate', 'at'].includes(kind)) expect(d.optional, d.id).toBe(true);
      if (d.buy || ['commissioned', 'poured', 'rung', 'fetched'].includes(kind)) expect(d.optional, d.id).toBe(false);
    }
  });
});

// ============================================================================ the walk on the frozen states

describe.each(STAGE2_NAMES.map((n) => [n]))('the list walks on %s', (n: Stage2Name) => {
  const cfg = stage2Cfg(n);
  const g0 = stage2Game(n);
  const fixedIds = LIST.filter((d) => !isRepeat(d)).map((d) => d.id);

  it('nothing is done by doing nothing: on the state as frozen no goal of the list is met', () => {
    expect(walk(cfg, g0, [])).toEqual([]);
    for (const d of LIST) if (!isRepeat(d)) expect(refMet(cfg, g0, d.done), d.id).toBe(false);
  });

  it('each goal is done exactly once, in order, by the one thing it names; the list never stalls', () => {
    let g = g0;
    let done: string[] = [];
    for (let k = 0; k < LIST.length; k++) {
      const d = LIST[k];
      const before = g;
      g = witness(cfg.salvage, g, d);
      done = walk(cfg, g, done);
      // done: every goal up to k (a repeating goal at k waits for the goal after it)
      const want = LIST.slice(0, isRepeat(d) ? k : k + 1).map((x) => x.id);
      expect(done, `after ${d.id}`).toEqual(want);
      if (d.done.startsWith('at:')) g = walkOff(g, before); // he walks on: the goal stays done
    }
    expect(new Set(done).size).toBe(done.length);
    expect(done).toEqual(LIST.slice(0, -1).map((d) => d.id)); // the top's repeating goal stays: the whole message
  });

  it('in order: a goal\'s thing done early is not ticked before the goal before it, and is ticked the moment that one is', () => {
    let g = g0;
    let done: string[] = [];
    for (let k = 0; k + 1 < LIST.length; k++) {
      const d = LIST[k];
      const nx = LIST[k + 1];
      if (isRepeat(d) || isRepeat(nx) || nx.done.startsWith('at:')) {
        g = witness(cfg.salvage, g, d);
        done = walk(cfg, g, done);
        continue;
      }
      const early = witness(cfg.salvage, g, nx);
      expect(walk(cfg, early, done), `${nx.id} before ${d.id}`).toEqual(done);
      const both = witness(cfg.salvage, early, d);
      const ticked = walk(cfg, both, done).slice(done.length).filter((id) => !isRepeat(LIST.find((x) => x.id === id)!)); // a repeat waiting before d passes with it
      expect(ticked, `${d.id} then ${nx.id}`).toEqual([d.id, nx.id]);
      g = witness(cfg.salvage, g, d);
      done = walk(cfg, g, done);
    }
    expect(done).toEqual(LIST.slice(0, -1).map((d) => d.id));
    expect(fixedIds.every((id) => done.includes(id))).toBe(true);
  });

  it('everything done at once: the whole list ticks once, in order, in one check', () => {
    let g = g0;
    for (const d of LIST) g = witness(cfg.salvage, g, d);
    expect(walk(cfg, g, [])).toEqual(LIST.slice(0, -1).map((d) => d.id));
  });
});

// ============================================================================ goals.ts against the reference (runs once built)

const probeCfg = stage2Cfg('r3');
const probeG = witness(probeCfg.salvage, stage2Game('r3'), LIST.find((d) => d.id === 'startBaler')!);
/** goals.ts reads the stage-2 grammar (the money rules' engineer's step). */
const BUILT = conditionMet(probeCfg, probeG, 'commissioned:baler') && !conditionMet(probeCfg, stage2Game('r3'), 'commissioned:baler');
const offeredCfg = { ...probeCfg, salvage: { ...probeCfg.salvage, stage2: LIST } } as unknown as SalvageConfig;
/** goals.ts offers `stage2` from rung 3 before the day-one goals (requests.md [goals2] 26 Nov). */
const OFFERED = nextGoal(offeredCfg, stage2Game('r3'))?.id === 'rackBath';

describe.runIf(BUILT)('goals.ts conditionMet agrees with goals.json\'s reading of the stage-2 grammar', () => {
  it.each(STAGE2_NAMES.map((n) => [n]))('on %s: every condition before and after its witness', (n: Stage2Name) => {
    const cfg = stage2Cfg(n);
    let g = stage2Game(n);
    for (const d of LIST) {
      if (isRepeat(d)) continue;
      expect(conditionMet(cfg, g, d.done), `${d.id} before`).toBe(refMet(cfg, g, d.done));
      g = witness(cfg.salvage, g, d);
      expect(conditionMet(cfg, g, d.done), `${d.id} after`).toBe(true);
    }
  });
});

describe.runIf(OFFERED)('goals.ts offers the list from rung 3 and ticks it as the reference walk does', () => {
  it.each(STAGE2_NAMES.map((n) => [n]))('on %s', (n: Stage2Name) => {
    const base = stage2Cfg(n);
    const cfg = { ...base, salvage: { ...base.salvage, stage2: LIST } } as unknown as SalvageConfig;
    let g = stage2Game(n);
    const ids = new Set(LIST.map((d) => d.id));
    for (const d of LIST) {
      g = witness(cfg.salvage, g, d);
      const r = checkGoals(cfg, g);
      g = { ...g, salvage: { ...g.salvage, goals: r.goals } };
      const doneStage2 = g.salvage.goals.done.filter((id) => ids.has(id));
      expect(doneStage2, `after ${d.id}`).toEqual(walk(cfg, g, []));
    }
  });
});

describe('what is not yet walked', () => {
  it.todo('a bot\'s game through rung 5 (bot.ts plays no stage 2 yet: the works, the Yard sale, lots and the crate are Phase B\'s)');
  it.todo('the frozen state r4 (rules-works\' fixture salvage2works.ts, not yet frozen); rung 4 is reached here by its witness from r3');
  it.todo('every purchase goal affordable within two sittings of the one before it (the bots\' table, 2.22: the next purchase within two sittings)');
});
