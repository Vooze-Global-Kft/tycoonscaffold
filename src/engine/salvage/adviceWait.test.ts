/**
 * s2-fix-small (R3, RULING2.md 21.5 and 24): WHEN NOTHING IS LEFT TO BUY, THE YARD SAYS WHAT IT IS WAITING FOR. From the
 * works' opening, when advice() is null (nothing pays back within tau_r), adviceLine gives adviceWait: the next rung's
 * tonnes still to supply ("Rung 4: 1,240 t to go"), or, when its range lacks a material, that material and who brings
 * most of it ("Rung 4 waits for Light iron" / "Hob's Farm Clearance brings it", or a plate that makes it). The rung goal
 * of the goal card carries the same (Goal.waits). The first yard (release.stage 1, works not opened) is as merged: pinned.
 * Rules tests on the frozen works content (fixtures/salvage2works.ts) and the shipped content read at stage 2 (shipped2).
 */
import { describe, expect, it } from 'vitest';
import { SalvageSchema } from '../../config/schema.salvage';
import gameJson from '../../../games/scrap-yard/game.json';
import { r3Works, worksCfg } from '../fixtures/salvage2works';
import { shipped2Config } from '../fixtures/shipped2';
import { advice, adviceLine, adviceWait } from './advice';
import { newBot, playTo, startGame } from './bot';
import { nextGoal } from './goals';
import { contentAt } from './layer';
import { materialsOf, rungGrams, rungsOf, thetaOf } from './ladder';
import type { SalvageConfig, SalvageGame } from './types';

const wcfg = worksCfg();
/** The same content with tau_r so short that no purchase pays back within it (advice() null: "nothing is left to buy"). */
const none = { ...wcfg, salvage: { ...wcfg.salvage, tau_h: [1e-9, 1e-9, 1e-9, 1e-9, 1e-9, 1e-9, 1e-9, 1e-9, 1e-9] } } as SalvageConfig;

/** r3Works with no cash (nothing within the line's budget: advice null) and the range of rung 4 short by exactly one material, `near` nearest. */
function shortOf(near: string, others = 0): SalvageGame {
  const g = structuredClone(r3Works());
  const c = contentAt(wcfg.salvage, g.salvage);
  const r4 = rungsOf(c).find((r) => r.n === 4)!;
  const th = thetaOf(c, 4);
  const mats = materialsOf(c).filter((m) => m !== near);
  const worth: Record<string, number> = {};
  mats.forEach((m, i) => (worth[m] = i < r4.range - 1 ? th : others));
  worth[near] = th - 1;
  g.salvage.ladder = { ...g.salvage.ladder, worth };
  return { ...g, cash: 0 };
}

describe('R3: adviceWait from the works\' opening', () => {
  it('nothing to buy, the range met: the tonnes still to supply for the next rung', () => {
    const g = structuredClone(r3Works());
    const c = contentAt(wcfg.salvage, g.salvage);
    const th = thetaOf(c, 4);
    g.salvage.ladder = { ...g.salvage.ladder, worth: Object.fromEntries(materialsOf(c).map((m) => [m, th])) };
    const h = { ...g, cash: 0 };
    expect(advice(none, h, 0)).toBeNull();
    const w = adviceLine(none, h, 0);
    expect(w && 'kind' in w ? w.kind : null).toBe('waiting');
    const want = rungGrams(c, 4) - h.salvage.ladder.supplied_g;
    expect(want).toBeGreaterThan(0);
    expect(w).toEqual({ kind: 'waiting', rung: 4, missing_g: want, material: null, grade: null, from: null, line: { key: 'advice.waitTonnes', args: { n: { n: 4 }, t: { tonnes_g: want } } }, source: null, open: null });
  });

  it('a state short of one material (light iron): the line names it and the open partner that brings most of it', () => {
    const g = shortOf('lightiron');
    expect(advice(none, g, 0)).toBeNull();
    const w = adviceLine(none, g, 0);
    if (!w || !('kind' in w)) throw new Error('expected a waiting line');
    expect(w.material).toBe('lightiron');
    expect(w.rung).toBe(4);
    const c = contentAt(wcfg.salvage, g.salvage);
    expect(c.grades[w.grade!].material).toBe('lightiron');
    expect(w.line).toEqual({ key: 'advice.waitGrade', args: { n: { n: 4 }, grade: { grade: w.grade! } } });
    expect(w.from && 'partner' in w.from).toBe(true);
    const pid = (w.from as { partner: string }).partner;
    expect(g.salvage.partners[pid].open).toBe(true);
    expect(w.source).toEqual({ key: 'advice.waitBrings', args: { partner: { name: pid } } });
    expect(w.open).toEqual({ kind: 'office', tab: 'partners' });
    // It brings the most light iron a second of filling of every open partner (each partner's skip, by its pieces' grades).
    const rate = (p: string) => {
      const d = c.partners[p];
      let gr = 0;
      for (const [o, n] of Object.entries(d.skip)) for (const [grade, pg, k] of c.objects[o]?.pieces ?? []) if (c.grades[grade]?.material === 'lightiron') gr += pg * k * n;
      return gr / d.fill_s;
    };
    for (const [p, ps] of Object.entries(g.salvage.partners)) if (ps.open && c.partners[p]) expect(rate(pid)).toBeGreaterThanOrEqual(rate(p));
  });

  it('a material no open partner brings: the plate of the works that makes it', () => {
    const c = contentAt(wcfg.salvage, r3Works().salvage);
    // A material only a plate's output gives (none of the open partners' skips holds it).
    const g0 = r3Works();
    const open = Object.entries(g0.salvage.partners).filter(([, p]) => p.open).map(([id]) => id);
    const inSkips = new Set(open.flatMap((p) => Object.keys(c.partners[p]?.skip ?? {}).flatMap((o) => (c.objects[o]?.pieces ?? []).map(([gr]) => c.grades[gr]?.material))));
    const plateOnly = materialsOf(c).find((m) => !inSkips.has(m) && Object.values(c.works!.plates).some((d) => JSON.stringify((d as { out?: unknown; recipes?: unknown }).out ?? {}).includes('"') && Object.entries(c.grades).some(([gid, gr]) => gr.material === m && JSON.stringify([(d as { out?: unknown }).out ?? {}, (d as { recipes?: unknown }).recipes ?? {}]).includes(`"${gid}"`))));
    expect(plateOnly).toBeDefined();
    const w = adviceWait(wcfg, shortOf(plateOnly!));
    expect(w?.material).toBe(plateOnly);
    expect(w?.from && 'plate' in w.from).toBe(true);
    const plate = (w!.from as { plate: string }).plate;
    expect(w!.source).toEqual({ key: 'advice.waitMakes', args: { plate: { text: `title.works.${plate}` } } });
    expect(w!.open).toEqual({ kind: 'works', plate });
  });

  it('a purchase that pays back is still the line (waiting only when advice is null)', () => {
    const g = { ...shortOf('lightiron'), cash: 1e7 };
    const a = advice(wcfg, g, 0);
    expect(a).not.toBeNull();
    expect(adviceLine(wcfg, g, 0)).toEqual(a);
    // adviceWait itself does not depend on cash: the rung goal's tile shows it either way.
    expect(adviceWait(wcfg, g)?.material).toBe('lightiron');
  });

  it('at the stage\'s top rung nothing is waited for', () => {
    const g = structuredClone(r3Works());
    const top = (contentAt(wcfg.salvage, g.salvage).ladder as { topRung?: number }).topRung ?? 3;
    g.salvage.ladder = { ...g.salvage.ladder, rung: top };
    expect(adviceWait(wcfg, { ...g, cash: 0 })).toBeNull();
  });
});

describe('R3: the rung goal carries what its rung waits for (Goal.waits)', () => {
  const cfg2 = shipped2Config(SalvageSchema.parse);
  it('shipped content at stage 2, works opened, every goal done but the rung-4 supply goal', () => {
    const g = startGame(cfg2, Date.UTC(2026, 10, 25, 9));
    const s = g.salvage;
    s.counts = { ...(s.counts ?? {}), bathSet: 0 };
    s.ladder = { ...s.ladder, rung: 3 };
    const specs = cfg2.salvage as unknown as { goals: { id: string; done: string }[]; dayOne: { id: string; done: string }[]; stage2: { id: string; done: string }[] };
    const all = [...specs.goals, ...specs.dayOne, ...specs.stage2];
    const r4 = specs.stage2.find((d) => d.done === 'rung:4');
    expect(r4).toBeDefined();
    s.goals = { ...s.goals, done: all.filter((d) => d.id !== r4!.id && !d.done.startsWith('rung:5')).map((d) => d.id) };
    const goal = nextGoal(cfg2, g);
    expect(goal?.id).toBe(r4!.id);
    expect(goal?.waits).toEqual(adviceWait(cfg2, g));
    expect(goal?.waits?.rung).toBe(4);
  });
});

describe('R3: the first yard (release.stage 1, the phone) is as merged', () => {
  const cfg1 = { mode: 'salvage', salvage: SalvageSchema.parse(gameJson.salvage), monetization: gameJson.monetization } as unknown as SalvageConfig;
  it('over 20 minutes of the normal hand: adviceLine is advice, adviceWait null, no goal carries waits', () => {
    expect(cfg1.salvage.release?.stage).toBe(1);
    const b = newBot(cfg1, startGame(cfg1, Date.UTC(2026, 10, 25, 9)), Date.UTC(2026, 10, 25, 9), { hand: 'normal', habit: 'goal', route: 'A', seed: 7 });
    let checks = 0;
    playTo(b, 20 * 60, (bb) => {
      const a = advice(cfg1, bb.g, bb.now);
      expect(adviceLine(cfg1, bb.g, bb.now)).toEqual(a);
      expect(adviceWait(cfg1, bb.g)).toBeNull();
      expect(nextGoal(cfg1, bb.g)?.waits).toBeUndefined();
      checks++;
    });
    expect(checks).toBeGreaterThan(15);
  }, 120_000);
});
