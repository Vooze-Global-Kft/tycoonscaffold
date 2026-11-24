/**
 * New things each term and the ONE Factors object (2.14, 2.9, 2.17 "before sizing, never after", D21;
 * spec 10.2 `twists`): each twist is one factor on one parameter; pairs and triples compose by the
 * stated rule (mix twists add, every other factor multiplies, also with minister factors); one new
 * thing per term to term 181 and the honest label after it; ministers arrive as applications at days
 * 9, 30 and 60 in fixed order, a refused one returns 30 papers later, only for a club the office has.
 * Frozen test content only (lesson 4).
 */
import { describe, expect, it } from 'vitest';
import * as R from '../decree';
import { built, decreeTestConfig, decreeTestContent } from '../fixtures/decree';

const cfg = decreeTestConfig();
const c = cfg.decree;
const t = c.twists;
const ids = t.list.map((x) => x.id);

describe('each twist is one factor on one parameter (2.14)', () => {
  it('a twist puts exactly its factors in the ONE object, and they reach the parameter they name', () => {
    for (const tw of t.list) {
      const f = R.twistIdsFactors(cfg, 2, [tw.id]);
      const mix = tw.factors.filter((x) => x.target === 'mix');
      const other = tw.factors.filter((x) => x.target !== 'mix');
      expect(f.list.map((e) => e.target)).toEqual(other.map((x) => x.target));
      expect(f.mixAdd.filter((x) => x !== 0).length).toBe(mix.length);
      const g = built({ office: 2, twists: [tw.id] }, cfg);
      const base = built({ office: 2 }, cfg);
      const p = R.decreeParams(cfg, g);
      const p0 = R.decreeParams(cfg, base);
      for (const x of tw.factors) {
        if (x.target === 'tau') expect(p.tau).toBeCloseTo(p0.tau * x.mul + x.add, 12);
        if (x.target === 'gossipMax') expect(p.gossipMax).toBe(Math.round(p0.gossipMax * x.mul + x.add));
        if (x.target === 'mix') {
          const gi = c.offices[2].clubs.indexOf(x.club!);
          p.mix.forEach((w, d) => {
            expect(w.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 12);
            expect(w[gi]).toBeCloseTo(Math.min(1, p0.mix[d][gi] + x.add), 12);
          });
        }
      }
      // Nothing else moves: the twist is a factor, not a new rule.
      if (!tw.factors.some((x) => ['tau', 'gossipMax', 'mix', 'sayNothing.cut'].includes(x.target))) {
        expect({ ...p, approval: 0 }).toEqual({ ...p0, approval: 0 });
      }
    }
  });

  it('pairs and triples compose: mix adds add, every other factor multiplies (and adds), with ministers too', () => {
    const all = [...t.pairs, ...t.triples];
    for (const combo of all) {
      const twIds = combo.map((i) => ids[i]);
      const f = R.twistIdsFactors(cfg, 2, twIds);
      for (const target of c.twists.list.flatMap((x) => x.factors.map((y) => y.target))) {
        if (target === 'mix') continue;
        const defs = twIds.flatMap((id) => t.list.find((x) => x.id === id)!.factors).filter((x) => x.target === target && x.club === null);
        const v = R.factorFor(f, target, null);
        expect(v.mul).toBeCloseTo(defs.reduce((m, x) => m * x.mul, 1), 12);
        expect(v.add).toBeCloseTo(defs.reduce((a, x) => a + x.add, 0), 12);
      }
      const adds = c.offices[2].clubs.map((club) => twIds.flatMap((id) => t.list.find((x) => x.id === id)!.factors).filter((x) => x.target === 'mix' && x.club === club).reduce((s, x) => s + x.add, 0));
      f.mixAdd.slice(0, adds.length).forEach((a, gi) => expect(a).toBeCloseTo(adds[gi], 12));
    }
    // With ministers: one object, twists first then ministers, initials kept for the strips.
    const g = built({ office: 2, twists: [ids[0], ids[1]], cabinet: ['pockle', 'tamp'] }, cfg);
    const f = R.deskFactors(cfg, g);
    expect(f.list.map((e) => e.source)).toEqual([...R.twistIdsFactors(cfg, 2, [ids[0], ids[1]]).list.map((e) => e.source), ...R.ministerFactors(cfg, g).list.map((e) => e.source)]);
    expect(R.ministerFactors(cfg, g).list.map((e) => e.initials)).toEqual(['pockle', 'tamp'].map((id) => c.ministers.find((m) => m.id === id)!.initials));
    expect(R.combineFactors(R.neutralFactors(), f)).toEqual({ ...f, mixAdd: f.mixAdd.map((x) => x + 0) });
  });

  it('the validator: every effective base |Δ| within the bound for every term to 181 with every minister; a twist past it is caught', () => {
    expect(R.compositionProblems(cfg)).toEqual([]);
    const bad = { ...cfg, decree: decreeTestContent({ twists: { ...c.twists, list: c.twists.list.map((x, i) => (i === 0 ? { ...x, factors: [{ target: 'ribbon.mood', club: null, mul: 5, add: 0 }] } : x)) } as never }) };
    expect(R.compositionProblems(bad).some((p) => p.includes('ribbon'))).toBe(true);
  });
});

describe('one new thing per term (2.14)', () => {
  it('every presidential term from 2 to 181 opens one new thing; from 182 "A Quiet Term", honestly labelled', () => {
    const seen = new Set<string>();
    for (let term = 2; term <= R.COMPOSITION_TERMS; term++) {
      const n = R.newThingAt(cfg, 2, term);
      const label = R.newThingLabel(n);
      expect(label, `term ${term}`).not.toBeNull();
      expect(n.quiet).toBe(false);
      expect(seen.has(label!), `term ${term} repeats ${label}`).toBe(false);
      seen.add(label!);
    }
    expect(R.newThingAt(cfg, 2, t.quietFrom)).toMatchObject({ quiet: true, twists: [] });
    expect(R.newThingLabel(R.newThingAt(cfg, 2, t.quietFrom + 50))).toBe(R.QUIET_TERM);
    for (const gp of c.grandProjects) expect(R.newThingAt(cfg, 2, gp.atTerm).grandProject).toBe(gp.id);
    t.singleTerms.forEach((term, i) => expect(R.newThingAt(cfg, 2, term).twists).toEqual([t.presidentSingles[i]]));
    expect(R.newThingAt(cfg, 2, t.pairsFrom).twists).toHaveLength(2);
    expect(R.newThingAt(cfg, 2, t.triplesFrom).twists).toHaveLength(3);
  });

  it("the mayor's and the governor's lists, then repeating; term 1 opens nothing", () => {
    for (const office of [0, 1, 2] as const) expect(R.newThingLabel(R.newThingAt(cfg, office, 1))).toBeNull();
    t.mayor.forEach((id, i) => expect(R.newThingAt(cfg, 0, i + 2).twists).toEqual([id]));
    expect(R.newThingAt(cfg, 0, t.mayor.length + 2).twists).toEqual([t.mayor[0]]);
    t.governor.forEach((id, i) => expect(R.newThingAt(cfg, 1, i + 2).twists).toEqual([id]));
  });

  it('a new term runs its twist for that term, and a Grand Project opens to buy', () => {
    const g = built({ office: 2, term: c.grandProjects[0].atTerm - 1, phase: 'result' }, cfg);
    const x = R.chooseAfterResult(cfg, g, 'stay', 0, []);
    expect(x.decree.ministries.length).toBe(g.decree.ministries.length + 1);
    expect(x.decree.ministries.at(-1)).toEqual({ open: false, level: 0 });
    const term = t.singleTerms[0];
    const y = R.chooseAfterResult(cfg, built({ office: 2, term: term - 1, phase: 'result' }, cfg), 'stay', 0, []);
    expect(y.decree.twists).toEqual([t.presidentSingles[0]]);
  });
});

describe('ministers (2.9, D21)', () => {
  const app = (g: R.DecreeGame) => R.nextApplication(cfg, g);
  const order = c.ministers.map((m) => m.id);

  it('the next undelivered minister at days 9, 30 and 60, in fixed order, one per slot', () => {
    const days = c.forms.application.days;
    expect(app(built({ day: days[0] - 1 }, cfg))).toBeNull();
    const first = order.find((id) => c.offices[0].clubs.includes(c.ministers.find((m) => m.id === id)!.club))!;
    expect(app(built({ day: days[0] }, cfg))).toBe(first);
    // Slot 1 used: nothing more until day 30.
    const used = built({ day: days[1] - 1 }, cfg);
    const g1 = { ...used, decree: { ...used.decree, appSlotsUsed: 1, applicationsDelivered: [first] } };
    expect(app(g1)).toBeNull();
    const g2 = { ...g1, decree: { ...g1.decree, day: days[1] } };
    expect(app(g2)).toBe(order.filter((id) => id !== first).find((id) => c.offices[0].clubs.includes(c.ministers.find((m) => m.id === id)!.club)));
  });

  it('sign appoints; refuse sends away, and the same application returns 30 decided papers later', () => {
    const g = built({ day: 9, decisions: 100 }, cfg);
    const m = app(g)!;
    const ev: R.DecreeEvent[] = [];
    const a = R.appoint(cfg, g, m, ev);
    expect(a.decree.cabinet[m]).toEqual({ club: c.ministers.find((x) => x.id === m)!.club, termsServed: 0 });
    expect(ev).toContainEqual({ type: 'appointed', minister: m });
    expect(R.appoint(cfg, a, m, [])).toBe(a);
    const s = R.sendAway(cfg, g, m);
    const due = g.decree.stats.decisions + 1 + c.forms.application.returnAfter;
    expect(s.decree.applicationReturns).toEqual([{ minister: m, dueAt: due }]);
    const before = { ...s, decree: { ...s.decree, stats: { ...s.decree.stats, decisions: due - 1 } } };
    expect(app(before)).not.toBe(m);
    const at = { ...s, decree: { ...s.decree, stats: { ...s.decree.stats, decisions: due } } };
    expect(app(at)).toBe(m);
  });

  it('D21: a minister whose club the office lacks waits for the office that has it', () => {
    const presOnly = c.ministers.find((m) => !c.offices[0].clubs.includes(m.club))!;
    const delivered = c.ministers.filter((m) => m.id !== presOnly.id).map((m) => m.id);
    const g = built({ day: 60 }, cfg);
    const mayor = { ...g, decree: { ...g.decree, applicationsDelivered: delivered } };
    expect(app(mayor)).toBeNull();
    const p = built({ office: 2, day: 60 }, cfg);
    const pres = { ...p, decree: { ...p.decree, applicationsDelivered: delivered } };
    expect(app(pres)).toBe(presOnly.id);
  });

  it("a minister's rule touches only their club's papers, printed with their initials", () => {
    const g = built({ cabinet: ['pockle'] }, cfg);
    const def = c.ministers.find((m) => m.id === 'pockle')!;
    const f = R.deskFactors(cfg, g);
    const club = def.rule.club ? c.offices[0].clubs.indexOf(def.rule.club) : null;
    expect(R.factorFor(f, def.rule.target, club)).toMatchObject({ mul: def.rule.mul, add: def.rule.add, sources: [{ initials: def.initials, source: 'pockle' }] });
    if (club !== null) expect(R.factorFor(f, def.rule.target, (club + 1) % 3).mul).toBe(1);
  });
});
