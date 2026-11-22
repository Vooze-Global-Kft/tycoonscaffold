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

function draws(g: Run, n = 300) {
  const p = H.haulParams(cfg, g);
  const st = H.contractStation(cfg, p, g.haul);
  const rings = H.claimedRings(cfg, g.haul);
  const out: { c: H.Contract; now: number[]; routed: number[]; F: number }[] = [];
  for (let k = 1; k <= n; k++) {
    const c = H.contractAt(cfg, g.haul.seed, k, rings, p.F, g.haul.trait, st);
    const r = st.reach(c.wants.map((w) => w.ore));
    out.push({ c, now: r.now, routed: r.routed, F: p.F });
  }
  return out;
}

describe('audit 2: the contract rule (section 2.6, Decision 32)', () => {
  it('no contract asks for at most what the routes as they are already put into one launch (met by doing nothing)', () => {
    // Spec 2.6: "A contract above the current share is not met by doing nothing." When an ore already
    // has fleetShare of the fleet, `reach` moves no drone (routed = now) and the units are round(now):
    // half of them round down and are met by an untouched station, at x1.5 to x1.9 on ~90 % of the cargo.
    const free = draws(tenMinutes()).filter((d) => d.c.wants.every((w, i) => w.units <= d.now[i] + 1e-9));
    expect(free.map((d) => `${JSON.stringify(d.c.wants)} now ${d.now.map((x) => x.toFixed(1))}`).slice(0, 3)).toEqual([]);
  });

  it('such a contract really is met by an untouched station (autopilot, policy contract, no drone moved)', () => {
    const g0 = tenMinutes();
    const d = draws(g0).find((x) => x.c.wants.length === 1 && x.c.wants[0].units <= x.now[0])!;
    expect(d, 'a one-ore contract below the current share').toBeTruthy();
    let g: Run = { ...g0, haul: { ...g0.haul, contracts: { unlocked: true, board: [d.c], next: d.c.k + 1, active: 0 } } };
    let met: boolean | null = null;
    for (let i = 0; i < 2400 && met === null; i++) {
      const ev: H.HaulEvent[] = [];
      g = H.advanceHaul(cfg, g, 0.5, 0, ev) as Run;
      for (const e of ev) if (e.type === 'warp') met = e.met;
    }
    // Should be false: a contract nobody routed for is not met.
    expect(met).toBe(false);
  });

  it('a two-ore contract over the only two ores of the station leaves room in the hold (not the whole hold in exact proportion)', () => {
    // With two ores present and both on the contract, nothing can be moved (each is a wanted ore), so
    // routed = now for both and the units are round(now_a) + round(now_b) = floor(F): the hold must
    // arrive in exactly that proportion, which a full hold of F almost never does. 40 % of the
    // contracts of the first 25 minutes are of this kind (bot states at 4 and 10 minutes).
    const two = draws(tenMinutes()).filter((d) => d.c.wants.length === 2);
    expect(two.length).toBeGreaterThan(50);
    const wholeHold = two.filter((d) => d.c.wants.reduce((a, w) => a + w.units, 0) >= Math.floor(d.F) - 1);
    expect(wholeHold.length, `e.g. ${JSON.stringify(wholeHold[0]?.c.wants)} with F = ${Math.floor(two[0].F)}`).toBe(0);
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
    expect(loaded.haul.contracts.board.length).toBe(cfg.haul.contracts.board);
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
