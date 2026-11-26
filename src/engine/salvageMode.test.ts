/// <reference types="node" />
/**
 * The salvage engine mode (src/engine/salvageMode.ts) and the hour-0 facade (src/engine/salvage.ts) on
 * the frozen test content (src/engine/fixtures/salvage.ts; lesson 4: no test reads the game's own
 * numbers). What hour 0 promises: the seams, the config parse, the stub never throws, a tick moves only
 * the clock, an action refuses with "notBuilt", the four frozen states load, and the game's own block
 * parses and lints clean. The rules package adds a test file beside each rules file.
 */
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GameConfigSchema, type GameConfig } from '../config/schema';
import { SalvageSchema, lintSalvage } from '../config/schema.salvage';
import * as E from './economy';
import { FIXTURE_EVENTS, FIXTURE_NAMES, FIXTURE_NOW, FIXTURE_STATES, SALVAGE_TEST, fixtureGame, withTestContent } from './fixtures/salvage';
import { installEngineMode } from './mode';
import * as R from './salvage';
import { salvageEngineMode, withSalvageContent } from './salvageMode';

const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'games', 'scrap-yard', 'game.json'), 'utf8'));
const cfg = withTestContent(GameConfigSchema.parse(raw));
const M = salvageEngineMode;

beforeAll(() => installEngineMode(M));
afterAll(() => installEngineMode(null));

const fresh = (): R.SalvageGame => E.createInitialState(cfg, FIXTURE_NOW) as R.SalvageGame;

describe('the salvage engine mode', () => {
  it('is mode "salvage" with the first yard\'s save tag, paid when computed, no full-speed catch-up', () => {
    expect(M.id).toBe('salvage');
    expect(M.saveTag).toBe('salvage1');
    expect(M.paysOnCompute).toBe(true);
    expect(M.catchUpSeconds).toBe(0);
  });

  it('config parses the opaque block and throws on an invalid or missing one', () => {
    const parsed = withSalvageContent({ ...cfg, salvage: raw.salvage } as unknown as GameConfig) as R.SalvageConfig;
    expect(R.isSalvage(parsed)).toBe(true);
    expect(() => withSalvageContent({ ...cfg, salvage: { grades: 'none' } } as unknown as GameConfig)).toThrow(/invalid/);
    expect(() => withSalvageContent({ ...cfg, salvage: undefined } as unknown as GameConfig)).toThrow(/no "salvage" block/);
    expect(withSalvageContent({ ...cfg, mode: 'sim' } as GameConfig).mode).toBe('sim');
  });

  it('the game\'s own block and the test content parse and lint clean', () => {
    expect(lintSalvage(SalvageSchema.parse(raw.salvage))).toEqual([]);
    expect(lintSalvage(SALVAGE_TEST)).toEqual([]);
  });

  it('the lint keeps mass and refuses a converter without a source (S7)', () => {
    const car = SALVAGE_TEST.objects.car;
    const noSource = { ...SALVAGE_TEST, objects: { ...SALVAGE_TEST.objects, car: { ...car, source: undefined } } };
    expect(lintSalvage(noSource).join('\n')).toMatch(/converter but has no source/);
    const heavy = { ...SALVAGE_TEST, objects: { ...SALVAGE_TEST.objects, car: { ...car, gross_g: car.gross_g + 1 } } };
    expect(lintSalvage(heavy).join('\n')).toMatch(/mass is kept/);
  });

  it('a fresh game holds the full yard of the content, the hand stripper, both trial loads', () => {
    const g = fresh();
    const n = Object.values(SALVAGE_TEST.zones).reduce((a, z) => a + Object.values(z.things).reduce((b, k) => b + k, 0), 0) + SALVAGE_TEST.dropoff.initial.length;
    expect(g.salvage.things).toHaveLength(n);
    expect(g.salvage.machines.hand_stripper.owned).toBe(true);
    expect(g.salvage.machines.crucible.owned).toBe(false);
    expect(Object.values(g.salvage.partners).every((p) => p.skips.length === 1 && p.skips[0].trial && p.skips[0].phase === 'full')).toBe(true);
    expect(g.salvage.carrier).toBe('frame');
  });

  it('reconcile never throws and starts afresh on what it cannot read', () => {
    const base = fresh();
    for (const bad of [null, 7, 'x', {}, { salvage: null }, { salvage: { v: 9 } }, { salvage: { v: 1, things: [] } }, { salvage: { v: 2, things: 'no' } }]) {
      const g = M.reconcile(cfg, base, bad) as R.SalvageGame;
      expect(g.salvage.v).toBe(3);
      expect(g.salvage.things.length).toBeGreaterThan(0);
    }
  });

  it('a tick advances the yard clock, the play clock and the market clock; nothing arrives before its time', () => {
    const g = fresh();
    const events: R.SalvageEvent[] = [];
    const next = M.tick(cfg, g, 0.5, FIXTURE_NOW, events) as R.SalvageGame;
    expect(next.stats.playSeconds).toBeCloseTo(0.5, 9);
    expect(next.salvage.t).toBeCloseTo(0.5, 9);
    expect(next.salvage.clock.highMs).toBe(g.salvage.clock.highMs + 500);
    expect(next.salvage.things).toEqual(g.salvage.things);
    expect(next.cash).toBe(g.cash);
  });

  it('every action refuses what a fresh yard cannot do and returns the same state', () => {
    const g = fresh();
    const ev: R.SalvageEvent[] = [];
    expect(R.buy(cfg, g, 'sack', 50, 0, ev)).toBe(g);
    expect(R.hire(cfg, g, 'hand', 100, 0, ev)).toBe(g);
    expect(R.level(cfg, g, { kind: 'machine', machine: 'stripper' }, 10, 0, ev)).toBe(g);
    expect(R.sell(cfg, g, 'li', { day: 0, price: 0.5, grams: 1000 }, FIXTURE_NOW, 0, ev)).toBe(g);
    expect(R.setRecipe(cfg, g, 'alu', false, 0, ev)).toBe(g);
    expect(R.setFromBays(cfg, g, false, 0, ev)).toBe(g);
    expect(R.signDeal(cfg, g, { step: 0, q_g: 1, days: 1, price: 1 }, FIXTURE_NOW, 0, ev)).toBe(g);
    expect(R.declineDeal(cfg, g, 0, ev)).toBe(g);
    expect(R.stepOut(cfg, g, null, 0, ev)).toBe(g);
    expect(ev).toHaveLength(9);
    expect(ev.map((e) => (e.type === 'refused' ? e.key : e.type))).toEqual(['cash', 'cash', 'notOwned', 'nothing', 'notOwned', 'notOwned', 'nothing', 'nothing', 'nothing']);
  });

  it('presence stores the sample with its heading (the rules decide what it means)', () => {
    const g = R.setPresence(cfg, fresh(), { x: 50, y: 24, driving: false, moving: false, standingFor: 1, heading: 2 }, 1);
    expect(g.salvage.presence).toEqual({ x: 50, y: 24, driving: false, moving: false, standingFor: 1, heading: 2 });
    expect(R.setPresence(cfg, g, { x: 50, y: 24, driving: false, moving: false, standingFor: 1, heading: 2 }, 1.1)).toBe(g);
  });

  it('time away measures the absence (capped); MONEY ONCE: earnings 0 and no report, the cash is in the game', () => {
    const f = fresh();
    const g = { ...f, lastSavedAt: FIXTURE_NOW - 60_000, stats: { ...f.stats, clockHigh: 0 }, salvage: { ...f.salvage, clock: { ...f.salvage.clock, highMs: 0 } } };
    const r = M.offline(cfg, g, FIXTURE_NOW);
    expect(r).toMatchObject({ seconds: 60, earnings: 0 });
    expect(r.report).toBeUndefined();
    expect(M.offline(cfg, { ...g, lastSavedAt: FIXTURE_NOW - 30 * 3600_000 }, FIXTURE_NOW).seconds).toBe(4 * 3600);
    expect(M.income(cfg, g, FIXTURE_NOW)).toBe(0);
    // The back state's away money is already in cash (fixture), and offline() would add none of its own.
    const b = fixtureGame('back', fresh(), FIXTURE_NOW);
    expect(M.offline(cfg, b, FIXTURE_NOW + 3600_000).earnings).toBe(0);
  });

  it('the queue is derived: nextEvent is the earliest dated field of the state', () => {
    const g = fixtureGame('m30', fresh(), FIXTURE_NOW);
    const e = R.nextEvent(cfg, g)!;
    expect(e).not.toBeNull();
    expect(e.at).toBeGreaterThanOrEqual(g.salvage.t);
    const dates = [g.salvage.act.endsAt, ...g.salvage.crew.filter((m) => m.t1 > m.t0).map((m) => m.t1), g.salvage.truck.trip?.endsAt, g.salvage.merchant.endsAt, g.salvage.dropoff.nextAt].filter((x): x is number => typeof x === 'number');
    expect(e.at).toBeCloseTo(Math.min(...dates), 6);
    expect('queue' in g.salvage).toBe(false);
  });

  it('incomeRate is the last five minutes of collections / 5 (§ a minute); activeIncome is that / 60', () => {
    const g = fixtureGame('m30', fresh(), FIXTURE_NOW);
    // Buckets older than five minutes of yard time drop out (the state's minute may lag its clock).
    const age = Math.max(0, Math.floor(g.salvage.t / 60) - g.salvage.income.minute);
    const sum = g.salvage.income.buckets.slice(Math.min(5, age)).reduce((a, x) => a + x, 0);
    expect(R.incomeRate(cfg, g)).toBeCloseTo(sum / 5, 6);
    expect(M.activeIncome(cfg, g, FIXTURE_NOW)).toBeCloseTo(sum / 300, 6);
  });

  it('noteSeen and skipGoal are real', () => {
    const g = fresh();
    const a = R.noteSeen(cfg, g, { place: 'rack', card: 'rack' }, 0);
    expect(a.salvage.seen).toEqual({ places: ['rack'], cards: ['rack'] });
    expect(R.noteSeen(cfg, a, { place: 'rack' }, 0)).toBe(a);
    const ev: R.SalvageEvent[] = [];
    expect(R.skipGoal(cfg, g, 'takeWasher', 0, ev)).toBe(g);
    expect(ev[0]).toMatchObject({ type: 'refused', key: 'nothing' });
    const m15 = fixtureGame('m15', fresh(), FIXTURE_NOW);
    expect(R.nextGoal(cfg, m15)?.id).toBe('signDeal');
    const skipped = R.skipGoal(cfg, m15, 'signDeal', 0);
    expect(R.nextGoal(cfg, skipped)?.id).toBe('pourFirst');
  });
});

describe('the five frozen states', () => {
  it.each(FIXTURE_NAMES)('%s loads and every selector answers without throwing', (name) => {
    const g = fixtureGame(name, fresh(), FIXTURE_NOW);
    expect(g.stats.playSeconds).toBe(FIXTURE_STATES[name].playSeconds);
    const f = R.frame(cfg, g);
    expect(f.things.length).toBe(g.salvage.things.length);
    expect(f.machines.map((m) => m.machine)).toContain('crucible');
    for (const ref of [{ kind: 'place', place: 'rack' }, { kind: 'place', place: 'noticeboard' }, { kind: 'processBoard' }, { kind: 'table' }, { kind: 'away' }, { kind: 'deal' }] as R.CardRef[]) expect(R.cardOf(cfg, g, ref, FIXTURE_NOW).title.key).toBeTruthy();
    expect(R.industryTable(cfg, g).rows).toHaveLength(SALVAGE_TEST.rivals.list.length + 1);
    expect(R.industryTable(cfg, g).rungs.map((r) => r.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(R.processBoard(cfg, g).rows.map((r) => r.id)).toEqual(['cable', 'motors', 'melt', 'greyed']);
    expect(R.topBar(cfg, g).cash).toBe(FIXTURE_STATES[name].cash);
    R.priceBoard(cfg, g, FIXTURE_NOW);
    for (const p of Object.keys(SALVAGE_TEST.partners)) R.skipLabel(cfg, g, p, g.salvage.t);
    R.nextGoal(cfg, g);
    R.advice(cfg, g, FIXTURE_NOW);
    expect(M.tick(cfg, g, 0.1, FIXTURE_NOW)).toBeTruthy();
  });

  it('the played states hold what the screens look at: m5 tickets and a lot; m15 the deal on offer at rung 2; m30 a held bay, the deal running; back an away card', () => {
    // The states are PLAYED through the real engine (director.ts): what they hold is what the play reached.
    const m5 = FIXTURE_STATES.m5.salvage;
    expect(m5.tickets.some((t) => t.kind === 'weighIn')).toBe(true);
    expect(m5.ladder.supplied_g).toBeGreaterThan(0);
    const m15 = FIXTURE_STATES.m15.salvage;
    expect(m15.ladder.rung).toBeGreaterThanOrEqual(2);
    expect(m15.deal.phase).toBe('offered');
    const m30 = FIXTURE_STATES.m30.salvage;
    expect(Object.values(m30.bays).some((b) => b.held)).toBe(true);
    expect(m30.deal.phase).toBe('running');
    expect(FIXTURE_STATES.m30.playSeconds).toBeGreaterThanOrEqual(1800);
    expect(FIXTURE_STATES.back.salvage.away).not.toBeNull();
    expect(FIXTURE_STATES.back.salvage.t).toBeGreaterThan(m30.t);
    expect(R.ackAway(cfg, fixtureGame('back', fresh())).salvage.away).toBeNull();
  });

  it('the states are reachable: unique uids, provenance, goals by id, no Night watch before time away, passed matches the table', () => {
    for (const name of FIXTURE_NAMES) {
      const s = FIXTURE_STATES[name].salvage;
      const uids = [...s.things.map((t) => t.uid), ...s.pieces.map((p) => p.uid), ...s.load.map((p) => p.uid), ...s.crew.flatMap((m) => m.load.map((p) => p.uid)), ...Object.values(s.machines).flatMap((m) => [...m.hopper.map((p) => p.uid), ...(m.work ? [m.work.piece.uid] : [])])];
      expect(new Set(uids).size, name).toBe(uids.length);
      for (const p of [...s.pieces, ...s.load]) {
        expect(p.uid.startsWith(`${p.from}.p`), `${name} ${p.uid}`).toBe(true);
        const obj = SALVAGE_TEST.objects[s.things.find((t) => t.uid === p.from)?.obj ?? (p.from ?? '').split('.')[1] ?? ''];
        if (obj) expect(obj.pieces[p.spec]?.[0], `${name} ${p.uid}`).toBe(p.grade);
      }
      for (const id of [...s.goals.done, ...s.goals.skipped]) expect(SALVAGE_TEST.goals.some((d) => d.id === id), `${name} goal ${id}`).toBe(true);
      if (s.owned.includes('night')) expect(s.beenAway, name).toBe(true);
      if (s.deal.phase === 'running') expect(s.ladder.rung, name).toBeGreaterThanOrEqual(2);
      const g = fixtureGame(name, fresh());
      const table = R.industryTable(cfg, g);
      expect(table.rows.filter((r) => r.id !== 'you' && r.rank > table.rank).length, `${name} passed`).toBe(s.ladder.passed);
      for (const m of s.crew)
        for (const c of m.claims) {
          // A claim is a thing (by him), a loose thing ('loose:'), a piece (its claim his) or tray grams ('tray.<machine>.<grade>.<g>').
          if (c.startsWith('tray.')) {
            const [, mach, grade, g] = c.split('.');
            expect((s.machines[mach as keyof typeof s.machines].trayClaim_g[grade] ?? 0) + 1e-6, `${name} claim ${c}`).toBeGreaterThanOrEqual(Number(g));
          } else if (c.startsWith('loose:')) expect(s.things.find((t) => t.uid === c.slice(6))?.by, `${name} claim ${c}`).toBe(m.id);
          else {
            const th = s.things.find((t) => t.uid === c);
            const piece = [...s.pieces].find((p) => p.uid === c);
            expect(th?.by ?? piece?.claim, `${name} claim ${c}`).toBe(m.id);
          }
        }
    }
  });

  it('every fixture event is a well-formed event of its state', () => {
    for (const name of FIXTURE_NAMES) for (const e of FIXTURE_EVENTS[name]) expect(typeof e.type).toBe('string');
    expect(FIXTURE_EVENTS.m15.some((e) => e.type === 'rung')).toBe(true);
  });

  it('pieces lie where piecePos puts them, things where thingPos puts them (one function for all)', () => {
    const g = fixtureGame('m30', fresh());
    const f = R.frame(cfg, g);
    for (const p of f.pieces) expect(R.piecePos(cfg, p.pile, p.k, (uid) => g.salvage.things.find((t) => t.uid === uid)?.at ?? null)).toEqual({ x: p.x, y: p.y });
    for (const t of f.things) expect(R.thingPos(cfg, g.salvage.things.find((x) => x.uid === t.uid)!.at)).toEqual({ x: t.x, y: t.y });
  });
});

describe('the formatters and the board', () => {
  it('money, mass, prices, durations and ranks follow 2.2', () => {
    expect(R.roundMoney(1.005)).toBe(1.01);
    expect(R.fmtMoney(12.3)).toBe('§12.30');
    expect(R.fmtMoney(3148.4)).toBe('§3,148');
    expect(R.fmtMoney(412_000)).toBe('§412k');
    expect(R.fmtMoney(1_250_000)).toBe('§1.25M');
    expect(R.fmtMass(28_640)).toBe('28.6 kg');
    expect(R.fmtMass(1_020_000)).toBe('1,020 kg');
    expect(R.fmtMass(1_020_000, 'bridge', true)).toBe('1.02 t');
    expect(R.fmtMass(13_565_000, 'bridge')).toBe('13.56 t');
    expect(R.fmtMass(12_346_000, 'lot')).toBe('12.35 t');
    expect(R.fmtPrice(0.95)).toBe('§0.95');
    expect(R.fmtDuration(250)).toBe('4\u00A0m\u00A010\u00A0s');
    expect(R.fmtDuration(3 * 3600 + 12 * 60)).toBe('3\u00A0h\u00A012\u00A0m');
    expect(R.fmtDuration(250)).not.toMatch(/ /);
    expect([1, 2, 3, 4, 11, 21, 26].map(R.fmtRank)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '21st', '26th']);
  });

  it('the posted price is a pure function of the day, in true proportion, the same for every state', () => {
    const d = R.marketDay(cfg, FIXTURE_NOW);
    expect(R.priceOf(cfg, 'bb', d)).toBe(R.priceOf(cfg, 'bb', d));
    for (let k = 0; k < 30; k++) {
      const p = R.priceOf(cfg, 'li', d + k);
      expect(p).toBeGreaterThan(0.5 * 0.85);
      expect(p).toBeLessThan(0.5 * 1.15);
    }
    expect(['low', 'usual', 'high']).toContain(R.dayWord(cfg, 'ci', d));
  });
});
