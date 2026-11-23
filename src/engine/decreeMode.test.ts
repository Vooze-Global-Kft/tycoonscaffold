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
import { DecreeSchema, RANGES, archetypeRanges, combinations, lintDecree } from '../config/schema.decree';
import * as R from './decree';
import { decreeEngineMode, withDecreeContent } from './decreeMode';
import { FIXTURE_NOW, baseGameState, decreeFixtures, decreeTestConfig, freshState } from './fixtures/decree';

const cfg = decreeTestConfig();
const M = decreeEngineMode;

/** A value at a RANGES path ("offices[1].stand.nr"). */
function at(obj: unknown, p: string): unknown {
  return p.split('.').flatMap((part) => part.split(/\[(\d+)\]/).filter(Boolean)).reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], obj);
}

/** The invariants every state the skeleton makes keeps (2.3). */
function stateProblems(c: R.DecreeConfig, g: R.DecreeGame): string[] {
  const d = g.decree;
  const row = c.decree.offices[d.office];
  const n = row.clubs.length;
  const out: string[] = [];
  if (d.moods.length !== n || d.strikes.length !== n || d.armed.length !== n) out.push('moods, strikes and armed have one entry per club');
  if (d.moods.some((m) => !Number.isInteger(m) || m < 0 || m > 100)) out.push('moods are integers 0 to 100');
  if (d.ministries.length < row.ministries.length) out.push('one ministry entry per ministry of the office');
  if (!d.ministries[0].open || d.ministries[0].level < 1) out.push('ministry 0 is always open (income is never zero)');
  if (d.ministries.some((m) => m.level < 0 || m.level > c.decree.ministry.levelCap || (!m.open && m.level !== 0))) out.push('levels 0 to the cap, 0 when closed');
  if (d.gossip < 0) out.push('gossip ≥ 0');
  if (d.strikes.some((s, gi) => s && d.armed[gi])) out.push('a boycotting club is not armed');
  if (d.phase === 'campaign' && !d.campaign) out.push('a run-up has campaign points');
  if (d.campaign && d.campaign.C.length !== row.districts.length) out.push('campaign points per district');
  if (g.cash < 0) out.push('cash ≥ 0');
  if (d.stats.clamps !== 0) out.push('clamps = 0 (H1)');
  return out;
}

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

  it('offline returns zero on the skeleton; entitle changes nothing now; roundPayout is roundDibs', () => {
    const g = freshState(cfg);
    const off = M.offline(cfg, g, FIXTURE_NOW + 3_600_000);
    expect(off.seconds).toBe(0);
    expect(off.earnings).toBe(0);
    expect(M.entitle!(cfg, g, 'office_long_lunch')).toBe(g);
    expect(M.roundPayout!(cfg, 1234.4)).toBe(1230);
    expect(M.roundPayout!(cfg, 999.5)).toBe(1000);
    expect(M.roundPayout!(cfg, 12.5)).toBe(13);
  });

  it('prestige is refused while its rules are not built (the store asks canPrestige first)', () => {
    const g = freshState(cfg);
    expect(() => M.canPrestige!(cfg, g)).toThrow(R.NotBuiltError);
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
    for (const o of d.offices) expect(Math.ceil((50 + o.rivalPull) / d.ladder.disarray)).toBeLessThanOrEqual(8);
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

  it('the hand-made states are valid', () => {
    const f = decreeFixtures(cfg);
    for (const [name, g] of Object.entries(f)) expect(stateProblems(cfg, g), name).toEqual([]);
    expect(f.mayorMidTerm.decree.desk?.type).toBe('paper');
    expect(f.governorAtCall.decree.office).toBe(1);
    expect(f.governorAtCall.decree.strikes[2]).not.toBeNull();
    expect(R.decreeParams(cfg, f.governorAtCall).served[3], 'the Glasshouse Office (Vegetables) earns nothing while they boycott').toBe(0);
    expect(f.presidentTerm3.decree.term).toBe(3);
    expect(f.presidentTerm3.decree.office).toBe(2);
  });
});
