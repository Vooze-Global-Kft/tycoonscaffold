/**
 * Hour 0's contract (yard-stage1.md section 9): the frozen test content names only keys the contract
 * declares (text keys of its goals and lessons, sprite ids in the art manifest's form), every refusal
 * key has a text key, and the content types keep the prototype's units (grams in pieces).
 */
import { describe, expect, it } from 'vitest';
import { SALVAGE_TEST } from '../fixtures/salvage';
import { REFUSAL_KEYS, TEXT_KEYS } from './types';

const ALL = new Set<string>(Object.values(TEXT_KEYS).flat());

describe('the hour-0 contract', () => {
  it('goals and lessons of the test content are text keys', () => {
    for (const g of SALVAGE_TEST.goals) expect(ALL.has(g.text), g.text).toBe(true);
    for (const k of Object.values(SALVAGE_TEST.lessons)) expect(ALL.has(k), k).toBe(true);
  });
  it('every refusal key has its text key, and text keys are unique', () => {
    for (const k of REFUSAL_KEYS) expect(ALL.has(`refusal.${k}`)).toBe(true);
    expect(ALL.size).toBe(Object.values(TEXT_KEYS).flat().length);
  });
  it('sprites are dotted art-manifest ENTRY ids (no frame suffix); pieces are whole grams', () => {
    for (const g of Object.values(SALVAGE_TEST.grades)) if (g.sprite) expect(g.sprite).toMatch(/^[a-z0-9]+(\.[a-z0-9]+)+$/);
    for (const o of Object.values(SALVAGE_TEST.objects)) {
      expect(o.sprite ?? '').not.toMatch(/\.(whole|cut\d+)$/);
      for (const [, g, n] of o.pieces) expect(Number.isInteger(g) && Number.isInteger(n)).toBe(true);
    }
  });
  it('content3.json parses (but for the battery grade the build drops)', async () => {
    const fs = await import('node:fs');
    const file = '/tmp/claude-0/-home-user/f22d4cbe-c353-58da-a893-27d84a9b8342/scratchpad/yard/proto/content3.json';
    if (!fs.existsSync(file)) return;
    const { SalvageSchema } = await import('../../config/schema.salvage');
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    delete raw.grades.batt;
    const r = SalvageSchema.safeParse(raw);
    expect(r.success ? '' : r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n')).toBe('');
  });
  it('the formatters print the yard units', async () => {
    const M = await import('./money');
    expect(M.fmtTonnes(150_000)).toBe('0.15 t');
    expect(M.fmtKg(28_640)).toBe('28.6');
    expect(M.fmtRate(1_200_000)).toBe('1.2 t');
    expect(M.fmtRate(640_000)).toBe('640 kg');
    expect(M.fmtDay(0, Date.UTC(2026, 10, 25))).toBe('25 Nov');
    expect(M.fmtDay(37, Date.UTC(2026, 0, 5))).toBe('11 Feb');
    expect(M.fmtHours(4)).toBe('4 h');
    expect(M.fmtHours(1.5)).toBe('1.5 h');
  });
});

// ================================================================================================ contract version 3 (contract2)

import { GameConfigSchema } from '../../config/schema';
import { SalvageSchema } from '../../config/schema.salvage';
import gameJson from '../../../games/scrap-yard/game.json';
import * as E from '../economy';
import { FIXTURE_NAMES, FIXTURE_NOW, fixtureGame, withTestContent } from '../fixtures/salvage';
import gate5 from '../fixtures/salvage-gate5.json';
import { freshSalvage } from './create';
import { SAMPLE_TEXT_KEYS, SAMPLES, sampleCard } from './samples2';
import { reconcileSalvage } from './save';
import { freshStage2, STAGE2_KEYS } from './state2';
import { CARD_KINDS_V3, REFUSAL_KEYS_V3, STAGE2_QUEUE_ORDER, type SalvageConfig, type SalvageGame, type SalvageState } from './types';

const cfg3 = withTestContent(GameConfigSchema.parse(gameJson));
const base3 = (cash?: number) => ({ ...E.createInitialState(cfg3, FIXTURE_NOW), ...(cash === undefined ? {} : { cash }) });
const rt = <T>(x: T): T => JSON.parse(JSON.stringify(x));
/** The state as a reload must keep it: the epoch is bumped and the presence's timing is never trusted. */
const norm3 = (s: SalvageState) => ({ ...s, epoch: 0, presenceAt: 0, presence: { ...s.presence, moving: false, standingFor: 0 } });
const without = (s: object, keys: readonly string[]) => Object.fromEntries(Object.entries(s).filter(([k]) => !keys.includes(k)));
/** A layout-2 save of a state: what the first yard's build wrote (no stage-2 field, `v: 2`). */
const asLayout2 = (g: SalvageGame) => {
  const raw = rt(g) as unknown as { salvage: Record<string, unknown> };
  for (const k of STAGE2_KEYS) delete raw.salvage[k];
  raw.salvage.v = 2;
  return raw;
};

describe('contract version 3: the shapes', () => {
  it('a fresh yard is layout 3 and carries every stage-2 field, fresh, serialisable', () => {
    const s = freshSalvage(cfg3.salvage, FIXTURE_NOW);
    expect(s.v).toBe(3);
    const f2 = freshStage2(cfg3.salvage, FIXTURE_NOW, s.clock.day);
    for (const k of STAGE2_KEYS) expect(s[k], k).toEqual(f2[k]);
    expect(rt(s)).toEqual(s);
    expect(s.iap).toMatchObject({ createdMs: FIXTURE_NOW, sessions2At: null, pending: [], ledger: [], ageBand: null, hidden: null });
    expect(s.lots.nextAt).toBeNull();
    expect(s.reuse.nextAt).toBeNull();
    expect(s.bank.agreement).toBeNull();
    expect(s.forklift).toBeNull();
  });
  it('the new refusal keys, card kinds and queue kinds are unique and new', () => {
    const v1 = new Set<string>(REFUSAL_KEYS);
    expect(new Set(REFUSAL_KEYS_V3).size).toBe(REFUSAL_KEYS_V3.length);
    for (const k of REFUSAL_KEYS_V3) {
      expect(v1.has(k), k).toBe(false);
      expect(k).toMatch(/^[a-z][A-Za-z0-9]*$/);
    }
    expect(new Set(CARD_KINDS_V3).size).toBe(CARD_KINDS_V3.length);
    expect([...STAGE2_QUEUE_ORDER]).toEqual(['plate', 'hall', 'commission', 'crane', 'lot', 'visitor', 'van']);
    // strings2 gives each its text key; until then they are a list of their own (refusals.ts).
    const missing = REFUSAL_KEYS_V3.filter((k) => !ALL.has(`refusal.${k}`));
    if (missing.length) console.info(`[contract2] refusal text keys still to add (strings2): ${missing.map((k) => `refusal.${k}`).join(', ')}`);
  });
  it('every stage-2 card kind has a sample, marked as a sample, serialisable', () => {
    for (const kind of CARD_KINDS_V3) {
      const c = SAMPLES[kind]();
      expect(c.kind).toBe(kind);
      expect(c.sample).toBe(true);
      expect(typeof c.showsDebt).toBe('boolean');
      expect(rt(c)).toEqual(c);
    }
    expect(sampleCard({ kind: 'works', plate: 'baler' })?.works?.plate).toBe('baler');
    expect(sampleCard({ kind: 'office', tab: 'agreements' })?.kind).toBe('agreements');
    expect(sampleCard({ kind: 'deal' })).toBeNull();
    const missing = SAMPLE_TEXT_KEYS.filter((k) => !ALL.has(k));
    if (missing.length) console.info(`[contract2] sample text keys still to add (strings2): ${missing.join(', ')}`);
  });
  it('4.1: no shop entry and no ad on a card that shows a debt; the finance card and Agreements show one, the shop never', () => {
    const MONEY_ACTS = new Set(['buyPack', 'buyProduct', 'watchAd', 'restorePurchases']);
    const acts = (x: unknown, out: string[] = []): string[] => {
      if (x && typeof x === 'object') {
        const a = (x as { act?: unknown }).act;
        if (typeof a === 'string') out.push(a);
        for (const v of Object.values(x)) acts(v, out);
      }
      return out;
    };
    for (const kind of CARD_KINDS_V3) {
      const c = SAMPLES[kind]();
      if (c.showsDebt) expect(acts(c).filter((a) => MONEY_ACTS.has(a)), kind).toEqual([]);
    }
    expect(SAMPLES.finance().showsDebt).toBe(true);
    expect(SAMPLES.agreements().showsDebt).toBe(true);
    expect(SAMPLES.shop().showsDebt).toBe(false);
    // The finance card's sign carries the terms as shown (2.14.3), and they add up (T = F + charge, d = P − F).
    const f = SAMPLES.finance().finance!;
    expect(f.T).toBe(f.F + f.charge);
    expect(f.deposit).toBe(f.P - f.F);
    expect(f.sign.action).toEqual({ act: 'signFinance', plate: f.plate, shown: { P: f.P, F: f.F, charge: f.charge, T: f.T } });
  });
});

describe('2.20 the save: layout 3 accepts layout 2 (the first test written: the owner\'s yard)', () => {
  for (const name of FIXTURE_NAMES) {
    it(`${name}, saved as layout 2, loads into layout 3 with nothing of the first yard lost`, () => {
      const g = fixtureGame(name, base3(), FIXTURE_NOW) as SalvageGame;
      const l2 = asLayout2(g);
      const back = reconcileSalvage(cfg3, base3(g.cash), l2, FIXTURE_NOW);
      expect(back.salvage.v).toBe(3);
      expect(back.cash).toBe(g.cash);
      // Every field of the first yard as the layout-2 save held it (cash, supplied, every stock, every crew member, ...).
      expect(without(norm3(back.salvage), [...STAGE2_KEYS, 'v'])).toEqual(without(norm3(l2.salvage as unknown as SalvageState), ['v']));
      expect(back.salvage.ladder.supplied_g).toBe(g.salvage.ladder.supplied_g);
      expect(back.salvage.crew).toEqual(rt(g.salvage.crew));
      expect(back.salvage.bays).toEqual(rt(g.salvage.bays));
      // The stage-2 fields fresh: createdMs the migration's time, sessions2At null, lots.nextAt null.
      const later = FIXTURE_NOW + 3 * 3600_000;
      const mig = reconcileSalvage(cfg3, base3(g.cash), asLayout2(g), later);
      expect(mig.salvage.iap.createdMs).toBe(later);
      expect(mig.salvage.iap.sessions2At).toBeNull();
      expect(mig.salvage.lots.nextAt).toBeNull();
      expect(without(mig.salvage, Object.keys(mig.salvage).filter((k) => !(STAGE2_KEYS as readonly string[]).includes(k)))).toEqual(freshStage2(cfg3.salvage, later, mig.salvage.reuse.sold.day));
    });
  }

  it('the recorded stage-1 save (bots/gate5, layout 2) loads into layout 3 as it was', () => {
    const c = SalvageSchema.parse(gate5.content);
    const cfg = { mode: 'salvage', salvage: { ...c, worldSeed: gate5.worldSeed } } as unknown as SalvageConfig;
    const recorded = gate5.g as unknown as SalvageGame;
    expect((recorded.salvage as { v: number }).v).toBe(2);
    const back = reconcileSalvage(cfg, { ...base3(), cash: recorded.cash }, rt({ salvage: recorded.salvage }), gate5.now);
    expect(back.salvage.v).toBe(3);
    expect(back.salvage.ladder).toEqual(recorded.salvage.ladder);
    expect(back.salvage.things.length).toBe(recorded.salvage.things.length);
    expect(back.salvage.pieces.length).toBe(recorded.salvage.pieces.length);
    expect(Object.fromEntries(Object.entries(back.salvage.bays).map(([k, b]) => [k, b.g]))).toEqual(Object.fromEntries(Object.entries(recorded.salvage.bays).map(([k, b]) => [k, b.g])));
    expect(back.salvage.crew.map((m) => [m.id, m.level])).toEqual(recorded.salvage.crew.map((m) => [m.id, m.level]));
    expect(back.salvage.iap.createdMs).toBe(gate5.now);
    expect(back.salvage.works).toEqual({});
  });

  it('a layout-3 save round-trips, an open agreement and a pending quote included', () => {
    const g = rt(fixtureGame('m30', base3(), FIXTURE_NOW)) as SalvageGame;
    const s = g.salvage;
    const t = s.t;
    s.works = {
      baler: { owned: true, level: 2, hopper: [], work: null, tray_g: { lib: 12000 }, trayClaim_g: {}, status: 'idle', since: t - 100, plate: 'baler', phase: 'running', commissionAt: null, commissionedBy: 'boss' },
      rotary: {
        owned: true, level: 1, hopper: [], work: null, tray_g: {}, trayClaim_g: {}, status: 'idle', since: t - 50, plate: 'rotary', phase: 'installed', commissionAt: t + 1150,
        heat: { recipe: 'alu', fromBays: true, charge_g: 0, heel_g: 0, phase: 'empty', phaseSince: t - 50, endsAt: null, lastFeedAt: t - 50, firstPoured: false, cooling: null },
        segStart: t - 50, drawn_g: { alw: 5000 },
      },
    };
    s.routes = { li: 'baler', tcab: 'bay' };
    s.lots = { nextAt: t + 10800, n: 2 };
    s.reuse = { nextAt: t + 690, vanAt: null, level: 1, sold: { day: s.clock.day, n: 1, money: 261.25 } };
    s.bank = { agreement: { kind: 'bank', plate: 'shear', P: 80000, F: 64000, c: 5120, T: 69120, taken: 124, signedAt: t - 10, I: 54500 }, letterSeen: true, done: [] };
    s.iap = {
      looks: { colour: 'colour2', dressing: null, plaque: null, sign: 'rung3' },
      ledger: [{ txId: 'sim:pack2:1:1', product: 'pack2', S: 109000, atMs: FIXTURE_NOW - 5000, quote: 'q1' }],
      pending: [{ id: 'q2', product: 'pack5', S: 272500, I: 54500, atMs: FIXTURE_NOW - 1000, known: ['sim:pack2:1:1'], state: 'waiting' }],
      hidden: { codeHash: 'h:1234' },
      ageBand: 'a18',
      createdMs: FIXTURE_NOW - 86400_000,
      sessions2At: t - 3600,
    };
    s.ads = { day: s.clock.day, awayUsed: 1, spotUsed: 2, awayOffer: { amount: 1250, I: 54500 } };
    s.forklift = { x: 43.75, y: 38.35, heading: 2, by: null, load: [] };
    s.counts = { ...s.counts, bathSet: 1, 'quote#': 2 };
    const back = reconcileSalvage(cfg3, base3(g.cash), rt(g), FIXTURE_NOW);
    expect(norm3(back.salvage)).toEqual(norm3(rt(s)));
    // ... and once more (a reload of a reload is the same).
    expect(norm3(reconcileSalvage(cfg3, base3(g.cash), rt(back), FIXTURE_NOW).salvage)).toEqual(norm3(back.salvage));
  });

  it('broken stage-2 parts are repaired, never invented; the ledger is never cut short', () => {
    const g = rt(fixtureGame('m30', base3(), FIXTURE_NOW)) as SalvageGame;
    const raw = g as unknown as { salvage: Record<string, unknown> };
    raw.salvage.works = { baler: { phase: 'nonsense', owned: true }, shear: 7 };
    raw.salvage.bank = { agreement: { kind: 'bank', plate: 'shear', P: 1, F: 1, c: 0, T: 100, taken: 1e9, signedAt: 0, I: 1 }, letterSeen: 'yes', done: 'x' };
    raw.salvage.iap = { pending: [{ id: 'q1', product: 'pack2', S: 5, I: 1, atMs: 1, known: [], state: 'lost' }], ledger: Array.from({ length: 2000 }, (_, i) => ({ txId: `t${i}`, product: 'pack2', S: 1, atMs: i })), ageBand: 'adult', createdMs: Number.NaN };
    raw.salvage.lots = { nextAt: 'soon', n: -4 };
    raw.salvage.forklift = { x: Number.NaN, y: 1 };
    const back = reconcileSalvage(cfg3, base3(), raw, FIXTURE_NOW).salvage;
    expect(back.works).toEqual({});
    expect(back.bank.agreement?.taken).toBe(100);
    expect(back.bank.letterSeen).toBe(true);
    expect(back.bank.done).toEqual([]);
    expect(back.iap.pending).toEqual([]);
    expect(back.iap.ledger).toHaveLength(2000);
    expect(back.iap.ageBand).toBeNull();
    expect(back.iap.createdMs).toBe(FIXTURE_NOW);
    expect(back.lots).toEqual({ nextAt: null, n: 0 });
    expect(back.forklift).toBeNull();
  });

  it('a merchant\'s round under way ends no later than the save\'s clock + loading + the round (a save of the old long round)', () => {
    const g = rt(fixtureGame('m30', base3(), FIXTURE_NOW)) as SalvageGame;
    const s = g.salvage;
    const m = cfg3.salvage.merchant;
    s.merchant = { ...s.merchant, phase: 'away', since: s.t - 5, endsAt: s.t + 50 * m.round_s };
    const back = reconcileSalvage(cfg3, base3(), rt(g), FIXTURE_NOW).salvage;
    expect(back.merchant.endsAt).toBe(s.t + m.load_s + m.round_s);
    // A round as the rules make it is untouched.
    s.merchant = { ...s.merchant, phase: 'away', since: s.t - 5, endsAt: s.t - 5 + m.round_s };
    expect(reconcileSalvage(cfg3, base3(), rt(g), FIXTURE_NOW).salvage.merchant.endsAt).toBe(s.t - 5 + m.round_s);
  });

  it('an unknown layout still starts afresh', () => {
    const g = fixtureGame('m30', base3(), FIXTURE_NOW) as SalvageGame;
    for (const v of [1, 4, '3', null, undefined]) {
      const raw = rt(g) as unknown as { salvage: Record<string, unknown> };
      raw.salvage.v = v;
      const back = reconcileSalvage(cfg3, base3(), raw, FIXTURE_NOW);
      expect(back.salvage.t, String(v)).toBe(0);
      expect(back.salvage.v).toBe(3);
    }
  });
});
