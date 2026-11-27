/**
 * s2e-fix1 (27 November; RULING2.md 28.5 b, c, d with 28.2 a and b; notes/s2e-fix1.md): the small pass of fixes before the
 * fifteen-seed measurement.
 *  - ONE MEASURE FOR MACHINES TOO (28.5 b): a sold machine's, vehicle's and tool's measured gain is in the content beside its
 *    price (`gain_h`, written by build-yard.py from bots/plates.json); from the works' opening the advice line and the headroom
 *    read it (ladder.ts measuredGain / buyGain); the replay's bought state runs a line's `with` plates with its first plate.
 *  - THE AGE QUESTION FIRST (28.2 a): due from the second session's start in every country; until a band is known ad requests
 *    are child-treated and no card has a shop entry. UNDER 13 (28.2 b): no ad buttons at all.
 * Rules on the frozen test contents (lesson 4: no tuned number pinned), and on the rated-income engineer's bots' states (seed 1,
 * the normal hand, played on the joined build's shipped content read at stage 2: __fixtures__/s2e-fix1/seed1-s*.json), whose
 * promises are read, never their numbers.
 */
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SalvageSchema } from '../../config/schema.salvage';
import gameJson from '../../../games/scrap-yard/game.json';
import { shipped2Config } from '../fixtures/shipped2';
import { shopCfg, shopGame, SHOP_NOW } from '../fixtures/salvage2money';
import { r3Works, r4Game, worksCfg } from '../fixtures/salvage2works';
import { salvageEngineMode } from '../salvageMode';
import type { GameConfig } from '../../config/schema';
import type { GameState } from '../types';
import { buy, hire, level } from './actions';
import { adPaid, setAgeBand } from './actionsMoney';
import { adviceLine, advice } from './advice';
import { adOffer, adsAllowed, bonusCard, spotButton } from './ads';
import { platePrice } from './bank';
import { seededCfg } from './bot';
import { cardOf, cardOfCfg } from './cards';
import { goalBuyNow, goalSpecs } from './goals';
import { boughtState, buyCheck, buyGain, gateRung, measuredGain, ratedGain, shopItems, topRungOf, worksTauH } from './ladder';
import { contentAt, worksOpened } from './layer';
import { ratedIncome } from './rate';
import { adAudience, ageDue, headroomU, shopReachable } from './shop';
import type { CardRef, SalvageConfig, SalvageEvent, SalvageGame } from './types';

// ============================================================================ the frozen test contents

/** The works' test content with measured gains and tau written as build-yard.py would (round numbers of the test). */
function gainedCfg(over: { tau?: number; gains?: Record<string, number>; withDep?: boolean } = {}): SalvageConfig {
  const cfg = structuredClone(worksCfg()) as SalvageConfig;
  const c = cfg.salvage as SalvageConfig['salvage'] & { tau_h?: (number | null)[] };
  c.tau_h = [null, null, over.tau ?? 10, over.tau ?? 10, over.tau ?? 10];
  for (const [k, v] of Object.entries(over.gains ?? {})) {
    if (c.works!.plates[k]) c.works!.plates[k].gain_h = v;
    else for (const it of c.worksLayer!.shop) if (it.key === k) it.gain_h = v;
  }
  if (over.withDep) c.works!.plates.shredder.with = ['depollution'];
  return cfg;
}

describe('28.5 b on the frozen works content: the measured gain in the content is the one the advice and the headroom read', () => {
  it('measuredGain reads a plate\'s and a works-layer item\'s gain_h; a content without one keeps the replay\'s gain', () => {
    const g = r3Works();
    const plain = worksCfg();
    expect(measuredGain(contentAt(plain.salvage, g.salvage), 'analyser')).toBeNull();
    const cfg = gainedCfg({ gains: { analyser: 100 } });
    expect(worksOpened(g.salvage)).toBe(true);
    expect(measuredGain(contentAt(cfg.salvage, g.salvage), 'analyser')).toBe(100);
    expect(buyGain(cfg, g, 'analyser')).toBe(100);
    const C = contentAt(plain.salvage, g.salvage);
    expect(buyGain(plain, g, 'analyser')).toBeCloseTo(ratedGain(plain, g, boughtState(C, g, 'analyser')), 9);
    // a level and a hire are never a measured item
    expect(measuredGain(C, 'cutter')).toBeNull();
  });

  it('the headroom counts a sold, unbought plate priced at tau_r x its measured gain, whatever its replay gain; never with the cash', () => {
    const g = r3Works();
    // price 1000 (the test plates'), tau 10 h: a gain of 100 pays back in exactly tau (inside 1.5 tau); a gain of 10 in 100 h (outside).
    const inWin = gainedCfg({ gains: { analyser: 100 } });
    const outWin = gainedCfg({ gains: { analyser: 10 } });
    const U1 = headroomU(inWin, g);
    const U0 = headroomU(outWin, g);
    expect(platePrice(inWin, g, 'analyser')).toBe(1000);
    expect(U1 - U0).toBeCloseTo(1000, 6);
    for (const cash of [0, 1, 1e12]) expect(headroomU(inWin, { ...g, cash })).toBe(U1);
  });

  it('the advice names the goal\'s machine while it is in the window (bought now, or saved for); its gain is the content\'s', () => {
    const cfg = gainedCfg({ gains: { analyser: 100, shear: 100, baler: 100, crane: 100, granulator: 100, shredder: 100, rotary: 100, induction: 100 } });
    // the frozen content has no stage goal list: one goal that buys the analyser (goals.json's shape), every first-yard goal done
    (cfg.salvage as unknown as { stage2: unknown[] }).stage2 = [{ id: 'buyAnalyser', text: 'goal.buyAnalyser', target: 'analyser', via: null, done: 'plate:analyser', buy: 'analyser', optional: false, stall: null }];
    const r3 = r3Works();
    const specs = goalSpecs(contentAt(cfg.salvage, r3.salvage));
    const done = [...specs.goals, ...specs.dayOne].map((d) => d.id);
    const g0: SalvageGame = { ...r3, salvage: { ...r3.salvage, goals: { ...r3.salvage.goals, done, skipped: [] } } };
    const goal = goalBuyNow(cfg, g0);
    expect(goal, 'the frozen goal list names a machine at r3').not.toBeNull();
    expect(measuredGain(contentAt(cfg.salvage, g0.salvage), goal!), String(goal)).not.toBeNull();
    for (const cash of [0, 1e9]) {
      const a = advice(cfg, { ...g0, cash }, SHOP_NOW);
      expect(a?.action.act, `cash ${cash}`).toBe('buy');
      if (a?.action.act === 'buy') expect(a.action.item, `cash ${cash}`).toBe(goal);
      expect(a?.works?.gain_h).toBe(100);
    }
  });

  it('boughtState runs a line\'s `with` plates with its first plate (the shredder line with its depollution bay)', () => {
    const g = r3Works();
    const cfg = gainedCfg({ withDep: true });
    const C = contentAt(cfg.salvage, g.salvage);
    const b = boughtState(C, g, 'shredder');
    expect(b.salvage.works.shredder?.phase).toBe('running');
    expect(b.salvage.works.depollution?.phase).toBe('running');
    // a plate of no line sets only itself; nothing is applied to the state it was read from
    expect(Object.keys(boughtState(C, g, 'rotary').salvage.works).sort()).toEqual([...Object.keys(g.salvage.works), 'rotary'].sort());
    expect(g.salvage.works.depollution).toBeUndefined();
  });
});

// ============================================================================ the bots' states (shipped content at stage 2)

const NAMES = ['s1', 's2', 's3', 's4', 's5', 's6'] as const;
let CFG: SalvageConfig | null = null;
const shippedCfg = () => (CFG ??= seededCfg(shipped2Config((x) => SalvageSchema.parse(x)), 1));
const stateOf = (n: (typeof NAMES)[number]): SalvageGame => JSON.parse(fs.readFileSync(new URL(`./__fixtures__/s2e-fix1/seed1-${n}.json`, import.meta.url), 'utf8')).g as SalvageGame;
const Cof = (cfg: SalvageConfig, g: SalvageGame) => contentAt(cfg.salvage, g.salvage);
const cfgAt = (cfg: SalvageConfig, g: SalvageGame): SalvageConfig => ({ ...cfg, salvage: Cof(cfg, g) });

/** The sold machines, vehicles and tools of the content the state reads (a gate within the stage's top; every one has gain_h). */
function soldMachines(cfg: SalvageConfig, g: SalvageGame): string[] {
  const c = Cof(cfg, g);
  const top = topRungOf(c);
  return shopItems(c).filter((it) => (it.kind === 'works' || it.kind === 'vehicle' || it.kind === 'tool') && gateRung(it.gate) > 0 && gateRung(it.gate) <= top && gateRung(it.gate) >= 3).map((it) => it.key);
}
/** Those a card sells now (for sale, unbought): a Buy or greyed for the cash. */
function forSale(cfg: SalvageConfig, g: SalvageGame): string[] {
  const C = cfgAt(cfg, g);
  return soldMachines(cfg, g).filter((k) => {
    if (Cof(cfg, g).works?.plates[k]) return platePrice(cfg, g, k) !== null;
    const ch = buyCheck(C, g, k);
    return ch.price !== null && (ch.state === 'buy' || ch.state === 'cantAfford');
  });
}
/** Every Buy's price for `item` anywhere on a card (a row's button, the works card's own Buy). */
function buyPrices(card: unknown, item: string): number[] {
  const out: number[] = [];
  const walk = (v: unknown) => {
    if (!v || typeof v !== 'object') return;
    const o = v as { act?: string; item?: string; price?: number };
    if (o.act === 'buy' && o.item === item && typeof o.price === 'number') out.push(o.price);
    for (const x of Object.values(v as object)) walk(x);
  };
  walk(card);
  return out;
}
function darkKeys(cfg: SalvageConfig, g: SalvageGame): string[] {
  const c = Cof(cfg, g);
  const top = topRungOf(c);
  return shopItems(c).filter((it) => gateRung(it.gate) > top).map((it) => it.key);
}

describe("28.5 b on the bots' states (seed 1, sittings 1 to 6; shipped content read at stage 2)", () => {
  it('the shipped content: every sold machine, vehicle and tool carries gain_h and is priced max(floor, tau_r x gain_h) to its rounding; nothing dark carries one; release.stage stays 1', () => {
    const cfg = shippedCfg();
    const g = stateOf('s2');
    const c = Cof(cfg, g);
    const sold = soldMachines(cfg, g);
    expect(sold.length).toBeGreaterThan(0);
    for (const k of sold) {
      const gain = measuredGain(c, k);
      expect(gain, k).not.toBeNull();
      const it = shopItems(c).find((i) => i.key === k)!;
      const tau = worksTauH(c, gateRung(it.gate))!;
      const want = Math.max(c.works!.floor, tau * gain!);
      expect(Math.abs(it.price - want), k).toBeLessThanOrEqual(Math.max(1, 0.01 * want));
    }
    for (const k of darkKeys(cfg, g)) expect(measuredGain(c, k), k).toBeNull();
    expect((gameJson as { salvage: { release?: { stage: number } } }).salvage.release?.stage).toBe(1);
    expect((gameJson as { monetization: { iap: { products: unknown[] } } }).monetization.iap.products).toEqual([]);
  });

  it('at every sitting: each sold, unbought machine pays back within both windows and is counted in the headroom; the headroom never reads cash; nothing dark is named or counted; the goal\'s machine is the advice\'s', () => {
    const cfg = shippedCfg();
    for (const n of NAMES) {
      const g = stateOf(n);
      if (!worksOpened(g.salvage)) continue;
      const c = Cof(cfg, g);
      const tau = worksTauH(c, g.salvage.ladder.rung) ?? Infinity;
      const U = headroomU(cfg, g);
      for (const cash of [0, 1e12]) expect(headroomU(cfg, { ...g, cash }), `${n} cash ${cash}`).toBe(U);
      let sum = 0;
      for (const k of forSale(cfg, g)) {
        const price = Cof(cfg, g).works?.plates[k] ? platePrice(cfg, g, k)! : buyCheck(cfgAt(cfg, g), g, k).price!;
        const gain = buyGain(cfg, g, k);
        expect(gain, `${n} ${k}`).toBe(measuredGain(c, k));
        expect(price / gain, `${n} ${k}: payback within 1.25 tau_r`).toBeLessThanOrEqual(1.25 * tau + 1e-9);
        sum += price;
      }
      expect(U, `${n}: U counts every sold, unbought machine`).toBeGreaterThanOrEqual(sum - 0.01);
      const a = adviceLine(cfg, g, g.salvage.clock.highMs);
      const dark = new Set(darkKeys(cfg, g));
      if (a && 'action' in a && a.action.act === 'buy') expect(dark.has(a.action.item), `${n}: advice names ${a.action.item}`).toBe(false);
      const goal = goalBuyNow(cfg, g);
      if (goal && forSale(cfg, g).includes(goal)) {
        expect(a && 'action' in a && a.action.act === 'buy' ? a.action.item : null, `${n}: the goal says buy ${goal}`).toBe(goal);
      }
    }
  }, 600_000);

  it('a walk of the advice (rung 3 and rung 4\'s entry, cash enough): every sold, unbought machine is named in goal order; shown equals applied; rated income never falls at a purchase; nothing dark named', () => {
    const cfg = shippedCfg();
    for (const n of ['s2', 's5'] as const) {
      let g: SalvageGame = { ...stateOf(n), cash: 5e7 };
      const want = new Set(forSale(cfg, g));
      expect(want.size, `${n}: machines for sale`).toBeGreaterThan(0);
      const named: string[] = [];
      const dark = new Set(darkKeys(cfg, g));
      for (let step = 0; step < 12 && want.size > named.length; step++) {
        const a = advice(cfg, g, g.salvage.clock.highMs);
        if (!a) break;
        const I0 = ratedIncome(Cof(cfg, g), g.salvage);
        const cash0 = g.cash;
        const ev: SalvageEvent[] = [];
        const t = g.salvage.t;
        const act = a.action;
        let g1: SalvageGame = g;
        if (act.act === 'buy') {
          expect(dark.has(act.item), `${n}: ${act.item}`).toBe(false);
          // the card's Buy carries the price the advice names (shown equals applied)
          const prices = buyPrices(cardOfCfg(cfg, g, a.open as CardRef, SHOP_NOW, { country: null }), act.item);
          expect(prices.length, `${n}: ${act.item} has a Buy on its card`).toBeGreaterThan(0);
          for (const p of prices) expect(p, `${n}: ${act.item} card`).toBe(act.price);
          g1 = buy(cfg, g, act.item, act.price, t, ev);
          if (want.has(act.item)) named.push(act.item);
        } else if (act.act === 'hire') g1 = hire(cfg, g, act.role, act.price, t, ev);
        else if (act.act === 'level') g1 = level(cfg, g, act.target, act.price, t, ev);
        expect(g1, `${n} step ${step}: ${JSON.stringify(act)} refused ${JSON.stringify(ev)}`).not.toBe(g);
        expect(cash0 - g1.cash, `${n}: charged what was shown`).toBeCloseTo(act.price, 2);
        expect(ratedIncome(Cof(cfg, g1), g1.salvage), `${n}: rated income at ${JSON.stringify(act)}`).toBeGreaterThanOrEqual(I0 - 1e-6);
        g = g1;
      }
      // in goal order: the stage's goal list's buy keys, those for sale at the start
      const order = goalSpecs(Cof(cfg, g)).stage2.map((d) => d.buy).filter((k): k is string => !!k && want.has(k));
      expect(named, n).toEqual([...new Set(order)]);
    }
  }, 900_000);
});

// ============================================================================ 28.2 a and b: the age question first; no ads under 13

const scfg = shopCfg();
const MONEY_REFS: CardRef[] = [{ kind: 'office', tab: 'rota' }, { kind: 'settings' }, { kind: 'shop' }, { kind: 'packSheet', product: 'pack2' }, { kind: 'board' }, { kind: 'awayBonus' }];
const shopish = (j: string) => /"card":\{"kind":"shop"|buyPack|buyProduct|restorePurchases|"id":"money\.shop"/.test(j);
/** A held bay with grams and a standing away offer, so that both ad buttons would show for a band that allows them. */
function withAds(g: SalvageGame): SalvageGame {
  const s = structuredClone(g.salvage);
  const grade = Object.entries(s.bays).sort((a, b) => b[1].g - a[1].g)[0][0];
  s.bays[grade].held = true;
  s.ads = { ...s.ads, awayOffer: { amount: 500, I: 1000, centred: true } };
  return { ...g, salvage: s };
}

describe('28.2 a: the age question at the second session\'s start, in every country; until a band, child-treated ads and no shop row', () => {
  it('a frozen second-session state with no band: due in every country (packs on or off), no card has a shop entry, ad requests child-treated', () => {
    const g = withAds(shopGame({ ageBand: null }));
    for (const country of ['US', 'DE', 'CH', null]) {
      expect(ageDue(scfg, g, { country }), String(country)).toBe(true);
      for (const ref of MONEY_REFS) {
        const cd = cardOf(scfg, g, ref, SHOP_NOW, { country });
        expect(cd.shop, `${ref.kind} ${country}`).toBeUndefined();
        expect(shopish(JSON.stringify(cd)), `${ref.kind} ${country}`).toBe(false);
      }
    }
    expect(shopReachable(g)).toBe(false);
    expect(cardOf(scfg, g, { kind: 'ageQuestion' }, SHOP_NOW, { country: 'DE' }).ageQuestion).toBeDefined();
    expect(adAudience(g, scfg)).toBe('child');
    expect(salvageEngineMode.adAudience!(scfg as unknown as GameConfig, g as unknown as GameState)).toBe('child');
  });

  it('before the second session nothing changes: not due, no audience; at release.stage 1 (the shipped content) never', () => {
    const g = shopGame({ ageBand: null });
    const first = { ...g, salvage: { ...g.salvage, iap: { ...g.salvage.iap, sessions2At: null } } };
    expect(ageDue(scfg, first)).toBe(false);
    expect(adAudience(first, scfg)).toBeNull();
    const cfg1 = { mode: 'salvage', salvage: SalvageSchema.parse(structuredClone((gameJson as { salvage: unknown }).salvage)), monetization: (gameJson as { monetization: unknown }).monetization } as unknown as SalvageConfig;
    expect(cfg1.salvage.iap).toBeUndefined();
    expect(ageDue(cfg1, g)).toBe(false);
    expect(adAudience(g, cfg1)).toBeNull();
  });

  it('once a band is given, the rules behave as for that band: a18 the shop and its row, no child treatment; t13 teen and no packs', () => {
    const g = withAds(shopGame({ ageBand: null }));
    const a = setAgeBand(scfg, g, 1990, SHOP_NOW, 0);
    expect(a.salvage.iap.ageBand).toBe('a18');
    expect(ageDue(scfg, a)).toBe(false);
    expect(cardOf(scfg, a, { kind: 'shop' }, SHOP_NOW, { country: 'US' }).shop?.packs).not.toBeNull();
    expect(cardOf(scfg, a, { kind: 'office', tab: 'rota' }, SHOP_NOW, { country: 'US' }).rows.map((r) => r.id)).toContain('money.shop');
    expect(cardOf(scfg, a, { kind: 'ageQuestion' }, SHOP_NOW, { country: 'US' }).ageQuestion).toBeUndefined();
    expect(adAudience(a, scfg)).toBeNull();
    expect(adsAllowed(scfg, a)).toBe(true);
    const t = setAgeBand(scfg, g, 2026 - 15, SHOP_NOW, 0);
    expect(t.salvage.iap.ageBand).toBe('t13');
    expect(adAudience(t, scfg)).toBe('teen');
    expect(cardOf(scfg, t, { kind: 'shop' }, SHOP_NOW, { country: 'US' }).shop?.packs).toBeNull();
    // the same as a state that had its band all along
    expect(JSON.stringify(cardOf(scfg, a, { kind: 'shop' }, SHOP_NOW, { country: 'US' }))).toBe(JSON.stringify(cardOf(scfg, withAds(shopGame({ ageBand: 'a18' })), { kind: 'shop' }, SHOP_NOW, { country: 'US' })));
  });
});

describe('28.2 b: under 13 no ad buttons at all (no away bonus video, no spot buyer)', () => {
  it('a18 sees both buttons on the same yard; u13 sees neither, and a press is refused', () => {
    const adult = withAds(shopGame({ ageBand: 'a18' }));
    const child = withAds(shopGame({ ageBand: 'u13' }));
    const grade = Object.entries(adult.salvage.bays).find(([, b]) => b.held)![0];
    expect(adsAllowed(scfg, adult)).toBe(true);
    expect(bonusCard(scfg, adult)).not.toBeNull();
    const spot = spotButton(scfg, adult, grade);
    expect(adsAllowed(scfg, child)).toBe(false);
    expect(adOffer(scfg, child, 'away')).toBeNull();
    expect(adOffer(scfg, child, 'spot', { grade })).toBeNull();
    expect(bonusCard(scfg, child)).toBeNull();
    expect(spotButton(scfg, child, grade)).toBeNull();
    const ev: SalvageEvent[] = [];
    expect(adPaid(scfg, child, 'away', 500, {}, child.salvage.t, ev)).toBe(child);
    expect(ev.map((e) => e.type === 'refused' && e.key)).toEqual(['nothing']);
    for (const ref of [{ kind: 'awayBonus' }, { kind: 'board' }] as const) expect(JSON.stringify(cardOf(scfg, child, ref, SHOP_NOW, { country: 'US' }))).not.toContain('watchAd');
    void spot;
  });
});
