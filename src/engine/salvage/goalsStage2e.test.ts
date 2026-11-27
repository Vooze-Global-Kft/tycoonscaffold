/**
 * THE GOAL LIST OF THE STAGE BUILT AGAIN (s2e-content, 27 November; yard-stage2-economy.md 1.3; RULING2.md 27): goals.json's
 * `stage2` as shipped. The design's 17 goals (without the copper hall's and the trailer's, ruling 27.3 D3) in its order, then
 * the stage's repeating goal (the advice's owner makes it "Level up: {item}"); every goal to buy names what the stage SELLS
 * (no dark item is ever a goal); every condition is goals.ts's own grammar (no new kind was needed: owned:plasma,
 * commissioned:analyser, poured:induction); texts by key, at most 30 characters; and the list WALKS through goals.ts's own
 * checkGoals on the frozen stage-2 states (fixtures/salvage.ts): nothing done by doing nothing, each goal done once, in
 * order, by the one thing it names. The list as REPORT9 measured it is goalsStage2.test.ts's (on the frozen fixture).
 * No tuned number is pinned.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GoalSchema, SalvageSchema, withWorksLayer } from '../../config/schema.salvage';
import type { SalvageContent } from '../../config/schema.salvage';
import { shipped2Config } from '../fixtures/shipped2';
import { STAGE2_NAMES, stage2Cfg, stage2Game, type Stage2Name } from '../fixtures/salvage';
import { checkGoals, conditionMet } from './goals';
import { gateRung } from './ladder';
import { TEXT } from '../../ui/salvage/strings';
import { TEXT_KEYS } from './types';
import type { SalvageConfig, SalvageGame } from './types';

type Spec = { id: string; text: string; target: string | null; via: string | null; done: string; buy: string | null; optional: boolean; repeat?: boolean; stall: string | null };
const json = JSON.parse(readFileSync(join(__dirname, '../../../scripts/content/yard/goals.json'), 'utf8')) as { goals: Spec[]; dayOne: Spec[]; stage2: Spec[] };
// s2f-copper: the list AS BUILT into game.json (build-yard.py writes no goal naming what the stage does not sell: the copper
// hall's two goals are written only while its gate sells it), read below from the shipped content
const isRepeat = (d: Spec) => !!d.repeat || d.done === 'repeat';

/** yard-stage2-economy.md 1.3's list, by id, in its order (the bracketed copper hall and trailer goals are not built). */
const DESIGN = [
  'rackBath', 'buyTruckBridge', 'fetchGarage', 'fetchPlumbing', 'buyAnalyser', 'startAnalyser', 'buyPlasma', 'cutLot', 'sortCrate', 'supplyRung4',
  'walkBackfield', 'buyInduction', 'pourInduction', 'buyShredder', 'buyRotary', 'pourRotary', 'supplyRung5',
];

const S2 = withWorksLayer(shipped2Config((x) => SalvageSchema.parse(x)).salvage as SalvageContent);
const top = S2.ladder.topRung ?? 3;
const soldPlates = new Set(Object.entries(S2.works!.plates).filter(([, p]) => gateRung(p.gate) <= top).map(([k]) => k));
const soldShop = new Map(S2.shop.concat(S2.dayOneList).filter((i) => gateRung(i.gate) <= top).map((i) => [i.key, i]));
const strings = TEXT as unknown as Record<string, string>;
const LIST = ((S2 as unknown as { stage2?: Spec[] }).stage2 ?? []) as Spec[];
// s2f-copper (RULING2.md 27.5, 28.7 c): the copper refining hall's two goals after the rotary hall's, while its gate sells it
if (soldPlates.has('copper')) DESIGN.splice(DESIGN.indexOf('pourRotary') + 1, 0, 'buyCopper', 'pourCopper');

describe('goals.json stage2 as shipped (1.3; ruling 27)', () => {
  it('the design\'s 17 goals in its order, then one repeating goal at the stage\'s top; ids unique; each entry parses', () => {
    expect(LIST.filter((d) => !isRepeat(d)).map((d) => d.id)).toEqual(DESIGN);
    expect(isRepeat(LIST[LIST.length - 1])).toBe(true);
    expect(LIST.filter(isRepeat)).toHaveLength(1);
    for (const d of LIST) expect(() => GoalSchema.parse(d), d.id).not.toThrow();
    const ids = [...json.goals, ...json.dayOne, ...LIST].map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    // the plasma before the oversize piece; the analyser bought before it starts up; each hall bought before it pours
    const at = (id: string) => DESIGN.indexOf(id);
    expect(at('buyPlasma')).toBeLessThan(at('cutLot'));
    // s2g-halls (RULING2.md 29.5 a): the analyser and its start-up before the plasma (the plasma's bronze pieces need the analyser)
    expect(at('startAnalyser')).toBeLessThan(at('buyPlasma'));
    expect(at('buyAnalyser')).toBeLessThan(at('startAnalyser'));
    expect(at('buyInduction')).toBeLessThan(at('pourInduction'));
    expect(at('buyRotary')).toBeLessThan(at('pourRotary'));
  });

  it('text keys of the contract with words of at most 30 characters (the supply goals\' arguments aside)', () => {
    const keys = new Set<string>(Object.values(TEXT_KEYS).flat() as string[]);
    for (const d of LIST) {
      expect(keys.has(d.text), d.text).toBe(true);
      const w = strings[d.text];
      expect(typeof w, d.text).toBe('string');
      if (!w.includes('{')) expect(w.length, `${d.text}: ${w}`).toBeLessThanOrEqual(30);
    }
  });

  it('every goal to buy names what the stage sells; no goal names a dark plate or item (gate past the ladder)', () => {
    for (const d of LIST) {
      if (d.buy) expect(soldPlates.has(d.buy) || soldShop.has(d.buy), `${d.id} buys ${d.buy}`).toBe(true);
      const [kind, a] = d.done.split(':');
      if (kind === 'plate' || kind === 'commissioned' || (kind === 'poured' && !/^\d+$/.test(a))) expect(soldPlates.has(a), `${d.id}: ${d.done}`).toBe(true);
      if (kind === 'owned') expect(soldShop.has(a) || soldPlates.has(a), `${d.id}: ${d.done}`).toBe(true);
    }
  });
});

// ============================================================================ the walk through goals.ts

/** The one thing a goal names, done to a copy of the state. */
function witness(c: SalvageContent, g0: SalvageGame, d: Spec): SalvageGame {
  const g = structuredClone(g0) as SalvageGame;
  const s = g.salvage as Omit<SalvageGame['salvage'], 'works'> & { works: Record<string, unknown> };
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
      const f = (c.map as unknown as { works: { footprints: Record<string, { x: number; y: number }> } }).works.footprints[a];
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

/** goals.ts's own check, run to rest: the ids of the list it has ticked. */
function ticked(cfg: SalvageConfig, g0: SalvageGame): string[] {
  let g = g0;
  for (let k = 0; k < 50; k++) {
    const r = checkGoals(cfg, g);
    if (r.goals === g.salvage.goals) break;
    g = { ...g, salvage: { ...g.salvage, goals: r.goals } };
  }
  const ids = new Set(LIST.map((d) => d.id));
  return g.salvage.goals.done.filter((id) => ids.has(id));
}

describe.each(STAGE2_NAMES.map((n) => [n]))('the shipped list walks through goals.ts on %s', (n: Stage2Name) => {
  const base = stage2Cfg(n);
  const cfg = { ...base, salvage: { ...base.salvage, stage2: LIST } } as unknown as SalvageConfig;
  const g0 = stage2Game(n);

  it('every condition is goals.ts\'s grammar (met by its witness, not before)', () => {
    for (const d of LIST) {
      if (isRepeat(d)) continue;
      expect(conditionMet(cfg, g0, d.done), `${d.id} before`).toBe(false);
      expect(conditionMet(cfg, witness(cfg.salvage, g0, d), d.done), `${d.id} by its witness`).toBe(true);
    }
  });

  it('nothing is done by doing nothing; each goal is done once, in order, by the one thing it names; the list never stalls', () => {
    expect(ticked(cfg, g0)).toEqual([]);
    let g = g0;
    for (let k = 0; k < LIST.length; k++) {
      const d = LIST[k];
      const before = g;
      g = witness(cfg.salvage, g, d);
      const done = ticked(cfg, g);
      expect(done, `after ${d.id}`).toEqual(LIST.slice(0, isRepeat(d) ? k : k + 1).map((x) => x.id));
      g = { ...g, salvage: { ...g.salvage, goals: { ...g.salvage.goals, done: [...new Set([...g.salvage.goals.done, ...done])] } } };
      if (d.done.startsWith('at:')) g = { ...g, salvage: { ...g.salvage, presence: before.salvage.presence } };
    }
  });
});
