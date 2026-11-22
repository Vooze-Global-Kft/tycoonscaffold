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
import { defaultJumpChoice, grantHangar, HAUL_SHARED_SOUNDS, haulEngineMode, haulFrame, mergeShiftLogs, withHaulContent, type HaulFrame } from './haulMode';
import * as M from './meta';
import { engineFor, installEngineMode } from './mode';
import type { GameState } from './types';

const cfg = haulTestConfig();
const pizzaCfg = GameConfigSchema.parse(pizza);

describe('engine-mode seam with the haul engine installed', () => {
  beforeAll(() => installEngineMode(haulEngineMode));
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
  beforeAll(() => installEngineMode(haulEngineMode));
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
    const { late } = haulFixtures(c);
    const owned = { ...late, entitlements: { ...late.entitlements, products: [...late.entitlements.products, p.id] } } as unknown as GameState;
    const plain = E.prestige(c, late as unknown as GameState, FIXTURE_NOW) as unknown as H.HaulGame & { haul: H.HaulState };
    const next = E.prestige(c, owned, FIXTURE_NOW) as unknown as H.HaulGame & { haul: H.HaulState };
    expect(next.haul.fleet.drones).toBe(plain.haul.fleet.drones + hangar.startDrones);
    expect(H.haulParams(c, next).droneCap).toBe(H.haulParams(c, plain).droneCap + hangar.droneCap);
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

  it('the scene frame (4.3): route table, run clock and wall time of the state; null without a run', () => {
    const c = spaceCfg();
    let g = E.createInitialState(c, FIXTURE_NOW);
    g = H.assignDrone(c, g as unknown as H.HaulGame & { haul: H.HaulState }, 0) as unknown as GameState;
    g = E.tick(c, g, 2, FIXTURE_NOW);
    const f = haulEngineMode.frame!(c, g, FIXTURE_NOW + 5) as HaulFrame;
    expect(f.at).toBe(FIXTURE_NOW + 5);
    expect(f.clock).toBeCloseTo(2, 6);
    expect(f.routes).toEqual(H.routeTable(c, g as unknown as H.HaulGame & { haul: H.HaulState }));
    expect(f.routes[0]).toMatchObject({ slot: 0, n: 1 });
    expect(f.idle).toBe(g.haul!.idle);
    const f2 = haulFrame(c, g, FIXTURE_NOW + 6)!;
    expect(f2.seq).toBeGreaterThan(f.seq);
    // Structured-clone safe (it crosses to the UI thread as a shared value).
    expect(JSON.parse(JSON.stringify(f))).toEqual(f);
    const { late } = haulFixtures(c);
    const confirmed = E.prestige(c, late as unknown as GameState, FIXTURE_NOW, { step: 'confirm' });
    expect(haulFrame(c, confirmed, FIXTURE_NOW)).toBeNull();
    expect(haulFrame(pizzaCfg, E.createInitialState(pizzaCfg, FIXTURE_NOW), FIXTURE_NOW)).toBeNull();
  });

  it('two Shift Logs of one absence add up', () => {
    const a: H.OfflineReport = { seconds: 600, effective: 270, unitsByOre: { iron: 10 }, rocksDry: 1, pods: 0, inFlight: 5, credits: 100, noAutopilot: false, shipped: 10, launches: 1 };
    const b: H.OfflineReport = { seconds: 60, effective: 27, unitsByOre: { iron: 2, ice: 3 }, rocksDry: 0, pods: 1, inFlight: 0, credits: 20, noAutopilot: false, shipped: 5, launches: 0 };
    expect(mergeShiftLogs(a, b)).toEqual({ seconds: 660, effective: 297, unitsByOre: { iron: 12, ice: 3 }, rocksDry: 1, pods: 1, inFlight: 5, credits: 120, noAutopilot: false, shipped: 15, launches: 1 });
    expect(mergeShiftLogs(undefined, b)).toBe(b);
    expect(mergeShiftLogs(a, undefined)).toBe(a);
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
