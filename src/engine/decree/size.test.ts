/**
 * Sizing (spec 10.2 `size`): the lemma for every mood 0 to 100 and every base effect −10 to 10; a
 * settlement's fixed +10; every twist and minister factor combination through the ONE Factors object;
 * money frozen when the paper lands (D23) with the jitter fixed at the draw; moods at landing; the
 * strip as data, derived from the frozen values. Frozen test content only (lesson 4).
 *
 * Joined (rules-lead): every rules module is the real one (no module mock); a slip the real advice.ts
 * lands between two papers (D18) is put back by the test's helper where a test counts papers.
 */
import { describe, expect, it } from 'vitest';
import * as R from '../decree';
import { built, decreeTestConfig } from '../fixtures/decree';

const cfg = decreeTestConfig();

/** The specification's formula in floating point: sign(Δ) × max(1, round(|Δ| × f)), half away from zero, 0 with no headroom. */
function spec(m: number, delta: number): number {
  if (delta === 0) return 0;
  const room = delta > 0 ? 100 - m : m;
  if (room <= 0) return 0;
  const f = Math.min(1.4, room / 50);
  return Math.sign(delta) * Math.max(1, Math.floor(Math.abs(delta) * f + 0.5 + 1e-9));
}

describe('the f± sizing and its lemma (2.7)', () => {
  it('keeps every mood 0 to 100 inside 0 to 100 for every base effect −10 to 10, with the minimum of 1', () => {
    let cases = 0;
    for (let m = 0; m <= 100; m++)
      for (let delta = -10; delta <= 10; delta++) {
        const s = R.sizeMood(cfg, m, delta);
        expect(s).toBe(spec(m, delta));
        expect(m + s).toBeGreaterThanOrEqual(0);
        expect(m + s).toBeLessThanOrEqual(100);
        if (delta !== 0 && (delta > 0 ? 100 - m : m) >= 1) expect(Math.abs(s)).toBeGreaterThanOrEqual(1);
        if (delta !== 0 && s !== 0) expect(Math.sign(s)).toBe(Math.sign(delta));
        cases++;
      }
    expect(cases).toBe(101 * 21);
  });

  it('prints 7.5 paper 3: at 50 a swap moves 4; with Bus at 30, signing gives 30 → 36 and studying 30 → 28', () => {
    expect(R.sizeMood(cfg, 50, 4)).toBe(4);
    expect(R.sizeMood(cfg, 30, 4)).toBe(6);
    expect(R.sizeMood(cfg, 30, -4)).toBe(-2);
    // Exact halves round away from zero: 3 × 0.5 = 1.5 → 2; 5 × 0.9 = 4.5 → 5.
    expect(R.sizeMood(cfg, 75, 3)).toBe(2);
    expect(R.sizeMood(cfg, 45, -5)).toBe(-5);
    expect(R.sizeMood(cfg, 45, 5)).toBe(6);
    expect(R.sizeMood(cfg, 100, 5)).toBe(0);
    expect(R.sizeMood(cfg, 0, -5)).toBe(0);
  });

  it("copies a settlement's fixed +10 unsized (it starts below 20, so it stays inside 0..100)", () => {
    for (let m = 0; m < cfg.decree.boycott.below; m++) {
      const g = built({ office: 0, moods: [50, 50, m], boycott: { club: 2 } });
      const def = cfg.decree.deck.grievances.find((x) => x.club === 'veg')!;
      const r = R.grievancePaper(cfg, g, 2, def);
      const shown = R.freezeShown(cfg, r.g, r.paper, R.neutralFactors());
      const moods = shown.sign.find((e) => e.type === 'moods');
      expect(moods && moods.type === 'moods' && moods.deltas[2]).toBe(10);
      expect(m + 10).toBeLessThanOrEqual(100);
    }
    // The same Δ unfixed would be sized: 18 → +14.
    expect(R.sizeMood(cfg, 18, 10)).toBe(14);
  });
});

describe('the factors of twists and ministers multiply the base effects before sizing (2.14, 2.17)', () => {
  // Governor office: clubs bus 0, shops 1, veg 2, brass 3, anglers 4; ministries 1 bus, 2 shops, 3 veg, 4 brass, 5 anglers.
  const entry = (target: R.FactorTarget, club: number | null, mul: number, add: number, source: string, initials: string | null) => ({ target, club, mul, add, source, initials });
  const ENTRIES = [
    entry('ribbon.money', null, 2, 0, 'ribbon_shortage', null),
    entry('ribbon.mood', null, 2, 0, 'ribbon_shortage', null),
    entry('ribbon.mood', 3, 1, 1, 'bole', 'HB'),
    entry('fee.money', null, 1.5, 0, 'market_fortnight', null),
    entry('fee.money', 1, 1.2, 0, 'ferrule', 'BF'),
    entry('requisition.money', 0, 0.9, 0, 'pockle', 'DS'),
    entry('settlement.money', 2, 0.5, 0, 'pellow', 'DPe'),
    entry('settlement.money', null, 0.5, 0, 'grievance_amnesty', null),
    entry('campaign.money', null, 0.67, 0, 'gusset', 'PP'),
    entry('sayNothing.cut', null, 0.6, 0, 'gentle_week', null),
    entry('sayNothing.cut', null, 0.7, 0, 'tamp', 'OT'),
  ];
  const g0 = built({ office: 1, moods: [52, 47, 18, 30, 61], ministries: [20, 14, 9, 12, 12, 0], gossip: 5, cash: 1e9, boycott: { club: 2 } });
  const B = R.decreeParams(cfg, g0, R.neutralFactors()).B;
  const papers = (() => {
    let g = g0;
    const out: R.Paper[] = [];
    const take = (r: { paper: R.Paper; g: R.DecreeGame } | null) => {
      if (r) [g, out[out.length]] = [r.g, r.paper];
    };
    take(R.comicPaper(cfg, g, 'test-governor-shops-fee-1'));
    take(R.comicPaper(cfg, g, 'test-governor-bus-fee-1'));
    take(R.ribbonPaper(cfg, g, 4));
    take(R.ribbonPaper(cfg, g, 2));
    take(R.ribbonPaper(cfg, g, 0));
    take(R.requisitionPaper(cfg, g, 1));
    take(R.requisitionPaper(cfg, g, 3));
    take(R.grievancePaper(cfg, g, 2, cfg.decree.deck.grievances.find((x) => x.club === 'veg')!));
    take(R.frontPagePaper(cfg, g));
    take(R.drawRally(cfg, g, []));
    return { out, g };
  })();

  /** What the specification says each effect prints under the factors `on` (computed here from the rule, independently of size.ts). */
  function expected(p: R.Paper, side: R.Choice, list: typeof ENTRIES): R.ShownEffect[] {
    const val = (target: R.FactorTarget, club: number | null) => list.filter((e) => e.target === target && (e.club === null || e.club === club)).reduce((v, e) => ({ mul: v.mul * e.mul, add: v.add + e.add }), { mul: 1, add: 0 });
    const served = p.ministry === null ? null : (({ 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 }) as Record<number, number>)[p.ministry] ?? null;
    const moneyF = p.kind === 'requisition' ? val('requisition.money', served) : p.kind === 'ribbon' ? val('ribbon.money', served) : p.kind === 'strike' ? val('settlement.money', p.petitioner) : p.kind === 'rally' ? val('campaign.money', null) : p.archetype === 'fee' ? val('fee.money', p.petitioner) : { mul: 1, add: 0 };
    const moods = g0.decree.moods;
    return p[side].effects.map((e): R.ShownEffect => {
      switch (e.type) {
        case 'money':
          return { type: 'money', amount: Math.sign(e.seconds) * Math.max(5, R.roundDibs(cfg, Math.abs(e.seconds * moneyF.mul) * B * p.jitter)) };
        case 'levelCost':
          return { type: 'money', amount: -R.roundDibs(cfg, R.levelCostRaw(cfg, g0, e.ministry) * moneyF.mul) };
        case 'mood': {
          const f = p.kind === 'ribbon' && e.delta > 0 ? val('ribbon.mood', served) : { mul: 1, add: 0 };
          const deltas = moods.map(() => 0);
          deltas[e.club] = e.fixed ? e.delta : spec(moods[e.club], Math.max(-10, Math.min(10, e.delta * f.mul + f.add)));
          return { type: 'moods', every: false, deltas };
        }
        case 'every': {
          const f = p.kind === 'ribbon' && e.delta > 0 ? val('ribbon.mood', null) : { mul: 1, add: 0 };
          return { type: 'moods', every: true, deltas: moods.map((m) => spec(m, Math.max(-10, Math.min(10, e.delta * f.mul + f.add)))) };
        }
        case 'gossipSet':
          return { type: 'gossip', delta: e.to - g0.decree.gossip };
        case 'sayNothing': {
          const cut = val('sayNothing.cut', null);
          return { type: 'sayNothing', papers: 10, factor: 1 - 0.2 * cut.mul };
        }
        case 'boycottRuns':
          return { type: 'boycottRuns', club: e.club, papers: 8 };
        case 'level':
          return { type: 'level', ministry: e.ministry, from: g0.decree.ministries[e.ministry].level };
        default:
          return e as R.ShownEffect;
      }
    });
  }

  it('every combination of the factor entries (2^11) gives each paper the numbers the rule says, and the initials of the ministers that touched it', () => {
    let combos = 0;
    for (let mask = 0; mask < 1 << ENTRIES.length; mask++) {
      const list = ENTRIES.filter((_, k) => mask & (1 << k));
      const factors: R.Factors = { mixAdd: [0, 0, 0, 0, 0, 0, 0], list };
      for (const p of papers.out) {
        const shown = R.freezeShown(cfg, g0, p, factors);
        for (const side of ['sign', 'refuse'] as const) {
          const want = expected(p, side, list);
          expect(shown[side].map((e) => (e.type === 'sayNothing' ? { ...e, factor: Math.round(e.factor * 1e9) / 1e9 } : e))).toEqual(want.map((e) => (e.type === 'sayNothing' ? { ...e, factor: Math.round(e.factor * 1e9) / 1e9 } : e)));
        }
        for (const ini of shown.factors) expect(list.some((e) => e.initials === ini.initials)).toBe(true);
        // Every effective mood stays inside 0..100 (the lemma after factors).
        for (const side of ['sign', 'refuse'] as const) for (const e of shown[side]) if (e.type === 'moods') e.deltas.forEach((x, gi) => {
            expect(g0.decree.moods[gi] + x).toBeGreaterThanOrEqual(0);
            expect(g0.decree.moods[gi] + x).toBeLessThanOrEqual(100);
          });
      }
      combos++;
    }
    expect(combos).toBe(2048);
  }, 60_000);

  it('prints the initials of a minister on the papers its rule touches ("BF ×1.2", "HB +1"), and only there', () => {
    const factors: R.Factors = { mixAdd: [0, 0, 0, 0, 0, 0, 0], list: [ENTRIES[4], ENTRIES[2]] };
    const [shopsFee, busFee, brassRibbon] = papers.out;
    expect(R.freezeShown(cfg, g0, shopsFee, factors).factors).toEqual([{ initials: 'BF', text: 'BF ×1.2', side: 'sign' }]);
    expect(R.freezeShown(cfg, g0, busFee, factors).factors).toEqual([]);
    expect(R.freezeShown(cfg, g0, brassRibbon, factors).factors).toEqual([{ initials: 'HB', text: 'HB +1', side: 'sign' }]);
  });

  it('a mix twist raises its club in every district and scales the others down, so every district still sums to 1', () => {
    const add = [0, 0, 0, 0.1, 0];
    const mix = R.mixWith(cfg.decree.offices[1].districts.map((d) => d.mix.map((w) => w / 100)), add);
    mix.forEach((m, k) => {
      expect(m.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
      expect(m[3]).toBeCloseTo(cfg.decree.offices[1].districts[k].mix[3] / 100 + 0.1, 12);
    });
    const p = R.decreeParams(cfg, g0, { mixAdd: [0, 0, 0, 0.1, 0, 0, 0], list: [] });
    expect(p.W.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });
});

describe('one moment of freezing (D23): identity and jitter at the draw, every number at landing', () => {
  it('a drawn paper carries base effects only; its money is sized from B when it lands, with the jitter drawn at the draw', () => {
    const g = built({ office: 0, ministries: [10, 7, 0, 0], cash: 5000 });
    const r = R.comicPaper(cfg, g, 'test-mayor-shops-fee-1');
    const money = r.paper.sign.effects.find((e) => e.type === 'money');
    expect(money).toEqual({ type: 'money', seconds: cfg.decree.money.M });
    expect(r.paper.jitter).toBeGreaterThanOrEqual(0.85);
    expect(r.paper.jitter).toBeLessThanOrEqual(1.15);
    // B grows between the draw and the landing: the print follows B at landing.
    const richer = { ...r.g, decree: { ...r.g.decree, ministries: [{ open: true, level: 20 }, { open: true, level: 12 }, { open: false, level: 0 }, { open: false, level: 0 }] } };
    const landed = R.landPaper(cfg, richer, r.paper, 0);
    const B = R.decreeParams(cfg, richer).B;
    expect(landed.decree.desk?.type === 'paper' && landed.decree.desk.shown.sign.find((e) => e.type === 'money')).toEqual({ type: 'money', amount: R.roundDibs(cfg, cfg.decree.money.M * B * r.paper.jitter) });
    expect(landed.decree.desk?.type === 'paper' && landed.decree.desk.shown.BAt).toBe(B);
    expect(landed.decree.desk?.type === 'paper' && landed.decree.desk.paper).toBe(r.paper);
  });

  it('moods are sized from the moods at landing, and landing the same paper on the same state twice gives the same print byte for byte', () => {
    const g = built({ office: 0, moods: [50, 50, 50] });
    const r = R.comicPaper(cfg, g, 'test-mayor-bus-swap-1');
    const low = { ...r.g, decree: { ...r.g.decree, moods: [30, 50, 50] } };
    const a = R.landPaper(cfg, low, r.paper, 0);
    const b = R.landPaper(cfg, low, r.paper, 0);
    expect(JSON.stringify(a.decree.desk)).toBe(JSON.stringify(b.decree.desk));
    const sign = a.decree.desk?.type === 'paper' ? a.decree.desk.shown.sign : [];
    expect(sign[0]).toEqual({ type: 'moods', every: false, deltas: [6, 0, 0] });
    expect(a.decree.desk?.type === 'paper' && a.decree.desk.shown.moodsAt).toEqual([30, 50, 50]);
  });

  it('a requisition prints the live price of the level it names at landing, and that level as `from`', () => {
    const g = built({ office: 0, ministries: [10, 7, 0, 0], cash: 5000 });
    const r = R.requisitionPaper(cfg, g, 1);
    const landed = R.landPaper(cfg, r.g, r.paper, 0);
    const shown = landed.decree.desk?.type === 'paper' ? landed.decree.desk.shown : null;
    expect(shown!.sign[0]).toEqual({ type: 'money', amount: -R.levelCost(cfg, g, 1) });
    expect(shown!.sign[1]).toEqual({ type: 'level', ministry: 1, from: 7 });
    // 7.5 paper 8: Potholes level 7 → 8 costs 15 × 8 × 1.25^6 = 457.8 → 458.
    expect(R.levelCost(cfg, g, 1)).toBe(458);
  });
});

describe('the strip as data (2.7 "A strip prints")', () => {
  it('prints chips with icon ids and resulting values, "every club" as one wide chip, ↩, and No change as no chips', () => {
    let g = built({ office: 0, moods: [50, 50, 50], gossip: 2 });
    const scripted = R.scriptedPaper(cfg, g, 0, 1)!;
    g = R.landPaper(cfg, scripted.g, scripted.paper, 0);
    const sign = R.stripOf(cfg, g, 'sign')!;
    const refuse = R.stripOf(cfg, g, 'refuse')!;
    expect(sign.chips).toEqual([]);
    expect(sign.followUp).toBe(true);
    expect(refuse.chips).toEqual([{ kind: 'every', deltas: [1, 1, 1], approvalFrom: 50, approvalTo: 51, wide: true, icon: 'art:fx_every' }]);
    expect(refuse.approval).toEqual({ from: 50, to: 51 });
    expect(refuse.void).toBeNull();
  });

  it('flags a club strong in a district within 3 points of 50, and prints the poll row when the districts held change', () => {
    // Mayor wards (Bus/Shops/Veg): Market 20/60/20, Mill 55/25/20, Hilltop 20/20/60, Riverside 45/15/40, Old Town 30/40/30.
    const g = built({ office: 0, moods: [50, 49, 51], desk: 'test-mayor-veg-project-1' });
    const s = R.stripOf(cfg, g, 'sign')!;
    const veg = s.chips.find((c) => c.kind === 'club' && c.club === 2);
    expect(veg && veg.kind === 'club' && veg.flag).toBe(true);
    expect(veg?.icon).toBe(cfg.decree.clubs.find((c) => c.id === 'veg')!.icon);
    // Veg +4, Bus −3: Hilltop (strong veg) goes up; whether the count changes is count.ts's: the row is there only when it does.
    if (s.poll) expect(s.poll.from).not.toBe(s.poll.to);
  });

  it('warns first (boycott, scandal), then "Short by … about … s" when the treasury cannot pay', () => {
    const g = built({ office: 0, moods: [50, 20, 50], gossip: 4, cash: 0, ministries: [10, 7, 0, 0], desk: 'test-mayor-bus-project-1' });
    const s = R.stripOf(cfg, g, 'sign')!;
    expect(s.affordable).toBe(false);
    const kinds = s.notes.map((n) => n.kind);
    expect(kinds).toContain('boycott');
    expect(kinds.indexOf('boycott')).toBeLessThan(kinds.indexOf('short'));
    const short = s.notes.find((n) => n.kind === 'short');
    const cost = -(s.chips.find((c) => c.kind === 'money') as { amount: number }).amount;
    expect(short && short.kind === 'short' && short.by).toBe(R.roundDibs(cfg, cost));
    expect(R.stripOf(cfg, g, 'refuse')!.affordable).toBe(true);
    const gs = built({ office: 0, gossip: 4, desk: 'test-mayor-bus-treat-1' });
    expect(R.stripOf(cfg, gs, 'sign')!.notes).toEqual([{ kind: 'scandal', gossip: 5, max: 5 }]);
  });

  it('prints a stale requisition as void and a capped one as "No longer needed"', () => {
    const g = built({ office: 0, ministries: [10, 7, 0, 0], cash: 5000 });
    const r = R.requisitionPaper(cfg, g, 1);
    const landed = R.landPaper(cfg, r.g, r.paper, 0);
    const raised = { ...landed, decree: { ...landed.decree, ministries: landed.decree.ministries.map((m, i) => (i === 1 ? { open: true, level: 8 } : m)) } };
    expect(R.stripOf(cfg, raised, 'sign')!.void).toBe('done');
    expect(R.stripOf(cfg, raised, 'sign')!.notes).toContainEqual({ kind: 'void', reason: 'done' });
    const capped = built({ office: 0, ministries: [10, cfg.decree.ministry.levelCap - 1, 0, 0], cash: 1e12 });
    const rc = R.requisitionPaper(cfg, capped, 1);
    const lc = R.landPaper(cfg, rc.g, rc.paper, 0);
    const atCap = { ...lc, decree: { ...lc.decree, ministries: lc.decree.ministries.map((m, i) => (i === 1 ? { open: true, level: cfg.decree.ministry.levelCap } : m)) } };
    expect(R.formVoid(cfg, atCap, atCap.decree.desk?.type === 'paper' ? atCap.decree.desk.shown.sign : [])).toBe('cap');
    expect(R.stripOf(cfg, atCap, 'refuse')!.void).toBe('cap');
  });
});

describe('the formulas D27 may still move are each ONE function with config parameters', () => {
  it('sizing: a gentler pull toward 50 keeps the no-clamp lemma; pull 1 and scale 50 are 2.7 exactly', () => {
    for (const pull of [0, 0.25, 0.5, 0.75, 1])
      for (const scale of [40, 50, 60]) {
        const c = decreeTestConfig({ paperRules: { disarray: { first: 2, ratio: 2 }, sizing: { scale, pull } } });
        for (let m = 0; m <= 100; m++)
          for (let delta = -10; delta <= 10; delta++) {
            const s = R.sizeMood(c, m, delta);
            expect(m + s).toBeGreaterThanOrEqual(0);
            expect(m + s).toBeLessThanOrEqual(100);
            if (pull === 1 && scale === 50) expect(s).toBe(spec(m, delta));
            if (pull === 0 && delta !== 0 && (delta > 0 ? 100 - m : m) >= Math.abs(delta)) expect(s).toBe(delta);
          }
      }
  });

  it('disarray: D15 by default (+2, +6, +14, +30, +62, +126), the config rule through decreeParams, ratio 1 the old linear rule', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map((n) => R.disarray(n))).toEqual([0, 2, 6, 14, 30, 62, 126]);
    expect(R.disarrayOf({ first: 8, ratio: 1 }, 3)).toBe(24);
    expect(R.disarrayOf({ first: 3, ratio: 3 }, 3)).toBe(3 + 9 + 27);
    const c = decreeTestConfig({ paperRules: { disarray: { first: 3, ratio: 2 }, sizing: { scale: 50, pull: 1 } } });
    const g = built({ office: 0, losses: 2 }, c);
    expect(R.decreeParams(c, g).disarray).toBe(9);
    expect(R.decreeParams(cfg, built({ office: 0, losses: 2 })).disarray).toBe(6);
  });
});
