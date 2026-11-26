/**
 * s2a-fix (stage 2, Phase A, 26 November): the faults the critic of Phase A's ground found
 * (attack/s2a/: layer.ts, broken.ts, breaks.ts), each pinned where it was fixed. Owner: engine2 (the loop's
 * files, layer.ts) with contract2's save and state; content checks are contentChecks.test.ts's. On the frozen
 * test content and on the frozen stage-2 states with their own content (no tuned number pinned).
 * - which content a state reads: the works layer joins only once the works open (counts.bathSet), memoised;
 *   a save keeps the stage-2 things it holds and the tier-4 tool (layer.ts; save.ts);
 * - the works open only in live play, so beat 1 of 1.3 reaches the screen after hours away (rate.ts checks);
 * - a yard hand never carries as scrap a whole or loose thing the Yard sale takes (crew.ts, rackChoice);
 * - the away card's money stays gross of the bank, its bank line sums the bank's part (clock.ts bankPart);
 *   granted scrip is counted apart (credit);
 * - a newer layout loads (save.ts), dated fields in the past are clamped, an agreement repaid in full closes
 *   (state2.ts);
 * - the contract's shop types are the shared ones (types.ts).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProductArrival as SharedArrival, ProductListing as SharedListing } from '../mode';
import type { QuoteOutcome as SharedOutcome } from '../../state/store';
import { FIXTURE_NOW, FIXTURE_STATES, SALVAGE_TEST, stage2Cfg, stage2Content, stage2Game } from '../fixtures/salvage';
import * as R from '../salvage';
import { begin, credit } from './clock';
import { hireCheck } from './ladder';
import { contentAt, mergedContent, topToolTier } from './layer';
import { reconcileSalvage } from './save';
import { awayPass } from './away';
import { repairStage2, freshStage2, STAGE2_KEYS } from './state2';
import type { GroundPiece, ProductArrival, ProductListing, QuoteOutcome, SalvageConfig, SalvageGame, SalvageState, ThingState } from './types';

const H = vi.hoisted(() => ({
  /** reuse.ts rackChoice: the uids a crew member must keep off. */
  keepOff: new Set<string>(),
  /** bank.ts payLot: the bank's share of each gross, and what it returned. */
  share: 0,
  pays: [] as { gross: number; y: number; z: number }[],
}));
vi.mock('./reuse', async (orig) => {
  const real = (await orig()) as Record<string, unknown>;
  return { ...real, rackChoice: (_x: unknown, _who: unknown, _t: number, th: { uid: string } | null) => !!th && H.keepOff.has(th.uid) };
});
vi.mock('./bank', () => ({
  payLot: (_x: unknown, gross: number) => {
    const y = Math.round(H.share * gross * 100) / 100;
    const z = Math.round((gross - y) * 100) / 100;
    H.pays.push({ gross, y, z });
    return { y, z };
  },
}));
// owner1-rules (RULING-owner1 S3): the works.ts double that counted worksOpen is gone: rate.ts binds the REAL worksOpen
// (it is evaluated inside the mock factory's own import), so the double was bypassed and its count stayed 0. The rule is
// tested on the real opening path: the event backFieldOpen and counts.bathSet.

beforeEach(() => {
  H.keepOff.clear();
  H.share = 0;
  H.pays.length = 0;
});

const C = SALVAGE_TEST;
const cfgT = { mode: 'salvage', salvage: C } as unknown as SalvageConfig;
const base = (cash = 0) => ({ cash, lifetimeEarnings: 0, lastSavedAt: FIXTURE_NOW, stats: { playSeconds: 0, clockHigh: FIXTURE_NOW } }) as never;
const gameOf = (n: keyof typeof FIXTURE_STATES): SalvageGame => {
  const f = FIXTURE_STATES[n];
  return { ...(base() as object), cash: f.cash, lifetimeEarnings: f.lifetimeEarnings, salvage: structuredClone(f.salvage) as SalvageState } as SalvageGame;
};
const rt = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

describe('which content a state reads (layer.ts; the critic\'s blocking finding 1)', () => {
  it('the base content itself until the works open, the merged view after; memoised per content object', () => {
    const c = stage2Content();
    expect(c.worksLayer).toBeDefined();
    expect(contentAt(c, { counts: {} })).toBe(c);
    const m = contentAt(c, { counts: { bathSet: 1 } });
    expect(m).not.toBe(c);
    expect(m).toBe(mergedContent(c));
    expect(mergedContent(m)).toBe(m);
    expect(m.grades.ss).toBeDefined();
    expect(m.shop.some((i) => i.key === 'baler')).toBe(true);
    expect(c.grades.ss).toBeUndefined();
    // No layer (the first yard's test content): the content itself, merged or not.
    expect(mergedContent(C)).toBe(C);
    expect(contentAt(C, { counts: { bathSet: 1 } })).toBe(C);
    expect(topToolTier(C)).toBe(3);
    expect(topToolTier(m)).toBe(4);
  });

  it('a transition reads the merged content once the bath is set, the base before (clock.ts begin)', () => {
    const cfg = stage2Cfg('r3');
    const g = stage2Game('r3');
    expect(begin(cfg, g, []).c).toBe(cfg.salvage);
    const opened = { ...g, salvage: { ...g.salvage, counts: { ...g.salvage.counts, bathSet: 1 } } };
    expect(begin(cfg, opened, []).c).toBe(mergedContent(cfg.salvage));
  });

  it('a save keeps the stage-2 grades, things, shop keys and the tier-4 tool it holds; adds no works-layer partner (save.ts)', () => {
    const cfg = stage2Cfg('r3');
    const g = rt(stage2Game('r3'));
    const s = g.salvage as SalvageState;
    s.bays.ss = { g: 5000, n: 0, held: false, aside: [], forCrucible_g: 0, forDeal_g: 0 };
    s.owned.push('truckBridge', 'plasma');
    s.tier = 4;
    s.pieces.push({ uid: 'x.p0', grade: 'bzs', g: 2500, from: null, spec: 0, pile: 'floor', k: 99, claim: null } as GroundPiece);
    s.things.push({ uid: 'f9999', obj: 'elv', at: { at: 'floor', slot: 3 }, cut: 0, progress: 0, by: null } as ThingState);
    s.partners['partner.garage'] = { ...s.partners.partnerFarm };
    const back = reconcileSalvage(cfg, base(g.cash), rt({ salvage: s }), FIXTURE_NOW).salvage;
    expect(back.bays.ss?.g).toBe(5000);
    expect(back.owned).toEqual(expect.arrayContaining(['truckBridge', 'plasma']));
    expect(back.tier).toBe(4);
    expect(back.pieces.some((p) => p.uid === 'x.p0')).toBe(true);
    expect(back.things.some((t) => t.uid === 'f9999')).toBe(true);
    expect(back.partners['partner.garage']).toBeDefined();
    // ... and a save that holds none of them gains none (no partner state invented).
    const plain = reconcileSalvage(cfg, base(g.cash), rt({ salvage: stage2Game('r3').salvage }), FIXTURE_NOW).salvage;
    expect(plain.partners['partner.garage']).toBeUndefined();
    expect(plain.tier).toBe(stage2Game('r3').salvage.tier);
    // On the first yard's content (no layer) the tier is clamped to its highest tool, 3.
    const t = rt(gameOf('m30'));
    t.salvage.tier = 4;
    expect(reconcileSalvage(cfgT, base(), rt(t), FIXTURE_NOW).salvage.tier).toBe(3);
  });
});

describe('the works open only in live play (rate.ts checks; the critic\'s finding 4)', () => {
  it('a layout-2 save at rung 3, six hours away, then the card closed: backFieldOpen is heard exactly once, at the first live instant', () => {
    const cfg = stage2Cfg('r3');
    const r3 = rt(stage2Game('r3'));
    expect(r3.salvage.ladder.rung).toBe(3);
    expect(r3.salvage.counts?.bathSet).toBeUndefined();
    // As the owner's phone holds it: layout 2, no stage-2 field.
    const raw = rt(r3) as unknown as { salvage: Record<string, unknown> };
    raw.salvage.v = 2;
    for (const k of STAGE2_KEYS) delete raw.salvage[k];
    let g = reconcileSalvage(cfg, { ...(r3 as object), salvage: undefined } as never, raw, r3.salvage.clock.highMs);
    g = { ...g, cash: r3.cash, lastSavedAt: r3.salvage.clock.highMs, stats: { ...(r3.stats ?? {}), playSeconds: 0, clockHigh: r3.salvage.clock.highMs } } as SalvageGame;
    const later = g.salvage.clock.highMs + 6 * 3600 * 1000;
    const off = R.salvageOffline(cfg, g, later).game;
    expect(off.salvage.t).toBeGreaterThan(g.salvage.t);
    // Away: the works never open (no bath, and the away pass's own events hold no opening).
    expect(off.salvage.counts?.bathSet).toBeUndefined();
    const offEv: R.SalvageEvent[] = [];
    awayPass(cfg, g, later, offEv);
    expect(offEv.filter((e) => (e as { type: string }).type === 'backFieldOpen').length).toBe(0);
    let h = R.ackAway(cfg, off);
    const ev: R.SalvageEvent[] = [];
    let ms = later;
    for (let k = 0; k < 30; k++) {
      ms += 100;
      h = R.advanceSalvage(cfg, h, 0.1, ms, ev);
    }
    // Live: opened once, at the first live instant (the first tick after the card closed), never again.
    const opens = ev.map((e, i) => ((e as { type: string }).type === 'backFieldOpen' ? i : -1)).filter((i) => i >= 0);
    expect(opens.length).toBe(1);
    expect(h.salvage.counts?.bathSet).toBe(1);
  });
});

describe('a yard hand never carries a thing the Yard sale takes as scrap (crew.ts; the critic\'s finding 5)', () => {
  const setup = (keep: boolean) => {
    let g = R.createSalvage(cfgT, { ...(base() as object), cash: 100_000 } as never, FIXTURE_NOW);
    // One loose tier-0 thing on the tipping floor and nothing else to carry; the boss stale (away from the yard).
    const things: ThingState[] = [{ uid: 'k1', obj: 'taps', at: { at: 'floor', slot: 0 }, cut: 0, progress: 0, by: null }];
    g = { ...g, salvage: { ...g.salvage, things, pieces: [], dropoff: { ...g.salvage.dropoff, nextAt: -1 }, presenceAt: -1000 } };
    if (keep) H.keepOff.add('k1');
    g = R.hire(cfgT, g, 'hand', hireCheck(cfgT, g, 'hand').price ?? 0, g.salvage.t);
    return g;
  };
  it('a loose thing kept off stays where it is; the same thing not kept off is carried', () => {
    const kept = setup(true);
    expect(kept.salvage.things.find((t) => t.uid === 'k1')?.by).toBeNull();
    expect(kept.salvage.crew.find((m) => m.role === 'hand')?.job).toBe('idle');
    H.keepOff.clear();
    const taken = setup(false);
    expect(taken.salvage.things.find((t) => t.uid === 'k1')?.by).toBe('hand.0');
  });
});

describe('the bank\'s part while away and granted scrip (clock.ts; the critic\'s minors 17 and 3 (g))', () => {
  it('the away card\'s money stays gross and its bank line sums what the bank took; nothing of it without a share', () => {
    const g0 = gameOf('m30');
    const later = g0.salvage.clock.highMs + 3 * 3600 * 1000;
    const plain = R.salvageOffline(cfgT, { ...g0, lastSavedAt: g0.salvage.clock.highMs }, later).game.salvage.away!;
    expect(plain).toBeTruthy();
    expect('bank' in plain).toBe(false);
    H.pays.length = 0;
    H.share = 0.2;
    const card = R.salvageOffline(cfgT, { ...g0, lastSavedAt: g0.salvage.clock.highMs }, later).game.salvage.away!;
    const y = H.pays.reduce((a, p) => a + p.y, 0);
    const z = H.pays.reduce((a, p) => a + p.z, 0);
    expect(y).toBeGreaterThan(0);
    expect(card.bank).toBeCloseTo(y, 2);
    expect(card.money).toBeCloseTo(y + z, 2);
  });
  it('granted scrip adds to cash and earned and to the granted total apart; an ad reward does not count as granted', () => {
    const x = begin(cfgT, gameOf('m5'), []);
    const cash = x.cash;
    credit(x, 12.34, x.s.t, 'grant');
    credit(x, 5, x.s.t, 'ad');
    expect(x.cash).toBeCloseTo(cash + 17.34, 6);
    expect(x.s.counts!['granted:c']).toBe(1234);
  });
});

describe('the save and the state (save.ts, state2.ts; the critic\'s findings 12 to 14)', () => {
  const g = () => rt(gameOf('m30'));
  it('dated fields saved before the save\'s clock are clamped to it (the loop never applies a date in the past)', () => {
    const s = g().salvage;
    const t = s.t;
    const fresh = freshStage2(C, FIXTURE_NOW, s.clock.day);
    const raw = {
      ...s,
      lots: { nextAt: t - 500, n: 2 },
      reuse: { nextAt: t - 900, vanAt: t - 1, level: 0, sold: { day: 0, n: 0, money: 0 } },
      works: { baler: { phase: 'installed', owned: true, level: 1, hopper: [], tray_g: {}, trayClaim_g: {}, since: 0, status: 'idle', work: null, commissionAt: t - 60, heat: { recipe: 'alu', fromBays: true, charge_g: 0, heel_g: 0, phase: 'heating', phaseSince: t - 10, endsAt: t - 5, lastFeedAt: t - 10, firstPoured: false, cooling: null } } },
    } as unknown as Partial<SalvageState>;
    const r = repairStage2(raw, fresh, t);
    expect(r.lots.nextAt).toBe(t);
    expect(r.reuse.nextAt).toBe(t);
    expect(r.reuse.vanAt).toBe(t);
    expect(r.works.baler.commissionAt).toBe(t);
    expect(r.works.baler.heat?.endsAt).toBe(t);
    // a date in the future is kept as it is
    expect(repairStage2({ ...raw, lots: { nextAt: t + 7, n: 0 } } as Partial<SalvageState>, fresh, t).lots.nextAt).toBe(t + 7);
  });
  it('an agreement saved with taken >= T goes into the history, repaid at the save\'s clock', () => {
    const s = g().salvage;
    const raw = { ...s, bank: { agreement: { kind: 'bank', plate: 'shear', P: 1000, F: 800, c: 64, T: 864, taken: 99999, signedAt: 10, I: 5 }, letterSeen: true, done: [] } } as unknown as Partial<SalvageState>;
    const r = repairStage2(raw, freshStage2(C, FIXTURE_NOW, s.clock.day), s.t);
    expect(r.bank.agreement).toBeNull();
    expect(r.bank.done).toEqual([{ plate: 'shear', T: 864, signedAt: 10, repaidAt: s.t }]);
  });
  it('a waiting quote keeps why it waits; an unreadable reason reads as none', () => {
    const s = g().salvage;
    const q = (wait: unknown) => ({ id: 'q1', product: 'pack2', S: 5, I: 1, atMs: 1, askedMs: 2, known: [], state: 'waiting', wait });
    const raw = { ...s, iap: { pending: [q('unconfirmed'), { ...q('nonsense'), id: 'q2' }] } } as unknown as Partial<SalvageState>;
    const r = repairStage2(raw, freshStage2(C, FIXTURE_NOW, s.clock.day), s.t);
    expect(r.iap.pending.map((p) => p.wait)).toEqual(['unconfirmed', null]);
  });
});

describe('the contract\'s shop types are the shared ones (types.ts; the critic\'s finding 6)', () => {
  it('QuoteOutcome, ProductArrival and ProductListing equal the shared store\'s (a compile-time check)', () => {
    const same = <A, B>(a: A extends B ? (B extends A ? true : false) : false) => a;
    expect(same<QuoteOutcome, SharedOutcome>(true)).toBe(true);
    expect(same<ProductArrival, SharedArrival>(true)).toBe(true);
    expect(same<ProductListing, SharedListing>(true)).toBe(true);
  });
});
