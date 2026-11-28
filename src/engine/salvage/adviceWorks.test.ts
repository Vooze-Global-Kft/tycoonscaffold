/**
 * THE ADVICE LINE FROM THE WORKS' OPENING (s2e-advice; yard-stage2-economy.md 2.13 and 1.3's repeating goal; RULING2.md 27.2 d,
 * 27.3 D11). Rules tests on frozen test contents (lesson 4: no tuned number of the shipped content is pinned): the works'
 * content (fixtures/salvage2works.ts), the first yard's test content; one bots' state of the shipped content read at stage 2
 * (rung 3's first sitting: the normal hand, seed 1, the works opened, one 4.2-hour absence) for (d): the line is never null
 * before the top rung while something is to be bought, and names the three-axle truck (or the save-up for it) with a
 * "For now" purchase. Owner: s2e-advice.
 *
 * - (a) the best buy: shortest payback within 1.25 tau_r, the gain the one measure (levelGain for a level; for a purchase the
 *   measured gain its price is made of, content gain_h (s2e-fix1, RULING2 28.5 b), else the replay with the item bought less
 *   now), printed as that number;
 * - (b) the target: what costs more than the cash less the reserve is saved for, with its time, and a "For now" purchase the
 *   cash pays that keeps the target within the next return or pays for itself before it; the bank's sentence exactly where
 *   bank.ts loanHintDue says so;
 * - (c) waiting: the next rung's main purchase and its price under the waiting line;
 * - (e) the repeating goal names the level the line names, else the rung's tonnes to go, else nothing;
 * - (f) never a product, a pack or the shop;
 * - the first yard: no stage-2 field, the line as merged.
 */
import { describe, expect, it } from 'vitest';
import { GameConfigSchema } from '../../config/schema';
import { SalvageSchema } from '../../config/schema.salvage';
import gameJson from '../../../games/scrap-yard/game.json';
import * as E from '../economy';
import { FIXTURE_NAMES, FIXTURE_NOW, fixtureGame, withTestContent } from '../fixtures/salvage';
import { r3Works, r4Game, worksCfg } from '../fixtures/salvage2works';
import { shipped2Config } from '../fixtures/shipped2';
import { ADVICE_WINDOW, advice, adviceLine, adviceWait, boughtState, reserve } from './advice';
import { awayCapS } from './away';
import { loanHintDue } from './bank';
import { away, newBot, newSitting, playUntil, seededCfg, startGame } from './bot';
import { goalBuyNow, goalSpecs, nextGoal } from './goals';
import { hireCheck, hiredState, levelCheck, measuredGain, ratedGain, shopItems, topRungOf } from './ladder';
import { contentAt, worksOpened } from './layer';
import { roundMoney } from './money';
import { levelGainCfg, ratedIncomeCfg } from './rate';
import { productsOf } from './shop';
import type { LevelTarget, SalvageConfig, SalvageGame } from './types';

const wcfg = worksCfg();
/** The state with every goal of every list done (no goal asks to buy anything: the line's target is its own best buy). */
function goalsDone(cfg: SalvageConfig, g: SalvageGame): SalvageGame {
  const { goals, dayOne, stage2 } = goalSpecs(contentAt(cfg.salvage, g.salvage));
  return { ...g, salvage: { ...g.salvage, goals: { ...g.salvage.goals, done: [...goals, ...dayOne, ...stage2].map((d) => d.id), skipped: [] } } };
}
const C = (cfg: SalvageConfig, g: SalvageGame) => contentAt(cfg.salvage, g.salvage);
const tauOf = (cfg: SalvageConfig, g: SalvageGame) => {
  const t = C(cfg, g).tau_h?.[Math.floor(g.salvage.ladder.rung) - 1];
  return typeof t === 'number' && t > 0 ? t : Infinity;
};

/**
 * The one measure of the advice's action, recomputed from the public rules (levelGain; the replay with the item hired; for a
 * purchase, s2e-fix1 (RULING2 28.5 b): the measured gain its price is made of where the content holds one (gain_h), else the
 * replay with the item bought).
 */
function gainOf(cfg: SalvageConfig, g: SalvageGame, a: NonNullable<ReturnType<typeof advice>>['action']): number {
  if (a.act === 'level') return levelGainCfg(cfg, g, a.target);
  if (a.act === 'hire') return ratedGain(cfg, g, hiredState(g, a.role));
  return measuredGain(C(cfg, g), a.item) ?? ratedGain(cfg, g, boughtState(C(cfg, g), g, a.item));
}

/** Every hire and crew/partner level sold now with its gain (an independent list for the "shortest payback" check). */
function someCandidates(cfg: SalvageConfig, g: SalvageGame): { what: string; price: number; gain: number }[] {
  const out: { what: string; price: number; gain: number }[] = [];
  for (const role of ['hand', 'cutter', 'driver'] as const) {
    const ch = hireCheck(cfg, g, role);
    if (ch.price === null || ch.state === 'locked' || ch.state === 'top') continue;
    out.push({ what: `hire ${role}`, price: ch.price, gain: ratedGain(cfg, g, hiredState(g, role)) });
  }
  const targets: LevelTarget[] = [...g.salvage.crew.map((m) => ({ kind: 'crew', id: m.id }) as LevelTarget), ...Object.entries(g.salvage.partners).filter(([, p]) => p.open).map(([p]) => ({ kind: 'partner', partner: p }) as LevelTarget)];
  const minShare = (C(cfg, g).levels as { minShareI?: number }).minShareI ?? 0;
  const I = ratedIncomeCfg(cfg, g);
  for (const t of targets) {
    const ch = levelCheck(cfg, g, t);
    if (ch.price === null || ch.state === 'locked' || ch.state === 'top' || ch.state === 'info') continue;
    const gain = levelGainCfg(cfg, g, t);
    if (minShare > 0 && gain < minShare * I) continue;
    out.push({ what: `level ${JSON.stringify(t)}`, price: ch.price, gain });
  }
  return out.filter((x) => x.gain > 1e-6);
}

/** The promises every line from the works' opening keeps, whatever the state and the cash. */
function promises(cfg: SalvageConfig, g: SalvageGame): void {
  const a = advice(cfg, g, 0);
  if (!a) return;
  const w = a.works!;
  expect(w).toBeDefined();
  // One measure: the gain printed is the gain recomputed from the public rules; the payback is price over it.
  expect(w.gain_h).toBeGreaterThan(0);
  expect(w.gain_h).toBeCloseTo(gainOf(cfg, g, a.action), 6);
  expect(w.payback_h).toBeCloseTo(a.price / w.gain_h, 9);
  expect(w.gain).toEqual({ key: 'advice.gain', args: { x: { money: roundMoney(w.gain_h) } } });
  expect(a.price).toBe(a.action.price);
  // (f) never a product of the store, a pack or the shop.
  const products = new Set(productsOf(cfg).map((p) => (p as { id?: string }).id ?? ''));
  if (a.action.act === 'buy') expect(products.has(a.action.item)).toBe(false);
  expect(['buy', 'hire', 'level']).toContain(a.action.act);
  const room = g.cash - reserve(cfg, g);
  const tau = tauOf(cfg, g);
  if (w.saveUp_s === null) {
    // (a) the cash pays it now, within the window, and no hire or level sold now pays back sooner within the line's budget.
    expect(a.price).toBeLessThanOrEqual(room + 1e-9);
    const goalItem = (a.action.act === 'buy' ? a.action.item : a.action.act === 'hire' ? null : null) === goalBuyNow(cfg, g) && goalBuyNow(cfg, g) !== null;
    // Within the window, unless it is the stage's next goal purchase named because nothing in the window is.
    if (!goalItem) expect(w.payback_h).toBeLessThanOrEqual(ADVICE_WINDOW * tau + 1e-9);
    expect(a.loanHint).toBeUndefined();
    expect(w.meanwhile).toBeNull();
    const budget = g.cash + cfg.salvage.advice.minutes * ratedIncomeCfg(cfg, g) - reserve(cfg, g);
    for (const x of someCandidates(cfg, g)) if (x.price <= Math.min(room, budget) && x.price / x.gain <= ADVICE_WINDOW * tau) expect(x.price / x.gain, x.what).toBeGreaterThanOrEqual(w.payback_h - 1e-9);
  } else {
    // (b) saving: it costs more than the cash less the reserve; its time; the bank's sentence by the bank's own predicate.
    expect(a.price).toBeGreaterThan(room);
    expect(a.line.key).toBe('advice.saveFor');
    expect(w.save).toEqual({ key: 'advice.saveTime', args: { t: { secs: w.saveUp_s } } });
    expect(!!a.loanHint).toBe(a.action.act === 'buy' && loanHintDue(cfg, g, a.action.item, w.gain_h));
    const m = w.meanwhile;
    if (m) {
      expect(m.line.key).toBe('advice.meanwhile');
      expect(m.price).toBeLessThanOrEqual(room + 1e-9);
      expect(m.gain_h).toBeCloseTo(gainOf(cfg, g, m.action), 6);
      expect(m.price / m.gain_h).toBeLessThanOrEqual(ADVICE_WINDOW * tau + 1e-9);
      const I = ratedIncomeCfg(cfg, g);
      const onReturn = g.cash - m.price + I * (awayCapS(cfg, g) / 3600) >= a.price - 1e-9;
      const noDelay = m.price / m.gain_h <= w.saveUp_s / 3600 + 1e-9;
      expect(onReturn || noDelay).toBe(true);
    }
  }
}

describe("the first yard (the works not opened): the line as merged, no stage-2 field", () => {
  const cfg = withTestContent(GameConfigSchema.parse(gameJson));
  const base = () => E.createInitialState(cfg, FIXTURE_NOW);
  for (const name of FIXTURE_NAMES) {
    it(`${name}: no works field, no loan sentence, no waiting line`, () => {
      const g = fixtureGame(name, base(), FIXTURE_NOW) as SalvageGame;
      expect(worksOpened(g.salvage)).toBe(false);
      for (const cash of [0, 1000, 1e5]) {
        const h = { ...g, cash };
        const a = advice(cfg, h, FIXTURE_NOW);
        expect(a && 'works' in a).toBeFalsy();
        expect(a?.loanHint).toBeUndefined();
        expect(adviceWait(cfg, h)).toBeNull();
        expect(adviceLine(cfg, h, FIXTURE_NOW)).toEqual(a);
      }
    });
  }
});

describe("from the works' opening: the line's promises on the frozen works content", () => {
  for (const [name, mk] of [['r3Works', r3Works], ['r4Game', r4Game]] as const) {
    it(`${name}: at every cash the line keeps (a) or (b), one measure, never a product`, () => {
      const g0 = mk();
      expect(worksOpened(g0.salvage)).toBe(true);
      for (const cash of [0, 500, 2000, 30_000, 1e6, 1e9]) promises(wcfg, { ...g0, cash });
    }, 120_000);
  }
  it('r4Game: with every purchase affordable the line names a purchase the cash pays (a), never a save-up', () => {
    const g = { ...r4Game(), cash: 1e12 };
    const a = advice(wcfg, g, 0);
    if (a) expect(a.works!.saveUp_s).toBeNull();
  }, 120_000);
  it('s2i-levels (RULING2.md 30.3): a level of the book is named by its payback (the book\'s gain, the price over it); the promises hold with a book', () => {
    const g0 = goalsDone(wcfg, r4Game());
    const driver = g0.salvage.crew.find((m) => m.role === 'driver')!;
    const t: LevelTarget = { kind: 'crew', id: driver.id };
    const book = { driver: { s1: 0.5, d: 0.9, from: 1, to: 40 } }; // large: tau_r x gain above the floor at a tenth of tau_r
    // every shop item dark (its gate past the ladder) and tau_r a tenth (a hire's payback on its replay gain outside the window):
    // what pays back within the window is the book's level, at tau_r
    const dark = <T extends { gate?: unknown }>(xs: T[] | undefined) => xs?.map((i) => ({ ...i, gate: 'rung99' }));
    const wl = wcfg.salvage.worksLayer as { shop?: { gate?: unknown }[] } | undefined;
    const cfg = {
      ...wcfg,
      salvage: {
        ...wcfg.salvage,
        shop: dark(wcfg.salvage.shop),
        ...(wl ? { worksLayer: { ...wl, shop: dark(wl.shop) } } : {}),
        tau_h: wcfg.salvage.tau_h?.map((x) => (x === null ? null : x / 10)),
        levels: { ...wcfg.salvage.levels, minShareI: 0.01, book },
      },
    } as SalvageConfig;
    for (const cash of [0, 30_000, 1e6, 1e9]) promises(cfg, { ...g0, cash });
    const g = { ...g0, cash: 1e9 };
    const a = advice(cfg, g, 0)!;
    expect(a.action).toMatchObject({ act: 'level', target: t });
    const gain = levelGainCfg(cfg, g, t);
    expect(gain).toBeGreaterThan(0);
    expect(a.works!.gain_h).toBeCloseTo(gain, 6);
    expect(a.works!.payback_h).toBeCloseTo(a.price / gain, 9);
    expect(a.price).toBe(levelCheck(cfg, g, t).price);
  }, 120_000);
});

describe('(c) waiting: the next rung\'s main purchase under the waiting line', () => {
  /** The works content with tau_r so short that nothing pays back (advice null), and the induction furnace gated at rung 4. */
  const waitCfg = (() => {
    const s = wcfg.salvage;
    const layer = s.worksLayer!;
    return { ...wcfg, salvage: { ...s, tau_h: s.tau_h?.map(() => 1e-9) ?? [1e-9, 1e-9, 1e-9, 1e-9, 1e-9], worksLayer: { ...layer, shop: layer.shop.map((it) => (it.key === 'induction' ? { ...it, gate: 'rung4' } : it)) } } } as SalvageConfig;
  })();
  it('names the item of rung 4 with its content price ("Next: {item} · {x}")', () => {
    const g = goalsDone(waitCfg, { ...r3Works(), cash: 0 });
    expect(goalBuyNow(waitCfg, g)).toBeNull();
    expect(advice(waitCfg, g, 0)).toBeNull();
    const w = adviceLine(waitCfg, g, 0);
    if (!w || !('kind' in w)) throw new Error('expected a waiting line');
    expect(w.rung).toBe(4);
    const it = shopItems(C(waitCfg, g)).find((x) => x.key === 'induction')!;
    expect(w.next).toEqual({ key: 'advice.buy', args: { item: { text: 'title.works.induction' }, x: { money: roundMoney(it.price) } } });
  });
  it('a rung that opens no purchase: no second line', () => {
    const g = { ...r3Works(), cash: 0 };
    // The frozen works content gates every plate at rung 3: rung 4 opens nothing to buy.
    expect(shopItems(C(wcfg, g)).some((x) => x.gate === 'rung4')).toBe(false);
    expect(adviceWait(wcfg, g)?.next ?? null).toBeNull();
  });
});

describe('(e) the repeating goal from the works\' opening', () => {
  /** The works content with a repeating goal at the end of the stage's list (the frozen list has none; the shipped list ends with one). */
  const REPEAT = { id: 'widenTop', text: 'goal.widen', target: 'advice', via: null, done: 'repeat', buy: null, optional: false, repeat: true, stall: null };
  const withRepeat = (cfg: SalvageConfig) => ({ ...cfg, salvage: { ...cfg.salvage, stage2: [...((cfg.salvage as { stage2?: unknown[] }).stage2 ?? []), REPEAT] } }) as unknown as SalvageConfig;
  const rcfg = withRepeat(wcfg);
  const none = withRepeat({ ...wcfg, salvage: { ...wcfg.salvage, tau_h: wcfg.salvage.tau_h?.map(() => 1e-9) ?? [1e-9, 1e-9, 1e-9, 1e-9, 1e-9] } } as SalvageConfig);
  /** The state with every goal done but the stage list's repeating goal `rid` (and, when `last`, nothing after it). */
  function atRepeat(cfg: SalvageConfig, g0: SalvageGame, last: boolean): { g: SalvageGame; rid: string } {
    const { goals, dayOne, stage2 } = goalSpecs(C(cfg, g0));
    const reps = stage2.filter((d) => d.repeat || d.done === 'repeat');
    const r = last ? reps[reps.length - 1] : reps[0];
    expect(r).toBeDefined();
    const idx = stage2.indexOf(r);
    const done = [...goals, ...dayOne, ...stage2.filter((d, i) => i < idx || (last && i !== idx))].map((d) => d.id);
    return { g: { ...g0, salvage: { ...g0.salvage, goals: { ...g0.salvage.goals, done, skipped: [] } } }, rid: r.id };
  }
  it('names the level or the purchase the advice line names', () => {
    const { g: g1, rid } = atRepeat(rcfg, { ...r4Game(), cash: 1e7 }, false);
    const a = advice(rcfg, g1, 0);
    const goal = nextGoal(rcfg, g1);
    expect(a).not.toBeNull();
    if (!a) return;
    expect(goal?.id).toBe(rid);
    expect(goal?.text).toEqual({ key: a.action.act === 'level' ? 'goal.widenLevel' : 'goal.widen', args: { item: a.line.args!.item } });
  }, 120_000);
  it('nothing named: "Rung {n}: {t} to go" from the waiting line\'s tonnes', () => {
    const { g, rid } = atRepeat(none, { ...r3Works(), cash: 0 }, true);
    expect(advice(none, g, 0)).toBeNull();
    const w = adviceWait(none, g)!;
    expect(w.missing_g).toBeGreaterThan(0);
    const goal = nextGoal(none, g);
    expect(goal?.id).toBe(rid);
    expect(goal?.text).toEqual({ key: 'goal.rungToGo', args: { n: { n: w.rung }, t: { tonnes_g: w.missing_g } } });
  });
  it('nothing named at the stage\'s top: no goal card (never "Buy next: Another skip")', () => {
    const { g: g1 } = atRepeat(none, { ...r3Works(), cash: 0 }, true);
    const top = topRungOf(C(none, g1));
    const g = { ...g1, salvage: { ...g1.salvage, ladder: { ...g1.salvage.ladder, rung: top } } };
    expect(advice(none, g, 0)).toBeNull();
    expect(adviceWait(none, g)).toBeNull();
    expect(nextGoal(none, g)).toBeNull();
  });
});

/** (d) One bots' state of the shipped content at stage 2: the normal hand, seed 1, played to the works' opening, then rung 3's first sitting after a 4.2-hour absence (the design's S1). */
let BOT: { cfg: SalvageConfig; g: SalvageGame } | null = null;
function botS1(): { cfg: SalvageConfig; g: SalvageGame } {
  if (BOT) return BOT;
  const NOW = Date.UTC(2026, 10, 25, 9, 0, 0);
  const cfg = seededCfg(shipped2Config((x) => SalvageSchema.parse(x)), 1);
  const b = newBot(cfg, startGame(cfg, NOW), NOW, { hand: 'normal', habit: 'goal', route: 'A', seed: 1 } as never);
  playUntil(b, (bb) => worksOpened(bb.g.salvage), 3600);
  newSitting(b);
  away(b, 4.2 * 3600);
  return (BOT = { cfg, g: b.g });
}

describe("(d) a bots' state at rung 3's first sitting (shipped content read at stage 2)", () => {
  it('the line is not null: it names the three-axle truck or the save-up for it, and a "For now" purchase where the cash allows one', () => {
    const { cfg, g } = botS1();
    expect(worksOpened(g.salvage)).toBe(true);
    expect(Math.floor(g.salvage.ladder.rung)).toBe(3);
    const a = advice(cfg, g, 0);
    expect(a).not.toBeNull();
    promises(cfg, g);
    const goalKey = goalBuyNow(cfg, g);
    // The goal list's second goal buys the three-axle truck; while it is the goal and dearer than the cash, the line saves for it.
    if (goalKey === 'truckBridge' && a!.price > g.cash - reserve(cfg, g)) {
      expect(a!.action).toMatchObject({ act: 'buy', item: 'truckBridge' });
      expect(a!.works!.saveUp_s).toBeGreaterThan(0);
      // a purchase the cash pays now that keeps the truck within the next return exists on this state (a hire at the first yard's price)
      expect(a!.works!.meanwhile).not.toBeNull();
    }
  }, 240_000);
  it('the letter seen: the bank\'s sentence exactly where bank.ts loanHintDue holds for the truck with the line\'s own gain', () => {
    const { cfg, g: g0 } = botS1();
    const g = { ...g0, salvage: { ...g0.salvage, bank: { ...g0.salvage.bank, letterSeen: true } } };
    const a = advice(cfg, g, 0)!;
    promises(cfg, g);
    if (a.action.act === 'buy' && a.works!.saveUp_s !== null) expect(!!a.loanHint).toBe(loanHintDue(cfg, g, a.action.item, a.works!.gain_h));
    // With cash below every price of the goal's item, a poorer yard still saves for it (never null before the top rung).
    const poor = { ...g, cash: 0 };
    expect(advice(cfg, poor, 0)).not.toBeNull();
  }, 240_000);
});
