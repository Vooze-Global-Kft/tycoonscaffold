/// <reference types="node" />
/**
 * The decree engine mode (src/engine/decreeMode.ts; spec 10.2 `decreeMode`: create, reconcile,
 * `decree1`, invalid block, `offlineAdMultiplier` 1.5, `roundPayout`, the two seams, `entitle`), the
 * schema's defaults against RANGES, and the skeleton's fixtures. Only the tests that hold on the
 * skeleton's bodies; the rules packages add theirs beside them (fixtures only, lesson 4).
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { GameConfigSchema, type GameConfig } from '../config/schema';
import { DecreeSchema, RANGES, archetypeRanges, combinations, lintDecree, type DecreeContentInput } from '../config/schema.decree';
import * as R from './decree';
import { decreeEngineMode, withDecreeContent } from './decreeMode';
import { DECREE_TEST_NUMBERS, FIXTURE_NOW, baseGameState, decreeFixtures, decreeStateProblems, decreeTestConfig, decreeTestContent, freshState } from './fixtures/decree';

const cfg = decreeTestConfig();
const M = decreeEngineMode;

/** A value at a RANGES path ("offices[1].stand.nr"). */
function at(obj: unknown, p: string): unknown {
  return p.split('.').flatMap((part) => part.split(/\[(\d+)\]/).filter(Boolean)).reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], obj);
}

const stateProblems = decreeStateProblems;

describe('the decree engine mode', () => {
  it('is mode "decree" with its own save key and the two seams of 2.15', () => {
    expect(M.id).toBe('decree');
    expect(M.saveTag, 'save:high-office:decree1').toBe('decree1');
    expect(M.paysOnCompute).toBe(true);
    expect(M.catchUpSeconds).toBe(0);
    expect(M.offlineAdMultiplier!(cfg as GameConfig)).toBe(1.5);
  });

  it('config parses the opaque block with its defaults and throws on an invalid one', () => {
    const raw = { ...(cfg as GameConfig), decree: { deck: {} } } as GameConfig;
    const parsed = withDecreeContent(raw) as R.DecreeConfig;
    expect(parsed.decree.offices.map((o) => o.id)).toEqual(['mayor', 'governor', 'president']);
    expect(() => withDecreeContent({ ...raw, decree: { offices: 'three' } } as unknown as GameConfig)).toThrow(/invalid/);
    expect(() => withDecreeContent({ ...raw, decree: undefined } as GameConfig)).toThrow(/no "decree" block/);
    const sim = { mode: 'sim' } as GameConfig;
    expect(withDecreeContent(sim)).toBe(sim);
  });

  it('create: a fresh state by 2.3 with scripted paper 1 on the desk', () => {
    const g = M.create(cfg, baseGameState(FIXTURE_NOW)) as R.DecreeGame;
    expect(stateProblems(cfg, g)).toEqual([]);
    expect(g.cash).toBe(30);
    expect(g.decree.office).toBe(0);
    expect(g.decree.phase).toBe('governing');
    expect(g.decree.moods).toEqual([50, 50, 50]);
    expect(g.decree.ministries.map((m) => m.level)).toEqual([1, 0, 0, 0]);
    const desk = g.decree.desk;
    expect(desk?.type).toBe('paper');
    if (desk?.type !== 'paper') return;
    expect(desk.paper.source).toBe('may-practise');
    // 7.5 paper 1: SIGN No change · ↩; STUDY every club +1 (f = 1 at mood 50).
    expect(desk.shown.sign).toEqual([]);
    expect(desk.paper.sign.followUp?.chainId).toBe('test-form-about-forms');
    expect(desk.shown.refuse).toEqual([{ type: 'moods', every: true, deltas: [1, 1, 1] }]);
    expect(R.stripOf(cfg, g, 'refuse')?.approval).toEqual({ from: 50, to: 51 });
    expect(g.decree.nextArrivalAt).toBe(12);
  });

  it('reconcile never throws and keeps a save of the decree shape', () => {
    const base = baseGameState(FIXTURE_NOW);
    const saved = freshState(cfg, 7);
    const back = M.reconcile(cfg, base, JSON.parse(JSON.stringify(saved))) as R.DecreeGame;
    expect(back.decree).toEqual(saved.decree);
    for (const junk of [null, 42, 'x', {}, { decree: null }, { decree: { seed: 'no' } }, { decree: { seed: 1, office: 9 } }]) {
      const g = M.reconcile(cfg, base, junk) as R.DecreeGame;
      expect(stateProblems(cfg, g)).toEqual([]);
    }
  });

  it('tick adds dibs at I and advances the play clock, exactly split (2.5)', () => {
    const g = freshState(cfg);
    const I = R.decreeParams(cfg, g).I;
    expect(I).toBe(1); // Town Clock level 1 at scale 1, approval 50 (M = 1), NR 0, no monument.
    const t = M.tick(cfg, g, 10, FIXTURE_NOW) as R.DecreeGame;
    expect(t.cash).toBe(30 + 10 * I);
    expect(t.stats.playSeconds).toBe(10);
    const split = M.tick(cfg, M.tick(cfg, g, 4, FIXTURE_NOW), 6, FIXTURE_NOW) as R.DecreeGame;
    expect(split.cash).toBe(t.cash);
    expect(M.activeIncome(cfg, g, FIXTURE_NOW)).toBe(I);
    expect(M.income(cfg, g, FIXTURE_NOW)).toBeCloseTo(cfg.decree.away.rate * I, 12);
  });

  it('offline is the closed form of 2.15 (paid on compute, a report); entitle changes nothing now; roundPayout is roundDibs', () => {
    const g = freshState(cfg);
    const off = M.offline(cfg, g, FIXTURE_NOW + 3_600_000);
    expect(off.seconds).toBe(3600);
    expect(off.earnings).toBe(R.roundDibs(cfg, cfg.decree.away.rate * R.decreeParams(cfg, g).I * 3600));
    expect(off.report).toMatchObject({ seconds: 3600, earnings: off.earnings, capped: false });
    expect(M.offline(cfg, g, FIXTURE_NOW - 5).earnings).toBe(0);
    expect(M.mergeReport!(off.report, off.report)).toMatchObject({ seconds: 7200, earnings: 2 * off.earnings });
    expect(M.offlineAdMultiplier!(cfg)).toBe(1.5);
    expect(M.entitle!(cfg, g, 'office_long_lunch')).toBe(g);
    expect(M.roundPayout!(cfg, 1234.4)).toBe(1230);
    expect(M.roundPayout!(cfg, 999.5)).toBe(1000);
    expect(M.roundPayout!(cfg, 12.5)).toBe(13);
  });

  it('prestige is refused (the same object) unless canPrestige: the result sheet after a win with both requirements', () => {
    const g = freshState(cfg);
    expect(M.canPrestige!(cfg, g)).toBe(false);
    expect(M.prestige(cfg, g, FIXTURE_NOW)).toBe(g);
  });

  it("reconcile keeps the term's own fields of a save (the result sheet, the application slots) and repairs broken ones", () => {
    const base = baseGameState(FIXTURE_NOW);
    const g = freshState(cfg, 3);
    const result = { won: true, nrGained: 7, meritHeld: 4, meritSweep: false, carried: [2], resigned: null };
    const onSheet = { ...g, decree: { ...g.decree, phase: 'result' as const, count: { districts: [], order: [], held: 4, majority: 3, won: true, sweep: false, rival: 'x' }, result, appSlotsUsed: 2 } };
    const back = M.reconcile(cfg, base, JSON.parse(JSON.stringify(onSheet))) as R.DecreeGame;
    expect(back.decree.result).toEqual(result);
    expect(back.decree.appSlotsUsed).toBe(2);
    for (const junk of [{ result: 'x', appSlotsUsed: 'y' }, { result: { won: 'yes' }, appSlotsUsed: -4 }, { result: null, appSlotsUsed: 1e9 }, { appSlotsUsed: Number.NaN }]) {
      const raw = JSON.parse(JSON.stringify({ ...onSheet, decree: { ...onSheet.decree, ...junk } }));
      const r = M.reconcile(cfg, base, raw) as R.DecreeGame;
      expect(stateProblems(cfg, r)).toEqual([]);
      expect(r.decree.result === undefined || r.decree.result === null || typeof r.decree.result.won === 'boolean').toBe(true);
      expect(r.decree.appSlotsUsed === undefined || (r.decree.appSlotsUsed >= 0 && r.decree.appSlotsUsed <= cfg.decree.forms.application.days.length)).toBe(true);
    }
    // A result outside the count and the result sheet is not kept.
    const stale = M.reconcile(cfg, base, JSON.parse(JSON.stringify({ ...onSheet, decree: { ...onSheet.decree, phase: 'governing' } }))) as R.DecreeGame;
    expect(stale.decree.result ?? null).toBeNull();
    // Every fixture state survives a save and a load unchanged (but the tick's anchor, which is rebuilt).
    for (const s of Object.values(decreeFixtures(cfg))) {
      const r = M.reconcile(cfg, base, JSON.parse(JSON.stringify(s))) as R.DecreeGame;
      expect({ ...r.decree, cashAnchor: null }).toEqual({ ...JSON.parse(JSON.stringify(s.decree)), cashAnchor: null });
    }
  });
});

describe('the decree block: defaults, ranges and the shipped placeholder', () => {
  it('the defaults lint clean and every (tune) default sits inside its range', () => {
    const d = DecreeSchema.parse({});
    expect(lintDecree(d)).toEqual([]);
    for (const r of [...RANGES, ...archetypeRanges()]) {
      const val = at(d, r.path);
      expect(typeof val, r.path).toBe('number');
      expect(val as number, r.path).toBeGreaterThanOrEqual(r.low - 1e-9);
      expect(val as number, r.path).toBeLessThanOrEqual(r.high + 1e-9);
    }
  });

  it('the offices table of 2.2 and the rule of 2.11', () => {
    const d = DecreeSchema.parse({});
    expect(d.offices.map((o) => [o.clubs.length, o.districts.length, o.majority, o.ministries.length])).toEqual([
      [3, 5, 3],
      [5, 7, 4],
      [7, 9, 5],
    ].map(([c, n, m], i) => [c, n, m, [4, 6, 8][i]]));
    // 2.11 with D15: Y(n) = 2^(n+1) − 2; after 5 consecutive losses every district is held at any pull up to 12.
    expect([0, 1, 2, 3, 4, 5, 6].map((n) => R.disarray(n, d.paperRules.disarray))).toEqual([0, 2, 6, 14, 30, 62, 126]);
    // With D25 the worst share is Y(n) − R + u(0) (u(0) = −60): a certain win after maxLossesBound (6) losses at any pull up to 12.
    for (const o of d.offices) expect(R.disarray(d.ladder.maxLossesBound, d.paperRules.disarray) - o.rivalPull + R.moodUtility(d.count, 0)).toBeGreaterThanOrEqual(50);
    expect(R.disarray(6, d.paperRules.disarray) - 12 + R.moodUtility(d.count, 0)).toBeGreaterThanOrEqual(50);
    for (const o of [0, 1, 2]) expect(R.certainWinBound(d, o)).toBeLessThanOrEqual(d.ladder.maxLossesBound);
    expect(d.offices.map((o) => o.rivalPull), 'D15: the pull starts at 3 / 4 / 5').toEqual([3, 4, 5]);
    expect(d.twists.pairs).toHaveLength(45);
    expect(d.twists.triples).toHaveLength(120);
    expect(combinations(4, 2)).toEqual([[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]]);
    // D11: five products.
    expect(Object.values(d.products).sort()).toEqual(['office_long_lunch', 'office_portrait_frames', 'office_private_secretary', 'office_standing_order', 'office_walnut_desk']);
  });

  it('the shipped game.json (high-office) parses, lints clean and is mode decree', () => {
    const file = path.join(__dirname, '..', '..', 'games', 'high-office', 'game.json');
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    const shared = GameConfigSchema.parse(raw);
    expect(shared.mode).toBe('decree');
    const parsed = withDecreeContent(shared) as R.DecreeConfig;
    expect(lintDecree(parsed.decree)).toEqual([]);
    const g = M.create(parsed, baseGameState(FIXTURE_NOW)) as R.DecreeGame;
    expect(stateProblems(parsed, g)).toEqual([]);
  });
});

describe('the fixtures (frozen test content)', () => {
  it('every (club, archetype) cell of every office holds at least three comic papers', () => {
    for (const o of cfg.decree.offices) {
      for (const club of o.clubs) {
        for (const a of ['project', 'swap', 'fee', 'treat', 'committee', 'vanity', 'basket']) {
          const n = cfg.decree.deck.papers.filter((p) => p.office === o.id && p.club === club && p.archetype === a).length;
          expect(n, `${o.id} ${club} ${a}`).toBeGreaterThanOrEqual(3);
        }
      }
    }
    expect(lintDecree(cfg.decree)).toEqual([]);
  });

  it('the numbers are the frozen test numbers (decree.numbers.json), not the schema defaults (lesson 4)', () => {
    const fromNumbers = DecreeSchema.parse(JSON.parse(JSON.stringify({ ...DECREE_TEST_NUMBERS, deck: {} })));
    const { deck: _d, ...numbers } = cfg.decree;
    const { deck: _e, ...frozen } = fromNumbers;
    expect(numbers).toEqual(frozen);
    // Every key of the frozen file is a field of the block (a renamed field fails here, not silently).
    const fields = Object.keys(DecreeSchema.shape);
    for (const k of Object.keys(DECREE_TEST_NUMBERS)) expect(fields, k).toContain(k);
  });

  it('the hand-made states are valid', () => {
    const f = decreeFixtures(cfg);
    for (const [name, g] of Object.entries(f)) expect(stateProblems(cfg, g), name).toEqual([]);
    expect(f.mayorMidTerm.decree.desk?.type).toBe('paper');
    expect(f.governorAtCall.decree.office).toBe(1);
    expect(f.governorAtCall.decree.strikes[2]).not.toBeNull();
    expect(R.decreeParams(cfg, f.governorAtCall).served[3], 'the Glasshouse Office (Vegetables) earns nothing while they boycott').toBe(0);
    expect(f.presidentTerm3.decree.term).toBe(3);
    expect(f.presidentTerm3.decree.office).toBe(2);
    // The run-up as 2.17 has it: the first campaign paper on the desk at once, the next τ later.
    const run = f.governorAtCall;
    expect(run.decree.desk?.type === 'paper' && run.decree.desk.paper.kind).toBe('campaign');
    expect(run.decree.desk?.type === 'paper' && run.decree.desk.paper.district).toBe(3);
    expect(run.decree.campaign?.papersLeft).toBe(3);
    expect(R.nextVisitorIn(cfg, run)).toBe(cfg.decree.offices[1].tau);
  });
});

describe('the seam fixes before the rules packages start', () => {
  /** A hand-made paper with the given sign effects (base, as fixed at the draw). */
  const paperWith = (g: R.DecreeGame, sign: R.Effect[]): R.Paper => ({ id: 'test:1', kind: 'strike', source: 'griev-scissors', office: g.decree.office, visitor: { face: 'face:test', name: 'Test', role: 'Test', club: null, clubIx: null }, cosigner: null, text: 'Test', returning: null, archetype: null, petitioner: null, other: null, tags: null, sign: { effects: sign, followUp: null, label: null }, refuse: { effects: [], followUp: null, label: null }, clipping: null, ministry: null, drawnLevel: null, district: null, note: null, jitter: 1 });

  it("a settlement's fixed +10 lands unsized (2.8, the lemma of 2.7: 18 → 28, not 18 → 32)", () => {
    const g0 = freshState(cfg);
    const g = { ...g0, decree: { ...g0.decree, moods: [50, 50, 18] } };
    const landed = R.landPaper(cfg, g, paperWith(g, [{ type: 'mood', club: 2, delta: 10, fixed: true }]), 0);
    expect(landed.decree.desk?.type === 'paper' && landed.decree.desk.shown.sign).toEqual([{ type: 'moods', every: false, deltas: [0, 0, 10] }]);
    const sized = R.landPaper(cfg, g, paperWith(g, [{ type: 'mood', club: 2, delta: 10 }]), 0);
    expect(sized.decree.desk?.type === 'paper' && sized.decree.desk.shown.sign, 'the same Δ unfixed is sized by f+ = 1.4').toEqual([{ type: 'moods', every: false, deltas: [0, 0, 14] }]);
  });

  it('money is sized when the paper lands (D23), from B at landing and the jitter of the draw', () => {
    const g = freshState(cfg);
    const B = R.decreeParams(cfg, g).B;
    const landed = R.landPaper(cfg, g, { ...paperWith(g, [{ type: 'money', seconds: -45 }]), jitter: 1.1 }, 0);
    const shown = landed.decree.desk?.type === 'paper' ? landed.decree.desk.shown : null;
    expect(shown?.sign).toEqual([{ type: 'money', amount: -Math.max(cfg.decree.money.minimum, R.roundDibs(cfg, 45 * B * 1.1)) }]);
    expect(shown?.BAt).toBe(B);
  });

  it("the favour's club is its own (the club that pays), as both content formats say; no `other` needed", () => {
    const fav = cfg.decree.archetypes.find((a) => a.id === 'favour')!;
    const effects = R.resolveEffects(cfg, 0, fav.sign, { petitioner: 1, other: null });
    expect(effects).toEqual([{ type: 'mood', club: 1, delta: -3 }, { type: 'gossip', delta: 1 }]);
    const study = cfg.decree.archetypes.find((a) => a.id === 'biggerStudy')!;
    expect(study.share).toBe(0);
    expect(study.sign[0]).toEqual({ type: 'money', tier: 'M', sign: -1 });
  });

  it('lintDecree: an archetype that names the other club needs `other`; D20: every Committee its bigger study, every Basket its favour', () => {
    const deckOf = (papers: unknown[]) => DecreeSchema.parse({ ...DECREE_TEST_NUMBERS, deck: { papers } } as DecreeContentInput);
    const base = { office: 'mayor', visitor: { face: 'face:test', name: 'T', role: 'T', club: 'bus' }, club: 'bus', text: 'Test', subject: 'paperwork', butt: 'office', shape: 'undercut' };
    expect(lintDecree(deckOf([{ ...base, id: 'a', archetype: 'swap' }])).join(' ')).toMatch(/no `other`/);
    expect(lintDecree(deckOf([{ ...base, id: 'b', archetype: 'committee', other: 'shops' }])).join(' ')).toMatch(/no biggerStudy/);
    expect(lintDecree(deckOf([{ ...base, id: 'c', archetype: 'basket' }])).join(' ')).toMatch(/no favour/);
    expect(lintDecree(deckOf([{ ...base, id: 'd', archetype: 'basket', favour: { text: 'Test', clippings: { sign: 'A', refuse: 'B' } } }]))).toEqual([]);
  });

  it('Ribbon Shortage carries both of its factors (2.14: cost AND please ×2); "Say nothing" factors act on the cut', () => {
    const t = cfg.decree.twists.list.find((x) => x.id === 'ribbon_shortage')!;
    expect(t.factors.map((f) => [f.target, f.mul])).toEqual([['ribbon.money', 2], ['ribbon.mood', 2]]);
    expect(cfg.decree.twists.list.find((x) => x.id === 'gentle_week')!.factors[0].target).toBe('sayNothing.cut');
  });

  it('M(A) is ×1.0 at 50 whatever the slope (2.4)', () => {
    for (const slope of [0.8, 1.2, 1.4]) {
      const c = decreeTestConfig({ approval: { slope } });
      expect(R.decreeParams(c, freshState(c)).multiplier).toBeCloseTo(1, 12);
    }
    expect(decreeTestContent().approval).toEqual({ slope: 1.2 });
  });

  it('no ad and no product from the call to the end of election night (2.10, 5.11)', () => {
    const f = decreeFixtures(cfg);
    expect(R.canShop(cfg, f.fresh)).toBe(true);
    expect(R.canWatchAd(cfg, f.fresh, 'awayBonus')).toBe(true);
    expect(R.canShop(cfg, f.governorAtCall)).toBe(false);
    expect(R.canWatchAd(cfg, f.governorAtCall, 'awayBonus')).toBe(false);
  });
});
