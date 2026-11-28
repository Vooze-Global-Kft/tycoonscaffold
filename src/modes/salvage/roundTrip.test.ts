/**
 * C-MODE: THE WAY BACK (PLAN2 7 D1; critic-missing I1; the first-yard guard's part 1f). A works save opened by a
 * first-yard build (no STAGE) plays on as the first yard, and its works' part waits untouched for the next STAGE=2
 * start, with every date moved on by the yard time the first yard ran (save.ts freezeStage2 / thawStage2).
 *
 * Both configs come from the mode's own switch (returning.ts stagedConfig): OFF is the first yard's config, ON the
 * stage-2 config. The stage-2 save is made on the REAL rules from the loop's rung-5 save (src/engine/salvage/__fixtures__/
 * x6-r5.json, seed 611, 13 works): the age question answered (a band kept), a scrip pack quoted and granted (the
 * ledger), the first financeable plate not owned signed at the bank (an agreement open; the cash set just above its
 * deposit so that a loan is offered: the one hand-set number, the bank offers no loan while the price can be paid
 * outright), then ten minutes of the stage's own clock (the loan repays some, the halls heat and pour, a lot lies on the
 * pad). A hall's heat: the halls go cooling -> filling in the instant of a pour (halls.ts pour, hallFromBays), so the
 * "heat cooling" kept is each hall's heat with its last pour's `cooling` record and its own dated phase.
 * Then at stage 1: loaded, ten minutes of the normal hand, a three-day absence, saved; loaded at stage 2.
 * No tuned number is pinned. Owner: C-MODE.
 */
import fs from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import gameJson from '../../../games/scrap-yard/game.json';
import { GameConfigSchema } from '../../config/schema';
import * as R from '../../engine/salvage';
import { shownOf } from '../../engine/salvage/bank';
import { away, newBot, newSitting, playTo, seededCfg } from '../../engine/salvage/bot';
import { reconcileSalvage } from '../../engine/salvage/save';
import { packProducts, packS } from '../../engine/salvage/shop';
import { jump } from '../../engine/salvage/tick';
import type { SalvageConfig, SalvageGame, SalvageState } from '../../engine/salvage/types';
import { salvageEngineMode } from '../../engine/salvageMode';
import { deferAway } from './returning';

vi.mock('@react-native-async-storage/async-storage', () => ({ default: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} } }));
vi.mock('../../generated/activeGame', async () => ({ ACTIVE_GAME_ID: 'scrap-yard', rawGame: (await import('../../../games/scrap-yard/game.json')).default, fxTable: {}, gameAssets: {}, gameSounds: {}, displayFontMetrics: null }));
vi.mock('../../services/fx', () => ({ fx: { play: () => {} } }));
vi.mock('../../services/ads', () => ({ ads: { showRewarded: async () => true, maybeShowInterstitial: () => {}, init: () => {}, interstitials: true } }));
vi.mock('../../services/firebase', () => ({ analytics: { log: () => {} }, crash: { record: () => {} }, fetchRemoteOverrides: async () => ({}) }));
vi.mock('../../services/iap', () => ({ iap: { init: async () => {}, owned: async () => [], purchase: async () => true, restore: async () => [], listing: async () => null, onTransactions: () => () => {} } }));
vi.mock('../../services/region', () => ({ detectRegion: async () => null }));

const G = globalThis as { __DEV__?: boolean };
const was = { dev: G.__DEV__, v: process.env.EXPO_PUBLIC_YARD_STAGE };
afterEach(() => {
  if (was.dev === undefined) delete G.__DEV__;
  else G.__DEV__ = was.dev;
  if (was.v === undefined) delete process.env.EXPO_PUBLIC_YARD_STAGE;
  else process.env.EXPO_PUBLIC_YARD_STAGE = was.v;
});

const FX = JSON.parse(fs.readFileSync(new URL('../../engine/salvage/__fixtures__/x6-r5.json', import.meta.url), 'utf8')) as { seed: number; now: number; g: SalvageGame };

/** The config the mode's engine hands the store with the switch off (dev false) or on. */
function configAt(on: boolean): SalvageConfig {
  G.__DEV__ = on;
  if (on) process.env.EXPO_PUBLIC_YARD_STAGE = '2';
  else delete process.env.EXPO_PUBLIC_YARD_STAGE;
  const cfg = deferAway(salvageEngineMode).config!(GameConfigSchema.parse(gameJson)) as unknown as SalvageConfig;
  return seededCfg(cfg, FX.seed);
}
const saved = (g: SalvageGame) => JSON.parse(JSON.stringify(g)) as SalvageGame;
const load = (cfg: SalvageConfig, g: SalvageGame) => reconcileSalvage(cfg, { ...g, salvage: undefined } as never, saved(g), g.salvage.clock.highMs);
const plus = <T extends number | null | undefined>(v: T, d: number): T => (typeof v === 'number' ? v + d : v) as T;

/** The stage-2 save of the round trip (see the head of the file), on the real rules. */
function worksSave(cfg2: SalvageConfig): SalvageGame {
  let g = load(cfg2, FX.g);
  const clock = () => g.salvage.clock.highMs;
  g = R.setAgeBand(cfg2, g, new Date(clock()).getUTCFullYear() - 40, clock(), clock());
  const pk = packProducts(cfg2)[0];
  g = R.quotePack(cfg2, g, pk.product, packS(cfg2, g, pk.H), clock(), [], clock(), clock(), undefined, { country: 'US' } as never);
  const q = g.salvage.iap.pending[0];
  if (q) g = R.grantProduct(cfg2, g, { productId: q.product, txId: 'roundtrip-1', purchasedMs: q.atMs, own: { atMs: q.atMs } });
  const plates = Object.keys(cfg2.salvage.works?.plates ?? {});
  const plate = plates.find((p) => !g.salvage.works[p]?.owned && R.financeTerms(cfg2, g, p));
  if (plate) {
    const terms = R.financeTerms(cfg2, g, plate)!;
    g = { ...g, cash: terms.d * 2 };
    g = R.signFinance(cfg2, g, plate, shownOf(terms), clock());
  }
  return saved(jump(cfg2, g, g.salvage.t + 600));
}

/** What the works' part of a state is, with every yard-second date it carries (the dates thawStage2 moves). */
function worksPart(s: SalvageState) {
  const works = Object.fromEntries(
    Object.entries(s.works).map(([id, w]) => {
      const h = w.heat;
      return [id, { owned: w.owned, level: w.level, phase: w.phase, since: w.since, heat: h ? { recipe: h.recipe, phase: h.phase, charge_g: h.charge_g, firstPoured: h.firstPoured, phaseSince: h.phaseSince, endsAt: h.endsAt, lastFeedAt: h.lastFeedAt, cooling: h.cooling } : null }];
    }),
  );
  const pad = s.things.filter((th) => th.at.at === 'lot').map((th) => ({ uid: th.uid, obj: th.obj, since: (th.at as { since?: number }).since }));
  return { works, pad, lotsNextAt: s.lots.nextAt, bank: s.bank, ageBand: s.iap.ageBand, ledger: s.iap.ledger, sessions2At: s.iap.sessions2At };
}
/** The same, every date moved on by d (as thawStage2 says it moves them). */
function shifted(p: ReturnType<typeof worksPart>, d: number): ReturnType<typeof worksPart> {
  const works = Object.fromEntries(
    Object.entries(p.works).map(([id, w]) => [id, { ...w, since: plus(w.since, d), heat: w.heat ? { ...w.heat, phaseSince: plus(w.heat.phaseSince, d), endsAt: plus(w.heat.endsAt, d), lastFeedAt: plus(w.heat.lastFeedAt, d), cooling: w.heat.cooling ? { ...w.heat.cooling, since: plus(w.heat.cooling.since, d), ...(w.heat.cooling.until !== undefined ? { until: plus(w.heat.cooling.until, d) } : {}) } : null } : null }]),
  );
  return { ...p, works, pad: p.pad.map((t) => ({ ...t, since: plus(t.since, d) })), lotsNextAt: plus(p.lotsNextAt, d) };
}

describe('guard 1f: a works save at a first-yard build, and back at STAGE=2', () => {
  it('plays on as the first yard (10 minutes and a 3-day absence), keeps the works untouched, and gives them back with the dates moved on', () => {
    const cfg1 = configAt(false);
    const cfg2 = configAt(true);
    expect(cfg1.salvage.release?.stage).toBe(1);
    expect(cfg2.salvage.release?.stage).toBe(2);

    // The stage-2 save: an agreement open, a lot on the pad, a hall's heat with its last pour, scrip, an age band.
    const S2 = worksSave(cfg2);
    const before = worksPart(S2.salvage);
    expect(before.bank.agreement).not.toBeNull();
    expect(before.pad.length).toBeGreaterThan(0);
    expect(Object.values(before.works).some((w) => w.heat?.cooling)).toBe(true);
    expect(Object.values(before.works).some((w) => w.heat && w.heat.endsAt !== null)).toBe(true);
    expect(before.ageBand).not.toBeNull();
    expect(before.ledger.length).toBe(1);

    // A first-yard build opens it: no throw, the works aside, nothing of them runs.
    const g1 = load(cfg1, S2);
    const F0 = JSON.stringify(g1.salvage.stage2Frozen);
    expect(g1.salvage.stage2Frozen).toBeDefined();
    expect(Object.keys(g1.salvage.works)).toEqual([]);
    expect(g1.salvage.bank.agreement).toBeNull();
    // Ten minutes of the normal hand, then three days away, then saved.
    const b = newBot(cfg1, g1, g1.salvage.clock.highMs, { seed: FX.seed, hand: 'normal', habit: 'goal', route: 'A' } as Parameters<typeof newBot>[3]);
    const earned0 = b.g.lifetimeEarnings;
    playTo(b, b.g.salvage.t + 600);
    newSitting(b);
    away(b, 3 * 86_400);
    const g1b = saved(b.g);
    expect(g1b.lifetimeEarnings).toBeGreaterThan(earned0);
    expect(Object.keys(g1b.salvage.works)).toEqual([]);
    expect(JSON.stringify(g1b.salvage.stage2Frozen)).toBe(F0);

    // STAGE=2 again: the works' part as saved, every date moved on by the yard time the first yard ran.
    const g2 = load(cfg2, g1b);
    expect(g2.salvage.stage2Frozen).toBeUndefined();
    const d = g1b.salvage.t - (g1.salvage.stage2Frozen as unknown as { t: number }).t;
    expect(d).toBeGreaterThan(600);
    expect(worksPart(g2.salvage)).toEqual(shifted(before, d));
    // It goes on at stage 2: a minute of the works, no throw; the loan still open or repaid on.
    const g3 = jump(cfg2, g2, g2.salvage.t + 60);
    expect(Object.keys(g3.salvage.works).sort()).toEqual(Object.keys(before.works).sort());
    const ag = g3.salvage.bank.agreement;
    if (ag) expect(ag.taken).toBeGreaterThanOrEqual(before.bank.agreement!.taken);
    else expect(g3.salvage.bank.done.length).toBe(before.bank.done.length + 1);
  }, 600_000);
});
