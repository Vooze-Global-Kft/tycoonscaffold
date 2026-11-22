/// <reference types="node" />
/**
 * Second rules audit (review of 480ae2a, after the contract rule of Decision 32, the re-tune and
 * the store wiring). Every test here states a rule the game should follow and FAILS on 480ae2a:
 * each one is a finding of the review, and passes once that finding is fixed.
 * Scratch evidence (scripts and measurements): the reviewer's scratch folder, space-review-rules.
 */
import { describe, expect, it, vi } from 'vitest';
import space from '../../games/space-miner/game.json';
import { GameConfigSchema } from '../config/schema';
import { freshHaulGame, shaped } from './fixtures/haul';
import * as H from './haul';
import { withHaulContent } from './haulMode';

// The store-level tests below load src/state/store.ts and src/modes/haul/actions.ts under node: their
// native services are replaced by stand-ins (the engine tests above do not touch them).
const played = vi.hoisted(() => [] as string[]);
vi.mock('@react-native-async-storage/async-storage', () => {
  const m = new Map<string, string>();
  return { default: { getItem: async (k: string) => m.get(k) ?? null, setItem: async (k: string, v: string) => void m.set(k, v), removeItem: async (k: string) => void m.delete(k) } };
});
vi.mock('../generated/activeGame', async () => ({ ACTIVE_GAME_ID: 'space-miner', rawGame: (await import('../../games/space-miner/game.json')).default, fxTable: {}, gameAssets: {}, gameSounds: {}, displayFontMetrics: null }));
vi.mock('../services/fx', () => ({ fx: { play: (k: string) => void played.push(k) } }));
vi.mock('../services/ads', () => ({ ads: { showRewarded: async () => true, maybeShowInterstitial: () => {}, init: () => {}, interstitials: false } }));
vi.mock('../services/firebase', () => ({ analytics: { log: () => {} }, crash: { record: () => {} }, fetchRemoteOverrides: async () => ({}) }));
vi.mock('../services/iap', () => ({ iap: { init: async () => {}, owned: async () => [], purchase: async () => true, restore: async () => [] } }));
vi.mock('../services/region', () => ({ detectRegion: async () => null }));

type Run = H.HaulGame & { haul: H.HaulState };
const cfg = withHaulContent(GameConfigSchema.parse(space)) as unknown as H.HaulConfig;

/**
 * The station the balance bot has at about 10 minutes (seed 12345): ring 1 (iron only) and two
 * ring-2 slots, 13 drones, most of them on iron. Rocks are placed from seed 4242 (both ring-2 rocks
 * are copper or iron).
 */
function tenMinutes(): Run {
  return shaped(cfg, 4242, { slots: [0, 1, 2, 3], haulers: [4, 3, 4, 2], rig: [10, 10, 4, 4], capLevel: 3, freighter: 8, autopilot: true, policy: 'contract', idle: 0 });
}

// Rewritten for Decision 56 (finishing round): draws read the station's basis; `now` is the steady
// figure of the routes as they are (what one launch carries of each wanted ore).
function draws(g: Run, n = 300) {
  const p = H.haulParams(cfg, g);
  const b = H.contractBasis(cfg, p, g.haul);
  const out: { c: H.Contract; now: number[]; F: number }[] = [];
  for (let k = 1; k <= n; k++) {
    const c = H.contractAt(cfg, g.haul.seed, k, b);
    out.push({ c, now: c.wants.map((w) => b.steady[w.ore] ?? 0), F: p.F });
  }
  return out;
}

describe('audit 2: the contract rule (section 2.6, Decision 32, rewritten for Decision 40)', () => {
  const L = cfg.haul.contracts.launches;

  it('no contract asks for at most what the routes as they are already deliver in its launches (met by doing nothing)', () => {
    // Spec 2.6: "A contract above the current share is not met by doing nothing." Rewritten for
    // Decision 40 (a contract spans L launches): the test was "at most one launch's share"; it is now
    // "at most L launches' share", with the margin of the never-free bound.
    // Decision 56: the never-free floor of the raised ore is L × steady × (1 + raise[0] / 2).
    const free = draws(tenMinutes()).filter((d) => d.c.wants.every((w, i) => w.units < L * d.now[i] * (1 + cfg.haul.contracts.raise[0] / 2) - 1e-6));
    expect(free.map((d) => `${JSON.stringify(d.c.wants)} now ${d.now.map((x) => x.toFixed(1))}`).slice(0, 3)).toEqual([]);
  });

  it('the contract closest to the routes as they are is not met by an untouched station (autopilot, policy contract, no drone moved)', () => {
    // Rewritten for Decision 40: the contract is taken and runs its L launches; the original picked a
    // contract at or below one launch's share, which the rule no longer draws, so this takes the
    // one-ore contract nearest to L × now instead.
    const g0 = tenMinutes();
    const ones = draws(g0).filter((x) => x.c.wants.length === 1);
    const d = ones.reduce((b, x) => (x.c.wants[0].units / x.now[0] < b.c.wants[0].units / b.now[0] ? x : b), ones[0]);
    expect(d, 'a one-ore contract').toBeTruthy();
    const c = { ...d.c, taken: true, launchesLeft: L };
    let g: Run = { ...g0, haul: { ...g0.haul, contracts: { unlocked: true, board: [c], next: c.k + 1, active: 0 } } };
    let met: boolean | null = null;
    for (let i = 0; i < 20000 && met === null; i++) {
      const ev: H.HaulEvent[] = [];
      g = H.advanceHaul(cfg, g, 0.5, 0, ev) as Run;
      for (const e of ev) {
        if (e.type === 'contractMet') met = true;
        if (e.type === 'contractLapsed') met = false;
      }
    }
    // A contract nobody routed for is not met.
    expect(met).toBe(false);
  });

  it('a contract over the only two ores of the station never asks for whole holds in exact proportion', () => {
    // Before Decision 40, 40 % of the contracts of the first 25 minutes wanted round(now_a) +
    // round(now_b) = floor(F). Rewritten for Decision 40: on a two-ore station both ores cannot rise
    // above their share at once (the shares fill the hold), so the rule falls back to one ore; any
    // two-ore contract left must leave room in its L holds, and each ore obeys the reachable bound.
    const all = draws(tenMinutes());
    const ores = new Set(tenMinutes().haul.slots.filter((x) => x.claimed && x.respawnAt === null).map((x) => x.ore));
    expect(ores.size).toBe(2);
    const wholeHold = all.filter((d) => d.c.wants.length === 2 && d.c.wants.reduce((a, w) => a + w.units, 0) >= L * Math.floor(d.F) - L);
    expect(wholeHold.length, `e.g. ${JSON.stringify(wholeHold[0]?.c.wants)} with F = ${Math.floor(all[0].F)}`).toBe(0);
    // Decision 56 replaced the reachable bound (reach): no ore is asked above maxShare of its launches.
    for (const d of all) d.c.wants.forEach((w) => expect(w.units).toBeLessThanOrEqual(Math.ceil(L * d.F * cfg.haul.contracts.maxShare) + 1));
  });
});

describe('audit 2: saves', () => {
  it('a save whose contract board is shorter than haul.contracts.board is topped up (old or damaged saves)', () => {
    const g = tenMinutes();
    const p = H.haulParams(cfg, g);
    const board = H.openBoard(cfg, g.haul, p.F, p);
    const raw = JSON.parse(JSON.stringify({ ...g, haul: { ...g.haul, contracts: { ...board, board: board.board.slice(0, 1), active: null } } }));
    const loaded = H.reconcileHaul(cfg, raw, raw) as Run;
    // Today the board stays at 1 for the rest of the run: warpOut only ever replaces existing entries.
    let s = loaded;
    for (let i = 0; i < 600; i++) s = H.advanceHaul(cfg, s, 0.5, 0) as Run;
    expect(s.haul.contracts.board.length).toBe(cfg.haul.contracts.board);
  });

  it('an unlocked board with no contracts at all gets a fresh board on load', () => {
    const g = freshHaulGame(cfg, 7);
    const raw = JSON.parse(JSON.stringify({ ...g, haul: { ...g.haul, contracts: { unlocked: true, board: [{ k: 3, buyer: 'x', wants: 'broken', mult: 2, launchesLeft: 3 }], next: 4, active: 0 } } }));
    const loaded = H.reconcileHaul(cfg, raw, raw) as Run;
    // Decision 64: a station that ships one ore (a fresh game) has one buyer.
    expect(loaded.haul.contracts.board.length).toBe(H.boardPlaces(cfg, H.contractBasis(cfg, H.haulParams(cfg, loaded), loaded.haul)));
    expect(loaded.haul.contracts.board.length).toBeGreaterThanOrEqual(1);
  });
});

describe('audit 2: store and actions (src/state/store.ts, src/modes/haul/actions.ts)', () => {
  async function storeWith(game: H.HaulGame) {
    const { installEngineMode } = await import('./mode');
    const { haulEngineMode } = await import('./haulMode');
    installEngineMode(haulEngineMode);
    const { baseGame } = await import('../config/game');
    Object.assign(baseGame, withHaulContent(baseGame));
    const { useGame } = await import('../state/store');
    useGame.setState({ cfg: baseGame, game: game as never, hydrated: true });
    const { haulActions } = await import('../modes/haul/actions');
    return { useGame, haulActions };
  }

  it('a transmission acknowledged while a confirmed Jump waits for its condition still counts (and is not refused)', async () => {
    // haulActions.acknowledge claims the mission, then runs ackTransmission through `act`, which needs a
    // run (haulNow): with haul = null it plays ui_denied and the count (every 4th: a Derelict Cache) is lost.
    const g0 = tenMinutes();
    const g1 = H.confirmJump(cfg, { ...g0, lifetimeEarnings: 1e12 }, Date.now());
    expect(g1.haul).toBeNull();
    const g: H.HaulGame = { ...g1, stats: { ...g1.stats, launches: 5, transmissionsAcked: 3 }, missions: { ...g1.missions, slots: [{ templateId: 'ship', target: 3, start: 0 }] } };
    const { useGame, haulActions } = await storeWith(g);
    played.length = 0;
    expect(haulActions.acknowledge(0)).toBe(true);
    const after = useGame.getState().game as unknown as H.HaulGame;
    expect(played).not.toContain('ui_denied');
    expect(after.stats.transmissionsAcked).toBe(4);
    expect(after.chests.owned[cfg.haul.pods.derelict] ?? 0).toBe((g.chests.owned[cfg.haul.pods.derelict] ?? 0) + 1);
  });
});

describe('audit 2: missions after a Jump', () => {
  it('an "earn" transmission handed out while a confirmed Jump waits is not priced at ₵1 (income is 0 without a run)', async () => {
    // store.prestige({step:'confirm'}) runs missionsAfterReset on the state with haul = null, so the
    // refilled "Bank {n} seconds of income" gets target max(1, activeRate (0) × n) = ₵1 and is done with
    // the first credit of the next galaxy. The same happens to any refill while the Jump waits.
    const M = await import('./meta');
    const { installEngineMode } = await import('./mode');
    const { haulEngineMode } = await import('./haulMode');
    installEngineMode(haulEngineMode);
    const g0 = tenMinutes();
    const now = Date.UTC(2026, 10, 22, 12);
    const pending = H.confirmJump(cfg, { ...g0, lifetimeEarnings: 1e12 }, now);
    const earnOnly = cfg.meta.missions.templates.filter((t) => t.type === 'earn').map((t) => t.id);
    const state = { ...pending, missions: { slots: [{ templateId: earnOnly[0], target: 5e9, start: 0 }], completed: {}, total: 0, day: null, doneToday: 0 } };
    const cfgEarn = { ...cfg, meta: { ...cfg.meta, missions: { ...cfg.meta.missions, slots: 1, templates: cfg.meta.missions.templates.filter((t) => t.type === 'earn') } } };
    const after = M.missionsAfterReset(cfgEarn as never, state as never, now);
    const slot = after.missions.slots[0];
    expect(slot?.templateId).toBe(earnOnly[0]);
    expect(slot.target).toBeGreaterThan(1);
  });
});

describe('audit 2: Dark Matter', () => {
  it('a Time Warp that would pay ₵0 (no drone on a route yet, or a Jump waiting) is refused, not charged 40 DM', async () => {
    const E = await import('./economy');
    const { installEngineMode } = await import('./mode');
    const { haulEngineMode } = await import('./haulMode');
    installEngineMode(haulEngineMode);
    const now = Date.UTC(2026, 10, 22, 12);
    const fresh = { ...freshHaulGame(cfg, 3), gems: 100 };
    expect(E.activeIncomePerSecond(cfg as never, fresh as never, now)).toBe(0);
    const after = E.buyTimeWarpWithGems(cfg as never, fresh as never, now);
    expect(after.cash).toBe(fresh.cash);
    expect(after.gems).toBe(100);
  });
});
