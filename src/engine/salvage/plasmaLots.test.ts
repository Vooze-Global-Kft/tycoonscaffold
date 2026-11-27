/**
 * THE PLASMA CUTTER AS THE BOSS'S OWN TOOL (s2f-plasma-cars; RULING2.md 28.7 a): an oversize piece of a kind only the
 * plasma cuts (tier 4) may be worth up to ITS OWN mu of rated income (`lots.mu_min_tier`), larger than a torch's kind's
 * (tier 3, `lots.mu_min`), and the richest kind within its own cap comes. A tier-4 piece comes only with the plasma's tier
 * owned; every arrival's mass in its kind's range; a tick equals a jump; rated income never falls when the plasma is
 * bought. On the works' frozen test content with a torch's kind added here (`tierCfg`; no tuned number read).
 */
import { describe, expect, it } from 'vitest';
import { r3Works, r4Game, worksCfg } from '../fixtures/salvage2works';
import * as R from '../salvage';
import { begin, finish, type Ctx } from './clock';
import { contentAt } from './layer';
import { lotArrive, lotMassRange, lotValue } from './lots';
import { spliceThing } from './lookup';
import { own, ratedIncome } from './rate';
import { jump } from './tick';
import type { SalvageConfig, SalvageGame, SalvageState } from './types';

type Any = any; // eslint-disable-line @typescript-eslint/no-explicit-any

const MU3 = 10;
const MU4 = 20;
let CFG: SalvageConfig | null = null;
let NOKEY: SalvageConfig | null = null;
/** The works' test content, its lot kinds open without a line, a torch's kind (`drum3`: HMS, tier 3, 0.2 to 8 t) beside them; with `tiers`, lots.mu_min_tier { 4: MU4 } (mu_min MU3). */
function tierCfg(tiers = true): SalvageConfig {
  if (tiers && CFG) return CFG;
  if (!tiers && NOKEY) return NOKEY;
  const base = worksCfg();
  const c = structuredClone(base.salvage) as Any;
  const hms = Object.keys(c.grades).includes('hms') ? 'hms' : Object.keys(c.grades)[0];
  c.worksLayer.objects.drum3 = { name: 'Drum', tier: 3, h: 2, pieces: [[hms, 250000, 4]], waste_g: 0, whole: null, gross_g: 1000000, preparedValue: 1200, asFoundValue: 850, size: { w: 2, d: 1.5, h: 1.5 } };
  c.lots = {
    ...c.lots,
    mu_min: [null, null, MU3, MU3, MU3],
    kinds: [...c.lots.kinds.map((k: Any) => ({ ...k, line: [] })), { obj: 'drum3', from: 'partner.garage', line: [], cut_s: 8, mass_kg: [200, 8000] }],
  };
  if (tiers) c.lots.mu_min_tier = { '4': [null, null, MU4, MU4, MU4] };
  const cfg = { ...base, salvage: c } as SalvageConfig;
  if (tiers) CFG = cfg;
  else NOKEY = cfg;
  return cfg;
}
function act(cfg: SalvageConfig, g: SalvageGame, body: (x: Ctx) => void, live = false): SalvageGame {
  const x = begin(cfg, g, [], live);
  body(x);
  return finish(g, x);
}
/** n arrivals in a row at the state's instant (each piece taken off the pad at once): kind, tier, grams, worth, I and the kind's range. */
function arrivals(cfg: SalvageConfig, g: SalvageGame, tier: number, n = 60) {
  const out: { obj: string; tier: number; g: number; w: number; I: number; range: [number, number] }[] = [];
  act(cfg, g, (x) => {
    x.s.tier = tier;
    for (const th of [...x.s.things]) if (th.at.at === 'lot') spliceThing(x.s.things, x.s.things.indexOf(th));
    const I = ratedIncome(x.c, x.s);
    for (let k = 0; k < n; k++) {
      x.s.lots = { ...x.s.lots, nextAt: x.s.t };
      lotArrive(x, x.s.t);
      const th = x.s.things.find((q) => q.at.at === 'lot')!;
      const kind = x.c.lots!.kinds.find((q) => q.obj === th.obj)!;
      out.push({ obj: th.obj, tier: x.c.objects[th.obj].tier, g: th.g!, w: lotValue(x, th), I, range: lotMassRange(x, kind) });
      spliceThing(x.s.things, x.s.things.indexOf(th));
    }
  });
  return out;
}

describe('s2f: the plasma\'s pieces are worth more than the torch\'s', () => {
  it('with the torch only (tier 3) every piece is a torch\'s kind, worth at most mu_min x I (or the least worth when none fits)', () => {
    const cfg = tierCfg();
    const xs = arrivals(cfg, r3Works(), 3);
    expect(xs.every((a) => a.tier <= 3)).toBe(true);
    // the torch's one kind here: over its cap only when its draw is over it (the least worth then comes, as built)
    const over = xs.filter((a) => a.w > (MU3 / 60) * a.I + 1e-6);
    expect(over.length).toBeLessThan(xs.length);
    expect(over.every((a) => a.obj === 'drum3')).toBe(true);
  });

  it('with the plasma (tier 4): tier-4 pieces come, each worth at most ITS mu x I, and some worth more than a torch\'s piece may be', () => {
    const cfg = tierCfg();
    const xs = arrivals(cfg, r3Works(), 4);
    const t4 = xs.filter((a) => a.tier === 4);
    expect(t4.length).toBeGreaterThan(0);
    for (const a of xs) expect(a.w).toBeLessThanOrEqual(((a.tier === 4 ? MU4 : MU3) / 60) * a.I + 1e-6);
    expect(t4.some((a) => a.w > (MU3 / 60) * a.I)).toBe(true);
    // the richest within its cap: on average a plasma yard's pieces are worth more than a torch yard's, draw for draw
    const torch = arrivals(cfg, r3Works(), 3);
    const sum = (l: { w: number }[]) => l.reduce((q, a) => q + a.w, 0);
    expect(sum(xs)).toBeGreaterThan(sum(torch));
  });

  it('every arrival\'s mass lies in its kind\'s range (both tiers)', () => {
    const cfg = tierCfg();
    for (const tier of [3, 4]) for (const a of arrivals(cfg, r3Works(), tier)) {
      expect(a.g).toBeGreaterThanOrEqual(a.range[0]);
      expect(a.g).toBeLessThanOrEqual(a.range[1]);
    }
  });

  it('without the key the rule is as built: the same arrivals as the heaviest-within-mu_min rule on a torch\'s yard, and a tier-4 kind held to mu_min', () => {
    const cfg = tierCfg(false);
    const xs = arrivals(cfg, r3Works(), 4);
    for (const a of xs) expect(a.w).toBeLessThanOrEqual((MU3 / 60) * a.I + 1e-6);
    // on a torch's yard (one torch kind here) the key changes nothing
    expect(arrivals(tierCfg(true), r3Works(), 3)).toEqual(arrivals(cfg, r3Works(), 3));
  });

  it('a tick equals a jump over three periods with the plasma owned (1 s ticks; the pieces wait on the pad)', () => {
    const cfg = tierCfg();
    const P = cfg.salvage.lots!.period_s;
    const g = act(cfg, r3Works(), (x) => {
      x.s.tier = 4;
      x.s.presenceAt = -1;
    });
    let a = g;
    let ms = g.salvage.clock.highMs;
    const n = Math.ceil((3 * P) / 1) + 5;
    for (let i = 0; i < n; i++) {
      ms += 1000;
      a = R.advanceSalvage(cfg, a, 1, ms);
    }
    const j = jump(cfg, g, a.salvage.t);
    const pad = (s: SalvageState) => JSON.stringify(s.things.filter((t) => t.at.at === 'lot'));
    expect(pad(a.salvage)).toBe(pad(j.salvage));
    expect(a.salvage.lots).toEqual(j.salvage.lots);
    expect(Math.round(a.cash * 100)).toBe(Math.round(j.cash * 100));
    expect(j.salvage.things.filter((t) => t.at.at === 'lot').length).toBeGreaterThan(0);
  }, 300_000);
});

describe('s2f: rated income never falls when the plasma is bought', () => {
  for (const [name, mk] of [['r3', r3Works], ['r4', r4Game]] as const)
    it(`${name}: I with the plasma's tier at least I without`, () => {
      const cfg = tierCfg();
      const g = mk();
      const c = contentAt(cfg.salvage, g.salvage);
      const x = begin(cfg, { ...g, cash: 1e9 }, [], false);
      const I0 = ratedIncome(c, x.s);
      own(x, 'plasma' as never, x.s.t);
      const s1 = { ...x.s, tier: Math.max(x.s.tier, 4) };
      expect(ratedIncome(c, s1)).toBeGreaterThanOrEqual(I0 - 1e-6);
    });
});
