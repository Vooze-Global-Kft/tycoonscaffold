/**
 * The ladder of stage 2 (yard-stage2.md 2.11; 8.1's row 2.11): the top rung as content, θ per rung from rung 4
 * (rungs 1 to 3 at `ladder.theta`), ceilings and away caps to rung 5, the level cap 60 × τ_r from rung 4, the
 * plates' level price, rivals to the one passed at rung 5. Frozen test content (fixtures/salvage.ts) with the
 * stage's lists given ROUND values here, checkable by hand; no tuned number pinned. Owner: rules-money.
 */
import { describe, expect, it } from 'vitest';
import { GameConfigSchema } from '../../config/schema';
import { SalvageSchema, type SalvageContent } from '../../config/schema.salvage';
import gameJson from '../../../games/scrap-yard/game.json';
import * as E from '../economy';
import { FIXTURE_NOW, SALVAGE_TEST_RAW, fixtureGame } from '../fixtures/salvage';
import { moneyCfg, r3open } from '../fixtures/salvage2money';
import { awayCapH, runLongerOf } from './away';
import { ceilingFor, levelCapMin, levelCheck, levelPrice, levelTau, materialsOf, plateLevelPrice, rangeChips, rangeCount, rungProgress, rungReached, rungSign, rungTiles, thetaOf, topRungOf } from './ladder';
import { passedCount, rivalGrams, shownTonnes } from './rivals';
import type { SalvageConfig, SalvageGame } from './types';

const base = SalvageSchema.parse(SALVAGE_TEST_RAW);
const M = materialsOf(base).length;
/** The test content with stage 2's ladder: rungs 4 (100 t, all materials but one) and 5 (1,000 t, all), θ share 0.01 (§1,200 a tonne): θ_4 §1,200, θ_5 §12,000. */
const C2: SalvageContent = SalvageSchema.parse({
  ...SALVAGE_TEST_RAW,
  ladder: {
    ...base.ladder,
    topRung: 5,
    thetaShare: 0.01,
    rungs: [
      { n: 1, t: 0, range: 0 },
      { n: 2, t: base.ladder.rung2.t, range: base.ladder.rung2.range },
      { n: 3, t: base.ladder.rung3.t, range: base.ladder.rung3.range },
      { n: 4, t: 100, range: M - 1 },
      { n: 5, t: 1000, range: M },
      { n: 6, t: 5000, range: M + 1 },
    ],
  },
  ceilings_t_h: [6, 20, 160, 800, 3500],
  tau_h: [null, null, 9, 22, 45],
  awayCapByRung_h: [0.5, 2, 4, 6, 8],
  nightWatch_h: 2,
});
const cfg2 = { mode: 'salvage', salvage: C2 } as unknown as SalvageConfig;
const cfg1 = { mode: 'salvage', salvage: base } as unknown as SalvageConfig;
const start = () => fixtureGame('fresh', E.createInitialState(GameConfigSchema.parse(gameJson), FIXTURE_NOW), FIXTURE_NOW) as SalvageGame;
const at = (g: SalvageGame, supplied_t: number, worthEach: number, rung = 1): SalvageGame => ({
  ...g,
  salvage: { ...g.salvage, ladder: { ...g.salvage.ladder, rung, supplied_g: supplied_t * 1e6, worth: Object.fromEntries(materialsOf(C2).map((m) => [m, worthEach])) } },
});

describe('2.11 the top rung, θ per rung, the range', () => {
  it('the top rung is content (ladder.topRung), else the first yard\'s 3', () => {
    expect(topRungOf(base)).toBe(3);
    expect(topRungOf(C2)).toBe(5);
  });
  it('θ_r: ladder.theta for rungs 1 to 3; from rung 4 max(theta, thetaShare × T_r × §1,200)', () => {
    for (const r of [1, 2, 3]) expect(thetaOf(C2, r)).toBe(base.ladder.theta);
    expect(thetaOf(C2, 4)).toBe(1200);
    expect(thetaOf(C2, 5)).toBe(12000);
    expect(thetaOf(base, 5)).toBe(base.ladder.theta); // no thetaShare: as built
    const tiny = { ...C2, ladder: { ...C2.ladder, thetaShare: 0.000001 } } as SalvageContent;
    expect(thetaOf(tiny, 4)).toBe(base.ladder.theta); // never below theta
  });
  it('rungs 4 and 5 by tonnes and their own range: §1,300 a material reaches rung 4 not 5; §13,000 reaches 5; nothing past the top', () => {
    const g = start();
    expect(rungReached(cfg2, at(g, 1e6, base.ladder.theta + 1))).toBe(3); // θ_1..3 met, θ_4 not
    expect(rungReached(cfg2, at(g, 1e6, 1300))).toBe(4);
    expect(rungReached(cfg2, at(g, 99.99, 1300))).toBe(3); // rung 4's tonnes not met
    expect(rungReached(cfg2, at(g, 1e6, 13000))).toBe(5); // rung 6 (5,000 t) is past the top
    expect(rungReached(cfg1, at(g, 1e6, 13000))).toBe(3); // the first yard's content stops at 3, as built
    expect(rungReached(cfg2, at(g, 0, 0, 4))).toBe(4); // rungs are not lost
  });
  it('the table counts each material against θ of the rung worked toward (rung + 1)', () => {
    const worth = Object.fromEntries(materialsOf(C2).map((m) => [m, 1300]));
    expect(rangeCount(C2, worth, 2)).toBe(M); // toward rung 3: theta
    expect(rangeCount(C2, worth, 3)).toBe(M); // toward rung 4: §1,200
    expect(rangeCount(C2, worth, 4)).toBe(0); // toward rung 5: §12,000
    expect(rangeChips(C2, worth, 4).every((ch) => !ch.counted)).toBe(true);
    expect(rangeCount(base, worth)).toBe(M); // the first yard's call: unchanged
  });
  it('rung tiles and progress run to the top rung; past it a bare padlock', () => {
    const g = at(start(), 50, 1300, 3);
    const tiles = rungTiles(cfg2, g);
    expect(tiles.filter((t) => t.inStage).map((t) => t.n)).toEqual([1, 2, 3, 4, 5]);
    expect(tiles.find((t) => t.n === 6)!.line).toBeNull();
    expect(rungProgress(cfg2, g).next).toEqual({ key: 'table.locked', args: { t: { tonnes_g: 100e6 }, r: { n: M - 1 } } });
    expect(rungProgress(cfg2, at(start(), 50, 1300, 5)).next).toBeNull();
  });
  it('the rung signs of stage 2 name what they open (only on a content with the works)', () => {
    const c = moneyCfg().salvage;
    expect(rungSign(c, 4).opens.map((o) => o.key)).toEqual(['opens.shredder', 'opens.halls', 'opens.lead']);
    expect(rungSign(c, 5).opens.map((o) => o.key)).toEqual(['opens.levelsOn']);
    expect(rungSign(base, 3).opens.map((o) => o.key)).toEqual(['opens.rung3']);
  });
});

describe('2.11 ceilings, away caps, the level cap by rung', () => {
  it('ceilings to rung 5 (one a rung)', () => {
    const g = start();
    for (const r of [1, 2, 3, 4, 5]) expect(ceilingFor(cfg2, at(g, 0, 0, r))).toBe(C2.ceilings_t_h[r - 1]);
  });
  it('away caps [0.5, 2, 4, 6, 8] h; the Night watch adds 2 h: 8 h at rung 4, 10 h at rung 5; the next rung named up to the top', () => {
    expect([1, 2, 3, 4, 5].map((r) => awayCapH(C2, r, false))).toEqual([0.5, 2, 4, 6, 8]);
    expect(awayCapH(C2, 4, true)).toBe(8);
    expect(awayCapH(C2, 5, true)).toBe(10);
    const g = at(start(), 0, 0, 4);
    expect(runLongerOf(cfg2, g, 6 * 3600)).toMatchObject({ rung: 5, capS: 8 * 3600 });
  });
  it('the level cap: levels.tau.cap to rung 3; 60 × τ_r minutes from rung 4', () => {
    expect(levelCapMin(C2, 1)).toBe(base.levels.tau.cap);
    expect(levelCapMin(C2, 3)).toBe(base.levels.tau.cap);
    expect(levelCapMin(C2, 4)).toBe(60 * 22);
    expect(levelCapMin(C2, 5)).toBe(60 * 45);
    // tau(L) of a high level: capped at the rung's cap.
    expect(levelTau(C2, 30, 3)).toBe(base.levels.tau.cap);
    expect(levelTau(C2, 30, 5)).toBe(2700);
    expect(levelTau(C2, 1, 5)).toBe(base.levels.tau.first);
  });
  it('a level price at rung 4 is never below the same level at rung 3 (the cap only rises)', () => {
    const g = fixtureGame('m30', E.createInitialState(GameConfigSchema.parse(gameJson), FIXTURE_NOW), FIXTURE_NOW) as SalvageGame;
    const cutter = g.salvage.crew.find((m) => m.role === 'cutter');
    if (!cutter) return;
    const target = { kind: 'crew' as const, id: cutter.id };
    const p3 = levelPrice(cfg2, at(g, 0, 0, 3), target);
    const p4 = levelPrice(cfg2, at(g, 0, 0, 4), target);
    if (p3 !== null && p4 !== null) expect(p4).toBeGreaterThanOrEqual(p3);
  });
});

describe('2.11 a works plate\'s level price (plateLevelPrice, the one function rules-works reads)', () => {
  const cfg = moneyCfg();
  const g0 = r3open();
  const withPlate = (phase: 'arriving' | 'installed' | 'running', level = 1): SalvageGame => ({
    ...g0,
    salvage: { ...g0.salvage, works: { ...g0.salvage.works, shear: { owned: true, level, hopper: [], work: null, tray_g: {}, trayClaim_g: {}, status: 'idle', since: g0.salvage.t, plate: 'shear', phase, commissionAt: null } as never } },
  });
  it('null before the plate runs; at least the levels\' floor; null at the plate\'s top level', () => {
    const floor = (cfg.salvage.levels as { floor?: number }).floor ?? 0;
    expect(plateLevelPrice(cfg, g0, 'shear')).toBeNull();
    expect(plateLevelPrice(cfg, withPlate('installed'), 'shear')).toBeNull();
    const p = plateLevelPrice(cfg, withPlate('running'), 'shear');
    expect(p).not.toBeNull();
    expect(p!).toBeGreaterThanOrEqual(Math.min(floor, 50));
    const top = Math.min(cfg.salvage.works!.plates.shear.maxLevel, cfg.salvage.works!.maxLevel);
    expect(plateLevelPrice(cfg, withPlate('running', top), 'shear')).toBeNull();
    // levelPrice and levelCheck read it for a plate (one rule); not running: notOwned.
    expect(levelPrice(cfg, withPlate('running'), { kind: 'plate', plate: 'shear' })).toBe(p);
    expect(levelCheck(cfg, withPlate('installed'), { kind: 'plate', plate: 'shear' }).refusal?.key).toBe('notOwned');
  });
});

describe('2.11 rivals to the one passed at rung 5, from the player\'s start (the first yard\'s formula and guard)', () => {
  const c = SalvageSchema.parse((gameJson as { salvage: unknown }).salvage);
  it('passed in list order, never back; each passed rival shows at most (1 − 0.03 k) of the player; every figure differs', () => {
    for (const d of [0, 2, 5, 8]) {
      let prev = 0;
      for (const t of [30, 100, 1000, 5000, 10000]) {
        const n = passedCount(c, t * 1e6, d, prev);
        expect(n).toBeGreaterThanOrEqual(prev);
        for (let i = 0; i < n; i++) expect(rivalGrams(c, i, d)).toBeLessThan(t * 1e6);
        if (n < c.rivals.list.length) expect(rivalGrams(c, n, d)).toBeGreaterThanOrEqual(t * 1e6);
        const shown = shownTonnes(c, t * 1e6, d, n);
        for (let i = n - 1, k = 1; i >= 0; i--, k++) expect(shown.rivals[i]).toBeLessThanOrEqual((1 - 0.03 * k) * t * 1e6 + 1e-6);
        const all = [shown.you, ...shown.rivals];
        expect(new Set(all.filter((v) => v > 0)).size).toBe(all.filter((v) => v > 0).length);
        prev = n;
      }
    }
  });
});
