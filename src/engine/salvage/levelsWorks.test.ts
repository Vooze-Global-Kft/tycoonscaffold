/**
 * s2e-levels (yard-stage2-economy.md package 6, 2.6.4, 2.11, 2.15's headroom; RULING2.md 27.2 a and c, 27.3 D5 and D11, 27.4):
 * levels at what they earn, and the headroom. Frozen test contents (lesson 4: no tuned number of the shipped content is
 * pinned: every expected value is the rule restated on the content's own values); the shipped content only where the first
 * yard is held at release.stage 1, and one bots' state of it read at stage 2. Owner: s2e-levels.
 *
 * - below the works' opening every level costs the first yard's price (the shipped content at release.stage 1: the rule
 *   restated, and levelQuote is null there);
 * - from the works' opening: price = roundPrice(max(levels.floor x floorGrowth^(L-1), tau_r x levelGain)); sold only while
 *   levelGain >= levels.minShareI x I, else `notLimit` with no price and no Buy (never sold at the floor);
 * - shown equals applied: the card's price is the price charged, the card's gain is levelGain, which is the change in the
 *   replay's I the step applies (the book's ladder where it names it); no level lowers I; a tick equals a jump across a
 *   level bought;
 * - the headroom U from the works' opening: every step buyable now whose payback is within 1.5 tau_r, counted up each
 *   ladder while each step pays, a level not sold counting nothing, never a function of the cash.
 */
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SalvageSchema } from '../../config/schema.salvage';
import { shipped2Config } from '../fixtures/shipped2';
import { FIXTURE_NAMES, FIXTURE_NOW, playedGame } from '../fixtures/salvage';
import { moneyCfg, r3open } from '../fixtures/salvage2money';
import { r4Game, worksCfg } from '../fixtures/salvage2works';
import * as R from '../salvage';
import { level } from './actions';
import { plateBuyCheck } from './actionsWorks';
import { away, newBot, newSitting, playTo, playUntil, seededCfg, startGame } from './bot';
import { cardOf, levelWhyLines } from './cards';
import { buyCheck, ceilingRefusal, firstYardLevelPrice, hireCheck, hiredState, levelAddsKgMin, levelCheck, levelled, levelPrice, levelQuote, levelTau, ratedGain, shopItems, worksTauH } from './ladder';
import { contentAt, worksOpened } from './layer';
import { levelGain, ratedIncome, replayIncome } from './rate';
import { headroomU, HEADROOM_TAU } from './shop';
import type { CardRow, LevelTarget, SalvageConfig, SalvageGame } from './types';

const RAW = JSON.parse(fs.readFileSync(new URL('../../../games/scrap-yard/game.json', import.meta.url), 'utf8'));
const round = (v: number) => Math.max(50, v < 1000 ? Math.round(v / 10) * 10 : Math.round(v / 100) * 100);
const C = (cfg: SalvageConfig, g: SalvageGame) => contentAt(cfg.salvage, g.salvage);
const I = (cfg: SalvageConfig, g: SalvageGame) => ratedIncome(C(cfg, g), g.salvage);

/** The config with levels.minShareI set (the frozen contents predate the key). */
function withShare(cfg: SalvageConfig, share: number, over: Partial<SalvageConfig['salvage']> = {}): SalvageConfig {
  return { ...cfg, salvage: { ...cfg.salvage, ...over, levels: { ...cfg.salvage.levels, minShareI: share } } } as SalvageConfig;
}

/** Every level target of the state (crew, owned first-yard machines, open partners). */
function targets(g: SalvageGame): LevelTarget[] {
  const s = g.salvage;
  return [
    ...s.crew.map((m) => ({ kind: 'crew', id: m.id }) as LevelTarget),
    ...(['stripper', 'bench', 'crucible'] as const).filter((m) => s.machines[m]?.owned).map((m) => ({ kind: 'machine', machine: m }) as LevelTarget),
    ...Object.entries(s.partners)
      .filter(([, p]) => p.open)
      .map(([p]) => ({ kind: 'partner', partner: p }) as LevelTarget),
  ];
}

/** The rule restated (2.11): what levelQuote must say, from the content's own values. */
function expected(cfg: SalvageConfig, g: SalvageGame, t: LevelTarget): { gain: number; price: number; sold: boolean } {
  const c = C(cfg, g);
  const lv = c.levels as { floor?: number; floorGrowth?: number; minShareI?: number; tau: { cap: number } };
  const L = t.kind === 'crew' ? g.salvage.crew.find((m) => m.id === t.id)!.level : t.kind === 'machine' ? g.salvage.machines[t.machine].level : t.kind === 'partner' ? g.salvage.partners[t.partner].level : 1;
  const gain = levelGain(c, g.salvage, t);
  const tau = c.tau_h?.[g.salvage.ladder.rung - 1] ?? lv.tau.cap / 60;
  const price = round(Math.max((lv.floor ?? 0) * (lv.floorGrowth ?? 1) ** (L - 1), tau * gain));
  return { gain, price, sold: gain > 1e-6 && gain >= (lv.minShareI ?? 0) * Math.max(0, I(cfg, g)) - 1e-9 };
}

/** The row of a level on its card (the rota for crew, the partners' tab for a partner's skip). */
function rowOf(cfg: SalvageConfig, g: SalvageGame, t: LevelTarget): CardRow | null {
  if (t.kind === 'crew') return cardOf(cfg, g, { kind: 'office', tab: 'rota' }, 0).rows.find((r) => r.id === t.id) ?? null;
  if (t.kind === 'partner') return cardOf(cfg, g, { kind: 'office', tab: 'partners' }, 0).rows.find((r) => r.id === `${t.partner}.another`) ?? null;
  return null;
}

// ============================================================================ the first yard: pinned

describe("below the works' opening every level costs the first yard's price (the owner's phone)", () => {
  it('the shipped content at release.stage 1, the five recorded first-yard states played on it: levelPrice is the first yard\'s rule restated, levelQuote null, the check charges it', () => {
    const cfg = { mode: 'salvage', salvage: SalvageSchema.parse(structuredClone(RAW.salvage)), monetization: RAW.monetization } as unknown as SalvageConfig;
    expect(cfg.salvage.release?.stage ?? 1).toBe(1);
    const base = { cash: 0, lifetimeEarnings: 0, lastSavedAt: FIXTURE_NOW, stats: { playSeconds: 0, clockHigh: FIXTURE_NOW } } as never;
    let n = 0;
    for (const name of FIXTURE_NAMES) {
      const g = playedGame(cfg, name, base, FIXTURE_NOW);
      expect(worksOpened(g.salvage)).toBe(false);
      const c = cfg.salvage;
      const lv = c.levels as unknown as { floor?: number; floorGrowth?: number; margin_per_kg: Record<string, number> };
      for (const t of targets(g)) {
        const L = t.kind === 'crew' ? g.salvage.crew.find((m) => m.id === t.id)!.level : t.kind === 'machine' ? g.salvage.machines[t.machine].level : g.salvage.partners[(t as { partner: string }).partner].level;
        const margin = t.kind === 'machine' ? (lv.margin_per_kg[t.machine] ?? lv.margin_per_kg.yard ?? 0) : (lv.margin_per_kg.yard ?? 0);
        const top = levelPrice(cfg, g, t) === null;
        const want = top ? null : round(Math.max(levelTau(c, L, g.salvage.ladder.rung) * levelAddsKgMin(cfg, g, t) * margin, (lv.floor ?? 0) * (lv.floorGrowth ?? 1) ** (L - 1)));
        expect({ name, t, p: levelPrice(cfg, g, t) }).toEqual({ name, t, p: want });
        expect(firstYardLevelPrice(cfg, g, t)).toBe(levelPrice(cfg, g, t));
        expect(levelQuote(cfg, g, t)).toBeNull();
        expect(levelWhyLines(cfg, g, t)).toEqual([]);
        const ch = levelCheck(cfg, g, t);
        if (want !== null && ch.state !== 'locked') expect(ch.price).toBe(want);
        n++;
      }
    }
    expect(n).toBeGreaterThan(10);
  });
});

// ============================================================================ the works' rule

describe("from the works' opening: price = roundPrice(max(floor x growth^(L-1), tau_r x levelGain)), sold only while worth having", () => {
  for (const [name, mk] of [['r4 (works content)', () => ({ cfg: worksCfg(), g: r4Game() })], ['r3open (money content)', () => ({ cfg: moneyCfg(), g: r3open() })]] as const) {
    it(`${name}: every level's quote, check, price and card row (minShareI 0, 0.01 and 1)`, () => {
      const { cfg: cfg0, g } = mk();
      expect(worksOpened(g.salvage)).toBe(true);
      let sold = 0;
      let refused = 0;
      for (const share of [0, 0.01, 1]) {
        const cfg = withShare(cfg0, share);
        for (const t of targets(g)) {
          const q = levelQuote(cfg, g, t);
          if (!q) continue;
          const e = expected(cfg, g, t);
          expect({ t, gain: q.gain, price: q.price, sold: q.sold }).toEqual({ t, ...e });
          expect(q.tauH).toBe(worksTauH(C(cfg, g), g.salvage.ladder.rung));
          const ch = levelCheck(cfg, { ...g, cash: 1e12 }, t);
          const row = rowOf(cfg, { ...g, cash: 1e12 }, t);
          if (q.sold) {
            sold++;
            expect(levelPrice(cfg, g, t)).toBe(q.price);
            if (ch.refusal?.key === 'ceiling') continue;
            expect({ t, state: ch.state, price: ch.price }).toEqual({ t, state: 'buy', price: q.price });
            if (row) {
              // shown equals applied: the Buy carries the price charged, the line the gain the price is made of.
              expect((row.button?.action as { price: number }).price).toBe(q.price);
              const line = t.kind === 'crew' ? row.extra : row.line;
              expect(line).toEqual({ key: 'card.levelEarns', args: { x: { money: q.gain } } });
              expect(levelWhyLines(cfg, g, t)[1]).toEqual({ key: 'card.levelPays', args: { t: { secs: (q.price / q.gain) * 3600 } } });
            }
          } else {
            refused++;
            // never sold at the floor: no price, no Buy, the gain printed with the refusal.
            expect({ t, state: ch.state, price: ch.price, key: ch.refusal?.key }).toEqual({ t, state: 'locked', price: null, key: 'notLimit' });
            expect(ch.refusal?.args).toEqual({ x: { money: q.gain } });
            expect(levelPrice(cfg, g, t)).toBeNull();
            if (row) {
              expect(row.button).toBeNull();
              expect(t.kind === 'crew' ? row.extra : row.line).toEqual({ key: 'refusal.notLimit', args: { x: { money: q.gain } } });
            }
          }
        }
      }
      expect(sold).toBeGreaterThan(0);
      expect(refused).toBeGreaterThan(0);
    }, 120_000);
  }

  it('the gain book: a ladder it names is priced at tau_r x g1 x d^(L-1), sold by the same 1 % test; the next step reads the next term', () => {
    const cfg0 = worksCfg();
    const g = r4Game();
    const driver = g.salvage.crew.find((m) => m.role === 'driver')!;
    const t: LevelTarget = { kind: 'crew', id: driver.id };
    const I0 = I(cfg0, g);
    const book = { driver: { g1: 0.05 * I0, d: 0.9 } };
    const cfg = withShare({ ...cfg0, salvage: { ...cfg0.salvage, levels: { ...cfg0.salvage.levels, book } } } as SalvageConfig, 0.01);
    const q = levelQuote(cfg, g, t)!;
    const tau = worksTauH(C(cfg, g), g.salvage.ladder.rung)!;
    expect(q.gain).toBeCloseTo(0.05 * I0 * 0.9 ** (driver.level - 1), 6);
    expect(q.sold).toBe(true);
    expect(q.price).toBe(round(Math.max(q.floor, tau * q.gain)));
    const up = levelled(g, t);
    expect(levelQuote(cfg, up, t)!.gain).toBeCloseTo(q.gain * 0.9, 6);
    // a book entry under 1 % of I: not sold
    const low = withShare({ ...cfg0, salvage: { ...cfg0.salvage, levels: { ...cfg0.salvage.levels, book: { driver: { g1: 0.001 * I0, d: 1 } } } } } as SalvageConfig, 0.01);
    expect(levelCheck(low, g, t).refusal?.key).toBe('notLimit');
  });
});

// ============================================================================ shown equals applied; I; tick = jump

/** The stale boss (tickjump.test.ts): his last sample 100 s old and his act ended. */
const stale = (g: SalvageGame): SalvageGame => ({ ...g, salvage: { ...g.salvage, presenceAt: g.salvage.t - 100, act: { kind: 'none', target: null, since: g.salvage.t, endsAt: null } } }) as SalvageGame;

describe('a level bought: the price charged is the card\'s, the gain is the change in I, no level lowers I, a tick equals a jump', () => {
  for (const [name, mk] of [['r4 (works content)', () => ({ cfg: withShare(worksCfg(), 0), g: r4Game() })], ['r3open (money content)', () => ({ cfg: withShare(moneyCfg(), 0), g: r3open() })]] as const) {
    it(name, () => {
      const { cfg, g: g0 } = mk();
      const g = { ...g0, cash: 1e9 };
      let n = 0;
      for (const t of targets(g)) {
        const ch = levelCheck(cfg, g, t);
        if (ch.state !== 'buy') continue;
        const q = levelQuote(cfg, g, t)!;
        const after = level(cfg, g, t, ch.price!, g.salvage.t);
        expect(g.cash - after.cash).toBeCloseTo(q.price, 6);
        const c = C(cfg, g);
        // the card's gain is the change in the replay's I (levelGain's measure where no book names the ladder)
        expect(replayIncome(c, after.salvage) - replayIncome(c, g.salvage)).toBeCloseTo(q.gain, 6);
        // no level lowers I (ruling 17)
        expect(I(cfg, after)).toBeGreaterThanOrEqual(I(cfg, g) - 0.005);
        n++;
      }
      expect(n).toBeGreaterThan(0);
    }, 120_000);
  }

  it('r4: 20 s of 0.1 s ticks after a level bought equal one jump', () => {
    const cfg = withShare(worksCfg(), 0);
    const g0 = { ...r4Game(), cash: 1e9 };
    const t = targets(g0).find((x) => levelCheck(cfg, g0, x).state === 'buy')!;
    expect(t).toBeDefined();
    const g = stale(level(cfg, g0, t, levelCheck(cfg, g0, t).price!, g0.salvage.t));
    let a = g;
    let ms = g.salvage.clock.highMs;
    for (let i = 0; i < 200; i++) {
      ms += 100;
      a = R.advanceSalvage(cfg, a, 0.1, ms);
    }
    const j = R.jump(cfg, g, g.salvage.t + 20);
    expect(a.cash).toBeCloseTo(j.cash, 2);
    expect(a.salvage.ladder.supplied_g).toBe(j.salvage.ladder.supplied_g);
    for (const k of Object.keys(a.salvage.bays)) expect({ k, g: a.salvage.bays[k].g }).toEqual({ k, g: j.salvage.bays[k].g });
    const crew = (x: SalvageGame) => x.salvage.crew.map((m) => `${m.id}:${m.level}:${m.job}/${m.phase}/${m.t0.toFixed(6)}-${m.t1.toFixed(6)}`).join(',');
    expect(crew(a)).toBe(crew(j));
    expect(JSON.stringify(a.salvage.truck.trip)).toBe(JSON.stringify(j.salvage.truck.trip));
  }, 120_000);
});

// ============================================================================ the headroom

/** The headroom rule restated (yard-stage2-economy.md 2.15), by hand. */
function handU(cfg: SalvageConfig, g: SalvageGame): number {
  const c = C(cfg, g);
  const tau = worksTauH(c, g.salvage.ladder.rung);
  const win = tau === null ? Infinity : HEADROOM_TAU * tau;
  const ok = (st: string, p: number | null): p is number => p !== null && (st === 'buy' || st === 'cantAfford');
  const Inow = Math.max(0, I(cfg, g));
  let u = 0;
  for (const it of shopItems(c)) {
    if (it.kind === 'crew') continue;
    const ch = it.kind === 'works' ? plateBuyCheck(cfg, g, it.key) : buyCheck(cfg, g, it.key);
    if (!ok(ch.state, ch.price)) continue;
    const s = g.salvage;
    const after =
      it.kind === 'works'
        ? { ...g, salvage: { ...s, works: { ...s.works, [it.key]: { phase: 'running', level: 1 } as never }, counts: { ...(s.counts ?? {}), [`poured:${it.key}`]: Math.max(1, s.counts?.[`poured:${it.key}`] ?? 0) } } }
        : { ...g, salvage: { ...s, owned: [...s.owned, it.key], ...(c.tools[it.key] ? { tier: Math.max(s.tier, c.tools[it.key].tier) } : {}), ...(c.carriers[it.key] !== undefined && (c.carriers[it.key] ?? 0) > (c.carriers[s.carrier] ?? 0) ? { carrier: it.key } : {}), ...(it.key === 'truck' ? { truck: { ...s.truck, owned: true } } : {}), ...(['stripper', 'bench', 'crucible'].includes(it.key) ? { machines: { ...s.machines, [it.key]: { ...s.machines[it.key as 'bench'], owned: true, level: Math.max(1, s.machines[it.key as 'bench'].level) } } } : {}) } };
    const d = ratedGain(cfg, g, after as SalvageGame);
    if (d > 1e-6 && ch.price <= win * d + 1e-9) u += ch.price;
  }
  for (const role of ['hand', 'cutter', 'driver'] as const) {
    let h = g;
    for (;;) {
      const ch = hireCheck(cfg, h, role);
      if (!ok(ch.state, ch.price)) break;
      const nx = hiredState(h, role);
      const d = ratedGain(cfg, h, nx);
      if (!(d > 1e-6 && ch.price <= win * d + 1e-9)) break;
      u += ch.price;
      h = nx;
    }
  }
  const share = (c.levels as { minShareI?: number }).minShareI ?? 0;
  const lv = c.levels as { floor?: number; floorGrowth?: number };
  for (const t of targets(g)) {
    let h = g;
    for (;;) {
      const q = levelQuote(cfg, h, t, Inow);
      if (!q) break;
      const gain = levelGain(C(cfg, h), h.salvage, t);
      if (!(gain > 1e-6 && gain >= share * Inow - 1e-9)) break;
      const price = round(Math.max((lv.floor ?? 0) * (lv.floorGrowth ?? 1) ** (q.L - 1), q.tauH * gain));
      if (ceilingRefusal(cfg, h, levelled(h, t))) break;
      if (!(price <= win * gain + 1e-9)) break;
      u += price;
      h = levelled(h, t);
    }
  }
  return Math.round(u * 100) / 100;
}

describe("the headroom U from the works' opening (2.15; D11: what pays back within 1.5 tau_r, up each ladder)", () => {
  it('r4 and r3open: U is the rule restated by hand; never a function of the cash; a level not sold counts nothing; the ladders are counted up', () => {
    for (const { cfg: cfg0, g } of [{ cfg: worksCfg(), g: r4Game() }, { cfg: moneyCfg(), g: r3open() }]) {
      for (const share of [0, 0.01]) {
        const cfg = withShare(cfg0, share);
        const u = headroomU(cfg, g);
        expect(u).toBe(headroomU(cfg, { ...g, cash: 0 }));
        expect(u).toBe(headroomU(cfg, { ...g, cash: 1e9 }));
        expect(u).toBeCloseTo(handU(cfg, g), 2);
      }
      // no level sold (minShareI 1): U counts no level, so it is no larger
      const none = headroomU(withShare(cfg0, 1), g);
      expect(none).toBeLessThanOrEqual(headroomU(withShare(cfg0, 0), g));
      // an open window (tau_r x 1000): every priced step with a gain counts, up each ladder: at least as much, and some ladder counts 2 steps or more
      const wide = withShare(cfg0, 0, { tau_h: cfg0.salvage.tau_h?.map((x) => (x === null ? null : x * 1000)) });
      expect(headroomU(wide, g)).toBeGreaterThanOrEqual(headroomU(withShare(cfg0, 0), g));
    }
  }, 240_000);

  it('a dark item (its gate past the ladder) counts nothing', () => {
    const cfg = withShare(worksCfg(), 0.01);
    const g = r4Game();
    const c = C(cfg, g);
    const counted = shopItems(c).filter((it) => it.kind !== 'crew' && it.kind !== 'works').map((it) => it.key);
    const u = headroomU(cfg, g);
    for (const key of counted) {
      const ch = buyCheck(cfg, g, key);
      if (ch.state !== 'buy' && ch.state !== 'cantAfford') continue;
      // the same content with that item's gate past the ladder (the content's DARK form): U without it
      const darkLayer = cfg.salvage.worksLayer ? { ...cfg.salvage.worksLayer, shop: (cfg.salvage.worksLayer as { shop?: { key: string }[] }).shop?.map((i) => (i.key === key ? { ...i, gate: 'rung99' } : i)) } : undefined;
      const dark = { ...cfg, salvage: { ...cfg.salvage, shop: cfg.salvage.shop.map((i) => (i.key === key ? { ...i, gate: 'rung99' } : i)), ...(darkLayer ? { worksLayer: darkLayer } : {}) } } as SalvageConfig;
      expect(buyCheck(dark, g, key).state).toBe('locked');
      expect(headroomU(dark, g)).toBeLessThanOrEqual(u + 1e-9);
      return;
    }
  }, 120_000);
});

// ============================================================================ one bots' state of the shipped content at stage 2

describe("a bots' state of the shipped content read at stage 2 (the normal hand, seed 1, the first return after the works' opening)", () => {
  it('every level sold costs tau_3 x its gain (or the floor), every other is "Not the limit now"; buying each sold level charges the card\'s price and lowers no I', () => {
    const NOW = Date.UTC(2026, 10, 25, 9, 0, 0);
    const cfg = seededCfg(shipped2Config((x) => SalvageSchema.parse(x)), 1);
    const b = newBot(cfg, startGame(cfg, NOW), NOW, { hand: 'normal', habit: 'goal', route: 'A', seed: 1 } as never);
    playUntil(b, (bb) => worksOpened(bb.g.salvage), 3600);
    newSitting(b);
    away(b, 11.75 * 3600);
    void playTo;
    const g = { ...b.g, cash: 1e9 };
    expect(worksOpened(g.salvage)).toBe(true);
    let sold = 0;
    for (const t of targets(g)) {
      const q = levelQuote(cfg, g, t);
      if (!q) continue;
      const e = expected(cfg, g, t);
      expect({ t, price: q.price, sold: q.sold }).toEqual({ t, price: e.price, sold: e.sold });
      const ch = levelCheck(cfg, g, t);
      if (!q.sold) {
        expect(ch.refusal?.key).toBe('notLimit');
        continue;
      }
      if (ch.state !== 'buy') continue;
      sold++;
      const after = level(cfg, g, t, ch.price!, g.salvage.t);
      expect(g.cash - after.cash).toBeCloseTo(q.price, 6);
      expect(I(cfg, after)).toBeGreaterThanOrEqual(I(cfg, g) - 0.005);
    }
    expect(sold).toBeGreaterThan(0);
    expect(headroomU(cfg, g)).toBe(headroomU(cfg, { ...g, cash: 0 }));
  }, 300_000);
});
