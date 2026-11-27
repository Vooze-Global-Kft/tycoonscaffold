/**
 * s2c-fix-money (RULING2 22): the money's findings of the three attacks on stage 2, fixed. Frozen test contents (lesson
 * 4: no tuned number is pinned) except where a test pins the first yard AS MERGED (release.stage 1 on the shipped
 * game.json, and the first yard's frozen states on the frozen test content, whose prices and advice are those of the
 * code before this pass: measured against commit dfd22be's ladder.ts, rate.ts and advice.ts, the same to the cent).
 * M2 setAgeBand without a shop; M3 what a restart keeps; M6 Help's pack pages; M8 the spot buyer's minimum; M10 the
 * ceiling before the money; E3 a partner's level from its rated gain; E6 I never falls on a purchase; E7 the advice
 * line by payback. M4 is src/modes/salvage/actions.open.test.ts (through the mode's action).
 */
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GameConfigSchema } from '../../config/schema';
import { SalvageSchema } from '../../config/schema.salvage';
import gameJson from '../../../games/scrap-yard/game.json';
import * as E from '../economy';
import { FIXTURE_NAMES, FIXTURE_NOW, fixtureGame, stage2Cfg, stage2Game, withTestContent } from '../fixtures/salvage';
import { firstHour2min, shopCfg, shopGame, SHOP_NOW, r3open, moneyCfg } from '../fixtures/salvage2money';
import { r4Game, worksCfg } from '../fixtures/salvage2works';
import { setAgeBand, adPaid } from './actionsMoney';
import { advice, levelBinds, reserve } from './advice';
import { incomeRate } from './tick';
import { adDay, adOffer, dayRoom, spotButton, sellNow } from './ads';
import { begin, finish } from './clock';
import { buy, hire, level } from './actions';
import { contentAt, worksOpened } from './layer';
import { buyCheck, hireCheck, hiredState, levelCheck, levelled, levelPrice, ratedGain, shopItems } from './ladder';
import { levelGain, own, ratedIncome, replayIncome } from './rate';
import { adAudience, headroomU, packsHelpShown } from './shop';
import { restartKeeps } from './state2Money';
import { newBot, playTo, startGame } from './bot';
import type { LevelTarget, SalvageConfig, SalvageEvent, SalvageGame } from './types';

const RAW = JSON.parse(fs.readFileSync(new URL('../../../games/scrap-yard/game.json', import.meta.url), 'utf8'));
const NOW = Date.UTC(2026, 10, 27, 9);
/** The shipped content as the owner's phone reads it (release.stage as shipped: 1). */
function shippedCfg(): SalvageConfig {
  return { mode: 'salvage', salvage: SalvageSchema.parse(structuredClone(RAW.salvage)), monetization: RAW.monetization } as unknown as SalvageConfig;
}

describe('the first yard on the owner\'s phone (the shipped content at release.stage 1): every rule of this pass stays dark', () => {
  it('an hour of the normal bot: the works never open (so the partner level price, the advice line, the ceiling\'s order, I\'s envelope and the levels\' "not the bottleneck" all take the merged path), no age band, no ad, no money of stage 2', () => {
    const cfg1 = shippedCfg();
    const b = newBot(cfg1, startGame(cfg1, NOW), NOW, { hand: 'normal', habit: 'goal', route: 'A', seed: 611 } as never);
    let opened = false;
    playTo(b, 60 * 60, (bb) => {
      if (worksOpened(bb.g.salvage)) opened = true;
    });
    expect(opened).toBe(false);
    expect(b.g.salvage.iap.ageBand).toBeNull();
    expect(b.g.salvage.ads.awayOffer).toBeNull();
    // The facade's I reads contentAt, which is the base content itself in the first yard.
    expect(contentAt(cfg1.salvage, b.g.salvage)).toBe(cfg1.salvage);
    expect(ratedIncome(cfg1.salvage, b.g.salvage)).toBe(replayIncome(cfg1.salvage, b.g.salvage));
  }, 120_000);
});

describe('M2: setAgeBand where the content has no shop (release.stage 1)', () => {
  it('the shipped content at stage 1: a refusal `nothing`, the SAME state, no band kept, the ad audience as the first yard\'s', () => {
    const cfg1 = shippedCfg();
    expect(cfg1.salvage.release?.stage ?? 1).toBe(1);
    const g = startGame(cfg1, NOW);
    const ev: SalvageEvent[] = [];
    const out = setAgeBand(cfg1, g, 2016, NOW, 0, ev);
    expect(out).toBe(g);
    expect(ev).toEqual([{ type: 'refused', key: 'nothing', args: {}, retry: null }]);
    expect(adAudience(out)).toBeNull();
  });
  it('a content with a shop still keeps the band once (the frozen shop content)', () => {
    const cfg = shopCfg();
    const g = shopGame({ ageBand: null });
    const ev: SalvageEvent[] = [];
    const out = setAgeBand(cfg, g, 2016, SHOP_NOW, 0, ev);
    expect(out.salvage.iap.ageBand).toBe('u13');
    expect(ev).toEqual([{ type: 'ageAsked' }]);
  });
});

describe('M3: what was paid for and what a parent answered survive "Start the yard again" (restartKeeps)', () => {
  it('at rung 4 with two looks, No ad videos, a teen\'s band and the lock on: all kept; scrip, quotes and the ledger lost', () => {
    const cfg = shopCfg();
    const g0 = shopGame({ ageBand: 't13', cash: 123_456 });
    const ent = { noAds: true, skipRewarded: true, products: ['colour1', 'dressing2', 'noAds'], multipliers: {} };
    const old = {
      ...g0,
      entitlements: ent,
      salvage: {
        ...g0.salvage,
        iap: { ...g0.salvage.iap, looks: { colour: 'colour1', dressing: 'dressing2', plaque: null, sign: 'rung3' }, hidden: { codeHash: 'f1:abc' }, pending: [{ id: 'q1', product: 'pack2', S: 10, I: 5, atMs: 1, askedMs: null, known: [], state: 'waiting' as const, wait: 'pending' as const }], ledger: [{ txId: 't', product: 'pack2', S: 10, atMs: 1 }] },
      },
    } as unknown as SalvageGame;
    const fresh = startGame(cfg, SHOP_NOW);
    const out = restartKeeps(old, fresh) as SalvageGame;
    expect(out.entitlements).toEqual(ent);
    expect(out.entitlements).not.toBe(ent);
    expect(out.salvage.iap.ageBand).toBe('t13');
    expect(out.salvage.iap.hidden).toEqual({ codeHash: 'f1:abc' });
    // An owned product look is kept; an earned sign style (a rung's) is earned again.
    expect(out.salvage.iap.looks).toEqual({ colour: 'colour1', dressing: 'dressing2', plaque: null, sign: null });
    expect(out.salvage.iap.pending).toEqual([]);
    expect(out.salvage.iap.ledger).toEqual([]);
    expect(out.cash).toBe(fresh.cash);
    expect(out.salvage.ladder.rung).toBe(fresh.salvage.ladder.rung);
    expect(adAudience(out)).toBe('teen');
  });
  it('nothing to keep: the same fresh object', () => {
    const cfg = shopCfg();
    const fresh = startGame(cfg, SHOP_NOW);
    const old = { ...startGame(cfg, SHOP_NOW), entitlements: fresh.entitlements };
    const out = restartKeeps(old, fresh);
    expect(out.salvage?.iap).toEqual(fresh.salvage.iap);
  });
});

describe('M6: Help\'s three pack pages only where pack rows could show', () => {
  it('firstHour2min (before the second session): no pack page, whatever the country', () => {
    const { cfg, closed } = firstHour2min();
    expect(closed.salvage.iap.sessions2At).toBeNull();
    for (const country of ['US', 'GB', null]) expect(packsHelpShown(cfg, closed, { country })).toBe(false);
  });
  it('from the second session: shown for an adult and before the age question; never for a child\'s or a teen\'s band, nor for a country with packs off', () => {
    const cfg = shopCfg();
    expect(packsHelpShown(cfg, shopGame({ ageBand: 'a18' }), { country: 'US' })).toBe(true);
    expect(packsHelpShown(cfg, shopGame({ ageBand: null }), { country: 'US' })).toBe(true);
    expect(packsHelpShown(cfg, shopGame({ ageBand: 'u13' }), { country: 'US' })).toBe(false);
    expect(packsHelpShown(cfg, shopGame({ ageBand: 't13' }), { country: 'US' })).toBe(false);
    expect(packsHelpShown(cfg, shopGame({ ageBand: 'a18' }), { country: null })).toBe(false);
  });
});

describe('M8: an offer too small to matter is not made (ads.minOffer_min)', () => {
  function held(cfg: SalvageConfig): { g: SalvageGame; grade: string } {
    const g = shopGame();
    const s = structuredClone(g.salvage);
    const grade = Object.keys(s.bays).find((k) => k === 'li') ?? Object.keys(s.bays)[0];
    s.bays[grade] = { ...s.bays[grade], held: true, g: 200_000, aside: [] };
    void cfg;
    return { g: { ...g, salvage: s }, grade };
  }
  const withMin = (min: number): SalvageConfig => {
    const c = shopCfg();
    return { ...c, salvage: { ...c.salvage, ads: { ...c.salvage.ads!, minOffer_min: min } } } as SalvageConfig;
  };
  it('below the minimum: no button, and adPaid refuses `nothing` (shown = applied); at or above it: the button as before', () => {
    const base = shopCfg();
    const { g, grade } = held(base);
    const btn = spotButton(base, g, grade);
    expect(btn).not.toBeNull();
    const amount = (btn!.action as { amount: number }).amount;
    // A minimum just above what the button would pay: no offer.
    const I = ratedIncome(contentAt(base.salvage, g.salvage), g.salvage);
    const above = withMin(((amount + 0.02) / I) * 60);
    expect(spotButton(above, g, grade)).toBeNull();
    const ev: SalvageEvent[] = [];
    expect(adPaid(above, g, 'spot', amount, { grade, sell: sellNow(above, g, grade)! }, g.salvage.t, ev)).toBe(g);
    expect(ev.at(-1)).toMatchObject({ type: 'refused', key: 'nothing' });
    // A minimum at or under it: the same button.
    expect(spotButton(withMin(((amount - 0.02) / I) * 60), g, grade)).toEqual(btn);
    expect(spotButton(withMin(0), g, grade)).toEqual(btn);
  });
});

describe('M8: the day\'s ceiling holds at every rung (ads.ts dayRoom)', () => {
  it('a short day (the day\'s ads counted at their caps over maxDayShare of it): the away bonus and the spot buyer only while they fit; a long day as before', () => {
    const base = shopCfg();
    const d = base.salvage.ads!;
    const g = shopGame();
    const rung = g.salvage.ladder.rung;
    const withDay = (h: number): SalvageConfig => ({ ...base, salvage: { ...base.salvage, ads: { ...d, dayHours_h: d.dayHours_h.map((x, i) => (i === rung - 1 ? h : x)) } } }) as SalvageConfig;
    // A day in which exactly one spot buyer fits and no away bonus.
    const oneSpot = (d.spotCap_min + 0.5) / (60 * d.maxDayShare);
    const c1 = withDay(oneSpot);
    expect(d.awayCap_min).toBeGreaterThan(d.spotCap_min + 0.5);
    expect(dayRoom(c1.salvage, g, 'away')).toBe(false);
    expect(dayRoom(c1.salvage, g, 'spot')).toBe(true);
    const used = { ...g, salvage: { ...g.salvage, ads: { ...g.salvage.ads, day: adDay(c1.salvage, g), spotUsed: 1, awayUsed: 0 } } };
    expect(dayRoom(c1.salvage, used, 'spot')).toBe(false);
    expect(adOffer(c1, used, 'spot', { grade: Object.keys(g.salvage.bays)[0] })).toBeNull();
    // A day long enough for every ad of the content: always room until the counts end.
    const c2 = withDay((d.awayCap_min * d.awayPerDay + d.spotCap_min * d.spotPerDay) / (60 * d.maxDayShare) + 1);
    expect(dayRoom(c2.salvage, g, 'away')).toBe(true);
    expect(dayRoom(c2.salvage, { ...g, salvage: { ...g.salvage, ads: { ...g.salvage.ads, day: adDay(c2.salvage, g), spotUsed: d.spotPerDay - 1, awayUsed: d.awayPerDay } } }, 'spot')).toBe(true);
  });
});

describe('M10: the ceiling before the money, from the works\' opening (headroom U never depends on the cash)', () => {
  it('a ceiling-bound works yard: U with cash 0 equals U with cash 10^9, and a ceiling refusal reads the same at both', async () => {
    const { ratedCapacity } = await import('./rate');
    const base = shopCfg();
    const g = shopGame({ cash: 0 });
    const R0 = ratedCapacity(base, g);
    const cfg = { ...base, salvage: { ...base.salvage, ceilings_t_h: base.salvage.ceilings_t_h.map(() => R0) } } as SalvageConfig;
    const u0 = headroomU(cfg, { ...g, cash: 0 });
    const u1 = headroomU(cfg, { ...g, cash: 1e9 });
    expect(u0).toBe(u1);
    let ceiled = 0;
    for (const role of ['hand', 'cutter', 'driver'] as const) {
      const a = hireCheck(cfg, { ...g, cash: 0 }, role);
      const b = hireCheck(cfg, { ...g, cash: 1e9 }, role);
      expect(a.refusal?.key === 'ceiling').toBe(b.refusal?.key === 'ceiling');
      if (b.refusal?.key === 'ceiling') ceiled++;
    }
    const targets: LevelTarget[] = [...g.salvage.crew.map((m) => ({ kind: 'crew', id: m.id }) as LevelTarget), ...Object.keys(g.salvage.partners).map((p) => ({ kind: 'partner', partner: p }) as LevelTarget)];
    for (const t of targets) {
      const a = levelCheck(cfg, { ...g, cash: 0 }, t);
      const b = levelCheck(cfg, { ...g, cash: 1e9 }, t);
      expect(a.refusal?.key === 'ceiling').toBe(b.refusal?.key === 'ceiling');
      if (b.refusal?.key === 'ceiling') {
        ceiled++;
        expect(a.state).toBe('locked');
      }
    }
    expect(ceiled).toBeGreaterThan(0);
  });
  it('the first yard (the works not opened): the money first, as merged', async () => {
    const { ratedCapacity } = await import('./rate');
    const cfg0 = withTestContent(GameConfigSchema.parse(gameJson));
    const g = fixtureGame('back', E.createInitialState(cfg0, FIXTURE_NOW), FIXTURE_NOW) as SalvageGame;
    const R0 = ratedCapacity(cfg0, g);
    const cfg = { ...cfg0, salvage: { ...cfg0.salvage, ceilings_t_h: cfg0.salvage.ceilings_t_h.map(() => R0) } } as SalvageConfig;
    let seen = 0;
    const targets: LevelTarget[] = [...g.salvage.crew.map((m) => ({ kind: 'crew', id: m.id }) as LevelTarget), ...Object.keys(g.salvage.partners).map((p) => ({ kind: 'partner', partner: p }) as LevelTarget)];
    for (const t of targets) {
      const rich = levelCheck(cfg, { ...g, cash: 1e9 }, t);
      if (rich.refusal?.key !== 'ceiling') continue;
      seen++;
      expect(levelCheck(cfg, { ...g, cash: 0 }, t).refusal?.key).toBe('cash');
    }
    for (const role of ['hand', 'cutter', 'driver'] as const) {
      const rich = hireCheck(cfg, { ...g, cash: 1e9 }, role);
      if (rich.refusal?.key !== 'ceiling') continue;
      seen++;
      expect(hireCheck(cfg, { ...g, cash: 0 }, role).refusal?.key).toBe('cash');
    }
    expect(seen).toBeGreaterThan(0);
  });
});

/** The first yard's partner level prices and advice before this pass (commit dfd22be's code, the frozen test content). */
const FIRST_YARD_PINS: Record<string, { prices: Record<string, number | null>; advice: unknown[] }> = JSON.parse(
  '{"fresh":{"prices":{"partnerFarm":null,"partnerDemolition":null},"advice":[null,{"act":"buy","item":"sack","price":50},{"act":"buy","item":"sack","price":50}]},"m5":{"prices":{"partnerFarm":null,"partnerDemolition":null},"advice":[null,{"act":"buy","item":"trolley","price":300},{"act":"buy","item":"trolley","price":300}]},"m15":{"prices":{"partnerFarm":1000,"partnerDemolition":440},"advice":[null,{"act":"level","target":{"kind":"partner","partner":"partnerDemolition"},"price":440},{"act":"level","target":{"kind":"partner","partner":"partnerDemolition"},"price":440}]},"m30":{"prices":{"partnerFarm":1000,"partnerDemolition":440},"advice":[{"act":"level","target":{"kind":"crew","id":"driver.0"},"price":50},{"act":"level","target":{"kind":"crew","id":"driver.0"},"price":50},{"act":"level","target":{"kind":"crew","id":"driver.0"},"price":50}]},"back":{"prices":{"partnerFarm":1000,"partnerDemolition":440},"advice":[null,{"act":"level","target":{"kind":"crew","id":"hand.0"},"price":670},{"act":"level","target":{"kind":"crew","id":"hand.0"},"price":670}]}}',
);

describe('E3: a partner\'s level costs what it earns, from the works\' opening; the first yard as merged', () => {
  it('the first yard\'s frozen states: partner level prices and the advice line exactly as before this pass', () => {
    const cfg = withTestContent(GameConfigSchema.parse(gameJson));
    for (const n of FIXTURE_NAMES) {
      const g = fixtureGame(n, E.createInitialState(cfg, FIXTURE_NOW), FIXTURE_NOW) as SalvageGame;
      const prices: Record<string, number | null> = {};
      for (const pid of Object.keys(g.salvage.partners)) prices[pid] = levelPrice(cfg, g, { kind: 'partner', partner: pid });
      expect({ n, prices }).toEqual({ n, prices: FIRST_YARD_PINS[n].prices });
      expect({ n, advice: [0, 1000, 1e5].map((cash) => advice(cfg, { ...g, cash }, FIXTURE_NOW)?.action ?? null) }).toEqual({ n, advice: FIRST_YARD_PINS[n].advice });
    }
  });
  it('stage 2 before the works open (r3, not opened): the first yard\'s rule (levels.margin_per_kg), not the rated gain', () => {
    const c2 = stage2Cfg('r3');
    const g = stage2Game('r3');
    expect(g.salvage.counts?.bathSet).toBeUndefined();
    expect(levelPrice(c2, g, { kind: 'partner', partner: 'partnerFarm' })).toBe(2200);
    expect(levelPrice(c2, g, { kind: 'partner', partner: 'partnerDemolition' })).toBe(2400);
  });
  it('the works open (r4): s2e-levels replaced this rule (RULING2 27.2 c, 27.3 D5): price = roundPrice(max(levels.floor x floorGrowth^(L-1), tau_r x levelGain)), sold only while levelGain >= levels.minShareI x I (else no price: "Not the limit now")', () => {
    const cfg = worksCfg();
    const g = r4Game();
    const c = contentAt(cfg.salvage, g.salvage);
    const rung = g.salvage.ladder.rung;
    const tauR = c.tau_h?.[rung - 1] as number;
    const lv = c.levels as { floor?: number; floorGrowth?: number; minShareI?: number };
    const round = (v: number) => Math.max(50, v < 1000 ? Math.round(v / 10) * 10 : Math.round(v / 100) * 100);
    const Inow = ratedIncome(c, g.salvage);
    let n = 0;
    for (const [pid, p] of Object.entries(g.salvage.partners)) {
      if (!p.open) continue;
      const t: LevelTarget = { kind: 'partner', partner: pid };
      const L = p.level;
      const dI = levelGain(c, g.salvage, t);
      const sold = dI > 1e-6 && dI >= (lv.minShareI ?? 0) * Inow - 1e-9;
      const want = sold ? round(Math.max(tauR * dI, (lv.floor ?? 0) * (lv.floorGrowth ?? 1) ** (L - 1))) : null;
      expect({ pid, price: levelPrice(cfg, g, t) }).toEqual({ pid, price: want });
      n++;
    }
    expect(n).toBeGreaterThan(0);
  });
});

/** Every purchase, hire and level one step from g (cash plenty), each with its arrival landed. */
function steps(cfg: SalvageConfig, g0: SalvageGame): [string, SalvageGame][] {
  const g = { ...g0, cash: 1e12 };
  const t = g.salvage.t;
  const land = (h: SalvageGame): SalvageGame => {
    if (!h.salvage.arriving.length) return h;
    const x = begin(cfg, h, [], false);
    for (const a of [...x.s.arriving]) own(x, a.item, x.s.t);
    x.s.arriving = [];
    return finish(h, x);
  };
  const out: [string, SalvageGame][] = [];
  for (const role of ['hand', 'cutter', 'driver'] as const) {
    const ck = hireCheck(cfg, g, role);
    if (ck.price !== null && !ck.refusal) out.push([`hire ${role}`, land(hire(cfg, g, role, ck.price, t))]);
  }
  const targets: LevelTarget[] = [...g.salvage.crew.map((m) => ({ kind: 'crew', id: m.id }) as LevelTarget), ...(['stripper', 'bench', 'crucible'] as const).map((m) => ({ kind: 'machine', machine: m }) as LevelTarget), ...Object.keys(g.salvage.partners).map((p) => ({ kind: 'partner', partner: p }) as LevelTarget)];
  for (const tg of targets) {
    const ck = levelCheck(cfg, g, tg);
    if (ck.price !== null && !ck.refusal) out.push([`level ${JSON.stringify(tg)}`, land(level(cfg, g, tg, ck.price, t))]);
  }
  for (const it of shopItems(contentAt(cfg.salvage, g.salvage))) {
    if (it.kind === 'crew' || it.kind === 'works') continue;
    const ck = buyCheck(cfg, g, it.key);
    if (ck.price !== null && !ck.refusal) out.push([`buy ${it.key}`, land(buy(cfg, g, it.key, ck.price, t))]);
  }
  return out;
}

describe('E6: rated income never falls when the yard gains (the frozen stage-2 states with the works open)', () => {
  for (const [name, mk] of [['r3open', () => ({ cfg: moneyCfg(), g: r3open() })], ['r4', () => ({ cfg: worksCfg(), g: r4Game() })], ['shopGame', () => ({ cfg: shopCfg(), g: shopGame() })]] as const) {
    it(`${name}: I(after) >= I(before) for every purchase, hire and level one step`, () => {
      const { cfg, g } = mk();
      expect(g.salvage.counts?.bathSet).not.toBeUndefined();
      const I = (h: SalvageGame) => ratedIncome(contentAt(cfg.salvage, h.salvage), h.salvage);
      const I0 = I(g);
      const falls: string[] = [];
      const all = steps(cfg, g);
      expect(all.length).toBeGreaterThan(0);
      for (const [what, h] of all) if (I(h) < I0 - 0.005) falls.push(`${what}: ${I0} -> ${I(h)}`);
      expect(falls).toEqual([]);
    }, 60_000);
  }
  it('the envelope is never below the replay, and equals it in the first yard', () => {
    const cfg = worksCfg();
    const g = r4Game();
    const c = contentAt(cfg.salvage, g.salvage);
    expect(ratedIncome(c, g.salvage)).toBeGreaterThanOrEqual(replayIncome(c, g.salvage) - 1e-9);
    const cfg1 = withTestContent(GameConfigSchema.parse(gameJson));
    for (const n of FIXTURE_NAMES) {
      const h = fixtureGame(n, E.createInitialState(cfg1, FIXTURE_NOW), FIXTURE_NOW) as SalvageGame;
      expect(ratedIncome(cfg1.salvage, h.salvage)).toBe(replayIncome(cfg1.salvage, h.salvage));
    }
  });
});

describe('E7: the advice line by payback from the works\' opening', () => {
  it('r4 and r3open: the line names a purchase within the budget whose payback (price / rated gain) is within tau_r and no shorter than any level, hire or shop item\'s', () => {
    for (const { cfg, g0 } of [{ cfg: worksCfg(), g0: r4Game() }, { cfg: moneyCfg(), g0: r3open() }]) {
      for (const cash of [5_000, 1e9]) {
        const g = { ...g0, cash };
        const a = advice(cfg, g, 0);
        const c = contentAt(cfg.salvage, g.salvage);
        const tau = c.tau_h?.[g.salvage.ladder.rung - 1] ?? Infinity;
        const pay = (price: number, after: SalvageGame) => {
          const d = ratedGain(cfg, g, after);
          return d > 1e-6 ? price / d : Infinity;
        };
        // The levels and hires the line could name, by hand, within its budget (2.10).
        let best = Infinity;
        const budget = cash + cfg.salvage.advice.minutes * incomeRate(cfg, g) - reserve(cfg, g);
        for (const m of g.salvage.crew) {
          const t: LevelTarget = { kind: 'crew', id: m.id };
          const ck = levelCheck(cfg, g, t);
          if (ck.price !== null && ck.state !== 'locked' && ck.state !== 'top' && ck.price <= budget + 1e-9) best = Math.min(best, pay(ck.price, levelled(g, t)));
        }
        for (const [pid, p] of Object.entries(g.salvage.partners)) {
          if (!p.open) continue;
          const t: LevelTarget = { kind: 'partner', partner: pid };
          const ck = levelCheck(cfg, g, t);
          if (ck.price !== null && ck.state !== 'locked' && ck.state !== 'top' && ck.price <= budget + 1e-9) best = Math.min(best, pay(ck.price, levelled(g, t)));
        }
        for (const role of ['hand', 'cutter', 'driver'] as const) {
          const ck = hireCheck(cfg, g, role);
          if (ck.price !== null && ck.state !== 'locked' && ck.state !== 'top' && ck.price <= budget + 1e-9) best = Math.min(best, pay(ck.price, hiredState(g, role)));
        }
        if (!a) {
          expect(best > tau).toBe(true);
          continue;
        }
        expect(a.price).toBeLessThanOrEqual(budget + 1e-9);
        // A shop item or a plate is rated on its own bought state (advice.ts boughtState); a level or a hire by hand here.
        if (a.action.act === 'buy') continue;
        const named = a.action.act === 'level' ? pay(a.price, levelled(g, a.action.target)) : pay(a.price, hiredState(g, a.action.role));
        expect(named).toBeLessThanOrEqual(tau + 1e-9);
        expect(named).toBeLessThanOrEqual(best + 1e-9);
      }
    }
  });
});
