/**
 * The haul engine reached through the shared engine functions (src/engine/mode.ts): what the
 * store calls (createInitialState, reconcileState, tick, computeOffline, prestige, the incomes,
 * story and missions) runs the haul rules for a haul config once the haul engine is installed,
 * and the built-in rules for every other config even while it is installed.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pizza from '../../games/pizza-empire/game.json';
import space from '../../games/space-miner/game.json';
import { GameConfigSchema } from '../config/schema';
import * as E from './economy';
import { FIXTURE_NOW, haulFixtures, haulTestConfig } from './fixtures/haul';
import * as H from './haul';
import { defaultJumpChoice, grantHangar, HAUL_SHARED_SOUNDS, haulEngineMode, mergeShiftLogs, reconcileShiftLog, withHaulContent } from './haulMode';
import * as M from './meta';
import { engineFor, installEngineMode } from './mode';
import type { GameState } from './types';

const cfg = haulTestConfig();
const pizzaCfg = GameConfigSchema.parse(pizza);

describe('engine-mode seam with the haul engine installed', () => {
  // The fixtures play 2 h 20 of the scripted player once (seconds; longer while the whole suite runs in parallel).
  beforeAll(() => {
    installEngineMode(haulEngineMode);
    haulFixtures(cfg);
  }, 120_000);
  afterAll(() => installEngineMode(null));

  it('dispatches only configs of its own mode', () => {
    expect(engineFor(cfg)).toBe(haulEngineMode);
    expect(engineFor(pizzaCfg)).toBeNull();
  });

  it('createInitialState builds a haul run', () => {
    const g = E.createInitialState(cfg, FIXTURE_NOW);
    expect(g.haul).toBeTruthy();
    expect(g.haul!.slots[0].claimed).toBe(true);
    expect(g.loadout?.sockets).toHaveLength(3);
    expect(g.stats.launches).toBe(0);
    // A sim config is untouched by the installed haul engine.
    expect(E.createInitialState(pizzaCfg, FIXTURE_NOW).haul).toBeUndefined();
  });

  it('reconcileState repairs a haul save and keeps a valid one', () => {
    const g = E.createInitialState(cfg, FIXTURE_NOW);
    const back = E.reconcileState(cfg, JSON.parse(JSON.stringify(g)), FIXTURE_NOW);
    expect(back.haul!.slots.length).toBe(g.haul!.slots.length);
    const junk = E.reconcileState(cfg, { haul: 'nope', cash: -3 }, FIXTURE_NOW);
    expect(junk.haul).toBeTruthy();
    expect(junk.cash).toBeGreaterThanOrEqual(0);
  });

  it('tick runs advanceHaul and reports haul events', () => {
    let g: GameState = E.createInitialState(cfg, FIXTURE_NOW);
    g = H.assignDrone(cfg, g as H.HaulGame, 0) as unknown as GameState;
    const events: unknown[] = [];
    for (let i = 0; i < 300; i++) g = E.tick(cfg, g, 0.1, FIXTURE_NOW, events as E.GameEvent[]);
    expect(g.haul!.clock).toBeCloseTo(30, 6);
    expect(g.stats.playSeconds).toBeCloseTo(30, 6);
    expect(events.some((e) => (e as H.HaulEvent).type === 'unload')).toBe(true);
  });

  it('incomes: steady (offline) and active come from the haul rates', () => {
    const { minute3, fresh } = haulFixtures(cfg);
    const g = minute3 as unknown as GameState;
    expect(E.activeIncomePerSecond(cfg, g, FIXTURE_NOW)).toBeCloseTo(H.haulIncome(cfg, minute3), 9);
    expect(E.incomePerSecond(cfg, g, FIXTURE_NOW)).toBeCloseTo(H.steadyRate(cfg, H.haulParams(cfg, minute3), minute3.haul), 9);
    // Without the autopilot the station earns nothing on its own.
    expect(E.incomePerSecond(cfg, fresh as unknown as GameState, FIXTURE_NOW)).toBe(0);
  });

  it('computeOffline returns the fast-forwarded game and the Shift Log report', () => {
    const { minute3 } = haulFixtures(cfg);
    const g = minute3 as unknown as GameState;
    const away = { ...g, lastSavedAt: FIXTURE_NOW - 3600_000, stats: { ...g.stats, clockHigh: FIXTURE_NOW - 3600_000 } };
    const r = E.computeOffline(cfg, away, FIXTURE_NOW);
    expect(r.seconds).toBeCloseTo(3600, 3);
    expect(r.game).toBeTruthy();
    expect(r.report).toBeTruthy();
    expect(r.earnings).toBeGreaterThanOrEqual(0);
  });

  it('prestige delegates to prestigeHaul with the given or the default condition', () => {
    const { late } = haulFixtures(cfg);
    const choice = defaultJumpChoice(cfg, late)!;
    expect(choice).toBeTruthy();
    const traitId = 'traitId' in choice ? choice.traitId : '';
    const after = E.prestige(cfg, late as unknown as GameState, FIXTURE_NOW, choice);
    expect(after.haul!.galaxy).toBe(1);
    expect(after.haul!.trait).toBe(traitId);
    expect(E.prestige(cfg, late as unknown as GameState, FIXTURE_NOW).haul!.galaxy).toBe(1);
  });

  it('the Jump in steps (errata 17): confirm through prestige, then the Star Map and startGalaxy; a restart comes back to the choice', () => {
    const { late } = haulFixtures(cfg);
    const gain = H.coresAvailable(cfg, late);
    const confirmed = E.prestige(cfg, late as unknown as GameState, FIXTURE_NOW, { step: 'confirm' }) as unknown as H.HaulGame;
    expect(confirmed.haul).toBeNull();
    expect(confirmed.prestigePoints).toBe(late.prestigePoints + gain);
    const pending = confirmed.haulStats.pendingJump!;
    expect(pending.offers.length).toBeGreaterThan(0);
    // The saved, restarted game is still waiting for its condition (reconcile keeps haul = null).
    const back = E.reconcileState(cfg, JSON.parse(JSON.stringify(confirmed)), FIXTURE_NOW) as unknown as H.HaulGame;
    expect(back.haul).toBeNull();
    expect(back.haulStats.pendingJump?.offers).toEqual(pending.offers);
    // Story triggers and incomes cope with the run-less state.
    expect(E.incomePerSecond(cfg, back as unknown as GameState, FIXTURE_NOW)).toBe(0);
    // A second confirm is refused; the start builds galaxy 1 with the chosen condition.
    expect(E.prestige(cfg, back as unknown as GameState, FIXTURE_NOW, { step: 'confirm' })).toBe(back);
    const started = H.startGalaxy(cfg, back, FIXTURE_NOW, pending.offers[0]);
    expect(started.haul!.galaxy).toBe(1);
    expect(started.haul!.trait).toBe(pending.offers[0]);
    expect(started.haulStats.pendingJump).toBeNull();
  });

  it('story triggers and mission usability of the haul mode', () => {
    const { fresh, minute3 } = haulFixtures(cfg);
    const beat = (trigger: unknown) => ({ ...cfg, story: [{ id: 'b', characterId: 'x', lines: ['l'], rewardGems: 0, trigger }] }) as typeof cfg;
    expect(E.pendingStoryBeat(beat({ type: 'system' }), minute3 as unknown as GameState)?.id).toBe('b');
    expect(E.pendingStoryBeat(beat({ type: 'system' }), fresh as unknown as GameState)).toBeNull();
    expect(E.pendingStoryBeat(beat({ type: 'ring', ring: 1 }), fresh as unknown as GameState)?.id).toBe('b');
    expect(E.pendingStoryBeat(beat({ type: 'galaxy', index: 1 }), fresh as unknown as GameState)).toBeNull();
    // Lifetime readings (haulStats): they hold after a Jump, while the new run has none of it yet.
    const { late, afterJump } = haulFixtures(cfg);
    const ringNow = late.haulStats.bestRing;
    expect(ringNow).toBeGreaterThan(1);
    expect(E.pendingStoryBeat(beat({ type: 'ring', ring: ringNow }), afterJump as unknown as GameState)?.id).toBe('b');
    expect(E.pendingStoryBeat(beat({ type: 'ring', ring: ringNow + 1 }), late as unknown as GameState)).toBeNull();
    expect(E.pendingStoryBeat(beat({ type: 'galaxy', index: 1 }), afterJump as unknown as GameState)?.id).toBe('b');
    expect(E.pendingStoryBeat(beat({ type: 'jumpReady', cores: cfg.haul.jumpReadyCores }), late as unknown as GameState)?.id).toBe(H.jumpPreview(cfg, late).ready ? 'b' : undefined);
    // Mission counters read the lifetime stats.
    const g = minute3 as unknown as GameState;
    const missions = M.refreshMissions(cfg, g, FIXTURE_NOW);
    expect(Array.isArray(missions.missions.slots)).toBe(true);
  });
});

describe('without an installed engine', () => {
  it('a haul config falls back to the built-in rules without throwing', () => {
    installEngineMode(null);
    const g = E.createInitialState(cfg, FIXTURE_NOW);
    expect(g.haul).toBeUndefined();
    expect(E.tick(cfg, g, 1, FIXTURE_NOW)).toBeTruthy();
  });
});

/** The shipped game's own data (game.json through the shared schema, the haul block parsed at install). */
const spaceCfg = () => withHaulContent(GameConfigSchema.parse(space)) as H.HaulConfig;

describe('the integration seam: purchases, the scene frame, the Shift Log', () => {
  beforeAll(() => {
    installEngineMode(haulEngineMode);
    haulFixtures(cfg);
  }, 120_000);
  afterAll(() => installEngineMode(null));

  const product = (c: H.HaulConfig, kind: string) => c.monetization.iap.products.find((p) => p.kind === kind)!;

  it('Hangar Expansion end to end (5.4): unlock → entitlements.products → drone cap now, start drones now and at every run start', () => {
    const c = spaceCfg();
    const hangar = c.haul.hangar!;
    const p = product(c, 'unlock');
    expect(p.id).toBe(hangar.product);
    expect(M.isNonConsumable(p)).toBe(true);
    const g0 = E.createInitialState(c, FIXTURE_NOW) as unknown as H.HaulGame & { haul: H.HaulState };
    const cap0 = H.haulParams(c, g0).droneCap;
    // The shared purchase records the product; the engine's entitle hook applies it to the run in progress.
    const bought = M.applyProduct(c, g0 as unknown as GameState, p, FIXTURE_NOW).state;
    expect(bought.entitlements.products).toContain(p.id);
    const g1 = haulEngineMode.entitle!(c, bought, p.id) as unknown as H.HaulGame & { haul: H.HaulState };
    expect(H.haulParams(c, g1).droneCap).toBe(cap0 + hangar.droneCap);
    expect(g1.haul.fleet.drones).toBe(g0.haul.fleet.drones + hangar.startDrones);
    expect(g1.haul.idle).toBe(g0.haul.idle + hangar.startDrones);
    // Once per run: a restore or a second grant changes nothing.
    expect(grantHangar(c, g1 as unknown as GameState, p.id)).toBe(g1);
    // Another product, or a product not recorded, changes nothing.
    expect(grantHangar(c, g0 as unknown as GameState, p.id)).toBe(g0);
    expect(grantHangar(c, bought, 'space_dm_150')).toBe(bought);
    // The next run starts with them (createHaul reads entitlements.products), and the cap holds in galaxy 1.
    // (On the fixtures' config: haulFixtures keeps the states of the first config it was given.)
    const { late } = haulFixtures(cfg);
    const th = cfg.haul.hangar!;
    const owned = { ...late, entitlements: { ...late.entitlements, products: [...late.entitlements.products, th.product] } } as unknown as GameState;
    const plain = E.prestige(cfg, late as unknown as GameState, FIXTURE_NOW) as unknown as H.HaulGame & { haul: H.HaulState };
    const next = E.prestige(cfg, owned, FIXTURE_NOW) as unknown as H.HaulGame & { haul: H.HaulState };
    expect(next.haul.fleet.drones).toBe(plain.haul.fleet.drones + th.startDrones);
    expect(H.haulParams(cfg, next).droneCap).toBe(H.haulParams(cfg, plain).droneCap + th.droneCap);
    // A save keeps it (the product list is shared state).
    const back = E.reconcileState(c, JSON.parse(JSON.stringify(g1)), FIXTURE_NOW) as unknown as H.HaulGame & { haul: H.HaulState };
    expect(H.haulParams(c, back).droneCap).toBe(cap0 + hangar.droneCap);
    expect(back.haul.fleet.drones).toBe(g1.haul.fleet.drones);
  });

  it('Clearance: one product for no ads and every ad reward without the ad (the ads service reads noAds and skipRewarded)', () => {
    const c = spaceCfg();
    const p = product(c, 'clearance');
    expect(M.isNonConsumable(p)).toBe(true);
    const g = E.createInitialState(c, FIXTURE_NOW);
    const r = M.applyProduct(c, g, p, FIXTURE_NOW).state;
    expect(r.entitlements.noAds).toBe(true);
    expect(r.entitlements.skipRewarded).toBe(true);
    expect(haulEngineMode.entitle!(c, r, p.id)).toBe(r);
    // No interstitial and no banner in this game's first version (5.4); the store reads the flag.
    expect(c.monetization.ads.showBanner).toBe(false);
  });

  it('the rewarded flare: 3 a day, 20 min apart, at most 4 charges (errata 33)', () => {
    const c = spaceCfg();
    let g = E.createInitialState(c, FIXTURE_NOW) as unknown as H.HaulGame & { haul: H.HaulState };
    const day = E.dayKey(FIXTURE_NOW);
    let t = FIXTURE_NOW;
    let granted = 0;
    for (let i = 0; i < 10; i++) {
      if (H.canAdFlare(c, g, day, t)) {
        g = H.grantAdFlare(c, g, day, t) as typeof g;
        granted++;
      }
      t += 10 * 60_000;
    }
    expect(granted).toBe(3);
    expect(g.haul.flare.charges).toBeLessThanOrEqual(c.haul.flare.maxCharges);
  });

  it('an absence that shipped nothing for want of the autopilot still has its Shift Log (2.11)', () => {
    const r: H.OfflineReport = { seconds: 600, effective: 270, unitsByOre: {}, rocksDry: 0, pods: 0, inFlight: 0, credits: 0, noAutopilot: true, shipped: 0, launches: 0 };
    expect(haulEngineMode.reportAlone!(r)).toBe(true);
    expect(haulEngineMode.reportAlone!({ ...r, noAutopilot: false })).toBe(false);
    expect(haulEngineMode.reportAlone!(undefined)).toBe(false);
  });

  it('two Shift Logs of one absence add up', () => {
    const a: H.OfflineReport = { seconds: 600, effective: 270, unitsByOre: { iron: 10 }, rocksDry: 1, pods: 0, inFlight: 5, credits: 100, noAutopilot: false, shipped: 10, launches: 1 };
    const b: H.OfflineReport = { seconds: 60, effective: 27, unitsByOre: { iron: 2, ice: 3 }, rocksDry: 0, pods: 1, inFlight: 0, credits: 20, noAutopilot: false, shipped: 5, launches: 0 };
    expect(mergeShiftLogs(a, b)).toEqual({ seconds: 660, effective: 297, unitsByOre: { iron: 12, ice: 3 }, rocksDry: 1, pods: 1, inFlight: 5, credits: 120, noAutopilot: false, shipped: 15, launches: 1 });
    expect(mergeShiftLogs(undefined, b)).toBe(b);
    expect(mergeShiftLogs(a, undefined)).toBe(a);
  });

  it('a Shift Log read back from a save (reconcileReport): the rules\' own comes back equal, anything else is repaired or none', () => {
    /** What the store does with a log that waits: written with the save as JSON, read back at the next start. */
    const saved = (x: unknown): unknown => JSON.parse(JSON.stringify(x));
    const figures = (r: H.OfflineReport) => [r.seconds, r.effective, r.rocksDry, r.pods, r.inFlight, r.credits, r.shipped, r.launches, ...Object.values(r.unitsByOre)];
    const { fresh, minute3, midGame } = haulFixtures(cfg);
    const logs: H.OfflineReport[] = [];
    for (const g of [fresh, minute3, midGame]) {
      for (const seconds of [20, 1800, 3 * 3600, 40 * 3600]) {
        const then = FIXTURE_NOW - seconds * 1000;
        const a = H.haulOffline(cfg, { ...g, lastSavedAt: then, stats: { ...g.stats, clockHigh: then } }, FIXTURE_NOW);
        const b = H.haulOffline(cfg, a.game, FIXTURE_NOW + 2 * 3600_000);
        logs.push(a.report, b.report, mergeShiftLogs(a.report, b.report) as H.OfflineReport);
      }
    }
    expect(logs.some((r) => r.noAutopilot)).toBe(true);
    expect(logs.some((r) => r.credits > 0 && Object.keys(r.unitsByOre).length > 1)).toBe(true);
    for (const report of logs) {
      expect(reconcileShiftLog(cfg, saved(report))).toEqual(report);
      expect(haulEngineMode.reconcileReport!(cfg, saved(report))).toEqual(report);
      expect(haulEngineMode.reportAlone!(reconcileShiftLog(cfg, saved(report)))).toBe(report.noAutopilot);
    }
    const none: unknown[] = [undefined, null, 'torn', 7, true, [], [1], {}, { seconds: 'long' }, { seconds: -5 }, { credits: 100 }];
    for (const x of none) expect(reconcileShiftLog(cfg, x), JSON.stringify(x)).toBeUndefined();

    const good = logs.find((r) => r.credits > 0 && Object.keys(r.unitsByOre).length > 1)!;
    const ore = Object.keys(good.unitsByOre)[0];
    const junk: unknown[] = [null, undefined, 'x', 5, -1, NaN, Infinity, true, {}, [], [null], [5], [{}], { [ore]: 'x' }, { [ore]: null }, { [ore]: -3 }, { unobtainium: 5 }, { __proto__: 5, constructor: 7, length: 2 }];
    const damaged: unknown[] = [];
    for (const key of Object.keys(good)) {
      for (const j of junk) damaged.push({ ...good, [key]: j });
      damaged.push(Object.fromEntries(Object.entries(good).filter(([k]) => k !== key)));
    }
    const ores = new Set(cfg.haul.ores.map((o) => o.id));
    for (const bad of damaged) {
      for (const x of [bad, saved(bad)]) {
        const r = reconcileShiftLog(cfg, x);
        if (!r) continue;
        const what = JSON.stringify(bad);
        for (const n of figures(r)) expect(Number.isFinite(n) && n >= 0, what).toBe(true);
        for (const id of Object.keys(r.unitsByOre)) expect(ores.has(id), what).toBe(true);
        expect(typeof r.noAutopilot, what).toBe('boolean');
        expect(r.effective, what).toBeLessThanOrEqual(r.seconds);
        // What the store then does with it: asks whether it speaks alone, joins the next absence.
        expect(typeof haulEngineMode.reportAlone!(r), what).toBe('boolean');
        const both = mergeShiftLogs(r, good) as H.OfflineReport;
        for (const n of figures(both)) expect(Number.isFinite(n) && n >= 0, what).toBe(true);
        expect(both.seconds, what).toBe(r.seconds + good.seconds);
      }
    }
    // Figures that are not figures read as none; units of another game's ores are left out.
    expect(reconcileShiftLog(cfg, { ...good, rocksDry: 'many', unitsByOre: { ...good.unitsByOre, unobtainium: 5 } })).toEqual({ ...good, rocksDry: 0 });
  });

  it('every shared sound key maps to a key of the haul table', async () => {
    const { FX } = await import('../services/fx/catalog.haul');
    for (const [from, to] of Object.entries(HAUL_SHARED_SOUNDS)) expect(Object.keys(FX), `${from} → ${to}`).toContain(to);
  });

  it('missions: contracts are usable once contracts have ever unlocked (errata 74, lifetime flag)', () => {
    const { afterJump, late } = haulFixtures(cfg);
    expect(late.haulStats.contractsSeen).toBe(true);
    const fresh = { ...afterJump, haul: { ...afterJump.haul, contracts: { ...afterJump.haul.contracts, unlocked: false } }, stats: { ...afterJump.stats, contractsMet: 0 } };
    expect(haulEngineMode.missionUsable!(cfg, fresh as unknown as GameState, 'contracts')).toBe(true);
  });
});
